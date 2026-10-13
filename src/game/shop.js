/* ── RPG 광장 상점 규칙 ─────────────────────────────────────
   무기상점 · 스킬 상점 · 물약 상점 · 도박장. 수치는 모두 shopData.js 에 있다.
   사고팔기 · 도박은 방장이 판정한다(rpgShop). 화면은 같은 조건 함수(why*)로 막힌 이유를 미리 보여 준다.
   가방(h.bag)은 이름과 함께 이 기기에 남고, 바뀔 때만 손님에게 보낸다. */
import {
  SHOPS, SHOP_REACH, DAY_TZ_HOURS, WEAPON_TYPES, GRADES, WEAPON_TIERS, WEAPON, DEAL,
  SKILL_FAMS, SKILLS, POTIONS, POTION, CASINO, BOX, DICE, SLOT,
} from "./shopData.js";
// rpg.js 와 서로 불러 쓴다 — 아래 이름들은 함수 안에서만 쓴다(불러오는 순서에 기대지 않게)
import { STATS, statValue, statSpent, noStats, refreshHp, fx, dist } from "./rpg.js";

export const SHOP_BY_ID = Object.fromEntries(SHOPS.map((s) => [s.id, s]));
export const WEAPON_BY_ID = Object.fromEntries(WEAPON_TYPES.map((t) => [t.id, t]));
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const FAM_BY_ID = Object.fromEntries(SKILL_FAMS.map((f) => [f.id, f]));
export const POTION_BY_ID = Object.fromEntries(POTIONS.map((p) => [p.id, p]));
const BUFF_STATS = ["str", "int", "crit"];          // 버프 물약이 올릴 수 있는 스탯

const statDef = (id) => STATS.find((t) => t.id === id);
const statName = (id) => statDef(id).name;
const fmtStat = (id, v) => statDef(id).fmt(v);
const won = (n) => Math.round(n).toLocaleString("ko-KR");
const isInt = (v) => Number.isInteger(v);
// 받침에 맞는 조사 — jo("검", "을", "를") → "검을"
export function jo(word, a, b) {
  const last = [...String(word)].reverse().find((ch) => ch >= "가" && ch <= "힣");   // "회복 물약 (중)" 은 "중" 을 본다
  const c = last ? last.charCodeAt(0) - 0xac00 : 0;
  return `${word}${c % 28 !== 0 ? a : b}`;
}

/* ── 하루 — 한국 날짜 "2026-10-13" ─────────────────────────── */
export function todayKey(now = Date.now()) {
  return new Date(now + DAY_TZ_HOURS * 3600e3).toISOString().slice(0, 10);
}
// 오늘 쓴 횟수 — 날짜가 바뀌었으면 0
export const usedToday = (bag, key, day = todayKey()) => (bag.day.d === day ? bag.day[key] || 0 : 0);
function rollDay(bag, day) {
  if (bag.day.d !== day) bag.day = { d: day, box: 0, dice: 0, slot: 0, deal: 0 };
}

/* ── 무기 ──────────────────────────────────────────────── */
// 내 레벨로 살 수 있는 가장 높은 단계
export const tierOf = (lv) => {
  let r = 0;
  WEAPON_TIERS.forEach((need, i) => { if (lv >= need) r = i; });
  return r;
};
// 무기가 올려 주는 스탯 수치 — 포인트로 셈한 뒤 그 스탯의 포인트당 효과를 곱한다
export function weaponBonus(t, r, g) {
  const type = WEAPON_BY_ID[t];
  const pts = (WEAPON.pts + WEAPON.ptsPerTier * r) * GRADES[g].mul * type.mul;
  return Math.max(1, Math.round(pts)) * statDef(type.stat).per;
}
export function weaponPrice(t, r, g) {
  const raw = WEAPON.price * Math.pow(WEAPON.priceGrow, r) * GRADES[g].price * WEAPON_BY_ID[t].price;
  return Math.max(10, Math.round(raw / 10) * 10);
}
export const weaponName = (w) => `${GRADES[w.g].name} ${WEAPON_BY_ID[w.t].name}`;
export const weaponLine = (w) => `${statName(WEAPON_BY_ID[w.t].stat)} +${fmtStat(WEAPON_BY_ID[w.t].stat, weaponBonus(w.t, w.r, w.g))}`;
export const sellPrice = (w) => Math.floor(w.p * WEAPON.sellRate);

