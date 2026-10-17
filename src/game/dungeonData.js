/* ── RPG 던전 — 수치는 모두 여기 한 곳 ─────────────────────────
   광장의 던전 관리인에게서 들어간다. 들어가는 사람이 입장료를 내고, 같은 파티로 광장에 있는 사람이 함께 들어간다.
   던전마다 칸이 slots 개 — 칸 하나에 한 무리만 들어간다. 몹 무리 waves 를 차례로 모두 잡으면 보스가 나온다.
   time 초 안에 보스를 잡으면 그때 안에 있는 사람이 저마다 reward 를 받는다. 시간이 다 되거나 모두 쓰러지면 실패(입장료는 돌려주지 않는다).
   규칙은 rpg.js(rpgDungeon · tickRuns · stepDgBoss), 창은 src/RpgView.jsx, 보스 그림은 tools/cut-bosses.py.
   DUNGEONS 의 차례는 스냅샷 · 맵 차례에 쓰니 뒤에만 더한다. */

export const DUNGEON = {
  time: 300,            // 제한 시간(초)
  slots: 3,             // 던전마다 동시에 들어갈 수 있는 무리 수
  hpMul: 1.5,           // 던전 몹은 사냥터 몹보다 체력이 이만큼 많다
  dmgMul: 1,            // 던전 몹(보스 말고) 공격력 배율 — 한 무리가 한꺼번에 덤벼 사냥터보다 아프다
  aggro: 1.2,           // 던전 몹이 알아채는 거리 — 사냥터 몹의 이 배. 알아채면 끝까지 쫓는다(한 무리가 한꺼번에 덤비지 않게 맵 전체로 두지 않는다)
  bossAggro: 3000,      // 보스는 맵 어디서든 알아챈다
  bossRegen: 0,         // 던전 보스 자동 회복 배율(사냥터 MOB_REGEN 에 곱한다) — 0 이면 안 맞아도 차오르지 않는다(제한 시간이 있어 껐다)
  rally: 220,           // 잡몹은 맵 가장자리에서 나와 가운데 이 둘레로 몰려온다(가다가 사람을 알아채면 덤빈다)
  waveGap: 2.5,         // 무리를 다 잡은 뒤 다음 무리가 나오기까지(초)
  clearWait: 8,         // 보스를 잡고 광장으로 돌아가기까지(초)
  failWait: 4,          // 실패한 뒤 광장으로 돌아가기까지(초)
  npc: { x: 760, y: 1070 },   // 광장의 던전 관리인 자리
  w: 2800, h: 1400,     // 던전 맵 크기 — 들어가면 가운데에 선다(무리도 가운데로 몰려온다)
};

// 강화석 던전 셋 — 몹 종류(rpg.js MOB) · 레벨 · 무리 수 · 보스(그라모르) 세기 · 보상 강화석
export const DUNGEONS = [
  {
    id: "stone1", name: "강화석 던전 · 일반", fee: 20000, mob: "goblin", lv: [110, 130], waves: [6, 7, 8],
    boss: { type: "gramor", lv: 140, hp: 700000, dmg: 480, xp: 9000, coin: 5000 },
    reward: { id: "blue", n: 15 }, tint: "rgba(40,30,24,0.42)",
  },
  {
    id: "stone2", name: "강화석 던전 · 중급", fee: 30000, mob: "orc", lv: [140, 160], waves: [5, 6, 7],
    boss: { type: "gramor", lv: 170, hp: 1100000, dmg: 640, xp: 12000, coin: 7000 },
    reward: { id: "eye", n: 10 }, tint: "rgba(56,26,18,0.46)",
  },
  {
    id: "stone3", name: "강화석 던전 · 고급", fee: 50000, mob: "ogre", lv: [180, 200], waves: [4, 5, 6],
    boss: { type: "gramor", lv: 205, hp: 1500000, dmg: 820, xp: 16000, coin: 10000 },
    reward: { id: "heart", n: 7 }, tint: "rgba(30,14,14,0.52)",
  },
];

/* 방어구 던전 넷 — 보상은 그 부위 방어구 하나. 등급은 armorData.js ARMOR_GRADES 의 drop 몫(초급 52 · 희귀 30 · 영웅 17 · 전설 1%).
   몹은 사냥터 몹을 쓰고 맵 빛깔로 분위기를 낸다 */
