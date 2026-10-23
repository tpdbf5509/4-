-- rpg.sql → trade.sql → guild.sql. 기존 캐릭터 입장권 인증. 표 직접 접근은 허용하지 않는다.
create schema if not exists rpg_private;
revoke all on schema rpg_private from public;
grant usage on schema rpg_private to anon,authenticated;
create table if not exists public.rpg_guilds (
 id uuid primary key default gen_random_uuid(), name text not null, name_key text not null unique,
 leader text references public.rpg_chars(name_key) on update cascade on delete set null,
 level int not null default 0 check(level between 0 and 70), exp bigint not null default 0 check(exp>=0),
 disbanded boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.rpg_guild_members (
 char_key text primary key references public.rpg_chars(name_key) on update cascade on delete cascade,
 guild_id uuid not null references public.rpg_guilds(id), joined_at timestamptz not null default now()
);
create index if not exists rpg_guild_members_guild on public.rpg_guild_members(guild_id);
create table if not exists public.rpg_guild_wallets (
 char_key text primary key references public.rpg_chars(name_key) on update cascade on delete cascade,
 stones bigint not null default 0 check(stones>=0), cores int not null default 0 check(cores>=0),
 used int not null default 0 check(used between 0 and 40), attendance date
);
create table if not exists public.rpg_guild_requests (
 char_key text primary key references public.rpg_chars(name_key) on update cascade on delete cascade,
 guild_id uuid not null references public.rpg_guilds(id), kind text not null check(kind in ('invite','apply')),
 expires timestamptz not null default now()+interval '1 day'
);
create index if not exists rpg_guild_requests_guild on public.rpg_guild_requests(guild_id);
create table if not exists public.rpg_guild_raids (
 id uuid primary key default gen_random_uuid(), guild_id uuid not null references public.rpg_guilds(id),
 boss text not null check(boss in ('slime','siren','phoenix')), server text not null, participants jsonb not null,
 started_at timestamptz not null default now(), expires timestamptz not null default now()+interval '10 minutes',
 state text not null default 'fight' check(state in ('fight','clear','fail')), finished_at timestamptz
);
create unique index if not exists rpg_guild_raids_active on public.rpg_guild_raids(guild_id) where state='fight';
create index if not exists rpg_guild_raids_daily on public.rpg_guild_raids(guild_id,started_at);
create table if not exists public.rpg_guild_scores (
 week date not null, guild_id uuid not null references public.rpg_guilds(id), points int not null default 0 check(points>=0),
 primary key(week,guild_id)
);
create index if not exists rpg_guild_scores_rank on public.rpg_guild_scores(week,points desc);
create table if not exists public.rpg_guild_credits (
 week date not null, char_key text not null references public.rpg_chars(name_key) on update cascade on delete cascade,
 guild_id uuid not null references public.rpg_guilds(id), primary key(week,char_key,guild_id)
);
create table if not exists public.rpg_guild_claims (
 week date not null, char_key text not null references public.rpg_chars(name_key) on update cascade on delete cascade,
 rank int not null, primary key(week,char_key)
);
alter table public.rpg_guilds enable row level security;
alter table public.rpg_guild_members enable row level security;
alter table public.rpg_guild_wallets enable row level security;
alter table public.rpg_guild_requests enable row level security;
alter table public.rpg_guild_raids enable row level security;
alter table public.rpg_guild_scores enable row level security;
alter table public.rpg_guild_credits enable row level security;
alter table public.rpg_guild_claims enable row level security;
revoke all on public.rpg_guilds,public.rpg_guild_members,public.rpg_guild_wallets,public.rpg_guild_requests,
 public.rpg_guild_raids,public.rpg_guild_scores,public.rpg_guild_credits,public.rpg_guild_claims from public,anon,authenticated;

create or replace function public.rpg_guild_week(p_at timestamptz default now()) returns date
language sql stable set search_path='' as $$ select date_trunc('week',p_at at time zone 'Asia/Seoul')::date $$;
create or replace function public.rpg_guild_rank(p_week date) returns table(guild_id uuid,name text,points int,rank bigint)
language sql stable set search_path='' as $$
 select s.guild_id,g.name,s.points,rank() over(order by s.points desc) from public.rpg_guild_scores s
 join public.rpg_guilds g on g.id=s.guild_id where s.week=p_week and s.points>0
$$;
create or replace function public.rpg_guild_view(p_key text) returns jsonb
language plpgsql stable set search_path='' as $$
declare gid uuid; g public.rpg_guilds; w public.rpg_guild_wallets; wk date:=public.rpg_guild_week(); prev date:=wk-7; best int;
begin
 select guild_id into gid from public.rpg_guild_members where char_key=p_key;
 select * into g from public.rpg_guilds where id=gid;
 select * into w from public.rpg_guild_wallets where char_key=p_key;
 select min(r.rank)::int into best from public.rpg_guild_credits c join public.rpg_guild_rank(prev) r using(guild_id)
 where c.week=prev and c.char_key=p_key;
 return jsonb_build_object('ok',true,'charTs',(select trade_seq from public.rpg_chars where name_key=p_key),'week',wk,'reset',((wk+7)::timestamp at time zone 'Asia/Seoul'),
 'wallet',jsonb_build_object('stones',coalesce(w.stones,0),'cores',coalesce(w.cores,0),'used',coalesce(w.used,0),
 'checked',w.attendance=(now() at time zone 'Asia/Seoul')::date),
 'guild',case when gid is null then null else jsonb_build_object('id',g.id,'name',g.name,'leader',g.leader,'level',g.level,'exp',g.exp,
 'members',(select coalesce(jsonb_agg(jsonb_build_object('key',m.char_key,'name',c.name,'lv',public.rpg_lv(c.data),'server',
 case when c.live_at>now()-interval '30 seconds' then c.live_srv end) order by m.joined_at),'[]') from public.rpg_guild_members m join public.rpg_chars c on c.name_key=m.char_key where m.guild_id=gid),
 'requests',(select coalesce(jsonb_agg(jsonb_build_object('key',q.char_key,'name',c.name)),'[]') from public.rpg_guild_requests q join public.rpg_chars c on c.name_key=q.char_key where q.guild_id=gid and q.kind='apply' and q.expires>now() and g.leader=p_key),
 'used',(select count(*) from public.rpg_guild_raids r where r.guild_id=gid and r.started_at>=((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')),
 'raid',(select jsonb_build_object('id',r.id,'guild',r.guild_id,'boss',r.boss,'server',r.server,'members',r.participants,'expires',extract(epoch from r.expires)*1000)
 from public.rpg_guild_raids r where r.guild_id=gid and r.state='fight' and r.expires>now()),
 'points',coalesce((select points from public.rpg_guild_scores where week=wk and guild_id=gid),0)) end,
 'invites',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'name',x.name)),'[]') from public.rpg_guild_requests q join public.rpg_guilds x on x.id=q.guild_id where q.char_key=p_key and q.kind='invite' and q.expires>now() and not x.disbanded),
 'directory',(select coalesce(jsonb_agg(z),'[]') from(select x.id,x.name,x.level,(select count(*) from public.rpg_guild_members m where m.guild_id=x.id) as members from public.rpg_guilds x where not x.disbanded order by x.created_at desc limit 30)z),
 'ranks',(select coalesce(jsonb_agg(z order by z.rank,z.name),'[]') from(select * from public.rpg_guild_rank(wk) order by rank,name limit 30)z),
 'reward',case when best is null then null else jsonb_build_object('week',prev,'rank',best,'claimed',exists(select 1 from public.rpg_guild_claims where week=prev and char_key=p_key)) end);
