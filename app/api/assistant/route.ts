import { NextResponse } from 'next/server';
import { demoWeather } from '@/lib/weather/weather';
import { demoNews, summarizeNews } from '@/lib/news/news';
import { bestFuelRecommendation, demoPlaces, detectPlaceCategory } from '@/lib/navigation/navigation';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { message?: string; context?: unknown };
  const message = body.message ?? '';
  const key = process.env.OPENAI_API_KEY;
  const local = await localAssistant(message);

  if (!key) return NextResponse.json({ ...local, provider: 'LocalAIProvider', status: local.status ?? 'api-missing', note: 'Kostenloser AURA-Modus aktiv.' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
        input: `Du bist AURA Core, ein legaler deutscher Life-OS Assistent. Keine gefährlichen Anleitungen. Nutzerfrage: ${message}\nLokaler Kontext: ${local.answer}`,
        max_output_tokens: 450,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API nicht erreichbar (${response.status}).`);
    const data = (await response.json()) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const answer = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).map((item) => item.text).filter(Boolean).join('\n') ?? local.answer;
    return NextResponse.json({ answer, provider: 'OpenAIProvider', status: 'live', suggestions: local.suggestions });
  } catch (error) {
    return NextResponse.json({ ...local, provider: 'LocalAIProvider', status: 'api-missing', note: error instanceof Error ? error.message : 'OpenAI-Fallback aktiv.' });
  }
}

async function localAssistant(message: string) {
  const text = message.toLowerCase();
  if (/(heute.*passiert|nachrichten|news|deutschland|formel|f1)/.test(text)) {
    const items = demoNews.slice(0, 5);
    return { answer: `AURA Core: Live-News sind ohne NEWS_API_KEY nicht verbunden. Ich nutze den lokalen Fallback: ${summarizeNews(items)}`, status: 'api-missing', suggestions: ['Öffne News', 'Was ist heute in Deutschland passiert?'] };
  }
  if (/wetter|regnet|gewitter|sonne|wind/.test(text)) {
    const city = message.match(/(?:in|für|fuer)\s+([A-Za-zÄÖÜäöüß\- ]{2,})/)?.[1]?.trim() ?? 'Berlin';
    const weather = demoWeather(city);
    return { answer: `AURA Core: Wetterfragen laufen kostenlos über Open-Meteo. Für „in 30 Minuten“ nutze ich den nächstliegenden Stundenwert. Aktueller Fallback für ${city}: ${weather.temperatureC}°C, ${weather.condition}.`, status: 'local', suggestions: [`Wetter in ${city}`, 'Öffne Wetter'] };
  }
  if (/(wiki|wikipedia|erklär|erklaer|was ist)/.test(text)) {
    return { answer: 'AURA Core: Ich öffne die kostenlose Wikipedia-Suche und fasse die Quelle kurz zusammen.', status: 'live', suggestions: ['Suche Wikipedia nach TCP/IP', 'Öffne Wissen'] };
  }
  if (/(fokus|pomodoro|konzentrier)/.test(text)) {
    return { answer: 'AURA Core: Fokusmodus bereit. Wähle eine Aufgabe und starte einen lokalen Timer – ohne Cloud-Abhängigkeit.', status: 'local', suggestions: ['Öffne Fokusmodus', 'Starte Fokus für 25 Minuten'] };
  }
  if (/(tankstelle|apotheke|supermarkt|parkplatz|werkstatt|mcdonald|kleidung|geldautomat|navigation|route)/.test(text)) {
    const category = detectPlaceCategory(message) ?? 'fuel';
    const places = demoPlaces.filter((place) => place.category === category).slice(0, 4);
    const bestFuel = category === 'fuel' ? bestFuelRecommendation(places) : undefined;
    const recommendation = bestFuel ? ` Empfehlung: ${bestFuel.name}, ${bestFuel.distanceKm} km, Demo-Preis ${bestFuel.fuelPriceEur?.toFixed(2)} €/L. Für echte Spritpreise bitte FuelPrice API verbinden.` : ` Treffer: ${places.map((place) => `${place.name} (${place.distanceKm} km)`).join(', ')}.`;
    return { answer: `AURA Core: Ich habe ${places.length} Orte in der Nähe gefunden.${recommendation}`, status: 'demo', suggestions: ['Route starten', 'Öffne Navigation'] };
  }
  return { answer: 'AURA Core: Ich kann Termine, Aufgaben, News, Wetter, Navigation und Berechtigungen steuern. Für aktuelle Web-Intelligenz verbinde OPENAI_API_KEY serverseitig.', status: 'demo', suggestions: ['Was steht heute an?', 'Was ist heute passiert?', 'Finde die billigste Tankstelle'] };
}
