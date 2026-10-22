-- 개인 거래. rpg.sql 적용 후 실행한다. 새 표는 직접 접근하지 않고 입장권/관리자 RPC로만 읽는다.
alter table public.rpg_chars add column if not exists trade_seq bigint not null default 0;
alter table public.rpg_chars add column if not exists trade_id uuid;
create table if not exists public.rpg_trades (
  id uuid primary key default gen_random_uuid(),
  a text not null, b text not null check (a <> b), server text not null,
  state text not null default 'invite' check (state in ('invite','open','done','cancel','fail')),
  offers jsonb not null default '[{"coins":0,"items":[]},{"coins":0,"items":[]}]',
  accepted jsonb not null default '[false,false]',
  revision int not null default 0, hash text not null default '',
  error text, created_at timestamptz not null default now(),
  until timestamptz not null default now() + interval '3 minutes', finished_at timestamptz
);
create index if not exists rpg_trades_a_at on public.rpg_trades(a,created_at desc);
create index if not exists rpg_trades_b_at on public.rpg_trades(b,created_at desc);
create table if not exists public.rpg_trade_moves (
  id bigserial primary key, trade_id uuid not null references public.rpg_trades(id),
  owner text not null, receiver text not null, kind text not null, u bigint not null,
  item jsonb not null, reset_id text, rollback_ids jsonb, at timestamptz not null default now(),
  unique(trade_id,owner,kind,u)
);
create index if not exists rpg_trade_moves_owner on public.rpg_trade_moves(owner,u);
alter table public.rpg_trades enable row level security;
alter table public.rpg_trade_moves enable row level security;
revoke all on public.rpg_trades,public.rpg_trade_moves from public,anon,authenticated;
revoke all on sequence public.rpg_trade_moves_id_seq from public,anon,authenticated;

