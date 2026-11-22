import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppNotification,
  Collector,
  Handover,
  HistoryPoint,
  OilType,
  Plan,
  Role,
  Schedule,
  SensorState,
  Workshop,
} from '../lib/types';
import { DEFAULT_THRESHOLD_PCT, distanceFromLiters, litersFromDistance, pct } from '../lib/volume';
import { uid } from '../lib/misc';
import { createSeed, DEFAULT_COLLECTOR } from '../data/seed';
import type { SensorReading } from '../data/sensorSource';
import { showBrowserNotification } from './notify';

const HOUR = 3600_000;
const HISTORY_MS = 14 * 24 * HOUR;

export interface SimState {
  running: boolean;
  speed: number;
  now: number;
}

interface Data {
  role: Role;
  plan: Plan;
  /** Bengkel yang sedang dilihat dalam mode "Lihat sebagai Bengkel". */
  workshopViewId: string;
  collector: Collector;
  workshops: Workshop[];
  sensors: Record<string, SensorState>;
  history: Record<string, HistoryPoint[]>;
  handovers: Handover[];
  notifications: AppNotification[];
  /** Bengkel yang sudah dinotifikasi (di atas ambang) supaya tidak berulang. */
  alerted: Record<string, boolean>;
  sim: SimState;
  routeSelection: string[];
  schedule: Schedule | null;
}

