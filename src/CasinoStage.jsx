/* 도박장 연출 — 주사위 홀짝 · 슬롯머신 · 랜덤 상자.
   결과는 서버(방장)가 정한다(shop.js rpgShop). 화면은 누를 때부터 돌리기만 하다가 결과(note)가 오면 그 결과로 멈춘다.
   연출이 끝나기 전에는 결과 줄과 코인 숫자를 누른 때 그대로 둔다 — 미리 보이지 않게. */
import { useCallback, useEffect, useRef, useState } from "react";
import sfx from "./game/sfx.js";
import { SLOT } from "./game/shopData.js";

// 연출 길이(초). min: 결과가 일찍 와도 이만큼은 돌린다 · land: 멈추는 동작 · show: 결과 제목을 띄워 두는 시간
export const CAS_FX = {
  dice: { min: 0.8, land: 0.75, show: 1.8 },
  slot: { min: 0.7, gap: 0.42, stop: 0.5, show: 1.9 },
  box: { min: 0.9, land: 0.55, show: 1.9 },
  skipShow: 0.9,          // 연출을 건너뛸 때 결과 제목을 띄우는 초
};
export const CASINO_SKIP = "flg:casinoSkip";      // 도박 연출 건너뛰기 — 켜 두면 돌리지 않고 결과만 바로

const landTime = (game) => (game === "slot" ? CAS_FX.slot.gap * 2 + CAS_FX.slot.stop : CAS_FX[game].land);

// 한 판의 흐름 — idle(지난 결과를 보여 둠) · spin(결과를 기다리며 돌림) · land(결과로 멈추는 중) · done(결과 제목)
export function useCasinoRun({ note, setQuiet, coins, skip }) {
  const [run, setRun] = useState({ phase: "idle" });
  const sent = useRef(null);                          // 누를 때의 note · 게임 — 이것과 다른 note 가 오면 그게 결과다
  const timers = useRef([]);
  const startAt = useRef(0);
  const runs = useRef(0);
  const later = (fn, s) => { timers.current.push(setTimeout(fn, s * 1000)); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); if (setQuiet) setQuiet(false); }, [setQuiet]);
  const start = useCallback((game) => {
    sent.current = { note, game };
    startAt.current = performance.now();
    if (setQuiet) setQuiet({ coins });               // 결과 줄을 숨기고 코인은 누른 때 숫자로 둔다
    setRun({ phase: "spin", game, key: ++runs.current });
  }, [note, setQuiet, coins]);
  useEffect(() => {
    if (run.phase !== "spin" || !sent.current || !note || note === sent.current.note) return;
    const { game } = sent.current;
    sent.current = null;
    const quietOff = () => { if (setQuiet) setQuiet(false); };
    if (!note.ok || note.game !== game) { later(() => { setRun({ phase: "idle" }); quietOff(); }, 0); return; }   // 막혔다 — 이유는 창 위 한 줄에 뜬다
    const wait = skip ? 0 : Math.max(0, CAS_FX[game].min - (performance.now() - startAt.current) / 1000);
    const land = skip ? 0 : landTime(game);
    const key = run.key;
    later(() => setRun({ phase: "land", game, res: note, key, stopped: 0 }), wait);
    if (game === "slot" && !skip) {
      for (let i = 0; i < 3; i++) later(() => { setRun((r) => (r.key === key ? { ...r, stopped: i + 1 } : r)); sfx.shot(i < 2 ? "orb" : "ball"); }, wait + i * CAS_FX.slot.gap + CAS_FX.slot.stop * 0.8);
    }
    if (game === "dice" && !skip) later(() => sfx.shot("ball"), wait + CAS_FX.dice.land * 0.7);
    if (game === "box" && !skip) later(() => sfx.play("build"), wait + CAS_FX.box.land * 0.4);
    later(() => {
      setRun((r) => (r.key === key ? { ...r, phase: "done", stopped: 3 } : r));
      quietOff();
      if (note.win || note.game === "box") sfx.play(winBig(note) ? "clear" : note.game === "box" ? "coin" : "bless");
    }, wait + land);
    later(() => setRun((r) => (r.key === key ? { ...r, phase: "idle" } : r)), wait + land + (skip ? CAS_FX.skipShow : CAS_FX[game].show));
  }, [note, run, setQuiet, skip]);
  return { run, start, busy: run.phase !== "idle" };
}

// 크게 이겼나 — 슬롯 별 · 7, 상자 특별 무기 · 전설
const winBig = (res) => (res.game === "slot" && res.win && ["star", "seven"].includes(res.reels[0]))
  || (res.game === "box" && res.got && (res.got.kind === "special" || res.got.g >= 4));

