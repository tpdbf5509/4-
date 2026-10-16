import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { W, H } from "./game/world.js";
import {
  RPG, RPG_CREW_MAX, MAPS, QUEST, JOBS, ELEMS, GENDERS, NAME_MAX, JOB_BY_ID, ELEM_BY_ID,
  makeWorld, rpgStep, rpgStepVisual, rpgHold, rpgSkill, rpgTalk, rpgAuto, rpgFire,
  rpgSyncSeats, rpgLooks, rpgJoin, rpgPromote, rpgPack, rpgApply, rpgApplyOut, holdKey, freshInput, needXp, loadChar, saveLook, writeChar, deleteChar,
  charRecord, setAccount, coinOf, xpOf, DUEL, honorGain, rpgDuel, MOB_REGEN, ACTIVE_SKILLS, rpgUseSkill, rpgDash, predictDash, predictLunge, DASH,
  npcNear, jobOf, elemOf, skillName, heroArtPath, cleanLook,
  rpgParty, rpgTitle, titleName, needNow, titleMet, rpgRequest, whyReqDone, reqNear, MOB,
  rpgStat, SPAWNS, STATS, STAT_IDS, STAT_MAX, STAT_PER_LV, statValue, statLeft, statEarned, noStats, LV_MAX,
} from "./game/rpg.js";
import { rpgShop, nearShop, extraStat, SHOP_BY_ID, POTION_BY_ID } from "./game/shop.js";
import { POTION } from "./game/shopData.js";
import { TITLES, NEED_NAME, PARTY, CHAT } from "./game/socialData.js";
import { REQ_BY_NPC, REQUESTS, REQ_SHOW } from "./game/requestData.js";
import { MAT_BY_ID, DROPS, GIFT } from "./game/itemData.js";
import { UPDATES, RPG_NOTICE } from "./game/updates.js";
import { KEY_ACTIONS, KEY_SLOTS, loadKeys, saveKeys, defaultKeys, bindKey, clearKey, keyMap, keyLabel, keyOf } from "./game/keys.js";
import { ShopPanel, BagPanel } from "./ShopPanel.jsx";
import RpgAccount from "./RpgAccount.jsx";
import { compareBuild } from "./net/version.js";
import { cloudQueue, cloudFlush, cloudStart, deleteRemote, errText, honorTop } from "./net/rpgSave.js";
import { drawRpg } from "./game/rpgArt.js";
import sfx from "./game/sfx.js";
import { HomeIcon, Coin } from "./ui/icons.jsx";
import { useTouch } from "./ui/touch.js";

// 실시간 서버(Supabase 무료)는 프로젝트 전체에서 초당 메시지 100개가 한도다. 넘으면 모두의 연결을 끊는다.
// 메시지는 보낼 때 1개, 받는 사람마다 1개로 센다. 그래서 스냅샷 빈도를 서버 인원으로 나눈다
const SNAP_BUDGET = 48;    // 스냅샷에 쓰는 초당 메시지 수(보냄 + 받는 사람 수) — 나머지는 입력 · 대기실 몫
const SNAP_MAX = 10;       // 사람이 적을 때 초당 스냅샷
const SNAP_MIN = 3;        // 사람이 많아도 이만큼은 보낸다
// 보내는 차례 번호 — Supabase 는 같은 사람이 보낸 메시지도 순서를 바꿔 전할 때가 있다(실측 25초에 5~15번).
// 받는 쪽은 번호가 더 작은 스냅샷 · 입력을 버려, 옛 위치로 당겨지지 않게 한다. 새로 고쳐도 줄지 않게 지금 시각에서 시작한다
let sendSeq = Date.now();
const nextSeq = () => ++sendSeq;
const RESEND_AFTER = 700;  // 방장이 내 입력을 이만큼(ms) 지나도 모르면 다시 보낸다 — 끊긴 사이 잃은 입력을 되살린다
const STEP_MAX = 0.05;     // 한 번에 돌리는 판정 시간(초)
const CATCH_UP = 0.25;     // 방장 화면이 잠깐 멈췄을 때 따라잡는 최대 시간(초)
const snapHz = (n) => Math.max(SNAP_MIN, Math.min(SNAP_MAX, SNAP_BUDGET / Math.max(1, n)));
// 키는 키 설정 창에서 바꾼다(src/game/keys.js). 산 스킬 칸 use1~4 는 SKILLS[].use.key 와 짝이다
const MOVE_ACTS = { up: "up", down: "down", left: "left", right: "right" };
const AUTO_KEY = "flg:rpgAuto";
const NOTICE_KEY = "flg:rpgNotice";   // 이 기기에서 마지막으로 본 업데이트 공지 id(updates.js RPG_NOTICE)
// 자동 평타 설정은 이 기기에 남긴다 — 처음엔 켜져 있다
function loadAuto() {
  try { return localStorage.getItem(AUTO_KEY) !== "0"; } catch { return true; }
}
// 광장 의뢰 한 줄 — 무엇을 · 얼마나 했는지 · 보상
const reqTitle = (q) => (q.kind === "hunt" ? `${MOB[q.mob].name} ${q.n}마리 잡기` : `${MAT_BY_ID[q.mat].name} ${q.n}개 가져오기`);
const reqProg = (q, r, h) => (q.kind === "hunt"
  ? `${Math.min(r.n, q.n)}/${q.n}마리`
  : `가진 수 ${Math.min((h.bag.m && h.bag.m[q.mat]) || 0, q.n)}/${q.n}`);
const reqPay = (q, lv) => [q.coin ? `${q.coin.toLocaleString("ko-KR")}코인` : "", lv < LV_MAX && q.xp ? `경험치 ${Math.max(1, Math.round(needXp(lv) * q.xp)).toLocaleString("ko-KR")}` : "",
  ...Object.entries(q.mats || {}).map(([id, n]) => `${MAT_BY_ID[id].name} ${n}`)].filter(Boolean).join(" · ");
// 받침에 맞는 조사 — "하늘로" · "바람으로"
function ro(word) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  if (c < 0 || c > 11171) return "로";
  const jong = c % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}
const VIEWS = [["front", "앞"], ["side", "옆"], ["back", "뒤"], ["turn", "사선"]];

/* ── 캐릭터 만들기 — 이름 · 코드를 정하고, 직업 · 원소 · 성별을 고른 뒤 광장으로 ──────────
   이름 · 코드는 01 칸(RpgAccount)에서 정하고 서버에 만든다. 직업 · 원소 · 성별은 처음 게임을 시작할 때 한 번 더 묻고 굳힌다.
   이름 · 직업 · 원소 · 성별은 바꿀 수 없다. 이 기기와 서버에 남아, 다른 기기에서도 이름 + 코드로 이어 한다.
   room 이 있으면(코드로 들어온 방) 방 코드와 인원을 함께 보여 준다. */
