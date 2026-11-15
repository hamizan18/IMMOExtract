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

## Keputusan yang masih terbuka

- [ ] Versi runtime dan dependensi AI M3 setelah tes kompatibilitas (web/health M1 sudah diputuskan pada D-010).
- [ ] Lisensi model/checkpoint tertentu sebelum distribusi.
- [ ] Desain transport dan manifest hasil FastAPI ↔ Express.
- [ ] Batas performa input dan retensi file sementara setelah benchmark.
- [ ] Model image-to-image lokal, kebutuhan GPU, dan preset AI stylization.
- [ ] Strategi koreksi mask (brush/click/box) dan hasil pengujian.

**Format entri baru:** `D-011 — [judul]`, `Tanggal`, `Status`, `Keputusan`, `Alasan`, `Alternatif`, `Konsekuensi`, `Bukti tes` (jika ada).
