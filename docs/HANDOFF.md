# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — Verifikasi & integrasi API snapshot Classic Pixelation per objek (`POST /api/jobs/:id/pixelate`, `GET /api/jobs/:id/pixelations/:pixelationId` + `/download`), 2026-11-18.

## Current milestone

**M5 — Classic Pixelation Studio — In progress.**
M4 selesai pada jalur Windows lokal teruji. Helper internal satu PNG dan API snapshot persistensi per objek M5 selesai dan teruji; UI Studio di browser dan palet belum tersedia.

## Last completed task

- `backend/src/job-manager.js`: implementasi `createPixelation(jobId, input)` dan `getPixelation(jobId, pixelationId)`.
  - Validasi ketat `jobId` & `object_id` (UUID format, harus ada di manifest job `completed`), `size` hanya 16/32/64/128, reject payload ekstra.
  - Snapshot disimpan atomik di `<jobDirectory>/pixelations/<pixelationId>/` (`image.tmp` → `image.png` dan `manifest.tmp` → `manifest.json`).
  - Terminal job manifest, original PNG, dan ZIP exports tidak dimutasi atau diubah.
- `backend/src/jobs.js`:
  - `POST /api/jobs/:id/pixelate`: HTTP 201 Created + header `Location`, JSON metadata dengan `preview_url` dan `download_url`.
  - `GET /api/jobs/:id/pixelations/:pixelationId`: inline PNG preview dengan header keamanan (`no-store, private`, `nosniff`).
  - `GET /api/jobs/:id/pixelations/:pixelationId/download`: attachment PNG download.
- `backend/test/jobs.test.js`: 5 skenario test baru mencakup integritas snapshot independen, keutuhan original/ZIP setelah backend restart, kesesuaian piksel RGBA exact, validasi input & cross-job isolation, error handling, serta proteksi symlink/junction.
- Dokumen diperbarui: `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` (D-028), `docs/PROGRESS.md`, `docs/HANDOFF.md`.

## Current task

API dan snapshot persistensi hasil pixelation per objek selesai dan terverifikasi penuh (89/89 backend tests PASS). Berikutnya pembuatan UI Classic Pixelation Studio pada frontend; jangan membuat palet sekaligus sebelum UI dasar teruji.

## Working components

- Helper `pixelatePng` menghasilkan PNG 16/32/64/128 dengan dimensi rasio aspek terbulatkan, sampling nearest pusat, tanpa blending/flatten/quantization (D-027).
- API `POST /api/jobs/:id/pixelate`, `GET /api/jobs/:id/pixelations/:pixelationId`, `GET /api/jobs/:id/pixelations/:pixelationId/download` (D-028).
- Semua test suite backend (89/89) lulus tanpa regresi.
- Frontend build (Vite) bersih tanpa error.

## Modified files

- `backend/src/job-manager.js` — metode `createPixelation` dan `getPixelation`.
- `backend/src/jobs.js` — router pixelate dan asset serving.
- `backend/test/jobs.test.js` — 5 test skenario baru (23/23 subtest suite PASS).
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md` — dokumentasi D-028, rincian verifikasi dan next task.

## Uncommitted changes / Git status

Perubahan di 8 file di atas berada di working tree (uncommitted). Sesuai instruksi pengguna, tidak ada `git commit` otomatis yang dijalankan.

## Current errors / limitations

- UI Frontend Studio untuk Classic Pixelation dan pemilih ukuran/preview/download belum dibuat; pengguna browser belum dapat memicu pixelation langsung dari web.
- Palet warna / color quantization belum diimplementasikan.
- Nearest-neighbour dapat menghilangkan detail tipis pada resolusi rendah (16/32).
- Retensi otomatis storage pixelations mengikuti direktori job utama (belum ada retensi otomatis terpisah).

## Tests performed

- **PASS** `node --test backend/test/pixelation.test.js`: 5/5 subtest lulus.
- **PASS** `node --test backend/test/jobs.test.js`: 23/23 subtest suite (57 subtests) lulus.
- **PASS** `npm test --prefix backend`: 89/89 tests lulus (extractions, jobs, pixelation, uploads).
- **PASS** `npm run build --prefix frontend`: Vite 7 modul berhasil di-bundle (208ms).
- **NOT RUN**: Pengujian browser langsung UI Studio (karena UI Studio belum dibuat) dan AI Stylization M6.

## Next action (only one)

**Implementasikan UI Classic Pixelation Studio pada frontend:** Tambahkan kontrol pemilihan ukuran (16, 32, 64, 128) per objek hasil ekstraksi atau panel studio di frontend (`frontend/src/extraction-workspace.js` atau modul studio baru), panggil endpoint `POST /api/jobs/:id/pixelate`, tampilkan preview hasil pixelation transparan dengan status loading, dan sediakan link unduhan PNG pixelated. Jangan membuat modul palet sekaligus sebelum UI dasar teruji.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
