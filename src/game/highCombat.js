/* ── RPG 800~1200레벨 사냥터 판정 — 일반 몹 · 정예 · 보스 기술 · 소환물 (수치는 highData.js) ─────────────
   rpg.js 가 엔진(E)으로 공용 함수를 넘긴다(맞히기 · 연출 · 늦게 하기 · 쫓기 걸음). 판정은 방장 · 전용 서버만 한다.

   기술 kind — 모든 공격은 예고 동안 바닥에 범위(sk_hi_warn)를 보이고, 터질 때 그 범위 안에 선 사람만 맞는다.
     circle 원 — at now 지금 자리 · past back 초 전 자리 · predict ahead 초 뒤 자리(걷던 쪽). n 명까지 · waves 번(gap 초 간격)
     laser  곧은 줄 n 개(spread 간격) — 몹 자리에서 노린 쪽으로 len · w
     slash  부채꼴 — 반지름 r · 반각 arc
     ring   몹 둘레 원(inner 안쪽은 안전)
     dash   곧은 줄을 보인 뒤 그 줄을 따라 달린다. 지나가는 몹 몸에 닿으면 맞는다
     leap   노린 자리에 원을 보이고 그 자리로 뛰어 내려찍는다
     blink  노린 사람 곁(near)의 빈 땅으로 순간이동한 뒤 제 둘레 원을 보이고 친다
     rewind 노린 사람 발밑에 시계 문양 — 그 사이 원 밖으로 나가면 문양 가운데로 되감기고, 곧 그 자리가 터진다(boom 초 예고)
     trail  노린 사람이 span 초 동안 걸어온 길에 n 개의 원을 차례로
     sweep  보스 둘레를 도는 두 날 — n 번 rot 만큼 돌며 한 번마다 예고 뒤 친다
     rift   사람 곁에 공간 균열(줄)을 낸다 — 터지고 life 초 동안 위에 서 있으면 0.5초마다 조금씩
     shield 받는 피해 cut 만큼 줄임(t 초) · barrier 최대 체력의 amt 만큼 피해를 먼저 막는다(t 초)
     zone   몹 회복 구역(life 초 · 초당 최대 체력의 heal) — 안에 선 몹이 찬다
     summon · clone  부하를 부른다(cap 까지 · life 초). 보상이 없고 부른 몹이 쓰러지면 사라진다
     combo  list 를 차례로 잇는다(알파 4단계)
   정예 쓰러짐(eliteDeath): blast 그 자리 폭발(예고 뒤) · empower 둘레 몹 공격력 강화(겹치지 않는다) */
import { HIGH_MOVES, HIGH_BRUTE, HIGH_SUMMON, HIGH_CAP, HIGH_IDS, HIGH_ELITE_IDS, HIGH_SUMMON_IDS, HIGH_CALLS } from "./highData.js";

const TAU = Math.PI * 2;
const REGION = Object.fromEntries([...HIGH_IDS.map((id) => [id, id]), ...HIGH_ELITE_IDS.map((id, i) => [id, HIGH_IDS[i]])]);
const REGION_IX = Object.fromEntries(HIGH_IDS.map((id, i) => [id, i]));
export const HIGH_MOB_TYPES = new Set([...HIGH_IDS, ...HIGH_ELITE_IDS, ...HIGH_SUMMON_IDS]);
export const isHighMob = (m) => !!m && HIGH_MOB_TYPES.has(m.type);
export const isHighElite = (m) => !!m && HIGH_ELITE_IDS.includes(m.type);
const regionOf = (m) => REGION[m.type] || (m.hreg ?? null);
const HIST = { every: 0.15, keep: 2.6 };          // 지나온 자리 기록 — 이 간격으로 이만큼(초) 남긴다(관측자 기술)
const ZONE_TICK = 0.5;                            // 균열 위 지속 피해 간격 — 한 사람에게 한 균열이 이 간격에 한 번만
const RIFT_TICK = 0.25;                           // 균열 지속 피해 배율(터질 때 mul 에 곱한다)

/* ── 기술 목록 · 단계 ─────────────────────── */
function movesOf(m) {
  const S = HIGH_SUMMON[m.type];
  if (S) return S.shoot ? [S.shoot] : [];
  const D = HIGH_MOVES[regionOf(m)];
  if (!D) return [];
  let list;
  if (m.boss) {
    const B = D.boss;
    list = Array.isArray(B) ? B : B.phases ? B.phases[m.hph || 0] : B.forms ? B.forms[m.hform || 0] : [];
  } else list = isHighElite(m) ? D.elite : D.mob;
  const P = passiveOf(m);
  return P && P.switch ? list.filter((mv) => mv.only === undefined || mv.only === (m.hmode || 0)) : list;
}
function passiveOf(m) {
  const D = HIGH_MOVES[regionOf(m)];
  if (!D || m.boss || HIGH_SUMMON[m.type]) return null;
  return isHighElite(m) ? D.elitePassive || null : D.passive || null;
}
const listTag = (m) => (m.boss ? `${m.hph || 0}.${m.hform || 0}` : `${m.hmode || 0}`);

