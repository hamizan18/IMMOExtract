# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — Rencana checkpoint SD15 terpaku dan izin download saja, 2026-11-20. Tidak mengunduh binary atau mengubah source/environment aplikasi.

## Current milestone

**M6 — AI Stylization lokal dan koreksi mask — In progress (rencana POC checkpoint).**
M1–M5 mempertahankan bukti verifikasi sebelumnya. AI Stylization dan koreksi mask belum tersedia.

## Last completed task

- Git awal bersih termasuk index; catatan empat dokumen pending pada handoff lama sudah kedaluwarsa.
- Memeriksa source lifecycle `ai-service/main.py`: startup memuat SCHP bila checkpoint ada. POC generatif kelak harus proses terpisah, bukan startup FastAPI existing.
- Environment `.venv-stylization-poc` existing tanpa system site-packages; inventaris sembilan pin sesuai D-033. Tidak mengulang setup/import model. `ai-service/models/` hanya berisi SCHP 267,445,237 byte.
- Menetapkan mirror SD15 revision `451f4fe16113bff5a5d2269ed5ad43b0592e9a14`, 16 berkas FP32/config/tokenizer/card 5,482,666,661 byte (5.1061 GiB), ditambah teks lisensi OpenRAIL-M revision `14d42d09bffd871b1666a084fc954a50cff72ac0`. Allowlist/hash/URL dan prosedur ada di D-034.
- Snapshot Windows: available RAM 1.89 GiB, sisa commit 5.70 GiB, disk D: bebas 24.92 GiB; query Python/Uvicorn kosong. Gerbang benchmark usulan minimal 6 GiB available dan 8 GiB sisa commit gagal; bukan bukti inferensi pasti gagal.
- Formulir izin dijawab pengguna **`download_only`**: download/verifikasi diizinkan untuk tugas berikutnya, **benchmark/pemuatan model belum diizinkan**. Tidak perlu meminta ulang izin download untuk allowlist yang sama; perubahan cakupan perlu izin baru.
- Tidak ada binary yang diunduh pada sesi rencana ini, hasil generatif, foto pribadi, instalasi, atau perubahan runtime.

## Current task

Rencana dan izin terbatas selesai (D-034). Berikutnya download/verifikasi allowlist tanpa memuat model. Jangan mengaktifkan stylization berdasarkan smoke kecil D-033 atau metadata checkpoint.

## Working components

- Ekstraksi lokal, PNG/ZIP asli dan Classic Pixelation dua palet/empat ukuran mempertahankan bukti M1–M5 sebelumnya; tidak diuji ulang karena source aplikasi tidak berubah.
- UI existing tetap menyatakan AI Stylization belum tersedia. Tidak membuat hasil AI palsu.

## Modified files

- `docs/DECISIONS.md` — D-034: revision, allowlist/ukuran/hash, lisensi, resource, batas operasional dan izin download saja.
- `docs/PROGRESS.md` — status M6, pemeriksaan aktual dan tugas berikutnya.
- `docs/HANDOFF.md` — status handoff ini.
- `README.md`, source, requirements dan environment tidak diubah. Environment lokal ignored `.venv-stylization-poc/` beserta pin/report D-033 tetap tersedia; tidak dibuat ulang.

## Uncommitted changes / Git status

Inspeksi awal working tree/index bersih. Tiga dokumen di atas diubah pada sesi ini dan belum di-commit oleh sesi ini; tanpa staging/commit. Tidak ada file sementara, direktori model baru atau service uji yang dibuat. Tidak menjalankan pemeriksaan Git ulang setelah edit.

## Current errors / limitations

- Full SD15/tokenizer/safety checker, checkpoint lokal, LoRA, peak RAM/commit model asli, latensi serta kualitas/alpha **NOT RUN**. SHA-256 D-034 masih metadata yang diharapkan, bukan hash binary lokal terverifikasi.
- Benchmark belum diizinkan dan headroom saat inventaris tidak lolos batas usulan. Jangan menutup aplikasi pengguna, mengubah pagefile, menonaktifkan safety checker atau mengganti precision/engine diam-diam.
- Disk cukup pada snapshot, tetapi wajib diperiksa lagi sebelum download: minimal 12 GiB bebas awal, pertahankan 6 GiB; hanya satu transfer aktif dan tujuan privat D-034. Ini batas operasional, bukan kebutuhan RAM terukur.
- Tidak ada error baru pada pemeriksaan sesi ini. Timeout instalasi/cp1252 D-033 sudah selesai pada sesi sebelumnya; warning special-token fixture kecil bukan bukti tokenizer pretrained bekerja.
- Koreksi mask, retensi, evaluasi foto nyata dan lisensi distribusi tetap terbuka. Izin evaluasi/download bukan izin bundling model.

## Tests / checks performed

- **PASS inspeksi** `git status --short; git diff --stat; git diff` dan `git diff --cached` sebelum perubahan: kosong.
- **PASS inventaris** PowerShell `Get-CimInstance Win32_OperatingSystem`, `Win32_PerfFormattedData_PerfOS_Memory`, `Win32_Process` (Python/Uvicorn), `Get-Volume -DriveLetter D`. Available 2,032,168,960 byte; commit 9,779,187,712/15,896,805,376 byte; disk bebas 26,759,573,504 byte. Tidak ada proses Python/Uvicorn dari query.
- **PASS pemeriksaan** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -` via stdin: `importlib.metadata`, daftar model dan kalkulasi ukuran. Sembilan pin sesuai; model hanya SCHP. Total 16 berkas SD15 5,482,666,661 byte; gerbang benchmark RAM/commit usulan sama-sama false.
- **PASS pemeriksaan sumber** API model/tree pada revision terpaku, README/model_index dan teks lisensi terpaku dibaca; bobot FP32/safety checker terdaftar. Tidak mengambil binary atau mengeksekusi source remote.
- **Izin aktual** Formulir menginformasikan 5.11 GiB, lisensi/restriksi dan keterbatasan RAM; pengguna memilih `download_only` untuk tugas berikutnya.
- **NOT RUN** Download/hash binary lokal, full pipeline/LoRA/benchmark/kualitas/alpha, build/suite aplikasi/browser. Tidak ada perubahan perilaku aplikasi; hasil M1–M5 dan smoke runtime D-033 tidak diuji ulang.

## Next action (only one)

**Download dan verifikasi checkpoint SD15 sesuai D-034, tanpa benchmark:** izin eksplisit `download_only` sudah diperoleh. Periksa disk terlebih dahulu, ambil hanya 16 berkas allowlist + teks lisensi ke `ai-service/models/sd15-poc/451f4fe16113bff5a5d2269ed5ad43b0592e9a14/` (belum dibuat), verifikasi ukuran/SHA-256 bobot serta integritas berkas kecil, simpan provenance/card/lisensi privat. Jangan memakai `from_pretrained`, memuat model, memasang ulang environment, mengambil LoRA/varian tambahan atau mengubah requirements aplikasi. Sesudah download terverifikasi, benchmark masih perlu izin terpisah dan pemeriksaan resource; jangan menganggap izin download sebagai izin menjalankannya.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
