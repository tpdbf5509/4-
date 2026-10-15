/* ── RPG 광장 상점 창 · 가방 창 ──────────────────────────────
   상점마다 탭으로 나눈다. 한 줄은 [그림] [이름 · 등급 · 설명] [값 · 버튼] 이고, 막힌 이유는 그 줄 아래에 한 줄로 적는다.
   버튼을 누르면 send({ op, ... }) 로 방장에게 보내고, 결과는 note 로 돌아와 창 위쪽에 한 줄로 뜬다.
   막힌 이유는 방장과 같은 조건 함수(why*)로 미리 보여 준다. */
import { useState } from "react";
import { STATS, statValue } from "./game/rpg.js";
import {
  SHOPS, GRADES, WEAPON_TIERS, WEAPON, DEAL, SPECIALS, SKILL_FAMS, SKILLS, POTIONS, POTION,
  CASINO, BOX, DICE, SLOT,
} from "./game/shopData.js";
import {
  SHOP_BY_ID, POTION_BY_ID, FAM_BY_ID, SKILL_BY_ID, todayKey, usedToday, tierOf, weaponName,
  weaponLine, weaponArt, specOf, specialTier, specialPrice, specialsFor, sellPrice, dealOf, equipped,
  skillNext, extraStat, whyDealBuy, whySpecialBuy, whyWeaponSell, whyEquip, whySkill, whyPotionBuy, whyPotionUse,
  whyGamble, boxPrice, boxShares, casinoEv, whyEnhance, whyMatSell, enhFee, itemBonus, weaponStat, matCount,
} from "./game/shop.js";
import { MATERIALS, MAT_BY_ID, ENHANCE, STONE_IDS, enhRate } from "./game/itemData.js";
import { Coin } from "./ui/icons.jsx";

const won = (n) => Math.round(n).toLocaleString("ko-KR");
const pct = (v, d = 1) => `${(Math.round(v * 100 * 10 ** d) / 10 ** d).toLocaleString("ko-KR")}%`;
const statDef = (id) => STATS.find((t) => t.id === id);

/* ── 공통 조각 ─────────────────────────────────────────────── */
function Tabs({ tabs, on, set }) {
  return (
    <div className="shop-tabs" role="tablist">
      {tabs.map(([id, label, sub]) => (
        <button key={id} type="button" role="tab" aria-selected={on === id} className={on === id ? "on" : ""} onClick={() => set(id)}>
          {label}{sub !== undefined && <small>{sub}</small>}
        </button>
      ))}
    </div>
  );
}
const Price = ({ n, old }) => (
  <span className="shop-price">{old !== undefined && <s>{won(old)}</s>}<Coin />{won(n)}</span>
);
const Grade = ({ g }) => <span className={`shop-grade g${g}`}>{GRADES[g].name}</span>;

/* 한 줄 — acts: [{ label, why, onClick, main, quiet }]. 막힌 버튼이 있으면 이유를 줄 아래에 적는다(quiet 는 적지 않는다) */
function Item({ art, name, meta, desc, price, acts = [], dim }) {
  const blocked = acts.filter((a) => a.why && a.why.length && !a.quiet);
  const why = blocked.map((a) => (acts.length > 1 ? `${a.label} — ${a.why.join(" · ")}` : a.why.join(" · ")));
  return (
    <div className={`shop-item ${art ? "has-art" : ""} ${dim ? "dim" : ""}`}>
      {art && <img className="shop-art" src={art} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />}
      <div className="shop-main">
        <div className="shop-name">{name}{meta}</div>
        {desc && <div className="shop-desc">{desc}</div>}
      </div>
      <div className="shop-side">
        {price}
        {acts.length > 0 && (
          <div className="shop-btns">
            {acts.map((a) => (
              <button key={a.label} type="button" className={`shop-btn ${a.main ? "main" : ""}`}
                disabled={!!(a.why && a.why.length)} onClick={a.onClick}>{a.label}</button>
            ))}
          </div>
        )}
      </div>
      {why.length > 0 && <div className="shop-why">{why.join("  /  ")}</div>}
    </div>
  );
}
const Head = ({ children, sub }) => <h4 className="shop-h">{children}{sub && <small>{sub}</small>}</h4>;
const Empty = ({ children }) => <p className="shop-empty">{children}</p>;

