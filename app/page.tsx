'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { executeCommand, parseUserCommand, returnAssistantResponse } from '@/lib/commands/commands';
import { LiveNewsProvider, newsCategories } from '@/lib/news/news';
import { BrowserLocationProvider, DemoPlacesProvider, MapsLinkNavigationProvider, bestFuelRecommendation, navigationCategories } from '@/lib/navigation/navigation';
import { LiveWeatherProvider } from '@/lib/weather/weather';
import { BrowserNotificationProvider, registerServiceWorker } from '@/lib/notifications/notifications';
import { defaultPermissions } from '@/lib/permissions/permissions';
import { buildReminders, demoEvents, demoTasks, exampleCommands, initialMessages } from '@/lib/storage/demoData';
import { createId, hashPassword, LocalStorageProvider } from '@/lib/storage/localStorageProvider';
import type { AppState, CalendarEvent, ModuleId, NewsItem, NoteItem, PlaceCategory, PlaceResult, ProviderConnection, ProviderStatus, ProviderUsage, SourceStatus, TaskItem, ToastMessage, WikiSummary } from '@/lib/storage/types';

const store = new LocalStorageProvider<AppState>('awsKiManager.state.v3');
const notifier = new BrowserNotificationProvider();
const liveNews = new LiveNewsProvider();
const weatherProvider = new LiveWeatherProvider();
const locationProvider = new BrowserLocationProvider();
const placesProvider = new DemoPlacesProvider();
const mapsProvider = new MapsLinkNavigationProvider();
const setupSteps = ['Standort & Navigation', 'Wetter', 'News', 'Wikipedia/Wissen', 'Orte & Tankstellen', 'Benachrichtigungen', 'Mikrofon & Sprache', 'Dateien', 'Datenschutz & lokale Speicherung', 'Fertig'];
const navItems: Array<{ id: ModuleId; label: string; icon: string }> = [
  { id: 'today', label: 'Heute', icon: '✦' },
  { id: 'assistant', label: 'AURA', icon: '◉' },
  { id: 'weather', label: 'Wetter', icon: '☁' },
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'calendar', label: 'Kalender', icon: '◇' },
  { id: 'tasks', label: 'Tasks', icon: '✓' },
  { id: 'permissions', label: 'Rechte', icon: '⛨' },
  { id: 'news', label: 'News', icon: '⌁' },
  { id: 'wiki', label: 'Wissen', icon: '⌕' },
  { id: 'navigation', label: 'Navigation', icon: '⌖' },
  { id: 'notes', label: 'Notizen', icon: '✎' },
  { id: 'focus', label: 'Fokus', icon: '◌' },
  { id: 'terminal', label: 'Terminal', icon: '>' },
  { id: 'files', label: 'Dateien', icon: '▣' },
  { id: 'system', label: 'System', icon: '▤' },
];

const tomorrowReset = () => {
  const reset = new Date();
  reset.setHours(24, 0, 0, 0);
  return reset.toISOString();
};

const provider = (id: string, name: string, status: ProviderStatus, source: string, detail: string, options: Partial<ProviderConnection> = {}): ProviderConnection => ({
  id,
  name,
  status,
  source,
  detail,
  limit: options.limit ?? 60,
  usedToday: options.usedToday ?? 0,
  resetAt: options.resetAt ?? tomorrowReset(),
  freeTier: options.freeTier ?? 'Kostenlos nutzbar',
  attribution: options.attribution,
  ...options,
});

const defaultProviderStatus = (): Record<string, ProviderConnection> => ({
  weather: provider('weather', 'Wetter', 'local', 'Open-Meteo', 'Kostenlose Live-Wetterdaten ohne API-Key.', { limit: 120, attribution: 'Open-Meteo' }),
  geocode: provider('geocode', 'Geocoding', 'local', 'Open-Meteo Geocoding', 'Stadt- und Ortssuche ohne API-Key.', { limit: 80, attribution: 'Open-Meteo' }),
  wiki: provider('wiki', 'Wikipedia/Wissen', 'local', 'Wikimedia', 'Kostenlose Wissenssuche ohne API-Key.', { limit: 80, attribution: 'Wikipedia/Wikimedia' }),
  places: provider('places', 'Orte & Tankstellen', 'local', 'OpenStreetMap/Nominatim', 'Kostenlose Ortssuche mit Attribution und defensivem 1s-Takt.', { limit: 40, attribution: '© OpenStreetMap contributors' }),
  navigation: provider('navigation', 'Navigation', 'local', 'Maps-Links', 'Google Maps, Apple Karten und OpenStreetMap Links funktionieren ohne API-Key.', { limit: 250 }),
  news: provider('news', 'News', 'local', 'RSS/NewsAPI optional', 'RSS wird kostenlos serverseitig getestet; NewsAPI bleibt optional.', { limit: 60 }),
  fuel: provider('fuel', 'Spritpreise', 'optional-key-needed', 'FuelPriceProvider optional', 'Tankstellen-Orte sind über OpenStreetMap verfügbar. Live-Spritpreise sind ohne erlaubte Datenquelle nicht verfügbar.', { limit: 0, freeTier: 'Keine sichere kostenlose Preisquelle verbunden' }),
  notifications: provider('notifications', 'Benachrichtigungen', 'permission-needed', 'Browser Notifications', 'Nur nach aktivem Browser-Dialog.', { limit: 25 }),
  location: provider('location', 'Standort', 'permission-needed', 'Browser Geolocation', 'Nur bei Nutzung, keine Hintergrund-Ortung.', { limit: 30 }),
  microphone: provider('microphone', 'Mikrofon', 'permission-needed', 'getUserMedia', 'Nur per Klick, Stream wird nach Test sofort gestoppt.', { limit: 20 }),
  speech: provider('speech', 'Spracheingabe', 'local', 'Web Speech API', 'Wenn der Browser Speech Recognition unterstützt.', { limit: 60 }),
  files: provider('files', 'Dateien', 'local', 'File Picker', 'Dateien werden ausschließlich nach manueller Auswahl gelesen.', { limit: 200 }),
  storage: provider('storage', 'Lokale Speicherung', 'local', 'LocalStorage', 'Lokale Aufgaben, Notizen und Einstellungen bleiben im Browser.', { limit: 1000 }),
  aura: provider('aura', 'AURA Core', 'local', 'RuleBasedAIProvider', 'Regelbasierte Assistenz funktioniert ohne OpenAI-Key.', { limit: 300 }),
});

const defaultProviderUsage = (): Record<string, ProviderUsage> => Object.fromEntries(Object.values(defaultProviderStatus()).map((item) => [item.id, { id: item.id, usedToday: item.usedToday ?? 0, resetAt: item.resetAt ?? tomorrowReset() }]));

function getProviderUsage(state: AppState, id: string) {
  const providerState = state.providerStatus?.[id] ?? defaultProviderStatus()[id];
  const usageState = state.providerUsage?.[id];
  const resetAt = usageState?.resetAt ?? providerState?.resetAt ?? tomorrowReset();
  const expired = new Date(resetAt).getTime() <= Date.now();
  return { usedToday: expired ? 0 : usageState?.usedToday ?? providerState?.usedToday ?? 0, resetAt: expired ? tomorrowReset() : resetAt, limit: providerState?.limit ?? 60 };
}

const initialState = (): AppState => ({
  dataMode: 'mixed',
  runtime: { speechSupported: false, speechListening: false },
  user: null,
  session: false,
  events: demoEvents,
  tasks: demoTasks,
  permissions: defaultPermissions,
  messages: initialMessages(),
  reminders: buildReminders(demoEvents),
  providerStatus: defaultProviderStatus(),
  providerUsage: defaultProviderUsage(),
  notes: [],
  focus: { minutes: 25, active: false },
  settings: { theme: 'dark', accent: 'cyan', density: 'comfort', reducedMotion: false, auraStyle: 'normal', preferLiveSources: true, forceFreeMode: true, voiceEnabled: true, readAnswers: false, wakeWord: 'AURA', defaultCity: 'Berlin', defaultMaps: 'google', quickDock: true },
  activeModule: 'today',
  booted: false,
  setupStep: 0,
  pwaInstallDismissed: false,
});

export default function Page() {
  const [state, setRawState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const setState = useCallback((next: AppState | ((current: AppState) => AppState)) => {
    setRawState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      store.save(resolved);
      return resolved;
    });
  }, []);

  const notifyInApp = useCallback((message: Omit<ToastMessage, 'id'>) => {
    setToast({ ...message, id: createId() });
  }, []);

  useEffect(() => {
    const saved = store.load();
    const base = initialState();
    setRawState(saved ? { ...base, ...saved, runtime: { ...base.runtime, ...saved.runtime }, notes: saved.notes ?? [], focus: saved.focus ?? base.focus, providerStatus: { ...base.providerStatus, ...saved.providerStatus }, providerUsage: { ...base.providerUsage, ...saved.providerUsage }, settings: { ...base.settings!, ...saved.settings }, dataMode: saved.dataMode ?? 'mixed' } : base);
    setReady(true);
    registerServiceWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!state.session || state.booted) return;
    const timer = window.setTimeout(() => setState((current) => ({ ...current, booted: true })), 1550);
    return () => window.clearTimeout(timer);
  }, [setState, state.booted, state.session]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!state.session) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const due = state.reminders.find((reminder) => !reminder.delivered && new Date(reminder.dueAt).getTime() <= now);
      if (!due) return;

      notifier.send('AWS KI Manager Reminder', `${due.title} startet in ${due.minutesBefore} Minuten.`).then((channel) => {
        if (channel === 'fallback') {
          notifyInApp({ tone: 'warning', title: 'In-App Reminder', body: `${due.title} startet bald.` });
        }
      });

      setState((current) => ({
        ...current,
        reminders: current.reminders.map((reminder) => (reminder.id === due.id ? { ...reminder, delivered: true } : reminder)),
      }));
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [notifyInApp, setState, state.reminders, state.session]);

  if (!ready) return null;

  if (!state.user || !state.session) {
    return <AuthScreen state={state} setState={setState} notify={notifyInApp} />;
  }

  if (!state.booted) return <BootScreen username={state.user.username} />;

  return (
    <main className="min-h-screen px-3 pb-28 pt-3 md:px-6 md:pb-32">
      <TopBar state={state} setState={setState} openPalette={() => setPaletteOpen(true)} openSettings={() => setSettingsOpen(true)} />
      <section className="mx-auto mt-5 max-w-7xl">
        <PwaInstallHint state={state} setState={setState} />
        <ModuleRouter state={state} setState={setState} notify={notifyInApp} />
      </section>
      {state.settings?.quickDock !== false ? <MobileBottomNav state={state} setState={setState} openSettings={() => setSettingsOpen(true)} /> : null}
      {settingsOpen ? <SettingsDrawer state={state} setState={setState} close={() => setSettingsOpen(false)} notify={notifyInApp} /> : null}
      {paletteOpen ? <CommandPalette setState={setState} close={() => setPaletteOpen(false)} /> : null}
      {toast ? <Toast toast={toast} /> : null}
    </main>
  );
}


