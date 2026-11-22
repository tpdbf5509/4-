/* 이야기 컷신 그리기 — cutsceneData.js 의 장면을 캔버스 한 장에 그린다.
   바탕(코드 그림) → 그림 층(카메라로 밀고 당김) → 알갱이 → 색 보정 → 강조 → 어두운 가장자리 → 위아래 띠 · 자막. */
import {CUT, CUTSCENES, cutLength, shotAt} from './cutsceneData.js';

const STAGE_W = 1600, STAGE_H = 900;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
// 장면마다 같은 자리에 나오는 알갱이 — 씨앗 난수
const rand = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// 바탕 — 톤다운한 노을 하늘 · 먼 언덕 · 지붕 실루엣 · 땅
function drawBg(ctx, kind) {
  if (kind === 'black') { ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0, 0, STAGE_W, STAGE_H); return; }
  const dark = kind === 'dusk-dark';
  const sky = ctx.createLinearGradient(0, 0, 0, 680);
  sky.addColorStop(0, dark ? '#1b1725' : '#352a45');
  sky.addColorStop(0.55, dark ? '#4a3340' : '#9a5c55');
  sky.addColorStop(1, dark ? '#7a5048' : '#dca275');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, STAGE_W, 700);
  // 지는 해
  const sun = ctx.createRadialGradient(1120, 610, 10, 1120, 610, 260);
  sun.addColorStop(0, dark ? 'rgba(230,150,110,.35)' : 'rgba(255,214,160,.95)');
  sun.addColorStop(0.25, dark ? 'rgba(200,110,90,.15)' : 'rgba(250,180,120,.45)');
  sun.addColorStop(1, 'rgba(250,180,120,0)');
  ctx.fillStyle = sun; ctx.fillRect(820, 330, 600, 400);
  // 먼 언덕
  ctx.fillStyle = dark ? '#2b2230' : '#5b3c45';
  ctx.beginPath(); ctx.moveTo(0, 640);
  for (let x = 0; x <= STAGE_W; x += 80) ctx.lineTo(x, 610 + Math.sin(x * 0.006) * 26 + Math.sin(x * 0.017) * 9);
  ctx.lineTo(STAGE_W, 700); ctx.lineTo(0, 700); ctx.fill();
  // 마을 지붕 실루엣
  ctx.fillStyle = dark ? '#1c1619' : '#33232a';
  const r = rand(7);
  ctx.beginPath(); ctx.moveTo(0, 700);
  for (let x = 0; x < STAGE_W;) {
    const w = 70 + r() * 90, h = 30 + r() * 50, roof = 18 + r() * 22;
    ctx.lineTo(x, 680 - h); ctx.lineTo(x + w / 2, 680 - h - roof); ctx.lineTo(x + w, 680 - h);
    if (r() < 0.4) { ctx.lineTo(x + w * 0.75, 680 - h); ctx.lineTo(x + w * 0.75, 680 - h - roof - 14); ctx.lineTo(x + w * 0.82, 680 - h - roof - 14); ctx.lineTo(x + w * 0.82, 680 - h); }
    x += w + 6 + r() * 20; ctx.lineTo(x, 680 - h * 0.4);
  }
  ctx.lineTo(STAGE_W, 700); ctx.fill();
  // 땅
  const g = ctx.createLinearGradient(0, 690, 0, STAGE_H);
  g.addColorStop(0, dark ? '#2a201c' : '#4a3428'); g.addColorStop(1, dark ? '#15100e' : '#2a1d18');
  ctx.fillStyle = g; ctx.fillRect(0, 690, STAGE_W, STAGE_H - 690);
}

function drawLayer(ctx, l, k, sec, imgs) {
  const im = imgs[l.img];
  const x = l.to ? lerp(l.x, l.to[0], k) : l.x, y = l.to ? lerp(l.y, l.to[1], k) : l.y;
  const bob = l.bob ? -Math.abs(Math.sin(sec * 11)) * l.bob : 0;
  if (!im || !im.naturalWidth) {                       // 그림이 없으면 같은 자리에 어두운 형체만
    ctx.fillStyle = 'rgba(30,22,20,.7)'; ctx.fillRect(x - l.h * 0.25, y - l.h + bob, l.h * 0.5, l.h); return;
  }
  const h = l.h, w = h * im.naturalWidth / im.naturalHeight;
  ctx.save(); ctx.translate(x, y + bob);
  if (l.sway) ctx.rotate(Math.sin(sec * 6) * l.sway * Math.max(0.25, 1 - sec / 2));
  ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
}

