/* ── RPG 심연의 탑 강화 카드 — 판정 (수치는 abyssCardData.js) ─────────────
   h.ac 가 있는 동안(탑 안)만 듣는다. 탑을 나오면 지운다(acEnd).
   h.ac = { c 번호 → 등급(1 브론즈 · 2 골드 · 3 다이아, 저주 포함), o 보이는 선택지, ok 0 강화 · 1 저주,
            q 남은 강화 카드 고르기, cq 남은 저주 선택, rr 새로고침, sh · shT 카드 보호막,
            gr 숙성 { a 공격 · h 체력 · p 성장통 · pend [[남은 층, 몫]] }, ch 여분 대시, ls 마지막 버팀목을 썼는가,
            ph 탑 단계(go · next · fail), big 정예 · 보스가 있는가, t 판정용 시계 · 셈(손님에게 가지 않는다) }
   스냅샷은 rpg.js rpgPack 의 ac 줄(acPack · acUnpack). 방장만 판정하고 손님은 고른 카드 · 선택지 · 보호막만 받는다.
   rpg.js 의 함수(피해 · 몹 찾기 · 연출)는 acBind 로 받는다 — 서로 불러오면 고리가 생긴다 */
import { GRACE, CARDS, CARD_BY_N, CURSE_FROM, isCurse, ELITE } from "./abyssCardData.js";

let E = null;
export function acBind(e) { E = e; }

/* ── 값 ───────────────────────────────────────────── */
// 그 카드의 지금 등급 값(없으면 0) — 다이아 기준 수치를 등급으로 낮춘 값. 단위는 카드 글과 같다(대개 %)
export function V(h, n) {
  const t = h && h.ac && h.ac.c[n];
  return t ? CARD_BY_N[n].tv[t - 1] : 0;
}
const P = (h, n) => V(h, n) / 100;
const hpR = (h) => (h.max > 0 ? h.hp / h.max : 1);
const runGo = (h) => h.ac && h.ac.ph === "go";

/* 스탯 배율 — 방장 · 손님이 같이 쓴다(손님은 대쉬를 먼저 그린다) */
export function acAtkMul(h) {
  if (!h || !h.ac) return 1;
  const r = hpR(h);
  let p = V(h, 1) - V(h, 171) + (h.ac.gr ? h.ac.gr.a : 0);
  if (r >= 0.9) p += V(h, 21);
  if (r <= 0.3) p += V(h, 22);
  return Math.max(0.1, 1 + p / 100);
}
export function acAspdMul(h) {
  if (!h || !h.ac) return 1;
  const t = h.ac.t || {};
  let p = V(h, 2) + V(h, 94) - V(h, 172);
  if ((t.killT ?? 99) < 5) p += V(h, 27);
  if (h.ac.sh > 0) p += V(h, 36);
  if (t.moving) p += V(h, 95);
  if ((t.dodgeT ?? 99) < 3) p += V(h, 99);
  return Math.max(0.2, 1 + p / 100);
}
export function acRangeMul(h) { return h && h.ac ? Math.max(0.3, 1 + (V(h, 3) - V(h, 173)) / 100) : 1; }
export function acAreaMul(h) { return h && h.ac ? Math.max(0.3, 1 + (V(h, 4) - V(h, 174)) / 100) : 1; }
export function acHpMul(h) {
  if (!h || !h.ac) return 1;
  const gr = h.ac.gr || {};
  const p = V(h, 41) - V(h, 177) + (gr.h || 0) + (gr.p || 0) + (h.ac.big ? V(h, 158) : 0);
  return Math.max(0.2, 1 + p / 100);
}
export function acSpeedMul(h) {
  if (!h || !h.ac) return 1;
  const t = h.ac.t || {};
  let p = V(h, 81) - V(h, 180);
  if (hpR(h) <= 0.3) p += V(h, 87);
  if ((t.killT ?? 99) < 3) p += V(h, 88);
  if (runGo(h) && (t.ft ?? 99) < 8) p += V(h, 89);
  return Math.max(0.3, 1 + p / 100);
}
export const acDashDist = (h) => (h && h.ac ? Math.max(0.3, 1 + (V(h, 82) - V(h, 182)) / 100) : 1);
export const acDashCd = (h) => (h && h.ac ? Math.max(0.2, 1 - (V(h, 83) - V(h, 181)) / 100) : 1);
// 스킬 대기 — 쓸 때 한 번 부른다(민첩한 준비 98 은 여기서 쓴다)
export function acSkillCd(h, cd) {
  if (!h || !h.ac) return cd;
  const t = h.ac.t || {};
  let mul = Math.max(0.3, 1 - (V(h, 101) + V(h, 93) - V(h, 183)) / 100);
  if (t.agile) { mul *= 1 - P(h, 98); t.agile = 0; }
  return cd * mul;
}
export const acSkArea = (h) => (h && h.ac ? 1 + P(h, 102) : 1);
export const acSkReach = (h) => (h && h.ac ? 1 + P(h, 104) : 1);
export const acZoneSlow = (h) => (h && h.ac ? 1 + P(h, 103) : 1);   // 깔린 스킬은 이 배만큼 천천히 사라진다
export const acFly = (h) => (h && h.ac ? 1 / (1 + P(h, 105)) : 1);
// 치명타 — hitMob 이 더한다
export function acCritAdd(h, m, skill) {
  if (!h || !h.ac) return 0;
  let p = V(h, 5) - V(h, 175);
  if (m && m.hp <= m.max * 0.5) p += V(h, 40);
  if (skill) p += V(h, 109);
  if ((h.ac.t?.stillT || 0) >= 2) p += V(h, 156);
  return p / 100;
}
export function acCdmgAdd(h, skill) {
  if (!h || !h.ac) return 0;
  return (V(h, 6) - V(h, 176) + (skill ? V(h, 110) : 0)) / 100;
}
// 내가 거는 상태이상 — soak · 카드가 같이 쓴다
export const acBurnMul = (h) => (h && h.ac ? 1 + P(h, 126) : 1);
export const acPoisonMul = (h) => (h && h.ac ? 1 + P(h, 127) : 1);
export const acDotDur = (h) => (h && h.ac ? 1 + P(h, 131) : 1);
export const acSlowDur = (h) => (h && h.ac ? 1 + P(h, 129) : 1);
export const acStunDur = (h) => (h && h.ac ? 1 + P(h, 130) : 1);
// 내게 걸리는 상태이상 — ccHero 가 부른다
export function acCc(h, c) {
  if (!h || !h.ac) return c;
  const o = { ...c };
  if (o.slow) o.slow *= 1 - P(h, 90);
  const st = 1 - P(h, 91);
  if (o.stun) o.stun *= st;
  if (o.bind) o.bind *= st;
  if (o.air) o.air *= st;
  if (o.kb) o.kb = [o.kb[0], o.kb[1], o.kb[2] * (1 - P(h, 92))];
  return o;
}

