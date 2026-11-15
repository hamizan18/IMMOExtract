# IMMOExtract — Project Specification

> **Status:** Spesifikasi awal disepakati; implementasi belum diverifikasi.  
> **Judul:** IMMOExtract: Sistem Cerdas untuk Ekstraksi Objek dan Konversi Citra Digital Menjadi Aset Pixel Art  
> **Tagline:** Extract. Transform. Create.

## 1. Ringkasan

IMMOExtract adalah aplikasi web responsif yang menerima foto dari kamera atau perangkat pengguna, menganalisis **satu manusia sebagai fokus utama beserta pakaian/aksesori yang terlihat**, dan mengeluarkan tiap objek yang dapat dikenali sebagai **PNG transparan**. Pengguna dapat melihat hasil, mengunduh satu/beberapa/semua objek, atau mengolah hasil melalui **Classic Pixelation** maupun **AI Pixel Art Stylization**. Pemrosesan AI dijalankan **secara lokal**, bukan melalui API AI cloud.

**Tujuan inti:** membantu desainer dan pengembang game membuat bahan aset 2D statis dari foto. Hasil tidak otomatis menjadi sprite animasi atau model 3D.

## 2. Pengguna dan platform

- Sasaran: game developer indie, pixel artist, desainer, mahasiswa.
- Platform: browser desktop dan mobile modern.
- Input: unggah JPG/JPEG, PNG, WebP; kamera dengan izin pengguna (browser meminta HTTPS atau localhost).
- MVP: tanpa login, tanpa layanan cloud, tanpa database wajib.
- Bahasa antarmuka awal: Bahasa Indonesia; istilah teknis boleh memakai bahasa Inggris yang konsisten.

## 3. Cakupan objek

Target awal: manusia utuh; topi; kacamata; pakaian atas (kaos/kemeja/jaket jika model membedakannya); celana; rok; gaun; sepatu kiri/kanan; tas; syal **jika label/model mendukung**. Jangan menjanjikan semua kategori terdeteksi pada setiap foto.

- MVP memproses satu orang utama dalam satu foto; foto banyak orang ditunda.
- **Semantic human parsing** mengklasifikasikan piksel menurut bagian/kategori, bukan otomatis memisahkan dua objek identik sebagai instance berbeda.
- Objek tersembunyi/tertutup tidak dapat diekstrak secara utuh dari informasi yang tidak tampak.
- Objek yang gagal terdeteksi **tidak boleh dibuat-buat** sebagai hasil ekstraksi.
- PNG asli mempertahankan piksel objek yang terlihat; AI generatif boleh menginterpretasikan/merombak detail **hanya** dalam mode stylization dan harus diberi label jelas.

## 4. Alur utama pengguna

1. Masuk halaman utama lalu pilih **Upload** atau **Ambil Foto**.
2. Aplikasi memvalidasi file dan menampilkan preview input.
3. Pengguna menekan **Extract Objects**.
4. Sistem membuat job (queued → processing → completed/failed), mengerjakan parsing lokal dan membuat mask.
5. Mask digunakan untuk mengekstrak objek yang dikenali ke PNG transparan; aplikasi menampilkan kartu preview per objek.
6. Pengguna dapat **Download** satu objek, **Download Selected**, atau **Download All** dalam ZIP.
7. Secara opsional pengguna masuk ke **Pixel Art Studio** dan memilih objek/hasil yang tersedia untuk diproses.
8. Pengguna memilih **Classic Pixelation** atau **AI Stylization** (ketika fase lanjut tersedia), meninjau preview, lalu mengunduh.

**Aturan penting:** proses mengunduh hasil ekstraksi asli tidak bergantung pada konversi pixel art.

## 5. Functional requirements

| ID | Requirement | Prioritas / target fase |
| --- | --- | --- |
| FR-01 | Upload JPG/PNG/WebP dan preview input | Wajib, M2 |
| FR-02 | Ambil gambar kamera browser dengan permission | Wajib, M2 |
| FR-03 | Validasi format, ukuran dan dimensi gambar | Wajib, M2 |
| FR-04 | Parsing manusia/pakaian dengan model lokal | Wajib, M3 |
| FR-05 | Mask + crop ke PNG transparan | Wajib, M3 |
| FR-06 | Preview objek, label, dan status job | Wajib, M4 |
| FR-07 | Unduh satu file PNG | Wajib, M4 |
| FR-08 | Unduh beberapa/semua objek sebagai ZIP | Wajib, M4/M7 |
| FR-09 | Classic Pixelation: 16/32/64/128, nearest-neighbour | Wajib, M5 |
| FR-10 | Palet warna terbatas dan alpha tetap terjaga | Wajib, M5 (jika layak) |
| FR-11 | AI Pixel Art Stylization lokal | Tahap lanjut, M6 |
| FR-12 | Koreksi mask/manual selection | Tahap lanjut, M6 |
| FR-13 | Ekspor spritesheet **statis** | Tahap lanjut, M7 |
| FR-14 | Banyak manusia / instance kompleks | Di luar MVP |

