/* ── 1차 전직 그리기 ─────────────────────────────────────────
   그림은 생성한 투명 아틀라스 셋(advData.js ADV_ART, 원본 design/advance). 못 불러오면 코드 그림으로 대신해 게임이 깨지지 않는다.
   drawAdvFx — 스킬 연출(kind "sk_adv_*") · drawAdvHero — 영웅 둘레(철벽 방어 · 중첩 · 정령) · drawAdvHeldItem — 손에 든 총 · 소환서 ·
   drawAdvShield — 기사 방패 · drawAdvMob — 명사수 표식 · drawAdvNpc — 광장 전직 교관.
   판정은 하지 않는다 — 방장이 보낸 연출 · 스냅샷 상태만 그린다 */
import { ADV, ADV_ART, ADV_BY_ID, advForJob } from "./advData.js";
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
export const warmAdvArt = () => { atlas("fx"); atlas("spirits"); atlas("items"); };
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
  if (k === "slash") {                             // 삼연참 — 붉은 · 은빛 초승달. 세 번째는 크고 뒤집혀 교차한다
    const s = f.r * (f.i === 2 ? 1.5 : 1.25) * (0.8 + 0.2 * Math.min(1, p * 4));   // 몸을 덮지 않게 앞쪽에 알맞은 크기로
    ctx.globalAlpha = fade(p, 0.3) * 0.85;
    ctx.translate(f.x, f.y); ctx.rotate(f.a + (f.i === 1 ? 0.9 : f.i === 2 ? -0.5 : -0.9));
    if (f.i === 1) ctx.scale(1, -1);
    if (!cell(ctx, "fx", FX.slash, 0, 0, s, s)) {
      ctx.strokeStyle = "#ff8a8a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, s * 0.4, -1.2, 1.2); ctx.stroke();
    }
    if (f.boost) { ctx.globalAlpha *= 0.35; cell(ctx, "fx", FX.slash, 4, 0, s * 1.05, s * 1.05); }   // 투지 폭발 — 한 겹 더
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
  const a = h && h.as;
  if (!a || h.down > 0) return;
  ctx.save();
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
  if (a.sp && a.sp.t > 0 && Number.isFinite(a.sp.x)) drawSpirit(ctx, h, a.sp, time);
  ctx.restore();
}
function drawSpirit(ctx, h, sp, time) {
  const i = Math.max(0, ELEMS.findIndex((e) => e.id === h.elem));
  const bob = Math.sin(time * 3 + h.pi) * 4, s = 44;
  const fadeOut = sp.trial ? 0.7 : Math.min(1, sp.t / 1.2);   // 시험 정령은 반쯤 비친다 · 사라질 때 흐려진다
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