// 날짜로 정해지는 수 — 같은 날에는 누구에게나 같은 종류 · 등급이 나온다
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// 오늘의 특가 — 단계는 내 레벨에 맞는 가장 높은 단계
export function dealOf(lv, day = todayKey()) {
  const h = hashStr(`deal:${day}`);
  const t = WEAPON_TYPES[h % WEAPON_TYPES.length].id;
  const g = DEAL.grades[Math.floor(h / WEAPON_TYPES.length) % DEAL.grades.length];
  const r = tierOf(lv);
  const full = weaponPrice(t, r, g);
  return { t, r, g, full, price: Math.round((full * (1 - DEAL.discount)) / 10) * 10 };
}

/* ── 가방 ──────────────────────────────────────────────────
   w 무기 목록 [{ u 번호, t 종류, r 단계, g 등급, p 산 값 }] · e 장착한 무기 번호(0 은 맨손)
   p 물약 { id: 개수 } · s 스킬 { id: 레벨 } · day 오늘 쓴 횟수 · n 다음 무기 번호 · v 바뀔 때마다 오르는 판 번호
   ld 는 저장된 기록을 실었는지 — 싣기 전의 빈 가방으로 기록을 덮지 않게 한다 */
export const newBag = () => ({ w: [], e: 0, p: {}, s: {}, day: { d: "", box: 0, dice: 0, slot: 0, deal: 0 }, n: 1, v: 0, ld: 0 });
export function cleanBag(d) {
  const b = newBag();
  if (!d || typeof d !== "object") return b;
  const n0 = Math.max(1, Math.floor(Number(d.n) || 1));
  const seen = new Set();
  (Array.isArray(d.w) ? d.w : []).slice(0, WEAPON.bagMax).forEach((w) => {
    if (!w || !WEAPON_BY_ID[w.t]) return;
    const r = Math.floor(Number(w.r)), g = Math.floor(Number(w.g)), u = Math.floor(Number(w.u));
    if (!(r >= 0 && r < WEAPON_TIERS.length) || !(g >= 0 && g < GRADES.length) || !(u > 0) || seen.has(u)) return;
    seen.add(u);
    b.w.push({ u, t: w.t, r, g, p: Math.max(0, Math.floor(Number(w.p) || 0)) });
  });
  b.n = Math.max(n0, ...b.w.map((w) => w.u + 1));
  b.e = seen.has(Number(d.e)) ? Number(d.e) : 0;
  POTIONS.forEach((p) => {
    const c = Math.floor(Number(d.p && d.p[p.id]) || 0);
    if (c > 0) b.p[p.id] = Math.min(POTION.stackMax, c);
  });
  SKILLS.forEach((s) => {
    const l = Math.floor(Number(d.s && d.s[s.id]) || 0);
    if (l > 0) b.s[s.id] = Math.min(s.gold.length, l);
  });
  const dy = d.day || {};
  if (typeof dy.d === "string") {
    b.day = { d: dy.d.slice(0, 10) };
    ["box", "dice", "slot", "deal"].forEach((k) => { b.day[k] = Math.max(0, Math.floor(Number(dy[k]) || 0)); });
  }
  b.v = Math.max(0, Math.floor(Number(d.v) || 0));
  return b;
}
export const equipped = (bag) => (bag.e ? bag.w.find((w) => w.u === bag.e) || null : null);

