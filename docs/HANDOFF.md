# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — Download checkpoint SD15 terpaku dan verifikasi integritas lokal, 2026-11-20. Model belum dimuat; source/environment aplikasi tidak diubah.

## Current milestone

**M6 — AI Stylization lokal dan koreksi mask — In progress (checkpoint POC terverifikasi).**
M1–M5 mempertahankan bukti verifikasi sebelumnya. AI Stylization dan koreksi mask belum tersedia.

## Last completed task

- Git awal bersih termasuk index; catatan tiga dokumen pending pada handoff sebelumnya sudah kedaluwarsa.
- Melaksanakan izin **`download_only`** D-034: 16 berkas SD15 revision `451f4fe16113bff5a5d2269ed5ad43b0592e9a14` + `license.txt` revision `14d42d09bffd871b1666a084fc954a50cff72ac0`.
- Tujuan privat: `ai-service/models/sd15-poc/451f4fe16113bff5a5d2269ed5ad43b0592e9a14/`. Total artefak 5,482,681,046 byte; provenance JSON tambahan berisi URL/revision/hash/ukuran dan hasil verifikasi. Checkpoint SCHP existing tidak disentuh.
- Transfer awal timeout tool 3,600s setelah 15 berkas selesai. Safety checker `.part` 548,405,248 byte dilanjutkan manual dengan HTTP Range; HTTP 206/rentang tepat, hash keseluruhan cocok. Download sisa dan lisensi selesai 605.23s, tanpa mengulang berkas sukses atau mengganti revision.
- Verifikasi lokal independen membaca ulang 17 artefak: empat SHA-256 bobot, 13 ukuran/Git blob OID berkas kecil/lisensi, exact allowlist dan parsing JSON PASS dalam 10.88s. Tidak ada partial tersisa; provenance dipublikasikan terakhir.
- Disk bebas awal/akhir 26,759,499,776 / 21,276,774,400 byte (~24.92/~19.82 GiB). Gerbang disk lolos; RAM/commit tidak diukur ulang pada tugas ini.
- Memakai interpreter `.venv-stylization-poc` existing via stdin dan stdlib; tidak import torch/Diffusers, memuat model, memasang paket, menjalankan AI atau mengambil foto pribadi.

## Current task

Download dan integritas lokal selesai (bukti tambahan D-034). Berikutnya pemeriksaan resource dan izin eksplisit benchmark. Izin download **bukan** izin memuat model atau menjalankan benchmark.

## Working components

- Ekstraksi lokal, PNG/ZIP asli dan Classic Pixelation dua palet/empat ukuran mempertahankan bukti M1–M5 sebelumnya; tidak diuji ulang karena source aplikasi tidak berubah.
- UI existing tetap menyatakan AI Stylization belum tersedia. Tidak membuat hasil AI palsu.

## Modified files

- `docs/DECISIONS.md` — bukti pelaksanaan D-034, pemulihan timeout, verifikasi dan batas izin; tidak mengubah model/arsitektur yang dipilih.
- `docs/PROGRESS.md` — status checkpoint M6, pemeriksaan aktual dan tugas berikutnya.
- `docs/HANDOFF.md` — status handoff ini.
- Lokal ignored: `ai-service/models/sd15-poc/451f4fe16113bff5a5d2269ed5ad43b0592e9a14/` berisi 16 berkas model, lisensi dan `provenance.json`. Detail setiap berkas/hash di D-034/provenance.
- Source, README, requirements dan environment tidak diubah. Script download/verifier lewat stdin, tidak ada script permanen baru.

## Uncommitted changes / Git status

Inspeksi awal working tree/index bersih. Tiga dokumen di atas diubah pada sesi ini dan belum di-commit oleh sesi ini; tanpa staging/commit. Checkpoint/provenance berada pada direktori model privat yang diabaikan `.gitignore` existing. Tidak ada service uji atau proses download tersisa; kedua job download sudah terminal. Tidak menjalankan Git ulang setelah perubahan.

## Current errors / limitations

- Tidak ada kegagalan integritas yang tersisa; timeout tool transfer awal sudah dipulihkan. Hash/ukuran/inventaris PASS bukan bukti kompatibilitas full pipeline, kualitas atau kelayakan memori.
- **Benchmark/pemuatan model belum diizinkan.** Full SD15/tokenizer/safety checker runtime, LoRA, peak RAM/commit, latensi serta kualitas/alpha tetap **NOT RUN**.
- Snapshot RAM/commit terakhir berasal dari tugas rencana D-034: available 1.89 GiB/sisa commit 5.70 GiB, di bawah gerbang usulan 6/8 GiB. Ini bukan snapshot terkini; periksa ulang sebelum meminta/menjalankan benchmark.
- Jangan menutup aplikasi pengguna, mengubah pagefile, menonaktifkan safety checker atau mengganti precision/engine diam-diam. POC kelak proses terpisah; startup `main.py` existing memuat SCHP otomatis bila checkpoint ada.
- Koreksi mask, retensi, evaluasi foto nyata dan lisensi distribusi tetap terbuka. Izin download bukan izin bundling model. Tidak perlu mengunduh ulang artefak terverifikasi.

## Tests / checks performed

- **PASS inspeksi** `git status --short; git diff --stat; git diff; git diff --cached` sebelum perubahan: kosong. `Get-Volume -DriveLetter D`: bebas 26,759,499,776 byte.
- **FAIL deadline → pemulihan PASS** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -u -` via stdin, urllib serial/hashlib. Tool timeout 3,600s; 15 berkas sudah cocok ukuran/hash, safety checker parsial.
- **PASS kelanjutan** Interpreter POC stdin meminta Range dari 548,405,248 byte; HTTP 206 dengan `Content-Range: bytes 548405248-1215981829/1215981830`, checksum safety checker keseluruhan cocok. Lisensi 14,385 byte cocok Git blob OID; selesai 605.23s.
- **PASS verifikasi lokal 17/17** Interpreter POC stdin terpisah membaca ulang seluruh byte dari disk, memeriksa empat SHA-256 bobot dan 13 Git blob OID, exact allowlist serta JSON, lalu menulis provenance. Total 5,482,681,046 byte; 10.88s, tanpa partial dan import torch/Diffusers. Disk bebas akhir 21,276,774,400 byte.
- **NOT RUN** Pemuatan model/inferensi/benchmark/kualitas/alpha, LoRA, build/suite aplikasi/browser. Izin terbatas download; source/perilaku aplikasi tidak berubah. Tidak mengklaim M6 selesai.

## Next action (only one)

**Periksa headroom RAM/commit dan dapatkan izin benchmark terisolasi D-034:** checkpoint lokal sudah tersedia/verifikasi PASS, sehingga jangan mengunduh ulang atau memasang environment lagi. Benchmark masih memerlukan izin eksplisit baru, minimal 6 GiB available RAM dan 8 GiB sisa commit sesuai gerbang usulan; tidak memuat SCHP bersamaan. Jika belum memenuhi izin/resource, jangan memuat model. Gunakan provenance lokal dan bukti D-034 sebagai input, bukan menganggap keberhasilan download sebagai kelayakan inferensi.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