// 손님에게 가는 몸 상태 비트 — 1 강철 방패 · 2 방어막 · 4 강화됨 · 8 둘째 형태 · 16 원거리 모드 · 32 도약 중 · 64~ 단계(0~3)
export const highFlags = (m) => (m.hshT > 0 ? 1 : 0) | (m.hbar > 0 ? 2 : 0) | (m.hbuffT > 0 ? 4 : 0) | (m.hform ? 8 : 0)
  | (m.hmode ? 16 : 0) | (m.hact && m.hact.k === "leap" ? 32 : 0) | ((m.hph || 0) << 6);

/* ── 받는 피해 — 강철 방패 · 방어막(rpg.js hitMob 이 반올림한 뒤 부른다) ─── */
export function highTake(m, dmg) {
  if (m.hshT > 0) dmg = Math.max(1, Math.round(dmg * (1 - (m.hshCut || 0))));
  if (m.hbar > 0) { const a = Math.min(m.hbar, dmg); m.hbar -= a; dmg -= a; if (m.hbar <= 0) { m.hbar = 0; m.hbarT = 0; } }
  return dmg;
}

/* ── 지나온 자리 · 균열 · 회복 구역 — rpgStep 이 매 틱 부른다 ─── */
export function tickHigh(E, g, dt) {
  const H = g.hiHist || (g.hiHist = {});
  g.hiHistT = (g.hiHistT || 0) - dt;
  const sample = g.hiHistT <= 0;
  if (sample) g.hiHistT = HIST.every;
  g.heroes.forEach((h, pi) => {
    if (!h || !E.MAPS[h.map] || !E.MAPS[h.map].high) { delete H[pi]; return; }
    const list = H[pi] && H[pi].map === h.map ? H[pi] : (H[pi] = { map: h.map, p: [] });
    if (sample) { list.p.push([g.t, h.x, h.y]); while (list.p.length && g.t - list.p[0][0] > HIST.keep) list.p.shift(); }
  });
  if (!g.hiZones || !g.hiZones.length) return;
  g.hiZones = g.hiZones.filter((z) => {
    z.t -= dt;
    if (z.t <= 0) return false;
    if (z.k === "zone") {                          // 회복 구역 — 안에 선 몹(소환물 빼고)이 찬다
      g.mobs.forEach((q) => {
        if (q.dead || q.map !== z.map || HIGH_SUMMON[q.type] || E.dist(z.x, z.y, q.x, q.y) > z.r) return;
        q.hp = Math.min(q.max, q.hp + q.max * z.heal * dt);
      });
    } else if (z.k === "rift") {                   // 균열 — 위에 선 사람을 조금씩
      g.heroes.forEach((h) => {
        if (!h || h.map !== z.map || h.down > 0 || !inLine(h, z.x, z.y, z.ax, z.ay, z.len, z.w, true)) return;
        const at = z.hit[h.pi] || 0;
        if (g.t - at < ZONE_TICK) return;
        z.hit[h.pi] = g.t;
        E.hurtHero(g, h, z.dmg, z.src, "sk");
      });
    }
    return true;
  });
}
function histAt(g, h, back) {
  const L = g.hiHist && g.hiHist[h.pi];
  if (!L || L.map !== h.map || !L.p.length) return [h.x, h.y];
  const want = g.t - back;
  let best = L.p[0];
  for (const s of L.p) if (Math.abs(s[0] - want) < Math.abs(best[0] - want)) best = s;
  return [best[1], best[2]];
}
function velOf(g, h) {
  const L = g.hiHist && g.hiHist[h.pi];
  if (!L || L.p.length < 2) return [0, 0];
  const a = L.p[Math.max(0, L.p.length - 4)], b = L.p[L.p.length - 1], dt = Math.max(0.05, b[0] - a[0]);
  return [(b[1] - a[1]) / dt, (b[2] - a[2]) / dt];
}

