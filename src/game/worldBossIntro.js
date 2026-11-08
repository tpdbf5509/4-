/* ── 월드보스 등장 연출 — 화면에만 그린다(판정 없음) ─────────────────────────
   수치는 worldBossIntroData.js. 이 기기의 시계(performance.now)로 흐르고 스냅샷에 싣지 않는다.
   tickWbIntro 는 RpgView 루프가 drawRpg 앞에서 부르고, drawWbIntroHud 는 drawRpg 뒤 화면 좌표로 그린다.
   보스 몸이 올라오는 것(wbIntroRise)과 땅 연출(drawWbIntroGround)은 worldBossArt.js 가 부른다. */
import { WB_INTRO as I, WB_INTRO_LINE } from "./worldBossIntroData.js";
import { WORLD_BOSS as C, WORLD_BOSS_BY_ID } from "./worldBossData.js";
import { W, H } from "./world.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (p) => 1 - (1 - p) ** 3;
const nowS = () => (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;

// key — 마지막으로 본 출현, seen — 입장 연출을 본 출현, intro — 지금 보이는 입장 연출, pulse — 출현 예고
const S = { init: false, key: "", seen: new Set(), intro: null, pulse: null, wasIn: false };

export function resetWbIntro() { S.init = false; S.key = ""; S.seen.clear(); S.intro = null; S.pulse = null; S.wasIn = false; }

/* ready — 맵 불러오기 가림막이 걷혔나. play — 소리(sfx.play, 전용 서버 묶음에 sfx 를 끌어들이지 않으려고 받는다).
   처음 본 보스(접속했을 때 이미 있던 보스)에는 출현 예고를 하지 않는다 */
export function tickWbIntro(g, ready, play = () => {}, t = nowS()) {
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const a = g.wb?.active, fight = a && a.phase === "fight" && WORLD_BOSS_BY_ID[a.id];
  if (fight && a.key !== S.key) {
    if (S.init && me && me.map !== C.map) { S.pulse = { at: t, id: a.id }; play("wbHorn"); }
    S.key = a.key;
  }
  S.init = true;
  const inside = !!(me && me.map === C.map);
  if (!inside) { S.wasIn = false; if (S.intro && t - S.intro.at > 0.2) S.intro = null; }
  if (inside && !S.wasIn && ready && fight) {
    S.wasIn = true;
    const first = !S.seen.has(a.key);
    S.seen.add(a.key);
    if (S.seen.size > 12) S.seen.delete(S.seen.values().next().value);
    // 공격 준비 중에 들어오면 몸이 올라오는 장면은 건너뛴다 — 경고 범위와 겹쳐 헷갈리지 않게
    S.intro = { at: t, id: a.id, first, rise: first && !a.attack, roared: false };
    S.pulse = null;
    if (first) play("wbRise");
  }
  const it = S.intro;
  if (!it) return;
  const e = t - it.at;
  if (it.first && !it.roared && e >= I.roar) {
    it.roared = true;
    play("wbRoar");
    g.shake = Math.max(g.shake || 0, I.shake);
  }
  if (e > (it.first ? I.life : I.again) || !fight || a.id !== it.id) S.intro = null;
}

// 보스 몸이 올라오는 정도 — null 이면 평소처럼 그린다. 0 은 땅속, 1 은 다 올라옴
export function wbIntroRise(id, t = nowS()) {
  const it = S.intro;
  if (!it || !it.rise || it.id !== id) return null;
  const p = clamp((t - it.at - I.rise[0]) / (I.rise[1] - I.rise[0]));
  return p >= 1 ? null : ease(p);
}
export const WB_RISE_DEPTH = I.riseDepth;

/* 땅 연출 — 보스 발밑(월드 좌표). 갈라짐이 번지고 흙먼지가 오르다 포효 때 충격파가 퍼진다 */
export function drawWbIntroGround(ctx, a, tone, quality = 1, t = nowS()) {
  const it = S.intro;
  if (!it || !it.first || it.id !== a.id) return;
  const e = t - it.at, x = a.x, y = a.y;
  const crack = clamp(e / I.roar), fade = 1 - clamp((e - I.roar - 0.6) / 1.2);
  if (fade <= 0) return;
  ctx.save();
  ctx.lineCap = "round";
  // 갈라짐 — 정해진 각도로 뻗고(매 프레임 같은 모양) 끝이 보스 빛깔로 빛난다
  const n = Math.max(4, Math.round(I.cracks * quality));
  for (let i = 0; i < n; i++) {
    const ang = i * TAU / n + (i % 2 ? 0.21 : -0.13), len = (150 + (i * 53) % 110) * crack;
    const mx = x + Math.cos(ang + 0.18) * len * 0.55, my = y + Math.sin(ang + 0.18) * len * 0.55 * C.squash;
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len * C.squash;
    ctx.globalAlpha = 0.75 * fade;
    ctx.strokeStyle = "#2a1d17"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = tone[1]; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
  }
  // 발밑 빛 — 땅속에서 새어 나오는 보스 빛깔
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 200);
  glow.addColorStop(0, tone[1]); glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.45 * fade * crack;
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.ellipse(x, y, 200, 200 * C.squash, 0, 0, TAU); ctx.fill();
  // 흙먼지 — 올라오는 동안 피어오른다
  const dn = Math.max(6, Math.round(I.dust * quality));
  for (let i = 0; i < dn; i++) {
    const ph = ((e * 0.9 + i * 0.137) % 1), ang = i * 2.39996, d = 70 + (i * 37) % 120;
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * C.squash - ph * 90;
    ctx.globalAlpha = (1 - ph) * 0.6 * fade * clamp(e / 0.3);
    ctx.fillStyle = i % 3 ? "#a8998a" : "#d6c8b2";
    ctx.beginPath(); ctx.arc(px, py, 5 + (i % 4) * 3 + ph * 8, 0, TAU); ctx.fill();
  }
  // 충격파 — 포효 순간 두 겹 고리
  const rp = (e - I.roar) / I.ring[1];
  if (rp > 0 && rp < 1) {
    for (const [k, w, col] of [[1, 6, tone[1]], [0.72, 2, tone[2]]]) {
      ctx.globalAlpha = (1 - rp) * 0.8;
      ctx.strokeStyle = col; ctx.lineWidth = w * (1 - rp) + 1;
      ctx.beginPath(); ctx.ellipse(x, y, I.ring[0] * ease(rp) * k, I.ring[0] * ease(rp) * k * C.squash, 0, 0, TAU); ctx.stroke();
    }
  }
  ctx.restore();
}

