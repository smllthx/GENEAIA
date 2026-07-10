import SwiftUI

struct AutomationView: View {
    var body: some View {
        NavigationStack {
            AppEmptyState(
                title: "Automatizacion sin configurar",
                message: "La conexion de correos y cartolas se agregara en una entrega posterior.",
                symbol: AppIconography.automation
            )
            .padding(AppSpacing.md)
            .background(AppColors.background)
            .navigationTitle("Automatizacion")
        }
    }
}

#Preview {
    AutomationView()
}
