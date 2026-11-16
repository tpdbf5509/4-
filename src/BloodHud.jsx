/* 히든 직업 BLOOD-001 화면 — 혈량 게이지 줄(레벨 카드 HP 아래)과 스킬 칸 단추(11월 14일 1 · 2단계).
   값은 bloodJob.js bloodView(방장은 판정 상태 · 손님은 스냅샷 줄 56). 판정은 하지 않는다 — 누름 · 뗌만 보낸다.
   게이지 끝은 이 레벨의 과부하 한계, 안정 · 증폭 · 과부하 한계 자리에 1px 구분선(11월 15일 개편 — 한계는 직업 레벨을 따른다, bloodCaps) */
import { BLOOD, BLOOD_SHOT, BLOOD_SMASH, BLOOD_FORM, BLOOD_FIELD, BLOOD_WAVE, BLOOD_HOOK, BLOOD_STATE, BLOOD_NAME, BLOOD_COLORS, TRAIN_NAMES, TRAIN_UNLOCK,
  BLOOD_PIERCE, BLOOD_SEA, BLOOD_LEGION, BLOOD_ORIGIN, BLOOD_AWAKE } from "./game/bloodJobData.js";
import { SKILL_ICON_SHEET, SKILL_ICONS, iconStyle } from "./game/skillIconData.js";
import { stableCap, bloodCaps, overWarn, shotTier, shotTimeTier, smashTier, smashTimeTier, bloodMode, MODE_NAMES, jobNeed, trainNeed, bloodTint, newLock, awakeLock, bloodCost } from "./game/bloodJob.js";

// 차징 단계 · 비용 — 시간만 본 단계가 혈량 때문에 낮아지면 short 에 실제 단계
function chargeInfo(ch, b, tierOf, timeOf, tiers, aw) {
  const t = ch ? ch.t : 0, tier = Math.max(0, tierOf(t, b, aw)), timeTier = ch ? timeOf(t) : 0;
  return { tier, timeTier, cost: bloodCost(aw, tiers[tier].cost), short: ch && timeTier > tier ? tier : -1 };
}
// 신규 스킬 칸(11월 16일) — 잠김 글 · 대기 · 혈량
function newSkill(v, D, cd, aw, b) {
  const lock = newLock(v, D), cost = bloodCost(aw, D.cost);
  return { cd: cd || 0, max: D.cd, low: b < cost, locked: !!lock, lockText: lock.replace(/에 열립니다$/, ""), cost };
}
// 레벨 카드 HUD 값 — RpgView setHud 가 부른다
export function bloodHud(v) {
  if (!v) return null;
  const [cap, amp, top] = bloodCaps(v.lv), b = Math.round(v.b), ch = v.ch;
  const sc = ch && ch.s !== "smash" ? ch : null, mc = ch && ch.s === "smash" ? ch : null;
  const aw = !!v.aw;
  const shot = chargeInfo(sc, b, shotTier, shotTimeTier, BLOOD_SHOT.tiers, aw);
  const smash = chargeInfo(mc, b, smashTier, smashTimeTier, BLOOD_SMASH.tiers, aw);
  const locked = v.lv < BLOOD.unlock.shape, U = BLOOD.unlock;
  const mode = bloodMode(b, cap, v.rg);
  return {
    b, cap, amp, top, lv: v.lv, xp: v.xp, mode, state: MODE_NAMES[mode] + (v.rg ? ` ${Math.ceil(v.rg.t)}초` : ""),   // 폭주 · 탈진은 남은 시간을 함께(색만으로 구분하지 않는다)
    warn: overWarn(b, v.lv, v.rg), decay: b > cap && !v.fd, trial: v.bt || 0,
    field: { cd: v.cd.field || 0, max: BLOOD_FIELD.cd, locked: v.lv < BLOOD.unlock.field, left: v.fd ? Math.max(0, BLOOD_FIELD.dur - v.fd.t) : 0, none: !!(v.fd && v.fd.none), busy: !!v.rg },
    // 적혈탄 대기 막대의 최대 — 쏜 단계의 대기(1 · 1.5 · 2.5초). 옛 줄이면 지금 남은 값과 가장 긴 대기 중 맞는 것
    shot: { ...shot, cd: v.cd.shot || 0, max: v.shotMax || BLOOD_SHOT.tiers.map((q) => q.cd).find((c) => c >= (v.cd.shot || 0)) || 2.5, charging: !!sc, u: sc ? Math.min(1, sc.t / BLOOD_SHOT.full) : 0, low: b < BLOOD_SHOT.need },
    smash: { ...smash, cd: v.cd.smash || 0, max: BLOOD_SMASH.cd, charging: !!mc, low: b < BLOOD_SMASH.tiers[0].cost, locked: v.lv < U.smash, at: U.smash },
    wave: { cd: v.cd.wave || 0, max: BLOOD_WAVE.cd, low: b < BLOOD_WAVE.cost, locked: v.lv < U.wave, at: U.wave },   // 혈류 파동(11월 15일)
    hook: { cd: v.cd.hook || 0, max: BLOOD_HOOK.cd, low: b < BLOOD_HOOK.cost, locked: v.lv < U.hook, at: U.hook, on: !!v.hk },   // 혈쇄 갈고리(11월 15일)
    form: { cd: v.cd.form || 0, max: BLOOD_FORM.cd, locked, veil: v.vl ? Math.max(0, v.vl.max - v.vl.t) : 0, veilLow: b < BLOOD_FORM.veil.cost },   // 혈막 — 대기 15초
    // 혈검(11월 15일) — 자체 대기 6초 · 만드는 중 · 남은 베기 · 남은 유지 시간
    sword: { cd: v.cd.sword || 0, max: BLOOD_FORM.sword.cd, locked, low: b < BLOOD_FORM.sword.cost, making: !!(v.sw && v.sw.ph === 1),
      held: !!(v.sw && v.sw.ph === 2), hold: v.sw && v.sw.ph === 2 ? Math.max(0, BLOOD_FORM.sword.hold - v.sw.t) : 0 },
    conv: { cd: v.cd.conv || 0, max: BLOOD.convert.cd, full: b >= cap },   // 안정 한계까지만(11월 15일 개편)
    use: sc ? shot.cost : mc ? smash.cost : 0,
    // 11월 16일 최종 강화 — 신규 스킬 4종 · 원초적 지배
    pierce: newSkill(v, BLOOD_PIERCE, v.cd.pierce, aw, b),
    sea: { ...newSkill(v, BLOOD_SEA, v.cd.sea, aw, b), on: !!v.sea, left: v.sea ? Math.max(0, BLOOD_SEA.dur - v.sea.t) : 0 },
    legion: { ...newSkill(v, BLOOD_LEGION, v.cd.legion, aw, b), on: !!v.lg, left: v.lg ? Math.max(0, BLOOD_LEGION.dur - v.lg.t) : 0 },
    origin: { ...newSkill(v, BLOOD_ORIGIN, v.cd.origin, aw, b), on: !!v.og },
    awake: (() => { const lock = awakeLock(v); return { cd: v.cd.awake || 0, max: BLOOD_AWAKE.cd, low: false, locked: !!lock, lockText: lock.replace(/에 열립니다$/, ""), on: aw, left: v.aw ? v.aw.left : 0 }; })(),
  };
}

