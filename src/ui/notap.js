/* 두 번 빠르게 누르면 확대되는 것을 끈다.
   CSS 의 touch-action 으로 대부분 막히지만, 사파리는 예전부터 이 값을
   흘려보낸 적이 있어 같은 자리를 짧은 새에 다시 누른 것만 한 번 더 막는다.
   버튼과 판은 pointerdown 으로 받으므로 이걸 막아도 조작에는 지장이 없다. */
const GAP = 320;      // 이 안에 다시 누르면 더블탭으로 본다
const NEAR = 32;      // 이만큼 가까운 자리여야 더블탭으로 본다

export function stopDoubleTapZoom(target = document) {
  let lastT = 0, lastX = 0, lastY = 0;

  const onEnd = (e) => {
    const t = e.timeStamp;
    const p = e.changedTouches && e.changedTouches[0];
    if (!p) return;
    if (t - lastT < GAP && Math.abs(p.clientX - lastX) < NEAR && Math.abs(p.clientY - lastY) < NEAR) {
      if (e.cancelable) e.preventDefault();
      lastT = 0;                 // 세 번째 누름은 새 시작으로 본다
      return;
    }
    lastT = t; lastX = p.clientX; lastY = p.clientY;
  };
  // 두 번 눌러 생기는 dblclick 도 함께 막는다 — 글자가 선택되며 확대되는 것을 막아 준다
  const onDbl = (e) => { if (e.cancelable) e.preventDefault(); };

  target.addEventListener("touchend", onEnd, { passive: false });
  target.addEventListener("dblclick", onDbl, { passive: false });
  return () => {
    target.removeEventListener("touchend", onEnd);
    target.removeEventListener("dblclick", onDbl);
  };
}
