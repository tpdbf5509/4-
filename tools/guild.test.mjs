import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,rpgSyncSeats,rpgJoin,rpgGuild,rpgStep,rpgWeaponSkill,rpgPack,rpgApply,rpgPromote,physMul,refreshHp,MAPS,npcNear} from '../src/game/rpg.js';
import {GUILD as C,GUILD_BOSSES,guildBuff,guildAspd,GUILD_HALL as HALL} from '../src/game/guildData.js';
import {guildHit,guildReport} from '../src/game/guild.js';
import {RESET,GIFT} from '../src/game/itemData.js';
const seats=Array.from({length:4},(_,i)=>({id:`g${i}`,name:`길드${i}`,hero:{name:`길드${i}`,job:'archer',elem:'frost',gender:'m'}}));
function setup(boss='slime'){
 const g=makeWorld();g.wbServer='RPG1';g.wb.lastHour=Math.floor(g.wb.clock/3600000);g.out=[];g.mySeat=0;rpgSyncSeats(g,seats);
 const raid={id:'test-raid',guild:'test-guild',server:'RPG1',boss,members:seats.slice(0,3).map(x=>x.name),expires:Date.now()+600000};
 for(let i=0;i<4;i++){rpgJoin(g,i,{name:seats[i].name,lv:400,rs:RESET.id,gift:GIFT.id,ts:0,coins:100000,stats:{str:400,hp:400},bag:{oc:1,w:[{u:1,t:'bow',r:10,g:4,p:1,sp:'dragon_bow',up:30}],e:1,n:2}},seats[i].id);g.heroes[i].auto=0;
 rpgGuild(g,i,{op:'sync',state:{id:i===3?'other':'test-guild',name:'시험',level:0,used:0,raid}});}
 return g;
}
function advance(g,sec){for(let n=0;n<Math.ceil(sec/.02);n++)rpgStep(g,.02);}
test('길드 토벌은 가입·서버·최초 명단·광장·생존 조건을 확인한다',()=>{
 const g=setup(),h=g.heroes[0];h.map='field';assert(!rpgGuild(g,0,{op:'enter'}));h.map='plaza';h.guild.raid.server='RPG2';assert(!rpgGuild(g,0,{op:'enter'}));h.guild.raid.server='RPG1';
 assert(!rpgGuild(g,3,{op:'enter'}));assert(rpgGuild(g,0,{op:'enter'}));assert(rpgGuild(g,1,{op:'enter'}));assert.equal(g.gruns.length,1);assert.equal(g.heroes[0].map,g.heroes[1].map);
 assert(!rpgGuild(g,0,{op:'enter'}));assert(rpgGuild(g,0,{op:'leave'}));assert.equal(h.map,'guildhall-0');   // 토벌에서 나가면 내 길드 광장으로
});
test('길드가 다르면 토벌 공간과 보스 체력을 분리한다',()=>{
 const g=setup();rpgGuild(g,0,{op:'enter'});const h=g.heroes[3];h.guild.raid={...h.guild.raid,id:'other-raid',guild:'other',members:['길드3']};
 assert(rpgGuild(g,3,{op:'enter'}));assert.notEqual(h.map,g.heroes[0].map);assert.equal(g.gruns.length,2);
 const m=g.mobs.find(m=>m.map===h.map);guildHit(g,m,h,100);m.hp-=100;advance(g,.02);assert.equal(g.gruns[1].hp,g.gruns[1].max-100);assert.equal(g.gruns[0].hp,g.gruns[0].max);
});
test('성전 공격력·최대 체력과 코어 공속을 적용하고 탈퇴 시 성전만 해제한다',()=>{
 const g=setup(),h=g.heroes[0],before=physMul(h),hp=h.max;
 rpgGuild(g,0,{op:'sync',state:{id:'test-guild',name:'시험',level:70,used:40}});assert.equal(guildBuff(h),1.35);assert.equal(guildAspd(h),.2);assert.equal(physMul(h),before*1.35);assert.equal(h.max,Math.round(hp*1.35));assert(h.hp<=hp);
 rpgGuild(g,0,{op:'sync',state:{id:null,level:70,used:40}});refreshHp(h);assert.equal(physMul(h),before);assert.equal(h.max,hp);assert.equal(guildAspd(h),.2);
});
test('각 보스가 두 전용 패턴을 판정하고 위험지역 밖과 무적 상태를 구분한다',()=>{
 for(const b of GUILD_BOSSES){const g=setup(b.id);rpgGuild(g,0,{op:'enter'});const r=g.gruns[0],h=g.heroes[0];h.inv=999;
 for(const kind of b.patterns){r.cd=0;advance(g,.02);assert.equal(r.attack.kind,kind);const before=h.hp;advance(g,1.9);assert.equal(h.hp,before);assert(!r.attack);assert(g.out.some(f=>f.kind==='sk_guild_hit'&&f.boss===b.id));}
 r.seq=0;r.cd=0;advance(g,.02);h.inv=0;const s=r.attack.areas[0];h.x=s.x+(s.shape==='ring'?s.inner+100:100);h.y=s.y;const before=h.hp;advance(g,1.9);assert(h.hp<before);
 }
});
test('실제 무기 스킬이 기여를 기록하고 처치 보상 보고는 재입장·나가기 후에도 남는다',()=>{
 const g=setup();rpgGuild(g,0,{op:'enter'});const r=g.gruns[0],h=g.heroes[0],m=g.mobs.find(m=>m.id===r.mob);m.hp=100;h.x=m.x-100;h.y=m.y;h.look=[1,0];
 rpgWeaponSkill(g,0);advance(g,2);assert.equal(r.phase,'clear');assert.deepEqual(r.contrib,['길드0']);assert.equal(guildReport(g,h)[0].outcome,'clear');
 advance(g,C.exitWait);assert.equal(h.map,'guildhall-0');assert.equal(g.gruns.length,0);assert.equal(guildReport(g,h).length,1);
 rpgGuild(g,0,{op:'settled',id:r.id});assert.equal(guildReport(g,h).length,0);
});
test('공격·기여·체력·기절 면역은 방장 승계 후 이어진다',()=>{
 const g=setup('siren');rpgGuild(g,0,{op:'enter'});const r=g.gruns[0],m=g.mobs.find(m=>m.id===r.mob);guildHit(g,m,g.heroes[0],1234);m.hp-=1234;r.cd=0;advance(g,.02);
 const guest=makeWorld();rpgSyncSeats(guest,seats);rpgApply(guest,structuredClone(rpgPack(g)));rpgPromote(guest);
 assert.equal(guest.gruns[0].hp,r.hp);assert.deepEqual(guest.gruns[0].attack,r.attack);assert.deepEqual(guest.gruns[0].contrib,r.contrib);assert.equal(guest.mobs.find(m=>m.id===r.mob).hp,r.hp);
});
test('시간 초과와 전원 퇴장은 실패로 보고하고 중복 전투를 만들지 않는다',()=>{
 const g=setup();rpgGuild(g,0,{op:'enter'});const r=g.gruns[0];r.t=.01;advance(g,.02);assert.equal(r.phase,'fail');assert.equal(guildReport(g,g.heroes[0])[0].outcome,'fail');advance(g,C.exitWait+.1);assert.equal(g.gruns.length,0);
});
test('광장의 길드 문 → 길드 광장(여신 조각상 · 토벌전 문) → 토벌, 일반 던전·PvP 공간을 섞지 않는다',()=>{
 const g=setup(),h=g.heroes[0];h.x=HALL.door.x;h.y=HALL.door.y+40;assert(npcNear(h).guildDoor);
 assert(rpgGuild(g,0,{op:'hall'}));assert.equal(h.map,'guildhall-0');assert(MAPS[h.map].guildHall&&MAPS[h.map].safe);
 h.x=HALL.statue.x;h.y=HALL.statue.y+40;assert(npcNear(h).guild);h.x=HALL.raidDoor.x;h.y=HALL.raidDoor.y+40;assert(npcNear(h).guildRaidDoor);
 rpgGuild(g,0,{op:'enter'});assert(MAPS[h.map].guildRaid);assert(MAPS[h.map].dungeon);
});
test('길드가 없거나 다른 길드면 길드 광장에 들어가거나 머물 수 없다',()=>{
 const g=setup(),h=g.heroes[0],id=h.guild.id;h.guild={...h.guild,id:null};assert(!rpgGuild(g,0,{op:'hall'}));assert.equal(h.map,'plaza');
 h.guild={...h.guild,id};assert(rpgGuild(g,0,{op:'hall'}));h.guild={...h.guild,id:'other-guild'};rpgStep(g,0.05);assert.equal(h.map,'plaza');
});
