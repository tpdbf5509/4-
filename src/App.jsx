import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  W, H, CX, CY, P, CLASSES, PERKS, PERK_BY_ID, PERK_IDS, SEATS, CREW_MAX,
  castleTier, castleCost, CASTLE_TIERS, LEAVE_FORCE, LEAVE_T,
  SKILLS, ENEMY, ETYPES, SLOTS, SPOTS, LANES, TOTAL_WAVES, WAVE_OPTIONS, DIFFS, DEFAULT_DIFF, prepTime,
  makeGame, waveKind, bossWave, MOVE_KEYS, BUILD_KEYS, SKILL_KEYS, SELL_KEYS, KEY_HINT,
} from "./game/world.js";
import {
  step, stepVisual, applyMove, applyGoto, doBuild, doSell, doCastle, doSkill,
  applyReward, applyLeave, applyHold, startPrep, towerCosts, markMove,
  packSnapshot, applySnapshot, applyOut,
} from "./game/logic.js";
import sfx from "./game/sfx.js";
import { paintTerrain, draw } from "./game/art.js";
import { joinRoom, makeCode, myId, netReady } from "./net/room.js";
import { sendFeedback, loadDraft, saveDraft, FEEDBACK_MAX } from "./net/feedback.js";
import { Shield, Coin, ClassIcon, PerkIcon, HomeIcon } from "./ui/icons.jsx";
import { TowerChar, charOf } from "./ui/chars.jsx";
import "./ui/style.css";

const SNAP_HZ = 12;

/* 손가락으로 하는 기기인지 — 마우스가 없고 손끝처럼 뭉툭한 입력이면 참 */
function useTouch() {
  const [on, setOn] = useState(() =>
    typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia("(hover: none) and (pointer: coarse)");
    const f = (e) => setOn(e.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return on;
}

/* ── 홈 · 로비 · 게임을 오가는 바깥 껍데기 ─────────────────── */
export default function App() {
  const me = useMemo(() => myId(), []);
  const [name, setName] = useState(() => localStorage.getItem("flg:name") || "");
  const [screen, setScreen] = useState("home");
  const [code, setCode] = useState(() => {
    const q = new URLSearchParams(location.search).get("room");
    return q ? q.toUpperCase().slice(0, 4) : "";
  });
  const [lobby, setLobby] = useState(null);       // { hostId, seats }
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  const roomRef = useRef(null);
  const hostRef = useRef(false);
  const bossRef = useRef(false);        // 대기실에서 바로 들어간 결전 — false · "boss" · "titan"
  const seatsRef = useRef(new Array(SEATS).fill(null));
  const peersRef = useRef([]);

  const isHost = lobby?.hostId === me;
  const mySeat = lobby ? lobby.seats.findIndex((s) => s && s.id === me) : -1;

  const wavesRef = useRef(TOTAL_WAVES);
  const diffRef = useRef(DEFAULT_DIFF);
  const publishLobby = useCallback(() => {
    const next = { hostId: me, seats: seatsRef.current, waves: wavesRef.current, diff: diffRef.current };
    setLobby(next);
    roomRef.current?.send("lobby", next);
  }, [me]);

  /* 방을 함께 쓰는 일들 — 라운드 수, 난이도, 시작, 대기실로 돌아가기.
     누구나 할 수 있다. 판정은 방장 한 명이 해야 하니, 방장이 아니면 방장에게 부탁만 한다. */
  const setWaves = useCallback((n) => {
    if (!WAVE_OPTIONS.includes(n)) return;
    if (!hostRef.current) return void roomRef.current?.send("ask", { what: "waves", v: n });
    wavesRef.current = n;
    publishLobby();
  }, [publishLobby]);

  const setDiff = useCallback((d) => {
    if (!DIFFS[d]) return;
    if (!hostRef.current) return void roomRef.current?.send("ask", { what: "diff", v: d });
    diffRef.current = d;
    publishLobby();
  }, [publishLobby]);

  // 방장보다 뒤에 정의되는 함수들이라, 방 만들 때 넘겨주려고 여기에 담아 둔다
  const askRef = useRef(null);

  // 방장은 들어온 사람에게 빈 병과를 하나 내어준다
  const reseat = useCallback(() => {
    const present = new Set(peersRef.current.map((p) => p.id));
    const seats = seatsRef.current.map((s) => (s && present.has(s.id) ? s : null));
    peersRef.current.forEach((peer) => {
      if (seats.some((s) => s && s.id === peer.id)) return;
      if (seats.filter(Boolean).length >= CREW_MAX) return;   // 정원이 차면 구경만
      const free = seats.findIndex((s) => !s);
      if (free >= 0) seats[free] = { id: peer.id, name: peer.name || "수비대원" };
    });
    seatsRef.current = seats;
    publishLobby();
  }, [publishLobby]);

  const connect = useCallback((roomCode, asHost) => {
    setError("");
    setConnecting(true);
    hostRef.current = asHost;
    const nick = (name || "수비대원").slice(0, 8);
    localStorage.setItem("flg:name", nick);

    const room = joinRoom(roomCode, {
      id: me,
      name: nick,
      onPeers: (peers) => {
        peersRef.current = peers;
        if (hostRef.current) reseat();
      },
      onStatus: (st) => {
        if (st === "SUBSCRIBED") {
          setConnecting(false);
          if (hostRef.current) {
            seatsRef.current = [{ id: me, name: nick }, null, null, null];
            publishLobby();
          } else {
            room.send("hello", { name: nick });
          }
        }
        if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
          setConnecting(false);
          setError("연결이 끊겼습니다. 잠시 뒤 다시 시도해 주세요.");
        }
      },
    });
    roomRef.current = room;

    room.on("hello", () => { if (hostRef.current) reseat(); });
    room.on("lobby", (d) => { if (!hostRef.current) setLobby(d); });
    room.on("pick", (d, from) => {
      if (!hostRef.current) return;
      const seats = seatsRef.current.slice();
      if (d.cls < 0 || d.cls >= SEATS) return;
      if (seats[d.cls]) return;                               // 이미 누가 골랐다
      const cur = seats.findIndex((s) => s && s.id === from);
      if (cur < 0 && seats.filter(Boolean).length >= CREW_MAX) return;   // 정원이 찼다
      const who = cur >= 0 ? seats[cur] : { id: from, name: d.name || "수비대원" };
      if (cur >= 0) seats[cur] = null;
      seats[d.cls] = who;
      seatsRef.current = seats;
      publishLobby();
    });
    room.on("start", (d) => {
      if (hostRef.current) return;
      const b = d && d.boss;
      bossRef.current = b === true ? "boss" : (b === "boss" || b === "titan") ? b : false;
      setScreen("game");
    });
    room.on("toLobby", () => { if (!hostRef.current) setScreen("lobby"); });
    // 손님이 부탁한 방 전체의 일 — 판정은 방장이 한 번만 한다
    room.on("ask", (d) => {
      const a = askRef.current;
      if (!hostRef.current || !d || !a) return;
      if (d.what === "waves") a.setWaves(d.v);
      else if (d.what === "diff") a.setDiff(d.v);
      else if (d.what === "start") a.startGame(d.v);
      else if (d.what === "lobby") a.backToLobby();
    });

    setCode(roomCode);
    setScreen("lobby");
    history.replaceState(null, "", `?room=${roomCode}`);
  }, [me, name, publishLobby, reseat]);

  // 방을 못 찾으면 알려준다
  useEffect(() => {
    if (screen !== "lobby" || lobby || connecting) return;
    const t = setTimeout(() => {
      if (!lobby) setError("그 코드의 방을 찾지 못했습니다. 코드를 다시 확인해 주세요.");
    }, 4000);
    return () => clearTimeout(t);
  }, [screen, lobby, connecting]);

  useEffect(() => () => roomRef.current?.leave(), []);

  const leave = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    hostRef.current = false;
    seatsRef.current = new Array(SEATS).fill(null);
    setLobby(null);
    setScreen("home");
    history.replaceState(null, "", location.pathname);
  }, []);

  const pick = useCallback((cls) => {
    if (!lobby) return;
    if (lobby.seats[cls]) return;
    if (hostRef.current) {
      const seats = seatsRef.current.slice();
      const cur = seats.findIndex((s) => s && s.id === me);
      if (cur < 0 && seats.filter(Boolean).length >= CREW_MAX) return;
      const who = cur >= 0 ? seats[cur] : { id: me, name: name || "수비대원" };
      if (cur >= 0) seats[cur] = null;
      seats[cls] = who;
      seatsRef.current = seats;
      publishLobby();
    } else {
      roomRef.current?.send("pick", { cls, name });
    }
  }, [lobby, me, name, publishLobby]);

  // boss 는 false 이거나 곧장 들어갈 결전의 상대 — "boss" · "titan"
  const startGame = useCallback((boss) => {
    const kind = boss === "boss" || boss === "titan" ? boss : false;
    // 손님이 눌렀으면 방장이 시작해 주고, 그 알림을 받아 다 같이 들어간다
    if (!hostRef.current) return void roomRef.current?.send("ask", { what: "start", v: kind });
    bossRef.current = kind;
    roomRef.current?.send("start", { boss: kind });
    setScreen("game");
  }, []);

  const backToLobby = useCallback(() => {
    if (!hostRef.current) return void roomRef.current?.send("ask", { what: "lobby" });
    roomRef.current?.send("toLobby", {});
    setScreen("lobby");
  }, []);


  useEffect(() => {
    askRef.current = { setWaves, setDiff, startGame, backToLobby };
  }, [setWaves, setDiff, startGame, backToLobby]);

  if (!netReady) {
    return (
      <div className="page center-page">
        <div className="scroll-panel">
          <h2>서버 설정이 필요합니다</h2>
          <p>VITE_SUPABASE_URL 과 VITE_SUPABASE_KEY 를 .env 에 넣고 다시 실행해 주세요.</p>
        </div>
      </div>
    );
  }

  if (screen === "home") {
    return (
      <Home
        name={name} setName={setName}
        code={code} setCode={setCode}
        error={error}
        onCreate={() => connect(makeCode(), true)}
        onJoin={() => code.length === 4 && connect(code.toUpperCase(), false)}
      />
    );
  }

  if (screen === "lobby") {
    return (
      <Lobby
        code={code} lobby={lobby} me={me} mySeat={mySeat}
        error={error} connecting={connecting}
        onPick={pick} onStart={startGame} onLeave={leave} onWaves={setWaves} onDiff={setDiff}
        onStartBoss={(kind) => startGame(kind)}
      />
    );
  }

  return (
    <GameView
      room={roomRef.current}
      isHost={isHost}
      seats={lobby?.seats || []}
      waves={lobby?.waves || TOTAL_WAVES}
      diff={lobby?.diff ?? DEFAULT_DIFF}
      mySeat={mySeat}
      startBoss={bossRef.current}
      onBack={backToLobby}
    />
  );
}

