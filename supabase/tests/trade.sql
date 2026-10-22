-- 로컬/시험 DB에서 rpg.sql과 trade.sql 적용 뒤 실행한다. 임시 기록은 모두 롤백한다.
begin;
do $$
declare
  a text:='QA거래가'; b text:='QA거래나'; c text:='QA거래다';
  base jsonb:='{"lv":10,"coins":1000,"rs":"2026-10-19","ts":0,"bag":{"w":[{"u":1,"t":"sword","r":0,"g":0,"p":100}],"a":[],"ae":{},"e":0,"n":2,"v":1,"p":{"heal_s":5},"m":{"fur":10},"wp":5,"gd":2,"pg":[]}}';
  d jsonb; r jsonb; tid uuid; h text; n text; sid text; before_data jsonb;
begin
  foreach n in array array[a,b,c] loop
    sid:=case n when a then 'qaa' when b then 'qab' else 'qac' end;
    insert into public.rpg_chars(name_key,name,code_hash,token_hash,data,live_sid,live_srv,live_at)
    values(public.rpg_key(n),n,'unused',encode(extensions.digest(n,'sha256'),'hex'),base||jsonb_build_object('name',n),sid,'RPG1',now());
  end loop;
  r:=public.rpg_trade_open(a,'wrong',b,'qaa'); assert r->>'err'='token','잘못된 입장권';
  r:=public.rpg_trade_open(a,a,b,'qaa'); assert (r->>'ok')::boolean; tid:=(r->>'id')::uuid;
  r:=public.rpg_trade_open(c,c,b,'qac'); assert r->>'err'='busy','동시 거래 차단';
  r:=public.rpg_trade_action(c,c,'qac',tid); assert r->'trade'='null'::jsonb,'제삼자는 거래 열람 불가';
  r:=public.rpg_trade_action(b,b,'qab',tid,'join'); assert r#>>'{trade,state}'='open';
  r:=public.rpg_trade_action(a,a,'qaa',tid,'offer','{"coins":0,"items":[{"k":"w","u":"1"},{"k":"w","u":"1"}]}');
  assert r->>'err'='trade_offer','중복 품목 차단';
  r:=public.rpg_trade_action(a,a,'qaa',tid,'offer','{"coins":100,"items":[{"k":"w","u":"1"},{"k":"p","u":"heal_s","n":2}]}');
  h:=r#>>'{trade,hash}'; assert h is not null;
  r:=public.rpg_trade_action(a,a,'qaa',tid,'accept',null,h); assert r#>>'{trade,accepted,0}'='true';
  r:=public.rpg_save(a,a,base||jsonb_build_object('name',a,'coins',900)); assert r->>'err'='busy','확인 뒤 저장 잠금';
  r:=public.rpg_trade_action(b,b,'qab',tid,'offer','{"coins":20,"items":[{"k":"m","u":"fur","n":3}]}');
  assert r#>'{trade,accepted}'='[false,false]'::jsonb,'변경하면 양쪽 확인 해제';
  r:=public.rpg_trade_action(a,a,'qaa',tid,'accept',null,h); assert r->>'err'='changed','옛 내용 확인 차단';
  r:=public.rpg_trade_action(a,a,'qaa',tid); h:=r#>>'{trade,hash}';
  perform public.rpg_trade_action(a,a,'qaa',tid,'accept',null,h);
  r:=public.rpg_trade_action(b,b,'qab',tid,'accept',null,h); assert r#>>'{trade,state}'='done',r::text;
  select data into d from public.rpg_chars where name=a;
  assert d->>'coins'='920' and d#>>'{bag,m,fur}'='13' and jsonb_array_length(d#>'{bag,w}')=0,'준 쪽 수량';
  select data into d from public.rpg_chars where name=b;
  assert d->>'coins'='1080' and d#>>'{bag,p,heal_s}'='7' and jsonb_array_length(d#>'{bag,w}')=2,'받은 쪽 수량';
  assert d#>>'{bag,w,1,u}'='2','받는 가방에서 새 장비 번호';
  perform public.rpg_trade_action(b,b,'qab',tid,'accept',null,h);
  assert (select trade_seq=1 from public.rpg_chars where name=b),'중복 실행 방지';
  r:=public.rpg_save(a,a,base||jsonb_build_object('name',a)); assert r->>'err'='stale','늦은 저장 차단';
  r:=public.rpg_save(a,a,base||jsonb_build_object('name',a,'ts',1)); assert r->>'err'='moved','넘긴 장비 되살아남 차단';
  r:=public.rpg_load(a,a); assert r#>>'{data,ts}'='1','재입장 복구';
  select data into d from public.rpg_chars where name=b;
  d:=jsonb_set(d,'{bag,w}',(select jsonb_agg(jsonb_build_object('u',i,'t','sword','r',0,'g',0,'p',100)) from generate_series(1,30) i));
  d:=jsonb_set(d,'{bag,n}','31');
  update public.rpg_chars set data=d where name=b;
  r:=public.rpg_trade_open(c,c,b,'qac'); tid:=(r->>'id')::uuid;
  perform public.rpg_trade_action(b,b,'qab',tid,'join');
  r:=public.rpg_trade_action(c,c,'qac',tid,'offer','{"coins":10,"items":[{"k":"w","u":"1"}]}'); h:=r#>>'{trade,hash}';
  select data into before_data from public.rpg_chars where name=c;
  perform public.rpg_trade_action(c,c,'qac',tid,'accept',null,h);
  r:=public.rpg_trade_action(b,b,'qab',tid,'accept',null,h);
  assert r#>>'{trade,state}'='fail' and r#>>'{trade,error}'='trade_capacity','가방 용량 초과';
  assert (select data=before_data and trade_seq=0 from public.rpg_chars where name=c),'실패하면 양쪽 모두 롤백';
  -- 일반 계정의 신청을 관리자가 수락하고 양쪽 물품·코인을 교환한다.
  update public.rpg_chars set admin=true where name=c;
  r:=public.rpg_trade_open(b,b,c,'qab'); assert (r->>'ok')::boolean,'관리자에게 거래 신청'; tid:=(r->>'id')::uuid;
  perform public.rpg_trade_action(c,c,'qac',tid,'join');
  r:=public.rpg_trade_action(b,b,'qab',tid,'offer','{"coins":5,"items":[]}');
  r:=public.rpg_trade_action(c,c,'qac',tid,'offer','{"coins":10,"items":[{"k":"p","u":"heal_s","n":1}]}');
  h:=r#>>'{trade,hash}';
  perform public.rpg_trade_action(b,b,'qab',tid,'accept',null,h);
  r:=public.rpg_trade_action(c,c,'qac',tid,'accept',null,h);
  assert r#>>'{trade,state}'='done','관리자 거래 확정';
  assert (select admin and trade_seq=1 and data->>'coins'='995' and data#>>'{bag,p,heal_s}'='4' from public.rpg_chars where name=c),'관리자 기록과 보유량';
  assert (select not admin and trade_seq=2 and data->>'coins'='1085' and data#>>'{bag,p,heal_s}'='8' from public.rpg_chars where name=b),'일반 계정은 받은 물품만 반영';
  update public.rpg_trades t set created_at=now()-interval '6 seconds' where t.a in(public.rpg_key('QA거래나'),public.rpg_key('QA거래다'));
  r:=public.rpg_trade_open(c,c,a,'qac'); assert (r->>'ok')::boolean,'관리자가 거래 신청'; tid:=(r->>'id')::uuid;
  perform public.rpg_trade_action(c,c,'qac',tid,'cancel');
  -- 장착품 차단과 접속 만료 취소는 관리자에게도 똑같이 적용한다.
  update public.rpg_chars set data=jsonb_set(data,'{bag,e}','1') where name=c;
  r:=public.rpg_trade_open(b,b,c,'qab'); tid:=(r->>'id')::uuid; assert tid is not null;
  perform public.rpg_trade_action(c,c,'qac',tid,'join');
  r:=public.rpg_trade_action(c,c,'qac',tid,'offer','{"coins":0,"items":[{"k":"w","u":"1"}]}');
  assert r->>'err'='trade_equipped','장착품 차단';
  update public.rpg_chars set live_at=now()-interval '31 seconds' where name=c;
  r:=public.rpg_trade_action(b,b,'qab',tid);
  assert r#>>'{trade,state}'='cancel','접속 만료 취소';
  assert (select trade_id is null from public.rpg_chars where name=b),'취소 뒤 잠금 해제';
  assert not has_table_privilege('anon','public.rpg_trades','select'),'거래 표 직접 접근 금지';
  assert not has_function_privilege('anon','public.rpg_trade_exchange(jsonb,jsonb,jsonb)','execute'),'내부 교환 함수 직접 실행 금지';
end $$;
rollback;
