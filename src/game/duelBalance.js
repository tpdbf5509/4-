/* 결투장 전용 수치. 사냥터 PvP와 PvE는 기존 수치를 쓴다. */
export const DUEL = {
  dmgMul: 0.03, basicPct: 0.04, skillPct: 0.18, ultPct: 0.25, // 약한 공격은 그대로 두고 강한 공격은 시전별로 제한한다
  healMul: 0.5, shieldMul: 0.6,                              // 회복·보호막은 생성할 때 한 번만 줄인다
  calm: 7, calmRegen: 0.01,                                 // 피해 없이 7초 뒤 초당 최대 체력의 1% 회복
  ready: 3, time: 90, end: 2.5, reqT: 30, honorRate: 0.1, honorBase: 10,
  askGap: 5, reaskGap: 20,                                  // 결투 신청 간격 — 아무에게나 5초에 한 번 · 같은 사람에게는 20초에 한 번(11월 7일 반복 신청으로 렉)
};
export const inDuel = h => h?.map === 'arena' && h.dvs >= 0;
export const duelHealing = (h, amount) => amount * (inDuel(h) ? DUEL.healMul : 1);
export const duelShield = (h, amount) => amount * (inDuel(h) ? DUEL.shieldMul : 1);
// 지연 타격도 예약할 때의 시전을 쓴다. 현재 시전은 판정 뒤 되돌린다.
export function withCast(h, cast, fn) {
  const previous = h.cast;
  h.cast = cast;
  try { return fn(); } finally { h.cast = previous; }
}
// 직렬화로 나뉜 같은 시전의 참조를 스냅샷 복원 때 다시 잇는다.
let castSequence = 0;
const castEpoch = Date.now().toString(36);
export const makeCast = () => ({ raw: 0, id: `${castEpoch}:${++castSequence}` });
export function restoreCasts(value, seen = new Map()) {
  if (!value || typeof value !== 'object') return value;
  if (value.id && value.raw !== undefined) {
    if (seen.has(value.id)) return seen.get(value.id);
    seen.set(value.id, value);
  }
  for (const key of Object.keys(value)) value[key] = restoreCasts(value[key], seen);
  return value;
}
