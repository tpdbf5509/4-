/* ── 월드보스 등장 연출 — 화면에만 그린다(판정 없음) ─────────────────────────
   수치는 worldBossIntroData.js. 이 기기의 시계(performance.now)로 흐르고 스냅샷에 싣지 않는다.
   tickWbIntro 는 RpgView 루프가 drawRpg 앞에서 부르고, drawWbIntroHud 는 drawRpg 뒤 화면 좌표로 그린다.
   보스 몸과 땅 효과는 worldBossArt.js 가 wbIntroScene 으로 지금 장면을 물어 그린다.
   약 4초 — 가장자리 어둠 → 보스 고유 효과 → 붉은 등장 문구 → 이름 → 문구가 사라지며 체력바(wbBarHidden).
   연출 중 실제 공격 예고 · 기절이 들어오면 곧바로 왼쪽 아래 이름표만 남긴다(경고 범위를 가리지 않게). */
import { WB_INTRO as I, WB_INTRO_SCENE, WB_INTRO_LINE } from "./worldBossIntroData.js";
import { WORLD_BOSS as C, WORLD_BOSS_BY_ID } from "./worldBossData.js";
import { W, H } from "./world.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (p) => 1 - (1 - p) ** 3;
const nowS = () => (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;

/* key — 마지막으로 본 출현, seen — 이번 접속에서 들어가 본 출현, intro — 지금 보이는 연출, pulse — 출현 예고.
   intro.full — 본 연출 중(false 면 이름표만), tagAt · tagEnd — 이름표가 보이는 때 */
const S = { init: false, key: "", seen: new Set(), intro: null, pulse: null, wasIn: false };

export function resetWbIntro() { S.init = false; S.key = ""; S.seen.clear(); S.intro = null; S.pulse = null; S.wasIn = false; }

/* 이미 싸우는 중인가 — 판정 상태(스냅샷의 g.wb.active)로만 본다.
   공격 준비 · 시전(a.attack), 합동 공격 기절(a.stun), 독 웅덩이(a.pools)가 있거나,
   나 말고 성역에 사람이 있고 보스 체력이 이미 깎였으면 싸우는 중이다 */
export function wbInCombat(g, a, me) {
  if (!a) return false;
  if (a.attack || a.stun > 0 || a.pools?.length) return true;
  const others = (g.heroes || []).some((h) => h && h !== me && h.loaded !== false && h.map === C.map);
  return others && a.hp < a.max;
}
// 본 연출을 끊어야 하는 실제 위험 — 공격 예고가 들어왔거나 보스가 기절했다
const danger = (a) => !!(a.attack || a.stun > 0);

// 화질(rpgArt.js lod.q) — 저사양 기기에서는 화면 알갱이 수를 줄인다
let Q = 1;
export const setWbIntroQuality = (q) => { Q = q; };
const nq = (n) => Math.max(2, Math.round(n * Q));
const hash = (i) => { const x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };

/* ready — 맵 불러오기 가림막이 걷혔나. play — 소리(sfx.play, 전용 서버 묶음에 sfx 를 끌어들이지 않으려고 받는다).
   처음 본 보스(접속했을 때 이미 있던 보스)에는 출현 예고를 하지 않는다 */
export function tickWbIntro(g, ready, play = () => {}, t = nowS()) {
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const a = g.wb?.active, fight = a && a.phase === "fight" && WORLD_BOSS_BY_ID[a.id] ? a : null;
  if (fight && a.key !== S.key) {
    if (S.init && me && me.map !== C.map) { S.pulse = { at: t, id: a.id }; play("wbHorn"); }
    S.key = a.key;
  }
  S.init = true;
  const inside = !!(me && me.map === C.map);
  // 성역을 나갔거나 · 보스가 쓰러졌거나 · 다른 출현으로 바뀌면 곧바로 지운다
  if (S.intro && (!inside || !fight || fight.key !== S.intro.key)) stop(play);
  if (!inside) S.wasIn = false;
  if (inside && !S.wasIn && ready) {
    S.wasIn = true;   // 보스가 없는 성역이어도 들어간 것으로 친다 — 뒤늦게 연출이 켜지지 않게
    if (fight) begin(g, fight, me, t, play);
  }
  const it = S.intro;
  if (!it) return;
  if (it.big && danger(fight)) cut(it, t, play);   // 공격 예고 · 기절 — 모든 연출을 곧바로 걷는다(다시 틀지 않는다)
  if (it.full) {
    const e = t - it.at - I.lead, sc = WB_INTRO_SCENE[it.id];
    // 소리는 그때그때 부른다 — 끊으면 남은 소리도 나지 않는다
    while (it.cue < sc.cues.length && e >= sc.cues[it.cue][0]) play(sc.cues[it.cue++][1]);
    if (!it.peaked && e >= sc.peak) { it.peaked = true; if (sc.shake) g.shake = Math.max(g.shake || 0, sc.shake); }
    if (e >= I.life + I.trail) it.full = false;
  }
  if (it.ducked && t - it.at >= I.fadeAt) { it.ducked = false; play("wbUnduck"); }
  if (it.big && t - it.at >= I.total) it.big = false;
  if (t > it.tagEnd) S.intro = null;
}

function begin(g, a, me, t, play) {
  const first = !S.seen.has(a.key);
  S.seen.add(a.key);
  if (S.seen.size > I.forget) S.seen.delete(S.seen.values().next().value);
  const sc = WB_INTRO_SCENE[a.id];
  const full = first && !!sc && !wbInCombat(g, a, me);
  // 드래곤 열기 같은 방향 연출은 내 캐릭터 쪽(화면 앞쪽)을 본다
  const ang = me ? Math.atan2(me.y - a.y, me.x - a.x) : Math.PI / 2;
  // 전체 연출은 왼쪽 아래 이름표 대신 가운데 문구 아래에 이름을 쓴다(tagAt 없음)
  S.intro = full
    ? { key: a.key, id: a.id, at: t, full: true, big: true, ducked: true, cue: 0, peaked: false, ang, side: me && me.x < a.x ? -1 : 1,
        tagAt: Infinity, tagEnd: t + I.total }
    : { key: a.key, id: a.id, at: t, full: false, big: false, tagAt: t, tagEnd: t + I.again };
  S.pulse = null;
  if (full) play("wbDuck");
}
// 실제 공격이 들어옴 — 몸 보정 · 땅 효과 · 화면 효과 · 문구 · 남은 소리를 끊고 왼쪽 아래 이름표만 남긴다
function cut(it, t, play) {
  it.full = false; it.big = false; it.ducked = false; it.cut = true;
  play("wbStop");
  it.tagAt = t; it.tagEnd = t + I.again;
}
function stop(play) {
  if (S.intro?.big || S.intro?.ducked) play("wbStop");
  S.intro = null;
}

/* 지금 보스 장면 — 없거나 끊겼으면 null. e 장면 시각(입장 뒤 lead 초부터 0, 그 전은 음수), ang 앞쪽 방향, side 들어오는 쪽(뱀) */
export function wbIntroScene(id, t = nowS()) {
  const it = S.intro;
  if (!it || !it.full || it.id !== id) return null;
  return { id, e: t - it.at - I.lead, ang: it.ang, side: it.side, sc: WB_INTRO_SCENE[id] };
}
// 보스 체력바를 아직 숨기나 — 전체 연출 중 fadeAt 까지(WorldBossPanel.jsx)
export function wbBarHidden(t = nowS()) {
  const it = S.intro;
  return !!(it && it.big && t - it.at < I.fadeAt);
}
// 시험 · 화면 확인용 — 지금 연출 상태
export const wbIntroState = () => S.intro && { ...S.intro };

function line(ctx, text, x, y, font, color, spacing = "0px") {
  ctx.font = font;
  if ("letterSpacing" in ctx) ctx.letterSpacing = spacing;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/* 화면 좌표 — 전체 연출(가장자리 어둠 · 얇은 띠 · 보스 화면 효과 · 붉은 문구 · 이름), 왼쪽 아래 이름표, 다른 맵에서는 출현 예고 테두리 */
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
  const e = t - it.at;
  ctx.save();
  if (it.big) {
    const sc = WB_INTRO_SCENE[it.id];
    // ① 가장자리 어둠 · 얇은 띠 — 0.5초에 걸쳐 들어와 fadeAt 뒤 걷힌다
    const k = ease(clamp(e / I.lead)) * (1 - clamp((e - I.fadeAt) / (I.total - I.fadeAt)));
    edge(ctx, "#07050a", (sc.edge || I.edge) * k, 0.36);
    const bh = Math.round(H * I.bar * k);
    if (bh > 0) {
      ctx.globalAlpha = I.barAlpha; ctx.fillStyle = "#0e0b0c";
      ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
      ctx.globalAlpha = 0.45 * k; ctx.fillStyle = B.color;
      ctx.fillRect(0, bh, W, 1); ctx.fillRect(0, H - bh - 1, W, 1);
    }
    ctx.globalAlpha = 1;
    // ② 보스 고유 화면 효과
    const fx = SCREEN[sc.screen];
    if (fx) { ctx.save(); fx(ctx, e - I.lead, sc); ctx.restore(); }
    // ③ 붉은 등장 문구 · ④ 이름
    cry(ctx, sc, B, e);
  }
  // 왼쪽 아래 이름표 — 다시 들어오거나 싸우는 중일 때 · 연출이 끊겼을 때. 보스 빛깔은 선 하나에만 쓴다
  const ce = t - it.tagAt;
  if (ce > 0) {
    const a = Math.min(clamp(ce / I.cardIn), clamp((it.tagEnd - t) / I.cardOut));
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

/* 붉은 등장 문구 — 가운데 정렬, 약하게 커지며 나타나 fadeAt 부터 천천히 투명해진다. 화면 폭을 넘으면 줄여 맞춘다 */
function cry(ctx, sc, B, e) {
  const out = 1 - clamp((e - I.fadeAt) / (I.total - I.fadeAt));
  const ce = e - I.cryAt;
  if (ce < 0 || out <= 0) return;
  const pin = ease(clamp(ce / I.cryIn)), z = 1 - I.cryGrow * (1 - pin);
  const y = H * 0.3;
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = "46px 'Do Hyeon',sans-serif";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "-1px";
  const fit = Math.min(1, (W * 0.88) / Math.max(1, ctx.measureText(sc.cry).width));
  // 문구 뒤 옅은 어둠 띠 — 보스 · 효과 위에서도 읽히게(양 끝은 사라진다)
  ctx.globalAlpha = 0.5 * pin * out;
  const band = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
  band.addColorStop(0, "rgba(10,6,8,0)"); band.addColorStop(0.25, "rgba(10,6,8,.85)"); band.addColorStop(0.75, "rgba(10,6,8,.85)"); band.addColorStop(1, "rgba(10,6,8,0)");
  ctx.fillStyle = band; ctx.fillRect(-W / 2, -46, W, e > I.nameAt ? 108 : 64);
  ctx.scale(z * fit, z * fit);
  ctx.globalAlpha = pin * out;
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;   // 약한 어두운 그림자
  ctx.fillStyle = I.cry; ctx.fillText(sc.cry, 0, 0);
  const ne = e - I.nameAt;
  if (ne > 0) {
    ctx.globalAlpha = ease(clamp(ne / 0.4)) * out;
    ctx.font = "26px 'Do Hyeon',sans-serif";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
    ctx.fillStyle = I.name; ctx.fillText(B.name, 0, 48);
  }
  ctx.restore();
}

/* 보스 고유 화면 효과(화면 좌표). s 장면 시각 — 0 이 고유 효과 시작(입장 0.5초), sc.peak 가 가장 강한 순간(입장 1.5초) */
const env = (s, sc, tail = 1.0) => clamp(s / sc.peak) * (1 - clamp((s - sc.peak - tail) / 0.6));
function jag(ctx, x0, y0, x1, y1, seed, n = 9, amp = 26) {
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let i = 1; i <= n; i++) {
    const f = i / n, j = i === n ? 0 : (hash(seed * 13 + i) - 0.5) * 2 * amp;
    ctx.lineTo(x0 + (x1 - x0) * f + j, y0 + (y1 - y0) * f + j * 0.3);
  }
}
const SCREEN = {
  // 드래곤 — 화면 가장자리 붉은 불빛 · 아래에서 떠오르는 불씨(흔들림은 장면 shake)
  fire(ctx, s, sc) {
    const k = env(s, sc), flare = s > sc.peak ? Math.max(0, 1 - (s - sc.peak) / 0.5) : 0;
    edge(ctx, "#b3261e", 0.42 * k + 0.25 * flare, 0.3);
    ctx.globalCompositeOperation = "lighter";
    const n = nq(46);
    for (let i = 0; i < n; i++) {
      const sp = 110 + hash(i) * 190, x = hash(i + 50) * W + Math.sin(s * 2 + i) * 18;
      const y = H + 20 - ((s * sp + hash(i + 90) * H) % (H * 1.05));
      ctx.globalAlpha = k * (0.35 + hash(i + 7) * 0.55) * clamp(y / (H * 0.4));
      ctx.fillStyle = i % 3 ? "#ff8a3d" : "#ffd27a";
      ctx.beginPath(); ctx.arc(x, y, 1.5 + hash(i + 3) * 2.5, 0, Math.PI * 2); ctx.fill();
    }
  },
  // 거대 뱀 — 바닥(화면 아래쪽)에 퍼지는 독안개(진동음은 소리)
  fog(ctx, s, sc) {
    const k = env(s, sc, 1.3);
    const rise = ease(clamp(s / (sc.peak + 0.3)));
    const gr = ctx.createLinearGradient(0, H, 0, H * (1 - 0.5 * rise));
    gr.addColorStop(0, "rgba(64,98,52,.55)"); gr.addColorStop(1, "rgba(64,98,52,0)");
    ctx.globalAlpha = k; ctx.fillStyle = gr; ctx.fillRect(0, H * 0.45, W, H * 0.55);
    const n = nq(9);
    for (let i = 0; i < n; i++) {
      const cx = ((hash(i) * W + s * 38 * (i % 2 ? 1 : -1)) % (W + 400)) - 200, cy = H * (0.74 + hash(i + 4) * 0.24), rx = 220 + hash(i + 8) * 160;
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      fg.addColorStop(0, "rgba(150,196,118,.26)"); fg.addColorStop(1, "rgba(150,196,118,0)");
      ctx.globalAlpha = k * rise; ctx.fillStyle = fg;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.38); ctx.translate(-cx, -cy);
      ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  },
  // 고대 기계 — 순간적인 전기 간섭(가로 줄 · 주사선) · 푸른 번개
  static(ctx, s, sc) {
    const flick = (at, len) => s >= at && s < at + len ? 1 - (s - at) / len : 0;
    const k = Math.max(flick(0.45, 0.08), flick(0.72, 0.08), flick(sc.peak - 0.03, 0.45));
    if (k > 0) {
      const seed = Math.floor(s * 30);
      ctx.globalAlpha = 0.07 * k; ctx.fillStyle = "#cfefff";
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
      const n = nq(10);
      for (let i = 0; i < n; i++) {
        const y = hash(seed * 7 + i) * H, h = 2 + hash(seed + i * 3) * 10, x = (hash(seed * 3 + i) - 0.5) * 80;
        ctx.globalAlpha = (0.12 + hash(i + seed) * 0.18) * k; ctx.fillStyle = i % 3 ? "#8fdcff" : "#f2fbff";
        ctx.fillRect(x, y, W, h);
      }
    }
    // 푸른 번개 — 위쪽 가장자리에서 내려친다(가장 강한 순간 셋, 앞서 하나)
    const bolts = [[0.5, 0.18], [sc.peak, 0.3], [sc.peak + 0.06, 0.28], [sc.peak + 0.14, 0.26]];
    bolts.forEach(([at, life], i) => {
      const p = (s - at) / life;
      if (p < 0 || p > 1) return;
      const x0 = W * (0.15 + hash(i + 21) * 0.7), x1 = x0 + (hash(i + 31) - 0.5) * 260, y1 = H * (0.35 + hash(i + 41) * 0.3);
      ctx.globalCompositeOperation = "lighter"; ctx.lineJoin = "miter";
      for (const [w, col, al] of [[9, "#2a78c4", 0.35], [4, "#7fd8ff", 0.8], [1.6, "#f2fdff", 1]]) {
        ctx.globalAlpha = al * (1 - p); ctx.strokeStyle = col; ctx.lineWidth = w;
        jag(ctx, x0, -10, x1, y1, i + 3); ctx.stroke();
      }
    });
  },
  // 뇌조 — 순간 암전 → 번개 섬광 · 내려치는 번개(강한 천둥은 소리). 섬광은 과하지 않게
  storm(ctx, s, sc) {
    const dark = clamp((s - (sc.peak - 0.22)) / 0.12) * (s < sc.peak ? 1 : Math.max(0, 1 - (s - sc.peak) / 0.08));
    if (dark > 0) { ctx.globalAlpha = 0.82 * dark; ctx.fillStyle = "#04040a"; ctx.fillRect(0, 0, W, H); }
    for (const [at, a] of [[sc.peak, 0.5], [sc.peak + 0.24, 0.22]]) {
      const p = (s - at) / 0.3;
      if (p >= 0 && p < 1) { ctx.globalAlpha = a * (1 - p) ** 2; ctx.fillStyle = "#dfe9ff"; ctx.fillRect(0, 0, W, H); }
    }
    const p = (s - sc.peak) / 0.4;
    if (p >= 0 && p < 1) {
      ctx.globalCompositeOperation = "lighter";
      for (const [w, col, al] of [[14, "#3c4fb8", 0.35], [6, "#a7b4ff", 0.8], [2.4, "#ffffff", 1]]) {
        ctx.globalAlpha = al * (1 - p); ctx.strokeStyle = col; ctx.lineWidth = w;
        jag(ctx, W * 0.58, -10, W * 0.6, H * 0.52, 7, 11, 40); ctx.stroke();
        jag(ctx, W * 0.59, H * 0.2, W * 0.75, H * 0.38, 9, 5, 18); ctx.stroke();
      }
    }
  },
  // 공허 — 보라색 공간 균열 · 거대한 눈동자가 잠시 열린다(조용하고 불길하게 — 섬광 · 흔들림 없음)
  eye(ctx, s, sc) {
    const k = env(s, sc, 0.6);
    const grow = ease(clamp((s - 0.1) / 0.9)), cx = W / 2, cy = H * 0.52;
    const n = nq(7);
    ctx.lineJoin = "miter";
    for (let i = 0; i < n; i++) {
      const an = i * (Math.PI * 2 / n) + hash(i) * 0.6, len = (W * 0.32 + hash(i + 5) * W * 0.18) * grow;
      const x0 = cx + Math.cos(an) * W * 0.62, y0 = cy + Math.sin(an) * H * 0.62;   // 가장자리에서 안쪽으로 갈라진다
      const x1 = x0 - Math.cos(an) * len, y1 = y0 - Math.sin(an) * len * 0.7;
      for (const [w, col, al] of [[6, "#3b1d6e", 0.5], [2, "#b48cff", 0.85], [0.8, "#efe2ff", 1]]) {
        ctx.globalAlpha = al * k; ctx.strokeStyle = col; ctx.lineWidth = w;
        jag(ctx, x0, y0, x1, y1, i + 11, 7, 16); ctx.stroke();
      }
    }
    // 거대한 눈 — 가장 강한 순간 전후로 천천히 열렸다 닫힌다
    const o = Math.sin(Math.PI * clamp((s - (sc.peak - 0.15)) / 1.15));
    if (o > 0.01) {
      const ew = W * 0.36, eh = H * 0.17 * o;
      ctx.save();
      ctx.globalAlpha = 0.42 * o;
      ctx.beginPath(); ctx.moveTo(cx - ew, cy); ctx.quadraticCurveTo(cx, cy - eh * 2, cx + ew, cy); ctx.quadraticCurveTo(cx, cy + eh * 2, cx - ew, cy); ctx.closePath();
      ctx.fillStyle = "rgba(12,4,24,.9)"; ctx.fill();
      ctx.clip();
      const ir = H * 0.2;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, ir);
      gr.addColorStop(0, "#f4e6ff"); gr.addColorStop(0.25, "#b07bff"); gr.addColorStop(0.7, "#4b1f8f"); gr.addColorStop(1, "rgba(30,10,60,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#07020f"; ctx.beginPath(); ctx.ellipse(cx, cy, ir * 0.09, ir * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 0.5 * o; ctx.strokeStyle = "#b48cff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - ew, cy); ctx.quadraticCurveTo(cx, cy - eh * 2, cx + ew, cy); ctx.quadraticCurveTo(cx, cy + eh * 2, cx - ew, cy); ctx.stroke();
    }
  },
};

// 화면 네 가장자리에서 안쪽으로 옅어지는 색 — alpha 가장자리 진하기, k 두께(짧은 변 몫)
function edge(ctx, color, alpha, k) {
  if (alpha <= 0.01) return;
  const d = Math.min(W, H) * k;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
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
