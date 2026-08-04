import SwiftUI
import Security

// SupabaseConfig: Supabase API URL과 공개 Publishable key를 기기에 저장하는 설정입니다.
struct SupabaseConfig: Codable, Equatable {
    var url: String
    var publishableKey: String
    var isComplete: Bool { URL(string: url) != nil && publishableKey.hasPrefix("sb_publishable_") }
}

// SupabaseSession: Auth가 발급한 로그인 토큰과 만료 시각입니다.
struct SupabaseSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
    enum CodingKeys: String, CodingKey { case accessToken = "access_token", refreshToken = "refresh_token", expiresIn = "expires_in", expiresAt = "expires_at" }
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        accessToken = try container.decode(String.self, forKey: .accessToken)
        refreshToken = try container.decode(String.self, forKey: .refreshToken)
        if let savedExpiry = try container.decodeIfPresent(Date.self, forKey: .expiresAt) { expiresAt = savedExpiry }
        else { expiresAt = Date().addingTimeInterval(TimeInterval(try container.decode(Int.self, forKey: .expiresIn))) }
    }
    init(accessToken: String, refreshToken: String, expiresAt: Date) { self.accessToken = accessToken; self.refreshToken = refreshToken; self.expiresAt = expiresAt }
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(accessToken, forKey: .accessToken)
        try container.encode(refreshToken, forKey: .refreshToken)
        try container.encode(expiresAt, forKey: .expiresAt)
    }
}

// TaskItem: tasks 테이블의 한 행으로, 한 번 완료하면 끝나는 할 일입니다.
struct TaskItem: Identifiable, Codable {
    let id: UUID
    let title: String
    let isCompleted: Bool
    enum CodingKeys: String, CodingKey { case id, title; case isCompleted = "is_completed" }
}

// RoutineItem: routines 테이블의 한 행으로, 매일 반복하는 루틴입니다.
struct RoutineItem: Identifiable, Codable {
    let id: UUID
    let title: String
    let sortOrder: Int
    enum CodingKeys: String, CodingKey { case id, title; case sortOrder = "sort_order" }
}

// RoutineCompletion: 특정 날짜에 루틴을 완료한 기록입니다.
struct RoutineCompletion: Codable { let routineID: UUID; enum CodingKeys: String, CodingKey { case routineID = "routine_id" } }

// KeychainStore: access token을 일반 파일 대신 macOS Keychain에 보관합니다.
enum KeychainStore {
    private static let service = "app.orbitly.mac"
    private static let account = "supabase-session"
    static func save(_ session: SupabaseSession) throws {
        let data = try JSONEncoder().encode(session)
        SecItemDelete([kSecClass: kSecClassGenericPassword, kSecAttrService: service, kSecAttrAccount: account] as CFDictionary)
        let result = SecItemAdd([kSecClass: kSecClassGenericPassword, kSecAttrService: service, kSecAttrAccount: account, kSecValueData: data] as CFDictionary, nil)
        guard result == errSecSuccess else { throw NSError(domain: "OrbitlyKeychain", code: Int(result)) }
    }
    static func read() -> SupabaseSession? {
        var item: CFTypeRef?
        let result = SecItemCopyMatching([kSecClass: kSecClassGenericPassword, kSecAttrService: service, kSecAttrAccount: account, kSecReturnData: true] as CFDictionary, &item)
        guard result == errSecSuccess, let data = item as? Data else { return nil }
        return try? JSONDecoder().decode(SupabaseSession.self, from: data)
    }
    static func remove() { SecItemDelete([kSecClass: kSecClassGenericPassword, kSecAttrService: service, kSecAttrAccount: account] as CFDictionary) }
}

// OrbitlyError: 네트워크와 Supabase 오류를 사용자에게 보여줄 수 있는 오류입니다.
struct OrbitlyError: LocalizedError { let message: String; var errorDescription: String? { message } }

