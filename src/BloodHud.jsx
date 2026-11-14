/* 히든 직업 BLOOD-001 화면 — 혈량 게이지 줄(레벨 카드 HP 아래)과 스킬 칸 단추(11월 14일 1 · 2단계).
   값은 bloodJob.js bloodView(방장은 판정 상태 · 손님은 스냅샷 줄 56). 판정은 하지 않는다 — 누름 · 뗌만 보낸다.
   게이지는 절대 상한 180 을 늘 보이고 안정 상한 · 150 · 180 자리에 1px 구분선. 겹치면 하나만 그린다(연출및세부사항) */
import { BLOOD, BLOOD_SHOT, BLOOD_SMASH, BLOOD_FORM } from "./game/bloodJobData.js";
import { stableCap, shotTier, shotTimeTier, smashTier, smashTimeTier } from "./game/bloodJob.js";

// 차징 단계 · 비용 — 시간만 본 단계가 혈량 때문에 낮아지면 short 에 실제 단계
function chargeInfo(ch, b, tierOf, timeOf, tiers) {
  const t = ch ? ch.t : 0, tier = Math.max(0, tierOf(t, b)), timeTier = ch ? timeOf(t) : 0;
  return { tier, timeTier, cost: tiers[tier].cost, short: ch && timeTier > tier ? tier : -1 };
}
// 레벨 카드 HUD 값 — RpgView setHud 가 부른다
export function bloodHud(v) {
  if (!v) return null;
  const cap = stableCap(v.lv), b = Math.round(v.b), ch = v.ch;
  const sc = ch && ch.s !== "smash" ? ch : null, mc = ch && ch.s === "smash" ? ch : null;
  const shot = chargeInfo(sc, b, shotTier, shotTimeTier, BLOOD_SHOT.tiers);
  const smash = chargeInfo(mc, b, smashTier, smashTimeTier, BLOOD_SMASH.tiers);
  const locked = v.lv < BLOOD.unlock.shape;
  return {
    b, cap, lv: v.lv, xp: v.xp, state: b > cap ? "증폭" : "안정",
    shot: { ...shot, cd: v.cd.shot || 0, max: BLOOD_SHOT.cd, charging: !!sc, u: sc ? Math.min(1, sc.t / BLOOD_SHOT.full) : 0, low: b < BLOOD_SHOT.need },
    smash: { ...smash, cd: v.cd.smash || 0, max: BLOOD_SMASH.cd, charging: !!mc, low: b < BLOOD_SMASH.tiers[0].cost, locked },
    form: { cd: v.cd.form || 0, max: BLOOD_FORM.cd, locked, veil: v.vl ? Math.max(0, v.vl.max - v.vl.t) : 0,
      swordLow: b < BLOOD_FORM.sword.cost, veilLow: b < BLOOD_FORM.veil.cost },
    conv: { cd: v.cd.conv || 0, max: BLOOD.convert.cd, full: b >= cap },
    use: sc ? shot.cost : mc ? smash.cost : 0,
  };
}

export function BloodBar({ v }) {
  if (!v) return null;
  const pct = (n) => `${Math.min(100, (n / BLOOD.abs) * 100)}%`;
  const marks = [...new Set([v.cap, 150, BLOOD.abs])];
  const use = v.use;   // 차징 중 예상 소모 — 발동 전에는 깎지 않는다(빗금)
  return (
    <span className="rpg-lv-row rpg-blood-row">
      <span className="rpg-lv-tag">혈</span>
      <span className="rpg-lv-bar blood">
        <span className="in" style={{ width: pct(Math.min(v.b, v.cap)) }} />
        {v.b > v.cap && <span className="over" style={{ left: pct(v.cap), width: pct(v.b - v.cap) }} />}
        {use > 0 && <span className="use" style={{ left: pct(Math.max(0, v.b - use)), width: pct(Math.min(use, v.b)) }} />}
        {marks.map((m) => <i key={m} style={{ left: pct(m) }} />)}
      </span>
      <span className="rpg-lv-num">{v.b}/{v.cap} <small>{v.state}</small></span>
    </span>
  );
}

