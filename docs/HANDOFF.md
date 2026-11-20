# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity — Diagnosis lonjakan private memory safetensors offload Windows D-036, 2026-11-20. Akar penyebab lonjakan private bytes terbukti secara empiris: view mmap safetensors tanpa copy menduplikasi file mapping 3.28 GiB per parameter aktif di Windows. Mitigasi pemutusan view (`.clone()`) terbukti mempertahankan memori konstan di 580 MB.

## Current milestone

**M6 — AI Stylization lokal dan koreksi mask — In progress; akar penyebab lonjakan memory terbukti (D-036).**
M1–M5 mempertahankan bukti verifikasi sebelumnya. AI Stylization dan koreksi mask belum tersedia.

## Last completed task

- Diagnosis reproduksi terisolasi D-036: pengujian alokasi memori `safetensors.safe_open` pada Windows mengonfirmasi bahwa setiap pembacaan parameter tanpa copy menghasilkan file mapping 3.28 GiB terpisah di virtual memory / commit charge.
- 4 tensor aktif dari `safe_open` tanpa copy mengakumulasi 13.69 GiB private bytes, membuktikan secara eksak penyebab lonjakan ~13.22 GiB pada pohon child D-035 yang memicu guard (>4 GiB).
- Verifikasi mitigasi terisolasi: penambahan `.clone()` pada tensor hasil `safe_open` memutus referensi buffer mmap, memungkinkan OS segera meng-unmap berkas saat context manager keluar. 10 iterasi berulang mempertahankan private memory stabil di 580.20 MB (RSS 214.86 MB).
- Dokumen proyek (`docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`) diperbarui sesuai temuan empiris.

## Current task

Penyebab lonjakan commit charge D-035 selesai didiagnosis dan dibuktikan. Tugas berikutnya adalah merancang dan menguji loader offload adaptif bermitigasi (`.clone()` / cached handle) pada submodul UNet terisolasi.

## Working components

- Ekstraksi lokal, PNG/ZIP asli dan Classic Pixelation dua palet/empat ukuran mempertahankan bukti M1–M5 sebelumnya; tidak diuji ulang karena source aplikasi tidak berubah.
- UI existing tetap menyatakan AI Stylization belum tersedia. Tidak membuat hasil AI palsu.

## Modified files

- `docs/DECISIONS.md` — entri D-036 (diagnosis akar masalah mmap safetensors di Windows dan mitigasi `.clone()`).
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — pembaruan status M6, log verifikasi D-036, dan next single task.
- Source aplikasi, requirements, paket, dan checkpoint tidak dimutasi.

## Uncommitted changes / Git status

Git working tree dan index saat ini memuat modifikasi pada 3 berkas dokumentasi (`docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`). Tanpa staging/commit otomatis sesuai aturan.

## Current errors / limitations

- POC D-035 sebelumnya gagal inferensi karena guard private memory; mitigasi D-036 belum diintegrasikan ke loader pipeline UNet penuh.
- Inferensi penuh 256/512 belum berhasil dieksekusi. Belum ada hasil generatif atau integrasi UI/API M6.
- Keputusan tetap mempertahankan checkpoint/revision lokal, CPU FP32, dan safety checker aktif.

## Tests / checks performed

- **PASS inspeksi awal:** `git status` (clean), `GlobalMemoryStatusEx` (RAM total 7.40 GB, avail 3.24 GB; commit limit 14.81 GB, commit avail 8.84 GB).
- **PASS reproduksi memory leak mmap:** script uji membuktikan peningkatan 3.28 GiB per parameter aktif (1 tensor: 3.83 GB, 2 tensor: 7.12 GB, 3 tensor: 10.40 GB, 4 tensor: 13.69 GB).
- **PASS verifikasi mitigasi `.clone()`:** 10 iterasi berulang dengan pemutusan view mempertahankan private bytes konstan di 580.20 MB dan RSS di 214.86 MB.
- **NOT RUN:** Full pipeline forward pass, probe 512, kualitas visual, LoRA, build/suite aplikasi/browser.

## Next action (only one)

**Rancang dan uji loader offload adaptif bermitigasi (`.clone()` / cached `safe_open` handle) pada submodul UNet terisolasi untuk membuktikan forward pass submodul tanpa multiplikasi commit charge.** Jangan mengulang inferensi SD15 penuh sebelum submodul terbukti hemat memori.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
