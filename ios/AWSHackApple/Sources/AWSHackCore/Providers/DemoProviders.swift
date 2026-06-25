import Foundation

public actor DemoPermissionManager: PermissionManaging {
    private var items: [PermissionDescriptor]

    public init(items: [PermissionDescriptor] = PermissionDescriptor.defaultSet) {
        self.items = items
    }

    public func descriptors() async -> [PermissionDescriptor] { items }

    public func request(_ kind: PermissionKind) async -> PermissionState {
        let next: PermissionState = kind == .health || kind == .contacts || kind == .location ? .demo : .granted
        items = items.map { descriptor in
            var copy = descriptor
            if copy.id == kind { copy.state = next }
            return copy
        }
        return next
    }

    public func setDemo(_ kind: PermissionKind) async {
        items = items.map { descriptor in
            var copy = descriptor
            if copy.id == kind { copy.state = .demo }
            return copy
        }
    }
}

public extension PermissionDescriptor {
    static let defaultSet: [PermissionDescriptor] = [
        .init(id: .calendar, recommended: true, capability: "EventKit liest und erstellt Kalendertermine nach iOS-Freigabe.", fallback: "Demo-Kalender mit lokalen Beispielen."),
        .init(id: .reminders, recommended: true, capability: "EventKit liest und erstellt Erinnerungen nach Freigabe.", fallback: "Lokale Demo-Erinnerungen."),
        .init(id: .notifications, recommended: true, capability: "UserNotifications plant lokale Hinweise und Test-Benachrichtigungen.", fallback: "In-App-Hinweise."),
        .init(id: .appAlarms, recommended: true, capability: "AlarmKit/App-eigene Alarme, falls verfügbar.", fallback: "Lokale Notifications als AWS-Hack-Wecker."),
        .init(id: .location, recommended: false, capability: "CoreLocation bestimmt Wetter-Ort nach Freigabe.", fallback: "Manueller Demo-Ort."),
        .init(id: .weather, recommended: true, capability: "WeatherKit lädt Wetter nach Berechtigung/Entitlement.", fallback: "Demo-Wetter."),
        .init(id: .health, recommended: false, capability: "HealthKit liest freigegebene Schlaf-/Aktivitätsdaten.", fallback: "Keine Health-Daten oder Demo-Hinweis."),
        .init(id: .contacts, recommended: false, capability: "Contacts sucht Kontakte nach Freigabe.", fallback: "Keine Kontaktübertragung; manuelle Eingabe."),
        .init(id: .files, recommended: true, capability: "Document Picker liest nur aktiv gewählte Dateien.", fallback: "Text manuell einfügen."),
        .init(id: .microphone, recommended: false, capability: "AVFoundation bereitet Mikrofon für Spracheingabe vor.", fallback: "Textchat."),
        .init(id: .speech, recommended: false, capability: "Speech Framework transkribiert nach Freigabe.", fallback: "Textchat."),
        .init(id: .aiAPI, recommended: false, capability: "AIProvider sendet Daten nur nach bewusster Aktivierung.", fallback: "Lokale regelbasierte AURA-Antworten.")
    ]
}

public actor DemoCalendarProvider: CalendarDataProviding {
    private var events: [CalendarEntry]

    public init(events: [CalendarEntry] = DemoSeed.events) { self.events = events }

    public func todayEvents() async throws -> [CalendarEntry] {
        events.filter { Calendar.current.isDateInToday($0.startDate) }.sorted { $0.startDate < $1.startDate }
    }

    public func nextEvent() async throws -> CalendarEntry? {
        events.filter { $0.startDate >= Date() }.sorted { $0.startDate < $1.startDate }.first
    }

    public func createEvent(title: String, startDate: Date, reminderMinutes: Int) async throws -> CalendarEntry {
        let entry = CalendarEntry(title: title, startDate: startDate, endDate: startDate.addingTimeInterval(3600), reminderMinutes: reminderMinutes)
        events.append(entry)
        return entry
    }
}

