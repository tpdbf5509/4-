/* 메인 스토리 1부 맵 그리기 — 정식 그림(11월 6일). 그림 파일(storyArtPath)이 없으면 임시 도형을 그린다.
   바닥: ground/<맵 id>.webp · 건물 · 장소 · 소품: places/<id>.webp · 사람: people/<인물 id>.webp */
import {STORY_ART as A, STORY_MAPS, STORY_PEOPLE, storyArtPath, storyBuildingsOf, storyPropsOf, storyNpcsOf, storySightsOf} from './storyData.js';
import {STORY_QUEST, STORY_STEPS, STORY_HIDDEN_R, stepTargets, storyGateOpen} from './storyQuestData.js';
import {VILLAGE_NPCS} from './villageData.js';

const images = new Map();
function img(kind, id) {
  if (typeof Image === 'undefined') return null;
  const key = `${kind}/${id}`;
  if (!images.has(key)) {
    const im = new Image(); images.set(key, im);
    im.onerror = () => images.set(key, null);
    im.src = storyArtPath(kind, id);
  }
  const im = images.get(key);
  return im?.complete && im.naturalWidth ? im : null;
}
function drawArt(ctx, kind, id, x, y, size) {
  const im = img(kind, id); if (!im) return false;
  const k = size / A.size;
  ctx.drawImage(im, x - A.feet[0]*k, y - A.feet[1]*k, size, size);
  return true;
}
function label(ctx, text, x, y, color = '#f6e5bb') {
  ctx.save(); ctx.font = "14px 'Do Hyeon', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 20;
  ctx.fillStyle = 'rgba(48,37,24,.88)'; ctx.beginPath(); ctx.roundRect(x - w/2, y - 11, w, 22, 6); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
const mapOf = (id) => STORY_MAPS.find((m) => m.id === id);

// 바닥 그림 파일이 있으면 그 그림을 맵 크기로 늘려 쓴다. 없으면 false — 코드 바닥(paintStory)을 쓴다.
export function drawStoryBackdrop(ctx, M, cam, W, H) {
  const im = img('ground', M.id); if (!im) return false;
  const kx = im.naturalWidth / M.w, ky = im.naturalHeight / M.h;
  ctx.drawImage(im, cam.x * kx, cam.y * ky, W * kx, H * ky, 0, 0, W, H);
  return true;
}
function curve(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  ctx.lineTo(...pts[pts.length - 1]);
}
// 코드 바닥 — 바탕 · 얼룩 · 바닥 타일 · 길 · 바닥 원. 한 번 그려 캐시한다(rpgArt.js bigBg).
export function paintStory(ctx, M) {
  const S = mapOf(M.id), G = S.ground;
  ctx.fillStyle = G.base; ctx.fillRect(0, 0, M.w, M.h);
  let seed = 3100 + M.w; const rnd = () => { seed = (seed*1664525 + 1013904223) >>> 0; return seed/4294967296; };
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = G.spot[i % 2];
    ctx.beginPath(); ctx.ellipse(rnd()*M.w, rnd()*M.h, 8 + rnd()*30, 3 + rnd()*12, 0, 0, Math.PI*2); ctx.fill();
  }
  if (G.tile) {                                   // 시설 바닥 — 얇은 선의 격자
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let x = 0; x < M.w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, M.h); ctx.stroke(); }
    for (let y = 0; y < M.h; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(M.w, y); ctx.stroke(); }
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = G.edge; S.pads.forEach((p) => { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx + 6, p.ry + 6, 0, 0, Math.PI*2); ctx.fill(); });
  ctx.strokeStyle = G.edge; S.roads.forEach((r) => { ctx.lineWidth = r.w + 12; curve(ctx, r.pts); ctx.stroke(); });
  ctx.strokeStyle = G.road; S.roads.forEach((r) => { ctx.lineWidth = r.w; curve(ctx, r.pts); ctx.stroke(); });
  ctx.fillStyle = G.road; S.pads.forEach((p) => { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI*2); ctx.fill(); });
  ctx.strokeStyle = 'rgba(40,30,20,.22)'; ctx.lineWidth = 2;
  S.pads.forEach((p) => { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx - 16, p.ry - 12, 0, 0, Math.PI*2); ctx.stroke(); });
  if (G.rail) {                                   // 폐광산 — 길 따라 깔린 레일
    ctx.strokeStyle = 'rgba(40,30,24,.55)'; ctx.lineWidth = 3; ctx.setLineDash([]);
    S.roads.forEach((r) => { ctx.save(); ctx.translate(-14, 0); curve(ctx, r.pts); ctx.stroke(); ctx.translate(28, 0); curve(ctx, r.pts); ctx.stroke(); ctx.restore(); });
  }
  ctx.fillStyle = 'rgba(246,229,187,.55)'; ctx.font = "15px 'Do Hyeon', sans-serif"; ctx.textAlign = 'left';
  ctx.fillText(`${S.ch}장 · ${S.name} · 임시 맵`, 40, M.h - 30);
}

