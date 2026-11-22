import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { AlertTriangle, CalendarCheck, CheckSquare, ClipboardCheck, ExternalLink, Info, Square, TrendingDown } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useWorkshopRows, type WorkshopRow } from '../store/derived';
import { nearestNeighbor, planTrips, routeLength, estimateMinutes, googleMapsUrl, ROAD_FACTOR, type Stop, type TripPlan } from '../lib/route';
import { fmtDuration, fmtKm, fmtL, fmtPct, fmtDateTime } from '../lib/format';
import { BaseMap, numberIcon } from '../components/MapParts';
import { ProBadge, ProGate, SectionTitle, StatusBadge } from '../components/ui';
import type { LatLng } from '../lib/types';

const TRIP_COLORS = ['#0f766e', '#ea580c', '#7c3aed', '#0369a1'];

interface RStop extends Stop {
  name: string;
  row: WorkshopRow;
}

const toStop = (r: WorkshopRow): RStop => ({ id: r.w.id, lat: r.w.lat, lng: r.w.lng, liters: Math.round(r.liters), name: r.w.name, row: r });

/** Pecah sesuai urutan daftar apa adanya (tanpa optimasi) — pembanding. */
function naiveKm(depot: LatLng, stops: Stop[], cap: number): number {
  let total = 0;
  let cur: Stop[] = [];
  let load = 0;
  for (const s of stops) {
    if (cur.length && load + s.liters > cap) {
      total += routeLength(depot, cur);
      cur = [];
      load = 0;
    }
    cur.push(s);
    load += s.liters;
  }
  return total + routeLength(depot, cur);
}

export default function RoutePage() {
  const plan = useApp((s) => s.plan);
  return (
    <div>
      <h1 className="text-xl font-extrabold">{plan === 'pro' ? 'Optimasi Rute' : 'Rute penjemputan'}</h1>
      <p className="text-sm text-slate-600">
        {plan === 'pro'
          ? 'Pilih bengkel, sistem menyusun urutan terpendek sesuai kapasitas kendaraan.'
          : 'Otomatis berisi semua bengkel di atas ambang, diurutkan dari yang terdekat.'}
      </p>
      {plan === 'pro' ? <ProRoute /> : <BasicRoute />}
    </div>
  );
}

function BasicRoute() {
  const rows = useWorkshopRows();
  const depot = useApp((s) => s.collector.depot);
  const cap = useApp((s) => s.collector.vehicleCapacityL);
  const stops = useMemo(() => nearestNeighbor(depot, rows.filter((r) => r.status === 'full').map(toStop)), [rows, depot]);
  const km = routeLength(depot, stops);
  const liters = stops.reduce((a, s) => a + s.liters, 0);
  const plan: TripPlan<RStop> = { trips: stops.length ? [{ stops, liters, distanceKm: km }] : [], totalKm: km, totalLiters: liters, oversize: [] };

  return (
    <>
      <RouteResult plan={plan} />
      {liters > cap && (
        <div className="mt-3 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle size={18} className="shrink-0" />
          <p>
            Total {fmtL(liters)} melebihi kapasitas kendaraan {fmtL(cap)}. Di Basic, rute tidak dipecah otomatis — Pro dapat membagi menjadi beberapa trip.
          </p>
        </div>
      )}
      <SectionTitle right={<ProBadge />}>Pilih bengkel sendiri</SectionTitle>
      <ProGate title="Optimasi Rute (Pro)" desc="Centang bengkel mana saja, rute dioptimasi dengan 2-opt dan dipecah sesuai kapasitas kendaraan.">
        <div className="card space-y-2 p-3">
          {rows.slice(0, 4).map((r) => (
            <div key={r.w.id} className="flex items-center gap-2 text-sm">
              <CheckSquare size={18} className="text-brand-700" /> {r.w.name}
            </div>
          ))}
          <div className="rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-900">Contoh: rute optimal vs. urutan daftar</div>
        </div>
      </ProGate>
    </>
  );
}

