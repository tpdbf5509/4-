/* 화면 효과(셰이더) 켬 · 끔 — 이 기기에만 저장(쉐이더-온오프-계획서 6장 `flg:screenFx`). 판정 · 서버와 상관없다.
   켬: 새 광장 그림 전부(Codex 바닥 · 새 가판 넷과 구역 색 차양 · 소품 시트 · 걸이 등불 · NPC 채도 보정 · 구역 이름).
   끔: 새 배치와 낮밤만 — 그림은 예전 것(바닥은 예전 그림을 새 길에 맞춘 plaza-v2, 가로등 · 벤치 · 옛 가판 · 옛 NPC).
   기본값(계획서 6장): 마우스 기기(PC) 켬, 터치 기기(휴대폰) 끔. */
const KEY = "flg:screenFx";
const touch = () => typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches;
function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && typeof v.on === "boolean") return v.on; } catch { /* 저장이 막혀 있으면 기본값 */ }
  return typeof window !== "undefined" && !touch();
}
export const SCREEN_FX = { on: load() };
export function setScreenFx(on) {
  SCREEN_FX.on = !!on;
  try { localStorage.setItem(KEY, JSON.stringify({ on: SCREEN_FX.on })); } catch { /* 이번만 */ }
}
