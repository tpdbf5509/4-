/* ── RPG 던전 — 수치는 모두 여기 한 곳 ─────────────────────────
   광장의 던전 관리인에게서 들어간다. 들어가는 사람이 입장료를 내고, 같은 파티로 광장에 있는 사람이 함께 들어간다.
   던전마다 칸이 slots 개 — 칸 하나에 한 무리만 들어간다. 몹 무리 waves 를 차례로 모두 잡으면 보스가 나온다.
   time 초 안에 보스를 잡으면 그때 안에 있는 사람이 저마다 reward 를 받는다. 시간이 다 되거나 모두 쓰러지면 실패(입장료는 돌려주지 않는다).
   규칙은 rpg.js(rpgDungeon · tickRuns · stepGramor), 창은 src/RpgView.jsx, 보스 그림은 tools/cut-bosses.py.
   DUNGEONS 의 차례는 스냅샷 · 맵 차례에 쓰니 뒤에만 더한다. */

export const DUNGEON = {
  time: 300,            // 제한 시간(초)
  slots: 3,             // 던전마다 동시에 들어갈 수 있는 무리 수
  hpMul: 1.5,           // 던전 몹은 사냥터 몹보다 체력이 이만큼 많다
  aggro: 3000,          // 던전 몹은 맵 어디서든 사람을 알아채고 끝까지 쫓는다
  waveGap: 2.5,         // 무리를 다 잡은 뒤 다음 무리가 나오기까지(초)
  clearWait: 8,         // 보스를 잡고 광장으로 돌아가기까지(초)
  failWait: 4,          // 실패한 뒤 광장으로 돌아가기까지(초)
  npc: { x: 760, y: 1070 },   // 광장의 던전 관리인 자리
  w: 2800, h: 1400,     // 던전 맵 크기
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
export const DG_BY_ID = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));
export const dgMapId = (id, slot) => `${id}-${slot}`;

/* 강철 파괴자 그라모르 — 강화석 던전 보스. 걸어와 망치로 치고, 세 가지 기술을 돌려 쓴다.
   대지 강타: slam.range 안에 들면 slam.wind 초 망치를 들었다가 slam.r 둘레를 내려친다(dmg × slam.mul).
   방패 돌진: 멀리 있으면 charge.wind 초 방패를 세웠다가 그 사람 쪽으로 charge.time 초 달린다. 길에 닿은 사람은 dmg × charge.mul 에 밀려난다.
   철벽 자세: 체력이 wall.at 몫 아래로 내려갈 때마다 wall.dur 초 동안 받는 피해가 wall.cut 만큼 준다(다른 기술을 쓰면서도 유지). */
export const GRAMOR = {
  rad: 34, size: 2.1, walk: 150, punchCd: 1.3,
  slam: { range: 230, wind: 1.0, r: 240, mul: 1.8, cd: 7, rest: 0.8 },
  charge: { min: 260, wind: 0.7, speed: 640, time: 0.6, width: 70, mul: 1.5, push: 140, cd: 10, rest: 0.9 },
  wall: { at: [0.75, 0.5, 0.25], dur: 5, cut: 0.7 },
};