/* ── 상태 ─────────────────────────────────────────── */
const freshT = () => ({ ft: 0, hurtT: 99, healT: 99, killT: 99, dashT: 99, dodgeT: 99, stillT: 0, moveT: 0, moving: 0, walk: 0,
  nearN: 0, last1: 0, scanT: 0, kills: 0, atkN: 0, hitN: 0, skN: 0, beat: 0, afterSk: 0, flow: 0, dashHit: 0, breach: 0, charged: 0,
  lastM: -1, chainN: 0, hm: new Map(), first: -1, eliteBuff: 0, flaw: 0, flawOn: 0, hurtN: 0, emerg: 0, aid: 0, crisis: 0,
  rep: {}, lastSk: "", rdy: {}, cast: null, regenT: 0, fullT: 0, spikeT: 0, bleedT: 0, chT: 0, agile: 0, px: null, py: null, healFx: 0 });
export function acStart(g, h) {
  h.ac = { c: {}, o: [], ok: 0, q: GRACE.start, cq: 0, rr: 0, sh: 0, shT: 0, gr: { a: 0, h: 0, p: 0, pend: [] }, ch: 0, ls: 0, ph: "next", big: 0, v: 1, t: freshT() };
  acNext(g, h);
}
const tOf = (h) => h.ac.t || (h.ac.t = freshT());
// 체력 비율을 지키며 최대 체력을 다시 셈한다
function refreshKeep(h) {
  const r = hpR(h);
  E.refreshHp(h, false);
  if (h.down <= 0) h.hp = Math.max(1, Math.min(h.max, Math.round(r * h.max)));
}
// 탑을 나왔다 — 입장료 환급 · 추가를 셈하고 카드를 지운다
export function acEnd(g, h) {
  if (!h || !h.ac) return;
  const p = V(h, 164) - V(h, 191);
  h.ac = null;
  E.refreshHp(h, false);
  if (!p || h.admin || !h.loaded) return;
  const d = Math.round((E.fee * p) / 100);
  h.coins = Math.max(0, h.coins + d);
  E.sys(g, h.pi, d > 0 ? `검소한 등반가 — 입장료 ${d.toLocaleString("ko-KR")}코인을 돌려받았습니다.` : `탐욕스러운 상인 — 입장료 ${(-d).toLocaleString("ko-KR")}코인을 더 냈습니다.`);
}

/* ── 선택지 ───────────────────────────────────────── */
const canHave = (h, c) => (h.ac.c[c.n] || 0) < 3 && (!c.jobs || c.jobs.includes(h.job));
function pickN(list, n) {
  const a = list.slice(), out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}
