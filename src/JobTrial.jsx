/* ── 직업 체험 — 캐릭터를 정하기 전에 훈련장에서 한 판 ─────────────────────
   직업 · 원소는 한 번 정하면 바꿀 수 없다. 그래서 고르기 전에 이 기기에서만 도는 작은 세계를 만들어
   훈련장 허수아비를 쳐 본다. 규칙은 게임과 같은 rpg.js 를 그대로 쓰고 그림도 drawRpg 를 쓴다.
   서버 · 저장과 이어지지 않는다. 경험치 · 코인 · 기록은 남지 않는다(수치는 trainData.js TRIAL). */
import { useEffect, useRef, useState } from "react";
import { W, H } from "./game/world.js";
import {
  RPG_CREW_MAX, JOBS, ELEMS, JOB_BY_ID, ELEM_BY_ID, makeWorld, rpgSyncSeats, rpgJoin, rpgStep, trainView, skillName,
} from "./game/rpg.js";
import { rpgInput } from "./game/rpgInput.js";
import { drawRpg } from "./game/rpgArt.js";
import { TRAIN, TRIAL } from "./game/trainData.js";
import { GIFT, RESET } from "./game/itemData.js";
import { loadKeys, keyMap, keyOf } from "./game/keys.js";
import { useTouch } from "./ui/touch.js";

const STEP_MAX = 0.05;   // 한 번에 돌리는 판정 시간(초) — RpgView 와 같다
const HUD_MS = 160;      // 숫자 칸을 다시 그리는 간격(ms)
const DIRS = ["up", "down", "left", "right"];

// 체험 세계 — 자리 0 에 체험 캐릭터 하나만 세우고 훈련장으로 보낸다
function trialWorld(look) {
  const g = makeWorld();
  g.mySeat = 0;
  g.out = null;                                   // 보낼 곳이 없다
  const seats = Array.from({ length: RPG_CREW_MAX }, (_, i) => (i === 0 ? { id: "trial", name: look.name, hero: look } : null));
  rpgSyncSeats(g, seats);
  // 선물 · 서버 초기화는 받은 것으로 둔다 — 체험 캐릭터에 선물 상자가 생기지 않게
  rpgJoin(g, 0, { name: look.name, ts: 1, lv: TRIAL.lv, gift: GIFT.id, rs: RESET.id, auto: 1 }, "trial");
  const h = g.heroes[0];
  h.map = "train";
  [h.x, h.y] = TRAIN.spawn;
  h.gateCd = 1;
  return g;
}

