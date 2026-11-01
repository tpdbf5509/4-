import { useCallback, useEffect, useRef } from "react";
import { joystickInput } from "./joystick.js";

/* 한 손가락만 붙잡아 공격 버튼과 함께 쓴다. 취소 · 화면 전환 때도 반드시 놓는다. */
export default function Joystick({ onDirections, disabled = false }) {
  const pointer = useRef(null), last = useRef("");
  const send = useRef(onDirections);
  useEffect(() => { send.current = onDirections; }, [onDirections]);
  const knob = useRef(null);
  const reset = useCallback(() => {
    pointer.current = null;
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
    if (last.current) { last.current = ""; send.current([]); }
  }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) reset(); };
    window.addEventListener("blur", reset);
    window.addEventListener("resize", reset);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", reset);
      document.removeEventListener("visibilitychange", hide);
      if (last.current) send.current([]);
    };
  }, [reset]);
  useEffect(() => { if (disabled) reset(); }, [disabled, reset]);
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const input = joystickInput(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2, r.width / 2);
    if (knob.current) knob.current.style.transform = `translate(${input.knob.x}px, ${input.knob.y}px)`;
    const key = input.directions.join(",");
    if (key !== last.current) { last.current = key; send.current(input.directions); }
  };
  const end = (e) => { if (pointer.current === e.pointerId) reset(); };
  return <div className="rpg-joystick" role="group" aria-label="이동 조이스틱" aria-disabled={disabled}
    onPointerDown={(e) => {
      if (disabled || pointer.current !== null || e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pointer.current = e.pointerId;
      move(e);
    }}
    onPointerMove={(e) => { if (pointer.current === e.pointerId) { e.preventDefault(); move(e); } }}
    onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
    <span ref={knob} className="rpg-joystick-knob" />
  </div>;
}
