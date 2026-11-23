# IMMOExtract — Architecture

> **Status:** Implementasi M1–M7 ditutup D-047. Penerimaan 2026-11-23 mencakup dua foto berizin, koreksi mask→PNG/ZIP, pixelation helper dan spritesheet helper/UI/API; bukan jaminan kualitas segmentasi umum, semua parameter AI atau deployment publik. RGB compositing spritesheet tidak selalu exact; retensi dan pergantian lifecycle model otomatis belum tersedia. Rincian bukti di `PROGRESS.md`.

## 1. Arsitektur tingkat tinggi

```text
[Browser: Vite + Vanilla JS + Tailwind]
             |
          HTTP API
             v
[Express.js — upload, jobs, download, ZIP, pixelation]
       |                         |
       | localhost HTTP         | private local storage
       v                         v
[FastAPI — local AI worker]    [storage/jobs/<job-id>/]
       |
       v
[SCHP ATR-18 CPU + Pillow/NumPy masks]
       |
       v
[PNG transparan / metadata kembali ke Express]

Stylization: Express -> FastAPI /stylize-path -> SD15 lokal CPU FP32 (service terpisah opsional)
```

Frontend tidak mengakses FastAPI atau filesystem lokal secara langsung. Browser hanya berbicara dengan Express. FastAPI hanya bind pada `127.0.0.1` saat semua komponen berada di mesin sama.

## 2. Batas tanggung jawab

| Komponen | Tanggung jawab | Tidak bertanggung jawab |
| --- | --- | --- |
| `frontend/` | UI, kamera, upload, preview, kontrol download, polling status | Menjalankan model AI server |
| `backend/` (Express) | Validasi, ID job, antrean sederhana, proxy AI, file/ZIP, pixelation | Melatih model AI |
| `ai-service/` (FastAPI) | Muat model, inferensi, mask, crop, hasil segmentasi | Autentikasi web, melayani file publik |
| `storage/` | File sementara input/mask/hasil per job | Direktori statis publik |
| `docs/` | Kebutuhan, keputusan, status, handoff | Menjadi pengganti pengujian |

## 3. Teknologi aktual

- Frontend: **Vite + Vanilla JavaScript + Tailwind CSS**.
- API: **Node.js + Express.js**.
- Upload: **Multer 2.5.0**, sesuai package/lockfile backend; klaim keamanan tidak hanya bergantung pada versi library.
- Image processing umum dan classic pixelation: **Sharp**.
- Export: **Archiver** untuk ZIP; **Sharp** untuk spritesheet PNG + atlas JSON.
- AI service: **Python + FastAPI + PyTorch**.
- Mask/extraction: **Pillow + NumPy**, tanpa kebutuhan OpenCV pada pipeline aktual.
- Parsing: **SCHP ATR-18 Human Parsing**, adaptasi pure-PyTorch CPU.
- ONNX Runtime belum diimplementasikan; bukan jalur inferensi aplikasi saat ini.
- Stylization: **SD15 lokal via Diffusers/Accelerate**, CPU FP32 dengan UNet disk-offload dan mitigasi loader Windows (D-037–D-039); bukan integrasi ComfyUI.
- Database: tidak ada pada MVP; metadata job file JSON lokal. SQLite hanya jika kebutuhan persisten muncul.

Versi dan keputusan runtime dicatat di `DECISIONS.md`; dependensi web memakai package-lock npm. Environment Python ekstraksi `.venv-test` dan stylization `.venv-stylization-poc` terpisah. Checkpoint disimpan lokal dan diabaikan Git; ketersediaan folder model tidak membuktikan keberhasilan inferensi.

## 4. Pemrosesan dan status job

**Kontrak orchestrator aktual (D-021/D-022):** `POST /api/jobs` menerima multipart `image` atau JSON `{"upload_id":"<uuid>"}`. HTTP 202 + Location setelah manifest queued tersimpan. FIFO satu worker per instance backend memanggil AI via shared path internal; `GET /api/jobs/:id` membaca status, progress tahap 0/10/100, timestamp, objek dan error aman. Manifest privat ditulis atomik via temporary file + rename. Polling job aktif memakai snapshot terakhir yang berhasil disimpan untuk menghindari konflik read/rename Windows; terminal dibaca dari disk. Satu proses backend memiliki storage; job interrupted saat restart menjadi failed tanpa retry, hasil terminal tetap tersedia. Endpoint sinkron M3 berada di luar antrean ini.