/* ── 주사위 — 왼쪽에서 굴러 들어와 결과 면으로 멈춘다. 모서리면 비스듬히 선다 ── */
// 면 배치 — 앞 1 · 뒤 6 · 오른쪽 3 · 왼쪽 4 · 위 2 · 아래 5. 값은 그 면을 앞으로 돌려 오는 회전
const FACE_TURN = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };
const FACE_AT = { 1: "rotateY(0deg)", 6: "rotateY(180deg)", 3: "rotateY(90deg)", 4: "rotateY(-90deg)", 2: "rotateX(90deg)", 5: "rotateX(-90deg)" };
// 눈 자리(3×3 칸 번호 0~8)
const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function DieFace({ n }) {
  return (
    <span className={`dice-face f${n}`} style={{ transform: `${FACE_AT[n]} translateZ(var(--dz))` }}>
      {Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[n].includes(i) ? "on" : ""} />)}
    </span>
  );
}
export function DiceStage({ run, pick }) {
  const mine = run.game === "dice" ? run : { phase: "idle" };
  const res = mine.res;
  const roll = res ? res.roll : 1;
  const edge = res && res.roll === 0;
  const [rx, ry] = FACE_TURN[edge ? 1 : roll] || [0, 0];
  const odd = roll % 2 === 1;
  const title = mine.phase === "done" && res ? (edge ? "모서리!" : `${roll} · ${odd ? "홀" : "짝"}`) : "";
  const kind = mine.phase === "done" && res ? (res.win ? "win" : "lose") : "";
  return (
    <div className={`cas-stage dice-stage dice-${mine.phase} ${kind ? `cas-${kind}` : ""} ${edge ? "dice-edge" : ""}`} key={mine.key || 0}
      style={{ "--rx": `${rx}deg`, "--ry": `${ry}deg` }}>
      <span className="dice-shadow" />
      <span className="dice-roll">
        <span className="dice-cube">{[1, 2, 3, 4, 5, 6].map((n) => <DieFace key={n} n={n} />)}</span>
      </span>
      {title && <b className="cas-title">{title}</b>}
      <span className="cas-tag">{mine.phase === "spin" || mine.phase === "land" ? "굴리는 중…" : pick ? `${pick === "odd" ? "홀" : "짝"}에 걸었습니다` : "홀 또는 짝을 고르세요"}</span>
    </div>
  );
}

