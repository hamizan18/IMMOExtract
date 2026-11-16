# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — implementasi integrasi Express backend dengan FastAPI AI Service dan asset serving PNG transparan/mask, 2026-11-16.

## Current milestone

**M4 — Job, object gallery, download individual/ZIP — Ready to start.** M1, M2, dan M3 selesai 100%. Pipeline human parsing SCHP ATR-18 CPU lokal, endpoint FastAPI, dan integrasi Express backend (`POST /api/uploads/:uploadId/extract`, `GET /api/uploads/:uploadId/extracted`, `GET /api/uploads/:uploadId/mask`) terverifikasi end-to-end secara live.

## Last completed task

Integrasi Express backend dengan FastAPI AI Service dan asset serving PNG transparan:
- `backend/src/ai-client.js`: HTTP client untuk FastAPI AI Service (`health`, `extractPath`, `extractMultipart`) dengan timeout dan validasi respons.
- `backend/src/app.js`: Diperbarui agar health check `/api/health/ai` menerima status dinamis `model_loaded: true/false`, serta me-mount router ekstraksi.
- `backend/src/extractions.js`: Express router untuk pemrosesan ekstraksi:
  - `POST /api/uploads/:uploadId/extract`: Validasi UUID upload, pemicuan ekstraksi model SCHP ATR-18 pada AI service, penyimpanan aman `extracted.png` dan `mask.png` di folder upload, serta update `manifest.json`.
  - `GET /api/uploads/:uploadId/extracted`: Melayani file PNG transparan (RGBA 4 channel) dengan header proteksi cache dan tipe konten yang tepat.
  - `GET /api/uploads/:uploadId/mask`: Melayani file mask PNG.
- `frontend/src/main.js`: Diperbarui agar menampilkan indikator model AI aktif (`SCHP ATR-18`) saat `model_loaded: true`.
- `scripts/smoke.mjs`: Diperbarui agar fleksibel terhadap status boolean `model_loaded`.
- `backend/test/extractions.test.js`: Test suite unit/integrasi Express (27/27 PASS).
- `scripts/smoke_integration_e2e.mjs`: Pengujian live end-to-end loopback Express (3005) <-> FastAPI (8005) (PASS: upload -> AI extract 2.097s -> serving RGBA PNG 4 channels terverifikasi).
- Keputusan dicatat di D-020. Seluruh kriteria M3 terpenuhi.

## Current task

Mulai Milestone M4: Rancang dan implementasikan antrean/orchestrator job ekstraksi asynchronous M4:
1. Endpoint `POST /api/jobs`: menerima upload gambar baru atau referensi `upload_id` yang sudah ada, mendaftarkan status job (`queued`/`processing`/`completed`/`failed`), dan memproses ekstraksi secara non-blocking / asynchronous.
2. Endpoint `GET /api/jobs/:id`: polling status job dan progress.
3. Manifest galeri objek: inventarisasi objek hasil ekstraksi per-kategori ATR (`Hat`, `Upper-clothes`, `Pants`, `Shoes`, dll.).
4. Endpoint unduhan satu file PNG (`GET /api/jobs/:id/objects/:objectId/download`) dan unduhan ZIP (`POST /api/jobs/:id/exports`).

## Working components

- Frontend file/kamera → preview → upload server dan validasi backend teruji pada M2.
- `ai-service/extractor.py` memuat pipeline inferensi dan ekstraksi PNG transparan RGBA mandiri berbasis PyTorch CPU + Pillow + NumPy.
- `ai-service/main.py` melayani `GET /health`, `POST /extract`, dan `POST /extract-path` pada loopback HTTP (1.82s/ekstraksi pada Ryzen 5 7430U).
- `backend/src/ai-client.js` dan `backend/src/extractions.js` menghubungkan Express backend ke AI Service untuk memicu ekstraksi dan melayani PNG transparan/mask.
- Checkpoint resmi bobot ATR-18 tersimpan di `ai-service/models/` (diabaikan Git).
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint diperlukan, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini:
  - `backend/src/ai-client.js` (HTTP client untuk FastAPI AI Service)
  - `backend/src/extractions.js` (Express router untuk ekstraksi & serving hasil)
  - `backend/src/app.js` (update health check & mount extraction router)
  - `backend/test/extractions.test.js` (test suite unit & integration backend ekstraksi)
  - `scripts/smoke_integration_e2e.mjs` (live end-to-end integration test Express <-> FastAPI)
  - `frontend/src/main.js` (update indikator model aktif)
  - `scripts/smoke.mjs` (update health check assertions)
  - `docs/DECISIONS.md` (D-020)
  - `docs/PROGRESS.md`
  - `docs/HANDOFF.md`

## Uncommitted changes / Git status

Perubahan belum di-commit:
- `modified: backend/src/app.js`
- `modified: frontend/src/main.js`
- `modified: scripts/smoke.mjs`
- `modified: docs/DECISIONS.md`
- `modified: docs/PROGRESS.md`
- `modified: docs/HANDOFF.md`
- `untracked: backend/src/ai-client.js`
- `untracked: backend/src/extractions.js`
- `untracked: backend/test/extractions.test.js`
- `untracked: scripts/smoke_integration_e2e.mjs`
- `untracked: ai-service/test_api.py`
- `untracked: ai-service/smoke_api_live.py`
Sesuai aturan, tidak melakukan commit otomatis.

## Current errors

- **Lisensi Bobot ATR:** Kode SCHP berlisensi MIT; checkpoint resmi ATR belum memiliki kepastian hak redistribusi komersial. Checkpoint disimpan lokal di folder yang di-ignore Git (`ai-service/models/`), bukan di-commit ke repository (D-014).
- Tidak ada error teknis yang menghambat pipeline ekstraksi, AI service, atau integrasi backend Express.

## Tests performed

- **PASS backend test suite:** `npm test --prefix backend` → 27/27 unit/integration tests PASS (termasuk health check boolean, ekstraksi valid, serving asset PNG/mask, dan penanganan error 400/404/503).
- **PASS live E2E smoke test:** `node scripts/smoke_integration_e2e.mjs` → live FastAPI + live Express loopback integration PASS (upload -> AI extraction CPU 2.097s -> serving RGBA PNG 4 channels terverifikasi).
- **PASS test_api.py:** `ai-service/.venv-test/Scripts/python.exe ai-service/test_api.py` → 5/5 unit & integration tests FastAPI lulus dalam 9.8s.
- **PASS frontend build:** `npm run build --prefix frontend` → Vite build PASS (6 modul).

## Next action (only one)

**Rancang dan implementasikan job orchestrator M4 (`/api/jobs`):**
Buat model dan modul job manager di backend Express untuk mengelola siklus hidup job ekstraksi secara asynchronous (`queued`, `processing`, `completed`, `failed`), menyediakan endpoint `POST /api/jobs` dan polling status `GET /api/jobs/:id`, serta menyiapkan struktur manifest galeri objek individual yang diekstrak.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
