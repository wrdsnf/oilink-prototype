import { describe, expect, it } from 'vitest';
import { distanceFromLiters, drumSpecFor, litersFromDistance, pct } from './volume';
import { linearRegression, predictThreshold } from './prediction';
import { nearestNeighbor, planTrips, routeLength, twoOpt, googleMapsUrl, type Stop } from './route';
import { haversineKm } from './geo';
import { toCsv } from './misc';
import type { HistoryPoint } from './types';

describe('konversi volume (jarak sensor → liter)', () => {
  const d200 = drumSpecFor(200);

  it('drum penuh saat jarak = offset sensor', () => {
    expect(litersFromDistance(d200.sensorOffsetCm, d200)).toBeCloseTo(200);
  });

  it('drum kosong saat jarak = offset + tinggi drum', () => {
    expect(litersFromDistance(d200.sensorOffsetCm + d200.heightCm, d200)).toBeCloseTo(0);
  });

  it('setengah tinggi = setengah volume', () => {
    expect(litersFromDistance(d200.sensorOffsetCm + d200.heightCm / 2, d200)).toBeCloseTo(100);
  });

  it('nilai di luar jangkauan di-clamp', () => {
    expect(litersFromDistance(5, d200)).toBeCloseTo(200);
    expect(litersFromDistance(500, d200)).toBe(0);
  });

  it('distanceFromLiters adalah kebalikan litersFromDistance', () => {
    const d100 = drumSpecFor(100);
    for (const l of [0, 13.5, 50, 87.2, 100]) {
      expect(litersFromDistance(distanceFromLiters(l, d100), d100)).toBeCloseTo(l, 6);
    }
  });

  it('persentase', () => {
    expect(pct(160, 200)).toBe(80);
    expect(pct(250, 200)).toBe(100);
  });
});

describe('regresi & prediksi penuh', () => {
  const HOUR = 3600_000;
  const now = Date.UTC(2026, 10, 20, 12);

  it('regresi linear menemukan slope & intercept yang tepat', () => {
    const xs = [0, 1, 2, 3, 4];
    const reg = linearRegression(xs, xs.map((x) => 2 * x + 5));
    expect(reg?.slope).toBeCloseTo(2);
    expect(reg?.intercept).toBeCloseTo(5);
    expect(reg?.r2).toBeCloseTo(1);
  });

  it('memprediksi waktu mencapai ambang dari data 48 jam', () => {
    // naik 1 L/jam, sekarang 100 L, ambang 160 L → ±60 jam
    const hist: HistoryPoint[] = [];
    for (let h = 48; h >= 0; h--) hist.push({ t: now - h * HOUR, l: 100 - h });
    const p = predictThreshold(hist, 100, 160, now);
    expect(p.status).toBe('ok');
    if (p.status === 'ok') {
      expect(p.hours).toBeCloseTo(60, 1);
      expect(p.at).toBeCloseTo(now + 60 * HOUR, -3);
    }
  });

  it('"tidak cukup data" bila titik terlalu sedikit', () => {
    const hist = [0, 1, 2].map((h) => ({ t: now - h * HOUR, l: 50 }));
    expect(predictThreshold(hist, 50, 160, now).status).toBe('insufficient');
  });

  it('hanya memakai data sesudah pengosongan', () => {
    const hist: HistoryPoint[] = [];
    for (let h = 48; h > 20; h--) hist.push({ t: now - h * HOUR, l: 190 - h }); // sebelum dijemput
    for (let h = 20; h >= 0; h--) hist.push({ t: now - h * HOUR, l: (20 - h) * 2 }); // 2 L/jam sesudahnya
    const p = predictThreshold(hist, 40, 160, now);
    expect(p.status).toBe('ok');
    if (p.status === 'ok') expect(p.slopeLph).toBeCloseTo(2, 3);
  });

  it('sudah mencapai ambang', () => {
    expect(predictThreshold([], 170, 160, now).status).toBe('reached');
  });
});

describe('optimasi rute', () => {
  const depot = { lat: -7.49, lng: 110.22 };
  const mk = (id: string, lat: number, lng: number, liters = 100): Stop => ({ id, lat, lng, liters });

  it('haversine kira-kira benar (1° lintang ≈ 111 km)', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });

  it('2-opt memperpendek rute yang saling silang', () => {
    // titik di sudut persegi, urutan awal sengaja menyilang
    const crossed = [mk('A', -7.44, 110.17), mk('C', -7.54, 110.27), mk('B', -7.44, 110.27), mk('D', -7.54, 110.17)];
    const before = routeLength(depot, crossed);
    const after = routeLength(depot, twoOpt(depot, crossed));
    expect(after).toBeLessThan(before - 0.5);
  });

  it('2-opt tidak pernah memperpanjang hasil nearest-neighbor', () => {
    const pts = [
      mk('1', -7.36, 110.3), mk('2', -7.58, 110.29), mk('3', -7.43, 110.28), mk('4', -7.6, 110.2),
      mk('5', -7.45, 110.17), mk('6', -7.49, 110.29), mk('7', -7.53, 110.16), mk('8', -7.4, 110.23),
    ];
    const nn = nearestNeighbor(depot, pts);
    const opt = twoOpt(depot, nn);
    expect(routeLength(depot, opt)).toBeLessThanOrEqual(routeLength(depot, nn) + 1e-9);
    expect(opt.map((s) => s.id).sort()).toEqual(pts.map((s) => s.id).sort());
  });

  it('memecah trip sesuai kapasitas kendaraan', () => {
    const stops = [
      mk('A', -7.47, 110.21, 180), mk('B', -7.46, 110.23, 170), mk('C', -7.5, 110.25, 190),
      mk('D', -7.52, 110.2, 160), mk('E', -7.44, 110.19, 90),
    ];
    const plan = planTrips(depot, stops, 600);
    expect(plan.trips.length).toBe(2);
    for (const t of plan.trips) expect(t.liters).toBeLessThanOrEqual(600);
    expect(plan.totalLiters).toBeCloseTo(790);
    expect(plan.trips.flatMap((t) => t.stops).length).toBe(5);
  });

  it('satu trip bila muat', () => {
    const plan = planTrips(depot, [mk('A', -7.47, 110.21, 150), mk('B', -7.46, 110.23, 150)], 600);
    expect(plan.trips.length).toBe(1);
    expect(plan.oversize.length).toBe(0);
  });

  it('URL Google Maps berisi waypoint', () => {
    const url = googleMapsUrl(depot, [mk('A', -7.47, 110.21), mk('B', -7.46, 110.23)]);
    expect(url).toContain('waypoints=');
    expect(decodeURIComponent(url)).toContain('-7.470000,110.210000|-7.460000,110.230000');
  });
});

describe('CSV', () => {
  it('meng-escape koma & tanda kutip', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"']])).toBe('a,b\r\n"x,y","say ""hi"""');
  });
});
