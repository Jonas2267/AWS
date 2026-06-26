import type { CalendarEvent } from '@/lib/storage/types';

export interface CalendarProvider {
  list(): Promise<CalendarEvent[]>;
  create(event: CalendarEvent): Promise<CalendarEvent>;
  update(event: CalendarEvent): Promise<CalendarEvent>;
  delete(id: string): Promise<void>;
}

export class LocalDemoCalendarProvider implements CalendarProvider {
  constructor(private events: CalendarEvent[]) {}

  async list(): Promise<CalendarEvent[]> {
    return this.events;
  }

  async create(event: CalendarEvent): Promise<CalendarEvent> {
    this.events = [...this.events, event];
    return event;
  }

  async update(event: CalendarEvent): Promise<CalendarEvent> {
    this.events = this.events.map((item) => (item.id === event.id ? event : item));
    return event;
  }

  async delete(id: string): Promise<void> {
    this.events = this.events.filter((event) => event.id !== id);
  }
}

export class GoogleCalendarProvider implements CalendarProvider {
  async list(): Promise<CalendarEvent[]> {
    throw new Error('GoogleCalendarProvider ist vorbereitet. Nutze OAuth, minimale Scopes und serverseitige Token-Verwaltung.');
  }

  async create(): Promise<CalendarEvent> {
    throw new Error('Google Calendar Create ist noch nicht verbunden.');
  }

  async update(): Promise<CalendarEvent> {
    throw new Error('Google Calendar Update ist noch nicht verbunden.');
  }

  async delete(): Promise<void> {
    throw new Error('Google Calendar Delete ist noch nicht verbunden.');
  }
}

export class MicrosoftCalendarProvider implements CalendarProvider {
  async list(): Promise<CalendarEvent[]> {
    throw new Error('MicrosoftCalendarProvider ist vorbereitet. Nutze Microsoft Graph OAuth und least-privilege Scopes.');
  }

  async create(): Promise<CalendarEvent> {
    throw new Error('Microsoft Calendar Create ist noch nicht verbunden.');
  }

  async update(): Promise<CalendarEvent> {
    throw new Error('Microsoft Calendar Update ist noch nicht verbunden.');
  }

  async delete(): Promise<void> {
    throw new Error('Microsoft Calendar Delete ist noch nicht verbunden.');
  }
}
