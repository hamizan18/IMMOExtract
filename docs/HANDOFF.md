# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — implementasi penuh Generator Spritesheet Statis dan Atlas JSON (FR-13: modul `packSpritesheet`, endpoint Express `POST /api/jobs/:id/spritesheet`, endpoint serving inline/attachment PNG dan Atlas JSON, UI konfigurasi padding/kolom, preview spritesheet dan tombol unduh) serta verifikasi end-to-end Automated Headless Browser Smoke Test via Chrome CDP (D-045), 2026-11-21. Seluruh test suite backend (116/116 PASS), AI API (14/14 PASS), frontend build (118ms), dan browser CDP smoke test (13/13 stages PASS) terkonfirmasi lulus 100%.

## Current milestone

**M7 — In progress.** Milestone M7 tahap awal (Generator Spritesheet Statis FR-13) telah selesai diimplementasikan dan terverifikasi penuh di browser nyata via CDP. Tahap berikutnya adalah hardening ekspor Selective ZIP dan penyiapan dokumentasi rilis akhir.

## Last completed task

- **Generator Spritesheet Statis & Atlas JSON (FR-13, D-045):**
  - **Modul Helper (`backend/src/spritesheet.js`, `backend/test/spritesheet.test.js`):**
    - Fungsi `packSpritesheet(items, options)` menyusun gambar objek ke grid dinamis dengan padding (0–64) dan kolom (1–16).
    - Menghitung dimensi sheet dan posisi tiap frame $(x, y, w, h)$.
    - Kanvas transparan RGBA (`channels: 4`, `background: { r: 0, g: 0, b: 0, alpha: 0 }`) di-composite via Sharp dengan kompresi level 9.
    - Menghasilkan metadata TexturePacker / PixiJS / Phaser JSON standard (`meta` dan `frames`).
    - Unit test `spritesheet.test.js` (4/4 PASS).
  - **Backend (`job-manager.js`, `jobs.js`, `jobs.test.js`):**
    - `POST /api/jobs/:id/spritesheet` menerima `{ all: true }` atau `{ object_ids: [...] }` dengan parameter `padding` dan `columns`.
    - Menyimpan snapshot di direktori privat `<jobDirectory>/spritesheets/<id>/` (`spritesheet.png`, `atlas.json`, `manifest.json`).
    - Menyajikan rute inline dan attachment download untuk PNG spritesheet dan file JSON atlas.
    - Subtest ke-25 `jobs.test.js` (59/59 tests) menguji all/selection, padding, columns, validasi 400/404/409/415, dan integritas file.
  - **Frontend (`index.html`, `extraction-workspace.js`):**
    - Menambahkan fieldset "Ekspor Spritesheet Statis (M7)" dengan input padding dan kolom.
    - Tombol `Spritesheet Pilihan` dan `Spritesheet Semua`.
    - Preview gambar spritesheet di atas grid transparansi, info dimensi dan jumlah objek, serta tombol unduh PNG dan Atlas JSON.
  - **Verifikasi Aktual (All PASS):**
    - Automated Headless Browser Smoke Test via CDP (`scratch/smoke_browser_m7.mjs`): 13/13 stages PASS 100% (verifikasi preview 318×312, unduhan PNG 1290 byte, unduhan Atlas JSON 2 frame, spritesheet pilihan 1 frame, reset cleanup, dan 0 console error).
    - Vite build: PASS (7 modul, 118ms).
    - Test suite backend: 116/116 tests PASS dalam 7.89s.
    - AI Service unit tests: 14/14 tests PASS dalam 10.05s.

## Current task

Implementasi Spritesheet statis (FR-13) selesai. Melanjutkan ke hardening dan pengujian komprehensif Selective ZIP (FR-08) pada Milestone M7.

## Working components

