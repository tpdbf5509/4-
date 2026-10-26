import EquipmentArt from "./EquipmentArt.jsx";
import { WORLD_SETS, WORLD_SET_BY_ID } from "./game/worldEquipmentData.js";
import { worldSetCount } from "./game/armor.js";
/* ── RPG 광장 상점 창 · 가방 창 ──────────────────────────────
   상점마다 탭으로 나눈다. 한 줄은 [그림] [이름 · 등급 · 설명] [값 · 버튼] 이고, 막힌 이유는 그 줄 아래에 한 줄로 적는다.
   버튼을 누르면 send({ op, ... }) 로 방장에게 보내고, 결과는 note 로 돌아와 창 위쪽에 한 줄로 뜬다.
   막힌 이유는 방장과 같은 조건 함수(why*)로 미리 보여 준다. */
import { useEffect, useRef, useState } from "react";
import sfx from "./game/sfx.js";
import { STATS, statValue, MAPS, JOB_BY_ID } from "./game/rpg.js";
import { WEAPON_SKILLS } from "./game/skillData.js";
import {
  SHOPS, GRADES, WEAPON_TIERS, WEAPON, DEAL, SPECIALS, SKILL_FAMS, SKILLS, POTIONS, POTION,
  CASINO, BOX, DICE, SLOT, SCROLLS, WARP, GUARD, WEAPON_TYPES,
} from "./game/shopData.js";
import {
  SHOP_BY_ID, POTION_BY_ID, FAM_BY_ID, SKILL_BY_ID, todayKey, usedToday, tierOf, weaponName,
  weaponLine, weaponArt, specOf, specialTier, specialPrice, specialsFor, sellPrice, dealOf, equipped,
  skillNext, whyDealBuy, whySpecialBuy, whyWeaponSell, whyEquip, whySkill, whyPotionBuy, whyPotionUse,
  whyGamble, boxPrice, boxShares, casinoEv, whyEnhance, whyMatSell, enhFee, itemBonus, weaponStat, matCount, whyScrollBuy, whyWarp,
  whyGuardBuy, whyArmorWear, whyArmorSell, whyArmorGive,
} from "./game/shop.js";
import { MATERIALS, MAT_BY_ID, ENHANCE, STONE_IDS, enhRate, enhDown } from "./game/itemData.js";
import { ARMOR_SLOTS, ARMOR_GRADES, ARMOR_BASE, ARMOR_SPECIAL, armorName, armorArt, armorCap } from "./game/armorData.js";
import { wornArmor } from "./game/armor.js";
import { BOOKS, BOOK_BY_ID, PATCH_BOOKS } from "./game/bookData.js";
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
    <div className={`shop-item ${art ? "has-art" : ""} ${art?.includes("#world=") ? "world-equipment-item" : ""} ${dim ? "dim" : ""}`}>
      {art && <EquipmentArt className="shop-art" src={art} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />}
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
      desc={<>{desc || weaponLine(w)}{sp && WEAPON_SKILLS[sp.id] && <span className="shop-need">{weaponSkillLine(sp.id)}</span>}</>} />
  );
}
// 전설 무기 스킬 한 줄 — 패시브 · 스킬(X 키) · 원소 연계
function weaponSkillLine(id) {
  const W = WEAPON_SKILLS[id];
  return `${W.role} — 패시브 「${W.passive.name}」 ${W.passive.note} · 스킬 「${W.name}」 ${W.skill.note} · X 키 · ${W.skill.cd}초마다`
    + (W.dot ? ` · 화상 · 독 피해 +${Math.round(W.dot * 100)}%` : "")
    + (W.elem ? ` · ${W.elem.note}` : W.note ? ` · ${W.note}` : "");
}

/* ── 방어구 — 등급 표시 · 효과 글 ─────────────────────────────── */
const ARMOR_GRADE_CLS = ["g0", "g2", "g3", "g4"];      // 무기 등급 색을 빌려 쓴다 — 초급 회색 · 희귀 파랑 · 영웅 보라 · 전설 금빛
const pc = (v) => `${Math.round(v * 1000) / 10}%`;
function armorText(sl, g) {
  const b = ARMOR_BASE[sl][g];
  const base = { head: `최대 체력 +${pc(b)}`, body: `받는 피해 ${pc(b)} 감소`, legs: `공격력 +${pc(b)}`, feet: `이동 속도 +${pc(b)}` }[sl];
  const sp = ARMOR_SPECIAL[sl] && ARMOR_SPECIAL[sl][g];
  if (!sp) return base;
  const more = {
    head: () => `처치하면 체력 회복(일반 몹 ${pc(sp.mob)} · 보스 ${pc(sp.boss)})`,
    body: () => `체력 ${pc(sp.below)} 이하가 되면 ${sp.dur}초 동안 받는 피해 ${pc(sp.cut)} 감소(${sp.cd}초에 한 번)`
      + (sp.revive ? ` · 쓰러지면 한 번 체력 ${pc(sp.revive.hp)}로 일어나 ${sp.revive.inv}초 무적(${sp.revive.cd / 60}분에 한 번)` : ""),
    legs: () => `체력 ${pc(sp.below)} 이하에서 공격력 +${pc(sp.atk)}` + (sp.aspd ? ` · 공격 속도 +${pc(sp.aspd)}` : ""),
    feet: () => `몹을 맞히면 ${sp.per}초(최대 ${sp.max}초) 동안 그 몹 쪽으로 걸을 때 이동 속도 +${pc(sp.spd)}`
      + (sp.atk ? ` · 공격 속도 · 공격력 +${pc(sp.atk)}` : ""),
  }[sl]();
  return `${base} · ${more}`;
}
function ArmorItem({ a, n = 1, tag, price, acts, desc }) {
  return (
    <Item art={armorArt(a.s, a.g, a.set)} name={armorName(a.s, a.g, a.set)}
      meta={<span className="shop-meta"><span className={`shop-grade ${ARMOR_GRADE_CLS[a.g]}`}>{ARMOR_GRADES[a.g].name}</span>{n > 1 && <span>× {n}</span>}{tag && <span className="shop-tag">{tag}</span>}</span>}
      desc={desc || <>{armorText(a.s, a.g)}{a.set && <span className="shop-need">{WORLD_SET_BY_ID[a.set].name} 세트 · 2세트: {WORLD_SET_BY_ID[a.set].two} · 4세트: {WORLD_SET_BY_ID[a.set].four}</span>}</>} price={price} acts={acts} />
  );
}

