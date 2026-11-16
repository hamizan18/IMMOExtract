# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — orchestrator job asynchronous M4 dan verifikasi HTTP dengan model SCHP asli, 2026-11-17.

## Current milestone

**M4 — Job, object gallery, download individual/ZIP — In progress.**
M1–M3 memiliki bukti sebelumnya; alur foreground M3 tetap berfungsi pada tes regresi. Orchestrator/polling M4 selesai dan diuji. PNG per kategori, UI galeri, unduhan job individual/ZIP belum tersedia; M4 belum selesai.

## Last completed task

- `POST /api/jobs`: menerima multipart satu `image` atau JSON hanya `upload_id`; HTTP 202 dengan `Location`, `job_id`, `upload_id`, status `queued`.
- `GET /api/jobs/:id`: polling `queued`/`processing`/`completed`/`failed`, progress tahap 0/10/100, timestamp, objek dan error aman. Tidak mengirim path/file internal.
- FIFO satu worker per instance backend; upload baru menggunakan validasi M2, bukan validator duplikat.
- Manifest privat per job ditulis melalui temporary file + rename; job selesai bertahan setelah restart. Job queued/processing yang tertinggal ditandai failed/JOB_INTERRUPTED pada akses pertama setelah restart, tanpa retry otomatis.
- PNG/mask didekode sebelum job completed. `objects` berisi foreground `human` full-frame yang nyata atau kosong jika alpha foreground tidak ada; kategori ATR hanya metadata, belum file per kategori.
- Error inferensi tidak menghambat job berikutnya; error path internal tidak diteruskan kepada client.
- D-021 mencatat kontrak dan batasan. Tidak mengubah frontend, pipeline AI, dependensi, atau model.

## Current task

Orchestrator selesai. Tugas berikutnya hanya PNG/crop per kategori ATR dan integrasinya ke manifest job; jangan langsung mengerjakan seluruh sisa M4.

## Working components

- Frontend file/kamera → preview → upload server (M2; bukti lama).
- SCHP ATR-18 CPU lokal, endpoint FastAPI dan endpoint ekstraksi sinkron M3.
- Job API Express → FastAPI nyata → foreground RGBA + mask privat → polling completed.
- Checkpoint lokal tetap diabaikan Git. Layanan uji port 8017 sudah dihentikan; proses lintas sesi tidak dijamin.

## Modified files

- `backend/src/app.js` — mount job router, opsi direktori job untuk isolasi.
- `backend/src/uploads.js` — callback setelah upload tersimpan; respons endpoint upload lama tetap HTTP 201.
- `backend/src/job-manager.js` — baru, FIFO/persistensi/recovery dan manifest foreground.
- `backend/src/jobs.js` — baru, HTTP create/polling dan sanitasi respons.
- `backend/test/jobs.test.js` — baru, lima tes lifecycle/security dengan storage dan server terisolasi.
- `README.md` — status dan cara memakai job API.
- `docs/ARCHITECTURE.md` — kontrak aktual job dan batas implementasi.
- `docs/DECISIONS.md` — D-021.
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — bukti dan tugas berikutnya.

## Uncommitted changes / Git status

Inspeksi awal `git status --short`, `git diff --stat`, `git diff --cached --stat` bersih. Daftar uncommitted pada handoff lama sudah kedaluwarsa; tidak ada perubahan awal yang ditimpa.

Semua perubahan dalam bagian Modified files dibuat pada sesi ini dan belum di-commit (tiga file baru, tujuh file existing). Tidak menjalankan staging atau commit otomatis.

## Current errors / limitations

- Tidak ada kegagalan tes aplikasi yang belum terselesaikan pada sesi ini.
- Manifest baru berisi satu foreground manusia, bukan crop atau PNG pakaian individual. Tidak ada UI job/galeri atau endpoint unduhan job/ZIP.
- Satu proses backend harus memiliki storage job; multi-process, batas antrean, retensi otomatis belum tersedia. Ekstraksi sinkron M3 tidak melewati antrean job.
- `server.js` masih menggunakan `AI_HEALTH_TIMEOUT_MS` untuk timeout client AI bersama (default 3000 ms); smoke memakai 30000 ms. Input lambat memerlukan konfigurasi timeout yang memadai.
- Lisensi redistribusi bobot ATR belum terkonfirmasi; jangan bundle checkpoint.
- LSP tidak dikonfigurasi; pencarian pemanggil digunakan setelah tool melaporkan tidak ada server. Satu patch ditolak karena nomor baris tidak ada; dibaca ulang lalu diterapkan, bukan error runtime.

## Tests performed

- **PASS** `npm test --prefix backend`: 32/32 (27 tes lama + 5 tes job). Meliputi serialisasi, polling saat AI ditahan, hasil terminal setelah restart, interrupted jobs, antrean lanjut sesudah gagal, output hilang/kosong, input invalid dan sanitasi.
- **PASS** smoke sementara melalui `node --input-type=module` stdin: FastAPI SCHP nyata port 8017, Express port dinamis dan storage temp. Multipart job diterima 123 ms; job JSON referensi upload menunggu queued; keduanya processing → completed. Inferensi 2.0079s dan 1.88s; kategori Upper-clothes/Pants; PNG 200×300 RGBA, alpha min/max 0/255.
- **PASS** smoke AI tidak dapat dihubungi: job berubah failed/EXTRACTION_FAILED; health backend tetap HTTP 200.
- **PASS** cleanup: server uji dihentikan, fixture sintetis/storage temp dihapus. Tidak membuat script smoke permanen atau menyentuh foto pengguna.
- **NOT RUN** browser/build frontend, pengujian kualitas foto nyata, PNG per kategori, galeri/download ZIP. Frontend tidak berubah; fitur lanjutan belum tersedia.

## Next action (only one)

**Implementasikan PNG transparan/crop per kategori ATR yang benar-benar terdeteksi, lalu integrasikan file tersebut ke manifest job.** Mulai dari `ai-service/extractor.py`, kontrak respons `main.py`/`ai-client.js`, dan `backend/src/job-manager.js`. Pertahankan foreground manusia dan piksel RGB/alpha asli; jangan inventarisasi objek tanpa file nyata. Uji fixture deterministik, hasil kosong, lalu smoke model asli. Jangan mulai UI/ZIP atau M5.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
