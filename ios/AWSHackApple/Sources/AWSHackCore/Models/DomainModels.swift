import Foundation

public enum PermissionState: String, Codable, Sendable, CaseIterable {
    case notRequested = "nicht angefragt"
    case granted = "erlaubt"
    case denied = "abgelehnt"
    case restricted = "eingeschränkt"
    case demo = "Demo"
}

public enum PermissionKind: String, Codable, Sendable, CaseIterable, Identifiable {
    case calendar, reminders, notifications, appAlarms, location, weather, health, contacts, files, microphone, speech, aiAPI
    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .calendar: "Kalender"
        case .reminders: "Erinnerungen"
        case .notifications: "Benachrichtigungen"
        case .appAlarms: "App-Wecker"
        case .location: "Standort"
        case .weather: "Wetter"
        case .health: "HealthKit"
        case .contacts: "Kontakte"
        case .files: "Dateien"
        case .microphone: "Mikrofon"
        case .speech: "Spracheingabe"
        case .aiAPI: "KI/API"
        }
    }
}

public struct PermissionDescriptor: Identifiable, Codable, Sendable, Hashable {
    public let id: PermissionKind
    public var state: PermissionState
    public let recommended: Bool
    public let capability: String
    public let fallback: String

    public init(id: PermissionKind, state: PermissionState = .notRequested, recommended: Bool, capability: String, fallback: String) {
        self.id = id
        self.state = state
        self.recommended = recommended
        self.capability = capability
        self.fallback = fallback
    }
}

public struct LocalAccount: Codable, Sendable, Equatable {
    public var username: String
    public var passwordHash: String
    public var avatarSymbol: String
    public var prefersBiometrics: Bool
    public var setupCompleted: Bool

    public init(username: String, passwordHash: String, avatarSymbol: String = "◉", prefersBiometrics: Bool = false, setupCompleted: Bool = false) {
        self.username = username
        self.passwordHash = passwordHash
        self.avatarSymbol = avatarSymbol
        self.prefersBiometrics = prefersBiometrics
        self.setupCompleted = setupCompleted
    }
}

public struct CalendarEntry: Identifiable, Codable, Sendable, Equatable {
    public var id: UUID
    public var title: String
    public var startDate: Date
    public var endDate: Date
    public var reminderMinutes: Int
    public var source: String

    public init(id: UUID = UUID(), title: String, startDate: Date, endDate: Date, reminderMinutes: Int = 30, source: String = "Demo") {
        self.id = id
        self.title = title
        self.startDate = startDate
        self.endDate = endDate
        self.reminderMinutes = reminderMinutes
        self.source = source
    }
}

public struct LifeReminder: Identifiable, Codable, Sendable, Equatable {
    public var id: UUID
    public var title: String
    public var dueDate: Date
    public var isCompleted: Bool
    public var source: String

    public init(id: UUID = UUID(), title: String, dueDate: Date, isCompleted: Bool = false, source: String = "Demo") {
        self.id = id
        self.title = title
        self.dueDate = dueDate
        self.isCompleted = isCompleted
        self.source = source
    }
}

public enum TaskPriority: String, Codable, Sendable, CaseIterable { case low = "niedrig", medium = "mittel", high = "hoch" }
public enum TaskStatus: String, Codable, Sendable, CaseIterable { case open = "offen", running = "läuft", done = "erledigt" }

public struct LifeTask: Identifiable, Codable, Sendable, Equatable {
    public var id: UUID
    public var title: String
    public var deadline: Date?
    public var priority: TaskPriority
    public var status: TaskStatus

    public init(id: UUID = UUID(), title: String, deadline: Date? = nil, priority: TaskPriority = .medium, status: TaskStatus = .open) {
        self.id = id
        self.title = title
        self.deadline = deadline
        self.priority = priority
        self.status = status
    }
}

public struct AppAlarm: Identifiable, Codable, Sendable, Equatable {
    public var id: UUID
    public var title: String
    public var fireDate: Date
    public var isEnabled: Bool
    public var isFallbackNotification: Bool

    public init(id: UUID = UUID(), title: String, fireDate: Date, isEnabled: Bool = true, isFallbackNotification: Bool = true) {
        self.id = id
        self.title = title
        self.fireDate = fireDate
        self.isEnabled = isEnabled
        self.isFallbackNotification = isFallbackNotification
    }
}

public struct WeatherSnapshot: Codable, Sendable, Equatable {
    public var locationName: String
    public var condition: String
    public var temperatureCelsius: Double
    public var rainChance: Double
    public var advisory: String
}

public struct HealthSummary: Codable, Sendable, Equatable {
    public var sleepHours: Double?
    public var steps: Int?
    public var heartRateNote: String?
}

public struct ContactSummary: Identifiable, Codable, Sendable, Equatable {
    public var id: UUID
    public var displayName: String
    public var detail: String

    public init(id: UUID = UUID(), displayName: String, detail: String) {
        self.id = id
        self.displayName = displayName
        self.detail = detail
    }
}

public struct FileSummary: Identifiable, Codable, Sendable, Equatable {
    public var id: UUID
    public var fileName: String
    public var summary: String

    public init(id: UUID = UUID(), fileName: String, summary: String) {
        self.id = id
        self.fileName = fileName
        self.summary = summary
    }
}

public struct DailyBriefing: Codable, Sendable, Equatable {
    public var greeting: String
    public var dateLine: String
    public var weather: WeatherSnapshot
    public var nextEvent: CalendarEntry?
    public var events: [CalendarEntry]
    public var reminders: [LifeReminder]
    public var tasks: [LifeTask]
    public var alarms: [AppAlarm]
    public var health: HealthSummary?
    public var recommendation: String
}
