/* 광장 미니게임 — 몹 레이스 규칙(수치는 raceData.js). 판정하는 쪽(방장 · 전용 서버)만 돌린다.
   g.race = { ph 단계(idle 쉼 · open 모집 · ready 출발선 · run 달리기 · end 결과), t 남은 초, el 달린 초, n 레이스 번호,
     go 출발한 사람 수, done 들어온 사람 수, rs 참가자, last 지난 레이스 결과 }. 통째로 스냅샷에 싣는다(rpg.js rpgPack · rpgApply).
   rs[] = { pi 자리, who 주인 id, m 탈것, lane 줄, x 트랙 위치, v 빠르기, st 남은 체력, tired 지침, sp 질주 버튼, fin 기록(초), pl 등수, out 포기 }.
   E = { sys, name, fx, stop, dayUsed, dayAdd } — rpg.js 가 넘긴다(서로 부르지 않게) */
import { RACE, MOUNT_BY_ID, laneY } from "./raceData.js";

export const RACE_MAP = "race";
export const newRace = () => ({ ph: "idle", t: 0, el: 0, n: 0, go: 0, done: 0, rs: [], last: [] });
// 받침에 따라 을/를 · 으로/로 — "토끼를" · "멧돼지를" · "고릴라로"
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c < 11172 && c % 28 ? a : b); };
const present = (g, r) => { const h = g.heroes[r.pi]; return h && h.who === r.who ? h : null; };
// 이 영웅의 참가 줄 — 손님 화면은 주인 id 를 모를 수 있어 자리만 본다
export const raceOf = (g, h) => (g.race && h ? g.race.rs.find((r) => r.pi === h.pi && (!h.who || r.who === h.who)) || null : null);
// 화면(RacePanel.jsx · RpgView.jsx 진행 칸)이 보는 모습 — 내 줄과 모두의 진행 몫
export function raceView(g, h) {
  const R = g.race;
  if (!R || !h) return null;
  const r = raceOf(g, h), len = RACE.finishX - RACE.startX;
  const M = r && MOUNT_BY_ID[r.m];
  return {
    ph: R.ph, t: Math.max(0, R.t), n: R.rs.length, go: R.go || 0,
    me: r ? { m: r.m, st: r.st, max: M ? M.st : 1, tired: !!r.tired, pl: r.pl, fin: r.fin, out: !!r.out, sp: !!r.sp } : null,
    list: R.rs.map((q) => ({ pi: q.pi, m: q.m, k: Math.max(0, Math.min(1, (q.x - RACE.startX) / len)), pl: q.pl, out: !!q.out })),
    rank: r ? 1 + R.rs.filter((q) => q !== r && !q.out && (q.pl ? !r.pl || q.pl < r.pl : !r.pl && q.x > r.x)).length : 0,
    last: (R.last || []).map((x) => ({ ...x })),
  };
}

// 참가할 수 없는 까닭 — 창(RacePanel.jsx)도 같은 것을 보고 버튼을 끈다. 비어 있으면 참가할 수 있다
export function whyRaceJoin(R, h) {
  const out = [];
  if (!h || !h.loaded) { out.push("캐릭터를 불러오는 중입니다"); return out; }
  if (h.map !== "plaza") out.push("광장에서만 참가할 수 있습니다");
  if (h.down > 0) out.push("쓰러진 동안에는 참가할 수 없습니다");
  if (h.dvs >= 0) out.push("결투 중에는 참가할 수 없습니다");
  if (R && R.ph !== "idle" && R.ph !== "open") out.push("레이스가 달리는 중입니다. 끝나면 참가하세요");
  else if (R && R.ph === "open" && R.rs.length >= RACE.max && !R.rs.some((r) => r.pi === h.pi)) out.push("자리가 다 찼습니다");
  return out;
}

function sendBack(E, g, h, i) {
  h.map = "plaza";
  h.x = RACE.backAt[0] + ((i % 3) - 1) * 60; h.y = RACE.backAt[1] + Math.floor(i / 3) * 40;
  h.gateCd = 1; h.dir = 1; E.stop(h);
}

