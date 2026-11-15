# IMMOExtract — Progress Tracker

> **Status aktual:** M1 selesai dan terverifikasi pada 2026-11-15. Tidak ada model AI atau fitur M2–M7 yang diimplementasikan.

## Ringkasan

- **Current milestone:** M1 — Project scaffold & service connectivity — Complete.
- **Current task:** Selesai; menunggu tugas kecil M2 berikutnya.
- **Overall status:** Fondasi lokal berjalan; fitur produk belum tersedia.
- **Last verification:** 2026-11-15 — build frontend, smoke HTTP sukses/gagal, browser desktop/mobile, dan pemulihan koneksi.

## Milestone

| Milestone | Cakupan | Status | Kriteria selesai |
| --- | --- | --- | --- |
| M1 | Struktur repo, frontend, Express, FastAPI, health checks | Complete | Frontend dibuka di browser; kedua health checks dan Express → FastAPI lulus; kegagalan/pemulihan diuji |
| M2 | Upload, kamera, validasi, preview input | ⬜ Not started | Foto valid diterima; file salah ditolak; kamera diuji |
| M3 | POC SCHP, label/mask, PNG transparan | ⬜ Not started | Contoh foto diproses lokal; hasil transparan dapat diperiksa |
| M4 | Job, object gallery, download individual/ZIP | ⬜ Not started | Job status & unduhan end-to-end teruji |
| M5 | Classic Pixelation Studio | ⬜ Not started | Ukuran, nearest-neighbour, palet/alpha diuji |
| M6 | AI stylization lokal dan koreksi mask | ⬜ Not started | Model dan kemampuan hardware diuji; hasil tidak dipalsukan |
| M7 | Selective ZIP, spritesheet statis, hardening, docs | ⬜ Not started | Regression tests dan panduan jalankan diverifikasi |

## Completed

- Spesifikasi, arsitektur rencana, aturan agent, dan handoff awal **telah didokumentasikan**.
- Struktur awal dipertahankan; folder implementasi awal kosong. Git awal belum ada (`fatal: not a git repository`), kemudian `git init` berhasil; tanpa staging/commit.
- Frontend Vite + Vanilla JS + Tailwind: halaman status berbahasa Indonesia, tombol periksa ulang, tanpa UI fitur lanjutan.
- Express `/api/health` dan `/api/health/ai`; FastAPI `/health` dengan `model_loaded: false`.
- Semua layanan bind loopback. Browser → proxy Vite `/api` → Express → FastAPI; tidak ada static serving storage.
- `.gitignore`, `.env.example`, pin dependensi, lockfile npm, dan `scripts/smoke.mjs` tersedia; panduan startup ada di README.
- File dibuat: `.gitignore`; `frontend/{package.json,package-lock.json,.env.example,vite.config.js,index.html,src/main.js,src/style.css}`; `backend/{package.json,package-lock.json,.env.example,src/server.js}`; `ai-service/{requirements.txt,main.py}`; `scripts/smoke.mjs`.
- Dokumen diperbarui: `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`. Spesifikasi produk dan AGENTS tidak diubah.

## In progress

- Tidak ada implementasi aktif; berhenti pada batas M1.

## Blockers / risks

- Kemampuan hardware untuk SCHP/AI generatif belum diukur.
- Python 3.14.3 teruji untuk FastAPI M1 saja, bukan bukti kompatibilitas PyTorch/SCHP.
- Pengujian Windows lokal saja; Linux/macOS dan deployment produksi belum diuji.
- Checkpoint model belum dipilih/diunduh/diuji.
- Jangan menandai fitur M3–M7 sebagai selesai hanya karena dokumentasinya ada.

## Next task — satu tugas saja

Implementasikan input upload gambar dan preview lokal frontend sebagai tugas kecil pertama M2; jangan mulai model AI.

## Verification log

| Tanggal | Perintah / pengujian | Hasil | Keterangan |
| --- | --- | --- | --- |
| 2026-11-15 | `git status --short --branch`, `git diff`, `git diff --cached` (inspeksi awal) | FAIL | Workspace awal belum merupakan repo Git; bukan error aplikasi |
| 2026-11-15 | `git init` | PASS | Repo kosong dibuat; tidak ada staging/commit |
| 2026-11-15 | `npm install --no-audit --no-fund` di frontend dan backend | PASS | 30 dan 65 paket; lockfile dihasilkan |
| 2026-11-15 | `python -m venv ai-service/.venv` lalu `ai-service/.venv/Scripts/python.exe -m pip install -r ai-service/requirements.txt` | PASS | FastAPI 0.163.0 + Uvicorn 0.54.0 terpasang; tanpa model AI |
| 2026-11-15 | `npm start --prefix backend`; `npm run dev --prefix frontend`; `ai-service/.venv/Scripts/python.exe -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8000` | PASS | Proses siap di loopback port 3000, 5173, 8000 |
| 2026-11-15 | `npm run build --prefix frontend` | PASS | Vite menghasilkan bundle HTML/CSS/JS |
| 2026-11-15 | `node scripts/smoke.mjs` | PASS | 7 pemeriksaan status HTTP dan JSON: FastAPI langsung, Express, serta proxy Vite |
| 2026-11-15 | Hentikan FastAPI; `node scripts/smoke.mjs --ai-unavailable` | PASS | 6 pemeriksaan; integrasi HTTP 503, Express tetap HTTP 200 |
| 2026-11-15 | Browser `http://127.0.0.1:5173`, klik Periksa ulang | PASS | Status sukses/gagal sesuai layanan nyata; screenshot desktop 1365×768 dan mobile 390×844; mobile tanpa overflow horizontal |
| 2026-11-15 | Jalankan kembali FastAPI; klik Periksa ulang | PASS | UI pulih tanpa restart Express; tombol kembali aktif |
| 2026-11-15 | Model AI, upload/kamera, ekstraksi, unduhan, pixelation | NOT RUN | Belum diimplementasikan; di luar M1 |

## Cara memperbarui dokumen

Setelah satu tugas selesai: ubah status berdasarkan **bukti tes**, catat file diubah, hasil perintah, kendala, dan satu next task. Selaraskan `HANDOFF.md`. Jangan menulis PASS jika tidak benar-benar menjalankan tes.
