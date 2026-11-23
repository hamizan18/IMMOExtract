# IMMOExtract — AI Handoff

> **Untuk agent berikutnya:** evaluasi satu foto full-body berizin selesai. SCHP menghasilkan dua sepatu dan sembilan kategori; kontrak piksel PASS, kualitas kategori belum bersih. Berikutnya koreksi crop Pants melalui UI, bukan tuning model.

## Last agent

OMP — evaluasi SCHP lokal satu foto full-body berizin, 2026-11-23.

## Current milestone / task

M7 — penerimaan lokal pascapenutupan implementasi D-047. Evaluasi full-body selesai tanpa perubahan source; penerimaan kualitas umum tetap terbatas.

## Last completed task

- Git awal PROGRESS/HANDOFF modified, index kosong; perubahan sebelumnya dipertahankan. Tidak staging/commit atau memeriksa Git ulang setelah edit.
- Inventaris lokal tidak menemukan foto full-body dengan bukti izin; foto storage pengguna tidak dibuka/digunakan. Pengguna mengizinkan satu unduhan baru untuk evaluasi lokal.
- Foto [Man Standing — Visitor7](https://commons.wikimedia.org/w/index.php?title=File:Man_Standing.jpg&oldid=1257378181), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), JPEG 762×952, 589.317 byte. SHA-1 cocok metadata Commons; input tidak dimodifikasi. Atribusi/lisensi dan perubahan turunan dicatat dalam provenance.
- `HumanExtractor` dan `save_category_objects` existing, CPU dua thread: load 1,3351 s, satu inferensi 3,7067 s. Foreground 138.055 piksel (19,0309%); sembilan crop tersimpan. Tidak memuat SD15 atau mengubah model/threshold.
- Semua piksel RGB/alpha, mask PNG, bbox/count/dimensi crop, non-overlap dan input unchanged PASS. Review visual tetap menemukan salah label/mask; jumlah piksel bukan confidence/akurasi.

## Artefak dan batas visual

- Bukti ignored baru: `scratch/schp-fullbody-20261123/` — `input.jpg`, `provenance.json`, `report.json`, `human.png`, `mask.png`, `classes.png`, `classes-color.png`, `objects/` (sembilan PNG), `review.png`, `categories-review.png`.
- SHA-256 input `034e369c0de1578fbcc0eb12e524d546405ca46ae45f340280971eb2577dfd98`; source JPEG utuh, RGB acuan adalah hasil decode Pillow. Turunan lokal mengikuti atribusi/lisensi CC BY-SA 3.0; tidak dibundel ke source proyek.
- Prediksi: Hair 1.622; Upper-clothes 63.077; Pants 54.260; Belt 2.182; Left-shoe 1.816; Right-shoe 2.710; Face 7.393; Left-arm 2.784; Right-arm 2.211 piksel.
- Siluet utama dan dua sepatu terpisah dari background. Fragmen celana tungkai bawah sisi kiri gambar salah masuk Upper-clothes, meninggalkan lubang pada Pants. Kacamata tetap di Face, tidak menghasilkan Sunglasses. Crop tangan menyertakan fragmen sabuk/pakaian di sela jari; batas halus belum bersih.
- Pants bbox `[404,467,590,879]`, 186×412; Upper-clothes bbox `[330,201,683,806]` meluas akibat fragmen jauh di tungkai. Koordinat right/bottom eksklusif; crop tidak boleh dianggap full-frame.
- Kaki/lengan tertutup pakaian, tangan menutupi pinggang; tidak dapat menilai bagian tersembunyi. Tanpa ground-truth mask/IoU atau klaim penerimaan umum. Artefak astronaut dari dua sesi sebelumnya tetap utuh.

## Modified files / uncommitted changes

- `docs/PROGRESS.md`, `docs/HANDOFF.md` — diperbarui di atas perubahan belum commit sebelumnya.
- Folder bukti ignored baru tercantum di atas. Tidak ada source, test permanen, script sementara di disk, dependensi, checkpoint atau konfigurasi yang diubah.
- Git awal dua dokumen modified; index kosong. Tidak staging/commit.
- DECISIONS tidak diubah: evaluasi pipeline existing, bukan keputusan arsitektur baru.

## Tests / checks performed

- **PASS inspeksi:** Git status/diff/index, inventaris foto lokal dan source extractor; LSP tidak dikonfigurasi.
- **PASS resource:** PowerShell CIM sebelum inferensi: RAM bebas 3.441.252 KiB/sisa virtual 9.520.064 KiB. Query berjalan bersama unduhan dan mencatat dua proses Python launcher/child; bukan klaim nol proses Python atau benchmark peak memory.
- **PASS unduhan:** `ai-service/.venv-test/Scripts/python.exe -` — satu JPEG setelah izin, ukuran/SHA-1 cocok metadata Commons, decode 762×952, provenance tersimpan.
- **PASS kontrak piksel:** `ai-service/.venv-test/Scripts/python.exe -` — satu inferensi SCHP 3,7067 s; RGB foreground/sembilan crop exact, alpha biner/class map, mask file, bbox padding/clipping, dimensi/count, non-overlap, hash input unchanged.
- **FAIL kualitas kategori bersih tanpa koreksi:** inspeksi source, `review.png` dan `categories-review.png` menemukan salah label celana, kacamata terlewat serta kontaminasi sela jari. Dua sepatu terpisah secara visual, bukan bukti akurasi universal.
- **NOT RUN:** browser/API, build, suite backend/Python, SD15, kamera/mobile; tidak ada perubahan perilaku aplikasi. Tidak menjalankan layanan atau membuat storage job, sehingga tidak ada layanan/storage uji untuk dibersihkan.

## Current errors / limitations

- Tidak menemukan error eksekusi pada evaluasi ini. Keterbatasan kualitas di atas belum diperbaiki; jangan mengubah model/threshold hanya berdasarkan satu sampel.
- Koreksi mask satu objek tidak memperbaiki class map atau objek kategori lain. Revisi Pants nantinya tidak otomatis menghapus fragmen salah dalam Upper-clothes.
- Izin unduhan sesi ini hanya satu foto yang sudah digunakan; jangan mengunduh tambahan tanpa persetujuan baru. Foto existing cukup untuk next action.
- Risiko existing: resource SD15, retensi/batas antrean/lifecycle otomatis, portabilitas/mobile/deployment publik serta lisensi redistribusi model belum ditutup.

## Next action (only one)

Koreksi objek Pants pada foto full-body existing `scratch/schp-fullbody-20261123/input.jpg` melalui UI nyata: pulihkan area celana yang salah masuk Upper-clothes, uji Undo/save serta PNG dan ZIP pilihan sesuai Canvas `toBlob`. Periksa offset bbox crop dan jangan mengklaim revisi Pants otomatis memperbaiki kategori Upper-clothes. Gunakan storage uji terisolasi, tanpa unduhan baru atau SD15.

## Handoff rules

1. Periksa repo sebelum edit; jangan menimpa perubahan pengguna.
2. Satu tugas kecil, tanpa commit otomatis atau perubahan stack.
3. Catat PASS/FAIL/NOT RUN aktual; dokumentasi bukan pengganti runtime.
4. Perbarui PROGRESS/HANDOFF; keputusan arsitektur baru dicatat di DECISIONS.
5. Claude Website perlu file relevan; jangan kirim foto pribadi, `.env` atau checkpoint.
