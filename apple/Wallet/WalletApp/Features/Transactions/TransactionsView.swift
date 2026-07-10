import SwiftUI

private enum TransactionFilter: String, CaseIterable, Identifiable {
    case all = "Todas"
    case review = "Por revisar"
    case confirmed = "Confirmadas"

    var id: String { rawValue }
}

struct TransactionsView: View {
    let store: WalletStore
    @State private var searchText = ""
    @State private var filter: TransactionFilter = .all
    @State private var selectedTransaction: FinancialTransaction?

    private var filteredTransactions: [FinancialTransaction] {
        store.transactions.filter { transaction in
            let matchesSearch = searchText.isEmpty ||
                transaction.merchant.localizedCaseInsensitiveContains(searchText) ||
                transaction.category.localizedCaseInsensitiveContains(searchText)
            let matchesFilter: Bool
            switch filter {
            case .all:
                matchesFilter = true
            case .review:
                matchesFilter = transaction.status == .needsReview || transaction.status == .provisional || transaction.status == .suggested
            case .confirmed:
                matchesFilter = transaction.status == .confirmed || transaction.status == .confirmedByStatement
            }
            return matchesSearch && matchesFilter
        }
        .sorted { $0.date > $1.date }
    }

    private var groupedTransactions: [(Date, [FinancialTransaction])] {
        let calendar = Calendar.current
        let groups = Dictionary(grouping: filteredTransactions) { calendar.startOfDay(for: $0.date) }
        return groups.sorted { $0.key > $1.key }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Filtro", selection: $filter) {
                    ForEach(TransactionFilter.allCases) { option in
                        Text(option.rawValue).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)

                if store.isLoading && store.transactions.isEmpty {
                    AppLoadingState()
                } else if filteredTransactions.isEmpty {
                    AppEmptyState(
                        title: searchText.isEmpty ? "Sin movimientos" : "Sin resultados",
                        message: searchText.isEmpty ? "Los movimientos apareceran aqui." : "Prueba otra busqueda o filtro.",
                        symbol: "list.bullet.rectangle"
                    )
                } else {
                    List {
                        ForEach(groupedTransactions, id: \.0) { date, transactions in
                            Section(date.formatted(date: .abbreviated, time: .omitted)) {
                                ForEach(transactions) { transaction in
                                    Button {
                                        selectedTransaction = transaction
                                        AppHaptics.selection()
                                    } label: {
                                        TransactionRow(transaction: transaction)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .listStyle(.inset)
                    .refreshable { await store.load() }
                }
            }
            .background(AppColors.background)
            .navigationTitle("Transacciones")
            .searchable(text: $searchText, prompt: "Comercio o categoria")
            .sheet(item: $selectedTransaction) { transaction in
                TransactionDetailView(transaction: transaction) {
                    store.confirm(transaction.id)
                    selectedTransaction = nil
                }
                .presentationDetents([.medium, .large])
            }
        }
    }
}

private struct TransactionRow: View {
    let transaction: FinancialTransaction

    var body: some View {
        HStack(spacing: AppSpacing.sm) {
            Image(systemName: transaction.symbol)
                .font(.headline)
                .foregroundStyle(AppColors.accent)
                .frame(width: 40, height: 40)
                .background(AppColors.accent.opacity(0.1), in: RoundedRectangle(cornerRadius: AppRadius.small))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                Text(transaction.merchant).font(.headline)
                Text(transaction.category).font(.caption).foregroundStyle(.secondary)
                AppStatusChip(status: transaction.status)
            }
            Spacer(minLength: AppSpacing.sm)
            Text(transaction.kind == .expense ? "-\(transaction.amount.formatted)" : transaction.amount.formatted)
                .font(.headline.monospacedDigit())
                .foregroundStyle(transaction.kind == .income ? AppColors.positive : .primary)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
        }
        .padding(.vertical, AppSpacing.xxs)
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(transaction.accessibilitySummary)
        .accessibilityHint("Abre el detalle de la transaccion")
    }
}

private struct TransactionDetailView: View {
    let transaction: FinancialTransaction
    let confirm: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AppSpacing.lg) {
                    Text(transaction.amount.formatted)
                        .font(AppTypography.hero)
                        .minimumScaleFactor(0.75)
                    AppStatusChip(status: transaction.status)
                    LabeledContent("Comercio", value: transaction.merchant)
                    LabeledContent("Categoria", value: transaction.category)
                    LabeledContent("Fecha", value: transaction.date.formatted(date: .long, time: .shortened))
                    Divider()
                    Button("Confirmar movimiento", action: confirm)
                        .buttonStyle(AppPrimaryButtonStyle())
                        .disabled(transaction.status == .confirmed || transaction.status == .confirmedByStatement)
                }
                .padding(AppSpacing.lg)
            }
            .navigationTitle("Detalle")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar") { dismiss() }
                }
            }
        }
    }
}

#Preview("Transacciones") {
    TransactionsView(store: WalletStore(repository: MockFinanceRepository()))
}
