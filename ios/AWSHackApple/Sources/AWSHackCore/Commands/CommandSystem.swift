import Foundation

public enum AssistantIntent: String, Sendable, CaseIterable {
    case dailyBriefing, getTodayOverview, listCalendarEvents, createCalendarEvent, listReminders, createReminder
    case scheduleNotification, listAlarms, createAlarm, getWeather, summarizeTasks, createTask, summarizeFile
    case searchContacts, requestPermission, openSettings, unknown
}

public struct CommandEntities: Sendable, Equatable {
    public var title: String?
    public var date: Date?
    public var reminderMinutes: Int?
    public var priority: TaskPriority?
    public var permission: PermissionKind?
    public var missingFields: [String]

    public init(title: String? = nil, date: Date? = nil, reminderMinutes: Int? = nil, priority: TaskPriority? = nil, permission: PermissionKind? = nil, missingFields: [String] = []) {
        self.title = title
        self.date = date
        self.reminderMinutes = reminderMinutes
        self.priority = priority
        self.permission = permission
        self.missingFields = missingFields
    }
}

public struct ParsedCommand: Sendable, Equatable {
    public let rawText: String
    public let intent: AssistantIntent
    public let entities: CommandEntities
}

public struct CommandParser: Sendable {
    private let detector = IntentDetector()
    private let extractor = EntityExtractor()

    public init() {}

    public func parse(_ text: String) -> ParsedCommand {
        let intent = detector.detect(text)
        var entities = extractor.extract(from: text, intent: intent)
        var missing: [String] = []
        if [.createCalendarEvent, .createReminder, .createTask, .createAlarm].contains(intent), entities.title == nil {
            missing.append("Titel")
        }
        if [.createCalendarEvent, .createReminder, .createAlarm].contains(intent), entities.date == nil {
            entities.date = EntityExtractor.defaultDate(for: intent)
        }
        entities.missingFields = missing
        return ParsedCommand(rawText: text, intent: intent, entities: entities)
    }
}

public struct IntentDetector: Sendable {
    public init() {}

    public func detect(_ input: String) -> AssistantIntent {
        let text = input.normalizedGerman
        if text.containsAny(["morgen briefing", "tagesbriefing", "wie sieht mein tag", "wichtigsten infos", "mein tag heute"]) { return .dailyBriefing }
        if text.containsAny(["was steht heute", "heute im kalender", "naechster termin", "kalender"]) && !text.containsAny(["erstelle", "plane"]) { return .listCalendarEvents }
        if text.containsAny(["termin", "event", "kalender"]) && text.containsAny(["erstelle", "plane", "trag", "anlegen"]) { return .createCalendarEvent }
        if text.containsAny(["erinnerung", "erinnere mich"]) && text.containsAny(["erstelle", "erinnere", "anlegen"]) { return .createReminder }
        if text.containsAny(["erinnerungen"]) { return .listReminders }
        if text.containsAny(["wecker", "alarm", "timer"]) && text.containsAny(["stell", "erstelle", "anlegen"]) { return .createAlarm }
        if text.containsAny(["wecker", "alarm"]) { return .listAlarms }
        if text.containsAny(["wetter", "temperatur", "regen"]) { return .getWeather }
        if text.containsAny(["aufgabe", "task", "todo"]) && text.containsAny(["erstelle", "anlegen", "notier"]) { return .createTask }
        if text.containsAny(["aufgaben", "was muss", "todo", "tagesplan"]) { return .summarizeTasks }
        if text.containsAny(["datei", "pdf", "dokument"]) && text.containsAny(["fass", "zusammen", "summarize"]) { return .summarizeFile }
        if text.containsAny(["kontakt", "kontakte"]) { return .searchContacts }
        if text.containsAny(["berechtigung", "rechte", "fehlen", "freigabe"]) { return .requestPermission }
        if text.containsAny(["benachrichtigung", "notification"]) { return .scheduleNotification }
        return .unknown
    }
}

public struct EntityExtractor: Sendable {
    public init() {}