export function raceInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !req) return false;
  const R = (g.race ||= newRace());
  const me = raceOf(g, h);
  if (req.op === "go") {                          // 질주 버튼 — 누르는 동안 켠다
    if (me) me.sp = req.on ? 1 : 0;
    return !!me;
  }
  if (req.op === "join") {
    const m = MOUNT_BY_ID[req.m] ? req.m : "";
    if (!m) return false;
    const why = whyRaceJoin(R, h);
    if (why.length) { E.sys(g, pi, why[0]); return false; }
    if (me) { me.m = m; E.sys(g, pi, `탈것을 ${josa(MOUNT_BY_ID[m].name, "으로", "로")} 바꿨습니다`); return true; }
    if (R.ph === "idle") Object.assign(R, { ph: "open", t: RACE.openT, rs: [] });
    R.rs.push({ pi, who: h.who, m, lane: -1, x: 0, v: 0, st: 0, tired: 0, sp: 0, fin: 0, pl: 0, out: 0 });
    if (R.rs.length >= RACE.max) R.t = Math.min(R.t, RACE.fullT);
    E.sys(g, pi, `${josa(MOUNT_BY_ID[m].name, "을", "를")} 타고 레이스에 참가했습니다. ${Math.ceil(R.t)}초 뒤 출발합니다`);
    return true;
  }
  if (req.op === "leave") {
    if (!me || R.ph !== "open") return false;
    R.rs = R.rs.filter((r) => r !== me);
    if (!R.rs.length) Object.assign(R, { ph: "idle", t: 0 });
    E.sys(g, pi, "레이스 참가를 취소했습니다");
    return true;
  }
  if (req.op === "quit") {                        // 달리는 중 포기 — 바로 광장으로
    if (!me || (R.ph !== "ready" && R.ph !== "run") || me.fin) return false;
    me.out = 1;
    if (h.map === RACE_MAP) sendBack(E, g, h, me.lane);
    E.sys(g, pi, "레이스를 포기했습니다");
    return true;
  }
  return false;
}

// 들어온 사람 보상 — 2명 이상 출발한 레이스만, 하루 RACE.daily 번까지
function reward(E, g, h, r, R) {
  const tm = r.fin.toFixed(2);
  if (R.go < RACE.minRacers) { E.sys(g, h.pi, `${r.pl}등 · ${tm}초. 혼자 달린 연습이라 보상은 없습니다`); return; }
  if (E.dayUsed(h) >= RACE.daily) { E.sys(g, h.pi, `${r.pl}등 · ${tm}초. 오늘 보상 ${RACE.daily}번을 다 받았습니다`); return; }
  const coin = r.pl <= RACE.prize.length ? RACE.prize[r.pl - 1] : RACE.finishCoin;
  h.coins += coin; E.dayAdd(h);
  E.sys(g, h.pi, `${r.pl}등 · ${tm}초. ${coin.toLocaleString("ko-KR")}코인을 받았습니다`);
}

function start(E, g, R) {
  const ok = [];
  for (const r of R.rs) {
    const h = present(g, r);
    if (!h) continue;
    const why = whyRaceJoin(null, h);
    if (why.length) { E.sys(g, h.pi, `레이스에 나가지 못했습니다 · ${why[0]}`); continue; }
    ok.push(r);
  }
  if (!ok.length) { Object.assign(R, { ph: "idle", t: 0, rs: [] }); return; }
  ok.forEach((r, i) => {
    const h = present(g, r), M = MOUNT_BY_ID[r.m];
    Object.assign(r, { lane: i, x: RACE.startX, v: 0, st: M.st, tired: 0, sp: 0, fin: 0, pl: 0, out: 0 });
    h.map = RACE_MAP; h.x = RACE.startX; h.y = laneY(i); h.dir = 1; h.face = 0; h.dash = 0; h.gateCd = 1; E.stop(h);
  });
  Object.assign(R, { ph: "ready", t: RACE.readyT, el: 0, n: (R.n || 0) + 1, go: ok.length, done: 0, rs: ok });
  E.fx(g, RACE_MAP, { kind: "call", x: RACE.startX + 260, y: laneY(0) - 120, text: "출발선에 섰습니다", color: "#ffe08a", t: 1.4, life: 1.4, snd: "build" });
}

