import Charts
import SwiftUI

struct SummaryView: View {
    let store: WalletStore

    private var chartTransactions: [FinancialTransaction] {
        store.transactions.sorted { $0.date < $1.date }
    }

    var body: some View {
        NavigationStack {
            Group {
                if store.isLoading && store.dashboard == nil {
                    AppLoadingState()
                } else if let errorMessage = store.errorMessage, store.dashboard == nil {
                    AppErrorState(message: errorMessage) {
                        Task { await store.load() }
                    }
                } else if let dashboard = store.dashboard {
                    ScrollView {
                        LazyVStack(spacing: AppSpacing.lg) {
                            balanceCard(dashboard)
                            metrics(dashboard)
                            activityChart
                            reviewCard(dashboard)
                            accountsCard
                        }
                        .padding(AppSpacing.md)
                    }
                    .refreshable { await store.load() }
                } else {
                    AppEmptyState(
                        title: "Sin informacion financiera",
                        message: "Conecta tu cuenta para ver el resumen.",
                        symbol: "wallet.bifold"
                    )
                }
            }
            .background(AppColors.background)
            .navigationTitle("Resumen")
        }
    }

    private func balanceCard(_ dashboard: DashboardSnapshot) -> some View {
        AppCard(emphasized: true) {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                Label("Balance disponible", systemImage: AppIconography.balance)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(dashboard.availableBalance.formatted)
                    .font(AppTypography.hero)
                    .minimumScaleFactor(0.72)
                    .lineLimit(1)
                    .contentTransition(.numericText())
                if let syncDate = dashboard.syncDate {
                    Label(syncDate.formatted(date: .omitted, time: .shortened), systemImage: "arrow.triangle.2.circlepath")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .accessibilityElement(children: .combine)
        }
    }

    private func metrics(_ dashboard: DashboardSnapshot) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: AppSpacing.sm)], spacing: AppSpacing.sm) {
            MetricCard(title: "Gastos del mes", value: dashboard.monthlyExpenses.formatted, symbol: "arrow.up.right", color: AppColors.attention)
            MetricCard(title: "Ingresos", value: dashboard.monthlyIncome.formatted, symbol: "arrow.down.left", color: AppColors.positive)
            MetricCard(title: "Pendiente", value: dashboard.pendingExpenses.formatted, symbol: "clock", color: AppColors.information)
            MetricCard(title: "Por revisar", value: "\(dashboard.reviewCount)", symbol: AppIconography.review, color: AppColors.attention)
        }
    }

    private var activityChart: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("Actividad reciente")
                    .font(AppTypography.section)
                if chartTransactions.isEmpty {
                    Text("Todavia no hay movimientos suficientes.")
                        .foregroundStyle(.secondary)
                } else {
                    Chart(chartTransactions) { transaction in
                        BarMark(
                            x: .value("Fecha", transaction.date, unit: .day),
                            y: .value("Monto", NSDecimalNumber(decimal: transaction.amount.amount).doubleValue)
                        )
                        .foregroundStyle(transaction.kind == .income ? AppColors.positive : AppColors.accent)
                        .cornerRadius(4)
                    }
                    .frame(height: 150)
                    .chartYAxis(.hidden)
                    .accessibilityLabel("Grafico de actividad reciente")
                }
            }
        }
    }

    private func reviewCard(_ dashboard: DashboardSnapshot) -> some View {
        AppCard {
            HStack(spacing: AppSpacing.md) {
                Image(systemName: dashboard.reviewCount == 0 ? "checkmark.circle.fill" : "exclamationmark.bubble.fill")
                    .font(.title)
                    .foregroundStyle(dashboard.reviewCount == 0 ? AppColors.positive : AppColors.attention)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: AppSpacing.xxs) {
                    Text(dashboard.reviewCount == 0 ? "Todo revisado" : "Tienes \(dashboard.reviewCount) movimientos por revisar")
                        .font(.headline)
                    Text(dashboard.reviewCount == 0 ? "No hay acciones pendientes." : "Confirma su categoria cuando tengas un momento.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .accessibilityElement(children: .combine)
        }
    }

    private var accountsCard: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.md) {
                Text("Cuentas")
                    .font(AppTypography.section)
                ForEach(store.accounts) { account in
                    HStack(spacing: AppSpacing.sm) {
                        Image(systemName: account.symbol)
                            .frame(width: 32, height: 32)
                            .foregroundStyle(AppColors.accent)
                        VStack(alignment: .leading) {
                            Text(account.name).font(.headline)
                            Text(account.institution).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(account.balance.formatted).font(.headline.monospacedDigit())
                    }
                    .accessibilityElement(children: .combine)
                    if account.id != store.accounts.last?.id { Divider() }
                }
            }
        }
    }
}

private struct MetricCard: View {
    let title: String
    let value: String
    let symbol: String
    let color: Color

    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Image(systemName: symbol)
                    .font(.title3)
                    .foregroundStyle(color)
                    .accessibilityHidden(true)
                Text(value)
                    .font(AppTypography.metric)
                    .minimumScaleFactor(0.75)
                    .lineLimit(1)
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .accessibilityElement(children: .combine)
        }
    }
}

#Preview("Resumen") {
    SummaryView(store: WalletStore(repository: MockFinanceRepository()))
        .task {
            // Preview data uses the same replaceable repository contract.
        }
}
