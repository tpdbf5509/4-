/* ── RPG 연금술 규칙 — 제작 레벨 · 경험치 · 제작 · 연속 제작 · 재료 사기 · 제작 의뢰 · 채집 ─────────────
   수치는 alchemyData.js. 판정은 전용 서버(방장)가 shop.js rpgShop(op craft · abuy · areq)과 rpg.js(채집 입력 herb)에서 한다.
   화면(AlchemyPanel.jsx)은 같은 why* 함수로 막힌 이유만 미리 보여 준다. 화면이 보낸 수량 · 결과 · 확률은 쓰지 않는다.
   가방 bag.al = { lv 제작 레벨, xp 이 레벨에서 모은 경험치, n 만든 수, q 오늘의 의뢰 { d 날짜, l [{ r 레시피, n 수, x 경험치, ok 받았나 }] } } */
import { ALCH, ALCH_MAT_BY_ID, ALCH_REQ, RECIPES, RECIPE_BY_ID, SPECIAL_POTIONS, POTION_CONVERT, needCraftXp, GATHER, HERBS } from "./alchemyData.js";
import { MAT_BY_ID, matMax } from "./itemData.js";
import { POTIONS, POTION, DAY_TZ_HOURS } from "./shopData.js";
import { COIN_MAX } from "./abyssReward.js";

const POTION_NAME = Object.fromEntries(POTIONS.map((p) => [p.id, p.name]));
const potionName = (id) => POTION_NAME[id] || id;
const matName = (id) => (MAT_BY_ID[id] ? MAT_BY_ID[id].name : id);
const dayOf = (now = Date.now()) => new Date(now + DAY_TZ_HOURS * 3600e3).toISOString().slice(0, 10);
const int = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(v) || 0)));

/* ── 저장 값 ── */
export const newAl = () => ({ lv: 1, xp: 0, n: 0 });
// 가방에서 읽을 때(shop.js cleanBag) — 모르는 값은 버린다. 옛 캐릭터는 1레벨 · 0 경험치로 시작한다
export function cleanAl(d) {
  const a = newAl();
  if (!d || typeof d !== "object") return a;
  a.lv = int(d.lv, 1, ALCH.maxLv);
  a.xp = a.lv >= ALCH.maxLv ? 0 : int(d.xp, 0, needCraftXp(a.lv) - 1);
  a.n = int(d.n, 0, 1e9);
  const q = d.q;
  if (q && typeof q === "object" && typeof q.d === "string" && Array.isArray(q.l)) {
    const l = q.l.slice(0, ALCH_REQ.perDay).filter((it) => it && RECIPE_BY_ID[it.r])
      .map((it) => ({ r: it.r, n: int(it.n, 1, POTION.stackMax), x: int(it.x, 0, 1e6), ok: it.ok ? 1 : 0 }));
    a.q = { d: q.d.slice(0, 10), l };
  }
  return a;
}
export const alOf = (bag) => (bag && bag.al) || newAl();
export const alchLv = (h) => alOf(h && h.bag).lv;
/* 제작 개편 전 보유 물약 정리(alchemyData.js POTION_CONVERT) — h.bag.p 를 줄이고 h.coins 를 늘린다.
   이미 받았거나 관리자면 null. 바꿀 것이 없어도 받은 것으로 적는다. 돌려주는 값: { coins 받은 코인, n 바꾼 개수, left 한도 때문에 남긴 개수 } */
export function convertOldPotions(h) {
  const C = POTION_CONVERT;
  if (!h || !h.bag || h.admin || (h.bag.pg || []).includes(C.id)) return null;
  h.bag.pg = [...(h.bag.pg || []), C.id]; h.bag.v += 1;
  let coins = 0, n = 0, left = 0;
  POTIONS.forEach((p) => {
    if (isSpecialPotion(p.id)) return;
    const have = (h.bag.p && h.bag.p[p.id]) || 0;
    const extra = have - C.keep;
    if (extra <= 0) return;
    const room = Math.max(0, Math.floor((COIN_MAX - h.coins - coins) / C.rate));
    const take = Math.min(extra, room);
    left += extra - take;
    if (take <= 0) return;
    h.bag.p[p.id] = have - take;
    if (h.bag.p[p.id] <= 0) delete h.bag.p[p.id];
    coins += take * C.rate; n += take;
  });
  h.coins += coins;
  return { coins, n, left };
}
export const isSpecialPotion = (id) => SPECIAL_POTIONS.includes(id);
// 일반 물약을 상점에서 살 수 있나 — 제작 레벨 50부터
export const canBuyPotion = (h) => alchLv(h) >= ALCH.buyLv;

