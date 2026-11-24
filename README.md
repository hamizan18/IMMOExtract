# IMMOExtract

**Extract. Transform. Create.**

IMMOExtract adalah aplikasi web **local-first** untuk mengekstrak manusia beserta kategori pakaian/aksesori yang dikenali menjadi PNG transparan, lalu secara opsional mengolahnya melalui **Classic Pixelation** atau **AI Pixel Art Stylization** lokal.

> **Status proyek:** Implementasi M1–M7 ditutup D-047; bukti penerimaan Windows lokal dicatat di `docs/PROGRESS.md`. Pada 2026-11-23, dua foto berizin dievaluasi, koreksi mask dan unduhan PNG/ZIP diuji, serta spritesheet tiga objek nyata berhasil diunduh melalui UI/API. Segmentasi masih memiliki salah label/kebocoran; keberhasilan ekspor bukan penerimaan kualitas umum. SD15 tidak dimuat pada rangkaian penerimaan tersebut.

## Gambaran fitur

- Input foto dari galeri atau kamera browser (M2).
- Human parsing lokal (SCHP ATR-18) untuk manusia, pakaian, dan aksesori (M3/M4).
- PNG transparan per kategori yang terdeteksi dengan crop bounding box; hasil mengikuti kualitas segmentasi, bukan jaminan tiap instance terpisah.
- Mask Correction Tool: kuas penghapus dan kuas pemulih foto asli interaktif berbasis Canvas 2D (FR-12, M6).
- Preview galeri objek, unduh satu PNG, unduh ZIP pilihan atau semua objek dengan integritas SHA-256 (FR-08, M4/M7).
- Classic Pixelation deterministik dengan 4 grid ukuran (16/32/64/128) dan palet Retro 16 warna opsional (FR-09/FR-10, M5).
- AI Pixel Art Stylization lokal berbasis Stable Diffusion 15 CPU FP32 dengan preset, restorasi 100% exact alpha, dan UI studio terintegrasi (FR-11, M6).
- Ekspor Spritesheet Statis: komposit PNG transparan dan metadata Atlas JSON bergaya TexturePacker (FR-13, M7); impor ke PixiJS, Phaser atau game engine lain belum diuji.

**Batasan:** Satu orang utama pada MVP; tidak otomatis membuat sprite animasi runtime, objek 3D, atau melengkapi bagian tubuh/pakaian yang tertutup penuh (occlusion).

## Tech stack aktual

| Bagian | Teknologi |
| --- | --- |
| Frontend | Vite, HTML/CSS, Vanilla JavaScript, Tailwind CSS |
| Backend | Node.js, Express.js, Multer, Sharp, Archiver |
| Local AI | Python, FastAPI, PyTorch CPU, SCHP ATR-18, Pillow, NumPy; ekstraksi tidak memerlukan OpenCV |
| Storage | Filesystem lokal; tanpa DB pada MVP |
| Generative mode | SD15 lokal via Diffusers/Accelerate, CPU FP32 dan UNet disk-offload |

## Struktur proyek

