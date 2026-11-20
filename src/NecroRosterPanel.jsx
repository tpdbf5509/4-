/* Necromancer 004 그림자 명부 창(11월 17일 사용자 "이런 느낌으로 창을 띄워서 볼 수 있게 해줘, 추출한 그림자들").
   탭 셋 — 소환 목록(카드 + 소환 정보) · 군단 편성(소환 차례 5칸) · 승급(재추출 진행). 격자 연습장에서만 연다.
   값은 연습장 화면 값(necroView), 판정은 입력(hidden op)으로만 바꾼다. 「강화」만 연습장 도구(재추출 한 번으로 셈) */
import { useEffect, useRef, useState } from "react";
import { NECRO, NC_KINDS, NC_KIND_DESC, NC_ROSTER, NC_SUMMON, NC_NAME } from "./game/necroData.js";
import { gradeCost, kindOf, summonPick, cleanNcName } from "./game/necroJob.js";
import { drawNecroPortrait } from "./game/necroArt.js";

const ROW = { shade: 0, violet: 1, silver: 2 };
// 능력치 막대의 끝 — 다섯 종류 가운데 가장 큰 값(공격 세기는 5등급 기준)
const TOP = {
  atk: NC_SUMMON.mul * (1 + NC_ROSTER.gradeDmg * (NC_ROSTER.grades - 1)),
  reach: Math.max(...Object.values(NC_KINDS).map((k) => k.reach)),
  spd: Math.max(...Object.values(NC_KINDS).map((k) => k.spd)),
  r: Math.max(...Object.values(NC_KINDS).map((k) => k.r)),
};
const atkOf = (g) => NC_SUMMON.mul * (1 + NC_ROSTER.gradeDmg * (g - 1));
const mmss = (s) => { const n = Math.ceil(s); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };

// 그림자 초상 — 그림이 굳을 때까지 0.25초마다 다시 그린다(그림 파일이 늦게 오는 몹)
function Portrait({ t, size, row }) {
  const ref = useRef(null);
  useEffect(() => {
    let left = 80, id = 0;
    const draw = () => {
      const c = ref.current; if (!c) return;
      const r = drawNecroPortrait(c.getContext("2d"), t, size, size, row);
      if (r !== "done" && --left > 0) id = setTimeout(draw, 250);
    };
    draw();
    return () => clearTimeout(id);
  }, [t, size, row]);
  return <canvas ref={ref} className="ncw-face" width={size} height={size} aria-hidden="true" />;
}

// 카드 오른쪽 상태 — 나와 있음 · 소각 잠김 · 소집 대기 · 영혼 부족 · 준비 완료
function stateOf(v, q) {
  const on = v.sh.find((s) => s.t === q.t);
  if (on) return { id: "on", text: "소환 중", sub: `${Math.ceil(on.life)}초` };
  if (v.lock[q.t] > 0) return { id: "cd", text: "쿨타임", sub: mmss(v.lock[q.t]) };
  if (v.lv < NECRO.unlock.summon) return { id: "lock", text: "잠김", sub: `직업 레벨 ${NECRO.unlock.summon}` };
  if ((v.cd.summon || 0) > 0) return { id: "cd", text: "쿨타임", sub: mmss(v.cd.summon) };
  if (v.soul < v.costs.summon) return { id: "need", text: "영혼 부족", sub: `${v.soul}/${v.costs.summon}` };
  return { id: "ready", text: "준비 완료" };
}

function Card({ v, q, row, on, onPick }) {
  const k = NC_KINDS[kindOf(q.t)], st = stateOf(v, q);
  return (
    <button type="button" className={`ncw-card ${on ? "on" : ""}`} aria-pressed={on} onClick={() => onPick(q.t)}>
      <Portrait t={q.t} size={64} row={row} />
      <span className="ncw-card-main">
        <b>{q.n}</b>
        <span>{k.name} · {q.g}등급</span>
        <span>소환 비용 <i className="ncw-soul">영혼 {v.costs.summon}</i></span>
      </span>
      <span className={`ncw-state ${st.id}`}>{st.text}{st.sub && <em>{st.sub}</em>}</span>
    </button>
  );
}

function Bar({ label, value, max, text }) {
  return (
    <div className="ncw-stat">
      <span>{label}</span>
      <i><span style={{ width: `${Math.max(4, Math.min(100, (value / max) * 100))}%` }} /></i>
      <b>{text}</b>
    </div>
  );
}

