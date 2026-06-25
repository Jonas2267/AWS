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
