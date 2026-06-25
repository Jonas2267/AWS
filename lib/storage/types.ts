export type PermissionStatus = 'demo' | 'requested' | 'granted' | 'denied' | 'disconnected';
export type ModuleId = 'assistant' | 'dashboard' | 'calendar' | 'tasks' | 'news' | 'permissions' | 'terminal' | 'files' | 'system' | 'setup';
export type TaskPriority = 'niedrig' | 'mittel' | 'hoch';
export type TaskStatus = 'offen' | 'läuft' | 'erledigt';

export type UserAccount = {
  username: string;
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

export type AppState = {
  user: UserAccount | null;
  session: boolean;
  events: CalendarEvent[];
  tasks: TaskItem[];
  permissions: PermissionItem[];
  messages: ChatMessage[];
  reminders: Reminder[];
  activeModule: ModuleId;
  booted: boolean;
  setupStep: number;
  pwaInstallDismissed: boolean;
};

export interface StorageProvider<T> {
  load(): T | null;
  save(data: T): void;
  clear(): void;
}
