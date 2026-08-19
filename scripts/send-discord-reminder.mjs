// send-discord-reminder: Supabase의 오늘 미완료 항목을 읽어 Discord Webhook으로 한 번 전송합니다.
const required = ["DISCORD_WEBHOOK_URL", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "ORBITLY_USER_ID"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing GitHub Actions secret: ${missing.join(", ")}`);

const { DISCORD_WEBHOOK_URL, SUPABASE_URL, SUPABASE_SECRET_KEY, ORBITLY_USER_ID } = process.env;

// koreaDate: 알림 기준일을 UTC가 아닌 한국 날짜(YYYY-MM-DD)로 계산합니다.
function koreaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function select(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` },
  });
  if (!response.ok) throw new Error(`Supabase query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

function list(items, prefix) {
  if (!items.length) return "없음";
  const visible = items.slice(0, 12).map((item) => `${prefix} ${item.title.length > 120 ? `${item.title.slice(0, 117)}…` : item.title}`);
  if (items.length > visible.length) visible.push(`… 외 ${items.length - visible.length}개`);
  return visible.join("\n");
}

const userID = encodeURIComponent(ORBITLY_USER_ID);
const today = koreaDate();
const [tasks, routines, completions] = await Promise.all([
  select(`tasks?select=title&user_id=eq.${userID}&is_completed=eq.false&order=created_at.desc`),
  select(`routines?select=id,title&user_id=eq.${userID}&is_active=eq.true&order=sort_order.asc`),
  select(`routine_completions?select=routine_id&user_id=eq.${userID}&completed_on=eq.${today}`),
]);

const completedRoutineIDs = new Set(completions.map((completion) => completion.routine_id));
const remainingRoutines = routines.filter((routine) => !completedRoutineIDs.has(routine.id));

if (!tasks.length && !remainingRoutines.length) {
  console.log("All Orbitly items are complete; Discord reminder skipped.");
  process.exit(0);
}

const content = [
  `🌙 **Orbitly · 오늘의 흐름** (${today})`,
  "",
  `**할 일 · ${tasks.length}개 남음**`,
  list(tasks, "•"),
  "",
  `**루틴 · ${completedRoutineIDs.size}/${routines.length} 완료**`,
  list(remainingRoutines, "•"),
].join("\n").slice(0, 1_900);

const response = await fetch(DISCORD_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
});
if (!response.ok) throw new Error(`Discord webhook failed (${response.status}): ${await response.text()}`);
console.log("Orbitly Discord reminder sent.");