/* 임시 도형 — look 마다 한 가지. tone 이 없으면 맵 길 색을 쓴다. 발 기준 (x, y). */
const SHAPES = {
  house(ctx, n, c) { box(ctx, n, c, .62, .42); roof(ctx, n, '#7a6656', .7, .42, .28); door(ctx, n); },
  lab(ctx, n, c) { box(ctx, n, c, .7, .46); ctx.fillStyle = '#4f5a60'; ctx.fillRect(n.x - n.size*.35, n.y - n.size*.52, n.size*.7, n.size*.06); windows(ctx, n, '#9fc3cc'); door(ctx, n); },
  stall(ctx, n, c) { box(ctx, n, c, .6, .3); roof(ctx, n, '#b98a76', .7, .3, .16); },
  machine(ctx, n, c) { box(ctx, n, c, .5, .55); light(ctx, n.x, n.y - n.size*.36, n.size*.07, '#8fd0dc'); door(ctx, n); },
  tower(ctx, n, c) {
    ctx.fillStyle = c; ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(n.x - n.size*.2, n.y); ctx.lineTo(n.x - n.size*.07, n.y - n.size*.85); ctx.lineTo(n.x + n.size*.07, n.y - n.size*.85); ctx.lineTo(n.x + n.size*.2, n.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    light(ctx, n.x, n.y - n.size*.88, n.size*.04, '#9fd0f0'); door(ctx, n);
  },
  ruin(ctx, n, c) {
    ctx.fillStyle = c; ctx.strokeStyle = '#3d3a36'; ctx.lineWidth = 2;
    [-.3, -.1, .1, .3].forEach((k, i) => { const h = n.size * [.5, .32, .44, .24][i]; ctx.beginPath(); ctx.rect(n.x + n.size*k - n.size*.07, n.y - h, n.size*.14, h); ctx.fill(); ctx.stroke(); });
    ctx.beginPath(); ctx.rect(n.x - n.size*.38, n.y - n.size*.56, n.size*.36, n.size*.07); ctx.fill(); ctx.stroke();
  },
  arch(ctx, n, c) {
    ctx.strokeStyle = c; ctx.lineWidth = n.size*.1;
    ctx.beginPath(); ctx.moveTo(n.x - n.size*.38, n.y); ctx.lineTo(n.x - n.size*.38, n.y - n.size*.45); ctx.arc(n.x, n.y - n.size*.45, n.size*.38, Math.PI, 0); ctx.lineTo(n.x + n.size*.38, n.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,30,36,.5)'; ctx.lineWidth = 2; ctx.stroke();
  },
  device(ctx, n, c) { pedestal(ctx, n, c); light(ctx, n.x, n.y - n.size*.5, n.size*.12, n.glow || '#9fd0dc'); },
  core(ctx, n, c) { pedestal(ctx, n, c); light(ctx, n.x, n.y - n.size*.5, n.size*.2, '#a6e0ea'); },
  terminal(ctx, n, c) { box(ctx, n, c, .5, .5); ctx.fillStyle = '#3b5560'; ctx.fillRect(n.x - n.size*.18, n.y - n.size*.42, n.size*.36, n.size*.2); },
  robot(ctx, n, c) {
    ctx.fillStyle = c; ctx.strokeStyle = '#33363c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(n.x - n.size*.2, n.y - n.size*.6, n.size*.4, n.size*.42, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(n.x - n.size*.12, n.y - n.size*.78, n.size*.24, n.size*.18, 8); ctx.fill(); ctx.stroke();
    ctx.fillRect(n.x - n.size*.16, n.y - n.size*.18, n.size*.1, n.size*.18); ctx.fillRect(n.x + n.size*.06, n.y - n.size*.18, n.size*.1, n.size*.18);
    light(ctx, n.x, n.y - n.size*.69, n.size*.035, '#8fd0dc');
  },
  wagon(ctx, n, c) {
    ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(-.18);
    ctx.fillStyle = '#8a6a48'; ctx.strokeStyle = '#4a3726'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-n.size*.34, -n.size*.3, n.size*.6, n.size*.22); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a4532'; [-.22, .14].forEach((k) => { ctx.beginPath(); ctx.arc(n.size*k, -n.size*.06, n.size*.08, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#cdb88a'; [[-.1, -.34], [.08, -.36]].forEach(([a, b]) => { ctx.beginPath(); ctx.ellipse(n.size*a, n.size*b, n.size*.07, n.size*.05, 0, 0, Math.PI*2); ctx.fill(); });
    ctx.restore(); void c;
  },
  desk(ctx, n, c) { box(ctx, n, '#7a5f45', .7, .24); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(n.x - n.size*.28, n.y - n.size*.3, n.size*.5, n.size*.08); void c; },
  paper(ctx, n) { ctx.fillStyle = '#eadfc4'; ctx.strokeStyle = '#8a7a5c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(n.x - n.size*.22, n.y - n.size*.3, n.size*.44, n.size*.3); ctx.fill(); ctx.stroke(); },
  stone(ctx, n, c) { ctx.fillStyle = c; ctx.strokeStyle = 'rgba(30,30,30,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(n.x, n.y - n.size*.1, n.size*.4, n.size*.16, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); },
  pillar(ctx, n, c) { ctx.fillStyle = c; ctx.strokeStyle = 'rgba(30,30,30,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(n.x - n.size*.12, n.y - n.size*.7, n.size*.24, n.size*.7); ctx.fill(); ctx.stroke(); },
  crate(ctx, n) { box(ctx, n, '#9a7a52', .5, .4); },
  cart(ctx, n) { box(ctx, n, '#6e6258', .6, .3); ctx.fillStyle = '#3a332e'; [-.18, .18].forEach((k) => { ctx.beginPath(); ctx.arc(n.x + n.size*k, n.y - 4, n.size*.07, 0, Math.PI*2); ctx.fill(); }); },
  turret(ctx, n, c) { pedestal(ctx, n, c); light(ctx, n.x, n.y - n.size*.5, n.size*.07, '#e0a39a'); },
  pylon(ctx, n, c) { SHAPES.pillar(ctx, n, c); light(ctx, n.x, n.y - n.size*.74, n.size*.06, '#9fc0f0'); },
  shelf(ctx, n) { box(ctx, n, '#6e5238', .7, .6); ctx.fillStyle = '#a58a62'; for (let i = 1; i < 4; i++) ctx.fillRect(n.x - n.size*.33, n.y - n.size*.15*i - 2, n.size*.66, 4); },
};
function box(ctx, n, c, w, h) { ctx.fillStyle = c; ctx.strokeStyle = 'rgba(40,30,22,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(n.x - n.size*w/2, n.y - n.size*h, n.size*w, n.size*h, 6); ctx.fill(); ctx.stroke(); }
function roof(ctx, n, c, w, h, rise) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(n.x - n.size*w/2, n.y - n.size*h); ctx.lineTo(n.x, n.y - n.size*(h + rise)); ctx.lineTo(n.x + n.size*w/2, n.y - n.size*h); ctx.closePath(); ctx.fill(); }
function door(ctx, n) { ctx.fillStyle = '#4f3e30'; ctx.fillRect(n.x - 13, n.y - 44, 26, 44); }
function windows(ctx, n, c) { ctx.fillStyle = c; [-.22, .22].forEach((k) => ctx.fillRect(n.x + n.size*k - 14, n.y - n.size*.34, 28, 20)); }
function pedestal(ctx, n, c) { ctx.fillStyle = c; ctx.strokeStyle = 'rgba(30,30,36,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(n.x - n.size*.3, n.y); ctx.lineTo(n.x - n.size*.18, n.y - n.size*.4); ctx.lineTo(n.x + n.size*.18, n.y - n.size*.4); ctx.lineTo(n.x + n.size*.3, n.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
function light(ctx, x, y, r, c) { ctx.save(); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = r * 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); ctx.restore(); }

const toneOf = (mapId) => mapOf(mapId)?.ground.road || '#c8b994';
export function drawStoryObject(ctx, n, mapId) {
  if (!n.art || !drawArt(ctx, 'places', n.art, n.x, n.y, n.size)) (SHAPES[n.look] || SHAPES.house)(ctx, n, n.tone || toneOf(mapId));
  if (n.name && !n.sight) label(ctx, n.name, n.x, n.y + 20);
}
// 앞뒤 정렬에 넣는 건물 · 소품
export const storyObjectsOf = (mapId) => [...storyBuildingsOf(mapId), ...storyPropsOf(mapId)];

// 사람 — 그림이 없으면 몸 · 머리 · 머리카락 · 표식으로 구분되는 임시 인형
export function drawStoryNpc(ctx, n, time, mapId) {
  if (n.sight) { drawStoryObject(ctx, n, mapId); label(ctx, n.name, n.x, n.y + 18, '#e6d6a1'); return; }
  const y = n.y + Math.sin(time*2 + n.x) * 1.2, L = n.look || STORY_PEOPLE[n.who]?.look;
  ctx.save(); ctx.fillStyle = 'rgba(25,32,20,.22)'; ctx.beginPath(); ctx.ellipse(n.x, n.y + 1, 18, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  if (!drawArt(ctx, 'people', n.who, n.x, y, A.npcSize)) {
    ctx.save();
    if (L.mark === 'holo') ctx.globalAlpha = .62 + Math.sin(time*3) * .12;
    ctx.fillStyle = L.body; ctx.strokeStyle = L.trim; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(n.x - 13, y - 42, 26, 40, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = L.trim; ctx.fillRect(n.x - 13, y - 22, 26, 4);
    ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(n.x, y - 52, 12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(n.x, y - 55, 12.5, Math.PI*1.05, Math.PI*1.95); ctx.fill();
    if (L.mark === 'sword') { ctx.fillStyle = '#c9ccd2'; ctx.fillRect(n.x + 15, y - 46, 4, 34); ctx.fillStyle = '#8a6a48'; ctx.fillRect(n.x + 11, y - 18, 12, 4); }
    if (L.mark === 'goggles') { ctx.fillStyle = '#d8c48a'; ctx.fillRect(n.x - 10, y - 62, 20, 5); }
    if (L.mark === 'hat') { ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.ellipse(n.x, y - 62, 18, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.fillRect(n.x - 9, y - 72, 18, 10); }
    if (L.mark === 'bandage') { ctx.fillStyle = '#f2ece0'; ctx.fillRect(n.x - 12, y - 58, 24, 4); }
    if (L.mark === 'eye') { light(ctx, n.x + 4, y - 53, 3, '#7fb8d0'); }
    if (L.mark === 'hood') { ctx.fillStyle = L.trim; ctx.beginPath(); ctx.arc(n.x, y - 54, 15, Math.PI, 0); ctx.fill(); }
    if (L.mark === 'holo') { ctx.strokeStyle = 'rgba(200,240,245,.6)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(n.x - 14, y - 60 + i*12); ctx.lineTo(n.x + 14, y - 60 + i*12); ctx.stroke(); } }
    ctx.restore();
  }
  label(ctx, n.name, n.x, n.y + 17);
  ctx.save(); ctx.fillStyle = '#f0dfb1'; ctx.font = "13px 'Do Hyeon', sans-serif"; ctx.textAlign = 'center'; ctx.fillText('···', n.x, n.y - 86); ctx.restore();
}

/* 메인 이야기 — 지금 단계에서 말 걸 대상 머리 위에 통통 튀는 느낌표. 이미 조사한 대상은 빼고, 이 맵에 있는 것만 */
export function drawStoryMarks(ctx, me, M, time) {
  if (!me || !me.bag || !(STORY_QUEST.open || me.admin)) return;
  const sq = me.bag.sq || {i: 0, n: []}, s = STORY_STEPS[sq.i];
  if (!s || s.map !== M.id) return;
  const left = stepTargets(s).filter((id) => !(sq.n || []).includes(id));
  const spots = [...storyNpcsOf(M.id).map((n) => ({id: n.id, x: n.x, y: n.y - 112})),
    ...storySightsOf(M.id).map((n) => ({id: n.id, x: n.x, y: n.y - n.size * .7 - 18})),
    ...(M.id === 'dawnwood' ? VILLAGE_NPCS.map((n) => ({id: n.id, x: n.x, y: n.y - 120})) : [])];
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = "30px 'Do Hyeon', sans-serif"; ctx.lineWidth = 5;
  spots.filter((p) => left.includes(p.id)).forEach((p) => {
    if (s.hidden) {                                    // 숨은 단서 — 가까이 가야 반짝인다
      const d = Math.hypot(p.x - me.x, p.y + 60 - me.y);
      if (d > STORY_HIDDEN_R) return;
      const a = (1 - d / STORY_HIDDEN_R) * (.55 + Math.sin(time * 6) * .35), r = 10 + Math.sin(time * 4) * 3, y0 = p.y + 50;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = '#fff4c4'; ctx.translate(p.x, y0); ctx.rotate(time);
      ctx.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? r * .35 : r; ctx.lineTo(Math.cos(k * Math.PI / 4) * rr, Math.sin(k * Math.PI / 4) * rr); } ctx.fill(); ctx.restore();
      return;
    }
    const y = p.y - Math.abs(Math.sin(time * 3)) * 6;
    ctx.strokeStyle = 'rgba(40,26,10,.9)'; ctx.strokeText('!', p.x, y);
    ctx.fillStyle = '#ffd873'; ctx.fillText('!', p.x, y);
  });
  ctx.restore();
}

/* 아직 열리지 않은 이야기 장소 문 — 이름 아래에 잠김 표시 */
export function drawStoryGateLock(ctx, gate, me) {
  if (!gate.storyGate || !me || storyGateOpen(me, gate.to)) return;
  const m = STORY_MAPS.find((q) => q.id === gate.to);
  const t = `잠김 · ${m ? m.ch : ''}장에서 열림`;
  ctx.save(); ctx.font = "12px 'Do Hyeon', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(t).width + 16;
  ctx.fillStyle = 'rgba(30,22,14,.82)'; ctx.beginPath(); ctx.roundRect(gate.x - w / 2, gate.y - 146, w, 20, 6); ctx.fill();
  ctx.fillStyle = '#d8b9a0'; ctx.fillText(t, gate.x, gate.y - 136);
  ctx.fillStyle = 'rgba(30,22,14,.35)'; ctx.beginPath(); ctx.ellipse(gate.x, gate.y - 2, 46, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
