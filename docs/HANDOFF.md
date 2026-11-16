# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — adaptasi arsitektur SCHP ATR-18 ke CPU murni & verifikasi forward pass, 2026-11-16.

## Current milestone

**M3 — POC human parsing — In progress.** M1/M2 selesai. Arsitektur model ResNet-101 AugmentCE2P CPU (`ai-service/schp_cpu`) terverifikasi lulus pengujian forward pass (1.98 detik pada AMD Ryzen 5 7430U, ~255 MB RAM). Checkpoint model belum diunduh.

## Last completed task

Adaptasi arsitektur model SCHP ATR-18 ke CPU murni (pure PyTorch):
- Dibuat modul `ai-service/schp_cpu/abn.py` yang mengimplementasikan `ABN` berbasis `F.batch_norm` dan `F.leaky_relu(slope=0.01)`, mempertahankan kompatibilitas 100% parameter `weight`, `bias`, `running_mean`, `running_var` tanpa memerlukan ekstensi CUDA C++ atau Ninja compiler.
- Dibuat modul `ai-service/schp_cpu/model.py` dan `__init__.py` yang mengadopsi ResNet-101 AugmentCE2P (CE2P parsing branch, Edge module, PSPModule, dan Fusion branch) untuk label 18 kelas ATR.
- Dibuat dan dijalankan `ai-service/test_schp_cpu.py` di `.venv-test`:
  - 66.722.900 parameter terinstansiasi (~254.53 MB RAM).
  - 603 state_dict keys terverifikasi dengan 119 buffer running_mean/running_var ABN.
  - Forward pass CPU pada tensor `[1, 3, 512, 512]` selesai dalam 1.977 detik tanpa error atau NaN/Inf.
  - Pipeline upsample bilinear ke 512×512 dan argmax ke map kelas 0..17 terverifikasi PASS.
- Regression testing: `npm test --prefix backend` (24/24 PASS) dan `npm run build --prefix frontend` (PASS).
- Keputusan dicatat di D-016.

## Current task

Unduh checkpoint resmi SCHP ATR-18 (`exp-schp-201908301523-atr.pth`), simpan di direktori yang diabaikan git (`ai-service/models/`), verifikasi integritas file/hash, dan uji pemuatan bobot (`model.load_state_dict`) secara aman ke model CPU.

## Working components

- Frontend file/kamera → preview → upload server dan validasi backend teruji pada M2.
- `ai-service/main.py` masih `/health` dengan `model_loaded: false` di `.venv` utama.
- `ai-service/.venv-test` memuat runtime PyTorch CPU 2.15.0+cpu dan paket model mandiri `schp_cpu`.
- Arsitektur model SCHP ATR-18 CPU terbukti dapat diinstansiasi dan dieksekusi via forward pass di CPU dalam ~1.98 detik.
- Checkpoint resmi bobot belum diunduh; tidak ada mock inferensi AI palsu.
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint diperlukan, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini:
  - `ai-service/schp_cpu/__init__.py` (ekspor paket model SCHP CPU)
  - `ai-service/schp_cpu/abn.py` (implementasi pure-PyTorch ABN CPU)
  - `ai-service/schp_cpu/model.py` (definisi ResNet-101 AugmentCE2P ATR-18 CPU)
  - `ai-service/test_schp_cpu.py` (test suite verifikasi model & forward pass CPU)
  - `docs/DECISIONS.md` (D-016)
  - `docs/PROGRESS.md`
  - `docs/HANDOFF.md`

## Uncommitted changes / Git status

Perubahan belum di-commit: file baru di `ai-service/schp_cpu/`, `ai-service/test_schp_cpu.py`, serta dokumen yang diperbarui (`docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`). Sesuai aturan, tidak melakukan commit otomatis.

## Current errors

- **Lisensi Bobot ATR:** Kode SCHP berlisensi MIT; checkpoint resmi ATR belum memiliki kepastian hak redistribusi komersial. Checkpoint hanya disimpan lokal di folder yang di-ignore Git (`ai-service/models/`), bukan di-commit (D-014).
- Tidak ada error teknis yang menghambat eksekusi CPU.

## Tests performed

- **PASS test_schp_cpu.py:** `ai-service/.venv-test/Scripts/python.exe ai-service/test_schp_cpu.py` → 66.7M parameter, 603 keys, forward pass CPU 1.977s pada `[1, 3, 512, 512]`, upsample/argmax 18 kelas PASS.
- **PASS backend suite:** `npm test --prefix backend` → 24/24 unit/integration tests PASS.
- **PASS frontend build:** `npm run build --prefix frontend` → Vite 6 modules transformed, dist generated.
- **NOT RUN:** unduh checkpoint SCHP ATR (`exp-schp-201908301523-atr.pth`), forward pass dengan bobot terlatih asli, masking PNG transparan, integrasi Express ↔ FastAPI.

## Next action (only one)

**Unduh checkpoint resmi SCHP ATR-18 dan uji pemuatan bobot (load state_dict):**
Buat folder `ai-service/models/` (sudah diabaikan Git), unduh file checkpoint resmi `exp-schp-201908301523-atr.pth`, catat ukuran dan sha256 checksum-nya, lalu tulis script verifikasi pemuatan bobot (`torch.load` dengan `map_location='cpu'` dan `weights_only=True` jika didukung) ke dalam `model = resnet101(num_classes=18)` untuk memastikan kecocokan semua 603 keys tanpa missing/unexpected keys.

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
