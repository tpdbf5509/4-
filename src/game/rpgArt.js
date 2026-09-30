/* RPG 모드 그리기 — 들판, 영웅, 괴물, 보스가 내리칠 자리.
   괴물 그림과 연출은 방어전의 것을 그대로 빌려 쓴다. */
import { W, H, CX, C, P, CLASSES, ENEMY } from "./world.js";
import {
  roundRect, shadow, mulberry32, drawTree, drawRock, drawBush,
  drawEnemy, drawFx, drawBanner, classArt, fxWarmUp, FX_ART,
} from "./art.js";
import { RPG, dist, heroRange, heroSkillCd } from "./rpg.js";

const HERO_H = 86;            // 들판에 서는 영웅 키 — 결전장보다 작게 둔다
const MOB_K = { grunt: 1.45, rusher: 1.45, armor: 1.4, boss: 1.25, titan: 1.05 };

/* 바탕은 한 번만 그려 두고 매 프레임 그대로 얹는다 */
export function paintRpgField(ctx) {
  const rnd = mulberry32(4242);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#2c4424");
  sky.addColorStop(0.22, "#3f5d2c");
  sky.addColorStop(1, "#35512a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 들판 — 가운데가 조금 밝은 풀밭
  const cy = (RPG.top + RPG.bottom) / 2;
  const gr = ctx.createRadialGradient(CX, cy, 60, CX, cy, W * 0.62);
  gr.addColorStop(0, "#5b7a3a");
  gr.addColorStop(0.7, "#4d6c32");
  gr.addColorStop(1, "#3c5628");
  ctx.fillStyle = gr;
  ctx.fillRect(0, RPG.top - 40, W, H - RPG.top + 40);

  // 풀빛 얼룩
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W, y = RPG.top - 20 + rnd() * (H - RPG.top + 20);
    ctx.fillStyle = rnd() < 0.5 ? "rgba(120,160,80,0.10)" : "rgba(40,60,26,0.10)";
    ctx.beginPath(); ctx.ellipse(x, y, 30 + rnd() * 60, 12 + rnd() * 22, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 풀잎
  ctx.strokeStyle = "rgba(160,200,110,0.22)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = RPG.top + rnd() * (H - RPG.top);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2 + rnd() * 4, y - 5 - rnd() * 4); ctx.stroke();
  }
  // 돌과 덤불 — 가장자리에만
  for (let i = 0; i < 18; i++) {
    const side = rnd() < 0.5;
    const x = side ? 12 + rnd() * 40 : W - 12 - rnd() * 40;
    const y = RPG.top + rnd() * (H - RPG.top - 20);
    if (rnd() < 0.5) drawRock(ctx, x, y, 0.7 + rnd() * 0.5);
    else drawBush(ctx, x, y, 0.8 + rnd() * 0.5, rnd() < 0.3);
  }
  // 위쪽 숲 — 괴물이 이 너머에서 나온다
  const trees = [];
  for (let i = 0; i < 46; i++) {
    trees.push({ x: -20 + (i / 45) * (W + 40) + (rnd() - 0.5) * 24, y: 58 + rnd() * 70, s: 1.1 + rnd() * 0.6,
      pine: rnd() < 0.55, seed: Math.floor(rnd() * 999) });
  }
  trees.sort((a, b) => a.y - b.y).forEach((t) => drawTree(ctx, t.x, t.y, t.s, t.pine, t.seed));
  // 숲과 들판 사이의 그늘
  const sh = ctx.createLinearGradient(0, RPG.top - 30, 0, RPG.top + 20);
  sh.addColorStop(0, "rgba(20,30,14,0.35)");
  sh.addColorStop(1, "rgba(20,30,14,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, RPG.top - 30, W, 50);
}

/* 보스가 내리칠 자리 — 붉게 차오르다 터진다 */
function drawZones(ctx, g, time) {
  g.zones.forEach((z) => {
    const fill = 1 - Math.max(0, z.t) / (z.t0 || 1);
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.scale(1, RPG.squash);
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(time * 14);
    ctx.fillStyle = "#e0523f";
    ctx.beginPath(); ctx.arc(0, 0, z.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ff7a5c";
    ctx.beginPath(); ctx.arc(0, 0, z.r * fill, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = "#ffb09a";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, z.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  });
}

function drawMob(ctx, m, time) {
  const k = MOB_K[m.type] || 1.4;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(k, k);
  ctx.translate(-m.x, -m.y);
  drawEnemy(ctx, m, time);
  ctx.restore();
}

function drawHero(ctx, g, h, time) {
  const pi = h.pi;
  const col = P[pi];
  const mine = g.mySeat === pi;
  const down = h.down > 0;
  const im = classArt(pi);
  const bob = down ? 0 : Math.abs(Math.sin(time * 3 + pi)) * -2;
  const x = h.x, y = h.y + bob;

  // 쓰러진 동료 — 곁에 서면 빨리 일어난다는 걸 바닥에 둥글게 보여 준다
  if (down && g.mySeat !== pi) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(1, RPG.squash);
    ctx.globalAlpha = h.help ? 0.55 : 0.3 + 0.12 * Math.sin(time * 4);
    ctx.strokeStyle = h.help ? "#b6f0a8" : col.light;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(0, 0, RPG.helpR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // 발밑 고리 — 내 영웅은 채워서, 스킬이 차면 반짝인다
  ctx.save();
  ctx.translate(h.x, h.y + 2);
  ctx.scale(1, 0.36);
  ctx.globalAlpha = mine ? 0.5 : 0.35;
  ctx.strokeStyle = col.light;
  ctx.lineWidth = mine ? 6 : 4;
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
  if (mine) {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = col.key;
    ctx.fill();
    const full = 1 - Math.min(1, h.sk / heroSkillCd(h));
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = h.sk > 0 ? col.key : "#ffe08a";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * full); ctx.stroke();
  }
  ctx.restore();
  if (h.guard > 0) {                                 // 성역 — 받는 피해가 준다
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(time * 6);
    ctx.strokeStyle = "#ffeec2"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - 38, 30, 46, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (h.buff > 0) {                                  // 보급 — 힘이 붙었다
    ctx.save();
    ctx.fillStyle = "#e9c8ff";
    for (let i = 0; i < 3; i++) {
      const a = time * 3 + i * 2.1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * 22, h.y - 30 + Math.sin(a * 1.3) * 26, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  shadow(ctx, h.x, h.y + 3, 20, 6, 0.3);
  ctx.translate(x, y);
  if (down) { ctx.rotate(-0.9 * h.dir); ctx.translate(0, 12); ctx.globalAlpha = 0.5; }
  const lunge = h.swing > 0 ? Math.sin((h.swing / 0.25) * Math.PI) * 6 : 0;
  ctx.translate(h.dir * lunge, 0);
  ctx.scale(h.dir < 0 ? -1 : 1, 1);
  if (im) {
    const ww = HERO_H * (im.naturalWidth / im.naturalHeight);
    ctx.drawImage(im, -ww / 2, -HERO_H, ww, HERO_H);
    if (h.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.min(0.5, h.flash * 3);
      ctx.drawImage(im, -ww / 2, -HERO_H, ww, HERO_H);
    }
  } else {
    ctx.fillStyle = col.key;
    roundRect(ctx, -12, -44, 24, 44, 9); ctx.fill();
  }
  ctx.restore();

  // 체력과 레벨
  const bw = 50, byy = h.y - HERO_H - 14;
  const r = Math.max(0, Math.min(1, h.hp / (h.max || 1)));
  ctx.save();
  ctx.fillStyle = "rgba(18,12,8,0.8)";
  roundRect(ctx, h.x - bw / 2 - 1, byy - 1, bw + 2, 7, 3); ctx.fill();
  ctx.fillStyle = down ? "#6a5a52" : r > 0.5 ? "#8fd07f" : r > 0.25 ? "#e8c05e" : "#ef8b7c";
  roundRect(ctx, h.x - bw / 2, byy, Math.max(1.5, bw * r), 5, 2.5); ctx.fill();
  ctx.font = "11px 'Do Hyeon', sans-serif";
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(18,12,8,0.8)";
  roundRect(ctx, h.x - bw / 2 - 30, byy - 5, 27, 15, 6); ctx.fill();
  ctx.fillStyle = "#ffe08a";
  ctx.fillText(`Lv${h.lv}`, h.x - bw / 2 - 5, byy + 3);
  if (down) {
    ctx.textAlign = "center";
    ctx.font = "12px 'Jua', sans-serif";
    ctx.fillStyle = h.help ? "#b6f0a8" : "#ffbdb2";
    ctx.fillText(h.help ? `일으키는 중 · ${Math.ceil(h.down / 3)}초` : `${Math.ceil(h.down)}초 뒤 일어남`, h.x, byy - 12);
  }
  ctx.restore();

  // 이름표
  ctx.save();
  ctx.font = "12px 'Do Hyeon', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const nm = (g.names && g.names[pi]) || CLASSES[pi].name;
  const wdt = ctx.measureText(nm).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)";
  roundRect(ctx, h.x - wdt / 2, h.y + 7, wdt, 16, 7); ctx.fill();
  ctx.fillStyle = down ? "#a89a90" : col.light;
  ctx.fillText(nm, h.x, h.y + 15.5);
  ctx.restore();
}

function drawBossBar(ctx, g) {
  const b = g.boss;
  if (!b) return;
  const bw = 420, bx = CX - bw / 2, by = 24;
  const r = Math.max(0, Math.min(1, b.hp / (b.max || 1)));
  ctx.save();
  ctx.fillStyle = "rgba(20,14,10,0.78)";
  roundRect(ctx, bx - 8, by - 6, bw + 16, 40, 10); ctx.fill();
  ctx.strokeStyle = "rgba(226,190,120,0.5)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = "14px 'Do Hyeon', sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = b.type === "titan" ? "#ff9a8a" : "#ffc49a";
  ctx.fillText((ENEMY[b.type] || {}).label || "보스", bx, by + 6);
  ctx.textAlign = "right";
  ctx.fillStyle = "#e8dcc0";
  ctx.fillText(`${Math.max(0, Math.round(b.hp)).toLocaleString("ko-KR")} / ${b.max.toLocaleString("ko-KR")}`, bx + bw, by + 6);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, bx, by + 16, bw, 9, 4); ctx.fill();
  ctx.fillStyle = b.type === "titan" ? "#e0634f" : "#e58a4a";
  roundRect(ctx, bx, by + 16, Math.max(3, bw * r), 9, 4); ctx.fill();
  ctx.restore();
}

export function drawRpg(ctx, g, bg) {
  fxWarmUp();
  const time = g.t;
  ctx.save();
  if (g.shake > 0) {
    const s = g.shake * 7;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  else { ctx.fillStyle = C.grass; ctx.fillRect(0, 0, W, H); }

  // 내 사거리 — 적이 들어오면 또렷해진다
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  if (me && me.down <= 0) {
    const rr = heroRange(me);
    const on = g.mobs.some((m) => !m.dead && dist(me.x, me.y, m.x, m.y) <= rr);
    ctx.save();
    ctx.translate(me.x, me.y);
    ctx.scale(1, RPG.squash);
    ctx.globalAlpha = on ? 0.1 : 0.05;
    ctx.fillStyle = P[g.mySeat].key;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = on ? 0.6 : 0.3;
    ctx.strokeStyle = P[g.mySeat].light;
    ctx.lineWidth = 1.6;
    ctx.setLineDash(on ? [] : [8, 8]);
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  drawZones(ctx, g, time);
  g.fx.forEach((f) => { if (f.kind === "art" && !(FX_ART[f.art] || {}).over) drawFx(ctx, f); });

  // 앞뒤로 겹치게 — 위에 선 것부터 그린다
  const order = [];
  g.mobs.forEach((m) => { if (!m.dead) order.push({ y: m.y, m }); });
  g.heroes.forEach((h) => { if (h) order.push({ y: h.y, h }); });
  order.sort((a, b) => a.y - b.y);
  order.forEach((o) => { if (o.m) drawMob(ctx, o.m, time); else drawHero(ctx, g, o.h, time); });

  g.fx.forEach((f) => { if (f.kind !== "art" || (FX_ART[f.art] || {}).over) drawFx(ctx, f); });
  ctx.globalAlpha = 1;

  drawBossBar(ctx, g);
  if (g.banner) drawBanner(ctx, g.banner);

  if (g.phase === "intro") {
    ctx.save();
    ctx.font = "64px 'Do Hyeon', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(20,14,10,0.85)";
    const n = String(Math.max(1, Math.ceil(g.timer)));
    ctx.strokeText(n, CX, H / 2 + 40);
    ctx.fillStyle = "#ffe08a";
    ctx.fillText(n, CX, H / 2 + 40);
    ctx.restore();
  }
  ctx.restore();
}
