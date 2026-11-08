/* ── RPG 800~1200레벨 보스 · 정예 기술 연출(sk_hi_*) ─────────────
   예고 범위는 판정(highCombat.js inCircle · inLine · inSector)과 같은 셈으로 그린다: 땅 위 모양을 위아래 squash 로 눌러 그린다.
   그래서 바닥에 보인 범위 밖에 서 있으면 맞지 않고, 안에 서 있으면 맞는다. 예고 안쪽이 차오르는 속도가 터지는 때다. */
import { HIGH_ART, HIGH_IDS } from "./highData.js";

const TAU = Math.PI * 2;
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
};
// 지역 빛깔 — 경고는 모두 같은 따뜻한 붉은 테두리, 안쪽 빛만 지역색
const accent = (st) => (HIGH_ART.look[HIGH_IDS[st]] || HIGH_ART.look.origin_command).c[2];
const WARN = "#e8806a";

// 땅 위 좌표계로 — (x,y) 가 원점, 위아래를 눌러 판정과 같게
function ground(ctx, x, y, sq, ax, ay) {
  ctx.translate(x, y); ctx.scale(1, sq);
  if (ax !== undefined) ctx.rotate(Math.atan2(ay, ax));
}
function shapePath(ctx, f) {
  ctx.beginPath();
  if (f.sh === "c") { ctx.arc(0, 0, f.r, 0, TAU); if (f.inner) { ctx.moveTo(f.inner, 0); ctx.arc(0, 0, f.inner, 0, TAU, true); } }
  else if (f.sh === "l") ctx.rect(0, -f.w / 2, f.len, f.w);
  else if (f.sh === "m") ctx.rect(-f.len / 2, -f.w / 2, f.len, f.w);
  else if (f.sh === "s") { ctx.moveTo(0, 0); ctx.arc(0, 0, f.r, -f.arc, f.arc); ctx.closePath(); }
}
// 차오르는 안쪽 — 터질 때 가득 찬다
function fillPath(ctx, f, k) {
  ctx.beginPath();
  if (f.sh === "c") { const r0 = f.inner || 0; ctx.arc(0, 0, r0 + (f.r - r0) * k, 0, TAU); if (r0) { ctx.moveTo(r0, 0); ctx.arc(0, 0, r0, 0, TAU, true); } }
  else if (f.sh === "l") ctx.rect(0, -f.w / 2, f.len * k, f.w);
  else if (f.sh === "m") ctx.rect(-f.len / 2, -f.w / 2 * k, f.len, f.w * k);
  else if (f.sh === "s") { ctx.moveTo(0, 0); ctx.arc(0, 0, f.r * k, -f.arc, f.arc); ctx.closePath(); }
}

