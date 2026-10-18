/* ── 직업 스킬 · 전설 무기 스킬 그리기 ─────────────────────────────
   drawSkillFx — 이 파일이 맡은 연출(kind 가 "sk_" 로 시작): 빙판길 · 불꽃 회오리 · 유성 낙하.
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
}

/* 화염베기 — 커다란 불꽃 초승달. 앞 35% 동안 휘어 나가며 그어지고(머리가 가장 굵다), 뒤로 가늘어지며 사라진다.
   겉은 붉은 불, 가운데는 주황, 안쪽 심지는 노란 흰빛. 바깥 가장자리에 불길이 일렁인다 */
function drawFireSlash(ctx, f, p, time) {
  const grow = Math.min(1, p / 0.3), fade = p < 0.45 ? 1 : Math.max(0, 1 - (p - 0.45) / 0.55);
  const span = f.span * grow, R = f.r, dir = f.dir || 1, N = 48;
  const W = R * 0.55 * (0.75 + 0.25 * fade);         // 가장 굵은 곳의 두께
  const arcAt = (t) => f.a0 + dir * span * t;
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
    gl.addColorStop(0, `rgba(255,170,60,${0.55 * fade})`);
    gl.addColorStop(0.6, `rgba(230,70,20,${0.35 * fade})`);
    gl.addColorStop(1, "rgba(160,30,10,0)");
    ctx.globalCompositeOperation = i % 3 ? "source-over" : "lighter";
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
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
  for (let i = 0; i < 9; i++) {                   // 불길 덩어리 — 밖으로 퍼지며 위로 오른다
    const a = i * 0.7 + f.x * 0.01, d = f.r * (0.2 + p * 0.9) * (0.6 + (i % 3) * 0.2);
    const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d * 0.6 - p * 26, r = f.r * 0.22 * fade;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    g2.addColorStop(0, `rgba(255,170,60,${0.8 * fade})`);
    g2.addColorStop(1, "rgba(200,50,10,0)");
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 10; i++) {                  // 그을음 조각
    const a = i * 2.39 + f.y * 0.01, d = f.r * (0.15 + p * 1.1) * (0.5 + ((i * 37) % 50) / 100);
    ctx.fillStyle = `rgba(40,18,10,${0.8 * fade})`;
    ctx.fillRect(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.6 - p * 10, 3, 2);
  }
  ctx.fillStyle = `rgba(255,236,170,${fade})`;
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

// 유성 — 하늘에서 비스듬히 떨어져(0.6까지) 땅에 닿으면 빛이 번진다. 떨어질 자리에는 미리 둥근 표시
function drawMeteor(ctx, f, p) {
  const fall = Math.min(1, p / 0.6);
  ctx.save();
  ctx.globalAlpha = (1 - fall) * 0.6 + 0.15;
  ctx.strokeStyle = "rgba(203,184,255,0.9)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * SQ(), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  if (p < 0.6) {
    const sx = f.x - 260, sy = f.y - 520;
    const x = sx + (f.x - sx) * fall * fall, y = sy + (f.y - 20 - sy) * fall * fall;
    const ang = Math.atan2(f.y - sy, f.x - sx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter";
    const tail = ctx.createLinearGradient(x, y, x - Math.cos(ang) * 140, y - Math.sin(ang) * 140);
    tail.addColorStop(0, "rgba(255,240,210,0.95)");
    tail.addColorStop(1, "rgba(150,120,255,0)");
    ctx.strokeStyle = tail;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * 140, y - Math.sin(ang) * 140); ctx.stroke();
    const core = ctx.createRadialGradient(x, y, 1, x, y, 22);
    core.addColorStop(0, "rgba(255,255,240,1)");
    core.addColorStop(0.5, "rgba(220,190,255,0.9)");
    core.addColorStop(1, "rgba(140,110,255,0)");
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
  } else {
    const q = (p - 0.6) / 0.4;
    ctx.globalAlpha = 1 - q;
    ctx.globalCompositeOperation = "lighter";
    const gl = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r);
    gl.addColorStop(0, "rgba(255,250,230,0.95)");
    gl.addColorStop(0.5, "rgba(200,180,255,0.6)");
    gl.addColorStop(1, "rgba(120,90,230,0)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.6 + q * 0.5), f.r * SQ() * (0.6 + q * 0.5), 0, 0, Math.PI * 2); ctx.fill();
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
