import { useCallback, useEffect, useRef, useState } from "react";
import { ABYSS, ABYSS_SHOP, ABYSS_REWARD, ABYSS_RANK, ABYSS_BOXES, ABYSS_FIRST, ABYSS_LOOKS, LOOK_BY_ID, LOOK_SLOTS, SHOP_CATS, RANK_TIERS,
  SHARD, SEAL, rankReward, abyssWeek, prevWeek, weekTop, cleanAw, floorMob, costsOf } from "./game/abyssData.js";
import { DEEP_MAPS } from "./game/deepData.js";
import { whyAbyss, whyAbyssBuy } from "./game/rpg.js";
import { MAT_BY_ID, matMax } from "./game/itemData.js";
import { whyV2Buy, whyBoxOpen, buyLeft, limitText, firstState, whyFirst, giveText, lookOwned, cleanAb } from "./game/abyssReward.js";
import { drawLookPreview } from "./game/abyssLookArt.js";
import { TITLE_BY_ID } from "./game/socialData.js";
import { abyssTop } from "./net/rpgSave.js";
import { Tabs } from "./ShopPanel.jsx";

/* 광장 심연의 탑 창 — 상점 · 가방과 같은 .shop 틀 · 공통 버튼. 탭: 도전 · 순위 · 교환 · 돌파 보상.
   입장 · 교환 · 상자 · 돌파 보상 판정은 전용 서버가 다시 한다(rpg.js rpgAbyss · abyssReward.js). 화면은 같은 함수로 막힌 이유만 보여 준다.
   상자 결과는 서버가 가방 bag.ab.lr 에 남기고, 이 창이 같은 창 안에 띄운다.
   주간 보상은 전용 서버가 장부의 굳힌 지난주 순위를 보고 기록에 넣는다(room.js abyss_claim → ledger.js fn_rpg_abyss_claim) */