function CommandPalette({ setState, close }: { setState: (next: AppState | ((current: AppState) => AppState)) => void; close: () => void }) {
  const [query, setQuery] = useState('');
  const commands: Array<{ label: string; module: ModuleId; hint: string }> = [
    { label: 'Heute öffnen', module: 'today', hint: 'Tagesbriefing und Schnellzugriffe' },
    { label: 'News suchen', module: 'news', hint: 'RSS und Live-Quellen' },
    { label: 'Wetter anzeigen', module: 'weather', hint: 'Open-Meteo kostenlos' },
    { label: 'Route planen', module: 'navigation', hint: 'Maps-Links und Orte' },
    { label: 'Aufgabe erstellen', module: 'tasks', hint: 'Lokale Tasks' },
    { label: 'Datei zusammenfassen', module: 'files', hint: 'Nur per File Picker' },
    { label: 'Wikipedia suchen', module: 'wiki', hint: 'Kostenlose Wissenssuche' },
    { label: 'Berechtigungen öffnen', module: 'permissions', hint: 'Browser-Freigaben' },
    { label: 'Fokusmodus starten', module: 'focus', hint: 'Lokaler Timer' },
    { label: 'Notizen öffnen', module: 'notes', hint: 'Lokaler Speicher' },
  ];
  const filtered = commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase()));
  function open(module: ModuleId) { setState((current) => ({ ...current, activeModule: module })); close(); }
  return <div className="fixed inset-0 z-50 grid place-items-start bg-black/55 p-4 pt-24 backdrop-blur-xl" onClick={close}><div className="window mx-auto w-full max-w-2xl" onClick={(event) => event.stopPropagation()}><p className="tiny">Command Palette · Ctrl K</p><input className="field mt-4" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Funktion suchen…" /> <div className="mt-4 grid gap-2">{filtered.map((command) => <button key={command.label} className="touch-btn" onClick={() => open(command.module)}><span className="block font-black">{command.label}</span><span className="text-sm text-white/55">{command.hint}</span></button>)}</div></div></div>;
}

function AuthScreen({ state, setState, notify }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const [mode, setMode] = useState(state.user ? 'login' : 'create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [style, setStyle] = useState<'professionell' | 'futuristisch' | 'minimal'>('professionell');
  const [message, setMessage] = useState(state.user ? `Willkommen zurück, ${state.user.username}. ${new Date().toLocaleDateString('de-DE')}` : 'Kostenloser lokaler Account. Passwort wird gehasht, nie sichtbar angezeigt.');

  async function submit() {
    if (!username.trim() || password.length < 4) {
      setMessage('Bitte Benutzername und ein Passwort mit mindestens 4 Zeichen eingeben.');
      return;
    }

    if (mode === 'create') {
      const user = {
        username: username.trim(),
        passwordHash: await hashPassword(password),
        initials: username.trim().slice(0, 2).toUpperCase(),
        style,
        createdAt: new Date().toISOString(),
        setupCompleted: false,
      };
      setState((current) => ({ ...current, user, session: false, setupStep: 0 }));
      setMode('login');
      setMessage('Account lokal erstellt. Willkommen im AWS KI Manager.');
      notify({ tone: 'success', title: 'Account erstellt', body: 'Deine Daten bleiben lokal in deinem Browser-Speicher.' });
      return;
    }

    const ok = state.user?.username === username.trim() && state.user.passwordHash === (await hashPassword(password));
    if (!ok) {
      setMessage('Login fehlgeschlagen. Passwort wird nicht angezeigt und nicht im UI ausgegeben.');
      return;
    }

    setState((current) => ({ ...current, session: true, booted: false, activeModule: current.user?.setupCompleted ? 'today' : 'setup' }));
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="window grid w-full max-w-6xl gap-8 overflow-hidden md:grid-cols-[1.08fr_.92fr]">
        <div className="relative rounded-[2rem] border border-blue-200/15 bg-blue-200/[.06] p-6 md:p-8">
          <p className="tiny">Artificial Workstation System KI Manager</p>
          <h1 className="mt-4 text-5xl font-black leading-none text-white md:text-7xl">AWS KI Manager</h1>
          <p className="mt-5 max-w-xl text-white/75">
            Dein ruhiges intelligentes Betriebssystem für Alltag, Wissen und Entscheidungen — lokal zuerst, transparent und nur mit deiner Freigabe.
          </p>
          <div className="mt-8"><AuraOrb size="large" /></div>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <p className="tiny">{mode === 'create' ? 'Erster Start' : 'Willkommen zurück'}</p>
          <h2 className="text-3xl font-black">{mode === 'create' ? 'Profil erstellen' : `Willkommen zurück${state.user ? `, ${state.user.username}` : ''}`}</h2>
          {mode === 'login' ? <div className="rounded-full border border-blue-200/20 bg-white/[.04] px-4 py-3 text-sm text-white/70">{new Date().toLocaleString('de-DE')} · Tagesstatus bereit</div> : null}
          <input className="field" autoComplete="username" placeholder="Benutzername" value={username} onChange={(event) => setUsername(event.target.value)} />
          {mode === 'create' ? <select className="field" value={style} onChange={(event) => setStyle(event.target.value as 'professionell' | 'futuristisch' | 'minimal')}><option>professionell</option><option>futuristisch</option><option>minimal</option></select> : <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-blue-200/30 bg-white/[.06] "><span className="text-2xl font-black">ID</span></div>}
          <input className="field" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} type="password" placeholder="Passwort" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} />
          <button className="touch-btn text-center" onClick={submit}>{mode === 'create' ? 'Profil erstellen' : 'Fortfahren'}</button>
          {state.user ? <button className="cyber-btn" onClick={() => setMode(mode === 'create' ? 'login' : 'create')}>{mode === 'create' ? 'Zum Login' : 'Neuen lokalen Account anlegen'}</button> : null}
          <p className="text-sm text-white/65">{message}</p>
        </div>
      </section>
    </main>
  );
}

function BootScreen({ username }: { username: string }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="text-center animate-boot">
        <AuraOrb size="large" />
        <p className="tiny mt-8">Cinematic Boot · AURA Core Initialisierung</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">Willkommen, {username}</h1>
        <div className="mx-auto mt-6 h-2 w-72 overflow-hidden rounded-full bg-blue-200/10">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-200 " />
        </div>
        <p className="mt-4 text-white/60">Personal Intelligence Dashboard · Workstation · Life OS</p>
      </div>
    </main>
  );
}

function ModuleRouter({ state, setState, notify }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const requestNotifications = useCallback(async () => {
    await registerServiceWorker();
    const result = await notifier.requestPermission();
    setState((current) => ({
      ...current,
      permissions: current.permissions.map((permission) =>
        permission.id === 'notifications'
          ? { ...permission, status: result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'demo' }
          : permission,
      ),
    }));
    if (result === 'granted') {
      await notifier.send('AWS KI Manager Test', 'AURA Core Benachrichtigungen sind aktiv.');
    }
    notify({ tone: result === 'granted' ? 'success' : 'warning', title: 'Notifications', body: result === 'granted' ? 'Test-Benachrichtigung gesendet.' : 'Ich nutze In-App-Reminder lokal.' });
  }, [notify, setState]);

  const openModule = useCallback((module: ModuleId) => setState((current) => ({ ...current, activeModule: module })), [setState]);
  const addEvent = useCallback((event: CalendarEvent) => {
    setState((current) => ({
      ...current,
      events: [...current.events, event],
      reminders: [...current.reminders, ...buildReminders([event])],
    }));
  }, [setState]);
  const addTask = useCallback((task: TaskItem) => setState((current) => ({ ...current, tasks: [...current.tasks, task] })), [setState]);

  const common = { state, setState, notify, requestNotifications, openModule, addEvent, addTask };

  switch (state.activeModule) {
    case 'setup': return <SetupWizard {...common} />;
    case 'today': return <TodayModule {...common} />;
    case 'weather': return <WeatherModule state={state} setState={setState} />;
    case 'dashboard': return <Dashboard {...common} />;
    case 'calendar': return <CalendarModule {...common} />;
    case 'tasks': return <TasksModule {...common} />;
    case 'news': return <NewsModule />;
    case 'wiki': return <WikiModule state={state} setState={setState} />;
    case 'navigation': return <NavigationModule state={state} setState={setState} notify={notify} />;
    case 'notes': return <NotesModule state={state} setState={setState} />;
    case 'focus': return <FocusModule state={state} setState={setState} notify={notify} />;
    case 'permissions': return <PermissionCenter {...common} />;
    case 'terminal': return <TerminalModule state={state} setState={setState} notify={notify} />;
    case 'files': return <FilesModule notify={notify} />;
    case 'system': return <SystemModule state={state} />;
    case 'assistant':
    default: return <AssistantModule {...common} />;
  }
}

type ModuleProps = {
  state: AppState;
  setState: (next: AppState | ((current: AppState) => AppState)) => void;
  notify: (message: Omit<ToastMessage, 'id'>) => void;
  requestNotifications: () => Promise<void>;
  openModule: (module: ModuleId) => void;
  addEvent: (event: CalendarEvent) => void;
  addTask: (task: TaskItem) => void;
};