// 같은 부위 · 같은 등급은 한 줄로 모아 개수로 보인다. wear 는 끼기 · 빼기에 쓸 것(낀 것이 있으면 그것), sell 은 팔 것(낀 것은 맨 나중)
function armorGroups(bag) {
  const groups = new Map();
  (bag.a || []).forEach((a) => {
    const k = `${a.s}:${a.g}:${a.set || ""}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(a);
  });
  return [...groups.values()].map((list) => {
    const worn = list.find((a) => wornArmor(bag, a.s) === a);
    return { n: list.length, worn, wear: worn || list[0], sell: list.find((a) => a !== worn) || worn };
  });
}

function potionText(p) {
  if (p.kind === "heal") return `최대 체력의 ${pct(p.pct, 0)} 회복`;
  if (p.kind === "buff") return `${p.dur}초 동안 ${statDef(p.stat).name} +${statDef(p.stat).fmt(p.amt)}`;
  if (p.kind === "speed") return `${p.dur >= 60 ? `${p.dur / 60}분` : `${p.dur}초`} 동안 이동 속도 +${Math.round(p.amt * 100)}%`;
  if (p.kind === "hide") return `${p.dur}초 동안 보스도 몹도 알아채지 못합니다 · 공격해도 풀리지 않습니다 · 결투장 · 던전에서는 못 마십니다`;
  return "찍은 스탯 포인트를 모두 돌려받는다";
}

/* ── 한 번 더 묻기 — "다시 묻지 않기"를 고르면 이 기기에서는 다시 묻지 않는다(localStorage) ─────── */
const ASK_OFF = { sell: "flg:askLegendSell", guard: "flg:askGuard" };
const FORGE_SKIP = "flg:forgeSkip";               // 강화 연출 건너뛰기 — 켜 두면 망치질 없이 결과만 짧게
const LEGEND_G = GRADES.length - 1;               // 전설 등급 — 되팔 때 한 번 더 묻는다
const readFlag = (k) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };
const writeFlag = (k, on) => { try { if (on) localStorage.setItem(k, "1"); else localStorage.removeItem(k); } catch { /* 저장 못 하면 이번만 */ } };
function Confirm({ title, text, ok, onOk, onCancel }) {
  const [never, setNever] = useState(false);
  return (
    <div className="shop-confirm" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="shop-confirm-box">
        <b className="shop-confirm-title">{title}</b>
        <p>{text}</p>
        <label className="shop-guard">
          <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} />
          <span>다시 묻지 않기</span>
        </label>
        <div className="shop-confirm-acts">
          <button type="button" className="shop-btn" onClick={onCancel}>취소</button>
          <button type="button" className="shop-btn main" onClick={() => onOk(never)}>{ok}</button>
        </div>
      </div>
    </div>
  );
}

/* ── 무기상점 — 사기 · 되팔기 ───────────────────────────────── */
function WeaponShop({ h, send }) {
  const [tab, setTab] = useState("buy");
  const [ask, setAsk] = useState(null);              // 되팔기 전에 한 번 더 묻는 전설 무기
  const sell = (w) => (w.g >= LEGEND_G && !readFlag(ASK_OFF.sell) ? setAsk(w) : send({ op: "wsell", u: w.u }));
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
          {SPECIALS.filter(sp => !sp.world && !sp.adv && !sp.hold).map((sp) => {
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
          <Head sub={`산 값의 ${Math.round(WEAPON.sellRate * 100)}% · 가방 ${h.bag.w.length}/${weaponCap(h)}`}>되팔기</Head>
          {!h.bag.w.length && <Empty>가방에 무기가 없습니다.</Empty>}
          {h.bag.w.map((w) => (
            <WeaponItem key={w.u} w={w} tag={w.u === h.bag.e ? "장착 중" : ""} desc={`${weaponLine(w)} · 산 값 ${won(w.p)}`}
              price={<Price n={sellPrice(w)} />}
              acts={[{ label: "팔기", why: whyWeaponSell(h, w.u), onClick: () => sell(w) }]} />
          ))}
          {ask && (
            <Confirm title="전설 무기를 팔까요?" ok="팔기"
              text={`${weaponName(ask)} · ${won(sellPrice(ask))}코인에 팝니다. 판 무기는 되돌릴 수 없습니다.`}
              onCancel={() => setAsk(null)}
              onOk={(never) => { if (never) writeFlag(ASK_OFF.sell, true); send({ op: "wsell", u: ask.u }); setAsk(null); }} />
          )}
          <Head sub={`등급마다 정한 값 · 가방 ${(h.bag.a || []).length}/${armorCap(h)}`}>방어구 되팔기</Head>
          {!(h.bag.a || []).length && <Empty>가방에 방어구가 없습니다.</Empty>}
          {armorGroups(h.bag).map(({ n, worn, sell: a }) => (
            <ArmorItem key={a.u} a={a} n={n} tag={worn ? "착용 중" : ""} price={<Price n={ARMOR_GRADES[a.g].sell} />}
              acts={[{ label: "팔기", why: whyArmorSell(h, a.u), onClick: () => send({ op: "asell", u: a.u }) }]} />
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
  const sd = statDef(tab === "job" ? (h.job === "mage" ? "int" : "str") : fam.stat);   // 직업 스킬은 그 직업의 공격 스탯을 본다
  return (
    <>
      <Tabs on={tab} set={setTab} tabs={SKILL_FAMS.map((f) => [f.id, f.name])} />
      <Head sub={`지금 ${sd.name} ${sd.fmt(statValue(sd.id, h.st[sd.id]))} · 장비 · 버프 제외`}>{tab === "job" ? `${(JOB_BY_ID[h.job] || {}).name || ""} 직업 스킬` : `${fam.name} 계열`}</Head>
      {SKILLS.filter((s) => s.fam === tab && (!s.job || s.job === h.job)).map((s) => {
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
                {s.use && ` · ${s.job ? "직업 칸(R)" : "일반 칸(1 · 2)"}에 넣어 씁니다 · ${s.use.cd}초마다`}
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
const POTION_GROUPS = [["heal", "회복 물약"], ["buff", "버프 물약"], ["speed", "이속 물약"], ["hide", "투명화 물약"], ["reset", "스탯 초기화"]];
function PotionShop({ h, send }) {
  return (
    <>
      <p className="shop-note">회복 · 버프 물약은 마실 때 {pct(POTION.greatChance, 0)} 확률로 대성공이 터져 효과가 {POTION.greatMul}배가 됩니다. 산 물약은 가방(I)에서도 마실 수 있습니다.</p>
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

/* ── 무기 강화소 — 장착한 무기를 강화석으로 한 단계씩 올린다 · 보스 재료 팔기 ─────────
   강화 연출: 무기는 마법진 위에 떠 있다. 누르면 FORGE.strike 초 동안 망치질(마법진이 빨리 돌고 · 불꽃 · 떨림)을 보여 주고, 방장 결과(note.enh)가 오면
   성공(금빛 고리) · 실패(회색 연기) · 하락(붉은 금) 을 FORGE.show 초 띄운다. 결과는 방장이 정한다 — 연출은 기다릴 뿐 */
const FORGE = { strike: 1.2, show: 1.6, hits: 3 };
// 마법진 — 무기가 그 위에 떠 있다. 바깥 고리 · 룬 점 · 육망성 · 안쪽 고리. 색은 무기 등급(--fg), 비스듬히 눕혀 그린다(style.css .forge-circle)
const RUNES = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);
const star = (r, k) => Array.from({ length: 3 }, (_, i) => {
  const a = k + (i / 3) * Math.PI * 2 - Math.PI / 2;
  return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
}).join(" ");
function MagicCircle() {
  return (
    <svg className="forge-circle" viewBox="0 0 100 100" aria-hidden="true">
      <g className="forge-circle-spin">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 2.6" />
        {RUNES.map((a, i) => (
          <rect key={i} x={50 + Math.cos(a) * 43.5 - 1.1} y={50 + Math.sin(a) * 43.5 - 1.1} width="2.2" height="2.2"
            transform={`rotate(${(a * 180) / Math.PI + 45} ${50 + Math.cos(a) * 43.5} ${50 + Math.sin(a) * 43.5})`} fill="currentColor" />
        ))}
        <polygon points={star(36, 0)} fill="none" stroke="currentColor" strokeWidth="0.8" />
        <polygon points={star(36, Math.PI)} fill="none" stroke="currentColor" strokeWidth="0.8" />
      </g>
      <g className="forge-circle-back">
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.9" />
        <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1.6" />
      </g>
    </svg>
  );
}
const FORGE_RES = { 1: ["ok", "강화 성공"], 0: ["keep", "강화 실패"], [-1]: ["down", "단계 하락"], 2: ["guard", "하락 방지 성공"] };
const FORGE_SKIP_SHOW = 0.9;                          // 연출을 건너뛸 때 결과를 띄우는 초
function Forge({ h, send, note, setQuiet }) {
  const [tab, setTab] = useState("enh");
  const [stone, setStone] = useState(() => STONE_IDS.find((id) => matCount(h.bag, id) > 0) || STONE_IDS[0]);
  const [guard, setGuard] = useState(false);          // 하락 방지권 쓰기 — 떨어질 때만 한 장 쓴다
  const [stage, setStage] = useState({ phase: "idle" });   // idle · forge(망치질) · done(결과)
  const sent = useRef(null);                          // 누를 때의 note — 이것과 다른 note 가 오면 그게 결과다
  const timers = useRef([]);
  const runs = useRef(0);                             // 연출 차례 — 바뀔 때마다 처음부터 다시 그린다
  const startAt = useRef(0);
  const [frozen, setFrozen] = useState(null);         // 망치질 동안 보일 무기 — 결과가 미리 보이지 않게 누른 때 그대로
  const [pick, setPick] = useState(false);            // 모루 위 무기를 누르면 가방 무기 가운데 골라 바꿔 낀다
  const [skip, setSkip] = useState(() => readFlag(FORGE_SKIP));   // 강화 연출 건너뛰기
  const [askGuard, setAskGuard] = useState(false);    // 방지권 없이 누르면 한 번 더 묻는다
  const later = (fn, s) => { timers.current.push(setTimeout(fn, s * 1000)); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); if (setQuiet) setQuiet(false); }, [setQuiet]);
  // 결과가 오면 — 망치질을 다 보여 준 뒤 결과를 띄운다
  useEffect(() => {
    if (stage.phase !== "forge" || !sent.current || note === sent.current.note || !note) return;
    const res = note.enh !== undefined && FORGE_RES[note.enh];
    sent.current = null;
    if (!res) { later(() => { setStage({ phase: "idle" }); setFrozen(null); if (setQuiet) setQuiet(false); }, 0); return; }   // 막혔다 — 이유는 창 위 한 줄에 뜬다
    const wait = skip ? 0 : Math.max(0, FORGE.strike - (performance.now() - startAt.current) / 1000);
    const msg = note.msg;
    later(() => { setStage({ phase: "done", kind: res[0], title: res[1], msg, key: ++runs.current }); setFrozen(null); if (setQuiet) setQuiet(false); }, wait);
    later(() => setStage({ phase: "idle" }), wait + (skip ? FORGE_SKIP_SHOW : FORGE.show));
  }, [note, stage, setQuiet, skip]);
  const guards = h.bag.gd || 0;
  const sellable = MATERIALS.filter((m) => m.sell > 0);
  const st = MAT_BY_ID[stone];
  const rates = ENHANCE.stones[stone];
  const busy = stage.phase !== "idle";
  const w = (stage.phase === "forge" && frozen) || equipped(h.bag);
  const next = w ? (w.up || 0) + 1 : 0;
  const useGuard = guard && guards > 0;
  const go = () => {
    if (!w || busy) return;
    sent.current = { note };
    startAt.current = performance.now();
    setFrozen({ ...w });
    if (setQuiet) setQuiet(true);
    setStage({ phase: "forge", key: ++runs.current });
    if (!skip) for (let i = 0; i < FORGE.hits; i++) later(() => sfx.shot("blade"), (i + 0.6) * (FORGE.strike / (FORGE.hits + 0.4)));
    send({ op: "enh", u: w.u, stone, guard: useGuard });
  };
  // 떨어질 수 있는 단계인데 방지권을 쓰지 않으면 한 번 더 묻는다
  const forge = () => (!useGuard && enhDown(next) > 0 && !readFlag(ASK_OFF.guard) ? setAskGuard(true) : go());
  const top = w && next > ENHANCE.max;
  const rate = w ? enhRate(stone, next) : 0;
  const why = w ? whyEnhance(h, w.u, stone) : [];
  return (
    <>
      <Tabs on={tab} set={setTab} tabs={[["enh", "무기 강화"], ["sell", "재료 팔기", sellable.reduce((n, m) => n + matCount(h.bag, m.id), 0)]]} />
      {tab === "enh" ? (
        <>
          <p className="shop-note">
            장착한 무기만 강화합니다. 강화석 하나와 코인을 내고 한 단계씩 올립니다. 실패하면 강화석과 코인이 사라지고,
            +{ENHANCE.down[0].from} 부터는 한 단계 떨어질 수 있습니다. 한 단계마다 무기 스탯이 {pct(ENHANCE.per, 0)}씩 늘어납니다.
          </p>
          {(pick || !w) && (
            <div className="forge-pick" role="listbox" aria-label="강화할 무기 고르기">
              <Head sub="고르면 그 무기를 장착합니다">{w ? "강화할 무기 바꾸기" : "강화할 무기를 고르세요"}</Head>
              {!h.bag.w.length && <Empty>가방에 무기가 없습니다. 무기상점에서 살 수 있습니다.</Empty>}
              {h.bag.w.map((q) => {
                const on = q.u === h.bag.e;
                const no = on ? [] : whyEquip(h, q.u);
                return (
                  <button key={q.u} type="button" role="option" aria-selected={on} className={`forge-opt ${on ? "on" : ""}`}
                    disabled={no.length > 0} title={no.join(" · ")}
                    onClick={() => { if (!on) send({ op: "equip", u: q.u }); setPick(false); }}>
                    {weaponArt(q) ? <EquipmentArt src={weaponArt(q)} /> : <span className="forge-opt-blade" />}
                    <span className="forge-opt-name"><b>{weaponName(q)}</b><small><Grade g={q.g} /> · {weaponLine(q)}{no.length ? ` · ${no[0]}` : ""}</small></span>
                    <em>{on ? "장착 중" : "고르기"}</em>
                  </button>
                );
              })}
            </div>
          )}
          {w && (
            <div className={`forge forge-${stage.phase} ${stage.kind ? `forge-${stage.kind}` : ""} ${skip ? "forge-quick" : ""} fg${w.g}`} key={stage.key || 0}>
              <button type="button" className="forge-stage" disabled={busy} aria-label="강화할 무기 바꾸기"
                title="눌러서 강화할 무기를 바꿉니다" onClick={() => setPick((v) => !v)}>
                <MagicCircle />
                <span className="forge-glow" />
                {weaponArt(w) ? <EquipmentArt className="forge-art" src={weaponArt(w)} /> : <span className="forge-blade" />}
                {stage.phase === "forge" && !skip && Array.from({ length: FORGE.hits }, (_, i) => (
                  <span key={i} className="forge-hit" style={{ animationDelay: `${(i + 0.6) * (FORGE.strike / (FORGE.hits + 0.4))}s` }}>
                    {Array.from({ length: 8 }, (_, k) => <i key={k} style={{ "--a": `${k * 45 + i * 20}deg` }} />)}
                  </span>
                ))}
                {stage.phase === "done" && <span className="forge-burst" />}
                {stage.phase === "done" && <b className="forge-title">{stage.title}</b>}
                {!busy && <span className="forge-swap">{pick ? "닫기" : "무기 바꾸기"}</span>}
              </button>
              <div className="forge-info">
                <div className="shop-name">{weaponName(w)}<span className="shop-meta"><Grade g={w.g} /><span className="shop-tag">장착 중</span></span></div>
                <div className="shop-desc">{top ? `${weaponLine(w)} · 최고 단계` : `${weaponLine(w)} → +${statDef(weaponStat(w)).fmt(itemBonus({ ...w, up: next }))} (+${next})`}</div>
                {!top && <div className="forge-odds">
                  <span>성공 <b>{rate ? `${rate}%` : "—"}</b></span>
                  {enhDown(next) > 0 && <span>실패 때 하락 <b>{enhDown(next)}%</b></span>}
                  <span>비용 <Price n={enhFee(w)} /></span>
                </div>}
                {/* 결과 · 막힌 이유는 늘 같은 자리 한 칸 — 생겼다 사라지며 높이가 바뀌지 않게 */}
                <p className={`forge-msg ${stage.phase === "done" ? stage.kind : why.length && !busy ? "why" : ""}`}>
                  {stage.phase === "done" ? stage.msg : why.length && !busy ? why.join(" · ") : ""}
                </p>
                <button type="button" className="shop-btn main forge-btn" disabled={busy || top || why.length > 0} onClick={forge}>
                  {stage.phase === "forge" ? "강화하는 중…" : top ? `+${ENHANCE.max} 최고 단계` : `+${next} 강화`}
                </button>
              </div>
            </div>
          )}
          <div className="shop-stones" role="radiogroup" aria-label="강화석">
            {STONE_IDS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={stone === id} className={`shop-stone ${stone === id ? "on" : ""}`}
                disabled={busy} onClick={() => setStone(id)}>
                <i style={{ background: MAT_BY_ID[id].color }} />
                <b>{MAT_BY_ID[id].name}</b>
                <small>× {matCount(h.bag, id)} · +{ENHANCE.stones[id].length} 까지</small>
              </button>
            ))}
          </div>
          <label className="shop-guard">
            <input type="checkbox" checked={guard && guards > 0} disabled={!guards || busy} onChange={(e) => setGuard(e.target.checked)} />
            <span>{GUARD.name} 쓰기 <small>가진 {guards}장 · 떨어질 때만 한 장 씁니다{guards ? "" : " · 주문서 상점에서 삽니다"}</small></span>
          </label>
          <label className="shop-guard">
            <input type="checkbox" checked={skip} disabled={busy} onChange={(e) => { setSkip(e.target.checked); writeFlag(FORGE_SKIP, e.target.checked); }} />
            <span>강화 모션 건너뛰기 <small>망치질 없이 결과만 바로 봅니다</small></span>
          </label>
          {askGuard && (
            <Confirm title="하락 방지권 없이 강화할까요?" ok="그대로 강화"
              text={`${GUARD.name}을 사용하지 않으면 무기 강화가 하락할 수도 있습니다. (+${next} 실패 때 하락 ${enhDown(next)}%)`}
              onCancel={() => setAskGuard(false)}
              onOk={(never) => { if (never) writeFlag(ASK_OFF.guard, true); setAskGuard(false); go(); }} />
          )}
          <Head sub={`단계 · 비용 · 실패할 때 하락 · 성공`}>{st.name} 확률표</Head>
          <Odds rows={rates.map((r, i) => [`+${i + 1} · ${(ENHANCE.fee * (i + 1)).toLocaleString("ko-KR")}코인`, `${r}%`,
            enhDown(i + 1) ? `하락 ${enhDown(i + 1)}%` : "하락 없음"])} />
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

/* ── 주문서 상점 — 지역 워프권 ─────────────────────────────── */
// 지역의 레벨 — 그 지역으로 가는 문 이름("늑대 사냥터 · 10~20레벨")에서 읽는다
const warpHint = (id) => {
  const gate = Object.values(MAPS).flatMap((M) => M.gates).find((q) => q.to === id && q.label.includes("레벨"));
  return gate ? gate.label.split(" · ")[1] : id === "plaza" ? "상점 · 의뢰 · 명예 순위" : "1~5레벨";
};
function ScrollShop({ h, send }) {
  return (
    <>
      <p className="shop-note">지역 워프권을 쓰면 고른 지역의 입구로 바로 옮겨 갑니다. 한 번에 1회씩 줄어듭니다. 가방(I)의 "주문서" 탭에서 씁니다.</p>
      <Head sub={`가진 워프권 ${h.bag.wp || 0}회`}>지역 워프권</Head>
      {SCROLLS.map((sc) => (
        <Item key={sc.id} name={sc.name}
          meta={<span className="shop-meta"><span>1회 {won(sc.price / sc.n)}코인</span></span>}
          desc={`${sc.n}번 쓸 수 있습니다`} price={<Price n={sc.price} />}
          acts={[{ label: "사기", why: whyScrollBuy(h, sc.id), onClick: () => send({ op: "scbuy", id: sc.id }) }]} />
      ))}
      <Head sub={`가진 방지권 ${h.bag.gd || 0}장`}>{GUARD.name}</Head>
      <Item name={GUARD.name}
        desc="무기 강화에 실패해 단계가 떨어질 때 한 장을 써서 막습니다. 강화소에서 켜 둔 때만 씁니다."
        price={<Price n={GUARD.price} />}
        acts={[{ label: "사기", why: whyGuardBuy(h), onClick: () => send({ op: "gdbuy" }) }]} />
    </>
  );
}

const BODIES = { scroll: ScrollShop, weapon: WeaponShop, skill: SkillShop, potion: PotionShop, casino: Casino, forge: Forge };

// 창의 틀 — 머리(이름 · 한 줄 · 코인 · 닫기) · 결과 한 줄 · 내용
function Frame({ title, sub, coins, admin, note, quiet, onClose, children }) {
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
        {/* 강화 망치질 중(quiet)에는 글만 숨기고 자리는 남긴다 — 줄이 사라졌다 나타나며 창이 위아래로 흔들리지 않게 */}
        {note && <p className={`shop-result ${note.ok ? "ok" : "no"} ${quiet ? "hold" : ""}`} key={quiet ? "hold" : note.at}>{note.msg}</p>}
        <div className="shop-body">{children}</div>
      </div>
    </>
  );
}

export function ShopPanel({ shop, h, send, note, onClose }) {
  const s = SHOP_BY_ID[shop] || SHOPS[0];
  const Body = BODIES[s.id];
  const [quiet, setQuiet] = useState(false);          // 강화 망치질 중에는 결과 줄을 숨긴다(연출이 끝날 때 보인다)
  return (
    <Frame title={s.name} sub={`${s.keeper} · ${s.line}`} coins={h.coins} admin={h.admin} note={note} quiet={quiet} onClose={onClose}>
      <Body h={h} send={send} note={note} setQuiet={setQuiet} />
    </Frame>
  );
}

/* ── 책 — 패치노트와 가이드(bookData.js). 책장에서 한 권을 고르면 쪽을 넘기며 읽는다 ── */
function Books({ tab0 }) {
  const [id, setId] = useState(tab0 === "book" ? PATCH_BOOKS[0].id : "");   // 가방을 "책"으로 바로 열면 가장 새 패치노트
  const [pg, setPg] = useState(0);
  const book = BOOK_BY_ID[id];
  if (!book) {
    const row = (b) => (
      <div key={b.id} className="book-row" style={{ "--bk": b.color }}>
        <i className="book-spine" />
        <div className="book-main"><b>{b.title}</b><span>{b.sub} · {b.pages.length}쪽</span></div>
        <button type="button" className="shop-btn" onClick={() => { setId(b.id); setPg(0); }}>읽기</button>
      </div>
    );
    return (
      <>
        <Head sub="늘 가지고 있는 책입니다 · 가방 칸을 차지하지 않습니다">패치노트</Head>
        {BOOKS.filter((b) => PATCH_BOOKS.includes(b)).map(row)}
        <Head sub="게임의 모든 안내">가이드</Head>
        {BOOKS.filter((b) => !PATCH_BOOKS.includes(b)).map(row)}
      </>
    );
  }
  const page = book.pages[Math.min(pg, book.pages.length - 1)];
  return (
    <div className="book" style={{ "--bk": book.color }}>
      <div className="book-top">
        <button type="button" className="shop-btn" onClick={() => setId("")}>책장</button>
        <b>{book.title}</b>
      </div>
      <div className="book-page">
        <h4>{page.h}</h4>
        {page.p.map((t, i) => <p key={i}>{t}</p>)}
      </div>
      <div className="book-nav">
        <button type="button" className="shop-btn" disabled={pg <= 0} onClick={() => setPg(pg - 1)}>이전</button>
        <span>{Math.min(pg, book.pages.length - 1) + 1} / {book.pages.length}</span>
        <button type="button" className="shop-btn" disabled={pg >= book.pages.length - 1} onClick={() => setPg(pg + 1)}>다음</button>
      </div>
    </div>
  );
}

/* ── 가방 — 어디서나 연다. 능력치 · 무기 장착 · 물약 마시기 · 배운 스킬 ── */
export function BagPanel({ h, send, note, onClose, tab0 = "weapon" }) {
  const [wtab, setWtab] = useState("all");            // 무기 탭 안의 종류 탭
  const [tab, setTab] = useState(tab0 === "stat" ? "weapon" : tab0);   // 능력치 탭은 뺐다(스탯 창에서 본다) · "book" 으로 열면 책 탭
  const qs = h.bag.qs || [];
  const w = equipped(h.bag);
  const potions = POTIONS.filter((p) => h.bag.p[p.id] > 0);
  const skills = SKILLS.filter((s) => h.bag.s[s.id] > 0);
  const mats = MATERIALS.filter((m) => matCount(h.bag, m.id) > 0);
  // 무기 종류별 탭 — 가방에 있는 종류만 보인다
  const weaponTabs = [["all", "전체", h.bag.w.length], ...WEAPON_TYPES.filter((t) => h.bag.w.some((q) => q.t === t.id)).map((t) => [t.id, t.name, h.bag.w.filter((q) => q.t === t.id).length])];
  return (
    <Frame title="가방" sub="무기 · 방어구 · 물약 · 재료 · 주문서 · 스킬 · 책" coins={h.coins} admin={h.admin} note={note} onClose={onClose}>
      <Tabs on={tab} set={setTab} tabs={[["weapon", "무기", h.bag.w.length], ["armor", "방어구", (h.bag.a || []).length], ["potion", "물약", potions.length], ["mat", "재료", mats.length], ["scroll", "주문서", h.bag.wp || 0], ["skill", "스킬", skills.length], ["book", "책", BOOKS.length]]} />
      {tab === "book" && <Books tab0={tab0} />}
      {tab === "weapon" && (
        <>
          <Head sub={`${h.bag.w.length}/${weaponCap(h)} · 하나만 낍니다`}>{w ? `장착 — ${weaponName(w)}` : "장착한 무기 없음"}</Head>
          {!h.bag.w.length && <Empty>무기상점에서 살 수 있습니다.</Empty>}
          {h.bag.w.length > 0 && (
            <Tabs on={weaponTabs.some(([id]) => id === wtab) ? wtab : "all"} set={setWtab} tabs={weaponTabs} />
          )}
          {h.bag.w.filter((q) => wtab === "all" || q.t === wtab).map((q) => (
            <WeaponItem key={q.u} w={q} tag={q.u === h.bag.e ? "장착 중" : ""}
              acts={[q.u === h.bag.e
                ? { label: "해제", why: whyEquip(h, 0), onClick: () => send({ op: "equip", u: 0 }) }
                : { label: "장착", main: true, why: whyEquip(h, q.u), onClick: () => send({ op: "equip", u: q.u }) }]} />
          ))}
        </>
      )}
      {tab === "armor" && (
        <>
          <Head sub="부위마다 하나씩 낍니다 · 같은 부위의 다른 것을 끼면 바뀝니다">착용 중</Head>
          <div className="shop-worn">
            {ARMOR_SLOTS.map((sl) => {
              const a = wornArmor(h.bag, sl.id);
              return (
                <div key={sl.id} className={`shop-worn-slot ${a ? "" : "empty"}`}>
                  {a ? <EquipmentArt src={armorArt(a.s, a.g, a.set)} /> : <i />}
                  <span>{sl.name}<small>{a ? `${ARMOR_GRADES[a.g].name}` : "비어 있음"}</small></span>
                </div>
              );
            })}
          </div>
          {WORLD_SETS.filter(set => worldSetCount(h, set.id) > 0).map(set => {
            const count = worldSetCount(h, set.id);
            return <div className="world-set-effects" key={set.id}><b>{set.name} 세트 {count}/4</b>
              <p>{count >= 2 ? '✓' : '○'} 2세트: {set.two}</p><p>{count >= 4 ? '✓' : '○'} 4세트: {set.four}</p></div>;
          })}
          <Head sub={`${(h.bag.a || []).length}/${armorCap(h)} · 던전 보스가 떨굽니다`}>가방</Head>
          {!(h.bag.a || []).length && <Empty>아직 방어구가 없습니다. 방어구 던전 보스가 떨굽니다.</Empty>}
          {armorGroups(h.bag).map(({ n, worn, wear: a }) => {
            const on = !!worn;
            return (
              <ArmorItem key={a.u} a={a} n={n} tag={on ? "착용 중" : ""}
                acts={[on ? { label: "빼기", why: whyArmorWear(h, a.u), onClick: () => send({ op: "awear", u: a.u }) }
                  : { label: "끼기", main: true, why: whyArmorWear(h, a.u), onClick: () => send({ op: "awear", u: a.u }) }]} />
            );
          })}
          {h.admin && WORLD_SETS.map(set => <Item key={set.id} name={`${set.name} 장비 시험`} desc="관리자 전용 · 전설 무기 3종과 세트 방어구 4종을 받습니다. 월드보스 획득은 추후 연결됩니다."
            acts={[{ label: '장비 받기', why: h.bag.w.length + 3 > weaponCap(h) || h.bag.a.length + 4 > armorCap(h) ? ['무기 3칸과 방어구 4칸이 필요합니다'] : [], onClick: () => send({ op: 'wbgive', set: set.id }) }]} />)}
          {h.admin && (
            <Item name="시험용 방어구 받기" desc="관리자만 — 네 부위 × 네 등급 16개를 한 번에 받습니다."
              acts={[{ label: "받기", why: whyArmorGive(h), onClick: () => send({ op: "agive" }) }]} />
          )}
        </>
      )}
      {tab === "potion" && (
        <>
          <p className="shop-note">칸 1 · 2 · 3 에 넣어 두면 화면 왼쪽 아래 칸이나 숫자키 5 · 6 · 7 로 바로 마십니다. 넣은 칸을 다시 누르면 뺍니다.</p>
          {!potions.length && <Empty>물약 상점에서 살 수 있습니다.</Empty>}
          {potions.map((p) => {
            const at = qs.indexOf(p.id);
            return (
              <Item key={p.id} name={p.name}
                meta={<span className="shop-meta"><span>× {h.bag.p[p.id]}</span>{at >= 0 && <span className="shop-tag">칸 {at + 1}</span>}</span>}
                desc={potionText(p)}
                acts={[{ label: "마시기", why: whyPotionUse(h, p.id), onClick: () => send({ op: "puse", id: p.id }) },
                  ...Array.from({ length: POTION.slots }, (_, i) => ({ label: `칸 ${i + 1}`, main: at === i,
                    onClick: () => send({ op: "qset", i, id: at === i ? "" : p.id }) }))]} />
            );
          })}
        </>
      )}
      {tab === "scroll" && (
        <>
          <Head sub={`남은 ${h.bag.wp || 0}회 · 한 번에 1회`}>지역 워프권</Head>
          {!(h.bag.wp > 0) && <Empty>광장의 주문서 상점에서 살 수 있습니다.</Empty>}
          {WARP.maps.map((id) => (
            <Item key={id} name={MAPS[id].name} dim={h.map === id} desc={warpHint(id)}
              meta={<span className="shop-meta">{h.map === id && <span className="shop-tag">지금 여기</span>}</span>}
              acts={[{ label: "워프", quiet: true, why: whyWarp(h, id), onClick: () => send({ op: "warp", to: id }) }]} />
          ))}
        </>
      )}
      {tab === "mat" && (
        <>
          {!mats.length && <Empty>보스를 잡으면 재료를 얻습니다. 강화석은 무기 강화소에서, 다른 재료는 광장 의뢰나 강화소에서 씁니다.</Empty>}
          {mats.map((m) => (
            <Item key={m.id} name={<>{m.img ? <img className="shop-mat-img" src={m.img} alt="" /> : <i className="shop-mat" style={{ background: m.color }} />}{m.name}</>}
              meta={<span className="shop-meta"><span>× {matCount(h.bag, m.id)}</span>{m.stone && <span>강화석</span>}</span>} desc={m.note} />
          ))}
        </>
      )}
      {tab === "skill" && (() => {
        const ks = h.bag.ks || { job: "", g: ["", ""] };
        const ws = w && w.sp && WEAPON_SKILLS[w.sp];
        const slots = [
          { k: "ult", key: "Shift", name: "궁극기", what: "큰 기술 — 직업 · 원소마다 정해져 있습니다" },
          { k: "job", key: "R", name: "직업 스킬", id: ks.job },
          { k: 0, key: "1", name: "일반 스킬 1", id: ks.g[0] },
          { k: 1, key: "2", name: "일반 스킬 2", id: ks.g[1] },
          { k: "wpn", key: "X", name: "무기 스킬", what: ws ? `${ws.name} — 낀 무기를 따릅니다` : "전설 무기를 끼면 생깁니다" },
        ];
        const set = (slot, id) => send({ op: "kset", slot, id });
        return (
          <>
            <Head sub="쓸 수 있는 스킬은 이 다섯 칸뿐입니다 · 패시브는 칸 없이 늘 듣습니다">스킬 칸</Head>
            <div className="shop-kslots">
              {slots.map((q) => {
                const s = q.id && SKILL_BY_ID[q.id];
                return (
                  <div key={q.k} className={`shop-kslot ${s || q.what ? "" : "empty"}`}>
                    <kbd>{q.key}</kbd>
                    <span>{q.name}<small>{s ? `${s.name} Lv ${h.bag.s[s.id]}` : q.what || "비어 있음"}</small></span>
                    {s && <button type="button" className="shop-btn" onClick={() => set(q.k, "")}>빼기</button>}
                  </div>
                );
              })}
            </div>
            <Head sub="배운 액티브 스킬을 칸에 넣습니다">배운 스킬</Head>
            {!skills.length && <Empty>스킬 상점에서 배울 수 있습니다.</Empty>}
            {skills.map((s) => {
              const on = s.job ? ks.job === s.id : ks.g.indexOf(s.id);
              const acts = !s.use ? [] : s.job
                ? [on ? { label: "칸에 있음", why: ["이미 직업 칸에 있습니다"], quiet: true } : { label: "직업 칸에", main: true, onClick: () => set("job", s.id) }]
                : [0, 1].map((i) => (on === i ? { label: `칸 ${i + 1} 사용 중`, why: ["이미 이 칸에 있습니다"], quiet: true }
                  : { label: `칸 ${i + 1}에`, main: on < 0 && !ks.g[i], onClick: () => set(i, s.id) }));
              return (
                <Item key={s.id} name={s.name}
                  meta={<span className="shop-meta"><span>{FAM_BY_ID[s.fam].name}</span><span>{s.kind === "active" ? "액티브" : "패시브"}</span><span>Lv {h.bag.s[s.id]}/{SKILL_BY_ID[s.id].gold.length}</span></span>}
                  desc={s.note} acts={acts} />
              );
            })}
          </>
        );
      })()}
    </Frame>
  );
}


