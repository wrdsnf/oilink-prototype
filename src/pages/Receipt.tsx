import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Factory, MessageCircle, Printer, ShieldCheck, Store, Truck } from 'lucide-react';
import { useApp } from '../store/useApp';
import { PROCESSORS } from '../data/seed';
import { QrImage } from '../components/Qr';
import { fmtDateTime, fmtL, OIL_LABEL } from '../lib/format';
import type { Handover } from '../lib/types';

export function receiptText(h: Handover): string {
  return [
    '*BUKTI SERAH TERIMA OLI BEKAS — OILINK*',
    `No: ${h.id}`,
    `Waktu: ${fmtDateTime(h.createdAt)}`,
    `Bengkel: ${h.workshopName}`,
    `Pengepul: ${h.collectorName}`,
    `Volume: ${h.volumeL} L`,
    `Jenis oli: ${OIL_LABEL[h.oilType]}`,
    h.note ? `Catatan: ${h.note}` : '',
    h.processor ? `Diteruskan ke: ${h.processor.name} (${h.processor.manifestNo})` : '',
    '',
    'Simpan pesan ini sebagai bukti serah terima limbah B3. (Prototype — data demo)',
  ]
    .filter((l, i, arr) => l !== '' || arr[i - 1] !== '')
    .join('\n');
}

export function receiptQrValue(h: Handover): string {
  return `OILINK-WP|${h.id}|${new Date(h.createdAt).toISOString()}|${h.workshopId}|${h.volumeL}L|${h.oilType}`;
}

export default function Receipt() {
  const { id = '' } = useParams();
  const h = useApp((s) => s.handovers.find((x) => x.id === id));
  const ws = useApp((s) => s.workshops.find((w) => w.id === h?.workshopId));
  const handToProcessor = useApp((s) => s.handToProcessor);
  const [proc, setProc] = useState(PROCESSORS[0]);

  if (!h) return <p className="card p-4">Bukti tidak ditemukan.</p>;

  const steps = [
    { Icon: Store, title: 'Bengkel', sub: h.workshopName, done: true },
    { Icon: Truck, title: 'Pengepul', sub: `${h.collectorName} · ${fmtDateTime(h.createdAt)}`, done: true },
    { Icon: Factory, title: 'Pengelola berizin', sub: h.processor ? `${h.processor.name} · ${fmtDateTime(h.processor.at)}` : 'Belum diserahkan', done: !!h.processor },
  ];

  return (
    <div>
      <Link to="/app/serah-terima" className="btn-ghost no-print -ml-3 mb-1">
        <ArrowLeft size={18} /> Serah terima
      </Link>
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 bg-brand-700 px-4 py-3 text-white">
          <ShieldCheck size={20} />
          <div>
            <p className="text-xs font-semibold opacity-90">Digital Waste Passport</p>
            <p className="font-extrabold">Bukti serah terima</p>
          </div>
        </div>
        <div className="flex flex-col items-center p-4">
          <QrImage value={receiptQrValue(h)} size={180} alt={`QR bukti serah terima ${h.id}`} />
          <p className="mt-2 font-mono text-sm font-bold">{h.id}</p>
        </div>
        <dl className="divide-y divide-slate-100 border-t border-slate-100 px-4 text-sm">
          {[
            ['Waktu', fmtDateTime(h.createdAt)],
            ['Bengkel', h.workshopName],
            ['Pengepul', h.collectorName],
            ['Volume', fmtL(h.volumeL)],
            ['Jenis oli', OIL_LABEL[h.oilType]],
            ...(h.note ? [['Catatan', h.note]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-slate-600">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="no-print mt-3 grid grid-cols-1 gap-2">
        <a className="btn-primary" target="_blank" rel="noreferrer" href={`https://wa.me/${ws?.phone ?? ''}?text=${encodeURIComponent(receiptText(h))}`}>
          <MessageCircle size={18} /> Kirim bukti ke bengkel via WhatsApp
        </a>
        <button className="btn-secondary" onClick={() => window.print()}>
          <Printer size={18} /> Cetak / simpan PDF
        </button>
      </div>

      <h2 className="mb-2 mt-6 text-base font-bold">Rantai serah terima</h2>
      <ol className="card space-y-0 p-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span className={`absolute left-[17px] top-9 h-[calc(100%-28px)] w-0.5 ${steps[i + 1].done ? 'bg-brand-600' : 'bg-slate-200'}`} />}
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.done ? 'bg-brand-700 text-white' : 'border-2 border-dashed border-slate-300 text-slate-400'}`}>
              <s.Icon size={16} />
            </span>
            <div>
              <p className="text-sm font-bold">{s.title}</p>
              <p className="text-xs text-slate-600">{s.sub}</p>
              {h.processor && i === 2 && <p className="text-xs text-slate-500">No. manifest {h.processor.manifestNo}</p>}
            </div>
          </li>
        ))}
      </ol>

      {!h.processor && (
        <div className="card no-print mt-3 p-4">
          <p className="text-sm font-bold">Langkah 2 (opsional): Serahkan ke pengelola berizin</p>
          <label className="label mt-3" htmlFor="proc">Pengelola</label>
          <select id="proc" className="input" value={proc} onChange={(e) => setProc(e.target.value)}>
            {PROCESSORS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button className="btn-primary mt-3 w-full" onClick={() => handToProcessor(h.id, proc)}>
            <Factory size={18} /> Catat penyerahan ke pengelola
          </button>
          <p className="mt-1 text-[11px] text-slate-500">Nama pengelola fiktif untuk demo.</p>
        </div>
      )}
    </div>
  );
}
