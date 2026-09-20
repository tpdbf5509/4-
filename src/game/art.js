import {
  W, H, CX, CY, R_CORE, C, P, DIRS4, LANES, SLOTS, sk, ENEMY,
  castleTier, castleCost, CASTLE_TIERS, SPOTS, CLASSES, ARENA, ARENA_PATTERNS, arenaKit, arenaRange,
} from "./world.js";

/* ── 그리기 도우미 ──────────────────────────────────────── */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* 적 그림 — public/assets/enemies 의 도트 스프라이트.
   h 는 적의 지역 좌표 높이이고, foot 은 발이 닿는 y 다(그림자 위치와 같다).
   파일이 아직 안 왔거나 못 불러오면 예전처럼 손으로 그린다. */
export const ENEMY_ART = {
  grunt:  { src: "/assets/enemies/grunt.webp",  h: 31 },
  rusher: { src: "/assets/enemies/rusher.webp", h: 28 },
  armor:  { src: "/assets/enemies/armor.webp",  h: 33 },
  boss:   { src: "/assets/enemies/boss.webp",   h: 34 },
  titan:  { src: "/assets/enemies/titan.webp",  h: 62 },
};
const FOOT = 9;                       // 지역 좌표에서 발이 닿는 높이
const spriteCache = {};

