import { useEffect } from 'react';
import { useApp } from '../store/useApp';
import { SimulatedSensorSource, type SensorSource } from '../data/sensorSource';

/**
 * Menyambungkan SensorSource ke store. Untuk data sungguhan, ganti `new SimulatedSensorSource(...)`
 * dengan implementasi SensorSource lain (mis. SupabaseSensorSource) — UI tidak perlu diubah.
 */
export function SimulatorRunner() {
  useEffect(() => {
    const source: SensorSource = new SimulatedSensorSource(() => {
      const s = useApp.getState();
      return {
        running: s.sim.running,
        speed: s.sim.speed,
        now: s.sim.now,
        drums: s.workshops.map((w) => ({
          sensorId: w.sensorId,
          drum: w.drum,
          liters: s.sensors[w.id]?.liters ?? 0,
          dailyL: w.dailyL,
          online: w.online,
        })),
      };
    });
    return source.subscribe((readings, clock) => useApp.getState().ingest(readings, clock));
  }, []);
  return null;
}
