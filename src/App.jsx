import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  W, H, P, CLASSES, CLASS_TOWERS, TOWER_BY_ID, BLESSINGS,
  SKILLS, ENEMY, LANES, TOTAL_WAVES, PREP,
  makeGame, waveKind, MOVE_KEYS, BUILD_KEYS, SKILL_KEYS, PICK_KEYS, PICK_NUM, KEY_HINT,
} from "./game/world.js";
import {
  step, stepVisual, applyMove, doBuild, doSkill, applyPick,
  packSnapshot, applySnapshot, applyOut,
} from "./game/logic.js";
import sfx from "./game/sfx.js";
import { paintTerrain, draw } from "./game/art.js";
import { joinRoom, makeCode, myId, netReady } from "./net/room.js";
import { Shield, Coin, ClassIcon } from "./ui/icons.jsx";
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
  const seatsRef = useRef([null, null, null, null]);
  const peersRef = useRef([]);

  const isHost = lobby?.hostId === me;
  const mySeat = lobby ? lobby.seats.findIndex((s) => s && s.id === me) : -1;

  const publishLobby = useCallback(() => {
    const next = { hostId: me, seats: seatsRef.current };
    setLobby(next);
    roomRef.current?.send("lobby", next);
  }, [me]);

  // 방장은 들어온 사람에게 빈 병과를 하나 내어준다
  const reseat = useCallback(() => {
    const present = new Set(peersRef.current.map((p) => p.id));
    const seats = seatsRef.current.map((s) => (s && present.has(s.id) ? s : null));
    peersRef.current.forEach((peer) => {
      if (seats.some((s) => s && s.id === peer.id)) return;
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
      if (seats[d.cls]) return;                               // 이미 누가 골랐다
      const cur = seats.findIndex((s) => s && s.id === from);
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
    seatsRef.current = [null, null, null, null];
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
        onPick={pick} onStart={startGame} onLeave={leave}
      />
    );
  }

  return (
    <GameView
      room={roomRef.current}
      isHost={isHost}
      seats={lobby?.seats || []}
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
function Lobby({ code, lobby, me, isHost, mySeat, error, connecting, onPick, onStart, onLeave }) {
  const [copied, setCopied] = useState("");
  const link = `${location.origin}${location.pathname}?room=${code}`;
  const seats = lobby?.seats || [null, null, null, null];
  const filled = seats.filter(Boolean).length;

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
              병과를 고르면 그 병과의 탑과 공용 탑 둘까지, 모두 세 가지를 지을 수 있습니다.
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

        <div className="seats">
          {CLASSES.map((cls, i) => {
            const who = seats[i];
            const mine = who && who.id === me;
            return (
              <button
                key={i}
                className={`seat ${who ? "taken" : "free"} ${mine ? "mine" : ""}`}
                style={{ "--pc": P[i].key, "--pcl": P[i].light, "--pcd": P[i].dark }}
                onClick={() => onPick(i)}
                disabled={!!who}
              >
                <span className="seat-badge"><ClassIcon i={i} /></span>
                <span className="seat-name">{cls.name}</span>
                <span className="seat-note">{cls.note}</span>
                <span className="seat-towers">
                  {CLASS_TOWERS[i].map((id, k) => {
                    const def = TOWER_BY_ID[id];
                    return (
                      <span key={id} className={`seat-tw ${k === 0 ? "main" : ""}`} title={def.note}>
                        {def.name} <em>{def.cost}</em>
                      </span>
                    );
                  })}
                </span>
                <span className="seat-who">
                  {who ? (
                    <>
                      {who.name}
                      {who.id === lobby?.hostId && <em> · 방장</em>}
                      {mine && <em> · 나</em>}
                    </>
                  ) : "비어 있음 — 눌러서 맡기"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="lobby-foot">
          <span className="muted">
            {filled}명 참가 중 · 내 병과 {mySeat >= 0 ? CLASSES[mySeat].name : "없음"}
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
          조작 — 이동 <kbd>{KEY_HINT.move}</kbd> · 건설 <kbd>{KEY_HINT.build}</kbd> · 타워 고르기 <kbd>{KEY_HINT.pick}</kbd> · 스킬 <kbd>{KEY_HINT.skill}</kbd>
        </p>
      </div>
    </div>
  );
}

/* ── 게임 ───────────────────────────────────────────────── */
function GameView({ room, isHost, seats, mySeat, onBack }) {
  const cvsRef = useRef(null);
  const bgRef = useRef(null);
  const seatFlags = useMemo(() => [0, 1, 2, 3].map((i) => !!seats[i]), [seats]);
  const names = useMemo(() => [0, 1, 2, 3].map((i) => seats[i]?.name || ""), [seats]);

  const G = useRef(null);
  if (!G.current) {
    const g = makeGame(seatFlags);
    g.names = names;
    g.mySeat = mySeat;
    g.phase = "prep";
    g.wave = 1;
    g.timer = PREP;
    G.current = g;
  }

  const [hud, setHud] = useState(() => snapHud(G.current));
  const [dropped, setDropped] = useState(false);
  const [mute, setMute] = useState(() => sfx.isMuted());
  const toggleMute = useCallback(() => {
    sfx.unlock();
    const v = !sfx.isMuted();
    sfx.setMuted(v);
    setMute(v);
  }, []);

  function snapHud(g) {
    return {
      phase: g.phase, wave: g.wave, timer: Math.max(0, g.timer),
      hp: Math.max(0, Math.round(g.core.hp)), max: g.core.max,
      left: (g.queueLeft ?? g.queue.length) + g.enemies.length,
      paused: g.paused, speed: g.speed,
      blessed: g.blessed || [],
      players: g.players.map((p) => ({
        gold: Math.floor(p.gold), cd: Math.max(0, p.cd),
        lane: p.lane, slot: p.slot, built: p.built, kills: p.kills, pick: p.pick || 0,
      })),
    };
  }

  /* 입력 — 자기 병과만 조작한다 */
  useEffect(() => {
    if (mySeat < 0) return;
    const held = [];
    let holdT = 0;
    let timer = null;

    const act = (kind, dir) => {
      const g = G.current;
      if (g.phase !== "prep" && g.phase !== "wave") return;
      if (g.paused) return;
      sfx.unlock();
      if (isHost) {
        if (kind === "move") applyMove(g, mySeat, dir);
        else if (kind === "build") doBuild(g, mySeat);
        else if (kind === "pick") applyPick(g, mySeat, dir);
        else doSkill(g, mySeat);
      } else {
        if (kind === "move") applyMove(g, mySeat, dir);   // 내 커서는 바로 움직이고
        room?.send("input", { cls: mySeat, kind, dir }); // 판정은 방장에게 맡긴다
      }
    };

    const tick = () => {
      if (!held.length) return;
      holdT -= 0.05;
      if (holdT <= 0) { act("move", held[held.length - 1]); holdT = 0.11; }
    };

    function onKey(e) {
      const dir = MOVE_KEYS[e.code];
      const isBuild = BUILD_KEYS.includes(e.code);
      const isSkill = SKILL_KEYS.includes(e.code);
      const isPick = PICK_KEYS.includes(e.code);
      const pickNum = PICK_NUM[e.code];
      if (!dir && !isBuild && !isSkill && !isPick && pickNum === undefined) return;
      e.preventDefault();
      if (e.repeat) return;
      if (dir) {
        act("move", dir);
        if (!held.includes(dir)) held.push(dir);
        holdT = 0.24;
        if (!timer) timer = setInterval(tick, 50);
      } else if (isBuild) act("build");
      else if (isPick) act("pick");
      else if (pickNum !== undefined) act("pick", pickNum);
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
  }, [isHost, mySeat, room]);

  /* 통신 */
  useEffect(() => {
    if (!room) return;
    const offs = [];
    if (isHost) {
      offs.push(room.on("input", (d) => {
        const g = G.current;
        if (g.phase !== "prep" && g.phase !== "wave") return;
        if (g.paused) return;
        if (!g.seats[d.cls]) return;
        if (d.kind === "move") applyMove(g, d.cls, d.dir);
        else if (d.kind === "build") doBuild(g, d.cls);
        else if (d.kind === "pick") applyPick(g, d.cls, d.dir);
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

  const kind = waveKind(hud.wave);
  const kindLabel =
    kind === "rush" ? "돌격 웨이브" : kind === "boss" ? "보스 웨이브" :
    kind === "titan" ? "대군주 웨이브" : "";
  const phaseLabel =
    hud.phase === "prep" ? (kindLabel ? `${kindLabel} 준비` : "배치 시간") :
    hud.phase === "wave" ? (kindLabel || "교전 중") :
    hud.phase === "clear" ? "방어 성공" : "성채 함락";
  const over = hud.phase === "over" || hud.phase === "clear";
  const hpRatio = hud.hp / hud.max;

  return (
    <div className="page">
      <div className="stage">
        <div className="frame">
          <canvas ref={cvsRef} />

          <div className="hud hud-left">
            <div className="crest">
              <Shield />
              <div className="crest-num"
                style={{ color: hpRatio > 0.5 ? "#a9e79c" : hpRatio > 0.25 ? "#f3c766" : "#f09a90" }}>
                {hud.hp}
              </div>
            </div>
            <div className="wave-box">
              <span className={`wave-label ${kindLabel && hud.phase !== "clear" && hud.phase !== "over" ? "hot" : ""}`}>{phaseLabel}</span>
              <span className="wave-num">웨이브 {hud.wave}<em>/{TOTAL_WAVES}</em></span>
              <span className="wave-sub">
                {hud.phase === "prep" ? `${Math.ceil(hud.timer)}초 뒤 시작`
                  : hud.phase === "wave" ? `남은 적 ${hud.left}` : "—"}
              </span>
            </div>
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
          </div>

          {hud.blessed?.length > 0 && (
            <div className="bless-strip">
              {hud.blessed.map((id, i) => {
                const b = BLESSINGS.find((x) => x.id === id);
                return <span key={i} className="bless-chip" title={b?.note}>{b?.name}</span>;
              })}
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
                    ? "15번의 웨이브를 모두 막아냈습니다."
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
            if (!seatFlags[i]) {
              return (
                <div key={i} className="card empty">
                  <div className="card-head">
                    <span className="badge ghost"><ClassIcon i={i} /></span>
                    <span className="who">{CLASSES[i].name}</span>
                  </div>
                  <div className="card-note">이번 판에는 비어 있는 자리입니다.</div>
                </div>
              );
            }
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
                <div className="tower-pick">
                  {CLASS_TOWERS[i].map((id, k) => {
                    const def = TOWER_BY_ID[id];
                    const on = (p.pick || 0) === k;
                    return (
                      <span key={id} className={`tp ${on ? "on" : ""}`} title={def.note}>
                        <b>{def.name}</b><em>{def.cost}</em>
                      </span>
                    );
                  })}
                </div>
                <div className="card-note">
                  {TOWER_BY_ID[CLASS_TOWERS[i][p.pick || 0]].note}
                </div>
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
                    <kbd>{KEY_HINT.build}</kbd><span>건설</span>
                    <kbd>{KEY_HINT.pick}</kbd><span>타워 고르기</span>
                    <kbd>{KEY_HINT.skill}</kbd><span>스킬</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="footnote">
          자리는 네 경로에 다섯 칸씩, 모두 스무 칸입니다. 방향키를 누르면 그쪽에 있는 가장 가까운 자리로 옮겨 가고,
          경로 사이도 그대로 넘어갑니다. 같은 자리에 자기 타워를 다시 지으면 4단계까지 강화됩니다.
          <kbd>Z</kbd> 또는 <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>으로 지을 타워를 바꿉니다.
          성채도 스스로 대포를 쏘고, 보스를 잡으면 수비대 전체가 축복을 하나 받습니다.
          {mySeat < 0 && " 지금은 구경 중이라 조작할 수 없습니다."}
        </p>
      </div>
    </div>
  );
}

export { ENEMY };
