/* ── 심연의 탑 그리기 — 광장의 탑 입구 · 수호자 6종 ─────────────────────────
   그림은 abyssData.js ABYSS_ART(생성 그림, 원본 design/abyss/). 못 불러오면 코드 그림으로 대신해 게임이 깨지지 않는다.
   판정은 하지 않는다 — 방장이 보낸 스냅샷 상태만 그린다. 그리기 도구는 rpgArt.js 가 넘겨준다(T) */
import { ABYSS, ABYSS_ART, GUARD_BY_TYPE, GUARDIANS } from "./abyssData.js";
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
export function warmAbyssArt() { img(ABYSS_ART.gate.src); img(ABYSS_ART.guards.src); img(ABYSS_ART.guards.atk); img(ABYSS_ART.fx.src); img(ABYSS_ART.icerain.src); }

/* 수호자 기술 연출(kind "sk_ab_*" — skillArt.js 가 먼저 묻는다). col 은 수호자 차례(원소). 검은 바탕 그림이라 lighter 로 더한다.
   slam 내려치기 충격 · strike 연타 한 방 · charge 돌진 자국 · icerain 얼음 비(한 줄기를 크기 · 길이만 바꿔 여러 개) · gbreak 없음 */
const TAU = Math.PI * 2;
const fadeAb = (p, from) => (p < from ? 1 : Math.max(0, 1 - (p - from) / (1 - from)));
function fxCell(ctx, row, col, x, y, w, h) {
  const im = img(ABYSS_ART.fx.src), C = ABYSS_ART.fx.cell;
  if (!im) return false;
  ctx.drawImage(im, col * C, ABYSS_ART.fx.row[row] * C, C, C, x - w / 2, y - h / 2, w, h);
  return true;
}
export function drawAbyssFx(ctx, f, p, time, q = 1) {
  if (!f.kind.startsWith("sk_ab_")) return false;
  const k = f.kind.slice(6), col = f.col || 0, glow = (GUARDIANS[col] || GUARDIANS[0]).glow;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (k === "slam") {                               // 내려치기 — 땅에서 충격 고리가 판정 반지름까지 퍼진다
    const s = f.r * 2.5 * (0.5 + 0.5 * Math.min(1, p * 3));
    ctx.globalAlpha = fadeAb(p, 0.35);
    ctx.translate(f.x, f.y); ctx.scale(1, RPG.squash);
    if (!fxCell(ctx, "slam", col, 0, 0, s, s)) { ctx.strokeStyle = glow; ctx.lineWidth = 5 * (1 - p) + 1; ctx.beginPath(); ctx.arc(0, 0, f.r * p, 0, TAU); ctx.stroke(); }
  } else if (k === "strike") {                      // 연타 한 방 — 떨어진 자리에서 짧게 터진다
    const s = f.s * (0.6 + 0.5 * Math.min(1, p * 4));
    ctx.globalAlpha = fadeAb(p, 0.3);
    if (!fxCell(ctx, "strike", col, f.x, f.y - s * 0.2, s, s)) { const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, s * 0.4); g.addColorStop(0, glow); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(f.x - s, f.y - s, s * 2, s * 2); }
  } else if (k === "charge") {                      // 돌진 자국 — 출발에서 도착까지 길게(오른쪽이 머리)
    const im = img(ABYSS_ART.fx.src), C = ABYSS_ART.fx.cell, w = f.w * 1.5, len = f.len * Math.min(1, p * 3.5);
    ctx.translate(f.x, f.y); ctx.rotate(f.a);
    ctx.globalAlpha = fadeAb(p, 0.4);
    if (im) ctx.drawImage(im, col * C, ABYSS_ART.fx.row.charge * C, C, C, 0, -w / 2, len, w);
    else { ctx.strokeStyle = glow; ctx.lineWidth = w * 0.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke(); }
  } else if (k === "icerain") {                     // 얼음 비 — 한 줄기 그림을 n 개, 크기 s · 길이 len 으로 늘려 r 안에 떨어뜨린다
    const im = img(ABYSS_ART.icerain.src), A = ABYSS_ART.icerain, n = Math.max(4, Math.round(f.n * q));
    for (let i = 0; i < n; i++) {
      const h1 = ((i * 7919) % 100) / 100, h2 = ((i * 104729) % 100) / 100, h3 = ((i * 31) % 100) / 100;
      const a = h1 * TAU, d = Math.sqrt(h2) * f.r, gx = f.x + Math.cos(a) * d, gy = f.y + Math.sin(a) * d * RPG.squash;
      const start = h3 * 0.45, pp = (p - start) / 0.4;                   // 줄기마다 떨어지는 때가 다르다
      if (pp < 0 || pp > 1.6) continue;
      const w = f.s * (0.7 + 0.6 * h2), len = f.len * (0.8 + 0.4 * h1);
      if (pp <= 1) {                                                      // 떨어지는 중 — 위에서 땅으로
        const yy = gy - len * (1 - pp) - len * 0.5;
        ctx.globalAlpha = 0.9;
        if (im) ctx.drawImage(im, gx - w / 2, yy - len / 2, w, len);
        else { ctx.strokeStyle = "#cfeaff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, yy - len / 2); ctx.lineTo(gx, yy + len / 2); ctx.stroke(); }
      } else {                                                            // 땅에 닿아 흩어진다
        const u = pp - 1;
        ctx.globalAlpha = 0.8 * (1 - u / 0.6);
        glow2(ctx, gx, gy, w * (0.8 + u * 2), glow);
      }
    }
  }
  ctx.restore();
  return true;
}
function glow2(ctx, x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
export const ABYSS_GROUND_FX = ["sk_ab_slam"];   // 땅에 깔리는 것(skillArt.js GROUND_FX)

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
    // 그림자 없음 — 그림 자체의 계단 · 돌 그림자로 충분하고, 따로 깔면 탑이 떠 보인다(11월 1일 사용자 요청)
    ctx.drawImage(pic, n.x - W / 2, top, W, H);
    portalGlow(ctx, n.x - W / 2 + W * A.portal[0], top + H * A.portal[1], W * A.portal[2], time, on);
    label(ctx, T, n.x, top, n.y, sub, on);
    return;
  }
  // 코드 그림 — 남색 돌 원통 탑의 아랫부분 · 아치 입구 · 금빛 띠 한 줄
  const x = n.x, y = n.y, w = 150, h = 230, top = y - h;
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
  if (pose & 16) {                                  // 광폭화 — 몸 둘레에 원소 기운이 돈다(몸 뒤)
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.55 + 0.2 * Math.sin(time * 7);
    ctx.translate(m.x, m.y - H * 0.42); ctx.rotate(time * 0.9);
    fxCell(ctx, "rage", q.i, 0, 0, H * 1.25, H * 1.25);
    ctx.restore();
  }
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
    if (pose & 32) {                                // 잔상 — 분신 둘 + 발밑 안개
      [-46, 46].forEach((dx) => draw(dx + Math.sin(time * 9 + dx) * 6, 0.28));
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5;
      [-46, 0, 46].forEach((dx) => fxCell(ctx, "mirage", q.i, m.x + dx, m.y - H * 0.35, H * 0.8, H * 0.8));
      ctx.restore();
    }
    draw(0, 1);
    top = foot;
  } else {
    T.fallback(ctx, { ...m, type: FALLBACK[m.type] || "abyss", boss: 1, portrait: 1 }, time);
  }
  if (pose & 8) {                                   // 철벽 — 원소 돔(그림이 없으면 하늘빛 고리)
    const p = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.6 + 0.2 * p;
    const drew = fxCell(ctx, "dome", q.i, m.x, m.y - top * 0.42, top * 1.15, top * 1.15);
    ctx.restore();
    if (!drew) {
      ctx.save(); ctx.translate(m.x, m.y - top * 0.45);
      ctx.strokeStyle = `rgba(170,215,255,${0.55 + 0.3 * p})`; ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(140,190,255,0.9)"; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(0, 0, top * 0.6, top * 0.58, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  T.marks(ctx, m, time, top * grow);
}
