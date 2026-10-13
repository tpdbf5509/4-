/* ── RPG 광장 상점 창 · 가방 창 ──────────────────────────────
   기능 확인용 단순한 화면이다. 디자인은 나중에 따로 다듬는다.
   버튼을 누르면 send({ op, ... }) 로 방장에게 보내고, 결과는 note 로 돌아온다.
   막힌 이유는 방장과 같은 조건 함수(why*)로 미리 보여 준다. */
import { useState } from "react";
import { STATS, statValue } from "./game/rpg.js";
import {
  SHOPS, WEAPON_TYPES, GRADES, WEAPON_TIERS, WEAPON, DEAL, SKILL_FAMS, SKILLS, POTIONS, POTION,
  CASINO, BOX, DICE, SLOT,
} from "./game/shopData.js";
import {
  SHOP_BY_ID, SKILL_BY_ID, POTION_BY_ID, FAM_BY_ID, todayKey, usedToday, tierOf, weaponPrice, weaponName,
  weaponLine, sellPrice, dealOf, equipped, skillNext, extraStat, whyWeaponBuy, whyWeaponSell, whyEquip, whySkill,
  whyPotionBuy, whyPotionUse, whyGamble, boxPrice, casinoEv,
} from "./game/shop.js";
import { Coin } from "./ui/icons.jsx";

const won = (n) => Math.round(n).toLocaleString("ko-KR");
const pct = (v, d = 1) => `${(Math.round(v * 100 * 10 ** d) / 10 ** d).toLocaleString("ko-KR")}%`;
const statDef = (id) => STATS.find((t) => t.id === id);

// 사기 · 팔기 버튼 — 막혔으면 이유를 아래에 적는다
function Act({ why, label, onClick, main, quiet }) {
  const blocked = why.length > 0;
  return (
    <span className="shop-act">
      <button type="button" className={main ? "btn-main" : "btn-ghost"} disabled={blocked} onClick={onClick}>{label}</button>
      {blocked && !quiet && <em className="shop-why">{why.join(" · ")}</em>}
    </span>
  );
}

function potionText(p) {
  if (p.kind === "heal") return `최대 체력의 ${pct(p.pct, 0)} 회복`;
  if (p.kind === "buff") return `${p.dur}초 동안 ${statDef(p.stat).name} +${statDef(p.stat).fmt(p.amt)}`;
  return "찍은 스탯 포인트를 모두 돌려받는다";
}

/* ── 무기상점 ─────────────────────────────────────────────── */
function WeaponShop({ h, send }) {
  const [tier, setTier] = useState(() => tierOf(h.lv));
  const [grade, setGrade] = useState(0);
  const day = todayKey();
  const d = dealOf(h.lv, day);
  const dealLeft = DEAL.perDay - usedToday(h.bag, "deal", day);
  const eqU = h.bag.e;
  return (
    <>
      <section className="shop-sec">
        <h4>오늘의 특가 <small>{Math.round(DEAL.discount * 100)}% 할인 · 하루 {DEAL.perDay}번 · 남은 {Math.max(0, dealLeft)}번</small></h4>
        <div className="shop-row">
          <span className="shop-name">
            <b>{weaponName(d)} <small>Lv {WEAPON_TIERS[d.r]}</small></b>
            <em>{weaponLine(d)}</em>
          </span>
          <span className="shop-price"><s>{won(d.full)}</s> {won(d.price)}</span>
          <Act main why={whyWeaponBuy(h, d.t, d.r, d.g, true, day)} label="특가 구매"
            onClick={() => send({ op: "wbuy", t: d.t, r: d.r, g: d.g, deal: 1 })} />
        </div>
      </section>

      <section className="shop-sec">
        <h4>무기 <small>10레벨마다 새 무기가 들어옵니다</small></h4>
        <div className="shop-tabs">
          {WEAPON_TIERS.map((lv, r) => (
            <button key={lv} type="button" className={`${r === tier ? "on" : ""} ${h.lv < lv ? "lock" : ""}`}
              title={h.lv < lv ? `레벨 ${lv} 필요` : ""} onClick={() => setTier(r)}>
              Lv {lv}
            </button>
          ))}
        </div>
        <div className="shop-tabs">
          {GRADES.map((gd) => (
            <button key={gd.id} type="button" className={gd.id === grade ? "on" : ""} onClick={() => setGrade(gd.id)}>{gd.name}</button>
          ))}
        </div>
        {WEAPON_TYPES.map((t) => {
          const w = { t: t.id, r: tier, g: grade };
          return (
            <div key={t.id} className="shop-row">
              <span className="shop-name">
                <b>{weaponName(w)} <small>Lv {WEAPON_TIERS[tier]}</small></b>
                <em>{weaponLine(w)}</em>
              </span>
              <span className="shop-price">{won(weaponPrice(t.id, tier, grade))}</span>
              <Act why={whyWeaponBuy(h, t.id, tier, grade, false, day)} label="구매"
                onClick={() => send({ op: "wbuy", t: t.id, r: tier, g: grade })} />
            </div>
          );
        })}
      </section>

      <section className="shop-sec">
        <h4>되팔기 <small>산 값의 {Math.round(WEAPON.sellRate * 100)}% · 가방 {h.bag.w.length}/{WEAPON.bagMax}</small></h4>
        {!h.bag.w.length && <p className="shop-empty">가방에 무기가 없습니다.</p>}
        {h.bag.w.map((w) => (
          <div key={w.u} className="shop-row">
            <span className="shop-name">
              <b>{weaponName(w)} <small>Lv {WEAPON_TIERS[w.r]}{w.u === eqU ? " · 장착 중" : ""}</small></b>
              <em>{weaponLine(w)} · 산 값 {won(w.p)}</em>
            </span>
            <span className="shop-price">+{won(sellPrice(w))}</span>
            <Act why={whyWeaponSell(h, w.u)} label="팔기" onClick={() => send({ op: "wsell", u: w.u })} />
          </div>
        ))}
      </section>
    </>
  );
}

