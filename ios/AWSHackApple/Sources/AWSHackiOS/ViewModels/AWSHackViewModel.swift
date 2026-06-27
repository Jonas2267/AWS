import Foundation
import AWSHackCore
#if canImport(SwiftUI)
import SwiftUI

@MainActor
public final class AWSHackViewModel: ObservableObject {
    @Published public var account: LocalAccount?
    @Published public var isBooting = true
    @Published public var setupStep = 0
    @Published public var activeTab: LifeOSTab = .assistant
    @Published public var permissions: [PermissionDescriptor] = PermissionDescriptor.defaultSet
    @Published public var messages: [ChatMessage] = [ChatMessage(role: .assistant, text: "AURA Core online. Keine heimlichen Zugriffe. Frage nach deinem Tag, Kalender, Wetter oder Aufgaben.")]
    @Published public var briefingText = ""
    @Published public var navigationRecommendation: NavigationRecommendation?
    @Published public var manualLocation = ""
    @Published public var fileSummary: FileSummary?
    @Published public var snapshot = PersonalDataSnapshot(events: [], reminders: [], tasks: [], alarms: [], weather: WeatherSnapshot(locationName: "Demo", condition: "Lädt", temperatureCelsius: 0, rainChance: 0, advisory: ""), health: nil, headlines: [], navigationRecommendation: nil)

    public let hub: PersonalDataHub
    private let parser = CommandParser()
    private let responseBuilder = AssistantResponseBuilder()
    private let permissionManager: PermissionManaging
    private let credentialStore: SecureCredentialStoring

    public init(hub: PersonalDataHub = PersonalDataHub(), permissionManager: PermissionManaging = DemoPermissionManager(), credentialStore: SecureCredentialStoring = InMemoryCredentialStore()) {
        self.hub = hub
        self.permissionManager = permissionManager
        self.credentialStore = credentialStore
        Task { await boot() }
    }

    public func boot() async {
        try? await Task.sleep(nanoseconds: 900_000_000)
        account = try? credentialStore.loadAccount()
        permissions = await permissionManager.descriptors()
        snapshot = await hub.snapshot()
        if let account { briefingText = await dailyBriefing(username: account.username) }
        isBooting = false
    }

    public func createAccount(username: String, password: String, avatar: String, useBiometrics: Bool) {
        let account = LocalAccount(username: username, passwordHash: PasswordHasher.hash(password), avatarSymbol: avatar, prefersBiometrics: useBiometrics)
        try? credentialStore.save(account: account)
        self.account = account
        activeTab = .setup
    }

    public func login(username: String, password: String) -> Bool {
        guard let stored = try? credentialStore.loadAccount(), stored.username == username, PasswordHasher.verify(password, hash: stored.passwordHash) else { return false }
        account = stored
        activeTab = stored.setupCompleted ? .assistant : .setup
        return true
    }

    public func setupRecommendedPermissions() async {
        for item in permissions where item.recommended {
            _ = await permissionManager.request(item.id)
        }
        permissions = await permissionManager.descriptors()
    }

    public func request(_ kind: PermissionKind) async {
        _ = await permissionManager.request(kind)
        permissions = await permissionManager.descriptors()
    }

    public func useDemo(_ kind: PermissionKind) async {
        await permissionManager.setDemo(kind)
        permissions = await permissionManager.descriptors()
    }

    public func finishSetup() {
        guard var current = account else { return }
        current.setupCompleted = true
        try? credentialStore.save(account: current)
        account = current
        activeTab = .dashboard
    }

    public func send(_ text: String) async {
        guard let account else { return }
        messages.append(ChatMessage(role: .user, text: text))
        let parsed = parser.parse(text)
        let executor = CommandExecutor(hub: hub, permissions: permissionManager)
        let output = await executor.execute(parsed, username: account.username)
        messages.append(ChatMessage(role: .assistant, text: responseBuilder.response(for: output)))
        snapshot = await hub.snapshot()
        briefingText = await dailyBriefing(username: account.username)
    }


    public func searchNavigation(category: PlaceCategory, query: String? = nil) async {
        navigationRecommendation = category == .fuel && (query?.localizedCaseInsensitiveContains("billigste") == true || query?.localizedCaseInsensitiveContains("günstigste") == true)
            ? await hub.cheapestFuelStation()
            : await hub.findPlaces(category: category, query: query)
        activeTab = .navigation
    }

    public func openRouteURL(for place: PlaceResult, mode: NavigationMode = .driving) async -> URL {
        await hub.navigationURL(for: place, mode: mode, preference: .automatic)
    }


    public func summarizeSelectedFile(name: String, contents: String) async {
        fileSummary = try? await hub.files.summarizeSelectedFile(named: name, contents: contents)
        activeTab = .data
    }

    public func dailyBriefing(username: String) async -> String {
        let briefing = await hub.dailyBriefing(for: username)
        return DailyBriefingBuilder.response(username: username, briefing: briefing)
    }
}

public enum LifeOSTab: String, CaseIterable, Identifiable {
    case assistant = "AURA"
    case dashboard = "Heute"
    case navigation = "Route"
    case setup = "Setup"
    case permissions = "Rechte"
    case data = "Daten"
    public var id: String { rawValue }
}

public struct ChatMessage: Identifiable, Equatable {
    public enum Role { case user, assistant }
    public let id = UUID()
    public var role: Role
    public var text: String
}

#else
public enum LifeOSTab: String, CaseIterable, Identifiable { case assistant = "AURA", dashboard = "Heute", navigation = "Route", setup = "Setup", permissions = "Rechte", data = "Daten"; public var id: String { rawValue } }
#endif