function cardOffer(h) {
  const pool = CARDS.filter((c) => !c.curse && canHave(h, c));
  const out = pickN(pool, GRACE.offer).map((c) => c.n);
  const up = P(h, 166);
  if (up > 0) {                                   // 높은 안목 — 가진 카드의 다음 등급으로 바꾼다
    const own = pool.filter((c) => h.ac.c[c.n] && !out.includes(c.n));
    for (let i = 0; i < out.length && own.length; i++) {
      if (h.ac.c[out[i]] || Math.random() >= up) continue;
      out[i] = own.splice(Math.floor(Math.random() * own.length), 1)[0].n;
    }
  }
  return out;
}
const curseOffer = (h) => pickN(CARDS.filter((c) => c.curse && canHave(h, c)), GRACE.curseOffer).map((c) => c.n);
// 다음 선택지 — 저주가 남았으면 저주부터
export function acNext(g, h) {
  const A = h.ac;
  if (!A || A.o.length) return;
  if (A.cq > 0) {
    const o = curseOffer(h);
    if (o.length) { A.o = o; A.ok = 1; A.dl = GRACE.pickTime; A.v++; return; }
    A.cq = 0;
  }
  if (A.q > 0) {
    const o = cardOffer(h);
    if (o.length) { A.o = o; A.ok = 0; A.dl = GRACE.pickTime; A.v++; return; }
    A.q = 0;
  }
}
// 고르기 — op "card" i(선택지 차례) · "curse" i(-1 은 거절) · "reroll"
// 고르는 시간 — 탑이 카드 단계(pick)일 때 tickAbyss 가 부른다. 시간이 지나면 강화 카드는 무작위, 저주는 거절
export function acPickTick(g, h, dt) {
  const A = h && h.ac;
  if (!A || !A.o.length) return false;
  A.dl = (A.dl ?? GRACE.pickTime) - dt;
  if (A.dl <= 0) acChoose(g, h, A.ok === 1 ? "curse" : "card", A.ok === 1 ? -1 : Math.floor(Math.random() * A.o.length));
  return !!(h.ac && h.ac.o.length);
}
export function acChoose(g, h, op, i) {
  const A = h && h.ac;
  if (!A) return false;
  if (op === "reroll") {
    if (A.ok !== 0 || !A.o.length || A.rr <= 0) return false;
    A.rr -= 1; A.o = []; acNext(g, h);
    return true;
  }
  if (!A.o.length || (op === "curse") !== (A.ok === 1)) return false;
  if (op === "curse" && i === -1) {               // 저주 거절 — 더 고르는 카드도 없다
    A.cq = Math.max(0, A.cq - 1); A.o = []; A.v++;
    acNext(g, h);
    return true;
  }
  const n = A.o[i | 0];
  const c = CARD_BY_N[n];
  if (!c || !canHave(h, c)) return false;
  const was = A.c[n] || 0, tier = was + 1;
  A.c[n] = tier;
  A.o = []; A.v++;
  if (c.curse) { A.cq = Math.max(0, A.cq - 1); A.q += GRACE.curseBonus; }
  else A.q = Math.max(0, A.q - 1);
  onPick(g, h, n, was, tier);
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 130, text: `${c.name} · ${["", "브론즈", "골드", "다이아"][tier]}`, color: c.curse ? "#d8a0c8" : ["", "#e0b48a", "#f0d27a", "#bfe8f6"][tier], t: 1.3, life: 1.3, snd: c.curse ? "over" : "coin", who: h.pi });
  acNext(g, h);
  return true;
}
function onPick(g, h, n, was, tier) {
  const A = h.ac, c = CARD_BY_N[n];
  const tv = (t) => (t > 0 ? c.tv[t - 1] : 0);
  if (n === 165) A.rr += 1;
  if (n === 84 && was === 0) A.ch = 1;
  if (n === 167) A.gr.pend.push([5, tv(tier) - tv(was)]);
  if ([41, 177, 158, 167, 169].includes(n)) refreshKeep(h);
}

/* ── 회복 · 보호막 ─────────────────────────────────── */
export function acHealMul(h) {
  if (!h || !h.ac) return 1;
  let p = V(h, 68) - V(h, 185) + V(h, 76) * (1 - hpR(h));
  if (h.ac.ph === "next") p += V(h, 69) - V(h, 189);
  return Math.max(0, 1 + p / 100);
}
// 카드 회복 — amt 는 체력 수치
function heal(g, h, amt) {
  if (!(amt > 0) || h.down > 0) return;
  const got = amt * acHealMul(h);
  const room = h.max - h.hp;
  h.hp = Math.min(h.max, h.hp + got);
  const t = tOf(h);
  t.healT = 0;
  if (got > room && V(h, 73)) {                   // 넘치는 생명 — 넘친 몫을 보호막으로
    const cap = h.max * 0.15;
    if (h.ac.sh < cap) { h.ac.sh = Math.min(cap, h.ac.sh + (got - room) * P(h, 73)); h.ac.shT = Math.max(h.ac.shT, shieldLife(h)); }
  }
  t.healFx += Math.min(got, room);
  if (t.healFx >= h.max * 0.02) {
    E.fx(g, h.map, { kind: "heal", x: h.x, y: h.y - 56, text: `+${Math.round(t.healFx)}`, t: 0.7, life: 0.7, who: h.pi });
    t.healFx = 0;
  }
}
const shieldLife = (h) => GRACE.shieldTime * (1 + P(h, 54));
// 카드 보호막 — frac 은 최대 체력 몫. 최대 체력의 절반을 넘지 않는다
function shield(g, h, frac) {
  if (!(frac > 0) || h.down > 0) return;
  const amt = h.max * frac * Math.max(0, 1 + P(h, 53) - P(h, 186));
  if (amt <= 0) return;
  h.ac.sh = Math.min(h.max * 0.5, (h.ac.sh || 0) + amt);
  h.ac.shT = shieldLife(h);
  E.fx(g, h.map, { kind: "ring", x: h.x, y: h.y - 30, r: 42, color: "#bfe0ff", t: 0.45, life: 0.45, who: h.pi });
}

/* ── 주는 피해 — hitMob 이 치명타 전에 곱한다 ─────────────────
   % 보너스는 모두 더한 뒤 한 번 곱한다(카드가 쌓여도 곱절로 불지 않게). 공격력 카드는 physMul 쪽 따로 */
