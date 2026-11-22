import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Info, Pause, Play, RotateCcw, Store, Zap } from 'lucide-react';
import { useApp } from '../store/useApp';
import { PlanSwitch } from '../components/Layout';
import { BrowserNotifToggle } from './Notifications';
import { SectionTitle } from '../components/ui';
import { fmtDateTime, fmtPct } from '../lib/format';
import { pct } from '../lib/volume';

const SPEEDS = [1, 60, 600];

export default function Settings() {
  const sim = useApp((s) => s.sim);
  const setSim = useApp((s) => s.setSim);
  const workshops = useApp((s) => s.workshops);
  const sensors = useApp((s) => s.sensors);
  const fillNow = useApp((s) => s.fillNow);
  const setOnline = useApp((s) => s.setOnline);
  const collector = useApp((s) => s.collector);
  const setCollector = useApp((s) => s.setCollector);
  const reset = useApp((s) => s.reset);
  const [fillId, setFillId] = useState(workshops.find((w) => w.online && pct(sensors[w.id].liters, w.drum.capacityL) < 80)?.id ?? workshops[0].id);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div>
      <h1 className="text-xl font-extrabold">Pengaturan</h1>

      <SectionTitle>Paket langganan</SectionTitle>
      <div className="card flex items-center justify-between gap-3 p-3">
        <p className="text-sm text-slate-700">Bandingkan fitur Basic dan Pro.</p>
        <PlanSwitch />
      </div>

      <SectionTitle>Simulator sensor</SectionTitle>
      <div className="card space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{sim.running ? 'Simulasi berjalan' : 'Simulasi dijeda'}</p>
            <p className="text-xs text-slate-600">Jam simulasi: {fmtDateTime(sim.now)}</p>
          </div>
          <button className={sim.running ? 'btn-secondary' : 'btn-primary'} onClick={() => setSim({ running: !sim.running })}>
            {sim.running ? <Pause size={16} /> : <Play size={16} />} {sim.running ? 'Jeda' : 'Jalan'}
          </button>
        </div>
        <div>
          <p className="label">Kecepatan</p>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Kecepatan simulasi">
            {SPEEDS.map((sp) => (
              <button key={sp} aria-pressed={sim.speed === sp} onClick={() => setSim({ speed: sp })} className={`btn border ${sim.speed === sp ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white'}`}>
                {sp}×
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">600× = 1 detik nyata ≈ 10 menit simulasi. Drum terisi lebih cepat di jam kerja bengkel.</p>
        </div>
        <div>
          <label className="label" htmlFor="fill-ws">Isi drum sekarang (memicu notifikasi)</label>
          <div className="flex gap-2">
            <select id="fill-ws" className="input" value={fillId} onChange={(e) => setFillId(e.target.value)}>
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {fmtPct(pct(sensors[w.id].liters, w.drum.capacityL))}
                </option>
              ))}
            </select>
            <button className="btn-warn shrink-0" onClick={() => fillNow(fillId)}>
              <Zap size={16} /> Isi
            </button>
          </div>
        </div>
        <div>
          <p className="label">Status sensor</p>
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {workshops.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <span className="truncate">{w.name}</span>
                <label className="flex shrink-0 items-center gap-2 text-xs">
                  {w.online ? 'Online' : 'Offline'}
                  <input type="checkbox" className="h-5 w-5 accent-teal-700" checked={w.online} onChange={(e) => setOnline(w.id, e.target.checked)} aria-label={`Sensor ${w.name} online`} />
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SectionTitle>Notifikasi</SectionTitle>
      <div className="card p-3">
        <BrowserNotifToggle />
      </div>

      <SectionTitle>Kendaraan & gudang</SectionTitle>
      <div className="card space-y-3 p-4">
        <div>
          <label className="label" htmlFor="cap">Kapasitas kendaraan (L)</label>
          <input id="cap" type="number" className="input" min={100} step={50} value={collector.vehicleCapacityL} onChange={(e) => setCollector({ vehicleCapacityL: Math.max(50, Number(e.target.value) || 0) })} />
        </div>
        <div>
          <label className="label" htmlFor="depot-label">Nama lokasi gudang</label>
          <input id="depot-label" className="input" value={collector.depot.label} onChange={(e) => setCollector({ depot: { ...collector.depot, label: e.target.value } })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="lat">Lintang</label>
            <input id="lat" type="number" step="0.0001" className="input" value={collector.depot.lat} onChange={(e) => setCollector({ depot: { ...collector.depot, lat: Number(e.target.value) } })} />
          </div>
          <div>
            <label className="label" htmlFor="lng">Bujur</label>
            <input id="lng" type="number" step="0.0001" className="input" value={collector.depot.lng} onChange={(e) => setCollector({ depot: { ...collector.depot, lng: Number(e.target.value) } })} />
          </div>
        </div>
      </div>

      <SectionTitle>Lainnya</SectionTitle>
      <div className="card divide-y divide-slate-100">
        <Link to="/app/tentang" className="flex min-h-12 items-center gap-3 px-4 text-sm font-semibold">
          <Info size={18} className="text-brand-700" /> Tentang prototype <ChevronRight size={16} className="ml-auto text-slate-400" />
        </Link>
        <Link to="/bengkel" className="flex min-h-12 items-center gap-3 px-4 text-sm font-semibold">
          <Store size={18} className="text-brand-700" /> Lihat sebagai Bengkel <ChevronRight size={16} className="ml-auto text-slate-400" />
        </Link>
      </div>

      <div className="mt-4">
        {confirmReset ? (
          <div className="card space-y-2 border-red-300 p-4">
            <p className="text-sm">Semua serah terima, notifikasi, dan pengaturan demo akan kembali ke awal.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={() => setConfirmReset(false)}>Batal</button>
              <button className="btn bg-red-700 text-white hover:bg-red-800" onClick={() => { reset(); setConfirmReset(false); }}>Ya, reset</button>
            </div>
          </div>
        ) : (
          <button className="btn-secondary w-full text-red-700" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={16} /> Reset data demo
          </button>
        )}
      </div>
    </div>
  );
}