function enemySprite(kind) {
  if (!ENEMY_ART[kind] || typeof Image === "undefined") return null;
  let im = spriteCache[kind];
  if (im === undefined) {
    im = spriteCache[kind] = new Image();
    im.onerror = () => { spriteCache[kind] = null; };
    im.src = ENEMY_ART[kind].src;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}

export function shadow(ctx, x, y, rx, ry, alpha = 0.22) {
  ctx.fillStyle = `rgba(28,42,20,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 길에서 얼마나 떨어져 있는지 (지형 장식이 길을 덮지 않게)
export function distToPaths(x, y) {
  let best = 1e9;
  for (const L of LANES) {
    for (let k = 0; k < L.pts.length; k += 2) {
      const d = Math.hypot(L.pts[k].x - x, L.pts[k].y - y);
      if (d < best) best = d;
    }
  }
  return best;
}

/* ── 정적 배경(지형·길·숲) — 한 번만 그려서 재사용 ─────── */
export function paintTerrain(ctx) {
  const rnd = mulberry32(20260917);

  // 잔디 바탕
  const g = ctx.createRadialGradient(CX, CY - 40, 60, CX, CY, 560);
  g.addColorStop(0, "#77b44d");
  g.addColorStop(0.55, C.grass);
  g.addColorStop(1, "#4d8632");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 잔디 얼룩
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * H;
    const r = 14 + rnd() * 48;
    ctx.fillStyle = rnd() > 0.5 ? "rgba(125,187,82,0.30)" : "rgba(63,113,40,0.20)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rnd() * 0.4), rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 잔디 포기
  ctx.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (distToPaths(x, y) < 28) continue;
    const h = 3 + rnd() * 4;
    ctx.strokeStyle = rnd() > 0.45 ? "rgba(62,110,38,0.55)" : "rgba(140,200,95,0.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2 - rnd() * 2, y - h);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2 + rnd() * 2, y - h * 0.85);
    ctx.stroke();
  }

  // 길: 바깥 그림자 → 흙 → 안쪽 밝은 결
  const strokePath = (L, width, style) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(L.pts[0].x, L.pts[0].y);
    for (let k = 1; k < L.pts.length; k++) ctx.lineTo(L.pts[k].x, L.pts[k].y);
    ctx.stroke();
  };
  LANES.forEach((L) => strokePath(L, 48, "rgba(47,84,28,0.45)"));
  LANES.forEach((L) => strokePath(L, 42, C.dirtEdge));
  LANES.forEach((L) => strokePath(L, 36, C.dirt));
  LANES.forEach((L) => strokePath(L, 22, "rgba(226,193,142,0.55)"));

  // 길 위 자갈과 바퀴 자국
  LANES.forEach((L) => {
    for (let k = 4; k < L.pts.length - 4; k += 3) {
      const p = L.pts[k], q = L.pts[k + 1];
      let tx = q.x - p.x, ty = q.y - p.y;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const off = (rnd() - 0.5) * 26;
      const x = p.x - ty * off, y = p.y + tx * off;
      ctx.fillStyle = rnd() > 0.5 ? "rgba(146,110,62,0.55)" : "rgba(238,214,168,0.5)";
      ctx.beginPath();
      ctx.ellipse(x, y, 1.6 + rnd() * 2.6, 1.2 + rnd() * 1.8, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // 길가 돌
    for (let k = 3; k < L.pts.length - 3; k += 6) {
      const p = L.pts[k], q = L.pts[k + 1];
      let tx = q.x - p.x, ty = q.y - p.y;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      for (const side of [-1, 1]) {
        const off = side * (20 + rnd() * 4);
        const x = p.x - ty * off, y = p.y + tx * off;
        const r = 2.4 + rnd() * 2.2;
        ctx.fillStyle = "#9e968a";
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c2bbae";
        ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.25, r * 0.6, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  });

  // 숲과 바위
  const spots = [];
  const okSpot = (x, y, pad) => {
    if (x < 16 || x > W - 16 || y < 16 || y > H - 16) return false;
    if (Math.hypot(x - CX, y - CY) < R_CORE + 34) return false;
    if (distToPaths(x, y) < 42) return false;
    for (const s of SLOTS) if (Math.hypot(s.x - x, s.y - y) < 44) return false;
    for (const s of spots) if (Math.hypot(s.x - x, s.y - y) < pad) return false;
    return true;
  };

  // 숲은 바깥일수록 빽빽하게, 전장(가운데)은 트이게
  const forestOdds = (x, y) => {
    const d = Math.hypot(x - CX, y - CY);
    if (d < 150) return 0;
    return Math.min(1, Math.pow((d - 150) / 210, 1.5));
  };

  const trees = [];
  for (let i = 0; i < 900 && trees.length < 52; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (rnd() > forestOdds(x, y)) continue;
    if (!okSpot(x, y, 46)) continue;
    spots.push({ x, y });
    // 한 그루가 자리 잡으면 곁에 한두 그루 더 — 무리 지어 자라게
    const group = 1 + Math.floor(rnd() * 2.6);
    for (let k = 0; k < group && trees.length < 52; k++) {
      const gx = x + (rnd() - 0.5) * 66, gy = y + (rnd() - 0.5) * 50;
      if (k > 0 && !okSpot(gx, gy, 30)) continue;
      spots.push({ x: gx, y: gy });
      trees.push({ x: gx, y: gy, s: 0.78 + rnd() * 0.5, pine: rnd() > 0.5, seed: rnd() * 99 });
    }
  }
  const rocks = [];
  for (let i = 0; i < 300 && rocks.length < 18; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!okSpot(x, y, 42)) continue;
    spots.push({ x, y });
    rocks.push({ x, y, s: 0.7 + rnd() * 0.7 });
  }
  const bushes = [];
  for (let i = 0; i < 340 && bushes.length < 30; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (!okSpot(x, y, 34)) continue;
    spots.push({ x, y });
    bushes.push({ x, y, s: 0.65 + rnd() * 0.5, berry: rnd() > 0.65 });
  }

  // 들꽃
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (distToPaths(x, y) < 32) continue;
    const col = ["#f2e46b", "#f0f0ef", "#eba3c6", "#f5b657"][Math.floor(rnd() * 4)];
    ctx.fillStyle = col;
    for (let k = 0; k < 4; k++) {
      const a = (Math.PI / 2) * k;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 낮은 것부터 그려 겹침이 자연스럽게
  const scenery = [...rocks.map((o) => ({ ...o, k: "rock" })),
                   ...bushes.map((o) => ({ ...o, k: "bush" })),
                   ...trees.map((o) => ({ ...o, k: "tree" }))].sort((a, b) => a.y - b.y);
  scenery.forEach((o) => {
    if (o.k === "rock") drawRock(ctx, o.x, o.y, o.s);
    else if (o.k === "bush") drawBush(ctx, o.x, o.y, o.s, o.berry);
    else drawTree(ctx, o.x, o.y, o.s, o.pine, o.seed);
  });

  // 가장자리 어둡게
  const vig = ctx.createRadialGradient(CX, CY, 220, CX, CY, 620);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(18,40,12,0.42)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

export function drawTree(ctx, x, y, s, pine, seed) {
  shadow(ctx, x + 3 * s, y + 3 * s, 15 * s, 6 * s, 0.24);
  ctx.fillStyle = C.woodDark;
  roundRect(ctx, x - 3 * s, y - 14 * s, 6 * s, 16 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = "#7d5330";
  roundRect(ctx, x - 3 * s, y - 14 * s, 3 * s, 16 * s, 2 * s);
  ctx.fill();

  if (pine) {
    for (let k = 0; k < 3; k++) {
      const w = (20 - k * 4) * s, h = 17 * s, ty = y - 10 * s - k * 11 * s;
      ctx.fillStyle = ["#2f6628", "#377230", "#3f8035"][k];
      ctx.beginPath();
      ctx.moveTo(x, ty - h);
      ctx.lineTo(x + w, ty);
      ctx.lineTo(x - w, ty);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(120,190,90,0.35)";
      ctx.beginPath();
      ctx.moveTo(x, ty - h);
      ctx.lineTo(x - w, ty);
      ctx.lineTo(x - w * 0.25, ty);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    const blobs = [[0, -30, 17], [-13, -22, 12], [13, -23, 12], [-6, -38, 11], [7, -37, 10]];
    ctx.fillStyle = "#2f6b28";
    blobs.forEach(([bx, by, r]) => {
      ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#3f8434";
    blobs.forEach(([bx, by, r]) => {
      ctx.beginPath(); ctx.arc(x + bx * s, (y + by * s) - 2 * s, r * 0.86 * s, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "rgba(134,199,94,0.75)";
    ctx.beginPath(); ctx.arc(x - 7 * s, y - 36 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4 * s + (seed % 3), y - 28 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawRock(ctx, x, y, s) {
  shadow(ctx, x + 2 * s, y + 2 * s, 14 * s, 5 * s, 0.22);
  ctx.fillStyle = "#77747c";
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y + 3 * s);
  ctx.lineTo(x - 9 * s, y - 11 * s);
  ctx.lineTo(x + 2 * s, y - 15 * s);
  ctx.lineTo(x + 12 * s, y - 6 * s);
  ctx.lineTo(x + 13 * s, y + 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9c99a2";
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y - 11 * s);
  ctx.lineTo(x + 2 * s, y - 15 * s);
  ctx.lineTo(x + 6 * s, y - 7 * s);
  ctx.lineTo(x - 5 * s, y - 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(x - 7 * s, y - 10 * s);
  ctx.lineTo(x + 1 * s, y - 13 * s);
  ctx.lineTo(x - 1 * s, y - 8 * s);
  ctx.closePath();
  ctx.fill();
}

export function drawBush(ctx, x, y, s, berry) {
  shadow(ctx, x + 2 * s, y + 2 * s, 12 * s, 4.5 * s, 0.2);
  ctx.fillStyle = "#2f6b28";
  [[-8, 0, 9], [8, 0, 9], [0, -5, 11]].forEach(([bx, by, r]) => {
    ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#44903a";
  [[-7, -2, 7], [7, -2, 7], [0, -7, 9]].forEach(([bx, by, r]) => {
    ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, Math.PI * 2); ctx.fill();
  });
  if (berry) {
    ctx.fillStyle = "#d4453f";
    [[-5, -6], [3, -9], [7, -3]].forEach(([bx, by]) => {
      ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, 1.9 * s, 0, Math.PI * 2); ctx.fill();
    });
  }
}

/* ── 관문(적 출현구) ───────────────────────────────────── */
export function drawPortal(ctx, lane, time) {
  const L = LANES[lane];
  const p = L.pts[0];
  const ang = Math.atan2(L.dy, L.dx);
  ctx.save();
  ctx.translate(p.x, p.y);
  shadow(ctx, 0, 14, 30, 9, 0.28);

  ctx.rotate(ang + Math.PI / 2);
  // 돌 아치
  ctx.fillStyle = C.stoneDark;
  roundRect(ctx, -30, -20, 60, 40, 8); ctx.fill();
  ctx.fillStyle = C.stoneMid;
  roundRect(ctx, -27, -18, 54, 34, 7); ctx.fill();
  // 어두운 입구
  const gg = ctx.createLinearGradient(0, -14, 0, 14);
  gg.addColorStop(0, "#160f1c");
  gg.addColorStop(1, "#3a2340");
  ctx.fillStyle = gg;
  roundRect(ctx, -18, -12, 36, 26, 6); ctx.fill();
  // 안쪽 기운
  const pulse = 0.4 + 0.25 * Math.sin(time * 2.2 + lane);
  ctx.fillStyle = `rgba(190,110,230,${pulse})`;
  ctx.beginPath(); ctx.ellipse(0, 2, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
  // 돌 블록 선
  ctx.strokeStyle = "rgba(60,54,44,0.5)";
  ctx.lineWidth = 1.4;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(i * 14, -18); ctx.lineTo(i * 14, -12); ctx.stroke();
  }
  ctx.restore();
}

/* ── 성채 ───────────────────────────────────────────────── */
export const OUTLINE = "rgba(48,34,20,0.62)";

export function inkPath(ctx, fill, lw = 1.8, stroke = OUTLINE) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// 원통형 탑 하나 (성채 모서리·중앙 공용)
export function keepTower(ctx, x, y, r, h, roofCol, roofDark, time, flag) {
  // 몸통
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r, y - h);
  ctx.lineTo(x + r, y - h);
  ctx.lineTo(x + r, y);
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI);
  ctx.closePath();
  inkPath(ctx, C.stoneMid);
  ctx.beginPath();
  ctx.moveTo(x - r, y - 2);
  ctx.lineTo(x - r, y - h);
  ctx.lineTo(x - r * 0.15, y - h);
  ctx.lineTo(x - r * 0.15, y - 2);
  ctx.closePath();
  ctx.fillStyle = C.stone; ctx.fill();
  // 성가퀴
  ctx.beginPath();
  ctx.ellipse(x, y - h, r + 2.5, (r + 2.5) * 0.4, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stone, 1.6);
  const n = Math.max(4, Math.round(r / 2.6));
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const bx = x + Math.cos(a) * (r + 1.5);
    const by = y - h + Math.sin(a) * (r + 1.5) * 0.4;
    ctx.beginPath();
    roundRect(ctx, bx - 2.4, by - 6, 4.8, 7, 1.2);
    inkPath(ctx, C.stoneMid, 1.2);
  }
  // 지붕
  const rh = r * 1.9;
  ctx.beginPath();
  ctx.moveTo(x, y - h - 6 - rh);
  ctx.lineTo(x + r + 4, y - h - 4);
  ctx.lineTo(x - r - 4, y - h - 4);
  ctx.closePath();
  inkPath(ctx, roofDark, 1.8);
  ctx.beginPath();
  ctx.moveTo(x, y - h - 6 - rh);
  ctx.lineTo(x + 1, y - h - 4);
  ctx.lineTo(x - r - 4, y - h - 4);
  ctx.closePath();
  ctx.fillStyle = roofCol; ctx.fill();
  // 창
  ctx.beginPath();
  roundRect(ctx, x - r * 0.32, y - h * 0.62, r * 0.64, h * 0.34, r * 0.32);
  inkPath(ctx, "#4b3f2e", 1.2);

  if (flag) {
    const top = y - h - 6 - rh;
    ctx.strokeStyle = "#5b4a33"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - 20); ctx.stroke();
    const wv = Math.sin(time * 3) * 3;
    ctx.beginPath();
    ctx.moveTo(x, top - 20);
    ctx.quadraticCurveTo(x + 13, top - 17 + wv, x + 23, top - 14);
    ctx.lineTo(x + 23, top - 7);
    ctx.quadraticCurveTo(x + 12, top - 5 - wv, x, top - 7);
    ctx.closePath();
    inkPath(ctx, C.gold, 1.4);
  }
}

export const CASTLE_K = 0.72;   // 길에 비해 크지 않도록 줄여 그린다

export function drawCastle(ctx, g, time) {
  const ratio = Math.max(0, g.core.hp / g.core.max);
  const tier = castleTier(g);
  // 단계가 오를수록 벽이 두꺼워지고 지붕이 귀해진다
  const roof = tier >= 4 ? "#e0b23c" : tier >= 3 ? "#3f6fb5" : C.roof;
  const roofDark = tier >= 4 ? "#9a7820" : tier >= 3 ? "#26497f" : C.roofDark;
  const wallR = 62 + (tier - 1) * 3;
  const stone = tier >= 3 ? "#ded6c4" : C.stone;
  ctx.save();
  ctx.translate(CX, CY);
  ctx.scale(CASTLE_K, CASTLE_K);
  ctx.translate(-CX, -CY);
  shadow(ctx, CX, CY + 44, 92, 28, 0.32);

  // 언덕(바닥 단) — 옆면을 먼저 그려 높이감을 준다
  ctx.beginPath();
  ctx.ellipse(CX, CY + 24, 92, 54, 0, 0, Math.PI * 2);
  inkPath(ctx, "#7f9a4e", 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY + 14, 92, 54, 0, 0, Math.PI * 2);
  inkPath(ctx, "#93b25c", 2);

  // 바깥 방벽 — 2단계는 목책, 3단계부터는 돌담
  if (tier >= 2) {
    if (tier >= 3) {
      ctx.beginPath(); ctx.ellipse(CX, CY + 16, 88, 51, 0, 0, Math.PI * 2);
      inkPath(ctx, C.stoneDark, 1.8);
      ctx.beginPath(); ctx.ellipse(CX, CY + 12, 88, 51, 0, 0, Math.PI * 2);
      inkPath(ctx, "#b8ae98", 1.6);
      for (let a = 0; a < 20; a++) {
        const t = (a / 20) * Math.PI * 2;
        const x = CX + Math.cos(t) * 88, y = CY + 12 + Math.sin(t) * 51;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t + Math.PI / 2);
        ctx.beginPath(); roundRect(ctx, -3.4, -5, 6.8, 7, 1.2);
        inkPath(ctx, a % 2 ? C.stoneMid : stone, 1.1);
        ctx.restore();
      }
    } else {
      for (let a = 0; a < 26; a++) {
        const t = (a / 26) * Math.PI * 2;
        const x = CX + Math.cos(t) * 86, y = CY + 14 + Math.sin(t) * 50;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-3.4, 4); ctx.lineTo(-3.4, -7); ctx.lineTo(0, -11); ctx.lineTo(3.4, -7); ctx.lineTo(3.4, 4);
        ctx.closePath();
        inkPath(ctx, a % 2 ? "#8a5c34" : "#9a6a3c", 1.2);
        ctx.restore();
      }
    }
  }

  // 포석 마당
  ctx.beginPath();
  ctx.ellipse(CX, CY + 12, 80, 46, 0, 0, Math.PI * 2);
  inkPath(ctx, "#bfb5a0", 1.8);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(CX, CY + 12, 80, 46, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(122,112,94,0.4)";
  ctx.lineWidth = 1.3;
  for (let a = 0; a < 14; a++) {
    const t = (a / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(t) * 20, CY + 12 + Math.sin(t) * 12);
    ctx.lineTo(CX + Math.cos(t) * 82, CY + 12 + Math.sin(t) * 48);
    ctx.stroke();
  }
  for (const rr of [0.45, 0.75]) {
    ctx.beginPath();
    ctx.ellipse(CX, CY + 12, 80 * rr, 46 * rr, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 성벽 — 옆면 + 윗면으로 두께를 만든다
  ctx.beginPath();
  ctx.ellipse(CX, CY + 6, wallR, 36, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stoneDark, 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY - 4 - (tier - 1) * 2, wallR, 36, 0, 0, Math.PI * 2);
  inkPath(ctx, stone, 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY - 4, 46, 24, 0, 0, Math.PI * 2);
  inkPath(ctx, "#a79c86", 1.6);

  // 성가퀴 — 단계가 오를수록 촘촘해진다
  const merlons = 18 + (tier - 1) * 3;
  for (let a = 0; a < merlons; a++) {
    const t = (a / merlons) * Math.PI * 2;
    const x = CX + Math.cos(t) * wallR, y = CY - 4 - (tier - 1) * 2 + Math.sin(t) * 36;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t + Math.PI / 2);
    ctx.beginPath();
    roundRect(ctx, -4.6, -7, 9.2, 10, 1.6);
    inkPath(ctx, a % 2 ? C.stoneMid : stone, 1.3);
    ctx.restore();
  }

  // 네 방향 성문
  DIRS4.forEach((d) => {
    const x = CX + d.dx * (wallR - 4), y = CY - 4 + d.dy * 34;
    ctx.save();
    ctx.translate(x, y + 4);
    ctx.beginPath();
    roundRect(ctx, -10, -13, 20, 20, 8);
    inkPath(ctx, "#5d3f22", 1.8);
    ctx.beginPath();
    roundRect(ctx, -7.5, -11, 15, 17, 7);
    inkPath(ctx, "#8a5c34", 1.4);
    ctx.strokeStyle = "#54381f"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-7.5, -2); ctx.lineTo(7.5, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 6); ctx.stroke();
    ctx.restore();
  });

  // 모서리 탑 — 3단계부터 넷이 더 선다
  if (tier >= 3) {
    keepTower(ctx, CX - 58, CY - 2, 8, 20, roof, roofDark, time, false);
    keepTower(ctx, CX + 58, CY - 2, 8, 20, roof, roofDark, time, false);
    keepTower(ctx, CX - 20, CY - 22, 8, 19, roof, roofDark, time, false);
    keepTower(ctx, CX + 20, CY - 22, 8, 19, roof, roofDark, time, false);
  }
  keepTower(ctx, CX - 46, CY + 8, 11, 26, roof, roofDark, time, tier >= 2);
  keepTower(ctx, CX + 46, CY + 8, 11, 26, roof, roofDark, time, tier >= 2);
  keepTower(ctx, CX - 34, CY - 14, 10, 24 + (tier - 1) * 2, roof, roofDark, time, false);
  keepTower(ctx, CX + 34, CY - 14, 10, 24 + (tier - 1) * 2, roof, roofDark, time, false);
  keepTower(ctx, CX, CY - 2, 19 + (tier - 1) * 1.6, 48 + (tier - 1) * 7, roof, roofDark, time, true);

  // 4단계 — 성문마다 화톳불
  if (tier >= 4) {
    DIRS4.forEach((d, i) => {
      const x = CX + d.dx * (wallR - 16) + (d.dy ? 22 : 0);
      const y = CY + 6 + d.dy * 28 + (d.dx ? 14 : 0);
      ctx.beginPath(); roundRect(ctx, x - 5, y - 8, 10, 10, 2);
      inkPath(ctx, "#5d4a33", 1.2);
      const ph = (time * 1.6 + i * 0.4) % 1;
      const gl = ctx.createRadialGradient(x, y - 13, 0, x, y - 13, 10 + ph * 4);
      gl.addColorStop(0, "rgba(255,240,180,0.95)");
      gl.addColorStop(0.5, "rgba(250,160,50,0.8)");
      gl.addColorStop(1, "rgba(200,70,20,0)");
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(x, y - 13, 10 + ph * 4, 0, Math.PI * 2); ctx.fill();
    });
  }

  // 피해 흔적
  if (ratio < 0.65) {
    ctx.strokeStyle = "rgba(70,58,44,0.6)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(CX - 12, CY - 34); ctx.lineTo(CX - 6, CY - 22); ctx.lineTo(CX - 12, CY - 10);
    ctx.stroke();
  }
  if (ratio < 0.35) {
    for (let i = 0; i < 4; i++) {
      const ph = (time * 0.85 + i * 0.5) % 1;
      ctx.fillStyle = `rgba(92,82,74,${0.45 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(CX + 10 + i * 6, CY - 52 - ph * 40, 5 + ph * 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 성채 대포 — 성문 앞까지 붙은 적을 직접 때린다
  drawCastleGun(ctx, g, time);

  ctx.restore();

  // 마우스를 올렸을 때 — 여기를 누르면 올라간다
  if (g.hoverCastle) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,243,206,0.9)";
    ctx.lineWidth = 2.6;
    ctx.setLineDash([9, 7]);
    ctx.lineDashOffset = -time * 24;
    ctx.beginPath(); ctx.ellipse(CX, CY + 10, 68, 41, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,243,206,0.12)";
    ctx.beginPath(); ctx.ellipse(CX, CY + 10, 68, 41, 0, 0, Math.PI * 2); ctx.fill();
    const tier = castleTier(g);
    const label = tier >= CASTLE_TIERS ? "성채 최대 단계" : `성채 ${tier + 1}단계 · ${castleCost(g)}골드`;
    ctx.font = "700 14px Jua, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = "rgba(26,20,12,0.92)";
    ctx.strokeText(label, CX, CY - 58);
    ctx.fillStyle = "#ffeeba";
    ctx.fillText(label, CX, CY - 58);
    ctx.restore();
  }

  // 체력 띠
  const bw = 96;
  ctx.beginPath();
  roundRect(ctx, CX - bw / 2 - 4, CY + 44, bw + 8, 15, 7);
  inkPath(ctx, "rgba(38,28,18,0.86)", 1.6, "rgba(20,14,8,0.9)");
  ctx.fillStyle = "#392d20";
  roundRect(ctx, CX - bw / 2, CY + 47, bw, 9, 4); ctx.fill();
  const hc = ratio > 0.5 ? C.hpGood : ratio > 0.25 ? "#e0a53c" : C.hpLow;
  ctx.fillStyle = hc;
  roundRect(ctx, CX - bw / 2, CY + 47, Math.max(3, bw * ratio), 9, 4); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  roundRect(ctx, CX - bw / 2, CY + 47, Math.max(3, bw * ratio), 4, 2); ctx.fill();
}

/* ── 성채 대포 ──────────────────────────────────────────── */
export function drawCastleGun(ctx, g, time) {
  const cg = g.castle || { aim: -Math.PI / 2, pulse: 0 };
  const gy = CY - 24;      // 성벽 위 포좌
  const recoil = cg.pulse > 0 ? Math.pow(Math.max(0, cg.pulse) / 0.35, 2) : 0;

  // 포대 받침
  ctx.beginPath(); ctx.ellipse(CX, gy + 5, 22, 9, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stoneDark, 1.6);
  ctx.beginPath(); ctx.ellipse(CX, gy + 1, 22, 9, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stone, 1.4);

  ctx.save();
  ctx.translate(CX, gy - 3);
  ctx.rotate(cg.aim);
  const back = recoil * 7;
  // 포신
  ctx.beginPath(); roundRect(ctx, -12 - back, -7.5, 40, 15, 6.5);
  inkPath(ctx, "#39393f", 2);
  ctx.fillStyle = "#5d5d68";
  roundRect(ctx, -10 - back, -6, 34, 5.5, 3); ctx.fill();
  // 포구
  ctx.beginPath(); ctx.arc(27 - back, 0, 8.2, 0, Math.PI * 2);
  inkPath(ctx, "#2a2a30", 1.8);
  ctx.fillStyle = "#121216";
  ctx.beginPath(); ctx.arc(28 - back, 0, 5.2, 0, Math.PI * 2); ctx.fill();
  // 포미
  ctx.beginPath(); ctx.arc(-11 - back, 0, 8.6, 0, Math.PI * 2);
  inkPath(ctx, C.roof, 1.8);
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(-12.4 - back, -2.4, 3.4, 0, Math.PI * 2); ctx.fill();
  // 발사 섬광
  if (recoil > 0.25) {
    ctx.globalAlpha = recoil;
    const gl = ctx.createRadialGradient(32, 0, 0, 32, 0, 22);
    gl.addColorStop(0, "rgba(255,240,180,0.95)");
    gl.addColorStop(1, "rgba(250,160,60,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(32, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 포탄 더미
  [[-26, 4], [-20, 6], [-23, 0]].forEach(([ox, oy]) => {
    ctx.beginPath(); ctx.arc(CX + ox, gy + oy, 3.6, 0, Math.PI * 2);
    inkPath(ctx, "#33333a", 1.2);
  });
}

/* ── 타워 터 ────────────────────────────────────────────── */
export function drawPad(ctx, s, occupied, time, hover) {
  const sp = SPOTS[s.spot] || SPOTS.risk;
  shadow(ctx, s.x, s.y + 7, 21, 8, 0.26);
  // 흙더미 + 돌판(옆면을 먼저 그려 두께를 준다)
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, 21, 13, 0, 0, Math.PI * 2);
  inkPath(ctx, sp.dark, 1.6);
  ctx.beginPath(); ctx.ellipse(s.x, s.y, 21, 13, 0, 0, Math.PI * 2);
  inkPath(ctx, occupied ? "#b0a68f" : "#a89d86", 1.6);
  // 자리 성격 — 가장자리 색 띠
  ctx.save();
  ctx.globalAlpha = occupied ? 0.5 : 0.9;
  ctx.strokeStyle = sp.color;
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(s.x, s.y, 20, 12.2, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y - 3, 14, 7, 0, Math.PI, Math.PI * 2); ctx.fill();

  // 마우스가 올라간 자리
  if (hover) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,243,206,0.95)";
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 24, 15, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,243,206,0.16)";
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 24, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (!occupied) {
    const pulse = 0.45 + 0.25 * Math.sin(time * 2.4 + s.x * 0.05);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = sp.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 13, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // 몇 번째 자리인지 — 안내문의 "3번 자리"와 바로 맞춰볼 수 있게
  if (hover) {
    ctx.save();
    ctx.font = "700 12px Jua, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = "rgba(26,20,12,0.92)";
    ctx.strokeText(sp.name, s.x, s.y - 22);
    ctx.fillStyle = sp.color;
    ctx.fillText(sp.name, s.x, s.y - 22);
    ctx.font = "500 10.5px Jua, system-ui, sans-serif";
    ctx.strokeText(sp.note, s.x, s.y - 9);
    ctx.fillStyle = "rgba(246,229,187,0.95)";
    ctx.fillText(sp.note, s.x, s.y - 9);
    ctx.restore();
  }

  const bx = s.x - 17, by = s.y + 9;
  ctx.beginPath(); ctx.arc(bx, by, 8.4, 0, Math.PI * 2);
  inkPath(ctx, "rgba(38,28,18,0.88)", 1.4, "rgba(246,229,187,0.75)");
  ctx.fillStyle = "#f6e5bb";
  ctx.font = "700 11px 'Do Hyeon', Jua, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(s.idx + 1), bx, by + 0.5);
  ctx.textBaseline = "alphabetic";
}

/* ── 타워 ───────────────────────────────────────────────── */
/* ── 단계 치장 ──────────────────────────────────────────────
   탑 종류와 상관없이 같은 문법으로 자란다.
   2단계 돌 받침 · 3단계 깃발 · 4단계 금테와 반짝임            */
const GOLD_T = "#e8bd52", GOLD_D = "#9a7820", GOLD_L = "#ffe9a8";

export function tierPlinth(ctx, lv, col, time) {
  if (lv < 2) return;
  // 돌 받침 — 단계가 오를수록 넓고 두껍게
  const w = 26 + lv * 2.5, h = 14 + lv;
  ctx.beginPath(); ctx.ellipse(0, 7, w, h, 0, 0, Math.PI * 2);
  inkPath(ctx, "#6f6353", 1.5);
  ctx.beginPath(); ctx.ellipse(0, 3, w, h, 0, 0, Math.PI * 2);
  inkPath(ctx, "#b3a993", 1.5);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.62, h * 0.5, 0, Math.PI, Math.PI * 2); ctx.fill();

  // 3단계 — 네 귀퉁이에 주춧돌
  if (lv >= 3) {
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k / 4) * Math.PI * 2;
      const x = Math.cos(a) * (w - 5), y = 3 + Math.sin(a) * (h - 3);
      ctx.beginPath(); roundRect(ctx, x - 4, y - 5, 8, 8, 2);
      inkPath(ctx, "#8d8271", 1.2);
    }
  }
  // 4단계 — 금테
  if (lv >= 4) {
    ctx.save();
    ctx.strokeStyle = GOLD_T;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(0, 3, w - 2, h - 1.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(time * 2.4);
    ctx.strokeStyle = GOLD_L;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 3, w - 6, h - 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

export function tierCrown(ctx, lv, col, time, top) {
  // 3단계 — 양옆에 깃대
  if (lv >= 3) {
    const y0 = Math.min(-26, top + 6);
    [-1, 1].forEach((k) => {
      const x = k * 27;
      ctx.strokeStyle = lv >= 4 ? GOLD_D : "#5b4a33";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, y0); ctx.stroke();
      const wv = Math.sin(time * 3.4 + k) * 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x - k * 13, y0 + 5 + wv);
      ctx.lineTo(x, y0 + 11);
      ctx.closePath();
      inkPath(ctx, lv >= 4 ? GOLD_T : col.light, 1.3);
      if (lv >= 4) {
        ctx.beginPath(); ctx.arc(x, y0 - 2.5, 2.6, 0, Math.PI * 2);
        inkPath(ctx, GOLD_L, 1);
      }
    });
  }
  // 4단계 — 떠오르는 금빛 가루
  if (lv >= 4) {
    for (let k = 0; k < 3; k++) {
      const ph = ((time * 0.6 + k * 0.33) % 1);
      const x = Math.sin(k * 2.3 + time * 0.8) * 20;
      const y = 2 - ph * 46;
      ctx.save();
      ctx.globalAlpha = 0.85 * (1 - ph);
      ctx.translate(x, y);
      ctx.rotate(time * 1.6 + k);
      ctx.fillStyle = GOLD_L;
      ctx.beginPath();
      ctx.moveTo(0, -3.4); ctx.lineTo(2, 0); ctx.lineTo(0, 3.4); ctx.lineTo(-2, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

export function drawTower(ctx, t, s, time, g) {
  const lv = t.lv;
  // 지금 이 타워에 걸린 것들 — 발밑에 표시해 둔다
  if (g) {
    const p = g.players[t.owner];
    const hpr = Math.max(0, g.core.hp / g.core.max);
    const perks = (p && p.perks) || {};
    const fury = (perks.berserk && hpr < 0.9) || (perks.laststand && hpr <= 0.2);
    const rage = perks.thirst && p.rage > 0;
    if (fury || rage) {
      const pulse = 0.5 + 0.5 * Math.sin(time * (rage ? 9 : 4) + s.x);
      ctx.save();
      ctx.globalAlpha = 0.25 + pulse * 0.35;
      const gl = ctx.createRadialGradient(s.x, s.y + 2, 2, s.x, s.y + 2, 30);
      gl.addColorStop(0, rage ? "rgba(255,140,90,0.9)" : "rgba(220,60,50,0.85)");
      gl.addColorStop(1, "rgba(180,40,30,0)");
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (perks.command) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(255,226,150,0.9)";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 3, 24, 14, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  const recoil = t.pulse > 0 ? Math.pow(Math.max(0, t.pulse) / 0.4, 2) : 0;
  const col = P[t.owner];
  ctx.save();
  ctx.translate(s.x, s.y - 2);
  ctx.scale(0.86, 0.86);
  tierPlinth(ctx, lv, col, time);

  const kind = t.type || "archer";
  if (kind === "archer") drawArcherTower(ctx, lv, col, time, t, recoil);
  else if (kind === "cannon") drawCannonTower(ctx, lv, col, time, t, recoil);
  else if (kind === "frost") drawFrostTower(ctx, lv, col, time, t, recoil);
  else if (kind === "bolt") drawBoltTower(ctx, lv, col, time, t, recoil);
  else if (kind === "poison") drawPoisonTower(ctx, lv, col, time, t, recoil);
  else if (kind === "sniper") drawSniperTower(ctx, lv, col, time, t, recoil);
  else if (kind === "flame") drawFlameTower(ctx, lv, col, time, t, recoil);
  else if (kind === "gravity") drawGravityTower(ctx, lv, col, time, t, recoil);
  else if (kind === "corrode") drawCorrodeTower(ctx, lv, col, time, t, recoil);
  else if (kind === "paladin") drawPaladinTower(ctx, lv, col, time, t, recoil);
  else drawSupplyTower(ctx, lv, col, time, t, recoil);

  // 탑 꼭대기쯤 — 깃대 높이를 맞추는 데 쓴다
  const top = { archer: -80, sniper: -84, cannon: -62, bolt: -78, flame: -66, poison: -62,
    frost: -76, gravity: -74, supply: -70, corrode: -60, paladin: -72 }[kind] || -70;
  tierCrown(ctx, lv, col, time, top);

  ctx.restore();

  // 짓고 나서 자리를 잡는 중
  if (t.warm > 0) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(255,236,178,0.95)";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -time * 26;
    ctx.beginPath(); ctx.ellipse(s.x, s.y - 2, 22, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#8a5c34";
    ctx.lineWidth = 2;
    [-14, 14].forEach((dx) => {
      ctx.beginPath(); ctx.moveTo(s.x + dx, s.y + 2); ctx.lineTo(s.x + dx * 0.6, s.y - 30); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(s.x - 12, s.y - 14); ctx.lineTo(s.x + 12, s.y - 14); ctx.stroke();
    ctx.restore();
  }

  // 단계 표시 — 받침 아래로 내려 가린다 (4단계는 왕관)
  const pipY = s.y + (lv >= 2 ? 24 : 17);
  if (lv >= 4) {
    const y = pipY;
    ctx.beginPath();
    ctx.moveTo(s.x - 9, y + 3.4);
    ctx.lineTo(s.x - 9, y - 2);
    ctx.lineTo(s.x - 4.5, y + 1);
    ctx.lineTo(s.x, y - 4.4);
    ctx.lineTo(s.x + 4.5, y + 1);
    ctx.lineTo(s.x + 9, y - 2);
    ctx.lineTo(s.x + 9, y + 3.4);
    ctx.closePath();
    inkPath(ctx, C.gold, 1.1, "rgba(90,66,16,0.85)");
    return;
  }
  for (let i = 0; i < lv; i++) {
    const x = s.x - (lv - 1) * 4 + i * 8, y = pipY;
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 2 * Math.PI * 2) / 5;
      const r = k % 2 === 0 ? 3.2 : 1.4;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(90,66,16,0.8)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

export function towerBase(ctx, w, h) {
  ctx.beginPath();
  roundRect(ctx, -w / 2, -h, w, h + 4, 5);
  inkPath(ctx, C.stoneDark, 2);
  ctx.beginPath();
  roundRect(ctx, -w / 2, -h, w, h, 5);
  inkPath(ctx, "#a99e88", 2);
  ctx.fillStyle = C.stone;
  roundRect(ctx, -w / 2 + 2, -h + 2, w * 0.42, h - 4, 4); ctx.fill();
  ctx.strokeStyle = "rgba(92,82,64,0.45)";
  ctx.lineWidth = 1.2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 1, -h + (h / 3) * i);
    ctx.lineTo(w / 2 - 1, -h + (h / 3) * i);
    ctx.stroke();
  }
}

export function drawArcherTower(ctx, lv, col, time, t, recoil) {
  const h = 26 + lv * 5;
  towerBase(ctx, 30, h);
  // 출입구와 화살 구멍
  ctx.beginPath(); roundRect(ctx, -6, -13, 12, 13, 5);
  inkPath(ctx, "#4b3f2e", 1.4);
  ctx.beginPath(); roundRect(ctx, -2.6, -h + 7, 5.2, 9, 2.6);
  inkPath(ctx, "#4b3f2e", 1.2);
  // 나무 발코니
  ctx.beginPath(); roundRect(ctx, -24, -h - 9, 48, 10, 4);
  inkPath(ctx, C.woodDark, 1.8);
  ctx.fillStyle = C.wood;
  roundRect(ctx, -24, -h - 10, 48, 7, 4); ctx.fill();
  // 지붕을 받치는 기둥
  ctx.strokeStyle = C.woodDark; ctx.lineWidth = 4;
  [-19, 19].forEach((x) => {
    ctx.beginPath(); ctx.moveTo(x, -h - 9); ctx.lineTo(x, -h - 26); ctx.stroke();
  });
  ctx.strokeStyle = C.wood; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-19, -h - 17); ctx.lineTo(19, -h - 17); ctx.stroke();
  // 지붕
  ctx.beginPath();
  ctx.moveTo(0, -h - 52); ctx.lineTo(26, -h - 25); ctx.lineTo(-26, -h - 25); ctx.closePath();
  inkPath(ctx, col.dark, 2);
  ctx.beginPath();
  ctx.moveTo(0, -h - 52); ctx.lineTo(4, -h - 25); ctx.lineTo(-26, -h - 25); ctx.closePath();
  ctx.fillStyle = col.key; ctx.fill();
  ctx.beginPath(); roundRect(ctx, -27, -h - 27, 54, 5, 2.5);
  inkPath(ctx, col.dark, 1.5);
  // 궁수
  const aim = t.aim || 0;
  ctx.save();
  ctx.translate(0, -h - 16);
  ctx.beginPath(); roundRect(ctx, -5, -1, 10, 9, 4);
  inkPath(ctx, col.dark, 1.5);
  ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI * 2);
  inkPath(ctx, "#e8cfa8", 1.5);
  ctx.save();
  ctx.rotate(aim);
  ctx.strokeStyle = "#6f4a28";
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(9 - recoil * 3, -2, 7.5, -1.15, 1.15); ctx.stroke();
  ctx.strokeStyle = "rgba(252,248,238,0.95)";
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(6.6 - recoil * 3, -8.6); ctx.lineTo(6.6 - recoil * 3, 4.6); ctx.stroke();
  ctx.restore();
  ctx.restore();
  // 깃발
  if (lv >= 3) {
    ctx.strokeStyle = "#5b4a33"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -h - 52); ctx.lineTo(0, -h - 68); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -h - 68);
    ctx.lineTo(15, -h - 63 + Math.sin(time * 4) * 2);
    ctx.lineTo(0, -h - 58);
    ctx.closePath();
    inkPath(ctx, col.light, 1.4);
  }
}

export function drawCannonTower(ctx, lv, col, time, t, recoil) {
  const h = 24 + lv * 4;
  towerBase(ctx, 36, h);
  // 나무 포대
  ctx.beginPath(); roundRect(ctx, -24, -h - 11, 48, 12, 5);
  inkPath(ctx, C.woodDark, 1.8);
  ctx.fillStyle = C.wood;
  roundRect(ctx, -24, -h - 12, 48, 8, 5); ctx.fill();
  // 화약통
  ctx.beginPath(); roundRect(ctx, -29, -h - 3, 11, 14, 3.5);
  inkPath(ctx, "#6d4526", 1.5);
  ctx.fillStyle = "#4a3a2a";
  roundRect(ctx, -29, -h + 2, 11, 2.4, 1); ctx.fill();
  // 포탄 더미
  ctx.beginPath(); ctx.arc(23, -h + 2, 4.2, 0, Math.PI * 2);
  inkPath(ctx, "#33333a", 1.3);
  ctx.beginPath(); ctx.arc(28, -h + 4, 4.2, 0, Math.PI * 2);
  inkPath(ctx, "#33333a", 1.3);

  // 대포
  const aim = t.aim || 0;
  ctx.save();
  ctx.translate(0, -h - 18);
  ctx.rotate(aim);
  const back = recoil * 6;
  ctx.beginPath(); roundRect(ctx, -13 - back, -8, 34 + lv * 3, 16, 7);
  inkPath(ctx, "#3b3b42", 2);
  ctx.fillStyle = "#5b5b66";
  roundRect(ctx, -11 - back, -6.5, 30 + lv * 3, 6, 3); ctx.fill();
  ctx.beginPath(); ctx.arc(20 + lv * 3 - back, 0, 8.4, 0, Math.PI * 2);
  inkPath(ctx, "#2a2a30", 1.8);
  ctx.fillStyle = "#131317";
  ctx.beginPath(); ctx.arc(21 + lv * 3 - back, 0, 5.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-11 - back, 0, 8.4, 0, Math.PI * 2);
  inkPath(ctx, col.key, 1.8);
  ctx.fillStyle = col.light;
  ctx.beginPath(); ctx.arc(-12.6 - back, -2.4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 바퀴
  [-14, 14].forEach((x) => {
    ctx.beginPath(); ctx.arc(x, -h - 6, 6.4, 0, Math.PI * 2);
    inkPath(ctx, "#4a3421", 1.8);
    ctx.fillStyle = "#7a562f";
    ctx.beginPath(); ctx.arc(x, -h - 6, 2.6, 0, Math.PI * 2); ctx.fill();
  });
}

export function drawFrostTower(ctx, lv, col, time, t) {
  const h = 32 + lv * 6;
  // 얼음 기둥
  ctx.beginPath();
  ctx.moveTo(-17, 2); ctx.lineTo(-11, -h); ctx.lineTo(11, -h); ctx.lineTo(17, 2);
  ctx.closePath();
  inkPath(ctx, col.dark, 2);
  ctx.beginPath();
  ctx.moveTo(-17, 2); ctx.lineTo(-11, -h); ctx.lineTo(0, -h); ctx.lineTo(0, 2);
  ctx.closePath();
  ctx.fillStyle = col.key; ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(-13, -4); ctx.lineTo(-9.5, -h + 5); ctx.lineTo(-4, -h + 5); ctx.lineTo(-7, -4);
  ctx.closePath(); ctx.fill();
  // 띠
  ctx.beginPath(); roundRect(ctx, -15, -h * 0.55, 30, 7, 3);
  inkPath(ctx, "#dff3ff", 1.5);

  // 룬 고리
  ctx.save();
  ctx.translate(0, -h - 3);
  ctx.rotate(time * 0.8);
  ctx.strokeStyle = `rgba(200,238,255,${0.55 + 0.22 * Math.sin(time * 3)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 19, 7, 0, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    ctx.fillStyle = "rgba(236,250,255,0.9)";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 19, Math.sin(a) * 7, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 떠 있는 결정
  const bob = Math.sin(time * 2.2) * 3;
  ctx.save();
  ctx.translate(0, -h - 13 + bob);
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
  glow.addColorStop(0, "rgba(190,236,255,0.8)");
  glow.addColorStop(1, "rgba(120,190,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(time * 0.6);
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(8, 0); ctx.lineTo(0, 12); ctx.lineTo(-8, 0);
  ctx.closePath();
  inkPath(ctx, "#bfe8ff", 1.6, "rgba(70,130,180,0.7)");
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -12); ctx.lineTo(4, -2); ctx.lineTo(0, 3); ctx.lineTo(-4, -2);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // 바닥 고드름
  for (let k = -1; k <= 1; k += 2) {
    ctx.beginPath();
    ctx.moveTo(k * 15, 4); ctx.lineTo(k * 21, -8 - lv * 1.5); ctx.lineTo(k * 10, -2);
    ctx.closePath();
    inkPath(ctx, "rgba(214,243,255,0.92)", 1.4, "rgba(90,150,200,0.6)");
  }
}

export function drawSupplyTower(ctx, lv, col, time) {
  const h = 26 + lv * 4;
  // 통나무 벽
  ctx.beginPath(); roundRect(ctx, -22, -h, 44, h + 3, 4);
  inkPath(ctx, C.woodDark, 2);
  ctx.fillStyle = C.wood;
  roundRect(ctx, -22, -h, 44, h - 2, 4); ctx.fill();
  ctx.strokeStyle = "rgba(70,44,24,0.55)";
  ctx.lineWidth = 1.3;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(-21, -h + (h / 3) * i); ctx.lineTo(21, -h + (h / 3) * i); ctx.stroke();
  }
  // 지붕
  ctx.beginPath();
  ctx.moveTo(0, -h - 28); ctx.lineTo(29, -h + 2); ctx.lineTo(-29, -h + 2); ctx.closePath();
  inkPath(ctx, col.dark, 2);
  ctx.beginPath();
  ctx.moveTo(0, -h - 28); ctx.lineTo(5, -h + 2); ctx.lineTo(-29, -h + 2); ctx.closePath();
  ctx.fillStyle = col.key; ctx.fill();
  // 문
  ctx.beginPath(); roundRect(ctx, -8, -17, 16, 17, 6);
  inkPath(ctx, "#4b3a28", 1.6);
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(4.5, -8, 1.6, 0, Math.PI * 2); ctx.fill();
  // 상자와 자루
  ctx.beginPath(); roundRect(ctx, 17, -14, 14, 14, 2.5);
  inkPath(ctx, "#9a6a3c", 1.6);
  ctx.strokeStyle = "#6a4523"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(17, -7); ctx.lineTo(31, -7); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-26, -6, 7, 8, 0, 0, Math.PI * 2);
  inkPath(ctx, "#c8b189", 1.5);
  // 금화 반짝임
  const ph = (time * 0.7) % 1;
  ctx.globalAlpha = 0.9 * (1 - ph);
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(24, -20 - ph * 18, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // 깃발
  if (lv >= 3) {
    ctx.strokeStyle = "#5b4a33"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -h - 28); ctx.lineTo(0, -h - 44); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -h - 44);
    ctx.lineTo(15, -h - 39 + Math.sin(time * 4) * 2);
    ctx.lineTo(0, -h - 34);
    ctx.closePath();
    inkPath(ctx, col.light, 1.4);
  }
}

export function drawBoltTower(ctx, lv, col, time, t, recoil) {
  const h = 30 + lv * 5;
  // 돌기둥
  ctx.beginPath();
  ctx.moveTo(-15, 2); ctx.lineTo(-10, -h); ctx.lineTo(10, -h); ctx.lineTo(15, 2);
  ctx.closePath();
  inkPath(ctx, "#8b8397", 2);
  ctx.fillStyle = "#a79fb3";
  ctx.beginPath();
  ctx.moveTo(-15, 2); ctx.lineTo(-10, -h); ctx.lineTo(-1, -h); ctx.lineTo(-4, 2);
  ctx.closePath(); ctx.fill();
  // 구리 띠
  [0.3, 0.62].forEach((k) => {
    ctx.beginPath(); roundRect(ctx, -16, -h * k, 32, 6, 2.6);
    inkPath(ctx, "#c98a3c", 1.4);
  });
  // 갈래 뿔
  ctx.strokeStyle = "#d9d2e2"; ctx.lineWidth = 3; ctx.lineCap = "round";
  const prongs = lv + 1;
  for (let k = 0; k < prongs; k++) {
    const f = prongs === 1 ? 0 : (k / (prongs - 1)) * 2 - 1;   // -1 … 1
    ctx.beginPath();
    ctx.moveTo(f * 7, -h); ctx.lineTo(f * 13, -h - 14 - Math.abs(f) * 2);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // 전기 구체
  const bob = Math.sin(time * 3) * 2;
  const cy = -h - 16 + bob;
  const glow = ctx.createRadialGradient(0, cy, 1, 0, cy, 24 + recoil * 12);
  glow.addColorStop(0, `rgba(186,224,255,${0.75 + recoil * 0.25})`);
  glow.addColorStop(1, "rgba(120,150,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, cy, 24 + recoil * 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, cy, 8 + lv * 0.7, 0, Math.PI * 2);
  inkPath(ctx, "#e8f3ff", 1.6, "rgba(90,110,190,0.8)");
  // 튀는 불꽃
  ctx.strokeStyle = `rgba(160,205,255,${0.5 + 0.4 * Math.sin(time * 12)})`;
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 3; k++) {
    const a = time * 2.6 + (k / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 8, cy + Math.sin(a) * 8);
    ctx.lineTo(Math.cos(a) * 15, cy + Math.sin(a) * 15 - 3);
    ctx.lineTo(Math.cos(a) * 19, cy + Math.sin(a) * 19);
    ctx.stroke();
  }
}

export function drawPoisonTower(ctx, lv, col, time, t, recoil) {
  const h = 24 + lv * 4;
  towerBase(ctx, 30, h);
  // 지붕
  ctx.beginPath();
  ctx.moveTo(0, -h - 24); ctx.lineTo(26, -h + 1); ctx.lineTo(-26, -h + 1); ctx.closePath();
  inkPath(ctx, "#3f6b3d", 2);
  ctx.beginPath();
  ctx.moveTo(0, -h - 24); ctx.lineTo(4, -h + 1); ctx.lineTo(-26, -h + 1); ctx.closePath();
  ctx.fillStyle = "#568a4f"; ctx.fill();
  // 가마솥
  ctx.beginPath(); ctx.ellipse(0, -h - 6, 15, 12, 0, 0, Math.PI * 2);
  inkPath(ctx, "#3a3a42", 2);
  ctx.beginPath(); ctx.ellipse(0, -h - 10, 13.5, 5.5, 0, 0, Math.PI * 2);
  inkPath(ctx, "#7fc24a", 1.4, "rgba(40,70,25,0.7)");
  // 끓어오르는 거품
  for (let k = 0; k < 3; k++) {
    const ph = ((time * 0.8 + k * 0.33) % 1);
    ctx.globalAlpha = 0.75 * (1 - ph);
    ctx.fillStyle = "#b6e87a";
    ctx.beginPath();
    ctx.arc(Math.sin(k * 2.1 + time) * 7, -h - 12 - ph * 20, 2.6 + ph * 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 약병 선반
  [[-22, -8], [-22, -16], [21, -10]].forEach(([x, y], i) => {
    ctx.beginPath(); roundRect(ctx, x - 3, y - 7, 6.4, 9, 2.2);
    inkPath(ctx, i === 2 ? "#a8dc6a" : "#7fb0d8", 1.2);
  });
  // 발사 섬광
  if (recoil > 0.2) {
    ctx.globalAlpha = recoil * 0.8;
    ctx.fillStyle = "#c9f28a";
    ctx.beginPath(); ctx.arc(0, -h - 12, 14, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (lv >= 3) {
    ctx.strokeStyle = "#5b4a33"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -h - 24); ctx.lineTo(0, -h - 40); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -h - 40);
    ctx.lineTo(14, -h - 35 + Math.sin(time * 4) * 2);
    ctx.lineTo(0, -h - 30);
    ctx.closePath();
    inkPath(ctx, "#a8dc6a", 1.4);
  }
}

export function drawSniperTower(ctx, lv, col, time, t, recoil) {
  const h = 34 + lv * 6;
  towerBase(ctx, 26, h);
  // 좁은 창
  ctx.beginPath(); roundRect(ctx, -3, -h + 8, 6, 12, 3);
  inkPath(ctx, "#3d3a4b", 1.2);
  // 관측대
  ctx.beginPath(); roundRect(ctx, -20, -h - 10, 40, 11, 4);
  inkPath(ctx, col.dark, 1.8);
  ctx.fillStyle = col.key;
  roundRect(ctx, -20, -h - 11, 40, 7, 4); ctx.fill();
  // 모래주머니
  [-15, 15].forEach((x) => {
    ctx.beginPath(); ctx.ellipse(x, -h - 12, 8, 4.6, 0, 0, Math.PI * 2);
    inkPath(ctx, "#b9a887", 1.3);
  });
  // 저격수와 긴 총열
  const aim = t.aim || 0;
  ctx.save();
  ctx.translate(0, -h - 19);
  ctx.beginPath(); roundRect(ctx, -5, -1, 10, 9, 4);
  inkPath(ctx, col.dark, 1.5);
  ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI * 2);
  inkPath(ctx, "#e8cfa8", 1.5);
  ctx.save();
  ctx.rotate(aim);
  const back = recoil * 7;
  ctx.beginPath(); roundRect(ctx, -6 - back, -2.6, 34 + lv * 2, 5.2, 2.6);
  inkPath(ctx, "#2f2f38", 1.5);
  ctx.fillStyle = "#565663";
  roundRect(ctx, -4 - back, -1.6, 26 + lv * 2, 1.8, 1); ctx.fill();
  // 조준경
  ctx.beginPath(); roundRect(ctx, 2 - back, -7.4, 12, 4.4, 2);
  inkPath(ctx, "#3d3a4b", 1.2);
  if (recoil > 0.3) {
    ctx.globalAlpha = recoil;
    const gl = ctx.createRadialGradient(30, 0, 0, 30, 0, 18);
    gl.addColorStop(0, "rgba(255,246,210,0.95)");
    gl.addColorStop(1, "rgba(200,180,255,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(30, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.restore();
}

export function drawFlameTower(ctx, lv, col, time, t, recoil) {
  const h = 24 + lv * 4;
  towerBase(ctx, 30, h);
  // 화덕
  ctx.beginPath(); ctx.ellipse(0, -h - 4, 16, 9, 0, 0, Math.PI * 2);
  inkPath(ctx, "#4a3a34", 1.8);
  ctx.beginPath(); ctx.ellipse(0, -h - 7, 13, 6.5, 0, 0, Math.PI * 2);
  inkPath(ctx, "#8a4a2a", 1.4);
  // 불길
  const wob = Math.sin(time * 7) * 2;
  const tongues = 2 + lv;
  for (let k = 0; k < tongues; k++) {
    const ph = ((time * 1.2 + k * (1 / tongues)) % 1);
    const x = (k - (tongues - 1) / 2) * 6.5 + Math.sin(time * 5 + k) * 2;
    const y = -h - 12 - ph * 20;
    const r = 7 + k * 1.5 - ph * 3;
    const gl = ctx.createRadialGradient(x, y, 0, x, y, Math.max(2, r));
    gl.addColorStop(0, `rgba(255,240,180,${0.95 - ph * 0.6})`);
    gl.addColorStop(0.55, `rgba(245,140,45,${0.8 - ph * 0.6})`);
    gl.addColorStop(1, "rgba(190,50,20,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(x, y, Math.max(2, r), 0, Math.PI * 2); ctx.fill();
  }
  // 심지 셋
  Array.from({ length: tongues }, (_, i) => (i - (tongues - 1) / 2) * 8).forEach((x, i) => {
    ctx.beginPath();
    ctx.moveTo(x, -h - 7);
    ctx.quadraticCurveTo(x + wob * (i - 1), -h - 16, x, -h - 22 - lv);
    ctx.strokeStyle = "rgba(255,170,70,0.9)";
    ctx.lineWidth = 3.4; ctx.lineCap = "round";
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  // 기름통
  ctx.beginPath(); roundRect(ctx, 18, -h - 2, 11, 14, 3.5);
  inkPath(ctx, "#7a3b28", 1.5);
  ctx.fillStyle = "#c0392b";
  roundRect(ctx, 18, -h + 3, 11, 2.4, 1); ctx.fill();
}

export function drawGravityTower(ctx, lv, col, time, t) {
  const h = 30 + lv * 5;
  // 떠 있는 기둥
  ctx.beginPath();
  ctx.moveTo(-14, 2); ctx.lineTo(-9, -h * 0.55); ctx.lineTo(9, -h * 0.55); ctx.lineTo(14, 2);
  ctx.closePath();
  inkPath(ctx, col.dark, 2);
  ctx.fillStyle = col.key;
  ctx.beginPath();
  ctx.moveTo(-14, 2); ctx.lineTo(-9, -h * 0.55); ctx.lineTo(0, -h * 0.55); ctx.lineTo(-3, 2);
  ctx.closePath(); ctx.fill();

  // 떠 있는 돌 — 단계마다 하나씩 늘어난다
  const rocks = 2 + lv;
  for (let k = 0; k < rocks; k++) {
    const a = time * 1.4 + (k / rocks) * Math.PI * 2;
    const x = Math.cos(a) * 20, y = -h * 0.75 + Math.sin(a) * 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 1.5);
    ctx.beginPath(); roundRect(ctx, -4, -3, 8, 6, 2);
    inkPath(ctx, "#8a7f96", 1.2);
    ctx.restore();
  }

  // 소용돌이
  const cy = -h - 6;
  const gl = ctx.createRadialGradient(0, cy, 1, 0, cy, 26);
  gl.addColorStop(0, "rgba(30,10,40,0.95)");
  gl.addColorStop(0.5, `rgba(${193},${86},${159},0.55)`);
  gl.addColorStop(1, "rgba(193,86,159,0)");
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(0, cy, 26, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(0, cy);
  ctx.strokeStyle = "rgba(240,180,225,0.85)";
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = time * 3 + (k / 3) * Math.PI * 2 + i * 0.32;
      const r = 4 + i * 1.1;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.45;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, cy, 5 + lv * 0.6, 0, Math.PI * 2);
  inkPath(ctx, "#2a1030", 1.4, "rgba(240,180,225,0.9)");
}

export function drawCorrodeTower(ctx, lv, col, time, t, recoil) {
  const h = 26 + lv * 4;
  towerBase(ctx, 28, h);
  // 증류기
  ctx.beginPath(); ctx.ellipse(0, -h - 8, 13, 11, 0, 0, Math.PI * 2);
  inkPath(ctx, "#2f4f48", 1.8);
  ctx.beginPath(); ctx.ellipse(0, -h - 10, 10.5, 5, 0, 0, Math.PI * 2);
  inkPath(ctx, col.key, 1.3, "rgba(20,60,50,0.7)");
  // 관
  ctx.strokeStyle = "#7d8f8a"; ctx.lineWidth = 3.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(10, -h - 12);
  ctx.quadraticCurveTo(24, -h - 14, 22, -h - 2);
  ctx.stroke();
  ctx.lineCap = "butt";
  // 떨어지는 방울
  const ph = (time * 1.3) % 1;
  ctx.fillStyle = col.light;
  ctx.beginPath(); ctx.ellipse(22, -h - 2 + ph * 14, 2.6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1 - ph;
  ctx.beginPath(); ctx.ellipse(22, -h + 12, 6 * ph, 2.4 * ph, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // 거품
  for (let k = 0; k < 3; k++) {
    const p = ((time * 0.9 + k * 0.33) % 1);
    ctx.globalAlpha = 0.7 * (1 - p);
    ctx.fillStyle = col.light;
    ctx.beginPath(); ctx.arc(Math.sin(k * 2 + time) * 6, -h - 12 - p * 14, 2 + p * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (recoil > 0.2) {
    ctx.globalAlpha = recoil * 0.8;
    ctx.fillStyle = col.light;
    ctx.beginPath(); ctx.arc(0, -h - 10, 15, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawPaladinTower(ctx, lv, col, time) {
  const h = 30 + lv * 5;
  towerBase(ctx, 28, h);
  // 지붕
  ctx.beginPath();
  ctx.moveTo(0, -h - 26); ctx.lineTo(24, -h + 1); ctx.lineTo(-24, -h + 1); ctx.closePath();
  inkPath(ctx, col.dark, 2);
  ctx.beginPath();
  ctx.moveTo(0, -h - 26); ctx.lineTo(4, -h + 1); ctx.lineTo(-24, -h + 1); ctx.closePath();
  ctx.fillStyle = col.key; ctx.fill();
  // 성스러운 창
  ctx.beginPath(); roundRect(ctx, -5, -h * 0.72, 10, 14, 5);
  inkPath(ctx, "#f2efdf", 1.3, "rgba(70,90,110,0.7)");
  // 방패 문장
  const bob = Math.sin(time * 2) * 2;
  ctx.save();
  ctx.translate(0, -h - 12 + bob);
  const gl = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
  gl.addColorStop(0, "rgba(232,244,255,0.85)");
  gl.addColorStop(1, "rgba(150,190,230,0)");
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(9, -6.5);
  ctx.lineTo(9, 2);
  ctx.quadraticCurveTo(9, 8, 0, 11);
  ctx.quadraticCurveTo(-9, 8, -9, 2);
  ctx.lineTo(-9, -6.5);
  ctx.closePath();
  inkPath(ctx, "#eef4fb", 1.6, "rgba(70,100,130,0.8)");
  ctx.strokeStyle = col.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.moveTo(-4.5, -1); ctx.lineTo(4.5, -1); ctx.stroke();
  ctx.restore();
  // 바닥에 도는 빛 고리
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.2 * Math.sin(time * 2.2);
  ctx.strokeStyle = "rgba(210,232,250,0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -time * 20;
  ctx.beginPath(); ctx.ellipse(0, 3, 26, 14, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);
}

/* ── 적 ─────────────────────────────────────────────────── */
export function drawEnemy(ctx, e, time) {
  const cfg = ENEMY[e.type];
  const s = cfg.r / (e.type === "titan" ? 11.5 : 5.4);
  const grow = Math.min(1, e.age / 0.4);
  const walk = e.freeze > 0 ? 0 : Math.sin(e.age * (e.type === "rusher" ? 16 : 9));
  const bob = e.freeze > 0 ? 0 : Math.abs(walk) * 1.6 * s;

  const im = enemySprite(e.type);
  const art = ENEMY_ART[e.type];
  const spw = im ? art.h * (im.naturalWidth / im.naturalHeight) : 0;   // 지역 좌표 폭
  shadow(ctx, e.x, e.y + 9 * s, (im ? spw * 0.34 : 11) * s, 4.4 * s, 0.26 * grow);

  ctx.save();
  ctx.globalAlpha = grow;
  ctx.translate(e.x, e.y - bob);
  ctx.scale(s * (0.55 + grow * 0.45) * (e.ax < 0 ? -1 : 1), s * (0.55 + grow * 0.45));

  if (im) ctx.drawImage(im, -spw / 2, FOOT - art.h, spw, art.h);
  else if (e.type === "grunt") drawOrc(ctx, walk, time);
  else if (e.type === "rusher") drawGoblin(ctx, walk, time);
  else if (e.type === "armor") drawTroll(ctx, walk, time);
  else if (e.type === "titan") drawTitan(ctx, walk, time);
  else drawOgre(ctx, walk, time);

  // 피격 섬광 — 네모로 덮지 않고 부드럽게 번지게 한다
  if (e.flash > 0) {
    const a = Math.min(0.7, e.flash * 5);
    const gl = ctx.createRadialGradient(0, -8, 0, 0, -8, 24);
    gl.addColorStop(0, `rgba(255,255,255,${a})`);
    gl.addColorStop(0.6, `rgba(255,245,225,${a * 0.5})`);
    gl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(0, -8, 24, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // 얼음
  if (e.freeze > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#a8ddf5";
    ctx.beginPath();
    ctx.moveTo(e.x - 11 * s, e.y + 9 * s);
    ctx.lineTo(e.x - 7 * s, e.y - 16 * s);
    ctx.lineTo(e.x, e.y - 22 * s);
    ctx.lineTo(e.x + 8 * s, e.y - 15 * s);
    ctx.lineTo(e.x + 11 * s, e.y + 9 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  } else if (e.burn > 0) {
    for (let k = 0; k < 4; k++) {
      const ph = ((time * 1.6 + k * 0.27) % 1);
      ctx.globalAlpha = 0.75 * (1 - ph);
      const gl = ctx.createRadialGradient(e.x + Math.sin(k * 2 + time * 5) * 5 * s, e.y - 6 * s - ph * 22, 0,
        e.x + Math.sin(k * 2 + time * 5) * 5 * s, e.y - 6 * s - ph * 22, 4 + ph * 6);
      gl.addColorStop(0, "rgba(255,236,160,0.95)");
      gl.addColorStop(0.6, "rgba(245,140,40,0.7)");
      gl.addColorStop(1, "rgba(190,50,20,0)");
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(e.x + Math.sin(k * 2 + time * 5) * 5 * s, e.y - 6 * s - ph * 22, 4 + ph * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (e.shred > 0) {
    ctx.strokeStyle = "rgba(95,211,182,0.85)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -time * 16;
    ctx.beginPath(); ctx.ellipse(e.x, e.y - 2 * s, 12 * s, 14 * s, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  } else if (e.poison > 0) {
    ctx.fillStyle = "rgba(150,220,90,0.45)";
    for (let k = 0; k < 4; k++) {
      const a = time * 2.2 + k * 1.6;
      const ph = ((time * 0.9 + k * 0.25) % 1);
      ctx.globalAlpha = 0.5 * (1 - ph);
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * 9 * s, e.y - 6 * s - ph * 16, 2.4 + ph * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (e.slow > 0) {
    ctx.fillStyle = "rgba(150,215,245,0.5)";
    for (let k = 0; k < 3; k++) {
      const a = time * 3 + k * 2.1;
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * 11 * s, e.y + Math.sin(a) * 5 * s - 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 체력 막대
  const hr = Math.max(0, e.hp / e.max);
  e.shown = e.shown === undefined ? hr : e.shown + (hr - e.shown) * 0.2;
  if (e.shown < 0.999) {
    const huge = e.type === "boss" || e.type === "titan";
    const bw = e.type === "titan" ? 96 : e.type === "boss" ? 42 : 24 * s * 1.1;
    const by = e.y - (e.type === "titan" ? 64 : huge ? 34 : 20) * s - 6;
    ctx.fillStyle = "rgba(20,16,12,0.75)";
    roundRect(ctx, e.x - bw / 2 - 1.5, by - 1.5, bw + 3, 6.5, 3); ctx.fill();
    ctx.fillStyle = e.shown > 0.5 ? C.hpGood : e.shown > 0.25 ? "#e5a93e" : C.hpLow;
    roundRect(ctx, e.x - bw / 2, by, Math.max(1.5, bw * e.shown), 3.5, 2); ctx.fill();
  }
}

export function limbs(ctx, walk, col, w, len) {
  ctx.fillStyle = col;
  [-1, 1].forEach((k) => {
    const sw = walk * k * 2.6;
    ctx.save();
    ctx.translate(k * 4, 3);
    ctx.rotate(sw * 0.16);
    roundRect(ctx, -w / 2, 0, w, len, w / 2);
    ctx.fill();
    ctx.restore();
  });
}

export function drawOrc(ctx, walk) {
  limbs(ctx, walk, "#3f5f24", 5, 9);
  // 몸통
  ctx.fillStyle = "#6f9a3f";
  roundRect(ctx, -8, -10, 16, 15, 6); ctx.fill();
  ctx.fillStyle = "#83b04d";
  roundRect(ctx, -8, -10, 9, 15, 6); ctx.fill();
  // 허리띠
  ctx.fillStyle = "#6b4526";
  roundRect(ctx, -8.5, -2, 17, 3.6, 1.6); ctx.fill();
  ctx.fillStyle = C.gold;
  roundRect(ctx, -2, -2.2, 4, 4, 1.4); ctx.fill();
  // 팔 + 몽둥이
  ctx.save();
  ctx.rotate(-0.3 + walk * 0.22);
  ctx.fillStyle = "#6f9a3f";
  roundRect(ctx, 4, -8, 10, 4.6, 2.3); ctx.fill();
  ctx.fillStyle = "#7d5330";
  roundRect(ctx, 12, -11, 4, 12, 2); ctx.fill();
  ctx.fillStyle = "#95653c";
  ctx.beginPath(); ctx.arc(14, -12, 4.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 머리
  ctx.fillStyle = "#7ea94a";
  ctx.beginPath(); ctx.arc(0, -16, 7.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#6f9a3f";
  ctx.beginPath(); ctx.arc(2.6, -14.5, 6.2, 0, Math.PI * 2); ctx.fill();
  // 귀
  ctx.fillStyle = "#6f9a3f";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 6.4, -18); ctx.lineTo(k * 11, -21); ctx.lineTo(k * 6.6, -14.5);
    ctx.closePath(); ctx.fill();
  });
  // 눈 + 엄니
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(3.4, -17.4, 2.4, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1d1508";
  ctx.beginPath(); ctx.arc(4.2, -17.3, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3e5a1e"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(1.2, -20.4); ctx.lineTo(5.8, -19.4); ctx.stroke();
  ctx.fillStyle = "#f4f1e2";
  ctx.beginPath(); ctx.moveTo(1.6, -12.6); ctx.lineTo(2.9, -15.2); ctx.lineTo(4.2, -12.6); ctx.closePath(); ctx.fill();
}

export function drawGoblin(ctx, walk) {
  limbs(ctx, walk, "#7c4520", 4, 8);
  ctx.fillStyle = "#c07a3c";
  roundRect(ctx, -6.5, -9, 13, 13, 5); ctx.fill();
  ctx.fillStyle = "#d89152";
  roundRect(ctx, -6.5, -9, 7, 13, 5); ctx.fill();
  ctx.fillStyle = "#5e3a1c";
  roundRect(ctx, -7, -2.5, 14, 3, 1.5); ctx.fill();
  // 단검
  ctx.save();
  ctx.rotate(-0.55 + walk * 0.3);
  ctx.fillStyle = "#c07a3c";
  roundRect(ctx, 3, -8, 9, 4, 2); ctx.fill();
  ctx.fillStyle = "#cfd4da";
  ctx.beginPath(); ctx.moveTo(11, -8.5); ctx.lineTo(19, -10.5); ctx.lineTo(11, -4.8); ctx.closePath(); ctx.fill();
  ctx.restore();
  // 머리 + 큰 귀
  ctx.fillStyle = "#d89152";
  ctx.beginPath(); ctx.arc(1, -14, 6.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c07a3c";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 5, -16); ctx.lineTo(k * 14, -22); ctx.lineTo(k * 5.4, -11.5);
    ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(4, -15.2, 2.2, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1d1508";
  ctx.beginPath(); ctx.arc(4.7, -15.1, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7c4520"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(1.5, -11.4); ctx.lineTo(6, -11.9); ctx.stroke();
}

export function drawTroll(ctx, walk) {
  limbs(ctx, walk, "#4a5666", 6.5, 10);
  // 몸통 + 갑옷
  ctx.fillStyle = "#7d8ba0";
  roundRect(ctx, -11, -13, 22, 19, 7); ctx.fill();
  ctx.fillStyle = "#93a2b5";
  roundRect(ctx, -11, -13, 12, 19, 7); ctx.fill();
  ctx.fillStyle = "#5d6878";
  roundRect(ctx, -11.5, -6, 23, 5, 2); ctx.fill();
  // 어깨 갑옷
  ctx.fillStyle = "#b9c3cf";
  ctx.beginPath(); ctx.ellipse(-9, -13, 6.5, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, -13, 6.5, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  // 방패
  ctx.save();
  ctx.rotate(walk * 0.08);
  ctx.fillStyle = "#6a4a2c";
  roundRect(ctx, -19, -12, 11, 19, 5); ctx.fill();
  ctx.fillStyle = "#8a6238";
  roundRect(ctx, -18, -11, 9, 17, 4); ctx.fill();
  ctx.fillStyle = "#b9c3cf";
  ctx.beginPath(); ctx.arc(-13.5, -2.5, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 머리 + 투구
  ctx.fillStyle = "#93a2b5";
  ctx.beginPath(); ctx.arc(1, -20, 7.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#adb9c8";
  ctx.beginPath(); ctx.arc(1, -21.5, 7.6, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5d6878";
  roundRect(ctx, -6.6, -21.5, 15, 4, 1.6); ctx.fill();
  ctx.fillStyle = "#ffcf4d";
  ctx.beginPath(); ctx.ellipse(4.4, -19.4, 1.9, 1.5, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawOgre(ctx, walk, time) {
  limbs(ctx, walk, "#4a3b58", 8, 12);
  // 망토
  ctx.fillStyle = "#4b2340";
  ctx.beginPath();
  ctx.moveTo(-12, -18);
  ctx.quadraticCurveTo(-20 - Math.sin(time * 3) * 2, 2, -10, 10);
  ctx.lineTo(10, 10);
  ctx.quadraticCurveTo(20 + Math.sin(time * 3) * 2, 2, 12, -18);
  ctx.closePath(); ctx.fill();
  // 몸통
  ctx.fillStyle = "#7b6389";
  roundRect(ctx, -13, -18, 26, 25, 9); ctx.fill();
  ctx.fillStyle = "#907aa0";
  roundRect(ctx, -13, -18, 14, 25, 9); ctx.fill();
  ctx.fillStyle = "#3f3049";
  roundRect(ctx, -13.5, -8, 27, 6, 2.5); ctx.fill();
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(0, -5, 3.4, 0, Math.PI * 2); ctx.fill();
  // 도끼
  ctx.save();
  ctx.rotate(-0.25 + walk * 0.16);
  ctx.fillStyle = "#6b4526";
  roundRect(ctx, 8, -26, 4.4, 34, 2); ctx.fill();
  ctx.fillStyle = "#c9ced8";
  ctx.beginPath();
  ctx.moveTo(10, -26); ctx.lineTo(26, -30); ctx.lineTo(26, -14); ctx.lineTo(10, -18);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#8d949f";
  ctx.beginPath();
  ctx.moveTo(10, -22); ctx.lineTo(26, -22); ctx.lineTo(26, -14); ctx.lineTo(10, -18);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // 머리
  ctx.fillStyle = "#8a729a";
  ctx.beginPath(); ctx.arc(0, -26, 9.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3f3049";
  ctx.beginPath(); ctx.arc(0, -28, 9.6, Math.PI, Math.PI * 2); ctx.fill();
  // 뿔
  ctx.fillStyle = "#e8e1cc";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 6, -33); ctx.lineTo(k * 13, -42); ctx.lineTo(k * 10.5, -31);
    ctx.closePath(); ctx.fill();
  });
  // 눈
  ctx.fillStyle = "#ff6a4a";
  [-1, 1].forEach((k) => {
    ctx.beginPath(); ctx.ellipse(k * 3.6 + 1, -25, 2.2, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#f4f1e2";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 3 + 1, -20); ctx.lineTo(k * 4.6 + 1, -16); ctx.lineTo(k * 5.8 + 1, -20);
    ctx.closePath(); ctx.fill();
  });
}

export function drawTitan(ctx, walk, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
  // 발밑 기운
  const aura = ctx.createRadialGradient(0, 8, 2, 0, 8, 46);
  aura.addColorStop(0, `rgba(190,40,40,${0.28 + pulse * 0.12})`);
  aura.addColorStop(1, "rgba(120,20,20,0)");
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.ellipse(0, 8, 46, 20, 0, 0, Math.PI * 2); ctx.fill();

  limbs(ctx, walk, "#2f2a33", 11, 16);
  // 망토
  ctx.fillStyle = "#4a1420";
  ctx.beginPath();
  ctx.moveTo(-17, -26);
  ctx.quadraticCurveTo(-30 - Math.sin(time * 2.4) * 3, 4, -15, 16);
  ctx.lineTo(15, 16);
  ctx.quadraticCurveTo(30 + Math.sin(time * 2.4) * 3, 4, 17, -26);
  ctx.closePath(); ctx.fill();
  // 몸통
  ctx.fillStyle = "#57505e";
  roundRect(ctx, -19, -28, 38, 38, 12); ctx.fill();
  ctx.fillStyle = "#6d6577";
  roundRect(ctx, -19, -28, 19, 38, 12); ctx.fill();
  // 가슴 갑옷
  ctx.fillStyle = "#2f2a33";
  roundRect(ctx, -20, -14, 40, 9, 3.5); ctx.fill();
  ctx.fillStyle = "#c0392b";
  ctx.beginPath(); ctx.arc(0, -19, 5.4 + pulse * 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,170,120,${0.5 + pulse * 0.4})`;
  ctx.beginPath(); ctx.arc(0, -19, 2.6, 0, Math.PI * 2); ctx.fill();
  // 어깨 가시
  [-1, 1].forEach((k) => {
    ctx.fillStyle = "#39333f";
    ctx.beginPath(); ctx.ellipse(k * 20, -25, 9, 7.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e6dcc6";
    [0, 1].forEach((i) => {
      ctx.beginPath();
      ctx.moveTo(k * (17 + i * 6), -29);
      ctx.lineTo(k * (21 + i * 7), -41 + i * 4);
      ctx.lineTo(k * (23 + i * 5), -28);
      ctx.closePath(); ctx.fill();
    });
  });
  // 전투 망치
  ctx.save();
  ctx.rotate(-0.2 + walk * 0.12);
  ctx.fillStyle = "#5a3d24";
  roundRect(ctx, 14, -40, 6, 52, 3); ctx.fill();
  ctx.fillStyle = "#4a4550";
  roundRect(ctx, 6, -52, 24, 18, 4); ctx.fill();
  ctx.fillStyle = "#6a6472";
  roundRect(ctx, 6, -52, 24, 8, 4); ctx.fill();
  ctx.fillStyle = "#c0392b";
  roundRect(ctx, 14, -47, 8, 8, 2); ctx.fill();
  ctx.restore();
  // 머리
  ctx.fillStyle = "#635b6c";
  ctx.beginPath(); ctx.arc(0, -38, 12.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#39333f";
  ctx.beginPath(); ctx.arc(0, -40, 12.5, Math.PI, Math.PI * 2); ctx.fill();
  // 왕관 뿔
  ctx.fillStyle = "#efe6cd";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 8, -47);
    ctx.quadraticCurveTo(k * 22, -58, k * 15, -66);
    ctx.quadraticCurveTo(k * 20, -55, k * 12.5, -44);
    ctx.closePath(); ctx.fill();
  });
  // 눈
  ctx.fillStyle = `rgba(255,${90 + pulse * 60},60,1)`;
  [-1, 1].forEach((k) => {
    ctx.beginPath(); ctx.ellipse(k * 4.6 + 0.5, -37, 3, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#f4f1e2";
  [-1, 1].forEach((k) => {
    ctx.beginPath();
    ctx.moveTo(k * 4 + 0.5, -30); ctx.lineTo(k * 6 + 0.5, -24); ctx.lineTo(k * 7.6 + 0.5, -30);
    ctx.closePath(); ctx.fill();
  });
}

/* ── 탄과 효과 ──────────────────────────────────────────── */
export function drawBullet(ctx, b) {
  const ang = Math.atan2(b.vy || 0, b.vx || 1);
  if (b.kind === "arrow") {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.strokeStyle = "#7d5330";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = "#d7dce2";
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8e2d2";
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-5, -3); ctx.lineTo(-5, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (b.kind === "ball" || b.kind === "shell") {
    const big = b.kind === "shell";
    const r = big ? 7 : 5.2;
    const lift = Math.sin(Math.min(1, b.travel) * Math.PI) * (big ? 34 : 22);
    ctx.fillStyle = "rgba(30,26,20,0.2)";
    ctx.beginPath(); ctx.ellipse(b.x, b.y, r * 0.8, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    if (big) {
      ctx.fillStyle = "rgba(226,214,196,0.32)";
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(b.x - (b.vx || 0) * 0.02 * i, b.y - lift - (b.vy || 0) * 0.02 * i + i * 2, r - i * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#2c2c33";
    ctx.beginPath(); ctx.arc(b.x, b.y - lift, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#54545e";
    ctx.beginPath(); ctx.arc(b.x - r * 0.3, b.y - lift - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
  } else if (b.kind === "bolt") {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 13);
    gl.addColorStop(0, "rgba(220,240,255,0.95)");
    gl.addColorStop(1, "rgba(120,160,255,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(235,246,255,0.95)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-14, 2); ctx.lineTo(-5, -3); ctx.lineTo(-1, 2); ctx.lineTo(8, -2);
    ctx.stroke();
    ctx.restore();
  } else if (b.kind === "slug") {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(220,226,255,0.65)";
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(4, 0); ctx.stroke();
    ctx.fillStyle = "#eef0ff";
    ctx.beginPath(); ctx.ellipse(5, 0, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (b.kind === "acid") {
    const gl = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 10);
    gl.addColorStop(0, "rgba(150,240,215,0.9)");
    gl.addColorStop(1, "rgba(60,175,150,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5fd3b6";
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 4.4, 5.4, 0, 0, Math.PI * 2); ctx.fill();
  } else if (b.kind === "orb") {
    const wob = Math.sin(b.x * 0.2 + b.y * 0.2) * 1.2;
    const gl = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 11);
    gl.addColorStop(0, "rgba(190,240,120,0.9)");
    gl.addColorStop(1, "rgba(110,180,60,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(b.x, b.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8fd44f";
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 5 + wob, 5.6 - wob, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(240,255,210,0.85)";
    ctx.beginPath(); ctx.arc(b.x - 1.4, b.y - 1.6, 1.8, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.x * 0.2 + b.y * 0.2);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
    glow.addColorStop(0, "rgba(200,240,255,0.9)");
    glow.addColorStop(1, "rgba(140,205,245,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e6f7ff";
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

export function drawFx(ctx, f) {
  const k = f.kind;
  if (k === "boom") {
    const p = 1 - f.t / f.life;
    const r = f.r * (0.3 + p * 1.1);
    ctx.globalAlpha = 1 - p;
    const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
    grd.addColorStop(0, "rgba(255,240,180,0.95)");
    grd.addColorStop(0.5, "rgba(245,150,52,0.75)");
    grd.addColorStop(1, "rgba(120,60,24,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (k === "poof") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = (1 - p) * 0.75;
    ctx.fillStyle = f.color || "rgba(212,206,190,1)";
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + f.x;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * p * 13, f.y + Math.sin(a) * p * 9 - p * 6, 5 + p * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === "ice") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = "#d8f2ff";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const d = p * 16;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.7, 2.4 * (1 - p), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === "coin") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = Math.min(1, (1 - p) * 2.2);
    const y = f.y - p * 26;
    ctx.fillStyle = "#c79320";
    ctx.beginPath(); ctx.ellipse(f.x, y, 5, 5.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.ellipse(f.x, y - 0.8, 4.2, 4.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.ellipse(f.x - 1.2, y - 2, 1.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (k === "zap") {
    const p = 1 - f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const dx = f.x2 - f.x, dy = f.y2 - f.y;
    const seg = 5;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? "rgba(240,250,255,0.95)" : "rgba(140,190,255,0.7)";
      ctx.lineWidth = pass ? 2 : 6;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      for (let i = 1; i < seg; i++) {
        const u = i / seg;
        const jitter = (Math.sin(i * 12.9898 + f.x) * 43758.5453 % 1) * 14 - 7;
        ctx.lineTo(f.x + dx * u - dy * 0.001 + jitter * (-dy / (Math.hypot(dx, dy) || 1)),
                   f.y + dy * u + jitter * (dx / (Math.hypot(dx, dy) || 1)));
      }
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (k === "ring") {
    const p = 1 - f.t / f.life;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.85;
    ctx.strokeStyle = f.color || "#ffe08a";
    ctx.lineWidth = 5 * (1 - p) + 1;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, f.r * p, f.r * p * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (k === "fume") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = (1 - p) * 0.7;
    ctx.fillStyle = "#9ad95a";
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + f.x;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * p * 14, f.y + Math.sin(a) * p * 9 - p * 10, 4 + p * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === "flame") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = (1 - p) * 0.9;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + f.x;
      const rr = 5 + p * 7;
      const y = f.y - p * 20 + Math.sin(a) * 4;
      const gl = ctx.createRadialGradient(f.x + Math.cos(a) * p * 9, y, 0, f.x + Math.cos(a) * p * 9, y, rr);
      gl.addColorStop(0, "rgba(255,238,170,0.95)");
      gl.addColorStop(0.5, "rgba(250,150,50,0.8)");
      gl.addColorStop(1, "rgba(200,60,20,0)");
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * p * 9, y, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === "firering") {
    const p = 1 - f.t / f.life;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.55;
    const gl = ctx.createRadialGradient(f.x, f.y, f.r * 0.25, f.x, f.y, f.r);
    gl.addColorStop(0, "rgba(255,210,120,0)");
    gl.addColorStop(0.7, "rgba(250,140,50,0.55)");
    gl.addColorStop(1, "rgba(200,60,20,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,190,110,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.6 + p * 0.4), f.r * 0.62 * (0.6 + p * 0.4), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (k === "vortex") {
    const p = 1 - f.t / f.life;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.9;
    ctx.translate(f.x, f.y);
    ctx.strokeStyle = "rgba(240,170,220,0.9)";
    ctx.lineWidth = 2.2;
    for (let k2 = 0; k2 < 4; k2++) {
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const a = p * 7 + (k2 / 4) * Math.PI * 2 + i * 0.3;
        const r = f.r * (1 - p) * (1 - i / 22);
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.55;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    const gl = ctx.createRadialGradient(0, 0, 1, 0, 0, f.r * 0.5);
    gl.addColorStop(0, "rgba(50,14,60,0.6)");
    gl.addColorStop(1, "rgba(193,86,159,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(0, 0, f.r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (k === "acid") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = (1 - p) * 0.85;
    ctx.fillStyle = "#5fd3b6";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + f.x;
      ctx.beginPath();
      ctx.ellipse(f.x + Math.cos(a) * p * 15, f.y + Math.sin(a) * p * 9 + p * 6,
        2.6 * (1 - p) + 1, 3.6 * (1 - p) + 1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === "shot") {
    // 병과가 쏜 것이 날아간다
    const q = 1 - f.t / f.life;
    const x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q;
    const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const col = f.color || "#f0e4c6";
    if (f.style === "arrow") {
      ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(7, 0); ctx.stroke();
      ctx.fillStyle = "#fff6dd";
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(4, -3.4); ctx.lineTo(4, 3.4); ctx.closePath(); ctx.fill();
    } else if (f.style === "slug") {
      ctx.globalAlpha = 0.5; ctx.strokeStyle = col; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = "#fff6dd";
      ctx.beginPath(); ctx.ellipse(8, 0, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (f.style === "shell") {
      const lift = Math.sin(q * Math.PI) * 42;               // 포물선으로 날아간다
      ctx.translate(0, -lift);
      ctx.fillStyle = "#4a3a28";
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(-1.5, -1.5, 4, 0, Math.PI * 2); ctx.fill();
    } else if (f.style === "acid") {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(-9, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(9, 0); ctx.lineTo(0, -5); ctx.lineTo(-7, 0); ctx.lineTo(0, 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  } else if (k === "slash") {
    const p = 1 - f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.translate(f.x, f.y);
    ctx.rotate(-0.5);
    ctx.strokeStyle = "rgba(255,120,110,0.95)";
    ctx.lineWidth = 4 * (1 - p) + 1.5;
    ctx.lineCap = "round";
    const r = 16 + p * 14;
    [-1, 1].forEach((k2) => {
      ctx.beginPath();
      ctx.moveTo(-r * k2, -r); ctx.lineTo(r * k2, r);
      ctx.stroke();
    });
    ctx.restore();
  } else if (k === "mark") {
    const p = 1 - f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = f.color || "#ffe9bd";
    ctx.lineWidth = 2;
    const r = 20 - p * 7;
    ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(f.x + dx * (r - 5), f.y + dy * (r - 5));
      ctx.lineTo(f.x + dx * (r + 5), f.y + dy * (r + 5));
    }
    ctx.stroke();
    ctx.restore();
  } else if (k === "pierce") {
    const p = 1 - f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = f.color || "#fff";
    ctx.lineWidth = 5 * (1 - p) + 1;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    ctx.restore();
  } else if (k === "heal") {
    const p = 1 - f.t / f.life;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - p) * 1.6);
    const y = f.y - p * 34;
    ctx.fillStyle = "#8fe08a";
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + p * 2;
      const x = f.x + Math.cos(a) * 22, yy = y + Math.sin(a) * 8;
      ctx.fillRect(x - 5, yy - 1.6, 10, 3.2);
      ctx.fillRect(x - 1.6, yy - 5, 3.2, 10);
    }
    if (f.text) {
      ctx.font = "800 15px Jua, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = "rgba(26,20,12,0.92)";
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = "#b6f0a8";
      ctx.fillText(f.text, f.x, y);
    }
    ctx.restore();
  } else if (k === "call") {
    const p = 1 - f.t / f.life;
    const pop = p < 0.2 ? 0.6 + p * 2 : 1 + (p - 0.2) * 0.12;
    ctx.save();
    ctx.globalAlpha = 1 - Math.pow(p, 3);
    ctx.translate(f.x, f.y - p * 16);
    ctx.scale(pop, pop);
    ctx.font = "800 24px Jua, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(24,18,10,0.92)";
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.color || "#ffe9bd";
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  } else if (k === "dmg") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = 1 - Math.pow(p, 2.5);
    const pop = p < 0.18 ? 1 + (0.18 - p) * 2.2 : 1;
    ctx.save();
    ctx.translate(f.x, f.y - p * 26);
    ctx.scale(pop, pop);
    ctx.font = "800 15px Jua, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = "rgba(26,20,12,0.92)";
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.color || "#ffe9bd";
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  } else if (k === "text") {
    const p = 1 - f.t / f.life;
    ctx.globalAlpha = Math.min(1, f.t * 2.4) * (1 - Math.pow(p, 3));
    ctx.font = "700 14px Jua, system-ui, sans-serif";
    ctx.textAlign = "center";
    const y = f.y - 30 - (1 - Math.pow(1 - p, 2)) * 18;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "rgba(28,22,14,0.9)";
    ctx.strokeText(f.text, f.x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, y);
    ctx.globalAlpha = 1;
  }
}


/* ── 알림 띠 ────────────────────────────────────────────── */
export function drawBanner(ctx, b) {
  const p = 1 - b.t / b.life;                 // 0 → 1
  const inn = Math.min(1, p / 0.16);
  const out = p > 0.82 ? (p - 0.82) / 0.18 : 0;
  const alpha = inn * (1 - out);
  const slide = (1 - inn) * -40 + out * 30;
  const y = 152 + slide;
  const tone = b.tone || "#e8dcc0";

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";

  // 띠
  const gw = 560;
  const grd = ctx.createLinearGradient(CX - gw / 2, 0, CX + gw / 2, 0);
  grd.addColorStop(0, "rgba(28,22,15,0)");
  grd.addColorStop(0.5, "rgba(28,22,15,0.82)");
  grd.addColorStop(1, "rgba(28,22,15,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(CX - gw / 2, y - 34, gw, 68);

  // 위아래 얇은 선
  const ln = ctx.createLinearGradient(CX - gw / 2, 0, CX + gw / 2, 0);
  ln.addColorStop(0, "rgba(255,255,255,0)");
  ln.addColorStop(0.5, tone);
  ln.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = ln;
  ctx.fillRect(CX - gw / 2, y - 34, gw, 1);
  ctx.fillRect(CX - gw / 2, y + 33, gw, 1);

  ctx.font = "800 30px Jua, system-ui, sans-serif";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(20,15,9,0.9)";
  ctx.strokeText(b.text, CX, y + 2);
  ctx.fillStyle = tone;
  ctx.fillText(b.text, CX, y + 2);

  if (b.sub) {
    ctx.font = "500 14px Jua, system-ui, sans-serif";
    ctx.fillStyle = "rgba(240,230,208,0.82)";
    ctx.fillText(b.sub, CX, y + 24);
  }
  ctx.restore();
}

/* 그리기 */

/* ── 보스 결전 화면 ──────────────────────────────────────
   위쪽 가운데에 보스, 아래에 수비대. 맨 위에 이름과 체력 막대. */

const charCache = {};
function classArt(i) {
  if (typeof Image === "undefined") return null;
  const id = (CLASSES[i] || {}).id;
  if (!id) return null;
  let im = charCache[id];
  if (im === undefined) {
    im = charCache[id] = new Image();
    im.onerror = () => { charCache[id] = null; };
    im.src = `/assets/characters/${id}-tower.webp`;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}

// 숫자를 9306만1917 처럼 읽기 좋게
function bigNum(n) {
  n = Math.max(0, Math.round(n));
  if (n < 10000) return String(n);
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  return rest ? `${man}만${rest}` : `${man}만`;
}

function arenaLeaves(ctx, time) {
  // 사방을 둘러싼 숲 — 결전장 느낌을 내는 테두리
  const rnd = mulberry32(99);
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const side = i % 4;
    const t = rnd();
    let x, y, s;
    if (side === 0) { x = 40 + t * (W - 80); y = 96 + rnd() * 40; s = 0.9 + rnd() * 0.5; }
    else if (side === 1) { x = 40 + t * (W - 80); y = H - 40 - rnd() * 50; s = 1 + rnd() * 0.5; }
    else if (side === 2) { x = 26 + rnd() * 110; y = 150 + t * (H - 230); s = 0.9 + rnd() * 0.5; }
    else { x = W - 26 - rnd() * 110; y = 150 + t * (H - 230); s = 0.9 + rnd() * 0.5; }
    const sway = Math.sin(time * 0.7 + i) * 1.6;
    drawTree(ctx, x + sway, y, s, rnd() > 0.45, rnd() * 99);
  }
  ctx.restore();
}

function arenaZone(ctx, a, time) {
  if (!a.zone || a.st !== "tell") return;
  const pat = ARENA_PATTERNS.find((x) => x.id === a.pat) || ARENA_PATTERNS[0];
  const fill = Math.max(0, Math.min(1, 1 - a.stT / (pat.tell || 1)));
  const sq = ARENA.squash;
  a.zone.forEach((z) => {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.scale(1, sq);
    ctx.globalAlpha = 0.2 + 0.14 * Math.abs(Math.sin(time * 9));
    ctx.fillStyle = "#ff4d3d";
    ctx.beginPath();
    if (z.k === "ring") {
      ctx.arc(0, 0, z.r1, 0, Math.PI * 2);
      ctx.arc(0, 0, z.r0, 0, Math.PI * 2, true);
    } else ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    ctx.fill();
    // 차오르는 테두리 — 다 차면 떨어진다
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(255,130,104,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, z.k === "ring" ? z.r1 : z.r, 0, Math.PI * 2); ctx.stroke();
    if (z.k === "ring") { ctx.beginPath(); ctx.arc(0, 0, z.r0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = "#ffd8c8";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, z.k === "ring" ? z.r1 : z.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill);
    ctx.stroke();
    ctx.restore();
  });
}

function arenaBar(ctx, g, a) {
  const label = (ENEMY[a.type] || {}).label || "보스";
  const y = 188, bw = 620, bx = (W - bw) / 2;      // 왼쪽 위 상황판을 피해 내려 놓는다
  // 이름표
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "19px 'Do Hyeon', sans-serif";
  const lw = ctx.measureText(label).width + 40;
  ctx.fillStyle = "rgba(24,18,12,0.86)";
  roundRect(ctx, CX - lw / 2, y - 36, lw, 30, 8); ctx.fill();
  ctx.strokeStyle = "rgba(196,160,104,0.7)"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#f6e5bb";
  ctx.fillText(label, CX, y - 20);

  // 체력 막대
  const r = Math.max(0, a.hp / a.max);
  ctx.fillStyle = "rgba(20,14,10,0.9)";
  roundRect(ctx, bx - 3, y - 3, bw + 6, 30, 7); ctx.fill();
  ctx.strokeStyle = "rgba(196,160,104,0.75)"; ctx.lineWidth = 1.6; ctx.stroke();
  const gl = ctx.createLinearGradient(0, y, 0, y + 24);
  gl.addColorStop(0, a.rage ? "#ff6a52" : "#e8483a");
  gl.addColorStop(1, a.rage ? "#a81d18" : "#8c1f18");
  ctx.fillStyle = gl;
  roundRect(ctx, bx, y, Math.max(2, bw * r), 24, 5); ctx.fill();
  // 칸 눈금
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const x = bx + (bw * i) / 10;
    ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y + 22); ctx.stroke();
  }
  ctx.fillStyle = "#fff6dd";
  ctx.font = "15px 'Do Hyeon', sans-serif";
  ctx.fillText(`${bigNum(a.hp)} / ${bigNum(a.max)}`, bx + bw / 2, y + 13);

  // 남은 시간 — 다하면 보스가 분노한다
  ctx.fillStyle = a.rage ? "rgba(120,30,24,0.9)" : "rgba(24,18,12,0.86)";
  roundRect(ctx, bx + bw + 12, y - 3, 92, 30, 8); ctx.fill();
  ctx.strokeStyle = a.rage ? "rgba(255,120,96,0.9)" : "rgba(196,160,104,0.7)"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = a.rage ? "#ffb1a2" : "#f6e5bb";
  ctx.font = "15px 'Do Hyeon', sans-serif";
  const sec = Math.max(0, Math.ceil(a.limit));
  ctx.fillText(a.rage ? "분노" : `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`,
    bx + bw + 58, y + 13);
  ctx.restore();
}

function arenaBoss(ctx, g, a, time) {
  const im = enemySprite(a.type);
  const jolt = a.jolt > 0 ? a.jolt : 0;
  const bob = Math.sin(time * (a.rage ? 4.2 : 2.4)) * 5;
  const scale = a.type === "titan" ? 2.35 : 2.15;
  ctx.save();
  ctx.translate(ARENA.bx + (jolt > 0 ? (Math.random() - 0.5) * 12 : 0), ARENA.by + bob);
  if (a.intro > 0) {
    const k = Math.min(1, (2.2 - a.intro) / 0.8);
    ctx.globalAlpha = k;
    ctx.scale(1 + (1 - k) * 0.4, 1 + (1 - k) * 0.4);
  }
  if (a.outro > 0) {
    const k = Math.max(0, a.outro / 2.4);
    ctx.globalAlpha = k;
    ctx.rotate((1 - k) * 0.5);
    ctx.translate(0, (1 - k) * 70);
  }
  shadow(ctx, 0, 118, 116, 26, 0.3);
  if (im) {
    const art = ENEMY_ART[a.type];
    const hh = art.h * scale * 2.6, ww = hh * (im.naturalWidth / im.naturalHeight);
    if (jolt > 0) { ctx.globalCompositeOperation = "source-over"; }
    ctx.drawImage(im, -ww / 2, 118 - hh, ww, hh);
    if (jolt > 0) {
      ctx.globalAlpha *= Math.min(0.6, jolt * 4);
      ctx.fillStyle = "#fff";
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath(); ctx.ellipse(0, 118 - hh / 2, ww * 0.32, hh * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function arenaPlayer(ctx, g, pi, time, dt) {
  const p = g.players[pi];
  const im = classArt(pi);
  const col = P[pi];
  const down = p.adown > 0;
  const swing = p.aswing > 0 ? p.aswing : 0;
  const lunge = swing > 0 ? Math.sin((1 - swing / ARENA.swing) * Math.PI) * 26 : 0;
  // 내 캐릭터는 바로, 다른 사람은 부드럽게 따라온다 (자리 소식이 초당 열두 번만 오니까)
  const tx = p.ax, ty = p.ay || ARENA.bfy;
  if (p.vx === undefined || g.mySeat === pi || Math.hypot(p.vx - tx, p.vy - ty) > 260) {
    p.vx = tx; p.vy = ty;
  } else {
    const k = 1 - Math.exp(-dt * 13);
    p.vx += (tx - p.vx) * k;
    p.vy += (ty - p.vy) * k;
  }
  const x = p.vx + (p.adir > 0 ? lunge : -lunge);
  const y = p.vy + Math.abs(Math.sin(time * 3 + pi)) * -2;
  // 발밑 고리 — 보스 뒤로 돌아가도 내가 어디 있는지 보이게
  ctx.save();
  ctx.globalAlpha = g.mySeat === pi ? 0.95 : 0.5;
  ctx.strokeStyle = col.light;
  ctx.lineWidth = g.mySeat === pi ? 3 : 2;
  ctx.beginPath(); ctx.ellipse(p.vx, y + 3, 30, 11, 0, 0, Math.PI * 2); ctx.stroke();
  if (g.mySeat === pi) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = col.key;
    ctx.beginPath(); ctx.ellipse(p.vx, y + 3, 30, 11, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  ctx.save();
  shadow(ctx, p.vx, y + 4, 26, 8, 0.3);
  ctx.translate(x, y);
  if (down) { ctx.rotate(-0.9 * p.adir); ctx.translate(0, 14); ctx.globalAlpha = 0.75; }
  ctx.scale(p.adir < 0 ? -1 : 1, 1);
  if (im) {
    const hh = 128, ww = hh * (im.naturalWidth / im.naturalHeight);
    ctx.drawImage(im, -ww / 2, -hh, ww, hh);
  } else {
    ctx.fillStyle = col.key;
    roundRect(ctx, -16, -58, 32, 58, 12); ctx.fill();
  }
  ctx.restore();

  // 이름표
  ctx.save();
  ctx.font = "12px 'Do Hyeon', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const nm = (g.names && g.names[pi]) || `${pi + 1}P`;
  const wdt = ctx.measureText(nm).width + 16;
  ctx.fillStyle = "rgba(20,14,10,0.7)";
  roundRect(ctx, p.vx - wdt / 2, y + 6, wdt, 17, 8); ctx.fill();
  ctx.fillStyle = col.light;
  ctx.fillText(nm, p.vx, y + 15);
  ctx.restore();

  // 공격 동작 — 붙어서 베는 병과만 큰 자국을 남기고, 나머지는 쏘는 티만 낸다
  if (swing > 0) {
    const kit = arenaKit(pi);
    const k = 1 - swing / (p.askill ? ARENA.swing * 1.6 : ARENA.swing);
    const fade = Math.max(0, 1 - Math.max(0, k - 0.45) / 0.55);
    if (kit.mode === "melee") {
      const a0 = Math.min(1, k * 2.2);
      ctx.save();
      ctx.globalAlpha = 0.9 * fade;
      ctx.translate(p.vx, y - 58);
      ctx.scale(p.adir < 0 ? -1 : 1, 1);
      const R = p.askill ? 200 : 140;
      ctx.strokeStyle = p.askill ? col.light : "#fff6e2";
      ctx.lineWidth = p.askill ? 22 : 13;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(24, -16, R, -1.25 + a0 * 0.5, -1.25 + a0 * 0.5 + 0.95);
      ctx.stroke();
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = col.key;
      ctx.lineWidth = p.askill ? 9 : 5;
      ctx.stroke();
      ctx.restore();
    } else if (kit.mode !== "aid") {
      // 쏘는 쪽으로 짧은 불빛
      const ang = Math.atan2((ARENA.bfy - (p.vy || y)) / ARENA.squash, ARENA.bx - p.vx);
      ctx.save();
      ctx.globalAlpha = 0.85 * fade;
      ctx.translate(p.vx + Math.cos(ang) * 16, y - 50 + Math.sin(ang) * 10);
      ctx.rotate(ang);
      ctx.fillStyle = kit.col || col.light;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(26, -7); ctx.lineTo(34, 0); ctx.lineTo(26, 7);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  if (p.adodge > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, p.adodge);
    ctx.strokeStyle = "#9fe8ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.vx, y - 30, 26, 40, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

export function drawArena(ctx, g, time) {
  const a = g.arena;
  if (!a) return;
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
  const dt = Math.min(0.06, Math.max(0, now - (g.arenaT || now)));
  g.arenaT = now;
  // 바탕
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#22301c");
  sky.addColorStop(0.55, "#2c3d22");
  sky.addColorStop(1, "#1a2415");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 싸우는 터 — 가장자리가 둥근 풀밭
  const cy = (ARENA.top + ARENA.bottom) / 2, ry = (ARENA.bottom - ARENA.top) / 2 + 70;
  const rx = (ARENA.right - ARENA.left) / 2 + 110;
  const gr = ctx.createRadialGradient(CX, cy, 40, CX, cy, rx);
  gr.addColorStop(0, "#475c31");
  gr.addColorStop(0.75, "#3d5029");
  gr.addColorStop(1, "#33431f");
  ctx.save();
  ctx.beginPath(); ctx.ellipse(CX, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = gr; ctx.fill();
  ctx.strokeStyle = "rgba(226,206,160,0.14)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();

  arenaLeaves(ctx, time);

  // 내 공격 범위 — 보스가 들어오면 또렷해진다 (보스의 붉은 자리와 헷갈리지 않게 병과 색)
  const meI = g.mySeat;
  if (meI >= 0 && (!g.seats || g.seats[meI]) && g.players[meI]) {
    const me = g.players[meI];
    const kit = arenaKit(meI);
    const mx = me.vx === undefined ? me.ax : me.vx;
    const my = me.vy === undefined ? (me.ay || ARENA.bfy) : me.vy;
    const rr = arenaRange(meI);
    const far = Math.hypot(ARENA.bx - mx, (ARENA.bfy - my) / ARENA.squash);
    const on = far <= rr && kit.mode !== "aid";
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(1, ARENA.squash);
    ctx.globalAlpha = on ? 0.16 : 0.07;
    ctx.fillStyle = P[meI].key;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = on ? 0.95 : 0.4;
    ctx.strokeStyle = P[meI].light;
    ctx.lineWidth = on ? 2.4 : 1.6;
    ctx.setLineDash(on ? [] : [9, 8]);
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    if (on) {
      // 사거리 안이라는 표시 — 보스 발밑에 같은 색 고리
      ctx.save();
      ctx.translate(ARENA.bx, ARENA.bfy);
      ctx.scale(1, ARENA.squash);
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 6);
      ctx.strokeStyle = P[meI].light; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  arenaZone(ctx, a, time);
  // 앞뒤로 겹치게 — 보스보다 위에 선 사람은 뒤에 가린다
  const order = [{ y: ARENA.bfy, boss: 1 }];
  g.players.forEach((p, i) => {
    if (!g.seats || g.seats[i]) order.push({ y: p.vy === undefined ? (p.ay || ARENA.bfy) : p.vy, pi: i });
  });
  order.sort((u, v) => u.y - v.y);
  order.forEach((o) => { if (o.boss) arenaBoss(ctx, g, a, time); else arenaPlayer(ctx, g, o.pi, time, dt); });

  g.fx.forEach((f) => drawFx(ctx, f));
  arenaBar(ctx, g, a);

  // 보스에게 걸린 것 — 화상·독·서리·부식
  const marks = [];
  if (a.burn > 0) marks.push(["화상", "#ef8177"]);
  if (a.poison > 0) marks.push(["중독", "#bcdd71"]);
  if (a.slow > 0) marks.push(["둔화", "#7cb6ea"]);
  if (a.shred > 0) marks.push(["부식", "#78d5bf"]);
  if (marks.length) {
    ctx.save();
    ctx.font = "12px 'Jua', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let x = CX - (marks.length * 62) / 2 + 31;
    marks.forEach(([t2, c]) => {
      ctx.fillStyle = "rgba(20,14,10,0.75)";
      roundRect(ctx, x - 27, 220, 54, 20, 7); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = c;
      ctx.fillText(t2, x, 231);
      x += 62;
    });
    ctx.restore();
  }

  // 연타
  if (a.combo > 1) {
    ctx.save();
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.font = "34px 'Do Hyeon', sans-serif";
    ctx.fillStyle = "#ffd873";
    ctx.fillText(String(a.combo), W - 34, 116);
    ctx.font = "14px 'Do Hyeon', sans-serif";
    ctx.fillStyle = "#e8dcc0";
    ctx.fillText("연타", W - 34, 142);
    ctx.restore();
  }

  // 조작 안내
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "13px 'Jua', sans-serif";
  ctx.fillStyle = "rgba(240,228,198,0.6)";
  const meK = g.mySeat >= 0 ? arenaKit(g.mySeat) : null;
  const how = meK ? ({ shot: "쏘기", bomb: "포격", chain: "연쇄", aura: "범위", field: "중력장",
    melee: "근접", aid: "보급" })[meK.mode] : "";
  const cls = g.mySeat >= 0 && CLASSES[g.mySeat] ? CLASSES[g.mySeat].name : "";
  ctx.fillText(meK
    ? `W A S D · 방향키로 움직이기 · 스페이스 ${cls} ${how} · 시프트 스킬`
    : "W A S D · 방향키로 움직이기 · 스페이스 공격 · 시프트 스킬", CX, H - 22);
  ctx.restore();

  if (g.banner) drawBanner(ctx, g.banner);
}

export function draw(ctx, g, bg) {
  ctx.save();
  if (g.shake > 0) {
    const s = g.shake * 7;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  if (g.phase === "arena" && g.arena) { drawArena(ctx, g, g.t); ctx.restore(); return; }

  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  else { ctx.fillStyle = C.grass; ctx.fillRect(0, 0, W, H); }

  const playing = g.phase === "prep" || g.phase === "wave";

  // 관문
  for (let i = 0; i < 4; i++) drawPortal(ctx, i, g.t);

  // 사거리 미리보기
  if (playing) {
    g.players.forEach((p, pi) => {
      if (g.seats && !g.seats[pi]) return;
      ctx.fillStyle = `${P[pi].key}1c`;
      ctx.beginPath(); ctx.arc(p.cx, p.cy, p.cr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `${P[pi].key}66`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.arc(p.cx, p.cy, p.cr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // 타워 터
  SLOTS.forEach((s, i) => drawPad(ctx, s, !!g.towers[i], g.t, g.hover === i));

  // 성채 · 타워 · 적을 y 순서로 겹쳐 그리기
  const layers = [{ y: CY + 30, kind: "castle" }];
  g.towers.forEach((t, i) => { if (t) layers.push({ y: SLOTS[i].y, kind: "tower", t, s: SLOTS[i] }); });
  g.enemies.forEach((e) => layers.push({ y: e.y, kind: "enemy", e }));
  layers.sort((a, b) => a.y - b.y);
  layers.forEach((o) => {
    if (o.kind === "castle") drawCastle(ctx, g, g.t);
    else if (o.kind === "tower") drawTower(ctx, o.t, o.s, g.t, g);
    else drawEnemy(ctx, o.e, g.t);
  });

  // 탄 · 효과
  g.bullets.forEach((b) => drawBullet(ctx, b));
  g.fx.forEach((f) => drawFx(ctx, f));

  // 플레이어 커서
  if (playing) {
    g.players.forEach((p, pi) => {
      if (g.seats && !g.seats[pi]) return;
      const col = P[pi];
      const s = SLOTS[sk(p.lane, p.slot)];
      const gap = Math.hypot(s.x - p.cx, s.y - p.cy);
      const jo = p.jolt > 0 ? Math.pow(p.jolt / 0.2, 2) : 0;
      const b = 22 + jo * 5 + Math.min(gap * 0.05, 4) + Math.sin(g.t * 3 + pi) * 0.8;
      const arm = 8 + jo * 2;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(30,24,16,0.5)";
      ctx.lineWidth = 5;
      for (let pass = 0; pass < 2; pass++) {
        if (pass === 1) { ctx.strokeStyle = col.light; ctx.lineWidth = 2.6; }
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([ax, ay]) => {
          ctx.beginPath();
          ctx.moveTo(p.cx + ax * b, p.cy + ay * b * 0.82 - ay * arm);
          ctx.lineTo(p.cx + ax * b, p.cy + ay * b * 0.82);
          ctx.lineTo(p.cx + ax * b - ax * arm, p.cy + ay * b * 0.82);
          ctx.stroke();
        });
      }
      // 이름표
      const mine = g.mySeat === pi;
      const label = (g.names && g.names[pi]) || `${pi + 1}P`;
      ctx.font = `700 ${mine ? 13 : 12}px Jua, system-ui, sans-serif`;
      ctx.textAlign = "center";
      const lw = Math.max(28, ctx.measureText(label).width + 14);
      ctx.fillStyle = mine ? "rgba(28,22,14,0.92)" : "rgba(28,22,14,0.78)";
      roundRect(ctx, p.cx - lw / 2, p.cy - b * 0.82 - 20, lw, 16, 6); ctx.fill();
      if (mine) {
        ctx.strokeStyle = col.light; ctx.lineWidth = 1.4;
        roundRect(ctx, p.cx - lw / 2, p.cy - b * 0.82 - 20, lw, 16, 6); ctx.stroke();
      }
      ctx.fillStyle = col.light;
      ctx.fillText(label, p.cx, p.cy - b * 0.82 - 9);
      ctx.restore();
    });
  }

  // 성채가 위태롭다 — 체력이 낮을수록 경고가 짙어진다
  {
    const hpr = Math.max(0, g.core.hp / g.core.max);
    if (playing && hpr <= 0.5) {
      const lvl = hpr <= 0.2 ? 2 : hpr <= 0.3 ? 1 : 0;
      const beat = 0.5 + 0.5 * Math.sin(g.t * (lvl === 2 ? 6 : lvl === 1 ? 4 : 2.6));
      ctx.save();
      ctx.globalAlpha = (0.12 + lvl * 0.1) * (0.5 + beat * 0.5);
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(CX, CY + 6, 96 + lvl * 8, 60 + lvl * 5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      if (lvl >= 1) {
        const edge = ctx.createRadialGradient(CX, CY, W * 0.3, CX, CY, W * 0.62);
        edge.addColorStop(0, "rgba(160,20,16,0)");
        edge.addColorStop(1, `rgba(160,20,16,${(lvl === 2 ? 0.42 : 0.2) * (0.6 + beat * 0.4)})`);
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  // 성채 피격 섬광
  if (g.hitFlash > 0) {
    ctx.fillStyle = `rgba(190,40,32,${g.hitFlash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // 웨이브·보스·축복 알림
  if (g.banner) drawBanner(ctx, g.banner);

  // 연속 처치
  if (g.combo >= 5 && playing) {
    const pop = Math.min(1, (g.comboT || 0) / 2.4);
    ctx.save();
    ctx.globalAlpha = 0.35 + pop * 0.65;
    ctx.textAlign = "center";
    ctx.font = "800 30px Jua, system-ui, sans-serif";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(26,20,12,0.9)";
    ctx.strokeText(`${g.combo} 연속`, CX, 70);
    const gr = ctx.createLinearGradient(0, 48, 0, 76);
    gr.addColorStop(0, "#fff0b8");
    gr.addColorStop(1, "#f0a13c");
    ctx.fillStyle = gr;
    ctx.fillText(`${g.combo} 연속`, CX, 70);
    ctx.font = "600 12px Jua, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,238,200,0.75)";
    ctx.fillText("쉬지 않고 몰아치는 중", CX, 88);
    ctx.restore();
  }

  // 일시정지
  if (g.paused && playing) {
    ctx.fillStyle = "rgba(18,30,16,0.62)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f4e7c8";
    ctx.font = "700 34px Jua, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("일시정지", CX, CY - 6);
    ctx.font = "500 15px Jua, system-ui, sans-serif";
    ctx.fillStyle = "rgba(244,231,200,0.8)";
    ctx.fillText(g.pauseNote || "방장이 다시 시작하기를 기다리는 중", CX, CY + 22);
  }
}
