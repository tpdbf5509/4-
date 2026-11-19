/* ── 히든 직업 Gambler 002 해금 경로 「황금 카지노의 계약」 — 단서 · 문 · 1인 시험(11월 16일, 기획안 14장) ─────────────
   수치 · 자리는 gamblerData.js(GM_SPOTS · GM_REPAIR · GM_CASINO). 판정은 방장 · 전용 서버만. 틀은 BLOOD-001(bloodUnlock.js)과 같다.
   진행은 가방 bag.gu = { c: 단서 비트(A 낡은 황금 칩 · B 계약서 · C 주사위 기계), f: 진행 비트(1 상자를 살핌 · 2 기계를 살핌 · 4 · 8 · 16 허수아비 주사위), o: 문을 열었나 }.
   조사 자리는 말 걸기(rpgTalk)가 먼저 본다. 화면은 같은 함수(gmSpotNear · gmSpotLine)로 조사 칸을 띄운다.
   시험 동안은 가방 bag.hj 를 시험용으로 바꿔 둔다(trial: 1 · prev: 원래 값). 저장(cleanHj)은 늘 prev 를 쓰므로 시험 값은 남지 않는다.
   시험 상태 h.gt = { step 1~3, t, tg 표적 id, wp 예고, blk · bet · dice · far 해낸 일(gamblerJob.js mark) } — 저장하지 않는다(나가면 처음부터).
   E(엔진, rpg.js gamblerEngine): fx · say · sys · dummyAt(맵에 허수아비) · hurt(시험 피해) · goMap */
import { GAMBLER as GM, GAMBLER_ID, GAMBLER_NAME, GM_CLUE as K, GM_CLUE_NEED, GM_SPOTS, GM_REPAIR, GM_CASINO as CA, GM_VEIL, GM_DICE } from "./gamblerData.js";
import { unlockGambler, gamblerOn, cleanGmJob } from "./gamblerJob.js";
import { TRAIN } from "./trainData.js";
import { hiddenEnforced, hiddenTaken, hiddenTakenMsg, hiddenAsk, hiddenReply } from "./hiddenUnique.js";   // 히든 직업 유일 규칙(11월 17일) — 게임 전체에서 한 명만

const SQ = 0.78;
const GOLD = "#F2DFA6";
const DICE_BITS = [4, 8, 16];                         // 허수아비 셋에서 빼낸 주사위
const DICE_ALL = 28;
export const cleanGu = (d) => {
  if (!d || typeof d !== "object") return null;
  const n = (v) => Math.max(0, Math.min(31, Math.floor(Number(v) || 0)));
  const b = { c: n(d.c) & 7, f: n(d.f), o: n(d.o) & 1 };
  return b.c || b.f || b.o ? b : null;
};
const gu = (h) => h.bag.gu || (h.bag.gu = { c: 0, f: 0, o: 0 });
const real = (h) => gamblerOn(h) && !h.bag.hj.trial;   // 이미 Gambler 002 인가(시험 중은 아니다)
const clues = (u) => [K.A, K.B, K.C].filter((b) => u.c & b).length;
const doorOn = (u) => !!(u.o || clues(u) >= GM_CLUE_NEED);
// 숨김 규칙 — 칩 상자는 늘 놓여 있다(시작 단서). 계약서 · 주사위 기계는 상자를 살핀 사람에게만 보인다. 이미 이 직업이면 아무것도 없다
export function gmSpotShown(h, s) {
  if (!GM.live || !h || !h.bag || real(h)) return false;
  if (s.id === "box") return true;
  return !!(h.bag.gu && (h.bag.gu.f & 1));
}
const dist = (h, s) => Math.hypot(h.x - s.x, (h.y - s.y) / SQ);
// 가까운 조사 자리 — 화면 · 판정이 같이 쓴다. 말할 거리가 없는 자리는 고르지 않는다
export function gmSpotNear(h) {
  if (!h || !h.bag || h.down > 0) return null;
  return GM_SPOTS.find((s) => s.map === h.map && dist(h, s) <= s.r && gmSpotShown(h, s) && gmSpotLine(h, s)) || null;
}
// 그 자리에서 지금 할 수 있는 일 — [화면 한 줄, 단추 글] | null(보일 것 없음)
export function gmSpotLine(h, s) {
  if (real(h)) return null;
  const u = h.bag.gu || { c: 0, f: 0, o: 0 };
  if (s.id === "box") {
    if (doorOn(u)) return [u.o ? "상자 바닥의 문이 열려 있다. 카지노 뒷방으로 내려갈 수 있다." : "단서가 맞물린다 — 상자 바닥이 달칵 움직인다.", "들어가기"];
    return u.f & 1 ? ["빈 상자다. 칩에 새겨진 두 곳을 찾아가 보자."] : ["카지노 옆에 버려진 낡은 상자. 안에서 무언가 반짝인다.", "살펴보기"];
  }
  if (s.id === "deed") return u.c & K.B ? null : ["여관 게시판 구석에 빛바랜 계약서가 붙어 있다.", "떼어 보기"];
  if (s.id === "machine") {
    if (u.c & K.C) return null;
    if (!(u.f & 2)) return ["주사위 구멍 셋이 비어 있는 낡은 기계.", "살펴보기"];
    const n = DICE_BITS.filter((b) => u.f & b).length;
    return n >= GM_REPAIR.dice ? ["주사위 셋을 모두 찾았다.", "끼워 넣기"] : [`빠진 주사위 ${n}/${GM_REPAIR.dice} — 허수아비에 박혀 있다.`];
  }
  return null;
}
const save = (h) => { h.bag.v += 1; };
const tell = (E, g, h, text) => E.sys(g, h.pi, text);
function clueFx(E, g, h, name) {
  const n = clues(gu(h));
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 130, text: `단서 — ${name} (${n}/3)`, color: GOLD, t: 1.6, life: 1.6, snd: "gmFull", who: h.pi });
  if (n === GM_CLUE_NEED) tell(E, g, h, "단서 두 개가 같은 곳을 가리킨다. 광장의 낡은 칩 상자로 돌아가 보자.");
}

