import { skillAccent } from "./combatFx.js";
import { drawWorldWeaponFx } from "./worldWeaponArt.js";
/* ── 직업 스킬 · 전설 무기 스킬 그리기 ─────────────────────────────
   drawSkillFx — 이 파일이 맡은 연출(kind 가 "sk_" 로 시작): 빙판길 · 얼음 가시 · 불꽃 회오리 · 화염베기 · 유성(별 · 은하) · 종말의 일격 · 성광 빛줄기 · 빛의 결계 · 잿빛 폭발 · 낙뢰.
   drawHeroSkill — 영웅 둘레에 늘 붙는 것: 화염검 불똥 · 별빛 · 철벽 · 보호막 · 연계 중인 무기(그림자 칼 · 천사 날개 · 조준선) · 쌓인 패시브.
   상태는 스냅샷 줄 46(h.ws · h.jb)으로 손님에게도 온다. */
import { WEAPON_SKILLS } from "./skillData.js";
import { heldSpecial, RPG, aimDir } from "./rpg.js";

const SQ = () => RPG.squash;
/* 연출 품질 — 프레임이 무거우면 rpgArt.js 가 낮춘다(1 가득 · FX_LOW 덜 그림). 알갱이 · 마디 수에 곱한다 */
let Q = 1;
export const setFxQuality = (q) => { Q = q; };
const nq = (n) => Math.max(1, Math.round(n * Q));
/* 둥근 빛 — 그라데이션을 그릴 때마다 만들지 않고 빛깔마다 한 번 그려 둔 그림(64px)을 늘려 찍는다.
   빛깔 가짓수가 GLOW_MAX 를 넘으면(투명도를 매번 바꿔 넣는 곳) 예전처럼 바로 그린다 */
const GLOW = new Map(), GLOW_MAX = 256, GLOW_PX = 64;
function glowSprite(inner, mid, outer) {
  const key = `${inner}|${mid}|${outer}`;
  let c = GLOW.get(key);
  if (c || GLOW.size >= GLOW_MAX || typeof document === "undefined") return c || null;
  c = document.createElement("canvas");
  c.width = c.height = GLOW_PX;
  const x = c.getContext("2d"), h = GLOW_PX / 2, gl = x.createRadialGradient(h, h, 0, h, h, h);
  gl.addColorStop(0, inner);
  if (mid) gl.addColorStop(mid[0], mid[1]);
  gl.addColorStop(1, outer);
  x.fillStyle = gl;
  x.fillRect(0, 0, GLOW_PX, GLOW_PX);
  GLOW.set(key, c);
  return c;
}
function glowAt(ctx, x, y, r, inner, outer, mid) {
  if (!(r > 0)) return;
  const c = glowSprite(inner, mid, outer);
  if (c) { ctx.drawImage(c, x - r, y - r, r * 2, r * 2); return; }
  const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
  gl.addColorStop(0, inner);
  if (mid) gl.addColorStop(mid[0], mid[1]);
  gl.addColorStop(1, outer);
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

export function drawSkillFx(ctx, f, time, g) {
  if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) return;
  const p = 1 - f.t / f.life;                     // 0 → 1
  if (drawWorldWeaponFx(ctx, f, p, time, SQ(), g, Q)) return;
  skillAccent(ctx, f, p, Q);
  if (f.kind === "sk_ice") drawIce(ctx, f, p, time);
  else if (f.kind === "sk_tornado") drawTornado(ctx, f, p);
  else if (f.kind === "sk_meteor") drawMeteor(ctx, f, p);
  else if (f.kind === "sk_fireslash") drawFireSlash(ctx, f, p, time);
  else if (f.kind === "sk_blaze") drawBlaze(ctx, f, p);
  else if (f.kind === "sk_icespike") drawIceSpikes(ctx, f, p);
  else if (f.kind === "sk_doom") drawDoom(ctx, f, p);
  else if (f.kind === "sk_holybeam") drawHolyBeam(ctx, f, p, time);
  else if (f.kind === "sk_halo") drawHalo(ctx, f, p, time);
  else if (f.kind === "sk_ashburst") drawAshBurst(ctx, f, p);
  else if (f.kind === "sk_thunder") drawThunder(ctx, f, p, time);
  else if (f.kind === "sk_missile") drawMissile(ctx, f, p, time);
  else if (f.kind === "sk_shadowslash") drawCutArc(ctx, f, p);
  else if (f.kind === "sk_slam") drawSlam(ctx, f, p);
  else if (f.kind === "sk_charge") drawCharge(ctx, f, p, time);
  else if (f.kind === "sk_zapboom") drawZapBoom(ctx, f, p, time);
  else if (f.kind === "sk_rift") drawRift(ctx, f, p, time);
  else if (f.kind === "sk_bind") drawBind(ctx, f, p, time);
  else if (f.kind === "sk_ember") drawEmber(ctx, f, p, time);
  else if (f.kind === "sk_flamer") drawFlamer(ctx, f, p, time, g);
  else if (f.kind === "sk_pierce") drawPierce(ctx, f, p, time);
  else if (f.kind === "sk_wingdash") drawWingDash(ctx, f, p);
  else if (MOB_FX[f.kind]) MOB_FX[f.kind](ctx, f, p, time);   // 200~400레벨 몹 기술
}
// 땅에 깔리는 것 — 몸보다 먼저 그린다(rpgArt.js)
export const GROUND_FX = new Set(["sk_wb_warn", "sk_wb_pool", "sk_wb_grid", "sk_ice", "sk_ember", "sk_rift", "sk_mwarn", "sk_mweb", "sk_mcurse", "sk_mquake"]);

/* 화염베기 — 커다란 불꽃 초승달. 앞 35% 동안 휘어 나가며 그어지고(머리가 가장 굵다), 뒤로 가늘어지며 사라진다.
   겉은 붉은 불, 가운데는 주황, 안쪽 심지는 노란 흰빛. 바깥 가장자리에 불길이 일렁인다 */
