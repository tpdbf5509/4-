/* ── RPG 800~1200레벨 몹 그림 — 일반 · 정예 · 보스 · 소환물 ─────────────
   그림 파일(rpg/high/*.webp, 규격은 highData.js HIGH_ART)이 오면 그 그림, 못 오면 지역마다 다른 코드 그림으로 그린다.
   상태 겉모습(강철 방패 · 방어막 · 강화 · 형태 B · 도약 · 알파 단계)은 스냅샷의 m.hs 비트로 손님도 같게 본다(highCombat.js highFlags). */
import { HIGH_ART, HIGH_IDS, HIGH_ELITE_IDS, HIGH_SUMMON_IDS } from "./highData.js";
import { mapImg } from "./art.js";

const TAU = Math.PI * 2;
const ROOT = "/assets/game/rpg";
const REGION = Object.fromEntries([...HIGH_IDS.map((id) => [id, id]), ...HIGH_ELITE_IDS.map((id, i) => [id, HIGH_IDS[i]])]);
const mobSheet = (id) => mapImg(`${ROOT}/${HIGH_ART.dir}/${id}-mobs.webp`);
const sumSheet = () => mapImg(`${ROOT}/${HIGH_ART.dir}/summons.webp`);
export const highBackImg = (id) => (REGION[id] ? mapImg(`${ROOT}/${HIGH_ART.dir}/${id}-back.webp`) : null);
export const isHighArt = (type) => !!REGION[type] || HIGH_SUMMON_IDS.includes(type);
export const highElite = (m) => HIGH_ELITE_IDS.includes(m.type);
// 미리 불러 두기 — 맵에 들어가기 전에 시트를 요청해 맵 불러오기 화면이 기다리게 한다
export function warmHighArt(mapId) {
  if (!REGION[mapId]) return;
  mobSheet(mapId); sumSheet(); highBackImg(mapId);
}

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const ell = (ctx, x, y, rx, ry, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
const limb = (ctx, x0, y0, x1, y1, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };

/* 코드 그림 — 오른쪽을 보고 발밑이 (0,0). v: 0 일반 · 1 정예 · 2 보스. 키는 크기 1 에서 약 70px */
const SHAPES = {
  crab(ctx, c, v, ph, moving) {                         // 고철 수거 로봇 — 네 다리 · 집게 · 등짐
    const sw = moving ? Math.sin(ph) * 4 : 0;
    for (let k = 0; k < 4; k++) { const x = -18 + k * 12, s = k % 2 ? sw : -sw; limb(ctx, x, -22, x - 6 + s, 0, 4, c[1]); }
    ell(ctx, 0, -30, 26, 16, c[0]);
    ctx.fillStyle = c[1]; ctx.fillRect(-22, -54, 22, 20);
    limb(ctx, 18, -32, 34, -40 + sw, 5, c[1]); poly(ctx, [[32, -46], [44, -42], [36, -38], [44, -34], [32, -32]], c[0]);
    ell(ctx, 16, -36, 4, 4, c[2]);
    if (v >= 1) { ctx.fillStyle = rgba(c[2], 0.7); for (let k = 0; k < 3; k++) ctx.fillRect(-18 + k * 8, -50, 4, 10); }
    if (v === 2) { ell(ctx, 0, -32, 9, 9, c[2]); limb(ctx, -10, -48, -6, -70, 7, c[1]); ell(ctx, -6, -72, 6, 4, c[1]); }
  },
  beast(ctx, c, v, ph, moving) {                        // 네발 포식수 · 균열 추적자
    const sw = moving ? Math.sin(ph) * 5 : 0;
    limb(ctx, -16, -20, -20 - sw, 0, 5, c[1]); limb(ctx, 14, -20, 18 + sw, 0, 5, c[1]);
    limb(ctx, -8, -20, -6 + sw, 0, 5, c[0]); limb(ctx, 20, -20, 24 - sw, 0, 5, c[0]);
    ell(ctx, 0, -28, 28, 13, c[0]);
    poly(ctx, [[20, -34], [42, -32], [44, -24], [24, -18]], c[0]);
    ell(ctx, 34, -30, 2.4, 2.4, c[2]);
    ctx.strokeStyle = rgba(c[2], 0.75); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(16, -28); ctx.stroke();
    if (v >= 1) for (let k = 0; k < 4; k++) poly(ctx, [[-18 + k * 9, -38], [-14 + k * 9, -52 - (v === 2 ? 8 : 0)], [-10 + k * 9, -38]], c[1]);
    if (v === 2) { ell(ctx, -4, -30, 9, 9, rgba(c[2], 0.8)); poly(ctx, [[28, -36], [34, -56], [38, -34]], c[1]); }
  },
  soldier(ctx, c, v, ph, moving) {                      // 사람꼴 기계 병사 · 집행자
    const sw = moving ? Math.sin(ph) * 4 : 0;
    limb(ctx, -4, -24, -6 - sw, 0, 6, c[1]); limb(ctx, 4, -24, 6 + sw, 0, 6, c[0]);
    ctx.fillStyle = c[0]; ctx.fillRect(-12, -52, 24, 30);
    ctx.fillStyle = c[1]; ctx.fillRect(-14, -54, 28, 7);
    ell(ctx, 0, -62, 9, 9, c[0]);
    ctx.fillStyle = c[2]; ctx.fillRect(1, -64, 8, 2);
    limb(ctx, 10, -48, 22, -36, 5, c[1]); limb(ctx, 22, -36, 46, -50, 3, c[1]);
    if (v >= 1) { ctx.fillStyle = c[1]; ctx.fillRect(-18, -58, 10, 10); ctx.fillRect(8, -58, 10, 10); ell(ctx, 0, -40, 4, 4, c[2]); }
    if (v === 2) { poly(ctx, [[-10, -70], [-6, -80], [0, -72], [6, -80], [10, -70]], c[2]); ell(ctx, 0, -40, 7, 7, c[2]); }
  },
  wraith(ctx, c, v, ph) {                               // 떠 있는 망령 · 기록 말소자 · 관측자
    const f = Math.sin(ph * 0.7) * 3;
    poly(ctx, [[-16, -50 + f], [16, -50 + f], [20, -14 + f], [10, -6], [0, -12 + f], [-10, -4], [-20, -14 + f]], rgba(c[0], 0.85));
    ell(ctx, 0, -56 + f, 12, 12, c[1]);
    ell(ctx, 4, -56 + f, 8, 8, c[0]);
    ell(ctx, 6, -56 + f, 2.5, 2.5, c[2]);
    ctx.strokeStyle = rgba(c[2], 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -36 + f, 7, 0, TAU); ctx.stroke();
    limb(ctx, 12, -42 + f, 30, -34 + f, 3, c[1]);
    if (v >= 1) for (let s = -1; s <= 1; s += 2) poly(ctx, [[s * 10, -48 + f], [s * 34, -64 + f], [s * 26, -40 + f]], rgba(c[0], 0.7));
    if (v === 2) { ctx.strokeStyle = c[2]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -74 + f, 12, 4, 0, 0, TAU); ctx.stroke(); }
  },
  clone(ctx, c, v, ph, moving) {                        // 실험체 — 구부정한 몸 · 유리 머리 · 관
    const sw = moving ? Math.sin(ph) * 4 : 0;
    limb(ctx, -4, -20, -6 - sw, 0, 6, c[1]); limb(ctx, 4, -20, 8 + sw, 0, 6, c[0]);
    ell(ctx, 0, -34, 14 + v * 3, 17, c[0]);
    ell(ctx, 8, -56, 10, 10, rgba(c[2], 0.35));
    ctx.strokeStyle = "rgba(240,240,245,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(8, -56, 10, 0, TAU); ctx.stroke();
    ell(ctx, 8, -55, 5, 5, c[1]);
    limb(ctx, -10, -40, -16, -18, 3, c[2]);
    limb(ctx, 12, -38, 24, -22, 5, c[0]);
    if (v >= 1) poly(ctx, [[22, -24], [42, -34], [26, -18]], c[1]);
    if (v === 2) { ell(ctx, 0, -34, 9, 9, c[2]); for (let k = 0; k < 3; k++) limb(ctx, -8, -30 + k * 6, -30 - k * 4, -20 + k * 10 + Math.sin(ph + k) * 4, 3, c[1]); }
  },
};
const SUM_SHAPE = {
  hi_plant(ctx, c) { limb(ctx, 0, 0, 0, -26, 4, "#6a8572"); ell(ctx, 0, -32, 9, 11, "#9fb8a4"); ell(ctx, 3, -32, 3.5, 3.5, c); },
  hi_device(ctx, c, ph) { const f = Math.sin(ph) * 2; ctx.fillStyle = "#8d96a8"; ctx.fillRect(-10, -34 + f, 20, 22); ell(ctx, 0, -23 + f, 5, 5, c); },
  hi_drone(ctx, c, ph) { const f = Math.sin(ph * 1.4) * 3; ell(ctx, 0, -30 + f, 12, 7, "#6e6c78"); limb(ctx, -16, -36 + f, 16, -36 + f, 2, "#4a4852"); ell(ctx, 6, -30 + f, 3, 3, c); },
};

