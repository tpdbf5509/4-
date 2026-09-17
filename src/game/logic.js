import {
  CX, CY, P, LANES, SLOTS, sk, posAt, TOWARD, AWAY, CW_DIR,
  CLASSES, SKILLS, ENEMY, TOTAL_WAVES, PREP, buildQueue, seatCount, ETYPES,
} from "./world.js";

// 호스트에서 일어난 연출은 그대로 다른 참가자에게도 보낸다
function fx(g, item) {
  g.fx.push(item);
  if (g.out) g.out.push({ k: "fx", ...item });
}

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

export function doBuild(g, pi) {
  const p = g.players[pi];
  const key = sk(p.lane, p.slot);
  const s = SLOTS[key];
  const t = g.towers[key];
  const cls = CLASSES[pi];
  if (!t) {
    if (p.gold < cls.cost) return say(g, s.x, s.y, "골드 부족", "#f0dcb4");
    p.gold -= cls.cost;
    p.built++;
    g.towers[key] = { owner: pi, lv: 1, cd: 0, pulse: 0.4, aim: 0 };
    fx(g, { kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5 });
    say(g, s.x, s.y, cls.name, P[pi].light);
  } else if (t.owner === pi) {
    if (t.lv >= 4) return say(g, s.x, s.y, "최대 단계", "#f0dcb4");
    const cost = Math.round(cls.cost * (0.7 + t.lv * 0.45));
    if (p.gold < cost) return say(g, s.x, s.y, `${cost} 골드 필요`, "#f0dcb4");
    p.gold -= cost;
    t.lv++;
    t.pulse = 0.4;
    fx(g, { kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5, color: "rgba(246,220,150,1)" });
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
    say(g, CX, CY - 96, "집중 사격!", P[0].light);
  } else if (pi === 1) {
    g.enemies.forEach((e) => {
      hurt(g, e, 45, 1, true);
      fx(g, { kind: "boom", x: e.x, y: e.y, r: 30, t: 0.4, life: 0.4 });
    });
    g.shake = 0.45;
    say(g, CX, CY - 96, "융단 폭격!", P[1].light);
  } else if (pi === 2) {
    g.enemies.forEach((e) => {
      e.freeze = Math.max(e.freeze, 4);
      fx(g, { kind: "ice", x: e.x, y: e.y, t: 0.5, life: 0.5 });
    });
    say(g, CX, CY - 96, "한파!", P[2].light);
  } else {
    g.players.forEach((q) => (q.gold += 45));
    g.core.hp = Math.min(g.core.max, g.core.hp + 12);
    for (let i = 0; i < 6; i++) {
      fx(g, { kind: "coin", x: CX + (Math.random() - 0.5) * 70, y: CY + 20, t: 0.9, life: 0.9 });
    }
    say(g, CX, CY - 96, "긴급 보급!", P[3].light);
  }
}

export function hurt(g, e, dmg, byPlayer, ignoreRes) {
  if (e.dead) return;
  const d = ignoreRes ? dmg : dmg * (1 - ENEMY[e.type].res);
  e.hp -= d;
  e.flash = 0.12;
  if (e.hp <= 0) {
    e.dead = true;
    const reward = Math.round(ENEMY[e.type].gold + g.wave * 0.6);
    if (typeof byPlayer === "number") {
      g.players[byPlayer].gold += reward;
      g.players[byPlayer].kills++;
    } else {
      const crew = seatCount(g) || 1;
      g.players.forEach((p, i) => { if (g.seats[i]) p.gold += reward / crew; });
    }
    fx(g, { kind: "poof", x: e.x, y: e.y, t: 0.45, life: 0.45 });
    fx(g, { kind: "coin", x: e.x, y: e.y - 6, t: 0.8, life: 0.8 });
  }
}


