import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { W, H, MOVE_KEYS } from "./game/world.js";
import {
  RPG, RPG_CREW_MAX, MAPS, QUEST, JOBS, ELEMS, GENDERS, NAME_MAX, JOB_BY_ID, ELEM_BY_ID,
  makeWorld, rpgStep, rpgStepVisual, rpgHold, rpgSkill, rpgTalk, rpgAuto, rpgFire,
  rpgSyncSeats, rpgLooks, rpgJoin, rpgPack, rpgApply, rpgApplyOut, needXp, loadChar, makeChar, saveLook, writeChar, deleteChar,
  npcNear, jobOf, elemOf, skillName, heroArtPath, cleanName, cleanLook,
  rpgStat, SPAWNS, STATS, STAT_IDS, STAT_MAX, STAT_PER_LV, statValue, statLeft, statEarned, noStats, LV_MAX,
} from "./game/rpg.js";
import { drawRpg } from "./game/rpgArt.js";
import sfx from "./game/sfx.js";
import { HomeIcon, Coin } from "./ui/icons.jsx";
import { useTouch } from "./ui/touch.js";

const SNAP_HZ = 12;
const SKILL_KEYS = ["ShiftLeft", "ShiftRight", "KeyQ"];
const TALK_KEYS = ["Enter", "KeyE"];
const STAT_KEYS = ["KeyC"];
const FIRE_KEYS = ["Space"];
const AUTO_KEY = "flg:rpgAuto";
// 자동 평타 설정은 이 기기에 남긴다 — 처음엔 켜져 있다
function loadAuto() {
  try { return localStorage.getItem(AUTO_KEY) !== "0"; } catch { return true; }
}
// 받침에 맞는 조사 — "하늘로" · "바람으로"
function ro(word) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  if (c < 0 || c > 11171) return "로";
  const jong = c % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}
const VIEWS = [["front", "앞"], ["side", "옆"], ["back", "뒤"], ["turn", "사선"]];

/* ── 캐릭터 만들기 — 이름을 정하고, 직업 · 원소 · 성별을 고른 뒤 광장으로 ──────────
   이름은 정할 때, 직업 · 원소 · 성별은 처음 게임을 시작할 때 한 번 더 묻고 굳힌다. 넷 다 바꿀 수 없다.
   이 기기에 남아, 다음에 들어오면 그대로 불러와 곧바로 시작할 수 있다.
   room 이 있으면(코드로 들어온 방) 방 코드와 인원을 함께 보여 준다. */
