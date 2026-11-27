/* 히든 직업 Gambler 002 화면 — 베팅 칩 줄(레벨 카드 HP 아래) · 스킬 칸 단추 · 스탯 창 칸(11월 16일 실제 게임 적용).
   값은 gamblerJob.js gamblerView(방장은 판정 상태 · 손님은 스냅샷 줄 57). 판정은 하지 않는다 — 누름만 보낸다.
   틀 · 단추는 BLOOD-001(BloodHud.jsx)과 같은 기존 것(.rpg-lv-row · .rpg-skill · .rpg-blood-stat)을 쓰고 금빛만 얹는다.
   아이콘은 직접 그린 도트 시트 gm_icons(24px 칸) — 오른쪽 판에서는 2배(48px)로만 보인다 */
import { GAMBLER, GAMBLER_NAME, GAMBLER_TITLE, GAMBLER_COLORS, GM_TRAIN_NAMES, GM_CHIP, GM_SKILLS, GM_SLOTS, GM_BET, GM_CASINO } from "./game/gamblerData.js";
import { gmJobNeed, gmTrainNeed } from "./game/gamblerJob.js";
import { GAMBLER_PX_SRC, GAMBLER_PX, GAMBLER_ICON } from "./game/gamblerPxData.js";
import { OX_ICON, oxIconStyle } from "./game/onyxData.js";

const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
const LAST = { dice: GM_SKILLS.dice.name, rain: GM_SKILLS.rain.name };
// 아이콘 한 칸 — 크기는 CSS(.rpg-ico.gm)가 정한다(비율 배치라 어느 크기에서도 칸이 맞는다)
const icoStyle = (i) => ({ backgroundImage: `url(${GAMBLER_PX_SRC}gm_icons.webp)`, backgroundSize: `${GAMBLER_PX.gm_icons.cols * 100}% 100%`,
  backgroundPosition: `${(i / (GAMBLER_PX.gm_icons.cols - 1)) * 100}% 0`, imageRendering: "pixelated" });
const Ico = ({ id }) => <b className="rpg-ico gm" style={id === "dopa" ? oxIconStyle(OX_ICON.dopa) : icoStyle(GAMBLER_ICON[id])} aria-hidden="true" />;   // 도파민은 Codex 그림

// 스킬 칸 아래 한 줄 — 지금 상태가 먼저, 아니면 한 줄 설명
function subOf(v, s) {
  const D = GM_SKILLS[s];
  if (v.lv < GAMBLER.unlock[s]) return `직업 Lv ${GAMBLER.unlock[s]}`;
  if (s === "veil") return v.sh ? `보호막 ${fmt(v.sh.v)} · ${v.sh.left.toFixed(1)}초` : `보호막 ${D.dur}초`;
  if (s === "dice") return `눈 1~6 · 불운 ${v.luck}/${v.need}`;
  if (s === "rain") return "코인 공격";
  if (s === "dd") return !v.last ? "다시 낼 공격 없음" : v.chips < D.cost ? `칩 ${D.cost}개 필요` : `칩 ${D.cost}개 · ${LAST[v.last]} 다시`;
  if (s === "table") return v.tbl > 0 ? `유지 ${Math.ceil(v.tbl)}초` : `장판 ${D.dur}초`;
  if (s === "edge") return v.edge > 0 ? `유지 ${Math.ceil(v.edge)}초` : `코인 피해 +${Math.round(D.dmg * 100)}%`;
  if (s === "dopa") return "꽝부터 잭팟까지";
  return "궁극기";
}
// 레벨 카드 HUD 값 — RpgView setHud 가 부른다
export function gamblerHud(v) {
  if (!v) return null;
  const skills = GM_SLOTS.map((q) => {
    const locked = v.lv < GAMBLER.unlock[q.s], on = (q.s === "table" && v.tbl > 0) || (q.s === "edge" && v.edge > 0) || (q.s === "veil" && !!v.sh);
    return { s: q.s, act: q.act, name: GM_SKILLS[q.s].name, cd: v.cd[q.s] || 0, max: v.cdMax[q.s] || 1, locked, on, sub: subOf(v, q.s),
      low: !locked && q.s === "dd" && (v.chips < GM_SKILLS.dd.cost || !v.last) };
  });
  return { chips: v.chips, max: v.max, full: v.chips >= v.max, lv: v.lv, tint: v.tint, contract: v.contract, trial: v.trial || 0, skills,
    sh: v.sh, edge: v.edge, tbl: v.tbl };
}

