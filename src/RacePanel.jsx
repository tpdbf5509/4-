import { useEffect, useRef, useState } from "react";
import { RACE, RACE_MOUNTS, MOUNT_BY_ID } from "./game/raceData.js";
import { whyRaceJoin } from "./game/race.js";
import { drawMobIcon } from "./game/rpgArt.js";
import { todayKey } from "./game/shop.js";

/* 광장 레이스 관리인 창 — 상점 · 가방과 같은 .shop 틀 · 공통 버튼. 탈것을 고르고 참가한다. 판정은 방장이 다시 한다(race.js raceInput) */
const PICK_KEY = "flg:raceMount";   // 마지막으로 고른 탈것 — 이 기기 편의
const ICON_W = 64, ICON_H = 48;
const loadPick = () => { try { const v = localStorage.getItem(PICK_KEY); return MOUNT_BY_ID[v] ? v : "wolf"; } catch { return "wolf"; } };
const savePick = (v) => { try { localStorage.setItem(PICK_KEY, v); } catch { /* 저장이 막혀 있으면 이번만 */ } };
// 능력 막대 — 탈것 여섯 종 사이에서 가장 낮은 값 1칸 · 가장 높은 값 5칸
const STATS = [["cruise", "기본"], ["sprint", "질주"], ["st", "체력"], ["regen", "회복"]];
const span = Object.fromEntries(STATS.map(([k]) => [k, [Math.min(...RACE_MOUNTS.map((m) => m[k])), Math.max(...RACE_MOUNTS.map((m) => m[k]))]]));
const pips = (k, v) => { const [lo, hi] = span[k]; return 1 + Math.round(((v - lo) / (hi - lo || 1)) * 4); };

function MountIcon({ mob }) {
  const ref = useRef(null);
  useEffect(() => {
    const paint = () => { const c = ref.current; if (c) drawMobIcon(c.getContext("2d"), mob, ICON_W, ICON_H, false, false); };
    paint();
    const ts = [900, 2400].map((ms) => setTimeout(paint, ms));   // 그림 파일이 늦게 오면 다시 그린다
    return () => ts.forEach(clearTimeout);
  }, [mob]);
  return <canvas ref={ref} width={ICON_W} height={ICON_H} aria-hidden="true" />;
}

export default function RacePanel({ self, seat, race, names, act, onClose }) {
  const dialog = useRef(null);
  const [pick, setPick] = useState(() => race?.me?.m || loadPick());
  useEffect(() => { const prev = document.activeElement; dialog.current?.focus(); return () => prev?.focus?.(); }, []);
  if (!self) return null;
  const R = race || { ph: "idle", t: 0, n: 0, list: [], last: [] };
  const joined = !!R.me && R.ph === "open";
  const why = whyRaceJoin({ ph: R.ph, rs: R.list }, { ...self, pi: seat });
  const choose = (id) => { setPick(id); savePick(id); if (joined) act("race", { op: "join", m: id }); };
  const used = self.bag && self.bag.day && self.bag.day.d === todayKey() ? self.bag.day.race || 0 : 0;
  const status = R.ph === "open" ? (R.n < RACE.minRacers ? `모집 중 · ${R.n}/${RACE.max}명 · 한 명 더 모이면 출발` : `모집 중 · ${R.n}/${RACE.max}명 · ${Math.ceil(R.t)}초 뒤 출발`)
    : R.ph === "idle" ? `${RACE.minRacers}~${RACE.max}명이 함께 달립니다` : "지금 달리는 중입니다";
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <section ref={dialog} tabIndex={-1} className="shop race-panel" role="dialog" aria-modal="true" aria-labelledby="race-title"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
        <header className="shop-top">
          <div className="shop-title"><b id="race-title">몹 레이스</b><span>광장 미니게임</span></div>
          <button type="button" className="shop-x" aria-label="몹 레이스 창 닫기" onClick={onClose}>×</button>
        </header>
        <div className="shop-body race-body">
          <p className="race-now" aria-live="polite">{status}</p>
          <p className="race-rule">질주를 누르고 있으면 빨라지지만 체력을 씁니다. 체력이 바닥나면 지쳐서 한동안 느려집니다. 위아래로 몰아 금빛 발판을 밟으면 부스터가 붙고 진흙에 빠지면 느려집니다.</p>
          <p className="race-rule">상자를 지나면 아이템을 얻습니다. 부스터 · 미끄럼 점액 · 방패 가운데 하나이고 뒤처질수록 부스터가 잘 나옵니다. 공격 키나 아이템 버튼으로 씁니다.</p>
          <h3 className="shop-h">탈것</h3>
          <ul className="race-mounts">
            {RACE_MOUNTS.map((m) => (
              <li key={m.id}>
                <button type="button" className={pick === m.id ? "on" : ""} aria-pressed={pick === m.id} onClick={() => choose(m.id)}>
                  <MountIcon mob={m.mob} />
                  <b>{m.name}</b>
                  <small>{m.tip}</small>
                  <span className="race-pips">
                    {STATS.map(([k, label]) => <i key={k}><em>{label}</em>{"■".repeat(pips(k, m[k]))}<s>{"■".repeat(5 - pips(k, m[k]))}</s></i>)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {R.ph === "open" && R.list.length > 0 && (
            <ul className="race-crew">
              {R.list.map((q) => <li key={q.pi}>{names[q.pi] || "모험가"} · {MOUNT_BY_ID[q.m]?.name}</li>)}
            </ul>
          )}
          <div className="adv-acts">
            {joined
              ? <button type="button" className="shop-btn" onClick={() => act("race", { op: "leave" })}>참가 취소</button>
              : <button type="button" className="shop-btn main" disabled={why.length > 0} title={why[0] || ""} onClick={() => act("race", { op: "join", m: pick })}>{MOUNT_BY_ID[pick].name} 타고 참가</button>}
          </div>
          {!joined && why.length > 0 && <p className="adv-why">{why[0]}</p>}
          <p className="race-rule">1등 {RACE.prize[0].toLocaleString("ko-KR")} · 2등 {RACE.prize[1].toLocaleString("ko-KR")} · 3등 {RACE.prize[2].toLocaleString("ko-KR")} · 완주 {RACE.finishCoin}코인. 하루 {RACE.daily}번까지 받습니다(오늘 {Math.min(used, RACE.daily)}번).</p>
          {R.last.length > 0 && (
            <>
              <h3 className="shop-h">지난 레이스</h3>
              <ol className="race-last">
                {R.last.map((x, i) => <li key={i}><span>{x.pl ? `${x.pl}등` : "실패"}</span><b>{x.nm}</b><small>{MOUNT_BY_ID[x.m]?.name} · {x.tm ? `${x.tm.toFixed(2)}초` : "-"}</small></li>)}
              </ol>
            </>
          )}
        </div>
      </section>
    </>
  );
}
