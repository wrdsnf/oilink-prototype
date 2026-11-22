import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ClipboardCheck, Clock, MessageCircle, Plus, Check, Ruler, TrendingUp, Zap } from 'lucide-react';
import { useApp, useFill } from '../store/useApp';
import { predictThreshold } from '../lib/prediction';
import { levelCmFromDistance } from '../lib/volume';
import { haversineKm } from '../lib/geo';
import { fmtDateTime, fmtHours, fmtKm, fmtL, fmtPct, fmtRelative, OIL_LABEL } from '../lib/format';
import { DrumIllustration, ProBadge, ProGate, SectionTitle, StatusBadge, statusOf } from '../components/ui';

export default function Detail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const fill = useFill(id);
  const history = useApp((s) => s.history[id]);
  const now = useApp((s) => s.sim.now);
  const plan = useApp((s) => s.plan);
  const depot = useApp((s) => s.collector.depot);
  const routeSelection = useApp((s) => s.routeSelection);
  const toggleRoute = useApp((s) => s.toggleRoute);
  const fillNow = useApp((s) => s.fillNow);

  const prediction = useMemo(
    () => (fill ? predictThreshold(history ?? [], fill.sensor.liters, fill.thrL, now) : null),
    // prediksi cukup dihitung ulang tiap titik riwayat baru / perubahan ambang
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, fill?.thrL, fill && Math.round(fill.sensor.liters)],
  );

  const chartData = useMemo(
    () => (history ?? []).map((p) => ({ t: p.t, l: p.l })),
    [history],
  );

  if (!fill) {
    return (
      <div className="card p-4">
        Bengkel tidak ditemukan. <Link to="/app" className="font-semibold text-brand-700 underline">Kembali</Link>
      </div>
    );
  }
  const { w, sensor } = fill;
  const status = statusOf(fill.pct, fill.thrPct, w.online);
  const inRoute = routeSelection.includes(w.id);
  const waText = encodeURIComponent(`Halo ${w.name}, kami dari pengepul OILINK. Drum oli bekas Anda terpantau ${Math.round(sensor.liters)} L (${Math.round(fill.pct)}%). Kami jadwalkan penjemputan, terima kasih.`);

  return (
    <div>
      <button className="btn-ghost -ml-3 mb-1" onClick={() => nav(-1)}>
        <ArrowLeft size={18} /> Kembali
      </button>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold leading-tight">{w.name}</h1>
          <p className="text-sm text-slate-600">{w.address}</p>
          <p className="text-xs text-slate-500">
            {fmtKm(haversineKm(depot, w))} dari gudang · {OIL_LABEL[w.oilType]} · Sensor {w.sensorId}
          </p>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center gap-4 p-4">
        <DrumIllustration pct={fill.pct} status={status} distanceCm={sensor.distanceCm} />
        <div className="min-w-0 flex-1 space-y-2">
          <StatusBadge status={status} />
          <div>
            <p className="text-3xl font-extrabold leading-none">{fmtL(sensor.liters)}</p>
            <p className="text-sm text-slate-600">dari {w.drum.capacityL} L ({fmtPct(fill.pct)})</p>
          </div>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Clock size={11} /> {w.online ? `Update ${fmtRelative(sensor.updatedAt, now)}` : `Offline sejak ${fmtRelative(sensor.updatedAt, now)}`}
          </p>
        </div>
      </div>
        <dl className="grid grid-cols-3 gap-2 border-t border-slate-100 p-3 text-center text-xs">
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="flex items-center justify-center gap-1 text-slate-600"><Ruler size={12} /> distance_cm</dt>
              <dd className="font-mono font-bold">{sensor.distanceCm.toFixed(1)}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-slate-600">Tinggi oli</dt>
              <dd className="font-mono">{levelCmFromDistance(sensor.distanceCm, w.drum).toFixed(1)} / {w.drum.heightCm} cm</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-slate-600">Ambang</dt>
              <dd className="font-mono">{fmtL(fill.thrL)} ({fill.thrPct}%)</dd>
            </div>
          </dl>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to={`/app/serah-terima?bengkel=${w.id}`} className="btn-primary">
          <ClipboardCheck size={16} /> Serah terima
        </Link>
        <a className="btn-secondary" href={`https://wa.me/${w.phone}?text=${waText}`} target="_blank" rel="noreferrer">
          <MessageCircle size={16} /> Hubungi via WhatsApp
        </a>
        {plan === 'pro' && (
          <button className="btn-secondary" onClick={() => toggleRoute(w.id)}>
            {inRoute ? <Check size={16} /> : <Plus size={16} />} {inRoute ? 'Sudah di rute' : 'Tambah ke rute'}
          </button>
        )}
        <button className="btn-secondary" onClick={() => fillNow(w.id)} title="Simulasi: isi drum sampai melewati ambang">
          <Zap size={16} /> Isi drum (simulasi)
        </button>
      </div>

      <SectionTitle right={<ProBadge />}>Prediksi penuh</SectionTitle>
      <ProGate compact title="Prediksi kapan drum penuh" desc="Rencanakan penjemputan sebelum drum meluap.">
        <div className="card flex items-start gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
            <TrendingUp size={18} />
          </span>
          <div className="text-sm">
            {!w.online ? (
              <p>Sensor offline — prediksi tidak tersedia sampai sensor terhubung lagi.</p>
            ) : prediction?.status === 'ok' ? (
              <>
                <p className="font-bold">
                  Diperkirakan mencapai ambang dalam ± {fmtHours(prediction.hours)}
                </p>
                <p className="text-slate-600">Perkiraan: {fmtDateTime(prediction.at)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Regresi linear 48 jam terakhir · laju ±{prediction.slopeLph.toFixed(2)} L/jam · R² {prediction.r2.toFixed(2)}
                </p>
              </>
            ) : prediction?.status === 'reached' ? (
              <p className="font-bold text-red-700">Drum sudah mencapai ambang — siap dijemput.</p>
            ) : prediction?.status === 'not-filling' ? (
              <p>Drum hampir tidak bertambah dalam 48 jam terakhir.</p>
            ) : (
              <p>Tidak cukup data untuk prediksi (butuh minimal 12 jam data sejak penjemputan terakhir).</p>
            )}
          </div>
        </div>
      </ProGate>

      <SectionTitle right={<ProBadge />}>Riwayat isi 14 hari</SectionTitle>
      <ProGate title="Grafik riwayat isi drum" desc="Lihat pola pengisian & kapan terakhir dijemput.">
        <div className="card p-2 pt-4">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -18, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  scale="time"
                  tickFormatter={(t: number) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  tick={{ fontSize: 10, fill: '#475569' }}
                  minTickGap={24}
                />
                <YAxis domain={[0, w.drum.capacityL]} tick={{ fontSize: 10, fill: '#475569' }} unit=" L" width={52} />
                <Tooltip
                  labelFormatter={(t) => fmtDateTime(Number(t))}
                  formatter={(v) => [`${Number(v).toFixed(1)} L`, 'Isi drum']}
                />
                <ReferenceLine y={fill.thrL} stroke="#dc2626" strokeDasharray="5 4" label={{ value: `Ambang ${fill.thrPct}%`, fontSize: 10, fill: '#b91c1c', position: 'insideTopRight' }} />
                <Area type="monotone" dataKey="l" stroke="#0f766e" strokeWidth={2} fill="url(#fillGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ProGate>

      <SectionTitle right={<ProBadge />}>Pengaturan ambang</SectionTitle>
      <ProGate compact title="Ambang notifikasi per bengkel" desc="Basic memakai ambang tetap 80%.">
        <ThresholdEditor workshopId={w.id} />
      </ProGate>
    </div>
  );
}

function ThresholdEditor({ workshopId }: { workshopId: string }) {
  const w = useApp((s) => s.workshops.find((x) => x.id === workshopId));
  const setThreshold = useApp((s) => s.setThreshold);
  const [unit, setUnit] = useState<'pct' | 'l'>('pct');
  if (!w) return null;
  const cur = w.thresholdPct ?? 80;
  const cap = w.drum.capacityL;
  const value = unit === 'pct' ? cur : Math.round((cur / 100) * cap);
  const set = (v: number) => {
    const p = unit === 'pct' ? v : (v / cap) * 100;
    setThreshold(workshopId, Math.round(Math.min(98, Math.max(30, p))));
  };
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          Kirim notifikasi saat isi ≥ <span className="text-brand-800">{unit === 'pct' ? `${cur}%` : `${value} L`}</span>
        </p>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold" role="group" aria-label="Satuan ambang">
          {(['pct', 'l'] as const).map((u) => (
            <button key={u} aria-pressed={unit === u} onClick={() => setUnit(u)} className={`min-h-8 rounded-md px-3 ${unit === u ? 'bg-white shadow' : 'text-slate-600'}`}>
              {u === 'pct' ? '%' : 'Liter'}
            </button>
          ))}
        </div>
      </div>
      <input
        type="range"
        min={unit === 'pct' ? 30 : Math.round(cap * 0.3)}
        max={unit === 'pct' ? 98 : Math.round(cap * 0.98)}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-teal-700"
        aria-label="Ambang notifikasi"
      />
      <div className="mt-2 flex items-center gap-2">
        <input type="number" className="input w-28" value={value} onChange={(e) => set(Number(e.target.value))} aria-label="Nilai ambang" />
        <span className="text-sm text-slate-600">{unit === 'pct' ? '%' : `L dari ${cap} L`}</span>
        {w.thresholdPct != null && (
          <button className="btn-ghost ml-auto" onClick={() => setThreshold(workshopId, null)}>
            Kembalikan 80%
          </button>
        )}
      </div>
    </div>
  );
}