```text
IMMOExtract/
├── frontend/
├── backend/
├── ai-service/
├── storage/
├── scripts/          # health/integration/browser smoke
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

`frontend/`, `backend/`, dan `ai-service/` berisi implementasi aplikasi. `storage/` privat dan diabaikan Git: upload di `storage/uploads/<uuid>/`, job/hasil di `storage/jobs/<uuid>/`, bukan folder statis publik. Dependensi, checkpoint dan environment Python harus sudah disiapkan lokal; repo bukan paket model siap unduh.

## Preview dan upload lokal (M2)

Pada halaman utama, pilih satu JPG/JPEG, PNG, atau WebP, atau gunakan **Buka kamera → Ambil foto**. Preview menampilkan gambar, nama file, dimensi, dan ukuran. Setelah preview berhasil, gambar otomatis dikirim melalui proxy Vite ke Express lokal (`POST /api/uploads`, multipart field `image`). UI menampilkan proses upload, ID upload setelah server menerima gambar, atau pesan kegagalan. Upload tidak memulai ekstraksi AI.

Batas sementara: **10 MiB (10.485.760 byte)**, maksimal **8192 piksel per sisi** dan **24.000.000 piksel**. File kosong, signature/MIME tidak sesuai, atau gagal decode ditolak dengan pesan. Dimensi preview diperiksa **setelah decode browser**, bukan perlindungan penuh terhadap decompression bomb. Server memvalidasi ulang signature, MIME, dimensi, decode, dan menolak animasi. Preview tetap tersedia saat server menolak gambar atau koneksi gagal; pilih ulang gambar untuk mencoba lagi.

Uji manual: pilih JPG/PNG/WebP valid; ganti gambar; hapus lalu pilih file yang sama; coba file rusak, teks berekstensi `.png`, file >10 MiB, atau dimensi melebihi batas. Preview lama harus hilang saat pilihan baru diproses/gagal. Pengujian aktual desktop/mobile dan race decode dicatat di `PROGRESS.md`.

**Hapus pilihan** mengosongkan preview dan membatalkan request yang masih berjalan. Memilih gambar lain, membuka kamera, atau meninggalkan halaman juga membatalkan upload lama; respons lama tidak boleh mengganti pilihan terbaru. Pembatalan tidak menjamin gambar belum tersimpan di server. File yang sudah diterima tetap tersimpan sementara di server dan dibersihkan otomatis setelah melewati masa retensi (`STORAGE_RETENTION_HOURS`, bawaan 24 jam sejak aktivitas terakhir; `0` untuk menonaktifkan).

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
- Di browser, tunggu upload berhasil lalu tekan **Ekstrak objek**. UI menampilkan tahap queued/processing, kemudian kartu preview dengan *badge* kategori, dimensi dan **Unduh PNG asli**. Pola kotak-kotak hanya latar transparansi, tidak disertakan dalam PNG. Layout dashboard **Minimalist Dark Pro** dua kolom di desktop (panel input 5 kolom dan workspace ekstraksi 7 kolom), ditumpuk di mobile; setiap kartu objek menyediakan tab **Classic Pixel** dan **AI Stylize** agar tampilan tetap ringkas (D-049).
- Polling serial tiap 1 detik setelah respons, timeout request 15 detik. Jika pemeriksaan terputus, **Periksa status** melanjutkan job yang sama tanpa POST baru. Tidak ada retry otomatis; jika POST belum terkonfirmasi, UI memperingatkan bahwa mengirim lagi dapat membuat job baru.
- Mengganti/menghapus gambar, membuka kamera atau meninggalkan halaman membatalkan request/polling browser dan membersihkan galeri. Job server tidak dibatalkan/dihapus. Hasil kosong/gagal dan kegagalan file preview ditampilkan apa adanya. Setelah job terminal, gunakan **Hapus pilihan** lalu pilih gambar untuk memulai lagi; tidak ada pemulihan job otomatis setelah reload.
- Manifest dan hasil berada di `storage/jobs/<uuid>/`; jika `UPLOAD_DIR` diubah, direktori jobs default sejajar direktori upload. Jangan jalankan beberapa backend pada storage yang sama. Retensi otomatis (`STORAGE_RETENTION_HOURS`, bawaan 24 jam; sweep tiap `STORAGE_SWEEP_INTERVAL_MINUTES`, bawaan 60 menit) menghapus job kedaluwarsa beserta upload sumber yang tidak lagi direferensikan (D-048); batas panjang antrean belum tersedia.
- Endpoint ekstraksi sinkron M3 masih di luar antrean job. Startup backend memakai `AI_HEALTH_TIMEOUT_MS` untuk health/ekstraksi (default 3000 ms; gunakan misalnya 30000 untuk inferensi). Stylization mempunyai `AI_STYLIZATION_TIMEOUT_MS` terpisah (default 900000 ms), bukan memakai timeout health.
- Restart backend dan AI service bersama setelah pembaruan kontrak kategori. Job lama tetap dapat dipolling, tetapi tidak ditambahi file kategori secara otomatis. Polling job aktif memakai snapshot yang sudah berhasil disimpan, menghindari konflik pembacaan/penggantian manifest di Windows.

### Ekspor ZIP melalui browser dan API

- Centang **Pilih untuk ZIP** pada kartu, lalu **Unduh Pilihan**. **Unduh Semua** mencakup foreground manusia dan seluruh kategori, tanpa perlu mencentang. Tidak ada pilihan awal; tombol pilihan nonaktif bila kosong, kedua tombol nonaktif bila tidak ada hasil.
- Saat ZIP dibuat, tombol ekspor dan checkbox dikunci. Setelah respons sukses, unduhan diminta ke browser; **Unduh ulang ZIP siap** memakai archive yang sama tanpa POST baru. Status ini bukan konfirmasi file telah tersimpan di perangkat.
- Error pembuatan/koneksi mempertahankan pilihan; mencoba lagi adalah permintaan ekspor baru, bukan retry otomatis. Ganti/hapus gambar, buka kamera atau tinggalkan halaman membatalkan pengamatan ekspor dan membersihkan link. Respons lama tidak memicu unduhan; proses/file yang sudah diterima server tidak dibatalkan.

- `POST /api/jobs/<job_id>/exports`, `Content-Type: application/json`, dengan **salah satu** `{"all":true}` atau `{"object_ids":["<uuid>","<uuid>"]}`. ID harus terdaftar pada job completed; pilihan kosong/duplikat atau field tambahan ditolak. `all` mencakup foreground manusia dan seluruh kategori yang terdaftar.
- HTTP **201** hanya setelah ZIP dan manifest ekspor selesai disimpan. Respons: `{export_id, job_id, status:"completed", object_ids, files_count, archive_size, sha256, created_at, download_url}`; header `Location` sama dengan `download_url`.
- `GET /api/jobs/<job_id>/exports/<export_id>` mengembalikan JSON manifest ekspor lengkap beserta `download_url`, ukuran arsip dalam byte, jumlah file, dan checksum SHA-256 bitstream arsip.
- `GET /api/jobs/<job_id>/exports/<export_id>/download` mengunduh attachment `<export_id>.zip`, no-store/private dan nosniff. Isi hanya `<object_id>.png` yang dipilih, byte asli tanpa pixelation; tidak memuat input, mask atau metadata privat.
- ZIP disimpan privat di `<job>/exports/<export_id>/archive.zip` dengan manifest terpisah. Ekspor memakai STORE mode (tanpa re-kompresi deflasi redundant pada PNG) dan menghitung hash SHA-256 on-the-fly secara streaming. Ekspor tidak mengubah manifest job; dapat diunduh setelah restart. ZIP selesai adalah snapshot, tidak bergantung pada keberadaan PNG sumber saat diunduh.
- HTTP 400 untuk pilihan/UUID invalid, 404 untuk ID/file hilang, 409 untuk job non-completed atau ekspor semua tanpa objek, 415 untuk tipe request bukan JSON, 413 untuk body >2 KiB. Kegagalan storage/path menghasilkan 500 aman, bukan ZIP sebagian atau arsip 0-byte kosong.
- Backend memakai Archiver 8.0.0. Setelah mengambil perubahan dependensi, jalankan `npm install --no-audit --no-fund` dari direktori `backend`. Pengujian ZIP `node --test backend/test/zip-export.test.js backend/test/jobs.test.js` memakai pembaca stdlib Python (`py -3` di Windows, `python3` di platform lain) untuk memeriksa isi, central directory, dan CRC32 exact match.
- Setiap POST sukses membuat ekspor baru; seluruh job beserta snapshot turunannya dibersihkan bersama ketika masa retensi job berakhir (D-048). Unduhan ditangani browser native; kegagalan transfer tidak memiliki dialog khusus di aplikasi.

## Classic Pixelation — helper, API dan UI M5

- `backend/src/pixelation.js` menyediakan `await pixelatePng(inputBuffer, size, palette = 'original')` → buffer PNG RGBA baru. Bukan AI Stylization dan tidak mengubah PNG asli.
- Input adalah PNG objek **RGBA 8-bit statis yang sudah divalidasi** dari pipeline ekstraksi. Helper memeriksa tipe buffer, metadata, batas sisi 8192/24 megapiksel dan decode; bukan pengganti validator upload atau resolusi manifest/path.
- `size` berupa angka **16/32/64/128**, berarti sisi output terpanjang tepat sebesar pilihan, termasuk memperbesar input yang lebih kecil. Sisi lain dibulatkan ke bilangan bulat terdekat, minimal 1. Contoh 200×300 pada ukuran 32 → 21×32; tanpa crop, padding atau pengembalian ke resolusi asli.
- Sampling nearest-neighbour memakai pusat piksel output: `floor((x + 0.5) × inputWidth / outputWidth)` dan rumus setara untuk y. Tepat pada batas dua piksel, pilih indeks lebih besar. Mode `original` menyalin RGBA utuh tanpa blending atau flatten; detail tipis dapat hilang saat diperkecil.
- Sharp dipakai untuk decode/encode. Sampling RGBA langsung menghindari premultiplication alpha saat resize Sharp yang dapat mengubah RGB pada alpha rendah/nol. Bukan janji hasil byte-identical dengan algoritma rounding library lain.
- Opsi `palette: 'retro16'` memetakan RGB piksel ber-alpha >0 ke warna terdekat dari palet tetap bergaya EGA 16 warna (D-030), sesudah sampling. Jarak kuadrat RGB, tanpa dithering atau pembelajaran palet dari foto. Alpha tetap exact; RGB pada alpha 0 tidak diubah. Batas 16 berlaku pada RGB yang terlihat, bukan seluruh kombinasi RGBA/warna tersembunyi; file tetap PNG RGBA, bukan PNG indexed 16 warna.
- Endpoint API:
  - `POST /api/jobs/<job_id>/pixelate`: menerima JSON `{"object_id":"<uuid>","size":32,"palette":"retro16"}` hanya untuk job `completed`. Size 16/32/64/128; palette opsional `original` (default) atau `retro16`, nilai/field lain ditolak. Menghasilkan snapshot privat baru di `<job>/pixelations/<pixelation_id>/`, HTTP **201** + `Location`; respons dan manifest memuat `palette`, ukuran, dimensi serta URL preview/download. Snapshot lama tanpa field palette tetap dapat diunduh, tanpa migrasi atau konversi ulang.
  - `GET /api/jobs/<job_id>/pixelations/<pixelation_id>`: menyajikan inline PNG hasil pixelation dengan header `no-store, private` dan `nosniff`.
  - `GET /api/jobs/<job_id>/pixelations/<pixelation_id>/download`: menyajikan attachment PNG hasil pixelation.
- Di kartu objek, pilih **Ukuran** dan **Palet**, lalu **Pixelate**. Default **Warna asli**; **Retro 16 warna** mengubah warna, bukan alpha. Preview, keterangan hasil dan link unduhan menyebut palet hasil tersebut. Ganti pilihan tidak mengubah snapshot sebelumnya sampai Pixelate ditekan. Ukuran/palet/tombol terkunci selama request; reset upload meng-abort pengamatan hasil usang.
- Pengujian 2026-11-19: `node --test backend/test/pixelation.test.js backend/test/jobs.test.js` **64/64 PASS**; build frontend dan browser model asli empat grid Retro, kembali ke Warna asli, unduhan, alpha/RGB transparan, serta original/ZIP tetap identik **PASS**. Unduhan PNG/ZIP asli tetap independen.
- Pada PNG Pants terkoreksi dari foto full-body (2026-11-23), helper grid32/Retro16 menghasilkan 14×32; seluruh piksel cocok oracle independen. Sumber memiliki 55 piksel alpha parsial, tetapi tidak satu pun tersampel pada grid ini. Alpha exact berarti mempertahankan **piksel yang dipilih nearest**, bukan semua detail/alpha sumber. Kontrak alpha parsial diperiksa terpisah lewat dua tes Retro16 existing; tugas ini tidak mengulang UI/API pixelation.

## AI Stylization — helper, API dan antrean M6

Helper SD15 CPU FP32 memakai UNet disk-offload bermitigasi dan safety checker lokal (D-037–D-039). Endpoint internal `POST /stylize` (multipart `file`) dan `POST /stylize-path` (JSON `image_path`) mengembalikan metadata generasi, flag `nsfw_detected`, serta PNG RGBA dengan alpha sumber dipasang kembali. RGB generatif bukan piksel ekstraksi asli; alpha exact tidak menjamin alignment atau kualitas pixel art.

- Runtime existing: `ai-service/.venv-stylization-poc`; checkpoint default ada di `ai-service/models/sd15-poc/451f4fe16113bff5a5d2269ed5ad43b0592e9a14/`, atau konfigurasi `SD15_MODEL_PATH`. Tidak ada download otomatis atau instalasi ulang.
- `/health`: `stylizer_available` berarti modul/dependensi dan direktori model ditemukan, **bukan** model sudah berhasil dimuat; `stylizer_loaded` menunjukkan pipeline sudah termuat. Dependencies/direktori tidak tersedia → request valid mendapat 503; ekstraksi tetap dapat berjalan di `.venv-test`.
- Kedua endpoint menerima `preset` (`pixel-art`, `retro-rpg`, `game-boy`), `prompt`/`negative_prompt` opsional, `target_size` (kelipatan 8, 64–512; default 256), `num_inference_steps` (2–50; default 20), `strength` ((0,1], minimal satu langkah efektif; default 0.5), `guidance_scale` (0–20; default 7.5), `seed` (0 hingga 2^63−1; default 0).
- `output_path` menyimpan PNG; `save_generated_path` opsional menyimpan RGB square dan memerlukan `output_path`. Input/output tidak boleh menunjuk file yang sama, termasuk hardlink. `include_base64` default true pada multipart, false pada JSON.
- Gambar statis JPG/PNG/WebP, maksimum 10 MiB, sisi 8192, 24 megapiksel. Decode dinormalisasi RGBA, termasuk transparansi palet. Parameter/gambar invalid → 400, tipe/field invalid → 422, file hilang → 404, byte berlebih → 413. Request stylization kedua saat pipeline sibuk → 409, tanpa antrean/retry otomatis; kegagalan inferensi/penyimpanan → 500 JSON aman.
- Jalankan satu worker di loopback saja. **Path hanya untuk caller lokal tepercaya**, bukan sandbox filesystem atau API publik; jangan meneruskan path browser. Express memilih objek dan tujuan dari storage/manifest privat.
- Inferensi CPU memerlukan waktu dan headroom RAM/commit; batas 512 bukan bukti benchmark 512. Pada mesin dengan memori terbatas, selesaikan ekstraksi lalu hentikan service SCHP sebelum menjalankan SD15. Periksa resource dahulu; aplikasi tidak mengganti/unload kedua model secara otomatis. Contoh PowerShell pada terminal khusus SD15:

```powershell
$env:SCHP_CHECKPOINT_PATH = 'disabled-for-stylization'
.\ai-service\.venv-stylization-poc\Scripts\python.exe -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8001 --workers 1
```

Nilai SCHP di atas sengaja menunjuk file yang tidak ada; `/health.model_loaded` pada service SD15 harus false. UI Stylization sudah tersedia: preset, ukuran 128/256, polling, preview dan unduhan. Browser mengirim dua langkah nominal dengan strength 0.5; ini bukan jaminan kualitas atau waktu proses tetap. Hubungkan backend ke port 8001 sesuai konfigurasi di bawah. Startup tiga terminal pada bagian utama hanya menyiapkan jalur ekstraksi; tidak otomatis mengaktifkan SD15. Classic Pixelation tetap mode terpisah.

### API backend stylization

- `POST /api/jobs/:id/stylize` menerima JSON `{"object_id":"<UUID objek>","preset":"pixel-art"}` dan parameter model opsional di atas. Body maksimal 8 KiB; seed dibatasi integer aman JavaScript (0..9007199254740991), prompt/negative_prompt harus string bila dikirim. Tidak menerima `image_path`, `output_path`, base64 atau field lain dari browser.
- Respons **202 + Location** menunjuk `/api/jobs/:id/stylizations/:stylizationId`. GET URL tersebut memantau `queued → processing → completed/failed`; progress 0/10/100 adalah tahap, bukan persentase denoising. JSON completed menambahkan `preview_url`, `download_url`, ukuran hasil dan `result` metadata/flag safety checker.
- Preview: `GET /api/jobs/:id/stylizations/:stylizationId/image`; unduhan: `GET /api/jobs/:id/stylizations/:stylizationId/download`. Hanya snapshot completed dan objek terdaftar pada parent job completed; no-store/private, nosniff, PNG byte-identical. Belum selesai/gagal → 409; ID/file tak ada → 404.
- Satu FIFO job manager untuk ekstraksi dan stylization, tanpa retry otomatis. Restart menandai snapshot queued/processing sebagai failed (`STYLIZATION_INTERRUPTED`), tidak mengulang AI. Health/unduhan tetap tersedia ketika generasi berlangsung.
- PNG sementara dan manifest ada di `<job>/stylizations/<uuid>/`; backend memeriksa canonical regular file, decode PNG, dimensi, metadata serta **alpha exact terhadap sumber** sebelum mempublikasikan `image.png` dan manifest completed. Manifest job utama, original, ZIP dan pixelation tidak diubah.
- `AI_STYLIZATION_TIMEOUT_MS` mencakup request dan body JSON (1..2147483647 ms, default 900000). `AI_STYLIZATION_SERVICE_URL` opsional menunjuk service SD15 terpisah, default `AI_SERVICE_URL`. Untuk contoh port 8001 di atas, set `AI_STYLIZATION_SERVICE_URL=http://127.0.0.1:8001` pada backend lalu restart.
- **Batas resource:** Antrean menyerialkan request, bukan lifecycle model. Menjalankan dua service sekaligus tetap dapat mempertahankan SCHP+SD15 dalam memori. Smoke menggunakan ekstraksi dahulu, menghentikan service SCHP, baru memulai SD15; aplikasi belum mengotomatiskan pergantian ini. HTTP timeout tidak membatalkan inferensi di server; hasil terlambat tetap staging privat dan tidak dipublikasikan. Retensi otomatis aktif wajib disetel melebihi `AI_STYLIZATION_TIMEOUT_MS` agar direktori staging tidak terhapus selagi model remote mungkin masih menulis (D-048).
- **Batas bukti:** smoke D-041 pernah dihentikan guard memori. Log 2026-11-21 berikutnya mencatat generasi SD15 melalui Express mencapai completed (72,2 s), tetapi run lain kembali dihentikan guard. Itu bukan jaminan SCHP+SD15 resident bersamaan, kualitas foto nyata atau semua parameter. Bukti browser dengan AI mock harus dibaca terpisah dari inferensi nyata; lihat ringkasan pengujian di bawah dan HANDOFF sebelum memuat model.