## 6. Pixel art: dua mode, dua jenis hasil

**Classic Pixelation (M5):** pengolahan deterministik, bukan generasi gambar. Resize ke grid rendah, opsional color quantization, preview dengan nearest-neighbour, ekspor PNG dengan transparansi. Tidak mengklaim membuat gambar yang digambar manual oleh pixel artist.

**AI Pixel Art Stylization (M6):** image-to-image dengan model yang dijalankan lokal; preset seperti Retro RPG/Item dapat diuji. Pilihan model/checkpoint, lisensi, akurasi detail, kebutuhan hardware, dan hasil alpha **belum diputuskan**. Jika tidak layak pada hardware tersedia, tampilkan keterangan fitur tidak tersedia; jangan berikan hasil palsu.

## 7. UI dan identitas visual

- Tema: Dark Futuristic Creative Workspace, fokus responsif dan aksesibilitas.
- `#171738` — latar utama.
- `#4B2A7B` — panel / permukaan kedua.
- `#A23EAE` — aksen/aksi sekunder.
- `#F72585` — highlight.
- `#00F5D4` — aksen identitas dominan & tombol utama, **bukan** warna isi seluruh layar.
- Gunakan putih/putih kebiruan untuk teks; pastikan kontras memadai.
- Halaman: Home/Upload; Extraction Workspace; Pixel Art Studio.
- Desktop: preview gambar dan daftar objek dapat dua kolom. Mobile: tumpuk vertikal.
- Tampilkan loading/job state, empty/error state, serta before/after saat konversi.

## 8. Non-functional requirements

- **Local-first:** model AI dipanggil dari server lokal; tidak memakai API AI eksternal.
- **Privasi:** hindari menampilkan path atau foto pengguna kepada pengguna lain; jangan commit foto/checkpoint.
- **Keamanan:** cek signature konten, MIME, ukuran, batas dimensi/dekompresi; sanitasi nama dan path; ID job sulit ditebak; hanya backend yang menyajikan hasil; pembatasan permintaan dan penghapusan sementara.
- **Awal konfigurasi:** ukuran unggahan maksimal 10 MB (dapat diubah); batas dimensi/piksel dan resize inferensi diuji sesuai hardware. Jangan anggap angka ini hasil benchmark.
- **Ketahanan:** error AI tidak menjatuhkan server; status job konsisten; timeout dan log jelas.
- **Efisiensi:** satu worker inferensi aktif sebagai awal, muat model sekali lalu reuse; hindari proses parallel CPU yang berlebihan.
- **Offline setelah setup:** seluruh dependensi dan checkpoint tersedia lokal. Pengunduhan awal boleh memerlukan internet, dengan persetujuan pengguna.
- **Portabilitas:** komponen terpisah, konfigurasi via `.env.example` (tanpa secret asli), penjelasan Windows dan Linux jika dibutuhkan.

## 9. Pengujian penerimaan minimum

1. Foto input valid diterima; file palsu / corrupt / terlalu besar ditolak dengan error jelas.
2. Input menghasilkan status job; selesai/failed bisa dipantau.
3. Pada foto yang memiliki kategori terdeteksi, aplikasi membuat PNG transparan untuk kategori tersebut.
4. Preview dan file unduhan sesuai, tanpa gambar background solid palsu.
5. ZIP berisi hanya hasil yang dipilih; unduhan tidak memaksa pixel art.
6. Classic Pixelation menghasilkan resolusi/palet sesuai pilihan, dan alpha tetap benar.
7. Bila AI generatif belum dipasang, mode itu ditandai belum tersedia, tidak disimulasikan sebagai fitur jadi.
8. Ekstraksi diuji pada foto polos/ramai, aksesori, dan occlusion; hasil keterbatasan model dicatat.

## 10. Tidak termasuk MVP

Login, cloud storage, database cloud, publikasi galeri, 3D, karakter animasi otomatis, rekonstruksi utuh bagian yang tersembunyi, serta deteksi semua objek umum di luar manusia/perlengkapannya.

## 11. Urutan pengembangan

Lihat `docs/PROGRESS.md` untuk status sebenarnya. Milestone M1 scaffold, M2 input, M3 AI proof of concept, M4 extraction dan download, M5 classic pixelation, M6 AI stylization dan mask correction, M7 testing/exports/release.

## 12. Aturan perubahan spesifikasi

Fitur baru dan perubahan cakupan harus dibahas, dicatat di `docs/DECISIONS.md`, baru dilaksanakan. Jangan menandai fitur complete tanpa hasil test nyata.