/* ── 스탯에 더해지는 몫 — 장착한 무기 + 패시브 스킬 + 버프 물약 ── */
export function extraStat(h, id) {
  let v = 0;
  const bag = h.bag;
  if (bag) {
    const w = equipped(bag);
    if (w && WEAPON_BY_ID[w.t].stat === id) v += weaponBonus(w.t, w.r, w.g);
    SKILLS.forEach((s) => {
      const l = bag.s[s.id] || 0;
      if (l > 0 && s.bonus && s.bonus.stat === id) v += s.bonus.per * l;
    });
  }
  const b = h.bf && h.bf[id];
  if (b && b.t > 0) v += b.a;
  return v;
}
// 버프 시간이 흐른다 (방장)
export function tickBuffs(h, dt) {
  if (!h.bf) return;
  BUFF_STATS.forEach((k) => {
    const b = h.bf[k];
    if (b && b.t > 0) { b.t = Math.max(0, b.t - dt); if (b.t <= 0) delete h.bf[k]; }
  });
}
// 주고받기 — [물리 남은 초, 양, 마법 …, 치명 …] 또는 0
export function packBuffs(h) {
  if (!h.bf || !BUFF_STATS.some((k) => h.bf[k] && h.bf[k].t > 0)) return 0;
  return BUFF_STATS.flatMap((k) => (h.bf[k] && h.bf[k].t > 0 ? [Math.ceil(h.bf[k].t), h.bf[k].a] : [0, 0]));
}
export function applyBuffs(h, row) {
  h.bf = {};
  if (!Array.isArray(row)) return;
  BUFF_STATS.forEach((k, i) => { if (row[i * 2] > 0) h.bf[k] = { t: row[i * 2], a: row[i * 2 + 1] }; });
}

/* ── 조건 — 막히는 이유를 모두 모아 돌려준다. 빈 목록이면 할 수 있다 ── */
export function nearShop(h, id) {
  const s = SHOP_BY_ID[id];
  return !!(h && s && h.map === "plaza" && dist(h.x, h.y, s.x, s.y) <= SHOP_REACH * 1.5);
}
function base(h, shop, out) {
  if (!h || !h.loaded) out.push("캐릭터를 불러오는 중입니다");
  else if (h.down > 0) out.push("쓰러진 동안은 할 수 없습니다");
  else if (shop && !nearShop(h, shop)) out.push("상점 가까이 가야 합니다");
}
const lackCoin = (h, price, out) => { if (h && h.coins < price) out.push(`코인 ${won(price - h.coins)} 부족`); };

// 무기 사기 — deal 이면 오늘의 특가로 산다
export function whyWeaponBuy(h, t, r, g, deal, day = todayKey()) {
  const out = [];
  base(h, "weapon", out);
  if (!h || !h.bag) return out;
  if (!WEAPON_BY_ID[t] || !isInt(r) || !(r >= 0 && r < WEAPON_TIERS.length) || !isInt(g) || !(g >= 0 && g < GRADES.length)) {
    out.push("없는 무기입니다");
    return out;
  }
  if (h.lv < WEAPON_TIERS[r]) out.push(`레벨 ${WEAPON_TIERS[r]} 필요 (지금 ${h.lv})`);
  let price = weaponPrice(t, r, g);
  if (deal) {
    const d = dealOf(h.lv, day);
    if (d.t !== t || d.r !== r || d.g !== g) out.push("오늘의 특가가 바뀌었습니다");
    if (usedToday(h.bag, "deal", day) >= DEAL.perDay) out.push(`오늘의 특가는 하루 ${DEAL.perDay}번까지입니다`);
    price = d.price;
  }
  if (h.bag.w.length >= WEAPON.bagMax) out.push(`가방이 가득 찼습니다 (${WEAPON.bagMax}개)`);
  lackCoin(h, price, out);
  return out;
}
export function whyWeaponSell(h, u) {
  const out = [];
  base(h, "weapon", out);
  if (!h || !h.bag) return out;
  if (!h.bag.w.some((w) => w.u === u)) out.push("가방에 없는 무기입니다");
  else if (h.bag.e === u) out.push("장착한 무기는 팔 수 없습니다. 먼저 해제하세요");
  return out;
}
export function whyEquip(h, u) {
  const out = [];
  base(h, null, out);
  if (!h || !h.bag || !u) return out;
  const w = h.bag.w.find((q) => q.u === u);
  if (!w) out.push("가방에 없는 무기입니다");
  else if (h.lv < WEAPON_TIERS[w.r]) out.push(`레벨 ${WEAPON_TIERS[w.r]} 필요 (지금 ${h.lv})`);
  return out;
}

