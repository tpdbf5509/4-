/* ── 1차 전직 그리기 ─────────────────────────────────────────
   그림은 생성한 투명 아틀라스 셋(advData.js ADV_ART, 원본 design/advance). 못 불러오면 코드 그림으로 대신해 게임이 깨지지 않는다.
   drawAdvFx — 스킬 연출(kind "sk_adv_*") · drawAdvHero — 영웅 둘레(철벽 방어 · 중첩 · 정령) · drawAdvHeldItem — 손에 든 총 · 소환서 ·
   drawAdvShield — 기사 방패 · drawAdvMob — 명사수 표식 · drawAdvNpc — 광장 전직 교관.
   판정은 하지 않는다 — 방장이 보낸 연출 · 스냅샷 상태만 그린다 */
import { ADV, ADV_ART, ADV_BY_ID, ADV_UP, ADV_BLESS, ADV_TRAITS, advForJob } from "./advData.js";
import { spiritSpot } from "./advance.js";
import { ELEM_BY_ID, ELEMS, RPG } from "./rpg.js";

const SQ = () => RPG.squash;
const TAU = Math.PI * 2;
const imgs = {};
function atlas(name) {
  if (typeof Image === "undefined") return null;
  let im = imgs[name];
  if (im === undefined) {
    im = imgs[name] = new Image();
    im.onerror = () => { imgs[name] = null; };
    im.src = ADV_ART[name].src;
  }
  return im && im.complete && im.naturalWidth ? im : null;
}
// RPG 에 들어올 때 미리 읽는다(rpgArt.js warmRpgArt)
export const warmAdvArt = () => { atlas("fx"); atlas("spirits"); atlas("items"); atlas("up"); atlas("bless"); };
// 아틀라스 한 칸을 (x, y) 가운데에 w × h 로 — 그림이 없으면 false
function cell(ctx, name, i, x, y, w, h) {
  const im = atlas(name);
  if (!im) return false;
  const A = ADV_ART[name], c = A.cell;
  ctx.drawImage(im, (i % A.cols) * c, Math.floor(i / A.cols) * c, c, c, x - w / 2, y - h / 2, w, h);
  return true;
}
// 흰 마법진 · 폭발을 원소 빛깔로 물들인 칸 — 빛깔마다 한 번 만들어 둔다
const tinted = new Map();
function tintCell(i, color, keep) {
  const key = `${i}|${color}|${keep}`;
  if (tinted.has(key)) return tinted.get(key);
  const im = atlas("fx");
  if (!im || typeof document === "undefined") return null;
  const c = ADV_ART.fx.cell, cv = document.createElement("canvas");
  cv.width = cv.height = c;
  const x = cv.getContext("2d");
  x.drawImage(im, (i % ADV_ART.fx.cols) * c, Math.floor(i / ADV_ART.fx.cols) * c, c, c, 0, 0, c, c);
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = keep;                            // keep — 덮는 빛깔의 짙기(가운데 흰빛을 조금 남긴다)
  x.fillStyle = color;
  x.fillRect(0, 0, c, c);
  tinted.set(key, cv);
  return cv;
}
const elemCol = (id) => (ELEM_BY_ID[id] || ELEMS[0]).light;
const fade = (p, from) => (p < from ? 1 : Math.max(0, 1 - (p - from) / (1 - from)));
function glow(ctx, x, y, r, col, a) {
  const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
  gl.addColorStop(0, col); gl.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = a; ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
const FX = ADV_ART.FX;

/* 스킬 연출 — 그렸으면 true(skillArt.js drawSkillFx 가 먼저 묻는다). q 는 알갱이 몫(연출 줄이기) */
export function drawAdvFx(ctx, f, p, time, q = 1) {
  if (!f.kind.startsWith("sk_adv_")) return false;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const k = f.kind.slice(7);
  if (k === "up") {                                // 전직 — 마법진 → 빛기둥 → 왕관 → 사그라듦(6칸). 칸 사이는 겹쳐 부드럽게 넘긴다
    const n = 6, at = Math.min(n - 1e-3, p * n), i = Math.floor(at), mix = at - i, w = ADV_UP.w, top = f.y - w * ADV_UP.foot, k0 = ADV_UP.alpha;
    ctx.globalAlpha = (1 - mix) * fade(p, 0.85) * k0;
    const drew = cell(ctx, "up", i, f.x, top + w / 2, w, w);
    if (drew && i < n - 1) { ctx.globalAlpha = mix * fade(p, 0.85) * k0; cell(ctx, "up", i + 1, f.x, top + w / 2, w, w); }
    if (!drew) { glow(ctx, f.x, f.y - 90, 120, "#ffe2a0", 0.6 * (1 - p)); glow(ctx, f.x, f.y, 90, "#fff2c8", 0.5 * (1 - p)); }   // 그림이 없으면 빛만
    ctx.restore();
    return true;
  }
  if (k === "slash") {                             // 삼연참 — 붉은 · 은빛 초승달. 세 번째는 크고 뒤집혀 교차한다
    const s = f.r * (f.i === 2 ? 1.5 : 1.25) * (0.8 + 0.2 * Math.min(1, p * 4));   // 몸을 덮지 않게 앞쪽에 알맞은 크기로
    ctx.globalAlpha = fade(p, 0.3) * 0.85;
    ctx.translate(f.x, f.y); ctx.rotate(f.a + (f.i === 1 ? 0.9 : f.i === 2 ? -0.5 : -0.9));
    if (f.i === 1) ctx.scale(1, -1);
    // 그림의 초승달은 볼록한 쪽이 왼쪽("(")이라 좌우로 뒤집어 볼록한 쪽이 벤 쪽(앞)을 보게 한다(10월 27일, 반대로 나간다는 제보)
    ctx.save(); ctx.scale(-1, 1);
    const drew = cell(ctx, "fx", FX.slash, 0, 0, s, s);
    if (drew && f.boost) { ctx.globalAlpha *= 0.35; cell(ctx, "fx", FX.slash, -4, 0, s * 1.05, s * 1.05); }   // 투지 폭발 — 한 겹 더
    ctx.restore();
    if (!drew) {                                   // 코드 그림은 처음부터 볼록한 쪽이 앞이다
      ctx.strokeStyle = "#ff8a8a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, s * 0.4, -1.2, 1.2); ctx.stroke();
    }
  } else if (k === "shock") {                      // 삼연참 마지막 충격파
    const s = f.r * 2 * (0.5 + 0.7 * p);
    ctx.globalAlpha = fade(p, 0.3);
    ctx.translate(f.x, f.y); ctx.scale(1, SQ());
    if (!cell(ctx, "fx", FX.shock, 0, 0, s, s)) { ctx.strokeStyle = "#ffb0a0"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, TAU); ctx.stroke(); }
  } else if (k === "guard") {                      // 철벽 방어 — 앞에 금빛 방패 문양이 솟는다
    // 몸 앞쪽(f.x 는 이미 앞)에 솟았다 가라앉는다 — 캐릭터를 통째로 덮지 않게 작게 · 옅게
    const s = (f.small ? 34 : 58) * (0.6 + 0.4 * Math.min(1, p * 5));
    ctx.globalCompositeOperation = "source-over";   // 더하기 합성은 흰 덩어리가 되어 몸을 가렸다
    ctx.globalAlpha = fade(p, 0.4) * 0.85;
    if (!cell(ctx, "fx", FX.shield, f.x, f.y - p * 8, s, s)) glow(ctx, f.x, f.y, s / 2, "#ffe08a", 0.6);
  } else if (k === "hex") {                        // 막아 낸 반격 — 육각 충격파
    const s = f.r * 2 * (0.4 + 0.8 * p);
    ctx.globalAlpha = fade(p, 0.25);
    ctx.translate(f.x, f.y + 26); ctx.scale(1, SQ());
    if (!cell(ctx, "fx", FX.hex, 0, 0, s, s)) { ctx.strokeStyle = "#ffd873"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, TAU); ctx.stroke(); }
  } else if (k === "snipe") {                      // 관통 저격 — 청록 조준선 → 밝은 화살
    const t = p * f.life, ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
    if (t < f.aim) {
      const a = t / f.aim;
      ctx.globalAlpha = 0.35 + 0.5 * a * (0.7 + 0.3 * Math.sin(time * 60));
      ctx.strokeStyle = "#7ff3e4"; ctx.lineWidth = 1 + a * 1.5; ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.stroke();
    } else {
      const a = Math.min(1, (t - f.aim) / 0.16), x = f.x0 + (f.x1 - f.x0) * a, y = f.y0 + (f.y1 - f.y0) * a;
      ctx.globalAlpha = fade((t - f.aim) / (f.life - f.aim), 0.5);
      ctx.strokeStyle = "#bffcf3"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(x, y); ctx.stroke();
      ctx.translate(x, y); ctx.rotate(ang);
      if (!cell(ctx, "fx", FX.arrow, -40, 0, 120, 120)) { ctx.fillStyle = "#e9fffb"; ctx.fillRect(-30, -2, 34, 4); }
    }
  } else if (k === "flash") {                      // 관통한 자리마다 작은 빛
    const s = f.r * 2 * (0.6 + 0.6 * p);
    ctx.globalAlpha = fade(p, 0.3);
    if (!cell(ctx, "fx", FX.flash, f.x, f.y, s, s)) glow(ctx, f.x, f.y, s / 2, "#9ff0e6", 0.8);
  } else if (k === "shot") {                       // 속사 — 좌우 총구 화염 · 탄환 궤적 · 탄피
    const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), fly = Math.min(1, p * 1.5);
    const x = f.x0 + (f.x1 - f.x0) * fly, y = f.y0 + (f.y1 - f.y0) * fly;
    if (p < 0.45) {
      ctx.save(); ctx.globalAlpha = 1 - p / 0.45;
      ctx.translate(f.x0 + Math.cos(ang) * 4, f.y0 + Math.sin(ang) * 4); ctx.rotate(ang);   // x0 이 이미 총구 자리
      if (!cell(ctx, "fx", FX.muzzle, 6, 0, 46, 46)) glow(ctx, 0, 0, 12, "#ffb45a", 0.9);
      ctx.restore();
    }
    if (fly < 1) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = 1;
      if (!cell(ctx, "fx", FX.bullet, -8, 6, 54, 54)) { ctx.fillStyle = "#ffcf7a"; ctx.fillRect(-14, -1.5, 18, 3); }
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";   // 탄피 — 옆으로 튀어 떨어진다
    ctx.globalAlpha = fade(p, 0.6);
    ctx.fillStyle = "#d6a443";
    const cx = f.x0 - (f.side || 1) * (6 + p * 20), cy = f.y0 + 10 + p * p * 40;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(p * 14); ctx.fillRect(-2.5, -1.2, 5, 2.4); ctx.restore();
  } else if (k === "circle") {                     // 마력 폭발 예고 — 원소 빛 마법진
    const c = tintCell(FX.circle, elemCol(f.elem), 0.75), s = f.r * 2 * (0.7 + 0.3 * Math.min(1, p * 3));
    ctx.globalAlpha = Math.min(1, p * 4) * fade(p, 0.8) * 0.6;   // 판정 넓이 그대로라 크다 — 몹 · 캐릭터가 비쳐 보이게 옅게
    ctx.translate(f.x, f.y); ctx.scale(1, SQ()); ctx.rotate(time * 0.8);
    if (c) ctx.drawImage(c, -s / 2, -s / 2, s, s);
    else { ctx.strokeStyle = elemCol(f.elem); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, TAU); ctx.stroke(); }
  } else if (k === "burst") {                      // 마력 폭발 — 가운데서 터져 원형 충격파가 퍼진다
    const col = elemCol(f.elem), c = tintCell(FX.burst, col, 0.7), s = f.r * 1.5 * (0.45 + 0.65 * p);   // 판정 반지름 안에서 터진다
    ctx.globalAlpha = fade(p, 0.3) * 0.75;
    if (c) ctx.drawImage(c, f.x - s / 2, f.y - s / 2, s, s);
    else glow(ctx, f.x, f.y, s / 2, col, 0.8);
    ctx.globalAlpha = fade(p, 0.2) * 0.8;
    ctx.strokeStyle = col; ctx.lineWidth = 4 * (1 - p) + 1;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 20, f.r * (0.3 + 0.8 * p), f.r * (0.3 + 0.8 * p) * SQ(), 0, 0, TAU); ctx.stroke();
  } else if (k === "bless") {                      // 수호의 축복 — 발밑 흰 마법진이 범위만큼 퍼지고 금빛 고리가 번진다
    const s = f.r * 2 * Math.min(1, 0.35 + p * 2);
    ctx.globalAlpha = Math.min(1, p * 6) * fade(p, 0.4) * 0.5;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(1, SQ()); ctx.rotate(time * 0.8);
    if (!cell(ctx, "fx", FX.circle, 0, 0, s, s)) { ctx.strokeStyle = "#ffe8a8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s / 2.2, 0, TAU); ctx.stroke(); }
    ctx.restore();
    ctx.globalAlpha = fade(p, 0.3) * 0.7;
    ctx.strokeStyle = "#fff0c0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * p, f.r * p * SQ(), 0, 0, TAU); ctx.stroke();
    glow(ctx, f.x, f.y - 50, 70, "#fff2c8", 0.5 * fade(p, 0.2));
  } else if (k === "summon") {                     // 정령 소환 — 푸른 소환진과 빛 알갱이
    const s = f.r * 2.4;
    ctx.globalAlpha = Math.min(1, p * 5) * fade(p, 0.55);
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(1, SQ()); ctx.rotate(-time * 1.2);
    if (!cell(ctx, "fx", FX.summon, 0, 0, s, s)) { ctx.strokeStyle = "#7fb6ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s / 2.2, 0, TAU); ctx.stroke(); }
    ctx.restore();
    const n = Math.max(3, Math.round(10 * q)), col = elemCol(f.elem);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + time, rr = f.r * (0.4 + 0.6 * ((i * 37) % 10) / 10);
      glow(ctx, f.x + Math.cos(a) * rr, f.y - p * 70 - (i % 3) * 8 + Math.sin(a) * rr * SQ(), 6, i % 2 ? "#cfe3ff" : col, fade(p, 0.4));
    }
  } else if (k === "spshot") {                     // 정령의 공격 — 원소 빛 구슬
    const x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p, col = elemCol(f.elem);
    glow(ctx, x, y, 14, col, 0.95); glow(ctx, x, y, 5, "#ffffff", 1);
  } else if (k === "combo") {                      // 검투사 연계 참격 — 붉은 검격 둘이 엇갈린다(4단계는 셋 · 더 크다)
    const n = f.big ? 3 : 2, s = f.r * 1.9 * (0.75 + 0.35 * Math.min(1, p * 4));
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.globalAlpha = fade(p, 0.35) * (0.9 - i * 0.15);
      ctx.translate(f.x, f.y); ctx.rotate(-0.7 + i * (Math.PI / n) + p * 0.6);
      if (i % 2) ctx.scale(1, -1);
      const c = tintCell(FX.slash, "#ff5a48", 0.45);
      if (c) ctx.drawImage(c, -s / 2, -s / 2, s, s);
      else { ctx.strokeStyle = "#ff7a6a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, s * 0.38, -1.1, 1.1); ctx.stroke(); }
      ctx.restore();
    }
    glow(ctx, f.x, f.y, f.r * 0.5, "#ff8a70", 0.5 * fade(p, 0.2));
  } else if (k === "wave") {                       // 기사 수호의 방패 — 금빛 방패 충격파 · 도발한 몹 머리 위 ! (4단계는 두 겹)
    const rings = f.big ? 2 : 1;
    for (let i = 0; i < rings; i++) {
      const pp = Math.max(0, p - i * 0.18), s = f.r * 2 * (0.25 + 0.85 * pp);
      ctx.save(); ctx.globalAlpha = fade(pp, 0.3) * 0.8;
      ctx.translate(f.x, f.y + 20); ctx.scale(1, SQ());
      const c = tintCell(FX.hex, "#ffd873", 0.35);
      if (c) ctx.drawImage(c, -s / 2, -s / 2, s, s);
      ctx.strokeStyle = "#ffe3a0"; ctx.lineWidth = 3 * (1 - pp) + 1;
      ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = fade(p, 0.5) * 0.9;
    if (!cell(ctx, "fx", FX.shield, f.x, f.y - 16 - p * 10, 46, 46)) glow(ctx, f.x, f.y - 16, 20, "#ffe08a", 0.6);
    ctx.globalCompositeOperation = "source-over";
    ctx.font = "15px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    (f.marks || []).forEach(([mx, my]) => {
      ctx.globalAlpha = fade(p, 0.6);
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(40,26,10,0.85)"; ctx.strokeText("!", mx, my - p * 6);
      ctx.fillStyle = "#ffd873"; ctx.fillText("!", mx, my - p * 6);
    });
  } else if (k === "prec") {                       // 명사수 정밀 사격 — 첫 적에서 뒤로 꿰뚫는 청록 궤적
    const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), a = Math.min(1, p * 3);
    const x = f.x0 + (f.x1 - f.x0) * a, y = f.y0 + (f.y1 - f.y0) * a;
    ctx.globalAlpha = fade(p, 0.35);
    ctx.strokeStyle = "#7ff3e4"; ctx.lineWidth = f.big ? 4 : 2.5;
    ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(x, y); ctx.stroke();
    if (f.big) { ctx.globalAlpha *= 0.4; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha = fade(p, 0.35); }
    if (!cell(ctx, "fx", FX.flash, f.x0, f.y0, 60 * (0.6 + p), 60 * (0.6 + p))) glow(ctx, f.x0, f.y0, 24, "#9ff0e6", 0.8);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (!cell(ctx, "fx", FX.arrow, -36, 0, 100, 100)) { ctx.fillStyle = "#e9fffb"; ctx.fillRect(-26, -2, 30, 4); }
    ctx.restore();
  } else if (k === "mshot") {                      // 총사 기동 사격 — 추가 탄환 · 총구 화염 · 튀는 탄피(4단계는 탄피 둘)
    const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0), fly = Math.min(1, p * 2.2);
    if (p < 0.35) {
      ctx.save(); ctx.globalAlpha = 1 - p / 0.35; ctx.translate(f.x0, f.y0); ctx.rotate(ang);
      if (!cell(ctx, "fx", FX.muzzle, 6, 0, 40, 40)) glow(ctx, 0, 0, 10, "#ffb45a", 0.9);
      ctx.restore();
    }
    if (fly < 1) {
      const x = f.x0 + (f.x1 - f.x0) * fly, y = f.y0 + (f.y1 - f.y0) * fly;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      if (!cell(ctx, "fx", FX.bullet, -8, 6, 50, 50)) { ctx.fillStyle = "#ffcf7a"; ctx.fillRect(-12, -1.5, 16, 3); }
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#d6a443";
    for (let i = 0; i < (f.big ? 2 : 1); i++) {
      ctx.globalAlpha = fade(p, 0.6);
      const cx = f.x0 - (f.side || 1) * (5 + p * (18 + i * 8)), cy = f.y0 + 8 + p * p * (36 + i * 10);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(p * (12 + i * 5)); ctx.fillRect(-2.5, -1.2, 5, 2.4); ctx.restore();
    }
  } else if (k === "reso") {                       // 마도사 원소 공명 — 원소 빛 고리가 공명 수만큼 퍼진다
    const col = elemCol(f.elem);
    for (let i = 0; i < (f.n || 1); i++) {
      const pp = Math.max(0, p - i * 0.12), rr = f.r * (0.3 + 0.9 * pp) * (f.big ? 1.15 : 1);
      ctx.globalAlpha = fade(pp, 0.25) * 0.8;
      ctx.strokeStyle = col; ctx.lineWidth = 3 * (1 - pp) + 1;
      ctx.beginPath(); ctx.ellipse(f.x, f.y + 20, rr, rr * SQ(), 0, 0, TAU); ctx.stroke();
    }
    const c = tintCell(FX.burst, col, 0.7), s = f.r * (0.6 + 0.5 * p);
    ctx.globalAlpha = fade(p, 0.2) * 0.55;
    if (c) ctx.drawImage(c, f.x - s / 2, f.y - s / 2, s, s); else glow(ctx, f.x, f.y, s / 2, col, 0.7);
  } else if (k === "coop") {                       // 소환술사 정령 협동 공격 — 정령마다 적에게 이어지는 빛줄기 하나(판정은 한 번)
    const col = elemCol(f.elem), n = Math.min(10, f.n || 1), head = { x: f.x0, y: f.y0, dir: f.d || 1 };
    ctx.globalAlpha = fade(p, 0.35) * 0.85;
    ctx.strokeStyle = col; ctx.lineWidth = f.big ? 2.5 : 1.6;
    for (let i = 0; i < n; i++) {
      const [sx, sy] = spiritSpot(head, i, n), a = Math.min(1, p * 3);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + f.x) / 2, Math.min(sy, f.y) - 30, sx + (f.x - sx) * a, sy + (f.y - sy) * a); ctx.stroke();
    }
    glow(ctx, f.x, f.y, (18 + n * 2.5) * (0.6 + p), col, fade(p, 0.3));
    glow(ctx, f.x, f.y, 8, "#ffffff", fade(p, 0.3));
  } else if (k === "esh") {                        // 치유사 긴급 보호막 — 치유사에서 이어진 금빛 실 · 몸을 감싸는 방벽(4단계는 날개 문양)
    if (!f.self) {
      ctx.globalAlpha = fade(p, 0.3) * 0.7; ctx.strokeStyle = "#fff0b0"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.quadraticCurveTo((f.x0 + f.x) / 2, Math.min(f.y0, f.y) - 40, f.x, f.y); ctx.stroke();
    }
    const rr = 34 * (0.7 + 0.3 * Math.min(1, p * 4));
    ctx.globalAlpha = fade(p, 0.5) * 0.75;
    ctx.strokeStyle = "#ffe8a8"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, rr, rr * 1.15, 0, 0, TAU); ctx.stroke();
    glow(ctx, f.x, f.y, rr, "#fff2c8", 0.35 * fade(p, 0.4));
    if (f.big) [-1, 1].forEach((sd) => {
      ctx.beginPath(); ctx.ellipse(f.x + sd * rr * 0.9, f.y - 8, rr * 0.45, rr * 0.8, sd * 0.5, 0, TAU); ctx.stroke();
    });
  } else if (k === "mastery") {                    // 전직 숙련도 단계 상승 — 발밑 금빛 고리 · 단계 수만큼 별
    const col = (ADV_TRAITS[f.c] && ADV_TRAITS[f.c].color) || "#ffd873";
    ctx.globalAlpha = fade(p, 0.5) * 0.8;
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, 40 + p * 40, (40 + p * 40) * SQ(), 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < (f.lv || 1); i++) {
      const a = (i / (f.lv || 1)) * TAU + time * 2;
      glow(ctx, f.x + Math.cos(a) * 30, f.y - 60 - p * 40 + Math.sin(a) * 10, 8, col, fade(p, 0.5));
    }
  } else if (k === "link") {                       // 영혼 연결 — 나와 적 사이 푸른 실
    ctx.globalAlpha = fade(p, 0.3);
    ctx.strokeStyle = "#b9d8ff"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.quadraticCurveTo((f.x0 + f.x) / 2, Math.min(f.y0, f.y) - 50, f.x, f.y); ctx.stroke();
    glow(ctx, f.x, f.y, 26 * (0.6 + p), elemCol(f.elem), fade(p, 0.3));
  }
  ctx.restore();
  return true;
}
// 땅에 깔리는 것 — 몸보다 먼저(skillArt.js GROUND_FX 에 더한다)
export const ADV_GROUND = ["sk_adv_circle", "sk_adv_summon"];

