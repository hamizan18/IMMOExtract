# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — pemeriksaan kesiapan M3 (hardware/runtime/lisensi), 2026-11-16.

## Current milestone

**M3 — POC human parsing — In progress, kesiapan saja.** M1/M2 selesai berdasarkan tes sebelumnya. Runtime inferensi, checkpoint dan ekstraksi belum tersedia.

## Last completed task

Inventaris lokal dan inspeksi sumber primer selesai tanpa instalasi/download model. Laptop memakai Ryzen 5 7430U, AMD iGPU, RAM terlihat OS 7,40 GiB (bebas 1,45 GiB saat pemeriksaan), disk D: bebas 27,17 GiB; hanya Python 3.14.3 terdaftar. `.venv` masih berisi runtime health, tanpa torch/torchvision/NumPy/Pillow/OpenCV. SCHP upstream mengunci environment Linux/CUDA lama dan memanggil CUDA secara eksplisit. D-014 menetapkan arah CPU/environment uji terpisah; versi final serta port model belum terbukti.

## Current task

Readiness selesai. Berikutnya hanya membuktikan runtime PyTorch CPU terisolasi tanpa checkpoint; jangan menganggap inventaris/metadata wheel sebagai tes inferensi.

## Working components

- Frontend file/kamera → preview → upload server dan validasi backend sudah teruji pada M2; tidak diuji ulang pada tugas readiness.
- `ai-service/main.py` masih hanya `/health` dengan `model_loaded: false`; requirements hanya FastAPI 0.163.0 dan Uvicorn 0.54.0.
- Tidak ada runtime/model AI baru dipasang; `.venv` health tidak diubah.
- Kandidat tetap SCHP ATR-18: ResNet-101, input 512×512, output label 18 kelas, bukan langsung PNG objek transparan.
- Semua temuan hardware serta pemeriksaan nyata ada di `PROGRESS.md`; sumber primer/kontrak dan batas lisensi ada di `DECISIONS.md` D-014.
- Tidak memulai server/browser, memproses foto, atau membuat artefak uji pada tugas ini.
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint tidak tersedia, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini: `README.md`, `docs/DECISIONS.md` (D-014), `docs/PROGRESS.md`, `docs/HANDOFF.md`.
- Source aplikasi, requirements/lockfile, environment health, dan struktur repo tidak diubah.

## Uncommitted changes / Git status

Inspeksi awal `git status --short`, `git diff --stat`, `git diff`, `git diff --cached` bersih; daftar uncommitted pada handoff sebelumnya sudah kedaluwarsa. Empat dokumen di atas diubah tugas ini tanpa staging/commit. Tidak memeriksa Git ulang setelah edit.

## Current errors

- **Kompatibilitas:** `simple_extractor.py` memakai `model.cuda()`/`image.cuda()`; `modules/functions.py` mengompilasi `.cu` ketika import. Jangan mencoba menyelesaikannya hanya dengan downgrade Python atau mengganti satu `.cuda()`. Adaptasi normalisasi perlu kesetaraan parameter/statistik/aktivasi, bukan BatchNorm pengganti sembarang.
- **Memori:** RAM bebas saat pemeriksaan rendah; kebutuhan/latensi SCHP belum diukur. GPU AMD bukan perangkat CUDA NVIDIA.
- **Lisensi:** Kode SCHP MIT; ATR asli meminta sitasi riset akademik/komersial tetapi tidak mempunyai LICENSE terpisah pada root yang diperiksa. Hak redistribusi checkpoint/dataset belum dikonfirmasi; jangan bundling atau menyimpulkan bobot otomatis MIT. Checkpoint resmi `exp-schp-201908301523-atr.pth` hanya diidentifikasi, belum diunduh/diukur/dihash.
- **Harness:** Query CIM disk awal gagal karena kutip filter hilang (`DeviceID=D:`); diganti `Get-Volume -DriveLetter D`, berhasil. Tidak ada error aplikasi yang disebabkan tugas ini.

## Tests performed

- **PASS inventaris:** CIM `Win32_Processor`, `Win32_OperatingSystem`, `Win32_VideoController` dan pencarian `nvidia-smi`: CPU 6 core/12 thread, Windows 11 Pro x64, AMD Radeon; tidak ada NVIDIA terdeteksi, `nvidia-smi` tidak ditemukan di PATH.
- **ERROR harness, resolved:** filter CIM disk Invalid query; **PASS** `Get-Volume -DriveLetter D` → NTFS, 29.175.590.912 byte bebas.
- **PASS inventaris:** `py --list-paths` → hanya 3.14; `ai-service/.venv/Scripts/python.exe -c` dengan sys/platform/importlib → CPython 3.14.3 AMD64, paket health ada, paket inferensi belum ada.
- **PASS pemeriksaan sumber:** README/LICENSE/environment/extractor/modul SCHP, ATR asli, InPlaceABN, matriks TorchVision, metadata PyPI. Kandidat torch 2.13/torchvision 0.28 mendukung Python 3.14 menurut metadata; wheel torch Windows cp314 ditemukan. Belum membuktikan instalasi, build CPU yang dipilih, atau kompatibilitas SCHP.
- **NOT RUN:** instalasi runtime, download checkpoint, forward/inferensi, mask/PNG transparan, benchmark CPU/RAM, build/suite aplikasi. Tugas hanya readiness; tidak mengulang tes M1/M2 atau membuat hasil AI palsu.

## Next action (only one)

**Buktikan runtime PyTorch CPU pada Python 3.14.3 di environment uji terpisah:** pilih/pin wheel CPU torch/torchvision yang cocok, lakukan import dan operasi tensor kecil. Jangan mengubah `.venv` health, mengunduh checkpoint, atau mengklaim smoke tensor sebagai keberhasilan SCHP. Lihat kandidat dan prasyarat D-014; pin final mengikuti hasil eksekusi, bukan tebakan.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.
