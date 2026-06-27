import type { CalendarEvent, ModuleId, PermissionItem, TaskItem, TaskPriority } from '@/lib/storage/types';
import { createId } from '@/lib/storage/localStorageProvider';
import { demoNews, summarizeNews } from '@/lib/news/news';

export type Intent =
  | 'create_calendar_event'
  | 'list_calendar_events'
  | 'create_task'
  | 'summarize_tasks'
  | 'open_module'
  | 'summarize_news'
  | 'get_weather'
  | 'find_place'
  | 'search_wiki'
  | 'start_focus'
  | 'explain_permissions'
  | 'request_permission'
  | 'show_system_status'
  | 'schedule_notification'
  | 'unknown';

export type ParsedCommand = {
  intent: Intent;
  entities: {
    raw: string;
    title?: string;
    date?: string;
    time?: string;
    priority?: TaskPriority;
    module?: ModuleId;
    reminderMinutes?: number;
    missing?: string[];
  };
};

type CommandContext = {
  events: CalendarEvent[];
  tasks: TaskItem[];
  permissions: PermissionItem[];
  open: (module: ModuleId) => void;
  addEvent: (event: CalendarEvent) => void;
  addTask: (task: TaskItem) => void;
  requestNotifications: () => void;
};

const moduleAliases: Record<string, ModuleId> = {
  assistant: 'assistant',
  aura: 'assistant',
  ki: 'assistant',
  heute: 'today',
  today: 'today',
  dashboard: 'dashboard',
  home: 'dashboard',
  kalender: 'calendar',
  calendar: 'calendar',
  termine: 'calendar',
  aufgaben: 'tasks',
  tasks: 'tasks',
  todos: 'tasks',
  news: 'news',
  wissen: 'wiki',
  wiki: 'wiki',
  wikipedia: 'wiki',
  notizen: 'notes',
  notes: 'notes',
  fokus: 'focus',
  focus: 'focus',
  nachrichten: 'news',
  navigation: 'navigation',
  route: 'navigation',
  karten: 'navigation',
  maps: 'navigation',
  nachrichten: 'news',
  berechtigungen: 'permissions',
  rechte: 'permissions',
  permissions: 'permissions',
  terminal: 'terminal',
  konsole: 'terminal',
  dateien: 'files',
  files: 'files',
  system: 'system',
  status: 'system',
  setup: 'setup',
  einrichten: 'setup',
};

export function detectIntent(input: string): Intent {
  const text = normalize(input);

  if (/(termin|kalender|meeting|event)/.test(text) && /(erstelle|erstell|anlegen|plane|mach|trag)/.test(text)) {
    return 'create_calendar_event';
  }

  if (/(was steht|termine|kalender|agenda|heute im kalender)/.test(text)) return 'list_calendar_events';

  if (/(aufgabe|todo|task)/.test(text) && /(erstelle|erstell|anlegen|mach|notier|speicher)/.test(text)) {
    return 'create_task';
  }

  if (/(aufgaben|todo|tagesplan|machen)/.test(text) && /(fass|zusammen|zeige|was muss|status)/.test(text)) {
    return 'summarize_tasks';
  }

  if (/(news|nachrichten|meldungen|deutschland|formel|f1|passiert)/.test(text) && /(fass|zusammen|wichtig|aktuell|briefing|zeige|was|heute)/.test(text)) {
    return 'summarize_news';
  }

  if (/wetter/.test(text)) return 'get_weather';
  if (/(wiki|wikipedia|wissen|suche nach)/.test(text)) return 'search_wiki';
  if (/(fokus|konzentrier|pomodoro)/.test(text)) return 'start_focus';

  if (/(navigiere|route|finde|suche|bring).*(tankstelle|apotheke|supermarkt|parkplatz|werkstatt|mcdonald|kleidung|geldautomat|bankautomat|paketstation|ladestation|krankenhaus|notfall)/.test(text)) {
    return 'find_place';
  }

  if (/(news|nachrichten|meldungen)/.test(text) && /(fass|zusammen|wichtig|aktuell|briefing|zeige)/.test(text)) {
    return 'summarize_news';
  }

  if (/(welche|fehlende|fehlen|erkläre|erklaere).*(rechte|berechtigungen|permission)/.test(text)) {
    return 'explain_permissions';
  }

  if (/(benachrichtigung|notification|rechte|berechtigung|freigabe|mikrofon|standort)/.test(text) && /(aktiviere|erlaub|öffne|oeffne|einrichten|freigeben)/.test(text)) {
    return 'request_permission';
  }

  if (/(systemstatus|system status|status|cpu|ram|akku|sicherheit)/.test(text)) return 'show_system_status';
  if (/(erinnere|reminder|benachrichtige)/.test(text)) return 'schedule_notification';
  if (/(öffne|oeffne|zeige|starte|wechsel)/.test(text) && findModule(text)) return 'open_module';

  return 'unknown';
}

