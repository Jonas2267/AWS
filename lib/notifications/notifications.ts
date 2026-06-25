export interface NotificationProvider {
  requestPermission(): Promise<NotificationPermission | 'unsupported'>;
  send(title: string, body: string): Promise<'notification' | 'fallback'>;
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  await navigator.serviceWorker.register('/sw.js');
}

export class BrowserNotificationProvider implements NotificationProvider {
  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.requestPermission();
  }

  async send(title: string, body: string): Promise<'notification' | 'fallback'> {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon.svg', badge: '/icon.svg' });
      return 'notification';
    }

    return 'fallback';
  }
}
