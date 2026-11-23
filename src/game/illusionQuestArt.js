/* ── Illusionist 005 획득 루트 그림 — 문 · 구조물(열림 · 닫힘) · 인물 · 시험 표적(11월 23일) ─────────────
   바닥은 Codex 로 뽑은 story/ground/iq_*.webp(storyArt.js drawStoryBackdrop, 없으면 코드 바닥).
   문 · 거울문 · 막 · 무대 아래 문 · 유리함은 바닥과 따로 Codex 시트(illusion-quest/doors.webp, 2열 × 5줄 · 칸 512 × 256 — 왼쪽 닫힘 · 오른쪽 열림)로 그려
   열렸는지 한눈에 보인다(사용자 지시 11월 23일). 길손 · 상인 · 관객은 people.webp(3칸 512). 못 불러오면 코드 도형으로 대신한다.
   마을 · 바깥 장소(원래 맵)에서는 그림 없이 가까이 갔을 때 이름표만 — 새 건물 · 표식을 두지 않는다(사용자 지시) */
import { textUp } from "./bodyScale.js";
import { IQ_SPOTS, IQ_TRIAL as T, IQ_FOREST, iqMap, iqSpotMap } from './illusionQuestData.js';
import { iqSpotShown, iqView, iqOpen, iqDial, iqClones, iqDoll } from './illusionQuest.js';