## Koreksi Mask Manual (Mask Correction Tool — FR-12)

- Tombol **Koreksi Mask** pada setiap kartu objek membuka dialog interaktif HTML5 (`#mask-editor-dialog`).
- Kanvas interaktif 2D memungkinkan pengguna merapikan siluet objek secara manual:
  - **Penghapus (Transparan):** klik menghapus disk sesuai radius kuas; drag menghapus sepanjang stroke dengan `destination-out`.
  - **Kuas Pulihkan:** klik/drag memakai clip lingkaran/kapsul dan komposisi `copy` untuk mengembalikan RGB/alpha crop foto sumber tanpa penumpukan alpha atau inferensi baru. Transparansi parsial mengikuti pembulatan premultiplied-alpha Canvas dan tepi kuas memakai antialiasing, bukan jaminan semua byte RGB file asli identik.
  - Foto sumber Pulihkan adalah hasil decode browser. Pada crop JPEG yang diuji, RGB browser/Pillow berbeda maksimum satu tingkat, termasuk pada piksel opaque; ini batas teramati, bukan toleransi universal. Pembanding save memakai `Canvas.toBlob`, sesuai jalur aplikasi, bukan mengasumsikan semua encoder/dekoder identik.
  - **Slider Brush Size:** mengatur diameter kuas/penghapus antara 2 hingga 60 piksel dengan preview angka.
  - **Undo Stack & Reset:** riwayat modifikasi hingga 20 langkah `ImageData` dan tombol reset ke kondisi awal siluet.
