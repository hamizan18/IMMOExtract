# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — Implementasi palet warna opsional FR-10, 2026-11-19.

## Current milestone

**M5 — Classic Pixelation Studio — Complete pada jalur Windows lokal teruji.**
Empat grid, helper/API snapshot/UI, unduhan dan palet opsional tersedia; M6 belum dimulai.

## Last completed task

- `pixelatePng(input, size, palette = 'original')` mendukung `original` dan `retro16`. Retro memakai palet tetap bergaya EGA dan jarak kuadrat RGB sesudah sampling. Alpha tetap exact termasuk parsial; RGB alpha 0 tidak diubah. Tanpa dithering/dependensi baru.
- POST pixelate menerima palette opsional tervalidasi, menyimpan pilihan pada snapshot dan respons. Manifest invalid ditolak; snapshot historis tanpa palette tetap dapat diunduh tanpa migrasi.
- UI per kartu menyediakan Warna asli / Retro 16 warna, validasi palette respons, label mode hasil/unduhan, locking kedua pemilih selama request dan lifecycle abort existing.
- Label ukuran yang sebelumnya tidak terhubung kini terhubung; ukuran dan palet memiliki nama aksesibel per objek, terbukti pada accessibility tree.
- Tes helper/job 64/64, build frontend, browser model asli dan oracle PNG independen PASS. Original PNG/ZIP tidak berubah. M5 ditutup berdasarkan bukti tersebut (D-030); M6 tidak diimplementasikan.

## Current task

FR-10 selesai. Berikutnya satu tugas evaluasi kelayakan M6, tanpa instalasi/download model besar otomatis.

## Working components

- Ekstraksi lokal, PNG asli, ZIP serta Classic Pixelation dua mode palet dan empat ukuran teruji.
- Browser → build preview 5178 → Express 3124 → model asli 8024 menghasilkan tiga objek dari fixture sintetis, empat unduhan Retro dan satu hasil kembali ke original.
- Semua layanan/tab uji ditutup; tujuh unduhan dan fixture/uploads/jobs temp dihapus. Tanpa foto pribadi atau script permanen.

## Modified files

- `backend/src/pixelation.js` — kuantisasi deterministik RGB terlihat.
- `backend/src/job-manager.js` — validasi request/manifest dan persistensi palet.
- `frontend/index.html`, `frontend/src/extraction-workspace.js` — pemilih palet, label aksesibel, lifecycle dan validasi respons.
- `backend/test/pixelation.test.js`, `backend/test/jobs.test.js` — alpha/hidden RGB/tie-break/batas warna, kedua mode snapshot, invalid input/manifest dan snapshot lama.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md` — kontrak, panduan, bukti, batasan dan next task.

## Uncommitted changes / Git status

Working tree/index bersih pada inspeksi awal; perubahan dua dokumen dari sesi sebelumnya tidak lagi pending. Sebelas file di atas diubah pada sesi ini, belum di-commit; tidak staging atau commit otomatis. Model/dependensi/stack tidak berubah.

## Current errors / limitations

- Tidak ada kegagalan pada verifikasi yang dijalankan.
- Palet Retro tetap, bukan adaptif/perseptual; hanya RGB terlihat dibatasi ≤16. PNG tetap RGBA8, alpha parsial dan hidden RGB dapat menambah kombinasi RGBA.
- Downsampling dapat menghilangkan detail tipis. Retensi, benchmark batas RAM dan kualitas foto nyata masih terbuka.
- Kamera/mobile fisik, timeout/pagehide pixelation tidak diuji pada sesi ini. Tidak mengklaim kesiapan produksi/M6.
- LSP tidak tersedia; referensi helper diperiksa dengan pencarian sebelum perubahan.

## Tests performed

- **PASS** `node --test backend/test/pixelation.test.js backend/test/jobs.test.js`: 64/64, termasuk delapan snapshot dua mode/empat ukuran, restart, original/ZIP tetap utuh.
- **PASS** `npm run build` di frontend: Vite 7 modul, 388 ms.
- **PASS** Browser model asli: empat grid Retro, kembali ke Warna asli, preview/unduhan, nama aksesibel kedua pemilih, screenshot desktop 1365×1000/mobile 390×844 tanpa overflow/page error.
- **PASS** `ai-service/.venv-test/Scripts/python.exe -` (stdin Pillow/zipfile/urllib): 18.640 piksel lima hasil sesuai oracle, alpha/hidden RGB utuh, metadata palet dan preview=download, PNG asli/ZIP/CRC tetap benar.
- **PASS** Fault injection HTTP 500, palette respons salah, busy locking, reset ketika JSON respons nyata ditahan; kontrol pulih dan hasil usang tidak tampil.
- **PASS** Cleanup layanan/tab/storage uji dan tujuh unduhan.
- **NOT RUN** Suite upload/ekstraksi sinkron/Python AI, kualitas foto nyata, kamera/mobile fisik, timeout/pagehide pixelation dan M6; verifikasi dibatasi jalur terkait.

## Next action (only one)

**Evaluasi kelayakan AI Stylization lokal M6 pada hardware/runtime existing:** kandidat model, lisensi, kebutuhan RAM/CPU/GPU dan strategi alpha. Jangan download model besar atau mengganti environment sebelum persetujuan pengguna; jangan menyamakan Classic Pixelation dengan AI generatif.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
