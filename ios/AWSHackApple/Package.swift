// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "AWSHackApple",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "AWSHackCore", targets: ["AWSHackCore"]),
        .library(name: "AWSHackiOS", targets: ["AWSHackiOS"]),
        .executable(name: "AWSHackPreviewCLI", targets: ["AWSHackPreviewCLI"])
    ],
    targets: [
        .target(name: "AWSHackCore"),
        .target(name: "AWSHackiOS", dependencies: ["AWSHackCore"]),
        .executableTarget(name: "AWSHackPreviewCLI", dependencies: ["AWSHackCore"])
    ]
)
