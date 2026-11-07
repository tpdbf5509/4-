/* ── 테스트 모드(?test) — 주소에 ?test 가 있을 때만 켜진다 ─────────────────
   켜지면 RPG 는 테스트 전용 서버 방(testData.js TEST_SERVER)에 들어가고, 그 방은 저장하지 않는다(server/src/room.js).
   화면도 이 기기 기록(localStorage)을 고치지 않고, 계정 · 기록을 바꾸는 장부 요청은 보내기 전에 막는다(api.js ledger).
   방어전의 테스트 서버(방 코드 TEST · 비밀번호)와는 다른 것이다 */
export const TEST_MODE = (() => {
  try { return new URLSearchParams(location.search).has("test"); } catch { return false; }
})();

// 테스트 모드에서 막는 장부 함수 — 계정 만들기 · 지우기 · 저장 · 접속 표시 · 거래 · 길드 · 장터. 읽기(불러오기 · 순위)와 이어 하기는 그대로
export const TEST_BLOCK_RPC = new Set([
  "rpg_create", "rpg_delete", "rpg_save", "rpg_live", "rpg_unlive",
  "rpg_trade_open", "rpg_trade_action", "rpg_guild_action", "rpg_market",
]);
