import { ENGINEER, ENGINEER_NAME, ENGINEER_TITLE, EN_SLOTS, EN_SKILLS, EN_PULSE } from "./game/engineerData.js";
import { enLock } from "./game/engineerJob.js";
import { engineerIconStyle } from "./game/engineerArt.js";
import { ENGINEER_ICON } from "./game/engineerPxData.js";

/* 히든 직업 Engineer 003 화면 칸 — 격자 연습장(Sandbox.jsx)과 실제 게임(RpgView.jsx)이 같이 쓴다(11월 19일 실제 게임에 이음).
   v 는 engineerView(h) 값. 키는 새 칸 없이 기존 행동 키를 빌린다(engineerData.js EN_SLOTS) */
export /* Engineer 003 칸 — 전력 · 과열 줄 · 설치물 수 · 스킬 일곱(누르면 쓴다). 그림은 직접 그린 도트 시트(en_icons) */
function EngineerBar({ v, keyOf: key, onUse, onFire }) {
  const n = (k) => v.units.filter((u) => u.k === k).length;
  const notes = [
    `설치물 ${v.units.length}/${v.cap}`,
    n("turret") && `터렛 ${n("turret")}`, n("drone") && `드론 ${n("drone")}`, n("mech") && "수호자",
    v.oc > 0 && `오버클럭 ${v.oc.toFixed(1)}초`,
    v.lock > 0 && `과열 잠김 ${v.lock.toFixed(1)}초`,
    v.central && "중앙 제어",
  ].filter(Boolean);
  return (
    <div className="gm-bar en-bar">
      <div className="gm-top">
        <span className="gm-name">{ENGINEER_NAME} <em>{ENGINEER_TITLE} · 직업 레벨 {v.lv}</em></span>
        <span className="en-gauges">
          <span className="en-gauge" aria-label={`전력 ${Math.floor(v.power)}/${v.max}`}><i style={{ width: `${(v.power / v.max) * 100}%` }} /><b>전력 {Math.floor(v.power)}</b></span>
          <span className={`en-gauge heat ${v.hot ? "hot" : ""}`} aria-label={`과열 ${Math.floor(v.heat)}/${v.heatMax}`}><i style={{ width: `${(v.heat / v.heatMax) * 100}%` }} /><b>과열 {Math.floor(v.heat)}</b></span>
        </span>
      </div>
      <div className="gm-skills">
        <button type="button" className="gm-skill" onClick={onFire} title={`${EN_PULSE.name} — 기본 공격`}>
          <span className="gm-ico" style={engineerIconStyle(ENGINEER_ICON.pulse, 48)} />
          <span className="gm-label">{EN_PULSE.name}</span>
          {key("fire") && <kbd>{key("fire")}</kbd>}
        </button>
        {EN_SLOTS.map((q) => {
          const D = EN_SKILLS[q.s], lock = enLock({ lv: v.lv }, q.s), cd = v.cd[q.s] || 0, need = v.power < D.cost || (q.s === "oc" && v.lock > 0);
          return (
            <button key={q.s} type="button" className={`gm-skill ${lock ? "lock" : ""} ${!lock && (cd > 0 || need) ? "wait" : ""}`} disabled={!!lock} onClick={() => onUse(q.s)}
              title={lock || `${D.name} · 전력 ${D.cost}`}>
              <span className="gm-ico" style={engineerIconStyle(ENGINEER_ICON[q.s], 48)}>{!lock && cd > 0 && <b>{cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)}</b>}</span>
              <span className="gm-label">{lock ? `레벨 ${ENGINEER.unlock[q.s]}` : D.name}</span>
              {key(q.act) && <kbd>{key(q.act)}</kbd>}
            </button>
          );
        })}
      </div>
      <p className="gm-notes">{notes.join(" · ")}</p>
    </div>
  );
}