// 무기 한 줄 — 특별 무기는 그림 · 등급 · 레벨
function WeaponItem({ w, tag, desc, price, acts, dim }) {
  const sp = specOf(w);
  return (
    <Item art={weaponArt(w)} dim={dim} price={price} acts={acts}
      name={weaponName(w)}
      meta={<span className="shop-meta"><Grade g={w.g} /><span>Lv {WEAPON_TIERS[w.r]}</span>{sp && <span>특별</span>}{tag && <span className="shop-tag">{tag}</span>}</span>}
      desc={desc || weaponLine(w)} />
  );
}

function potionText(p) {
  if (p.kind === "heal") return `최대 체력의 ${pct(p.pct, 0)} 회복`;
  if (p.kind === "buff") return `${p.dur}초 동안 ${statDef(p.stat).name} +${statDef(p.stat).fmt(p.amt)}`;
  return "찍은 스탯 포인트를 모두 돌려받는다";
}

/* ── 무기상점 — 사기 · 되팔기 ───────────────────────────────── */
function WeaponShop({ h, send }) {
  const [tab, setTab] = useState("buy");
  const day = todayKey();
  const d = dealOf(h.lv, day);
  const dealLeft = Math.max(0, DEAL.perDay - usedToday(h.bag, "deal", day));
  return (
    <>
      <Tabs on={tab} set={setTab} tabs={[["buy", "무기 사기"], ["sell", "되팔기", h.bag.w.length]]} />
      {tab === "buy" ? (
        <>
          <Head sub={`${Math.round(DEAL.discount * 100)}% 할인 · 하루 ${DEAL.perDay}번 · 남은 ${dealLeft}번`}>오늘의 특가</Head>
          <WeaponItem w={d} price={<Price n={d.price} old={d.full} />}
            acts={[{ label: "특가 구매", main: true, why: whyDealBuy(h, d.key, day), onClick: () => send({ op: "deal", key: d.key }) }]} />
          <Head sub="코인으로 바로 삽니다 · 같은 무기는 한 자루만">무기</Head>
          {SPECIALS.map((sp) => {
            const w = { t: sp.t, r: specialTier(sp), g: sp.g, sp: sp.id };
            const have = h.bag.w.some((q) => q.sp === sp.id);
            return (
              <WeaponItem key={sp.id} w={w} dim={h.lv < sp.lv} tag={have ? "가지고 있음" : ""}
                price={<Price n={specialPrice(sp)} />}
                acts={have ? [] : [{ label: "구매", why: whySpecialBuy(h, sp.id), onClick: () => send({ op: "spbuy", id: sp.id }) }]} />
            );
          })}
        </>
      ) : (
        <>
          <Head sub={`산 값의 ${Math.round(WEAPON.sellRate * 100)}% · 가방 ${h.bag.w.length}/${WEAPON.bagMax}`}>되팔기</Head>
          {!h.bag.w.length && <Empty>가방에 무기가 없습니다.</Empty>}
          {h.bag.w.map((w) => (
            <WeaponItem key={w.u} w={w} tag={w.u === h.bag.e ? "장착 중" : ""} desc={`${weaponLine(w)} · 산 값 ${won(w.p)}`}
              price={<Price n={sellPrice(w)} />}
              acts={[{ label: "팔기", why: whyWeaponSell(h, w.u), onClick: () => send({ op: "wsell", u: w.u }) }]} />
          ))}
        </>
      )}
    </>
  );
}