- **Simpan Koreksi:** mengirim binary PNG RGBA ke endpoint `PUT /api/jobs/:id/objects/:objectId`.
- Backend memvalidasi integritas dimensi exact, saluran 4 channel RGBA, dekompresi piksel penuh, menulis file kanonikal secara atomik, dan memperbarui `pixel_count` serta timestamp pada manifest.
- Operasi turunan **baru** membaca objek yang sudah dikoreksi. Snapshot ZIP/pixelation/stylization/spritesheet yang sudah dibuat tidak dibuat ulang otomatis. Reset editor mengembalikan kondisi saat editor dibuka, bukan arsip permanen mask sebelum semua revisi.
- Koreksi berlaku **hanya pada objek yang disimpan**, bukan class map atau semua kategori. Memulihkan celana di objek Pants tidak otomatis menghapus fragmen celana yang salah masuk Upper-clothes. Tidak merekonstruksi bagian yang tertutup; bbox crop tetap membatasi area editor.

## Generator Spritesheet Statis & Atlas JSON (FR-13)

- Fieldset **Ekspor Spritesheet Statis (M7)** di bagian bawah galeri memungkinkan penggabungan seluruh atau sebagian objek ke dalam satu lembar gambar bergrid.
- Konfigurasi parameter:
  - **Padding Antar-Sprite:** jarak piksel antargambar (0–64 px; default 4 px).
  - **Jumlah Kolom Grid:** susunan kolom lembar sprite (1–16 kolom; default otomatis disesuaikan).
