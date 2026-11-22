# Prompt untuk Claude Code — Prototype Aplikasi OILINK

> Salin semua isi di bawah garis ini ke Claude Code.

---

## Peran & tujuan

Kamu adalah engineer full-stack. Bangun **prototype web app OILINK** yang bisa dibuka siapa saja lewat link publik (untuk demo lomba bisnis INTION 3.0). Prototype harus terasa seperti aplikasi sungguhan di HP, tapi **semua data sensor disimulasikan** — belum ada hardware sungguhan.

Sebelum menulis kode, tulis rencana singkat (struktur folder, komponen, model data), lalu kerjakan bertahap sesuai urutan di bagian "Urutan pengerjaan". Setelah tiap tahap, jalankan build dan pastikan tidak ada error.

## Tentang OILINK

OILINK menyewakan **sensor IoT** (sensor ultrasonik + ESP32) kepada **pengepul oli bekas**. Pengepul memasang sensor di drum penampungan oli di bengkel-bengkel langganannya. Sensor mengukur tinggi permukaan oli, lalu aplikasi menampilkan isi drum, mengirim notifikasi saat drum hampir penuh, dan membantu menyusun rute penjemputan.

- **Pengguna utama:** pengepul oli bekas (yang membayar).
- **Pengguna sekunder:** bengkel (tempat sensor dipasang, gratis).
- Oli bekas adalah limbah B3, jadi setiap penjemputan dicatat sebagai **serah terima** (Digital Waste Passport).

### Paket langganan pengepul

| Fitur | Basic | Pro |
|---|---|---|
| Notifikasi saat drum mencapai ambang | ✓ (ambang default 80%) | ✓ (ambang bisa diatur per bengkel, dalam liter atau %) |
| Daftar bengkel yang siap dijemput + rute sederhana | ✓ | ✓ |
| Dashboard isi semua drum secara langsung (inventory) | – | ✓ |
| Prediksi kapan drum penuh | – | ✓ |
| Pilih beberapa bengkel → rute paling efisien sesuai kapasitas kendaraan | – | ✓ |
| Riwayat & laporan serah terima (Waste Passport), ekspor CSV | – | ✓ |

Fitur Pro yang dikunci di akun Basic tetap **terlihat** tapi dengan gembok + ajakan "Upgrade ke Pro" (penting untuk demo model bisnis).

## Stack (wajib, supaya gratis dan gampang dideploy)

- **Vite + React + TypeScript + Tailwind CSS**
- **React Router** untuk halaman
- **Leaflet + react-leaflet + OpenStreetMap tiles** untuk peta (tanpa API key)
- **qrcode** (generate QR) dan **html5-qrcode** (scan QR pakai kamera HP)
- **Recharts** untuk grafik riwayat isi drum
- **Zustand** untuk state, dipersist ke **localStorage**
- Tanpa backend di versi ini. Seluruh data ada di browser; tombol "Reset data demo" mengembalikan data awal.
- Jadikan **PWA** (manifest + service worker via `vite-plugin-pwa`) supaya bisa "Add to Home Screen".
- Deploy ke **Vercel** (atau GitHub Pages). Pastikan routing SPA tidak 404 saat refresh (tambahkan `vercel.json` rewrite atau `404.html` untuk GitHub Pages).

## Data demo (seed)

Buat data awal yang realistis di sekitar **Kota Magelang** (sekitar lat -7.47, lng 110.22). Pakai **nama bengkel fiktif**, bukan nama bengkel sungguhan.

- 1 pengepul: "UD Sumber Oli Magelang (Demo)", kendaraan pick-up kapasitas 600 L, lokasi gudang di Magelang.
- 10–12 bengkel fiktif tersebar di Kota & Kabupaten Magelang. Tiap bengkel punya: id, nama, alamat singkat, koordinat, nomor WA dummy, kapasitas drum (campur 100 L dan 200 L), jenis oli (motor/mobil/campur), status sensor (online/offline), dan **riwayat isi drum 14 hari** (data per jam atau per 6 jam) dengan laju pengisian berbeda-beda per bengkel.
- Isi awal bervariasi: beberapa di atas 80%, beberapa sedang, satu-dua hampir kosong, satu sensor offline.

