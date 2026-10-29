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
export const aimedSkillInput = (kind, dir) => ['skill', 'use', 'wskill'].includes(kind)
  || (kind === 'wcharge' && dir !== 'cancel') || (kind === 'adv' && dir?.op === 'use');
