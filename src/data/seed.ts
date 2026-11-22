import type { Collector, Handover, HistoryPoint, OilType, SensorState, Workshop } from '../lib/types';
import { distanceFromLiters, drumSpecFor } from '../lib/volume';
import { fillRateLph, mulberry32 } from '../lib/misc';

/** Semua nama di bawah ini FIKTIF, dibuat untuk demo. */
interface WsDef {
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  cap: 100 | 200;
  oil: OilType;
  dailyL: number;
  /** isi awal dalam % */
  startPct: number;
  online?: boolean;
  thresholdPct?: number;
}

const DEFS: WsDef[] = [
  { name: 'Bengkel Piston Sejahtera', address: 'Jl. Pemuda Selatan', area: 'Magelang Tengah', lat: -7.4772, lng: 110.2178, cap: 200, oil: 'motor', dailyL: 22, startPct: 91 },
  { name: 'Bengkel Roda Lestari', address: 'Jl. Kartini Raya', area: 'Magelang Utara', lat: -7.4596, lng: 110.2203, cap: 200, oil: 'campur', dailyL: 18, startPct: 84 },
  { name: 'Bengkel Gardan Makmur', address: 'Jl. Soekarno-Hatta', area: 'Magelang Selatan', lat: -7.4987, lng: 110.2152, cap: 200, oil: 'mobil', dailyL: 14, startPct: 63 },
  { name: 'Bengkel Busi Mandiri', address: 'Jl. Tentara Pelajar', area: 'Magelang Tengah', lat: -7.4821, lng: 110.2236, cap: 100, oil: 'motor', dailyL: 9, startPct: 82 },
  { name: 'Bengkel Kopling Abadi', address: 'Jl. Raya Mertoyudan', area: 'Mertoyudan', lat: -7.5196, lng: 110.2108, cap: 200, oil: 'campur', dailyL: 16, startPct: 47 },
  { name: 'Bengkel Sinar Rantai', address: 'Jl. Raya Secang', area: 'Secang', lat: -7.4028, lng: 110.2322, cap: 100, oil: 'motor', dailyL: 7, startPct: 88 },
  { name: 'Bengkel Karburator Jaya', address: 'Jl. Pemuda Muntilan', area: 'Muntilan', lat: -7.5813, lng: 110.2912, cap: 200, oil: 'mobil', dailyL: 20, startPct: 71 },
  { name: 'Bengkel Velg Sentosa', address: 'Jl. Raya Tegalrejo', area: 'Tegalrejo', lat: -7.4305, lng: 110.2781, cap: 100, oil: 'motor', dailyL: 6, startPct: 9 },
  { name: 'Bengkel Oli Prima Candi', address: 'Jl. Balaputradewa', area: 'Borobudur', lat: -7.6052, lng: 110.2068, cap: 200, oil: 'campur', dailyL: 12, startPct: 55, thresholdPct: 75 },
  { name: 'Bengkel Gear Barokah', address: 'Jl. Raya Bandongan', area: 'Bandongan', lat: -7.4512, lng: 110.1745, cap: 100, oil: 'motor', dailyL: 8, startPct: 36 },
  { name: 'Bengkel Aki Sumber Rejeki', address: 'Jl. Raya Candimulyo', area: 'Candimulyo', lat: -7.4934, lng: 110.2895, cap: 200, oil: 'mobil', dailyL: 10, startPct: 58, online: false },
  { name: 'Bengkel Shock Mulia', address: 'Jl. Raya Tempuran', area: 'Tempuran', lat: -7.5307, lng: 110.1642, cap: 100, oil: 'motor', dailyL: 5, startPct: 4 },
];

export const PROCESSORS = ['PT Daur Oli Nusantara (Demo)', 'CV Olah Limbah Hijau (Demo)'];

export const DEFAULT_COLLECTOR: Collector = {
  name: 'UD Sumber Oli Magelang (Demo)',
  vehicleCapacityL: 600,
  depot: { lat: -7.4915, lng: 110.2268, label: 'Gudang UD Sumber Oli, Magelang Selatan' },
};

export interface SeedData {
  workshops: Workshop[];
  sensors: Record<string, SensorState>;
  history: Record<string, HistoryPoint[]>;
  handovers: Handover[];
  now: number;
}

const HOUR = 3600_000;
const DAYS = 14;

export function createSeed(now = Date.now()): SeedData {
  const rnd = mulberry32(20261122);
  const nowHour = Math.floor(now / HOUR) * HOUR;
  const workshops: Workshop[] = [];
  const sensors: Record<string, SensorState> = {};
  const history: Record<string, HistoryPoint[]> = {};
  const handovers: Handover[] = [];

  DEFS.forEach((d, i) => {
    const id = `bk-${String(i + 1).padStart(2, '0')}`;
    const drum = drumSpecFor(d.cap);
    const ws: Workshop = {
      id,
      name: d.name,
      address: `${d.address}, ${d.area}`,
      area: d.area,
      lat: d.lat,
      lng: d.lng,
      phone: `62812000010${String(i + 1).padStart(2, '0')}`,
      drum,
      oilType: d.oil,
      sensorId: `OIL-MGL-${String(i + 1).padStart(3, '0')}`,
      online: d.online ?? true,
      dailyL: d.dailyL,
      thresholdPct: d.thresholdPct ?? null,
    };
    workshops.push(ws);

    // Bangun riwayat mundur dari isi sekarang. Saat mendekati kosong, berarti drum baru dijemput.
    const pts: HistoryPoint[] = [];
    let level = (d.startPct / 100) * d.cap;
    const offlineSince = ws.online ? null : nowHour - 30 * HOUR;
    for (let h = 0; h <= DAYS * 24; h++) {
      const t = nowHour - h * HOUR;
      pts.push({ t, l: Math.round(level * 10) / 10 });
      const added = fillRateLph(d.dailyL, t - HOUR / 2) * (0.6 + rnd() * 0.8);
      level -= added;
      if (level < 1.5) {
        // terjadi penjemputan pada jam ini: sebelum dijemput drum terisi 80–95%
        const before = d.cap * (0.8 + rnd() * 0.15);
        handovers.push({
          id: `WP-SEED-${id}-${h}`,
          createdAt: t - HOUR + Math.floor(rnd() * 40) * 60000,
          workshopId: id,
          workshopName: d.name,
          collectorName: DEFAULT_COLLECTOR.name,
          volumeL: Math.round(before - level),
          oilType: d.oil,
          note: '',
          processor:
            rnd() > 0.3
              ? { at: Math.min(t + 24 * HOUR, now), name: PROCESSORS[Math.floor(rnd() * PROCESSORS.length)], manifestNo: `MNF-${(1000 + h * 7 + i).toString()}` }
              : undefined,
        });
        level = before;
      }
    }
    pts.reverse();
    // sensor offline: tidak ada data sejak 30 jam lalu
    history[id] = offlineSince ? pts.filter((p) => p.t <= offlineSince) : pts;
    const last = history[id][history[id].length - 1];
    sensors[id] = {
      liters: last.l,
      distanceCm: distanceFromLiters(last.l, drum),
      updatedAt: offlineSince ?? now,
    };
  });

  handovers.sort((a, b) => b.createdAt - a.createdAt);
  return { workshops, sensors, history, handovers, now };
}
