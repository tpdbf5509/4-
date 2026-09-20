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
