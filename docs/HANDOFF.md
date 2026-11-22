# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** ikuti konteks AGENTS dan dokumen proyek. Implementasi M1–M7 ditutup D-047; penerimaan belum membuktikan seluruh fitur bebas bug. Temuan klik tunggal penghapus kini selesai.

## Last agent

OMP — perbaikan klik tunggal penghapus mask dan regresi browser, 2026-11-22.

## Current milestone / task

M7 — penerimaan lokal pascapenutupan implementasi. Perbaikan klik penghapus selesai; berikutnya verifikasi kuas Pulihkan. Tidak ada fitur/milestone baru.

## Last completed task

- Git awal/index bersih; source mask dan D-044 diperiksa. LSP tidak dikonfigurasi.
- `drawStroke()` pada penghapus kini menggambar disk arc/fill berjari-jari brush/2 dengan `destination-out` untuk dua titik identik. Stroke drag, Undo, save dan backend tidak diubah.
- Regresi menggunakan event mouse CDP asli, pemeriksaan piksel Canvas dan decode PNG dari endpoint download lewat Sharp.
- Harness existing dipindahkan dari ignored `scratch/smoke_browser_m7.mjs` ke `scripts/smoke_browser_m7.mjs` agar regresi dapat disimpan bersama source. Tanpa duplikasi/shim; folder output scratch dibuat bila belum ada.
- Harness memakai AI mock + frontend produksi + backend nyata, fixture/storage temporary dan browser terisolasi. Ini bukan inferensi SCHP/SD15 baru.

## Verified behavior

- Foreground fixture 200×300, brush 15 px: klik (100,150) mengubah alpha pusat dan (104,150) menjadi 0; titik luar radius (110,150) tetap 255.
- Undo mengembalikan alpha pusat 255; drag melintasi pusat menghapus alpha dan dapat di-Undo.
- Klik berikutnya dan save menghasilkan PNG unduhan 200×300 dengan alpha pusat 0 serta piksel luar radius 255.
- Alur existing spritesheet semua/pilihan, atlas, endpoint unduhan HTTP, reset dan pemeriksaan console tetap PASS.
- Bukti SCHP nyata ada pada log sesi penerimaan sebelumnya di PROGRESS; tidak dijalankan ulang.

## Modified files / uncommitted changes

- `frontend/src/extraction-workspace.js` — disk penghapus untuk titik identik.
- `scripts/smoke_browser_m7.mjs` — harness existing dari scratch, regresi penghapus dan mkdir output; berkas baru di lokasi yang tidak diabaikan Git.
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — status aktual dan bukti verifikasi.
- Artefak ignored: build `frontend/dist/` dan screenshot `scratch/proof_smoke_m7_spritesheet.png` diperbarui.
- Git awal bersih. Tidak staging/commit atau memeriksa Git ulang setelah edit; daftar di atas berdasarkan operasi sesi.
- Tidak ada perubahan dependensi, backend, model atau keputusan arsitektur; DECISIONS tidak diubah.

## Tests / checks performed

- **PASS:** `git status --short; git diff --stat; git diff; git diff --cached --stat` sebelum edit.
- **PASS:** `npm run build --prefix frontend && node scratch/smoke_browser_m7.mjs` sebelum pemindahan harness. Build tujuh modul dalam 188 ms; regresi penghapus dan spritesheet/reset lulus.
- **PASS:** `node scripts/smoke_browser_m7.mjs` setelah pemindahan dan mkdir output (4,99 s). Log: `PASS: eraser click radius, Undo, drag, and persisted PNG alpha.`
- Screenshot harness tersedia di `scratch/proof_smoke_m7_spritesheet.png`; bukti mask berupa piksel Canvas dan PNG dari server, bukan hanya screenshot.
- **NOT RUN:** kuas Pulihkan, SCHP/SD15 nyata, kamera, suite backend/Python; tidak diperlukan untuk perubahan lokal penghapus.
- Harness menutup server/browser dan membersihkan direktori temporary di finally; storage pengguna tidak disentuh.

## Current errors / limitations

- **RESOLVED:** klik tunggal penghapus tidak lagi memakai stroke panjang nol; radius, Undo, drag dan PNG tersimpan terbukti.
- Kuas Pulihkan tidak diubah atau diuji. Jangan menganggap pengujian penghapus membuktikan restore.
- Fixture sintetis/AI mock bukan bukti kualitas foto nyata. SD15 tetap memiliki risiko memori/latensi historis; tidak dimuat.
- Retensi otomatis belum tersedia. Beberapa narasi historis README/ARCHITECTURE merujuk tahap lama; gunakan bukti terbaru.

## Next action (only one)

Verifikasi kuas Pulihkan: setelah penghapusan area, klik dan drag harus mengembalikan RGB/alpha foto sumber hanya pada area brush. Periksa Undo dan PNG unduhan setelah save. Gunakan `scripts/smoke_browser_m7.mjs`/fixture lokal tanpa SD15. Bila gagal, catat piksel dan penyebab sebelum memperbaiki.

## Handoff rules

1. Periksa repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat PASS/FAIL/NOT RUN aktual; dokumentasi bukan pengganti runtime.
4. Perbarui PROGRESS/HANDOFF; keputusan arsitektur baru dicatat di DECISIONS.
5. Claude Website perlu file relevan; jangan kirim foto pribadi, `.env` atau checkpoint.