function ProRoute() {
  const rows = useWorkshopRows();
  const depot = useApp((s) => s.collector.depot);
  const cap = useApp((s) => s.collector.vehicleCapacityL);
  const selection = useApp((s) => s.routeSelection);
  const toggle = useApp((s) => s.toggleRoute);
  const setSelection = useApp((s) => s.setRouteSelection);

  const candidates = [...rows].filter((r) => r.w.online).sort((a, b) => b.pct - a.pct);
  const selected = selection.map((id) => rows.find((r) => r.w.id === id)).filter((r): r is WorkshopRow => !!r && r.w.online);
  const stops = selected.map(toStop);
  // dihitung ulang saat pilihan/kapasitas berubah; liter dibulatkan agar tidak dihitung tiap detik
  const key = stops.map((s) => `${s.id}:${Math.round(s.liters / 5)}`).join(',');
  const plan = useMemo(() => planTrips(depot, stops, cap), [key, depot, cap]); // eslint-disable-line react-hooks/exhaustive-deps
  const naive = useMemo(() => naiveKm(depot, stops, cap), [key, depot, cap]); // eslint-disable-line react-hooks/exhaustive-deps
  const saving = naive > 0 ? ((naive - plan.totalKm) / naive) * 100 : 0;

  // saran tunda: bengkel paling kosong di luar trip pertama
  const deferable = plan.trips.length > 1 ? plan.trips.slice(1).flatMap((t) => t.stops).sort((a, b) => a.row.pct - b.row.pct) : [];

  return (
    <>
      <SectionTitle
        right={
          <div className="flex gap-1">
            <button className="btn-ghost min-h-9 px-2 text-xs" onClick={() => setSelection(candidates.filter((r) => r.status === 'full').map((r) => r.w.id))}>
              Pilih yang siap
            </button>
            {selection.length > 0 && (
              <button className="btn-ghost min-h-9 px-2 text-xs" onClick={() => setSelection([])}>
                Kosongkan
              </button>
            )}
          </div>
        }
      >
        Pilih bengkel ({selected.length})
      </SectionTitle>
      <ul className="card divide-y divide-slate-100">
        {candidates.map((r) => {
          const on = selection.includes(r.w.id);
          const order = selection.indexOf(r.w.id);
          return (
            <li key={r.w.id}>
              <button onClick={() => toggle(r.w.id)} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left" aria-pressed={on}>
                {on ? <CheckSquare size={20} className="shrink-0 text-brand-700" /> : <Square size={20} className="shrink-0 text-slate-400" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {on && <span className="mr-1 text-xs text-slate-500">#{order + 1}</span>}
                    {r.w.name}
                  </span>
                  <span className="text-xs text-slate-600">
                    {fmtL(r.liters)} · {fmtPct(r.pct)} · {r.w.area}
                  </span>
                </span>
                <StatusBadge status={r.status} />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[11px] text-slate-500">#urutan = urutan Anda mencentang (dipakai sebagai pembanding).</p>

      {stops.length > 0 && (
        <>
          {stops.length > 1 && (
            <div className="card mt-4 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-brand-800">
                <TrendingDown size={18} /> Bukti nilai Optimasi Rute
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="text-xs text-slate-600">Sesuai urutan daftar</p>
                  <p className="text-lg font-extrabold">{fmtKm(naive * ROAD_FACTOR)}</p>
                </div>
                <div className="rounded-xl bg-brand-50 p-3">
                  <p className="text-xs text-brand-800">Rute optimal</p>
                  <p className="text-lg font-extrabold text-brand-800">{fmtKm(plan.totalKm * ROAD_FACTOR)}</p>
                </div>
              </div>
              <p className="mt-2 text-center text-sm">
                {saving > 0.5 ? (
                  <>
                    Hemat <b>{fmtKm((naive - plan.totalKm) * ROAD_FACTOR)}</b> ({saving.toFixed(0)}%) per putaran
                  </>
                ) : (
                  'Urutan daftar Anda sudah optimal.'
                )}
              </p>
            </div>
          )}

          {plan.trips.length > 1 && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-bold">
                <AlertTriangle size={18} /> Melebihi kapasitas kendaraan
              </p>
              <p className="mt-1">
                Total {fmtL(plan.totalLiters)} &gt; kapasitas {fmtL(cap)}. Rute dipecah menjadi {plan.trips.length} trip (kembali ke gudang untuk bongkar).
              </p>
              {deferable.length > 0 && (
                <div className="mt-2">
                  <p>Atau tunda bengkel yang isinya paling rendah:</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {deferable.map((s) => (
                      <button key={s.id} onClick={() => toggle(s.id)} className="rounded-lg border border-amber-400 bg-white px-2 py-1.5 text-xs font-semibold">
                        Tunda {s.name.replace('Bengkel ', '')} ({fmtPct(s.row.pct)})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {plan.oversize.length > 0 && (
            <p className="mt-2 text-xs text-amber-900">Catatan: {plan.oversize.map((s) => s.name).join(', ')} melebihi kapasitas kendaraan sendiri — hanya bisa diambil sebagian.</p>
          )}
        </>
      )}

      <RouteResult plan={plan} />
    </>
  );
}

function RouteResult({ plan }: { plan: TripPlan<RStop> }) {
  const depot = useApp((s) => s.collector.depot);
  const setSchedule = useApp((s) => s.setSchedule);
  const schedule = useApp((s) => s.schedule);
  const now = useApp((s) => s.sim.now);
  const allStops = plan.trips.flatMap((t) => t.stops);
  const stopCount = allStops.length;
  const minutes = estimateMinutes(plan.totalKm, stopCount);
  const isScheduled =
    !!schedule && JSON.stringify(schedule.trips) === JSON.stringify(plan.trips.map((t) => t.stops.map((s) => s.id)));

  if (stopCount === 0) {
    return <p className="card mt-4 p-4 text-sm text-slate-600">Belum ada bengkel di rute. {useApp.getState().plan === 'pro' ? 'Centang bengkel di atas.' : 'Rute terisi otomatis saat ada drum di atas ambang.'}</p>;
  }

  return (
    <>
      <SectionTitle>Hasil rute</SectionTitle>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-2">
          <p className="text-[11px] text-slate-600">Total jarak*</p>
          <p className="font-extrabold">{fmtKm(plan.totalKm * ROAD_FACTOR)}</p>
        </div>
        <div className="card p-2">
          <p className="text-[11px] text-slate-600">Perkiraan waktu</p>
          <p className="font-extrabold">{fmtDuration(minutes)}</p>
        </div>
        <div className="card p-2">
          <p className="text-[11px] text-slate-600">Total oli</p>
          <p className="font-extrabold">{fmtL(plan.totalLiters)}</p>
        </div>
      </div>
      <p className="mt-1 flex items-start gap-1 text-[11px] text-slate-500">
        <Info size={12} className="mt-0.5 shrink-0" />
        *Jarak masih perkiraan: garis lurus (haversine) {fmtKm(plan.totalKm)} × faktor jalan {ROAD_FACTOR.toLocaleString('id-ID')}. Waktu: 30 km/jam + 15 menit per stop.
      </p>

      <div className="mt-3">
        <BaseMap fit={allStops} className="h-72">
          {plan.trips.map((t, ti) => (
            <Polyline
              key={ti}
              positions={[[depot.lat, depot.lng], ...t.stops.map((s) => [s.lat, s.lng] as [number, number]), [depot.lat, depot.lng]]}
              pathOptions={{ color: TRIP_COLORS[ti % TRIP_COLORS.length], weight: 4, opacity: 0.85, dashArray: ti ? '8 6' : undefined }}
            />
          ))}
          {plan.trips.flatMap((t, ti) =>
            t.stops.map((s, si) => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={numberIcon(plan.trips.length > 1 ? `${ti + 1}.${si + 1}` : si + 1, TRIP_COLORS[ti % TRIP_COLORS.length])}>
                <Tooltip>{s.name} — {fmtL(s.liters)}</Tooltip>
              </Marker>
            )),
          )}
        </BaseMap>
      </div>

      {plan.trips.map((t, ti) => (
        <div key={ti} className="card mt-3 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-bold">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: TRIP_COLORS[ti % TRIP_COLORS.length] }} />
              {plan.trips.length > 1 ? `Trip ${ti + 1}` : 'Urutan stop'}
            </p>
            <p className="text-xs text-slate-600">
              {fmtKm(t.distanceKm * ROAD_FACTOR)} · {fmtL(t.liters)}
            </p>
          </div>
          <ol className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2 text-slate-600">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-900 text-[9px] font-bold text-white">GDG</span>
              Berangkat dari gudang
            </li>
            {t.stops.map((s, si) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: TRIP_COLORS[ti % TRIP_COLORS.length] }}>
                  {si + 1}
                </span>
                <Link to={`/app/bengkel/${s.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {s.name}
                </Link>
                <span className="text-xs text-slate-600">{fmtL(s.liters)}</span>
                <Link to={`/app/serah-terima?bengkel=${s.id}`} className="btn-ghost min-h-9 px-2" aria-label={`Serah terima di ${s.name}`}>
                  <ClipboardCheck size={16} />
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-2 text-slate-600">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-900 text-[9px] font-bold text-white">GDG</span>
              Kembali ke gudang
            </li>
          </ol>
          <a href={googleMapsUrl(depot, t.stops)} target="_blank" rel="noreferrer" className="btn-secondary mt-3 w-full">
            <ExternalLink size={16} /> Buka di Google Maps
          </a>
        </div>
      ))}

      <button
        className={`${isScheduled ? 'btn-secondary' : 'btn-primary'} mt-3 w-full`}
        onClick={() => setSchedule(isScheduled ? null : { createdAt: now, trips: plan.trips.map((t) => t.stops.map((s) => s.id)) })}
      >
        <CalendarCheck size={18} /> {isScheduled ? `Terjadwal (${fmtDateTime(schedule!.createdAt)}) — batalkan` : 'Tetapkan sebagai jadwal hari ini'}
      </button>
      <p className="mt-1 text-center text-[11px] text-slate-500">Jadwal akan terlihat di tampilan bengkel.</p>
    </>
  );
}
