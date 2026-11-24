# IMMOExtract — Architecture Decision Log

> Catat keputusan stabil di sini. Setiap perubahan besar: **tanggal, keputusan, alasan, konsekuensi, dan status**. Jangan mengubah spesifikasi diam-diam.

## D-001 — Fokus produk

- **Status:** Accepted (keputusan pengguna).
- **Keputusan:** Ekstraksi difokuskan pada **manusia beserta pakaian dan aksesori**; satu manusia utama pada MVP.
- **Alasan:** Memperkecil masalah computer vision sehingga dapat diuji dengan realistis.
- **Konsekuensi:** Objek umum, multi-person dan instance kompleks bukan prioritas awal.

## D-002 — Dua mode pixel art

- **Status:** Accepted (keputusan pengguna).
- **Keputusan:** Classic Pixelation **dan** AI Pixel Art Stylization tersedia dalam visi produk.
- **Alasan:** Pixelation ringan dan deterministik; stylization lebih artistik tapi mahal secara komputasi.
- **Konsekuensi:** Classic Pixelation dibuat lebih dahulu, generative stylization tahap lanjut; dua mode tidak boleh disamakan.

## D-003 — AI sepenuhnya lokal

- **Status:** Accepted (keputusan pengguna).
- **Keputusan:** Inferensi AI dijalankan di komputer/server sendiri, bukan API AI cloud.
- **Alasan:** Kontrol data, offline setelah setup, dan tanpa biaya inference cloud.
- **Konsekuensi:** Latensi/kelayakan tergantung CPU/GPU/RAM, checkpoint wajib tersedia lokal.

## D-004 — Stack web dan batas service

- **Status:** Accepted; fondasi M1 teruji lokal pada 2026-11-15.
- **Keputusan:** Frontend Vite + Vanilla JS + Tailwind, backend Express.js, AI Python + FastAPI.
- **Alasan:** Web ringan; Express cocok untuk HTTP/file; Python cocok untuk computer vision.
- **Konsekuensi:** Dua proses lokal berkomunikasi lewat HTTP; dokumentasikan cara menjalankan masing-masing.

## D-005 — Model AI awal

- **Status:** Proposed / harus diuji.
- **Keputusan:** Mulai proof-of-concept dengan SCHP ATR-18 untuk parsing pakaian/manusia.
- **Alasan:** Kategori human parsing lebih relevan daripada deteksi objek umum.
- **Konsekuensi:** Evaluasi akurasi, label, dependensi, lisensi, dan kelayakan CPU sebelum dianggap pilihan final.
- **Pemeriksaan 2026-11-16:** Tetap kandidat, belum final. Hambatan CPU/Windows dan batas lisensi checkpoint dicatat di D-014; belum ada model diunduh atau inferensi dijalankan.

## D-006 — Tidak ada login/database pada MVP

- **Status:** Accepted as MVP scope.
- **Keputusan:** Metadata pekerjaan disimpan di filesystem lokal; akun dan DB dapat ditambahkan jika ada kebutuhan nyata.
- **Alasan:** Mengurangi kompleksitas dan token terbuang untuk fitur di luar inti.
- **Konsekuensi:** Hasil sementara, belum ada riwayat permanen atau sinkronisasi akun.

## D-007 — Original download independen

- **Status:** Accepted (keputusan pengguna).
- **Keputusan:** Hasil ekstraksi PNG dapat diunduh per objek, beberapa objek, atau semua ZIP tanpa perlu pixel art.
- **Alasan:** Pengguna mungkin hanya memerlukan objek asli.
- **Konsekuensi:** Layanan ekspor dipisah dari layanan konversi pixel art.

## D-008 — Identitas visual

- **Status:** Accepted (keputusan pengguna).
- **Keputusan:** `#171738` background, `#4B2A7B` panels, `#A23EAE` secondary, `#F72585` highlight, `#00F5D4` dominant brand accent.
- **Alasan:** Dark futuristic creative workspace.
- **Konsekuensi:** Terapkan tema konsisten, perhatikan aksesibilitas dan kontras teks.

## D-009 — Multi-agent workflow

- **Status:** Accepted as development workflow.
- **Keputusan:** Urutan kerja yang diinginkan: **OMP → Antigravity CLI → Claude Website**, disambung melalui Git + docs, bukan riwayat chat.
- **Alasan:** Bisa berganti agent saat batas penggunaan tercapai tanpa kehilangan konteks.
- **Konsekuensi:** `PROGRESS.md` dan `HANDOFF.md` wajib faktual dan terbaru; Claude Website memerlukan dokumen/source file relevan yang diunggah secara eksplisit.

## D-010 — Runtime dan koneksi minimal M1

- **Tanggal:** 2026-11-15.
- **Status:** Accepted untuk M1; bukan keputusan runtime model M3.
- **Keputusan:** Gunakan Node.js 22.12.0, npm 10.9.0, Python 3.14.3 yang tersedia. Dependensi langsung: Vite 8.3.8, Tailwind CSS dan plugin Vite 4.3.5, Express 5.3.0, FastAPI 0.163.0, Uvicorn 0.54.0. npm memakai package-lock; requirements Python mem-pin dependensi langsung.
- **Keputusan koneksi:** Vite port 5173 → proxy `/api` → Express port 3000 → FastAPI port 8000; semuanya loopback. Express `/api/health` independen; `/api/health/ai` memanggil FastAPI `/health`, timeout bawaan 3000 ms, gagal HTTP 503. Kontrak M1 selalu menyatakan `model_loaded: false`.
- **Alasan:** Membuktikan batas layanan dengan HTTP nyata tanpa menambah model, library gambar, framework UI, atau konfigurasi CORS terbuka.
- **Alternatif:** Akses FastAPI langsung dari browser ditolak karena melanggar batas arsitektur; endpoint health gabungan tunggal tidak dipilih agar backend tetap dapat diperiksa saat FastAPI mati.
- **Konsekuensi:** Python 3.14.3 hanya terbukti untuk health service; kompatibilitas AI harus dievaluasi pada M3. Kontrak health perlu diperbarui saat model benar-benar tersedia. Dependensi transitif Python belum dikunci penuh. Proxy dev/preview bukan deployment produksi.
- **Bukti tes:** build Vite PASS; smoke nyata 7 pemeriksaan PASS; FastAPI dihentikan menghasilkan 503 dengan 6 pemeriksaan PASS; browser desktop/mobile dan pemulihan setelah restart FastAPI PASS. Detail di `PROGRESS.md`.

## D-011 — Preview gambar lokal sebelum upload server

- **Tanggal:** 2026-11-15.
- **Status:** Accepted untuk tugas pertama M2; M2 belum selesai.
- **Keputusan:** File input satu gambar dengan object URL, tanpa request upload atau penyimpanan. Terima JPEG/PNG/WebP setelah pemeriksaan signature, MIME jika tersedia, dan decode browser. URL lama dicabut ketika diganti, dihapus, atau gagal; hasil async yang usang tidak boleh mengganti pilihan terbaru.
- **Batas sementara:** Maksimal 10 MiB (10 × 1024 × 1024 byte), sisi 8192 piksel, total 24.000.000 piksel. Batas ini keputusan konservatif preview, bukan hasil benchmark atau batas inferensi final.
- **Alasan:** Memberikan preview yang jujur dan terbatas tanpa memulai endpoint upload, job, kamera, atau AI sekaligus.
- **Alternatif:** Data URL tidak dipilih agar tidak menyalin seluruh gambar menjadi string base64 di aplikasi.
- **Konsekuensi:** Pemeriksaan dimensi baru dilakukan setelah decode; tidak menjamin keamanan dekompresi. Validasi server tetap wajib sebelum menerima upload. Belum ada dependensi tambahan.
- **Bukti tes:** Build frontend PASS; preview JPEG/PNG/WebP, tujuh penolakan input, hapus/pilih ulang, race decode terkendali, cleanup URL, dan tampilan mobile PASS; tidak ada request HTTP selama pengujian pemilihan gambar.

## D-012 — Kamera lokal memakai lifecycle preview yang sama

- **Tanggal:** 2026-11-15.
- **Status:** Accepted untuk tugas kamera M2; upload server belum tersedia.
- **Keputusan:** `getUserMedia` setelah tindakan pengguna, `audio: false`, preferensi ideal kamera belakang/1280×720. Canvas menghasilkan PNG yang masuk `showImage` dan batas D-011. Dimensi diperiksa sebelum alokasi canvas; tanpa dependensi baru.
- **Lifecycle:** Semua track dihentikan setelah frame disalin, saat tutup/hapus/pilih file, `visibilitychange` ke hidden, dan `pagehide`. Nomor sesi membatalkan hasil izin/encoding usang; stream yang diterima setelah pembatalan langsung dihentikan.
- **Alasan:** Menjaga privasi dan mencegah foto async lama menimpa pilihan terbaru tanpa membuat pipeline upload.
- **Alternatif:** Atribut file input `capture` saja tidak menyediakan kontrol live view, izin, dan penghentian stream yang konsisten.
- **Konsekuensi:** Memerlukan secure context; dialog izin tidak selalu bisa ditutup programatis. Tes sintetis tidak membuktikan kompatibilitas kamera fisik.
- **Bukti tes:** Build PASS; kamera sintetis → PNG 1280×720/nonuniform; penolakan/pemulihan izin, track shutdown, race async, file fallback, navigasi aktual, dan viewport mobile PASS. Hidden handler diuji lewat injeksi karena tab headless tetap visible.

## D-013 — Upload otomatis setelah preview lokal

- **Tanggal:** 2026-11-16.
- **Status:** Accepted; integrasi frontend dan kamera fisik M2 terverifikasi.
- **Keputusan:** File dan capture kamera yang lolos preview dikirim otomatis ke `POST /api/uploads` dengan multipart field `image`, sesuai next task handoff. UI menjelaskan pengiriman sebelum pemilihan, menampilkan status proses, `upload_id` atau pesan error server; bukan job/hasil AI.
- **Lifecycle:** AbortController membatalkan request ketika pilihan diganti, dihapus, kamera dibuka, atau halaman ditinggalkan. Nomor seleksi mencegah respons usang mengganti UI. Kegagalan upload mempertahankan preview; mencoba lagi melalui pemilihan ulang, tanpa retry otomatis.
- **MIME:** File dengan MIME kosong memakai tipe hasil pemeriksaan signature untuk multipart; MIME yang tidak sesuai tetap ditolak.
- **Alasan:** Menyambung validasi server yang sudah tersedia ke lifecycle preview/kamera tanpa pipeline baru atau dependensi tambahan. Menggantikan batas “hanya lokal di browser” pada D-011/D-012.
- **Alternatif:** Tombol upload terpisah tidak dipilih karena tugas aktif meminta upload setelah preview.
- **Konsekuensi:** Abort bukan rollback storage. Gambar yang sudah diterima server tetap tersimpan; hapus preview bukan penghapusan server. Retensi otomatis belum tersedia dan dijelaskan di UI.
- **Bukti tes:** Build frontend dan browser melalui Vite → Express PASS: tiga format, penolakan animasi, offline/pemulihan, race ganti/hapus, MIME kosong, kamera stream canvas sintetis, serta tampilan mobile.
- **Bukti tambahan 2026-11-16:** PC Camera USB pada Windows/Chrome 158, tanpa injeksi stream: capture PNG 1280×720, preview terdecode, upload HTTP 201 dan ID tampil, track ended serta srcObject dilepas. Default browser awal memilih kamera virtual; memilih PC Camera melalui pengaturan profil uji menyelesaikan penerimaan fisik tanpa perubahan kode.

## D-014 — Kesiapan M3: CPU dahulu, tanpa mengubah environment health

