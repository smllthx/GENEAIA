import Foundation
import Testing
@testable import WalletCore

@Test func moneyUsesDecimalArithmetic() {
    let first = Money(Decimal(string: "0.1")!)
    let second = Money(Decimal(string: "0.2")!)
    #expect((first + second).amount == Decimal(string: "0.3")!)
}

@Test func moneyKeepsCurrency() {
    let total = Money(1_000, currency: .clp) + Money(500, currency: .clp)
    #expect(total.amount == 1_500)
    #expect(total.currency == .clp)
}
