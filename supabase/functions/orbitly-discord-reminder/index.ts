import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fallbackMotivation, fetchTrending, generateMotivation } from "./motivation.ts";

// koreaDate: Discord 알림에서 사용할 기준일을 한국 시간 YYYY-MM-DD로 계산합니다.
function koreaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

// list: Discord 메시지의 항목 목록을 최대 12개까지 읽기 좋게 만듭니다.
function list(items: Array<{ title: string }>) {
  if (!items.length) return "없음";
  const visible = items.slice(0, 12).map((item) => `• ${item.title.length > 120 ? `${item.title.slice(0, 117)}…` : item.title}`);
  if (items.length > visible.length) visible.push(`… 외 ${items.length - visible.length}개`);
  return visible.join("\n");
}

// secretKey: Edge Function에만 주입되는 Supabase Secret key를 읽습니다. Secret key는 RLS를 우회하므로 브라우저에 노출하면 안 됩니다.
function secretKey() {
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
  return keys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

Deno.serve(async () => {
  const supabaseURL = Deno.env.get("SUPABASE_URL");
  const supabaseSecretKey = secretKey();
  const discordWebhookURL = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!supabaseURL || !supabaseSecretKey || !discordWebhookURL) return Response.json({ error: "Missing server configuration." }, { status: 500 });

  const supabase = createClient(supabaseURL, supabaseSecretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profiles, error: profileError } = await supabase.from("profiles").select("id").limit(2);
  if (profileError || !profiles?.length) return Response.json({ error: "Orbitly user profile not found." }, { status: 500 });
  if (profiles.length > 1) return Response.json({ error: "Orbitly reminder requires one configured user." }, { status: 500 });

  const userID = profiles[0].id;
  const today = koreaDate();
  const [taskResult, routineResult, completionResult] = await Promise.all([
    supabase.from("tasks").select("title").eq("user_id", userID).eq("is_completed", false).order("created_at", { ascending: false }),
    supabase.from("routines").select("id,title").eq("user_id", userID).eq("is_active", true).order("sort_order"),
    supabase.from("routine_completions").select("routine_id").eq("user_id", userID).eq("completed_on", today),
  ]);
  const error = taskResult.error ?? routineResult.error ?? completionResult.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const tasks = taskResult.data ?? [];
  const routines = routineResult.data ?? [];
  const completedRoutineIDs = new Set((completionResult.data ?? []).map((completion) => completion.routine_id));
  const remainingRoutines = routines.filter((routine) => !completedRoutineIDs.has(routine.id));
  if (!tasks.length && !remainingRoutines.length) return Response.json({ sent: false, reason: "All Orbitly items are complete." });

  // motivation: 매 알림의 최신 완료율로 생성하며, 외부 서비스 실패 시 기본 문구를 사용합니다.
  const completedCount = routines.length - remainingRoutines.length;
  let motivation = fallbackMotivation(completedCount, routines.length, tasks.length);
  const openAIKey = Deno.env.get("OPENAI_API_KEY");
  if (openAIKey) {
    try {
      const repositories = await fetchTrending();
      motivation = await generateMotivation(openAIKey, completedCount, routines.length, tasks.length, repositories);
      if (routines.length > 0 && completedCount === routines.length && /좆|씨발|개새끼|못 가|못가|안 보겠|구경만|누워|쳐누워/.test(motivation)) {
        motivation = fallbackMotivation(completedCount, routines.length, tasks.length);
      }
    } catch (error) {
      console.warn("Motivation generation failed; using fallback.", error);
    }
  }

  const content = [
    motivation,
    "",
    `**할 일 · ${tasks.length}개 남음**`,
    list(tasks),
    "",
    `**루틴 · ${completedCount}/${routines.length} 완료**`,
    list(remainingRoutines),
  ].join("\n").slice(0, 1_900);
  const discordResponse = await fetch(discordWebhookURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
  if (!discordResponse.ok) return Response.json({ error: `Discord webhook failed: ${await discordResponse.text()}` }, { status: 502 });
  return Response.json({ sent: true, taskCount: tasks.length, routineCount: remainingRoutines.length });
});
