# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — pembuktian runtime PyTorch CPU terisolasi pada Python 3.14.3 & agy update check, 2026-11-16.

## Current milestone

**M3 — POC human parsing — In progress.** M1/M2 selesai. Runtime PyTorch CPU terverifikasi lulus smoke test di environment terpisah (`.venv-test`). Adaptasi arsitektur model SCHP ATR-18 ke CPU, checkpoint, dan pipeline ekstraksi belum diimplementasikan.

## Last completed task

Pembuktian runtime PyTorch CPU pada Python 3.14.3 di environment uji terpisah (`ai-service/.venv-test`):
- Wheel CPU resmi terpasang: `torch==2.15.0+cpu`, `torchvision==0.29.2+cpu`, `numpy==2.5.4`, `pillow==13.0.0` dari index `https://download.pytorch.org/whl/cpu`.
- `.venv` health tetap utuh (`model_loaded: false`, FastAPI + Uvicorn).
- `ai-service/smoke_cpu.py` dieksekusi dan PASS: verifikasi device CPU (`cuda.is_available() == False`), matmul float32, forward Conv2d+BatchNorm2d+ReLU ([1,3,64,64] -> [1,16,64,64]), interoperabilitas PIL/NumPy/Tensor, dan transform torchvision Resize(512,512)/Normalize ATR.
- `agy update` dijalankan dan mengonfirmasi CLI pada versi terbaru 1.5.9.
- Keputusan dicatat di D-015.

## Current task

Adaptasi kode arsitektur model SCHP ATR-18 ke CPU murni: buat definisi model ResNet-101 yang mengganti ketergantungan ekstensi CUDA InPlaceABN dengan normalisasi dan aktivasi yang setara secara statistik pada CPU, serta uji instansiasi model dan forward pass tensor dummy [1, 3, 512, 512] di CPU tanpa error. Jangan mengunduh checkpoint sebelum arsitektur model CPU siap.

## Working components

- Frontend file/kamera → preview → upload server dan validasi backend teruji pada M2.
- `ai-service/main.py` masih `/health` dengan `model_loaded: false` di `.venv` utama.
- `ai-service/.venv-test` memuat runtime PyTorch CPU 2.15.0+cpu teruji lewat `smoke_cpu.py`.
- Tidak ada checkpoint model diunduh; tidak ada mock inferensi AI.
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint diperlukan, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini:
  - `.gitignore` (tambah `.venv*/`)
  - `ai-service/smoke_cpu.py` (script verifikasi smoke runtime CPU)
  - `docs/DECISIONS.md` (D-015)
  - `docs/PROGRESS.md`
  - `docs/HANDOFF.md`

## Uncommitted changes / Git status

Perubahan belum di-commit: `.gitignore`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`, dan file untracked `ai-service/smoke_cpu.py`. Sesuai aturan, tidak melakukan commit otomatis.

## Current errors

- **Kompabilitas SCHP Upstream:** Kode SCHP upstream (`modules/functions.py`) mengompilasi ekstensi `.cu` (CUDA) saat import InPlaceABN, dan `simple_extractor.py` memanggil `.cuda()` secara eksplisit. Tugas berikutnya adalah menyediakan arsitektur CPU murni yang mengganti modul InPlaceABN tersebut dengan modul kompatibel CPU (misal `BatchNorm2d` + `LeakyReLU(0.01)` atau implementasi pure-PyTorch ABN) dengan statistik dan parameter yang setara saat memuat checkpoint.
- **Lisensi Bobot ATR:** Kode SCHP berlisensi MIT; checkpoint resmi ATR belum memiliki kepastian hak redistribusi/komersial (D-014).

## Tests performed

- **PASS smoke PyTorch CPU:** `ai-service/.venv-test/Scripts/python.exe ai-service/smoke_cpu.py` → CPython 3.14.3 AMD64, torch 2.15.0+cpu, cuda.is_available()=False, matmul float32 CPU, Conv+BN+ReLU forward pass, PIL<->numpy<->tensor, transform Resize(512,512)/Normalize mean/std ATR.
- **PASS agy update:** `agy update` → "✓ You are already on the latest version" (1.5.9).
- **NOT RUN:** unduh checkpoint SCHP ATR (`exp-schp-201908301523-atr.pth`), forward pass arsitektur ResNet-101 lengkap, inferensi human parsing, pipeline masking/PNG transparan, integrasi Express ↔ AI service.

## Next action (only one)

**Adaptasi arsitektur model SCHP ATR-18 ke CPU murni:**
Buat file modul model PyTorch CPU (misal di `ai-service/schp_cpu/`) yang mengadopsi definisi ResNet-101 / InPlaceABN CPU-compatible dari SCHP tanpa ketergantungan ekstensi CUDA (`modules/functions.py`), lalu uji forward pass dengan dummy tensor `torch.randn(1, 3, 512, 512)` di `.venv-test`. Jangan mengunduh checkpoint sebelum arsitektur model dapat diinstansiasi dan dijalankan di CPU.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.