export function parseUserCommand(input: string): ParsedCommand {
  const text = normalize(input);
  const intent = detectIntent(input);
  const entities: ParsedCommand['entities'] = { raw: input };
  const module = findModule(text);
  if (module) entities.module = module;

  entities.date = parseDate(text);
  entities.time = parseTime(text);
  entities.priority = parsePriority(text);
  entities.reminderMinutes = parseReminder(text);
  entities.title = parseTitle(input, intent);

  const missing: string[] = [];
  if ((intent === 'create_calendar_event' || intent === 'create_task') && !entities.title) missing.push('Titel');
  if (intent === 'create_calendar_event') {
    if (!entities.date) entities.date = new Date().toISOString().slice(0, 10);
    if (!entities.time) entities.time = '09:00';
    if (!entities.reminderMinutes) entities.reminderMinutes = 30;
  }
  if (intent === 'create_task' && !entities.priority) entities.priority = 'mittel';
  if (missing.length) entities.missing = missing;

  return { intent, entities };
}

export function executeCommand(parsed: ParsedCommand, context: CommandContext): string {
  const { entities } = parsed;

  if (entities.missing?.length) {
    return `Ich brauche noch: ${entities.missing.join(', ')}. Beispiel: „Erstelle morgen um 8 Uhr einen Termin Schule“. `;
  }

  switch (parsed.intent) {
    case 'create_calendar_event': {
      const event: CalendarEvent = {
        id: createId(),
        title: entities.title ?? 'Neuer Termin',
        date: entities.date ?? new Date().toISOString().slice(0, 10),
        time: entities.time ?? '09:00',
        reminderMinutes: entities.reminderMinutes ?? 30,
        provider: 'local-demo',
      };
      context.addEvent(event);
      return `Termin „${event.title}“ wurde lokal für ${formatDate(event.date)} um ${event.time} mit ${event.reminderMinutes} Minuten Erinnerung angelegt.`;
    }

    case 'list_calendar_events': {
      const sorted = [...context.events].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
      return sorted.length
        ? `Deine nächsten Termine: ${sorted.slice(0, 5).map((event) => `${event.title} (${formatDate(event.date)}, ${event.time})`).join(' · ')}`
        : 'Keine lokalen Termine vorhanden. Ich kann direkt einen Demo-Termin anlegen.';
    }

    case 'create_task': {
      const task: TaskItem = {
        id: createId(),
        title: entities.title ?? 'Neue Aufgabe',
        priority: entities.priority ?? 'mittel',
        status: 'offen',
        deadline: entities.date,
      };
      context.addTask(task);
      return `Aufgabe „${task.title}“ wurde mit Priorität ${task.priority}${task.deadline ? ` bis ${formatDate(task.deadline)}` : ''} erstellt.`;
    }

    case 'summarize_tasks': {
      const openTasks = context.tasks.filter((task) => task.status !== 'erledigt');
      return openTasks.length
        ? `Tagesplan: ${openTasks.map((task) => `${task.title} (${task.priority}, ${task.status})`).join(' · ')}`
        : 'Alle Aufgaben sind erledigt. Sehr gut.';
    }

    case 'open_module':
      context.open(entities.module ?? 'dashboard');
      return `Modul geöffnet: ${entities.module ?? 'dashboard'}.`;

    case 'summarize_news':
      context.open('news');
      return summarizeNews(demoNews);

    case 'get_weather':
      context.open('weather');
      return 'Wetter-Modul geöffnet. Live-Wetter nutzt /api/weather mit WEATHER_API_KEY und Standortfreigabe; sonst Fallback.';

    case 'find_place':
      context.open('navigation');
      return 'Navigation geöffnet. Standort wird nur nach Klick abgefragt; ohne Freigabe nutze ich lokale Fallback-Orte und echte Maps-Links.';

    case 'search_wiki':
      context.open('wiki');
      return 'Wissenssuche geöffnet. Wikipedia/Wikimedia ist kostenlos und wird über eine Server-Route abgefragt.';

    case 'start_focus':
      context.open('focus');
      return 'Fokusmodus geöffnet. Timer und Motivation laufen lokal und kostenlos.';

    case 'explain_permissions': {
      const missing = context.permissions.filter((permission) => permission.recommended && permission.status !== 'granted');
      context.open('permissions');
      return missing.length
        ? `Es fehlen empfohlene Rechte: ${missing.map((permission) => permission.name).join(', ')}. Ich öffne das Permission Center, dort wird jeder Zugriff einzeln erklärt.`
        : 'Alle empfohlenen Rechte sind eingerichtet. Optionale Rechte bleiben freiwillig.';
    }

    case 'request_permission':
      context.open('permissions');
      context.requestNotifications();
      return 'Ich öffne das Permission Center. Echte Berechtigungen werden nur per aktivem Klick und OS-Dialog angefragt.';

    case 'show_system_status':
      context.open('system');
      return 'Systemstatus geöffnet. Alle Metriken sind Demo oder offizielle Browser-/Native-API-Vorbereitung, keine Remote-Control.';

    case 'schedule_notification':
      context.requestNotifications();
      return 'Benachrichtigungen werden vorbereitet. Ohne Erlaubnis zeige ich Reminder als In-App-Hinweis.';

    default:
      return 'Das habe ich noch nicht sicher erkannt. Du kannst z. B. Termine, Aufgaben, News, Berechtigungen, Terminal oder Systemstatus steuern.';
  }
}

