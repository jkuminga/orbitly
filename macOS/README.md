# Orbitly for macOS

Orbitly는 메뉴바와 앱 창에서 iPhone 웹앱과 같은 Supabase 데이터를 사용하는 macOS 앱입니다.

## 실행과 설치

```bash
swift run --package-path macOS
macOS/scripts/build-app.sh
```

두 번째 명령은 `macOS/dist/Orbitly.app`을 만듭니다. Finder에서 Applications 폴더로 옮긴 뒤 실행하면 됩니다. ad-hoc 서명은 본인 Mac에서만 사용하는 설치 방식이며 App Store 개발자 연회비가 필요하지 않습니다.

## 첫 실행 설정

1. 웹앱의 `.env.local`에서 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 값을 확인합니다.
2. Orbitly의 Supabase 연결 화면에 각각 붙여넣고 저장합니다.
3. 웹앱과 같은 개인 이메일·비밀번호로 로그인합니다.

`SupabaseSession`은 access token과 refresh token을 담는 로그인 상태이며, macOS Keychain에 저장됩니다. `tasks`는 일회성 할 일, `routines`는 매일 반복하는 루틴, `routine_completions`는 날짜별 루틴 완료 기록입니다.
