# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — tugas pertama M2: pemilihan gambar dan preview lokal, 2026-11-15.

## Current milestone

**M2 — Input gambar — In progress.** M1 selesai; M2 belum memenuhi seluruh acceptance criteria.

## Last completed task

Pemilihan satu JPG/PNG/WebP dan preview lokal dibuat serta diuji. Ada metadata, hapus/pilih ulang, penolakan input invalid, pembatasan ukuran/dimensi sementara, cleanup object URL, dan proteksi hasil decode usang. Tidak ada pengiriman foto ke server, kamera, atau model AI.

## Current task

Tugas preview lokal selesai. Berikutnya hanya kamera browser ke preview lokal, bukan seluruh sisa M2 sekaligus.

## Working components

- Frontend `http://127.0.0.1:5173`: input gambar dan preview lokal serta health checks lama. Hanya object URL browser; tidak ada request upload/persistensi gambar.
- Express `http://127.0.0.1:3000/api/health`: HTTP 200, independen dari FastAPI.
- FastAPI `http://127.0.0.1:8000/health`: HTTP 200, `model_loaded: false`.
- Express `/api/health/ai`: health FastAPI sungguhan via HTTP; timeout 3 detik; HTTP 503 saat upstream gagal.
- Proxy `/api` Vite bekerja; build frontend berhasil. `storage/` tidak disajikan publik dan belum digunakan.
- Setelah handoff awal, supervisor melaporkan proses Express dan Vite berhenti dengan exit 127; log tidak menjelaskan penyebabnya. Keduanya dijalankan ulang melalui perintah npm README. `node scripts/smoke.mjs` sesudah restart kembali PASS (7 pemeriksaan). Supervisor proses backend baru melaporkan exit 0, meskipun endpoint Express tetap merespons dalam smoke test; jangan menyamakan status wrapper proses dengan ketersediaan HTTP.
- Pemeriksaan browser tugas M2 menunjukkan health Express/FastAPI tetap terhubung. Ketersediaan proses lintas sesi tidak dijamin; bila endpoint tidak tersedia, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini: `frontend/index.html`, `frontend/src/main.js`, modul baru `frontend/src/image-input.js`.
- Dokumentasi: `README.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`.
- Backend, FastAPI, package/lockfile, AGENTS, serta spesifikasi produk tidak diubah.
- `frontend/dist/` dihasilkan ulang oleh build dan diabaikan Git. Fixture sintetis sementara telah dihapus; tidak ada foto pribadi/model.

## Uncommitted changes / Git status

Saat mulai tugas ini, Git sudah berada di branch `main...origin/main`; hanya `docs/PROGRESS.md` dan `docs/HANDOFF.md` yang modified, staged diff kosong. Ini memperbarui catatan lama bahwa repo belum memiliki commit. Perubahan awal dipertahankan. Agent tidak menjalankan `git add` atau commit. Daftar perubahan tugas ini ada di atas; status akhir tidak diperiksa ulang.

## Current errors

Tidak ditemukan error aplikasi pada skenario preview yang diuji. Batas 10 MiB, sisi 8192, dan 24 megapiksel sementara; dimensi dicek setelah decode, bukan proteksi dekompresi penuh. Validasi frontend tidak menggantikan validasi server. Riwayat supervisor exit 127 belum diketahui penyebabnya (lihat Working components). Python 3.14.3 belum diuji untuk model AI. Tes browser memakai browser desktop headless dan viewport mobile, bukan perangkat mobile fisik.

## Tests performed

- **PASS:** `npm run build --prefix frontend`.
- **PASS:** browser aktual JPEG/PNG/WebP 160×100; metadata dan preview sesuai.
- **PASS:** penolakan file teks `.png`, MIME/signature berbeda, kosong, PNG rusak, >10 MiB, sisi 8193, dan 5000×5000 piksel.
- **PASS:** hapus/pilih ulang file yang sama; tidak ada request HTTP selama pemilihan gambar.
- **PASS:** race dengan decode asli ditunda oleh harness: pilihan terbaru menang, hapus saat decode tidak memunculkan gambar lama, object URL dibebaskan.
- **PASS:** screenshot desktop/mobile 390×844 tanpa overflow; tombol health lama tetap bekerja.
- Percobaan harness race pertama memakai helper wait yang keliru (selector, bukan ekspresi); setelah dikoreksi ke `page.waitForFunction`, pengujian PASS tanpa perubahan source.
- Fixture sintetis telah dihapus; tidak ada test suite browser permanen baru. Tes M1 historis tetap dicatat di `PROGRESS.md`.
- **NOT RUN:** kamera, upload server, model AI (belum tersedia).

## Next action (only one)

**Tambahkan pengambilan gambar kamera browser dengan izin pengguna ke preview lokal M2**, termasuk kondisi izin ditolak dan penghentian stream. Jangan mulai upload server/model AI pada tugas tersebut. Reuse batas input serta lifecycle preview; LSP belum dikonfigurasi pada inspeksi tugas ini.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.