**Objek kategori aktual (D-022):** Backend memberikan `objects_dir=<job>/objects` ke FastAPI. Setelah satu inferensi, tiap label ATR non-background dengan >50 piksel disimpan ke `objects/atr-<class_id>.png`: crop bbox + padding 2 piksel yang terpotong pada batas input, RGB asli, alpha hanya kelas tersebut. Manifest mempertahankan foreground `human` dan menambahkan UUID objek, class_id, kategori, bbox `[left,top,right,bottom]` eksklusif, dimensi dan pixel_count setelah file serta metadata lolos validasi. Polling menghapus referensi file internal. Satu label adalah satu mask semantik, bukan satu instance. Tidak ada migrasi otomatis job lama.

**Penyajian objek aktual (D-023):** Preview dan attachment PNG memilih UUID objek dari manifest job completed. Manager memvalidasi ID, nama PNG hasil yang diizinkan, lokasi canonical tanpa pengalihan symlink/junction, dan regular file. Router mengirim file tanpa transformasi dengan disposition inline/attachment, nama UUID, `Cache-Control: no-store, private` dan `X-Content-Type-Options: nosniff`. Tidak menerima path client atau membuka static storage; file hilang menghasilkan 404 aman.

**Integrasi browser aktual (D-024):** Lifecycle `image-input.js` memanggil `setUploadedImage()` pada modul `extraction-workspace.js` saat reset dan upload sukses. Tombol ekstraksi mengirim hanya upload_id; polling GET serial tiap 1 detik sampai terminal, timeout request 15 detik. AbortController dan identitas operasi menolak respons usang. Putus polling menyediakan pemeriksaan manual job yang sama, bukan POST ulang. Galeri memakai metadata polling dan URL preview/download D-023; label melalui textContent, tanpa HTML dari respons. State job tidak dipulihkan setelah reload.

**Ekspor ZIP aktual (D-025):** POST ekspor menerima JSON all:true atau object_ids unik; hanya objek manifest job completed. Manager memakai resolusi PNG yang sama dengan unduhan individual, lalu Archiver 8 menulis ZIP streaming dengan metode STORE. Setiap ekspor memiliki UUID dan manifest privat sendiri di `<job>/exports/<export_id>/`; ZIP diselesaikan dahulu, manifest dipublikasikan terakhir melalui rename. Tidak menulis ulang manifest job. Respons 201 berisi download_url setelah semua selesai, bukan antrean ekspor baru.

**UI ZIP aktual (D-026):** Checkbox pada kartu galeri, jumlah pilihan dan tombol Unduh Pilihan/Semua memakai API D-025. Satu ekspor browser aktif; tombol/checkbox dikunci selama request. AbortController ekspor terpisah mengikuti reset upload yang sama; identitas operasi diperiksa setelah body JSON selesai agar respons lama tidak memicu unduhan. download_url wajib sesuai endpoint job/export UUID sebelum link native diklik. Link sukses dipertahankan untuk unduh ulang tanpa POST. Error tidak menghapus pilihan; timeout 15 detik, tanpa retry otomatis.

**Pemrosesan Classic Pixelation aktual (D-027/D-028/D-029/D-030):** `pixelatePng(Buffer, size, palette = 'original')` menerima PNG objek RGBA8 statis tervalidasi. Sharp decode/encode dengan batas 24 megapiksel/8192 per sisi. Sisi terpanjang 16/32/64/128, sisi lain round/minimum 1; tanpa crop/padding. Sampling pusat nearest menyalin RGBA tanpa premultiplication. Mode `retro16` sesudah sampling memetakan RGB terlihat ke palet tetap 16 warna melalui jarak kuadrat RGB; alpha dan RGB transparan tetap exact. Helper hanya buffer-to-buffer.