export const returnAssistantResponse = (result: string) => `AURA Core: ${result}`;

function normalize(input: string): string {
  return input.toLowerCase().replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss');
}

function findModule(text: string): ModuleId | undefined {
  return Object.entries(moduleAliases).find(([alias]) => text.includes(alias))?.[1];
}

function parseDate(text: string): string | undefined {
  const today = new Date();
  if (text.includes('uebermorgen')) today.setDate(today.getDate() + 2);
  else if (text.includes('morgen')) today.setDate(today.getDate() + 1);
  else if (text.includes('heute')) today.setDate(today.getDate());
  else {
    const match = text.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
    if (!match) return undefined;
    const year = match[3] ? Number(match[3].padStart(4, '20')) : today.getFullYear();
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  return today.toISOString().slice(0, 10);
}

function parseTime(text: string): string | undefined {
  const match = text.match(/(\d{1,2})(?::|\.)(\d{2})|um\s+(\d{1,2})\s*uhr|\b(\d{1,2})\s*uhr/);
  if (!match) return undefined;
  const hour = match[1] ?? match[3] ?? match[4];
  const minutes = match[2] ?? '00';
  return `${hour.padStart(2, '0')}:${minutes}`;
}

function parseReminder(text: string): number | undefined {
  const match = text.match(/(\d{1,3})\s*(min|minute|minuten)/);
  return match ? Number(match[1]) : undefined;
}

function parsePriority(text: string): TaskPriority {
  if (/(hoch|wichtig|dringend|kritisch)/.test(text)) return 'hoch';
  if (/(niedrig|spaeter|egal)/.test(text)) return 'niedrig';
  return 'mittel';
}

function parseTitle(input: string, intent: Intent): string | undefined {
  const afterColon = input.split(':').at(-1)?.trim();
  if (afterColon && afterColon !== input.trim()) return cleanTitle(afterColon);

  const cleaned = input
    .replace(/erstelle|erstell|anlegen|plane|mach|trag|notier|speicher/gi, '')
    .replace(/eine|einen|ein|den|der|die/gi, '')
    .replace(/termin|kalender|meeting|event|aufgabe|todo|task/gi, '')
    .replace(/heute|morgen|übermorgen|uebermorgen|um\s+\d{1,2}(:|\.)?\d{0,2}\s*uhr?/gi, '')
    .replace(/hohe|niedrige|mittlere|priorität|prioritaet|dringend|wichtig/gi, '')
    .replace(/\d{1,3}\s*(min|minute|minuten)/gi, '')
    .trim();

  if (!cleaned || intent === 'summarize_news' || intent === 'open_module') return undefined;
  return cleanTitle(cleaned);
}

function cleanTitle(title: string): string {
  return title.replace(/[.,;]+$/g, '').trim();
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`));
}
