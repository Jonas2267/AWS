#if canImport(SwiftUI)
import SwiftUI
import UniformTypeIdentifiers
import AWSHackCore

struct RootView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel

    var body: some View {
        ZStack {
            CyberBackground()
            if viewModel.isBooting { BootView() }
            else if viewModel.account == nil { AccountView() }
            else { LifeOSView() }
        }
        .preferredColorScheme(.dark)
    }
}

struct LifeOSView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel

    var body: some View {
        VStack(spacing: 0) {
            Group {
                switch viewModel.activeTab {
                case .assistant: AssistantView()
                case .dashboard: DashboardView()
                case .navigation: NavigationView()
                case .setup: SetupWizardView()
                case .permissions: PermissionCenterView()
                case .data: DataHubView()
                }
            }
            BottomNav()
        }
    }
}

struct BootView: View {
    var body: some View {
        VStack(spacing: 24) {
            JarvisCore(size: 230)
            Text("AWS Hack")
                .font(.system(size: 48, weight: .black, design: .rounded))
            Text("Artificial Workstation System")
                .font(.caption.weight(.bold))
                .tracking(5)
                .foregroundStyle(.green.opacity(0.7))
            ProgressView().tint(.green)
        }
        .padding()
    }
}

struct AccountView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel
    @State private var username = ""
    @State private var password = ""
    @State private var avatar = "◉"
    @State private var useBiometrics = true
    @State private var isLogin = false
    @State private var message = "Lokales Konto. Face ID/Touch ID ist vorbereitet; Produktion nutzt Keychain + LAContext."

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                JarvisCore(size: 180)
                Text(isLogin ? "Einloggen" : "Lokales Konto erstellen")
                    .font(.largeTitle.bold())
                Text(message).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                CyberField(title: "Benutzername", text: $username)
                SecureField("Passwort", text: $password)
                    .textContentType(isLogin ? .password : .newPassword)
                    .padding(18)
                    .background(.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 24))
                    .overlay(RoundedRectangle(cornerRadius: 24).stroke(.green.opacity(0.2)))
                CyberField(title: "Avatar", text: $avatar)
                Toggle("Face ID / Touch ID vorbereiten", isOn: $useBiometrics).tint(.green)
                Button(isLogin ? "Login" : "Account erstellen") {
                    guard username.isEmpty == false, password.count >= 4 else { message = "Bitte Benutzername und mindestens 4 Zeichen Passwort eingeben."; return }
                    if isLogin {
                        message = viewModel.login(username: username, password: password) ? "Login erfolgreich." : "Login fehlgeschlagen."
                    } else {
                        viewModel.createAccount(username: username, password: password, avatar: avatar, useBiometrics: useBiometrics)
                    }
                }.buttonStyle(CyberButtonStyle())
                Button(isLogin ? "Neues Konto" : "Zum Login") { isLogin.toggle() }.foregroundStyle(.green)
            }
            .padding(20)
        }
    }
}

struct AssistantView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel
    @State private var input = ""
    private let suggestions = ["Mach mir mein Morgen-Briefing", "Navigiere mich zur nächsten Tankstelle", "Finde die billigste Tankstelle in der Nähe", "Suche einen McDonald’s in der Nähe"]

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 14) {
                JarvisCore(size: 72)
                VStack(alignment: .leading) {
                    Text("AURA Core").font(.title.bold())
                    Text("Deutsch · EventKit · WeatherKit · sicherer Demo-Fallback").font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
            }.padding(.horizontal)
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(viewModel.messages) { message in
                        Text(message.text)
                            .frame(maxWidth: .infinity, alignment: message.role == .assistant ? .leading : .trailing)
                            .padding(14)
                            .background(message.role == .assistant ? .green.opacity(0.12) : .cyan.opacity(0.14), in: RoundedRectangle(cornerRadius: 22))
                    }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack { ForEach(suggestions, id: \.self) { suggestion in Button(suggestion) { Task { await viewModel.send(suggestion) } }.buttonStyle(ChipButtonStyle()) } }
                    }
                }.padding(.horizontal)
            }
            HStack {
                TextField("Frag AURA…", text: $input)
                    .padding(16)
                    .background(.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 22))
                Button("Senden") { let text = input; input = ""; Task { await viewModel.send(text) } }.buttonStyle(CyberButtonStyle(compact: true))
                Button { viewModel.activeTab = .permissions } label: { Image(systemName: "mic.fill") }.buttonStyle(CyberIconButtonStyle())
            }.padding()
        }
    }
}

