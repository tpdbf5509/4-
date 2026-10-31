/* ── RPG 광장 장터 게시판 — 올려 두면 나중에 팔리는 칸 ─────────────
   1:1 거래(tradeData.js)와 따로 돈다. 수치는 여기 한 곳만 고친다 — 장부(server/src/ledger-market.js)도 이 값을 그대로 쓴다.
   대금은 판매자 기록을 바로 고치지 않고 보관함(market_box)에 쌓는다. 접속 중인 판매자의 10초 저장과 겹치지 않게 */
export const MARKET = {
  slots: 5,                     // 한 사람이 동시에 올려 둘 수 있는 물건 수
  hours: 48,                    // 올려 두는 기간 — 지나면 물건이 보관함으로 돌아온다
  fee: 0.05,                    // 판매 수수료 — 팔릴 때 값에서 떼고 없앤다(코인을 줄여 물가를 누른다)
  priceMin: 1,
  priceMax: 9999999999,         // 값 한도 — 1:1 거래 코인 칸(12자리)보다 작게
  stackMax: 999,                // 개수 물품 한 건에 올리는 최대 수
  pageMax: 120,                 // 목록 한 번에 보여 주는 수(새로 올린 차례)
  boxMax: 40,                   // 보관함에 쌓일 수 있는 건수 — 넘으면 새로 올리지 못한다
  rateMs: 1500,                 // 같은 사람이 이보다 자주 사고 · 올리면 잠깐 기다리게 한다
  // 광장 자리 — 분수 아래 · 오른쪽 의자(1100, 900) 왼편(rpg.js MAPS.plaza 의 npcs · blocks)
  npc: { x: 980, y: 900 },
  img: "market-board",          // public/assets/game/rpg/market-board.webp(128 × 128, 아래 가운데 기준). 없으면 코드 그림
};
// 수수료를 뗀 뒤 판매자가 받는 코인 — 1코인 아래는 버린다
export const marketNet = (price) => Math.max(0, price - Math.floor(price * MARKET.fee));
// 올릴 수 있는 물품 종류 — 1:1 거래와 같다(장착하지 않은 무기 · 방어구, 물약 · 재료 · 워프권 · 하락 방지권)
export const MARKET_KINDS = ["w", "a", "p", "m", "wp", "gd"];
