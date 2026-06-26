import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') ?? searchParams.get('q') ?? 'Berlin';
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', city);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'de');
  url.searchParams.set('format', 'json');
  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`Geocoding nicht erreichbar (${response.status}).`);
    const data = (await response.json()) as { results?: Array<{ id: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string }> };
    return NextResponse.json({ source: 'live', results: (data.results ?? []).map((place) => ({ id: place.id, name: [place.name, place.admin1, place.country].filter(Boolean).join(', '), latitude: place.latitude, longitude: place.longitude })) });
  } catch (error) {
    return NextResponse.json({ source: 'offline', message: error instanceof Error ? error.message : 'Geocoding-Fallback aktiv.', results: [{ id: 1, name: city, latitude: 52.52, longitude: 13.405 }] });
  }
}
