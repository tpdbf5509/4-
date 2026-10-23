/* 개인 거래 수치. DB의 supabase/trade.sql 제한과 함께 맞춘다. */
export const TRADE = {
  maxItems: 12,          // 한 번에 올릴 품목 수
  seconds: 180,         // 오래 열린 거래는 취소한다
  pollMs: 2000,         // 거래 창이 열렸을 때 DB 상태를 읽는 간격
  inboxMs: 10000,       // 신청 대기는 접속 표시와 같은 간격으로 읽는다
  lockMs: 15000,        // 연결이 끊긴 영웅의 화면 잠금을 풀기까지
};
export const trading = (h) => !!h?.tradeLocal || (!!h?.trade && h.trade.until > Date.now());
// 저장 잠금을 걸 수 있는 곳 — 거래는 광장만, 길드 동작(hall)은 길드 광장도
export const lockPlace = (map, hall = false) => map === 'plaza' || (hall && String(map).startsWith('guildhall-'));
