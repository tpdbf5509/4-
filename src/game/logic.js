import {
  CX, CY, P, LANES, SLOTS, sk, posAt, TOWARD, AWAY, CW_DIR,
  CLASSES, CLASS_TOWERS, TOWER_BY_ID, TOWERS, towerIdx, CASTLE_GUN,
  SKILLS, ENEMY, TOTAL_WAVES, PREP, buildQueue, waveKind, seatCount, ETYPES, BLESSINGS,
} from "./world.js";

// 호스트에서 일어난 연출은 그대로 다른 참가자에게도 보낸다
function fx(g, item) {
  g.fx.push(item);
  if (g.out) g.out.push({ k: "fx", ...item });
}

function banner(g, text, sub, tone) {
  const b = { text, sub, tone, t: 2.6, life: 2.6 };
  g.banner = b;
  if (g.out) g.out.push({ k: "banner", ...b });
}

/* ── 타워 성능 (축복·단계가 함께 반영된다) ─────────────────── */
export const tdef = (t) => TOWER_BY_ID[t.type] || CLASSES[t.owner];
export function towerRange(g, t) {
  return tdef(t).range + 12 * (t.lv - 1) + (g.bless ? g.bless.reach : 0);
}
export function towerDmg(g, t) {
  return tdef(t).dmg * (1 + 0.62 * (t.lv - 1)) * (1 + (g.bless ? g.bless.power : 0));
}
// 지금 그 사람이 지으려는 타워
export function wantTower(pi, p) {
  const ids = CLASS_TOWERS[pi];
  return TOWER_BY_ID[ids[Math.min(p.pick || 0, ids.length - 1)]];
}

/* ── 조작 ───────────────────────────────────────────────── */
export function applyMove(g, pi, act) {
  const p = g.players[pi];
  const lane = p.lane, idx = p.slot;
  const toward = TOWARD[lane];
  const away = AWAY[toward];

  if (act === away) {
    if (idx === 0) { p.jolt = 0.12; return; }
    p.slot = idx - 1;
    p.jolt = 0.2;
    return;
  }
  if (act === toward) {
    if (idx < 4) { p.slot = idx + 1; p.jolt = 0.2; return; }
    p.lane = (lane + 3) % 4;
    p.jolt = 0.2;
    return;
  }
  if (act === CW_DIR[lane]) {
    p.lane = (lane + 1) % 4;
    p.jolt = 0.2;
    return;
  }
  p.jolt = 0.12;
}

export function say(g, x, y, text, color) {
  fx(g, { kind: "text", x, y, text, color, t: 1.1, life: 1.1 });
}

export function applyPick(g, pi, i) {
  const p = g.players[pi];
  const ids = CLASS_TOWERS[pi];
  const next = typeof i === "number" ? i : ((p.pick || 0) + 1);
  p.pick = ((next % ids.length) + ids.length) % ids.length;
  const s = SLOTS[sk(p.lane, p.slot)];
  say(g, s.x, s.y, TOWER_BY_ID[ids[p.pick]].name, P[pi].light);
}

export function doBuild(g, pi) {
  const p = g.players[pi];
  const key = sk(p.lane, p.slot);
  const s = SLOTS[key];
  const t = g.towers[key];
  if (!t) {
    const def = wantTower(pi, p);
    if (p.gold < def.cost) return say(g, s.x, s.y, "골드 부족", "#f0dcb4");
    p.gold -= def.cost;
    p.built++;
    g.towers[key] = { owner: pi, type: def.id, lv: 1, cd: 0, pulse: 0.4, aim: 0 };
    fx(g, { kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5 });
    fx(g, { kind: "ring", x: s.x, y: s.y, r: 46, color: P[pi].light, t: 0.45, life: 0.45, snd: "build" });
    say(g, s.x, s.y, def.name, P[pi].light);
  } else if (t.owner === pi) {
    const def = tdef(t);
    if (t.lv >= 4) return say(g, s.x, s.y, "최대 단계", "#f0dcb4");
    const cost = Math.round(def.cost * (0.7 + t.lv * 0.45));
    if (p.gold < cost) return say(g, s.x, s.y, `${cost} 골드 필요`, "#f0dcb4");
    p.gold -= cost;
    t.lv++;
    t.pulse = 0.4;
    fx(g, { kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5, color: "rgba(246,220,150,1)" });
    fx(g, { kind: "ring", x: s.x, y: s.y, r: 40, color: "#ffe6a2", t: 0.45, life: 0.45, snd: "build" });
    say(g, s.x, s.y, `${t.lv}단계`, P[pi].light);
  } else {
    say(g, s.x, s.y, `${t.owner + 1}P 자리`, "#f0dcb4");
  }
}

