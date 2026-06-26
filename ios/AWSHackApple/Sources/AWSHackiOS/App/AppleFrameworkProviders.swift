#if canImport(Foundation)
import Foundation
import AWSHackCore
#endif

#if canImport(EventKit)
import EventKit
#endif
#if canImport(UserNotifications)
import UserNotifications
#endif
#if canImport(CoreLocation)
import CoreLocation
#endif
#if canImport(Contacts)
import Contacts
#endif

public final class AppleCalendarProvider: CalendarDataProviding, @unchecked Sendable {
    #if canImport(EventKit)
    private let store = EKEventStore()
    #endif

    public init() {}

    public func todayEvents() async throws -> [CalendarEntry] {
        #if canImport(EventKit)
        let granted = try await requestCalendarAccessIfNeeded()
        guard granted else { return DemoSeed.events }
        let start = Calendar.current.startOfDay(for: Date())
        let end = Calendar.current.date(byAdding: .day, value: 1, to: start) ?? Date()
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
        return store.events(matching: predicate).map { CalendarEntry(title: $0.title, startDate: $0.startDate, endDate: $0.endDate, reminderMinutes: $0.alarms?.first?.relativeOffset.minutesBefore ?? 30, source: "EventKit") }
        #else
        return DemoSeed.events
        #endif
    }

    public func nextEvent() async throws -> CalendarEntry? { try await todayEvents().sorted { $0.startDate < $1.startDate }.first }

    public func createEvent(title: String, startDate: Date, reminderMinutes: Int) async throws -> CalendarEntry {
        #if canImport(EventKit)
        let granted = try await requestCalendarAccessIfNeeded()
        guard granted else { return CalendarEntry(title: title, startDate: startDate, endDate: startDate.addingTimeInterval(3600), reminderMinutes: reminderMinutes) }
        let event = EKEvent(eventStore: store)
        event.title = title
        event.startDate = startDate
        event.endDate = startDate.addingTimeInterval(3600)
        event.calendar = store.defaultCalendarForNewEvents
        event.addAlarm(EKAlarm(relativeOffset: TimeInterval(-reminderMinutes * 60)))
        try store.save(event, span: .thisEvent)
        return CalendarEntry(title: title, startDate: startDate, endDate: event.endDate, reminderMinutes: reminderMinutes, source: "EventKit")
        #else
        return CalendarEntry(title: title, startDate: startDate, endDate: startDate.addingTimeInterval(3600), reminderMinutes: reminderMinutes)
        #endif
    }

    #if canImport(EventKit)
    private func requestCalendarAccessIfNeeded() async throws -> Bool {
        if #available(iOS 17.0, macOS 14.0, *) { return try await store.requestFullAccessToEvents() }
        return try await store.requestAccess(to: .event)
    }
    #endif
}

public final class AppleReminderProvider: ReminderDataProviding, @unchecked Sendable {
    #if canImport(EventKit)
    private let store = EKEventStore()
    #endif
    public init() {}
    public func remindersDueToday() async throws -> [LifeReminder] { DemoSeed.reminders }
    public func createReminder(title: String, dueDate: Date) async throws -> LifeReminder {
        #if canImport(EventKit)
        let granted: Bool
        if #available(iOS 17.0, macOS 14.0, *) { granted = try await store.requestFullAccessToReminders() } else { granted = try await store.requestAccess(to: .reminder) }
        guard granted else { return LifeReminder(title: title, dueDate: dueDate) }
        let reminder = EKReminder(eventStore: store)
        reminder.title = title
        reminder.calendar = store.defaultCalendarForNewReminders()
        reminder.dueDateComponents = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: dueDate)
        try store.save(reminder, commit: true)
        return LifeReminder(title: title, dueDate: dueDate, source: "EventKit")
        #else
        return LifeReminder(title: title, dueDate: dueDate)
        #endif
    }
    public func completeReminder(id: UUID) async throws { _ = id }
}

public struct AppleNotificationProvider: NotificationProviding {
    public init() {}
    public func requestAuthorization() async -> PermissionState {
        #if canImport(UserNotifications)
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
            return granted ? .granted : .denied
        } catch { return .denied }
        #else
        return .demo
        #endif
    }
    public func schedule(title: String, body: String, date: Date) async throws {
        #if canImport(UserNotifications)
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date), repeats: false)
        try await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger))
        #else
        _ = (title, body, date)
        #endif
    }
    public func sendTestNotification() async throws { try await schedule(title: "AWS Hack", body: "AURA Core Benachrichtigungen sind aktiv.", date: Date().addingTimeInterval(3)) }
}

#if canImport(EventKit)
private extension EKAlarm {
    var minutesBefore: Int { Int(abs(relativeOffset) / 60) }
}
#endif

public final class AppleLocationProvider: NSObject, LocationProviding, @unchecked Sendable {
    #if canImport(CoreLocation)
    private let manager = CLLocationManager()
    #endif

    public override init() { super.init() }

    public func requestWhenInUseAuthorization() async -> PermissionState {
        #if canImport(CoreLocation)
        manager.requestWhenInUseAuthorization()
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse: return .granted
        case .denied: return .denied
        case .restricted: return .restricted
        case .notDetermined: return .notRequested
        @unknown default: return .restricted
        }
        #else
        return .demo
        #endif
    }

    public func currentLocation() async throws -> UserLocation {
        #if canImport(CoreLocation)
        guard let location = manager.location else { return try await DemoLocationProvider().currentLocation() }
        return UserLocation(coordinate: Coordinate(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude), label: "Aktueller Standort", isDemo: false)
        #else
        return try await DemoLocationProvider().currentLocation()
        #endif
    }

    public func manualLocation(address: String) async throws -> UserLocation {
        try await DemoLocationProvider().manualLocation(address: address)
    }
}