/* 영웅 둘레 — 철벽 방어 방패 · 파티 보호 · 중첩 표시 · 정령 */
export function drawAdvHero(ctx, h, time) {
  if (h && h.tauntT > 0 && h.down <= 0) drawTauntMark(ctx, h.x, h.y - 126, time);   // 기사에게 도발당한 사람
  const a = h && h.as;
  if (!a || h.down > 0) return;
  ctx.save();
  if (a.nul && h.advClass === "knight") {          // 무효화 방어막 — 몸을 감싸는 옅은 육각 막
    ctx.globalAlpha = 0.22 + 0.08 * Math.sin(time * 3);
    ctx.strokeStyle = "#cfe6ff"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const t = (i / 6) * TAU + Math.PI / 6; const x = h.x + Math.cos(t) * 34, y = h.y - 40 + Math.sin(t) * 46; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.globalAlpha *= 0.35; ctx.fillStyle = "#cfe6ff"; ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (a.gT > 0) {                                  // 철벽 방어 — 앞에 금빛 방패가 떠 있다
    ctx.globalAlpha = 0.45 + 0.1 * Math.sin(time * 5);   // 얼굴 · 몸을 가리지 않게 옅게 · 작게, 바라보는 쪽 앞에
    const x = h.x + (h.dir || 1) * 24, y = h.y - 30;
    if (!cell(ctx, "fx", FX.shield, x, y, 32, 32)) glow(ctx, x, y, 16, "#ffe08a", 0.5);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ffd873"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, 30, 30 * SQ(), 0, 0, TAU); ctx.stroke();
  } else if (a.pT > 0) {                           // 기사가 걸어 준 파티 보호
    ctx.globalAlpha = 0.4; ctx.strokeStyle = "#ffe3a0"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, 24, 24 * SQ(), 0, 0, TAU); ctx.stroke();
  }
  if (a.blT > 0) drawBlessAura(ctx, h, a.blT, time);   // 치유사 수호의 축복을 받은 사람 — 둘레 빛 고리
  ctx.globalCompositeOperation = "source-over";
  const c = ADV_BY_ID[h.advClass];
  if (c && a.st > 0 && c.id !== "knight" && c.id !== "summoner") {   // 쌓인 것 — 발밑에 작은 점
    const max = c.passive.max || c.passive.need || 1, col = { gladiator: "#ff8f7a", marksman: "#7ff3e4", gunner: "#ffb45a", archmage: elemCol(h.elem) }[c.id];
    const n = Math.min(max, a.st);
    for (let i = 0; i < n; i++) {
      const ang = (i / max) * TAU + time * (c.id === "archmage" ? 1.6 : 0);
      ctx.globalAlpha = n >= max ? 0.95 : 0.7;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(h.x + Math.cos(ang) * 22, h.y + Math.sin(ang) * 22 * SQ(), n >= max ? 2.8 : 2.2, 0, TAU); ctx.fill();
    }
  }
  (a.sps || []).forEach((sp, i) => { if (sp.t > 0 && Number.isFinite(sp.x)) drawSpirit(ctx, h, sp, time + i * 0.7); });
  drawTraitState(ctx, h, a, time);
  ctx.restore();
}
/* 전투 특성 상태 — 명사수 정밀 사격 준비(앞쪽 청록 조준점) · 총사 기동 사격(발밑 주황 고리) · 마도사 원소 공명(머리 위 도는 원소 구슬) */
function drawTraitState(ctx, h, a, time) {
  if (a.pr && h.advClass === "marksman") {
    const x = h.x + (h.dir || 1) * 30, y = h.y - 40, r = 6 + Math.sin(time * 8) * 1.2;
    ctx.globalAlpha = 0.9; ctx.strokeStyle = "#7ff3e4"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r - 3, y); ctx.lineTo(x + r + 3, y); ctx.moveTo(x, y - r - 3); ctx.lineTo(x, y + r + 3); ctx.stroke();
  }
  if (a.mvT > 0 && h.advClass === "gunner") {
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 10); ctx.strokeStyle = "#ffb45a"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.ellipse(h.x, h.y, 26, 26 * SQ(), time * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (a.rs > 0 && h.advClass === "archmage") {
    const col = elemCol(h.elem);
    for (let i = 0; i < a.rs; i++) {
      const ang = (i / ADV_TRAITS.archmage.max) * TAU + time * 2.2;
      glow(ctx, h.x + Math.cos(ang) * 18, h.y - 92 + Math.sin(ang) * 5, 7, col, 0.85);
      glow(ctx, h.x + Math.cos(ang) * 18, h.y - 92 + Math.sin(ang) * 5, 2.5, "#ffffff", 0.9);
    }
  }
}
// 축복 고리 — adv-bless.webp 6칸을 돌려 그린다(검은 바탕이라 lighter). 끝나기 fade 초 전부터 흐려진다
function drawBlessAura(ctx, h, left, time) {
  const B = ADV_BLESS, w = B.w, at = (time * B.fps + h.pi * 1.7) % 6, i = Math.floor(at), mix = at - i;
  const k0 = B.alpha * Math.min(1, left / B.fade), cy = h.y - w * B.foot + w / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = (1 - mix) * k0;
  const drew = cell(ctx, "bless", i, h.x, cy, w, w);
  if (drew) { ctx.globalAlpha = mix * k0; cell(ctx, "bless", (i + 1) % 6, h.x, cy, w, w); }
  else {                                           // 그림이 없으면 금빛 고리만
    ctx.globalAlpha = k0 * 0.6; ctx.strokeStyle = "#ffe8a8"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, 34, 34 * SQ(), 0, 0, TAU); ctx.stroke();
    glow(ctx, h.x, h.y - 40, 30, "#fff2c8", 0.25 * k0);
  }
  ctx.restore();
}
function drawSpirit(ctx, h, sp, time) {
  const i = Math.max(0, ELEMS.findIndex((e) => e.id === h.elem));
  const bob = Math.sin(time * 3 + h.pi) * 4, s = 44;
  const fadeOut = Math.min(1, sp.t / 1.2);            // 사라질 때 흐려진다
  ctx.globalAlpha = 0.3 * fadeOut;
  ctx.fillStyle = "rgba(20,14,10,0.6)";
  ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 58, 10, 4, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = fadeOut;
  if (!cell(ctx, "spirits", i, sp.x, sp.y + bob, s, s)) glow(ctx, sp.x, sp.y + bob, 14, elemCol(h.elem), fadeOut);
}

