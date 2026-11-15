/* 히든 직업 BLOOD-001 화면 — 혈량 게이지 줄(레벨 카드 HP 아래)과 스킬 칸 단추(11월 14일 1 · 2단계).
   값은 bloodJob.js bloodView(방장은 판정 상태 · 손님은 스냅샷 줄 56). 판정은 하지 않는다 — 누름 · 뗌만 보낸다.
   게이지는 절대 상한 180 을 늘 보이고 안정 상한 · 150 · 180 자리에 1px 구분선. 겹치면 하나만 그린다(연출및세부사항) */
import { BLOOD, BLOOD_SHOT, BLOOD_SMASH, BLOOD_FORM, BLOOD_FIELD, BLOOD_STATE, BLOOD_NAME, BLOOD_COLORS, TRAIN_NAMES, TRAIN_UNLOCK } from "./game/bloodJobData.js";
import { SKILL_ICON_SHEET, SKILL_ICONS, iconStyle } from "./game/skillIconData.js";
import { stableCap, shotTier, shotTimeTier, smashTier, smashTimeTier, bloodMode, MODE_NAMES, jobNeed, trainNeed, bloodTint } from "./game/bloodJob.js";

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
  const mode = bloodMode(b, cap, v.rg);
  return {
    b, cap, lv: v.lv, xp: v.xp, mode, state: MODE_NAMES[mode] + (v.rg ? ` ${Math.ceil(v.rg.t)}초` : ""),   // 폭주 · 탈진은 남은 시간을 함께(색만으로 구분하지 않는다)
    warn: b >= BLOOD_STATE.warn && !v.rg, decay: b > cap && !v.fd, trial: v.bt || 0,
    field: { cd: v.cd.field || 0, max: BLOOD_FIELD.cd, locked: v.lv < BLOOD.unlock.field, left: v.fd ? Math.max(0, BLOOD_FIELD.dur - v.fd.t) : 0, none: !!(v.fd && v.fd.none), busy: !!v.rg },
    shot: { ...shot, cd: v.cd.shot || 0, max: BLOOD_SHOT.cd, charging: !!sc, u: sc ? Math.min(1, sc.t / BLOOD_SHOT.full) : 0, low: b < BLOOD_SHOT.need },
    smash: { ...smash, cd: v.cd.smash || 0, max: BLOOD_SMASH.cd, charging: !!mc, low: b < BLOOD_SMASH.tiers[0].cost, locked },
    form: { cd: v.cd.form || 0, max: BLOOD_FORM.cd, locked, veil: v.vl ? Math.max(0, v.vl.max - v.vl.t) : 0, veilLow: b < BLOOD_FORM.veil.cost },   // 혈막 — 대기 15초
    // 혈검(11월 15일) — 자체 대기 6초 · 만드는 중 · 남은 베기 · 남은 유지 시간
    sword: { cd: v.cd.sword || 0, max: BLOOD_FORM.sword.cd, locked, low: b < BLOOD_FORM.sword.cost, making: !!(v.sw && v.sw.ph === 1),
      held: !!(v.sw && v.sw.ph === 2), hold: v.sw && v.sw.ph === 2 ? Math.max(0, BLOOD_FORM.sword.hold - v.sw.t) : 0 },
    conv: { cd: v.cd.conv || 0, max: BLOOD.convert.cd, full: b >= (v.rg ? cap : BLOOD.convert.top) },   // 안정 상한을 넘어 179 까지 전환한다(폭주 · 탈진 중에는 상한까지)
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
      <span className="rpg-lv-num">{v.b}/{v.cap} <small className={`rpg-blood-st ${v.mode}`}>{v.state}</small>
        {v.trial > 0 && <small className="rpg-blood-warn">연구시설 시험 {v.trial}/3단계</small>}
        {v.warn && <small className="rpg-blood-warn">다음 혈역 획득 시 폭주</small>}
        {v.decay && <small className="rpg-blood-warn">초과 혈량 감소 -{BLOOD_FIELD.decay}/초</small>}</span>
    </span>
  );
}

