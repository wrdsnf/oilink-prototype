import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Factory } from 'lucide-react';
import { useApp } from '../store/useApp';
import { toCsv } from '../lib/misc';
import { fmtDate, fmtDateTime, fmtL, OIL_LABEL } from '../lib/format';
import { ProBadge, ProGate } from '../components/ui';

const toInputDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function History() {
  const handovers = useApp((s) => s.handovers);
  const workshops = useApp((s) => s.workshops);
  const now = useApp((s) => s.sim.now);
  const [ws, setWs] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    const f = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const t = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    return handovers.filter((h) => (!ws || h.workshopId === ws) && h.createdAt >= f && h.createdAt <= t);
  }, [handovers, ws, from, to]);

  const perMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of filtered) {
      const k = new Date(h.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      m.set(k, (m.get(k) ?? 0) + h.volumeL);
    }
    return [...m.entries()];
  }, [filtered]);

  const exportCsv = () => {
    const csv = toCsv(
      ['id', 'waktu', 'bengkel_id', 'bengkel', 'pengepul', 'volume_l', 'jenis_oli', 'catatan', 'pengelola', 'no_manifest', 'waktu_ke_pengelola'],
      filtered.map((h) => [
        h.id,
        new Date(h.createdAt).toISOString(),
        h.workshopId,
        h.workshopName,
        h.collectorName,
        h.volumeL,
        h.oilType,
        h.note,
        h.processor?.name ?? '',
        h.processor?.manifestNo ?? '',
        h.processor ? new Date(h.processor.at).toISOString() : '',
      ]),
    );
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oilink-waste-passport-${toInputDate(now)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = filtered.reduce((a, h) => a + h.volumeL, 0);

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-extrabold">Riwayat & laporan</h1>
        <ProBadge />
      </div>
      <p className="text-sm text-slate-600">Semua serah terima (Waste Passport) untuk laporan limbah B3.</p>

      <div className="mt-4">
        <ProGate title="Riwayat & laporan serah terima" desc="Filter, rekap liter per bulan, dan ekspor CSV untuk pelaporan.">
          <div className="card grid grid-cols-2 gap-2 p-3">
            <div className="col-span-2">
              <label className="label" htmlFor="f-ws">Bengkel</label>
              <select id="f-ws" className="input" value={ws} onChange={(e) => setWs(e.target.value)}>
                <option value="">Semua bengkel</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-from">Dari tanggal</label>
              <input id="f-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="f-to">Sampai tanggal</label>
              <input id="f-to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="card p-3">
              <p className="text-xs text-slate-600">Total terkumpul</p>
              <p className="text-xl font-extrabold">{fmtL(total)}</p>
              <p className="text-[11px] text-slate-500">{filtered.length} serah terima</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-slate-600">Per bulan</p>
              {perMonth.length === 0 && <p className="text-sm">–</p>}
              {perMonth.map(([k, v]) => (
                <p key={k} className="flex justify-between text-sm">
                  <span className="capitalize">{k}</span> <b>{fmtL(v)}</b>
                </p>
              ))}
            </div>
          </div>

          <button className="btn-primary mt-3 w-full" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={18} /> Ekspor CSV ({filtered.length} baris)
          </button>

          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Waktu</th>
                  <th className="px-3 py-2 font-semibold">Bengkel</th>
                  <th className="px-3 py-2 text-right font-semibold">Volume</th>
                  <th className="px-3 py-2 font-semibold">Jenis</th>
                  <th className="px-3 py-2 font-semibold">Pengelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-brand-50/50">
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link to={`/app/bukti/${h.id}`} className="font-semibold text-brand-800 underline-offset-2 hover:underline">
                        {fmtDateTime(h.createdAt)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{h.workshopName.replace('Bengkel ', '')}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.volumeL} L</td>
                    <td className="px-3 py-2">{OIL_LABEL[h.oilType]}</td>
                    <td className="px-3 py-2">{h.processor ? <Factory size={14} className="text-brand-700" aria-label={h.processor.name} /> : <span className="text-xs text-slate-500">belum</span>}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Tidak ada data untuk filter ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Data sejak {handovers.length ? fmtDate(handovers[handovers.length - 1].createdAt) : '–'}.</p>
        </ProGate>
      </div>
    </div>
  );
}
