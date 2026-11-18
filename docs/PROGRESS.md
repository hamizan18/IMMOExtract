# IMMOExtract — Progress Tracker

> **Status aktual:** M1–M4 memiliki bukti verifikasi Windows lokal. M5 berjalan: helper Classic Pixelation satu PNG dan API persistensi/serving hasil pixelation berbasis manifest tersedia dan teruji (D-027, D-028); UI Studio dan palet belum tersedia. Retensi serta evaluasi kualitas foto nyata tetap terbuka.

## Ringkasan

- **Current milestone:** M5 — Classic Pixelation Studio — In progress.
- **Current task:** Integrasi API & persistensi snapshot pixelation per objek selesai; berikutnya UI Classic Pixelation Studio pada frontend.
- **Overall status:** Helper dan API Express menghasilkan PNG RGBA grid 16/32/64/128 secara deterministik tanpa mengubah original atau ZIP. Belum tersedia di UI browser; alur PNG/ZIP M4 tetap independen.
- **Last verification:** 2026-11-18 — `npm test --prefix backend` (89/89 PASS); `node --test backend/test/jobs.test.js` (23/23 subtest suite / 57 subtests PASS); `node --test backend/test/pixelation.test.js` (5/5 PASS); `npm run build --prefix frontend` (PASS).

## Milestone

| Milestone | Cakupan | Status | Kriteria selesai |
| --- | --- | --- | --- |
| M1 | Struktur repo, frontend, Express, FastAPI, health checks | Complete | Frontend dibuka di browser; kedua health checks dan Express → FastAPI lulus; kegagalan/pemulihan diuji |
| M2 | Upload, kamera, validasi, preview input | Complete | Validasi backend sebelumnya 24/24 PASS, integrasi frontend teruji, kamera fisik PC Camera → preview → upload → track ended PASS pada Windows/Chrome 158 |
| M3 | POC SCHP, label/mask, PNG transparan | Complete | Pipeline ekstraksi & endpoint REST FastAPI + integrasi pemanggilan dari Express backend teruji end-to-end tanpa regresi |
| M4 | Job, object gallery, download individual/ZIP | Complete | Job/polling, PNG kategori, galeri, PNG individual serta UI/API ZIP pilihan/semua terverifikasi pada Windows lokal |
| M5 | Classic Pixelation Studio | In progress | Helper PNG RGBA dan API snapshot pixelation per objek teruji (D-027, D-028); UI Studio dan palet belum tersedia |
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
- Tugas kamera M2: live view, capture PNG ke preview yang sama, pesan izin/perangkat, pembatalan dan penghentian stream; tanpa upload server atau AI.
- Perubahan tugas kamera: `frontend/index.html`, `frontend/src/image-input.js`, `README.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`. Git awal bersih pada `main...origin/main`; tanpa staging/commit.
- Integrasi upload frontend: multipart `image` dikirim setelah preview, status proses/ID upload/error server tampil tanpa menghapus preview ketika upload gagal. Pilihan baru/hapus/buka kamera/pagehide membatalkan request dan mengabaikan hasil usang; MIME kosong dinormalisasi berdasarkan signature.
- Perubahan tugas integrasi: `frontend/index.html`, `frontend/src/image-input.js`, `README.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`. Git awal bersih (termasuk staged diff); catatan perubahan belum commit pada handoff sebelumnya sudah kedaluwarsa. Tidak menjalankan staging/commit.
- Penerimaan kamera fisik 2026-11-16: izin pengguna diperoleh sebelum capture; default browser awal memakai REDMI Windows Virtual Camera, kemudian PC Camera USB dipilih melalui pengaturan profil Chrome uji setelah izin capture tambahan.
- PC Camera menghasilkan PNG 1280×720 (1.411.950 byte), server mengembalikan HTTP 201, ID tampil, preview terdecode, track berakhir dan `video.srcObject` dilepas. Tidak mengubah source/dependensi atau melampirkan foto ke percakapan.
- Tugas penerimaan hanya memperbarui `README.md`, `docs/DECISIONS.md` (bukti tambahan, bukan keputusan baru), `docs/PROGRESS.md`, `docs/HANDOFF.md`. Enam perubahan belum commit dari tugas sebelumnya dipertahankan; tidak staging/commit.
- Kesiapan M3: hardware/runtime diinventarisasi; source AI lokal masih health-only. SCHP upstream punya dependensi CUDA eksplisit dan environment Linux lama; kode MIT, hak redistribusi checkpoint ATR belum terkonfirmasi. Arah CPU/environment terpisah dicatat di D-014.
- Git awal tugas readiness bersih (termasuk staged diff), berbeda dari handoff sebelumnya. Hanya README/DECISIONS/PROGRESS/HANDOFF diperbarui; tanpa perubahan source, instalasi, download binary, staging, atau commit.
- Pembuktian runtime PyTorch CPU terisolasi pada Python 3.14.3 (2026-11-16): venv terpisah `ai-service/.venv-test` dibuat tanpa menyentuh `.venv` health. Dipasang wheel CPU resmi `torch-2.15.0+cpu`, `torchvision-0.29.2+cpu`, `numpy-2.5.4`, `pillow-13.0.0` dari index PyTorch CPU (`https://download.pytorch.org/whl/cpu`). Pengujian smoke via `ai-service/smoke_cpu.py` berhasil: verifikasi CPU-only (`cuda.is_available() == False`), matmul float32, Conv2d+BatchNorm2d+ReLU forward ([1,3,64,64] -> [1,16,64,64]), interoperabilitas PIL/NumPy/Tensor, dan transform torchvision Resize(512,512)/Normalize ATR PASS. Keputusan dicatat di D-015.
- Pembaruan CLI Antigravity (2026-11-16): `agy update` dijalankan, mengonfirmasi CLI telah berada pada versi terbaru (1.5.9).
- Adaptasi arsitektur model SCHP ATR-18 ke CPU murni (2026-11-16): paket `ai-service/schp_cpu/` dibuat (`abn.py`, `model.py`, `__init__.py`). Modul `InPlaceABNSync` digantikan dengan implementasi pure-PyTorch `ABN` (`F.batch_norm` + `F.leaky_relu(slope=0.01)`) yang mempertahankan layout parameter `weight`, `bias`, `running_mean`, `running_var` identik dengan upstream. `test_schp_cpu.py` membuktikan: instansiasi ResNet-101 (66.722.900 parameter, ~254.5 MB), 603 state_dict keys, 119 buffer running_mean/var, dan forward pass dummy `[1, 3, 512, 512]` dieksekusi dalam 1.977 detik pada CPU Ryzen 5 7430U menghasilkan tensor valid (tanpa NaN/Inf) serta upsample bilinear 512×512 dan argmax map 18 kelas PASS. Keputusan dicatat di D-016.
- Unduh dan verifikasi checkpoint resmi SCHP ATR-18 (2026-11-16): setelah izin eksplisit pengguna, file `exp-schp-201908301523-atr.pth` diunduh dari mirror resmi Hugging Face ke folder terisolasi `ai-service/models/` (diabaikan Git). Ukuran file 267.445.237 bytes (255.06 MB), checksum SHA-256 `e9d7c91ce3b4e7133df56b599fc817b533e3439c5e8d282a59126d2fda339a2a`. `load_checkpoint_cpu.py` membuktikan: 603/603 keys state dict cocok sempurna (0 missing, 0 unexpected), dan forward pass CPU dengan bobot asli selesai dalam 1.857 detik dengan output logits valid range [-2.12, 8.87]. Keputusan dicatat di D-017.
- Implementasi pipeline ekstraksi gambar ke PNG transparan (`ai-service/extractor.py`, 2026-11-16): kelas `HumanExtractor` dan dataclass `ExtractionResult` memproses gambar (baca image, letterbox aspect-preserving 512×512, normalisasi ATR BGR), mengeksekusi inferensi model ResNet-101 bobot resmi di CPU, melakukan un-padding & interpolasi ke resolusi asli, menghasilkan binary mask alpha foreground (`class > 0`) dan mengekspor gambar RGBA dengan latar transparan (alpha=0 background, alpha=255 foreground, RGB pixel intact). Pengujian `test_extractor.py` lulus 100% (1.90 detik). Keputusan dicatat di D-018.
- Implementasi endpoint FastAPI AI Service (`ai-service/main.py`, 2026-11-16):
  - Lifespan context manager memuat `HumanExtractor` saat server startup dan mengaktifkan `model_loaded: true`.
  - `GET /health` mengembalikan status service dan readiness model.
  - `POST /extract` menerima multipart file gambar, opsi penyimpanan path disk (`output_path`, `save_mask_path`), dan mengembalikan metadata kategori pakaian ATR serta base64 RGBA PNG transparan.
  - `POST /extract-path` menerima JSON path file lokal untuk pemrosesan antar-proses lokal yang efisien.
  - Pengujian `ai-service/test_api.py` (5/5 PASS dalam 9.01 detik).
  - Pengujian live loopback Uvicorn server `ai-service/smoke_api_live.py` (PASS dalam 1.82 detik).
  - Keputusan dicatat di D-019.