// 조사 — 말 걸기(E)가 부른다. 조사했으면 true(다른 말 걸기는 하지 않는다)
export function gamblerSpotTalk(E, g, h) {
  const s = gmSpotNear(h);
  if (!s) return false;
  const u = gu(h);
  if (s.id === "box") {
    if (doorOn(u)) {
      if (hiddenTaken(g, h, GAMBLER_ID)) return tell(E, g, h, hiddenTakenMsg(GAMBLER_ID)), true;   // 이미 다른 사람이 계약했다 — 문을 열지 않는다
      if (!u.o) {
        u.o = 1; save(h);
        E.fx(g, h.map, { kind: "sk_gm_full", x: s.x, y: s.y, t: 0.6, life: 0.6, snd: "gmSlot", who: h.pi });
        tell(E, g, h, "상자 바닥이 열리고 금빛 계단이 드러났다. 다음에는 이 문으로 다시 내려올 수 있다.");
      }
      enterCasino(E, g, h);
    } else if (!(u.f & 1)) {
      u.f |= 1; u.c |= K.A; save(h); clueFx(E, g, h, "낡은 황금 칩");
      tell(E, g, h, "상자 안에서 낡은 황금 칩을 얻었다. 뒷면에 '에르덴 여관 — 회수되지 않은 계약' 과 '훈련장 주사위 기계 정비' 가 새겨져 있다.");
    } else tell(E, g, h, "빈 상자다. 칩에 새겨진 에르덴 여관과 훈련장을 찾아가 보자.");
  } else if (s.id === "deed") {
    u.c |= K.B; save(h); clueFx(E, g, h, "빛바랜 계약서");
    tell(E, g, h, "계약서를 떼어 냈다. '황금 카지노 — 칩 일곱 개를 건 자에게 문을 연다' 는 글 아래 서명 칸이 비어 있다.");
  } else if (s.id === "machine") {
    if (!(u.f & 2)) {
      u.f |= 2; save(h);
      tell(E, g, h, "주사위 기계의 구멍 셋이 비어 있다. 튕겨 나간 주사위가 훈련장 허수아비에 박혀 있는 것 같다. 허수아비 셋을 한 번씩 쳐 보자.");
    } else if ((u.f & DICE_ALL) === DICE_ALL) {
      u.c |= K.C; save(h); clueFx(E, g, h, "되살아난 주사위 기계");
      E.fx(g, h.map, { kind: "sk_gm_dicehit", x: s.x, y: s.y, r: 60, n: 6, t: 0.45, life: 0.45, snd: "gmDice", who: h.pi });
      tell(E, g, h, "주사위 셋을 끼우자 기계가 돌아간다. 눈 셋이 모두 7 을 가리키고 '카지노 뒷방 — 칩 상자 아래' 라는 표가 나왔다.");
    } else tell(E, g, h, `빠진 주사위를 ${DICE_BITS.filter((b) => u.f & b).length}개 찾았다. 나머지는 다른 허수아비에 박혀 있다.`);
  } else return false;
  return true;
}

