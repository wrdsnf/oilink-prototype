import type { DrumSpec } from '../lib/types';
import { distanceFromLiters } from '../lib/volume';
import { fillRateLph, mulberry32 } from '../lib/misc';

/** Satu pembacaan mentah dari sensor — sama dengan payload yang nanti dikirim ESP32. */
export interface SensorReading {
  sensor_id: string;
  distance_cm: number;
  timestamp: number;
}

/**
 * Sumber data sensor. UI hanya bergantung pada interface ini, jadi simulator bisa diganti
 * dengan sumber sungguhan (mis. Supabase Realtime yang menerima data ESP32) tanpa mengubah UI.
 */
export interface SensorSource {
  readonly kind: 'simulated' | 'live';
  /** Mulai mengirim batch pembacaan. Mengembalikan fungsi untuk berhenti. */
  subscribe(onReadings: (readings: SensorReading[], clock: number) => void): () => void;
}

export interface SimDrum {
  sensorId: string;
  drum: DrumSpec;
  liters: number;
  dailyL: number;
  online: boolean;
}

export interface SimSnapshot {
  running: boolean;
  speed: number;
  now: number;
  drums: SimDrum[];
}

/**
 * Simulator: tiap detik nyata, jam simulasi maju `speed` detik. Isi drum naik sesuai laju
 * bengkel (ramai di jam kerja) dengan sedikit acak, lalu diubah menjadi jarak sensor (cm).
 */
export class SimulatedSensorSource implements SensorSource {
  readonly kind = 'simulated' as const;
  private rnd = mulberry32(Date.now() & 0xffff);

  constructor(
    private getSnapshot: () => SimSnapshot,
    private tickMs = 1000,
  ) {}

  subscribe(onReadings: (readings: SensorReading[], clock: number) => void): () => void {
    const id = setInterval(() => {
      const snap = this.getSnapshot();
      if (!snap.running) return;
      const dt = this.tickMs * snap.speed;
      const next = snap.now + dt;
      const readings: SensorReading[] = [];
      for (const d of snap.drums) {
        if (!d.online) continue;
        const add = fillRateLph(d.dailyL, snap.now + dt / 2) * (dt / 3600_000) * (0.5 + this.rnd());
        const liters = Math.min(d.drum.capacityL, d.liters + add);
        readings.push({ sensor_id: d.sensorId, distance_cm: distanceFromLiters(liters, d.drum), timestamp: next });
      }
      onReadings(readings, next);
    }, this.tickMs);
    return () => clearInterval(id);
  }
}
