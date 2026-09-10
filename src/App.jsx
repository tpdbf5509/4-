import { useEffect, useRef, useState, useCallback } from "react";

/* ────────────────────────────────────────────────────────────
   네 갈래 방어선 — 4인 협동 디펜스
   한 대의 키보드로 4명이 함께 중앙 코어를 지킵니다.
   ──────────────────────────────────────────────────────────── */

const W = 720, H = 600, CX = 360, CY = 300;
const R_SPAWN = 250;

const C = {
  bg: "#EBEDEA",
  panel: "#F5F6F4",
  line: "#CFD4CE",
  lineSoft: "#DDE1DC",
  text: "#23282A",
  sub: "#7E8785",
  alert: "#A4525C",          // 강조는 여기 한 곳(코어 게이지)만
  p: ["#6E9A94", "#B08A55", "#77839F", "#A4809A"],
};

const LANES = [
  { x: CX, y: CY - R_SPAWN, name: "북" },
  { x: CX + R_SPAWN, y: CY, name: "동" },
  { x: CX, y: CY + R_SPAWN, name: "남" },
  { x: CX - R_SPAWN, y: CY, name: "서" },
];

// 코어에서 떨어진 거리. 앞쪽이 바깥, 뒤쪽이 코어에 가깝다
const DIST = [216, 180, 144, 108, 72];

const SLOTS = [];
const LANE_LEN = [];
LANES.forEach((L, li) => {
  const dx = CX - L.x, dy = CY - L.y;
  const len = Math.hypot(dx, dy);
  LANE_LEN[li] = len;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  DIST.forEach((d, si) => {
    SLOTS.push({ lane: li, idx: si, x: CX - ux * d + px * 26, y: CY - uy * d + py * 26 });
  });
});
const sk = (lane, idx) => lane * 5 + idx;

const CLASSES = [
  { name: "저격", cost: 30, range: 158, dmg: 15, interval: 0.95, note: "단일 대상 · 사거리가 가장 길다" },
  { name: "포격", cost: 40, range: 118, dmg: 11, interval: 1.5, splash: 48, note: "착탄 지점 범위 피해" },
  { name: "서리", cost: 25, range: 128, dmg: 4, interval: 0.85, slow: 0.5, slowT: 1.6, note: "적 이동 속도를 절반으로" },
  { name: "보급", cost: 35, range: 140, dmg: 0, interval: 0, gold: 0.45, buff: 0.25, note: "주변 타워 강화 · 골드 생성" },
];

const SKILLS = [
  { name: "집중 사격", cd: 32, note: "저격 타워 피해 2배 · 8초" },
  { name: "융단 폭격", cd: 34, note: "모든 적에게 45 피해" },
  { name: "한파", cd: 30, note: "모든 적 정지 · 4초" },
  { name: "긴급 보급", cd: 36, note: "전원 45 골드 · 코어 12 회복" },
];

const ENEMY = {
  grunt: { hp: 24, spd: 27, dmg: 4, gold: 6, r: 7, res: 0, label: "보병" },
  rusher: { hp: 15, spd: 55, dmg: 3, gold: 5, r: 6, res: 0, label: "돌격" },
  armor: { hp: 58, spd: 18, dmg: 7, gold: 11, r: 9, res: 0.25, label: "중장갑" },
  boss: { hp: 340, spd: 14, dmg: 25, gold: 60, r: 15, res: 0.15, label: "지휘관" },
};

const KEYS = [
  { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS", build: "KeyQ", skill: "KeyE",
    cap: { move: "W A S D", build: "Q", skill: "E" } },
  { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", build: "Period", skill: "Slash",
    cap: { move: "↑ ← ↓ →", build: ".", skill: "/" } },
  { left: "KeyJ", right: "KeyL", up: "KeyI", down: "KeyK", build: "KeyU", skill: "KeyO",
    cap: { move: "I J K L", build: "U", skill: "O" } },
  { left: "Digit4", right: "Digit6", up: "Digit8", down: "Digit5", build: "Digit7", skill: "Digit9",
    cap: { move: "8 4 5 6", build: "7", skill: "9" } },
];

