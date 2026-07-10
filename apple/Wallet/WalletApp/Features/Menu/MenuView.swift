import SwiftUI

private struct MenuDestination: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let message: String
    let symbol: String
}

struct MenuView: View {
    @Binding var appearance: AppAppearance

    private let destinations = [
        MenuDestination(title: "Cuenta", message: "Administra los datos y el acceso de tu cuenta.", symbol: "person.crop.circle"),
        MenuDestination(title: "Bancos", message: "Revisa conexiones read-only y su estado.", symbol: "building.columns"),
        MenuDestination(title: "Categorias", message: "Organiza las categorias de tus movimientos.", symbol: "square.grid.2x2"),
        MenuDestination(title: "Privacidad", message: "Wallet nunca solicita claves bancarias ni acceso completo a tu correo.", symbol: "hand.raised.fill"),
        MenuDestination(title: "Soporte", message: "Consulta ayuda sobre acceso, cuentas y movimientos.", symbol: "questionmark.circle")
    ]

    var body: some View {
        NavigationStack {
            List {
                Section("Apariencia") {
                    Picker("Modo", selection: $appearance) {
                        ForEach(AppAppearance.allCases) { option in
                            Text(option.title).tag(option)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Wallet") {
                    ForEach(destinations) { destination in
                        NavigationLink(value: destination) {
                            Label(destination.title, systemImage: destination.symbol)
                                .frame(minHeight: 44)
                        }
                    }
                }
            }
            .navigationDestination(for: MenuDestination.self) { destination in
                AppEmptyState(title: destination.title, message: destination.message, symbol: destination.symbol)
                    .padding(AppSpacing.md)
                    .navigationTitle(destination.title)
            }
            .navigationTitle("Menu")
        }
    }
}

#Preview {
    MenuView(appearance: .constant(.system))
}