const tierName = (t) => (t ? `${t}단계` : "기본");
// 차징 단추 하나 — 누르고 있으면 차징, 떼면 발동
// 칸 아이콘(skillIconData.js) — 아이콘 칸 판(.icons)에서만 보인다
export const SkillIco = ({ id }) => <b className="rpg-ico" style={iconStyle(SKILL_ICON_SHEET, SKILL_ICONS[id])} aria-hidden="true" />;
function ChargeBtn({ name, s, k, touch, sub, dots, ico, onDown, onUp, onCancel }) {
  return (
    <button type="button" className={`rpg-skill blood ${s.cd > 0 || s.locked ? "cool" : ""} ${s.low && !s.charging ? "low" : ""}`}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onDown(); }}
      onPointerUp={onUp} onPointerCancel={onCancel}>
      {!touch && k && <kbd>{k}</kbd>}
      <SkillIco id={ico} />
      <span>{name}<small>{sub}</small></span>
      {s.charging && <b className="rpg-blood-dots">{dots.map((on, i) => <i key={i} className={on ? "on" : ""} />)}</b>}
      {s.cd > 0 && <em>{Math.ceil(s.cd)}</em>}
      {s.cd > 0 && <i style={{ width: `${(s.cd / s.max) * 100}%` }} />}
    </button>
  );
}

// 스킬 칸 단추 — 적혈탄 · 혈수 강타(누르고 있으면 차징) · 혈검(만든 뒤 평타로 세 번) · 혈막(한 번 누르면 15초) · 혈량 전환
export function BloodButtons({ v, keys, touch, onShot, onShotUp, onShotCancel, onSmash, onSmashUp, onSword, onVeil, onField, onFieldUp, onConv }) {
  if (!v) return null;
  const s = v.shot, m = v.smash, f = v.form, c = v.conv, d = v.field, w = v.sword;
  const on = w.making || w.held;
  const swordSub = f.locked ? `직업 Lv ${BLOOD.unlock.shape}` : w.making ? "검을 만드는 중" : w.held ? `평타로 베기 · ${Math.ceil(w.hold)}초` : w.low ? "혈량 부족" : `혈량 ${BLOOD_FORM.sword.cost}`;
  const lock = `직업 Lv ${BLOOD.unlock.shape}`;
  const shotSub = s.charging ? (s.short >= 0 ? `혈량 부족 — ${tierName(s.short)} 발사` : `${tierName(s.tier)} · 혈량 ${s.cost}`) : s.low ? "혈량 부족" : `혈량 ${s.cost}`;
  const smashSub = m.locked ? lock : m.charging ? (m.short >= 0 ? `혈량 부족 — ${m.short ? `+${m.short * 10}` : "기본"} 발동` : `${m.tier ? `+${m.tier * 10}` : "기본"} · 혈량 ${m.cost}`) : m.low ? "혈량 부족" : `혈량 ${m.cost}`;
  return (
    <>
      <ChargeBtn name={BLOOD_SHOT.name} s={s} k={keys.shot} touch={touch} sub={shotSub} dots={[s.timeTier >= 1, s.timeTier >= 2]} ico="shot"
        onDown={onShot} onUp={onShotUp} onCancel={onShotCancel} />
      <ChargeBtn name={BLOOD_SMASH.name} s={m} k={keys.smash} touch={touch} sub={smashSub} dots={[m.timeTier >= 1, m.timeTier >= 2, m.timeTier >= 3]} ico="smash"
        onDown={onSmash} onUp={onSmashUp} onCancel={onSmashUp} />
      <button type="button" className={`rpg-skill blood ${(w.cd > 0 && !on) || w.locked ? "cool" : ""} ${w.low && !on ? "low" : ""} ${on ? "on" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); onSword(); }}>
        {!touch && keys.sword && <kbd>{keys.sword}</kbd>}
        <SkillIco id="sword" />
        <span>{BLOOD_FORM.sword.name}<small>{swordSub}</small></span>
        {w.held && <b className="rpg-blood-ring" style={{ "--p": `${(w.hold / BLOOD_FORM.sword.hold) * 360}deg` }} />}
        {w.cd > 0 && !on && <em>{Math.ceil(w.cd)}</em>}
        {w.cd > 0 && <i style={{ width: `${(w.cd / w.max) * 100}%` }} />}
      </button>
      <button type="button" className={`rpg-skill blood ${(f.cd > 0 && !f.veil) || f.locked ? "cool" : ""} ${f.veilLow && !f.veil ? "low" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); onVeil(); }}>
        {!touch && keys.veil && <kbd>{keys.veil}</kbd>}
        <SkillIco id="veil" />
        <span>{BLOOD_FORM.veil.name}<small>{f.locked ? lock : f.veil ? `유지 ${f.veil.toFixed(1)}초` : f.veilLow ? "혈량 부족" : `혈량 ${BLOOD_FORM.veil.cost}`}</small></span>
        {f.cd > 0 && !f.veil && <em>{Math.ceil(f.cd)}</em>}
        {f.cd > 0 && <i style={{ width: `${(f.cd / f.max) * 100}%` }} />}
      </button>
      <button type="button" className={`rpg-skill blood ${(d.cd > 0 && !d.left) || d.locked || d.busy ? "cool" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onField(); }}
        onPointerUp={onFieldUp} onPointerCancel={onFieldUp}>
        {!touch && keys.field && <kbd>{keys.field}</kbd>}
        <SkillIco id="field" />
        <span>{BLOOD_FIELD.name}<small>{d.locked ? `직업 Lv ${BLOOD.unlock.field}` : d.left ? (d.none ? "흡수 대상 없음" : `유지 ${Math.ceil(d.left)}초`) : d.busy ? `${v.state.split(" ")[0]} 중` : "혈량 소모 없음"}</small></span>
        {d.left > 0 && <b className="rpg-blood-ring" style={{ "--p": `${(d.left / BLOOD_FIELD.dur) * 360}deg` }} />}
        {d.cd > 0 && !d.left && <em>{Math.ceil(d.cd)}</em>}
        {d.cd > 0 && !d.left && <i style={{ width: `${(d.cd / d.max) * 100}%` }} />}
      </button>
      <button type="button" className={`rpg-skill blood ${c.cd > 0 || c.full ? "cool" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); onConv(); }}>
        {!touch && keys.conv && <kbd>{keys.conv}</kbd>}
        <SkillIco id="conv" />
        <span>혈량 전환<small>{c.full ? "전환 한도" : `체력 ${Math.round(BLOOD.convert.hp * 100)}% → 혈량 ${BLOOD.convert.gain}`}</small></span>
        {c.cd > 0 && <em>{Math.ceil(c.cd)}</em>}
      </button>
    </>
  );
}

