-- profiles: 인증된 한 명의 사용자 설정을 보관하는 테이블입니다.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
-- tasks: 한 번 완료하면 끝나는 할 일 테이블입니다.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  due_date date,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
-- routines: 매일 반복하는 루틴 테이블입니다.
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- routine_completions: 날짜별 루틴 완료 여부를 보관하는 테이블입니다.
create table public.routine_completions (
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  completed_on date not null default current_date,
  completed_at timestamptz not null default now(),
  primary key (routine_id, completed_on)
);
create index tasks_user_id_idx on public.tasks(user_id);
create index routines_user_id_idx on public.routines(user_id);
create index routine_completions_user_date_idx on public.routine_completions(user_id, completed_on);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.routines enable row level security;
alter table public.routine_completions enable row level security;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own tasks" on public.tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own routines" on public.routines for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own completions" on public.routine_completions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- handle_new_user: Auth 계정이 생성될 때 profile을 자동 생성하는 함수입니다.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, email) values (new.id, new.email); return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
