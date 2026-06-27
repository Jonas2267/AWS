import type { CalendarEvent, ChatMessage, Reminder, TaskItem } from './types';
import { createId } from './localStorageProvider';

const today = new Date();
const isoDate = (offsetDays = 0) => {
  const date = new Date(today);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

export const exampleCommands = [
  'Erstelle morgen um 8 Uhr einen Termin Schule',
  'Erstelle eine Aufgabe: Mathe lernen, hohe Priorität',
  'Welche Berechtigungen fehlen?',
  'Fasse mir die wichtigsten Technik-News zusammen',
  'Suche Wikipedia nach Künstliche Intelligenz',
  'Öffne Fokusmodus',
  'Was muss ich heute noch machen?',
];

export const demoEvents: CalendarEvent[] = [
  {
    id: createId(),
    title: 'Schule / Fokusblock',
    date: isoDate(1),
    time: '08:00',
    reminderMinutes: 30,
    notes: 'Lokal gespeichert.',
    provider: 'local-demo',
  },
  {
    id: createId(),
    title: 'Projekt AWS KI Manager weiterbauen',
    date: isoDate(0),
    time: '18:30',
    reminderMinutes: 15,
    notes: 'AURA Core erinnert optisch im Dashboard.',
    provider: 'local-demo',
  },
];

export const demoTasks: TaskItem[] = [
  { id: createId(), title: 'Mathe lernen', priority: 'hoch', status: 'offen', deadline: isoDate(1) },
  { id: createId(), title: 'AWS KI Manager als PWA installieren', priority: 'mittel', status: 'läuft', deadline: isoDate(0) },
  { id: createId(), title: 'Permission Center prüfen', priority: 'mittel', status: 'offen' },
];

export const initialMessages = (): ChatMessage[] => [
  {
    id: createId(),
    role: 'assistant',
    content:
      'AURA Core online. Kostenloser lokaler Modus aktiv; ich nutze Live-Quellen, wenn sie verfügbar sind, und führe App-Aktionen nur mit deiner Freigabe aus.',
    time: new Date().toISOString(),
    suggestions: exampleCommands.slice(0, 4),
  },
];

export function buildReminders(events: CalendarEvent[]): Reminder[] {
  return events.map((event) => {
    const due = new Date(`${event.date}T${event.time}:00`);
    due.setMinutes(due.getMinutes() - event.reminderMinutes);

    return {
      id: createId(),
      eventId: event.id,
      title: event.title,
      dueAt: due.toISOString(),
      minutesBefore: event.reminderMinutes,
      delivered: false,
    };
  });
}
