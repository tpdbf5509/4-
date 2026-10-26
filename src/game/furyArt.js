/* ── 적룡 지팡이 「용의 격노」 그리기 ─────────────────────────
   사용자가 준 영상 그대로: 바닥 마법진 → 초승달 베기 → 불똥 → 화염구 폭발 → 폭발 자리에서 앞으로 화염 광선(연기 고리) → 붉은 X 표식.
   그림은 생성한 아틀라스(skillData.js FURY_ART). 못 불러오면 코드 빛으로 대신한다. 판정은 하지 않는다 — 방장이 보낸 연출만 그린다 */
import { FURY_ART, WEAPON_SKILLS } from "./skillData.js";
import { RPG } from "./rpg.js";

const A = FURY_ART, C = A.CELL, Z = A.size;
let img;
function atlas() {
  if (typeof Image === "undefined") return null;
  if (img === undefined) {
    img = new Image();
    img.onerror = () => { img = null; };
    img.src = A.src;
  }
  return img && img.complete && img.naturalWidth ? img : null;
}
export const warmFuryArt = () => { atlas(); };
// 아틀라스 한 칸을 가운데 (0, 0) 에 w × h 로 — 그림이 없으면 false
function cell(ctx, i, w, h) {
  const im = atlas();
  if (!im) return false;
  ctx.drawImage(im, (i % A.cols) * A.cell, Math.floor(i / A.cols) * A.cell, A.cell, A.cell, -w / 2, -h / 2, w, h);
  return true;
}
// 단계 [시작, 끝] 안의 몫 0 → 1. 밖이면 -1
const stage = (s, [a, b]) => (s < a || s > b ? -1 : (s - a) / (b - a));
// 들어올 때 빠르게 · 나갈 때 천천히 흐려진다
const bell = (u, rise = 0.15) => (u < rise ? u / rise : 1 - (u - rise) / (1 - rise));
function glow(ctx, x, y, r, col, a) {
  const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
  gl.addColorStop(0, col); gl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = a; ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/* 연출 — 그렸으면 true(skillArt.js drawSkillFx 가 먼저 묻는다). q 는 알갱이 몫(연출 줄이기) */
export function drawFuryFx(ctx, f, p, q = 1) {
  if (f.kind === "sk_fury_hit") return drawHit(ctx, f, p), true;
  if (f.kind !== "sk_fury") return false;
  const S = WEAPON_SKILLS.fury_staff.skill, sq = RPG.squash, s = p * f.life;
  const ax = Math.cos(f.a), ay = Math.sin(f.a);   // 화면 방향(땅 비율이 들어간 각)
  const hx = f.x, hy = f.y - 30;                  // 손 높이
  const bx = f.bx, by = f.by - 30;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  let u;
  // ① 앞 바닥에 주황 마법진(납작한 타원)
  if ((u = stage(s, A.step.rune)) >= 0) {
    const w = Z.rune * (0.7 + 0.3 * u);
    ctx.save(); ctx.translate(f.x + ax * 70, f.y + ay * 70); ctx.globalAlpha = bell(u) * 0.9; ctx.scale(1, sq);
    if (!cell(ctx, C.rune, w, w)) glow(ctx, 0, 0, w * 0.45, "#ff8a3a", bell(u) * 0.6);
    ctx.restore();
  }
  // ② 앞으로 휩쓰는 초승달 두 겹 — 하나는 위에서, 하나는 아래에서 엇갈린다
  if ((u = stage(s, A.step.slash)) >= 0) {
    for (let k = 0; k < 2; k++) {
      const v = Math.min(1, Math.max(0, u * 1.4 - k * 0.4));
      if (v <= 0) continue;
      const d = 60 + 70 * v, w = Z.slash * (0.75 + 0.35 * v);
      ctx.save(); ctx.translate(hx + ax * d, hy + ay * d);
      ctx.rotate(f.a + (k ? 0.5 : -0.5) * (1 - v));
      if (k) ctx.scale(1, -1);
      ctx.globalAlpha = bell(v, 0.2) * 0.95;
      if (!cell(ctx, C.slash, w, w)) { ctx.strokeStyle = "#ff4a4a"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(-w * 0.2, 0, w * 0.35, -1.1, 1.1); ctx.stroke(); }
      ctx.restore();
    }
  }
  // ③ 손에서 폭발 자리까지 작은 불똥이 따라간다
  if ((u = stage(s, A.step.puff)) >= 0) {
    const n = Math.max(2, Math.round(5 * q));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = hx + (bx - hx) * t * u, y = hy + (by - hy) * t * u - 10 * Math.sin(t * 9);
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = bell(u, 0.3) * 0.85;
      if (!cell(ctx, C.puff, Z.puff, Z.puff)) glow(ctx, 0, 0, Z.puff * 0.4, "#ff9a5a", bell(u, 0.3) * 0.7);
      ctx.restore();
    }
  }
  // ④ 앞의 큰 화염구 폭발 — 흰 속 · 붉은 테
  if ((u = stage(s, A.step.ball)) >= 0) {
    const w = Z.ball * (0.55 + 0.6 * Math.min(1, u * 2));
    ctx.save(); ctx.translate(bx, by); ctx.globalAlpha = bell(u, 0.12);
    if (!cell(ctx, C.ball, w, w)) glow(ctx, 0, 0, w * 0.45, "#fff0e0", bell(u, 0.12));
    ctx.restore();
  }
  // ⑤ 폭발 자리에서 앞으로 긴 화염 광선 — 순식간에 뻗고 남는 동안 가늘어진다
  if ((u = stage(s, A.step.beam)) >= 0) {
    const len = S.beam.len * Math.min(1, u * 4), wid = Z.beamW * (1 - 0.6 * u);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(f.a); ctx.globalAlpha = bell(u, 0.1);
    if (len > 4) {
      ctx.translate(len / 2, 0);
      if (!cell(ctx, C.beam, len, wid)) { ctx.fillStyle = "#ff5a4a"; ctx.fillRect(-len / 2, -wid * 0.15, len, wid * 0.3); }
    }
    ctx.restore();
  }
  // ⑥ 광선이 나간 자리의 검붉은 연기 고리
  if ((u = stage(s, A.step.ring)) >= 0) {
    const w = Z.ring * (0.5 + 0.7 * u);
    ctx.save(); ctx.translate(bx, by); ctx.globalAlpha = bell(u, 0.15) * 0.8;
    if (!cell(ctx, C.ring, w, w)) { ctx.strokeStyle = "#a02a2a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  // ⑦ 마지막에 남는 붉은 X 표식 · 세로 줄 · 떠오르는 불씨
  if ((u = stage(s, A.step.mark)) >= 0) {
    ctx.save(); ctx.translate(bx, by - 10 * u); ctx.globalAlpha = (1 - u) * 0.9;
    if (!cell(ctx, C.mark, Z.mark, Z.mark)) {
      ctx.strokeStyle = "#ff3a3a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-30, -30); ctx.lineTo(30, 30); ctx.moveTo(30, -30); ctx.lineTo(-30, 30); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  return true;
}

// 맞은 자리 십자 섬광(big 은 폭발 자리)
function drawHit(ctx, f, p) {
  const w = Z.star * (f.big ? 1.5 : 1) * (0.6 + 0.6 * Math.min(1, p * 3));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(f.x, f.y); ctx.rotate(0.3 * p); ctx.globalAlpha = bell(p, 0.15);
  if (!cell(ctx, C.star, w, w)) glow(ctx, 0, 0, w * 0.4, "#ff6a5a", bell(p, 0.15));
  ctx.restore();
}
