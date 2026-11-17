# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — UI ekstraksi/galeri, polling dan unduhan PNG individual, 2026-11-17.

## Current milestone

**M4 — Job, object gallery, download individual/ZIP — In progress.**
Orchestrator/polling, PNG foreground/kategori, UI galeri serta preview/unduhan individual terverifikasi. ZIP belum tersedia; jangan menandai M4 selesai atau mulai M5.

## Last completed task

- Modul `extraction-workspace.js` menerima upload_id/reset dari lifecycle `image-input.js`. Tombol aktif setelah upload sukses; POST hanya upload_id, polling serial tiap 1 detik dan timeout request 15 detik.
- UI menampilkan antrean/proses, gagal/kosong atau kartu label/dimensi/preview/unduhan PNG asli. Desktop dua panel, mobile bertumpuk; belum ada ZIP/pixelation.
- Ganti/hapus pilihan, buka kamera dan pagehide meng-abort request, membatalkan timer dan mengosongkan galeri. Identitas operasi menolak respons usang.
- Putus polling menampilkan Periksa status untuk job yang sama tanpa POST baru. POST tidak terkonfirmasi diberi peringatan potensi job sudah diterima; tidak ada retry otomatis.
- Keterangan fitur lama pada halaman diganti. D-024 mencatat keputusan; backend, model, dependensi dan checkpoint tidak berubah.

## Current task

UI ekstraksi/galeri dan unduhan individual selesai serta diverifikasi. Berikutnya hanya endpoint ZIP backend; UI ZIP tetap terpisah.

## Working components

- Browser build preview → Express → model asli: upload, queued/processing/completed, tiga kartu dan unduhan PNG.
- PNG unduhan browser identik dengan file kategori disk, RGBA 104×85, alpha 0/255.
- Hasil kosong model asli, AI mati → failed, polling terputus → pemeriksaan manual, respons usang, error preview/upload, capture sintetis dan pagehide terverifikasi.
- FastAPI 8020, backend 3120 dan preview 5175 uji dihentikan; tab ditutup, storage/fixture temp serta PNG unduhan dibersihkan. Jalankan ulang layanan sesuai README.

## Modified files

- `frontend/index.html` — panel ekstraksi/galeri, template kartu dan layout responsif.
- `frontend/src/image-input.js` — koneksi reset/upload sukses ke workspace.
- `frontend/src/extraction-workspace.js` — baru; submit, polling/lifecycle, status dan galeri.
- `frontend/src/style.css` — pola transparansi preview.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` — panduan UI, kontrak dan D-024.
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — bukti aktual dan satu next task.

## Uncommitted changes / Git status

Inspeksi awal `git status --short`, `git diff --stat`, `git diff --cached --stat`, `git diff` bersih. Catatan uncommitted tugas sebelumnya sudah kedaluwarsa; tidak menimpa perubahan awal.

Delapan file existing dan satu file baru dalam Modified files diubah pada sesi ini dan belum di-commit. Tidak ada script sementara tersisa. Tanpa staging/commit otomatis, instalasi atau download model.

## Current errors / limitations

- Build dan skenario browser tugas ini PASS. Error harness (runtime document/assert dan pemilihan file sama) sudah diselesaikan tanpa perubahan aplikasi; detail di PROGRESS.
- ZIP, batas antrean dan retensi belum tersedia. Ekstraksi sinkron M3 tetap di luar antrean job.
- UI tidak memulihkan job setelah reload. Ganti/hapus pilihan menghentikan pengamatan browser, bukan job server. Setelah terminal, gunakan Hapus pilihan lalu pilih gambar untuk job baru.
- Unduhan browser native tidak memiliki dialog error khusus aplikasi. Preview file gagal memiliki pesan per kartu.
- Kategori ≤50 piksel tetap pada foreground tetapi tanpa file kategori. Semantic mask bukan instance; foto nyata/occlusion dan kamera/mobile fisik tidak diuji pada sesi ini.
- Satu proses backend tetap menjadi pemilik storage privat; perlindungan path bukan proteksi terhadap proses lokal berbahaya yang mengganti file saat transfer.
- Startup `server.js` masih memakai `AI_HEALTH_TIMEOUT_MS` untuk client AI bersama (default 3000 ms); smoke memakai 30000 ms. Lisensi redistribusi checkpoint ATR belum terkonfirmasi.
- LSP tidak dikonfigurasi; referensi dicari setelah tool menyatakan server tidak tersedia.

## Tests performed

- **PASS** `npm run build --prefix frontend`: Vite 7 modul.
- **PASS** browser build preview 5175 → Express 3120 → model asli 8020: upload, queued/processing/completed, tiga kartu human/Upper-clothes/Pants terdecode; input putih menghasilkan completed kosong.
- **PASS** klik unduhan browser lalu Node/Sharp via stdin: PNG 451 byte identik dengan file kategori, RGBA 104×85, alpha 0/255.
- **PASS** screenshot desktop 1365×1000/mobile 390×844, tanpa overflow horizontal.
- **PASS** JSON POST tertunda → hapus, GET tertunda → ganti; signal aborted dan hasil usang tidak menimpa UI.
- **PASS** gangguan polling → Periksa status: satu POST, job sama, galeri pulih; preview 404/upload gagal menampilkan state sesuai.
- **PASS** kamera canvas sintetis → reset/capture/upload/track ended; navigasi pagehide saat POST tertunda → abort dan UI reset.
- **PASS** AI dihentikan lalu ekstraksi: failed, tanpa kartu palsu, preview input tetap tersedia.
- **PASS** cleanup tab, layanan uji, fixture/upload/job temp dan PNG unduhan.
- **NOT RUN** suite backend/Python, kamera/mobile fisik, foto nyata dan ZIP. Backend/model tidak berubah; ZIP belum tersedia.

## Next action (only one)

**Implementasikan endpoint ZIP backend berbasis manifest:** `POST /api/jobs/:id/exports` untuk semua atau object_ids dan `GET /api/jobs/:id/exports/:exportId/download`. Hanya job completed dan objek terdaftar; ZIP privat, tanpa path client. Verifikasi isi sesuai pilihan/semua serta penolakan ID invalid/file hilang. Jangan mulai UI ZIP atau M5 pada tugas ini.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