    public func extract(from input: String, intent: AssistantIntent) -> CommandEntities {
        let text = input.normalizedGerman
        var entities = CommandEntities()
        entities.date = Self.parseDate(text)
        entities.reminderMinutes = Self.parseReminderMinutes(text)
        entities.priority = text.containsAny(["hoch", "dringend", "wichtig"]) ? .high : text.contains("niedrig") ? .low : .medium
        entities.permission = PermissionKind.allCases.first { text.contains($0.title.normalizedGerman) }
        entities.title = Self.parseTitle(input, intent: intent)
        return entities
    }

    public static func defaultDate(for intent: AssistantIntent) -> Date {
        let baseHour = intent == .createAlarm ? 6 : 9
        return Calendar.current.date(bySettingHour: baseHour, minute: intent == .createAlarm ? 30 : 0, second: 0, of: Date()) ?? Date()
    }

    private static func parseDate(_ text: String) -> Date? {
        let calendar = Calendar.current
        var dayOffset = 0
        if text.contains("uebermorgen") { dayOffset = 2 }
        else if text.contains("morgen") { dayOffset = 1 }
        var date = calendar.date(byAdding: .day, value: dayOffset, to: Date()) ?? Date()
        if let time = parseTime(text) {
            date = calendar.date(bySettingHour: time.hour, minute: time.minute, second: 0, of: date) ?? date
            return date
        }
        if dayOffset > 0 || text.contains("heute") { return date }
        return nil
    }

