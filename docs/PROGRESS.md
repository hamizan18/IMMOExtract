# IMMOExtract — Progress Tracker

> **Status aktual:** M1 dan M2 selesai untuk lingkungan Windows/Chrome yang diuji. M3 sedang berjalan: pipeline ekstraksi human parsing mandiri `HumanExtractor` (`ai-service/extractor.py`) telah diimplementasikan dan terverifikasi end-to-end via `test_extractor.py` (1.90 detik pada AMD Ryzen 5 7430U). Menghasilkan binary mask alpha foreground manusia utuh dan PNG transparan RGBA dengan preservasi pixel RGB dan rasio aspek asli tanpa ketergantungan OpenCV. Integrasi endpoint AI service berikutnya.

## Ringkasan

- **Current milestone:** M3 — POC human parsing — In progress (pipeline ekstraksi PNG transparan terverifikasi).
- **Current task:** Pipeline ekstraksi gambar ke PNG transparan selesai (PASS); berikutnya integrasikan pipeline ekstraksi ke AI service FastAPI (`POST /extract` di `ai-service/main.py`) dan perbarui endpoint health (`model_loaded: true`).
- **Overall status:** Input file/kamera fisik → preview → upload server berjalan; AI model + bobot resmi + pipeline ekstraksi PNG transparan siap di CPU lokal (`ai-service/extractor.py`).
- **Last verification:** 2026-11-16 — `ai-service/test_extractor.py` (PASS, letterbox 3 rasio aspek, inferensi 1.901s, deteksi kategori pakaian ATR, alpha transparency 0/255, PNG save/reload); `npm test --prefix backend` (PASS 24/24); `npm run build --prefix frontend` (PASS).

## Milestone

| Milestone | Cakupan | Status | Kriteria selesai |
| --- | --- | --- | --- |
| M1 | Struktur repo, frontend, Express, FastAPI, health checks | Complete | Frontend dibuka di browser; kedua health checks dan Express → FastAPI lulus; kegagalan/pemulihan diuji |
| M2 | Upload, kamera, validasi, preview input | Complete | Validasi backend sebelumnya 24/24 PASS, integrasi frontend teruji, kamera fisik PC Camera → preview → upload → track ended PASS pada Windows/Chrome 158 |
| M3 | POC SCHP, label/mask, PNG transparan | In progress | Pipeline ekstraksi PNG transparan RGBA terverifikasi (1.90s/ekstraksi); integrasi endpoint FastAPI & Express berikutnya |
| M4 | Job, object gallery, download individual/ZIP | ⬜ Not started | Job status & unduhan end-to-end teruji |
| M5 | Classic Pixelation Studio | ⬜ Not started | Ukuran, nearest-neighbour, palet/alpha diuji |
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
- Regression testing: `npm test --prefix backend` (24/24 PASS) dan `npm run build --prefix frontend` (PASS) terkonfirmasi tidak mengalami regresi.

## In progress

- M3: pipeline ekstraksi RGBA PNG transparan selesai dan terverifikasi. Berikutnya integrasi pipeline ke FastAPI AI service (`ai-service/main.py`) dengan endpoint `POST /extract` dan pengujian HTTP.

## Blockers / risks

- Latensi pipeline ekstraksi CPU terukur ~1.90 detik per gambar pada AMD Ryzen 5 7430U dengan ukuran RAM model ~255 MB; inferensi dan post-processing CPU terbukti sangat responsif dan tidak membebani memori laptop.
- Python 3.14.3 didukung penuh oleh PyTorch 2.15.0+cpu; seluruh pipeline berjalan pure-PyTorch + Pillow + NumPy tanpa ketergantungan ekstensi C++/CUDA atau OpenCV (`cv2`).
- Checkpoint ATR resmi sudah diunduh dan diverifikasi hash-nya. Checkpoint disimpan di folder lokal yang diabaikan Git (`ai-service/models/`) dan tidak di-bundle ke repository.
- Pengujian Windows lokal saja; Linux/macOS dan deployment produksi belum diuji.
- Batas dimensi preview diperiksa setelah decode browser; bukan perlindungan decompression bomb atau pengganti validasi server. Batas sementara dicatat di D-011, bukan benchmark.
- Kamera fisik desktop PC Camera sudah diuji. Kamera mobile fisik dan perpindahan tab non-headless belum diuji. Hidden-state sebelumnya diuji lewat injeksi; navigasi `pagehide` diuji nyata pada tugas kamera sintetis.
- Upload yang sudah diterima tetap tersimpan; pembatalan request bukan rollback dan hapus preview bukan hapus server. Retensi otomatis belum diimplementasikan; batasan ini ditampilkan di UI.
- Browser dengan beberapa kamera dapat memilih kamera virtual secara default. Pengujian fisik memilih PC Camera lewat pengaturan Chrome; aplikasi belum mempunyai pemilih perangkat dan tidak menjanjikan kamera fisik tertentu.
- Jangan menandai fitur M3–M7 sebagai selesai hanya karena dokumentasinya ada.

## Next task — satu tugas saja

Integrasikan pipeline ekstraksi ke FastAPI AI service (`ai-service/main.py`): inisialisasi `HumanExtractor` saat startup AI service (`model_loaded: true`), buat endpoint `POST /extract` yang menerima request ekstraksi gambar (path file lokal atau multipart) dan mengembalikan mask serta objek transparan PNG, lalu uji endpoint secara langsung via HTTP request loopback. Jangan memodifikasi backend Express sebelum endpoint FastAPI teruji mandiri.

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
| 2026-11-16 | Integrasi endpoint FastAPI `POST /extract`, orchestrator Express job M4, galeri objek, download ZIP | NOT RUN | Pipeline ekstraksi lokal siap; endpoint FastAPI dan integrasi Express belum diimplementasikan |

Catatan kamera 2026-11-15: browser bersama mengabaikan argumen fake-device (dilaporkan ke tool); tes dipindah ke Chrome/profil temp terisolasi dengan flag diverifikasi. Browser uji dihentikan; profil/fixture temp dihapus. Tidak mengubah source untuk mengatasi batas harness.

Fixture sintetis sementara di folder temp telah dihapus. Pengujian browser dijalankan melalui harness sesi, bukan test suite permanen baru.

Sesi 2026-11-16: tab browser dan layanan uji port 3100/5174 dihentikan; fixture serta storage temp upload sintetis dihapus. Kamera memakai injeksi stream canvas, bukan perangkat fisik. Tidak membuat script/test permanen atau mengubah storage pengguna.

## Cara memperbarui dokumen

Setelah satu tugas selesai: ubah status berdasarkan **bukti tes**, catat file diubah, hasil perintah, kendala, dan satu next task. Selaraskan `HANDOFF.md`. Jangan menulis PASS jika tidak benar-benar menjalankan tes.
