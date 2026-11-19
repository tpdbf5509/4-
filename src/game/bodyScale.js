/* 장소별 캐릭터 크기(11월 19일 사용자 "집은 큰데 캐릭터는 작아 · 다른 장소들도 같이").
   건물 · 가구 그림이 큰 맵에서 몸 그림만 키우고 카메라를 당긴다. 발 자리 · 충돌 · 판정은 그대로고 걷기 속도만 spd 배.
   에르덴 마을 · 이야기 장소 · 광장 · 사냥터 · 던전은 1(그대로). */
export const BODY_SCALE = {
  // zoom: 카메라 — 1 보다 작으면 뒤로 당겨 더 넓게 보인다(화면에서 보이는 키 = hero × zoom). spd: 걷기 속도 배율(판정 rpg.js heroSpeed)
  // 11월 19일 사용자 — "마을 속 집" 안만 바꾼다(마을 · 이야기 장소는 그대로). 2.3 · 0.8 에서 더 키우고 더 당겼다
  indoor: { hero: 2.8, npc: 2.1, zoom: 0.7, spd: 1.4 },   // 건물 안 — 참나무 목공소 · 엔지니어 획득 루트 맵(바닥 그림을 1.56배로 늘려 소품이 크다) · 에르덴 도서관
};
export function bodyKind(M) {
  if (!M) return null;
  if (M.eq || M.library) return "indoor";
  return null;
}
export const heroScale = (M) => BODY_SCALE[bodyKind(M)]?.hero || 1;
export const npcScale = (M) => BODY_SCALE[bodyKind(M)]?.npc || 1;
export const camZoom = (M) => BODY_SCALE[bodyKind(M)]?.zoom || 1;
export const mapSpeed = (M) => BODY_SCALE[bodyKind(M)]?.spd || 1;
// 카메라를 당긴 맵에서도 이름표 글자는 원래 크기로 — drawRpg 가 그릴 때마다 1/zoom 을 넣고, 이름표를 그리는 곳이 글자 자리를 축으로 되돌린다
export const VIEW = { textK: 1 };
export function textUp(ctx, x, y) {
  const k = VIEW.textK;
  if (k !== 1) { ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y); }
}
