/* ── 월드보스 연출 그리기 — pixelfx(MIT) 픽셀 시트 ─────────────────────────
   수치는 worldBossPxData.js. 판정은 하지 않는다. 함수마다 시트를 못 불러왔으면 false 를 돌려주고,
   부른 쪽(worldBossArt.js)이 예전 코드 그림으로 대신 그린다. */
import { WB_PX_SRC, WB_PX_SHEETS as SH, WB_PX_LOOK as L } from "./worldBossPxData.js";
import { WORLD_BOSS as C } from "./worldBossData.js";

const TAU = Math.PI * 2;
const imgs = {};
function sheet(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) {
    im = imgs[name] = new Image();
    im.onerror = () => { imgs[name] = null; };
    im.src = `${WB_PX_SRC}${name}.webp`;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
// 월드보스 맵에 들어오면 미리 받아 둔다 — 첫 공격 때 비어 보이지 않게
export function warmWorldBossPx() { Object.keys(SH).forEach(sheet); }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fitK = (look, r) => clamp(r / look.rk, look.kMin || 0, look.kMax || 9);
// 구간 [a, b] 에서 t(0~1) 에 맞는 칸
const segAt = (seg, t) => seg[0] + Math.min(seg[1] - seg[0], Math.floor(clamp(t, 0, 1) * (seg[1] - seg[0] + 1)));

// 한 칸을 (x, y) 발밑에 k 배로 — 기준점이 (x, y) 에 온다
function cell(ctx, im, S, i, x, y, k, alpha = 1) {
  const sx = (i % S.cols) * S.w, sy = Math.floor(i / S.cols) * S.h;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(im, sx, sy, S.w, S.h, x - S.px * k, y - S.py * k, S.w * k, S.h * k);
  ctx.globalAlpha = a;
}
const once = (S, p) => Math.min(S.n - 1, Math.floor(clamp(p, 0, 1) * S.n));

// 고리 가운데 줄을 따라 고르게 흩은 자리(누운 원) — seed 로 시작 각도를 돌려 단계마다 다르게
function ringSpots(s, n, seed = 0) {
  const r = s.inner ? (s.r + s.inner) / 2 : s.r, out = [];
  for (let i = 0; i < n; i++) { const a = (i + 0.5) * TAU / n + seed * 0.7; out.push([s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * C.squash]); }
  return out;
}
// 곧은 경로(line)를 따라 몫 at 만큼 간 자리
const lineAt = (s, t) => [s.x + Math.cos(s.a) * s.len * t, s.y + Math.sin(s.a) * s.len * t * C.squash];

/* 경고 동안 — 드래곤 운석이 떨어지고(p 0.35 뒤), 기계 · 뇌조는 바닥 문양이 차오른다. 경고 범위는 따로 그대로 그린다 */
export function drawWbWarnPx(ctx, bossId, s, p) {
  if (s.shape !== "circle") return false;
  if (bossId === "dragon") {
    if (p <= 0.35) return true;
    const S = SH.meteor, im = sheet("meteor"); if (!im) return false;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    cell(ctx, im, S, segAt(S.warn, (p - 0.35) / 0.65), s.x, s.y, fitK(L.meteor, s.r), Math.min(1, (p - 0.35) * 6));
    ctx.restore(); return true;
  }
  if (bossId === "machine" || bossId === "thunderbird") {
    const name = bossId === "machine" ? "strike_m" : "strike_t", S = SH[name], im = sheet(name); if (!im) return false;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    cell(ctx, im, S, segAt(S.warn, p), s.x, s.y, fitK(L.strike, s.r));
    ctx.restore(); return true;
  }
  return false;
}

// 남는 독 웅덩이 — 칠한 자리는 따로 그대로 그린다
export function drawWbPoolPx(ctx, pool, time) {
  const S = SH.puddle, im = sheet("puddle"); if (!im) return false;
  const i = Math.floor(time * S.n / 4) % S.n, k = clamp((pool.r * L.puddle.fill) / L.puddle.rk, 1, L.puddle.kMax);
  // 사라지기 0.6초 전부터 흐려진다
  ctx.save(); ctx.imageSmoothingEnabled = false;
  cell(ctx, im, S, i, pool.x, pool.y, k, L.puddle.alpha * Math.min(1, pool.t / 0.6));
  ctx.restore(); return true;
}

// 기절 별 — 보스 머리 위를 돈다
export function drawWbStunPx(ctx, x, y, time) {
  const S = SH.stun, im = sheet("stun"); if (!im) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  cell(ctx, im, S, Math.floor(time * S.n / 2) % S.n, x, y - L.stun.lift + S.py * L.stun.k * 0.55, L.stun.k);
  ctx.restore(); return true;
}

/* 공격이 맞는 순간(sk_raid_hit) — 보스마다 */
function dragonHit(ctx, f, p, q) {
  const s = f.area;
  if (s.shape === "cone") {
    const S = SH.breath, im = sheet("breath"); if (!im) return false;
    const age = f.life - f.t, i = Math.floor(age * S.n / 1.5) % S.n;
    // 한 장을 크게 늘리면 알갱이가 뭉툭해진다 — 가까운 줄 · 먼 줄 두 겹으로 나눠 부채꼴 폭만큼 장을 늘어놓는다
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1, C.squash);
    ctx.globalAlpha *= L.breath.alpha * Math.min(1, (1 - p) / 0.3);
    L.breath.rows.forEach(([from, k, more], r) => {
      const half = L.breath.half * (r ? 0.8 : 1), n = Math.max(1, Math.round(s.arc / half)) + more;
      for (let j = 0; j < n; j++) {
        const a = n === 1 ? s.a : s.a - s.arc + half + (j * (s.arc - half) * 2) / (n - 1);
        ctx.save(); ctx.rotate(a); cell(ctx, im, S, (i + j * 3 + r * 5) % S.n, s.len * from, 0, k); ctx.restore();
      }
    });
    ctx.restore(); return true;
  }
  const S = SH.meteor, im = sheet("meteor"); if (!im) return false;
  const i = segAt(S.hit, p);
  if (s.shape === "ring") ringSpots(s, Math.max(4, Math.round(L.meteorRing.n * q)), f.seed).forEach(([x, y], j) => cell(ctx, im, S, segAt(S.hit, p + (j % 3) * 0.06), x, y, L.meteorRing.k));
  else cell(ctx, im, S, i, s.x, s.y, fitK(L.meteor, s.r || 150));
  return true;
}
function serpentHit(ctx, f, p, q) {
  const s = f.area, S = SH.acid, im = sheet("acid"); if (!im) return false;
  const i = once(S, p);
  if (s.shape === "ring") ringSpots(s, Math.max(4, Math.round(L.acidRing.n * q)), f.seed).forEach(([x, y], j) => cell(ctx, im, S, once(S, p + (j % 3) * 0.05), x, y, L.acidRing.k));
  else {
    // 원 가운데 하나(너무 키우면 납작한 띠처럼 보인다) — 큰 원(탈피 · 둘째 휩쓸기)만 둘레에 작은 것을 더한다
    const k = fitK(L.acid, s.r), m = s.r > 250 ? 4 : 0;
    cell(ctx, im, S, i, s.x, s.y, k);
    if (m) ringSpots({ x: s.x, y: s.y, r: s.r * 0.6 }, Math.max(2, Math.round(m * q)), f.seed).forEach(([x, y], j) => cell(ctx, im, S, once(S, p + (j % 2) * 0.06 + 0.04), x, y, L.acidRing.k));
  }
  return true;
}
function boltHit(ctx, f, p, q, name) {
  const s = f.area, S = SH[name], im = sheet(name); if (!im) return false;
  const i = segAt(S.hit, p);
  if (s.shape === "line") {
    // 지나는 길이 보이게 얇은 줄 하나 — 1~2px
    const [x1, y1] = lineAt(s, 1);
    ctx.save(); ctx.globalAlpha *= (1 - p) * 0.55; ctx.strokeStyle = name === "strike_m" ? "#cbe2ea" : "#d2d0ee"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
    L.strikeLine.at.forEach((t, j) => { const [x, y] = lineAt(s, t); cell(ctx, im, S, segAt(S.hit, p + j * 0.05), x, y, L.strikeLine.k); });
  } else if (s.shape === "ring") ringSpots(s, Math.max(4, Math.round(L.strikeRing.n * q)), f.seed).forEach(([x, y], j) => cell(ctx, im, S, segAt(S.hit, p + (j % 3) * 0.05), x, y, L.strikeRing.k));
  else if (s.shape === "outside") {
    // 안전 원 안 · 다음 안전 원 안에는 꽂지 않는다 — 폭풍은 바깥에서 번쩍인다
    const n = Math.max(4, Math.round(10 * q));
    for (let j = 0; j < n; j++) {
      const a = j * TAU / n, r = s.r + 100 + (j % 3) * 85, x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r * C.squash;
      if (f.nextSafe && Math.hypot(x - f.nextSafe.x, (y - f.nextSafe.y) / C.squash) < f.nextSafe.r + 40) continue;
      cell(ctx, im, S, segAt(S.hit, p + (j % 3) * 0.05), x, y, L.strikeRing.k);
    }
  } else cell(ctx, im, S, i, s.x, s.y, fitK(L.strike, s.r || 150));
  return true;
}
function featherHit(ctx, f, p) {
  const s = f.area, S = SH.feather, im = sheet("feather"), B = SH.strike_t, bim = sheet("strike_t"); if (!im || !bim) return false;
  const [x1, y1] = lineAt(s, 1);
  ctx.save(); ctx.globalAlpha *= (1 - p) * 0.6; ctx.strokeStyle = "#d2d0ee"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
  // 경로를 따라 깃털이 차례로 흩날리고, 끝에 낙뢰가 꽂힌다
  L.feather.at.forEach((t, j) => {
    const local = (p - j * L.feather.lag) / (1 - j * L.feather.lag); if (local < 0) return;
    const [x, y] = lineAt(s, t); cell(ctx, im, S, once(S, local), x, y - 40, L.feather.k);
  });
  cell(ctx, bim, B, segAt(B.hit, p), x1, y1, L.strikeLine.k);
  return true;
}

