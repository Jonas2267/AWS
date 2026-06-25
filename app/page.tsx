'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { executeCommand, parseUserCommand, returnAssistantResponse } from '@/lib/commands/commands';
import { newsCategories, demoNews, summarizeNews } from '@/lib/news/news';
import { BrowserNotificationProvider, registerServiceWorker } from '@/lib/notifications/notifications';
import { defaultPermissions } from '@/lib/permissions/permissions';
import { buildReminders, demoEvents, demoTasks, exampleCommands, initialMessages } from '@/lib/storage/demoData';
import { createId, hashPassword, LocalStorageProvider } from '@/lib/storage/localStorageProvider';
import type { AppState, CalendarEvent, ModuleId, TaskItem, ToastMessage } from '@/lib/storage/types';

const store = new LocalStorageProvider<AppState>('awsHack.state.v2');
const notifier = new BrowserNotificationProvider();
const setupSteps = ['Konto', 'Benachrichtigungen', 'Kalender', 'News', 'Dateien', 'Mikrofon', 'PWA', 'Fertig'];
const navItems: Array<{ id: ModuleId; label: string; icon: string }> = [
  { id: 'assistant', label: 'AURA', icon: '◉' },
  { id: 'dashboard', label: 'OS', icon: '⌂' },
  { id: 'calendar', label: 'Kalender', icon: '◇' },
  { id: 'tasks', label: 'Tasks', icon: '✓' },
  { id: 'permissions', label: 'Rechte', icon: '⛨' },
  { id: 'news', label: 'News', icon: '⌁' },
  { id: 'terminal', label: 'Terminal', icon: '>' },
  { id: 'files', label: 'Dateien', icon: '▣' },
  { id: 'system', label: 'System', icon: '▤' },
];

const initialState = (): AppState => ({
  user: null,
  session: false,
  events: demoEvents,
  tasks: demoTasks,
  permissions: defaultPermissions,
  messages: initialMessages(),
  reminders: buildReminders(demoEvents),
  activeModule: 'assistant',
  booted: false,
  setupStep: 0,
  pwaInstallDismissed: false,
});

export default function Page() {
  const [state, setRawState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

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
    setRawState(saved ?? initialState());
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
    if (!state.session) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const due = state.reminders.find((reminder) => !reminder.delivered && new Date(reminder.dueAt).getTime() <= now);
      if (!due) return;

      notifier.send('AWS Hack Reminder', `${due.title} startet in ${due.minutesBefore} Minuten.`).then((channel) => {
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
    <main className="min-h-screen p-3 pb-28 md:p-5">
      <div className="mx-auto flex max-w-7xl gap-4">
        <DesktopSidebar state={state} setState={setState} />
        <section className="min-w-0 flex-1">
          <TopBar state={state} setState={setState} />
          <PwaInstallHint state={state} setState={setState} />
          <ModuleRouter state={state} setState={setState} notify={notifyInApp} />
        </section>
      </div>
      <MobileBottomNav state={state} setState={setState} />
      {toast ? <Toast toast={toast} /> : null}
    </main>
  );
}

function AuthScreen({ state, setState, notify }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const [mode, setMode] = useState(state.user ? 'login' : 'create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Lokale Demo-Auth. Produktion benötigt Backend/Auth und sichere Sessions.');

  async function submit() {
    if (!username.trim() || password.length < 4) {
      setMessage('Bitte Benutzername und ein Demo-Passwort mit mindestens 4 Zeichen eingeben.');
      return;
    }

    if (mode === 'create') {
      const user = {
        username: username.trim(),
        passwordHash: await hashPassword(password),
        initials: username.trim().slice(0, 2).toUpperCase(),
        createdAt: new Date().toISOString(),
        setupCompleted: false,
      };
      setState((current) => ({ ...current, user, session: false, setupStep: 1 }));
      setMode('login');
      setMessage('Account lokal erstellt. Bitte einloggen, danach startet der Setup-Assistent.');
      notify({ tone: 'success', title: 'Account erstellt', body: 'Deine Daten bleiben lokal im Browser-Demo-Speicher.' });
      return;
    }

    const ok = state.user?.username === username.trim() && state.user.passwordHash === (await hashPassword(password));
    if (!ok) {
      setMessage('Login fehlgeschlagen. Passwort wird nicht angezeigt und nicht im UI ausgegeben.');
      return;
    }

    setState((current) => ({ ...current, session: true, booted: false, activeModule: current.user?.setupCompleted ? 'assistant' : 'setup' }));
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="window grid w-full max-w-6xl gap-8 overflow-hidden md:grid-cols-[1.08fr_.92fr]">
        <div className="relative rounded-[2rem] border border-green-300/15 bg-green-300/[.06] p-6 md:p-8">
          <p className="tiny">Artificial Workstation System Hack</p>
          <h1 className="mt-4 text-5xl font-black leading-none text-green-50 md:text-7xl">AWS Hack</h1>
          <p className="mt-5 max-w-xl text-green-100/75">
            Dein legales Jarvis-Cyber-OS für eigenes Handy und eigenen PC. Alles, was nach Hack aussieht, ist UI, Simulation oder freigegebene lokale Automation.
          </p>
          <div className="mt-8"><JarvisOrb size="large" /></div>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <p className="tiny">{mode === 'create' ? 'Erster Start' : 'Secure Login'}</p>
          <h2 className="text-3xl font-black">{mode === 'create' ? 'Lokalen Account erstellen' : 'Einloggen'}</h2>
          <input className="field" autoComplete="username" placeholder="Benutzername" value={username} onChange={(event) => setUsername(event.target.value)} />
          <input className="field" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} type="password" placeholder="Passwort" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} />
          <button className="touch-btn text-center" onClick={submit}>{mode === 'create' ? 'Account erstellen' : 'Login'}</button>
          {state.user ? <button className="cyber-btn" onClick={() => setMode(mode === 'create' ? 'login' : 'create')}>{mode === 'create' ? 'Zum Login' : 'Neuen lokalen Account anlegen'}</button> : null}
          <p className="text-sm text-green-100/65">{message}</p>
        </div>
      </section>
    </main>
  );
}

