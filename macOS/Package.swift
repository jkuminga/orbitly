// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Orbitly",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "Orbitly", targets: ["Orbitly"])],
    targets: [.executableTarget(name: "Orbitly")]
)