export default function JobTrial({ name, job0, elem0, gender, onPick, onClose }) {
  const touch = useTouch();
  const [job, setJob] = useState(job0 || "warrior");
  const [elem, setElem] = useState(elem0 || "flame");
  const [round, setRound] = useState(0);          // 다시 하기 · 바꾸기마다 늘어 세계를 새로 만든다
  const [hud, setHud] = useState({ left: TRIAL.sec, dps: 0, tot: 0, hits: 0, sk: 0, started: false, over: false });
  const cvsRef = useRef(null);
  const G = useRef(null);
  const clock = useRef({ started: false, left: TRIAL.sec });
  const [binds] = useState(loadKeys);

  const look = { name: name || TRIAL.name, job, elem, gender: gender || "m" };
  const el = ELEM_BY_ID[elem];

  // 세계를 새로 만든다 — 직업 · 원소를 바꾸거나 한 판 더
  useEffect(() => {
    G.current = trialWorld({ name: name || TRIAL.name, job, elem, gender: gender || "m" });
    clock.current = { started: false, left: TRIAL.sec };
    setHud({ left: TRIAL.sec, dps: 0, tot: 0, hits: 0, sk: 0, started: false, over: false });
  }, [job, elem, gender, name, round]);

  // 입력 — 시간이 다 되면 받지 않는다. 처음 입력부터 시간을 센다
  const send = (kind, dir) => {
    const g = G.current;
    if (!g || clock.current.left <= 0) return;
    clock.current.started = true;
    rpgInput(g, { cls: 0, kind, dir });
  };
  const sendRef = useRef(send);
  sendRef.current = send;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 키보드 — 게임과 같은 키 설정(이동 · 평타 · 큰 기술 · 대쉬)
  useEffect(() => {
    const held = [];
    const map = () => keyMap(binds);
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape") return closeRef.current();
      const a = map()[e.code];
      if (!a) return;
      if (DIRS.includes(a)) {
        e.preventDefault();
        if (e.repeat || held.includes(a)) return;
        held.push(a);
        return sendRef.current("hold", held.slice());
      }
      if (!["fire", "skill", "dash"].includes(a)) return;
      e.preventDefault();
      if (e.repeat) return;
      sendRef.current(a, a === "fire" ? true : undefined);
    };
    const onUp = (e) => {
      const a = map()[e.code];
      if (DIRS.includes(a)) {
        const i = held.indexOf(a);
        if (i >= 0) held.splice(i, 1);
        sendRef.current("hold", held.slice());
      }
      if (a === "fire") sendRef.current("fire", false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); };
  }, []);

  // 판을 누르면 그 자리로 걸어간다 — 휴대폰도 손가락으로 움직인다
  const tapMove = (e) => {
    const g = G.current, cvs = cvsRef.current;
    if (!g || !cvs || !g.cam) return;
    const r = cvs.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W + g.cam.x;
    const y = ((e.clientY - r.top) / r.height) * H + g.cam.y;
    send("mv", { x, y, m: "train" });
  };

  // 루프 — 이 기기에서만 판정하고 그린다
  useEffect(() => {
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bgs = {};
    let raf, last = performance.now(), hudAt = 0;
    const loop = (now) => {
      const real = Math.max(0, (now - last) / 1000);
      last = now;
      const g = G.current, c = clock.current;
      if (g) {
        const h = g.heroes[0];
        if (c.left > 0) {
          for (let left = Math.min(real, 0.25); left > 0; left -= STEP_MAX) rpgStep(g, Math.min(left, STEP_MAX));
          if (h) {
            h.gateCd = 1;                         // 훈련장 문으로 나가지 않는다
            if (h.map !== "train") { h.map = "train"; [h.x, h.y] = TRAIN.spawn; }
          }
          if (c.started) {
            c.left = Math.max(0, c.left - real);
            if (c.left <= 0 && h) { h.hold = []; h.fire = 0; h.auto = 0; h.dest = null; }   // 끝 — 멈춘다
          }
        }
        drawRpg(ctx, g, bgs);
        if (now - hudAt >= HUD_MS && h) {
          hudAt = now;
          const t = trainView(g, h) || {};
          setHud({ left: c.left, dps: t.dps || 0, tot: Math.round(t.tot || 0), hits: t.hits || 0, sk: h.sk || 0, started: c.started, over: c.left <= 0 });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const key = (id) => (!touch && keyOf(binds, id)) || "";
  const fmt = (n) => Math.round(n).toLocaleString("ko-KR");

  return (
    <div className="jt">
      <div className="jt-head">
        <div>
          <h2 className="jt-title">직업 체험 <span>훈련장 한 판 · {TRIAL.sec}초</span></h2>
          <p className="mk-note">고르기 전에 쳐 보세요. 처음 시작하는 {TRIAL.lv}레벨 그대로입니다. 기록 · 보상은 남지 않습니다.</p>
        </div>
        <button type="button" className="btn-ghost" onClick={onClose}>체험 끝내기</button>
      </div>

      <div className="jt-body">
        <div className="jt-stage">
          <canvas ref={cvsRef} className="jt-cvs" onPointerDown={tapMove} aria-label="훈련장 체험 판" />
          <div className="jt-bar">
            <span className={`jt-time ${hud.left <= 10 && hud.started ? "low" : ""}`}>{hud.started ? `${Math.ceil(hud.left)}초` : "움직이면 시작"}</span>
            <span>초당 피해 <b>{fmt(hud.dps)}</b></span>
            <span>쌓인 피해 <b>{fmt(hud.tot)}</b></span>
            <span>맞힌 수 <b>{fmt(hud.hits)}</b></span>
          </div>
          {hud.over && (
            <div className="jt-end" role="dialog" aria-label="체험 결과">
              <b>{JOB_BY_ID[job].name} · {el.name}</b>
              <p>쌓인 피해 {fmt(hud.tot)} · 맞힌 수 {fmt(hud.hits)}</p>
              <div className="mk-row">
                {onPick && <button type="button" className="btn-main" onClick={() => onPick(job, elem)}>이 조합으로 고르기</button>}
                <button type="button" className="btn-ghost" onClick={() => setRound((n) => n + 1)}>한 판 더</button>
              </div>
              {onPick && <p className="mk-note">고른 뒤에도 게임 시작 전까지는 바꿀 수 있습니다.</p>}
            </div>
          )}
          <div className="jt-pads">
            <button type="button" className="btn-ghost" onClick={() => send("skill")}>
              큰 기술{hud.sk > 0 ? ` ${Math.ceil(hud.sk)}초` : ""}{key("skill") && <kbd>{key("skill")}</kbd>}
            </button>
            <button type="button" className="btn-ghost" onClick={() => send("dash")}>대쉬{key("dash") && <kbd>{key("dash")}</kbd>}</button>
          </div>
        </div>

        <div className="jt-side">
          <section>
            <h3 className="jt-h">직업</h3>
            <div className="jt-chips">
              {JOBS.map((j) => (
                <button key={j.id} type="button" className={`jt-chip ${job === j.id ? "on" : ""}`} aria-pressed={job === j.id} onClick={() => setJob(j.id)}>
                  {j.name}<em>{j.weapon}</em>
                </button>
              ))}
            </div>
            <p className="mk-note">{JOB_BY_ID[job].note}</p>
          </section>
          <section>
            <h3 className="jt-h">원소</h3>
            <div className="jt-chips">
              {ELEMS.map((e) => (
                <button key={e.id} type="button" className={`jt-chip ${elem === e.id ? "on" : ""}`} style={{ "--ec": e.light }}
                  aria-pressed={elem === e.id} onClick={() => setElem(e.id)}>
                  <span className="mk-dot" />{e.name}
                </button>
              ))}
            </div>
            <p className="mk-note">평타가 {el.hit}. 큰 기술 <b>{skillName(look)}</b>은 {el.big}.</p>
          </section>
          <section>
            <h3 className="jt-h">조작</h3>
            <ul className="jt-keys">
              {touch ? (
                <>
                  <li>판을 누르면 그 자리로 걷습니다</li>
                  <li>가까운 허수아비는 저절로 칩니다</li>
                  <li>아래 버튼으로 큰 기술 · 대쉬</li>
                </>
              ) : (
                <>
                  <li><kbd>{key("up")}</kbd><kbd>{key("left")}</kbd><kbd>{key("down")}</kbd><kbd>{key("right")}</kbd> 이동 · 판을 눌러도 걷습니다</li>
                  <li><kbd>{key("fire")}</kbd> 평타 · 가까우면 저절로 칩니다</li>
                  <li><kbd>{key("skill")}</kbd> 큰 기술 · <kbd>{key("dash")}</kbd> 대쉬</li>
                </>
              )}
            </ul>
          </section>
          {onPick && <button type="button" className="btn-main jt-pick" onClick={() => onPick(job, elem)}>{JOB_BY_ID[job].name} · {el.name} 고르기</button>}
          <p className="mk-note">바꾸면 새 판이 시작됩니다. 직업 · 원소는 게임을 시작할 때 굳고 그 뒤로는 바꿀 수 없습니다.</p>
        </div>
      </div>
    </div>
  );
}
