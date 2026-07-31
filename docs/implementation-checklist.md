# Routine Desk 작업 체크리스트

이 문서는 iPhone 웹앱과 macOS 네이티브 앱이 하나의 개인용 Supabase 계정을 공유하도록 만드는 진행표입니다. 체크 항목을 완료할 때마다 `[ ]`를 `[x]`로 변경합니다.

## 1. 제품 범위

- [x] 앱 이름을 `Orbitly`로 확정한다. `Orbitly`는 매일 반복되는 루틴의 궤도(orbit)를 뜻하는 개인 생산성 앱 이름이다.
- [x] `tasks`: 한 번 완료하면 끝나는 할 일의 데이터 구조를 정의한다.
- [x] `routines`: 매일 반복해 확인하는 루틴의 데이터 구조를 정의한다.
- [x] `routine_completions`: 특정 날짜의 루틴 완료 기록을 저장하는 데이터 구조를 정의한다.
- [x] iPhone의 기본 진입 방식은 홈 화면에 추가한 PWA로 확정한다.
- [x] 빠른 할 일 등록은 `Back Tap → 단축어 → 빠른 입력 웹 경로`로 확정한다. 상세 내용은 [iPhone 빠른 실행 방법 조사](iphone-quick-launch-research.md)를 확인한다.
- [ ] Mac 메뉴바의 빠른 추가와 조회 흐름을 확정한다.

## 2. Supabase 설정

- [ ] Supabase 프로젝트를 생성한다.
- [ ] [supabase/schema.sql](../supabase/schema.sql)을 SQL Editor에서 실행한다.
- [ ] Auth에서 개인용 이메일·비밀번호 계정 하나를 생성한다.
- [ ] 공개 회원가입을 비활성화하거나, 가입 화면을 배포하지 않아 단일 계정만 사용하도록 한다.
- [ ] `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 주소를 `.env.local`에 설정한다.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 클라이언트에서 RLS와 함께 사용하는 공개 Publishable key를 `.env.local`에 설정한다.
- [ ] RLS(Row Level Security): 로그인한 사용자가 자신의 `tasks`, `routines`, `routine_completions`만 읽고 쓰는지 확인한다.

## 3. iPhone 웹앱

- [x] 로그인 화면을 구현한다.
- [x] 오늘의 루틴/할 일 조회 화면을 구현한다.
- [x] 루틴과 할 일의 추가·완료 처리를 구현한다.
- [ ] iPhone 15, 16, 17 화면 폭에서 터치·가독성을 확인한다.
- [x] PWA(홈 화면에 추가 가능한 웹앱) 메타데이터를 추가한다.
- [ ] Orbitly 전용 PWA 앱 아이콘을 추가한다.
- [x] Safari에서 홈 화면 추가 후 독립 실행되는지 확인한다.
- [x] `quick-add`: 제목을 받아 `tasks`에 저장하는 빠른 입력 전용 웹 경로를 구현한다.
- [x] `quick-add` 화면에서 키보드 입력과 iPhone 받아쓰기를 모두 사용할 수 있게 한다.
- [x] `빠른 할 일 입력` 단축어를 만든다. 입력값을 `quick-add` URL로 전달해 Orbitly에 저장되는 것을 확인했다.
- [x] 설정 > 손쉬운 사용 > 터치 > 뒷면 탭에서 삼중 탭에 `빠른 할 일 입력` 단축어를 지정한다.
- [x] 앱 전환 중 Back Tap으로 입력·저장까지 가능한지 검증한다.

## 4. macOS 앱

- [x] SwiftUI 기반 앱 창과 메뉴바 진입점을 작성한다.
- [x] `⌘N`: 앱이 활성화된 상태에서 빠르게 할 일을 추가하는 단축키를 정의한다.
- [x] `⌘O`: 오늘 목록을 여는 단축키를 정의한다.
- [ ] Supabase 이메일 로그인과 access token 저장(Keychain)을 구현한다.
- [ ] `TodoStore`: `tasks` 데이터를 읽고 추가·완료 처리하는 상태 객체를 구현한다.
- [ ] `routines` 및 `routine_completions` 동기화를 구현한다.
- [ ] 전역 단축키: 다른 앱 사용 중에도 동작하는 호출 키의 필요성과 macOS 접근성 권한을 검토한다.
- [ ] Personal Team 서명으로 로컬 설치를 확인한다.

## 5. 검증 및 개인 배포

- [x] 웹앱 프로덕션 빌드를 확인한다.
- [x] Swift 소스 문법을 확인한다.
- [x] 401 인증 오류가 발생하면 오래된 로그인 세션을 정리하고 재로그인을 안내한다.
- [ ] 실제 Supabase 계정으로 웹과 Mac 간 데이터 동기화를 확인한다.
- [ ] 로그아웃 후 다른 사용자가 데이터에 접근하지 못하는지 확인한다.
- [x] Vercel 배포용 Next.js 설정으로 웹 프로젝트를 정리한다.
- [x] GitHub 저장소를 만들고 Orbitly 코드를 올린다.
- [x] Vercel에서 GitHub 저장소를 새 프로젝트로 연결한다.
- [x] Vercel 환경 변수에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 Production 환경으로 등록한다.
- [x] Vercel Production 배포를 실행한다. 현재 주소는 `https://orbitly-lac.vercel.app`이다.
- [x] Vercel 배포 주소에서 iPhone 접속과 로그인 상태를 확인한다.
- [ ] 실제 Vercel 주소를 [iPhone 단축어 설정](iphone-shortcut-setup.md)의 `YOUR_ORBITLY_DOMAIN`에 반영한다.
- [x] Safari에서 Orbitly를 홈 화면에 추가하고 PWA 독립 실행을 확인한다.
- [x] Back Tap 삼중 탭으로 `빠른 할 일 입력` 단축어의 입력·저장 흐름을 확인한다.
- [ ] 복구를 위한 Supabase 데이터 내보내기 방법을 기록한다.
