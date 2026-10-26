/* ── RPG 400~800레벨 사냥터 · 계몽의 문 — 수치는 모두 여기 한 곳 ─────────────────────────────
   10월 26일 사용자 요청. 50레벨씩 8구역 — 화염(불정령 · 용암골렘 · 화염룡 · 이프리트) · 심연(망령기사 · 심해괴수 · 공허술사 · 타락천사).
   광장 왼쪽 풀밭의 계몽의 문에서 재료를 모아 계몽의 눈을 만들고(한 번 만들면 계속 남는 열쇠), 400레벨부터 그 문으로 들어간다.
   규칙은 rpg.js(MOB · BRUTE · FAR_SKILL · SPAWNS 에 이어 붙이고 rpgDeep 이 만들기 · 입장), 그림은 rpgArt.js · skillArt.js, 창은 DeepPanel.jsx.
   맵 · 몹 · 칭호 · 잡은 수 차례는 스냅샷에 쓰니 뒤에만 더한다 */

export const DEEP = {
  lv: 400,                                   // 들어갈 수 있는 레벨
  door: { x: 115, y: 980, r: 60 },           // 광장 왼쪽 풀밭(스킬 상점 아래 · 무기 강화소 왼쪽)의 계몽의 문
  reach: 120,                                // 이만큼 가까우면 문 창을 연다
  eye: "eye_enlight",                        // 계몽의 눈 — 가방 재료 칸(bag.m)에 한 개. 들어갈 때 쓰지 않는다
  // 계몽의 눈 재료 — [재료 id, 개수]. 만들 때 가방에서 뺀다
  recipe: [["silk", 10], ["heart", 20], ["mane", 25], ["core", 25], ["soul", 15], ["hide", 20]],
  exitAt: [205, 980],                        // 사냥터 첫 맵 왼쪽 문으로 나오면 광장의 이 자리(문 오른쪽)
  img: "/assets/game/rpg/items/eye-enlight.webp",
};
/* 계몽의 문 그림(rpg/deep-door.webp, Codex 생성 · 원본 design/deep/deep-door.webp) — h 맵에서 그리는 높이 · foot 그림 위에서 발판 가운데까지의 몫 ·
   portal 문 안쪽 빛의 가운데(그림 폭 · 높이에 대한 몫)와 반지름 몫. 못 불러오면 돌 아치(guildArt.js drawArchDoor)로 그린다 */
export const DEEP_DOOR_ART = { src: "/assets/game/rpg/deep-door.webp", h: 275, foot: 0.9, portal: [0.5, 0.56, 0.2] };

/* 체력은 아래 표의 값 그대로(곱하는 배율 없음). 10월 26일 사용자 요청 — "만렙 올 스탯이 800레벨 몹을 평타 2번 안에 · 600레벨은 한 방에".
   관리자(800레벨 · 스탯 모두 800 · 전설 무기 +30) 평타 한 대는 치명타(80%)면 검사 약 14.5만 · 궁수 19만 · 마법사 19.7만, 아니면 1만 남짓이다.
   치명타 한 번 + 아무 평타 한 번(검사 15.5만)이면 잡히게 800레벨을 15만, 600레벨을 13만(치명타 한 방)으로 두고 400레벨 11만에서 곧게 잇는다.
   200~400 사냥터도 이 높이로 이어지게 줄였다(rpg.js MOB_HP_EASE · FAR_TAPER).
   예전 값(처음 표 × 0.7 × 0.85)은 불정령 22.6만~타락천사 82.1만 · 보스 369만~1,190만이었다. 보스는 구역마다 예전과 같은 비율로 줄였다 */

/* 사냥터 8곳 — lv [시작, 끝], w 맵 폭, tint 바탕 빛깔.
   mob: hp 는 [시작 레벨 값, 끝 레벨 값] 그대로 · dmg 는 FAR_EASE.dmg 를 곱하기 전, xp · coin 은 레벨에 곱하는 배수,
   size [시작, 끝], rad 몸 반지름. boss 는 그 구역 보스(hp 는 그대로, dmg 는 FAR_EASE.dmg 를 곱하기 전). drop 은 보스가 떨구는 재료 id */
