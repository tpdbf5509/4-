/* ── 격자 연습장(?sandbox) — 만든 캐릭터를 게임에 넣기 전에 격자 바닥에서 미리 써 본다 ─────────────
   직업 체험(JobTrial.jsx)처럼 이 기기에서만 도는 작은 세계를 만든다. 규칙은 게임과 같은 rpg.js, 그림은 drawRpg.
   서버 · 장부 · 이 기기의 캐릭터 기록과 이어지지 않는다(아무것도 저장하지 않는다). 수치는 sandboxData.js.
   훈련장 기능(무적 · 쿨타임 끄기 · 스택 가득 · 초당 피해)은 g.test 로 이 맵에서도 듣는다(rpg.js trainTick · rpgTrain). */
import { useEffect, useMemo, useRef, useState } from "react";
import { W, H } from "./game/world.js";
import {
  RPG, RPG_CREW_MAX, JOBS, ELEMS, JOB_BY_ID, ELEM_BY_ID, LV_TOP, STAT_IDS, makeWorld, rpgSyncSeats, rpgJoin, rpgStep, rpgTrain, trainView,
  hasElem, elemFor, statEarned, maxStats, statCap, refreshHp, heldSpecial, dist, sandboxDummies,
} from "./game/rpg.js";
import { rpgInput } from "./game/rpgInput.js";
import { drawRpg } from "./game/rpgArt.js";
import { GIFT, RESET } from "./game/itemData.js";
import { SPECIALS, SKILLS, JOB_FAMILY, WEAPON_FAMILY } from "./game/shopData.js";
import { ADV_CLASSES, ADV_MASTERY } from "./game/advData.js";
import { BLOOD, BLOOD_NAME } from "./game/bloodJobData.js";
import { unlockBlood, bloodView, stableCap } from "./game/bloodJob.js";
import { bloodHud } from "./BloodHud.jsx";
import { pointerSkillAim, pointerSkillPt, aimedSkillInput } from "./game/skillAim.js";
import { KEY_ACTIONS, BLOOD_ACTS, loadKeys, keyMap, keyOf, mouseCode } from "./game/keys.js";
import { SANDBOX, SANDBOX_LAYOUTS } from "./game/sandboxData.js";
import { useTouch } from "./ui/touch.js";
import "./ui/style.css";

const STEP_MAX = 0.05;   // 한 번에 돌리는 판정 시간(초) — RpgView 와 같다
const HUD_MS = 160;      // 숫자 칸을 다시 그리는 간격(ms)
const MOVE = { up: "up", down: "down", left: "left", right: "right" };
const HOLD_WSK = new Set(["azure_dual", "blood_gun"]);   // 누르고 있는 동안 차징하는 무기 스킬(RpgView 와 같다)
const BLOOD_OFF = /^(use\d|adv|advUlt|healMode)$/;      // BLOOD-001 은 일반 스킬 칸 · 전직 스킬을 쓰지 않는다
const TOOLS = [
  { id: "god", name: "무적" },
  { id: "nocd", name: "쿨타임 끄기" },
  { id: "stack", name: "스택 가득" },
];
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
const cellOf = (h) => [(h.x - SANDBOX.spawn[0]) / SANDBOX.cell, (h.y - SANDBOX.spawn[1]) / (SANDBOX.cell * RPG.squash)];

// 레벨만큼 받은 스탯 포인트를 나눈다 — 공격 45% · 체력 25% · 치명타 확률 15%(상한 150) · 나머지 치명타 피해
function spreadStats(job, lv, cap) {
  let left = statEarned(lv);
  const st = Object.fromEntries(STAT_IDS.map((k) => [k, 0]));
  const put = (k, n) => { const v = Math.max(0, Math.min(cap - st[k], Math.floor(n), left)); st[k] += v; left -= v; };
  const total = left;
  put(job === "mage" ? "int" : "str", total * 0.45);
  put("hp", total * 0.25);
  put("crit", Math.min(150, total * 0.15));
  put("cdmg", left);
  [job === "mage" ? "int" : "str", "hp", "crit"].forEach((k) => put(k, left));   // 상한에 걸려 남은 몫
  return st;
}