- Dua tombol aksi:
  - **Spritesheet Pilihan:** menyusun hanya objek yang dicentang pada checkbox kartu.
  - **Spritesheet Semua:** menyusun seluruh objek yang terdeteksi pada job.
- Penyajian & Format:
  - Menghasilkan komposit PNG RGBA dengan Sharp (kompresi PNG lossless level 9); kompresi lossless tidak berarti proses compositing mempertahankan setiap channel sumber.
  - Atlas JSON bergaya TexturePacker memuat `frame: { x, y, w, h }`, ukuran sumber, kategori dan flag tanpa trim/rotasi. Penerimaan memeriksa koordinat/isi frame; impor ke Godot, Unity, PixiJS atau Phaser belum diuji.
  - Preview, dimensi/jumlah objek dan tombol PNG/atlas tersedia. Container preview maksimal 256 px dengan scroll: gulir di dalam preview untuk melihat baris bawah. Batas tampilan ini tidak memotong PNG unduhan.
- Pada sampel Pants terkoreksi + kedua sepatu, helper dan UI/API mempertahankan seluruh alpha (termasuk parsial), RGB opaque, serta PNG/ZIP sumber. Tujuh piksel RGB beralpha parsial berubah maksimum satu tingkat dan RGB tersembunyi sepatu berubah saat compositing. Ini batas sampel terukur, bukan jaminan semua RGBA exact seperti pixelation atau byte-identical seperti PNG asli/ZIP. Susunan baris dapat menyisakan ruang kosong; bukan packing paling padat atau sprite animasi.
- Endpoint API:
  - `POST /api/jobs/:id/spritesheet`: menerima `{ all: true }` atau `{ object_ids: [...] }` dengan opsional `padding` dan `columns`, mengembalikan status 201 + Location snapshot.
  - `GET /api/jobs/:id/spritesheets/:spritesheetId` & `.../download`: menyajikan PNG inline atau attachment download.
  - `GET /api/jobs/:id/spritesheets/:spritesheetId/atlas` & `.../download`: menyajikan file JSON atlas inline atau attachment download.

