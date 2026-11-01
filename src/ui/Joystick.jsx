import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { joystickInput } from "./joystick.js";

/* 종료 이벤트가 판 밖으로 가거나 포인터 캡처를 잃어도 이전 손가락을 붙잡지 않는다. */
export default function Joystick({ onDirections, disabled = false }) {
  const root = useRef(null), knob = useRef(null);
  const pointer = useRef(null), last = useRef("");
  const send = useRef(onDirections);
  useLayoutEffect(() => { send.current = onDirections; }, [onDirections]);
  const reset = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
    if (last.current || id !== null) { last.current = ""; send.current([]); }
    try {
      if (id !== null && root.current?.hasPointerCapture(id)) root.current.releasePointerCapture(id);
    } catch { /* 이미 끝난 터치면 캡처도 끝났다 */ }
  }, []);
  const move = useCallback((e) => {
    if (pointer.current !== e.pointerId || !root.current) return;
    if (e.cancelable) e.preventDefault();
    const r = root.current.getBoundingClientRect();
    const input = joystickInput(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2, r.width / 2);
    if (knob.current) knob.current.style.transform = `translate(${input.knob.x}px, ${input.knob.y}px)`;
    const key = input.directions.join(",");
    if (key !== last.current) { last.current = key; send.current(input.directions); }
  }, []);
  useEffect(() => {
    const end = (e) => { if (pointer.current === e.pointerId) reset(); };
    const touchEnd = (e) => { if (!e.touches.length && pointer.current !== null) reset(); };
    const hide = () => { if (document.hidden) reset(); };
    // React 처리기나 전투 화면 바깥으로 종료가 전달되어도 먼저 잡는다.
    document.addEventListener("pointermove", move, { capture: true, passive: false });
    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", end, true);
    document.addEventListener("touchend", touchEnd, true);
    document.addEventListener("touchcancel", touchEnd, true);
    window.addEventListener("blur", reset);
    window.addEventListener("resize", reset);
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", end, true);
      document.removeEventListener("pointercancel", end, true);
      document.removeEventListener("touchend", touchEnd, true);
      document.removeEventListener("touchcancel", touchEnd, true);
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", reset);
      document.removeEventListener("visibilitychange", hide);
      if (last.current || pointer.current !== null) send.current([]);
    };
  }, [move, reset]);
  useEffect(() => { if (disabled) reset(); }, [disabled, reset]);
  return <div ref={root} className="rpg-joystick" role="group" aria-label="이동 조이스틱" aria-disabled={disabled}
    onPointerDown={(e) => {
      if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
      if (pointer.current !== null) {
        // 이전 터치의 종료를 놓쳤어도 새 첫 손가락은 곧바로 다시 움직일 수 있다.
        if (!e.isPrimary && e.currentTarget.hasPointerCapture(pointer.current)) return;
        reset();
      }
      e.preventDefault();
      pointer.current = e.pointerId;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 문서의 이동 · 종료 처리기로 이어 간다 */ }
      move(e);
    }}
    onLostPointerCapture={(e) => { if (pointer.current === e.pointerId) reset(); }}>
    <span ref={knob} className="rpg-joystick-knob" />
  </div>;
}