const CODEMAP = {};
KEYS.forEach((k, i) => {
  ["left", "right", "up", "down", "build", "skill"].forEach((a) => {
    CODEMAP[k[a]] = [i, a];
    if (k[a].startsWith("Digit")) CODEMAP["Numpad" + k[a].slice(5)] = [i, a];
  });
});

const TOTAL_WAVES = 15;
const PREP = 9;

function makeGame() {
  return {
    phase: "ready",
    wave: 0,
    timer: PREP,
    core: { hp: 100, max: 100 },
    players: [0, 1, 2, 3].map((i) => {
      const s = SLOTS[sk(i, 2)];
      return {
        gold: 90, cd: 0, lane: i, slot: 2, built: 0, kills: 0,
        cx: s.x, cy: s.y, cr: CLASSES[i].range, jolt: 0, heldKeys: [], holdT: 0,
      };
    }),
    towers: new Array(20).fill(null),
    enemies: [],
    bullets: [],
    fx: [],
    queue: [],
    spawnT: 0,
    focus: 0,
    shake: 0,
    paused: false,
    t: 0,
  };
}

function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildQueue(n) {
  const count = 6 + Math.floor(n * 2.2);
  const laneCount = n < 2 ? 2 : n < 4 ? 3 : 4;
  const active = shuffle([0, 1, 2, 3]).slice(0, laneCount);
  const list = [];
  for (let i = 0; i < count; i++) {
    let type = "grunt";
    const r = Math.random();
    if (n >= 3 && r < 0.32) type = "rusher";
    else if (n >= 5 && r > 0.76) type = "armor";
    list.push({ type, lane: active[i % active.length] });
  }
  if (n % 5 === 0) list.push({ type: "boss", lane: active[Math.floor(Math.random() * active.length)] });
  return list;
}

