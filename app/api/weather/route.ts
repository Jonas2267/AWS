import { NextResponse } from 'next/server';
import type { WeatherSnapshot } from '@/lib/storage/types';

const weatherCodes: Record<number, string> = {
  0: 'klar', 1: 'überwiegend klar', 2: 'teils bewölkt', 3: 'bedeckt', 45: 'neblig', 48: 'Reifnebel',
  51: 'leichter Nieselregen', 53: 'Nieselregen', 55: 'starker Nieselregen', 61: 'leichter Regen', 63: 'Regen', 65: 'starker Regen',
  71: 'leichter Schneefall', 73: 'Schneefall', 75: 'starker Schneefall', 80: 'leichte Schauer', 81: 'Schauer', 82: 'starke Schauer', 95: 'Gewitter',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') ?? 'Berlin';
  const coordinates = await resolveCoordinates(searchParams.get('lat'), searchParams.get('lon'), city);

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(coordinates.latitude));
    url.searchParams.set('longitude', String(coordinates.longitude));
    url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,precipitation');
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    url.searchParams.set('timezone', 'auto');
    const response = await fetch(url, { next: { revalidate: 600 } });
    if (!response.ok) throw new Error(`Open-Meteo nicht erreichbar (${response.status}).`);
    const data = (await response.json()) as { current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number }; daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[] } };
    const code = data.current?.weather_code ?? 0;
    const result: WeatherSnapshot & { highC?: number; lowC?: number; windKmh?: number; provider?: string } = {
      location: coordinates.name,
      temperatureC: Math.round(data.current?.temperature_2m ?? 0),
      condition: weatherCodes[code] ?? 'unbekannt',
      precipitationProbability: data.daily?.precipitation_probability_max?.[0] ?? 0,
      source: 'live',
      updatedAt: new Date().toISOString(),
      highC: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      lowC: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
      windKmh: Math.round(data.current?.wind_speed_10m ?? 0),
      provider: 'Open-Meteo',
    };
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ location: city, temperatureC: 21, condition: 'Fallback-Wetter', precipitationProbability: 20, source: 'offline', updatedAt: new Date().toISOString(), message: error instanceof Error ? error.message : 'Wetter-Fallback aktiv.' });
  }
}

async function resolveCoordinates(lat: string | null, lon: string | null, city: string): Promise<{ latitude: number; longitude: number; name: string }> {
  if (lat && lon) return { latitude: Number(lat), longitude: Number(lon), name: 'Aktueller Standort' };
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', city);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'de');
  url.searchParams.set('format', 'json');
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) return { latitude: 52.52, longitude: 13.405, name: city };
  const data = (await response.json()) as { results?: Array<{ latitude: number; longitude: number; name: string; country?: string }> };
  const first = data.results?.[0];
  return first ? { latitude: first.latitude, longitude: first.longitude, name: `${first.name}${first.country ? `, ${first.country}` : ''}` } : { latitude: 52.52, longitude: 13.405, name: city };
}