// 코드 그림 한 마리 — 소환물 중 분신은 그 지역 일반 몹 꼴을 반투명으로
function drawCode(ctx, m, ph) {
  if (HIGH_SUMMON_IDS.includes(m.type)) {
    const c = HIGH_ART.sumLook[m.type] || "#f2ead6";
    if (SUM_SHAPE[m.type]) { SUM_SHAPE[m.type](ctx, c, ph); return; }
    const reg = m.type === "hi_echo" ? "origin_command" : "synthetic_forest";
    const L = HIGH_ART.look[reg];
    ctx.globalAlpha *= 0.6; SHAPES[L.shape](ctx, L.c, m.type === "hi_echo" ? 2 : 0, ph, m.moving);
    return;
  }
  const L = HIGH_ART.look[REGION[m.type]];
  if (!L) return;
  SHAPES[L.shape](ctx, L.c, m.boss ? 2 : highElite(m) ? 1 : 0, ph, m.moving);
}

// 그림 한 칸 — 발밑이 (0,0). 못 그렸으면 거짓
function drawSheet(ctx, m) {
  if (HIGH_SUMMON_IDS.includes(m.type)) {
    const im = sumSheet(); if (!im) return false;
    const i = HIGH_SUMMON_IDS.indexOf(m.type), C = HIGH_ART.sumCell, h = HIGH_ART.sumH;
    if (m.type === "hi_echo" || m.type === "hi_sclone") ctx.globalAlpha *= 0.75;
    ctx.drawImage(im, i * C, 0, C, C, -h / 2, -h * HIGH_ART.sumFeet, h, h);
    return true;
  }
  const im = mobSheet(REGION[m.type]); if (!im) return false;
  const i = m.boss ? 2 : highElite(m) ? 1 : 0, C = HIGH_ART.mobCell, h = HIGH_ART.mobH;
  ctx.drawImage(im, i * C, 0, C, C, -h / 2, -h * HIGH_ART.mobFeet, h, h);
  return true;
}

