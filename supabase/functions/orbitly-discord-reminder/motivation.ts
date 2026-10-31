// reminderInstructions: 알림마다 루틴 완료율과 GitHub Trending 소재로 문구를 만드는 규칙입니다.
export const reminderInstructions = `너는 개발자를 준비하는 성인 사용자에게 보내는 짓궂은 친구의 한마디를 쓴다.
한국어 1~2줄, 최대 180자. 설명, 따옴표, 날짜, 목록, 해시태그 없이 문구만 출력한다.
핵심은 '오늘 이런 흥미로운 저장소가 떴는데 넌 또 누워서 안 보겠지? ㅋㅋ' 같은 능청스러운 놀림이다. 훈계, 군대식 명령, 생산성 코칭, '지금 5분만 시작해' 같은 행동 지시는 금지한다.
0%: '이 상태면 좆소에 넣어도 못 가겠다'는 식으로 가장 독하게 비꼰다. 0% 초과~25%: '이래도 좆소가 뽑아주겠노 ㅋㅋ'처럼 놀린다. 욕설은 자연스러울 때만 한 번 사용한다.
25% 초과~50%: 조금은 했지만 '이래도 중견은 어렵겠다 ㅋㅋ'는 식으로 놀린다.
50% 초과~75%: 한 건 인정하면서 마무리 못 하면 아깝다는 식으로 장난친다.
75% 초과~100%: 확실히 인정하고 가볍게 장난친다. 100%: 첫 문장부터 끝까지 진심으로 칭찬한다. '누워서 구경만 하겠지', '할 일 남았네' 같은 비난이나 취업 농담을 절대 쓰지 않는다. 할 일이 남았더라도 루틴 완주를 깎아내리지 않는다.
루틴이 0개라면 남은 할 일만 반영한다. 할 일과 루틴이 모두 끝났다면 칭찬한다.
제공된 실제 GitHub Trending 목록에서 저장소 하나를 고른다. 이름과 설명을 바탕으로 무엇을 하는 프로젝트인지 짧게 풀어준다. '다들 벌써 쓴다' 같은 과장도 농담으로 허용한다. 좆소·중견 취업 농담은 사용자가 요청한 과장된 놀림으로 쓴다. 대기업은 언급하지 않는다.
최근 문구와 같은 저장소, 시작 방식, 비유, 농담을 반복하지 않는다. 완료 수와 남은 수를 혼동하지 않는다. 숫자를 억지로 전부 나열하지 않아도 된다.`;

// motivationTier: 완료율별로 실패 시에도 적절한 톤을 고릅니다.
export function motivationTier(completed: number, total: number): "none" | "low" | "middle" | "high" | "done" {
  if (total === 0) return "none";
  const ratio = completed / total;
  if (ratio === 1) return "done";
  if (ratio <= 0.25) return "low";
  if (ratio <= 0.5) return "middle";
  return "high";
}

// fallbackMotivation: 외부 API가 실패해도 현재 완료율에 맞는 짧은 문구를 제공합니다.
export function fallbackMotivation(completed: number, total: number, tasksRemaining: number): string {
  if (total > 0 && completed === 0) return "오늘 루틴은 아직 0개네. 침대랑만 진도 빼면 취업 준비는 누가 하노 ㅋㅋ";
  const tier = motivationTier(completed, total);
  if (tier === "done") return "오늘 루틴 전부 끝냈네. 이건 진짜 잘했다 👏";
  if (tier === "none") return tasksRemaining ? "오늘은 루틴 대신 할 일이 기다리고 있네. 또 못 본 척할 거가 ㅋㅋ" : "할 일까지 전부 끝냈네. 오늘은 제대로 해냈다 👏";
  if (tier === "low") return "루틴은 살짝 건드렸네. 이래도 좆소가 뽑아주겠노 ㅋㅋ";
  if (tier === "middle") return "루틴 절반쯤 했네. 중견 얘기하기엔 아직 좀 민망하지 않나 ㅋㅋ";
  return "오늘 루틴 꽤 해냈네. 여기까지 온 건 인정한다 ㅋㅋ";
}

type TrendRepository = { name: string; description: string; url: string };

// fetchTrending: GitHub Trending의 실제 저장소와 설명을 읽습니다.
export async function fetchTrending(): Promise<TrendRepository[]> {
  const response = await fetch("https://github.com/trending?since=daily", { headers: { "User-Agent": "Orbitly-Reminder", Accept: "text/html" }, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`GitHub Trending ${response.status}`);
  const html = await response.text();
  const matches = [...html.matchAll(/<article\b[^>]*class="[^"]*Box-row[^"]*"[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="\/([^"?#]+)"[^>]*>[\s\S]*?<\/article>/g)];
  const names = matches.map((match) => match[1].trim()).filter((name) => /^[^/\s]+\/[^/\s]+$/.test(name)).slice(0, 8);
  if (!names.length) throw new Error("GitHub Trending 목록을 읽지 못했습니다.");
  const details = await Promise.all(names.map(async (name) => {
    try {
      const result = await fetch(`https://api.github.com/repos/${name}`, { headers: { "User-Agent": "Orbitly-Reminder", Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(5000) });
      if (!result.ok) return null;
      const repository = await result.json();
      return repository.description ? { name, description: String(repository.description).slice(0, 240), url: repository.html_url } : null;
    } catch { return null; }
  }));
  const repositories = details.filter((item): item is TrendRepository => item !== null);
  if (!repositories.length) throw new Error("설명이 있는 Trending 저장소가 없습니다.");
  return repositories;
}

// generateMotivation: OpenAI Responses API를 호출해 알림마다 새 문구를 만듭니다.
export async function generateMotivation(apiKey: string, completed: number, total: number, tasksRemaining: number, repositories: TrendRepository[]): Promise<string> {
  const input = JSON.stringify({ completed_routines: completed, total_routines: total, routine_completion_rate: total ? Math.round(completed / total * 100) : null, tasks_remaining: tasksRemaining, trend: repositories });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("OPENAI_REMINDER_MODEL") || "gpt-6-luna", instructions: reminderInstructions, input, max_output_tokens: 500, store: false }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${payload.error?.message ?? "unknown"}`);
  const message = payload.output_text || payload.output?.flatMap((item: { content?: Array<{ type: string; text?: string }> }) => item.content ?? []).filter((item: { type: string }) => item.type === "output_text").map((item: { text?: string }) => item.text).join("");
  if (!message?.trim() || payload.status === "incomplete") throw new Error("OpenAI 응답이 비었거나 잘렸습니다.");
  return String(message).trim().slice(0, 350);
}