function drawWarn(ctx, f, p, time, sq) {
  const ac = accent(f.st);
  ctx.save();
  ground(ctx, f.x, f.y, sq, f.sh === "c" ? undefined : f.ax, f.sh === "c" ? undefined : f.ay);
  shapePath(ctx, f);
  ctx.fillStyle = rgba(WARN, 0.12); ctx.fill("evenodd");
  ctx.lineWidth = 2 / Math.max(0.5, sq); ctx.strokeStyle = rgba(WARN, 0.55 + 0.35 * Math.abs(Math.sin(time * 9))); ctx.stroke();
  fillPath(ctx, f, p);
  ctx.fillStyle = rgba(ac, 0.18 + p * 0.22); ctx.fill("evenodd");
  if (f.style === "clock" || f.style === "clock2") {          // 시계 문양 — 눈금과 거꾸로 도는 바늘
    ctx.strokeStyle = rgba("#f0dca8", 0.7); ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r = f.r || 60; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); ctx.stroke(); }
    if (f.sh === "c") { const a = -time * (f.style === "clock2" ? 9 : 4); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * f.r * 0.7, Math.sin(a) * f.r * 0.7); ctx.stroke(); }
  } else if (f.style === "rift") {                             // 균열 — 가운데 금
    ctx.strokeStyle = rgba(ac, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-f.len / 2, 0);
    for (let i = 1; i <= 8; i++) ctx.lineTo(-f.len / 2 + (f.len * i) / 8, (i % 2 ? 1 : -1) * f.w * 0.15);
    ctx.stroke();
  } else if (f.style === "dash") {                             // 돌진 — 흐르는 화살표
    ctx.fillStyle = rgba(WARN, 0.5);
    for (let i = 0; i < 4; i++) { const x = ((time * 260 + i * f.len / 4) % f.len); ctx.beginPath(); ctx.moveTo(x, -f.w * 0.3); ctx.lineTo(x + 18, 0); ctx.lineTo(x, f.w * 0.3); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}

function drawBoom(ctx, f, p, sq) {
  const ac = accent(f.st), a = 1 - p;
  ctx.save(); ground(ctx, f.x, f.y, sq);
  shapePath(ctx, f);
  ctx.fillStyle = rgba(ac, 0.45 * a); ctx.fill("evenodd");
  ctx.strokeStyle = rgba("#fff6e8", 0.8 * a); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, f.r * (0.6 + p * 0.5), 0, TAU); ctx.stroke();
  ctx.restore();
  // 솟는 빛기둥
  ctx.fillStyle = rgba(ac, 0.35 * a); ctx.fillRect(f.x - f.r * 0.25, f.y - 90 * (1 - p * 0.5), f.r * 0.5, 90 * (1 - p * 0.5));
}

function drawBeam(ctx, f, p, sq, mid) {
  const ac = accent(f.st), a = 1 - p;
  ctx.save(); ground(ctx, f.x, f.y, sq, f.ax, f.ay);
  const x0 = mid ? -f.len / 2 : 0;
  ctx.fillStyle = rgba(ac, 0.5 * a); ctx.fillRect(x0, -f.w / 2, f.len, f.w);
  ctx.fillStyle = rgba("#fff6e8", 0.75 * a); ctx.fillRect(x0, -f.w * 0.15, f.len, f.w * 0.3);
  ctx.restore();
}

function drawSlash(ctx, f, p, sq) {
  const ac = accent(f.st), a = 1 - p;
  ctx.save(); ground(ctx, f.x, f.y, sq, f.ax, f.ay);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, f.r, -f.arc, -f.arc + f.arc * 2 * Math.min(1, p * 2.5)); ctx.closePath();
  ctx.fillStyle = rgba(ac, 0.4 * a); ctx.fill();
  ctx.strokeStyle = rgba("#fff6e8", 0.8 * a); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, f.r * 0.92, -f.arc, -f.arc + f.arc * 2 * Math.min(1, p * 2.5)); ctx.stroke();
  ctx.restore();
}

function ring(ctx, x, y, r, sq, col, w) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, sq); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.restore();
}

