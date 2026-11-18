# IMMOExtract

**Extract. Transform. Create.**

IMMOExtract direncanakan sebagai aplikasi web **local-first** untuk memisahkan manusia beserta pakaian/aksesori dari foto menjadi PNG transparan, lalu (secara opsional) mengolahnya menjadi aset **Classic Pixelation** atau **AI Pixel Art Stylization** untuk game development.

> **Status proyek:** M1–M4 selesai pada jalur Windows lokal yang teruji: upload, ekstraksi SCHP, job/polling, galeri, PNG individual serta ZIP pilihan/semua melalui browser. M5 belum dimulai. Bukti aktual di `docs/PROGRESS.md`; batasan dan keputusan di `docs/DECISIONS.md`.

## Gambaran fitur

- Input foto dari galeri atau kamera browser.
- Human parsing lokal untuk manusia, pakaian, dan beberapa aksesori yang didukung model.
- PNG transparan per objek yang terdeteksi.
- Preview, download satu objek, download beberapa objek, download semua dalam ZIP.
- Classic Pixelation dengan pilihan ukuran/palet.
- AI image-to-image stylization lokal **tahap lanjut**, tergantung kemampuan hardware dan hasil pengujian model.

**Batasan:** satu orang utama pada MVP; tidak otomatis membuat sprite animasi, objek 3D, atau melengkapi bagian objek yang tersembunyi.

## Tech stack rencana

| Bagian | Teknologi |
| --- | --- |
| Frontend | Vite, HTML/CSS, Vanilla JavaScript, Tailwind CSS |
| Backend | Node.js, Express.js, Multer, Sharp, Archiver |
| Local AI | Python, FastAPI, PyTorch, SCHP ATR-18 (kandidat uji), Pillow, OpenCV |
| Storage | Filesystem lokal; tanpa DB pada MVP |
| Generative mode | Engine image-to-image lokal yang dipilih di M6 |

## Struktur awal

```text
IMMOExtract/
├── frontend/
├── backend/
├── ai-service/
├── storage/
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── PROGRESS.md
│   ├── HANDOFF.md
│   └── DECISIONS.md
├── AGENTS.md
├── README.md
└── .gitignore
```

`frontend/`, `backend/`, dan `ai-service/` berisi fondasi M1. `storage/` privat dan diabaikan Git; upload disimpan di `storage/uploads/<uuid>/`, bukan folder statis publik.

## Preview dan upload lokal (M2)

Pada halaman utama, pilih satu JPG/JPEG, PNG, atau WebP, atau gunakan **Buka kamera → Ambil foto**. Preview menampilkan gambar, nama file, dimensi, dan ukuran. Setelah preview berhasil, gambar otomatis dikirim melalui proxy Vite ke Express lokal (`POST /api/uploads`, multipart field `image`). UI menampilkan proses upload, ID upload setelah server menerima gambar, atau pesan kegagalan. Upload tidak memulai ekstraksi AI.

Batas sementara: **10 MiB (10.485.760 byte)**, maksimal **8192 piksel per sisi** dan **24.000.000 piksel**. File kosong, signature/MIME tidak sesuai, atau gagal decode ditolak dengan pesan. Dimensi preview diperiksa **setelah decode browser**, bukan perlindungan penuh terhadap decompression bomb. Server memvalidasi ulang signature, MIME, dimensi, decode, dan menolak animasi. Preview tetap tersedia saat server menolak gambar atau koneksi gagal; pilih ulang gambar untuk mencoba lagi.

Uji manual: pilih JPG/PNG/WebP valid; ganti gambar; hapus lalu pilih file yang sama; coba file rusak, teks berekstensi `.png`, file >10 MiB, atau dimensi melebihi batas. Preview lama harus hilang saat pilihan baru diproses/gagal. Pengujian aktual desktop/mobile dan race decode dicatat di `PROGRESS.md`.

**Hapus pilihan** mengosongkan preview dan membatalkan request yang masih berjalan. Memilih gambar lain, membuka kamera, atau meninggalkan halaman juga membatalkan upload lama; respons lama tidak boleh mengganti pilihan terbaru. Pembatalan tidak menjamin gambar belum tersimpan di server. File yang sudah diterima tetap tersimpan; penghapusan server dan retensi otomatis belum tersedia.

Respons sukses server: HTTP 201 `{upload_id, status: "uploaded", image}`. ID ini bukan ID job ekstraksi. File dan manifest disimpan privat tanpa memakai nama/path dari klien; browser tidak menerima path filesystem.

### Kamera lokal

