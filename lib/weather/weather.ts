import type { WeatherSnapshot } from '@/lib/storage/types';

export interface WeatherProvider {
  current(input: { latitude?: number; longitude?: number; city?: string }): Promise<WeatherSnapshot>;
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  async current(input: { latitude?: number; longitude?: number; city?: string }): Promise<WeatherSnapshot> {
    const params = new URLSearchParams();
    if (input.latitude && input.longitude) {
      params.set('lat', String(input.latitude));
      params.set('lon', String(input.longitude));
    } else {
      params.set('city', input.city ?? 'Berlin');
    }
    const response = await fetch(`/api/weather?${params.toString()}`);
    if (!response.ok) throw new Error('Wetterdienst nicht erreichbar.');
    return response.json() as Promise<WeatherSnapshot>;
  }
}

export class LiveWeatherProvider extends OpenMeteoWeatherProvider {}

export function demoWeather(location = 'Berlin') : WeatherSnapshot {
  return { location, temperatureC: 21, condition: 'lokaler Fallback', precipitationProbability: 20, source: 'offline', updatedAt: new Date().toISOString() };
}
