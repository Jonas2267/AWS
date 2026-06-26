import Foundation

public enum PermissionState: String, Codable, Sendable, CaseIterable {
    case notRequested = "nicht angefragt"
    case granted = "erlaubt"
    case denied = "abgelehnt"
    case restricted = "eingeschränkt"
    case demo = "Demo"
}

public enum PermissionKind: String, Codable, Sendable, CaseIterable, Identifiable {
    case calendar, reminders, notifications, appAlarms, location, navigation, weather, health, contacts, files, microphone, speech, aiAPI
    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .calendar: "Kalender"
        case .reminders: "Erinnerungen"
        case .notifications: "Benachrichtigungen"
        case .appAlarms: "App-Wecker"
        case .location: "Standort"
        case .navigation: "Standort & Navigation"
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

public enum PlaceCategory: String, Codable, Sendable, CaseIterable, Identifiable {
    case fuel, supermarket, pharmacy, hospital, parking, workshop, restaurant, clothing, atm, school, work, home, parcelStation, evCharging
    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .fuel: "Tankstelle"
        case .supermarket: "Supermarkt"
        case .pharmacy: "Apotheke"
        case .hospital: "Krankenhaus/Notfall"
        case .parking: "Parkplatz"
        case .workshop: "Werkstatt"
        case .restaurant: "Restaurant/Fast Food"
        case .clothing: "Kleidung"
        case .atm: "Geldautomat"
        case .school: "Schule"
        case .work: "Arbeit"
        case .home: "Zuhause"
        case .parcelStation: "Paketstation"
        case .evCharging: "Elektro-Ladestation"
        }
    }
}

public enum NavigationMode: String, Codable, Sendable, CaseIterable, Identifiable {
    case driving = "Auto"
    case walking = "Zu Fuß"
    case cycling = "Fahrrad"
    case transit = "ÖPNV"
    public var id: String { rawValue }
}

public enum NavigationAppPreference: String, Codable, Sendable, CaseIterable {
    case automatic, appleMaps, googleMaps
}

public struct Coordinate: Codable, Sendable, Equatable {
    public var latitude: Double
    public var longitude: Double
    public init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }
}

public struct UserLocation: Codable, Sendable, Equatable {
    public var coordinate: Coordinate
    public var label: String
    public var isDemo: Bool
    public init(coordinate: Coordinate, label: String, isDemo: Bool) {
        self.coordinate = coordinate
        self.label = label
        self.isDemo = isDemo
    }
}

public struct PlaceResult: Identifiable, Codable, Sendable, Equatable {
    public var id: UUID
    public var name: String
    public var category: PlaceCategory
    public var address: String
    public var coordinate: Coordinate
    public var distanceKilometers: Double
    public var estimatedTravelMinutes: Int
    public var isOpen: Bool
    public var rating: Double?
    public var fuelPricePerLiter: Double?
    public var isDemo: Bool

    public init(id: UUID = UUID(), name: String, category: PlaceCategory, address: String, coordinate: Coordinate, distanceKilometers: Double, estimatedTravelMinutes: Int, isOpen: Bool = true, rating: Double? = nil, fuelPricePerLiter: Double? = nil, isDemo: Bool = true) {
        self.id = id
        self.name = name
        self.category = category
        self.address = address
        self.coordinate = coordinate
        self.distanceKilometers = distanceKilometers
        self.estimatedTravelMinutes = estimatedTravelMinutes
        self.isOpen = isOpen
        self.rating = rating
        self.fuelPricePerLiter = fuelPricePerLiter
        self.isDemo = isDemo
    }
}

public struct NavigationRecommendation: Codable, Sendable, Equatable {
    public var query: String
    public var category: PlaceCategory
    public var recommended: PlaceResult?
    public var alternatives: [PlaceResult]
    public var explanation: String
    public var usedDemoData: Bool

    public init(query: String, category: PlaceCategory, recommended: PlaceResult?, alternatives: [PlaceResult], explanation: String, usedDemoData: Bool) {
        self.query = query
        self.category = category
        self.recommended = recommended
        self.alternatives = alternatives
        self.explanation = explanation
        self.usedDemoData = usedDemoData
    }
}

public struct FavoritePlace: Identifiable, Codable, Sendable, Equatable {
    public var id: UUID
    public var category: PlaceCategory
    public var label: String
    public var address: String
    public var coordinate: Coordinate

    public init(id: UUID = UUID(), category: PlaceCategory, label: String, address: String, coordinate: Coordinate) {
        self.id = id
        self.category = category
        self.label = label
        self.address = address
        self.coordinate = coordinate
    }
}