function AssistantModule({ state, setState, requestNotifications, openModule, addEvent, addTask }: ModuleProps) {
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const speechAvailable = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  function speak(text: string) {
    if (!state.settings?.voiceEnabled || !state.settings?.readAnswers || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 420));
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
  }

  function startVoiceInput() {
    if (!speechAvailable) {
      setState((current) => ({ ...current, runtime: { ...current.runtime, speechSupported: false, speechListening: false } }));
      return;
    }
    type BrowserSpeechRecognition = { lang: string; continuous: boolean; interimResults: boolean; onstart: (() => void) | null; onend: (() => void) | null; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; start: () => void };
    const win = window as Window & { SpeechRecognition?: new () => BrowserSpeechRecognition; webkitSpeechRecognition?: new () => BrowserSpeechRecognition };
    const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { setListening(true); setState((current) => ({ ...current, runtime: { ...current.runtime, speechSupported: true, speechListening: true } })); };
    recognition.onend = () => { setListening(false); setState((current) => ({ ...current, runtime: { ...current.runtime, speechListening: false } })); };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setInput(transcript);
      if (transcript.trim()) void send(transcript);
    };
    recognition.start();
  }

  async function send(text = input) {
    if (!text.trim() || thinking) return;
    const needsLiveContext = /(heute.*passiert|nachrichten|news|deutschland|formel|f1|wetter|tankstelle|apotheke|supermarkt|parkplatz|navigation|route|geldautomat|wikipedia|wiki|wissen|fokus|notiz)/i.test(text);
    setInput('');
    setThinking(true);

    const userMessage = { id: createId(), role: 'user' as const, content: text, time: new Date().toISOString() };
    setState((current) => ({ ...current, messages: [...current.messages, userMessage] }));

    try {
      const parsed = parseUserCommand(text);
      const localResult = executeCommand(parsed, {
        events: state.events,
        tasks: state.tasks,
        permissions: state.permissions,
        open: openModule,
        addEvent,
        addTask,
        requestNotifications,
      });

      let content = returnAssistantResponse(localResult);
      let suggestions = exampleCommands.slice(0, 3);

      if (needsLiveContext || parsed.intent === 'unknown') {
        const response = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            context: {
              events: state.events.slice(0, 8),
              tasks: state.tasks.slice(0, 8),
              permissions: state.permissions,
              locationAvailable: Boolean(state.runtime?.location),
            },
          }),
        });
        if (response.ok) {
          const data = (await response.json()) as { answer?: string; suggestions?: string[]; status?: SourceStatus; note?: string };
          content = data.answer ?? content;
          suggestions = data.suggestions ?? suggestions;
          if (/(navigation|route|tankstelle|apotheke|supermarkt|parkplatz|geldautomat)/i.test(text)) openModule('navigation');
          if (/(news|nachrichten|passiert|deutschland|formel|f1)/i.test(text)) openModule('news');
          if (/(wikipedia|wiki|wissen)/i.test(text)) openModule('wiki');
          if (/(fokus)/i.test(text)) openModule('focus');
        }
      }

      setState((current) => ({
        ...current,
        messages: [...current.messages, { id: createId(), role: 'assistant', content, time: new Date().toISOString(), suggestions }],
      }));
      speak(content);
    } catch (error) {
      setState((current) => ({
        ...current,
        messages: [...current.messages, { id: createId(), role: 'assistant', content: `AURA Core: ${error instanceof Error ? error.message : 'Ich konnte die Anfrage nicht verarbeiten.'}`, time: new Date().toISOString() }],
      }));
    } finally {
      setThinking(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="window flex min-h-[72vh] flex-col liquid-focus">
        <div className="flex items-center gap-4">
          <AuraOrb />
          <div>
            <p className="tiny">Main Interface</p>
            <h2 className="text-3xl font-black">AURA Core</h2>
            <p className="text-sm text-white/60">Live-fähige deutsche Assistenz · App-Aktionen · News/Wetter/Navigation über sichere Provider</p>
          </div>
        </div>
        <div className="no-scrollbar mt-4 flex-1 space-y-3 overflow-auto rounded-3xl border border-white/10 bg-black/20 p-3 backdrop-blur-2xl">
          {state.messages.map((message) => (
            <div key={message.id} className={`max-w-[92%] rounded-3xl p-4 ${message.role === 'assistant' ? 'bg-blue-200/10' : 'ml-auto bg-blue-200/10'}`}>
              <p>{message.content}</p>
              {message.suggestions?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.suggestions.map((suggestion) => <button className="rounded-full border border-blue-200/20 px-3 py-2 text-xs text-white/70" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div> : null}
            </div>
          ))}
          {thinking ? <div className="max-w-[92%] rounded-3xl bg-blue-200/10 p-4 text-white/70">AURA analysiert Live-/lokale Provider…</div> : null}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input className="field" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void send()} placeholder="z.B. Was ist heute in Deutschland passiert?" />
          <button className="touch-btn text-center" onClick={() => void send()}>{thinking ? '…' : 'Senden'}</button>
          <button className="touch-btn text-center" title="Spracheingabe starten" onClick={startVoiceInput}>{listening ? 'Stop' : 'Sprechen'}</button>
        </div>
      </div>
      <div className="grid gap-4">
        <QuickCards state={state} openModule={openModule} />
        <WeatherCard state={state} />
        <ConnectionCenter state={state} compact />
        <ReminderPanel state={state} />
      </div>
    </section>
  );
}

function SetupWizard({ state, setState, requestNotifications, notify, openModule }: ModuleProps) {
  const step = Math.min(state.setupStep, setupSteps.length - 1);
  const current = setupSteps[step];
  const providers = state.providerStatus ?? defaultProviderStatus();

  const writeProvider = (id: string, status: ProviderStatus, detail: string, source = providers[id]?.source ?? 'Kostenloser Provider') => {
    setState((stored) => ({
      ...stored,
      providerStatus: (() => {
        const currentProviders = stored.providerStatus ?? defaultProviderStatus();
        const usage = getProviderUsage(stored, id);
        const nextUsed = status === 'limit-reached' ? usage.usedToday : Math.min(usage.usedToday + 1, usage.limit || usage.usedToday + 1);
        return {
          ...currentProviders,
          [id]: { ...currentProviders[id], id, name: currentProviders[id]?.name ?? id, status, source, detail, usedToday: nextUsed, resetAt: usage.resetAt, lastChecked: new Date().toISOString(), updatedAt: new Date().toISOString(), error: status === 'unavailable' || status === 'blocked' ? detail : undefined },
        };
      })(),
      providerUsage: (() => {
        const usage = getProviderUsage(stored, id);
        return { ...(stored.providerUsage ?? defaultProviderUsage()), [id]: { id, usedToday: status === 'limit-reached' ? usage.usedToday : Math.min(usage.usedToday + 1, usage.limit || usage.usedToday + 1), resetAt: usage.resetAt } };
      })(),
    }));
  };

  async function testProvider(id: string) {
    try {
      const usage = getProviderUsage(state, id);
      if (usage.limit > 0 && usage.usedToday >= usage.limit) {
        writeProvider(id, 'limit-reached', `Kostenloses Tageslimit erreicht. Wieder verfügbar ab ${new Date(usage.resetAt).toLocaleString('de-DE')}.`);
        return;
      }
      if (id === 'weather') {
        const response = await fetch(`/api/weather?city=${encodeURIComponent(state.settings?.defaultCity ?? 'Berlin')}`);
        if (!response.ok) throw new Error('Open-Meteo nicht erreichbar');
        writeProvider('weather', 'live', 'Open-Meteo Forecast und Geocoding wurden erfolgreich getestet.', 'Open-Meteo');
        return;
      }
      if (id === 'wiki') {
        const response = await fetch('/api/wiki?q=K%C3%BCnstliche%20Intelligenz');
        if (!response.ok) throw new Error('Wikipedia nicht erreichbar');
        writeProvider('wiki', 'live', 'Wikipedia/Wikimedia liefert kostenlose Wissensdaten.', 'Wikimedia');
        return;
      }
      if (id === 'places') {
        const response = await fetch('/api/places?category=pharmacy');
        if (!response.ok) throw new Error('OSM-Ortssuche nicht erreichbar');
        writeProvider('places', 'live', 'OpenStreetMap/Nominatim ist für kostenlose Ortssuche bereit.', 'OpenStreetMap/Nominatim');
        return;
      }
      if (id === 'news') {
        const response = await fetch('/api/news?category=Deutschland');
        const data = await response.json() as { status?: SourceStatus };
        writeProvider('news', data.status === 'live' ? 'live' : 'unavailable', data.status === 'live' ? 'RSS/News-Quelle ist live verbunden.' : 'Keine Live-Nachrichtenquelle verfügbar. RSS oder optionaler NEWS_API_KEY kann erneut geprüft werden.', 'RSS/NewsAPI optional');
        return;
      }
      if (id === 'navigation') {
        writeProvider('navigation', 'local', 'Maps-Links für Google Maps, Apple Karten und OpenStreetMap sind ohne API-Key verfügbar.', 'Maps-Links');
        return;
      }
      if (id === 'fuel') {
        writeProvider('fuel', 'optional-key-needed', 'Tankstellen können kostenlos als Orte gefunden werden. Live-Spritpreise benötigen eine erlaubte Datenquelle; Preise werden ohne legale Quelle nicht angezeigt.', 'FuelPriceProvider optional');
        return;
      }
      if (id === 'storage') {
        localStorage.setItem('awsKiManager.storageTest', new Date().toISOString());
        localStorage.removeItem('awsKiManager.storageTest');
        writeProvider('storage', 'local', 'Lokale Speicherung ist verfügbar.', 'LocalStorage');
        return;
      }
      if (id === 'aura') {
        writeProvider('aura', 'local', 'Kostenloser lokaler AURA-Modus ist aktiv; OpenAI bleibt optional serverseitig.', 'LocalAIProvider');
      }
    } catch (error) {
      writeProvider(id, 'unavailable', error instanceof Error ? error.message : 'Provider-Test fehlgeschlagen; Quelle ist aktuell nicht verbunden.');
    }
  }

  async function requestPermissionStep(id: 'location' | 'notifications' | 'microphone' | 'speech' | 'files') {
    try {
      if (id === 'location') {
        const location = await locationProvider.current();
        setState((stored) => ({
          ...stored,
          runtime: { ...stored.runtime, location },
          permissions: stored.permissions.map((permission) => permission.id === 'location' ? { ...permission, status: 'granted' } : permission),
        }));
        writeProvider('location', 'live', 'Standort wurde für Wetter, Orte und Navigation freigegeben. Keine Hintergrund-Ortung.', 'Browser Geolocation');
        return;
      }
      if (id === 'notifications') {
        await requestNotifications();
        writeProvider('notifications', Notification.permission === 'granted' ? 'live' : 'blocked', Notification.permission === 'granted' ? 'Browser-Benachrichtigungen sind aktiv.' : 'Benachrichtigungen sind nicht erlaubt; In-App-Reminder bleiben aktiv.', 'Browser Notifications');
        return;
      }
      if (id === 'microphone') {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Mikrofon-API wird in diesem Browser nicht unterstützt.');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setState((stored) => ({ ...stored, permissions: stored.permissions.map((permission) => permission.id === 'microphone' ? { ...permission, status: 'granted' } : permission) }));
        writeProvider('microphone', 'live', 'Mikrofon wurde getestet und sofort wieder gestoppt.', 'getUserMedia');
        return;
      }
      if (id === 'speech') {
        const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        setState((stored) => ({ ...stored, runtime: { ...stored.runtime, speechSupported: supported } }));
        writeProvider('speech', supported ? 'local' : 'unavailable', supported ? 'Speech Recognition ist im aktiven Browser verfügbar.' : 'Dieser Browser unterstützt Web Speech Recognition nicht.', 'Web Speech API');
        return;
      }
      if (id === 'files') {
        writeProvider('files', 'local', 'Dateizugriff startet nur über den File Picker im Dateien-Modul.', 'File Picker');
      }
    } catch (error) {
      const blocked = error instanceof Error ? error.message : 'Berechtigung wurde nicht erteilt.';
      writeProvider(id, 'blocked', blocked);
      setState((stored) => ({ ...stored, permissions: stored.permissions.map((permission) => permission.id === id ? { ...permission, status: 'denied' } : permission) }));
    }
  }

  async function runCurrentStep() {
    const actions: Record<string, () => Promise<void>> = {
      'Standort & Navigation': async () => { await requestPermissionStep('location'); await testProvider('navigation'); },
      Wetter: async () => testProvider('weather'),
      News: async () => testProvider('news'),
      'Wikipedia/Wissen': async () => testProvider('wiki'),
      'Orte & Tankstellen': async () => { await testProvider('places'); await testProvider('fuel'); },
      Benachrichtigungen: async () => requestPermissionStep('notifications'),
      'Mikrofon & Sprache': async () => { await requestPermissionStep('microphone'); await requestPermissionStep('speech'); },
      Dateien: async () => requestPermissionStep('files'),
      'Datenschutz & lokale Speicherung': async () => { await testProvider('storage'); await testProvider('aura'); },
    };
    await actions[current]?.();
    if (current !== 'Fertig') setState((stored) => ({ ...stored, setupStep: Math.min(stored.setupStep + 1, setupSteps.length - 1) }));
  }

  async function connectAll() {
    notify({ tone: 'info', title: 'Setup startet', body: 'Ich teste kostenlose Live-Provider und frage Browser-Rechte nacheinander ab.' });
    for (const id of ['weather', 'wiki', 'places', 'navigation', 'news', 'fuel'] as const) await testProvider(id);
    for (const id of ['location', 'notifications', 'microphone', 'speech', 'files'] as const) await requestPermissionStep(id);
    await testProvider('storage');
    await testProvider('aura');
    finishSetup();
  }

  function finishSetup() {
    const summary = 'Ich habe deine kostenlosen Live-Funktionen eingerichtet: Wetter über Open-Meteo, Wissen über Wikipedia, Orte über OpenStreetMap und Navigation über Maps-Links. Tankstellen kann ich kostenlos finden; echte Spritpreise benötigen eine erlaubte Datenquelle.';
    setState((stored) => ({
      ...stored,
      user: stored.user ? { ...stored.user, setupCompleted: true } : stored.user,
      activeModule: 'today',
      setupStep: setupSteps.length - 1,
      messages: [...stored.messages, { id: createId(), role: 'assistant', content: summary, time: new Date().toISOString(), suggestions: ['Mach mir mein Tagesbriefing', 'Welche Provider sind verbunden?', 'Finde eine Tankstelle in der Nähe'] }],
    }));
    notify({ tone: 'success', title: 'Setup abgeschlossen', body: 'Kostenloser Modus ist verbunden. AURA Core ist bereit.' });
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <div className="window liquid-focus">
        <p className="tiny">AWS KI Manager einrichten</p>
        <h2 className="mt-2 text-4xl font-black">Kostenlose Live-Funktionen verbinden</h2>
        <p className="mt-3 text-white/60">Der Wizard testet kostenlose Provider automatisch und fragt Browser-Berechtigungen nur per sichtbarem Nutzerklick ab.</p>
        <div className="mt-6 grid gap-2">
          {setupSteps.map((label, index) => <button key={label} className={`rounded-2xl border p-3 text-left transition ${index === step ? 'border-blue-200/35 bg-blue-200/10' : index < step ? 'border-blue-200/25 bg-blue-200/10' : 'border-white/10 bg-white/[.025]'}`} onClick={() => setState((stored) => ({ ...stored, setupStep: index }))}><span className="tiny">Schritt {index + 1}</span><b className="block">{label}</b></button>)}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="touch-btn" onClick={() => void connectAll()}>Kostenlose Live-Funktionen verbinden</button>
          <button className="cyber-btn" onClick={() => void runCurrentStep()}>Aktuellen Schritt ausführen</button>
          <button className="cyber-btn" onClick={finishSetup}>Heute öffnen</button>
        </div>
      </div>
      <div className="grid gap-4">
        <section className="window">
          <p className="tiny">Aktueller Schritt</p>
          <h3 className="mt-2 text-2xl font-black">{current}</h3>
          <p className="mt-3 text-white/60">{current === 'Fertig' ? 'Alles bereit. Öffne dein Dashboard oder starte AURA.' : 'Führe den Schritt aus oder verbinde alle kostenlosen Funktionen in einem geführten Durchlauf.'}</p>
        </section>
        <ConnectionCenter state={state} />
      </div>
    </section>
  );
}


