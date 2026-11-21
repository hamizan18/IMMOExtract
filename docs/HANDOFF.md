# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — penyelesaian Hardening Fitur Ekspor Selective ZIP (FR-08: streaming SHA-256 checksum on-the-fly, validasi ukuran arsip `size > 0`, penyimpanan `files_count`/`archive_size`/`sha256` di manifest ekspor, endpoint metadata `GET /api/jobs/:id/exports/:exportId`), modul test baru `backend/test/zip-export.test.js`, dan verifikasi menyeluruh seluruh test suite backend (119/119 PASS), AI API (14/14 PASS), frontend build (126ms), serta Automated CDP Browser Smoke Test (13/13 stages PASS), 2026-11-21 (D-046).

## Current milestone

**M7 — In progress (tahap finalisasi).** Seluruh fitur fungsional utama M7 (Generator Spritesheet Statis FR-13 dan Hardening Selective ZIP FR-08) telah selesai diimplementasikan dan terverifikasi penuh di lingkungan lokal. Tahap berikutnya adalah finalisasi penutupan rilis MVP.

## Last completed task

- **Hardening Fitur Ekspor Selective ZIP & Endpoint Metadata (FR-08, D-046):**
  - **Streaming Checksum & Validasi Ukuran (`backend/src/zip-export.js`):**
    - Menghitung streaming SHA-256 on-the-fly via `archive.on('data', chunk => hash.update(chunk))` tanpa membaca ulang bitstream dari disk.
    - Menolak pembentukan arsip berukuran 0 byte (`fileStat.size === 0`) dengan error eksplisit.
    - Mengembalikan objek ringkas `{ size: fileStat.size, sha256: hash.digest('hex') }`.
  - **Penyimpanan Metadata & Endpoint REST (`backend/src/job-manager.js`, `backend/src/jobs.js`):**
    - Menyimpan atribut `files_count`, `archive_size`, dan `sha256` pada file privat `<jobDirectory>/exports/<exportId>/manifest.json`.
    - Menyediakan method `getExportManifest(jobId, exportId)` yang memvalidasi integritas manifest ekspor dan job induk.
    - Menambahkan endpoint REST `GET /api/jobs/:id/exports/:exportId` yang mengembalikan JSON metadata ekspor dan `download_url`.
  - **Unit Test & Integration Test (`backend/test/zip-export.test.js`, `backend/test/jobs.test.js`):**
    - Memverifikasi STORE mode tanpa re-kompresi deflasi, pencocokan exact byte payload via Python `zipfile.ZipFile.testzip()`, penolakan atomik pada missing files (`ENOENT`), serta konkurensi pembuatan beberapa ZIP simultan.
    - Menguji endpoint metadata `GET /api/jobs/:id/exports/:exportId` (status 200, penolakan UUID salah 400, ekspor fiktif 404, serta akses lintas job 404).

## Current task

Pembersihan workspace dari file temporer, audit status seluruh acceptance criteria M1–M7, dan penyusunan dokumentasi penutupan rilis MVP.

## Working components

- Pipeline ekstraksi objek berbasis SCHP ATR-18 (M3/M4) dengan galeri objek interaktif dan unduhan PNG/ZIP.
- Classic Pixelation Studio (M5) dengan 4 ukuran grid (16, 32, 64, 128) dan palet Retro 16 opsional.
- AI Pixel Art Stylization (M6) berbasis pipeline lokal SD15 CPU FP32, FIFO orchestrator, polling serial, preview transparansi, dan unduhan attachment.
- Mask Correction Tool (FR-12): Canvas brush/eraser manual interaktif dengan pemulihan instan foto asli dan endpoint revisi objek `PUT`.
- Generator Spritesheet Statis & Atlas JSON (FR-13): komposisi Sharp transparan, TexturePacker atlas format, preview live dan unduhan PNG/Atlas.
- Hardened Selective ZIP Export (FR-08): streaming SHA-256, ukuran non-nol, metadata endpoint, dan download ZIP STORE mode.
- Automated headless browser smoke test runner berbasis CDP (`scratch/smoke_browser_m7.mjs`).

## Modified files

- `backend/src/zip-export.js` — Streaming SHA-256 checksum on-the-fly dan pencegahan arsip kosong.
- `backend/src/job-manager.js` — Penyimpanan `files_count`, `archive_size`, `sha256` di manifest ekspor dan method `getExportManifest`.
- `backend/src/jobs.js` — Endpoint metadata `GET /api/jobs/:id/exports/:exportId`.
- `backend/test/zip-export.test.js` — Unit test suite untuk modul `writeZip` (STORE mode, byte exactness via Python zipfile, missing file failure, dan konkurensi).
- `backend/test/jobs.test.js` — Asersi metadata ekspor dan pengujian endpoint `GET /api/jobs/:id/exports/:exportId`.
- `docs/DECISIONS.md` — Keputusan D-046 dicatat.
- `docs/PROGRESS.md` — Progres Milestone M7 diperbarui; hasil verifikasi 119 backend tests dan test runner dicatat.
- `docs/HANDOFF.md` — Status handoff disinkronkan ke kondisi kode dan pengujian terkini.

## Uncommitted changes / Git status

- Working tree memuat modifikasi pada file-file di atas.
- Tidak ada commit otomatis (sesuai aturan `AGENTS.md`). Menunggu instruksi commit dari pengguna.

## Current errors / limitations

- Batas Commit Limit OS saat ini (14.81 GiB) dengan commit dasar OS/aplikasi (~5.5–6.0 GiB) menyisakan CommitAvail ~8.8–9.3 GiB, yang berpotensi menyentuh batas guard 1 GiB saat UNet forward pass jika ada beban memori lain. Penambahan Virtual Memory Windows (+4–8 GB Paging File di Drive D:) disarankan jika pengguna ingin menjalankan inferensi AI SD15 rutin.
- Spritesheet saat ini menggabungkan aset objek kanonikal hasil ekstraksi (termasuk yang sudah dikoreksi via Mask Correction).

## Tests / checks performed

- **PASS:** `node --test backend/test/zip-export.test.js` — 3/3 tests PASS dalam 564ms (STORE mode, exact byte verification via Python zipfile, missing entry atomic rejection, safe concurrent exports).
- **PASS:** `node --test backend/test/spritesheet.test.js backend/test/zip-export.test.js backend/test/ai-client.test.js backend/test/stylizations.test.js backend/test/jobs.test.js backend/test/extractions.test.js backend/test/pixelation.test.js` — 119/119 tests PASS dalam 8.24s (0 fail, 0 skip).
- **PASS:** `node --test backend/test/jobs.test.js` — 25 subtest, 59/59 tests PASS dalam 7.62s.
- **PASS:** `ai-service\.venv-test\Scripts\python.exe -u -B -m unittest discover -s ai-service -p test_api.py -v` — 14/14 tests PASS dalam 9.35s.
- **PASS:** `npm run build --prefix frontend` — Vite build PASS (7 modul dalam 126ms).
- **PASS:** Automated Headless Browser Smoke Test M7 (`scratch/smoke_browser_m7.mjs`) — 13/13 stages PASS dalam 18 detik (0 console error).

## Next action (only one)

Lakukan finalisasi penutupan rilis Milestone M7: pembersihan workspace dari file temporer, audit status seluruh acceptance criteria M1–M7, dan penyusunan catatan rilis MVP.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
