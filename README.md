# AWS KI Manager

AWS KI Manager ist eine kostenlose, lokale Personal-Intelligence-Workstation für Alltag, Wissen, Wetter, News, Navigation, Aufgaben, Dateien, Fokus und Sprache. Die App folgt der Designsprache **Obsidian Intelligence**: ruhig, minimal, präzise, erwachsen und transparent.

## Designprinzipien

1. Clarity before decoration.
2. Calm is premium.
3. Motion only when it helps.
4. Every module belongs to one ecosystem.
5. No fake data.
6. If something is unavailable, say it honestly and beautifully.

## Kostenloser Modus

AWS KI Manager funktioniert ohne kostenpflichtige Pflicht-APIs:

- Wetter: Open-Meteo Forecast und Open-Meteo Geocoding ohne API-Key.
- Wissen: Wikipedia/Wikimedia ohne API-Key.
- Orte: OpenStreetMap/Nominatim mit Attribution und defensivem 1s-Takt.
- Navigation: Google Maps, Apple Karten und OpenStreetMap als kostenlose Links.
- News: RSS-Strategie über Next.js API Route; NewsAPI bleibt optional.
- Aufgaben, Termine, Erinnerungen, Notizen und Fokus: lokal im Browser.
- AURA Core: lokaler regelbasierter Assistant; OpenAI ist optional und nur serverseitig.

## Provider-Status und Limits

Jeder Provider speichert Status, Quelle, Attribution, Free-Tier-Hinweis, Tageslimit, Nutzung, Reset-Zeit und Fehlerzustand lokal. Unterstützte Statuswerte:

- `live` — echte Live-Quelle erreichbar.
- `local` — lokal oder kostenlos ohne externe Schlüssel nutzbar.
- `permission-needed` — Browser-Freigabe erforderlich.
- `optional-key-needed` — optionaler Schlüssel möglich, aber nicht nötig.
- `limit-reached` — lokales Tageslimit erreicht; Requests werden pausiert.
- `unavailable`, `blocked`, `offline` — Quelle nicht erreichbar oder nicht erlaubt.

Bekannte kostenlose Limits werden defensiv behandelt. Bei erreichten Limits sendet die App keine weiteren Requests und zeigt den nächsten Reset-Zeitpunkt an.

## Automatischer Setup-/Connect-Wizard

Beim ersten Login öffnet AWS KI Manager den Wizard **„Kostenlose Live-Funktionen verbinden“**. Er testet Open-Meteo, Wikipedia, OpenStreetMap/Nominatim, RSS-News, Maps-Links, LocalStorage und AURA Core. Browser-Berechtigungen für Standort, Benachrichtigungen, Mikrofon, Speech, Dateien und lokale Speicherung werden einzeln und nur nach sichtbarer Nutzeraktion abgefragt.

Die Verbindungszentrale ist im Setup, Dashboard und den Einstellungen verfügbar. Dort können Setup, Provider-Tests und Berechtigungsprüfungen erneut gestartet werden.

## AURA Direktantworten und lokales Gedächtnis

AURA beantwortet Wetter-, News-, Wikipedia-, Navigations- und Berechtigungsfragen direkt im Chat, bevor optional ein Modul geöffnet wird. Der Chat zeigt nur die letzten drei Dialoge; ältere lokale Themen werden als `memorySummary` im Browser gespeichert und können in den Einstellungen gelöscht werden. Sprachsteuerung nutzt Web Speech API und SpeechSynthesis nur im aktiven Fenster und nur nach Nutzeraktion.

## Sprache

AURA unterstützt Spracheingabe über die Web Speech API, wenn der Browser sie bereitstellt. Der Sprachmodus startet nur per aktivem Klick im App-Fenster. Optional kann AURA Antworten per SpeechSynthesis vorlesen. Es gibt keine Hintergrundüberwachung.

## Sicherheit und Datenschutz

- Keine Malware, keine Exploits, keine gefährlichen Terminal-Funktionen.
- Keine API-Keys im Frontend; optionale Schlüssel bleiben in `.env.local` oder Deployment-Secrets.
- Standort, Mikrofon, Notifications, Dateien, Speech und Clipboard werden nur nach aktivem Nutzerklick vorbereitet oder abgefragt.
- Keine fremden App-Daten ohne offizielle Schnittstelle.
- Tankstellen können als Orte gefunden werden; Live-Spritpreise werden ohne erlaubte Datenquelle nicht angezeigt.
- News werden nicht erfunden: Wenn keine Live-Quelle verfügbar ist, zeigt die App einen leeren Zustand mit Erklärung.

## Setup lokal

```bash
npm install
npm run dev
```

Production-Build:

```bash
npm run build
npm run start
```

Optionale `.env.local`:

```bash
NEWS_API_KEY=
OPENAI_API_KEY=
OPTIONAL_GOOGLE_MAPS_API_KEY=
FUEL_API_KEY=
```

Keiner dieser Schlüssel ist für den kostenlosen Modus erforderlich.

## API Routes

- `app/api/weather` — Open-Meteo Forecast + Geocoding.
- `app/api/geocode` — Open-Meteo Geocoding.
- `app/api/news` — RSS/NewsOptional.
- `app/api/wiki` — Wikipedia/Wikimedia Summary.
- `app/api/places` — OpenStreetMap/Nominatim-Orte.
- `app/api/assistant` — lokaler Assistant oder optional OpenAI serverseitig.

## Native iOS später

Die Web-PWA kann viele Browser-Funktionen nutzen. iOS-native Integrationen wie EventKit, WeatherKit, HealthKit, Contacts, App Intents, Siri/Shortcuts, Keychain, native Document Picker und Background-Tasks gehören in die vorbereitete SwiftUI-Struktur unter `ios/AWSHackApple`. Der Ordnername bleibt aus Kompatibilitätsgründen bestehen; Produktname und UI sind AWS KI Manager.
