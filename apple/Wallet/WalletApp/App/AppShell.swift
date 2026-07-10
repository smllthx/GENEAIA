import SwiftUI

enum AppSection: String, CaseIterable, Identifiable {
    case summary
    case transactions
    case automation
    case menu

    var id: String { rawValue }

    var title: String {
        switch self {
        case .summary: "Resumen"
        case .transactions: "Transacciones"
        case .automation: "Automatizacion"
        case .menu: "Menu"
        }
    }

    var symbol: String {
        switch self {
        case .summary: AppIconography.summary
        case .transactions: AppIconography.transactions
        case .automation: AppIconography.automation
        case .menu: AppIconography.menu
        }
    }
}

enum AppAppearance: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "Automatico"
        case .light: "Claro"
        case .dark: "Oscuro"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

struct AppShell: View {
    #if !os(macOS)
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    #endif
    let store: WalletStore
    @State private var selection: AppSection = .summary
    @AppStorage("wallet.appearance") private var appearance = AppAppearance.system

    var body: some View {
        Group {
            #if os(macOS)
            splitView
            #else
            if horizontalSizeClass == .regular {
                splitView
            } else {
                tabView
            }
            #endif
        }
        .background(AppColors.background)
        .preferredColorScheme(appearance.colorScheme)
        .task { await store.load() }
    }

    private var tabView: some View {
        TabView(selection: $selection) {
            ForEach(AppSection.allCases) { section in
                destination(for: section)
                    .tag(section)
                    .tabItem { Label(section.title, systemImage: section.symbol) }
            }
        }
    }

    private var splitView: some View {
        NavigationSplitView {
            List(AppSection.allCases) { section in
                Button {
                    selection = section
                } label: {
                    Label(section.title, systemImage: section.symbol)
                        .frame(maxWidth: .infinity, minHeight: 36, alignment: .leading)
                }
                .buttonStyle(.plain)
                .foregroundStyle(selection == section ? AppColors.accent : .primary)
            }
            .navigationTitle("Wallet")
        } detail: {
            destination(for: selection)
        }
    }

    @ViewBuilder
    private func destination(for section: AppSection) -> some View {
        switch section {
        case .summary: SummaryView(store: store)
        case .transactions: TransactionsView(store: store)
        case .automation: AutomationView()
        case .menu: MenuView(appearance: $appearance)
        }
    }
}

#Preview {
    AppShell(store: WalletStore(repository: MockFinanceRepository()))
}
