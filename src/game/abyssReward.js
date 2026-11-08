/* ── 심연의 탑 보상 규칙(11월 9일 개편) — 수치는 abyssData.js 한 곳 ─────────────
   교환 횟수 · 상자 · 생애 최초 돌파 보상 · 주간 순위 보상 · 외형을 다룬다.
   판정은 전용 서버(rpg.js rpgAbyss)와 장부(server/src/ledger.js fn_rpg_abyss_claim)가 하고, 화면은 같은 함수로 막힌 이유만 보여 준다.
   함수는 "주인" o = { bag, rec, coins } 하나를 받는다 — 영웅(h)이든 저장 기록(data)이든 모양이 같다.
   셈 차례: 조건 검사 → 넣을 자리 확인(확률 상자는 나올 수 있는 모든 몫) → 확률 결과 → 값 빼기 · 보상 넣기 → 횟수 · 이력 → 결과 기록.
   검사에서 하나라도 막히면 아무것도 바꾸지 않는다.

   가방 bag.ab — {
     b  교환 횟수 { 물품 id: [하루 날짜, 그날 횟수, 주(월요일), 그 주 횟수, 평생 횟수] }
     fc 받은 최초 돌파 보상(ABYSS_FIRST 차례 비트) · bx 상자 보관함 { 상자 id: 회분 }
     own 가진 영구 외형(ABYSS_LOOKS 차례 비트) · eq 낀 외형(같은 비트) · sh 시즌 후광을 낄 수 있는 마지막 때(ms)
     cw 새 표로 받은 주간 보상의 주(최근 8개) · q 처리한 요청 id(최근 20개 — 다시 온 같은 요청은 한 번만)
     n 결과 차례 · lr 마지막 결과 { n, id, k, give, at } — 탑 창이 같은 창 안에 보여 준다 } */
import { ABYSS_SHOP_BY_ID, ABYSS_BOXES, BOX_IDS, ABYSS_BOX_MAX, ABYSS_LOOKS, LOOK_BY_ID, ABYSS_FIRST, SHARD, SEAL,
  costsOf, abyssDay, abyssWeek, weekReset, rankReward, cleanAw, rollAw } from "./abyssData.js";
import { MAT_BY_ID, matMax } from "./itemData.js";

export const COIN_MAX = 999999999999;            // 코인 한도 — 1:1 거래 장부의 코인 칸(12자리)과 같다
const RID = /^[A-Za-z0-9_-]{4,24}$/;             // 요청 id 모양(화면 newRid)
const KEEP_Q = 20, KEEP_CW = 8;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const int = (v, max) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
const day10 = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