## Simulator sensor

- Mesin simulasi yang menaikkan isi tiap drum dari waktu ke waktu sesuai laju bengkel itu (sedikit acak).
- Kontrol simulasi di halaman Pengaturan: **Jeda / Jalan**, kecepatan (1×, 60×, 600× — supaya saat demo drum terlihat terisi), dan tombol "Isi drum X sekarang" untuk memicu notifikasi.
- Hitung volume dari "jarak sensor ke permukaan oli" seperti sensor ultrasonik asli: simpan nilai `distance_cm` mentah, lalu konversi ke liter berdasarkan tinggi drum. Tampilkan keduanya di halaman detail (bagus untuk juri teknik).
- Buat lapisan data dengan interface `SensorSource` supaya nanti simulator bisa diganti data ESP32 sungguhan tanpa mengubah UI.

## Halaman & fitur

Semua teks UI dalam **Bahasa Indonesia**. Desain **mobile-first** (target 390 px), tetap rapi di desktop. Navigasi bawah (bottom tab) di HP.

### 0. Halaman pembuka / pilih mode demo
- Logo OILINK + tagline "Sewa sensor IoT + aplikasi pemantauan untuk pengepul oli bekas".
- Tombol: **Masuk sebagai Pengepul (Basic)**, **Masuk sebagai Pengepul (Pro)**, **Lihat sebagai Bengkel**. Tanpa login sungguhan.
- Banner kecil: "Prototype — data sensor disimulasikan".
- Di dalam app, sediakan saklar cepat Basic ⇄ Pro supaya juri bisa membandingkan.

### 1. Beranda pengepul
- Ringkasan: jumlah bengkel, total liter siap jemput, jumlah drum di atas ambang, sensor offline.
- Daftar "Siap dijemput" (urut dari paling penuh), tiap kartu: nama bengkel, progress bar isi drum (liter & %), jarak dari gudang, waktu update terakhir.

### 2. Peta
- Semua bengkel sebagai marker berwarna sesuai isi (hijau < 50%, kuning 50–ambang, merah ≥ ambang, abu-abu offline). Warna dibedakan juga lewat ikon/label, bukan warna saja.
- Klik marker → ringkasan + tombol "Lihat detail" dan "Tambah ke rute".

### 3. Detail bengkel
- Info bengkel, ilustrasi drum yang terisi sesuai volume, nilai `distance_cm` mentah dan liter.
- Grafik riwayat isi 14 hari (Pro; Basic melihat versi terkunci).
- **Prediksi penuh (Pro):** regresi linear dari data 48 jam terakhir → "Diperkirakan mencapai ambang dalam ± X jam (perkiraan hari/jam)". Tampilkan "tidak cukup data" jika datanya kurang.
- **Pengaturan ambang (Pro):** slider/input liter atau %, per bengkel.
- Tombol "Hubungi via WhatsApp" (link `wa.me` ke nomor dummy).

### 4. Perencana rute
- **Basic:** otomatis memakai semua bengkel di atas ambang, diurutkan dengan nearest-neighbor dari gudang.
- **Pro:** pengepul mencentang bengkel (misalnya A, B, C, D), lalu sistem menyusun rute paling efisien:
  - Algoritma: nearest-neighbor lalu diperbaiki dengan **2-opt**. Jarak memakai rumus haversine (garis lurus) — tulis catatan kecil di UI bahwa jarak masih perkiraan.
  - **Batasan kapasitas kendaraan:** jika total liter melebihi kapasitas, pecah jadi beberapa trip, atau beri peringatan dan saran bengkel mana yang ditunda.
  - Tampilkan: urutan stop, total jarak, perkiraan waktu, total liter, garis rute di peta, dan perbandingan "jarak jika dikunjungi sesuai urutan daftar vs. rute optimal" (bukti nilai fitur).
  - Tombol "Buka di Google Maps" yang membuat URL rute multi-stop.
- Sebut fitur ini **"Optimasi Rute"** di UI, bukan "AI".

