import { WYVERN, WYVERN_NAME, WYVERN_TITLE, WY_SLOTS, WY_SKILLS, WY_CLAW, WY_BLOOD } from "./game/wyvernData.js";
import { wyLock } from "./game/wyvernJob.js";
import { wyvernIconStyle } from "./game/wyvernArt.js";
import { WYVERN_ICON } from "./game/wyvernPxData.js";

/* 11월 24일 — 격자 연습장(Sandbox.jsx)에서 옮겼다. 실제 게임(RpgView.jsx)도 같은 칸을 쓴다 */
/* Wyvern Knight 006 칸 — 용혈 줄 · 스킬 아홉(누르면 쓴다) · 상태. 그림은 직접 그린 도트 시트(wy_icons) */
export function WyvernBar({ v, keyOf: key, onUse, onFire, part }) {   // part: "stat"(용혈 · 메모) · "skills"(스킬 칸만) · 없으면 둘 다(연습장)
  const full = v.blood >= v.max;
  const notes = [
    v.u ? `와이번 ${Math.ceil(v.u.left)}초` : "와이번 없음",
    v.aw > 0 && `역린 해방 ${v.aw.toFixed(1)}초`,
    v.sc && `용린 ${v.sc.left.toFixed(1)}초 · 반격 ${v.sc.n}`,
    v.sync ? "진룡 동조" : v.wing ? "해방 날개 잔상" : v.tint === "line" && "붉은 비늘",
  ].filter(Boolean);
  const skills = (
    <div className="gm-skills">
      <button type="button" className="gm-skill" onClick={onFire} title={`${WY_CLAW.name} — 근접 기본 공격 · 맞히면 용혈 +${WY_BLOOD.claw}`}>
        <span className="gm-ico" style={wyvernIconStyle(WYVERN_ICON.claw, 48)} />
        <span className="gm-label">{WY_CLAW.name}</span>
        {key("fire") && <kbd>{key("fire")}</kbd>}
      </button>
      {WY_SLOTS.map((q) => {
        const S = WY_SKILLS[q.s], lock = wyLock({ lv: v.lv }, q.s), cd = v.cd[q.s] || 0, need = v.blood < S.cost;
        return (
          <button key={q.s} type="button" className={`gm-skill ${lock ? "lock" : ""} ${!lock && (cd > 0 || need) ? "wait" : ""}`} disabled={!!lock} onClick={() => onUse(q.s)}
            title={lock || `${S.name} — 용혈 ${S.cost}`}>
            <span className="gm-ico" style={wyvernIconStyle(WYVERN_ICON[q.s], 48)}>{!lock && cd > 0 && <b>{cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)}</b>}</span>
            <span className="gm-label">{lock ? `레벨 ${WYVERN.unlock[q.s]}` : S.short || S.name}</span>
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
        <span className="gm-name">{WYVERN_NAME} <em>{WYVERN_TITLE} · 직업 레벨 {v.lv}</em></span>
        <span className="nc-soul wy-blood" aria-label={`용혈 ${v.blood}/${v.max}`}>
          <i><span style={{ width: `${(v.blood / v.max) * 100}%` }} /></i>
          <b className={full ? "full" : ""}>용혈 {Math.floor(v.blood)}</b>
        </span>
      </div>
      {part !== "stat" && skills}
      <p className="gm-notes">{notes.join(" · ")}</p>
    </div>
  );
}