export function doSkill(g, pi) {
  const p = g.players[pi];
  if (p.cd > 0) return say(g, CX, CY - 96, `${SKILLS[pi].name} ${Math.ceil(p.cd)}초`, "#f0dcb4");
  p.cd = SKILLS[pi].cd;
  if (pi === 0) {
    g.focus = 8;
    banner(g, "집중 사격", "궁수탑 피해가 두 배로", P[0].light);
  } else if (pi === 1) {
    g.enemies.forEach((e) => {
      hurt(g, e, 45, 1, true);
      fx(g, { kind: "boom", x: e.x, y: e.y, r: 30, t: 0.4, life: 0.4 });
    });
    g.shake = 0.45;
    banner(g, "융단 폭격", "전장 전체에 포격", P[1].light);
  } else if (pi === 2) {
    g.enemies.forEach((e) => {
      e.freeze = Math.max(e.freeze, 4);
      fx(g, { kind: "ice", x: e.x, y: e.y, t: 0.5, life: 0.5 });
    });
    banner(g, "한파", "모든 적이 얼어붙는다", P[2].light);
  } else {
    g.players.forEach((q, i) => { if (g.seats[i]) q.gold += 45; });
    g.core.hp = Math.min(g.core.max, g.core.hp + 12);
    for (let i = 0; i < 6; i++) {
      fx(g, { kind: "coin", x: CX + (Math.random() - 0.5) * 70, y: CY + 20, t: 0.9, life: 0.9 });
    }
    banner(g, "긴급 보급", "전원 45 골드 · 성채 회복", P[3].light);
  }
}

/* ── 축복 ───────────────────────────────────────────────── */
function grantBlessing(g) {
  const pool = BLESSINGS.filter((b) => b.id !== "wall" || g.core.max < 220);
  const b = pool[Math.floor(Math.random() * pool.length)];
  g.blessed.push(b.id);
  if (b.id === "power") g.bless.power += 0.2;
  else if (b.id === "reach") g.bless.reach += 18;
  else if (b.id === "haste") g.bless.haste += 0.15;
  else if (b.id === "riches") g.players.forEach((p, i) => { if (g.seats[i]) p.gold += 180; });
  else if (b.id === "wall") { g.core.max += 40; g.core.hp = g.core.max; }
  banner(g, b.name, b.note, "#ffe08a");
  for (let i = 0; i < 10; i++) {
    fx(g, { kind: "coin", x: CX + (Math.random() - 0.5) * 120, y: CY + 10, t: 1.1, life: 1.1 });
  }
  fx(g, { kind: "ring", x: CX, y: CY, r: 220, color: "#ffe08a", t: 0.8, life: 0.8, snd: "bless" });
}

/* ── 피해 ───────────────────────────────────────────────── */
export function hurt(g, e, dmg, byPlayer, ignoreRes) {
  if (e.dead) return;
  const d = ignoreRes ? dmg : dmg * (1 - ENEMY[e.type].res);
  e.hp -= d;
  e.flash = 0.12;
  const big = e.type === "boss" || e.type === "titan";
  if (d >= 12 || big) {
    fx(g, { kind: "dmg", x: e.x, y: e.y - 8, text: String(Math.round(d)),
      color: typeof byPlayer === "number" ? P[byPlayer].light : "#ffe9bd", t: 0.62, life: 0.62 });
  }
  if (e.hp > 0) return;

  e.dead = true;
  const reward = Math.round(ENEMY[e.type].gold + g.wave * 0.6);
  if (typeof byPlayer === "number") {
    g.players[byPlayer].gold += reward;
    g.players[byPlayer].kills++;
  } else {
    const crew = seatCount(g) || 1;
    g.players.forEach((p, i) => { if (g.seats[i]) p.gold += reward / crew; });
  }
  g.combo++;
  g.comboT = 2.4;
  if (g.combo > 0 && g.combo % 10 === 0) {
    fx(g, { kind: "dmg", x: e.x, y: e.y - 22, text: `${g.combo} 연속!`, color: "#ffd873", t: 1, life: 1 });
  }
  fx(g, { kind: "poof", x: e.x, y: e.y, t: 0.45, life: 0.45 });
  fx(g, { kind: "coin", x: e.x, y: e.y - 6, t: 0.8, life: 0.8, snd: "coin" });

  if (big) {
    g.shake = Math.max(g.shake, e.type === "titan" ? 0.8 : 0.5);
    fx(g, { kind: "boom", x: e.x, y: e.y, r: e.type === "titan" ? 120 : 70, t: 0.7, life: 0.7 });
    fx(g, { kind: "ring", x: e.x, y: e.y, r: e.type === "titan" ? 260 : 150, color: "#ffd07a", t: 0.7, life: 0.7 });
    grantBlessing(g);
  }
}