    private static func parseTime(_ text: String) -> (hour: Int, minute: Int)? {
        let patterns = [#"(\d{1,2})[:\.](\d{2})"#, #"um\s+(\d{1,2})\s*uhr"#, #"\b(\d{1,2})\s*uhr"#]
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern), let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) else { continue }
            let hourText = String(text[Range(match.range(at: 1), in: text)!])
            let minuteText = match.numberOfRanges > 2 && match.range(at: 2).location != NSNotFound ? String(text[Range(match.range(at: 2), in: text)!]) : "00"
            return (Int(hourText) ?? 9, Int(minuteText) ?? 0)
        }
        return nil
    }

    private static func parseReminderMinutes(_ text: String) -> Int? {
        guard let regex = try? NSRegularExpression(pattern: #"(\d{1,3})\s*(min|minute|minuten)"#),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range(at: 1), in: text) else { return nil }
        return Int(text[range])
    }

    private static func parseTitle(_ input: String, intent: AssistantIntent) -> String? {
        if let colon = input.split(separator: ":", maxSplits: 1).last, input.contains(":") {
            return String(colon).trimmedNilIfEmpty
        }
        var title = input
        ["Erstelle", "erstelle", "Plane", "plane", "Termin", "termin", "Aufgabe", "aufgabe", "Erinnerung", "erinnerung", "Wecker", "wecker", "morgen", "heute", "einen", "eine", "ein", "den", "die", "das", "um"].forEach { title = title.replacingOccurrences(of: $0, with: "") }
        title = title.replacingOccurrences(of: #"\d{1,2}([:\.]\d{2})?\s*uhr"#, with: "", options: [.regularExpression, .caseInsensitive])
        if [.dailyBriefing, .getWeather, .listCalendarEvents, .summarizeTasks, .requestPermission, .unknown].contains(intent) { return nil }
        return title.trimmedNilIfEmpty
    }
}

public struct CommandExecutor: Sendable {
    public let hub: PersonalDataHub
    public let permissions: PermissionManaging

    public init(hub: PersonalDataHub, permissions: PermissionManaging) {
        self.hub = hub
        self.permissions = permissions
    }

    public func execute(_ command: ParsedCommand, username: String) async -> String {
        if !command.entities.missingFields.isEmpty {
            return "Ich brauche noch: \(command.entities.missingFields.joined(separator: ", ")). Beispiel: Erstelle morgen um 8 Uhr einen Termin Schule."
        }
        do {
            switch command.intent {
            case .dailyBriefing, .getTodayOverview:
                let briefing = await hub.dailyBriefing(for: username)
                return DailyBriefingBuilder.response(username: username, briefing: briefing)
            case .listCalendarEvents:
                let events = try await hub.calendar.todayEvents()
                return events.isEmpty ? "Heute sind keine Termine eingetragen." : "Heute: " + events.map { "\($0.title) um \($0.startDate.formatted(date: .omitted, time: .shortened))" }.joined(separator: ", ")
            case .createCalendarEvent:
                let entry = try await hub.calendar.createEvent(title: command.entities.title ?? "Termin", startDate: command.entities.date ?? Date(), reminderMinutes: command.entities.reminderMinutes ?? 30)
                return "Termin \(entry.title) wurde für \(entry.startDate.formatted(date: .abbreviated, time: .shortened)) angelegt."
            case .listReminders:
                let reminders = try await hub.reminders.remindersDueToday()
                return reminders.isEmpty ? "Keine offenen Erinnerungen heute." : reminders.map(\.title).joined(separator: ", ")
            case .createReminder:
                let reminder = try await hub.reminders.createReminder(title: command.entities.title ?? "Erinnerung", dueDate: command.entities.date ?? Date())
                return "Erinnerung erstellt: \(reminder.title)."
            case .scheduleNotification:
                try await hub.notifications.sendTestNotification()
                return "Test-Benachrichtigung wurde geplant oder als In-App-Fallback vorbereitet."
            case .listAlarms:
                let alarms = try await hub.alarms.alarms()
                return alarms.isEmpty ? "Kein AWS-Hack-Wecker aktiv." : alarms.map { "\($0.title) um \($0.fireDate.formatted(date: .omitted, time: .shortened))" }.joined(separator: ", ")
            case .createAlarm:
                let alarm = try await hub.alarms.createAlarm(title: command.entities.title ?? "AWS-Hack-Wecker", fireDate: command.entities.date ?? Date())
                return "AWS-Hack-Wecker aktiv: \(alarm.fireDate.formatted(date: .omitted, time: .shortened)). Apple-Clock-Wecker werden nicht heimlich ausgelesen."
            case .getWeather:
                let weather = try await hub.weather.todayWeather()
                return "Wetter in \(weather.locationName): \(weather.condition), \(Int(weather.temperatureCelsius))°C, Regen \(Int(weather.rainChance * 100))%. \(weather.advisory)"
            case .summarizeTasks:
                let tasks = try await hub.tasks.tasksDueToday()
                return tasks.isEmpty ? "Keine offenen Aufgaben." : "Aufgaben: " + tasks.map { "\($0.title) (\($0.priority.rawValue))" }.joined(separator: ", ")
            case .createTask:
                let task = try await hub.tasks.createTask(title: command.entities.title ?? "Aufgabe", deadline: command.entities.date, priority: command.entities.priority ?? .medium)
                return "Aufgabe erstellt: \(task.title), Priorität \(task.priority.rawValue)."
            case .summarizeFile:
                return "Wähle eine Datei über den Document Picker aus. Ich lese nichts heimlich."
            case .searchContacts:
                return "Kontaktsuche benötigt Contacts-Freigabe. Ohne Freigabe kannst du Namen manuell eingeben."
            case .requestPermission:
                let missing = await permissions.descriptors().filter { $0.recommended && $0.state != .granted }
                return missing.isEmpty ? "Alle empfohlenen Berechtigungen sind aktiv." : "Es fehlen: \(missing.map { $0.id.title }.joined(separator: ", ")). Öffne das Permission Center."
            case .openSettings:
                return "Öffne iOS Einstellungen für AWS Hack, wenn eine Berechtigung abgelehnt wurde."
            case .unknown:
                return "Das habe ich noch nicht sicher erkannt. Ich kann Tagesbriefing, Kalender, Erinnerungen, Wecker, Wetter, Aufgaben, Dateien und Rechte steuern."
            }
        } catch {
            return "Ich konnte die Aktion nicht abschließen: \(error.localizedDescription)"
        }
    }
}

public struct AssistantResponseBuilder: Sendable {
    public init() {}
    public func response(for output: String) -> String { "AURA Core: \(output)" }
}

private extension String {
    var normalizedGerman: String {
        lowercased()
            .replacingOccurrences(of: "ä", with: "ae")
            .replacingOccurrences(of: "ö", with: "oe")
            .replacingOccurrences(of: "ü", with: "ue")
            .replacingOccurrences(of: "ß", with: "ss")
    }

    func containsAny(_ needles: [String]) -> Bool { needles.contains { normalizedGerman.contains($0.normalizedGerman) } }
    var trimmedNilIfEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines.union(.punctuationCharacters))
        return trimmed.isEmpty ? nil : trimmed
    }
}
