import { NextResponse } from 'next/server';
import { demoPlaces, detectPlaceCategory } from '@/lib/navigation/navigation';
import type { PlaceCategory } from '@/lib/storage/types';

const osmQueries: Record<PlaceCategory, string> = {
  fuel: 'fuel', supermarket: 'supermarket', pharmacy: 'pharmacy', hospital: 'hospital', parking: 'parking', workshop: 'car_repair', restaurant: 'restaurant', clothing: 'clothes', atm: 'atm', parcel: 'parcel_locker', charging: 'charging_station', home: 'home', school: 'school', work: 'office',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get('category') as PlaceCategory | null) ?? detectPlaceCategory(searchParams.get('q') ?? '') ?? 'fuel';
  const lat = Number(searchParams.get('lat') ?? '52.52');
  const lon = Number(searchParams.get('lon') ?? '13.405');
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '8');
    url.searchParams.set('q', osmQueries[category]);
    url.searchParams.set('viewbox', `${lon - 0.08},${lat + 0.08},${lon + 0.08},${lat - 0.08}`);
    url.searchParams.set('bounded', '1');
    const response = await fetch(url, { next: { revalidate: 900 }, headers: { 'User-Agent': 'AWS-KI-Manager/1.0 (personal local app)' } });
    if (!response.ok) throw new Error(`OpenStreetMap nicht erreichbar (${response.status}).`);
    const data = (await response.json()) as Array<{ place_id?: number; display_name?: string; lat?: string; lon?: string; name?: string }>;
    const items = data.map((item, index) => {
      const plat = Number(item.lat ?? lat);
      const plon = Number(item.lon ?? lon);
      const distanceKm = Math.max(0.2, Math.round(distance(lat, lon, plat, plon) * 10) / 10);
      return { id: `osm-${item.place_id ?? index}`, name: item.name ?? item.display_name?.split(',')[0] ?? osmQueries[category], category, address: item.display_name ?? 'OpenStreetMap', distanceKm, travelMinutes: Math.max(2, Math.round(distanceKm * 3)), latitude: plat, longitude: plon, source: 'live', openNow: undefined, rating: undefined };
    });
    return NextResponse.json({ source: 'live', attribution: '© OpenStreetMap-Mitwirkende / Nominatim', items });
  } catch (error) {
    return NextResponse.json({ source: 'offline', attribution: 'Lokale Ersatzliste', message: error instanceof Error ? error.message : 'OpenStreetMap aktuell nicht erreichbar.', items: demoPlaces.filter((place) => place.category === category) });
  }
}

function distance(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s1));
}