## Menjalankan jalur ekstraksi, mask, pixelation dan ekspor

Runtime yang tercatat pada setup Windows lokal: Node.js **22.12.0**, npm **10.9.0**, Python **3.14.3**, PyTorch CPU (`torch 2.15.0+cpu`, `torchvision 0.29.2+cpu`). Angka ini catatan setup, bukan pemeriksaan versi ulang.

Dengan dependensi, `.venv-test` dan checkpoint SCHP lokal yang sudah tersedia, jalankan tiga terminal dari root proyek. Untuk SD15 gunakan runtime/config terpisah pada bagian AI Stylization; jangan menganggap tiga terminal ini mengaktifkan generasi AI.

```powershell
# Terminal 1 — AI Service (FastAPI + Model SCHP ATR-18 CPU)
.\ai-service\.venv-test\Scripts\python.exe -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8000

# Terminal 2 — Backend (Express.js)
# Timeout ekstraksi/health; smoke lokal memakai 30000 ms, default backend 3000 ms.
$env:AI_HEALTH_TIMEOUT_MS = '30000'
npm start --prefix backend

# Terminal 3 — Frontend (Vite)
npm run dev --prefix frontend
```

Buka **http://127.0.0.1:5173** di browser Anda. Hentikan masing-masing proses dengan `Ctrl+C`.