struct SetupWizardView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel
    private let steps = ["Konto", "Kalender", "Erinnerungen", "Benachrichtigungen", "Standort", "HealthKit", "Kontakte", "Dateien", "Mikrofon", "App-Wecker", "Fertig"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("AWS Hack einrichten").font(.largeTitle.bold())
                ProgressView(value: Double(viewModel.setupStep + 1), total: Double(steps.count)).tint(.green)
                Text(steps[min(viewModel.setupStep, steps.count - 1)]).font(.title2.bold())
                Text(copy(for: viewModel.setupStep)).foregroundStyle(.secondary)
                Button("Empfohlene Berechtigungen einrichten") { Task { await viewModel.setupRecommendedPermissions() } }.buttonStyle(CyberButtonStyle())
                Button(viewModel.setupStep >= steps.count - 1 ? "Dashboard öffnen" : "Weiter") {
                    if viewModel.setupStep >= steps.count - 1 { viewModel.finishSetup() } else { viewModel.setupStep += 1 }
                }.buttonStyle(CyberButtonStyle())
            }.padding(20)
        }
    }

    private func copy(for step: Int) -> String {
        switch step {
        case 1: "Kalenderzugriff wird einzeln über EventKit angefragt. Ohne Freigabe nutzt AURA Demo-Termine."
        case 2: "Erinnerungen laufen über EventKit Reminders oder lokalen Demo-Fallback."
        case 3: "UserNotifications plant lokale Hinweise und Test-Benachrichtigungen."
        case 4: "Standort ist optional für WeatherKit-Ort; kein Tracking im Hintergrund."
        case 5: "HealthKit ist optional und liefert keine medizinischen Diagnosen."
        case 6: "Kontakte werden nur nach Freigabe gesucht und nicht übertragen."
        case 7: "Dateien werden nur per Document Picker nach aktivem Nutzerklick gelesen."
        case 8: "Mikrofon und Speech werden vorbereitet, starten aber nur nach Freigabe."
        case 9: "Apple-Clock-Wecker werden nicht heimlich gelesen; AWS Hack verwaltet eigene Alarme oder Notification-Fallbacks."
        case 10: "Fertig. Öffne dein persönliches Life-OS Dashboard."
        default: "Dein lokales Konto ist bereit. Face ID/Touch ID ist für Keychain/LAContext vorbereitet."
        }
    }
}

struct DashboardView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Wie ist mein Tag?").font(.largeTitle.bold())
                Text(viewModel.briefingText).padding().background(.green.opacity(0.1), in: RoundedRectangle(cornerRadius: 26))
                InfoCard(title: "Nächster Termin", value: viewModel.snapshot.events.first?.title ?? "Kein Termin", detail: viewModel.snapshot.events.first?.startDate.formatted(date: .omitted, time: .shortened) ?? "")
                InfoCard(title: "Nächster Alarm", value: viewModel.snapshot.alarms.first?.title ?? "Kein AWS-Hack-Wecker", detail: viewModel.snapshot.alarms.first?.fireDate.formatted(date: .omitted, time: .shortened) ?? "")
                InfoCard(title: "Wetter", value: "\(Int(viewModel.snapshot.weather.temperatureCelsius))°C · \(viewModel.snapshot.weather.condition)", detail: viewModel.snapshot.weather.advisory)
                InfoCard(title: "Offene Aufgaben", value: "\(viewModel.snapshot.tasks.count)", detail: viewModel.snapshot.tasks.map(\.title).joined(separator: ", "))
                InfoCard(title: "Navigation", value: viewModel.navigationRecommendation?.recommended?.name ?? "Wohin?", detail: viewModel.navigationRecommendation?.explanation ?? "Suche Alltagspunkte in deiner Nähe mit Demo-Daten oder Standortfreigabe.")
                QuickNavigationGrid()
                InfoCard(title: "Berechtigungen", value: "\(viewModel.permissions.filter { $0.state == .granted }.count)/\(viewModel.permissions.count)", detail: "Alles bleibt freiwillig und einzeln kontrollierbar.")
            }.padding(20)
        }
    }
}


