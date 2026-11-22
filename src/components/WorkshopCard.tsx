import { Link } from 'react-router-dom';
import { ChevronRight, MapPin } from 'lucide-react';
import { useApp } from '../store/useApp';
import { fmtKm, fmtL, fmtPct, fmtRelative } from '../lib/format';
import type { WorkshopRow } from '../store/derived';
import { FillBar, StatusBadge } from './ui';

export function WorkshopCard({ row }: { row: WorkshopRow }) {
  const now = useApp((s) => s.sim.now);
  const { w } = row;
  return (
    <Link to={`/app/bengkel/${w.id}`} className="card block p-3 transition hover:border-brand-300">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{w.name}</p>
          <p className="flex items-center gap-1 text-xs text-slate-600">
            <MapPin size={12} aria-hidden /> {w.area} · {fmtKm(row.distKm)} dari gudang
          </p>
        </div>
        <ChevronRight size={18} className="mt-1 shrink-0 text-slate-400" aria-hidden />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-sm">
          <span className="text-lg font-extrabold">{fmtL(row.liters)}</span>
          <span className="text-slate-600"> / {w.drum.capacityL} L · {fmtPct(row.pct)}</span>
        </p>
        <StatusBadge status={row.status} />
      </div>
      <div className="mt-2">
        <FillBar pct={row.pct} thrPct={row.thrPct} status={row.status} />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">Update {fmtRelative(row.sensor.updatedAt, now)}</p>
    </Link>
  );
}
