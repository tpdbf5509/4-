import { useCallback, useEffect, useRef, useState } from "react";
import { ABYSS, ABYSS_SHOP, ABYSS_REWARD, ABYSS_RANK, SHARD, SEAL, rankReward, abyssWeek, prevWeek, weekTop, cleanAw, floorMob } from "./game/abyssData.js";
import { DEEP_MAPS } from "./game/deepData.js";
import { whyAbyss, whyAbyssBuy } from "./game/rpg.js";
import { MAT_BY_ID } from "./game/itemData.js";
import { abyssTop } from "./net/rpgSave.js";
import { Tabs } from "./ShopPanel.jsx";

/* 광장 심연의 탑 창 — 상점 · 가방과 같은 .shop 틀 · 공통 버튼. 탭: 도전 · 순위 · 교환.
   입장 · 교환 판정은 방장(전용 서버)이 다시 한다(rpg.js rpgAbyss). 순위는 장부가 저장된 기록에서 셈한다(fn_rpg_abyss_top).
   주간 보상은 전용 서버가 장부의 지난주 순위를 보고 가방에 넣는다(room.js abyss_claim) */
const ERR = { reward: "지난주 상위 10에 들지 않았습니다.", claimed: "이미 받은 보상입니다.", capacity: "재료 칸이 가득 찼습니다.", token: "접속 정보를 확인하지 못했습니다.", rate: "잠시 뒤 다시 눌러 주세요.", net: "연결을 확인하지 못했습니다." };
const won = (n) => Number(n || 0).toLocaleString("ko-KR");
const mmdd = (w) => (w ? `${Number(w.slice(5, 7))}월 ${Number(w.slice(8, 10))}일` : "");