// 상태 겉모습 — 몸 둘레(크기 1 기준 좌표, 발밑 (0,0))
function drawState(ctx, m, time, back) {
  const hs = m.hs || 0, top = 70;
  if (back) {
    if (hs & 4) { ctx.fillStyle = "rgba(240,140,120,0.28)"; ctx.beginPath(); ctx.ellipse(0, 0, 30 + Math.sin(time * 6) * 3, 9, 0, 0, TAU); ctx.fill(); }   // 강화 — 발밑 붉은 빛
    if (hs >> 6) {                                     // 알파 단계 — 발밑 눈금
      const n = hs >> 6;
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k <= n ? "rgba(240,168,144,0.85)" : "rgba(60,56,66,0.5)"; ctx.beginPath(); ctx.arc(-15 + k * 10, 6, 3, 0, TAU); ctx.fill(); }
    }
    return;
  }
  if (hs & 8) {                                        // 오메가 형태 B — 분홍 가시 빛
    ctx.strokeStyle = "rgba(240,168,184,0.7)"; ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) { const a = time * 1.5 + (k / 6) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 18, -top * 0.5 + Math.sin(a) * 18); ctx.lineTo(Math.cos(a) * 30, -top * 0.5 + Math.sin(a) * 30); ctx.stroke(); }
  }
  if (hs & 16) { ctx.fillStyle = "rgba(191,232,200,0.85)"; ctx.beginPath(); ctx.arc(0, -top - 4, 3, 0, TAU); ctx.fill(); }   // 원거리 모드 — 머리 위 점
  const bubble = (col, a, dash) => {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.fillStyle = rgba(col, 0.12); ctx.lineWidth = 2;
    if (dash) ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.ellipse(0, -top * 0.48, 36, top * 0.6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  };
  if (hs & 1) bubble("#c8d6e6", 0.75 + Math.sin(time * 5) * 0.15, true);   // 강철 방패 — 점선 막
  if (hs & 2) bubble("#f0dca0", 0.8 + Math.sin(time * 4) * 0.15);           // 방어막 — 금빛 막
}

// 몸 하나 — 호출하는 쪽이 m.x, m.y 로 옮기고 크기 · 좌우를 맞춘 뒤 부른다
export function drawHighBody(ctx, m, time, ph) {
  const lift = (m.hs & 32) ? 26 : 0;                   // 도약 중 — 몸이 떠 있다(그림자는 땅에 남는다)
  drawState(ctx, m, time, true);
  ctx.save();
  ctx.translate(0, -lift);
  if (m.freeze > 0) ctx.filter = "saturate(0.3) brightness(1.25)";
  if (!drawSheet(ctx, m)) drawCode(ctx, m, ph);
  ctx.filter = "none";
  drawState(ctx, m, time, false);
  ctx.restore();
  return lift;
}