/* ── 가방 기록 ─────────────────────────────────────── */
function cleanGive(v) {
  if (!isObj(v)) return {};
  const o = {};
  if (isObj(v.m)) { const m = {}; Object.keys(v.m).forEach((id) => { if (MAT_BY_ID[id]) m[id] = int(v.m[id], 1e6); }); o.m = m; }
  if (v.coins) o.coins = int(v.coins, COIN_MAX);
  if (isObj(v.bx)) { const bx = {}; Object.keys(v.bx).forEach((id) => { if (ABYSS_BOXES[id]) bx[id] = int(v.bx[id], ABYSS_BOX_MAX); }); o.bx = bx; }
  if (typeof v.look === "string" && LOOK_BY_ID[v.look]) o.look = v.look;
  if (typeof v.rec === "string" && v.rec.length <= 12) o.rec = v.rec;
  if (v.guard) o.guard = int(v.guard, 99);
  return o;
}
export function cleanAb(d) {
  const o = isObj(d) ? d : {};
  const b = {};
  if (isObj(o.b)) Object.keys(o.b).forEach((id) => {
    const r = o.b[id];
    if (!ABYSS_SHOP_BY_ID[id] || !Array.isArray(r)) return;
    b[id] = [day10(r[0]), int(r[1], 999), day10(r[2]), int(r[3], 999), int(r[4], 99999)];
  });
  const bx = {};
  if (isObj(o.bx)) BOX_IDS.forEach((id) => { const n = int(o.bx[id], ABYSS_BOX_MAX); if (n) bx[id] = n; });
  const all = (1 << ABYSS_LOOKS.length) - 1;
  const lr = isObj(o.lr) ? { n: int(o.lr.n, 1e9), id: String(o.lr.id || "").slice(0, 32), k: String(o.lr.k || "").slice(0, 8), give: cleanGive(o.lr.give), at: int(o.lr.at, 1e15) } : null;
  return {
    b, fc: int(o.fc, (1 << ABYSS_FIRST.length) - 1), bx, own: int(o.own, all) & all, eq: int(o.eq, all) & all, sh: int(o.sh, 1e15),
    cw: Array.isArray(o.cw) ? [...new Set(o.cw.map(day10).filter(Boolean))].slice(-KEEP_CW) : [],
    q: Array.isArray(o.q) ? o.q.filter((x) => typeof x === "string" && RID.test(x)).slice(-KEEP_Q) : [],
    n: int(o.n, 1e9), ...(lr ? { lr } : {}),
  };
}
// 가방의 보상 기록 — 없으면 만든다
export function abOf(bag) {
  if (!bag.ab || !Array.isArray(bag.ab.q)) bag.ab = cleanAb(bag.ab);
  return bag.ab;
}
// 같은 요청 id 를 이미 처리했나(망이 끊겨 다시 보낸 요청은 한 번만)
export const ridSeen = (bag, rid) => !!(rid && bag && bag.ab && Array.isArray(bag.ab.q) && bag.ab.q.includes(String(rid)));
export const ridOk = (rid) => rid === undefined || rid === null || rid === "" || RID.test(String(rid));
function ridMark(ab, rid) {
  if (!rid || !RID.test(String(rid))) return;
  ab.q.push(String(rid));
  if (ab.q.length > KEEP_Q) ab.q.splice(0, ab.q.length - KEEP_Q);
}

/* ── 교환 횟수 — 하루는 한국 0시, 주는 한국 월요일 0시에 갈린다. 평생은 갈리지 않는다 ── */
export function buyCount(ab, id, now) {
  const r = (ab && ab.b && ab.b[id]) || ["", 0, "", 0, 0];
  return { day: r[0] === abyssDay(now) ? r[1] : 0, week: r[2] === abyssWeek(now) ? r[3] : 0, life: r[4] || 0 };
}
// 남은 횟수 — 제한이 없으면 Infinity. 여러 제한이 있으면 가장 적은 것
export function buyLeft(it, ab, now) {
  const L = (it && it.limit) || {}, c = buyCount(ab, it && it.id, now);
  let left = Infinity;
  if (L.day) left = Math.min(left, L.day - c.day);
  if (L.week) left = Math.min(left, L.week - c.week);
  if (L.life) left = Math.min(left, L.life - c.life);
  return Math.max(0, left);
}
export const limitText = (it) => { const L = it.limit || {}; return L.day ? `하루 ${L.day}회` : L.week ? `주 ${L.week}회` : L.life ? "캐릭터당 1회" : ""; };
function countBuy(ab, id, now) {
  const d = abyssDay(now), w = abyssWeek(now), c = buyCount(ab, id, now);
  ab.b[id] = [d, c.day + 1, w, c.week + 1, c.life + 1];
}

