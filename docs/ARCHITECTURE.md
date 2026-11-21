# IMMOExtract — Architecture

> **Status:** M1–M5 teruji pada Windows lokal. M6 memiliki helper/API SD15 dan antrean Express dengan snapshot privat; UI generatif, koreksi mask dan retensi belum tersedia. Bukti aktual ada di `PROGRESS.md`.

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
[SCHP human parsing candidate + Pillow/OpenCV masks]
       |
       v
[PNG transparan / metadata kembali ke Express]

Mode lanjutan: Express -> local image-to-image service (mis. ComfyUI)
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

## 3. Teknologi awal

- Frontend: **Vite + Vanilla JavaScript + Tailwind CSS**.
- API: **Node.js + Express.js**.
- Upload: **Multer** versi terpelihara/aman (pilih dan catat versi ketika instalasi).
- Image processing umum dan classic pixelation: **Sharp**.
- Export: **Archiver** untuk ZIP.
- AI service: **Python + FastAPI + PyTorch**.
- Mask/extraction: **Pillow + OpenCV**.
- Model awal yang akan **diuji**, bukan dijamin akurat: **SCHP ATR-18 Human Parsing**.
- Opsi optimasi setelah pembuktian: ONNX Runtime CPU jika ekspor model sesuai.
- Opsi stylization masa depan: ComfyUI atau engine lokal lain yang telah diuji di hardware pengguna.
- Database: tidak ada pada MVP; metadata job file JSON lokal. SQLite hanya jika kebutuhan persisten muncul.

Versi runtime/dependensi M1 dicatat di `DECISIONS.md` (D-010), dengan package-lock npm dan pin dependensi langsung Python. Dependensi pemrosesan gambar/model baru dipilih pada milestone terkait.

## 4. Pemrosesan dan status job

**Kontrak orchestrator aktual (D-021/D-022):** `POST /api/jobs` menerima multipart `image` atau JSON `{"upload_id":"<uuid>"}`. HTTP 202 + Location setelah manifest queued tersimpan. FIFO satu worker per instance backend memanggil AI via shared path internal; `GET /api/jobs/:id` membaca status, progress tahap 0/10/100, timestamp, objek dan error aman. Manifest privat ditulis atomik via temporary file + rename. Polling job aktif memakai snapshot terakhir yang berhasil disimpan untuk menghindari konflik read/rename Windows; terminal dibaca dari disk. Satu proses backend memiliki storage; job interrupted saat restart menjadi failed tanpa retry, hasil terminal tetap tersedia. Endpoint sinkron M3 berada di luar antrean ini.

**Objek kategori aktual (D-022):** Backend memberikan `objects_dir=<job>/objects` ke FastAPI. Setelah satu inferensi, tiap label ATR non-background dengan >50 piksel disimpan ke `objects/atr-<class_id>.png`: crop bbox + padding 2 piksel yang terpotong pada batas input, RGB asli, alpha hanya kelas tersebut. Manifest mempertahankan foreground `human` dan menambahkan UUID objek, class_id, kategori, bbox `[left,top,right,bottom]` eksklusif, dimensi dan pixel_count setelah file serta metadata lolos validasi. Polling menghapus referensi file internal. Satu label adalah satu mask semantik, bukan satu instance. Tidak ada migrasi otomatis job lama.

**Penyajian objek aktual (D-023):** Preview dan attachment PNG memilih UUID objek dari manifest job completed. Manager memvalidasi ID, nama PNG hasil yang diizinkan, lokasi canonical tanpa pengalihan symlink/junction, dan regular file. Router mengirim file tanpa transformasi dengan disposition inline/attachment, nama UUID, `Cache-Control: no-store, private` dan `X-Content-Type-Options: nosniff`. Tidak menerima path client atau membuka static storage; file hilang menghasilkan 404 aman.

**Integrasi browser aktual (D-024):** Lifecycle `image-input.js` memanggil `setUploadedImage()` pada modul `extraction-workspace.js` saat reset dan upload sukses. Tombol ekstraksi mengirim hanya upload_id; polling GET serial tiap 1 detik sampai terminal, timeout request 15 detik. AbortController dan identitas operasi menolak respons usang. Putus polling menyediakan pemeriksaan manual job yang sama, bukan POST ulang. Galeri memakai metadata polling dan URL preview/download D-023; label melalui textContent, tanpa HTML dari respons. State job tidak dipulihkan setelah reload.