export function BloodBar({ v }) {
  if (!v) return null;
  const pct = (n) => `${Math.min(100, (n / v.top) * 100)}%`;   // 끝 = 이 레벨의 과부하 한계
  const marks = [...new Set([v.cap, v.amp, v.top])];
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
      <span className="rpg-lv-num" title={`안정 ${v.cap} · 증폭 ${v.amp} · 과부하 ${v.top}`}>{v.b}/{v.cap} <small className={`rpg-blood-st ${v.mode}`}>{v.state}</small>
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

// 스킬 칸 단추 — 적혈탄 · 혈수 강타(누르고 있으면 차징) · 혈검(만든 뒤 50초 동안 새 평타마다) · 혈막(한 번 누르면 15초) · 혈류 파동 · 혈쇄 갈고리 · 혈역 증폭 · 혈량 전환
// 한 번 누르면 바로 나가는 칸(혈류 파동 · 혈쇄 갈고리, 11월 15일)
function TapBtn({ name, q, k, touch, ico, cost, onDown }) {
  return (
    <button type="button" className={`rpg-skill blood ${q.cd > 0 || q.locked ? "cool" : ""} ${q.low && !q.on ? "low" : ""} ${q.on ? "on" : ""}`}
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}>
      {!touch && k && <kbd>{k}</kbd>}
      <SkillIco id={ico} />
      <span>{name}<small>{q.locked ? `직업 Lv ${q.at}` : q.low ? "혈량 부족" : `혈량 ${cost}`}</small></span>
      {q.cd > 0 && <em>{Math.ceil(q.cd)}</em>}
      {q.cd > 0 && <i style={{ width: `${(q.cd / q.max) * 100}%` }} />}
    </button>
  );
}

