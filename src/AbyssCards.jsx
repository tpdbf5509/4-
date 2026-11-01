import { CARD_BY_N, TIER_NAMES, TIER_COLORS, GRACE, cardText } from "./game/abyssCardData.js";
import { PerkIcon } from "./ui/icons.jsx";

/* 심연의 탑 강화 카드 — 고르는 화면은 방어전 보스 보상(App.jsx .curtain.reward · .perk-card)과 같은 틀을 쓴다(11월 1일 사용자 요청).
   층을 깨면 탑이 멈추고(rpg.js tickAbyss pick 단계) 안의 사람이 모두 고를 때까지 기다린다. 한 장에 GRACE.pickTime 초,
   지나면 강화 카드는 무작위 · 저주는 거절. 모두 고르면 GRACE.startWait 초 뒤 다음 층.
   판정은 방장(전용 서버)이 한다(rpgAbyss op card · curse · reroll → abyssCards.js acChoose) */
const CAT_ICON = { atk: "attack", cond: "rage", def: "flag", heal: "ration", move: "swift", skill: "skill", status: "flame", special: "blast", grow: "gold", curse: "mark" };
const TIER_CLASS = ["", "rarity-rare", "rarity-epic", "rarity-legendary"];
const CURSE_COL = "#c49ab8";
const glow = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// 카드 셋 고르기 — 내 선택지가 있거나, 남이 고르는 동안(waiting) 뜬다
export function AbyssPick({ ac, crew, names, act }) {
  if (!ac) return null;
  const mine = ac.o.length > 0, curse = ac.ok === 1;
  const left = Math.max(0, Math.ceil(ac.dl || 0));
  return (
    <div className="curtain reward abyss-pick">
      <div className="reward-box">
        <div className="reward-head">
          <h2>{!mine ? "강화 카드" : curse ? "저주를 받겠습니까" : "강화 카드를 고르세요"}</h2>
          <p>
            {!mine ? "다른 사람을 기다리는 중 · 모두 고르면 3초 뒤 시작합니다"
              : curse ? `저주 하나를 받으면 강화 카드를 ${GRACE.curseBonus}장 더 고릅니다`
              : `같은 카드를 다시 고르면 등급이 오릅니다${ac.q + ac.cq > 1 ? ` · 남은 선택 ${ac.q + ac.cq}번` : ""}`}
            {mine && <em> · {left}초</em>}
          </p>
        </div>
        {mine ? (
          <div className="reward-cards" style={{ "--cards": ac.o.length }}>
            {ac.o.map((n, k) => {
              const c = CARD_BY_N[n], now = ac.c[n] || 0, next = now + 1;
              const col = curse ? CURSE_COL : TIER_COLORS[next];
              return (
                <button key={`${n}-${k}`} type="button" className={`perk-card ${TIER_CLASS[next]}`}
                  onClick={() => act("abyss", { op: curse ? "curse" : "card", i: k })}
                  style={{ "--pc": col, "--pcl": col, "--rc": col, "--rg": glow(col, 0.5), animationDelay: `${k * 0.05 + (next - 1) * 0.08}s` }}>
                  <span className="perk-rarity">{TIER_NAMES[next]}</span>
                  <span className="perk-art"><PerkIcon kind={CAT_ICON[c.cat]} /></span>
                  <span className="perk-name">{c.name}</span>
                  <span className="perk-note">{cardText(n, next)}</span>
                  {now > 0 && <span className="perk-have">지금 {TIER_NAMES[now]} · {cardText(n, now)}</span>}
                  <span className="ac-cat">{String(n).padStart(3, "0")} · {c.catName}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="reward-wait">고르기를 마쳤습니다.</p>
        )}
        {mine && (curse || ac.rr > 0) && (
          <div className="ac-acts">
            {curse && <button type="button" className="btn-ghost" onClick={() => act("abyss", { op: "curse", i: -1 })}>거절</button>}
            {!curse && ac.rr > 0 && <button type="button" className="btn-ghost" onClick={() => act("abyss", { op: "reroll" })}>새로고침 · {ac.rr}회</button>}
          </div>
        )}
        {crew.length > 1 && (
          <div className="reward-crew">
            {crew.map((q) => (
              <span key={q.pi} className={`crew-dot ${q.done ? "done" : ""}`} style={{ "--pcl": "#e3c48a" }}>
                {names[q.pi] || "모험가"}{q.done ? " 완료" : " 고르는 중"}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 가진 카드 — 탑 위쪽 "카드" 단추로 여닫는 작은 창(.shop 틀)
export default function AbyssCards({ ac, onFold }) {
  if (!ac) return null;
  const owned = Object.entries(ac.c).map(([n, t]) => ({ n: +n, t })).sort((a, b) => a.n - b.n);
  return (
    <section className="shop abyss-cards" aria-label="심연의 탑 가진 카드">
      <header className="shop-top">
        <div className="shop-title"><b>가진 카드</b><span>{owned.length}장 · 탑을 나오면 사라집니다</span></div>
        <button type="button" className="shop-x" aria-label="카드 창 닫기" onClick={onFold}>×</button>
      </header>
      <div className="shop-body">
        {owned.length ? (
          <ul className="ac-own">
            {owned.map(({ n, t }) => (
              <li key={n} className={CARD_BY_N[n].curse ? "curse" : ""}>
                <i style={{ background: TIER_COLORS[t] }} aria-hidden="true" />
                <b>{CARD_BY_N[n].name}<small>{TIER_NAMES[t]}</small></b>
                <span>{cardText(n, t)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="ac-note">아직 고른 카드가 없습니다.</p>}
      </div>
    </section>
  );
}