function TodayModule({ state, openModule, requestNotifications }: ModuleProps) {
  const nextEvent = upcomingEvents(state.events)[0];
  const openTasks = state.tasks.filter((task) => task.status !== 'erledigt');
  const nextReminder = state.reminders.filter((reminder) => !reminder.delivered).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <div className="window liquid-focus">
        <p className="tiny">Heute · Personal Intelligence</p>
        <h2 className="mt-2 text-4xl font-black">Willkommen zurück, {state.user?.username}</h2>
        <p className="mt-2 text-white/65">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })} · {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
        <div className="my-6"><AuraOrb size="large" /></div>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="card"><p className="tiny">AURA Briefing</p><p className="mt-3 text-lg font-semibold">Du hast {openTasks.length} offene Aufgaben{nextEvent ? `, dein nächster Termin ist ${nextEvent.title} um ${nextEvent.time}` : ''}. Starte mit der wichtigsten Sache und halte 25 Minuten Fokus.</p></article>
          <article className="card"><p className="tiny">Nächste Erinnerung</p><p className="mt-3 text-lg font-semibold">{nextReminder ? `${nextReminder.title} · ${new Date(nextReminder.dueAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : 'Keine offene Erinnerung'}</p></article>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["AURA", 'assistant'], ["Wetter", 'weather'], ["News", 'news'], ["Route", 'navigation'], ["Aufgabe", 'tasks'], ["Datei", 'files'], ["Wissen", 'wiki'], ["Fokus", 'focus']].map(([label, module]) => <button key={label} className="touch-btn" onClick={() => openModule(module as ModuleId)}>{label}</button>)}
        </div>
      </div>
      <div className="grid gap-4">
        <WeatherCard state={state} />
        <ConnectionCenter state={state} compact />
        <QuickCards state={state} openModule={openModule} />
        <button className="touch-btn" onClick={requestNotifications}>Benachrichtigung testen</button>
      </div>
    </section>
  );
}

function ConnectionCenter({ state, compact = false }: { state: AppState; compact?: boolean }) {
  const providers = Object.values(state.providerStatus ?? defaultProviderStatus());
  const visible = compact ? providers.slice(0, 7) : providers;
  return (
    <section className="window">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tiny">Verbindungszentrale</p>
          <h3 className="mt-1 text-2xl font-black">Kostenloser Modus</h3>
        </div>
        <ProviderBadge status={providers.some((provider) => provider.status === 'live') ? 'live' : 'unavailable'} />
      </div>
      <div className="mt-4 grid gap-2">
        {visible.map((provider) => (
          <article key={provider.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <b>{provider.name}</b>
                <p className="text-xs text-white/45">{provider.source}</p>
              </div>
              <ProviderBadge status={provider.status} />
            </div>
            {!compact ? <p className="mt-2 text-sm text-white/55">{provider.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function ProviderBadge({ status }: { status: ProviderStatus }) {
  const labels: Record<ProviderStatus, string> = {
    live: 'Live',
    local: 'Lokal',
    unavailable: 'Nicht verbunden',
    'limit-reached': 'Limit erreicht',
    'permission-needed': 'Freigabe nötig',
    'optional-key-needed': 'optional',
    blocked: 'blockiert',
    offline: 'Offline',
  };
  const tone = status === 'live' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-50' : status === 'local' ? 'border-blue-200/20 bg-blue-200/10 text-blue-50' : status === 'permission-needed' || status === 'limit-reached' ? 'border-yellow-200/25 bg-yellow-200/10 text-yellow-50' : status === 'optional-key-needed' ? 'border-white/16 bg-white/[.04] text-white/70' : 'border-red-200/20 bg-red-200/10 text-red-50';
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${tone}`}>{labels[status]}</span>;
}


