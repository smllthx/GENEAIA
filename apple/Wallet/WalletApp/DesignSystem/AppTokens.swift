import SwiftUI

enum AppSpacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 40
}

enum AppRadius {
    static let small: CGFloat = 10
    static let medium: CGFloat = 16
    static let large: CGFloat = 22
    static let hero: CGFloat = 28
}

enum AppColors {
    static let accent = Color.accentColor
    static let positive = Color.green
    static let attention = Color.orange
    static let danger = Color.red
    static let information = Color.blue

    static var background: Color {
        #if os(iOS)
        Color(uiColor: .systemGroupedBackground)
        #else
        Color(nsColor: .windowBackgroundColor)
        #endif
    }

    static var surface: Color {
        #if os(iOS)
        Color(uiColor: .secondarySystemGroupedBackground)
        #else
        Color(nsColor: .controlBackgroundColor)
        #endif
    }

    static var separator: Color {
        #if os(iOS)
        Color(uiColor: .separator)
        #else
        Color(nsColor: .separatorColor)
        #endif
    }
}

enum AppTypography {
    static let hero = Font.system(.largeTitle, design: .rounded, weight: .bold)
    static let metric = Font.system(.title, design: .rounded, weight: .bold)
    static let section = Font.system(.title3, design: .rounded, weight: .semibold)
    static let body = Font.body
    static let caption = Font.caption
}

enum AppIconography {
    static let summary = "chart.pie.fill"
    static let transactions = "list.bullet.rectangle.portrait.fill"
    static let automation = "bolt.horizontal.circle.fill"
    static let menu = "ellipsis.circle.fill"
    static let balance = "wallet.bifold.fill"
    static let review = "checklist"
}

enum AppAnimation {
    static let standard = Animation.spring(duration: 0.32, bounce: 0.12)
}