DUNGEONS.push(
  {
    id: "helm", name: "생명의 묘지", fee: 30000, mob: "goblin", lv: [120, 140], waves: [6, 7, 8],
    boss: { type: "morgas", lv: 150, hp: 900000, dmg: 520, xp: 10000, coin: 6000 },
    reward: { armor: "head" }, tint: "rgba(20,40,34,0.50)",
  },
  {
    id: "body", name: "무너진 철의 성채", fee: 50000, mob: "ogre", lv: [180, 200], waves: [4, 5, 6],
    boss: { type: "argas", lv: 210, hp: 1800000, dmg: 860, xp: 17000, coin: 11000 },
    reward: { armor: "body" }, tint: "rgba(44,30,24,0.50)",
  },
  {
    id: "legs", name: "피로 물든 투기장", fee: 40000, mob: "orc", lv: [160, 180], waves: [5, 6, 7],
    boss: { type: "barkanon", lv: 190, hp: 1400000, dmg: 720, xp: 14000, coin: 9000 },
    reward: { armor: "legs" }, tint: "rgba(60,16,16,0.46)",
  },
  {
    id: "feet", name: "폭풍의 첨탑", fee: 35000, mob: "orc", lv: [140, 160], waves: [5, 6, 7],
    boss: { type: "serka", lv: 170, hp: 1100000, dmg: 640, xp: 12000, coin: 7500 },
    reward: { armor: "feet" }, tint: "rgba(18,30,52,0.48)",
  },
);
/* 던전 바닥 빛깔 — 바닥 돌 · 줄눈 · 벽 · 갈라진 틈의 빛 · 횃불 빛. 그림은 rpgArt.js paintDungeon(파일 없이 코드로 그린다) */
export const DG_LOOKS = {
  stone1: { floor: "#46403a", tile: "#524a42", line: "#2a241f", wall: "#2c2622", glow: "#ff9a4a", fire: "#ffb060" },
  stone2: { floor: "#4a3a32", tile: "#57453a", line: "#2c1f1a", wall: "#2e211c", glow: "#ff7a3a", fire: "#ffa050" },
  stone3: { floor: "#3a2a2a", tile: "#463232", line: "#221616", wall: "#251818", glow: "#ff5a3a", fire: "#ff9040" },
  helm: { floor: "#36403a", tile: "#404c45", line: "#1e2622", wall: "#222a26", glow: "#7fe0a0", fire: "#9ff0b8" },
  body: { floor: "#443c36", tile: "#504740", line: "#28221e", wall: "#2a2420", glow: "#ff8a40", fire: "#ffb060" },
  legs: { floor: "#5a4636", tile: "#6a5240", line: "#33261c", wall: "#3a2a20", glow: "#e05a4a", fire: "#ff8a60" },
  feet: { floor: "#363e4a", tile: "#414a58", line: "#1e242e", wall: "#222a36", glow: "#8fc8ff", fire: "#b0dcff" },
};
export const DG_GROUPS = [
  { name: "강화석 던전", ids: ["stone1", "stone2", "stone3"] },
  { name: "방어구 던전", ids: ["helm", "feet", "legs", "body"] },
];

/* 던전 보스 — 걸어와 치고(walk · punchCd), 기술 셋을 쓴다. 기술은 종류(k)마다 같은 셈을 쓴다(rpg.js stepDgBoss).
   slam   range 안에 들면 wind 초 준비했다가 r 둘레를 친다(dmg × mul). heal 이 있으면 맞힌 사람마다 보스 최대 체력의 그 몫만큼 회복한다
   multi  range 안에 들면 wind 초 준비 뒤 gap 초 간격으로 n 번 r 둘레를 친다
   charge min 보다 멀면 wind 초 준비했다가 speed 로 time 초 달린다. 길에 닿으면 dmg × mul, push 만큼 밀려난다
   wall   체력이 at 몫 아래로 내려갈 때마다 dur 초 동안 받는 피해가 cut 만큼 준다
   rage   체력이 at 몫 아래로 내려가면 한 번 — 끝까지 걷기 · 치는 빠르기 × spd, 피해 × dmg
   summon cd 초마다 그 던전 몹 n 마리를 둘레에 부른다(보스가 쓰러지면 함께 사라진다)
   mirage cd 초마다 dur 초 동안 잔상을 남긴다 — 그동안 맞을 때 dodge 확률로 피한다
   첫 기술 대기는 cd 의 절반. name 은 기술을 쓸 때 머리 위에 띄운다 */