const ERR = {
  reward: "지난주 보상 순위에 들지 않았습니다.", claimed: "이미 받은 보상입니다.", capacity: "넣을 자리가 없습니다. 파편 · 인장이나 보관함을 비워 주세요.",
  token: "접속 정보를 확인하지 못했습니다.", rate: "잠시 뒤 다시 눌러 주세요.", net: "연결을 확인하지 못했습니다.",
  wait: `지난주 순위를 정리하고 있습니다. 월요일 0시 ${ABYSS_RANK.freezeMin}분부터 받을 수 있습니다.`, place: "광장에서 받을 수 있습니다.", trade: "거래 중에는 받을 수 없습니다.", test: "테스트 서버에서는 받을 수 없습니다.",
};
const won = (n) => Number(n || 0).toLocaleString("ko-KR");
const mmdd = (w) => (w ? `${Number(w.slice(5, 7))}월 ${Number(w.slice(8, 10))}일` : "");
const newRid = () => `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.slice(0, 24);
const BOX_ICON = { abyss_stone_select: "#86b6e6", abyss_stone_advanced: "#e08a98", abyss_treasure: "#d8b870", abyss_world_supply: "#e5c47c", abyss_essence_supply: "#b79be0", abyss_core_supply: "#c9a2e8" };

export default function AbyssPanel({ self, crew, names, room, selfName, act, onClose }) {
  const dialog = useRef(null);
  const [tab, setTab] = useState("go");
  const [board, setBoard] = useState(null), [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const [cat, setCat] = useState("mat"), [open, setOpen] = useState(""), [pick, setPick] = useState(-1);
  const [base] = useState(() => cleanAb(self && self.bag && self.bag.ab).n);   // 창을 연 때의 결과 차례 — 그 뒤에 온 결과만 띄운다
  const [shown, setShown] = useState(0);
  const [now, setNow] = useState(() => Date.now());   // 하루 · 주 횟수가 갈리는 때를 넘기면 다시 센다
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { const prev = document.activeElement; dialog.current?.focus(); return () => prev?.focus?.(); }, []);
  const load = useCallback(async () => {
    setBusy(true); setNote("");
    const r = await abyssTop(selfName);
    setBusy(false);
    if (r.ok) setBoard(r); else setNote(ERR[r.err] || ERR.net);
  }, [selfName]);
  useEffect(() => { if (tab === "rank" && !board) load(); }, [tab, board, load]);
  const [week] = useState(() => abyssWeek(Date.now()));   // 훅은 early return 앞에(self 가 늦게 오면 훅 수가 달라져 멈춘다)
  const ab = cleanAb(self && self.bag && self.bag.ab);
  if (!self) return null;
  const srv = !!(room && room.viaServer);
  const why = whyAbyss(self, self.aruns);
  const have = (id) => (self.bag && self.bag.m && self.bag.m[id]) || 0;
  const aw = cleanAw(self.bag && self.bag.aw);
  const mine = weekTop(aw, week);
  const top = (self.rec && self.rec.atop) || 0;
  const lr = ab.lr && ab.lr.n > base && ab.lr.n > shown ? ab.lr : null;
  const send = (dir) => { act("abyss", { ...dir, rid: newRid() }); setOpen(""); setPick(-1); };
  const claim = async () => {
    if (!srv) { setNote("주간 보상은 새 서버에서 받을 수 있습니다."); return; }
    setBusy(true); setNote("");
    const r = await room.ledger("abyss_claim", {});
    setBusy(false);
    setNote(r?.ok ? `지난주 ${r.rank}위 보상을 받았습니다 — ${giveText(r.give)}.` : ERR[r?.err] || ERR.net);
    if (r?.ok) load();
  };
  const lastWeek = board ? board.prev : prevWeek(week);
  const myPrev = board?.me?.prev || 0, claimed = aw.cl === lastWeek || ab.cw.includes(lastWeek) || !!board?.me?.claimed;
  const nextZone = (f) => DEEP_MAPS.find((d) => d.id === floorMob(f).type)?.mob.name;
  const boxN = Object.values(ab.bx).reduce((n, x) => n + x, 0);
  const readyN = ABYSS_FIRST.filter((_, i) => firstState(self, i) === "ready").length;
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
          <Tabs tabs={[["go", "도전"], ["rank", "순위"], ["shop", "교환", won(have(SHARD))], ["first", "돌파 보상", readyN ? `${readyN}` : undefined]]} on={tab} set={(t) => { setTab(t); setOpen(""); setNote(""); }} />
          {lr && (
            <div className="abyss-result" role="status">
              <small>{lr.k === "first" ? "돌파 보상" : lr.k === "rank" ? "주간 보상" : lr.k === "open" ? "상자를 열었습니다" : "교환했습니다"}</small>
              <b>{giveText(lr.give) || "받았습니다"}</b>
              <button type="button" className="shop-btn" onClick={() => setShown(lr.n)}>확인</button>
            </div>
          )}
          {tab === "go" && (
            <>
              <div className="abyss-me">
                <div><small>이번 주 최고</small><b>{mine ? `${mine.top}층` : "기록 없음"}</b></div>
                <div><small>가장 높이</small><b>{top ? `${top}층` : "-"}</b></div>
                <div><small>심연의 파편</small><b>{won(have(SHARD))}</b></div>
              </div>
              <ul className="abyss-rules">
                <li>한 층에 몹 무리 하나. 모두 잡으면 {ABYSS.gap}초 뒤 다음 층입니다.</li>
                <li>{ABYSS.guardEvery}층마다 수호자가 나옵니다. 층마다 {ABYSS.time}초 · 수호자 층 {ABYSS.guardTime}초.</li>
                <li>시간이 다 되거나 모두 쓰러지면 도전이 끝납니다. 깬 층의 파편은 바로 받습니다.</li>
                <li>이번 주 처음 넘는 10층 단위마다 보너스 파편(10층 {ABYSS_REWARD.weekBonus(10)}개 · 20층 {ABYSS_REWARD.weekBonus(20)}개 …).</li>
                <li>10층마다 캐릭터당 한 번 받는 돌파 보상이 있습니다. 돌파 보상 탭에서 받습니다.</li>
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
              <h3 className="shop-h">지난주 순위<small>{mmdd(lastWeek)} 주{board ? (board.fixed ? " · 확정" : " · 정리 중") : ""}</small></h3>
              <RankList list={board?.last} busy={busy} />
              <RankTable week={lastWeek} />
              <p className="abyss-reward">그 주에 {ABYSS_RANK.minFloor}층 이상 깬 사람만 받습니다. 관리자 캐릭터는 순위에서 빠집니다. 1위 후광은 받은 주가 끝날 때까지 낄 수 있습니다.</p>
              <div className="adv-acts">
                <button type="button" className="shop-btn main" disabled={busy || !myPrev || claimed || !board?.fixed} onClick={claim}>
                  {claimed ? "받았습니다" : myPrev ? `지난주 ${myPrev}위 보상 받기` : "받을 보상 없음"}
                </button>
                <button type="button" className="shop-btn" disabled={busy} onClick={load}>새로 보기</button>
              </div>
              {board && !board.fixed && myPrev > 0 && <p className="adv-why">{ERR.wait}</p>}
            </>
          )}
          {tab === "shop" && (
            <>
              <div className="abyss-wallet">
                <span><i className="abyss-dot shard" />심연의 파편 <b>{won(have(SHARD))}</b><small>/ {won(matMax(SHARD))}</small></span>
                <span><i className="abyss-dot seal" />탑의 인장 <b>{won(have(SEAL))}</b><small>/ {won(matMax(SEAL))}</small></span>
              </div>
              <div className="abyss-cats" role="tablist">
                {[...SHOP_CATS, ["store", `보관함${boxN ? ` ${boxN}` : ""}`]].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={cat === id} className={cat === id ? "on" : ""} onClick={() => { setCat(id); setOpen(""); }}>{label}</button>
                ))}
              </div>
              {cat !== "store" && (
                <ul className="abyss-goods">
                  {ABYSS_SHOP.filter((it) => it.cat === cat).map((it) => (
                    <Goods key={it.id} it={it} self={self} ab={ab} now={now} srv={srv} have={have} open={open === it.id} pick={pick}
                      onOpen={() => { setOpen(open === it.id ? "" : it.id); setPick(-1); }} setPick={setPick}
                      onBuy={(p) => send({ op: "buy", id: it.id, ...(p >= 0 ? { pick: p } : {}) })} />
                  ))}
                  {cat === "look" && <Looks ab={ab} now={now} act={act} />}
                </ul>
              )}
              {cat === "store" && (
                <ul className="abyss-goods">
                  {!boxN && <li className="abyss-note">보관함이 비었습니다. 돌파 보상 · 주간 순위 보상으로 받은 상자가 여기에 쌓입니다.</li>}
                  {Object.entries(ab.bx).map(([id, n]) => {
                    const B = ABYSS_BOXES[id], w = srv ? whyBoxOpen(self, id, B.pick ? (pick >= 0 ? pick : undefined) : undefined) : "새 서버에서만 열 수 있습니다";
                    const isOpen = open === `box:${id}`;
                    return (
                      <li key={id} className={isOpen ? "on" : ""}>
                        <BoxIcon id={id} />
                        <div className="abyss-g-main"><span>{B.name}</span><small>{n}회분 · 교환 횟수를 쓰지 않습니다</small></div>
                        <div className="abyss-g-side"><button type="button" className="shop-btn" onClick={() => { setOpen(isOpen ? "" : `box:${id}`); setPick(-1); }}>{isOpen ? "닫기" : "열기"}</button></div>
                        {isOpen && <BoxConfirm id={id} pick={pick} setPick={setPick} why={B.pick && pick < 0 ? "" : w} label="열기"
                          onGo={() => send({ op: "open", id, ...(B.pick ? { pick } : {}) })} onCancel={() => setOpen("")} />}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="abyss-note">탑의 인장은 주간 순위 상위 20명이 받습니다. 상자는 교환하면 곧바로 열립니다. 강화 카드 보너스는 상자에 붙지 않습니다.</p>
            </>
          )}
          {tab === "first" && (
            <>
              <div className="abyss-me">
                <div><small>가장 높이 깬 층</small><b>{top ? `${top}층` : "-"}</b></div>
                <div><small>받은 보상</small><b>{ABYSS_FIRST.filter((_, i) => firstState(self, i) === "got").length} / {ABYSS_FIRST.length}</b></div>
                <div><small>받을 수 있음</small><b>{readyN}</b></div>
              </div>
              <p className="abyss-note">캐릭터마다 단계별로 한 번 받습니다. 예전에 깬 층도 그대로 셉니다. 아래 층부터 차례로 받고, 상자는 보관함으로 갑니다.</p>
              <ul className="abyss-goods abyss-first">
                {ABYSS_FIRST.map((F, i) => {
                  const st = firstState(self, i), w = srv ? whyFirst(self, i) : "새 서버에서만 받을 수 있습니다";
                  const look = F.give.look ? LOOK_BY_ID[F.give.look] : null, title = F.title ? TITLE_BY_ID[F.title] : null;
                  return (
                    <li key={F.f} className={`st-${st}`}>
                      {look ? <LookPreview id={look.id} dim={st === "lock"} /> : title ? <span className="abyss-ico title">칭</span> : <BoxIcon id={Object.keys(F.give.bx)[0]} />}
                      <div className="abyss-g-main">
                        <span>{F.f}층 · {look ? `외형 「${look.name}」` : title ? `칭호 「${title.name}」` : giveText(F.give)}</span>
                        <small>{look ? `${LOOK_SLOTS[look.slot]} · ${look.note}` : title ? `${titleUpLine(title)} · 칭호 창에서 단다` : boxLine(Object.keys(F.give.bx)[0])}</small>
                      </div>
                      <div className="abyss-g-side">
                        <em className={`abyss-state ${st}`}>{st === "got" ? "수령 완료" : st === "ready" ? "수령 가능" : st === "wait" ? "아래 층부터" : `잠금 · ${Math.min(top, F.f)}/${F.f}층`}</em>
                        {st === "ready" && <button type="button" className="shop-btn main" disabled={!!w} title={w} onClick={() => send({ op: "first", id: i })}>받기</button>}
                      </div>
                      {st === "ready" && w && <p className="abyss-why">{w}</p>}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {note && <p className="adv-why">{note}</p>}
        </div>
      </section>
    </>
  );
}

const titleUpLine = (t) => (t.up.atk ? `물리력 · 마법력 +${t.up.atk}점` : t.up.hp ? `체력 +${t.up.hp}점` : "");
function boxLine(id) {
  const B = ABYSS_BOXES[id];
  if (!B) return "";
  if (B.pick) return `고르기: ${B.pick.map((x) => giveText(x)).join(" / ")}`;
  if (B.roll) return B.roll.map((x) => `${x.w}% ${giveText(x)}`).join(" / ");
  return giveText(B.give);
}

// 상품 한 줄 — 아이콘 · 이름 · 내용 · 값 · 남은 횟수 · 교환. 누르면 같은 줄 안에서 고르기 · 확인
function Goods({ it, self, ab, now, srv, have, open, pick, onOpen, setPick, onBuy }) {
  const costs = costsOf(it);
  const left = it.limit ? buyLeft(it, ab, now) : Infinity;
  const owned = (it.look && ab.own & (1 << LOOK_BY_ID[it.look].i)) || (it.title && self.rec && self.rec[it.title] > 0) || (it.give && it.give.title && self.rec && self.rec[it.give.title] > 0);
  const B = it.box ? ABYSS_BOXES[it.box] : null;
  const w = it.v2 ? (srv ? whyV2Buy(self, it.id, now, B && B.pick ? (pick >= 0 ? pick : undefined) : undefined) : "새 서버에서만 교환할 수 있습니다") : whyAbyssBuy(self, it.id);
  const pre = it.v2 && B && B.pick && pick < 0 ? (srv ? whyV2Buy(self, it.id, now, 0) : w) : w;   // 고르기 전에는 첫 몫으로 미리 본다
  const soldOut = owned || left <= 0;
  const desc = B ? boxLine(it.box) : it.look ? LOOK_BY_ID[it.look].note : it.title ? `${titleUpLine(TITLE_BY_ID.abyss_title_beyond)} · 캐릭터당 1회` : it.give.guard ? "강화 실패 때 단계가 내려가지 않게" : it.give.mat ? "던전 입장료 대신 한 장" : "칭호 창에서 단다";
  return (
    <li className={`${open ? "on" : ""} ${soldOut ? "sold" : ""}`}>
      {it.look ? <LookPreview id={it.look} /> : B ? <BoxIcon id={it.box} /> : <GoodsIcon it={it} />}
      <div className="abyss-g-main">
        <span>{it.name}{it.limit && <em className="abyss-limit">{limitText(it)}</em>}</span>
        <small>{desc}</small>
      </div>
      <div className="abyss-g-side">
        <span className="abyss-cost">{costs.map(([mat, n]) => <b key={mat} className={have(mat) < n ? "lack" : ""}><i className={`abyss-dot ${mat === SEAL ? "seal" : "shard"}`} />{won(n)}</b>)}</span>
        <small>{owned ? "가짐" : it.limit ? (left > 0 ? `남은 ${left}회` : "품절") : "제한 없음"}</small>
        <button type="button" className={`shop-btn ${open ? "" : "main"}`} disabled={!open && !!pre} title={pre} onClick={onOpen}>{open ? "닫기" : soldOut ? "품절" : "교환"}</button>
      </div>
      {!open && pre && !soldOut && <p className="abyss-why">{pre}</p>}
      {open && (B ? <BoxConfirm id={it.box} pick={pick} setPick={setPick} why={B.pick && pick < 0 ? "" : w} label="교환하기" onGo={() => onBuy(B.pick ? pick : -1)} onCancel={onOpen} />
        : <div className="abyss-confirm"><p>{it.name}을 교환합니다. {costs.map(([m, n]) => `${MAT_BY_ID[m].name} ${won(n)}개`).join(" · ")}가 빠집니다.</p>
          <div className="adv-acts"><button type="button" className="shop-btn main" disabled={!!w} onClick={() => onBuy(-1)}>교환하기</button><button type="button" className="shop-btn" onClick={onOpen}>취소</button></div>
          {w && <p className="abyss-why">{w}</p>}</div>)}
    </li>
  );
}

// 상자 확인 — 고르는 상자는 셋 가운데 하나, 확률 상자는 확률과 몫을 모두 보여 준다
function BoxConfirm({ id, pick, setPick, why, label, onGo, onCancel }) {
  const B = ABYSS_BOXES[id];
  return (
    <div className="abyss-confirm">
      {B.pick && (
        <div className="abyss-picks" role="radiogroup" aria-label="받을 보상 고르기">
          {B.pick.map((x, i) => (
            <button key={i} type="button" role="radio" aria-checked={pick === i} className={pick === i ? "on" : ""} onClick={() => setPick(i)}>{giveText(x)}</button>
          ))}
        </div>
      )}
      {B.roll && (
        <table className="abyss-odds"><tbody>
          {B.roll.map((x, i) => <tr key={i}><td>{x.w}%</td><td>{giveText(x)}</td></tr>)}
        </tbody></table>
      )}
      {B.give && <p>{giveText(B.give)}을 모두 받습니다.</p>}
      {B.roll && <p className="abyss-note">결과는 서버가 정합니다. 가장 큰 몫이 들어갈 자리가 있어야 열 수 있습니다.</p>}
      <div className="adv-acts">
        <button type="button" className="shop-btn main" disabled={(B.pick && pick < 0) || !!why} onClick={onGo}>{label}</button>
        <button type="button" className="shop-btn" onClick={onCancel}>취소</button>
      </div>
      {B.pick && pick < 0 && <p className="abyss-note">받을 보상을 하나 골라 주세요.</p>}
      {why && <p className="abyss-why">{why}</p>}
    </div>
  );
}

// 외형 — 가진 것은 끼고 벗는다(능력치 없음). 시즌 후광은 기간 안에서만
function Looks({ ab, now, act }) {
  return ABYSS_LOOKS.map((L) => {
    const own = lookOwned(ab, L.id, now), on = !!(ab.eq & (1 << LOOK_BY_ID[L.id].i));
    const how = L.season ? (own ? `${new Date(ab.sh).toLocaleDateString("ko-KR")} 끝까지` : "주간 순위 1위 보상") : own ? "가짐" : L.id === "abyss_wings" ? "교환으로 얻습니다" : `${(ABYSS_FIRST.find((f) => f.give.look === L.id) || {}).f}층 최초 돌파 보상`;
    return (
      <li key={L.id} className={`abyss-look ${own ? "" : "sold"}`}>
        <LookPreview id={L.id} dim={!own} />
        <div className="abyss-g-main"><span>{L.name}{L.legend ? <em className="abyss-limit">전설</em> : null}</span><small>{LOOK_SLOTS[L.slot]} · {L.note}</small></div>
        <div className="abyss-g-side">
          <small>{how}</small>
          <button type="button" className={`shop-btn ${on && own ? "" : "main"}`} disabled={!own}
            onClick={() => act("abyss", { op: "look", id: L.id, on: on ? 0 : 1 })}>{on && own ? "벗기" : "끼기"}</button>
        </div>
      </li>
    );
  });
}

// 예전 넷 · 칭호 — 글자 하나로(칭 칭호 · 방 하락 방지권 · 권 입장권)
function GoodsIcon({ it }) {
  const title = it.title || (it.give && it.give.title);
  return <span className={`abyss-ico ${title ? "title" : "mat"}`}>{title ? "칭" : it.give && it.give.guard ? "방" : "권"}</span>;
}
function BoxIcon({ id }) {
  return (
    <span className="abyss-ico box" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="30" height="30">
        <rect x="5" y="13" width="22" height="13" rx="1.5" fill="#2a1f17" stroke={BOX_ICON[id] || "#d8b870"} strokeWidth="1" />
        <path d="M4 13 L16 7 L28 13 Z" fill="#3a2b20" stroke={BOX_ICON[id] || "#d8b870"} strokeWidth="1" />
        <rect x="14" y="15" width="4" height="5" fill={BOX_ICON[id] || "#d8b870"} />
      </svg>
    </span>
  );
}
// 외형 미리 보기 — 작은 캔버스에 코드 그림(abyssLookArt.js)
function LookPreview({ id, dim }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return undefined;
    const ctx = c.getContext("2d");
    let raf = 0;
    const draw = (t) => { drawLookPreview(ctx, id, t / 1000, c.width, c.height); raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return <canvas ref={ref} className={`abyss-ico look ${dim ? "dim" : ""}`} width="64" height="72" aria-label={`${LOOK_BY_ID[id].name} 미리 보기`} />;
}

function RankTable({ week }) {
  if (week < ABYSS_RANK.v2From) {
    const r = (n) => rankReward(n, week);
    return <p className="abyss-reward">이 주는 예전 보상표입니다. 1위 파편 {r(1).shard} · 인장 {r(1).seal} / 2~3위 파편 {r(2).shard} · 인장 {r(2).seal} / 4~10위 파편 {r(4).shard} · 인장 {r(4).seal}</p>;
  }
  return (
    <table className="abyss-odds abyss-tiers"><tbody>
      {RANK_TIERS.map((t, i) => {
        const from = i ? RANK_TIERS[i - 1].to + 1 : 1;
        return <tr key={t.to}><td>{from === t.to ? `${t.to}위` : `${from}~${t.to}위`}</td><td>{giveText({ m: { [SHARD]: t.shard, ...(t.seal ? { [SEAL]: t.seal } : {}) }, bx: t.bx })}{t.look ? ` · ${LOOK_BY_ID[t.look].name}` : ""}</td></tr>;
      })}
    </tbody></table>
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
