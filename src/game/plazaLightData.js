/* 새 광장 낮과 밤(11월 28일 사용자 「낮 10분 밤 10분」, 계획서 5장 ①). 화면만의 일 — 판정 · 스냅샷 · 서버와 상관없다.
   시계는 이 기기 벽시계라 모두 거의 같은 때 같은 하늘을 본다. 수치는 이 파일 한 곳. */
export const PLAZA_LIGHT = {
  day: 600, night: 600,          // 낮 · 밤 길이(초) — 한 바퀴 20분
  fade: 60,                      // 넘어가는 시간(초) — 낮 끝 1분이 노을, 밤 끝 1분이 새벽(각 10분 안에 든다)
  nightTint: [128, 140, 186],    // 밤 덮개(multiply) — 남색 기운의 톤다운한 어둠. 바닥 무늬 · 사람 윤곽이 보일 만큼만
  duskTint: [255, 214, 178],     // 노을 · 새벽 사이에 한 번 더 곱하는 따뜻한 빛(가운데에서 가장 세다)
  glow: "255,206,140",           // 등불 빛 색
  lampR: 92, lampA: 0.34,        // 등불 기둥 빛 번짐 반지름 · 세기
  hangR: 58, hangA: 0.28,        // 가판 걸이 등불
  litAt: 0.45,                   // 밤 세기가 이만큼 넘으면 등불이 켜진 그림으로
};
// 시험용: 주소에 ?test&night 이면 늘 밤, &dusk 면 늘 노을 가운데
const Q = typeof location !== "undefined" ? location.search : "";
const FORCE = /[?&]night\b/.test(Q) ? 1 : /[?&]dusk\b/.test(Q) ? 0.5 : null;

// 밤 세기 k(0 낮 ~ 1 밤)와 노을 세기 w(0~1)
export function plazaLight(nowMs = Date.now()) {
  const L = PLAZA_LIGHT;
  if (FORCE != null) return { k: FORCE, w: FORCE === 0.5 ? 1 : 0 };
  const t = (nowMs / 1000) % (L.day + L.night);
  let k;
  if (t < L.day - L.fade) k = 0;
  else if (t < L.day) k = (t - (L.day - L.fade)) / L.fade;
  else if (t < L.day + L.night - L.fade) k = 1;
  else k = 1 - (t - (L.day + L.night - L.fade)) / L.fade;
  k = k * k * (3 - 2 * k);   // 부드럽게
  return { k, w: Math.sin(Math.PI * k) };
}
