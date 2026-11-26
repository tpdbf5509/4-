/* ── Wyvern Knight 006 획득 루트 그림 — 문 · 제단 · 석등 · 석상 · 바위(열림 · 닫힘) · 시련 표시 · 잠든 와이번(11월 23일) ─────────────
   바닥은 Codex 로 뽑은 story/ground/wq_*.webp(storyArt.js drawStoryBackdrop, 없으면 코드 바닥).
   신전 돌문 · 시련의 문 · 맹세의 문(gates.webp), 제단 · 석등 · 용 석상(props.webp), 서리봉 바위 셋(rocks.webp)은 바닥과 따로 Codex 로 뽑은 낱장
   (2열 — 왼쪽 닫힘 · 오른쪽 열림, 칸 512)이라 열렸는지 한눈에 보인다(사용자 지시 11월 23일). 못 불러오면 코드 도형으로 대신한다.
   와이번 몸은 직업 시트(wy_sit · wy_wyvern)를 그대로 쓴다(wyvernArt.js drawWyvernUnit). 원래 맵(루엔 · 등불고개)에서는 그림 없이 이름표만 */
import { textUp } from "./bodyScale.js";
import { WQ_SPOTS, WQ_TRIAL as T, WQ_ROCKS, wqMap, wqSpotMap, AQ } from './wyvernQuestData.js';
import { wqSpotShown, wqView, wqOpen, wqHas, aqReady, aqMarkAt, aqWyvernAt } from './wyvernQuest.js';
import { drawWyvernUnit } from './wyvernArt.js';

