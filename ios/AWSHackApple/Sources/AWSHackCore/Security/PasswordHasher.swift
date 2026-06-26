import Foundation
#if canImport(CryptoKit)
import CryptoKit
#endif

public enum PasswordHasher {
    public static func hash(_ password: String) -> String {
        #if canImport(CryptoKit)
        let digest = SHA256.hash(data: Data(password.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
        #else
        return String(password.reversed()) + ":demo-hash"
        #endif
    }

    public static func verify(_ password: String, hash: String) -> Bool { self.hash(password) == hash }
}

public protocol SecureCredentialStoring: Sendable {
    func save(account: LocalAccount) throws
    func loadAccount() throws -> LocalAccount?
    func clear() throws
}

public final class InMemoryCredentialStore: SecureCredentialStoring, @unchecked Sendable {
    private var account: LocalAccount?
    public init() {}
    public func save(account: LocalAccount) throws { self.account = account }
    public func loadAccount() throws -> LocalAccount? { account }
    public func clear() throws { account = nil }
}
