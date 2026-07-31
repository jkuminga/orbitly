import SwiftUI

// RoutineDeskApp: 메뉴바에서 빠른 등록과 오늘 목록을 여는 macOS 앱의 진입점입니다.
@main
struct RoutineDeskApp: App {
    var body: some Scene {
        WindowGroup("Routine Desk") { TodayView() }
        MenuBarExtra("Routine Desk", systemImage: "checklist") {
            MenuBarView()
        }
        .menuBarExtraStyle(.window)
    }
}

// TodoItem: Supabase tasks 테이블의 한 행을 표현하는 모델입니다.
struct TodoItem: Identifiable, Codable {
    let id: UUID
    let title: String
    var isCompleted: Bool
    enum CodingKeys: String, CodingKey { case id, title; case isCompleted = "is_completed" }
}

// TodayView: 오늘의 미완료 작업을 조회하고 추가하는 기본 창입니다.
struct TodayView: View {
    @StateObject private var store = TodoStore()
    @State private var title = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("오늘의 할 일").font(.largeTitle.bold())
            HStack {
                TextField("할 일 추가", text: $title)
                    .onSubmit { store.add(title: title); title = "" }
                Button("추가") { store.add(title: title); title = "" }.keyboardShortcut("n", modifiers: [.command])
            }
            List(store.items) { item in
                Button { store.toggle(item) } label: { Label(item.title, systemImage: item.isCompleted ? "checkmark.circle.fill" : "circle") }
                    .buttonStyle(.plain)
            }
        }
        .padding().frame(minWidth: 380, minHeight: 420)
        .task { await store.load() }
    }
}

// MenuBarView: 메뉴바에서 앱 창을 열거나 빠른 입력을 수행하는 화면입니다.
struct MenuBarView: View {
    @State private var title = ""
    @StateObject private var store = TodoStore()
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("빠른 추가").font(.headline)
            TextField("할 일", text: $title).onSubmit { store.add(title: title); title = "" }
            Button("할 일 추가") { store.add(title: title); title = "" }.keyboardShortcut(.return)
            Divider()
            Button("오늘 목록 열기") { NSApp.activate(ignoringOtherApps: true) }.keyboardShortcut("o", modifiers: [.command])
            Button("종료") { NSApplication.shared.terminate(nil) }
        }.padding().frame(width: 280)
    }
}

// TodoStore: Supabase REST API와 통신하여 tasks를 읽고 수정하는 상태 객체입니다.
@MainActor
final class TodoStore: ObservableObject {
    @Published var items: [TodoItem] = []
    func load() async { /* SupabaseConfig의 URL·accessToken으로 tasks를 GET합니다. */ }
    func add(title: String) { guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }; /* tasks에 POST합니다. */ }
    func toggle(_ item: TodoItem) { /* tasks의 is_completed 값을 PATCH합니다. */ }
}