struct NavigationView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel
    @Environment(\.openURL) private var openURL
    @State private var query = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Navigation").font(.largeTitle.bold())
                Text("Standort nur bei Nutzung. Ohne Freigabe nutzt AURA Demo-Orte oder deine manuelle Adresse.").font(.footnote).foregroundStyle(.secondary)
                HStack {
                    TextField("Wohin?", text: $query)
                        .padding(16)
                        .background(.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 22))
                    Button("Suchen") { Task { await viewModel.searchNavigation(category: query.detectPlaceCategoryForUI() ?? .restaurant, query: query) } }.buttonStyle(CyberButtonStyle(compact: true))
                }
                QuickNavigationGrid()
                if let recommendation = viewModel.navigationRecommendation {
                    Text(recommendation.explanation).padding().background(.green.opacity(0.1), in: RoundedRectangle(cornerRadius: 24))
                    ForEach(([recommendation.recommended].compactMap { $0 } + recommendation.alternatives)) { place in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack { Text(place.name).font(.headline); Spacer(); Text(place.isDemo ? "Demo" : "Live").font(.caption).padding(6).background(.green.opacity(0.16), in: Capsule()) }
                            Text("\(String(format: "%.1f", place.distanceKilometers)) km · \(place.estimatedTravelMinutes) Min · \(place.isOpen ? "offen" : "geschlossen")")
                            if let price = place.fuelPricePerLiter { Text("Preis: \(String(format: "%.2f", price)) €/L") }
                            Text(place.address).font(.footnote).foregroundStyle(.secondary)
                            Button("Route starten") { Task { let url = await viewModel.openRouteURL(for: place); openURL(url) } }.buttonStyle(CyberButtonStyle())
                        }.padding().background(.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 24)).overlay(RoundedRectangle(cornerRadius: 24).stroke(.green.opacity(0.16)))
                    }
                }
            }.padding(20)
        }
    }
}

struct QuickNavigationGrid: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel
    private let items: [(String, PlaceCategory)] = [("Tankstelle", .fuel), ("Billig tanken", .fuel), ("Supermarkt", .supermarket), ("Apotheke", .pharmacy), ("Parkplatz", .parking), ("Werkstatt", .workshop), ("Fast Food", .restaurant), ("Geldautomat", .atm), ("Zuhause", .home), ("Schule", .school)]
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), spacing: 10)], spacing: 10) {
            ForEach(items, id: \.0) { label, category in
                Button(label) { Task { await viewModel.searchNavigation(category: category, query: label) } }.buttonStyle(ChipButtonStyle())
            }
        }
    }
}

private extension String {
    func detectPlaceCategoryForUI() -> PlaceCategory? {
        let text = lowercased()
        if text.contains("tank") { return .fuel }
        if text.contains("super") { return .supermarket }
        if text.contains("apothe") { return .pharmacy }
        if text.contains("park") { return .parking }
        if text.contains("werkstatt") { return .workshop }
        if text.contains("mcdonald") || text.contains("essen") { return .restaurant }
        if text.contains("kleidung") { return .clothing }
        if text.contains("geld") || text.contains("atm") { return .atm }
        if text.contains("schule") { return .school }
        if text.contains("arbeit") { return .work }
        if text.contains("zuhause") || text.contains("home") { return .home }
        if text.contains("paket") { return .parcelStation }
        if text.contains("lade") { return .evCharging }
        return nil
    }
}

