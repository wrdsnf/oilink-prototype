import { Link } from 'react-router-dom';
import { AlertTriangle, Droplets, Route, Store, WifiOff } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useWorkshopRows } from '../store/derived';
import { fmtL, fmtPct } from '../lib/format';
import { ProBadge, ProGate, SectionTitle, Stat, StatusBadge, STATUS_META } from '../components/ui';
import { WorkshopCard } from '../components/WorkshopCard';

export default function Home() {
  const rows = useWorkshopRows();
  const collector = useApp((s) => s.collector);
  const ready = rows.filter((r) => r.status === 'full').sort((a, b) => b.pct - a.pct);
  const offline = rows.filter((r) => r.status === 'offline');
  const readyL = ready.reduce((a, r) => a + r.liters, 0);
  const totalL = rows.filter((r) => r.w.online).reduce((a, r) => a + r.liters, 0);
  const totalCap = rows.reduce((a, r) => a + r.w.drum.capacityL, 0);

  return (
    <div>
      <p className="text-xs font-medium text-slate-500">Selamat datang,</p>
      <h1 className="text-xl font-extrabold">{collector.name}</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat Icon={Store} label="Bengkel mitra" value={String(rows.length)} />
        <Stat Icon={Droplets} label="Total siap jemput" value={fmtL(readyL)} sub={`kapasitas pick-up ${collector.vehicleCapacityL} L`} />
        <Stat Icon={AlertTriangle} tone="red" label="Drum di atas ambang" value={String(ready.length)} />
        <Stat Icon={WifiOff} tone="slate" label="Sensor offline" value={String(offline.length)} />
      </div>

      {ready.length > 0 && (
        <Link to="/app/rute" className="btn-primary mt-4 w-full">
          <Route size={18} /> Susun rute penjemputan ({ready.length} bengkel)
        </Link>
      )}

      <SectionTitle>Siap dijemput</SectionTitle>
      {ready.length === 0 ? (
        <p className="card p-4 text-sm text-slate-600">Belum ada drum yang mencapai ambang. Coba percepat simulasi di Pengaturan.</p>
      ) : (
        <div className="space-y-3">
          {ready.map((r) => (
            <WorkshopCard key={r.w.id} row={r} />
          ))}
        </div>
      )}

      <SectionTitle right={<ProBadge />}>Inventory semua drum</SectionTitle>
      <ProGate title="Dashboard inventory langsung" desc="Pantau isi semua drum di semua bengkel secara real-time.">
        <div className="card p-3">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm text-slate-600">Total oli di semua drum</p>
            <p className="font-extrabold">
              {fmtL(totalL)} <span className="text-xs font-medium text-slate-500">/ {fmtL(totalCap)}</span>
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {[...rows]
              .sort((a, b) => b.pct - a.pct)
              .map((r) => (
                <li key={r.w.id}>
                  <Link to={`/app/bengkel/${r.w.id}`} className="flex items-center gap-3 py-2">
                    <span className="w-24 shrink-0 truncate text-xs font-semibold sm:w-40">{r.w.name.replace('Bengkel ', '')}</span>
                    <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className={`absolute inset-y-0 left-0 rounded-full ${STATUS_META[r.status].bar}`} style={{ width: `${r.pct}%` }} />
                    </span>
                    <span className="w-20 text-right text-xs tabular-nums">
                      {r.status === 'offline' ? <StatusBadge status="offline" /> : `${fmtL(r.liters)} · ${fmtPct(r.pct)}`}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </ProGate>

      {offline.length > 0 && (
        <>
          <SectionTitle>Perlu dicek</SectionTitle>
          <div className="space-y-3">
            {offline.map((r) => (
              <WorkshopCard key={r.w.id} row={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
