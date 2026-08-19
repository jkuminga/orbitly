# Orbitly Discord 알림

GitHub Actions가 KST 기준 오전 9:17부터 다음 날 오전 1:47까지 90분 간격으로 실행됩니다. 미완료 `tasks` 또는 오늘 완료하지 않은 `routines`가 있을 때만 Discord 메시지를 보냅니다.

`tasks`는 한 번 완료하면 끝나는 할 일이고, `routines`는 매일 반복하는 루틴입니다.

## 필요한 GitHub Secrets

저장소의 Settings > Secrets and variables > Actions에 아래 값을 등록합니다. Secret은 GitHub가 실행 중에만 안전하게 주입하는 비공개 환경 변수입니다.

- `DISCORD_WEBHOOK_URL`: Orbitly Discord 채널의 Webhook URL
- `SUPABASE_URL`: `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL` 값
- `SUPABASE_SECRET_KEY`: Supabase의 `sb_secret_...` 서버 전용 키
- `ORBITLY_USER_ID`: Supabase Authentication > Users에서 확인하는 본인 계정 UUID

`SUPABASE_SECRET_KEY`는 RLS를 우회할 수 있는 서버 전용 키입니다. GitHub Secret 이외의 코드, Vercel 환경 변수, Mac 앱 또는 브라우저에 넣지 않습니다.

## 즉시 테스트

GitHub 저장소의 Actions > **Orbitly Discord reminders** > Run workflow를 누르면 바로 한 번 테스트할 수 있습니다. 미완료 항목이 없다면 성공으로 끝나지만 메시지는 보내지 않습니다.
