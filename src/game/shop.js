/* ── RPG 광장 상점 규칙 ─────────────────────────────────────
   무기상점 · 스킬 상점 · 물약 상점 · 도박장 · 무기 강화소. 수치는 shopData.js · itemData.js 에 있다.
   사고팔기 · 도박은 방장이 판정한다(rpgShop). 화면은 같은 조건 함수(why*)로 막힌 이유를 미리 보여 준다.
   가방(h.bag)은 이름과 함께 이 기기에 남고, 바뀔 때만 손님에게 보낸다. */
import {
  SHOPS, SHOP_REACH, DAY_TZ_HOURS, WEAPON_TYPES, GRADES, WEAPON_TIERS, WEAPON, DEAL, SPECIAL, SPECIALS,
  SKILL_FAMS, SKILLS, POTIONS, POTION, CASINO, BOX, DICE, SLOT, SCROLLS, WARP, GUARD,
} from "./shopData.js";
import { MATERIALS, MAT_BY_ID, MAT_MAX, ENHANCE, enhRate, enhDown } from "./itemData.js";
// rpg.js 와 서로 불러 쓴다 — 아래 이름들은 함수 안에서만 쓴다(불러오는 순서에 기대지 않게)
import { STATS, statValue, statSpent, noStats, refreshHp, fx, dist, MAPS } from "./rpg.js";
import { ARMOR_SLOTS, ARMOR_GRADES, ARMOR, armorName } from "./armorData.js";
import { cleanArmor, wornArmor } from "./armor.js";

export const SHOP_BY_ID = Object.fromEntries(SHOPS.map((s) => [s.id, s]));
export const WEAPON_BY_ID = Object.fromEntries(WEAPON_TYPES.map((t) => [t.id, t]));
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const FAM_BY_ID = Object.fromEntries(SKILL_FAMS.map((f) => [f.id, f]));
export const POTION_BY_ID = Object.fromEntries(POTIONS.map((p) => [p.id, p]));
export const SPECIAL_BY_ID = Object.fromEntries(SPECIALS.map((sp) => [sp.id, sp]));
export const SCROLL_BY_ID = Object.fromEntries(SCROLLS.map((sc) => [sc.id, sc]));
const BUFF_STATS = ["str", "int", "crit"];          // 버프 물약이 올릴 수 있는 스탯
// 시간이 흐르고 손님에게 보내는 물약 효과 — 스탯 셋 + spd 이속(a = 빨라지는 몫) · hide 투명화. 뒤에만 더한다(스냅샷 차례)
const BUFF_KEYS = [...BUFF_STATS, "spd", "hide"];
// 물약 효과가 남아 있는가 — 이속은 빨라지는 몫, 투명화는 1 또는 0
export const buffLeft = (h, k) => (h && h.bf && h.bf[k] && h.bf[k].t > 0 ? h.bf[k].a || 1 : 0);
export const speedMul = (h) => 1 + (h && h.bf && h.bf.spd && h.bf.spd.t > 0 ? h.bf.spd.a : 0);
// 투명화를 쓸 수 없는 곳 — 결투장(pvp) · 결투 중 · 던전(dungeon)
const noHide = (h) => !!((h.dvs !== undefined && h.dvs >= 0) || (MAPS[h.map] && (MAPS[h.map].pvp || MAPS[h.map].dungeon)));