function zap(g, from, first, dmg, owner, chain) {
  const hit = new Set([first.id]);
  let prev = first;
  let d = dmg;
  fx(g, { kind: "zap", x: from.x, y: from.y, x2: first.x, y2: first.y, t: 0.2, life: 0.2, snd: "zap" });
  hurt(g, first, d, owner);
  for (let n = 1; n < chain; n++) {
    let best = null, bd = 1e9;
    for (const e of g.enemies) {
      if (e.dead || hit.has(e.id)) continue;
      const dd = Math.hypot(e.x - prev.x, e.y - prev.y);
      if (dd < 96 && dd < bd) { bd = dd; best = e; }
    }
    if (!best) break;
    hit.add(best.id);
    d *= 0.72;
    fx(g, { kind: "zap", x: prev.x, y: prev.y, x2: best.x, y2: best.y, t: 0.2, life: 0.2 });
    hurt(g, best, d, owner);
    prev = best;
  }
}

function applyPoison(e, dps, time, owner) {
  e.poison = Math.max(e.poison || 0, time);
  e.pdps = Math.max(e.pdps || 0, dps);
  e.pby = owner;
}

/* ── 한 프레임 ──────────────────────────────────────────── */
export function step(g, dt) {
  g.t += dt;
  if (g.shake > 0) g.shake -= dt;
  if (g.hitFlash > 0) g.hitFlash -= dt;
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }
  g.fx.forEach((f) => (f.t -= dt));
  g.fx = g.fx.filter((f) => f.t > 0);

  const kPos = 1 - Math.exp(-dt * 15);
  const kRad = 1 - Math.exp(-dt * 9);
  g.players.forEach((p, pi) => {
    const key = sk(p.lane, p.slot);
    const s = SLOTS[key];
    const t = g.towers[key];
    const range = t ? towerRange(g, t) : wantTower(pi, p).range + g.bless.reach;
    p.cx += (s.x - p.cx) * kPos;
    p.cy += (s.y - p.cy) * kPos;
    p.cr += (range - p.cr) * kRad;
    if (p.jolt > 0) p.jolt -= dt;
  });

  if (g.phase !== "prep" && g.phase !== "wave") return;

  // 키를 누르고 있을 때의 연속 이동은 각 참가자 브라우저에서 처리한다
  g.players.forEach((p) => { if (p.cd > 0) p.cd -= dt; });
  if (g.focus > 0) g.focus -= dt;

  if (g.phase === "prep") {
    g.timer -= dt;
    if (g.timer <= 0) {
      g.phase = "wave";
      g.queue = buildQueue(g.wave, seatCount(g));
      g.spawnT = 0;
      const kind = waveKind(g.wave);
      if (kind === "rush") banner(g, `웨이브 ${g.wave} — 돌격`, "발 빠른 고블린 떼가 몰려온다", "#ffb765");
      else if (kind === "boss") banner(g, `웨이브 ${g.wave} — 보스`, "오우거 지휘관이 온다", "#ff8f6a");
      else if (kind === "titan") banner(g, "최종 웨이브 — 대군주", "성문 앞까지 한 걸음도 내주지 마라", "#ff6f6f");
      else banner(g, `웨이브 ${g.wave}`, "적이 네 갈래 길로 들어온다", "#e8dcc0");
    }
  } else if (g.phase === "wave") {
    g.spawnT -= dt;
    if (g.queue.length && g.spawnT <= 0) {
      const q = g.queue.shift();
      const base = ENEMY[q.type];
      const scale = Math.pow(1.155, g.wave - 1);
      const p0 = posAt(q.lane, 0);
      g.enemies.push({
        id: g.nextId++,
        type: q.type, lane: q.lane, p: 0,
        hp: base.hp * scale, max: base.hp * scale,
        x: p0.x, y: p0.y, ax: p0.ax, ay: p0.ay,
        slow: 0, slowAmt: 0.5, freeze: 0, flash: 0, poison: 0, pdps: 0, dead: false, age: 0,
      });
      if (q.type === "boss" || q.type === "titan") {
        g.shake = Math.max(g.shake, q.type === "titan" ? 0.7 : 0.4);
        fx(g, { kind: "ring", x: p0.x, y: p0.y, r: q.type === "titan" ? 180 : 110,
          color: q.type === "titan" ? "#ff7a6a" : "#ffb06a", t: 0.7, life: 0.7, snd: "boss" });
        banner(g, base.label, q.type === "titan" ? "땅이 흔들린다" : "보스가 나타났다",
          q.type === "titan" ? "#ff6f6f" : "#ff9f6a");
      }
      g.spawnT = q.type === "titan" ? 2 : q.type === "boss" ? 1.4 : q.type === "rusher" ? 0.36 : 0.62;
    }
    if (!g.queue.length && !g.enemies.length) {
      if (g.wave >= TOTAL_WAVES) { g.phase = "clear"; return; }
      g.players.forEach((p, i) => { if (g.seats[i]) p.gold += 22 + g.wave * 3; });
      g.wave++;
      g.phase = "prep";
      g.timer = PREP;
    }
  }

  // 보급소
  const supports = [];
  g.towers.forEach((t, i) => { if (t && t.type === "supply") supports.push({ t, s: SLOTS[i] }); });
  const supDef = TOWER_BY_ID.supply;
  supports.forEach(({ t }) => {
    g.players.forEach((p, i) => { if (g.seats[i]) p.gold += supDef.gold * t.lv * dt; });
  });

  // 성채의 대포 — 성문 앞까지 온 적을 직접 때린다
  {
    const cg = g.castle;
    cg.cd -= dt * (1 + g.bless.haste);
    let target = null;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - CX, e.y - CY) > CASTLE_GUN.range) continue;
      if (!target || e.p > target.p) target = e;
    }
    if (target) {
      cg.aim = Math.atan2(target.y - (CY - 22), target.x - CX);
      if (cg.cd <= 0) {
        cg.cd = CASTLE_GUN.interval;
        cg.pulse = 0.35;
        const dmg = CASTLE_GUN.dmg * (1 + g.bless.power);
        g.bullets.push({
          x: CX + Math.cos(cg.aim) * 18, y: CY - 22 + Math.sin(cg.aim) * 18,
          tx: target.x, ty: target.y, target, dmg, owner: null,
          splash: CASTLE_GUN.splash, slow: 0, slowT: 0, speed: 340, kind: "shell",
          travel: 0, total: Math.max(1, Math.hypot(target.x - CX, target.y - CY)),
          vx: target.x - CX, vy: target.y - CY,
        });
        if (g.out) {
          g.out.push({ k: "shot", si: -1, x: CX, y: CY - 22, tx: target.x, ty: target.y,
            owner: null, splash: CASTLE_GUN.splash, speed: 340, kind: "shell", aim: cg.aim });
        }
        fx(g, { kind: "poof", x: CX + Math.cos(cg.aim) * 26, y: CY - 22 + Math.sin(cg.aim) * 26,
          t: 0.3, life: 0.3, color: "rgba(236,228,212,1)" });
      }
    }
    if (cg.pulse > 0) cg.pulse -= dt;
  }

  // 타워 사격
  g.towers.forEach((t, i) => {
    if (!t) return;
    if (t.pulse > 0) t.pulse -= dt;
    const def = tdef(t);
    if (!def.interval) return;                 // 보급소는 쏘지 않는다
    const s = SLOTS[i];
    let mul = 1 + g.bless.haste;
    supports.forEach((sp) => {
      if (Math.hypot(sp.s.x - s.x, sp.s.y - s.y) <= supDef.range) {
        mul = Math.max(mul, 1 + g.bless.haste + supDef.buff * sp.t.lv);
      }
    });
    t.cd -= dt * mul;
    const range = towerRange(g, t);
    let target = null;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) > range) continue;
      if (!target || e.p > target.p) target = e;
    }
    if (target) t.aim = Math.atan2(target.y - (s.y - 20), target.x - s.x);
    if (t.cd > 0) return;
    if (!target) { t.cd = 0; return; }
    t.cd = def.interval;
    let dmg = towerDmg(g, t);
    if (t.type === "archer" && g.focus > 0) dmg *= 2;
    const kind = { archer: "arrow", cannon: "ball", frost: "shard", bolt: "bolt", poison: "orb" }[t.type] || "arrow";
    const speed = t.type === "cannon" ? 300 : t.type === "bolt" ? 900 : 470;
    g.bullets.push({
      x: s.x, y: s.y - 20, tx: target.x, ty: target.y, target, dmg,
      owner: t.owner, splash: def.splash || 0, slow: def.slow || 0, slowT: def.slowT || 0,
      chain: def.chain || 0, poison: def.poison ? def.poison * (1 + 0.5 * (t.lv - 1)) : 0,
      poisonT: def.poisonT || 0,
      speed, kind,
      travel: 0, total: Math.max(1, Math.hypot(target.x - s.x, target.y - s.y + 20)),
      vx: target.x - s.x, vy: target.y - (s.y - 20),
    });
    if (g.out) {
      g.out.push({ k: "shot", si: i, x: s.x, y: s.y - 20, tx: target.x, ty: target.y,
        owner: t.owner, splash: def.splash || 0, speed, kind });
    }
    t.pulse = 0.4;
    if (t.type === "cannon") {
      fx(g, { kind: "poof", x: s.x + Math.cos(t.aim) * 22, y: s.y - 20 + Math.sin(t.aim) * 22,
        t: 0.3, life: 0.3, color: "rgba(230,224,210,1)" });
    }
  });

  // 탄
  g.bullets = g.bullets.filter((b) => {
    const tg = b.target;
    if (tg && !tg.dead) { b.tx = tg.x; b.ty = tg.y; }
    const dx = b.tx - b.x, dy = b.ty - b.y;
    const d = Math.hypot(dx, dy);
    const mv = b.speed * dt;
    b.vx = dx; b.vy = dy;
    b.travel = Math.min(1, 1 - d / b.total);
    if (d <= mv) {
      if (b.splash) {
        g.enemies.forEach((e) => {
          if (e.dead) return;
          const dd = Math.hypot(e.x - b.tx, e.y - b.ty);
          if (dd <= b.splash) hurt(g, e, b.dmg * (dd < b.splash * 0.5 ? 1 : 0.6), b.owner);
        });
        fx(g, { kind: "boom", x: b.tx, y: b.ty, r: b.splash, t: 0.42, life: 0.42, snd: "boom" });
        g.shake = Math.max(g.shake, b.kind === "shell" ? 0.2 : 0.12);
      } else if (tg && !tg.dead) {
        if (b.chain) {
          zap(g, { x: b.x, y: b.y }, tg, b.dmg, b.owner, b.chain);
        } else {
          hurt(g, tg, b.dmg, b.owner);
        }
        if (b.slow) {
          tg.slow = Math.max(tg.slow, b.slowT);
          tg.slowAmt = b.slow;
          fx(g, { kind: "ice", x: b.tx, y: b.ty, t: 0.4, life: 0.4, snd: "ice" });
        }
        if (b.poison) {
          applyPoison(tg, b.poison, b.poisonT, b.owner);
          fx(g, { kind: "fume", x: b.tx, y: b.ty, t: 0.5, life: 0.5 });
        }
      }
      return false;
    }
    b.x += (dx / d) * mv;
    b.y += (dy / d) * mv;
    return true;
  });

  // 적 이동
  g.enemies.forEach((e) => {
    e.age += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.dead) return;
    if (e.poison > 0) {
      e.poison -= dt;
      e.ptick = (e.ptick || 0) + dt;
      if (e.ptick >= 0.5) {
        e.ptick = 0;
        hurt(g, e, e.pdps * 0.5, e.pby, true);   // 독은 장갑을 무시한다
        fx(g, { kind: "fume", x: e.x, y: e.y - 4, t: 0.4, life: 0.4 });
      }
      if (e.dead) return;
    }
    if (e.freeze > 0) { e.freeze -= dt; return; }
    if (e.slow > 0) e.slow -= dt;
    const spd = ENEMY[e.type].spd * (e.slow > 0 ? e.slowAmt : 1);
    e.p += (spd * dt) / LANES[e.lane].len;
    const pos = posAt(e.lane, e.p);
    e.x = pos.x; e.y = pos.y; e.ax = pos.ax; e.ay = pos.ay;
    if (e.p >= 1) {
      e.dead = true;
      g.core.hp -= ENEMY[e.type].dmg;
      g.shake = 0.32;
      g.hitFlash = 0.35;
      g.combo = 0;
      fx(g, { kind: "boom", x: e.x, y: e.y, r: 26, t: 0.35, life: 0.35, snd: "core" });
    }
  });
  g.enemies = g.enemies.filter((e) => !e.dead);
  g.bullets = g.bullets.filter((b) => !b.target || !b.target.dead || b.splash);

  if (g.core.hp <= 0) { g.core.hp = 0; g.phase = "over"; }
}


