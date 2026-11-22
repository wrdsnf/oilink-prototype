export type OilType = 'motor' | 'mobil' | 'campur';
export type Plan = 'basic' | 'pro';
export type Role = 'collector' | 'workshop';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Geometri drum + posisi sensor. Sensor dipasang di tutup, menghadap ke bawah. */
export interface DrumSpec {
  capacityL: number;
  /** Tinggi kolom oli maksimum (cm) saat drum penuh. */
  heightCm: number;
  /** Jarak sensor ke permukaan oli saat drum penuh (zona mati sensor), cm. */
  sensorOffsetCm: number;
}

export interface Workshop {
  id: string;
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  phone: string;
  drum: DrumSpec;
  oilType: OilType;
  sensorId: string;
  online: boolean;
  /** Rata-rata oli masuk per hari (L). Dipakai simulator. */
  dailyL: number;
  /** Ambang khusus (Pro), dalam persen. null = default 80%. */
  thresholdPct: number | null;
}

export interface SensorState {
  distanceCm: number;
  liters: number;
  updatedAt: number;
}

export interface HistoryPoint {
  t: number;
  l: number;
}

export interface Handover {
  id: string;
  createdAt: number;
  workshopId: string;
  workshopName: string;
  collectorName: string;
  volumeL: number;
  oilType: OilType;
  note: string;
  processor?: {
    at: number;
    name: string;
    manifestNo: string;
  };
}

export interface AppNotification {
  id: string;
  createdAt: number;
  workshopId: string;
  message: string;
  read: boolean;
}

export interface Collector {
  name: string;
  vehicleCapacityL: number;
  depot: LatLng & { label: string };
}

export interface Schedule {
  createdAt: number;
  trips: string[][];
}