export const DEEP_MAPS = [
  { id: "fspirit", name: "불정령의 화원", lv: [400, 450], w: 6200, tint: "rgba(120,46,20,0.36)",
    mob: { name: "불정령", rad: 22, hp: [110000, 115000], dmg: [2450, 2850], xp: 7.5, coin: 3.4, size: [1.15, 1.27] },
    boss: { name: "불정령 군주", lv: 440, hp: 1790000, dmg: 3300, xp: 60000, coin: 42000, size: 1.95 }, drop: "ember" },
  { id: "lavagolem", name: "용암 분지", lv: [450, 500], w: 6200, tint: "rgba(110,40,18,0.42)",
    mob: { name: "용암골렘", rad: 32, hp: [115000, 120000], dmg: [2850, 3300], xp: 8, coin: 3.6, size: [1.55, 1.67] },
    boss: { name: "용암 거신", lv: 490, hp: 1840000, dmg: 3800, xp: 72000, coin: 50000, size: 1.95 }, drop: "magma" },
  { id: "firedrake", name: "화염룡의 둥지", lv: [500, 550], w: 6400, tint: "rgba(130,52,28,0.4)",
    mob: { name: "화염룡", rad: 30, hp: [120000, 125000], dmg: [3300, 3800], xp: 8.5, coin: 3.8, size: [1.4, 1.52] },
    boss: { name: "화염룡 왕", lv: 540, hp: 1890000, dmg: 4400, xp: 86000, coin: 60000, size: 1.95 }, drop: "dscale" },
  { id: "ifrit", name: "이프리트의 제단", lv: [550, 600], w: 6400, tint: "rgba(140,60,22,0.38)",
    mob: { name: "이프리트", rad: 26, hp: [125000, 130000], dmg: [3800, 4350], xp: 9, coin: 4, size: [1.3, 1.42] },
    boss: { name: "이프리트 대군주", lv: 590, hp: 1990000, dmg: 5000, xp: 100000, coin: 70000, size: 1.95 }, drop: "ifflame" },
  { id: "wraith", name: "망령의 성채", lv: [600, 650], w: 6600, tint: "rgba(30,36,60,0.5)",
    mob: { name: "망령기사", rad: 24, hp: [130000, 135000], dmg: [4350, 4950], xp: 9.5, coin: 4.2, size: [1.25, 1.37] },
    boss: { name: "망령 기사단장", lv: 640, hp: 2080000, dmg: 5700, xp: 118000, coin: 82000, size: 1.95 }, drop: "wplate" },
  { id: "abyss", name: "심해 해구", lv: [650, 700], w: 6600, tint: "rgba(14,40,70,0.52)",
    mob: { name: "심해괴수", rad: 30, hp: [135000, 140000], dmg: [4950, 5600], xp: 10, coin: 4.4, size: [1.4, 1.52] },
    boss: { name: "심연의 레비아탄", lv: 690, hp: 2180000, dmg: 6400, xp: 136000, coin: 94000, size: 1.95 }, drop: "pearl" },
  { id: "voidmage", name: "공허의 서고", lv: [700, 750], w: 6800, tint: "rgba(30,16,52,0.54)",
    mob: { name: "공허술사", rad: 22, hp: [140000, 145000], dmg: [5600, 6300], xp: 10.5, coin: 4.6, size: [1.15, 1.27] },
    boss: { name: "공허의 대현자", lv: 740, hp: 2290000, dmg: 7200, xp: 156000, coin: 108000, size: 1.95 }, drop: "voidc" },
  { id: "fallen", name: "타락한 천궁", lv: [750, 800], w: 7000, tint: "rgba(48,30,48,0.48)",
    mob: { name: "타락천사", rad: 24, hp: [145000, 150000], dmg: [6300, 7050], xp: 11, coin: 4.8, size: [1.25, 1.37] },
    boss: { name: "타락천사장", lv: 790, hp: 2380000, dmg: 8000, xp: 178000, coin: 124000, size: 1.95 }, drop: "dfeather" },
];

// 무리 — 맵마다 일반 n · 보스 2 · 다시 나오는 초(respawn)
export const DEEP_SPAWN = { n: 22, respawn: 4.5, bossN: 2, bossRespawn: 30 };

// 움직임 — 값의 뜻은 rpg.js GOBLIN · ORC · OGRE 와 같다(stepBrute)
export const DEEP_BRUTE = {
  fspirit: { aggro: 520, walk: 230, punchCd: 0.85, slamRange: 0, call: 320, leash: 1400 },
  lavagolem: { aggro: 420, walk: 125, punchCd: 1.5, slamRange: 0, call: 260, leash: 1300 },
  firedrake: { aggro: 540, walk: 220, punchCd: 1, slamRange: 0, call: 300, leash: 1400 },
  ifrit: { aggro: 540, walk: 200, punchCd: 1, slamRange: 0, call: 300, leash: 1400 },
  wraith: { aggro: 500, walk: 210, punchCd: 0.9, slamRange: 0, call: 320, leash: 1400 },
  abyss: { aggro: 460, walk: 150, punchCd: 1.3, slamRange: 0, call: 280, leash: 1400 },
  voidmage: { aggro: 560, walk: 185, punchCd: 1.1, slamRange: 0, call: 300, leash: 1500 },
  fallen: { aggro: 580, walk: 245, punchCd: 0.8, slamRange: 0, call: 360, leash: 1600 },
};