/* ── 경험치 ── */
// 이 레시피를 만들 때 받는 경험치 — 레벨 차이가 크면 줄어든다
export function craftXp(lv, r) {
  if (!r || lv >= ALCH.maxLv) return 0;
  const gap = lv - r.lv;
  if (gap >= ALCH.zeroGap) return 0;
  return gap >= ALCH.halfGap ? Math.floor(r.xp * 0.5) : r.xp;
}
// 경험치를 더한다 — 여러 레벨을 한 번에 오를 수 있고, 50레벨에서 멈춘다. 오른 레벨 수를 돌려준다
export function addCraftXp(al, xp) {
  const from = al.lv;
  if (al.lv >= ALCH.maxLv) { al.xp = 0; return 0; }
  al.xp += Math.max(0, Math.floor(xp));
  while (al.lv < ALCH.maxLv && al.xp >= needCraftXp(al.lv)) { al.xp -= needCraftXp(al.lv); al.lv += 1; }
  if (al.lv >= ALCH.maxLv) al.xp = 0;
  return al.lv - from;
}
// 제작 대성공 확률(결과물 하나 더)
export const greatChance = (lv) => ALCH.great.reduce((p, s) => (lv >= s.lv ? s.p : p), 0);

/* ── 제작 ── */
const haveMat = (bag, id) => (bag && bag.m && bag.m[id]) || 0;
// 레시피 하나를 만들 수 없는 이유 — 화면과 판정이 같이 쓴다(가까이 · 불러오는 중은 shop.js base 가 본다)
export function whyCraft(h, id) {
  const out = [];
  const r = RECIPE_BY_ID[id];
  if (!r) { out.push("만들 수 없는 물약입니다"); return out; }
  if (!h || !h.bag) return out;
  const lv = alchLv(h);
  if (lv < r.lv) { out.push(`제작 레벨 ${r.lv} 필요`); return out; }
  Object.entries(r.mats).forEach(([m, n]) => { const have = haveMat(h.bag, m); if (have < n) out.push(`${matName(m)} ${n - have}개 부족`); });
  if (((h.bag.p && h.bag.p[id]) || 0) >= POTION.stackMax) out.push(`${potionName(id)}은 ${POTION.stackMax}개까지 가집니다`);
  return out;
}
// 한 번 만든다 — 막히면 null. rng 는 시험에서 정할 수 있다. { great, saved 절약한 재료 id, xp, up 오른 레벨 수 }
export function craftOnce(h, id, rng = Math.random) {
  if (whyCraft(h, id).length) return null;
  const r = RECIPE_BY_ID[id], bag = h.bag, al = bag.al || (bag.al = newAl());
  const lv = al.lv;
  // 재료 절약 — 제작을 시작할 때 실제로 덜 쓴다. 2개 이상 드는 재료 가운데 하나만(모든 재료는 1개 이상 쓴다)
  let saved = "";
  if (lv >= ALCH.saveLv && rng() < ALCH.saveChance) {
    const can = Object.entries(r.mats).filter(([, n]) => n >= 2).map(([m]) => m);
    if (can.length) saved = can[Math.floor(rng() * can.length) % can.length];
  }
  Object.entries(r.mats).forEach(([m, n]) => {
    const use = n - (m === saved ? 1 : 0);
    bag.m[m] -= use;
    if (bag.m[m] <= 0) delete bag.m[m];
  });
  const great = rng() < greatChance(lv);
  const have = bag.p[id] || 0;
  const got = Math.min(great ? 2 : 1, POTION.stackMax - have);   // 대성공이어도 99개를 넘지 않는다
  bag.p[id] = have + got;
  const xp = craftXp(lv, r);
  const up = addCraftXp(al, xp);
  al.n = (al.n || 0) + 1;
  bag.v += 1;
  return { great, got, saved, xp, up };
}
// 연속 제작 — 한 번마다 다시 따지고, 막히면 거기서 멈춘다. 실제로 만든 결과만 모아 돌려준다
export function craftMany(h, id, times, rng = Math.random) {
  const n = int(times, 1, ALCH.repeat);
  const res = { done: 0, got: 0, great: 0, saved: 0, xp: 0, up: 0, stop: [] };
  for (let i = 0; i < n; i++) {
    const why = whyCraft(h, id);
    if (why.length) { res.stop = why; break; }
    const one = craftOnce(h, id, rng);
    res.done += 1; res.got += one.got; res.xp += one.xp; res.up += one.up;
    if (one.great) res.great += 1;
    if (one.saved) res.saved += 1;
  }
  return res;
}

