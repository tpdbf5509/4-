/* ── 히든 직업 BLOOD-001 해금 경로 — 단서 · 입구 · 1인 시험(11월 14일 4단계, 「히든직업_해금루트」) ─────────────
   수치 · 자리는 bloodJobData.js(BLOOD_SPOTS · BLOOD_DOORS · BLOOD_SEQ · BLOOD_LAB). 판정은 방장 · 전용 서버만.
   조사 자리는 말 걸기(rpgTalk)가 먼저 본다. 화면은 같은 함수(spotNear · spotLine)로 조사 칸을 띄운다.
   시험 동안은 가방 bag.bd 를 시험용으로 바꿔 둔다(trial: 1 · prev: 원래 값). 저장(cleanBd)은 늘 prev 를 쓰므로 시험 값은 남지 않는다.
   E(엔진, rpg.js bloodJobEngine): fx · say · sys · dummyAt(맵에 허수아비) · hurt(시험 피해) · goMap */
import { BLOOD, BLOOD_CLUE as K, BLOOD_SPOTS, BLOOD_DOORS, BLOOD_SEQ, BLOOD_LAB as LAB, BLOOD_NAME } from "./bloodJobData.js";
import { unlockBlood, bloodOn } from "./bloodJob.js";

const SQ = 0.78;
export const cleanBu = (d) => {
  if (!d || typeof d !== "object") return null;
  const n = (v) => Math.max(0, Math.min(15, Math.floor(Number(v) || 0)));
  const b = { c: n(d.c) & 7, f: n(d.f), o: n(d.o) & 7 };
  return b.c || b.f || b.o ? b : null;
};
const bu = (h) => h.bag.bu || (h.bag.bu = { c: 0, f: 0, o: 0 });
const real = (h) => bloodOn(h) && !h.bag.bd.trial;   // 이미 BLOOD-001 인가(시험 중은 아니다)
const dist = (h, s) => Math.hypot(h.x - s.x, (h.y - s.y) / SQ);
// 가까운 조사 자리 — 화면 · 판정이 같이 쓴다. 이미 각성했거나 말할 거리가 없는 자리는 고르지 않는다
export function spotNear(h) {
  if (!h || !h.bag || h.down > 0) return null;
  return BLOOD_SPOTS.find((s) => s.map === h.map && dist(h, s) <= s.r && spotLine(h, s)) || null;
}
// 그 자리에서 지금 할 수 있는 일 — [화면 한 줄, 단추 글] | null(보일 것 없음)
export function spotLine(h, s) {
  if (real(h)) return null;
  const u = h.bag.bu || { c: 0, f: 0, o: 0 }, door = BLOOD_DOORS.find((d) => d.spot === s.id && ((u.o & d.bit) || (u.c & d.need) === d.need));
  if (door) return [u.o & door.bit ? "열어 둔 입구다. 연구시설로 내려갈 수 있다." : `두 단서가 맞물린다 — ${door.name}`, "들어가기"];
  if (s.id === "trail") return u.c & K.A ? null : u.f & 1 ? ["핏자국이 경사를 거슬러 올라가 있다.", "조사하기"] : null;
  if (s.id === "tube") return u.c & K.A ? null : u.f & 2 ? ["흙 속에 깨진 유리관이 묻혀 있다.", "꺼내기"] : null;
  if (s.id === "press") return u.c & K.B ? null : u.f & 4 ? ["압축기가 열려 있다.", "손잡이 꺼내기"] : ["작은 원 → 큰 원 → 작은 원이 새겨진 낡은 압축기.", "살펴보기"];
  if (s.id === "sluice") return u.c & K.C ? null : u.f & 8 ? null : ["녹슨 수문 손잡이가 있다.", "돌리기"];
  if (s.id === "plate") return u.c & K.C ? null : u.f & 8 ? ["물이 낮아져 바닥의 금속판이 드러났다.", "꺼내기"] : ["물결 아래 금속판에 001 이 비친다.", "들여다보기"];
  return null;
}
const save = (h) => { h.bag.v += 1; };
const tell = (E, g, h, text) => E.sys(g, h.pi, text);

