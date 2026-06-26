import Foundation
import AWSHackCore
#if canImport(Security)
import Security
#endif

public final class KeychainCredentialStore: SecureCredentialStoring, @unchecked Sendable {
    private let service = "com.awshack.lifeos.account"
    private let accountKey = "local-account"

    public init() {}

    public func save(account: LocalAccount) throws {
        #if canImport(Security)
        let data = try JSONEncoder().encode(account)
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: accountKey]
        SecItemDelete(query as CFDictionary)
        var insert = query
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(insert as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.unhandled(status) }
        #else
        try JSONFileCredentialStore().save(account: account)
        #endif
    }

    public func loadAccount() throws -> LocalAccount? {
        #if canImport(Security)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: accountKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw KeychainError.unhandled(status) }
        return try JSONDecoder().decode(LocalAccount.self, from: data)
        #else
        return try JSONFileCredentialStore().loadAccount()
        #endif
    }

    public func clear() throws {
        #if canImport(Security)
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: accountKey]
        SecItemDelete(query as CFDictionary)
        #else
        try JSONFileCredentialStore().clear()
        #endif
    }
}

public enum KeychainError: Error {
    case unhandled(Int32)
}