// 스탯 창 — BLOOD-001 직업 레벨 · 연마 셋(11월 15일 사용자 요청). 값은 bloodView 그대로(v), 판정은 하지 않는다
const TINT_NAMES = { red: "붉은 혈색", violet: "보랏빛 혈색", dusk: "검붉은 혈색" };
export function BloodStat({ v }) {
  if (!v) return null;
  const top = v.lv >= BLOOD.maxLv;
  const need = jobNeed(v.lv), pct = (a, b) => `${Math.min(100, (a / Math.max(1, b)) * 100)}%`;
  const over = bloodMode(v.b, stableCap(v.lv), v.rg) === "over";   // 과충전 — 해금한 연마 계산 레벨 +5(각 50까지)
  const sum = v.tr.reduce((n, q) => n + q[0], 0), tint = bloodTint(sum);
  return (
    <div className="rpg-blood-stat">
      <div className="rpg-blood-stat-head">
        <b>{BLOOD_NAME}</b>
        <span>직업 레벨 <em>{v.lv}</em><small>/{BLOOD.maxLv}</small></span>
      </div>
      <span className="rpg-lv-bar xp"><span style={{ width: top ? "100%" : pct(v.xp, need) }} /></span>
      <small className="rpg-blood-stat-xp">{top ? "최고 레벨" : `경험치 ${v.xp} / ${need}`}</small>
      <div className="rpg-blood-stat-list">
        {TRAIN_NAMES.map((name, i) => {
          const [l, x] = v.tr[i], open = v.lv >= TRAIN_UNLOCK[i], max = l >= BLOOD.train.max;
          const tmp = over && open ? Math.min(BLOOD.train.max, l + BLOOD_STATE.over.train) - l : 0;
          return (
            <div key={name} className={`rpg-blood-stat-row ${open ? "" : "off"}`}>
              <span className="rpg-blood-stat-name">{name}</span>
              <span className="rpg-lv-bar blood"><span className="in" style={{ width: !open ? "0%" : max ? "100%" : pct(x, trainNeed(l)) }} /></span>
              <span className="rpg-blood-stat-lv">
                {!open ? `직업 Lv ${TRAIN_UNLOCK[i]}` : tmp > 0 ? <>영구 {l} + 임시 {tmp}</> : <>{l}<small>/{BLOOD.train.max}</small></>}
              </span>
              <small className="rpg-blood-stat-xp">{!open ? "잠김" : max ? "최고" : `${x} / ${trainNeed(l)}`}</small>
            </div>
          );
        })}
      </div>
      <p className="rpg-blood-stat-tint">
        <i style={{ background: BLOOD_COLORS[tint].bright }} />
        연마 합계 <em>{sum}</em> · {TINT_NAMES[tint]}
        <small>75 이상 보랏빛 · 130 이상 검붉은 혈색</small>
      </p>
    </div>
  );
}
