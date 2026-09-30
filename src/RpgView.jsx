import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { W, H, P, CLASSES, SEATS, DIFFS, MOVE_KEYS, BUILD_KEYS, SKILL_KEYS } from "./game/world.js";
import {
  RPG, RPG_ROUNDS, RPG_CARDS, RPG_SKILL, makeRpg, rpgStep, rpgStepVisual, rpgHold, rpgSkill, rpgPick,
  rpgSetHero, rpgPack, rpgApply, rpgApplyOut, needXp, heroNeed, heroSkillCd, heroRecord, commitRun, HERO_MAX,
} from "./game/rpg.js";
import { paintRpgField, drawRpg } from "./game/rpgArt.js";
import sfx from "./game/sfx.js";
import { ClassIcon, HomeIcon } from "./ui/icons.jsx";
import { useTouch } from "./ui/touch.js";

const SNAP_HZ = 12;
const CARD_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
const CARD_BY_ID = Object.fromEntries(RPG_CARDS.map((c) => [c.id, c]));

export default function RpgView({ room, isHost, seats, diff, mySeat, onBack }) {
  const cvsRef = useRef(null);
  const bgRef = useRef(null);
  const idx = useMemo(() => Array.from({ length: SEATS }, (_, i) => i), []);
  const seatFlags = useMemo(() => idx.map((i) => !!seats[i]), [idx, seats]);
  const names = useMemo(() => idx.map((i) => seats[i]?.name || ""), [idx, seats]);
  const myCls = mySeat >= 0 ? CLASSES[mySeat].id : null;
  // 판을 시작할 때의 내 영웅 레벨 — 이 기기에 남아 있던 기록이다
  const [start] = useState(() => (myCls ? heroRecord(myCls) : null));

  const G = useRef(null);
  if (!G.current) {
    const g = makeRpg(seatFlags, diff);
    g.names = names;
    g.mySeat = mySeat;
    if (isHost) g.out = [];
    if (isHost && mySeat >= 0 && start) rpgSetHero(g, mySeat, start.lv);
    if (import.meta.env.DEV) window.__R = g;     // 개발 중 상태를 들여다보려고
    G.current = g;
  }

  const touch = useTouch();
  const [hud, setHud] = useState(() => snapHud(G.current));
  const [mute, setMute] = useState(() => sfx.isMuted());
  const [dropped, setDropped] = useState(false);
  const [saved, setSaved] = useState(null);      // 판이 끝나고 영웅에게 쌓인 결과

  function snapHud(g) {
    const me = g.mySeat >= 0 ? g.heroes[g.mySeat] : null;
    const left = g.out ? g.queue.length + g.mobs.length : g.left || 0;
    return {
      phase: g.phase, round: g.round, timer: Math.max(0, g.timer), left, runId: g.runId,
      me: me && {
        lv: me.lv, xp: me.xp, need: needXp(me.lv), hp: Math.max(0, Math.round(me.hp)), max: me.max,
        sk: me.sk, skMax: heroSkillCd(me), down: me.down, hlv: me.hlv, gain: me.gain,
        offer: me.offers.length ? me.offers[0] : me.offer || null,
        pend: me.offers.length || me.pend || 0,
        cards: RPG_CARDS.filter((c) => me.cards[c.id]).map((c) => [c.id, me.cards[c.id]]),
      },
      party: g.heroes.filter(Boolean).map((h) => ({
        pi: h.pi, lv: h.lv, hp: Math.max(0, h.hp), max: h.max, down: h.down, kills: h.kills,
        dmg: Math.round(h.dmg), gain: Math.round(h.gain), hlv: h.hlv,
      })),
    };
  }

  const toggleMute = useCallback(() => {
    sfx.unlock();
    const v = !sfx.isMuted();
    sfx.setMuted(v);
    setMute(v);
  }, []);

  /* 한 번의 조작 — 방장은 바로 판정하고, 손님은 방장에게 보낸다 */
  const act = useCallback((kind, dir) => {
    const g = G.current;
    if (mySeat < 0) return;
    sfx.unlock();
    if (kind === "hold") {
      rpgHold(g, mySeat, dir);                   // 손님도 내 영웅은 먼저 걷는다
      if (!isHost) room?.send("input", { cls: mySeat, kind, dir });
      return;
    }
    if (isHost) {
      if (kind === "skill") rpgSkill(g, mySeat);
      else if (kind === "card") rpgPick(g, mySeat, dir);
    } else {
      room?.send("input", { cls: mySeat, kind, dir });
    }
  }, [isHost, mySeat, room]);

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
    if (mySeat < 0) return;
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const dir = MOVE_KEYS[e.code];
      const isSkill = SKILL_KEYS.includes(e.code) || BUILD_KEYS.includes(e.code);
      const card = CARD_KEYS[e.code];
      if (!dir && !isSkill && card === undefined) return;
      e.preventDefault();
      if (e.repeat) return;
      if (dir) pressDir(dir);
      else if (isSkill) act("skill");
      else act("card", card);
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

  /* 통신 */
  useEffect(() => {
    if (!room) return;
    const offs = [];
    if (isHost) {
      offs.push(room.on("input", (d) => {
        const g = G.current;
        if (!d || !g.seats[d.cls]) return;
        if (d.kind === "hold") rpgHold(g, d.cls, d.dir);
        else if (d.kind === "skill") rpgSkill(g, d.cls);
        else if (d.kind === "card") rpgPick(g, d.cls, d.dir);
      }));
      offs.push(room.on("rhero", (d) => {
        const g = G.current;
        if (d && g.seats[d.cls]) rpgSetHero(g, d.cls, d.lv);
      }));
    } else {
      let last = Date.now();
      offs.push(room.on("rsnap", (d) => { last = Date.now(); rpgApply(G.current, d); }));
      offs.push(room.on("rout", (d) => rpgApplyOut(G.current, d)));
      const watch = setInterval(() => setDropped(Date.now() - last > 6000), 2000);
      offs.push(() => clearInterval(watch));
      // 내 영웅 레벨을 방장에게 알린다 — 받았다는 게 보일 때까지 몇 번 더 보낸다
      if (mySeat >= 0 && start) {
        let tries = 0;
        const tell = () => room.send("rhero", { cls: mySeat, lv: start.lv });
        tell();
        const again = setInterval(() => {
          const h = G.current.heroes[mySeat];
          if ((h && h.hlv === start.lv) || ++tries > 12) return clearInterval(again);
          tell();
        }, 1000);
        offs.push(() => clearInterval(again));
      }
    }
    return () => offs.forEach((off) => off && off());
  }, [room, isHost, mySeat, start]);

  /* 소리 — 새로 생긴 연출에만 한 번씩 */
  const playSounds = useCallback((g) => {
    if (sfx.isMuted()) return;
    for (const f of g.fx) {
      if (f.played) continue;
      f.played = true;
      if (!f.snd) continue;
      if (f.snd === "shot") sfx.shot("arrow");
      else if (f.snd === "cannon") sfx.shot("shell");
      else sfx.play(f.snd);
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
    paintRpgField(bctx);
    bgRef.current = bg;

    /* 판이 끝나면 번 경험치를 이 기기의 영웅에게 한 번 쌓는다 */
    let committed = false;
    const commit = (g) => {
      if (committed || (g.phase !== "clear" && g.phase !== "over")) return;
      committed = true;
      const h = mySeat >= 0 ? g.heroes[mySeat] : null;
      if (!h) return;
      setSaved(commitRun({
        runId: g.runId, cls: CLASSES[mySeat].id, gain: h.gain, round: g.round,
        diffId: (DIFFS[diff] || DIFFS[1]).id, clear: g.phase === "clear",
      }));
    };

    let raf, last = performance.now(), frame = 0, sinceSnap = 0;
    const loop = (now) => {
      let dt = (now - last) / 1000;
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
      commit(g);
      drawRpg(ctx, g, bgRef.current);
      if (++frame % 5 === 0) setHud(snapHud(g));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isHost, room, playSounds, mySeat, diff]);

  const over = hud.phase === "clear" || hud.phase === "over";

  const me = hud.me;
  const phaseLabel = hud.phase === "intro" ? "준비"
    : hud.phase === "fight" ? (hud.round === 5 || hud.round === 10 ? "보스 라운드" : "사냥 중")
    : hud.phase === "rest" ? "숨 고르기"
    : hud.phase === "clear" ? "사냥 완료" : "전멸";
  const offer = me && me.offer;

  return (
    <div className={`page ${touch ? "touch" : ""}`}>
      <div className="stage">
        <div className="frame">
          <canvas ref={cvsRef} />

          <div className="hud hud-left">
            <div className="wave-box">
              <span className={`wave-label ${hud.phase === "fight" && (hud.round === 5 || hud.round === 10) ? "hot" : ""}`}>
                RPG · {phaseLabel}
              </span>
              <span className="wave-num">라운드 {Math.max(1, hud.round)}<em>/{RPG_ROUNDS}</em></span>
              <span className="wave-diff">{DIFFS[diff]?.name}</span>
              <span className="wave-sub">
                {hud.phase === "intro" ? `${Math.ceil(hud.timer)}초 뒤 시작`
                  : hud.phase === "rest" ? `${Math.ceil(hud.timer)}초 뒤 다음 라운드`
                  : hud.phase === "fight" ? `남은 괴물 ${hud.left}` : "—"}
              </span>
            </div>
          </div>

          <div className="hud hud-right">
            <button className="sbtn sbtn-img" onClick={toggleMute} title="소리" style={{ opacity: mute ? 0.65 : 1 }}>
              <img src={mute ? "/assets/ui/sound-off.webp" : "/assets/ui/sound-on.webp"} alt="" />
            </button>
            <button className="sbtn" onClick={onBack} title={isHost ? "모두 대기실로" : "방장에게 대기실로 가자고 합니다"}>
              <HomeIcon />
            </button>
          </div>

          {offer && !over && (
            <div className="rpg-offer" role="group" aria-label="레벨 업 카드">
              <span className="rpg-offer-head">
                레벨 업 — 한 장 고르기{!touch && <em> 1 · 2 · 3</em>}
                {me.pend > 1 && <b>+{me.pend - 1}</b>}
              </span>
              <div className="rpg-offer-row">
                {offer.map((id, k) => {
                  const c = CARD_BY_ID[id];
                  if (!c) return null;
                  const have = me.cards.find((x) => x[0] === id);
                  return (
                    <button key={id} className="rpg-card" onClick={() => act("card", k)}
                      style={{ "--pcl": P[mySeat].light }}>
                      {!touch && <span className="rpg-card-key">{k + 1}</span>}
                      <span className="rpg-card-name">{c.name}</span>
                      <span className="rpg-card-note">{c.note}</span>
                      {have && <span className="rpg-card-have">지금 {have[1]}장</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {dropped && <div className="drop-note">방장과의 연결이 끊긴 것 같습니다…</div>}

          {over && (
            <div className="curtain over">
              <RpgResult
                hud={hud} names={names} mySeat={mySeat} diff={diff} saved={saved} start={start}
                onBack={onBack}
              />
            </div>
          )}
        </div>

        {touch && mySeat >= 0 && (
          <div className={`pad ${over ? "off" : ""}`}>
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
              <button className={`pbtn hit ${me && me.sk <= 0 ? "ready" : ""}`}
                onPointerDown={(e) => { e.preventDefault(); act("skill"); }}>
                스킬
              </button>
            </div>
          </div>
        )}

        {me && mySeat >= 0 && (
          <div className="rpg-me" style={{ "--pc": P[mySeat].key, "--pcl": P[mySeat].light, "--pcd": P[mySeat].dark }}>
            <div className="rpg-me-head">
              <span className={`badge ${P[mySeat].pale ? "pale" : ""}`}><ClassIcon i={mySeat} /></span>
              <b>{names[mySeat] || CLASSES[mySeat].name}</b>
              <span className="rpg-me-cls">{CLASSES[mySeat].name}</span>
              <span className="rpg-me-hero" title="판이 끝나도 남는 영웅 레벨">영웅 Lv.{me.hlv}</span>
            </div>
            <div className="rpg-bars">
              <span className="rpg-bar-label">Lv {me.lv}</span>
              <span className="rpg-bar xp"><span style={{ width: `${Math.min(100, (me.xp / me.need) * 100)}%` }} /></span>
              <span className="rpg-bar-val">{Math.floor(me.xp)} / {me.need}</span>
              <span className="rpg-bar-label">체력</span>
              <span className="rpg-bar hp">
                <span style={{ width: `${Math.min(100, (me.hp / (me.max || 1)) * 100)}%` }} />
              </span>
              <span className="rpg-bar-val">{me.down > 0 ? `${Math.ceil(me.down)}초 뒤 일어남` : `${me.hp} / ${me.max}`}</span>
              <span className="rpg-bar-label">스킬</span>
              <span className={`rpg-bar sk ${me.sk <= 0 ? "ready" : ""}`}>
                <span style={{ width: `${Math.min(100, (1 - me.sk / me.skMax) * 100)}%` }} />
              </span>
              <span className={`rpg-bar-val ${me.sk <= 0 ? "ready" : ""}`}>
                {RPG_SKILL[myCls].name} · {me.sk <= 0 ? "준비됨" : `${Math.ceil(me.sk)}초`}
              </span>
            </div>
            {me.cards.length > 0 && (
              <div className="rpg-chips">
                {me.cards.map(([id, n]) => (
                  <span key={id} className="rpg-chip">{CARD_BY_ID[id].name}{n > 1 && <em>×{n}</em>}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rpg-party">
          {hud.party.map((h) => (
            <span key={h.pi} className={`rpg-mate ${h.down > 0 ? "down" : ""} ${h.pi === mySeat ? "mine" : ""}`}
              style={{ "--pcl": P[h.pi].light }}>
              <b>{names[h.pi] || CLASSES[h.pi].name}</b>
              <em>{CLASSES[h.pi].name} · Lv {h.lv}</em>
              <span className="rpg-mate-hp"><span style={{ width: `${Math.min(100, (h.hp / (h.max || 1)) * 100)}%` }} /></span>
            </span>
          ))}
        </div>

        <p className="keyhint rpg-keys">
          {touch
            ? <>화살표로 <kbd>이동</kbd> · 공격은 저절로 나갑니다 · <kbd>스킬</kbd> 버튼 · 카드는 눌러서 고르기</>
            : <>이동 <kbd>W A S D</kbd> · 공격은 저절로 나갑니다 · 스킬 <kbd>Shift</kbd> <kbd>Space</kbd> · 카드 <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></>}
        </p>
        <details className="footnote">
          <summary>RPG 모드 방법</summary>
          사거리 안에 들어온 괴물은 저절로 칩니다. 걸으면서도 쏘니, 붙지 않게 움직이며 싸우세요.
          {RPG.calm}초 넘게 맞지 않으면 체력이 조금씩 차오릅니다.
          괴물을 잡으면 경험치를 다 같이 나눕니다. 레벨이 오를 때마다 카드 세 장 가운데 하나를 고릅니다.
          고르는 동안에도 판은 멈추지 않습니다. 여러 장이 쌓여 있으면 차례로 나옵니다.
          다섯째 라운드엔 오우거 지휘관, 열째 라운드엔 대군주가 나옵니다. 바닥이 붉게 차오르면 그 자리를 벗어나세요.
          쓰러지면 {RPG.revive}초 뒤에 일어납니다. 모두 쓰러지면 그 판은 끝납니다.
          이번 판의 레벨과 카드는 판이 끝나면 사라집니다. 대신 번 경험치가 영웅 레벨로 이 기기에 남습니다.
          영웅 레벨이 오를수록 공격력과 체력이 조금씩 오르고, 다음 판에도 이어집니다. 영웅 레벨은 병과마다 따로 쌓입니다.
        </details>
      </div>
    </div>
  );
}

function RpgResult({ hud, names, mySeat, diff, saved, start, onBack }) {
  const clear = hud.phase === "clear";
  const rows = hud.party.slice().sort((a, b) => b.dmg - a.dmg);
  const top = rows.length ? rows[0].dmg : 0;
  const num = (v) => Math.round(v).toLocaleString("ko-KR");
  return (
    <div className="rpg-end">
      <div className="rpg-end-head">
        <h2>{clear ? "사냥 완료" : "모두 쓰러졌습니다"}</h2>
        <span>{DIFFS[diff]?.name} · {clear ? `${RPG_ROUNDS}라운드 모두 버팀` : `라운드 ${hud.round}에서 끝남`}</span>
      </div>

      <div className="rpg-end-list">
        {rows.map((r, k) => (
          <div key={r.pi} className={`rpg-end-row ${r.pi === mySeat ? "mine" : ""}`} style={{ "--pcl": P[r.pi].light }}>
            <span className="rpg-end-rank">{k + 1}</span>
            <span className="rpg-end-who"><b>{names[r.pi] || CLASSES[r.pi].name}</b><em>{CLASSES[r.pi].name} · Lv {r.lv}</em></span>
            <span className="rpg-end-bar"><span style={{ width: `${top > 0 ? (r.dmg / top) * 100 : 0}%` }} /></span>
            <span className="rpg-end-num">{num(r.dmg)}</span>
            <span className="rpg-end-note">{r.kills}마리</span>
          </div>
        ))}
      </div>

      {mySeat >= 0 && saved && (
        <div className="rpg-end-hero" style={{ "--pcl": P[mySeat].light }}>
          <span className="rpg-end-hero-label">내 영웅 · {CLASSES[mySeat].name}</span>
          <b>
            {saved.after > (start?.lv ?? saved.before)
              ? <>Lv.{start?.lv ?? saved.before} → Lv.{saved.after}</>
              : <>Lv.{saved.after}</>}
          </b>
          <span className="rpg-bar xp">
            <span style={{ width: saved.after >= HERO_MAX ? "100%" : `${Math.min(100, (saved.xp / heroNeed(saved.after)) * 100)}%` }} />
          </span>
          <em>
            경험치 +{num(hud.me?.gain || 0)}
            {saved.after < HERO_MAX ? ` · 다음 레벨까지 ${num(heroNeed(saved.after) - saved.xp)}` : " · 최고 레벨"}
          </em>
        </div>
      )}

      <button className="btn-main" onClick={onBack}>대기실로</button>
    </div>
  );
}
