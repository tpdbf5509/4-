/* node tools/abyss-floor-balance.mjs [층...] [반복]
   심연의 탑 측정 — 1200레벨 4인 파티(검사 · 마법사 · 궁수 · 검사)가 그 층을 처음부터(강화 카드 없이) 깨는 데 걸리는 시간과 성공 여부.
   장비는 +30 용왕 무기 · 용왕 4세트, 스탯은 주 능력 1200 · 치명타 확률 150 · 치명타 피해 1200 · 나머지 체력.
   사람은 가장 가까운 몹으로 걸어가 사거리 안에서 자동 평타 · 무기 스킬 · 스킬을 쿨마다 쓴다. 피하기 · 물약 · 부활은 하지 않는다.
   측정용 표본이다 — 실제 사람은 카드 · 회피 · 위치 잡기로 더 높이 간다 */
import { makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgWeaponSkill, rpgSkill, rpgUseSkill, rpgAbyss, rpgMove, statEarned, STAT_MAX } from "../src/game/rpg.js";
import { SKILLS } from "../src/game/shopData.js";
import { RESET, GIFT } from "../src/game/itemData.js";
import { ABYSS, floorTime, floorMobs, isGuardFloor } from "../src/game/abyssData.js";

const args = process.argv.slice(2).map(Number).filter((n) => n > 0);
const floors = args.length > 1 ? args.slice(0, -1) : [30, 50, 70, 100];
const runs = args.length > 1 ? args[args.length - 1] : 3;
const dt = 0.05, LV = 1200, INV = !!process.env.INV;
const jobs = ["warrior", "mage", "archer", "warrior"];
const weapons = { warrior: ["dragon_dual", "sword"], mage: ["dragon_staff", "staff"], archer: ["dragon_bow", "bow"] };

function party() {
  const g = makeWorld();
  g.server = true;
  const seats = jobs.map((job, i) => ({ id: `ab${i}`, name: `측정${i}`, hero: { name: `측정${i}`, job, elem: "flame", gender: "m" } }));
  rpgSyncSeats(g, seats);
  jobs.forEach((job, i) => {
    const [sp, t] = weapons[job], main = job === "mage" ? "int" : "str";
    const w = { u: 1, t, r: 10, g: 4, p: 1, sp, up: 30 };
    const armor = ["head", "body", "legs", "feet"].map((s, n) => ({ u: 10 + n, s, g: 3, set: "dragon" }));
    const skills = Object.fromEntries(SKILLS.filter((s) => !s.job || s.job === job).map((s) => [s.id, s.gold.length]));
    const active = SKILLS.filter((s) => s.use && (!s.job || s.job === job)), jb = active.find((s) => s.job), gen = active.filter((s) => !s.job).slice(-2);
    const pts = statEarned(LV), crit = 150, cdmg = Math.min(STAT_MAX, pts - STAT_MAX - crit);
    const stats = { [main]: STAT_MAX, crit, cdmg, hp: Math.max(0, Math.min(STAT_MAX, pts - STAT_MAX - crit - cdmg)) };
    rpgJoin(g, i, { name: seats[i].name, rs: RESET.id, gift: GIFT.id, lv: LV, coins: 1e7, ts: 0, stats,
      bag: { oc: 1, w: [w], e: 1, a: armor, ae: Object.fromEntries(armor.map((a) => [a.s, a.u])), n: 20, s: skills, ks: { job: jb.id, g: gen.map((s) => s.id) } } }, seats[i].id);
    const h = g.heroes[i];
    h.map = "plaza"; [h.x, h.y] = [ABYSS.gate.x, ABYSS.gate.y]; h.auto = 1; h.pty = 1;   // 한 파티
    if (INV) h.inv = 1e9;   // INV=1 — 쓰러지지 않게 두고 순수 처치 시간만 잰다
  });
  return g;
}

function one(f) {
  const g = party();
  rpgAbyss(g, 0, { op: "enter" });
  const r = g.aruns[0];
  g.heroes.forEach((h) => { if (h) h.ac = null; });   // 카드 없이 — 실력만 잰다
  r.f = f - 1; r.phase = "next"; r.end = 0.01;
  let t = 0, started = false, downs = 0, firstDown = 0, hp0 = 0, left = 1;
  const seen = new Set();
  for (let n = 0; n < (INV ? 900 : 400) / dt; n++) {
    if (INV) r.t = Math.max(r.t, 1);   // INV — 제한 시간도 끈다
    const hs = g.heroes.filter((h) => h && h.map === r.map);
    for (const h of hs) {
      if (h.down > 0) { if (!seen.has(h.pi)) { seen.add(h.pi); downs++; if (!firstDown) firstDown = t || dt; } continue; }
      const live = g.mobs.filter((m) => !m.dead && m.map === r.map);
      if (!live.length) continue;
      const m = live.reduce((a, b) => (Math.hypot(a.x - h.x, a.y - h.y) < Math.hypot(b.x - h.x, b.y - h.y) ? a : b));
      const d = Math.hypot(m.x - h.x, m.y - h.y), want = h.job === "warrior" ? 60 : 120;
      if (n % 4 === 0 && d > want) rpgMove(g, h.pi, { m: h.map, x: m.x + ((h.x - m.x) / d) * want, y: m.y + ((h.y - m.y) / d) * want });
      if (d < 260) {
        if (!(h.ws?.wcd > 0)) rpgWeaponSkill(g, h.pi);
        if (!(h.sk > 0)) rpgSkill(g, h.pi);
        for (const id of [h.bag.ks.job, ...h.bag.ks.g]) if (!(h.scd?.[id] > 0)) rpgUseSkill(g, h.pi, id);
      }
    }
    rpgStep(g, dt);
    if (n % 40 === 0) { g.fx = []; g.notes = []; g.sys = []; }
    if (r.phase === "go") {
      started = true; t += dt;
      const ms = g.mobs.filter((m) => m.map === r.map);
      if (!hp0) hp0 = ms.reduce((a, m) => a + m.max, 0);
      left = ms.reduce((a, m) => a + (m.dead ? 0 : Math.max(0, m.hp)), 0) / hp0;
    }
    if (started && r.phase !== "go") break;
    if (!g.aruns.includes(r)) break;
  }
  const ok = r.best >= f;
  return { ok, t, downs, firstDown, left: ok ? 0 : left };
}

const out = [];
for (const f of floors) {
  const rs = Array.from({ length: runs }, () => one(f));
  const okN = rs.filter((x) => x.ok).length, okT = rs.filter((x) => x.ok).map((x) => x.t);
  out.push({ 층: f, 종류: isGuardFloor(f) ? "수호자" : `몹 ${floorMobs(f)}마리`, 제한초: floorTime(f), 성공: `${okN}/${runs}`,
    평균초: okT.length ? Math.round(okT.reduce((a, b) => a + b, 0) / okT.length) : "-", 쓰러짐평균: +(rs.reduce((a, x) => a + x.downs, 0) / runs).toFixed(1),
    첫쓰러짐초: Math.round(rs.reduce((a, x) => a + (x.firstDown || x.t), 0) / runs), 실패때남은체력: rs.some((x) => !x.ok) ? Math.round((rs.filter((x) => !x.ok).reduce((a, x) => a + x.left, 0) / rs.filter((x) => !x.ok).length) * 100) + "%" : "-" });
}
console.table(out);