let procOn = 0;                                   // 카드가 만든 피해 — 다시 카드 효과를 부르지 않는다
const statusOf = (m) => (m.burn > 0 ? 1 : 0) + (m.poison > 0 ? 1 : 0) + (m.acB > 0 ? 1 : 0) + (m.slow > 0 || m.freeze > 0 ? 1 : 0) + (m.stun > 0 ? 1 : 0) + (m.shred > 0 ? 1 : 0);
export function acDeal(g, h, m, skill, dot, side) {
  if (!h || !h.ac || !m) return m && m.acMk > 0 ? 1 + m.acMkV : 1;
  const t = tOf(h);
  const basic = !skill && !dot && !side && !procOn;
  const isElite = !!m.elite, isBoss = !!m.boss;
  let p = V(h, 7) + V(h, 10);
  if (basic) p += V(h, 8);
  if (skill) p += V(h, 9) - V(h, 184);
  if (m.hp >= m.max) p += V(h, 11);
  if (m.hp <= m.max * 0.25) p += V(h, 12);
  if (m.max > h.max) p += V(h, 13);
  if (isElite) p += V(h, 14);
  if (isBoss) p += V(h, 15);
  if (!isElite && !isBoss) p += V(h, 16);
  const d = E.dist(h.x, h.y, m.x, m.y);
  if (d <= GRACE.near) p += V(h, 17);
  if (d >= GRACE.far) p += V(h, 18);
  if (basic) {
    if (m.id === t.lastM) p += V(h, 19) * t.chainN;
    if (t.beat) p += V(h, 20);
    if (t.afterSk) p += V(h, 38);
    if (t.dashHit) p += V(h, 86) + V(h, 152);
    if (t.charged) p += V(h, 155);
  }
  if (t.hurtT < 4) p += V(h, 23);
  if (t.hurtT >= 8) p += V(h, 24);
  if (t.nearN === 1) p += V(h, 25) - V(h, 198);
  if (t.nearN >= 4) p += V(h, 26);
  if (t.eliteBuff) p += V(h, 28);
  if (runGo(h)) { if (t.ft < 10) p += V(h, 29); if (t.ft > 30) p += V(h, 30); }
  if (m.slow > 0 || m.freeze > 0) p += V(h, 31);
  if (m.stun > 0 || m.freeze > 0) p += V(h, 32);
  if (m.acB > 0) p += V(h, 33);
  if (m.burn > 0) p += V(h, 34);
  if (m.poison > 0) p += V(h, 35);
  if (m.wall > 0) p += V(h, 37);
  const st = statusOf(m);
  if (st >= 1) p += V(h, 132);
  if (st >= 2) p += V(h, 133);
  if (m.id === t.first) p += V(h, 149);
  if ((t.hm.get(m.id) || 0) >= 10) p += V(h, 150);
  if (t.last1) p += V(h, 159);
  if (t.flawOn) p += V(h, 160);
  if (skill && t.cast && t.cast.w > 0) p += t.cast.bonus;
  let mul = Math.max(0.1, 1 + p / 100);
  if (m.acMk > 0) mul *= 1 + m.acMkV;             // 저주받은 표식 — 누가 쳐도
  mul /= 1 + P(h, 192);                           // 두꺼운 심연 — 적 체력이 늘어난 만큼
  if (isElite) mul /= 1 + P(h, 195) / 2;
  if (isBoss) mul /= 1 + P(h, 196);
  return mul;
}
// 카드가 만든 피해 — 옆으로 튄 피해(side)로 친다
function proc(g, h, m, raw) {
  if (!m || m.dead || !(raw > 0)) return;
  procOn++;
  try { E.hitMob(g, h.pi, m, raw, false, false, false, true); } finally { procOn--; }
}
const others = (g, h, m, r, n) => E.nearMobs(g, h.map, m.x, m.y, r).filter((q) => q !== m).slice(0, n);
function stunMob(g, h, m, sec) {
  if (!m || m.dead) return;
  m.stun = Math.max(m.stun, sec * acStunDur(h));
  if (V(h, 138)) others(g, h, m, 160, 6).forEach((q) => { q.slow = Math.max(q.slow, V(h, 138) * acSlowDur(h)); });
}
// 맞힌 뒤 — 흡혈 · 셈 · 확률 효과. dmg 는 실제로 깎인 피해
export function acAfterHit(g, h, m, dmg, skill, dot, side, crit) {
  if (!h || !h.ac || !m) return;
  const t = tOf(h);
  if (dot) return;
  if (!skill && !procOn) heal(g, h, dmg * P(h, 66));
  if (skill) heal(g, h, dmg * P(h, 67));
  if (t.hurtT < 3) heal(g, h, dmg * P(h, 72));
  if (procOn || side) return;
  if (t.first < 0) t.first = m.id;
  t.hm.set(m.id, (t.hm.get(m.id) || 0) + 1);
  const atk = E.atk(h);
  if (skill) {
    if (V(h, 140)) { m.acMk = 5; m.acMkV = Math.max(m.acMk > 0 ? m.acMkV || 0 : 0, P(h, 140)); }
    if (t.cast && t.cast.w > 0) { t.cast.ids.add(m.id); t.cast.sum += dmg; t.cast.last = m; }
    if (V(h, 108)) proc(g, h, others(g, h, m, 180, 1)[0], dmg * P(h, 108));
    if (V(h, 119)) others(g, h, m, 80, 5).forEach((q) => proc(g, h, q, dmg * P(h, 119)));
  } else {
    if (m.id === t.lastM) t.chainN = Math.min(10, t.chainN + 1); else { t.chainN = 0; t.lastM = m.id; }
    t.hitN += 1;
    if (V(h, 39) && t.hitN % 8 === 0) t.flow = 1;
    if (V(h, 78) && t.hitN % 20 === 0) heal(g, h, h.max * P(h, 78));
    if (V(h, 145) && t.hitN % 15 === 0) {
      const list = E.nearMobs(g, h.map, h.x, h.y, 900);
      const q = list[Math.floor(Math.random() * list.length)];
      if (q) { E.fx(g, h.map, { kind: "zap", x0: q.x, y0: q.y - 240, x1: q.x, y1: q.y - 10, color: "#ffe27a", t: 0.3, life: 0.3, snd: "zap" }); proc(g, h, q, atk * P(h, 145)); }
    }
    if (V(h, 151) && t.hm.get(m.id) % 12 === 0) stunMob(g, h, m, V(h, 151));
    if (V(h, 121) && Math.random() < 0.1) {       // 불씨 — 3초 화상(0.5초마다 깎는 기존 불 피해를 쓴다)
      const dur = 3 * acDotDur(h);
      m.burn = Math.max(m.burn, dur); m.bdps = Math.max(m.bdps, (atk * P(h, 121) / 3) * acBurnMul(h)); m.bby = h.pi;
    }
    if (V(h, 122) && Math.random() < 0.1) {
      const dur = 5 * acDotDur(h);
      m.poison = Math.max(m.poison, dur); m.pdps = Math.max(m.pdps, (atk * P(h, 122) / 5) * acPoisonMul(h)); m.pby = h.pi;
    }
    if (V(h, 124) && Math.random() < P(h, 124)) m.slow = Math.max(m.slow, 2 * acSlowDur(h));
    if (V(h, 125) && Math.random() < P(h, 125)) stunMob(g, h, m, 0.5);
    if (V(h, 147) && Math.random() < 0.1) proc(g, h, m, dmg * P(h, 147));
    if (V(h, 106) && E.ranged(h)) proc(g, h, others(g, h, m, 160, 1)[0], dmg * P(h, 106));
  }
  if (crit) {
    if (V(h, 123)) { const dur = 3 * acDotDur(h); m.acB = Math.max(m.acB || 0, dur); m.acBd = Math.max(m.acBd || 0, (atk * P(h, 123) / 3) * (1 + P(h, 128))); m.acBby = h.pi; m.acBt = m.acBt || 0.5; }
    if (V(h, 137) && (m.slow > 0 || m.freeze > 0)) proc(g, h, m, atk * P(h, 137));
    if (V(h, 148)) proc(g, h, others(g, h, m, 180, 1)[0], dmg * P(h, 148));
  }
}
// 평타를 낼 때마다(heroAttack) — 박자 · 전술 전환 · 대시 뒤 첫 공격은 이번 평타까지
export function acOnAttack(g, h) {
  if (!h || !h.ac) return;
  const t = tOf(h);
  t.afterSk = t.nextAfterSk || 0; t.nextAfterSk = 0;
  t.dashHit = t.nextDash || 0; t.breach = t.dashHit; t.nextDash = 0;
  t.charged = t.nextCharged || 0; t.nextCharged = 0;
  t.atkN += 1;
  t.beat = t.atkN % 6 === 0 ? 1 : 0;              // 5회마다 다음(6번째) 평타
  if (V(h, 144) && t.atkN % 10 === 0) {           // 충격파 — 앞쪽 둘레
    const dir = h.dir || 1, x = h.x + dir * 140;
    E.fx(g, h.map, { kind: "nova", x, y: h.y - 10, r: 150, color: "#e8dcc0", n: 10, t: 0.4, life: 0.4, snd: "boom" });
    E.nearMobs(g, h.map, x, h.y, 150).forEach((q) => proc(g, h, q, E.atk(h) * P(h, 144)));
  }
}
// 스킬을 쓸 때(산 스킬 · 필살기 · 무기 스킬) — 이번 스킬의 보너스를 정한다
export function acOnSkill(g, h, id) {
  if (!h || !h.ac) return;
  const t = tOf(h);
  closeCast(g, h);
  let bonus = 0;
  if (t.flow) { bonus += V(h, 39); t.flow = 0; }
  const n = t.rep[id] || 0;
  bonus += Math.min(V(h, 115) * 5, V(h, 115) * n);
  t.rep[id] = n + 1;
  if (t.lastSk && t.lastSk !== id) bonus += V(h, 116);
  t.lastSk = id;
  if ((t.rdy[id] || 0) >= 5) bonus += V(h, 120);
  t.rdy[id] = 0;
  if (V(h, 98) && t.moveT >= 3) t.agile = 1;
  t.nextAfterSk = 1;
  t.skN += 1;
  if (V(h, 154) && t.skN % 5 === 0) shield(g, h, P(h, 154));
  t.cast = { id, w: GRACE.castWin, bonus, ids: new Set(), sum: 0, last: null };
}
// 스킬 한 번이 끝났다 — 맞은 적 수로 집중 폭격 · 다중 타격 · 주문 관통
function closeCast(g, h) {
  const t = tOf(h), c = t.cast;
  if (!c) return;
  t.cast = null;
  if (c.ids.size === 1 && c.last && !c.last.dead) {
    if (V(h, 117)) proc(g, h, c.last, c.sum * P(h, 117));
    if (V(h, 107)) proc(g, h, others(g, h, c.last, 200, 1)[0], c.sum * P(h, 107));
  }
  if (c.ids.size >= 4 && V(h, 118) && h.scd && h.scd[c.id] > 0) h.scd[c.id] *= 1 - P(h, 118);
}
export function acOnDash(g, h) {
  if (!h || !h.ac) return;
  const t = tOf(h);
  t.dashT = 0; t.nextDash = 1;
}
// 대시 충전 — startDash 가 대기 중일 때 여분을 쓴다
export function acUseCharge(h) {
  if (!h || !h.ac || !(h.ac.ch > 0)) return false;
  h.ac.ch -= 1;
  if (h.ac.t) h.ac.t.chT = 0;
  return true;
}

