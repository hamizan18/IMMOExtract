# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** implementasi dan verifikasi batas panjang antrean FIFO (`MAX_QUEUE_LENGTH`, HTTP 429 `QUEUE_FULL`, D-050) telah selesai dan lulus 151/151 tes backend serta build frontend, namun belum di-commit. Jangan memulai fitur baru tanpa arahan pengguna; tunggu tinjauan/commit pengguna.

## Last agent

Antigravity — mengimplementasikan dan memverifikasi batas panjang antrean FIFO (`MAX_QUEUE_LENGTH`, HTTP 429 `QUEUE_FULL`, D-050) sesuai pilihan pengguna setelah commit `1bbbfd4` (2026-11-24).

## Current milestone / task

M7 — hardening pascapenutupan implementasi D-047, D-048, D-049, & D-050. Implementasi batas panjang antrean D-050 selesai; tidak ada implementasi berjalan.

## Last completed task

- Git awal: bersih (`main...origin/main` pada commit `1bbbfd4` setelah pengguna melakukan commit atas D-048 & D-049).
- Pengguna memilih tugas implementasi batas panjang antrean job (`MAX_QUEUE_LENGTH`, HTTP 429 `QUEUE_FULL`) sesuai `docs/PROJECT_SPEC.md` §8 ("pembatasan permintaan").
- Implementasi D-050 di `backend/src/job-manager.js`, `backend/src/jobs.js`, `backend/src/app.js`, `backend/src/server.js`, dan `backend/.env.example`:
  - Konfigurasi `MAX_QUEUE_LENGTH` (default `10`, wajib integer positif `>= 1`).
  - Perhitungan deterministik jumlah tugas menunggu di belakang worker aktif (`waitingQueueCount()`).
  - Penolakan `JobError(429, 'QUEUE_FULL', 'Antrean pemrosesan penuh. Tunggu hingga tugas aktif selesai lalu coba lagi.')` pada `create(uploadId)` dan `createStylization(jobId, input)` ketika antrean penuh, tanpa meninggalkan direktori job/stylization yatim.
  - Preservasi upload existing saat `POST /api/jobs` JSON ditolak 429, serta pembersihan upload transien (`manager.discardUpload(uploadId)`) saat `POST /api/jobs` multipart langsung ditolak 429.
- Penambahan pengujian unit/integrasi HTTP 429 `QUEUE_FULL` di `backend/test/retention.test.js` dan sinkronisasi `docs/DECISIONS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`, serta `docs/HANDOFF.md`.

## Modified files / uncommitted changes

- `backend/.env.example`, `backend/src/server.js`, `backend/src/app.js`, `backend/src/jobs.js`, `backend/src/job-manager.js` — konfigurasi dan penegakan batas panjang antrean FIFO `MAX_QUEUE_LENGTH` (D-050).
- `backend/test/retention.test.js` — pengujian validasi `maxQueueLength` dan skenario HTTP 429 `QUEUE_FULL` (JSON, multipart, stylization, dan recovery setelah drain).
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md` — dokumentasi D-050.
- Tanpa staging/commit otomatis.

## Tests / checks performed

- **PASS inspeksi:** `git status --short --branch`, `git diff --stat`, `git diff --cached --stat`, `git log -n 2 --oneline`.
- **PASS:** `node --test backend/test/retention.test.js` — 8/8 tests PASS (3,45 s).
- **PASS:** `npm test --prefix backend` — 151/151 tests PASS (68 top-level subtests, 0 fail, 0 skip, 21,69 s).
- **PASS:** `npm run build --prefix frontend` — Vite build PASS (7 modul, 509 ms).
- **NOT RUN:** suite Python `ai-service`, browser headless CDP, inferensi live SCHP/SD15 — perubahan terbatas pada batas antrean backend Express.

## Current errors / limitations

- Tidak ada error pada sesi ini.
- Batas terbuka yang tersisa: endpoint penghapusan manual per job (`DELETE /api/jobs/:id`), kuota kapasitas disk, pergantian lifecycle model SCHP/SD15 otomatis, kualitas segmentasi umum pada foto beragam/occlusion, impor atlas ke game engine, portabilitas Linux/macOS, kamera mobile, dan konfirmasi lisensi redistribusi checkpoint model.

## Next action (only one)

Pengguna meninjau perubahan implementasi D-050 dan dokumentasi lalu memutuskan commit; setelah itu pengguna memilih satu batas terbuka berikutnya bila ingin melanjutkan hardening tambahan (misalnya endpoint penghapusan manual `DELETE /api/jobs/:id` atau verifikasi E2E terdokumentasi menggunakan `scratch/gambar_uji_ideal.jpg`). Agent tidak memulai tanpa arahan.

## Handoff rules

1. Periksa repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat PASS/FAIL/NOT RUN aktual; dokumentasi bukan pengganti runtime.
4. Perbarui PROGRESS/HANDOFF; keputusan arsitektur baru dicatat di DECISIONS.
5. Claude Website perlu file relevan; jangan kirim foto pribadi, `.env` atau checkpoint.
