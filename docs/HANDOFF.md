# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — pemulihan perubahan terhenti dan penyelesaian endpoint FastAPI stylization internal (D-040), 2026-11-21. Tidak membuat commit.

## Current milestone

**M6 — In progress.** Helper dan API FastAPI teruji; integrasi Express/UI generatif dan koreksi mask belum tersedia. Bukti M1–M5 terdahulu dipertahankan.

## Last completed task

- Draft `/stylize` multipart dan `/stylize-path` JSON pada `ai-service/main.py` dilanjutkan, bukan ditulis ulang dari nol.
- Lazy-loaded SD15 existing, metadata/base64 serta penyimpanan PNG/raw; alpha input dinormalisasi RGBA termasuk transparansi palet.
- Validasi format statis, byte/dimensi, preset dan parameter model. Tolak output alias sumber/hardlink dan output yang bertabrakan; raw output memerlukan output utama.
- Handler stylization threadpool menjaga event loop; lock menolak request stylization paralel dengan 409. Error inferensi/penyimpanan menjadi 500 JSON aman.
- `/health` membedakan `stylizer_available` (konfigurasi ditemukan) dari `stylizer_loaded` (pipeline dimuat). Dependency generatif yang tidak tersedia tidak mematikan ekstraksi.
- Tujuh regresi validasi baru tanpa AI palsu; suite API 14/14 PASS. Kedua route juga menghasilkan PNG melalui SD15 nyata di HTTP loopback.

## Current task

Tugas endpoint FastAPI selesai dan terdokumentasi. Tidak melanjutkan implementasi Express/UI dalam sesi ini.

## Working components

- Ekstraksi SCHP dan API existing: tujuh tes nyata PASS dalam sesi ini.
- Endpoint stylization: multipart 64.629s, JSON path 56.163s; SD15 256 px, nominal 2 dan **aktual 2 langkah per request**, seed 42, strength 0.5, guidance 7.5.
- Hasil RGBA 128×160, alpha exact (termasuk alpha parsial/palet), RGB berubah, original byte-identical, raw RGB 256×256 valid, piksel kedua route sama untuk input/seed sama; safety checker melaporkan false.
- Health tetap 200 selama lazy load (0.377s); request paralel 409. Health loaded berubah false → true.
- PNG/ZIP asli dan Classic Pixelation tidak diubah; suite backend/frontend tidak dijalankan ulang.

## Modified files

- `ai-service/main.py` — melanjutkan perubahan awal, validasi dan concurrency/persistence endpoint.
- `ai-service/test_api.py` — tujuh regresi input/parameter/path/unavailable baru.
- `README.md` — kontrak endpoint dan cara menjalankan service stylization terisolasi.
- `docs/ARCHITECTURE.md` — batas integrasi FastAPI internal.
- `docs/DECISIONS.md` — D-040 beserta hasil tes/resource aktual.
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — status, bukti tes dan next task aktual.

## Uncommitted changes / Git status

- Inspeksi awal `git status --short`, `git diff --stat`, `git diff`, `git diff --cached`: hanya `ai-service/main.py` modified; index kosong. Catatan helper untracked/dokumen pending di handoff sebelumnya sudah kedaluwarsa.
- Tujuh file di atas diubah dalam sesi ini dan tidak di-stage/commit. Daftar berdasarkan inspeksi awal dan operasi edit sesi; tidak menjalankan Git ulang sesudah edit.
- Tidak reset, menghapus perubahan pengguna, download model, install paket atau mengubah helper/checkpoint/environment existing. AGENTS dimuat dari konteks; LSP tidak dikonfigurasi.
- Harness smoke via stdin, service loopback dan direktori temporary fixture/hasil/log dibersihkan setelah selesai. Tidak ada script permanen atau foto pribadi baru.

## Current errors / limitations

- Tidak ada kegagalan pada tes yang dijalankan. Warning deprecation Starlette/httpx existing tetap muncul.
- Awal headroom tidak lolos 3 GiB RAM available/8 GiB sisa commit; pengguna memilih menyiapkan memori dua kali. Gate sebelum startup akhirnya lolos: 3.467.902.976 / 8.969.248.768 byte.
- Minimum selama 1.818 sampel: RAM available 1.010.532.352 byte (~0,94 GiB), sisa commit 1.301.778.432 byte (~1,21 GiB). Guard <512 MiB/<1 GiB tidak terpicu, tetapi margin commit tipis. Jangan menganggap private commit sama dengan RSS atau sampling sebagai hard cap.
- Smoke tidak memuat SCHP bersamaan; `SCHP_CHECKPOINT_PATH` child sengaja menuju file tidak ada. Runtime aplikasi masih dapat memuat SCHP default; jangan menjalankan kedua model bersamaan tanpa evaluasi resource.
- API menerima path **caller lokal tepercaya**, bukan sandbox. Bind 127.0.0.1/satu worker; integrasi Express wajib memilih file berdasarkan manifest, tidak meneruskan path browser.
- API 20 langkah/512, kualitas visual, fault injection disk/inferensi dan SCHP+SD15 bersamaan belum diuji sesi ini. Silhouette exact bukan jaminan alignment/kualitas pixel art. Output generatif belum tersedia di browser.

## Tests / checks performed

- **PASS:** `ai-service/.venv-test/Scripts/python.exe -B -m unittest discover -s ai-service -p test_api.py -v` — 14/14, 18.743s; tujuh ekstraksi existing + tujuh validasi stylization.
- **PASS:** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -u -` — harness stdin memulai Uvicorn loopback port ephemeral, HF/Transformers offline, request HTTP via httpx dan fixture sintetis. Dua inferensi nyata, alpha/original/raw/base64/determinisme, health dan busy 409 terverifikasi; detail D-040.
- **PASS:** Pengawas resource 100 ms tidak menghentikan smoke; harness menghentikan pohon service miliknya, menunggu launcher, membersihkan temporary directory.
- **NOT RUN:** Suite helper/CPU/backend/frontend ulang, build/browser, 512/full-default API, kualitas visual, fault injection disk/inferensi, pipeline dua model bersamaan. Tidak diperlukan untuk mengklaim hasil smoke dua endpoint; M6 keseluruhan belum selesai.

## Next action (only one)

**Integrasikan `/stylize-path` ke antrean backend Express dengan timeout generatif terpisah dan snapshot hasil privat berbasis manifest.** Jangan menerima path filesystem dari browser; pertahankan unduhan original dan Classic Pixelation independen.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
