# AWS KI Manager

AWS KI Manager ist eine kostenlose, lokale Personal-Intelligence-Workstation für Alltag, Wissen, Wetter, News, Navigation, Aufgaben, Dateien, Fokus und Sprache. Die App folgt der Designsprache **Silent Intelligence UI**: ruhig, minimal, präzise, erwachsen und transparent.

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
# AWS KI Manager — Artificial Workstation System

AWS KI Manager ist ein kostenloses, persönliches Personal-KI-OS für Alltag, Arbeit, Schule, News, Wetter, Navigation, Aufgaben, Kalender, Dateien, Wissen, Sprache und Browser-Berechtigungen. Die App kombiniert ein hochwertiges Liquid-Glass-Interface mit AURA Core, einem lokalen KI-Assistenten, der ohne kostenpflichtige Pflicht-APIs sinnvoll funktioniert.

## Kostenloser Modus

Die App ist so gebaut, dass sie ohne API-Key startet:

- Wetter: Open-Meteo Forecast + Hourly Forecast, kostenlos und ohne API-Key.
- Geocoding: Open-Meteo Geocoding für Stadt -> Koordinaten, eigener `/api/geocode`-Proxy.
- Wetter: Open-Meteo, kostenlos und ohne API-Key.
- Geocoding: Open-Meteo Geocoding für Stadt -> Koordinaten.
- News: öffentliche RSS-Feeds über Next.js Server-Proxy; optional NewsAPI-Key als Zusatz.
- Wissen: Wikipedia/Wikimedia API, kostenlos und ohne Key.
- Orte: OpenStreetMap/Nominatim über Server-Route oder lokaler Fallback.
- Navigation: kostenlose Links zu Google Maps, Apple Karten und OpenStreetMap.
- KI: lokaler AURA-Modus; OpenAI ist optional und wird nur serverseitig über `.env.local` verwendet.
- Aufgaben, Termine, Erinnerungen, Notizen und Fokusmodus: lokal im Browser.


## Automatischer kostenloser Setup-/Connect-Wizard

Beim ersten Login öffnet AWS KI Manager automatisch den Premium-Wizard **„AWS KI Manager einrichten“**. Über **„Kostenlose Live-Funktionen verbinden“** werden alle kostenlosen Quellen geprüft und Browser-Berechtigungen nacheinander, transparent und nur nach Nutzerklick abgefragt.

Der Wizard speichert einen Provider-Status pro Modul:

- `connected` – kostenlos live verbunden, z. B. Open-Meteo, Wikipedia, OpenStreetMap oder Maps-Links.
- `available` – Funktion ist verfügbar, benötigt aber eine Nutzeraktion, z. B. File Picker.
- `permission-needed` – Browser-Freigabe ist erforderlich.
- `optional-key-needed` – optionaler API-Key möglich, aber nicht Pflicht.
- `blocked`, `unavailable`, `fallback` – transparent angezeigte Einschränkungen mit lokalem Fallback.

Automatisch geprüft werden Open-Meteo Wetter/Geocoding, Wikipedia/Wikimedia, OpenStreetMap/Nominatim-Orte, kostenlose Maps-Links, RSS-News/Fallback, lokaler Speicher und der kostenlose lokale AURA-Modus. Tankstellen können als Orte gefunden werden; echte Spritpreise werden nicht behauptet und benötigen eine rechtlich erlaubte Fuel-Quelle.

In Dashboard und Einstellungen zeigt die **Verbindungszentrale**, welche Funktionen verbunden sind. Über Einstellungen lassen sich Setup, Provider-Tests und Berechtigungsprüfung erneut starten.

## Sicherheit und Datenschutz

- Keine Malware, keine Exploits, keine heimliche Überwachung und keine gefährlichen Terminal-Funktionen.
- Keine API-Keys im Frontend; optionale Schlüssel bleiben in `.env.local` oder Deployment-Secrets.
- Standort, Mikrofon, Notifications, Dateien, Speech und Clipboard werden nur nach aktivem Nutzerklick vorbereitet oder abgefragt.
- Keine fremden App-Daten ohne offizielle Schnittstelle.
- Wenn Live-Daten nicht verfügbar sind, zeigt die App kleine professionelle Status-Badges wie `Live kostenlos`, `Lokal`, `Fallback`, `API optional`, `Freigabe fehlt` oder `Offline`.

## Lokal starten

```bash
npm install
cp .env.example .env.local
npm run dev
```

Produktionsbuild:

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
## Optionale `.env.local`

```env
NEWS_API_KEY=
OPENAI_API_KEY=
OPTIONAL_GOOGLE_MAPS_API_KEY=
```

Open-Meteo, Wikipedia, OpenStreetMap/Nominatim und Maps-Links benötigen keinen Key.

## Hauptfunktionen

