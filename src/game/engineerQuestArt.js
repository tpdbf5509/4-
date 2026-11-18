/* ── Engineer 003 획득 루트 그림 — 조사 자리 · 미믹 · 위험 장치 · 자동인형 003 · 최종 시험(11월 19일) ─────────────
   그림은 Codex 로 만든 시트(engineer-quest/*.webp, 칸 256 · 발 244). 못 불러오면 코드 도형으로 대신한다.
   코드로 그리는 것은 1px 예고선 · 범위 · 이름표뿐. 판정과 같은 함수(eqSpotShown · eqHazardState)를 쓴다 */
import { EQ_SPOTS, EQ_HAZARDS, EQ_ART as A, EQ_TRIAL as TR, EQ_MIMIC as MI, eqMap } from './engineerQuestData.js';
import { eqSpotShown, eqHazardState, eqHas, eqView, EQ_MIMIC_IDS } from './engineerQuest.js';

const SQ = 0.78, FEET = 244 / 256;
const C = { teal: '#9fe3ea', line: 'rgba(159,227,234,.8)', warn: '#f0c98a', red: '#ff8a8a', ink: 'rgba(22,30,32,.86)', text: '#dff5f4' };
const imgs = new Map();
function img(name) {
  if (typeof Image === 'undefined') return null;
  if (!imgs.has(name)) { const im = new Image(); imgs.set(name, im); im.onerror = () => imgs.set(name, null); im.src = `${A.base}${name}.webp`; }
  const im = imgs.get(name);
  return im && im.complete && im.naturalWidth ? im : null;
}
const SHEETS = { props: [4, 256], mimic: [3, 256], automaton: [3, 256], bots: [4, 256], e003: [3, 384] };
// 시트 한 칸을 발(x, y) 기준으로 — size 는 그릴 너비
function cell(ctx, sheet, i, x, y, size, flip, alpha = 1) {
  const im = img(sheet); if (!im) return false;
  const [cols, cw] = SHEETS[sheet], sx = (i % cols) * cw, sy = Math.floor(i / cols) * cw;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, sx, sy, cw, cw, -size / 2, -size * FEET, size, size);
  ctx.restore();
  return true;
}
function label(ctx, text, x, y, color = C.text) {
  ctx.save(); ctx.font = "14px 'Do Hyeon', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2, y - 11, w, 22);
  ctx.strokeStyle = 'rgba(159,227,234,.45)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + .5, y - 10.5, w - 1, 21);
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
const ring = (ctx, x, y, r, color, a = 1, w = 1) => { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, r, r * SQ, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
const disc = (ctx, x, y, r, color, a) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r, r * SQ, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };

/* ── 조사 자리 — 사람과 앞뒤를 맞춘다(rpgArt 가 y 로 줄 세움) ── */
export function eqSpotsOn(me, mapId) {
  if (!me || !me.bag || (mapId !== 'dawnwood' && !eqMap(mapId))) return [];
  return EQ_SPOTS.filter((s) => s.map === mapId && !s.npc && eqSpotShown(me, s));
}
export function drawEqSpot(ctx, me, s, time, near) {
  const [x, y] = s.at, v = eqView(me);
  if (s.act.k === 'doll') return drawDollAt(ctx, me, x, y, time);
  const awake0 = s.act.k === 'mimic' && v && v.mim >= 0 && EQ_MIMIC_IDS[v.mim] === s.act.mid;
  if (s.look && (!s.look.bg || awake0)) {
    const mimicAwake = s.act.k === 'mimic' && v && v.mim >= 0 && EQ_MIMIC_IDS[v.mim] === s.act.mid;
    const sealed = s.act.k === 'mimic' && eqHas(me, s.act.seal);
    const i = s.look.sheet === 'mimic' ? s.look.i + (mimicAwake ? 3 : 0) : s.look.i;
    const bob = mimicAwake ? Math.sin(time * 18) * 3 : s.act.k === 'mimic' && !sealed ? Math.sin(time * 2.4) * 0.8 : 0;   // 숨 쉬듯 흔들리는 경첩 — 미믹의 단서
    if (!cell(ctx, s.look.sheet, i, x, y + bob, s.look.size * 1.3)) { ctx.save(); ctx.fillStyle = '#5b5148'; ctx.fillRect(x - 24, y - 40, 48, 40); ctx.restore(); }
  }
  const p = 0.5 + 0.5 * Math.sin(time * 2.2 + x * 0.01);
  ring(ctx, x, y, 26 + p * 6, C.teal, near ? 0.9 : 0.45);
  if (near) label(ctx, s.name, x, y - (s.look && !s.look.bg ? s.look.size * 1.3 : 90) - 8);
}

/* ── 자동인형 003 — 연구소 조립대에서 고치기 전엔 쓰러져 있고, 고친 뒤엔 탐험 맵에서 곁을 따라다닌다 ── */
function drawDollAt(ctx, me, x, y, time) {
  const fixed = eqHas(me, 'doll3');
  if (fixed) return;
  cell(ctx, 'automaton', 0, x, y, 210) || disc(ctx, x, y - 30, 40, '#6f6a60', 1);
  if (eqHas(me, 'doll')) { const n = ['pCell', 'pMem', 'pJoint', 'pCtrl'].filter((f) => eqHas(me, f)).length; label(ctx, `부품 ${n}/4`, x, y - 190, n >= 4 ? C.teal : C.warn); }
}
const follow = new WeakMap();
export function eqCompanion(me) { return !!(me && me.bag && eqMap(me.map) && eqHas(me, 'doll3') && !eqHas(me, 'claim') && me.map !== 'eng-trial'); }
// 곁 자리 — 화면에서만 부드럽게 따라온다(판정 없음)
export function eqCompanionAt(me, dt) {
  let p = follow.get(me);
  const tx = me.x - (me.face === 1 ? -70 : 70), ty = me.y + 8;
  if (!p || p.map !== me.map || Math.hypot(p.x - tx, p.y - ty) > 600) p = { x: tx, y: ty, map: me.map, f: 0 };
  const k = Math.min(1, dt * 4); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; p.f = tx < p.x ? 1 : 0;
  follow.set(me, p);
  return p;
}
export function drawEqCompanion(ctx, p, time) {
  const bob = Math.sin(time * 3) * 2;
  disc(ctx, p.x, p.y, 26, '#000', 0.25);
  cell(ctx, 'automaton', 1, p.x, p.y + bob, 140, p.f) || disc(ctx, p.x, p.y - 40, 22, '#8fb7b8', 1);
  disc(ctx, p.x, p.y - 108 + bob, 3, C.teal, 0.6 + 0.4 * Math.sin(time * 5));
}

/* ── 위험 장치 — 압축기 · 누전 · 감시 드론 · 괴수 동력핵(관찰실) ── */
export function drawEqHazards(ctx, me, mapId, t, time) {
  if (!me || !eqMap(mapId)) return;
  for (const z of EQ_HAZARDS) {
    if (z.map !== mapId) continue;
    const s = eqHazardState(me, z, t);
    if (!s) continue;
    if (z.kind === 'press') {
      ring(ctx, s.x, s.y, z.r, s.on ? C.red : s.warn ? C.warn : C.line, s.on ? 1 : 0.6);
      if (s.on) disc(ctx, s.x, s.y, z.r, C.red, 0.18);
      else if (s.warn) disc(ctx, s.x, s.y, z.r, C.warn, 0.08 + 0.08 * Math.sin(time * 20));
    } else if (z.kind === 'spark') {
      disc(ctx, s.x, s.y, z.r, '#7fd6ff', 0.07 + 0.05 * Math.sin(time * 9));
      ring(ctx, s.x, s.y, z.r, '#7fd6ff', 0.8);
      ctx.save(); ctx.strokeStyle = '#cdf3ff'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = time * 3 + i * 1.7, r0 = (i * 37 + Math.floor(time * 12) * 13) % z.r;
        const x0 = s.x + Math.cos(a) * r0, y0 = s.y + Math.sin(a) * r0 * SQ;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 10, y0 - 6); ctx.lineTo(x0 + 4, y0 + 2); ctx.lineTo(x0 + 16, y0 - 2); ctx.stroke();
      }
      ctx.restore();
    } else if (z.kind === 'drone') {
      disc(ctx, s.x, s.y, z.r, '#ffd28a', 0.12);
      ring(ctx, s.x, s.y, z.r, C.warn, 0.8);
      cell(ctx, 'bots', 2, s.x, s.y - 90 + Math.sin(time * 4) * 4, 110) || disc(ctx, s.x, s.y - 90, 14, '#c9c2b0', 1);
    } else if (z.kind === 'beast') {
      const col = s.ph === 'burst' ? C.red : s.ph === 'charge' ? C.warn : C.teal;
      ring(ctx, s.x, s.y, z.r, col, 0.9);
      if (s.ph === 'burst') disc(ctx, s.x, s.y, z.r, '#9fdcff', 0.22 + 0.1 * Math.sin(time * 30));
      label(ctx, s.ph === 'burst' ? '방출' : s.ph === 'charge' ? '충전' : '냉각 — 지금 조작', s.x, s.y - 120, col);
    }
  }
}

