# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — unduh dan verifikasi checkpoint resmi SCHP ATR-18 pada CPU, 2026-11-16.

## Current milestone

**M3 — POC human parsing — In progress.** M1/M2 selesai. Model ResNet-101 CPU (`ai-service/schp_cpu`) dan checkpoint resmi `exp-schp-201908301523-atr.pth` (255.06 MB, 603 keys) terverifikasi 100% cocok dan forward pass CPU berjalan lancar (1.86 detik pada AMD Ryzen 5 7430U). Pipeline ekstraksi gambar ke PNG transparan berikutnya.

## Last completed task

Unduh dan verifikasi checkpoint resmi SCHP ATR-18 pada model CPU:
- File checkpoint resmi `exp-schp-201908301523-atr.pth` (267.445.237 bytes / 255.06 MB) diunduh ke `ai-service/models/` (diabaikan Git) via `ai-service/download_model.py` setelah izin eksplisit pengguna.
- Script `ai-service/load_checkpoint_cpu.py` membuktikan:
  - Checksum SHA-256 valid: `e9d7c91ce3b4e7133df56b599fc817b533e3439c5e8d282a59126d2fda339a2a`.
  - 603/603 keys state dict cocok sempurna secara strictly valid (`<All keys matched successfully>`, 0 missing, 0 unexpected).
  - Forward pass CPU dengan bobot terlatih asli dieksekusi dalam 1.857 detik dengan rentang logits valid [-2.12, 8.87].
- Regression testing: `npm test --prefix backend` (24/24 PASS) dan `npm run build --prefix frontend` (PASS).
- Keputusan dicatat di D-017.

## Current task

Implementasi pipeline ekstraksi gambar ke PNG transparan (`ai-service/extractor.py`): menerima path file gambar input (JPG/PNG/WebP), melakukan preprocessing resize/pad/normalize 512×512, forward pass model ResNet-101 dengan bobot terlatih asli, menghasilkan binary mask alpha foreground manusia utuh dan multi-label segmentasi, serta mengekspor objek PNG transparan (RGBA) yang dapat diunduh. Uji dengan fixture sintetis.

## Working components

- Frontend file/kamera → preview → upload server dan validasi backend teruji pada M2.
- `ai-service/main.py` masih `/health` dengan `model_loaded: false` di `.venv` utama.
- `ai-service/.venv-test` memuat runtime PyTorch CPU 2.15.0+cpu, arsitektur model mandiri `schp_cpu`, dan checkpoint resmi terverifikasi di `ai-service/models/exp-schp-201908301523-atr.pth`.
- Model CPU dengan bobot resmi terbukti mengeksekusi inferensi dalam 1.857 detik.
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint diperlukan, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini:
  - `ai-service/download_model.py` (script download streaming dengan progress)
  - `ai-service/load_checkpoint_cpu.py` (script verifikasi SHA-256 dan pemuatan state dict CPU)
  - `docs/DECISIONS.md` (D-017)
  - `docs/PROGRESS.md`
  - `docs/HANDOFF.md`

## Uncommitted changes / Git status

Perubahan belum di-commit: script baru di `ai-service/` (`download_model.py`, `load_checkpoint_cpu.py`), dokumen diperbarui (`docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`). Catatan: file bobot `ai-service/models/` otomatis diabaikan Git oleh `.gitignore`. Sesuai aturan, tidak melakukan commit otomatis.

## Current errors

- **Lisensi Bobot ATR:** Kode SCHP berlisensi MIT; checkpoint resmi ATR belum memiliki kepastian hak redistribusi komersial. Checkpoint disimpan lokal di folder yang di-ignore Git (`ai-service/models/`), bukan di-commit ke repository (D-014).
- Tidak ada error teknis yang menghambat eksekusi CPU atau pemuatan bobot.

## Tests performed

- **PASS download_model.py:** Download 267.445.237 bytes (255.06 MB) dari Hugging Face selesai tanpa error.
- **PASS load_checkpoint_cpu.py:** SHA-256 match, 603/603 keys match strictly (0 missing, 0 unexpected), forward pass CPU 1.857s dengan logits valid.
- **PASS backend suite:** `npm test --prefix backend` → 24/24 unit/integration tests PASS.
- **PASS frontend build:** `npm run build --prefix frontend` → Vite build PASS.
- **NOT RUN:** pipeline ekstraksi foto input nyata ke file PNG transparan (RGBA), endpoint integrasi FastAPI ↔ Express.

## Next action (only one)

**Implementasi pipeline ekstraksi gambar ke PNG transparan (`ai-service/extractor.py`):**
Buat modul ekstraksi mandiri yang memuat model SCHP ATR-18 terverifikasi, memproses gambar input (baca image dengan Pillow/NumPy, resize/letterbox 512×512, normalisasi mean/std ATR), menjalankan inferensi CPU, menghasilkan mask alpha foreground (semua kelas ATR foreground > 0), dan mengekstrak objek manusia ke format RGBA PNG transparan. Uji pipeline secara end-to-end dengan fixture gambar sintetis dan verifikasi kanal alpha (transparan di background, opaque di objek).

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

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
