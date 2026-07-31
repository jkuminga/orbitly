"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// QuickAddStatus: 빠른 입력 화면에서 저장 진행 상태를 구분합니다.
type QuickAddStatus = "loading" | "ready" | "saving" | "saved" | "error" | "signin";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// QuickAddPage: Back Tap 단축어가 전달한 제목을 tasks에 저장하는 전용 화면입니다.
export default function QuickAddPage() {
  if (!supabase) return <main className="quick-page"><section className="quick-card"><p className="eyebrow">ORBITLY</p><h1>연결 준비가 필요합니다.</h1><p className="error">Supabase 연결 설정이 필요합니다.</p></section></main>;
  return <QuickAddForm client={supabase} />;
}

// QuickAddForm: 로그인 상태를 확인하고 실제 빠른 입력을 처리하는 화면입니다.
function QuickAddForm({ client }: { client: SupabaseClient }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<QuickAddStatus>("loading");
  const [message, setMessage] = useState("");
  const didSaveUrlTitle = useRef(false);
  const saveTask = useCallback(async (nextTitle: string) => {
    if (!supabase || !nextTitle.trim()) return;
    setStatus("saving");
    const { error } = await client.from("tasks").insert({ title: nextTitle.trim() });
    if (error) { setStatus("error"); setMessage("저장하지 못했습니다. 다시 시도해주세요."); return; }
    setTitle(""); setStatus("saved"); setMessage(`“${nextTitle.trim()}” 저장됨`);
  }, [client]);
  useEffect(() => {
    client.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setStatus("signin"); return; }
      const urlTitle = new URLSearchParams(window.location.search).get("title")?.trim();
      if (urlTitle && !didSaveUrlTitle.current) { didSaveUrlTitle.current = true; setTitle(urlTitle); await saveTask(urlTitle); }
      else setStatus("ready");
    });
  }, [client, saveTask]);
  async function submit(event: FormEvent) { event.preventDefault(); await saveTask(title); }
  const isWorking = status === "loading" || status === "saving";
  return <main className="quick-page"><section className="quick-card"><p className="eyebrow">ORBITLY · QUICK ADD</p><h1>{status === "saved" ? "완료했어요." : "무엇을 할까요?"}</h1>{status === "signin" ? <><p className="sub">빠른 추가를 사용하려면 Orbitly에 먼저 로그인해야 합니다.</p><Link className="primary-link" href="/">Orbitly 로그인</Link></> : <>{status === "saved" ? <><p className="saved-message">{message}</p><button className="secondary" onClick={() => { setStatus("ready"); setMessage(""); }}>하나 더 추가</button><Link className="text-link" href="/">오늘 목록 보기</Link></> : <form onSubmit={submit}><label className="sr-only" htmlFor="task-title">할 일 제목</label><input id="task-title" autoFocus placeholder="예: 우유 사기" value={title} onChange={(event) => setTitle(event.target.value)} disabled={isWorking} /><button disabled={isWorking || !title.trim()}>{status === "saving" ? "저장 중…" : "할 일 저장"}</button>{status === "error" && <p className="error">{message}</p>}</form>}</>}</section></main>;
}