const statDef = (id) => STATS.find((t) => t.id === id);
const statName = (id) => statDef(id).name;
const fmtStat = (id, v) => statDef(id).fmt(v);
const won = (n) => Math.round(n).toLocaleString("ko-KR");
const isInt = (v) => Number.isInteger(v);
// 받침에 맞는 조사 — jo("검", "을", "를") → "검을"
const ROMAN_TAIL = { I: true, II: false, III: true };   // 끝이 로마 숫자면 읽는 소리로 — 일(받침 있음) · 이(없음) · 삼(있음)
export function jo(word, a, b) {
  const roman = String(word).match(/\s(I{1,3})$/);
  if (roman) return `${word}${ROMAN_TAIL[roman[1]] ? a : b}`;
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

/* 특별 무기 — 단계는 레벨 제한에서, 올리는 양 · 값은 같은 단계 · 등급의 일반 무기에 SPECIAL 배율을 곱한다.
   치명타처럼 상한이 있는 스탯은 그 스탯을 쓰는 일반 무기 종류의 배율(mul)도 함께 곱한다. */
export const specialTier = (sp) => Math.max(0, WEAPON_TIERS.indexOf(sp.lv));
export function specialBonus(sp) {
  const statMul = (WEAPON_TYPES.find((t) => t.stat === sp.stat) || { mul: 1 }).mul;
  const pts = (WEAPON.pts + WEAPON.ptsPerTier * specialTier(sp)) * GRADES[sp.g].mul * statMul * SPECIAL.mul;
  return Math.max(1, Math.round(pts)) * statDef(sp.stat).per;
}
export function specialPrice(sp) {
  const raw = WEAPON.price * Math.pow(WEAPON.priceGrow, specialTier(sp)) * GRADES[sp.g].price * SPECIAL.price;
  return Math.max(10, Math.round(raw / 10) * 10);
}
// 내 레벨로 낄 수 있는 특별 무기
export const specialsFor = (lv) => SPECIALS.filter((sp) => lv >= sp.lv);
export const specialArt = (sp) => `/assets/game/rpg/weapons/${sp.art}.webp`;

// 가방의 무기 한 자루 — 특별 무기면 sp 가 붙어 있다
export const specOf = (w) => (w && w.sp ? SPECIAL_BY_ID[w.sp] || null : null);
export const weaponStat = (w) => (specOf(w) ? specOf(w).stat : WEAPON_BY_ID[w.t].stat);
// 강화 — +1 마다 올려 주는 스탯이 ENHANCE.per 만큼 는다. 정수 스탯은 정수로, 치명타 확률은 0.1 단위로 맞춘다
export const enhMul = (w) => 1 + ENHANCE.per * ((w && w.up) || 0);
export function itemBonus(w) {
  const base = specOf(w) ? specialBonus(specOf(w)) : weaponBonus(w.t, w.r, w.g);
  if (!w.up) return base;
  const v = base * enhMul(w);
  return Number.isInteger(statDef(weaponStat(w)).per) ? Math.round(v) : Math.round(v * 10) / 10;
}
const baseName = (w) => (specOf(w) ? specOf(w).name : `${GRADES[w.g].name} ${WEAPON_BY_ID[w.t].name}`);
export const weaponName = (w) => (w.up ? `+${w.up} ${baseName(w)}` : baseName(w));
export const weaponLine = (w) => `${statName(weaponStat(w))} +${fmtStat(weaponStat(w), itemBonus(w))}`;
export const weaponArt = (w) => (specOf(w) ? specialArt(specOf(w)) : null);
export const sellPrice = (w) => Math.floor(w.p * WEAPON.sellRate);

// 날짜로 정해지는 수 — 같은 날에는 누구에게나 같은 종류 · 등급이 나온다
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// 오늘의 특가 — 특별 무기 날이면 내 레벨로 낄 수 있는 특별 무기 하나, 아니면 내 레벨 단계의 일반 무기
const dealCut = (full) => Math.round((full * (1 - DEAL.discount)) / 10) * 10;
export function dealOf(lv, day = todayKey()) {
  const h = hashStr(`deal:${day}`);
  const own = specialsFor(lv);
  if (own.length && (hashStr(`deal-special:${day}`) % 1000) / 1000 < DEAL.special) {
    const sp = own[h % own.length];
    const full = specialPrice(sp);
    return { sp: sp.id, t: sp.t, r: specialTier(sp), g: sp.g, full, price: dealCut(full), key: `${day}/${sp.id}` };
  }
  const t = WEAPON_TYPES[h % WEAPON_TYPES.length].id;
  const g = DEAL.grades[Math.floor(h / WEAPON_TYPES.length) % DEAL.grades.length];
  const r = tierOf(lv);
  const full = weaponPrice(t, r, g);
  return { t, r, g, full, price: dealCut(full), key: `${day}/${t}/${r}/${g}` };
}

/* ── 가방 ──────────────────────────────────────────────────
   w 무기 목록 [{ u 번호, t 종류, r 단계, g 등급, p 산 값, sp 특별 무기 id(있을 때만) }] · e 장착한 무기 번호(0 은 맨손)
   무기의 up 은 강화 단계(0 이면 강화하지 않음, 있을 때만)
   p 물약 { id: 개수 } · qs 물약 칸 [물약 id 또는 ""] · s 스킬 { id: 레벨 } · m 재료 { id: 개수 } · wp 지역 워프권 남은 횟수 · day 오늘 쓴 횟수 · n 다음 무기 번호 · v 바뀔 때마다 오르는 판 번호
   oc 는 직업과 다른 무기 정리를 마쳤는지(업데이트 뒤 처음 들어올 때 한 번, rpg.js rpgJoin)
   ld 는 저장된 기록을 실었는지 — 싣기 전의 빈 가방으로 기록을 덮지 않게 한다 */
export const newBag = () => ({ w: [], e: 0, a: [], ae: {}, p: {}, qs: [], s: {}, m: {}, wp: 0, gd: 0, day: { d: "", box: 0, dice: 0, slot: 0, deal: 0 }, n: 1, v: 0, ld: 0, oc: 0 });
export function cleanBag(d) {
  const b = newBag();
  if (!d || typeof d !== "object") return b;
  const n0 = Math.max(1, Math.floor(Number(d.n) || 1));
  const seen = new Set();
  (Array.isArray(d.w) ? d.w : []).slice(0, WEAPON.bagMax).forEach((w) => {
    if (!w) return;
    const sp = w.sp ? SPECIAL_BY_ID[w.sp] : null;
    if (w.sp && !sp) return;
    if (!sp && !WEAPON_BY_ID[w.t]) return;
    const u = Math.floor(Number(w.u)), p = Math.max(0, Math.floor(Number(w.p) || 0));
    if (!(u > 0) || seen.has(u)) return;
    const up = Math.min(ENHANCE.max, Math.max(0, Math.floor(Number(w.up) || 0)));
    const add = (q) => { seen.add(u); if (up) q.up = up; b.w.push(q); };
    if (sp) return add({ u, t: sp.t, r: specialTier(sp), g: sp.g, p, sp: sp.id });   // 특별 무기는 종류 · 단계 · 등급을 표에서 다시 읽는다
    const r = Math.floor(Number(w.r)), g = Math.floor(Number(w.g));
    if (!(r >= 0 && r < WEAPON_TIERS.length) || !(g >= 0 && g < GRADES.length)) return;
    add({ u, t: w.t, r, g, p });
  });
  cleanArmor(d, b, seen);                         // 방어구 — 번호는 무기와 같은 셈을 쓴다
  b.n = Math.max(n0, ...b.w.map((w) => w.u + 1), ...b.a.map((q) => q.u + 1));
  b.e = seen.has(Number(d.e)) ? Number(d.e) : 0;
  POTIONS.forEach((p) => {
    const c = Math.floor(Number(d.p && d.p[p.id]) || 0);
    if (c > 0) b.p[p.id] = Math.min(POTION.stackMax, c);
  });
  SKILLS.forEach((s) => {
    const l = Math.floor(Number(d.s && d.s[s.id]) || 0);
    if (l > 0) b.s[s.id] = Math.min(s.gold.length, l);
  });
  MATERIALS.forEach((m) => {
    const c = Math.floor(Number(d.m && d.m[m.id]) || 0);
    if (c > 0) b.m[m.id] = Math.min(MAT_MAX, c);
  });
  b.wp = Math.min(WARP.max, Math.max(0, Math.floor(Number(d.wp) || 0)));
  b.gd = Math.min(GUARD.max, Math.max(0, Math.floor(Number(d.gd) || 0)));
  b.qs = Array.from({ length: POTION.slots }, (_, i) => (Array.isArray(d.qs) && POTION_BY_ID[d.qs[i]] ? d.qs[i] : ""));
  const dy = d.day || {};
  if (typeof dy.d === "string") {
    b.day = { d: dy.d.slice(0, 10) };
    ["box", "dice", "slot", "deal"].forEach((k) => { b.day[k] = Math.max(0, Math.floor(Number(dy[k]) || 0)); });
  }
  b.v = Math.max(0, Math.floor(Number(d.v) || 0));
  b.oc = d.oc ? 1 : 0;
  return b;
}
export const equipped = (bag) => (bag.e ? bag.w.find((w) => w.u === bag.e) || null : null);
// 재료를 넣는다 — 종류마다 MAT_MAX 개까지. 실제로 넣은 수를 돌려준다
export function addMat(bag, id, n) {
  if (!MAT_BY_ID[id] || !(n > 0)) return 0;
  if (!bag.m) bag.m = {};
  const have = bag.m[id] || 0;
  const got = Math.min(n, MAT_MAX - have);
  if (got > 0) { bag.m[id] = have + got; bag.v += 1; }
  return got;
}
export const matCount = (bag, id) => (bag && bag.m && bag.m[id]) || 0;

/* ── 스탯에 더해지는 몫 — 장착한 무기 + 패시브 스킬 + 버프 물약 ── */
export function extraStat(h, id) {
  let v = 0;
  const bag = h.bag;
  if (bag) {
    const w = equipped(bag);
    if (w && weaponStat(w) === id) v += itemBonus(w);
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
  if (h.bf.hide && noHide(h)) delete h.bf.hide;   // 결투장 · 던전에 들어가면 투명화가 풀린다
  BUFF_KEYS.forEach((k) => {
    const b = h.bf[k];
    if (b && b.t > 0) { b.t = Math.max(0, b.t - dt); if (b.t <= 0) delete h.bf[k]; }
  });
}
// 주고받기 — [물리 남은 초, 양, 마법 …, 치명 …, 이속 …, 투명화 …] 또는 0
export function packBuffs(h) {
  if (!h.bf || !BUFF_KEYS.some((k) => h.bf[k] && h.bf[k].t > 0)) return 0;
  return BUFF_KEYS.flatMap((k) => (h.bf[k] && h.bf[k].t > 0 ? [Math.ceil(h.bf[k].t), h.bf[k].a] : [0, 0]));
}
export function applyBuffs(h, row) {
  h.bf = {};
  if (!Array.isArray(row)) return;
  BUFF_KEYS.forEach((k, i) => { if (row[i * 2] > 0) h.bf[k] = { t: row[i * 2], a: row[i * 2 + 1] }; });
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

// 특별 무기 사기 — 무기상점에서 코인으로 바로 산다. 같은 무기는 한 자루만
export function whySpecialBuy(h, id) {
  const out = [];
  base(h, "weapon", out);
  const sp = SPECIAL_BY_ID[id];
  if (!sp) { out.push("없는 무기입니다"); return out; }
  if (!h || !h.bag) return out;
  if (h.bag.w.some((w) => w.sp === id)) { out.push("이미 가지고 있습니다"); return out; }
  if (h.lv < sp.lv) out.push(`레벨 ${sp.lv} 필요 (지금 ${h.lv})`);
  if (h.bag.w.length >= WEAPON.bagMax) out.push(`가방이 가득 찼습니다 (${WEAPON.bagMax}개)`);
  lackCoin(h, specialPrice(sp), out);
  return out;
}
// 오늘의 특가 사기 — key 는 화면이 본 특가. 그사이 날짜나 내 레벨 단계가 바뀌었으면 막는다
export function whyDealBuy(h, key, day = todayKey()) {
  const out = [];
  base(h, "weapon", out);
  if (!h || !h.bag) return out;
  const d = dealOf(h.lv, day);
  if (key !== d.key) out.push("오늘의 특가가 바뀌었습니다");
  if (usedToday(h.bag, "deal", day) >= DEAL.perDay) out.push(`오늘의 특가는 하루 ${DEAL.perDay}번까지입니다`);
  if (h.bag.w.length >= WEAPON.bagMax) out.push(`가방이 가득 찼습니다 (${WEAPON.bagMax}개)`);
  lackCoin(h, d.price, out);
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

// 주문서 사기 · 워프 — 워프는 어디서나 쓴다(쓰러졌거나 결투 중이면 안 된다)
export function whyScrollBuy(h, id) {
  const out = [];
  base(h, "scroll", out);
  const sc = SCROLL_BY_ID[id];
  if (!sc) { out.push("없는 주문서입니다"); return out; }
  if (!h || !h.bag) return out;
  if ((h.bag.wp || 0) + sc.n > WARP.max) out.push(`워프권은 ${WARP.max}회까지 가질 수 있습니다`);
  lackCoin(h, sc.price, out);
  return out;
}
export function whyWarp(h, to) {
  const out = [];
  base(h, null, out);
  if (!WARP.maps.includes(to) || !MAPS[to]) { out.push("갈 수 없는 지역입니다"); return out; }
  if (!h || !h.bag) return out;
  if ((h.dvs !== undefined && h.dvs >= 0) || (MAPS[h.map] && MAPS[h.map].pvp)) out.push("결투 중에는 쓸 수 없습니다");
  else if (MAPS[h.map] && MAPS[h.map].dungeon) out.push("던전에서는 쓸 수 없습니다");
  else if (h.map === to) out.push("이미 이 지역에 있습니다");
  if (!(h.bag.wp > 0)) out.push("지역 워프권이 없습니다");
  return out;
}

// 무기 강화 — u 무기를 stone 강화석으로 한 단계 올린다
export const enhFee = (w) => ENHANCE.fee * (((w && w.up) || 0) + 1);
export function whyEnhance(h, u, stone) {
  const out = [];
  base(h, "forge", out);
  if (!h || !h.bag) return out;
  const w = h.bag.w.find((q) => q.u === u);
  if (!w) { out.push("가방에 없는 무기입니다"); return out; }
  if (w.u !== h.bag.e) { out.push("장착한 무기만 강화할 수 있습니다"); return out; }   // 강화소는 낀 무기 하나만 올린다
  const next = (w.up || 0) + 1;
  if (next > ENHANCE.max) { out.push(`+${ENHANCE.max} 이 최고 단계입니다`); return out; }
  if (!ENHANCE.stones[stone]) { out.push("강화석을 골라 주세요"); return out; }
  if (!enhRate(stone, next)) out.push(`${MAT_BY_ID[stone].name}은 +${ENHANCE.stones[stone].length} 까지만 올립니다`);
  if (matCount(h.bag, stone) < 1) out.push(`${MAT_BY_ID[stone].name}이 없습니다`);
  lackCoin(h, enhFee(w), out);
  return out;
}
// 재료 팔기 — 무기 강화소에서 판다
export function whyMatSell(h, id, n) {
  const out = [];
  base(h, "forge", out);
  const m = MAT_BY_ID[id];
  if (!m) { out.push("없는 재료입니다"); return out; }
  if (!m.sell) { out.push("팔 수 없는 재료입니다"); return out; }
  if (!isInt(n) || n < 1) out.push("팔 수를 정해 주세요");
  else if (matCount(h && h.bag, id) < n) out.push("가진 수가 모자랍니다");
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
  else if (p.kind === "hide" && noHide(h)) out.push("결투장 · 던전에서는 마실 수 없습니다");
  return out;
}
// 방어구 — 끼기 · 빼기는 어디서나(쓰러졌으면 안 된다), 되팔기는 무기상점에서
export function whyArmorWear(h, u) {
  const out = [];
  base(h, null, out);
  if (!h || !h.bag) return out;
  if (!(h.bag.a || []).some((q) => q.u === u)) out.push("가방에 없는 방어구입니다");
  return out;
}
export function whyArmorSell(h, u) {
  const out = [];
  base(h, "weapon", out);
  if (!h || !h.bag) return out;
  if (!(h.bag.a || []).some((q) => q.u === u)) out.push("가방에 없는 방어구입니다");
  return out;
}
// 관리자 시험용 — 방어구 16종을 한 번에 받는다(던전이 생기기 전까지 시험하려고)
export function whyArmorGive(h) {
  const out = [];
  if (!h || !h.bag) return out;
  if (!h.admin) out.push("관리자만 받을 수 있습니다");
  else if ((h.bag.a || []).length + ARMOR_SLOTS.length * ARMOR_GRADES.length > ARMOR.bagMax) out.push(`가방 방어구 칸이 모자랍니다(${ARMOR.bagMax}개까지)`);
  return out;
}
// 하락 방지권 사기 — 주문서 상점
export function whyGuardBuy(h) {
  const out = [];
  base(h, "scroll", out);
  if (!h || !h.bag) return out;
  if ((h.bag.gd || 0) >= GUARD.max) out.push(`${GUARD.name}은 ${GUARD.max}장까지 가질 수 있습니다`);
  lackCoin(h, GUARD.price, out);
  return out;
}

// 랜덤 상자에서 나오는 몫 — 내 레벨로 낄 특별 무기가 없으면 그 몫은 일반 무기로 간다
export function boxShares(lv) {
  const sp = specialsFor(lv).length ? BOX.special : 0;
  return { special: sp, weapon: BOX.weapon + (BOX.special - sp), potion: 1 - BOX.special - BOX.weapon };
}
// 랜덤 상자 값 — 내용물 상점가의 기댓값 ÷ 목표 기댓값
export function boxValue(lv) {
  const r = tierOf(lv);
  const share = boxShares(lv);
  const own = specialsFor(lv);
  const sEv = own.length ? own.reduce((a, sp) => a + specialPrice(sp), 0) / own.length : 0;
  const wsum = BOX.grades.reduce((a, b) => a + b, 0);
  const wEv = BOX.grades.reduce((acc, pct, g) =>
    acc + (pct / wsum) * (WEAPON_TYPES.reduce((s, t) => s + weaponPrice(t.id, r, g), 0) / WEAPON_TYPES.length), 0);
  const psum = Object.values(BOX.potions).reduce((a, b) => a + b, 0);
  const pEv = Object.entries(BOX.potions).reduce((acc, [id, pct]) => acc + (pct / psum) * POTION_BY_ID[id].price, 0);
  return share.special * sEv + share.weapon * wEv + share.potion * pEv;
}
export const boxPrice = (lv) => Math.round(boxValue(lv) / CASINO.evTarget / 10) * 10;
// 게임별 기댓값(건 금액 대비) — 화면에 공개하고 시험에도 쓴다
export function casinoEv(lv = 1) {
  const sw = SLOT.reduce((a, s) => a + s.w, 0);
  return {
    box: boxValue(lv) / boxPrice(lv),
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
function addWeapon(h, t, r, g, paid, sp) {
  const w = { u: h.bag.n++, t, r, g, p: paid };
  if (sp) w.sp = sp;
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

  // 특별 무기는 코인으로 바로 산다
  if (op === "spbuy") {
    if ((why = whySpecialBuy(h, req.id)).length) return no(g, pi, why);
    const sp = SPECIAL_BY_ID[req.id];
    const price = specialPrice(sp);
    h.coins -= price;
    addWeapon(h, sp.t, specialTier(sp), sp.g, price, sp.id);
    bump(h);
    fx(g, h.map, { kind: "text", x: h.x, y: h.y - 90, text: `-${won(price)} 코인`, color: "#f3d27f", t: 0.9, life: 0.9, snd: "coin", who: pi });
    return note(g, pi, { ok: true, msg: `${jo(sp.name, "을", "를")} 샀습니다 (${won(price)}코인)` });
  }
  // 일반 무기는 오늘의 특가로 산다 — 레벨 단계별 상점 목록은 없앴다
  if (op === "deal") {
    if ((why = whyDealBuy(h, req.key, day)).length) return no(g, pi, why);
    const d = dealOf(h.lv, day);
    const price = d.price, r = d.r;
    h.bag.day.deal += 1;
    const w = addWeapon(h, d.t, d.r, d.g, price, d.sp);
    h.coins -= price;
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
    const great = (p.kind === "heal" || p.kind === "buff") && Math.random() < POTION.greatChance;
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
    } else if (p.kind === "speed") {
      const cur = h.bf.spd;
      h.bf.spd = { t: p.dur, a: Math.max(p.amt, cur && cur.t > 0 ? cur.a : 0) };   // 다시 마시면 시간은 새로, 양은 큰 쪽
      msg = `${p.dur}초 동안 이동 속도 +${Math.round(h.bf.spd.a * 100)}%`;
    } else if (p.kind === "hide") {
      const cur = h.bf.hide;
      h.bf.hide = { t: Math.max(p.dur, cur && cur.t > 0 ? cur.t : 0), a: 1 };     // 다시 마시면 남은 시간과 새 시간 가운데 긴 쪽
      fx(g, h.map, { kind: "nova", x: h.x, y: h.y - 20, r: 44, color: "#cfd8e6", n: 8, t: 0.5, life: 0.5, who: pi });
      msg = `${Math.ceil(h.bf.hide.t)}초 동안 몹이 알아채지 못합니다(보스도)`;
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

  // 물약 칸 — i 번째 칸에 물약을 넣거나(id) 뺀다(""). 어디서나 한다
  if (op === "qset") {
    const i = Math.floor(Number(req.i)), id = String(req.id || "");
    if (!(i >= 0 && i < POTION.slots) || (id && !POTION_BY_ID[id])) return no(g, pi, ["잘못된 물약 칸입니다"]);
    if (!Array.isArray(h.bag.qs)) h.bag.qs = [];
    for (let k = 0; k < POTION.slots; k++) if (h.bag.qs[k] === undefined || (id && h.bag.qs[k] === id)) h.bag.qs[k] = "";   // 같은 물약은 한 칸에만
    h.bag.qs[i] = id;
    bump(h);
    return note(g, pi, { ok: true, msg: id ? `${jo(POTION_BY_ID[id].name, "을", "를")} 물약 칸 ${i + 1}에 넣었습니다` : `물약 칸 ${i + 1}을 비웠습니다` });
  }
  // 방어구 끼기 — 같은 부위에 낀 것은 빠진다. 이미 낀 것을 다시 누르면 뺀다
  if (op === "awear") {
    const u = Number(req.u);
    if ((why = whyArmorWear(h, u)).length) return no(g, pi, why);
    const a = h.bag.a.find((q) => q.u === u);
    const wasFull = h.hp >= h.max;
    if (!h.bag.ae) h.bag.ae = {};
    const off = h.bag.ae[a.s] === u;
    if (off) delete h.bag.ae[a.s]; else h.bag.ae[a.s] = u;
    bump(h);
    hpChanged(h, wasFull);
    return note(g, pi, { ok: true, msg: off ? `${jo(armorName(a.s, a.g), "을", "를")} 뺐습니다` : `${jo(armorName(a.s, a.g), "을", "를")} 꼈습니다` });
  }
  if (op === "asell") {
    const u = Number(req.u);
    if ((why = whyArmorSell(h, u)).length) return no(g, pi, why);
    const a = h.bag.a.find((q) => q.u === u);
    const wasFull = h.hp >= h.max;
    if (wornArmor(h.bag, a.s) === a) delete h.bag.ae[a.s];
    h.bag.a = h.bag.a.filter((q) => q.u !== u);
    const price = ARMOR_GRADES[a.g].sell;
    h.coins += price;
    bump(h);
    hpChanged(h, wasFull);
    fx(g, h.map, { kind: "text", x: h.x, y: h.y - 90, text: `+${won(price)} 코인`, color: "#f3d27f", t: 0.9, life: 0.9, snd: "coin", who: pi });
    return note(g, pi, { ok: true, msg: `${jo(armorName(a.s, a.g), "을", "를")} ${won(price)}코인에 팔았습니다` });
  }
  if (op === "agive") {
    if ((why = whyArmorGive(h)).length) return no(g, pi, why);
    ARMOR_GRADES.forEach((gr) => ARMOR_SLOTS.forEach((sl) => { h.bag.a.push({ u: h.bag.n++, s: sl.id, g: gr.id }); }));
    bump(h);
    return note(g, pi, { ok: true, msg: `시험용 방어구 ${ARMOR_SLOTS.length * ARMOR_GRADES.length}개를 받았습니다` });
  }
  // 주문서 상점 — 하락 방지권
  if (op === "gdbuy") {
    if ((why = whyGuardBuy(h)).length) return no(g, pi, why);
    h.coins -= GUARD.price;
    h.bag.gd = (h.bag.gd || 0) + 1;
    bump(h);
    fx(g, h.map, { kind: "text", x: h.x, y: h.y - 90, text: `-${won(GUARD.price)} 코인`, color: "#f3d27f", t: 0.9, life: 0.9, snd: "coin", who: pi });
    return note(g, pi, { ok: true, msg: `${jo(GUARD.name, "을", "를")} 샀습니다 (${h.bag.gd}장)` });
  }
  // 주문서 상점 — 지역 워프권
  if (op === "scbuy") {
    if ((why = whyScrollBuy(h, req.id)).length) return no(g, pi, why);
    const sc = SCROLL_BY_ID[req.id];
    h.coins -= sc.price;
    h.bag.wp = (h.bag.wp || 0) + sc.n;
    bump(h);
    fx(g, h.map, { kind: "text", x: h.x, y: h.y - 90, text: `-${won(sc.price)} 코인`, color: "#f3d27f", t: 0.9, life: 0.9, snd: "coin", who: pi });
    return note(g, pi, { ok: true, msg: `${jo(sc.name, "을", "를")} 샀습니다 (워프권 ${h.bag.wp}회)` });
  }
  // 워프 — 고른 지역의 입구로 옮겨 간다
  if (op === "warp") {
    const to = String(req.to || "");
    if ((why = whyWarp(h, to)).length) return no(g, pi, why);
    const M = MAPS[to];
    h.bag.wp -= 1;
    bump(h);
    fx(g, h.map, { kind: "ring", x: h.x, y: h.y - 10, r: 60, color: "#bfe6ff", t: 0.5, life: 0.5 });
    h.map = to;
    h.x = M.spawn[0] + (Math.random() - 0.5) * 60; h.y = M.spawn[1] + (Math.random() - 0.5) * 30;
    h.hold = []; h.dash = 0; h.gateCd = 1.5;
    fx(g, to, { kind: "ring", x: h.x, y: h.y - 10, r: 60, color: "#bfe6ff", t: 0.6, life: 0.6, snd: "bless", who: pi });
    return note(g, pi, { ok: true, msg: `${jo(M.name, "으로", "로")} 워프했습니다 (남은 ${h.bag.wp}회)` });
  }
  // 무기 강화소 — 실패하면 강화석 · 코인이 사라지고, 높은 단계에서는 일정 확률로 한 단계 떨어진다(enhDown)
  if (op === "enh") {
    const u = Number(req.u), stone = String(req.stone || "");
    if ((why = whyEnhance(h, u, stone)).length) return no(g, pi, why);
    const w = h.bag.w.find((q) => q.u === u);
    const cur = w.up || 0, next = cur + 1, fee = enhFee(w), rate = enhRate(stone, next);
    h.coins -= fee;
    h.bag.m[stone] -= 1;
    if (h.bag.m[stone] <= 0) delete h.bag.m[stone];
    const ok = Math.random() * 100 < rate;
    const drop = !ok && cur > 0 && Math.random() * 100 < enhDown(next);
    const saved = drop && !!req.guard && (h.bag.gd || 0) > 0;     // 하락 방지권 — 떨어질 때만 한 장 쓴다
    const fall = drop && !saved;
    if (saved) h.bag.gd -= 1;
    const wasFull = h.hp >= h.max;
    if (ok) w.up = next;
    else if (fall) { if (cur - 1 > 0) w.up = cur - 1; else delete w.up; }
    bump(h);
    hpChanged(h, wasFull);
    fx(g, h.map, ok
      ? { kind: "call", x: h.x, y: h.y - 110, text: `강화 성공! +${next}`, color: "#ffd873", t: 1.2, life: 1.2, snd: "clear", who: pi }
      : { kind: "call", x: h.x, y: h.y - 110, text: fall ? `강화 실패 · +${cur - 1} 로 하락` : saved ? "강화 실패 · 방지권으로 지킴" : "강화 실패", color: "#d9b8a8", t: 1.1, life: 1.1, who: pi });
    const nm = baseName(w);
    const tail = `(${rate}% · ${won(fee)}코인)`;
    return note(g, pi, { ok: true, enh: ok ? 1 : fall ? -1 : 0, msg: ok
      ? `강화 성공! ${nm} +${next} ${tail}`
      : fall ? `강화 실패 — ${nm} +${cur} 에서 +${cur - 1} 로 떨어졌습니다 ${tail}`
        : saved ? `강화 실패 — ${GUARD.name}으로 +${cur} 을 지켰습니다(남은 ${h.bag.gd}장) ${tail}`
          : `강화 실패 — ${nm} +${cur} 그대로 ${tail}` });
  }
  if (op === "msell") {
    const id = String(req.id || ""), n = Number(req.n);
    if ((why = whyMatSell(h, id, n)).length) return no(g, pi, why);
    const m = MAT_BY_ID[id];
    h.bag.m[id] -= n;
    if (h.bag.m[id] <= 0) delete h.bag.m[id];
    const got = m.sell * n;
    h.coins += got;
    bump(h);
    fx(g, h.map, { kind: "text", x: h.x, y: h.y - 90, text: `+${won(got)} 코인`, color: "#f3d27f", t: 0.9, life: 0.9, snd: "coin", who: pi });
    return note(g, pi, { ok: true, msg: `${m.name} ${n}개를 ${won(got)}코인에 팔았습니다` });
  }

  // 도박장
  if (op === "box") {
    if ((why = whyGamble(h, "box", 0, day)).length) return no(g, pi, why);
    const price = boxPrice(h.lv);
    h.coins -= price;
    h.bag.day.box += 1;
    let msg, got;
    const share = boxShares(h.lv);
    const roll = Math.random();
    if (roll < share.special) {
      const own = specialsFor(h.lv);
      const sp = own[Math.floor(Math.random() * own.length)];
      addWeapon(h, sp.t, specialTier(sp), sp.g, specialPrice(sp), sp.id);   // 되팔 때는 특별 무기 값의 40%
      got = { kind: "special", id: sp.id };
      msg = `특별 무기! ${jo(sp.name, "이", "가")} 나왔습니다 (${GRADES[sp.g].name} · Lv ${sp.lv})`;
      fx(g, h.map, { kind: "call", x: h.x, y: h.y - 110, text: `${sp.name}!`, color: "#ffd873", t: 1.4, life: 1.4, snd: "clear", who: pi });
    } else if (roll < share.special + share.weapon) {
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

