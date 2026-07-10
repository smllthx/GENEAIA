import Foundation

public struct MockFinanceRepository: FinanceRepository {
    private let calendar = Calendar(identifier: .gregorian)
    private let now: Date

    public init(now: Date = Date()) {
        self.now = now
    }

    public func loadAccounts() async throws -> [FinanceAccount] {
        [
            FinanceAccount(
                name: "Cuenta corriente",
                institution: "Banco conectado",
                balance: Money(1_245_300),
                symbol: "building.columns.fill",
                updatedAt: now
            ),
            FinanceAccount(
                name: "Ahorro",
                institution: "Wallet",
                balance: Money(620_000),
                symbol: "target",
                updatedAt: now
            )
        ]
    }

    public func loadTransactions() async throws -> [FinancialTransaction] {
        [
            transaction("Supermercado", category: "Alimentacion", amount: 38_490, daysAgo: 0, status: .needsReview, symbol: "cart.fill"),
            transaction("Transporte", category: "Transporte", amount: 8_250, daysAgo: 0, status: .provisional, symbol: "car.fill"),
            transaction("Suscripcion", category: "Suscripciones", amount: 7_990, daysAgo: 1, status: .confirmed, symbol: "play.rectangle.fill"),
            FinancialTransaction(
                merchant: "Ingreso mensual",
                category: "Ingresos",
                amount: Money(1_100_000),
                date: calendar.date(byAdding: .day, value: -3, to: now) ?? now,
                kind: .income,
                status: .confirmedByStatement,
                symbol: "arrow.down.circle.fill"
            )
        ]
    }

    public func loadDashboard() async throws -> DashboardSnapshot {
        DashboardSnapshot(
            availableBalance: Money(1_865_300),
            monthlyExpenses: Money(287_430),
            monthlyIncome: Money(1_100_000),
            pendingExpenses: Money(46_740),
            reviewCount: 2,
            syncDate: now
        )
    }

    private func transaction(
        _ merchant: String,
        category: String,
        amount: Decimal,
        daysAgo: Int,
        status: TransactionStatus,
        symbol: String
    ) -> FinancialTransaction {
        FinancialTransaction(
            merchant: merchant,
            category: category,
            amount: Money(amount),
            date: calendar.date(byAdding: .day, value: -daysAgo, to: now) ?? now,
            kind: .expense,
            status: status,
            symbol: symbol
        )
    }
}
