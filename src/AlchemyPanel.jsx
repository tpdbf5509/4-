/* ── 물약 상점(약사) — 물약 제작 · 물약 구매 · 제작 의뢰 · 제작 정보 ─────────────
   기존 상점 틀(.shop · Tabs · Item)을 그대로 쓴다. 판정은 서버가 한다(shop.js rpgShop op craft · abuy · areq · pbuy).
   막힌 이유는 같은 why* 함수로 미리 보여 준다. 수치는 alchemyData.js */
import { useEffect, useState } from "react";
import { Tabs, Item, Head, Empty, Price } from "./ShopPanel.jsx";
import { POTION_BY_ID, whyPotionCraft, whyAlchMatBuy, whyAlchReqDone, todayKey } from "./game/shop.js";
import { MAT_BY_ID } from "./game/itemData.js";
import { ALCH, ALCH_MATS, ALCH_SHOP_MATS, ALCH_BUY_N, ALCH_PERKS, ALCH_REQ, RECIPES, GATHER, needCraftXp } from "./game/alchemyData.js";
import { alOf, craftXp, greatChance, reqMats, canBuyPotion } from "./game/alchemy.js";

const won = (n) => Math.round(n).toLocaleString("ko-KR");
const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const have = (h, id) => (h.bag.m && h.bag.m[id]) || 0;

// 제작 레벨 · 경험치 막대 — 탭 위에 늘 보인다
function AlchHead({ h }) {
  const al = alOf(h.bag);
  const max = al.lv >= ALCH.maxLv, need = max ? 1 : needCraftXp(al.lv);
  return (
    <div className="alch-head">
      <div className="alch-lv">
        <b>제작 Lv {al.lv}</b>
        <span>{max ? "최고 레벨 · 마스터 연금술사" : `경험치 ${won(al.xp)} / ${won(need)} · 다음 레벨까지 ${won(need - al.xp)}`}</span>
      </div>
      <div className="alch-bar" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={max ? need : al.xp}>
        <i style={{ width: `${max ? 100 : Math.min(100, (al.xp / need) * 100)}%` }} />
      </div>
      <p className="alch-sub">대성공 {pct(greatChance(al.lv))}{al.lv >= ALCH.saveLv ? ` · 재료 절약 ${pct(ALCH.saveChance)}` : ""} · 만든 물약 {won(al.n || 0)}개</p>
    </div>
  );
}

// 재료 한 줄 — "약초 2 (가진 5)". 모자라면 흐린 글씨
function MatNeed({ h, mats }) {
  return (
    <span className="alch-mats">
      {Object.entries(mats).map(([id, n]) => {
        const m = MAT_BY_ID[id], short = have(h, id) < n;
        return (
          <span key={id} className={short ? "short" : ""}>
            <i className="shop-mat" style={{ background: m.color }} />{m.name} {n} <small>(가진 {won(have(h, id))})</small>
          </span>
        );
      })}
    </span>
  );
}

function CraftTab({ h, send }) {
  const lv = alOf(h.bag).lv;
  const open = RECIPES.filter((r) => r.lv <= lv), locked = RECIPES.filter((r) => r.lv > lv);
  const row = (r, lock) => {
    const p = POTION_BY_ID[r.id], xp = craftXp(lv, r);
    const why = lock ? [`제작 Lv ${r.lv} 필요`] : whyPotionCraft(h, r.id);
    return (
      <Item key={r.id} dim={lock} name={p.name}
        meta={<span className="shop-meta"><span>Lv {r.lv}</span><span>가진 수 {h.bag.p[r.id] || 0}</span>
          {!lock && <span className="shop-tag">{lv >= ALCH.maxLv ? "경험치 없음" : xp ? `경험치 +${xp}${xp < r.xp ? " (50%)" : ""}` : "경험치 없음"}</span>}</span>}
        desc={<><MatNeed h={h} mats={r.mats} /><span className="shop-need">결과 {p.name} 1개 · 대성공이면 2개</span></>}
        acts={lock ? [] : [
          { label: "제작", main: true, why, onClick: () => send({ op: "craft", id: r.id, n: 1 }) },
          { label: `${ALCH.repeat}번`, quiet: true, why, onClick: () => send({ op: "craft", id: r.id, n: ALCH.repeat }) },
        ]} />
    );
  };
  return (
    <>
      <p className="shop-note">사냥터 입구 둘레에서 약초를 채집하고 물 · 정제수는 구매 탭에서 삽니다. 연속 제작은 재료가 떨어지거나 가방이 차면 그 자리에서 멈춥니다.</p>
      <Head sub={`${open.length}종`}>만들 수 있는 물약</Head>
      {open.map((r) => row(r, false))}
      {locked.length > 0 && <Head sub={`${locked.length}종`}>잠긴 레시피</Head>}
      {locked.map((r) => row(r, true))}
    </>
  );
}

function BuyTab({ h, send, Buy }) {
  const ok = canBuyPotion(h);
  return (
    <>
      <Head sub="제작 레벨 제한 없음">제작 재료</Head>
      {ALCH_SHOP_MATS.map((id) => {
        const m = MAT_BY_ID[id];
        return (
          <Item key={id} name={<><i className="shop-mat" style={{ background: m.color }} />{m.name}</>}
            meta={<span className="shop-meta"><span>가진 수 {won(have(h, id))}</span></span>}
            desc="물약 제작에 쓰는 재료입니다" price={<Price n={m.price} />}
            acts={ALCH_BUY_N.map((n, k) => ({ label: `${n}개`, quiet: k > 0, why: whyAlchMatBuy(h, id, n), onClick: () => send({ op: "abuy", id, n }) }))} />
        );
      })}
      {!ok && <p className="shop-note alch-lock"><b>물약 제작 레벨 {ALCH.buyLv}부터 구매할 수 있습니다.</b> 가진 물약은 그대로 마십니다. 특별 물약 셋은 지금도 삽니다.</p>}
      <Buy h={h} send={send} />
    </>
  );
}

