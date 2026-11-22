import type { HistoryPoint } from './types';

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
}

/** Regresi linear kuadrat terkecil y = slope·x + intercept. */
export function linearRegression(xs: number[], ys: number[]): Regression | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

export type Prediction =
  | { status: 'ok'; hours: number; at: number; slopeLph: number; r2: number }
  | { status: 'reached' }
  | { status: 'not-filling'; slopeLph: number }
  | { status: 'insufficient' };

const HOUR = 3600_000;

/**
 * Prediksi kapan isi drum mencapai ambang, memakai regresi linear dari data 48 jam terakhir.
 * Jika ada pengosongan (penurunan tajam) di jendela itu, hanya data sesudahnya yang dipakai.
 */
export function predictThreshold(
  history: HistoryPoint[],
  currentL: number,
  thresholdL: number,
  now: number,
  windowHours = 48,
): Prediction {
  if (currentL >= thresholdL) return { status: 'reached' };
  let pts = history.filter((p) => p.t >= now - windowHours * HOUR && p.t <= now);
  for (let i = pts.length - 1; i > 0; i--) {
    if (pts[i].l < pts[i - 1].l - 10) {
      pts = pts.slice(i);
      break;
    }
  }
  if (pts.length < 6 || pts[pts.length - 1].t - pts[0].t < 12 * HOUR) return { status: 'insufficient' };
  const t0 = pts[0].t;
  const reg = linearRegression(
    pts.map((p) => (p.t - t0) / HOUR),
    pts.map((p) => p.l),
  );
  if (!reg) return { status: 'insufficient' };
  if (reg.slope <= 0.01) return { status: 'not-filling', slopeLph: reg.slope };
  const hours = (thresholdL - currentL) / reg.slope;
  return { status: 'ok', hours, at: now + hours * HOUR, slopeLph: reg.slope, r2: reg.r2 };
}
