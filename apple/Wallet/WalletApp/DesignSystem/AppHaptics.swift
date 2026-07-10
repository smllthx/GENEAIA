#if os(iOS)
import UIKit

enum AppHaptics {
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    static func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }
}
#else
enum AppHaptics {
    static func success() {}
    static func selection() {}
}
#endif
