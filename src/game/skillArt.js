/* ── 직업 스킬 · 전설 무기 스킬 그리기 ─────────────────────────────
   drawSkillFx — 이 파일이 맡은 연출(kind 가 "sk_" 로 시작): 빙판길 · 얼음 가시 · 불꽃 회오리 · 화염베기 · 유성(별 · 은하) · 종말의 일격 · 성광 빛줄기 · 빛의 결계 · 잿빛 폭발 · 낙뢰.
   drawHeroSkill — 영웅 둘레에 늘 붙는 것: 화염검 불똥 · 암흑검 분노 · 신성검 수호 에너지 · 성광 반격 · 철벽 · 마나 보호막.
   상태는 스냅샷 줄 46(h.ws · h.jb)으로 손님에게도 온다. */
import { WEAPON_SKILLS } from "./skillData.js";
import { heldSpecial, RPG } from "./rpg.js";

const SQ = () => RPG.squash;

export function drawSkillFx(ctx, f, time) {
  if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) return;
  const p = 1 - f.t / f.life;                     // 0 → 1
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
}

/* 화염베기 — 커다란 불꽃 초승달. 앞 35% 동안 휘어 나가며 그어지고(머리가 가장 굵다), 뒤로 가늘어지며 사라진다.
   겉은 붉은 불, 가운데는 주황, 안쪽 심지는 노란 흰빛. 바깥 가장자리에 불길이 일렁인다 */
function drawFireSlash(ctx, f, p, time) {
  const grow = Math.min(1, p / (f.grow || 0.3)), fade = p < 0.45 ? 1 : Math.max(0, 1 - (p - 0.45) / 0.55);
  const span = f.span * grow, R = f.r, dir = f.dir || 1, N = 48;
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
  // 빛깔은 기획 그림(화염 회오리)에서 뽑았다 — 몸은 짙은 적갈색, 붉은 주황 결, 밝은 주황 · 노란 줄은 가늘게만
  const passes = [[FIRE_COL.dark, 1, 0.8, 0], [FIRE_COL.brown, 0.8, 0.85, 0], [FIRE_COL.red, 0.52, 0.85, 0], [FIRE_COL.orange, 0.24, 0.55, 1], [FIRE_COL.yellow, 0.08, 0.7, 1]];
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
  ctx.strokeStyle = `rgba(${FIRE_COL.white},${0.4 * fade})`;
  ctx.lineWidth = Math.max(1, W * 0.04);
  ctx.beginPath();
  ctx.arc(0, 0, R + W * 0.32, Math.min(arcAt(0.15), arcAt(1)), Math.max(arcAt(0.15), arcAt(1)));
  ctx.stroke();
  // 불길 — 초승달을 따라 안팎으로 일렁이는 불꽃 덩어리
  for (let i = 0; i < 22; i++) {
    const t = (i + 0.5) / 22;
    if (t > grow) break;
    const a = arcAt(t);
    const flick = 0.55 + 0.45 * Math.sin(time * 22 + i * 2.3 + f.a0);
    const side = i % 2 ? 1 : -0.6;
    const d = R + side * W * (0.35 + 0.35 * flick) * taperOf(t);
    const x = Math.cos(a) * d, y = Math.sin(a) * d, r = W * 0.42 * flick * taperOf(t) * fade;
    if (r <= 0.8) continue;
    const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
    gl.addColorStop(0, `rgba(${FIRE_COL.red},${0.6 * fade})`);
    gl.addColorStop(0.6, `rgba(${FIRE_COL.brown},${0.45 * fade})`);
    gl.addColorStop(1, `rgba(${FIRE_COL.dark},0)`);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// 화염 빛깔 — 기획 그림에서 밝기별로 뽑은 값(어두운 쪽이 대부분)
const FIRE_COL = { dark: "84,22,17", brown: "132,53,32", red: "209,82,37", orange: "246,134,59", yellow: "250,201,115", white: "251,243,194" };

// 베인 자리 — 가운데서 불길이 터지고 불티가 흩어진다
function drawBlaze(ctx, f, p) {
  const fade = 1 - p;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r * (0.6 + p * 0.5));
  gl.addColorStop(0, `rgba(${FIRE_COL.yellow},${0.6 * fade})`);
  gl.addColorStop(0.35, `rgba(${FIRE_COL.red},${0.5 * fade})`);
  gl.addColorStop(1, `rgba(${FIRE_COL.dark},0)`);
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.6 + p * 0.5), f.r * (0.6 + p * 0.5) * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 9; i++) {                   // 불길 덩어리 — 밖으로 퍼지며 위로 오른다
    const a = i * 0.7 + f.x * 0.01, d = f.r * (0.2 + p * 0.9) * (0.6 + (i % 3) * 0.2);
    const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * 0.6 - p * 26, r = f.r * 0.22 * fade;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, `rgba(${FIRE_COL.red},${0.75 * fade})`);
    g2.addColorStop(1, `rgba(${FIRE_COL.dark},0)`);
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(${FIRE_COL.orange},${fade})`;
  for (let i = 0; i < 8; i++) {                   // 불티
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
  if (w && w.ctr > 0) bubble(ctx, cx, cy, 50, "rgba(255,226,150,", time);              // 성광 반격 — 금빛 막
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
  if (w && sp === "shadow" && w.rage > 0) {       // 분노 — 발밑에서 검붉은 기운이 오른다
    const k = Math.min(1, w.rage / WEAPON_SKILLS.shadow.passive.max);
    ctx.globalAlpha = 0.25 + 0.45 * k;
    const gl = ctx.createRadialGradient(h.x, h.y - 20, 4, h.x, h.y - 20, 34 + 20 * k);
    gl.addColorStop(0, "rgba(150,40,70,0.7)");
    gl.addColorStop(1, "rgba(60,10,40,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - 20, 34 + 20 * k, 46 + 20 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (w && sp === "holy" && w.holy >= 100) {      // 수호 에너지가 가득 — 금빛 고리가 돈다
    ctx.strokeStyle = "rgba(255,228,150,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - 2, 26, 26 * SQ(), time * 2, 0, Math.PI * 1.6); ctx.stroke();
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
  for (let i = 0; i < 22; i++) {
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
  for (let i = 0; i < 12; i++) {
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
  for (let i = 0; i < 12; i++) {                  // 오르는 빛 알갱이
    const u = (i / 12 + p * 1.5) % 1, a = i * 2.39;
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
