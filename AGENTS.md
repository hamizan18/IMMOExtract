# IMMOExtract — AI Coding Agent Instructions

## Tujuan

Bantu mengembangkan IMMOExtract secara **bertahap, terukur, aman, dan bisa dilanjutkan lintas agent**: OMP (utama), Antigravity CLI (cadangan), Claude Website (cadangan). Jangan menganggap isi percakapan atau source dari agent lain tersedia secara otomatis.

## Sumber kebenaran dan urutan membaca

1. `docs/PROJECT_SPEC.md` — apa yang harus dibangun, batas MVP.
2. `docs/ARCHITECTURE.md` — tanggung jawab service dan rancangan integrasi.
3. `docs/DECISIONS.md` — keputusan yang sudah disepakati dan yang masih terbuka.
4. `docs/PROGRESS.md` — milestone, verifikasi aktual, tugas saat ini.
5. `docs/HANDOFF.md` — status tepat saat pergantian agent, errors dan next action.

**Sebelum coding:** periksa file yang benar-benar ada dan `git status`. Dokumen awal bukan bukti bahwa aplikasi sudah berjalan. Hindari membaca seluruh repo ketika file relevan sudah cukup.

## Aturan eksekusi

- Kerjakan **satu milestone / satu tugas kecil** dahulu.
- **M1 hanya scaffold, health checks, dan koneksi Express↔FastAPI**; jangan memasang model AI atau membuat UI penuh di M1.
- Pertahankan stack: Vite + Vanilla JS + Tailwind; Express.js; FastAPI; AI lokal.
- Ubah file terkait saja. Jangan overwrite implementasi yang bekerja tanpa inspeksi dan alasan.
- Hindari dependensi dan framework tambahan tanpa kebutuhan nyata.
- Jangan download model besar, hapus file, reset Git, mengubah struktur besar, atau menjalankan tindakan destruktif tanpa izin eksplisit pengguna.
- Pisahkan fakta, asumsi, dan saran. Jika fitur tidak tersedia, katakan belum tersedia; jangan mock sebagai hasil AI asli.
- Pastikan file hasil dan metadata pengguna tidak bocor lewat static folder atau Git.
- Untuk kesalahan/error: sebut penyebab yang terbukti, bukan berspekulasi sebagai kepastian.
- Jangan mengklaim suatu tes PASS jika belum dieksekusi. Jika tidak dapat dijalankan: tulis `NOT RUN` beserta alasannya.
- Jangan lanjut ke milestone berikutnya bila acceptance criteria saat ini belum terpenuhi.

## Prinsip pengembangan

- Local-first; tanpa API AI cloud untuk inferensi.
- Original extracted PNG + ZIP harus bisa diunduh tanpa proses pixel art.
- Classic Pixelation dan AI Stylization adalah mode berbeda.
- Semantic parsing tidak otomatis menjamin pemisahan setiap objek/instance yang berdekatan.
- Prioritas: keandalan ekstraksi → unduhan → pixelation → AI generatif.
- Gunakan error yang jelas, kode sederhana, mudah diuji dan dipelajari.
- Jelaskan keputusan teknis untuk developer pemula dalam Bahasa Indonesia, tetapi jangan cetak ulang semua source code jika memiliki akses workspace.

## Keamanan dasar

- Validasi file secara defensif (signature, ukuran, dimensi, path).
- Jangan commit `.env`, foto pribadi, model checkpoints, `storage/jobs`, `.venv`, `node_modules`.
- API AI lokal bind pada `127.0.0.1` jika berada dalam satu komputer.
- Gunakan ID job acak dan hanya file yang terdaftar di manifest yang boleh diunduh.
- Jaga kerahasiaan data pengguna; jangan unggah foto pribadi ke AI website tanpa persetujuan.

## Bentuk respons setiap selesai tugas

Singkat dan faktual:

```text
Task:
Files changed:
Tests actually executed: [command + PASS/FAIL/NOT RUN]
Known issues:
Next single task:
```

Lalu perbarui `docs/PROGRESS.md` dan `docs/HANDOFF.md` berdasarkan fakta; jika keputusan teknis berubah, perbarui `docs/DECISIONS.md`.

## Git dan handoff

- Periksa `git status` dan `git diff` sebelum mengubah file.
- Buat commit hanya setelah langkah yang dapat diuji berhasil, dan jangan commit perubahan pengguna tanpa persetujuan.
- Jangan menyamakan pembaruan dokumen dengan keberhasilan implementasi.
- Saat pindah agent: tulis file berubah, tes sungguhan, error, perubahan belum commit, dan satu tindakan berikutnya di `HANDOFF.md`.
- Claude Website tidak memiliki akses filesystem lokal secara default; ia harus diberi file relevan, kemudian patch/perubahan yang dihasilkannya diuji dan diterapkan ke workspace oleh pengguna/agent yang memiliki akses.

## Automatic Progress Checkpoints

Untuk menghindari kehilangan progres saat AI agent berganti atau kuota habis:

1. Setelah menyelesaikan satu tugas kecil yang dapat diuji, perbarui `docs/PROGRESS.md`.
    
2. Setelah perubahan penting berhasil diuji, perbarui `docs/HANDOFF.md`.
    
3. Sebelum mengerjakan tugas besar berikutnya, pastikan dokumentasi sesuai kondisi kode saat ini.
    
4. Jangan menunggu seluruh milestone selesai untuk menyimpan progres.
    
5. Jangan melakukan Git commit otomatis tanpa instruksi pengguna.
    
6. Jika perlu berhenti karena batas penggunaan, prioritaskan penyimpanan keadaan proyek daripada melanjutkan implementasi.
    
7. Jangan mengklaim progres atau hasil tes yang belum diverifikasi.
    

Tujuannya adalah menjaga proyek dapat dilanjutkan kapan saja oleh OMP, Antigravity, atau Claude.