# AWS Hack Apple — iPhone Jarvis Life-OS

AWS Hack Apple ist die Apple-first SwiftUI-Version von **AWS Hack / Artificial Workstation System**. Die App ist ein persönlicher, legaler Jarvis-Assistent für den eigenen Alltag. Sie liest Daten nur über offizielle Apple-Frameworks und nur nach aktiver Nutzerfreigabe.

## Xcode Setup

1. Xcode 16 oder neuer öffnen.
2. `ios/AWSHackApple/Package.swift` öffnen.
3. Für eine echte iPhone-App ein iOS App Target hinzufügen und die Libraries `AWSHackCore` und `AWSHackiOS` verlinken.
4. Bundle Identifier und Team setzen.
5. Benötigte Capabilities aktivieren.
6. Info.plist Permission Strings eintragen.
7. Auf iPhone Simulator oder Gerät bauen.

## Swift Package Build

```bash
cd ios/AWSHackApple
swift build
swift run AWSHackPreviewCLI
```

Der CLI-Build validiert die Core-Logik auf Linux/macOS ohne iOS-Simulator.

## Benötigte Capabilities

- App Sandbox / iOS App Sandbox Standard
- Calendars
- Reminders
- Push Notifications / User Notifications
- WeatherKit
- HealthKit optional
- Contacts optional
- Siri / App Intents
- Keychain Sharing optional, wenn Accountdaten über Targets geteilt werden

## Info.plist Permission Strings

- `NSCalendarsUsageDescription`
- `NSRemindersUsageDescription`
- `NSUserNotificationsUsageDescription` bzw. Notification Prompt über UserNotifications
- `NSLocationWhenInUseUsageDescription`
- `NSWeatherKitUsageDescription` falls im Target benötigt
- `NSHealthShareUsageDescription`
- `NSContactsUsageDescription`
- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`
- `NSFaceIDUsageDescription`
- Document Picker benötigt keine pauschale Dateisystem-Permission; Nutzer wählt Dateien aktiv aus.

## Apple APIs

- SwiftUI für UI
- MVVM über `AWSHackViewModel`
- EventKit für Kalender und Erinnerungen
- UserNotifications für lokale Hinweise und Test-Benachrichtigungen
- WeatherKit/CoreLocation vorbereitet über Provider-Protokolle
- HealthKit optional über Provider-Protokoll
- Contacts optional über Provider-Protokoll
- Document Picker / Share Sheet als legale Datei-/Chat-Zufuhr
- App Intents für Siri, Shortcuts, Spotlight und Apple Intelligence
- Keychain/LocalAuthentication vorbereitet; Demo-Build nutzt einen Core-kompatiblen Credential Store
- URLSession/OpenAI über `AIProviding` vorbereitet, keine API-Keys im Client

## Was echt funktioniert

- Swift Package baut mit `swift build`.
- Core-Logik für Daily Briefing, Intent Parsing, Entity Extraction und Command Execution.
- Demo-Provider für Kalender, Erinnerungen, Aufgaben, Alarme, Wetter, Health-Hinweis, Kontakte, Dateien, News und lokale AI.
- SwiftUI iPhone UI mit Bootscreen, Konto, Setup-Wizard, AURA Chat, Dashboard, Permission Center, Data Hub und Bottom Navigation.
- App Intents sind vorbereitet.
- Apple Provider für EventKit Kalender/Reminders und UserNotifications sind vorbereitet und nutzen echte Framework-Aufrufe, wenn auf Apple-Plattform gebaut.

## Demo/Fallback

- AlarmKit wird als Architektur vorbereitet; bis echte Verfügbarkeit/Entitlement nutzt die App eigene `AppAlarm`-Modelle und lokale Notifications als Fallback.
- WeatherKit, HealthKit, Contacts und Dateien sind über Provider und UI vorbereitet; ohne Freigabe/Demo laufen sichere Fallbacks.
- AURA nutzt lokal regelbasierte Antworten, bis ein bewusst aktivierter AIProvider verbunden wird.

## Grenzen bei Apple Clock, iMessage, WhatsApp & anderen Apps

- Bestehende Apple-Clock-Wecker werden nicht heimlich ausgelesen. AWS Hack verwaltet eigene App-Alarme oder nutzt Shortcuts/App Intents.
- iMessage, WhatsApp, Instagram, Snapchat und andere Apps werden nicht heimlich ausgelesen.
- Legale Wege: Text in AWS Hack kopieren, Share Sheet nutzen, Export/Datei wählen oder Shortcut/App Intent verwenden.

## App Intents / Shortcuts

Vorbereitet sind:

- Tagesbriefing anzeigen
- AURA fragen
- Aufgabe erstellen

Weitere Intents für Termin, Erinnerung, Wecker, Wetter und Dashboard können auf denselben Core-Commands aufbauen.

## OpenAI/API später anbinden

- `AIProviding` implementieren.
- API-Key nur serverseitig oder in einem eigenen Backend speichern.
- Nutzer muss KI/API bewusst aktivieren.
- Sensible Kalender-, Health-, Kontakt- oder Dateidaten nur mit ausdrücklicher Zustimmung an externe Systeme senden.

## Sicherheits- und Datenschutzgrenzen

- Keine Malware, Keylogger, Exploits oder iOS-Sicherheitsumgehung.
- Keine fremden App-Daten ohne offizielle Schnittstelle.
- Jede Datenquelle fragt einzeln über Apple APIs an.
- Ablehnung führt zu Demo-Modus oder In-App-Fallback.
- Health-Daten werden nicht medizinisch diagnostiziert.
- Dateien werden nur nach aktiver Auswahl gelesen.
