/* 메인 스토리 1~30장 진행 — 단계 · 대사 · 선택지. 규칙은 storyQuest.js, 대화 창은 VillagePanel.jsx.
   기준 문서: 사용자가 올린 「메인 스토리 1~30장 전면 개편 시나리오 v3.0」(11월 7일, 프로젝트 notes/메인스토리-1-30장-수정본-v3.md).
   문서의 장면(XX-01~04) 순서를 따르고, 대사는 문서 문장을 살려 단계에 맞게 줄였다. 실제 전투는 아직 없고 보스는 시간 제한 선택 대화로 치른다.
   단계는 부마다 storySteps1~5.js 에 있다.

   진행은 가방 bag.sq = {r: 이야기 판, i: 지금 단계 차례, n: 이 단계에서 끝낸 대상 id, c: 고른 꼬리표, t: 관계 수치}(shop.js cleanBag).
   단계 차례(STORY_STEPS 순서)는 저장 값이다. 이미 나간 단계 사이에 끼워 넣지 말고 뒤에만 더한다.
   판(STORY_REV)을 올리면 옛 진행은 같은 장의 처음으로 옮긴다(storyQuest.js cleanSq).

   대사 한 줄: {s: 말하는 사람, t: 대사} — storyLines.js 의 L · me · sys · nar · beat
     if / not — 이 꼬리표를 골랐을 때만(또는 안 골랐을 때만) 나오는 줄
     tr: {zero: 1} — 관계 수치가 이 값 이상일 때만(음수면 이 값 이하일 때만) 나오는 줄
   선택지: {pick: [{t: 내 대사, tag: 남길 꼬리표, tr: {인물: ±1}, then: [이어지는 줄]}]} — 갈래는 대사만 바꾸고 큰 줄기는 같다(막다른 길 없음).
     꼬리표에 쌍점이 있으면 장기 분기다('S1_RESCUE:supply'). 같은 이름(쌍점 앞)은 한 번만 확정되고 다시 고를 수 없다.
     관계 수치(tr)는 인물마다 -2~+2 로만 쌓인다. 대사 · 후일담만 바꾸고 진행을 막지 않는다.
     어떤 대답을 골랐는지는 서버가 장면을 다시 따라가며 정한다(storyQuest.js storyPicks). 화면은 고른 번호만 보낸다.
   단계: {id, ch, q: 퀘스트 이름, goal: 할 일, at: 말 걸 대상 id(또는 need: 여러 대상), map: 대상이 있는 맵, where: 길 안내,
          scene: 대사, scenes: {대상 id: 대사}(여러 대상일 때), go: 끝나면 옮겨 가는 맵, end: 장 끝 문구}

   기믹
     order: true  — need 를 적힌 차례대로 조사해야 한다. 틀리면 wrong 장면을 보고 처음부터 다시(서버가 되돌린다)
     hidden: true — 느낌표가 없다. 가까이(STORY_HIDDEN_R) 가야 반짝임이 보인다
     선택지 {t, wrong: true, then} — 틀린 답. then 을 본 뒤 같은 질문으로 돌아오고, 고른 답은 흐려진다
     질문 {pick, timer: 초, late: {t, then}} — 시간 안에 못 고르면 late 가 틀린 답처럼 나오고 다시 묻는다(보스 결전) */
import {STORY_MAPS} from './storyData.js';
import {STEPS_1} from './storySteps1.js';
import {STEPS_2} from './storySteps2.js';
import {STEPS_3} from './storySteps3.js';
import {STEPS_4} from './storySteps4.js';
import {STEPS_5} from './storySteps5.js';

// 열림 — 모두가 진행한다. false 면 관리자 캐릭터만 진행한다(대화 · 길 안내 · 이동 모두).
export const STORY_QUEST = {open: true};
export const STORY_HIDDEN_R = 260;   // 숨은 단서 — 이만큼 가까워야 반짝임이 보인다
export const STORY_REV = 2;          // 이야기 판 — 11월 7일 v3.0 전면 개편이 2
export const STORY_TAG_MAX = 80;     // 가방에 남기는 꼬리표 수 상한
export const TRUST_MIN = -2, TRUST_MAX = 2;   // 관계 수치 범위(문서 0.3)
export const TRUST_PEOPLE = ['mina', 'zero', 'sera', 'irion', 'kael', 'hangyeol'];

export const STORY_PARTS = [
  {n: 1, name: '깨어나는 기계들', from: 1, to: 6},
  {n: 2, name: '잊힌 문명', from: 7, to: 12},
  {n: 3, name: '무너지는 질서', from: 13, to: 18},
  {n: 4, name: '관측자의 세계', from: 19, to: 24},
  {n: 5, name: '최초의 명령', from: 25, to: 30},
];
export const partOf = (ch) => STORY_PARTS.find((p) => ch >= p.from && ch <= p.to) || STORY_PARTS[0];

