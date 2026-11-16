# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — PNG/crop per kategori ATR, integrasi manifest job, dan perbaikan race polling manifest Windows, 2026-11-17.

## Current milestone

**M4 — Job, object gallery, download individual/ZIP — In progress.**
Orchestrator/polling, foreground manusia dan file PNG kategori terverifikasi. UI galeri serta preview/unduhan PNG job dan ZIP belum tersedia; jangan menandai M4 selesai atau mulai M5.

## Last completed task

- `save_category_objects()` memakai class map yang sudah dihasilkan SCHP; tidak melakukan inferensi kedua. Satu PNG per label ATR non-background dengan >50 piksel, mempertahankan ambang kategori lama.
- Crop bbox dengan padding 2 piksel, clipped ke dimensi input. RGB asli dipertahankan; alpha 255 hanya pada kelas tersebut, 0 pada background/kategori tetangga. Satu kelas disconnected tetap satu objek semantik; sepatu kiri/kanan tetap label berbeda.
- JSON `/extract-path` dan multipart `/extract` menerima `objects_dir`, termasuk ekspor kategori tanpa path foreground. Respons `objects` berisi hanya file yang selesai ditulis; opsi tidak diberikan/hasil tidak memenuhi ambang menghasilkan array kosong.
- AiClient meneruskan `objectsDir`; job manager menetapkan `<job>/objects`, memvalidasi label/class ID, inventaris lengkap, bbox, dimensi, pixel_count, path relatif tetap dan PNG RGBA yang benar-benar dapat didekode.
- Manifest mempertahankan foreground `human`, menambahkan UUID objek kategori beserta bbox/class_id/pixel_count. Polling tidak membocorkan file/path atau field arbitrer dari AI.
- Race Windows ditemukan pada suite: rename manifest gagal EPERM saat reader terbuka. Diagnostik syscall membuktikannya. Job aktif kini dipolling dari snapshot terakhir yang berhasil disimpan; terminal tetap dari disk. Tidak ada retry/delay atau pemalsuan sukses.
- D-022 mencatat kontrak dan alasan. Pipeline model, frontend, dependensi dan checkpoint tidak diganti.

## Current task

Tugas PNG kategori selesai dan diverifikasi. Berikutnya hanya penyajian PNG job individual berbasis manifest; UI/ZIP tetap terpisah.

## Working components

- Input/preview/upload M2 dan ekstraksi full-frame/base64 M3 tetap lolos tes relevan.
- Job queued → processing → completed/failed, antrean serial, restart, manifest privat dan polling.
- Model asli menghasilkan foreground + Upper-clothes dan Pants pada smoke sintetis; crop dan RGB/alpha diverifikasi terhadap input.
- Service uji FastAPI port 8018 sudah dihentikan, Express/storage/fixture temp dan script smoke dibersihkan. Jalankan ulang layanan sesuai README.

## Modified files

- `ai-service/extractor.py` — helper crop/export deterministik dan konstanta ambang bersama.
- `ai-service/main.py` — kontrak objects_dir/objects pada kedua endpoint.
- `ai-service/test_category_objects.py` — baru, tujuh tes tanpa checkpoint.
- `ai-service/test_api.py` — tujuh tes API model asli, termasuk kategori dan perilaku lama.
- `backend/src/ai-client.js` — pemetaan objectsDir.
- `backend/src/job-manager.js` — validasi artefak kategori dan snapshot polling Windows.
- `backend/test/jobs.test.js` — fixture kontrak baru, inventaris kategori nyata dan 34 kasus invalid.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` — kontrak aktual, batasan dan D-022.
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — bukti dan tugas berikutnya.

## Uncommitted changes / Git status

Inspeksi awal `git status --short`, `git diff --stat`, `git diff --cached --stat`, `git diff` bersih. Catatan uncommitted tugas sebelumnya sudah kedaluwarsa; tidak menimpa perubahan awal.

Sebelas file existing dan satu file baru dalam Modified files diubah pada sesi ini dan belum di-commit. Script sementara `backend/.smoke-category.mjs` sudah dihapus. Tidak menjalankan staging/commit otomatis, instalasi atau download model.

## Current errors / limitations

- Kegagalan EPERM suite awal sudah diperbaiki; suite akhir 69/69 PASS. Satu proses backend tetap harus menjadi pemilik storage.
- StarletteDeprecationWarning muncul pada TestClient/httpx; API 7/7 PASS. Tidak mengubah dependensi untuk warning ini.
- UI job/galeri, preview/unduhan job/ZIP, batas antrean dan retensi belum tersedia. Ekstraksi sinkron M3 tetap di luar antrean job.
- Kategori ≤50 piksel tidak punya file kategori tetapi masih ada pada foreground. Semantic mask bukan pemisahan instance; kualitas foto nyata/occlusion belum diuji pada sesi ini.
- Restart backend dan FastAPI bersama setelah pembaruan: job baru mensyaratkan kontrak objects AI. Job lama tidak dimigrasikan dan tidak dibuatkan kategori palsu.
- Startup `server.js` masih memakai `AI_HEALTH_TIMEOUT_MS` untuk client AI bersama (default 3000 ms); smoke memakai 30000 ms. Lisensi redistribusi checkpoint ATR belum terkonfirmasi.
- LSP tidak dikonfigurasi; referensi dicari setelah tool menyatakan server tidak tersedia.

## Tests performed

- **PASS** `ai-service/.venv-test/Scripts/python.exe -m unittest discover -s ai-service -p test_category_objects.py`: 7/7, tanpa model. RGB/alpha asli, padding/clipping, sepatu kiri/kanan, kelas disconnected, 50/51, kosong/tiny, storage failure.
- **PASS** `ai-service/.venv-test/Scripts/python.exe ai-service/test_api.py`: 7/7 dalam 16.576s dengan checkpoint asli. Kedua endpoint, ekspor kategori saja, opsi tidak diberikan, crop nyata dan full-frame/base64 lama.
- **FAIL lalu diperbaiki** `npm test --prefix backend` awal: EPERM pada rename manifest. Diagnostik Node dengan read handle terbuka membuktikan operasi penyebab; bukan kegagalan model.
- **PASS** `npm test --prefix backend` sesudah perbaikan snapshot: 69/69, termasuk seluruh tes upload/ekstraksi/job dan kategori.
- **PASS** `node .smoke-category.mjs` dari backend (script sementara): FastAPI nyata 8018 + Express port dinamis, queued → processing → completed, inferensi 2.3621s. Manifest tiga objek: human, Upper-clothes (104×85; 7547 piksel), Pants (94×104; 7989 piksel). RGB tepat, alpha biner/disjoint/subset foreground, respons publik tanpa file/path.
- **PASS** cleanup server dan storage/fixture/script sementara. Tidak mengakses foto pribadi.
- **NOT RUN** browser/build frontend, kualitas foto nyata, preview/unduhan job/ZIP. Frontend tidak berubah; fitur tersebut belum diimplementasikan pada tugas ini.

## Next action (only one)

**Implementasikan penyajian PNG job individual berdasarkan manifest:** preview `GET /api/jobs/:id/objects/:objectId` dan attachment `GET /api/jobs/:id/objects/:objectId/download`. Batasi ke job completed dan object ID yang terdaftar, tanpa path dari client/static storage. Verifikasi foreground dan crop kategori serta penolakan ID invalid/tidak dikenal dan file hilang. Jangan mulai UI, ZIP atau M5 pada tugas ini.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