// SupabaseClient: Auth와 REST API 요청을 수행하는 네트워크 클라이언트입니다.
struct SupabaseClient {
    let config: SupabaseConfig
    private var baseURL: URL { URL(string: config.url)! }
    private func url(for path: String) -> URL { URL(string: path, relativeTo: baseURL)! }
    func signIn(email: String, password: String) async throws -> SupabaseSession {
        try await request(path: "/auth/v1/token?grant_type=password", method: "POST", body: ["email": email, "password": password], token: nil)
    }
    func refresh(_ session: SupabaseSession) async throws -> SupabaseSession {
        try await request(path: "/auth/v1/token?grant_type=refresh_token", method: "POST", body: ["refresh_token": session.refreshToken], token: nil)
    }
    func tasks(token: String) async throws -> [TaskItem] { try await request(path: "/rest/v1/tasks?select=*&order=is_completed.asc,created_at.desc", token: token) }
    func routines(token: String) async throws -> [RoutineItem] { try await request(path: "/rest/v1/routines?select=*&is_active=eq.true&order=sort_order.asc", token: token) }
    func completions(token: String, day: String) async throws -> [RoutineCompletion] { try await request(path: "/rest/v1/routine_completions?select=routine_id&completed_on=eq.\(day)", token: token) }
    func addTask(title: String, token: String) async throws { let _: [TaskItem] = try await request(path: "/rest/v1/tasks", method: "POST", body: ["title": title], token: token) }
    func addRoutine(title: String, sortOrder: Int, token: String) async throws { let _: [RoutineItem] = try await request(path: "/rest/v1/routines", method: "POST", body: ["title": title, "sort_order": sortOrder], token: token) }
    func setTask(_ task: TaskItem, token: String) async throws { let _: [TaskItem] = try await request(path: "/rest/v1/tasks?id=eq.\(task.id.uuidString)", method: "PATCH", body: ["is_completed": !task.isCompleted, "completed_at": !task.isCompleted ? ISO8601DateFormatter().string(from: Date()) : NSNull()], token: token) }
    func setRoutine(_ routineID: UUID, completed: Bool, day: String, token: String) async throws {
        if completed { let _: [RoutineCompletion] = try await request(path: "/rest/v1/routine_completions?routine_id=eq.\(routineID.uuidString)&completed_on=eq.\(day)", method: "DELETE", token: token) }
        else { let _: [RoutineCompletion] = try await request(path: "/rest/v1/routine_completions", method: "POST", body: ["routine_id": routineID.uuidString, "completed_on": day], token: token) }
    }
    // deleteTask: tasks 테이블에서 선택한 일회성 할 일을 삭제합니다.
    func deleteTask(_ taskID: UUID, token: String) async throws { let _: [TaskItem] = try await request(path: "/rest/v1/tasks?id=eq.\(taskID.uuidString)", method: "DELETE", token: token) }
    // deleteRoutine: routines 테이블에서 루틴과 연결된 완료 기록을 함께 삭제합니다.
    func deleteRoutine(_ routineID: UUID, token: String) async throws { let _: [RoutineItem] = try await request(path: "/rest/v1/routines?id=eq.\(routineID.uuidString)", method: "DELETE", token: token) }
    private func request<Response: Decodable>(path: String, method: String = "GET", body: [String: Any]? = nil, token: String?) async throws -> Response {
        var request = URLRequest(url: url(for: path))
        request.httpMethod = method
        request.setValue(config.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let detail = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["message"] as? String ?? "Supabase 요청이 실패했습니다. (HTTP \(code))"
            throw OrbitlyError(message: detail)
        }
        if Response.self == EmptyResponse.self { return EmptyResponse() as! Response }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}

private struct EmptyResponse: Codable {}

// OrbitlyStore: 화면 상태와 Supabase 동기화를 관리하는 앱의 상태 객체입니다.
@MainActor
final class OrbitlyStore: ObservableObject {
    @Published var config = SupabaseConfig(url: UserDefaults.standard.string(forKey: "supabaseURL") ?? "", publishableKey: UserDefaults.standard.string(forKey: "supabasePublishableKey") ?? "")
    @Published var session: SupabaseSession? = nil
    @Published var tasks: [TaskItem] = []
    @Published var routines: [RoutineItem] = []
    @Published var completedRoutineIDs = Set<UUID>()
    @Published var errorMessage: String?
    @Published var isLoading = false
    private var client: SupabaseClient? { config.isComplete ? SupabaseClient(config: config) : nil }
    private var today: String { ISO8601DateFormatter().string(from: Date()).prefix(10).description }
    init() { session = KeychainStore.read() }
    func saveConfig() { UserDefaults.standard.set(config.url.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "supabaseURL"); UserDefaults.standard.set(config.publishableKey.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "supabasePublishableKey") }
    func signIn(email: String, password: String) async {
        guard let client else { errorMessage = "Supabase 설정을 먼저 입력해주세요."; return }
        await run { let session = try await client.signIn(email: email, password: password); self.session = session; try KeychainStore.save(session); await self.load() }
    }
    func restoreAndLoad() async {
        guard let session, let client else { return }
        await run {
            let fresh = session.expiresAt < Date().addingTimeInterval(60) ? try await client.refresh(session) : session
            self.session = fresh; try KeychainStore.save(fresh); await self.load()
        }
    }
    func load() async {
        guard let token = session?.accessToken, let client else { return }
        await run {
            async let taskResult = client.tasks(token: token)
            async let routineResult = client.routines(token: token)
            async let completionResult = client.completions(token: token, day: self.today)
            let (loadedTasks, loadedRoutines, completions) = try await (taskResult, routineResult, completionResult)
            self.tasks = loadedTasks; self.routines = loadedRoutines; self.completedRoutineIDs = Set(completions.map(\.routineID))
        }
    }
    func addTask(_ title: String) async { guard let token = session?.accessToken, let client, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }; await run { try await client.addTask(title: title, token: token); await self.load() } }
    func addRoutine(_ title: String) async { guard let token = session?.accessToken, let client, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }; await run { try await client.addRoutine(title: title, sortOrder: self.routines.count, token: token); await self.load() } }
    func toggleTask(_ task: TaskItem) async { guard let token = session?.accessToken, let client else { return }; await run { try await client.setTask(task, token: token); await self.load() } }
    func toggleRoutine(_ routine: RoutineItem) async { guard let token = session?.accessToken, let client else { return }; await run { try await client.setRoutine(routine.id, completed: self.completedRoutineIDs.contains(routine.id), day: self.today, token: token); await self.load() } }
    func deleteTask(_ task: TaskItem) async { guard let token = session?.accessToken, let client else { return }; await run { try await client.deleteTask(task.id, token: token); await self.load() } }
    func deleteRoutine(_ routine: RoutineItem) async { guard let token = session?.accessToken, let client else { return }; await run { try await client.deleteRoutine(routine.id, token: token); await self.load() } }
    func signOut() { KeychainStore.remove(); session = nil; tasks = []; routines = []; completedRoutineIDs = [] }
    private func run(_ work: @escaping () async throws -> Void) async { isLoading = true; errorMessage = nil; defer { isLoading = false }; do { try await work() } catch { if let message = (error as? LocalizedError)?.errorDescription, message.lowercased().contains("jwt") { signOut() }; errorMessage = error.localizedDescription } }
}

