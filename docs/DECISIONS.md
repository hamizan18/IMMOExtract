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

## Keputusan yang masih terbuka

- [ ] Versi runtime dan dependensi AI M3 setelah tes kompatibilitas (web/health M1 sudah diputuskan pada D-010).
- [ ] Lisensi model/checkpoint tertentu sebelum distribusi.
- [ ] Desain transport dan manifest hasil FastAPI ↔ Express.
- [ ] Batas performa input dan retensi file sementara setelah benchmark.
- [ ] Model image-to-image lokal, kebutuhan GPU, dan preset AI stylization.
- [ ] Strategi koreksi mask (brush/click/box) dan hasil pengujian.

**Format entri baru:** `D-014 — [judul]`, `Tanggal`, `Status`, `Keputusan`, `Alasan`, `Alternatif`, `Konsekuensi`, `Bukti tes` (jika ada).
