# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** baca `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `PROGRESS.md`, lalu periksa keadaan repo. Ini bukan aplikasi yang dinyatakan selesai.

## Last agent

OMP — penerimaan kamera fisik dan penutupan M2, 2026-11-16.

## Current milestone

**M2 — Input gambar — Complete pada Windows/Chrome yang diuji.** M1 selesai; file/kamera fisik → preview → upload server terverifikasi. M3 belum dimulai.

## Last completed task

Uji kamera fisik dengan izin pengguna: Chrome 158, PC Camera USB, capture PNG 1280×720 (1.411.950 byte), preview terdecode, upload HTTP 201 dan ID tampil. Satu track video tanpa audio; setelah capture track ended dan `video.srcObject` null. Tidak ada injeksi stream/fake-device atau perubahan source. Default browser awal memilih REDMI Windows Virtual Camera; hasil awal dicatat terpisah, lalu kamera USB dipilih di pengaturan profil uji setelah izin capture tambahan.

## Current task

Penerimaan kamera fisik selesai dan M2 ditutup. Berikutnya: pemeriksaan kesiapan POC M3 tanpa instalasi/download model.

## Working components

- Input file, preview, upload otomatis, validasi server, dan feedback error/sukses sudah teruji pada tugas sebelumnya.
- Kamera fisik PC Camera pada Windows/Chrome 158 terverifikasi sesi ini, termasuk preview/upload dan penghentian stream.
- Express `POST /api/uploads`: multipart field `image`, respons HTTP 201 `{upload_id, status: "uploaded", image}`; input/manifest privat, bukan job ekstraksi.
- Pengujian memakai Vite 5174 → Express 3100, folder upload temp, dan profil Chrome temp. Port normal tetap 5173 → 3000.
- FastAPI/model tidak dijalankan pada tugas penerimaan ini; tidak ada pipeline ekstraksi.
- Browser dan seluruh layanan uji dihentikan; kedua foto uji serta profil browser temp dihapus. Profil browser utama dan storage pengguna tidak diubah.
- Keberlangsungan proses lintas sesi tidak dijamin; bila endpoint tidak tersedia, jalankan layanan dari terminal pengguna sesuai README.

## Modified files

- Tugas ini: `README.md`, `docs/DECISIONS.md` (tambahan bukti D-013, tanpa keputusan baru), `docs/PROGRESS.md`, `docs/HANDOFF.md`.
- Source aplikasi, dependensi, dan konfigurasi repo tidak diubah.
- Perubahan frontend dari tugas sebelumnya tetap dipertahankan: `frontend/index.html`, `frontend/src/image-input.js`.

## Uncommitted changes / Git status

Inspeksi awal menunjukkan enam file modified: README, DECISIONS, PROGRESS, HANDOFF, frontend/index.html, frontend/src/image-input.js; staged diff kosong. Empat dokumen diperbarui tugas ini, dua source frontend tidak disentuh. Tidak melakukan staging/commit atau inspeksi Git ulang setelah edit.

## Current errors

Tidak ada kegagalan aplikasi pada pengujian kamera fisik. Harness sempat tetap berada di halaman settings sehingga `#clear-image` tidak ditemukan; navigasi eksplisit ke aplikasi memperbaikinya tanpa perubahan kode. Browser dapat memilih kamera virtual secara default; pilih kamera fisik melalui settings jika diperlukan. Kamera mobile, perpindahan tab non-headless, dan dialog izin manual OS/browser belum diuji. Retensi/penghapusan otomatis upload server belum tersedia.

## Tests performed

- **PASS:** PowerShell enumerasi perangkat: PC Camera berstatus OK.
- **EXIT 1 (discovery):** pencarian proses chrome/msedge mengembalikan path Chrome; bukan hasil tes aplikasi.
- **PASS terbatas:** capture awal REDMI Windows Virtual Camera → PNG 1280×720 → HTTP 201 → track ended. Tidak dianggap bukti kamera USB.
- **ERROR harness, resolved:** selector `#clear-image` tidak ditemukan karena tab masih di settings; navigasi kembali ke aplikasi sebelum capture fisik.
- **PASS:** Chrome 158 pada Windows, profil terisolasi tanpa fake-device/injeksi: PC Camera USB → frame live 1280×720, hanya video → tombol Ambil foto → PNG 1.411.950 byte → HTTP 201.
- **PASS:** UI menampilkan ID upload `8379ad08-8578-4940-a9df-05fd173aabfc`; preview terlihat dan terdecode; track kamera ended dan srcObject null sesudah capture.
- **PASS:** layanan/profil browser uji dihentikan; kedua foto/manifest dan profil temp dihapus dengan izin pengguna. Tidak melampirkan foto ke percakapan.
- **NOT RUN:** build/suite backend pada tugas ini (tidak ada perubahan source), kamera mobile, background tab non-headless, dialog izin manual. Permission browser diberikan lewat automation setelah persetujuan pengguna.
- Bukti integrasi sebelumnya (build, tiga format, error/offline, race, MIME kosong, kamera sintetis/mobile viewport) dan backend 24/24 tetap tersimpan di `PROGRESS.md`; tidak diulang untuk tugas ini.

## Next action (only one)

**Periksa kesiapan POC M3:** inventaris hardware/runtime lokal dan prasyarat kompatibilitas/lisensi kandidat SCHP ATR-18. Laporkan pilihan serta kendala sebelum instalasi atau download checkpoint besar; jangan download model tanpa izin pengguna. M3 belum diimplementasikan.

## Handoff rules

1. Jangan langsung membuat ulang folder/berkas yang ternyata sudah ada; inspeksi dulu.
2. Jangan menghapus perubahan agent sebelumnya atau melakukan reset destruktif.
3. Ubah file sesedikit mungkin dan kerjakan satu milestone pada satu waktu.
4. Tulis semua hasil tes yang benar-benar dieksekusi.
5. Sebelum berpindah AI, perbarui bagian ini dengan **status terkini**, file berubah, test, error, dan next action.
6. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.

## Template perbaruan berikutnya

Saat milestone mulai dikerjakan, ganti isi `Last completed task`, `Working components`, `Modified files`, `Git status`, `Tests performed`, dan `Next action` dengan fakta terbaru. Jangan menumpuk log percakapan panjang di sini.
