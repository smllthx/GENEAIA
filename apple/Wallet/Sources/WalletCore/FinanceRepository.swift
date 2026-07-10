import Foundation

public protocol FinanceRepository: Sendable {
    func loadAccounts() async throws -> [FinanceAccount]
    func loadTransactions() async throws -> [FinancialTransaction]
    func loadDashboard() async throws -> DashboardSnapshot
}

public enum FinanceRepositoryError: LocalizedError, Sendable {
    case unavailable

    public var errorDescription: String? {
        "No pudimos actualizar tus datos. Intenta nuevamente."
    }
}

public struct UnavailableFinanceRepository: FinanceRepository {
    public init() {}

    public func loadAccounts() async throws -> [FinanceAccount] {
        throw FinanceRepositoryError.unavailable
    }

    public func loadTransactions() async throws -> [FinancialTransaction] {
        throw FinanceRepositoryError.unavailable
    }

    public func loadDashboard() async throws -> DashboardSnapshot {
        throw FinanceRepositoryError.unavailable
    }
}
