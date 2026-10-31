import { readFileSync } from "node:fs";
import { reminderInstructions, buildReminderInput } from "./reminder-prompt.mjs";
import { fetchTrendContext } from "./trend-context.mjs";

// readLocalKey: 로컬 환경변수에서 API 키만 읽고 출력하지 않습니다.
function readLocalKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).find((value) => value.startsWith("OPENAI_API_KEY="));
  return line?.slice("OPENAI_API_KEY=".length).replace(/^['"]|['"]$/g, "");
}

const apiKey = readLocalKey();
if (!apiKey) throw new Error("OPENAI_API_KEY가 없습니다.");
const model = process.env.OPENAI_REMINDER_MODEL || "gpt-6-luna";
const samples = Number(process.argv[2] ?? 2);
if (!Number.isInteger(samples) || samples < 1 || samples > 5) throw new Error("샘플 수는 1~5 사이여야 합니다.");

// generate: Responses API로 문구 하나를 생성합니다. Discord 발송이나 DB 변경은 하지 않습니다.
async function generate(input) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, instructions: reminderInstructions, input, max_output_tokens: 500, store: false }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`OpenAI API ${response.status}: ${payload.error?.message ?? "알 수 없는 오류"}`);
  const message = payload.output_text || payload.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text).join("");
  if (!message?.trim() || payload.status === "incomplete") throw new Error(`응답이 비었거나 잘렸습니다 (${payload.incomplete_details?.reason ?? payload.status}).`);
  return message.trim();
}

console.log(`모델: ${model} / 각 완료율당 ${samples}개`);
const trend = await fetchTrendContext();
console.log(`실제 소재: ${trend.source} (${trend.fetched_at})`);
console.log(trend.repositories.map((repo) => `${repo.name}: ${repo.description}`).join("\n"));
for (const completed of [0, 1, 2, 3, 4]) {
  const recent = [];
  console.log(`\n루틴 ${completed}/4 (${completed * 25}%)`);
  for (let index = 0; index < samples; index++) {
    let message;
    for (let attempt = 0; attempt < 2; attempt++) {
      try { message = await generate(buildReminderInput({ completed, total: 4, recent, trend })); break; }
      catch (error) { if (attempt === 1) throw error; }
    }
    recent.push(message);
    console.log(`${index + 1}. ${message}`);
  }
}