function BootScreen({ username }: { username: string }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="text-center animate-boot">
        <JarvisOrb size="large" />
        <p className="tiny mt-8">Boot sequence · Safe Simulation Kernel</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">Willkommen, {username}</h1>
        <div className="mx-auto mt-6 h-2 w-72 overflow-hidden rounded-full bg-green-300/10">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-green-300 shadow-glow" />
        </div>
        <p className="mt-4 text-green-100/60">AURA Core · Permissions · Reminder · PWA Shell</p>
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
      await notifier.send('AWS Hack Test', 'AURA Core Benachrichtigungen sind aktiv.');
    }
    notify({ tone: result === 'granted' ? 'success' : 'warning', title: 'Notifications', body: result === 'granted' ? 'Test-Benachrichtigung gesendet.' : 'Ich nutze In-App-Reminder als Fallback.' });
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
    case 'dashboard': return <Dashboard {...common} />;
    case 'calendar': return <CalendarModule {...common} />;
    case 'tasks': return <TasksModule {...common} />;
    case 'news': return <NewsModule />;
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

  function send(text = input) {
    if (!text.trim()) return;
    const parsed = parseUserCommand(text);
    const result = executeCommand(parsed, {
      events: state.events,
      tasks: state.tasks,
      permissions: state.permissions,
      open: openModule,
      addEvent,
      addTask,
      requestNotifications,
    });

    setState((current) => ({
      ...current,
      messages: [
        ...current.messages,
        { id: createId(), role: 'user', content: text, time: new Date().toISOString() },
        { id: createId(), role: 'assistant', content: returnAssistantResponse(result), time: new Date().toISOString(), suggestions: exampleCommands.slice(0, 3) },
      ],
    }));
    setInput('');
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="window flex min-h-[72vh] flex-col">
        <div className="flex items-center gap-4">
          <JarvisOrb />
          <div>
            <p className="tiny">Main Interface</p>
            <h2 className="text-3xl font-black">AURA Core</h2>
            <p className="text-sm text-green-100/60">Natürliche deutsche Befehle · lokale Demo-Aktionen · sichere Rückfragen</p>
          </div>
        </div>
        <div className="no-scrollbar mt-4 flex-1 space-y-3 overflow-auto rounded-3xl border border-green-300/10 bg-black/25 p-3">
          {state.messages.map((message) => (
            <div key={message.id} className={`max-w-[92%] rounded-3xl p-4 ${message.role === 'assistant' ? 'bg-green-300/10' : 'ml-auto bg-cyan-300/10'}`}>
              <p>{message.content}</p>
              {message.suggestions?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.suggestions.map((suggestion) => <button className="rounded-full border border-green-300/20 px-3 py-2 text-xs text-green-100/70" key={suggestion} onClick={() => send(suggestion)}>{suggestion}</button>)}</div> : null}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input className="field" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder="z.B. Erstelle morgen um 8 Uhr einen Termin Schule" />
          <button className="touch-btn text-center" onClick={() => send()}>Senden</button>
          <button className="touch-btn text-center" title="Mikrofon vorbereitet" onClick={() => openModule('permissions')}>🎙</button>
        </div>
      </div>
      <div className="grid gap-4">
        <QuickCards state={state} openModule={openModule} />
        <ReminderPanel state={state} />
      </div>
    </section>
  );
}

function SetupWizard({ state, setState, requestNotifications, notify, openModule }: ModuleProps) {
  const step = Math.min(state.setupStep, setupSteps.length - 1);
  const current = setupSteps[step];

  async function next() {
    if (current === 'Benachrichtigungen') await requestNotifications();
    if (current === 'Fertig') {
      setState((stored) => ({ ...stored, user: stored.user ? { ...stored.user, setupCompleted: true } : stored.user, activeModule: 'assistant' }));
      notify({ tone: 'success', title: 'Setup abgeschlossen', body: 'AURA Core ist jetzt dein Hauptscreen.' });
      return;
    }
    setState((stored) => ({ ...stored, setupStep: Math.min(stored.setupStep + 1, setupSteps.length - 1) }));
  }

  return (
    <section className="window mx-auto max-w-4xl">
      <p className="tiny">AWS Hack einrichten</p>
      <h2 className="mt-2 text-4xl font-black">{current}</h2>
      <div className="mt-6 grid grid-cols-4 gap-2 md:grid-cols-8">
        {setupSteps.map((label, index) => <div key={label} className={`h-2 rounded-full ${index <= step ? 'bg-green-300 shadow-glow' : 'bg-green-300/10'}`} />)}
      </div>
      <div className="mt-8 rounded-3xl border border-green-300/15 bg-black/30 p-5 text-green-100/80">
        {current === 'Konto' && <p>Dein lokaler Demo-Account ist erstellt. Für Produktion wäre Backend-Auth mit sicheren Sessions nötig.</p>}
        {current === 'Benachrichtigungen' && <p>Aktiviere Browser-Benachrichtigungen für Termin-Reminder. Wenn du ablehnst, nutzt AWS Hack In-App-Hinweise.</p>}
        {current === 'Kalender' && <p>Der lokale Demo-Kalender ist aktiv. Google Calendar und Microsoft Graph sind als Provider vorbereitet, brauchen später OAuth.</p>}
        {current === 'News' && <p>Demo-News sind aktiv. Ein echter NewsApiProvider ist vorbereitet, API-Keys gehören serverseitig geschützt.</p>}
        {current === 'Dateien' && <p>Dateien werden ausschließlich über deinen aktiven File-Picker-Klick geöffnet. Keine heimliche Dateiüberwachung.</p>}
        {current === 'Mikrofon' && <p>Der Sprachbutton ist vorbereitet. Echtes Mikrofon wird erst nach Klick und OS-Dialog verwendet.</p>}
        {current === 'PWA' && <p>Installiere AWS Hack über das Browser-Menü als PWA auf Handy oder PC. Die App bleibt responsive und offline-vorbereitet.</p>}
        {current === 'Fertig' && <p>Setup abgeschlossen. Das Dashboard öffnet AURA Core als mobile Hauptansicht.</p>}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="touch-btn" onClick={next}>{current === 'Fertig' ? 'Dashboard öffnen' : 'Weiter'}</button>
        <button className="cyber-btn" onClick={() => openModule('assistant')}>Später fortsetzen</button>
      </div>
    </section>
  );
}

function Dashboard({ state, openModule, requestNotifications }: ModuleProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
      <div className="window">
        <p className="tiny">Cyber OS Dashboard</p>
        <h2 className="mt-2 text-4xl font-black">Willkommen, {state.user?.username}</h2>
        <p className="mt-2 text-green-100/65">AURA Core ist als mobiler Hauptscreen optimiert. Desktop zeigt OS-Fenster, Status und Schnellaktionen.</p>
        <div className="my-6"><JarvisOrb size="large" /></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ['KI fragen', 'assistant'], ['Kalender öffnen', 'calendar'], ['Termin erstellen', 'calendar'], ['Aufgabe erstellen', 'tasks'], ['News zusammenfassen', 'news'], ['Berechtigungen', 'permissions'], ['Terminal öffnen', 'terminal'], ['Systemstatus', 'system'], ['Setup', 'setup'],
          ].map(([label, module]) => <button key={label} className="touch-btn" onClick={() => openModule(module as ModuleId)}>{label}</button>)}
        </div>
      </div>
      <div className="grid gap-4">
        <QuickCards state={state} openModule={openModule} />
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
    </div>
  );
}

