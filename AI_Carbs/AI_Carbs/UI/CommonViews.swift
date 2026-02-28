import SwiftUI
// MARK: - Reusable UI

struct MetricTile: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading) {
            Text(title)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct LabeledNumberField: View {
    let title: String
    @Binding var value: Double
    let precision: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).foregroundStyle(.secondary)
            TextField(title, value: $value, format: .number.precision(.fractionLength(0...precision)))
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
        }
    }
}
