/* ── 월드보스 등장 연출 — 화면에만 그린다(판정 없음) ─────────────────────────
   수치는 worldBossIntroData.js. 이 기기의 시계(performance.now)로 흐르고 스냅샷에 싣지 않는다.
   tickWbIntro 는 RpgView 루프가 drawRpg 앞에서 부르고, drawWbIntroHud 는 drawRpg 뒤 화면 좌표로 그린다.
   보스 몸과 땅 효과는 worldBossArt.js 가 wbIntroScene 으로 지금 장면을 물어 그린다.
   본 연출 중 실제 공격 예고 · 기절이 들어오면 곧바로 이름표만 남긴다(경고 범위를 가리지 않게). */
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
    if (fight) begin(g, fight, me, t);
  }
  const it = S.intro;
  if (!it) return;
  if (it.full) {
    if (danger(fight)) cut(it, t, play);
    else {
      const e = t - it.at, sc = WB_INTRO_SCENE[it.id];
      // 소리는 그때그때 부른다 — 끊으면 남은 소리도 나지 않는다
      while (it.cue < sc.cues.length && e >= sc.cues[it.cue][0]) play(sc.cues[it.cue++][1]);
      if (!it.peaked && e >= sc.peak) { it.peaked = true; if (sc.shake) g.shake = Math.max(g.shake || 0, sc.shake); }
      if (e >= I.life + I.trail) it.full = false;
    }
  }
  if (it.big && danger(fight)) it.big = false;   // 본 연출 뒤 남은 붉은 문구도 공격 예고가 오면 지운다
  if (t > it.tagEnd) S.intro = null;
}

function begin(g, a, me, t) {
  const first = !S.seen.has(a.key);
  S.seen.add(a.key);
  if (S.seen.size > I.forget) S.seen.delete(S.seen.values().next().value);
  const sc = WB_INTRO_SCENE[a.id];
  const full = first && !!sc && !wbInCombat(g, a, me);
  // 드래곤 열기 같은 방향 연출은 내 캐릭터 쪽(화면 앞쪽)을 본다
  const ang = me ? Math.atan2(me.y - a.y, me.x - a.x) : Math.PI / 2;
  S.intro = full
    ? { key: a.key, id: a.id, at: t, full: true, big: true, cue: 0, peaked: false, ang, side: me && me.x < a.x ? -1 : 1,
        tagAt: t + sc.peak, tagEnd: t + I.life + I.tagHold }
    : { key: a.key, id: a.id, at: t, full: false, tagAt: t, tagEnd: t + I.again };
  S.pulse = null;
}
// 실제 공격이 들어옴 — 몸 보정 · 땅 효과 · 남은 소리를 끊고 이름표만 남긴다(다시 시작하지 않는다)
function cut(it, t, play) {
  it.full = false; it.big = false; it.cut = true;
  play("wbStop");
  if (t < it.tagAt) { it.tagAt = t; it.tagEnd = t + I.again; }
}
function stop(play) {
  if (S.intro?.full) play("wbStop");
  S.intro = null;
}

/* 지금 본 연출 장면 — 없거나 끊겼으면 null. e 경과(초), ang 앞쪽 방향, side 들어오는 쪽(뱀) */
export function wbIntroScene(id, t = nowS()) {
  const it = S.intro;
  if (!it || !it.full || it.id !== id) return null;
  return { id, e: t - it.at, ang: it.ang, side: it.side, sc: WB_INTRO_SCENE[id] };
}
// 시험 · 화면 확인용 — 지금 연출 상태
export const wbIntroState = () => S.intro && { ...S.intro };

