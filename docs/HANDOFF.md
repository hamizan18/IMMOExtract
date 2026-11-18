# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — helper Classic Pixelation RGBA deterministik dan verifikasi piksel/alpha, 2026-11-18.

## Current milestone

**M5 — Classic Pixelation Studio — In progress.**
M4 selesai pada jalur Windows lokal teruji. Tugas pertama M5 menyediakan helper internal satu PNG; endpoint, penyimpanan hasil turunan, UI Studio dan palet belum tersedia.

## Last completed task

- `backend/src/pixelation.js`: `await pixelatePng(inputBuffer, size)` → buffer PNG RGBA baru, tanpa file I/O atau modifikasi original.
- Size angka 16/32/64/128 adalah sisi output terpanjang; sisi lain round/minimum 1. Input kecil diperbesar, tanpa crop/padding atau resize kembali ke ukuran awal.
- Sharp existing decode/encode; sampling nearest pusat menyalin RGBA utuh agar RGB pada alpha rendah/nol tidak berubah karena premultiplication. Tepat pada batas piksel, pilih indeks lebih besar.
- Kontrak input internal: PNG objek RGBA8 statis tervalidasi, bukan path client atau pengganti validasi upload. Batas 8192 per sisi/24 megapiksel mengikuti pipeline existing.
- Lima tes baru mencakup fidelity RGBA/alpha, geometri, input invalid, determinisme dan original tidak berubah. D-027 mencatat kontrak serta perbedaan tie-breaking Pillow; tidak mengubah dependensi/stack.

## Current task

Helper dasar selesai dan terverifikasi sesuai kontrak sampling pusat. Berikutnya satu integrasi API/persistensi hasil pixelation berbasis manifest; jangan membuat UI Studio atau palet sekaligus.

## Working components

- `pixelatePng` menghasilkan PNG 16/32/64/128 dengan dimensi rasio aspek terbulatkan, tanpa blending, flatten atau quantization.
- Tes unit terarah 5/5 PASS. Smoke disk membuktikan byte original tidak berubah; output ukuran 16/32/64 cocok penuh dengan Pillow NEAREST.
- Size 128 memiliki mismatch pembanding di satu kolom; diagnostik integer independen membuktikan seluruh 9856 piksel helper sesuai kontrak pusat. Detail bukti pada Tests performed dan D-027.
- Fixture/file temp dibersihkan melalui finally; diagnostik kedua seluruhnya in-memory. Tidak menjalankan layanan/browser/AI atau memakai foto pribadi.

## Modified files

- `backend/src/pixelation.js` — baru, helper pemrosesan PNG.
- `backend/test/pixelation.test.js` — baru, lima tes fidelity/geometri/input.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md` — kontrak D-027, bukti dan next task.

## Uncommitted changes / Git status

Inspeksi awal `git status --short`, `git diff --stat`, `git diff --cached --stat`, `git diff` bersih; catatan perubahan pending tugas UI ZIP sebelumnya sudah kedaluwarsa.

Dua file baru dan lima dokumen pada Modified files diubah pada sesi ini dan belum di-commit. Tidak staging/commit, instalasi atau download model. Tidak mengubah source existing frontend/backend/AI; Git tidak dijalankan ulang setelah edit.

## Current errors / limitations

- API/persistensi/preview/download pixelation dan UI Studio/palet belum tersedia; helper belum digunakan route. Pengguna browser belum dapat menjalankan pixelation.
- Smoke pembanding Pillow size 128 awal FAIL: 128 piksel pada kolom 38 berbeda, bukan alpha blending. Helper memilih source x=96 tepat pada batas pusat, Pillow memilih x=95. Seluruh output helper cocok oracle integer sesuai kontrak; tidak mengklaim hasil identik dengan Pillow untuk semua ukuran.
- Nearest-neighbour dapat menghilangkan detail tipis. Pembulatan grid memengaruhi rasio aspek; ini bukan rekonstruksi objek atau AI generatif.
- Input helper harus berasal dari PNG objek statis tervalidasi; caller harus menyelesaikan UUID/manifest/path aman sebelum membaca file. Jangan langsung menerima buffer/path publik tanpa validator yang sesuai.
- Decode RGBA membutuhkan memori mengikuti dimensi input; belum ada benchmark RAM puncak. Retensi/batas antrean/ekspor, riwayat UI, lisensi redistribusi checkpoint dan dukungan platform lain tetap terbuka.
- LSP tidak dikonfigurasi. Tidak ada perubahan simbol exported existing atau caller existing pada tugas helper ini.

## Tests performed

- **PASS** `node --test backend/test/pixelation.test.js`: 5/5, reduction nearest tanpa blending, alpha 0/1/127, RGB tersembunyi, enlargement, seluruh ukuran, portrait/landscape/square/sisi satu piksel, input invalid, determinisme dan original buffer tidak berubah.
- **FAIL pembanding 128** smoke `node --input-type=module` via stdin (cwd backend), Python `.venv-test`/Pillow: original disk byte-identical, size 16/32/64 cocok seluruh piksel Pillow; size 128 (77×128) berbeda. Cleanup file temp tetap berjalan.
- **PASS diagnosis** stdin Node/Python untuk size 128: seluruh 9856 piksel sesuai oracle integer `((2*x+1)*sourceWidth)//(2*outputWidth)` dan rumus setara y. Pillow berbeda hanya di kolom 38 (source x=95 versus kontrak x=96). Source aplikasi tidak diubah setelah diagnosis.
- **PASS** original buffer tetap identik pada diagnostik; file/fixture temp smoke dibersihkan. Tidak ada script sementara permanen.
- **NOT RUN** suite backend existing, AI, build/browser frontend, endpoint/UI pixelation. Tidak ada source existing yang diubah; tugas hanya helper internal, bukan fitur UI selesai.

## Next action (only one)

**Integrasikan API satu objek M5:** `POST /api/jobs/:id/pixelate` menerima object_id dan size untuk job completed. Gunakan resolver manifest existing, simpan PNG hasil/metadata privat terpisah dan sediakan preview/unduhan lewat ID hasil tervalidasi. Jangan menerima path client atau menimpa PNG/manifest original. Verifikasi HTTP nyata, dimensi/alpha, input/akses invalid serta PNG/ZIP original tetap identik. UI Studio dan palet tetap tugas terpisah.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