const SQ = 0.78;
const BASE = '/assets/game/rpg/wyvern-quest/';
export const WQ_ART = { gates: { cols: 2, cw: 512, ch: 512 }, props: { cols: 2, cw: 512, ch: 512 }, rocks: { cols: 2, cw: 512, ch: 512 } };
const GATE_ROW = { tdoor: 0, tgate: 1, ogate: 2 };
const C = { gold: '#f2c48a', line: 'rgba(242,196,138,.7)', warn: '#f0c98a', red: '#ff8a8a', ink: 'rgba(30,22,20,.86)', text: '#f6ead8', frost: '#d6e6f2' };
const imgs = new Map();
function img(name) {
  if (typeof Image === 'undefined') return null;
  if (!imgs.has(name)) { const im = new Image(); imgs.set(name, im); im.onerror = () => imgs.set(name, null); im.src = `${BASE}${name}.webp`; }
  const im = imgs.get(name);
  return im && im.complete && im.naturalWidth ? im : null;
}
// 시트 한 칸을 발(x, y) 기준으로 — w 는 그릴 너비. foot 은 칸 안 발 높이 비율
function cell(ctx, sheet, i, x, y, w, a = 1, foot = 0.94) {
  const im = img(sheet); if (!im) return false;
  const { cols, cw, ch } = WQ_ART[sheet], h = w * ch / cw;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.drawImage(im, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch, x - w / 2, y - h * foot, w, h);
  ctx.restore();
  return true;
}
function label(ctx, text, x, y, color = C.text) {
  ctx.save(); textUp(ctx, x, y); ctx.font = "14px 'Do Hyeon', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2, y - 11, w, 22);
  ctx.strokeStyle = 'rgba(242,196,138,.45)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + .5, y - 10.5, w - 1, 21);
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
const ring = (ctx, x, y, r, color, a = 1, w = 1, dash) => { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.ellipse(x, y, r, r * SQ, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
const disc = (ctx, x, y, r, color, a) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r, r * SQ, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
// 부채꼴(땅) — 꼭짓점 (x, y), 방향 a(땅 각), 반각 arc
function fan(ctx, x, y, dir, arc, reach, color, fill, a = 1, dash) {
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.moveTo(x, y);
  for (let i = 0; i <= 24; i++) { const t = dir - arc + (2 * arc * i) / 24; ctx.lineTo(x + Math.cos(t) * reach, y + Math.sin(t) * reach * SQ); }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = color; ctx.lineWidth = 1; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
}

/* ── 조사 자리 — 사람과 앞뒤를 맞춘다(rpgArt 가 y 로 줄 세움) ── */
export function wqSpotsOn(me, mapId) {
  if (!me || !me.bag || !wqSpotMap(mapId)) return [];
  return WQ_SPOTS.filter((s) => s.map === mapId && !s.npc && wqSpotShown(me, s));
}
function rockFallback(ctx, x, y, w, moss, open) {
  ctx.save();
  ctx.fillStyle = '#7d828a'; ctx.beginPath(); ctx.ellipse(x, y - w * 0.28, w * 0.46, w * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = moss ? '#5d7448' : '#9aa1a8'; ctx.beginPath(); ctx.ellipse(x, y - w * 0.12, w * 0.44, w * 0.14, 0, 0, Math.PI); ctx.fill();
  if (!moss) { ctx.strokeStyle = open ? '#1b1a1e' : '#3a3d44'; ctx.lineWidth = open ? 6 : 2; ctx.beginPath(); ctx.moveTo(x, y - w * 0.52); ctx.lineTo(x - 4, y - w * 0.04); ctx.stroke(); }
  ctx.restore();
}
function gateFallback(ctx, kind, open, x, y, w) {
  const h = w * 0.7;
  ctx.save();
  ctx.fillStyle = '#5a5f66'; ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = open ? '#16131a' : kind === 'tdoor' ? '#c9d4dc' : '#7a7068';
  ctx.fillRect(x - w * 0.28, y - h * 0.82, w * 0.56, h * 0.82);
  ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + .5, y - h + .5, w - 1, h - 1);
  ctx.restore();
}
function lampFallback(ctx, x, y, lit, time) {
  ctx.save(); ctx.fillStyle = '#6b6660'; ctx.fillRect(x - 18, y - 56, 36, 50); ctx.fillRect(x - 24, y - 8, 48, 8);
  ctx.strokeStyle = '#3a3630'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 60, 14, Math.PI, 0); ctx.stroke();
  if (lit) disc(ctx, x, y - 34, 10 + Math.sin(time * 6) * 2, '#ff9a4a', 0.9);
  ctx.restore();
}
// 통풍구 — 돌 구멍과 천 조각(0 축 늘어짐 · 1 가볍게 들림 · 2 팽팽히 당겨짐)
function vent(ctx, x, y, kind, time) {
  ctx.save();
  // 통풍구 구멍은 바닥 그림에 있다 — 천 조각만 그린다
  const sway = kind === 0 ? Math.sin(time * 0.8) * 0.04 : kind === 1 ? 0.35 + Math.sin(time * 2.4) * 0.3 : 1.05 + Math.sin(time * 18) * 0.04;
  ctx.translate(x - 30, y - 100); ctx.rotate(-sway);
  ctx.fillStyle = '#c9b694'; ctx.strokeStyle = '#6e5e46';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, 0);
  const wave = kind === 2 ? 0 : Math.sin(time * 3) * 4;
  ctx.quadraticCurveTo(64 + wave, 34, 56, 62 - (kind === 2 ? 8 : 0)); ctx.lineTo(4, 62 - (kind === 2 ? 8 : 0)); ctx.quadraticCurveTo(-4 + wave, 30, 0, 0);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
export function drawWqSpot(ctx, me, s, time, near) {
  const [x, y] = s.at;
  let top = 70;
  const L = s.look;
  if (s.map === 'frost-peak' && L) {                                  // 서리봉 바위 셋 — 멀리서는 비슷하다
    const i = L === 'rockL' ? 0 : L === 'rockR' ? 3 : wqOpen(me, s) ? 2 : 1;
    if (!cell(ctx, 'rocks', i, x, y, 170)) rockFallback(ctx, x, y, 200, L !== 'rockM', i === 2);
    top = 150;
  } else if (s.map === 'blade-ridge') {                               // 아르카디온 획득 — 칼등 정상 숨은 돌문(소환 뒤에만 보인다)
    if (!cell(ctx, 'gates', GATE_ROW.tdoor * 2 + 1, x, y, 230)) gateFallback(ctx, 'tdoor', true, x, y, 180);
    top = 190;
  } else if (s.map === 'wq_return') {
    top = drawAqSpot(ctx, me, s, time);
  } else if (wqMap(s.map)) {
    if (GATE_ROW[L] != null) {
      let open = wqOpen(me, s);
      if (L === 'ogate' && !open) { const tr = wqView(me)?.tr; if (tr && tr.id === 'oath') open = tr.ph === 2; }   // 시련 중 — 숨 고를 때 날개를 편다
      if (L === 'tdoor' && !wqHas(me, 'threshold_found')) { if (near) label(ctx, s.name, x, y - 160); return; }   // 문턱을 찾기 전에는 바닥 그림의 빈 벽 그대로
      const w = L === 'ogate' ? 460 : L === 'tdoor' ? 400 : 340;
      if (!cell(ctx, 'gates', GATE_ROW[L] * 2 + (open ? 1 : 0), x, y, w)) gateFallback(ctx, L, open, x, y, w * 0.8);
      if (L === 'tdoor' && wqHas(me, 'threshold_found') && !open) ring(ctx, x - 90, y - 120, 10, C.gold, 0.5 + Math.sin(time * 3) * 0.3);   // 경첩
      top = w * 0.8;
    } else if (L === 'altar') {
      const lit = wqHas(me, 'awakened');
      if (!wqHas(me, 'look_altar')) fresh(ctx, x, y - 20, time);
      if (!cell(ctx, 'props', lit ? 1 : 0, x, y, 300)) { ctx.save(); ctx.fillStyle = '#6b6660'; ctx.fillRect(x - 90, y - 90, 180, 90); ctx.restore(); if (lit) lampFallback(ctx, x, y - 90, true, time); }
      if (lit) disc(ctx, x, y - 130, 40 + Math.sin(time * 4) * 6, '#ff9a4a', 0.12);
      top = 230;
    } else if (L === 'lamp') {
      if (wqHas(me, 'ember_got')) { disc(ctx, x, y, 30, '#000', 0.25); top = 40; }
      else if (!wqHas(me, 'vent_lit')) { if (!cell(ctx, 'props', 2, x, y, 170)) lampFallback(ctx, x, y, false, time); top = 150; }
      else top = 40;                                                  // 불씨가 살아난 석등은 둘째 통풍구 앞에 있다(drawWqGround 가 그린다)
    } else if (L && L.startsWith('vent')) { vent(ctx, x, y, Number(L.slice(4)), time); top = 140; }
    else if (s.act.k !== 'trial') {                                   // 바닥 그림 속 물건 — 조사할 수 있는 자리
      if (s.act.set && !wqHas(me, s.act.set)) fresh(ctx, x, y, time);   // 아직 안 본 곳 — 은은한 빛(11월 25일 사용자)
      disc(ctx, x, y - 30, 5 + Math.sin(time * 3 + x) * 1.5, '#f6ead8', 0.55);
    }
    else top = 110;                                                   // 비문 돌 — 바닥 그림에 그려져 있다
  }
  if (near) label(ctx, s.name, x, y - top - 8);
}

// 아직 조사하지 않은 자리 — 바닥에서 은은하게 숨 쉬는 빛(11월 25일 사용자 「자리를 알아보기 어렵다」)
function fresh(ctx, x, y, time) {
  const k = 0.5 + Math.sin(time * 2.2 + x * 0.01) * 0.5, r = 70;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, SQ * 0.55);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, `rgba(255,226,170,${0.32 + 0.18 * k})`); gr.addColorStop(1, 'rgba(255,226,170,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  disc(ctx, x, y - 40 - k * 10, 3, '#fff1d6', 0.35 + 0.35 * k);     // 위로 떠오르는 작은 빛 한 점
}
/* ── 땅 층(사람보다 먼저) — 밟는 출구 빛 · 시련 표시 ── */
function floorGlow(ctx, x, y, r, time) {
  const a = 0.22 + Math.sin(time * 2) * 0.08;
  ctx.save(); ctx.strokeStyle = `rgba(242,196,138,${a})`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.9 * SQ * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = `rgba(220,170,110,${a * 0.3})`; ctx.fill(); ctx.restore();
}
// 바람다리 깃발 — 0 처짐 · 1 수평으로 들림 · 2 강풍에 펄럭
function flag(ctx, x, y, ph, time) {
  ctx.save(); ctx.strokeStyle = '#3a2e26'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 120); ctx.stroke();
  const ang = ph === 0 ? 1.3 + Math.sin(time) * 0.06 : ph === 1 ? 0.15 + Math.sin(time * 6) * 0.05 : Math.sin(time * 22) * 0.08;
  ctx.translate(x, y - 116); ctx.rotate(ang);
  ctx.fillStyle = '#b8453a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(64, ph === 2 ? Math.sin(time * 30) * 4 : 6); ctx.lineTo(60, 24); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function clawMarks(ctx, x, y, time) {
  ctx.save(); ctx.strokeStyle = `rgba(255,138,138,${0.55 + Math.sin(time * 6) * 0.2})`; ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 26 - 10, y + 40); ctx.lineTo(x + i * 26 + 14, y + 260); ctx.stroke(); }
  ctx.restore();
}
export function drawWqGround(ctx, me, M, time) {
  if (M.id === 'blade-ridge') return void drawAqRidge(ctx, me, time);
  if (!M.wq) return;
  if (M.id === 'wq_return') drawAqGround(ctx, me, time);
  for (const g of M.gates) if (g.eqGate) floorGlow(ctx, g.x, g.y, g.r, time);
  if (!me || me.map !== M.id) return;
  const tr = wqView(me)?.tr;
  if (M.id === 'wq_bridge') {
    const B = T.bridge, ph = tr && tr.id === 'bridge' ? tr.ph : 0;
    B.grooves.forEach((p, i) => { ring(ctx, p[0], p[1], B.r, tr && tr.got > i ? C.gold : C.line, 0.8, tr && tr.got > i ? 2 : 1); flag(ctx, 1070, p[1] + 30, ph, time + i); });
    flag(ctx, 1070, 1420, ph, time + 3);
    if (tr && tr.id === 'bridge') ring(ctx, B.goal[0], B.goal[1], B.goalR, tr.got >= 3 ? C.gold : C.line, 0.6, 1, [6, 6]);
    if (ph === 2) { ctx.save(); ctx.strokeStyle = 'rgba(220,235,245,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const yy = 500 + ((i * 97 + time * 600) % 1000); ctx.beginPath(); ctx.moveTo(1020, yy); ctx.lineTo(1380, yy + 10); ctx.stroke(); } ctx.restore(); }
  }
  if (M.id === 'wq_gallery') {
    const G = T.gallery;
    G.plates.forEach((p, i) => { disc(ctx, p[0], p[1], G.plateR, '#3c352e', 0.45); ring(ctx, p[0], p[1], G.plateR, tr && tr.id === 'gallery' && i === tr.mark ? C.red : C.line, 0.8); });
    if (tr && tr.id === 'gallery' && tr.mark >= 0) {
      const [sx, sy] = G.statues[tr.mark];
      clawMarks(ctx, sx, sy, time);
      fan(ctx, sx, sy, Math.PI / 2, G.arc, G.reach, C.red, tr.roar > 0 ? 'rgba(255,110,90,.22)' : 'rgba(255,110,90,.07)', 0.9, tr.roar > 0 ? null : [6, 6]);
    }
  }
  if (M.id === 'wq_oath') {
    const O = T.oath, open = tr && tr.id === 'oath' && tr.ph === 2;
    if (tr && tr.id === 'oath') O.legs.forEach((p) => ring(ctx, p[0], p[1], O.legR, open ? C.gold : C.line, open ? 0.95 : 0.5, open ? 2 : 1, open ? null : [4, 6]));
    if (tr && tr.id === 'oath' && tr.slam) { ring(ctx, tr.slam[0], tr.slam[1], O.slamR, C.red, 0.9); disc(ctx, tr.slam[0], tr.slam[1], O.slamR * Math.min(1, tr.pt / O.warn), C.red, 0.18); }
  }
  if (M.id === 'wq_sanctum' && tr && tr.id === 'duel') {
    const D = T.duel;
    if (tr.ph === 1 && tr.pat === 0) {                               // 날갯바람 — 먼지가 한 방향으로 흐르고 바위 홈이 보인다
      D.wind.holes.forEach((p) => { disc(ctx, p[0], p[1], D.wind.r, '#1b1612', 0.35); ring(ctx, p[0], p[1], D.wind.r, C.gold, 0.9, 2); });
      ctx.save(); ctx.strokeStyle = 'rgba(230,220,200,.35)'; ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) { const yy = 700 + i * 50, xx = ((i * 211 + time * 500 * tr.wind) % 2400 + 2400) % 2400; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 60 * tr.wind, yy); ctx.stroke(); }
      ctx.restore();
    }
    if (tr.ph === 1 && tr.pat === 1) fan(ctx, tr.at[0], tr.at[1], Math.atan2(tr.aim[1], tr.aim[0]), D.roar.arc, D.roar.reach, C.red, `rgba(255,120,80,${0.08 + Math.min(1, tr.pt / D.roar.warn) * 0.16})`, 0.95);
    if (tr.ph === 1 && tr.pat === 2 && tr.land) { ring(ctx, tr.land[0], tr.land[1], D.dive.r, C.red, 0.95, 2); disc(ctx, tr.land[0], tr.land[1], D.dive.r * 0.6, '#000', 0.3); }
    if (tr.ph === 2) ring(ctx, tr.at[0], tr.at[1], D.reach, C.gold, 0.45, 1, [6, 6]);
  }
  if (M.id === 'wq_beacon' && wqHas(me, 'vent_lit') && !wqHas(me, 'ember_got')) {   // 불씨가 살아난 석등 — 둘째 통풍구 앞
    if (!cell(ctx, 'props', 3, 1200, 745, 170)) lampFallback(ctx, 1200, 745, true, time);
    disc(ctx, 1200, 705, 34 + Math.sin(time * 5) * 5, '#ff9a4a', 0.14);
  }
}

