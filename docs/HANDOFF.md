# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — integrasi antrean stylization backend, snapshot privat dan pengujian kontrak (D-041), 2026-11-21. Pengguna memilih **defer_live** setelah smoke SD15 dihentikan guard commit. Tidak membuat commit.

## Current milestone

**M6 — In progress.** Helper/API FastAPI memiliki bukti nyata D-039/D-040. Backend Express diimplementasikan dan tes kontrak/regresi PASS; penerimaan backend SD15 nyata belum selesai. UI generatif/koreksi mask belum tersedia.

## Last completed task

- AiClient.stylizePath dengan timeout generatif terpisah default 900000 ms dan URL service SD15 opsional.
- POST `/api/jobs/:id/stylize` menerima object_id/parameter, 202 + Location polling; tidak menerima path browser.
- FIFO existing kini melayani ekstraksi dan stylization. Snapshot terpisah di `<job>/stylizations/<uuid>/`, progress tahap, state aktif committed, restart interrupted menjadi failed tanpa retry.
- PNG staging divalidasi decode penuh, dimensi/metadata/alpha exact sebelum image.png dan manifest completed dipublikasikan. Preview/download privat berbasis parent/object/snapshot, canonical regular file, no-store/private/nosniff.
- Original/job/ZIP/pixelation tidak dimutasi. HTTP timeout tidak menjamin inferensi remote dibatalkan; late write tetap staging privat.
- Pengujian backend 103/103 PASS. Smoke nyata berhasil tahap ekstraksi, tetapi SD15 dihentikan resource guard; hasil ini **bukan PASS end-to-end**.

## Current task

Implementasi backend dan dokumentasi disimpan. Pengujian SD15 nyata ulang ditunda sesuai pilihan pengguna; jangan retry otomatis, menurunkan guard, atau mengaktifkan UI.

## Working components

- Tes kontrak memakai fixture sintetis transport/AI, bukan model nyata: timeout/body stalled, FIFO dua arah, restart/interrupted, failure, snapshot/download, alpha, safe errors dan symlink/junction.
- Regresi API ekstraksi, original/ZIP/pixelation PASS dalam suite terarah.
- Smoke nyata: Express→SCHP menghasilkan tiga objek, PNG original dan ZIP valid. SCHP dihentikan sebelum SD15 startup. POST stylize 202 queued, path injection 400, pending download 409, health backend 200.
- Setelah watchdog menghentikan SD15, polling backend menunjukkan failed/STYLIZATION_FAILED tanpa path internal. PNG generatif, alpha hasil, preservasi setelah generasi dan restart backend nyata belum tercapai.

## Modified files

- `backend/src/ai-client.js` — client stylization URL/deadline/error aman.
- `backend/src/app.js`, `backend/src/server.js`, `backend/.env.example` — opsi AI_STYLIZATION_TIMEOUT_MS/AI_STYLIZATION_SERVICE_URL.
- `backend/src/job-manager.js` — FIFO bersama, snapshot/status/recovery/artifact validation.
- `backend/src/jobs.js` — POST/polling/preview/download stylization.
- `backend/test/ai-client.test.js`, `backend/test/stylizations.test.js` — dua file tes baru.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md` — kontrak, hasil aktual dan handoff.

## Uncommitted changes / Git status

- Inspeksi awal status/diff/index bersih pada HEAD `168f6cd` (`AI Service Done`). Catatan tujuh perubahan pending sesi D-040 sudah kedaluwarsa.
- Sesi ini mengubah 11 file existing dan membuat 2 file tes di atas; tidak di-stage/commit. Daftar berdasarkan inspeksi awal dan operasi edit, tidak menjalankan Git ulang untuk audit.
- Tidak mengubah Python/FastAPI/helper, model, frontend, dependensi atau struktur proyek. Tidak download, reset, menghapus perubahan pengguna, menutup aplikasi pengguna atau mengubah pagefile.
- Harness via stdin; seluruh service milik harness dihentikan/ditunggu dan storage/log/fixture temporary dibersihkan. LSP tidak dikonfigurasi.

## Current errors / limitations

- **Smoke end-to-end FAIL karena guard commit**, bukan penyebab bug model yang sudah terbukti. Gate awal RAM available 3.917.631.488/sisa commit 8.888.893.440 byte; sesudah SCHP berhenti 3.858.649.088/8.786.952.192 byte, lolos gerbang 3/8 GiB.
- Saat pipeline SD15 dimuat, watchdog melihat sisa commit **1.056.886.784 byte**, di bawah batas **1.073.741.824 byte (1 GiB)**. RAM available saat itu 1.661.292.544 byte (~1,55 GiB); yang memicu penghentian adalah commit, bukan RAM available.
- Pengguna ditawarkan satu smoke ulang setelah available ≥3 GiB/sisa commit ≥10 GiB atau defer; memilih **defer_live**. Jangan menafsirkan pesan continue generik sebagai perubahan kondisi memori atau izin retry tanpa memeriksa kesiapan.
- Guard runtime tetap available <512 MiB atau sisa commit <1 GiB; sampling bukan hard cap. Gerbang 3/10 GiB lebih konservatif, bukan jaminan keselamatan.
- FIFO tidak mengatur lifecycle resident model. Dua service terpisah tetap dapat menghabiskan memori bila SCHP+SD15 hidup bersama; smoke menghentikan SCHP dahulu. Backend belum mengotomatiskan pergantian model.
- Timeout tidak membatalkan model remote; snapshot failed tidak dapat diunduh meski file staging muncul terlambat. Retensi/batas antrean belum tersedia, endpoint ekstraksi sinkron M3 di luar FIFO.

## Tests / checks performed

- **PASS:** `node --test backend/test/ai-client.test.js backend/test/stylizations.test.js backend/test/jobs.test.js backend/test/extractions.test.js` — **103/103**, 0 skip, 27.582s. Fixture hanya untuk kontrak; symlink/junction benar-benar diuji.
- **FAIL resource guard:** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -u -` — harness server.js + Uvicorn SCHP/SD15, loopback, offline, storage temporary. Ekstraksi nyata tiga objek PASS; SD15 dihentikan ketika commit melewati guard, backend failed aman.
- **PASS terbatas pada harness yang sama:** path injection 400, POST queued 202, pending download 409, backend health 200, cleanup seluruh service/storage milik harness.
- **NOT RUN:** PNG SD15 sukses/alpha/preservasi setelah generasi/restart backend nyata; terhenti sebelum hasil. UI/browser/build, suite Python ulang, SD15 default20/512 atau dua model bersamaan juga tidak dijalankan.

## Next action (only one)

**Selesaikan smoke backend Express→SD15 nyata setelah pengguna siap dan mengizinkan kelanjutan**, dengan gate ≥3 GiB RAM available/≥10 GiB sisa commit dan guard tetap. Jalankan SCHP/SD15 bergantian; verifikasi hasil PNG/alpha, original/ZIP tetap dan restart backend. Jangan mengulang implementasi yang sudah lulus kontrak atau melanjutkan UI sebelum penerimaan ini selesai.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