/* ── 스킬 상점 ─────────────────────────────────────────────── */
function SkillShop({ h, send }) {
  return SKILL_FAMS.map((f) => (
    <section key={f.id} className="shop-sec">
      <h4>{f.name} 계열 <small>조건 스탯 {statDef(f.stat).name} (장비 · 버프 제외)</small></h4>
      {SKILLS.filter((s) => s.fam === f.id).map((s) => {
        const cur = h.bag.s[s.id] || 0;
        const nx = skillNext(h, s.id);
        return (
          <div key={s.id} className="shop-row">
            <span className="shop-name">
              <b>{s.name} <small>{s.kind === "active" ? "액티브" : "패시브"} · Lv {cur}/{s.gold.length}</small></b>
              <em>
                {s.note}
                {s.bonus && ` · 레벨마다 ${statDef(s.bonus.stat).name} +${statDef(s.bonus.stat).fmt(s.bonus.per)}`}
                {s.kind === "active" && " · 전투에서 쓰기는 준비 중"}
              </em>
              {nx && (
                <em>
                  다음 Lv {nx.lv} 조건 — 레벨 {nx.needLv} · {statDef(nx.stat).name} {statDef(nx.stat).fmt(nx.need)}
                  {" "}(지금 {statDef(nx.stat).fmt(statValue(nx.stat, h.st[nx.stat]))})
                </em>
              )}
            </span>
            <span className="shop-price">{nx ? won(nx.gold) : "—"}</span>
            <Act why={whySkill(h, s.id)} label={cur ? "레벨업" : "배우기"} onClick={() => send({ op: "sbuy", id: s.id })} />
          </div>
        );
      })}
    </section>
  ));
}

/* ── 물약 상점 ─────────────────────────────────────────────── */
function PotionShop({ h, send }) {
  return (
    <section className="shop-sec">
      <h4>물약 <small>마실 때 {pct(POTION.greatChance, 0)} 확률로 대성공(효과 {POTION.greatMul}배) · 초기화 물약 제외</small></h4>
      {POTIONS.map((p) => (
        <div key={p.id} className="shop-row">
          <span className="shop-name">
            <b>{p.name} <small>가진 수 {h.bag.p[p.id] || 0}</small></b>
            <em>{potionText(p)}</em>
          </span>
          <span className="shop-price">{won(p.price)}</span>
          <span className="shop-acts">
            <Act why={whyPotionBuy(h, p.id)} label="사기" onClick={() => send({ op: "pbuy", id: p.id })} />
            <Act why={whyPotionUse(h, p.id)} label="마시기" onClick={() => send({ op: "puse", id: p.id })} />
          </span>
        </div>
      ))}
    </section>
  );
}