/* ── 사람과 앞뒤를 맞추는 몸 — 회랑 석상 셋 · 잠든 / 깨어난 / 결투 와이번 ── */
export function wqBodies(me, mapId) {
  if (!me || me.map !== mapId || !wqMap(mapId)) return [];
  const tr = wqView(me)?.tr, out = [];
  if (mapId === 'wq_return') { const p = aqWyvernAt(me, wqView(me)); if (p) out.push({ y: p.y, wqBody: { k: 'wyvern', ...p, sleep: false, duel: false, k2: AQ_WY_K } }); }
  if (mapId === 'wq_gallery') T.gallery.statues.forEach(([x, y], i) => out.push({ y, wqBody: { k: 'statue', x, y, roar: tr && tr.id === 'gallery' && tr.roar > 0 ? (i === tr.mark ? 2 : 1) : 0 } }));
  if (mapId === 'wq_sanctum') {
    const duel = tr && tr.id === 'duel' ? tr : null;
    const at = duel ? duel.at : T.duel.at;
    out.push({ y: at[1], wqBody: { k: 'wyvern', x: at[0], y: at[1], hz: duel ? duel.hz : 0, sleep: !wqHas(me, 'awakened'), duel: !!duel, fl: me.x < at[0] ? 1 : 0, breath: duel && duel.ph === 1 && duel.pat === 1 } });
  }
  return out;
}
// 잠든 용 — 사용자 그림(11월 25일). 아주 크게, 머리는 오른쪽(목 아래 조사 자리 쪽)
// w 그릴 너비 · foot 낱장 안 발 높이 · z 머리 위 숨소리 자리(발 기준)
export const SLEEP_DRAGON = { w: 1150, foot: 0.97, flip: 1, breathe: 0.012, z: [260, -300] };
function sleepDragon(ctx, x, y, k) {
  const im = img('sleeping-dragon'); if (!im) return false;
  const { w, foot, flip, breathe } = SLEEP_DRAGON, h = w * im.naturalHeight / im.naturalWidth;
  ctx.save();                                                         // 바닥 그림자 — 가운데만 짙고 가장자리로 흐려진다(딱딱한 회색 타원이 보이던 것, 11월 25일)
  ctx.translate(x, y - 14); ctx.scale(1, 0.12);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.42);
  gr.addColorStop(0, 'rgba(28,26,42,0.38)'); gr.addColorStop(0.6, 'rgba(28,26,42,0.2)'); gr.addColorStop(1, 'rgba(28,26,42,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, w * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1 + breathe * k);                          // 숨 — 발을 축으로 아주 조금 부푼다
  ctx.drawImage(im, -w / 2, -h * foot, w, h);
  ctx.restore();
  return true;
}
export function drawWqBody(ctx, b, time) {
  const { x, y } = b;
  if (b.k === 'statue') {
    if (!cell(ctx, 'props', 4 + (b.roar ? 1 : 0), x, y, 220)) { ctx.save(); ctx.fillStyle = '#76716a'; ctx.fillRect(x - 50, y - 200, 100, 200); ctx.restore(); }
    if (b.roar === 2) disc(ctx, x, y - 160, 24, '#ff6a4a', 0.4);
    return;
  }
  if (b.k === 'wyvern') {
    const k = 0.5 + Math.sin(time * 0.9) * 0.5;
    const big = b.sleep && sleepDragon(ctx, x, y, k);
    if (!big) {
      const u = { x, y, hz: b.hz || 0, sit: b.hz > 20 ? 0 : 1, t: 9, left: 9, f: b.breath ? 0.1 : 9, fl: b.fl, dv: 0 };
      ctx.save();
      if (b.k2) { ctx.translate(x, y); ctx.scale(b.k2, b.k2); ctx.translate(-x, -y); }   // 귀환로 — 좁은 다리라 작게(아르카디온 획득)
      if (b.sleep) ctx.globalAlpha = 0.92;
      drawWyvernUnit(ctx, { u, v: { tint: 'plain', aw: 0 } }, time, SQ, 1);
      ctx.restore();
    }
    if (b.sleep) {                                                    // 성에 — 숨 쉴 때마다 옆구리 얼음이 녹았다 언다
      const sw = big ? SLEEP_DRAGON.w * 0.8 : 440, sh = big ? 260 : 90, n = big ? 40 : 18;
      ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * k; ctx.fillStyle = C.frost;
      for (let i = 0; i < n; i++) { const px = x - sw / 2 + ((i * 53) % sw), py = y - 30 - ((i * 37) % sh); ctx.fillRect(px, py, 3, 3); }
      ctx.restore();
      const [zx, zy] = big ? [x + SLEEP_DRAGON.z[0], y + SLEEP_DRAGON.z[1]] : [x + 150, y - 150];
      ctx.save(); ctx.font = "16px 'Do Hyeon', sans-serif"; ctx.fillStyle = `rgba(214,230,242,${0.3 + 0.3 * k})`; ctx.textAlign = 'center'; textUp(ctx, zx, zy); ctx.fillText('z', zx, zy - k * 10); ctx.restore();
    }
  }
}
export { WQ_ROCKS };