/* ── 받는 피해 — hurtHero 가 부른다. 0 이면 피했거나 막았다 ────────────
   kind: "sk" 예고 기술 · "el" 원소 기술(브레스 · 독액 · 저주) */
export function acTake(g, h, dmg, src, kind) {
  if (!h || !h.ac || !(dmg > 0)) return dmg;
  const t = tOf(h);
  const dodge = (V(h, 58) + (t.dashT < 2 ? V(h, 85) : 0)) / 100;
  if (dodge > 0 && Math.random() < dodge) {
    t.dodgeT = 0;
    E.say(g, h.map, h.x, h.y - 80, "회피", "#cfe6ff");
    return 0;
  }
  let def = V(h, 42) - V(h, 178);
  if (t.hurtT < 3) def += V(h, 57);
  if (t.healT < 3) def += V(h, 79);
  if (t.hurtN >= 5) def += V(h, 157);
  const dm = def >= 0 ? 1 / (1 + def / 100) : 1 - def / 100;
  let p = V(h, 179) - V(h, 43) + V(h, 193);
  const mob = src && src.type !== undefined ? src : null;
  if (mob) {
    if (mob.elite) p += V(h, 195) - V(h, 44);
    else if (mob.boss) p -= V(h, 45);
    else p += V(h, 194) - V(h, 46);
    const d = E.dist(h.x, h.y, mob.x, mob.y);
    if (d <= GRACE.near) p -= V(h, 47);
    if (d >= GRACE.far) { p -= V(h, 48); if (t.dashT < 2) p -= V(h, 100); }
  } else if (src && src.boss) p -= V(h, 45);
  if (kind === "sk" || kind === "el") p -= V(h, 97);
  if (kind === "el") p -= V(h, 49);
  if (hpR(h) <= 0.3) p -= V(h, 50);
  if (t.stillT >= 2) p -= V(h, 55);
  if (t.moving) p -= V(h, 56);
  if (runGo(h)) {
    if (t.ft < 10) p += V(h, 197);
    if (V(h, 200) && t.ft > 45) { const [a, b] = V(h, 200); p += Math.min(b, a * Math.floor((t.ft - 45) / 15)); }
  }
  if (t.nearN >= 4) p += V(h, 199);
  dmg *= dm * Math.max(0.1, 1 + p / 100);
  if (V(h, 59)) dmg = Math.min(dmg, h.max * P(h, 59));
  if (h.ac.sh > 0) {                              // 카드 보호막이 먼저 받는다
    const take = Math.min(h.ac.sh, dmg);
    h.ac.sh -= take; dmg -= take;
    if (h.ac.sh <= 0.5) {
      h.ac.sh = 0; h.ac.shT = 0;
      if (V(h, 143)) {                            // 복수의 파편
        E.fx(g, h.map, { kind: "nova", x: h.x, y: h.y - 10, r: 180, color: "#bfe0ff", n: 12, t: 0.5, life: 0.5, snd: "boom" });
        E.nearMobs(g, h.map, h.x, h.y, 180).forEach((q) => proc(g, h, q, E.atk(h) * P(h, 143)));
      }
    }
  }
  return dmg;
}
// 맞은 뒤(h.hp 를 깎은 바로 뒤) — 마지막 버팀목 · 비상 장벽 · 응급처치 · 위기 대응 · 되받아치기
export function acAfterHurt(g, h, dmg, src) {
  if (!h || !h.ac) return;
  const t = tOf(h);
  t.hurtT = 0; t.hurtN += 1;
  if (h.hp <= 0 && V(h, 60) && !h.ac.ls) {
    h.ac.ls = 1; h.hp = 1; h.inv = Math.max(h.inv || 0, V(h, 60));
    E.say(g, h.map, h.x, h.y - 96, "마지막 버팀목!", "#ffe3a0");
    return;
  }
  if (h.hp <= 0) return;
  const r = hpR(h);
  if (r < 0.3 && V(h, 52) && !t.emerg) { t.emerg = 1; shield(g, h, P(h, 52)); }
  if (r < 0.5 && V(h, 75) && !t.aid) { t.aid = 1; heal(g, h, h.max * P(h, 75)); }
  if (r < 0.3 && V(h, 114) && !t.crisis && h.scd) {
    t.crisis = 1;
    for (const k in h.scd) h.scd[k] *= 1 - P(h, 114);
    h.sk = (h.sk || 0) * (1 - P(h, 114));
    E.say(g, h.map, h.x, h.y - 110, "위기 대응 주문", "#cfe0ff");
  }
  const mob = src && src.type !== undefined && !src.dead ? src : null;
  if (mob && V(h, 141) && E.dist(h.x, h.y, mob.x, mob.y) <= GRACE.near + (mob.rad || 0)) proc(g, h, mob, E.atk(h) * P(h, 141));
}

