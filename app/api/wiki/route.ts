import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ title: 'Wikipedia', extract: 'Bitte Suchbegriff eingeben.', url: 'https://de.wikipedia.org', source: 'local' });
  try {
    const response = await fetch(`https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`, { next: { revalidate: 3600 }, headers: { 'User-Agent': 'AWS-KI-Manager/1.0 (personal local app)' } });
    if (!response.ok) throw new Error(`Wikipedia Treffer nicht verfügbar (${response.status}).`);
    const data = (await response.json()) as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
    return NextResponse.json({ title: data.title ?? q, extract: data.extract ?? 'Keine Zusammenfassung verfügbar.', url: data.content_urls?.desktop?.page ?? `https://de.wikipedia.org/wiki/${encodeURIComponent(q)}`, source: 'live' });
  } catch (error) {
    return NextResponse.json({ title: q, extract: error instanceof Error ? error.message : 'Wikipedia-Fallback aktiv.', url: `https://de.wikipedia.org/wiki/${encodeURIComponent(q)}`, source: 'offline' });
  }
}
