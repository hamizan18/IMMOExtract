# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** ikuti konteks AGENTS dan dokumen proyek. Implementasi M1–M7 ditutup D-047; kedua temuan mask (klik penghapus dan kuas Pulihkan) kini diperbaiki. Regresi mask dengan AI mock bukan bukti seluruh MVP bebas bug.

## Last agent

OMP — verifikasi dan perbaikan kuas Pulihkan, 2026-11-22.

## Current milestone / task

M7 — penerimaan lokal pascapenutupan implementasi. Perbaikan Pulihkan selesai; berikutnya sinkronisasi status README/ARCHITECTURE. Tidak ada fitur/milestone baru.

## Last completed task

- Git awal/index bersih; kontrak D-044 dan source mask diperiksa. LSP tidak dikonfigurasi.
- Regresi baru membuktikan kegagalan klik restore: piksel tetap `[0,0,0,0]`, bukan RGBA sumber `[100,150,240,255]`.
- Penyebab: `clip()` memakai area isi path, bukan outline `stroke()` pada garis terbuka. Pulihkan kini membentuk lingkaran saat klik/kapsul saat drag, lalu menyalin crop sumber dengan komposisi `copy`.
- Komposisi tersebut mengganti alpha sumber, termasuk transparan/parsial, tanpa stroke hitam atau alpha menumpuk pada sapuan ulang. Bbox, Undo, save dan backend tidak diubah.
- Regresi memakai event mouse CDP, Canvas nyata, backend nyata dan decode PNG Sharp; AI mock dengan fixture gradien/alpha parsial, bukan inferensi SCHP/SD15.

## Verified behavior

- Klik Pulihkan mengembalikan RGB/alpha foto sumber, sementara area luar radius tetap terhapus. Undo mengembalikan mask sebelumnya.
- Drag horizontal/diagonal memulihkan area kuas saja; alpha parsial tetap sama pada sapuan ulang dan sumber transparan tidak menjadi hitam.
- Objek crop memakai offset bbox yang benar. PNG foreground dan crop yang diunduh setelah save sesuai piksel hasil koreksi; area luar kuas tetap utuh.
- Acuan RGBA berasal dari Canvas foto sumber: transparansi parsial dapat membulatkan RGB akibat premultiplied-alpha. Tepi kuas mengikuti antialiasing; tidak mengklaim seluruh byte RGB file asli identik.
- Regresi penghapus serta alur spritesheet semua/pilihan, atlas, unduhan HTTP, reset dan pemeriksaan console existing tetap PASS.

## Modified files / uncommitted changes

- `frontend/src/extraction-workspace.js` — clip lingkaran/kapsul dan komposisi copy untuk Pulihkan.
- `scripts/smoke_browser_m7.mjs` — fixture gradien/alpha parsial dan regresi Pulihkan/crop/PNG tersimpan.
- `docs/PROGRESS.md`, `docs/HANDOFF.md`, `docs/DECISIONS.md` — bukti aktual, tugas berikutnya dan klarifikasi mekanisme D-044.
- Artefak ignored: build `frontend/dist/` dan screenshot `scratch/proof_smoke_m7_spritesheet.png` diperbarui.
- Git awal bersih. Tidak staging/commit atau memeriksa Git ulang setelah edit; daftar di atas berdasarkan operasi sesi.
- Tidak ada perubahan dependensi, backend, model atau arsitektur service. D-044 diperbarui sesuai mekanisme kuas yang diperbaiki.

## Tests / checks performed

- **PASS:** `git status --short; git diff --stat; git diff; git diff --cached --stat` sebelum edit.
- **FAIL / repro:** `node scripts/smoke_browser_m7.mjs` sebelum perbaikan: klik restore tetap RGBA nol.
- **PASS build:** `npm run build --prefix frontend` (126 ms). Run browser sesudahnya mencapai probe crop, lalu **ERROR harness**: probe y=100 di luar crop tinggi 100; diperbaiki ke y=95 yang valid dan tetap di luar kuas.
- **PASS final:** `node scripts/smoke_browser_m7.mjs` (5,98 s). Log: `PASS: Restore click/drag, source RGBA, bounds, Undo, repeated alpha, bbox and saved PNG.` Penghapus/spritesheet/reset juga lulus.
- **NOT RUN:** SCHP/SD15 nyata, kamera dan suite backend/Python. Perubahan lokal frontend; AI mock tidak diklaim sebagai AI nyata.
- **PASS cleanup:** socket checks memastikan semua enam port server dari tiga run tertutup. Harness memakai temporary storage; storage pengguna tidak disentuh. Screenshot generated ada di scratch; bukti mask utama adalah piksel Canvas/PNG.

## Current errors / limitations

- **RESOLVED:** penghapus klik dan kuas Pulihkan. RGB/alpha, area kuas, Undo, crop serta PNG tersimpan lulus regresi terarah.
- Batas Canvas: normalisasi premultiplied-alpha dapat membulatkan RGB parsial dan tepi kuas memakai antialiasing; pengujian membandingkan dengan foto sumber yang dirender Canvas.
- Fixture sintetis/AI mock bukan bukti kualitas foto nyata. SD15 tetap memiliki risiko memori/latensi historis; tidak dimuat.
- Retensi otomatis belum tersedia. Beberapa narasi historis README/ARCHITECTURE merujuk tahap lama; gunakan bukti terbaru.

## Next action (only one)

Selaraskan README dan ARCHITECTURE dengan status implementasi/penerimaan terbaru. Hapus narasi fitur yang sudah tersedia sebagai belum tersedia, pertahankan batas SD15/retensi/kualitas foto nyata, dan bedakan AI mock dari inferensi nyata. Gunakan bukti PROGRESS/HANDOFF; tidak perlu suite luas atau memuat model.

## Handoff rules

1. Periksa repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat PASS/FAIL/NOT RUN aktual; dokumentasi bukan pengganti runtime.
4. Perbarui PROGRESS/HANDOFF; keputusan arsitektur baru dicatat di DECISIONS.
5. Claude Website perlu file relevan; jangan kirim foto pribadi, `.env` atau checkpoint.
