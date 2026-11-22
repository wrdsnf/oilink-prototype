import { useNavigate } from 'react-router-dom';
import { BellRing, ChevronRight, ClipboardCheck, Route, Store, Truck } from 'lucide-react';
import { useApp } from '../store/useApp';
import { Logo } from '../components/ui';

export default function Landing() {
  const nav = useNavigate();
  const setRole = useApp((s) => s.setRole);
  const setPlan = useApp((s) => s.setPlan);

  const enter = (plan: 'basic' | 'pro') => {
    setRole('collector');
    setPlan(plan);
    nav('/app');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-800 to-brand-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <div className="mb-6 inline-flex self-start rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900">
          Prototype — data sensor disimulasikan
        </div>
        <div className="flex items-center gap-3">
          <Logo size={56} />
          <h1 className="text-4xl font-extrabold tracking-tight">OILINK</h1>
        </div>
        <p className="mt-4 text-lg font-medium leading-snug text-brand-50">
          Sewa sensor IoT + aplikasi pemantauan untuk pengepul oli bekas
        </p>

        <ul className="mt-6 space-y-3 text-sm text-brand-50">
          {[
            { Icon: BellRing, t: 'Notifikasi otomatis saat drum di bengkel hampir penuh' },
            { Icon: Route, t: 'Optimasi Rute penjemputan sesuai kapasitas kendaraan' },
            { Icon: ClipboardCheck, t: 'Bukti serah terima limbah B3 (Digital Waste Passport)' },
          ].map(({ Icon, t }) => (
            <li key={t} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Icon size={16} aria-hidden />
              </span>
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-3 pt-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">Pilih mode demo</p>
          <button onClick={() => enter('basic')} className="btn w-full justify-between bg-white text-brand-900 hover:bg-brand-50">
            <span className="flex items-center gap-2"><Truck size={18} /> Masuk sebagai Pengepul (Basic)</span>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => enter('pro')} className="btn w-full justify-between bg-amber-400 text-slate-900 hover:bg-amber-300">
            <span className="flex items-center gap-2"><Truck size={18} /> Masuk sebagai Pengepul (Pro)</span>
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => {
              setRole('workshop');
              nav('/bengkel');
            }}
            className="btn w-full justify-between border border-white/40 text-white hover:bg-white/10"
          >
            <span className="flex items-center gap-2"><Store size={18} /> Lihat sebagai Bengkel</span>
            <ChevronRight size={18} />
          </button>
          <p className="pt-2 text-center text-[11px] text-brand-200">
            Tanpa login. Semua nama bengkel, pengepul, dan pengelola adalah fiktif.
          </p>
        </div>
      </div>
    </div>
  );
}
