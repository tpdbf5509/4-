/* ── RPG 방어구 규칙 ─────────────────────────────────────────
   수치는 armorData.js. 효과는 방장이 셈하고, 손님 화면이 걷기를 먼저 그리는 데 필요한 값(이동 속도 · 추격)과
   화면에 띄울 시간(위기 피해 감소 · 부활 대기)은 h.arm 에 담아 스냅샷으로 보낸다(packArmor · applyArmor).
   가방: a 방어구 목록 [{ u 번호, s 부위, g 등급 }] · ae 낀 것 { 부위: 번호 } — 번호는 무기와 같은 bag.n 을 쓴다 */
import { ARMOR_SLOTS, ARMOR_GRADES, ARMOR_BASE, ARMOR_SPECIAL, ARMOR } from "./armorData.js";

export const SLOT_IDS = ARMOR_SLOTS.map((s) => s.id);
const r1 = (v) => Math.round(v * 10) / 10;

// 가방 — 낀 방어구 · 그 등급(없으면 -1)
export const wornArmor = (bag, s) => {
  const u = bag && bag.ae && bag.ae[s];
  return u ? (bag.a || []).find((q) => q.u === u) || null : null;
};
export const armorGrade = (h, s) => { const a = wornArmor(h && h.bag, s); return a ? a.g : -1; };
const special = (h, s) => { const g = armorGrade(h, s); return (ARMOR_SPECIAL[s] && ARMOR_SPECIAL[s][g]) || null; };
const base = (h, s) => { const g = armorGrade(h, s); return g >= 0 ? ARMOR_BASE[s][g] : 0; };
const hpPart = (h) => (h.max > 0 ? h.hp / h.max : 1);

// 가방 정리 — 저장된 기록에서 읽을 때(cleanBag)
export function cleanArmor(d, b, seen) {
  b.a = [];
  b.ae = {};
  (Array.isArray(d.a) ? d.a : []).slice(0, ARMOR.bagMax).forEach((q) => {
    if (!q) return;
    const u = Math.floor(Number(q.u)), g = Math.floor(Number(q.g));
    if (!(u > 0) || seen.has(u) || !SLOT_IDS.includes(q.s) || !(g >= 0 && g < ARMOR_GRADES.length)) return;
    seen.add(u);
    b.a.push({ u, s: q.s, g });
  });
  SLOT_IDS.forEach((s) => {
    const u = Math.floor(Number(d.ae && d.ae[s]));
    if (b.a.some((q) => q.u === u && q.s === s)) b.ae[s] = u;
  });
}

// 방어구 던전 보상 — 부위 s 를 등급 몫(ARMOR_GRADES drop)으로 굴려 가방에 넣는다. 넣은 등급, 가방이 가득이면 -1
export function rollArmor(bag, s, rnd = Math.random()) {
  if (!bag.a) bag.a = [];
  if (bag.a.length >= ARMOR.bagMax) return -1;
  let r = rnd * 100, g = 0;
  for (; g < ARMOR_GRADES.length - 1; g++) { r -= ARMOR_GRADES[g].drop; if (r < 0) break; }
  bag.a.push({ u: bag.n++, s, g });
  bag.v += 1;
  return g;
}

/* ── 효과 ─────────────────────────────────────────────── */
// 최대 체력 배율 — 투구
export const armorHpMul = (h) => 1 + base(h, "head");
// 받는 피해 배율 — 갑옷 기본 감소 × 위기 감소(영웅 · 전설, 시간이 남아 있을 때)
export function armorTakeMul(h) {
  let mul = 1 - base(h, "body");
  const sp = special(h, "body");
  if (sp && h.arm && h.arm.cri > 0) mul *= 1 - sp.cut;
  return mul;
}
// 공격력 배율 — 바지(기본 + 낮은 체력일 때 더) · 전설 신발
export function armorAtkMul(h) {
  let add = base(h, "legs");
  const legs = special(h, "legs");
  if (legs && hpPart(h) <= legs.below) add += legs.atk;
  const feet = special(h, "feet");
  if (feet && feet.atk) add += feet.atk;
  return 1 + add;
}
// 공격 속도 — 전설 바지 · 전설 신발. 평타 간격을 (1 + 이 값)으로 나눈다
export const armorAspd = (h) => ((special(h, "legs") || {}).aspd || 0) + ((special(h, "feet") || {}).aspd || 0);

