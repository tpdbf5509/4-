import {
  W, H, CX, CY, R_CORE, C, P, DIRS4, LANES, SLOTS, sk, ENEMY,
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

export function drawCastle(ctx, g, time) {
  const ratio = Math.max(0, g.core.hp / g.core.max);
  shadow(ctx, CX, CY + 44, 92, 28, 0.32);

  // 언덕(바닥 단) — 옆면을 먼저 그려 높이감을 준다
  ctx.beginPath();
  ctx.ellipse(CX, CY + 24, 92, 54, 0, 0, Math.PI * 2);
  inkPath(ctx, "#7f9a4e", 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY + 14, 92, 54, 0, 0, Math.PI * 2);
  inkPath(ctx, "#93b25c", 2);

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
  ctx.ellipse(CX, CY + 6, 62, 36, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stoneDark, 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY - 4, 62, 36, 0, 0, Math.PI * 2);
  inkPath(ctx, C.stone, 2);
  ctx.beginPath();
  ctx.ellipse(CX, CY - 4, 46, 24, 0, 0, Math.PI * 2);
  inkPath(ctx, "#a79c86", 1.6);

  // 성가퀴
  for (let a = 0; a < 18; a++) {
    const t = (a / 18) * Math.PI * 2;
    const x = CX + Math.cos(t) * 62, y = CY - 4 + Math.sin(t) * 36;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t + Math.PI / 2);
    ctx.beginPath();
    roundRect(ctx, -4.6, -7, 9.2, 10, 1.6);
    inkPath(ctx, a % 2 ? C.stoneMid : C.stone, 1.3);
    ctx.restore();
  }

  // 네 방향 성문
  DIRS4.forEach((d) => {
    const x = CX + d.dx * 58, y = CY - 4 + d.dy * 34;
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

  // 모서리 탑 넷 + 중앙 첨탑
  keepTower(ctx, CX - 46, CY + 8, 11, 26, C.roof, C.roofDark, time, false);
  keepTower(ctx, CX + 46, CY + 8, 11, 26, C.roof, C.roofDark, time, false);
  keepTower(ctx, CX - 34, CY - 14, 10, 24, C.roof, C.roofDark, time, false);
  keepTower(ctx, CX + 34, CY - 14, 10, 24, C.roof, C.roofDark, time, false);
  keepTower(ctx, CX, CY - 2, 19, 48, C.roof, C.roofDark, time, true);

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

  // 체력 띠
  const bw = 96;
  ctx.beginPath();
  roundRect(ctx, CX - bw / 2 - 4, CY + 50, bw + 8, 15, 7);
  inkPath(ctx, "rgba(38,28,18,0.86)", 1.6, "rgba(20,14,8,0.9)");
  ctx.fillStyle = "#392d20";
  roundRect(ctx, CX - bw / 2, CY + 53, bw, 9, 4); ctx.fill();
  const hc = ratio > 0.5 ? C.hpGood : ratio > 0.25 ? "#e0a53c" : C.hpLow;
  ctx.fillStyle = hc;
  roundRect(ctx, CX - bw / 2, CY + 53, Math.max(3, bw * ratio), 9, 4); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  roundRect(ctx, CX - bw / 2, CY + 53, Math.max(3, bw * ratio), 4, 2); ctx.fill();
}

/* ── 타워 터 ────────────────────────────────────────────── */
export function drawPad(ctx, s, occupied, time) {
  shadow(ctx, s.x, s.y + 8, 24, 9, 0.26);
  // 흙더미 + 돌판(옆면을 먼저 그려 두께를 준다)
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 5, 24, 15, 0, 0, Math.PI * 2);
  inkPath(ctx, "#6f6353", 1.6);
  ctx.beginPath(); ctx.ellipse(s.x, s.y, 24, 15, 0, 0, Math.PI * 2);
  inkPath(ctx, occupied ? "#b0a68f" : "#a89d86", 1.6);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y - 3, 16, 8, 0, Math.PI, Math.PI * 2); ctx.fill();

  if (!occupied) {
    const pulse = 0.45 + 0.25 * Math.sin(time * 2.4 + s.x * 0.05);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "rgba(255,243,206,0.95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 15, 9.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // 몇 번째 자리인지 — 안내문의 "3번 자리"와 바로 맞춰볼 수 있게
  const bx = s.x - 19, by = s.y + 10;
  ctx.beginPath(); ctx.arc(bx, by, 9.5, 0, Math.PI * 2);
  inkPath(ctx, "rgba(38,28,18,0.88)", 1.4, "rgba(246,229,187,0.75)");
  ctx.fillStyle = "#f6e5bb";
  ctx.font = "700 12.5px 'Do Hyeon', Jua, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(s.idx + 1), bx, by + 0.5);
  ctx.textBaseline = "alphabetic";
}

/* ── 타워 ───────────────────────────────────────────────── */
export function drawTower(ctx, t, s, time) {
  const lv = t.lv;
  const recoil = t.pulse > 0 ? Math.pow(Math.max(0, t.pulse) / 0.4, 2) : 0;
  const col = P[t.owner];
  ctx.save();
  ctx.translate(s.x, s.y - 2);
  ctx.scale(0.92, 0.92);

  if (t.owner === 0) drawArcherTower(ctx, lv, col, time, t, recoil);
  else if (t.owner === 1) drawCannonTower(ctx, lv, col, time, t, recoil);
  else if (t.owner === 2) drawFrostTower(ctx, lv, col, time, t, recoil);
  else drawSupplyTower(ctx, lv, col, time, t, recoil);

  ctx.restore();

  // 단계 표시
  for (let i = 0; i < lv; i++) {
    const x = s.x - (lv - 1) * 4 + i * 8, y = s.y + 17;
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

/* ── 적 ─────────────────────────────────────────────────── */
export function drawEnemy(ctx, e, time) {
  const cfg = ENEMY[e.type];
  const s = cfg.r / 5.4;
  const grow = Math.min(1, e.age / 0.4);
  const walk = e.freeze > 0 ? 0 : Math.sin(e.age * (e.type === "rusher" ? 16 : 9));
  const bob = e.freeze > 0 ? 0 : Math.abs(walk) * 1.6 * s;

  shadow(ctx, e.x, e.y + 9 * s, 11 * s, 4.4 * s, 0.26 * grow);

  ctx.save();
  ctx.globalAlpha = grow;
  ctx.translate(e.x, e.y - bob);
  ctx.scale(s * (0.55 + grow * 0.45) * (e.ax < 0 ? -1 : 1), s * (0.55 + grow * 0.45));

  if (e.type === "grunt") drawOrc(ctx, walk, time);
  else if (e.type === "rusher") drawGoblin(ctx, walk, time);
  else if (e.type === "armor") drawTroll(ctx, walk, time);
  else drawOgre(ctx, walk, time);

  // 피격 섬광
  if (e.flash > 0) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, e.flash * 6)})`;
    ctx.fillRect(-24, -34, 48, 50);
    ctx.globalCompositeOperation = "source-over";
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
    const bw = (e.type === "boss" ? 42 : 24) * (e.type === "boss" ? 1 : s * 1.1);
    const by = e.y - (e.type === "boss" ? 34 : 20) * s - 6;
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
  } else if (b.kind === "ball") {
    const lift = Math.sin(Math.min(1, b.travel) * Math.PI) * 22;
    ctx.fillStyle = "rgba(30,26,20,0.2)";
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2c2c33";
    ctx.beginPath(); ctx.arc(b.x, b.y - lift, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#54545e";
    ctx.beginPath(); ctx.arc(b.x - 1.6, b.y - lift - 1.6, 2, 0, Math.PI * 2); ctx.fill();
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


/* 그리기 */
export function draw(ctx, g, bg) {
  ctx.save();
  if (g.shake > 0) {
    const s = g.shake * 7;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

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
  SLOTS.forEach((s, i) => drawPad(ctx, s, !!g.towers[i], g.t));

  // 성채 · 타워 · 적을 y 순서로 겹쳐 그리기
  const layers = [{ y: CY + 30, kind: "castle" }];
  g.towers.forEach((t, i) => { if (t) layers.push({ y: SLOTS[i].y, kind: "tower", t, s: SLOTS[i] }); });
  g.enemies.forEach((e) => layers.push({ y: e.y, kind: "enemy", e }));
  layers.sort((a, b) => a.y - b.y);
  layers.forEach((o) => {
    if (o.kind === "castle") drawCastle(ctx, g, g.t);
    else if (o.kind === "tower") drawTower(ctx, o.t, o.s, g.t);
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

  // 성채 피격 섬광
  if (g.hitFlash > 0) {
    ctx.fillStyle = `rgba(190,40,32,${g.hitFlash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

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
