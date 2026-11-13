# AuraBell.OS

**Sistem otomasi bel sekolah, pengumuman suara, dan manajemen media audio.**

AuraBell.OS menyediakan desktop untuk jadwal bel dan audio sekolah, serta PWA untuk mengirim panggilan Text-to-Speech (TTS) dari perangkat mobile ke komputer TU.

> **Status:** Dalam pengembangan. Uji aplikasi dan pastikan jadwal serta volume audio sesuai kondisi sekolah sebelum digunakan untuk operasional.

Catatan handoff untuk melanjutkan pengembangan lintas perangkat tersedia di [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md). File itu ikut Git; `.env.local` dan kredensial tidak.

## Fitur

- Jadwal bel untuk mode **Reguler**, **Ujian**, dan **Ramadan**, dengan pengaturan waktu, hari, status aktif, dan audio per jadwal.
- Suara jadwal desktop berupa nada bawaan atau file audio lokal.
- Scheduler desktop berjalan saat AuraBell.OS terbuka, termasuk saat jendela disembunyikan ke system tray.
- Dashboard menampilkan jadwal berikutnya, status scheduler/receiver, peringatan volume/audio, tes output, dan pratinjau sirene darurat 5 detik.
- Bisa melewati satu kejadian jadwal berikutnya dengan konfirmasi; jadwal rutin tidak diubah. Riwayat aktivitas bel lokal menampilkan 30 kejadian terakhir dan status pemutarannya.
- Panggilan suara untuk siswa, guru, karyawan, dan pengumuman umum, dengan teks yang dapat diedit sebelum dibacakan.
- Login email/password Supabase; PWA mobile mengirim pengumuman TTS remote ke desktop komputer TU.
- Kontrol remote untuk memilih dan memutar lagu dari pustaka komputer TU, termasuk jeda dan berhenti. File lagu tidak dikirim melalui Supabase.
- Tampilan browser/PWA khusus untuk membuat dan mengirim panggilan TTS; PWA tidak menjadi receiver atau pemutar bel/audio senam.
- Desktop TU menerima pengumuman TTS PWA dan perintah audio senam remote. Jadwal bel dan pemutaran audio senam tetap dijalankan desktop.
- Pengumuman remote yang dikirim dari PWA dibacakan oleh voice WebView yang tersedia di desktop TU.
- Pemilihan suara TTS pria/wanita di PWA, mengikuti voice browser yang tersedia pada perangkat pengirim.
- Playlist audio, pemutar dengan kontrol play/pause, seek, loop, dan volume.
- Impor file audio lokal. Di desktop, file disalin ke penyimpanan aplikasi agar tetap tersedia setelah aplikasi ditutup; sirene darurat juga dapat memakai file dari pustaka.
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

## Supabase dan PWA

