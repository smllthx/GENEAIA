import Foundation

public struct FinanceAccount: Identifiable, Codable, Hashable, Sendable {
    public let id: UUID
    public let name: String
    public let institution: String
    public let balance: Money
    public let symbol: String
    public let updatedAt: Date

    public init(
        id: UUID = UUID(),
        name: String,
        institution: String,
        balance: Money,
        symbol: String,
        updatedAt: Date
    ) {
        self.id = id
        self.name = name
        self.institution = institution
        self.balance = balance
        self.symbol = symbol
        self.updatedAt = updatedAt
    }
}

public enum TransactionKind: String, Codable, CaseIterable, Sendable {
    case expense
    case income
    case transfer
}

public enum TransactionStatus: String, Codable, CaseIterable, Sendable {
    case provisional
    case suggested
    case needsReview
    case confirmed
    case confirmedByStatement
    case edited

    public var title: String {
        switch self {
        case .provisional: "Provisional"
        case .suggested: "Sugerido"
        case .needsReview: "Requiere revision"
        case .confirmed: "Confirmado"
        case .confirmedByStatement: "Confirmado por cartola"
        case .edited: "Editado"
        }
    }

    public var symbol: String {
        switch self {
        case .provisional: "clock"
        case .suggested: "sparkles"
        case .needsReview: "exclamationmark.triangle.fill"
        case .confirmed, .confirmedByStatement: "checkmark.circle.fill"
        case .edited: "pencil.circle.fill"
        }
    }
}

public struct FinancialTransaction: Identifiable, Codable, Hashable, Sendable {
    public let id: UUID
    public let merchant: String
    public let category: String
    public let amount: Money
    public let date: Date
    public let kind: TransactionKind
    public var status: TransactionStatus
    public let symbol: String

    public init(
        id: UUID = UUID(),
        merchant: String,
        category: String,
        amount: Money,
        date: Date,
        kind: TransactionKind,
        status: TransactionStatus,
        symbol: String
    ) {
        self.id = id
        self.merchant = merchant
        self.category = category
        self.amount = amount
        self.date = date
        self.kind = kind
        self.status = status
        self.symbol = symbol
    }

    public var accessibilitySummary: String {
        "\(merchant), \(amount.formatted), \(category), \(status.title)"
    }
}

public struct DashboardSnapshot: Sendable {
    public let availableBalance: Money
    public let monthlyExpenses: Money
    public let monthlyIncome: Money
    public let pendingExpenses: Money
    public let reviewCount: Int
    public let syncDate: Date?

    public init(
        availableBalance: Money,
        monthlyExpenses: Money,
        monthlyIncome: Money,
        pendingExpenses: Money,
        reviewCount: Int,
        syncDate: Date?
    ) {
        self.availableBalance = availableBalance
        self.monthlyExpenses = monthlyExpenses
        self.monthlyIncome = monthlyIncome
        self.pendingExpenses = pendingExpenses
        self.reviewCount = reviewCount
        self.syncDate = syncDate
    }
}