// OrbitlyAppDelegate: 실행·재실행 시 Orbitly 창을 활성화하고 키 입력 포커스를 부여합니다.
final class OrbitlyAppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) { focusMainWindow(after: 0.15) }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { focusMainWindow(after: 0); return true }
    private func focusMainWindow(after delay: TimeInterval) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            NSApp.activate(ignoringOtherApps: true)
            let window = NSApp.windows.first { $0.canBecomeKey }
            window?.makeKeyAndOrderFront(nil)
        }
    }
}

@main
struct OrbitlyApp: App {
    @StateObject private var store = OrbitlyStore()
    @NSApplicationDelegateAdaptor(OrbitlyAppDelegate.self) private var appDelegate
    var body: some Scene {
        WindowGroup("Orbitly") { RootView().environmentObject(store).task { await store.restoreAndLoad() } }
        MenuBarExtra("Orbitly", systemImage: "circle.dotted") { MenuBarView().environmentObject(store) }.menuBarExtraStyle(.window)
    }
}

// RootView: 설정, 로그인, 오늘 목록 화면을 현재 상태에 맞춰 전환합니다.
struct RootView: View {
    @EnvironmentObject private var store: OrbitlyStore
    var body: some View { Group { if !store.config.isComplete { ConfigView() } else if store.session == nil { SignInView() } else { TodayView() } }.alert("Orbitly", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage = nil } })) { Button("확인", role: .cancel) {} } message: { Text(store.errorMessage ?? "") } }
}

struct ConfigView: View {
    @EnvironmentObject private var store: OrbitlyStore
    @FocusState private var isURLFocused: Bool
    var body: some View { Form { Section("Supabase 연결") { TextField("Project URL", text: $store.config.url).focused($isURLFocused); SecureField("Publishable key", text: $store.config.publishableKey); Text("Publishable key는 RLS 정책과 함께 사용하는 공개 키입니다.").font(.caption).foregroundStyle(.secondary) }; Button("설정 저장") { store.saveConfig() }.disabled(!store.config.isComplete) }.padding().frame(width: 440).onAppear { isURLFocused = true } }
}

struct SignInView: View {
    @EnvironmentObject private var store: OrbitlyStore
    @State private var email = ""; @State private var password = ""
    @FocusState private var isEmailFocused: Bool
    var body: some View { VStack(alignment: .leading, spacing: 18) { Text("Orbitly").font(.largeTitle.bold()); Text("Mac과 iPhone의 할 일을 함께 관리합니다.").foregroundStyle(.secondary); TextField("이메일", text: $email).focused($isEmailFocused); SecureField("비밀번호", text: $password); Button("로그인") { Task { await store.signIn(email: email, password: password) } }.keyboardShortcut(.defaultAction).disabled(store.isLoading || email.isEmpty || password.isEmpty) }.padding(32).frame(width: 380).onAppear { isEmailFocused = true } }
}