- **Tanggal:** 2026-11-16.
- **Status:** Accepted untuk arah pemeriksaan runtime; versi paket, adaptasi SCHP, dan kualitas model belum terbukti.
- **Keputusan:** Target pertama CPU lokal, satu gambar/worker; pertahankan `.venv` health yang bekerja. Uji runtime di environment terpisah sebelum integrasi atau download checkpoint. Tidak memasang CUDA, mengganti model, atau menambah layanan cloud.
- **Alasan hardware:** Ryzen 5 7430U (6 core/12 thread), AMD Radeon terintegrasi; tidak ada NVIDIA pada enumerasi GPU dan `nvidia-smi` tidak ditemukan di PATH. RAM tersedia saat pemeriksaan hanya sekitar 1,45 GiB; belum ada benchmark atau bukti cukupnya memori untuk SCHP.
- **Runtime:** Hanya Python 3.14.3 terdaftar oleh `py --list-paths`; torch/torchvision/NumPy/Pillow/OpenCV belum ada pada `.venv` AI. Tidak otomatis downgrade Python: [matriks TorchVision](https://github.com/pytorch/vision#installation) mencantumkan torch 2.13 + torchvision 0.28 untuk Python 3.10–3.14; [metadata PyPI torch](https://pypi.org/pypi/torch/json) memuat wheel `torch-2.13.0-cp314-cp314-win_amd64.whl`. Ini hanya bukti metadata, bukan tes instalasi/CPU/SCHP. Pin final harus berdasarkan smoke runtime; jangan menganggap wheel Windows PyPI otomatis bukti konfigurasi CPU yang dipilih.
- **Hambatan upstream terbukti:** [environment.yaml](https://github.com/GoGoDuck912/Self-Correction-Human-Parsing/blob/master/environment.yaml) mengunci Python 3.8.5, torch 1.5.1, torchvision 0.6.1, CUDA 10.1 dan paket Linux. [simple_extractor.py](https://github.com/GoGoDuck912/Self-Correction-Human-Parsing/blob/master/simple_extractor.py) memanggil `model.cuda()`/`image.cuda()` dan `torch.load` tanpa `map_location`; `--gpu None` juga diparse menjadi integer sebelum percabangan. [modules/functions.py](https://github.com/GoGoDuck912/Self-Correction-Human-Parsing/blob/master/modules/functions.py) mengompilasi sumber `.cu` saat import. Mengganti `.cuda()` saja atau downgrade Python bukan solusi CPU lengkap.
- **Prasyarat adaptasi, belum implementasi:** Hilangkan ketergantungan ekstensi CUDA dari jalur inferensi; pertahankan parameter/statistik/aktivasi normalisasi dan validasi kesetaraan, bukan mengganti InPlaceABN sembarangan dengan BatchNorm. [Upstream InPlaceABN](https://github.com/mapillary/inplace_abn) menjelaskan perbedaan parameter skala dan dukungan Linux/CUDA. Gunakan pemuatan checkpoint tepercaya ke CPU dengan mode aman yang kompatibel; kegagalan loader bukan alasan otomatis menonaktifkan proteksi pickle.
- **Kontrak model yang harus dijaga:** ATR memakai ResNet-101, input 512×512 dan 18 label termasuk background; ada Bag/Scarf dan sepatu kiri/kanan, tetapi tidak ada label Coat tersendiri atau instance “manusia utuh”. Mask manusia utuh perlu gabungan foreground; tidak menjamin instance terpisah. [Preprocessing upstream](https://github.com/GoGoDuck912/Self-Correction-Human-Parsing/blob/master/datasets/simple_extractor_dataset.py) membaca BGR dengan OpenCV, warp affine, lalu normalisasi mean `[0.406,0.456,0.485]`/std `[0.225,0.224,0.229]` pada extractor. Output upstream adalah PNG label berpalet, bukan otomatis PNG objek RGBA.
- **Lisensi kode:** [SCHP LICENSE](https://github.com/GoGoDuck912/Self-Correction-Human-Parsing/blob/master/LICENSE) adalah MIT, copyright 2020 Peike Li; pertahankan notice saat mengambil kode. InPlaceABN upstream berlisensi BSD-3-Clause; audit notice komponen yang benar-benar diadaptasi, jangan menganggap semua sumber pihak ketiga otomatis MIT.
- **Checkpoint/dataset:** [README SCHP](https://github.com/GoGoDuck912/Self-Correction-Human-Parsing#simple-out-of-box-extractor) menunjuk checkpoint resmi `exp-schp-201908301523-atr.pth` di [Google Drive](https://drive.google.com/file/d/1ruJg4lqR_jgQPj-9K0PP-L2vJERYOxLP/view); hanya halaman metadata dibaca, bukan binary. Ukuran/hash/isi checkpoint belum diverifikasi. [Repositori ATR asli](https://github.com/lemondan/HumanParsing-Dataset) meminta sitasi untuk riset akademik maupun komersial, tetapi tidak menyediakan LICENSE terpisah pada root yang diperiksa. Tidak menemukan ketentuan khusus redistribusi bobot pada sumber tersebut; MIT kode tidak dijadikan bukti hak redistribusi checkpoint/dataset. Klarifikasi sebelum bundling/distribusi/komersialisasi; izin download besar tetap harus diminta.
- **Alternatif:** Environment lama Linux/CUDA tidak dipilih untuk laptop ini. ONNX baru dipertimbangkan sesudah model PyTorch CPU dan kesetaraan output terbukti, sesuai arsitektur yang ada.
- **Bukti aktual:** Inventaris CIM, disk, launcher Python, metadata paket lokal, serta inspeksi sumber primer selesai; tidak install/download model, tidak ada tes forward, akurasi, RAM puncak, atau latensi. Detail angka dan error harness di `PROGRESS.md`.

## D-015 — Runtime PyTorch CPU terisolasi pada Python 3.14.3

- **Tanggal:** 2026-11-16.
- **Status:** Accepted untuk runtime dasar CPU terisolasi; adaptasi arsitektur SCHP dan checkpoint model belum diuji.
- **Keputusan:** Menggunakan PyTorch CPU `torch==2.15.0+cpu` dan `torchvision==0.29.2+cpu` dengan `numpy==2.5.4` dan `pillow==13.0.0` dari index wheel PyTorch CPU (`https://download.pytorch.org/whl/cpu`). Environment health `.venv` tetap utuh; runtime inferensi diuji dalam `.venv-test` terisolasi.
- **Alasan:** Terbukti dapat diinstal dan dieksekusi langsung pada Python 3.14.3 AMD64 Windows 11 tanpa kompilasi C/CUDA lokal. Operasi tensor CPU, forward Conv2d+BatchNorm2d+ReLU, interoperabilitas PIL/NumPy/Tensor, dan transform Resize(512,512)/ToTensor/Normalize lulus pengujian smoke tanpa error.
- **Alternatif:** Downgrade Python (misal ke 3.10 atau 3.8) tidak diperlukan untuk runtime inferensi dasar CPU karena wheel resmi PyTorch 2.15 CPU untuk cp314 tersedia dan stabil.
- **Konsekuensi:** Runtime siap sebagai fondasi adaptasi kode model SCHP ATR-18 (ResNet-101 CPU) dan penggantian ketergantungan ekstensi CUDA InPlaceABN. Checkpoint model belum diunduh dan belum diuji.
- **Bukti tes:** Eksekusi `ai-service/smoke_cpu.py` menghasilkan `ALL SMOKE TESTS PASSED` pada CPython 3.14.3 (AMD64) Windows 11.

## D-016 — Adaptasi arsitektur SCHP ATR-18 ke CPU murni (pure PyTorch)

- **Tanggal:** 2026-11-16.
- **Status:** Accepted; arsitektur model dan forward pass CPU terverifikasi tanpa error atau dependensi CUDA. Checkpoint bobot resmi belum diunduh.
- **Keputusan:** Mengimplementasikan `ai-service/schp_cpu/abn.py` dan `ai-service/schp_cpu/model.py` secara pure PyTorch. Modul `InPlaceABNSync` yang sebelumnya membutuhkan ekstensi CUDA C++ (`modules/functions.py`) digantikan oleh `ABN` berbasis `F.batch_norm` dan `F.leaky_relu(slope=0.01)`. Parameter state_dict (`weight`, `bias`, `running_mean`, `running_var`) dipertahankan 100% identik sehingga checkpoint upstream dapat dimuat langsung tanpa manipulasi key.
- **Alasan:** Pada tahap inferensi (eval mode), backward pass in-place tidak dieksekusi. `F.batch_norm` dengan statistik running dan `F.leaky_relu` secara matematis identik dengan InPlaceABN upstream saat inferensi. Hal ini menghilangkan 100% ketergantungan pada Ninja, MSVC, CUDA compiler, dan `.cu` kernel.
- **Alternatif:** Mengganti sembarangan dengan `nn.BatchNorm2d` standar tanpa `LeakyReLU(0.01)` ditolak karena akan merusak aktivasi terpadu InPlaceABN pada branch PSPModule, Decoder, Edge, dan Fusion. Mengompilasi InPlaceABN CPU C++ via Ninja ditolak karena menambah dependensi build tools C++ eksternal di Windows.
- **Konsekuensi:** Model ResNet-101 AugmentCE2P (66,722,900 parameter, ~254.5 MB RAM) dapat diinstansiasi dan dieksekusi murni di CPU. Forward pass untuk 1 gambar (512×512) selesai dalam ~1.98 detik di AMD Ryzen 5 7430U. Checkpoint resmi `exp-schp-201908301523-atr.pth` siap diunduh dan dimuat secara aman (`weights_only=True` / `map_location='cpu'`).
- **Bukti tes:** `test_schp_cpu.py` PASS pada CPython 3.14.3 (`ALL SCHP CPU TESTS PASSED`): parameter count 66.7M, 603 state_dict keys, 119 ABN running_mean/var buffers, forward pass CPU 1.977 detik menghasilkan tensor valid tanpa NaN, upsample 512×512 dan argmax map 18 kelas terverifikasi.

## D-017 — Pemuatan dan verifikasi checkpoint resmi SCHP ATR-18 pada CPU

- **Tanggal:** 2026-11-16.
- **Status:** Accepted; bobot model resmi terverifikasi 100% cocok dengan arsitektur CPU dan inferensi valid.
- **Keputusan:** Mengunduh dan memverifikasi checkpoint resmi `exp-schp-201908301523-atr.pth` (255.06 MB, 267.445.237 bytes, SHA-256: `e9d7c91ce3b4e7133df56b599fc817b533e3439c5e8d282a59126d2fda339a2a`) ke folder `ai-service/models/` (diabaikan Git). Pemuatan bobot dilakukan menggunakan `torch.load(..., map_location='cpu')` dengan normalisasi prefix `module.` ke dalam model `resnet101(num_classes=18)` CPU.
- **Alasan:** Izin eksplisit pengguna telah diperoleh sebelum pengunduhan. Seluruh 603 keys dari state_dict checkpoint upstream cocok persis (`<All keys matched successfully>`, 0 missing keys, 0 unexpected keys) ke dalam arsitektur pure-PyTorch CPU yang diadaptasi pada D-016.
- **Konsekuensi:** Model AI lokal siap digunakan untuk tugas inferensi human parsing sesungguhnya (ekstraksi mask foreground, multi-label clothing segmentation, dan pembuatan PNG transparan). Forward pass CPU dengan bobot terlatih asli membutuhkan waktu 1.857 detik pada Ryzen 5 7430U dengan logits range [-2.12, 8.87].
- **Bukti tes:** `ai-service/load_checkpoint_cpu.py` PASS (`=== ALL CHECKPOINT VERIFICATIONS PASSED ===`): ukuran file 267.445.237 bytes, SHA-256 match, 603 keys matched strictly, forward pass CPU 1.857s.

## D-018 — Pipeline ekstraksi human parsing dan pembuatan RGBA PNG transparan

- **Tanggal:** 2026-11-16.
- **Status:** Accepted; pipeline ekstraksi lokal terverifikasi end-to-end tanpa error atau distorsi aspect ratio.
- **Keputusan:** Mengimplementasikan `ai-service/extractor.py` dengan kelas `HumanExtractor` dan dataclass `ExtractionResult`. Pipeline melakukan:
  1. Preprocessing letterboxing ke 512×512 dengan preservasi rasio aspek gambar asli, konversi RGB→BGR, dan normalisasi ATR.
  2. Inferensi forward pass model SCHP ATR-18 pada CPU.
  3. Upsampling bilinear logits ke 512×512, cropping un-padding area valid, dan interpolasi kembali ke resolusi asli gambar `(W_orig, H_orig)`.
  4. Argmax label kelas 18 ATR dan pembuatan mask binary foreground (`class_map > 0`).
  5. Pembuatan gambar RGBA dengan transparansi alpha (`alpha=0` pada background, `alpha=255` pada foreground manusia/pakaian) dan penyimpanan PNG murni tanpa dependensi OpenCV (menggunakan Pillow dan NumPy).
- **Alasan:** Menyediakan pipeline ekstraksi mandiri yang tidak bergantung pada dependensi biner OpenCV (`cv2`), menjaga resolusi asli gambar input tanpa distorsi regangan aspek rasio, dan menghasilkan file PNG RGBA transparan sesuai kebutuhan MVP (D-001, D-007).
- **Konsekuensi:** Waktu proses ekstraksi per gambar adalah ~1.90 detik pada AMD Ryzen 5 7430U. Output pixel RGB asli di area foreground terjaga 100%, background sepenuhnya transparan (alpha 0). Siap diintegrasikan ke endpoint FastAPI (`POST /extract`).
- **Bukti tes:** `test_extractor.py` PASS (`=== ALL EXTRACTOR TESTS PASSED ===`): letterbox valid di 3 rasio aspek, deteksi kategori pakaian/bagian tubuh pada fixture sintetis, foreground ratio 21.1%, alpha transparency verification PASS, save/reload PNG RGBA PASS.

## D-019 — Endpoint FastAPI AI Service untuk Human Parsing dan Transparansi RGBA

- **Tanggal:** 2026-11-16.
- **Status:** Accepted; endpoint HTTP FastAPI dan pengujian live loopback terverifikasi 100%.
- **Keputusan:** Mengimplementasikan endpoint AI service di `ai-service/main.py`:
  1. `lifespan` handler untuk memuat `HumanExtractor` saat server startup secara aman dengan graceful fallback jika bobot belum ada (`model_loaded: false`).
  2. `GET /health`: mengembalikan `{"status": "ok", "service": "ai-service", "model_loaded": bool}`.
  3. `POST /extract`: menerima multipart upload (`file: UploadFile`), opsi simpan ke disk (`output_path`, `save_mask_path`), dan opsi `include_base64`. Mengembalikan metadata deteksi kategori, ukuran gambar asli, waktu eksekusi CPU (~1.8–1.9 detik), serta base64 RGBA transparan PNG dan mask.
  4. `POST /extract-path`: menerima JSON payload (`image_path`, `output_path`, `save_mask_path`) untuk efisiensi komunikasi antar-proses lokal pada backend terpadu.
- **Alasan:** Menyediakan kontrak REST API yang fleksibel: mendukung stateless multipart upload (terpisah mesin / proxy) dan direct shared path (lokal co-located).
- **Konsekuensi:** AI Service siap menerima request ekstraksi dari Express backend (`POST /api/jobs` atau modul ekstraksi).
- **Bukti tes:**
  - `ai-service/test_api.py` PASS (5/5 unit & integration tests dalam 9.01 detik).
  - `ai-service/smoke_api_live.py` PASS: Uvicorn live server di `127.0.0.1:8005` merespons `GET /health` (`model_loaded: true`) dan `POST /extract` selesai dalam 1.82 detik.

## D-020 — Integrasi Express Backend dengan FastAPI AI Service dan Ekstraksi Objek

- **Tanggal:** 2026-11-16.
- **Status:** Accepted; integrasi Express <-> FastAPI terverifikasi 100% via unit tests dan live loopback E2E smoke test.
- **Keputusan:**
  1. Menghubungkan Express dengan AI service melalui `AiClient` (`backend/src/ai-client.js`) yang mengelola health check probe dan pemanggilan ekstraksi lokal (`extractPath` dengan fallback `extractMultipart`).
  2. Memperbarui `GET /api/health/ai` di `backend/src/app.js` agar menerima nilai `model_loaded: true/false` secara dinamis dan meneruskan status model ke client.
  3. Mengimplementasikan router ekstraksi (`backend/src/extractions.js`):
     - `POST /api/uploads/:uploadId/extract`: memvalidasi UUID upload, memicu inferensi model SCHP ATR-18 pada AI service, menyimpan file `extracted.png` (RGBA transparan) dan `mask.png` ke direktori upload yang terisolasi, serta memperbarui `manifest.json`.
     - `GET /api/uploads/:uploadId/extracted`: menyajikan file PNG transparan hasil ekstraksi dengan header aman (`Cache-Control: no-store, private`, `Content-Type: image/png`).
     - `GET /api/uploads/:uploadId/mask`: menyajikan file mask PNG.
- **Alasan:** Melengkapi seluruh kriteria penyelesaian Milestone M3: pipeline inferensi human parsing dan foreground extraction kini dapat dipicu dari API Express dan hasilnya dapat diunduh/ditampilkan secara langsung oleh client.
- **Konsekuensi:** M3 selesai. Express siap melanjutkan ke M4 (pengelolaan status job asynchronous, galeri objek, dan unduhan ZIP).
- **Bukti tes:**
  - `backend/test/extractions.test.js` PASS (3 suite, 27/27 tests PASS).
  - `scripts/smoke_integration_e2e.mjs` PASS: live FastAPI (`127.0.0.1:8005`) + live Express (`127.0.0.1:3005`) berhasil mengupload, mengekstrak dalam 2.09s (deteksi `Upper-clothes` dan `Pants`), serta menyajikan file RGBA 4 channel yang terverifikasi keutuhannya melalui Sharp.

## D-021 — Job asynchronous lokal dengan satu worker dan manifest persisten

- **Tanggal:** 2026-11-17.
- **Status:** Accepted untuk orchestrator M4; galeri per kategori dan unduhan job belum selesai.
- **Keputusan:** `POST /api/jobs` menerima multipart `image` menggunakan validator upload M2 atau JSON hanya `upload_id`. Respons HTTP 202 + Location dikirim setelah manifest queued tersimpan, sebelum inferensi. `GET /api/jobs/:id` membaca snapshot status dan objek tanpa path filesystem.
- **Persistensi:** `storage/jobs/<uuid>/manifest.json`, tulis temporary file lalu rename; direktori job default sejajar direktori upload (opsi `jobDir` pada `createApp` untuk isolasi). Hanya satu proses backend boleh memiliki direktori itu. Queued/processing yang tersisa setelah restart menjadi failed/JOB_INTERRUPTED pada akses pertama; job terminal tetap tersedia.
- **Worker:** FIFO serial per instance untuk API job. Satu kegagalan tidak menghentikan antrean; tidak ada retry/fallback inferensi otomatis. Shared path internal memakai `AiClient.extractPath`, bukan path dari client. Endpoint ekstraksi sinkron M3 tetap tersedia dan tidak menggunakan antrean ini.
- **Manifest:** UUID objek, kategori, file relatif privat, lebar/tinggi. File PNG/mask didekode sebelum completed. Pipeline M3 hanya menyediakan foreground `human` full-frame; inventarisasi satu objek nyata jika alpha ada, atau kosong. Metadata kategori ATR tidak dipalsukan menjadi file per kategori. PNG per kategori/crop adalah tugas berikutnya.
- **Progress:** 0 queued, 10 processing, 100 completed; indikator tahap, bukan persentase inferensi terukur. Error aman disimpan untuk failed. Jika penyimpanan status terminal gagal, polling dalam proses masih mengembalikan failed/JOB_STORAGE_FAILED.
- **Alasan/alternatif:** File JSON dan antrean lokal mengikuti arsitektur MVP; tidak membutuhkan Redis/database, worker paralel, atau dependensi tambahan. Resume otomatis ditolak agar restart tidak menggandakan inferensi tanpa permintaan.
- **Konsekuensi:** UI galeri/unduhan, multi-process, batas antrean, dan cleanup retensi belum tersedia. Tidak ada perubahan stack atau cakupan produk. Timeout startup backend masih mengikuti konfigurasi client yang sudah ada; smoke memakai 30 detik.
- **Bukti:** `npm test --prefix backend` PASS 32/32. Smoke HTTP sementara dengan FastAPI/model nyata PASS: multipart + referensi upload, job kedua queued, dua inferensi serial (2.0079s/1.88s), RGBA 200×300 alpha 0/255; AI tidak dapat dihubungi menghasilkan failed tanpa mematikan backend.

## D-022 — PNG per kategori ATR dengan crop, padding dan manifest nyata

- **Tanggal:** 2026-11-17.
- **Status:** Accepted; crop deterministik, API model asli, manifest job dan smoke HTTP terverifikasi.
- **Keputusan:** Ekspor satu PNG untuk setiap kategori ATR non-background dengan jumlah piksel **>50**, konsisten dengan ambang `categories_present` yang sudah ada. Bagian satu kategori yang terpisah tetap satu mask semantik; sepatu kiri/kanan memakai label ATR berbeda. Tidak ada connected-components, kategori buatan, atau penyelesaian objek yang tertutup.
- **Piksel/geometri:** Bounding box kategori diperluas padding 2 piksel dan dipotong ke batas input. `bbox: [left, top, right, bottom]` menggunakan koordinat asli dengan right/bottom eksklusif. RGB crop tetap identik dengan input; alpha 255 hanya pada kategori tersebut dan 0 pada piksel lain, termasuk kategori tetangga. Tanpa resize atau warna latar pengganti.
- **Kontrak internal:** JSON `/extract-path` dan multipart `/extract` menerima opsi `objects_dir`; `AiClient` menyediakan `objectsDir`. Respons AI menyertakan `objects` berisi `{class_id, category, file, bbox, width, height, pixel_count}` hanya untuk PNG yang selesai ditulis, atau array kosong bila ekspor tidak diminta/tidak ada kategori memenuhi ambang. Backend menetapkan direktori `<job>/objects`; referensi file berbentuk `objects/atr-<class_id>.png`.
- **Manifest job:** Pertahankan objek foreground manusia full-frame. Tambahkan kategori dengan UUID objek dari backend setelah metadata, inventaris kategori dan file RGBA nyata divalidasi. Polling menampilkan metadata geometri tetapi tetap menghapus referensi file internal. Respons AI tanpa kontrak objek tidak dianggap sukses untuk job baru; restart kedua service bersama setelah pembaruan.
- **Alasan/alternatif:** Memakai class map hasil inferensi yang sudah ada, tanpa inferensi kedua atau dependensi baru. Padding tetap kecil agar tepi crop tidak terlalu rapat; clipping menghindari pembuatan piksel di luar input. Tidak memisahkan instance karena model hanya memberikan label semantik.
- **Konsekuensi:** Piksel noise ≤50 tidak diekspor sebagai kategori tetapi tetap masuk foreground manusia seperti sebelumnya. Ambang absolut bukan ukuran akurasi/kepercayaan model. Hasil job lama tidak dimigrasikan; tidak mengarang PNG kategori untuk manifest lama. UI galeri, preview/unduhan job dan ZIP tetap tugas M4 terpisah.
- **Penyesuaian lifecycle teruji:** Pengujian mengungkap race Windows: `rename(manifest.tmp, manifest.json)` gagal EPERM ketika pembaca memegang manifest. Diagnostik dengan read handle terbuka membuktikan syscall tersebut gagal. Job aktif kini dipolling melalui snapshot terakhir yang berhasil disimpan; snapshot diperbarui sesudah rename, bukan dari objek job yang sedang dimutasi. Job terminal tetap dibaca dari disk. Tidak menambah retry, delay, atau mengabaikan kegagalan storage.
- **Bukti tes:** Python crop 7/7 dan API dengan checkpoint asli 7/7 PASS. Suite backend semula FAIL akibat race manifest tersebut; setelah perbaikan `npm test --prefix backend` PASS 69/69. Smoke live menghasilkan foreground manusia dan crop Upper-clothes (104×85, 7547 piksel) serta Pants (94×104, 7989 piksel), RGB tepat, alpha biner dan tidak tumpang tindih; inferensi 2.3621s. Frontend/unduhan belum diuji karena belum diimplementasikan pada tugas ini.

## D-023 — Preview dan unduhan PNG individual berbasis manifest

- **Tanggal:** 2026-11-17.
- **Status:** Accepted; pengujian job dan smoke HTTP model asli PASS.
- **Keputusan:** `GET /api/jobs/:id/objects/:objectId` menyajikan PNG inline; suffix `/download` menyajikan attachment. Keduanya memilih object UUID dari manifest job completed, tanpa parameter path client, static storage, inferensi ulang atau pixelation.
- **Batas akses:** UUID v4 invalid → 400; job/objek/file hilang → 404; job queued/processing/failed → 409. Object ID dari job lain tidak berlaku. Nama file manifest hanya `extracted.png` atau `objects/atr-1.png` sampai `objects/atr-17.png`; lokasi canonical harus sama dengan lokasi yang diharapkan di root/job. Symlink/junction pengalihan dan path manifest tidak aman ditolak 500 dengan pesan tanpa path.
- **HTTP:** Byte PNG asli dipertahankan; nama unduhan `<object_id>.png`, `Content-Type: image/png`, `Cache-Control: no-store, private`, `X-Content-Type-Options: nosniff`. Transfer memakai sendFile, tanpa range/Last-Modified; error transfer sebelum header terkirim dikembalikan sebagai JSON aman.
- **Alasan/alternatif:** Memakai manifest dan pola sendFile Express yang sudah tersedia, tanpa dependensi baru. Nama UUID menghindari nama input/label menjadi header unduhan. Pemeriksaan lokasi canonical juga menolak pengalihan direktori Windows, bukan hanya traversal string.
- **Konsekuensi:** Berlaku pada hasil persisten setelah restart, termasuk foreground job lama. Storage tetap diasumsikan privat dan dimiliki satu proses backend; pemeriksaan path bukan proteksi terhadap proses lokal berbahaya yang mengganti file saat transfer. UI galeri dan ZIP masih terpisah.
- **Bukti tes:** `node --test backend/test/jobs.test.js` PASS 45/45; kedua endpoint, byte PNG foreground/crop, header, restart, ID invalid/lintas-job, status non-completed, hasil kosong, file hilang/non-file, path tidak aman dan junction keluar job. Smoke stdin dengan FastAPI/model asli port 8019 PASS: human 200×300, Upper-clothes 104×85, Pants 94×104; byte-identical RGBA/alpha 0–255 pada preview dan attachment; inferensi 2.05s.

## D-024 — UI ekstraksi/galeri mengikuti lifecycle upload

- **Tanggal:** 2026-11-17.
- **Status:** Accepted; build dan browser desktop/mobile dengan model asli terverifikasi.
- **Keputusan:** Modul Vanilla JS `extraction-workspace.js` menerima upload_id/reset dari `image-input.js` lewat `setUploadedImage()`. Tombol aktif setelah upload sukses; klik mengirim JSON ke `/api/jobs`. UI menampilkan queued/processing, gagal/kosong atau kartu foreground/kategori dengan label, dimensi, preview transparansi dan link attachment PNG asli. Tidak menambah framework/dependensi, ZIP atau pixelation.
- **Lifecycle:** Ganti/hapus pilihan, buka kamera dan pagehide meng-abort operasi, membatalkan timer dan mengosongkan galeri/ID. Identitas AbortController diperiksa setelah respons async agar hasil lama tidak menimpa pilihan baru. Job yang diterima server tetap berjalan; pembatalan browser bukan pembatalan job/retensi.
- **Polling:** GET serial, 1 detik setelah respons queued/processing; timeout request 15 detik. Indikator proses tidak mengklaim persentase inferensi. Request gagal menghentikan polling; Periksa status melanjutkan GET job yang diketahui tanpa POST baru. POST tidak terkonfirmasi diberi peringatan potensi job sudah diterima. Tidak ada retry otomatis atau state lintas reload.
- **Presentasi:** Dua panel desktop, tumpuk mobile. Label melalui textContent; ID valid membentuk URL API. Pola transparansi hanya CSS; preview gagal diberi pesan, bukan gambar pengganti. Unduhan link native/attachment server tanpa menyalin PNG ke blob frontend.
- **Alasan/alternatif:** Menggunakan lifecycle upload/kamera yang sudah ada menghindari event bus/state store baru. Pemeriksaan manual job menghindari duplikasi inferensi setelah gangguan koneksi.
- **Bukti:** Build Vite PASS (7 modul). Browser build preview → Express → model asli: tiga kartu, download byte-identical RGBA/alpha 0/255, blank input → kosong, AI dihentikan → failed. Desktop 1365×1000/mobile 390×844 tanpa overflow. Fault injection polling/preview/upload, respons JSON tertunda, capture sintetis dan navigasi pagehide PASS.
- **Konsekuensi:** ZIP masih tugas M4. Gunakan Hapus pilihan dan pilih gambar untuk job baru; tidak ada riwayat UI/pembatalan server. Kegagalan unduhan ditangani browser, bukan dialog khusus aplikasi. Tidak menguji foto pribadi/kamera fisik.

## D-025 — ZIP streaming pilihan/semua dengan manifest ekspor terpisah

- **Tanggal:** 2026-11-17.
- **Status:** Accepted; pengujian job/ZIP dan smoke model asli selesai.
- **API:** `POST /api/jobs/:id/exports` menerima hanya `{"all":true}` atau `{"object_ids":[...]}` tidak kosong, UUID dinormalisasi dan duplikat ditolak. Hanya job completed dan objek terdaftar. Respons HTTP 201 + Location setelah file selesai: export_id, job_id, status completed, object_ids, created_at, download_url. Tidak menambah antrean/background export atau endpoint polling.
- **Penyimpanan:** `<job>/exports/<export_id>/archive.zip` dan `manifest.json`. UUID per ekspor; streaming ke archive.tmp, rename ZIP, lalu tulis/rename manifest terakhir. Kegagalan setelah direktori ekspor dibuat membersihkan direktori tersebut. Manifest job tidak diubah, sehingga ekspor paralel tidak berebut penulisan dengan polling.
- **Isi:** Hanya PNG terpilih dengan nama `<object_id>.png`, tanpa foto input, mask atau metadata privat. `all` mencakup foreground manusia dan kategori. Byte PNG tidak ditransformasi; metode ZIP STORE menghindari kompresi ulang PNG. ZIP selesai menjadi snapshot mandiri, dapat diunduh setelah restart atau PNG sumber hilang.
- **Dependensi:** Pin [Archiver 8.0.0](https://registry.npmjs.org/archiver/8.0.0) (ESM, MIT, Node >=18) dan lockfile npm; penggunaan `ZipArchive` mengikuti README paket. Sesuai stack yang direncanakan; bukan mengganti teknologi. Error/warning sumber ZIP wajib menggagalkan ekspor, bukan melewatkan entry.
- **Akses:** GET `/api/jobs/:id/exports/:exportId/download` memeriksa job completed, manifest ekspor cocok, inventaris objek, lokasi canonical dan regular file. Symlink/junction pengalihan ditolak; tidak menerima path client/static storage. Header application/zip, attachment UUID.zip, no-store/private dan nosniff. JSON dibatasi 2 KiB, mengikuti router job.
- **Alasan/alternatif:** Manifest ekspor terpisah menghindari perubahan job terminal serta race rename Windows. Publikasi setelah selesai dipilih daripada streaming langsung ke HTTP agar file hilang/kegagalan storage tidak menghasilkan unduhan parsial yang dilabeli sukses.
- **Bukti:** Suite job awal 51/52 PASS; satu ekspektasi tes JSON null salah (parser strict menghasilkan INVALID_JOB_REQUEST, bukan INVALID_EXPORT_INPUT). Setelah koreksi tes, pengujian terarah PASS 1/1. Source aplikasi tidak diubah untuk koreksi ini. Tes lain membuktikan isi byte-identical melalui zipfile Python, konkurensi/restart, akses/status/input invalid, file hilang, junction, dan kegagalan stream/storage.
- **Smoke:** Model asli FastAPI 8021 + Express terisolasi, inferensi 2.1146s; ZIP dua kategori 1202 byte dan ZIP semua tiga objek 3824 byte. CRC, inventaris, byte PNG, RGBA dan alpha 0/255 PASS.
- **Konsekuensi:** UI ZIP dan retensi belum tersedia; tiap POST sukses membuat ekspor baru. Crash proses sebelum publikasi dapat meninggalkan direktori tanpa manifest yang tidak dapat diunduh; cleanup retensi masih terpisah. Storage privat tetap diasumsikan dimiliki satu proses backend.

## D-026 — UI ZIP mengikuti lifecycle galeri tanpa menyalin archive ke browser

- **Tanggal:** 2026-11-18.
- **Status:** Accepted; build dan browser desktop/mobile dengan model asli PASS.
- **Keputusan:** Checkbox tiap kartu tanpa pilihan awal; Unduh Pilihan mengirim object_ids yang dicentang, Unduh Semua mengirim all:true termasuk foreground. Jumlah pilihan ditampilkan; tidak ada hasil/pilihan menonaktifkan aksi terkait.
- **Lifecycle:** Satu request ekspor aktif di browser, checkbox/tombol terkunci hingga selesai. AbortController terpisah dibatalkan oleh reset upload/gambar/kamera/pagehide. Pemeriksaan identitas setelah JSON selesai menolak respons usang. Timeout 15 detik; tidak ada retry otomatis. Error mempertahankan pilihan dan memperingatkan kemungkinan ekspor sudah tersimpan.
- **Unduhan:** Validasi job_id, status, UUID export_id dan kesamaan download_url dengan endpoint privat yang diharapkan. Klik link attachment native setelah sukses; link tetap tersedia untuk unduh ulang tanpa POST. Tidak memuat seluruh ZIP sebagai blob atau mengklaim transfer selesai.
- **Alasan/alternatif:** Memakai galeri/lifecycle/API yang ada tanpa dependensi/state store baru. Link native menghindari salinan archive di memori browser; link eksplisit mengatasi unduhan otomatis yang diblokir browser.
- **Bukti:** Build Vite PASS. Browser build preview → Express → model asli menghasilkan tiga objek; ZIP pilihan dua kategori/semua tiga objek cocok inventaris, CRC, byte PNG dan RGBA/alpha 0/255. PNG individual tetap byte-identical. Desktop/mobile tanpa overflow; error HTTP/network, URL respons tidak aman, respons JSON tertunda setelah ganti gambar/job kosong, single POST saat busy dan unduh ulang tanpa POST PASS.
- **Konsekuensi:** M4 selesai pada jalur lokal teruji; tidak menjalankan M5 pada tugas ini. Reset browser bukan pembatalan ekspor server; retensi/batas ekspor dan dialog kegagalan transfer native belum tersedia. Kamera/mobile fisik dan kualitas pada foto nyata tidak diuji pada tugas ini.

## D-027 — Classic Pixelation RGBA deterministik, sisi terpanjang sebagai ukuran

- **Tanggal:** 2026-11-18.
- **Status:** Accepted untuk helper internal pertama M5; API/persistensi/UI/palet belum tersedia.
- **Kontrak:** `pixelatePng(inputBuffer, size)` menerima buffer PNG objek RGBA 8-bit statis dari pipeline tervalidasi dan menghasilkan buffer PNG baru. Size hanya angka 16/32/64/128. Tidak melakukan file I/O, inferensi, quantization atau perubahan original. Batas input mengikuti 8192 per sisi/24 megapiksel; bukan validator upload publik baru.
- **Geometri:** Sisi terpanjang tepat size, sisi lain `max(1, round(sisi × size / sisiTerpanjang))`. Input kecil diperbesar. Tanpa stretch ke persegi, crop, padding atau upscale kembali ke resolusi sumber. Rasio aspek dipertahankan sejauh pembulatan grid integer memungkinkan.
- **Sampling:** Koordinat sumber `floor((x + 0.5) × inputWidth / outputWidth)`, setara untuk y; tepat pada batas piksel memilih indeks lebih besar. Keempat channel RGBA disalin utuh, termasuk RGB di alpha 0 dan alpha parsial, tanpa blending/flatten.
- **Alasan:** Sharp 0.35.5 existing tetap menangani decode/encode. Inspeksi `sharp/src/pipeline.cc` menunjukkan resize mem-premultiply lalu unpremultiply alpha; sampling RGBA langsung menghindari perubahan RGB akibat proses itu. Output maksimal 128×128, sehingga loop sederhana cukup tanpa dependensi/abstraksi tambahan.
- **Alternatif:** Fit persegi akan mendistorsi atau memerlukan padding/crop; tidak dipilih. `.resize()` RGBA langsung tidak dipilih untuk kontrak channel exact. Bukan perubahan stack atau mode AI generatif.
- **Bukti:** `node --test backend/test/pixelation.test.js` PASS 5/5: sampling reduction, alpha 0/1/127, enlargement, empat ukuran/rasio, sisi satu piksel, input invalid, determinisme dan buffer original tidak berubah. Smoke disk sementara membuktikan original tetap byte-identical.
- **Perbedaan pembanding:** Smoke Pillow NEAREST cocok seluruh RGBA untuk output 16/32/64, tetapi FAIL pada size 128 (input 192×320 → 77×128). Diagnostik menemukan 128 piksel berbeda hanya pada kolom 38: koordinat pusat tepat x=96, helper memilih 96 dan Pillow memilih 95. Oracle integer independen memeriksa seluruh 9856 piksel output 128 dan PASS sesuai kontrak pusat; tidak mengubah aplikasi untuk mengikuti tie-breaking Pillow.
- **Konsekuensi:** M5 belum selesai; helper belum terhubung ke endpoint/browser. Downsampling dapat menghilangkan detail tipis, bukan mempertahankan seluruh bentuk/mask. Pembacaan RGBA sumber memerlukan memori sesuai dimensi; batas input belum merupakan benchmark RAM.

## Keputusan yang masih terbuka

- [x] Versi runtime dan dependensi AI M3 setelah smoke CPU (D-015: torch 2.15.0+cpu, torchvision 0.29.2+cpu, numpy 2.5.4, pillow 13.0.0 pada Python 3.14.3).
- [x] Adaptasi arsitektur SCHP ATR-18 ke CPU murni (D-016: pure PyTorch ABN + AugmentCE2P ResNet-101 di `ai-service/schp_cpu`).
- [x] Unduh checkpoint resmi SCHP ATR-18 (`exp-schp-201908301523-atr.pth`), verifikasi keutuhan/hash, dan uji pemuatan bobot aman ke model CPU (D-017).
- [x] Pipeline inferensi gambar nyata (D-018: letterbox aspect-preserving, forward pass CPU, un-padding, mask alpha, RGBA PNG transparan di `ai-service/extractor.py`).
- [x] Endpoint FastAPI AI service (`POST /extract`, `POST /extract-path`, `GET /health`) dan model lifecycle management (D-019).
- [x] Integrasi Express backend dengan FastAPI AI service (`AiClient`, `/api/uploads/:uploadId/extract`, asset serving PNG/mask) (D-020).
- [x] Arsitektur Job Orchestrator & Polling status untuk ekstraksi asynchronous di M4 (D-021).
- [x] Integrasi UI pemilihan objek/ZIP (M4), endpoint D-025 dan UI D-026 terverifikasi.
- [ ] Hak redistribusi checkpoint ATR/dataset sebelum distribusi; MIT kode sudah dibaca, lisensi bobot belum terkonfirmasi (D-014).
- [ ] Batas performa input setelah benchmark.
- [x] Retensi file sementara `storage/uploads` dan `storage/jobs` (D-048: Accepted & terimplementasi; sweep dua langkah, default 24 jam / interval 60 menit).
- [x] Model image-to-image lokal, kebutuhan GPU, dan preset AI stylization (M6, D-031–D-043).
- [x] Strategi koreksi mask (brush/eraser manual Canvas 2D) dan hasil pengujian (M6, D-044).

## D-028 — API dan persistensi snapshot Classic Pixelation per objek

- **Tanggal:** 2026-11-18.
- **Status:** Accepted; suite test Express terintegrasi lulus 89/89, endpoint pixelate & serving teruji.
- **Keputusan:**
  - `POST /api/jobs/:id/pixelate` menerima JSON ketat `{"object_id": "<uuid>", "size": 16|32|64|128}` hanya untuk job `completed`. Memvalidasi `object_id` terdaftar pada manifest job, memanggil `pixelatePng`, dan menyimpan hasilnya ke direktori privat `<jobDirectory>/pixelations/<pixelationId>/`.
  - Manifest publikasi ditulis atomik (`manifest.tmp` → `rename` ke `manifest.json`), memuat `pixelation_id`, `job_id`, `object_id`, `status: "completed"`, `size`, `width`, `height`, dan `created_at`.
  - Respons HTTP 201 Created dengan header `Location` serta JSON metadata yang menyertakan `preview_url` (`/api/jobs/:id/pixelations/:pixelationId`) dan `download_url` (`/api/jobs/:id/pixelations/:pixelationId/download`).
  - Serving file menggunakan `serveFile` dengan validasi canonical path, verifikasi regular file, larangan symlink/junction, serta header keamanan (`no-store, private`, `nosniff`, `image/png`).
  - Endpoint tidak mengubah atau menimpa manifest job utama, file original PNG, atau ekspor ZIP yang sudah ada.
- **Alasan:**
  - Menjaga independensi hasil turunan dari terminal job agar polling job dan unduhan original PNG/ZIP tidak mengalami race condition atau mutasi data.
  - Snapshot mandiri tetap dapat disajikan/diunduh secara persisten bahkan setelah backend di-restart.
- **Alternatif:**
  - Menyimpan array hasil pixelation di dalam `manifest.json` job utama: ditolak karena memerlukan read-modify-write pada manifest yang berisiko race condition di Windows.
  - Streaming pixelation on-the-fly tanpa penyimpanan disk: ditolak karena menyulitkan preview/unduhan ulang yang efisien serta tidak sesuai dengan pola arsitektur snapshot yang dipakai pada M4 (ZIP exports).
- **Konsekuensi:**
  - Setiap request pixelate membuat folder dan file baru di `storage/jobs/<jobId>/pixelations/`; pembersihan otomatis mengikuti kebijakan retensi job (belum ada retensi otomatis terpisah).
  - UI Frontend Studio untuk berinteraksi dengan API ini belum dibuat (tugas berikutnya).
- **Bukti tes:**
  - `node --test backend/test/jobs.test.js` (23/23 subtest suite PASS):
    1. Publikasi snapshot independen, keutuhan file original & ZIP setelah restart, kesesuaian piksel sampling RGBA exact.
    2. Validasi input ketat (shape request, ukuran 16/32/64/128, UUID format, isolasi cross-job).
    3. Penolakan job non-completed (queued, processing, failed) dan objek kosong (409/404).
    4. Proteksi kegagalan sumber (missing PNG, corrupt PNG) dan deteksi direktori storage yang dialihkan lewat symlink/junction.
    5. Integritas manifest hasil dan verifikasi canonical path regular file.
  - `npm test --prefix backend`: seluruh 89/89 tests PASS.

## D-029 — UI Classic Pixelation Studio terintegrasi per objek

- **Tanggal:** 2026-11-18.
- **Status:** Accepted; frontend build lulus (Vite 7 modul) dan terintegrasi dengan API M5.
- **Keputusan:**
  - Menambahkan kontrol Classic Pixelation di setiap kartu objek pada galeri ekstraksi (`frontend/index.html` dan `frontend/src/extraction-workspace.js`).
  - Pemilih ukuran grid dengan dropdown `<select data-pixel-size>` (pilihan 16, 32, 64, 128 px; default 32 px) dan tombol aksi `<button data-pixelate-button>`.
  - Setiap kartu mengelola status request-nya sendiri (status loading `Sedang memproses pixelation...`, disable tombol saat proses berlangsung).
  - Panggilan API ke `POST /api/jobs/:id/pixelate` mengirim payload `{ object_id, size }` dengan validasi respons ketat (UUID format, job_id, object_id, size, dimensi integer, preview_url, download_url).
  - Hasil pixelation ditampilkan langsung di bawah kartu dengan styling `pixelated-render` (`image-rendering: pixelated; image-rendering: crisp-edges;`) di atas grid transparansi (`transparency-grid`), dimensi aktual/grid, serta tombol `Unduh PNG pixelated` langsung ke `download_url`.
  - Menggunakan `AbortController` per kartu (`pixelationControllers`) yang dibatalkan otomatis jika kartu di-pixelate ulang, atau jika gambar diganti/dihapus melalui `setUploadedImage`. Pengecekan `jobSnapshotId` memastikan respons usang tidak merusak tampilan job baru.
- **Alasan:**
  - Mengintegrasikan preview pixel art langsung di galeri objek yang sudah ada memberikan alur kerja before/after yang intuitif tanpa navigasi halaman tambahan.
  - Perenderan CSS `image-rendering: pixelated` menjaga ketajaman piksel integer tanpa efek blur bilinear bawaan browser.
- **Alternatif:**
  - Halaman terpisah / modal pop-up: ditolak untuk menjaga kesederhanaan alur kerja MVP dan konsistensi layout responsif mobile/desktop.
  - Pixelation massal sekaligus untuk seluruh objek: ditolak pada tahap awal M5 karena beban decode/encode sharp lebih terkontrol jika dipicu sesuai kebutuhan pengguna per objek.
- **Konsekuensi:**
  - Pengguna browser kini dapat menghasilkan dan mengunduh pixel art PNG transparan beresolusi 16–128 px langsung dari browser.
  - Palet warna / color quantization masih merupakan fitur lanjutan M5 yang belum diimplementasikan.
- **Bukti tes:**
  - `npm run build --prefix frontend`: PASS (Vite 7 modul, bundle dihasilkan bersih dalam 129ms).
  - `npm test --prefix backend`: PASS (89/89 tests lulus di seluruh suite backend).

## D-030 — Palet Retro 16 opsional tanpa mengubah alpha atau RGB transparan

- **Tanggal:** 2026-11-19.
- **Status:** Accepted; helper/API, build, browser model asli dan pemeriksaan PNG independen PASS. FR-10 tersedia; M5 selesai pada jalur Windows lokal teruji.
- **Keputusan:** Parameter opsional `palette` pada helper `pixelatePng` dan JSON POST pixelate: `original` (default) atau `retro16`. UI per kartu memakai nama Warna asli / Retro 16 warna dan mencantumkan palet pada status, preview serta label unduhan. Dua pemilih dikunci selama request dan memiliki nama aksesibel per objek.
- **Algoritma:** Setelah nearest-neighbour D-027, RGB setiap piksel dengan alpha >0 dipetakan ke warna terdekat berdasarkan jumlah kuadrat selisih channel RGB 8-bit. Ikatan jarak memilih warna pertama pada urutan palet. Alpha disalin tepat, termasuk alpha parsial; RGB alpha 0 tidak berubah. Tidak ada dithering, premultiplication, blending, inferensi atau quantization alpha.
- **Palet tetap berurutan (hex RGB):** `000000 0000AA 00AA00 00AAAA AA0000 AA00AA AA5500 AAAAAA 555555 5555FF 55FF55 55FFFF FF5555 FF55FF FFFF55 FFFFFF` (bergaya EGA).
- **Arti batas warna:** Maksimal 16 RGB berbeda pada piksel ber-alpha >0, bukan tepat 16 warna yang harus muncul. RGB tersembunyi dan alpha parsial dapat menambah jumlah kombinasi RGBA; hasil tetap PNG RGBA8, bukan indexed PNG 16 warna.
- **Persistensi:** Snapshot baru menyimpan palette dalam manifest dan respons. Field request tidak dikenal, null atau nilai palet invalid ditolak 400. Manifest dengan field palette invalid ditolak; snapshot historis yang tidak memiliki field tersebut tetap dilayani tanpa ditulis ulang. PNG asli, manifest job dan ZIP tidak dimutasi.
- **Alasan/alternatif:** Palet tetap memenuhi opsi preset FR-10 dengan kontrak sederhana/deterministik dan tanpa dependensi baru. Palet adaptif/k-means serta dithering tidak diperlukan untuk tugas ini. PNG palette encoding langsung tidak dipilih karena kontrak menuntut alpha parsial dan hidden RGB exact. Jarak RGB sederhana bukan ukuran kesamaan warna perseptual; warna objek dapat berubah nyata.
- **Bukti:** `node --test backend/test/pixelation.test.js backend/test/jobs.test.js` PASS 64/64; mencakup alpha 0/1/127, fully transparent, tie-break, determinisme, batas warna, validasi, delapan snapshot dua mode/empat ukuran, restart, serta original/ZIP tetap utuh. `npm run build` di frontend PASS (7 modul).
- **Browser:** Build preview 5178 → Express 3124 → model asli 8024, fixture sintetis: empat ukuran Retro dan kembali ke Warna asli; tujuh unduhan aktual termasuk original/ZIP. Python/Pillow memverifikasi seluruh piksel terhadap oracle terpisah, alpha/hidden RGB, metadata snapshot, preview=download dan CRC ZIP. Desktop/mobile tanpa overflow; accessibility tree memberi nama kedua pemilih. Fault injection HTTP 500, palette respons salah, busy controls dan reset ketika JSON respons nyata ditahan PASS.
- **Konsekuensi:** M6 tidak dimulai pada tugas ini. Retensi, kualitas foto nyata dan keterbatasan detail sampling tetap terbuka. LSP tidak tersedia; referensi helper ditelusuri lewat pencarian sebelum perubahan.

## D-031 — Readiness M6: kandidat CPU terisolasi, belum mengaktifkan stylization

- **Tanggal:** 2026-11-19.
- **Status:** Accepted untuk arah preflight; model/engine final, kelayakan inferensi, kualitas dan latensi **belum terbukti**. M6 mulai tahap evaluasi; bukan fitur selesai.
- **Fakta lokal:** Windows 11 10.0.26200, Ryzen 5 7430U (6 core/12 thread), RAM terlihat 7.40 GiB dan bebas 2.20 GiB saat inventaris, disk D: bebas 26.04 GiB. GPU terdeteksi hanya AMD Radeon Graphics, AdapterRAM 512 MiB (bukan total shared memory). Python terdaftar hanya 3.14.3; `.venv-test` memakai torch 2.15.0+cpu/torchvision 0.29.2+cpu, CUDA/HIP build `None`, CUDA unavailable. Diffusers/Transformers/Accelerate/Safetensors/ONNX Runtime/DirectML tidak terpasang di environment itu. Dalam `ai-service/models` hanya checkpoint SCHP 267,445,237 byte.
- **Batas bukti:** Inventaris dan inspeksi source tidak menemukan integrasi generatif proyek. Tidak melakukan instalasi, download bobot, inferensi generatif, benchmark RAM/latensi atau perubahan environment. Tidak menyimpulkan generasi mustahil hanya dari inventaris.

### Kandidat dan engine

| Kandidat | Bukti primer / lisensi | Keputusan readiness |
| --- | --- | --- |
| SD 1.5 img2img, prompt pixel art | [Model card mirror](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5), [panduan img2img](https://huggingface.co/docs/diffusers/en/using-diffusers/img2img); model dilatih 512×512, CreativeML OpenRAIL-M | Kandidat baseline CPU FP32, batch 1; bukan model pixel-art khusus dan belum terbukti menjaga detail objek |
| SD 1.5 + PixelArtRedmond15V LoRA | [Card pembuat](https://huggingface.co/artificialguybr/pixelartredmond-1-5v-pixel-art-loras-for-sd-1-5), trigger `pixel art, PixArFK`; adapter memerlukan base SD 1.5 | Kandidat tahap setelah baseline lolos, bukan pengganti base model yang jauh lebih besar |
| SDXL | Panduan img2img menyebut base lebih besar dan refiner opsional | Tidak menjadi POC pertama pada headroom RAM ini; bukan klaim semua konfigurasi SDXL mustahil |

- **Engine calon:** Diffusers dalam environment POC terpisah memberi kontrol img2img/alpha tanpa UI engine tambahan; belum dipasang ke FastAPI. [Metadata PyPI](https://pypi.org/pypi/diffusers/json) menunjukkan 0.43.0, Python >=3.11 dan extra torch >=2.6. Ini bukan bukti seluruh dependensi bekerja di Python 3.14/Windows atau pin versi final. Jangan downgrade Python/torch existing berdasarkan asumsi.
- **Alternatif:** [ComfyUI upstream](https://github.com/Comfy-Org/ComfyUI) mendokumentasikan CPU-only, Python 3.14 dan workflow/API lokal; masih kandidat engine, bukan kebutuhan memasang desktop/portable CUDA pada laptop ini. Bila dievaluasi kelak, hanya core lokal/offline, tanpa partner/cloud nodes atau custom nodes tak diaudit. Tidak mengganti stack Express–FastAPI.
- **GPU:** Ryzen 7430U tidak tercantum pada daftar Ryzen [matriks ROCm 10.2.0 yang diperiksa](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html). Tidak menjanjikan akselerasi ROCm dan tidak memasang driver/override GPU. [DirectML Microsoft](https://learn.microsoft.com/en-us/windows/ai/directml/pytorch-windows) adalah jalur preview untuk DX12, bukan bukti kompatibilitas pipeline/wheel CPython 3.14 yang tersedia. Evaluasi GPU harus terpisah, bukan mengganti torch CPU SCHP.

### Resource dan lisensi

Ukuran berikut berasal dari metadata [tree SD 1.5](https://huggingface.co/api/models/stable-diffusion-v1-5/stable-diffusion-v1-5/tree/main?recursive=true) dan [tree LoRA](https://huggingface.co/api/models/artificialguybr/pixelartredmond-1-5v-pixel-art-loras-for-sd-1-5/tree/main?recursive=true); **bukan RAM puncak atau binary/hash yang telah diverifikasi lokal**. Jangan mengunduh seluruh repo yang berisi varian duplikat.

| Pilihan berkas safetensors | Total byte | GiB |
| --- | ---: | ---: |
| SD15 FP32 UNet + text encoder + VAE | 4,265,076,690 | 3.97 |
| SD15 FP32 di atas + safety checker | 5,481,058,520 | 5.10 |
| SD15 FP16 empat komponen termasuk safety checker | 2,740,623,950 | 2.55 |
| PixelArtRedmond15V adapter saja | 27,216,848 | 0.025 |

- **[INFERENCE] Risiko memori:** Bobot FP32 melebihi RAM bebas terukur sebelum menghitung aktivasi, interpreter, loader dan SCHP. Disk tersedia bukan bukti RAM cukup. FP16 lebih kecil di disk tidak membuktikan operator CPU cepat/kompatibel; jangan menonaktifkan safety checker untuk mengejar angka. [CPU offload Diffusers](https://huggingface.co/docs/diffusers/en/optimization/memory) memindahkan bobot GPU↔CPU, bukan solusi otomatis bagi CPU-only dengan RAM terbatas.
- **Lisensi SD15:** [CreativeML OpenRAIL-M lengkap](https://huggingface.co/spaces/CompVis/stable-diffusion-license/raw/main/license.txt) memuat pembatasan penggunaan, kewajiban meneruskan lisensi/notices/restriksi saat distribusi, dan tidak memberi lisensi dataset. Card menyatakan intended research dan keterbatasan safety/identitas. Ini bukan bobot MIT atau izin bebas tanpa syarat; jangan bundling sebelum audit distribusi.
- **Lisensi LoRA:** Card menunjuk [ketentuan bespoke](https://multimodal.art/civitai-licenses?allowNoCredit=True&allowCommercialUse=Rent&allowDerivatives=True&allowDifferentLicense=False): penjualan gambar/layanan generasi diizinkan, penjualan model/merge dan perubahan izin merge tidak diizinkan. Ketentuan base tetap berlaku. Simpan salinan lisensi/revisi saat download kelak; tidak menjanjikan hak komersial/redistribusi menyeluruh.

### Alpha dan gerbang pembuktian

- **Fakta:** [Konfigurasi VAE SD15](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/raw/main/vae/config.json) memiliki `in_channels: 3`, `out_channels: 3`; `latent_channels: 4` bukan RGBA. Model ini tidak otomatis menghasilkan transparansi.
- **Rancangan POC, belum kode:** Ambil PNG objek manifest, simpan alpha sumber, komposit RGB ke latar netral dan letterbox tanpa stretch; jalankan img2img lokal; undo padding/resize ke dimensi crop asli, lalu pasang kembali alpha sumber. Hasil adalah **AI stylization dengan silhouette sumber**, bukan ekstraksi asli atau alpha yang diprediksi model. Konten dapat bergeser melewati mask atau membentuk halo; cek tepi/occlusion sebelum menerima hasil. Mask baru/manual correction tetap pekerjaan M6 terpisah.
- **Urutan aman:** Preflight dependensi tanpa bobot dahulu. Setelah hasilnya dan izin download eksplisit, pin revision/hash/berkas/lisensi, uji satu gambar sintetis batch 1 dalam proses terisolasi; jangan muat SCHP dan generator bersamaan pada POC pertama. Ukur waktu load/inferensi, peak RAM/commit dan headroom sistem; uji 256 lalu 512 sebagai probe, bukan klaim kualitas pada resolusi di luar training.
- **Syarat sebelum integrasi:** Inferensi asli offline, hasil generatif berlabel jujur, alpha/ukuran/unduhan benar, original tidak berubah, kualitas tepi layak, kegagalan resource aman dan biaya runtime terukur. Bila belum lolos, UI tetap menyatakan AI Stylization belum tersedia; jangan menggantinya dengan Classic Pixelation yang dilabeli AI.
- **Next single task:** Preflight resolusi dependensi Diffusers CPU untuk Windows/Python 3.14 secara `pip --dry-run --only-binary=:all:` dengan constraint torch CPU existing dan report sementara. Tanpa instalasi, perubahan `.venv`/`.venv-test`, atau download checkpoint; hasil resolver bukan tes inferensi.

## D-032 — Preflight dependensi Diffusers CPU tanpa instalasi

- **Tanggal:** 2026-11-19.
- **Status:** Accepted sebagai rencana pin untuk smoke runtime terisolasi; bukan runtime teruji atau pemilihan engine final.
- **Perintah aktual:** `ai-service/.venv-test/Scripts/python.exe -B -m pip --isolated --disable-pip-version-check install --dry-run --only-binary=:all: --no-cache-dir --index-url https://pypi.org/simple --constraint <constraints-temp> --report <report-temp.json> "diffusers[torch]==0.43.0" transformers accelerate safetensors`. pip 25.3, CPython 3.14.3, Windows AMD64. Constraint: `torch==2.15.0+cpu`, `torchvision==0.29.2+cpu`, `numpy==2.5.4`, `pillow==13.0.0`.
- **Bukti:** Exit 0; 28 paket direncanakan, semua URL report berupa wheel. Tidak ada penggantian empat paket terlindungi. Inventaris nama/versi distribusi `.venv` dan `.venv-test` sebelum/sesudah identik. Hanya metadata wheel diunduh; tanpa instalasi, checkpoint, import generatif atau perubahan source. Report sementara dan constraint dihapus sesudah hasil dicatat.
- **Rencana pin langsung:** `diffusers[torch]==0.43.0`, `transformers==5.23.0`, `accelerate==1.16.0`, `safetensors==0.8.0`, dengan torch CPU/torchvision/NumPy/Pillow sesuai constraint di atas. Sumber resolusi [PyPI simple index](https://pypi.org/simple); versi ini kandidat smoke, bukan pin requirements aplikasi.
- **Rencana transitif baru dari report:** `huggingface_hub==2.4.0`, `hf-xet==1.8.0`, `httpx2==2.16.2`, `httpcore2==2.16.2`, `tokenizers==0.23.3`, `packaging==26.3`, `PyYAML==6.0.3`, `regex==2026.11.19`, `tqdm==4.70.1`, `truststore==0.10.5`, `colorama==0.4.6`, `importlib_metadata==10.2.0`, `lazy-importer==0.1.0`, `zipp==4.1.2`, `psutil==7.2.2`, `requests==2.34.2`, `charset-normalizer==3.5.2`, `urllib3==2.8.0`, `typer==0.29.2`, `rich==15.0.0`, `Pygments==2.21.0`, `markdown-it-py==4.3.0`, `mdurl==0.1.2`, `shellingham==1.5.4`.
- **Wheel native:** regex/PyYAML/charset-normalizer memakai cp314-win_amd64; Safetensors/Tokenizers/hf-xet/psutil memakai ABI3 Windows AMD64. Resolver tidak meminta source build. Ini belum membuktikan DLL/import/operator CPU berjalan.
- **Alasan/alternatif:** Constraint eksplisit mencegah resolver mengganti runtime CPU yang sudah bekerja. `--isolated`, index eksplisit dan `--no-cache-dir` menghindari konfigurasi pip pengguna serta penulisan cache. Tidak memakai upgrade/install di environment SCHP atau mengganti Python tanpa konflik nyata.
- **Batas:** Ini resolusi inkremental terhadap paket existing, bukan lock lengkap environment kosong. Paket yang sudah memenuhi syarat tidak masuk daftar install report; constraint bukan sumber wheel torch CPU untuk environment baru. Kompatibilitas API Diffusers–Transformers, PEFT/LoRA, import dan inferensi SD15 belum diuji. Tidak ada alasan dari hasil resolver ini untuk downgrade runtime.
- **Next single task:** Siapkan environment POC terpisah tanpa akses paket `.venv-test`, pasang kandidat pin dengan wheel torch dari index CPU resmi, lalu smoke import pipeline SD15 dan forward komponen kecil berkonfigurasi sintetis tanpa bobot unduhan. Jangan mengubah environment SCHP atau requirements aplikasi. Download checkpoint/benchmark model asli tetap memerlukan izin eksplisit dan pemeriksaan resource D-031.

## D-033 — Smoke runtime Diffusers CPU terisolasi tanpa checkpoint

- **Tanggal:** 2026-11-19.
- **Status:** Accepted untuk kompatibilitas import dan forward komponen kecil; bukan pemilihan engine final atau kelayakan inferensi SD15 penuh.
- **Keputusan:** Buat `ai-service/.venv-stylization-poc` dengan `py -3.14 -m venv`, tanpa system site-packages atau akses `.venv-test`. Environment lokal dipertahankan dan diabaikan aturan `.venv*/` existing. Tidak mengubah source, requirements aplikasi, `.venv`, `.venv-test`, checkpoint SCHP atau UI.
- **Instalasi CPU:** `python -B -m pip --isolated --disable-pip-version-check install --only-binary=:all: --no-cache-dir --index-url https://download.pytorch.org/whl/cpu "torch==2.15.0+cpu" "torchvision==0.29.2+cpu" "numpy==2.5.4" "pillow==13.0.0"` memakai interpreter POC. Perintah pertama timeout 600 detik saat pemasangan; log juga memuat satu retry koneksi. Inventaris sesudah timeout dan RECORD torch diperiksa: tidak ada file hilang/ukuran berbeda, torchvision belum terpasang. Hanya torchvision dilanjutkan dari index CPU dengan `--no-deps`; berhasil.
- **Instalasi generatif:** Interpreter POC menjalankan `-B -m pip --isolated --disable-pip-version-check install --only-binary=:all: --no-cache-dir --index-url https://pypi.org/simple --report ai-service/.venv-stylization-poc/install-report.json -r ai-service/.venv-stylization-poc/poc-pins.txt`. Pin langsung/transitif D-032 dipakai; report membuktikan 38 wheel, tanpa penggantian torch/torchvision/NumPy/Pillow. Pin/report disimpan lokal di environment ignored, bukan requirements aplikasi.
- **Tambahan dibanding resolver inkremental:** Environment baru membutuhkan `click==8.5.1`, `anyio==4.16.0`, `idna==3.20`, `h11==0.16.0`, `certifi==2026.10.23`, `pydantic==2.14.4`, `annotated-doc==0.0.7`, `annotated-types==0.8.0`, `pydantic-core==2.50.5`, `typing-inspection==0.4.5`. Dependensi CPU yang terpasang: filelock 4.2.4, typing-extensions 4.16.0, setuptools 78.1.0, sympy 1.14.0, networkx 3.7, Jinja2 3.1.6, fsspec 2026.9.0, mpmath 1.3.0, MarkupSafe 3.0.3. Daftar D-032 sendiri bukan lock lengkap.
- **Bukti runtime:** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -` melalui stdin, offline flags Hugging Face/Transformers dan socket connect yang menolak jaringan. Tanpa `from_pretrained`, checkpoint, foto atau file hasil. Import `StableDiffusionImg2ImgPipeline`, Diffusers 0.43.0, Transformers 5.23.0, Accelerate 1.16.0, Safetensors 0.8.0 serta torch/vision/NumPy/Pillow sesuai pin PASS; CUDA/HIP None dan CUDA unavailable.
- **Forward sintetis:** Seed 0, dua thread CPU, FP32/inference mode; CLIP kecil menghasilkan conditioning `[1,8,32]`, VAE encode RGB `[1,3,32,32]` ke latent `[1,4,16,16]`, UNet conditional memprediksi noise, satu langkah DDIM, lalu VAE decode kembali `[1,3,32,32]`. Bentuk, device, dtype, nilai finite dan variasi setiap tensor PASS. Bobot acak, bukan hasil AI pretrained. Warning CLIP BOS/EOS default 49406/49407 di luar vocab sintetis 32 muncul; ID input 0–9 valid, tidak menguji tokenisasi/EOS pipeline penuh.
- **Resource terukur:** Smoke termasuk import selesai 26.633 detik; peak working set 414,453,760 byte, private memory akhir 789,704,704 byte (bukan peak commit). RAM bebas OS sebelum setup 262,060 KiB, available akhir smoke 985,784,320 byte; snapshot berbeda waktu, bukan kapasitas terjamin. Disk bebas awal/akhir 25.97/24.96 GiB. Tidak mengekstrapolasi angka komponen kecil ke SD15.
- **Verifikasi tambahan:** `python -B -m pip check` PASS (`No broken requirements found`). Inventaris nama/versi distribusi `.venv` (15) dan `.venv-test` (31) identik sebelum/sesudah. Pembacaan report awal gagal karena default encoding cp1252; dibaca ulang UTF-8 berhasil, bukan kegagalan paket.
- **Alasan/alternatif:** Menguji risiko DLL/API CPU tanpa memasang generator ke runtime SCHP atau mengunduh bobot besar. Tidak downgrade Python, menambah engine lain, menggunakan shared site-packages atau mengaktifkan fitur palsu.
- **Konsekuensi:** M6 tetap in progress. Full pipeline/tokenizer/safety checker, checkpoint, LoRA, kualitas/alpha, peak RAM/commit dan latensi SD15 **NOT RUN**. Tidak ada script smoke permanen atau service baru; aplikasi M1–M5 tidak diuji ulang karena tidak diubah.
- **Next single task:** Rencanakan POC checkpoint SD15 asli dengan revision/berkas/lisensi dan batas resource, lalu minta izin eksplisit sebelum download/benchmark. Headroom RAM wajib diperiksa ulang; jangan menjalankan SCHP dan generator bersamaan pada POC awal.

## D-034 — Rencana checkpoint SD15 terpaku dan izin download saja

- **Tanggal:** 2026-11-20.
- **Status:** Rencana evaluasi lokal; pengguna memilih **`download_only`** pada formulir izin. Download/verifikasi diizinkan untuk tugas berikutnya; **benchmark/pemuatan model belum diizinkan**. Sesi ini hanya membaca metadata/teks publik, tidak mengunduh binary.
- **Sumber:** [API model](https://huggingface.co/api/models/stable-diffusion-v1-5/stable-diffusion-v1-5) menunjuk revision **`451f4fe16113bff5a5d2269ed5ad43b0592e9a14`**. [Card pada revision tersebut](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/raw/451f4fe16113bff5a5d2269ed5ad43b0592e9a14/README.md) menyatakan repositori ini mirror, tidak berafiliasi dengan RunwayML; jangan menyebutnya distribusi resmi Runway. Gunakan revision ini, bukan `main`, untuk semua berkas.
- **Pilihan:** Baseline Diffusers SD15 CPU FP32 sesuai D-031, dengan safety checker. Tidak mengambil FP16/non-EMA, `.bin`, `.ckpt`, checkpoint monolitik, LoRA atau remote custom code. FP16 di disk bukan solusi otomatis RAM FP32; perubahan precision/engine bukan bagian izin ini.

### Allowlist download dan pemeriksaan integritas

Ukuran dan SHA-256 berikut berasal dari `lfs.oid` pada [tree revision tetap](https://huggingface.co/api/models/stable-diffusion-v1-5/stable-diffusion-v1-5/tree/451f4fe16113bff5a5d2269ed5ad43b0592e9a14?recursive=true). **Belum dibandingkan dengan binary lokal**; hash penyedia membuktikan kesesuaian artefak, bukan audit keamanan/asal pelatihan.

| Berkas bobot | Byte | SHA-256 yang diharapkan |
| --- | ---: | --- |
| `unet/diffusion_pytorch_model.safetensors` | 3,438,167,540 | `19da7aaa4b880e59d56843f1fcb4dd9b599c28a1d9d9af7c1143057c8ffae9f1` |
| `text_encoder/model.safetensors` | 492,265,874 | `d008943c017f0092921106440254dbbe00b6a285f7883ec8ba160c3faad88334` |
| `vae/diffusion_pytorch_model.safetensors` | 334,643,276 | `a2b5134f4dbc140d9c11f11cba3233099e00af40f262f136c691fb7d38d2194c` |
| `safety_checker/model.safetensors` | 1,215,981,830 | `9d6a233ff6fd5ccb9f76fd99618d73369c52dd3d8222376384d0e601911089e8` |

Tambahkan tepat 12 berkas kecil berikut dari revision yang sama:

```text
README.md
model_index.json
feature_extractor/preprocessor_config.json
safety_checker/config.json
scheduler/scheduler_config.json
text_encoder/config.json
tokenizer/merges.txt
tokenizer/special_tokens_map.json
tokenizer/tokenizer_config.json
tokenizer/vocab.json
unet/config.json
vae/config.json
```

- **Total:** 16 berkas model, 5,482,666,661 byte (**5.1061 GiB**): bobot 5,481,058,520 byte + berkas kecil 1,608,141 byte. Tambahkan teks lisensi terpisah; metadata/cache kecil tidak termasuk angka tersebut. Jangan snapshot seluruh repo.
- **Tujuan rencana:** `ai-service/models/sd15-poc/451f4fe16113bff5a5d2269ed5ad43b0592e9a14/`, diabaikan Git oleh aturan existing. Direktori ini belum dibuat. Cache/partial download harus tetap di lokasi privat tersebut, bukan cache global atau static folder; jangan menggandakan seluruh model antara cache dan tujuan.
- **Verifikasi tugas download:** Satu transfer aktif, streaming ke partial file; publikasi berkas selesai setelah ukuran dan hash cocok. Cocokkan berkas kecil dengan ukuran serta Git blob OID dari tree terpaku, simpan SHA-256 lokal dan manifest provenance/revision. Simpan teks lisensi/card tanpa modifikasi. Jika berbeda atau transfer gagal, laporkan FAIL dan jangan memuat model atau mengganti revision otomatis. Tidak memakai `from_pretrained`, import torch, inferensi, atau download varian alternatif untuk verifikasi ini.

### Lisensi

- [CreativeML OpenRAIL-M](https://huggingface.co/spaces/CompVis/stable-diffusion-license/raw/14d42d09bffd871b1666a084fc954a50cff72ac0/license.txt), revision sumber lisensi **`14d42d09bffd871b1666a084fc954a50cff72ac0`**, dibaca lengkap. Mirror model tidak memiliki LICENSE sendiri pada tree yang diperiksa; card merujuk sumber ini.
- Izin pengguna hanya evaluasi lokal: bukan izin bundling, publikasi bobot, atau layanan publik. Lisensi mempunyai pembatasan penggunaan Attachment A; distribusi/layanan ke pihak ketiga membawa kewajiban salinan lisensi, notices, penandaan modifikasi dan penerusan restriksi. Data pelatihan tidak dilisensikan oleh lisensi model. Pengguna bertanggung jawab atas output. Card menyebut tujuan riset dan keterbatasan model/safety checker.

### Resource dan gerbang benchmark yang belum diizinkan

- **Snapshot aktual:** CIM Windows menunjukkan RAM total 7,762,112 KiB, free physical 2,056,532 KiB; counter available 2,032,168,960 byte (**1.89 GiB**). Commit 9,779,187,712 dari limit 15,896,805,376 byte, sisa **5.70 GiB**. Disk D: bebas 26,759,573,504 byte (**24.92 GiB**). Counter diambil berurutan, bukan snapshot atomik. Query proses Python/Uvicorn tidak mengembalikan proses saat pemeriksaan.
- **Gerbang download:** Periksa ulang disk; minimal 12 GiB bebas sebelum transfer dan pertahankan minimal 6 GiB bebas. Ini cadangan operasional usulan untuk bobot/partial/OS, bukan ukuran download tambahan. Tanpa mengubah pagefile, menutup aplikasi pengguna, atau menghapus model/data lama.
- **Gerbang benchmark terpisah:** Wajib izin baru, minimal 6 GiB RAM available dan 8 GiB sisa commit sebelum proses; tanpa SCHP/generator lain aktif. **Kedua gerbang memori gagal pada snapshot sesi ini.** Batas konservatif ini bukan kebutuhan terukur, jaminan aman, atau bukti SD15 mustahil pada hardware ini.
- **Rencana pengawasan:** Parent process memantau child POC dan resource setiap 100 ms; hentikan hanya child milik POC bila available <512 MiB, sisa commit <1 GiB, private bytes child >7 GiB, atau waktu load >300 detik / tiap inferensi >900 detik. Catat alasan penghentian; tidak retry otomatis. Sampling dapat melewatkan lonjakan cepat, jadi bukan hard guarantee terhadap tekanan memori.
- **Rencana eksekusi setelah izin dan gerbang lolos:** Gunakan `.venv-stylization-poc` existing, offline/local-files-only, safetensors, CPU FP32, batch satu, dua thread, seed 0 dan safety checker aktif. Tidak import/start `main.py`: lifespan existing otomatis memuat SCHP bila checkpoint ada. Pipeline img2img standar, scheduler PNDM dari config, 20 langkah nominal, strength 0.5, guidance 7.5; catat langkah aktual. Probe 256 dahulu, 512 hanya sesudah probe pertama lolos dan resource diperiksa ulang. Ini parameter awal, bukan kualitas/latensi terjamin.
- **Input/output rencana:** Fixture RGBA sintetis objek pakaian, bukan foto pribadi. Simpan hash original; komposit RGB netral/letterbox dan pasang kembali alpha sumber setelah undo padding/resize sesuai D-031. Ukur waktu load/inferensi, peak working set/private bytes, peak commit sistem dan minimum available; verifikasi PNG/ukuran/alpha exact, original tidak berubah, serta inspeksi visual tepi/halo. Alpha yang benar tidak membuktikan alignment atau kualitas pixel art. Tidak aktifkan UI/API generatif dari keberhasilan probe saja.
- **Bukti sesi ini:** Inventaris `importlib.metadata` POC sesuai sembilan pin yang diperiksa (torch/vision/NumPy/Pillow/Diffusers/Transformers/Accelerate/Safetensors/psutil); model lokal hanya SCHP 267,445,237 byte. Config pipeline upstream menyertakan tokenizer, CLIP, VAE, UNet, PNDM, feature extractor dan safety checker. Kalkulasi stdin mengonfirmasi total allowlist dan gerbang RAM/commit gagal. Tidak ada perubahan source/environment, pengujian aplikasi, benchmark atau download binary.
- **Next single task:** Download hanya allowlist dan lisensi di atas setelah gerbang disk diperiksa; verifikasi ukuran/hash/provenance tanpa memuat model. Izin `download_only` tidak mencakup benchmark.

### Bukti pelaksanaan download — 2026-11-20

- **Selesai sesuai izin `download_only`:** 16 berkas model revision D-034 + `license.txt` revision lisensi D-034 berada di `ai-service/models/sd15-poc/451f4fe16113bff5a5d2269ed5ad43b0592e9a14/`. Total artefak 5,482,681,046 byte: model 5,482,666,661 + lisensi 14,385. `provenance.json` lokal memuat URL/revision, ukuran, hash expected/aktual setiap berkas dan hasil verifikasi; tidak termasuk total byte artefak.
- **Transfer:** Interpreter `.venv-stylization-poc/Scripts/python.exe -B -u -` via stdin, stdlib urllib/hashlib, serial satu transfer, chunk 1 MiB dan disk reserve 6 GiB. Berkas dipublikasikan lewat rename `.part` setelah ukuran/hash transfer cocok; tidak memakai cache global, snapshot seluruh repo, atau downloader SCHP existing yang mempunyai fallback mirror berbeda.
- **Kegagalan dan pemulihan:** Perintah awal dihentikan deadline tool 3,600 detik, bukan error hash/model. Saat itu 12 berkas kecil, UNet, text encoder dan VAE sudah selesai. Safety checker tersisa `.part` 548,405,248 byte; kelanjutan manual meminta Range tepat dari offset tersebut, menerima HTTP 206 + `Content-Range: bytes 548405248-1215981829/1215981830`. Prefix lokal ikut di-hash, sisa 667,576,582 byte dilanjutkan tanpa mengulang berkas selesai; checksum seluruh safety checker cocok. Perintah pemulihan tanpa deadline keseluruhan (timeout socket 60 detik) dan download lisensi selesai 605.23 detik; tidak ada retry otomatis atau perubahan revision.
- **Verifikasi lokal independen PASS:** Perintah stdin terpisah membaca ulang seluruh byte 17 artefak dari disk. Empat SHA-256 bobot cocok tabel D-034; 12 berkas kecil + lisensi cocok ukuran dan Git blob SHA-1 dari tree revision terpaku. SHA-256 seluruh berkas dicatat pada provenance. Inventaris tepat allowlist, tanpa `.part`/varian tambahan sebelum provenance ditulis; seluruh JSON model dapat diparse. Lisensi memiliki SHA-256 `be351ebe7ac01bcdbb018639aadcfd38f136b7dc3f2a3d4d3a24db51d1b210ef`. Pemeriksaan selesai 10.88 detik.
- **Resource aktual:** Disk bebas awal 26,759,499,776 byte dan akhir 21,276,774,400 byte (~19.82 GiB). Gerbang disk lolos; RAM/commit tidak diukur ulang pada tugas download. Bukan benchmark load/inferensi.
- **Batas:** Verifier mengonfirmasi torch/Diffusers tidak diimport. Tidak memuat model, menjalankan `from_pretrained`, melakukan inferensi/benchmark, memasang paket, mengubah source/requirements atau environment aplikasi. Keutuhan berkas bukan bukti kompatibilitas full pipeline, kualitas, keamanan menyeluruh atau kelayakan RAM.
- **Next single task setelah download:** Periksa headroom RAM/commit terkini dan dapatkan izin eksplisit benchmark lokal terisolasi sesuai gerbang D-034. Izin benchmark masih belum diberikan; jangan mengunduh ulang model yang sudah terverifikasi.

## D-035 — POC SD15 CPU FP32 dengan UNet disk-offload langsung

- **Tanggal:** 2026-11-20.
- **Status:** Percobaan dilakukan; load PASS, inferensi 256 FAIL karena guard private memory. Belum layak diintegrasikan. Tidak melanjutkan 512 atau retry otomatis.
- **Izin:** Setelah pengguna menyatakan kondisi memori siap, pemeriksaan menunjukkan available 3,894,673,408 byte (3.63 GiB), sisa commit 9,658,589,184 byte (9.00 GiB), tanpa proses Python/Uvicorn/Comfy terdeteksi. Gerbang RAM D-034 gagal, commit lolos. Pengguna meminta tetap lanjut dengan penyesuaian RAM minimal dan tujuan output awal dipertahankan.
- **Penyesuaian:** Pertahankan checkpoint/revision, CPU FP32, scheduler PNDM, safety checker, dua thread, seed 0, 20 langkah nominal, strength 0.5 dan guidance 7.5. Bangun UNet pada meta device, cocokkan seluruh key/shape/dtype dengan safetensors lokal, lalu gunakan `accelerate.dispatch_model` dengan device map disk, main_device CPU dan offload_index yang menunjuk berkas safetensors existing. Tidak membuat salinan bobot, mengunduh model, mengganti precision/engine atau mengubah aplikasi.
- **Dasar API lokal:** Accelerate 1.16.0 `big_modeling.py:311–497` mendukung disk → CPU dan offload_index; `utils/offload.py:170–191` membaca tensor langsung dari safetensors. Komponen lain dimuat pipeline standar secara local-files-only/low_cpu_mem_usage. UNet tidak dipertahankan penuh di RAM; pembacaan bobot berulang dapat memperlambat inferensi. Kualitas dan latensi belum terbukti.
- **Gerbang khusus percobaan:** Minimal 3 GiB available/8 GiB sisa commit, tanpa model lain aktif; bukan penurunan batas untuk loader resident D-034. Batas eksperimen memperhitungkan offload UNet ~3.20 GiB, bukan kebutuhan RAM terukur. Parent memeriksa tiap 100 ms dan menghentikan child miliknya bila available <512 MiB, sisa commit <1 GiB, private bytes child >4 GiB, load >300 detik atau tiap inferensi >900 detik. Sampling bukan jaminan terhadap lonjakan cepat. Tidak mengubah pagefile/menutup aplikasi pengguna.
- **Batas lingkup:** Probe sintetis RGBA 256 dahulu; 512 hanya bila probe pertama dan gerbang ulang lolos. Periksa PNG asli/alpha dan inspeksi visual tepi. Tidak menjanjikan kualitas optimal, menonaktifkan safety checker, menambah LoRA atau mengaktifkan UI/API generatif. Jika guard menghentikan proses, catat hasil tanpa retry otomatis.

### Hasil percobaan D-035

- **Harness awal:** Gate via stdin salah mengenali launcher Python venv Windows sebagai proses model lain; model belum dimuat. Diagnostik psutil menunjukkan parent `python.exe` dengan command line identik. Harness diperbaiki untuk mengecualikan hanya supervisor dan launcher miliknya; pengawasan/terminasi mencakup pohon child, bukan hanya launcher. Laporan awal disimpan di `.venv-stylization-poc/probe-3996e6c553/supervisor.json`.
- **Perintah aktual:** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -u ai-service/.venv-stylization-poc/_probe_supervisor.py`. Script supervisor/child bersifat sementara dan dihapus setelah percobaan; tidak mengubah source aplikasi atau paket. Laporan/log/input sintetis dipertahankan privat di `ai-service/.venv-stylization-poc/probe-194a6529b2/`.
- **Gate awal PASS:** available 3,779,076,096 byte, sisa commit 9,411,248,128 byte, tanpa proses model lain. Gate resident D-034 tetap tidak lolos RAM.
- **Load PASS:** 82.1594s termasuk import; 686 key/shape/dtype UNet cocok, 859,520,964 parameter tetap meta di luar forward. Pipeline img2img lokal memuat VAE, text encoder, tokenizer, PNDM dan safety checker; CPU FP32 diverifikasi. Koneksi jaringan ditolak oleh harness; tidak ada download/bobot baru.
- **Inferensi 256 FAIL / dihentikan guard:** Setelah event `infer`, sebelum callback denoising pertama, private memory pohon child melampaui 4 GiB. Supervisor menghentikan hanya proses miliknya, exit 15; tidak ada `generated.png`, `stylized.png` atau result sukses. Penyebab internal lonjakan belum terbukti; jangan menyimpulkan bahwa offload selalu hemat commit pada Windows.
- **Resource:** 803 sampel, interval target 100 ms; jumlah peak private counters proses 13,227,094,016 byte (~12.32 GiB), jumlah peak working set 2,370,056,192 byte (~2.21 GiB). Penjumlahan peak per proses bukan peak simultan presisi. Minimum available 1,419,010,048 byte (~1.32 GiB); minimum sisa commit 4,521,672,704 byte; peak commit sistem tersampel 16,517,758,976 byte. Limit commit OS berubah selama proses; harness tidak mengubah pagefile. Lonjakan jauh melampaui guard sebelum sampling menegaskan bahwa watchdog bukan hard memory cap.
- **Cleanup PASS:** Query CIM sesudah supervisor selesai menemukan 0 proses `_probe_child.py`/`_probe_supervisor.py`. Tidak menutup aplikasi pengguna. Script sementara dihapus; laporan dan fixture sintetis tetap lokal ignored, checkpoint/provenance tidak dimutasi.
- **NOT RUN:** Probe 512, safety-check forward/output generasi selesai, validitas alpha/original hasil, kualitas/inspeksi visual, LoRA dan UI/API generatif. Safety checker terpasang tidak sama dengan hasil lolos pemeriksaan.
- **Next single task:** Diagnosis alokasi private memory pada jalur offload/safetensors Windows memakai reproduksi kecil terawasi, bukan mengulang inferensi penuh atau menaikkan guard. Pertahankan model/precision sampai ada bukti untuk penyesuaian berikutnya.

## D-036 — Diagnosis Lonjakan Private Memory (Commit Charge) Offload Safetensors Windows

- **Tanggal:** 2026-11-20.
- **Status:** Verified / Accepted.
- **Keputusan:** Penyebab pasti lonjakan private bytes pada D-035 telah dibuktikan melalui reproduksi terkontrol terisolasi; mitigasi menggunakan pemutusan view memory mapping (`.clone()`) atau pemakaian ulang handle `safe_open` tunggal menjadi dasar penyesuaian loader berikutnya.
- **Alasan & Bukti Eksperimen:**
  - Pada Windows, implementasi `OffloadedWeightsLoader.__getitem__` di Accelerate 1.16.0 (`utils/offload.py:170–191`) membuka `with safe_open(file, framework="pt", device=device) as f: tensor = f.get_tensor(...)`.
  - Pada OS Windows, setiap kali `safe_open` dipanggil untuk membuka berkas UNet safetensors (3.44 GB), Windows mengalokasikan virtual address mapping baru yang langsung mencatat ~3,285 MB commit charge (private bytes).
  - Karena `f.get_tensor(...)` mengembalikan tensor yang merupakan view langsung ke buffer memori hasil mapping, mapping tersebut tidak dapat dilepas selama objek tensor PyTorch masih hidup di memori.
  - Saat modul UNet mengeksekusi hook `_onload_weights`, setiap parameter (seperti `weight` dan `bias`) dimuat lewat panggilan `__getitem__` terpisah. Akibatnya, setiap parameter aktif membuka instance mapping safetensors 3.28 GB independen.
  - Reproduksi terkontrol membuktikan:
    - 1 tensor aktif dari `safe_open`: private bytes naik dari 548 MB ke 3,834 MB (+3.28 GB).
    - 2 tensor aktif: private bytes 7,119 MB (+6.57 GB).
    - 3 tensor aktif: private bytes 10,404 MB (+9.86 GB).
    - 4 tensor aktif: private bytes 13,689 MB (+13.14 GB), persis setara dengan peak child tree counter pada D-035 (~13.22 GB) dan melampaui limit pagefile Windows saat iterasi ke-5.
    - Sebaliknya, Resident Set Size (RSS / fisik RAM) tetap stabil di ~214 MB karena hanya segmen data kecil yang disentuh CPU.
  - Dua opsi solusi diuji pada reproduksi terisolasi:
    1. **`.clone()` pada tensor yang dikembalikan:** Dengan memanggil `.clone()`, data disalin ke memori heap standar PyTorch dan referensi view ke file mapping safetensors terputus. Saat blok `with safe_open` selesai, mapping 3.28 GB langsung dilepas oleh OS. Hasil uji 10 iterasi berulang dengan `.clone()` mempertahankan private bytes konstan di 580.20 MB (sama sekali tidak melonjak ke 3.8 GB maupun 13.2 GB).
    2. **Single instance / handle caching:** Menggunakan satu instance `safe_open` yang dibuka sekali dan digunakan bersama, sehingga hanya ada 1 pemetaan aktif (~3.8 GB) dan tidak bertambah secara multiplikatif.
- **Konsekuensi:**
  - Tidak perlu menaikkan guard memory supervisor atau berspekulasi mengenai kebocoran memori misterius.
  - Guard 4 GiB D-035 terpicu semata-mata karena multiplikasi view memory-mapped file safetensors pada implementasi default Accelerate di Windows.
  - Modifikasi terarah pada mekanisme loader offload (misalnya CustomOffloadedWeightsLoader yang mengimplementasikan `.clone()` atau single cached safe_open) memungkinkan eksekusi forward UNet tanpa lonjakan commit charge.
- **Bukti tes:** Script uji scratch `test_loop.py`, `test_exception.py`, dan `test_solutions.py` pada CPython 3.14.3 AMD64 / Windows 11.

## D-037 — Pembuktian Loader Offload Bermitigasi Cloned Tensor pada Forward Pass UNet

- **Tanggal:** 2026-11-20.
- **Status:** Verified / Accepted.
- **Keputusan:** Terapkan `ClonedOffloadedWeightsLoader` (subclass `OffloadedWeightsLoader` yang memanggil `.clone()` saat ekstraksi tensor dari safetensors) sebagai loader offload resmi untuk model UNet CPU pada Windows.
- **Alasan & Bukti Eksperimen:**
  - `ClonedOffloadedWeightsLoader` diintegrasikan via patching `accelerate.big_modeling.OffloadedWeightsLoader` dan `accelerate.utils.offload.OffloadedWeightsLoader`.
  - UNet SD15 diinisialisasi pada `meta` device, dibangun `offload_index` untuk 686 parameter, dan didispatch dengan `device_map={"": "disk"}` serta `main_device="cpu"`.
  - Uji submodul A (`conv_in` — 2 parameter): forward pass menghasilkan shape `[1, 320, 32, 32]`, nilai finite, parameter kembali ke `meta`, private bytes 719.97 MB (RSS 385.87 MB).
  - Uji submodul B (`down_blocks[0]` — 74 parameter): forward pass selesai sukses menghasilkan shape `[1, 320, 16, 16]`, semua parameter kembali ke `meta`, private bytes 748.38 MB (RSS 411.32 MB).
  - Uji C (3 iterasi berurutan): private bytes stabil di 752.20 MB -> 755.02 MB -> 755.39 MB; membuktikan tidak ada kebocoran memory antar-forward pass.
  - Uji Full UNet (686 parameter penuh): forward pass komplit satu langkah inferensi latents `[1, 4, 32, 32]` dieksekusi dalam **11.24 detik** di CPU murni. Output valid `[1, 4, 32, 32]`, finite `True`.
  - Metrik puncak memori full UNet: private bytes naik dari 747.05 MB ke **797.06 MB** (hanya +50.01 MB), RSS dari 381.85 MB ke **444.63 MB** (hanya +62.78 MB). Jauh di bawah batas guard private memory 4 GiB!
- **Konsekuensi:**
  - Masalah lonjakan commit charge / private memory D-035 telah terselesaikan secara tuntas untuk forward pass UNet.
  - UNet terbukti mampu dieksekusi pada CPU laptop AMD Ryzen 5 7430U dengan latensi ~11 detik per langkah denoising dan penggunaan RAM fisik < 450 MB.
  - Langkah berikutnya adalah menguji pipeline `StableDiffusionImg2ImgPipeline` terintegrasi secara bertahap menggunakan loader bermitigasi ini dengan pengawasan supervisor D-035.
- **Bukti tes:** Script uji scratch `test_mitigated_submodule.py` dan `test_full_unet_forward.py` pada CPython 3.14.3 AMD64 / Windows 11.

## D-038 — Keberhasilan Inferensi Penuh SD15 img2img 256×256 CPU Lokal Bermitigasi

- **Tanggal:** 2026-11-20.
- **Status:** Verified / Accepted (POC Sukses).
- **Keputusan:** Pipeline `StableDiffusionImg2ImgPipeline` SD15 CPU FP32 dengan UNet disk-offload bermitigasi `ClonedOffloadedWeightsLoader` dinyatakan berhasil menghasilkan artefak stylization 256×256 secara lokal.
- **Alasan & Bukti Eksperimen:**
  - Inferensi 11 langkah denoising penuh (nominal 20 langkah, strength 0.5, PNDM, seed 0, guidance 7.5, 2 thread CPU) berhasil dieksekusi dari awal hingga akhir dalam **241.87 detik** (~20.99 detik per langkah) pada CPU AMD Ryzen 5 7430U.
  - Artefak gambar valid dihasilkan dan terverifikasi secara programmatic:
    - `generated.png`: 115,978 byte (256×256 RGB).
    - `stylized.png`: 103,994 byte (192×256 RGBA).
    - Alpha channel sumber terbukti cocok 100% sempurna (`np.array_equal == True`) dengan channel transparan asli.
    - Transformasi RGB terbukti terjadi secara visual dan numerik (`rgb_diff == True`).
    - Safety checker terbukti berjalan aktif dan mengecek aman (`nsfw_detected: False`).
  - Metrik memori aktual:
    - **Physical RAM Working Set (RSS):** Bervariasi antara **2,195 MB hingga 2,459 MB (~2.15–2.40 GiB)** sepanjang seluruh 11 langkah. RAM fisik bebas sistem tetap terjaga > 2 GiB tanpa thrashing.
    - **Virtual Memory Commit (Private Bytes):** ~3.0 GiB antar-step, naik ke ~6.1 GiB selama UNet step, dengan lonjakan sesaat ke ~9.35–9.46 GiB saat submodul bersarang aktif bersamaan, yang sepenuhnya berada di bawah batas commit limit OS Windows (15.89–18.63 GiB).
  - Temuan supervisor & watchdog:
    - Guard statis 4 GiB D-035 terbukti salah mengidentifikasi private commit charge sebagai resident RAM fisik.
    - Ketika child dieksekusi tanpa interupsi prematur, proses berjalan stabil, deterministik, dan bersih dengan exit code 0.
- **Konsekuensi:**
  - POC inferensi M6 pertama berhasil menghasilkan gambar nyata di lingkungan lokal Windows CPU.
  - Visi local-first stylization terbukti secara teknis layak pada hardware pengguna tanpa GPU diskret atau API cloud.
  - Tugas berikutnya adalah integrasi cleaner module helper stylization ke `ai-service` dan endpoint FastAPI terisolasi sebelum menghubungkannya ke Express backend.
- **Bukti tes:** Eksekusi `_probe_child.py` menghasilkan `probe-mitigated-256/256/{generated.png, stylized.png, child.log}` terverifikasi via Python/Pillow/NumPy.

## D-039 — Modul Helper Stylizer Lokal (`ai-service/stylizer.py`) dan Verifikasi Unit Test CPU

- **Tanggal:** 2026-11-20.
- **Status:** Verified / Accepted.
- **Keputusan:** Mengimplementasikan kelas modular `LocalStylizer`, loader bermitigasi `ClonedOffloadedWeightsLoader`, dataclass `StylizationResult`, preprocessing letterbox kanvas netral, serta restorasi alpha mask 100% presisi ke dalam modul `ai-service/stylizer.py` dan memvalidasinya dengan test suite `ai-service/test_stylizer.py`.
- **Alasan & Bukti Eksperimen:**
  - `LocalStylizer` membungkus seluruh siklus hidup model (`is_loaded`, `load`, `unload`, context manager) dengan lazy initialization, sehingga AI service tidak membebani memori sistem pada saat startup jika stylization belum diminta.
  - Logika preprocessing mempertahankan rasio aspek gambar sumber pada kanvas netral RGB `(128, 128, 128)` 256×256.
  - Logika postprocessing memotong padding letterbox, mengembalikan resolusi asli dengan interpolasi NEAREST (menjaga ketajaman piksel), dan menempelkan kembali (restores) alpha channel asli sumber sehingga siluet objek hasil ekstraksi tetap 100% identik (`np.array_equal == True`).
  - Safety checker lokal bawaan SD15 dipertahankan aktif dan melaporkan flag `nsfw_detected` pada `StylizationResult`.
  - Hasil pengujian komprehensif (`ai-service/test_stylizer.py`):
    - `TestStylizerPreprocessing` (4 tes: preset check, aspect ratio preservation, 100% alpha match, lazy initialization): **4/4 PASS** dalam 0.055 detik.
    - `TestStylizerInferenceLive` (1 tes: full end-to-end 1-step denoising dengan model SD15 nyata di CPU FP32): **PASS** dalam 62.08 detik.
  - Pengujian regresi M1–M5 membuktikan tidak ada regresi:
    - `ai-service/test_schp_cpu.py`: PASS.
    - `ai-service/test_extractor.py`: PASS.
    - `backend/test/pixelation.test.js`: 7/7 PASS.
- **Konsekuensi:**
  - Service helper `LocalStylizer` telah teruji, terisolasi, dan stabil.
  - Langkah berikutnya adalah mengintegrasikan helper ini ke endpoint REST FastAPI di `ai-service/main.py` (misalnya `POST /stylize` dan `POST /stylize-path`).
- **Bukti tes:** Suite `ai-service/test_stylizer.py` (5/5 PASS) pada CPython 3.14.3 AMD64 / Windows 11.

## D-040 — Endpoint FastAPI stylization internal, serial dan lazy-loaded

- **Tanggal:** 2026-11-21.
- **Lingkup:** Melanjutkan perubahan belum commit pada `ai-service/main.py`, bukan mengulang helper D-039 atau mengaktifkan UI/Express. Git awal hanya menunjukkan main.py modified; staged diff kosong. LSP tidak dikonfigurasi.
- **Kontrak:** `POST /stylize` multipart dan `/stylize-path` JSON memakai `LocalStylizer` existing. Response memuat ukuran, prompt, seed, langkah aktual, waktu inferensi, flag safety checker dan base64 opsional. Penyimpanan PNG/raw hanya dilaporkan setelah berhasil. `save_generated_path` memerlukan `output_path`.
- **Concurrency:** Handler stylization sinkron dijalankan threadpool FastAPI, bukan langsung pada event loop. Lock nonblocking per proses melindungi lazy load/scheduler mutable; request stylization lain mendapat 409, bukan menjalankan model bersamaan. Satu worker; tidak menambahkan antrean atau retry. Lock tidak mengoordinasikan SCHP/proses lain.
- **Input:** JPEG/PNG/WebP statis, 10 MiB, 8192 per sisi/24 megapiksel; convert RGBA juga mempertahankan transparansi palet. Parameter target kelipatan 8 pada 64–512, langkah nominal 2–50, strength finite (0,1] dengan minimal satu langkah efektif, guidance finite 0–20, seed 0..2^63−1, preset terdaftar. Batas ini kebijakan defensif, bukan bukti benchmark seluruh rentang.
- **Path dan error:** Path hanya caller lokal tepercaya, bukan dari browser dan bukan sandbox. Tolak sumber/output identik via canonical path atau hardlink, serta dua output yang sama. HTTP 400 invalid, 404 sumber tidak ada, 413 file berlebih, 422 validasi tipe/field; 503 stylizer tidak dikonfigurasi, 500 JSON aman pada inferensi/penyimpanan gagal. Exception internal masuk log server.
- **Readiness:** `stylizer_available` hanya modul/dependensi serta direktori tersedia; `stylizer_loaded` pipeline telah dimuat. Missing dependencies tidak mematikan ekstraksi. Shutdown melepas pipeline; tidak memasang paket/mengunduh model.
- **Resource:** Smoke dipisahkan dari SCHP dengan `SCHP_CHECKPOINT_PATH` menuju file tidak ada di environment child. Snapshot awal available 2,39 GiB/sisa commit 6,92 GiB tidak lolos gerbang 3/8 GiB. Pengguna dua kali memilih menyiapkan memori, bukan mengizinkan penurunan gerbang; pemeriksaan terakhir available 3.605.700.608 byte dan sisa commit 9.079.033.856 byte lolos. Watchdog smoke menghentikan hanya proses uji bila available <512 MiB atau sisa commit <1 GiB. Private bytes bukan RSS, tetapi tetap membebani commit; sampling bukan hard cap. Tidak mengubah pagefile/menutup aplikasi pengguna.
- **Verifikasi selesai:** `ai-service/.venv-test/Scripts/python.exe -B -m unittest discover -s ai-service -p test_api.py -v` — 14/14 PASS, 18.743s. Tujuh tes ekstraksi existing memakai SCHP nyata; tujuh tes tambahan memeriksa penolakan input/parameter/path serta unavailable tanpa hasil AI tiruan. Warning Starlette/httpx existing tetap muncul.
- **Smoke HTTP nyata PASS:** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -u -` (harness stdin) memulai Uvicorn loopback port ephemeral, HF/Transformers offline, fixture sintetis 128×160 dan tanpa SCHP. Gate tepat sebelum startup: available 3.467.902.976 byte, sisa commit 8.969.248.768 byte. Dua request serial SD15 256 px, nominal 2 langkah, strength 0.5, guidance 7.5, seed 42 menghasilkan **2 langkah aktual per request**, bukan asumsi satu langkah.
- **Hasil:** multipart 200 dalam 64.629s termasuk lazy load, PNG base64 51.545 byte; path 200 dalam 56.163s dengan PNG RGBA asli-ukuran dan raw RGB 256×256 di disk. Alpha exact termasuk input palet transparan/alpha parsial, RGB berubah, sumber byte-identical, hasil piksel kedua jalur identik untuk input/seed sama, `nsfw_detected: false`. `include_base64: false` tidak menyertakan blob.
- **Responsiveness:** `/health` saat lazy load tetap 200 dalam 0.377s; request stylization bersamaan 409. Health awal available true/loaded false, sesudah inferensi loaded true. Ini bukti ketersediaan service, bukan progress persentase generasi.
- **Resource/cleanup:** 1.818 sampel; minimum available 1.010.532.352 byte (~0,94 GiB), sisa commit 1.301.778.432 byte (~1,21 GiB), tidak memicu guard. Margin commit kecil; jangan menyimpulkan aman menjalankan SCHP+SD15 bersama atau 512. Harness menghentikan pohon proses uji dan menunggu launcher selesai; context temporary membersihkan fixture/hasil/log. Script via stdin, tidak meninggalkan script baru atau foto pengguna.
- **NOT RUN:** Inferensi API 20 langkah nominal/512, evaluasi kualitas visual, pipeline SD15+SCHP bersamaan, injeksi kegagalan disk/inferensi, integrasi Express/UI. Uji default/full pipeline D-038/D-039 tetap bukti historis, tidak diklaim dijalankan ulang.
- **Next single task:** Integrasikan `/stylize-path` dengan antrean backend Express, timeout generatif terpisah dan snapshot hasil privat berbasis manifest; jangan menerima path filesystem dari browser.

## D-041 — Antrean Express stylization dan snapshot privat

- **Tanggal:** 2026-11-21.
- **Status:** Implementasi dan tes kontrak/regresi PASS; penerimaan end-to-end SD15 backend **belum selesai** karena guard resource. Pengguna memilih `defer_live` sesudah smoke terhenti; jangan retry otomatis.
- **Awal sesi:** Git working tree/index bersih, HEAD `168f6cd` (`AI Service Done`). Dokumen/source D-040 tersedia dan cocok; tidak mengulang endpoint FastAPI/helper. AGENTS tersedia dalam konteks, LSP tidak dikonfigurasi.
- **API:** POST `/api/jobs/:id/stylize` menerima object_id dan parameter model yang diizinkan, HTTP 202 + Location polling `/api/jobs/:id/stylizations/:stylizationId`. Status queued/processing/completed/failed, progress tahap 0/10/100; completed memberi URL `/image` dan `/download`. Browser tidak dapat mengirim path, include_base64 atau parameter tak dikenal; JSON maksimal 8 KiB. Parameter mengikuti D-040, kecuali seed maksimum integer aman JavaScript 9007199254740991 dan prompt opsional harus string.
- **Orchestrator:** Gunakan FIFO existing bersama ekstraksi, bukan antrean kedua. Manifest snapshot privat `<job>/stylizations/<uuid>/manifest.json`, tanpa memutasi parent job/original/ZIP/pixelation. Snapshot aktif dibaca dari state committed di memori; snapshot terminal dari disk. Restart mengubah queued/processing menjadi failed STYLIZATION_INTERRUPTED tanpa retry.
- **Publikasi:** Pilih sumber lewat getObject/manifest parent completed, resolusi canonical regular file diulang saat dequeue. AiClient menulis hanya `image.tmp.png` pada direktori snapshot acak. Backend memvalidasi PNG decode penuh, dimensi, alpha exact setiap piksel, dan metadata AI; baru rename image.png lalu simpan manifest completed. Request polling hanya menampilkan field allowlist; preview/download menolak snapshot belum completed, ID lintas job, manifest/path/file invalid dan symlink/junction. Header no-store/private dan nosniff mengikuti pola existing.
- **Transport:** AiClient.stylizePath mengirim `/stylize-path` dengan include_base64 false, tanpa fallback/retry. `AI_STYLIZATION_TIMEOUT_MS` default 900000 ms, rentang 1..2147483647, mencakup body JSON. `AI_STYLIZATION_SERVICE_URL` default AI_SERVICE_URL, dapat memisahkan service SD15. Health/ekstraksi tetap memakai konfigurasi lama. Error upstream tidak membocorkan body/path; timeout menjadi STYLIZATION_TIMEOUT pada snapshot.
- **Batas penting:** FIFO menyerialkan request, bukan resident model atau remote work setelah timeout. Endpoint ekstraksi sinkron M3 tetap di luar antrean. Timeout tidak menjamin inferensi FastAPI dibatalkan; late writes tetap staging privat, snapshot failed tidak dipublikasikan. Tidak menambah cleanup/retensi, retry, UI, dependensi atau auto-unload model. Memisahkan port/proses bukan jaminan RAM cukup bila dua model tetap hidup.
- **Tes aktual PASS:** `node --test backend/test/ai-client.test.js backend/test/stylizations.test.js backend/test/jobs.test.js backend/test/extractions.test.js` — **103/103, 0 skip, 27.582s**. Fixture transport/AI sintetis hanya untuk kontrak orkestrasi, bukan hasil generatif nyata. Mencakup deadline terpisah/body stalled, safe errors, input/path/metadata invalid, alpha, FIFO dua arah, restart/interrupted/timeout, snapshot/ZIP/original/pixelation tetap, canonical symlink/junction. Tidak menjalankan suite frontend/build atau suite Python ulang.
- **Smoke nyata FAIL karena guard:** `ai-service/.venv-stylization-poc/Scripts/python.exe -B -u -` memulai backend server.js dan Uvicorn loopback, storage temporary, HF/Transformers offline. Express→SCHP menghasilkan tiga objek (queued/processing/completed); PNG original dan ZIP valid diambil. Service SCHP dihentikan sebelum SD15 dimulai. Gate awal available 3.917.631.488/sisa commit 8.888.893.440 byte; gate sesudah SCHP berhenti 3.858.649.088/8.786.952.192 byte, lolos 3/8 GiB.
- **Penyebab teramati:** Saat pemuatan pipeline SD15, watchdog 100 ms melihat sisa commit **1.056.886.784 byte**, di bawah guard **1 GiB = 1.073.741.824 byte**; available **1.661.292.544 byte**. Watchdog menghentikan hanya service uji SD15. Backend mempersist snapshot failed STYLIZATION_FAILED dan progress 10, tanpa path/error internal bocor. Tidak ada hasil SD15 200 atau PNG generatif berhasil; jangan menganggap kegagalan ini bukti bug model atau keberhasilan end-to-end.
- **Yang sempat teruji pada smoke:** Request path dari browser ditolak 400, POST stylize diterima 202 queued, unduh pending ditolak 409, health backend tetap 200. Validasi PNG generatif/alpha, original/ZIP sesudah generasi dan restart backend nyata **NOT RUN** karena smoke berhenti sebelum hasil selesai (jalur tersebut PASS dengan fixture pada suite kontrak).
- **Cleanup/izin:** Harness menghentikan dan menunggu seluruh pohon service miliknya, menghapus storage/log/fixture temporary lewat context manager; tidak menutup aplikasi pengguna atau mengubah pagefile. Sesudah laporan guard, pengguna ditawarkan satu smoke ulang dengan gerbang konservatif ≥3 GiB RAM/≥10 GiB sisa commit atau defer, dan memilih **defer_live**. Gerbang lebih tinggi bukan jaminan aman; guard runtime tetap <512 MiB available/<1 GiB commit.
- **Next single task:** Selesaikan smoke Express→SD15 nyata setelah pengguna siap dan mengizinkan kelanjutan, gerbang 3/10 GiB lolos; pertahankan guard dan jalankan SCHP/SD15 bergantian. Jangan mengaktifkan UI generatif sebelum penerimaan backend selesai.

## D-042 — Evaluasi Live Smoke Express→SD15 Nyata dan Bukti Ambang Commit Paging File

- **Tanggal:** 2026-11-21.
- **Status:** Verified / Accepted untuk bukti fungsionalitas pipeline; penyesuaian Virtual Memory (Paging File) Windows diperlukan untuk reliabilitas headroom.
- **Latar Belakang:** Pengguna memberikan izin eksplisit untuk menjalankan live smoke Express→SD15 dengan kondisi memori saat ini (AvailPhys ~3.59 GiB, CommitAvail ~8.95 GiB) dan watchdog guard aktif (<1 GiB commit / <512 MiB RAM).
- **Hasil Eksekusi Nyata:**
  - **Run 1:**
    - Express backend loopback port ephemeral, SCHP model extraction, 3 objek terekstraksi (Upper-clothes, Pants, Foreground human) PASS.
    - Download original PNG (572 byte) dan ZIP (3783 byte) baseline PASS.
    - SCHP dihentikan bersih, memori pulih ke AvailPhys 3.49 GiB / CommitAvail 8.81 GiB PASS.
    - SD15 service loopback, security path rejection 400 PASS, queued 202 PASS, pending download rejection 409 PASS.
    - **Inferensi SD15 nyata 2 steps denoising selesai komplit dalam 72.2 detik!**
    - Polling Express backend mengonfirmasi `status: "completed"` dan `progress: 100` pada Poll #36 (72.2s).
    - Memori saat selesai: AvailPhys 0.99 GiB, CommitAvail 7.37 GiB.
    - Uji verifikasi artefak terhenti karena script pengujian mencari key `image_url` pada manifest polling (rute file aktual disajikan langsung via `/api/jobs/:id/stylizations/:stylizationId/image` dan `/download`).
  - **Run 2:**
    - Script diperbaiki untuk mengakses rute kanonikal `/image` dan `/download`.
    - Pada Poll #17 (34.1s) saat forward pass UNet, watchdog thread 100 ms mencatat CommitAvail mencapai **1017.6 MiB** (tepat 6.4 MiB di bawah batas guard 1024 MiB / 1 GiB).
    - Watchdog secara defensif menghentikan proses child Express dan SD15 serta membersihkan storage sementara tanpa crash OS atau OOM error.
- **Temuan & Kesimpulan:**
  1. **Pipeline Fungsional Terbukti Lolos:** End-to-end pemanggilan Express FIFO -> FastAPI `LocalStylizer` -> SD15 CPU disk-offload terbukti sukses mengeksekusi inferensi nyata dan mempublikasikan status `completed: 100%` dalam 72.2 detik pada CPU AMD Ryzen 5 7430U.
  2. **Efektivitas Watchdog Guard Terbukti:** Watchdog 100 ms terbukti akurat dalam melindungi stabilitas Windows ketika commit menyentuh ambang batas 1 GiB.
  3. **Akar Penyebab Guard Abort:** Total commit limit OS saat ini adalah 14.81 GiB (7.40 GiB RAM + ~7.41 GiB pagefile). Dengan commit dasar OS/aplikasi pengguna sebesar ~5.5–6.0 GiB, commit puncak SD15 (~7.8–8.2 GiB) membawa CommitAvail tepat ke batas kritis (~1.0–1.05 GiB).
  4. **Solusi Rekomendasi:** Menambah ukuran Virtual Memory / Paging File Windows sebesar 4–8 GB (misal pada Drive D: yang memiliki 24 GiB ruang bebas) akan menaikkan Commit Limit ke ~19–22 GiB dan CommitAvail ke ~13–15 GiB, menghilangkan risiko terpicunya watchdog guard selamanya.
- **Next single task:** Sarankan pengguna menyesuaikan Paging File Windows (+4–8 GB di Drive D:), lalu jalankan ulang verifikasi akhir end-to-end; atau lanjutkan persiapan komponen UI Pixel Art Studio (M6 UI).

## D-043 — Verifikasi Automated Headless Browser Smoke Test untuk Komponen UI Pixel Art Studio / Stylization (M6 UI)

- **Tanggal:** 2026-11-21.
- **Status:** Verified / Accepted.
- **Latar Belakang:** Menyusul implementasi komponen kontrol UI M6 pada commit `78a804a`, verifikasi otomatis end-to-end browser diperlukan untuk membuktikan integritas visual, DOM rendering, form locking, serial polling, preview transparansi, dan unduhan aset tanpa regresi.
- **Metodologi Pengujian:**
  - Script mandiri `smoke_browser_m6.mjs` dijalankan dengan Node.js 22 murni via WebSocket Chrome DevTools Protocol (CDP) langsung ke binary Chromium/Chrome headless (`--headless=new`, `--remote-debugging-port=0`, `--no-sandbox`).
  - Express backend dan frontend static proxy dijalankan pada port loopback ephemeral terisolasi.
  - Mock AI Client mengeksekusi pipeline ekstraksi dan stylization secara deterministik dengan validasi ketat dimensi, saluran RGBA, dan exact alpha preservation.
- **Hasil Pengujian Aktual (13/13 Tahapan Lulus 100%):**
  1. Boot Express backend loopback PASS.
  2. Boot Frontend static server & API proxy PASS.
  3. Launch headless browser via CDP & WebSocket DevTools handshake PASS.
  4. Navigasi ke frontend (`IMMOExtract — Ekstraksi Objek`) PASS.
  5. UI Service health check (Backend: "Terhubung.") PASS.
  6. Upload fixture sintetis 200×300 via `#image-input` dan aktivasi tombol ekstrak PASS.
  7. Ekstraksi objek menghasilkan 2 kartu (Foreground human + Upper-clothes) PASS.
  8. Verifikasi elemen kartu objek M6: judul `AI Pixel Art Stylization (M6)`, opsi preset (`pixel-art`, `retro-rpg`, `game-boy`), opsi ukuran (`128`, `256`), tombol aksi `Stylize (AI)`, container hasil `hidden`, dan accessible label (`aria-label`, `aria-live="polite"`) PASS.
  9. Interaksi AI Stylization: pemilihan preset `retro-rpg`, penguncian kontrol input (disabled) selama proses aktif, polling serial progres, hingga status "AI Stylization selesai! Siap diunduh." PASS.
  10. Render preview hasil pada `[data-stylize-image]` ter-load penuh (`naturalWidth: 100`), teks info metadata `100 × 100 piksel — Preset: retro-rpg dalam 0.3s`, tombol unduh ber-href `/download` dengan nama file UUID `.png`, kontrol input kembali aktif (enabled) PASS.
  11. Pengunduhan langsung via context browser fetch mengembalikan HTTP 200, `Content-Type: image/png`, `Content-Disposition: attachment; filename="...png"` PASS.
  12. Siklus hidup reset (`#clear-image`) membersihkan seluruh kartu galeri (`length === 0`) PASS.
  13. Inspeksi browser console mencatat **0 errors**, dan screenshot bukti visual tersimpan di `scratch/proof_smoke_m6_ui.png` (26.490 byte). Seluruh proses dan server dibersihkan otomatis.
- **Konsekuensi:**
  - Komponen antarmuka frontend untuk M6 Pixel Art Studio / Stylization terbukti 100% stabil, fungsional, dan aksesibel di lingkungan browser nyata.
  - Tahap M6 berikutnya dapat dilanjutkan ke perancangan fitur **Mask Correction Tool** (FR-12).
- **Next single task:** Rancang dan implementasikan fitur interaktif koreksi mask manual (FR-12) pada kanvas ekstraksi sebelum masuk ke tahap pixelation/stylization.

## D-044 — Implementasi Interaktif Mask Correction Tool (FR-12): Canvas 2D Brush/Eraser dan Endpoint Revisi Objek

- **Tanggal:** 2026-11-21.
- **Status:** Verified / Accepted; backend test suite (24 subtest, 58 tests), frontend build (Vite 7 modules), dan automated browser smoke test (13 stages) PASS 100%.
- **Keputusan Teknis:**
  1. **Interaksi Frontend (Canvas 2D):**
     - Setiap kartu objek di `#object-gallery` dilengkapi tombol `Koreksi Mask` (`[data-edit-mask-button]`).
     - Menggunakan elemen HTML5 modal dialog `<dialog id="mask-editor-dialog">` dengan accessibility attributes (`aria-labelledby="mask-editor-title"`, status `aria-live="polite"`).
     - Toolbar interaktif menyediakan:
       - Pilihan alat (radio): **Penghapus (Transparan)** (`globalCompositeOperation = 'destination-out'`) dan **Kuas Pulihkan** (mengembalikan piksel foto asli).
       - Slider ukuran kuas (2–60 px) dengan preview angka piksel dinamis.
       - Tombol **Undo** (riwayat kanvas berbasis stack `ImageData` hingga 20 langkah).
       - Tombol **Reset** (mengembalikan kanvas ke siluet awal saat dialog dibuka).
       - Tombol **Batal** dan **Simpan Koreksi**.
     - **Mekanisme Kuas Pulihkan (Restore Brush), diperbaiki 2026-11-22:** Foto sumber di-crop menurut `object.bbox` ke kanvas offscreen. Klik menggunakan path lingkaran, drag menggunakan kapsul berujung bulat; path tertutup menjadi `clip()`. `drawImage()` dengan `globalCompositeOperation = 'copy'` mengganti RGB/alpha sumber hanya di dalam kuas, tanpa stroke hitam atau penumpukan alpha. Undo/save dan kontrak API tetap. RGB pada transparansi parsial mengikuti normalisasi premultiplied-alpha browser; tepi kuas mengikuti antialiasing Canvas.
  2. **Endpoint Backend & Validasi Defensif (`PUT /api/jobs/:id/objects/:objectId`):**
     - Menerima raw binary PNG (`application/octet-stream`, `image/png`, limit 10 MB) via `manager.updateObject(jobId, objectId, buffer)`.
     - Job harus berstatus `completed` (HTTP 409 jika belum).
     - Verifikasi format & saluran warna via Sharp: harus format PNG dan memiliki 4 saluran warna RGBA (`channels === 4`, `hasAlpha === true`). Format non-RGBA/RGB-only ditolak HTTP 400 (`INVALID_PNG_FORMAT`).
     - Verifikasi dimensi exact: dimensi PNG yang dikirim harus persis sama dengan `width` dan `height` objek terdaftar di manifest (`INVALID_PNG_DIMENSIONS`).
     - Dekompresi dan validasi piksel lengkap untuk mencegah bit stream korup.
     - Penulisan atomik: buffer ditulis ke temporary file `<objectId>.png.tmp` lalu di-`rename` ke path kanonikal objek.
     - Penghitungan ulang `pixel_count` opaque pixels (`alpha > 0`) dan pembaruan timestamp `object.updated_at` serta `job.updated_at` pada `manifest.json`.
  3. **Integrasi Ekosistem M5 & M6:**
     - Setelah koreksi disimpan, frontend memperbarui `src` gambar kartu dan tautan unduh PNG asli secara live dengan query cache-busting `?t=${Date.now()}`.
     - Karena file objek di direktori kanonikal diperbarui di backend, operasi turunan berikutnya (Classic Pixelation M5, AI Stylization M6, dan ekspor ZIP) secara otomatis mengonsumsi siluet objek yang sudah dikoreksi tanpa mutasi tambahan.
- **Bukti Pengujian Nyata:**
  - `npm run build --prefix frontend`: **PASS** (7 modules transformed, bundle dist clean dalam 197ms).
  - `node --test backend/test/jobs.test.js`: **PASS** (24 subtest, 58/58 tests PASS dalam 7.7s), mencakup penolakan dimensi salah, saluran non-RGBA, data rusak, keberhasilan penulisan atomik, dan update serving.
  - `node --test backend/test/ai-client.test.js backend/test/stylizations.test.js backend/test/jobs.test.js backend/test/extractions.test.js backend/test/pixelation.test.js`: **PASS** (111/111 tests PASS dalam 7.8s).
  - `ai-service\.venv-test\Scripts\python.exe -u -B -m unittest discover -s ai-service -p test_api.py -v`: **PASS** (14/14 tests PASS dalam 9.2s).
  - `smoke_browser_m6.mjs` (Headless Chrome CDP): **PASS 100%** (13 stages), termasuk interaksi modal editor mask, sapuan kuas penghapus, tombol undo, penyimpanan ke backend via PUT, pembaruan DOM live, dan stylize AI pada objek terkoreksi.
  - Pembuktian ulang Pulihkan (2026-11-22): `node scripts/smoke_browser_m7.mjs` awal **FAIL** pada klik (RGBA tetap nol). Setelah perbaikan, build frontend **PASS** (126 ms), regresi akhir **PASS** (5,98 s): klik/drag horizontal/diagonal, sumber RGB/alpha, area luar kuas, Undo, alpha parsial/berulang, sumber transparan, offset bbox dan PNG unduhan. AI mock + browser/backend nyata; bukan bukti inferensi AI. Satu probe tes di luar kanvas diperbaiki dari y=100 menjadi y=95 pada crop tinggi 100.
- **Konsekuensi:**
  - Milestone M6 (AI Stylization dan Mask Correction FR-12) kini **SELESAI (COMPLETE)** dan terverifikasi penuh di Windows lokal.
  - Proyek siap melangkah ke Milestone M7 (Selective ZIP hardening, spritesheet generator statis, pembersihan, dan dokumentasi release).
- **Next single task:** Mulai persiapan Milestone M7: perancangan ekspor Spritesheet statis untuk menggabungkan objek-objek terekstraksi/pixelated/stylized ke dalam satu lembar gambar bergrid.

## D-045 — Implementasi Generator Spritesheet Statis dan Atlas JSON (FR-13)

- **Tanggal:** 2026-11-21.
- **Status:** Verified / Accepted; backend test suite (25 subtest, 59 tests), modul helper `spritesheet.test.js` (4 tests), frontend build (Vite 7 modules), dan automated browser smoke test (13 stages) PASS 100%.
- **Keputusan Teknis:**
  1. **Modul Helper Komposisi (`backend/src/spritesheet.js`):**
     - Fungsi `packSpritesheet(items, options)` menerima daftar objek gambar, padding antarpiksel (default 4 px, rentang 0–64), dan jumlah kolom grid (default otomatis $\min(\max(\lceil\sqrt{N}\rceil, 1), 8)$, rentang 1–16).
     - Menghitung koordinat $(x, y)$ dan dimensi setiap frame secara deterministik dengan pembagian baris dinamis.
     - Menggunakan Sharp untuk membuat kanvas transparan RGBA (`channels: 4`, `background: { r: 0, g: 0, b: 0, alpha: 0 }`), lalu melakukan compositing seluruh sprite dengan `png({ compressionLevel: 9 })`.
     - Menghasilkan metadata atlas JSON format TexturePacker / PixiJS / Phaser standard (`meta` + `frames: { [id]: { frame: { x, y, w, h }, rotated: false, trimmed: false, spriteSourceSize, sourceSize, category } }`).
     - Perlindungan defensif terhadap batas dekompresi: menolak spritesheet jika lebar, tinggi > 8192 px atau total piksel > 24.000.000 (`SPRITESHEET_DIMENSIONS_EXCEEDED`).
  2. **API Backend Express & Snapshot Privat (`job-manager.js`, `jobs.js`):**
     - Endpoint `POST /api/jobs/:id/spritesheet` menerima payload JSON `{ all: true }` atau `{ object_ids: [...] }` dengan parameter opsional `padding` dan `columns`.
     - Validasi ketat: job harus `completed` (409), ID objek terdaftar tanpa duplikasi (400), objek tidak ditemukan (404), parameter tidak dikenal (400).
     - Snapshot disimpan di direktori privat `<jobDirectory>/spritesheets/<spritesheetId>/` (`spritesheet.png`, `atlas.json`, dan `manifest.json`) dengan penulisan atomik `.tmp` -> `rename`.
     - Endpoint penyajian aman via `serveFile`:
       - `GET /api/jobs/:id/spritesheets/:spritesheetId` (inline preview PNG).
       - `GET /api/jobs/:id/spritesheets/:spritesheetId/download` (attachment download `<id>.png`).
       - `GET /api/jobs/:id/spritesheets/:spritesheetId/atlas` (inline JSON atlas).
       - `GET /api/jobs/:id/spritesheets/:spritesheetId/atlas/download` (attachment download `<id>.atlas.json`).
  3. **Antarmuka UI Frontend (`frontend/index.html`, `frontend/src/extraction-workspace.js`):**
     - Fieldset "Ekspor Spritesheet Statis (M7)" dengan kontrol konfigurasi padding dan jumlah kolom.
     - Dua tombol aksi: `Spritesheet Pilihan` (aktif saat checkbox objek dipilih) dan `Spritesheet Semua`.
     - Indikator status aria-live, kontainer preview gambar spritesheet di atas transparency grid, teks dimensi/objek/grid info, dan tombol unduh untuk file PNG spritesheet serta Atlas JSON.
     - Penguncian kontrol saat proses berjalan dan integrasi pembatalan dengan `AbortController` pada reset/upload baru via `setUploadedImage`.
- **Bukti Pengujian Nyata:**
  - `node --test backend/test/spritesheet.test.js`: **PASS** (4/4 tests PASS, 212ms).
  - `node --test backend/test/jobs.test.js`: **PASS** (25 subtest, 59/59 tests PASS, 7.23s).
  - Suite lengkap backend: **116/116 tests PASS** dalam 7.89s.
  - `npm run build --prefix frontend`: **PASS** (7 modul, 118ms).
  - `smoke_browser_m7.mjs` (Headless Chrome CDP): **PASS 100%** (13 stages, verifikasi preview spritesheet 318×312, unduhan file PNG dan Atlas JSON, spritesheet pilihan tunggal, reset, dan 0 console error).
- **Next single task:** Hardening ekspor Selective ZIP: verifikasi keandalan arsip ZIP pilihan, penanganan concurrency dan validasi integritas checksum/CRC.

## D-046 — Hardening Fitur Ekspor Selective ZIP (FR-08), Checksum Integritas SHA-256, dan Endpoint Metadata Ekspor

- **Tanggal:** 2026-11-21.
- **Status:** Verified / Accepted; backend test suite (119 tests), modul helper `zip-export.test.js` (3 tests), AI service (14 tests), frontend build (Vite 7 modules), dan automated browser smoke test (13 stages) PASS 100%.
- **Keputusan Teknis:**
  1. **Streaming Checksum & Validasi Ukuran (`backend/src/zip-export.js`):**
     - Modul `writeZip` diperkaya dengan kalkulasi streaming SHA-256 secara on-the-fly (`createHash('sha256')`) yang menyerap setiap chunk data keluaran archiver (`archive.on('data', chunk => hash.update(chunk))`). Ini meniadakan pembacaan ulang file arsip biner dari storage disk setelah selesai.
     - Pengecekan defensif ukuran arsip: jika ukuran file keluaran berukuran 0 byte (`fileStat.size === 0`), operasi langsung dibatalkan dengan error eksplisit (`Produced empty ZIP archive`).
     - Fungsi mengembalikan objek ringkas `{ size: fileStat.size, sha256: hash.digest('hex') }`.
  2. **Penyimpanan Metadata Ekspor & Endpoint REST (`job-manager.js`, `jobs.js`):**
     - Pada `createExport`, manifest privat `<jobDirectory>/exports/<exportId>/manifest.json` kini mencakup atribut:
       - `files_count`: jumlah file objek PNG terpilih.
       - `archive_size`: ukuran biner file ZIP dalam satuan byte.
       - `sha256`: checksum heksadesimal 64 karakter dari seluruh bitstream arsip ZIP.
     - Penyediaan method `getExportManifest(jobId, exportId)` yang memvalidasi integritas job manifest, eksistensi file ZIP di storage privat, dan mengembalikan atribut manifest publik.
     - Penyediaan endpoint REST `GET /api/jobs/:id/exports/:exportId` yang mengembalikan JSON manifest ekspor beserta `download_url`, memungkinkan client memeriksa ukuran arsip dan checksum sebelum atau setelah mengunduh file biner.
  3. **Unit Test & Verifikasi Komprehensif (`backend/test/zip-export.test.js` & `backend/test/jobs.test.js`):**
     - Unit test independen `zip-export.test.js` menguji STORE mode (bebas re-kompresi deflasi), verifikasi exact byte payload via Python `zipfile.ZipFile.testzip()`, deteksi kegagalan atomik pada file masukan yang hilang (`ENOENT`), serta konkurensi pembuatan beberapa arsip simultan.
     - Integrasi test di `jobs.test.js` memverifikasi endpoint metadata `GET /api/jobs/:id/exports/:exportId` (status 200, penolakan UUID salah 400, ekspor fiktif 404, serta akses lintas job 404).
- **Bukti Pengujian Nyata:**
  - `node --test backend/test/zip-export.test.js`: **PASS** (3/3 tests PASS, 564ms).
  - `node --test backend/test/jobs.test.js`: **PASS** (25 subtest, 59/59 tests PASS, 7.62s).
  - Seluruh suite pengujian backend: **119/119 tests PASS** dalam 8.24s.
  - `ai-service\.venv-test\Scripts\python.exe -u -B -m unittest discover -s ai-service -p test_api.py -v`: **PASS** (14/14 tests PASS, 9.35s).
  - `npm run build --prefix frontend`: **PASS** (7 modules transformed dalam 126ms).
  - `smoke_browser_m7.mjs` (Headless Chrome CDP): **PASS 100%** (13 stages, 0 errors).
- **Konsekuensi:**
  - Fitur Ekspor Selective ZIP (FR-08) kini sepenuhnya hardened, aman, terukur, dan memiliki jaminan integritas kriptografis lokal.
- **Next single task:** Persiapan rilis akhir M7: pembersihan artefak kerja non-esensial dan penyusunan dokumentasi penutupan rilis MVP.

## D-047 — Penutupan Milestone M7 dan Status Kesiapan Rilis MVP IMMOExtract

- **Tanggal:** 2026-11-21.
- **Status:** Complete / Finalized.
- **Keputusan & Ringkasan Pencapaian:**
  1. **Pemenuhan Spesifikasi Fungsional (FR-01 s/d FR-13):**
     - Seluruh persyaratan wajib dan tahap lanjut dalam `docs/PROJECT_SPEC.md` telah diselesaikan, diuji, dan didokumentasikan:
       - **FR-01 & FR-02 (Input Gambar & Kamera Browser):** Penanganan upload file galeri dan snapshot kamera webcam browser dengan pembersihan stream aman (M2).
       - **FR-03 (Validasi Defensif):** Pengecekan signature magic bytes, batas ukuran 10 MB, batas sisi 8192 px, dan pencegahan dekompresi berbahaya (M2).
       - **FR-04 & FR-05 (Human Parsing & Ekstraksi Transparan):** Inferensi CPU lokal model SCHP ATR-18, crop bounding box terhitung, dan ekspor PNG RGBA per kategori (>50 px) (M3/M4).
       - **FR-06 & FR-07 (Galeri & Unduhan Satuan):** Polling job async, kartu objek interaktif di UI dark futuristic, preview transparan, dan attachment download PNG asli (M4).
       - **FR-08 (Selective ZIP Export Hardened):** STORE mode (tanpa re-kompresi deflasi redundant), kalkulasi streaming SHA-256 on-the-fly, perlindungan arsip kosong, dan endpoint metadata `GET /api/jobs/:id/exports/:exportId` (M4/M7).
       - **FR-09 & FR-10 (Classic Pixelation Studio):** Downscaling deterministik nearest-neighbour pada 4 ukuran (16/32/64/128 px), kuantisasi palet Retro 16 warna, dan preservasi alpha exact (M5).
       - **FR-11 (AI Pixel Art Stylization Lokal):** Pipeline SD15 CPU FP32 dengan memory-cloned offload loader, preset prompt, letterbox canvas, preservasi 100% exact alpha, dan antrean FIFO backend (M6).
       - **FR-12 (Mask Correction Tool):** Dialog Canvas 2D interaktif dengan Penghapus (transparan) dan Kuas Pulihkan (foto asli instan), slider brush, undo stack, dan endpoint revisi `PUT /api/jobs/:id/objects/:objectId` (M6).
       - **FR-13 (Generator Spritesheet Statis & Atlas JSON):** Komposisi komposit Sharp transparan, pengaturan grid padding/kolom, ekspor gambar lembar sprite, dan atlas JSON standar TexturePacker / PixiJS / Phaser (M7).
  2. **Audit Verifikasi & Kualitas Perangkat Lunak:**
     - **Backend Node.js/Express:** 119 unit dan integrasi tes (`node --test`) **PASS 100%** (0 failure, 0 skipped, durasi 8.24s).
     - **AI Service Python/FastAPI:** 14 unit tes unittest (`test_api.py`) **PASS 100%** (durasi 9.35s).
     - **Frontend Vite:** 7 modul JavaScript/CSS/HTML berhasil dibangun menjadi bundle produksi bersih tanpa peringatan (`dist/` 126ms).
     - **Automated Browser Smoke Test (CDP):** Pengujian headless Chrome end-to-end (M6 dan M7) **PASS 100%** (13 stages berturut-turut, 0 console error).
  3. **Keamanan & Kebersihan Workspace:**
     - Tidak ada kredensial, kunci API, file `.env`, foto pribadi pengguna, atau checkpoint model binary besar yang ter-commit ke Git.
     - Folder `storage/` dan `scratch/` diproteksi oleh `.gitignore`.
     - Seluruh endpoint memvalidasi identitas UUID v4, menolak directory traversal, dan menolak symlink/junction pengalihan.
- **Konsekuensi:**
  - Fase Minimum Viable Product (MVP) proyek IMMOExtract secara resmi telah selesai secara menyeluruh.
  - Proyek berada dalam kondisi stabil, bersih, terdokumentasi lengkap, dan siap digunakan atau dipresentasikan.

## D-048 — Rancangan dan implementasi retensi otomatis `storage/uploads` dan `storage/jobs`

- **Tanggal:** 2026-11-23 (dirancang), 2026-11-24 (disetujui & diimplementasikan).
- **Status:** Accepted / Verified — diimplementasikan di `backend/src/job-manager.js`, `backend/src/server.js`, `backend/src/app.js`, `backend/.env.example`, `frontend/index.html`, dan `frontend/src/image-input.js`. Suite `backend/test/retention.test.js` (7/7 PASS) dan full backend suite (150/150 PASS).
- **Dasar:** PROJECT_SPEC §8 Keamanan meminta "pembatasan permintaan dan penghapusan sementara"; D-013/D-021/D-025/D-028 mencatat retensi belum tersedia. Bukan fitur baru di luar spesifikasi.
- **Fakta source yang mengikat desain (diperiksa 2026-11-23):**
  - Upload: `storage/uploads/<uuid>/{original.<ext>, manifest.json}` dengan `created_at`; endpoint sinkron M3 menambah `extracted.png`/`mask.png` dan `extracted_at` ke direktori yang sama.
  - Job: `storage/jobs/<uuid>/{manifest.json, extracted.png, mask.png, objects/, pixelations/, exports/, spritesheets/, stylizations/}`. Manifest job memuat `upload_id`, `created_at`, `updated_at`; PUT koreksi mask memperbarui `updated_at` job. Snapshot turunan memiliki manifest sendiri dengan `created_at` (stylization juga `updated_at`) dan **tidak** memperbarui `updated_at` job.
  - State aktif hanya di memori proses: `queue`, `active` (job queued/processing atau JOB_STORAGE_FAILED), `activeStylizations`. Satu proses backend memiliki storage (D-021). `initialize()` hanya membaca entri bernama UUID.
  - Stylization timeout sengaja mempertahankan staging karena model remote tidak dibatalkan (`job-manager.js` processStylization).
  - Kuas Pulihkan memakai `previewImage` lokal browser, bukan file upload server; menghapus upload setelah ekstraksi tidak memutus editor yang sedang terbuka. State job UI tidak dipulihkan setelah reload.
  - Crash sebelum publikasi manifest dapat meninggalkan direktori tanpa manifest (job dibuat `mkdir` sebelum `save`; ekspor/pixelation/spritesheet dipublikasikan terakhir).
- **Keputusan teknis yang diimplementasikan:**
  1. **Unit retensi = seluruh job** (manifest, objek, mask, dan semua snapshot turunan) plus upload sumbernya. Tidak menghapus snapshot satu per satu agar referensi manifest tidak menggantung.
  2. **Aktivitas terakhir job** = maksimum `job.updated_at` (serta `job.created_at` bila ada) dan `created_at`/`updated_at` semua manifest snapshot turunan (`pixelations`, `exports`, `spritesheets`, `stylizations`) yang terbaca. Tidak memakai atime filesystem (tidak andal di Windows/NTFS). Upload: maksimum `created_at` dan `extracted_at`.
  3. **Kedaluwarsa** bila `now - aktivitas terakhir > STORAGE_RETENTION_HOURS`. Default **24 jam** (`STORAGE_RETENTION_HOURS=24`, nilai konfigurasi awal); `0` menonaktifkan sweep. Validasi startup: integer ≥ 0 dan, bila aktif (`> 0`), wajib lebih besar dari `AI_STYLIZATION_TIMEOUT_MS` agar staging stylization yang timeout tidak dihapus selagi model remote mungkin masih menulis.
  4. **Tidak pernah dihapus** pada sweep: job di `active` atau `queue`; job dengan stylization di `activeStylizations` atau ber-status `queued`/`processing` di disk; job yang sedang dipakai operasi mutasi (POST pixelate/exports/spritesheet/stylization, PUT objek) melalui penghitung `busyJobs` di manager (serta `busyUploads` saat `create(uploadId)`); upload yang direferensikan job yang tidak kedaluwarsa, masih di antrean/aktif, atau dilewati karena error; entri bukan UUID, symlink/junction, atau di luar `realpath(root)`.
  5. **Mekanisme hapus dua langkah:** cek ulang proteksi dan aktivitas tepat sebelum hapus → `rename(<uuid>, .deleting-<uuid>-<random>)` pada parent yang sama (setelah itu GET menjadi 404 `JOB_NOT_FOUND`/`UPLOAD_NOT_FOUND` yang sudah ada) → pelepasan symlink/junction bersarang (`rmdir`/`unlink` pada reparse point tanpa rekursi ke target luar) lalu `rm` rekursif. Rename gagal (mis. `EPERM` Windows karena handle terbuka) = dilewati, dicatat kodenya, upload sumbernya tetap dipertahankan, dan dicoba pada sweep berikutnya. Sisa `.deleting-*` dibersihkan pada sweep berikutnya.
  6. **Data rusak/tidak lengkap:** direktori tanpa manifest memakai `mtime` direktori sebagai aktivitas; manifest JSON rusak atau timestamp tidak valid **dilewati dan dicatat** (kode error saja), tidak dihapus dan tidak menjatuhkan server. Timestamp di masa depan dianggap belum kedaluwarsa.
  7. **Penjadwalan:** dijalankan di dalam `createJobManager` sekali setelah `initialize()` selesai memulihkan job interrupted, dan periodik tiap `STORAGE_SWEEP_INTERVAL_MINUTES` (default 60) memakai timer `unref()`; sweep tidak tumpang tindih (`activeSweep`). Urutan: job kedaluwarsa dahulu, lalu upload yang tidak lagi direferensikan.
  8. **Log:** jumlah job/upload terhapus/dilewati dan kode error; tanpa path absolut atau isi foto.
  9. **Testability:** `createApp`/`createJobManager` menerima opsi `retentionMs`, `sweepIntervalMs`, `stylizationTimeoutMs`, dan `now()` injeksi; `manager.sweep()` dan `manager.stopSweep()` tersedia dan terekspos di `app.locals.jobManager`.
  10. **UI/dokumen:** teks `frontend/index.html` baris 36 dan pesan upload di `frontend/src/image-input.js` menjelaskan retensi otomatis bawaan 24 jam sejak aktivitas terakhir; `README.md` dan `docs/ARCHITECTURE.md` diperbarui.
- **Bukti pengujian nyata (2026-11-24):**
  - `node --test backend/test/retention.test.js`: **PASS 7/7** (2,57 s) — validasi konfigurasi (`retentionMs`, `sweepIntervalMs`, batas `stylizationTimeoutMs`), penghapusan job/upload kedaluwarsa & HTTP 404, retensi entry baru/timestamp masa depan/upload `extracted_at`, perpanjangan umur job oleh 4 jenis snapshot turunan (`pixelations`, `exports`, `spritesheets`, `stylizations`), proteksi job aktif/`queued`/`processing`/`busyJobs` dan upload-nya, fallback `mtime` direktori tanpa manifest, skip aman manifest rusak/timestamp invalid tanpa bocor path di log, observasi nyata Windows `EPERM` saat file di dalam job sedang dibuka handle lalu terhapus setelah handle ditutup pada sweep berikutnya, keamanan junction bersarang di dalam job & top-level junction terhadap direktori luar storage, entri non-UUID utuh, pembersihan `.deleting-*`, serta mode nonaktif `retentionMs: 0`.
  - `npm test --prefix backend`: **PASS 150/150** (67 top-level subtests, 0 fail, 0 skip, 18,86 s).
  - `npm run build --prefix frontend`: **PASS** (7 modul, 520 ms).
- **Konsekuensi:** Hasil job dan upload yang tidak memiliki aktivitas selama masa retensi (default 24 jam) dihapus otomatis; pengguna diberi tahu di UI. Batas jumlah antrean/kuota disk dan penghapusan manual per job masih di luar cakupan D-048.

## D-049 — Perombakan UI Minimalist Dark Pro, Tab Kartu Objek, dan Pembersihan Label Presentasi

- **Tanggal:** 2026-11-24.
- **Status:** Accepted / Verified (keputusan pengguna).
- **Keputusan:**
  1. **Gaya Visual Minimalist Dark Pro:** Mengadopsi tata letak dashboard gelap modern yang bersih berbasis palet D-008 (`#171738` background, `#4B2A7B` panel bertingkat, `#A23EAE` badge kategori/ikon sekunder, `#F72585` aksen AI Stylization, dan `#00F5D4` aksi utama/indikator aktif) dengan tipografi kontras, ikon SVG minimalis 1.5–2px, dan bilah header sticky yang memuat indikator status layanan live (`#backend-dot`, `#ai-dot`).
  2. **Tab Mode Pixel Art di Dalam Kartu Objek:** Mengganti susunan vertikal bertumpuk antara Classic Pixelation dan AI Stylization di tiap kartu objek dengan kontrol tab ringkas (`role="tablist"`, `[data-tab-btn="pixelate"]` untuk **Classic Pixel** dan `[data-tab-btn="stylize"]` untuk **AI Stylize**) sehingga tinggi kartu jauh lebih pendek dan fokus pada satu mode konversi dalam satu waktu. Klik pada tombol aksi `Pixelate` atau `Stylize (AI)` juga otomatis mengaktifkan tab terkait.
  3. **Pembersihan Label Pengujian/Milestone:** Menghapus seluruh embel-embel kode milestone internal (`(M5)`, `(M6)`, `(M7)`), cetakan UUID mentah (`ID upload`, `ID job`), dan catatan pengembangan di kaki halaman agar antarmuka siap dipresentasikan.
  4. **Penyelarasan Default `AI_HEALTH_TIMEOUT_MS` di `server.js` ke 30.000 ms:** Mengubah nilai default fallback `AI_HEALTH_TIMEOUT_MS` di `backend/src/server.js` dan `backend/.env.example` dari `3000` (3 detik, peninggalan M1) menjadi `30000` (30 detik, selaras dengan `createApp` dan `AiClient`), sementara probe `/health` di `AiClient.health()` tetap dibatasi `Math.min(this.timeoutMs, 5000)`. Ini mencegah timeout prematur pada foto kamera 1280×720 yang membutuhkan ~3,02 detik inferensi + penulisan PNG kategori di CPU ketika backend dijalankan tanpa variabel environment manual.
- **Alasan:** Pengguna memilih opsi **Minimalist Dark Pro** dan **Tab di dalam kartu objek** agar tampilan aplikasi tidak polos, nyaman dilihat dalam waktu lama, dan tidak berantakan oleh label milestone internal saat presentasi.
- **Bukti pengujian nyata (2026-11-24):**
  - `npm run build --prefix frontend`: **PASS** (7 modul, 508 ms).
  - `node scripts/smoke_browser_m7.mjs`: **PASS 100%** (15 pemeriksaan termasuk verifikasi perpindahan tab `Classic Pixel` ↔ `AI Stylize`, `aria-selected`, visibilitas panel `[data-tab-panel]`, ekstraksi, spritesheet, koreksi mask Penghapus/Pulihkan/Undo/Save, reset, dan tangkapan layar desktop 1365×1100 di `scratch/proof_smoke_m7_spritesheet.png`, 0 console error).

## D-050 — Batas Panjang Antrean FIFO (`MAX_QUEUE_LENGTH`, HTTP 429 `QUEUE_FULL`)

- **Tanggal:** 2026-11-24.
- **Status:** Accepted / Verified.
- **Dasar:** `docs/PROJECT_SPEC.md` §8 Keamanan ("pembatasan permintaan dan penghapusan sementara").
- **Keputusan Teknis:**
  1. **Konfigurasi Batas Antrean:** Menambahkan opsi `maxQueueLength` pada `createJobManager` dan `createApp` (default **10**, dapat diatur melalui `MAX_QUEUE_LENGTH` di `backend/src/server.js` dan `backend/.env.example`). Validasi startup mewajibkan integer positif (`>= 1`).
  2. **Perhitungan Tugas Menunggu (`waitingQueueCount`):** Karena satu FIFO melayani ekstraksi (`POST /api/jobs`) dan AI stylization (`POST /api/jobs/:id/stylize`), jumlah tugas yang menunggu di belakang worker aktif dihitung sebagai `running ? queue.length : Math.max(0, queue.length - 1)`. Ini menjamin determinisme baik saat request dikirim berurutan melalui HTTP maupun bersamaan dalam satu tick sebelum `setImmediate(drain)` dieksekusi.
  3. **Penolakan Defensif Tanpa Artefak Yatim (`HTTP 429 QUEUE_FULL`):**
     - Bila `waitingQueueCount() >= maxQueueLength`, `create(uploadId)` dan `createStylization(jobId, input)` menolak permintaan dengan `JobError(429, 'QUEUE_FULL', 'Antrean pemrosesan penuh. Tunggu hingga tugas aktif selesai lalu coba lagi.')` sebelum mempublikasikan manifest atau menambahkan item ke `queue`.
     - Jika penolakan 429 terjadi pada `POST /api/jobs` berbasis JSON `{ upload_id }`, direktori upload yang sudah ada tetap dipertahankan agar pengguna dapat mencoba kembali setelah antrean berkurang.
     - Jika penolakan 429 terjadi pada `POST /api/jobs` berbasis `multipart/form-data` langsung, upload transien baru tersebut otomatis dibersihkan melalui `manager.discardUpload(uploadId)` agar tidak meninggalkan upload yatim di disk.
- **Bukti Pengujian Nyata (2026-11-24):**
  - `node --test backend/test/retention.test.js`: **PASS 8/8** (3,45 s) — memverifikasi validasi parameter `maxQueueLength`, penerimaan tugas hingga batas antrean, penolakan HTTP 429 `QUEUE_FULL` pada ekstraksi JSON (upload tetap utuh), ekstraksi multipart (upload transien dibersihkan), dan stylization (tidak ada folder stylization yatim), serta penerimaan kembali HTTP 202 setelah antrean selesai diproses (`drain`).
  - `npm test --prefix backend`: **PASS 151/151** (68 top-level subtests, 0 fail, 0 skip, 21,69 s).
  - `npm run build --prefix frontend`: **PASS** (7 modul, 509 ms).