/* ── 보상 한 몫 — 넣을 자리 · 넣기 · 글 ─────────────────────── */
const have = (o, id) => (o.bag && o.bag.m && o.bag.m[id]) || 0;
// 넣을 수 있는가 — 막히면 이유 글, 되면 ""
export function giveRoom(o, give) {
  const g = give || {}, ab = o.bag && o.bag.ab ? o.bag.ab : cleanAb(null);
  for (const [id, n] of Object.entries(g.m || {})) {
    if (!MAT_BY_ID[id]) return "없는 재료입니다";
    if (have(o, id) + n > matMax(id)) return `${MAT_BY_ID[id].name}을 더 가질 수 없습니다(최대 ${matMax(id).toLocaleString("ko-KR")}개)`;
  }
  if (g.coins && (Number(o.coins) || 0) + g.coins > COIN_MAX) return "코인을 더 가질 수 없습니다";
  for (const [id, n] of Object.entries(g.bx || {})) if (((ab.bx && ab.bx[id]) || 0) + n > ABYSS_BOX_MAX) return `${ABYSS_BOXES[id].name}을 보관함에 더 둘 수 없습니다(최대 ${ABYSS_BOX_MAX}회분)`;
  if (g.look && !LOOK_BY_ID[g.look].season && (ab.own & (1 << LOOK_BY_ID[g.look].i))) return "이미 가진 외형입니다";
  if (g.rec && ((o.rec && o.rec[g.rec]) || 0) > 0) return "이미 받은 칭호입니다";
  return "";
}
// 넣는다 — giveRoom 을 먼저 본 뒤에만 부른다
function giveTo(o, give) {
  const g = give || {}, bag = o.bag, ab = abOf(bag);
  if (!isObj(bag.m)) bag.m = {};
  for (const [id, n] of Object.entries(g.m || {})) if (n > 0) bag.m[id] = have(o, id) + n;
  if (g.coins) o.coins = (Number(o.coins) || 0) + g.coins;
  for (const [id, n] of Object.entries(g.bx || {})) if (n > 0) ab.bx[id] = (ab.bx[id] || 0) + n;
  if (g.look && !LOOK_BY_ID[g.look].season) ab.own |= 1 << LOOK_BY_ID[g.look].i;
  if (g.rec) { if (!isObj(o.rec)) o.rec = {}; o.rec[g.rec] = 1; }   // 칭호는 칭호 규칙(awardTitles)이 곧 준다
  bag.v = (Number(bag.v) || 0) + 1;
}
const won = (n) => Number(n || 0).toLocaleString("ko-KR");
export function giveText(give) {
  const g = give || {}, out = [];
  Object.entries(g.m || {}).forEach(([id, n]) => { if (n) out.push(`${MAT_BY_ID[id] ? MAT_BY_ID[id].name : id} ${won(n)}개`); });
  if (g.coins) out.push(`${won(g.coins)}코인`);
  Object.entries(g.bx || {}).forEach(([id, n]) => { if (n) out.push(`${ABYSS_BOXES[id] ? ABYSS_BOXES[id].name : id} ${n}회분`); });
  if (g.look) out.push(`외형 「${LOOK_BY_ID[g.look].name}」`);
  if (g.guard) out.push(`하락 방지권 ${g.guard}장`);
  return out.join(" · ");
}
function setResult(ab, id, k, give, now) {
  ab.n += 1;
  ab.lr = { n: ab.n, id, k, give: cleanGive(give), at: now };
}

/* ── 상자 ─────────────────────────────────────────── */
// 상자에서 나올 수 있는 몫 모두 — 확률 상자는 모든 몫이 들어갈 자리가 있어야 연다(뽑은 뒤에 막히지 않게)
export function boxOutcomes(id, pick) {
  const B = ABYSS_BOXES[id];
  if (!B) return [];
  if (B.pick) return Number.isInteger(pick) && B.pick[pick] ? [B.pick[pick]] : [];
  if (B.roll) return B.roll.map(({ m, coins }) => ({ m, ...(coins ? { coins } : {}) }));
  return [B.give];
}
// 확률 상자의 몫 하나 — rng 는 0 이상 1 미만(서버의 Math.random)
export function boxRoll(id, pick, rng = Math.random) {
  const B = ABYSS_BOXES[id];
  if (B.pick) return B.pick[pick];
  if (!B.roll) return B.give;
  const total = B.roll.reduce((n, x) => n + x.w, 0);
  let r = rng() * total;
  for (const x of B.roll) { r -= x.w; if (r < 0) return { m: x.m, ...(x.coins ? { coins: x.coins } : {}) }; }
  const x = B.roll[B.roll.length - 1];
  return { m: x.m, ...(x.coins ? { coins: x.coins } : {}) };
}
function boxWhy(o, id, pick) {
  const B = ABYSS_BOXES[id];
  if (!B) return "없는 상자입니다";
  if (B.pick && !(Number.isInteger(pick) && B.pick[pick])) return "받을 보상을 골라 주세요";
  for (const x of boxOutcomes(id, pick)) { const w = giveRoom(o, x); if (w) return w; }
  return "";
}

