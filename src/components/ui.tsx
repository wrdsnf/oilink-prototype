import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, CircleDashed, Droplet, Lock, WifiOff, X } from 'lucide-react';
import { useApp } from '../store/useApp';

export type FillStatus = 'offline' | 'full' | 'mid' | 'low';

export function statusOf(p: number, thrPct: number, online: boolean): FillStatus {
  if (!online) return 'offline';
  if (p >= thrPct) return 'full';
  if (p >= 50) return 'mid';
  return 'low';
}

export const STATUS_META: Record<FillStatus, { label: string; color: string; bar: string; badge: string; hex: string; Icon: typeof Droplet }> = {
  full: { label: 'Siap jemput', color: 'text-red-700', bar: 'bg-red-600', badge: 'bg-red-50 text-red-800 border-red-200', hex: '#dc2626', Icon: AlertTriangle },
  mid: { label: 'Terisi sedang', color: 'text-amber-700', bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-900 border-amber-200', hex: '#f59e0b', Icon: Droplet },
  low: { label: 'Masih rendah', color: 'text-emerald-700', bar: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', hex: '#059669', Icon: CircleDashed },
  offline: { label: 'Sensor offline', color: 'text-slate-600', bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-300', hex: '#64748b', Icon: WifiOff },
};

export function StatusBadge({ status }: { status: FillStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${m.badge}`}>
      <m.Icon size={12} aria-hidden /> {m.label}
    </span>
  );
}

export function FillBar({ pct, thrPct, status }: { pct: number; thrPct: number; status: FillStatus }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-700 ${STATUS_META[status].bar}`} style={{ width: `${pct}%` }} />
      <div className="absolute top-0 h-full w-0.5 bg-slate-700/60" style={{ left: `${thrPct}%` }} title={`Ambang ${thrPct}%`} />
    </div>
  );
}

/** Ilustrasi drum (SVG) yang terisi sesuai volume + posisi sensor di tutup. */
export function DrumIllustration({ pct, status, distanceCm }: { pct: number; status: FillStatus; distanceCm: number }) {
  const top = 34;
  const h = 150;
  const fillH = (pct / 100) * h;
  const color = STATUS_META[status].hex;
  return (
    <svg viewBox="0 0 160 210" className="h-52 w-auto" role="img" aria-label={`Drum terisi ${Math.round(pct)} persen`}>
      {/* sensor */}
      <rect x="66" y="6" width="28" height="14" rx="3" fill="#0f766e" />
      <text x="80" y="16" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">ESP32</text>
      {/* body */}
      <defs>
        <clipPath id="drumclip">
          <rect x="20" y={top} width="120" height={h} rx="10" />
        </clipPath>
      </defs>
      <rect x="20" y={top} width="120" height={h} rx="10" fill="#f1f5f9" stroke="#334155" strokeWidth="3" />
      <g clipPath="url(#drumclip)">
        <rect x="20" y={top + h - fillH} width="120" height={fillH} fill={color} opacity="0.85" style={{ transition: 'all .7s' }} />
        <rect x="20" y={top + h - fillH} width="120" height="4" fill="#fff" opacity="0.35" />
      </g>
      <line x1="20" y1={top + h * 0.33} x2="140" y2={top + h * 0.33} stroke="#334155" strokeWidth="2" opacity="0.3" />
      <line x1="20" y1={top + h * 0.66} x2="140" y2={top + h * 0.66} stroke="#334155" strokeWidth="2" opacity="0.3" />
      {/* jarak sensor → permukaan oli */}
      <line x1="80" y1="22" x2="80" y2={top + h - fillH} stroke="#0f766e" strokeDasharray="3 3" strokeWidth="1.5" />
      {fillH < h - 14 && (
        <>
          <rect x="84" y={Math.max(top + 4, (22 + top + h - fillH) / 2 - 8)} width="52" height="14" rx="3" fill="#fff" stroke="#0f766e" strokeWidth="1" />
          <text x="110" y={Math.max(top + 4, (22 + top + h - fillH) / 2 - 8) + 10} textAnchor="middle" fontSize="9" fill="#115e59" fontWeight="700">
            {distanceCm.toFixed(1)} cm
          </text>
        </>
      )}
      <text x="80" y={top + h + 22} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">{Math.round(pct)}%</text>
    </svg>
  );
}

/** Bungkus fitur Pro. Di akun Basic konten diburamkan + ajakan upgrade (tetap terlihat). */
export function ProGate({ children, title, desc, compact }: { children: ReactNode; title: string; desc?: string; compact?: boolean }) {
  const plan = useApp((s) => s.plan);
  const setPlan = useApp((s) => s.setPlan);
  if (plan === 'pro') return <>{children}</>;
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none opacity-60 blur-[3px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-4">
        <div className={`card max-w-xs p-4 text-center ${compact ? 'py-3' : ''}`}>
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Lock size={18} aria-hidden />
          </div>
          <p className="text-sm font-bold">{title}</p>
          {desc && <p className="mt-1 text-xs text-slate-600">{desc}</p>}
          <button className="btn-warn mt-3 w-full" onClick={() => setPlan('pro')}>
            Upgrade ke Pro
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProBadge() {
  return <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">Pro</span>;
}

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-slate-900/50" aria-label="Tutup" onClick={onClose} />
      <div className="pb-safe relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-ghost -mr-2 px-2" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, Icon, tone = 'brand' }: { label: string; value: string; sub?: string; Icon: typeof Droplet; tone?: 'brand' | 'red' | 'amber' | 'slate' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-800',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-800',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="card p-3">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={16} aria-hidden />
      </div>
      <p className="text-xl font-extrabold leading-tight">{value}</p>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between gap-2">
      <h2 className="text-base font-bold text-slate-900">{children}</h2>
      {right}
    </div>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return <img src="/icon.svg" width={size} height={size} alt="" className="rounded-lg" />;
}