1. Salin `.env.example` menjadi `.env.local`, lalu isi URL project Supabase dan publishable key. `.env.local` sudah diabaikan Git. Nilai ini dibaca saat build dan dibenamkan ke aplikasi; mengubah environment setelah installer dibuat tidak mengubah konfigurasi installer tersebut. Publishable key memang digunakan di browser; jangan pernah menaruh `service_role` key atau secret key di frontend.
2. Jalankan SQL secara berurutan melalui Supabase SQL Editor: `supabase/migrations/20261110_remote_announcements.sql`, lalu `supabase/migrations/20261110_remote_audio_controls.sql`.
3. Di Supabase Authentication, nonaktifkan pendaftaran publik, lalu buat akun petugas melalui **Authentication → Users** dan atur URL aplikasi pada **URL Configuration**. Rate limit Supabase Auth aktif secara default; antarmuka login juga memberi jeda setelah respons HTTP 429. Remote control mengizinkan pengguna terautentikasi mengirim pengumuman ke satu sekolah, jadi hanya undang akun yang dipercaya.
4. Di Vercel, impor repository ini, gunakan build command `npm run build` dan output directory `dist`, lalu tambahkan environment variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`. Untuk installer desktop dari GitHub Actions, tambahkan dua nilai yang sama sebagai repository **Actions Variables** atau **Actions Secrets** dengan nama tersebut. Workflow menggunakan Variables lebih dulu, lalu Secrets, dan menghentikan build jika salah satu nilai belum tersedia. Setelah deploy, tambahkan domain Vercel ke Supabase **URL Configuration / Redirect URLs**.
5. Login di komputer TU pada aplikasi AuraBell.OS desktop, aktifkan **Pengaturan Sekolah → Penerima Pengumuman Remote**, lalu biarkan desktop terbuka atau minimize ke tray dan komputer tetap tersambung internet. Desktop menjalankan jadwal bel lokal, menyimpan/memutar audio senam, serta membacakan TTS yang diterima.
6. Login ke PWA di ponsel atau komputer pengirim, buka **Panggilan Suara**, lalu tekan **Kirim ke Ruang TU**. PWA hanya menjadi pengirim TTS; pengumuman dibacakan oleh desktop TU. Untuk akses seperti aplikasi, di Chrome/Edge pilih **Install app** atau **Install this site as an app**.

Supabase menangani autentikasi, antrean pengumuman, katalog metadata pustaka audio receiver, dan perintah kontrol audio remote. Jadwal dan berkas audio tetap tersimpan lokal di komputer TU; Supabase tidak mengunggah isi file audio. Pengirim dan desktop receiver memerlukan internet. Teks pengumuman dikirim ke Supabase dan dibacakan oleh voice WebView yang tersedia di komputer TU; uji suara di desktop sebelum operasional. PWA pengirim tidak perlu dibiarkan terbuka setelah perintah terkirim.

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

Mode browser berguna untuk melihat antarmuka. **Scheduler bel native dan fitur system tray hanya tersedia di aplikasi desktop.** File audio yang diimpor di browser disimpan di IndexedDB dan tetap tersedia setelah refresh pada browser dan origin yang sama.

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

Aplikasi desktop menyimpan data jadwal, pengaturan, playlist, riwayat panggilan, riwayat bel, dan hari libur sebagai JSON lokal di folder data aplikasi Tauri. File audio yang diimpor disimpan di subfolder audio lokal aplikasi.

Saat bel manual, bel terjadwal, atau sirene darurat berbunyi, volume musik player otomatis diredam sementara. Besar volume musik saat prioritas bel dapat diatur di **Pengaturan Sekolah → Prioritas Bel di Atas Musik** (default 20% dari volume player); volume kembali normal setelah bel/pengumuman selesai atau dihentikan. Audio bel WAV/MP3 tetap diputar melalui jalur audionya sendiri.

Untuk memakai sirene darurat sendiri, impor file MP3/WAV melalui halaman **Senam & Audio**, lalu pilih track tersebut di **Pengaturan Sekolah → Audio Bel Darurat**. Audio pilihan akan berulang sampai tombol **Hentikan Bel** ditekan; pilih **Sirene bawaan AuraBell.OS** untuk kembali ke nada sirene sintetis. File tersimpan lokal di perangkat/browser tersebut dan tidak disinkronkan antarperangkat.

Dashboard menyediakan **Tes Output Audio** untuk mencoba nada ke perangkat audio yang sedang dipakai, dan **Pratinjau Sirene (5 dtk)** untuk memeriksa sirene tanpa mengaktifkan kejadian darurat. Riwayat bel menyimpan maksimal 30 aktivitas di perangkat tersebut; pengumuman remote tetap tercatat terpisah di riwayat panggilan.

Tombol **Lewati bel berikutnya** hanya tersedia di aplikasi desktop saat bel otomatis aktif. Setelah konfirmasi, satu kejadian jadwal yang ditampilkan dilewati tanpa mengubah jadwal rutin dan tanpa membuat catatan. Permintaan skip hanya berlaku selama aplikasi berjalan; jika aplikasi ditutup sebelum waktunya, skip tersebut tidak tersimpan.

Buka **Pengaturan Sekolah → Backup & Restore**:

- Backup desktop berupa ZIP berisi data aplikasi dan file audio lokal.
- Restore desktop menyalin kembali audio dan memperbarui rujukan file untuk perangkat baru. Restore mengganti data aplikasi yang sedang digunakan.
- Mode browser menyimpan jadwal/pengaturan/metadata playlist di localStorage, sedangkan file audio yang diimpor disimpan di IndexedDB browser. File tetap tersedia setelah refresh pada browser dan origin yang sama, tetapi tidak tersinkron ke perangkat lain dan tidak dikirim ke Supabase.
- Backup browser berupa JSON dan tidak menyertakan file audio IndexedDB. Menghapus data situs/browser dapat menghapus file lokal; buat salinan file audio terpisah untuk arsip.

Simpan backup di lokasi terpisah dari komputer aplikasi, misalnya penyimpanan eksternal atau folder aman sekolah.

## Batasan dan catatan

- Scheduler otomatis memerlukan aplikasi desktop tetap berjalan. Menutup jendela dengan tombol **X** menyembunyikan aplikasi ke tray; memilih **Keluar** dari menu tray menghentikan scheduler.
- Penjadwalan dan pemutaran bel tetap bergantung pada komputer menyala, aplikasi aktif, serta perangkat audio yang tersedia.
- Aplikasi desktop menyediakan pilihan voice sistem atau Piper Offline Bahasa Indonesia. Linux menggunakan Speech Dispatcher dan memerlukan paket `speech-dispatcher` serta voice Indonesia yang tersedia; installer `.deb` merekomendasikan paket tersebut. Jika engine sistem gagal, aplikasi memberi tahu lalu memakai Piper. Piper hanya memiliki satu speaker, jadi pilihan pria/wanita berlaku untuk voice sistem; mode browser memakai voice Indonesia Web Speech yang tersedia dan mendahulukan Google Bahasa Indonesia bila browser menyediakannya. Voice Google berasal dari browser dan tidak dibundel bersama aplikasi.
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