/* ── 교환 ─────────────────────────────────────────── */
// 새 여덟(v2) 교환이 막힌 이유(없으면 "") — 화면과 서버가 같이 쓴다. 예전 넷은 rpg.js whyAbyssBuy 가 본다
export function whyV2Buy(o, id, now, pick) {
  const it = ABYSS_SHOP_BY_ID[id];
  if (!it || !it.v2) return "없는 물품입니다";
  if (!o || !o.bag) return "기록을 불러오는 중입니다";
  const ab = o.bag.ab || cleanAb(null);
  if (it.look && (ab.own & (1 << LOOK_BY_ID[it.look].i))) return "이미 가진 외형입니다";
  if (it.title && ((o.rec && o.rec[it.title]) || 0) > 0) return "이미 받은 칭호입니다";
  if (buyLeft(it, ab, now) <= 0) return it.limit.day ? "오늘은 더 교환할 수 없습니다" : it.limit.week ? "이번 주는 더 교환할 수 없습니다" : "이미 교환했습니다";
  for (const [mat, n] of costsOf(it)) if (have(o, mat) < n) return `${MAT_BY_ID[mat].name}이 모자랍니다`;
  if (it.box) return boxWhy(o, it.box, pick);
  if (it.look) return giveRoom(o, { look: it.look });
  if (it.title) return giveRoom(o, { rec: it.title });
  return "";
}
// 새 여덟 교환 — 검사 → 확률 → 값 빼기 · 넣기 → 횟수 · 결과. { ok, give, err }
export function v2Buy(o, id, now, pick, rng = Math.random) {
  const why = whyV2Buy(o, id, now, pick);
  if (why) return { ok: false, err: why };
  const it = ABYSS_SHOP_BY_ID[id], ab = abOf(o.bag);
  const give = it.box ? boxRoll(it.box, pick, rng) : it.look ? { look: it.look } : { rec: it.title };
  for (const [mat, n] of costsOf(it)) { o.bag.m[mat] -= n; if (o.bag.m[mat] <= 0) delete o.bag.m[mat]; }
  giveTo(o, give);
  countBuy(ab, id, now);
  setResult(ab, id, "buy", give, now);
  return { ok: true, give };
}
// 보관함의 상자를 연다 — 교환 횟수를 쓰지 않는다
export function whyBoxOpen(o, id, pick) {
  if (!o || !o.bag) return "기록을 불러오는 중입니다";
  const ab = o.bag.ab || cleanAb(null);
  if (!ABYSS_BOXES[id] || !((ab.bx && ab.bx[id]) || 0)) return "보관함에 없는 상자입니다";
  return boxWhy(o, id, pick);
}
export function boxOpen(o, id, now, pick, rng = Math.random) {
  const why = whyBoxOpen(o, id, pick);
  if (why) return { ok: false, err: why };
  const ab = abOf(o.bag), give = boxRoll(id, pick, rng);
  ab.bx[id] -= 1; if (ab.bx[id] <= 0) delete ab.bx[id];
  giveTo(o, give);
  setResult(ab, id, "open", give, now);
  return { ok: true, give };
}

/* ── 생애 최초 돌파 보상 — rec.atop 으로 소급, 아래 층부터 차례로 ── */
export const firstGot = (ab, i) => !!(ab && (ab.fc & (1 << i)));
// 단계 i 의 상태 — "got" 받음 · "ready" 받을 수 있음 · "wait" 아래 층부터 · "lock" 아직 못 닿음
export function firstState(o, i) {
  const ab = (o && o.bag && o.bag.ab) || cleanAb(null), top = (o && o.rec && o.rec.atop) || 0;
  if (firstGot(ab, i)) return "got";
  if (top < ABYSS_FIRST[i].f) return "lock";
  for (let k = 0; k < i; k++) if (!firstGot(ab, k)) return "wait";
  return "ready";
}
export function whyFirst(o, i) {
  if (!o || !o.bag) return "기록을 불러오는 중입니다";
  const F = ABYSS_FIRST[i];
  if (!F) return "없는 보상입니다";
  const st = firstState(o, i);
  if (st === "got") return "이미 받은 보상입니다";
  if (st === "lock") return `${F.f}층을 깨면 받습니다`;
  if (st === "wait") return "아래 층 보상부터 받아 주세요";
  return giveRoom(o, F.give);
}
export function firstClaim(o, i, now) {
  const why = whyFirst(o, i);
  if (why) return { ok: false, err: why };
  const ab = abOf(o.bag), give = ABYSS_FIRST[i].give;
  giveTo(o, give);
  ab.fc |= 1 << i;
  setResult(ab, `first${ABYSS_FIRST[i].f}`, "first", give, now);
  return { ok: true, give };
}

