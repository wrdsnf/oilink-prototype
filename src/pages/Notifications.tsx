import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff, BellRing, Trash2 } from 'lucide-react';
import { useApp } from '../store/useApp';
import { notificationSupported, requestNotificationPermission } from '../store/notify';
import { fmtRelative } from '../lib/format';

export function BrowserNotifToggle() {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(notificationSupported() ? Notification.permission : 'unsupported');
  if (perm === 'granted') return <p className="flex items-center gap-2 text-sm text-emerald-800"><BellRing size={16} /> Notifikasi browser aktif.</p>;
  if (perm === 'unsupported') return <p className="text-sm text-slate-600">Browser ini tidak mendukung notifikasi — notifikasi tetap tampil di dalam app.</p>;
  if (perm === 'denied') return <p className="text-sm text-slate-600">Notifikasi browser ditolak. Notifikasi tetap tampil di dalam app (ubah izin lewat pengaturan situs browser).</p>;
  return (
    <button className="btn-secondary w-full" onClick={async () => setPerm(await requestNotificationPermission())}>
      <BellRing size={16} /> Aktifkan notifikasi browser
    </button>
  );
}

export default function Notifications() {
  const notifications = useApp((s) => s.notifications);
  const now = useApp((s) => s.sim.now);
  const markAllRead = useApp((s) => s.markAllRead);
  const clear = useApp((s) => s.clearNotifications);

  // tandai dibaca saat meninggalkan halaman
  useEffect(() => () => markAllRead(), [markAllRead]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Notifikasi</h1>
        {notifications.length > 0 && (
          <button className="btn-ghost" onClick={clear}>
            <Trash2 size={16} /> Hapus semua
          </button>
        )}
      </div>
      <div className="card mt-3 p-3">
        <BrowserNotifToggle />
      </div>
      {notifications.length === 0 ? (
        <div className="card mt-3 flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-600">
          <BellOff size={28} className="text-slate-400" />
          Belum ada notifikasi. Notifikasi muncul saat drum mencapai ambang.
          <Link to="/app/pengaturan" className="btn-ghost">Picu lewat simulator</Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link to={`/app/bengkel/${n.workshopId}`} className={`card flex gap-3 p-3 ${n.read ? '' : 'border-amber-300 bg-amber-50'}`}>
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-slate-300' : 'bg-red-600'}`} aria-label={n.read ? 'sudah dibaca' : 'belum dibaca'} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{n.message}</span>
                  <span className="text-xs text-slate-500">{fmtRelative(n.createdAt, now)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
