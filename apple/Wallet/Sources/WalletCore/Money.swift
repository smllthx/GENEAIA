import Foundation

public enum WalletCurrency: String, Codable, CaseIterable, Sendable {
    case clp = "CLP"
    case usd = "USD"
    case eur = "EUR"
}

public struct Money: Codable, Hashable, Sendable {
    public let amount: Decimal
    public let currency: WalletCurrency

    public init(_ amount: Decimal, currency: WalletCurrency = .clp) {
        self.amount = amount
        self.currency = currency
    }

    public static func + (lhs: Money, rhs: Money) -> Money {
        precondition(lhs.currency == rhs.currency, "Currency mismatch")
        return Money(lhs.amount + rhs.amount, currency: lhs.currency)
    }

    public static func - (lhs: Money, rhs: Money) -> Money {
        precondition(lhs.currency == rhs.currency, "Currency mismatch")
        return Money(lhs.amount - rhs.amount, currency: lhs.currency)
    }

    public var formatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.rawValue
        formatter.maximumFractionDigits = currency == .clp ? 0 : 2
        formatter.locale = Locale(identifier: "es_CL")
        return formatter.string(from: amount as NSDecimalNumber) ?? "\(currency.rawValue) \(amount)"
    }
}
