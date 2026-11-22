# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** implementasi M1–M7 ditutup D-047; kedua bug mask telah diperbaiki dan dokumentasi utama sudah diselaraskan. Bukti AI mock, inferensi nyata, pemeriksaan dokumen dan penerimaan kualitas foto harus tetap dibedakan.

## Last agent

OMP — sinkronisasi README/ARCHITECTURE dengan implementasi dan batas bukti, 2026-11-22.

## Current milestone / task

M7 — penerimaan lokal pascapenutupan implementasi. Sinkronisasi dokumentasi selesai; berikutnya evaluasi ekstraksi SCHP pada satu foto manusia berizin. Tidak ada fitur/milestone baru.

## Last completed task

- Working tree/index awal bersih. Konteks proyek dan bukti sesi sebelumnya dipertahankan; tidak mengulang implementasi atau tes runtime.
- README/ARCHITECTURE dicocokkan dengan package scripts, server/app/router backend, health FastAPI, extractor/stylizer, kontrol UI generatif dan implementasi mask.
- Narasi scaffold/fitur belum tersedia yang sudah usang diganti dengan status aktual; klaim “terverifikasi penuh” dibatasi menurut bukti.
- Dokumentasi startup membedakan jalur ekstraksi/classic/mask/ekspor dari runtime SD15 opsional, kebutuhan checkpoint/dependensi, timeout dan resource. Tidak mengubah konfigurasi aplikasi.
- Pemeriksaan statis tautan lokal/referensi script/code fence PASS. Tidak ada source, dependensi, model atau keputusan arsitektur yang diubah.

## Dokumentasi yang diselaraskan

- Stack aktual SCHP/Pillow/NumPy dan SD15/Diffusers/Accelerate; OpenCV bukan kebutuhan pipeline ekstraksi.
- Mask editor, UI generatif dan spritesheet tersedia; parameter UI generatif, compositing Pulihkan dan batas Canvas dijelaskan.
- Health HTTP 200 bukan jaminan model siap; startup tiga terminal tidak otomatis menyediakan SD15. Antrean tidak mengelola lifecycle dua model.
- Kontrak REST menghapus route draft GET `/api/jobs/:id/objects` yang tidak tersedia; objek ada pada polling job dan endpoint individual.
- Bukti mask/browser AI mock dipisahkan dari SCHP nyata pada gambar sintetis dan riwayat SD15 nyata. Kualitas foto nyata, resource, retensi, portabilitas serta deployment publik tetap dibatasi.

## Modified files / uncommitted changes

- `README.md` — status, stack, startup, readiness, mask, harness dan batas bukti.
- `docs/ARCHITECTURE.md` — implementasi/route aktual, lifecycle, pengujian dan pekerjaan terbuka.
- `docs/PROGRESS.md`, `docs/HANDOFF.md` — pemeriksaan aktual dan satu tugas berikutnya.
- Tidak ada perubahan source, build, screenshot, model, dependensi atau konfigurasi permanen pada sesi ini.
- Git awal bersih. Tidak staging/commit atau memeriksa Git ulang setelah edit; daftar di atas berdasarkan operasi sesi.
- DECISIONS tidak diubah: sinkronisasi ini mendokumentasikan implementasi/keputusan existing, bukan keputusan arsitektur baru.

## Tests / checks performed

- **PASS:** `git status --short; git diff --stat; git diff; git diff --cached --stat` sebelum edit.
- **PASS inspeksi statis:** kontrak source, startup/config, routes dan bukti runtime historis dibandingkan dengan README/ARCHITECTURE.
- **PASS:** Python inline memeriksa dua dokumen, enam tautan Markdown lokal, tiga referensi script dan pasangan code fence; seluruh target ada dan blok kode seimbang.
- **NOT RUN:** build, browser, suite backend/Python, SCHP/SD15. Hanya dokumentasi berubah; tidak ada perilaku baru yang perlu smoke runtime.
- Bukti runtime terakhir tetap dari sesi mask sebelumnya: build 126 ms dan browser 5,98 s PASS dengan AI mock. Jangan menyatakan tes tersebut dijalankan pada sesi dokumentasi.
- Tidak menjalankan server/model atau membuat script/fixture sementara. Tanpa staging/commit.

## Current errors / limitations

- Bug penghapus/Pulihkan yang ditemukan sebelumnya sudah diperbaiki; tidak menemukan bug runtime baru lewat tugas dokumentasi.
- Kualitas ekstraksi pada foto manusia nyata/occlusion belum dibuktikan oleh fixture sintetis. Jangan mengklaim semua label akurat atau setiap instance terpisah.
- SD15 memiliki risiko RAM/commit/latensi dan riwayat guard; retensi, antrean berbatas dan lifecycle pergantian model otomatis belum tersedia.
- Linux/macOS, kamera mobile dan deployment publik belum tercakup oleh bukti lokal. Lisensi model/kode perlu dipastikan sebelum distribusi.

## Next action (only one)

Evaluasi SCHP pada satu foto uji manusia nonpribadi berizin, bukan fixture sintetis. Periksa kategori, mask/alpha dan aksesori/occlusion yang terlihat; catat hasil tanpa generalisasi. Gunakan file lokal yang diizinkan; bila belum tersedia, minta foto uji/persetujuan pengguna. Jangan memakai foto pribadi tanpa izin, mengunggah ke cloud atau memuat SD15.

## Handoff rules

1. Periksa repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat PASS/FAIL/NOT RUN aktual; dokumentasi bukan pengganti runtime.
4. Perbarui PROGRESS/HANDOFF; keputusan arsitektur baru dicatat di DECISIONS.
5. Claude Website perlu file relevan; jangan kirim foto pribadi, `.env` atau checkpoint.
