/* 격자 연습장 키 설정 창(11월 18일 사용자 "격자 연습장 키 설정 기능 추가해줘") — 연습장에서만.
   실제 게임 키 설정 창(RpgView .rpg-keyset)과 같은 틀 · 같은 거르기(game/keyScope.js keyLayout)를 쓴다.
   고른 직업이 쓰는 행동만 보이고, 쓰는 행동끼리 겹친 키 · 빈 칸을 알린다.
   키는 연습장 칸(keys.js SANDBOX_KEYS)에만 저장한다 — 게임 키는 바뀌지 않는다 */
import { useEffect, useState } from "react";
import { KEY_SLOTS, bindKey, clearKey, keyLabel, mouseCode } from "./game/keys.js";
import { keyLayout, offCount } from "./game/keyScope.js";

export default function SandboxKeys({ binds, setBinds, who, onReset, onClose }) {
  const [waitKey, setWaitKey] = useState(null);     // 새 키를 기다리는 칸 { id, slot }
  const [all, setAll] = useState(false);            // 안 쓰는 행동도 잠긴 줄로 보기

  // 고른 칸에 다음으로 누른 키나 마우스 버튼을 넣는다. Esc 는 그만두기(기다리지 않을 때는 창 닫기), Backspace · Delete 는 비우기
  useEffect(() => {
    const onKey = (e) => {
      if (!waitKey) {
        if (e.code === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") return setWaitKey(null);
      if (e.code === "Backspace" || e.code === "Delete") setBinds((b) => clearKey(b, waitKey.id, waitKey.slot));
      else setBinds((b) => bindKey(b, waitKey.id, waitKey.slot, e.code));
      setWaitKey(null);
    };
    // 좌클릭은 기다리는 그 칸 위에서 눌러야 넣는다 — 다른 곳 좌클릭은 그만두기. 다른 버튼은 어디서 눌러도 넣는다
    const onMouse = (e) => {
      if (!waitKey) return;
      const code = mouseCode(e.button);
      if (!code) return;
      if (e.button === 0 && !e.target?.closest?.(".rpg-key-slot.wait")) return setWaitKey(null);
      e.preventDefault();
      e.stopPropagation();
      setBinds((b) => bindKey(b, waitKey.id, waitKey.slot, code));
      setWaitKey(null);
      // 같은 버튼의 뒤따르는 클릭 · 오른쪽 메뉴를 잠깐 막는다
      const eat = (ev) => { if (ev.type === "contextmenu" || ev.button === e.button) { ev.preventDefault(); ev.stopPropagation(); } };
      const kinds = ["click", "auxclick", "contextmenu", "mouseup"];
      kinds.forEach((k) => window.addEventListener(k, eat, true));
      setTimeout(() => kinds.forEach((k) => window.removeEventListener(k, eat, true)), 300);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onMouse, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousedown", onMouse, true);
    };
  }, [waitKey, setBinds, onClose]);

  const layout = keyLayout(binds, who, all);
  const off = offCount(who);
  const bad = layout.flatMap((sec) => sec.rows).filter((r) => r.on && (r.conflict.length || r.empty)).length;
  return (
    <>
      <div className="rpg-menu-back" onClick={() => { if (!waitKey) onClose(); }} />
      <div className="rpg-stat rpg-win rpg-keyset sb-keyset" role="dialog" aria-label="연습장 키 설정">
        <div className="rpg-stat-head">
          <b>키 설정</b>
          <span>{bad ? `확인할 칸 ${bad}개` : "모두 정상"}</span>
        </div>
        <p className="rpg-key-guide">칸을 누른 뒤 쓸 키를 누릅니다. <kbd>Backspace</kbd> 비우기 · <kbd>Esc</kbd> 그만두기. 고른 직업이 쓰는 키만 보입니다.</p>
        <div className="rpg-key-scroll">
          {layout.map((sec) => (
            <section key={sec.id} className="rpg-key-sec">
              <h4>{sec.name}</h4>
              {sec.rows.map(({ a, on, note, conflict, empty }) => (
                <div key={a.id} className={`rpg-key-row ${on ? "" : "off"} ${conflict.length ? "bad" : ""}`}>
                  <span className="rpg-key-name">
                    <b>{a.name.replace(/\((BLOOD-001)[^)]*\)/, "").trim() || a.name}</b>
                    {note && <em>{note}</em>}
                    {conflict.length > 0 && <small className="warn">{conflict.join(" · ")}와 겹침</small>}
                    {empty && <small className="warn">키 없음</small>}
                    {!on && <small>이 직업은 쓰지 않음</small>}
                  </span>
                  {Array.from({ length: KEY_SLOTS }, (_, slot) => {
                    const wait = waitKey && waitKey.id === a.id && waitKey.slot === slot;
                    const code = binds[a.id][slot];
                    return (
                      <button key={slot} type="button" disabled={!on} className={`rpg-key-slot ${wait ? "wait" : ""} ${code ? "" : "empty"}`}
                        aria-label={`${a.name} ${slot + 1}번 칸`}
                        onClick={() => setWaitKey(wait ? null : { id: a.id, slot })}>
                        {wait ? "키 입력…" : keyLabel(code) || "비어 있음"}
                      </button>
                    );
                  })}
                </div>
              ))}
            </section>
          ))}
        </div>
        <p className="rpg-key-guide">연습장 키는 게임 키와 따로 이 기기에 저장됩니다. 처음에는 게임 키를 그대로 가져옵니다.</p>
        <div className="rpg-stat-foot">
          {off > 0 && <button type="button" className="btn-ghost" onClick={() => setAll((v) => !v)}>{all ? "안 쓰는 키 숨기기" : `안 쓰는 키 ${off}개 보기`}</button>}
          <button type="button" className="btn-ghost" onClick={() => { setWaitKey(null); onReset(); }}>게임 키로 되돌리기</button>
          <button type="button" className="btn-main" onClick={() => { setWaitKey(null); onClose(); }}>닫기</button>
        </div>
      </div>
    </>
  );
}
