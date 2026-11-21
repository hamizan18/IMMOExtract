# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

Antigravity CLI — implementasi penuh Mask Correction Tool (FR-12: Canvas Brush/Eraser interaktif di modal `<dialog id="mask-editor-dialog">`, endpoint `PUT /api/jobs/:id/objects/:objectId`, validasi defensif Sharp RGBA exact, penulisan atomik, dan sinkronisasi ke M5/M6/ZIP) serta verifikasi end-to-end Automated Headless Browser Smoke Test via Chrome CDP (D-044), 2026-11-21. Seluruh test suite backend (111/111 PASS), AI API (14/14 PASS), frontend build (197ms), dan browser CDP smoke test (13/13 stages PASS) terkonfirmasi lulus 100%.

## Current milestone

**M6 — Completed** (Windows lokal terverifikasi). Milestone M6 (AI Pixel Art Stylization dan Mask Correction FR-12) telah selesai sepenuhnya. Proyek siap melangkah ke Milestone M7 (Spritesheet statis, Selective ZIP hardening, release documentation).

## Last completed task

- **Mask Correction Tool (FR-12) & Verifikasi Headless Browser CDP (D-044):**
  - **Backend (`job-manager.js`, `jobs.js`, `jobs.test.js`):**
    - Menambahkan rute `PUT /api/jobs/:id/objects/:objectId` menerima raw binary PNG (limit 10 MB).
    - Memvalidasi job `completed`, format PNG 4-channel RGBA (`channels === 4`, `hasAlpha === true`), dimensi exact sesuai metadata objek, dekompresi piksel penuh, penulisan atomik via `<objectId>.png.tmp`, dan penghitungan ulang piksel opaque (`alpha > 0`).
    - Subtest ke-24 `jobs.test.js` (58/58 tests) menguji penolakan dimensi salah, non-RGBA, file korup, dan keberhasilan update live.
  - **Frontend (`index.html`, `extraction-workspace.js`):**
    - Tombol `Koreksi Mask` per kartu objek membuka modal HTML5 `<dialog id="mask-editor-dialog">`.
    - Toolbar interaktif: alat Penghapus (transparan via `destination-out`), Kuas Pulihkan (memulihkan foto asli secara instan via clipping canvas dan drawImage dari gambar sumber), slider ukuran kuas 2–60 px, tombol Undo (stack riwayat ImageData), Reset, Batal, dan Simpan Koreksi.
    - Simpan mengirim PNG hasil edit ke backend, memperbarui gambar kartu dan link unduh asli dengan query `?t=${Date.now()}`.
    - Objek terkoreksi langsung terdistribusi otomatis ke fitur Classic Pixelation (M5) dan AI Stylization (M6).
  - **Verifikasi Aktual (All PASS):**
    - Automated Headless Browser Smoke Test via CDP: 13/13 stages PASS 100% (termasuk goresan kuas, undo, simpan PUT, update DOM live, stylize objek terkoreksi, dan download attachment).
    - Vite build: PASS (7 modul, 197ms).
    - Test suite backend: 111/111 tests PASS.
    - AI Service unit tests: 14/14 tests PASS.

## Current task

Milestone M6 selesai sepenuhnya. Bersiap untuk memulai Milestone M7 (Spritesheet statis, Selective ZIP hardening, release documentation).

## Working components

- Pipeline ekstraksi objek berbasis SCHP ATR-18 (M3/M4) dengan galeri objek interaktif dan unduhan PNG/ZIP.
- Classic Pixelation Studio (M5) dengan 4 ukuran grid (16, 32, 64, 128) dan palet Retro 16 opsional.
- AI Pixel Art Stylization (M6) berbasis pipeline lokal SD15 CPU FP32, FIFO orchestrator, polling serial, preview transparansi, dan unduhan attachment.
- Mask Correction Tool (FR-12): Canvas brush/eraser manual interaktif dengan pemulihan instan foto asli dan endpoint revisi objek `PUT`.
- Automated headless browser smoke test runner berbasis CDP (`scratch/smoke_browser_m6.mjs`).

## Modified files

- `backend/src/job-manager.js` — Implementasi `updateObject` dengan validasi Sharp defensif dan penulisan atomik.
- `backend/src/jobs.js` — Rute `PUT /api/jobs/:id/objects/:objectId`.
- `backend/test/jobs.test.js` — Subtest ke-24 verifikasi revisi objek dan integritas metadata.
- `frontend/index.html` — Modal `<dialog id="mask-editor-dialog">` dan tombol `Koreksi Mask`.
- `frontend/src/extraction-workspace.js` — Logika interaktif kanvas 2D (brush/eraser/undo/reset/save).
- `docs/DECISIONS.md` — Keputusan D-044 dicatat; checklist M6 diselesaikan.
- `docs/PROGRESS.md` — Status Milestone M6 diperbarui menjadi Complete; log verifikasi terintegrasi.
- `docs/HANDOFF.md` — Status handoff disinkronkan ke kondisi kode dan pengujian terkini.

## Uncommitted changes / Git status

- Working tree memuat modifikasi pada 8 file di atas.
- Tidak ada commit otomatis (sesuai aturan `AGENTS.md`). Menunggu instruksi commit dari pengguna.

## Current errors / limitations

- Batas Commit Limit OS saat ini (14.81 GiB) dengan commit dasar OS/aplikasi (~5.5–6.0 GiB) menyisakan CommitAvail ~8.8–9.3 GiB, yang berpotensi menyentuh batas guard 1 GiB saat UNet forward pass jika ada beban memori lain. Penambahan Virtual Memory Windows (+4–8 GB Paging File di Drive D:) disarankan jika pengguna ingin menjalankan inferensi AI SD15 rutin.
- Spritesheet generator statis (M7) belum diimplementasikan.

## Tests / checks performed

- **PASS:** Automated Headless Browser Smoke Test (`smoke_browser_m6.mjs`) — 13/13 stages PASS dalam 16 detik (0 console error); screenshot `scratch/proof_smoke_m6_ui.png` tersimpan.
- **PASS:** `npm run build --prefix frontend` — Vite build PASS (7 modul dalam 197ms).
- **PASS:** `node --test backend/test/ai-client.test.js backend/test/stylizations.test.js backend/test/jobs.test.js backend/test/extractions.test.js backend/test/pixelation.test.js` — 111/111 tests PASS dalam 7.85s.
- **PASS:** `ai-service\.venv-test\Scripts\python.exe -u -B -m unittest discover -s ai-service -p test_api.py -v` — 14/14 tests PASS dalam 9.28s.
- **PASS:** `node --test backend/test/jobs.test.js` — 24 subtest, 58/58 tests PASS dalam 7.72s.

## Next action (only one)

Rancang dan implementasikan generator Spritesheet statis untuk menggabungkan aset objek hasil ekstraksi/pixelation/stylization ke dalam satu lembar gambar bergrid PNG transparan beserta metadata JSON manifest (tahap awal Milestone M7).

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