export const BOSS_AI = {
  // 강철 파괴자 그라모르 — 강화석 던전
  gramor: {
    rad: 34, size: 2.1, walk: 150, punchCd: 1.3,
    skills: [
      { k: "slam", name: "대지 강타", range: 230, wind: 1.0, r: 240, mul: 1.8, cd: 7, rest: 0.8 },
      { k: "charge", name: "방패 돌진", min: 260, wind: 0.7, speed: 640, time: 0.6, width: 70, mul: 1.5, push: 140, cd: 10, rest: 0.9 },
      { k: "wall", name: "철벽 자세", at: [0.75, 0.5, 0.25], dur: 5, cut: 0.7 },
    ],
  },
  // 대지의 재앙 아르가스 — 갑옷 던전. 그라모르와 같은 기술을 더 넓고 세게
  argas: {
    rad: 36, size: 2.2, walk: 155, punchCd: 1.2,
    skills: [
      { k: "slam", name: "대지 강타", range: 250, wind: 0.95, r: 270, mul: 1.9, cd: 6.5, rest: 0.7 },
      { k: "charge", name: "방패 돌진", min: 260, wind: 0.65, speed: 680, time: 0.65, width: 80, mul: 1.6, push: 160, cd: 9, rest: 0.8 },
      { k: "wall", name: "철벽 자세", at: [0.8, 0.6, 0.4, 0.2], dur: 5, cut: 0.7 },
    ],
  },
  // 불멸의 군주 모르가스 — 투구 던전
  morgas: {
    rad: 26, size: 2, walk: 130, punchCd: 1.4,
    skills: [
      { k: "slam", name: "영혼 흡수", range: 340, wind: 1.3, r: 340, mul: 1.0, heal: 0.02, cd: 12, rest: 0.8 },
      { k: "summon", name: "망령 소환", n: 4, cd: 22 },
      { k: "slam", name: "생명력 폭발", range: 230, wind: 1.2, r: 280, mul: 2.0, cd: 9, rest: 0.9 },
    ],
  },
  // 광전사 바르카논 — 바지 던전
  barkanon: {
    rad: 30, size: 2, walk: 170, punchCd: 1.0,
    skills: [
      { k: "rage", name: "광폭화", at: 0.5, spd: 1.4, dmg: 1.3 },
      { k: "multi", name: "연속 도끼 베기", range: 190, wind: 0.5, n: 3, gap: 0.32, r: 170, mul: 0.9, cd: 6, rest: 0.6 },
      { k: "charge", name: "분노의 돌진", min: 240, wind: 0.55, speed: 720, time: 0.6, width: 80, mul: 1.6, push: 150, cd: 8, rest: 0.7 },
    ],
  },
  // 질풍의 망령 세르카 — 신발 던전
  serka: {
    rad: 24, size: 2, walk: 220, punchCd: 0.7,
    skills: [
      { k: "charge", name: "순간 돌진", min: 180, wind: 0.35, speed: 1150, time: 0.32, width: 70, mul: 1.3, push: 90, cd: 5, rest: 0.4 },
      { k: "multi", name: "폭풍 연격", range: 180, wind: 0.4, n: 5, gap: 0.18, r: 160, mul: 0.6, cd: 7, rest: 0.5 },
      { k: "mirage", name: "잔상 분신", cd: 15, dur: 4, dodge: 0.5 },
    ],
  },
};
// 이름 — rpg.js MOB 에 보스로 올린다
export const BOSS_NAMES = { gramor: "강철 파괴자 그라모르", argas: "대지의 재앙 아르가스", morgas: "불멸의 군주 모르가스", barkanon: "광전사 바르카논", serka: "질풍의 망령 세르카" };
export const DG_BY_ID = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));
export const dgMapId = (id, slot) => `${id}-${slot}`;