Linux/macOS belum diuji. Jangan menganggap membuat venv kosong atau mengganti path executable Python cukup untuk mereproduksi environment/model Windows yang sudah disiapkan.

Konfigurasi port bawaan tidak memerlukan `.env`; dependensi dan model tetap prasyarat. Bila perlu, salin `backend/.env.example` ke `backend/.env` dan `frontend/.env.example` ke `frontend/.env`, lalu restart layanan. Express membaca `PORT`, `AI_SERVICE_URL`, `AI_HEALTH_TIMEOUT_MS`, `AI_STYLIZATION_SERVICE_URL`, `AI_STYLIZATION_TIMEOUT_MS`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`, `STORAGE_RETENTION_HOURS` (default 24; `0` menonaktifkan) dan `STORAGE_SWEEP_INTERVAL_MINUTES` (default 60). Batas byte frontend tetap 10 MiB; batas server yang lebih kecil menghasilkan penolakan. Vite memakai `BACKEND_URL` untuk proxy `/api`; browser tidak mengakses FastAPI langsung. Port FastAPI diatur melalui argumen Uvicorn.

### Health checks dan smoke test

| Endpoint | Arti |
| --- | --- |
| `http://127.0.0.1:3000/api/health` | Express hidup, independen dari FastAPI |
| `http://127.0.0.1:8000/health` | FastAPI hidup; `model_loaded` true hanya bila SCHP berhasil dimuat. Health juga memuat `stylizer_available` dan `stylizer_loaded` |
| `http://127.0.0.1:3000/api/health/ai` | Express benar-benar memanggil FastAPI; HTTP 503 jika gagal/tidak tersedia |

Dengan ketiga layanan aktif, jalankan dari root:

```powershell
node scripts/smoke.mjs
npm run build --prefix frontend
```

Untuk jalur kegagalan, hentikan **hanya FastAPI**, jalankan `node scripts/smoke.mjs --ai-unavailable`, lalu klik **Periksa ulang** di browser. Express harus tetap sehat, sementara koneksi FastAPI gagal dengan jelas. Jalankan kembali FastAPI dan periksa ulang untuk pemulihan.

Build frontend tersimpan di `frontend/dist/`. `npm run preview --prefix frontend` menyajikannya pada port 4173 dengan proxy lokal yang sama; ini bukan konfigurasi deployment produksi.

