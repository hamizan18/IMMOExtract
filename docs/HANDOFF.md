# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** koreksi crop Pants melalui UI nyata dan PNG/ZIP pilihan PASS. Offset bbox, Undo, sumber RGB browser dan persistensi terverifikasi. Kategori Upper-clothes tidak ikut berubah; kualitas segmentasi umum belum diterima.

## Last agent

OMP — penerimaan koreksi crop Pants melalui browser/Express/SCHP dan verifikasi PNG/ZIP, 2026-11-23.

## Current milestone / task

M7 — penerimaan lokal pascapenutupan implementasi D-047. Koreksi crop Pants selesai tanpa perubahan source; berikutnya verifikasi pixelation atas PNG revisi existing.

## Last completed task

- Git awal working tree/index bersih; dua dokumen pending sesi sebelumnya sudah tidak pending. Tidak staging/commit atau memeriksa Git ulang setelah edit.
- Memakai foto full-body existing `scratch/schp-fullbody-20261123/input.jpg`: [Man Standing — Visitor7](https://commons.wikimedia.org/w/index.php?title=File:Man_Standing.jpg&oldid=1257378181), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Tanpa unduhan baru; provenance sesi evaluasi tetap utuh.
- Browser desktop 1365×1000 → Vite 5177 → Express 3114 → SCHP 8014, CPU dua thread, storage temporary. Inferensi 3,692 s menghasilkan human + sembilan kategori; SCHP loaded true, stylizer available/loaded false.
- Mouse/keyboard native pada editor Pants memulihkan tiga area salah Upper-clothes; Undo mengembalikan Canvas `toBlob` exact, kemudian koreksi diterapkan ulang dan disimpan.
- Save menutup modal, memperbarui preview/link. PNG 135.326 byte identik `toBlob`/preview; ZIP pilihan 135.520 byte tepat satu PNG, CRC/STORE/metadata checksum benar. Sembilan objek lain byte-identical.

## Artefak dan batas visual

- Bukti ignored baru: `scratch/pants-real-downloads-20261123/` — sepuluh `before-<category>.png`, `canvas-before.png`, `source-crop-browser.png`, `expected-blob.png`, `preview-after.png`, PNG/ZIP UUID native, `job-before.json`, `job-after.json`, `export.json`, `verification.json`, `corrected-dialog.webp`, `corrected-card.webp`.
- Job uji `3aa80f7e-9a53-4edc-8210-c9d779c3ee59`; Pants `bb5cf80f-cb26-436d-928c-0d331e59a99d`; ekspor `771e52e8-bdf1-4ba4-b1e1-314ae82235a2`. Storage job sudah dihapus; ID bukan link server aktif.
- Crop Pants bbox `[404,467,590,879]`, 186×412. Probe crop `(49,271)`, `(26,288)`, `(30,333)` alpha 0→255 dan RGB exact sumber browser pada global `(453,738)`, `(430,755)`, `(434,800)`. Probe luar sapuan tetap.
- Alpha berubah pada 373 piksel; 55 alpha parsial; pixel_count 54.260→54.633. Sebanyak 242 piksel yang semula Upper-clothes kini opaque pada Pants. Semua RGBA luar area kuas unchanged; piksel opaque yang berubah sesuai crop sumber browser.
- Screenshot modal/kartu memperlihatkan koreksi area sasaran, bukan semua batas bersih. Human dan delapan kategori selain Pants (termasuk Upper-clothes) tidak dimutasi; class map tidak direvisi. Koreksi tidak otomatis menghapus salah label di objek lain.
- Input/provenance/report evaluasi full-body dan artefak astronaut tetap utuh. Atribusi/lisensi Visitor7 CC BY-SA 3.0 berlaku untuk input/turunan evaluasi; tidak dibundel ke source.

## Modified files / uncommitted changes

- `docs/PROGRESS.md`, `docs/HANDOFF.md` — pembaruan tugas ini; Git awal bersih.
- Folder bukti ignored baru tercantum di atas. Source/test permanen/dependensi/checkpoint/konfigurasi tidak berubah; tidak membuat script sementara di disk.
- Tanpa staging/commit. Tidak memeriksa Git ulang setelah edit.
- DECISIONS tidak diubah: menguji kontrak D-044 existing, bukan keputusan arsitektur baru.

## Tests / checks performed

- **PASS inspeksi:** Git status/diff/index, source mask/startup/proxy dan D-044. RAM bebas 3.247.204 KiB/sisa virtual 9.115.800 KiB; query awal tidak menemukan Python/Uvicorn.
- **PASS browser nyata:** upload→SCHP→sepuluh kartu→Pulihkan/Undo/save crop Pants→native PNG/ZIP pilihan. Inferensi 3,692 s, tanpa mock atau SD15.
- **FAIL harness awal:** `ai-service/.venv-test/Scripts/python.exe -` mengasumsikan alpha unchanged berarti RGBA unchanged. Sebelas piksel opaque dalam kuas berganti RGB maksimum satu tingkat sesuai sumber browser.
- **PASS diagnosis/verifikasi akhir:** Python NumPy/Pillow menemukan crop JPEG browser/Pillow berbeda pada 5.410 piksel RGB, maksimum satu tingkat. Oracle sesuai area sapuan: luar kuas unchanged; opaque yang berubah exact sumber browser; bbox/probe, PNG=Canvas `toBlob`=preview, ZIP satu entry/CRC/STORE/size/count/SHA-256 benar. Sembilan objek lain unchanged melalui HTTP; tidak mengubah aplikasi.
- **ERROR helper terselesaikan:** `tab.press(selector,key)` ditolak sebelum sapuan; diperbaiki ke `tab.press(key,{selector})`. Tidak mengulang upload/inferensi. Nol console/pageerror aplikasi.
- **PASS cleanup:** reset UI, galeri kosong, ekstraksi/ZIP pilihan disabled; tab/service ditutup. Python socket memastikan 8014/3114/5177 tertutup; hanya `C:/Users/Hype/AppData/Local/Temp/immo-pants-real-Xxr0YT` dihapus; bukti ignored dipertahankan.
- **NOT RUN:** build, suite backend/Python, pixelation hasil koreksi, SD15, kamera/mobile; tidak ada perubahan perilaku aplikasi.

## Current errors / limitations

- Tidak menemukan error aplikasi baru pada skenario ini. JPEG browser/Pillow dapat berbeda satu tingkat RGB; Pulihkan memakai foto yang didekode browser. Jangan memakai kesamaan alpha sebagai bukti RGB tidak disapu.
- Sapuan terarah bukan hasil seluruh kontur bersih. Koreksi Pants tidak memperbaiki class map/Upper-clothes atau kacamata yang tidak terpisah.
- Tidak memerlukan foto/download/inferensi baru untuk next action; PNG revisi dan ZIP existing tersedia sebagai bukti privat.
- Risiko existing: resource SD15, retensi/batas antrean/lifecycle otomatis, portabilitas/mobile/deployment publik serta lisensi redistribusi model belum ditutup.

## Next action (only one)

Verifikasi Classic Pixelation ukuran 32/palet Retro16 atas PNG Pants terkoreksi existing `scratch/pants-real-downloads-20261123/bb5cf80f-cb26-436d-928c-0d331e59a99d.png`. Gunakan helper existing dan artefak temporary; periksa dimensi, nearest alpha termasuk parsial, palet serta original/ZIP unchanged. Tidak perlu inferensi, unduhan baru atau SD15.

## Handoff rules

1. Periksa repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat PASS/FAIL/NOT RUN aktual; dokumentasi bukan pengganti runtime.
4. Perbarui PROGRESS/HANDOFF; keputusan arsitektur baru dicatat di DECISIONS.
5. Claude Website perlu file relevan; jangan kirim foto pribadi, `.env` atau checkpoint.