export function RpgSetup({ room, onStart, onLeave }) {
  const [char, setChar] = useState(() => loadChar());
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);        // 이름을 정하기 전에 한 번 더 묻는다
  const [nameErr, setNameErr] = useState("");
  const [job, setJob] = useState(() => (char && char.picked ? char.job : null));
  const [elem, setElem] = useState(() => (char && char.picked ? char.elem : null));
  const [gender, setGender] = useState(() => (char && char.picked ? char.gender : null));
  const [copied, setCopied] = useState("");
  const [sure, setSure] = useState(false);           // 직업 · 원소 · 성별을 굳히기 전에 한 번 더 묻는다
  const [lookErr, setLookErr] = useState("");
  const [del, setDel] = useState(false);             // 캐릭터 삭제 — 이름을 똑같이 적어야 지운다
  const [delName, setDelName] = useState("");
  const [delErr, setDelErr] = useState("");

  const named = !!char;
  const fixed = named && char.picked;                 // 직업 · 원소 · 성별까지 정해 두었다
  const look = { name: char ? char.name : cleanName(draft), job: job || "warrior", elem: elem || "flame", gender: gender || "m" };
  const ready = named && job && elem && gender && !(room && room.full);
  const el = elem ? ELEM_BY_ID[elem] : null;

  const askName = () => {
    const n = cleanName(draft);
    if (!n) return setNameErr("이름을 한 글자 이상 적어 주세요.");
    setNameErr("");
    setAsking(true);
  };
  const fixName = () => {
    const c = makeChar(draft);
    if (!c) return setNameErr("이름을 저장하지 못했습니다. 다시 시도해 주세요.");
    setChar(c);
    setAsking(false);
  };
  const start = () => {
    if (!ready) return;
    const l = cleanLook(fixed ? char : { name: char.name, job, elem, gender });
    if (!l) return;
    if (!fixed && !sure) return setSure(true);
    if (!fixed) {
      if (!saveLook(l)) return setLookErr("저장하지 못했습니다. 다시 시도해 주세요.");
      setChar(loadChar());
    }
    onStart(l);
  };
  const closeDel = () => { setDel(false); setDelName(""); setDelErr(""); };
  const remove = () => {
    if (!char || delName !== char.name) return;
    if (!deleteChar()) return setDelErr("지우지 못했습니다. 다시 시도해 주세요.");
    // 처음 들어온 것처럼 되돌린다
    setChar(null); setDraft(""); setAsking(false); setNameErr("");
    setJob(null); setElem(null); setGender(null); setSure(false); setLookErr("");
    closeDel();
  };
  // 고른 것이 바뀌면 묻던 것은 거둔다
  const choose = (set) => (v) => { set(v); setSure(false); setLookErr(""); };
  const lookText = `${job ? JOB_BY_ID[job].name : "직업"} · ${el ? el.name : "원소"} · ${gender ? (gender === "f" ? "여" : "남") : "성별"}`;
  const fixedRow = (text) => (
    <div className="mk-name-fixed">
      <b>{text}</b>
      <span className="mk-lock">변경 불가</span>
    </div>
  );
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1600); }
    catch { setCopied("fail"); }
  };

  return (
    <div className="page center-page">
      <div className="lobby mk">
        <div className="lobby-head">
          <div>
            <h1>{named ? "모험 준비" : "캐릭터 만들기"}</h1>
            <p className="tag">
              {fixed
                ? "저장된 캐릭터를 불러왔습니다. 게임 시작하기를 누르면 광장으로 나갑니다."
                : named
                  ? "직업 · 원소 · 성별을 고르고 광장으로 나가세요. 셋 다 한 번 정하면 바꿀 수 없습니다."
                  : "이름을 먼저 정합니다. 그다음 직업 · 원소 · 성별을 고르면 광장으로 나갑니다. 넷 다 한 번 정하면 바꿀 수 없습니다."}
            </p>
          </div>
          <div className="lobby-actions">
            <button className="btn-ghost" onClick={onLeave}>나가기</button>
          </div>
        </div>

        {room && (
          <div className="mk-room">
            <span className="mk-label">방 코드</span>
            <strong>{room.code}</strong>
            <span className="mk-room-n">{room.filled}/{RPG_CREW_MAX}명</span>
            <button className="btn-ghost" onClick={() => copy(room.code, "code")}>{copied === "code" ? "복사됨" : "코드 복사"}</button>
            <button className="btn-ghost" onClick={() => copy(room.link, "link")}>{copied === "link" ? "복사됨" : "초대 링크 복사"}</button>
            {room.connecting && <span className="muted">연결하는 중…</span>}
            {room.full && <span className="err">정원이 찼습니다</span>}
            {room.error && <span className="err">{room.error}</span>}
          </div>
        )}

        <div className="mk-body">
          {/* 왼쪽 — 고른 모습 미리 보기 */}
          <div className="mk-preview" style={el ? { "--ec": el.light, "--ed": el.dark } : undefined}>
            <div className={`mk-stage ${job && gender ? "" : "blank"}`}>
              <img key={heroArtPath(look, "front")} src={heroArtPath(look, "front")} alt="" />
            </div>
            <div className="mk-views">
              {VIEWS.map(([v, label]) => (
                <span key={v} className="mk-view">
                  <img src={heroArtPath(look, v)} alt="" />
                  <em>{label}</em>
                </span>
              ))}
            </div>
            <div className="mk-sum">
              <b>{named ? char.name : cleanName(draft) || "이름 없음"}</b>
              <span>{lookText}</span>
              {named && <span className="mk-rec">Lv {char.lv} · 코인 {char.coins}</span>}
            </div>
          </div>

          {/* 오른쪽 — 차례대로 고른다 */}
          <div className="mk-steps">
            <section className="mk-step">
              <h2 className="mk-h"><span>01</span>이름</h2>
              {named ? (
                <div className="mk-name-fixed">
                  <b>{char.name}</b>
                  <span className="mk-lock">변경 불가</span>
                  <p className="mk-note">이름은 한 번 정하면 바꿀 수 없습니다.</p>
                </div>
              ) : asking ? (
                <div className="mk-confirm">
                  <p><b>{cleanName(draft)}</b>{ro(cleanName(draft))} 정할까요?</p>
                  <p className="mk-warn">이름은 변경 불가합니다. 정한 뒤에는 다시 바꿀 수 없습니다.</p>
                  <div className="mk-row">
                    <button className="btn-main" onClick={fixName}>이 이름으로 정하기</button>
                    <button className="btn-ghost" onClick={() => setAsking(false)}>다시 쓰기</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mk-row">
                    <input
                      className="mk-input" value={draft} maxLength={NAME_MAX} placeholder={`${NAME_MAX}글자까지`}
                      onChange={(e) => { setDraft(e.target.value); setNameErr(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") askName(); }}
                    />
                    <button className="btn-ghost tall" onClick={askName}>이름 정하기</button>
                  </div>
                  <p className="mk-warn">이름은 변경 불가합니다. 한 번 정하면 이 기기에 저장되고, 다음에 들어오면 그대로 불러옵니다.</p>
                  {nameErr && <p className="err">{nameErr}</p>}
                </div>
              )}
            </section>

            <fieldset className="mk-step" disabled={!named}>
              <h2 className="mk-h"><span>02</span>직업</h2>
              {fixed ? fixedRow(`${JOB_BY_ID[job].name} · ${JOB_BY_ID[job].weapon}`) : (
              <div className="mk-jobs">
                {JOBS.map((j) => (
                  <button key={j.id} type="button" className={`mk-job ${job === j.id ? "on" : ""}`}
                    aria-pressed={job === j.id} onClick={() => choose(setJob)(j.id)}>
                    <span className="mk-job-img"><img src={heroArtPath({ job: j.id, gender: gender || "m" }, "front")} alt="" /></span>
                    <b>{j.name}</b>
                    <em>{j.weapon}</em>
                    <span className="mk-job-note">{j.note}</span>
                  </button>
                ))}
              </div>
              )}
              {fixed && <p className="mk-note">{JOB_BY_ID[job].note}</p>}
            </fieldset>

            <fieldset className="mk-step" disabled={!named}>
              <h2 className="mk-h"><span>03</span>원소</h2>
              {fixed ? fixedRow(`${el.name} · ${el.tower}`) : (
              <div className="mk-elems">
                {ELEMS.map((e) => (
                  <button key={e.id} type="button" className={`mk-elem ${elem === e.id ? "on" : ""}`}
                    style={{ "--ec": e.light, "--ed": e.dark }} aria-pressed={elem === e.id} onClick={() => choose(setElem)(e.id)}>
                    <span className="mk-dot" />
                    <b>{e.name}</b>
                    <em>{e.tower}</em>
                    <span className="mk-elem-note">평타가 {e.hit}</span>
                  </button>
                ))}
              </div>
              )}
              {el && job && (
                <p className="mk-note">
                  큰 기술 <b>{skillName({ job, elem })}</b> — 둘레 토끼를 크게 치고 {el.big}.
                </p>
              )}
            </fieldset>

            <fieldset className="mk-step" disabled={!named}>
              <h2 className="mk-h"><span>04</span>성별</h2>
              {fixed ? fixedRow(gender === "f" ? "여" : "남") : (
              <div className="mk-genders">
                {GENDERS.map((gd) => (
                  <button key={gd.id} type="button" className={`mk-gender ${gender === gd.id ? "on" : ""}`}
                    aria-pressed={gender === gd.id} onClick={() => choose(setGender)(gd.id)}>
                    {gd.name}
                  </button>
                ))}
              </div>
              )}
            </fieldset>

            <div className="mk-go">
              {sure && !fixed ? (
                <div className="mk-confirm">
                  <p><b>{lookText}</b>{ro(gender === "f" ? "여" : "남")} 정하고 시작할까요?</p>
                  <p className="mk-warn">직업 · 원소 · 성별은 변경 불가합니다. 정한 뒤에는 다시 바꿀 수 없습니다.</p>
                  <div className="mk-row">
                    <button className="btn-main" disabled={!ready} onClick={start}>이대로 정하고 시작하기</button>
                    <button className="btn-ghost" onClick={() => setSure(false)}>다시 고르기</button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="btn-main wide" disabled={!ready} onClick={start}>게임 시작하기</button>
                  <p className={fixed || !(named && job && elem && gender) ? "mk-note" : "mk-warn"}>
                    {!named ? "이름을 먼저 정해 주세요."
                      : !(job && elem && gender) ? "직업 · 원소 · 성별을 모두 고르면 시작할 수 있습니다. 셋 다 한 번 정하면 바꿀 수 없습니다."
                        : fixed ? "누르면 광장으로 이동합니다."
                          : "누르면 한 번 더 묻습니다. 직업 · 원소 · 성별은 변경 불가합니다."}
                  </p>
                </>
              )}
              {lookErr && <p className="err">{lookErr}</p>}
            </div>

            {named && (
              <div className="mk-del">
                {del ? (
                  <div className="mk-del-box" role="alertdialog" aria-labelledby="mk-del-q">
                    <p id="mk-del-q" className="mk-del-q">캐릭터를 삭제하시겠습니까?</p>
                    <p className="mk-note">
                      <b>{char.name}</b>의 이름 · 직업 · 원소 · 성별과 Lv {char.lv} · 코인 {char.coins}이 모두 지워집니다.
                      되돌릴 수 없습니다. 지우려면 캐릭터 이름을 똑같이 적어 주세요.
                    </p>
                    <div className="mk-row">
                      <input
                        className="mk-input" value={delName} maxLength={NAME_MAX} placeholder={char.name}
                        aria-label="삭제할 캐릭터 이름" autoFocus
                        onChange={(e) => { setDelName(e.target.value); setDelErr(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") remove(); if (e.key === "Escape") closeDel(); }}
                      />
                      <button className="btn-danger" disabled={delName !== char.name} onClick={remove}>삭제</button>
                      <button className="btn-ghost" onClick={closeDel}>취소</button>
                    </div>
                    {delErr && <p className="err">{delErr}</p>}
                  </div>
                ) : (
                  <button className="btn-danger" onClick={() => setDel(true)}>캐릭터 삭제</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 광장과 사냥터 ─────────────────────────────────────── */
export default function RpgView({ room, isHost, seats, mySeat, code, onLeave }) {
  const cvsRef = useRef(null);
  const bgsRef = useRef(null);
  const names = useMemo(() => seats.map((s) => s?.name || ""), [seats]);
  const myLook = seats[mySeat]?.hero || null;
  const [auto, setAuto] = useState(loadAuto);        // 자동 평타
  const [start] = useState(() => {                   // 이 기기에 남아 있던 내 기록
    const c = loadChar();
    return c ? { lv: c.lv, xp: c.xp, coins: c.coins, quest: c.quest, stats: c.stats, auto: loadAuto() } : { auto: loadAuto() };
  });

  const G = useRef(null);
  if (!G.current) {
    const g = makeWorld();
    g.mySeat = mySeat;
    if (isHost) g.out = [];
    else g.mobs = [];                               // 손님은 방장이 보낸 토끼만 그린다
    if (import.meta.env.DEV) window.__R = g;        // 개발 중 상태를 들여다보려고
    G.current = g;
  }

  // 자리가 바뀌면 — 방장은 세계에 세우거나 빼고, 손님은 겉모습만 맞춘다. 방장의 내 기록은 내가 바로 싣는다.
  useEffect(() => {
    const g = G.current;
    g.mySeat = mySeat;
    if (!isHost) return void rpgLooks(g, seats);
    rpgSyncSeats(g, seats);
    if (g.heroes[mySeat] && !g.heroes[mySeat].loaded) rpgJoin(g, mySeat, start);
  }, [isHost, seats, mySeat, start]);

  const touch = useTouch();
  const [hud, setHud] = useState(null);
  const [mute, setMute] = useState(() => sfx.isMuted());
  const [dropped, setDropped] = useState(false);
  const [toast, setToast] = useState(null);         // 맵을 옮기면 잠깐 이름을 띄운다
  const [talk, setTalk] = useState(null);           // 사냥꾼의 말
  const [menu, setMenu] = useState(false);          // 레벨 칸의 ☰ 메뉴
  const [statOpen, setStatOpen] = useState(false);  // 스탯 창
  const [plan, setPlan] = useState(noStats);        // 스탯 창에서 적용하기 전에 올려 둔 포인트

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
      if (kind === "stat") rpgStat(g, mySeat, dir);
      else if (kind === "skill") rpgSkill(g, mySeat);
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

  // 메뉴 · 스탯 창은 Esc 나 바깥을 누르면 닫힌다
  useEffect(() => {
    if (!menu && !statOpen) return;
    const onKey = (e) => { if (e.key === "Escape") { setMenu(false); setStatOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, statOpen]);
  // 스탯 창을 닫으면 적용하지 않은 포인트는 거둔다
  useEffect(() => { if (!statOpen) setPlan(noStats()); }, [statOpen]);
  const applyStats = useCallback(() => {
    if (!STAT_IDS.some((k) => plan[k] > 0)) return;
    act("stat", plan);
    setPlan(noStats());
  }, [act, plan]);

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
      if (STAT_KEYS.includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) setStatOpen((v) => !v);
        return;
      }
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
        else if (d.kind === "stat") rpgStat(g, d.cls, d.dir);
      }));
      offs.push(room.on("rjoin", (d) => {
        const g = G.current;
        if (d && Number.isInteger(d.cls) && d.cls >= 0 && d.cls < RPG_CREW_MAX) rpgJoin(g, d.cls, d.data);
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
      else if (f.snd === "orb") sfx.shot("orb");
      else if (f.snd === "slash") sfx.shot("blade");
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
          st: { ...me.st }, left: statLeft(me), loaded: !!me.loaded,
          party: g.heroes.filter(Boolean).map((h) => ({ pi: h.pi, lv: h.lv, map: h.map, hp: h.hp, max: h.max })),
        } : null);
        if (me && me.map !== lastMap) {
          if (lastMap) setToast({ name: MAPS[me.map].name, at: now });
          lastMap = me.map;
        }
        // 실린 뒤로는 바뀔 때마다 이 기기에 남긴다
        if (me && me.loaded) {
          const key = `${me.lv}/${me.xp}/${me.coins}/${me.quest.on ? 1 : 0}/${me.quest.n}/${STAT_IDS.map((k) => me.st[k]).join(",")}`;
          if (key !== saved) { saved = key; writeChar(me); }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isHost, room, playSounds, mySeat]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const me = hud;
  const inField = me && me.map === "field";
  const myEl = elemOf(myLook);
  const who = (pi) => {                              // 파티 칸 — 직업 · 원소
    const l = seats[pi]?.hero;
    return l ? `${elemOf(l).name} ${jobOf(l).name}` : "";
  };

  return (
    <div className={`page ${touch ? "touch" : ""}`}>
      <div className="stage">
        <div className="frame">
          <canvas ref={cvsRef} />

          {/* 왼쪽 위 — 레벨 · 경험치 · 체력 · 코인 */}
          {me && (
            <div className="rpg-lv" style={{ "--pc": myEl.key, "--pcl": myEl.light }}>
              <span className="rpg-lv-badge"><em>Lv</em>{me.lv}</span>
              <button type="button" className={`rpg-lv-menu ${menu ? "on" : ""}`} aria-label="메뉴" aria-haspopup="menu"
                aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                <span /><span /><span />
              </button>
              <span className="rpg-lv-body">
                <span className="rpg-lv-name"><b>{names[mySeat] || "모험가"}</b> {who(mySeat)}</span>
                <span className="rpg-lv-row">
                  <span className="rpg-lv-tag">XP</span>
                  <span className="rpg-lv-bar xp"><span style={{ width: `${me.lv >= LV_MAX ? 100 : Math.min(100, (me.xp / me.need) * 100)}%` }} /></span>
                  <span className="rpg-lv-num">{me.lv >= LV_MAX ? "MAX" : `${me.xp}/${me.need}`}</span>
                </span>
                <span className="rpg-lv-row">
                  <span className="rpg-lv-tag">HP</span>
                  <span className="rpg-lv-bar hp"><span style={{ width: `${Math.min(100, (me.hp / (me.max || 1)) * 100)}%` }} /></span>
                  <span className="rpg-lv-num">{me.hp}/{me.max}</span>
                </span>
                <span className="rpg-lv-foot">
                  <span className="rpg-lv-coin"><Coin />{me.coins}</span>
                  <button type="button" className={`rpg-lv-stat ${me.left > 0 ? "has" : ""} ${statOpen ? "on" : ""}`}
                    aria-expanded={statOpen} onClick={() => { setMenu(false); setStatOpen((v) => !v); }}>
                    스탯{me.left > 0 && <b>+{me.left}</b>}
                  </button>
                  <span className={`rpg-lv-sk ${me.sk <= 0 ? "ready" : ""}`}>
                    {skillName(myLook)} {me.sk <= 0 ? "준비됨" : `${Math.ceil(me.sk)}초`}
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
                    <em>{auto ? "사거리 안의 몹을 저절로 칩니다" : touch ? "공격 버튼을 누르고 있는 동안 칩니다" : "스페이스를 누르고 있는 동안 칩니다"}</em>
                  </span>
                  <span className={`rpg-switch ${auto ? "on" : ""}`}><span /></span>
                </button>
              </div>
            </>
          )}
          {me && statOpen && (() => {
            const planned = STAT_IDS.reduce((n, k) => n + plan[k], 0);
            const room = me.left - planned;
            const hpMul = jobOf(myLook).hp;
            return (
              <>
                <div className="rpg-menu-back" onClick={() => setStatOpen(false)} />
                <div className="rpg-stat" role="dialog" aria-label="스탯">
                  <div className="rpg-stat-head">
                    <b>스탯</b>
                    <span>남은 포인트 <em>{room}</em></span>
                  </div>
                  <p className="rpg-stat-rule">
                    레벨이 오를 때마다 {STAT_PER_LV}포인트 · 스탯마다 최대 {STAT_MAX} · {LV_MAX}레벨까지 모두 {statEarned(LV_MAX)}포인트
                  </p>
                  <div className="rpg-stat-list">
                    {STATS.map((t) => {
                      const cur = me.st[t.id] || 0;
                      const add = plan[t.id];
                      const v0 = statValue(t.id, cur), v1 = statValue(t.id, cur + add);
                      return (
                        <div key={t.id} className="rpg-stat-row">
                          <span className="rpg-stat-name">
                            <b>{t.name}</b>
                            <em>{t.id === "hp" ? `최대 체력 ${Math.round(v1 * hpMul).toLocaleString("ko-KR")}` : t.note}</em>
                          </span>
                          <span className="rpg-stat-val">
                            {t.fmt(v0)}{add > 0 && <> <i>→</i> <strong>{t.fmt(v1)}</strong></>}
                          </span>
                          <span className="rpg-stat-pts">{cur + add}<small>/{STAT_MAX}</small></span>
                          <span className="rpg-stat-btns">
                            <button type="button" aria-label={`${t.name} 내리기`} disabled={add <= 0}
                              onClick={() => setPlan((p) => ({ ...p, [t.id]: p[t.id] - 1 }))}>−</button>
                            <button type="button" aria-label={`${t.name} 올리기`}
                              disabled={!me.loaded || room <= 0 || cur + add >= STAT_MAX}
                              onClick={() => setPlan((p) => ({ ...p, [t.id]: p[t.id] + 1 }))}>+</button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rpg-stat-foot">
                    <button type="button" className="btn-main" disabled={planned <= 0} onClick={applyStats}>
                      적용하기{planned > 0 ? ` (${planned})` : ""}
                    </button>
                    <button type="button" className="btn-ghost" disabled={planned <= 0} onClick={() => setPlan(noStats())}>다시 고르기</button>
                    <span className="rpg-stat-warn">적용하면 되돌릴 수 없습니다.</span>
                  </div>
                </div>
              </>
            );
          })()}
          {me && !menu && !statOpen && (me.quest.on || inField) && (
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
            <span key={h.pi} className={`rpg-mate ${h.pi === mySeat ? "mine" : ""}`} style={{ "--pcl": elemOf(seats[h.pi]?.hero).light }}>
              <b>{names[h.pi] || "모험가"}</b>
              <em>{who(h.pi)} · Lv {h.lv} · {MAPS[h.map].name}</em>
              <span className="rpg-mate-hp"><span style={{ width: `${Math.min(100, (h.hp / (h.max || 1)) * 100)}%` }} /></span>
            </span>
          ))}
        </div>

        <p className="keyhint rpg-keys">
          <kbd>{code}</kbd> · 접속 {seats.filter(Boolean).length}/{RPG_CREW_MAX}명 ·{" "}
          {touch
            ? <>화살표로 이동 · <kbd>공격</kbd> 버튼 평타 · <kbd>스킬</kbd> 버튼 · 사냥꾼 곁에서 대화 · 레벨 칸의 스탯 버튼 · ☰ 에서 자동 평타 켜고 끄기</>
            : <>이동 <kbd>W A S D</kbd> · 평타 <kbd>Space</kbd> · 스킬 <kbd>Shift</kbd> <kbd>Q</kbd> · 사냥꾼 곁에서 <kbd>E</kbd> 대화 · 스탯 <kbd>C</kbd> · ☰ 에서 자동 평타 켜고 끄기</>}
        </p>
        <details className="footnote">
          <summary>RPG 모드 방법</summary>
          광장 오른쪽의 사냥문으로 들어가면 토끼 사냥터입니다. 토끼 사냥터 오른쪽 끝의 문으로 가면 늑대 사냥터(10~20레벨)이고, 각 사냥터 왼쪽 끝의 문으로 돌아옵니다.
          자동 평타가 켜져 있으면 사거리 안의 몹을 저절로 칩니다. 레벨 칸의 ☰ 메뉴에서 끌 수 있고,
          끄면 스페이스(휴대폰은 공격 버튼)를 누르고 있는 동안 칩니다. 켜져 있어도 스페이스로 칠 수 있습니다.
          몹 머리 위에 레벨이 보이고, 레벨이 높을수록 크고 단단합니다. 입구에서 멀어질수록 높은 레벨이 나옵니다.
          토끼는 1~5레벨로 {SPAWNS[0].n}마리, 대왕 토끼(보스 · 10레벨)는 {SPAWNS[1].n}마리까지 나옵니다.
          늑대는 10~20레벨로 {SPAWNS[2].n}마리, 우두머리 늑대(보스 · 25레벨)는 {SPAWNS[3].n}마리까지 나옵니다. 한 마리가 잡히면 한 마리가 새로 나옵니다.
          토끼는 레벨마다 경험치 2와 1코인씩 늘어납니다(1레벨 토끼는 경험치 2 · 1코인). 늑대도 같은 셈이라 10레벨 늑대는 경험치 20 · 10코인입니다.
          토끼는 맞으면 달아나고 가끔 들이받지만, 늑대와 보스는 가까이 가거나 때리면 쫓아옵니다.
          레벨을 올리려면 처음엔 경험치 30, 그다음부터는 30씩 더 필요합니다.
          레벨이 오르면 체력이 가득 차고 스탯 포인트 {STAT_PER_LV}를 받습니다(처음 만들 때도 {STAT_PER_LV}포인트). 최고 레벨은 {LV_MAX}입니다.
          레벨 칸의 스탯 버튼(키보드는 C)에서 물리력 · 마법력 · 체력 · 치명타 확률 · 치명타 피해에 나눠 찍습니다.
          스탯마다 {STAT_MAX}까지 찍을 수 있어 둘만 가득 채울 수 있고, 적용하면 되돌릴 수 없습니다.
          물리력은 전사 · 궁수, 마법력은 마법사의 공격력을 올리고, 화상 · 독 피해는 직업과 상관없이 마법력을 따릅니다.
          사냥꾼에게 퀘스트를 받아 토끼 {QUEST.need}마리를 잡으면 경험치 {QUEST.xp}과 {QUEST.coin}코인을 더 받습니다. 다시 받을 수 있습니다.
          {RPG.calm}초 넘게 맞지 않으면 체력이 차오르고, 쓰러지면 {RPG.down}초 뒤 광장에서 일어납니다.
          전사는 둘레를 한 번에 베고, 마법사는 원소 구슬로 맞은 자리 둘레까지 치고, 궁수는 가장 멀리서 한 마리를 노립니다.
          고른 원소는 평타에 약하게, 큰 기술에 세게 실립니다.
          이름 · 직업 · 원소 · 성별은 한 번 정하면 바꿀 수 없습니다. 레벨 · 경험치 · 코인 · 퀘스트와 함께 이 기기에 남아, 다음에 들어와도 이어집니다.
          방 코드 없이 모두 같은 서버에 들어갑니다. 서버마다 {RPG_CREW_MAX}명까지이고, 가득 차면 다음 서버로 넘어갑니다.
          판정을 맡은 사람이 나가면 남은 사람이 이어받습니다. 이때 모두 광장에서 다시 서고 몹은 새로 나옵니다(레벨 · 코인 · 스탯은 그대로입니다).
        </details>
      </div>
    </div>
  );
}
