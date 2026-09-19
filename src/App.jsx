import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  W, H, CX, CY, P, CLASSES, PERKS, PERK_BY_ID, PERK_IDS, SEATS, CREW_MAX,
  castleTier, castleCost, CASTLE_TIERS, LEAVE_FORCE, LEAVE_T,
  SKILLS, ENEMY, ETYPES, SLOTS, SPOTS, LANES, TOTAL_WAVES, WAVE_OPTIONS, DIFFS, DEFAULT_DIFF, prepTime,
  makeGame, waveKind, MOVE_KEYS, BUILD_KEYS, SKILL_KEYS, SELL_KEYS, KEY_HINT,
} from "./game/world.js";
import {
  step, stepVisual, applyMove, applyGoto, doBuild, doSell, doCastle, doSkill,
  applyReward, applyLeave, startPrep,
  packSnapshot, applySnapshot, applyOut,
} from "./game/logic.js";
import sfx from "./game/sfx.js";
import { paintTerrain, draw } from "./game/art.js";
import { joinRoom, makeCode, myId, netReady } from "./net/room.js";
import { Shield, Coin, ClassIcon, PerkIcon, HomeIcon } from "./ui/icons.jsx";
import { TowerChar, charOf } from "./ui/chars.jsx";
import "./ui/style.css";