// 스킬 — 배우거나 다음 레벨로 올리는 데 필요한 것
export function skillNext(h, id) {
  const s = SKILL_BY_ID[id];
  const cur = (h && h.bag && h.bag.s[id]) || 0;
  if (!s || cur >= s.gold.length) return null;
  const fam = FAM_BY_ID[s.fam];
  return { lv: cur + 1, gold: s.gold[cur], needLv: s.lv[cur], stat: fam.stat, need: s.need[cur] };
}
export function whySkill(h, id) {
  const out = [];
  base(h, "skill", out);
  const s = SKILL_BY_ID[id];
  if (!s) { out.push("없는 스킬입니다"); return out; }
  if (!h || !h.bag) return out;
  const nx = skillNext(h, id);
  if (!nx) { out.push("최고 레벨입니다"); return out; }
  if (h.lv < nx.needLv) out.push(`레벨 ${nx.needLv - h.lv} 부족 (${nx.needLv} 필요)`);
  const have = statValue(nx.stat, h.st[nx.stat]);   // 장비 · 버프를 뺀 값
  if (have < nx.need) out.push(`${statName(nx.stat)} ${fmtStat(nx.stat, nx.need - have)} 부족 (${fmtStat(nx.stat, nx.need)} 필요)`);
  lackCoin(h, nx.gold, out);
  return out;
}

// 물약 사기 · 마시기
export function whyPotionBuy(h, id) {
  const out = [];
  base(h, "potion", out);
  const p = POTION_BY_ID[id];
  if (!p) { out.push("없는 물약입니다"); return out; }
  if (!h || !h.bag) return out;
  if ((h.bag.p[id] || 0) >= POTION.stackMax) out.push(`한 종류는 ${POTION.stackMax}개까지 가질 수 있습니다`);
  lackCoin(h, p.price, out);
  return out;
}
export function whyPotionUse(h, id) {
  const out = [];
  base(h, null, out);
  const p = POTION_BY_ID[id];
  if (!p) { out.push("없는 물약입니다"); return out; }
  if (!h || !h.bag) return out;
  if (!(h.bag.p[id] > 0)) out.push("가지고 있지 않습니다");
  else if (p.kind === "heal" && h.hp >= h.max) out.push("체력이 이미 가득 찼습니다");
  else if (p.kind === "reset" && statSpent(h.st) <= 0) out.push("돌려받을 스탯 포인트가 없습니다");
  return out;
}