/* ── 스킬 상점 — 계열마다 탭 ─────────────────────────────────── */
function SkillShop({ h, send }) {
  const [tab, setTab] = useState(SKILL_FAMS[0].id);
  const fam = FAM_BY_ID[tab];
  const sd = statDef(fam.stat);
  return (
    <>
      <Tabs on={tab} set={setTab} tabs={SKILL_FAMS.map((f) => [f.id, f.name])} />
      <Head sub={`지금 ${sd.name} ${sd.fmt(statValue(fam.stat, h.st[fam.stat]))} · 장비 · 버프 제외`}>{fam.name} 계열</Head>
      {SKILLS.filter((s) => s.fam === tab).map((s) => {
        const cur = h.bag.s[s.id] || 0;
        const nx = skillNext(h, s.id);
        const nsd = nx && statDef(nx.stat);
        return (
          <Item key={s.id}
            name={s.name}
            meta={<span className="shop-meta"><span>{s.kind === "active" ? "액티브" : "패시브"}</span><span>Lv {cur}/{s.gold.length}</span></span>}
            desc={
              <>
                {s.note}
                {s.bonus && ` · 레벨마다 ${statDef(s.bonus.stat).name} +${statDef(s.bonus.stat).fmt(s.bonus.per)}`}
                {s.use && ` · 숫자키 ${s.use.key} · ${s.use.cd}초마다`}
                {nx && <span className="shop-need">다음 Lv {nx.lv} — 레벨 {nx.needLv} · {nsd.name} {nsd.fmt(nx.need)}</span>}
              </>
            }
            price={nx ? <Price n={nx.gold} /> : <span className="shop-price done">최고 레벨</span>}
            acts={nx ? [{ label: cur ? "레벨업" : "배우기", why: whySkill(h, s.id), onClick: () => send({ op: "sbuy", id: s.id }) }] : []} />
        );
      })}
    </>
  );
}

/* ── 물약 상점 — 종류별로 묶는다 ─────────────────────────────── */
const POTION_GROUPS = [["heal", "회복 물약"], ["buff", "버프 물약"], ["reset", "스탯 초기화"]];
function PotionShop({ h, send }) {
  return (
    <>
      <p className="shop-note">마실 때 {pct(POTION.greatChance, 0)} 확률로 대성공이 터져 효과가 {POTION.greatMul}배가 됩니다. 초기화 물약에는 대성공이 없습니다. 산 물약은 가방(I)에서도 마실 수 있습니다.</p>
      {POTION_GROUPS.map(([kind, title]) => (
        <div key={kind}>
          <Head>{title}</Head>
          {POTIONS.filter((p) => p.kind === kind).map((p) => (
            <Item key={p.id} name={p.name}
              meta={<span className="shop-meta"><span>가진 수 {h.bag.p[p.id] || 0}</span></span>}
              desc={potionText(p)} price={<Price n={p.price} />}
              acts={[
                { label: "사기", why: whyPotionBuy(h, p.id), onClick: () => send({ op: "pbuy", id: p.id }) },
                { label: "마시기", quiet: true, why: whyPotionUse(h, p.id), onClick: () => send({ op: "puse", id: p.id }) },
              ]} />
          ))}
        </div>
      ))}
    </>
  );
}

