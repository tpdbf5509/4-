/* 메인 스토리 1~30장 진행 규칙 — 방장 화면과 전용 서버가 같이 쓴다(rpgInput.js 의 story).
   진행은 가방 bag.sq 에 남는다. 가방은 저장 · 손님 전송(packBags)과 함께 간다. 단계 · 대사는 storyQuestData.js */
import {STORY_QUEST, STORY_STEPS, STORY_CLEAR_ID, STORY_CHAPTERS, STORY_TAGS, STORY_REV, STORY_TAG_MAX, TRUST_PEOPLE, TRUST_MIN, TRUST_MAX, OLD_STEP_CH,
  stepTargets, sceneOf, storyLineShown, addPick, chapterStart, partOf} from './storyQuestData.js';
import {MAPS, npcNear, fx, sys, runOf, stopMove} from './rpg.js';
import {trading} from './tradeData.js';

// 가방에서 읽은 진행 값을 고른다(shop.js cleanBag). 모르는 대상 · 꼬리표는 버린다.
// 옛 판(11월 6일 1부 34단계)의 진행은 같은 장의 처음으로 옮기고, 옛 꼬리표는 버린다(새 판과 뜻이 다르다)
export function cleanSq(d) {
  if (d && d.r !== STORY_REV && (Number(d.i) > 0 || d.c?.length)) {
    const old = Math.max(0, Math.floor(Number(d.i)) || 0);
    return {r: STORY_REV, i: chapterStart(old >= OLD_STEP_CH.length ? 7 : OLD_STEP_CH[old]), n: [], c: [], t: {}};
  }
  const i = Math.max(0, Math.min(STORY_STEPS.length, Math.floor(Number(d?.i)) || 0));
  const want = stepTargets(STORY_STEPS[i]);
  const n = Array.isArray(d?.n) ? [...new Set(d.n.filter((x) => want.includes(x)))] : [];
  const c = [];
  if (Array.isArray(d?.c)) d.c.forEach((x) => { if (STORY_TAGS.includes(x)) addPick({tag: x}, c, {}); });
  const t = {};
  TRUST_PEOPLE.forEach((k) => { const v = Math.round(Number(d?.t?.[k]) || 0); if (v) t[k] = Math.max(TRUST_MIN, Math.min(TRUST_MAX, v)); });
  return {r: STORY_REV, i, n, c: c.slice(0, STORY_TAG_MAX), t};
}

export const storyOpenFor = (h) => !!h && (STORY_QUEST.open || !!h.admin);
const sqOf = (h) => h?.bag?.sq || {r: STORY_REV, i: 0, n: [], c: [], t: {}};
export const storyStep = (h) => STORY_STEPS[sqOf(h).i] || null;   // null 이면 30장까지 다 마쳤다

// 지금 단계에서 이 대상과 이야기할 차례인지
export function storyTargetFor(h, id) {
  if (!storyOpenFor(h)) return null;
  const s = storyStep(h);
  if (!s || !stepTargets(s).includes(id) || sqOf(h).n.includes(id)) return null;
  return s;
}

// 화면에 보낼 진행 모습 — 퀘스트 창 · 위쪽 줄 · 머리 위 표시
export function storyView(h) {
  if (!storyOpenFor(h)) return null;
  const sq = sqOf(h), s = STORY_STEPS[sq.i];
  const total = STORY_STEPS.length;
  if (!s) return {done: true, i: total, total, chName: '네 갈래 방어선', c: sq.c || [], t: sq.t || {}};
  const t = stepTargets(s), part = partOf(s.ch);
  const chSteps = STORY_STEPS.filter((x) => x.ch === s.ch);
  return {
    i: sq.i, total, id: s.id, ch: s.ch, chName: STORY_CHAPTERS[s.ch], part: part.n, partName: part.name, q: s.q, goal: s.goal, where: s.where,
    map: s.map, mapName: MAPS[s.map]?.name || '', targets: t.filter((x) => !sq.n.includes(x)),
    got: sq.n.length, need: t.length > 1 ? t.length : 0, c: sq.c || [], t: sq.t || {},
    chAt: chSteps.findIndex((x) => x.id === s.id), chLen: chSteps.length,
    quests: [...new Set(chSteps.map((x) => x.q))].map((q) => ({q, done: STORY_STEPS.every((x, k) => x.q !== q || x.ch !== s.ch || k < sq.i)})),
    canGo: MAPS[s.map]?.story && h.map !== s.map, order: !!s.order, hidden: !!s.hidden,
    nextId: s.order ? s.need[sq.n.length] : null,
  };
}

