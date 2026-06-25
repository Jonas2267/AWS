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