function finish(E, g, R) {
  R.ph = "end"; R.t = RACE.endT;
  const rows = R.rs.map((r) => ({ nm: E.name(g, r.pi), m: r.m, pl: r.pl, tm: r.fin ? Math.round(r.fin * 100) / 100 : 0 }));
  rows.sort((a, b) => (a.pl || 99) - (b.pl || 99));
  R.last = rows.slice(0, RACE.results);
  for (const r of R.rs) {
    const h = present(g, r);
    if (h && !r.fin && !r.out && h.map === RACE_MAP) E.sys(g, h.pi, "시간 안에 들어오지 못했습니다");
  }
}

export function tickRace(E, g, dt) {
  const R = g.race;
  if (!R) return;
  // 레이스가 없는데 트랙에 남은 사람(방장이 바뀌었거나 옛 기록) — 광장으로
  const live = R.ph === "ready" || R.ph === "run" || R.ph === "end";
  g.heroes.forEach((h) => { if (h && h.map === RACE_MAP && !(live && raceOf(g, h))) sendBack(E, g, h, h.pi); });
  if (R.ph === "idle") return;
  if (R.ph === "open") {
    R.rs = R.rs.filter((r) => present(g, r));
    if (!R.rs.length) { Object.assign(R, { ph: "idle", t: 0 }); return; }
    R.t -= dt;
    if (R.t <= 0) start(E, g, R);
    return;
  }
  R.t -= dt;
  if (R.ph === "ready") {
    for (const r of R.rs) { const h = present(g, r); if (h && h.map === RACE_MAP && !r.out) { h.x = RACE.startX; h.y = laneY(r.lane); E.stop(h); } }
    if (R.t <= 0) {
      R.ph = "run"; R.t = RACE.limit;
      E.fx(g, RACE_MAP, { kind: "call", x: RACE.startX + 260, y: laneY(0) - 120, text: "출발!", color: "#ffe08a", t: 1.2, life: 1.2, snd: "clear" });
    }
    return;
  }
  if (R.ph === "run") {
    R.el += dt;
    for (const r of R.rs) {
      const h = present(g, r);
      if (!h || h.map !== RACE_MAP) { if (!r.fin) r.out = 1; continue; }
      if (r.out) continue;
      const M = MOUNT_BY_ID[r.m];
      if (r.fin) {                                // 들어온 뒤에는 천천히 멈춘다
        r.v += (0 - r.v) * Math.min(1, 1.5 * dt); r.x += r.v * dt;
      } else {
        const want = r.sp || (h.hold && h.hold.length > 0), go = want && !r.tired;
        const target = r.tired ? M.cruise * RACE.tired : go ? M.sprint : M.cruise;
        r.v += (target - r.v) * Math.min(1, M.acc * dt);
        r.x += r.v * dt;
        if (go) { r.st -= dt; if (r.st <= 0) { r.st = 0; r.tired = 1; } }
        else { r.st = Math.min(M.st, r.st + M.regen * dt); if (r.tired && r.st >= M.st * RACE.tiredBack) r.tired = 0; }
        if (r.x >= RACE.finishX) {
          r.fin = Math.max(0.01, R.el - (r.x - RACE.finishX) / Math.max(1, r.v));   // 넘어선 만큼 되짚어 기록을 잰다
          r.pl = ++R.done;
          if (r.pl === 1) R.t = Math.min(R.t, RACE.after);
          E.fx(g, RACE_MAP, { kind: "call", x: RACE.finishX, y: laneY(r.lane) - 110, text: `${r.pl}등!`, color: "#ffe08a", t: 1.4, life: 1.4, snd: r.pl === 1 ? "clear" : "build", who: h.pi });
          reward(E, g, h, r, R);
        }
      }
      h.x = Math.min(r.x, RACE.map.w - 120); h.y = laneY(r.lane); h.dir = 1; E.stop(h);
    }
    if (R.t <= 0 || R.rs.every((r) => r.fin || r.out)) finish(E, g, R);
    return;
  }
  if (R.ph === "end" && R.t <= 0) {
    R.rs.forEach((r, i) => { const h = present(g, r); if (h && h.map === RACE_MAP) sendBack(E, g, h, i); });
    Object.assign(R, { ph: "idle", t: 0, rs: [] });
  }
}