/* ── 최종 시험 — 제어 장치 · 냉각 장치 · 시험 몹(봇 · E-003 · 외곽 단말기) ── */
export function drawEqTrialGround(ctx, me, mapId, time) {
  if (mapId !== 'eng-trial' || !me) return;
  const v = eqView(me), t = v && v.tr;
  if (!t) return;
  if (t.ph === 1) {
    const [x, y] = TR.device.at;
    cell(ctx, 'bots', 3, x, y, 170) || disc(ctx, x, y - 40, 40, '#6fb7c0', 1);
    ring(ctx, x, y, 70, t.dev > 40 ? C.teal : C.red, 0.9);
    bar(ctx, x, y - 170, 120, t.dev / TR.device.hp, t.dev > 40 ? C.teal : C.red);
  }
  if (t.ph === 3 && !t.open) TR.last.cool.forEach(([x, y], i) => {
    cell(ctx, 'props', 3, x, y, 130);
    ring(ctx, x, y, 60, i === t.cool ? C.teal : C.line, i === t.cool ? 0.9 + 0.1 * Math.sin(time * 6) : 0.35);
    label(ctx, `냉각 ${i + 1}`, x, y - 140, i === t.cool ? C.teal : '#9aa8a8');
  });
}
function bar(ctx, x, y, w, k, color) {
  ctx.save(); ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2, y, w, 6);
  ctx.fillStyle = color; ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, k)), 6);
  ctx.strokeStyle = 'rgba(223,245,244,.5)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + .5, y + .5, w - 1, 5); ctx.restore();
}
// 시험 몹 — rpgArt 가 m.eq 이면 이것으로 그린다
export function drawEqMob(ctx, m, time, g) {
  const k = m.eq, flip = m.ax < 0;
  if (k === 'boss') {
    const me = g && g.heroes[g.mySeat], v = me && eqView(me), t = v && v.tr;
    const sh = t && (t.sh > 0 || t.ph === 3);
    disc(ctx, m.x, m.y, 90, '#000', 0.3);
    cell(ctx, 'e003', sh ? 2 : t && t.ph === 3 ? 1 : 0, m.x, m.y, 320, flip) || disc(ctx, m.x, m.y - 120, 80, '#556', 1);
    if (sh) ring(ctx, m.x, m.y - 120, 150, C.teal, 0.5 + 0.3 * Math.sin(time * 4), 1);
    bar(ctx, m.x, m.y - 330, 200, m.hp / m.max, sh ? C.teal : C.red);
    return;
  }
  if (k === 'term') {
    cell(ctx, 'props', 2, m.x, m.y, 130) || disc(ctx, m.x, m.y - 40, 24, '#5fa', 1);
    ring(ctx, m.x, m.y, 40, C.teal, 0.6 + 0.3 * Math.sin(time * 8));
    bar(ctx, m.x, m.y - 130, 70, m.hp / m.max, C.teal);
    return;
  }
  const i = k === 'rush' ? 0 : k === 'flank' ? 1 : 2, size = k === 'rush' ? 130 : 110;
  disc(ctx, m.x, m.y, 26, '#000', 0.25);
  cell(ctx, 'bots', i, m.x, m.y + (k === 'shoot' ? -40 + Math.sin(time * 5) * 3 : 0), size, flip) || disc(ctx, m.x, m.y - 30, 20, '#b98', 1);
  if (m.flash > 0) disc(ctx, m.x, m.y - 40, 26, '#fff', 0.3);
  bar(ctx, m.x, m.y - size, 56, m.hp / m.max, C.warn);
}

