/* 오닉스 얻는 곳 규칙(11월 27일 사용자 기획) — 수치는 onyxData.js OX_DAILY · OX_RACE · OX_WB.
   일일 의뢰 · 레이스 우승 · 월드보스 모두 전용 서버(server 가 참)만 오닉스를 준다. 화면이 보낸 값은 보지 않는다.
   오늘 칸 bag.oxd 는 판정만 고친다 — 화면 저장(rpg_save)은 protectOx 가 장부 값으로 되돌린다 */
import { ONYX, OX_DAILY, OX_BONUS_BIT, OX_RACE, OX_WB, oxOf } from "./onyxData.js";

const KST = 9 * 3600e3;
export const oxToday = (now = Date.now()) => new Date(now + KST).toISOString().slice(0, 10);   // 한국 날짜 — 자정에 갈린다
const blank = (d) => ({ d, k: 0, b: 0, r: 0, q: 0, w: 0 });
// 보기용 — 날짜가 지났으면 빈 칸
export const oxDayView = (bag, day = oxToday()) => (bag && bag.oxd && bag.oxd.d === day ? bag.oxd : blank(day));
// 고치기용 — 날짜가 지났으면 새로 만든다
function oxDay(bag, day) {
  if (!bag.oxd || bag.oxd.d !== day) bag.oxd = blank(day);
  return bag.oxd;
}
// 오닉스를 더한다 — 넣은 수를 돌려준다
export function addOx(bag, n) {
  const have = oxOf(bag), put = Math.max(0, Math.min(Math.floor(n) || 0, ONYX.max - have));
  if (put) bag.ox = have + put;
  return put;
}

/* ── 일일 의뢰 ─────────────────────────────────── */
// 몹 · 보스 · 의뢰를 하나 센다(key: k · b · r)
export function oxCount(bag, key, day = oxToday()) {
  if (!bag || !["k", "b", "r"].includes(key)) return;
  const o = oxDay(bag, day);
  o[key] = Math.min(1e6, o[key] + 1);
}
// 칸 i(0~2) 또는 보너스(i === 3)를 받을 수 없는 까닭 — 빈 글이면 받을 수 있다. 화면 단추도 같은 함수를 본다
export function whyOxDaily(bag, i, day = oxToday()) {
  const o = oxDayView(bag, day), T = OX_DAILY.tasks;
  if (i === T.length) {
    if (o.q & OX_BONUS_BIT) return "오늘 이미 받았습니다";
    return T.every((_, j) => o.q & (1 << j)) ? "" : "세 의뢰를 모두 받으면 열립니다";
  }
  const t = T[i];
  if (!t) return "없는 의뢰입니다";
  if (o.q & (1 << i)) return "오늘 이미 받았습니다";
  return o[t.id] >= t.need ? "" : `${t.need - o[t.id]}번 남았습니다`;
}
// 받기 — { ok, n, msg }
export function claimOxDaily(bag, i, server, day = oxToday()) {
  if (!server) return { ok: false, msg: `${ONYX.name}는 전용 서버에서만 받을 수 있습니다` };
  i = Math.floor(Number(i));
  const why = whyOxDaily(bag, i, day);
  if (why) return { ok: false, msg: why };
  const o = oxDay(bag, day), bonus = i === OX_DAILY.tasks.length;
  o.q |= bonus ? OX_BONUS_BIT : 1 << i;
  const n = addOx(bag, bonus ? OX_DAILY.bonus : OX_DAILY.tasks[i].ox);
  return { ok: true, n, msg: `${bonus ? "일일 의뢰 모두 완료" : `일일 의뢰 「${OX_DAILY.tasks[i].name}」`} — ${ONYX.name} ${n}개를 받았습니다` };
}

/* ── 몹 레이스 ─────────────────────────────────── */
// 끝까지 들어온 사람 수 — 서버가 알려 준 접속 열쇠(계정이 있는 캐릭터의 인터넷 주소)가 다른 사람만 센다.
// 열쇠가 없는 사람(계정 없는 캐릭터 · 방장 브라우저 방식)은 세지 않는다
export function raceHeads(finishers, keyOf) {
  return new Set(finishers.map(keyOf).filter(Boolean)).size;
}
export const raceOnyx = (heads) => OX_RACE.win[Math.min(heads, OX_RACE.win.length - 1)] || 0;

/* ── 월드보스 ──────────────────────────────────── */
export function rollWbOnyx(rng = Math.random) {
  if (rng() >= OX_WB.chance) return 0;
  const [lo, hi] = OX_WB.n;
  return lo + Math.floor(rng() * (hi - lo + 1));
}
// 하루 최대(OX_WB.dayMax) 안에서만 준다 — 준 수
export function giveWbOnyx(bag, n, day = oxToday()) {
  const o = oxDay(bag, day), put = Math.min(Math.max(0, n), OX_WB.dayMax - o.w);
  if (put <= 0) return 0;
  const got = addOx(bag, put);
  o.w += got;
  return got;
}
