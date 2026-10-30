import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgLooks,rpgSyncSeats,rpgJoin,rpgStep,rpgStepVisual,rpgPack,rpgApply,rpgPromote,rpgHold,rpgMove,rpgDash,
  freshInput,noteSent,aimDir,npcNear,dist,MAPS,RPG,MOVE,SYNC} from '../src/game/rpg.js';
import {rpgInput} from '../src/game/rpgInput.js';
import {rpgShop} from '../src/game/shop.js';
import {RESET,GIFT} from '../src/game/itemData.js';
import {canvasToWorld,pickNpc,portalHit,npcStopPoint,talkReach,MV_UI} from '../src/game/mouseMove.js';
import {worldBossPortalNear} from '../src/game/worldBoss.js';
import {WORLD_BOSS} from '../src/game/worldBossData.js';
import {W,H} from '../src/game/world.js';

const FOUNTAIN={x:900,y:620,r:96};
function setup(count=1){
 const g=makeWorld();g.out=[];g.mySeat=0;
 const seats=Array.from({length:count},(_,i)=>({id:'mv'+i,name:'클릭'+i,hero:{name:'클릭'+i,job:'warrior',elem:'frost',gender:'m'}}));
 rpgSyncSeats(g,seats);
 for(let i=0;i<count;i++)rpgJoin(g,i,{name:seats[i].name,rs:RESET.id,gift:GIFT.id,lv:50,ts:0,stats:{str:20,hp:20},bag:{oc:1,w:[],n:1}},'mv'+i);
 const h=g.heroes[0];h.auto=0;h.map='plaza';h.x=900;h.y=820;
 return {g,h,seats};
}
const run=(g,t,dt=.02)=>{for(let i=0;i<Math.ceil(t/dt);i++)rpgStep(g,dt);};
const mv=(g,x,y,m='plaza',pi=0,q)=>rpgInput(g,{cls:pi,kind:'mv',dir:{x,y,m},...(q?{q}:{})});
// 분수 중심에서 지금 자리까지 땅 비율로 센 거리
const fd=h=>Math.hypot(h.x-FOUNTAIN.x,(h.y-FOUNTAIN.y)/RPG.squash);