struct TodayView: View {
    @EnvironmentObject private var store: OrbitlyStore
    @State private var taskTitle = ""; @State private var routineTitle = ""
    @State private var deletion: PendingDeletion?
    var body: some View { VStack(alignment: .leading, spacing: 18) { HStack { VStack(alignment: .leading) { Text("오늘의 흐름").font(.largeTitle.bold()); Text(Date.now.formatted(date: .abbreviated, time: .omitted)).foregroundStyle(.secondary) }; Spacer(); Button("새로고침") { Task { await store.load() } }; Button("로그아웃") { store.signOut() } }.padding(.bottom, 6); HStack(alignment: .top, spacing: 16) { ItemColumn(title: "매일 할 루틴", input: $routineTitle, placeholder: "루틴 추가", items: store.routines.map { ($0.id, $0.title, store.completedRoutineIDs.contains($0.id)) }, onAdd: { Task { await store.addRoutine(routineTitle); routineTitle = "" } }, onToggle: { id in if let item = store.routines.first(where: { $0.id == id }) { Task { await store.toggleRoutine(item) } } }, onDelete: { id in if let item = store.routines.first(where: { $0.id == id }) { deletion = PendingDeletion(id: id, title: item.title, kind: .routine) } }); ItemColumn(title: "해야 할 일", input: $taskTitle, placeholder: "할 일 추가", items: store.tasks.map { ($0.id, $0.title, $0.isCompleted) }, onAdd: { Task { await store.addTask(taskTitle); taskTitle = "" } }, onToggle: { id in if let item = store.tasks.first(where: { $0.id == id }) { Task { await store.toggleTask(item) } } }, onDelete: { id in if let item = store.tasks.first(where: { $0.id == id }) { deletion = PendingDeletion(id: id, title: item.title, kind: .task) } }) } }.padding(28).frame(minWidth: 720, minHeight: 440).confirmationDialog("항목을 삭제할까요?", isPresented: Binding(get: { deletion != nil }, set: { if !$0 { deletion = nil } })) { Button("삭제", role: .destructive) { deleteSelectedItem() }; Button("취소", role: .cancel) { deletion = nil } } message: { Text(deletion.map { "“\($0.title)”은(는) 삭제 후 복구할 수 없습니다." } ?? "") } }
    // deleteSelectedItem: 확인된 삭제 대상을 tasks 또는 routines에서 제거합니다.
    private func deleteSelectedItem() { guard let deletion else { return }; self.deletion = nil; Task { if deletion.kind == .task, let task = store.tasks.first(where: { $0.id == deletion.id }) { await store.deleteTask(task) } else if let routine = store.routines.first(where: { $0.id == deletion.id }) { await store.deleteRoutine(routine) } } }
}

// PendingDeletion: 삭제 확인 대화상자에 표시할 항목과 종류를 보관합니다.
struct PendingDeletion: Identifiable { enum Kind { case task, routine }; let id: UUID; let title: String; let kind: Kind }

struct ItemColumn: View {
    let title: String; @Binding var input: String; let placeholder: String; let items: [(UUID, String, Bool)]; let onAdd: () -> Void; let onToggle: (UUID) -> Void; let onDelete: (UUID) -> Void
    var body: some View { VStack(alignment: .leading, spacing: 10) { Text(title).font(.headline); List(items, id: \.0) { item in HStack { Button { onToggle(item.0) } label: { Label(item.1, systemImage: item.2 ? "checkmark.circle.fill" : "circle") }.buttonStyle(.plain); Spacer(); Button(role: .destructive) { onDelete(item.0) } label: { Image(systemName: "trash") }.buttonStyle(.borderless).help("삭제") } }.frame(minHeight: 250); HStack { TextField(placeholder, text: $input).onSubmit(onAdd); Button(action: onAdd) { Image(systemName: "plus") }.keyboardShortcut("n", modifiers: [.command]) } }.frame(maxWidth: .infinity) }
}

struct MenuBarView: View {
    @EnvironmentObject private var store: OrbitlyStore
    @State private var title = ""
    var body: some View { VStack(alignment: .leading, spacing: 12) { Text("빠른 할 일 추가").font(.headline); TextField("할 일", text: $title).onSubmit(add); Button("저장", action: add).disabled(title.isEmpty); Divider(); Text("미완료 \(store.tasks.filter { !$0.isCompleted }.count)개").foregroundStyle(.secondary); Button("Orbitly 열기") { NSApp.activate(ignoringOtherApps: true) }; Button("종료") { NSApplication.shared.terminate(nil) } }.padding().frame(width: 280) }
    private func add() { let value = title; title = ""; Task { await store.addTask(value) } }
}