function WeatherModule({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  const [city, setCity] = useState(state.settings?.defaultCity ?? 'Berlin');
  const [weather, setWeather] = useState(state.runtime?.weather);
  const [loading, setLoading] = useState(false);
  async function loadWeather(nextCity = city) {
    setLoading(true);
    const response = await fetch(`/api/weather?city=${encodeURIComponent(nextCity)}`);
    const result = (await response.json()) as NonNullable<AppState['runtime']>['weather'];
    setWeather(result);
    setState((current) => ({ ...current, runtime: { ...current.runtime, weather: result } }));
    setLoading(false);
  }
  const nextHour = weather?.hourly?.[1] ?? weather?.hourly?.[0];
  const rainRisk = weather?.precipitationProbability ?? 0;
  const stormRisk = /gewitter/i.test(weather?.condition ?? '');
  const sunChance = Math.max(0, 100 - (weather?.cloudCover ?? 50));
  return <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="window liquid-focus"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="tiny">Open-Meteo Weather</p><h2 className="text-4xl font-black">Wetter</h2></div><StatusBadge status={weather?.source ?? 'local'} /></div><div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input className="field" value={city} onChange={(event) => setCity(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void loadWeather()} placeholder="Wetter in Landshut, Dortmund, München…" /><button className="touch-btn" onClick={() => void loadWeather()}>{loading ? 'Lädt…' : 'Wetter laden'}</button></div><div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[.035] p-6"><p className="text-sm text-white/50">{weather?.location ?? 'Ort wählen'}</p><div className="mt-2 flex flex-wrap items-end gap-4"><p className="text-7xl font-black tracking-tighter">{weather ? `${weather.temperatureC}°` : '—'}</p><div><h3 className="text-2xl font-black">{weather?.condition ?? 'Kostenlos live via Open-Meteo'}</h3><p className="text-white/55">H {weather?.highC ?? '—'}° · T {weather?.lowC ?? '—'}° · Wind {weather?.windKmh ?? '—'} km/h</p></div></div><p className="mt-4 text-sm text-white/55">{weather?.nearestHourNote ?? 'Fragen wie „Regnet es in 30 Minuten?“ nutzen den nächstliegenden Open-Meteo-Stundenwert.'}</p></div></div><div className="grid gap-4"><div className="window"><p className="tiny">Risiken</p><div className="mt-4 grid grid-cols-2 gap-3"><RiskBadge label="Regen" value={`${rainRisk}%`} active={rainRisk > 45} /><RiskBadge label="Gewitter" value={stormRisk ? 'Hinweis' : 'gering'} active={stormRisk} /><RiskBadge label="Sonne" value={`${sunChance}%`} active={sunChance > 55} /><RiskBadge label="Wind" value={`${weather?.windGustKmh ?? weather?.windKmh ?? 0} km/h`} active={(weather?.windGustKmh ?? 0) > 45} /></div>{nextHour ? <p className="mt-4 text-sm text-white/55">Nächste Stunde: {nextHour.temperatureC}° · {nextHour.precipitationProbability}% Regen · {nextHour.condition}</p> : null}</div><div className="window"><p className="tiny">Stundenverlauf</p><div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">{weather?.hourly?.map((hour) => <div key={hour.time} className="min-w-28 rounded-2xl border border-white/10 bg-white/[.03] p-3"><p className="text-xs text-white/45">{new Date(hour.time).toLocaleTimeString('de-DE', { hour: '2-digit' })}</p><b>{hour.temperatureC}°</b><p className="text-xs text-white/50">{hour.precipitationProbability}% Regen</p></div>) ?? <p className="text-white/50">Noch keine Live-Daten geladen.</p>}</div></div></div></section>;
}

function RiskBadge({ label, value, active }: { label: string; value: string; active: boolean }) { return <div className={`rounded-2xl border p-3 ${active ? 'border-blue-200/35 bg-blue-200/10' : 'border-white/10 bg-white/[.03]'}`}><p className="text-xs uppercase tracking-[.2em] text-white/45">{label}</p><b>{value}</b></div>; }

function Dashboard({ state, openModule, requestNotifications }: ModuleProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
      <div className="window">
        <p className="tiny">Personal Intelligence Dashboard</p>
        <h2 className="mt-2 text-4xl font-black">Personal Intelligence Dashboard</h2>
        <p className="mt-2 text-white/65">Ein cleanes Premium-Dashboard für Alltag, Arbeit, Schule, Wissen, Wetter, News und Navigation.</p>
        <div className="my-6"><AuraOrb size="large" /></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ['Heute öffnen', 'today'], ['KI fragen', 'assistant'], ['Kalender öffnen', 'calendar'], ['Termin erstellen', 'calendar'], ['Aufgabe erstellen', 'tasks'], ['Live-News', 'news'], ['Wissen suchen', 'wiki'], ['Navigation', 'navigation'], ['Fokusmodus', 'focus'], ['Notizen', 'notes'], ['Berechtigungen', 'permissions'], ['Terminal öffnen', 'terminal'], ['Systemstatus', 'system'], ['Setup', 'setup'],
          ].map(([label, module]) => <button key={label} className="touch-btn" onClick={() => openModule(module as ModuleId)}>{label}</button>)}
        </div>
      </div>
      <div className="grid gap-4">
        <QuickCards state={state} openModule={openModule} />
        <ConnectionCenter state={state} compact />
        <ReminderPanel state={state} />
        <button className="touch-btn" onClick={requestNotifications}>Test-Benachrichtigung senden</button>
      </div>
    </section>
  );
}

function QuickCards({ state, openModule }: { state: AppState; openModule: (module: ModuleId) => void }) {
  const nextEvents = useMemo(() => upcomingEvents(state.events).slice(0, 2), [state.events]);
  const openTasks = state.tasks.filter((task) => task.status !== 'erledigt').slice(0, 3);

  return (
    <div className="grid gap-3">
      <button className="card text-left" onClick={() => openModule('calendar')}>
        <p className="tiny">Nächste Termine</p>
        {nextEvents.map((event) => <p key={event.id} className="mt-2 font-semibold">{event.title} · {event.date} {event.time}</p>)}
      </button>
      <button className="card text-left" onClick={() => openModule('tasks')}>
        <p className="tiny">Aufgaben</p>
        {openTasks.map((task) => <p key={task.id} className="mt-2 font-semibold">{task.title} · {task.priority}</p>)}
      </button>
      <button className="card text-left" onClick={() => openModule('navigation')}>
        <p className="tiny">Navigation</p>
        <p className="mt-2 font-semibold">Tankstelle · Apotheke · Maps-Links</p>
      </button>
    </div>
  );
}

function WeatherCard({ state }: { state: AppState }) {
  const [weather, setWeather] = useState(state.runtime?.weather);

  async function loadWeather() {
    const input = state.runtime?.location ? { latitude: state.runtime.location.latitude, longitude: state.runtime.location.longitude } : { city: 'Berlin' };
    const result = await weatherProvider.current(input);
    setWeather(result);
  }

  return (
    <div className="window">
      <div className="flex items-center justify-between gap-3"><div><p className="tiny">Weather Core</p><h3 className="mt-1 text-xl font-black">Wetter</h3></div><StatusBadge status={weather?.source ?? 'api-missing'} /></div>
      <p className="mt-3 text-white/70">{weather ? `${weather.location}: ${weather.temperatureC}°C, ${weather.condition}` : 'Wetter wird über Open-Meteo geladen, sobald du eine Stadt prüfst.'}</p>
      <button className="cyber-btn mt-4" onClick={() => void loadWeather()}>Wetter laden</button>
    </div>
  );
}

function ReminderPanel({ state }: { state: AppState }) {
  const reminders = state.reminders.filter((reminder) => !reminder.delivered).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4);
  return (
    <div className="window">
      <p className="tiny">Termin-Reminder</p>
      <h3 className="mt-1 text-xl font-black">Anstehende Hinweise</h3>
      {reminders.length ? reminders.map((reminder) => <div key={reminder.id} className="mt-3 rounded-2xl border border-blue-200/15 bg-blue-200/10 p-3"><b>{reminder.title}</b><p className="text-sm text-white/65">{new Date(reminder.dueAt).toLocaleString('de-DE')} · {reminder.minutesBefore} Min vorher</p></div>) : <p className="mt-3 text-white/60">Keine offenen Reminder.</p>}
    </div>
  );
}

function CalendarModule({ state, setState, notify }: ModuleProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [reminderMinutes, setReminderMinutes] = useState(30);

  function createEvent() {
    if (!title.trim()) {
      notify({ tone: 'warning', title: 'Titel fehlt', body: 'Bitte gib einen Termin-Titel ein.' });
      return;
    }
    const event: CalendarEvent = { id: createId(), title: title.trim(), date, time, reminderMinutes, provider: 'local-demo' };
    setState((current) => ({ ...current, events: [...current.events, event], reminders: [...current.reminders, ...buildReminders([event])] }));
    setTitle('');
    notify({ tone: 'success', title: 'Termin erstellt', body: `${event.title} · ${event.date} ${event.time}` });
  }

  const events = upcomingEvents(state.events);

  return (
    <section className="window">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="tiny">Calendar Core</p><h2 className="text-3xl font-black">Kalender</h2></div>
        <p className="rounded-full border border-blue-200/20 px-4 py-2 text-sm text-white/65">Provider: Lokaler Kalender</p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <input className="field" placeholder="Termin-Titel" value={title} onChange={(event) => setTitle(event.target.value)} />
        <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <input className="field" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <select className="field" value={reminderMinutes} onChange={(event) => setReminderMinutes(Number(event.target.value))}>
          {[5, 10, 15, 30, 60, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} Min.</option>)}
        </select>
        <button className="touch-btn text-center" onClick={createEvent}>Erstellen</button>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => <article key={event.id} className="card"><p className="tiny">{event.provider}</p><h3 className="mt-2 text-xl font-black">{event.title}</h3><p className="text-white/70">{event.date} · {event.time}</p><p className="text-sm text-white/55">Reminder {event.reminderMinutes} Minuten vorher</p><button className="cyber-btn mt-4" onClick={() => setState((current) => ({ ...current, events: current.events.filter((item) => item.id !== event.id), reminders: current.reminders.filter((reminder) => reminder.eventId !== event.id) }))}>Löschen</button></article>)}
      </div>
    </section>
  );
}

function TasksModule({ state, setState, notify }: ModuleProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskItem['priority']>('mittel');

  function createTask() {
    if (!title.trim()) {
      notify({ tone: 'warning', title: 'Aufgabe fehlt', body: 'Bitte gib eine Aufgabe ein.' });
      return;
    }
    setState((current) => ({ ...current, tasks: [...current.tasks, { id: createId(), title: title.trim(), priority, status: 'offen' }] }));
    setTitle('');
  }

  return (
    <section className="window">
      <p className="tiny">Task Matrix</p><h2 className="text-3xl font-black">Aufgaben</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Neue Aufgabe" />
        <select className="field" value={priority} onChange={(event) => setPriority(event.target.value as TaskItem['priority'])}><option>niedrig</option><option>mittel</option><option>hoch</option></select>
        <button className="touch-btn text-center" onClick={createTask}>Erstellen</button>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {state.tasks.map((task) => <article key={task.id} className="card"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{task.title}</h3><p className="text-white/60">{task.priority} · {task.status}</p></div><button className="cyber-btn" onClick={() => setState((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status: item.status === 'erledigt' ? 'offen' : 'erledigt' } : item) }))}>✓</button></div></article>)}
      </div>
    </section>
  );
}