public actor DemoReminderProvider: ReminderDataProviding {
    private var reminders: [LifeReminder]

    public init(reminders: [LifeReminder] = DemoSeed.reminders) { self.reminders = reminders }

    public func remindersDueToday() async throws -> [LifeReminder] {
        reminders.filter { Calendar.current.isDateInToday($0.dueDate) && !$0.isCompleted }.sorted { $0.dueDate < $1.dueDate }
    }

    public func createReminder(title: String, dueDate: Date) async throws -> LifeReminder {
        let reminder = LifeReminder(title: title, dueDate: dueDate)
        reminders.append(reminder)
        return reminder
    }

    public func completeReminder(id: UUID) async throws {
        reminders = reminders.map { reminder in
            var copy = reminder
            if copy.id == id { copy.isCompleted = true }
            return copy
        }
    }
}

public actor DemoTaskProvider: TaskProviding {
    private var tasks: [LifeTask]
    public init(tasks: [LifeTask] = DemoSeed.tasks) { self.tasks = tasks }
    public func tasksDueToday() async throws -> [LifeTask] { tasks.filter { $0.status != .done } }
    public func createTask(title: String, deadline: Date?, priority: TaskPriority) async throws -> LifeTask {
        let task = LifeTask(title: title, deadline: deadline, priority: priority)
        tasks.append(task)
        return task
    }
    public func updateTask(_ task: LifeTask) async throws { tasks = tasks.map { $0.id == task.id ? task : $0 } }
}

public struct DemoWeatherProvider: WeatherProviding {
    public init() {}
    public func todayWeather() async throws -> WeatherSnapshot {
        WeatherSnapshot(locationName: "Demo-Ort", condition: "Leicht bewölkt", temperatureCelsius: 23, rainChance: 0.18, advisory: "Nimm genug Wasser mit.")
    }
}

public struct DemoHealthProvider: HealthProviding {
    public init() {}
    public func summary() async throws -> HealthSummary? { HealthSummary(sleepHours: nil, steps: nil, heartRateNote: "HealthKit nicht aktiviert; keine Diagnose.") }
}

public actor DemoAlarmProvider: AlarmProviding {
    private var items: [AppAlarm]
    public init(items: [AppAlarm] = DemoSeed.alarms) { self.items = items }
    public func alarms() async throws -> [AppAlarm] { items.sorted { $0.fireDate < $1.fireDate } }
    public func createAlarm(title: String, fireDate: Date) async throws -> AppAlarm {
        let alarm = AppAlarm(title: title, fireDate: fireDate, isFallbackNotification: true)
        items.append(alarm)
        return alarm
    }
    public func deleteAlarm(id: UUID) async throws { items.removeAll { $0.id == id } }
}

public struct DemoContactProvider: ContactProviding {
    public init() {}
    public func searchContacts(query: String) async throws -> [ContactSummary] {
        query.isEmpty ? [] : [ContactSummary(displayName: "Demo Kontakt", detail: "Nur Beispiel; echte Kontakte brauchen Freigabe.")]
    }
}

public struct DemoFileProvider: FileProviding {
    public init() {}
    public func summarizeSelectedFile(named fileName: String, contents: String) async throws -> FileSummary {
        let words = contents.split(whereSeparator: \.isWhitespace).prefix(60).joined(separator: " ")
        return FileSummary(fileName: fileName, summary: "Kurzfassung: \(words)")
    }
}

public struct DemoNewsProvider: NewsProviding {
    public init() {}
    public func headlines() async throws -> [String] {
        ["On-Device-KI wird wichtiger", "Passkeys verbessern Account-Sicherheit", "WeatherKit-Briefings werden persönlicher"]
    }
}

public struct LocalAIProvider: AIProviding {
    public init() {}
    public func complete(prompt: String, context: PersonalDataSnapshot) async throws -> String {
        "AURA Core verarbeitet lokal: \(prompt). Kontext: \(context.events.count) Termine, \(context.tasks.count) Aufgaben."
    }
}
