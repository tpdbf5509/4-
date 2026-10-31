/* 마우스 조준은 스킬 입력에만 싣는다. 이동·평타·대쉬의 방향은 바꾸지 않는다. */
export function cleanSkillAim(aim) {
  if (!Array.isArray(aim) || aim.length !== 2 || !aim.every(Number.isFinite)) return null;
  const length = Math.hypot(...aim);
  return length > .001 && length < 1e6 ? aim.map(v => v / length) : null;
}
// 포인터는 CSS 크기에서 캔버스 좌표로 바꿔 보관한다. 시전할 때 현재 카메라와 총구 높이를 반영한다.
export function pointerSkillAim(h, cam, pointer, squash) {
  if (!h || !cam || !pointer || pointer.map !== h.map) return null;
  return cleanSkillAim([pointer.x + cam.x - h.x, (pointer.y + cam.y - (h.y - 34)) / squash]);
}
// 포인터가 가리킨 땅 자리(월드 좌표) — 그림자 일섬처럼 "포인터 가까운 적"을 고르는 스킬이 쓴다
export function cleanSkillPt(pt) {
  if (!Array.isArray(pt) || pt.length !== 2 || !pt.every(Number.isFinite) || pt.some(v => Math.abs(v) > 1e6)) return null;
  return [pt[0], pt[1]];
}
export function pointerSkillPt(h, cam, pointer) {
  if (!h || !cam || !pointer || pointer.map !== h.map) return null;
  return [Math.round(pointer.x + cam.x), Math.round(pointer.y + cam.y)];
}
export const aimedSkillInput = (kind, dir) => ['skill', 'use', 'wskill'].includes(kind)
  || (kind === 'wcharge' && dir !== 'cancel') || (kind === 'adv' && dir?.op === 'use');