const SNAP_HZ = 12;

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

  // 방장만 라운드 수와 난이도를 바꾼다
  const setWaves = useCallback((n) => {
    if (!hostRef.current || !WAVE_OPTIONS.includes(n)) return;
    wavesRef.current = n;
    publishLobby();
  }, [publishLobby]);

  const setDiff = useCallback((d) => {
    if (!hostRef.current || !DIFFS[d]) return;
    diffRef.current = d;
    publishLobby();
  }, [publishLobby]);

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
    room.on("start", () => { if (!hostRef.current) setScreen("game"); });
    room.on("toLobby", () => { if (!hostRef.current) setScreen("lobby"); });

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

  const startGame = useCallback(() => {
    roomRef.current?.send("start", {});
    setScreen("game");
  }, []);

  const backToLobby = useCallback(() => {
    if (hostRef.current) roomRef.current?.send("toLobby", {});
    setScreen("lobby");
  }, []);

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
        code={code} lobby={lobby} me={me} isHost={isHost} mySeat={mySeat}
        error={error} connecting={connecting}
        onPick={pick} onStart={startGame} onLeave={leave} onWaves={setWaves} onDiff={setDiff}
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
          각자 자기 컴퓨터에서 들어와 한 방에서 함께 지킵니다.
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
function Lobby({ code, lobby, me, isHost, mySeat, error, connecting, onPick, onWaves, onDiff, onStart, onLeave }) {
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
                disabled={!isHost}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="rounds-note">
            {isHost ? "길게 잡아도 적이 세지는 속도는 그만큼 완만해집니다" : "방장이 정합니다"}
          </span>
        </div>

        <div className="rounds">
          <span className="rounds-label">난이도</span>
          <div className="rounds-btns">
            {DIFFS.map((d, i) => (
              <button
                key={d.id}
                className={`round-btn ${diff === i ? "on" : ""} diff-${d.id}`}
                onClick={() => onDiff(i)}
                disabled={!isHost}
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
                <span className="seat-badge"><ClassIcon i={i} /></span>
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
          {isHost ? (
            <button className="btn-main" onClick={onStart} disabled={filled === 0}>
              방어 시작
            </button>
          ) : (
            <span className="muted">방장이 시작하기를 기다리는 중…</span>
          )}
        </div>

        <p className="keyhint">
          조작 — 이동 <kbd>{KEY_HINT.move}</kbd> 또는 돌판 <kbd>클릭</kbd> · 건설 <kbd>{KEY_HINT.build}</kbd> · 팔기 <kbd>{KEY_HINT.sell}</kbd> · 스킬 <kbd>{KEY_HINT.skill}</kbd>
        </p>
      </div>
    </div>
  );
}

/* ── 게임 ───────────────────────────────────────────────── */
function GameView({ room, isHost, seats, waves, diff, mySeat, onBack }) {
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
    g.wave = 1;
    startPrep(g);
    G.current = g;
  }

  const [hud, setHud] = useState(() => snapHud(G.current));
  const [dropped, setDropped] = useState(false);
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
      hp: Math.max(0, Math.round(g.core.hp)), max: g.core.max,
      tier: castleTier(g), upCost: castleCost(g),
      left: (g.queueLeft ?? g.queue.length) + g.enemies.length,
      preview: g.preview || null,
      paused: g.paused, speed: g.speed,
      surge: g.surge || 0, diff: g.diff ?? DEFAULT_DIFF,
      leave: (g.leave || []).map((v) => !!v), leaveT: g.leaveT || 0,
      offer: g.phase === "reward" ? g.offer : null,
      picked: g.phase === "reward" ? g.picked : null,
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
    if (kind === "reward") {
      if (g.phase !== "reward") return;
      sfx.unlock();
      if (isHost) applyReward(g, mySeat, dir);
      else room?.send("input", { cls: mySeat, kind, dir });
      return;
    }
    if (g.phase !== "prep" && g.phase !== "wave") return;
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
      // 내 커서는 바로 움직이고, 판정은 방장에게 맡긴다
      if (kind === "move") applyMove(g, mySeat, dir);
      else if (kind === "goto") applyGoto(g, mySeat, dir);
      room?.send("input", { cls: mySeat, kind, dir });
    }
  }, [isHost, mySeat, room]);

  /* 키보드 — 자기 병과만 조작한다 */
  useEffect(() => {
    if (mySeat < 0) return;
    const held = [];
    let holdT = 0;
    let timer = null;

    const tick = () => {
      if (!held.length) return;
      holdT -= 0.05;
      if (holdT <= 0) { act("move", held[held.length - 1]); holdT = 0.11; }
    };

    function onKey(e) {
      const dir = MOVE_KEYS[e.code];
      const isBuild = BUILD_KEYS.includes(e.code);
      const isSkill = SKILL_KEYS.includes(e.code);
      const isSell = SELL_KEYS.includes(e.code);
      if (!dir && !isBuild && !isSkill && !isSell) return;
      e.preventDefault();
      if (e.repeat) return;
      if (dir) {
        act("move", dir);
        if (!held.includes(dir)) held.push(dir);
        holdT = 0.24;
        if (!timer) timer = setInterval(tick, 50);
      } else if (isBuild) act("build");
      else if (isSell) act("sell");
      else act("skill");
    }
    function onUp(e) {
      const dir = MOVE_KEYS[e.code];
      if (!dir) return;
      const i = held.indexOf(dir);
      if (i >= 0) held.splice(i, 1);
      if (!held.length && timer) { clearInterval(timer); timer = null; }
    }
    function onBlur() { held.length = 0; if (timer) { clearInterval(timer); timer = null; } }

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      if (timer) clearInterval(timer);
    };
  }, [act, mySeat]);

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
      let best = -1, bd = Infinity;
      for (let i = 0; i < SLOTS.length; i++) {
        const dx = (SLOTS[i].x - x) / 26, dy = (SLOTS[i].y - y) / 21;
        const d = dx * dx + dy * dy;
        if (d <= 1 && d < bd) { bd = d; best = i; }
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

  /* 통신 */
  useEffect(() => {
    if (!room) return;
    const offs = [];
    if (isHost) {
      offs.push(room.on("input", (d) => {
        const g = G.current;
        if (!g.seats[d.cls]) return;
        if (d.kind === "reward") return applyReward(g, d.cls, d.dir);
        if (d.kind === "leave") return applyLeave(g, d.cls, d.dir);
        if (g.phase !== "prep" && g.phase !== "wave") return;
        if (g.paused) return;
        if (d.kind === "move") applyMove(g, d.cls, d.dir);
        else if (d.kind === "goto") applyGoto(g, d.cls, d.dir);
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
  }, [room, isHost]);

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
    if (!isHost) return;
    const g = G.current;
    if (g.phase !== "prep" && g.phase !== "wave") return;
    g.paused = !g.paused;
    setHud(snapHud(g));
  }, [isHost]);

  const setSpeed = useCallback((v) => {
    if (!isHost) return;
    const g = G.current;
    g.speed = v;
    g.paused = false;
    setHud(snapHud(g));
  }, [isHost]);

  const kind = waveKind(hud.wave, hud.total);
  const kindLabel =
    kind === "rush" ? "돌격 웨이브" : kind === "boss" ? "보스 웨이브" :
    kind === "titan" ? "대군주 웨이브" : "";
  const phaseLabel =
    hud.phase === "prep" ? (kindLabel ? `${kindLabel} 준비` : "배치 시간") :
    hud.phase === "wave" ? (kindLabel || "교전 중") :
    hud.phase === "reward" ? "능력 선택" :
    hud.phase === "clear" ? "방어 성공" : "성채 함락";
  const over = hud.phase === "over" || hud.phase === "clear";
  const crewCount = seatFlags.filter(Boolean).length;
  const agreed = hud.leave.filter((v, i) => v && seatFlags[i]).length;
  const hpRatio = hud.hp / hud.max;

  return (
    <div className="page">
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
          </div>

          <div className="hud hud-right">
            {isHost ? (
              <>
                <button className={`sbtn ${hud.paused ? "on" : ""}`} onClick={togglePause} title="일시정지">
                  <span className="pause-glyph" />
                </button>
                <button className={`sbtn ${!hud.paused && hud.speed === 1 ? "on" : ""}`} onClick={() => setSpeed(1)}>×1</button>
                <button className={`sbtn ${!hud.paused && hud.speed === 2 ? "on" : ""}`} onClick={() => setSpeed(2)}>×2</button>
              </>
            ) : (
              <span className="guest-tag">방장이 진행 중</span>
            )}
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

          {hud.phase === "reward" && (
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
            <div className="curtain">
              <div className="scroll-panel">
                <div className="scroll-eyebrow">웨이브 {hud.wave}에서 종료</div>
                <h2>{hud.phase === "clear" ? "성채를 지켰습니다" : "성채가 무너졌습니다"}</h2>
                <p>
                  {hud.phase === "clear"
                    ? `${hud.total}번의 웨이브를 모두 막아냈습니다.`
                    : "대기실로 돌아가 방어선을 다시 세워보세요."}
                </p>
                {isHost
                  ? <button className="btn-main" onClick={onBack}>대기실로</button>
                  : <span className="hint">방장이 대기실로 돌아가기를 기다리는 중…</span>}
              </div>
            </div>
          )}
        </div>

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
                  <span className="badge"><ClassIcon i={i} /></span>
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
                  <span className="skill-state">{ready ? "준비됨" : `${Math.ceil(p.cd)}초`}</span>
                  <span className="skill-bar">
                    <span style={{ width: `${ready ? 100 : (1 - p.cd / SKILLS[i].cd) * 100}%` }} />
                  </span>
                </div>
                {mine && (
                  <div className="keys">
                    <kbd>{KEY_HINT.move}</kbd><span>이동</span>
                    <kbd>클릭</kbd><span>그 자리로</span>
                    <kbd>{KEY_HINT.build}</kbd><span>건설</span>
                    <kbd>{KEY_HINT.sell}</kbd><span>팔기</span>
                    <kbd>{KEY_HINT.skill}</kbd><span>스킬</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="footnote">
          돌판마다 성격이 다릅니다. 마우스를 올리면 그 자리가 어떤 자리인지 알려 줍니다.
          지은 탑은 <kbd>X</kbd>로 팔아 들인 값의 60%를 돌려받습니다.
          성채를 누르면 골드를 내고 한 단계 올립니다. 단계마다 최대 체력 +30, 성채 대포도 함께 세집니다.
          길가의 돌판마다 타워를 세울 수 있습니다. 돌판을 마우스로 눌러 바로 옮겨 갈 수 있고,
          방향키를 누르면 그쪽에 있는 가장 가까운 자리로 한 칸씩 옮겨 갑니다. 같은 자리에 자기 타워를 다시 지으면 4단계까지 강화됩니다.
          성채도 스스로 대포를 쏩니다. 다섯 웨이브마다 보스가 하나 오고, 잡으면 각자 능력을 하나 고릅니다.
          대신 그때부터 관문에서 나오는 적이 조금씩 강해집니다.
          {mySeat < 0 && " 지금은 구경 중이라 조작할 수 없습니다."}
        </p>
      </div>
    </div>
  );
}

export { ENEMY };
