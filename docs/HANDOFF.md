# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** ikuti konteks `AGENTS.md` dan dokumen proyek. D-047 menutup implementasi M1–M7, tetapi verifikasi browser terbaru menemukan bug FR-12; jangan menyatakan semua acceptance criteria lulus.

## Last agent

OMP — verifikasi penerimaan alur inti melalui browser dengan SCHP nyata, 2026-11-22.

## Current milestone

M7 — penerimaan lokal setelah penutupan implementasi D-047. Tidak menambah fitur atau milestone baru. Satu temuan koreksi mask FR-12 masih terbuka.

## Last completed task

- Git awal/index bersih; source startup, wiring Express/frontend dan harness browser lama diperiksa. LSP tidak dikonfigurasi.
- Harness `scratch/smoke_browser_m7.mjs` menggunakan `mockAiClient`: hasil historisnya bukan bukti inferensi AI nyata.
- Uji terbaru memakai Vite source → Express → FastAPI/SCHP asli pada port 5174/3100/8010, gambar sintetis dari fungsi fixture `ai-service/test_extractor.py`, storage temporary di luar repo, dan browser headless.
- Upload/ekstraksi menghasilkan enam kartu: human, Hat, Upper-clothes, Pants, Left-shoe, Bag. Seluruh preview sumber terdecode. Ini bukti alur teknis, bukan kualitas segmentasi foto nyata.
- Unduhan PNG asli, ZIP pilihan, pixelation grid 32/Retro16, spritesheet semua dan atlas berhasil. Integritas ZIP dan piksel diuji secara independen dengan Python/Pillow.
- Mask drag, Undo, save dan PNG unduhan terkoreksi berhasil. Klik tunggal penghapus gagal mengubah alpha.
- Reset dan pemeriksaan console/runtime browser berhasil. Tab dan ketiga layanan dihentikan; fixture/storage temporary serta empat unduhan uji dibersihkan. Tidak menyentuh storage/foto pengguna.

## Current task

Verifikasi browser selesai dengan temuan terbuka. Tugas berikutnya hanya memperbaiki klik tunggal penghapus mask, bukan mengulang implementasi MVP.

## Working components — bukti sesi ini

- Upload/health/polling/ekstraksi SCHP nyata dan galeri enam objek.
- Unduhan native PNG foreground 360×480, 3.043 byte, memiliki alpha 0 dan 255.
- ZIP satu objek: 3.237 byte; isi tepat, CRC valid, byte PNG identik dan SHA-256 cocok endpoint metadata.
- Classic Pixelation: grid 32/Retro16 → 24×32, maksimal 16 RGB terlihat, alpha nearest exact.
- Spritesheet semua: 457×796, 4.873 byte; atlas enam frame RGBA8888, 2.564 byte; keduanya diunduh melalui browser native dan preview diperiksa visual.
- Koreksi mask dengan drag/Undo/save: alpha pusat 255→0→255; setelah drag kedua dan save, PNG unduhan memiliki alpha 0.
- Reset: galeri kosong, spritesheet tersembunyi, tombol ekstraksi nonaktif; nol console/runtime error aplikasi.

## Modified files

- `docs/PROGRESS.md` — status aktual, cakupan bukti, log pemeriksaan, temuan mask dan satu tugas berikutnya.
- `docs/HANDOFF.md` — handoff sesi ini.
- Tidak ada perubahan source, dependensi, konfigurasi permanen atau keputusan arsitektur. Tidak ada script uji permanen baru.

## Uncommitted changes / Git status

- Sebelum tugas, `git status --short`, `git diff`, dan staged diff kosong.
- Sesi ini mengubah dua dokumen di atas; tidak melakukan staging atau commit.
- Tidak menjalankan ulang Git setelah edit; daftar perubahan sesi berdasarkan operasi edit, bukan audit Git akhir.

## Current errors / limitations

- **FAIL aktual — klik tunggal penghapus:** foreground 360×480, titik opaque (180,200), brush 15 px. Setelah klik, Undo aktif tetapi alpha tetap 255. `handlePointerDown()` memanggil `drawStroke(lastPoint,lastPoint)`; implementasi stroke panjang nol tidak menghapus piksel pada browser uji. Drag menghapus dan Undo/save bekerja. Belum diperbaiki.
- RAM available sebelum startup 1,36 GiB; available commit 6,44 GiB. SD15 tidak dimuat. Risiko memori dan latensi SD15 dari sesi sebelumnya tetap berlaku; jangan menjalankan load ganda tanpa memeriksa resource.
- SD15, kamera, akurasi foto nyata/occlusion, mobile, dan deployment publik tidak diuji pada sesi ini. Label Hat/Bag pada gambar sintetis tidak membuktikan akurasi kategori.
- Retensi otomatis belum tersedia; reset UI bukan penghapusan data server.
- Sebagian narasi lama di README/ARCHITECTURE masih merujuk tahap implementasi sebelumnya; gunakan bukti bertanggal terbaru, jangan menganggap klaim “100%” historis sebagai jaminan bebas bug.

## Tests / checks performed

- **PASS:** inspeksi awal `git status --short; git diff --stat; git diff; git diff --cached --stat`.
- **PASS:** `OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 ai-service/.venv-test/Scripts/python.exe -B -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8010 --workers 1`; backend `node backend/src/server.js` dengan port/storage/timeout terisolasi; frontend `npm run dev -- --port 5174` dengan proxy port 3100.
- **PASS:** `browser` melalui `functions.eval` — upload → SCHP nyata → galeri/PNG → ZIP pilihan → pixelation → spritesheet/atlas → mask drag/Undo/save → reset; rincian hasil di atas.
- **PASS:** harness Python stdin (`zipfile`, `hashlib`, `urllib.request`) dan `.venv-test/Scripts/python.exe -B -c` dengan Pillow untuk integritas ZIP, alpha/palet/pixelation dan koreksi mask yang tersimpan.
- **FAIL:** klik tunggal penghapus mask pada browser; bukti dan lokasi penyebab di bagian errors.
- **ERROR harness, diperbaiki:** selector preview awal mencakup img turunan tanpa src sehingga timeout; diganti `img[src]`. Helper `assert.equal` tidak tersedia; pemeriksaan eksplisit menyelesaikan verifikasi atlas. Keduanya bukan error aplikasi.
- **NOT RUN:** build frontend, suite backend/Python, SD15, kamera dan foto nyata. Tidak ada perubahan perilaku aplikasi pada sesi ini. Angka 119 backend/14 AI/13 tahap browser dari 2026-11-21 adalah bukti historis, tidak dijalankan ulang.
- **PASS cleanup:** tab/layanan uji dihentikan; fixture, storage dan unduhan milik uji dihapus. Screenshot visual ada pada artefak browser sesi, bukan berkas source baru.

## Next action (only one)

Perbaiki klik tunggal penghapus mask di `frontend/src/extraction-workspace.js` (`drawStroke` / `handlePointerDown`). Klik pada piksel opaque harus menghapus area brush; drag, Undo dan save tetap berfungsi. Verifikasi browser dan piksel PNG unduhan. Tidak perlu SD15 atau mengulang suite luas.

## Handoff rules

1. Periksa keadaan repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat hasil aktual PASS/FAIL/NOT RUN; jangan menyamakan dokumentasi dengan bukti runtime.
4. Perbarui PROGRESS dan HANDOFF setelah tugas; keputusan arsitektur baru harus dicatat di DECISIONS.
5. Jika agent baru adalah Claude Website (tidak punya filesystem lokal), berikan dokumen dan source code relevan, bukan foto pribadi / `.env` / checkpoint.
