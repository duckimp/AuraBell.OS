# AuraBell.OS

**Sistem otomasi bel sekolah, pengumuman suara, dan manajemen media audio.**

AuraBell.OS adalah aplikasi desktop lokal untuk membantu operator sekolah mengatur jadwal bel, memanggil siswa atau guru dengan Text-to-Speech (TTS), serta mengelola audio sekolah dalam satu aplikasi.

> **Status:** Dalam pengembangan. Uji aplikasi dan pastikan jadwal serta volume audio sesuai kondisi sekolah sebelum digunakan untuk operasional.

## Fitur

- Jadwal bel untuk mode **Reguler**, **Ujian**, dan **Ramadan**, dengan pengaturan waktu, hari, status aktif, dan audio per jadwal.
- Suara jadwal berupa nada bawaan, file audio lokal, TTS, atau nada yang diikuti pengumuman TTS.
- Scheduler desktop berjalan saat AuraBell.OS terbuka, termasuk saat jendela disembunyikan ke system tray.
- Panggilan suara untuk siswa, guru, karyawan, dan pengumuman umum, dengan teks yang dapat diedit sebelum dibacakan.
- Pilihan TTS **Suara Sistem** atau **Piper Offline** untuk desktop. Linux mencoba Speech Dispatcher dengan voice Bahasa Indonesia lalu beralih ke Piper jika gagal; platform desktop lain menggunakan Web Speech API dan fallback ke Piper.
- Pemilihan suara TTS pria/wanita di mode browser, mengikuti voice yang tersedia pada sistem.
- Playlist audio, pemutar dengan kontrol play/pause, seek, loop, dan volume.
- Impor file audio lokal. Di desktop, file disalin ke penyimpanan aplikasi agar tetap tersedia setelah aplikasi ditutup.
- Pengaturan identitas sekolah dan backup/restore.

## Unduh installer

Build berjalan lewat GitHub Actions pada push ke branch `main`, atau bisa dijalankan manual:

1. Buka tab **Actions** di GitHub.
2. Pilih workflow **Build desktop installers**.
3. Klik **Run workflow** jika ingin memulai secara manual.
4. Setelah kedua job selesai, buka hasil run dan unduh artifact:
   - `AuraBell-OS-Linux-deb` untuk Linux.
   - `AuraBell-OS-Windows-exe` untuk Windows.

Artifact disimpan selama 14 hari. Workflow mengunggah installer sebagai artifact dan **tidak membuat GitHub Release** secara otomatis.

## Menjalankan untuk pengembangan

### Persyaratan umum

- Node.js 22 atau lebih baru
- npm
- Rust stable dan Cargo untuk menjalankan atau membangun aplikasi desktop Tauri

### Jalankan frontend di browser

```bash
npm ci
npm run dev
```

Buka alamat lokal yang ditampilkan Vite, biasanya `http://localhost:5173`.

Mode browser berguna untuk melihat antarmuka. **Scheduler bel native dan fitur system tray hanya tersedia di aplikasi desktop.** File audio yang dipilih di browser menggunakan URL sementara dan tidak ikut tersimpan permanen.

### Jalankan aplikasi desktop

Siapkan dependensi sistem Tauri untuk platformmu sesuai [prasyarat Tauri v2](https://v2.tauri.app/start/prerequisites/), lalu jalankan:

```bash
npm ci
npm run tauri -- dev
```

Build desktop pertama memerlukan internet untuk mengunduh binary Piper dan model suara yang dipatok. Untuk memeriksa sintesis lokal secara langsung, jalankan `npm run verify:tts`.

### Build lokal

Build frontend:

```bash
npm run build
```

Build desktop menggunakan bundler dan target sistem operasi yang tersedia:

```bash
npm run tauri -- build
```

Untuk build lokal Linux `.deb`:

```bash
npm run tauri -- build --bundles deb
```

Untuk Windows installer NSIS `.exe`, gunakan Windows dan NSIS:

```bash
npm run tauri -- build --bundles nsis
```

## Penyimpanan data dan backup

Aplikasi desktop menyimpan data jadwal, pengaturan, playlist, riwayat panggilan, dan hari libur sebagai JSON lokal di folder data aplikasi Tauri. File audio yang diimpor disimpan di subfolder audio lokal aplikasi.

Buka **Pengaturan Sekolah → Backup & Restore**:

- Backup desktop berupa ZIP berisi data aplikasi dan file audio lokal.
- Restore desktop menyalin kembali audio dan memperbarui rujukan file untuk perangkat baru. Restore mengganti data aplikasi yang sedang digunakan.
- Mode browser membuat backup JSON. File audio browser tidak disertakan.

Simpan backup di lokasi terpisah dari komputer aplikasi, misalnya penyimpanan eksternal atau folder aman sekolah.

## Batasan dan catatan

- Scheduler otomatis memerlukan aplikasi desktop tetap berjalan. Menutup jendela dengan tombol **X** menyembunyikan aplikasi ke tray; memilih **Keluar** dari menu tray menghentikan scheduler.
- Penjadwalan dan pemutaran bel tetap bergantung pada komputer menyala, aplikasi aktif, serta perangkat audio yang tersedia.
- Aplikasi desktop menyediakan pilihan voice sistem atau Piper Offline Bahasa Indonesia. Linux menggunakan Speech Dispatcher dan memerlukan paket `speech-dispatcher` serta voice Indonesia yang tersedia; installer `.deb` merekomendasikan paket tersebut. Jika engine sistem gagal, aplikasi memberi tahu lalu memakai Piper. Piper hanya memiliki satu speaker, jadi pilihan pria/wanita berlaku untuk voice sistem; mode browser tetap bergantung pada Web Speech API dan voice yang tersedia.
- Build desktop mengunduh resource Piper dan model suara yang versinya dipatok serta checksum SHA-256-nya diverifikasi. Setelah terpasang, sintesis TTS berjalan lokal tanpa internet. Ukuran installer bertambah karena engine, phonemizer, dan model ikut dibundel.
- Engine Piper dijalankan hanya saat TTS dibutuhkan, tetapi pemakaian RAM naik sementara selama sintesis; uji pada komputer sekolah sebelum digunakan rutin.
- Impor YouTube memerlukan internet serta `yt-dlp` dan FFmpeg tersedia di sistem. Kedua program tersebut tidak dibundel bersama installer saat ini.
- Data bawaan yang ditampilkan saat instalasi baru hanyalah konfigurasi awal; atur nama sekolah dan jadwal sendiri sebelum digunakan.
- Panel zona speaker belum mengendalikan perangkat atau routing speaker terpisah.

Resource TTS pihak ketiga menggunakan Piper CLI dari [rhasspy/piper](https://github.com/rhasspy/piper) versi `2023.11.14-2` dan model [Indonesian News TTS Q8](https://huggingface.co/okasi/piper-indonesian-news-tts-onnx-q8). Lisensi disertakan bersama resource di installer.

## Teknologi

- React, TypeScript, Vite, Tailwind CSS, dan Lucide
- Tauri v2 dengan backend Rust
- Penyimpanan data JSON lokal
- HTML Audio, Web Audio API, dan Web Speech API

## Kontribusi

Issue dan pull request sangat dipersilakan. Untuk perubahan besar, buka issue terlebih dahulu agar ruang lingkup dan rancangan dapat dibahas.

## Pembuat

Dibuat oleh **Andi Mariono** — [GitHub @duckimp](https://github.com/duckimp).