/* 즉사 기술 — 경고 동안 보스 머리 위 저주 문양이 그려진다(p 0~1) */
export function drawWbDoomSigilPx(ctx, x, y, p) {
  const S = SH.doom_sigil, im = sheet("doom_sigil"); if (!im) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false; cell(ctx, im, S, segAt(S.warn, p), x, y - L.doomSigil.lift, L.doomSigil.k); ctx.restore();
  return true;
}
const inSafe = (f, x, y) => (f.area.safes || []).some((z) => Math.hypot(x - z.x, (y - z.y) / C.squash) < z.r + 30);
function doomHit(ctx, f, p, q) {
  const s = f.area, sg = SH.doom_sigil, sim = sheet("doom_sigil");
  // 문양이 부서지는 칸 — 맞는 순간 앞 4할 동안
  if (sim && p < 0.4) cell(ctx, sim, sg, segAt(sg.hit, p / 0.4), f.x, f.y - L.doomSigil.lift, L.doomSigil.k);
  if (f.tone === "dragon") {
    const S = SH.doom_nuke, im = sheet("doom_nuke"), D = L.doomNuke; if (!im) return false;
    D.rings.forEach(([r, cnt, k], ri) => {
      const n = Math.max(3, Math.round(cnt * q));
      for (let j = 0; j < n; j++) {
        const a = j * TAU / n + 0.4 + ri * 0.3, x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r * C.squash;
        if (!inSafe(f, x, y)) cell(ctx, im, S, once(S, p * 1.15 - (j % 3) * 0.05 - ri * 0.04), x, y, k);
      }
    });
    cell(ctx, im, S, once(S, p), s.x, s.y, D.k);
    return true;
  }
  if (f.tone === "serpent") {
    const S = SH.doom_miasma, im = sheet("doom_miasma"), D = L.doomMiasma; if (!im) return false;
    const i = Math.floor(p * S.n * 1.5), fade = D.alpha * Math.min(1, p * 6) * Math.min(1, (1 - p) / 0.35), step = D.step / Math.max(0.5, q);
    D.rows.forEach((d, r) => {
      for (let a = -s.arc + step / 2; a <= s.arc; a += step * (r ? 300 / d : 1)) {
        const x = s.x + Math.cos(s.a + a) * d, y = s.y + Math.sin(s.a + a) * d * C.squash;
        cell(ctx, im, S, (i + r * 3 + Math.round(a * 5)) % S.n, x, y, D.k, fade);
      }
    });
    return true;
  }
  if (f.tone === "machine") {
    const S = SH.doom_emp, im = sheet("doom_emp"), D = L.doomEmp; if (!im) return false;
    D.rings.forEach(([r, cnt], ri) => ringSpots({ x: s.x, y: s.y, r }, Math.max(4, Math.round(cnt * q)), ri + f.seed).forEach(([x, y], j) =>
      cell(ctx, im, S, once(S, p * 1.1 - ri * 0.06 - (j % 2) * 0.03), x, y, D.k)));
    return true;
  }
  const S = SH.doom_plasma, im = sheet("doom_plasma"), B = SH.strike_t, bim = sheet("strike_t"), D = L.doomPlasma; if (!im) return false;
  if (bim) D.bolts.forEach(([at, cnt], ri) => ringSpots({ x: s.x, y: s.y, r: s.r * at }, Math.max(3, Math.round(cnt * q)), f.seed + ri).forEach(([x, y], j) => cell(ctx, bim, B, segAt(B.hit, p + (j % 3) * 0.05), x, y, D.boltK)));
  cell(ctx, im, S, once(S, p * 0.9), s.x, s.y, D.k);
  return true;
}