/* ────────────────────────────────────────────────────────────
   호스트가 아닌 참가자용.
   판정은 호스트만 하고, 이쪽은 받은 상태 사이를 부드럽게 이어 그린다.
   ──────────────────────────────────────────────────────────── */
export function stepVisual(g, dt) {
  g.t += dt;
  if (g.shake > 0) g.shake -= dt;
  if (g.hitFlash > 0) g.hitFlash -= dt;
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }

  g.fx.forEach((f) => (f.t -= dt));
  g.fx = g.fx.filter((f) => f.t > 0);

  const kPos = 1 - Math.exp(-dt * 15);
  const kRad = 1 - Math.exp(-dt * 9);
  g.players.forEach((p, pi) => {
    const key = sk(p.lane, p.slot);
    const s = SLOTS[key];
    const t = g.towers[key];
    const range = t ? towerRange(g, t) : wantTower(pi, p).range + g.bless.reach;
    p.cx += (s.x - p.cx) * kPos;
    p.cy += (s.y - p.cy) * kPos;
    p.cr += (range - p.cr) * kRad;
    if (p.jolt > 0) p.jolt -= dt;
    if (p.cd > 0) p.cd -= dt;
  });

  g.towers.forEach((t) => { if (t && t.pulse > 0) t.pulse -= dt; });
  if (g.castle.pulse > 0) g.castle.pulse -= dt;

  // 탄은 눈에 보이는 용도라 목표 지점까지 날아간 뒤 사라진다
  g.bullets = g.bullets.filter((b) => {
    const dx = b.tx - b.x, dy = b.ty - b.y;
    const d = Math.hypot(dx, dy);
    const mv = b.speed * dt;
    b.vx = dx; b.vy = dy;
    b.travel = Math.min(1, 1 - d / (b.total || 1));
    if (d <= mv) return false;
    b.x += (dx / d) * mv;
    b.y += (dy / d) * mv;
    return true;
  });

  if (g.phase !== "prep" && g.phase !== "wave") return;

  // 다음 상태가 올 때까지 적은 같은 공식으로 계속 나아간다
  g.enemies.forEach((e) => {
    e.age += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.poison > 0) e.poison -= dt;
    if (e.freeze > 0) { e.freeze -= dt; return; }
    if (e.slow > 0) e.slow -= dt;
    const spd = ENEMY[e.type].spd * (e.slow > 0 ? e.slowAmt : 1);
    e.p = Math.min(1, e.p + (spd * dt) / LANES[e.lane].len);
    const pos = posAt(e.lane, e.p);
    e.x = pos.x; e.y = pos.y; e.ax = pos.ax; e.ay = pos.ay;
  });
}