- Regression testing: `npm test --prefix backend` (24/24 PASS) dan `npm run build --prefix frontend` (PASS) terkonfirmasi tidak mengalami regresi.

- Implementasi integrasi Express backend dengan FastAPI AI Service (`backend/src/ai-client.js`, `backend/src/extractions.js`, 2026-11-16):
  - `AiClient` mengelola health probes dan request ekstraksi via disk path (`extractPath`) dengan fallback multipart (`extractMultipart`).
  - Route `POST /api/uploads/:uploadId/extract`: memvalidasi UUID upload, memicu inferensi model SCHP ATR-18 pada AI service, menyimpan file `extracted.png` (RGBA transparan) dan `mask.png` ke direktori upload yang terisolasi, serta memperbarui `manifest.json`.
  - Route `GET /api/uploads/:uploadId/extracted`: menyajikan file PNG transparan hasil ekstraksi dengan header aman (`Cache-Control: no-store, private`, `Content-Type: image/png`).
  - Route `GET /api/uploads/:uploadId/mask`: menyajikan file mask PNG.
  - Penyelarasan health check Express `/api/health/ai` untuk meneruskan status `model_loaded: true/false` secara dinamis.
  - Pembaruan UI frontend (`frontend/src/main.js`) untuk menampilkan indikator bahwa model AI aktif (`SCHP ATR-18`).
  - Test suite `backend/test/extractions.test.js` (27/27 PASS).
  - Live E2E smoke test `scripts/smoke_integration_e2e.mjs` (PASS).
  - Keputusan dicatat di D-020. Seluruh kriteria M3 terpenuhi.

- Orchestrator M4 (2026-11-17): `backend/src/job-manager.js` dan `jobs.js` menyediakan `POST /api/jobs` (multipart `image` atau JSON `upload_id`, HTTP 202 + Location) serta polling `GET /api/jobs/:id`. Upload baru memakai validasi M2 yang sama melalui callback `onUploaded`; endpoint upload/ekstraksi lama tetap berfungsi.
- Satu worker FIFO per instance backend; manifest privat `storage/jobs/<uuid>/manifest.json` ditulis melalui temporary file + rename. Job interrupted saat restart ditandai `failed` tanpa retry otomatis; job terminal tetap dapat dipolling. Progress 0/10/100 adalah tahap, bukan estimasi persentase inferensi.
- Pada tahap orchestrator awal, inventaris berisi foreground `human` full-frame jika alpha ada, atau kosong; respons tidak menyertakan path internal. Tahap ini kini dilengkapi PNG kategori pada D-022 di bawah.
- Git awal bersih; catatan uncommitted handoff sebelumnya sudah kedaluwarsa. Tidak melakukan staging/commit, instalasi, download model, atau perubahan teknologi. LSP tidak dikonfigurasi; referensi pemanggil diperiksa lewat pencarian.

- PNG kategori ATR (2026-11-17, D-022): `save_category_objects()` di `ai-service/extractor.py` memakai class map hasil inferensi yang sama, menyimpan satu crop per label non-background dengan >50 piksel. Bbox ber-padding 2 piksel, clipped ke input; RGB tidak diubah, alpha hanya kelas bersangkutan. Kategori yang terpisah secara spasial tetap satu mask, sepatu kiri/kanan tetap label berbeda.
- FastAPI JSON/multipart menerima `objects_dir`; AiClient meneruskan opsi tersebut. Backend meminta direktori privat `<job>/objects`, memvalidasi inventaris, class/label, bbox, jumlah piksel dan PNG hasil decode sebelum menambahkan UUID kategori ke manifest bersama foreground manusia. Polling menghapus field file internal.
- Tes baru membuktikan crop deterministik, threshold 50/51, batas gambar, kategori tetangga transparan, hasil kosong/tiny, disk failure, dan penolakan metadata/file kategori invalid. Alur full-frame/base64 lama tetap diuji.
- Suite awal menemukan race manifest Windows (EPERM saat rename dengan reader aktif). Diagnostik read handle membuktikan syscall gagal. Polling job aktif kini memakai snapshot terakhir yang berhasil disimpan; snapshot berubah hanya setelah rename. Tidak menambahkan retry/delay atau menyembunyikan kegagalan. Suite akhir 69/69 PASS.
- Git awal tugas kategori bersih; perubahan tugas orchestrator sebelumnya sudah tidak pending. Perubahan sesi ini hanya tujuh file Python/backend dan lima dokumen (rincian di HANDOFF), tanpa staging/commit, dependensi baru atau unduhan model.

