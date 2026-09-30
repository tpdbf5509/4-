import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { W, H, P, CLASSES, SEATS, MOVE_KEYS } from "./game/world.js";
import {
  RPG, RPG_CREW_MAX, RPG_SKILL, MAPS, QUEST, makeWorld, rpgStep, rpgStepVisual, rpgHold, rpgSkill, rpgTalk, rpgAuto, rpgFire,
  rpgSyncSeats, rpgJoin, rpgPack, rpgApply, rpgApplyOut, needXp, heroSave, writeHero, npcNear, rpgStyle,
} from "./game/rpg.js";
import { drawRpg } from "./game/rpgArt.js";
import sfx from "./game/sfx.js";
import { ClassIcon, HomeIcon, Coin } from "./ui/icons.jsx";
import { TowerChar, charOf } from "./ui/chars.jsx";
import { useTouch } from "./ui/touch.js";

const SNAP_HZ = 12;
const SKILL_KEYS = ["ShiftLeft", "ShiftRight", "KeyQ"];
const TALK_KEYS = ["Enter", "KeyE"];
const FIRE_KEYS = ["Space"];
const AUTO_KEY = "flg:rpgAuto";
// 자동 평타 설정은 이 기기에 남긴다 — 처음엔 켜져 있다
function loadAuto() {
  try { return localStorage.getItem(AUTO_KEY) !== "0"; } catch { return true; }
}

