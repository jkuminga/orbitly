# Orbitly for macOS

Orbitly는 메뉴바와 앱 창에서 iPhone 웹앱과 같은 Supabase 데이터를 사용하는 macOS 앱입니다.

## 실행과 설치

```bash
swift run --package-path macOS
macOS/scripts/build-app.sh
```

두 번째 명령은 `macOS/dist.noindex/Orbitly.app`을 만듭니다. `dist.noindex`은 Spotlight 검색에서 제외되는 개발 빌드 폴더입니다. Finder에서 Applications 폴더로 옮긴 뒤 실행하면 됩니다. ad-hoc 서명은 본인 Mac에서만 사용하는 설치 방식이며 App Store 개발자 연회비가 필요하지 않습니다.

## 이후 업데이트

처음 설치한 뒤에는 아래 한 줄만 실행하면 됩니다.

```bash
macOS/scripts/update-local.sh
```

`update-local.sh`는 GitHub 원격 저장소의 최신 코드를 `git pull --ff-only`로 받습니다. `--ff-only`는 내 로컬 변경과 자동으로 섞지 않고, 안전하게 바로 적용할 수 있을 때만 업데이트하는 옵션입니다. 이어서 앱을 빌드하고 `~/Applications/Orbitly.app`을 교체한 후 실행합니다.

기존 앱은 삭제하지 않고 `~/Library/Application Support/Orbitly/Backups.noindex`에 백업합니다. `Backups.noindex`는 Spotlight 검색에서 제외되는 백업 폴더입니다. 로컬에서 아직 GitHub에 올리지 않은 변경을 바로 빌드하려면 `macOS/scripts/update-local.sh --skip-pull`을 사용합니다. 앱 설치 없이 빌드만 확인하려면 `--build-only`를 사용합니다.

## 메뉴바 빠른 추가와 전역 단축키

메뉴바의 Orbitly 궤도 아이콘을 누르면 빠른 할 일 입력 창이 열립니다. 어느 앱을 사용 중이든 `⌃⌥⌘O`를 누르면 같은 창이 즉시 열리고 입력란에 포커스가 맞춰집니다. `⌃⌥⌘O`는 Control·Option·Command·O 조합이며, 일반 앱 단축키인 `⌘O`와 구분되는 전역 호출 키입니다.

## 첫 실행 설정

`macOS/scripts/build-app.sh`와 `update-local.sh`는 프로젝트 루트의 `.env.local`에서 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 읽어 앱에 포함합니다. 따라서 설치 후에는 Supabase 연결 화면이 나타나지 않으며, 웹앱과 같은 개인 이메일·비밀번호로 한 번만 로그인하면 됩니다.

Publishable key는 RLS 정책과 함께 사용하는 공개 키입니다. 앱에 포함되어도 데이터 접근은 로그인 세션과 RLS(Row Level Security) 정책으로 제한됩니다. `.env.local` 자체는 Git에 올리지 않습니다.

`SupabaseSession`은 access token과 refresh token을 담는 로그인 상태이며, macOS Keychain에 저장됩니다. `tasks`는 일회성 할 일, `routines`는 매일 반복하는 루틴, `routine_completions`는 날짜별 루틴 완료 기록입니다.
