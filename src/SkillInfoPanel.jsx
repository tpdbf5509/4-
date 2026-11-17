/* 히든 직업 스킬 설명 창(11월 17일 사용자 "m키를 누르면 스킬들 상세설명 보여주는 탭 만들어줘") — 격자 연습장에서만.
   M(그 키가 다른 행동에 묶여 있지 않을 때) · 도구 줄 「스킬 설명」 단추로 열고, 다시 M · Esc · 닫기로 닫는다.
   내용은 game/hiddenSkillInfo.js(데이터 상수에서 만든다). 모양은 그림자 명부 창(.ncw) 틀에 직업마다 색(.skw-<직업 id> — 도박꾼 금빛 · 엔지니어 청록 · 네크로맨서 보라) */
import { useEffect } from "react";

function SkillCard({ q, lv, keyOf, icon, basic }) {
  const lock = lv < q.lv;
  const k = keyOf(q.act);
  return (
    <article className={`skw-card ${lock ? "lock" : ""}`}>
      <header className="skw-top">
        <span className="gm-ico skw-ico" style={icon(q.s)} />
        <span className="skw-name">
          <b>{q.name}</b>
          <em>{basic ? "기본 공격" : q.ult ? "궁극기" : "스킬"} · {lock ? `직업 레벨 ${q.lv}에 열림` : `직업 레벨 ${q.lv}`}</em>
        </span>
        {k && <kbd className="skw-key">{k}</kbd>}
      </header>
      {q.desc.map((d, i) => <p key={i} className="skw-desc">{d}</p>)}
      <dl className="skw-stats">
        {q.stats.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}
      </dl>
      {q.train && q.train.length > 0 && <ul className="skw-train">{q.train.map((t) => <li key={t}>{t}</li>)}</ul>}
    </article>
  );
}

export default function SkillInfoPanel({ info, lv, keyOf, icon, onClose }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  return (
    <div className={`ncw skw skw-${info.id}`} role="dialog" aria-label="스킬 설명">
      <div className="ncw-head">
        <h2>스킬 설명 <em>{info.name} · {info.title} · 직업 레벨 {lv}</em></h2>
        <button type="button" className="ncw-x" onClick={onClose} aria-label="닫기">닫기</button>
      </div>
      <ul className="skw-rules">{info.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      <div className="skw-grid">
        <SkillCard q={info.basic} lv={lv} keyOf={keyOf} icon={icon} basic />
        {info.skills.map((q) => <SkillCard key={q.s} q={q} lv={lv} keyOf={keyOf} icon={icon} />)}
      </div>
      <p className="ncw-note">피해는 내 공격력에 곱하는 값입니다. 연마는 {info.trainNames.join(" · ")} 셋입니다.</p>
    </div>
  );
}