// 이 파일이 맡는 연출이면 그리고 참
export function drawHighFx(ctx, f, p, time, sq) {
  if (!f.kind.startsWith("sk_hi_")) return false;
  const ac = accent(f.st || 0), a = 1 - p;
  switch (f.kind) {
    case "sk_hi_warn": drawWarn(ctx, f, p, time, sq); break;
    case "sk_hi_boom": drawBoom(ctx, f, p, sq); break;
    case "sk_hi_beam": drawBeam(ctx, f, p, sq, false); break;
    case "sk_hi_slash": drawSlash(ctx, f, p, sq); break;
    case "sk_hi_rift": {                                        // 남아 있는 균열 — 위에 서 있으면 조금씩 아프다
      const fade = Math.min(1, f.t / 0.4);
      ctx.save(); ground(ctx, f.x, f.y, sq, f.ax, f.ay);
      ctx.fillStyle = rgba(ac, 0.22 * fade); ctx.fillRect(-f.len / 2, -f.w / 2, f.len, f.w);
      ctx.strokeStyle = rgba(ac, 0.85 * fade); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-f.len / 2, 0);
      for (let i = 1; i <= 8; i++) ctx.lineTo(-f.len / 2 + (f.len * i) / 8, (i % 2 ? 1 : -1) * f.w * 0.18 * (0.8 + 0.2 * Math.sin(time * 6 + i)));
      ctx.stroke(); ctx.restore();
      break;
    }
    case "sk_hi_blink": {
      ring(ctx, f.x, f.y, 30 + p * 30, sq, rgba(ac, a), 3);
      ring(ctx, f.x1, f.y1, 60 - p * 30, sq, rgba(ac, a), 3);
      ctx.strokeStyle = rgba(ac, 0.4 * a); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(f.x, f.y - 30); ctx.lineTo(f.x1, f.y1 - 30); ctx.stroke(); ctx.setLineDash([]);
      break;
    }
    case "sk_hi_rewind": {                                      // 되감기 — 사람이 있던 자리에서 문양 가운데로
      ctx.strokeStyle = rgba("#f0dca8", 0.8 * a); ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(f.x, f.y - 20); ctx.lineTo(f.x1, f.y1 - 20); ctx.stroke(); ctx.setLineDash([]);
      ring(ctx, f.x1, f.y1, 24 + p * 10, sq, rgba("#f0dca8", a), 2);
      break;
    }
    case "sk_hi_shield": {                                      // 강철 방패(점선) · 방어막(금빛)
      const col = f.bar ? "#f0dca0" : "#c8d6e6", k = Math.min(1, p * 4), fade = f.bar ? a : Math.min(1, f.t / 0.5);
      ctx.save(); ctx.globalAlpha = 0.8 * fade; if (!f.bar) ctx.setLineDash([10, 6]);
      ring(ctx, f.x, f.y, f.r * k, sq, col, 3); ctx.restore();
      break;
    }
    case "sk_hi_zone": {                                        // 몹 회복 구역 — 연한 초록 원, 안에서 빛이 오른다
      const fade = Math.min(1, f.t / 0.5, p * 6);
      ctx.save(); ground(ctx, f.x, f.y, sq);
      ctx.fillStyle = rgba("#9fd8b0", 0.18 * fade); ctx.beginPath(); ctx.arc(0, 0, f.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba("#bfe8c8", 0.7 * fade); ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -time * 20; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = rgba("#bfe8c8", 0.6 * fade);
      for (let i = 0; i < 4; i++) { const q = (time * 0.6 + i / 4) % 1, ang = i * 1.7; ctx.fillRect(f.x + Math.cos(ang) * f.r * 0.6, f.y + Math.sin(ang) * f.r * 0.3 * sq - q * 50, 3, 6); }
      break;
    }
    case "sk_hi_summon": {
      ring(ctx, f.x, f.y, f.r * (0.4 + p), sq, rgba(ac, a), 3);
      ctx.fillStyle = rgba(ac, 0.3 * a); ctx.fillRect(f.x - 10, f.y - 70 * p, 20, 70 * p);
      break;
    }
    case "sk_hi_heal": {                                        // 재생 장치 → 주인 회복 줄기
      ctx.strokeStyle = rgba("#bfe8c8", 0.75 * a); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x1, f.y1); ctx.stroke();
      break;
    }
    case "sk_hi_mode": {
      ctx.strokeStyle = rgba(f.mode ? "#bfe8c8" : "#e8806a", a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + p * 0.6), 0, TAU); ctx.stroke();
      break;
    }
    case "sk_hi_phase": {                                       // 단계 · 형태가 바뀔 때 · 정예 쓰러짐 — 크게 퍼지는 고리
      ring(ctx, f.x, f.y, f.r * (0.3 + p), sq, rgba(ac, a), 5);
      ring(ctx, f.x, f.y, f.r * (0.15 + p * 0.7), sq, rgba("#fff6e8", 0.6 * a), 2);
      break;
    }
    default: return false;
  }
  return true;
}
export const HIGH_GROUND_FX = ["sk_hi_warn", "sk_hi_zone", "sk_hi_rift", "sk_hi_boom", "sk_hi_beam", "sk_hi_slash"];
