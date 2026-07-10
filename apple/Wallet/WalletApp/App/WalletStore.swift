import Foundation
import Observation

@MainActor
@Observable
final class WalletStore {
    private let repository: any FinanceRepository

    var accounts: [FinanceAccount] = []
    var transactions: [FinancialTransaction] = []
    var dashboard: DashboardSnapshot?
    var isLoading = false
    var errorMessage: String?

    init(repository: any FinanceRepository) {
        self.repository = repository
    }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        do {
            async let accounts = repository.loadAccounts()
            async let transactions = repository.loadTransactions()
            async let dashboard = repository.loadDashboard()
            self.accounts = try await accounts
            self.transactions = try await transactions
            self.dashboard = try await dashboard
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func confirm(_ transactionID: UUID) {
        guard let index = transactions.firstIndex(where: { $0.id == transactionID }) else { return }
        transactions[index].status = .confirmed
        AppHaptics.success()
    }
}