// 레벨 카드 — 베팅 칩 줄. 7칸이 다 차면 "풀 베팅"(강조는 이 한 곳)
export function GamblerBar({ v }) {
  if (!v) return null;
  return (
    <span className="rpg-lv-row rpg-gm-row">
      <span className="rpg-lv-tag">칩</span>
      <span className={`rpg-gm-chips ${v.full ? "full" : ""}`} aria-label={`베팅 칩 ${v.chips}/${v.max}`}>
        {Array.from({ length: v.max }, (_, i) => <i key={i} className={i < v.chips ? "on" : ""} />)}
      </span>
      <span className="rpg-lv-num">{v.full ? <b className="rpg-gm-full">풀 베팅</b> : `${v.chips}/${v.max}`}
        {v.trial > 0 && <small className="rpg-gm-note">{GM_CASINO.name} 시험 {v.trial}/3단계</small>}
        {v.contract && <small className="rpg-gm-note">황금 계약 — 풀 베팅 ×{GM_BET.mulContract * GM_BET.coins}</small>}</span>
    </span>
  );
}

// 스킬 칸 단추 — 황금 칩(평타 · 누르고 있는 동안) + 전용 스킬 일곱(한 번 누르면 바로)
export function GamblerButtons({ v, keyOf, touch, onUse, onFire, onFireUp }) {
  if (!v) return null;
  return (
    <>
      <button type="button" className="rpg-skill gm"
        onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 안 되면 그냥 둔다 */ } onFire(); }}
        onPointerUp={onFireUp} onPointerCancel={onFireUp}>
        {!touch && keyOf("fire") && <kbd>{keyOf("fire")}</kbd>}
        <Ico id="chip" />
        <span>{GM_CHIP.name}<small>평타 · 적중하면 칩 +{GM_CHIP.gain}</small></span>
      </button>
      {v.skills.map((q) => (
        <button key={q.s} type="button" className={`rpg-skill gm ${(q.cd > 0 && !q.on) || q.locked ? "cool" : ""} ${q.low ? "low" : ""} ${q.on ? "on" : ""}`}
          onPointerDown={(e) => { e.preventDefault(); onUse(q.s); }}>
          {!touch && keyOf(q.act) && <kbd>{keyOf(q.act)}</kbd>}
          <Ico id={q.s} />
          <span>{q.name}<small>{q.sub}</small></span>
          {q.cd > 0 && <em>{Math.ceil(q.cd)}</em>}
          {q.cd > 0 && <i style={{ width: `${Math.min(100, (q.cd / q.max) * 100)}%` }} />}
        </button>
      ))}
    </>
  );
}

// 스탯 창 — 직업 레벨 · 연마 셋 · 연마 합계 색. 값은 gamblerView 그대로(v)
const TINT_NAMES = { gold: "금빛 칩", frost: "청백 테두리", plum: "자주 무늬" };
const TINT_COLOR = { gold: GAMBLER_COLORS.base, frost: GAMBLER_COLORS.frost, plum: GAMBLER_COLORS.accent };
export function GamblerStat({ v }) {
  if (!v) return null;
  const top = v.lv >= GAMBLER.maxLv, need = gmJobNeed(v.lv), pct = (a, b) => `${Math.min(100, (a / Math.max(1, b)) * 100)}%`;
  const sum = v.tr.reduce((n, q) => n + q[0], 0);
  return (
    <div className="rpg-blood-stat rpg-gm-stat">
      <div className="rpg-blood-stat-head">
        <b>{GAMBLER_NAME}</b>
        <span>{GAMBLER_TITLE} · 직업 레벨 <em>{v.lv}</em><small>/{GAMBLER.maxLv}</small></span>
      </div>
      <span className="rpg-lv-bar xp"><span style={{ width: top ? "100%" : pct(v.xp, need) }} /></span>
      <small className="rpg-blood-stat-xp">{top ? "최고 레벨" : `경험치 ${v.xp} / ${need}`}</small>
      <div className="rpg-blood-stat-list">
        {GM_TRAIN_NAMES.map((name, i) => {
          const [l, x] = v.tr[i], max = l >= GAMBLER.train.max;
          return (
            <div key={name} className="rpg-blood-stat-row">
              <span className="rpg-blood-stat-name">{name}</span>
              <span className="rpg-lv-bar gm"><span style={{ width: max ? "100%" : pct(x, gmTrainNeed(l)) }} /></span>
              <span className="rpg-blood-stat-lv">{l}<small>/{GAMBLER.train.max}</small></span>
              <small className="rpg-blood-stat-xp">{max ? "최고" : `${x} / ${gmTrainNeed(l)}`}</small>
            </div>
          );
        })}
      </div>
      <p className="rpg-blood-stat-tint">
        <i style={{ background: TINT_COLOR[v.tint] }} />
        연마 합계 <em>{sum}</em> · {TINT_NAMES[v.tint]}
        <small>{GAMBLER.tint.frost} 이상 청백 테두리 · {GAMBLER.tint.plum} 이상 자주 무늬 · {GAMBLER.contract} 황금 계약</small>
      </p>
    </div>
  );
}
