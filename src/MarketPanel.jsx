/* ── 광장 장터 게시판 창 — 상점 창(.shop)의 틀 · 줄 · 버튼을 그대로 쓴다 ─────────────
   사기 · 팔기 · 내 물건 · 보관함 네 탭. 수치는 marketData.js, 장부는 server/src/ledger-market.js, 통신은 useMarket.js */
import { useEffect, useState } from "react";
import { Frame, Tabs, Item, Price, Head, Empty } from "./ShopPanel.jsx";
import { label } from "./TradePanel.jsx";
import { weaponArt } from "./game/shop.js";
import { armorArt } from "./game/armorData.js";
import { MARKET, marketNet } from "./game/marketData.js";

const won = (n) => Math.round(n).toLocaleString("ko-KR");
const artOf = (x) => (x.k === "w" && x.item ? weaponArt(x.item) : x.k === "a" && x.item ? armorArt(x.item.s, x.item.g, x.item.set) : null);
const left = (until) => {
  const m = Math.max(0, Math.round((until - Date.now()) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}시간 남음` : `${m}분 남음`;
};
const kindName = { w: "무기", a: "방어구", p: "물약", m: "재료", wp: "주문서", gd: "주문서" };
const meta = (x, ...more) => (
  <span className="shop-meta"><span>{kindName[x.k]}</span>{x.item?.up > 0 && <span>+{x.item.up}</span>}{x.n > 1 && <span>× {x.n}</span>}{more.filter(Boolean).map((t) => <span key={t}>{t}</span>)}</span>
);

// 가방에서 올릴 수 있는 것 — 1:1 거래 창과 같은 고르기(장착품 제외)
function choicesOf(b) {
  if (!b) return [];
  return [
    ...b.w.filter((w) => w.u !== b.e).map((w) => ({ k: "w", u: String(w.u), item: w })),
    ...b.a.filter((a) => !Object.values(b.ae || {}).includes(a.u)).map((a) => ({ k: "a", u: String(a.u), item: a })),
    ...Object.entries(b.p).filter(([, n]) => n > 0).map(([u, max]) => ({ k: "p", u, max })),
    ...Object.entries(b.m).filter(([, n]) => n > 0).map(([u, max]) => ({ k: "m", u, max })),
    ...(b.wp ? [{ k: "wp", u: "", max: b.wp }] : []), ...(b.gd ? [{ k: "gd", u: "", max: b.gd }] : []),
  ];
}

function SellForm({ x, api, onDone }) {
  const [price, setPrice] = useState("");
  const [n, setN] = useState("1");
  const p = /^[0-9]{1,10}$/.test(price) ? Number(price) : 0;
  const cnt = x.max ? Math.floor(Number(n)) : 1;
  const why = [];
  if (!(p >= MARKET.priceMin && p <= MARKET.priceMax)) why.push("값을 적어 주세요");
  if (x.max && !(cnt >= 1 && cnt <= Math.min(x.max, MARKET.stackMax))) why.push(`수량은 1~${Math.min(x.max, MARKET.stackMax)}`);
  const stop = (e) => e.stopPropagation();            // 입력 칸의 글자가 게임 조작으로 넘어가지 않게
  return (
    <div className="shop-item market-sell">
      <div className="shop-main">
        <div className="shop-name">{label(x)}{meta(x, x.max && `가진 수 ${x.max}`)}</div>
        <div className="market-form" onKeyDown={stop}>
          {x.max && <label>수량<input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, "").slice(0, 3))} /></label>}
          <label>값<input inputMode="numeric" placeholder="코인" value={price} autoFocus onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 10))} /></label>
        </div>
        <div className="shop-desc">팔리면 수수료 {Math.round(MARKET.fee * 100)}%를 떼고 <b>{won(marketNet(p))}</b>코인이 보관함에 들어옵니다. {MARKET.hours}시간 안에 안 팔리면 물건이 보관함으로 돌아옵니다.</div>
      </div>
      <div className="shop-side">
        <div className="shop-btns">
          <button type="button" className="shop-btn" onClick={onDone}>취소</button>
          <button type="button" className="shop-btn main" disabled={!!why.length || api.busy}
            onClick={async () => { const r = await api.action("post", { k: x.k, u: x.u, n: cnt, price: p }); if (r?.ok) onDone(); }}>올리기</button>
        </div>
      </div>
      {why.length > 0 && price !== "" && <div className="shop-why">{why.join(" · ")}</div>}
    </div>
  );
}

export default function MarketPanel({ api, h, selfName, onClose }) {
  const [tab, setTab] = useState("buy");
  const [pick, setPick] = useState(null);
  const { refresh } = api;
  useEffect(() => { refresh(); }, [refresh]);
  const s = api.state;
  const list = s ? s.list.filter((x) => x.seller !== selfName) : [];
  const mine = s ? s.mine : [];
  const box = s ? s.box : [];
  const boxCoins = box.reduce((t, x) => t + x.coins, 0);
  const choices = choicesOf(h.bag);
  const full = mine.length >= MARKET.slots;
  return (
    <Frame title="장터 게시판" sub={`올려 두면 접속하지 않아도 팔립니다 · 수수료 ${Math.round(MARKET.fee * 100)}%`} coins={h.coins} admin={false} note={api.note} onClose={onClose}>
      <Tabs on={tab} set={(t) => { setTab(t); setPick(null); }} tabs={[
        ["buy", "사기", s ? list.length : undefined], ["sell", "팔기"], ["mine", "내 물건", `${mine.length}/${MARKET.slots}`], ["box", "보관함", box.length || undefined],
      ]} />
      {!s && <Empty>{api.busy ? "게시판을 읽는 중입니다." : "게시판을 읽지 못했습니다."}</Empty>}
      {s && tab === "buy" && (
        <>
          <Head sub={<button type="button" className="shop-btn" disabled={api.busy} onClick={refresh}>새로 보기</button>}>올라온 물건</Head>
          {!list.length && <Empty>아직 올라온 물건이 없습니다.</Empty>}
          {list.map((x) => (
            <Item key={x.id} art={artOf(x)} name={label(x)} meta={meta(x, x.seller, left(x.until))} price={<Price n={x.price} />}
              acts={[{ label: "사기", main: true, why: h.coins < x.price ? ["코인이 모자랍니다"] : api.busy ? ["처리 중"] : [], quiet: api.busy,
                onClick: () => api.action("buy", { id: x.id, price: x.price }) }]} />
          ))}
        </>
      )}
      {s && tab === "sell" && (
        <>
          {h.admin && <Empty>관리자 캐릭터는 물건을 올릴 수 없습니다.</Empty>}
          {!h.admin && full && <Empty>{MARKET.slots}개를 모두 올렸습니다. 내 물건 탭에서 내린 뒤 올려 주세요.</Empty>}
          {!h.admin && !full && pick && <SellForm key={`${pick.k}:${pick.u}`} x={pick} api={api} onDone={() => setPick(null)} />}
          {!h.admin && !full && !pick && (
            <>
              <Head sub="장착하지 않은 물건만 올라갑니다">내 가방</Head>
              {!choices.length && <Empty>올릴 물건이 없습니다.</Empty>}
              {choices.map((x) => (
                <Item key={`${x.k}:${x.u}`} art={artOf(x)} name={label(x)} meta={meta(x, x.max && `가진 수 ${x.max}`)}
                  acts={[{ label: "값 정하기", onClick: () => setPick(x) }]} />
              ))}
            </>
          )}
        </>
      )}
      {s && tab === "mine" && (
        <>
          {!mine.length && <Empty>올려 둔 물건이 없습니다.</Empty>}
          {mine.map((x) => (
            <Item key={x.id} art={artOf(x)} name={label(x)} meta={meta(x, left(x.until))} price={<Price n={x.price} />}
              acts={[{ label: "내리기", why: api.busy ? ["처리 중"] : [], quiet: true, onClick: () => api.action("cancel", { id: x.id }) }]} />
          ))}
        </>
      )}
      {s && tab === "box" && (
        <>
          <Head sub={box.length ? `코인 ${won(boxCoins)} · 물건 ${box.filter((x) => x.give).length}건` : undefined}>보관함</Head>
          {!box.length && <Empty>판 대금과 돌아온 물건이 여기에 쌓입니다.</Empty>}
          {box.map((x) => (
            <Item key={x.id} art={artOf(x)} name={label(x)}
              meta={meta(x, x.why === "sold" ? "팔림" : x.why === "expired" ? "기간 끝" : "내림")}
              price={x.why === "sold" ? <Price n={x.coins} old={x.price} /> : undefined} />
          ))}
          {box.length > 0 && (
            <div className="shop-btns market-claim">
              <button type="button" className="shop-btn main" disabled={api.busy} onClick={() => api.action("claim")}>모두 받기</button>
            </div>
          )}
        </>
      )}
    </Frame>
  );
}
