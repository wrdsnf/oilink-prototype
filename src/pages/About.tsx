import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { drumSpecFor } from '../lib/volume';

export default function About() {
  const d = drumSpecFor(200);
  return (
    <div className="space-y-4">
      <Link to="/app/pengaturan" className="btn-ghost -ml-3">
        <ArrowLeft size={18} /> Pengaturan
      </Link>
      <h1 className="text-xl font-extrabold">Tentang prototype</h1>
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        Ini prototype untuk demo. <b>Semua data sensor disimulasikan</b> di browser Anda, belum ada hardware sungguhan. Semua nama bengkel, pengepul,
        dan pengelola adalah fiktif.
      </p>

      <div className="card p-4">
        <h2 className="font-bold">Cara kerja sensor ultrasonik</h2>
        <svg viewBox="0 0 320 170" className="my-3 w-full" role="img" aria-label="Diagram sensor di atas drum">
          <rect x="40" y="14" width="60" height="18" rx="4" fill="#0f766e" />
          <text x="70" y="27" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="700">Sensor</text>
          <rect x="30" y="34" width="80" height="126" rx="6" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
          <rect x="31" y="92" width="78" height="67" fill="#0d9488" opacity=".8" />
          <line x1="70" y1="34" x2="70" y2="92" stroke="#b45309" strokeWidth="2" strokeDasharray="4 3" />
          <line x1="120" y1="34" x2="120" y2="92" stroke="#b45309" strokeWidth="2" />
          <text x="126" y="66" fontSize="11" fill="#92400e" fontWeight="700">jarak (distance_cm)</text>
          <line x1="120" y1="92" x2="120" y2="160" stroke="#0f766e" strokeWidth="2" />
          <text x="126" y="130" fontSize="11" fill="#115e59" fontWeight="700">tinggi oli</text>
          <text x="126" y="146" fontSize="10" fill="#334155">= tinggi drum − (jarak − offset)</text>
        </svg>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Sensor (mis. JSN-SR04T, tahan cipratan) di tutup drum memancarkan gelombang ultrasonik dan mengukur pantulannya dari permukaan oli → <b>jarak (cm)</b>.</li>
          <li>Tinggi oli = tinggi drum − (jarak − offset sensor). Offset = zona mati sensor saat drum penuh (±{d.sensorOffsetCm} cm).</li>
          <li>Drum dianggap silinder tegak, jadi <b>liter = kapasitas × tinggi oli ÷ tinggi drum</b>. Contoh drum 200 L, tinggi {d.heightCm} cm: jarak 41 cm → tinggi oli 57 cm → 150 L.</li>
          <li>ESP32 mengirim jarak mentah ke server; aplikasi mengonversi ke liter, mengirim notifikasi saat lewat ambang, dan memprediksi kapan penuh dengan regresi linear.</li>
        </ol>
      </div>

      <div className="card p-4 text-sm text-slate-700">
        <h2 className="mb-1 font-bold text-slate-900">Yang disimulasikan</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Pembacaan sensor tiap detik, laju pengisian berbeda per bengkel dan lebih cepat di jam kerja.</li>
          <li>Riwayat 14 hari dan serah terima sebelumnya dibangkitkan otomatis.</li>
          <li>Data tersimpan di localStorage browser ini saja. Tombol "Reset data demo" mengembalikan data awal.</li>
        </ul>
        <p className="mt-2">Lapisan data memakai interface <code className="rounded bg-slate-100 px-1">SensorSource</code>, sehingga simulator bisa diganti data ESP32 sungguhan tanpa mengubah tampilan.</p>
      </div>
    </div>
  );
}