// 신규 스킬 칸 — 아이콘 그림이 아직 없어 1px 테두리 칸에 한 글자 표식을 둔다(11월 16일)
function NewBtn({ name, mark, q, k, touch, sub, onDown }) {
  return (
    <button type="button" className={`rpg-skill blood ${(q.cd > 0 && !q.on) || q.locked ? "cool" : ""} ${q.low && !q.on ? "low" : ""} ${q.on ? "on" : ""}`}
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}>
      {!touch && k && <kbd>{k}</kbd>}
      <b className="rpg-ico rpg-ico-txt" aria-hidden="true">{mark}</b>
      <span>{name}<small>{q.locked ? q.lockText : sub}</small></span>
      {q.on && q.left > 0 && <b className="rpg-blood-ring" style={{ "--p": `${(q.left / q.dur) * 360}deg` }} />}
      {q.cd > 0 && !q.on && <em>{Math.ceil(q.cd)}</em>}
      {q.cd > 0 && !q.on && <i style={{ width: `${(q.cd / q.max) * 100}%` }} />}
    </button>
  );
}

export function BloodButtons({ v, keys, touch, onShot, onShotUp, onShotCancel, onSmash, onSmashUp, onSword, onVeil, onField, onFieldUp, onConv, onWave, onHook, onNew }) {
  if (!v) return null;
  const s = v.shot, m = v.smash, f = v.form, c = v.conv, d = v.field, w = v.sword;
  const on = w.making || w.held;
  const swordSub = f.locked ? `직업 Lv ${BLOOD.unlock.shape}` : w.making ? "검을 만드는 중" : w.held ? `평타로 베기 · ${Math.ceil(w.hold)}초` : w.low ? "혈량 부족" : `혈량 ${BLOOD_FORM.sword.cost}`;
  const lock = `직업 Lv ${BLOOD.unlock.shape}`;
  const shotSub = s.charging ? (s.short >= 0 ? `혈량 부족 — ${tierName(s.short)} 발사` : `${tierName(s.tier)} · 혈량 ${s.cost}`) : s.low ? "혈량 부족" : `혈량 ${s.cost}`;
  const smashSub = m.locked ? `직업 Lv ${m.at}` : m.charging ? (m.short >= 0 ? `혈량 부족 — ${m.short ? `+${m.short * 10}` : "기본"} 발동` : `${m.tier ? `+${m.tier * 10}` : "기본"} · 혈량 ${m.cost}`) : m.low ? "혈량 부족" : `혈량 ${m.cost}`;
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
      <TapBtn name={BLOOD_WAVE.name} q={v.wave} k={keys.wave} touch={touch} ico="wave" cost={BLOOD_WAVE.cost} onDown={onWave} />
      <TapBtn name={BLOOD_HOOK.name} q={v.hook} k={keys.hook} touch={touch} ico="hook" cost={BLOOD_HOOK.cost} onDown={onHook} />
      <button type="button" className={`rpg-skill blood ${(d.cd > 0 && !d.left) || d.locked || d.busy ? "cool" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onField(); }}
        onPointerUp={onFieldUp} onPointerCancel={onFieldUp}>
        {!touch && keys.field && <kbd>{keys.field}</kbd>}
        <SkillIco id="field" />
        <span>{BLOOD_FIELD.name}<small>{d.locked ? `직업 Lv ${BLOOD.unlock.field}` : d.left ? `유지 ${Math.ceil(d.left)}초` : d.busy ? `${v.state.split(" ")[0]} 중` : "혈량 소모 없음"}</small></span>
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
      {onNew && <>
        <NewBtn name={BLOOD_PIERCE.name} mark="관" q={v.pierce} k={keys.pierce} touch={touch} sub={v.pierce.low ? "혈량 부족" : `혈량 ${v.pierce.cost}`} onDown={() => onNew("pierce")} />
        <NewBtn name={BLOOD_SEA.name} mark="해" q={{ ...v.sea, dur: BLOOD_SEA.dur }} k={keys.sea} touch={touch} sub={v.sea.on ? `유지 ${Math.ceil(v.sea.left)}초` : v.sea.low ? "혈량 부족" : `혈량 ${v.sea.cost}`} onDown={() => onNew("sea")} />
        <NewBtn name={BLOOD_LEGION.name} mark="군" q={{ ...v.legion, dur: BLOOD_LEGION.dur }} k={keys.legion} touch={touch} sub={v.legion.on ? `분신 ${Math.ceil(v.legion.left)}초` : v.legion.low ? "혈량 부족" : `혈량 ${v.legion.cost}`} onDown={() => onNew("legion")} />
        <NewBtn name={BLOOD_ORIGIN.name} mark="맥" q={v.origin} k={keys.origin} touch={touch} sub={v.origin.on ? "차징 중" : v.origin.low ? "혈량 부족" : `혈량 ${v.origin.cost}`} onDown={() => onNew("origin")} />
        <NewBtn name={BLOOD_AWAKE.name} mark="지" q={{ ...v.awake, dur: BLOOD_AWAKE.dur }} k={keys.awake} touch={touch} sub={v.awake.on ? `각성 ${Math.ceil(v.awake.left)}초` : `${BLOOD_AWAKE.dur}초 각성`} onDown={() => onNew("awake")} />
      </>}
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
