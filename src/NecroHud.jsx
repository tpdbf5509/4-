import { NECRO, NECRO_NAME, NECRO_TITLE, NC_SLOTS, NC_SKILLS, NC_SCYTHE, NC_KINDS } from "./game/necroData.js";
import { ncLock, kindOf, gradeCost } from "./game/necroJob.js";
import { necroIconStyle } from "./game/necroArt.js";
import { NECRO_ICON } from "./game/necroPxData.js";

/* 11월 20일 — 격자 연습장(Sandbox.jsx)에서 옮겼다. 실제 게임(RpgView.jsx)도 같은 칸을 쓴다 */
export /* Necromancer 004 칸 — 영혼 줄 · 스킬 일곱(누르면 쓴다) · 명부. 그림은 직접 그린 도트 시트(nc_icons) */
function NecroBar({ v, keyOf: key, onUse, onFire, part }) {   // part: "stat"(영혼 · 명부 · 메모) · "skills"(스킬 칸만, 스킬 탭용) · 없으면 둘 다(연습장)
  const full = v.soul >= v.max;
  const notes = [
    `그림자 ${v.sh.length}기`,
    v.traces.length > 0 && `흔적 ${v.traces.length}`,
    v.dom > 0 && `영역 ${v.dom.toFixed(1)}초`,
    v.eternal && "영원의 명령",
  ].filter(Boolean);
  const skills = (
    <div className="gm-skills">
      <button type="button" className="gm-skill" onClick={onFire} title={`${NC_SCYTHE.name} — 근접 기본 공격 · 맞히면 영혼 +5`}>
        <span className="gm-ico" style={necroIconStyle(NECRO_ICON.reap, 48)} />
        <span className="gm-label">{NC_SCYTHE.name}</span>
        {key("fire") && <kbd>{key("fire")}</kbd>}
      </button>
      {NC_SLOTS.map((q) => {
        const lock = ncLock({ lv: v.lv }, q.s), cd = v.cd[q.s] || 0, need = v.soul < v.costs[q.s];
        return (
          <button key={q.s} type="button" className={`gm-skill ${lock ? "lock" : ""} ${!lock && (cd > 0 || need) ? "wait" : ""}`} disabled={!!lock} onClick={() => onUse(q.s)}
            title={lock || `${NC_SKILLS[q.s].name} — 영혼 ${v.costs[q.s]}`}>
            <span className="gm-ico" style={necroIconStyle(NECRO_ICON[q.s], 48)}>{!lock && cd > 0 && <b>{cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)}</b>}</span>
            <span className="gm-label">{lock ? `레벨 ${NECRO.unlock[q.s]}` : NC_SKILLS[q.s].name}</span>
            {key(q.act) && <kbd>{key(q.act)}</kbd>}
          </button>
        );
      })}
    </div>
  );
  if (part === "skills") return <div className="gm-bar side">{skills}</div>;
  return (
    <div className="gm-bar">
      <div className="gm-top">
        <span className="gm-name">{NECRO_NAME} <em>{NECRO_TITLE} · 직업 레벨 {v.lv}</em></span>
        <span className="nc-soul" aria-label={`영혼 ${v.soul}/${v.max}`}>
          <i><span style={{ width: `${(v.soul / v.max) * 100}%` }} /></i>
          <b className={full ? "full" : ""}>영혼 {v.soul}</b>
        </span>
      </div>
      {part !== "stat" && skills}
      <ul className="nc-roster" aria-label={`그림자 명부 ${v.roster.length}/${v.slots}`}>
        <li>명부 {v.roster.length}/{v.slots}</li>
        {v.roster.map((q) => {
          const next = gradeCost({ tr: v.tr }, q.g);
          return <li key={q.t} className={v.sh.some((s) => s.t === q.t) ? "on" : ""}>{q.n}<em>{NC_KINDS[kindOf(q.t)].name} · {q.g}등급{next ? ` ${q.x}/${next}` : ""}{v.lock[q.t] > 0 ? ` · ${Math.ceil(v.lock[q.t])}초` : ""}</em></li>;
        })}
      </ul>
      <p className="gm-notes">{notes.join(" · ")}</p>
    </div>
  );
}
