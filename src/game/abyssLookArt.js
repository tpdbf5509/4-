/* ── 심연의 탑 외형 그림(11월 9일) — 그림 파일 없이 코드로 그린다(abyssData.js ABYSS_LOOKS) ─────────────
   능력치 · 판정과 상관없이 화면에만 그린다. rpgArt.js drawHero 가 부른다:
     drawAbyssUnder  — 몸을 그리기 전 땅 위(맵 좌표): 백층의 그림자(발밑 어둠 · 뒤따르는 분신)
     drawAbyssBack   — 몸을 그리기 전 몸 좌표(발밑이 0,0 · 좌우 뒤집힘 적용): 날개(뒤를 볼 때는 몸 뒤에 앞으로 — drawAbyssFront 가 그린다)
     drawAbyssFront  — 몸을 그린 뒤 몸 좌표: 후광 · 시즌 후광 · 뒤를 볼 때 날개
     abyssWeapon     — 무기 그림을 심연 보랏빛으로 물들인 사본(한 번 만들어 둔다)
   키(hh) · 그림 위(top)를 받아 직업 · 성별 · 전직 그림 크기에 맞춘다. 알갱이 수는 lod 몫(setAbyssLookQuality)으로 줄인다.
   빛깔은 톤다운 보라 · 금빛. 그림 파일을 만들면 이 파일만 바꾸면 된다 */
import { LOOK_BY_ID } from "./abyssData.js";

const bit = (id) => 1 << LOOK_BY_ID[id].i;
export const LOOK_BIT = { wings: bit("abyss_wings"), weapon: bit("abyss_weapon"), halo: bit("abyss_halo"), shadow: bit("abyss_shadow"), season: bit("abyss_halo_season") };
const C = {
  wing: "#3a2a55", wingEdge: "#8a72b8", wingVein: "#5d4a86", mote: "#b9a4e6",
  halo: "#a993d6", haloCore: "#e6dcff", season: "#e2c98a", seasonCore: "#fff3cf",
  shadow: "rgba(18,10,32,0.55)", clone: "#20142f", tint: "#7a5cc0",
};
let Q = 1;
export const setAbyssLookQuality = (q) => { Q = q; };

/* 움직임 기억 — 사람마다 지난 자리 몇 개(잔상 · 알갱이). 화면에만 둔다 */
const mem = new WeakMap();
function track(h, time) {
  let m = mem.get(h);
  if (!m) { m = { x: h.x, y: h.y, t: time, hist: [], motes: [], mv: 0 }; mem.set(h, m); }
  const dt = Math.min(0.1, Math.max(0, time - m.t));
  const d = Math.hypot(h.x - m.x, h.y - m.y);
  m.mv = d > 0.6 ? Math.min(1, m.mv + dt * 6) : Math.max(0, m.mv - dt * 3);
  if (d > 0.6 || !m.hist.length) {
    m.hist.unshift({ x: h.x, y: h.y, at: time });
    if (m.hist.length > 14) m.hist.length = 14;
  }
  m.motes = m.motes.filter((p) => (p.life -= dt) > 0);
  m.motes.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; });
  m.x = h.x; m.y = h.y; m.t = time; m.dt = dt;
  return m;
}
// 지난 자리 가운데 sec 초 전에 가장 가까운 것
function past(m, time, sec) {
  for (const p of m.hist) if (time - p.at >= sec) return p;
  return m.hist[m.hist.length - 1] || null;
}