**Ekspor ZIP aktual (D-025):** POST ekspor menerima JSON all:true atau object_ids unik; hanya objek manifest job completed. Manager memakai resolusi PNG yang sama dengan unduhan individual, lalu Archiver 8 menulis ZIP streaming dengan metode STORE. Setiap ekspor memiliki UUID dan manifest privat sendiri di `<job>/exports/<export_id>/`; ZIP diselesaikan dahulu, manifest dipublikasikan terakhir melalui rename. Tidak menulis ulang manifest job. Respons 201 berisi download_url setelah semua selesai, bukan antrean ekspor baru.

**UI ZIP aktual (D-026):** Checkbox pada kartu galeri, jumlah pilihan dan tombol Unduh Pilihan/Semua memakai API D-025. Satu ekspor browser aktif; tombol/checkbox dikunci selama request. AbortController ekspor terpisah mengikuti reset upload yang sama; identitas operasi diperiksa setelah body JSON selesai agar respons lama tidak memicu unduhan. download_url wajib sesuai endpoint job/export UUID sebelum link native diklik. Link sukses dipertahankan untuk unduh ulang tanpa POST. Error tidak menghapus pilihan; timeout 15 detik, tanpa retry otomatis.

**Pemrosesan Classic Pixelation aktual (D-027/D-028/D-029/D-030):** `pixelatePng(Buffer, size, palette = 'original')` menerima PNG objek RGBA8 statis tervalidasi. Sharp decode/encode dengan batas 24 megapiksel/8192 per sisi. Sisi terpanjang 16/32/64/128, sisi lain round/minimum 1; tanpa crop/padding. Sampling pusat nearest menyalin RGBA tanpa premultiplication. Mode `retro16` sesudah sampling memetakan RGB terlihat ke palet tetap 16 warna melalui jarak kuadrat RGB; alpha dan RGB transparan tetap exact. Helper hanya buffer-to-buffer.

**Snapshot dan UI Pixelation:** Manager memilih objek completed melalui resolusi manifest privat, menulis PNG dan manifest terpisah di `<job>/pixelations/<uuid>/`, publikasi manifest terakhir tanpa memutasi original/job/ZIP. POST menerima palette opsional original/retro16; respons dan snapshot baru mencatat palette. GET tetap menyajikan snapshot lama tanpa field tersebut, bukan mengkuantisasi ulang. UI per kartu memiliki pemilih ukuran/palet, status, preview tajam dan link native. Kedua pemilih dikunci selama request; AbortController mengikuti lifecycle upload/reset dan respons harus cocok dengan job/objek/ukuran/palet/URL yang diminta.


**Alur lengkap yang dituju (retensi belum tersedia):**

1. `POST /api/jobs`: upload satu gambar valid; Express buat `job_id` acak, simpan input, metadata status `queued`.
2. Worker mengambil pekerjaan; ubah ke `processing`.
3. Express mengirim gambar ke FastAPI melalui localhost HTTP (mis. multipart). Batasi ukuran; jangan pernah mempercayai path dari input pengguna.
4. FastAPI menjalankan human parsing dan mengembalikan label/mask atau menulis hasil ke direktori job yang dikonfigurasi secara aman.
5. Post-processing: pilih kategori valid, buat alpha mask, crop bounding box, beri padding, ekspor PNG transparan; simpan manifest `objects`.
6. Express tandai `completed` atau `failed` dengan error yang aman ditampilkan; UI polling `GET /api/jobs/:id`.
7. Unduhan `GET`/ZIP memilih file berdasarkan manifest object ID yang sah, **bukan path arbitrer dari client**.
8. Cleanup job lama menggunakan aturan retensi yang bisa dikonfigurasi.

**Catatan:** untuk MVP pilih satu mekanisme transfer output FastAPI↔Express secara konsisten. Jika shared storage dipakai, path harus divalidasi dan hanya internal. Tidak boleh expose filesystem mentah kepada client.