end $$;
revoke execute on function public.rpg_guild_week(timestamptz),public.rpg_guild_rank(date),public.rpg_guild_view(text) from public,anon,authenticated;

create or replace function rpg_private.guild_action(p_name text,p_token text,p_sid text,p_op text default 'get',p_args jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare k text:=public.rpg_key(p_name); c public.rpg_chars; gid uuid; g public.rpg_guilds; target text; request public.rpg_guild_requests;
 wallet public.rpg_guild_wallets; raid public.rpg_guild_raids; wk date:=public.rpg_guild_week(); day date:=(now() at time zone 'Asia/Seoul')::date;
 nm text; rid uuid; n int; pts int; v_stones int; rnk int; coin bigint; v_cores int; tickets int; participants jsonb; result jsonb; changed boolean:=false;
begin
 -- 기존 숫자 코드와 별개인 입장권을 확인하고 결과에는 싣지 않는다.
 if p_op<>'get' then perform pg_advisory_xact_lock(hashtext('four-lane:guild')); end if;
 select * into c from public.rpg_chars where name_key=k and token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
 if not found then return jsonb_build_object('ok',false,'err','token'); end if;
 if c.live_sid is distinct from p_sid or c.live_at is null or c.live_at<now()-interval '30 seconds' or c.live_srv is null or c.live_srv !~ '^RPG[1-4]$' then return jsonb_build_object('ok',false,'err','live'); end if;
 if p_op='get' then return public.rpg_guild_view(k); end if;
 -- 거래와 같은 이름순 잠금으로 가입 승인·위임·토벌 보상도 교착을 줄인다.
 perform 1 from public.rpg_chars x where x.name_key=k
 or (p_op in ('invite','approve','kick','transfer') and x.name_key=public.rpg_key(p_args->>'name'))
 or (p_op='finish' and x.name_key in (select jsonb_array_elements_text(r.participants) from public.rpg_guild_raids r where r.id=(p_args->>'id')::uuid))
 order by x.name_key for update;
 select * into c from public.rpg_chars where name_key=k for update;
 if c.token_hash is distinct from encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') or c.live_sid is distinct from p_sid then return jsonb_build_object('ok',false,'err','token'); end if;
 if exists(select 1 from public.rpg_trades where id=c.trade_id and state in ('invite','open') and until>now()) then return jsonb_build_object('ok',false,'err','busy'); end if;
 update public.rpg_guild_raids set state='fail',finished_at=now() where state='fight' and expires<=now();
 select guild_id into gid from public.rpg_guild_members where char_key=k;
 select * into g from public.rpg_guilds where id=gid;
 insert into public.rpg_guild_wallets(char_key) values(k) on conflict do nothing;
 select * into wallet from public.rpg_guild_wallets where char_key=k;
 target:=public.rpg_key(p_args->>'name');
 if p_op='create' then
   nm:=regexp_replace(btrim(coalesce(p_args->>'name','')),'\s+',' ','g');
   if char_length(nm) not between 2 and 12 or nm ~ '[[:cntrl:]]' then return jsonb_build_object('ok',false,'err','name'); end if;
   if gid is not null then return jsonb_build_object('ok',false,'err','member'); end if;
   if public.rpg_lv(c.data)<50 then return jsonb_build_object('ok',false,'err','level'); end if;
   if coalesce((c.data->>'coins')::bigint,0)<50000 then return jsonb_build_object('ok',false,'err','funds'); end if;
   insert into public.rpg_guilds(name,name_key,leader) values(nm,public.rpg_key(nm),k) returning id into gid;
   insert into public.rpg_guild_members(char_key,guild_id) values(k,gid);
   update public.rpg_chars set data=data||jsonb_build_object('coins',(data->>'coins')::bigint-50000,'ts',trade_seq+1),trade_seq=trade_seq+1,updated_at=now() where name_key=k;
   changed:=true;
 elsif p_op='apply' then
   if gid is not null then return jsonb_build_object('ok',false,'err','member'); end if;
   select * into g from public.rpg_guilds where id=(p_args->>'id')::uuid and not disbanded;
   if not found then return jsonb_build_object('ok',false,'err','missing'); end if;
   if (select count(*) from public.rpg_guild_members where guild_id=g.id)>=4 then return jsonb_build_object('ok',false,'err','full'); end if;
   insert into public.rpg_guild_requests(char_key,guild_id,kind) values(k,g.id,'apply') on conflict(char_key) do update set guild_id=excluded.guild_id,kind='apply',expires=now()+interval '1 day';
 elsif p_op='invite' then
   if gid is null or g.leader is distinct from k then return jsonb_build_object('ok',false,'err','leader'); end if;
   if not exists(select 1 from public.rpg_chars where name_key=target) then return jsonb_build_object('ok',false,'err','account'); end if;
   if exists(select 1 from public.rpg_guild_members where char_key=target) then return jsonb_build_object('ok',false,'err','member'); end if;
   if (select count(*) from public.rpg_guild_members where guild_id=gid)>=4 then return jsonb_build_object('ok',false,'err','full'); end if;
   insert into public.rpg_guild_requests(char_key,guild_id,kind) values(target,gid,'invite') on conflict(char_key) do update set guild_id=excluded.guild_id,kind='invite',expires=now()+interval '1 day';
 elsif p_op in ('join','approve') then
   if p_op='join' then target:=k; elsif gid is null or g.leader is distinct from k then return jsonb_build_object('ok',false,'err','leader'); end if;
   select * into request from public.rpg_guild_requests where char_key=target and expires>now() and kind=case when p_op='join' then 'invite' else 'apply' end;
   if not found or (p_op='approve' and request.guild_id<>gid) then return jsonb_build_object('ok',false,'err','request'); end if;
   select * into g from public.rpg_guilds where id=request.guild_id and not disbanded;
   if not found then return jsonb_build_object('ok',false,'err','missing'); end if;
   if exists(select 1 from public.rpg_guild_members where char_key=target) then return jsonb_build_object('ok',false,'err','member'); end if;
   if (select count(*) from public.rpg_guild_members where guild_id=g.id)>=4 then return jsonb_build_object('ok',false,'err','full'); end if;
   insert into public.rpg_guild_members(char_key,guild_id) values(target,g.id);delete from public.rpg_guild_requests where char_key=target;
 elsif p_op in ('leave','kick','transfer','disband') then
   if gid is null then return jsonb_build_object('ok',false,'err','member'); end if;
   if exists(select 1 from public.rpg_guild_raids where guild_id=gid and state='fight') then return jsonb_build_object('ok',false,'err','raid_busy'); end if;
   if p_op='leave' then
     if g.leader=k and (select count(*) from public.rpg_guild_members where guild_id=gid)>1 then return jsonb_build_object('ok',false,'err','transfer'); end if;
     delete from public.rpg_guild_members where char_key=k;
     if g.leader=k then update public.rpg_guilds set disbanded=true where id=gid; end if;
   else
     if g.leader is not null and g.leader<>k then return jsonb_build_object('ok',false,'err','leader'); end if;
     if p_op='disband' then update public.rpg_guilds set disbanded=true where id=gid;delete from public.rpg_guild_members where guild_id=gid;
     else
       if target=k or not exists(select 1 from public.rpg_guild_members where char_key=target and guild_id=gid) then return jsonb_build_object('ok',false,'err','target'); end if;
       if p_op='kick' then delete from public.rpg_guild_members where char_key=target;
       else update public.rpg_guilds set leader=target where id=gid; end if;
     end if;
   end if;
 elsif p_op='attendance' then
   if gid is null then return jsonb_build_object('ok',false,'err','member'); end if;
   if wallet.attendance=day then return jsonb_build_object('ok',false,'err','daily'); end if;
   update public.rpg_guild_wallets set stones=stones+10,attendance=day where char_key=k;
 elsif p_op='donate' then
   if gid is null then return jsonb_build_object('ok',false,'err','member'); end if;
   if coalesce(p_args->>'n','') !~ '^[1-9][0-9]{0,5}$' then return jsonb_build_object('ok',false,'err','amount'); end if;
   n:=(p_args->>'n')::int;
   if g.level>=70 then return jsonb_build_object('ok',false,'err','max'); end if;
   n:=least(n,(70-g.level)*(20+g.level*10+(20+69*10))/2-g.exp);
   if wallet.stones<n then return jsonb_build_object('ok',false,'err','stones'); end if;
   g.exp:=g.exp+n;
   while g.level<70 and g.exp>=20+g.level*10 loop g.exp:=g.exp-(20+g.level*10);g.level:=g.level+1;end loop;
   update public.rpg_guild_wallets set stones=stones-n where char_key=k;
   update public.rpg_guilds set exp=g.exp,level=g.level where id=gid;
 elsif p_op='core' then
   if wallet.used>=40 then return jsonb_build_object('ok',false,'err','max'); end if;
   if wallet.cores<1 then return jsonb_build_object('ok',false,'err','cores'); end if;
   update public.rpg_guild_wallets set cores=cores-1,used=used+1 where char_key=k;
 elsif p_op='start' then
   if gid is null then return jsonb_build_object('ok',false,'err','member'); end if;
   if p_args->>'boss' not in ('slime','siren','phoenix') or not p_args ? 'boss' then return jsonb_build_object('ok',false,'err','boss'); end if;
   if exists(select 1 from public.rpg_guild_raids where guild_id=gid and state='fight') then return jsonb_build_object('ok',false,'err','raid_busy'); end if;
   if (select count(*) from public.rpg_guild_raids where guild_id=gid and started_at>=(day::timestamp at time zone 'Asia/Seoul'))>=3 then return jsonb_build_object('ok',false,'err','raids'); end if;
   select coalesce(jsonb_agg(m.char_key),'[]') into participants from public.rpg_guild_members m join public.rpg_chars x on x.name_key=m.char_key
     where m.guild_id=gid and x.live_srv=c.live_srv and x.live_at>now()-interval '30 seconds';
   insert into public.rpg_guild_raids(guild_id,boss,server,participants) values(gid,p_args->>'boss',c.live_srv,participants) returning id into rid;
 elsif p_op='finish' then
   select * into raid from public.rpg_guild_raids where id=(p_args->>'id')::uuid for update;
   if not found or not raid.participants ? k or raid.server<>c.live_srv then return jsonb_build_object('ok',false,'err','target'); end if;
   if raid.state<>'fight' then return public.rpg_guild_view(k)||jsonb_build_object('settled',true,'already',true); end if;
   if p_args->>'outcome' not in ('clear','fail') or not p_args ? 'outcome' then return jsonb_build_object('ok',false,'err','state'); end if;
   if p_args->>'outcome'='clear' and now()<raid.started_at+interval '3 seconds' then return jsonb_build_object('ok',false,'err','early'); end if;
   if p_args->>'outcome'='clear' and (jsonb_typeof(p_args->'contributors') is distinct from 'array' or jsonb_array_length(p_args->'contributors')=0 or not raid.participants @> (p_args->'contributors')) then return jsonb_build_object('ok',false,'err','target'); end if;
   update public.rpg_guild_raids set state=p_args->>'outcome',finished_at=now() where id=raid.id;
   if p_args->>'outcome'='clear' and raid.expires>now() then
     pts:=case raid.boss when 'slime' then 100 when 'siren' then 180 else 300 end;
     v_stones:=case raid.boss when 'slime' then 20 when 'siren' then 35 else 50 end;
     wk:=public.rpg_guild_week(); -- 처치가 확정된 주에 집계해 종료된 주의 보상이 바뀌지 않는다.
     insert into public.rpg_guild_scores(week,guild_id,points) values(wk,raid.guild_id,pts) on conflict(week,guild_id) do update set points=public.rpg_guild_scores.points+excluded.points;
     -- 실제 전투에 기여한 최초 참여자만 받는다. 중복 보고는 raid.state로 차단한다.
     for target in select value from jsonb_array_elements_text(raid.participants) loop
       if not coalesce(p_args->'contributors','[]') ? target then continue; end if;
       if not exists(select 1 from public.rpg_guild_members where char_key=target and guild_id=raid.guild_id) then continue; end if;
       insert into public.rpg_guild_wallets(char_key,stones) values(target,v_stones) on conflict(char_key) do update set stones=public.rpg_guild_wallets.stones+excluded.stones;
       insert into public.rpg_guild_credits(week,char_key,guild_id) values(wk,target,raid.guild_id) on conflict do nothing;
     end loop;
   end if;
 elsif p_op='claim' then
   wk:=public.rpg_guild_week()-7;
   select min(r.rank)::int into rnk from public.rpg_guild_credits a join public.rpg_guild_rank(wk) r using(guild_id) where a.week=wk and a.char_key=k;
   if rnk is null then return jsonb_build_object('ok',false,'err','reward'); end if;
   if exists(select 1 from public.rpg_guild_claims where week=wk and char_key=k) then return jsonb_build_object('ok',false,'err','claimed'); end if;
   v_cores:=case when rnk=1 then 5 when rnk<=3 then 3 when rnk<=10 then 2 else 1 end;
   coin:=case when rnk=1 then 150000 when rnk<=3 then 100000 when rnk<=10 then 70000 else 50000 end;
   v_stones:=case when rnk=1 then 100 when rnk<=3 then 70 when rnk<=10 then 50 else 30 end;
   tickets:=case when rnk<=3 then 3 else 1 end;
   if coalesce((c.data#>>'{bag,m,dungeon_ticket}')::int,0)+tickets>999 then return jsonb_build_object('ok',false,'err','capacity'); end if;
   insert into public.rpg_guild_claims(week,char_key,rank) values(wk,k,rnk);
   update public.rpg_guild_wallets w set cores=w.cores+v_cores,stones=w.stones+v_stones where char_key=k;
   result:=c.data||jsonb_build_object('coins',coalesce((c.data->>'coins')::bigint,0)+coin,'ts',c.trade_seq+1);
   result:=jsonb_set(result,'{bag}',coalesce(result->'bag','{}'));
   result:=jsonb_set(result,'{bag,m}',coalesce(result#>'{bag,m}','{}'));
   result:=jsonb_set(result,'{bag,m,dungeon_ticket}',to_jsonb(coalesce((result#>>'{bag,m,dungeon_ticket}')::int,0)+tickets));
   update public.rpg_chars set data=result,trade_seq=trade_seq+1,updated_at=now() where name_key=k;changed:=true;
 else return jsonb_build_object('ok',false,'err','op');
 end if;
 return public.rpg_guild_view(k)||jsonb_build_object('changed',changed,'settled',p_op='finish');
exception when unique_violation then return jsonb_build_object('ok',false,'err','taken');
 when invalid_text_representation then return jsonb_build_object('ok',false,'err','data');
end $$;
revoke execute on function rpg_private.guild_action(text,text,text,text,jsonb) from public;
grant execute on function rpg_private.guild_action(text,text,text,text,jsonb) to anon,authenticated;
-- 공개 RPC는 권한을 올리지 않는다. 입장권을 검증하는 실제 구현은 비노출 스키마에 둔다.
create or replace function public.rpg_guild_action(p_name text,p_token text,p_sid text,p_op text default 'get',p_args jsonb default '{}')
returns jsonb language sql volatile security invoker set search_path='' as $$
 select rpg_private.guild_action(p_name,p_token,p_sid,p_op,p_args)
$$;
revoke execute on function public.rpg_guild_action(text,text,text,text,jsonb) from public;
grant execute on function public.rpg_guild_action(text,text,text,text,jsonb) to anon,authenticated;