interface Actions {
  setRole: (role: Role) => void;
  setPlan: (plan: Plan) => void;
  setWorkshopView: (id: string) => void;
  ingest: (readings: SensorReading[], clock: number) => void;
  fillNow: (workshopId: string) => void;
  setOnline: (workshopId: string, online: boolean) => void;
  setThreshold: (workshopId: string, pctValue: number | null) => void;
  toggleRoute: (workshopId: string) => void;
  setRouteSelection: (ids: string[]) => void;
  setSchedule: (s: Schedule | null) => void;
  addHandover: (h: { workshopId: string; volumeL: number; oilType: OilType; note: string }) => string;
  handToProcessor: (handoverId: string, processorName: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  setSim: (s: Partial<SimState>) => void;
  setCollector: (c: Partial<Collector>) => void;
  reset: () => void;
}

export type AppState = Data & Actions;

function initialData(): Data {
  const seed = createSeed();
  const alerted: Record<string, boolean> = {};
  for (const w of seed.workshops) {
    alerted[w.id] = pct(seed.sensors[w.id].liters, w.drum.capacityL) >= (w.thresholdPct ?? DEFAULT_THRESHOLD_PCT);
  }
  return {
    role: 'collector',
    plan: 'pro',
    workshopViewId: seed.workshops[0].id,
    collector: DEFAULT_COLLECTOR,
    workshops: seed.workshops,
    sensors: seed.sensors,
    history: seed.history,
    handovers: seed.handovers,
    notifications: [],
    alerted,
    sim: { running: true, speed: 1, now: seed.now },
    routeSelection: [],
    schedule: null,
  };
}

/** Ambang efektif (%) — Basic selalu 80%, Pro boleh diatur per bengkel. */
export function thresholdPctOf(w: Workshop, plan: Plan): number {
  return plan === 'pro' && w.thresholdPct != null ? w.thresholdPct : DEFAULT_THRESHOLD_PCT;
}

function appendHistory(hist: HistoryPoint[] | undefined, t: number, l: number, force = false): HistoryPoint[] {
  const h = hist ?? [];
  const last = h[h.length - 1];
  if (!force && last && t - last.t < HOUR) return h;
  const next = [...h, { t, l: Math.round(l * 10) / 10 }];
  const cutoff = t - HISTORY_MS;
  let start = 0;
  while (start < next.length && next[start].t < cutoff) start++;
  return start ? next.slice(start) : next;
}

/** Cek apakah drum baru saja melewati ambang → buat notifikasi. */
function checkAlerts(state: Data, ids: string[]): Pick<Data, 'alerted' | 'notifications'> {
  let alerted = state.alerted;
  let notifications = state.notifications;
  for (const id of ids) {
    const w = state.workshops.find((x) => x.id === id);
    const s = state.sensors[id];
    if (!w || !s) continue;
    const p = pct(s.liters, w.drum.capacityL);
    const thr = thresholdPctOf(w, state.plan);
    const above = p >= thr;
    if (above && !alerted[id]) {
      const message = `Drum ${w.name} mencapai ${Math.round(s.liters)} L (${Math.round(p)}%) — siap dijemput.`;
      notifications = [
        { id: uid('N'), createdAt: s.updatedAt, workshopId: id, message, read: false },
        ...notifications,
      ].slice(0, 50);
      showBrowserNotification('OILINK — drum hampir penuh', message);
    }
    if (above !== !!alerted[id]) alerted = { ...alerted, [id]: above };
  }
  return { alerted, notifications };
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      setRole: (role) => set({ role }),
      setPlan: (plan) => set((s) => ({ plan, ...checkAlerts({ ...s, plan }, s.workshops.map((w) => w.id)) })),
      setWorkshopView: (workshopViewId) => set({ workshopViewId }),

      ingest: (readings, clock) =>
        set((s) => {
          const sensors = { ...s.sensors };
          const history = { ...s.history };
          const touched: string[] = [];
          for (const r of readings) {
            const w = s.workshops.find((x) => x.sensorId === r.sensor_id);
            if (!w) continue;
            const liters = litersFromDistance(r.distance_cm, w.drum);
            sensors[w.id] = { distanceCm: r.distance_cm, liters, updatedAt: r.timestamp };
            history[w.id] = appendHistory(history[w.id], r.timestamp, liters);
            touched.push(w.id);
          }
          const next = { ...s, sensors, history };
          return { sensors, history, sim: { ...s.sim, now: clock }, ...checkAlerts(next, touched) };
        }),

      fillNow: (workshopId) =>
        set((s) => {
          const w = s.workshops.find((x) => x.id === workshopId);
          if (!w) return {};
          const target = Math.min(w.drum.capacityL, ((thresholdPctOf(w, s.plan) + 4) / 100) * w.drum.capacityL);
          const liters = Math.max(target, s.sensors[workshopId]?.liters ?? 0);
          const sensors = {
            ...s.sensors,
            [workshopId]: { liters, distanceCm: distanceFromLiters(liters, w.drum), updatedAt: s.sim.now },
          };
          const workshops = s.workshops.map((x) => (x.id === workshopId ? { ...x, online: true } : x));
          const history = { ...s.history, [workshopId]: appendHistory(s.history[workshopId], s.sim.now, liters, true) };
          const next = { ...s, sensors, history, workshops };
          return { sensors, history, workshops, ...checkAlerts(next, [workshopId]) };
        }),

      setOnline: (workshopId, online) =>
        set((s) => ({
          workshops: s.workshops.map((w) => (w.id === workshopId ? { ...w, online } : w)),
          sensors: online
            ? { ...s.sensors, [workshopId]: { ...s.sensors[workshopId], updatedAt: s.sim.now } }
            : s.sensors,
        })),

      setThreshold: (workshopId, pctValue) =>
        set((s) => {
          const workshops = s.workshops.map((w) => (w.id === workshopId ? { ...w, thresholdPct: pctValue } : w));
          return { workshops, ...checkAlerts({ ...s, workshops }, [workshopId]) };
        }),

      toggleRoute: (id) =>
        set((s) => ({
          routeSelection: s.routeSelection.includes(id)
            ? s.routeSelection.filter((x) => x !== id)
            : [...s.routeSelection, id],
        })),
      setRouteSelection: (routeSelection) => set({ routeSelection }),
      setSchedule: (schedule) => set({ schedule }),

      addHandover: ({ workshopId, volumeL, oilType, note }) => {
        const s = get();
        const w = s.workshops.find((x) => x.id === workshopId);
        if (!w) return '';
        const id = `WP-${new Date(s.sim.now).toISOString().slice(2, 10).replace(/-/g, '')}-${uid('').slice(-5)}`;
        const handover: Handover = {
          id,
          createdAt: s.sim.now,
          workshopId,
          workshopName: w.name,
          collectorName: s.collector.name,
          volumeL,
          oilType,
          note,
        };
        const current = s.sensors[workshopId]?.liters ?? 0;
        // sisa di drum: bila diambil sebagian, sisanya tetap; bila diambil semua, tersisa ~0–1 L
        const liters = current - volumeL > 2 ? current - volumeL : Math.min(current, 0.3 + Math.random() * 0.7);
        const schedule = s.schedule
          ? { ...s.schedule, trips: s.schedule.trips.map((t) => t.filter((x) => x !== workshopId)).filter((t) => t.length) }
          : null;
        set({
          handovers: [handover, ...s.handovers],
          sensors: {
            ...s.sensors,
            [workshopId]: { liters, distanceCm: distanceFromLiters(liters, w.drum), updatedAt: s.sim.now },
          },
          history: { ...s.history, [workshopId]: appendHistory(s.history[workshopId], s.sim.now, liters, true) },
          alerted: { ...s.alerted, [workshopId]: false },
          routeSelection: s.routeSelection.filter((x) => x !== workshopId),
          schedule: schedule && schedule.trips.length ? schedule : null,
        });
        return id;
      },

      handToProcessor: (handoverId, processorName) =>
        set((s) => ({
          handovers: s.handovers.map((h) =>
            h.id === handoverId
              ? {
                  ...h,
                  processor: {
                    at: s.sim.now,
                    name: processorName,
                    manifestNo: `MNF-${Math.floor(10000 + Math.random() * 89999)}`,
                  },
                }
              : h,
          ),
        })),

      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifications: () => set({ notifications: [] }),
      setSim: (sim) => set((s) => ({ sim: { ...s.sim, ...sim } })),
      setCollector: (c) => set((s) => ({ collector: { ...s.collector, ...c, depot: { ...s.collector.depot, ...c.depot } } })),
      reset: () => set((s) => ({ ...initialData(), role: s.role, plan: s.plan })),
    }),
    { name: 'oilink-demo-v1', version: 1 },
  ),
);

/** Isi drum bengkel (liter) dan persentase saat ini. */
export function useFill(workshopId: string) {
  const w = useApp((s) => s.workshops.find((x) => x.id === workshopId));
  const sensor = useApp((s) => s.sensors[workshopId]);
  const plan = useApp((s) => s.plan);
  if (!w || !sensor) return null;
  const p = pct(sensor.liters, w.drum.capacityL);
  const thr = thresholdPctOf(w, plan);
  return { w, sensor, pct: p, thrPct: thr, thrL: (thr / 100) * w.drum.capacityL, above: p >= thr };
}
