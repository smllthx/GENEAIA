# Wallet para Apple

Primera entrega nativa en SwiftUI para iPhone, iPad y macOS.

## Abrir

Abre `Wallet.xcodeproj` con Xcode 16 o posterior. El target usa iOS 17 y macOS 14 para Observation, NavigationSplitView y SwiftUI moderno.

## Estructura

- `WalletApp/`: aplicacion, Design System y features SwiftUI.
- `Sources/WalletCore/`: modelos y protocolos sin dependencia de UI.
- `Tests/WalletCoreTests/`: dinero, repositorio y accesibilidad.

Los datos de muestra solo existen en `MockFinanceRepository`. Una implementacion futura de `FinanceRepository` consumira la API autenticada de Wallet.

## Verificacion disponible sin Xcode

```bash
swift test
```

Para compilar el target iOS o ejecutar previews se requiere Xcode completo, no solo Command Line Tools.