function Info({ v, q, row, onSummon, onRecall, onRefine, onName }) {
  const kid = kindOf(q.t), k = NC_KINDS[kid], st = stateOf(v, q), need = gradeCost({ tr: v.tr }, q.g), out = st.id === "on";
  const canCall = st.id === "ready" || out;
  return (
    <section className="ncw-info" aria-label="소환 정보">
      <h3 className="ncw-h">소환 정보</h3>
      <div className="ncw-hero">
        <Portrait t={q.t} size={132} row={row} />
        <div>
          <b className="ncw-name">{q.n}{q.nm && <em className="ncw-base">{q.base}</em>}</b>
          <p className="ncw-role"><span>역할</span>{k.name} · {k.role}</p>
          <p className="ncw-desc">{NC_KIND_DESC[kid]}</p>
        </div>
      </div>
      <div className="ncw-grade">
        <span><b>{q.g}등급</b> / {NC_ROSTER.grades}</span>
        <em>{need ? `재추출 ${q.x} / ${need}` : "최고 등급"}</em>
      </div>
      <i className="ncw-gbar"><span style={{ width: `${need ? (q.x / need) * 100 : 100}%` }} /></i>
      <h4 className="ncw-sub">기본 능력치</h4>
      <Bar label="공격 세기" value={atkOf(q.g)} max={TOP.atk} text={`×${atkOf(q.g).toFixed(1)}`} />
      <Bar label="공격 거리" value={k.reach} max={TOP.reach} text={k.reach} />
      <Bar label="이동 속도" value={k.spd} max={TOP.spd} text={k.spd} />
      <Bar label="공격 범위" value={k.r || 0} max={TOP.r} text={k.r ? `반지름 ${k.r}` : "한 대상"} />
      <p className="ncw-note">그림자는 피해를 받지 않습니다. 공격 세기는 내 공격력에 곱하며 {NC_SUMMON.gap}초마다 칩니다.</p>
      <div className="ncw-cost">
        <span>소환 비용 <b>영혼 {v.costs.summon}</b></span>
        <span>재사용 대기 <b>{NC_SUMMON.cd}초</b></span>
        <span>유지 <b>{NC_SUMMON.dur}초</b></span>
      </div>
      <div className="ncw-acts">
        <button type="button" className="ncw-btn main" disabled={!canCall} onClick={() => onSummon(q.t)}
          title={`이 그림자를 맨 앞에 두고 ${NC_SUMMON.name}을 씁니다(최대 ${NC_SUMMON.max}기)`}>소환</button>
        <button type="button" className="ncw-btn" disabled={!out} onClick={() => onRecall(q.t)} title="나와 있는 이 그림자만 거둡니다">회수</button>
        <button type="button" className="ncw-btn" disabled={!need} onClick={() => onRefine(q.t)} title="연습장 전용 — 같은 종류를 한 번 재추출한 것으로 셉니다">강화</button>
        {onName && <button type="button" className="ncw-btn" onClick={() => onName(q)} title="이 그림자의 이름을 정합니다 — 내 화면에만 보입니다">이름</button>}
      </div>
    </section>
  );
}

function Party({ v, row, onParty }) {
  // 편성은 이 창만 바꾼다 — 화면 값은 조금 늦게 오므로 연 때의 값을 이어 받아 여기서 들고 있는다(빠르게 눌러도 앞 선택이 지워지지 않게)
  const [mine, setMine] = useState(() => v.party.slice());
  const party = mine.filter((t) => v.roster.some((q) => q.t === t));
  const send = (list) => { setMine(list); onParty(list); };
  const next = summonPick({ roster: v.roster, party }, v.lock);
  const toggle = (t) => send(party.includes(t) ? party.filter((x) => x !== t) : party.length < NC_SUMMON.max ? [...party, t] : party);
  const nameOf = (t) => (v.roster.find((q) => q.t === t) || {}).n || t;
  return (
    <div className="ncw-party">
      <p className="ncw-note">그림자 소환 때 나올 그림자를 고릅니다. 고른 그림자만 나옵니다. 하나도 고르지 않으면 등급 높은 순서로 나옵니다.</p>
      <ol className="ncw-slots">
        {Array.from({ length: NC_SUMMON.max }, (_, i) => {
          const t = party[i];
          return (
            <li key={i}>
              {t ? <button type="button" onClick={() => toggle(t)} title="빼기"><Portrait t={t} size={56} row={row} /><span>{nameOf(t)}</span></button>
                : <span className="ncw-empty">{i + 1}</span>}
            </li>
          );
        })}
      </ol>
      <p className="ncw-next">다음 소환 — {next.length ? next.map((q) => q.n).join(" · ") : "부를 수 있는 그림자가 없습니다"}</p>
      <div className="ncw-grid">
        {v.roster.map((q) => {
          const i = party.indexOf(q.t);
          return (
            <button key={q.t} type="button" className={`ncw-mini ${i >= 0 ? "on" : ""}`} aria-pressed={i >= 0} onClick={() => toggle(q.t)}
              disabled={i < 0 && party.length >= NC_SUMMON.max}>
              <Portrait t={q.t} size={48} row={row} />
              <span>{q.n}<em>{NC_KINDS[kindOf(q.t)].name} · {q.g}등급</em></span>
              {i >= 0 && <b>{i + 1}</b>}
            </button>
          );
        })}
      </div>
      {party.length > 0 && <button type="button" className="ncw-btn" onClick={() => send([])}>편성 비우기</button>}
    </div>
  );
}