// 직업에 맞는 무기 — 같은 묶음(검 · 활 · 지팡이)만. BLOOD-001 은 크림슨 레퀴엠만
const weaponsFor = (job, blood) => SPECIALS.filter((w) => (blood ? w.id === "blood_gun" : WEAPON_FAMILY[w.t] === JOB_FAMILY[job]));
const jobSkills = (job) => SKILLS.filter((s) => s.use && s.job === job);
const genSkills = () => SKILLS.filter((s) => s.use && !s.job);

const DEFAULT = {
  job: "warrior", gender: "m", elem: ELEMS[0].id, lv: SANDBOX.lv, stats: "spread", adv: "", mastery: 1,
  bloodLv: SANDBOX.bloodLv, train: BLOOD.train.max, weapon: "", ks: { job: "", g: ["", ""] }, layout: "line",
};

// 연습장 세계 — 자리 0 에 시험 캐릭터 하나만 세우고 격자 맵으로 보낸다
function sandboxWorld(c) {
  const g = makeWorld();
  g.mySeat = 0;
  g.out = null;                                   // 보낼 곳이 없다
  g.test = 1;                                     // 훈련장 기능을 이 맵에서도 · 1200레벨까지
  g.high = true;
  g.wb.lastHour = Infinity;                       // 월드보스가 나오지 않는다(출현 알림도 없다)
  const look = { name: "연습", job: c.job, elem: elemFor(c.job, c.elem), gender: c.gender };
  const seats = Array.from({ length: RPG_CREW_MAX }, (_, i) => (i === 0 ? { id: "sandbox", name: look.name, hero: look } : null));
  rpgSyncSeats(g, seats);
  const blood = c.adv === "blood";
  const s = {};
  SKILLS.forEach((k) => { if (!k.job || k.job === c.job) s[k.id] = k.gold.length; });   // 이 직업이 배울 수 있는 스킬은 모두 최고 레벨
  const w = c.weapon && weaponsFor(c.job, blood).find((q) => q.id === c.weapon);
  const lv = Math.max(1, Math.min(LV_TOP, Math.floor(c.lv) || 1));
  rpgJoin(g, 0, {
    name: look.name, ts: 1, lv, gift: GIFT.id, rs: RESET.id, auto: 1,
    stats: spreadStats(c.job, lv, statCap(g)),
    bag: { oc: 1, n: 2, w: w ? [{ u: 1, sp: w.id, p: 0 }] : [], e: w ? 1 : 0, s, ks: c.ks },
  }, "sandbox");
  const h = g.heroes[0];
  if (c.stats === "max") { h.st = maxStats(statCap(g)); refreshHp(h, true); }
  const adv = ADV_CLASSES.find((q) => q.id === c.adv && q.job === c.job);
  if (adv) {                                      // 1차 전직 — 레벨 조건 없이 바로(숙련도 단계도 고른 대로)
    h.advClass = adv.id; h.advQ = null; h.advM = ADV_MASTERY.pts[Math.max(0, Math.min(ADV_MASTERY.pts.length - 1, c.mastery - 1))] || 0; h.as = null;
    refreshHp(h, true);
  }
  if (blood) {                                    // BLOOD-001 — 직업 레벨 · 연마를 고른 대로, 혈량은 안정 한계까지
    unlockBlood(h);
    const blv = Math.max(1, Math.min(BLOOD.maxLv, Math.floor(c.bloodLv) || 1)), tr = Math.max(0, Math.min(BLOOD.train.max, Math.floor(c.train) || 0));
    Object.assign(h.bag.bd, { lv: blv, xp: 0, tr: [[tr, 0], [tr, 0], [tr, 0]], b: stableCap(blv) });
    refreshHp(h, true);
  }
  h.map = SANDBOX.id;
  [h.x, h.y] = SANDBOX.spawn;
  h.gateCd = 1;
  rpgTrain(g, 0, { op: "god" });                  // 처음엔 무적만 켠다
  placeDummies(g, c.layout);
  return g;
}