/* ── 처치 — killMob 이 부른다. got 은 보상을 받는 사람들, pi 는 막타 ── */
export function acOnKill(g, m, pi, got) {
  (got || []).forEach((h) => {
    if (!h || !h.ac) return;
    const t = tOf(h);
    t.killT = 0; t.kills += 1;
    if (V(h, 63) && t.kills % 10 === 0) heal(g, h, h.max * P(h, 63));
    if (m.elite) {
      t.eliteBuff = 1;
      heal(g, h, h.max * P(h, 64));
      if (V(h, 113) && h.scd) for (const k in h.scd) h.scd[k] *= 1 - P(h, 113);
      if (V(h, 163) && Math.random() < P(h, 163)) E.shard(g, h, 1);
    }
    if (m.boss) heal(g, h, h.max * P(h, 65));
    if (V(h, 112) && h.scd) {
      let k0 = null;
      for (const k in h.scd) if (h.scd[k] > 0 && (k0 === null || h.scd[k] > h.scd[k0])) k0 = k;
      if (k0 !== null) h.scd[k0] = Math.max(0, h.scd[k0] - V(h, 112));
    }
    if (statusOf(m) > 0) heal(g, h, h.max * P(h, 139));
    if (V(h, 161) && Math.random() < P(h, 161) * (1 - P(h, 190))) E.shard(g, h, 1);
    if (V(h, 96)) h.coins += Math.round((m.coin || 0) * P(h, 96));
  });
  const h = g.heroes[pi];
  if (!h || !h.ac) return;
  const atk = E.atk(h);
  if (V(h, 134) && m.poison > 0) {               // 전염
    const k = h.ac.c[134], pow = [0, 0.6, 0.75, 1][k];
    others(g, h, m, 200, V(h, 134)).forEach((q) => { q.poison = Math.max(q.poison, m.poison); q.pdps = Math.max(q.pdps, m.pdps * pow); q.pby = h.pi; });
  }
  if (V(h, 135) && m.burn > 0) {
    E.fx(g, m.map, { kind: "burst", x: m.x, y: m.y - 10, r: 90, color: "#ffb070", n: 10, t: 0.4, life: 0.4, snd: "boom" });
    others(g, h, m, 120, 8).forEach((q) => proc(g, h, q, atk * P(h, 135)));
  }
  if (V(h, 136) && m.acB > 0) {
    const q = others(g, h, m, 220, 1)[0];
    if (q) { q.acB = Math.max(q.acB || 0, m.acB); q.acBd = Math.max(q.acBd || 0, m.acBd * P(h, 136)); q.acBby = h.pi; q.acBt = 0.5; }
  }
  if (V(h, 146) && Math.random() < 0.1) {
    E.fx(g, m.map, { kind: "nova", x: m.x, y: m.y - 10, r: 130, color: "#f0c890", n: 10, t: 0.4, life: 0.4, snd: "boom" });
    others(g, h, m, 130, 8).forEach((q) => proc(g, h, q, atk * P(h, 146)));
  }
}
// 몹의 카드 상태 — 출혈(0.5초마다) · 표식 시간. tickMob 이 부른다
export function acMobTick(g, m, dt) {
  if (m.acMk > 0) m.acMk = Math.max(0, m.acMk - dt);
  if (!(m.acB > 0)) return;
  m.acB -= dt; m.acBt = (m.acBt || 0.5) - dt;
  if (m.acBt <= 0) { m.acBt = 0.5; const h = g.heroes[m.acBby]; if (h) { procOn++; try { E.hitMob(g, h.pi, m, m.acBd * 0.5, false, false, true); } finally { procOn--; } } }
  if (m.acB <= 0) { m.acB = 0; m.acBd = 0; }
}