// 사냥꾼과 이야기 — 표본을 아직 얻지 못했으면 핏자국 이야기를 덧붙인다
export function bloodHunterTalk(E, g, h, npc) {
  if (real(h) || (bu(h).c & K.A)) return;
  if (!(bu(h).f & 1)) { bu(h).f |= 1; save(h); }
  E.say(g, h.map, npc.x, npc.y - 96, "저쪽 핏자국은 경사를 거슬러 올라간다…", "#e8b4b8");
}
// 조사 — 말 걸기(E)가 부른다. 조사했으면 true(다른 말 걸기는 하지 않는다)
export function bloodSpotTalk(E, g, h) {
  const s = spotNear(h);
  if (!s) return false;
  const u = bu(h);
  const door = BLOOD_DOORS.find((d) => d.spot === s.id && ((u.o & d.bit) || (u.c & d.need) === d.need));
  if (door) {
    if (!(u.o & door.bit)) { u.o |= door.bit; save(h); openFx(E, g, h, s, door); }
    enterLab(E, g, h);
    return true;
  }
  if (s.id === "trail") {
    u.f |= 2; save(h);
    E.fx(g, h.map, { kind: "sk_bj_lead", x: s.x, y: s.y, x1: BLOOD_SPOTS[1].x, y1: BLOOD_SPOTS[1].y, t: 1.6, life: 1.6, who: h.pi });
    tell(E, g, h, "핏방울 하나가 움직인다. 경사를 거슬러 흙길 옆으로 기어간다.");
  } else if (s.id === "tube" && (u.f & 2)) {
    u.c |= K.A; save(h); clueFx(E, g, h, "살아 있는 혈액 표본");
    tell(E, g, h, "깨진 유리관에서 살아 있는 혈액 표본을 얻었다. 유리관에는 '훈련장 압축기용' 라벨과 광장 분수의 문양이 남아 있다.");
  } else if (s.id === "press") {
    if (u.f & 4) {
      u.c |= K.B; save(h); clueFx(E, g, h, "압축기의 황동 손잡이");
      tell(E, g, h, "압축기 안에서 황동 손잡이를 꺼냈다. 정비 도면에는 사냥터 배수관과 광장 분수의 수문이 그려져 있다.");
    } else tell(E, g, h, "압축기에 작은 원 → 큰 원 → 작은 원이 새겨져 있다. 옆의 허수아비를 그 순서로 쳐 보자(평타 · 큰 기술 · 평타).");
  } else if (s.id === "sluice") {
    u.f |= 8; save(h);
    E.fx(g, h.map, { kind: "ring", x: 900, y: 620, r: 110, color: "#bfe6ff", t: 0.8, life: 0.8, who: h.pi });
    tell(E, g, h, "낡은 수문을 돌리자 분수의 물이 낮아진다. 바닥이 드러났다.");
  } else if (s.id === "plate") {
    if (u.f & 8) {
      u.c |= K.C; save(h); clueFx(E, g, h, "001 출입패");
      tell(E, g, h, "바닥에 걸린 001 출입패를 꺼냈다. 뒷면에 '실험체의 혈액으로 본인 확인' 이라는 문구와 압축기의 원형 표시가 찍혀 있다.");
    } else tell(E, g, h, "물결이 잦아들 때 바닥 금속판에 001 이 비친다. 물을 낮출 방법이 있을 것 같다.");
  } else return false;
  return true;
}
function clueFx(E, g, h, name) {
  const n = [K.A, K.B, K.C].filter((b) => bu(h).c & b).length;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 130, text: `단서 — ${name} (${n}/3)`, color: "#E53945", t: 1.6, life: 1.6, snd: "lvup", who: h.pi });
  if (n === 2) tell(E, g, h, "단서 두 개가 서로를 가리킨다. 두 단서가 함께 그려진 곳에 입구가 있을 것이다.");
}
function openFx(E, g, h, s, door) {
  E.fx(g, h.map, { kind: "sk_bj_burst", x: s.x, y: s.y, r: 90, pi: h.pi, t: 0.5, life: 0.5, snd: "bloodBoom" });
  tell(E, g, h, `${door.name}이 열렸다. 다음에는 이 입구로 다시 내려올 수 있다.`);
}