- Preview/unduhan individual (2026-11-17, D-023): kedua endpoint memilih UUID objek hanya dari manifest job completed. PNG foreground/crop dikirim byte-identical, disposition inline/attachment dengan nama UUID, no-store/private dan nosniff. Tidak menambah inferensi, pixelation, dependensi atau static storage.
- Job belum completed ditolak 409; UUID invalid 400; ID/file hilang 404. Path manifest dibatasi ke nama PNG hasil; lokasi canonical harus sesuai dan berupa regular file. Traversal, absolute path dan junction pengalihan ditolak dengan error aman.
- Git awal tugas unduhan bersih, berbeda dari catatan uncommitted handoff sebelumnya. Perubahan hanya `backend/src/job-manager.js`, `backend/src/jobs.js`, `backend/test/jobs.test.js`, README dan empat dokumen docs. Tanpa staging/commit; LSP tidak tersedia, referensi ditelusuri melalui pencarian.

- UI ekstraksi/galeri (2026-11-17, D-024): `image-input.js` memberi upload_id/reset langsung ke modul `extraction-workspace.js`. Tombol aktif setelah upload sukses; POST hanya upload_id, polling serial tiap 1 detik dengan timeout request 15 detik. Status queued/processing/completed/failed dan hasil kosong ditampilkan jujur.
- Kartu foreground/kategori memuat label, dimensi, preview transparansi dan link attachment PNG asli. Label melalui textContent; preview gagal diberi pesan. Desktop dua panel dan mobile bertumpuk, tanpa pixelation.
- Ganti/hapus pilihan, buka kamera dan pagehide meng-abort request, membatalkan timer dan membersihkan hasil. Identitas operasi menolak respons POST/poll usang. Putus polling dapat dilanjutkan manual pada job yang sama, tanpa POST kedua.
- Git awal tugas UI bersih; catatan uncommitted sebelumnya sudah kedaluwarsa. Perubahan: tiga frontend existing, satu modul baru, README dan empat dokumen docs. Backend/model/dependensi tidak berubah; tanpa staging/commit.

- ZIP backend (2026-11-17, D-025): `POST /api/jobs/:id/exports` menerima all:true atau object_ids, memvalidasi job completed serta objek terdaftar, menyimpan ZIP/manifest privat terpisah, kemudian mengembalikan HTTP 201 + download_url. GET download memeriksa manifest/lokasi canonical dan menyajikan attachment ZIP.
- `zip-export.js` memakai Archiver 8.0.0 streaming STORE. Entry hanya UUID objek.png dengan byte PNG asli; warning sumber menggagalkan seluruh ekspor. Publikasi manifest terakhir, tanpa memutasi manifest job; kegagalan tertangkap membersihkan direktori ekspor baru.
- Pengujian menunjukkan ekspor paralel/restart, pilihan tepat/semua, PNG hilang terpilih vs tidak terpilih, status/ID/input invalid, manifest/file ekspor hilang/rusak, junction dan kegagalan stream/storage. Pembaca stdlib Python memeriksa CRC dan byte archive secara independen.
- Git awal tugas ZIP bersih. Sepuluh file existing dan satu helper baru diubah; tanpa commit atau perubahan frontend/model. Archiver dipin dan lockfile diperbarui; instalasi berhasil dari cwd backend setelah npm --prefix gagal mencari package.json di root.

- UI ZIP (2026-11-18, D-026): checkbox per kartu, jumlah pilihan, Unduh Pilihan/Semua dan link unduh ulang memakai API backend existing. Tombol/checkbox dikunci saat satu ekspor aktif; hasil kosong menonaktifkan ekspor. Error mempertahankan pilihan; reset meng-abort ekspor dan membersihkan link/status.
- Respons ZIP divalidasi terhadap job/export UUID dan endpoint privat. Setelah sukses, link native diklik tanpa menyalin archive ke blob; link dapat dipakai ulang tanpa POST. Pemeriksaan identitas setelah JSON menolak respons lama setelah penggantian gambar.
- Git awal sesi UI ZIP memuat sepuluh file modified dan satu helper ZIP untracked dari tugas sebelumnya; staged diff kosong. Semuanya dipertahankan. Sesi ini mengubah dua file frontend dan lima dokumen, tanpa backend/model/dependensi baru, staging atau commit. LSP tidak tersedia; referensi lifecycle diperiksa dengan pencarian.

- Dasar M5 (2026-11-18, D-027): `backend/src/pixelation.js` menyediakan helper buffer-to-buffer `pixelatePng`. Size adalah sisi terpanjang, sisi lain round/minimum 1, input kecil diperbesar. Sharp decode/encode; sampling pusat nearest menyalin RGBA utuh untuk menghindari perubahan RGB akibat premultiplication alpha.
- `backend/test/pixelation.test.js` menutup risiko blending, RGB transparan/alpha rendah, rounding/rasio dan satu-piksel, ukuran/input invalid, determinisme serta original tidak berubah. Belum ada endpoint, persistensi turunan, UI atau palet; tanpa dependensi baru.
- API Pixelation M5 (2026-11-18, D-028): `POST /api/jobs/:id/pixelate` menerima JSON `{object_id, size}` (16, 32, 64, 128) untuk job completed. Snapshot PNG dan manifest privat disimpan atomik di `<job>/pixelations/<pixelationId>/`. `GET /api/jobs/:id/pixelations/:pixelationId` (inline) dan `/download` (attachment) menyajikan PNG hasil pixelation dengan header aman (`no-store, private`, `nosniff`). Manifest utama job dan file original PNG/ZIP tidak dimutasi.
- Lima skenario pengujian baru di `backend/test/jobs.test.js` membuktikan: snapshot independen bertahan setelah restart backend, sampling piksel exact, validasi input ketat, penolakan job non-completed/objek kosong, perlindungan kerusakan sumber/symlink/junction, dan validasi manifest canonical regular file.

## In progress

- M5: Helper pemrosesan dan API persistensi/serving hasil pixelation per objek selesai dan terverifikasi penuh. UI Studio di frontend (pemilihan ukuran 16/32/64/128, preview before/after, download PNG pixelated) dan palet warna adalah tugas berikutnya.

## Blockers / risks

