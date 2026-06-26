import Foundation

public struct DemoLocationProvider: LocationProviding {
    public init() {}
    public func requestWhenInUseAuthorization() async -> PermissionState { .demo }
    public func currentLocation() async throws -> UserLocation {
        UserLocation(coordinate: Coordinate(latitude: 52.5200, longitude: 13.4050), label: "Demo-Standort Berlin Mitte", isDemo: true)
    }
    public func manualLocation(address: String) async throws -> UserLocation {
        UserLocation(coordinate: Coordinate(latitude: 52.5200, longitude: 13.4050), label: address, isDemo: true)
    }
}

public actor DemoPlacesProvider: PlacesProviding {
    private let places: [PlaceResult]
    private let favorites: [PlaceCategory: PlaceResult]

    public init(places: [PlaceResult] = DemoNavigationSeed.places, favorites: [PlaceCategory: PlaceResult] = DemoNavigationSeed.favorites) {
        self.places = places
        self.favorites = favorites
    }

    public func search(category: PlaceCategory, near location: UserLocation, query: String?) async throws -> [PlaceResult] {
        let normalized = query?.lowercased() ?? ""
        return places
            .filter { $0.category == category || (!normalized.isEmpty && $0.name.lowercased().contains(normalized)) }
            .sorted { lhs, rhs in
                if lhs.isOpen != rhs.isOpen { return lhs.isOpen && !rhs.isOpen }
                return lhs.distanceKilometers < rhs.distanceKilometers
            }
    }

    public func favoritePlace(_ category: PlaceCategory) async throws -> PlaceResult? { favorites[category] }
}

public struct DemoFuelPriceProvider: FuelPriceProviding {
    public init() {}
    public func enrichFuelPrices(_ places: [PlaceResult]) async throws -> [PlaceResult] { places }
    public func cheapestFuelStation(near location: UserLocation) async throws -> NavigationRecommendation {
        let stations = DemoNavigationSeed.places.filter { $0.category == .fuel }.sorted {
            ($0.fuelPricePerLiter ?? .greatestFiniteMagnitude, $0.distanceKilometers) < ($1.fuelPricePerLiter ?? .greatestFiniteMagnitude, $1.distanceKilometers)
        }
        let best = stations.first
        let fastest = stations.sorted { $0.estimatedTravelMinutes < $1.estimatedTravelMinutes }.first
        let delta = fuelDelta(best: best, fastest: fastest)
        return NavigationRecommendation(
            query: "billigste Tankstelle",
            category: .fuel,
            recommended: best,
            alternatives: Array(stations.dropFirst().prefix(4)),
            explanation: best.map { "Ich habe \(stations.count) Tankstellen in deiner Nähe gefunden. Die günstigste ist \(String(format: "%.1f", $0.distanceKilometers)) km entfernt und kostet \(String(format: "%.2f", $0.fuelPricePerLiter ?? 0)) €/L. \(delta) Empfehlung: günstigste Option nehmen, Fahrzeit \($0.estimatedTravelMinutes) Minuten." } ?? "Keine Tankstelle gefunden.",
            usedDemoData: true
        )
    }

    private func fuelDelta(best: PlaceResult?, fastest: PlaceResult?) -> String {
        guard let best, let fastest, best.id != fastest.id, let bestPrice = best.fuelPricePerLiter, let fastPrice = fastest.fuelPricePerLiter else { return "" }
        let cents = Int((fastPrice - bestPrice) * 100)
        return "Die schnellste erreichbare ist \(String(format: "%.1f", fastest.distanceKilometers)) km entfernt, aber \(max(cents, 0)) Cent teurer."
    }
}

public struct MapsNavigationProvider: NavigationProviding {
    public init() {}
    public func routeURL(destination: PlaceResult, mode: NavigationMode, preference: NavigationAppPreference) async -> URL {
        let encodedName = destination.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? destination.name
        let coordinate = "\(destination.coordinate.latitude),\(destination.coordinate.longitude)"
        switch preference {
        case .googleMaps:
            return URL(string: "comgooglemaps://?daddr=\(coordinate)&directionsmode=\(googleMode(mode))") ?? appleMapsURL(destination: destination, encodedName: encodedName, coordinate: coordinate, mode: mode)
        case .appleMaps, .automatic:
            return appleMapsURL(destination: destination, encodedName: encodedName, coordinate: coordinate, mode: mode)
        }
    }
    public func openNavigation(destination: PlaceResult, mode: NavigationMode, preference: NavigationAppPreference) async -> URL {
        await routeURL(destination: destination, mode: mode, preference: preference)
    }
    private func appleMapsURL(destination: PlaceResult, encodedName: String, coordinate: String, mode: NavigationMode) -> URL {
        URL(string: "http://maps.apple.com/?daddr=\(coordinate)&q=\(encodedName)&dirflg=\(appleMode(mode))")!
    }
    private func appleMode(_ mode: NavigationMode) -> String {
        switch mode { case .driving: "d"; case .walking: "w"; case .transit: "r"; case .cycling: "d" }
    }
    private func googleMode(_ mode: NavigationMode) -> String {
        switch mode { case .driving: "driving"; case .walking: "walking"; case .transit: "transit"; case .cycling: "bicycling" }
    }
}