// 랜덤 상자 값 — 내용물 상점가의 기댓값 ÷ 목표 기댓값
export function boxValue(r) {
  const wsum = BOX.grades.reduce((a, b) => a + b, 0);
  const wEv = BOX.grades.reduce((acc, pct, g) =>
    acc + (pct / wsum) * (WEAPON_TYPES.reduce((s, t) => s + weaponPrice(t.id, r, g), 0) / WEAPON_TYPES.length), 0);
  const psum = Object.values(BOX.potions).reduce((a, b) => a + b, 0);
  const pEv = Object.entries(BOX.potions).reduce((acc, [id, pct]) => acc + (pct / psum) * POTION_BY_ID[id].price, 0);
  return BOX.weapon * wEv + (1 - BOX.weapon) * pEv;
}
export const boxPrice = (lv) => Math.round(boxValue(tierOf(lv)) / CASINO.evTarget / 10) * 10;
// 게임별 기댓값(건 금액 대비) — 화면에 공개하고 시험에도 쓴다
export function casinoEv(lv = 1) {
  const sw = SLOT.reduce((a, s) => a + s.w, 0);
  return {
    box: boxValue(tierOf(lv)) / boxPrice(lv),
    dice: (1 - DICE.house) * 0.5 * DICE.pay,
    slot: SLOT.reduce((a, s) => a + Math.pow(s.w / sw, 3) * s.mul, 0),
  };
}
export function whyGamble(h, game, bet, day = todayKey()) {
  const out = [];
  base(h, "casino", out);
  if (!h || !h.bag) return out;
  const lim = CASINO.daily[game];
  if (lim === undefined) { out.push("없는 게임입니다"); return out; }
  if (usedToday(h.bag, game, day) >= lim) out.push(`오늘은 더 할 수 없습니다 (하루 ${lim}번)`);
  if (game === "box") {
    if (h.bag.w.length >= WEAPON.bagMax) out.push(`가방이 가득 찼습니다 (${WEAPON.bagMax}개)`);
    if (Object.keys(BOX.potions).some((id) => (h.bag.p[id] || 0) >= POTION.stackMax)) out.push(`가득 찬 물약이 있습니다 (${POTION.stackMax}개)`);
    lackCoin(h, boxPrice(h.lv), out);
  } else {
    if (!isInt(bet) || bet < CASINO.minBet) out.push(`최소 ${won(CASINO.minBet)}코인을 걸어야 합니다`);
    else if (bet > CASINO.maxBet) out.push(`한 번에 ${won(CASINO.maxBet)}코인까지 걸 수 있습니다`);
    else lackCoin(h, bet, out);
  }
  return out;
}

/* ── 판정 (방장만) ─────────────────────────────────────────
   req = { op, ... }. 결과는 g.notes 에 남고 손님에게도 보낸다(그 사람 화면에만 뜬다). */
function note(g, pi, res) {
  const it = { ...res, who: pi, at: g.t };
  g.notes.push(it);
  if (g.notes.length > 20) g.notes.shift();
  if (g.out) g.out.push({ k: "note", ...it });
  return res;
}
const no = (g, pi, why) => note(g, pi, { ok: false, msg: why.join(" · ") });
const bump = (h) => { h.bag.v += 1; };
function pickWeighted(list, weightOf) {
  const sum = list.reduce((a, x) => a + weightOf(x), 0);
  let r = Math.random() * sum;
  for (const x of list) { r -= weightOf(x); if (r < 0) return x; }
  return list[list.length - 1];
}
function addWeapon(h, t, r, g, paid) {
  const w = { u: h.bag.n++, t, r, g, p: paid };
  h.bag.w.push(w);
  return w;
}
// 최대 체력이 바뀌는 일 뒤 — 가득 차 있었으면 늘어난 만큼도 채운다
function hpChanged(h, wasFull) {
  refreshHp(h, false);
  if (wasFull && h.down <= 0) h.hp = h.max;
}

