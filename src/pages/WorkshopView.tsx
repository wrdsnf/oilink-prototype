import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Download, Printer, ShieldCheck, Truck } from 'lucide-react';
import { useApp, useFill } from '../store/useApp';
import { DrumIllustration, Logo, SectionTitle, StatusBadge, statusOf } from '../components/ui';
import { QrImage, drumQrValue, qrDataUrl } from '../components/Qr';
import { fmtDateTime, fmtL, fmtPct, fmtRelative, OIL_LABEL } from '../lib/format';
import { estimateMinutes, routeLength } from '../lib/route';

export default function WorkshopView() {
  const workshops = useApp((s) => s.workshops);
  const id = useApp((s) => s.workshopViewId);
  const setView = useApp((s) => s.setWorkshopView);
  const fill = useFill(id);
  const now = useApp((s) => s.sim.now);
  const allHandovers = useApp((s) => s.handovers);
  const handovers = useMemo(() => allHandovers.filter((h) => h.workshopId === id), [allHandovers, id]);
  const schedule = useApp((s) => s.schedule);
  const collector = useApp((s) => s.collector);

  if (!fill) return null;
  const { w, sensor } = fill;
  const status = statusOf(fill.pct, fill.thrPct, w.online);

  // jadwal berikutnya: cari bengkel ini di jadwal rute pengepul
  let eta: { trip: number; stop: number; at: number } | null = null;
  if (schedule) {
    schedule.trips.forEach((trip, ti) => {
      const idx = trip.indexOf(id);
      if (idx < 0) return;
      const pts = trip.slice(0, idx + 1).map((x) => workshops.find((ww) => ww.id === x)!).filter(Boolean);
      const km = routeLength(collector.depot, pts, false);
      eta = { trip: ti + 1, stop: idx + 1, at: schedule.createdAt + 30 * 60000 + estimateMinutes(km, idx) * 60000 };
    });
  }
  const sched = eta as { trip: number; stop: number; at: number } | null;

  const download = async () => {
    const url = await qrDataUrl(drumQrValue(w.sensorId), 800);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-drum-${w.sensorId}.png`;
    a.click();
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50">
      <div className="no-print bg-brand-900 px-4 py-1 text-center text-[11px] font-medium text-brand-50">Prototype — data sensor disimulasikan</div>
      <header className="no-print flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <Link to="/" className="btn-ghost -ml-2 px-2" aria-label="Kembali">
          <ArrowLeft size={20} />
        </Link>
        <Logo size={28} />
        <div className="leading-tight">
          <p className="font-extrabold text-brand-800">OILINK</p>
          <p className="text-[11px] text-slate-500">Tampilan bengkel</p>
        </div>
      </header>

      <main className="px-4 pb-10 pt-4">
        <div className="no-print">
          <label className="label" htmlFor="ws-pick">Masuk sebagai bengkel (demo)</label>
          <select id="ws-pick" className="input" value={id} onChange={(e) => setView(e.target.value)}>
            {workshops.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </div>

        <h1 className="no-print mt-4 text-xl font-extrabold">{w.name}</h1>
        <p className="no-print text-sm text-slate-600">Mitra {collector.name}</p>

        <div className="card no-print mt-3 flex items-center gap-4 p-4">
          <DrumIllustration pct={fill.pct} status={status} distanceCm={sensor.distanceCm} />
          <div className="space-y-2">
            <StatusBadge status={status} />
            <p className="text-3xl font-extrabold leading-none">{fmtL(sensor.liters)}</p>
            <p className="text-sm text-slate-600">dari {w.drum.capacityL} L ({fmtPct(fill.pct)})</p>
            <p className="text-xs text-slate-500">{w.online ? `Update ${fmtRelative(sensor.updatedAt, now)}` : 'Sensor offline — hubungi pengepul'}</p>
          </div>
        </div>

        <SectionTitle>Jadwal jemput berikutnya</SectionTitle>
        <div className="card no-print flex items-start gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
            {sched ? <Truck size={18} /> : <CalendarClock size={18} />}
          </span>
          {sched ? (
            <div className="text-sm">
              <p className="font-bold">Dijadwalkan — perkiraan tiba {fmtDateTime(sched.at)}</p>
              <p className="text-slate-600">
                Trip {sched.trip}, stop ke-{sched.stop}. Siapkan drum agar mudah dijangkau.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Belum ada jadwal. {fill.above ? 'Drum sudah di atas ambang — pengepul sudah menerima notifikasi.' : `Pengepul otomatis dinotifikasi saat drum mencapai ${fill.thrPct}%.`}
            </p>
          )}
        </div>

        <SectionTitle>QR drum</SectionTitle>
        <div className="card flex flex-col items-center p-4 text-center print:border-0 print:shadow-none">
          <p className="hidden text-2xl font-extrabold print:block">OILINK — {w.name}</p>
          <QrImage value={drumQrValue(w.sensorId)} size={200} alt={`QR drum ${w.sensorId}`} />
          <p className="mt-2 font-mono text-lg font-bold">{w.sensorId}</p>
          <p className="text-xs text-slate-600">Tempel di drum. Pengepul men-scan QR ini saat serah terima.</p>
          <div className="no-print mt-3 grid w-full grid-cols-2 gap-2">
            <button className="btn-secondary" onClick={download}>
              <Download size={16} /> Unduh PNG
            </button>
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer size={16} /> Cetak
            </button>
          </div>
        </div>

        <div className="no-print">
          <SectionTitle>Riwayat serah terima</SectionTitle>
          {handovers.length === 0 ? (
            <p className="card p-4 text-sm text-slate-600">Belum ada serah terima.</p>
          ) : (
            <ul className="card divide-y divide-slate-100">
              {handovers.slice(0, 10).map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <ShieldCheck size={18} className="shrink-0 text-brand-700" />
                  <span className="flex-1">
                    <span className="block font-semibold">{fmtL(h.volumeL)} · {OIL_LABEL[h.oilType]}</span>
                    <span className="text-xs text-slate-500">{fmtDateTime(h.createdAt)} · {h.id}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
