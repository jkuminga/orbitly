"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

// Task: 한 번 완료하면 끝나는 할 일 데이터입니다.
type Task = { id: string; title: string; due_date: string | null; is_completed: boolean; created_at: string };
// Routine: 매일 반복해서 확인하는 루틴 데이터입니다.
type Routine = { id: string; title: string; sort_order: number; is_active: boolean };
// RoutineCompletion: 특정 날짜에 루틴을 완료한 기록입니다.
type RoutineCompletion = { routine_id: string; completed_on: string };

// isExpiredSessionError: Supabase가 만료되었거나 유효하지 않은 JWT를 거절한 오류인지 판별합니다.
function isExpiredSessionError(error: { code?: string; message?: string } | null) {
  const detail = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return error?.code === "PGRST301" || detail.includes("jwt") || detail.includes("unauthorized");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [doneRoutines, setDoneRoutines] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [routineTitle, setRoutineTitle] = useState("");
  const [message, setMessage] = useState("");
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date()), []);

  // clearExpiredSession: 오래된 로그인 토큰을 기기에서 지우고 재로그인을 안내합니다.
  async function clearExpiredSession() {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setMessage("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
  }

  async function loadData() {
    if (!supabase) return;
    const [taskResult, routineResult, completionResult] = await Promise.all([
      supabase.from("tasks").select("*").order("is_completed").order("created_at", { ascending: false }),
      supabase.from("routines").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("routine_completions").select("routine_id, completed_on").eq("completed_on", today),
    ]);
    const errors = [taskResult.error, routineResult.error, completionResult.error].filter(Boolean);
    if (errors.some(isExpiredSessionError)) { await clearExpiredSession(); return; }
    if (errors.length) {
      console.error("Orbitly data load failed", errors);
      setMessage("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
    setTasks(taskResult.data ?? []);
    setRoutines(routineResult.data ?? []);
    setDoneRoutines(new Set((completionResult.data as RoutineCompletion[] ?? []).map((row) => row.routine_id)));
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session) loadData(); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (next) loadData(); });
    return () => listener.subscription.unsubscribe();
    // Supabase 클라이언트는 모듈 단위의 고정 인스턴스라 최초 한 번만 구독합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage("이메일 또는 비밀번호를 확인해주세요.");
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !taskTitle.trim()) return;
    const { error } = await supabase.from("tasks").insert({ title: taskTitle.trim() });
    if (isExpiredSessionError(error)) { await clearExpiredSession(); return; }
    if (error) setMessage("할 일을 추가하지 못했습니다."); else { setTaskTitle(""); loadData(); }
  }
  async function addRoutine(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !routineTitle.trim()) return;
    const { error } = await supabase.from("routines").insert({ title: routineTitle.trim(), sort_order: routines.length });
    if (isExpiredSessionError(error)) { await clearExpiredSession(); return; }
    if (error) setMessage("루틴을 추가하지 못했습니다."); else { setRoutineTitle(""); loadData(); }
  }
  async function toggleTask(task: Task) {
    if (!supabase) return;
    const { error } = await supabase.from("tasks").update({ is_completed: !task.is_completed, completed_at: !task.is_completed ? new Date().toISOString() : null }).eq("id", task.id);
    if (isExpiredSessionError(error)) { await clearExpiredSession(); return; }
    loadData();
  }
  async function toggleRoutine(routineId: string) {
    if (!supabase) return;
    const completed = doneRoutines.has(routineId);
    const { error } = completed
      ? await supabase.from("routine_completions").delete().eq("routine_id", routineId).eq("completed_on", today)
      : await supabase.from("routine_completions").insert({ routine_id: routineId, completed_on: today });
    if (isExpiredSessionError(error)) { await clearExpiredSession(); return; }
    loadData();
  }
  // deleteTask: tasks 테이블에서 더 이상 필요 없는 일회성 할 일을 삭제합니다.
  async function deleteTask(task: Task) {
    if (!supabase || !window.confirm(`“${task.title}”을(를) 삭제할까요?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (isExpiredSessionError(error)) { await clearExpiredSession(); return; }
    if (error) setMessage("할 일을 삭제하지 못했습니다."); else loadData();
  }
  // deleteRoutine: routines 테이블과 연결된 날짜별 완료 기록을 함께 삭제합니다.
  async function deleteRoutine(routine: Routine) {
    if (!supabase || !window.confirm(`“${routine.title}” 루틴을 삭제할까요?`)) return;
    const { error } = await supabase.from("routines").delete().eq("id", routine.id);
    if (isExpiredSessionError(error)) { await clearExpiredSession(); return; }
    if (error) setMessage("루틴을 삭제하지 못했습니다."); else loadData();
  }

  if (!supabase) return <SetupScreen />;
  if (!session) return <main className="auth"><section><p className="eyebrow">ORBITLY</p><h1>오늘을 가볍게<br />정리하세요.</h1><p className="sub">하나의 개인 계정으로 Mac과 iPhone의 할 일을 함께 관리합니다.</p><form onSubmit={signIn}><label>이메일<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button>시작하기</button>{message && <p className="error">{message}</p>}</form></section></main>;
  const incomplete = tasks.filter((task) => !task.is_completed);
  return <main className="app"><header><div><p className="eyebrow">{dateLabel}</p><h1>Orbitly</h1></div><button className="signout" onClick={() => supabase.auth.signOut()}>로그아웃</button></header><section className="progress"><span>{doneRoutines.size + (tasks.length - incomplete.length)} 완료</span><div><i style={{ width: `${Math.round(((doneRoutines.size + tasks.length - incomplete.length) / Math.max(routines.length + tasks.length, 1)) * 100)}%` }} /></div></section><div className="columns"><section className="card"><div className="title-row"><h2>매일 할 루틴</h2><span>{doneRoutines.size}/{routines.length}</span></div><div className="items">{routines.map((routine) => <div key={routine.id} className={`item-row ${doneRoutines.has(routine.id) ? "done" : ""}`}><button className="item" onClick={() => toggleRoutine(routine.id)}><b>✓</b>{routine.title}</button><button className="delete-item" aria-label={`${routine.title} 루틴 삭제`} onClick={() => deleteRoutine(routine)}>×</button></div>)}{!routines.length && <p className="empty">첫 루틴을 만들어보세요.</p>}</div><form className="quick-add" onSubmit={addRoutine}><input placeholder="예: 물 한 잔 마시기" value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)} /><button aria-label="루틴 추가">+</button></form></section><section className="card"><div className="title-row"><h2>해야 할 일</h2><span>{incomplete.length} 남음</span></div><div className="items">{tasks.map((task) => <div key={task.id} className={`item-row ${task.is_completed ? "done" : ""}`}><button className="item" onClick={() => toggleTask(task)}><b>✓</b>{task.title}</button><button className="delete-item" aria-label={`${task.title} 할 일 삭제`} onClick={() => deleteTask(task)}>×</button></div>)}{!tasks.length && <p className="empty">지금 해야 할 일은 없어요.</p>}</div><form className="quick-add" onSubmit={addTask}><input placeholder="할 일 추가" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /><button aria-label="할 일 추가">+</button></form></section></div>{message && <p className="toast">{message}</p>}</main>;
}

function SetupScreen() { return <main className="auth"><section><p className="eyebrow">ORBITLY</p><h1>연결 준비가<br />필요합니다.</h1><p className="sub"><code>.env.local</code>에 Supabase URL과 Publishable key를 넣은 뒤 다시 열어주세요.</p></section></main>; }
