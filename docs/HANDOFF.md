# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Proyek ini telah menyelesaikan seluruh Milestone MVP (M1–M7).

## Last agent

Antigravity CLI — penyelesaian finalisasi Milestone M7 dan penutupan rilis MVP (sinkronisasi tabel REST API `docs/ARCHITECTURE.md`, pembaruan panduan komprehensif `README.md`, pencatatan keputusan arsitektural D-047 di `docs/DECISIONS.md`, dan audit status pengujian menyeluruh), 2026-11-21.

## Current milestone

**Milestone M1–M7 Selesai (MVP Release Ready).** Seluruh persyaratan fungsional wajib dan tahap lanjut (FR-01 hingga FR-13) telah terpenuhi dan terverifikasi penuh di lingkungan lokal Windows.

## Last completed task

- **Penutupan Milestone M7 & Audit Kesiapan Rilis MVP (D-047):**
  - **Audit Fungsional (FR-01 s/d FR-13):**
    - Input gambar & kamera browser (FR-01, FR-02).
    - Validasi defensif ukuran/dimensi/format (FR-03).
    - Parsing manusia SCHP ATR-18 CPU lokal & crop PNG transparan (FR-04, FR-05).
    - Polling async job manifest & galeri objek interaktif (FR-06).
    - Unduhan satuan PNG asli & ekspor selective ZIP hardened dengan streaming SHA-256 (FR-07, FR-08).
    - Classic Pixelation Studio dengan 4 ukuran & palet Retro 16 warna (FR-09, FR-10).
    - AI Pixel Art Stylization lokal SD15 CPU FP32 + exact alpha restoration (FR-11).
    - Mask Correction Tool Canvas 2D kuas/penghapus/pulihkan foto asli + endpoint revisi `PUT` (FR-12).
    - Generator Spritesheet Statis & Atlas JSON PixiJS/Phaser standard (FR-13).
  - **Sinkronisasi Dokumentasi:**
    - `docs/ARCHITECTURE.md`: Tabel REST API diperbarui dengan rute `PUT /api/jobs/:id/objects/:objectId`, `GET /api/jobs/:id/exports/:exportId`, dan seluruh endpoint spritesheet/atlas.
    - `README.md`: Panduan diperbarui mencakup status rilis MVP, cara menjalankan ketiga terminal, Mask Correction Tool, Spritesheet Generator, dan Selective ZIP Hardening.
    - `docs/DECISIONS.md`: Keputusan D-047 dicatat.
    - `docs/PROGRESS.md` & `docs/HANDOFF.md`: Status proyek disinkronkan ke status rilis MVP ready.

## Current task

Fase MVP telah selesai secara penuh. Menunggu instruksi pengguna untuk pengoperasian, evaluasi hasil, atau penambahan fitur sekunder pasca-MVP.

## Working components

- **Input & Kamera (M2):** Upload multipart, drag-and-drop, capture webcam lokal via browser dengan stream safety.
- **Ekstraksi Objek SCHP (M3/M4):** Inferensi model SCHP ATR-18 CPU FP32 lokal, crop bounding box, PNG transparan RGBA.
- **Galeri & Polling Async (M4):** Antrean FIFO Express, polling serial 1 detik, kartu objek responsif di UI dark futuristic.
- **Hardened Selective ZIP (M4/M7):** STORE mode tanpa kompresi ulang, streaming SHA-256 integrity hash on-the-fly, dan endpoint metadata `GET /api/jobs/:id/exports/:exportId`.
- **Classic Pixelation Studio (M5):** Resize nearest-neighbour 16/32/64/128 px, kuantisasi palet Retro 16 warna, preservasi alpha exact.
- **AI Pixel Art Stylization (M6):** SD15 CPU FP32 pipeline, UNet memory-cloned offload loader, preset prompt, letterbox & 100% exact alpha restore, FIFO orchestrator, dan antarmuka UI.
- **Mask Correction Tool (M6):** Dialog interaktif Canvas 2D, penghapus transparan, kuas pemulih foto asli, slider brush 2–60 px, undo stack, dan revisi backend via `PUT`.
- **Generator Spritesheet Statis & Atlas JSON (M7):** Komposisi komposit Sharp transparan, pengaturan grid padding/kolom, ekspor lembar sprite, dan atlas JSON standar TexturePacker / PixiJS / Phaser.
- **Automated Headless Browser Smoke Test Runner:** Pengujian CDP Chrome otomatis untuk M6 dan M7 (`scratch/smoke_browser_m7.mjs`).

## Modified files

- `docs/ARCHITECTURE.md` — Pembaruan tabel kontrak REST API dengan endpoint M6 & M7.
- `README.md` — Pembaruan status rilis MVP, panduan Mask Correction, Spritesheet, dan Selective ZIP.
- `docs/DECISIONS.md` — Pencatatan keputusan arsitektural D-047.
- `docs/PROGRESS.md` — Pembaruan status milestone dan penutupan rilis MVP.
- `docs/HANDOFF.md` — Status handoff disinkronkan ke kondisi rilis MVP.

## Uncommitted changes / Git status

- Working tree memuat modifikasi pada file-file dokumentasi di atas.
- Tidak ada commit otomatis (sesuai aturan `AGENTS.md`). Menunggu instruksi commit dari pengguna.

## Current errors / limitations

- Batas Commit Limit OS saat ini (14.81 GiB) dengan commit dasar OS/aplikasi (~5.5–6.0 GiB) menyisakan CommitAvail ~8.8–9.3 GiB saat idle; untuk inferensi SD15 CPU kontinu, penambahan Virtual Memory Windows (+4–8 GB Paging File di Drive D:) tetap disarankan guna menjaga headroom aman saat load ganda.
- Model SD15 CPU FP32 membutuhkan waktu inferensi ~20 detik per langkah denoising pada AMD Ryzen 5 7430U (total ~50–60 detik untuk 2 langkah); ini merupakan trade-off local-first CPU tanpa GPU diskret.

## Tests / checks performed

- **PASS:** `node --test backend/test/spritesheet.test.js backend/test/zip-export.test.js backend/test/ai-client.test.js backend/test/stylizations.test.js backend/test/jobs.test.js backend/test/extractions.test.js backend/test/pixelation.test.js` — 119/119 tests PASS dalam 8.24s (0 fail, 0 skip).
- **PASS:** `ai-service\.venv-test\Scripts\python.exe -u -B -m unittest discover -s ai-service -p test_api.py -v` — 14/14 tests PASS dalam 9.35s.
- **PASS:** `npm run build --prefix frontend` — Vite build PASS (7 modul dalam 126ms).
- **PASS:** Automated Headless Browser Smoke Test M7 (`scratch/smoke_browser_m7.mjs`) — 13/13 stages PASS dalam 18 detik (0 console error).

## Next action (only one)

Fase MVP telah selesai secara penuh (M1–M7). Aplikasi siap dijalankan dan diuji oleh pengguna secara end-to-end melalui browser.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
