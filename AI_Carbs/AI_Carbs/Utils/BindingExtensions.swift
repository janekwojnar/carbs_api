import SwiftUI
extension Binding where Value == Int {
    var doubleBinding: Binding<Double> {
        Binding<Double>(
            get: { Double(wrappedValue) },
            set: { wrappedValue = Int($0) }
        )
    }
}

extension Binding where Value == Double? {
    var doubleBinding: Binding<Double> {
        Binding<Double>(
            get: { wrappedValue ?? 0 },
            set: { wrappedValue = $0 }
        )
    }
}

extension Binding {
    init(_ source: Binding<Value?>, replacingNilWith nilReplacement: Value) {
        self.init(
            get: { source.wrappedValue ?? nilReplacement },
            set: { source.wrappedValue = $0 }
        )
    }
}

struct IdentifiedURL: Identifiable {
    let id = UUID()
    let url: URL
}