-- 기존 저장도 같은 행 잠금을 거친다. 거래 뒤에는 이전 차례의 저장을 절대 받지 않는다.
create or replace function public.rpg_trade_save_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare t public.rpg_trades; i int;
begin
  if new.data is not distinct from old.data then return new; end if;
  if coalesce(new.data->>'ts','0') <> new.trade_seq::text then
    raise exception using message='trade_stale',errcode='P0001';
  end if;
  -- 거래 RPC가 차례를 올리며 확정하는 쓰기만 잠금을 통과한다.
  if new.trade_seq = old.trade_seq and old.trade_id is not null then
    select * into t from public.rpg_trades where id=old.trade_id;
    i := case when t.a=old.name_key then 0 else 1 end;
    if t.state='open' and t.until>now() and (t.accepted->>i)::boolean then
      raise exception using message='trade_busy',errcode='P0001';
    end if;
  end if;
  if new.trade_seq = old.trade_seq and exists (
    select 1 from public.rpg_trade_moves m
    where m.owner=old.name_key and m.reset_id is not distinct from new.data->>'rs'
      and m.rollback_ids=coalesce(new.data#>'{bag,pg}','[]'::jsonb)
      and exists (select 1 from jsonb_array_elements(coalesce(new.data#>array['bag',m.kind],'[]'::jsonb)) x
                  where x->>'u'=m.u::text and x=m.item)
  ) then
    raise exception using message='trade_moved',errcode='P0001';
  end if;
  return new;
end $$;
create or replace trigger rpg_trade_save_fence before update of data on public.rpg_chars
for each row execute function public.rpg_trade_save_guard();
revoke execute on function public.rpg_trade_save_guard() from public,anon,authenticated;

-- 기존 캐릭터 입장권으로 인증한다. 결과에 입장권을 싣지 않는다.
create or replace function public.rpg_load(p_name text,p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.rpg_chars;
begin
  select * into c from public.rpg_chars where name_key=public.rpg_key(p_name)
    and token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
  if not found then return jsonb_build_object('ok',false,'err','token'); end if;
  return jsonb_build_object('ok',true,'name',c.name,'admin',c.admin,'ts',c.trade_seq,
    'data',c.data || jsonb_build_object('ts',c.trade_seq));
end $$;

-- 선택 항목은 저장된 실제 물품으로 바꾼다. 장착품 · 중복 · 음수 · 없는 수량은 거절한다.
create or replace function public.rpg_trade_offer(p_data jsonb,p_offer jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare
  b jsonb:=p_data->'bag'; out_items jsonb:='[]'; x jsonb; item jsonb; k text; u text; n bigint;
  seen text[]:='{}'; tag text; coins bigint;
begin
  if jsonb_typeof(p_offer)<>'object' or coalesce(p_offer->>'coins','') !~ '^[0-9]{1,12}$'
    or jsonb_typeof(p_offer->'items') is distinct from 'array' or jsonb_array_length(p_offer->'items')>12 then
    raise exception 'trade_offer';
  end if;
  coins:=(p_offer->>'coins')::bigint;
  if coins>coalesce((p_data->>'coins')::bigint,0) then raise exception 'trade_funds'; end if;
  for x in select value from jsonb_array_elements(p_offer->'items') loop
    k:=x->>'k'; u:=x->>'u';
    if k not in ('w','a','p','m','wp','gd') or k is null then raise exception 'trade_offer'; end if;
    tag:=k||':'||coalesce(u,'');
    if tag=any(seen) then raise exception 'trade_offer'; end if;
    seen:=array_append(seen,tag);
    if k in ('w','a') then
      if coalesce(u,'') !~ '^[1-9][0-9]{0,11}$' then raise exception 'trade_offer'; end if;
      select value into item from jsonb_array_elements(coalesce(b->k,'[]')) where value->>'u'=u;
      if item is null then raise exception 'trade_item'; end if;
      if (k='w' and b->>'e'=u) or (k='a' and exists(select 1 from jsonb_each_text(coalesce(b->'ae','{}')) e where e.value=u)) then
        raise exception 'trade_equipped';
      end if;
      out_items:=out_items||jsonb_build_array(jsonb_build_object('k',k,'u',u,'item',item));
    else
      if coalesce(x->>'n','') !~ '^[1-9][0-9]{0,3}$' then raise exception 'trade_offer'; end if;
      n:=(x->>'n')::bigint;
      if (k in ('p','m') and (coalesce(u,'')='' or length(u)>40)) or
        n>coalesce((case when k in ('wp','gd') then b->>k else b#>>array[k,u] end)::bigint,0) then raise exception 'trade_item'; end if;
      out_items:=out_items||jsonb_build_array(jsonb_build_object('k',k,'u',coalesce(u,''),'n',n));
    end if;
  end loop;
  return jsonb_build_object('coins',coins,'items',out_items);
end $$;

-- 받는 가방에서 새 번호를 매긴다. 용량을 넘으면 교환 전체를 되돌린다.
create or replace function public.rpg_trade_exchange(p_data jsonb,p_out jsonb,p_in jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare
  d jsonb:=p_data; b jsonb:=p_data->'bag'; x jsonb; k text; u text; path text[];
  n bigint; seq bigint; lim int; coins bigint; arr jsonb;
begin
  coins:=coalesce((d->>'coins')::bigint,0)-(p_out->>'coins')::bigint+(p_in->>'coins')::bigint;
  if coins<0 or coins>999999999999 then raise exception 'trade_funds'; end if;
  for x in select value from jsonb_array_elements(p_out->'items') loop
    k:=x->>'k'; u:=x->>'u';
    if k in ('w','a') then
      select coalesce(jsonb_agg(v),'[]') into arr from jsonb_array_elements(b->k) v where v->>'u'<>u;
      b:=jsonb_set(b,array[k],arr);
    else
      path:=case when k in ('wp','gd') then array[k] else array[k,u] end;
      b:=jsonb_set(b,path,to_jsonb((b#>>path)::bigint-(x->>'n')::bigint));
    end if;
  end loop;
  seq:=greatest(coalesce((b->>'n')::bigint,1),
    coalesce((select max((v->>'u')::bigint)+1 from jsonb_array_elements(coalesce(b->'w','[]')||coalesce(b->'a','[]')) v),1));
  for x in select value from jsonb_array_elements(p_in->'items') loop
    k:=x->>'k'; u:=x->>'u';
    if k in ('w','a') then
      arr:=coalesce(b->k,'[]')||jsonb_build_array((x->'item')||jsonb_build_object('u',seq));
      if jsonb_array_length(arr)>30 then raise exception 'trade_capacity'; end if;
      b:=jsonb_set(b,array[k],arr); seq:=seq+1;
    else
      path:=case when k in ('wp','gd') then array[k] else array[k,u] end;
      lim:=case when k in ('p','gd') then 99 else 999 end;
      n:=coalesce((b#>>path)::bigint,0)+(x->>'n')::bigint;
      if n>lim then raise exception 'trade_capacity'; end if;
      if k in ('p','m') and not b ? k then b:=b||jsonb_build_object(k,'{}'::jsonb); end if;
      b:=jsonb_set(b,path,to_jsonb(n));
    end if;
  end loop;
  b:=b||jsonb_build_object('n',seq,'v',coalesce((b->>'v')::int,0)+1);
  return d||jsonb_build_object('bag',b,'coins',coins);
end $$;
revoke execute on function public.rpg_trade_offer(jsonb,jsonb),public.rpg_trade_exchange(jsonb,jsonb,jsonb) from public,anon,authenticated;

create or replace function public.rpg_trade_open(p_name text,p_token text,p_target text,p_sid text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.rpg_chars; o public.rpg_chars; tid uuid; k text:=public.rpg_key(p_name); target text:=public.rpg_key(p_target);
begin
  -- 두 캐릭터를 이름순으로 잠가 동시 신청도 한 건만 받는다.
  perform 1 from public.rpg_chars where name_key in (k,target) order by name_key for update;
  select * into c from public.rpg_chars where name_key=k and token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
  if not found then return jsonb_build_object('ok',false,'err','token'); end if;
  select * into o from public.rpg_chars where name_key=target;
  if not found or k=target or c.admin or o.admin then return jsonb_build_object('ok',false,'err','account'); end if;
  if c.live_sid is distinct from p_sid or c.live_srv is distinct from o.live_srv or c.live_srv !~ '^RPG[1-4]$'
    or c.live_at is null or o.live_at is null or least(c.live_at,o.live_at)<now()-interval '30 seconds' then
    return jsonb_build_object('ok',false,'err','live'); end if;
  if exists(select 1 from public.rpg_trades where id in (c.trade_id,o.trade_id) and state in ('invite','open') and until>now()) then
    return jsonb_build_object('ok',false,'err','busy'); end if;
  if exists(select 1 from public.rpg_trades where a=k and created_at>now()-interval '5 seconds') then
    return jsonb_build_object('ok',false,'err','rate'); end if;
  insert into public.rpg_trades(a,b,server) values(k,target,c.live_srv) returning id into tid;
  update public.rpg_chars set trade_id=tid where name_key in (k,target);
  return jsonb_build_object('ok',true,'id',tid);
end $$;

-- 거래 읽기/수락/등록/확인/취소. 거래 행 -> 이름순 캐릭터 행 순서로 잠가 확정과 저장을 직렬화한다.
create or replace function public.rpg_trade_action(p_name text,p_token text,p_sid text,p_id uuid default null,
  p_op text default 'get',p_offer jsonb default null,p_hash text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  c public.rpg_chars; arow public.rpg_chars; brow public.rpg_chars; t public.rpg_trades;
  k text:=public.rpg_key(p_name); tid uuid; i int; offer jsonb; da jsonb; db jsonb; x jsonb; problem text;
begin
  select * into c from public.rpg_chars where name_key=k and token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
  if not found then return jsonb_build_object('ok',false,'err','token'); end if;
  tid:=coalesce(p_id,c.trade_id);
  select * into t from public.rpg_trades where id=tid and k in (a,b) for update;
  if not found then return jsonb_build_object('ok',true,'trade',null); end if;
  perform 1 from public.rpg_chars where name_key in (t.a,t.b) order by name_key for update;
  select * into arow from public.rpg_chars where name_key=t.a;
  select * into brow from public.rpg_chars where name_key=t.b;
  select * into c from public.rpg_chars where name_key=k;
  -- 행을 잠근 뒤 입장권을 다시 검사한다.
  if c.token_hash is distinct from encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') or c.live_sid is distinct from p_sid then
    return jsonb_build_object('ok',false,'err','token'); end if;
  i:=case when k=t.a then 0 else 1 end;
  if t.state in ('invite','open') then
    if t.until<=now() or arow.trade_id is distinct from t.id or brow.trade_id is distinct from t.id
      or arow.live_at is null or brow.live_at is null or least(arow.live_at,brow.live_at)<now()-interval '30 seconds'
      or arow.live_srv is distinct from t.server or brow.live_srv is distinct from t.server then
      t.state:='cancel'; t.error:='expired';
    elsif p_op='cancel' then t.state:='cancel';
    elsif p_op='join' and i=1 and t.state='invite' then t.state:='open';
    elsif p_op='offer' and t.state='open' then
      begin
        offer:=public.rpg_trade_offer(c.data,p_offer);
      exception when others then return jsonb_build_object('ok',false,'err',sqlerrm); end;
      t.offers:=jsonb_set(t.offers,array[i::text],offer);
      t.accepted:='[false,false]'; t.revision:=t.revision+1;
    elsif p_op='accept' and t.state='open' then
      if p_hash is distinct from t.hash or t.hash='' then return jsonb_build_object('ok',false,'err','changed'); end if;
      t.accepted:=jsonb_set(t.accepted,array[i::text],'true');
      if t.accepted='[true,true]'::jsonb then
        begin
          if arow.admin or brow.admin then raise exception 'trade_account'; end if;
          if public.rpg_trade_offer(arow.data,t.offers->0) is distinct from t.offers->0
            or public.rpg_trade_offer(brow.data,t.offers->1) is distinct from t.offers->1 then raise exception 'trade_changed'; end if;
          if t.offers='[{"coins":0,"items":[]},{"coins":0,"items":[]}]'::jsonb then raise exception 'trade_empty'; end if;
          da:=public.rpg_trade_exchange(arow.data,t.offers->0,t.offers->1)||jsonb_build_object('ts',arow.trade_seq+1);
          db:=public.rpg_trade_exchange(brow.data,t.offers->1,t.offers->0)||jsonb_build_object('ts',brow.trade_seq+1);
          update public.rpg_chars set data=da,trade_seq=trade_seq+1,trade_id=null,updated_at=now() where name_key=t.a;
          update public.rpg_chars set data=db,trade_seq=trade_seq+1,trade_id=null,updated_at=now() where name_key=t.b;
          for x in select value||jsonb_build_object('side',0) from jsonb_array_elements(t.offers#>'{0,items}')
                    union all select value||jsonb_build_object('side',1) from jsonb_array_elements(t.offers#>'{1,items}') loop
            if x->>'k' in ('w','a') then
              insert into public.rpg_trade_moves(trade_id,owner,receiver,kind,u,item,reset_id,rollback_ids)
              values(t.id,case when x->>'side'='0' then t.a else t.b end,case when x->>'side'='0' then t.b else t.a end,
                x->>'k',(x->>'u')::bigint,x->'item',case when x->>'side'='0' then arow.data->>'rs' else brow.data->>'rs' end,
                coalesce(case when x->>'side'='0' then arow.data#>'{bag,pg}' else brow.data#>'{bag,pg}' end,'[]'));
            end if;
          end loop;
          t.state:='done';
        exception when others then
          -- 한쪽 UPDATE/이동 기록까지 포함해 이 블록을 모두 되돌린다.
          problem:=sqlerrm; t.state:='fail'; t.error:=problem;
        end;
      end if;
    elsif p_op not in ('get','join') then return jsonb_build_object('ok',false,'err','state');
    end if;
    t.hash:=encode(extensions.digest((jsonb_build_object('id',t.id,'rev',t.revision,'offers',t.offers))::text,'sha256'),'hex');
    if t.state in ('cancel','fail') then
      update public.rpg_chars set trade_id=null where name_key in(t.a,t.b) and trade_id=t.id;
    end if;
    update public.rpg_trades set state=t.state,offers=t.offers,accepted=t.accepted,revision=t.revision,hash=t.hash,error=t.error,
      finished_at=case when t.state in ('done','cancel','fail') then now() else null end where id=t.id;
  end if;
  return jsonb_build_object('ok',true,'trade',jsonb_build_object('id',t.id,'a',arow.name,'b',brow.name,'side',i,
    'state',t.state,'offers',t.offers,'accepted',t.accepted,'hash',t.hash,'revision',t.revision,'error',t.error,'until',t.until));
end $$;

create or replace function public.rpg_admin_trades(p_name text,p_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare auth jsonb:=public.rpg_admin_ok(p_name,p_code);
begin
  if not coalesce((auth->>'ok')::boolean,false) then return auth; end if;
  return jsonb_build_object('ok',true,'list',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc)
    from (select * from public.rpg_trades order by created_at desc limit 100) t),'[]'));
end $$;
revoke execute on function public.rpg_load(text,text),public.rpg_trade_open(text,text,text,text),
  public.rpg_trade_action(text,text,text,uuid,text,jsonb,text),public.rpg_admin_trades(text,text) from public,anon,authenticated;
grant execute on function public.rpg_load(text,text),public.rpg_trade_open(text,text,text,text),
  public.rpg_trade_action(text,text,text,uuid,text,jsonb,text),public.rpg_admin_trades(text,text) to anon,authenticated;