/* ── 재료 사기 — 물 · 정제수(제작 레벨 제한 없음) ── */
export function whyAlchBuy(h, id, n) {
  const out = [];
  const m = ALCH_MAT_BY_ID[id];
  if (!m || !m.price) { out.push("팔지 않는 재료입니다"); return out; }
  if (!Number.isInteger(n) || n < 1 || n > 999) { out.push("살 수를 정해 주세요"); return out; }
  if (!h || !h.bag) return out;
  if (haveMat(h.bag, id) + n > matMax(id)) out.push(`한 종류는 ${matMax(id)}개까지 가집니다`);
  if (!h.admin && h.coins < m.price * n) out.push(`코인 ${(m.price * n - h.coins).toLocaleString("ko-KR")} 부족`);
  return out;
}

/* ── 제작 의뢰 ── */
// 지금 레벨로 고를 수 있는 레시피 — 해금했고 경험치가 깎이지 않는 것. 초보(5레벨 전)는 회복 물약 (소)뿐
export function reqPool(lv) {
  const own = RECIPES.filter((r) => r.lv <= lv);
  const near = own.filter((r) => lv - r.lv <= ALCH_REQ.range);
  return near.length ? near : own.slice(-3);
}
// 오늘의 의뢰를 정한다(날짜가 바뀌었을 때만). 서버가 정하고 가방에 남는다. 바뀌었으면 true
export function rollAlchReq(bag, now = Date.now(), rng = Math.random) {
  const al = bag.al || (bag.al = newAl());
  const d = dayOf(now);
  if (al.q && al.q.d === d) return false;
  const pool = reqPool(al.lv);
  const l = [];
  for (let i = 0; i < ALCH_REQ.perDay; i++) {
    const r = pool[Math.floor(rng() * pool.length) % pool.length];
    const [lo, hi] = ALCH_REQ.n;
    const n = lo + Math.min(hi - lo, Math.floor(rng() * (hi - lo + 1) * Math.min(1, 0.5 + al.lv / ALCH.maxLv)));
    l.push({ r: r.id, n, x: Math.round(r.xp * n * ALCH_REQ.xpMul), ok: 0 });
  }
  al.q = { d, l };
  bag.v += 1;
  return true;
}
// 의뢰 보상 재료 — 레시피 재료 가운데 사는 것(물 · 정제수)을 뺀 몫
export function reqMats(it) {
  const r = RECIPE_BY_ID[it && it.r];
  if (!r) return {};
  return Object.fromEntries(Object.entries(r.mats).filter(([m]) => !ALCH_MAT_BY_ID[m] || !ALCH_MAT_BY_ID[m].price)
    .map(([m, n]) => [m, Math.max(1, Math.round(n * ALCH_REQ.matMul))]));
}
export function whyAlchReq(h, i, now = Date.now()) {
  const out = [];
  if (!h || !h.bag) return out;
  const al = alOf(h.bag), q = al.q;
  if (!q || q.d !== dayOf(now)) { out.push("오늘의 의뢰를 불러오는 중입니다"); return out; }
  const it = q.l[i];
  if (!it) { out.push("없는 의뢰입니다"); return out; }
  if (it.ok) { out.push("이미 보상을 받았습니다"); return out; }
  const have = (h.bag.p && h.bag.p[it.r]) || 0;
  if (have < it.n) out.push(`${potionName(it.r)} ${it.n - have}개 부족`);
  Object.entries(reqMats(it)).forEach(([m, n]) => { if (haveMat(h.bag, m) + n > matMax(m)) out.push(`${matName(m)}이 가득 찼습니다`); });
  return out;
}
// 납품 — 물약을 빼고 경험치 · 재료를 준다. { xp, up, mats }
export function alchReqDone(h, i, now = Date.now()) {
  if (whyAlchReq(h, i, now).length) return null;
  const bag = h.bag, al = bag.al, it = al.q.l[i];
  bag.p[it.r] -= it.n;
  if (bag.p[it.r] <= 0) delete bag.p[it.r];
  it.ok = 1;
  const mats = reqMats(it);
  Object.entries(mats).forEach(([m, n]) => { bag.m[m] = Math.min(matMax(m), haveMat(bag, m) + n); });
  const xp = al.lv >= ALCH.maxLv ? 0 : it.x;      // 50레벨이면 경험치는 더 쌓지 않는다
  const up = addCraftXp(al, xp);
  bag.v += 1;
  return { xp, up, mats };
}