## 5. Draft kontrak REST API (rencana)

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/api/jobs` | Tersedia: multipart image atau JSON upload_id, HTTP 202 + Location |
| GET | `/api/jobs/:id` | Tersedia: status, progress tahap, timestamp, objek tanpa path, error aman |
| GET | `/api/jobs/:id/objects` | Manifest objek hasil ekstraksi |
| GET | `/api/jobs/:id/objects/:objectId` | Tersedia: preview PNG, hanya objek manifest job completed |
| GET | `/api/jobs/:id/objects/:objectId/download` | Tersedia: attachment PNG asli dengan nama UUID objek |
| PUT | `/api/jobs/:id/objects/:objectId` | Tersedia: revisi mask manual objek (payload PNG RGBA exact, D-044) |
| POST | `/api/jobs/:id/exports` | Tersedia: JSON all:true atau object_ids, HTTP 201 + Location setelah ZIP selesai |
| GET | `/api/jobs/:id/exports/:exportId` | Tersedia: metadata manifest ekspor ZIP (files_count, archive_size, sha256, D-046) |
| GET | `/api/jobs/:id/exports/:exportId/download` | Tersedia: attachment ZIP privat berbasis manifest ekspor/job (STORE mode) |
| POST | `/api/jobs/:id/spritesheet` | Tersedia: JSON all/object_ids, padding, columns; HTTP 201 + Location (D-045) |
| GET | `/api/jobs/:id/spritesheets/:spritesheetId` | Tersedia: inline PNG komposit spritesheet transparan (D-045) |
| GET | `/api/jobs/:id/spritesheets/:spritesheetId/download` | Tersedia: attachment PNG komposit spritesheet (D-045) |
| GET | `/api/jobs/:id/spritesheets/:spritesheetId/atlas` | Tersedia: inline JSON atlas format TexturePacker / PixiJS (D-045) |
| GET | `/api/jobs/:id/spritesheets/:spritesheetId/atlas/download` | Tersedia: attachment JSON atlas TexturePacker / PixiJS (D-045) |
| POST | `/api/jobs/:id/pixelate` | Tersedia: JSON object_id, size (16/32/64/128), palette opsional original/retro16; HTTP 201 + Location |
| GET | `/api/jobs/:id/pixelations/:pixelationId` | Tersedia: inline PNG hasil pixelation deterministik |
| GET | `/api/jobs/:id/pixelations/:pixelationId/download` | Tersedia: attachment PNG hasil pixelation |
| POST | `/api/jobs/:id/stylize` | Tersedia: object_id + parameter model, 202 + Location; antrean bersama ekstraksi |
| GET | `/api/jobs/:id/stylizations/:stylizationId` | Tersedia: polling snapshot queued/processing/completed/failed tanpa path |
| GET | `/api/jobs/:id/stylizations/:stylizationId/image` | Tersedia: preview PNG snapshot completed |
| GET | `/api/jobs/:id/stylizations/:stylizationId/download` | Tersedia: attachment PNG snapshot completed |
| GET | `/api/health` | Health Express (tersedia M1) |
| GET | `/api/health/ai` | Express memanggil health FastAPI (tersedia M1) |

Internal AI service: `GET /health` tersedia pada M1, mengembalikan `{"status":"ok","service":"ai-service","model_loaded":false}`. Express `/api/health` mengembalikan `{"status":"ok","service":"backend"}`. `/api/health/ai` memanggil FastAPI dengan timeout bawaan 3 detik; berhasil mengembalikan kontrak health AI yang sama, gagal mengembalikan HTTP 503 dengan pesan aman. Health Express tetap independen. `POST /parse` belum tersedia; kontrak inferensi diputuskan di M3.

**Stylization internal (D-040/D-041):** FastAPI menyediakan `POST /stylize` (multipart file) dan `/stylize-path` (JSON path tepercaya). Pipeline SD15 lazy-loaded; lock per proses menolak generasi bersamaan dengan 409. Handler sinkron memakai threadpool. Health internal menambahkan `stylizer_available` (konfigurasi ditemukan, bukan bukti load) dan `stylizer_loaded`; health proxy Express tetap untuk service ekstraksi.

**Orchestrator stylization (D-041):** Express memilih source dari manifest objek completed, membuat manifest snapshot queued di `<job>/stylizations/<uuid>/`, lalu menambahkan tugas ke FIFO yang sama dengan ekstraksi. Satu request AI aktif per manager. `AiClient.stylizePath` memakai URL generatif opsional dan timeout khusus default 900000 ms, tanpa fallback/retry. Hanya backend membentuk path; output AI ke `image.tmp.png`, kemudian decode/validasi dimensi/alpha exact/metadata sebelum rename `image.png` dan manifest completed. State aktif memakai snapshot committed di memori untuk menghindari read/rename race Windows; restart mengubah interrupted menjadi failed. Polling/preview/download menghapus path internal dan mewajibkan parent/object/snapshot sesuai serta file canonical regular. Manifest job, original, ZIP/pixelation independen.

**Batas lifecycle:** FIFO tidak unload SCHP/SD15 atau membatalkan inferensi remote saat HTTP timeout. Late writes tetap staging privat; snapshot failed tidak dapat diunduh. Retensi belum ada. Service SD15 opsional dapat dipisahkan lewat `AI_STYLIZATION_SERVICE_URL`, tetapi resource kedua proses tetap harus dikelola; smoke menghentikan SCHP sebelum memulai SD15. Endpoint ekstraksi sinkron M3 tetap di luar FIFO.

Pada development, Vite `127.0.0.1:5173` mem-proxy `/api` ke Express `127.0.0.1:3000`; Express mengakses FastAPI `127.0.0.1:8000`. Tidak ada static serving `storage/`, akses FastAPI langsung dari browser, atau CORS terbuka. Halaman M1 hanya status layanan, bukan UI produk penuh.

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

## 7. Struktur direktori rencana

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

Source subfolder seperti `src/routes`, `src/services`, `inference`, dan `processing` dibuat **bertahap** sesuai milestone, bukan semuanya sekaligus tanpa kebutuhan.

## 8. Segmentasi: keterbatasan dan fallback

- Human parsing menghasilkan label per piksel; dua bagian kategori sama belum tentu menjadi dua instance terpisah.
- Untuk dua sepatu atau objek saling menempel, connected components boleh diuji tetapi tidak dianggap solusi sempurna.
- Input resolusi besar harus dibatasi/di-resize sebelum inferensi; pemetaan mask kembali ke resolusi asli harus ditangani benar.
- Input yang tidak menampilkan orang atau hasil tanpa kategori valid harus menghasilkan pesan yang jujur.
- Koreksi mask interaktif merupakan milestone lanjut.
- Pemisahan background transparan tidak otomatis melengkapi bagian objek yang tidak terlihat.

## 9. Keamanan dan privasi

- Tolak file yang ukuran, isi, dan dimensi tidak sesuai. Jangan hanya percaya ekstensi.
- Gunakan random ID untuk job dan object; hindari direct static serving dari `storage`.
- Jangan taruh secret, API token, foto pengguna, mask/hasil, checkpoint, `.venv`, atau `node_modules` di Git.
- Simpan model checkpoint lokal; unduhan ukuran besar butuh persetujuan pengguna.
- Rate/size limits dan cleanup job untuk menghindari penyalahgunaan/kehabisan disk.
- Saat memakai Claude Website, kirim hanya file source yang relevan; jangan upload foto asli pribadi atau secrets.

## 10. Observability dan pengujian

- Endpoint health terpisah per service, log error yang tidak membocorkan path/isi foto kepada pengguna.
- Catat status job; hasil benchmark hanya setelah benar-benar diukur.
- Uji backend dengan file valid, corrupt, masqueraded MIME, file besar, ID tak dikenal.
- Uji pixel alpha dan resolusi; uji AI pada berbagai kondisi cahaya/occlusion.
- Jalankan minimal smoke test sebelum commit milestone.

## 11. Yang belum diputuskan

- Versi library AI dan kompatibilitas runtime M3 (runtime web/health M1 sudah dipilih).
- Checkpoint SCHP dan evaluasi kualitas pada data uji.
- Format kontrak pasti FastAPI-Express untuk mask/output.
- Pilihan model generatif, lisensi, kapasitas GPU/RAM.
- Masa retensi file sementara dan batas resource final setelah benchmark.

Catat keputusan setelah diuji ke `docs/DECISIONS.md`.
