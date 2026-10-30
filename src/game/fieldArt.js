/* RPG 사냥터 바탕 그리기 — 수치 · 빛깔은 fieldLookData.js 한 곳.
   맵에 들어갈 때 한 장(FIELD_TILE 폭)만 캔버스에 그려 두고 rpgArt.js 가 좌우로 뒤집어 잇는다.
   땅 → 땅결 → 바닥 장식 → 위쪽 뒤 풍경 → 아래 끝 줄 차례로 칠한다. 판정과는 상관없는 그림이다 */
import { mulberry32 } from "./art.js";
import { FIELD_LOOKS, FIELD_TILE } from "./fieldLookData.js";

const TAU = Math.PI * 2;
const pick = (rnd, a) => (Array.isArray(a) ? a[Math.floor(rnd() * a.length)] : a);
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function blob(ctx, x, y, rx, ry, rnd, k = 7) {        // 울퉁불퉁한 둥근 덩어리
  ctx.beginPath();
  for (let i = 0; i <= k; i++) {
    const a = (i / k) * TAU, r = 0.78 + rnd() * 0.3;
    const px = x + Math.cos(a) * rx * r, py = y + Math.sin(a) * ry * r;
    if (i === 0) ctx.moveTo(px, py);
    else { const m = a - TAU / k / 2; ctx.quadraticCurveTo(x + Math.cos(m) * rx * 1.08, y + Math.sin(m) * ry * 1.08, px, py); }
  }
  ctx.closePath();
}
const lowShadow = (ctx, x, y, rx, ry, a = 0.18) => { ctx.fillStyle = `rgba(20,16,24,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };

/* ── 땅결 ─────────────────────────── */
const TEX = {
  blade(ctx, x, y, c, rnd) { ctx.strokeStyle = rgba(c, 0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2 + rnd() * 4, y - 5 - rnd() * 5); ctx.stroke(); },
  speck(ctx, x, y, c, rnd) { ctx.fillStyle = rgba(c, 0.45); ctx.fillRect(x, y, 1.5 + rnd() * 1.5, 1.2 + rnd()); },
  grain(ctx, x, y, c, rnd) { ctx.strokeStyle = rgba(c, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + rnd() * 14, y + (rnd() - 0.5) * 3); ctx.stroke(); },
  crack(ctx, x, y, c, rnd) { crackLine(ctx, x, y, c, rnd, 0.45); },
};
function crackLine(ctx, x, y, c, rnd, a, glow) {
  const pts = [[x, y]];
  let ang = rnd() * TAU;
  for (let i = 0; i < 4 + rnd() * 4; i++) { ang += (rnd() - 0.5) * 1.2; x += Math.cos(ang) * (14 + rnd() * 18); y += Math.sin(ang) * (8 + rnd() * 10); pts.push([x, y]); }
  const line = (w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); };
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (glow) { line(9, rgba(c, 0.18)); line(4.5, rgba(c, 0.55)); line(1.6, rgba(glow, 0.95)); }
  else line(1.6, rgba(c, a));
  if (!glow && rnd() < 0.5) {               // 곁가지 하나
    const [bx, by] = pts[1 + Math.floor(rnd() * (pts.length - 1))];
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (rnd() - 0.5) * 30, by + (rnd() - 0.5) * 16); ctx.stroke();
  }
}

/* ── 바닥 장식 ─────────────────────── */
const DECOR = {
  patch(ctx, x, y, d, rnd) {                  // 넓고 흐린 빈터
    const r = 160 + rnd() * 220;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(d.c, 0.5)); gr.addColorStop(1, rgba(d.c, 0));
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55); ctx.translate(-x, -y);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  },
  moss(ctx, x, y, d, rnd) {
    for (let i = 0; i < 9; i++) { ctx.fillStyle = rgba(d.c, 0.18 + rnd() * 0.14); ctx.beginPath(); ctx.ellipse(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 30, 10 + rnd() * 22, 5 + rnd() * 10, 0, 0, TAU); ctx.fill(); }
  },
  flower(ctx, x, y, d, rnd) {
    const c = pick(rnd, d.c);
    for (let i = 0; i < 3 + rnd() * 4; i++) {
      const fx = x + (rnd() - 0.5) * 22, fy = y + (rnd() - 0.5) * 10;
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(fx, fy, 1.8 + rnd() * 1.3, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,248,226,0.7)"; ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
    }
  },
  pebble(ctx, x, y, d, rnd) {
    const r = 2 + rnd() * 3.5;
    ctx.fillStyle = d.c[0]; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = d.c[1]; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.7, r * 0.4, 0, 0, TAU); ctx.fill();
  },
  stone(ctx, x, y, d, rnd) {
    const s = 0.8 + rnd() * 0.9;
    lowShadow(ctx, x + 3 * s, y + 2 * s, 16 * s, 5 * s);
    ctx.fillStyle = d.c[0]; blob(ctx, x, y - 6 * s, 15 * s, 10 * s, rnd, 6); ctx.fill();
    ctx.fillStyle = d.c[1]; blob(ctx, x - 3 * s, y - 9 * s, 9 * s, 5 * s, rnd, 5); ctx.fill();
    ctx.strokeStyle = "rgba(30,24,30,0.22)"; ctx.lineWidth = 1; blob(ctx, x, y - 6 * s, 15 * s, 10 * s, rnd, 6); ctx.stroke();
  },
  tuft(ctx, x, y, d, rnd) {
    ctx.strokeStyle = pick(rnd, d.c); ctx.lineWidth = 1.3; ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (7 + rnd() * 8), y + Math.sin(a) * (7 + rnd() * 8)); ctx.stroke(); }
  },
  needle(ctx, x, y, d, rnd) {
    ctx.strokeStyle = rgba(pick(rnd, d.c), 0.7); ctx.lineWidth = 1; const a = rnd() * TAU;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 3); ctx.stroke();
  },
  leaf(ctx, x, y, d, rnd) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * TAU); ctx.scale(1, 0.6);
    ctx.fillStyle = rgba(pick(rnd, d.c), 0.85); ctx.beginPath(); ctx.ellipse(0, 0, 4 + rnd() * 3, 2 + rnd() * 1.4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },
  mushroom(ctx, x, y, d, rnd) {
    for (let i = 0; i < 1 + rnd() * 3; i++) {
      const mx = x + (rnd() - 0.5) * 20, my = y + (rnd() - 0.5) * 6, s = 0.7 + rnd() * 0.6;
      if (d.glow) { const gr = ctx.createRadialGradient(mx, my - 5 * s, 0, mx, my - 5 * s, 16 * s); gr.addColorStop(0, rgba(d.c[1], 0.45)); gr.addColorStop(1, rgba(d.c[1], 0)); ctx.fillStyle = gr; ctx.fillRect(mx - 16 * s, my - 21 * s, 32 * s, 32 * s); }
      ctx.fillStyle = d.c[0]; ctx.fillRect(mx - 1.2 * s, my - 5 * s, 2.4 * s, 5 * s);
      ctx.fillStyle = d.c[1]; ctx.beginPath(); ctx.ellipse(mx, my - 5 * s, 4.5 * s, 3 * s, 0, Math.PI, TAU); ctx.fill();
    }
  },
  pool(ctx, x, y, d, rnd) {                   // 웅덩이 — 테두리 · 물 · 비친 빛. glow 면 안쪽이 빛난다(용암 · 독)
    const rx = d.size * (0.7 + rnd() * 0.7), ry = rx * (0.36 + rnd() * 0.1);
    const seed = rnd() * 1e6;
    const shape = (k) => blob(ctx, x, y, rx * k, ry * k, mulberry32(seed), 9);
    ctx.fillStyle = d.c[0]; shape(1.12); ctx.fill();
    if (d.glow) {
      ctx.fillStyle = d.c[1]; shape(0.95); ctx.fill();
      ctx.fillStyle = rgba(d.c[2], 0.75); shape(0.55); ctx.fill();
    } else {
      ctx.fillStyle = d.c[1]; shape(0.95); ctx.fill();
      ctx.strokeStyle = rgba(d.c[2], 0.5); ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) { const yy = y - ry * 0.3 + i * ry * 0.35; ctx.beginPath(); ctx.moveTo(x - rx * 0.4 + i * 10, yy); ctx.lineTo(x + rx * 0.2 + i * 14, yy); ctx.stroke(); }
    }
    if (d.lily) for (let i = 0; i < 2 + rnd() * 3; i++) {
      const lx = x + (rnd() - 0.5) * rx * 1.2, ly = y + (rnd() - 0.5) * ry * 1.1, r = 6 + rnd() * 5;
      ctx.fillStyle = d.lily; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.ellipse(lx, ly, r, r * 0.5, 0, 0.3, TAU - 0.3); ctx.closePath(); ctx.fill();
    }
  },
  mud(ctx, x, y, d, rnd) { ctx.fillStyle = rgba(d.c, 0.45); blob(ctx, x, y, 30 + rnd() * 40, 10 + rnd() * 10, rnd, 8); ctx.fill(); },
  reed(ctx, x, y, d, rnd) {
    for (let i = 0; i < 5 + rnd() * 5; i++) {
      const rx = x + (rnd() - 0.5) * 22, h = 16 + rnd() * 18, lean = (rnd() - 0.5) * 6;
      ctx.strokeStyle = pick(rnd, d.c); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rx, y); ctx.quadraticCurveTo(rx + lean, y - h / 2, rx + lean * 1.6, y - h); ctx.stroke();
      if (rnd() < 0.3) { ctx.fillStyle = "#8a7356"; ctx.beginPath(); ctx.ellipse(rx + lean * 1.6, y - h, 1.8, 4.5, 0, 0, TAU); ctx.fill(); }
    }
  },
  fern(ctx, x, y, d, rnd) {
    const s = 0.8 + rnd() * 0.7;
    lowShadow(ctx, x, y + 2, 18 * s, 5 * s, 0.14);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + (i + 0.5) * (Math.PI / 6) + (rnd() - 0.5) * 0.2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = d.c[i % 2]; ctx.beginPath(); ctx.ellipse(13 * s, 0, 13 * s, 3.6 * s, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
  root(ctx, x, y, d, rnd) {
    ctx.strokeStyle = rgba(d.c, 0.75); ctx.lineCap = "round";
    for (let k = 0; k < 2 + rnd() * 2; k++) {
      let px = x, py = y, a = rnd() * TAU, w = 6;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let i = 0; i < 5; i++) { a += (rnd() - 0.5) * 0.9; px += Math.cos(a) * 22; py += Math.sin(a) * 9; ctx.lineTo(px, py); }
      ctx.lineWidth = w; ctx.stroke(); w = 3;
    }
  },
  bone(ctx, x, y, d, rnd) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI); ctx.scale(1, 0.6);
    const L = 7 + rnd() * 6, c = pick(rnd, d.c);
    ctx.fillStyle = c; ctx.fillRect(-L, -1.4, L * 2, 2.8);
    [[-L, -1.8], [-L, 1.8], [L, -1.8], [L, 1.8]].forEach(([bx, by]) => { ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, TAU); ctx.fill(); });
    ctx.restore();
  },
  grave(ctx, x, y, d, rnd) {
    const s = 0.8 + rnd() * 0.5, tilt = (rnd() - 0.5) * 0.25;
    lowShadow(ctx, x + 4 * s, y + 1, 14 * s, 4 * s, 0.22);
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    const w = 18 * s, h = 26 * s;
    ctx.fillStyle = d.c[0]; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h + w / 2); ctx.arc(0, -h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = d.c[1]; ctx.fillRect(-w / 2 + 2 * s, -h + w / 2, 3 * s, h - w / 2 - 1);
    ctx.strokeStyle = "rgba(40,40,52,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4 * s, -h * 0.55); ctx.lineTo(4 * s, -h * 0.55); ctx.moveTo(0, -h * 0.7); ctx.lineTo(0, -h * 0.35); ctx.stroke();
    ctx.restore();
  },
  tiles(ctx, x, y, d, rnd) {                  // 무너진 돌바닥 한 자락 — 가장자리로 갈수록 빠진다
    const cols = 6 + Math.floor(rnd() * 6), rows = 4 + Math.floor(rnd() * 3), tw = 46, th = 26;
    const x0 = x - (cols * tw) / 2, y0 = y - (rows * th) / 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const dx = (c + 0.5) / cols - 0.5, dy = (r + 0.5) / rows - 0.5;
      if (Math.hypot(dx, dy * 1.2) * 2 > 0.75 + rnd() * 0.4) continue;
      const tx = x0 + c * tw + (r % 2 ? tw / 2 : 0), ty = y0 + r * th;
      ctx.fillStyle = pick(rnd, d.c); ctx.fillRect(tx + 1, ty + 1, tw - 2, th - 2);
      ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(tx + 1, ty + 1, tw - 2, 3);
      ctx.strokeStyle = "rgba(30,26,40,0.25)"; ctx.lineWidth = 1; ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
    }
  },
  rune(ctx, x, y, d, rnd) {                   // 바닥에 새긴 둥근 문양(빛은 은은하게)
    const r = 46 + rnd() * 40;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5);
    const gr = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.3);
    gr.addColorStop(0, rgba(d.c, 0.16)); gr.addColorStop(1, rgba(d.c, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(d.c, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, TAU); ctx.stroke();
    const n = 5 + Math.floor(rnd() * 3);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const a = (i * 2 / n) * TAU - Math.PI / 2; const px = Math.cos(a) * r * 0.72, py = Math.sin(a) * r * 0.72; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.fillStyle = rgba(d.c, 0.55); ctx.fillRect(Math.cos(a) * r * 0.86 - 1.5, Math.sin(a) * r * 0.86 - 1.5, 3, 3); }
    ctx.restore();
  },
  crystal(ctx, x, y, d, rnd) {
    const s = 0.7 + rnd() * 0.8;
    lowShadow(ctx, x, y + 1, 12 * s, 3.5 * s, 0.2);
    for (let i = 0; i < 3; i++) {
      const cx = x + (i - 1) * 6 * s, h = (14 + rnd() * 14) * s * (i === 1 ? 1.3 : 1), w = 4.5 * s, lean = (i - 1) * 3 * s;
      ctx.fillStyle = d.c[0]; ctx.beginPath(); ctx.moveTo(cx - w, y); ctx.lineTo(cx + lean, y - h); ctx.lineTo(cx + w, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(d.c[1], 0.8); ctx.beginPath(); ctx.moveTo(cx - w * 0.2, y); ctx.lineTo(cx + lean, y - h); ctx.lineTo(cx + w, y); ctx.closePath(); ctx.fill();
    }
  },
  block(ctx, x, y, d, rnd) {                  // 잘린 돌덩이 — 윗면 · 앞면
    const w = 30 + rnd() * 36, h = 16 + rnd() * 18, t = 12 + rnd() * 8;
    lowShadow(ctx, x + 6, y + 2, w * 0.7, 6, 0.22);
    ctx.fillStyle = d.c[1]; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = d.c[2]; ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x - w / 2 + t * 0.6, y - h - t * 0.6); ctx.lineTo(x + w / 2 + t * 0.6, y - h - t * 0.6); ctx.lineTo(x + w / 2, y - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = d.c[0]; ctx.beginPath(); ctx.moveTo(x + w / 2, y - h); ctx.lineTo(x + w / 2 + t * 0.6, y - h - t * 0.6); ctx.lineTo(x + w / 2 + t * 0.6, y - t * 0.6); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(40,32,24,0.25)"; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + 0.5, y - h + 0.5, w - 1, h - 1);
  },
  ripple(ctx, x, y, d, rnd) {
    ctx.strokeStyle = rgba(d.c, 0.55); ctx.lineWidth = 1.4;
    for (let k = 0; k < 3 + rnd() * 3; k++) {
      const yy = y + k * 9, w = 60 + rnd() * 80;
      ctx.beginPath(); ctx.moveTo(x - w / 2, yy);
      for (let i = 1; i <= 6; i++) ctx.quadraticCurveTo(x - w / 2 + (i - 0.5) * (w / 6), yy - 3, x - w / 2 + i * (w / 6), yy);
      ctx.stroke();
    }
  },
  web(ctx, x, y, d, rnd) {                    // 바닥에 늘어진 거미줄
    const r = 40 + rnd() * 50, n = 7 + Math.floor(rnd() * 3);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55);
    ctx.strokeStyle = rgba(d.c, 0.35); ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, rr = (r * k) / 4.6; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i) ctx.quadraticCurveTo(Math.cos(a - Math.PI / n) * rr * 0.86, Math.sin(a - Math.PI / n) * rr * 0.86, px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
    }
    ctx.restore();
  },
  egg(ctx, x, y, d, rnd) {
    for (let i = 0; i < 2 + rnd() * 4; i++) {
      const ex = x + (rnd() - 0.5) * 26, ey = y + (rnd() - 0.5) * 10, r = 5 + rnd() * 4;
      lowShadow(ctx, ex + 2, ey + r * 0.6, r, r * 0.3, 0.16);
      ctx.fillStyle = d.c[1]; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.85, r, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = d.c[0]; ctx.beginPath(); ctx.ellipse(ex - r * 0.2, ey - r * 0.25, r * 0.45, r * 0.55, 0, 0, TAU); ctx.fill();
    }
  },
  scorch(ctx, x, y, d, rnd) {
    const r = 50 + rnd() * 70;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, rgba(d.c, 0.55)); gr.addColorStop(0.7, rgba(d.c, 0.25)); gr.addColorStop(1, rgba(d.c, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
  },
  ember(ctx, x, y, d, rnd) {
    const r = 1.4 + rnd() * 1.8;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    gr.addColorStop(0, rgba(d.c, 0.7)); gr.addColorStop(1, rgba(d.c, 0));
    ctx.fillStyle = gr; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    ctx.fillStyle = "rgba(255,240,220,0.9)"; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill();
  },
  lava(ctx, x, y, d, rnd) { crackLine(ctx, x, y, d.c[0], rnd, 1, d.c[1]); },
  crack(ctx, x, y, d, rnd) { crackLine(ctx, x, y, d.c, rnd, 0.55); },
  page(ctx, x, y, d, rnd) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 1.6); ctx.scale(1, 0.62);
    ctx.fillStyle = pick(rnd, d.c); ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = "rgba(90,80,110,0.35)"; for (let i = 0; i < 4; i++) ctx.fillRect(-4, -5 + i * 3.4, 6 + rnd() * 2, 1);
    ctx.restore();
  },
  feather(ctx, x, y, d, rnd) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * TAU); ctx.scale(1, 0.6);
    const L = 8 + rnd() * 6;
    ctx.fillStyle = rgba(pick(rnd, d.c), 0.9); ctx.beginPath(); ctx.ellipse(0, 0, L, L * 0.28, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(60,50,60,0.4)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-L - 2, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.restore();
  },
  coral(ctx, x, y, d, rnd) {
    const c = pick(rnd, d.c), s = 0.7 + rnd() * 0.7;
    lowShadow(ctx, x, y + 1, 14 * s, 4 * s, 0.16);
    ctx.strokeStyle = c; ctx.lineCap = "round";
    const branch = (bx, by, a, len, w) => {
      if (len < 4) return;
      const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      branch(ex, ey, a - 0.45 - rnd() * 0.2, len * 0.66, w * 0.72);
      branch(ex, ey, a + 0.45 + rnd() * 0.2, len * 0.66, w * 0.72);
    };
    branch(x, y, -Math.PI / 2 + (rnd() - 0.5) * 0.4, 12 * s, 4 * s);
  },
  shell(ctx, x, y, d, rnd) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 1.2); ctx.scale(1, 0.7);
    const r = 4 + rnd() * 3;
    ctx.fillStyle = pick(rnd, d.c); ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.arc(0, 0, r, Math.PI * 1.05, TAU - 0.05 * Math.PI); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(120,100,100,0.35)"; ctx.lineWidth = 0.7;
    for (let i = 1; i < 5; i++) { const a = Math.PI + (i / 5) * Math.PI; ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
    ctx.restore();
  },
  bubble(ctx, x, y, d, rnd) {
    ctx.strokeStyle = rgba(d.c, 0.45); ctx.lineWidth = 1;
    const r = 1.5 + rnd() * 3; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba(d.c, 0.55); ctx.fillRect(x - r * 0.4, y - r * 0.5, 1, 1);
  },
  fog(ctx, x, y, d, rnd) {
    const r = 220 + rnd() * 240;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.32);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, rgba(d.c, 0.16)); gr.addColorStop(1, rgba(d.c, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
  },
};
// 땅 위에 깔리는 것부터 — 세워진 것(돌 · 묘비 · 수정 · 산호)은 위에서 아래 차례로 그려 앞뒤가 맞게
const FLAT = new Set(["patch", "moss", "pool", "mud", "tiles", "rune", "ripple", "scorch", "lava", "crack", "web", "root", "fog"]);

/* ── 위쪽 뒤 풍경 ───────────────────── */
function backForest(ctx, TW, top, b, rnd) {
  const rows = [{ y: top * 0.42, s: 0.8, c: b.c[0] }, { y: top * 0.7, s: 1, c: b.c[1] }, { y: top * 0.98, s: 1.2, c: b.c[2] }];
  ctx.fillStyle = b.c[0]; ctx.fillRect(0, 0, TW, top * 0.5);
  rows.forEach((row, ri) => {
    const step = (b.dense ? 22 : 30) * row.s;
    ctx.fillStyle = row.c; ctx.strokeStyle = row.c;
    for (let x = -30; x < TW + 30; x += step * (0.7 + rnd() * 0.6)) {
      const y = row.y + (rnd() - 0.5) * 14, s = row.s * (0.85 + rnd() * 0.4);
      if (b.dead && rnd() < b.dead) {             // 앙상한 나무
        ctx.lineWidth = 3 * s; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y - 46 * s);
        for (let k = 0; k < 4; k++) { const by = y - (16 + k * 9) * s, side = k % 2 ? 1 : -1; ctx.moveTo(x, by); ctx.lineTo(x + side * (12 + rnd() * 8) * s, by - 10 * s); }
        ctx.stroke();
      } else if (rnd() < b.pine) {
        ctx.beginPath(); ctx.moveTo(x, y - 62 * s); ctx.lineTo(x + 17 * s, y); ctx.lineTo(x - 17 * s, y); ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(x, y - 30 * s, 22 * s, 0, TAU); ctx.arc(x - 14 * s, y - 16 * s, 16 * s, 0, TAU); ctx.arc(x + 14 * s, y - 16 * s, 16 * s, 0, TAU); ctx.fill();
      }
    }
    if (ri < 2) { ctx.fillStyle = row.c; ctx.fillRect(0, row.y - 4, TW, (rows[ri + 1].y - row.y) + 4); }
  });
}
function backCliff(ctx, TW, top, b, rnd) {
  const layer = (c, lo, hi, step) => {           // 아래(top)부터 솟은 봉우리 — lo ~ hi 높이
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, top + 4);
    for (let x = 0; x <= TW + step; x += step * (0.6 + rnd() * 0.8)) ctx.lineTo(x, lo + rnd() * (hi - lo));
    ctx.lineTo(TW, top + 4); ctx.closePath(); ctx.fill();
  };
  const sky = ctx.createLinearGradient(0, 0, 0, top);
  sky.addColorStop(0, rgba(b.c[0], 0.75)); sky.addColorStop(1, b.c[0]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, TW, top);
  layer(b.c[1], top * 0.12, top * 0.45, 90);
  layer(b.c[2], top * 0.5, top * 0.78, 50);
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 2;  // 바위 면 결
  for (let x = 20; x < TW; x += 26 + rnd() * 40) { const y0 = top * (0.62 + rnd() * 0.2); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 6 - rnd() * 12, y0 + 18 + rnd() * 20); ctx.stroke(); }
  if (b.strata) {                                 // 지층 줄
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) { const yy = top * (0.2 + k * 0.17); ctx.beginPath(); ctx.moveTo(0, yy); for (let x = 0; x <= TW; x += 80) ctx.lineTo(x, yy + Math.sin(x * 0.004 + k) * 6); ctx.stroke(); }
  }
  if (b.reef) {                                   // 바위에 붙은 산호 · 해초
    for (let x = 10; x < TW; x += 40 + rnd() * 60) {
      ctx.strokeStyle = rgba(rnd() < 0.5 ? "#9fc4b8" : "#d7a9b0", 0.7); ctx.lineWidth = 3; ctx.lineCap = "round";
      const by = top * (0.85 + rnd() * 0.15), h = 20 + rnd() * 30;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.quadraticCurveTo(x + 8, by - h / 2, x - 2, by - h); ctx.stroke();
    }
  }
}
function backRuin(ctx, TW, top, b, rnd) {
  ctx.fillStyle = b.c[0]; ctx.fillRect(0, 0, TW, top);
  // 먼 벽 — 무너진 윗선
  ctx.fillStyle = b.c[1]; ctx.beginPath(); ctx.moveTo(0, top);
  for (let x = 0; x <= TW + 60; x += 30 + rnd() * 50) ctx.lineTo(x, top * (0.25 + rnd() * 0.25));
  ctx.lineTo(TW, top); ctx.closePath(); ctx.fill();
  // 벽돌 줄눈
  ctx.strokeStyle = "rgba(30,26,40,0.18)"; ctx.lineWidth = 1;
  for (let y = top * 0.5, r = 0; y < top; y += 16, r++) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TW, y); ctx.stroke();
    for (let x = (r % 2) * 22; x < TW; x += 44) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); }
  }
  if (b.castle) {                                 // 성가퀴
    ctx.fillStyle = b.c[1];
    for (let x = 0; x < TW; x += 260 + rnd() * 120) { const w = 70, h = top * 0.55; ctx.fillRect(x, top * 0.2, w, h); for (let k = 0; k < 4; k++) ctx.fillRect(x - 4 + k * 20, top * 0.2 - 12, 12, 12); }
  }
  if (b.shelf) {                                  // 책장 — 책등 빛깔은 바탕을 바꿔 쓴다
    for (let x = 30; x < TW; x += 220 + rnd() * 100) {
      const w = 120, y0 = top * 0.32, h = top * 0.6;
      ctx.fillStyle = b.c[2]; ctx.fillRect(x, y0, w, h);
      for (let sy = y0 + 6; sy < y0 + h - 12; sy += 22) for (let bx = x + 6; bx < x + w - 8; bx += 7 + rnd() * 4) {
        ctx.fillStyle = ["#a99cc9", "#c7b8a8", "#8fa0bf", "#cfa9b6"][Math.floor(rnd() * 4)]; ctx.fillRect(bx, sy + rnd() * 4, 5, 16);
      }
    }
  }
  // 기둥 — 서 있거나 부러진
  const pillars = b.pillar ? 160 : 340;
  for (let x = 40 + rnd() * 100; x < TW; x += pillars + rnd() * pillars) {
    const h = top * (b.pillar ? 0.55 + rnd() * 0.45 : 0.4 + rnd() * 0.5), w = b.pillar ? 30 : 24;
    ctx.fillStyle = b.c[2]; ctx.fillRect(x - w / 2, top - h, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x - w / 2 + 3, top - h, 5, h);
    ctx.fillStyle = b.c[1]; ctx.fillRect(x - w / 2 - 5, top - 10, w + 10, 10);
    ctx.beginPath(); ctx.moveTo(x - w / 2, top - h); ctx.lineTo(x - w / 2 + w * rnd(), top - h - 8 - rnd() * 10); ctx.lineTo(x + w / 2, top - h); ctx.closePath(); ctx.fill();
  }
}
const BACK = { forest: backForest, cliff: backCliff, ruin: backRuin };

/* ── 아래 끝 줄 ─────────────────────── */
function edgeLine(ctx, TW, H, e, rnd) {
  for (let x = -10; x < TW + 20; x += 18 + rnd() * 26) {
    const y = H - 6 - rnd() * 14, s = 0.8 + rnd() * 0.6;
    if (e.k === "rock") { ctx.fillStyle = e.c[0]; blob(ctx, x, y, 22 * s, 12 * s, rnd, 6); ctx.fill(); ctx.fillStyle = e.c[1]; blob(ctx, x - 4 * s, y - 5 * s, 12 * s, 5 * s, rnd, 5); ctx.fill(); }
    else if (e.k === "fern") DECOR.fern(ctx, x, y, { c: e.c }, rnd);
    else if (e.k === "reed") DECOR.reed(ctx, x, y + 4, { c: e.c }, rnd);
    else if (e.k === "coral") DECOR.coral(ctx, x, y + 4, { c: e.c }, rnd);
    else { ctx.fillStyle = e.c[0]; [[-9, 0, 12], [9, 0, 12], [0, -6, 14]].forEach(([bx, by, r]) => { ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, TAU); ctx.fill(); }); ctx.fillStyle = e.c[1]; [[-7, -3, 8], [7, -3, 8], [0, -9, 10]].forEach(([bx, by, r]) => { ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, TAU); ctx.fill(); }); }
  }
}


// 맵 한 장을 그린 캔버스(폭 FIELD_TILE 이하, 높이 맵 높이). 없으면 null
export function paintFieldLook(M) {
  const L = FIELD_LOOKS[M.id];
  if (!L || typeof document === "undefined") return null;
  const TW = Math.min(M.w, M.tile || FIELD_TILE), H = M.h, top = M.top;
  const c = document.createElement("canvas");
  c.width = TW; c.height = H;
  const ctx = c.getContext("2d");
  const rnd = mulberry32(L.seed);
  const area = (TW * H) / (FIELD_TILE * 1800);
  // 땅 — 위(뒤 풍경 쪽)는 조금 어둡고 아래로 갈수록 밝다
  const base = ctx.createLinearGradient(0, top, 0, H);
  base.addColorStop(0, L.ground[2]); base.addColorStop(0.18, L.ground[0]); base.addColorStop(1, L.ground[0]);
  ctx.fillStyle = base; ctx.fillRect(0, 0, TW, H);
  for (let i = 0; i < (TW * H) / 9000; i++) {
    ctx.fillStyle = rgba(rnd() < 0.5 ? L.ground[1] : L.ground[2], 0.22);
    ctx.beginPath(); ctx.ellipse(rnd() * TW, top + rnd() * (H - top), 30 + rnd() * 80, 12 + rnd() * 28, 0, 0, TAU); ctx.fill();
  }
  // 큰 얼룩 — 넓게 밝고 어두운 곳을 두어 밋밋하지 않게
  for (let i = 0; i < 16 * area; i++) {
    const x = rnd() * TW, y = top + rnd() * (H - top), r = 260 + rnd() * 320;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = i % 2 ? L.ground[1] : L.ground[2];
    gr.addColorStop(0, rgba(col, 0.42)); gr.addColorStop(1, rgba(col, 0));
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.6); ctx.translate(-x, -y);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  // 땅결
  if (L.tex) for (let i = 0; i < L.tex.n * area; i++) TEX[L.tex.k](ctx, rnd() * TW, top + 10 + rnd() * (H - top - 10), L.tex.c, rnd);
  // 장식 — 납작한 것 먼저, 세워진 것은 위에서 아래로
  const stand = [];
  L.decor.forEach((d) => {
    const n = Math.round(d.n * area);
    for (let i = 0; i < n; i++) {
      const x = rnd() * TW, y = top + 40 + rnd() * (H - top - 90);
      if (FLAT.has(d.k)) DECOR[d.k](ctx, x, y, d, rnd);
      else stand.push({ x, y, d, s: rnd() * 1e6 });
    }
  });
  stand.sort((a, b) => a.y - b.y).forEach((o) => DECOR[o.d.k](ctx, o.x, o.y, o.d, mulberry32(o.s)));
  // 뒤 풍경 + 그 아래 그늘
  BACK[L.back.k](ctx, TW, top, L.back, rnd);
  const sh = ctx.createLinearGradient(0, top - 6, 0, top + 40);
  sh.addColorStop(0, "rgba(20,16,28,0.32)"); sh.addColorStop(1, "rgba(20,16,28,0)");
  ctx.fillStyle = sh; ctx.fillRect(0, top - 6, TW, 46);
  edgeLine(ctx, TW, H, L.edge, rnd);
  return c;
}

// 문 앞 흙길 — 문마다 안쪽으로 FIELD_TRAIL 만큼(맵에 따로 적힌 길 대신)
export function fieldTrails(M, len) {
  return (M.gates || []).map((q) => {
    const dir = q.x < M.w / 2 ? 1 : -1;
    return [[q.x - dir * 40, q.y], [q.x + dir * len * 0.35, q.y], [q.x + dir * len * 0.65, q.y - 40], [q.x + dir * len, q.y - 20]];
  });
}