/* ── 도박장 — 게임마다 탭 ────────────────────────────────────── */
function BetInput({ value, onChange }) {
  return (
    <label className="shop-bet">
      <span>걸 코인</span>
      <input type="number" inputMode="numeric" min={CASINO.minBet} max={CASINO.maxBet} step={10} value={value}
        onChange={(e) => onChange(Math.floor(Number(e.target.value) || 0))} />
      <small>{won(CASINO.minBet)}~{won(CASINO.maxBet)}</small>
    </label>
  );
}
function Odds({ rows }) {
  return (
    <table className="shop-odds">
      <tbody>{rows.map(([a, b, c]) => <tr key={a}><td>{a}</td>{c !== undefined && <td>{c}</td>}<td>{b}</td></tr>)}</tbody>
    </table>
  );
}
function Casino({ h, send }) {
  const [tab, setTab] = useState("box");
  const [bet, setBet] = useState(100);
  const day = todayKey();
  const ev = casinoEv(h.lv);
  const left = (k) => Math.max(0, CASINO.daily[k] - usedToday(h.bag, k, day));
  const gsum = BOX.grades.reduce((a, b) => a + b, 0);
  const psum = Object.values(BOX.potions).reduce((a, b) => a + b, 0);
  const share = boxShares(h.lv);
  const own = specialsFor(h.lv);
  const ssum = SLOT.reduce((a, s) => a + s.w, 0);
  const tabs = [["box", "랜덤 상자", `${left("box")}/${CASINO.daily.box}`], ["dice", "주사위 홀짝", `${left("dice")}/${CASINO.daily.dice}`],
    ["slot", "슬롯머신", `${left("slot")}/${CASINO.daily.slot}`]];
  return (
    <>
      <Tabs on={tab} set={setTab} tabs={tabs} />
      <p className="shop-note">탭 옆 숫자는 오늘 남은 횟수입니다. 한국 날짜 자정에 다시 찹니다.</p>
      {tab === "box" && (
        <>
          <Item name="랜덤 상자" meta={<span className="shop-meta"><span>기댓값 {pct(ev.box, 0)}</span></span>}
            desc={`내 레벨 단계(Lv ${WEAPON_TIERS[tierOf(h.lv)]})의 무기 또는 물약이 나옵니다.${own.length ? ` 특별 무기는 낄 수 있는 ${own.length}종 가운데 하나입니다.` : ""}`}
            price={<Price n={boxPrice(h.lv)} />}
            acts={[{ label: "열기", main: true, why: whyGamble(h, "box", 0, day), onClick: () => send({ op: "box" }) }]} />
          <Head sub="상점가 기준 기댓값">나오는 확률</Head>
          <Odds rows={[
            ...(share.special > 0 ? [["특별 무기", pct(share.special)]] : []),
            ...GRADES.map((gd) => [`${gd.name} 무기`, pct(share.weapon * (BOX.grades[gd.id] / gsum))]),
            ...Object.entries(BOX.potions).map(([id, w]) => [POTION_BY_ID[id].name, pct(share.potion * (w / psum))]),
          ]} />
        </>
      )}
      {tab === "dice" && (
        <>
          <Item name="주사위 홀짝" meta={<span className="shop-meta"><span>기댓값 {pct(ev.dice, 0)}</span></span>}
            desc={`맞히면 건 코인의 ${DICE.pay}배. ${pct(DICE.house, 0)} 확률로 주사위가 모서리에 서면 집이 가져갑니다. 맞힐 확률은 ${pct((1 - DICE.house) * 0.5, 0)}입니다.`} />
          <div className="shop-play">
            <BetInput value={bet} onChange={setBet} />
            <div className="shop-btns">
              <button type="button" className="shop-btn main" disabled={whyGamble(h, "dice", bet, day).length > 0}
                onClick={() => send({ op: "dice", bet, pick: "odd" })}>홀</button>
              <button type="button" className="shop-btn main" disabled={whyGamble(h, "dice", bet, day).length > 0}
                onClick={() => send({ op: "dice", bet, pick: "even" })}>짝</button>
            </div>
          </div>
          {whyGamble(h, "dice", bet, day).length > 0 && <p className="shop-why solo">{whyGamble(h, "dice", bet, day).join(" · ")}</p>}
        </>
      )}
      {tab === "slot" && (
        <>
          <Item name="슬롯머신" meta={<span className="shop-meta"><span>기댓값 {pct(ev.slot, 0)}</span></span>}
            desc="세 칸이 같은 그림이면 건 코인에 배수를 곱해 줍니다." />
          <div className="shop-play">
            <BetInput value={bet} onChange={setBet} />
            <div className="shop-btns">
              <button type="button" className="shop-btn main" disabled={whyGamble(h, "slot", bet, day).length > 0}
                onClick={() => send({ op: "slot", bet })}>당기기</button>
            </div>
          </div>
          {whyGamble(h, "slot", bet, day).length > 0 && <p className="shop-why solo">{whyGamble(h, "slot", bet, day).join(" · ")}</p>}
          <Head>배수와 확률</Head>
          <Odds rows={SLOT.map((s) => [`${s.name} 3개`, pct(Math.pow(s.w / ssum, 3), 3), `${s.mul}배`])} />
        </>
      )}
    </>
  );
}

