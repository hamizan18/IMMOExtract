# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — implementasi endpoint FastAPI AI Service (`ai-service/main.py`), 2026-11-16.

## Current milestone

**M3 — POC human parsing — Sisi AI Service Selesai (Integrasi Backend Berikutnya).** M1/M2 selesai. Pipeline ekstraksi human parsing mandiri (`ai-service/extractor.py`) dan endpoint REST FastAPI (`ai-service/main.py`) terverifikasi end-to-end pada CPU (1.82 detik pada AMD Ryzen 5 7430U via live Uvicorn HTTP loopback), menghasilkan mask alpha foreground manusia utuh dan PNG transparan RGBA dengan preservasi pixel RGB asli serta deteksi kategori pakaian ATR. Integrasi pemanggilan dari backend Express berikutnya.

## Last completed task

Implementasi endpoint FastAPI AI Service (`ai-service/main.py`):
- Handler `lifespan` FastAPI memuat `HumanExtractor` saat server startup dan mengaktifkan `model_loaded: true` (dengan fallback graceful jika checkpoint tidak ditemukan).
- Endpoint `GET /health` mengembalikan `status: "ok"`, `service: "ai-service"`, dan `model_loaded: true`.
- Endpoint `POST /extract` menerima multipart image upload (`UploadFile`), mendukung opsi penyimpanan disk (`output_path`, `save_mask_path`), dan mengembalikan metadata kategori ATR, ukuran asli, waktu eksekusi CPU, serta base64 RGBA PNG transparan dan binary mask.
- Endpoint `POST /extract-path` menerima JSON payload (`image_path`, `output_path`, `save_mask_path`) untuk efisiensi komunikasi co-located antar-proses lokal.
- Script pengujian `ai-service/test_api.py` (5/5 PASS dalam 9.01 detik):
  1. `test_01_health_endpoint`: verifikasi `model_loaded` bernilai `True`.
  2. `test_02_extract_multipart_valid`: upload multipart gambar sintetis, inferensi 1.87s, verifikasi PNG RGBA base64 4-channel dengan transparansi alpha valid (0 dan 255).
  3. `test_03_extract_multipart_corrupt_file`: file rusak ditolak dengan HTTP 400 Bad Request.
  4. `test_04_extract_path_valid`: pemrosesan file path lokal menulis RGBA PNG dan mask ke disk dengan ukuran dan channel valid.
  5. `test_05_extract_path_not_found`: path tidak ada mengembalikan HTTP 404.
- Script live HTTP smoke test `ai-service/smoke_api_live.py` (PASS): Uvicorn server subprocess pada loopback `127.0.0.1:8005` merespons `GET /health` (`model_loaded: true`) dan `POST /extract` dalam 1.82 detik.
- Regression testing: `npm test --prefix backend` (24/24 PASS) dan `npm run build --prefix frontend` (PASS).
- Keputusan dicatat di D-019.

## Current task

Integrasikan pemanggilan AI Service dari backend Express:
1. Selaraskan pengecekan health check di `backend/src/app.js` agar menerima `model_loaded: true` (atau fleksibel `boolean`) dari AI service tanpa melempar error `unexpected M1 response`.
2. Siapkan endpoint/service pemrosesan job ekstraksi (`POST /api/jobs` atau trigger ekstraksi lokal) yang memanggil FastAPI `POST /extract` atau `POST /extract-path` dan mengelola metadata hasil ekstraksi.

## Working components

- Frontend file/kamera → preview → upload server dan validasi backend teruji pada M2.
- `ai-service/extractor.py` memuat pipeline inferensi dan ekstraksi PNG transparan RGBA mandiri berbasis PyTorch CPU + Pillow + NumPy.
- `ai-service/main.py` melayani `GET /health`, `POST /extract`, dan `POST /extract-path` pada loopback HTTP.
- Checkpoint resmi bobot ATR-18 tersimpan di `ai-service/models/` (diabaikan Git).
- Model CPU dengan bobot resmi terbukti mengeksekusi ekstraksi dalam ~1.82 detik.
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint diperlukan, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini:
  - `ai-service/main.py` (endpoint REST FastAPI: health, extract multipart, extract path)
  - `ai-service/requirements.txt` (catatan paket python-multipart, httpx)
  - `ai-service/test_api.py` (test suite unit & integration FastAPI TestClient)
  - `ai-service/smoke_api_live.py` (live Uvicorn loopback smoke test)
  - `docs/DECISIONS.md` (D-019)
  - `docs/PROGRESS.md`
  - `docs/HANDOFF.md`

## Uncommitted changes / Git status

Perubahan belum di-commit:
- `modified: ai-service/main.py`
- `modified: ai-service/requirements.txt`
- `modified: docs/DECISIONS.md`
- `modified: docs/PROGRESS.md`
- `modified: docs/HANDOFF.md`
- `untracked: ai-service/test_api.py`
- `untracked: ai-service/smoke_api_live.py`
Sesuai aturan, tidak melakukan commit otomatis.

## Current errors

- **Lisensi Bobot ATR:** Kode SCHP berlisensi MIT; checkpoint resmi ATR belum memiliki kepastian hak redistribusi komersial. Checkpoint disimpan lokal di folder yang di-ignore Git (`ai-service/models/`), bukan di-commit ke repository (D-014).
- Tidak ada error teknis yang menghambat eksekusi CPU, pipeline ekstraksi, atau endpoint FastAPI.

## Tests performed

- **PASS test_api.py:** `ai-service/.venv-test/Scripts/python.exe ai-service/test_api.py` → 5/5 unit & integration tests PASS dalam 9.01 detik.
- **PASS smoke_api_live.py:** `ai-service/.venv-test/Scripts/python.exe ai-service/smoke_api_live.py` → live Uvicorn HTTP server loopback 127.0.0.1:8005, GET /health model_loaded: true, POST /extract live HTTP request PASS dalam 1.82s.
- **PASS test_extractor.py:** `ai-service/.venv-test/Scripts/python.exe ai-service/test_extractor.py` → letterbox 3 rasio aspek, ekstraksi CPU 1.901s, deteksi kategori pakaian ATR, transparansi alpha 0/255, save & reload PNG RGBA PASS.
- **PASS backend suite:** `npm test --prefix backend` → 24/24 unit/integration tests PASS.
- **PASS frontend build:** `npm run build --prefix frontend` → Vite build PASS.
- **NOT RUN:** integrasi pemanggilan AI service dari Express backend (`/api/jobs` atau modul ekstraksi job M4).

## Next action (only one)

**Integrasikan pemanggilan AI Service dari backend Express:**
Perbarui `backend/src/app.js` untuk menerima `model_loaded: true` pada route `/api/health/ai` tanpa melempar exception `unexpected M1 response`, dan buat/integrasikan endpoint atau client service pemrosesan ekstraksi di Express yang meneruskan gambar upload ke endpoint FastAPI `POST /extract` atau `POST /extract-path`. Jalankan `npm test --prefix backend` untuk memastikan tidak ada regresi.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
