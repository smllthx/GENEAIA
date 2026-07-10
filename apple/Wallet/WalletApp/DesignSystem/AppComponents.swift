import SwiftUI

struct AppPrimaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(minHeight: 44)
            .padding(.horizontal, AppSpacing.lg)
            .foregroundStyle(.white)
            .background(AppColors.accent, in: Capsule())
            .opacity(configuration.isPressed ? 0.82 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(reduceMotion ? nil : AppAnimation.standard, value: configuration.isPressed)
    }
}

struct AppFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, AppSpacing.md)
            .frame(minHeight: 44)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.small, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AppRadius.small, style: .continuous)
                    .strokeBorder(AppColors.separator.opacity(0.7))
            }
    }
}

struct AppStatusChip: View {
    let status: TransactionStatus

    private var color: Color {
        switch status {
        case .confirmed, .confirmedByStatement: AppColors.positive
        case .needsReview: AppColors.attention
        case .provisional, .suggested: AppColors.information
        case .edited: Color.secondary
        }
    }

    var body: some View {
        Label(status.title, systemImage: status.symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, AppSpacing.sm)
            .padding(.vertical, AppSpacing.xs)
            .background(color.opacity(0.12), in: Capsule())
            .accessibilityElement(children: .combine)
    }
}

struct AppEmptyState: View {
    let title: String
    let message: String
    let symbol: String

    var body: some View {
        ContentUnavailableView(title, systemImage: symbol, description: Text(message))
            .frame(maxWidth: .infinity, minHeight: 220)
            .accessibilityElement(children: .combine)
    }
}

struct AppLoadingState: View {
    var body: some View {
        VStack(spacing: AppSpacing.md) {
            ProgressView()
            Text("Actualizando tus finanzas")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, minHeight: 220)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Actualizando tus finanzas")
    }
}

struct AppErrorState: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label("No pudimos actualizar", systemImage: "exclamationmark.triangle.fill")
        } description: {
            Text(message)
        } actions: {
            Button("Intentar nuevamente", action: retry)
                .buttonStyle(AppPrimaryButtonStyle())
        }
    }
}
