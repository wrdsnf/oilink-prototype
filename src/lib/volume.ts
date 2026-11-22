import type { DrumSpec } from './types';

export const DEFAULT_THRESHOLD_PCT = 80;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Konversi pembacaan sensor ultrasonik (jarak sensor → permukaan oli) menjadi liter.
 * Drum diasumsikan silinder tegak, jadi volume sebanding dengan tinggi kolom oli.
 *   tinggi_oli = tinggi_drum − (jarak − offset)
 *   liter      = kapasitas × tinggi_oli / tinggi_drum
 */
export function litersFromDistance(distanceCm: number, drum: DrumSpec): number {
  return (drum.capacityL * levelCmFromDistance(distanceCm, drum)) / drum.heightCm;
}

/** Kebalikan dari litersFromDistance — dipakai simulator untuk "membuat" bacaan sensor. */
export function distanceFromLiters(liters: number, drum: DrumSpec): number {
  const l = clamp(liters, 0, drum.capacityL);
  const levelCm = (l / drum.capacityL) * drum.heightCm;
  return drum.sensorOffsetCm + (drum.heightCm - levelCm);
}

export function levelCmFromDistance(distanceCm: number, drum: DrumSpec): number {
  return clamp(drum.heightCm - (distanceCm - drum.sensorOffsetCm), 0, drum.heightCm);
}

export function pct(liters: number, capacityL: number): number {
  if (capacityL <= 0) return 0;
  return clamp((liters / capacityL) * 100, 0, 100);
}

/** Spesifikasi drum standar (silinder). 200 L: Ø ~58 cm; 100 L: Ø ~46 cm. */
export function drumSpecFor(capacityL: 100 | 200): DrumSpec {
  return capacityL === 200
    ? { capacityL: 200, heightCm: 76, sensorOffsetCm: 22 }
    : { capacityL: 100, heightCm: 60, sensorOffsetCm: 22 };
}