- Premium Login/Onboarding mit lokalem Account, Passwort-Hash und wiederkehrendem AURA-Start.
- Ansicht **Heute** mit Tagesbriefing, Wetter, Aufgaben, Terminen, Erinnerungen und Schnellzugriffen.
- Neue Website-Topbar plus Floating Quick Dock für Desktop und Mobile.
- AURA Core Chat für Befehle wie „Wie sieht mein Tag aus?“, „Was ist heute in Deutschland passiert?“, „Wie ist das Wetter?“, „Finde eine Apotheke“, „Suche Wikipedia nach …“ oder „Öffne Fokusmodus“.
- News-Modul mit kostenloser RSS-Strategie, Kategorien, Suche und optionalem NewsAPI-Fallback.
- Wetter-Modul mit Open-Meteo, Ortssuche, stündlichem Forecast, 30-Minuten-Hinweis über nächsten Stundenwert, Regen-/Gewitter-/Sonnen-/Wind-Risiken und Tageshoch/-tief.
- AURA Core Chat für Befehle wie „Wie sieht mein Tag aus?“, „Was ist heute in Deutschland passiert?“, „Wie ist das Wetter?“, „Finde eine Apotheke“, „Suche Wikipedia nach …“ oder „Öffne Fokusmodus“.
- News-Modul mit kostenloser RSS-Strategie, Kategorien, Suche und optionalem NewsAPI-Fallback.
- Wetter-Modul mit Open-Meteo, Temperatur, Tageshoch/-tief, Regenwahrscheinlichkeit, Wind und Wettercode-Text.
- Navigation/Places mit Browser-Standort, OSM/Nominatim, Fallback-Orten, Tankstellen ohne behauptete Echtpreise und kostenlosen Kartenlinks.
- Wikipedia-Modul mit Kurz-Zusammenfassung und Quelle.
- Lokale Notizen mit Suche-/Zusammenfassungsgrundlage für AURA.
- Fokusmodus mit lokalem Timer, Aufgabenbezug und Motivation.
- Permission Center mit echten Browser-APIs für Notifications, Geolocation, Mikrofon, Speech-Erkennung und Datei-Auswahl.
- Dateien-Modul: liest Textdateien nur nach aktivem File-Picker-Klick.
- Command Palette wie Spotlight über `Ctrl+K` / `Cmd+K`.
- Settings Drawer für Darstellung, AURA-Stil, lokale Daten, Datenschutz, Wetter und Navigation.

## Browser-Berechtigungen

| Bereich | Browser-API | Verhalten |
| --- | --- | --- |
| Notifications | `Notification.requestPermission()` | Test-Notification, Reminder-Fallback in der App |
| Standort | `navigator.geolocation.getCurrentPosition()` | Nur einmalig nach Klick, keine Dauerüberwachung |
| Mikrofon | `navigator.mediaDevices.getUserMedia({ audio: true })` | Nur nach Klick, sichtbarer Aktivstatus, Stop-Button |
| Sprache | Web Speech API | Nur vorbereitet/aktiv wenn unterstützt und vom Nutzer gestartet |
| Dateien | `<input type="file">` | Lokales Lesen ausgewählter Textdateien |
| Clipboard | spätere explizite Klick-Aktion | Keine heimliche Zwischenablage |

## Native iOS später

Die Web-PWA kann viel im Browser, aber iOS-native Funktionen wie EventKit, WeatherKit, HealthKit, Contacts, App Intents, Siri/Shortcuts, Keychain, native Document Picker und Background-Tasks gehören in die vorbereitete SwiftUI-Struktur unter `ios/AWSHackApple`. Der Ordnername bleibt technisch bestehen; Produktname und UI sind AWS KI Manager.

## Grenzen

- Apple-Clock-Wecker, iMessage, WhatsApp, Instagram, Snapchat und andere App-Daten werden nicht heimlich ausgelesen.
- Spritpreise werden nicht als echt behauptet, solange keine legale Quelle angebunden ist.
- Google Maps Platform und OpenAI sind optional, nicht Voraussetzung.
- Externe KI bekommt sensible Daten nur, wenn Nutzer das später bewusst aktiviert und die Daten minimiert gesendet werden.

## Architektur

- `app/page.tsx` — PWA Shell, Premium UI, AURA, Heute, Dashboard, Module, echte Browser-Permissions.
- `app/api/weather` — Open-Meteo Forecast, Hourly Forecast, Tageswerte und Wettercode-Mapping.
- `app/api/geocode` — Open-Meteo Geocoding.
- `app/api/weather` — Open-Meteo Wetter + Geocoding.
- `app/api/news` — RSS-News-Proxy + optional NewsAPI.
- `app/api/wiki` — Wikipedia/Wikimedia Kurzantworten.
- `app/api/places` — OpenStreetMap/Nominatim-Orte + Fallback.
- `app/api/assistant` — optional OpenAI, sonst kostenloser lokaler AURA-Modus.
- `lib/commands`, `lib/news`, `lib/weather`, `lib/navigation`, `lib/permissions`, `lib/storage` — modulare Provider, Types und Command-System.

## Checks

```bash
npm run build
```
# AWS Hack — Artificial Workstation System Hack

AWS Hack ist ein fiktives, legales Cyber-OS im Jarvis-Stil für den eigenen PC und das eigene Handy. Die App ist **kein Hacking-Tool**: Terminal, Scan-Optik, Systemstatus und Cyber-Animationen sind Simulationen oder lokale Automatisierung nach aktiver Nutzerfreigabe.

