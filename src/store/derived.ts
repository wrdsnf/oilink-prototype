import { useMemo } from 'react';
import { useApp, thresholdPctOf } from './useApp';
import { pct } from '../lib/volume';
import { haversineKm } from '../lib/geo';
import { statusOf, type FillStatus } from '../components/ui';
import type { SensorState, Workshop } from '../lib/types';

export interface WorkshopRow {
  w: Workshop;
  sensor: SensorState;
  liters: number;
  pct: number;
  thrPct: number;
  thrL: number;
  status: FillStatus;
  distKm: number;
}

export function useWorkshopRows(): WorkshopRow[] {
  const workshops = useApp((s) => s.workshops);
  const sensors = useApp((s) => s.sensors);
  const plan = useApp((s) => s.plan);
  const depot = useApp((s) => s.collector.depot);
  return useMemo(
    () =>
      workshops.map((w) => {
        const sensor = sensors[w.id];
        const p = pct(sensor.liters, w.drum.capacityL);
        const thrPct = thresholdPctOf(w, plan);
        return {
          w,
          sensor,
          liters: sensor.liters,
          pct: p,
          thrPct,
          thrL: (thrPct / 100) * w.drum.capacityL,
          status: statusOf(p, thrPct, w.online),
          distKm: haversineKm(depot, w),
        };
      }),
    [workshops, sensors, plan, depot],
  );
}
