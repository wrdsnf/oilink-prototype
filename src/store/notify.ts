export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Tampilkan notifikasi browser bila diizinkan. Diam saja bila tidak didukung/ditolak. */
export function showBrowserNotification(title: string, body: string): void {
  if (!notificationSupported() || Notification.permission !== 'granted') return;
  const opts: NotificationOptions = { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: body.slice(0, 40) };
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.showNotification(title, opts).catch(() => new Notification(title, opts));
        else new Notification(title, opts);
      });
    } else {
      new Notification(title, opts);
    }
  } catch {
    /* abaikan — notifikasi di dalam app tetap ada */
  }
}
