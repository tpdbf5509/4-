/* ── Necromancer 004 획득 루트 그림 — 조사 자리 · 횃불 · 미믹 · 빛 띠 · 시험(11월 20일) ─────────────
   그림은 Codex 로 만든 시트(necro-quest/props.webp 4×4 칸 256 · generals.webp 4×2 칸 384). 못 불러오면 코드 도형으로 대신한다.
   시험 병사 · 적은 그림자 군주 직업 그림(necroArt.js drawNecroShadow)을 빌려 쓴다. 코드로 그리는 것은 1px 예고선 · 발판 · 이름표뿐.
   판정과 같은 함수(nqSpotShown · nqLaneState · nqView)를 쓴다. 마을(dawnwood)에서는 쪽문 이름표 말고는 아무것도 그리지 않는다 */
import { textUp } from "./bodyScale.js";
import { NQ_SPOTS, NQ_HAZARDS, NQ_ART as A, NQ_TRIALS, nqMap, nqSpotMap } from './necroQuestData.js';
import { nqSpotShown, nqHas, nqView, nqCond, nqTorchLit, nqLaneState, NQ_MIMIC_IDS } from './necroQuest.js';
import { drawNecroShadow } from './necroArt.js';

const SQ = 0.78, FEET = 0.92;
const C = { vio: '#cdb8f0', line: 'rgba(205,184,240,.75)', warn: '#f0c98a', red: '#ff8a8a', ink: 'rgba(24,18,32,.86)', text: '#eee6fa' };
const imgs = new Map();
function img(name) {
  if (typeof Image === 'undefined') return null;
  if (!imgs.has(name)) { const im = new Image(); imgs.set(name, im); im.onerror = () => imgs.set(name, null); im.src = `${A.base}${name}.webp`; }
  const im = imgs.get(name);
  return im && im.complete && im.naturalWidth ? im : null;
}
const SHEETS = { props: [4, A.cell], generals: [4, A.gcell] };
// 시트 한 칸을 발(x, y) 기준으로 — size 는 그릴 너비 · cut 은 위에서 잘라 낼 몫(불 꺼진 횃불)
function cell(ctx, sheet, i, x, y, size, o = {}) {
  const im = img(sheet); if (!im) return false;
  const [cols, cw] = SHEETS[sheet], sx = (i % cols) * cw, sy = Math.floor(i / cols) * cw, cut = o.cut || 0;
  ctx.save(); ctx.globalAlpha *= o.a == null ? 1 : o.a;
  if (o.filter) ctx.filter = o.filter;
  ctx.translate(x, y); if (o.flip) ctx.scale(-1, 1);
  ctx.drawImage(im, sx, sy + cw * cut, cw, cw * (1 - cut), -size / 2, -size * FEET + size * cut, size, size * (1 - cut));
  ctx.restore();
  return true;
}
function label(ctx, text, x, y, color = C.text) {
  ctx.save(); textUp(ctx, x, y); ctx.font = "14px 'Do Hyeon', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2, y - 11, w, 22);
  ctx.strokeStyle = 'rgba(205,184,240,.45)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + .5, y - 10.5, w - 1, 21);
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
const ring = (ctx, x, y, r, color, a = 1, w = 1, dash) => { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.ellipse(x, y, r, r * SQ, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
const disc = (ctx, x, y, r, color, a) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r, r * SQ, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };

/* ── 조사 자리 — 사람과 앞뒤를 맞춘다(rpgArt 가 y 로 줄 세움). 마을에서는 그림 없이 이름표만(새 건물 · 표식을 두지 않는다) ── */
export function nqSpotsOn(me, mapId) {
  if (!me || !me.bag || !nqSpotMap(mapId)) return [];
  return NQ_SPOTS.filter((s) => s.map === mapId && nqSpotShown(me, s));
}
export function drawNqSpot(ctx, me, s, time, near) {
  const [x, y] = s.at, a = s.act, v = nqView(me);
  let top = 90;
  if (a.k === 'torch') {
    const lit = nqTorchLit(me, a.i);
    if (!cell(ctx, 'props', A.props.torch, x, y, 110, { cut: lit ? 0 : 0.28 })) disc(ctx, x, y - 50, 10, lit ? '#b996ff' : '#444', 1);
    if (lit) disc(ctx, x, y - 92, 22 + Math.sin(time * 9) * 3, '#b996ff', 0.18);
    top = 120;
  } else if (s.look && nqMap(s.map)) {
    const awake = a.k === 'mimic' && v && v.mim >= 0 && NQ_MIMIC_IDS[v.mim] === a.mid;
    const sealed = a.k === 'mimic' && nqHas(me, a.seal);
    const i = a.k === 'mimic' && awake && s.look.i === A.props.coffin ? A.props.coffinOpen : s.look.i;
    const bob = awake ? Math.sin(time * 18) * 3 : a.k === 'mimic' && !sealed ? Math.sin(time * 2.4) * 0.8 : 0;   // 숨 쉬듯 들썩이는 뚜껑 — 미믹의 단서
    const ghost = s.look.sheet === 'generals';
    const size = s.look.size * (ghost ? 1 : 1.3);
    if (ghost) disc(ctx, x, y, size * 0.28, '#1a0f26', 0.45);
    if (!cell(ctx, s.look.sheet, i, x, y + bob, size, { a: ghost ? 0.82 + Math.sin(time * 1.6) * 0.08 : 1 })) disc(ctx, x, y - 30, 26, '#4c3d5c', 1);
    top = size * 0.95;
  }
  if (near) label(ctx, s.name, x, y - top - 8);
}

/* ── 땅 층(사람보다 먼저) — 밟는 출구 · 열린 계단 · 관측소 빛 띠 · 시험 발판 ── */
function hatch(ctx, x, y, time) {
  const R = 66;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 4, R + 8, (R + 8) * SQ, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a4350'; ctx.strokeStyle = '#211c26'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, R, R * SQ, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#120e16'; ctx.beginPath(); ctx.ellipse(x, y, R - 14, (R - 14) * SQ, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a3240'; ctx.lineWidth = 5;   // 아래로 내려가는 돌계단
  for (let i = -1; i <= 1; i++) { const yy = y + i * 12; ctx.beginPath(); ctx.moveTo(x - 30 + i * 4, yy); ctx.lineTo(x + 30 - i * 4, yy); ctx.stroke(); }
  ctx.strokeStyle = C.vio; ctx.globalAlpha = 0.25 + Math.sin(time * 2) * 0.1; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y, R - 15, (R - 15) * SQ, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function floorGlow(ctx, x, y, r, time) {
  const a = 0.22 + Math.sin(time * 2) * 0.08;
  ctx.save(); ctx.strokeStyle = `rgba(205,184,240,${a})`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.9 * SQ * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = `rgba(150,110,210,${a * 0.3})`; ctx.fill(); ctx.restore();
}
export function drawNqGround(ctx, me, M, time) {
  if (!M.nq) return;
  for (const g of M.gates) { if (!g.eqGate) continue; if (g.hatch) hatch(ctx, g.x, g.y, time); floorGlow(ctx, g.x, g.y, g.r, time); }
  if (!me || !me.bag || me.map !== M.id) return;
  for (const s of NQ_SPOTS) if (s.map === M.id && s.hatch && nqSpotShown(me, s) && nqCond(me, s.act.need)) hatch(ctx, s.at[0], s.at[1], time);
  // 관측소 빛 띠 — 곧 쓸 띠는 바닥 줄이 희게(예고), 쓰는 띠는 보랏빛으로 덮는다(판정과 같은 nqLaneState)
  const t = Date.now() / 1000;
  for (const z of NQ_HAZARDS) {
    if (z.map !== M.id || (z.off && nqCond(me, z.off))) continue;
    for (const lane of z.lanes) {
      const st = nqLaneState(z, lane, t);
      if (st.on) { ctx.save(); ctx.fillStyle = 'rgba(200,170,255,.32)'; ctx.fillRect(0, lane.y0, M.w, lane.y1 - lane.y0); ctx.restore(); }
      else if (st.warn) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, lane.y0 + .5); ctx.lineTo(M.w, lane.y0 + .5); ctx.moveTo(0, lane.y1 - .5); ctx.lineTo(M.w, lane.y1 - .5); ctx.stroke(); ctx.restore(); }
    }
  }
  const tr = nqView(me)?.tr;
  if (!tr) return;
  const T = NQ_TRIALS[tr.id];
  // 발판 · 봉인석 · 목표 — 다음 차례만 밝게
  if (tr.id === 'path') T.pads.forEach((p, i) => ring(ctx, p[0], p[1], 70, i === tr.i ? C.vio : C.line, i < tr.i ? 0.25 : i === tr.i ? 0.9 : 0.5, i === tr.i ? 2 : 1));
  if (tr.id === 'echo') { const sc = T.scenes[tr.i] || []; T.plates.forEach((p, i) => ring(ctx, p[0], p[1], T.plateR, sc.includes(i) ? C.vio : C.line, sc.includes(i) ? 0.95 : 0.35, sc.includes(i) ? 2 : 1)); }
  if (tr.id === 'seal') T.stones.forEach((p, i) => { ring(ctx, p[0], p[1], T.stoneR, i < tr.i ? C.line : C.warn, i < tr.i ? 0.3 : 0.75); cell(ctx, 'props', A.props.glyph, p[0], p[1] + 30, 110, { a: i < tr.i ? 0.4 : 1 }); });
  if (tr.id === 'escort') ring(ctx, T.goal.at[0], T.goal.at[1], T.goal.r, C.vio, 0.7, 1, [6, 6]);
  if (tr.id === 'palace' && tr.ph === 1) ring(ctx, T.altar.at[0], T.altar.at[1], T.altar.r, tr.altSh ? C.vio : C.line, 0.8, tr.altSh ? 2 : 1);
  if (tr.decoy) disc(ctx, tr.decoy.x, tr.decoy.y, 40, '#9b7cd8', 0.35);
  for (const w of tr.wn) {                      // 예고 원 — 남은 시간만큼 안쪽이 찬다
    ring(ctx, w.x, w.y, w.r, C.red, 0.9);
    disc(ctx, w.x, w.y, w.r * (1 - Math.max(0, w.left) / (w.d || 1)), C.red, 0.18);
  }
}

/* ── 시험 병사 · 적 — 사람과 앞뒤를 맞춘다 ── */
const SOL_T = { ally: 'skeletal', hound: 'wolf', knight: 'orc', chaser: 'necro' };   // 그림자 그림을 빌릴 몹 모양
export function nqTrialBodies(me, mapId) {
  const tr = me && me.map === mapId ? nqView(me)?.tr : null;
  if (!tr) return [];
  const out = tr.al.map((a, i) => ({ y: a.y, nqAlly: { ...a, i } }));
  tr.fo.forEach((f, i) => out.push({ y: f.y, nqFoe: { ...f, i } }));
  if (tr.ghost) out.push({ y: tr.ghost.y, nqGhost: tr.ghost });
  return out;
}
export function drawNqAlly(ctx, a, time) {
  drawNecroShadow(ctx, { id: a.i + 1, t: SOL_T.ally, k: 'knight', g: 1, x: a.x, y: a.y, dir: 1, born: 9, atk: 0, mv: 0, walk: time * 60 });
  if (a.sh) ring(ctx, a.x, a.y - 30, 34, C.vio, 0.8, 1);
  for (let j = 0; j < a.hp; j++) ctx.fillRect(Math.round(a.x) - 8 + j * 6, Math.round(a.y) + 10, 4, 2);
}
export function drawNqFoe(ctx, f, time) {
  if (f.k === 'pylon') return void (cell(ctx, 'props', A.props.crystal, f.x, f.y, 140) || disc(ctx, f.x, f.y - 40, 30, '#7a4fb8', 1));
  if (f.k === 'post') return void (cell(ctx, 'props', A.props.banner, f.x, f.y, 120) || disc(ctx, f.x, f.y - 40, 20, '#6b5040', 1));
  if (f.k === 'lord') { disc(ctx, f.x, f.y, 70, '#120a1c', 0.5); cell(ctx, 'generals', A.generals.king, f.x, f.y, 300, { a: 0.85, filter: 'hue-rotate(-30deg) saturate(1.3)' }); bar(ctx, f, 300); return; }
  ring(ctx, f.x, f.y, 26, C.red, 0.85);
  drawNecroShadow(ctx, { id: 100 + f.i, t: SOL_T[f.k] || 'wolf', k: f.k === 'knight' ? 'knight' : 'assassin', g: 0, x: f.x, y: f.y, dir: f.ax, born: 9, atk: 0, mv: 1, walk: time * 60 });
  if (f.max > 1) bar(ctx, f, 80);
}
function bar(ctx, f, h) {
  const w = Math.min(160, 30 + f.max * 1.2), p = Math.max(0, f.hp / f.max);
  ctx.save(); ctx.fillStyle = C.ink; ctx.fillRect(f.x - w / 2, f.y - h - 8, w, 5); ctx.fillStyle = C.red; ctx.fillRect(f.x - w / 2, f.y - h - 8, w * p, 5); ctx.restore();
}
// 잔상 — 3초 전의 나(오르벤의 시험)
export function drawNqGhost(ctx, p, time) {
  disc(ctx, p.x, p.y, 22, '#b996ff', 0.25 + Math.sin(time * 6) * 0.08);
  cell(ctx, 'props', A.props.kneel, p.x, p.y, 110, { a: 0.55 });
}
