// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "WalletCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "WalletCore", targets: ["WalletCore"])
    ],
    targets: [
        .target(
            name: "WalletCore",
            path: "Sources/WalletCore"
        ),
        .testTarget(
            name: "WalletCoreTests",
            dependencies: ["WalletCore"],
            path: "Tests/WalletCoreTests"
        )
    ]
)
