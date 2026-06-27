import Foundation

public protocol PermissionManaging: Sendable {
    func descriptors() async -> [PermissionDescriptor]
    func request(_ kind: PermissionKind) async -> PermissionState
    func setDemo(_ kind: PermissionKind) async
}

public protocol CalendarDataProviding: Sendable {
    func todayEvents() async throws -> [CalendarEntry]
    func nextEvent() async throws -> CalendarEntry?
    func createEvent(title: String, startDate: Date, reminderMinutes: Int) async throws -> CalendarEntry
}

public protocol ReminderDataProviding: Sendable {
    func remindersDueToday() async throws -> [LifeReminder]
    func createReminder(title: String, dueDate: Date) async throws -> LifeReminder
    func completeReminder(id: UUID) async throws
}

public protocol NotificationProviding: Sendable {
    func requestAuthorization() async -> PermissionState
    func schedule(title: String, body: String, date: Date) async throws
    func sendTestNotification() async throws
}

public protocol AlarmProviding: Sendable {
    func alarms() async throws -> [AppAlarm]
    func createAlarm(title: String, fireDate: Date) async throws -> AppAlarm
    func deleteAlarm(id: UUID) async throws
}

public protocol TaskProviding: Sendable {
    func tasksDueToday() async throws -> [LifeTask]
    func createTask(title: String, deadline: Date?, priority: TaskPriority) async throws -> LifeTask
    func updateTask(_ task: LifeTask) async throws
}

public protocol WeatherProviding: Sendable {
    func todayWeather() async throws -> WeatherSnapshot
}

public protocol HealthProviding: Sendable {
    func summary() async throws -> HealthSummary?
}

public protocol ContactProviding: Sendable {
    func searchContacts(query: String) async throws -> [ContactSummary]
}

public protocol FileProviding: Sendable {
    func summarizeSelectedFile(named fileName: String, contents: String) async throws -> FileSummary
}

public protocol NewsProviding: Sendable {
    func headlines() async throws -> [String]
}

public protocol AIProviding: Sendable {
    func complete(prompt: String, context: PersonalDataSnapshot) async throws -> String
}

public protocol LocationProviding: Sendable {
    func requestWhenInUseAuthorization() async -> PermissionState
    func currentLocation() async throws -> UserLocation
    func manualLocation(address: String) async throws -> UserLocation
}

public protocol PlacesProviding: Sendable {
    func search(category: PlaceCategory, near location: UserLocation, query: String?) async throws -> [PlaceResult]
    func favoritePlace(_ category: PlaceCategory) async throws -> PlaceResult?
}

public protocol FuelPriceProviding: Sendable {
    func enrichFuelPrices(_ places: [PlaceResult]) async throws -> [PlaceResult]
    func cheapestFuelStation(near location: UserLocation) async throws -> NavigationRecommendation
}

public protocol NavigationProviding: Sendable {
    func routeURL(destination: PlaceResult, mode: NavigationMode, preference: NavigationAppPreference) async -> URL
    func openNavigation(destination: PlaceResult, mode: NavigationMode, preference: NavigationAppPreference) async -> URL
}
