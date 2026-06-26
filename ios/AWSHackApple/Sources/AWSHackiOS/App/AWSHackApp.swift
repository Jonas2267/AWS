#if canImport(SwiftUI)
import SwiftUI
import AWSHackCore

@main
struct AWSHackApp: App {
    @StateObject private var viewModel = AWSHackViewModel(credentialStore: KeychainCredentialStore())

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(viewModel)
        }
    }
}
#endif