/* ── 슬롯머신 — 세 릴이 돌다가 왼쪽부터 하나씩 멈춘다 ── */
// 그림 — 파스텔 톤의 작은 SVG. 상점 그림 체계와 겹치지 않게 선 하나 · 면 하나로만 그린다
function Sym({ id }) {
  if (id === "cherry") return (
    <svg viewBox="0 0 40 40" className="slot-sym"><path d="M20 8 C 18 16, 14 20, 13 25 M20 8 C 23 15, 26 19, 27 24" fill="none" stroke="#9fb592" strokeWidth="2" />
      <path d="M20 8 C 25 5, 30 7, 31 10 C 26 11, 22 10, 20 8 Z" fill="#a9c3a0" />
      <circle cx="13" cy="28" r="6" fill="#d99a9a" /><circle cx="27" cy="27" r="6" fill="#cf8f93" /><circle cx="11" cy="26" r="1.6" fill="#f3d6d0" /></svg>);
  if (id === "lemon") return (
    <svg viewBox="0 0 40 40" className="slot-sym"><ellipse cx="20" cy="21" rx="13" ry="10" fill="#e8d590" transform="rotate(-18 20 21)" />
      <path d="M8 26 L5 28 M32 16 L35 13" stroke="#d9c178" strokeWidth="2.4" strokeLinecap="round" /><ellipse cx="16" cy="18" rx="4" ry="2" fill="#f4e7b8" transform="rotate(-18 16 18)" /></svg>);
  if (id === "bell") return (
    <svg viewBox="0 0 40 40" className="slot-sym"><path d="M20 7 C 12 7, 11 15, 11 21 C 11 25, 8 27, 8 29 L 32 29 C 32 27, 29 25, 29 21 C 29 15, 28 7, 20 7 Z" fill="#dcbf86" />
      <circle cx="20" cy="31.5" r="3" fill="#c9a96e" /><rect x="18.5" y="4" width="3" height="4" rx="1.5" fill="#c9a96e" /><path d="M15 13 C 14 16, 14 19, 14 22" stroke="#f0dcae" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>);
  if (id === "star") return (
    <svg viewBox="0 0 40 40" className="slot-sym"><polygon points="20,5 24.3,15 35,15.6 26.8,22.6 29.4,33.4 20,27.6 10.6,33.4 13.2,22.6 5,15.6 15.7,15" fill="#bba3cf" />
      <polygon points="20,10 22.5,16.5 17.5,16.5" fill="#d8c8e6" /></svg>);
  return (
    <svg viewBox="0 0 40 40" className="slot-sym"><text x="20" y="32" textAnchor="middle" fontFamily="'Do Hyeon', sans-serif" fontSize="32" fill="#d98f80" stroke="#f2c4b8" strokeWidth="0.8">7</text></svg>);
}
const SYM_IDS = SLOT.map((s) => s.id);
const FILL = 7;                                     // 멈출 때 결과 위로 지나가는 칸 수
const fillers = (k, i) => Array.from({ length: FILL }, (_, n) => SYM_IDS[(k * 7 + i * 3 + n * 2) % SYM_IDS.length]);
function Reel({ i, spin, stop, at, k }) {
  if (spin) return (
    <span className="slot-reel"><span className="slot-strip spin" style={{ animationDelay: `${-i * 0.11}s` }}>
      {[...SYM_IDS, ...SYM_IDS, ...SYM_IDS].map((id, n) => <span key={n} className="slot-cell"><Sym id={id} /></span>)}
    </span></span>
  );
  const above = fillers(k, i), below = SYM_IDS[(SYM_IDS.indexOf(at) + 1) % SYM_IDS.length];
  const list = stop ? [...above, at, below] : [above[FILL - 1], at, below];   // 멈춘 뒤에도 위아래 이웃 칸이 바뀌지 않게
  return (
    <span className="slot-reel"><span className={`slot-strip ${stop ? "stop" : "rest"}`} style={{ "--n": stop ? FILL : 1 }}>
      {list.map((id, n) => <span key={n} className={`slot-cell ${n === list.length - 2 ? "hit" : ""}`}><Sym id={id} /></span>)}
    </span></span>
  );
}
export function SlotStage({ run }) {
  const mine = run.game === "slot" ? run : { phase: "idle" };
  const res = mine.res;
  const reels = res && res.reels ? res.reels : ["seven", "seven", "seven"];
  const stopped = mine.phase === "land" ? mine.stopped || 0 : 3;
  const def = res && res.win ? SLOT.find((s) => s.id === reels[0]) : null;
  const done = mine.phase === "done" && res;
  const kind = done ? (res.win ? (winBig(res) ? "big" : "win") : "lose") : "";
  return (
    <div className={`cas-stage slot-stage slot-${mine.phase} ${kind ? `cas-${kind}` : ""}`}>
      <span className="slot-frame">
        {[0, 1, 2].map((i) => (
          <Reel key={`${mine.key || 0}-${i}`} i={i} k={mine.key || 0} spin={mine.phase === "spin" || (mine.phase === "land" && i >= stopped)}
            stop={mine.phase === "land" || (mine.phase === "done" && !!res)} at={reels[i]} />
        ))}
        <span className="slot-line" />
      </span>
      {done && <b className="cas-title">{res.win && def ? `${def.mul}배!` : "꽝"}</b>}
      <span className="cas-tag">{mine.phase === "spin" || mine.phase === "land" ? "돌아가는 중…" : "세 칸이 같으면 당첨"}</span>
    </div>
  );
}

/* ── 랜덤 상자 — 흔들리다가 뚜껑이 열리며 나온 것의 등급 색으로 빛난다 ── */
export function BoxStage({ run }) {
  const mine = run.game === "box" ? run : { phase: "idle" };
  const got = mine.res && mine.res.got;
  const open = (mine.phase === "land" || mine.phase === "done") && got;
  const tone = got ? (got.kind === "special" ? "sp" : got.kind === "weapon" ? `g${got.g}` : "po") : "";
  const title = mine.phase === "done" && got ? (got.kind === "special" ? "특별 무기!" : got.kind === "weapon" ? "무기" : "물약") : "";
  return (
    <div className={`cas-stage box-stage box-${mine.phase} ${open ? `box-open box-${tone}` : ""} ${got && winBig(mine.res) && mine.phase === "done" ? "cas-big" : ""}`} key={mine.key || 0}>
      <span className="box-rays" />
      <span className="box-body"><span className="box-lid" /><span className="box-band" /></span>
      {title && <b className="cas-title">{title}</b>}
      <span className="cas-tag">{mine.phase === "spin" ? "여는 중…" : "열어 볼까요?"}</span>
    </div>
  );
}
