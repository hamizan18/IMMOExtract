# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity — verifikasi upload server M2, 2026-11-15.

## Current milestone

**M2 — Input gambar — In progress.** M1 selesai; M2 memiliki upload/validasi server yang sudah terverifikasi penuh, tapi frontend belum mengirim ke server.

## Last completed task

Upload/validasi server Express terverifikasi: `node --test test/uploads.test.js` → 24/24 PASS. Mencakup penerimaan PNG/JPEG/WebP valid, 17 kasus penolakan defensif (signature, MIME mismatch, file corrupt, dimensi berlebih, animasi, file terlalu besar, field salah, multipart tidak valid), batas byte yang dikonfigurasi, abort koneksi tanpa artefak tersisa, dan storage failure yang mengembalikan JSON aman tanpa path bocor. Implementasi OMP diverifikasi tanpa modifikasi.

## Current task

Upload server selesai dan terverifikasi. Berikutnya: hubungkan frontend ke endpoint server sehingga M2 menjadi end-to-end.

## Working components

- Frontend `http://127.0.0.1:5173`: input file, kamera ke preview lokal, dan health checks. Upload ke server belum terhubung dari frontend.
- Express `http://127.0.0.1:3000/api/health`: HTTP 200, independen dari FastAPI.
- Express `POST /api/uploads`: menerima dan memvalidasi satu gambar, menyimpan ke `storage/uploads/<uuid>/`, mengembalikan `{upload_id, status, image}`. Terverifikasi 24/24 test.
- FastAPI `http://127.0.0.1:8000/health`: HTTP 200, `model_loaded: false`.
- Express `/api/health/ai`: health FastAPI sungguhan via HTTP; timeout 3 detik; HTTP 503 saat upstream gagal.
- Proxy `/api` Vite bekerja; build frontend berhasil. `storage/` tidak disajikan publik.
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint tidak tersedia, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini: `docs/PROGRESS.md`, `docs/HANDOFF.md` (hanya dokumentasi; implementasi OMP tidak diubah).
- File untracked OMP yang sudah ada: `backend/src/app.js`, `backend/src/uploads.js`, `backend/test/uploads.test.js`.
- Backend package dimodifikasi OMP: `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`, `backend/src/server.js`.
- Frontend OMP: `frontend/index.html`, `frontend/src/image-input.js`.

## Uncommitted changes / Git status

10 file tracked dimodifikasi (OMP + tugas ini), 3 lokasi untracked (`backend/src/app.js`, `backend/src/uploads.js`, `backend/test/`). Belum ada commit sejak M2 dimulai. Jangan commit tanpa instruksi pengguna.

## Current errors

Tidak ada error. Test suite berjalan bersih. Frontend belum mengirim ke `/api/uploads` (NOT RUN dari sisi browser).

## Tests performed

- **PASS:** `node --test test/uploads.test.js` — 24/24 subtest, duration ~2.3 detik.
  - accept PNG, JPEG, WebP dengan path klien diabaikan, file tersimpan privat
  - tolak: missing file, file kosong, fake PNG, MIME mismatch, MIME tidak didukung
  - tolak: file corrupt setelah metadata valid, sisi >8192px, >24MP, animated WebP, APNG
  - tolak: >10 MiB, field tidak dikenal, banyak file, field teks tambahan, JSON request, boundary hilang, multipart terpotong
  - batas byte yang dikonfigurasi (exact limit pass, +1 byte reject)
  - abort koneksi tidak meninggalkan file
  - storage failure → HTTP 500 JSON aman, tidak ada path bocor, backend tetap sehat

## Next action (only one)

**Hubungkan upload frontend ke server**: modifikasi `frontend/src/image-input.js` untuk mengirim `POST /api/uploads` (multipart) setelah preview lokal berhasil, tampilkan `upload_id` atau pesan error server ke UI; jangan mulai job processing atau pipeline AI.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.
