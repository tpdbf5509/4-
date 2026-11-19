/* 장소별 캐릭터 크기(11월 19일 사용자 "집은 큰데 캐릭터는 작아 · 다른 장소들도 같이").
   건물 · 가구 그림이 큰 맵에서 몸 그림만 키우고 카메라를 당긴다. 발 자리 · 충돌 · 판정은 그대로고 걷기 속도만 spd 배.
   에르덴 마을 · 이야기 장소 · 광장 · 사냥터 · 던전은 1(그대로). */
// 11월 19일 사용자 — "마을 속 집" 안만 바꾼다(마을 · 이야기 장소는 그대로). "방 하나를 한 번에 볼 수 있게" — 카메라는 방(맵) 전체가 한 화면에 들어오는 배율로 자동
//   screen: 화면에서 보이는 캐릭터 키(원래 = 1). 몸 배율 = screen / 카메라 배율이라 방이 커도 캐릭터가 작아 보이지 않는다
//   npc: 주민 키(캐릭터 몸 배율에 곱함) · spd: 걷기 속도 배율(판정 rpg.js heroSpeed)
import { W, H } from "./world.js";

export const BODY_SCALE = {
  indoor: { screen: 1.9, npc: 0.75, spd: 3 },    // 마을 속 집 — 에르덴 도서관 1 · 2층 · 참나무 목공소(사용자 "이동속도 5배", 11월 19일 10배에서 낮춤)
  under: { screen: 1.2, npc: 0.75, spd: 3 },     // 목공소 지하부터 이어지는 엔지니어 루트 맵(지하 · 연구소 · 기계도시) — 사용자 "목공소 지하 같은 곳은 크기 1.2배만"
};
const HOUSE_EQ = ["eng-oak"];                    // 엔지니어 루트 맵 가운데 마을 속 집으로 치는 곳
export function bodyKind(M) {
  if (!M) return null;
  if (M.library || (M.eq && HOUSE_EQ.includes(M.id))) return "indoor";
  if (M.eq) return "under";
  return null;
}
// 카메라 배율 — 방 전체가 화면(W × H)에 들어오게. 1 보다 크게는 당기지 않는다
export const camZoom = (M) => (bodyKind(M) ? Math.min(1, W / M.w, H / M.h) : 1);
export const heroScale = (M) => { const b = BODY_SCALE[bodyKind(M)]; return b ? b.screen / camZoom(M) : 1; };
export const npcScale = (M) => { const b = BODY_SCALE[bodyKind(M)]; return b ? heroScale(M) * b.npc : 1; };
export const mapSpeed = (M) => BODY_SCALE[bodyKind(M)]?.spd || 1;
// 카메라를 당긴 맵에서도 이름표 글자는 원래 크기로 — drawRpg 가 그릴 때마다 1/zoom 을 넣고, 이름표를 그리는 곳이 글자 자리를 축으로 되돌린다
export const VIEW = { textK: 1 };
export function textUp(ctx, x, y) {
  const k = VIEW.textK;
  if (k !== 1) { ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y); }
}