Preservasi alpha berlaku pada koordinat yang tersampel, bukan seluruh piksel sumber. Pada PNG Pants revisi berisi 55 piksel alpha parsial, grid32 menghasilkan 14×32 tanpa menyampel alpha parsial; oracle seluruh channel PASS dan dua tes Retro16 existing menguji alpha parsial secara terpisah. Ini bukti helper, bukan pengulangan UI/API pixelation.

**Snapshot dan UI Pixelation:** Manager memilih objek completed melalui resolusi manifest privat, menulis PNG dan manifest terpisah di `<job>/pixelations/<uuid>/`, publikasi manifest terakhir tanpa memutasi original/job/ZIP. POST menerima palette opsional original/retro16; respons dan snapshot baru mencatat palette. GET tetap menyajikan snapshot lama tanpa field tersebut, bukan mengkuantisasi ulang. UI per kartu memiliki pemilih ukuran/palet, status, preview tajam dan link native. Kedua pemilih dikunci selama request; AbortController mengikuti lifecycle upload/reset dan respons harus cocok dengan job/objek/ukuran/palet/URL yang diminta.

**Koreksi mask aktual (D-044, perbaikan 2026-11-22):** Editor Canvas mengambil foto sumber sesuai bbox. Penghapus menggunakan disk/stroke `destination-out`; Pulihkan memakai clip lingkaran/kapsul dan komposisi `copy` agar RGB/alpha sumber menggantikan area kuas. Undo menyimpan hingga 20 ImageData; Reset mengembalikan kondisi saat dialog dibuka. PUT memvalidasi PNG RGBA/dimensi dan memperbarui objek/manifest; operasi turunan baru membaca revisi tersebut, snapshot turunan lama tetap terpisah. Canvas dapat membulatkan RGB beralpha parsial dan mengantialias tepi kuas.

Revisi hanya memperbarui PNG/metadata objek yang dipilih, bukan class map atau PNG kategori lain; bbox tetap. Pants yang dipulihkan tidak otomatis menghapus salah label dari Upper-clothes. Sumber Pulihkan adalah decode foto browser: crop JPEG teruji berbeda maksimum satu tingkat RGB dari Pillow, termasuk opaque. Penerimaan save membandingkan dengan `Canvas.toBlob`; batas dekoder/encoder tidak boleh disamakan dengan mutasi oleh backend.

**UI generatif dan spritesheet aktual:** Kartu objek menyediakan preset/ukuran stylization, POST, polling, preview dan unduhan. Browser mengirim dua langkah nominal, strength 0.5 dan ukuran 128/256; API internal menerima parameter lebih luas, bukan bukti semua konfigurasi diuji. Spritesheet menyusun objek manifest pilihan/semua menjadi PNG bergrid dengan padding/kolom dan atlas JSON; bukan sprite animasi.

**Batas komposisi spritesheet (D-045):** Helper Sharp menyusun frame tanpa resize/trim/rotasi; tinggi baris mengikuti objek tertinggi, sehingga ada ruang kosong. PNG lossless tidak menjanjikan RGBA sumber exact selama compositing. Pada Pants revisi + dua sepatu, helper dan ekspor UI/API mempertahankan seluruh alpha termasuk 55 parsial serta RGB opaque; tujuh piksel RGB parsial berubah maksimum satu tingkat, RGB tersembunyi kedua sepatu juga berubah. PNG/ZIP sumber tidak dimutasi. Atlas berisi koordinat/ukuran/kategori frame; impor game engine belum diuji.

**Preview vs file:** `#spritesheet-preview-img` berada dalam container `max-h-64 overflow-auto` (256 px pada penerimaan). Wheel native menampilkan baris bawah; batas viewport tidak memotong PNG/atlas unduhan. Penerimaan memeriksa byte native vs endpoint inline dan koordinat setiap frame, bukan hanya screenshot.

**Alur pemrosesan aktual (retensi belum tersedia):**