/* ── 아르카디온 획득 「돌아올 길을 지킨 검」 그림(11월 27일) ─────────────
   바닥은 바람다리 그림을 저녁빛으로 물들인 story/ground/wq_return.webp. 쇠창살 문은 gates.webp(시련의 문) 낱장을 쓰고,
   검집 · 고정쇠 · 표식 · 돌판 틈 · 검날은 상태마다 코드로 그린다(바닥 그림과 따로 — 잠김 · 풀림이 바로 보인다) */
const RED_LINE = 'rgba(214,72,58,';
const AQ_WY_K = 0.5;                                                  // 귀환로의 아스라 크기 — 다리 폭(220)에 맞춘다
// 칼등 정상 — 속이 빈 붉은 검집과 돌문으로 이어지는 붉은 선 · 장면 중 바위 틈 먼지
function drawAqRidge(ctx, me, time) {
  if (!me || me.map !== 'blade-ridge' || !aqReady(me)) return;
  const sc = wqView(me)?.sc, scene = sc && sc.k === 'summit' ? sc.t : -1;
  if (!wqHas(me, 'a_start') && scene < 0) return;
  const P = AQ.scene, show = scene < 0 ? 1 : Math.min(1, Math.max(0, (scene - P.dust) / 0.8));
  if (show <= 0) return;
  const [sx, sy] = AQ.sheath, [dx, dy] = AQ.door;
  ctx.save(); ctx.globalAlpha *= show;
  ctx.strokeStyle = `${RED_LINE}${0.55 + Math.sin(time * 2.4) * 0.2})`; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -time * 24;
  ctx.beginPath(); ctx.moveTo(sx + 14, sy - 6); ctx.quadraticCurveTo((sx + dx) / 2 + 30, (sy + dy) / 2 + 30, dx, dy - 6); ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(sx, sy); ctx.rotate(-0.5);                          // 검집 — 비스듬히 바위에 기대 있다
  ctx.fillStyle = '#7a2a24'; ctx.strokeStyle = '#3a1210'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-6, -58); ctx.lineTo(6, -58); ctx.lineTo(5, 4); ctx.lineTo(0, 12); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9a86a'; ctx.fillRect(-8, -62, 16, 5); ctx.fillStyle = '#1b1210'; ctx.fillRect(-3, -60, 6, 3);   // 빈 입구
  ctx.restore();
  if (scene >= P.dust && scene < P.dust + 1.6) {                     // 바위 틈에서 먼지가 떨어진다
    ctx.save(); ctx.fillStyle = '#d8c8b0';
    for (let i = 0; i < 14; i++) { const u = ((scene - P.dust) * 0.8 + i * 0.07) % 1; ctx.globalAlpha = 0.6 * (1 - u); ctx.fillRect(dx - 60 + ((i * 37) % 120), dy - 150 + u * 120, 3, 3); }
    ctx.restore();
  }
}
const SEAMS = [790, 1010, 1230];                                      // 돌판 사이 이음매(바닥 그림의 고리 홈 사이)
function drawAqGround(ctx, me, time) {
  if (!me || me.map !== 'wq_return' || !aqReady(me)) return;
  const tr = wqView(me)?.tr, at = tr && tr.id === 'anchor' ? tr : null;
  // 돌판 이음매 — 안 잠근 돌판은 검게 벌어져 있고 잠그면 금빛으로 붙는다
  SEAMS.forEach((y, i) => {
    const done = wqHas(me, `a_lock${i + 1}`);
    ctx.save();
    if (!done) { ctx.fillStyle = 'rgba(12,8,10,.55)'; ctx.beginPath(); ctx.moveTo(1094, y - 6); for (let x = 1094; x <= 1306; x += 14) ctx.lineTo(x, y - 6 + ((x * 7) % 9)); ctx.lineTo(1306, y + 8); ctx.lineTo(1094, y + 6); ctx.fill(); }
    ctx.strokeStyle = done ? 'rgba(242,196,138,.75)' : 'rgba(40,24,22,.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(1094, y); ctx.lineTo(1306, y); ctx.stroke(); ctx.restore();
  });
  // 검날 홈 두 줄 — 귀환로 머리에서 끝 돌판까지
  ctx.save(); ctx.strokeStyle = wqHas(me, 'a_return') ? 'rgba(242,196,138,.35)' : `${RED_LINE}.35)`; ctx.lineWidth = 1;
  for (const x of [1186, 1214]) { ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x, AQ.sword[1] - 10); ctx.stroke(); }
  ctx.restore();
  if (!at) return;
  // 시련 중 — 지금 돌판의 위 · 아래 표식, 붙들기 자리, 내려찍기 예고(붉은 원)
  [0, 1].forEach((m) => { const [x, y] = aqMarkAt(at.n, m); disc(ctx, x, y, 46, '#2a201c', 0.4); ring(ctx, x, y, 46, at.wy === m ? C.gold : C.line, 0.9, at.wy === m ? 2 : 1); });
  if (at.n === 2 && at.ph === 2) ring(ctx, AQ.holdX, AQ.slabs[2], 48, at.hold ? C.gold : C.warn, 0.9, 1, at.hold ? null : [5, 5]);
  ring(ctx, AQ.anchorX, AQ.slabs[at.n], 40, at.ph === 2 ? C.gold : C.line, at.ph === 2 ? 0.95 : 0.5, at.ph === 2 ? 2 : 1, at.ph === 2 ? null : [4, 6]);
  if (at.ph === 1 && at.side >= 0) {
    const [x, y] = aqMarkAt(at.n, at.side), k = Math.min(1, at.pt / AQ.warn);
    ring(ctx, x, y, AQ.slamR, C.red, 0.95, 2);
    disc(ctx, x, y, AQ.slamR * k, C.red, 0.2);
    // 옛 기사의 잔영 — 표식 위에 칼을 든 흐린 그림자
    ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * k; ctx.fillStyle = '#3a2a3a';
    ctx.beginPath(); ctx.ellipse(x + 60, y - 70, 22, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9b8c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 60, y - 110); ctx.lineTo(x + 30 - k * 40, y - 180 + k * 60); ctx.stroke();
    ctx.restore();
  }
  if (at.n === 2 && at.ph === 2 && !at.hold) {                       // 끝 돌판이 기운다
    ctx.save(); ctx.strokeStyle = 'rgba(255,138,138,.6)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
    const w = Math.sin(time * 5) * 6; ctx.beginPath(); ctx.moveTo(1094, SEAMS[1] + w); ctx.lineTo(1306, SEAMS[2] - w); ctx.stroke(); ctx.restore();
  }
}
// 귀환로 조사 자리 — 돌려주는 값은 이름표 높이
function drawAqSpot(ctx, me, s, time) {
  const [x, y] = s.at, id = s.id, a = s.act;
  if (a.set && !wqHas(me, a.set)) fresh(ctx, x, y, time);              // 아직 안 본 흔적 — 은은한 빛
  if (id === 'ra-gate') { const open = wqOpen(me, s); if (!cell(ctx, 'gates', GATE_ROW.tgate * 2 + (open ? 1 : 0), x, y + 70, 220)) gateFallback(ctx, 'tgate', open, x, y + 70, 180); return 160; }
  if (id === 'ra-chain') { ctx.save(); ctx.strokeStyle = '#5a5048'; ctx.lineWidth = 3; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x + 14 + i * 13, y - 10 + i * 4, 7, 4, 0.3, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); return 60; }
  if (id === 'ra-claw') { ctx.save(); ctx.strokeStyle = 'rgba(40,26,22,.7)'; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 18 - 30, y + 20); ctx.lineTo(x + i * 18 + 20, y - 24); ctx.stroke(); } ctx.restore(); return 60; }
  if (id === 'ra-groove') { ctx.save(); ctx.strokeStyle = 'rgba(40,26,22,.6)'; ctx.lineWidth = 2; for (const o of [-8, 8]) { ctx.beginPath(); ctx.moveTo(x - 60, y + o * 0.3 - 10 + o); ctx.lineTo(x + 40, y + o); ctx.stroke(); } ctx.restore(); return 50; }
  if (id === 'ra-stone') { if (!cell(ctx, 'rocks', 3, x, y, 120)) rockFallback(ctx, x, y, 110, false, false); return 100; }   // 쓰러진 표지석 — 서리봉 바위 낱장
  if (id === 'ra-mark') {                                               // 위쪽 표식 — 그을린 홈, 불을 밝히면 타오른다
    ctx.save(); ctx.strokeStyle = '#2a1c18'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 60, 18, 0, Math.PI * 2); ctx.moveTo(x, y - 84); ctx.lineTo(x, y - 36); ctx.stroke(); ctx.restore();
    if (wqHas(me, 'a_fire')) { disc(ctx, x, y - 60, 14 + Math.sin(time * 7) * 3, '#ff9a4a', 0.75); disc(ctx, x, y - 60, 40, '#ff9a4a', 0.12); }
    return 100;
  }
  if (id === 'ra-latch') {                                              // 아래쪽 바위 — 불을 밝히면 숨은 돌계단이 보인다
    const lit = wqHas(me, 'a_fire');
    ctx.save();
    if (!cell(ctx, 'rocks', lit ? 2 : 1, x + 20, y, 130)) rockFallback(ctx, x, y, 110, false, lit);
    if (lit) {
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#5a524a' : '#7a7068'; ctx.fillRect(x - 70 - i * 14, y - 6 + i * 12, 46, 10); }
      ctx.fillStyle = wqHas(me, 'a_latch') ? '#c9a86a' : '#7a3a2a'; ctx.fillRect(x - 6, y - 34, 12, 18);
      disc(ctx, x - 70, y + 20, 30, '#ff9a4a', 0.1);
    }
    ctx.restore();
    return 120;
  }
  if (id.startsWith('ra-anchor')) {                                      // 고정쇠 — 난간 홈 안 쇠 고리. 잠그면 금빛
    const done = wqHas(me, `a_lock${a.n + 1}`);
    ctx.save(); ctx.fillStyle = done ? '#b08a4a' : '#5a3a30'; ctx.strokeStyle = done ? '#f2c48a' : '#2a1a16'; ctx.lineWidth = 1;
    ctx.fillRect(x - 10, y - 30, 20, 26); ctx.strokeRect(x - 9.5, y - 29.5, 19, 25);
    ctx.beginPath(); ctx.arc(x, y - 34, 8, Math.PI, 0); ctx.stroke(); ctx.restore();
    return 50;
  }
  if (id === 'ra-sword') {                                              // 끝 돌판 아래 검날 — 장력(붉은 떨림)이 풀리면 금빛
    if (wqHas(me, 'a_got')) { ring(ctx, x, y, 24, C.line, 0.5); return 40; }
    const free = wqHas(me, 'a_return'), sh = free ? 0 : Math.sin(time * 30) * 1.2;
    ctx.save(); ctx.translate(x + sh, y); ctx.rotate(-0.12);
    ctx.fillStyle = '#c8ccd4'; ctx.beginPath(); ctx.moveTo(-5, -70); ctx.lineTo(5, -70); ctx.lineTo(4, 0); ctx.lineTo(0, 8); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a2a24'; ctx.fillRect(-14, -76, 28, 6); ctx.fillStyle = '#3a1a16'; ctx.fillRect(-3, -98, 6, 22);
    ctx.restore();
    disc(ctx, x, y - 40, 30 + Math.sin(time * 3) * 4, free ? '#f2c48a' : '#d6483a', free ? 0.22 : 0.14);
    return 110;
  }
  if (id === 'ra-home' && !wqHas(me, 'a_return')) floorGlow(ctx, x, y, 60, time);
  return 50;
}