export function step(g, dt) {
  g.t += dt;
  if (g.shake > 0) g.shake -= dt;
  if (g.hitFlash > 0) g.hitFlash -= dt;
  g.fx.forEach((f) => (f.t -= dt));
  g.fx = g.fx.filter((f) => f.t > 0);

  const kPos = 1 - Math.exp(-dt * 15);
  const kRad = 1 - Math.exp(-dt * 9);
  g.players.forEach((p, pi) => {
    const key = sk(p.lane, p.slot);
    const s = SLOTS[key];
    const t = g.towers[key];
    const range = t ? CLASSES[t.owner].range + 12 * (t.lv - 1) : CLASSES[pi].range;
    p.cx += (s.x - p.cx) * kPos;
    p.cy += (s.y - p.cy) * kPos;
    p.cr += (range - p.cr) * kRad;
    if (p.jolt > 0) p.jolt -= dt;
  });

  if (g.phase !== "prep" && g.phase !== "wave") return;

  g.players.forEach((p, pi) => {
    if (!p.heldKeys.length) return;
    p.holdT -= dt;
    if (p.holdT <= 0) {
      applyMove(g, pi, p.heldKeys[p.heldKeys.length - 1]);
      p.holdT = 0.11;
    }
  });

  g.players.forEach((p) => { if (p.cd > 0) p.cd -= dt; });
  if (g.focus > 0) g.focus -= dt;

  if (g.phase === "prep") {
    g.timer -= dt;
    if (g.timer <= 0) {
      g.phase = "wave";
      g.queue = buildQueue(g.wave, seatCount(g));
      g.spawnT = 0;
    }
  } else if (g.phase === "wave") {
    g.spawnT -= dt;
    if (g.queue.length && g.spawnT <= 0) {
      const q = g.queue.shift();
      const base = ENEMY[q.type];
      const scale = Math.pow(1.155, g.wave - 1);
      const p0 = posAt(q.lane, 0);
      g.enemies.push({
        type: q.type, lane: q.lane, p: 0,
        hp: base.hp * scale, max: base.hp * scale,
        x: p0.x, y: p0.y, ax: p0.ax, ay: p0.ay,
        slow: 0, slowAmt: 0.5, freeze: 0, flash: 0, dead: false, age: 0,
      });
      g.spawnT = q.type === "boss" ? 1.4 : 0.62;
    }
    if (!g.queue.length && !g.enemies.length) {
      if (g.wave >= TOTAL_WAVES) { g.phase = "clear"; return; }
      g.players.forEach((p) => (p.gold += 22 + g.wave * 3));
      g.wave++;
      g.phase = "prep";
      g.timer = PREP;
    }
  }

  // 보급소
  const supports = [];
  g.towers.forEach((t, i) => { if (t && t.owner === 3) supports.push({ t, s: SLOTS[i] }); });
  supports.forEach(({ t }) => {
    g.players.forEach((p) => (p.gold += CLASSES[3].gold * t.lv * dt));
  });

  // 사격
  g.towers.forEach((t, i) => {
    if (!t) return;
    if (t.pulse > 0) t.pulse -= dt;
    const cls = CLASSES[t.owner];
    if (t.owner === 3) return;
    const s = SLOTS[i];
    let mul = 1;
    supports.forEach((sp) => {
      if (Math.hypot(sp.s.x - s.x, sp.s.y - s.y) <= CLASSES[3].range) {
        mul = Math.max(mul, 1 + CLASSES[3].buff * sp.t.lv);
      }
    });
    t.cd -= dt * mul;
    const range = cls.range + 12 * (t.lv - 1);
    let target = null;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) > range) continue;
      if (!target || e.p > target.p) target = e;
    }
    if (target) t.aim = Math.atan2(target.y - (s.y - 20), target.x - s.x);
    if (t.cd > 0) return;
    if (!target) { t.cd = 0; return; }
    t.cd = cls.interval;
    let dmg = cls.dmg * (1 + 0.62 * (t.lv - 1));
    if (t.owner === 0 && g.focus > 0) dmg *= 2;
    const kind = t.owner === 0 ? "arrow" : t.owner === 1 ? "ball" : "shard";
    const speed = t.owner === 1 ? 300 : 470;
    g.bullets.push({
      x: s.x, y: s.y - 20, tx: target.x, ty: target.y, target, dmg,
      owner: t.owner, splash: cls.splash || 0, slow: cls.slow || 0, slowT: cls.slowT || 0,
      speed, kind,
      travel: 0, total: Math.max(1, Math.hypot(target.x - s.x, target.y - s.y + 20)),
      vx: target.x - s.x, vy: target.y - (s.y - 20),
    });
    if (g.out) {
      g.out.push({ k: "shot", si: i, x: s.x, y: s.y - 20, tx: target.x, ty: target.y,
        owner: t.owner, splash: cls.splash || 0, speed, kind });
    }
    t.pulse = 0.4;
    if (t.owner === 1) {
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
        fx(g, { kind: "boom", x: b.tx, y: b.ty, r: b.splash, t: 0.42, life: 0.42 });
        g.shake = Math.max(g.shake, 0.12);
      } else if (tg && !tg.dead) {
        hurt(g, tg, b.dmg, b.owner);
        if (b.slow) {
          tg.slow = Math.max(tg.slow, b.slowT);
          tg.slowAmt = b.slow;
          fx(g, { kind: "ice", x: b.tx, y: b.ty, t: 0.4, life: 0.4 });
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
      fx(g, { kind: "boom", x: e.x, y: e.y, r: 26, t: 0.35, life: 0.35 });
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

  g.fx.forEach((f) => (f.t -= dt));
  g.fx = g.fx.filter((f) => f.t > 0);

  const kPos = 1 - Math.exp(-dt * 15);
  const kRad = 1 - Math.exp(-dt * 9);
  g.players.forEach((p, pi) => {
    const key = sk(p.lane, p.slot);
    const s = SLOTS[key];
    const t = g.towers[key];
    const range = t ? CLASSES[t.owner].range + 12 * (t.lv - 1) : CLASSES[pi].range;
    p.cx += (s.x - p.cx) * kPos;
    p.cy += (s.y - p.cy) * kPos;
    p.cr += (range - p.cr) * kRad;
    if (p.jolt > 0) p.jolt -= dt;
    if (p.cd > 0) p.cd -= dt;
  });

  g.towers.forEach((t) => { if (t && t.pulse > 0) t.pulse -= dt; });

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
    hp: g.core.hp, sp: g.speed, pa: g.paused ? 1 : 0, fo: g.focus > 0 ? 1 : 0,
    ql: g.queue.length,
    pl: g.players.map((p) => [Math.floor(p.gold), Math.max(0, p.cd), p.lane, p.slot, p.built, p.kills]),
    tw: g.towers.map((t) => (t ? [t.owner, t.lv] : 0)),
    en: g.enemies.map((e) => [
      e.id, ETYPES.indexOf(e.type), e.lane, Math.round(e.p * 10000) / 10000,
      Math.round((e.hp / e.max) * 100) / 100,
      (e.freeze > 0 ? 1 : 0) | (e.slow > 0 ? 2 : 0),
    ]),
  };
}