1. `POST /api/jobs`: multipart gambar valid atau JSON `upload_id`; Express membuat job ID acak dan manifest queued privat.
2. Worker FIFO mengambil pekerjaan dan mengubah status ke processing.
3. Express memanggil FastAPI `/extract-path` melalui loopback dengan path internal yang dipilih backend, bukan path browser.
4. FastAPI menjalankan SCHP lokal, menghasilkan class map dan PNG foreground/kategori pada tujuan yang ditentukan backend.
5. Backend memvalidasi hasil, bbox/dimensi, nama/lokasi file dan metadata sebelum mempublikasikan inventaris objek.
6. Express tandai `completed` atau `failed` dengan error yang aman ditampilkan; UI polling `GET /api/jobs/:id`.
7. Unduhan `GET`/ZIP memilih file berdasarkan manifest object ID yang sah, **bukan path arbitrer dari client**.
8. Penghapusan file lama/retensi otomatis belum tersedia; hapus pilihan di browser bukan penghapusan data server.

Path filesystem FastAPI hanya untuk caller lokal tepercaya; API internal bukan sandbox filesystem publik. Browser mengakses Express dan hanya mengirim ID objek/job yang terdaftar.

## 5. Kontrak REST API aktual

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/api/jobs` | Tersedia: multipart image atau JSON upload_id, HTTP 202 + Location |
| GET | `/api/jobs/:id` | Tersedia: status, progress tahap, timestamp, objek tanpa path, error aman |
| GET | `/api/jobs/:id/objects/:objectId` | Tersedia: preview PNG, hanya objek manifest job completed |
| GET | `/api/jobs/:id/objects/:objectId/download` | Tersedia: attachment PNG asli dengan nama UUID objek |
| PUT | `/api/jobs/:id/objects/:objectId` | Tersedia: revisi mask manual objek (payload PNG RGBA exact, D-044) |
| POST | `/api/jobs/:id/exports` | Tersedia: JSON all:true atau object_ids, HTTP 201 + Location setelah ZIP selesai |
| GET | `/api/jobs/:id/exports/:exportId` | Tersedia: metadata manifest ekspor ZIP (files_count, archive_size, sha256, D-046) |
| GET | `/api/jobs/:id/exports/:exportId/download` | Tersedia: attachment ZIP privat berbasis manifest ekspor/job (STORE mode) |
| POST | `/api/jobs/:id/spritesheet` | Tersedia: JSON all/object_ids, padding, columns; HTTP 201 + Location (D-045) |
| GET | `/api/jobs/:id/spritesheets/:spritesheetId` | Tersedia: inline PNG komposit spritesheet transparan (D-045) |
| GET | `/api/jobs/:id/spritesheets/:spritesheetId/download` | Tersedia: attachment PNG komposit spritesheet (D-045) |
| GET | `/api/jobs/:id/spritesheets/:spritesheetId/atlas` | Tersedia: inline JSON atlas bergaya TexturePacker; impor engine belum diuji (D-045) |
| GET | `/api/jobs/:id/spritesheets/:spritesheetId/atlas/download` | Tersedia: attachment JSON atlas bergaya TexturePacker (D-045) |
| POST | `/api/jobs/:id/pixelate` | Tersedia: JSON object_id, size (16/32/64/128), palette opsional original/retro16; HTTP 201 + Location |
| GET | `/api/jobs/:id/pixelations/:pixelationId` | Tersedia: inline PNG hasil pixelation deterministik |
| GET | `/api/jobs/:id/pixelations/:pixelationId/download` | Tersedia: attachment PNG hasil pixelation |
| POST | `/api/jobs/:id/stylize` | Tersedia: object_id + parameter model, 202 + Location; antrean bersama ekstraksi |
| GET | `/api/jobs/:id/stylizations/:stylizationId` | Tersedia: polling snapshot queued/processing/completed/failed tanpa path |
| GET | `/api/jobs/:id/stylizations/:stylizationId/image` | Tersedia: preview PNG snapshot completed |
| GET | `/api/jobs/:id/stylizations/:stylizationId/download` | Tersedia: attachment PNG snapshot completed |
| GET | `/api/health` | Health Express (tersedia M1) |
| GET | `/api/health/ai` | Express memanggil health FastAPI (tersedia M1) |

Internal FastAPI: `GET /health` mengembalikan status service, `model_loaded` (SCHP), `stylizer_available` dan `stylizer_loaded`. SCHP dimuat saat startup bila checkpoint tersedia; kegagalan load masih memungkinkan health-only, sehingga HTTP 200 bukan jaminan model siap. Express `/api/health` independen; `/api/health/ai` mem-proxy status SCHP dengan timeout default 3 detik dan mengembalikan 503 bila service tidak terjangkau. Proxy tersebut bukan readiness probe SD15 terpisah. Ekstraksi internal tersedia melalui `POST /extract` dan `/extract-path`; tidak ada endpoint `/parse`.

**Stylization internal (D-040/D-041):** FastAPI menyediakan `POST /stylize` (multipart file) dan `/stylize-path` (JSON path tepercaya). Pipeline SD15 lazy-loaded; lock per proses menolak generasi bersamaan dengan 409. Handler sinkron memakai threadpool. Health internal menambahkan `stylizer_available` (konfigurasi ditemukan, bukan bukti load) dan `stylizer_loaded`; health proxy Express tetap untuk service ekstraksi.

**Orchestrator stylization (D-041):** Express memilih source dari manifest objek completed, membuat manifest snapshot queued di `<job>/stylizations/<uuid>/`, lalu menambahkan tugas ke FIFO yang sama dengan ekstraksi. Satu request AI aktif per manager. `AiClient.stylizePath` memakai URL generatif opsional dan timeout khusus default 900000 ms, tanpa fallback/retry. Hanya backend membentuk path; output AI ke `image.tmp.png`, kemudian decode/validasi dimensi/alpha exact/metadata sebelum rename `image.png` dan manifest completed. State aktif memakai snapshot committed di memori untuk menghindari read/rename race Windows; restart mengubah interrupted menjadi failed. Polling/preview/download menghapus path internal dan mewajibkan parent/object/snapshot sesuai serta file canonical regular. Manifest job, original, ZIP/pixelation independen.

**Batas lifecycle:** FIFO tidak unload SCHP/SD15 atau membatalkan inferensi remote saat HTTP timeout. Late writes tetap staging privat; snapshot failed tidak dapat diunduh. Retensi belum ada. Service SD15 opsional dapat dipisahkan lewat `AI_STYLIZATION_SERVICE_URL`, tetapi resource kedua proses tetap harus dikelola; smoke menghentikan SCHP sebelum memulai SD15. Endpoint ekstraksi sinkron M3 tetap di luar FIFO.

Pada development, Vite `127.0.0.1:5173` mem-proxy `/api` ke Express `127.0.0.1:3000`; Express memakai FastAPI `127.0.0.1:8000` secara default. Tidak ada static serving storage, akses FastAPI langsung dari browser atau CORS terbuka. Halaman sekarang mencakup upload/kamera, workspace objek, mask editor, kedua mode pixelation/stylization dan ekspor; bukan hanya layar health M1.

## 6. Contoh metadata job

```json
{
  "job_id": "<random-id>",
  "status": "completed",
  "input": "original.png",
  "objects": [
    {"id": "obj_01", "category": "hat", "file": "extracted/hat_01.png"},
    {"id": "obj_02", "category": "upper_clothes", "file": "extracted/shirt_01.png"}
  ]
}
```

Contoh skema, **bukan output aplikasi yang telah diuji**.

## 7. Direktori dan penyimpanan

```text
IMMOExtract/
├── frontend/
├── backend/
├── ai-service/
├── storage/          # gitignored; hasil job dan foto sementara
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── PROGRESS.md
│   ├── HANDOFF.md
│   └── DECISIONS.md
├── AGENTS.md
├── README.md
└── .gitignore       # wajib dibuat sebelum memproses foto atau model
```

Direktori service di atas berisi implementasi, bukan scaffold kosong. `scripts/` berisi smoke health/integration/browser; `storage/uploads/` dan `storage/jobs/` privat, tidak statis dan tidak masuk Git. Environment, dependensi, model, build dan artefak scratch tidak dibundel sebagai source.

## 8. Segmentasi: keterbatasan dan fallback

- Human parsing menghasilkan label per piksel; dua bagian kategori sama belum tentu menjadi dua instance terpisah.
- Untuk dua sepatu atau objek saling menempel, connected components boleh diuji tetapi tidak dianggap solusi sempurna.
- Input resolusi besar harus dibatasi/di-resize sebelum inferensi; pemetaan mask kembali ke resolusi asli harus ditangani benar.
- Input yang tidak menampilkan orang atau hasil tanpa kategori valid harus menghasilkan pesan yang jujur.
- Koreksi mask interaktif sudah tersedia; tidak merekonstruksi bagian objek yang tidak ada pada foto sumber.
- Pemisahan background transparan tidak otomatis melengkapi bagian objek yang tidak terlihat.

## 9. Keamanan dan privasi

- Tolak file yang ukuran, isi, dan dimensi tidak sesuai. Jangan hanya percaya ekstensi.
- Gunakan random ID untuk job dan object; hindari direct static serving dari `storage`.
- Jangan taruh secret, API token, foto pengguna, mask/hasil, checkpoint, `.venv`, atau `node_modules` di Git.
- Simpan model checkpoint lokal; unduhan ukuran besar butuh persetujuan pengguna.
- Validasi ukuran sudah tersedia, tetapi antrean berbatas dan cleanup retensi belum tersedia. Jangan menyamakan batas upload/UUID acak dengan kesiapan deployment publik atau kontrol akses multi-user.
- Saat memakai Claude Website, kirim hanya file source yang relevan; jangan upload foto asli pribadi atau secrets.

## 10. Observability dan pengujian

- Endpoint health terpisah per service, log error yang tidak membocorkan path/isi foto kepada pengguna.
- Catat status job; hasil benchmark hanya setelah benar-benar diukur.
- Uji backend dengan file valid, corrupt, masqueraded MIME, file besar, ID tak dikenal.
- Uji pixel alpha dan resolusi; uji AI pada berbagai kondisi cahaya/occlusion.
- Pisahkan bukti model nyata dari fixture: `scripts/smoke_browser_m7.mjs` memakai AI mock + browser/backend nyata untuk regresi UI/PNG; bukan tes SCHP/SD15. Log 2026-11-22 juga memiliki sesi SCHP nyata dengan gambar sintetis, bukan evaluasi dataset foto manusia.
- Bukti 2026-11-23 mencakup dua foto berizin: astronaut NASA public domain dan Man Standing karya Visitor7 (CC BY-SA 3.0; tautan sumber di README). SCHP mempertahankan kontrak crop/piksel tetapi masih salah label/kebocoran; tidak ada ground truth atau skor akurasi dataset.
- Koreksi foreground astronaut dan crop Pants melalui Canvas→PNG/ZIP diuji nyata. Pixelation Pants grid32/Retro16 diperiksa melalui helper/oracle dan dua tes existing, bukan UI/API ulang. Spritesheet tiga objek diperiksa melalui helper lalu browser/API nyata; PNG revisi Pants diterapkan via PUT, bukan tes kuas ulang. Unduhan PNG/atlas cocok inline, ZIP/sumber unchanged, reset/cleanup PASS.
- Bukti bersifat Windows/Chrome desktop lokal. Report/PNG/atlas/screenshot ignored di `scratch/` adalah artefak penerimaan, bukan fixture rilis; pemutakhiran dokumen tidak menjalankan ulang runtime. Lihat log PROGRESS untuk perintah dan pemisahan bukti model/mock/helper/browser.
- SD15 memiliki bukti inferensi sukses dan penghentian guard pada log 2026-11-21; antrean tidak menjamin dua model resident aman. Build/tes lama tidak dijalankan ulang pada tugas dokumentasi.
- Jalankan minimal smoke test sebelum commit milestone.

## 11. Batas dan pekerjaan yang belum ditutup

- Kualitas segmentasi/stylization pada dataset foto nyata, aksesori dan occlusion: dua foto ekstraksi teruji belum memberi penerimaan umum. Alpha exact tidak menjamin kualitas visual; koreksi satu kategori tidak menyinkronkan kategori lain. Impor atlas ke game engine belum diuji.
- Lisensi distribusi checkpoint/model dan kode proyek sebelum publikasi/redistribusi.
- Resource SD15: headroom RAM/commit, latensi, konfigurasi di luar smoke dan lifecycle pergantian model.
- Retensi file, batas antrean/ekspor dan keamanan deployment multi-user; belum menjadi fitur operasional.
- Portabilitas Linux/macOS dan penerimaan kamera mobile; belum terbukti pada bukti Windows lokal.

Catat keputusan setelah diuji ke `docs/DECISIONS.md`.