function Grades({ v, row, onRefine }) {
  return (
    <div className="ncw-grades">
      <p className="ncw-note">같은 종류를 다시 추출하면 승급합니다. 드는 재추출 수 {NC_ROSTER.cost.join(" · ")}. 등급마다 공격 세기 +{NC_ROSTER.gradeDmg * 100}%.</p>
      {v.roster.map((q) => {
        const need = gradeCost({ tr: v.tr }, q.g);
        return (
          <div key={q.t} className="ncw-gr">
            <Portrait t={q.t} size={48} row={row} />
            <span className="ncw-gr-main">
              <b>{q.n} <em>{q.g}등급</em></b>
              <i className="ncw-gbar"><span style={{ width: `${need ? (q.x / need) * 100 : 100}%` }} /></i>
              <em>{need ? `재추출 ${q.x} / ${need} · 다음 등급 ×${atkOf(q.g + 1).toFixed(1)}` : "최고 등급"}</em>
            </span>
            <button type="button" className="ncw-btn" disabled={!need} onClick={() => onRefine(q.t)} title="연습장 전용 — 재추출 한 번으로 셉니다">강화</button>
          </div>
        );
      })}
    </div>
  );
}

const TABS = [["list", "소환 목록"], ["party", "군단 편성"], ["grade", "승급"]];

export default function NecroRosterPanel({ v, onSummon, onRecall, onParty, onRefine, onName, onClose }) {
  const [tab, setTab] = useState("list");
  const [pick, setPick] = useState(null);
  const box = useRef(null);
  // 좁은 화면은 정보가 목록 위에 있다 — 고르면 위로 올린다
  const choose = (t) => { setPick(t); if (box.current && window.innerWidth <= 720) box.current.scrollTo({ top: 0, behavior: "smooth" }); };
  const row = ROW[v.tint] || 0;
  const cur = v.roster.find((q) => q.t === pick) || v.roster[0];
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" && !document.querySelector(".ncn")) { e.stopPropagation(); onClose(); } };   // 이름 짓기 창이 떠 있으면 그 창이 먼저
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  return (
    <div className="ncw" role="dialog" aria-label="그림자 명부" ref={box}>
      <div className="ncw-head">
        <h2>그림자 명부 <em>{v.roster.length}/{v.slots} · 영혼 {v.soul}</em></h2>
        <button type="button" className="ncw-x" onClick={onClose} aria-label="닫기">닫기</button>
      </div>
      <div className="ncw-tabs" role="tablist">
        {TABS.map(([id, name]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{name}</button>
        ))}
      </div>
      {!v.roster.length ? <p className="ncw-note ncw-blank">명부가 비었습니다. 몹을 쓰러뜨린 흔적에서 흔적 추출로 등록하세요.</p>
        : tab === "list" ? (
          <div className="ncw-body">
            <div className="ncw-list">
              {v.roster.map((q) => <Card key={q.t} v={v} q={q} row={row} on={cur && cur.t === q.t} onPick={choose} />)}
            </div>
            {cur && <Info v={v} q={cur} row={row} onSummon={onSummon} onRecall={onRecall} onRefine={onRefine} onName={onName} />}
          </div>
        ) : tab === "party" ? <Party v={v} row={row} onParty={onParty} />
        : <Grades v={v} row={row} onRefine={onRefine} />}
    </div>
  );
}

/* 이름 짓기 알림창(11월 20일 사용자 참고 사진 — 「이름을 내려 주십시오」). 처음 추출해 명부에 넣은 그림자 · 명부 창 「이름」 단추.
   q = { t, n 몹 이름, nm 지금 이름, g 등급 }. 이름은 내 화면에만 보인다. Enter 확인 · Esc 나중에 */
export function NecroNamer({ q, row = 0, onDone, onSkip }) {
  const [text, setText] = useState(q.nm || "");
  const ref = useRef(null);
  const raw = text.trim(), clean = cleanNcName(text), bad = !!raw && !clean;
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onSkip(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onSkip]);
  const ok = () => { if (!bad) onDone(clean); };
  return (
    <div className="ncn" role="dialog" aria-label="그림자 이름 짓기">
      <div className="ncn-box">
        <h3 className="ncn-h"><i aria-hidden="true">!</i>알림</h3>
        <Portrait t={q.t} size={72} row={row} />
        <p className="ncn-sub">{q.g}등급 · {NC_KINDS[kindOf(q.t)].name} · {q.n}</p>
        <p className="ncn-ask">이름을 내려 주십시오.</p>
        <input ref={ref} className="ncn-in" value={text} maxLength={NC_NAME.max + 4} placeholder={q.n} aria-label="그림자 이름"
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ok(); }} />
        <p className={`ncn-help ${bad ? "bad" : ""}`}>{bad ? "쓸 수 없는 이름입니다" : `${NC_NAME.max}자까지 · 비우면 몹 이름 · 내 화면에만 보입니다`}</p>
        <div className="ncn-acts">
          <button type="button" className="ncw-btn" onClick={onSkip}>나중에</button>
          <button type="button" className="ncw-btn main" disabled={bad} onClick={ok}>이름 내리기</button>
        </div>
      </div>
    </div>
  );
}
