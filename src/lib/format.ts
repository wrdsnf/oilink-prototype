const HOUR = 3600_000;

export function fmtL(l: number): string {
  return `${Math.round(l).toLocaleString('id-ID')} L`;
}

export function fmtPct(p: number): string {
  return `${Math.round(p)}%`;
}

export function fmtKm(km: number): string {
  return `${km.toLocaleString('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} j ${m} mnt` : `${m} mnt`;
}

export function fmtDateTime(t: number): string {
  return new Date(t).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDate(t: number): string {
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtRelative(t: number, now: number): string {
  const diff = Math.max(0, now - t);
  const min = Math.round(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.round(diff / HOUR);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

export function fmtHours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} menit`;
  if (h < 48) return `${Math.round(h)} jam`;
  return `${(h / 24).toLocaleString('id-ID', { maximumFractionDigits: 1 })} hari`;
}

export const OIL_LABEL = { motor: 'Oli motor', mobil: 'Oli mobil', campur: 'Campuran' } as const;
