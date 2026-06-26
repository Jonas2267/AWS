import type { BrowserLocation, PlaceCategory, PlaceResult, SourceStatus } from '@/lib/storage/types';

export interface LocationProvider {
  current(): Promise<BrowserLocation>;
}

export interface PlacesProvider {
  search(input: { category?: PlaceCategory; query?: string; origin?: BrowserLocation }): Promise<PlaceResult[]>;
}

export interface FuelPriceProvider {
  enrichFuelPrices(places: PlaceResult[]): Promise<PlaceResult[]>;
}

export interface NavigationProvider {
  openInAppleMaps(destination: PlaceResult, mode?: TravelMode): string;
  openInGoogleMaps(destination: PlaceResult, mode?: TravelMode): string;
}

export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

const categoryAliases: Record<PlaceCategory, string[]> = {
  fuel: ['tankstelle', 'sprit', 'benzin', 'diesel'],
  supermarket: ['supermarkt', 'markt', 'lebensmittel'],
  pharmacy: ['apotheke'],
  hospital: ['krankenhaus', 'notfall'],
  parking: ['parkplatz', 'parken'],
  workshop: ['werkstatt', 'auto werkstatt'],
  restaurant: ['restaurant', 'fast food', 'mcdonald', 'essen'],
  clothing: ['kleidung', 'mode', 'laden'],
  atm: ['geldautomat', 'bankautomat', 'atm'],
  parcel: ['paketstation', 'paket'],
  charging: ['ladestation', 'e-ladestation', 'elektro'],
  home: ['zuhause', 'heim'],
  school: ['schule'],
  work: ['arbeit', 'büro', 'buero'],
};

export const navigationCategories: Array<{ id: PlaceCategory; label: string }> = [
  { id: 'fuel', label: 'Tankstelle' }, { id: 'supermarket', label: 'Supermarkt' }, { id: 'pharmacy', label: 'Apotheke' },
  { id: 'hospital', label: 'Notfall' }, { id: 'parking', label: 'Parkplatz' }, { id: 'workshop', label: 'Werkstatt' },
  { id: 'restaurant', label: 'Fast Food' }, { id: 'clothing', label: 'Kleidung' }, { id: 'atm', label: 'Geldautomat' },
  { id: 'parcel', label: 'Paketstation' }, { id: 'charging', label: 'E-Ladestation' },
];

export class BrowserLocationProvider implements LocationProvider {
  current(): Promise<BrowserLocation> {
    if (!navigator.geolocation) return Promise.reject(new Error('Geolocation wird von diesem Browser nicht unterstützt.'));
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, updatedAt: new Date().toISOString() }),
        reject,
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
      );
    });
  }
}

export class DemoPlacesProvider implements PlacesProvider {
  async search(input: { category?: PlaceCategory; query?: string; origin?: BrowserLocation }): Promise<PlaceResult[]> {
    const category = input.category ?? detectPlaceCategory(input.query ?? '') ?? 'fuel';
    if (input.origin) {
      const params = new URLSearchParams({ category, lat: String(input.origin.latitude), lon: String(input.origin.longitude) });
      if (input.query) params.set('q', input.query);
      const response = await fetch(`/api/places?${params.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as { items?: PlaceResult[] };
        if (data.items?.length) return data.items;
      }
    }
    const normalizedQuery = input.query?.toLowerCase().trim();
    return demoPlaces
      .filter((place) => place.category === category || (!!normalizedQuery && place.name.toLowerCase().includes(normalizedQuery)))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

export class MapsLinkNavigationProvider implements NavigationProvider {
  openInAppleMaps(destination: PlaceResult, mode: TravelMode = 'driving'): string {
    const dirflg = mode === 'walking' ? 'w' : mode === 'transit' ? 'r' : 'd';
    return `https://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&q=${encodeURIComponent(destination.name)}&dirflg=${dirflg}`;
  }

  openInGoogleMaps(destination: PlaceResult, mode: TravelMode = 'driving'): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=${mode}`;
  }

  openInOpenStreetMap(destination: PlaceResult): string {
    return `https://www.openstreetmap.org/?mlat=${destination.latitude}&mlon=${destination.longitude}#map=17/${destination.latitude}/${destination.longitude}`;
  }
}

export function detectPlaceCategory(input: string): PlaceCategory | undefined {
  const normalized = input.toLowerCase().replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue');
  return (Object.entries(categoryAliases) as Array<[PlaceCategory, string[]]>).find(([, aliases]) => aliases.some((alias) => normalized.includes(alias)))?.[0];
}

function place(id: string, name: string, category: PlaceCategory, distanceKm: number, travelMinutes: number, extra: Partial<PlaceResult> = {}, source: SourceStatus = 'demo'): PlaceResult {
  return { id, name, category, address: extra.address ?? 'Nähe aktueller Position', distanceKm, travelMinutes, rating: extra.rating ?? 4.3, openNow: extra.openNow ?? true, latitude: extra.latitude ?? 52.52 + distanceKm / 100, longitude: extra.longitude ?? 13.405 + distanceKm / 120, fuelPriceEur: extra.fuelPriceEur, source };
}

export const demoPlaces: PlaceResult[] = [
  place('fuel-1', 'NeonFuel Station Nord', 'fuel', 1.1, 4, { fuelPriceEur: 1.79, rating: 4.1 }),
  place('fuel-2', 'GreenLine Tankstelle', 'fuel', 2.8, 6, { fuelPriceEur: 1.72, rating: 4.4 }),
  place('fuel-3', 'CityCharge & Fuel', 'fuel', 3.4, 9, { fuelPriceEur: 1.76, rating: 4.0 }),
  place('market-1', 'CyberMart Supermarkt', 'supermarket', 0.9, 3, { rating: 4.5 }),
  place('pharmacy-1', 'ApoLink 24', 'pharmacy', 1.4, 5, { rating: 4.7 }),
  place('parking-1', 'Parkdeck Signal', 'parking', 0.6, 2, { rating: 4.0 }),
  place('workshop-1', 'AutoLab Werkstatt', 'workshop', 3.1, 8, { rating: 4.6 }),
  place('food-1', 'McDonald’s City Gate', 'restaurant', 1.8, 5, { rating: 4.0 }),
  place('cloth-1', 'StreetWear Hub', 'clothing', 2.2, 7, { rating: 4.2 }),
  place('atm-1', 'CashNode Geldautomat', 'atm', 0.7, 2, { rating: 4.3 }),
  place('parcel-1', 'DHL Paketstation 144', 'parcel', 1.2, 4, { rating: 4.1 }),
  place('charge-1', 'E-Charge Fast 300', 'charging', 2.5, 6, { rating: 4.4 }),
];

export function bestFuelRecommendation(places: PlaceResult[]): PlaceResult | undefined {
  return places.filter((place) => place.category === 'fuel').sort((a, b) => (a.fuelPriceEur ?? 999) - (b.fuelPriceEur ?? 999) || a.distanceKm - b.distanceKm)[0];
}
