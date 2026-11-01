import { useEffect, useRef, useState } from "react";
import { elemOf, MAPS, RPG_SERVER_CAP } from "./game/rpg.js";

/* 왼쪽 위 인원 · 설명 아이콘 — 같은 갈색 창을 하나씩 연다. */
export default function RpgCornerMenus({ players, mySeat, partyId, names, seats, hostId, who, onOpen, helpContent }) {
  const [open, setOpen] = useState(null);
  const button = useRef(null), helpButton = useRef(null), panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const trigger = open === "help" ? helpButton.current : button.current;
    panel.current?.focus();
    const outside = (e) => {
      if (!panel.current?.contains(e.target) && !button.current?.contains(e.target) && !helpButton.current?.contains(e.target)) setOpen(null);
    };
    const escape = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(null); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);
  const toggle = (kind) => {
    if (open !== kind) onOpen();
    setOpen((current) => current === kind ? null : kind);
  };
  const label = open === "help" ? "게임 설명" : "접속 인원";
  const iconKey = (e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); };
  return <>
    <button ref={button} type="button" className="rpg-roster-toggle" aria-label="접속 인원"
      aria-expanded={open === "roster"} aria-controls="rpg-roster-panel" aria-haspopup="dialog"
      onKeyDown={iconKey} onClick={() => toggle("roster")}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="7" r="3.5" /><path d="M5 21v-3a7 7 0 0 1 14 0v3" />
      </svg>
    </button>
    <button ref={helpButton} type="button" className="rpg-roster-toggle rpg-help-toggle" aria-label="게임 설명"
      aria-expanded={open === "help"} aria-controls="rpg-help-panel" aria-haspopup="dialog"
      onKeyDown={iconKey} onClick={() => toggle("help")}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.8-1.7 1.2-1.7 2.7M12 17h.01" />
      </svg>
    </button>
    {open && <div ref={panel} id={open === "help" ? "rpg-help-panel" : "rpg-roster-panel"}
      className={`rpg-stat rpg-roster ${open === "help" ? "rpg-help" : ""}`} role="dialog" aria-label={label} tabIndex={-1} onKeyDown={(e) => e.stopPropagation()}>
      <div className="rpg-stat-head"><b>{label}{open === "roster" && <> <em>{players.length}/{RPG_SERVER_CAP}</em></>}</b>
        <button type="button" className="rpg-win-btn" onClick={() => setOpen(null)}>닫기</button>
      </div>
      {open === "help" ? helpContent : (
        <div className="rpg-party">
          {players.map((h) => <span key={h.pi} className={`rpg-mate ${h.pi === mySeat ? "mine" : ""} ${partyId && h.pty === partyId && h.pi !== mySeat ? "mate" : ""}`}
            style={{ "--pcl": elemOf(seats[h.pi]?.hero).light }}>
            <b>{names[h.pi] || "모험가"}{partyId > 0 && h.pty === partyId && <small> 파티</small>}{hostId && seats[h.pi]?.id === hostId && <i className="rpg-mate-host">방장</i>}</b>
            <em>{who(h.pi)} · Lv {h.lv} · {MAPS[h.map].name}</em>
            <span className="rpg-mate-hp"><span style={{ width: `${Math.min(100, (h.hp / (h.max || 1)) * 100)}%` }} /></span>
          </span>)}
        </div>
      )}
    </div>}
  </>;
}