function ReminderPanel({ state }: { state: AppState }) {
  const reminders = state.reminders.filter((reminder) => !reminder.delivered).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4);
  return (
    <div className="window">
      <p className="tiny">Termin-Reminder</p>
      <h3 className="mt-1 text-xl font-black">Anstehende Hinweise</h3>
      {reminders.length ? reminders.map((reminder) => <div key={reminder.id} className="mt-3 rounded-2xl border border-green-300/15 bg-green-300/10 p-3"><b>{reminder.title}</b><p className="text-sm text-green-100/65">{new Date(reminder.dueAt).toLocaleString('de-DE')} · {reminder.minutesBefore} Min vorher</p></div>) : <p className="mt-3 text-green-100/60">Keine offenen Reminder.</p>}
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
        <p className="rounded-full border border-green-300/20 px-4 py-2 text-sm text-green-100/65">Provider: LocalDemoProvider</p>
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
        {events.map((event) => <article key={event.id} className="card"><p className="tiny">{event.provider}</p><h3 className="mt-2 text-xl font-black">{event.title}</h3><p className="text-green-100/70">{event.date} · {event.time}</p><p className="text-sm text-green-100/55">Reminder {event.reminderMinutes} Minuten vorher</p><button className="cyber-btn mt-4" onClick={() => setState((current) => ({ ...current, events: current.events.filter((item) => item.id !== event.id), reminders: current.reminders.filter((reminder) => reminder.eventId !== event.id) }))}>Löschen</button></article>)}
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
        {state.tasks.map((task) => <article key={task.id} className="card"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{task.title}</h3><p className="text-green-100/60">{task.priority} · {task.status}</p></div><button className="cyber-btn" onClick={() => setState((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status: item.status === 'erledigt' ? 'offen' : 'erledigt' } : item) }))}>✓</button></div></article>)}
      </div>
    </section>
  );
}

