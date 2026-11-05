import {PLAZA_NPC_ART as A, plazaNpcPath} from './plazaNpcData.js';
const cache = new Map();
function npcImage(id) {
  const src = plazaNpcPath(id);
  if (!src || typeof Image === 'undefined') return null;
  if (!cache.has(id)) {
    const im = new Image();
    cache.set(id, im);
    im.onerror = () => cache.set(id, null);
    im.src = src;
  }
  const im = cache.get(id);
  return im?.complete && im.naturalWidth ? im : null;
}
export function warmPlazaNpcArt() { A.ids.forEach(npcImage); }
// 발밑 기준점. 로드 전이나 실패 시 false를 돌려 기존 코드 그림을 그리게 한다.
export function drawPlazaNpc(ctx, id, x, y, size = A.size) {
  const im = npcImage(id);
  if (!im) return false;
  const k = size / A.height;
  ctx.drawImage(im, x - A.feet[0] * k, y - A.feet[1] * k, A.width * k, size);
  return true;
}
