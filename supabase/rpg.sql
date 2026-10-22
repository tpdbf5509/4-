-- RPG 캐릭터를 서버에 남겨, 이름 + 숫자 5자리 코드로 어느 기기에서든 이어 하게 한다.
--
-- 표는 브라우저에서 직접 읽거나 고칠 수 없다(RLS 를 켜고 정책을 두지 않았다).
-- 게임은 아래 함수(rpg_name_free · rpg_create · rpg_login · rpg_save · rpg_delete · rpg_honor_top)로만 쓴다.
-- 코드는 bcrypt 해시로, 입장권은 sha256 해시로만 남긴다. 원문은 어디에도 남지 않는다.
--
-- 이 프로젝트(four-lane-defense)에는 이미 적용해 두었다.
-- 다른 Supabase 프로젝트를 쓸 때만 다시 실행하면 된다.

create table if not exists public.rpg_chars (
  name_key    text primary key,                                   -- 이름을 고르게 한 것(앞뒤 공백 · 겹친 공백 · 대소문자)
  name        text not null check (char_length(name) between 1 and 8),
  code_hash   text not null,
  token_hash  text,                                               -- 마지막으로 들어온 기기의 입장권
  data        jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 30000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- 관리자 캐릭터 — 게임이 최고 레벨 · 코인 무제한으로 다룬다. rpg_save 로는 바꿀 수 없고 대시보드에서만 켠다.
alter table public.rpg_chars add column if not exists admin boolean not null default false;

-- 접속 중 표시 — 한 캐릭터는 한 곳(한 서버 · 한 창)에서만. rpg_live 가 채우고 10초마다 다시 채운다
alter table public.rpg_chars add column if not exists live_sid text;          -- 접속 중인 창(탭마다 다른 접속 id)
alter table public.rpg_chars add column if not exists live_srv text;          -- 그 창이 있는 서버(RPG1~RPG4)
alter table public.rpg_chars add column if not exists live_at timestamptz;    -- 마지막으로 남긴 때 — rpg_live_secs 초가 지나면 풀린다
create or replace function public.rpg_live_secs()
returns int language sql immutable set search_path = '' as $$ select 30 $$;   -- 창을 그냥 닫으면 이만큼 뒤에 풀린다

-- 코드를 틀린 횟수 — 이름마다. 5번 틀리면 10분 막는다.
create table if not exists public.rpg_fails (
  name_key  text primary key,
  n         smallint not null default 0,
  until     timestamptz
);

alter table public.rpg_chars enable row level security;
alter table public.rpg_fails enable row level security;
revoke all on public.rpg_chars from anon, authenticated;
revoke all on public.rpg_fails from anon, authenticated;

-- 이름 → 비교용 열쇠
create or replace function public.rpg_key(p_name text)
returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'))
$$;

-- 쓸 수 있는 코드인가 — 숫자 5자리. 같은 숫자 반복(00000)과 연속 숫자(12345 · 54321)는 받지 않는다
create or replace function public.rpg_code_ok(p_code text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_code ~ '^[0-9]{5}$'
     and p_code !~ '^([0-9])\1{4}$'
     and position(p_code in '0123456789') = 0
     and position(p_code in '9876543210') = 0, false)
$$;

-- 이 이름을 새로 쓸 수 있는가
create or replace function public.rpg_name_free(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.rpg_chars where name_key = public.rpg_key(p_name))
$$;

-- 새 캐릭터 — 입장권을 돌려준다
create or replace function public.rpg_create(p_name text, p_code text, p_data jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_tok  text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  if char_length(v_name) not between 1 and 8 then return jsonb_build_object('ok', false, 'err', 'name'); end if;
  if not public.rpg_code_ok(p_code) then return jsonb_build_object('ok', false, 'err', 'code'); end if;
  if p_data is null or octet_length(p_data::text) > 30000 then return jsonb_build_object('ok', false, 'err', 'data'); end if;
  insert into public.rpg_chars (name_key, name, code_hash, token_hash, data)
  values (public.rpg_key(v_name), v_name, extensions.crypt(p_code, extensions.gen_salt('bf', 8)),
          encode(extensions.digest(v_tok, 'sha256'), 'hex'), p_data)
  on conflict (name_key) do nothing;
  if not found then return jsonb_build_object('ok', false, 'err', 'taken'); end if;
  return jsonb_build_object('ok', true, 'token', v_tok, 'name', v_name);
end $$;

-- 이어 하기 — 맞으면 새 입장권과 저장된 기록을 준다. 먼저 들어와 있던 기기의 입장권은 이때 무효가 된다
create or replace function public.rpg_login(p_name text, p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c_max  constant int := 5;                      -- 이만큼 틀리면
  c_lock constant interval := interval '10 minutes';   -- 이만큼 막는다
  v_key  text := public.rpg_key(p_name);
  v_fail public.rpg_fails;
  v_char public.rpg_chars;
  v_tok  text;
  v_n    int;
begin
  select * into v_fail from public.rpg_fails where name_key = v_key;
  if found and v_fail.until is not null and v_fail.until > now() then
    return jsonb_build_object('ok', false, 'err', 'locked', 'wait', ceil(extract(epoch from v_fail.until - now())));
  end if;
  select * into v_char from public.rpg_chars where name_key = v_key;
  if found and extensions.crypt(coalesce(p_code, ''), v_char.code_hash) = v_char.code_hash then
    update public.rpg_fails set n = 0, until = null where name_key = v_key;
    -- 다른 창 · 기기가 지금 접속 중이면 입장권을 바꾸지 않는다(바꾸면 그쪽 저장이 끊긴다) — 아래 rpg_live
    if v_char.live_at is not null and v_char.live_at > now() - make_interval(secs => public.rpg_live_secs()) then
      return jsonb_build_object('ok', false, 'err', 'live', 'srv', v_char.live_srv,
        'wait', ceil(extract(epoch from v_char.live_at + make_interval(secs => public.rpg_live_secs()) - now())));
    end if;
    v_tok := encode(extensions.gen_random_bytes(16), 'hex');
    update public.rpg_chars set token_hash = encode(extensions.digest(v_tok, 'sha256'), 'hex') where name_key = v_key;
    return jsonb_build_object('ok', true, 'token', v_tok, 'name', v_char.name, 'data', v_char.data, 'admin', v_char.admin);
  end if;
  -- 이름이 없어도 똑같이 "틀림"으로 센다
  insert into public.rpg_fails (name_key, n, until) values (v_key, 1, null)
  on conflict (name_key) do update set n = public.rpg_fails.n + 1, until = null
  returning n into v_n;
  if v_n >= c_max then
    update public.rpg_fails set n = 0, until = now() + c_lock where name_key = v_key;
    return jsonb_build_object('ok', false, 'err', 'locked', 'wait', extract(epoch from c_lock)::int);
  end if;
  return jsonb_build_object('ok', false, 'err', 'wrong', 'left', c_max - v_n);
end $$;

-- 저장 지킴에 막힌 기록 — 관리 화면 로그(rpg_admin_blocks)로 본다
create table if not exists public.rpg_save_blocks (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  name    text not null,                         -- 저장하려던 캐릭터
  why     text not null,                         -- name 기록 이름이 다름 · down 레벨이 내려감 · jump 레벨이 너무 뜀
  lv_old  int,
  lv_new  int,
  sent    text                                   -- 보내 온 기록의 이름
);
alter table public.rpg_save_blocks enable row level security;
revoke all on public.rpg_save_blocks from anon, authenticated;

create or replace function public.rpg_lv(p jsonb)
returns int language sql immutable set search_path = '' as $$
  select case when p->>'lv' ~ '^[0-9]{1,4}$' then (p->>'lv')::int else 1 end
$$;

-- 저장 — 입장권이 맞아야 한다. 다른 기기가 나중에 들어왔으면 'token' 으로 거절한다
-- 저장 지킴(관리자 제외): 렉으로 방장이 여럿 생기면 남의 영웅이 내 자리에 실려 저장될 수 있다(10월 19일 13명 사고).
--   기록 이름이 다르거나, 레벨이 내려가거나(서버 초기화 · 한 사람 되돌리기 제외), 지난 저장보다 너무 많이 뛰면 막는다.
--   막으면 rpg_save_blocks 에 남기고 이 기기의 입장권을 지운다 — 코드를 다시 넣으면 서버 기록으로 이어 한다
create or replace function public.rpg_save(p_name text, p_token text, p_data jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c_jump      constant int := 15;        -- 저장 사이에 오를 수 있는 레벨
  c_jump_min  constant numeric := 1;     -- 지난 저장 뒤 1분마다 더 오를 수 있는 레벨
  v_char public.rpg_chars;
  v_old  int;
  v_new  int;
  v_why  text;
begin
  if p_data is null or octet_length(p_data::text) > 30000 then return jsonb_build_object('ok', false, 'err', 'data'); end if;
  select * into v_char from public.rpg_chars
  where name_key = public.rpg_key(p_name) and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if not found then return jsonb_build_object('ok', false, 'err', 'token'); end if;
  if not v_char.admin then
    v_old := public.rpg_lv(v_char.data);
    v_new := public.rpg_lv(p_data);
    if p_data ? 'name' and public.rpg_key(p_data->>'name') <> v_char.name_key then
      v_why := 'name';
    elsif v_new < v_old
      and (p_data->>'rs') is not distinct from (v_char.data->>'rs')
      and not exists (select 1 from jsonb_array_elements_text(case when jsonb_typeof(p_data#>'{bag,pg}') = 'array' then p_data#>'{bag,pg}' else '[]'::jsonb end) x
                      where not (case when jsonb_typeof(v_char.data#>'{bag,pg}') = 'array' then v_char.data#>'{bag,pg}' else '[]'::jsonb end) ? x.value) then
      v_why := 'down';
    elsif v_new > v_old + c_jump + floor(extract(epoch from now() - v_char.updated_at) / 60 * c_jump_min) then
      v_why := 'jump';
    end if;
    if v_why is not null then
      insert into public.rpg_save_blocks (name, why, lv_old, lv_new, sent)
      values (v_char.name, v_why, v_old, v_new, left(coalesce(p_data->>'name', ''), 16));
      update public.rpg_chars set token_hash = null where name_key = v_char.name_key;
      return jsonb_build_object('ok', false, 'err', 'guard', 'why', v_why);
    end if;
  end if;
  update public.rpg_chars set data = p_data, updated_at = now() where name_key = v_char.name_key;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.rpg_lv(jsonb) from public, anon, authenticated;

-- 삭제 — 입장권이 맞아야 한다
create or replace function public.rpg_delete(p_name text, p_token text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  delete from public.rpg_chars
  where name_key = public.rpg_key(p_name) and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then return jsonb_build_object('ok', false, 'err', 'token'); end if;
  delete from public.rpg_fails where name_key = public.rpg_key(p_name);
  return jsonb_build_object('ok', true);
end $$;

-- 명예 순위 — 저장된 기록(data)의 honor 가 높은 순. 숫자가 아닌 값은 0 으로 본다(기록은 게임이 보낸 그대로라)
create or replace function public.rpg_honor_top(p_limit int default 20)
returns table(name text, honor int, lv int)
language sql stable security definer set search_path = '' as $$
  select c.name,
         case when c.data->>'honor' ~ '^[0-9]{1,9}$' then (c.data->>'honor')::int else 0 end as honor,
         case when c.data->>'lv' ~ '^[0-9]{1,3}$' then (c.data->>'lv')::int else 1 end as lv
  from public.rpg_chars c
  where c.data->>'honor' ~ '^[0-9]{1,9}$' and (c.data->>'honor')::int > 0
    -- 서버 초기화(itemData.js RESET) 뒤 아직 들어오지 않은 캐릭터의 옛 명예는 순위에서 뺀다. 관리자는 늘 보인다. 초기화 id 를 바꾸면 이 값도 같이 바꾼다
    and (c.admin or c.data->>'rs' = '2026-10-19')
  order by 2 desc, c.updated_at asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
revoke execute on function public.rpg_honor_top(int) from public, anon, authenticated;
grant execute on function public.rpg_honor_top(int) to anon, authenticated;

-- 게임(anon)은 다섯 함수만 부를 수 있다
revoke execute on function public.rpg_key(text), public.rpg_code_ok(text), public.rpg_name_free(text),
  public.rpg_create(text, text, jsonb), public.rpg_login(text, text), public.rpg_save(text, text, jsonb),
  public.rpg_delete(text, text) from public, anon, authenticated;
grant execute on function public.rpg_name_free(text), public.rpg_create(text, text, jsonb),
  public.rpg_login(text, text), public.rpg_save(text, text, jsonb), public.rpg_delete(text, text) to anon, authenticated;

-- RPG 전용 서버(server/, Cloudflare)만 부르는 불러오기 · 저장 — 서버 비밀 키(service_role)로만 부를 수 있다.
-- 서버가 캐릭터를 직접 불러와 판정하고 저장하므로 브라우저가 기록을 고쳐 보낼 수 없다.
create or replace function public.rpg_srv_load(p_name text, p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_char public.rpg_chars;
begin
  select * into v_char from public.rpg_chars
  where name_key = public.rpg_key(p_name) and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then return jsonb_build_object('ok', false, 'err', 'token'); end if;
  return jsonb_build_object('ok', true, 'name', v_char.name, 'data', v_char.data, 'admin', v_char.admin);
end $$;

create or replace function public.rpg_srv_save(p_name text, p_token text, p_data jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_data is null or octet_length(p_data::text) > 30000 then return jsonb_build_object('ok', false, 'err', 'data'); end if;
  update public.rpg_chars set data = p_data, updated_at = now()
  where name_key = public.rpg_key(p_name) and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then return jsonb_build_object('ok', false, 'err', 'token'); end if;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.rpg_srv_load(text, text), public.rpg_srv_save(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.rpg_srv_load(text, text), public.rpg_srv_save(text, text, jsonb) to service_role;

-- 관리자 캐릭터 만들기 — 대시보드 SQL Editor 에서 이름과 코드를 넣어 실행한다(코드는 저장소에 적지 않는다).
-- 코드 규칙(rpg_code_ok)을 거치지 않으므로 쉬운 코드도 넣을 수 있다.
-- insert into public.rpg_chars (name_key, name, code_hash, data, admin)
-- values (public.rpg_key('<이름>'), '<이름>', extensions.crypt('<코드>', extensions.gen_salt('bf', 8)),
--   '{"v":3,"name":"<이름>","lv":100,"xp":0,"coins":99999999,"quest":{"on":false,"n":0},"stats":{}}'::jsonb, true);

-- ── 관리 화면(?admin) ─────────────────────────────────────────────
-- 관리자 캐릭터의 이름 + 코드로만 열린다. 이어 하기(rpg_login)와 달리 입장권을 바꾸지 않아 게임 중인 기기가 끊기지 않는다.
-- 명령(방장 부여 · 퇴장)은 서버마다 표 한 줄에 남긴 일회용 표(nonce)로 보낸다. 방장 화면은 그 표가 맞는지 묻고 한 번만 쓴다.
create table if not exists public.rpg_admin_tickets (
  server      text primary key,                 -- RPG1~RPG5 — 서버마다 마지막 명령 하나만 둔다(표가 쌓이지 않게)
  nonce_hash  text not null,
  act         text not null,                    -- 'host' 방장 부여 · 'kick' 퇴장
  target      text not null,                    -- 대상의 접속 id
  until       timestamptz not null,
  used        boolean not null default false
);
alter table public.rpg_admin_tickets enable row level security;
revoke all on public.rpg_admin_tickets from anon, authenticated;

-- 관리자 이름 + 코드가 맞는가 — 틀린 횟수는 rpg_login 과 같은 표로 센다(5번 틀리면 10분)
create or replace function public.rpg_admin_ok(p_name text, p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  c_max  constant int := 5;
  c_lock constant interval := interval '10 minutes';
  v_key  text := public.rpg_key(p_name);
  v_fail public.rpg_fails;
  v_char public.rpg_chars;
  v_n    int;
begin
  select * into v_fail from public.rpg_fails where name_key = v_key;
  if found and v_fail.until is not null and v_fail.until > now() then
    return jsonb_build_object('ok', false, 'err', 'locked', 'wait', ceil(extract(epoch from v_fail.until - now())));
  end if;
  select * into v_char from public.rpg_chars where name_key = v_key;
  if found and v_char.admin and extensions.crypt(coalesce(p_code, ''), v_char.code_hash) = v_char.code_hash then
    update public.rpg_fails set n = 0, until = null where name_key = v_key;
    return jsonb_build_object('ok', true, 'name', v_char.name);
  end if;
  insert into public.rpg_fails (name_key, n, until) values (v_key, 1, null)
  on conflict (name_key) do update set n = public.rpg_fails.n + 1, until = null
  returning n into v_n;
  if v_n >= c_max then
    update public.rpg_fails set n = 0, until = now() + c_lock where name_key = v_key;
    return jsonb_build_object('ok', false, 'err', 'locked', 'wait', extract(epoch from c_lock)::int);
  end if;
  return jsonb_build_object('ok', false, 'err', 'wrong', 'left', c_max - v_n);
end $$;

-- 명령 표 만들기 — 60초 안에 한 번만 쓸 수 있다
create or replace function public.rpg_admin_ticket(p_name text, p_code text, p_server text, p_act text, p_target text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ok    jsonb := public.rpg_admin_ok(p_name, p_code);
  v_nonce text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  if not (v_ok->>'ok')::boolean then return v_ok; end if;
  if p_server !~ '^RPG[1-5]$' or p_act not in ('host', 'kick') or coalesce(p_target, '') !~ '^[a-z0-9]{1,16}$' then
    return jsonb_build_object('ok', false, 'err', 'bad');
  end if;
  insert into public.rpg_admin_tickets (server, nonce_hash, act, target, until, used)
  values (p_server, encode(extensions.digest(v_nonce, 'sha256'), 'hex'), p_act, p_target, now() + interval '60 seconds', false)
  on conflict (server) do update set nonce_hash = excluded.nonce_hash, act = excluded.act, target = excluded.target,
    until = excluded.until, used = false;
  return jsonb_build_object('ok', true, 'nonce', v_nonce);
end $$;

-- 명령 표 쓰기 — 방장 화면이 부른다. 맞으면 true, 그 뒤로는 다시 쓸 수 없다
create or replace function public.rpg_admin_redeem(p_nonce text, p_server text, p_act text, p_target text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.rpg_admin_tickets set used = true
  where server = p_server and nonce_hash = encode(extensions.digest(coalesce(p_nonce, ''), 'sha256'), 'hex')
    and act = p_act and target = p_target and not used and until > now();
  return found;
end $$;

revoke execute on function public.rpg_admin_ok(text, text) from public, anon, authenticated;
revoke execute on function public.rpg_admin_ticket(text, text, text, text, text), public.rpg_admin_redeem(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.rpg_admin_ok(text, text), public.rpg_admin_ticket(text, text, text, text, text),
  public.rpg_admin_redeem(text, text, text, text) to anon, authenticated;

-- 관리 화면 — 저장 지킴에 막힌 기록(최근 100개)
create or replace function public.rpg_admin_blocks(p_name text, p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ok jsonb := public.rpg_admin_ok(p_name, p_code);
begin
  if not (v_ok->>'ok')::boolean then return v_ok; end if;
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(jsonb_build_object('at', b.at, 'name', b.name, 'why', b.why, 'old', b.lv_old, 'new', b.lv_new, 'sent', b.sent) order by b.id desc)
    from (select * from public.rpg_save_blocks order by id desc limit 100) b), '[]'::jsonb));
end $$;
revoke execute on function public.rpg_admin_blocks(text, text) from public, anon, authenticated;
grant execute on function public.rpg_admin_blocks(text, text) to anon, authenticated;

-- 접속 중 표시 남기기 — 서버에 들어갈 때와 10초마다(src/net/rpgSave.js liveEnter). 다른 창이 남긴 표시가 살아 있으면 'live'
create or replace function public.rpg_live(p_name text, p_token text, p_sid text, p_srv text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_char public.rpg_chars;
begin
  if coalesce(p_sid, '') !~ '^[a-z0-9]{1,16}$' or coalesce(p_srv, '') !~ '^[A-Z0-9]{1,8}$' then
    return jsonb_build_object('ok', false, 'err', 'bad');
  end if;
  select * into v_char from public.rpg_chars
  where name_key = public.rpg_key(p_name) and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  for update;
  if not found then return jsonb_build_object('ok', false, 'err', 'token'); end if;
  if v_char.live_sid is distinct from p_sid and v_char.live_at is not null
     and v_char.live_at > now() - make_interval(secs => public.rpg_live_secs()) then
    return jsonb_build_object('ok', false, 'err', 'live', 'srv', v_char.live_srv,
      'wait', ceil(extract(epoch from v_char.live_at + make_interval(secs => public.rpg_live_secs()) - now())));
  end if;
  update public.rpg_chars set live_sid = p_sid, live_srv = p_srv, live_at = now() where name_key = v_char.name_key;
  return jsonb_build_object('ok', true);
end $$;

-- 접속 중 표시 풀기 — 나가기 · 창 닫기 때. 그 창이 남긴 표시일 때만
create or replace function public.rpg_unlive(p_name text, p_token text, p_sid text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.rpg_chars set live_at = null
  where name_key = public.rpg_key(p_name) and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and live_sid = p_sid;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.rpg_live_secs() from public, anon, authenticated;
revoke execute on function public.rpg_live(text, text, text, text), public.rpg_unlive(text, text, text) from public, anon, authenticated;
grant execute on function public.rpg_live(text, text, text, text), public.rpg_unlive(text, text, text) to anon, authenticated;

-- 관리 화면 "계정" 탭 — 모든 캐릭터(최근 저장 순). 코드 · 입장권은 싣지 않는다
create or replace function public.rpg_admin_accounts(p_name text, p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ok jsonb := public.rpg_admin_ok(p_name, p_code);
begin
  if not (v_ok->>'ok')::boolean then return v_ok; end if;
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', c.name, 'admin', c.admin,
      'lv', public.rpg_lv(c.data),
      'job', c.data->>'job',
      'coins', case when c.data->>'coins' ~ '^[0-9]{1,12}$' then (c.data->>'coins')::bigint else 0 end,
      'honor', case when c.data->>'honor' ~ '^[0-9]{1,9}$' then (c.data->>'honor')::int else 0 end,
      'made', c.created_at, 'saved', c.updated_at,
      'live', case when c.live_at > now() - make_interval(secs => public.rpg_live_secs()) then c.live_srv end
    ) order by c.updated_at desc)
    from (select * from public.rpg_chars limit 2000) c), '[]'::jsonb));
end $$;
revoke execute on function public.rpg_admin_accounts(text, text) from public, anon, authenticated;
grant execute on function public.rpg_admin_accounts(text, text) to anon, authenticated;

-- 관리자 계정 이름 변경. 계정 기록·코드·관리자 권한을 보존한다.
create or replace function public.rpg_admin_rename(p_name text, p_code text, p_target text, p_new_name text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ok jsonb := public.rpg_admin_ok(p_name, p_code);
  v_name text := regexp_replace(btrim(coalesce(p_new_name, '')), '\s+', ' ', 'g');
  v_key text := public.rpg_key(v_name);
  v_char public.rpg_chars;
begin
  if not coalesce((v_ok->>'ok')::boolean, false) then return v_ok; end if;
  if char_length(v_name) not between 1 and 8 or v_name ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'err', 'name');
  end if;
  select * into v_char from public.rpg_chars where name_key = public.rpg_key(p_target) for update;
  if not found then return jsonb_build_object('ok', false, 'err', 'missing'); end if;
  if v_char.name = v_name then return jsonb_build_object('ok', false, 'err', 'same'); end if;
  if v_char.live_at > now() - make_interval(secs => public.rpg_live_secs()) then
    return jsonb_build_object('ok', false, 'err', 'live');
  end if;
  if v_key <> v_char.name_key and exists (select 1 from public.rpg_chars where name_key = v_key) then
    return jsonb_build_object('ok', false, 'err', 'taken');
  end if;
  update public.rpg_chars set name_key = v_key, name = v_name,
    data = jsonb_set(data, '{name}', to_jsonb(v_name)),
    token_hash = null, live_sid = null, live_srv = null, live_at = null
  where name_key = v_char.name_key;
  -- 이전 이름과 새 이름의 로그인 실패 횟수를 초기화한다.
  delete from public.rpg_fails where name_key in (v_char.name_key, v_key);
  return jsonb_build_object('ok', true, 'name', v_name);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'err', 'taken');
end $$;
revoke execute on function public.rpg_admin_rename(text, text, text, text) from public, anon, authenticated;
grant execute on function public.rpg_admin_rename(text, text, text, text) to anon, authenticated;
