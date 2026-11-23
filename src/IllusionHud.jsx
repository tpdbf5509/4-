import { ILLUSION, ILLUSION_NAME, ILLUSION_TITLE, IL_SLOTS, IL_SKILLS, IL_CARD, IL_TRICKED } from "./game/illusionData.js";
import { ilLock } from "./game/illusionJob.js";
import { illusionIconStyle } from "./game/illusionArt.js";
import { ILLUSION_ICON } from "./game/illusionPxData.js";

/* 11월 23일 — 격자 연습장(Sandbox.jsx)에서 옮겼다. 실제 게임(RpgView.jsx)도 같은 칸을 쓴다 */
/* Illusionist 005 칸 — 트릭 다섯 · 연계 · 거울 집 · 스킬 일곱(누르면 쓴다). 그림은 직접 그린 도트 시트(il_icons) */
export function IllusionBar({ v, keyOf: key, onUse, onFire, part }) {   // part: "stat"(트릭 · 메모) · "skills"(스킬 칸만, 스킬 탭용) · 없으면 둘 다(연습장)
  const ready = v.trick >= v.cost;
  const notes = [
    v.chain && `연계 ${v.chain.name} ${v.chain.left.toFixed(1)}초`,
    v.house && `거울 집 ${v.house.left.toFixed(1)}초${v.house.in ? " · 안" : " · 밖"}`,
    `잔상 ${Math.round(v.ghost * 100)}%`,
    v.encore && "끝없는 앙코르",
  ].filter(Boolean);
  const skills = (
    <div className="gm-skills">
      <button type="button" className="gm-skill" onClick={onFire} title={`${IL_CARD.name} — 기본 공격 · 맞히면 트릭 +1`}>
        <span className="gm-ico" style={illusionIconStyle(ILLUSION_ICON.card, 48)} />
        <span className="gm-label">{IL_CARD.name}</span>
        {key("fire") && <kbd>{key("fire")}</kbd>}
      </button>
      {IL_SLOTS.map((q) => {
        const D = IL_SKILLS[q.s], lock = ilLock({ lv: v.lv }, q.s), cd = v.cd[q.s] || 0, boost = ready && IL_TRICKED.includes(q.s);
        return (
          <button key={q.s} type="button" className={`gm-skill ${lock ? "lock" : ""} ${!lock && cd > 0 ? "wait" : ""} ${!lock && !cd && boost ? "boost" : ""}`} disabled={!!lock} onClick={() => onUse(q.s)}
            title={lock || (q.s === "final" ? `${D.name} · 트릭 전부` : boost ? `${D.name} · 트릭 ${v.cost}개로 강화` : D.name)}>
            <span className="gm-ico" style={illusionIconStyle(ILLUSION_ICON[q.s], 48)}>{!lock && cd > 0 && <b>{cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)}</b>}</span>
            <span className="gm-label">{lock ? `레벨 ${ILLUSION.unlock[q.s]}` : q.s === "slash" && v.slash ? `${D.name} ${v.slash.left}회` : D.name}</span>
            {key(q.act) && <kbd>{key(q.act)}</kbd>}
          </button>
        );
      })}
    </div>
  );
  if (part === "skills") return <div className="gm-bar side">{skills}</div>;
  return (
    <div className="gm-bar il-bar">
      <div className="gm-top">
        <span className="gm-name">{ILLUSION_NAME} <em>{ILLUSION_TITLE} · 직업 레벨 {v.lv}</em></span>
        <span className="il-tricks" aria-label={`트릭 ${v.trick}/${v.max}`}>
          {Array.from({ length: v.max }, (_, i) => <i key={i} className={i < v.trick ? "on" : ""} />)}
          <b className={ready ? "full" : ""}>{ready ? `트릭 ${v.trick} · 강화` : `트릭 ${v.trick}/${v.max}`}</b>
        </span>
      </div>
      {part !== "stat" && skills}
      <p className="gm-notes">{notes.join(" · ")}</p>
    </div>
  );
}