function drawFireSlash(ctx, f, p, time) {
  const grow = Math.min(1, p / (f.grow || 0.3)), fade = p < 0.45 ? 1 : Math.max(0, 1 - (p - 0.45) / 0.55);
  const span = f.span * grow, R = f.r, dir = f.dir || 1, N = nq(48);
  const W = R * 0.55 * (0.75 + 0.25 * fade);         // 가장 굵은 곳의 두께
  const turn = dir * (f.spin || 0) * p;              // 그은 뒤에도 베는 쪽으로 계속 휘돌아 간다
  const arcAt = (t) => f.a0 + turn + dir * span * t;
  const taperOf = (t) => Math.sin(Math.PI * Math.min(1, t * 0.8 + 0.12)) * (0.3 + 0.7 * t);   // 꼬리는 가늘고 머리 쪽이 굵다
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.a || 0);
  ctx.scale(1, f.tilt || 0.6);
  ctx.lineCap = "butt";                           // 마디가 겹쳐 구슬처럼 보이지 않게
  // 겉 불 — 진한 붉은 주황(덧칠하지 않고 색을 지킨다) → 안쪽은 빛을 더해 달아오르게
  const passes = [["170,35,12", 1, 0.5, 0], ["235,85,20", 0.72, 0.7, 0], ["255,140,40", 0.42, 0.55, 1], ["255,215,120", 0.16, 0.75, 1]];
  passes.forEach(([rgb, wk, al, glow]) => {
    ctx.globalCompositeOperation = glow ? "lighter" : "source-over";
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const a0 = arcAt(t0), a1 = arcAt(t1);
      ctx.strokeStyle = `rgba(${rgb},${al * fade * (0.35 + 0.65 * t1)})`;
      ctx.lineWidth = Math.max(0.5, W * wk * taperOf(t1));
      ctx.beginPath();
      ctx.arc(0, 0, R, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
    }
  });
  // 바깥 가장자리의 밝은 선 — 칼날이 지나간 자리
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(255,236,170,${0.6 * fade})`;
  ctx.lineWidth = Math.max(1, W * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, R + W * 0.32, Math.min(arcAt(0.15), arcAt(1)), Math.max(arcAt(0.15), arcAt(1)));
  ctx.stroke();
  // 불길 — 초승달을 따라 안팎으로 일렁이는 불꽃 덩어리
  const tips = nq(22);
  for (let i = 0; i < tips; i++) {
    const t = (i + 0.5) / tips;
    if (t > grow) break;
    const a = arcAt(t);
    const flick = 0.55 + 0.45 * Math.sin(time * 22 + i * 2.3 + f.a0);
    const side = i % 2 ? 1 : -0.6;
    const d = R + side * W * (0.35 + 0.35 * flick) * taperOf(t);
    const x = Math.cos(a) * d, y = Math.sin(a) * d, r = W * 0.42 * flick * taperOf(t) * fade;
    if (r <= 0.8) continue;
    ctx.globalCompositeOperation = i % 3 ? "source-over" : "lighter";
    ctx.globalAlpha = fade;                       // 빛깔은 그려 둔 그림 · 옅어지는 것은 투명도로
    glowAt(ctx, x, y, r, "rgba(255,170,60,0.55)", "rgba(160,30,10,0)", [0.6, "rgba(230,70,20,0.35)"]);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// 베인 자리 — 가운데서 불길이 터지고 그을음 조각과 불티가 흩어진다
function drawBlaze(ctx, f, p) {
  const fade = 1 - p;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r * (0.6 + p * 0.5));
  gl.addColorStop(0, `rgba(255,230,150,${0.8 * fade})`);
  gl.addColorStop(0.5, `rgba(255,120,30,${0.5 * fade})`);
  gl.addColorStop(1, "rgba(180,40,10,0)");
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.6 + p * 0.5), f.r * (0.6 + p * 0.5) * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = fade;
  for (let i = 0, n = nq(9); i < n; i++) {        // 불길 덩어리 — 밖으로 퍼지며 위로 오른다
    const a = i * 0.7 + f.x * 0.01, d = f.r * (0.2 + p * 0.9) * (0.6 + (i % 3) * 0.2);
    const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * 0.6 - p * 26, r = f.r * 0.22 * fade;
    glowAt(ctx, x, y, r, "rgba(255,170,60,0.8)", "rgba(200,50,10,0)");
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0, n = nq(10); i < n; i++) {       // 그을음 조각
    const a = i * 2.39 + f.y * 0.01, d = f.r * (0.15 + p * 1.1) * (0.5 + ((i * 37) % 50) / 100);
    ctx.fillStyle = `rgba(40,18,10,${0.8 * fade})`;
    ctx.fillRect(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.6 - p * 10, 3, 2);
  }
  ctx.fillStyle = `rgba(255,236,170,${fade})`;
  for (let i = 0, n = nq(8); i < n; i++) {        // 불티
    const a = i * 0.8 + 0.4, d = f.r * (0.3 + p * 1.3);
    ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.6 - p * 30, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 빙판 — 옅은 하늘색 얼음판, 금이 가 있고 서리가 반짝인다. 처음엔 퍼지고 끝에 녹는다
function drawIce(ctx, f, p, time) {
  const grow = Math.min(1, p * 8), fade = p > 0.85 ? (1 - p) / 0.15 : 1;
  const r = f.r * (0.6 + 0.4 * grow), ry = r * SQ();
  ctx.save();
  ctx.globalAlpha = 0.55 * fade;
  const gl = ctx.createRadialGradient(f.x, f.y, r * 0.1, f.x, f.y, r);
  gl.addColorStop(0, "rgba(226,244,255,0.95)");
  gl.addColorStop(0.7, "rgba(170,214,240,0.75)");
  gl.addColorStop(1, "rgba(140,190,230,0)");
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, r, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.7 * fade;
  ctx.strokeStyle = "rgba(240,250,255,0.9)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {                   // 금
    const a = i * 0.9 + f.x * 0.01;
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(a) * r * 0.15, f.y + Math.sin(a) * ry * 0.15);
    ctx.lineTo(f.x + Math.cos(a + 0.2) * r * 0.55, f.y + Math.sin(a + 0.2) * ry * 0.55);
    ctx.lineTo(f.x + Math.cos(a) * r * 0.85, f.y + Math.sin(a) * ry * 0.85);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 10; i++) {                  // 반짝이는 서리
    const a = i * 2.39 + f.y * 0.01, d = ((i * 37) % 100) / 100;
    ctx.globalAlpha = fade * (0.4 + 0.6 * Math.max(0, Math.sin(time * 4 + i)));
    ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * r * d * 0.9, f.y + Math.sin(a) * ry * d * 0.9, 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 불꽃 회오리 — 바닥에서 위로 비틀려 오르는 불길
function drawTornado(ctx, f, p) {
  const fade = 1 - p;
  ctx.save();
  ctx.globalAlpha = fade * 0.5;
  const gl = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r);
  gl.addColorStop(0, "rgba(255,190,90,0.8)");
  gl.addColorStop(1, "rgba(200,60,20,0)");
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * SQ() * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  const H = 130 * Math.min(1, p * 4 + 0.3);
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = ["rgba(255,120,40,0.85)", "rgba(255,180,80,0.8)", "rgba(255,236,170,0.75)"][k];
    ctx.lineWidth = 6 - k * 1.5;
    ctx.globalAlpha = fade;
    ctx.beginPath();
    for (let i = 0; i <= 26; i++) {
      const u = i / 26;
      const a = p * 16 + k * 2.1 + u * 9;
      const rr = (f.r * 0.25 + f.r * 0.5 * u) * (1 - p * 0.3);
      const x = f.x + Math.cos(a) * rr, y = f.y - u * H + Math.sin(a) * rr * 0.3;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// 유성 — 하늘에서 비스듬히 떨어져(0.6까지) 땅에 닿으면 빛이 터진다. 떨어질 자리에는 미리 둥근 표시.
// tone: 없으면 별빛(흰 보라), "galaxy" 면 은하(푸른 보라 · 분홍)
const METEOR_TONE = {
  star: { core: "255,252,235", mid: "214,192,255", edge: "140,110,255", ring: "203,184,255" },
  galaxy: { core: "200,215,255", mid: "110,90,255", edge: "230,70,210", ring: "150,130,255" },
};
function drawMeteor(ctx, f, p) {
  const T = METEOR_TONE[f.tone] || METEOR_TONE.star;
  const fall = Math.min(1, p / 0.6);
  ctx.save();
  // 떨어질 자리 — 점선 고리가 좁혀 든다
  ctx.globalAlpha = (1 - fall) * 0.7 + 0.1;
  ctx.strokeStyle = `rgba(${T.ring},0.9)`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  const rr = f.r * (1.3 - 0.3 * fall);
  ctx.beginPath(); ctx.ellipse(f.x, f.y, rr, rr * SQ(), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalCompositeOperation = "lighter";
  if (p < 0.6) {
    const sx = f.x - 280, sy = f.y - 560;
    const e = fall * fall;
    const x = sx + (f.x - sx) * e, y = sy + (f.y - 20 - sy) * e;
    const ang = Math.atan2(f.y - sy, f.x - sx), tl = 180;
    ctx.globalAlpha = 1;
    const tail = ctx.createLinearGradient(x, y, x - Math.cos(ang) * tl, y - Math.sin(ang) * tl);
    tail.addColorStop(0, `rgba(${T.core},1)`);
    tail.addColorStop(0.35, `rgba(${T.mid},0.7)`);
    tail.addColorStop(1, `rgba(${T.edge},0)`);
    ctx.strokeStyle = tail;
    ctx.lineCap = "round";
    ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * tl, y - Math.sin(ang) * tl); ctx.stroke();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * tl * 0.7, y - Math.sin(ang) * tl * 0.7); ctx.stroke();
    ctx.fillStyle = `rgba(${T.core},0.9)`;      // 꼬리를 따라 반짝이는 별가루
    for (let i = 0; i < 7; i++) {
      const u = ((i * 0.13 + p * 3) % 1), w = (i % 2 ? 1 : -1) * (6 + (i * 5) % 9);
      star(ctx, x - Math.cos(ang) * tl * u - Math.sin(ang) * w, y - Math.sin(ang) * tl * u + Math.cos(ang) * w, 3 * (1 - u));
    }
    const core = ctx.createRadialGradient(x, y, 1, x, y, 34);
    core.addColorStop(0, `rgba(${T.core},1)`);
    core.addColorStop(0.4, `rgba(${T.mid},0.85)`);
    core.addColorStop(1, `rgba(${T.edge},0)`);
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
  } else {
    const q = (p - 0.6) / 0.4;
    // 번쩍임 · 빛기둥
    ctx.globalAlpha = Math.max(0, 1 - q * 2.2);
    const col = ctx.createLinearGradient(f.x, f.y, f.x, f.y - 220);
    col.addColorStop(0, `rgba(${T.core},0.9)`);
    col.addColorStop(1, `rgba(${T.mid},0)`);
    ctx.fillStyle = col;
    ctx.fillRect(f.x - f.r * 0.35, f.y - 220, f.r * 0.7, 220);
    // 바닥 빛
    ctx.globalAlpha = 1 - q;
    const gl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r);
    gl.addColorStop(0, `rgba(${T.core},0.95)`);
    gl.addColorStop(0.5, `rgba(${T.mid},0.6)`);
    gl.addColorStop(1, `rgba(${T.edge},0)`);
    ctx.fillStyle = gl;
    const g2 = 0.7 + q * 0.5;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * g2, f.r * SQ() * g2, 0, 0, Math.PI * 2); ctx.fill();
    // 충격파 고리
    ctx.strokeStyle = `rgba(${T.ring},${1 - q})`;
    ctx.lineWidth = 4 * (1 - q) + 1;
    const sw = f.r * (0.4 + q * 1.2);
    ctx.beginPath(); ctx.ellipse(f.x, f.y, sw, sw * SQ(), 0, 0, Math.PI * 2); ctx.stroke();
    // 튀는 별
    ctx.fillStyle = `rgba(${T.core},${1 - q})`;
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63 + f.x * 0.01, d = f.r * (0.2 + q * 1.1);
      star(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * SQ() - q * 30 * (i % 3), 4 * (1 - q) + 1);
    }
  }
  ctx.restore();
}

/* 영웅 둘레 — 발밑(x, y) 기준 */
export function drawHeroSkill(ctx, h, time) {
  if (!h || h.down > 0) return;
  const w = h.ws, jb = h.jb, sp = heldSpecial(h);
  const cx = h.x, cy = h.y - 40;
  ctx.save();
  if (jb && jb.iron > 0) bubble(ctx, cx, cy, 42, "rgba(207,216,230,", time);          // 철벽 — 잿빛 막
  if (jb && jb.sh > 0 && jb.shT > 0) bubble(ctx, cx, cy, 46, "rgba(150,190,245,", time); // 마나 보호막 — 푸른 막
  if (w && sp === "flame" && w.emb > 0) {         // 불똥 — 몸 둘레를 돈다(셋까지 크게, 넘는 것은 작게)
    const n = Math.min(9, w.emb);
    for (let i = 0; i < n; i++) {
      const a = time * 2.4 + (i / n) * Math.PI * 2;
      const big = i < WEAPON_SKILLS.flame.passive.need;
      const x = cx + Math.cos(a) * 30, y = cy + Math.sin(a) * 12 + Math.sin(time * 6 + i) * 2;
      const r = big ? 4.2 : 2.6;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      gl.addColorStop(0, "rgba(255,240,190,1)");
      gl.addColorStop(0.45, "rgba(255,150,60,0.9)");
      gl.addColorStop(1, "rgba(200,60,20,0)");
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (w && sp === "star" && w.star > 0) {         // 별빛 — 머리 위로 작은 별이 반짝인다(쌓일수록 많이)
    const n = Math.min(6, 1 + Math.floor(w.star / 100));
    ctx.fillStyle = "#e6dcff";
    for (let i = 0; i < n; i++) {
      const a = time * 1.5 + (i / n) * Math.PI * 2;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 5 + i);
      star(ctx, cx + Math.cos(a) * 24, cy - 34 + Math.sin(a) * 6, 2.6);
    }
    ctx.globalAlpha = 1;
  }
  drawComboHero(ctx, h, time);
  ctx.restore();
}
function bubble(ctx, x, y, r, rgb, time) {
  const pulse = 0.85 + 0.15 * Math.sin(time * 4);
  ctx.fillStyle = `${rgb}0.12)`;
  ctx.strokeStyle = `${rgb}${0.6 * pulse})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.4 : r;
    i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