// 이동 속도에 더하는 몫 — 신발 기본 + 추격(최근 맞힌 몹 쪽으로 걸을 때). 방장 · 손님 모두 h.arm 으로 셈한다
export function armorSpeed(h, dx, dy) {
  const A = h && h.arm;
  if (!A) return 0;
  let add = A.spd || 0;
  if (A.cht > 0 && A.chs > 0 && (dx || dy)) {
    const tx = A.chx - h.x, ty = A.chy - h.y;
    if (tx * dx + ty * dy > 0) add += A.chs;      // 그 몹 쪽으로 걷는다
  }
  return add;
}

/* ── 방장 — 시간 · 사건 ──────────────────────────────────── */
const newArm = () => ({ spd: 0, chs: 0, cht: 0, chx: 0, chy: 0, chm: 0, cri: 0, criCd: 0, revCd: 0 });
// 매 판정마다 — 신발 값을 다시 읽고 시간을 줄인다. 추격하는 몹의 자리는 mobAt(id) 로 따라간다
export function armorTick(h, dt, mobAt) {
  if (!h.arm) h.arm = newArm();
  const A = h.arm;
  A.spd = base(h, "feet");
  const feet = special(h, "feet");
  A.chs = feet ? feet.spd : 0;
  A.cht = feet ? Math.max(0, A.cht - dt) : 0;
  if (A.cht > 0 && A.chm) {
    const m = mobAt(A.chm);
    if (m) { A.chx = m.x; A.chy = m.y; }
  }
  A.cri = Math.max(0, A.cri - dt);
  A.criCd = Math.max(0, A.criCd - dt);
  A.revCd = Math.max(0, A.revCd - dt);
}
// 몹을 맞혔을 때 — 영웅 · 전설 신발의 추격 시간을 쌓는다
export function armorOnHit(h, m) {
  const feet = special(h, "feet");
  if (!feet || !m) return;
  if (!h.arm) h.arm = newArm();
  const A = h.arm;
  A.cht = Math.min(feet.max, A.cht + feet.per);
  A.chm = m.id; A.chx = m.x; A.chy = m.y;
}
// 몹을 잡았을 때 — 영웅 · 전설 투구의 회복. 되찾은 체력을 돌려준다
export function armorOnKill(h, boss) {
  const sp = special(h, "head");
  if (!sp || h.down > 0) return 0;
  const before = h.hp;
  h.hp = Math.min(h.max, h.hp + h.max * (boss ? sp.boss : sp.mob));
  return h.hp - before;
}
// 맞은 뒤 — 위기 피해 감소를 켠다. 쓰러졌는데 전설 갑옷이면 한 번 일어난다. "revive" · "crisis" · "" 를 돌려준다
export function armorOnHurt(h, pvp) {
  const sp = special(h, "body");
  if (!sp) return "";
  if (!h.arm) h.arm = newArm();
  const A = h.arm;
  if (h.hp <= 0) {
    if (!sp.revive || pvp || A.revCd > 0) return "";
    h.hp = Math.max(1, Math.round(h.max * sp.revive.hp));
    h.inv = Math.max(h.inv || 0, sp.revive.inv);
    A.revCd = sp.revive.cd;
    return "revive";
  }
  if (A.criCd <= 0 && hpPart(h) <= sp.below) {
    A.cri = sp.dur;
    A.criCd = sp.cd;
    return "crisis";
  }
  return "";
}

/* ── 주고받기 — [신발, 추격 몫, 추격 남은 초, 몹 x, y, 위기 남은 초, 위기 대기, 부활 대기] 또는 0 ── */
export function packArmor(h) {
  const A = h.arm;
  if (!A || !(A.spd || A.chs || A.cht > 0 || A.cri > 0 || A.criCd > 0 || A.revCd > 0)) return 0;
  return [A.spd, A.chs, r1(A.cht), Math.round(A.chx), Math.round(A.chy), r1(A.cri), Math.ceil(A.criCd), Math.ceil(A.revCd)];
}
export function applyArmor(h, row) {
  if (!Array.isArray(row)) { h.arm = null; return; }
  h.arm = { spd: row[0] || 0, chs: row[1] || 0, cht: row[2] || 0, chx: row[3] || 0, chy: row[4] || 0, chm: 0,
    cri: row[5] || 0, criCd: row[6] || 0, revCd: row[7] || 0 };
}