/* ── 백층의 그림자 — 발밑 어둠 고리 · 피어오르는 검은 연기 · 뒤따르는 그림자 분신 둘 ── */
const darkMemo = new WeakMap();
function darkOf(im) {
  if (!im || !im.naturalWidth || typeof document === "undefined") return null;
  let c = darkMemo.get(im);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext("2d");
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = C.clone; x.fillRect(0, 0, c.width, c.height);
  darkMemo.set(im, c);
  return c;
}
export function drawAbyssUnder(ctx, h, bits, time, body) {
  const m = track(h, time);
  if (!(bits & LOOK_BIT.shadow)) return;
  ctx.save();
  // 발밑 어둠 — 천천히 숨 쉬는 타원
  const pulse = 0.85 + 0.15 * Math.sin(time * 2.2);
  const gr = ctx.createRadialGradient(h.x, h.y + 2, 2, h.x, h.y + 2, 34 * pulse);
  gr.addColorStop(0, "rgba(28,14,46,0.62)"); gr.addColorStop(1, "rgba(28,14,46,0)");
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.ellipse(h.x, h.y + 2, 34 * pulse, 12 * pulse, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(169,147,214,0.35)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(h.x, h.y + 2, 26, 8.5, 0, time * 0.6, time * 0.6 + Math.PI * 1.4); ctx.stroke();
  // 피어오르는 검은 연기 — 몸 둘레 몇 가닥
  const n = Math.max(2, Math.round(5 * Q));
  for (let k = 0; k < n; k++) {
    const ph = (time * 0.55 + k / n) % 1, a = k * 2.4 + time * 0.3;
    ctx.globalAlpha = 0.4 * (1 - ph);
    ctx.fillStyle = k % 2 ? "#2a1a40" : "#3d2a5c";
    ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * 16, h.y - ph * 54, 4 + ph * 5, 0, Math.PI * 2); ctx.fill();
  }
  // 그림자 분신 — 움직일 때 지난 자리에 몸 모양이 남는다
  const dark = body && darkOf(body.im);
  if (dark && m.mv > 0.05) {
    [[0.12, 0.34], [0.24, 0.2]].forEach(([sec, al]) => {
      const p = past(m, time, sec);
      if (!p || Math.hypot(p.x - h.x, p.y - h.y) < 4) return;
      ctx.save();
      ctx.globalAlpha = al * m.mv;
      ctx.translate(p.x, p.y);
      if (body.flip) ctx.scale(-1, 1);
      ctx.drawImage(dark, -body.ww / 2, body.top, body.ww, body.hh);
      ctx.restore();
    });
  }
  ctx.restore();
}

