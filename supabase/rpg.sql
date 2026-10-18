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
    delete from public.rpg_fails where name_key = v_key;
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

-- 저장 — 입장권이 맞아야 한다. 다른 기기가 나중에 들어왔으면 'token' 으로 거절한다
create or replace function public.rpg_save(p_name text, p_token text, p_data jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_data is null or octet_length(p_data::text) > 30000 then return jsonb_build_object('ok', false, 'err', 'data'); end if;
  update public.rpg_chars set data = p_data, updated_at = now()
  where name_key = public.rpg_key(p_name) and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then return jsonb_build_object('ok', false, 'err', 'token'); end if;
  return jsonb_build_object('ok', true);
end $$;

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
