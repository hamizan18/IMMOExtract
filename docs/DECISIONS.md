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
- [ ] Batas performa input dan retensi file sementara setelah benchmark.
- [ ] Model image-to-image lokal, kebutuhan GPU, dan preset AI stylization (M6).
- [ ] Strategi koreksi mask (brush/click/box) dan hasil pengujian (M6).

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

**Format entri baru:** `D-029 — [judul]`, `Tanggal`, `Status`, `Keputusan`, `Alasan`, `Alternatif`, `Konsekuensi`, `Bukti tes` (jika ada).