- Pipeline ekstraksi objek berbasis SCHP ATR-18 (M3/M4) dengan galeri objek interaktif dan unduhan PNG/ZIP.
- Classic Pixelation Studio (M5) dengan 4 ukuran grid (16, 32, 64, 128) dan palet Retro 16 opsional.
- AI Pixel Art Stylization (M6) berbasis pipeline lokal SD15 CPU FP32, FIFO orchestrator, polling serial, preview transparansi, dan unduhan attachment.
- Mask Correction Tool (FR-12): Canvas brush/eraser manual interaktif dengan pemulihan instan foto asli dan endpoint revisi objek `PUT`.
- Generator Spritesheet Statis & Atlas JSON (FR-13): komposisi Sharp transparan, TexturePacker atlas format, preview live dan unduhan PNG/Atlas.
- Automated headless browser smoke test runner berbasis CDP (`scratch/smoke_browser_m7.mjs`).

## Modified files

- `backend/src/spritesheet.js` — Helper baru untuk packing spritesheet dan generasi atlas JSON.
- `backend/test/spritesheet.test.js` — Unit test suite untuk layout dan validasi spritesheet.
- `backend/src/job-manager.js` — Metode `createSpritesheet`, `getSpritesheet`, `getSpritesheetFile`, dan `getSpritesheetAtlas`.
- `backend/src/jobs.js` — Rute `POST /:id/spritesheet` dan 4 rute GET serving file/atlas.
- `backend/test/jobs.test.js` — Subtest ke-25 integrasi endpoint spritesheet.
- `frontend/index.html` — Fieldset "Ekspor Spritesheet Statis (M7)" dan kontrol toolbar.
- `frontend/src/extraction-workspace.js` — Logika interaktif pembuatan spritesheet dan binding DOM.
- `.gitignore` — Tambahkan `scratch/` ke daftar abaikan Git.
- `docs/DECISIONS.md` — Keputusan D-045 dicatat.
- `docs/PROGRESS.md` — Progres Milestone M7 diperbarui; status FR-13 dicatat complete.
- `docs/HANDOFF.md` — Status handoff disinkronkan ke kondisi kode dan pengujian terkini.

## Uncommitted changes / Git status

- Working tree memuat modifikasi pada file-file di atas.
- Tidak ada commit otomatis (sesuai aturan `AGENTS.md`). Menunggu instruksi commit dari pengguna.

## Current errors / limitations

- Batas Commit Limit OS saat ini (14.81 GiB) dengan commit dasar OS/aplikasi (~5.5–6.0 GiB) menyisakan CommitAvail ~8.8–9.3 GiB, yang berpotensi menyentuh batas guard 1 GiB saat UNet forward pass jika ada beban memori lain. Penambahan Virtual Memory Windows (+4–8 GB Paging File di Drive D:) disarankan jika pengguna ingin menjalankan inferensi AI SD15 rutin.
- Spritesheet saat ini menggabungkan aset objek kanonikal hasil ekstraksi (termasuk yang sudah dikoreksi via Mask Correction).

## Tests / checks performed

- **PASS:** Automated Headless Browser Smoke Test M7 (`scratch/smoke_browser_m7.mjs`) — 13/13 stages PASS dalam 21 detik (0 console error); screenshot `scratch/proof_smoke_m7_spritesheet.png` tersimpan.
- **PASS:** `npm run build --prefix frontend` — Vite build PASS (7 modul dalam 118ms).
- **PASS:** `node --test backend/test/spritesheet.test.js backend/test/ai-client.test.js backend/test/stylizations.test.js backend/test/jobs.test.js backend/test/extractions.test.js backend/test/pixelation.test.js` — 116/116 tests PASS dalam 7.89s.
- **PASS:** `node --test backend/test/spritesheet.test.js` — 4/4 tests PASS dalam 212ms.
- **PASS:** `node --test backend/test/jobs.test.js` — 25 subtest, 59/59 tests PASS dalam 7.23s.
- **PASS:** `ai-service\.venv-test\Scripts\python.exe -u -B -m unittest discover -s ai-service -p test_api.py -v` — 14/14 tests PASS dalam 10.05s.

## Next action (only one)

Lakukan hardening dan pengujian komprehensif pada fitur Selective ZIP (ekspor ZIP pilihan sebagian/semua objek), verifikasi konkurensi ekspor, integritas checksum/CRC arsip, serta penanganan kegagalan sumber yang tangguh (tahap lanjutan Milestone M7).

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