const tierName = (t) => (t ? `${t}단계` : "기본");
// 차징 단추 하나 — 누르고 있으면 차징, 떼면 발동
function ChargeBtn({ name, s, k, touch, sub, dots, onDown, onUp, onCancel }) {
  return (
    <button type="button" className={`rpg-skill blood ${s.cd > 0 || s.locked ? "cool" : ""} ${s.low && !s.charging ? "low" : ""}`}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onDown(); }}
      onPointerUp={onUp} onPointerCancel={onCancel}>
      {!touch && k && <kbd>{k}</kbd>}
      <span>{name}<small>{sub}</small></span>
      {s.charging && <b className="rpg-blood-dots">{dots.map((on, i) => <i key={i} className={on ? "on" : ""} />)}</b>}
      {s.cd > 0 && <em>{Math.ceil(s.cd)}</em>}
      {s.cd > 0 && <i style={{ width: `${(s.cd / s.max) * 100}%` }} />}
    </button>
  );
}

// 스킬 칸 단추 — 적혈탄 · 혈수 강타(누르고 있으면 차징) · 혈검 · 혈막(누르고 있는 동안) · 혈량 전환
export function BloodButtons({ v, keys, touch, onShot, onShotUp, onShotCancel, onSmash, onSmashUp, onSword, onVeil, onVeilUp, onConv }) {
  if (!v) return null;
  const s = v.shot, m = v.smash, f = v.form, c = v.conv;
  const lock = `직업 Lv ${BLOOD.unlock.shape}`;
  const shotSub = s.charging ? (s.short >= 0 ? `혈량 부족 — ${tierName(s.short)} 발사` : `${tierName(s.tier)} · 혈량 ${s.cost}`) : s.low ? "혈량 부족" : `혈량 ${s.cost}`;
  const smashSub = m.locked ? lock : m.charging ? (m.short >= 0 ? `혈량 부족 — ${m.short ? `+${m.short * 10}` : "기본"} 발동` : `${m.tier ? `+${m.tier * 10}` : "기본"} · 혈량 ${m.cost}`) : m.low ? "혈량 부족" : `혈량 ${m.cost}`;
  return (
    <>
      <ChargeBtn name={BLOOD_SHOT.name} s={s} k={keys.shot} touch={touch} sub={shotSub} dots={[s.timeTier >= 1, s.timeTier >= 2]}
        onDown={onShot} onUp={onShotUp} onCancel={onShotCancel} />
      <ChargeBtn name={BLOOD_SMASH.name} s={m} k={keys.smash} touch={touch} sub={smashSub} dots={[m.timeTier >= 1, m.timeTier >= 2, m.timeTier >= 3]}
        onDown={onSmash} onUp={onSmashUp} onCancel={onSmashUp} />
      <button type="button" className={`rpg-skill blood ${f.cd > 0 || f.locked ? "cool" : ""} ${f.swordLow ? "low" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); onSword(); }}>
        {!touch && keys.sword && <kbd>{keys.sword}</kbd>}
        <span>{BLOOD_FORM.sword.name}<small>{f.locked ? lock : f.swordLow ? "혈량 부족" : `혈량 ${BLOOD_FORM.sword.cost}`}</small></span>
        {f.cd > 0 && <em>{Math.ceil(f.cd)}</em>}
        {f.cd > 0 && <i style={{ width: `${(f.cd / f.max) * 100}%` }} />}
      </button>
      <button type="button" className={`rpg-skill blood ${(f.cd > 0 && !f.veil) || f.locked ? "cool" : ""} ${f.veilLow && !f.veil ? "low" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onVeil(); }}
        onPointerUp={onVeilUp} onPointerCancel={onVeilUp}>
        {!touch && keys.veil && <kbd>{keys.veil}</kbd>}
        <span>{BLOOD_FORM.veil.name}<small>{f.locked ? lock : f.veil ? `유지 ${f.veil.toFixed(1)}초` : f.veilLow ? "혈량 부족" : `혈량 ${BLOOD_FORM.veil.cost}`}</small></span>
        {f.cd > 0 && !f.veil && <em>{Math.ceil(f.cd)}</em>}
        {f.cd > 0 && <i style={{ width: `${(f.cd / f.max) * 100}%` }} />}
      </button>
      <button type="button" className={`rpg-skill blood ${c.cd > 0 || c.full ? "cool" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); onConv(); }}>
        {!touch && keys.conv && <kbd>{keys.conv}</kbd>}
        <span>혈량 전환<small>{c.full ? "안정 상한" : `체력 ${Math.round(BLOOD.convert.hp * 100)}% → 혈량 ${BLOOD.convert.gain}`}</small></span>
        {c.cd > 0 && <em>{Math.ceil(c.cd)}</em>}
      </button>
    </>
  );
}