/* ── 모양 판정 — 그림(highFxArt.js)과 같은 셈. 땅 위 거리는 위아래를 squash 로 나눈다 ─── */
let SQ = 0.78;
const gd = (ax, ay, bx, by) => Math.hypot(bx - ax, (by - ay) / SQ);
function inLine(h, x, y, ax, ay, len, w, mid) {
  const dx = h.x - x, dy = (h.y - y) / SQ, along = dx * ax + dy * ay, side = Math.abs(dx * ay - dy * ax);
  return (mid ? Math.abs(along) <= len / 2 : along >= 0 && along <= len) && side <= w / 2;
}
const inCircle = (h, x, y, r, inner = 0) => { const d = gd(x, y, h.x, h.y); return d <= r && d >= inner; };
function inSector(h, x, y, ax, ay, r, arc) {
  const dx = h.x - x, dy = (h.y - y) / SQ, d = Math.hypot(dx, dy);
  if (d > r) return false;
  if (d < 8) return true;
  return Math.acos(Math.max(-1, Math.min(1, (dx * ax + dy * ay) / d))) <= arc;
}
// 맵 안의 빈 땅으로 — 순간이동 · 도약 · 소환 자리
function landAt(E, M, x, y, rad) {
  const o = { x: Math.max(E.edge + 20, Math.min(M.w - E.edge - 20, x)), y: Math.max(M.top + 20, Math.min(M.h - E.edge - 10, y)) };
  E.keepIn(o, M, rad);
  return [o.x, o.y];
}

/* ── 한 몹 — stepMob 이 부른다 ─────────────────────── */
export function stepHigh(E, g, m, dt) {
  SQ = E.squash;
  const M = E.MAPS[m.map];
  // 타이머
  if (m.hshT > 0) m.hshT = Math.max(0, m.hshT - dt);
  if (m.hbarT > 0) { m.hbarT = Math.max(0, m.hbarT - dt); if (m.hbarT <= 0) m.hbar = 0; }
  if (m.hbuffT > 0) { m.hbuffT -= dt; if (m.hbuffT <= 0) { m.hbuffT = 0; if (m.hdmg0) m.dmg = m.hdmg0; m.hdmg0 = 0; } }
  const S = HIGH_SUMMON[m.type];
  if (S) {                                         // 소환물 — 남은 시간 · 주인
    m.hlife = (m.hlife ?? 20) - dt;
    const owner = g.mobs.find((q) => q.id === m.owner && !q.dead);
    if (m.hlife <= 0 || !owner) return void vanish(E, g, m);
    if (S.heal && owner.hp < owner.max) {          // 재생 장치 — 주인을 채운다
      owner.hp = Math.min(owner.max, owner.hp + owner.max * S.heal * dt);
      m.hbeamT = (m.hbeamT || 0) - dt;
      if (m.hbeamT <= 0) { m.hbeamT = 1.2; E.fx(g, m.map, { kind: "sk_hi_heal", x: m.x, y: m.y - 20, x1: owner.x, y1: owner.y - 40, st: REGION_IX[m.hreg] ?? 5, t: 0.9, life: 0.9 }); }
    }
  }
  if (m.boss) bossStage(E, g, m);
  const P = passiveOf(m);
  if (P && P.switch) {                             // 근접 ↔ 원거리
    m.hmodeT = (m.hmodeT ?? P.switch) - dt;
    if (m.hmodeT <= 0) { m.hmodeT = P.switch; m.hmode = m.hmode ? 0 : 1; E.fx(g, m.map, { kind: "sk_hi_mode", x: m.x, y: m.y - 50 * m.size, r: 26 * m.size, mode: m.hmode, st: REGION_IX[regionOf(m)], t: 0.6, life: 0.6 }); }
  }
  if (P && P.aura) {                               // 둘레 몹 강화 — 0.5초마다 잠깐씩 이어 준다
    m.hauraT = (m.hauraT || 0) - dt;
    if (m.hauraT <= 0) {
      m.hauraT = 0.5;
      g.mobs.forEach((q) => { if (q !== m && !q.dead && q.map === m.map && !HIGH_SUMMON[q.type] && E.dist(m.x, m.y, q.x, q.y) <= P.aura.r) buffMob(q, P.aura.mul, 0.8); });
    }
  }
  if (m.hact) return void stepAct(E, g, m, dt, M);
  if (m.hlock > 0) { m.hlock -= dt; m.moving = 0; return; }   // 연속 공격(combo)이 다 나갈 때까지 제자리
  if (m.hbusy > 0) { m.hbusy -= dt; m.moving = 0; m.bite = 0.2; return; }
  const B = HIGH_BRUTE[regionOf(m)] || HIGH_BRUTE.scrapyard;
  const aggro = (m.boss ? 1.3 : 1) * B.aggro * (S ? 1.2 : 1);
  let tg = m.tgt >= 0 ? g.heroes[m.tgt] : null;
  if (tg && (tg.map !== m.map || tg.down > 0 || !E.notices(m, tg) || E.dist(m.x, m.y, tg.x, tg.y) > aggro * 2.2)) { tg = null; m.tgt = -1; }
  if (!tg) { tg = E.nearestHero(g, m, aggro); if (tg) m.tgt = tg.pi; }
  // 기술 — 대기가 끝난 것 가운데 앞에서부터 하나
  const cds = m.hcd || (m.hcd = {});
  for (const k in cds) cds[k] -= dt;
  if (tg) {
    const d = E.dist(m.x, m.y, tg.x, tg.y), tag = listTag(m), list = movesOf(m);
    for (let i = 0; i < list.length; i++) {
      const mv = list[i], key = tag + ":" + i;
      if (cds[key] === undefined) cds[key] = 0.8 + Math.random() * 1.6 * (mv.cd / 5);   // 처음엔 조금 기다렸다가
      if (cds[key] > 0 || d > (mv.range || 400) || (mv.min && d < mv.min)) continue;
      if (startMove(E, g, m, mv, tg, M)) { cds[key] = mv.cd; return; }
    }
  }
  if (S && S.still) { m.moving = 0; return; }      // 인조 식물 · 재생 장치 — 움직이지 않는다
  if (tg && P && P.switch && m.hmode === 1) return void keepAway(E, g, m, tg, dt, P.keep, B, M);   // 원거리 모드
  let Pb = B;
  if (P && P.rage) Pb = { ...B, punchCd: B.punchCd * (1 - P.rage * (1 - m.hp / m.max)) };   // 체력이 줄수록 빨리 친다
  if (S) Pb = { ...B, aggro: aggro, call: 0 };
  E.stepBrute(g, m, dt, Pb);
}
// 원거리 모드 — 노린 사람과 keep 거리를 둔다
function keepAway(E, g, m, tg, dt, keep, B, M) {
  const dx = tg.x - m.x, dy = (tg.y - m.y) / SQ, d = Math.hypot(dx, dy) || 1;
  if (Math.abs(dx) > 2) m.ax = dx < 0 ? -1 : 1;
  const dir = d > keep + 60 ? 1 : d < keep - 80 ? -0.7 : 0;
  m.moving = dir ? 1 : 0;
  if (dir) { const v = B.walk * dir * (m.slow > 0 ? 0.5 : 1); m.x += (dx / d) * v * dt; m.y += (dy / d) * v * SQ * dt; }
  const [x, y] = landAt(E, M, m.x, m.y, m.rad * 0.5); m.x = x; m.y = y;
}
// 보스 체력 단계 · 형태
function bossStage(E, g, m) {
  const B = HIGH_MOVES[regionOf(m)]?.boss;
  if (!B || Array.isArray(B)) return;
  const k = m.hp / m.max, R = regionOf(m);
  if (B.phases) {
    const ph = B.phaseAt.filter((t) => k <= t).length;
    if (ph > (m.hph || 0)) {                       // 단계는 올라가기만 한다(회복해도 되돌리지 않는다)
      m.hph = ph; m.hbusy = 0.6; m.hact = null;
      E.say(g, m.map, m.x, m.y - 80 * m.size, HIGH_CALLS[R]?.[`p${ph}`] || `${ph + 1}단계`, "#ffd59a");
      E.fx(g, m.map, { kind: "sk_hi_phase", x: m.x, y: m.y, r: 140 * m.size, st: REGION_IX[R], t: 0.9, life: 0.9, snd: "boom", kick: 0.25 });
    }
  }
  if (B.forms && !m.hform && k <= B.formAt) {
    m.hform = 1; m.hbusy = 0.8; m.hact = null;
    E.say(g, m.map, m.x, m.y - 80 * m.size, HIGH_CALLS[R]?.form || "형태 변화", "#ffd59a");
    E.fx(g, m.map, { kind: "sk_hi_phase", x: m.x, y: m.y, r: 150 * m.size, st: REGION_IX[R], t: 0.9, life: 0.9, snd: "boom", kick: 0.25 });
  }
}
function buffMob(q, mul, t) {
  if (!(q.hbuffT > 0)) { q.hdmg0 = q.dmg; q.dmg = Math.round(q.dmg * mul); }
  q.hbuffT = Math.max(q.hbuffT || 0, t);
}
// 소환물이 사라진다 — 보상 없이
function vanish(E, g, m) {
  if (m.dead) return;
  m.dead = true; m.hp = 0;
  E.fx(g, m.map, { kind: "poof", x: m.x, y: m.y - 6, t: 0.45, life: 0.45, color: "rgba(236,230,216,1)" });
}

