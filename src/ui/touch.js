import { useEffect, useState } from "react";

/* 손가락으로 하는 기기인지 — 마우스가 없고 손끝처럼 뭉툭한 입력이면 참 */
export function useTouch() {
  const [on, setOn] = useState(() =>
    typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia("(hover: none) and (pointer: coarse)");
    const f = (e) => setOn(e.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return on;
}
