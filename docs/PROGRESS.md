# IMMOExtract — Progress Tracker

> **Status aktual:** M1 selesai; tugas pertama M2 (pilih gambar dan preview lokal) selesai serta terverifikasi pada 2026-11-15. M2 secara keseluruhan belum selesai; tidak ada model AI.

## Ringkasan

- **Current milestone:** M2 — Input gambar — In progress.
- **Current task:** Pemilihan gambar dan preview lokal selesai; belum ada upload server atau kamera.
- **Overall status:** Fondasi layanan dan preview lokal berjalan; pipeline ekstraksi belum tersedia.
- **Last verification:** 2026-11-15 — build frontend; browser: file valid/tidak valid, hapus/pilih ulang, race decode, cleanup URL, tanpa upload HTTP, desktop/mobile, serta tombol health.

## Milestone

| Milestone | Cakupan | Status | Kriteria selesai |
| --- | --- | --- | --- |
| M1 | Struktur repo, frontend, Express, FastAPI, health checks | Complete | Frontend dibuka di browser; kedua health checks dan Express → FastAPI lulus; kegagalan/pemulihan diuji |
| M2 | Upload, kamera, validasi, preview input | In progress | Pemilihan/preview lokal teruji; kamera dan validasi upload server belum tersedia |
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
- Tugas pertama M2: input satu JPG/PNG/WebP, preview lokal, metadata, hapus/pilih ulang, pesan error, batas ukuran/dimensi sementara; tidak mengirim foto ke server.
- Perubahan tugas M2 ini: `frontend/index.html`, `frontend/src/main.js`, modul baru `frontend/src/image-input.js`; `README.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`. Backend, FastAPI, dependensi, dan spesifikasi produk tidak diubah.
- Inspeksi Git tugas M2: branch `main...origin/main`, perubahan awal hanya `docs/PROGRESS.md` dan `docs/HANDOFF.md`, tidak ada staged diff. Perubahan awal dipertahankan; tidak menjalankan staging/commit.

## In progress

- M2 masih parsial: kamera serta penerimaan/validasi upload server belum dikerjakan. Tugas preview lokal selesai.

## Blockers / risks

- Kemampuan hardware untuk SCHP/AI generatif belum diukur.
- Python 3.14.3 teruji untuk FastAPI M1 saja, bukan bukti kompatibilitas PyTorch/SCHP.
- Pengujian Windows lokal saja; Linux/macOS dan deployment produksi belum diuji.
- Checkpoint model belum dipilih/diunduh/diuji.
- Batas dimensi preview diperiksa setelah decode browser; bukan perlindungan decompression bomb atau pengganti validasi server. Batas sementara dicatat di D-011, bukan benchmark.
- Setelah verifikasi awal, supervisor Express/Vite melaporkan exit 127 tanpa penyebab pada log. Keduanya dijalankan ulang; smoke HTTP kembali PASS. Wrapper backend baru exit 0 meskipun endpoint masih berfungsi. Keberlangsungan proses tool lintas sesi tidak dijamin; startup terminal pengguna tersedia di README.
- Jangan menandai fitur M3–M7 sebagai selesai hanya karena dokumentasinya ada.

## Next task — satu tugas saja

Tambahkan pengambilan gambar kamera browser dengan izin pengguna ke preview lokal M2, termasuk penanganan izin ditolak dan penghentian stream; jangan mulai upload server/model AI pada tugas tersebut.

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
| 2026-11-15 | Restart Express/Vite setelah laporan supervisor exit 127; `node scripts/smoke.mjs` | PASS | 7 pemeriksaan HTTP/JSON kembali sukses; penyebab exit supervisor belum diketahui |
| 2026-11-15 | M2: `npm run build --prefix frontend` | PASS | Vite memproses 6 modul dan menghasilkan bundle |
| 2026-11-15 | Browser aktual: `uploadFile` ke input dengan fixture sintetis JPEG, PNG, WebP 160×100 | PASS | Preview, metadata, dan object URL sesuai; tidak memakai foto pribadi |
| 2026-11-15 | Browser: teks `.png`, MIME/signature berbeda, file kosong, PNG rusak, >10 MiB, sisi 8193, 5000×5000 piksel | PASS | Ketujuh input ditolak; preview lama dibersihkan |
| 2026-11-15 | Browser: hapus, pilih file yang sama, pantau HTTP selama memilih gambar | PASS | Reset berfungsi; tidak ada request HTTP dari pemilihan gambar |
| 2026-11-15 | Harness race pertama: `tab.waitFor` dengan ekspresi JS | ERROR harness | Helper menganggap ekspresi sebagai selector; diperbaiki ke `page.waitForFunction`, bukan perubahan source |
| 2026-11-15 | Browser: tunda penyelesaian decode asli, ganti gambar/hapus; lacak create/revoke object URL | PASS | Pilihan terbaru menang, hasil lama tidak muncul lagi, URL dibebaskan |
| 2026-11-15 | Screenshot desktop 1365×768 dan mobile 390×844; tombol Periksa ulang | PASS | Preview terlihat, mobile tanpa overflow horizontal, health tetap terhubung |
| 2026-11-15 | Kamera, upload server, model AI dan pipeline ekstraksi | NOT RUN | Di luar tugas preview; belum diimplementasikan |

Fixture sintetis sementara di folder temp telah dihapus. Pengujian browser dijalankan melalui harness sesi, bukan test suite permanen baru.

## Cara memperbarui dokumen

Setelah satu tugas selesai: ubah status berdasarkan **bukti tes**, catat file diubah, hasil perintah, kendala, dan satu next task. Selaraskan `HANDOFF.md`. Jangan menulis PASS jika tidak benar-benar menjalankan tes.
