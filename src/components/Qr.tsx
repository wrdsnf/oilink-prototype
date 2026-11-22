import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Camera, CameraOff } from 'lucide-react';

export function QrImage({ value, size = 200, alt }: { value: string; size?: number; alt: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [value, size]);
  return src ? <img src={src} width={size} height={size} alt={alt} className="rounded-lg" /> : <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-slate-100" />;
}

export async function qrDataUrl(value: string, size = 600): Promise<string> {
  return QRCode.toDataURL(value, { width: size, margin: 2 });
}

/** Scanner QR pakai kamera (html5-qrcode). Butuh HTTPS/localhost + izin kamera. */
export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const elId = useRef(`qr-${Math.random().toString(36).slice(2)}`).current;
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => {
    let stopped = false;
    let scanner: import('html5-qrcode').Html5Qrcode | null = null;
    (async () => {
      if (!window.isSecureContext) {
        setError('Kamera hanya bisa dipakai lewat HTTPS. Gunakan input kode manual di bawah.');
        setStarting(false);
        return;
      }
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;
        scanner = new Html5Qrcode(elId, { verbose: false });
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            cb.current(text);
          },
          () => undefined,
        );
        if (stopped) await scanner.stop().catch(() => undefined);
      } catch {
        setError('Kamera tidak bisa dibuka (izin ditolak atau tidak ada kamera). Gunakan input kode manual di bawah.');
      } finally {
        setStarting(false);
      }
    })();
    return () => {
      stopped = true;
      if (scanner?.isScanning) scanner.stop().catch(() => undefined);
    };
  }, [elId]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ minHeight: error ? 0 : 260 }}>
        <div id={elId} className="w-full" />
        {starting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white">
            <Camera size={28} /> Membuka kamera…
          </div>
        )}
      </div>
      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <CameraOff size={18} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

export const drumQrValue = (sensorId: string) => `OILINK:DRUM:${sensorId}`;

/** Terima isi QR "OILINK:DRUM:OIL-MGL-001" atau kode manual "OIL-MGL-001" / "001". */
export function parseDrumCode(text: string): string {
  const t = text.trim().toUpperCase();
  const m = t.match(/OIL-MGL-\d{3}/);
  if (m) return m[0];
  if (/^\d{1,3}$/.test(t)) return `OIL-MGL-${t.padStart(3, '0')}`;
  return t;
}