/* ── 채집 ──
   g.herbs = { 채집물 번호: 다시 나기까지 남은 초 } — 비어 있는 자리만 적는다(스냅샷 hb). 서버만 줄인다 */
export const herbUp = (g, i) => !(g.herbs && g.herbs[i] > 0);
// 이 사람 곁의 채집물(맵 · 거리 · 나 있는 것) — 가장 가까운 것
export function herbNear(g, h, reach = GATHER.reach) {
  if (!h) return null;
  let best = null, bd = Infinity;
  HERBS.forEach((n) => {
    if (n.map !== h.map || !herbUp(g, n.i)) return;
    const d = Math.hypot(n.x - h.x, n.y - h.y);
    if (d <= reach && d < bd) { best = n; bd = d; }
  });
  return best;
}
export function whyGather(g, h, i) {
  const n = HERBS[i];
  if (!h || !h.loaded) return "캐릭터를 불러오는 중입니다";
  if (!n || n.map !== h.map) return "채집물이 없습니다";
  if (h.down > 0) return "쓰러진 동안은 채집할 수 없습니다";
  if (!herbUp(g, i)) return "이미 채집한 자리입니다. 잠시 뒤 다시 납니다";
  if (Math.hypot(n.x - h.x, n.y - h.y) > GATHER.reach) return "채집물 가까이 가야 합니다";
  if (haveMat(h.bag, n.kind) >= matMax(n.kind)) return `${matName(n.kind)}이 가득 찼습니다`;
  return "";
}
// 채집 시작 — 시작한 자리 · 남은 시간을 영웅에 둔다(h.gath). 끝은 tickGather
export function gatherStart(g, h, i) {
  const why = whyGather(g, h, i);
  if (why) return why;
  h.gath = { i, t: GATHER.time, x: h.x, y: h.y };
  return "";
}
// 채집 시간 — 움직이거나 쓰러지거나 맵을 옮기면 취소. 다 되면 그 자리가 아직 나 있을 때만 받는다(먼저 끝낸 한 사람).
// 돌려주는 값: null(진행 중 · 없음) · { cancel: 이유 } · { kind, n }
export function tickGather(g, h, dt, rng = Math.random) {
  const s = h.gath;
  if (!s) return null;
  const n = HERBS[s.i];
  if (!n || h.map !== n.map || h.down > 0 || Math.hypot(h.x - s.x, h.y - s.y) > GATHER.moveCancel) { h.gath = null; return { cancel: "채집을 멈췄습니다" }; }
  s.t -= dt;
  if (s.t > 0) return null;
  h.gath = null;
  if (!herbUp(g, s.i)) return { cancel: "다른 사람이 먼저 채집했습니다" };
  const [lo, hi] = GATHER.n;
  const want = lo + Math.floor(rng() * (hi - lo + 1));
  const got = Math.min(want, Math.max(0, matMax(n.kind) - haveMat(h.bag, n.kind)));
  (g.herbs || (g.herbs = {}))[s.i] = GATHER.respawn;   // 받기 전에 자리를 먼저 비운다 — 같은 순간 다른 사람은 받지 못한다
  if (got > 0) { if (!h.bag.m) h.bag.m = {}; h.bag.m[n.kind] = haveMat(h.bag, n.kind) + got; h.bag.v += 1; }
  return { kind: n.kind, n: got };
}
// 비운 자리가 다시 난다 — 서버 · 방장이 한 번씩 부른다
export function tickHerbs(g, dt) {
  if (!g.herbs) return;
  for (const k in g.herbs) { g.herbs[k] -= dt; if (g.herbs[k] <= 0) delete g.herbs[k]; }
}
// 주고받기 — 비운 자리만 { 번호: 남은 초(정수) }
export const packHerbs = (g) => Object.fromEntries(Object.entries(g.herbs || {}).map(([k, t]) => [k, Math.ceil(t)]));
