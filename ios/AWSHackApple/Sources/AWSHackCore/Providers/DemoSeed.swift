import Foundation

public enum DemoSeed {
    private static var calendar: Calendar { Calendar(identifier: .gregorian) }
    private static func today(hour: Int, minute: Int = 0) -> Date {
        calendar.date(bySettingHour: hour, minute: minute, second: 0, of: Date()) ?? Date()
    }

    public static let events: [CalendarEntry] = [
        CalendarEntry(title: "Schule", startDate: today(hour: 8), endDate: today(hour: 13), reminderMinutes: 30),
        CalendarEntry(title: "AWS Hack Fokuszeit", startDate: today(hour: 18, minute: 30), endDate: today(hour: 19, minute: 30), reminderMinutes: 15)
    ]

    public static let reminders: [LifeReminder] = [
        LifeReminder(title: "Trainingstasche packen", dueDate: today(hour: 18)),
        LifeReminder(title: "Wasserflasche mitnehmen", dueDate: today(hour: 7, minute: 30))
    ]

    public static let tasks: [LifeTask] = [
        LifeTask(title: "Mathe lernen", deadline: today(hour: 20), priority: .high),
        LifeTask(title: "Kalender-Berechtigung prüfen", priority: .medium),
        LifeTask(title: "Morgen-Briefing testen", priority: .medium, status: .running)
    ]

    public static let alarms: [AppAlarm] = [
        AppAlarm(title: "AWS-Hack-Wecker", fireDate: today(hour: 6, minute: 30), isFallbackNotification: true)
    ]
}