/* 손에 든 전직 무기 — 총사 쌍권총 · 소환술사 소환서. held = rpgArt.js heldWeapon 의 { hand: [x, y, 도, 길이], adv, left } */
export function drawAdvHeldItem(ctx, held, ww, top, K, back) {
  const [hx, hy] = held.hand;
  const x = -ww / 2 + hx * K, y = top + hy * K;
  if (held.adv === "gun") {
    // 권총 그림은 손잡이가 왼쪽 아래 · 총구가 오른쪽. 손잡이를 손에 맞추고 총구를 바라보는 쪽으로
    const pistol = (px, py, dirX, alt, s) => {
      ctx.save(); ctx.translate(px, py);
      if (dirX < 0) ctx.scale(-1, 1);
      ctx.rotate(-0.08);
      if (!cell(ctx, "items", alt ? ADV_ART.ITEM.pistol2 : ADV_ART.ITEM.pistol, s * 0.32, -s * 0.06, s, s)) { ctx.fillStyle = "#4a4a52"; ctx.fillRect(-2, -3, 16, 4); ctx.fillStyle = "#7a5634"; ctx.fillRect(-3, -2, 4, 8); }
      ctx.restore();
    };
    const dirX = held.left ? -1 : 1;
    // 손이 바라보는 쪽 반대편(뒤쪽 손)이면 총이 몸통을 가로지른다 — 그때는 두 자루 모두 몸 뒤에 그려 총구만 앞으로 나오게 한다
    const trailing = (hx - ww / K / 2) * dirX < 0;
    // 쌍권총 — 둘째 자루는 같은 손 쪽 조금 뒤 · 위에(몸 뒤에 그린다). 먼 손으로 옮기면 몸을 가로질러 긴 총처럼 보였다
    if (back) pistol(x - dirX * 5, y - 5, dirX, 1, 20);
    if (back === trailing) pistol(x, y, dirX, 0, 21);
  } else if (held.adv === "grim" && !back) {
    ctx.save(); ctx.translate(x, y - 4); ctx.rotate(held.left ? 0.25 : -0.25);
    if (!cell(ctx, "items", ADV_ART.ITEM.book, 0, 0, 22, 22)) { ctx.fillStyle = "#2f4f8f"; ctx.fillRect(-7, -9, 14, 18); }
    ctx.restore();
  }
}
/* 기사 방패 — 전사 그림의 반대 손(rpgArt.js DUAL_OFF_HAND)에 든다. 뒤 보기면 몸 뒤에 */
export function drawAdvShield(ctx, off, ww, top, K) {
  const x = -ww / 2 + off[0] * K, y = top + off[1] * K;
  ctx.save(); ctx.translate(x, y - 2);
  if (!cell(ctx, "items", ADV_ART.ITEM.shield, 0, 0, 26, 26)) {
    ctx.fillStyle = "#9fb0c4"; ctx.strokeStyle = "#d8b45a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(9, -11); ctx.lineTo(9, 2); ctx.quadraticCurveTo(0, 13, -9, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/* 명사수 약점 표식 — 표식이 붙은 몹 머리 위 청록 조준 고리 */
export function drawAdvMob(ctx, m, time, top) {
  if (m.taunt > 0) drawTauntMark(ctx, m.x, m.y - top - 14 - (m.wk ? 24 : 0), time);   // 기사 도발 — 약점 표식 위에
  if (!(m.wk || m.wkUntil > time)) return;
  const y = m.y - top - 14, r = 9 + Math.sin(time * 6) * 1.5;
  ctx.save();
  ctx.strokeStyle = "#7ff3e4"; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(m.x, y, r, 0, TAU); ctx.stroke();
  [0, 1, 2, 3].forEach((i) => {
    const a = (i / 4) * TAU + time;
    ctx.beginPath(); ctx.moveTo(m.x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3)); ctx.lineTo(m.x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4)); ctx.stroke();
  });
  ctx.restore();
}