/* ── 무기 강화소 — 강화석을 골라 무기를 한 단계씩 올린다 · 보스 재료 팔기 ───────── */
function Forge({ h, send }) {
  const [tab, setTab] = useState("enh");
  const [stone, setStone] = useState(() => STONE_IDS.find((id) => matCount(h.bag, id) > 0) || STONE_IDS[0]);
  const sellable = MATERIALS.filter((m) => m.sell > 0);
  const st = MAT_BY_ID[stone];
  const rates = ENHANCE.stones[stone];
  return (
    <>
      <Tabs on={tab} set={setTab} tabs={[["enh", "무기 강화"], ["sell", "재료 팔기", sellable.reduce((n, m) => n + matCount(h.bag, m.id), 0)]]} />
      {tab === "enh" ? (
        <>
          <p className="shop-note">
            강화석 하나와 코인을 내고 한 단계씩 올립니다. 실패해도 단계는 내려가지 않고 강화석과 코인만 사라집니다.
            한 단계마다 무기가 올려 주는 스탯이 {pct(ENHANCE.per, 0)}씩 늘어납니다. 강화석은 보스가 떨굽니다.
          </p>
          <div className="shop-stones" role="radiogroup" aria-label="강화석">
            {STONE_IDS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={stone === id} className={`shop-stone ${stone === id ? "on" : ""}`}
                onClick={() => setStone(id)}>
                <i style={{ background: MAT_BY_ID[id].color }} />
                <b>{MAT_BY_ID[id].name}</b>
                <small>× {matCount(h.bag, id)} · +{ENHANCE.stones[id].length} 까지</small>
              </button>
            ))}
          </div>
          <Head sub={`${st.name} · ${st.note}`}>무기</Head>
          {!h.bag.w.length && <Empty>가방에 무기가 없습니다. 무기상점에서 살 수 있습니다.</Empty>}
          {h.bag.w.map((w) => {
            const next = (w.up || 0) + 1;
            const rate = enhRate(stone, next);
            const top = next > ENHANCE.max;
            const after = { ...w, up: next };
            const sd = statDef(weaponStat(w));
            return (
              <WeaponItem key={w.u} w={w} tag={w.u === h.bag.e ? "장착 중" : ""}
                desc={top ? `${weaponLine(w)} · 최고 단계` : `${weaponLine(w)} → +${sd.fmt(itemBonus(after))} (+${next} 강화)`}
                price={top ? <span className="shop-price done">+{ENHANCE.max}</span>
                  : <span className="shop-enh"><em>{rate ? `${rate}%` : "—"}</em><Price n={enhFee(w)} /></span>}
                acts={top ? [] : [{ label: "강화", main: true, why: whyEnhance(h, w.u, stone), onClick: () => send({ op: "enh", u: w.u, stone }) }]} />
            );
          })}
          <Head sub="올릴 단계마다의 성공 확률">{st.name} 확률표</Head>
          <Odds rows={rates.map((r, i) => [`+${i + 1}`, `${r}%`, `${(ENHANCE.fee * (i + 1)).toLocaleString("ko-KR")}코인`])} />
        </>
      ) : (
        <>
          <Head sub="강화석은 팔 수 없습니다">재료 팔기</Head>
          {sellable.map((m) => {
            const have = matCount(h.bag, m.id);
            return (
              <Item key={m.id} name={<><i className="shop-mat" style={{ background: m.color }} />{m.name}</>} dim={!have}
                meta={<span className="shop-meta"><span>× {have}</span></span>} desc={m.note}
                price={<Price n={m.sell} />}
                acts={[
                  { label: "1개", quiet: true, why: whyMatSell(h, m.id, 1), onClick: () => send({ op: "msell", id: m.id, n: 1 }) },
                  { label: "모두", quiet: true, why: whyMatSell(h, m.id, Math.max(1, have)), onClick: () => send({ op: "msell", id: m.id, n: have }) },
                ]} />
            );
          })}
        </>
      )}
    </>
  );
}

const BODIES = { weapon: WeaponShop, skill: SkillShop, potion: PotionShop, casino: Casino, forge: Forge };

// 창의 틀 — 머리(이름 · 한 줄 · 코인 · 닫기) · 결과 한 줄 · 내용
function Frame({ title, sub, coins, admin, note, onClose, children }) {
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <div className="shop" role="dialog" aria-label={title}>
        <div className="shop-top">
          <div className="shop-title">
            <b>{title}</b>
            {sub && <span>{sub}</span>}
          </div>
          <span className="shop-coins"><Coin />{admin ? "무제한" : won(coins)}</span>
          <button type="button" className="shop-x" aria-label="닫기" onClick={onClose}>×</button>
        </div>
        {note && <p className={`shop-result ${note.ok ? "ok" : "no"}`} key={note.at}>{note.msg}</p>}
        <div className="shop-body">{children}</div>
      </div>
    </>
  );
}

export function ShopPanel({ shop, h, send, note, onClose }) {
  const s = SHOP_BY_ID[shop] || SHOPS[0];
  const Body = BODIES[s.id];
  return (
    <Frame title={s.name} sub={`${s.keeper} · ${s.line}`} coins={h.coins} admin={h.admin} note={note} onClose={onClose}>
      <Body h={h} send={send} />
    </Frame>
  );
}