/* ── 압축기 순서 — 압축기 옆 허수아비에 평타 → 큰 기술 → 평타. 틀리면 첫 표시부터 ── */
export function bloodSeqHit(E, g, h, m, skill) {
  if (!h || h.map !== "train" || real(h) || !h.bag) return;
  const u = bu(h);
  if ((u.c & K.B) || (u.f & 4)) return;
  const p = BLOOD_SPOTS.find((s) => s.id === "press");
  if (Math.hypot(m.x - p.x, (m.y - p.y) / SQ) > BLOOD_SEQ.seqR) return;
  const q = h.bseq || (h.bseq = { i: 0, t: -9 });
  const want = BLOOD_SEQ.order[q.i], k = skill ? 1 : 0;
  if (k === want) {
    q.i += 1; q.t = g.t;
    E.fx(g, "train", { kind: "call", x: p.x, y: p.y - 120, text: ["○", "◯", "○"].map((c, i) => (i < q.i ? "●" : c)).join(" "), color: "#ffcf8a", t: 0.8, life: 0.8, who: h.pi });
    if (q.i >= BLOOD_SEQ.order.length) {
      h.bseq = null; u.f |= 4; save(h);
      E.fx(g, "train", { kind: "ring", x: p.x, y: p.y - 30, r: 80, color: "#ffcf8a", t: 0.7, life: 0.7, snd: "build", who: h.pi });
      tell(E, g, h, "원형 표시가 모두 켜지고 압축기가 열렸다.");
    }
    return;
  }
  if (g.t - q.t < BLOOD_SEQ.tail) return;            // 방금 맞힌 공격의 남은 타 — 무시
  if (q.i === 1 && k === 0) { q.t = g.t; return; }   // 평타를 또 쳤다 — 첫 표시는 켜 둔 채
  if (q.i > 0) E.fx(g, "train", { kind: "call", x: p.x, y: p.y - 120, text: "○ ◯ ○", color: "#c9b6a0", t: 0.8, life: 0.8, who: h.pi });
  h.bseq = k === 0 ? { i: 1, t: g.t } : null;       // 틀렸다 — 평타였다면 그것이 새 첫 표시
}