/* 고른 대답 번호(picks)로 장면을 처음부터 따라가며 꼬리표 · 관계를 정한다 — 서버 권위.
   보이는 질문마다 번호 하나. 틀린 답 · 시간 초과는 다시 묻는 것이라 번호에 넣지 않는다. 맞지 않으면 null */
export function storyPicks(scene, picks, c0, t0) {
  const tags = [...c0], trust = {...t0};
  let j = 0;
  for (const l of scene) {
    if (!storyLineShown(l, tags, trust)) continue;
    if (!l.pick) continue;
    const k = picks[j++], p = Number.isInteger(k) ? l.pick[k] : null;
    if (!p || p.wrong) return null;
    addPick(p, tags, trust);
  }
  return j === picks.length ? {tags, trust} : null;
}

// 바쁠 때(결투 · 던전 · 레이스 · 거래)는 옮기지 않는다
const busy = (g, h) => trading(h) || (h.dvs ?? -1) >= 0 || !!runOf(g, h) || !!(MAPS[h.map] && (MAPS[h.map].dungeon || MAPS[h.map].pvp || MAPS[h.map].race));
function moveTo(h, to) {
  h.map = to; [h.x, h.y] = MAPS[to].spawn;
  h.hold = []; stopMove(h); h.dash = 0; h.gateCd = 1.5;
}

/* 입력 — {op:'done', id: 대상, step: 단계 id, picks: [고른 대답 번호]} · {op:'go'}(지금 단계의 이야기 맵으로 가기) */
export function rpgStory(g, pi, d) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !h.bag || !d || typeof d !== 'object' || !storyOpenFor(h)) return false;
  const sq = h.bag.sq || (h.bag.sq = {r: STORY_REV, i: 0, n: [], c: [], t: {}});
  sq.c = sq.c || []; sq.t = sq.t || {};
  const s = STORY_STEPS[sq.i];
  if (!s) return false;
  if (d.op === 'go') {
    if (!MAPS[s.map]?.story || h.map === s.map) return false;
    if (busy(g, h) || h.down > 0) return void sys(g, pi, '지금은 이야기 장소로 갈 수 없습니다.');
    moveTo(h, s.map);
    sys(g, pi, `${MAPS[s.map].name}(으)로 갔습니다.`);
    return true;
  }
  if (d.op !== 'done' || d.step !== s.id || h.down > 0) return false;
  const id = d.id;
  if (!stepTargets(s).includes(id) || sq.n.includes(id)) return false;
  if (npcNear(h)?.id !== id) return false;          // 그 대상 곁에서 대화를 마쳤을 때만
  if (s.order && id !== s.need[sq.n.length]) {        // 순서 퍼즐 — 틀리면 처음부터
    sq.n = []; h.bag.v += 1;
    fx(g, h.map, {kind: 'call', x: h.x, y: h.y - 110, text: '순서가 틀렸다', color: '#f0a890', t: 1.2, life: 1.2, who: pi});
    sys(g, pi, `${s.goal} — 순서가 틀려 처음부터 다시 합니다.`);
    return true;
  }
  const got = storyPicks(sceneOf(s, id), Array.isArray(d.picks) ? d.picks.slice(0, 16) : [], sq.c, sq.t);
  if (!got) return false;                             // 장면과 맞지 않는 대답 — 진행하지 않는다
  sq.c = got.tags; sq.t = got.trust;
  sq.n.push(id);
  const all = stepTargets(s).every((x) => sq.n.includes(x));
  if (all) { sq.i += 1; sq.n = []; }
  // 30-05 를 마쳤다 — 완결 기록. 칭호(socialData.js story30)는 다음 칭호 검사 때 알림과 함께 붙는다
  if (all && s.id === STORY_CLEAR_ID && h.rec) h.rec.story = 1;
  h.bag.v += 1;                                     // 가방이 바뀌었다 — 저장 · 손님 전송
  const next = STORY_STEPS[sq.i];
  const msg = !all ? `${s.goal} ${sq.n.length}/${stepTargets(s).length}` : s.end || `「${s.q}」 진행 · 다음: ${next ? next.goal : '메인 이야기 끝'}`;
  fx(g, h.map, {kind: 'call', x: h.x, y: h.y - 110, text: all ? (s.end ? '장 완료' : '이야기 진행') : '조사 완료', color: '#ffe08a', t: 1.2, life: 1.2, snd: 'build', who: pi});
  sys(g, pi, msg);
  if (all && s.go && MAPS[s.go] && !busy(g, h)) moveTo(h, s.go);
  return true;
}