/* ── 심연의 날개 — 어깨에서 양쪽으로 펼친 박쥐 · 깃 섞인 날개, 천천히 퍼덕인다. 움직이면 공허 알갱이와 잔상 ── */
function wingPath(ctx, s, flap) {
  // 오른쪽 날개 하나(왼쪽은 뒤집어 그린다). 뿌리 0,0 · 끝 s 만큼
  const up = -s * (0.55 + flap * 0.18);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(s * 0.25, up * 0.9, s * 0.65, up * 1.05, s * 1.0, up * 0.75);
  ctx.lineTo(s * 0.86, up * 0.3);
  ctx.quadraticCurveTo(s * 0.8, s * 0.05, s * 0.66, s * 0.22);
  ctx.quadraticCurveTo(s * 0.55, s * 0.08, s * 0.42, s * 0.3);
  ctx.quadraticCurveTo(s * 0.3, s * 0.16, s * 0.18, s * 0.32);
  ctx.quadraticCurveTo(s * 0.08, s * 0.16, 0, s * 0.1);
  ctx.closePath();
}
function drawWings(ctx, h, time, hh, top, m, alpha) {
  const s = hh * 0.62, cy = top + hh * 0.34;
  const flap = Math.sin(time * (m && m.mv > 0.2 ? 7 : 2.6));
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const side of [1, -1]) {
    ctx.save();
    ctx.translate(side * hh * 0.05, cy);
    ctx.scale(side, 1);
    ctx.rotate(-0.08 - flap * 0.07);
    // 잔상 — 움직일 때 조금 늦게 따라오는 옅은 날개
    if (m && m.mv > 0.1) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.25 * m.mv;
      ctx.translate(-h.dir * side * 6, 2);
      wingPath(ctx, s * 1.04, flap - 0.4);
      ctx.fillStyle = C.wingEdge; ctx.fill();
      ctx.restore();
    }
    wingPath(ctx, s, flap);
    const gr = ctx.createLinearGradient(0, 0, s, -s * 0.6);
    gr.addColorStop(0, "#241835"); gr.addColorStop(0.6, C.wing); gr.addColorStop(1, "#4b3870");
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = C.wingEdge; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = C.wingVein; ctx.globalAlpha = alpha * 0.8;
    [[0.66, 0.22], [0.42, 0.3], [0.18, 0.32]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * x * 0.7, -s * 0.35, s * x, s * y); ctx.stroke();
    });
    ctx.restore();
  }
  ctx.restore();
}
// 날개 알갱이 — 움직일 때 날개 끝에서 흩어진다(맵 좌표로 남겨 몸이 지나간 자리에 잠깐 떠 있다)
function wingMotes(ctx, h, m, hh) {
  if (m.mv > 0.2 && m.motes.length < Math.round(14 * Q) && Math.random() < m.mv * 0.6) {
    const side = Math.random() < 0.5 ? -1 : 1;
    m.motes.push({ x: h.x + side * hh * (0.3 + Math.random() * 0.25), y: h.y - hh * (0.55 + Math.random() * 0.3),
      vx: -h.dir * (10 + Math.random() * 16), vy: -8 - Math.random() * 10, life: 0.7, max: 0.7, r: 1.2 + Math.random() * 1.6 });
  }
  if (!m.motes.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  m.motes.forEach((p) => {
    ctx.globalAlpha = 0.7 * (p.life / p.max);
    ctx.fillStyle = C.mote;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

/* ── 후광 — 머리 위에 기운 고리. 시즌 후광은 금빛 · 작은 별 넷 ── */
function drawHalo(ctx, time, top, hh, season) {
  const cy = top + hh * 0.02 - 8 + Math.sin(time * 2) * 1.5, rx = Math.max(11, hh * 0.15), ry = rx * 0.32;
  const core = season ? C.seasonCore : C.haloCore, edge = season ? C.season : C.halo;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.35; ctx.strokeStyle = edge; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = core; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  const n = season ? 4 : 3;
  for (let k = 0; k < n; k++) {
    const a = time * (season ? 1.1 : 0.8) + (k * Math.PI * 2) / n;
    const x = Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    ctx.globalAlpha = Math.sin(a) > 0 ? 0.95 : 0.45;
    ctx.fillStyle = core;
    if (season) { ctx.beginPath(); ctx.moveTo(x, y - 3.2); ctx.lineTo(x + 1.2, y); ctx.lineTo(x, y + 3.2); ctx.lineTo(x - 1.2, y); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

export function drawAbyssBack(ctx, h, bits, time, view, hh, top) {
  if ((bits & LOOK_BIT.wings) && view !== "back") drawWings(ctx, h, time, hh, top, mem.get(h), 0.95);
}
export function drawAbyssFront(ctx, h, bits, time, view, hh, top) {
  if ((bits & LOOK_BIT.wings) && view === "back") drawWings(ctx, h, time, hh, top, mem.get(h), 0.92);   // 뒤를 보면 날개가 몸 앞에 보인다
  if (bits & LOOK_BIT.season) drawHalo(ctx, time, top, hh, true);
  else if (bits & LOOK_BIT.halo) drawHalo(ctx, time, top, hh, false);
}
// 몸 위 · 맵 좌표 — 날개 알갱이
export function drawAbyssOver(ctx, h, bits, _time, hh) {
  const m = mem.get(h);
  if (m && (bits & LOOK_BIT.wings)) wingMotes(ctx, h, m, hh);
}

/* ── 심연의 무기 — 든 무기 그림을 보랏빛으로 물들이고 가장자리에 빛 ── */
const tintMemo = new WeakMap();
export function abyssWeapon(img) {
  if (!img || !img.naturalWidth || typeof document === "undefined") return img;
  let c = tintMemo.get(img);
  if (c) return c;
  const pad = 6, w = img.naturalWidth, hgt = img.naturalHeight;
  c = document.createElement("canvas");
  c.width = w + pad * 2; c.height = hgt + pad * 2;
  const x = c.getContext("2d");
  // 빛 — 실루엣을 번지게
  const sil = document.createElement("canvas"); sil.width = w; sil.height = hgt;
  const sx = sil.getContext("2d");
  sx.drawImage(img, 0, 0); sx.globalCompositeOperation = "source-in"; sx.fillStyle = "#9a7ee0"; sx.fillRect(0, 0, w, hgt);
  x.filter = "blur(3px)"; x.globalAlpha = 0.85; x.drawImage(sil, pad, pad); x.filter = "none"; x.globalAlpha = 1;
  // 무기 — 원래 그림에 보랏빛을 덮는다(무늬는 남는다)
  const body = document.createElement("canvas"); body.width = w; body.height = hgt;
  const bx = body.getContext("2d");
  bx.drawImage(img, 0, 0);
  bx.globalCompositeOperation = "source-atop"; bx.globalAlpha = 0.55; bx.fillStyle = C.tint; bx.fillRect(0, 0, w, hgt);
  bx.globalAlpha = 0.25; bx.fillStyle = "#14081f"; bx.fillRect(0, hgt * 0.5, w, hgt * 0.5);
  x.drawImage(body, pad, pad);
  c.naturalWidth = c.width; c.naturalHeight = c.height; c.pad = pad;
  tintMemo.set(img, c);
  return c;
}
// 무기 그림이 없는 몸(전직 그림 · 맨손) — 앞손 자리에 보랏빛 불씨
export function drawAbyssHandGlow(ctx, time, hh, top) {
  const y = top + hh * 0.58, x = hh * 0.16;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < 3; k++) {
    const ph = (time * 1.3 + k / 3) % 1;
    ctx.globalAlpha = 0.55 * (1 - ph);
    ctx.fillStyle = k ? C.mote : C.halo;
    ctx.beginPath(); ctx.arc(x + Math.sin(time * 3 + k) * 2, y - ph * 14, 2.4 - ph, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* 탑 창 미리 보기 — 작은 캔버스에 외형 하나만 그린다(AbyssPanel.jsx) */
export function drawLookPreview(ctx, id, time, w, h) {
  const b = bit(id), hh = h * 0.62, top = -hh;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate(w / 2, h * 0.86);
  // 몸 자리 — 흐린 사람 그림자
  ctx.fillStyle = "rgba(233,211,154,0.16)";
  ctx.beginPath(); ctx.ellipse(0, 0, hh * 0.22, hh * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  const body = () => { ctx.fillStyle = "rgba(233,211,154,0.28)"; ctx.beginPath(); ctx.ellipse(0, top + hh * 0.62, hh * 0.15, hh * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, top + hh * 0.17, hh * 0.12, 0, Math.PI * 2); ctx.fill(); };
  const fake = { x: 0, y: 0, dir: 1 };
  if (b === LOOK_BIT.wings) drawWings(ctx, fake, time, hh, top, null, 0.95);
  if (b === LOOK_BIT.shadow) {
    const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, hh * 0.45);
    gr.addColorStop(0, "rgba(28,14,46,0.75)"); gr.addColorStop(1, "rgba(28,14,46,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, hh * 0.45, hh * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.35; ctx.fillStyle = C.clone;
    ctx.beginPath(); ctx.ellipse(-hh * 0.16, top + hh * 0.62, hh * 0.15, hh * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  body();
  if (b === LOOK_BIT.halo || b === LOOK_BIT.season) drawHalo(ctx, time, top, hh, b === LOOK_BIT.season);
  if (b === LOOK_BIT.weapon) {
    ctx.save(); ctx.translate(hh * 0.2, top + hh * 0.6); ctx.rotate(-0.7);
    ctx.shadowColor = "#9a7ee0"; ctx.shadowBlur = 10; ctx.fillStyle = C.tint;
    ctx.fillRect(-2, -hh * 0.5, 4, hh * 0.5); ctx.fillStyle = "#3a2a55"; ctx.fillRect(-7, -2, 14, 4);
    ctx.restore();
  }
  ctx.restore();
}