/* ── 가방 — 어디서나 연다. 능력치 · 무기 장착 · 물약 마시기 · 배운 스킬 ── */
export function BagPanel({ h, send, note, onClose }) {
  const [tab, setTab] = useState("stat");
  const w = equipped(h.bag);
  const potions = POTIONS.filter((p) => h.bag.p[p.id] > 0);
  const skills = SKILLS.filter((s) => h.bag.s[s.id] > 0);
  const mats = MATERIALS.filter((m) => matCount(h.bag, m.id) > 0);
  return (
    <Frame title="가방" sub="장비 · 스킬 · 버프로 오른 몫은 + 로 따로 보입니다." coins={h.coins} admin={h.admin} note={note} onClose={onClose}>
      <Tabs on={tab} set={setTab} tabs={[["stat", "능력치"], ["weapon", "무기", h.bag.w.length], ["potion", "물약", potions.length], ["mat", "재료", mats.length], ["skill", "스킬", skills.length]]} />
      {tab === "stat" && (
        <div className="shop-stats">
          {STATS.map((t) => {
            const base = statValue(t.id, h.st[t.id]);
            const add = extraStat(h, t.id);
            const buff = h.bf && h.bf[t.id];
            return (
              <div key={t.id} className="shop-stat">
                <span>{t.name}{buff && <small>버프 {Math.ceil(buff.t)}초</small>}</span>
                <b>{t.fmt(base + add)}</b>
                <em>{add > 0 ? `${t.fmt(base)} + ${t.fmt(add)}` : ""}</em>
              </div>
            );
          })}
        </div>
      )}
      {tab === "weapon" && (
        <>
          <Head sub={`${h.bag.w.length}/${WEAPON.bagMax} · 하나만 낍니다`}>{w ? `장착 — ${weaponName(w)}` : "장착한 무기 없음"}</Head>
          {!h.bag.w.length && <Empty>무기상점에서 살 수 있습니다.</Empty>}
          {h.bag.w.map((q) => (
            <WeaponItem key={q.u} w={q} tag={q.u === h.bag.e ? "장착 중" : ""}
              acts={[q.u === h.bag.e
                ? { label: "해제", why: whyEquip(h, 0), onClick: () => send({ op: "equip", u: 0 }) }
                : { label: "장착", main: true, why: whyEquip(h, q.u), onClick: () => send({ op: "equip", u: q.u }) }]} />
          ))}
        </>
      )}
      {tab === "potion" && (
        <>
          {!potions.length && <Empty>물약 상점에서 살 수 있습니다.</Empty>}
          {potions.map((p) => (
            <Item key={p.id} name={p.name} meta={<span className="shop-meta"><span>× {h.bag.p[p.id]}</span></span>} desc={potionText(p)}
              acts={[{ label: "마시기", why: whyPotionUse(h, p.id), onClick: () => send({ op: "puse", id: p.id }) }]} />
          ))}
        </>
      )}
      {tab === "mat" && (
        <>
          {!mats.length && <Empty>보스를 잡으면 재료를 얻습니다. 강화석은 무기 강화소에서, 다른 재료는 광장 의뢰나 강화소에서 씁니다.</Empty>}
          {mats.map((m) => (
            <Item key={m.id} name={<><i className="shop-mat" style={{ background: m.color }} />{m.name}</>}
              meta={<span className="shop-meta"><span>× {matCount(h.bag, m.id)}</span>{m.stone && <span>강화석</span>}</span>} desc={m.note} />
          ))}
        </>
      )}
      {tab === "skill" && (
        <>
          {!skills.length && <Empty>스킬 상점에서 배울 수 있습니다.</Empty>}
          {skills.map((s) => (
            <Item key={s.id} name={s.name}
              meta={<span className="shop-meta"><span>{FAM_BY_ID[s.fam].name}</span><span>{s.kind === "active" ? "액티브" : "패시브"}</span><span>Lv {h.bag.s[s.id]}/{SKILL_BY_ID[s.id].gold.length}</span></span>}
              desc={s.note} />
          ))}
        </>
      )}
    </Frame>
  );
}