### Bukti dan batas pengujian

| Jalur | Bukti tercatat | Batas |
| --- | --- | --- |
| Browser → Express → SCHP nyata | 2026-11-22: upload sintetis menghasilkan enam objek; PNG/ZIP, pixelation dan spritesheet/atlas berhasil | Bukan evaluasi kualitas pada foto manusia nyata/occlusion |
| Mask editor + ekspor pada browser | 2026-11-22: regresi penghapus/Pulihkan, RGB/alpha, bbox, Undo, PNG tersimpan, spritesheet dan reset PASS | AI mock; frontend produksi dan backend nyata. Bukan tes inferensi model |
| SD15 nyata | Log 2026-11-21 memuat inferensi sukses dan run yang dihentikan guard | Resource, latensi dan kualitas tetap perlu evaluasi; tidak diulang pada sesi mask/dokumentasi |
| Evaluasi SCHP dua foto berizin | 2026-11-23: astronaut setengah badan dan satu foto full-body; kontrak RGB/mask/crop PASS | Salah label/kebocoran ditemukan; tanpa ground-truth mask/IoU, bukan evaluasi dataset |
| Koreksi mask foto nyata → PNG/ZIP | 2026-11-23: foreground astronaut dan crop Pants, Pulihkan/Penghapus sesuai skenario, Undo/save serta unduhan PASS | Koreksi area terarah; tidak memperbaiki class map/kategori lain. Decode JPEG/Canvas dapat mengubah RGB |
| Pixelation PNG Pants terkoreksi | 2026-11-23: helper 32/Retro16 + oracle seluruh piksel PASS; dua tes Retro16 PASS | Bukan UI/API ulang; grid foto ini tidak menyampel alpha parsial |
| Spritesheet tiga objek nyata → PNG/atlas/ZIP | 2026-11-23: helper, lalu Chrome → Express → SCHP; PNG Pants revisi diterapkan via PUT, pilihan tiga objek/preview/unduhan/reset PASS | Desktop lokal; bukan tes kuas ulang atau impor game engine. Alpha exact pada sampel, RGB parsial/tersembunyi tidak seluruhnya exact |

Foto evaluasi: [astronaut NASA menurut scikit-image](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.astronaut) (public domain) dan [Man Standing — Visitor7](https://commons.wikimedia.org/w/index.php?title=File:Man_Standing.jpg&oldid=1257378181) ([CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)). Provenance dan hasil lokal berada di `scratch/` yang diabaikan Git; bukan fixture yang dibundel ke repository. Rincian perintah, artefak dan keterbatasan ada di [PROGRESS](docs/PROGRESS.md). Bukti ini historis, tidak dijalankan ulang pada sinkronisasi dokumentasi.

Untuk regresi UI/backend yang tidak memuat model, jalankan dari root setelah dependensi web terpasang:

```powershell
npm run build --prefix frontend
node scripts/smoke_browser_m7.mjs
```

Harness saat ini mencari executable Chrome/Brave/Edge pada lokasi Windows yang tercantum dalam script, membuka browser headless dan server/storage temporary, lalu melakukan cleanup. Screenshot disimpan di `scratch/` (ignored). Ini terpisah dari `scripts/smoke.mjs`, yang hanya memeriksa health layanan yang sudah berjalan dan tidak membuktikan kualitas inferensi. Tes backend/Python historis tetap ada di PROGRESS; jangan mengklaim dijalankan ulang karena dokumen diperbarui.

**Belum tercakup oleh bukti di atas:** penerimaan kualitas pada dataset beragam/occlusion, AI stylization foto-foto evaluasi tersebut, impor atlas ke game engine, deployment publik, Linux/macOS dan kamera mobile. Dua foto tidak membuktikan akurasi umum. Antrean berbatas dan lifecycle pergantian model otomatis belum diimplementasikan (retensi otomatis storage lokal telah diimplementasikan sesuai D-048). Model/checkpoint tidak boleh didistribusikan tanpa memastikan lisensinya.

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
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — desain service, kontrak API aktual dan batas lifecycle.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — status dan pengujian yang sebenarnya.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — instruksi perpindahan agent.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — keputusan dan pertanyaan terbuka.
- [`AGENTS.md`](AGENTS.md) — aturan coding agent.

## Lisensi dan distribusi

Lisensi kode proyek belum ditentukan. Sebelum mendistribusikan model atau aplikasi secara publik/komersial, cek lisensi setiap model dan checkpoint serta dependensinya. Jangan berasumsi semua model AI boleh didistribusikan bebas.