/* ── 기술 쓰기 ─────────────────────── */
const heroesOn = (E, g, m) => g.heroes.filter((h) => h && h.map === m.map && h.down <= 0 && E.notices(m, h));
const callOf = (m, k) => (m.boss ? HIGH_CALLS[regionOf(m)]?.[k] : "");
function aimOf(m, tg) {
  const dx = tg.x - m.x, dy = (tg.y - m.y) / SQ, d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d];
}
// 원 하나 — 예고 뒤 그 안의 사람을 친다
function blastAt(E, g, m, map, x, y, r, mul, warn, style, inner = 0) {
  const dmg = m.dmg * mul, src = m, st = REGION_IX[regionOf(m)] ?? 0;
  E.fx(g, map, { kind: "sk_hi_warn", sh: "c", x, y, r, inner, st, style, t: warn, life: warn });
  E.later(g, warn, () => {
    g.heroes.forEach((h) => { if (h && h.map === map && h.down <= 0 && inCircle(h, x, y, r, inner)) E.hurtHero(g, h, dmg, src, "sk"); });
    E.fx(g, map, { kind: "sk_hi_boom", sh: "c", x, y, r, inner, st, style, t: 0.55, life: 0.55, snd: "boom" });
  });
}
function lineAt(E, g, m, map, x, y, ax, ay, len, w, mul, warn, style) {
  const dmg = m.dmg * mul, src = m, st = REGION_IX[regionOf(m)] ?? 0;
  E.fx(g, map, { kind: "sk_hi_warn", sh: "l", x, y, ax, ay, len, w, st, style, t: warn, life: warn });
  E.later(g, warn, () => {
    g.heroes.forEach((h) => { if (h && h.map === map && h.down <= 0 && inLine(h, x, y, ax, ay, len, w)) E.hurtHero(g, h, dmg, src, "sk"); });
    E.fx(g, map, { kind: "sk_hi_beam", x, y, ax, ay, len, w, st, style, t: 0.5, life: 0.5, snd: "boom" });
  });
}
function startMove(E, g, m, mv, tg, M) {
  const map = m.map, st = REGION_IX[regionOf(m)] ?? 0, warn = mv.warn || 0.9;
  const sayIt = () => { const t = callOf(m, mv.k); if (t) E.say(g, map, m.x, m.y - 80 * m.size, t, "#ffd59a"); };
  if (Math.abs(tg.x - m.x) > 2) m.ax = tg.x < m.x ? -1 : 1;
  switch (mv.k) {
    case "circle": {
      const waves = mv.waves || 1;
      for (let wv = 0; wv < waves; wv++) E.later(g, wv * (mv.gap || 0.8), () => {
        if (m.dead && wv > 0) return;
        const list = [tg, ...heroesOn(E, g, m).filter((h) => h !== tg && E.dist(m.x, m.y, h.x, h.y) <= mv.range * 1.2)].slice(0, mv.n || 1);
        list.forEach((h) => {
          if (h.map !== map) return;
          let [x, y] = [h.x, h.y];
          if (mv.at === "past") [x, y] = histAt(g, h, mv.back || 1);
          else if (mv.at === "predict") { const [vx, vy] = velOf(g, h); x += vx * (mv.ahead || 1); y += vy * (mv.ahead || 1); }
          [x, y] = landAt(E, M, x, y, 0);
          blastAt(E, g, m, map, x, y, mv.r, mv.mul, warn, mv.at);
        });
      });
      m.hbusy = Math.min(warn, 1) * 0.8;
      sayIt(); return true;
    }
    case "laser": {
      const [ax, ay] = aimOf(m, tg), a0 = Math.atan2(ay, ax), n = mv.n || 1;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * (mv.spread || 0);
        lineAt(E, g, m, map, m.x, m.y, Math.cos(a), Math.sin(a), mv.len, mv.w, mv.mul, warn, "laser");
      }
      m.hbusy = warn + 0.2;                        // 쏘는 동안 서 있다 — 줄의 시작점이 몹 자리라 움직이지 않는다
      sayIt(); return true;
    }
    case "slash": {
      const [ax, ay] = aimOf(m, tg), x = m.x, y = m.y, dmg = m.dmg * mv.mul, src = m;
      E.fx(g, map, { kind: "sk_hi_warn", sh: "s", x, y, ax, ay, r: mv.r, arc: mv.arc, st, t: warn, life: warn });
      E.later(g, warn, () => {
        g.heroes.forEach((h) => { if (h && h.map === map && h.down <= 0 && inSector(h, x, y, ax, ay, mv.r, mv.arc)) E.hurtHero(g, h, dmg, src, "sk"); });
        E.fx(g, map, { kind: "sk_hi_slash", x, y, ax, ay, r: mv.r, arc: mv.arc, st, t: 0.45, life: 0.45, snd: "boom" });
      });
      m.hbusy = warn + 0.15;
      sayIt(); return true;
    }
    case "ring": {
      blastAt(E, g, m, map, m.x, m.y, mv.r, mv.mul, warn, "ring", mv.inner || 0);
      m.hbusy = warn + 0.2;
      sayIt(); return true;
    }
    case "dash": {
      const [ax, ay] = aimOf(m, tg);
      // 맵 끝을 넘지 않게 길이를 줄인다 — 예고 줄 = 달리는 길
      let len = mv.len;
      for (; len > 60; len -= 20) { const ex = m.x + ax * len, ey = m.y + ay * len * SQ; if (ex > E.edge + 20 && ex < M.w - E.edge - 20 && ey > M.top + 10 && ey < M.h - E.edge) break; }
      E.fx(g, map, { kind: "sk_hi_warn", sh: "l", x: m.x, y: m.y, ax, ay, len, w: mv.w, st, style: "dash", t: warn, life: warn });
      m.hact = { k: "dash", wait: warn, x: m.x, y: m.y, ax, ay, len, w: mv.w, v: mv.speed || 950, go: 0, dmg: m.dmg * mv.mul, hit: [] };
      sayIt(); return true;
    }
    case "leap": {
      const [x, y] = landAt(E, M, tg.x, tg.y, m.rad * 0.5);
      blastAt(E, g, m, map, x, y, mv.r, mv.mul, warn, "leap");
      m.hact = { k: "leap", t: 0, T: warn, x0: m.x, y0: m.y, x1: x, y1: y };
      sayIt(); return true;
    }
    case "blink": {
      let x = tg.x, y = tg.y;
      for (let k = 0; k < 6; k++) {                // 사람 곁의 빈 땅 — 맵 밖 · 막힌 곳이면 다른 쪽
        const a = Math.random() * TAU;
        [x, y] = landAt(E, M, tg.x + Math.cos(a) * mv.near, tg.y + Math.sin(a) * mv.near * SQ, m.rad * 0.5);
        if (gd(x, y, tg.x, tg.y) > mv.near * 0.5) break;
      }
      E.fx(g, map, { kind: "sk_hi_blink", x: m.x, y: m.y, x1: x, y1: y, st, t: 0.45, life: 0.45, snd: "dash" });
      m.x = x; m.y = y; m.hx = m.hx ?? x;
      blastAt(E, g, m, map, x, y, mv.r, mv.mul, warn, "blink");
      m.hbusy = warn + 0.1;
      sayIt(); return true;
    }
    case "rewind": {
      const h = tg, x = h.x, y = h.y, dmg = m.dmg * mv.mul, src = m;
      E.fx(g, map, { kind: "sk_hi_warn", sh: "c", x, y, r: mv.r, st, style: "clock", t: warn, life: warn });
      E.later(g, warn, () => {
        if (h.map === map && h.down <= 0 && !(h.inv > 0) && !inCircle(h, x, y, mv.r)) {   // 원 밖으로 나갔으면 가운데로 되감긴다(대쉬 무적이면 안 감긴다)
          E.fx(g, map, { kind: "sk_hi_rewind", x: h.x, y: h.y, x1: x, y1: y, st, t: 0.5, life: 0.5, snd: "ice" });
          h.x = x; h.y = y; if (h.dest) h.dest = null;
          E.say(g, map, h.x, h.y - 96, "되감기", "#e8d8a0");
        }
        const boom = mv.boom || 0.9;
        E.fx(g, map, { kind: "sk_hi_warn", sh: "c", x, y, r: mv.r, st, style: "clock2", t: boom, life: boom });
        E.later(g, boom, () => {
          g.heroes.forEach((q) => { if (q && q.map === map && q.down <= 0 && inCircle(q, x, y, mv.r)) E.hurtHero(g, q, dmg, src, "sk"); });
          E.fx(g, map, { kind: "sk_hi_boom", sh: "c", x, y, r: mv.r, st, style: "clock", t: 0.55, life: 0.55, snd: "boom" });
        });
      });
      m.hbusy = 0.6;
      return true;
    }
    case "trail": {
      const h = tg, L = g.hiHist && g.hiHist[h.pi];
      const pts = L && L.map === map ? L.p.filter((s) => g.t - s[0] <= (mv.span || 1.6)) : [];
      const n = mv.n || 5, picks = [];
      for (let i = 0; i < n; i++) { const s = pts.length ? pts[Math.floor((i / Math.max(1, n - 1)) * (pts.length - 1))] : [0, h.x, h.y]; picks.push([s[1], s[2]]); }
      picks.forEach(([x, y], i) => E.later(g, i * (mv.gap || 0.18), () => blastAt(E, g, m, map, x, y, mv.r, mv.mul, warn, "trail")));
      m.hbusy = Math.min(1, warn) * 0.8;
      sayIt(); return true;
    }
    case "sweep": {
      const [ax, ay] = aimOf(m, tg), a0 = Math.atan2(ay, ax), x = m.x, y = m.y, rot = mv.rot || 0.7, dmg = m.dmg * mv.mul, src = m;
      for (let i = 0; i < (mv.n || 4); i++) E.later(g, i * (mv.step || 0.45), () => {
        [0, Math.PI].forEach((off) => {           // 마주 보는 두 날
          const a = a0 + off + i * rot, bx = Math.cos(a), by = Math.sin(a);
          E.fx(g, map, { kind: "sk_hi_warn", sh: "s", x, y, ax: bx, ay: by, r: mv.len, arc: mv.arc, st, style: "clock", t: warn, life: warn });
          E.later(g, warn, () => {
            g.heroes.forEach((h) => { if (h && h.map === map && h.down <= 0 && inSector(h, x, y, bx, by, mv.len, mv.arc)) E.hurtHero(g, h, dmg, src, "sk"); });
            E.fx(g, map, { kind: "sk_hi_slash", x, y, ax: bx, ay: by, r: mv.len, arc: mv.arc, st, t: 0.4, life: 0.4, ...(off ? {} : { snd: "boom" }) });
          });
        });
      });
      m.hbusy = (mv.n || 4) * (mv.step || 0.45) + warn;   // 도는 동안 제자리 — 판정 가운데가 보스 자리라 움직이지 않는다
      sayIt(); return true;
    }
    case "rift": {
      const list = heroesOn(E, g, m).filter((h) => E.dist(m.x, m.y, h.x, h.y) <= mv.range * 1.2);
      if (!list.length) return false;
      const dmg = m.dmg * mv.mul, src = m;
      for (let i = 0; i < (mv.n || 3); i++) {
        const h = list[i % list.length], a = Math.random() * Math.PI, ax = Math.cos(a), ay = Math.sin(a);
        const [x, y] = landAt(E, M, h.x + (Math.random() - 0.5) * 120, h.y + (Math.random() - 0.5) * 80, 0);
        E.fx(g, map, { kind: "sk_hi_warn", sh: "m", x, y, ax, ay, len: mv.len, w: mv.w, st, style: "rift", t: warn, life: warn });
        E.later(g, warn, () => {
          const z = { k: "rift", map, x, y, ax, ay, len: mv.len, w: mv.w, t: mv.life || 2.4, dmg: dmg * RIFT_TICK, src, hit: {} };
          g.heroes.forEach((q) => { if (q && q.map === map && q.down <= 0 && inLine(q, x, y, ax, ay, mv.len, mv.w, true)) { E.hurtHero(g, q, dmg, src, "sk"); z.hit[q.pi] = g.t; } });
          (g.hiZones || (g.hiZones = [])).push(z);
          E.fx(g, map, { kind: "sk_hi_rift", x, y, ax, ay, len: mv.len, w: mv.w, st, t: z.t, life: z.t, snd: i ? undefined : "boom" });
        });
      }
      m.hbusy = warn * 0.6;
      sayIt(); return true;
    }
    case "shield": {
      if (m.hshT > 0) return false;
      m.hshT = mv.t; m.hshCut = mv.cut;
      E.fx(g, map, { kind: "sk_hi_shield", x: m.x, y: m.y, r: 60 * m.size, st, t: mv.t, life: mv.t, snd: "bless" });
      m.hbusy = 0.4;
      sayIt(); return true;
    }
    case "barrier": {
      if (m.hbar > 0) return false;
      m.hbar = Math.round(m.max * mv.amt); m.hbarT = mv.t;
      E.fx(g, map, { kind: "sk_hi_shield", x: m.x, y: m.y, r: 64 * m.size, st, bar: 1, t: 0.9, life: 0.9, snd: "bless" });
      m.hbusy = 0.4;
      sayIt(); return true;
    }
    case "zone": {
      const z = { k: "zone", map, x: m.x, y: m.y, r: mv.r, t: mv.life, heal: mv.heal, owner: m.id };
      (g.hiZones || (g.hiZones = [])).push(z);
      E.fx(g, map, { kind: "sk_hi_zone", x: z.x, y: z.y, r: z.r, st, t: z.t, life: z.t, snd: "bless" });
      m.hbusy = 0.5;
      sayIt(); return true;
    }
    case "summon": case "clone": {
      const have = g.mobs.filter((q) => !q.dead && q.owner === m.id && q.type === mv.type).length;
      const onMap = g.mobs.filter((q) => !q.dead && q.map === map && q.owner).length;
      const n = Math.min(mv.n || 1, (mv.cap || 2) - have, HIGH_CAP.summonPerMap - onMap);
      if (n <= 0) return false;                    // 이미 가득 — 무한 소환을 막는다
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, rr = 130 + Math.random() * 90;
        const [x, y] = landAt(E, M, m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr * SQ, 20);
        const q = E.newMob(g, mv.type, m.boss ? Math.round(m.lv) : m.lv, map, x, y);
        q.hp = q.max = Math.max(1, Math.round(m.max * (mv.hp || 0.03)));
        const SS = HIGH_SUMMON[mv.type];
        if (SS) q.dmg = Math.round(m.dmg * SS.dmg);
        q.owner = m.id; q.hreg = regionOf(m); q.hlife = mv.life || 20; q.sum = 1; q.tgt = tg.pi; q.hx = m.x; q.hy = m.y;
        g.mobs.push(q);
        E.fx(g, map, { kind: "sk_hi_summon", x, y, r: 40, st, t: 0.6, life: 0.6, ...(i ? {} : { snd: "bless" }) });
      }
      m.hbusy = 0.6;
      sayIt(); return true;
    }
    case "combo": {
      let at = 0;
      mv.list.forEach((sub, i) => {
        const go = () => { if (m.dead) return; const t = m.tgt >= 0 ? g.heroes[m.tgt] : null; if (t && t.map === map && t.down <= 0) startMove(E, g, m, { ...sub, range: 9999 }, t, M); };
        if (i === 0) go(); else E.later(g, at, go);
        at += (sub.warn || 0.9) + (sub.k === "dash" ? (sub.len || 400) / (sub.speed || 1000) : 0) + 0.25;
      });
      m.hlock = at;
      sayIt(); return true;
    }
  }
  return false;
}
// 진행 중인 몸 움직임 — 돌진 · 도약
function stepAct(E, g, m, dt, M) {
  const A = m.hact;
  m.moving = 0;
  if (A.k === "dash") {
    if (A.wait > 0) { A.wait -= dt; m.bite = 0.2; if (A.wait > 0) return; }
    const step = Math.min(A.v * dt, A.len - A.go);
    A.go += step;
    m.x = A.x + A.ax * A.go; m.y = A.y + A.ay * A.go * SQ; m.moving = 1;
    if (Math.abs(A.ax) > 0.1) m.ax = A.ax < 0 ? -1 : 1;
    g.heroes.forEach((h) => {                      // 예고한 줄 안에서, 지나가는 몸에 닿은 사람만 한 번
      if (!h || h.map !== m.map || h.down > 0 || A.hit.includes(h.pi)) return;
      if (!inLine(h, A.x, A.y, A.ax, A.ay, A.len, A.w)) return;
      const along = (h.x - A.x) * A.ax + ((h.y - A.y) / SQ) * A.ay;
      if (Math.abs(along - A.go) > Math.max(40, m.rad)) return;
      A.hit.push(h.pi);
      E.hurtHero(g, h, A.dmg, m, "sk");
      E.fx(g, m.map, { kind: "burst", x: h.x, y: h.y - 26, r: 22, color: "#e8dcc4", n: 7, t: 0.3, life: 0.3 });
    });
    if (A.go >= A.len - 0.5) {
      const [x, y] = landAt(E, M, m.x, m.y, m.rad * 0.5); m.x = x; m.y = y;
      m.hact = null; m.hbusy = 0.35;
    }
    return;
  }
  if (A.k === "leap") {
    A.t += dt;
    const k = Math.min(1, A.t / A.T);
    m.x = A.x0 + (A.x1 - A.x0) * k; m.y = A.y0 + (A.y1 - A.y0) * k;
    if (k >= 1) { m.hact = null; m.hbusy = 0.3; }
  }
}