// 알갱이 · 파문 · 달리는 선
function drawFx(ctx, shot, i, sec) {
  const fx = shot.fx || [];
  if (fx.includes('motes') || fx.includes('dust')) {
    const r = rand(31 + i * 97), dust = fx.includes('dust') && !fx.includes('motes');
    for (let n = 0; n < 70; n++) {
      const x0 = r() * STAGE_W, y0 = r() * STAGE_H, sp = 12 + r() * 30, sz = 1.5 + r() * 3.5, ph = r() * 6;
      const x = (x0 + Math.sin(sec * 0.8 + ph) * 18 + (dust ? sec * sp : 0)) % STAGE_W;
      const y = (y0 - (dust ? -sec * sp * 0.2 : sec * sp) + STAGE_H) % STAGE_H;
      ctx.globalAlpha = (0.25 + 0.5 * Math.abs(Math.sin(sec * 1.7 + ph))) * (dust ? 0.5 : 0.8);
      ctx.fillStyle = dust ? '#cdbfa8' : '#f3d39a';
      ctx.beginPath(); ctx.arc(x, y, sz, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (fx.includes('rings')) {                           // 종 둘레로 번지는 소리 고리 두 번(소리와 같은 때)
    for (const at of [0.05, 1.1]) {
      const a = sec - at; if (a < 0 || a > 1.2) continue;
      ctx.strokeStyle = `rgba(245,228,190,${(1 - a / 1.2) * 0.6})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(800, 420, 60 + a * 520, 40 + a * 340, 0, 0, 7); ctx.stroke();
    }
  }
  if (fx.includes('speed')) {
    const r = rand(5 + i);
    ctx.strokeStyle = 'rgba(250,235,210,.35)'; ctx.lineWidth = 2;
    for (let n = 0; n < 26; n++) {
      const y = 380 + r() * 440, len = 120 + r() * 260, x = ((r() * 2400 - sec * 1600) % 2400 + 2400) % 2400 - 400;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
  }
}

// 색 보정 — 화면 전체에 섞기(브라우저 공통 합성 방식)
function grade(ctx, W, H, g) {
  if (!g) return;
  ctx.save();
  if (g === 'warm') { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,170,110,.45)'; ctx.fillRect(0, 0, W, H); }
  if (g === 'cold') {
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,.55)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(90,120,170,.55)'; ctx.fillRect(0, 0, W, H);
  }
  if (g === 'mono') {
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,70,75,.35)'; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// 자막 — 아래 띠 가운데, 작고 얇게
function subtitle(ctx, W, H, text, a, barH) {
  if (!text || a <= 0) return;
  const size = Math.max(13, Math.min(20, H * 0.03));
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `500 ${size}px "Pretendard", "Noto Sans KR", sans-serif`;
  ctx.letterSpacing = '-0.02em';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let s = text;
  while (s.length > 4 && ctx.measureText(s).width > W - 40) s = s.slice(0, -2);   // 아주 좁은 화면은 줄여 넣는다
  ctx.fillStyle = '#ecdfc4'; ctx.fillText(s === text ? s : `${s}…`, W / 2, H - barH / 2);
  ctx.restore();
}

/* 한 프레임 — ms: 컷신 시작부터 지난 시간. 끝났으면 false */
export function drawCut(ctx, W, H, id, ms, imgs, {still = false} = {}) {
  const at = shotAt(id, ms);
  if (!at) return false;
  const {i, shot, t} = at, sec = t / 1000, k = ease(clamp01(t / shot.ms));
  const [c0, c1] = shot.cam;
  let cx = lerp(c0[0], c1[0], k), cy = lerp(c0[1], c1[1], k);
  const z = lerp(c0[2], c1[2], k);
  if (!still && shot.fx?.includes('shake') && sec < CUT.shakeT) {
    const amp = CUT.shakePx * (1 - sec / CUT.shakeT);
    cx += Math.sin(sec * 90) * amp; cy += Math.cos(sec * 77) * amp;
  }
  const s = Math.max(W / STAGE_W, H / STAGE_H) * z;
  ctx.save();
  ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-cx, -cy);
  drawBg(ctx, shot.bg);
  for (const l of shot.layers || []) drawLayer(ctx, l, k, sec, imgs);
  drawFx(ctx, shot, i, sec);
  ctx.restore();
  grade(ctx, W, H, shot.grade);
  // 강조 — 색 보정 뒤에 얹어 흑백 화면에서도 이 한 곳만 붉다
  for (const a of shot.accent || []) {
    const px = W / 2 + (a.x - cx) * s, py = H / 2 + (a.y - cy) * s, r = a.r * s;
    const gl = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2);
    gl.addColorStop(0, a.c); gl.addColorStop(0.35, `${a.c}aa`); gl.addColorStop(1, `${a.c}00`);
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(sec * 5); ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(px, py, r * 2.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  // 어두운 가장자리
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // 들어오기 — 어둠 · 번쩍임이 걷힌다
  if (shot.in === 'black' || shot.in === 'white') {
    const a = 1 - clamp01(sec / CUT.fadeIn);
    if (a > 0) { ctx.fillStyle = shot.in === 'black' ? `rgba(13,11,10,${a})` : `rgba(255,250,240,${a})`; ctx.fillRect(0, 0, W, H); }
  }
  // 위아래 띠 — 처음에 들어오고 끝에 나간다
  const all = cutLength(id), inK = clamp01(ms / 1000 / CUT.barIn), outK = clamp01((all - ms) / 1000 / CUT.barIn);
  const barH = H * CUT.bar * Math.min(inK, outK);
  ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0, 0, W, barH); ctx.fillRect(0, H - barH, W, barH);
  const ta = Math.min(clamp01(sec / CUT.textFade), clamp01((shot.ms / 1000 - sec) / CUT.textFade));
  subtitle(ctx, W, H, shot.text, ta, H * CUT.bar);
  return true;
}

export {CUTSCENES};