/* ── 연출(fx kind sk_eq_*) ── */
export function drawEqFx(ctx, f) {
  const p = 1 - f.t / f.life;
  if (f.kind === 'sk_eq_warn') {
    ring(ctx, f.x, f.y, f.r, C.red, 0.9);
    disc(ctx, f.x, f.y, f.r * Math.min(1, p), C.red, 0.18);
  } else if (f.kind === 'sk_eq_bite') {
    disc(ctx, f.x, f.y, f.r, C.red, 0.35 * (1 - p));
    ring(ctx, f.x, f.y, f.r * (1 + p * 0.3), C.red, 1 - p, 1);
  } else if (f.kind === 'sk_eq_boom') {
    disc(ctx, f.x, f.y, f.r * (0.4 + p), '#ffd9a0', 0.4 * (1 - p));
    ring(ctx, f.x, f.y, f.r * (0.5 + p), C.warn, 1 - p);
  } else if (f.kind === 'sk_eq_shot') {
    ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = C.warn; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(f.x, f.y - 50); ctx.lineTo(f.tx, f.ty - 40); ctx.stroke(); ctx.restore();
  } else if (f.kind === 'sk_eq_lwarn' || f.kind === 'sk_eq_laser') {
    const warn = f.kind === 'sk_eq_lwarn', L = f.len, w = f.w / 2, ex = f.x + f.dx * L, ey = f.y + f.dy * L * SQ;
    const nx = -f.dy * w, ny = f.dx * w * SQ;
    ctx.save();
    ctx.globalAlpha = warn ? 0.9 : 1 - p;
    ctx.fillStyle = warn ? 'rgba(255,138,138,.14)' : 'rgba(190,240,255,.55)';
    ctx.strokeStyle = warn ? C.red : '#e8fbff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(f.x + nx, f.y + ny); ctx.lineTo(ex + nx, ey + ny); ctx.lineTo(ex - nx, ey - ny); ctx.lineTo(f.x - nx, f.y - ny); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (warn) { ctx.fillStyle = 'rgba(255,138,138,.25)'; const k = Math.min(1, p); ctx.beginPath(); ctx.moveTo(f.x + nx * k, f.y + ny * k); ctx.lineTo(ex + nx * k, ey + ny * k); ctx.lineTo(ex - nx * k, ey - ny * k); ctx.lineTo(f.x - nx * k, f.y - ny * k); ctx.fill(); }
    ctx.restore();
  } else if (f.kind === 'sk_eq_wave') {
    ring(ctx, f.x, f.y, f.r * (0.3 + p * 0.7), '#bfefff', 1 - p, 2);
    disc(ctx, f.x, f.y, f.r * (0.3 + p * 0.7), '#bfefff', 0.15 * (1 - p));
  }
}
export const EQ_MIMIC_R = MI.r;