/* ── 무기 스킬 전용 연출 ─────────────────────────────────── */

// 빙판길 — 깔리는 순간 얼음 가시가 둘레에서 솟고 흰 서리가 번쩍 퍼진다
function drawIceSpikes(ctx, f, p) {
  const rise = Math.min(1, p / 0.18), fade = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.45);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.max(0, 1 - p * 3);       // 번쩍
  const fl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r * 1.2);
  fl.addColorStop(0, "rgba(240,252,255,0.95)");
  fl.addColorStop(1, "rgba(160,220,255,0)");
  ctx.fillStyle = fl;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 1.2, f.r * 1.2 * SQ(), 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const spikes = [];
  for (let i = 0, n = nq(22); i < n; i++) {
    const a = i * 2.39, d = f.r * (0.15 + 0.85 * (((i * 53) % 100) / 100));
    spikes.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d * SQ(), h: 34 + ((i * 31) % 44), w: 10 + (i % 3) * 5, lean: Math.cos(a) * 0.35 });
  }
  spikes.sort((a, b) => a.y - b.y).forEach((k) => {
    const h = k.h * rise * (0.6 + 0.4 * fade);
    ctx.globalAlpha = fade;
    const gr = ctx.createLinearGradient(k.x, k.y, k.x, k.y - h);
    gr.addColorStop(0, "rgba(120,180,225,0.95)");
    gr.addColorStop(0.6, "rgba(200,236,255,0.95)");
    gr.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = gr;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(k.x - k.w / 2, k.y); ctx.lineTo(k.x + k.lean * h, k.y - h); ctx.lineTo(k.x + k.w / 2, k.y); ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = "rgba(240,250,255,0.9)";        // 튀는 얼음 조각
  for (let i = 0, n = nq(12); i < n; i++) {
    const a = i * 0.52, d = f.r * (0.2 + p * 1.2);
    ctx.globalAlpha = Math.max(0, 1 - p * 1.6);
    const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * SQ() - Math.sin(p * Math.PI) * 30;
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y + 2); ctx.lineTo(x - 3, y + 2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// 종말의 일격 — 검은 기운이 한 점으로 빨려 들었다가(0.25) 보랏빛 테두리의 거대한 X 자로 갈라지며 터진다
function drawDoom(ctx, f, p) {
  ctx.save();
  if (p < 0.25) {
    const q = p / 0.25;
    ctx.globalAlpha = 0.85;
    const rr = f.r * 1.4 * (1 - q) + 8;
    const gl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, rr);
    gl.addColorStop(0, "rgba(20,0,30,0.95)");
    gl.addColorStop(0.7, "rgba(90,30,130,0.6)");
    gl.addColorStop(1, "rgba(160,80,220,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, rr, rr * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(200,140,255,0.8)";   // 빨려 드는 줄기
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63, d0 = f.r * 1.5 * (1 - q) + 10, d1 = d0 * 0.6;
      ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * d0, f.y + Math.sin(a) * d0 * 0.8); ctx.lineTo(f.x + Math.cos(a) * d1, f.y + Math.sin(a) * d1 * 0.8); ctx.stroke();
    }
  } else {
    const q = (p - 0.25) / 0.75, fade = 1 - q, L = f.r * (1.2 + q * 0.6);
    // 공허 — 어두운 원이 퍼진다
    ctx.globalAlpha = fade * 0.7;
    const vg = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r * (0.6 + q));
    vg.addColorStop(0, "rgba(10,0,20,0.9)");
    vg.addColorStop(0.6, "rgba(70,20,110,0.5)");
    vg.addColorStop(1, "rgba(120,60,180,0)");
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.6 + q), f.r * (0.6 + q) * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    // X 자 베기 — 바깥 보라 빛 · 안쪽 검은 날 · 가운데 흰 금
    [[-0.75, 1], [0.75, -1]].forEach(([a], k) => {
      const ang = a + (f.dir < 0 ? Math.PI : 0), dx = Math.cos(ang) * L, dy = Math.sin(ang) * L * 0.7;
      const grow = Math.min(1, (q - k * 0.08) / 0.12);
      if (grow <= 0) return;
      const x0 = f.x - dx * grow, y0 = f.y - dy * grow, x1 = f.x + dx * grow, y1 = f.y + dy * grow;
      ctx.lineCap = "round";
      [["rgba(190,110,255,", 38, 0.55], ["rgba(40,0,60,", 20, 0.95], ["rgba(255,235,255,", 4.5, 0.95]].forEach(([c, w, al]) => {
        ctx.globalAlpha = fade;
        ctx.strokeStyle = `${c}${al})`;
        ctx.lineWidth = w * (1 - q * 0.5);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      });
    });
    // 충격 고리 · 깨진 조각
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(200,140,255,${fade})`;
    ctx.lineWidth = 3;
    const sw = f.r * (0.3 + q * 1.4);
    ctx.beginPath(); ctx.ellipse(f.x, f.y, sw, sw * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(220,170,255,${fade})`;
    for (let i = 0; i < 14; i++) {
      const a = i * 0.45, d = f.r * (0.2 + q * 1.5);
      const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * 0.7;
      ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 2.5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 2.5, y); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// 성광 반격 · 빛줄기 — 굵은 금빛 빛줄기, 하얀 심지, 옆으로 뻗는 빛살과 반짝이
function drawHolyBeam(ctx, f, p, time) {
  if (![f.x0, f.y0, f.x1, f.y1].every(Number.isFinite)) return;
  const grow = Math.min(1, p / 0.15), fade = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.5);
  const x1 = f.x0 + (f.x1 - f.x0) * grow, y1 = f.y0 + (f.y1 - f.y0) * grow;
  const W = (f.w || 30) * (1 + 0.15 * Math.sin(time * 30));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  [["255,190,80", 1.6, 0.35], ["255,220,130", 1, 0.6], ["255,248,220", 0.45, 0.9], ["255,255,255", 0.18, 1]].forEach(([c, wk, al]) => {
    ctx.strokeStyle = `rgba(${c},${al * fade})`;
    ctx.lineWidth = W * wk;
    ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(x1, y1); ctx.stroke();
  });
  const ang = Math.atan2(y1 - f.y0, x1 - f.x0), len = Math.hypot(x1 - f.x0, y1 - f.y0);
  ctx.strokeStyle = `rgba(255,236,170,${0.7 * fade})`;   // 옆으로 뻗는 빛살
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9, cx = f.x0 + Math.cos(ang) * len * u, cy = f.y0 + Math.sin(ang) * len * u;
    const s = (i % 2 ? 1 : -1) * W * (1 + 0.8 * Math.abs(Math.sin(time * 9 + i)));
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - Math.sin(ang) * s, cy + Math.cos(ang) * s); ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,240,${fade})`;
  for (let i = 0; i < 10; i++) {
    const u = ((i * 0.17 + p * 2) % 1), w = (i % 2 ? 1 : -1) * W * 0.7;
    star(ctx, f.x0 + Math.cos(ang) * len * u - Math.sin(ang) * w, f.y0 + Math.sin(ang) * len * u + Math.cos(ang) * w, 3.5);
  }
  ctx.restore();
}

// 빛의 결계 — 바닥 고리 둘이 돌고, 빛기둥이 솟고, 십자 룬이 둘레를 돈다(성광 반격 시작 · 신성한 결계)
function drawHalo(ctx, f, p, time) {
  const grow = Math.min(1, p / 0.2), fade = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4);
  const r = f.r * (0.6 + 0.4 * grow), c = f.rgb || "255,226,150";
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const col = ctx.createLinearGradient(f.x, f.y, f.x, f.y - 200);   // 빛기둥
  col.addColorStop(0, `rgba(${c},${0.55 * fade})`);
  col.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = col;
  ctx.fillRect(f.x - r * 0.55, f.y - 200 * grow, r * 1.1, 200 * grow);
  ctx.strokeStyle = `rgba(${c},${0.9 * fade})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * SQ(), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.setLineDash([10, 7]);
  ctx.lineDashOffset = -time * 40;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, r * 0.72, r * 0.72 * SQ(), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(255,250,230,${fade})`;    // 둘레를 도는 십자 룬
  for (let i = 0; i < 6; i++) {
    const a = time * 1.6 + (i / 6) * Math.PI * 2, x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r * SQ() - 6;
    ctx.fillRect(x - 1.5, y - 7, 3, 14); ctx.fillRect(x - 5, y - 3, 10, 3);
  }
  for (let i = 0, n = nq(12); i < n; i++) {       // 오르는 빛 알갱이
    const u = (i / n + p * 1.5) % 1, a = i * 2.39;
    ctx.globalAlpha = fade * Math.sin(u * Math.PI);
    ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * r * 0.8, f.y + Math.sin(a) * r * 0.8 * SQ() - u * 120, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 잿빛 폭발 — 달아오른 바닥, 퍼지는 불 충격파 두 겹, 잿가루와 불티가 솟는다
function drawAshBurst(ctx, f, p) {
  const fade = 1 - p;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r * 1.1);
  gl.addColorStop(0, `rgba(255,230,160,${0.9 * Math.max(0, 1 - p * 1.8)})`);
  gl.addColorStop(0.4, `rgba(255,120,40,${0.6 * fade})`);
  gl.addColorStop(1, "rgba(160,30,10,0)");
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 1.1, f.r * 1.1 * SQ(), 0, 0, Math.PI * 2); ctx.fill();
  [0, 0.18].forEach((d) => {
    const q = Math.max(0, p - d) / (1 - d);
    if (q <= 0) return;
    ctx.strokeStyle = `rgba(255,${160 - d * 300},60,${1 - q})`;
    ctx.lineWidth = 8 * (1 - q) + 1;
    const sw = f.r * (0.3 + q * 1.1);
    ctx.beginPath(); ctx.ellipse(f.x, f.y, sw, sw * SQ(), 0, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.fillStyle = `rgba(255,220,140,${fade})`;    // 불티
  for (let i = 0; i < 14; i++) {
    const a = i * 0.45, d = f.r * (0.15 + p * 1.1);
    ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * SQ() - p * 70 * (1 + (i % 3)), 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 16; i++) {                  // 잿가루 — 회색 조각이 흔들리며 오른다
    const a = i * 2.39, d = f.r * (0.2 + 0.7 * (((i * 37) % 100) / 100));
    ctx.fillStyle = `rgba(${90 + (i % 3) * 30},${85 + (i % 3) * 28},${80 + (i % 3) * 26},${0.85 * fade})`;
    const x = f.x + Math.cos(a) * d + Math.sin(p * 9 + i) * 6, y = f.y + Math.sin(a) * d * SQ() - p * (50 + (i % 4) * 25);
    ctx.fillRect(x, y, 3 + (i % 2), 2);
  }
  ctx.restore();
}

// 낙뢰 — 하늘에서 굵은 번개가 내리꽂히며 깜빡이고, 바닥이 번쩍이며 전기 불꽃이 사방으로 튄다
function drawThunder(ctx, f, p, time) {
  const flick = 0.6 + 0.4 * Math.abs(Math.sin(time * 60)), fade = Math.max(0, 1 - p * 1.3);
  const top = f.y - 460;
  const pts = [];                                 // 지그재그 줄기 — 자리로 정한 값이라 깜빡여도 모양은 같다
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, j = i === 0 || i === 10 ? 0 : (((Math.sin(f.x * 0.37 + i * 12.9) * 43758.5) % 1) - 0.5) * 60;
    pts.push([f.x + 30 * (1 - u) + j, top + (f.y - top) * u]);
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const path = (list) => { ctx.beginPath(); list.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
  [["120,160,255", 22, 0.4], ["180,210,255", 10, 0.75], ["255,255,255", 4, 1]].forEach(([c, w, al]) => {
    ctx.strokeStyle = `rgba(${c},${al * fade * flick})`;
    ctx.lineWidth = w;
    path(pts);
    ctx.lineWidth = w * 0.5;                      // 곁가지 둘
    path([pts[3], [pts[3][0] - 50, pts[3][1] + 60], [pts[3][0] - 70, pts[3][1] + 120]]);
    path([pts[6], [pts[6][0] + 45, pts[6][1] + 50], [pts[6][0] + 80, pts[6][1] + 85]]);
  });
  const gl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, 110);   // 바닥 번쩍
  gl.addColorStop(0, `rgba(240,248,255,${0.95 * fade})`);
  gl.addColorStop(0.4, `rgba(150,190,255,${0.5 * fade})`);
  gl.addColorStop(1, "rgba(80,120,255,0)");
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, 110, 110 * SQ(), 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(220,235,255,${fade})`;  // 사방으로 튀는 전기
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const a = i * 0.63 + time * 3, d0 = 14 + p * 40, d1 = d0 + 26;
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(a) * d0, f.y + Math.sin(a) * d0 * SQ());
    ctx.lineTo(f.x + Math.cos(a + 0.2) * (d0 + d1) / 2, f.y + Math.sin(a + 0.2) * ((d0 + d1) / 2) * SQ() - 6);
    ctx.lineTo(f.x + Math.cos(a) * d1, f.y + Math.sin(a) * d1 * SQ());
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(190,215,255,${fade})`;  // 충격 고리
  ctx.lineWidth = 3;
  const sw = 30 + p * 140;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, sw, sw * SQ(), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/* ── 연계 · 투사체 무기 스킬 연출 (암흑검 · 신성검 · 지팡이 넷 · 활 넷) ───────────── */
const TAU = Math.PI * 2;
const hashOf = (s) => { let h = 0; for (const ch of String(s || "")) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };
const glow = (ctx, x, y, r, inner, outer) => glowAt(ctx, x, y, r, inner, outer);
// 투사체 빛깔 — 겉 · 속 · 꼬리
const MISSILE = {
  zap: { a: "rgba(150,190,255,", b: "#f4f8ff", tail: 70, r: 15 },
  void: { a: "rgba(150,110,255,", b: "#efe6ff", tail: 60, r: 17 },
  lava: { a: "rgba(255,120,40,", b: "#fff0c8", tail: 90, r: 9, arrow: 1 },
  shadow: { a: "rgba(130,90,200,", b: "#e9dcff", tail: 90, r: 10, arrow: 1 },
  gold: { a: "rgba(255,206,90,", b: "#fffbe6", tail: 80, r: 9, arrow: 1 },
};
function drawMissile(ctx, f, p, time) {
  if (![f.x0, f.y0, f.x1, f.y1].every(Number.isFinite)) return;
  const M = MISSILE[f.style] || MISSILE.zap;
  const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p;
  const a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), dx = Math.cos(a), dy = Math.sin(a);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const tl = ctx.createLinearGradient(x, y, x - dx * M.tail, y - dy * M.tail);   // 꼬리
  tl.addColorStop(0, `${M.a}0.85)`); tl.addColorStop(1, `${M.a}0)`);
  ctx.strokeStyle = tl; ctx.lineCap = "round";
  ctx.lineWidth = M.r * (M.arrow ? 0.9 : 1.3);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx * M.tail, y - dy * M.tail); ctx.stroke();
  glow(ctx, x, y, M.r * 2.4, `${M.a}0.7)`, `${M.a}0)`);
  if (M.arrow) {                                  // 화살촉
    ctx.fillStyle = M.b;
    ctx.beginPath();
    ctx.moveTo(x + dx * 12, y + dy * 12);
    ctx.lineTo(x - dy * 5, y + dx * 5); ctx.lineTo(x + dy * 5, y - dx * 5);
    ctx.closePath(); ctx.fill();
    if (f.style === "shadow") {                   // 그림자 잔상
      for (let i = 1; i <= 3; i++) glow(ctx, x - dx * i * 22, y - dy * i * 22 + Math.sin(time * 20 + i) * 3, 7, "rgba(170,130,240,0.35)", "rgba(80,40,140,0)");
    }
  } else {
    glow(ctx, x, y, M.r, M.b, `${M.a}0.2)`);
    if (f.style === "zap") {                      // 구체 둘레 전류
      ctx.strokeStyle = "rgba(230,240,255,0.9)"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const b = time * 18 + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(b) * 8, y + Math.sin(b) * 8);
        ctx.lineTo(x + Math.cos(b + 0.6) * 20, y + Math.sin(b + 0.6) * 16);
        ctx.lineTo(x + Math.cos(b + 0.2) * 26, y + Math.sin(b + 0.2) * 22);
        ctx.stroke();
      }
    } else {                                      // 은하 — 둘레를 도는 별가루
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 5; i++) { const b = time * 6 + i * 1.26; ctx.globalAlpha = 0.7; star(ctx, x + Math.cos(b) * 20, y + Math.sin(b) * 12, 2.2); }
    }
  }
  ctx.restore();
}
// 그림자 · 신성 베기 — 초승달 한 줄기. dir -1 이면 반대로 긋는다
function drawCutArc(ctx, f, p) {
  const holy = f.tone === "holy";
  const grow = Math.min(1, p / 0.3), fade = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.5);
  const R = f.r * 0.75, span = 2.3 * grow, dir = f.dir || 1;
  ctx.save();
  ctx.translate(f.x, f.y); ctx.rotate(f.a || 0); ctx.scale(1, 0.6);
  const a0 = -dir * 1.15;
  const arc = (w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, R, a0, a0 + dir * span, dir < 0); ctx.stroke(); };
  ctx.lineCap = "round";
  if (!holy) { ctx.globalAlpha = 0.85 * fade; arc(30, "rgba(40,10,60,0.75)"); }   // 검은 연기 바깥
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fade;
  arc(16, holy ? "rgba(255,214,120,0.75)" : "rgba(150,70,210,0.8)");
  arc(5, holy ? "rgba(255,250,225,0.95)" : "rgba(235,200,255,0.95)");
  ctx.restore();
}
// 내려치기 — 땅이 갈라지며 둥근 충격파(암흑은 보랏빛 연기 · 신성은 금빛)
function drawSlam(ctx, f, p) {
  const holy = f.tone === "holy", fade = Math.max(0, 1 - p);
  ctx.save();
  ctx.translate(f.x, f.y); ctx.scale(1, SQ());
  ctx.globalAlpha = fade;
  ctx.strokeStyle = holy ? "rgba(255,232,160,0.9)" : "rgba(190,120,255,0.9)";
  ctx.lineWidth = 6 * fade + 1;
  ctx.beginPath(); ctx.arc(0, 0, f.r * (0.4 + 0.8 * p), 0, TAU); ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {                   // 갈라진 금
    const a = i * 0.785 + 0.3, l = f.r * (0.5 + 0.5 * Math.min(1, p * 3));
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
    ctx.lineTo(Math.cos(a + 0.12) * l * 0.6, Math.sin(a + 0.12) * l * 0.6); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
  }
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 0, 0, f.r * 0.8, holy ? "rgba(255,240,190,0.55)" : "rgba(150,70,220,0.5)", "rgba(0,0,0,0)");
  ctx.restore();
}
// 번개 지팡이 마법진 — 겨눈 쪽에 선 원 두 겹 · 문양 · 모이는 빛
function drawCharge(ctx, f, p, time) {
  const grow = Math.min(1, p / 0.4), fade = p < 0.75 ? 1 : Math.max(0, 1 - (p - 0.75) / 0.25);
  ctx.save();
  ctx.translate(f.x, f.y); ctx.rotate(f.a || 0); ctx.scale(0.35, 1);   // 겨눈 쪽을 보고 선 원
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fade;
  ctx.strokeStyle = "rgba(170,205,255,0.95)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 36 * grow, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, 26 * grow, 0, TAU); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = time * 4 + (i / 6) * TAU;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 26 * grow, Math.sin(a) * 26 * grow);
    ctx.lineTo(Math.cos(a + 2.1) * 26 * grow, Math.sin(a + 2.1) * 26 * grow); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade;
  glow(ctx, f.x, f.y, 10 + 18 * grow, "rgba(240,248,255,0.95)", "rgba(120,160,255,0)");
  ctx.restore();
}
// 전류 폭발 — 번쩍 · 둘레로 뻗는 번개 가지
function drawZapBoom(ctx, f, p, time) {
  const fade = Math.max(0, 1 - p * 1.4);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fade;
  glow(ctx, f.x, f.y, f.r * (0.5 + 0.6 * p), "rgba(230,240,255,0.9)", "rgba(110,150,255,0)");
  ctx.strokeStyle = "rgba(220,235,255,0.95)"; ctx.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + f.x * 0.01, L = f.r * (0.6 + 0.4 * Math.sin(i * 7.1));
    ctx.beginPath(); ctx.moveTo(f.x, f.y);
    for (let k = 1; k <= 4; k++) {
      const u = k / 4, j = Math.sin(time * 50 + i * 3 + k) * 10;
      ctx.lineTo(f.x + Math.cos(a) * L * u - Math.sin(a) * j, f.y + (Math.sin(a) * L * u + Math.cos(a) * j) * SQ());
    }
    ctx.stroke();
  }
  ctx.restore();
}
// 균열 — 땅 위 보랏빛 틈. 마지막 0.6초는 폭발 예고(붉은 고리가 조여 든다)
function drawRift(ctx, f, p, time) {
  const left = f.t, warn = left < 0.6 ? 1 - left / 0.6 : 0;
  ctx.save();
  ctx.translate(f.x, f.y); ctx.scale(1, SQ());
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 0, 0, 38, "rgba(170,120,255,0.55)", "rgba(60,20,120,0)");
  ctx.strokeStyle = "rgba(225,205,255,0.9)"; ctx.lineWidth = 3;
  ctx.beginPath();                                // 틈 — 지그재그
  for (let i = 0; i <= 6; i++) { const u = i / 6 - 0.5; ctx.lineTo(u * 60, (i % 2 ? 6 : -6) + Math.sin(time * 8 + i) * 2); }
  ctx.stroke();
  ctx.lineWidth = 1.2; ctx.setLineDash([6, 6]);   // 자리 — 폭발 둘레
  ctx.strokeStyle = warn ? `rgba(255,150,170,${0.4 + 0.6 * warn})` : "rgba(200,180,255,0.45)";
  ctx.beginPath(); ctx.arc(0, 0, f.r, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  if (warn) { ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, f.r * (1 - warn * 0.85), 0, TAU); ctx.stroke(); }
  ctx.restore();
}
// 중력 속박 — 몸 둘레를 조이며 도는 보랏빛 고리
function drawBind(ctx, f, p, time) {
  const fade = p < 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15);
  ctx.save();
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade;
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${170 + i * 20},${130 + i * 20},255,0.75)`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(f.x, f.y - 20 - i * 16, f.r * (0.9 - i * 0.15), f.r * 0.32, time * (2 + i), 0, Math.PI * 1.5); ctx.stroke();
  }
  glow(ctx, f.x, f.y - 30, f.r, "rgba(140,90,255,0.25)", "rgba(40,10,90,0)");
  ctx.restore();
}
// 잔화 — 땅에 남은 작은 불씨 자리
function drawEmber(ctx, f, p, time) {
  const fade = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
  ctx.save();
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.8 * fade;
  ctx.translate(f.x, f.y); ctx.scale(1, SQ());
  glow(ctx, 0, 0, f.r, "rgba(255,150,60,0.55)", "rgba(160,40,10,0)");
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade;
  for (let i = 0; i < 5; i++) {                   // 날름거리는 불꽃
    const k = (time * 1.6 + i * 0.37) % 1, x = f.x + Math.sin(i * 2.3) * f.r * 0.6, y = f.y + Math.cos(i * 1.7) * f.r * 0.25 - k * 30;
    glow(ctx, x, y, 7 * (1 - k) + 2, "rgba(255,230,160,0.9)", "rgba(255,100,30,0)");
  }
  ctx.restore();
}
// 화염방사 — 지팡이 끝에서 부채꼴로 뿜는 불길(시전한 사람을 따라간다)
function drawFlamer(ctx, f, p, time, g) {
  const h = g && g.heroes ? g.heroes[f.src] : null;
  const ox = h ? h.x : f.x, oy = (h ? h.y : f.y) - 36;
  const a = Math.atan2(f.ay * SQ(), f.ax), fade = p > 0.9 ? (1 - p) / 0.1 : Math.min(1, p / 0.06);
  ctx.save();
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade;
  for (let i = 0, n = nq(26); i < n; i++) {       // 불덩이가 흘러간다 — 멀수록 크고 옅다
    const k = (time * 2.6 + i / n) % 1, spread = (Math.sin(i * 12.9898) * 0.5) * 2 * f.half * k;
    const d = f.len * k, x = ox + Math.cos(a + spread) * d, y = oy + Math.sin(a + spread) * d * 0.8;
    const r = 8 + 26 * k;
    glow(ctx, x, y, r, k < 0.3 ? "rgba(255,245,200,0.9)" : "rgba(255,150,50,0.7)", "rgba(200,40,10,0)");
  }
  ctx.restore();
}
// 관통 화살 — 한 줄로 꿰뚫는 빛(별자리 · 용암)
function drawPierce(ctx, f, p, time) {
  if (![f.x0, f.y0, f.x1, f.y1].every(Number.isFinite)) return;
  const star = f.tone === "star";
  const grow = Math.min(1, p / 0.12), fade = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.65);
  const x1 = f.x0 + (f.x1 - f.x0) * grow, y1 = f.y0 + (f.y1 - f.y0) * grow;
  ctx.save();
  ctx.globalAlpha = fade; ctx.lineCap = "round";
  const line = (w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(x1, y1); ctx.stroke(); };
  // 밝은 풀밭 · 숫자 위에서도 보이게 — 더하기 빛 아래에 어두운 테를 먼저 깐다(좌우로 쏘면 줄이 숫자 · 몸과 겹쳐 묻혔다)
  if (star) line((f.w || 24) * 1.5, "rgba(30,36,90,0.32)");
  ctx.globalCompositeOperation = "lighter";
  line((f.w || 24) * (1 + 0.1 * Math.sin(time * 40)), star ? "rgba(120,150,255,0.45)" : "rgba(255,90,30,0.5)");
  line((f.w || 24) * 0.35, star ? "rgba(225,235,255,0.95)" : "rgba(255,220,150,0.95)");
  if (star) {                                     // 줄을 따라 별자리 점과 선 — 줄에 수직으로 흩어 어느 쪽으로 쏴도 별자리 모양이 같다
    const a = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), nx = -Math.sin(a), ny = Math.cos(a);
    const pts = [];
    for (let i = 1; i <= 6; i++) {
      const u = (i / 7) * grow, j = Math.sin(i * 4.1) * 26;
      pts.push([f.x0 + (f.x1 - f.x0) * u + nx * j, f.y0 + (f.y1 - f.y0) * u + ny * j]);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(225,232,255,0.85)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(f.x0, f.y0); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    pts.forEach(([x, y]) => glow(ctx, x, y, 14, "rgba(220,230,255,0.85)", "rgba(140,110,255,0)"));
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#ffffff";
    pts.forEach(([x, y]) => star4(ctx, x, y, 6));
  } else {
    for (let i = 0; i < 8; i++) {                 // 용암 불똥
      const u = ((i * 0.13 + p * 1.5) % 1) * grow;
      glow(ctx, f.x0 + (f.x1 - f.x0) * u, f.y0 + (f.y1 - f.y0) * u - 10 * Math.sin(i), 6, "rgba(255,220,140,0.9)", "rgba(255,80,20,0)");
    }
  }
  ctx.restore();
}
function star4(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.3, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.3, y); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y + r * 0.3); ctx.lineTo(x + r, y); ctx.lineTo(x, y - r * 0.3); ctx.closePath(); ctx.fill(); }
// 황금 날개 도약 — 금빛 깃털이 흩날린다
function drawWingDash(ctx, f, p) {
  const fade = Math.max(0, 1 - p), n = f.big ? 14 : 8;
  ctx.save();
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade;
  for (let i = 0; i < n; i++) {
    const a = (f.a || 0) + Math.PI + (i / n - 0.5) * 2.4, d = 20 + 60 * p + (i % 3) * 8;
    const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * 0.7 + p * 20;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + p * 3);
    ctx.fillStyle = i % 2 ? "rgba(255,226,140,0.9)" : "rgba(255,250,220,0.9)";
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 3, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (f.big) glow(ctx, f.x, f.y, 70 * (0.5 + p), "rgba(255,230,150,0.35)", "rgba(255,200,80,0)");
  ctx.restore();
}

