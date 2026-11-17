# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — endpoint preview dan unduhan PNG individual berbasis manifest, 2026-11-17.

## Current milestone

**M4 — Job, object gallery, download individual/ZIP — In progress.**
Orchestrator/polling, foreground manusia, PNG kategori dan endpoint preview/unduhan individual terverifikasi. UI galeri serta ZIP belum tersedia; jangan menandai M4 selesai atau mulai M5.

## Last completed task

- Preview `GET /api/jobs/:id/objects/:objectId` dan attachment `GET /api/jobs/:id/objects/:objectId/download` tersedia untuk UUID objek yang terdaftar pada manifest job completed.
- Job non-completed → 409; UUID invalid → 400; job/objek/file hilang → 404. Object ID lintas-job ditolak.
- Nama file manifest dibatasi ke PNG hasil foreground/kategori; lokasi canonical diperiksa agar symlink/junction tidak mengalihkan file keluar lokasi yang diharapkan. File harus regular file; path client tidak digunakan dan static storage tidak dibuka.
- Kedua endpoint mengirim byte PNG asli tanpa transformasi, nama `<object_id>.png`, disposition inline/attachment, no-store/private dan nosniff. Error aman tidak membocorkan path.
- Pengujian kontrak akses/file ditambahkan ke suite job. D-023 mencatat keputusan; frontend, pipeline AI, dependensi dan checkpoint tidak berubah.

## Current task

Tugas endpoint PNG individual selesai dan diverifikasi. Berikutnya hanya UI ekstraksi/galeri dengan preview serta unduhan individual; ZIP tetap terpisah.

## Working components

- Input/preview/upload M2 dan pipeline M3 tidak diubah; hasil verifikasi sebelumnya tercatat di PROGRESS.
- Job queued → processing → completed/failed, antrean serial, restart, manifest privat dan polling tetap PASS pada suite job.
- Model asli menghasilkan foreground + Upper-clothes dan Pants pada smoke sintetis; preview dan attachment ketiganya sama persis dengan PNG disk, RGBA dan alpha 0/255.
- Service uji FastAPI port 8019 dihentikan; Express serta storage temp dibersihkan. Smoke lewat stdin tidak membuat script permanen. Jalankan ulang layanan sesuai README.

## Modified files

- `backend/src/job-manager.js` — resolusi objek manifest, validasi status/ID/nama file/lokasi canonical dan regular file.
- `backend/src/jobs.js` — endpoint preview/attachment dengan header dan penanganan error aman.
- `backend/test/jobs.test.js` — verifikasi HTTP kedua endpoint, byte PNG, akses dan storage invalid.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` — kontrak aktual dan D-023.
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — bukti dan satu tugas berikutnya.

## Uncommitted changes / Git status

Inspeksi awal `git status --short`, `git diff --stat`, `git diff --cached --stat`, `git diff` bersih. Catatan uncommitted tugas sebelumnya sudah kedaluwarsa; tidak menimpa perubahan awal.

Delapan file existing dalam Modified files diubah pada sesi ini dan belum di-commit. Tidak ada file baru atau script sementara tersisa. Tidak menjalankan staging/commit otomatis, instalasi atau download model.

## Current errors / limitations

- Tidak ada kegagalan tes pada tugas ini; suite job 45/45 PASS. Suite backend penuh 69/69 dan API Python 7/7 adalah bukti sesi sebelumnya, bukan dijalankan ulang.
- UI job/galeri, ZIP, batas antrean dan retensi belum tersedia. Ekstraksi sinkron M3 tetap di luar antrean job.
- Kategori ≤50 piksel tidak punya file kategori tetapi masih ada pada foreground. Semantic mask bukan pemisahan instance; kualitas foto nyata/occlusion belum diuji pada sesi ini.
- Satu proses backend tetap menjadi pemilik storage privat. Validasi canonical menolak pengalihan path yang sudah ada, tetapi bukan proteksi terhadap proses lokal berbahaya yang mengganti file saat transfer.
- Job lama tidak dimigrasikan dan tidak dibuatkan kategori palsu; foreground yang terdaftar tetap dapat diunduh.
- Startup `server.js` masih memakai `AI_HEALTH_TIMEOUT_MS` untuk client AI bersama (default 3000 ms); smoke memakai 30000 ms. Lisensi redistribusi checkpoint ATR belum terkonfirmasi.
- LSP tidak dikonfigurasi; referensi dicari setelah tool menyatakan server tidak tersedia.

## Tests performed

- **PASS** `node --test backend/test/jobs.test.js`: 45/45. Lifecycle/kategori sebelumnya, preview/attachment foreground/crop, byte/header, restart, ID invalid/lintas-job, queued/processing/failed, hasil kosong, file hilang/non-file, path manifest tidak aman serta junction keluar job.
- **PASS** smoke `node --input-type=module` melalui stdin dari backend: FastAPI/model asli port 8019 + Express dinamis, job completed, inferensi 2.05s. Preview dan attachment human 200×300, Upper-clothes 104×85, Pants 94×104 byte-identical dengan file manifest, RGBA dan alpha min/max 0/255.
- **PASS** cleanup Express, storage temp dan FastAPI 8019. Tidak mengakses foto pribadi atau meninggalkan script smoke.
- **NOT RUN** suite backend lain/Python, browser/build frontend, kualitas foto nyata dan ZIP. Pengujian dibatasi jalur job/endpoint yang berubah; frontend dan AI tidak diubah.

## Next action (only one)

**Integrasikan UI ekstraksi/galeri dengan API yang tersedia:** tombol ekstraksi menggunakan upload_id, polling status, kartu preview objek dan unduhan PNG individual. Jaga lifecycle pilihan baru/hapus agar respons job lama tidak menimpa pilihan terbaru; tampilkan gagal/kosong dengan jujur. Verifikasi browser desktop/mobile. Jangan mulai ZIP atau M5 pada tugas ini.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