export default function AbyssPanel({ self, crew, names, room, selfName, act, onClose }) {
  const dialog = useRef(null);
  const [tab, setTab] = useState("go");
  const [board, setBoard] = useState(null), [busy, setBusy] = useState(false), [note, setNote] = useState("");
  useEffect(() => { const prev = document.activeElement; dialog.current?.focus(); return () => prev?.focus?.(); }, []);
  const load = useCallback(async () => {
    setBusy(true); setNote("");
    const r = await abyssTop(selfName);
    setBusy(false);
    if (r.ok) setBoard(r); else setNote(ERR[r.err] || ERR.net);
  }, [selfName]);
  useEffect(() => { if (tab === "rank" && !board) load(); }, [tab, board, load]);
  if (!self) return null;
  const why = whyAbyss(self, self.aruns);
  const have = (id) => (self.bag && self.bag.m && self.bag.m[id]) || 0;
  const [week] = useState(() => abyssWeek(Date.now()));
  const aw = cleanAw(self.bag && self.bag.aw);
  const mine = weekTop(aw, week);
  const claim = async () => {
    if (!room?.viaServer) { setNote("주간 보상은 새 서버에서 받을 수 있습니다."); return; }
    setBusy(true); setNote("");
    const r = await room.ledger("abyss_claim", {});
    setBusy(false);
    setNote(r?.ok ? `지난주 ${r.rank}위 보상을 받았습니다.` : ERR[r?.err] || ERR.net);
    if (r?.ok) load();
  };
  const lastWeek = board ? board.prev : prevWeek(week);
  const myPrev = board?.me?.prev || 0, claimed = aw.cl === lastWeek;
  const nextZone = (f) => DEEP_MAPS.find((d) => d.id === floorMob(f).type)?.mob.name;
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <section ref={dialog} tabIndex={-1} className="shop abyss-panel" role="dialog" aria-modal="true" aria-labelledby="abyss-title"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
        <header className="shop-top">
          <div className="shop-title"><b id="abyss-title">심연의 탑</b><span>{ABYSS.lv}레벨부터 · 끝없이 오르는 협동 도전</span></div>
          <button type="button" className="shop-x" aria-label="심연의 탑 창 닫기" onClick={onClose}>×</button>
        </header>
        <div className="shop-body deep-body abyss-body">
          <Tabs tabs={[["go", "도전"], ["rank", "순위"], ["shop", "교환", won(have(SHARD))]]} on={tab} set={setTab} />
          {tab === "go" && (
            <>
              <div className="abyss-me">
                <div><small>이번 주 최고</small><b>{mine ? `${mine.top}층` : "기록 없음"}</b></div>
                <div><small>가장 높이</small><b>{self.rec?.atop ? `${self.rec.atop}층` : "-"}</b></div>
                <div><small>심연의 파편</small><b>{won(have(SHARD))}</b></div>
              </div>
              <ul className="abyss-rules">
                <li>한 층에 몹 무리 하나. 모두 잡으면 {ABYSS.gap}초 뒤 다음 층입니다.</li>
                <li>{ABYSS.guardEvery}층마다 수호자가 나옵니다. 층마다 {ABYSS.time}초 · 수호자 층 {ABYSS.guardTime}초.</li>
                <li>시간이 다 되거나 모두 쓰러지면 도전이 끝납니다. 깬 층의 파편은 바로 받습니다.</li>
                <li>이번 주 처음 넘는 10층 단위마다 보너스 파편(10층 {ABYSS_REWARD.weekBonus(10)}개 · 20층 {ABYSS_REWARD.weekBonus(20)}개 …).</li>
                <li>층이 오를수록 몹이 단단해집니다. 1층은 {nextZone(1)}, 11층은 {nextZone(11)}.</li>
              </ul>
              <p className="abyss-crew">
                함께 오를 사람 <b>{crew.length}명</b> — {crew.map((pi) => names[pi] || "모험가").join(" · ")}
                <small>같은 파티로 광장에 있는 {ABYSS.lv}레벨 이상이 함께 들어갑니다.</small>
              </p>
              <div className="adv-acts">
                <button type="button" className="shop-btn main" disabled={why.length > 0} title={why[0] || ""}
                  onClick={() => { act("abyss", { op: "enter" }); onClose(); }}>들어가기 · {self.admin ? "무료" : `${won(ABYSS.fee)}코인`}</button>
              </div>
              {why.length > 0 && <p className="adv-why">{why[0]}</p>}
            </>
          )}
          {tab === "rank" && (
            <>
              <h3 className="shop-h">이번 주 상위 {ABYSS_RANK.top}<small>{board ? `${mmdd(board.week)} 주 · 월요일 0시에 새로 셉니다` : ""}</small></h3>
              <RankList list={board?.top} busy={busy} />
              <h3 className="shop-h">지난주 순위<small>{mmdd(lastWeek)} 주</small></h3>
              <RankList list={board?.last} busy={busy} />
              <p className="abyss-reward">1위 파편 {rankReward(1).shard} · 인장 {rankReward(1).seal} / 2~3위 파편 {rankReward(2).shard} · 인장 {rankReward(2).seal} / 4~10위 파편 {rankReward(4).shard} · 인장 {rankReward(4).seal}</p>
              <div className="adv-acts">
                <button type="button" className="shop-btn main" disabled={busy || !myPrev || claimed} onClick={claim}>
                  {claimed ? "받았습니다" : myPrev ? `지난주 ${myPrev}위 보상 받기` : "받을 보상 없음"}
                </button>
                <button type="button" className="shop-btn" disabled={busy} onClick={load}>새로 보기</button>
              </div>
            </>
          )}
          {tab === "shop" && (
            <ul className="abyss-shop">
              {ABYSS_SHOP.map((it) => {
                const w = whyAbyssBuy(self, it.id), [mat, cost] = it.cost;
                return (
                  <li key={it.id}>
                    <span>{it.name}</span>
                    <small>{MAT_BY_ID[mat].name} {won(cost)}개 · 가진 {won(have(mat))}</small>
                    <button type="button" className="shop-btn" disabled={!!w} title={w} onClick={() => act("abyss", { op: "buy", id: it.id })}>교환</button>
                  </li>
                );
              })}
              <li className="abyss-note">탑의 인장은 주간 순위 상위 {ABYSS_RANK.top}명이 받습니다. 가진 인장 {won(have(SEAL))}개.</li>
            </ul>
          )}
          {note && <p className="adv-why">{note}</p>}
        </div>
      </section>
    </>
  );
}

function RankList({ list, busy }) {
  if (!list) return <p className="abyss-empty">{busy ? "불러오는 중입니다" : "아직 불러오지 않았습니다"}</p>;
  if (!list.length) return <p className="abyss-empty">아직 기록이 없습니다</p>;
  return (
    <ol className="abyss-rank">
      {list.map((x) => <li key={x.name} className={x.rank === 1 ? "top" : ""}><span>{x.rank}</span><b>{x.name}</b><small>{x.lv}레벨</small><em>{x.floor}층</em></li>)}
    </ol>
  );
}
