/* 공격할 때 몸 돌리기 — 치는 쪽을 바라본다(11월 18일 버그 수정)
   예전에는 평타 · 기술마다 h.face = 0(비스듬히 앞)으로 돌려 좌우를 보고 쳐도 앞을 봤다.
   걸을 때와 같은 기준으로 얼굴(0 비스듬히 앞 · 1 옆 · 2 뒤)과 좌우(h.dir)를 함께 정한다. */
export const FACE_AIM = { back: -0.5, side: 0.35 };   // bloodJob aimTo · bloodGunCombat 과 같은 기준

// ax, ay — 치는 쪽(위아래는 땅 비율을 푼 값). 길이는 상관없다. 둘 다 0 이면 바라보던 쪽 그대로
export function faceAim(h, ax, ay) {
  const d = Math.hypot(ax, ay);
  if (!(d > 1e-6)) return;
  const x = ax / d, y = ay / d;
  if (Math.abs(x) > 0.05) h.dir = x < 0 ? -1 : 1;
  h.face = y < FACE_AIM.back ? 2 : Math.abs(x) > FACE_AIM.side ? 1 : 0;
}
// 화면 좌표의 대상(tx, ty) 쪽을 바라본다 — squash 는 RPG.squash
export function faceAt(h, tx, ty, squash) {
  faceAim(h, tx - h.x, (ty - h.y) / squash);
}