/* ── 홈 ─────────────────────────────────────────────────── */
function Home({ name, setName, code, setCode, error, onCreate, onJoin }) {
  return (
    <div className="page center-page">
      <div className="home">
        <h1>네 갈래 방어선</h1>
        <p className="tag">
          북·동·남·서에서 밀려오는 적을 네 명이 나눠 막는 협동 디펜스.
          각자 자기 컴퓨터나 휴대폰에서 들어와 한 방에서 함께 지킵니다.
        </p>

        <label className="field">
          <span>이름</span>
          <input
            id="nick" value={name} maxLength={8} placeholder="수비대원"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <button className="btn-main wide" onClick={onCreate}>새 방 만들기</button>

        <div className="or"><span>또는 코드로 입장</span></div>

        <div className="join-row">
          <input
            id="code" className="code-input" value={code} maxLength={4} placeholder="ABCD"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && onJoin()}
          />
          <button className="btn-ghost tall" onClick={onJoin} disabled={code.length !== 4}>입장</button>
        </div>

        {error && <p className="err">{error}</p>}
      </div>
    </div>
  );
}

/* ── 로비 ───────────────────────────────────────────────── */
function Lobby({ code, lobby, me, mySeat, error, connecting, onPick, onWaves, onDiff, onStart, onStartBoss, onLeave }) {
  const touch = useTouch();
  const [copied, setCopied] = useState("");
  const link = `${location.origin}${location.pathname}?room=${code}`;
  const seats = lobby?.seats || new Array(SEATS).fill(null);
  const filled = seats.filter(Boolean).length;
  const full = filled >= CREW_MAX;
  const waves = lobby?.waves || TOTAL_WAVES;
  const diff = lobby?.diff ?? DEFAULT_DIFF;

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("fail");
    }
  };

  return (
    <div className="page center-page">
      <div className="lobby">
        <div className="lobby-head">
          <div>
            <h1>대기실</h1>
            <p className="tag">
              병과 열하나 가운데 넷을 고릅니다. 맡은 병과의 탑만 지을 수 있으니 공격·제어·지원을 섞어 보세요.
              방장이 시작하면 모두의 화면에서 함께 시작합니다.
            </p>
          </div>
          <button className="btn-ghost" onClick={onLeave}>나가기</button>
        </div>

        <div className="invite">
          <div className="invite-code">
            <span className="invite-label">방 코드</span>
            <strong>{code}</strong>
          </div>
          <div className="invite-actions">
            <button className="btn-ghost" onClick={() => copy(code, "code")}>
              {copied === "code" ? "복사됨" : "코드 복사"}
            </button>
            <button className="btn-ghost" onClick={() => copy(link, "link")}>
              {copied === "link" ? "복사됨" : "초대 링크 복사"}
            </button>
          </div>
        </div>
        {copied === "fail" && <p className="err">복사에 실패했습니다. 코드를 직접 알려주세요.</p>}

        {connecting && <p className="muted">방에 연결하는 중…</p>}
        {error && <p className="err">{error}</p>}

        <div className="rounds">
          <span className="rounds-label">라운드</span>
          <div className="rounds-btns">
            {WAVE_OPTIONS.map((n) => (
              <button
                key={n}
                className={`round-btn ${waves === n ? "on" : ""}`}
                onClick={() => onWaves(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="rounds-note">길게 잡아도 적이 세지는 속도는 그만큼 완만해집니다</span>
        </div>

        <div className="rounds">
          <span className="rounds-label">난이도</span>
          <div className="rounds-btns">
            {DIFFS.map((d, i) => (
              <button
                key={d.id}
                className={`round-btn ${diff === i ? "on" : ""} diff-${d.id}`}
                onClick={() => onDiff(i)}
              >
                {d.name}
              </button>
            ))}
          </div>
          <span className="rounds-note">{DIFFS[diff].note}</span>
        </div>

        <div className="seats">
          {CLASSES.map((cls, i) => {
            const who = seats[i];
            const mine = who && who.id === me;
            const locked = !who && full && mySeat < 0;
            return (
              <button
                key={i}
                className={`seat ${who ? "taken" : "free"} ${mine ? "mine" : ""} ${locked ? "locked" : ""}`}
                style={{ "--pc": P[i].key, "--pcl": P[i].light, "--pcd": P[i].dark }}
                onClick={() => onPick(i)}
                disabled={!!who || locked}
              >
                <span className={`seat-badge ${P[i].pale ? "pale" : ""}`}><ClassIcon i={i} /></span>
                <span className="seat-name">{cls.name} <em>{cls.cost}골드</em></span>
                <span className="seat-role">{cls.role}</span>
                <span className="seat-note">{cls.note}</span>
                {charOf(cls.id) && (
                  <span className="seat-char"><TowerChar id={cls.id} /></span>
                )}
                <span className="seat-skill">
                  <b>{SKILLS[i].name}</b> {SKILLS[i].note}
                </span>
                <span className="seat-who">
                  {who ? (
                    <>
                      {who.name}
                      {who.id === lobby?.hostId && <em> · 방장</em>}
                      {mine && <em> · 나</em>}
                    </>
                  ) : locked ? "정원이 찼습니다" : "비어 있음 — 눌러서 맡기"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="lobby-foot">
          <span className="foot-me">
            {mySeat >= 0 && charOf(CLASSES[mySeat].id) && (
              <TowerChar id={CLASSES[mySeat].id} className="foot-char" />
            )}
            <span className="muted">
              {filled}/{CREW_MAX}명 참가 중 · 내 병과 {mySeat >= 0 ? CLASSES[mySeat].name : "없음"}
            </span>
          </span>
          <span className="start-row">
            <button className="btn-ghost btn-test" onClick={() => onStartBoss("boss")} disabled={filled === 0}
              title="오우거 지휘관과의 1차 결전으로 곧장 들어갑니다">
              1차 보스전
            </button>
            <button className="btn-ghost btn-test" onClick={() => onStartBoss("titan")} disabled={filled === 0}
              title="대군주와의 2차 결전으로 곧장 들어갑니다">
              2차 보스전
            </button>
            <button className="btn-main" onClick={() => onStart(false)} disabled={filled === 0}>
              방어 시작
            </button>
          </span>
        </div>

        <p className="keyhint">
          {touch
            ? <>조작 — 판 아래 화살표로 <kbd>이동</kbd> 또는 돌판을 <kbd>누르기</kbd> · <kbd>건설</kbd> · <kbd>팔기</kbd> · <kbd>스킬</kbd> 버튼</>
            : <>조작 — 이동 <kbd>{KEY_HINT.move}</kbd> 또는 돌판 <kbd>클릭</kbd> · 건설 <kbd>{KEY_HINT.build}</kbd> · 팔기 <kbd>{KEY_HINT.sell}</kbd> · 스킬 <kbd>{KEY_HINT.skill}</kbd></>}
        </p>

        <Feedback
          name={seats.find((q) => q && q.id === me)?.name} room={code} result="lobby"
          diff={DIFFS[diff]?.id || null}
          cls={mySeat >= 0 ? CLASSES[mySeat].id : null}
        />
      </div>
    </div>
  );
}

/* ── 의견 적는 칸 ───────────────────────────────────────────
   접어 두었다가 눌러서 편다. 보낸 글은 게임 안에서 다시 볼 수 없고,
   받는 쪽에서만 읽는다. 무엇이 같이 실리는지는 칸 아래에 적어 둔다. */
function Feedback({ name, room, result, wave, total, diff, cls, open: openAt }) {
  const [open, setOpen] = useState(Boolean(openAt));
  const [text, setText] = useState(() => loadDraft());
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState(null);      // { ok, why }
  const left = FEEDBACK_MAX - text.length;

  const change = useCallback((e) => {
    const v = e.target.value.slice(0, FEEDBACK_MAX);
    setText(v);
    setSaid(null);
    saveDraft(v);
  }, []);

  const send = useCallback(async () => {
    setBusy(true);
    const r = await sendFeedback({ body: text, name, room, result, wave, total, diff, cls });
    setBusy(false);
    setSaid(r);
    if (r.ok) setText("");
  }, [text, name, room, result, wave, total, diff, cls]);

  if (!open) {
    return (
      <button type="button" className="say-open" onClick={() => setOpen(true)}>
        의견 남기기
      </button>
    );
  }
  return (
    <div className="say">
      <div className="say-head">
        <span className="say-title">의견 남기기</span>
        <button type="button" className="say-close" onClick={() => setOpen(false)}>접기</button>
      </div>
      <textarea
        className="say-box" value={text} onChange={change} rows={3} maxLength={FEEDBACK_MAX}
        placeholder="불편한 곳, 어려운 곳, 있었으면 하는 것을 적어 주세요."
      />
      <div className="say-foot">
        <span className="say-left">{left}자 남음</span>
        <button type="button" className="btn-ghost say-send" onClick={send} disabled={busy || !text.trim()}>
          {busy ? "보내는 중…" : "보내기"}
        </button>
      </div>
      {said && <p className={said.ok ? "say-ok" : "say-bad"}>{said.why}</p>}
      <p className="say-note">
        적은 글과 함께 이름{room ? " · 방 코드" : ""}
        {wave ? ` · 웨이브 ${wave}` : ""}{diff ? ` · 난이도` : ""}{cls ? ` · 병과` : ""}가 같이 갑니다.
      </p>
    </div>
  );
}

/* ── 화면 조작판 — 자판이 없는 기기에서 쓴다 ────────────────
   방향은 누르는 동안 눌린 것으로 두고, 나머지는 한 번 누르면 한 번 나간다. */
function TouchPad({ phase, onPress, onRelease, onTap, ready }) {
  const arena = phase === "arena";
  const live = phase === "prep" || phase === "wave" || arena;
  const dir = (d) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 지원 안 하면 그냥 둔다 */ }
      onPress(d);
    },
    onPointerUp: (e) => { e.preventDefault(); onRelease(d); },
    onPointerCancel: () => onRelease(d),
    onLostPointerCapture: () => onRelease(d),
  });
  const tap = (k) => ({ onPointerDown: (e) => { e.preventDefault(); onTap(k); } });

  return (
    <div className={`pad ${live ? "" : "off"}`} aria-hidden={!live}>
      <div className="pad-dir">
        <button className="pkey up" {...dir("up")} aria-label="위로">▲</button>
        <button className="pkey left" {...dir("left")} aria-label="왼쪽">◀</button>
        <button className="pkey right" {...dir("right")} aria-label="오른쪽">▶</button>
        <button className="pkey down" {...dir("down")} aria-label="아래로">▼</button>
        <span className="pad-nub" />
      </div>
      <div className="pad-act">
        {!arena && <button className="pbtn sell" {...tap("sell")}>팔기</button>}
        <button className={`pbtn skill ${ready ? "ready" : ""}`} {...tap("skill")}>스킬</button>
        <button className="pbtn hit" {...tap("build")}>{arena ? "공격" : "건설"}</button>
      </div>
    </div>
  );
}

/* ── 게임 ───────────────────────────────────────────────── */
/* 보스 기록 — 고르는 창보다 먼저, 누가 얼마나 때렸는지 보여 준다.
   건너뛰기는 각자의 화면에서만 닫는다. 한 사람이 눌러도 남은 사람은 계속 본다. */
const SCORE_T = 4;

function BossScore({ score, seats, names, mySeat, onDone }) {
  const [left, setLeft] = useState(SCORE_T);
  const n = score.n;
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const rest = SCORE_T - (Date.now() - t0) / 1000;
      if (rest <= 0) { clearInterval(id); setLeft(0); onDone(n); }
      else setLeft(rest);
    }, 100);
    return () => clearInterval(id);
  }, [n, onDone]);
  const skip = () => onDone(n);

  const rows = score.dmg
    .map((v, i) => ({
      i, dmg: v || 0, aid: (score.aid || [])[i] || 0, hits: (score.hits || [])[i] || 0,
    }))
    .filter((r) => seats[r.i])
    .sort((a, b) => b.dmg - a.dmg || b.aid - a.aid);
  const total = rows.reduce((a, r) => a + r.dmg, 0) || 1;
  const top = rows.length ? rows[0].dmg : 0;
  const label = ENEMY[score.kind]?.label || "보스";
  const num = (v) => v.toLocaleString("ko-KR");

  return (
    <div className="curtain score">
      <div className="score-box">
        <div className="score-head">
          <h2>보스 기록</h2>
          <span className="score-sub">{label} · {score.secs}초 · 웨이브 {score.wave}</span>
        </div>

        <div className="score-list">
          {rows.map((r, k) => {
            const share = Math.round((r.dmg / total) * 100);
            const best = k === 0 && r.dmg > 0;
            return (
              <div key={r.i} className={`score-row ${best ? "best" : ""} ${r.i === mySeat ? "mine" : ""}`}
                style={{ "--pc": P[r.i].key, "--pcl": P[r.i].light }}>
                <span className="score-rank">{k + 1}</span>
                <span className="score-who">
                  <b>{names[r.i] || `${r.i + 1}P`}</b>
                  <em>{CLASSES[r.i].name}</em>
                </span>
                <span className="score-bar">
                  <span style={{ width: `${top > 0 ? (r.dmg / top) * 100 : 0}%` }} />
                </span>
                <span className="score-num">{num(r.dmg)}</span>
                <span className="score-pct">{share}%</span>
                <span className="score-note">
                  {r.aid > 0 ? `도운 피해 ${num(r.aid)}` : r.hits > 0 ? `${r.hits}대` : "—"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="score-foot">
          <span className="score-last">
            마지막 일격 {names[score.last] || `${score.last + 1}P`}
          </span>
          <button className="btn-ghost score-skip" onClick={skip}>
            건너뛰기 <em>{Math.ceil(left)}</em>
          </button>
        </div>
        <span className="score-drain"><span style={{ width: `${(left / SCORE_T) * 100}%` }} /></span>
      </div>
    </div>
  );
}

/* 값 상자 — 지금 이 자리에 얼마가 드는지 그대로 보여 준다.
   단계가 오를수록 값이 뛰므로 세 단계를 한 줄에 늘어놓고, 지금 낼 값 하나만 밝힌다. */
function CostBox({ cost, seat }) {
  const rows = [
    { key: "build", label: cost.name, gold: cost.build, on: cost.lv === 0 },
    ...cost.ups.map((gold, k) => ({
      key: `up${k}`, label: `${k + 2}단계`, gold, on: cost.lv === k + 1,
    })),
  ];
  const note = cost.here === "other" ? "남의 자리" : cost.lv >= 4 ? "최대 단계" : null;
  return (
    <div className="cost-box" style={{ "--pcl": P[seat].light }}>
      <span className="cost-head">건설 비용{note && <em>{note}</em>}</span>
      <span className="cost-rows">
        {rows.map((r) => (
          <span key={r.key}
            className={`cost-item ${r.on && !note ? "on" : ""} ${cost.gold < r.gold ? "short" : ""}`}>
            {r.label}<b>{r.gold}</b>
          </span>
        ))}
      </span>
    </div>
  );
}

function GameView({ room, isHost, seats, waves, diff, mySeat, startBoss, onBack }) {
  const cvsRef = useRef(null);
  const bgRef = useRef(null);
  const idx = useMemo(() => Array.from({ length: SEATS }, (_, i) => i), []);
  const seatFlags = useMemo(() => idx.map((i) => !!seats[i]), [idx, seats]);
  const names = useMemo(() => idx.map((i) => seats[i]?.name || ""), [idx, seats]);

  const G = useRef(null);
  if (!G.current) {
    const g = makeGame(seatFlags, waves, diff);
    g.names = names;
    g.mySeat = mySeat;
    if (import.meta.env.DEV) window.__G = g;    // 개발 중 상태를 들여다보려고
    // 시험용 — 대기실에서 바로 들어오면 그 상대를 만나는 웨이브에서 시작한다
    g.wave = startBoss ? bossWave(startBoss, g.total) : 1;
    startPrep(g);
    if (startBoss) g.timer = 0.6;
    G.current = g;
  }

  const touch = useTouch();
  G.current.touch = touch;                      // 판 안의 안내 글도 조작판에 맞춘다
  const [hud, setHud] = useState(() => snapHud(G.current));
  const [dropped, setDropped] = useState(false);
  // 이미 본 보스 기록 번호 — 건너뛰기는 각자의 화면에서만 닫는다
  const [seenScore, setSeenScore] = useState(0);
  const skipScore = useCallback((n) => setSeenScore((v) => Math.max(v, n)), []);
  const [mute, setMute] = useState(() => sfx.isMuted());
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const toggleMute = useCallback(() => {
    sfx.unlock();
    const v = !sfx.isMuted();
    sfx.setMuted(v);
    setMute(v);
  }, []);

  function snapHud(g) {
    return {
      phase: g.phase, wave: g.wave, total: g.total, timer: Math.max(0, g.timer),
      overWhy: g.overWhy || 0,
      hp: Math.max(0, Math.round(g.core.hp)), max: g.core.max,
      tier: castleTier(g), upCost: castleCost(g),
      cost: g.mySeat >= 0 ? towerCosts(g, g.mySeat) : null,
      left: (g.queueLeft ?? g.queue.length) + g.enemies.length,
      preview: g.preview || null,
      paused: g.paused, speed: g.speed,
      surge: g.surge || 0, diff: g.diff ?? DEFAULT_DIFF,
      boss: g.arena ? g.arena.hp / g.arena.max : 0,
      leave: (g.leave || []).map((v) => !!v), leaveT: g.leaveT || 0,
      offer: g.phase === "reward" ? g.offer : null,
      picked: g.phase === "reward" ? g.picked : null,
      score: g.phase === "reward" ? g.bossScore || null : null,
      players: g.players.map((p) => ({
        gold: Math.floor(p.gold), cd: Math.max(0, p.cd),
        lane: p.lane, slot: p.slot, built: p.built, kills: p.kills,
        perks: PERK_IDS.filter((id) => p.perks[id]).map((id) => [id, p.perks[id]]),
      })),
    };
  }

  /* 한 번의 조작 — 방장은 바로 판정하고, 손님은 방장에게 보낸다 */
  const act = useCallback((kind, dir) => {
    const g = G.current;
    if (mySeat < 0) return;
    if (kind === "leave") {
      sfx.unlock();
      if (isHost) applyLeave(g, mySeat, dir);
      else room?.send("input", { cls: mySeat, kind, dir });
      return;
    }
    if (kind === "hold") {
      // 결전장 — 누르고 있는 방향을 그대로 넘긴다
      applyHold(g, mySeat, dir);
      if (!isHost) room?.send("input", { cls: mySeat, kind, dir });
      return;
    }
    if (kind === "reward") {
      if (g.phase !== "reward") return;
      sfx.unlock();
      if (isHost) applyReward(g, mySeat, dir);
      else room?.send("input", { cls: mySeat, kind, dir });
      return;
    }
    if (g.phase !== "prep" && g.phase !== "wave" && g.phase !== "arena") return;
    if (g.paused) return;
    sfx.unlock();
    if (isHost) {
      if (kind === "move") applyMove(g, mySeat, dir);
      else if (kind === "goto") applyGoto(g, mySeat, dir);
      else if (kind === "build") doBuild(g, mySeat);
      else if (kind === "sell") doSell(g, mySeat);
      else if (kind === "castle") doCastle(g, mySeat);
      else doSkill(g, mySeat);
    } else {
      // 내 커서는 바로 움직이고, 판정은 방장에게 맡긴다.
      // 옮긴 자리마다 번호를 붙여 보내고, 방장이 그 번호를 돌려줄 때까지는
      // 늦게 온 자리로 되돌리지 않는다 (applySnapshot 에서 막는다).
      let seq;
      const guard = g.phase !== "arena";          // 결전장에서는 자리 번호를 쓰지 않는다
      if (kind === "move") { applyMove(g, mySeat, dir); if (guard) seq = markMove(g); }
      else if (kind === "goto") { applyGoto(g, mySeat, dir); if (guard) seq = markMove(g); }
      room?.send("input", { cls: mySeat, kind, dir, seq });
    }
  }, [isHost, mySeat, room]);

  /* 누르고 있는 방향 — 키보드와 화면 버튼이 같은 곳으로 들어온다 */
  const holdRef = useRef(null);
  if (!holdRef.current) holdRef.current = { dirs: [], wait: 0, timer: null };

  const inArena = useCallback(() => !!G.current && G.current.phase === "arena", []);

  const pressDir = useCallback((dir) => {
    const c = holdRef.current;
    if (c.dirs.includes(dir)) return;
    c.dirs.push(dir);
    if (inArena()) { act("hold", c.dirs.slice()); return; }   // 결전장은 누르는 동안 걷는다
    act("move", dir);
    c.wait = 0.24;
    if (!c.timer) {
      c.timer = setInterval(() => {
        if (!c.dirs.length || inArena()) return;
        c.wait -= 0.05;
        if (c.wait <= 0) { act("move", c.dirs[c.dirs.length - 1]); c.wait = 0.11; }
      }, 50);
    }
  }, [act, inArena]);

  const releaseDir = useCallback((dir) => {
    const c = holdRef.current;
    const i = c.dirs.indexOf(dir);
    if (i < 0) return;
    c.dirs.splice(i, 1);
    if (inArena()) act("hold", c.dirs.slice());
    if (!c.dirs.length && c.timer) { clearInterval(c.timer); c.timer = null; }
  }, [act, inArena]);

  const clearDirs = useCallback(() => {
    const c = holdRef.current;
    if (!c.dirs.length) return;
    c.dirs.length = 0;
    if (inArena()) act("hold", []);
    if (c.timer) { clearInterval(c.timer); c.timer = null; }
  }, [act, inArena]);

  useEffect(() => () => {
    const c = holdRef.current;
    if (c.timer) { clearInterval(c.timer); c.timer = null; }
  }, []);

  /* 키보드 — 자기 병과만 조작한다 */
  useEffect(() => {
    if (mySeat < 0) return;
    function onKey(e) {
      const dir = MOVE_KEYS[e.code];
      const isBuild = BUILD_KEYS.includes(e.code);
      const isSkill = SKILL_KEYS.includes(e.code);
      const isSell = SELL_KEYS.includes(e.code);
      if (!dir && !isBuild && !isSkill && !isSell) return;
      e.preventDefault();
      if (e.repeat) return;
      if (dir) pressDir(dir);
      else if (isBuild) act("build");
      else if (isSell) act("sell");
      else act("skill");
    }
    function onUp(e) {
      const dir = MOVE_KEYS[e.code];
      if (dir) releaseDir(dir);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clearDirs);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clearDirs);
    };
  }, [act, mySeat, pressDir, releaseDir, clearDirs]);

  /* 마우스 — 자리를 눌러 바로 옮겨 간다 */
  useEffect(() => {
    const cvs = cvsRef.current;
    if (!cvs) return;

    // 화면 좌표를 판 좌표로 옮기고, 그 자리에 있는 돌판을 찾는다
    const slotAt = (e) => {
      const r = cvs.getBoundingClientRect();
      if (!r.width || !r.height) return -1;
      const x = (e.clientX - r.left) * (W / r.width);
      const y = (e.clientY - r.top) * (H / r.height);
      // 손끝은 마우스보다 뭉툭하고, 작은 화면에서는 돌판도 함께 작아진다.
      // 그래서 손가락으로 누를 때는 받아 주는 범위를 넓힌다.
      const far = e.pointerType === "touch" ? Math.pow(Math.max(1.6, (W / r.width) * 0.5), 2) : 1;
      let best = -1, bd = Infinity;
      for (let i = 0; i < SLOTS.length; i++) {
        const dx = (SLOTS[i].x - x) / 26, dy = (SLOTS[i].y - y) / 21;
        const d = dx * dx + dy * dy;
        if (d <= far && d < bd) { bd = d; best = i; }
      }
      return best;
    };

    // 성채 언덕 위인지
    const onCastle = (e) => {
      const r = cvs.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const x = (e.clientX - r.left) * (W / r.width);
      const y = (e.clientY - r.top) * (H / r.height);
      const dx = (x - CX) / 66, dy = (y - (CY + 10)) / 39;
      return dx * dx + dy * dy <= 1;
    };

    const onMove = (e) => {
      const g = G.current;
      const i = slotAt(e);
      const onKeep = i < 0 && onCastle(e);
      g.hover = i;
      g.hoverCastle = onKeep;
      cvs.style.cursor = (i >= 0 || onKeep) && mySeat >= 0 ? "pointer" : "default";
    };
    const onDown = (e) => {
      if (e.button !== 0) return;
      const i = slotAt(e);
      if (i >= 0) { e.preventDefault(); act("goto", i); return; }
      if (onCastle(e)) { e.preventDefault(); act("castle"); }
    };
    const onLeave = () => { G.current.hover = -1; G.current.hoverCastle = false; };

    cvs.addEventListener("pointermove", onMove);
    cvs.addEventListener("pointerdown", onDown);
    cvs.addEventListener("pointerleave", onLeave);
    return () => {
      cvs.removeEventListener("pointermove", onMove);
      cvs.removeEventListener("pointerdown", onDown);
      cvs.removeEventListener("pointerleave", onLeave);
    };
  }, [act, mySeat]);

  const chooseReward = useCallback((k) => {
    sfx.play("build");
    act("reward", k);
  }, [act]);

  /* 멈춤과 속도는 판 전체의 일이라 방장 판에서만 바뀐다.
     손님이 눌렀으면 방장에게 보내고, 결과는 스냅샷으로 다 같이 돌아온다. */
  const doPause = useCallback(() => {
    const g = G.current;
    if (g.phase !== "prep" && g.phase !== "wave") return;
    g.paused = !g.paused;
    setHud(snapHud(g));
  }, []);

  const doSpeed = useCallback((v) => {
    const g = G.current;
    g.speed = v === 2 ? 2 : 1;
    g.paused = false;
    setHud(snapHud(g));
  }, []);

  /* 통신 */
  useEffect(() => {
    if (!room) return;
    const offs = [];
    if (isHost) {
      offs.push(room.on("input", (d) => {
        const g = G.current;
        if (!g.seats[d.cls]) return;
        if (d.kind === "reward") return applyReward(g, d.cls, d.dir);
        if (d.kind === "hold") return applyHold(g, d.cls, d.dir);
        if (d.kind === "leave") return applyLeave(g, d.cls, d.dir);
        if (d.kind === "pause") return doPause();
        if (d.kind === "speed") return doSpeed(d.dir);
        // 결전장에서도 손님의 조작을 받는다 — 평타와 스킬이 이 길로 온다.
        // 결전장에서 뜻이 없는 것(팔기·성채·그 자리로)은 각자 알아서 물러난다.
        if (g.phase !== "prep" && g.phase !== "wave" && g.phase !== "arena") return;
        if (g.paused) return;
        if (d.kind === "move" || d.kind === "goto") {
          if (d.kind === "move") applyMove(g, d.cls, d.dir);
          else applyGoto(g, d.cls, d.dir);
          // 어디까지 받았는지 돌려줘야 손님 커서가 제자리를 지킨다
          if (d.seq) g.players[d.cls].ack = d.seq;
        }
        else if (d.kind === "build") doBuild(g, d.cls);
        else if (d.kind === "sell") doSell(g, d.cls);
        else if (d.kind === "castle") doCastle(g, d.cls);
        else if (d.kind === "skill") doSkill(g, d.cls);
      }));
    } else {
      let last = Date.now();
      offs.push(room.on("snap", (d) => { last = Date.now(); applySnapshot(G.current, d); }));
      offs.push(room.on("out", (d) => applyOut(G.current, d)));
      const watch = setInterval(() => setDropped(Date.now() - last > 6000), 2000);
      offs.push(() => clearInterval(watch));
    }
    return () => offs.forEach((off) => off && off());
  }, [room, isHost, doPause, doSpeed]);

  /* 소리 — 새로 생긴 연출·탄에만 한 번씩 */
  const soundRef = useRef({ phase: "", banner: null });
  const playSounds = useCallback((g) => {
    if (sfx.isMuted()) return;
    for (const f of g.fx) {
      if (f.played) continue;
      f.played = true;
      if (f.snd) sfx.play(f.snd);
    }
    for (const b of g.bullets) {
      if (b.played) continue;
      b.played = true;
      sfx.shot(b.kind);
    }
    const st = soundRef.current;
    if (g.banner && g.banner !== st.banner) {
      st.banner = g.banner;
      if (/웨이브/.test(g.banner.text)) sfx.play("wave");
    }
    if (g.phase !== st.phase) {
      if (g.phase === "clear") sfx.play("clear");
      else if (g.phase === "over") sfx.play("over");
      st.phase = g.phase;
    }
  }, []);

  /* 루프 */
  useEffect(() => {
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bg = document.createElement("canvas");
    bg.width = W * dpr;
    bg.height = H * dpr;
    const bctx = bg.getContext("2d");
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintTerrain(bctx);
    bgRef.current = bg;

    let raf, last = performance.now(), frame = 0, sinceSnap = 0;
    const loop = (now) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;
      const g = G.current;

      if (isHost) {
        if (!g.paused) for (let i = 0; i < g.speed; i++) step(g, dt);
        sinceSnap += dt;
        if (sinceSnap >= 1 / SNAP_HZ) {
          sinceSnap = 0;
          room?.send("snap", packSnapshot(g));
          if (g.out.length) {
            room?.send("out", g.out.splice(0, 40));
            if (g.out.length > 120) g.out.length = 0;
          }
        }
      } else {
        stepVisual(g, dt);
      }

      if (isHost && g.leaveDone) { g.leaveDone = 0; onBackRef.current(); }
      playSounds(g);
      draw(ctx, g, bgRef.current);
      if (++frame % 5 === 0) setHud(snapHud(g));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isHost, room, playSounds]);

  const togglePause = useCallback(() => {
    if (isHost) doPause();
    else if (mySeat >= 0) room?.send("input", { cls: mySeat, kind: "pause" });
  }, [isHost, room, mySeat, doPause]);

  const setSpeed = useCallback((v) => {
    if (isHost) doSpeed(v);
    else if (mySeat >= 0) room?.send("input", { cls: mySeat, kind: "speed", dir: v });
  }, [isHost, room, mySeat, doSpeed]);

  const showScore = hud.phase === "reward" && !!hud.score && hud.score.n > seenScore;

  const kind = waveKind(hud.wave, hud.total);
  const kindLabel =
    kind === "rush" ? "돌격 웨이브" : kind === "boss" ? "보스 웨이브" :
    kind === "titan" ? "대군주 웨이브" : "";
  const phaseLabel =
    hud.phase === "prep" ? (kindLabel ? `${kindLabel} 준비` : "배치 시간") :
    hud.phase === "wave" ? (kindLabel || "교전 중") :
    hud.phase === "arena" ? "보스 결전" :
    hud.phase === "reward" ? "능력 선택" :
    hud.phase === "clear" ? "방어 성공" : hud.overWhy === "wipe" ? "전멸" : "성채 함락";
  const over = hud.phase === "over" || hud.phase === "clear";
  const crewCount = seatFlags.filter(Boolean).length;
  const agreed = hud.leave.filter((v, i) => v && seatFlags[i]).length;
  const hpRatio = hud.hp / hud.max;

  return (
    <div className={`page ${touch ? "touch" : ""}`}>
      <div className="stage">
        <div className="frame">
          <canvas ref={cvsRef} />

          <div className="hud hud-left">
            <div className="hud-row">
            <div className="crest" title={`성채 ${hud.tier}단계 · 체력 ${hud.hp}/${hud.max}`}>
              <Shield />
              <div className="crest-num"
                style={{ color: hpRatio > 0.5 ? "#a9e79c" : hpRatio > 0.25 ? "#f3c766" : "#f09a90" }}>
                {hud.hp}
              </div>
              <span className="crest-tier">Lv.{hud.tier}</span>
            </div>
            <div className="wave-box">
              <span className={`wave-label ${kindLabel && hud.phase !== "clear" && hud.phase !== "over" ? "hot" : ""}`}>{phaseLabel}</span>
              <span className="wave-num">웨이브 {hud.wave}<em>/{hud.total}</em></span>
              <span className="wave-diff">{DIFFS[hud.diff]?.name}</span>
              <span className="wave-sub">
                {hud.phase === "prep" ? `${Math.ceil(hud.timer)}초 뒤 시작`
                  : hud.phase === "wave" ? `남은 적 ${hud.left}`
                  : hud.phase === "arena" ? (hud.boss ? `보스 체력 ${Math.round(hud.boss * 100)}%` : "보스와 맞선다")
                  : hud.phase === "reward" ? `${Math.ceil(hud.timer)}초 안에 고르기` : "—"}
              </span>
              {hud.phase === "prep" && hud.preview?.length > 0 && (
                <span className="wave-mix">
                  {hud.preview.map(([ti, n]) => (
                    <em key={ti}>{ENEMY[ETYPES[ti]]?.label ?? "적"} ×{n}</em>
                  ))}
                </span>
              )}
            </div>
            </div>

            {mySeat >= 0 && (hud.phase === "prep" || hud.phase === "wave") && (
              <button
                className="keep-up"
                onClick={() => act("castle")}
                disabled={hud.tier >= CASTLE_TIERS || (hud.players[mySeat]?.gold ?? 0) < hud.upCost}
                title="성채를 눌러도 올릴 수 있습니다"
              >
                {hud.tier >= CASTLE_TIERS
                  ? "성채 최대 단계"
                  : <>성채 {hud.tier + 1}단계 <em>{hud.upCost}골드</em></>}
              </button>
            )}

            {hud.cost && (hud.phase === "prep" || hud.phase === "wave") && (
              <CostBox cost={hud.cost} seat={mySeat} />
            )}
          </div>

          <div className="hud hud-right">
            <button className={`sbtn ${hud.paused ? "on" : ""}`} onClick={togglePause} title="일시정지">
              <span className="pause-glyph" />
            </button>
            <button className={`sbtn ${!hud.paused && hud.speed === 1 ? "on" : ""}`} onClick={() => setSpeed(1)}>×1</button>
            <button className={`sbtn ${!hud.paused && hud.speed === 2 ? "on" : ""}`} onClick={() => setSpeed(2)}>×2</button>
            <button className={`sbtn ${mute ? "" : "on"}`} onClick={toggleMute} title="소리">
              {mute ? "🔇" : "🔊"}
            </button>
            {mySeat >= 0 && (
              <button
                className={`sbtn ${hud.leave[mySeat] ? "on" : ""}`}
                onClick={() => act("leave")}
                title="대기실로 돌아가기"
              >
                <HomeIcon />
              </button>
            )}
          </div>

          {hud.surge > 0 && (
            <div className="surge-tag" title="보스를 잡을 때마다 관문의 적이 강해집니다">
              적 강화 {hud.surge}단계
            </div>
          )}

          {hud.phase === "reward" && showScore && (
            <BossScore
              key={hud.score.n}
              score={hud.score}
              seats={seatFlags}
              names={names}
              mySeat={mySeat}
              onDone={skipScore}
            />
          )}

          {hud.phase === "reward" && !showScore && (
            <div className="curtain reward">
              <div className="reward-box">
                <div className="reward-head">
                  <h2>보스를 쓰러뜨렸다</h2>
                  <p>
                    {mySeat >= 0 && !hud.picked?.[mySeat]
                      ? "능력을 하나 고르세요"
                      : "다른 수비대원을 기다리는 중"}
                    <em> · {Math.ceil(hud.timer)}초</em>
                  </p>
                </div>

                {mySeat >= 0 && hud.offer?.[mySeat] && !hud.picked?.[mySeat] ? (
                  <div className="reward-cards">
                    {hud.offer[mySeat].map((id, k) => {
                      const perk = PERK_BY_ID[id];
                      const have = hud.players[mySeat]?.perks?.find((x) => x[0] === id);
                      return (
                        <button key={id} className="perk-card" onClick={() => chooseReward(k)}
                          style={{ "--pc": P[mySeat].key, "--pcl": P[mySeat].light, "--pcd": P[mySeat].dark }}>
                          <span className="perk-art"><PerkIcon kind={perk.icon} /></span>
                          <span className="perk-name">{perk.name}</span>
                          <span className="perk-note">{perk.note}</span>
                          {have && <span className="perk-have">이미 {have[1]}개</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="reward-wait">
                    {mySeat < 0 ? "구경 중입니다." : "고르기를 마쳤습니다."}
                  </p>
                )}

                <div className="reward-crew">
                  {hud.players.map((p, i) => {
                    if (!seatFlags[i]) return null;
                    return (
                      <span key={i} className={`crew-dot ${hud.picked?.[i] ? "done" : ""}`}
                        style={{ "--pcl": P[i].light }}>
                        {names[i] || CLASSES[i].name}
                        {hud.picked?.[i] ? " 완료" : " 고르는 중"}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {agreed > 0 && !over && (
            <div className="leave-vote">
              <b>대기실로 돌아갈까요?</b>
              <span className="leave-count">{agreed} / {crewCount} 동의 · {Math.ceil(hud.leaveT)}초</span>
              <span className="leave-who">
                {hud.players.map((p, i) => {
                  if (!seatFlags[i]) return null;
                  return (
                    <em key={i} className={hud.leave[i] ? "yes" : ""}>
                      {names[i] || CLASSES[i].name}
                    </em>
                  );
                })}
              </span>
              {mySeat >= 0 && (
                <span className="leave-btns">
                  <button className="btn-ghost" onClick={() => act("leave")}>
                    {hud.leave[mySeat] ? "동의 취소" : "나도 동의"}
                  </button>
                  {isHost && hud.leaveT <= LEAVE_T - LEAVE_FORCE && (
                    <button className="btn-ghost" onClick={onBack}>방장 권한으로 나가기</button>
                  )}
                </span>
              )}
            </div>
          )}

          {dropped && (
            <div className="drop-note">방장과의 연결이 끊긴 것 같습니다…</div>
          )}

          {over && (
            <div className="curtain over">
              <div className="scroll-panel">
                <div className="scroll-eyebrow">웨이브 {hud.wave}에서 종료</div>
                <h2>
                  {hud.phase === "clear" ? "성채를 지켰습니다"
                    : hud.overWhy === "wipe" ? "모두 쓰러졌습니다"
                    : "성채가 무너졌습니다"}
                </h2>
                <p>
                  {hud.phase === "clear"
                    ? `${hud.total}번의 웨이브를 모두 막아냈습니다.`
                    : hud.overWhy === "wipe"
                      ? "보스 앞에 설 사람이 남지 않았습니다. 대기실로 돌아가 다시 세워보세요."
                      : "대기실로 돌아가 방어선을 다시 세워보세요."}
                </p>
                <button className="btn-main" onClick={onBack}>대기실로</button>
                <Feedback
                  open
                  name={names[mySeat] || null}
                  result={hud.phase === "clear" ? "clear" : hud.overWhy === "wipe" ? "wipe" : "over"}
                  wave={hud.wave} total={hud.total} diff={DIFFS[diff]?.id || null}
                  cls={mySeat >= 0 ? CLASSES[mySeat].id : null}
                />
              </div>
            </div>
          )}
        </div>

        {touch && <p className="turn-note">가로로 돌리면 판이 커집니다.</p>}

        {touch && mySeat >= 0 && (
          <TouchPad
            phase={hud.phase}
            ready={(hud.players[mySeat]?.cd ?? 1) <= 0}
            onPress={pressDir}
            onRelease={releaseDir}
            onTap={act}
          />
        )}

        <div className="party">
          {hud.players.map((p, i) => {
            if (!seatFlags[i]) return null;         // 이번 판에 안 고른 병과는 빼고 보여준다
            const cls = CLASSES[i];
            const ready = p.cd <= 0;
            const mine = i === mySeat;
            return (
              <div key={i} className={`card ${mine ? "mine" : ""}`}
                style={{ "--pc": P[i].key, "--pcl": P[i].light, "--pcd": P[i].dark }}>
                <div className="card-head">
                  <span className={`badge ${P[i].pale ? "pale" : ""}`}><ClassIcon i={i} /></span>
                  <span className="who">
                    <b>{names[i] || `${i + 1}P`}</b> {cls.name}
                  </span>
                  <span className="coin"><Coin />{p.gold}</span>
                </div>
                <div className="card-note">
                  {charOf(cls.id) && <TowerChar id={cls.id} className="card-char" />}
                  {cls.note} · {cls.cost}골드
                </div>
                {p.perks?.length > 0 && (
                  <div className="perk-row">
                    {p.perks.map(([id, n]) => (
                      <span key={id} className="perk-chip" title={PERK_BY_ID[id].note}>
                        <PerkIcon kind={PERK_BY_ID[id].icon} />
                        {n > 1 && <em>{n}</em>}
                      </span>
                    ))}
                  </div>
                )}
                <div className="card-row">
                  <span>{LANES[p.lane].name} · {p.slot + 1}번 자리</span>
                  <span>건설 {p.built} · 처치 {p.kills}</span>
                </div>
                <div className={`skill ${ready ? "ready" : ""}`}>
                  <span className="skill-name">{SKILLS[i].name}</span>
                  <span className="skill-state">
                    {ready ? "준비됨"
                      : hud.phase === "arena"
                        ? `${Math.max(0, Math.round((1 - p.cd / SKILLS[i].cd) * 100))}%`
                        : `${Math.ceil(p.cd)}초`}
                  </span>
                  <span className="skill-bar">
                    <span style={{ width: `${ready ? 100 : (1 - p.cd / SKILLS[i].cd) * 100}%` }} />
                  </span>
                </div>
                {mine && (touch ? (
                  <div className="keys">
                    <kbd>◀▲▼▶</kbd><span>이동</span>
                    <kbd>돌판</kbd><span>눌러서 그 자리로</span>
                    <kbd>건설</kbd><span>탑 세우기 · 결전장에서는 공격</span>
                    <kbd>팔기</kbd><span>들인 값의 60%</span>
                    <kbd>스킬</kbd><span>{SKILLS[i].name}</span>
                  </div>
                ) : (
                  <div className="keys">
                    <kbd>{KEY_HINT.move}</kbd><span>이동</span>
                    <kbd>클릭</kbd><span>그 자리로</span>
                    <kbd>{KEY_HINT.build}</kbd><span>건설</span>
                    <kbd>{KEY_HINT.sell}</kbd><span>팔기</span>
                    <kbd>{KEY_HINT.skill}</kbd><span>스킬</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <p className="footnote">
          돌판마다 성격이 다릅니다. 마우스를 올리면 그 자리가 어떤 자리인지 알려 줍니다.
          지은 탑은 <kbd>X</kbd>로 팔아 들인 값의 60%를 돌려받습니다.
          성채를 누르면 골드를 내고 한 단계 올립니다. 단계마다 최대 체력 +30, 성채 대포도 함께 세집니다.
          길가의 돌판마다 타워를 세울 수 있습니다. 돌판을 마우스로 눌러 바로 옮겨 갈 수 있고,
          방향키를 누르면 그쪽에 있는 가장 가까운 자리로 한 칸씩 옮겨 갑니다. 같은 자리에 자기 타워를 다시 지으면 4단계까지 강화되고, 단계가 오를수록 값이 뜁니다. 보급소 사거리 안에 선 타워는 공격력과 공격 속도가 함께 오릅니다.
          성채도 스스로 대포를 쏩니다. 다섯 웨이브마다 보스가 하나 오고, 잡으면 각자 능력을 하나 고릅니다.
          보스 결전에서는 지은 탑이 거들지 않습니다. 보스를 깎는 것은 나가 싸우는 사람뿐입니다.
          궁수탑·저격탑·대포탑·중력탑은 겨누어 쏘는 병과라 발을 멈춰야 평타가 나갑니다.
          보스 결전에서는 사람마다 체력이 따로 있습니다. 맞아서 깎인 만큼 성채도 같이 깎이고,
          체력이 다하면 잠시 쓰러졌다가 절반으로 일어납니다. 체력은 저절로 차오르지 않습니다. 채우는 길은 보급소뿐입니다.
          한 사람도 서 있지 않게 되면 성채가 멀쩡해도 그 자리에서 집니다.
          보스는 가만히 있지 않고 가장 가까운 사람에게 걸어옵니다. 방망이가 닿는 거리에 들면 평타로 휘두르고,
          더 붙으면 팔로 크게 후려칩니다. 휘두르는 동안은 발이 멈추니, 등 뒤로 돌아가면 빗나갑니다.
          뛰어올라 한 곳에 내려찍기도 하고, 붉은 길을 깔고 일직선으로 돌진하기도 합니다.
          십자 가르기는 가로세로로 한 번 가른 뒤 쉬지 않고 비스듬히 한 번 더 가릅니다.
          먼저 네 귀퉁이로 피하고, 곧바로 위아래좌우로 옮겨야 합니다.
          대신 그때부터 관문에서 나오는 적이 조금씩 강해집니다.
          {mySeat < 0 && " 지금은 구경 중이라 조작할 수 없습니다."}
        </p>
      </div>
    </div>
  );
}

export { ENEMY };
