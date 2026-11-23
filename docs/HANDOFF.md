# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** ekspor spritesheet Pants terkoreksi + kedua sepatu melalui UI/API nyata PASS. PNG/atlas native sesuai preview; alpha exact dan sumber unchanged. Berikutnya sinkronisasi README/ARCHITECTURE, bukan pengulangan penerimaan ekspor.

## Last agent

OMP — penerimaan spritesheet UI/API dengan SCHP nyata dan PNG koreksi existing, 2026-11-23.

## Current milestone / task

M7 — penerimaan lokal pascapenutupan implementasi D-047. Ekspor tiga objek melalui browser selesai tanpa perubahan source; berikutnya sinkronisasi dokumentasi utama dengan bukti foto nyata/batas compositing.

## Last completed task

- Git awal working tree/index bersih; dua dokumen pending sesi sebelumnya sudah tidak pending. Tidak staging/commit atau memeriksa Git ulang setelah edit.
- Foto full-body existing [Man Standing — Visitor7](https://commons.wikimedia.org/w/index.php?title=File:Man_Standing.jpg&oldid=1257378181), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), dipakai ulang tanpa unduhan.
- Chrome desktop 1365×1000 → Vite 5178 → Express 3115 → SCHP 8015, CPU dua thread, storage temporary. Inferensi 4,4882 s menghasilkan sepuluh objek; SCHP true, SD15 available/loaded false. PNG Pants koreksi existing diterapkan lewat PUT API nyata; bukan tes kuas ulang.
- UI memilih Pants/Left-shoe/Right-shoe, membuat ZIP dahulu lalu spritesheet padding4/kolom2. Request berisi tepat tiga UUID; HTTP201/Location, preview 255×469, unduhan native PNG 155.399 byte/atlas 1.382 byte identik endpoint inline.
- Atlas/alpha termasuk 55 parsial/RGB opaque/padding PASS. PNG identik hasil helper; perbedaan RGB compositing sama. ZIP 154.981 byte tepat tiga entry; sepuluh objek live dan ZIP unchanged. Reset/cleanup selesai.

## Artefak dan batas visual

- Bukti ignored baru: `scratch/spritesheet-ui-20261123/` — `source-Pants.png`, `source-Left-shoe.png`, `source-Right-shoe.png`, job/response/HTTP/UI/verification JSON, ZIP/PNG/atlas native, `preview.png`, `inline-atlas.json`, screenshot atas dan `preview-lower-viewport.png`.
- Job `da17f36c-15fe-480c-a30e-afe117dfe908`; spritesheet `cd842511-2caa-4430-84b3-4f2c58acccec`; ZIP `ef7804a5-d0a8-448a-ad06-9746e962553b`. Storage job sudah dihapus; ID bukan URL aktif.
- PNG 255×469/155.399 byte, SHA-256 `fd6f1ef285eed653625fca7227e35b1ae4d7c20087ff0a3b0d56b2f67ec3287d`. Frame `(x,y,w,h)`: Pants `(4,4,186,412)`, Left-shoe `(194,4,57,46)`, Right-shoe `(4,420,93,45)`. Seluruh alpha/opaque RGB exact; RGB tujuh piksel parsial berbeda maksimum satu, hidden RGB sepatu 805/1.475 piksel berubah seperti hasil helper.
- Preview container tinggi256/overflow-auto: wheel native scrollTop213 menampilkan baris bawah. Screenshot selector mengembalikan scroll ke atas; bukti bawah yang benar adalah `preview-lower-viewport.png` dari raw screenshot, bukan file bernama `spritesheet-preview-lower.webp`. PNG unduhan lengkap, bukan terpotong.
- Sumber tetap di `scratch/pants-real-downloads-20261123/`: Pants revisi `bb5cf80f-cb26-436d-928c-0d331e59a99d.png`, `before-Pants.png`, `before-Left-shoe.png`, `before-Right-shoe.png`, ZIP `771e52e8-bdf1-4ba4-b1e1-314ae82235a2.zip` dan bukti UI lainnya. Storage job lama sudah dihapus; gunakan berkas, bukan URL job.
- Hash unchanged: PNG revisi `fb516bf437f76c615532780c7e9d3a8825237a9bfa6398e40d927c1d1eaabbfe`; ZIP `2dbfe49042a0c77a18b7db76f11553f38c4638b81a5b67840b7dd61d720e7358`; PNG awal `f5ac7effb4184f34af3f19d85047650f8effb9187c3ff9fa0bd646446b8160b5`. Atribusi/lisensi turunan mengikuti Visitor7 CC BY-SA 3.0.

## Modified files / uncommitted changes

- `docs/PROGRESS.md`, `docs/HANDOFF.md` — pembaruan tugas ini; Git awal bersih.
- Folder bukti ignored baru tercantum di atas. Source/test permanen/dependensi/checkpoint/konfigurasi tidak berubah; tidak membuat script sementara di disk.
- Tanpa staging/commit. Tidak memeriksa Git ulang setelah edit.
- DECISIONS tidak diubah: penerimaan D-044/D-045/D-046 existing, bukan keputusan arsitektur baru.

## Tests / checks performed

- **PASS inspeksi:** Git status/diff/index bersih; jalur frontend/router/manager diperiksa. RAM bebas 1.851.628 KiB/sisa virtual 6.301.688 KiB; tidak menemukan Python/Uvicorn sebelum startup.
- **PASS UI/API:** upload→SCHP 4,4882 s→revisi Pants via PUT→pilihan tiga objek→ZIP→spritesheet→preview/native PNG dan atlas. Satu inferensi, tanpa mock/SD15.
- **PASS oracle:** `ai-service/.venv-test/Scripts/python.exe -` memeriksa PNG/atlas native=inline, koordinat/kategori/dimensi frame, alpha termasuk parsial exact, opaque RGB exact, padding transparan, ZIP CRC/STORE/metadata checksum. Sepuluh PNG objek dan ZIP unchanged melalui HTTP; lima hash artefak existing unchanged.
- **PASS visual/reset:** preview atas/bawah diperiksa lewat wheel native; reset mengosongkan galeri, menyembunyikan hasil, menonaktifkan tombol, menghapus href PNG/atlas. Nol console/pageerror aplikasi. Screenshot selector mengubah scroll; raw viewport screenshot dipakai untuk bukti bawah.
- **PASS cleanup:** tab/service ditutup; Python socket memastikan 8015/3115/5178 tertutup; hanya `C:/Users/Hype/AppData/Local/Temp/immo-sheet-real-S5gpUw` dihapus. Bukti ignored dipertahankan.
- **NOT RUN:** build, suite backend/Python, SD15, kuas mask ulang, kamera/mobile. Tidak ada perubahan perilaku aplikasi.

## Current errors / limitations

- Tidak ada error aplikasi pada penerimaan ini. RGB parsial/tersembunyi spritesheet tidak selalu exact; alpha/opaque RGB tetap exact. Ini batas compositing, bukan kerusakan PNG sumber.
- Koreksi Pants tidak memperbaiki Upper-clothes/class map; kualitas segmentasi umum tetap terbatas. Penerimaan hanya desktop lokal.
- Revisi PNG Pants diterapkan via API agar ekspor memakai artefak koreksi yang sama; tes kuas UI adalah bukti historis sesi sebelumnya. Preview galeri Pants tidak dipakai sebagai bukti refresh otomatis setelah PUT eksternal.
- Risiko existing: resource SD15, retensi/batas antrean/lifecycle otomatis, portabilitas/mobile/deployment publik serta lisensi redistribusi model belum ditutup.

## Next action (only one)

Sinkronkan README dan ARCHITECTURE dengan bukti penerimaan foto nyata terbaru: koreksi kategori tidak memperbaiki class map/objek lain, pixelation grid32 tidak menyampel alpha parsial, spritesheet mempertahankan alpha tetapi bukan seluruh RGB parsial/tersembunyi, serta preview spritesheet dapat digulir. Pisahkan bukti helper dari UI/API dan batas desktop lokal; jangan mengulang runtime atau mengubah source tanpa kebutuhan.

## Handoff rules

1. Periksa repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat PASS/FAIL/NOT RUN aktual; dokumentasi bukan pengganti runtime.
4. Perbarui PROGRESS/HANDOFF; keputusan arsitektur baru dicatat di DECISIONS.
5. Claude Website perlu file relevan; jangan kirim foto pribadi, `.env` atau checkpoint.