/* ── 도박장 ───────────────────────────────────────────────── */
function BetInput({ value, onChange }) {
  return (
    <label className="shop-bet">
      걸 코인
      <input type="number" inputMode="numeric" min={CASINO.minBet} max={CASINO.maxBet} step={10} value={value}
        onChange={(e) => onChange(Math.floor(Number(e.target.value) || 0))} />
    </label>
  );
}
function Casino({ h, send }) {
  const [diceBet, setDiceBet] = useState(100);
  const [slotBet, setSlotBet] = useState(100);
  const day = todayKey();
  const ev = casinoEv(h.lv);
  const left = (k) => CASINO.daily[k] - usedToday(h.bag, k, day);
  const gsum = BOX.grades.reduce((a, b) => a + b, 0);
  const psum = Object.values(BOX.potions).reduce((a, b) => a + b, 0);
  const ssum = SLOT.reduce((a, s) => a + s.w, 0);
  return (
    <>
      <p className="shop-note">
        한 번에 {won(CASINO.minBet)}~{won(CASINO.maxBet)}코인. 하루 횟수는 한국 날짜 자정에 다시 찹니다.
      </p>
      <section className="shop-sec">
        <h4>랜덤 상자 <small>오늘 남은 {Math.max(0, left("box"))}/{CASINO.daily.box}번 · 기댓값 {pct(ev.box, 0)}</small></h4>
        <p className="shop-note">내 레벨 단계(Lv {WEAPON_TIERS[tierOf(h.lv)]})의 무기 또는 물약이 나옵니다. 기댓값은 상점가로 셈합니다.</p>
        <table className="shop-odds">
          <tbody>
            {GRADES.map((gd) => (
              <tr key={gd.id}><td>{gd.name} 무기</td><td>{pct(BOX.weapon * (BOX.grades[gd.id] / gsum))}</td></tr>
            ))}
            {Object.entries(BOX.potions).map(([id, w]) => (
              <tr key={id}><td>{POTION_BY_ID[id].name}</td><td>{pct((1 - BOX.weapon) * (w / psum))}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="shop-row">
          <span className="shop-name"><b>상자 열기</b></span>
          <span className="shop-price">{won(boxPrice(h.lv))}</span>
          <Act why={whyGamble(h, "box", 0, day)} label="열기" onClick={() => send({ op: "box" })} />
        </div>
      </section>

      <section className="shop-sec">
        <h4>주사위 홀짝 <small>오늘 남은 {Math.max(0, left("dice"))}/{CASINO.daily.dice}번 · 기댓값 {pct(ev.dice, 0)}</small></h4>
        <p className="shop-note">
          맞히면 건 금액의 {DICE.pay}배. {pct(DICE.house, 0)} 확률로 주사위가 모서리에 서면 집이 가져갑니다.
          맞힐 확률은 {pct((1 - DICE.house) * 0.5, 0)}입니다.
        </p>
        <div className="shop-line">
          <BetInput value={diceBet} onChange={setDiceBet} />
          <Act why={whyGamble(h, "dice", diceBet, day)} label="홀" onClick={() => send({ op: "dice", bet: diceBet, pick: "odd" })} />
          <Act quiet why={whyGamble(h, "dice", diceBet, day)} label="짝" onClick={() => send({ op: "dice", bet: diceBet, pick: "even" })} />
        </div>
      </section>

      <section className="shop-sec">
        <h4>슬롯머신 <small>오늘 남은 {Math.max(0, left("slot"))}/{CASINO.daily.slot}번 · 기댓값 {pct(ev.slot, 0)}</small></h4>
        <table className="shop-odds">
          <tbody>
            {SLOT.map((s) => (
              <tr key={s.id}><td>{s.name} 3개</td><td>{s.mul}배</td><td>{pct(Math.pow(s.w / ssum, 3), 3)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="shop-line">
          <BetInput value={slotBet} onChange={setSlotBet} />
          <Act why={whyGamble(h, "slot", slotBet, day)} label="당기기" onClick={() => send({ op: "slot", bet: slotBet })} />
        </div>
      </section>
    </>
  );
}

const BODIES = { weapon: WeaponShop, skill: SkillShop, potion: PotionShop, casino: Casino };

// 창의 틀 — 머리 · 결과 한 줄 · 닫기
function Frame({ title, sub, coins, note, onClose, children }) {
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <div className="rpg-stat rpg-shop" role="dialog" aria-label={title}>
        <div className="rpg-stat-head">
          <b>{title}</b>
          <span className="shop-coins"><Coin />{won(coins)}</span>
          <button type="button" className="shop-x" aria-label="닫기" onClick={onClose}>×</button>
        </div>
        {sub && <p className="rpg-stat-rule">{sub}</p>}
        {note && <p className={`shop-result ${note.ok ? "ok" : "no"}`} key={note.at}>{note.msg}</p>}
        {children}
      </div>
    </>
  );
}

export function ShopPanel({ shop, h, send, note, onClose }) {
  const s = SHOP_BY_ID[shop] || SHOPS[0];
  const Body = BODIES[s.id];
  return (
    <Frame title={s.name} sub={`${s.keeper} — "${s.line}"`} coins={h.coins} note={note} onClose={onClose}>
      <Body h={h} send={send} />
    </Frame>
  );
}

/* ── 가방 — 어디서나 연다. 무기 장착 · 물약 마시기 · 배운 스킬 · 능력치 ── */
export function BagPanel({ h, send, note, onClose }) {
  const w = equipped(h.bag);
  const potions = POTIONS.filter((p) => h.bag.p[p.id] > 0);
  const skills = SKILLS.filter((s) => h.bag.s[s.id] > 0);
  return (
    <Frame title="가방" sub="무기는 하나만 낍니다. 장비 · 스킬 · 버프로 오른 몫은 + 로 보입니다." coins={h.coins} note={note} onClose={onClose}>
      <section className="shop-sec">
        <h4>능력치</h4>
        {STATS.map((t) => {
          const base = statValue(t.id, h.st[t.id]);
          const add = extraStat(h, t.id);
          const buff = h.bf && h.bf[t.id];
          return (
            <div key={t.id} className="shop-row slim">
              <span className="shop-name"><b>{t.name}</b>{buff && <em>버프 {Math.ceil(buff.t)}초 남음</em>}</span>
              <span className="shop-price">{t.fmt(base + add)}{add > 0 && <small> ({t.fmt(base)} +{t.fmt(add)})</small>}</span>
            </div>
          );
        })}
      </section>

      <section className="shop-sec">
        <h4>무기 <small>{h.bag.w.length}/{WEAPON.bagMax} · 장착 {w ? weaponName(w) : "없음"}</small></h4>
        {!h.bag.w.length && <p className="shop-empty">무기상점에서 살 수 있습니다.</p>}
        {h.bag.w.map((q) => (
          <div key={q.u} className="shop-row">
            <span className="shop-name">
              <b>{weaponName(q)} <small>Lv {WEAPON_TIERS[q.r]}</small></b>
              <em>{weaponLine(q)}</em>
            </span>
            {q.u === h.bag.e
              ? <Act why={whyEquip(h, 0)} label="해제" onClick={() => send({ op: "equip", u: 0 })} />
              : <Act why={whyEquip(h, q.u)} label="장착" onClick={() => send({ op: "equip", u: q.u })} />}
          </div>
        ))}
      </section>

      <section className="shop-sec">
        <h4>물약</h4>
        {!potions.length && <p className="shop-empty">물약 상점에서 살 수 있습니다.</p>}
        {potions.map((p) => (
          <div key={p.id} className="shop-row">
            <span className="shop-name"><b>{p.name} <small>× {h.bag.p[p.id]}</small></b><em>{potionText(p)}</em></span>
            <Act why={whyPotionUse(h, p.id)} label="마시기" onClick={() => send({ op: "puse", id: p.id })} />
          </div>
        ))}
      </section>

      <section className="shop-sec">
        <h4>배운 스킬</h4>
        {!skills.length && <p className="shop-empty">스킬 상점에서 배울 수 있습니다.</p>}
        {skills.map((s) => (
          <div key={s.id} className="shop-row slim">
            <span className="shop-name">
              <b>{s.name} <small>{FAM_BY_ID[s.fam].name} · {s.kind === "active" ? "액티브" : "패시브"}</small></b>
              <em>{s.note}</em>
            </span>
            <span className="shop-price">Lv {h.bag.s[s.id]}/{SKILL_BY_ID[s.id].gold.length}</span>
          </div>
        ))}
      </section>
    </Frame>
  );
}