### 5. Penjemputan & serah terima (Digital Waste Passport)
- Saat di bengkel, pengepul menekan "Mulai serah terima" → **scan QR** drum bengkel pakai kamera (sediakan juga input kode manual sebagai cadangan, karena kamera butuh HTTPS dan izin).
- Form: volume terambil (default = isi drum), jenis oli, catatan → simpan.
- Setelah tersimpan: isi drum direset ke ~0, lalu dibuat **bukti serah terima** (ID, waktu, bengkel, pengepul, volume, jenis oli) dengan QR-nya sendiri dan tombol "Kirim bukti ke bengkel via WhatsApp" (pesan teks terformat).
- Langkah kedua opsional: "Serahkan ke pengelola berizin" (nama pengelola fiktif) supaya rantai bengkel → pengepul → pengelola terlihat lengkap.

### 6. Riwayat & laporan (Pro)
- Tabel semua serah terima, filter per bengkel/tanggal, total liter per bulan, **ekspor CSV**.

### 7. Notifikasi
- Ikon lonceng dengan daftar notifikasi di dalam app ("Drum Bengkel X mencapai 160 L (80%)").
- Jika izin diberikan, tampilkan juga **browser Notification**. Kalau ditolak atau tidak didukung, cukup notifikasi di dalam app.

### 8. Tampilan bengkel
- Halaman sederhana untuk bengkel: isi drum mereka, jadwal jemput berikutnya (jika ada di rute), riwayat serah terima mereka, dan **QR drum** yang bisa dicetak/diunduh.

### 9. Pengaturan
- Saklar paket Basic/Pro, kontrol simulator, kapasitas kendaraan, lokasi gudang, "Reset data demo".
- Halaman "Tentang prototype": penjelasan singkat cara kerja sensor ultrasonik (jarak → tinggi → liter) dan bahwa data masih simulasi.

## Desain

- Warna utama **teal** (sesuai BMC OILINK), aksen kuning/oranye untuk peringatan, latar terang. Kontras teks minimal 4.5:1.
- Font: Inter atau Plus Jakarta Sans.
- Komponen rapi dan konsisten: kartu, progress bar, badge status, bottom sheet untuk aksi di HP. Tombol minimal 44 px.
- Tanpa emoji sebagai ikon; pakai `lucide-react`.

## Kualitas

- TypeScript strict, tanpa `any` yang tidak perlu.
- Pisahkan logika murni (konversi jarak→liter, prediksi, algoritma rute) ke folder `src/lib/` dan beri **unit test dengan Vitest** (minimal: konversi volume, regresi prediksi, 2-opt memperpendek rute, pemecahan trip sesuai kapasitas).
- README berisi: deskripsi singkat, cara menjalankan lokal, cara deploy ke Vercel, skenario demo 3 menit untuk juri, dan rencana integrasi ESP32.

## Urutan pengerjaan

1. Setup proyek, Tailwind, router, layout + bottom nav, halaman pembuka.
2. Model data, seed data Magelang, store Zustand + localStorage, simulator sensor.
3. Beranda, peta, detail bengkel (termasuk grafik & prediksi).
4. Perencana rute (Basic & Pro) + unit test algoritma.
5. Serah terima: QR generate/scan, bukti serah terima, riwayat & CSV.
6. Notifikasi, tampilan bengkel, pengaturan, pembatasan fitur Basic/Pro.
7. PWA, polishing UI, README, konfigurasi deploy.
8. Jalankan `npm run build` dan semua test; perbaiki sampai bersih. Lalu beri saya langkah deploy ke Vercel yang bisa saya ikuti.

## Rencana integrasi ESP32 (tulis di README, belum perlu diimplementasikan)

Jelaskan cara mengganti simulator dengan data sungguhan: ESP32 + sensor ultrasonik (mis. JSN-SR04T yang tahan cipratan) mengirim `{ sensor_id, distance_cm, timestamp }` lewat HTTPS ke backend (mis. Supabase: tabel `readings` + REST insert dengan API key per perangkat), lalu `SensorSource` di frontend membaca dari Supabase Realtime. Sertakan contoh skema tabel dan contoh payload.

## Yang TIDAK perlu di versi ini

- Login/akun sungguhan, pembayaran, backend, atau hardware.
- Jangan pakai nama bengkel, pengepul, atau pengelola sungguhan.
