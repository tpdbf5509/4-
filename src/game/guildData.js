/* 길드 시험 수치. DB의 guild.sql 설정과 함께 맞춘다. */
export const GUILD={cap:4,minLevel:50,fee:50000,templeMax:70,templePct:.005,coreStep:.005,coreMax:40,
  dailyStones:10,dailyRaids:3,raidSeconds:600,raidLevel:400,wind:1.8,gap:3,rageGap:1.8,rageAt:.3,exitWait:15,slots:16,w:2200,h:1500,squash:.78,
  statue:{x:560,y:760},spawn:[850,1000],center:[1250,1050]};
// 길드 입장(10월 23일) — 광장의 길드 문 → 길드가 없으면 길드 찾기 창, 있으면 그 길드만의 길드 광장.
// 길드 광장에는 여신 조각상(성전 창)과 토벌전 문(보스 선택 · 참여 인원)이 있다. 길드마다 칸 하나(guildhall-<칸>)를 방장이 빌려준다
export const GUILD_HALL={door:{x:560,y:760},                // 광장의 길드 문 — 예전 성전 조각상 자리
  w:1800,h:1200,spawn:[900,960],statue:{x:900,y:560},raidDoor:{x:1480,y:700},exit:{x:170,y:820},slots:16};
export const guildHallMap=slot=>`guildhall-${slot}`;
export const GUILD_BOSSES=[
  {id:'slime',type:'guild_slime',name:'강화된 슬라임',hp:10000000,damage:.32,points:100,stones:20,color:'#b9dc8f',patterns:['slam','split']},
  {id:'siren',type:'guild_siren',name:'바다세이렌',hp:20000000,damage:.4,points:180,stones:35,color:'#8bd4df',patterns:['wave','song']},
  {id:'phoenix',type:'guild_phoenix',name:'불사조',hp:40000000,damage:.5,points:300,stones:50,color:'#efb16c',patterns:['feather','nova']},
];
export const GUILD_BOSS_BY_ID=Object.fromEntries(GUILD_BOSSES.map(b=>[b.id,b]));
export const GUILD_BOSS_BY_TYPE=Object.fromEntries(GUILD_BOSSES.map(b=>[b.type,b]));
export const guildMap=slot=>`guildraid-${slot}`;
export const templeCost=lv=>20+lv*10;
export const guildBuff=h=>1+Math.min(GUILD.templeMax,Math.max(0,h?.guild?.level||0))*GUILD.templePct;
export const guildAspd=h=>Math.min(GUILD.coreMax,Math.max(0,h?.guild?.used||0))*GUILD.coreStep;
export const guildKey=(g,h)=>String(g.names[h.pi]||'').normalize('NFKC').trim().toLowerCase();

// 길드 보스 전용 3열×2행 그림. 위 준비 자세·아래 공격 자세, 기준점은 발밑이다.
export const GUILD_BOSS_ART={path:'/assets/game/rpg/boss/guild-bosses.webp',cols:3,rows:2,size:360,
 feet:[[.95,.95,.95],[.96,.97,.96]]};
