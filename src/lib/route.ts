import { haversineKm } from './geo';
import type { LatLng } from './types';

export interface Stop extends LatLng {
  id: string;
  liters: number;
}

/** Panjang rute gudang → stop[0] → … → stop[n-1] → gudang (km). */
export function routeLength(depot: LatLng, stops: LatLng[], returnToDepot = true): number {
  if (stops.length === 0) return 0;
  let d = haversineKm(depot, stops[0]);
  for (let i = 1; i < stops.length; i++) d += haversineKm(stops[i - 1], stops[i]);
  if (returnToDepot) d += haversineKm(stops[stops.length - 1], depot);
  return d;
}

/** Urutan nearest-neighbor dari gudang. */
export function nearestNeighbor<T extends LatLng>(depot: LatLng, stops: T[]): T[] {
  const left = [...stops];
  const out: T[] = [];
  let cur: LatLng = depot;
  while (left.length) {
    let best = 0;
    let bestD = Infinity;
    left.forEach((s, i) => {
      const d = haversineKm(cur, s);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    cur = left[best];
    out.push(left.splice(best, 1)[0]);
  }
  return out;
}

/** Perbaikan 2-opt: balik segmen selama total jarak (tur tertutup dari gudang) masih bisa berkurang. */
export function twoOpt<T extends LatLng>(depot: LatLng, stops: T[]): T[] {
  let route = [...stops];
  if (route.length < 2) return route;
  let best = routeLength(depot, route);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 1000) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const cand = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        const d = routeLength(depot, cand);
        if (d + 1e-9 < best) {
          route = cand;
          best = d;
          improved = true;
        }
      }
    }
  }
  return route;
}

export function optimizeRoute<T extends LatLng>(depot: LatLng, stops: T[]): T[] {
  return twoOpt(depot, nearestNeighbor(depot, stops));
}

export interface Trip<T extends Stop = Stop> {
  stops: T[];
  liters: number;
  distanceKm: number;
}

export interface TripPlan<T extends Stop = Stop> {
  trips: Trip<T>[];
  totalKm: number;
  totalLiters: number;
  /** Stop yang volumenya sendiri melebihi kapasitas kendaraan (hanya bisa diambil sebagian). */
  oversize: T[];
}

/**
 * Pecah stop menjadi beberapa trip sesuai kapasitas kendaraan.
 * Stop diurutkan dulu dengan rute optimal, lalu dipotong berurutan agar setiap trip ≤ kapasitas,
 * kemudian tiap trip dioptimasi ulang.
 */
export function planTrips<T extends Stop>(depot: LatLng, stops: T[], capacityL: number): TripPlan<T> {
  const ordered = optimizeRoute(depot, stops);
  const groups: T[][] = [];
  const oversize: T[] = [];
  let cur: T[] = [];
  let load = 0;
  for (const s of ordered) {
    if (s.liters > capacityL) oversize.push(s);
    const l = Math.min(s.liters, capacityL);
    if (cur.length && load + l > capacityL) {
      groups.push(cur);
      cur = [];
      load = 0;
    }
    cur.push(s);
    load += l;
  }
  if (cur.length) groups.push(cur);
  const trips = groups.map((g) => {
    const opt = optimizeRoute(depot, g);
    return {
      stops: opt,
      liters: opt.reduce((a, s) => a + Math.min(s.liters, capacityL), 0),
      distanceKm: routeLength(depot, opt),
    };
  });
  return {
    trips,
    totalKm: trips.reduce((a, t) => a + t.distanceKm, 0),
    totalLiters: trips.reduce((a, t) => a + t.liters, 0),
    oversize,
  };
}

/** Faktor kelok jalan terhadap garis lurus (perkiraan). */
export const ROAD_FACTOR = 1.35;

/** Perkiraan waktu: jarak jalan ≈ garis lurus × 1,35, kecepatan 30 km/jam, 15 menit per stop. */
export function estimateMinutes(distanceKm: number, stopCount: number): number {
  return ((distanceKm * ROAD_FACTOR) / 30) * 60 + stopCount * 15;
}

/** URL Google Maps multi-stop: gudang → stop… → gudang. */
export function googleMapsUrl(depot: LatLng, stops: LatLng[]): string {
  const f = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const params = new URLSearchParams({
    api: '1',
    origin: f(depot),
    destination: f(depot),
    travelmode: 'driving',
  });
  if (stops.length) params.set('waypoints', stops.map(f).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
