/* 몹 레이스 그림 — 트랙 바닥과 광장 레이스 관리인. 코드로 그린다(그림 파일 없음).
   T = { shadow, roundRect, npcBody } — rpgArt.js 가 넘긴다. 탈것은 rpgArt.js drawRaceMount 가 몹 그림을 그대로 쓴다 */
import { RACE, RACE_BOXES, RACE_PADS, RACE_MUDS, laneY } from "./raceData.js";

const LANE_HALF = RACE.laneGap / 2;
// 트랙 — 흙길 띠 · 1px 줄 · 출발선 · 결승 바둑판 · 4분의 1마다 깃발. 화면에 보이는 가로 구간만 그린다
export function drawRaceTrack(ctx, M, g, time, cam, viewW) {
  const top = laneY(0) - LANE_HALF - 18, bot = laneY(RACE.max - 1) + LANE_HALF + 18;
  const x0 = Math.max(0, cam.x - 40), x1 = Math.min(M.w, cam.x + viewW + 40);
  ctx.save();
  ctx.fillStyle = "rgba(176,142,100,0.8)"; ctx.fillRect(x0, top, x1 - x0, bot - top);   // 바탕 그림의 흙길 · 바위가 비치지 않게 짙게
  ctx.fillStyle = "rgba(120,92,60,0.35)"; ctx.fillRect(x0, top, x1 - x0, 6); ctx.fillRect(x0, bot - 6, x1 - x0, 6);
  ctx.strokeStyle = "rgba(244,232,206,0.38)"; ctx.lineWidth = 1;
  for (let i = 1; i < RACE.max; i++) {
    const y = laneY(i) - LANE_HALF + 0.5;
    ctx.setLineDash([18, 14]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  }
  ctx.setLineDash([]);
  // 줄 번호 — 출발선 앞
  ctx.font = "15px 'Do Hyeon', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(92,70,46,0.7)";
  for (let i = 0; i < RACE.max; i++) ctx.fillText(String(i + 1), RACE.startX - 70, laneY(i) - 8);
  // 출발선
  ctx.fillStyle = "rgba(250,244,230,0.8)"; ctx.fillRect(RACE.startX - 2, top + 6, 4, bot - top - 12);
  // 4분의 1 깃발 — 나무 기둥에 남은 몫
  [0.25, 0.5, 0.75].forEach((k) => {
    const x = RACE.startX + (RACE.finishX - RACE.startX) * k;
    if (x < x0 - 60 || x > x1 + 60) return;
    ctx.fillStyle = "rgba(244,232,206,0.22)"; ctx.fillRect(x - 1, top + 6, 2, bot - top - 12);
    ctx.fillStyle = "#6b5440"; ctx.fillRect(x - 3, top - 70, 6, 72);
    ctx.fillStyle = "#c9a37a"; ctx.beginPath(); ctx.moveTo(x + 3, top - 68); ctx.lineTo(x + 46, top - 56); ctx.lineTo(x + 3, top - 44); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3a2c1c"; ctx.font = "12px 'Do Hyeon', sans-serif"; ctx.fillText(`${Math.round(k * 100)}%`, x + 20, top - 56);
  });
  // 결승선 — 바둑판 띠와 양쪽 기둥 · 현수막
  const fx = RACE.finishX, sq = 12;
  if (fx > x0 - 80 && fx < x1 + 80) {
    for (let y = top + 6, r = 0; y < bot - 6; y += sq, r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = (r + c) % 2 ? "rgba(40,30,22,0.75)" : "rgba(250,244,230,0.85)";
        ctx.fillRect(fx - sq + c * sq, y, sq, Math.min(sq, bot - 6 - y));
      }
    }
    ctx.fillStyle = "#6b5440"; ctx.fillRect(fx - 4, top - 96, 8, 98); ctx.fillRect(fx - 4, bot - 4, 8, 30);
    ctx.fillStyle = "rgba(42,33,25,0.88)"; T_round(ctx, fx - 54, top - 112, 108, 30, 6); ctx.fill();
    ctx.strokeStyle = "rgba(227,196,138,0.8)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#e3c48a"; ctx.font = "18px 'Do Hyeon', sans-serif"; ctx.fillText("결승", fx, top - 96);
  }
  drawTrackThings(ctx, g, time, x0, x1);
  ctx.restore();
}
/* 부스터 발판(금빛 화살표) · 진흙(갈색 웅덩이) · 아이템 상자(내가 주운 것은 빈 자리) · 깔린 점액 */
function drawTrackThings(ctx, g, time, x0, x1) {
  const near = (x) => x > x0 - 140 && x < x1 + 140;
  RACE_MUDS.forEach((m) => {
    if (!near(m.x)) return;
    const y = laneY(m.lane);
    ctx.fillStyle = "rgba(96,70,44,0.7)"; ctx.beginPath(); ctx.ellipse(m.x, y, RACE.mudRx, RACE.mudRy, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(130,100,66,0.6)"; ctx.beginPath(); ctx.ellipse(m.x - 24, y - 8, 30, 9, 0, 0, Math.PI * 2); ctx.ellipse(m.x + 40, y + 10, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  });
  RACE_PADS.forEach((p) => {
    if (!near(p.x)) return;
    const y = laneY(p.lane), w = RACE.padW, h = RACE.padH, glow = 0.55 + 0.25 * Math.sin(time * 6 + p.x);
    ctx.fillStyle = "rgba(60,46,30,0.45)"; T_round(ctx, p.x - w / 2, y - h / 2, w, h, 8); ctx.fill();
    ctx.strokeStyle = "rgba(227,196,138,0.8)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = `rgba(240,206,130,${glow})`;
    for (let k = 0; k < 3; k++) {
      const cx = p.x - 34 + k * 30;
      ctx.beginPath(); ctx.moveTo(cx - 8, y - 16); ctx.lineTo(cx + 10, y); ctx.lineTo(cx - 8, y + 16); ctx.lineTo(cx - 2, y); ctx.closePath(); ctx.fill();
    }
  });
  const me = g.mySeat >= 0 && g.race ? g.race.rs.find((q) => q.pi === g.mySeat) : null, got = (me && me.got) || 0;
  RACE_BOXES.forEach((b) => {
    if (!near(b.x) || got & (2 ** b.id)) return;
    const y = laneY(b.lane), bob = Math.sin(time * 3 + b.id) * 3, s = 30;
    ctx.fillStyle = "rgba(40,30,20,0.25)"; ctx.beginPath(); ctx.ellipse(b.x, y + 4, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(b.x, y - 26 + bob); ctx.rotate(Math.sin(time * 1.5 + b.id) * 0.12);
    ctx.fillStyle = "#c9a37a"; T_round(ctx, -s / 2, -s / 2, s, s, 5); ctx.fill();
    ctx.strokeStyle = "#6b5440"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#3a2c1c"; ctx.font = "20px 'Do Hyeon', sans-serif"; ctx.fillText("?", 0, 1);
    ctx.restore();
  });
  ((g.race && g.race.traps) || []).forEach((tp) => {
    if (!near(tp.x)) return;
    ctx.fillStyle = "rgba(150,196,120,0.8)"; ctx.beginPath(); ctx.ellipse(tp.x, tp.y, RACE.slimeR, RACE.slimeR * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(200,232,170,0.7)"; ctx.beginPath(); ctx.ellipse(tp.x - 8, tp.y - 4, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  });
}
// 탈것 둘레 효과 — 부스터 불꽃(뒤로) · 방패 테두리 · 느려짐 물방울. rpgArt.js drawRaceMount 가 몹 그림 전에 · 뒤에 부른다
export function drawRaceAura(ctx, r, x, y, ride, time, front) {
  if (!front && r.bt > 0) {
    for (let k = 0; k < 4; k++) {
      const p = (time * 5 + k / 4) % 1;
      ctx.fillStyle = k % 2 ? "rgba(255,214,130,0.75)" : "rgba(240,150,90,0.65)";
      ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.ellipse(x - 40 - p * 70, y - 16 + (k - 1.5) * 6, 16 * (1 - p) + 4, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (front && r.sh > 0) {
    ctx.strokeStyle = "rgba(191,224,240,0.85)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y - ride - 20, 50, 62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(191,224,240,0.12)"; ctx.fill();
  }
  if (front && r.sl > 0) {
    ctx.fillStyle = "rgba(170,210,140,0.85)";
    for (let k = 0; k < 3; k++) { const p = (time * 2 + k / 3) % 1; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(x - 20 + k * 20, y - 10 + p * 10, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
function T_round(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// 광장 레이스 관리인 — 사냥꾼 몸에 바둑판 깃발을 든다. 머리 위에 모집 상태
export function drawRaceNpc(ctx, g, n, time, T) {
  const { x, y } = n, bob = Math.sin(time * 2) * 1.2;
  // 깃대 · 바둑판 깃발(바람에 살짝 흔들린다)
  ctx.save();
  ctx.fillStyle = "#6b5440"; ctx.fillRect(x + 20, y - 92, 4, 92);
  const wave = Math.sin(time * 3) * 2;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    ctx.fillStyle = (r + c) % 2 ? "#3a2c1c" : "#f4ead4";
    ctx.fillRect(x + 24 + c * 8, y - 90 + r * 8 + (c * wave) / 4, 8, 8);
  }
  ctx.restore();
  T.npcBody(ctx, x, y, bob);
  const R = g.race, ph = R && R.ph;
  const chip = ph === "open" ? (R.rs.length < RACE.minRacers ? `모집 중 ${R.rs.length}/${RACE.max} · 한 명 더` : `모집 중 ${R.rs.length}/${RACE.max} · ${Math.max(0, Math.ceil(R.t))}초`) : ph && ph !== "idle" ? "달리는 중" : "";
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (chip) {
    ctx.font = "12px 'Do Hyeon', sans-serif";
    const w = ctx.measureText(chip).width + 16;
    ctx.fillStyle = "rgba(20,14,10,0.8)"; T.roundRect(ctx, x - w / 2, y - 104, w, 20, 8); ctx.fill();
    ctx.strokeStyle = "rgba(227,196,138,0.6)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#e3c48a"; ctx.fillText(chip, x, y - 94);
  } else {
    const jump = Math.abs(Math.sin(time * 3)) * -5;
    ctx.font = "16px 'Do Hyeon', sans-serif";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(40,26,10,0.9)"; ctx.strokeText("몹 레이스", x, y - 94 + jump);
    ctx.fillStyle = "#ffd873"; ctx.fillText("몹 레이스", x, y - 94 + jump);
  }
  ctx.font = "12px 'Do Hyeon', sans-serif";
  const w2 = ctx.measureText(n.name).width + 14;
  ctx.fillStyle = "rgba(20,14,10,0.7)"; T.roundRect(ctx, x - w2 / 2, y + 6, w2, 16, 7); ctx.fill();
  ctx.fillStyle = "#ffe08a"; ctx.fillText(n.name, x, y + 14.5);
  ctx.restore();
}