test('mv 입력은 목적지를 정하고 키보드와 같은 속도로 걸어 닿으면 멈춘다',()=>{
 const {g,h}=setup();mv(g,1300,820);
 assert.deepEqual([h.dest.x,h.dest.y,h.dest.map,h.dest.mob],[1300,820,'plaza',-1]);
 const x0=h.x;run(g,1);
 const v=RPG.spd; // 이속 보정 없음
 assert(Math.abs((h.x-x0)-v)<v*0.05,`1초에 ${v}px 안팎 — ${h.x-x0}`);
 run(g,1.2);assert.equal(h.dest,null);assert(Math.abs(h.x-1300)<1);
 // 세로는 squash 만큼 느리다
 const y0=h.y;mv(g,h.x,y0-400);run(g,1);assert(Math.abs((y0-h.y)-v*RPG.squash)<v*RPG.squash*0.05);
});
test('잘못된 입력은 모두 무시한다',()=>{
 const {g,h}=setup();
 for(const bad of [null,undefined,'x',5,{},{x:1,y:1},{x:1,y:1,m:'field'},{x:NaN,y:1,m:'plaza'},{x:1,y:Infinity,m:'plaza'},{x:1e5+1,y:1,m:'plaza'},{x:'900',y:'800',m:'plaza'},{x:900,y:-1e6,m:'plaza'}]){
  rpgInput(g,{cls:0,kind:'mv',dir:bad});assert.equal(h.dest,null,JSON.stringify(bad));
 }
 h.loaded=0;mv(g,1000,800);assert.equal(h.dest,null);h.loaded=1;
 h.down=3;mv(g,1000,800);assert.equal(h.dest,null);h.down=0;
 h.tauntT=2;mv(g,1000,800);assert.equal(h.dest,null);h.tauntT=0;
 rpgHold(g,0,['left']);mv(g,1000,800);assert.equal(h.dest,null);rpgHold(g,0,[]);
 h.tradeLocal=true;mv(g,1000,800);assert.equal(h.dest,null);h.tradeLocal=false;
 mv(g,1000,800);assert(h.dest);
});
test('맵 밖 · 분수 안을 눌러도 가장 가까운 걸을 수 있는 곳으로 보정한다',()=>{
 const {g,h}=setup();
 mv(g,-500,5000);assert.equal(h.dest.x,RPG.edge);assert.equal(h.dest.y,MAPS.plaza.h-RPG.edge);
 mv(g,905,625);assert(Math.hypot(h.dest.x-FOUNTAIN.x,(h.dest.y-FOUNTAIN.y)/RPG.squash)>=FOUNTAIN.r+20-0.5);
 mv(g,900,5);assert.equal(h.dest.y,MAPS.plaza.top);
});
test('방향키를 누르면 목적지가 지워지고 떼는 신호는 지우지 않는다',()=>{
 const {g,h}=setup();mv(g,1500,820);run(g,.2);
 rpgInput(g,{cls:0,kind:'hold',dir:[]});assert(h.dest);
 rpgInput(g,{cls:0,kind:'hold',dir:['up']});assert.equal(h.dest,null);
 const y=h.y;run(g,.5);assert(h.y<y);
});
test('경직 · 속박 · 쓰러짐 · 도발 · 대쉬 · 문 · 워프 · 던전 · 거래는 목적지를 정리한다',()=>{
 {const {g,h}=setup();mv(g,1500,820);h.cc={stun:1};const x=h.x;rpgStep(g,.1);assert.equal(h.x,x);assert(h.dest,'경직 중에는 멈추되 목적지는 남는다');
  h.cc=null;run(g,.2);assert(h.x>x);}
 {const {g,h}=setup();mv(g,1500,820);h.hp=1;h.inv=0;h.down=2;rpgStep(g,.02);assert.equal(h.x,900,'쓰러지면 걷지 않는다');}
 {const {g,h}=setup();mv(g,1500,820);h.max=100;h.hp=1;h.inv=0;h.guard=0;
  // 쓰러짐은 hurtHero 가 지운다
  const foe=g.mobs.find(m=>m.map==='plaza');assert(!foe);}
 {const {g,h}=setup();mv(g,1500,820);rpgDash(g,0,[1,0]);assert.equal(h.dest,null);assert(h.dash>0);}
 {const {g,h}=setup();mv(g,1500,820);h.tauntBy=-1;h.tauntT=0;rpgStep(g,.02);assert(h.dest,'도발이 아니면 그대로');
  h.tauntBy=0;h.tauntT=2;rpgStep(g,.02);assert.equal(h.dest,null,'도발에 걸리면 버린다');}
 {const {g,h}=setup();mv(g,1500,820);h.map='field';rpgStep(g,.02);assert.equal(h.dest,null,'맵이 다르면 안전망으로 버린다');}
 {const {g,h}=setup();h.x=1650;h.y=660;mv(g,1700,660);run(g,.6);assert.equal(h.map,'field');assert.equal(h.dest,null,'문을 지나면 버린다');}
 {const {g,h}=setup();mv(g,1500,820);h.bag.wp=2;h.coins=0;h.admin=1;h.lv=50;
  rpgShop(g,0,{op:'warp',to:'field'});if(h.map==='field')assert.equal(h.dest,null);}
 {const {g,h}=setup();mv(g,1500,820);h.tradeLocal=true;h.hold=[];rpgInput(g,{cls:0,kind:'mv',dir:{x:1,y:1,m:'plaza'}});assert(h.dest,'거래 잠금은 입력을 막을 뿐 이미 있던 목적지는 trade 입력이 지운다');h.tradeLocal=false;}
});
test('다른 곳으로 옮겨 가면 늦게 닿은 옛 맵 좌표는 버려진다',()=>{
 const {g,h}=setup();h.map='field';h.x=300;h.y=900;
 mv(g,1500,820,'plaza');assert.equal(h.dest,null);
 mv(g,600,900,'field');assert(h.dest);
});
test('분수 뒤를 눌러도 분수에 걸리지 않고 둘레로 돌아 도착한다 — 도는 쪽은 바뀌지 않는다',()=>{
 for(const [sx,tx] of [[900,900],[880,930],[1000,800],[800,800]]){
  const {g,h}=setup();h.x=sx;h.y=820;mv(g,tx,430);
  let minD=1e9,sides=new Set(),t=0;
  while(h.dest&&t<12){rpgStep(g,.02);t+=.02;minD=Math.min(minD,fd(h));if(h.destSide)sides.add(h.destSide);}
  assert.equal(h.dest,null,`시작 ${sx} → ${tx}: 아직 가는 중`);
  assert(Math.hypot(h.x-tx,h.y-430)<8,`도착 ${h.x},${h.y}`);
  assert(minD>=FOUNTAIN.r+20-1,`분수에 파고들었다 ${minD}`);
  assert(sides.size<=1,'도는 쪽이 바뀌었다');
  assert(t<7,`돌아가는 길이 너무 길다 ${t}`);
 }
});
test('노점 · 던전 구덩이처럼 붙어 있는 막힌 곳 뒤도 돌아간다',()=>{
 const {g,h}=setup();
 const p=MAPS.plaza.blocks.filter(b=>b.r===42);assert(p.length>=3,'던전 구덩이 블록');
 const cx=p[1].x,cy=p[1].y;
 h.x=cx;h.y=cy+260;mv(g,cx,cy-160);
 let t=0;while(h.dest&&t<14){rpgStep(g,.02);t+=.02;}
 assert.equal(h.dest,null);assert(Math.hypot(h.x-cx,h.y-(cy-160))<12,`${h.x},${h.y}`);
});
test('비켜 걷기를 끄면 막힌 곳에 부딪혀 잠깐 뒤 목적지를 버린다',()=>{
 const {g,h}=setup();const old=MOVE.steer;MOVE.steer=0;
 try{
  h.x=900;h.y=820;mv(g,900,430);let t=0;while(h.dest&&t<5){rpgStep(g,.02);t+=.02;}
  assert.equal(h.dest,null,'막혀서 버렸다');assert(t>MOVE.stuckT-.05&&t<2.5,`${t}`);
  assert(fd(h)<FOUNTAIN.r+20+4);
 }finally{MOVE.steer=old;}
});
test('걷는 쪽을 8방향으로 끊어 바라보고 look 은 연속값이며 aimDir 이 따른다',()=>{
 const {g,h}=setup();h.x=300;h.y=900;
 mv(g,h.x+10,h.y-600);run(g,.2);assert.equal(h.face,2);assert.equal(h.dir,1,'거의 위로 가면 좌우는 그대로');
 assert(Math.abs(aimDir(h)[1])>0.9);
 const {g:g2,h:h2}=setup();mv(g2,h2.x-500,h2.y);run(g2,.2);assert.equal(h2.dir,-1);assert.equal(h2.face,1);assert.deepEqual(aimDir(h2).map(v=>Math.round(v)),[-1,0]);
 const {g:g3,h:h3}=setup();mv(g3,h3.x+400,h3.y+300);run(g3,.2);assert.equal(h3.dir,1);assert.equal(h3.face,1,'비스듬히 아래로 가도 키보드처럼 옆모습');
 const {g:g4,h:h4}=setup();h4.x=300;h4.y=600;mv(g4,h4.x+5,h4.y+400);run(g4,.2);assert.equal(h4.face,0,'곧게 아래로 가면 앞모습');
});
test('mv 는 hold 와 늦게 온 입력 비교 칸을 같이 쓴다',()=>{
 const h={};
 assert(freshInput(h,'mv',5,1));assert.equal(freshInput(h,'hold',4,2),false);assert.equal(freshInput(h,'mv',5,2),false);
 assert(freshInput(h,'hold',6,3));assert.equal(freshInput(h,'mv',5,3),false);
 assert.equal(h.inq.hold,6);assert.equal(h.inqAt,3);
 assert(freshInput(h,'dash',1,1));assert(freshInput(h,'fire',1,1));assert.equal(freshInput(h,'fire',1,1),false);
 const {g,h:hero}=setup();
 mv(g,1500,820,'plaza',0,10);const d=hero.dest;mv(g,1000,820,'plaza',0,9);assert.equal(hero.dest,d,'번호가 작은 옛 mv 는 버린다');
 rpgInput(g,{cls:0,kind:'hold',dir:['up'],q:11});assert.equal(hero.dest,null);
 rpgInput(g,{cls:0,kind:'hold',dir:[],q:12});mv(g,1500,820,'plaza',0,8);assert.equal(hero.dest,null,'뗌(12) 뒤에 늦게 닿은 mv(8)는 버린다');
});
test('스냅샷 55번 줄에 목적지를 싣고 없으면 0 이다',()=>{
 const {g}=setup();
 assert.equal(rpgPack(g).h[0][55],0);assert.equal(rpgPack(g).h[0].length,56);
 mv(g,1234.4,800);assert.deepEqual(rpgPack(g).h[0][55],[1234,800]);
 const back=JSON.parse(JSON.stringify(rpgPack(g)));assert.deepEqual(back.h[0][55],[1234,800]);
});
test('손님: 서버가 받은 뒤 목적지가 없으면 멈추고 아직 못 받았으면 기다린다 · 옛 방장이면 쓰지 않는다',()=>{
 const {g,seats}=setup();const guest=makeWorld();guest.mySeat=0;rpgLooks(guest,seats);
 rpgApply(guest,JSON.parse(JSON.stringify(rpgPack(g))));
 const gh=guest.heroes[0];assert.equal(gh.mvOk,1);
 rpgMove(guest,0,{x:1500,y:820,m:'plaza'});assert(gh.dest);
 const snap=()=>JSON.parse(JSON.stringify(rpgPack(g)));
 // 방장이 아직 못 받았다: 내 마지막 mv 번호(mvQ)가 방장이 받은 번호(ackHoldQ)보다 크다
 gh.mvQ=50;g.heroes[0].inq={hold:40};rpgApply(guest,snap());assert(gh.dest,'아직 못 받았다 — 기다린다');
 // 방장이 받았고(번호 50) 목적지가 없다: 닿았거나 막혀 취소
 g.heroes[0].inq={hold:50};g.heroes[0].dest=null;rpgApply(guest,snap());assert.equal(gh.dest,null);
 // 방장도 같은 목적지가 있으면 그대로
 rpgMove(guest,0,{x:1500,y:820,m:'plaza'});mv(g,1500,820);g.heroes[0].inq={hold:60};gh.mvQ=60;rpgApply(guest,snap());assert(gh.dest);
 // 옛 방장 — 55번 줄이 없다
 const old=snap();old.h[0].length=55;rpgApply(guest,old);assert.equal(gh.mvOk,0);assert.equal(gh.dest,null);
});
test('손님이 먼저 걷고 방장이 지연 뒤 받아도 두 화면의 자리가 거의 같다(분수 뒤 클릭)',()=>{
 const {g,seats}=setup();const guest=makeWorld();guest.mySeat=0;rpgLooks(guest,seats);
 rpgApply(guest,JSON.parse(JSON.stringify(rpgPack(g))));
 const gh=guest.heroes[0],hh=g.heroes[0];
 const lat=.08;                                  // 한 방향 지연
 const toHost=[],toGuest=[];let t=0,sinceSnap=0,q=1000,fixes0=guest.netFix||0;
 const send=()=>{const d={x:900,y:430,m:'plaza'};rpgMove(guest,0,d);q+=1;gh.mvQ=q;noteSent(guest,q);toHost.push({at:t+lat,msg:{cls:0,kind:'mv',dir:d,q}});};
 let sent=false,maxGap=0;
 for(let i=0;i<300;i++){
  t+=.02;
  if(!sent&&t>.1){sent=true;send();}
  while(toHost.length&&toHost[0].at<=t)rpgInput(g,toHost.shift().msg);
  rpgStep(g,.02);sinceSnap+=.02;
  if(sinceSnap>=.1){sinceSnap=0;toGuest.push({at:t+lat,snap:JSON.stringify(rpgPack(g))});}
  while(toGuest.length&&toGuest[0].at<=t)rpgApply(guest,JSON.parse(toGuest.shift().snap));
  rpgStepVisual(guest,.02);
  if(sent)maxGap=Math.max(maxGap,Math.hypot(gh.x-hh.x,gh.y-hh.y));
 }
 assert.equal(hh.dest,null);assert.equal(gh.dest,null);
 assert(Math.hypot(hh.x-900,hh.y-430)<8,'방장 도착');
 assert(Math.hypot(gh.x-hh.x,gh.y-hh.y)<10,`도착 뒤 차이 ${Math.hypot(gh.x-hh.x,gh.y-hh.y)}`);
 assert((guest.netFix||0)-fixes0<=4,`위치를 고친 횟수 ${guest.netFix}`);
 assert(maxGap<SYNC.fix*3,`걷는 동안 최대 차이 ${maxGap}`);
});
test('방장 승계 — 가던 목적지는 기록(mv)으로 이어받고 맵이 다르면 버린다',()=>{
 const {g,seats}=setup();
 mv(g,1500,820);const snap=JSON.parse(JSON.stringify(rpgPack(g)));
 const guest=makeWorld();guest.mySeat=0;rpgLooks(guest,seats);rpgApply(guest,snap);
 rpgMove(guest,0,{x:1500,y:820,m:'plaza'});
 const d=guest.heroes[0].dest;rpgPromote(guest);assert.equal(guest.heroes[0].dest,d);
 // 새 방장에게 기록을 다시 보낸다
 const g2=makeWorld();g2.mySeat=1;g2.out=[];rpgSyncSeats(g2,seats);
 rpgJoin(g2,0,{name:'클릭0',rs:RESET.id,gift:GIFT.id,lv:50,ts:0,stats:{str:20,hp:20},bag:{oc:1,w:[],n:1},mv:{x:1500,y:820,m:'plaza'}},'mv0');
 g2.heroes[0].map='plaza';
 assert(g2.heroes[0].dest&&g2.heroes[0].dest.x===1500);
 rpgJoin(g2,0,{name:'클릭0',rs:RESET.id,gift:GIFT.id,lv:50,ts:0,stats:{str:20,hp:20},bag:{oc:1,w:[],n:1},mv:{x:1500,y:820,m:'field'}},'mv0');
});
test('여럿이 동시에 걸어도 서로의 목적지가 섞이지 않는다',()=>{
 const {g}=setup(3);
 g.heroes.filter(Boolean).forEach((h,i)=>{h.x=300+i*120;h.y=900;});
 mv(g,1500,900,'plaza',0);mv(g,300,500,'plaza',1);
 run(g,1);
 assert(g.heroes[0].x>500);assert(g.heroes[1].y<900);assert.equal(g.heroes[2].dest,null);assert.equal(g.heroes[2].x,540);
});
test('목적지가 있는 동안 스킬 · 평타는 이동을 끊지 않는다',()=>{
 const {g,h}=setup();h.map='field';h.x=300;h.y=900;mv(g,900,900,'field');
 rpgInput(g,{cls:0,kind:'fire',dir:true});run(g,.5);rpgInput(g,{cls:0,kind:'fire',dir:false});
 assert(h.dest&&h.x>300+RPG.spd*.4);
});