/* ── 주간 순위 보상 — 장부(fn_rpg_abyss_claim)가 저장 기록에, 시험이 영웅에 쓴다 ──
   week 는 순위를 낸 주, rank 는 그 주 순위. 예전 방식으로 받은 주(aw.cl)와 새 방식으로 받은 주(ab.cw) 모두 다시 받지 못한다 */
export function rankClaim(o, week, rank, now) {
  const rw = rankReward(rank, week);
  if (!rw) return { ok: false, err: "reward" };
  if (!o || !o.bag) return { ok: false, err: "token" };
  const aw = rollAw(cleanAw(o.bag.aw), abyssWeek(now));
  const ab = o.bag.ab || cleanAb(null);
  if (aw.cl === week || ab.cw.includes(week)) return { ok: false, err: "claimed" };
  const give = { m: { [SHARD]: rw.shard, ...(rw.seal ? { [SEAL]: rw.seal } : {}) }, ...(rw.bx ? { bx: rw.bx } : {}) };
  if (giveRoom(o, give)) return { ok: false, err: "capacity", why: giveRoom(o, give) };
  o.bag.aw = aw;
  const A = abOf(o.bag);
  giveTo(o, give);
  if (rw.look) A.sh = Math.max(A.sh || 0, weekReset(abyssWeek(now)));   // 시즌 후광 — 받은 주가 끝날 때까지
  if (!isObj(o.rec)) o.rec = {};
  if (rank <= 10) o.rec.awk = (Number(o.rec.awk) || 0) + 1;            // 칭호 「심연의 도전자」 — 예전처럼 상위 10
  if (rank === 1) o.rec.awin = (Number(o.rec.awin) || 0) + 1;
  aw.cl = week;
  A.cw = [...A.cw, week].slice(-KEEP_CW);
  setResult(A, `rank${rank}`, "rank", { ...give, ...(rw.look ? { look: rw.look } : {}) }, now);
  return { ok: true, rank, week, shard: rw.shard, seal: rw.seal, give: { ...give, ...(rw.look ? { look: rw.look } : {}) } };
}

/* ── 외형 — 낀 것만 그린다. 시즌 외형은 기간 안에서만. 능력치는 없다 ── */
export const lookOwned = (ab, id, now) => {
  const L = LOOK_BY_ID[id];
  if (!L || !ab) return false;
  return L.season ? (ab.sh || 0) > now : !!(ab.own & (1 << L.i));
};
// 지금 보이는 외형 비트 — 낀 것 가운데 가진 것(시즌은 기간 안)
export function lookBits(bag, now) {
  const ab = bag && bag.ab;
  if (!ab) return 0;
  let bits = 0;
  ABYSS_LOOKS.forEach((L, i) => { if ((ab.eq & (1 << i)) && lookOwned(ab, L.id, now)) bits |= 1 << i; });
  return bits;
}
export function whyLook(o, id, on, now) {
  if (!o || !o.bag) return "기록을 불러오는 중입니다";
  const L = LOOK_BY_ID[id];
  if (!L) return "없는 외형입니다";
  if (on && !lookOwned(o.bag.ab || cleanAb(null), id, now)) return L.season ? "기간이 끝난 외형입니다" : "아직 얻지 못한 외형입니다";
  return "";
}
// 끼거나 벗는다 — 같은 자리(slot)의 다른 외형은 벗긴다
export function lookSet(o, id, on, now) {
  const why = whyLook(o, id, on, now);
  if (why) return { ok: false, err: why };
  const ab = abOf(o.bag), L = LOOK_BY_ID[id];
  if (on) {
    ABYSS_LOOKS.forEach((x, i) => { if (x.slot === L.slot) ab.eq &= ~(1 << i); });
    ab.eq |= 1 << L.i;
  } else ab.eq &= ~(1 << L.i);
  o.bag.v = (Number(o.bag.v) || 0) + 1;
  return { ok: true };
}

export { ridMark };