/* 영웅 둘레 — 연계 중인 무기 · 쌓인 패시브 · 결투 군중 제어 */
function drawComboHero(ctx, h, time) {
  const w = h.ws, sp = heldSpecial(h), c = w && w.cmb;
  const cx = h.x, cy = h.y - 40;
  if (c && sp === "shadow") {                     // 그림자가 칼을 휘감는다 — 손에서 칼끝까지 검은 연기 띠 두 줄이 감겨 오른다
    const d = h.dir || 1, hx = h.x + d * 20, y0 = h.y - 18, y1 = h.y - 92;
    ctx.save();
    ctx.globalAlpha = 0.55;
    glow(ctx, hx, (y0 + y1) / 2, 46, "rgba(40,0,60,0.75)", "rgba(20,0,30,0)");   // 칼을 덮는 어둠
    for (let s2 = 0; s2 < 2; s2++) {
      for (let i = 0, n = nq(14); i < n; i++) {
        const u = i / Math.max(1, n - 1), a = time * 7 + u * 9 + s2 * Math.PI;
        const x = hx + Math.cos(a) * (10 + 6 * u), y = y0 + (y1 - y0) * u + Math.sin(a) * 4;
        ctx.globalAlpha = 0.85 * (1 - u * 0.5);
        glow(ctx, x, y, 11 - u * 4, "rgba(30,0,45,0.95)", "rgba(30,0,45,0)");
      }
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(190,110,255,0.8)"; ctx.lineWidth = 2;   // 보랏빛 실선 — 연기 사이로 비친다
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, a = time * 7 + u * 9;
      ctx.lineTo(hx + Math.cos(a) * (10 + 6 * u), y0 + (y1 - y0) * u + Math.sin(a) * 4);
    }
    ctx.stroke();
    for (let i = 0; i < 6; i++) {                 // 위로 흩어지는 그림자 조각
      const k = (time * 1.4 + i / 6) % 1;
      ctx.globalAlpha = 0.6 * (1 - k);
      glow(ctx, hx + Math.sin(i * 3.1 + time) * 14, y1 - k * 30, 6, "rgba(170,90,240,0.8)", "rgba(60,10,90,0)");
    }
    ctx.restore();
    if (c.st === 3) {                             // 마무리 타이밍 고리 — 조여 들다 금빛 칸에서 누른다
      const S = WEAPON_SKILLS.shadow.skill, u = Math.min(1, c.el / S.finGap);
      const ok = c.el >= S.perfect[0] && c.el <= S.perfect[1];
      ctx.save();
      ctx.translate(h.x, h.y - 4); ctx.scale(1, SQ());
      ctx.strokeStyle = "rgba(255,230,160,0.55)"; ctx.lineWidth = 2;
      const rIn = 70 * (1 - S.perfect[1] / S.finGap) + 14, rOut = 70 * (1 - S.perfect[0] / S.finGap) + 14;
      ctx.beginPath(); ctx.arc(0, 0, (rIn + rOut) / 2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = ok ? "rgba(255,226,120,1)" : "rgba(210,160,255,0.85)"; ctx.lineWidth = ok ? 4 : 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 70 * (1 - u) + 14, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }
  if (c && sp === "holy") {                       // 천사의 날개 — 반격 자세에서 등 뒤로 펼쳐지고, 반격 뒤에는 더 밝다
    const open = c.st === 1 ? Math.min(1, (c.el || 0) / 0.15) : 1, bright = c.st === 1 ? 0.8 : 1;
    const flap = Math.sin(time * 5) * 0.06;
    ctx.save();
    [-1, 1].forEach((s2) => {
      for (let i = 5; i >= 0; i--) {              // 깃털 여섯 장 — 바깥 것부터 그려 안쪽이 위에 온다
        const L = (34 + i * 13) * open, a = -0.25 - i * 0.22 + flap;
        ctx.save(); ctx.translate(cx + s2 * 8, cy - 10); ctx.scale(s2, 1); ctx.rotate(a);
        ctx.globalAlpha = 0.92 * bright;
        const gl = ctx.createLinearGradient(0, 0, L, 0);
        gl.addColorStop(0, "rgba(255,252,238,1)"); gl.addColorStop(0.7, "rgba(255,240,200,0.95)"); gl.addColorStop(1, "rgba(255,214,130,0.6)");
        ctx.fillStyle = gl;
        ctx.strokeStyle = "rgba(214,170,90,0.85)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(L / 2, 0, L / 2, 7 - i * 0.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    });
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, cx, cy - 10, 60, `rgba(255,236,180,${0.3 * bright})`, "rgba(255,220,140,0)");
    ctx.restore();
  }
  if (c && sp === "star_bow" && c.st === 1) {     // 조준 자세 — 앞으로 뻗는 조준선 · 차오르는 고리
    // 조준선은 쏠 쪽(aimDir — 누르는 방향, 없으면 마지막으로 걸은 쪽)을 따른다. 판정(rpg.js starShot 의 faceDir)과 같은 셈
    const S = WEAPON_SKILLS.star_bow.skill, u = Math.min(1, (c.el || 0) / S.full);
    const [ax, ay] = aimDir(h), len = 120 + 260 * u;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(200,215,255,${0.35 + 0.5 * u})`; ctx.lineWidth = 1 + 2 * u; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(h.x + ax * 20, h.y - 34 + ay * 20); ctx.lineTo(h.x + ax * len, h.y - 34 + ay * len); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = u >= 1 ? "rgba(255,240,170,0.95)" : "rgba(210,225,255,0.85)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy - 34, 12, -Math.PI / 2, -Math.PI / 2 + TAU * u); ctx.stroke();
    ctx.restore();
  }
  if (w) {                                        // 쌓인 것 — 머리 위 작은 점
    const n = sp === "thunder_staff" ? w.zap : sp === "lava_bow" ? w.mark : sp === "star_bow" ? w.aim : 0;
    const col = sp === "thunder_staff" ? "#cfe0ff" : sp === "lava_bow" ? "#ffae6a" : "#e6ecff";
    for (let i = 0; i < (n || 0); i++) {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 6 + i);
      star(ctx, cx - (n - 1) * 6 + i * 12, cy - 44, 3.2);
    }
    ctx.globalAlpha = 1;
  }
}
// 걸린 것(경직 · 띄움 · 속박 · 낙인) — 몹과 결투 상대가 같다
export function drawCcMark(ctx, o, time) {
  const q = o.cc || o;
  const stun = q.stun > 0, air = q.air > 0, bind = o.cc ? q.root > 0 : o.bind > 0, brand = q.brand > 0;
  const top = o.cc ? o.y - 96 : o.y - 20 - (o.rad || 20) * 1.4;
  ctx.save();
  if (o.cc && stun) {                             // 결투 경직 — 머리 위 별
    ctx.fillStyle = "#ffe9a8";
    for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; star(ctx, o.x + Math.cos(a) * 14, top + Math.sin(a) * 4, 3); }
  }
  if (air) {                                      // 띄움 — 땅에 남은 그림자
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(o.x, o.y, 18, 7, 0, 0, TAU); ctx.fill();
  }
  if (bind) drawBind(ctx, { x: o.x, y: o.y, r: 40 }, 0.5, time);
  if (brand) {                                    // 파괴의 낙인 — 머리 위 보랏빛 문양
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(210,140,255,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(o.x, top - 10, 9, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.x - 6, top - 16); ctx.lineTo(o.x + 6, top - 4); ctx.moveTo(o.x + 6, top - 16); ctx.lineTo(o.x - 6, top - 4); ctx.stroke();
  }
  ctx.restore();
}
// 띄운 높이 — 띄움에 걸리면 위로 떠올랐다 내려온다(그리는 동안만 쓰는 값)
export function liftOf(o, dt) {
  const air = o.cc ? o.cc.air > 0 : o.air > 0;
  o.liftV = (o.liftV || 0) + ((air ? 46 : 0) - (o.liftV || 0)) * Math.min(1, dt * 12);
  return o.liftV < 0.5 ? 0 : o.liftV;
}

/* ── 200~400레벨 몹 기술(rpg.js FAR_SKILL) ─────────────────────────────
   sk_mcharge 준비하는 몸의 빛 · sk_mwarn 떨어질 자리 표시 · sk_mshot 날아가는 것(뼈 · 토사물 · 거미줄)
   sk_mweb 바닥의 거미줄 · sk_mcurse 저주 문양 · sk_mquake 땅 가르기 · sk_mbreath 불꽃 숨결.
   quake · breath 는 ph 0 이 준비 표시, ph 1 이 실제 공격이다. 방향 ax · ay 는 땅 위 값이라 그릴 때 위아래를 눌러 준다 */
const rgba = (hex, a) => {
  const n = parseInt((hex || "#ffffff").slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const fadeOut = (p, from) => (p < from ? 1 : Math.max(0, 1 - (p - from) / (1 - from)));
// 땅 위 좌표계 — (x, y) 에서 위아래를 누르고 ax · ay 쪽을 오른쪽으로
function groundAt(ctx, f) {
  ctx.translate(f.x, f.y); ctx.scale(1, SQ());
  if (f.ax !== undefined) ctx.rotate(Math.atan2(f.ay || 0, f.ax || 1));
}
function drawMCharge(ctx, f, p, time) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 22);
  glowAt(ctx, f.x, f.y, f.r * (0.5 + 0.7 * p), rgba(f.color, 0.7), rgba(f.color, 0));
  ctx.restore();
}
function drawMWarn(ctx, f, p) {
  ctx.save();
  groundAt(ctx, f);
  ctx.strokeStyle = rgba(f.color, 0.75); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = rgba(f.color, 0.22);
  ctx.beginPath(); ctx.arc(0, 0, f.r * p, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
const SHOT_LIFT = { bone: 60, bile: 120, web: 12 };
function drawMShot(ctx, f, p, time) {
  const x = f.x + (f.x1 - f.x) * p, y = f.y + (f.y1 - f.y) * p - Math.sin(p * Math.PI) * (SHOT_LIFT[f.style] || 0);
  ctx.save();
  ctx.translate(x, y); ctx.scale(1.4, 1.4);
  if (f.style === "bone") {                       // 빙글 도는 뼈
    ctx.rotate(time * 14);
    ctx.strokeStyle = "#efe4cc"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
    ctx.fillStyle = "#f6eedb";
    [-1, 1].forEach((k) => {
      ctx.beginPath(); ctx.arc(k * 10, -3, 3.4, 0, Math.PI * 2); ctx.arc(k * 10, 3, 3.4, 0, Math.PI * 2); ctx.fill();
    });
  } else if (f.style === "bile") {                // 출렁이는 토사물 덩이와 떨어지는 방울
    ctx.fillStyle = "rgba(150,190,90,0.95)";
    ctx.beginPath(); ctx.ellipse(0, 0, 11 + Math.sin(time * 18) * 1.5, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(200,225,140,0.9)";
    ctx.beginPath(); ctx.arc(-3, -3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(120,160,70,0.7)";
    for (let i = 0; i < nq(3); i++) {
      const k = (time * 2.4 + i * 0.33) % 1;
      ctx.beginPath(); ctx.arc(Math.sin(i * 2.1) * 6, 8 + k * 18, 2.4 * (1 - k) + 0.6, 0, Math.PI * 2); ctx.fill();
    }
  } else {                                        // 거미줄 — 뭉친 실과 뻗은 가닥
    ctx.rotate(time * 6);
    ctx.strokeStyle = "rgba(240,242,246,0.9)"; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(250,250,252,0.95)";
    ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawMWeb(ctx, f, p) {
  const grow = Math.min(1, p / 0.12), R = f.r * (0.7 + 0.3 * grow);
  ctx.save();
  ctx.globalAlpha = fadeOut(p, 0.7) * 0.85;
  groundAt(ctx, f);
  ctx.strokeStyle = "rgba(236,238,242,0.9)"; ctx.lineWidth = 1;
  const N = 8;
  for (let i = 0; i < N; i++) {                   // 바퀴살
    const a = (i / N) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
  }
  [0.35, 0.65, 0.95].forEach((k) => {             // 둘레 실 — 살 사이가 안으로 살짝 처진다
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, b = ((i + 0.5) / N) * Math.PI * 2, r = R * k;
      if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.quadraticCurveTo(Math.cos(b - Math.PI / N) * r * 0.86, Math.sin(b - Math.PI / N) * r * 0.86, Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
  });
  ctx.restore();
}
function drawMCurse(ctx, f, p, time) {
  ctx.save();
  groundAt(ctx, f);
  ctx.rotate(time * 1.4);
  ctx.strokeStyle = "rgba(196,154,232,0.85)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, f.r * 0.8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();                                // 다섯 끝 별
  for (let i = 0; i <= 5; i++) {
    const a = (i * 2 * (Math.PI * 2)) / 5 - Math.PI / 2;
    const x = Math.cos(a) * f.r * 0.78, y = Math.sin(a) * f.r * 0.78;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = `rgba(120,70,170,${0.12 + 0.28 * p})`;   // 터질 때가 가까울수록 짙어진다
  ctx.beginPath(); ctx.arc(0, 0, f.r * (1 - 0.25 * Math.sin(p * Math.PI * 6) * (1 - p)), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawMQuake(ctx, f, p, time) {
  ctx.save();
  groundAt(ctx, f);
  const L = f.len, W = f.w;
  if (!f.ph) {                                    // 준비 — 갈라질 줄이 앞으로 차오른다
    ctx.strokeStyle = "rgba(214,160,104,0.75)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(0, -W / 2, L, W);
    ctx.fillStyle = "rgba(196,130,80,0.24)";
    ctx.fillRect(0, -W / 2, L * p, W);
  } else {                                        // 갈라진 땅 — 들쭉날쭉한 금과 튀는 돌
    const fade = fadeOut(p, 0.4), seed = f.len % 7;
    ctx.globalAlpha = fade;
    ctx.fillStyle = "rgba(170,110,70,0.3)";
    ctx.fillRect(0, -W / 2, L, W);
    ctx.strokeStyle = "rgba(70,44,30,0.9)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(0, 0);
    const N = 14;
    for (let i = 1; i <= N; i++) {
      const x = (L * i) / N, y = Math.sin(i * 2.7 + seed) * W * 0.22;
      ctx.lineTo(x, y);
      if (i % 3 === 0) { ctx.moveTo(x, y); ctx.lineTo(x + 14, y + (i % 2 ? 1 : -1) * W * 0.35); ctx.moveTo(x, y); }
    }
    ctx.stroke();
    ctx.fillStyle = "#a88a6a";
    for (let i = 0; i < nq(10); i++) {
      const x = ((i + 0.5) / 10) * L, up = Math.sin(Math.min(1, p * 1.6) * Math.PI) * (16 + (i % 3) * 10);
      ctx.beginPath(); ctx.arc(x, Math.sin(i * 1.9) * W * 0.3 - up, 3 + (i % 2) * 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
function drawMBreath(ctx, f, p, time) {
  ctx.save();
  groundAt(ctx, f);
  const L = f.len, A = f.arc || 0.5;
  if (!f.ph) {                                    // 준비 — 탈 부채꼴이 차오른다
    ctx.strokeStyle = "rgba(240,160,100,0.75)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, L, -A, A); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "rgba(240,130,80,0.22)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, L * p, -A, A); ctx.closePath(); ctx.fill();
  } else {                                        // 불길 — 입에서 앞으로 퍼져 나간다
    const fade = fadeOut(p, 0.35);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade;
    const N = nq(22);
    for (let i = 0; i < N; i++) {
      const k = ((i * 0.618) % 1), a = (((i * 0.37) % 1) * 2 - 1) * A * 0.9;
      const r = L * Math.min(1, k * 0.6 + p * 1.2) , s = 10 + k * 22;
      glowAt(ctx, Math.cos(a) * r, Math.sin(a) * r, s, "rgba(255,210,130,0.8)", "rgba(220,70,30,0)", [0.5, "rgba(250,130,60,0.45)"]);
    }
  }
  ctx.restore();
}
const MOB_FX = { sk_mcharge: drawMCharge, sk_mwarn: drawMWarn, sk_mshot: drawMShot, sk_mweb: drawMWeb,
  sk_mcurse: drawMCurse, sk_mquake: drawMQuake, sk_mbreath: drawMBreath };
