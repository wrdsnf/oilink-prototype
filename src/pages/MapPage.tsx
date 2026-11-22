import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Marker } from 'react-leaflet';
import { Check, Info, Plus, X } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useWorkshopRows } from '../store/derived';
import { BaseMap, statusIcon } from '../components/MapParts';
import { FillBar, STATUS_META, StatusBadge, type FillStatus } from '../components/ui';
import { fmtKm, fmtL, fmtPct, fmtRelative } from '../lib/format';

export default function MapPage() {
  const rows = useWorkshopRows();
  const [sel, setSel] = useState<string | null>(null);
  const plan = useApp((s) => s.plan);
  const now = useApp((s) => s.sim.now);
  const routeSelection = useApp((s) => s.routeSelection);
  const toggleRoute = useApp((s) => s.toggleRoute);
  const row = rows.find((r) => r.w.id === sel);
  const inRoute = row ? routeSelection.includes(row.w.id) : false;

  return (
    <div>
      <h1 className="mb-3 text-xl font-extrabold">Peta bengkel</h1>
      <div className="relative">
        <BaseMap fit={rows.map((r) => r.w)} className="h-[58vh]">
          {rows.map((r) => (
            <Marker
              key={r.w.id}
              position={[r.w.lat, r.w.lng]}
              icon={statusIcon(r.status, r.status === 'offline' ? 'OFF' : fmtPct(r.pct), sel === r.w.id)}
              eventHandlers={{ click: () => setSel(r.w.id) }}
              title={`${r.w.name}: ${STATUS_META[r.status].label}`}
            />
          ))}
        </BaseMap>

        {row && (
          <div className="card absolute inset-x-2 bottom-2 z-[400] p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{row.w.name}</p>
                <p className="text-xs text-slate-600">
                  {row.w.address} · {fmtKm(row.distKm)} dari gudang
                </p>
              </div>
              <button className="btn-ghost -mr-1 -mt-1 px-2" onClick={() => setSel(null)} aria-label="Tutup ringkasan">
                <X size={18} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span>
                <b>{fmtL(row.liters)}</b> / {row.w.drum.capacityL} L ({fmtPct(row.pct)})
              </span>
              <StatusBadge status={row.status} />
            </div>
            <div className="mt-2">
              <FillBar pct={row.pct} thrPct={row.thrPct} status={row.status} />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Update {fmtRelative(row.sensor.updatedAt, now)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to={`/app/bengkel/${row.w.id}`} className="btn-secondary">
                <Info size={16} /> Lihat detail
              </Link>
              {plan === 'pro' ? (
                <button className={inRoute ? 'btn-secondary' : 'btn-primary'} onClick={() => toggleRoute(row.w.id)}>
                  {inRoute ? <Check size={16} /> : <Plus size={16} />} {inRoute ? 'Di rute' : 'Tambah ke rute'}
                </button>
              ) : (
                <Link to="/app/rute" className="btn-primary">
                  <Plus size={16} /> Lihat rute
                </Link>
              )}
            </div>
            {plan === 'basic' && (
              <p className="mt-2 text-[11px] text-slate-500">Basic: rute otomatis berisi semua bengkel di atas ambang. Pilih bengkel sendiri tersedia di Pro.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Legenda">
        {(['low', 'mid', 'full', 'offline'] as FillStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_META[s].hex }} />
            {s === 'low' ? '< 50%' : s === 'mid' ? '50% – ambang' : s === 'full' ? '! ≥ ambang' : '× offline'}
          </span>
        ))}
      </div>
      {plan === 'pro' && routeSelection.length > 0 && (
        <Link to="/app/rute" className="btn-primary mt-3 w-full">
          Buka Optimasi Rute ({routeSelection.length} dipilih)
        </Link>
      )}
    </div>
  );
}