public enum DemoNavigationSeed {
    public static let places: [PlaceResult] = [
        PlaceResult(name: "AURA Fuel Mitte", category: .fuel, address: "Invalidenstraße 90", coordinate: Coordinate(latitude: 52.531, longitude: 13.384), distanceKilometers: 2.8, estimatedTravelMinutes: 6, isOpen: true, rating: 4.2, fuelPricePerLiter: 1.72),
        PlaceResult(name: "QuickGas Alexanderplatz", category: .fuel, address: "Alexanderstraße 7", coordinate: Coordinate(latitude: 52.520, longitude: 13.415), distanceKilometers: 1.1, estimatedTravelMinutes: 4, isOpen: true, rating: 4.0, fuelPricePerLiter: 1.76),
        PlaceResult(name: "NightFuel Ost", category: .fuel, address: "Holzmarktstraße 11", coordinate: Coordinate(latitude: 52.512, longitude: 13.426), distanceKilometers: 3.4, estimatedTravelMinutes: 9, isOpen: true, rating: 3.9, fuelPricePerLiter: 1.74),
        PlaceResult(name: "AURA Markt", category: .supermarket, address: "Friedrichstraße 120", coordinate: Coordinate(latitude: 52.526, longitude: 13.387), distanceKilometers: 0.9, estimatedTravelMinutes: 5, isOpen: true, rating: 4.5),
        PlaceResult(name: "Notfall Apotheke Nord", category: .pharmacy, address: "Torstraße 30", coordinate: Coordinate(latitude: 52.530, longitude: 13.402), distanceKilometers: 1.4, estimatedTravelMinutes: 5, isOpen: true, rating: 4.7),
        PlaceResult(name: "City Parking Secure", category: .parking, address: "Dorotheenstraße 2", coordinate: Coordinate(latitude: 52.518, longitude: 13.380), distanceKilometers: 1.2, estimatedTravelMinutes: 4, isOpen: true, rating: 4.1),
        PlaceResult(name: "Werkstatt Grün", category: .workshop, address: "Chausseestraße 80", coordinate: Coordinate(latitude: 52.536, longitude: 13.377), distanceKilometers: 2.1, estimatedTravelMinutes: 7, isOpen: false, rating: 4.4),
        PlaceResult(name: "McDonald's Friedrichstraße", category: .restaurant, address: "Friedrichstraße 141", coordinate: Coordinate(latitude: 52.522, longitude: 13.388), distanceKilometers: 0.7, estimatedTravelMinutes: 3, isOpen: true, rating: 3.8),
        PlaceResult(name: "Neon Kleidung Store", category: .clothing, address: "Mall Demo", coordinate: Coordinate(latitude: 52.521, longitude: 13.410), distanceKilometers: 1.6, estimatedTravelMinutes: 6, isOpen: true, rating: 4.3),
        PlaceResult(name: "Bankautomat Mitte", category: .atm, address: "Unter den Linden 10", coordinate: Coordinate(latitude: 52.517, longitude: 13.389), distanceKilometers: 0.6, estimatedTravelMinutes: 2, isOpen: true, rating: 4.0),
        PlaceResult(name: "DHL Paketstation Demo", category: .parcelStation, address: "Bahnhofstraße 4", coordinate: Coordinate(latitude: 52.525, longitude: 13.395), distanceKilometers: 1.0, estimatedTravelMinutes: 4, isOpen: true, rating: 4.2),
        PlaceResult(name: "ChargePoint Demo", category: .evCharging, address: "E-Mobility Platz", coordinate: Coordinate(latitude: 52.515, longitude: 13.405), distanceKilometers: 1.9, estimatedTravelMinutes: 8, isOpen: true, rating: 4.6)
    ]
    public static let favorites: [PlaceCategory: PlaceResult] = [
        .home: PlaceResult(name: "Zuhause", category: .home, address: "Lokaler Favorit Zuhause", coordinate: Coordinate(latitude: 52.520, longitude: 13.405), distanceKilometers: 0, estimatedTravelMinutes: 0),
        .school: PlaceResult(name: "Schule", category: .school, address: "Lokaler Favorit Schule", coordinate: Coordinate(latitude: 52.505, longitude: 13.390), distanceKilometers: 3.1, estimatedTravelMinutes: 12),
        .work: PlaceResult(name: "Arbeit", category: .work, address: "Lokaler Favorit Arbeit", coordinate: Coordinate(latitude: 52.535, longitude: 13.410), distanceKilometers: 2.7, estimatedTravelMinutes: 10)
    ]
}
