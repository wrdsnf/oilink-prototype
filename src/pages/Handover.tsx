import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Keyboard, QrCode, ScanLine } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useWorkshopRows } from '../store/derived';
import { BottomSheet, SectionTitle, StatusBadge } from '../components/ui';
import { QrScanner, parseDrumCode } from '../components/Qr';
import { fmtL, fmtPct, OIL_LABEL } from '../lib/format';
import type { OilType, Workshop } from '../lib/types';

export default function Handover() {
  const [params, setParams] = useSearchParams();
  const preset = params.get('bengkel');
  const rows = useWorkshopRows();
  const schedule = useApp((s) => s.schedule);
  const [scanOpen, setScanOpen] = useState(false);
  const [manual, setManual] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [verified, setVerified] = useState<Workshop | null>(null);
  const target = rows.find((r) => r.w.id === preset);

  const scheduled = new Set(schedule?.trips.flat() ?? []);
  const list = [...rows].sort((a, b) => Number(scheduled.has(b.w.id)) - Number(scheduled.has(a.w.id)) || b.pct - a.pct);

  const handleCode = (raw: string) => {
    const code = parseDrumCode(raw);
    const found = rows.find((r) => r.w.sensorId === code);
    if (!found) {
      setScanError(`Kode "${raw}" tidak dikenali sebagai drum OILINK.`);
      return;
    }
    setScanError(null);
    setScanOpen(false);
    setVerified(found.w);
    setParams({ bengkel: found.w.id }, { replace: true });
  };

  if (verified) return <HandoverForm workshop={verified} mismatch={!!preset && preset !== verified.id && !!target} onCancel={() => setVerified(null)} />;

  return (
    <div>
      <h1 className="text-xl font-extrabold">Serah terima</h1>
      <p className="text-sm text-slate-600">Digital Waste Passport — setiap penjemputan oli bekas (limbah B3) dicatat sebagai bukti serah terima.</p>

      {target && (
        <div className="card mt-4 p-4">
          <p className="text-xs font-semibold text-slate-500">Bengkel tujuan</p>
          <p className="font-bold">{target.w.name}</p>
          <p className="text-sm text-slate-600">
            Isi drum {fmtL(target.liters)} ({fmtPct(target.pct)}) · kode {target.w.sensorId}
          </p>
        </div>
      )}

      <button className="btn-primary mt-4 min-h-14 w-full text-base" onClick={() => setScanOpen(true)}>
        <ScanLine size={22} /> Mulai serah terima
      </button>
      <p className="mt-1 text-center text-xs text-slate-500">Scan QR yang tertempel di drum bengkel untuk verifikasi.</p>

      <SectionTitle>{schedule ? 'Bengkel (terjadwal di atas)' : 'Pilih bengkel'}</SectionTitle>
      <ul className="card divide-y divide-slate-100">
        {list.map((r) => (
          <li key={r.w.id}>
            <button className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left" onClick={() => setParams({ bengkel: r.w.id })}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {r.w.name}
                  {scheduled.has(r.w.id) && <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">TERJADWAL</span>}
                </span>
                <span className="text-xs text-slate-600">
                  {fmtL(r.liters)} · {r.w.sensorId}
                </span>
              </span>
              <StatusBadge status={r.status} />
            </button>
          </li>
        ))}
      </ul>

      <BottomSheet open={scanOpen} onClose={() => setScanOpen(false)} title="Scan QR drum">
        {scanOpen && <QrScanner onResult={handleCode} />}
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCode(manual);
          }}
        >
          <label className="label" htmlFor="manual-code">
            <Keyboard size={12} className="mr-1 inline" /> Atau ketik kode drum
          </label>
          <div className="flex gap-2">
            <input id="manual-code" className="input font-mono" placeholder="mis. OIL-MGL-001" value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="characters" />
            <button className="btn-primary" type="submit" disabled={!manual.trim()}>
              Cek
            </button>
          </div>
          {target && (
            <button type="button" className="btn-ghost mt-2 w-full text-xs" onClick={() => handleCode(target.w.sensorId)}>
              <QrCode size={14} /> Demo: pakai kode {target.w.sensorId} ({target.w.name})
            </button>
          )}
          {scanError && <p className="mt-2 text-sm font-semibold text-red-700">{scanError}</p>}
        </form>
      </BottomSheet>
    </div>
  );
}

function HandoverForm({ workshop, mismatch, onCancel }: { workshop: Workshop; mismatch: boolean; onCancel: () => void }) {
  const nav = useNavigate();
  const liters = useApp((s) => s.sensors[workshop.id]?.liters ?? 0);
  const addHandover = useApp((s) => s.addHandover);
  const [volume, setVolume] = useState(String(Math.round(liters)));
  const [oil, setOil] = useState<OilType>(workshop.oilType);
  const [note, setNote] = useState('');
  const v = Number(volume);
  const valid = Number.isFinite(v) && v > 0 && v <= workshop.drum.capacityL;

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
        <CheckCircle2 size={20} className="shrink-0" />
        <p>
          Drum terverifikasi: <b>{workshop.name}</b> ({workshop.sensorId})
        </p>
      </div>
      {mismatch && (
        <p className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle size={18} /> QR berbeda dari bengkel yang dipilih sebelumnya — pastikan Anda di lokasi yang benar.
        </p>
      )}
      <h1 className="mt-4 text-xl font-extrabold">Form serah terima</h1>
      <form
        className="mt-3 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          const id = addHandover({ workshopId: workshop.id, volumeL: Math.round(v), oilType: oil, note: note.trim() });
          nav(`/app/bukti/${id}`, { replace: true });
        }}
      >
        <div>
          <label className="label" htmlFor="vol">Volume terambil (L)</label>
          <input id="vol" type="number" inputMode="decimal" className="input text-lg font-bold" value={volume} onChange={(e) => setVolume(e.target.value)} min={1} max={workshop.drum.capacityL} />
          <p className="mt-1 text-xs text-slate-500">Terbaca sensor: {fmtL(liters)} dari {workshop.drum.capacityL} L</p>
          {!valid && <p className="mt-1 text-xs font-semibold text-red-700">Isi antara 1 dan {workshop.drum.capacityL} L.</p>}
        </div>
        <fieldset>
          <legend className="label">Jenis oli</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(OIL_LABEL) as OilType[]).map((o) => (
              <button type="button" key={o} aria-pressed={oil === o} onClick={() => setOil(o)} className={`btn border ${oil === o ? 'border-brand-700 bg-brand-50 text-brand-900' : 'border-slate-300 bg-white text-slate-700'}`}>
                {OIL_LABEL[o]}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="note">Catatan (opsional)</label>
          <textarea id="note" className="input min-h-20 py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. ada sedikit air, drum perlu dibersihkan" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>Batal</button>
          <button type="submit" className="btn-primary" disabled={!valid}>Simpan serah terima</button>
        </div>
      </form>
    </div>
  );
}
