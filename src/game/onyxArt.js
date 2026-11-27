/* 황금 진열장 장신구 그림 — 단 것(bag.ow · 남의 화면은 스냅샷 h.oxw)만 그린다. 능력치는 없다.
   흑옥 브로치 · 단골 칭호 줄은 아이콘 시트(ONYX.icon), 망토는 Codex 망토 시트(cape.webp 3 × 2 칸, 칸 256 × 384, 깃 기준점 128 · 110),
   은화 발자국은 코드 도트(1px 선). 차례는 onyxData.js OX_ACC */
import { ONYX, OX_ICON, OX_ACC_BIT, OX_STEP, accWorn } from "./onyxData.js";

const CAPE = { src: "/assets/game/rpg/onyx/cape.webp", cw: 256, ch: 384, ax: 128, ay: 110, ref: 299, shoulder: 0.5 };
// 망토 칸 — 0 앞 서기 · 1 앞 걷기 · 2 옆 서기 · 3 옆 걷기 · 4 뒤 서기 · 5 뒤 걷기
const CAPE_CELL = { front: 0, turn: 0, side: 2, back: 4 };
const BROOCH = { size: 7, y: 0.555, side: 0.06 };   // 브로치 — 화면 지름 · 그림 위에서 내려온 몫 · 옆을 볼 때 앞으로 나온 몫
const REGULAR = { text: "황금 진열장의 단골", color: "#e2c27a", dy: 14 };

const cache = {};
function img(src) {
  if (typeof Image === "undefined") return null;
  let im = cache[src];
  if (im === undefined) { im = cache[src] = new Image(); im.onerror = () => { cache[src] = null; }; im.src = src; }
  return im && im.complete && im.naturalWidth ? im : null;
}

export const oxWornOf = (h) => (h ? (h.oxw !== undefined ? h.oxw : accWorn(h.bag)) : 0);
const on = (bits, id) => (bits & OX_ACC_BIT[id]) !== 0;

function drawCape(ctx, h, view, hh, top, time) {
  const im = img(CAPE.src);
  if (!im) return;
  const walk = h.anim && h.anim.walk >= 0.05;
  const cell = CAPE_CELL[view] + (walk ? 1 : 0);
  const k = hh / CAPE.ref;                           // 시트는 키 299 그림에 맞춰 그렸다
  const sway = walk ? Math.sin(time * 9) * 0.03 : Math.sin(time * 1.6) * 0.01;
  ctx.save();
  ctx.translate(0, top + hh * CAPE.shoulder);
  ctx.rotate(sway);
  ctx.drawImage(im, (cell % 3) * CAPE.cw, Math.floor(cell / 3) * CAPE.ch, CAPE.cw, CAPE.ch,
    -CAPE.ax * k, -CAPE.ay * k, CAPE.cw * k, CAPE.ch * k);
  ctx.restore();
}

// 몸 뒤 — 앞 · 옆을 볼 때 망토
export function drawOxBack(ctx, h, bits, view, hh, top, time) {
  if (on(bits, "cape") && view !== "back") drawCape(ctx, h, view, hh, top, time);
}

// 몸 앞 — 뒤를 볼 때 망토 · 앞 · 옆을 볼 때 가슴 브로치
export function drawOxFront(ctx, h, bits, view, ww, hh, top, time) {
  if (on(bits, "cape") && view === "back") drawCape(ctx, h, view, hh, top, time);
  if (!on(bits, "brooch") || view === "back") return;
  const im = img(ONYX.icon);
  if (!im) return;
  const s = BROOCH.size * (hh / 66), c = OX_ICON.brooch, x = view === "side" ? ww * BROOCH.side : 0;
  ctx.save();
  ctx.drawImage(im, (c % 4) * ONYX.cell, Math.floor(c / 4) * ONYX.cell, ONYX.cell, ONYX.cell, x - s / 2, top + hh * BROOCH.y - s / 2, s, s);
  ctx.globalAlpha = 0.5 + 0.5 * Math.max(0, Math.sin(time * 2.2));   // 은테 반짝임 한 점
  ctx.fillStyle = "#f4efe2"; ctx.fillRect(Math.round(x - s * 0.18), Math.round(top + hh * BROOCH.y - s * 0.2), 1, 1);
  ctx.restore();
}

// 이름 아래 금빛 칭호 줄 — 칭호가 있으면 그 아래. 돌려주는 값은 다음 줄 y
export function drawOxRegular(ctx, h, bits, y) {
  if (!on(bits, "regular")) return y;
  ctx.save();
  ctx.font = "10px 'Jua', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(REGULAR.text).width + 14;
  ctx.strokeStyle = "rgba(226,194,122,0.55)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(h.x - w / 2, y - 6.5); ctx.lineTo(h.x + w / 2, y - 6.5); ctx.stroke();
  ctx.fillStyle = REGULAR.color; ctx.fillText(REGULAR.text, h.x, y);
  ctx.restore();
  return y + REGULAR.dy;
}

/* 은화 발자국 — 이 화면이 본 실제 걸음 빠르기로 질주(대쉬 · 이동 속도 물약 등)를 알아챈다. 판정과 상관없고 저장하지 않는다 */
const SILVER = { fast: 1.18, keep: 0.12 };          // 보통 걸음 × 이 배 넘게 빠르면 질주 · 빠르기 고르기
const steps = new WeakMap();
export function drawOxSteps(ctx, h, bits, walkSpd, time) {
  let s = steps.get(h);
  if (!s) { s = { x: h.x, y: h.y, t: time, v: 0, run: 0, side: 1, list: [], map: h.map }; steps.set(h, s); }
  if (s.map !== h.map) { s.list.length = 0; s.map = h.map; s.x = h.x; s.y = h.y; }
  const dt = time - s.t;
  if (dt > 0 && dt < 0.5) {
    const d = Math.hypot(h.x - s.x, h.y - s.y);
    s.v += (d / dt - s.v) * Math.min(1, dt / SILVER.keep);
    if (on(bits, "silver") && s.v > walkSpd * SILVER.fast && d < 200) {
      s.run += d;
      while (s.run >= OX_STEP.gap) {
        s.run -= OX_STEP.gap; s.side = -s.side;
        s.list.push({ x: h.x + s.side * 4, y: h.y + 1, t: time });
        if (s.list.length > OX_STEP.max) s.list.shift();
      }
    } else s.run = 0;
  }
  s.x = h.x; s.y = h.y; s.t = time;
  if (!s.list.length) return;
  ctx.save();
  for (const p of s.list) {
    const age = (time - p.t) / OX_STEP.life;
    if (age >= 1) continue;
    ctx.globalAlpha = 0.75 * (1 - age);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.42);
    ctx.fillStyle = "#c9ccd2"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8c9098"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#eef0f3"; ctx.fillRect(-1, -3, 2, 6);   // 동전 가운데 새김
    ctx.restore();
  }
  s.list = s.list.filter((p) => time - p.t < OX_STEP.life);
  ctx.restore();
}