export const STORY_CHAPTERS = {
  1: '사라진 수송대', 2: '버려진 연구소', 3: '네 개의 봉인', 4: '마지막 명령', 5: '끊어지지 않은 신호', 6: '이름 없는 연구원',
  7: '지하의 도시', 8: '기록되지 않은 역사', 9: '잊힌 수호자', 10: '두 번째 태양', 11: '금지된 기억', 12: '최초의 거짓말',
  13: '평화의 균열', 14: '무너진 동맹', 15: '기계들의 왕', 16: '적과의 약속', 17: '마지막 도시', 18: '부서진 왕관',
  19: '하늘에서 온 눈', 20: '관측 기록', 21: '존재하지 않는 땅', 22: '반복된 세계', 23: '선택된 오류', 24: '관측의 끝',
  25: '첫 번째 세계', 26: '네 갈래의 기원', 27: '마지막 동료', 28: '최초의 명령', 29: '지켜야 할 세계', 30: '네 갈래 방어선',
};

export const STORY_STEPS = [...STEPS_1, ...STEPS_2, ...STEPS_3, ...STEPS_4, ...STEPS_5];

export const STORY_STEP_BY_ID = Object.fromEntries(STORY_STEPS.map((s, i) => [s.id, {...s, i}]));
// 메인 이야기 완결 — 이 단계를 마치면 칭호 · 외형 효과 · 기념 기록서를 준다(문서 30-05). 30-06 은 덧붙임 장면이라 보상과 상관없다
export const STORY_CLEAR_ID = '30-05';
export const STORY_CLEAR_AT = STORY_STEP_BY_ID[STORY_CLEAR_ID].i + 1;
export const storyCleared = (sq) => (Number(sq?.i) || 0) >= STORY_CLEAR_AT && sq?.r === STORY_REV;
// 한 단계의 대상 — 하나(at) 또는 여럿(need)
export const stepTargets = (s) => (s ? s.need || [s.at] : []);
// 대상과 이야기할 때의 장면 — 순서 퍼즐 차례가 틀렸으면 wrong
export const sceneOf = (s, id, wrongOrder = false) => (wrongOrder ? s.wrong : s.scenes?.[id] || s.scene) || [];
const allLines = (s) => [s.scene || [], ...Object.values(s.scenes || {}), s.wrong || []].flat();
const picksOf = (s) => allLines(s).flatMap((l) => l.pick || []);
// 선택지 꼬리표 — 저장할 수 있는 값(storyQuest.js 가 이 밖의 값은 버린다)
export const STORY_TAGS = [...new Set(STORY_STEPS.flatMap(picksOf).map((p) => p.tag).filter(Boolean))];
export const flagKey = (tag) => (tag.includes(':') ? tag.slice(0, tag.indexOf(':')) : null);
// 장기 분기 값 — 'S1_RESCUE' → 'supply'(아직 안 골랐으면 null)
export const storyFlag = (c, key) => { const t = (c || []).find((x) => flagKey(x) === key); return t ? t.slice(key.length + 1) : null; };

/* 대사 한 줄이 보이는지 — 화면(VillagePanel)과 서버(storyQuest.js)가 같은 함수를 쓴다 */
export function storyLineShown(l, tags, trust) {
  if (l.if && !tags.includes(l.if)) return false;
  if (l.not && tags.includes(l.not)) return false;
  if (l.tr) for (const [k, v] of Object.entries(l.tr)) { const t = trust?.[k] || 0; if (v > 0 ? t < v : t > v) return false; }
  return true;
}
// 고른 대답을 꼬리표 · 관계에 더한다 — 같은 장기 분기는 한 번만, 관계는 -2~+2
export function addPick(p, tags, trust) {
  if (p.tag && !tags.includes(p.tag) && !(flagKey(p.tag) && tags.some((x) => flagKey(x) === flagKey(p.tag))) && tags.length < STORY_TAG_MAX) tags.push(p.tag);
  if (p.tr) for (const [k, v] of Object.entries(p.tr)) trust[k] = Math.max(TRUST_MIN, Math.min(TRUST_MAX, (trust[k] || 0) + v));
}

/* 옛 1부(11월 6일, 34단계) 진행을 새 판으로 옮길 때 — 옛 단계 차례마다 몇 장이었는지. 34 이상은 1부를 다 마친 것 */
export const OLD_STEP_CH = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6];
export const chapterStart = (ch) => { const k = STORY_STEPS.findIndex((s) => s.ch >= ch); return k < 0 ? STORY_STEPS.length : k; };

// 이야기 장소 문 — 그 장소가 처음 나오는 단계까지 진행했으면 열린다. 다 마쳤거나 관리자면 모두 열린다
export const STORY_FIRST = Object.fromEntries(STORY_MAPS.map((m) => [m.id, STORY_STEPS.findIndex((s) => s.map === m.id)]));
export function storyGateOpen(h, mapId) {
  if (!h || h.admin) return true;
  const first = STORY_FIRST[mapId];
  if (first === undefined || first < 0) return true;
  return (h.bag?.sq?.i || 0) >= first;
}
export const storyGateCh = (mapId) => STORY_STEPS[STORY_FIRST[mapId]]?.ch || STORY_MAPS.find((q) => q.id === mapId)?.ch || '';
export const storyGateWhy = (mapId) => {
  const m = STORY_MAPS.find((q) => q.id === mapId);
  return `${m ? m.name : '이곳'}은(는) 아직 갈 수 없습니다. 메인 이야기 ${storyGateCh(mapId)}장을 진행하면 열립니다.`;
};
