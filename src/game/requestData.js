/* ── RPG 광장 의뢰 — NPC 와 의뢰 목록은 이 파일 한 곳에서 고친다 ─────────────
   규칙은 rpg.js(rpgRequest), 창은 src/RpgView.jsx 에 있다.
   NPC 마다 의뢰 하나를 맡을 수 있다. lv 이상이면 받을 수 있고, 받을 수 있는 것 가운데 레벨이 높은 REQ_SHOW 개가 보인다.
   hunt — mob 을 n 마리 잡기(받은 뒤부터 센다. 보스도 센다) · collect — 재료 mat 를 n 개 가져가기(완료할 때 가방에서 빠진다).
   재료는 보스만 떨군다(itemData.js DROPS) — 보스 한 마리에 3개라 collect 수는 보스 두세 마리 몫으로 둔다.
   보상: coin 코인 · xp 는 그때 레벨의 필요 경험치에 곱하는 몫(몹 경험치 배율과 상관없다) · mats 재료.
   끝낸 의뢰는 다시 받을 수 있다. 목록의 차례는 저장 · 스냅샷에 쓰니 뒤에만 더한다 */
export const REQ_NPCS = [
  { id: "guard", name: "경비대장 한결", x: 1360, y: 560, color: "#7f93b0", line: "사냥터의 몹이 너무 많아. 좀 줄여 주게." },
  { id: "collector", name: "수집가 보리", x: 1030, y: 1080, color: "#b49a6e", line: "보스가 떨군 재료라면 값을 쳐 드리지요." },
  { id: "alchemist", name: "연금술사 미나", x: 470, y: 560, color: "#9a86b8", line: "재료를 가져오면 강화석으로 바꿔 줄게요." },
];
export const REQ_BY_NPC = Object.fromEntries(REQ_NPCS.map((n) => [n.id, n]));

export const REQUESTS = {
  guard: [
    { lv: 1, kind: "hunt", mob: "rabbit", n: 20, coin: 60, xp: 0.5 },
    { lv: 10, kind: "hunt", mob: "wolf", n: 20, coin: 220, xp: 0.4 },
    { lv: 20, kind: "hunt", mob: "boar", n: 20, coin: 550, xp: 0.35 },
    { lv: 50, kind: "hunt", mob: "gorilla", n: 15, coin: 1300, xp: 0.3 },
    { lv: 100, kind: "hunt", mob: "goblin", n: 15, coin: 2600, xp: 0.3, mats: { blue: 1 } },
    { lv: 130, kind: "hunt", mob: "orc", n: 15, coin: 4200, xp: 0.25, mats: { eye: 1 } },
    { lv: 160, kind: "hunt", mob: "ogre", n: 10, coin: 6500, xp: 0.25, mats: { heart: 1 } },
  ],
  collector: [
    { lv: 1, kind: "collect", mat: "fur", n: 6, coin: 300, xp: 0.5 },
    { lv: 10, kind: "collect", mat: "fang", n: 6, coin: 900, xp: 0.4 },
    { lv: 20, kind: "collect", mat: "tusk", n: 6, coin: 2200, xp: 0.35 },
    { lv: 50, kind: "collect", mat: "hide", n: 6, coin: 4500, xp: 0.3 },
  ],
  alchemist: [
    { lv: 30, kind: "collect", mat: "tusk", n: 9, coin: 0, xp: 0.1, mats: { blue: 1 } },
    { lv: 60, kind: "collect", mat: "hide", n: 6, coin: 0, xp: 0.1, mats: { blue: 1 } },
    { lv: 100, kind: "collect", mat: "blue", n: 4, coin: 0, xp: 0.1, mats: { eye: 1 } },
    { lv: 130, kind: "collect", mat: "eye", n: 4, coin: 0, xp: 0.1, mats: { heart: 1 } },
  ],
};
export const REQ_SHOW = 3;    // NPC 창에 보이는 의뢰 수(받을 수 있는 것 가운데 높은 레벨부터)
