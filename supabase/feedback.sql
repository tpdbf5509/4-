-- 게임 안에서 보내는 의견을 받는 곳.
-- 누구나 적어 보낼 수는 있지만, 읽고 고치고 지우는 일은 대시보드에서만 한다.
--
-- 이 프로젝트(four-lane-defense)에는 이미 적용해 두었다.
-- 다른 Supabase 프로젝트를 쓸 때만 다시 실행하면 된다.

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  name        text check (char_length(name) <= 40),
  room        text check (char_length(room) <= 8),
  result      text check (result in ('lobby', 'play', 'clear', 'over', 'wipe')),
  wave        smallint check (wave between 0 and 500),
  total       smallint check (total between 0 and 500),
  diff        text check (char_length(diff) <= 16),
  cls         text check (char_length(cls) <= 16)
);

alter table public.feedback enable row level security;

-- 적는 것만 열어 둔다. 읽는 정책이 없으므로 게임 화면에서는 남의 글을 볼 수 없다.
create policy "anyone may write feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (true);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

-- 관리 화면(?admin) "문의" 탭 — 받은 글을 최근 순으로 읽는다(최근 300개).
-- 표 자체는 여전히 읽기가 막혀 있고, 관리자 이름 + 코드가 맞을 때만 이 함수가 돌려준다.
-- 먼저 supabase/rpg.sql 의 rpg_admin_ok 가 있어야 한다.
create or replace function public.rpg_admin_feedback(p_name text, p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ok jsonb := public.rpg_admin_ok(p_name, p_code);
begin
  if not (v_ok->>'ok')::boolean then return v_ok; end if;
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id, 'at', f.created_at, 'body', f.body, 'name', f.name, 'room', f.room,
      'result', f.result, 'wave', f.wave, 'total', f.total, 'diff', f.diff, 'cls', f.cls
    ) order by f.id desc)
    from (select * from public.feedback order by id desc limit 300) f), '[]'::jsonb));
end $$;
revoke execute on function public.rpg_admin_feedback(text, text) from public, anon, authenticated;
grant execute on function public.rpg_admin_feedback(text, text) to anon, authenticated;