- Latensi ekstraksi live HTTP terukur ~1.82–2.20 detik per gambar pada AMD Ryzen 5 7430U dengan ukuran RAM model ~255 MB; inferensi dan post-processing CPU terbukti sangat responsif dan tidak membebani memori laptop.
- Python 3.14.3 didukung penuh oleh PyTorch 2.15.0+cpu; seluruh pipeline berjalan pure-PyTorch + Pillow + NumPy tanpa ketergantungan ekstensi C++/CUDA atau OpenCV (`cv2`).
- Checkpoint ATR resmi sudah diunduh dan diverifikasi hash-nya. Checkpoint disimpan di folder lokal yang diabaikan Git (`ai-service/models/`) dan tidak di-bundle ke repository.
- Pengujian Windows lokal saja; Linux/macOS dan deployment produksi belum diuji.
- Batas dimensi preview diperiksa setelah decode browser; bukan perlindungan decompression bomb atau pengganti validasi server. Batas sementara dicatat di D-011, bukan benchmark.
- Kamera fisik desktop PC Camera sudah diuji. Kamera mobile fisik dan perpindahan tab non-headless belum diuji. Hidden-state sebelumnya diuji lewat injeksi; navigasi `pagehide` diuji nyata pada tugas kamera sintetis.
- Upload yang sudah diterima tetap tersimpan; pembatalan request bukan rollback dan hapus preview bukan hapus server. Retensi otomatis belum diimplementasikan; batasan ini ditampilkan di UI.
- Browser dengan beberapa kamera dapat memilih kamera virtual secara default. Pengujian fisik memilih PC Camera lewat pengaturan Chrome; aplikasi belum mempunyai pemilih perangkat dan tidak menjanjikan kamera fisik tertentu.
- Job manager mengasumsikan satu proses backend pemilik storage; belum mendukung multi-process, antrean berbatas, atau retensi. Endpoint ekstraksi sinkron M3 tetap di luar antrean `/api/jobs`.
- Startup `server.js` masih memakai `AI_HEALTH_TIMEOUT_MS` sebagai timeout client AI bersama (default 3000 ms); smoke job memakai 30000 ms. Untuk input lambat, konfigurasi timeout memadai; benchmark batas input belum dilakukan.
- Kategori ≤50 piksel tidak diekspor sebagai file; tetap berada dalam foreground manusia. Ambang ini bukan confidence model. Kualitas pada foto pribadi/occlusion nyata belum diuji pada sesi kategori.
- `test_api.py` memunculkan StarletteDeprecationWarning mengenai integrasi httpx TestClient; 7 tes tetap PASS. Tidak mengganti dependensi pada tugas ini.
- State job UI tidak dipulihkan setelah reload. Ganti/hapus pilihan hanya menghentikan pengamatan browser, bukan job server. Unduhan memakai browser native; tidak ada dialog error unduhan khusus aplikasi.
- ZIP diekspor sebagai snapshot baru per POST; belum ada deduplikasi, batas ekspor atau retensi. Crash sebelum manifest ekspor dipublikasikan dapat menyisakan direktori privat yang tidak dapat diunduh.
- Pixelation memakai grid integer sehingga rasio aspek mengalami pembulatan dan detail tipis dapat hilang. Alpha/RGB piksel yang dipilih tetap exact; bukan preservasi seluruh silhouette. Decode sumber memakai memori sesuai dimensi; belum ada benchmark RAM maksimum.
- Jangan menandai fitur M4–M7 sebagai selesai hanya karena dokumentasinya ada.

## Next task — satu tugas saja

Implementasikan UI Classic Pixelation Studio pada frontend: tambahkan kontrol pemilihan ukuran (16, 32, 64, 128) per objek hasil ekstraksi atau panel studio, panggil `POST /api/jobs/:id/pixelate`, tampilkan preview pixelated transparan dengan status loading, dan sediakan link unduhan PNG pixelated. Jangan membuat modul palet sekaligus sebelum UI dasar teruji.

## Inventaris kesiapan M3 — 2026-11-16

| Komponen | Hasil observasi |
| --- | --- |
| OS | Windows 11 Pro x64, 10.0.26200 |
| CPU | AMD Ryzen 5 7430U, 6 core / 12 logical processor |
| RAM terlihat OS / bebas saat pemeriksaan | 7,40 GiB / 1,45 GiB; nilai bebas berubah mengikuti proses aktif |
| GPU | AMD Radeon (TM) Graphics, driver 31.0.21921.1000; AdapterRAM CIM 512 MiB, bukan ukuran total shared GPU memory |
| CUDA | Tidak ada GPU NVIDIA pada enumerasi; `nvidia-smi` tidak ditemukan di PATH |
| Disk proyek D: | NTFS, ruang bebas 29.175.590.912 byte (27,17 GiB) saat pemeriksaan |
| Runtime terdaftar | `py --list-paths`: hanya Python 3.14 x64; `.venv` memakai CPython 3.14.3 AMD64 |
| Paket AI service | FastAPI 0.163.0 dan Uvicorn 0.54.0 ada; torch, torchvision, NumPy, Pillow, OpenCV belum terpasang |

