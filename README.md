# IMMOExtract

**Extract. Transform. Create.**

IMMOExtract direncanakan sebagai aplikasi web **local-first** untuk memisahkan manusia beserta pakaian/aksesori dari foto menjadi PNG transparan, lalu (secara opsional) mengolahnya menjadi aset **Classic Pixelation** atau **AI Pixel Art Stylization** untuk game development.

> **Status proyek:** M1 tersedia dan teruji. Tugas pertama M2 menambahkan pemilihan gambar dan preview lokal; belum ada pengiriman gambar ke server, kamera, ekstraksi, atau model AI. Lihat `docs/PROGRESS.md` untuk bukti verifikasi.

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

`frontend/`, `backend/`, dan `ai-service/` berisi fondasi M1. `storage/` tetap privat, diabaikan Git, dan belum digunakan.

## Preview lokal (M2, sebagian)

Pada halaman utama, pilih satu JPG/JPEG, PNG, atau WebP. Preview menampilkan gambar, nama file, dimensi, dan ukuran. **Hapus pilihan** mengosongkan preview; gambar lain dapat dipilih tanpa reload. Data gambar hanya menjadi object URL di browser, tidak dikirim ke server atau disimpan oleh aplikasi.

Batas sementara preview: **10 MiB (10.485.760 byte)**, maksimal **8192 piksel per sisi** dan **24.000.000 piksel**. File kosong, signature/MIME tidak sesuai, atau gagal decode ditolak dengan pesan. Dimensi diperiksa **setelah decode browser**, bukan perlindungan penuh terhadap decompression bomb. Pemeriksaan ini hanya UX frontend; validasi server defensif belum tersedia. Tidak ada tombol ekstraksi atau hasil AI palsu.

Uji manual: pilih JPG/PNG/WebP valid; ganti gambar; hapus lalu pilih file yang sama; coba file rusak, teks berekstensi `.png`, file >10 MiB, atau dimensi melebihi batas. Preview lama harus hilang saat pilihan baru diproses/gagal. Pengujian aktual desktop/mobile dan race decode dicatat di `PROGRESS.md`.

## Menjalankan M1

Runtime setup: Node.js **22.12.0**, npm **10.9.0**, Python **3.14.3**. Python ini hanya untuk health service M1; kompatibilitas PyTorch/SCHP belum diuji.

Instal dependensi dari root proyek (PowerShell):

```powershell
npm ci --prefix frontend
npm ci --prefix backend
python -m venv ai-service/.venv
.\ai-service\.venv\Scripts\python.exe -m pip install -r ai-service/requirements.txt
```

Buka tiga terminal dari root proyek:

```powershell
# Terminal 1 — FastAPI, hanya loopback; tidak memuat model AI
.\ai-service\.venv\Scripts\python.exe -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8000

# Terminal 2 — Express
npm start --prefix backend

# Terminal 3 — Vite
npm run dev --prefix frontend
```

Buka **http://127.0.0.1:5173**. Hentikan masing-masing proses dengan `Ctrl+C`.

Linux/macOS: gunakan `python3 -m venv ai-service/.venv` dan `ai-service/.venv/bin/python` sebagai pengganti executable Python Windows. Perintah npm sama; platform tersebut belum diuji.

Konfigurasi bawaan langsung bekerja tanpa `.env`. Bila perlu, salin `backend/.env.example` ke `backend/.env` dan `frontend/.env.example` ke `frontend/.env`; restart layanan setelah perubahan. Express memakai `PORT`, `AI_SERVICE_URL`, dan `AI_HEALTH_TIMEOUT_MS`. Vite memakai `BACKEND_URL` untuk proxy `/api`; browser tidak mengakses FastAPI langsung. Port FastAPI diatur lewat argumen Uvicorn.

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
