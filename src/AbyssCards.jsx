import { useState } from "react";
import { CARD_BY_N, TIER_NAMES, TIER_COLORS, GRACE, cardText } from "./game/abyssCardData.js";

/* 심연의 탑 강화 카드 창 — 상점 · 가방과 같은 .shop 틀 · 공통 버튼(게임 화면 안, 싸움은 멈추지 않는다).
   층을 깰 때마다 셋 가운데 하나를 고른다. 같은 카드를 또 고르면 브론즈 → 골드 → 다이아.
   저주는 GRACE.curseEvery 층마다 따로 나오고, 받으면 강화 카드를 한 번 더 고른다.
   판정은 방장(전용 서버)이 한다(rpg.js rpgAbyss op card · curse · reroll → abyssCards.js acChoose) */
export default function AbyssCards({ ac, act, onFold }) {
  const [tab, setTab] = useState("pick");
  if (!ac) return null;
  const owned = Object.entries(ac.c).map(([n, t]) => ({ n: +n, t })).sort((a, b) => a.n - b.n);
  const curse = ac.ok === 1;
  const left = ac.q + ac.cq;
  const view = ac.o.length ? tab : "mine";
  return (
    <section className="shop abyss-cards" aria-label="심연의 탑 강화 카드">
      <header className="shop-top">
        <div className="shop-title">
          <b>{view === "mine" ? "내 카드" : curse ? "저주 선택" : "강화 카드"}</b>
          <span>{ac.o.length ? `남은 선택 ${left}번${ac.rr ? ` · 새로고침 ${ac.rr}회` : ""}` : "고를 카드가 없습니다 · 층을 깨면 다시 나옵니다"}</span>
        </div>
        <button type="button" className="shop-x" aria-label="카드 창 접기" onClick={onFold}>×</button>
      </header>
      <div className="shop-body">
        <div className="shop-tabs" role="tablist">
          {ac.o.length > 0 && <button type="button" role="tab" aria-selected={view === "pick"} className={view === "pick" ? "on" : ""} onClick={() => setTab("pick")}>고르기</button>}
          <button type="button" role="tab" aria-selected={view === "mine"} className={view === "mine" ? "on" : ""} onClick={() => setTab("mine")}>가진 카드<small>{owned.length}</small></button>
        </div>
        {view === "pick" && (
          <>
            {curse && <p className="ac-note">저주 하나를 받으면 강화 카드를 {GRACE.curseBonus}번 더 고릅니다. 거절하면 아무 일도 없습니다.</p>}
            <ul className="ac-list">
              {ac.o.map((n, i) => {
                const c = CARD_BY_N[n], now = ac.c[n] || 0, next = now + 1;
                return (
                  <li key={`${n}-${i}`} className={curse ? "curse" : ""}>
                    <span className="ac-tier" style={{ color: TIER_COLORS[next], borderColor: TIER_COLORS[next] }}>{TIER_NAMES[next]}</span>
                    <div className="ac-main">
                      <b>{c.name}<small>{String(n).padStart(3, "0")} · {c.catName}</small></b>
                      <p>{cardText(n, next)}</p>
                      {now > 0 && <small className="ac-now">지금 {TIER_NAMES[now]} · {cardText(n, now)}</small>}
                    </div>
                    <button type="button" className="shop-btn" onClick={() => act("abyss", { op: curse ? "curse" : "card", i })}>{curse ? "받기" : "고르기"}</button>
                  </li>
                );
              })}
            </ul>
            <div className="adv-acts">
              {curse && <button type="button" className="shop-btn" onClick={() => act("abyss", { op: "curse", i: -1 })}>거절</button>}
              {!curse && ac.rr > 0 && <button type="button" className="shop-btn" onClick={() => act("abyss", { op: "reroll" })}>새로고침 · {ac.rr}회</button>}
            </div>
          </>
        )}
        {view === "mine" && (
          owned.length ? (
            <ul className="ac-own">
              {owned.map(({ n, t }) => (
                <li key={n} className={CARD_BY_N[n].curse ? "curse" : ""}>
                  <i style={{ background: TIER_COLORS[t] }} aria-hidden="true" />
                  <b>{CARD_BY_N[n].name}<small>{TIER_NAMES[t]}</small></b>
                  <span>{cardText(n, t)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="ac-note">아직 고른 카드가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
