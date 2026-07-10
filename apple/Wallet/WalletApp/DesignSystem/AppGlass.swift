import SwiftUI

private struct AppGlassModifier: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.accessibilityContrast) private var contrast

    let radius: CGFloat
    let emphasized: Bool

    func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(reduceTransparency ? AnyShapeStyle(AppColors.surface) : AnyShapeStyle(.thinMaterial))
            }
            .overlay {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(
                        contrast == .increased ? AppColors.separator : Color.white.opacity(0.22),
                        lineWidth: contrast == .increased ? 1.5 : 0.75
                    )
            }
            .shadow(
                color: emphasized ? AppColors.accent.opacity(0.12) : Color.black.opacity(0.06),
                radius: emphasized ? 18 : 10,
                y: 6
            )
    }
}

extension View {
    func appGlass(radius: CGFloat = AppRadius.large, emphasized: Bool = false) -> some View {
        modifier(AppGlassModifier(radius: radius, emphasized: emphasized))
    }
}

struct AppCard<Content: View>: View {
    let emphasized: Bool
    @ViewBuilder let content: Content

    init(emphasized: Bool = false, @ViewBuilder content: () -> Content) {
        self.emphasized = emphasized
        self.content = content()
    }

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(AppSpacing.lg)
            .appGlass(radius: AppRadius.large, emphasized: emphasized)
    }
}