/* ── 층 ───────────────────────────────────────────── */
export function acFloorStart(g, h) {
  if (!h || !h.ac) return;
  const t = tOf(h);
  t.ft = 0; t.first = -1; t.eliteBuff = 0; t.hurtN = 0; t.emerg = 0; t.aid = 0; t.crisis = 0; t.rep = {}; t.hm = new Map();
  t.flawOn = t.flaw; t.flaw = 0; t.kills = t.kills || 0;
  h.ac.ph = "go";
  if (h.down > 0) return;
  shield(g, h, P(h, 51));
  if (V(h, 188)) h.hp = Math.max(1, h.hp * (1 - P(h, 188)));
  if (V(h, 111) && h.scd) { for (const k in h.scd) h.scd[k] *= 1 - P(h, 111); h.sk = (h.sk || 0) * (1 - P(h, 111)); }
}
// 층을 깼다 — 회복 · 숙성 · 다음 카드. 살아 있는 사람만 카드를 받는다
export function acFloorClear(g, h, f) {
  if (!h || !h.ac) return;
  const A = h.ac, t = tOf(h);
  A.ph = "next";
  t.flaw = hpR(h) >= 0.8 && h.down <= 0 ? 1 : 0;
  if (h.down > 0) return;
  heal(g, h, h.max * P(h, 62));
  if (V(h, 74) && A.sh > 0) heal(g, h, A.sh * P(h, 74));
  let hp = false;
  if (V(h, 168)) { const [a, b] = V(h, 168); A.gr.a = Math.min(b, A.gr.a + a); }
  if (V(h, 169)) { const [a, b] = V(h, 169); const was = A.gr.h; A.gr.h = Math.min(b, A.gr.h + a); hp = hp || A.gr.h !== was; }
  A.gr.pend = A.gr.pend.filter((q) => { q[0] -= 1; if (q[0] > 0) return true; A.gr.p += q[1]; hp = true; return false; });
  if (hp) refreshKeep(h);
  A.q += 1;
  if (f % GRACE.curseEvery === 0) A.cq += 1;
  acNext(g, h);
}
// 층 파편 — 층계 수당 · 거물의 전리품 · 금빛 족쇄 · 심연의 이자. 소수는 확률로 끊는다
export function acFloorShards(h, n, guard, f, held) {
  if (!h || !h.ac) return n;
  let x = n * (1 + P(h, 162) + (guard ? P(h, 163) : 0));
  if (V(h, 170)) x += Math.min(GRACE.interestCap(f), held * P(h, 170));
  x *= 1 - P(h, 190);
  const k = Math.floor(x);
  return k + (Math.random() < x - k ? 1 : 0);
}

