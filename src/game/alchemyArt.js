/* ── 약초 채집물 · 채집 진행 막대 — 그림 파일 없이 코드로 그린다(빛깔은 alchemyData.js ALCH_MATS) ─────────────
   rpgArt.js drawRpg 가 앞뒤 차례(y)에 맞춰 부른다. 채집한 자리는 다시 날 때까지 흙더미만 남는다 */
import { ALCH_MAT_BY_ID, GATHER } from "./alchemyData.js";

// 풀 모양 — 종류마다 잎 수 · 높이 · 꽃
const LOOK = {
  herb: { leaves: 5, h: 18 },
  herb_red: { leaves: 5, h: 18 },
  herb_blue: { leaves: 5, h: 18 },
  life_flower: { leaves: 4, h: 16, bloom: "#f7d7e4" },
  wind_grass: { leaves: 7, h: 24, thin: 1 },
  shadow_grass: { leaves: 6, h: 20, thin: 1 },
};

const SCALE = 1.4;                                  // 사람 키에 맞춘 크기
export function drawHerb(ctx, n, up, time) {
  const { x, y } = n;
  ctx.save();
  ctx.translate(x, y); ctx.scale(SCALE, SCALE); ctx.translate(-x, -y);
  // 그림자
  ctx.fillStyle = "rgba(20,24,16,0.28)";
  ctx.beginPath(); ctx.ellipse(x, y + 2, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (!up) {                                        // 채집한 자리 — 흙더미
    ctx.fillStyle = "#7a6a52";
    ctx.beginPath(); ctx.ellipse(x, y, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const m = ALCH_MAT_BY_ID[n.kind] || { color: "#8fc48a" };
  const L = LOOK[n.kind] || LOOK.herb;
  const sway = Math.sin(time * 1.6 + n.i) * 1.5;
  ctx.lineCap = "round";
  for (let k = 0; k < L.leaves; k++) {
    const a = -Math.PI / 2 + (k - (L.leaves - 1) / 2) * 0.42;
    const len = L.h * (0.75 + 0.25 * Math.cos(k * 1.7));
    const ex = x + Math.cos(a) * len + sway, ey = y + Math.sin(a) * len;
    ctx.strokeStyle = "#4f6e45";
    ctx.lineWidth = L.thin ? 2 : 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (ex - x) * 0.3, y - len * 0.5, ex, ey); ctx.stroke();
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.ellipse(ex, ey, L.thin ? 2.5 : 4.5, L.thin ? 6 : 7, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
  }
  if (L.bloom) {
    ctx.fillStyle = L.bloom;
    ctx.beginPath(); ctx.arc(x + sway, y - L.h - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f3d27f";
    ctx.beginPath(); ctx.arc(x + sway, y - L.h - 2, 2, 0, Math.PI * 2); ctx.fill();
  }
  // 반짝임 — 채집할 수 있다는 표시(약하게)
  const tw = (Math.sin(time * 3 + n.i * 2) + 1) / 2;
  ctx.globalAlpha = 0.35 + tw * 0.45;
  ctx.fillStyle = "#fff6d8";
  ctx.beginPath(); ctx.arc(x + 10, y - L.h - 6 + tw * 3, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 내 곁의 채집물 이름표 — 가까이 갔을 때만
export function drawHerbLabel(ctx, n) {
  const m = ALCH_MAT_BY_ID[n.kind];
  if (!m) return;
  ctx.save();
  ctx.font = "600 12px 'Gowun Dodum', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(m.name).width + 14;
  ctx.fillStyle = "rgba(40,30,20,0.72)";
  ctx.fillRect(n.x - w / 2, n.y - 50, w, 18);
  ctx.strokeStyle = "rgba(233,211,154,0.6)"; ctx.lineWidth = 1;
  ctx.strokeRect(n.x - w / 2 + 0.5, n.y - 49.5, w - 1, 17);
  ctx.fillStyle = "#f2e6cc";
  ctx.fillText(m.name, n.x, n.y - 41);
  ctx.restore();
}

// 채집 진행 막대 — 머리 위. t 는 남은 초, at 은 스냅샷을 받은 때(손님)
export function drawGatherBar(ctx, h) {
  const s = h.gath;
  if (!s) return;
  const left = s.at ? s.t - (Date.now() - s.at) / 1000 : s.t;   // 손님은 받은 때부터 이 기기 시계로 줄인다
  const p = Math.max(0, Math.min(1, 1 - left / GATHER.time));
  const w = 46, x = h.x - w / 2, y = h.y - 104;
  ctx.save();
  ctx.fillStyle = "rgba(40,30,20,0.75)";
  ctx.fillRect(x - 1, y - 1, w + 2, 7);
  ctx.fillStyle = "#a8c89a";
  ctx.fillRect(x, y, w * p, 5);
  ctx.strokeStyle = "rgba(233,211,154,0.7)"; ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 6);
  ctx.restore();
}