Kamera memerlukan **HTTPS atau localhost** serta izin browser. Aplikasi meminta video saja (tanpa mikrofon) setelah **Buka kamera** ditekan; preferensi kamera belakang dan ukuran 1280×720 bersifat ideal, bukan syarat perangkat. Penolakan izin, perangkat tidak ditemukan/sibuk, atau API tidak tersedia menghasilkan pesan; pemilihan file tetap tersedia.

**Ambil foto** menyalin frame ke PNG dengan validasi/preview dan upload yang sama seperti file. Stream dihentikan setelah frame disalin, saat **Tutup kamera**, **Hapus pilihan**, berganti file, halaman tersembunyi, atau navigasi keluar. Pembatalan tidak selalu menutup dialog izin browser, tetapi stream yang terlambat diberikan langsung dihentikan. Capture lama tidak boleh menimpa file baru.

Uji kamera fisik **PC Camera** pada Windows/Chrome 158 berhasil: PNG 1280×720 → preview → upload HTTP 201 → track kamera berhenti. Pengujian sintetis sebelumnya mencakup error/izin dan race async. Kamera mobile fisik serta perpindahan tab non-headless belum diuji. Jika browser memilih kamera virtual, pilih kamera fisik melalui pengaturan kamera browser; aplikasi belum menyediakan pemilih perangkat.

## Job ekstraksi asynchronous (M4)

- `POST /api/jobs`: kirim multipart satu field `image`, atau JSON `{"upload_id":"<ID dari /api/uploads>"}`. Jangan kirim keduanya.
- Respons HTTP **202**, header `Location: /api/jobs/<job_id>`, dan status `queued`. Poll `GET /api/jobs/<job_id>` sampai `completed` atau `failed`.
- Progress 0/10/100 menunjukkan tahap queued/processing/completed, bukan persentase inferensi. Error aman tersedia pada job failed.
- Satu worker FIFO per instance backend. Job terminal tersimpan privat; job yang terputus saat restart menjadi failed pada akses pertama, tanpa retry otomatis.
- `objects` berisi foreground `human` full-frame bila ada, ditambah PNG per label ATR dengan **>50 piksel**. Crop memakai padding 2 piksel yang dipotong pada batas input; RGB asli dan alpha khusus kategori dipertahankan. `bbox` berkoordinat asli `[left, top, right, bottom]`, right/bottom eksklusif; metadata juga memuat `class_id`, dimensi, dan `pixel_count`. Label sama tetap satu mask semantik, bukan instance terpisah.
- Preview: `GET /api/jobs/<job_id>/objects/<object_id>`. Unduh PNG asli: `GET /api/jobs/<job_id>/objects/<object_id>/download`. Gunakan `objects[].id` dari polling job completed, bukan nama/path file. Kedua endpoint menyajikan byte PNG yang sama tanpa pixelation; disposition `inline` atau `attachment`, nama `<object_id>.png`, cache privat/no-store dan `nosniff`.
- Job belum completed ditolak HTTP 409; UUID invalid 400; job/objek/file tidak ditemukan 404. Object ID hanya berlaku pada job pemiliknya. Manifest dengan path tidak aman atau symlink/junction pengalihan ditolak dengan error 500 aman; storage tidak dibuka sebagai folder statis.
- Di browser, tunggu upload berhasil lalu tekan **Ekstrak objek**. UI menampilkan tahap queued/processing, kemudian kartu preview, label, dimensi dan **Unduh PNG asli**. Pola kotak-kotak hanya latar transparansi, tidak disertakan dalam PNG. Layout dua panel di desktop, ditumpuk di mobile; pixel art belum tersedia.
- Polling serial tiap 1 detik setelah respons, timeout request 15 detik. Jika pemeriksaan terputus, **Periksa status** melanjutkan job yang sama tanpa POST baru. Tidak ada retry otomatis; jika POST belum terkonfirmasi, UI memperingatkan bahwa mengirim lagi dapat membuat job baru.
- Mengganti/menghapus gambar, membuka kamera atau meninggalkan halaman membatalkan request/polling browser dan membersihkan galeri. Job server tidak dibatalkan/dihapus. Hasil kosong/gagal dan kegagalan file preview ditampilkan apa adanya. Setelah job terminal, gunakan **Hapus pilihan** lalu pilih gambar untuk memulai lagi; tidak ada pemulihan job otomatis setelah reload.
- Manifest dan hasil berada di `storage/jobs/<uuid>/`; jika `UPLOAD_DIR` diubah, direktori jobs default sejajar direktori upload. Jangan jalankan beberapa backend pada storage yang sama. Retensi/batas antrean belum tersedia.
- Endpoint ekstraksi sinkron M3 masih di luar antrean job. Startup backend masih memakai `AI_HEALTH_TIMEOUT_MS` untuk client AI bersama (default 3000 ms); gunakan misalnya `30000` bila inferensi memerlukan waktu lebih panjang, lalu restart backend.
- Restart backend dan AI service bersama setelah pembaruan kontrak kategori. Job lama tetap dapat dipolling, tetapi tidak ditambahi file kategori secara otomatis. Polling job aktif memakai snapshot yang sudah berhasil disimpan, menghindari konflik pembacaan/penggantian manifest di Windows.

