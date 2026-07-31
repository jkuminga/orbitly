# Orbitly

Orbitly는 iPhone 웹앱과 macOS 앱에서 개인 루틴과 할 일을 함께 관리하는 프로젝트입니다.

## 주요 기능

- `tasks`: 한 번 완료하면 끝나는 할 일을 관리합니다.
- `routines`: 매일 반복해서 확인하는 루틴을 관리합니다.
- `quick-add`: iPhone Back Tap 단축어가 전달한 제목을 즉시 저장하는 웹 경로입니다.

## 시작하기

1. `.env.example`을 복사해 `.env.local`을 만들고 Supabase 값을 설정합니다.
2. `supabase/schema.sql`을 Supabase SQL Editor에서 실행합니다.
3. Supabase Auth에서 개인 이메일 계정을 생성합니다.
4. `npm install && npm run dev`로 로컬 개발 서버를 실행합니다.

## 배포

Vercel Project Settings의 Environment Variables에 다음을 등록합니다.

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 API URL입니다.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 브라우저에서 RLS 정책과 함께 사용하는 공개 키입니다.

자세한 진행 사항은 [docs/implementation-checklist.md](docs/implementation-checklist.md)를 참고하세요.
