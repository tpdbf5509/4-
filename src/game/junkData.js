/* ── RPG 잡동산이 상점 — 가방 넓히기 · 보스 재료 사고팔기. 숫자는 이 파일 한 곳에서 고친다 ─────────────
   규칙은 shop.js(whyBagExpand · whyMatBuy · op bagx · mbuy), 창은 ShopPanel.jsx JunkShop.
   전용 서버의 거래 장부(server/src/ledger-trade.js)도 bagExtra 로 받는 칸을 센다 — 그래서 이 파일은 다른 파일을 부르지 않는다 */
export const JUNK = {
  step: 5,               // 한 번 넓힐 때 무기 · 방어구 칸이 각각 이만큼 는다
  // 넓히기 단계 — n 번째 값이 n 번째로 넓힐 때 내는 코인과 재료. 모두 넓히면 30 → 60칸
  // 재료는 사냥터 보스가 떨구는 것만 쓴다(강화석 · 던전 입장권 · 계몽의 눈은 쓰지 않는다)
  steps: [
    { coins: 5000, mats: { fur: 10 } },
    { coins: 15000, mats: { fang: 10, fur: 10 } },
    { coins: 40000, mats: { tusk: 10, fang: 10 } },
    { coins: 100000, mats: { hide: 10, tusk: 10 } },
    { coins: 250000, mats: { bone: 5, rot: 5, hide: 10 } },
    { coins: 500000, mats: { soul: 5, core: 5, mane: 5 } },
  ],
  // 재료 사기 — 사냥터 보스 재료만 판다. 값은 되파는 값(MATERIALS[].sell) × buyMul
  buy: ["fur", "fang", "tusk", "hide", "bone", "rot", "soul", "core", "mane", "silk"],
  buyMul: 6,             // 사는 값은 파는 값의 6배 — 보스를 잡는 편이 늘 싸도록
  buyDaily: 20,          // 하루(한국 자정 기준)에 살 수 있는 재료 수 — 모든 종류를 합쳐서. 수집 의뢰를 돈으로 몰아 깨지 못하게
};
// 이 가방이 넓힌 칸 수(무기 · 방어구 각각) — 넓힌 횟수는 가방의 bx
export const bagSteps = (bag) => Math.min(JUNK.steps.length, Math.max(0, Math.floor(Number(bag && bag.bx) || 0)));
export const bagExtra = (bag) => bagSteps(bag) * JUNK.step;