/* 참가자가 받은 상태를 자기 화면에 반영 */
export function applySnapshot(g, s) {
  g.phase = s.ph;
  g.wave = s.wv;
  g.timer = s.tm;
  g.core.hp = s.hp;
  g.speed = s.sp;
  g.paused = !!s.pa;
  g.focus = s.fo ? 1 : 0;
  g.queueLeft = s.ql;

  s.pl.forEach((row, i) => {
    const p = g.players[i];
    p.gold = row[0]; p.cd = row[1];
    p.lane = row[2]; p.slot = row[3];
    p.built = row[4]; p.kills = row[5];
  });

  s.tw.forEach((row, i) => {
    if (!row) { g.towers[i] = null; return; }
    const cur = g.towers[i];
    if (cur && cur.owner === row[0]) { cur.lv = row[1]; return; }
    g.towers[i] = { owner: row[0], lv: row[1], cd: 0, pulse: 0.4, aim: 0 };
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
        slow: 0, slowAmt: 0.5, freeze: 0, flash: 0, dead: false, age: 0,
      };
      g.enemies.push(e);
    }
    // 받은 위치가 앞서 있으면 당겨오고, 뒤처져 있으면 살짝만 되돌린다
    e.p = e.p > p ? e.p + (p - e.p) * 0.35 : p;
    if (hpr < e.hp / e.max) e.flash = 0.12;
    e.hp = e.max * hpr;
    e.freeze = flags & 1 ? Math.max(e.freeze, 0.4) : 0;
    e.slow = flags & 2 ? Math.max(e.slow, 0.4) : 0;
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
    } else if (o.k === "shot") {
      g.bullets.push({
        x: o.x, y: o.y, tx: o.tx, ty: o.ty, target: null, dmg: 0,
        owner: o.owner, splash: o.splash, kind: o.kind, speed: o.speed,
        travel: 0, total: Math.max(1, Math.hypot(o.tx - o.x, o.ty - o.y)),
        vx: o.tx - o.x, vy: o.ty - o.y,
      });
      const t = g.towers[o.si];
      if (t) { t.pulse = 0.4; t.aim = Math.atan2(o.ty - o.y, o.tx - o.x); }
    }
  });
}