/* ── 주사위 기계 복구 — 기계를 살핀 뒤 훈련장 허수아비 셋(trainData.js TRAIN.dummies)을 한 번씩 치면 주사위가 하나씩 빠진다 ── */
export function gamblerDummyHit(E, g, h, m) {
  if (!GM.live || !h || h.map !== "train" || !h.bag || !h.bag.gu || real(h)) return;
  const u = h.bag.gu;
  if (!(u.f & 2) || (u.c & K.C) || (u.f & DICE_ALL) === DICE_ALL) return;
  const i = TRAIN.dummies.findIndex(([x, y]) => Math.hypot(m.x - x, (m.y - y) / SQ) <= GM_REPAIR.hitR);
  if (i < 0 || i >= DICE_BITS.length || (u.f & DICE_BITS[i])) return;
  u.f |= DICE_BITS[i]; save(h);
  const n = DICE_BITS.filter((b) => u.f & b).length;
  E.fx(g, "train", { kind: "sk_gm_hit", x: m.x, y: m.y, t: 0.3, life: 0.3, snd: "gmDice", who: h.pi });
  E.fx(g, "train", { kind: "call", x: m.x, y: m.y - 110, text: `주사위 ${n}/${GM_REPAIR.dice}`, color: GOLD, t: 1, life: 1, who: h.pi });
  if (n >= GM_REPAIR.dice) tell(E, g, h, "주사위 셋을 모두 찾았다. 기계로 돌아가 끼워 넣자.");
}

/* ── 황금 카지노 뒷방 · 1인 시험 ───────────────────────── */
export const CASINO_ID = CA.id;
const STEP_MSG = ["",
  `1단계: 바닥에 예고가 뜨면 ${GM_VEIL.name}으로 피해를 막아라.`,
  `2단계: 표적에 평타(황금 칩)를 맞혀 칩 7개를 모은 뒤 ${GM_DICE.name}을 맞혀 풀 베팅을 터뜨려라.`,
  `3단계: 멀리 선 표적을 ${GM_DICE.name}으로 맞혀라. 포인터를 올린 자리에 떨어진다.`];
function enterCasino(E, g, h) {
  E.goMap(g, h, CA.id, CA.spawn);
  startTrial(E, g, h);
}
function startTrial(E, g, h) {
  if (real(h)) return;
  if (!(h.bag.hj && h.bag.hj.trial)) {
    const prev = h.bag.hj || null;
    h.bag.hj = { active: GAMBLER_ID, jobs: { [GAMBLER_ID]: cleanGmJob({ lv: CA.lv }) }, version: 1, trial: 1, prev };
    h.gm = null;
  }
  clearTargets(g, h);
  h.gt = { step: 1, t: 0, tg: CA.targets.map(([x, y]) => target(E, g, h, x, y).id), wp: null };
  save(h);
  tell(E, g, h, `${CA.name} — 시험 동안 ${GAMBLER_NAME} 의 스킬 셋을 빌려준다. 통과하면 1차 전직 대신 이 직업이 된다. ${STEP_MSG[1]}`);
}
function target(E, g, h, x, y, far) { const m = E.dummyAt(g, CA.id, x, y); m.own = h.pi; if (far) m.far = 1; return m; }
function clearTargets(g, h) { g.mobs = g.mobs.filter((m) => !(m.map === CA.id && m.own === h.pi)); }
// 시험을 그만둔다(뒷방을 나감 · 쓰러짐) — 빌려준 스킬 · 칩을 거둔다
function endTrial(g, h) {
  const hj = h.bag.hj;
  if (hj && hj.trial) { if (hj.prev) h.bag.hj = hj.prev; else delete h.bag.hj; h.gm = null; save(h); }
  clearTargets(g, h);
  h.gt = null;
}
function pass(E, g, h, step) {
  const t = h.gt;
  t.step = step + 1; t.t = 0; t.wp = null; t.bet = 0; t.dice = 0; t.far = 0;
  if (h.gm) { h.gm.cd.dice = 0; h.gm.cd.veil = 0; }                   // 다음 단계를 바로 해 볼 수 있게
  if (t.step === 3) t.tg.push(target(E, g, h, CA.far[0], CA.far[1], true).id);
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 130, text: `시험 ${step}단계 통과`, color: GOLD, t: 1.2, life: 1.2, snd: "gmFull", who: h.pi });
  tell(E, g, h, STEP_MSG[t.step]);
}
/* 시험을 통과했다 — 유일 규칙(hiddenUnique.js): 서버 방은 장부에 자리를 묻고(h.hjr 로 답이 온다) 받았을 때만 해금한다.
   먼저 계약한 사람이 있으면 시험을 거두고 광장으로 돌려보낸다. 장부에 닿지 못하면 3초 뒤 다시 묻는다 */