**Kesimpulan:** Layak melanjutkan smoke runtime CPU, bukan bukti kelayakan SCHP. Environment upstream tidak bisa dipakai apa adanya pada Windows CPU. Versi modern Python tidak otomatis menjadi penghalang; kandidat torch 2.13/torchvision 0.28 mendukung Python 3.14 menurut metadata, tetapi pemilihan wheel CPU dan eksekusi belum diuji. Detail kompatibilitas, kontrak ATR-18, lisensi serta tautan primer ada di D-014.

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
| 2026-11-15 | Kamera: `npm run build --prefix frontend` | PASS | Vite, 6 modul; tanpa dependensi tambahan |
| 2026-11-15 | Chromium terisolasi `--use-fake-device-for-media-stream`; Buka kamera → Ambil foto | PASS | PNG 1280×720/nonuniform dari device sintetis; tanpa audio; track ended setelah capture |
| 2026-11-15 | Tutup/hapus/berganti file; file invalid | PASS | Track dihentikan; preview file valid berfungsi, invalid ditolak |
| 2026-11-15 | Browser permission denied → granted | PASS | Pesan penolakan dan pemulihan kamera |
| 2026-11-15 | Tunda hasil getUserMedia dan callback toBlob asli | PASS | Stream terlambat dihentikan; file baru tidak ditimpa PNG lama |
| 2026-11-15 | Injeksi NotFoundError, NotReadableError, API kamera tidak tersedia | PASS | Pesan sesuai, file fallback tetap tersedia |
| 2026-11-15 | Perpindahan tab headless; observasi console pagehide awal | ERROR harness | Tidak menjadi hidden (timeout); console kosong. Dilanjutkan dengan injeksi hidden dan observasi sessionStorage pada navigasi nyata |
| 2026-11-15 | Injeksi visibilitychange/hidden; navigasi nyata | PASS | Track ended; srcObject dilepas; listener pagehide mencatat ended sebelum dokumen dibuang |
| 2026-11-15 | Screenshot live/capture viewport 390×844; tombol health | PASS | Tanpa overflow horizontal; preview dan health tampil |
| 2026-11-15 | Pantau request selama skenario kamera/file | PASS | Tidak ada request HTTP selama skenario |
| 2026-11-15 | Kamera/mobile fisik, background tab non-headless | NOT RUN | Memakai perangkat sintetis/viewport; tidak mengakses kamera pribadi |
| 2026-11-15 | Upload server: `node --test test/uploads.test.js` (Antigravity) | PASS | 24/24 test: 3 format valid (PNG/JPEG/WebP), 17 kasus penolakan defensif (signature, MIME mismatch, corrupt, dimensi, animasi, ukuran berlebih, field salah, multipart tidak valid), batas byte exact, abort koneksi tanpa artefak, storage failure → 500 aman; tidak ada path bocor |
| 2026-11-15 | Frontend upload ke server | NOT RUN | Frontend belum mengirim ke /api/uploads |
| 2026-11-16 | Inspeksi awal `git status --short`, `git diff --stat`, `git diff`, `git diff --cached` | PASS | Tidak ada perubahan awal; handoff lama tidak mencerminkan status Git saat ini |
| 2026-11-16 | `npm run build --prefix frontend` | PASS | Vite memproses 6 modul |
| 2026-11-16 | Backend uji terisolasi port 3100 dengan storage temp; `BACKEND_URL=http://127.0.0.1:3100 npm run dev --prefix frontend -- --port 5174` | PASS | Browser mengakses proxy Vite, bukan FastAPI langsung |
| 2026-11-16 | Pembuatan fixture: import path internal Sharp | ERROR harness | `ERR_MODULE_NOT_FOUND`; diperbaiki menjadi `import sharp from 'sharp'` dari cwd backend, tanpa perubahan source aplikasi |
| 2026-11-16 | Browser: file PNG/JPEG/WebP sintetis 160×100 → preview → upload | PASS | HTTP 201, ID respons tampil di UI, dimensi sesuai; hapus preview dan input palsu `.png` tanpa request upload juga PASS |
| 2026-11-16 | Browser: animated WebP → server | PASS | HTTP 422, pesan penolakan server tampil, preview tetap tersedia |
| 2026-11-16 | Browser offline → upload → online → pilih ulang | PASS | Pesan kegagalan konfirmasi, preview tetap tersedia, upload kembali berhasil |
| 2026-11-16 | Tunda JSON respons upload nyata; ganti gambar/hapus sebelum penyelesaian | PASS | Status proses terlihat, signal request lama aborted, hasil lama tidak mengganti ID terbaru atau menghidupkan preview yang dihapus |
| 2026-11-16 | Browser: file dengan MIME kosong | PASS | Multipart memakai MIME hasil signature; server menerima dan UI menampilkan sukses |
| 2026-11-16 | Injeksi getUserMedia dengan stream canvas dua warna → Buka kamera → Ambil foto | PASS | PNG 160×100 diunggah ke Express nyata; ID tampil dan track berstatus ended |
| 2026-11-16 | Screenshot browser mobile 390×844 | PASS | Preview/ID upload tampil, tanpa overflow horizontal; backend health terhubung |
| 2026-11-16 | Suite backend, kamera fisik, FastAPI/model/ekstraksi | NOT RUN | Backend tidak berubah; suite 24/24 adalah hasil sesi sebelumnya. Kamera hanya stream sintetis; FastAPI tidak dijalankan pada sesi ini |
| 2026-11-16 | Penerimaan fisik: inspeksi awal Git | PASS | Enam file sebelumnya masih berubah, staged diff kosong; tidak menimpa perubahan sebelumnya |
| 2026-11-16 | PowerShell `Get-PnpDevice -PresentOnly` difilter kelas Camera/Image | PASS | Windows mendeteksi PC Camera dengan status OK |
| 2026-11-16 | PowerShell pencarian proses `chrome,msedge` | EXIT 1 | Path executable Chrome berhasil diperoleh; tidak digunakan sebagai hasil tes aplikasi |
| 2026-11-16 | Browser Chrome 158 berprofil temp, server 3100 dan Vite 5174, izin kamera setelah persetujuan pengguna | PASS | Browser mengakses layanan loopback; tanpa fake-device flag/injeksi getUserMedia; izin browser diberikan lewat automation |
| 2026-11-16 | Capture pertama dari default REDMI Note 15 Windows Virtual Camera | PASS terbatas | Preview/upload HTTP 201 dan track ended; bukan bukti kamera USB, tidak dipakai untuk menutup penerimaan fisik |
| 2026-11-16 | Harness setelah mengubah pilihan kamera di settings | ERROR harness | `No element found for selector: #clear-image`: tab masih di chrome://settings/content/camera; diselesaikan dengan navigasi eksplisit kembali ke aplikasi, tanpa perubahan source |
| 2026-11-16 | Pilih PC Camera di settings profil uji; Buka kamera → Ambil foto → upload | PASS | Track berlabel PC Camera, hanya video; PNG 1280×720/1.411.950 byte; HTTP 201; ID tampil; preview terdecode; track ended dan srcObject null |
| 2026-11-16 | Tutup browser/layanan uji dan hapus folder upload serta profil temp | PASS | Kedua hasil capture dan profil uji dihapus; tidak mengubah storage atau profil browser utama pengguna |
| 2026-11-16 | Build, suite backend, kamera mobile, hidden-state non-headless, dialog izin OS/browser manual | NOT RUN | Tidak ada perubahan source; bukti build/backend terdahulu dipertahankan. Izin kamera browser diatur melalui automation setelah persetujuan pengguna |
| 2026-11-16 | Readiness: `git status --short`, `git diff --stat`, `git diff`, `git diff --cached` | PASS | Workspace bersih pada awal tugas; catatan uncommitted handoff sebelumnya sudah kedaluwarsa |
| 2026-11-16 | PowerShell CIM CPU/OS/GPU dan pencarian `nvidia-smi` | PASS inventaris | Ryzen 5 7430U, AMD iGPU, RAM terlihat/bebas tercatat; bukan benchmark AI |
| 2026-11-16 | CIM disk dengan filter string dalam nested shell | ERROR harness | Kutip filter hilang menjadi `DeviceID=D:` → Invalid query; bukan kegagalan disk |
| 2026-11-16 | PowerShell `Get-Volume -DriveLetter D` | PASS | NTFS, 27,17 GiB bebas; menggantikan query disk yang gagal |
| 2026-11-16 | `py --list-paths`; `.venv/Scripts/python.exe -c` memakai sys/platform/importlib | PASS inventaris | CPython 3.14.3, health deps tersedia, dependensi inferensi belum ada |
| 2026-11-16 | Baca sumber primer SCHP/ATR, metadata PyPI dan matriks TorchVision | PASS pemeriksaan | Dependensi CUDA/legacy terbukti; kode MIT, hak redistribusi checkpoint belum jelas. URL/bukti spesifik di D-014 |
| 2026-11-16 | Install runtime, download checkpoint, forward CPU, kualitas mask, latency/RAM peak, build/test aplikasi | NOT RUN | Tugas dibatasi readiness tanpa instalasi/model; source aplikasi tidak berubah. Tidak mengulang tes M1/M2 |
| 2026-11-16 | `py -3.14 -m venv ai-service/.venv-test` lalu pip install torch torchvision dari `https://download.pytorch.org/whl/cpu` | PASS | `torch-2.15.0+cpu`, `torchvision-0.29.2+cpu`, `numpy-2.5.4`, `pillow-13.0.0` terpasang di venv uji terisolasi; `.venv` health tetap utuh |
| 2026-11-16 | `ai-service/.venv-test/Scripts/python.exe ai-service/smoke_cpu.py` | PASS | 7 pengujian: verifikasi CPU device, matmul, Conv2d+BatchNorm2d+ReLU forward, PIL<->numpy<->tensor, torchvision transform 512×512 normalisasi ATR |
| 2026-11-16 | `agy update` | PASS | Antigravity CLI terverifikasi pada versi terbaru 1.5.9 |
| 2026-11-16 | `ai-service/.venv-test/Scripts/python.exe ai-service/test_schp_cpu.py` | PASS | Instansiasi ResNet-101 (66.7M params, 603 keys, 119 ABN running stats), forward pass CPU 1.977s pada input [1,3,512,512], upsample/argmax 18 kelas terverifikasi |
| 2026-11-16 | `npm test --prefix backend` | PASS | 24/24 unit & integration tests validasi upload Express lulus tanpa regresi |
| 2026-11-16 | `npm run build --prefix frontend` | PASS | Bundle Vite 6 modul berhasil dibangun tanpa regresi |
| 2026-11-16 | `ai-service/.venv-test/Scripts/python.exe ai-service/download_model.py` | PASS | Download checkpoint resmi `exp-schp-201908301523-atr.pth` (267.445.237 bytes / 255.06 MB) dari Hugging Face ke `ai-service/models/` setelah izin pengguna |
| 2026-11-16 | `ai-service/.venv-test/Scripts/python.exe ai-service/load_checkpoint_cpu.py` | PASS | Checksum SHA-256 diverifikasi (`e9d7c91c...`), pemuatan 603 keys ke `resnet101(num_classes=18)` strictly match (0 missing, 0 unexpected), forward pass CPU 1.857s dengan logits valid [-2.12, 8.87] |
| 2026-11-16 | `ai-service/.venv-test/Scripts/python.exe ai-service/test_extractor.py` | PASS | Preprocessing letterbox 3 rasio aspek, ekstraksi model SCHP ATR-18 dalam 1.901s, deteksi kategori pakaian (hat, upper, pants, shoes, bag), alpha transparency 0/255 verification PASS, RGBA PNG save & reload verified |
| 2026-11-16 | `ai-service/.venv-test/Scripts/python.exe ai-service/test_api.py` | PASS | 5/5 unit & integration tests FastAPI lulus dalam 9.01s: GET /health (model_loaded: true), POST /extract valid (1.87s, base64 RGBA valid), POST /extract corrupt (400), POST /extract-path disk write (200), POST /extract-path not found (404) |
| 2026-11-16 | `ai-service/.venv-test/Scripts/python.exe ai-service/smoke_api_live.py` | PASS | Uvicorn live server subprocess loopback 127.0.0.1:8005: GET /health (model_loaded: true), POST /extract live HTTP request lulus dalam 1.82s dengan kategori terdeteksi dan output PNG RGBA valid |
| 2026-11-16 | `npm test --prefix backend` | PASS | 27/27 unit & integration tests lulus tanpa regresi (termasuk health check boolean, ekstraksi valid, serving asset PNG/mask, dan penanganan error 400/404/503) |
| 2026-11-16 | `node scripts/smoke_integration_e2e.mjs` | PASS | Full E2E loopback: booting FastAPI (8005) + Express (3005) -> health probe -> upload gambar sintetis -> POST /api/uploads/:uploadId/extract (2.20s total, AI reported 2.097s, kategori 'Upper-clothes' & 'Pants') -> GET extracted.png (200x300, 4 channels RGBA) -> GET mask.png terverifikasi 100% |
| 2026-11-16 | `npm run build --prefix frontend` | PASS | Bundle Vite 6 modul berhasil dibangun tanpa regresi |
| 2026-11-16 | Job orchestrator asynchronous dan antrean job M4 (`/api/jobs`, status polling, manifest galeri objek) | NOT RUN | M3 selesai penuh; job orchestrator dan galeri objek adalah target berikutnya di M4 |
| 2026-11-17 | Inspeksi awal `git status --short`, `git diff --stat`, `git diff --cached --stat` | PASS | Working tree dan index bersih; tidak ada perubahan agent sebelumnya yang perlu ditimpa |
| 2026-11-17 | `npm test --prefix backend` | PASS | 32/32: 27 tes lama + 5 tes lifecycle/security job, serialisasi antrean, failure recovery, restart, file output hilang, foreground kosong, sanitasi respons |
| 2026-11-17 | Smoke sementara `node --input-type=module` melalui stdin; FastAPI nyata pada port 8017, Express port dinamis, storage temp | PASS | Multipart → HTTP 202 dalam 123 ms; JSON referensi upload diterima; job kedua terlihat queued; keduanya processing → completed; inferensi 2.0079s dan 1.88s; kategori Upper-clothes/Pants, RGBA 200×300, alpha min/max 0/255 |
| 2026-11-17 | Smoke AI tidak dapat dihubungi melalui instance Express terisolasi | PASS | Job diterima lalu failed/EXTRACTION_FAILED; health backend tetap HTTP 200 |
| 2026-11-17 | UI/browser, build frontend, PNG per kategori, download job/ZIP | NOT RUN | Frontend tidak diubah; fitur galeri/download belum tersedia. Tidak mengklaim M4 selesai |
| 2026-11-17 | Cleanup smoke | PASS | Server Express uji ditutup; fixture/storage temp dihapus; service FastAPI 8017 dihentikan. Tidak menyentuh foto/storage pengguna |
| 2026-11-17 | Tugas kategori: inspeksi awal `git status --short`, `git diff --stat`, `git diff --cached --stat`, `git diff` | PASS | Working tree/index bersih; catatan uncommitted handoff sebelumnya sudah kedaluwarsa |
| 2026-11-17 | `ai-service/.venv-test/Scripts/python.exe -m unittest discover -s ai-service -p test_category_objects.py` | PASS | 7/7, tanpa memuat model: RGB/alpha, padding/clipping, sepatu kiri/kanan, kategori disconnected, 50/51, kosong/tiny dan storage failure |
| 2026-11-17 | `ai-service/.venv-test/Scripts/python.exe ai-service/test_api.py` | PASS | 7/7 dalam 16.576s: checkpoint asli, kedua endpoint, objects_dir saja dan opt-in/legacy, crop disk/RGB/alpha, full-frame/base64 dan error input |
| 2026-11-17 | `npm test --prefix backend` pertama setelah integrasi kategori | FAIL | Beberapa job gagal sebelum fixture AI; EPERM pada manifest. Tidak dianggap PASS meski kasus negatif menerima status failed |
| 2026-11-17 | Diagnostik sementara Node: buka read handle manifest lalu jalankan worker | PASS diagnosis | Teramati `EPERM rename manifest.tmp → manifest.json` saat reader terbuka; penyebab race Windows dibuktikan, bukan spekulasi |
| 2026-11-17 | `npm test --prefix backend` setelah snapshot polling | PASS | 69/69, termasuk 34 kasus metadata/artefak kategori invalid dan seluruh tes upload/ekstraksi/job sebelumnya |
| 2026-11-17 | `node .smoke-category.mjs` (cwd backend; script sementara) dengan FastAPI 8018 | PASS | queued → processing → completed; foreground + Upper-clothes 104×85/7547 piksel + Pants 94×104/7989 piksel; inferensi 2.3621s. RGB crop tepat, alpha biner/disjoint/subset foreground, manifest publik tanpa file/path |
| 2026-11-17 | Cleanup tugas kategori | PASS | Script smoke, fixture dan storage temp dihapus; Express dan FastAPI 8018 uji dihentikan. Tidak menyentuh foto/storage pengguna |
| 2026-11-17 | Browser/build frontend, kualitas foto nyata, preview/unduhan job/ZIP | NOT RUN | Frontend tidak berubah; endpoint preview/unduhan job dan UI galeri belum tersedia |
| 2026-11-17 | Tugas unduhan: inspeksi awal `git status --short`, `git diff --stat`, `git diff`, `git diff --cached --stat` | PASS | Working tree/index bersih; tidak ada perubahan awal yang ditimpa |
| 2026-11-17 | `node --test backend/test/jobs.test.js` | PASS | 45/45: lifecycle/kategori sebelumnya serta preview/attachment foreground/crop, byte/header, restart, UUID invalid/lintas-job, non-completed, hasil kosong, file hilang/non-file, path manifest tidak aman dan junction keluar job |
| 2026-11-17 | Smoke sementara `node --input-type=module` melalui stdin (cwd backend), FastAPI/model asli port 8019, Express dinamis | PASS | Job completed; preview + attachment human 200×300, Upper-clothes 104×85, Pants 94×104. Byte sama persis dengan file manifest, RGBA, alpha min/max 0/255; header sesuai; inferensi 2.05s |
| 2026-11-17 | Cleanup smoke unduhan | PASS | Express ditutup, storage temp dihapus, FastAPI 8019 dihentikan. Script lewat stdin tidak membuat file; tidak menyentuh foto/storage pengguna |
| 2026-11-17 | Suite backend lain/Python, browser/build frontend, kualitas foto nyata dan ZIP | NOT RUN | Verifikasi dibatasi jalur job/endpoint yang berubah; frontend, AI dan ZIP tidak diubah pada tugas ini |
| 2026-11-17 | Tugas UI: inspeksi awal Git status/diff/index | PASS | Working tree/index bersih; pekerjaan endpoint sebelumnya sudah tidak pending |
| 2026-11-17 | `npm run build --prefix frontend` | PASS | Vite 7 modul; tanpa dependensi tambahan |
| 2026-11-17 | Browser build preview 5175 → Express 3120 → model asli 8020, fixture sintetis 200×300 | PASS | Upload, queued/processing/completed; kartu human 200×300, Upper-clothes 104×85, Pants 94×104; seluruh preview terdecode |
| 2026-11-17 | Klik Unduh PNG asli pada Upper-clothes; Node/Sharp via stdin | PASS | PNG browser 451 byte, byte-identical dengan file kategori manifest, RGBA 104×85 dan alpha min/max 0/255 |
| 2026-11-17 | Screenshot desktop 1365×1000/mobile 390×844 | PASS | Dua panel desktop; panel/kartu bertumpuk mobile; tanpa overflow horizontal |
| 2026-11-17 | Ganti ke fixture putih 160×100; ekstraksi model asli | PASS | Galeri lama dibersihkan; completed nol objek menampilkan pesan kosong |
| 2026-11-17 | Tahan JSON POST lalu Hapus; tahan GET polling lalu ganti input | PASS | Signal lama aborted; respons yang dilepas tidak mengubah galeri/ID/status pilihan terbaru |
| 2026-11-17 | Injeksi satu kegagalan GET lalu Periksa status | PASS | Job ID sama, hanya satu POST; galeri tiga objek pulih |
| 2026-11-17 | Injeksi HTTP 404 tiga preview dan gangguan fetch upload | PASS | Pesan error per kartu; upload gagal mempertahankan preview dan menonaktifkan ekstraksi |
| 2026-11-17 | Kamera stream canvas sintetis → capture → upload | PASS | Galeri reset, PNG diunggah, ekstraksi aktif, track ended; bukan kamera fisik |
| 2026-11-17 | Navigasi nyata saat JSON POST ditahan; pagehide diamati via sessionStorage | PASS | Signal aborted, galeri kosong, tombol disabled sebelum halaman ditinggalkan |
| 2026-11-17 | Hentikan FastAPI 8020 lalu ekstraksi browser | PASS | Job failed dengan pesan, tanpa kartu palsu, preview input tetap tersedia dan indikator berhenti |
| 2026-11-17 | Harness browser awal | ERROR harness | document digunakan di runtime tab.run, lalu assert.equal pada helper assert fungsi; diperbaiki tanpa mengulang ekstraksi sukses. Timeout preview karena pemilihan file sama tidak memicu change; Hapus pilihan dahulu menyelesaikan skenario |
| 2026-11-17 | Cleanup UI smoke | PASS | Tab ditutup, layanan uji dihentikan, fixture/upload/job temp serta PNG unduhan dihapus; tanpa foto pribadi |
| 2026-11-17 | Suite backend/Python, kamera/mobile fisik, foto nyata, ZIP | NOT RUN | Backend/model tidak berubah; kamera sintetis dan viewport mobile saja; ZIP belum tersedia |
| 2026-11-17 | Tugas ZIP: inspeksi awal Git status/diff/index | PASS | Working tree/index bersih; perubahan UI sebelumnya sudah tidak pending |
| 2026-11-17 | `npm install --prefix backend --no-audit --no-fund` | FAIL | npm mencari package.json di root proyek dan menghasilkan ENOENT; tidak ada package.json root |
| 2026-11-17 | `npm install --no-audit --no-fund` dari cwd backend | PASS | Archiver 8.0.0 dan 44 paket tambahan terpasang; lockfile diperbarui |
| 2026-11-17 | `node --test backend/test/jobs.test.js` | FAIL terbatas | 51/52 PASS. Satu ekspektasi JSON null salah: parser strict menolak lebih dahulu dengan INVALID_JOB_REQUEST. Tes input lain pada kasus tersebut belum selesai saat assertion gagal |
| 2026-11-17 | `node --test --test-name-pattern="ZIP selection rejects" backend/test/jobs.test.js` setelah koreksi ekspektasi | PASS | 1/1, seluruh kasus input/UUID/duplikat/lintas-job/content-type/body limit pada tes ini selesai; source aplikasi tidak diubah untuk perbaikan tes |
| 2026-11-17 | Smoke `node --input-type=module` via stdin, cwd backend; FastAPI model asli 8021 + Express dinamis | PASS | Inferensi 2.1146s; ZIP pilihan Upper-clothes/Pants 1202 byte (2 PNG), ZIP semua 3824 byte (3 PNG). zipfile Python memverifikasi CRC dan inventaris; byte PNG identik, RGBA/alpha 0/255 |
| 2026-11-17 | Cleanup smoke ZIP | PASS | Express ditutup; ZIP/fixture/storage temp dihapus; FastAPI 8021 dihentikan. Script via stdin, tanpa foto pribadi |
| 2026-11-17 | Suite backend penuh setelah koreksi tes, suite Python AI, browser/build frontend dan UI ZIP | NOT RUN | Koreksi hanya ekspektasi tes dan diverifikasi terarah; frontend/AI tidak berubah; UI ZIP belum tersedia |
| 2026-11-18 | Inspeksi awal Git status/diff dan staged diff | PASS | Sepuluh file modified + helper zip-export.js untracked dari sesi sebelumnya tetap dipertahankan; index kosong |
| 2026-11-18 | `npm run build` (cwd frontend) | PASS | Vite 7 modul; tanpa dependensi baru |
| 2026-11-18 | Browser Chromium melalui preview build 5176 → Express 3122 → FastAPI/model asli 8022 | PASS | Fixture sintetis 200×300 menghasilkan human, Upper-clothes dan Pants; preview terdecode, pilihan awal kosong, aksi ZIP sesuai ketersediaan |
| 2026-11-18 | Klik Unduh Pilihan (dua kategori), Unduh Semua, Unduh PNG asli; Python stdin zipfile/Pillow | PASS | ZIP 1202/3824 byte; CRC, inventaris tepat, byte PNG sama dengan manifest, RGBA dan alpha 0/255. PNG individual 451 byte identik dengan crop sumber |
| 2026-11-18 | Screenshot desktop 1365×1000 dan mobile 390×844; interaksi mobile | PASS | Dua panel desktop, tumpuk mobile; tanpa overflow horizontal. Deselection menonaktifkan Unduh Pilihan; Unduh Semua tetap aktif |
| 2026-11-18 | Browser unduh ulang link sukses; injeksi HTTP 404 dan pemulihan | PASS | Unduh ulang tanpa POST; error tampil, checkbox tetap dipilih, link lama dibersihkan, percobaan manual berhasil mengunduh ZIP satu kategori |
| 2026-11-18 | Injeksi network failure dan download_url eksternal pada respons ekspor nyata | PASS | Pesan error, tombol pulih, tidak memicu unduhan atau membuka URL tidak aman |
| 2026-11-18 | Tahan pembacaan JSON ekspor nyata; ganti gambar lalu ekstrak input putih sebelum melepas respons | PASS | Tombol/checkbox terkunci, hanya satu POST, signal aborted saat ganti. Job baru completed kosong; ekspor nonaktif, link/status kosong, tidak ada klik unduhan usang |
| 2026-11-18 | Suite backend/Python, kamera/mobile fisik, kualitas foto nyata, M5 | NOT RUN | Backend/model tidak berubah; pengujian fitur melalui browser dan pemeriksaan archive, bukan pengulangan suite lama. Fixture sintetis tanpa foto pribadi |
| 2026-11-18 | Cleanup browser/layanan/artefak uji | PASS | Tab serta layanan 5176/3122/8022 ditutup; fixture/storage temp dan empat file unduhan dihapus. Tidak ada script sementara atau foto pribadi |
| 2026-11-18 | Tugas helper M5: inspeksi awal Git status/diff/index | PASS | Working tree/index bersih; perubahan tugas UI ZIP tidak lagi pending |
| 2026-11-18 | `node --test backend/test/pixelation.test.js` | PASS | 5/5: nearest tanpa blending, RGB alpha 0/1/127, enlargement, ukuran/rasio/sisi satu piksel, penolakan input, determinisme dan buffer original tetap identik |
| 2026-11-18 | Smoke `node --input-type=module` via stdin, cwd backend; PNG temp + pembaca Pillow melalui Python venv | FAIL pembanding 128 | File original tetap byte-identical; semua piksel output 16/32/64 cocok Pillow NEAREST. Perbandingan output 77×128 gagal; file temp dibersihkan melalui finally |
| 2026-11-18 | Diagnostik stdin Node/Python untuk output 128, oracle koordinat pusat integer | PASS | Seluruh 9856 piksel RGBA sesuai kontrak. Pillow berbeda 128 piksel di kolom 38 saja: helper mengambil x=96 tepat di batas, Pillow x=95. Tidak ada perubahan source untuk menyamakan pembanding |
| 2026-11-18 | Suite backend lain, AI, build/browser frontend, API pixelation dan UI Studio | NOT RUN | Source existing tidak diubah; tugas hanya helper internal. API/UI belum tersedia, tidak mengklaim fitur browser selesai |
| 2026-11-18 | `node --test backend/test/pixelation.test.js` (verifikasi) | PASS | 5/5 subtest lulus |
| 2026-11-18 | `node --test backend/test/jobs.test.js` | PASS | 23/23 subtest suite (57 subtests) PASS: snapshot pixelation independen, sampling exact, restart, proteksi symlink/junction, validasi manifest |
| 2026-11-18 | `npm test --prefix backend` | PASS | 89/89 tests PASS: seluruh suite backend (extractions, jobs, pixelation, uploads) lulus 100% |
| 2026-11-18 | `npm run build --prefix frontend` | PASS | Vite 7 modul berhasil di-bundle (208ms) |
| 2026-11-18 | UI Frontend Studio pixelation, AI stylization (M6), live browser | NOT RUN | UI Studio belum dibuat; diuji pada tugas berikutnya |

Catatan kamera 2026-11-15: browser bersama mengabaikan argumen fake-device (dilaporkan ke tool); tes dipindah ke Chrome/profil temp terisolasi dengan flag diverifikasi. Browser uji dihentikan; profil/fixture temp dihapus. Tidak mengubah source untuk mengatasi batas harness.

Fixture sintetis sementara di folder temp telah dihapus. Pengujian browser dijalankan melalui harness sesi, bukan test suite permanen baru.

Sesi 2026-11-16: tab browser dan layanan uji port 3100/5174 dihentikan; fixture serta storage temp upload sintetis dihapus. Kamera memakai injeksi stream canvas, bukan perangkat fisik. Tidak membuat script/test permanen atau mengubah storage pengguna.

## Cara memperbarui dokumen

Setelah satu tugas selesai: ubah status berdasarkan **bukti tes**, catat file diubah, hasil perintah, kendala, dan satu next task. Selaraskan `HANDOFF.md`. Jangan menulis PASS jika tidak benar-benar menjalankan tes.
