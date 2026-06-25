import Foundation

public struct PersonalDataSnapshot: Sendable, Equatable {
    public var events: [CalendarEntry]
    public var reminders: [LifeReminder]
    public var tasks: [LifeTask]
    public var alarms: [AppAlarm]
    public var weather: WeatherSnapshot
    public var health: HealthSummary?
    public var headlines: [String]
}

public struct PersonalDataHub: Sendable {
    public let calendar: CalendarDataProviding
    public let reminders: ReminderDataProviding
    public let notifications: NotificationProviding
    public let alarms: AlarmProviding
    public let tasks: TaskProviding
    public let weather: WeatherProviding
    public let health: HealthProviding
    public let contacts: ContactProviding
    public let files: FileProviding
    public let news: NewsProviding
    public let ai: AIProviding

    public init(
        calendar: CalendarDataProviding = DemoCalendarProvider(),
        reminders: ReminderDataProviding = DemoReminderProvider(),
        notifications: NotificationProviding = DemoNotificationProvider(),
        alarms: AlarmProviding = DemoAlarmProvider(),
        tasks: TaskProviding = DemoTaskProvider(),
        weather: WeatherProviding = DemoWeatherProvider(),
        health: HealthProviding = DemoHealthProvider(),
        contacts: ContactProviding = DemoContactProvider(),
        files: FileProviding = DemoFileProvider(),
        news: NewsProviding = DemoNewsProvider(),
        ai: AIProviding = LocalAIProvider()
    ) {
        self.calendar = calendar
        self.reminders = reminders
        self.notifications = notifications
        self.alarms = alarms
        self.tasks = tasks
        self.weather = weather
        self.health = health
        self.contacts = contacts
        self.files = files
        self.news = news
        self.ai = ai
    }

    public func snapshot() async -> PersonalDataSnapshot {
        async let eventsResult = safe { try await calendar.todayEvents() }
        async let remindersResult = safe { try await reminders.remindersDueToday() }
        async let tasksResult = safe { try await tasks.tasksDueToday() }
        async let alarmsResult = safe { try await alarms.alarms() }
        async let weatherResult = safe { try await weather.todayWeather() }
        async let healthResult = safe { try await health.summary() }
        async let newsResult = safe { try await news.headlines() }

        return await PersonalDataSnapshot(
            events: eventsResult ?? [],
            reminders: remindersResult ?? [],
            tasks: tasksResult ?? [],
            alarms: alarmsResult ?? [],
            weather: weatherResult ?? WeatherSnapshot(locationName: "Demo", condition: "Unbekannt", temperatureCelsius: 0, rainChance: 0, advisory: "Wetter nicht verfügbar."),
            health: healthResult ?? nil,
            headlines: newsResult ?? []
        )
    }

    public func dailyBriefing(for username: String) async -> DailyBriefing {
        let data = await snapshot()
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateStyle = .full
        formatter.timeStyle = .short
        let nextEvent = data.events.sorted { $0.startDate < $1.startDate }.first
        let recommendation = DailyBriefingBuilder.recommendation(snapshot: data)

        return DailyBriefing(
            greeting: "Guten Morgen \(username).",
            dateLine: "Heute ist \(formatter.string(from: Date())).",
            weather: data.weather,
            nextEvent: nextEvent,
            events: data.events,
            reminders: data.reminders,
            tasks: data.tasks,
            alarms: data.alarms,
            health: data.health,
            recommendation: recommendation
        )
    }
}

private func safe<T: Sendable>(_ operation: @Sendable () async throws -> T) async -> T? {
    do { return try await operation() } catch { return nil }
}

public struct DailyBriefingBuilder {
    public static func response(username: String, briefing: DailyBriefing) -> String {
        let eventLine = briefing.nextEvent.map { "Dein erster Termin ist \($0.title) um \($0.startDate.formatted(date: .omitted, time: .shortened))." } ?? "Heute steht kein Termin im Demo-Kalender."
        let alarmLine = briefing.alarms.first.map { "Dein nächster AWS-Hack-Wecker ist um \($0.fireDate.formatted(date: .omitted, time: .shortened))." } ?? "Kein App-Wecker aktiv."
        let taskLine = briefing.tasks.first.map { "Wichtigste Aufgabe: \($0.title)." } ?? "Keine offenen Aufgaben."
        return "\(briefing.greeting) \(briefing.dateLine) \(eventLine) Das Wetter in \(briefing.weather.locationName): \(briefing.weather.condition), \(Int(briefing.weather.temperatureCelsius))°C. \(taskLine) \(alarmLine) \(briefing.recommendation)"
    }

    public static func recommendation(snapshot: PersonalDataSnapshot) -> String {
        if let urgent = snapshot.tasks.first(where: { $0.priority == .high }) {
            return "Starte mit \(urgent.title), bevor du neue Aufgaben annimmst."
        }
        if snapshot.weather.rainChance > 0.45 { return "Nimm eine Regenjacke mit." }
        return "Plane kurze Fokusblöcke und halte Notifications bewusst aktiviert."
    }
}

public actor DemoNotificationProvider: NotificationProviding {
    public init() {}
    public func requestAuthorization() async -> PermissionState { .granted }
    public func schedule(title: String, body: String, date: Date) async throws { _ = (title, body, date) }
    public func sendTestNotification() async throws {}
}