struct PermissionCenterView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Permission Center").font(.largeTitle.bold())
                ForEach(viewModel.permissions) { permission in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack { Text(permission.id.title).font(.headline); Spacer(); Text(permission.state.rawValue).font(.caption).padding(8).background(.green.opacity(0.15), in: Capsule()) }
                        Text(permission.capability).font(.subheadline).foregroundStyle(.secondary)
                        Text("Ohne Freigabe: \(permission.fallback)").font(.footnote).foregroundStyle(.secondary)
                        HStack {
                            Button("Freigeben") { Task { await viewModel.request(permission.id) } }.buttonStyle(ChipButtonStyle())
                            Button("Demo nutzen") { Task { await viewModel.useDemo(permission.id) } }.buttonStyle(ChipButtonStyle())
                            Button("Einstellungen") { openSettings() }.buttonStyle(ChipButtonStyle())
                        }
                    }.padding().background(.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 24)).overlay(RoundedRectangle(cornerRadius: 24).stroke(.green.opacity(0.16)))
                }
            }.padding(20)
        }
    }

    private func openSettings() {
        #if os(iOS)
        if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
        #endif
    }
}

struct DataHubView: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel
    var body: some View {
        ScrollView { VStack(alignment: .leading, spacing: 14) {
            Text("Personal Data Hub").font(.largeTitle.bold())
            InfoCard(title: "Kalender", value: "\(viewModel.snapshot.events.count) heute", detail: "EventKit oder DemoProvider")
            InfoCard(title: "Erinnerungen", value: "\(viewModel.snapshot.reminders.count)", detail: "EventKit Reminders oder Demo")
            InfoCard(title: "News", value: viewModel.snapshot.headlines.first ?? "Demo-News", detail: viewModel.snapshot.headlines.dropFirst().joined(separator: ", "))
            FileSummaryCard()
            InfoCard(title: "Dateien & Chats", value: "Share Sheet / Document Picker", detail: "iMessage, WhatsApp & Co. werden nicht heimlich gelesen.")
        }.padding(20) }
    }
}


struct FileSummaryCard: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel
    @State private var isImporterPresented = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("DATEI-ZUSAMMENFASSUNG").font(.caption.weight(.bold)).tracking(3).foregroundStyle(.green.opacity(0.75))
            Text(viewModel.fileSummary?.fileName ?? "Keine Datei ausgewählt").font(.headline)
            Text(viewModel.fileSummary?.summary ?? "Öffne eine Textdatei aktiv über den Document Picker. Keine heimlichen Dateizugriffe.").font(.footnote).foregroundStyle(.secondary)
            Button("Datei auswählen") { isImporterPresented = true }.buttonStyle(CyberButtonStyle())
        }
        .padding()
        .background(.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(.green.opacity(0.18)))
        .fileImporter(isPresented: $isImporterPresented, allowedContentTypes: [.plainText, .text, .utf8PlainText]) { result in
            guard case let .success(url) = result else { return }
            Task {
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                let text = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
                await viewModel.summarizeSelectedFile(name: url.lastPathComponent, contents: text)
            }
        }
    }
}