/* 기사 도발 표시 — 도발이 묻은 몹 · 사람 머리 위. 붉은 고리 안에 방패와 느낌표가 맥박친다 */
export function drawTauntMark(ctx, x, y, time) {
  const p = 1 + Math.sin(time * 8) * 0.08;
  ctx.save();
  ctx.translate(x, y); ctx.scale(p, p);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(70,24,18,0.72)";
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#ff9a7a"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "#ffd873"; ctx.lineWidth = 1;   // 작은 방패 테두리
  ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.lineTo(6, 1); ctx.quadraticCurveTo(0, 8, 0, 8); ctx.quadraticCurveTo(0, 8, -6, 1); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = "#ffb49a";
  ctx.fillRect(-1, -4, 2, 6); ctx.fillRect(-1, 3.5, 2, 2);
  ctx.restore();
}

/* 광장 전직 교관 — 남색 망토 · 금빛 깃 · 여섯 전직 문양이 달린 깃대. 머리 위: 받을 수 있으면 !, 시험 중이면 진행, 마쳤으면 ★ */
export function drawAdvNpc(ctx, g, n, time, roundRect, shadow) {
  const { x, y } = n;
  const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
  const bob = Math.sin(time * 2 + x) * 1.2;
  shadow(ctx, x, y + 2, 18, 5, 0.3);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "#6b4e33"; ctx.fillRect(16, -86, 3, 86);           // 깃대
  ctx.fillStyle = "#3d4a72";
  ctx.beginPath(); ctx.moveTo(19, -84); ctx.lineTo(42, -80); ctx.lineTo(38, -60); ctx.lineTo(19, -56); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e3c06a"; ctx.font = "10px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("✦", 29, -70);
  ctx.fillStyle = "#34406a"; ctx.strokeStyle = "rgba(20,14,30,0.7)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-11, -40); ctx.lineTo(11, -40); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#e3c06a"; ctx.fillRect(-11, -40, 22, 3); ctx.fillRect(-1, -37, 2, 35);   // 금빛 깃 · 띠
  ctx.fillStyle = "#3a2c1c"; ctx.fillRect(-8, -2, 6, 3); ctx.fillRect(2, -2, 6, 3);
  ctx.fillStyle = "#f0d0b0"; ctx.beginPath(); ctx.arc(0, -48, 9.5, 0, TAU); ctx.fill();
  ctx.fillStyle = "#3a2c1c";
  ctx.beginPath(); ctx.arc(-3.3, -48, 1.3, 0, TAU); ctx.arc(3.3, -48, 1.3, 0, TAU); ctx.fill();
  ctx.fillStyle = "#cfd3dc"; ctx.beginPath(); ctx.ellipse(0, -41, 7, 4, 0, 0, Math.PI); ctx.fill();   // 흰 수염
  ctx.fillStyle = "#34406a"; ctx.beginPath(); ctx.arc(0, -51, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.restore();
  // 머리 위 표시
  const mine = me && advForJob(me.job);
  const T = me && !me.advClass && me.advQ && ADV_BY_ID[me.advQ.c];
  let mark = "", sub = "";
  if (T) { if (me.advQ.n >= T.trial.n) mark = "★"; else sub = `${T.trial.name} ${me.advQ.n}/${T.trial.n}`; }
  else if (me && !me.advClass && mine && mine.length && me.lv >= ADV.lv) mark = "!";
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (mark) {
    const jump = Math.abs(Math.sin(time * 3)) * -5;
    ctx.font = "26px 'Do Hyeon', sans-serif";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,26,10,0.9)";
    ctx.strokeText(mark, x, y - 104 + jump);
    ctx.fillStyle = "#ffd873"; ctx.fillText(mark, x, y - 104 + jump);
  } else if (sub) {
    ctx.font = "12px 'Do Hyeon', sans-serif";
    const w = ctx.measureText(sub).width + 16;
    ctx.fillStyle = "rgba(20,14,10,0.78)"; roundRect(ctx, x - w / 2, y - 112, w, 20, 8); ctx.fill();
    ctx.fillStyle = "#e8dcc0"; ctx.fillText(sub, x, y - 102);
  }
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.name).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; roundRect(ctx, x - w2 / 2, y + 6, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#e8dcc0"; ctx.fillText(n.name, x, y + 14.5);
  ctx.restore();
}
