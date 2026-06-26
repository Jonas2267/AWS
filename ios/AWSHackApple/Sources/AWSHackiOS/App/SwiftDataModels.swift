#if canImport(SwiftData)
import Foundation
import SwiftData

@available(iOS 17.0, macOS 14.0, *)
@Model
final class StoredLifeTask {
    @Attribute(.unique) var id: UUID
    var title: String
    var deadline: Date?
    var priorityRaw: String
    var statusRaw: String

    init(id: UUID = UUID(), title: String, deadline: Date? = nil, priorityRaw: String = "mittel", statusRaw: String = "offen") {
        self.id = id
        self.title = title
        self.deadline = deadline
        self.priorityRaw = priorityRaw
        self.statusRaw = statusRaw
    }
}

@available(iOS 17.0, macOS 14.0, *)
@Model
final class StoredFavoritePlace {
    @Attribute(.unique) var id: UUID
    var categoryRaw: String
    var label: String
    var address: String
    var latitude: Double
    var longitude: Double

    init(id: UUID = UUID(), categoryRaw: String, label: String, address: String, latitude: Double, longitude: Double) {
        self.id = id
        self.categoryRaw = categoryRaw
        self.label = label
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
    }
}
#endif