struct BottomNav: View {
    @EnvironmentObject private var viewModel: AWSHackViewModel
    var body: some View {
        HStack(spacing: 8) {
            ForEach(LifeOSTab.allCases) { tab in
                Button { viewModel.activeTab = tab } label: {
                    VStack(spacing: 4) {
                        Image(systemName: icon(for: tab))
                        Text(tab.rawValue).font(.caption2.weight(.bold))
                    }.frame(maxWidth: .infinity).padding(.vertical, 10)
                }
                .foregroundStyle(viewModel.activeTab == tab ? .green : .white.opacity(0.62))
                .background(viewModel.activeTab == tab ? .green.opacity(0.16) : .clear, in: RoundedRectangle(cornerRadius: 18))
            }
        }.padding(10).background(.black.opacity(0.72), in: RoundedRectangle(cornerRadius: 28)).padding(.horizontal).padding(.bottom, 8)
    }
    private func icon(for tab: LifeOSTab) -> String {
        switch tab { case .assistant: "circle.hexagongrid.fill"; case .dashboard: "sun.max.fill"; case .navigation: "location.north.line.fill"; case .setup: "wand.and.stars"; case .permissions: "lock.shield.fill"; case .data: "square.stack.3d.up.fill" }
    }
}

struct JarvisCore: View {
    var size: CGFloat
    @State private var rotation = 0.0
    var body: some View {
        ZStack {
            Circle().fill(AngularGradient(colors: [.green.opacity(0.15), .green, .cyan.opacity(0.8), .green.opacity(0.2)], center: .center)).blur(radius: 1)
            Circle().stroke(.green.opacity(0.5), lineWidth: 2).padding(10).rotationEffect(.degrees(rotation))
            Circle().stroke(style: StrokeStyle(lineWidth: 2, dash: [8, 10])).foregroundStyle(.cyan.opacity(0.5)).padding(26).rotationEffect(.degrees(-rotation * 1.4))
            VStack { Text("AURA").font(.system(size: size / 7, weight: .black)); Text("CORE").font(.caption2.weight(.bold)).tracking(3) }
        }
        .frame(width: size, height: size)
        .shadow(color: .green.opacity(0.45), radius: 34)
        .onAppear { withAnimation(.linear(duration: 14).repeatForever(autoreverses: false)) { rotation = 360 } }
    }
}

struct CyberBackground: View {
    var body: some View {
        LinearGradient(colors: [Color.black, Color(red: 0.01, green: 0.07, blue: 0.04), Color.black], startPoint: .topLeading, endPoint: .bottomTrailing).ignoresSafeArea()
            .overlay(RadialGradient(colors: [.green.opacity(0.22), .clear], center: .topLeading, startRadius: 30, endRadius: 420).ignoresSafeArea())
            .overlay(RadialGradient(colors: [.cyan.opacity(0.14), .clear], center: .bottomTrailing, startRadius: 20, endRadius: 360).ignoresSafeArea())
    }
}

struct InfoCard: View {
    var title: String
    var value: String
    var detail: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased()).font(.caption.weight(.bold)).tracking(3).foregroundStyle(.green.opacity(0.75))
            Text(value).font(.title3.bold())
            if detail.isEmpty == false { Text(detail).font(.footnote).foregroundStyle(.secondary) }
        }.frame(maxWidth: .infinity, alignment: .leading).padding().background(.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 24)).overlay(RoundedRectangle(cornerRadius: 24).stroke(.green.opacity(0.18)))
    }
}

struct CyberField: View {
    var title: String
    @Binding var text: String
    var body: some View {
        TextField(title, text: $text).textInputAutocapitalization(.never).autocorrectionDisabled().padding(18).background(.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 24)).overlay(RoundedRectangle(cornerRadius: 24).stroke(.green.opacity(0.2)))
    }
}

struct CyberButtonStyle: ButtonStyle {
    var compact = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: compact ? nil : .infinity)
            .padding(compact ? 14 : 18)
            .background(.green.opacity(configuration.isPressed ? 0.28 : 0.16), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(.green.opacity(0.45)))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct CyberIconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { configuration.label.padding(16).background(.green.opacity(0.14), in: Circle()).overlay(Circle().stroke(.green.opacity(0.35))) }
}

struct ChipButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View { configuration.label.font(.caption.weight(.bold)).padding(.horizontal, 12).padding(.vertical, 9).background(.green.opacity(0.12), in: Capsule()).overlay(Capsule().stroke(.green.opacity(0.25))) }
}
#endif
