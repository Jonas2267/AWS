import type { NewsItem } from '@/lib/storage/types';

export interface NewsProvider {
  list(category?: string, query?: string): Promise<NewsItem[]>;
  summarize(items: NewsItem[]): Promise<string>;
}

export class LocalDemoNewsProvider implements NewsProvider {
  async list(category?: string, query?: string): Promise<NewsItem[]> {
    const normalizedQuery = query?.trim().toLowerCase();
    return demoNews.filter((item) => {
      const matchesCategory = !category || category === 'Alle' || item.category === category;
      const matchesQuery = !normalizedQuery || `${item.title} ${item.summary}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }

  async summarize(items: NewsItem[]): Promise<string> {
    return summarizeNews(items);
  }
}

export class NewsApiProvider implements NewsProvider {
  async list(): Promise<NewsItem[]> {
    throw new Error('NewsApiProvider ist vorbereitet. Implementiere API-Key-Proxy, Rate-Limits und Quellenfilter serverseitig.');
  }

  async summarize(items: NewsItem[]): Promise<string> {
    return summarizeNews(items);
  }
}

export const demoNews: NewsItem[] = [
  {
    id: 'tech-1',
    category: 'Technik',
    title: 'On-Device-KI wird stärker',
    summary: 'Neue NPUs beschleunigen lokale Assistenten und reduzieren Cloud-Abhängigkeit.',
    source: 'Demo Tech Wire',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'security-1',
    category: 'Sicherheit',
    title: 'Passkeys ersetzen Passwörter in immer mehr Apps',
    summary: 'FIDO-basierte Logins senken Phishing-Risiken, benötigen aber sauberes Recovery-Design.',
    source: 'Demo Security Desk',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'world-1',
    category: 'Welt',
    title: 'Digitale Verwaltung baut sichere Bürger-Apps aus',
    summary: 'Neue Standards setzen auf Transparenz, Datenschutz und freiwillige Berechtigungen.',
    source: 'Demo Global',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'gaming-1',
    category: 'Gaming',
    title: 'Cyberpunk-Interfaces feiern Comeback',
    summary: 'Spieler lieben responsive HUDs, Neon-Typografie und immersive OS-Fiktion.',
    source: 'Demo Gaming Feed',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'business-1',
    category: 'Wirtschaft',
    title: 'Produktivitäts-Apps verschmelzen Kalender und KI',
    summary: 'Assistenten planen Aufgaben, Meetings und Zusammenfassungen über klare Nutzerfreigaben.',
    source: 'Demo Market',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'auto-1',
    category: 'Auto',
    title: 'Software-defined Vehicles brauchen Permission UX',
    summary: 'Fahrer sollen Datenzugriffe verständlich sehen und granular kontrollieren können.',
    source: 'Demo Mobility',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 'sport-1',
    category: 'Sport',
    title: 'Wearables liefern bessere Trainingszusammenfassungen',
    summary: 'Lokale Datenanalyse hilft bei Planung und Regeneration, wenn Nutzer aktiv zustimmen.',
    source: 'Demo Sports',
    publishedAt: new Date().toISOString(),
  },
];

export const newsCategories = ['Alle', 'Technik', 'Welt', 'Sport', 'Wirtschaft', 'Gaming', 'Auto', 'Sicherheit'];

export function summarizeNews(items: NewsItem[]): string {
  if (!items.length) return 'Keine passenden Demo-News gefunden.';

  return `AURA News-Briefing: ${items
    .slice(0, 4)
    .map((item) => `${item.category}: ${item.title}`)
    .join(' · ')}. Datenquelle: lokaler Demo-Feed, später austauschbar über NewsApiProvider.`;
}
