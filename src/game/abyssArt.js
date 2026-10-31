/* ── 심연의 탑 그리기 — 광장의 탑 입구 · 수호자 6종 ─────────────────────────
   그림은 abyssData.js ABYSS_ART(생성 그림, 원본 design/abyss/). 못 불러오면 코드 그림으로 대신해 게임이 깨지지 않는다.
   판정은 하지 않는다 — 방장이 보낸 스냅샷 상태만 그린다. 그리기 도구는 rpgArt.js 가 넘겨준다(T) */
import { ABYSS, ABYSS_ART, GUARD_BY_TYPE } from "./abyssData.js";
import { RPG } from "./rpg.js";

const imgs = {};
function img(src) {
  if (typeof Image === "undefined" || !src) return null;
  let im = imgs[src];
  if (im === undefined) {
    im = imgs[src] = new Image();
    im.onerror = () => { imgs[src] = null; };
    im.src = src;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
export function warmAbyssArt() { img(ABYSS_ART.gate.src); img(ABYSS_ART.guards.src); img(ABYSS_ART.guards.atk); }

// 이름판 · 안내 글 — 계몽의 문과 같은 모양
function label(ctx, T, x, top, foot, sub, on) {
  ctx.save();
  ctx.font = "18px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const lw = ctx.measureText("심연의 탑").width + 22;
  ctx.fillStyle = "rgba(34,24,18,0.86)"; ctx.strokeStyle = "#b99a62"; ctx.lineWidth = 1;
  T.roundRect(ctx, x - lw / 2, top - 30, lw, 24, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f1dfb8"; ctx.fillText("심연의 탑", x, top - 18);
  ctx.font = "13px 'Do Hyeon', sans-serif"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(14,16,30,0.85)";
  ctx.strokeText(sub, x, foot + 30); ctx.fillStyle = on ? "#cfe6ff" : "#9fb4d0"; ctx.fillText(sub, x, foot + 30);
  ctx.restore();
}
// 입구 안쪽 빛 — 숨 쉬듯 밝아지고 빛 알갱이가 떠오른다
function portalGlow(ctx, px, py, pr, time, on) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(px, py, 0, px, py, pr * 1.7);
  gl.addColorStop(0, `rgba(170,215,255,${(on ? 0.34 : 0.18) + 0.1 * Math.sin(time * 1.8)})`); gl.addColorStop(1, "rgba(60,90,180,0)");
  ctx.fillStyle = gl; ctx.fillRect(px - pr * 1.7, py - pr * 1.7, pr * 3.4, pr * 3.4);
  for (let i = 0; i < 6; i++) {
    const k = (time * 0.3 + i / 6) % 1, x = px + Math.sin(i * 2.1 + time * 0.8) * pr * 0.55, y = py + pr * 0.9 - k * pr * 2.2;
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8; ctx.fillStyle = "#e6f3ff";
    ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* 광장의 탑 입구 — n 은 MAPS.plaza.npcs 의 abyss 칸(발밑 가운데) */
export function drawAbyssGate(ctx, g, n, time, T) {
  const me = g.heroes[g.mySeat], on = !!me && (me.admin || me.lv >= ABYSS.lv);
  const sub = on ? "끝없이 오르는 도전" : `${ABYSS.lv}레벨부터`;
  const A = ABYSS_ART.gate, pic = img(A.src);
  if (pic) {
    const H = A.h, W = (H * pic.naturalWidth) / pic.naturalHeight, top = n.y - H * A.foot;
    T.shadow(ctx, n.x, n.y + 4, W * 0.44, 14, 0.3);
    ctx.drawImage(pic, n.x - W / 2, top, W, H);
    portalGlow(ctx, n.x - W / 2 + W * A.portal[0], top + H * A.portal[1], W * A.portal[2], time, on);
    label(ctx, T, n.x, top, n.y, sub, on);
    return;
  }
  // 코드 그림 — 남색 돌 원통 탑의 아랫부분 · 아치 입구 · 금빛 띠 한 줄
  const x = n.x, y = n.y, w = 150, h = 230, top = y - h;
  T.shadow(ctx, x, y + 4, w * 0.6, 14, 0.3);
  ctx.save();
  const body = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  body.addColorStop(0, "#1c2038"); body.addColorStop(0.45, "#3a4266"); body.addColorStop(1, "#181b30");
  ctx.fillStyle = body; ctx.strokeStyle = "rgba(10,12,24,0.8)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y - 6); ctx.lineTo(x - w / 2 + 8, top + 18); ctx.lineTo(x + w / 2 - 8, top + 18); ctx.lineTo(x + w / 2, y - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#2a3050"; ctx.beginPath(); ctx.ellipse(x, top + 18, w / 2 - 8, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // 꼭대기(끊긴 윗면)
  ctx.strokeStyle = "rgba(14,16,30,0.55)";                                                       // 돌 줄눈
  for (let r = top + 44; r < y - 10; r += 26) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, r); ctx.lineTo(x + w / 2 - 6, r); ctx.stroke(); }
  ctx.strokeStyle = "rgba(200,170,110,0.7)"; ctx.lineWidth = 1;                                  // 톤다운 금빛 띠
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, top + 70); ctx.lineTo(x + w / 2 - 6, top + 70); ctx.stroke();
  const aw = 54, ah = 96;                                                                        // 아치 입구
  ctx.fillStyle = "#0c0f22";
  ctx.beginPath(); ctx.moveTo(x - aw / 2, y - 8); ctx.lineTo(x - aw / 2, y - ah + aw / 2); ctx.arc(x, y - ah + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(x + aw / 2, y - 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#4a5276";                                                                     // 돌계단
  ctx.fillRect(x - aw / 2 - 12, y - 8, aw + 24, 6); ctx.fillStyle = "#3c4366"; ctx.fillRect(x - aw / 2 - 20, y - 2, aw + 40, 6);
  ctx.restore();
  portalGlow(ctx, x, y - ah * 0.5, aw * 0.42, time, on);
  label(ctx, T, x, top, y, sub, on);
}

/* 수호자 — 시트(3열 × 2행)에서 그 칸을 발밑 가운데에 맞춰 그린다. 기술 준비(pose 1 · 2 · 4)는 공격 시트.
   pose 비트는 rpg.js stepDgBoss — 1 기술 준비(warnR 둘레) · 2 돌진 준비 · 4 돌진 · 8 철벽 · 16 광폭화 · 32 잔상.
   그림이 없으면 같은 원소 느낌의 400~800 몹 몸을 크게 그리고 원소 빛을 두른다(T.fallback) */
const FALLBACK = { tg_fire: "ifrit", tg_frost: "wraith", tg_bolt: "lavagolem", tg_poison: "voidmage", tg_corrode: "fallen", tg_gravity: "abyss" };
export function drawGuardian(ctx, m, time, T) {
  const q = GUARD_BY_TYPE[m.type];
  if (!q) return;
  const G = ABYSS_ART.guards, pose = m.pose || 0, grow = Math.min(1, (m.age || 0) / 0.5);
  const atk = pose & 7 || m.bite > 0;
  const sheet = (atk && img(G.atk)) || img(G.src);
  if (pose & 1) {                                   // 기술 준비 — 맞을 둘레를 깜빡인다
    const p = 0.5 + 0.5 * Math.sin(time * 14);
    ctx.save(); ctx.translate(m.x, m.y); ctx.scale(1, RPG.squash);
    ctx.fillStyle = `rgba(120,170,240,${0.1 + 0.1 * p})`; ctx.strokeStyle = `rgba(190,220,255,${0.5 + 0.4 * p})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, m.warnR || 200, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // 원소 빛 — 몸 뒤로 은은하게(광폭화면 붉게)
  const H = G.h * ((m.size || 2) / 2), cy = m.y - H * 0.45;
  ctx.save();
  const gl = ctx.createRadialGradient(m.x, cy, 8, m.x, cy, H * 0.6);
  gl.addColorStop(0, pose & 16 ? "rgba(255,90,70,0.32)" : `${q.glow}44`); gl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gl; ctx.fillRect(m.x - H * 0.6, cy - H * 0.6, H * 1.2, H * 1.2);
  ctx.restore();
  let top = H;
  if (sheet) {
    const cw = sheet.naturalWidth / G.cols, ch = sheet.naturalHeight / G.rows, sx = (q.i % G.cols) * cw, sy = Math.floor(q.i / G.cols) * ch;
    const k = H / ch, w = cw * k, foot = ch * G.foot * k;
    T.shadow(ctx, m.x, m.y + 2, 64 * grow, 18 * grow, 0.35);
    const draw = (dx, alpha) => {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(m.x + dx, m.y);
      ctx.scale((m.ax < 0 ? -1 : 1) * grow, grow * (1 + (m.moving ? 0 : Math.sin(time * 2.2) * 0.012)));
      ctx.drawImage(sheet, sx, sy, cw, ch, -w / 2, -foot, w, ch * k);
      if (alpha === 1 && m.flash > 0) {             // 맞으면 잠깐 밝게
        ctx.globalAlpha = Math.min(0.35, m.flash * 3); ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(sheet, sx, sy, cw, ch, -w / 2, -foot, w, ch * k);
      }
      ctx.restore();
    };
    if (pose & 32) [-46, 46].forEach((dx) => draw(dx + Math.sin(time * 9 + dx) * 6, 0.28));   // 잔상
    draw(0, 1);
    top = foot;
  } else {
    T.fallback(ctx, { ...m, type: FALLBACK[m.type] || "abyss", boss: 1, portrait: 1 }, time);
  }
  if (pose & 8) {                                   // 철벽 — 하늘빛 고리
    const p = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.save(); ctx.translate(m.x, m.y - top * 0.45);
    ctx.strokeStyle = `rgba(170,215,255,${0.55 + 0.3 * p})`; ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(140,190,255,0.9)"; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(0, 0, top * 0.6, top * 0.58, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  T.marks(ctx, m, time, top * grow);
}
