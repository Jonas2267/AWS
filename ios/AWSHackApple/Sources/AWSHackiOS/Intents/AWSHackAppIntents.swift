#if canImport(AppIntents)
import AppIntents
import AWSHackCore

@available(iOS 16.0, *)
struct ShowDailyBriefingIntent: AppIntent {
    static var title: LocalizedStringResource = "AWS Hack Tagesbriefing"
    static var description = IntentDescription("Zeigt das persönliche AURA-Core-Tagesbriefing.")
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let hub = PersonalDataHub()
        let briefing = await hub.dailyBriefing(for: "User")
        return .result(dialog: IntentDialog(DailyBriefingBuilder.response(username: "User", briefing: briefing)))
    }
}

@available(iOS 16.0, *)
struct AskAuraIntent: AppIntent {
    static var title: LocalizedStringResource = "AURA fragen"
    @Parameter(title: "Frage") var question: String
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let parser = CommandParser()
        let command = parser.parse(question)
        let output = await CommandExecutor(hub: PersonalDataHub(), permissions: DemoPermissionManager()).execute(command, username: "User")
        return .result(dialog: IntentDialog("AURA Core: \(output)"))
    }
}

@available(iOS 16.0, *)
struct CreateAWSHackTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "AWS Hack Aufgabe erstellen"
    @Parameter(title: "Titel") var title: String
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let task = try await DemoTaskProvider().createTask(title: title, deadline: nil, priority: .medium)
        return .result(dialog: IntentDialog("Aufgabe erstellt: \(task.title)"))
    }
}
#endif

#if canImport(AppIntents)
@available(iOS 16.0, *)
struct FindNearestFuelIntent: AppIntent {
    static var title: LocalizedStringResource = "Nächste Tankstelle finden"
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let recommendation = await PersonalDataHub().findPlaces(category: .fuel, query: "nächste Tankstelle")
        return .result(dialog: IntentDialog(NavigationResponseBuilder.response(for: recommendation)))
    }
}

@available(iOS 16.0, *)
struct FindCheapestFuelIntent: AppIntent {
    static var title: LocalizedStringResource = "Billigste Tankstelle finden"
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let recommendation = await PersonalDataHub().cheapestFuelStation()
        return .result(dialog: IntentDialog(NavigationResponseBuilder.response(for: recommendation)))
    }
}

@available(iOS 16.0, *)
struct NavigateHomeIntent: AppIntent {
    static var title: LocalizedStringResource = "Navigation nach Hause"
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let recommendation = await PersonalDataHub().findPlaces(category: .home, query: "Zuhause")
        return .result(dialog: IntentDialog(NavigationResponseBuilder.response(for: recommendation)))
    }
}

@available(iOS 16.0, *)
struct NavigateWorkOrSchoolIntent: AppIntent {
    static var title: LocalizedStringResource = "Navigation zur Arbeit oder Schule"
    @Parameter(title: "Ziel", default: "Schule") var destination: String
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let category: PlaceCategory = destination.localizedCaseInsensitiveContains("arbeit") ? .work : .school
        let recommendation = await PersonalDataHub().findPlaces(category: category, query: destination)
        return .result(dialog: IntentDialog(NavigationResponseBuilder.response(for: recommendation)))
    }
}

@available(iOS 16.0, *)
struct FindSupermarketIntent: AppIntent {
    static var title: LocalizedStringResource = "Nächsten Supermarkt finden"
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let recommendation = await PersonalDataHub().findPlaces(category: .supermarket, query: "Supermarkt")
        return .result(dialog: IntentDialog(NavigationResponseBuilder.response(for: recommendation)))
    }
}

@available(iOS 16.0, *)
struct FindPharmacyIntent: AppIntent {
    static var title: LocalizedStringResource = "Apotheke suchen"
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let recommendation = await PersonalDataHub().findPlaces(category: .pharmacy, query: "Apotheke")
        return .result(dialog: IntentDialog(NavigationResponseBuilder.response(for: recommendation)))
    }
}

@available(iOS 16.0, *)
struct StartAuraRouteIntent: AppIntent {
    static var title: LocalizedStringResource = "AURA Route starten"
    @Parameter(title: "Ziel", default: "Tankstelle") var destination: String
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let command = CommandParser().parse("Navigiere mich zu \(destination)")
        let output = await CommandExecutor(hub: PersonalDataHub(), permissions: DemoPermissionManager()).execute(command, username: "User")
        return .result(dialog: IntentDialog(output))
    }
}
#endif

#if canImport(AppIntents)
@available(iOS 16.0, *)
struct CreateCalendarEventIntent: AppIntent {
    static var title: LocalizedStringResource = "AWS Hack Termin erstellen"
    @Parameter(title: "Titel") var title: String
    @Parameter(title: "Start", default: .now) var start: Date
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let entry = try await DemoCalendarProvider().createEvent(title: title, startDate: start, reminderMinutes: 30)
        return .result(dialog: IntentDialog("Termin erstellt: \(entry.title)"))
    }
}

@available(iOS 16.0, *)
struct CreateReminderIntent: AppIntent {
    static var title: LocalizedStringResource = "AWS Hack Erinnerung erstellen"
    @Parameter(title: "Titel") var title: String
    @Parameter(title: "Fällig", default: .now) var due: Date
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let reminder = try await DemoReminderProvider().createReminder(title: title, dueDate: due)
        return .result(dialog: IntentDialog("Erinnerung erstellt: \(reminder.title)"))
    }
}

@available(iOS 16.0, *)
struct CreateAlarmIntent: AppIntent {
    static var title: LocalizedStringResource = "AWS Hack Wecker erstellen"
    @Parameter(title: "Titel", default: "AWS-Hack-Wecker") var title: String
    @Parameter(title: "Zeit", default: .now) var fireDate: Date
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let alarm = try await DemoAlarmProvider().createAlarm(title: title, fireDate: fireDate)
        return .result(dialog: IntentDialog("AWS-Hack-Wecker aktiv: \(alarm.fireDate.formatted(date: .omitted, time: .shortened))"))
    }
}

@available(iOS 16.0, *)
struct ShowWeatherIntent: AppIntent {
    static var title: LocalizedStringResource = "AWS Hack Wetter anzeigen"
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let weather = try await DemoWeatherProvider().todayWeather()
        return .result(dialog: IntentDialog("Wetter: \(weather.condition), \(Int(weather.temperatureCelsius)) Grad. \(weather.advisory)"))
    }
}

@available(iOS 16.0, *)
struct OpenDashboardIntent: AppIntent {
    static var title: LocalizedStringResource = "AWS Hack Dashboard öffnen"
    static var openAppWhenRun = true
    func perform() async throws -> some IntentResult & ProvidesDialog {
        .result(dialog: IntentDialog("AWS Hack Dashboard wird geöffnet."))
    }
}
#endif