const SQ = 0.78;
const BASE = '/assets/game/rpg/illusion-quest/';
export const IQ_ART = { doors: { cols: 2, cw: 512, ch: 256 }, people: { cols: 3, cw: 512, ch: 512 } };
const DOOR_ROW = { door: 0, mirror: 1, curtain: 2, under: 3, glassbox: 4 };
const PEOPLE = { guide: 0, merchant: 1, audience: 2 };
const C = { lil: '#d9c9f2', line: 'rgba(217,201,242,.7)', warn: '#f0c98a', red: '#ff8a8a', ink: 'rgba(28,22,38,.86)', text: '#efe8fa', card: '#e9dcc0' };
const imgs = new Map();
function img(name) {
  if (typeof Image === 'undefined') return null;
  if (!imgs.has(name)) { const im = new Image(); imgs.set(name, im); im.onerror = () => imgs.set(name, null); im.src = `${BASE}${name}.webp`; }
  const im = imgs.get(name);
  return im && im.complete && im.naturalWidth ? im : null;
}
// 시트 한 칸을 발(x, y) 기준으로 — w 는 그릴 너비
function cell(ctx, sheet, i, x, y, w, a = 1) {
  const im = img(sheet); if (!im) return false;
  const { cols, cw, ch } = IQ_ART[sheet], h = w * ch / cw;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.drawImage(im, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch, x - w / 2, y - h * 0.94, w, h);
  ctx.restore();
  return true;
}
function label(ctx, text, x, y, color = C.text) {
  ctx.save(); textUp(ctx, x, y); ctx.font = "14px 'Do Hyeon', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2, y - 11, w, 22);
  ctx.strokeStyle = 'rgba(217,201,242,.45)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + .5, y - 10.5, w - 1, 21);
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
const ring = (ctx, x, y, r, color, a = 1, w = 1, dash) => { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.ellipse(x, y, r, r * SQ, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
const disc = (ctx, x, y, r, color, a) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r, r * SQ, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };

/* ── 조사 자리 — 사람과 앞뒤를 맞춘다(rpgArt 가 y 로 줄 세움) ── */
export function iqSpotsOn(me, mapId) {
  if (!me || !me.bag || !iqSpotMap(mapId)) return [];
  return IQ_SPOTS.filter((s) => s.map === mapId && !s.npc && iqSpotShown(me, s));
}
// 바닥 그림 위에 따로 서는 구조물 — 닫힘(왼쪽 칸) · 열림(오른쪽 칸)
function doorOf(s) {
  if (s.id === 'th-under') return 'under';
  return DOOR_ROW[s.look] != null ? s.look : null;
}
// 코드 대체 그림 — 문틀과 문짝(열리면 안쪽이 밝다)
function doorFallback(ctx, kind, open, x, y) {
  const w = kind === 'curtain' ? 150 : 96, h = kind === 'under' ? 80 : 170;
  ctx.save();
  ctx.fillStyle = '#2d2433'; ctx.fillRect(x - w / 2 - 8, y - h - 8, w + 16, h + 8);
  ctx.fillStyle = open ? (kind === 'mirror' ? '#cbbcf0' : '#140f1b') : kind === 'curtain' ? '#6e2a33' : kind === 'mirror' ? '#4b4655' : '#5c4232';
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + .5, y - h + .5, w - 1, h - 1);
  ctx.restore();
}
export function drawIqSpot(ctx, me, s, time, near) {
  const [x, y] = s.at;
  let top = 70;
  if (iqMap(s.map)) {
    const kind = doorOf(s), pi = PEOPLE[s.look];
    if (kind) {
      const open = iqOpen(me, s), w = kind === 'glassbox' ? 260 : kind === 'under' ? 300 : 360;
      if (!cell(ctx, 'doors', DOOR_ROW[kind] * 2 + (open ? 1 : 0), x, y, w)) doorFallback(ctx, kind, open, x, y);
      if (open && kind === 'mirror') disc(ctx, x, y - 90, 50 + Math.sin(time * 2) * 4, '#d9c9f2', 0.12);
      top = w * 0.45;
    } else if (pi != null) {
      // 길손 · 상인 · 관객 — 길손은 발자국이 없다(그림자를 그리지 않는다)
      if (s.look !== 'guide') disc(ctx, x, y, 46, '#000', 0.25);
      if (!cell(ctx, 'people', pi, x, y, 230, s.look === 'guide' ? 0.9 + Math.sin(time * 1.3) * 0.06 : 1)) { disc(ctx, x, y - 60, 26, '#7a7486', 1); disc(ctx, x, y - 110, 16, '#a59cb4', 1); }
      top = 220;
    } else if (s.act.k === 'fork') {
      // 갈림길 표지판 — 지금 구간의 글
      const t = IQ_FOREST.sign[Math.min(2, iqDial(me, 'fk'))][s.act.dir];
      ctx.save(); ctx.fillStyle = '#4a3626'; ctx.fillRect(x - 3, y - 70, 6, 70);
      ctx.fillStyle = '#7a5a3c'; ctx.fillRect(x - 46, y - 92, 92, 26); ctx.strokeStyle = '#2a1d13'; ctx.lineWidth = 1; ctx.strokeRect(x - 45.5, y - 91.5, 91, 25); ctx.restore();
      if (t.includes('「')) disc(ctx, x, y - 79, 8, '#f6e5bb', 0.5 + Math.sin(time * 3) * 0.2);
      top = 100;
    } else if (s.act.k !== 'trace' && s.act.k !== 'trial') {
      // 바닥 그림 속 물건 — 은빛 반짝임 하나(조사할 수 있는 자리)
      disc(ctx, x, y - 30, 5 + Math.sin(time * 3 + x) * 1.5, '#efe8fa', 0.55);
    }
  }
  if (near) label(ctx, s.name, x, y - top - 8);
}

/* ── 땅 층(사람보다 먼저) — 밟는 출구 빛 · 거울 칸막이 · 시험 표시 ── */
function floorGlow(ctx, x, y, r, time) {
  const a = 0.22 + Math.sin(time * 2) * 0.08;
  ctx.save(); ctx.strokeStyle = `rgba(217,201,242,${a})`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.9 * SQ * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = `rgba(170,150,220,${a * 0.3})`; ctx.fill(); ctx.restore();
}
export function drawIqGround(ctx, me, M, time) {
  if (!M.iq) return;
  for (const g of M.gates) if (g.eqGate) floorGlow(ctx, g.x, g.y, g.r, time);
  if (M.id === 'iq_mirror') {                         // 유리 칸막이 — 동쪽과 서쪽이 걸어서 이어지지 않는다
    ctx.save(); ctx.fillStyle = 'rgba(190,210,240,.10)'; ctx.fillRect(1188, M.top, 24, M.h - M.top);
    ctx.strokeStyle = 'rgba(220,232,250,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1188.5, M.top); ctx.lineTo(1188.5, M.h); ctx.moveTo(1211.5, M.top); ctx.lineTo(1211.5, M.h); ctx.stroke(); ctx.restore();
  }
  if (!me || me.map !== M.id || M.id !== 'iq_stage') return;
  const tr = iqView(me)?.tr;
  if (!tr) { ring(ctx, T.start[0], T.start[1], 90, C.lil, 0.5 + Math.sin(time * 2) * 0.2, 1, [6, 6]); return; }
  if (tr.act === 0 && tr.step === 2) {
    ring(ctx, T.padStart[0], T.padStart[1], 60, C.line, 0.5);
    T.pads.forEach((p, i) => ring(ctx, p[0], p[1], T.padR, tr.lit[i] ? C.lil : C.warn, tr.lit[i] ? 0.9 : 0.7, tr.lit[i] ? 2 : 1, tr.lit[i] ? null : [5, 5]));
  }
  if (tr.act === 1) {
    ring(ctx, T.blinkFrom[0], T.blinkFrom[1], T.blinkR, tr.task[1] ? C.line : C.lil, 0.7, 1, [6, 6]);
    ring(ctx, T.blinkTo[0], T.blinkTo[1], T.blinkR, tr.task[1] ? C.lil : C.warn, 0.8, tr.task[1] ? 2 : 1);
    for (const w of tr.wn) { ring(ctx, w.x, w.y, T.rain.r, C.red, 0.9); disc(ctx, w.x, w.y, T.rain.r * (1 - Math.max(0, w.left) / T.rain.warn), C.red, 0.18); }
  }
  if (tr.act === 2) ring(ctx, T.mirror[0], T.mirror[1], 220, C.line, 0.5, 1, [4, 6]);
  if (tr.act === 2 && tr.house) ring(ctx, tr.house.x, tr.house.y, 320, '#cfe0f6', 0.6, 1);
}

/* ── 시험 표적 · 분신 — 사람과 앞뒤를 맞춘다 ── */
export function iqTrialBodies(me, mapId) {
  const tr = me && me.map === mapId && mapId === 'iq_stage' ? iqView(me)?.tr : null;
  if (!tr) return [];
  const out = [];
  if (tr.act === 0 && tr.step === 0) {
    T.real.forEach((p, i) => { if (!tr.hit[i]) out.push({ y: p[1], iqBody: { k: 'real', x: p[0], y: p[1] } }); });
    T.fake.forEach((p) => out.push({ y: p[1], iqBody: { k: 'fake', x: p[0], y: p[1] } }));
  }
  if (tr.act === 0 && tr.step === 1) out.push({ y: T.bundle.at[1], iqBody: { k: 'bundle', x: T.bundle.at[0], y: T.bundle.at[1] } });
  if (tr.act === 1) {
    const [x, y] = iqDoll(tr);
    out.push({ y, iqBody: { k: 'doll', x, y, bind: tr.bind } });
    out.push({ y: T.panel[1], iqBody: { k: 'panel', x: T.panel[0], y: T.panel[1], done: tr.task[2] } });
  }
  if (tr.act === 2) {
    out.push({ y: T.target[1], iqBody: { k: 'target', x: T.target[0], y: T.target[1], claps: tr.claps } });
    out.push({ y: T.mirror[1], iqBody: { k: 'mirror', x: T.mirror[0], y: T.mirror[1] } });
  }
  if (tr.act === 3) iqClones(tr, me.x, me.y).forEach(([x, y]) => out.push({ y, iqBody: { k: 'clone', x, y } }));
  return out;
}
export function drawIqBody(ctx, b, time) {
  const { x, y } = b;
  ctx.save();
  if (b.k === 'real' || b.k === 'fake') {
    // 판지 표적(실물) · 반사 표적(흐릿하게 일렁인다) — 겉모양은 거의 같다. 실물만 아래 그림자가 있다
    if (b.k === 'real') disc(ctx, x, y, 26, '#000', 0.3);
    ctx.globalAlpha = b.k === 'fake' ? 0.78 + Math.sin(time * 5 + x) * 0.1 : 1;
    ctx.fillStyle = '#5a4634'; ctx.fillRect(x - 3, y - 50, 6, 50);
    ctx.fillStyle = C.card; ctx.beginPath(); ctx.arc(x, y - 78, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8c3b4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 78, 19, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#8c3b4a'; ctx.beginPath(); ctx.arc(x, y - 78, 7, 0, Math.PI * 2); ctx.fill();
  } else if (b.k === 'bundle') {
    for (let i = 0; i < T.bundle.n; i++) { ctx.fillStyle = i % 2 ? '#efe4cc' : C.card; ctx.strokeStyle = '#5a4634'; ctx.lineWidth = 1; ctx.fillRect(x - 22 + i * 2, y - 26 - i * 6, 44, 30); ctx.strokeRect(x - 21.5 + i * 2, y - 25.5 - i * 6, 43, 29); }
    ring(ctx, x, y, T.bundle.r, C.lil, 0.6, 1, [5, 5]);
  } else if (b.k === 'doll') {
    ctx.fillStyle = '#efe4cc'; ctx.strokeStyle = '#5a4634'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 90); ctx.lineTo(x + 22, y - 40); ctx.lineTo(x + 12, y); ctx.lineTo(x - 12, y); ctx.lineTo(x - 22, y - 40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - 100, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (b.bind > 0) ring(ctx, x, y - 40, 70, C.lil, 0.9, 2);
  } else if (b.k === 'panel') {
    ctx.fillStyle = b.done ? '#4c4258' : '#6a5a3c'; ctx.fillRect(x - 70, y - 120, 140, 110); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(x - 69.5, y - 119.5, 139, 109);
    ctx.fillStyle = b.done ? '#cfc3e8' : '#2a1f16'; ctx.fillRect(x - 14, y - 76, 28, 22);
  } else if (b.k === 'target') {
    disc(ctx, x, y, 26, '#000', 0.3);
    ctx.fillStyle = '#5a4634'; ctx.fillRect(x - 3, y - 50, 6, 50);
    ctx.fillStyle = C.card; ctx.beginPath(); ctx.arc(x, y - 78, 32, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < b.claps; i++) ring(ctx, x, y - 30, 50 + i * 18, C.lil, 0.7);
  } else if (b.k === 'mirror') {
    ctx.fillStyle = '#3c3548'; ctx.fillRect(x - 46, y - 190, 92, 190);
    ctx.fillStyle = `rgba(200,215,240,${0.5 + Math.sin(time * 2) * 0.1})`; ctx.fillRect(x - 36, y - 180, 72, 170);
  } else if (b.k === 'clone') {
    // 내 모습의 분신 — 넷 다 같은 모양. 움직임만 다르다
    disc(ctx, x, y, 24, '#000', 0.25);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#b7a9d8'; ctx.beginPath(); ctx.ellipse(x, y - 40, 20, 38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 90, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#efe8fa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 40, 20, 38, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
