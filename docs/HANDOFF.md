# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — Preflight resolver dependensi Diffusers CPU, 2026-11-19. Dokumentasi saja; tanpa instalasi atau perubahan source/environment.

## Current milestone

**M6 — AI Stylization lokal dan koreksi mask — In progress (readiness saja).**
M1–M5 mempertahankan bukti verifikasi sebelumnya. AI Stylization dan koreksi mask belum tersedia.

## Last completed task

- Memeriksa empat dokumen modified dari readiness (README/DECISIONS/PROGRESS/HANDOFF), index kosong; seluruh perubahan sebelumnya dipertahankan.
- Memeriksa requirements dan service AI existing: pipeline SCHP tetap terpisah, tidak menambah endpoint generatif.
- Menjalankan pip 25.3 dry-run binary-only pada CPython 3.14.3/Windows AMD64 dengan constraint torch 2.15.0+cpu, torchvision 0.29.2+cpu, NumPy 2.5.4 dan Pillow 13.0.0.
- Resolver exit 0: 28 paket wheel baru; kandidat langsung Diffusers 0.43.0, Transformers 5.23.0, Accelerate 1.16.0 dan Safetensors 0.8.0. Tidak ada penggantian empat paket terlindungi; rencana pin transitif dicatat di D-032.
- Membandingkan inventaris nama/versi distribusi `.venv` dan `.venv-test` sebelum/sesudah: identik. Metadata wheel saja diunduh, tidak memasang paket atau mengunduh checkpoint.
- Report temporary directory dan constraint sementara dihapus. Tidak membuat script permanen, service atau fixture baru.

## Current task

Preflight resolver selesai. Berikutnya smoke runtime kandidat pin D-032 dalam environment POC terpisah tanpa checkpoint; jangan memasang dependensi generatif ke environment SCHP.

## Working components

- Ekstraksi lokal, PNG/ZIP asli dan Classic Pixelation dua palet/empat ukuran memiliki bukti M1–M5 sebelumnya; tidak diuji ulang pada sesi dokumentasi ini.
- UI existing tetap menyatakan AI Stylization belum tersedia. Tidak membuat hasil AI palsu.

## Modified files

- `docs/DECISIONS.md` — D-032: perintah/bukti resolver, rencana pin langsung/transitif, batas bukti dan gerbang berikutnya.
- `docs/PROGRESS.md` — hasil preflight, verifikasi inventaris environment, NOT RUN dan satu tugas berikutnya.
- `docs/HANDOFF.md` — status handoff ini.
- `README.md` sudah modified dari tugas readiness sebelumnya; tidak diubah lagi pada sesi ini.

## Uncommitted changes / Git status

Pada inspeksi awal, README/DECISIONS/PROGRESS/HANDOFF masih modified dan index kosong. Tiga dokumen docs diperbarui pada sesi ini di atas perubahan tersebut; README sebelumnya dipertahankan. Semuanya belum di-commit oleh sesi ini. Tanpa staging/commit, perubahan source/requirements, instalasi atau download model. Constraint sementara tugas sudah dihapus.

## Current errors / limitations

- Kelayakan inferensi generatif **belum terbukti**: resolver metadata PASS, tetapi import/API Diffusers–Transformers, forward, peak RAM/commit, latensi dan kualitas/alpha **NOT RUN**.
- Resolusi memakai paket existing `.venv-test`, bukan environment kosong atau lock lengkap. Daftar install report mengecualikan paket yang sudah memenuhi syarat. Untuk environment baru, torch harus diperoleh dari index CPU resmi; constraint versi saja tidak menentukan sumber wheel.
- RAM bebas 2.20 GiB pada inventaris D-031 adalah snapshot lama, bukan pengukuran sesi ini. Risiko memori dan alpha/halo tetap terbuka; tidak menjanjikan FP16, ROCm/DirectML atau CPU cepat.
- Tidak ada error resolver pada sesi ini. PEFT/LoRA tidak termasuk preflight baseline; koreksi mask, retensi dan evaluasi foto nyata belum dikerjakan.
- Model/base/LoRA belum boleh dibundle hanya karena kode berlisensi terbuka; lihat kewajiban distribusi D-031.

## Tests / checks performed

- **PASS inspeksi** Git status/diff/index sebelum perubahan; source requirements/service dan dokumentasi terkait.
- **PASS inventaris** `.venv-test/Scripts/python.exe -m pip --version` dan `importlib.metadata`: pip 25.3, CPython 3.14.3, versi constraint tersedia.
- **PASS resolver** `.venv-test/Scripts/python.exe -B -m pip --isolated --disable-pip-version-check install --dry-run --only-binary=:all: --no-cache-dir --index-url https://pypi.org/simple --constraint <temp> --report <temp.json> "diffusers[torch]==0.43.0" transformers accelerate safetensors`: exit 0, 28 wheel, tanpa penggantian torch/torchvision/NumPy/Pillow.
- **PASS pemeriksaan report/inventaris** Harness Python stdin memeriksa URL wheel dan paket terlindungi; inventaris distribusi kedua venv sebelum/sesudah identik. Report/constraint sementara dihapus.
- **NOT RUN** Install/import generatif, forward/benchmark model, kualitas/alpha, build/suite aplikasi/browser. Tidak ada perubahan perilaku aplikasi; bukti M1–M5 sebelumnya tidak diuji ulang.

## Next action (only one)

**Smoke runtime tanpa checkpoint di environment POC terpisah:** gunakan kandidat pin D-032, wheel torch dari index CPU resmi dan environment baru yang tidak memakai site-packages `.venv-test`. Buktikan import pipeline SD15 serta forward komponen kecil berkonfigurasi sintetis, tanpa `from_pretrained`/download bobot. Jangan mengubah `.venv`, `.venv-test` atau requirements aplikasi. Resolusi environment kosong perlu diperiksa saat instalasi; hasil dry-run inkremental bukan lock lengkap. Download checkpoint/benchmark model asli tetap memerlukan izin eksplisit dan pemeriksaan resource D-031.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