export function rpgShop(g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.bag || !req || typeof req !== "object") return { ok: false, msg: "잘못된 요청입니다" };
  const day = todayKey();
  rollDay(h.bag, day);
  const op = req.op;
  let why;

  if (op === "wbuy") {
    const { t } = req, r = Number(req.r), gr = Number(req.g), deal = !!req.deal;
    if ((why = whyWeaponBuy(h, t, r, gr, deal, day)).length) return no(g, pi, why);
    const price = deal ? dealOf(h.lv, day).price : weaponPrice(t, r, gr);
    h.coins -= price;
    if (deal) h.bag.day.deal += 1;
    const w = addWeapon(h, t, r, gr, price);
    bump(h);
    fx(g, h.map, { kind: "text", x: h.x, y: h.y - 90, text: `-${won(price)} 코인`, color: "#f3d27f", t: 0.9, life: 0.9, snd: "coin", who: pi });
    return note(g, pi, { ok: true, msg: `${jo(weaponName(w), "을", "를")} 샀습니다 (Lv ${WEAPON_TIERS[r]} · ${won(price)}코인)` });
  }
  if (op === "wsell") {
    const u = Number(req.u);
    if ((why = whyWeaponSell(h, u)).length) return no(g, pi, why);
    const i = h.bag.w.findIndex((w) => w.u === u);
    const [w] = h.bag.w.splice(i, 1);
    const got = sellPrice(w);
    h.coins += got;
    bump(h);
    fx(g, h.map, { kind: "text", x: h.x, y: h.y - 90, text: `+${won(got)} 코인`, color: "#f3d27f", t: 0.9, life: 0.9, snd: "coin", who: pi });
    return note(g, pi, { ok: true, msg: `${jo(weaponName(w), "을", "를")} ${won(got)}코인에 팔았습니다` });
  }
  if (op === "equip") {
    const u = Number(req.u) || 0;
    if ((why = whyEquip(h, u)).length) return no(g, pi, why);
    h.bag.e = u;
    bump(h);
    const w = equipped(h.bag);
    return note(g, pi, { ok: true, msg: w ? `${jo(weaponName(w), "을", "를")} 장착했습니다` : "무기를 해제했습니다" });
  }
  if (op === "sbuy") {
    const id = req.id;
    if ((why = whySkill(h, id)).length) return no(g, pi, why);
    const nx = skillNext(h, id);
    const wasFull = h.hp >= h.max;
    h.coins -= nx.gold;
    h.bag.s[id] = nx.lv;
    bump(h);
    hpChanged(h, wasFull);
    const s = SKILL_BY_ID[id];
    fx(g, h.map, { kind: "call", x: h.x, y: h.y - 96, text: `${s.name} Lv ${nx.lv}`, color: "#ffe08a", t: 0.9, life: 0.9, snd: "build", who: pi });
    return note(g, pi, { ok: true, msg: nx.lv === 1 ? `${jo(s.name, "을", "를")} 배웠습니다` : `${jo(s.name, "이", "가")} ${nx.lv}레벨이 되었습니다` });
  }
  if (op === "pbuy") {
    const id = req.id;
    if ((why = whyPotionBuy(h, id)).length) return no(g, pi, why);
    const p = POTION_BY_ID[id];
    h.coins -= p.price;
    h.bag.p[id] = (h.bag.p[id] || 0) + 1;
    bump(h);
    return note(g, pi, { ok: true, msg: `${jo(p.name, "을", "를")} 샀습니다 (${won(p.price)}코인)` });
  }
  if (op === "puse") {
    const id = req.id;
    if ((why = whyPotionUse(h, id)).length) return no(g, pi, why);
    const p = POTION_BY_ID[id];
    h.bag.p[id] -= 1;
    if (h.bag.p[id] <= 0) delete h.bag.p[id];
    bump(h);
    const great = p.kind !== "reset" && Math.random() < POTION.greatChance;
    const mul = great ? POTION.greatMul : 1;
    let msg = "";
    if (p.kind === "heal") {
      const before = h.hp;
      h.hp = Math.min(h.max, h.hp + h.max * p.pct * mul);
      const got = Math.round(h.hp - before);
      fx(g, h.map, { kind: "heal", x: h.x, y: h.y - 56, text: `+${got}`, t: 0.9, life: 0.9, snd: "bless", who: pi });
      msg = `체력을 ${got} 되찾았습니다`;
    } else if (p.kind === "buff") {
      const wasFull = h.hp >= h.max;
      const amt = p.amt * mul;
      const cur = h.bf[p.stat];
      h.bf[p.stat] = { t: p.dur, a: Math.max(amt, cur && cur.t > 0 ? cur.a : 0) };   // 다시 마시면 시간은 새로, 양은 큰 쪽
      hpChanged(h, wasFull);
      msg = `${p.dur}초 동안 ${statName(p.stat)} +${fmtStat(p.stat, h.bf[p.stat].a)}`;
    } else {
      const back = statSpent(h.st);
      h.st = noStats();
      hpChanged(h, false);
      msg = `스탯 포인트 ${back}개를 돌려받았습니다`;
    }
    if (great) {
      fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: "대성공! 효과 2배", color: "#ffd873", t: 1.1, life: 1.1, snd: "crit", who: pi });
      msg = `대성공! ${msg}`;
    }
    return note(g, pi, { ok: true, great, msg: `${p.name} — ${msg}` });
  }

  // 도박장
  if (op === "box") {
    if ((why = whyGamble(h, "box", 0, day)).length) return no(g, pi, why);
    const price = boxPrice(h.lv);
    h.coins -= price;
    h.bag.day.box += 1;
    let msg, got;
    if (Math.random() < BOX.weapon) {
      const gi = pickWeighted(GRADES, (gd) => BOX.grades[gd.id]).id;
      const t = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)].id;
      const r = tierOf(h.lv);
      const w = addWeapon(h, t, r, gi, weaponPrice(t, r, gi));     // 되팔 때는 상점가의 40%
      got = { kind: "weapon", g: gi };
      msg = `${jo(weaponName(w), "이", "가")} 나왔습니다 (Lv ${WEAPON_TIERS[r]})`;
    } else {
      const [id] = pickWeighted(Object.entries(BOX.potions), ([, pct]) => pct);
      h.bag.p[id] = (h.bag.p[id] || 0) + 1;
      got = { kind: "potion", id };
      msg = `${jo(POTION_BY_ID[id].name, "이", "가")} 나왔습니다`;
    }
    bump(h);
    return note(g, pi, { ok: true, game: "box", got, msg: `상자(${won(price)}코인) — ${msg}` });
  }
  if (op === "dice") {
    const bet = Number(req.bet), pick = req.pick === "odd" ? "odd" : "even";
    if ((why = whyGamble(h, "dice", bet, day)).length) return no(g, pi, why);
    h.coins -= bet;
    h.bag.day.dice += 1;
    const edge = Math.random() < DICE.house;
    const roll = 1 + Math.floor(Math.random() * 6);
    const win = !edge && (roll % 2 === 1) === (pick === "odd");
    const pay = win ? bet * DICE.pay : 0;
    h.coins += pay;
    bump(h);
    const msg = edge
      ? `주사위가 모서리에 섰습니다. 집이 가져갑니다 (-${won(bet)})`
      : `${roll} — ${roll % 2 ? "홀" : "짝"}! ${win ? `맞혔습니다 +${won(pay - bet)}` : `틀렸습니다 -${won(bet)}`}`;
    return note(g, pi, { ok: true, game: "dice", roll: edge ? 0 : roll, win, msg });
  }
  if (op === "slot") {
    const bet = Number(req.bet);
    if ((why = whyGamble(h, "slot", bet, day)).length) return no(g, pi, why);
    h.coins -= bet;
    h.bag.day.slot += 1;
    const reels = [0, 1, 2].map(() => pickWeighted(SLOT, (s) => s.w));
    const hit = reels.every((s) => s === reels[0]);
    const pay = hit ? bet * reels[0].mul : 0;
    h.coins += pay;
    bump(h);
    const msg = `${reels.map((s) => s.name).join(" · ")} — ${hit ? `${reels[0].mul}배! +${won(pay - bet)}` : `꽝 -${won(bet)}`}`;
    return note(g, pi, { ok: true, game: "slot", reels: reels.map((s) => s.id), win: hit, msg });
  }
  return note(g, pi, { ok: false, msg: "알 수 없는 요청입니다" });
}