## Setup

```bash
npm install
npm run dev
npm run build
```

Danach `http://localhost:3000` öffnen. Beim ersten Start wird ein lokaler Demo-Account erstellt, danach folgt Login, Bootscreen, Setup-Assistent und AURA-Core-Hauptscreen.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PWA Manifest und Service Worker
- LocalStorage-Demo-Speicher
- Mobile-First UI mit Desktop-Cyber-OS Shell


## Apple-first iPhone App

Zusätzlich zur Web/PWA-Demo gibt es jetzt unter `ios/AWSHackApple` eine Swift/SwiftUI/MVVM-Version für iPhone mit Core-Provider-Schicht, Daily Briefing, AURA Command-System, Permission Center, EventKit/UserNotifications-Vorbereitung, App Intents und sicherem Demo-Fallback. Details stehen in `ios/AWSHackApple/README.md`.

## Was jetzt funktioniert

- Lokales Onboarding mit Passwort-Hashing, Login, Logout und Session-Speicherung
- Setup-Assistent „AWS Hack einrichten“ für Konto, Notifications, Kalender, News, Dateien, Mikrofon und PWA-Installation
- Mobile Hauptansicht mit AURA Core Chat, großen Touchflächen, Bottom Navigation, Schnellkarten für Kalender und Aufgaben
- Desktop-Ansicht mit Cyber-OS Sidebar, Topbar, Fensterkarten, Neon-Glow und Jarvis-Kugelanimation
- AURA Core Command-System mit deutscher Intent-Erkennung
- Sprach-/Texteingaben wie „Erstelle morgen um 8 Uhr einen Termin Schule“ oder „Erstelle eine Aufgabe: Mathe lernen, hohe Priorität“
- Kalender-Events mit Reminder-Minuten und optisch sichtbaren anstehenden Erinnerungen
- Benachrichtigungs-Test über Browser Notification API, Fallback als In-App-Hinweis
- Aufgabenmodul mit Priorität und Status
- Newsmodul mit Kategorien, Suche und Demo-Zusammenfassung
- Permission Center mit transparenten Statuswerten und geführtem Setup
- Dateienmodul mit File Picker nur nach aktivem Nutzerklick
- Terminal-Simulation mit erlaubten Befehlen und Blockierung gefährlicher Kommandos
- Systemstatus als klar markierte Demo-/API-Vorbereitung

## Demo-Daten

Die App startet mit Beispielterminen, Beispielaufgaben, Beispiel-News, Beispiel-KI-Befehlen und Terminalausgaben. Dadurch wirkt die mobile und Desktop-Oberfläche direkt wie ein aktives Jarvis-System.

## API-Vorbereitung

Adapter und Provider liegen modular unter `lib/`:

- `GoogleCalendarProvider` und `MicrosoftCalendarProvider` in `lib/calendar/calendar.ts`
- `OpenAIProvider` und `LocalDemoProvider` in `lib/ai/ai.ts`
- `NewsApiProvider` und `LocalDemoNewsProvider` in `lib/news/news.ts`
- `BrowserNotificationProvider` in `lib/notifications/notifications.ts`
- `LocalDemoTaskProvider` in `lib/tasks/tasks.ts`
- `LocalStorageProvider` in `lib/storage/localStorageProvider.ts`

## Was Demo ist

- Systemmetriken wie CPU/RAM/Netzwerk
- Newsfeed und News-Zusammenfassungen
- AURA-Antworten ohne echte KI-API
- Kalender-Sync mit Google/Microsoft/Apple
- Kontakte, Standort, Kamera und Mikrofon, bis echte Browser-/Native-APIs per Nutzerfreigabe verbunden werden
- Terminal-Befehle und `scan-local`

## Was später echte APIs braucht

- Google Calendar: OAuth, minimale Scopes, serverseitige Token-Verwaltung
- Microsoft Calendar: Microsoft Graph OAuth und least privilege
- OpenAI: serverseitige API-Route, keine API-Keys im Browser
- News API: serverseitiger Proxy, Rate-Limits und Quellenfilter
- Push Notifications: VAPID Keys, Push Subscription Backend und Service-Worker-Push-Handler
- Mobile Native: Capacitor Plugins für Kalender, Mikrofon, Kontakte und Notifications
- Desktop Native: Tauri/Electron Allowlist und sichtbare Nutzerfreigaben

## Sicherheitsgrenzen

- Keine echten Hacks, Exploits, Malware oder Netzwerkangriffe
- Keine Keylogger, Credential-Stealer, Backdoors oder heimliche Remote-Control
- Keine heimlichen Berechtigungen und keine Dateiüberwachung
- Kein Zugriff auf fremde Daten oder fremde Dienste ohne offiziellen OAuth-Flow
- Keine Umgehung von Betriebssystem-Berechtigungen
- Gefährliche Terminal-Befehle werden blockiert und erklärt
- Demo-Passwort wird gehasht gespeichert; Produktion braucht Backend/Auth und sichere Sessions