/* ── 쓰러질 때 — rpg.js killMob 이 보상보다 먼저 부른다. 한 번만(m.hdone) ─── */
export function highDeath(E, g, m) {
  if (m.hdone) return;
  m.hdone = 1;
  SQ = E.squash;
  // 부른 부하 · 회복 구역은 함께 사라진다
  g.mobs.forEach((q) => { if (!q.dead && q.owner === m.id) vanish(E, g, q); });
  if (g.hiZones) g.hiZones = g.hiZones.filter((z) => z.owner !== m.id);
  if (!isHighElite(m)) return;
  const D = HIGH_MOVES[regionOf(m)], X = D && D.eliteDeath;
  if (!X) return;
  const st = REGION_IX[regionOf(m)] ?? 0;
  if (X.k === "blast") {                           // 과부하 집행기 — 쓰러진 자리가 예고 뒤 터진다
    E.say(g, m.map, m.x, m.y - 70 * m.size, "과부하!", "#ffb070");
    blastAt(E, g, m, m.map, m.x, m.y, X.r, X.mul, X.warn, "blast");
  } else if (X.k === "empower") {                  // 차원 포식체 — 둘레 몹 강화(겹치지 않고 시간만 새로)
    let n = 0;
    g.mobs.forEach((q) => { if (q !== m && !q.dead && q.map === m.map && !HIGH_SUMMON[q.type] && E.dist(m.x, m.y, q.x, q.y) <= X.r) { buffMob(q, X.mul, X.t); n++; } });
    E.fx(g, m.map, { kind: "sk_hi_phase", x: m.x, y: m.y, r: X.r, st, t: 0.8, life: 0.8, snd: "boom" });
    if (n) E.say(g, m.map, m.x, m.y - 70 * m.size, "차원 공명 — 둘레 몹 강화", "#c9b0ff");
  }
}

// 시험용(tools/high.test.mjs) — 기술 하나를 바로 쓰고, 판정 모양을 직접 견준다
export const highTest = { startMove: (E, g, m, mv, tg) => { SQ = E.squash; return startMove(E, g, m, mv, tg, E.MAPS[m.map]); }, inCircle, inLine, inSector, movesOf };
// 그림 · 시험용 — 지역 차례(색)
export const highRegionIx = (type) => REGION_IX[REGION[type]] ?? -1;