function line(ctx, text, x, y, font, color, spacing = "0px") {
  ctx.font = font;
  if ("letterSpacing" in ctx) ctx.letterSpacing = spacing;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/* 화면 좌표 — 위아래 띠 · 가장자리 그늘 · 이름표, 다른 맵에서는 출현 예고 테두리 */
export function drawWbIntroHud(ctx, g, t = nowS()) {
  const p = S.pulse;
  if (p) {
    const e = t - p.at, B = WORLD_BOSS_BY_ID[p.id];
    if (e > I.pulse.life || !B) S.pulse = null;
    else {
      const beat = Math.sin(clamp(e / I.pulse.life) * Math.PI * I.pulse.beats) ** 2;
      edge(ctx, B.color, I.pulse.alpha * beat, I.pulse.edge);
    }
  }
  const it = S.intro;
  if (!it) return;
  const B = WORLD_BOSS_BY_ID[it.id];
  if (!B) return;
  const e = t - it.at, life = it.first ? I.life : I.again;
  ctx.save();
  if (it.first) {
    // 가장자리 그늘 · 위아래 띠
    const inP = clamp(e / I.barIn), outP = clamp((life - e) / I.barOut), show = ease(Math.min(inP, outP));
    edge(ctx, "#0d0a0a", I.vignette * show, 0.34);
    const bh = Math.round(H * I.bar * show);
    ctx.globalAlpha = I.barAlpha;
    ctx.fillStyle = "#120e0d";
    ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    ctx.globalAlpha = 0.5 * show;
    ctx.fillStyle = B.color;
    ctx.fillRect(0, bh, W, 1); ctx.fillRect(0, H - bh - 1, W, 1);
  }
  // 이름표 — 왼쪽 아래, 왼쪽 정렬. 보스 빛깔은 선 하나에만 쓴다
  const c0 = it.first ? I.card[0] : 0, ce = e - c0;
  if (ce > 0) {
    const a = Math.min(clamp(ce / I.cardIn), clamp((life - e) / I.cardOut));
    const slide = (1 - ease(clamp(ce / I.cardIn))) * -28;
    const x = 64 + slide, y = H - Math.round(H * I.bar) - 150;
    ctx.globalAlpha = a * 0.62;
    const gr = ctx.createLinearGradient(0, 0, 560, 0);
    gr.addColorStop(0, "rgba(18,14,13,.9)"); gr.addColorStop(1, "rgba(18,14,13,0)");
    ctx.fillStyle = gr; ctx.fillRect(0, y - 10, 560, 128);
    ctx.globalAlpha = a;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    line(ctx, "월드보스", x, y + 18, "15px 'Do Hyeon',sans-serif", "#c9bba5", "2px");
    const lw = 260 * ease(clamp(ce / (I.cardIn + 0.3)));
    ctx.fillStyle = B.color; ctx.fillRect(x, y + 28, lw, 1);
    line(ctx, B.name, x - 2, y + 76, "46px 'Do Hyeon',sans-serif", "#f4ecdd", "-1px");
    const sub = WB_INTRO_LINE[B.id] || B.sub || "";
    const info = `권장 ${B.recLv || C.coop.lv}레벨 · ${Math.round(C.duration / 60000)}분 안에 토벌`;
    line(ctx, sub, x, y + 102, "17px 'Do Hyeon',sans-serif", "#d8ccb8", "-0.3px");
    line(ctx, info, x, y + 124, "14px 'Do Hyeon',sans-serif", "#a99c88", "0px");
  }
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.restore();
}

// 화면 네 가장자리에서 안쪽으로 옅어지는 색 — alpha 가장자리 진하기, k 두께(짧은 변 몫)
function edge(ctx, color, alpha, k) {
  if (alpha <= 0.01) return;
  const d = Math.min(W, H) * k;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
    [0, 0, 0, d, 0, 0, W, d], [0, H, 0, H - d, 0, H - d, W, d],
    [0, 0, d, 0, 0, 0, d, H], [W, 0, W - d, 0, W - d, 0, d, H],
  ]) {
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, color); gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr; ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.restore();
}
