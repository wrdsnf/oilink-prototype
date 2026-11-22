# OILINK — Prototype Aplikasi

**OILINK** menyewakan sensor IoT (sensor ultrasonik + ESP32) kepada **pengepul oli bekas**. Sensor dipasang di drum penampungan oli di bengkel mitra; aplikasi menampilkan isi drum, memberi notifikasi saat hampir penuh, menyusun rute penjemputan, dan mencatat setiap penjemputan sebagai **bukti serah terima limbah B3 (Digital Waste Passport)**.

> Prototype untuk demo lomba bisnis INTION 3.0. **Semua data sensor disimulasikan** di browser — belum ada hardware atau backend. Semua nama bengkel, pengepul, dan pengelola adalah **fiktif**.

## Fitur

| Fitur | Basic | Pro |
|---|---|---|
| Notifikasi saat drum mencapai ambang (in-app + browser Notification) | ✓ ambang 80% | ✓ ambang per bengkel (L atau %) |
| Daftar bengkel siap dijemput + rute sederhana (nearest-neighbor) | ✓ | ✓ |
| Dashboard inventory semua drum | 🔒 | ✓ |
| Prediksi kapan drum penuh (regresi linear 48 jam) | 🔒 | ✓ |
| Optimasi Rute: pilih bengkel → nearest-neighbor + 2-opt, dipecah sesuai kapasitas kendaraan | 🔒 | ✓ |
| Riwayat & laporan serah terima, ekspor CSV | 🔒 | ✓ |

Fitur Pro tetap terlihat di akun Basic (diburamkan + tombol "Upgrade ke Pro"). Saklar Basic ⇄ Pro ada di header.

Lainnya: peta OpenStreetMap, detail bengkel (ilustrasi drum, `distance_cm` mentah → liter, grafik 14 hari), serah terima dengan scan QR (atau kode manual), bukti serah terima ber-QR + kirim via WhatsApp, rantai bengkel → pengepul → pengelola berizin, tampilan bengkel (isi drum, jadwal jemput, QR drum yang bisa dicetak/diunduh), simulator sensor, PWA.

## Stack

Vite + React 18 + TypeScript (strict) · Tailwind CSS v4 · React Router · Leaflet/react-leaflet + OSM · qrcode + html5-qrcode · Recharts · Zustand (persist ke localStorage) · vite-plugin-pwa · Vitest.

## Struktur

```
src/
  lib/            logika murni + unit test
    volume.ts       jarak sensor (cm) ⇄ liter
    prediction.ts   regresi linear & prediksi mencapai ambang
    route.ts        haversine, nearest-neighbor, 2-opt, pemecahan trip, URL Google Maps
    misc.ts         PRNG, profil aktivitas bengkel, CSV
    lib.test.ts     Vitest
  data/
    seed.ts         12 bengkel fiktif di Magelang + riwayat 14 hari + serah terima awal
    sensorSource.ts interface SensorSource + SimulatedSensorSource
  store/          Zustand store (useApp), notifikasi browser, data turunan
  components/     Layout + bottom nav, UI kit, peta, QR
  pages/          Landing, Beranda, Peta, Detail, Rute, Serah terima, Bukti, Riwayat,
                  Notifikasi, Pengaturan, Tentang, Tampilan bengkel
```

## Menjalankan lokal

Butuh Node.js 18+ (diuji dengan Node 24).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test (Vitest)
npm run build      # type-check + build produksi ke dist/
npm run preview    # menjalankan hasil build (cek PWA)
```

Kamera untuk scan QR hanya jalan di **HTTPS** atau `localhost`. Untuk mencoba di HP, pakai hasil deploy Vercel (sudah HTTPS) — atau gunakan input kode manual.

## Deploy ke Vercel

**Cara A — lewat GitHub (disarankan)**
1. Buat repo baru di GitHub, lalu push folder ini:
   ```bash
   git init
   git add .
   git commit -m "OILINK prototype"
   git branch -M main
   git remote add origin https://github.com/<akun>/oilink-prototype.git
   git push -u origin main
   ```
2. Buka https://vercel.com → login dengan GitHub → **Add New… → Project** → pilih repo tadi.
3. Vercel mendeteksi **Vite** otomatis (Build: `npm run build`, Output: `dist`). Klik **Deploy**.
4. Selesai — dapat link publik `https://<nama>.vercel.app`. Setiap `git push` akan deploy ulang otomatis.

**Cara B — Vercel CLI tanpa GitHub**
```bash
npm i -g vercel
vercel          # jawab pertanyaan, terima default
vercel --prod   # deploy produksi
```

`vercel.json` sudah berisi rewrite SPA, jadi refresh di `/app/peta` dll. tidak 404.

## Skenario demo 3 menit untuk juri

