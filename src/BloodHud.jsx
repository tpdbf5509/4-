/* 히든 직업 BLOOD-001 화면 — 혈량 게이지 줄(레벨 카드 HP 아래)과 스킬 칸 단추(11월 14일 1단계).
   값은 bloodJob.js bloodView(방장은 판정 상태 · 손님은 스냅샷 줄 56). 판정은 하지 않는다 — 누름 · 뗌만 보낸다.
   게이지는 절대 상한 180 을 늘 보이고 안정 상한 · 150 · 180 자리에 1px 구분선. 겹치면 하나만 그린다(연출및세부사항) */
import { BLOOD, BLOOD_SHOT } from "./game/bloodJobData.js";
import { stableCap, shotTier, shotTimeTier } from "./game/bloodJob.js";

// 레벨 카드 HUD 값 — RpgView setHud 가 부른다
export function bloodHud(v) {
  if (!v) return null;
  const cap = stableCap(v.lv), b = Math.round(v.b);
  const ch = v.ch, t = ch ? ch.t : 0;
  const tier = ch ? Math.max(0, shotTier(t, b)) : Math.max(0, shotTier(0, b)), timeTier = ch ? shotTimeTier(t) : 0;
  return {
    b, cap, lv: v.lv, xp: v.xp, state: b > cap ? "증폭" : "안정",
    shot: { cd: v.cd.shot || 0, max: BLOOD_SHOT.cd, cost: BLOOD_SHOT.tiers[tier].cost, tier, timeTier, charging: !!ch, u: ch ? Math.min(1, t / BLOOD_SHOT.full) : 0,
      low: b < BLOOD_SHOT.need, short: ch && timeTier > tier ? tier : -1 },
    conv: { cd: v.cd.conv || 0, max: BLOOD.convert.cd, full: b >= cap },
  };
}

export function BloodBar({ v }) {
  if (!v) return null;
  const pct = (n) => `${Math.min(100, (n / BLOOD.abs) * 100)}%`;
  const marks = [...new Set([v.cap, 150, BLOOD.abs])];
  const use = v.shot.charging ? BLOOD_SHOT.tiers[v.shot.tier].cost : 0;   // 차징 중 예상 소모 — 발동 전에는 깎지 않는다(빗금)
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

// 스킬 칸 단추 — 적혈탄(누르고 있으면 차징) · 혈량 전환
export function BloodButtons({ v, keys, touch, onShot, onShotUp, onShotCancel, onConv }) {
  if (!v) return null;
  const s = v.shot, c = v.conv;
  const sub = s.charging ? (s.short >= 0 ? `혈량 부족 — ${s.short ? `${s.short}단계` : "기본"} 발사` : `${s.tier ? `${s.tier}단계` : "기본"} · 혈량 ${s.cost}`) : s.low ? "혈량 부족" : `혈량 ${s.cost}`;
  return (
    <>
      <button type="button" className={`rpg-skill blood ${s.cd > 0 ? "cool" : ""} ${s.low && !s.charging ? "low" : ""}`}
        onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onShot(); }}
        onPointerUp={onShotUp} onPointerCancel={onShotCancel}>
        {!touch && keys.shot && <kbd>{keys.shot}</kbd>}
        <span>적혈탄<small>{sub}</small></span>
        {s.charging && <b className="rpg-blood-dots"><i className={s.timeTier >= 1 ? "on" : ""} /><i className={s.timeTier >= 2 ? "on" : ""} /></b>}
        {s.cd > 0 && <em>{Math.ceil(s.cd)}</em>}
        {s.cd > 0 && <i style={{ width: `${(s.cd / s.max) * 100}%` }} />}
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