/* ── 폐쇄 연구시설 · 1인 시험 ───────────────────────── */
export const LAB_ID = LAB.id;
function enterLab(E, g, h) {
  E.goMap(g, h, LAB.id, LAB.spawn);
  startTrial(E, g, h);
}
function startTrial(E, g, h) {
  if (real(h)) return;
  if (!(h.bag.bd && h.bag.bd.trial)) {
    const prev = h.bag.bd || null;
    h.bag.bd = { on: 1, lv: BLOOD.unlock.shape, xp: 0, tr: [[0, 0], [0, 0], [0, 0]], b: LAB.b, trial: 1, prev };
    h.bd = null;
  }
  clearTargets(g, h);
  h.bt = { step: 1, t: 0, tg: LAB.targets.map(([x, y]) => { const m = E.dummyAt(g, LAB.id, x, y); m.own = h.pi; return m.id; }), wp: null, hit2: 0 };
  save(h);
  tell(E, g, h, `${LAB.name} — 시험용 혈량과 스킬을 빌려준다. 1단계: 표적에 평타를 맞혀 혈흔을 남겨라.`);
}
function clearTargets(g, h) { g.mobs = g.mobs.filter((m) => !(m.map === LAB.id && m.own === h.pi)); }
// 시험을 그만둔다(연구시설을 나감 · 쓰러짐) — 빌려준 혈량 · 스킬을 거둔다
function endTrial(g, h) {
  const bd = h.bag.bd;
  if (bd && bd.trial) { if (bd.prev) h.bag.bd = bd.prev; else delete h.bag.bd; h.bd = null; save(h); }
  clearTargets(g, h);
  h.bt = null;
}
function pass(E, g, h, step) {
  const msg = ["", "2단계: 차징한 적혈탄(키를 0.8초 넘게 누른다)으로 혈흔이 있는 표적을 맞혀 혈량을 회수하라.", "3단계: 바닥에 예고가 뜨면 혈막(누르고 있기)으로 피해를 줄여라."][step];
  h.bt.step = step + 1; h.bt.t = 0; h.bt.wp = null;
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 130, text: `시험 ${step}단계 통과`, color: "#E53945", t: 1.2, life: 1.2, snd: "build", who: h.pi });
  if (msg) tell(E, g, h, msg);
}
function finish(E, g, h) {
  const prev = h.bag.bd && h.bag.bd.trial ? h.bag.bd.prev : h.bag.bd;
  if (prev) h.bag.bd = prev; else delete h.bag.bd;
  clearTargets(g, h);
  h.bt = null;
  unlockBlood(h);
  E.fx(g, h.map, { kind: "sk_bj_rage", x: h.x, y: h.y, pi: h.pi, start: 1, t: 0.8, life: 0.8, snd: "bloodBoom" });
  E.fx(g, h.map, { kind: "call", x: h.x, y: h.y - 140, text: `${BLOOD_NAME} 각성`, color: "#E53945", t: 2, life: 2, snd: "lvup" });
  tell(E, g, h, `${BLOOD_NAME} 를 해금했다. 1차 전직은 사라지고 직업 레벨 1 · 적혈탄부터 시작한다. 직업 레벨이 오르면 다음 스킬이 열린다.`);
}
// 시간 — tickBloodJob 앞에서 부른다(시험 가방이면 bloodOn 이 참이다)
export function tickBloodTrial(E, g, h, dt) {
  const bd = h.bag && h.bag.bd;
  if (!h.bt && !(bd && bd.trial)) return;
  if (h.map !== LAB.id || h.down > 0 || !(bd && bd.trial)) return void endTrial(g, h);
  const t = h.bt;
  if (!t) return void endTrial(g, h);
  if (bd.b < LAB.low) bd.b = LAB.b;                  // 정해진 혈량
  t.t += dt;
  const mk = (h.bd && h.bd.mk) || {};
  if (t.step === 1 && t.tg.some((id) => mk[`m${id}`])) return void pass(E, g, h, 1);
  if (t.step === 2 && t.hit2) return void pass(E, g, h, 2);
  if (t.step !== 3) return;
  const V = LAB.veil;
  if (!t.wp && t.t >= V.gap) {                        // 예고 — 지금 내 자리에 원
    t.wp = { x: h.x, y: h.y, t: 0 };
    E.fx(g, h.map, { kind: "sk_bj_warn", x: h.x, y: h.y, r: V.r, d: V.warn, pi: h.pi, t: V.warn + 0.2, life: V.warn + 0.2, snd: "bloodCharge" });
  }
  if (t.wp && (t.wp.t += dt) >= V.warn) {
    const p = t.wp, inside = Math.hypot(h.x - p.x, (h.y - p.y) / SQ) <= V.r;
    t.wp = null; t.t = 0;
    if (!inside) return void tell(E, g, h, "예고 원 밖으로 피했다. 이번에는 원 안에서 혈막으로 막아 보자.");
    const veil = !!(h.bd && h.bd.vl);
    E.hurt(g, h, Math.min(h.hp - 1, h.max * V.dmg));
    E.fx(g, h.map, { kind: "sk_bj_slam", x: p.x, y: p.y, ax: 1, ay: 0, W: V.r * 1.4, pi: h.pi, t: 0.4, life: 0.4, snd: "bloodBoom" });
    if (veil && h.bd.vl && h.bd.vl.did) return void finish(E, g, h);
    tell(E, g, h, "혈막 없이 맞았다. 예고가 뜨면 혈막 키를 누르고 있어라.");
  }
}
// 스냅샷 · 화면 — 시험 단계(없으면 0)
export const packTrial = (h) => (h.bt ? h.bt.step : 0);
