import Foundation

public final class JSONFileCredentialStore: SecureCredentialStoring, @unchecked Sendable {
    private let fileURL: URL

    public init(fileURL: URL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("aws-hack-account.json")) {
        self.fileURL = fileURL
    }

    public func save(account: LocalAccount) throws {
        let data = try JSONEncoder().encode(account)
        try data.write(to: fileURL, options: [.atomic, .completeFileProtectionUnlessOpen])
    }

    public func loadAccount() throws -> LocalAccount? {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return nil }
        let data = try Data(contentsOf: fileURL)
        return try JSONDecoder().decode(LocalAccount.self, from: data)
    }

    public func clear() throws {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
        try FileManager.default.removeItem(at: fileURL)
    }
}