/* 고유 기술 — 뜻은 rpg.js FAR_SKILL 과 같다(kind 가 맞는 셈 · 피하는 법을 정한다). style 은 날아가는 것 · 바닥 그림, color 는 빛깔.
   피해 배율은 포식거미 · 키메라와 비슷하게, 상태이상은 짧게 */
export const DEEP_SKILL = {
  // 불정령 — 불덩이를 던진다. 떨어진 자리를 비키면 된다(보스는 셋)
  fspirit: { kind: "bone", style: "fire", color: "#ffb070", range: 380, min: 100, wind: 0.5, cd: 4.5, mul: 0.9, r: 56, speed: 600, n: 1, nBoss: 3, spread: 0.3 },
  // 용암골렘 — 용암 덩이를 높이 던진다. 맞으면 1.5초 30% 느려진다
  lavagolem: { kind: "bile", style: "lava", color: "#ff8a4a", range: 320, wind: 0.8, cd: 5, mul: 1.4, r: 100, fly: 0.85, slow: 1.5, slowAmt: 0.3 },
  // 화염룡 — 넓은 불꽃 숨결. 옆으로 비키면 된다
  firedrake: { kind: "breath", color: "#ff9a5a", range: 300, wind: 0.8, cd: 4, mul: 1.5, len: 320, arc: 0.6 },
  // 이프리트 — 노린 사람 발밑에 불기둥 문양, 0.9초 뒤 솟는다(보스는 셋)
  ifrit: { kind: "curse", style: "pillar", color: "#ffa040", range: 400, wind: 0.5, cd: 4, mul: 1.6, r: 82, delay: 0.9, n: 1, nBoss: 3 },
  // 망령기사 — 앞으로 곧게 망령의 검기. 맞으면 조금 밀려난다
  wraith: { kind: "quake", style: "spectral", color: "#9fb8e8", range: 300, wind: 0.75, cd: 4.5, mul: 1.6, len: 400, w: 70, kb: 100 },
  // 심해괴수 — 물덩이를 뱉는다. 맞으면 1.5초 35% 느려진다
  abyss: { kind: "bile", style: "water", color: "#6ab6e8", range: 340, wind: 0.6, cd: 4.5, mul: 1.4, r: 105, fly: 0.75, slow: 1.5, slowAmt: 0.35 },
  // 공허술사 — 발밑에 공허 문양, 1초 뒤 터진다(보스는 셋)
  voidmage: { kind: "curse", style: "void", color: "#9a7ae8", range: 420, wind: 0.5, cd: 3.8, mul: 1.7, r: 86, delay: 1, n: 1, nBoss: 3 },
  // 타락천사 — 검은 깃털을 부채꼴로 셋(보스 다섯) 날린다. 맞으면 0.8초 묶인다
  fallen: { kind: "web", style: "feather", color: "#c8a0d8", range: 440, wind: 0.5, cd: 3.8, mul: 0.75, r: 60, speed: 760, root: 0.8, rootBoss: 1.1, n: 3, nBoss: 5, spread: 0.26 },
};

// 보스 재료 — itemData.js MATERIALS 뒤에 붙는다(되팔기 값)
export const DEEP_MATS = [
  { id: "ember", name: "불씨 정수", color: "#ffb070", sell: 4500, note: "불정령 군주가 떨군다" },
  { id: "magma", name: "용암 심장", color: "#e0683a", sell: 5500, note: "용암 거신이 떨군다" },
  { id: "dscale", name: "화염룡 비늘", color: "#d8704a", sell: 6500, note: "화염룡 왕이 떨군다" },
  { id: "ifflame", name: "이프리트의 불꽃", color: "#ffa040", sell: 7500, note: "이프리트 대군주가 떨군다" },
  { id: "wplate", name: "망령 갑주 조각", color: "#9fb8e8", sell: 8500, note: "망령 기사단장이 떨군다" },
  { id: "pearl", name: "심해 진주", color: "#a8d8f0", sell: 9500, note: "심연의 레비아탄이 떨군다" },
  { id: "voidc", name: "공허 결정", color: "#9a7ae8", sell: 11000, note: "공허의 대현자가 떨군다" },
  { id: "dfeather", name: "타락한 깃털", color: "#c8a0d8", sell: 12500, note: "타락천사장이 떨군다" },
];
// 계몽의 눈 — 재료 칸의 열쇠. 되팔 수 없다
export const EYE_MAT = { id: "eye_enlight", name: "계몽의 눈", color: "#c9a8f0", sell: 0, key: true, img: DEEP.img, note: "계몽의 문에서 만든다 · 400레벨부터 400~800레벨 사냥터에 들어간다" };
