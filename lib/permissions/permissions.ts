import type { PermissionItem } from '@/lib/storage/types';

export interface PermissionProvider {
  request(id: string): Promise<PermissionItem>;
  disconnect(id: string): Promise<void>;
}

const permissionCopy: Array<Omit<PermissionItem, 'status'>> = [
  {
    id: 'calendar',
    name: 'Kalender',
    recommended: true,
    description: 'Lokaler Demo-Kalender; später Google Calendar oder Microsoft Graph via OAuth.',
    technical: 'Browser hat keinen stillen Kalenderzugriff. Echte Kalender brauchen OAuth oder native APIs.',
  },
  {
    id: 'notifications',
    name: 'Benachrichtigungen',
    recommended: true,
    description: 'Erlaubt Termin- und Aufgabenhinweise per Browser Notification nach aktivem Klick.',
    technical: 'Notification API fragt das Betriebssystem sichtbar um Erlaubnis.',
  },
  {
    id: 'files',
    name: 'Dateien',
    recommended: true,
    description: 'Öffnet Dateien nur über File Picker, wenn du aktiv eine Datei auswählst.',
    technical: 'Keine Dateiüberwachung, kein Zugriff auf Systemordner ohne Nutzeraktion.',
  },
  {
    id: 'microphone',
    name: 'Mikrofon',
    recommended: true,
    description: 'Vorbereitet für Spracheingabe und Diktat im AURA Chat.',
    technical: 'Mikrofonzugriff darf erst nach Klick und OS-Dialog starten.',
  },
  {
    id: 'location',
    name: 'Standort',
    recommended: false,
    description: 'Optional für ortsbezogene Erinnerungen in späteren Versionen.',
    technical: 'Nur Geolocation API nach aktiver Freigabe, kein Tracking im Hintergrund.',
  },
  {
    id: 'contacts',
    name: 'Kontakte',
    recommended: false,
    description: 'Optional vorbereitet für Contact Picker oder native Integrationen.',
    technical: 'Keine Kontaktlisten ohne offizielle API und explizite Auswahl.',
  },
  {
    id: 'camera',
    name: 'Kamera',
    recommended: false,
    description: 'Optional für spätere Scan-/Avatar-Funktionen.',
    technical: 'Nur nach OS-Freigabe; keine heimliche Aufnahme.',
  },
  {
    id: 'system',
    name: 'Systemstatus',
    recommended: true,
    description: 'Zeigt Demo-Metriken und später erlaubte Browser-/Native-Daten.',
    technical: 'Keine Remote-Control, keine Privilege-Escalation, keine versteckten Prozesse.',
  },
  {
    id: 'news',
    name: 'News/API',
    recommended: true,
    description: 'Aktiviert lokalen Demo-Newsfeed; später echter API-Adapter möglich.',
    technical: 'API-Schlüssel gehören serverseitig in sichere Routen.',
  },
  {
    id: 'ai',
    name: 'KI/API',
    recommended: true,
    description: 'AURA läuft lokal mit Regeln; später OpenAIProvider serverseitig verbinden.',
    technical: 'Keine geheimen API-Keys im Browser speichern.',
  },
];

export const defaultPermissions: PermissionItem[] = permissionCopy.map((permission) => ({
  ...permission,
  status: 'demo',
}));