export default function App() {
  const cvsRef = useRef(null);
  const G = useRef(makeGame());
  const [hud, setHud] = useState(() => snapshot(G.current));
  const [helpOpen, setHelpOpen] = useState(false);

  function snapshot(g) {
    return {
      phase: g.phase,
      wave: g.wave,
      timer: Math.max(0, g.timer),
      hp: Math.max(0, Math.round(g.core.hp)),
      max: g.core.max,
      left: g.queue.length + g.enemies.length,
      paused: g.paused,
      players: g.players.map((p, i) => ({
        gold: Math.floor(p.gold),
        cd: Math.max(0, p.cd),
        lane: p.lane,
        slot: p.slot,
        built: p.built,
        kills: p.kills,
      })),
    };
  }

  const start = useCallback(() => {
    if (G.current.phase === "over" || G.current.phase === "clear") G.current = makeGame();
    const g = G.current;
    if (g.phase !== "ready") return;
    g.phase = "prep";
    g.wave = 1;
    g.timer = PREP;
    g.queue = [];
    setHud(snapshot(g));
  }, []);

  const togglePause = useCallback(() => {
    const g = G.current;
    if (g.phase !== "prep" && g.phase !== "wave") return;
    g.paused = !g.paused;
    setHud(snapshot(g));
  }, []);

  /* ── 입력 ───────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e) {
      const g = G.current;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (g.phase === "ready" || g.phase === "over" || g.phase === "clear") start();
        return;
      }
      if (e.code === "Escape") {
        e.preventDefault();
        togglePause();
        return;
      }
      const m = CODEMAP[e.code];
      if (!m) return;
      e.preventDefault();
      if (e.repeat) return; // 반복은 게임 루프가 직접 처리
      if (g.phase !== "prep" && g.phase !== "wave") return;
      if (g.paused) return;
      const [pi, act] = m;
      if (act === "build") doBuild(g, pi);
      else if (act === "skill") doSkill(g, pi);
      else {
        applyMove(g, pi, act);
        const p = g.players[pi];
        if (!p.heldKeys.includes(act)) p.heldKeys.push(act);
        p.holdT = 0.24;
      }
    }
    function onUp(e) {
      const m = CODEMAP[e.code];
      if (!m) return;
      const [pi, act] = m;
      const p = G.current.players[pi];
      p.heldKeys = p.heldKeys.filter((a) => a !== act);
    }
    function onBlur() {
      G.current.players.forEach((p) => (p.heldKeys = []));
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [start, togglePause]);

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function applyMove(g, pi, act) {
    const p = g.players[pi];
    const from = sk(p.lane, p.slot);
    const cur = SLOTS[from];
    const [ux, uy] = DIRS[act];
    let best = -1, bestScore = Infinity;
    SLOTS.forEach((s, i) => {
      if (i === from) return;
      const dx = s.x - cur.x, dy = s.y - cur.y;
      const proj = dx * ux + dy * uy;          // 누른 방향으로 얼마나 갔는가
      if (proj <= 8) return;
      const perp = Math.abs(dx * -uy + dy * ux); // 방향에서 얼마나 벗어났는가
      if (perp > proj * 1.9) return;             // 약 62도 안쪽만 후보
      const score = proj + perp * 1.9;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best < 0) { p.jolt = 0.12; return; }   // 그 방향에 자리가 없으면 제자리
    p.lane = SLOTS[best].lane;
    p.slot = SLOTS[best].idx;
    p.jolt = 0.2;
  }

  function say(g, x, y, text, color) {
    g.fx.push({ x, y, text, color, t: 1.1 });
  }

  function doBuild(g, pi) {
    const p = g.players[pi];
    const key = sk(p.lane, p.slot);
    const s = SLOTS[key];
    const t = g.towers[key];
    const cls = CLASSES[pi];
    if (!t) {
      if (p.gold < cls.cost) return say(g, s.x, s.y, "골드 부족", C.sub);
      p.gold -= cls.cost;
      p.built++;
      g.towers[key] = { owner: pi, lv: 1, cd: 0, pulse: 0.4 };
      say(g, s.x, s.y, cls.name + " 배치", C.p[pi]);
    } else if (t.owner === pi) {
      if (t.lv >= 4) return say(g, s.x, s.y, "최대 단계", C.sub);
      const cost = Math.round(cls.cost * (0.7 + t.lv * 0.45));
      if (p.gold < cost) return say(g, s.x, s.y, `${cost} 골드 필요`, C.sub);
      p.gold -= cost;
      t.lv++;
      t.pulse = 0.4;
      say(g, s.x, s.y, `${t.lv}단계`, C.p[pi]);
    } else {
      say(g, s.x, s.y, `${t.owner + 1}P 타워`, C.sub);
    }
  }

  function doSkill(g, pi) {
    const p = g.players[pi];
    if (p.cd > 0) return say(g, CX, CY - 70, `${SKILLS[pi].name} 재사용 ${Math.ceil(p.cd)}초`, C.sub);
    p.cd = SKILLS[pi].cd;
    if (pi === 0) {
      g.focus = 8;
      say(g, CX, CY - 60, "집중 사격", C.p[0]);
    } else if (pi === 1) {
      g.enemies.forEach((e) => hurt(g, e, 45, 1, true));
      g.shake = 0.45;
      say(g, CX, CY - 60, "융단 폭격", C.p[1]);
    } else if (pi === 2) {
      g.enemies.forEach((e) => { e.freeze = Math.max(e.freeze, 4); });
      say(g, CX, CY - 60, "한파", C.p[2]);
    } else {
      g.players.forEach((q) => (q.gold += 45));
      g.core.hp = Math.min(g.core.max, g.core.hp + 12);
      say(g, CX, CY - 60, "긴급 보급", C.p[3]);
    }
  }

  function hurt(g, e, dmg, byPlayer, ignoreRes) {
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
        g.players.forEach((p) => (p.gold += reward / 4));
      }
      g.fx.push({ x: e.x, y: e.y, ring: 1, t: 0.4, color: C.sub });
    }
  }

  /* ── 루프 ───────────────────────────────────────────── */
  useEffect(() => {
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf, last = performance.now(), frame = 0;

    const loop = (now) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;
      if (!G.current.paused) step(G.current, dt);
      draw(ctx, G.current);
      frame++;
      if (frame % 5 === 0) setHud(snapshot(G.current));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function step(g, dt) {
    g.t += dt;
    if (g.shake > 0) g.shake -= dt;
    g.fx.forEach((f) => (f.t -= dt));
    g.fx = g.fx.filter((f) => f.t > 0);

    // 커서는 항상 목표 자리로 부드럽게 따라간다
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

    // 방향키를 누르고 있으면 연속 이동 (가장 최근에 누른 방향을 우선한다)
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

    // 웨이브 진행
    if (g.phase === "prep") {
      g.timer -= dt;
      if (g.timer <= 0) {
        g.phase = "wave";
        g.queue = buildQueue(g.wave);
        g.spawnT = 0;
      }
    } else if (g.phase === "wave") {
      g.spawnT -= dt;
      if (g.queue.length && g.spawnT <= 0) {
        const q = g.queue.shift();
        const base = ENEMY[q.type];
        const scale = Math.pow(1.155, g.wave - 1);
        g.enemies.push({
          type: q.type, lane: q.lane, p: 0,
          hp: base.hp * scale, max: base.hp * scale,
          x: LANES[q.lane].x, y: LANES[q.lane].y,
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

    // 보급 버프 계산
    const supports = [];
    g.towers.forEach((t, i) => { if (t && t.owner === 3) supports.push({ t, s: SLOTS[i] }); });
    supports.forEach(({ t }) => {
      g.players.forEach((p) => (p.gold += CLASSES[3].gold * t.lv * dt));
    });

    // 타워 사격
    g.towers.forEach((t, i) => {
      if (!t) return;
      if (t.pulse > 0) t.pulse -= dt;
      const cls = CLASSES[t.owner];
      if (t.owner === 3) return;
      const s = SLOTS[i];
      let mul = 1;
      supports.forEach((sp) => {
        if (Math.hypot(sp.s.x - s.x, sp.s.y - s.y) <= CLASSES[3].range) mul = Math.max(mul, 1 + CLASSES[3].buff * sp.t.lv);
      });
      t.cd -= dt * mul;
      if (t.cd > 0) return;
      const range = cls.range + 12 * (t.lv - 1);
      let target = null;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - s.x, e.y - s.y) > range) continue;
        if (!target || e.p > target.p) target = e;
      }
      if (!target) { t.cd = 0; return; }
      t.cd = cls.interval;
      let dmg = cls.dmg * (1 + 0.62 * (t.lv - 1));
      if (t.owner === 0 && g.focus > 0) dmg *= 2;
      g.bullets.push({
        x: s.x, y: s.y, tx: target.x, ty: target.y, target, dmg,
        owner: t.owner, splash: cls.splash || 0, slow: cls.slow || 0, slowT: cls.slowT || 0,
        speed: t.owner === 1 ? 300 : 470,
      });
      t.pulse = 0.18;
    });

    // 탄
    g.bullets = g.bullets.filter((b) => {
      const tg = b.target;
      if (tg && !tg.dead) { b.tx = tg.x; b.ty = tg.y; }
      const dx = b.tx - b.x, dy = b.ty - b.y;
      const d = Math.hypot(dx, dy);
      const mv = b.speed * dt;
      if (d <= mv) {
        if (b.splash) {
          g.enemies.forEach((e) => {
            if (e.dead) return;
            const dd = Math.hypot(e.x - b.tx, e.y - b.ty);
            if (dd <= b.splash) hurt(g, e, b.dmg * (dd < b.splash * 0.5 ? 1 : 0.6), b.owner);
          });
          g.fx.push({ x: b.tx, y: b.ty, ring: b.splash, t: 0.28, color: C.p[1] });
        } else if (tg && !tg.dead) {
          hurt(g, tg, b.dmg, b.owner);
          if (b.slow) { tg.slow = Math.max(tg.slow, b.slowT); tg.slowAmt = b.slow; }
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
      e.p += (spd * dt) / LANE_LEN[e.lane];
      const L = LANES[e.lane];
      e.x = L.x + (CX - L.x) * e.p;
      e.y = L.y + (CY - L.y) * e.p;
      if ((1 - e.p) * LANE_LEN[e.lane] <= 40) {
        e.dead = true;
        g.core.hp -= ENEMY[e.type].dmg;
        g.shake = 0.3;
        g.fx.push({ x: CX, y: CY, ring: 40, t: 0.35, color: C.alert });
      }
    });
    g.enemies = g.enemies.filter((e) => !e.dead);
    g.bullets = g.bullets.filter((b) => !b.target || !b.target.dead || b.splash);

    if (g.core.hp <= 0) { g.core.hp = 0; g.phase = "over"; }
  }

  /* ── 그리기 ─────────────────────────────────────────── */
  function draw(ctx, g) {
    ctx.save();
    if (g.shake > 0) {
      const s = g.shake * 6;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    ctx.fillStyle = C.bg;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // 배경 격자
    ctx.strokeStyle = "rgba(35,40,42,0.045)";
    ctx.lineWidth = 1;
    for (let x = 30; x < W; x += 45) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
    for (let y = 30; y < H; y += 45) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }

    // 경로
    LANES.forEach((L, i) => {
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(CX, CY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.sub;
      ctx.strokeRect(L.x - 11.5, L.y - 11.5, 23, 23);
      ctx.fillStyle = C.sub;
      ctx.font = "500 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      const ox = (L.x - CX) / R_SPAWN, oy = (L.y - CY) / R_SPAWN;
      ctx.fillText(L.name, L.x + ox * 26, L.y + oy * 26 + 4);
    });

    // 커서 사거리 미리보기
    g.players.forEach((p, pi) => {
      if (g.phase !== "prep" && g.phase !== "wave") return;
      ctx.strokeStyle = C.p[pi] + "34";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.cx, p.cy, p.cr, 0, Math.PI * 2); ctx.stroke();
    });

    // 슬롯 · 타워
    SLOTS.forEach((s, i) => {
      const t = g.towers[i];
      if (!t) {
        ctx.strokeStyle = C.lineSoft;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const col = C.p[t.owner];
        const pr = t.pulse > 0 ? Math.pow(Math.min(1, t.pulse / 0.4), 1.7) : 0;
        const r = 12 + pr * 7;
        ctx.fillStyle = C.panel;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = col;
        if (t.owner === 0) { ctx.fillRect(s.x - 1, s.y - 6, 2, 12); ctx.fillRect(s.x - 6, s.y - 1, 12, 2); }
        else if (t.owner === 1) { ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, Math.PI * 2); ctx.fill(); }
        else if (t.owner === 2) { ctx.beginPath(); ctx.moveTo(s.x, s.y - 5); ctx.lineTo(s.x + 5, s.y + 4); ctx.lineTo(s.x - 5, s.y + 4); ctx.closePath(); ctx.fill(); }
        else { ctx.fillRect(s.x - 4, s.y - 4, 8, 8); }
        for (let l = 0; l < t.lv; l++) {
          ctx.fillStyle = col;
          ctx.fillRect(s.x - 6 + l * 4, s.y + 15, 2.5, 2.5);
        }
      }
    });

    // 코어
    const ratio = Math.max(0, g.core.hp / g.core.max);
    ctx.fillStyle = C.panel;
    ctx.beginPath(); ctx.arc(CX, CY, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CX, CY, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.alert; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(CX, CY, 41, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio); ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.font = "600 17px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(Math.max(0, Math.round(g.core.hp)), CX, CY + 2);
    ctx.fillStyle = C.sub;
    ctx.font = "500 10px system-ui, sans-serif";
    ctx.fillText("코어", CX, CY + 16);

    // 탄
    g.bullets.forEach((b) => {
      ctx.fillStyle = C.p[b.owner];
      ctx.beginPath(); ctx.arc(b.x, b.y, b.splash ? 3.2 : 2.2, 0, Math.PI * 2); ctx.fill();
    });

    // 적
    g.enemies.forEach((e) => {
      const cfg = ENEMY[e.type];
      const r = cfg.r;
      const grow = Math.min(1, e.age / 0.35);
      const sc = 0.45 + (1 - Math.pow(1 - grow, 3)) * 0.55;
      const L = LANES[e.lane];
      const ang = Math.atan2(CY - L.y, CX - L.x);

      ctx.save();
      ctx.globalAlpha = grow;
      ctx.translate(e.x, e.y);
      ctx.scale(sc, sc);
      ctx.lineWidth = 1.3 / sc;
      ctx.strokeStyle = e.flash > 0 ? C.text : e.freeze > 0 ? C.p[2] : C.sub;
      ctx.fillStyle = e.freeze > 0 ? "#DCE3E6" : C.panel;
      ctx.beginPath();
      if (e.type === "grunt") {
        const wob = 1 + Math.sin(e.age * 7 + e.lane) * 0.06;
        ctx.arc(0, 0, r * wob, 0, Math.PI * 2);
      } else if (e.type === "rusher") {
        ctx.rotate(ang);
        ctx.moveTo(r, 0); ctx.lineTo(-r, -r * 0.8); ctx.lineTo(-r, r * 0.8); ctx.closePath();
      } else if (e.type === "armor") {
        ctx.rotate(Math.sin(e.age * 2.2) * 0.07);
        ctx.rect(-r, -r, r * 2, r * 2);
      } else {
        ctx.rotate(e.age * 0.5);
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
      }
      ctx.fill(); ctx.stroke();
      ctx.restore();

      const hr = Math.max(0, e.hp / e.max);
      e.shown = e.shown === undefined ? hr : e.shown + (hr - e.shown) * 0.18;
      if (e.shown < 0.999) {
        const y = e.y + r + 5;
        ctx.globalAlpha = grow;
        ctx.lineWidth = 1;
        ctx.strokeStyle = C.lineSoft;
        ctx.beginPath(); ctx.moveTo(e.x - r, y); ctx.lineTo(e.x + r, y); ctx.stroke();
        ctx.strokeStyle = C.text;
        ctx.beginPath(); ctx.moveTo(e.x - r, y); ctx.lineTo(e.x - r + r * 2 * e.shown, y); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // 커서
    g.players.forEach((p, pi) => {
      if (g.phase !== "prep" && g.phase !== "wave") return;
      const col = C.p[pi];
      const s = SLOTS[sk(p.lane, p.slot)];
      const gap = Math.hypot(s.x - p.cx, s.y - p.cy);
      const jo = p.jolt > 0 ? Math.pow(p.jolt / 0.2, 2) : 0;
      const b = 17 + jo * 5 + Math.min(gap * 0.06, 4) + Math.sin(g.t * 3 + pi) * 0.7;
      const arm = 6 + jo * 2;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([ax, ay]) => {
        ctx.beginPath();
        ctx.moveTo(p.cx + ax * b, p.cy + ay * b - ay * arm);
        ctx.lineTo(p.cx + ax * b, p.cy + ay * b);
        ctx.lineTo(p.cx + ax * b - ax * arm, p.cy + ay * b);
        ctx.stroke();
      });
      ctx.lineCap = "butt";
      ctx.fillStyle = col;
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${pi + 1}P`, p.cx + b + 4, p.cy - b + 4);
    });

    // 효과
    g.fx.forEach((f) => {
      if (f.ring) {
        ctx.strokeStyle = f.color;
        ctx.globalAlpha = Math.max(0, f.t * 2);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.ring * (1.6 - f.t * 2), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        const prog = 1 - f.t / 1.1;
        ctx.globalAlpha = Math.min(1, f.t * 2.2) * (1 - Math.pow(prog, 3));
        ctx.fillStyle = f.color;
        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y - 26 - (1 - Math.pow(1 - prog, 2)) * 16);
        ctx.globalAlpha = 1;
      }
    });

    if (g.paused) {
      ctx.fillStyle = "rgba(235,237,234,0.82)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.text;
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("일시정지", CX, CY - 8);
      ctx.fillStyle = C.sub;
      ctx.font = "500 12px system-ui, sans-serif";
      ctx.fillText("Esc 를 눌러 계속하기", CX, CY + 16);
    }
    ctx.restore();
  }

  /* ── 화면 ───────────────────────────────────────────── */
  const kc = {
    display: "inline-block", minWidth: 18, padding: "1px 5px", textAlign: "center",
    border: `1px solid ${C.line}`, fontSize: 11, color: C.sub, marginRight: 4, lineHeight: 1.5,
  };

  const phaseLabel =
    hud.phase === "ready" ? "대기" :
    hud.phase === "prep" ? "준비" :
    hud.phase === "wave" ? "교전" :
    hud.phase === "clear" ? "방어 성공" : "코어 파괴";

  const playing = hud.phase === "prep" || hud.phase === "wave";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "28px 24px 48px",
      fontFamily: "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif", letterSpacing: "-0.02em" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>

        {/* 머리말 */}
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          gap: 24, borderBottom: `1px solid ${C.line}`, paddingBottom: 18, marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.035em" }}>
              네 갈래 방어선<br />
              <span style={{ color: C.sub, fontWeight: 500 }}>키보드 하나, 네 사람</span>
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: 13.5, color: C.sub, maxWidth: 520, lineHeight: 1.7 }}>
              북·동·남·서 네 방향에서 코어로 적이 밀려옵니다. 각자 다른 타워를 맡아 스무 개의 자리를 나눠 채우고,
              15번의 웨이브 동안 코어를 지켜내세요.
            </p>
          </div>
          <div style={{ textAlign: "left", minWidth: 210 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, color: C.sub }}>{phaseLabel}</span>
              {playing && (
                <button onClick={togglePause}
                  style={{ background: "none", border: `1px solid ${C.line}`, color: C.text, padding: "3px 10px",
                    fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.02em" }}>
                  {hud.paused ? "계속하기" : "일시정지"}
                </button>
              )}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
              웨이브 {hud.wave || 0}<span style={{ color: C.sub, fontSize: 16, fontWeight: 500 }}> / {TOTAL_WAVES}</span>
            </div>
            <div style={{ marginTop: 10, height: 1, background: C.line }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.sub, marginTop: 8 }}>
              <span>{hud.phase === "prep" ? `배치 시간 ${Math.ceil(hud.timer)}초` : hud.phase === "wave" ? `남은 적 ${hud.left}` : "—"}</span>
              <span>코어 {hud.hp}</span>
            </div>
            <div style={{ marginTop: 6, height: 3, background: C.lineSoft }}>
              <div style={{ width: `${(hud.hp / hud.max) * 100}%`, height: "100%", background: C.alert, transition: "width .2s" }} />
            </div>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "268px minmax(0,1fr)", gap: 28, alignItems: "start" }}>

          {/* 좌측 플레이어 패널 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hud.players.map((p, i) => {
              const cls = CLASSES[i];
              const ready = p.cd <= 0;
              return (
                <div key={i} style={{ background: C.panel, border: `1px solid ${C.line}`, padding: "13px 14px 12px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ width: 8, height: 8, background: C.p[i], display: "inline-block" }} />
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{i + 1}P {cls.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em" }}>{p.gold}</span>
                    <span style={{ fontSize: 11, color: C.sub }}>골드</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.sub, marginTop: 5, lineHeight: 1.5 }}>{cls.note}</div>

                  <div style={{ height: 1, background: C.lineSoft, margin: "10px 0 9px" }} />

                  <div style={{ fontSize: 11.5, color: C.sub, display: "flex", justifyContent: "space-between" }}>
                    <span>{LANES[p.lane].name} · {p.slot + 1}번 자리</span>
                    <span>건설 {p.built} · 처치 {p.kills}</span>
                  </div>

                  <div style={{ marginTop: 9, fontSize: 11.5, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: ready ? C.text : C.sub, fontWeight: ready ? 600 : 500 }}>{SKILLS[i].name}</span>
                    <span style={{ color: C.sub }}>{ready ? "사용 가능" : `${Math.ceil(p.cd)}초`}</span>
                  </div>
                  <div style={{ height: 2, background: C.lineSoft, marginTop: 5 }}>
                    <div style={{ width: `${ready ? 100 : (1 - p.cd / SKILLS[i].cd) * 100}%`, height: "100%", background: C.p[i] }} />
                  </div>

                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: "4px 10px", fontSize: 11, color: C.sub }}>
                    <span><b style={kc}>{KEYS[i].cap.move}</b>이동</span>
                    <span><b style={kc}>{KEYS[i].cap.build}</b>건설</span>
                    <span><b style={kc}>{KEYS[i].cap.skill}</b>스킬</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 전장 */}
          <div>
            <div style={{ position: "relative", border: `1px solid ${C.line}`, background: C.bg }}>
              <canvas ref={cvsRef} style={{ width: "100%", height: "auto", display: "block" }} />

              {(hud.phase === "ready" || hud.phase === "over" || hud.phase === "clear") && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(235,237,234,0.92)",
                  display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8%" }}>
                  <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
                    {hud.phase === "ready" ? "네 명 모두 자리에 앉았나요" : `웨이브 ${hud.wave}에서 종료`}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.035em", maxWidth: 420 }}>
                    {hud.phase === "ready" && <>첫 웨이브까지<br />{PREP}초의 배치 시간이 있습니다</>}
                    {hud.phase === "clear" && <>코어를 지켰습니다<br />15번의 웨이브 전부 방어</>}
                    {hud.phase === "over" && <>코어가 무너졌습니다<br />방어선을 다시 세워보세요</>}
                  </div>
                  <button onClick={start}
                    style={{ marginTop: 22, alignSelf: "flex-start", background: C.text, color: C.panel,
                      border: "none", padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                      letterSpacing: "-0.02em", fontFamily: "inherit" }}>
                    {hud.phase === "ready" ? "방어 시작" : "다시 시작"}
                  </button>
                  <div style={{ marginTop: 10, fontSize: 11.5, color: C.sub }}>스페이스바로도 시작합니다</div>
                </div>
              )}
            </div>

            {/* 하단 안내 */}
            <div style={{ marginTop: 14, display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 340px" }}>
                <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.75 }}>
                  자리는 네 경로에 다섯 칸씩, 모두 스무 칸입니다. 누구나 어느 경로에든 지을 수 있으니
                  뚫리는 쪽을 서로 불러주세요. 같은 자리에 자기 타워를 다시 지으면 4단계까지 강화됩니다.
                  게임 중 <b style={kc}>Esc</b>로 언제든 일시정지할 수 있습니다.
                </div>
              </div>
              <button onClick={() => setHelpOpen((v) => !v)}
                style={{ background: "none", border: `1px solid ${C.line}`, color: C.text, padding: "7px 14px",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.02em" }}>
                {helpOpen ? "적 정보 닫기" : "적 정보 보기"}
              </button>
            </div>

            {helpOpen && (
              <div style={{ marginTop: 12, border: `1px solid ${C.line}`, background: C.panel }}>
                {Object.entries(ENEMY).map(([k, v], i) => (
                  <div key={k} style={{ display: "flex", gap: 16, padding: "10px 14px",
                    borderTop: i ? `1px solid ${C.lineSoft}` : "none", fontSize: 12.5, alignItems: "baseline" }}>
                    <span style={{ width: 52, fontWeight: 600 }}>{v.label}</span>
                    <span style={{ color: C.sub, flex: 1 }}>
                      {k === "grunt" && "기본 병력. 3웨이브까지는 이 유형만 들어옵니다."}
                      {k === "rusher" && "3웨이브부터. 체력은 낮지만 두 배 빠릅니다."}
                      {k === "armor" && "5웨이브부터. 받는 피해를 25% 줄입니다."}
                      {k === "boss" && "5·10·15웨이브. 코어에 닿으면 25 피해를 줍니다."}
                    </span>
                    <span style={{ color: C.sub, width: 108 }}>체력 {v.hp} · 속도 {v.spd}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 268px"] { grid-template-columns: 1fr !important; }
        }
        button:focus-visible { outline: 2px solid ${C.text}; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