export function RpgSetup({ room, onStart, onLeave }) {
  const [char, setChar] = useState(() => loadChar());
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
  const admin = named && char.admin;                  // 관리자 캐릭터 — 직업 · 원소 · 성별을 언제든 바꾼다
  const fixed = named && char.picked && !admin;       // 직업 · 원소 · 성별까지 정해 두었다
  const look = { name: char ? char.name : "", job: job || "warrior", elem: elem || "flame", gender: gender || "m" };
  const ready = named && job && elem && gender && !(room && room.full);
  const el = elem ? ELEM_BY_ID[elem] : null;

  // 01 칸에서 캐릭터가 바뀌었다(새로 만듦 · 서버에서 불러옴 · 코드를 정함)
  const applyChar = (c) => {
    setChar(c);
    setJob(c && c.picked ? c.job : null); setElem(c && c.picked ? c.elem : null); setGender(c && c.picked ? c.gender : null);
    setSure(false); setLookErr("");
  };
  const start = () => {
    if (!ready) return;
    const l = cleanLook(fixed ? char : { name: char.name, job, elem, gender });
    if (!l) return;
    if (!fixed && !sure && !admin) return setSure(true);
    if (!fixed) {
      if (!saveLook(l)) return setLookErr("저장하지 못했습니다. 다시 시도해 주세요.");
      const c = loadChar();
      setChar(c);
      cloudQueue(c.name, c.tok, charRecord());     // 고른 모습을 서버에도 바로 남긴다
      cloudFlush();
    }
    onStart(l);
  };
  const closeDel = () => { setDel(false); setDelName(""); setDelErr(""); };
  const [delBusy, setDelBusy] = useState(false);
  const remove = async () => {
    if (!char || delName !== char.name || delBusy) return;
    // 서버에도 있으면 서버부터 지운다. 다른 기기에 밀려 입장권이 없으면 이 기기 기록만 지운다
    if (char.linked && char.tok) {
      setDelBusy(true);
      const r = await deleteRemote(char.name, char.tok);
      setDelBusy(false);
      if (!r.ok && r.err !== "token") return setDelErr(`서버에서 지우지 못했습니다. ${errText(r)}`);
    }
    if (!deleteChar()) return setDelErr("지우지 못했습니다. 다시 시도해 주세요.");
    // 처음 들어온 것처럼 되돌린다
    applyChar(null);
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
              {admin
                ? "관리자 캐릭터는 직업 · 원소 · 성별을 언제든 바꿀 수 있습니다. 고른 뒤 게임 시작하기를 누르면 바뀐 모습으로 나갑니다."
                : fixed
                ? "저장된 캐릭터를 불러왔습니다. 게임 시작하기를 누르면 광장으로 나갑니다."
                : named
                  ? "직업 · 원소 · 성별을 고르고 광장으로 나가세요. 셋 다 한 번 정하면 바꿀 수 없습니다."
                  : "이름과 숫자 5자리 코드를 먼저 정합니다. 그다음 직업 · 원소 · 성별을 고르면 광장으로 나갑니다. 다른 기기에서는 이름과 코드로 이어 합니다."}
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
              <b>{named ? char.name : "이름 없음"}</b>
              <span>{lookText}</span>
              {named && <span className="mk-rec">Lv {char.lv} · 코인 {char.coins}</span>}
            </div>
          </div>

          {/* 오른쪽 — 차례대로 고른다 */}
          <div className="mk-steps">
            <section className="mk-step">
              <h2 className="mk-h"><span>01</span>이름 · 코드</h2>
              <RpgAccount char={char} onChar={applyChar} />
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
                      : admin && job && elem && gender ? "관리자 — 누르면 고른 모습으로 광장으로 이동합니다. 다음에 다시 바꿀 수 있습니다."
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
                      {char.linked ? " 서버에 저장된 기록도 지워집니다." : ""} 되돌릴 수 없습니다. 지우려면 캐릭터 이름을 똑같이 적어 주세요.
                    </p>
                    <div className="mk-row">
                      <input
                        className="mk-input" value={delName} maxLength={NAME_MAX} placeholder={char.name}
                        aria-label="삭제할 캐릭터 이름" autoFocus
                        onChange={(e) => { setDelName(e.target.value); setDelErr(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") remove(); if (e.key === "Escape") closeDel(); }}
                      />
                      <button className="btn-danger" disabled={delName !== char.name || delBusy} onClick={remove}>{delBusy ? "지우는 중…" : "삭제"}</button>
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
export default function RpgView({ room, isHost, hostId, seats, mySeat, code, onLeave }) {
  const cvsRef = useRef(null);
  const bgsRef = useRef(null);
  const names = useMemo(() => seats.map((s) => s?.name || ""), [seats]);
  const myLook = seats[mySeat]?.hero || null;
  const [auto, setAuto] = useState(loadAuto);        // 자동 평타
  const autoRef = useRef(auto);
  const dirsRef = useRef([]);                       // 누르고 있는 방향
  const fireRef = useRef(false);                    // 스페이스를 누르고 있다
  const sentAt = useRef(0);                         // 손님이 방장에게 이동 · 평타 입력을 마지막으로 보낸 때
  // 이 기기에 남아 있는 내 기록 — 방장에게 알릴 때마다 새로 읽는다(방장이 바뀌면 그동안 쌓인 것까지 보낸다)
  const myData = () => {
    const c = loadChar();
    const extra = { auto: autoRef.current, hold: dirsRef.current.slice() };
    return c ? { lv: c.lv, xp: c.xp, coins: c.coins, quest: c.quest, stats: c.stats, bag: c.bag, admin: c.admin,
      rec: c.rec, titles: c.titles, title: c.title, honor: c.honor, reqs: c.reqs, gift: c.gift, ...extra } : extra;
  };

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
  // 손님이던 내가 방장을 이어받았으면 받은 세계를 그대로 판정 세계로 바꾼다(모두의 자리 · 몹이 그대로 이어진다)
  useEffect(() => {
    const g = G.current;
    g.mySeat = mySeat;
    if (!isHost) {
      g.out = null;                                 // 방장에서 물러났으면 이제 받은 것만 그린다
      return void rpgLooks(g, seats);
    }
    if (!g.out) rpgPromote(g);
    rpgSyncSeats(g, seats);
    if (g.heroes[mySeat] && !g.heroes[mySeat].loaded) rpgJoin(g, mySeat, myData());
  }, [isHost, seats, mySeat]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = useTouch();
  const [hud, setHud] = useState(null);
  const [mute, setMute] = useState(() => sfx.isMuted());
  const [dropped, setDropped] = useState(false);
  const [toast, setToast] = useState(null);         // 맵을 옮기면 잠깐 이름을 띄운다
  const [talk, setTalk] = useState(null);           // 사냥꾼의 말
  const [menu, setMenu] = useState(false);          // 레벨 칸의 ☰ 메뉴
  const [statOpen, setStatOpen] = useState(false);  // 스탯 창
  const [plan, setPlan] = useState(noStats);        // 스탯 창에서 적용하기 전에 올려 둔 포인트
  const [shopOpen, setShopOpen] = useState(null);   // 열어 둔 상점 id
  const [bagOpen, setBagOpen] = useState(false);    // 가방 창
  const [bagTab, setBagTab] = useState("stat");     // 가방 창을 열 때 처음 보일 탭
  const [note, setNote] = useState(null);           // 상점 결과 한 줄 — 내 것만
  const shopRef = useRef(null);                     // 루프가 보는 열린 상점
  const [titleOpen, setTitleOpen] = useState(false); // 칭호 창
  const [partyOpen, setPartyOpen] = useState(false); // 파티 창
  const [keysOpen, setKeysOpen] = useState(false);   // 키 설정 창
  const [answeredAt, setAnsweredAt] = useState(0);   // 초대에 답한 때 — 방장 답이 올 때까지 초대 창을 숨긴다
  const [duelAt, setDuelAt] = useState(0);           // 결투 신청에 답한 때
  const [honorOpen, setHonorOpen] = useState(false); // 명예 순위 창
  const [reqOpen, setReqOpen] = useState(null);      // 열어 둔 의뢰 NPC id
  // 업데이트 안내 창 — 새 공지(RPG_NOTICE)를 이 기기에서 아직 안 봤거나, 이번 선물을 처음 받았을 때 한 번. { gift, notes }
  const [giftOpen, setGiftOpen] = useState(null);
  const giftRef = useRef(null);                      // 들어올 때 이미 받은 선물이었는지 — 루프가 본다
  if (giftRef.current === null) giftRef.current = (loadChar() || {}).gift === GIFT.id;
  const reqRef = useRef(null);                       // 루프가 보는 열린 의뢰 창
  const [rank, setRank] = useState({ list: null, err: "", busy: false });
  // 명예 순위 — 창을 열 때마다 서버에서 새로 읽는다
  const loadRank = useCallback(async () => {
    setRank((r) => ({ ...r, busy: true, err: "" }));
    const res = await honorTop(20);
    setRank(res.ok ? { list: res.list, err: "", busy: false } : { list: null, err: errText(res), busy: false });
  }, []);
  const [binds, setBinds] = useState(loadKeys);      // 행동마다 키 두 칸
  const bindsRef = useRef(binds);
  const [waitKey, setWaitKey] = useState(null);      // 키 설정 창에서 새 키를 기다리는 칸 { id, slot }
  // 채팅 — 줄마다 { id, kind: all · party · sys, name, text, at }
  const [chatLog, setChatLog] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatScope, setChatScope] = useState("all");
  const [chatErr, setChatErr] = useState("");
  const chatAt = useRef(0);                          // 마지막으로 보낸 때 — CHAT.gap 초에 한 번
  const chatInput = useRef(null);
  const chatSeq = useRef(0);
  const [nowMs, setNowMs] = useState(() => Date.now());   // 채팅 줄 흐리기 · 초대 창 숨기기에 쓰는 시각 — 1초마다
  const pushChat = useCallback((line) => {
    chatSeq.current += 1;
    const it = { id: chatSeq.current, at: Date.now(), ...line };
    setChatLog((l) => [...l.slice(-(CHAT.keep - 1)), it]);
  }, []);
  // 창은 한 번에 하나만 연다
  const closeAll = useCallback(() => {
    setMenu(false); setStatOpen(false); setShopOpen(null); setBagOpen(false);
    setTitleOpen(false); setPartyOpen(false); setKeysOpen(false); setWaitKey(null); setHonorOpen(false); setReqOpen(null); setGiftOpen(null);
  }, []);
  const toggleWin = useCallback((open, set) => { closeAll(); setNote(null); if (!open) set(true); }, [closeAll]);
  useEffect(() => { bindsRef.current = binds; saveKeys(binds); }, [binds]);

  // 서버 저장 — 코드를 정한 캐릭터만. 다른 기기가 나중에 들어오면 이 기기의 서버 저장을 멈추고 알린다
  const acctRef = useRef(null);                     // { name, tok }
  const [kicked, setKicked] = useState(false);
  const [oldHost, setOldHost] = useState(false);    // 방장이 옛 버전 — 새 기능이 안 될 수 있다
  useEffect(() => {
    const c = loadChar();
    acctRef.current = c && c.linked && c.tok ? { name: c.name, tok: c.tok } : null;
    return cloudStart(() => {
      acctRef.current = null;
      setAccount({ tok: "" });
      setKicked(true);
    });
  }, []);
  useEffect(() => { shopRef.current = shopOpen; }, [shopOpen]);
  useEffect(() => { reqRef.current = reqOpen; }, [reqOpen]);

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
      if (!isHost) { sentAt.current = Date.now(); room?.send("input", { cls: mySeat, kind, dir, q: nextSeq() }); }
      return;
    }
    if (kind === "fire") { fireRef.current = !!dir; sentAt.current = Date.now(); }
    if (kind === "talk") {
      const h = g.heroes[mySeat];
      const npc = npcNear(h);
      if (!npc) return;
      if (npc.board) { closeAll(); setHonorOpen(true); loadRank(); return; }   // 명예 순위판 — 창만 연다
      if (npc.req) { closeAll(); setReqOpen(npc.req); return; }                // 의뢰 NPC — 창을 열고, 받기 · 완료는 창에서 보낸다
      if (npc.shop) {                               // 상점은 창만 연다 — 사고파는 것은 창에서 보낸다
        setStatOpen(false); setMenu(false); setBagOpen(false); setNote(null);
        setShopOpen(npc.shop);
        return;
      }
      setTalk(h.quest.on
        ? `아직 ${QUEST.need - h.quest.n}마리 남았네. 토끼도 가끔 들이받으니 조심하게.`
        : `토끼 ${QUEST.need}마리만 잡아 주게. 경험치 ${QUEST.xp}과 ${QUEST.coin}코인을 주겠네.`);
    }
    if (kind === "dash" && !isHost) predictDash(g.heroes[mySeat]);   // 손님도 내 대쉬는 먼저 그린다
    if (kind === "use" && !isHost) predictLunge(g, g.heroes[mySeat], dir);   // 급소 찌르기 돌진도 먼저 그린다
    if (isHost) {
      if (kind === "dash") rpgDash(g, mySeat);
      else if (kind === "stat") rpgStat(g, mySeat, dir);
      else if (kind === "shop") rpgShop(g, mySeat, dir);
      else if (kind === "use") rpgUseSkill(g, mySeat, dir);
      else if (kind === "skill") rpgSkill(g, mySeat);
      else if (kind === "talk") rpgTalk(g, mySeat);
      else if (kind === "fire") rpgFire(g, mySeat, dir);
      else if (kind === "auto") rpgAuto(g, mySeat, dir);
      else if (kind === "party") rpgParty(g, mySeat, dir);
      else if (kind === "title") rpgTitle(g, mySeat, dir);
      else if (kind === "duel") rpgDuel(g, mySeat, dir);
      else if (kind === "req") rpgRequest(g, mySeat, dir);
    } else {
      room?.send("input", { cls: mySeat, kind, dir, q: nextSeq() });
    }
  }, [isHost, mySeat, room, closeAll, loadRank]);

  const toggleAuto = useCallback(() => {
    const next = !autoRef.current;
    autoRef.current = next;
    setAuto(next);
    try { localStorage.setItem(AUTO_KEY, next ? "1" : "0"); } catch { /* 저장이 막혀 있으면 이번만 */ }
    act("auto", next);
  }, [act]);

  // 메뉴 · 스탯 · 상점 · 가방 창은 Esc 나 바깥을 누르면 닫힌다
  useEffect(() => {
    if (!menu && !statOpen && !shopOpen && !bagOpen && !titleOpen && !partyOpen && !keysOpen && !honorOpen && !reqOpen && !giftOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !waitKey) closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, statOpen, shopOpen, bagOpen, titleOpen, partyOpen, keysOpen, honorOpen, reqOpen, giftOpen, waitKey, closeAll]);

  const sendShop = useCallback((req) => act("shop", req), [act]);
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

  // 채팅 칸을 연다 — 걷던 것은 멈춘다
  const openChat = useCallback(() => {
    clearDirs();
    act("fire", false);
    setChatOpen(true);
    setChatErr("");
    setTimeout(() => chatInput.current?.focus(), 0);
  }, [act, clearDirs]);

  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (waitKey) return;                          // 키 설정 창이 새 키를 기다린다
      const a = keyMap(bindsRef.current)[e.code];
      if (!a) return;
      e.preventDefault();
      if (MOVE_ACTS[a]) { if (!e.repeat) pressDir(MOVE_ACTS[a]); return; }
      if (e.repeat) return;
      if (a === "fire") act("fire", true);          // 누르고 있는 동안 평타
      else if (a === "skill") act("skill");
      else if (a === "dash") act("dash");
      else if (a === "talk") act("talk");
      else if (a.startsWith("pot")) {                // 물약 칸 — 넣어 둔 물약을 마신다
        const id = (G.current.heroes[mySeat]?.bag.qs || [])[Number(a.slice(3)) - 1];
        if (id) act("shop", { op: "puse", id });
      }
      else if (a.startsWith("use")) {
        const s = ACTIVE_SKILLS.find((q) => q.use.key === Number(a.slice(3)));
        if (s) act("use", s.id);
      }
      else if (a === "chat") openChat();
      else if (a === "stat") toggleWin(statOpen, setStatOpen);
      else if (a === "bag") toggleWin(bagOpen, setBagOpen);
      else if (a === "title") toggleWin(titleOpen, setTitleOpen);
      else if (a === "party") toggleWin(partyOpen, setPartyOpen);
    }
    function onUp(e) {
      const a = keyMap(bindsRef.current)[e.code];
      if (MOVE_ACTS[a]) releaseDir(MOVE_ACTS[a]);
      if (a === "fire") act("fire", false);
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
  }, [act, mySeat, pressDir, releaseDir, clearDirs, openChat, toggleWin, waitKey, statOpen, bagOpen, titleOpen, partyOpen]);

  // 키 설정 창 — 고른 칸에 다음으로 누른 키를 넣는다. Esc 는 그만두기, Backspace · Delete 는 비우기
  useEffect(() => {
    if (!waitKey) return;
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") return setWaitKey(null);
      if (e.code === "Backspace" || e.code === "Delete") setBinds((b) => clearKey(b, waitKey.id, waitKey.slot));
      else setBinds((b) => bindKey(b, waitKey.id, waitKey.slot, e.code));
      setWaitKey(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [waitKey]);

  /* 채팅 — 방장을 거치지 않고 서버의 모두에게 바로 보낸다. 파티 채팅은 같은 파티만 띄운다 */
  const seatsRef = useRef(seats);
  useEffect(() => { seatsRef.current = seats; }, [seats]);
  useEffect(() => {
    if (!room) return;
    return room.on("chat", (d, from) => {
      if (!d || typeof d.t !== "string") return;
      const text = d.t.trim().slice(0, CHAT.max);
      if (!text) return;
      const pi = seatsRef.current.findIndex((st) => st && st.id === from);
      if (pi < 0) return;
      const g = G.current;
      const me = g.heroes[mySeat];
      const party = d.s === "party";
      if (party && (!me || !me.pty || me.pty !== d.p)) return;
      if (!g.bubbles) g.bubbles = {};
      g.bubbles[pi] = { text, until: performance.now() + CHAT.bubble * 1000 };
      pushChat({ kind: party ? "party" : "all", name: seatsRef.current[pi].name || "모험가", text });
    });
  }, [room, mySeat, pushChat]);
  const sendChat = () => {
    const text = chatText.trim().slice(0, CHAT.max);
    if (!text) { setChatOpen(false); return; }
    const wait = CHAT.gap * 1000 - (Date.now() - chatAt.current);
    if (wait > 0) return setChatErr(`${Math.ceil(wait / 100) / 10}초 뒤에 보낼 수 있습니다.`);
    const g = G.current;
    const me = g.heroes[mySeat];
    const party = chatScope === "party";
    if (party && (!me || !me.pty)) return setChatErr("파티에 들어가야 파티 채팅을 쓸 수 있습니다.");
    chatAt.current = Date.now();
    room?.send("chat", { t: text, s: party ? "party" : "all", p: party ? me.pty : 0 });
    if (!g.bubbles) g.bubbles = {};
    g.bubbles[mySeat] = { text, until: performance.now() + CHAT.bubble * 1000 };
    pushChat({ kind: party ? "party" : "all", name: names[mySeat] || "모험가", text, mine: true });
    setChatText("");
    setChatErr("");
    setChatOpen(false);
  };
  // 오래된 줄이 흐려지게 1초마다 시각을 새로 한다
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* 통신 */
  useEffect(() => {
    if (!room) return;
    const offs = [];
    if (isHost) {
      offs.push(room.on("input", (d) => {
        const g = G.current;
        if (!d || !g.heroes[d.cls]) return;
        if (!freshInput(g.heroes[d.cls], d.kind, d.q)) return;   // 늦게 도착한 옛 누름 · 뗌은 버린다
        if (d.kind === "hold") rpgHold(g, d.cls, d.dir);
        else if (d.kind === "skill") rpgSkill(g, d.cls);
        else if (d.kind === "talk") rpgTalk(g, d.cls);
        else if (d.kind === "fire") rpgFire(g, d.cls, !!d.dir);
        else if (d.kind === "auto") rpgAuto(g, d.cls, !!d.dir);
        else if (d.kind === "stat") rpgStat(g, d.cls, d.dir);
        else if (d.kind === "use") rpgUseSkill(g, d.cls, d.dir);
        else if (d.kind === "dash") rpgDash(g, d.cls);
        else if (d.kind === "shop") rpgShop(g, d.cls, d.dir);
        else if (d.kind === "party") rpgParty(g, d.cls, d.dir);
        else if (d.kind === "title") rpgTitle(g, d.cls, d.dir);
        else if (d.kind === "duel") rpgDuel(g, d.cls, d.dir);
        else if (d.kind === "req") rpgRequest(g, d.cls, d.dir);
      }));
      offs.push(room.on("rjoin", (d) => {
        const g = G.current;
        // 보낸 사람 id(who)가 그 자리 주인과 같을 때만 싣는다 — 떠난 사람의 늦은 기록이 새 사람에게 실리지 않게
        if (d && Number.isInteger(d.cls) && d.cls >= 0 && d.cls < RPG_CREW_MAX && typeof d.who === "string") rpgJoin(g, d.cls, d.data, d.who);
      }));
    } else {
      let last = Date.now();
      let verSeen;
      let snapFrom = "", snapQ = 0;                 // 마지막으로 반영한 스냅샷 — 방장이 바뀌면 처음부터 센다
      offs.push(room.on("rsnap", (d, from) => {
        last = Date.now();
        const g = G.current;
        if (from !== snapFrom) { snapFrom = from; snapQ = 0; }
        const stale = d.q && d.q <= snapQ;          // 늦게 도착한 옛 스냅샷 — 상태는 버리고 연출만 쓴다
        if (d.q && !stale) snapQ = d.q;
        if (!stale) rpgApply(g, d);
        if (d.o) rpgApplyOut(g, d.o);               // 연출은 스냅샷에 함께 온다
        if (stale) return;
        if (d.ver !== verSeen) { verSeen = d.ver; setOldHost(compareBuild(d.ver)); }
        // 방장이 아는 내 입력이 내 키와 다르면(끊긴 사이 잃었다) 잠시 기다렸다가 다시 보낸다
        const h = g.heroes[mySeat];
        if (!h || !h.echo || !h.loaded || h.down > 0 || Date.now() - sentAt.current < RESEND_AFTER) return;
        const want = holdKey(dirsRef.current), fire = fireRef.current ? 1 : 0;
        if (h.echo.hold === want && h.echo.fire === fire) return;
        sentAt.current = Date.now();
        if (h.echo.hold !== want) room.send("input", { cls: mySeat, kind: "hold", dir: dirsRef.current.slice(), q: nextSeq() });
        if (h.echo.fire !== fire) room.send("input", { cls: mySeat, kind: "fire", dir: !!fire, q: nextSeq() });
      }));
      offs.push(room.on("rout", (d) => rpgApplyOut(G.current, d)));   // 옛 버전 방장은 연출을 따로 보낸다
      const watch = setInterval(() => setDropped(Date.now() - last > 6000), 2000);
      offs.push(() => clearInterval(watch));
      // 내 기록을 방장에게 알린다 — 실렸다는 게 보일 때까지 다시 보낸다. 방장이 바뀌면(hostId) 새 방장에게 다시 보낸다
      const mine = G.current.heroes[mySeat];
      if (mine) mine.loaded = 0;
      const tell = () => room.send("rjoin", { cls: mySeat, who: seatsRef.current[mySeat]?.id, data: myData() });
      tell();
      const again = setInterval(() => {
        const h = G.current.heroes[mySeat];
        if (h && h.loaded) return clearInterval(again);
        tell();
      }, 1000);
      offs.push(() => clearInterval(again));
    }
    return () => offs.forEach((off) => off && off());
  }, [room, isHost, hostId, mySeat]); // eslint-disable-line react-hooks/exhaustive-deps

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

    let raf, last = performance.now(), frame = 0, sinceSnap = 0, saved = "", lastMap = "", lastNote = null, noticeDone = false;
    const loop = (now) => {
      // 첫 프레임의 시각은 루프를 건 시각보다 앞설 수 있다 — 거꾸로 가지 않게 막는다
      const real = Math.max(0, (now - last) / 1000);
      last = now;
      const dt = Math.min(real, STEP_MAX);
      const g = G.current;
      if (isHost) {
        // 방장 기기가 느려도(초당 프레임이 적어도) 세계 시간은 제 속도로 흐르게 잘게 나눠 돌린다
        for (let left = Math.min(real, CATCH_UP); left > 0; left -= STEP_MAX) rpgStep(g, Math.min(left, STEP_MAX));
        sinceSnap += real;
        const every = 1 / snapHz(g.heroes.filter(Boolean).length);
        if (sinceSnap >= every) {
          sinceSnap = Math.min(sinceSnap - every, every);   // 프레임이 듬성해도 정한 빈도를 지킨다
          // 연출도 스냅샷 한 통에 실어 메시지 수를 줄인다
          const snap = rpgPack(g);
          snap.q = nextSeq();                       // 손님은 이 번호보다 작은 스냅샷이 늦게 오면 버린다
          if (g.out.length) {
            snap.o = g.out.splice(0, 60);
            if (g.out.length > 150) g.out.length = 0;
          }
          room?.send("rsnap", snap);
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
          coins: me.coins, quest: { ...me.quest }, sk: me.sk, down: me.down, map: me.map, near: npcNear(me),
          st: { ...me.st }, left: statLeft(me), loaded: !!me.loaded, bagV: me.bag.v, admin: !!me.admin,
          // 산 스킬 칸 — 배운 것만, 남은 대기 시간과 함께
          skills: ACTIVE_SKILLS.filter((s) => me.bag.s[s.id] > 0).map((s) => ({ id: s.id, key: s.use.key, name: s.name,
            lv: me.bag.s[s.id], cd: (me.scd && me.scd[s.id]) || 0, max: s.use.cd })),
          dashCd: me.dashCd || 0,
          // 물약 칸 — 넣어 둔 물약과 가진 수
          pots: Array.from({ length: POTION.slots }, (_, i) => {
            const id = (me.bag.qs || [])[i];
            return id && POTION_BY_ID[id] ? { id, name: POTION_BY_ID[id].name, n: me.bag.p[id] || 0 } : null;
          }),
          extra: Object.fromEntries(STAT_IDS.map((k) => [k, extraStat(me, k)])),
          // 상점 · 가방 창이 조건을 따질 때 쓰는 내 영웅의 모습
          self: { loaded: me.loaded, down: me.down, map: me.map, x: me.x, y: me.y, lv: me.lv, coins: me.coins, admin: !!me.admin,
            hp: me.hp, max: me.max, st: { ...me.st }, bag: me.bag, bf: { ...me.bf },
            dvs: me.dvs,
            reqs: Object.fromEntries(Object.entries(me.reqs || {}).map(([k, v]) => [k, { ...v }])) },
          party: g.heroes.filter(Boolean).map((h) => ({ pi: h.pi, lv: h.lv, map: h.map, hp: h.hp, max: h.max, pty: h.pty, title: h.title,
            honor: h.honor || 0, dvs: h.dvs })),
          honor: me.honor || 0, duelInv: me.duelInv ? me.duelInv.from : -1, dvs: me.dvs, dph: me.dph, dtl: me.dtl || 0,
          pty: me.pty, inv: me.invite ? me.invite.from : -1, title: me.title, titles: me.titles.slice(), rec: { ...me.rec },
        } : null);
        // 파티 · 칭호 알림 — 내 것 가운데 새로 온 것만 채팅 칸에
        g.sys.forEach((n) => { if (n.who === mySeat && !n.seen) { n.seen = true; pushChat({ kind: "sys", text: n.msg }); } });
        // 상점 결과 — 내 것 가운데 새로 온 것만
        const mine = g.notes.filter((n) => n.who === mySeat);
        const top = mine[mine.length - 1];
        if (top && top !== lastNote) { lastNote = top; setNote(top); }
        // 상점에서 멀어지면 상점 창을 닫는다
        if (me && shopRef.current && !nearShop(me, shopRef.current)) { shopRef.current = null; setShopOpen(null); }
        if (me && reqRef.current && !reqNear(me, reqRef.current)) { reqRef.current = null; setReqOpen(null); }
        if (me && me.loaded && !noticeDone) {
          noticeDone = true;
          const gift = me.gift === GIFT.id && !giftRef.current;
          let seen = "";
          try { seen = localStorage.getItem(NOTICE_KEY) || ""; localStorage.setItem(NOTICE_KEY, RPG_NOTICE.id); } catch { /* 저장이 막혀 있으면 이번만 */ }
          const notes = [...new Set([...(seen !== RPG_NOTICE.id ? RPG_NOTICE.notes : []), ...(gift ? GIFT.notes : [])])];
          if (gift || notes.length) setGiftOpen({ gift, notes });
          giftRef.current = true;
        }
        if (me && me.map !== lastMap) {
          if (lastMap) setToast({ name: MAPS[me.map].name, at: now });
          lastMap = me.map;
        }
        // 실린 뒤로는 바뀔 때마다 이 기기에 남긴다
        if (me && me.loaded) {
          const key = `${me.lv}/${me.xp}/${me.coins}/${me.quest.on ? 1 : 0}/${me.quest.n}/${STAT_IDS.map((k) => me.st[k]).join(",")}/${me.bag.ld ? me.bag.v : "-"}`
            + `/${me.title}/${me.titles.length}/${Object.values(me.rec).join(",")}/${me.honor || 0}/${JSON.stringify(me.reqs || {})}/${me.gift || ""}`;
          if (key !== saved) {
            saved = key;
            writeChar(me);
            const a = acctRef.current;
            if (a) cloudQueue(a.name, a.tok, charRecord());
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isHost, room, playSounds, mySeat, pushChat]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const me = hud;
  const inField = me && me.map === "field";
  const nearShopNpc = me && me.near && me.near.shop ? SHOP_BY_ID[me.near.shop] : null;
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
                <span className="rpg-lv-name"><b>{names[mySeat] || "모험가"}</b> {who(mySeat)}{me.admin && <em className="rpg-admin">관리자</em>}</span>
                <span className="rpg-lv-sub">
                  <span className="rpg-lv-title">{me.title ? `「${titleName(me.title)}」` : ""}</span>
                  <span className={`rpg-lv-sk ${me.sk <= 0 ? "ready" : ""}`}>
                    {skillName(myLook)} {me.sk <= 0 ? "준비됨" : `${Math.ceil(me.sk)}초`}
                  </span>
                </span>
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
                  <span className="rpg-lv-coin"><Coin />{me.admin ? "무제한" : me.coins}</span>
                  <button type="button" className={`rpg-lv-stat ${me.left > 0 ? "has" : ""} ${statOpen ? "on" : ""}`}
                    aria-expanded={statOpen} onClick={() => toggleWin(statOpen, setStatOpen)}>
                    스탯{me.left > 0 && <b>+{me.left}</b>}
                  </button>
                  <button type="button" className={`rpg-lv-stat ${bagOpen ? "on" : ""}`} aria-expanded={bagOpen}
                    onClick={() => toggleWin(bagOpen, setBagOpen)}>
                    가방
                  </button>
                  <button type="button" className={`rpg-lv-stat ${titleOpen ? "on" : ""}`} aria-expanded={titleOpen}
                    onClick={() => toggleWin(titleOpen, setTitleOpen)}>
                    칭호
                  </button>
                  <button type="button" className={`rpg-lv-stat ${me.pty ? "has" : ""} ${partyOpen ? "on" : ""}`} aria-expanded={partyOpen}
                    onClick={() => toggleWin(partyOpen, setPartyOpen)}>
                    파티{me.pty > 0 && <b>{me.party.filter((h) => h.pty === me.pty).length}</b>}
                  </button>
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
                {!touch && (
                  <button type="button" role="menuitem" className="rpg-menu-row" onClick={() => toggleWin(false, setKeysOpen)}>
                    <span className="rpg-menu-text">
                      <b>키 설정</b>
                      <em>이동 · 공격 · 창 열기 키를 바꿉니다</em>
                    </span>
                    <span className="rpg-menu-go">›</span>
                  </button>
                )}
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
                            {me.extra[t.id] > 0 && <i> +{t.fmt(me.extra[t.id])}</i>}
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
          {me && titleOpen && (
            <>
              <div className="rpg-menu-back" onClick={() => setTitleOpen(false)} />
              <div className="rpg-stat rpg-win" role="dialog" aria-label="칭호">
                <div className="rpg-stat-head">
                  <b>칭호</b>
                  <span>얻은 칭호 <em>{me.titles.length}</em> / {TITLES.length}</span>
                </div>
                <p className="rpg-stat-rule">조건을 채우면 칭호를 얻습니다. 하나를 골라 이름 아래에 답니다. 능력치는 바뀌지 않습니다.</p>
                <div className="rpg-stat-list">
                  {TITLES.map((t) => {
                    const has = me.titles.includes(t.id), on = me.title === t.id;
                    const prog = Object.entries(t.need).map(([k, n]) => (k === "lv"
                      ? `${n}레벨`
                      : `${NEED_NAME[k]} ${Math.min(needNow(me, k), n).toLocaleString("ko-KR")}/${n.toLocaleString("ko-KR")}`)).join(" · ");
                    return (
                      <div key={t.id} className={`rpg-win-row ${has ? "" : "locked"} ${on ? "on" : ""}`}>
                        <span className="rpg-stat-name"><b>{t.name}</b><em>{has && !titleMet(me, t) ? "얻음" : prog}</em></span>
                        {has
                          ? <button type="button" className="rpg-win-btn" onClick={() => act("title", on ? "" : t.id)}>{on ? "떼기" : "달기"}</button>
                          : <span className="rpg-win-tag">잠김</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {me && partyOpen && (() => {
            const mates = me.pty ? me.party.filter((h) => h.pty === me.pty) : [];
            const full = mates.length >= PARTY.max;
            return (
              <>
                <div className="rpg-menu-back" onClick={() => setPartyOpen(false)} />
                <div className="rpg-stat rpg-win" role="dialog" aria-label="파티">
                  <div className="rpg-stat-head">
                    <b>파티</b>
                    <span>{me.pty ? <>파티원 <em>{mates.length}</em> / {PARTY.max}</> : "아직 파티가 없습니다"}</span>
                  </div>
                  <p className="rpg-stat-rule">
                    몹을 함께 친 사람은 모두 경험치와 코인을 다 받습니다. 치지 않은 같은 맵의 파티원은 경험치의 {Math.round(PARTY.share * 100)}%를 받습니다.
                    채팅 칸에서 "파티"를 고르면 파티원에게만 보입니다.
                    "결투"를 누르면 1대1 결투를 신청합니다. 이기면 상대 명예의 {Math.round(DUEL.honorRate * 100)}% + {DUEL.honorBase} 만큼 명예가 오릅니다.
                  </p>
                  <div className="rpg-stat-list">
                    {me.party.map((h) => {
                      const mine = h.pi === mySeat, mate = me.pty && h.pty === me.pty;
                      return (
                        <div key={h.pi} className={`rpg-win-row ${mate ? "on" : ""}`}>
                          <span className="rpg-stat-name">
                            <b>{names[h.pi] || "모험가"}{h.title && <small> 「{titleName(h.title)}」</small>}</b>
                            <em>Lv {h.lv} · {who(h.pi)} · {MAPS[h.map].name}</em>
                          </span>
                          <span className="rpg-win-acts">
                            {mine ? <span className="rpg-win-tag">나 · 명예 {h.honor}</span>
                              : mate ? <span className="rpg-win-tag">파티원</span>
                                : h.pty ? <span className="rpg-win-tag">다른 파티</span>
                                  : <button type="button" className="rpg-win-btn" disabled={full}
                                    onClick={() => act("party", { op: "invite", to: h.pi })}>초대</button>}
                            {!mine && (h.dvs >= 0
                              ? <span className="rpg-win-tag">결투 중</span>
                              : <button type="button" className="rpg-win-btn duel" disabled={me.dvs >= 0} title={`명예 ${h.honor} · 이기면 +${honorGain(h.honor)}`}
                                onClick={() => act("duel", { op: "ask", to: h.pi })}>결투</button>)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {me.pty > 0 && (
                    <div className="rpg-stat-foot">
                      <button type="button" className="btn-ghost" onClick={() => act("party", { op: "leave" })}>파티 나가기</button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
          {keysOpen && (
            <>
              <div className="rpg-menu-back" onClick={() => { if (!waitKey) setKeysOpen(false); }} />
              <div className="rpg-stat rpg-win rpg-keyset" role="dialog" aria-label="키 설정">
                <div className="rpg-stat-head">
                  <b>키 설정</b>
                  <span>칸을 누르고 쓸 키를 누릅니다</span>
                </div>
                <p className="rpg-stat-rule">Backspace 는 칸 비우기 · Esc 는 그만두기. 다른 행동에 있던 키는 그 칸에서 빠집니다. 이 기기에 남습니다.</p>
                <div className="rpg-stat-list">
                  {KEY_ACTIONS.map((a, i) => (
                    <div key={a.id} className={`rpg-key-row ${i > 0 && KEY_ACTIONS[i - 1].group !== a.group ? "gap" : ""}`}>
                      <span className="rpg-key-name"><em>{a.group}</em><b>{a.name}</b></span>
                      {Array.from({ length: KEY_SLOTS }, (_, slot) => {
                        const wait = waitKey && waitKey.id === a.id && waitKey.slot === slot;
                        return (
                          <button key={slot} type="button" className={`rpg-key-slot ${wait ? "wait" : ""} ${binds[a.id][slot] ? "" : "empty"}`}
                            onClick={() => setWaitKey(wait ? null : { id: a.id, slot })}>
                            {wait ? "키를 누르세요" : keyLabel(binds[a.id][slot]) || "—"}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="rpg-stat-foot">
                  <button type="button" className="btn-ghost" onClick={() => { setWaitKey(null); setBinds(defaultKeys()); }}>기본값으로</button>
                  <button type="button" className="btn-main" onClick={() => { setWaitKey(null); setKeysOpen(false); }}>닫기</button>
                </div>
              </div>
            </>
          )}
          {me && me.duelInv >= 0 && me.dvs < 0 && nowMs - duelAt > 1500 && (
            <div className={`rpg-invite duel ${me.inv >= 0 ? "second" : ""}`} role="alertdialog" aria-label="결투 신청">
              <span><b>{names[me.duelInv] || "모험가"}</b>님이 결투를 신청했습니다
                <small>명예 {(me.party.find((h) => h.pi === me.duelInv) || {}).honor ?? 0} · 이기면 +{honorGain((me.party.find((h) => h.pi === me.duelInv) || {}).honor)}</small>
              </span>
              <button type="button" className="btn-main" onClick={() => { setDuelAt(nowMs + 1000); act("duel", { op: "accept" }); }}>수락</button>
              <button type="button" className="btn-ghost" onClick={() => { setDuelAt(nowMs + 1000); act("duel", { op: "decline" }); }}>거절</button>
            </div>
          )}
          {me && me.dvs >= 0 && (
            <div className="rpg-duelbar" role="status">
              <span className="rpg-duelbar-vs">결투 · <b>{names[me.dvs] || "모험가"}</b></span>
              <span className="rpg-duelbar-t">
                {me.dph === 1 ? `${Math.ceil(me.dtl)}초 뒤 시작` : me.dph === 2 ? `남은 시간 ${Math.ceil(me.dtl)}초` : "끝"}
              </span>
              {me.dph !== 3 && <button type="button" className="btn-ghost" onClick={() => act("duel", { op: "giveup" })}>기권</button>}
            </div>
          )}
          {me && me.dph === 1 && <div className="rpg-duel-count" key={Math.ceil(me.dtl)}>{Math.ceil(me.dtl)}</div>}
          {me && honorOpen && (() => {
            // 서버 순위에 지금 서버에 있는 사람의 최신 명예를 덮어쓴다(서버 저장은 10초마다)
            const live = me.party.filter((h) => h.honor > 0).map((h) => ({ name: names[h.pi] || "", honor: h.honor, lv: h.lv, on: 1 }));
            const map = new Map((rank.list || []).map((r) => [r.name, { ...r }]));
            live.forEach((r) => { const o = map.get(r.name); map.set(r.name, o ? { ...o, honor: Math.max(o.honor, r.honor), lv: r.lv, on: 1 } : r); });
            const rows = [...map.values()].sort((a, b) => b.honor - a.honor).slice(0, 20);
            const myName = names[mySeat] || "";
            const myRank = rows.findIndex((r) => r.name === myName);
            return (
              <>
                <div className="rpg-menu-back" onClick={() => setHonorOpen(false)} />
                <div className="rpg-stat rpg-win" role="dialog" aria-label="명예 순위">
                  <div className="rpg-stat-head">
                    <b>명예 순위</b>
                    <span>내 명예 <em>{me.honor}</em>{myRank >= 0 ? ` · ${myRank + 1}위` : ""}</span>
                  </div>
                  <p className="rpg-stat-rule">
                    결투에서 이기면 상대 명예의 {Math.round(DUEL.honorRate * 100)}% + {DUEL.honorBase} 만큼 오릅니다. 파티 창의 "결투"로 신청합니다. 위 20명까지 보입니다.
                  </p>
                  <div className="rpg-stat-list">
                    {rows.map((r, i) => (
                      <div key={r.name} className={`rpg-rank-row ${r.name === myName ? "on" : ""}`}>
                        <span className={`rpg-rank-no ${i < 3 ? "top" : ""}`}>{i + 1}</span>
                        <span className="rpg-stat-name"><b>{r.name}</b><em>Lv {r.lv}{r.on ? " · 지금 접속" : ""}</em></span>
                        <span className="rpg-rank-v">{Number(r.honor).toLocaleString("ko-KR")}</span>
                      </div>
                    ))}
                    {!rows.length && <p className="rpg-stat-rule">{rank.busy ? "불러오는 중…" : "아직 명예를 얻은 사람이 없습니다."}</p>}
                  </div>
                  <div className="rpg-stat-foot">
                    <button type="button" className="btn-ghost" disabled={rank.busy} onClick={loadRank}>{rank.busy ? "불러오는 중…" : "새로 고침"}</button>
                    {rank.err && <span className="rpg-stat-warn">서버 순위를 못 읽었습니다 — 지금 서버 사람만 보입니다.</span>}
                  </div>
                </div>
              </>
            );
          })()}
          {me && giftOpen && (
            <>
              <div className="rpg-menu-back" onClick={() => setGiftOpen(null)} />
              <div className="rpg-stat rpg-win rpg-gift" role="dialog" aria-label="업데이트 안내">
                <div className="rpg-stat-head">
                  <b>업데이트 안내</b>
                  <span>{UPDATES.find((u) => u.id === giftOpen.notes[0])?.date}</span>
                </div>
                {giftOpen.gift && <div className="rpg-gift-box">
                  <b>선물이 가방에 들어왔습니다</b>
                  <span>{[...Object.entries(GIFT.potions).map(([id, n]) => `${POTION_BY_ID[id].name} ${n}개`),
                    ...Object.entries(GIFT.mats).map(([id, n]) => `${MAT_BY_ID[id].name} ${n}개`)].join(" · ")}</span>
                </div>}
                <ul className="rpg-gift-list">
                  {UPDATES.filter((u) => giftOpen.notes.includes(u.id)).flatMap((u) => u.items).map((t) => <li key={t}>{t}</li>)}
                </ul>
                <div className="rpg-stat-foot">
                  <button type="button" className="btn-main" onClick={() => setGiftOpen(null)}>확인</button>
                  <button type="button" className="btn-ghost" onClick={() => { setGiftOpen(null); closeAll(); setBagOpen(true); }}>가방 열기</button>
                </div>
              </div>
            </>
          )}
          {me && reqOpen && REQ_BY_NPC[reqOpen] && (() => {
            const npc = REQ_BY_NPC[reqOpen];
            const list = REQUESTS[npc.id];
            const cur = me.self.reqs[npc.id];
            const curQ = cur && list[cur.i];
            const open = list.map((q, i) => ({ q, i })).filter(({ q }) => me.lv >= q.lv).slice(-REQ_SHOW).reverse();
            const next = list.find((q) => me.lv < q.lv);
            const why = curQ ? whyReqDone(me.self, npc.id) : [];
            return (
              <>
                <div className="rpg-menu-back" onClick={() => setReqOpen(null)} />
                <div className="rpg-stat rpg-win" role="dialog" aria-label={npc.name}>
                  <div className="rpg-stat-head">
                    <b>{npc.name}</b>
                    <span>끝낸 의뢰 <em>{me.rec.req || 0}</em></span>
                  </div>
                  <p className="rpg-stat-rule">{npc.line} 의뢰는 한 사람에게 하나씩 맡깁니다. 끝낸 의뢰는 다시 받을 수 있습니다.</p>
                  <div className="rpg-stat-list">
                    {curQ && (
                      <div className="rpg-win-row on">
                        <span className="rpg-stat-name">
                          <b>맡은 의뢰 · {reqTitle(curQ)}</b>
                          <em>{reqProg(curQ, cur, me.self)} · 보상 {reqPay(curQ, me.lv)}{why.length ? ` · ${why.join(" · ")}` : ""}</em>
                        </span>
                        <span className="rpg-win-acts">
                          <button type="button" className="rpg-win-btn" disabled={why.length > 0}
                            onClick={() => act("req", { op: "done", npc: npc.id })}>완료</button>
                          <button type="button" className="rpg-win-btn ghost" onClick={() => act("req", { op: "drop", npc: npc.id })}>포기</button>
                        </span>
                      </div>
                    )}
                    {open.map(({ q, i }) => (
                      <div key={i} className={`rpg-win-row ${cur ? "locked" : ""}`}>
                        <span className="rpg-stat-name"><b>{reqTitle(q)}</b><em>{q.lv}레벨부터 · 보상 {reqPay(q, me.lv)}</em></span>
                        {cur && cur.i === i
                          ? <span className="rpg-win-tag">맡음</span>
                          : <button type="button" className="rpg-win-btn" disabled={!!cur} onClick={() => act("req", { op: "take", npc: npc.id, i })}>받기</button>}
                      </div>
                    ))}
                    {!open.length && <p className="rpg-stat-rule">{list[0].lv}레벨부터 의뢰를 받을 수 있습니다.</p>}
                  </div>
                  {next && <p className="rpg-stat-rule">다음 의뢰는 {next.lv}레벨에 열립니다.</p>}
                </div>
              </>
            );
          })()}
          {me && me.inv >= 0 && nowMs - answeredAt > 1500 && (
            <div className="rpg-invite" role="alertdialog" aria-label="파티 초대">
              <span><b>{names[me.inv] || "모험가"}</b>님이 파티에 초대했습니다</span>
              <button type="button" className="btn-main" onClick={() => { setAnsweredAt(nowMs + 1000); act("party", { op: "accept" }); }}>수락</button>
              <button type="button" className="btn-ghost" onClick={() => { setAnsweredAt(nowMs + 1000); act("party", { op: "decline" }); }}>거절</button>
            </div>
          )}
          {me && shopOpen && (
            <ShopPanel shop={shopOpen} h={me.self} send={sendShop} note={note} onClose={() => setShopOpen(null)} />
          )}
          {me && bagOpen && (
            <BagPanel h={me.self} send={sendShop} note={note} tab0={bagTab} onClose={() => { setBagOpen(false); setBagTab("stat"); }} />
          )}
          {me && !menu && !statOpen && !shopOpen && !bagOpen && !titleOpen && !partyOpen && !keysOpen && !reqOpen
            && (me.quest.on || inField || Object.keys(me.self.reqs).length > 0) && (
            <div className="rpg-quest">
              {me.quest.on
                ? <span><b>{QUEST.name}</b> 토끼 {me.quest.n}/{QUEST.need}</span>
                : inField ? <span>사냥꾼에게 퀘스트를 받을 수 있습니다</span> : null}
              {Object.entries(me.self.reqs).map(([id, r]) => {
                const q = REQUESTS[id] && REQUESTS[id][r.i];
                return q ? <span key={id}><b>의뢰</b>{reqTitle(q)} · {reqProg(q, r, me.self)}</span> : null;
              })}
            </div>
          )}

          <div className="hud hud-right">
            <button className="sbtn sbtn-img" onClick={toggleMute} title="소리" style={{ opacity: mute ? 0.65 : 1 }}>
              <img src={mute ? "/assets/ui/sound-off.webp" : "/assets/ui/sound-on.webp"} alt="" />
            </button>
            <button className="sbtn" onClick={onLeave} title="RPG에서 나가기"><HomeIcon /></button>
          </div>

          {toast && <div className="rpg-toast" key={toast.at}>{toast.name}</div>}

          {me && nearShopNpc && !shopOpen && !bagOpen && (
            <div className="rpg-talk">
              <span className="rpg-talk-who">{nearShopNpc.keeper}</span>
              <span className="rpg-talk-line">{nearShopNpc.line}</span>
              <button className="btn-ghost rpg-talk-btn" onClick={() => act("talk")}>
                {nearShopNpc.name} 열기{!touch && keyOf(binds, "talk") && <kbd>{keyOf(binds, "talk")}</kbd>}
              </button>
            </div>
          )}
          {me && me.near && me.near.board && !honorOpen && (
            <div className="rpg-talk">
              <span className="rpg-talk-who">명예의 전당</span>
              <span className="rpg-talk-line">결투에서 이겨 얻은 명예 순위를 봅니다. 내 명예 {me.honor}.</span>
              <button className="btn-ghost rpg-talk-btn" onClick={() => act("talk")}>
                순위 보기{!touch && keyOf(binds, "talk") && <kbd>{keyOf(binds, "talk")}</kbd>}
              </button>
            </div>
          )}
          {me && me.near && me.near.req && !reqOpen && REQ_BY_NPC[me.near.req] && (() => {
            const npc = REQ_BY_NPC[me.near.req];
            const cur = me.self.reqs[npc.id];
            const done = cur && !whyReqDone(me.self, npc.id).length;
            return (
              <div className="rpg-talk">
                <span className="rpg-talk-who">{npc.name}</span>
                <span className="rpg-talk-line">{done ? "벌써 끝냈군요. 보상을 받아 가세요." : npc.line}</span>
                <button className="btn-ghost rpg-talk-btn" onClick={() => act("talk")}>
                  의뢰 보기{!touch && keyOf(binds, "talk") && <kbd>{keyOf(binds, "talk")}</kbd>}
                </button>
              </div>
            );
          })()}
          {me && !nearShopNpc && !(me.near && (me.near.board || me.near.req)) && (talk || me.near) && (
            <div className="rpg-talk">
              <span className="rpg-talk-who">사냥꾼</span>
              <span className="rpg-talk-line">
                {talk || (me.quest.on ? `토끼 ${me.quest.n}/${QUEST.need} — 계속 사냥하게.` : "자네, 사냥을 좀 도와주겠나?")}
              </span>
              {me.near && (
                <button className="btn-ghost rpg-talk-btn" onClick={() => act("talk")}>
                  {me.quest.on ? "남은 수 묻기" : "퀘스트 받기"}{!touch && keyOf(binds, "talk") && <kbd>{keyOf(binds, "talk")}</kbd>}
                </button>
              )}
            </div>
          )}

          {me && (
            <div className={`rpg-chat ${chatOpen ? "open" : ""}`}>
              <div className="rpg-chat-log" aria-live="polite">
                {chatLog.slice(-CHAT.show).map((l) => (
                  <p key={l.id} className={`rpg-chat-line ${l.kind} ${!chatOpen && nowMs - l.at > CHAT.fade * 1000 ? "old" : ""}`}>
                    {l.kind !== "sys" && <b>{l.kind === "party" ? "파티 · " : ""}{l.name}</b>}
                    <span>{l.text}</span>
                  </p>
                ))}
              </div>
              {chatOpen ? (
                <form className="rpg-chat-form" onSubmit={(e) => { e.preventDefault(); sendChat(); }}>
                  <button type="button" className={`rpg-chat-scope ${chatScope}`}
                    onClick={() => { setChatScope((v) => (v === "all" ? "party" : "all")); chatInput.current?.focus(); }}>
                    {chatScope === "all" ? "전체" : "파티"}
                  </button>
                  <input ref={chatInput} value={chatText} maxLength={CHAT.max} placeholder="할 말을 적고 Enter" aria-label="채팅"
                    onChange={(e) => { setChatText(e.target.value); setChatErr(""); }}
                    onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setChatOpen(false); setChatErr(""); } }} />
                  <button type="submit" className="rpg-chat-send">보내기</button>
                </form>
              ) : (
                <button type="button" className="rpg-chat-open" onClick={openChat}>
                  채팅{!touch && keyOf(binds, "chat") && <kbd>{keyOf(binds, "chat")}</kbd>}
                </button>
              )}
              {chatErr && <p className="rpg-chat-err">{chatErr}</p>}
            </div>
          )}

          {me && !shopOpen && !bagOpen && (
            <div className="rpg-skillbar">
              <button type="button" className={`rpg-skill ${me.dashCd > 0 ? "cool" : ""}`}
                onPointerDown={(e) => { e.preventDefault(); act("dash"); }}>
                {!touch && keyOf(binds, "dash") && <kbd>{keyOf(binds, "dash")}</kbd>}
                <span>대쉬<small>회피 {DASH.inv}초</small></span>
                {me.dashCd > 0 && <em>{Math.ceil(me.dashCd)}</em>}
                {me.dashCd > 0 && <i style={{ width: `${(me.dashCd / DASH.cd) * 100}%` }} />}
              </button>
              {me.skills.map((s) => (
                <button key={s.id} type="button" className={`rpg-skill ${s.cd > 0 ? "cool" : ""}`}
                  onPointerDown={(e) => { e.preventDefault(); act("use", s.id); }}>
                  {!touch && keyOf(binds, `use${s.key}`) && <kbd>{keyOf(binds, `use${s.key}`)}</kbd>}
                  <span>{s.name}<small>Lv {s.lv}</small></span>
                  {s.cd > 0 && <em>{Math.ceil(s.cd)}</em>}
                  {s.cd > 0 && <i style={{ width: `${(s.cd / s.max) * 100}%` }} />}
                </button>
              ))}
            </div>
          )}
          {me && !shopOpen && !bagOpen && (
            <div className="rpg-potbar" aria-label="물약 칸">
                {me.pots.map((p, i) => (p ? (
                  <button key={`pot${i}`} type="button" className={`rpg-skill pot ${p.n ? "" : "cool"}`}
                    onPointerDown={(e) => { e.preventDefault(); if (p.n) act("shop", { op: "puse", id: p.id }); }}>
                    {!touch && keyOf(binds, `pot${i + 1}`) && <kbd>{keyOf(binds, `pot${i + 1}`)}</kbd>}
                    <span>{p.name.replace("물약 ", "")}<small>물약 칸 {i + 1}</small></span>
                    <em>{p.n}</em>
                  </button>
                ) : (
                  <button key={`pot${i}`} type="button" className="rpg-skill pot empty"
                    onPointerDown={(e) => { e.preventDefault(); closeAll(); setBagTab("potion"); setBagOpen(true); }}>
                    {!touch && keyOf(binds, `pot${i + 1}`) && <kbd>{keyOf(binds, `pot${i + 1}`)}</kbd>}
                    <span>빈 칸<small>가방에서 넣기</small></span>
                  </button>
                )))}
            </div>
          )}
          {me && me.down > 0 && (
            <div className="rpg-down">쓰러졌습니다 — {Math.ceil(me.down)}초 뒤 광장에서 일어납니다</div>
          )}

          {oldHost && (
            <div className="drop-note">
              판정을 맡은 사람의 게임이 옛 버전이라 새 기능(멧돼지 사냥터 · 무기 구매 등)이 안 될 수 있습니다. 그 사람이 새로 고침하면 해결됩니다.
            </div>
          )}
          {kicked && (
            <div className="drop-note">
              다른 기기에서 이 캐릭터로 들어왔습니다. 이 기기의 진행은 이제 서버에 저장되지 않습니다.
              <button className="btn-ghost" onClick={onLeave}>처음 화면으로</button>
            </div>
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
            <span key={h.pi} className={`rpg-mate ${h.pi === mySeat ? "mine" : ""} ${me.pty && h.pty === me.pty && h.pi !== mySeat ? "mate" : ""}`}
              style={{ "--pcl": elemOf(seats[h.pi]?.hero).light }}>
              <b>{names[h.pi] || "모험가"}{me.pty > 0 && h.pty === me.pty && <small> 파티</small>}</b>
              <em>{who(h.pi)} · Lv {h.lv} · {MAPS[h.map].name}</em>
              <span className="rpg-mate-hp"><span style={{ width: `${Math.min(100, (h.hp / (h.max || 1)) * 100)}%` }} /></span>
            </span>
          ))}
        </div>

        <p className="keyhint rpg-keys">
          <kbd>{code}</kbd> · 접속 {seats.filter(Boolean).length}/{RPG_CREW_MAX}명 ·{" "}
          {touch
            ? <>화살표로 이동 · <kbd>공격</kbd> 버튼 평타 · <kbd>스킬</kbd> 버튼 · 사냥꾼 · 상점 · 의뢰 NPC 곁에서 대화 · 대쉬 · 산 스킬은 왼쪽 아래 칸을 누름 · 채팅 버튼 · 레벨 칸의 스탯 · 가방 · 칭호 · 파티 버튼 · ☰ 에서 자동 평타 켜고 끄기</>
            : <>이동 <kbd>{["up", "left", "down", "right"].map((a) => keyOf(binds, a)).join(" ")}</kbd> · 평타 <kbd>{keyOf(binds, "fire")}</kbd> · 스킬 <kbd>{keyOf(binds, "skill")}</kbd> · 사냥꾼 · 상점 · 의뢰 NPC 곁에서 <kbd>{keyOf(binds, "talk")}</kbd> · 대쉬 <kbd>{keyOf(binds, "dash")}</kbd> · 채팅 <kbd>{keyOf(binds, "chat")}</kbd> · 스탯 <kbd>{keyOf(binds, "stat")}</kbd> · 가방 <kbd>{keyOf(binds, "bag")}</kbd> · 칭호 <kbd>{keyOf(binds, "title")}</kbd> · 파티 <kbd>{keyOf(binds, "party")}</kbd> · ☰ 에서 자동 평타 · 키 설정</>}
        </p>
        <details className="footnote">
          <summary>RPG 모드 방법</summary>
          광장 오른쪽의 사냥문으로 들어가면 토끼 사냥터입니다. 토끼 사냥터 오른쪽 끝의 문으로 가면 늑대 사냥터(10~20레벨), 늑대 사냥터 오른쪽 끝의 문으로 가면 멧돼지 사냥터(20~50레벨), 멧돼지 사냥터 오른쪽 끝의 문으로 가면 고릴라 사냥터(50~100레벨)입니다. 그 뒤로 고블린(100~130레벨) · 오크(130~160레벨) · 오우거(160~200레벨) 사냥터가 이어집니다. 각 사냥터 왼쪽 끝의 문으로 돌아옵니다.
          자동 평타가 켜져 있으면 사거리 안의 몹을 저절로 칩니다. 레벨 칸의 ☰ 메뉴에서 끌 수 있고,
          끄면 스페이스(휴대폰은 공격 버튼)를 누르고 있는 동안 칩니다. 켜져 있어도 스페이스로 칠 수 있습니다.
          몹 머리 위에 레벨이 보이고, 레벨이 높을수록 크고 단단합니다. 입구에서 멀어질수록 높은 레벨이 나옵니다.
          토끼는 1~5레벨로 {SPAWNS[0].n}마리, 대왕 토끼(보스 · 10레벨)는 {SPAWNS[1].n}마리까지 나옵니다.
          늑대는 10~20레벨로 {SPAWNS[2].n}마리, 우두머리 늑대(보스 · 25레벨)는 {SPAWNS[3].n}마리까지 나옵니다.
          멧돼지는 20~50레벨로 {SPAWNS[4].n}마리, 멧돼지 왕(보스 · 55레벨)은 {SPAWNS[5].n}마리까지 나옵니다. 멧돼지는 몸을 낮췄다가 일직선으로 돌진하니 옆으로 피하세요.
          고릴라는 50~100레벨로 {SPAWNS[6].n}마리, 고릴라 왕(보스 · 110레벨)은 {SPAWNS[7].n}마리까지 나옵니다. 지금까지 몹 가운데 가장 셉니다. 일어서서 가슴을 두드리면 곧 둘레를 내려찍으니 그때 물러나거나 대쉬로 피하세요.
          고블린 · 오크 · 오우거는 더 멀리서 알아채고 더 오래 쫓아오며, 하나가 덤비면 둘레의 같은 무리도 함께 덤빕니다. 오크와 오우거는 무기를 치켜들면 곧 둘레를 내려칩니다.
          한 마리가 잡히면 한 마리가 새로 나옵니다.
          보스를 잡으면 그 보스를 친 사람 모두가 재료를 받습니다. 대왕 토끼 · 우두머리 늑대 · 멧돼지 왕 · 고릴라 왕은 재료 {DROPS.rabbit.n}개를, 고블린 대장 · 오크 족장 · 오우거 왕은 강화석 {DROPS.goblin.n}개를 떨구고 {Math.round(DROPS.goblin.bonus * 100)}% 확률로 하나 더 떨굽니다. 일반 몹은 떨구지 않습니다.
          광장 왼쪽 아래의 무기 강화소에서 강화석으로 무기를 +1부터 +30까지 올립니다. 파랑 강화석은 +10까지, 경화된 눈알은 +20까지, 심장결정은 +30까지 씁니다. 높은 단계일수록 성공 확률이 매우 낮고, +6부터는 실패하면 일정 확률로 한 단계 떨어집니다. 강화소에서 재료를 팔 수도 있습니다.
          광장의 경비대장 · 수집가 · 연금술사에게 의뢰를 받습니다. 몹 사냥 · 재료 모으기 의뢰를 끝내면 코인 · 경험치 · 강화석을 줍니다.
          스킬 상점에서 산 액티브 스킬은 숫자키 1~4(휴대폰은 왼쪽 아래 칸)로 씁니다.
          대쉬({keyOf(binds, "dash")})는 누른 방향으로 짧게 달려 나가고, 그동안 {DASH.inv}초는 맞지 않습니다. {DASH.cd}초마다 쓸 수 있습니다.
          레벨이 높은 몹일수록 경험치와 코인을 더 줍니다. 1레벨 토끼는 경험치 {xpOf(2)} · {coinOf(1)}코인, 10레벨 늑대는 경험치 {xpOf(20)} · {coinOf(10)}코인입니다.
          {MOB_REGEN.calm}초 넘게 맞지 않은 몹은 체력이 조금씩 차오릅니다.
          토끼는 맞으면 달아나고 가끔 들이받지만, 늑대와 보스는 가까이 가거나 때리면 쫓아옵니다.
          레벨을 올리려면 처음엔 경험치 30, 그다음부터는 30씩 더 필요합니다.
          레벨이 오르면 체력이 가득 차고 스탯 포인트 {STAT_PER_LV}를 받습니다(처음 만들 때도 {STAT_PER_LV}포인트). 최고 레벨은 {LV_MAX}입니다.
          레벨 칸의 스탯 버튼(키보드는 C)에서 물리력 · 마법력 · 체력 · 치명타 확률 · 치명타 피해에 나눠 찍습니다.
          스탯마다 {STAT_MAX}까지 찍을 수 있고, 적용하면 되돌릴 수 없습니다.
          물리력은 전사 · 궁수, 마법력은 마법사의 공격력을 올리고, 화상 · 독 피해는 직업과 상관없이 마법력을 따릅니다.
          사냥꾼에게 퀘스트를 받아 토끼 {QUEST.need}마리를 잡으면 경험치 {QUEST.xp}과 {QUEST.coin}코인을 더 받습니다. 다시 받을 수 있습니다.
          {RPG.calm}초 넘게 맞지 않으면 체력이 차오르고, 쓰러지면 {RPG.down}초 뒤 광장에서 일어납니다.
          전사는 둘레를 한 번에 베고, 마법사는 원소 구슬로 맞은 자리 둘레까지 치고, 궁수는 가장 멀리서 한 마리를 노립니다.
          고른 원소는 평타에 약하게, 큰 기술에 세게 실립니다.
          이름 · 직업 · 원소 · 성별은 한 번 정하면 바꿀 수 없습니다. 레벨 · 경험치 · 코인 · 퀘스트 · 가방과 함께 이 기기와 서버에 남습니다. 다른 기기에서는 캐릭터 만들기 화면의 "코드로 이어 하기"에 이름과 숫자 5자리 코드를 넣으면 이어집니다.
          광장에는 무기상점 · 스킬 상점 · 물약 상점 · 도박장 · 무기 강화소가 있습니다. 가까이 가서 E(휴대폰은 말풍선의 버튼)로 엽니다.
          산 무기 · 물약 · 배운 스킬은 가방(I)에서 보고, 무기 장착과 물약 마시기는 어디서나 할 수 있습니다.
          방 코드 없이 모두 같은 서버에 들어갑니다. 서버마다 {RPG_CREW_MAX}명까지이고, 가득 차면 다음 서버로 넘어갑니다.
          판정을 맡은 사람이 나가도 서버는 닫히지 않습니다. 1초쯤 뒤 남은 사람이 이어받고 모두 있던 자리에서 그대로 이어 합니다.
          Enter(휴대폰은 채팅 버튼)로 채팅합니다. 채팅 칸의 "전체 / 파티" 단추로 파티원에게만 말할 수도 있습니다. {CHAT.gap}초에 한 번 보낼 수 있습니다.
          파티 창(P)에서 같은 서버 사람을 초대합니다. {PARTY.max}명까지이고, 같은 맵의 파티원이 몹을 잡으면 그 경험치의 {Math.round(PARTY.share * 100)}%를 함께 받습니다.
          칭호는 레벨 · 사냥 수 · 보스 · 퀘스트 조건을 채우면 얻습니다. 칭호 창(T)에서 하나를 골라 이름 아래에 답니다.
          ☰ 메뉴의 키 설정에서 키를 바꿀 수 있습니다(PC).
          파티 창(P)의 "결투"로 다른 사람에게 1대1 결투를 신청합니다. 상대가 수락하면 둘만 결투장으로 옮겨 가 {DUEL.ready}초를 센 뒤 싸웁니다.
          결투장에서는 자동 평타가 꺼지고 몹을 칠 때의 {Math.round(DUEL.dmgMul * 100)}% 피해가 들어갑니다. 한 사람이 쓰러지면 끝나고 {DUEL.time}초가 지나면 무승부입니다. 끝나면 둘 다 원래 자리로 돌아가고 체력이 찹니다.
          이기면 상대 명예의 {Math.round(DUEL.honorRate * 100)}% + {DUEL.honorBase} 만큼 명예가 오릅니다. 지는 쪽 명예는 그대로입니다. 광장 위쪽의 명예 순위판(E)에서 순위를 봅니다.
        </details>
      </div>
    </div>
  );
}