/* ── 매 틱 — 시계 · 재생 · 가시 · 보호막 시간 ─────────────── */
export function acTick(g, h, dt, run) {
  const A = h.ac, t = tOf(h);
  A.ph = run ? run.phase : A.ph;
  for (const k of ["hurtT", "healT", "killT", "dashT", "dodgeT"]) t[k] += dt;
  if (runGo(h)) t.ft += dt;
  if (A.shT > 0) { A.shT -= dt; if (A.shT <= 0) { A.sh = 0; A.shT = 0; } }
  if (t.cast) { t.cast.w -= dt; if (t.cast.w <= 0) closeCast(g, h); }
  if (h.down > 0) return;
  // 움직임 — 제자리 · 계속 이동 · 걸은 거리
  if (t.px === null) { t.px = h.x; t.py = h.y; }
  const moved = Math.hypot(h.x - t.px, h.y - t.py);
  t.px = h.x; t.py = h.y;
  if (moved > 0.5) {
    t.moving = 1; t.stillT = 0; t.moveT += dt;
    if (V(h, 155)) { t.walk += moved; if (t.walk >= 30 * GRACE.meter) { t.walk = 0; t.nextCharged = 1; } }
  } else { t.moving = 0; t.stillT += dt; t.moveT = 0; }
  // 둘레 몹 수 · 마지막 적 · 정예/보스 — 0.25초마다(몹이 많으면 매 틱 세기가 무겁다)
  t.scanT -= dt;
  if (t.scanT <= 0) {
    t.scanT = 0.25;
    let near = 0, alive = 0, big = 0;
    for (const m of g.mobs) {
      if (m.dead || m.map !== h.map) continue;
      alive++;
      if (m.elite || m.boss) big = 1;
      if (E.dist(h.x, h.y, m.x, m.y) <= GRACE.around) near++;
    }
    t.nearN = near; t.last1 = alive === 1 ? 1 : 0;
    if (big !== A.big) { A.big = big; if (V(h, 158)) refreshKeep(h); }
  }
  // 재생
  if (V(h, 61)) { t.regenT += dt; if (t.regenT >= 5) { t.regenT = 0; heal(g, h, h.max * P(h, 61)); } }
  if (V(h, 70) && hpR(h) <= 0.25) heal(g, h, h.max * P(h, 70) * dt);
  if (V(h, 71) && t.hurtT >= 6) heal(g, h, h.max * P(h, 71) * dt);
  if (V(h, 77) && runGo(h) && t.ft < 10) heal(g, h, h.max * P(h, 77) * dt);
  if (V(h, 80) && h.hp >= h.max) {
    t.fullT += dt;
    if (t.fullT >= 5) { t.fullT = 0; if (A.sh < h.max * P(h, 80) * 5) shield(g, h, Math.min(P(h, 80), P(h, 80) * 5 - A.sh / h.max)); }
  } else t.fullT = 0;
  // 가시 갑옷
  if (V(h, 142) && runGo(h)) {
    t.spikeT += dt;
    if (t.spikeT >= 2) { t.spikeT = 0; E.nearMobs(g, h.map, h.x, h.y, 140).forEach((q) => proc(g, h, q, E.atk(h) * P(h, 142))); }
  }
  // 멈추지 않는 출혈(저주) — 쓰러지지 않는다
  if (V(h, 187) && runGo(h)) {
    t.bleedT += dt;
    if (t.bleedT >= 5) { t.bleedT = 0; h.hp = Math.max(1, h.hp - h.max * P(h, 187)); }
  }
  if (V(h, 153) && hpR(h) <= 0.2 && h.dashCd > 0) h.dashCd = Math.max(0, h.dashCd - dt * P(h, 153));
  if (V(h, 84) && A.ch < 1) { t.chT += dt; if (t.chT >= V(h, 84)) { A.ch = 1; t.chT = 0; } }
  // 힘의 비축 — 쓸 수 있는 스킬을 아낀 시간
  if (V(h, 120) && h.scd) for (const k in h.scd) t.rdy[k] = h.scd[k] > 0 ? 0 : (t.rdy[k] || 0) + dt;
}

/* ── 스냅샷 ───────────────────────────────────────── */
const r1 = (v) => Math.round(v * 10) / 10;
export function acPack(h) {
  const A = h.ac;
  return [Object.entries(A.c).map(([n, t]) => `${n}.${t}`).join(","), A.o, A.ok, A.q, A.cq, A.rr, Math.round(A.sh || 0), A.gr, A.ch, A.ls, A.big, r1(A.shT || 0), r1(Math.max(0, A.dl || 0))];
}
export function acUnpack(h, row) {
  if (!Array.isArray(row)) { h.ac = null; return; }
  const [cs, o, ok, q, cq, rr, sh, gr, ch, ls, big, shT, dl] = row;
  const A = h.ac || (h.ac = { c: {}, t: freshT(), ph: "go" });
  if (A.cs !== cs) {
    A.cs = cs; A.c = {};
    String(cs || "").split(",").filter(Boolean).forEach((s) => { const [n, t] = s.split(".").map(Number); if (CARD_BY_N[n] && t >= 1 && t <= 3) A.c[n] = t; });
  }
  A.o = Array.isArray(o) ? o.filter((n) => CARD_BY_N[n]) : [];
  A.ok = ok ? 1 : 0; A.q = q | 0; A.cq = cq | 0; A.rr = rr | 0; A.sh = sh || 0; A.shT = shT || 0;
  A.gr = gr && typeof gr === "object" ? { a: +gr.a || 0, h: +gr.h || 0, p: +gr.p || 0, pend: Array.isArray(gr.pend) ? gr.pend : [] } : { a: 0, h: 0, p: 0, pend: [] };
  A.ch = ch | 0; A.ls = ls ? 1 : 0; A.big = big ? 1 : 0; A.dl = dl || 0;
}
// 창에 보일 내 카드 — 번호 차례, 저주는 뒤로
export function acOwned(h) {
  if (!h || !h.ac) return [];
  return Object.entries(h.ac.c).map(([n, t]) => ({ n: +n, t })).sort((a, b) => a.n - b.n);
}
export { ELITE, CURSE_FROM, isCurse };