1. **(0:00) Halaman pembuka** — jelaskan model bisnis: sensor disewakan ke pengepul, bengkel gratis. Klik **Masuk sebagai Pengepul (Basic)**.
2. **(0:20) Beranda Basic** — ringkasan bengkel, total liter siap jemput, daftar "Siap dijemput". Tunjukkan kartu "Inventory semua drum" terkunci (gembok).
3. **(0:40) Notifikasi** — buka ⚙ Pengaturan → pilih bengkel → **Isi** (atau set kecepatan **600×**). Lonceng menyala: "Drum Bengkel X mencapai … L (…%)".
4. **(1:00) Rute Basic** — tab **Rute**: semua bengkel di atas ambang diurutkan dari yang terdekat. Klik **Pro** di header.
5. **(1:20) Optimasi Rute (Pro)** — centang 5–6 bengkel. Tunjukkan **"Sesuai urutan daftar vs. Rute optimal"**, pemecahan trip karena kapasitas pick-up 600 L, saran tunda, garis rute di peta, **Buka di Google Maps**.
6. **(1:50) Detail bengkel** — ilustrasi drum + `distance_cm` mentah → liter (untuk juri teknik), grafik 14 hari, **prediksi penuh**, atur ambang per bengkel.
7. **(2:15) Serah terima** — **Mulai serah terima** → scan QR drum (atau ketik `OIL-MGL-001`) → simpan → **bukti serah terima ber-QR**, kirim via WhatsApp, lalu "Serahkan ke pengelola berizin" → rantai lengkap.
8. **(2:40) Riwayat & CSV** — filter, total per bulan, **Ekspor CSV** untuk pelaporan limbah B3.
9. **(2:50) Tampilan bengkel** — dari halaman pembuka: isi drum, jadwal jemput, QR drum untuk dicetak.

Tips: sebelum demo, buka ⚙ → **Reset data demo** supaya kondisi awal selalu sama. Siapkan HP lain yang menampilkan **QR drum** (Tampilan bengkel) untuk di-scan secara live.

## Cara kerja sensor (ringkas)

Sensor ultrasonik di tutup drum mengukur **jarak ke permukaan oli** (`distance_cm`).

```
tinggi_oli = tinggi_drum − (distance_cm − offset_sensor)
liter      = kapasitas × tinggi_oli / tinggi_drum      (drum silinder tegak)
```

Contoh drum 200 L, tinggi 76 cm, offset 22 cm: `distance_cm = 41` → tinggi oli 57 cm → **150 L**.

## Rencana integrasi ESP32

UI hanya bergantung pada interface `SensorSource` (`src/data/sensorSource.ts`):

```ts
interface SensorReading { sensor_id: string; distance_cm: number; timestamp: number }
interface SensorSource {
  readonly kind: 'simulated' | 'live';
  subscribe(onReadings: (readings: SensorReading[], clock: number) => void): () => void;
}
```

Saat ini dipakai `SimulatedSensorSource`. Untuk data sungguhan:

**1. Hardware** — ESP32 + **JSN-SR04T** (tahan cipratan) di tutup drum. Tiap 10–15 menit: ukur jarak (median 5 bacaan), kirim lewat Wi-Fi bengkel (atau modul GSM), lalu deep-sleep.

**2. Payload** (HTTPS POST)
```json
{ "sensor_id": "OIL-MGL-001", "distance_cm": 41.3, "timestamp": "2026-11-22T08:15:00Z", "battery_v": 3.92, "rssi": -67 }
```

**3. Backend — Supabase**
```sql
create table devices (
  sensor_id   text primary key,
  workshop_id text not null,
  api_key_hash text not null,          -- API key per perangkat
  drum_capacity_l int not null,
  drum_height_cm numeric not null,
  sensor_offset_cm numeric not null default 22
);

create table readings (
  id          bigint generated always as identity primary key,
  sensor_id   text not null references devices(sensor_id),
  distance_cm numeric(6,1) not null check (distance_cm between 0 and 400),
  battery_v   numeric(4,2),
  rssi        int,
  measured_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index on readings (sensor_id, measured_at desc);
alter table readings enable row level security;
```
ESP32 tidak memegang service key. Ia memanggil **Edge Function** `/ingest` dengan header `x-device-key`; function memverifikasi hash API key di tabel `devices`, lalu `insert` ke `readings`. (Alternatif sederhana: REST insert `POST /rest/v1/readings` dengan RLS yang memeriksa key per perangkat.)

Contoh request dari ESP32:
```
POST https://<project>.functions.supabase.co/ingest
x-device-key: <key-perangkat>
Content-Type: application/json

{"sensor_id":"OIL-MGL-001","distance_cm":41.3,"timestamp":"2026-11-22T08:15:00Z"}
```

**4. Frontend** — buat `SupabaseSensorSource implements SensorSource` yang berlangganan **Supabase Realtime** (`postgres_changes` pada tabel `readings`, event `INSERT`) dan meneruskan baris sebagai `SensorReading`. Ganti satu baris di `src/components/SimulatorRunner.tsx`:

```ts
const source: SensorSource = new SupabaseSensorSource(supabaseClient);
```

Konversi jarak → liter, ambang, notifikasi, prediksi, dan rute tetap memakai kode yang sama.

Langkah berikutnya setelah itu: login pengepul/bengkel (Supabase Auth), tabel `handovers` di server, push notification (Web Push / WhatsApp API), dan routing jalan sungguhan (OSRM/OpenRouteService) menggantikan perkiraan haversine.