const ASK_WAIT = 10;
function settle(E, g, h, dt) {
  const t = h.gt;
  if (!hiddenEnforced(g, h)) return void finish(E, g, h);
  const r = hiddenReply(h, GAMBLER_ID);
  if (r) {
    t.ask = 0;
    if (r.ok) return void finish(E, g, h);
    if (r.err === "taken" || r.err === "account") {
      endTrial(g, h);
      E.goMap(g, h, "plaza", CA.plazaAt);
      return void tell(E, g, h, r.err === "taken" ? hiddenTakenMsg(GAMBLER_ID) : `서버 계정이 없는 캐릭터는 ${GAMBLER_NAME} 를 해금할 수 없다.`);
    }
    t.rt = 3;
    return void tell(E, g, h, "계약을 확인하지 못했다. 잠시 뒤 다시 시도한다.");
  }
  if (t.rt > 0) return void (t.rt -= dt);
  if (t.ask) { if ((t.aw = (t.aw || 0) + dt) > ASK_WAIT) { t.ask = 0; t.aw = 0; } return; }   // 답이 없으면 다시 묻는다
  t.ask = 1; t.aw = 0;
  hiddenAsk(g, h, GAMBLER_ID);
}
function finish(E, g, h) {
  const hj = h.bag.hj, prev = hj && hj.trial ? hj.prev : hj;
  if (prev) h.bag.hj = prev; else delete h.bag.hj;
  clearTargets(g, h);
  h.gt = null;
  unlockGambler(h);
  E.fx(g, h.map, { kind: "sk_gm_777end", x: h.x, y: h.y, r: 150, res: 2, pi: h.pi, t: 0.8, life: 0.8, snd: "gmBoom" });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 140, text: `${GAMBLER_NAME} 계약 성립`, color: GOLD, t: 2, life: 2, snd: "lvup" });
  const J = h.bag.hj && h.bag.hj.jobs && h.bag.hj.jobs.gambler, lv = (J && J.lv) || 1;   // 예전 기록이 있으면 그 레벨에서 잇는다
  tell(E, g, h, `${GAMBLER_NAME} 를 해금했다. 1차 전직은 사라지고 무기는 내려놓았다. ${lv > 1 ? `예전 기록(직업 레벨 ${lv})에서 이어 간다.` : "직업 레벨 1 · 황금 칩부터 시작하고, 직업 레벨이 오르면 다음 스킬이 열린다."}`);
}
// 시간 — tickGambler 앞에서 부른다(시험 가방이면 gamblerOn 이 참이다)
export function tickGamblerTrial(E, g, h, dt) {
  const hj = h.bag && h.bag.hj;
  if (!h.gt && !(hj && hj.trial)) return;
  if (h.map !== CA.id || h.down > 0 || !(hj && hj.trial)) return void endTrial(g, h);
  const t = h.gt;
  if (!t) return void endTrial(g, h);
  t.t += dt;
  if (t.step === 2 && t.bet) return void pass(E, g, h, 2);
  if (t.step === 3 && t.far) return void settle(E, g, h, dt);
  if (t.step !== 1) return;
  const V = CA.veil;
  if (!t.wp && t.t >= V.gap) {                        // 예고 — 지금 내 자리에 원
    t.wp = { x: h.x, y: h.y, t: 0 };
    E.fx(g, h.map, { kind: "sk_gm_warn", x: h.x, y: h.y, r: V.r, d: V.warn, pi: h.pi, t: V.warn + 0.2, life: V.warn + 0.2, snd: "gmDice" });
  }
  if (t.wp && (t.wp.t += dt) >= V.warn) {
    const p = t.wp, inside = Math.hypot(h.x - p.x, (h.y - p.y) / SQ) <= V.r;
    t.wp = null; t.t = 0;
    if (!inside) return void tell(E, g, h, `예고 원 밖으로 피했다. 이번에는 원 안에서 ${GM_VEIL.name}으로 막아 보자.`);
    t.blk = 0;
    const up = !!(h.gm && h.gm.sh);                   // 맞는 순간 장막이 서 있었나 — 다른 보호 효과가 먼저 받아도 막은 것으로 친다
    E.hurt(g, h, Math.min(h.hp - 1, h.max * V.dmg));
    E.fx(g, h.map, { kind: "sk_gm_dicehit", x: p.x, y: p.y, r: V.r, n: 1, pi: h.pi, t: 0.45, life: 0.45, snd: "gmHit" });
    if (t.blk || up) return void pass(E, g, h, 1);
    tell(E, g, h, `${GM_VEIL.name} 없이 맞았다. 예고가 뜨면 ${GM_VEIL.name} 키를 눌러라.`);
  }
}
