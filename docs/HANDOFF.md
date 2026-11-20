# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — POC adaptif M6 D-035, 2026-11-20. Load pipeline PASS; inferensi 256 dihentikan guard private memory. Tidak ada hasil stylization, retry otomatis atau probe 512.

## Current milestone

**M6 — AI Stylization lokal dan koreksi mask — In progress; POC inferensi gagal guard.**
M1–M5 mempertahankan bukti verifikasi sebelumnya. AI Stylization dan koreksi mask belum tersedia.

## Last completed task

- Pengguna menyatakan kondisi memori siap; snapshot available 3.63 GiB/sisa commit 9.00 GiB masih gagal gerbang RAM resident D-034. Setelah diberi temuan, pengguna meminta tetap lanjut dengan penyesuaian RAM minimal dan tujuan output dipertahankan.
- D-035: checkpoint/revision/CPU FP32/safety checker tetap; UNet meta + Accelerate dispatch disk → CPU dengan index safetensors langsung, tanpa salinan bobot/download/instalasi. Gate khusus percobaan 3 GiB available/8 GiB sisa commit, watchdog 100 ms dan private child tree 4 GiB.
- Harness stdin awal salah mengenali launcher Python venv Windows sebagai model lain; belum memuat model. Diagnostik ancestry membuktikan parent dengan command line identik. Supervisor diperbaiki untuk mengecualikan launcher miliknya serta mengawasi seluruh pohon child.
- Gate aktual PASS: available 3,779,076,096 byte, sisa commit 9,411,248,128 byte; tanpa proses model lain. Load PASS dalam 82.1594s termasuk import; 686 key/shape/dtype UNet sesuai, 859,520,964 parameter offloaded. Pipeline memuat tokenizer, VAE, text encoder, PNDM dan safety checker.
- Inferensi 256 FAIL guard: private memory >4 GiB sesudah event `infer`, sebelum callback denoising pertama. Child dihentikan, exit 15. Tidak ada hasil generatif; 512 dan retry tidak dilakukan.
- Jumlah peak private counters pohon proses 13,227,094,016 byte (~12.32 GiB); working set 2,370,056,192 byte (~2.21 GiB), bukan peak simultan presisi. Minimum available 1,419,010,048 byte; 803 sampel. Penyebab internal lonjakan belum terbukti; watchdog sampling bukan hard cap.
- CIM sesudah selesai menunjukkan 0 proses probe tersisa. Script supervisor/child sementara dihapus; log dan fixture sintetis privat dipertahankan.

## Current task

POC D-035 selesai dicoba, bukan sukses inferensi atau M6 selesai. Tugas berikutnya diagnosis alokasi private memory dengan reproduksi kecil; jangan mengulang model penuh atau menaikkan guard.

## Working components

- Ekstraksi lokal, PNG/ZIP asli dan Classic Pixelation dua palet/empat ukuran mempertahankan bukti M1–M5 sebelumnya; tidak diuji ulang karena source aplikasi tidak berubah.
- UI existing tetap menyatakan AI Stylization belum tersedia. Tidak membuat hasil AI palsu.

## Modified files

- `docs/DECISIONS.md` — izin/rancangan D-035, gerbang adaptif, API offload, hasil gagal guard dan batas pengukuran.
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — hasil aktual, error, bukti cleanup dan next task.
- `README.md` — status POC terbaru; fitur aplikasi tetap belum tersedia.
- Source aplikasi, requirements, paket, checkpoint dan provenance tidak dimutasi. Dua script uji lokal sementara dibuat lalu dihapus.
- Artefak lokal ignored: `ai-service/.venv-stylization-poc/probe-194a6529b2/` berisi supervisor JSON, `256/child.log`, `256/original.png`, `256/input.png`. Report gate false-positive awal: `probe-3996e6c553/supervisor.json`. Tidak ada `generated.png`/`stylized.png`/result sukses.

## Uncommitted changes / Git status

Git awal working tree/index bersih. Empat dokumen di atas diubah sesi ini; tanpa staging/commit. Artefak POC berada di environment ignored, bukan static storage. Tidak menjalankan Git ulang setelah edit; tidak menimpa perubahan pengguna.

## Current errors / limitations

- **Inferensi gagal guard private memory >4 GiB.** Counter peak ~12.32 GiB menegaskan guard sampling dapat terlambat terhadap lonjakan. Private commitment berbeda dari resident working set; penyebab alokasi internal belum dibuktikan.
- Load pipeline berhasil bukan bukti inferensi/kualitas/alpha. Safety checker termuat dan aktif tetapi forward/output check belum selesai. Tidak ada hasil AI palsu atau output yang dapat dinilai optimal.
- Warning `torch_dtype` deprecated muncul; percobaan berikutnya gunakan `dtype` yang didukung paket lokal. Warning parameter meta sesuai offload, bukan bukti kegagalan load.
- Keputusan `defer` terdahulu telah digantikan izin penyesuaian minimal D-035, bukan izin retry tanpa batas, menaikkan guard, mengganti precision/model atau menonaktifkan safety checker.
- Jangan start `main.py`/SCHP bersamaan, menutup aplikasi pengguna atau mengubah pagefile. Koreksi mask, retensi, foto nyata/LoRA dan lisensi distribusi masih terbuka.

## Tests / checks performed

- **PASS inspeksi awal:** CIM memory/proses/disk, `git status --short; git diff --stat; git diff --cached --stat`. Git bersih; gerbang D-034 gagal RAM, commit lolos.
- **ERROR harness terselesaikan:** gate stdin salah mendeteksi launcher milik supervisor; diagnostik ancestry psutil dan inspeksi command line membuktikan sebab. Tidak memuat model pada percobaan ini.
- **PASS load / FAIL inferensi:** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -u ai-service/.venv-stylization-poc/_probe_supervisor.py`. Gate adaptif dan load lolos; inferensi 256 dihentikan private-memory guard, exit 15. Exit supervisor 0 berarti laporan tersimpan, **bukan** benchmark PASS.
- **PASS cleanup:** CIM `RemainingOwnedProbeProcesses=0`; script uji dihapus. Laporan/fixture lokal dipertahankan untuk diagnosis.
- **NOT RUN:** 512, hasil generatif/alpha/original/output safety check selesai, kualitas visual, LoRA, build/suite aplikasi/browser. Tidak ada perubahan perilaku aplikasi M1–M5.

## Next action (only one)

**Diagnosis lonjakan private memory jalur offload/safetensors Windows memakai reproduksi kecil terawasi dan log D-035.** Jangan mengulang inferensi SD15 penuh atau menaikkan guard sebelum penyebab/penyesuaian dibuktikan. Pertahankan checkpoint/CPU FP32/safety checker; tidak perlu download/setup ulang. LSP tidak dikonfigurasi.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
