export type PermissionStatus = 'demo' | 'requested' | 'granted' | 'denied' | 'disconnected';
export type DataMode = 'demo' | 'live' | 'mixed';
export type SourceStatus = 'live' | 'local' | 'demo' | 'api-missing' | 'permission-missing' | 'offline';
export type ProviderStatus = 'live' | 'local' | 'unavailable' | 'limit-reached' | 'permission-needed' | 'optional-key-needed' | 'blocked' | 'offline';
export type ModuleId = 'assistant' | 'weather' | 'dashboard' | 'calendar' | 'tasks' | 'news' | 'wiki' | 'today' | 'notes' | 'focus' | 'navigation' | 'permissions' | 'terminal' | 'files' | 'system' | 'setup';
export type TaskPriority = 'niedrig' | 'mittel' | 'hoch';
export type TaskStatus = 'offen' | 'läuft' | 'erledigt';

export type UserAccount = {
  username: string;
  style?: 'professionell' | 'futuristisch' | 'minimal';
  passwordHash: string;
  initials: string;
  createdAt: string;
  setupCompleted: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  reminderMinutes: number;
  notes?: string;
  provider: 'local-demo' | 'google' | 'microsoft' | 'apple-native';
};

export type TaskItem = {
  id: string;
  title: string;
  priority: TaskPriority;
  deadline?: string;
  status: TaskStatus;
  reminder?: string;
};

export type PermissionItem = {
  id: string;
  name: string;
  status: PermissionStatus;
  recommended: boolean;
  description: string;
  technical: string;
};

export type NewsItem = {
  id: string;
  category: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url?: string;
  status?: SourceStatus;
};

export type WeatherSnapshot = {
  location: string;
  temperatureC: number;
  condition: string;
  precipitationProbability?: number;
  source: SourceStatus;
  updatedAt: string;
  highC?: number;
  lowC?: number;
  windKmh?: number;
  windGustKmh?: number;
  cloudCover?: number;
  provider?: string;
  nearestHourNote?: string;
  hourly?: Array<{ time: string; temperatureC: number; precipitationProbability: number; precipitationMm?: number; cloudCover?: number; windKmh?: number; condition: string }>;
  sunrise?: string;
  sunset?: string;
};

export type BrowserLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt: string;
};

export type PlaceCategory = 'fuel' | 'supermarket' | 'pharmacy' | 'hospital' | 'parking' | 'workshop' | 'restaurant' | 'clothing' | 'atm' | 'parcel' | 'charging' | 'home' | 'school' | 'work';

export type PlaceResult = {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string;
  distanceKm: number;
  travelMinutes: number;
  rating?: number;
  openNow?: boolean;
  fuelPriceEur?: number;
  latitude: number;
  longitude: number;
  source: SourceStatus;
};

export type WikiSummary = {
  title: string;
  extract: string;
  url: string;
  source: SourceStatus;
};

export type NoteItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type FocusSession = {
  taskId?: string;
  minutes: number;
  startedAt?: string;
  endsAt?: string;
  active: boolean;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  suggestions?: string[];
};

export type Reminder = {
  id: string;
  eventId: string;
  title: string;
  dueAt: string;
  minutesBefore: number;
  delivered: boolean;
};

export type ToastMessage = {
  id: string;
  tone: 'info' | 'success' | 'warning';
  title: string;
  body: string;
};

export type ProviderConnection = {
  id: string;
  name: string;
  status: ProviderStatus;
  source: string;
  detail: string;
  lastChecked?: string;
  limit?: number;
  usedToday?: number;
  resetAt?: string;
  error?: string;
  attribution?: string;
  freeTier?: string;
  updatedAt?: string;
};

export type ProviderUsage = {
  id: string;
  usedToday: number;
  resetAt: string;
};

export type AppState = {
  dataMode?: DataMode;
  runtime?: {
    location?: BrowserLocation;
    microphoneActive?: boolean;
    speechListening?: boolean;
    speechSupported?: boolean;
    weather?: WeatherSnapshot;
    wiki?: WikiSummary;
  };
  user: UserAccount | null;
  session: boolean;
  events: CalendarEvent[];
  tasks: TaskItem[];
  permissions: PermissionItem[];
  messages: ChatMessage[];
  reminders: Reminder[];
  providerStatus?: Record<string, ProviderConnection>;
  providerUsage?: Record<string, ProviderUsage>;
  notes?: NoteItem[];
  focus?: FocusSession;
  activeModule: ModuleId;
  booted: boolean;
  setupStep: number;
  pwaInstallDismissed: boolean;
  settings?: {
    theme: 'dark' | 'light' | 'system';
    accent: 'cyan' | 'blue' | 'green' | 'white';
    density: 'comfort' | 'compact';
    reducedMotion: boolean;
    auraStyle: 'kurz' | 'normal' | 'detailliert';
    preferLiveSources: boolean;
    forceFreeMode: boolean;
    voiceEnabled: boolean;
    readAnswers: boolean;
    wakeWord: 'AURA' | 'Jarvis';
    defaultCity: string;
    defaultMaps: 'google' | 'apple' | 'osm';
    quickDock: boolean;
  };
};

export interface StorageProvider<T> {
  load(): T | null;
  save(data: T): void;
  clear(): void;
}
