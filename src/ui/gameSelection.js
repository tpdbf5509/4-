/* 게임 위의 길게 누르기만 막는다. 채팅 · 검색 입력칸의 선택과 복사는 그대로 둔다. */
export function stopGameSelection(target) {
  const editable = (node) => node instanceof Element && node.closest('input, textarea, [contenteditable]:not([contenteditable="false"])');
  const block = (e) => { if (!editable(e.target)) e.preventDefault(); };
  const clear = (e) => {
    if (editable(e.target)) return;
    const selection = window.getSelection();
    if (selection?.rangeCount && target.contains(selection.anchorNode)) selection.removeAllRanges();
  };
  for (const type of ["contextmenu", "selectstart", "dragstart"]) target.addEventListener(type, block);
  target.addEventListener("pointerdown", clear);
  return () => {
    for (const type of ["contextmenu", "selectstart", "dragstart"]) target.removeEventListener(type, block);
    target.removeEventListener("pointerdown", clear);
  };
}
