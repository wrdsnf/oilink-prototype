import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { Bell, ClipboardCheck, FileText, House, Map, Route, Settings } from 'lucide-react';
import { useApp } from '../store/useApp';
import { Logo } from './ui';
import { useEffect } from 'react';

export function PlanSwitch() {
  const plan = useApp((s) => s.plan);
  const setPlan = useApp((s) => s.setPlan);
  return (
    <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-bold" role="group" aria-label="Paket langganan">
      {(['basic', 'pro'] as const).map((p) => (
        <button
          key={p}
          onClick={() => setPlan(p)}
          aria-pressed={plan === p}
          className={`min-h-9 rounded-[10px] px-3 transition ${plan === p ? (p === 'pro' ? 'bg-amber-400 text-slate-900 shadow' : 'bg-white text-brand-800 shadow') : 'text-slate-600'}`}
        >
          {p === 'basic' ? 'Basic' : 'Pro'}
        </button>
      ))}
    </div>
  );
}

const TABS = [
  { to: '/app', label: 'Beranda', Icon: House, end: true },
  { to: '/app/peta', label: 'Peta', Icon: Map },
  { to: '/app/rute', label: 'Rute', Icon: Route },
  { to: '/app/serah-terima', label: 'Serah Terima', Icon: ClipboardCheck },
  { to: '/app/riwayat', label: 'Riwayat', Icon: FileText },
];

export function Layout() {
  const unread = useApp((s) => s.notifications.filter((n) => !n.read).length);
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-slate-50">
      <div className="bg-brand-900 px-4 py-1 text-center text-[11px] font-medium text-brand-50">Prototype — data sensor disimulasikan</div>
      <header className="sticky top-0 z-[500] flex items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <Link to="/" className="mr-auto flex items-center gap-2" aria-label="Kembali ke halaman pembuka">
          <Logo size={30} />
          <span className="text-lg font-extrabold tracking-tight text-brand-800">OILINK</span>
        </Link>
        <PlanSwitch />
        <Link to="/app/notifikasi" className="btn-ghost relative px-2.5" aria-label={`Notifikasi, ${unread} belum dibaca`}>
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <Link to="/app/pengaturan" className="btn-ghost px-2.5" aria-label="Pengaturan">
          <Settings size={20} />
        </Link>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav className="pb-safe fixed bottom-0 left-1/2 z-[500] w-full max-w-2xl -translate-x-1/2 border-t border-slate-200 bg-white" aria-label="Navigasi utama">
        <ul className="grid grid-cols-5">
          {TABS.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? 'text-brand-700' : 'text-slate-500'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`rounded-full px-3 py-0.5 ${isActive ? 'bg-brand-100' : ''}`}>
                      <Icon size={20} aria-hidden />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
