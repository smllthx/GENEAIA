import SwiftUI

@main
struct WalletApp: App {
    @State private var store = WalletStore(repository: Self.repository)

    private static var repository: any FinanceRepository {
        #if DEBUG
        MockFinanceRepository()
        #else
        UnavailableFinanceRepository()
        #endif
    }

    var body: some Scene {
        WindowGroup {
            AppShell(store: store)
                .tint(AppColors.accent)
        }
    }
}
