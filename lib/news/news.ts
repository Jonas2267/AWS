import type { DataMode, NewsItem, SourceStatus } from '@/lib/storage/types';

export type NewsQuery = {
  category?: string;
  query?: string;
  dateHint?: 'today' | 'yesterday' | 'week';
};

export type NewsResponse = {
  mode: DataMode;
  status: SourceStatus;
  message: string;
  items: NewsItem[];
  summary: string;
};

export interface NewsProvider {
  list(query?: NewsQuery): Promise<NewsResponse>;
  summarize(items: NewsItem[]): Promise<string>;
}

export class LocalDemoNewsProvider implements NewsProvider {
  async list(query: NewsQuery = {}): Promise<NewsResponse> {
    const items = filterDemoNews(query).map((item) => ({ ...item, status: 'demo' as const }));
    return { mode: 'demo', status: 'demo', message: 'Lokaler News-Fallback aktiv.', items, summary: summarizeNews(items) };
  }

  async summarize(items: NewsItem[]): Promise<string> {
    return summarizeNews(items);
  }
}

export class LiveNewsProvider implements NewsProvider {
  async list(query: NewsQuery = {}): Promise<NewsResponse> {
    const params = new URLSearchParams();
    if (query.category) params.set('category', query.category);
    if (query.query) params.set('q', query.query);
    if (query.dateHint) params.set('date', query.dateHint);
    const response = await fetch(`/api/news?${params.toString()}`);
    if (!response.ok) throw new Error('News API Route nicht erreichbar.');
    return response.json() as Promise<NewsResponse>;
  }

  async summarize(items: NewsItem[]): Promise<string> {
    return summarizeNews(items);
  }
}

export class NewsApiProvider extends LiveNewsProvider {}

export const demoNews: NewsItem[] = [
  { id: 'de-1', category: 'Deutschland', title: 'Digitale Dienste setzen stärker auf transparente Berechtigungen', summary: 'Neue Apps zeigen Datenzugriffe granularer und setzen auf freiwillige Freigaben.', source: 'Demo Deutschland Feed', publishedAt: new Date().toISOString(), status: 'demo' },
  { id: 'tech-1', category: 'Technik', title: 'On-Device-KI wird stärker', summary: 'Neue NPUs beschleunigen lokale Assistenten und reduzieren Cloud-Abhängigkeit.', source: 'Demo Tech Wire', publishedAt: new Date().toISOString(), status: 'demo' },
  { id: 'security-1', category: 'Sicherheit', title: 'Passkeys ersetzen Passwörter in immer mehr Apps', summary: 'FIDO-basierte Logins senken Phishing-Risiken, benötigen aber sauberes Recovery-Design.', source: 'Demo Security Desk', publishedAt: new Date().toISOString(), status: 'demo' },
  { id: 'world-1', category: 'Welt', title: 'Digitale Verwaltung baut sichere Bürger-Apps aus', summary: 'Neue Standards setzen auf Transparenz, Datenschutz und freiwillige Berechtigungen.', source: 'Demo Global', publishedAt: new Date().toISOString(), status: 'demo' },
  { id: 'gaming-1', category: 'Gaming', title: 'Cyberpunk-Interfaces feiern Comeback', summary: 'Spieler lieben responsive HUDs, Neon-Typografie und immersive OS-Fiktion.', source: 'Demo Gaming Feed', publishedAt: new Date().toISOString(), status: 'demo' },
  { id: 'business-1', category: 'Wirtschaft', title: 'Produktivitäts-Apps verschmelzen Kalender und KI', summary: 'Assistenten planen Aufgaben, Meetings und Zusammenfassungen über klare Nutzerfreigaben.', source: 'Demo Market', publishedAt: new Date().toISOString(), status: 'demo' },
  { id: 'auto-1', category: 'Auto', title: 'Software-defined Vehicles brauchen Permission UX', summary: 'Fahrer sollen Datenzugriffe verständlich sehen und granular kontrollieren können.', source: 'Demo Mobility', publishedAt: new Date().toISOString(), status: 'demo' },
  { id: 'ki-1', category: 'KI', title: 'Lokale KI-Assistenten werden alltagstauglicher', summary: 'Kostenlose Regel- und Wissensprovider helfen ohne Cloud-Zwang bei Aufgaben, News und Planung.', source: 'Lokaler Fallback', publishedAt: new Date().toISOString(), status: 'demo' },
  { id: 'sport-1', category: 'Sport', title: 'Wearables liefern bessere Trainingszusammenfassungen', summary: 'Lokale Datenanalyse hilft bei Planung und Regeneration, wenn Nutzer aktiv zustimmen.', source: 'Demo Sports', publishedAt: new Date().toISOString(), status: 'demo' },
];

export const newsCategories = ['Alle', 'Deutschland', 'Welt', 'Technik', 'Wirtschaft', 'Sport', 'Gaming', 'Auto', 'Sicherheit', 'KI'];

export function filterDemoNews(query: NewsQuery = {}): NewsItem[] {
  const normalizedQuery = query.query?.trim().toLowerCase();
  return demoNews.filter((item) => {
    const matchesCategory = !query.category || query.category === 'Alle' || item.category === query.category;
    const matchesQuery = !normalizedQuery || `${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}

export function summarizeNews(items: NewsItem[]): string {
  if (!items.length) return 'Keine passenden News gefunden.';
  const source = items.some((item) => item.status === 'live') ? 'Live-Quellen' : items.some((item) => item.status === 'offline') ? 'Offline-Fallback' : items.some((item) => item.status === 'api-missing') ? 'optionale API fehlt' : 'lokaler Fallback';
  return `AURA News-Briefing: ${items.slice(0, 4).map((item) => `${item.category}: ${item.title}`).join(' · ')}. Quelle: ${source}.`;
}