function ReqTab({ h, send }) {
  const q = alOf(h.bag).q;
  const today = q && q.d === todayKey();
  return (
    <>
      <p className="shop-note">약사가 하루 {ALCH_REQ.perDay}개의 제작 의뢰를 냅니다. 한국 시간 자정에 새로 바뀝니다. 정한 물약을 가지고 오면 납품하고 제작 경험치와 재료를 받습니다.</p>
      <Head sub={today ? q.d : ""}>오늘의 제작 의뢰</Head>
      {!today && <Empty>의뢰를 불러오는 중입니다.</Empty>}
      {today && q.l.map((it, i) => {
        const p = POTION_BY_ID[it.r], n = h.bag.p[it.r] || 0;
        const mats = Object.entries(reqMats(it)).map(([m, k]) => `${MAT_BY_ID[m].name} ${k}`).join(" · ");
        return (
          <Item key={i} dim={!!it.ok} name={`${p.name} ${it.n}개 납품`}
            meta={<span className="shop-meta"><span>가진 수 {Math.min(n, it.n)}/{it.n}</span>{it.ok ? <span className="shop-tag">완료</span> : null}</span>}
            desc={`보상 제작 경험치 +${won(it.x)}${mats ? ` · ${mats}` : ""}`}
            acts={it.ok ? [] : [{ label: "납품", main: true, why: whyAlchReqDone(h, i), onClick: () => send({ op: "areq", i }) }]} />
        );
      })}
    </>
  );
}

function InfoTab() {
  const unlocks = [...new Set(RECIPES.map((r) => r.lv))].map((lv) => [lv, RECIPES.filter((r) => r.lv === lv).map((r) => POTION_BY_ID[r.id].name).join(" · ")]);
  const perks = [...unlocks, ...ALCH_PERKS.map((p) => [p.lv, p.text])].sort((a, b) => a[0] - b[0]);
  const herbs = ALCH_MATS.filter((m) => !m.price);
  return (
    <>
      <Head>레벨별 해금</Head>
      <table className="shop-odds"><tbody>
        {perks.map(([lv, text], i) => <tr key={i}><td>Lv {lv}</td><td>{text}</td></tr>)}
      </tbody></table>
      <Head>제작 대성공</Head>
      <table className="shop-odds"><tbody>
        {ALCH.great.map((s, i) => {
          const to = ALCH.great[i + 1] ? ALCH.great[i + 1].lv - 1 : ALCH.maxLv;
          return <tr key={s.lv}><td>Lv {s.lv}{to > s.lv ? `~${to}` : ""}</td><td>{pct(s.p)}</td></tr>;
        })}
      </tbody></table>
      <p className="shop-note">대성공이면 같은 재료로 물약을 2개 받습니다. 경험치는 한 번 몫입니다. 물약을 마실 때의 대성공과는 따로 셉니다.</p>
      <Head>경험치</Head>
      <p className="shop-note">
        다음 레벨까지 필요한 경험치는 {ALCH.needBase} + {ALCH.needStep} × (레벨 − 1)입니다.
        내 제작 레벨이 레시피보다 {ALCH.halfGap}레벨 이상 높으면 경험치가 절반, {ALCH.zeroGap}레벨 이상이면 0입니다.
        제작은 늘 성공하고 재료가 사라지는 실패는 없습니다. {ALCH.maxLv}레벨에서 경험치는 더 쌓이지 않습니다.
      </p>
      <Head>채집</Head>
      <p className="shop-note">
        사냥터 입구 둘레에 약초가 납니다. 가까이 가서 상호작용 키나 화면 단추를 누릅니다. 마우스 이동 방식이면 약초를 오른쪽 클릭해도 됩니다.
        {GATHER.time}초 동안 움직이지 않으면 {GATHER.n[0]}~{GATHER.n[1]}개를 얻습니다. 채집한 자리는 {GATHER.respawn}초 뒤에 다시 납니다.
      </p>
      <table className="shop-odds"><tbody>
        {herbs.map((m) => <tr key={m.id}><td><i className="shop-mat" style={{ background: m.color }} />{m.name}</td><td>{m.note}</td></tr>)}
      </tbody></table>
    </>
  );
}

export function AlchemyShop({ h, send, Buy }) {
  const [tab, setTab] = useState("craft");
  useEffect(() => { send({ op: "aday" }); }, [send]);   // 창을 열 때 — 오늘의 의뢰를 정해 달라고 한다(서버가 날짜가 바뀌었을 때만 정한다)
  const q = alOf(h.bag).q, reqLeft = q && q.d === todayKey() ? q.l.filter((it) => !it.ok).length : undefined;
  return (
    <>
      <AlchHead h={h} />
      <Tabs on={tab} set={setTab} tabs={[["craft", "물약 제작"], ["buy", "물약 구매", canBuyPotion(h) ? undefined : "잠김"], ["req", "제작 의뢰", reqLeft], ["info", "제작 정보"]]} />
      {tab === "craft" && <CraftTab h={h} send={send} />}
      {tab === "buy" && <BuyTab h={h} send={send} Buy={Buy} />}
      {tab === "req" && <ReqTab h={h} send={send} />}
      {tab === "info" && <InfoTab />}
    </>
  );
}
