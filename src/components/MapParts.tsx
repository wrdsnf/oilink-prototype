import L from 'leaflet';
import { useEffect, type ReactNode } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useApp } from '../store/useApp';
import type { LatLng } from '../lib/types';
import { STATUS_META, type FillStatus } from './ui';

const GLYPH: Record<FillStatus, string> = { full: '!', mid: '', low: '', offline: '×' };

export function statusIcon(status: FillStatus, label: string, selected = false): L.DivIcon {
  const m = STATUS_META[status];
  const ring = selected ? 'box-shadow:0 0 0 4px rgba(15,118,110,.45);' : 'box-shadow:0 1px 4px rgba(0,0,0,.35);';
  const shape = status === 'full' ? 'border-radius:6px;' : status === 'offline' ? 'border-radius:4px;border-style:dashed;' : 'border-radius:999px;';
  return L.divIcon({
    className: 'oil-marker',
    iconSize: [54, 26],
    iconAnchor: [27, 13],
    html: `<div style="display:flex;align-items:center;justify-content:center;gap:2px;height:26px;min-width:44px;padding:0 6px;background:${m.hex};color:${status === 'mid' ? '#111827' : '#fff'};border:2px solid #fff;${shape}${ring}font:700 12px 'Plus Jakarta Sans',sans-serif;white-space:nowrap">${GLYPH[status] ? `<span aria-hidden="true">${GLYPH[status]}</span>` : ''}${label}</div>`,
  });
}

export function numberIcon(n: number | string, color: string): L.DivIcon {
  return L.divIcon({
    className: 'oil-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:${color};color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font:800 13px 'Plus Jakarta Sans',sans-serif">${n}</div>`,
  });
}

const depotIcon = L.divIcon({
  className: 'oil-marker',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;background:#134e4a;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);font:800 10px 'Plus Jakarta Sans',sans-serif">GDG</div>`,
});

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export function BaseMap({ children, fit, className = 'h-[60vh]' }: { children?: ReactNode; fit: LatLng[]; className?: string }) {
  const depot = useApp((s) => s.collector.depot);
  return (
    <MapContainer center={[depot.lat, depot.lng]} zoom={12} className={`z-0 w-full rounded-2xl ${className}`} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
        <Tooltip>{depot.label}</Tooltip>
      </Marker>
      <FitBounds points={[depot, ...fit]} />
      {children}
    </MapContainer>
  );
}
