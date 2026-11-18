# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — integrasi UI pilihan objek/ZIP dan verifikasi browser desktop/mobile, 2026-11-18.

## Current milestone

**M4 — Job, object gallery, download individual/ZIP — Complete pada jalur Windows lokal teruji.**
UI ZIP kini terhubung ke API existing; PNG individual tetap berfungsi. M5 belum dimulai pada sesi ini. Kualitas pada foto nyata, retensi dan hardening masih memiliki batasan di bawah.

## Last completed task

- Checkbox per kartu, jumlah pilihan, Unduh Pilihan dan Unduh Semua memakai API D-025; semua mencakup foreground manusia beserta kategori. Pilihan awal kosong; hasil kosong menonaktifkan kedua aksi.
- Satu request ekspor aktif; tombol/checkbox terkunci selama pembuatan ZIP. Error mempertahankan pilihan; tidak ada retry otomatis, timeout 15 detik.
- AbortController ekspor terpisah mengikuti reset upload/gambar/kamera/pagehide. Identitas operasi diperiksa setelah JSON selesai sehingga respons lama tidak memicu unduhan atau mengganti job terbaru.
- Respons sukses memvalidasi job/export UUID, status dan download_url exact sebelum link native diklik. Link unduh ulang tetap tersedia tanpa POST baru; tidak menyalin archive ke blob atau mengklaim transfer selesai.
- D-026 mencatat keputusan. Tidak mengubah backend, model, dependensi, stack atau spesifikasi.

## Current task

UI ZIP selesai dan terverifikasi. Tidak ada implementasi setengah jadi pada tugas ini; tugas berikutnya satu pemrosesan dasar Classic Pixelation M5.

## Working components

- Browser build preview 5176 → Express 3122 → FastAPI/model asli 8022: upload fixture sintetis, ekstraksi, tiga kartu, ZIP pilihan/semua dan PNG individual.
- zipfile/Pillow Python membuktikan CRC/inventaris ZIP tepat, byte PNG identik dengan file manifest, RGBA dan alpha 0/255.
- Browser desktop 1365×1000/mobile 390×844 tanpa overflow. Error HTTP/network, URL respons tidak aman, busy/single POST, unduh ulang tanpa POST dan respons JSON usang setelah ganti gambar/job kosong PASS.
- Tab/ketiga layanan uji ditutup; fixture/storage temp dan empat file unduhan dihapus. Tanpa foto pribadi, script smoke permanen atau akses kamera.

## Modified files

- `frontend/index.html` — kontrol ZIP, status/link unduh ulang dan checkbox kartu.
- `frontend/src/extraction-workspace.js` — pilihan, request ekspor, validasi respons dan lifecycle abort/reset.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md` — penggunaan, D-026, bukti, status dan next task.

## Uncommitted changes / Git status

Inspeksi awal `git status --short`, `git diff --stat`, `git diff` menemukan **sepuluh file modified dan satu untracked** dari tugas ZIP sebelumnya; `git diff --cached --stat` kosong. Perubahan sebelumnya dipertahankan, bukan working tree bersih:

- `backend/package.json`, `backend/package-lock.json`, `backend/src/job-manager.js`, `backend/src/jobs.js`, `backend/test/jobs.test.js` serta helper untracked `backend/src/zip-export.js`.
- Lima dokumen README/ARCHITECTURE/DECISIONS/PROGRESS/HANDOFF sudah modified sebelumnya dan diperbarui lagi pada sesi ini.

Dua file frontend pada Modified files ditambahkan ke perubahan belum commit. Tidak staging/commit, instalasi atau download model. Git tidak dijalankan ulang setelah edit; daftar berdasarkan inspeksi awal dan operasi sesi.

## Current errors / limitations

- Tidak ada error aplikasi tersisa pada skenario UI ZIP yang dijalankan. Suite backend sesi sebelumnya 51/52 lalu koreksi ekspektasi JSON null PASS terarah 1/1; seluruh suite tidak diulang pada sesi ini karena backend tidak diubah.
- Batas antrean/ekspor dan retensi belum tersedia. Tiap POST sukses membuat ekspor baru; crash sebelum publikasi dapat menyisakan direktori privat tanpa manifest.
- UI tidak memulihkan job setelah reload; reset browser bukan pembatalan job/ekspor server. Unduhan native tidak memiliki dialog error transfer khusus; status sukses hanya menyatakan ZIP siap/unduhan diminta.
- Ekstraksi sinkron M3 tetap di luar antrean; storage dimiliki satu proses backend. Pemeriksaan canonical bukan proteksi terhadap proses lokal berbahaya yang mengganti file saat transfer.
- Startup server.js masih memakai AI_HEALTH_TIMEOUT_MS bersama (default 3000 ms); smoke memakai 30000 ms. Lisensi redistribusi checkpoint ATR belum terkonfirmasi.
- Linux/macOS, kamera/mobile fisik dan kualitas foto nyata tidak diuji pada sesi ini. Skenario timeout 15 detik, reset melalui kamera/pagehide tidak diuji ulang khusus ZIP; ganti gambar saat JSON tertunda diuji langsung.
- LSP tidak tersedia pada sesi ini; referensi setUploadedImage diperiksa dengan pencarian sebelum perubahan.

## Tests performed

- **PASS** `npm run build` dari cwd frontend: Vite 7 modul.
- **PASS** browser Chromium build preview → Express → model asli: upload/ekstraksi sintetis, tiga preview terdecode, checkbox dan aksi ZIP, PNG individual.
- **PASS** klik Unduh Pilihan/Unduh Semua dan pemeriksaan `ai-service/.venv-test/Scripts/python.exe -` (stdin zipfile/Pillow): ZIP dua kategori 1202 byte/semua 3824 byte, CRC, inventaris, byte PNG, RGBA/alpha 0/255; PNG individual 451 byte identik.
- **PASS** screenshot desktop/mobile tanpa overflow, deselection, link unduh ulang tanpa POST, error HTTP 404 dengan pilihan dipertahankan, pemulihan mengunduh satu kategori.
- **PASS** injeksi network failure/URL eksternal, JSON ekspor nyata ditahan lalu gambar diganti dan job kosong diselesaikan: tidak ada unduhan usang, signal aborted, kontrol sesuai job terbaru, hanya satu POST saat busy.
- **PASS** browser errors kosong; cleanup tab, layanan uji, fixture/storage dan unduhan temp.
- **NOT RUN** suite backend/Python, foto nyata/kamera/mobile fisik, M5. Backend/model tidak diubah; pengujian fitur memakai browser dan pemeriksaan archive.

## Next action (only one)

**Mulai satu tugas M5:** implementasikan pemrosesan Classic Pixelation deterministik untuk satu PNG objek, ukuran 16/32/64/128 dengan nearest-neighbour dan alpha tetap terjaga. Tetapkan arti ukuran/aspect ratio secara eksplisit, gunakan Sharp existing, buktikan piksel/dimensi/alpha tanpa mengubah PNG asli. UI Studio, palet dan AI Stylization bukan bagian tugas pertama ini.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
