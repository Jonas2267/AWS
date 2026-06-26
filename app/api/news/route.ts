import { NextResponse } from 'next/server';
import { demoNews, summarizeNews } from '@/lib/news/news';
import type { NewsItem, SourceStatus } from '@/lib/storage/types';

const rssFeeds: Record<string, string[]> = {
  Deutschland: ['https://www.tagesschau.de/xml/rss2/'],
  Welt: ['https://www.deutschlandfunk.de/nachrichten-100.rss'],
  Technik: ['https://www.heise.de/rss/heise-atom.xml'],
  Wirtschaft: ['https://www.tagesschau.de/wirtschaft/index~rss2.xml'],
  Sport: ['https://www.sportschau.de/index~rss2.xml'],
  Gaming: ['https://www.golem.de/rss.php?feed=RSS2.0'],
  Auto: ['https://www.golem.de/rss.php?feed=RSS2.0'],
  Sicherheit: ['https://www.heise.de/security/rss/news-atom.xml'],
  KI: ['https://www.heise.de/rss/heise-atom.xml'],
};

const categoryMap: Record<string, string> = {
  Deutschland: 'general', Welt: 'general', Technik: 'technology', Wirtschaft: 'business', Sport: 'sports', Gaming: 'technology', Auto: 'business', Sicherheit: 'technology', KI: 'technology',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? 'Alle';
  const query = searchParams.get('q') ?? searchParams.get('query') ?? '';
  const dateHint = searchParams.get('date') ?? 'today';

  const rssItems = await fetchRssNews(category, query).catch(() => [] as NewsItem[]);
  if (rssItems.length) return NextResponse.json({ mode: 'live', status: 'live', message: 'Kostenlose RSS-Live-Quelle aktiv.', items: rssItems, summary: summarizeNews(rssItems) });

  const key = process.env.NEWS_API_KEY;
  if (!key) return NextResponse.json(buildFallback(category, query, 'offline', 'RSS aktuell nicht erreichbar, lokaler Fallback aktiv.'));

  try {
    const items = await fetchNewsApi({ key, category, query, dateHint });
    if (!items.length) return NextResponse.json(buildFallback(category, query, 'offline', 'Live-News lieferte keine Treffer, Fallback aktiv.'));
    return NextResponse.json({ mode: 'live', status: 'live', message: 'Optionale NewsAPI-Quelle verbunden.', items, summary: summarizeNews(items) });
  } catch (error) {
    return NextResponse.json(buildFallback(category, query, 'offline', error instanceof Error ? error.message : 'News-Fallback aktiv'), { status: 200 });
  }
}

async function fetchRssNews(category: string, query: string): Promise<NewsItem[]> {
  const feeds = category === 'Alle' ? Object.values(rssFeeds).flat().slice(0, 4) : (rssFeeds[category] ?? rssFeeds.Deutschland);
  const xmlList = await Promise.all(feeds.map(async (feed) => (await fetch(feed, { next: { revalidate: 900 } })).text()));
  const normalized = query.toLowerCase().trim();
  return xmlList.flatMap((xml, feedIndex) => parseRss(xml, category, feedIndex))
    .filter((item) => !normalized || `${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(normalized))
    .slice(0, 12);
}

function parseRss(xml: string, category: string, feedIndex: number): NewsItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)[\s\S]*?<\/\1>/g)].map((match) => match[0]);
  return blocks.map((block, index) => ({
    id: `rss-${feedIndex}-${index}`,
    category: category === 'Alle' ? inferCategory(block) : category,
    title: cleanXml(text(block, 'title') || 'Live-Meldung'),
    summary: cleanXml(text(block, 'description') || text(block, 'summary') || 'Keine Kurzbeschreibung verfügbar.'),
    source: sourceFromXml(xml),
    publishedAt: text(block, 'pubDate') || text(block, 'updated') || new Date().toISOString(),
    url: text(block, 'link') || block.match(/<link[^>]+href="([^"]+)"/)?.[1],
    status: 'live',
  }));
}

function text(block: string, tag: string): string | undefined {
  return block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim();
}

function cleanXml(value: string): string {
  return value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
}

function sourceFromXml(xml: string): string {
  return cleanXml(text(xml, 'title') ?? 'RSS Live');
}

function inferCategory(block: string): string {
  const textValue = block.toLowerCase();
  if (/ki|künstliche|ai|openai/.test(textValue)) return 'KI';
  if (/security|sicherheit|cyber/.test(textValue)) return 'Sicherheit';
  if (/sport|formel|fussball|fußball/.test(textValue)) return 'Sport';
  if (/auto|mobilität|mobilitaet/.test(textValue)) return 'Auto';
  return 'Deutschland';
}

async function fetchNewsApi(input: { key: string; category: string; query: string; dateHint: string }): Promise<NewsItem[]> {
  const useEverything = Boolean(input.query.trim()) || input.category === 'Deutschland' || input.category === 'Gaming' || input.category === 'Auto' || input.category === 'Sicherheit' || input.category === 'KI';
  const url = new URL(useEverything ? 'https://newsapi.org/v2/everything' : 'https://newsapi.org/v2/top-headlines');
  url.searchParams.set('apiKey', input.key);
  url.searchParams.set('pageSize', '12');
  url.searchParams.set('language', 'de');

  if (useEverything) {
    url.searchParams.set('q', buildQuery(input.category, input.query));
    url.searchParams.set('sortBy', 'publishedAt');
    const from = new Date();
    if (input.dateHint === 'yesterday') from.setDate(from.getDate() - 1);
    if (input.dateHint === 'week') from.setDate(from.getDate() - 7);
    url.searchParams.set('from', from.toISOString().slice(0, 10));
  } else {
    url.searchParams.set('country', input.category === 'Welt' ? 'us' : 'de');
    if (categoryMap[input.category]) url.searchParams.set('category', categoryMap[input.category]);
  }

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`Optionale NewsAPI nicht erreichbar (${response.status}).`);
  const data = (await response.json()) as { articles?: Array<{ title?: string; description?: string; source?: { name?: string }; publishedAt?: string; url?: string }> };
  return (data.articles ?? []).filter((article) => article.title).map((article, index) => ({
    id: `live-${index}-${article.publishedAt ?? Date.now()}`,
    category: input.category === 'Alle' ? 'Deutschland' : input.category,
    title: article.title ?? 'Live-Meldung',
    summary: article.description ?? 'Keine Kurzbeschreibung verfügbar.',
    source: article.source?.name ?? 'Live News',
    publishedAt: article.publishedAt ?? new Date().toISOString(),
    url: article.url,
    status: 'live',
  }));
}

function buildQuery(category: string, query: string): string {
  if (query.trim()) return query.trim();
  if (category === 'Deutschland') return 'Deutschland heute';
  if (category === 'Gaming') return 'Gaming';
  if (category === 'Auto') return 'Auto Mobilität';
  if (category === 'Sicherheit') return 'Cybersecurity Sicherheit';
  if (category === 'KI') return 'Künstliche Intelligenz';
  return category === 'Alle' ? 'Top News Deutschland' : category;
}

function buildFallback(category: string, query: string, status: SourceStatus, reason = 'Live-News nicht verbunden, Fallback aktiv.') {
  const normalized = query.toLowerCase();
  const items = demoNews
    .filter((item) => (category === 'Alle' || item.category === category) && (!normalized || `${item.title} ${item.summary}`.toLowerCase().includes(normalized)))
    .map((item) => ({ ...item, status }));
  return { mode: 'demo', status, message: reason, items, summary: summarizeNews(items) };
}