function NewsModule() {
  const [category, setCategory] = useState('Alle');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [summary, setSummary] = useState('Noch keine Live-Nachrichten geladen.');
  const [message, setMessage] = useState('Live-News werden über RSS oder optionalen NEWS_API_KEY geladen.');
  const [status, setStatus] = useState<SourceStatus>('api-missing');
  const [loading, setLoading] = useState(false);

  const loadNews = useCallback(async (nextCategory = category, nextQuery = query) => {
    setLoading(true);
    try {
      const response = await liveNews.list({ category: nextCategory, query: nextQuery, dateHint: detectDateHint(nextQuery) });
      const usable = response.status === 'live' || response.status === 'local';
      setItems(usable ? response.items : []);
      setSummary(usable ? response.summary : 'Keine Live-Nachrichtenquelle verfügbar.');
      setMessage(usable ? response.message : 'Keine Live-Nachrichtenquelle verfügbar. Prüfe Verbindung oder optionalen Free-Key.');
      setStatus(usable ? response.status : 'api-missing');
    } catch (error) {
      setItems([]);
      setSummary('Keine Live-Nachrichtenquelle verfügbar.');
      setMessage(error instanceof Error ? error.message : 'Keine Live-Nachrichtenquelle verfügbar. Prüfe Verbindung oder optionalen Free-Key.');
      setStatus('api-missing');
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => { void loadNews('Alle', ''); }, [loadNews]);

  return (
    <section className="window">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="tiny">News Feed</p><h2 className="text-3xl font-black">Aktuelle Nachrichten</h2></div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[auto_1fr_auto]">
        <select className="field" value={category} onChange={(event) => { setCategory(event.target.value); void loadNews(event.target.value, query); }}>{newsCategories.map((item) => <option key={item}>{item}</option>)}</select>
        <input className="field" placeholder="Was ist heute passiert? Formel 1, Deutschland, Sicherheit…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void loadNews()} />
        <button className="touch-btn text-center" onClick={() => void loadNews()}>{loading ? 'Lädt…' : 'Live suchen'}</button>
      </div>
      <div className="my-5 rounded-3xl border border-blue-200/20 bg-blue-200/10 p-4 text-white"><p>{summary}</p><p className="mt-2 text-xs text-white/60">{message}</p></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.length ? items.map((item) => <article className="card" key={item.id}><div className="flex items-center justify-between gap-3"><p className="tiny">{item.category}</p><StatusBadge status={item.status ?? status} /></div><h3 className="mt-2 text-xl font-black">{item.title}</h3><p className="mt-2 text-white/62">{item.summary}</p><p className="mt-3 text-xs text-white/38">{item.source} · {new Date(item.publishedAt).toLocaleString('de-DE')}</p>{item.url ? <a className="cyber-btn mt-4 inline-block" href={item.url} target="_blank" rel="noreferrer">Quelle öffnen</a> : null}</article>) : <article className="card md:col-span-2 xl:col-span-3"><h3 className="text-2xl font-black">Keine Live-Nachrichtenquelle verfügbar</h3><p className="mt-2 text-white/55">AWS KI Manager zeigt keine erfundenen Nachrichten. Prüfe deine Verbindung oder ergänze optional einen Free-Key serverseitig.</p></article>}</div>
    </section>
  );
}

function PermissionCenter({ state, setState, requestNotifications, notify }: ModuleProps) {
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  function updatePermission(id: string, status: AppState['permissions'][number]['status']) {
    setState((current) => ({ ...current, permissions: current.permissions.map((permission) => permission.id === id ? { ...permission, status } : permission) }));
  }

  async function requestLocation() {
    try {
      const location = await locationProvider.current();
      setState((current) => ({ ...current, runtime: { ...current.runtime, location }, permissions: current.permissions.map((permission) => permission.id === 'location' ? { ...permission, status: 'granted' } : permission) }));
      notify({ tone: 'success', title: 'Standort aktiv', body: 'Standort wurde einmalig für Wetter und Navigation abgerufen.' });
    } catch {
      updatePermission('location', 'denied');
      notify({ tone: 'warning', title: 'Standort nicht verfügbar', body: 'Du kannst Navigation weiter über manuelle Adresse und Maps-Links nutzen.' });
    }
  }

  async function requestMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      updatePermission('microphone', 'denied');
      notify({ tone: 'warning', title: 'Mikrofon nicht unterstützt', body: 'Dieser Browser bietet keine MediaDevices API.' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      setState((current) => ({ ...current, runtime: { ...current.runtime, microphoneActive: true }, permissions: current.permissions.map((permission) => permission.id === 'microphone' ? { ...permission, status: 'granted' } : permission) }));
      notify({ tone: 'success', title: 'Mikrofon aktiv', body: 'Audiozugriff läuft sichtbar. Du kannst ihn sofort stoppen.' });
    } catch {
      updatePermission('microphone', 'denied');
    }
  }

  function stopMicrophone() {
    micStream?.getTracks().forEach((track) => track.stop());
    setMicStream(null);
    setState((current) => ({ ...current, runtime: { ...current.runtime, microphoneActive: false } }));
  }

  function prepareSpeech() {
    const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const supported = Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
    setState((current) => ({ ...current, runtime: { ...current.runtime, speechSupported: supported }, permissions: current.permissions.map((permission) => permission.id === 'speech' ? { ...permission, status: supported ? 'requested' : 'denied' } : permission) }));
    notify({ tone: supported ? 'success' : 'warning', title: 'Speech API', body: supported ? 'Web Speech API ist vorbereitet; Aufnahme startet erst per explizitem Klick.' : 'Dieser Browser unterstützt Web Speech API nicht.' });
  }

  async function requestPermission(permissionId: string) {
    if (permissionId === 'notifications') { await requestNotifications(); return; }
    if (permissionId === 'location') { await requestLocation(); return; }
    if (permissionId === 'microphone') { await requestMicrophone(); return; }
    if (permissionId === 'speech') { prepareSpeech(); return; }
    updatePermission(permissionId, 'requested');
  }

  async function setupRecommended() {
    for (const permission of state.permissions.filter((item) => item.recommended)) {
      await requestPermission(permission.id);
    }
  }

  return (
    <section className="window">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="tiny">Transparent Permission Layer</p><h2 className="text-3xl font-black">Permission Center</h2></div><button className="touch-btn" onClick={() => void setupRecommended()}>Empfohlene einzeln einrichten</button></div>
      {state.runtime?.microphoneActive ? <div className="mt-4 rounded-3xl border border-red-300/30 bg-red-400/10 p-4"><b>Mikrofon aktiv</b><p className="text-sm text-white/65">Audiozugriff läuft nur nach deinem Klick.</p><button className="cyber-btn mt-3" onClick={stopMicrophone}>Mikrofon stoppen</button></div> : null}
      <div className="mt-6 grid gap-3 md:grid-cols-2">{state.permissions.map((permission) => { const badge: SourceStatus = permission.status === 'granted' ? 'live' : permission.status === 'denied' ? 'permission-missing' : permission.status === 'demo' ? 'demo' : 'api-missing'; return <article key={permission.id} className="card"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">{permission.name}</h3><StatusBadge status={badge} /></div><p className="mt-2 text-white/70">{permission.description}</p><p className="mt-2 text-sm text-white/45">{permission.technical}</p><div className="mt-4 flex flex-wrap gap-2"><button className="cyber-btn" onClick={() => void requestPermission(permission.id)}>Freigeben</button><button className="cyber-btn" onClick={() => updatePermission(permission.id, 'demo')}>Lokal nutzen</button><button className="cyber-btn" onClick={() => updatePermission(permission.id, 'disconnected')}>Trennen</button></div></article>; })}</div>
    </section>
  );
}

function NavigationModule({ state, setState, notify }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const [query, setQuery] = useState('Tankstelle');
  const [category, setCategory] = useState<PlaceCategory>('fuel');
  const [results, setResults] = useState<PlaceResult[]>([]);

  const search = useCallback(async (nextCategory = category, nextQuery = query) => {
    const places = await placesProvider.search({ category: nextCategory, query: nextQuery, origin: state.runtime?.location });
    setResults(places);
    if (nextCategory === 'fuel') {
      const best = bestFuelRecommendation(places);
      notify({ tone: 'info', title: 'Tankstellen gefunden', body: best ? `${best.name}: Ort verfügbar. Live-Spritpreise sind ohne erlaubte Datenquelle nicht verfügbar.` : 'Keine Tankstelle gefunden.' });
    }
  }, [category, notify, query, state.runtime?.location]);

  async function useLocation() {
    try {
      const location = await locationProvider.current();
      setState((current) => ({ ...current, runtime: { ...current.runtime, location }, permissions: current.permissions.map((permission) => permission.id === 'location' ? { ...permission, status: 'granted' } : permission) }));
      notify({ tone: 'success', title: 'Standort gesetzt', body: 'Suche nutzt jetzt deine freigegebene Browser-Position.' });
    } catch {
      notify({ tone: 'warning', title: 'Standort fehlt', body: 'Ohne Standort nutze ich nur manuelle Suche und lokale Distanzen. Keine Hintergrund-Ortung.' });
    }
  }

  useEffect(() => { void search('fuel', 'Tankstelle'); }, [search]);

  return (
    <section className="window">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="tiny">Location Core</p><h2 className="text-3xl font-black">Navigation & Orte</h2></div><StatusBadge status={state.runtime?.location ? 'live' : 'permission-missing'} /></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void search()} placeholder="Wohin? z.B. billigste Tankstelle, Apotheke, McDonald’s" />
        <button className="touch-btn text-center" onClick={() => void search()}>Suchen</button>
        <button className="touch-btn text-center" onClick={() => void useLocation()}>Standort nutzen</button>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{navigationCategories.map((item) => <button key={item.id} className={`cyber-btn whitespace-nowrap ${category === item.id ? 'border-blue-200/70 bg-blue-200/20' : ''}`} onClick={() => { setCategory(item.id); setQuery(item.label); void search(item.id, item.label); }}>{item.label}</button>)}</div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{results.map((place) => <article className="card" key={place.id}><div className="flex items-center justify-between gap-3"><p className="tiny">{place.category}</p><StatusBadge status={place.source === 'demo' ? 'local' : place.source} /></div><h3 className="mt-2 text-xl font-black">{place.name}</h3><p className="text-white/62">{place.distanceKm.toFixed(1)} km · ca. {place.travelMinutes} Min · {place.openNow ? 'offen' : 'geschlossen'}</p>{place.category === 'fuel' ? <p className="mt-2 text-sm text-white/48">Tankstellenorte können gefunden werden. Live-Spritpreise sind ohne erlaubte kostenlose Datenquelle nicht verfügbar.</p> : null}<div className="mt-4 flex flex-wrap gap-2"><a className="cyber-btn" href={mapsProvider.openInGoogleMaps(place)} target="_blank" rel="noreferrer">Google Maps</a><a className="cyber-btn" href={mapsProvider.openInAppleMaps(place)} target="_blank" rel="noreferrer">Apple Karten</a><a className="cyber-btn" href={mapsProvider.openInOpenStreetMap(place)} target="_blank" rel="noreferrer">OpenStreetMap</a></div></article>)}</div>
    </section>
  );
}


function WikiModule({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  const [query, setQuery] = useState('Künstliche Intelligenz');
  const [result, setResult] = useState<WikiSummary | undefined>(state.runtime?.wiki);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    const response = await fetch(`/api/wiki?q=${encodeURIComponent(query.trim())}`);
    const data = (await response.json()) as WikiSummary;
    setResult(data);
    setState((current) => ({ ...current, runtime: { ...current.runtime, wiki: data } }));
    setLoading(false);
  }

  return <section className="window"><div className="flex items-start justify-between gap-4"><div><p className="tiny">Knowledge Core</p><h2 className="text-3xl font-black">Wissenssuche</h2></div><StatusBadge status={result?.source ?? 'local'} /></div><div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]"><input className="field" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void search()} placeholder="Wikipedia durchsuchen" /><button className="touch-btn" onClick={() => void search()}>{loading ? 'Suche…' : 'Suchen'}</button></div>{result ? <article className="card mt-5"><h3 className="text-2xl font-black">{result.title}</h3><p className="mt-3 text-white/70">{result.extract}</p><a className="cyber-btn mt-4 inline-block" href={result.url} target="_blank" rel="noreferrer">Quelle öffnen</a></article> : <p className="mt-5 text-white/60">Kostenlose Live-Suche über Wikipedia/Wikimedia.</p>}</section>;
}

function NotesModule({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const notes = state.notes ?? [];
  function createNote() {
    if (!title.trim() && !content.trim()) return;
    const now = new Date().toISOString();
    const note: NoteItem = { id: createId(), title: title.trim() || 'Notiz', content: content.trim(), createdAt: now, updatedAt: now };
    setState((current) => ({ ...current, notes: [note, ...(current.notes ?? [])] }));
    setTitle(''); setContent('');
  }
  const summary = notes.slice(0, 3).map((note) => note.title).join(' · ') || 'Noch keine Notizen.';
  return <section className="window"><p className="tiny">Local Notes</p><h2 className="text-3xl font-black">Notizen</h2><p className="mt-2 text-white/60">AURA Kurzüberblick: {summary}</p><div className="mt-5 grid gap-3"><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titel" /><textarea className="field min-h-32" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Notiz lokal speichern…" /><button className="touch-btn" onClick={createNote}>Notiz speichern</button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{notes.map((note) => <article className="card" key={note.id}><h3 className="text-xl font-black">{note.title}</h3><p className="mt-2 whitespace-pre-wrap text-white/70">{note.content}</p><button className="cyber-btn mt-4" onClick={() => setState((current) => ({ ...current, notes: (current.notes ?? []).filter((item) => item.id !== note.id) }))}>Löschen</button></article>)}</div></section>;
}

function FocusModule({ state, setState, notify }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const focus = state.focus ?? { minutes: 25, active: false };
  const [minutes, setMinutes] = useState(focus.minutes);
  const [taskId, setTaskId] = useState(focus.taskId ?? '');
  const remaining = focus.endsAt ? Math.max(0, Math.ceil((new Date(focus.endsAt).getTime() - Date.now()) / 60000)) : minutes;
  function start() {
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + minutes * 60000);
    setState((current) => ({ ...current, focus: { taskId: taskId || undefined, minutes, startedAt: startedAt.toISOString(), endsAt: endsAt.toISOString(), active: true } }));
    notify({ tone: 'success', title: 'Fokusmodus gestartet', body: `AURA hält ${minutes} Minuten ruhigen Fokus.` });
  }
  function stop() { setState((current) => ({ ...current, focus: { minutes, taskId: undefined, active: false } })); }
  return <section className="window liquid-focus"><p className="tiny">Focus Mode</p><h2 className="text-3xl font-black">Fokusmodus</h2><div className="my-8 text-center"><div className="mx-auto grid h-52 w-52 place-items-center rounded-full border border-blue-200/30 bg-white/[.05] "><div><p className="text-5xl font-black">{remaining}</p><p className="tiny mt-2">Minuten</p></div></div><p className="mt-5 text-white/70">AURA: Eine Aufgabe, ein Zeitfenster, keine Ablenkung.</p></div><div className="grid gap-3 md:grid-cols-[auto_1fr_auto_auto]"><input className="field" type="number" min={5} max={120} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /><select className="field" value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">Freier Fokus</option>{state.tasks.filter((task) => task.status !== 'erledigt').map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><button className="touch-btn" onClick={start}>Start</button><button className="cyber-btn" onClick={stop}>Stop</button></div></section>;
}

function TerminalModule({ state, notify }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const [lines, setLines] = useState<string[]>(['AWS KI Manager Terminal — legal simulation only.', '> help', 'help, status, calendar, tasks, news, permissions, clear, aura, scan-local']);
  const [command, setCommand] = useState('');

  function run() {
    const cmd = command.trim().toLowerCase();
    if (!cmd) return;
    if (cmd === 'clear') { setLines([]); setCommand(''); return; }
    const blocked = /(nmap|exploit|payload|reverse|shell|keylog|steal|credential|password|ddos|bruteforce|scan\s+(?!-local)|metasploit|malware)/.test(cmd);
    const output = blocked
      ? 'BLOCKED: Nur legale Simulation verfügbar. Keine echten Scans, Exploits, Malware, Credential-Aktionen oder Remote-Control.'
      : cmd === 'status' ? 'CPU 31% · RAM 48% · Netzwerk lokal · Security SAFE'
      : cmd === 'calendar' ? `${state.events.length} lokale Termine gefunden.`
      : cmd === 'tasks' ? `${state.tasks.length} lokale Aufgaben gefunden.`
      : cmd === 'news' ? 'Öffne das News-Modul für Live-RSS oder optional verbundene Nachrichtenquellen.'
      : cmd === 'permissions' ? `${state.permissions.filter((item) => item.status === 'granted').length} Rechte granted, ${state.permissions.length} verwaltet.`
      : cmd === 'aura' ? 'AURA Core bereit. Nutze natürliche Sprache im Chat.'
      : cmd === 'scan-local' ? 'Simulierter Selbstcheck: LocalStorage ok, PWA Shell ok, keine Netzwerkziele gescannt.'
      : cmd === 'help' ? 'help, status, calendar, tasks, news, permissions, clear, aura, scan-local'
      : 'Unbekannter Befehl. Gefährliche Aktionen bleiben blockiert.';
    if (blocked) notify({ tone: 'warning', title: 'Terminal blockiert', body: 'AWS KI Manager bleibt eine legale Simulation.' });
    setLines((current) => [...current, `> ${command}`, output]);
    setCommand('');
  }

  return <section className="window font-mono"><p className="tiny">Safe Terminal</p><h2 className="text-3xl font-black">Simuliertes Terminal</h2><div className="mt-5 h-[58vh] overflow-auto rounded-3xl border border-blue-200/15 bg-black/70 p-4 text-blue-100">{lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div><input className="field mt-3 font-mono" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && run()} placeholder="help" /></section>;
}

function FilesModule({ notify }: { notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const [filePreview, setFilePreview] = useState('Keine Datei ausgewählt.');

  async function handleFile(file?: File) {
    if (!file) return;
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const text = await file.text();
      setFilePreview(text.slice(0, 900));
      notify({ tone: 'success', title: 'Datei geladen', body: `${file.name} wurde nach aktivem Klick lokal gelesen.` });
      return;
    }
    setFilePreview(`${file.name} ausgewählt. Vorschau ist nur für aktiv ausgewählte Textdateien verfügbar.`);
  }

  return <section className="window"><p className="tiny">File Consent Zone</p><h2 className="text-3xl font-black">Dateien</h2><p className="mt-3 text-white/70">AWS KI Manager öffnet echte Dateien nur über deinen aktiven Klick. Keine Überwachung, kein automatischer Systemzugriff.</p><input className="mt-5 block w-full rounded-3xl border border-blue-200/20 bg-blue-200/10 p-5" type="file" onChange={(event) => handleFile(event.currentTarget.files?.[0])} /><pre className="mt-5 max-h-80 overflow-auto whitespace-pre-wrap rounded-3xl bg-black/50 p-4 text-sm text-white/70">{filePreview}</pre></section>;
}

function SystemModule({ state }: { state: AppState }) {
  const granted = state.permissions.filter((permission) => permission.status === 'granted').length;
  const metrics = [
    ['CPU', '31%', 'Lokale Anzeige'], ['RAM', '48%', 'Lokale Anzeige'], ['Netzwerk', 'lokal', 'Keine echten Scans'], ['Akku', 'optional', 'Battery API/native später'], ['Sicherheit', 'SAFE', 'Blocklist aktiv'], ['KI', 'Lokaler Provider', 'OpenAIProvider vorbereitet'], ['Kalender', 'Lokaler Provider', 'Google/Microsoft vorbereitet'], ['Berechtigungen', `${granted}/${state.permissions.length}`, 'transparent'],
  ];
  return <section className="window"><p className="tiny">System Monitor</p><h2 className="text-3xl font-black">Systemstatus</h2><div className="mt-6 grid gap-3 md:grid-cols-2">{metrics.map(([name, value, detail]) => <article className="card" key={name}><p className="tiny">{name}</p><h3 className="mt-2 text-2xl font-black text-white">{value}</h3><p className="text-sm text-white/55">{detail}</p></article>)}</div></section>;
}

function TopBar({ state, setState, openPalette, openSettings }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; openPalette: () => void; openSettings: () => void }) {
  const topLinks = navItems.filter((item) => ['today', 'assistant', 'news', 'weather', 'navigation', 'tasks', 'wiki', 'files'].includes(item.id));
  return (
    <header className="top-shell sticky top-3 z-40 mx-auto flex max-w-7xl items-center gap-3 px-3 py-2">
      <button className="flex items-center gap-3 rounded-full px-2 py-1" onClick={() => setState((current) => ({ ...current, activeModule: 'today' }))}>
        <span className="grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/[.04] text-sm font-black">AWS</span>
        <span className="hidden text-sm font-semibold text-white/90 sm:block">AWS KI Manager</span>
      </button>
      <nav className="no-scrollbar hidden flex-1 items-center justify-center gap-1 overflow-x-auto lg:flex">
        {topLinks.map((item) => <button key={item.id} className={`nav-link ${state.activeModule === item.id ? 'nav-link-active' : ''}`} onClick={() => setState((current) => ({ ...current, activeModule: item.id }))}>{item.label}</button>)}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <button className="nav-action hidden sm:block" onClick={openPalette}>⌘K Suche</button>
        <span className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/60 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-300" />Live/Lokal</span>
        <button className="nav-action" onClick={openSettings}>⚙</button>
        <button className="nav-action" onClick={() => setState((current) => ({ ...current, session: false }))}>{state.user?.initials}</button>
      </div>
    </header>
  );
}

function DesktopSidebar({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  return <aside className="hidden" aria-hidden="true" />;
}

function MobileBottomNav({ state, setState, openSettings }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; openSettings: () => void }) {
  const dockItems = navItems.filter((item) => ['today', 'assistant', 'news', 'weather', 'navigation', 'tasks', 'wiki', 'files', 'focus'].includes(item.id));
  return <nav className="quick-dock fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto p-2">{dockItems.map((item) => <button key={item.id} className={`dock-item ${state.activeModule === item.id ? 'dock-item-active' : ''}`} onClick={() => setState((current) => ({ ...current, activeModule: item.id }))}><span className="text-lg">{item.icon}</span><span className="hidden text-[11px] md:block">{item.label}</span></button>)}<button className="dock-item" onClick={openSettings}><span className="text-lg">⚙</span><span className="hidden text-[11px] md:block">Einstellungen</span></button></nav>;
}

function SettingsDrawer({ state, setState, close, notify }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; close: () => void; notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const settings = state.settings ?? initialState().settings!;
  const update = (patch: Partial<typeof settings>) => setState((current) => ({ ...current, settings: { ...(current.settings ?? settings), ...patch } }));
  const writeProvider = (id: string, status: ProviderStatus, detail: string) => setState((current) => ({
    ...current,
    providerStatus: (() => {
      const providers = current.providerStatus ?? defaultProviderStatus();
      const usage = getProviderUsage(current, id);
      const nextUsed = status === 'limit-reached' ? usage.usedToday : Math.min(usage.usedToday + 1, usage.limit || usage.usedToday + 1);
      return { ...providers, [id]: { ...providers[id], status, detail, usedToday: nextUsed, resetAt: usage.resetAt, lastChecked: new Date().toISOString(), updatedAt: new Date().toISOString(), error: status === 'unavailable' || status === 'blocked' ? detail : undefined } };
    })(),
    providerUsage: (() => {
      const usage = getProviderUsage(current, id);
      return { ...(current.providerUsage ?? defaultProviderUsage()), [id]: { id, usedToday: status === 'limit-reached' ? usage.usedToday : Math.min(usage.usedToday + 1, usage.limit || usage.usedToday + 1), resetAt: usage.resetAt } };
    })(),
  }));
  async function testLiveProviders() {
    const tests: Array<[string, string]> = [['weather', `/api/weather?city=${encodeURIComponent(settings.defaultCity)}`], ['wiki', '/api/wiki?q=AWS%20KI%20Manager'], ['places', '/api/places?category=fuel'], ['news', '/api/news?category=Deutschland']];
    for (const [id, url] of tests) {
      try {
        const response = await fetch(url);
        writeProvider(id, response.ok ? 'live' : 'unavailable', response.ok ? 'Provider-Test erfolgreich.' : 'Provider aktuell nicht live erreichbar.');
      } catch {
        writeProvider(id, 'unavailable', 'Provider aktuell nicht erreichbar.');
      }
    }
    writeProvider('navigation', 'local', 'Maps-Links sind ohne API-Key verfügbar.');
    writeProvider('fuel', 'optional-key-needed', 'Tankstellen-Ortssuche ist kostenlos; echte Spritpreise brauchen eine erlaubte Datenquelle.');
    notify({ tone: 'success', title: 'Provider getestet', body: 'Kostenlose Live-Provider wurden geprüft und gespeichert.' });
  }
  function rerunSetup() {
    setState((current) => ({ ...current, activeModule: 'setup', setupStep: 0 }));
    close();
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'aws-ki-manager-export.json'; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" onClick={close}><aside className="settings-drawer ml-auto h-full w-full max-w-md overflow-auto p-5" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="tiny">Preferences</p><h2 className="text-2xl font-black">Einstellungen</h2></div><button className="nav-action" onClick={close}>✕</button></div><div className="mt-6 grid gap-4"><SettingsGroup title="Setup & Provider"><button className="touch-btn" onClick={rerunSetup}>Setup erneut ausführen</button><button className="cyber-btn" onClick={() => void testLiveProviders()}>Live-Provider testen</button><button className="cyber-btn" onClick={() => { setState((current) => ({ ...current, activeModule: 'permissions' })); close(); }}>Berechtigungen erneut prüfen</button><details className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><summary className="cursor-pointer font-black">Provider-Status anzeigen</summary><div className="mt-3"><ConnectionCenter state={state} /></div></details><p className="text-sm text-white/45">Optionale API-Keys bleiben serverseitig in .env.local: NEWS_API_KEY, OPENAI_API_KEY, OPTIONAL_GOOGLE_MAPS_API_KEY, FUEL_API_KEY. Der kostenlose Modus benötigt keine Keys.</p></SettingsGroup><SettingsGroup title="Darstellung"><Select label="Theme" value={settings.theme} options={['dark', 'light', 'system']} onChange={(value) => update({ theme: value as typeof settings.theme })} /><Select label="Accent" value={settings.accent} options={['cyan', 'blue', 'green', 'white']} onChange={(value) => update({ accent: value as typeof settings.accent })} /><Select label="Dichte" value={settings.density} options={['comfort', 'compact']} onChange={(value) => update({ density: value as typeof settings.density })} /><Toggle label="Reduzierte Bewegung" value={settings.reducedMotion} onChange={(value) => update({ reducedMotion: value })} /></SettingsGroup><SettingsGroup title="AURA"><Select label="Antwortstil" value={settings.auraStyle} options={['kurz', 'normal', 'detailliert']} onChange={(value) => update({ auraStyle: value as typeof settings.auraStyle })} /><Toggle label="Live-Quellen bevorzugen" value={settings.preferLiveSources} onChange={(value) => update({ preferLiveSources: value })} /><Toggle label="Kostenlosen Modus erzwingen" value={settings.forceFreeMode} onChange={(value) => update({ forceFreeMode: value })} /><Toggle label="Stimme aktivieren" value={settings.voiceEnabled} onChange={(value) => update({ voiceEnabled: value })} /><Toggle label="Antworten vorlesen" value={settings.readAnswers} onChange={(value) => update({ readAnswers: value })} /><Select label="Wake Word" value={settings.wakeWord} options={['AURA', 'Jarvis']} onChange={(value) => update({ wakeWord: value as typeof settings.wakeWord })} /></SettingsGroup><SettingsGroup title="Daten & Datenschutz"><button className="touch-btn" onClick={exportJson}>Export JSON</button><button className="cyber-btn" onClick={() => { store.clear(); notify({ tone: 'warning', title: 'Lokale Daten gelöscht', body: 'Bitte Seite neu laden.' }); }}>Lokale Daten löschen</button><button className="cyber-btn" onClick={() => setState((current) => ({ ...current, session: false }))}>Session zurücksetzen</button></SettingsGroup><SettingsGroup title="Wetter & Navigation"><input className="field" value={settings.defaultCity} onChange={(event) => update({ defaultCity: event.target.value })} placeholder="Standardort" /><Select label="Karten-App" value={settings.defaultMaps} options={['google', 'apple', 'osm']} onChange={(value) => update({ defaultMaps: value as typeof settings.defaultMaps })} /></SettingsGroup><SettingsGroup title="Module"><Toggle label="Quick Dock anzeigen" value={settings.quickDock} onChange={(value) => update({ quickDock: value })} /><p className="text-sm text-white/45">Reihenfolge und Modul-Sichtbarkeit sind vorbereitet und bleiben lokal.</p></SettingsGroup></div></aside></div>;
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card"><h3 className="mb-3 text-lg font-black">{title}</h3><div className="grid gap-3">{children}</div></section>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="grid gap-2 text-sm text-white/60">{label}<select className="field" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-sm text-white/70"><span>{label}</span><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /></label>; }

function PwaInstallHint({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  if (state.pwaInstallDismissed) return null;
  return <div className="mb-4 rounded-3xl border border-blue-200/20 bg-blue-200/10 p-4 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><b>PWA-Install-Hinweis</b><p className="text-sm text-white/70">Installiere AWS KI Manager über „Zum Home-Bildschirm hinzufügen“ oder das Browser-Installationssymbol.</p></div><button className="cyber-btn" onClick={() => setState((current) => ({ ...current, pwaInstallDismissed: true }))}>Verstanden</button></div></div>;
}

function AuraOrb({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  const classes = size === 'large' ? 'h-56 w-56 md:h-72 md:w-72' : 'h-28 w-28';
  return <div className={`relative mx-auto grid ${classes} place-items-center`}><div className="aura-core absolute inset-0 rounded-full animate-pulseGlow" /><div className="absolute inset-4 rounded-full border-2 border-dashed border-blue-100/45 animate-spin [animation-duration:16s]" /><div className="absolute inset-9 rounded-full border border-blue-100/40 animate-spin [animation-direction:reverse] [animation-duration:8s]" /><div className="relative text-center"><b className={size === 'large' ? 'text-4xl' : 'text-xl'}>AURA</b><p className="tiny mt-1">CORE</p></div></div>;
  return <div className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-50"><div className="flex flex-wrap items-center justify-between gap-3"><div><b>PWA-Install-Hinweis</b><p className="text-sm text-cyan-50/70">Installiere AWS KI Manager über „Zum Home-Bildschirm hinzufügen“ oder das Browser-Installationssymbol.</p></div><button className="cyber-btn" onClick={() => setState((current) => ({ ...current, pwaInstallDismissed: true }))}>Verstanden</button></div></div>;
}

function JarvisOrb({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  const classes = size === 'large' ? 'h-56 w-56 md:h-72 md:w-72' : 'h-28 w-28';
  return <div className={`relative mx-auto grid ${classes} place-items-center`}><div className="jarvis-core absolute inset-0 rounded-full animate-pulseGlow" /><div className="absolute inset-4 rounded-full border-2 border-dashed border-green-200/45 animate-spin [animation-duration:16s]" /><div className="absolute inset-9 rounded-full border border-cyan-200/40 animate-spin [animation-direction:reverse] [animation-duration:8s]" /><div className="relative text-center"><b className={size === 'large' ? 'text-4xl' : 'text-xl'}>AURA</b><p className="tiny mt-1">CORE</p></div></div>;
}


function StatusBadge({ status }: { status: SourceStatus }) {
  const copy: Record<SourceStatus, string> = {
    live: 'Live',
    local: 'Lokal',
    demo: 'Nicht verbunden',
    'api-missing': 'Optional',
    'permission-missing': 'Freigabe fehlt',
    offline: 'Offline',
  };
  const tone = status === 'live' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-50' : status === 'local' ? 'border-white/18 bg-white/[.05] text-white' : status === 'permission-missing' ? 'border-yellow-300/25 bg-yellow-300/10 text-yellow-50' : 'border-zinc-300/20 bg-white/[.04] text-zinc-100';
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[.16em] ${tone}`}>{copy[status]}</span>;
}

function detectDateHint(input: string): 'today' | 'yesterday' | 'week' {
  const text = input.toLowerCase();
  if (text.includes('gestern')) return 'yesterday';
  if (text.includes('woche')) return 'week';
  return 'today';
}

function Toast({ toast }: { toast: ToastMessage }) {
  const tone = toast.tone === 'success' ? 'border-blue-200/40 bg-blue-200/15' : toast.tone === 'warning' ? 'border-yellow-300/40 bg-yellow-300/15' : 'border-blue-200/40 bg-blue-200/15';
  return <div className={`fixed right-4 top-4 z-50 max-w-sm rounded-3xl border p-4 shadow-hard backdrop-blur-2xl ${tone}`}><b>{toast.title}</b><p className="text-sm text-white/75">{toast.body}</p></div>;
}

function upcomingEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}
