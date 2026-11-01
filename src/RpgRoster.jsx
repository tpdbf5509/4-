import { useEffect, useRef, useState } from "react";
import { elemOf, MAPS, RPG_SERVER_CAP } from "./game/rpg.js";

/* 아래에 늘 펼치던 접속 인원 — 왼쪽 위 사람 아이콘으로만 연다. */
export default function RpgRoster({ players, mySeat, partyId, names, seats, hostId, who, onOpen }) {
  const [open, setOpen] = useState(false);
  const button = useRef(null), panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const trigger = button.current;
    panel.current?.focus();
    const outside = (e) => {
      if (!panel.current?.contains(e.target) && !button.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);
  return <>
    <button ref={button} type="button" className="rpg-roster-toggle" aria-label="접속 인원"
      aria-expanded={open} aria-controls="rpg-roster-panel" aria-haspopup="dialog"
      onClick={() => { if (!open) onOpen(); setOpen((v) => !v); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="7" r="3.5" /><path d="M5 21v-3a7 7 0 0 1 14 0v3" />
      </svg>
    </button>
    {open && <div ref={panel} id="rpg-roster-panel" className="rpg-stat rpg-roster" role="dialog" aria-label="접속 인원" tabIndex={-1}>
      <div className="rpg-stat-head"><b>접속 인원 <em>{players.length}/{RPG_SERVER_CAP}</em></b>
        <button type="button" className="rpg-win-btn" onClick={() => setOpen(false)}>닫기</button>
      </div>
      <div className="rpg-party">
        {players.map((h) => <span key={h.pi} className={`rpg-mate ${h.pi === mySeat ? "mine" : ""} ${partyId && h.pty === partyId && h.pi !== mySeat ? "mate" : ""}`}
          style={{ "--pcl": elemOf(seats[h.pi]?.hero).light }}>
          <b>{names[h.pi] || "모험가"}{partyId > 0 && h.pty === partyId && <small> 파티</small>}{hostId && seats[h.pi]?.id === hostId && <i className="rpg-mate-host">방장</i>}</b>
          <em>{who(h.pi)} · Lv {h.lv} · {MAPS[h.map].name}</em>
          <span className="rpg-mate-hp"><span style={{ width: `${Math.min(100, (h.hp / (h.max || 1)) * 100)}%` }} /></span>
        </span>)}
      </div>
    </div>}
  </>;
}