### Ekspor ZIP melalui browser dan API

- Centang **Pilih untuk ZIP** pada kartu, lalu **Unduh Pilihan**. **Unduh Semua** mencakup foreground manusia dan seluruh kategori, tanpa perlu mencentang. Tidak ada pilihan awal; tombol pilihan nonaktif bila kosong, kedua tombol nonaktif bila tidak ada hasil.
- Saat ZIP dibuat, tombol ekspor dan checkbox dikunci. Setelah respons sukses, unduhan diminta ke browser; **Unduh ulang ZIP siap** memakai archive yang sama tanpa POST baru. Status ini bukan konfirmasi file telah tersimpan di perangkat.
- Error pembuatan/koneksi mempertahankan pilihan; mencoba lagi adalah permintaan ekspor baru, bukan retry otomatis. Ganti/hapus gambar, buka kamera atau tinggalkan halaman membatalkan pengamatan ekspor dan membersihkan link. Respons lama tidak memicu unduhan; proses/file yang sudah diterima server tidak dibatalkan.

- `POST /api/jobs/<job_id>/exports`, `Content-Type: application/json`, dengan **salah satu** `{"all":true}` atau `{"object_ids":["<uuid>","<uuid>"]}`. ID harus terdaftar pada job completed; pilihan kosong/duplikat atau field tambahan ditolak. `all` mencakup foreground manusia dan seluruh kategori yang terdaftar.
- HTTP **201** hanya setelah ZIP dan manifest ekspor selesai disimpan. Respons: `{export_id, job_id, status:"completed", object_ids, created_at, download_url}`; header `Location` sama dengan `download_url`.
- `GET /api/jobs/<job_id>/exports/<export_id>/download` mengunduh attachment `<export_id>.zip`, no-store/private dan nosniff. Isi hanya `<object_id>.png` yang dipilih, byte asli tanpa pixelation; tidak memuat input, mask atau metadata privat.
- ZIP disimpan privat di `<job>/exports/<export_id>/archive.zip` dengan manifest terpisah. Ekspor tidak mengubah manifest job; dapat diunduh setelah restart. ZIP selesai adalah snapshot, tidak bergantung pada keberadaan PNG sumber saat diunduh.
- HTTP 400 untuk pilihan/UUID invalid, 404 untuk ID/file hilang, 409 untuk job non-completed atau ekspor semua tanpa objek, 415 untuk tipe request bukan JSON, 413 untuk body >2 KiB. Kegagalan storage/path menghasilkan 500 aman, bukan ZIP sebagian.
- Backend memakai Archiver 8.0.0. Setelah mengambil perubahan dependensi, jalankan `npm install --no-audit --no-fund` dari direktori `backend`. Pengujian ZIP `node --test backend/test/jobs.test.js` memakai pembaca stdlib Python (`py -3` di Windows, `python3` di platform lain) untuk memeriksa isi/CRC.
- Cleanup retensi belum tersedia; setiap POST sukses membuat ekspor baru. Unduhan ditangani browser native; kegagalan transfer tidak memiliki dialog khusus di aplikasi.

## Menjalankan Aplikasi (M1–M4)

Runtime setup: Node.js **22.12.0**, npm **10.9.0**, Python **3.14.3** dengan PyTorch CPU (`torch 2.15.0+cpu`, `torchvision 0.29.2+cpu`).

Jalankan 3 terminal dari root proyek (`IMMOExtract`):

```powershell
# Terminal 1 — AI Service (FastAPI + Model SCHP ATR-18 CPU)
.\ai-service\.venv-test\Scripts\python.exe -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8000

# Terminal 2 — Backend (Express.js)
npm start --prefix backend

# Terminal 3 — Frontend (Vite)
npm run dev --prefix frontend
```

Buka **http://127.0.0.1:5173** di browser Anda. Hentikan masing-masing proses dengan `Ctrl+C`.