/* ── mouseMove.js ── */
test('화면 점을 땅 좌표로 바꾸고 월드보스 포탈은 왼쪽 클릭 상자와 같다',()=>{
 const rect={left:100,top:50,width:W/2,height:H/2};
 assert.deepEqual(canvasToWorld(100+W/4,50+H/4,rect,{x:300.4,y:200.6}),{x:W/2+300,y:H/2+201});
 assert.equal(canvasToWorld(1,1,{left:0,top:0,width:0,height:0},{x:0,y:0}),null);assert.equal(canvasToWorld(1,1,rect,null),null);
 const P=WORLD_BOSS.portal;
 assert(portalHit(P.x,P.y-100));assert(!portalHit(P.x+120,P.y-100));assert(!portalHit(P.x,P.y+40));assert(!portalHit(P.x,P.y-240));
 assert.equal(pickNpc('plaza',P.x,P.y-100).worldBoss,1);
});
test('NPC 를 누르면 그 NPC 를 고르고 빈 땅이면 고르지 않는다',()=>{
 for(const n of MAPS.plaza.npcs){
  if(n.worldBoss)continue;
  const got=pickNpc('plaza',n.x,n.y-20);assert(got,n.id);
 }
 assert.equal(pickNpc('plaza',60,300),null);assert.equal(pickNpc('nowhere',1,1),null);
 assert.equal(pickNpc('field',430,740-30).id,'hunter');
});
test('NPC 곁 자리로 걸어가면 모든 방향에서 말을 걸 수 있는 거리에 선다(분수 뒤 · 반대편 포함)',()=>{
 const starts=[[900,900],[200,300],[1450,1100],[900,330],[300,1100],[1500,400]];   // 사냥문(1690,660) 곁을 지나지 않는 시작점
 for(const n of MAPS.plaza.npcs){
  for(const [sx,sy] of starts){
   const {g,h}=setup();h.x=sx;h.y=sy;
   const s=npcStopPoint(h,n);mv(g,s.x,s.y);
   let t=0;while(h.dest&&t<30){rpgStep(g,.02);t+=.02;}
   assert.equal(h.dest,null,`${n.id} ${sx},${sy}: 못 닿음 ${h.x|0},${h.y|0}`);
   assert(dist(h.x,h.y,n.x,n.y)<=talkReach(n),`${n.id} ${sx},${sy}: 거리 ${dist(h.x,h.y,n.x,n.y)|0} > ${talkReach(n)}`);
   if(n.worldBoss)assert(worldBossPortalNear(h),'포탈 거리');
   else if(!n.dungeon)assert.equal(npcNear(h)&&npcNear(h).id===n.id||dist(h.x,h.y,n.x,n.y)<=RPG.talkR,true);
  }
 }
});
test('이미 NPC 곁이면 npcNear 가 그 NPC 를 알려 바로 말을 걸 수 있다',()=>{
 const {h}=setup();const n=MAPS.plaza.npcs.find(q=>q.shop);const s=npcStopPoint({...h,x:n.x+300,y:n.y+300,map:'plaza'},n);
 h.x=s.x;h.y=s.y;assert.equal(npcNear(h).id,n.id);
});
test('MV_UI 와 MOVE 상수가 계획서 값이다',()=>{
 assert.deepEqual([MOVE.arrive,MOVE.pad,MOVE.stuckFrac,MOVE.stuckT,MOVE.steer],[6,20,0.3,0.35,1]);
 assert.equal(MV_UI.gap,100);assert.equal(MV_UI.min,20);
});
