# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — implementasi pipeline ekstraksi gambar ke PNG transparan (`extractor.py`), 2026-11-16.

## Current milestone

**M3 — POC human parsing — In progress.** M1/M2 selesai. Pipeline ekstraksi human parsing mandiri (`ai-service/extractor.py`) terverifikasi end-to-end pada CPU (1.90 detik pada AMD Ryzen 5 7430U), menghasilkan mask alpha foreground manusia utuh dan PNG transparan RGBA dengan preservasi pixel RGB asli tanpa ketergantungan OpenCV. Integrasi endpoint AI service berikutnya.

## Last completed task

Implementasi pipeline ekstraksi gambar ke PNG transparan (`ai-service/extractor.py`):
- Kelas `HumanExtractor` dan dataclass `ExtractionResult` mengadopsi model ResNet-101 CPU dengan bobot terlatih resmi ATR-18.
- Preprocessing letterbox aspect-preserving ke 512×512, konversi RGB→BGR, normalisasi ATR.
- Inferensi forward pass CPU (1.901 detik), un-padding cropping area valid, dan interpolasi kembali ke dimensi asli `(W_orig, H_orig)`.
- Pembuatan binary mask alpha foreground (`class > 0`) dan ekspor gambar RGBA dengan latar belakang sepenuhnya transparan (`alpha=0` pada background, `alpha=255` pada foreground manusia/pakaian, pixel RGB asli utuh).
- Script pengujian `ai-service/test_extractor.py` lulus 100%:
  - Verifikasi letterbox pada 3 aspect ratio (persegi, potret, lanskap).
  - Ekstraksi gambar sintetis manusia: terdeteksi kategori pakaian ATR (`Hat`, `Upper-clothes`, `Pants`, `Left-shoe`, `Bag`).
  - Verifikasi transparansi alpha: background alpha=0, foreground alpha=255, RGB match.
  - Export & reload PNG RGBA dan mask PNG valid.
- Regression testing: `npm test --prefix backend` (24/24 PASS) dan `npm run build --prefix frontend` (PASS).
- Keputusan dicatat di D-018.

## Current task

Integrasikan pipeline ekstraksi ke FastAPI AI service (`ai-service/main.py`): inisialisasi `HumanExtractor` saat startup AI service (`model_loaded: true`), buat endpoint `POST /extract` yang menerima request ekstraksi gambar (path file lokal atau multipart) dan mengembalikan mask serta objek transparan PNG, lalu uji endpoint secara langsung via HTTP request loopback.

## Working components

- Frontend file/kamera → preview → upload server dan validasi backend teruji pada M2.
- `ai-service/extractor.py` memuat pipeline inferensi dan ekstraksi PNG transparan RGBA mandiri berbasis PyTorch CPU + Pillow + NumPy.
- Checkpoint resmi bobot ATR-18 tersimpan di `ai-service/models/` (diabaikan Git).
- Model CPU dengan bobot resmi terbukti mengeksekusi ekstraksi dalam ~1.90 detik.
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint diperlukan, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini:
  - `ai-service/extractor.py` (pipeline ekstraksi gambar ke PNG transparan)
  - `ai-service/test_extractor.py` (test suite verifikasi pipeline ekstraksi)
  - `docs/DECISIONS.md` (D-018)
  - `docs/PROGRESS.md`
  - `docs/HANDOFF.md`

## Uncommitted changes / Git status

Perubahan belum di-commit: `ai-service/extractor.py`, `ai-service/test_extractor.py`, dan dokumen yang diperbarui (`docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`). Sesuai aturan, tidak melakukan commit otomatis.

## Current errors

- **Lisensi Bobot ATR:** Kode SCHP berlisensi MIT; checkpoint resmi ATR belum memiliki kepastian hak redistribusi komersial. Checkpoint disimpan lokal di folder yang di-ignore Git (`ai-service/models/`), bukan di-commit ke repository (D-014).
- Tidak ada error teknis yang menghambat eksekusi CPU atau pipeline ekstraksi.

## Tests performed

- **PASS test_extractor.py:** `ai-service/.venv-test/Scripts/python.exe ai-service/test_extractor.py` → letterbox 3 rasio aspek, ekstraksi CPU 1.901s, deteksi kategori pakaian ATR, transparansi alpha 0/255, save & reload PNG RGBA PASS.
- **PASS backend suite:** `npm test --prefix backend` → 24/24 unit/integration tests PASS.
- **PASS frontend build:** `npm run build --prefix frontend` → Vite build PASS.
- **NOT RUN:** endpoint integrasi FastAPI `POST /extract`, orchestrator Express job M4.

## Next action (only one)

**Integrasikan pipeline ekstraksi ke FastAPI AI service (`ai-service/main.py`):**
Impor `HumanExtractor` di `ai-service/main.py`, inisialisasi extractor saat startup aplikasi FastAPI sehingga `GET /health` mengembalikan `model_loaded: true`, tambahkan endpoint `POST /extract` yang menerima request ekstraksi gambar (menerima upload multipart atau JSON payload berisi path file upload yang sudah divalidasi server) dan menghasilkan file PNG transparan (RGBA) serta metadata kelas yang terdeteksi. Uji endpoint secara langsung menggunakan script tes HTTP loopback.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.
