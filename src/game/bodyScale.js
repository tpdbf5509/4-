/* 장소별 캐릭터 크기(11월 19일 사용자 "집은 큰데 캐릭터는 작아 · 다른 장소들도 같이").
   건물 · 가구 그림이 큰 맵에서 몸 그림만 키운다. 발 자리 · 충돌 · 이동 속도 · 판정은 그대로다.
   사냥터 · 광장 · 던전처럼 몹 · 소품이 캐릭터 기준으로 맞춰진 곳은 1(그대로). */
export const BODY_SCALE = {
  // zoom: 카메라 — 1 보다 작으면 뒤로 당겨 더 넓게 보인다(화면에서 보이는 키 = hero × zoom).
  // 11월 19일 사용자 "캐릭터 크기를 더 키우고 카메라를 뒤로" — 1.7 · 1.3 에서 올리고 카메라를 당겼다
  indoor: { hero: 2.3, npc: 1.75, zoom: 0.8 },    // 건물 안 — 참나무 목공소 · 엔지니어 획득 루트 맵(바닥 그림을 1.56배로 늘려 소품이 크다) · 에르덴 도서관
  story: { hero: 1.65, npc: 1.25, zoom: 0.85 },   // 에르덴 마을 · 이야기 맵 — 주민 그림이 원래 캐릭터보다 커서 주민 키에 맞춘다
};
export function bodyKind(M) {
  if (!M) return null;
  if (M.eq || M.library) return "indoor";
  if (M.story || M.village) return "story";
  return null;
}
export const heroScale = (M) => BODY_SCALE[bodyKind(M)]?.hero || 1;
export const npcScale = (M) => BODY_SCALE[bodyKind(M)]?.npc || 1;
export const camZoom = (M) => BODY_SCALE[bodyKind(M)]?.zoom || 1;