/* 호스트가 보내는 상태 묶음 */
export function packSnapshot(g) {
  return {
    ph: g.phase, wv: g.wave, tm: Math.max(0, g.timer),
    hp: g.core.hp, hm: g.core.max, sp: g.speed, pa: g.paused ? 1 : 0, fo: g.focus > 0 ? 1 : 0,
    ql: g.queue.length, cb: g.combo,
    bl: [g.bless.power, g.bless.reach, g.bless.haste],
    bs: g.blessed,
    ca: Math.round(g.castle.aim * 100) / 100,
    pl: g.players.map((p) => [Math.floor(p.gold), Math.max(0, p.cd), p.lane, p.slot, p.built, p.kills, p.pick || 0]),
    tw: g.towers.map((t) => (t ? [t.owner, t.lv, towerIdx(t.type)] : 0)),
    en: g.enemies.map((e) => [
      e.id, ETYPES.indexOf(e.type), e.lane, Math.round(e.p * 10000) / 10000,
      Math.round((e.hp / e.max) * 100) / 100,
      (e.freeze > 0 ? 1 : 0) | (e.slow > 0 ? 2 : 0) | (e.poison > 0 ? 4 : 0),
    ]),
  };
}

/* 참가자가 받은 상태를 자기 화면에 반영 */
export function applySnapshot(g, s) {
  g.phase = s.ph;
  g.wave = s.wv;
  g.timer = s.tm;
  g.core.hp = s.hp;
  if (s.hm) g.core.max = s.hm;
  g.speed = s.sp;
  g.paused = !!s.pa;
  g.focus = s.fo ? 1 : 0;
  g.queueLeft = s.ql;
  g.combo = s.cb || 0;
  if (g.combo) g.comboT = Math.max(g.comboT, 0.3);
  if (s.bl) { g.bless.power = s.bl[0]; g.bless.reach = s.bl[1]; g.bless.haste = s.bl[2]; }
  if (s.bs) g.blessed = s.bs;
  if (typeof s.ca === "number") g.castle.aim = s.ca;

  s.pl.forEach((row, i) => {
    const p = g.players[i];
    p.gold = row[0]; p.cd = row[1];
    p.lane = row[2]; p.slot = row[3];
    p.built = row[4]; p.kills = row[5];
    p.pick = row[6] || 0;
  });

  s.tw.forEach((row, i) => {
    if (!row) { g.towers[i] = null; return; }
    const type = (TOWERS[row[2]] || TOWERS[0]).id;
    const cur = g.towers[i];
    if (cur && cur.owner === row[0] && cur.type === type) { cur.lv = row[1]; return; }
    g.towers[i] = { owner: row[0], type, lv: row[1], cd: 0, pulse: 0.4, aim: 0 };
  });

  const seen = new Set();
  s.en.forEach((row) => {
    const [id, ti, lane, p, hpr, flags] = row;
    seen.add(id);
    let e = g.enemies.find((x) => x.id === id);
    const type = ETYPES[ti];
    const base = ENEMY[type];
    if (!e) {
      const pos = posAt(lane, p);
      e = {
        id, type, lane, p, max: base.hp, hp: base.hp * hpr,
        x: pos.x, y: pos.y, ax: pos.ax, ay: pos.ay,
        slow: 0, slowAmt: 0.5, freeze: 0, flash: 0, poison: 0, dead: false, age: 0,
      };
      g.enemies.push(e);
    }
    // 받은 위치가 앞서 있으면 당겨오고, 뒤처져 있으면 살짝만 되돌린다
    e.p = e.p > p ? e.p + (p - e.p) * 0.35 : p;
    if (hpr < e.hp / e.max) e.flash = 0.12;
    e.hp = e.max * hpr;
    e.freeze = flags & 1 ? Math.max(e.freeze, 0.4) : 0;
    e.slow = flags & 2 ? Math.max(e.slow, 0.4) : 0;
    e.poison = flags & 4 ? Math.max(e.poison, 0.4) : 0;
  });
  g.enemies = g.enemies.filter((e) => seen.has(e.id));
}