function NewsModule() {
  const [category, setCategory] = useState('Alle');
  const [query, setQuery] = useState('');
  const filtered = demoNews.filter((item) => (category === 'Alle' || item.category === category) && `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="window">
      <p className="tiny">News Feed</p><h2 className="text-3xl font-black">Nachrichten</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-[auto_1fr]"><select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>{newsCategories.map((item) => <option key={item}>{item}</option>)}</select><input className="field" placeholder="News suchen" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="my-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-50">{summarizeNews(filtered)}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <article className="card" key={item.id}><p className="tiny">{item.category}</p><h3 className="mt-2 text-xl font-black">{item.title}</h3><p className="mt-2 text-green-100/65">{item.summary}</p><p className="mt-3 text-xs text-green-100/45">{item.source}</p></article>)}</div>
    </section>
  );
}

function PermissionCenter({ state, setState, requestNotifications }: ModuleProps) {
  function updatePermission(id: string, status: AppState['permissions'][number]['status']) {
    setState((current) => ({ ...current, permissions: current.permissions.map((permission) => permission.id === id ? { ...permission, status } : permission) }));
  }

  async function setupRecommended() {
    for (const permission of state.permissions.filter((item) => item.recommended)) {
      if (permission.id === 'notifications') await requestNotifications();
      else updatePermission(permission.id, 'requested');
    }
  }

  return (
    <section className="window">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="tiny">Transparent Permission Layer</p><h2 className="text-3xl font-black">Permission Center</h2></div><button className="touch-btn" onClick={setupRecommended}>Alle empfohlenen einrichten</button></div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">{state.permissions.map((permission) => <article key={permission.id} className="card"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">{permission.name}</h3><span className="rounded-full border border-green-300/20 px-3 py-1 text-xs">{permission.status}</span></div><p className="mt-2 text-green-100/70">{permission.description}</p><p className="mt-2 text-sm text-green-100/45">{permission.technical}</p><div className="mt-4 flex flex-wrap gap-2"><button className="cyber-btn" onClick={() => permission.id === 'notifications' ? requestNotifications() : updatePermission(permission.id, 'requested')}>Freigeben</button><button className="cyber-btn" onClick={() => updatePermission(permission.id, 'demo')}>Demo</button><button className="cyber-btn" onClick={() => updatePermission(permission.id, 'disconnected')}>Trennen</button></div></article>)}</div>
    </section>
  );
}

function TerminalModule({ state, notify }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void; notify: (message: Omit<ToastMessage, 'id'>) => void }) {
  const [lines, setLines] = useState<string[]>(['AWS Hack Terminal — legal simulation only.', '> help', 'help, status, calendar, tasks, news, permissions, clear, aura, scan-local']);
  const [command, setCommand] = useState('');

  function run() {
    const cmd = command.trim().toLowerCase();
    if (!cmd) return;
    if (cmd === 'clear') { setLines([]); setCommand(''); return; }
    const blocked = /(nmap|exploit|payload|reverse|shell|keylog|steal|credential|password|ddos|bruteforce|scan\s+(?!-local)|metasploit|malware)/.test(cmd);
    const output = blocked
      ? 'BLOCKED: Nur legale Simulation verfügbar. Keine echten Scans, Exploits, Malware, Credential-Aktionen oder Remote-Control.'
      : cmd === 'status' ? 'CPU 31% · RAM 48% · Netzwerk Demo · Security SAFE'
      : cmd === 'calendar' ? `${state.events.length} lokale Termine gefunden.`
      : cmd === 'tasks' ? `${state.tasks.length} lokale Aufgaben gefunden.`
      : cmd === 'news' ? summarizeNews(demoNews)
      : cmd === 'permissions' ? `${state.permissions.filter((item) => item.status === 'granted').length} Rechte granted, ${state.permissions.length} verwaltet.`
      : cmd === 'aura' ? 'AURA Core bereit. Nutze natürliche Sprache im Chat.'
      : cmd === 'scan-local' ? 'Simulierter Selbstcheck: LocalStorage ok, PWA Shell ok, keine Netzwerkziele gescannt.'
      : cmd === 'help' ? 'help, status, calendar, tasks, news, permissions, clear, aura, scan-local'
      : 'Unbekannter Demo-Befehl. Gefährliche Befehle bleiben blockiert.';
    if (blocked) notify({ tone: 'warning', title: 'Terminal blockiert', body: 'AWS Hack bleibt eine legale Simulation.' });
    setLines((current) => [...current, `> ${command}`, output]);
    setCommand('');
  }

  return <section className="window font-mono"><p className="tiny">Safe Terminal</p><h2 className="text-3xl font-black">Simuliertes Terminal</h2><div className="mt-5 h-[58vh] overflow-auto rounded-3xl border border-green-300/15 bg-black/70 p-4 text-green-200">{lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div><input className="field mt-3 font-mono" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && run()} placeholder="help" /></section>;
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
    setFilePreview(`${file.name} ausgewählt. Vorschau nur für Textdateien im Demo-Modus.`);
  }

  return <section className="window"><p className="tiny">File Consent Zone</p><h2 className="text-3xl font-black">Dateien</h2><p className="mt-3 text-green-100/70">AWS Hack öffnet echte Dateien nur über deinen aktiven Klick. Keine Überwachung, kein automatischer Systemzugriff.</p><input className="mt-5 block w-full rounded-3xl border border-green-300/20 bg-green-300/10 p-5" type="file" onChange={(event) => handleFile(event.currentTarget.files?.[0])} /><pre className="mt-5 max-h-80 overflow-auto whitespace-pre-wrap rounded-3xl bg-black/50 p-4 text-sm text-green-100/70">{filePreview}</pre></section>;
}

function SystemModule({ state }: { state: AppState }) {
  const granted = state.permissions.filter((permission) => permission.status === 'granted').length;
  const metrics = [
    ['CPU', '31%', 'Demo-Metrik'], ['RAM', '48%', 'Demo-Metrik'], ['Netzwerk', 'lokal', 'Keine echten Scans'], ['Akku', 'optional', 'Battery API/native später'], ['Sicherheit', 'SAFE', 'Blocklist aktiv'], ['KI', 'LocalDemoProvider', 'OpenAIProvider vorbereitet'], ['Kalender', 'LocalDemoProvider', 'Google/Microsoft vorbereitet'], ['Berechtigungen', `${granted}/${state.permissions.length}`, 'transparent'],
  ];
  return <section className="window"><p className="tiny">System Monitor</p><h2 className="text-3xl font-black">Systemstatus</h2><div className="mt-6 grid gap-3 md:grid-cols-2">{metrics.map(([name, value, detail]) => <article className="card" key={name}><p className="tiny">{name}</p><h3 className="mt-2 text-2xl font-black text-green-100">{value}</h3><p className="text-sm text-green-100/55">{detail}</p></article>)}</div></section>;
}

function TopBar({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  return <header className="window mb-4 flex items-center justify-between gap-3"><div><p className="tiny">AWS Hack OS</p><p className="font-semibold">{new Date().toLocaleString('de-DE')}</p></div><button className="cyber-btn" onClick={() => setState((current) => ({ ...current, session: false }))}>Logout · {state.user?.initials}</button></header>;
}

function DesktopSidebar({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  return <aside className="window sticky top-5 hidden h-[calc(100vh-2.5rem)] w-72 shrink-0 overflow-auto md:block"><p className="tiny">AWS Hack</p><h1 className="mt-2 text-3xl font-black">Cyber OS</h1><div className="my-6"><JarvisOrb /></div><nav className="grid gap-2">{navItems.map((item) => <button key={item.id} className={`touch-btn ${state.activeModule === item.id ? 'border-green-300/70 bg-green-300/20 shadow-glow' : ''}`} onClick={() => setState((current) => ({ ...current, activeModule: item.id }))}><span className="mr-2">{item.icon}</span>{item.label}</button>)}</nav></aside>;
}

function MobileBottomNav({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  const mobileItems = navItems.slice(0, 5);
  return <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-2 rounded-[2rem] border border-green-300/15 bg-black/80 p-2 shadow-hard backdrop-blur-2xl md:hidden">{mobileItems.map((item) => <button key={item.id} className={`min-h-16 rounded-3xl px-1 text-xs font-bold ${state.activeModule === item.id ? 'bg-green-300/25 text-green-50 shadow-glow' : 'bg-green-300/10 text-green-100/70'}`} onClick={() => setState((current) => ({ ...current, activeModule: item.id }))}><span className="block text-lg">{item.icon}</span>{item.label}</button>)}</nav>;
}

function PwaInstallHint({ state, setState }: { state: AppState; setState: (next: AppState | ((current: AppState) => AppState)) => void }) {
  if (state.pwaInstallDismissed) return null;
  return <div className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-50"><div className="flex flex-wrap items-center justify-between gap-3"><div><b>PWA-Install-Hinweis</b><p className="text-sm text-cyan-50/70">Installiere AWS Hack über „Zum Home-Bildschirm hinzufügen“ oder das Browser-Installationssymbol.</p></div><button className="cyber-btn" onClick={() => setState((current) => ({ ...current, pwaInstallDismissed: true }))}>Verstanden</button></div></div>;
}

function JarvisOrb({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  const classes = size === 'large' ? 'h-56 w-56 md:h-72 md:w-72' : 'h-28 w-28';
  return <div className={`relative mx-auto grid ${classes} place-items-center`}><div className="jarvis-core absolute inset-0 rounded-full animate-pulseGlow" /><div className="absolute inset-4 rounded-full border-2 border-dashed border-green-200/45 animate-spin [animation-duration:16s]" /><div className="absolute inset-9 rounded-full border border-cyan-200/40 animate-spin [animation-direction:reverse] [animation-duration:8s]" /><div className="relative text-center"><b className={size === 'large' ? 'text-4xl' : 'text-xl'}>AURA</b><p className="tiny mt-1">CORE</p></div></div>;
}

function Toast({ toast }: { toast: ToastMessage }) {
  const tone = toast.tone === 'success' ? 'border-green-300/40 bg-green-300/15' : toast.tone === 'warning' ? 'border-yellow-300/40 bg-yellow-300/15' : 'border-cyan-300/40 bg-cyan-300/15';
  return <div className={`fixed right-4 top-4 z-50 max-w-sm rounded-3xl border p-4 shadow-hard backdrop-blur-2xl ${tone}`}><b>{toast.title}</b><p className="text-sm text-green-50/75">{toast.body}</p></div>;
}

function upcomingEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}
