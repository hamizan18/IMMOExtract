# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — Verifikasi live browser end-to-end Classic Pixelation, 2026-11-19. Tidak mengubah source aplikasi.

## Current milestone

**M5 — Classic Pixelation Studio — In progress.**
M1–M4 memiliki bukti lokal sebelumnya. Helper, API snapshot dan UI Classic Pixelation empat ukuran kini juga terbukti melalui browser; palet warna terbatas belum tersedia.

## Last completed task

- Memilih alternatif next action sebelumnya: smoke browser ekstraksi → pixelation 16–128 px → unduh PNG, bukan implementasi palet.
- Chromium → Vite dev 5177 → Express 3123 dengan storage temp → FastAPI/model asli 8023. Fixture sintetis 200×300, bukan foto pribadi, menghasilkan human, Upper-clothes dan Pants.
- UI Upper-clothes (104×85) menghasilkan 16×13, 32×26, 64×52 dan 128×105. Preview terdecode dan keempat PNG diunduh melalui link native.
- Python/Pillow memverifikasi semua 17.808 piksel RGBA terhadap sampling pusat integer D-027, dimensi dan alpha 0/255. Byte preview sama dengan unduhan; header no-store/private dan nosniff terverifikasi.
- PNG asli dan ZIP tiga objek yang dibuat sebelum pixelation tetap byte-identical sesudahnya; inventaris ZIP, CRC dan byte setiap PNG sesuai manifest.
- Screenshot desktop 1365×1000/mobile 390×844 tanpa overflow horizontal; tidak ada page error. Dropdown ukuran tidak memiliki nama pada accessibility tree.
- Tab, ketiga layanan uji, enam unduhan dan seluruh fixture/uploads/jobs temp sudah dibersihkan.

## Current task

Smoke browser happy-path selesai. M5 belum selesai; berikutnya palet warna terbatas FR-10.

## Working components

- Helper nearest-neighbour RGBA, API snapshot privat, preview/unduhan pixelation, UI pemilih empat ukuran.
- Upload/ekstraksi model asli, unduhan PNG asli serta ZIP tetap bekerja pada smoke ini.
- Bukti build dan 89/89 backend tests dari sesi 2026-11-18 dipertahankan sebagai hasil historis, tidak diklaim dijalankan ulang.

## Modified files

- `docs/PROGRESS.md` — bukti smoke aktual, batas verifikasi, temuan aksesibilitas dan next task.
- `docs/HANDOFF.md` — status sesi ini.
- Source, dependensi, model dan keputusan teknis tidak berubah; tidak perlu keputusan arsitektur baru.

## Uncommitted changes / Git status

Inspeksi awal working tree dan index bersih; catatan tujuh file pending dari sesi sebelumnya sudah kedaluwarsa. Dua dokumen di atas diubah pada sesi ini dan tidak di-commit. Tidak melakukan staging/commit otomatis.

## Current errors / limitations

- Palet warna / color quantization FR-10 belum tersedia; M5 tetap in progress.
- Dropdown ukuran memiliki label visual “Ukuran:” tetapi label belum terhubung ke select, sehingga nama aksesibelnya kosong.
- Lifecycle/error UI pixelation (abort, respons usang, network failure, preview gagal) tidak diuji pada smoke ini.
- Nearest-neighbour dapat menghilangkan detail tipis; retensi otomatis storage belum tersedia.
- Fixture sintetis dan viewport mobile bukan bukti kualitas foto nyata atau perangkat mobile fisik.

## Tests performed

- **PASS** Browser Chromium melalui layanan lokal nyata: upload → ekstraksi tiga objek → pixelation empat ukuran → preview → empat unduhan PNG.
- **PASS** `ai-service/.venv-test/Scripts/python.exe -` (stdin Pillow/zipfile/urllib): dimensi, seluruh channel setiap piksel, alpha, kesamaan preview/download, header privat, original/ZIP tidak berubah dan CRC.
- **PASS terbatas** Screenshot desktop/mobile tanpa overflow dan tanpa page error; temuan nama aksesibel dropdown tetap terbuka.
- **PASS** Cleanup layanan/tab/storage temp dan enam file unduhan milik smoke.
- **NOT RUN** Build, suite backend/Python AI, lifecycle/error pixelation, kamera/mobile fisik, kualitas foto nyata, palet warna dan M6. Source tidak diubah; tidak mengulang suite historis.

## Next action (only one)

**Rancang dan implementasikan palet warna terbatas opsional pada helper/API/UI Classic Pixelation (FR-10), dengan alpha dan RGB transparan tetap terjaga.** Gunakan kontrak dan pola snapshot yang sudah ada; verifikasi hasil serta original yang tidak berubah.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