/* 호스트가 보낸 연출을 재생 */
export function applyOut(g, list) {
  list.forEach((o) => {
    if (o.k === "fx") {
      const item = { ...o };
      delete item.k;
      g.fx.push(item);
      if (item.kind === "boom" && item.r >= 26) g.shake = Math.max(g.shake, 0.18);
      if (item.kind === "boom" && item.r >= 70) g.shake = Math.max(g.shake, 0.5);
    } else if (o.k === "banner") {
      g.banner = { text: o.text, sub: o.sub, tone: o.tone, t: o.t, life: o.life };
    } else if (o.k === "shot") {
      g.bullets.push({
        x: o.x, y: o.y, tx: o.tx, ty: o.ty, target: null, dmg: 0,
        owner: o.owner, splash: o.splash, kind: o.kind, speed: o.speed,
        travel: 0, total: Math.max(1, Math.hypot(o.tx - o.x, o.ty - o.y)),
        vx: o.tx - o.x, vy: o.ty - o.y,
      });
      if (o.si === -1) {
        g.castle.pulse = 0.35;
        if (typeof o.aim === "number") g.castle.aim = o.aim;
      } else {
        const t = g.towers[o.si];
        if (t) { t.pulse = 0.4; t.aim = Math.atan2(o.ty - o.y, o.tx - o.x); }
      }
    }
  });
}