Linux/macOS: gunakan `python3 -m venv ai-service/.venv` dan `ai-service/.venv/bin/python` sebagai pengganti executable Python Windows. Perintah npm sama; platform tersebut belum diuji.

Konfigurasi bawaan langsung bekerja tanpa `.env`. Bila perlu, salin `backend/.env.example` ke `backend/.env` dan `frontend/.env.example` ke `frontend/.env`; restart layanan setelah perubahan. Express memakai `PORT`, `AI_SERVICE_URL`, `AI_HEALTH_TIMEOUT_MS`, `UPLOAD_DIR`, dan `MAX_UPLOAD_BYTES`. Batas byte frontend tetap 10 MiB; batas server yang lebih kecil menghasilkan pesan penolakan. Vite memakai `BACKEND_URL` untuk proxy `/api`; browser tidak mengakses FastAPI langsung. Port FastAPI diatur lewat argumen Uvicorn.

### Health checks dan smoke test

| Endpoint | Arti |
| --- | --- |
| `http://127.0.0.1:3000/api/health` | Express hidup, independen dari FastAPI |
| `http://127.0.0.1:8000/health` | FastAPI hidup; `model_loaded: false` |
| `http://127.0.0.1:3000/api/health/ai` | Express benar-benar memanggil FastAPI; HTTP 503 jika gagal/tidak tersedia |

Dengan ketiga layanan aktif, jalankan dari root:

```powershell
node scripts/smoke.mjs
npm run build --prefix frontend
```

Untuk jalur kegagalan, hentikan **hanya FastAPI**, jalankan `node scripts/smoke.mjs --ai-unavailable`, lalu klik **Periksa ulang** di browser. Express harus tetap sehat, sementara koneksi FastAPI gagal dengan jelas. Jalankan kembali FastAPI dan periksa ulang untuk pemulihan.

Build frontend tersimpan di `frontend/dist/`. `npm run preview --prefix frontend` menyajikannya pada port 4173 dengan proxy lokal yang sama; ini bukan konfigurasi deployment produksi.

### Git dan privasi

Git telah diinisialisasi tanpa staging atau commit otomatis. `.gitignore` mengabaikan dependensi, `.env` asli, hasil build, seluruh `storage/`, dan model/checkpoint. `.env.example` serta lockfile npm boleh masuk Git. Jangan menyimpan foto pribadi di folder source atau public.

## Urutan implementasi

1. **M1:** scaffold frontend, Express dan FastAPI; health check dan integrasi antarlayanan.
2. **M2:** upload, kamera, validasi, preview input.
3. **M3:** uji human parsing lokal, mask dan PNG transparan.
4. **M4:** object gallery, job processing, download PNG/ZIP.
5. **M5:** Classic Pixelation.
6. **M6:** AI Pixel Art Stylization & koreksi mask.
7. **M7:** selective ZIP, spritesheet statis, testing & dokumentasi.

Jangan melewati milestone tanpa bukti pengujian.

## Cara bekerja bergantian dengan AI

Urutan yang dipilih: **OMP → Antigravity CLI → Claude Website**.

**OMP / Antigravity (workspace lokal):** buka folder proyek ini; minta membaca `AGENTS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`, dan dokumen terkait. Kerjakan hanya tugas aktif.

**Claude Website:** upload dokumen kebutuhan + handoff + file source relevan saja. Jangan upload `node_modules`, `.venv`, checkpoint, foto pribadi, atau `.env`. Terima patch, terapkan ke repo lokal, uji, kemudian perbarui dokumentasi.

Contoh prompt ringkas untuk coding agent:

```text
Lanjutkan IMMOExtract dari workspace ini. Baca AGENTS.md, docs/PROGRESS.md,
dan docs/HANDOFF.md, lalu cek git status dan file terkait.
Kerjakan hanya next task pada milestone aktif. Jangan ulang pekerjaan selesai.
Jalankan tes bila memungkinkan, lalu perbarui PROGRESS.md dan HANDOFF.md.
Laporkan file diubah, tes nyata, error, dan satu next task.
```

## Referensi internal

- [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md) — spesifikasi produk dan acceptance criteria.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — desain service, pipeline AI, API awal.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — status dan pengujian yang sebenarnya.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — instruksi perpindahan agent.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — keputusan dan pertanyaan terbuka.
- [`AGENTS.md`](AGENTS.md) — aturan coding agent.

## Lisensi dan distribusi

Lisensi kode proyek belum ditentukan. Sebelum mendistribusikan model atau aplikasi secara publik/komersial, cek lisensi setiap model dan checkpoint serta dependensinya. Jangan berasumsi semua model AI boleh didistribusikan bebas.