// 허수아비 — 캐릭터 지금 자리에서 고른 배치대로(가로 칸 · 세로 칸, 세로는 화면에서 눌려 보인다)
function placeDummies(g, layout) {
  const h = g.heroes[0], L = SANDBOX_LAYOUTS.find((q) => q.id === layout) || SANDBOX_LAYOUTS[0];
  const dir = h.dir < 0 ? -1 : 1;
  sandboxDummies(g, SANDBOX.id, L.spots.map(([cx, cy]) => [h.x + dir * cx * SANDBOX.cell, h.y + cy * SANDBOX.cell * RPG.squash]));
}

export default function Sandbox() {
  const touch = useTouch();
  const [cfg, setCfg] = useState(DEFAULT);
  const [lvText, setLvText] = useState(String(DEFAULT.lv));
  const [round, setRound] = useState(0);
  const [hud, setHud] = useState(null);
  const cvsRef = useRef(null);
  const G = useRef(null);
  const pointer = useRef(null);                   // 판 위 포인터(판 좌표) — 스킬이 이쪽으로 나간다
  const chargeRef = useRef(false);
  const lastWaim = useRef(null);
  const [binds] = useState(loadKeys);
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));

  const blood = cfg.adv === "blood";
  const magic = hasElem(cfg.job);
  const advs = ADV_CLASSES.filter((q) => q.job === cfg.job);
  const weapons = useMemo(() => weaponsFor(cfg.job, blood), [cfg.job, blood]);

  // 직업이 바뀌면 그 직업에 없는 전직 · 무기 · 직업 스킬을 비운다
  const pickJob = (job) => setCfg((c) => ({
    ...c, job,
    adv: c.adv === "blood" || ADV_CLASSES.some((q) => q.id === c.adv && q.job === job) ? c.adv : "",
    weapon: weaponsFor(job, c.adv === "blood").some((w) => w.id === c.weapon) ? c.weapon : "",
    ks: { ...c.ks, job: "" },
  }));
  const pickAdv = (adv) => setCfg((c) => ({ ...c, adv, weapon: weaponsFor(c.job, adv === "blood").some((w) => w.id === c.weapon) ? c.weapon : adv === "blood" ? "blood_gun" : "" }));
  const commitLv = () => {
    const v = Math.max(1, Math.min(LV_TOP, Math.floor(Number(lvText)) || 1));
    setLvText(String(v));
    if (v !== cfg.lv) set({ lv: v });
  };

  // 설정이 바뀌면 세계를 새로 만든다(레이아웃만 바뀌면 허수아비만 다시 세운다)
  const { layout, ...build } = cfg;
  const buildKey = JSON.stringify(build);
  useEffect(() => {
    G.current = sandboxWorld({ ...JSON.parse(buildKey), layout });
    if (import.meta.env.DEV) window.__SB = G.current;   // 개발 중 상태를 들여다보려고(화면 확인 스크립트)
  }, [buildKey, round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (G.current) placeDummies(G.current, layout); }, [layout]);

  // 한 번의 조작 — 이 기기의 세계에 바로 넣는다. 스킬은 포인터 쪽으로(RpgView act 와 같은 규칙)
  const act = (kind, dir) => {
    const g = G.current, h = g && g.heroes[0];
    if (!h) return;
    const aim = aimedSkillInput(kind, dir) ? pointerSkillAim(h, g.cam, pointer.current, RPG.squash) : null;
    const pt = (kind === "adv" || (kind === "blood" && dir?.s === "wave")) && aim ? pointerSkillPt(h, g.cam, pointer.current) : null;
    rpgInput(g, { cls: 0, kind, dir, aim, pt });
  };
  const actRef = useRef(act);
  actRef.current = act;
  const tool = (op) => { const g = G.current; if (g) rpgTrain(g, 0, { op }); };

  // 키보드 · 마우스 버튼 — 게임과 같은 키 설정(RpgView pressAct · releaseAct 에서 창 여는 것만 뺐다)
  useEffect(() => {
    const held = [];
    const isBlood = () => !!bloodView(G.current?.heroes[0]);
    const kmap = () => keyMap(binds, isBlood() ? BLOOD_ACTS : []);
    const A = (k, d) => actRef.current(k, d);
    const press = (a) => {
      if (isBlood() && a === "skill") a = "bField";
      if (isBlood() && BLOOD_OFF.test(a)) return;
      const h = G.current?.heroes[0];
      if (a === "fire") A("fire", true);
      else if (a === "skill") A("skill");
      else if (a === "dash") A("dash");
      else if (a === "wskill") { const sp = heldSpecial(h || {}); chargeRef.current = sp === "blood_gun"; lastWaim.current = null; A(HOLD_WSK.has(sp) ? "wcharge" : "wskill", true); }
      else if (a === "bShot") { chargeRef.current = true; A("blood", { op: "press", s: "shot" }); }
      else if (a === "bConv") A("blood", { op: "convert" });
      else if (a === "bSmash") { chargeRef.current = true; A("blood", { op: "press", s: "smash" }); }
      else if (a === "bSword") A("blood", { op: "sword" });
      else if (a.startsWith("b") && BLOOD_ACTS.includes(a)) A("blood", { op: "press", s: { bVeil: "veil", bWave: "wave", bHook: "hook", bField: "field", bPierce: "pierce", bSea: "sea", bLegion: "legion", bOrigin: "origin", bAwake: "awake" }[a] });
      else if (a === "adv") A("adv", { op: "use" });
      else if (a === "advUlt") A("adv", { op: "ult" });
      else if (a === "healMode") A("adv", { op: "mode" });
      else if (a.startsWith("use")) {
        const ks = h?.bag?.ks;
        const id = ks && (a === "use5" ? ks.job : ks.g[Number(a.slice(3)) - 1]);
        if (id) A("use", id);
      }
    };
    const release = (a) => {
      if (!a) return;
      if (a === "skill" && isBlood()) a = "bField";
      if (a === "fire") A("fire", false);
      if (a === "wskill") { chargeRef.current = false; A("wcharge", false); }
      if (a === "bShot") { chargeRef.current = false; A("blood", { op: "release", s: "shot" }); }
      if (a === "bSmash") { chargeRef.current = false; A("blood", { op: "release", s: "smash" }); }
      if (a === "bField") A("blood", { op: "release", s: "field" });
    };
    const typing = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    const onKey = (e) => {
      if (typing(e.target)) return;
      const a = kmap()[e.code];
      if (!a) return;
      e.preventDefault();
      if (MOVE[a]) {
        if (e.repeat || held.includes(a)) return;
        held.push(a);
        return A("hold", held.slice());
      }
      if (!e.repeat) press(a);
    };
    const onUp = (e) => {
      const a = kmap()[e.code];
      if (MOVE[a]) { const i = held.indexOf(a); if (i >= 0) held.splice(i, 1); return A("hold", held.slice()); }
      release(a);
    };
    // 판 위 마우스 버튼 — 키 설정에 넣은 버튼(좌클릭 평타 등). 오른쪽 버튼은 걷기 몫이라 쓰지 않는다
    const onDown = (e) => {
      if (e.target !== cvsRef.current || e.pointerType === "touch" || e.button === 2) return;
      const a = kmap()[mouseCode(e.button)];
      if (a && !MOVE[a]) { e.preventDefault(); press(a); }
    };
    const onMUp = (e) => { if (e.pointerType !== "touch" && e.button !== 2) release(kmap()[mouseCode(e.button)]); };
    const blur = () => { held.length = 0; A("hold", []); A("fire", false); };
    // 크림슨 레퀴엠 차징 중 — 포인터 쪽이 바뀌면 다시 겨눈다
    const aimT = setInterval(() => {
      if (!chargeRef.current) return;
      const g = G.current, a = g && pointerSkillAim(g.heroes[0], g.cam, pointer.current, RPG.squash);
      const l = lastWaim.current;
      if (!a || (l && Math.hypot(a[0] - l[0], a[1] - l[1]) < 0.04)) return;
      lastWaim.current = a;
      A("waim", true);
    }, 80);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onMUp);
    window.addEventListener("blur", blur);
    return () => {
      clearInterval(aimT);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onMUp);
      window.removeEventListener("blur", blur);
    };
  }, [binds]);

  // 판 좌표 — 포인터를 기억하고, 오른쪽 클릭(휴대폰은 누르기)으로 그 자리까지 걷는다
  const boardAt = (e) => {
    const r = cvsRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, map: SANDBOX.id };
  };
  const onMove = (e) => { pointer.current = boardAt(e); };
  const onPress = (e) => {
    pointer.current = boardAt(e);
    if (e.pointerType !== "touch" && e.button !== 2) return;
    const g = G.current;
    if (!g || !g.cam) return;
    act("mv", { x: pointer.current.x + g.cam.x, y: pointer.current.y + g.cam.y, m: SANDBOX.id });
  };

  // 루프 — 이 기기에서만 판정하고 그린다. 허수아비 발밑에 캐릭터와의 거리(칸)를 적는다
  useEffect(() => {
    const cvs = cvsRef.current;
    const ctx = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    const bgs = {};
    let raf, last = performance.now(), hudAt = 0;
    const loop = (now) => {
      const real = Math.max(0, (now - last) / 1000);
      last = now;
      const g = G.current;
      if (g) {
        for (let left = Math.min(real, 0.25); left > 0; left -= STEP_MAX) rpgStep(g, Math.min(left, STEP_MAX));
        const h = g.heroes[0];
        if (h) {
          h.gateCd = 1;
          if (h.map !== SANDBOX.id) { h.map = SANDBOX.id; [h.x, h.y] = SANDBOX.spawn; }
          if (h.down > 0 && h.trn && h.trn.god) h.down = 0;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawRpg(ctx, g, bgs);
        if (h && g.cam) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
          g.mobs.forEach((m) => {
            if (m.type !== "dummy" || m.map !== SANDBOX.id) return;
            const x = m.x - g.cam.x, y = m.y - g.cam.y + 14;
            if (x < -40 || x > W + 40 || y < -20 || y > H + 20) return;
            const d = dist(h.x, h.y, m.x, m.y) / SANDBOX.cell;
            const t = `${d.toFixed(1)}칸`;
            ctx.fillStyle = "rgba(20,16,10,0.7)"; ctx.fillRect(x - ctx.measureText(t).width / 2 - 4, y - 1, ctx.measureText(t).width + 8, 16);
            ctx.fillStyle = "#f2e3c2"; ctx.fillText(t, x, y + 1);
          });
          ctx.textAlign = "start";
        }
        if (now - hudAt >= HUD_MS && h) {
          hudAt = now;
          const t = trainView(g, h) || {};
          const bv = bloodHud(bloodView(h));
          const [cx, cy] = cellOf(h);
          setHud({ dps: t.dps || 0, tot: Math.round(t.tot || 0), hits: t.hits || 0, god: !!t.god, nocd: !!t.nocd, stack: !!t.stack,
            hp: Math.round(h.hp), max: Math.round(h.max), sk: h.sk || 0, cx, cy, blood: bv ? `${bv.b}/${bv.cap} ${bv.state}` : "" });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const key = (id) => (!touch && keyOf(binds, id)) || "";
  // 조작 안내 — 이 캐릭터가 쓰는 행동만
  const helpActs = KEY_ACTIONS.filter((a) => a.group === "전투" && !a.id.startsWith("pot") && keyOf(binds, a.id) && (
    blood ? BLOOD_ACTS.includes(a.id) || ["fire", "dash", "wskill"].includes(a.id)
      : !BLOOD_ACTS.includes(a.id) && (!["adv", "advUlt", "healMode"].includes(a.id) || (cfg.adv && (a.id === "adv" || (a.id === "advUlt" && cfg.adv === "summoner") || (a.id === "healMode" && cfg.adv === "healer"))))
  ));
  const el = ELEM_BY_ID[elemFor(cfg.job, cfg.elem)];
  const title = [blood ? BLOOD_NAME : (ADV_CLASSES.find((q) => q.id === cfg.adv) || {}).name, JOB_BY_ID[cfg.job].name, el.name].filter(Boolean).join(" · ");

  return (
    <div className="page sb-page">
      <div className="sb">
        <div className="jt-head">
          <div>
            <h1 className="jt-title">격자 연습장 <span>{title} · {cfg.lv}레벨</span></h1>
            <p className="mk-note">한 칸은 게임 거리 {SANDBOX.cell}입니다. 이 기기에서만 돌고 아무것도 저장하지 않습니다.</p>
          </div>
          <a className="btn-ghost sb-home" href="/">게임으로</a>
        </div>

        <div className="jt-body sb-body">
          <div className="jt-stage">
            <canvas ref={cvsRef} className="jt-cvs sb-cvs" onPointerMove={onMove} onPointerDown={onPress}
              onContextMenu={(e) => e.preventDefault()} aria-label="격자 연습장 판" />
            {hud && <div className="jt-bar">
              <span>위치 <b>{hud.cx.toFixed(1)}, {hud.cy.toFixed(1)}칸</b></span>
              <span>체력 <b>{fmt(hud.hp)}/{fmt(hud.max)}</b></span>
              {hud.blood && <span>혈량 <b>{hud.blood}</b></span>}
              <span className="sb-key">초당 피해 <b>{fmt(hud.dps)}</b></span>
              <span>쌓인 피해 <b>{fmt(hud.tot)}</b></span>
              <span>맞힌 수 <b>{fmt(hud.hits)}</b></span>
            </div>}
            <div className="jt-pads sb-pads">
              {TOOLS.map((t) => (
                <button key={t.id} type="button" className={`jt-chip ${hud && hud[t.id] ? "on" : ""}`} aria-pressed={!!(hud && hud[t.id])} onClick={() => tool(t.id)}>{t.name}</button>
              ))}
              <button type="button" className="jt-chip" onClick={() => tool("reset")}>기록 지우기</button>
              <button type="button" className="jt-chip" onClick={() => tool("heal")}>체력 · 대기 되돌리기</button>
              <button type="button" className="jt-chip" onClick={() => setRound((r) => r + 1)}>처음부터</button>
            </div>
            {touch && <div className="jt-pads">
              <button type="button" className="btn-ghost" onClick={() => act("skill")}>큰 기술{hud && hud.sk > 0 ? ` ${Math.ceil(hud.sk)}초` : ""}</button>
              <button type="button" className="btn-ghost" onClick={() => act("dash")}>대쉬</button>
            </div>}
          </div>

          <div className="jt-side">
            <section>
              <h3 className="jt-h">직업</h3>
              <div className="jt-chips">
                {JOBS.map((j) => (
                  <button key={j.id} type="button" className={`jt-chip ${cfg.job === j.id ? "on" : ""}`} aria-pressed={cfg.job === j.id} onClick={() => pickJob(j.id)}>{j.name}</button>
                ))}
                {[["m", "남"], ["f", "여"]].map(([id, n]) => (
                  <button key={id} type="button" className={`jt-chip ${cfg.gender === id ? "on" : ""}`} aria-pressed={cfg.gender === id} onClick={() => set({ gender: id })}>{n}</button>
                ))}
              </div>
              {magic && !blood && <div className="jt-chips sb-gap">
                {ELEMS.map((e) => (
                  <button key={e.id} type="button" className={`jt-chip ${cfg.elem === e.id ? "on" : ""}`} style={{ "--ec": e.light }} aria-pressed={cfg.elem === e.id} onClick={() => set({ elem: e.id })}>
                    <span className="mk-dot" />{e.name}
                  </button>
                ))}
              </div>}
            </section>
            <section>
              <h3 className="jt-h">전직</h3>
              <div className="jt-chips">
                <button type="button" className={`jt-chip ${!cfg.adv ? "on" : ""}`} aria-pressed={!cfg.adv} onClick={() => pickAdv("")}>없음</button>
                {advs.map((q) => (
                  <button key={q.id} type="button" className={`jt-chip ${cfg.adv === q.id ? "on" : ""}`} aria-pressed={cfg.adv === q.id} onClick={() => pickAdv(q.id)}>{q.name}</button>
                ))}
                <button type="button" className={`jt-chip ${blood ? "on" : ""}`} aria-pressed={blood} onClick={() => pickAdv("blood")}>{BLOOD_NAME}</button>
              </div>
              {cfg.adv && !blood && <label className="sb-row">숙련 단계
                <select value={cfg.mastery} onChange={(e) => set({ mastery: Number(e.target.value) })}>
                  {ADV_MASTERY.pts.map((_, i) => <option key={i} value={i + 1}>{i + 1}단계</option>)}
                </select>
              </label>}
              {blood && <>
                <label className="sb-row">직업 레벨
                  <input type="number" min="1" max={BLOOD.maxLv} value={cfg.bloodLv} onChange={(e) => set({ bloodLv: Number(e.target.value) })} />
                </label>
                <label className="sb-row">연마(셋 모두)
                  <input type="number" min="0" max={BLOOD.train.max} value={cfg.train} onChange={(e) => set({ train: Number(e.target.value) })} />
                </label>
              </>}
            </section>
            <section>
              <h3 className="jt-h">능력</h3>
              <label className="sb-row">레벨
                <input type="number" min="1" max={LV_TOP} value={lvText} onChange={(e) => setLvText(e.target.value)} onBlur={commitLv}
                  onKeyDown={(e) => { if (e.key === "Enter") commitLv(); }} />
              </label>
              <div className="jt-chips sb-gap">
                <button type="button" className={`jt-chip ${cfg.stats === "spread" ? "on" : ""}`} aria-pressed={cfg.stats === "spread"} onClick={() => set({ stats: "spread" })}>레벨만큼 나눔</button>
                <button type="button" className={`jt-chip ${cfg.stats === "max" ? "on" : ""}`} aria-pressed={cfg.stats === "max"} onClick={() => set({ stats: "max" })}>스탯 최대</button>
              </div>
              <label className="sb-row">무기
                <select value={cfg.weapon} onChange={(e) => set({ weapon: e.target.value })}>
                  {!blood && <option value="">맨손(기본 무기)</option>}
                  {weapons.map((w) => <option key={w.id} value={w.id}>{w.name}{w.hold ? " · 미공개" : ""}</option>)}
                </select>
              </label>
              {!blood && <>
                <label className="sb-row">직업 칸
                  <select value={cfg.ks.job} onChange={(e) => set({ ks: { ...cfg.ks, job: e.target.value } })}>
                    <option value="">비움</option>
                    {jobSkills(cfg.job).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                {[0, 1].map((i) => (
                  <label key={i} className="sb-row">일반 칸 {i + 1}
                    <select value={cfg.ks.g[i]} onChange={(e) => { const g = cfg.ks.g.slice(); g[i] = e.target.value; set({ ks: { ...cfg.ks, g } }); }}>
                      <option value="">비움</option>
                      {genSkills().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                ))}
              </>}
            </section>
            <section>
              <h3 className="jt-h">허수아비</h3>
              <div className="jt-chips">
                {SANDBOX_LAYOUTS.map((q) => (
                  <button key={q.id} type="button" className={`jt-chip ${cfg.layout === q.id ? "on" : ""}`} aria-pressed={cfg.layout === q.id} onClick={() => set({ layout: q.id })}>{q.name}</button>
                ))}
              </div>
              <p className="mk-note">{(SANDBOX_LAYOUTS.find((q) => q.id === cfg.layout) || {}).note}.</p>
              <button type="button" className="jt-chip sb-gap" onClick={() => G.current && placeDummies(G.current, cfg.layout)}>캐릭터 앞에 다시 세우기</button>
            </section>
            <section>
              <h3 className="jt-h">조작</h3>
              <ul className="jt-keys">
                {touch ? (
                  <>
                    <li>판을 누르면 그 자리로 걷습니다</li>
                    <li>가까운 허수아비는 저절로 칩니다</li>
                  </>
                ) : (
                  <>
                    <li><kbd>{key("up")}</kbd><kbd>{key("left")}</kbd><kbd>{key("down")}</kbd><kbd>{key("right")}</kbd> 이동 · 오른쪽 클릭으로 걷기</li>
                    <li>스킬은 마우스 쪽으로 나갑니다</li>
                    {helpActs.map((a) => <li key={a.id}><kbd>{key(a.id)}</kbd> {a.name.replace(/\(BLOOD-001[^)]*\)/, "")}</li>)}
                  </>
                )}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
