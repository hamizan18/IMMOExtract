# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — Smoke runtime Diffusers CPU terisolasi tanpa checkpoint, 2026-11-19. Environment POC lokal terpasang; source/environment aplikasi tidak diubah.

## Current milestone

**M6 — AI Stylization lokal dan koreksi mask — In progress (POC runtime tanpa checkpoint).**
M1–M5 mempertahankan bukti verifikasi sebelumnya. AI Stylization dan koreksi mask belum tersedia.

## Last completed task

- Git awal bersih termasuk index; catatan empat dokumen pending pada handoff lama sudah kedaluwarsa.
- Membuat `ai-service/.venv-stylization-poc` pada Python 3.14.3, tanpa system site-packages. Environment dipertahankan untuk POC berikutnya dan diabaikan Git oleh `.venv*/` existing.
- Memasang torch 2.15.0+cpu/torchvision 0.29.2+cpu dari index CPU resmi, NumPy 2.5.4/Pillow 13.0.0, serta pin generatif D-032: Diffusers 0.43.0, Transformers 5.23.0, Accelerate 1.16.0, Safetensors 0.8.0.
- Instalasi CPU pertama timeout 600s. RECORD torch tidak memiliki file hilang/ukuran berbeda; hanya torchvision yang belum terpasang dilanjutkan. Instalasi generatif kemudian berhasil: 38 wheel tanpa penggantian empat paket CPU, bukan 28 seperti resolver inkremental.
- Smoke offline via stdin PASS: import pipeline SD15 dan forward komponen kecil berbobot acak CLIP → VAE encode → UNet → DDIM → VAE decode. Tidak memakai checkpoint, `from_pretrained`, foto atau menulis hasil AI.
- `pip check` PASS; inventaris distribusi `.venv` (15) dan `.venv-test` (31) identik sebelum/sesudah. `pyvenv.cfg` POC menyatakan `include-system-site-packages = false`.
- Smoke termasuk import 26.633s; peak working set 414,453,760 byte, private akhir 789,704,704 byte. Angka ini bukan benchmark SD15. RAM bebas awal setup hanya 262,060 KiB; available akhir smoke 985,784,320 byte.

## Current task

Smoke runtime tanpa checkpoint selesai (D-033). Berikutnya rencana POC checkpoint SD15 asli dan izin download; jangan mengaktifkan stylization atau memasang generator ke runtime SCHP berdasarkan smoke kecil ini.

## Working components

- Ekstraksi lokal, PNG/ZIP asli dan Classic Pixelation dua palet/empat ukuran mempertahankan bukti M1–M5 sebelumnya; tidak diuji ulang karena source aplikasi tidak berubah.
- UI existing tetap menyatakan AI Stylization belum tersedia. Tidak membuat hasil AI palsu.

## Modified files

- `README.md` — status runtime POC dan batas bukti.
- `docs/DECISIONS.md` — D-033: setup/pin, pemulihan timeout, bukti offline, resource dan batas berikutnya.
- `docs/PROGRESS.md` — status M6, tes aktual, error setup/harness dan next task.
- `docs/HANDOFF.md` — status handoff ini.
- Lokal ignored: `ai-service/.venv-stylization-poc/`, termasuk `poc-pins.txt` dan `install-report.json`. Interpreter tersedia di `Scripts/python.exe`; pin/report bukan lock aplikasi dan tidak di-commit.

## Uncommitted changes / Git status

Inspeksi awal working tree/index bersih. Empat dokumen di atas diubah pada sesi ini dan belum di-commit oleh sesi ini; tidak staging/commit. Environment POC baru ignored, source/requirements dan kedua environment aplikasi tidak disentuh. Smoke lewat stdin tidak membuat script sementara di workspace; tidak ada service uji yang ditinggalkan.

## Current errors / limitations

- Kelayakan SD15 penuh **belum terbukti**: import dan forward kecil PASS, tetapi tokenizer/full pipeline/safety checker, checkpoint, LoRA, peak RAM/commit model asli, latensi serta kualitas/alpha **NOT RUN**.
- Headroom RAM berubah-ubah dan sangat terbatas pada awal sesi. Private memory akhir smoke bukan peak commit; jangan menyamakan footprint kecil dengan kapasitas model penuh. Periksa resource ulang sebelum POC checkpoint.
- Warning smoke: BOS/EOS default CLIP 49406/49407 di luar vocab sintetis 32; input token 0–9 valid, forward finite PASS. Tidak menggunakan tokenisasi/EOS pipeline penuh. Untuk fixture kecil berikutnya, konfigurasi special-token ID sesuai vocab.
- Timeout instalasi CPU sudah ditangani dengan melanjutkan torchvision; import/forward dan `pip check` akhir PASS. Error pembacaan report akibat default cp1252 selesai dengan UTF-8; bukan error dependensi.
- PEFT/LoRA, koreksi mask, retensi dan evaluasi foto nyata belum dikerjakan. Model/base/LoRA belum boleh dibundle hanya karena kode terbuka; kewajiban distribusi ada di D-031.

## Tests / checks performed

- **PASS inspeksi** Git status/diff/index sebelum perubahan; requirements/source smoke CPU dan ignore existing.
- **FAIL timeout → pemulihan PASS** `py -3.14 -m venv ai-service/.venv-stylization-poc` lalu pip CPU binary-only; instalasi mencapai 600s. `pip list --format=json` dan RECORD torch menunjukkan torchvision belum ada, tanpa file torch hilang/ukuran berbeda. Install torchvision CPU `--no-deps` berhasil.
- **PASS instalasi** POC `python -B -m pip --isolated --disable-pip-version-check install --only-binary=:all: --no-cache-dir --index-url https://pypi.org/simple --report ai-service/.venv-stylization-poc/install-report.json -r ai-service/.venv-stylization-poc/poc-pins.txt`. Report UTF-8: 38 wheel, tanpa penggantian torch/vision/NumPy/Pillow; detail versi D-033.
- **PASS dependensi** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -m pip check`: No broken requirements found.
- **PASS smoke terbatas** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -` via stdin; HF/Transformers offline, socket connect ditolak. CLIP `[1,8,32]`, VAE latent `[1,4,16,16]`, UNet/noise/DDIM bentuk sama, decode `[1,3,32,32]`; CPU FP32, bentuk/finite/variasi tensor PASS. Bobot acak, bukan hasil generatif pretrained.
- **PASS isolasi** Inventaris `importlib.metadata` sebelum/sesudah identik pada kedua venv aplikasi; POC tanpa system site-packages atau path `.venv-test`.
- **ERROR harness → selesai** Report JSON gagal dibaca default cp1252; pembacaan UTF-8 berhasil.
- **NOT RUN** Checkpoint/full pipeline SD15/LoRA, benchmark model asli, kualitas/alpha, build/suite aplikasi/browser. Tidak ada perubahan perilaku aplikasi; bukti M1–M5 tidak diuji ulang.

## Next action (only one)

**Rencanakan POC checkpoint SD15 asli dan dapatkan izin download:** tetapkan revision/berkas/lisensi serta batas resource, periksa headroom RAM terkini, lalu minta izin eksplisit sebelum download/benchmark. Pakai environment `.venv-stylization-poc` existing; jangan ulang setup atau mengubah `.venv`, `.venv-test` dan requirements aplikasi. Jangan muat SCHP dan generator bersamaan pada POC pertama. Smoke kecil D-033 bukan izin download ataupun bukti model penuh layak.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
