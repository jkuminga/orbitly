// fetchTrendContext: GitHub의 오늘 Trending 저장소를 직접 읽어 모델에 전달할 근거를 만듭니다.
export async function fetchTrendContext() {
  const response = await fetch("https://github.com/trending?since=daily", { headers: { "User-Agent": "Orbitly-Reminder-Preview", Accept: "text/html" } });
  if (!response.ok) throw new Error(`GitHub Trending 조회 실패 (${response.status})`);
  const html = await response.text();
  const matches = [...html.matchAll(/<article\b[^>]*class="[^"]*Box-row[^"]*"[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="\/([^"?#]+)"[^>]*>[\s\S]*?<\/article>/g)];
  const names = matches.map((match) => match[1].trim()).filter((name) => /^[^/\s]+\/[^/\s]+$/.test(name)).slice(0, 8);
  const details = await Promise.all(names.map(async (name) => {
    const result = await fetch(`https://api.github.com/repos/${name}`, { headers: { "User-Agent": "Orbitly-Reminder-Preview", Accept: "application/vnd.github+json" } });
    if (!result.ok) return null;
    const repository = await result.json();
    return repository.description ? { name, description: repository.description.slice(0, 240), url: repository.html_url } : null;
  }));
  const repositories = details.filter(Boolean);
  if (!repositories.length) throw new Error("GitHub Trending 페이지 형식이 바뀌어 저장소를 읽지 못했습니다.");
  return { source: "GitHub Trending daily", url: "https://github.com/trending?since=daily", fetched_at: new Date().toISOString(), repositories };
}
