/** PRNG deterministik (mulberry32) supaya seed data selalu sama. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Faktor aktivitas bengkel per jam (ramai di jam kerja). Rata-rata harian ≈ 1. */
export function activityFactor(hour: number): number {
  if (hour >= 8 && hour < 17) return 2.0;
  if (hour >= 7 && hour < 19) return 0.8;
  return 0.3;
}

/** Laju oli masuk (L/jam) pada waktu t, untuk bengkel dengan rata-rata dailyL per hari. */
export function fillRateLph(dailyL: number, t: number): number {
  return (dailyL / 24) * activityFactor(new Date(t).getHours());
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0')}`;
}
