import Testing
@testable import WalletCore

@Test func mockRepositoryLoadsCoherentData() async throws {
    let repository = MockFinanceRepository()
    let accounts = try await repository.loadAccounts()
    let transactions = try await repository.loadTransactions()
    let dashboard = try await repository.loadDashboard()

    #expect(!accounts.isEmpty)
    #expect(!transactions.isEmpty)
    #expect(dashboard.reviewCount == transactions.filter { $0.status == .needsReview || $0.status == .provisional }.count)
}

@Test func transactionAccessibilitySummaryIncludesState() async throws {
    let transaction = try #require(try await MockFinanceRepository().loadTransactions().first)
    #expect(transaction.accessibilitySummary.contains(transaction.merchant))
    #expect(transaction.accessibilitySummary.contains(transaction.status.title))
}
