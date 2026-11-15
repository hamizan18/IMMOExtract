# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — implementasi dan verifikasi M1 pada 2026-11-15.

## Current milestone

**M1 — Project scaffold & service connectivity — selesai.** M2 belum dimulai.

## Last completed task

Fondasi Vite + Vanilla JS + Tailwind, Express, dan FastAPI dibuat serta diuji secara lokal. Koneksi Express → FastAPI sukses; kondisi FastAPI mati dan pulih juga diuji. Tidak ada model AI diunduh/dipasang.

## Current task

Tidak ada pekerjaan implementasi aktif. Tugas berikutnya dibatasi pada input upload dan preview lokal frontend M2.

## Working components

- Frontend `http://127.0.0.1:5173`: halaman status layanan, tombol periksa ulang, pesan jujur bahwa fitur AI/produk belum tersedia.
- Express `http://127.0.0.1:3000/api/health`: HTTP 200, independen dari FastAPI.
- FastAPI `http://127.0.0.1:8000/health`: HTTP 200, `model_loaded: false`.
- Express `/api/health/ai`: health FastAPI sungguhan via HTTP; timeout 3 detik; HTTP 503 saat upstream gagal.
- Proxy `/api` Vite bekerja; build frontend berhasil. `storage/` tidak disajikan publik dan belum digunakan.
- Saat handoff, proses tool `immo-m1-frontend`, `immo-m1-backend`, `immo-m1-ai-restored` masih berjalan. Jika sesi tool sudah berakhir, jalankan kembali sesuai README; jangan menganggap proses lintas sesi tetap hidup.

## Modified files

- Baru: `.gitignore`, `scripts/smoke.mjs`.
- Baru: `frontend/package.json`, `frontend/package-lock.json`, `frontend/.env.example`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/src/main.js`, `frontend/src/style.css`.
- Baru: `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`, `backend/src/server.js`.
- Baru: `ai-service/requirements.txt`, `ai-service/main.py`.
- Diperbarui: `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`.
- Artefak lokal diabaikan Git: `frontend/node_modules/`, `backend/node_modules/`, `frontend/dist/`, `ai-service/.venv/`, cache Python. Tidak ada foto/hasil/model.
- `AGENTS.md` dan `docs/PROJECT_SPEC.md` tidak diubah.

## Uncommitted changes / Git status

Inspeksi awal gagal karena `.git` belum ada. `git init` kemudian berhasil. Tidak ada `git add` atau commit yang dijalankan; seluruh source/dokumentasi belum dicommit. Status akhir tidak diperiksa ulang; agent berikutnya wajib memeriksa Git sebelum mengedit.

## Current errors

Tidak ada error runtime pada skenario M1 yang diuji. HTTP 503 saat FastAPI sengaja dihentikan adalah hasil yang diharapkan. Python 3.14.3 belum diuji dengan PyTorch/SCHP; jangan menganggap runtime model sudah diputuskan. Linux/macOS dan deployment produksi belum diuji.

## Tests performed

- **PASS:** `npm run build --prefix frontend`.
- **PASS:** `node scripts/smoke.mjs` — 7 pemeriksaan HTTP/JSON pada layanan nyata dan proxy Vite.
- **PASS:** `node scripts/smoke.mjs --ai-unavailable` setelah FastAPI dihentikan — 6 pemeriksaan, integrasi 503 dan Express tetap 200.
- **PASS:** browser aktual desktop/mobile; klik Periksa ulang pada kondisi sukses, gagal, dan pulih setelah FastAPI dijalankan kembali tanpa restart Express.
- **PASS:** startup `npm start --prefix backend`, `npm run dev --prefix frontend`, dan `ai-service/.venv/Scripts/python.exe -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8000`.
- Detail instalasi dan inspeksi Git ada di `PROGRESS.md`; langkah menjalankan ada di README.
- **NOT RUN:** model AI dan fitur M2–M7 (belum diimplementasikan).

## Next action (only one)

**Implementasikan input upload gambar dan preview lokal frontend sebagai tugas kecil pertama M2.** Jangan mulai model AI atau pipeline ekstraksi.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.