/* ── 병과 고르기 — 고르면 곧바로 광장에 선다 ─────────────────── */
export function RpgPick({ code, lobby, me, error, connecting, onPick, onLeave }) {
  const [copied, setCopied] = useState("");
  const seats = lobby?.seats || new Array(SEATS).fill(null);
  const filled = seats.filter(Boolean).length;
  const full = filled >= RPG_CREW_MAX;
  const link = `${location.origin}${location.pathname}?room=${code}`;
  const saves = useMemo(() => CLASSES.map((c) => heroSave(c.id)), []);
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1600); }
    catch { setCopied("fail"); }
  };
  return (
    <div className="page center-page">
      <div className="lobby">
        <div className="lobby-head">
          <div>
            <h1>RPG — 병과 고르기</h1>
            <p className="tag">
              고르면 곧바로 광장에 섭니다. 광장의 사냥문을 지나면 사냥터입니다.
              지금 {filled}/{RPG_CREW_MAX}명이 들어와 있고, 언제든 함께할 수 있습니다.
            </p>
          </div>
          <div className="lobby-actions">
            <button className="btn-ghost" onClick={onLeave}>나가기</button>
          </div>
        </div>
        <div className="invite">
          <div className="invite-code"><span className="invite-label">방 코드</span><strong>{code}</strong></div>
          <div className="invite-actions">
            <button className="btn-ghost" onClick={() => copy(code, "code")}>{copied === "code" ? "복사됨" : "코드 복사"}</button>
            <button className="btn-ghost" onClick={() => copy(link, "link")}>{copied === "link" ? "복사됨" : "초대 링크 복사"}</button>
          </div>
        </div>
        {connecting && <p className="muted">방에 연결하는 중…</p>}
        {error && <p className="err">{error}</p>}
        <div className="seats">
          {CLASSES.map((cls, i) => {
            const who = seats[i];
            const locked = !who && full;
            return (
              <button key={cls.id}
                className={`seat ${who ? "taken" : "free"} ${who && who.id === me ? "mine" : ""} ${locked ? "locked" : ""}`}
                style={{ "--pc": P[i].key, "--pcl": P[i].light, "--pcd": P[i].dark }}
                onClick={() => onPick(i)} disabled={!!who || locked || !lobby}>
                <span className={`seat-badge ${P[i].pale ? "pale" : ""}`}><ClassIcon i={i} /></span>
                <span className="seat-name">{cls.name} <em>내 Lv.{saves[i].lv}</em></span>
                <span className="seat-role">{cls.role}</span>
                <span className="seat-note">{rpgStyle(i)}</span>
                {charOf(cls.id) && <span className="seat-char"><TowerChar id={cls.id} /></span>}
                <span className="seat-skill"><b>{RPG_SKILL[cls.id].name}</b> · 코인 {saves[i].coins}</span>
                <span className="seat-who">
                  {who ? `${who.name}${who.id === lobby?.hostId ? " · 방장" : ""}` : locked ? "정원이 찼습니다" : "눌러서 이 병과로 들어가기"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 광장과 사냥터 ─────────────────────────────────────── */
export default function RpgView({ room, isHost, seats, mySeat, code, onLeave }) {
  const cvsRef = useRef(null);
  const bgsRef = useRef(null);
  const idx = useMemo(() => Array.from({ length: SEATS }, (_, i) => i), []);
  const seatFlags = useMemo(() => idx.map((i) => !!seats[i]), [idx, seats]);
  const names = useMemo(() => idx.map((i) => seats[i]?.name || ""), [idx, seats]);
  const myCls = CLASSES[mySeat].id;
  const [auto, setAuto] = useState(loadAuto);        // 자동 평타
  const [start] = useState(() => ({ ...heroSave(myCls), auto: loadAuto() }));   // 이 기기에 남아 있던 내 기록

  const G = useRef(null);
  if (!G.current) {
    const g = makeWorld();
    g.mySeat = mySeat;
    if (isHost) g.out = [];
    else g.mobs = [];                               // 손님은 방장이 보낸 토끼만 그린다
    if (import.meta.env.DEV) window.__R = g;        // 개발 중 상태를 들여다보려고
    G.current = g;
  }
  useEffect(() => { G.current.names = names; }, [names]);

  // 방장 — 자리가 바뀌면 세계에 세우거나 뺀다. 내 기록은 내가 바로 싣는다.
  useEffect(() => {
    const g = G.current;
    if (!isHost) return;
    rpgSyncSeats(g, seatFlags, names);
    if (g.heroes[mySeat] && !g.heroes[mySeat].loaded) rpgJoin(g, mySeat, start);
  }, [isHost, seatFlags, names, mySeat, start]);

  const touch = useTouch();
  const [hud, setHud] = useState(null);
  const [mute, setMute] = useState(() => sfx.isMuted());
  const [dropped, setDropped] = useState(false);
  const [toast, setToast] = useState(null);         // 맵을 옮기면 잠깐 이름을 띄운다
  const [talk, setTalk] = useState(null);           // 사냥꾼의 말
  const [menu, setMenu] = useState(false);          // 레벨 칸의 ☰ 메뉴

  const toggleMute = useCallback(() => {
    sfx.unlock();
    const v = !sfx.isMuted();
    sfx.setMuted(v);
    setMute(v);
  }, []);

  /* 한 번의 조작 — 방장은 바로 판정하고, 손님은 방장에게 보낸다 */
  const act = useCallback((kind, dir) => {
    const g = G.current;
    sfx.unlock();
    if (kind === "hold") {
      rpgHold(g, mySeat, dir);                      // 손님도 내 영웅은 먼저 걷는다
      if (!isHost) room?.send("input", { cls: mySeat, kind, dir });
      return;
    }
    if (kind === "talk") {
      const h = g.heroes[mySeat];
      if (!npcNear(h)) return;
      setTalk(h.quest.on
        ? `아직 ${QUEST.need - h.quest.n}마리 남았네. 토끼도 가끔 들이받으니 조심하게.`
        : `토끼 ${QUEST.need}마리만 잡아 주게. 경험치 ${QUEST.xp}과 ${QUEST.coin}코인을 주겠네.`);
    }
    if (isHost) {
      if (kind === "skill") rpgSkill(g, mySeat);
      else if (kind === "talk") rpgTalk(g, mySeat);
      else if (kind === "fire") rpgFire(g, mySeat, dir);
      else if (kind === "auto") rpgAuto(g, mySeat, dir);
    } else {
      room?.send("input", { cls: mySeat, kind, dir });
    }
  }, [isHost, mySeat, room]);

  const autoRef = useRef(auto);
  const toggleAuto = useCallback(() => {
    const next = !autoRef.current;
    autoRef.current = next;
    setAuto(next);
    try { localStorage.setItem(AUTO_KEY, next ? "1" : "0"); } catch { /* 저장이 막혀 있으면 이번만 */ }
    act("auto", next);
  }, [act]);

  // 메뉴는 Esc 나 바깥을 누르면 닫힌다
  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => { if (e.key === "Escape") setMenu(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  useEffect(() => {
    if (!talk) return;
    const t = setTimeout(() => setTalk(null), 4000);
    return () => clearTimeout(t);
  }, [talk]);

  /* 누르고 있는 방향 — 키보드와 화면 버튼이 같은 곳으로 들어온다 */
  const dirsRef = useRef([]);
  const pressDir = useCallback((d) => {
    const c = dirsRef.current;
    if (c.includes(d)) return;
    c.push(d);
    act("hold", c.slice());
  }, [act]);
  const releaseDir = useCallback((d) => {
    const c = dirsRef.current;
    const i = c.indexOf(d);
    if (i < 0) return;
    c.splice(i, 1);
    act("hold", c.slice());
  }, [act]);
  const clearDirs = useCallback(() => {
    if (!dirsRef.current.length) return;
    dirsRef.current = [];
    act("hold", []);
  }, [act]);

  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const dir = MOVE_KEYS[e.code];
      const isSkill = SKILL_KEYS.includes(e.code);
      const isTalk = TALK_KEYS.includes(e.code);
      const isFire = FIRE_KEYS.includes(e.code);
      if (!dir && !isSkill && !isTalk && !isFire) return;
      e.preventDefault();
      if (e.repeat) return;
      if (dir) pressDir(dir);
      else if (isSkill) act("skill");
      else if (isFire) act("fire", true);          // 스페이스 — 누르고 있는 동안 평타
      else act("talk");
    }
    function onUp(e) {
      const dir = MOVE_KEYS[e.code];
      if (dir) releaseDir(dir);
      if (FIRE_KEYS.includes(e.code)) act("fire", false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    const onBlur = () => { clearDirs(); act("fire", false); };
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [act, mySeat, pressDir, releaseDir, clearDirs]);

  /* 통신 */
  useEffect(() => {
    if (!room) return;
    const offs = [];
    if (isHost) {
      offs.push(room.on("input", (d) => {
        const g = G.current;
        if (!d || !g.heroes[d.cls]) return;
        if (d.kind === "hold") rpgHold(g, d.cls, d.dir);
        else if (d.kind === "skill") rpgSkill(g, d.cls);
        else if (d.kind === "talk") rpgTalk(g, d.cls);
        else if (d.kind === "fire") rpgFire(g, d.cls, !!d.dir);
        else if (d.kind === "auto") rpgAuto(g, d.cls, !!d.dir);
      }));
      offs.push(room.on("rjoin", (d) => {
        const g = G.current;
        if (d && Number.isInteger(d.cls) && d.cls >= 0 && d.cls < SEATS) rpgJoin(g, d.cls, d.data);
      }));
    } else {
      let last = Date.now();
      offs.push(room.on("rsnap", (d) => { last = Date.now(); rpgApply(G.current, d); }));
      offs.push(room.on("rout", (d) => rpgApplyOut(G.current, d)));
      const watch = setInterval(() => setDropped(Date.now() - last > 6000), 2000);
      offs.push(() => clearInterval(watch));
      // 내 기록을 방장에게 알린다 — 실렸다는 게 보일 때까지 다시 보낸다
      const tell = () => room.send("rjoin", { cls: mySeat, data: { ...start, auto: autoRef.current } });
      tell();
      const again = setInterval(() => {
        const h = G.current.heroes[mySeat];
        if (h && h.loaded) return clearInterval(again);
        tell();
      }, 1000);
      offs.push(() => clearInterval(again));
    }
    return () => offs.forEach((off) => off && off());
  }, [room, isHost, mySeat, start]);

  /* 소리 — 내가 있는 맵에서 난 것만, 나에게 온 것만 */
  const playSounds = useCallback((g) => {
    const me = g.heroes[mySeat];
    for (const f of g.fx) {
      if (f.played) continue;
      f.played = true;
      if (!f.snd || sfx.isMuted()) continue;
      if (f.map && me && f.map !== me.map) continue;
      if (f.who !== undefined && f.who !== mySeat) continue;
      if (f.snd === "shot") sfx.shot("arrow");
      else if (f.snd === "cannon") sfx.shot("shell");
      else sfx.play(f.snd);
    }
  }, [mySeat]);

  /* 루프 */
  useEffect(() => {
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgsRef.current = {};                              // 그림 파일이 없을 때만 drawRpg 가 코드로 채운다

    let raf, last = performance.now(), frame = 0, sinceSnap = 0, saved = "", lastMap = "";
    const loop = (now) => {
      // 첫 프레임의 시각은 루프를 건 시각보다 앞설 수 있다 — 거꾸로 가지 않게 막는다
      let dt = Math.max(0, (now - last) / 1000);
      last = now;
      if (dt > 0.05) dt = 0.05;
      const g = G.current;
      if (isHost) {
        rpgStep(g, dt);
        sinceSnap += dt;
        if (sinceSnap >= 1 / SNAP_HZ) {
          sinceSnap = 0;
          room?.send("rsnap", rpgPack(g));
          if (g.out.length) {
            room?.send("rout", g.out.splice(0, 50));
            if (g.out.length > 150) g.out.length = 0;
          }
        }
      } else {
        rpgStepVisual(g, dt);
      }
      playSounds(g);
      drawRpg(ctx, g, bgsRef.current);
      if (++frame % 5 === 0) {
        const me = g.heroes[mySeat];
        setHud(me ? {
          lv: me.lv, xp: me.xp, need: needXp(me.lv), hp: Math.max(0, Math.round(me.hp)), max: me.max,
          coins: me.coins, quest: { ...me.quest }, sk: me.sk, down: me.down, map: me.map, near: !!npcNear(me),
          party: g.heroes.filter(Boolean).map((h) => ({ pi: h.pi, lv: h.lv, map: h.map, hp: h.hp, max: h.max })),
        } : null);
        if (me && me.map !== lastMap) {
          if (lastMap) setToast({ name: MAPS[me.map].name, at: now });
          lastMap = me.map;
        }
        // 실린 뒤로는 바뀔 때마다 이 기기에 남긴다
        if (me && me.loaded) {
          const key = `${me.lv}/${me.xp}/${me.coins}/${me.quest.on ? 1 : 0}/${me.quest.n}`;
          if (key !== saved) { saved = key; writeHero(myCls, me); }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isHost, room, playSounds, mySeat, myCls]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const me = hud;
  const inField = me && me.map === "field";

  return (
    <div className={`page ${touch ? "touch" : ""}`}>
      <div className="stage">
        <div className="frame">
          <canvas ref={cvsRef} />

          {/* 왼쪽 위 — 레벨 · 경험치 · 체력 · 코인 */}
          {me && (
            <div className="rpg-lv" style={{ "--pc": P[mySeat].key, "--pcl": P[mySeat].light }}>
              <span className="rpg-lv-badge"><em>Lv</em>{me.lv}</span>
              <button type="button" className={`rpg-lv-menu ${menu ? "on" : ""}`} aria-label="메뉴" aria-haspopup="menu"
                aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                <span /><span /><span />
              </button>
              <span className="rpg-lv-body">
                <span className="rpg-lv-name"><b>{names[mySeat] || CLASSES[mySeat].name}</b> {CLASSES[mySeat].name}</span>
                <span className="rpg-lv-row">
                  <span className="rpg-lv-tag">XP</span>
                  <span className="rpg-lv-bar xp"><span style={{ width: `${Math.min(100, (me.xp / me.need) * 100)}%` }} /></span>
                  <span className="rpg-lv-num">{me.xp}/{me.need}</span>
                </span>
                <span className="rpg-lv-row">
                  <span className="rpg-lv-tag">HP</span>
                  <span className="rpg-lv-bar hp"><span style={{ width: `${Math.min(100, (me.hp / (me.max || 1)) * 100)}%` }} /></span>
                  <span className="rpg-lv-num">{me.hp}/{me.max}</span>
                </span>
                <span className="rpg-lv-foot">
                  <span className="rpg-lv-coin"><Coin />{me.coins}</span>
                  <span className={`rpg-lv-sk ${me.sk <= 0 ? "ready" : ""}`}>
                    {RPG_SKILL[myCls].name} {me.sk <= 0 ? "준비됨" : `${Math.ceil(me.sk)}초`}
                  </span>
                </span>
              </span>
            </div>
          )}
          {menu && (
            <>
              <div className="rpg-menu-back" onClick={() => setMenu(false)} />
              <div className="rpg-menu" role="menu">
                <span className="rpg-menu-head">설정</span>
                <button type="button" role="menuitemcheckbox" aria-checked={auto} className="rpg-menu-row" onClick={toggleAuto}>
                  <span className="rpg-menu-text">
                    <b>자동 평타</b>
                    <em>{auto ? "사거리 안의 토끼를 저절로 칩니다" : touch ? "공격 버튼을 누르고 있는 동안 칩니다" : "스페이스를 누르고 있는 동안 칩니다"}</em>
                  </span>
                  <span className={`rpg-switch ${auto ? "on" : ""}`}><span /></span>
                </button>
              </div>
            </>
          )}
          {me && !menu && (me.quest.on || inField) && (
            <div className="rpg-quest">
              {me.quest.on
                ? <><b>{QUEST.name}</b> 토끼 {me.quest.n}/{QUEST.need}</>
                : <>사냥꾼에게 퀘스트를 받을 수 있습니다</>}
            </div>
          )}

          <div className="hud hud-right">
            <button className="sbtn sbtn-img" onClick={toggleMute} title="소리" style={{ opacity: mute ? 0.65 : 1 }}>
              <img src={mute ? "/assets/ui/sound-off.webp" : "/assets/ui/sound-on.webp"} alt="" />
            </button>
            <button className="sbtn" onClick={onLeave} title="RPG에서 나가기"><HomeIcon /></button>
          </div>

          {toast && <div className="rpg-toast" key={toast.at}>{toast.name}</div>}

          {me && (talk || me.near) && (
            <div className="rpg-talk">
              <span className="rpg-talk-who">사냥꾼</span>
              <span className="rpg-talk-line">
                {talk || (me.quest.on ? `토끼 ${me.quest.n}/${QUEST.need} — 계속 사냥하게.` : "자네, 사냥을 좀 도와주겠나?")}
              </span>
              {me.near && (
                <button className="btn-ghost rpg-talk-btn" onClick={() => act("talk")}>
                  {me.quest.on ? "남은 수 묻기" : "퀘스트 받기"}{!touch && <kbd>E</kbd>}
                </button>
              )}
            </div>
          )}

          {me && me.down > 0 && (
            <div className="rpg-down">쓰러졌습니다 — {Math.ceil(me.down)}초 뒤 광장에서 일어납니다</div>
          )}

          {dropped && (
            <div className="drop-note">
              방장과의 연결이 끊긴 것 같습니다… <button className="btn-ghost" onClick={onLeave}>처음 화면으로</button>
            </div>
          )}
        </div>

        {touch && (
          <div className="pad">
            <div className="pad-dir">
              {["up", "left", "right", "down"].map((d) => (
                <button key={d} className={`pkey ${d}`} aria-label={d}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 안 되면 그냥 둔다 */ }
                    pressDir(d);
                  }}
                  onPointerUp={(e) => { e.preventDefault(); releaseDir(d); }}
                  onPointerCancel={() => releaseDir(d)}
                  onLostPointerCapture={() => releaseDir(d)}>
                  {{ up: "▲", left: "◀", right: "▶", down: "▼" }[d]}
                </button>
              ))}
              <span className="pad-nub" />
            </div>
            <div className="pad-act">
              <button className={`pbtn ${me && me.sk <= 0 ? "ready" : ""} skill`}
                onPointerDown={(e) => { e.preventDefault(); act("skill"); }}>
                스킬
              </button>
              <button className="pbtn hit"
                onPointerDown={(e) => {
                  e.preventDefault();
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 안 되면 그냥 둔다 */ }
                  act("fire", true);
                }}
                onPointerUp={(e) => { e.preventDefault(); act("fire", false); }}
                onPointerCancel={() => act("fire", false)}
                onLostPointerCapture={() => act("fire", false)}>
                공격
              </button>
            </div>
          </div>
        )}

        <div className="rpg-party">
          {(me ? me.party : []).map((h) => (
            <span key={h.pi} className={`rpg-mate ${h.pi === mySeat ? "mine" : ""}`} style={{ "--pcl": P[h.pi].light }}>
              <b>{names[h.pi] || CLASSES[h.pi].name}</b>
              <em>{CLASSES[h.pi].name} · Lv {h.lv} · {MAPS[h.map].name}</em>
              <span className="rpg-mate-hp"><span style={{ width: `${Math.min(100, (h.hp / (h.max || 1)) * 100)}%` }} /></span>
            </span>
          ))}
        </div>

        <p className="keyhint rpg-keys">
          방 코드 <kbd>{code}</kbd> ·{" "}
          {touch
            ? <>화살표로 이동 · <kbd>공격</kbd> 버튼 평타 · <kbd>스킬</kbd> 버튼 · 사냥꾼 곁에서 대화 · ☰ 에서 자동 평타 켜고 끄기</>
            : <>이동 <kbd>W A S D</kbd> · 평타 <kbd>Space</kbd> · 스킬 <kbd>Shift</kbd> <kbd>Q</kbd> · 사냥꾼 곁에서 <kbd>E</kbd> 대화 · ☰ 에서 자동 평타 켜고 끄기</>}
        </p>
        <details className="footnote">
          <summary>RPG 모드 방법</summary>
          광장 오른쪽의 사냥문으로 들어가면 사냥터입니다. 사냥터 왼쪽 끝의 문으로 나오면 광장입니다.
          자동 평타가 켜져 있으면 사거리 안의 토끼를 저절로 칩니다. 레벨 칸의 ☰ 메뉴에서 끌 수 있고,
          끄면 스페이스(휴대폰은 공격 버튼)를 누르고 있는 동안 칩니다. 켜져 있어도 스페이스로 칠 수 있습니다. 토끼는 늘 {MAPS.field.rabbits}마리 이하로 돌아다니고, 한 마리가 잡히면 한 마리가 새로 나옵니다.
          토끼 한 마리는 경험치 1과 1코인입니다. 레벨을 올리려면 처음엔 경험치 30, 그다음부터는 30씩 더 필요합니다.
          레벨이 오르면 공격력과 체력이 오르고 체력이 가득 찹니다.
          사냥꾼에게 퀘스트를 받아 토끼 {QUEST.need}마리를 잡으면 경험치 {QUEST.xp}과 {QUEST.coin}코인을 더 받습니다. 다시 받을 수 있습니다.
          토끼는 가끔 들이받습니다. {RPG.calm}초 넘게 맞지 않으면 체력이 차오르고, 쓰러지면 {RPG.down}초 뒤 광장에서 일어납니다.
          레벨 · 경험치 · 코인 · 퀘스트는 이 기기에 병과마다 남아, 다음에 들어와도 이어집니다.
          방을 만든 사람이 나가면 그 방은 닫힙니다.
        </details>
      </div>
    </div>
  );
}