export function drawWbHitPx(ctx, f, p, q) {
  if (!f.area) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  let ok;
  if (f.doom) ok = doomHit(ctx, f, p, q);
  else if (f.tone === "serpent") ok = serpentHit(ctx, f, p, q);
  else if (f.tone === "machine") ok = boltHit(ctx, f, p, q, "strike_m");
  else if (f.tone === "thunderbird") ok = f.pattern === "thunder_feathers" && f.area.shape === "line" ? featherHit(ctx, f, p) : boltHit(ctx, f, p, q, "strike_t");
  else ok = dragonHit(ctx, f, p, q);
  ctx.restore();
  return ok;
}

// 합동 공격 성공(sk_raid_break) — f.y 는 보스 가슴 높이라 발밑(+130)에 내리친다
export function drawWbBreakPx(ctx, f, p) {
  const S = SH.break, im = sheet("break"); if (!im) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false; cell(ctx, im, S, once(S, p), f.x, f.y + 130, L.break.k); ctx.restore();
  return true;
}
// 토벌(sk_raid_end) — 보스가 쓰러진 자리에 빛기둥
export function drawWbFallPx(ctx, f, p) {
  const S = SH.fall, im = sheet("fall"); if (!im) return true;   // 예전에는 연출이 없었다 — 못 불러오면 그리지 않는다
  ctx.save(); ctx.imageSmoothingEnabled = false; cell(ctx, im, S, once(S, p), f.x, f.y, L.fall.k); ctx.restore();
  return true;
}
