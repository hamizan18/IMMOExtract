# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** koreksi foreground foto astronaut melalui UI nyata dan unduhan PNG/ZIP PASS. Segmentasi otomatis masih memiliki salah label/kebocoran; koreksi area terpilih bukan penerimaan kualitas umum.

## Last agent

OMP — penerimaan koreksi foto nyata melalui browser/Express/SCHP dan verifikasi PNG/ZIP, 2026-11-23.

## Current milestone / task

M7 — penerimaan lokal pascapenutupan implementasi D-047. Koreksi mask foto astronaut selesai tanpa perubahan source; berikutnya evaluasi satu foto full-body berizin.

## Last completed task

- Git awal hanya PROGRESS/HANDOFF modified dari evaluasi sebelumnya; index kosong. Perubahan dipertahankan; tidak staging/commit.
- Foto NASA Eileen Collins existing dipakai ulang (`scratch/schp-photo-20261123/input.png`), [public domain menurut scikit-image](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.astronaut). Tidak mengunduh foto/model baru atau membaca storage pengguna.
- Vite source 5176 → Express 3113 → FastAPI/SCHP 8013, storage temporary terisolasi, CPU dua thread. Upload/ekstraksi melalui browser menghasilkan tujuh kartu; inferensi 3,6253 s. SCHP loaded true; stylizer available/loaded false.
- Mouse/keyboard native pada editor human: hapus fragmen bendera, Undo mengembalikan piksel, ulang penghapusan lalu Pulihkan lubang helm. Probe bendera `(2,25)`/`(8,450)` alpha 255→0; helm `(420,450)`/`(420,465)`/`(365,365)` 0→255 dengan RGB source exact; wajah `(220,130)` tidak berubah.
- Save menutup dialog dan memperbarui preview/link. PNG native 337.748 byte identik dengan `Canvas.toBlob`; ZIP pilihan human 337.942 byte berisi hanya PNG tersebut, byte-identical, CRC/STORE/metadata checksum benar. Enam PNG kategori unchanged.
- Reset mengosongkan galeri dan menonaktifkan ekstraksi/ekspor pilihan. Tab dan ketiga service ditutup, port terverifikasi tertutup, storage temporary milik sesi dihapus.

## Artefak dan batas visual

- Bukti ignored: `scratch/mask-real-downloads-20261123/` — `before.png`, PNG revisi UUID human, `expected-canvas.png` (`toDataURL`), `expected-blob.png` (`toBlob`), ZIP UUID ekspor, `corrected-card.webp`, `verification.json`.
- Job uji `e7a401b4-a469-4efe-8c62-7ffe338b968d`; human `2729d158-7277-4bb4-b6a9-1ca6ddc2962e`; ekspor `996f8f70-ef11-4c25-ad07-838f3f6cee86`. Storage job sudah dihapus; ID bukan link server aktif.
- Alpha berubah pada 3.726 piksel; hasil memiliki 162 piksel alpha parsial (tepi kuas). Semua RGB piksel opaque exact dengan sumber; tidak menjamin hidden RGB/alpha parsial identik.
- Screenshot modal/kartu diperiksa: area sasaran berubah sesuai sapuan, bukan klaim setiap batas bersih. Helm masih terpecah beberapa kategori; kaki/sepatu tidak terlihat. Tanpa ground-truth mask/skor akurasi.
- Artefak evaluasi awal di `scratch/schp-photo-20261123/` tetap utuh; SHA-256 input `88431cd9653ccd539741b555fb0a46b61558b301d4110412b5bc28b5e3ea6cb5`, 791.555 byte, 512×512.

## Modified files / uncommitted changes

- `docs/PROGRESS.md`, `docs/HANDOFF.md` — diperbarui di atas perubahan belum commit dari sesi sebelumnya.
- Folder bukti ignored baru tercantum di atas; tidak ada source, test permanen, script sementara, dependensi, checkpoint atau konfigurasi yang diubah.
- Git awal dua dokumen modified; tidak staging/commit atau memeriksa Git ulang setelah edit.
- DECISIONS tidak diubah: penerimaan menguji D-044 existing, bukan keputusan arsitektur baru.

## Tests / checks performed

- **PASS inspeksi:** Git status/diff/index; PowerShell CIM: RAM bebas 2.374.820 KiB/sisa virtual 7.838.696 KiB, tidak menemukan Python/Uvicorn sebelum startup.
- **PASS UI nyata:** browser desktop 1365×1000, upload → SCHP → tujuh kartu → Penghapus/Pulihkan/Undo/save → native PNG dan ZIP pilihan. Tidak mock; SD15 tidak dimuat.
- **FAIL harness awal:** `ai-service/.venv-test/Scripts/python.exe -` membandingkan unduhan terhadap `toDataURL`; 12 piksel alpha parsial berbeda RGB maksimum 1, alpha seluruh piksel identik. Backend menulis buffer save langsung tanpa re-encode.
- **PASS diagnosis/verifikasi lanjutan:** capture `toBlob` dari canvas yang sama byte-identical dengan unduhan. Python NumPy/Pillow/zipfile memeriksa seluruh PNG, probe target, RGB opaque exact, preview, ZIP satu entry/CRC/STORE/size/count/SHA-256, enam kategori unchanged, health SCHP true/SD15 false.
- **ERROR harness terselesaikan:** downloads pada `browser.open` awal boolean, harus path; `tab.waitFor` diberi ekspresi JS padahal selector, menyebabkan satu pageerror. Pengamatan save dilanjutkan dengan `page.waitForFunction`, bukan save/inferensi ulang. Nol console error aplikasi.
- **PASS cleanup:** reset UI; tab/service ditutup; Python `shutil.rmtree` menghapus hanya `C:/Users/Hype/AppData/Local/Temp/immo-mask-real-dJrRPi`; socket memastikan 8013/3113/5176 tertutup. Bukti ignored dipertahankan.
- **NOT RUN:** build, suite backend/Python, SD15, kamera, viewport mobile; tidak ada perubahan perilaku aplikasi.

## Current errors / limitations

- Tidak menemukan bug aplikasi baru pada skenario ini. Perbedaan `toDataURL`/`toBlob` adalah batas pembanding teramati; jangan mengklaim semua encoder PNG menghasilkan RGB parsial identik.
- Koreksi foreground tidak mengubah class map/enam kategori; label helm salah dan kualitas batas yang belum disapu tetap keterbatasan.
- Foto full-body/kaki/sepatu belum dievaluasi. Izin unduhan sebelumnya hanya satu foto astronaut; perlu persetujuan baru bila foto berikutnya diunduh.
- Risiko existing: resource SD15, retensi/batas antrean/lifecycle otomatis, portabilitas/mobile/deployment publik serta lisensi redistribusi model belum ditutup.

## Next action (only one)

Evaluasi satu foto manusia full-body nonpribadi berizin dengan pakaian dan sepatu terlihat. Cari file lokal berizin dahulu; minta persetujuan baru sebelum mengunduh foto tambahan. Jalankan SCHP lokal, periksa kategori/mask dan bagian tertutup, catat false positive/negative tanpa generalisasi atau tuning model berdasarkan satu sampel. Jangan memuat SD15.

## Handoff rules

1. Periksa repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat PASS/FAIL/NOT RUN aktual; dokumentasi bukan pengganti runtime.
4. Perbarui PROGRESS/HANDOFF; keputusan arsitektur baru dicatat di DECISIONS.
5. Claude Website perlu file relevan; jangan kirim foto pribadi, `.env` atau checkpoint.
