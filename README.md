# AWS KI Manager — Artificial Workstation System

AWS KI Manager ist ein kostenloses, persönliches Personal-KI-OS für Alltag, Arbeit, Schule, News, Wetter, Navigation, Aufgaben, Kalender, Dateien, Wissen, Sprache und Browser-Berechtigungen. Die App kombiniert ein hochwertiges Liquid-Glass-Interface mit AURA Core, einem lokalen KI-Assistenten, der ohne kostenpflichtige Pflicht-APIs sinnvoll funktioniert.

## Kostenloser Modus

Die App ist so gebaut, dass sie ohne API-Key startet:

- Wetter: Open-Meteo Forecast + Hourly Forecast, kostenlos und ohne API-Key.
- Geocoding: Open-Meteo Geocoding für Stadt -> Koordinaten, eigener `/api/geocode`-Proxy.
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
- `app/api/news` — RSS-News-Proxy + optional NewsAPI.
- `app/api/wiki` — Wikipedia/Wikimedia Kurzantworten.
- `app/api/places` — OpenStreetMap/Nominatim-Orte + Fallback.
- `app/api/assistant` — optional OpenAI, sonst kostenloser lokaler AURA-Modus.
- `lib/commands`, `lib/news`, `lib/weather`, `lib/navigation`, `lib/permissions`, `lib/storage` — modulare Provider, Types und Command-System.

## Checks

```bash
npm run build
```