function line(ctx, text, x, y, font, color, spacing = "0px") {
  ctx.font = font;
  if ("letterSpacing" in ctx) ctx.letterSpacing = spacing;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/* 화면 좌표 — 위아래 얇은 띠(본 연출 동안) · 왼쪽 아래 이름표, 다른 맵에서는 출현 예고 테두리 */
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
  let bh = 0;
  if (it.full) {
    const show = ease(Math.min(clamp(e / I.barIn), clamp((I.life + I.barOut - e) / I.barOut)));
    bh = Math.round(H * I.bar * show);
    if (bh > 0) {
      ctx.globalAlpha = I.barAlpha;
      ctx.fillStyle = "#120e0d";
      ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
      ctx.globalAlpha = 0.5 * show;
      ctx.fillStyle = B.color;
      ctx.fillRect(0, bh, W, 1); ctx.fillRect(0, H - bh - 1, W, 1);
    }
  }
  if (it.big) slam(ctx, g, it, B, e);
  // 이름표 — 왼쪽 아래, 왼쪽 정렬. 보스 빛깔은 선 하나에만 쓴다
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

/* 가장 강한 순간 — 화면 전체를 장악한다. 번쩍임 → 보스 빛깔 물듦 · 집중선 · 화면 끝까지 퍼지는 충격파 → 붉은 큰 문구.
   공격 예고가 들어오면(cut) 그리지 않는다 — 경고 범위를 가리지 않게 */
function slam(ctx, g, it, B, e) {
  const sc = WB_INTRO_SCENE[it.id], S2 = I.slam, pe = e - sc.peak;
  if (!sc || pe < 0) return;
  if (pe > S2.text) { it.big = false; return; }
  const cx = W / 2, cy = H * 0.46, diag = Math.hypot(W, H) / 2;
  ctx.save();
  // 번쩍임 · 물듦
  if (pe < S2.flashT) { ctx.globalAlpha = S2.flash * (1 - pe / S2.flashT); ctx.fillStyle = "#fff4e8"; ctx.fillRect(0, 0, W, H); }
  if (pe < S2.tintT) {
    const k = (1 - pe / S2.tintT) ** 2;
    ctx.globalAlpha = S2.tint * k; ctx.fillStyle = B.color; ctx.fillRect(0, 0, W, H);
    edge(ctx, "#2a0306", 0.75 * k, 0.3);
  }
  // 집중선 — 화면 가장자리에서 가운데로
  if (pe < S2.linesT) {
    const k = 1 - pe / S2.linesT;
    ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = "#fff1e2";
    for (let i = 0; i < S2.lines; i++) {
      const an = i * 2.39996, w = 1 + (i % 4), r0 = diag * (0.42 + ((i * 37) % 23) / 100);
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(cx + Math.cos(an) * diag * 1.2, cy + Math.sin(an) * diag * 1.2); ctx.stroke();
    }
  }
  // 충격파 — 화면 끝까지
  if (pe < S2.ringT) {
    const p = pe / S2.ringT, r = diag * 1.15 * ease(p);
    ctx.globalAlpha = 0.8 * (1 - p); ctx.strokeStyle = B.color; ctx.lineWidth = 18 * (1 - p) + 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.6 * (1 - p); ctx.strokeStyle = "#fff4e8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.8, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // 붉은 문구 — 크게 박히듯 들어와 머문다. 흔들림을 함께 탄다
  const a = Math.min(clamp(pe / S2.textIn), clamp((S2.text - pe) / S2.textOut));
  const z = 1 + (1 - ease(clamp(pe / S2.textIn))) * 0.7, sh = (g.shake || 0) * 6;
  const tx = W / 2 + (Math.random() - 0.5) * sh, ty = H * 0.3 + (Math.random() - 0.5) * sh;
  ctx.translate(tx, ty); ctx.scale(z, z);
  ctx.globalAlpha = a * 0.7;
  const band = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
  band.addColorStop(0, "rgba(20,2,4,0)"); band.addColorStop(0.5, "rgba(20,2,4,.85)"); band.addColorStop(1, "rgba(20,2,4,0)");
  ctx.fillStyle = band; ctx.fillRect(-W / 2, -62, W, 104);
  ctx.globalAlpha = a; ctx.fillStyle = S2.red;
  ctx.fillRect(-300, -60, 600, 2); ctx.fillRect(-300, 40, 600, 2);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  line(ctx, "월드보스 출현", 0, -30, "20px 'Do Hyeon',sans-serif", "#f1c9b8", "6px");
  ctx.font = "62px 'Do Hyeon',sans-serif";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "-2px";
  ctx.lineJoin = "round"; ctx.lineWidth = 9; ctx.strokeStyle = "#1c0507"; ctx.strokeText(sc.cry, 0, 30);
  ctx.shadowColor = "rgba(255,40,40,.85)"; ctx.shadowBlur = 26;
  ctx.fillStyle = S2.red; ctx.fillText(sc.cry, 0, 30);
  ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,190,180,.14)"; ctx.fillText(sc.cry, 0, 28);
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
