/* 메인 스토리 1~30장 맵과 인물. 1부(1~6장)는 11월 6일, 7~30장 맵 · 새 인물은 11월 7일 v3.0 개편 때 더했다(그림 없음 — 임시 도형). 그림은 11월 6일 Codex 정식 그림(public/assets/game/rpg/story/, 원본 design/story/).
   그림 파일이 없을 때만 코드로 그린 임시 도형을 쓴다(경로는 storyArtPath).
   여기 대사는 평소 소개 대화다. 이야기 진행 대사 · 선택지는 storyQuestData.js 에 있다.
   맵 · 인물 · 장소 id 는 이후 이야기 진행에서도 그대로 쓴다. 기준 문서: docs/메인스토리-1부-맵.md */

// 그림 규격 — 마을과 같다. 512×512 투명 WebP, 발 기준 (256,496). 맵 바닥은 ground/<맵 id>.webp 한 장(맵 크기 그대로).
import {STORY_SIGHT_SIZE} from './storySizes.js';
import {decorFor} from './storyDecor.js';
export const STORY_ART = {base: '/assets/game/rpg/story/', size: 512, feet: [256, 496], npcSize: 86};
export const storyArtPath = (kind, id) => `${STORY_ART.base}${kind}/${id}.webp`;   // kind: people · portraits · places · ground

/* 인물 — 그림 파일 이름은 id. look 은 그림이 없을 때 쓰는 임시 색과 소품. */
export const STORY_PEOPLE = {
  hangyeol: {name: '한결', role: '에르덴 경비대장', look: {body: '#7d8a99', trim: '#5b6573', hair: '#3a332d', skin: '#e6c6a2', mark: 'sword'}},
  mina: {name: '미나', role: '약사 겸 기계 해석가', look: {body: '#9bb39a', trim: '#6f8a72', hair: '#8a5a3c', skin: '#efd2b4', mark: 'goggles'}},
  bori: {name: '보리', role: '수집가', look: {body: '#b49364', trim: '#86683f', hair: '#5b4430', skin: '#e9c9a5', mark: 'hat'}},
  sera: {name: '세라', role: '수송대 생존자', look: {body: '#b98a86', trim: '#8a625f', hair: '#4a3a34', skin: '#ecccae', mark: 'bandage'}},
  zero: {name: '제로', role: '최초의 실험체', look: {body: '#8c949c', trim: '#5f666e', hair: '#6c737a', skin: '#a9b1b8', mark: 'eye'}},
  arka: {name: '아르카', role: '중앙 방어 관리자 · 투영', look: {body: '#9fd0d8', trim: '#6aa3ad', hair: '#c9eef2', skin: '#d8f3f5', mark: 'holo'}},
  irion: {name: '이리온', role: '고대 기록 해석자', look: {body: '#7a6a8c', trim: '#55486a', hair: '#d8d0c0', skin: '#e3c7a8', mark: 'hood'}},
  // 11월 7일 v3.0 — 그림이 아직 없어 임시 인형으로 그린다
  lia: {name: '리아', role: '에르덴의 아이', look: {body: '#c9a98a', trim: '#9a7a5e', hair: '#5a3e2c', skin: '#f0d4b6', mark: 'clock'}},
  doyun: {name: '도윤', role: '수송대원 · 리아의 아버지', look: {body: '#8d7d64', trim: '#6a5c48', hair: '#3e3428', skin: '#e2c09e', mark: 'scarf'}},
  levan: {name: '레반', role: '인간 연합 지휘관', look: {body: '#7c7a6e', trim: '#57554b', hair: '#4a4a46', skin: '#dcbc9c', mark: 'sword'}},
  kael: {name: '카엘', role: '자율 기계 지도자', look: {body: '#8e98a4', trim: '#626c78', hair: '#b8c2cc', skin: '#c3ccd4', mark: 'eye'}},
  serin: {name: '세린', role: '최초 설계자 · 기록 투영', look: {body: '#b8d6dc', trim: '#86aab2', hair: '#e6f2f2', skin: '#e4f2f4', mark: 'holo'}},
  observer: {name: '공허의 관측자', role: '관측 장치', look: {body: '#6e6a96', trim: '#4c4870', hair: '#9a96c8', skin: '#a8a4d4', mark: 'eye'}},
};

/* 맵 — 모두 싸울 수 없는 안전 지역이다. 몹 · 보스는 이야기 진행을 만들 때 더한다.
   ground: 바탕 · 얼룩 · 길 색. roads: 길 중심선. pads: 바닥 원(광장 · 전투 자리 표시).
   exit: 에르덴 마을로 돌아가는 문(문 앞이 spawn). links: 다른 이야기 맵으로 가는 문. */
// k — 그림 크기 배수(11월 6일: 서쪽 중력 시설이 작다는 요청으로 1.45). 위치는 그대로, 크기와 막힌 반지름만 곱한다
const RUIN = (id, name, dir, tone, device, k = 1) => ({
  id, name, ch: 3, w: 2200, h: 1400, spawn: [1100, 1220], exit: {x: 1100, y: 1340, r: 54},
  ground: tone, roads: [{w: 120, pts: [[1100, 1360], [1100, 960], [1100, 700]]}],
  pads: [{x: 1100, y: 640, rx: 300, ry: 150}],
  buildings: [
    {id: `${id}-hall`, name: `${dir}쪽 유적 전당`, x: 560, y: 720, size: 300 * k, look: 'ruin'},
    {id: `${id}-gate`, name: '무너진 관문', x: 1640, y: 720, size: 300 * k, look: 'ruin'},
  ],
  sights: [
    {id: `${id}-device`, name: device, role: `${dir}쪽 봉인 장치`, x: 1100, y: 620, size: 200 * k, r: 50 * k, look: 'device',
      intro: `${device}가 낮게 울리고 있습니다.`, lines: ['장치 둘레에 서로 다른 기호가 새겨져 있습니다.', '아직은 만질 수 없습니다. 이야기 진행이 열리면 조작합니다.']},
  ],
  props: [[380, 1050], [1820, 1050], [700, 420], [1500, 420]].map(([x, y]) => ({look: 'pillar', x, y, size: 120 * k, r: 22 * k})),
  npcs: [],
});

/* 7~30장 맵(11월 7일) — 그림이 없어 임시 도형으로 그린다. 들어갈 것(items)을 격자 칸에 차례로 놓는다.
   item: [id, 이름, 역할, look, 첫 대사, 둘째 대사] 또는 {id, who: 인물 id, ...}(사람). 칸은 가운데 길(x = w/2)을 비워 둔다 */
const SLOTS = (w, h, nc, nr) => {
  const out = [];
  for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++)
    out.push([Math.round(w * (.14 + .72 * c / (nc - 1))), Math.round(h * (.2 + .52 * r / (nr - 1)))]);
  return out;
};
const SMALL = new Set(['paper', 'person', 'stone']);
const PLACE = (id, name, ch, big, ground, items) => {
  const [w, h, nc, nr] = big ? [3200, 2000, 6, 4] : [2600, 1700, 4, 3];
  const slots = SLOTS(w, h, nc, nr), sights = [], npcs = [];
  items.forEach((it, k) => {
    const [x, y] = slots[k];
    if (!Array.isArray(it)) { npcs.push({x, y, ...it}); return; }
    const [sid, nm, role, look, intro, line2] = it, small = SMALL.has(look);
    sights.push({id: sid, name: nm, role, x, y, size: small ? 100 : look === 'giant' ? 260 : 150, r: small ? 22 : look === 'giant' ? 56 : 34,
      look: look === 'giant' ? 'robot' : look, intro, lines: [line2]});
  });
  return {id, name, ch, w, h, spawn: [w / 2, h - 180], exit: {x: w / 2, y: h - 60, r: 54}, ground,
    roads: [{w: 120, pts: [[w / 2, h], [w / 2, h * .5], [w / 2, h * .12]]}, {w: 90, pts: [[w * .1, h * .47], [w * .9, h * .47]]}],
    pads: [], buildings: [], sights, props: [], npcs};
};
const G = (base, road, edge, tile) => ({base, spot: ['rgba(230,230,255,.06)', 'rgba(10,10,20,.10)'], road, edge, tile});
const STORY_MAPS_2 = [
  PLACE('lumen', '지하 도시 루멘', 7, false, G('#4c5566', '#7d8899', '#3e4656', 1), [
    ['lumen-lamp', '꺼지지 않은 거리등', '7장 · 불빛이 살아 있는 폐허', 'pylon', '오래된 거리등이 아직 켜져 있습니다.', '빈집 수백 채가 불빛 아래 늘어서 있습니다.'],
    ['lumen-house', '식탁 위 세 잔', '7장 · 어느 집의 식탁', 'desk', '식탁에 오래된 찻잔 세 개가 놓여 있습니다.', '벽에 아이 키를 잰 눈금이 있습니다.'],
    ['lumen-ledger', '도시 행정 기록판', '7장 · 도시 전체의 기록', 'terminal', '행정 기록판이 희미하게 깜박입니다.', '주민 수가 하루아침에 0이 되어 있습니다.'],
    ['lumen-ghost', '시민 잔상', '7장 · 건드리면 무너지는 기억', 'person', '반투명한 시민이 같은 길을 되풀이해 걷습니다.', '말을 걸어도 대답하지 않습니다.'],
    ['lumen-hall', '보존 홀 투영', '7장 · 도시의 마지막 날', 'screen', '거대한 투영이 보존 홀 벽을 채웁니다.', '하늘에서 보랏빛이 떨어지는 장면입니다.'],
    ['lumen-giant', '서 있는 거인', '9장 · 루멘의 수호자', 'giant', '거대한 수호자가 아이를 가린 자세로 멈춰 있습니다.', '방패에 흠집이 수백 개 나 있습니다.'],
    ['lumen-part-1', '동력 부품', '9장 · 수호자의 부품', 'device', '수호자에게 맞는 동력 부품입니다.', '아직 따뜻합니다.'],
    ['lumen-part-2', '동력 부품', '9장 · 수호자의 부품', 'device', '부서진 장벽 틈의 동력 부품입니다.', '수호자의 문양이 새겨져 있습니다.'],
    ['lumen-eraser', '소거자', '9장 · 고대 방위 병기', 'robot', '얼굴 없는 병기가 장벽 앞에 서 있습니다.', '손끝이 지우개처럼 빛납니다.'],
  ]),
  PLACE('lumen-library', '루멘 대도서관', 8, true, G('#5e5446', '#8c7c64', '#4a4136', 1), [
    ['lib-chronicle', '두 개의 연대기', '8장 · 인간과 루멘의 역사', 'shelf', '인간 연대표와 루멘 기록이 나란히 꽂혀 있습니다.', '같은 사건이 서로 다르게 적혀 있습니다.'],
    ['lib-sealed', '봉인된 문서', '8장 · 도시 붕괴 방지 기술', 'paper', '‘도시 붕괴 방지 기술’이라고 적힌 문서입니다.', '봉인이 반쯤 풀려 있습니다.'],
    ['lib-censor', '검열 서기관', '8장 · 기록을 지우는 기계', 'robot', '서기관 기계가 책장을 한 장씩 비웁니다.', '공격하지 않고 지우기만 합니다.'],
    ['lib-memory-1', '과거 관리자 기록', '11장 · 첫 번째 기록', 'screen', '오래된 관리자 기록이 재생을 기다립니다.', '얼굴은 흐릿합니다.'],
    ['lib-memory-2', '과거 관리자 기록', '11장 · 두 번째 기록', 'screen', '두 번째 관리자 기록입니다.', '손목에 무언가 빛납니다.'],
    ['lib-memory-3', '과거 관리자 기록', '11장 · 세 번째 기록', 'screen', '마지막 관리자 기록입니다.', '푸른 문양이 또렷합니다.'],
    ['lib-replay', '기억 재생 장치', '11장 · 두 개의 버튼', 'device', '버튼 두 개가 달린 재생 장치입니다.', '대피와 봉인이라고 적혀 있습니다.'],
    ['lib-verdict', '비어 있는 판결문', '12장 · 재난 책임자 명단', 'banner', '거대한 판에 책임자 이름이 적혀 있습니다.', '인간 감독관 칸만 찢겨 있습니다.'],
    ['lib-ev-1', '발포 명령서', '12장 · 첫 번째 증거', 'paper', '인간 관리자의 발포 명령서입니다.', '서명이 남아 있습니다.'],
    ['lib-ev-2', '대피 기록', '12장 · 두 번째 증거', 'terminal', '수호자들의 대피 기록입니다.', '구한 사람 수가 적혀 있습니다.'],
    ['lib-ev-3', '관측 이상 로그', '12장 · 세 번째 증거', 'terminal', '관측 장치의 이상 로그입니다.', '보랏빛 파형이 기록되어 있습니다.'],
    ['lib-deleter', '삭제 명령자', '12장 · 추적형 기계', 'robot', '자료를 순서대로 지우는 기계입니다.', '눈이 없습니다.'],
    ['lib-festival', '오래된 축제 화면', '12장 · 마지막 보존 화면', 'screen', '인간과 기계가 함께 현수막을 든 화면입니다.', '‘네 갈래, 하나의 도시’라고 적혀 있습니다.'],
  ]),
  PLACE('lumen-observatory', '루멘 천문대', 10, false, G('#3f4762', '#6f7899', '#323a52'), [
    ['obs-sphere', '천문대 구체', '10장 · 두 개의 빛', 'core', '구체 속에 태양 두 개가 겹쳐 떠 있습니다.', '하나는 거대한 빛의 고리입니다.'],
    ['obs-arka', '아르카의 잔류 기록', '10장 · 남겨진 목소리', 'terminal', '아르카의 문양이 새겨진 단말입니다.', '오래된 경고가 저장되어 있습니다.'],
    ['obs-bridge-1', '무너지는 다리 · 왼쪽', '10장 · 재난 시뮬레이션', 'person', '투영 속 다리 위에 사람이 서 있습니다.', '다리가 흔들립니다.'],
    ['obs-bridge-2', '무너지는 다리 · 오른쪽', '10장 · 재난 시뮬레이션', 'person', '다리 반대편에도 사람이 있습니다.', '손을 흔들고 있습니다.'],
    ['obs-eye', '두 번째 태양의 눈', '10장 · 유리 너머의 눈', 'eye', '투영의 빛 고리 한가운데입니다.', '눈동자 같은 문양이 보였다 사라집니다.'],
  ]),
  PLACE('leon', '접경도시 레온', 13, true, G('#7e7766', '#a89e86', '#665f50'), [
    {id: 'levan-leon', who: 'levan', intro: '제가 원하는 건 단순합니다. 내일 도시가 불타지 않는 것.', lines: ['병사들이 먼저 쉬어야 합니다.', '말보다 결과를 보여 주십시오.']},
    ['leon-child', '넘어진 아이', '13장 · 다툼 한가운데', 'person', '다투는 어른들 사이에 아이가 넘어져 있습니다.', '울음을 참고 있습니다.'],
    ['leon-bomb', '폭발물', '13장 · 첫 번째 폭발', 'device', '광장 한복판에 금속 부품이 달린 폭발물이 있습니다.', '기계 세력의 표식이 그려져 있습니다.'],
    ['leon-citizen-1', '겁먹은 상인', '13장 · 설득할 시민', 'person', '상인이 가게 문을 걸어 잠갔습니다.', '기계라면 질색이라고 합니다.'],
    ['leon-citizen-2', '부상병', '13장 · 설득할 시민', 'person', '붕대를 감은 병사가 앉아 있습니다.', '기계에게 다친 적이 있습니다.'],
    ['leon-citizen-3', '기계에게 구조된 노인', '13장 · 설득할 시민', 'person', '노인이 기계 병사의 부품을 쥐고 있습니다.', '목숨을 빚졌다고 합니다.'],
    ['leon-bell', '레온 종루', '17장 · 여섯 번의 경보', 'bell', '높은 종루입니다.', '경보종이 매달려 있습니다.'],
    ['leon-front', '세 전선 지휘대', '17장 · 어디를 먼저 도울까', 'terminal', '의료소 · 보급창고 · 대피 다리 상황이 지도에 표시됩니다.', '세 곳 모두 붉게 깜박입니다.'],
    ['leon-refugees', '다리 위 피난민', '17장 · 전장이 되는 길', 'person', '피난민 행렬이 다리를 건넙니다.', '아이들이 섞여 있습니다.'],
    ['leon-bearer', '총공세의 기수', '17장 · 성벽 보스', 'giant', '거대한 기수가 성벽 너머에서 깃발을 듭니다.', '네 위치의 발전기가 기수와 이어져 있습니다.'],
    ['leon-victory', '무너진 성문', '17장 · 승리의 빈자리', 'banner', '무너진 성문 앞에 승리의 깃발이 꽂혀 있습니다.', '뒤편 대피소는 조용합니다.'],
  ]),
  PLACE('leon-hall', '레온 회담장', 14, true, G('#6e6152', '#9b8a72', '#574b3f', 1), [
    {id: 'irion-hall', who: 'irion', intro: '회담은 내일입니다. 오늘은 조용하군요.', lines: ['작은 그림을 접었다 폈다 합니다.', '말하면 사라질까 봐 두렵다고 합니다.']},
    ['hall-gate', '출입 통제 시스템', '14장 · 잘못된 열쇠', 'terminal', '회담장 출입 통제 장치입니다.', '고장 나 문이 열리지 않습니다.'],
    ['hall-secret', '비밀 문', '14장 · 열린 문', 'door', '벽 뒤에 숨겨진 문입니다.', '관측 장치로 선이 이어져 있습니다.'],
    ['hall-raid', '자율 도용 장치', '14장 · 습격', 'robot', '누구의 것도 아닌 기계가 회담장에 들어왔습니다.', '표식이 지워져 있습니다.'],
    ['hall-crowd', '부서진 기계 손을 든 아이', '18장 · 영웅을 원하는 군중', 'person', '아이가 부서진 기계 손을 꼭 쥐고 있습니다.', '어디에 묻어야 하는지 묻습니다.'],
    ['hall-council', '회의장 연단', '18장 · 질서를 위한 왕관', 'desk', '회의장 연단입니다.', '법안 문서가 놓여 있습니다.'],
    ['hall-dev-1', '전쟁 장치 · 발화부', '18장 · 재조립할 장치', 'device', '타 버린 발화 장치입니다.', '발화 시각이 새겨져 있습니다.'],
    ['hall-dev-2', '전쟁 장치 · 통신부', '18장 · 재조립할 장치', 'device', '통신 회선이 남은 부품입니다.', '두 갈래 선이 보입니다.'],
    ['hall-dev-3', '전쟁 장치 · 명령부', '18장 · 재조립할 장치', 'device', '명령 시각이 기록된 부품입니다.', '서명 칸이 둘입니다.'],
    ['hall-screen', '중앙 스크린', '18장 · 증거 너머의 손', 'screen', '회의장 중앙의 큰 스크린입니다.', '아직 꺼져 있습니다.'],
    ['hall-mourner', '목걸이를 든 주민', '18장 · 찾지 못한 사람', 'person', '주민이 실종자의 목걸이를 들고 서 있습니다.', '누군가를 기다립니다.'],
  ]),
  PLACE('karha', '기계 도시 카르하', 15, false, G('#5b6068', '#878e98', '#4a4f57', 1), [
    {id: 'kael-karha', who: 'kael', intro: '인간은 보통 총을 들고 옵니다.', lines: ['이곳은 쇠로 만든 집입니다.', '왕이라는 이름은 싫습니다.']},
    ['karha-power', '전력 복구 장치', '15장 · 왕의 고백', 'device', '도시 전력이 끊긴 장치입니다.', '주변에 무방비한 주민이 있습니다.'],
    ['karha-guild', '기계 상인 길드 장부', '15장 · 가짜 국경선', 'desk', '상인 길드의 장부입니다.', '허위 문서가 섞여 있습니다.'],
    ['karha-forger', '위조 집행자', '15장 · 추격', 'robot', '문서를 위조하는 기계가 달아나려 합니다.', '손에 인장을 쥐고 있습니다.'],
    ['karha-hands', '협정 자리', '15장 · 첫 악수', 'banner', '두 진영의 깃발이 나란히 걸린 자리입니다.', '아직 아무도 서 있지 않습니다.'],
  ]),
  PLACE('bridge', '레온-카르하 경계 다리', 16, false, G('#5f7a7f', '#9a8f7a', '#4c6266'), [
    ['bridge-marker', '공동 경계표', '16장 · 한 다리 두 경비대', 'pillar', '세우다 만 경계표가 누워 있습니다.', '삽 두 자루가 놓여 있습니다.'],
    ['bridge-crew', '수리 병력', '16장 · 호위할 사람들', 'person', '인간과 기계 수리공이 함께 서 있습니다.', '서로 눈을 마주치지 않습니다.'],
    ['bridge-breaker', '경계 파괴자', '16장 · 협동 보스', 'giant', '다리를 무너뜨리려는 거대한 기계입니다.', '양쪽에서 동시에 쳐야 합니다.'],
    ['bridge-letter', '이리온의 경고', '16장 · 말하지 못했던 이름', 'paper', '봉인된 편지가 놓여 있습니다.', '이리온의 글씨입니다.'],
    ['bridge-shadow', '다리 아래 그림자', '16장 · 소리 없는 움직임', 'eye', '다리 아래 그림자가 혼자 움직입니다.', '빛이 없는데도 그림자가 있습니다.'],
  ]),
  PLACE('erden-sky', '에르덴 북쪽 언덕', 19, false, G('#6d7a8c', '#9aa6b5', '#58637a'), [
    ['sky-field-1', '비정상 중력장', '19장 · 첫 번째 중력장', 'device', '돌멩이가 거꾸로 떠오릅니다.', '그림자가 태양 쪽으로 기웁니다.'],
    ['sky-field-2', '비정상 중력장', '19장 · 두 번째 중력장', 'device', '물방울이 공중에 멈춰 있습니다.', '창문에 눈 모양 자국이 비칩니다.'],
    ['sky-field-3', '비정상 중력장', '19장 · 세 번째 중력장', 'device', '나뭇잎이 위로 떨어집니다.', '소리가 늦게 들립니다.'],
    ['sky-eye', '하늘의 눈', '19장 · 공허의 관측자', 'eye', '하늘 한가운데 거대한 눈이 열려 있습니다.', '나를 보고 있습니다.'],
    ['sky-logs', '관측 로그 단말', '20장 · 가장 작은 오차', 'terminal', '관측자가 남긴 로그를 띄운 단말입니다.', '내 이름이 변수로 적혀 있습니다.'],
    ['sky-room', '임시 통제실', '20장 · 기록을 지우는 사람', 'screen', '마을 사람들 이름이 화면에 흐릅니다.', '지워도 다시 생깁니다.'],
    ['sky-collector', '기록 수집체', '20장 · 정보 도주전', 'robot', '데이터 저장 장치를 품은 기계입니다.', '달아날 준비를 합니다.'],
  ]),
  PLACE('nameless-sea', '무명해역', 21, true, G('#4f7486', '#a39a86', '#3f5d6b'), [
    {id: 'irion-sea', who: 'irion', intro: '좌표가 있다는 사실만으로도 이곳은 위험해집니다.', lines: ['저는 이곳을 알고 있었습니다.', '말하지 못한 것이 많습니다.']},
    ['sea-road', '바다 위 도로', '21장 · 바다 위에 서 있는 길', 'stone', '바다 위로 낡은 돌길이 이어집니다.', '새 소리가 들리지 않습니다.'],
    ['sea-family', '부두의 가족', '21장 · 빈 도시의 주민', 'person', '비어 있는 줄 알았던 부두에 가족이 있습니다.', '돌아갈 길이 없었다고 합니다.'],
    ['sea-fixer', '위치 보정 장치', '21장 · 삭제된 해안선', 'device', '파도 사이에 거대한 장치가 서 있습니다.', '지도에서 땅을 지우는 장치입니다.'],
    ['sea-eraser', '해안의 소거병', '21장 · 해안 보스', 'robot', '해안선을 지우는 병기입니다.', '파도와 함께 움직입니다.'],
    ['sea-door', '수면 아래 문', '21장 · 첫 번째 문', 'door', '수면 아래에 둥근 문이 보입니다.', '네 갈래 고리가 문을 둘렀습니다.'],
    ['sea-alley', '같은 골목', '22장 · 같은 거리, 다른 날씨', 'banner', '에르덴과 똑같은 골목이 두 번 나타납니다.', '아이들 목소리도 비슷합니다.'],
    ['sea-voice-1', '주민 음성 기록', '22장 · 이름이 남은 도시', 'device', '오래된 음성 기록입니다.', '이름을 부르는 목소리입니다.'],
    ['sea-voice-2', '주민 음성 기록', '22장 · 이름이 남은 도시', 'device', '두 번째 음성 기록입니다.', '웃음소리가 섞여 있습니다.'],
    ['sea-diary', '끊긴 일기', '22장 · 아이의 일기', 'paper', '아이의 일기가 중간에서 끊겨 있습니다.', '지도에 동그라미가 그려져 있습니다.'],
    ['sea-cycle', '주기 복원 장치', '22장 · 새로운 주기를 거부하다', 'core', '거대한 복원 장치가 스스로 켜지려 합니다.', '재구성의 집행자가 지키고 있습니다.'],
  ]),
  PLACE('registry', '임시 관리자 등록소', 23, false, G('#55606f', '#8592a3', '#444e5c', 1), [
    ['reg-terminal', '둥근 제어 터미널', '23장 · 신이 아닌 사용자', 'terminal', '둥근 터미널이 손목을 비춥니다.', '첫날 북문 영상이 저장되어 있습니다.'],
    ['reg-key-1', '소유자 기록 조각', '23장 · 지워진 소유자', 'paper', '‘OWNER’라고 적힌 조각입니다.', '나머지가 지워져 있습니다.'],
    ['reg-key-2', '소유자 기록 조각', '23장 · 지워진 소유자', 'paper', '‘REVOKED’라고 적힌 조각입니다.', '누군가 일부러 남겼습니다.'],
    ['reg-key-3', '소유자 기록 조각', '23장 · 지워진 소유자', 'paper', '‘SHARED_AUTHORITY_PENDING’이라고 적힌 조각입니다.', '완성되지 못한 문장입니다.'],
    ['reg-offer', '단일 조작권', '23장 · 권한의 대가', 'core', '세계를 한 번에 안정시킨다는 장치입니다.', '하나의 의지, 하나의 명령.'],
    ['reg-door', '작은 문', '23장 · 다른 사람이 할 수 있다', 'door', '작은 통제 문입니다.', '권한을 나눌 수 있습니다.'],
  ]),
  PLACE('observer-deck', '관측 관제층', 24, false, G('#4a4660', '#7b7699', '#3a364e', 1), [
    {id: 'observer-eye', who: 'observer', intro: '관측 중입니다.', lines: ['기록은 보존됩니다.', '당신의 선택을 보고 있습니다.']},
    ['deck-scores', '위험 점수 화면', '24장 · 셀 수 있는 사람들', 'screen', '시민들 얼굴 위에 숫자가 떠 있습니다.', '리아의 얼굴도 있습니다.'],
    ['deck-route', '역관측 경로', '24장 · 역관측', 'device', '관측자의 시야로 이어지는 경로입니다.', '여러 도시의 위기가 동시에 보입니다.'],
    ['deck-records', '세 개의 기록', '24장 · 거울의 반전', 'screen', '같은 상황의 기록 세 개가 나란히 떠 있습니다.', '시간 순서만 지워졌습니다.'],
    ['deck-towers', '네 통신탑', '24장 · 경로를 끊거나 추적하거나', 'pylon', '네 통신탑이 동기화를 기다립니다.', '90초 안에 막아야 합니다.'],
    ['deck-core', '관측자 중추', '30장 · 네 갈래의 응답', 'core', '관측자의 중추입니다.', '단일 권한 요청 창이 떠 있습니다.'],
  ]),
  PLACE('first-plaza', '첫 번째 세계의 원형 광장', 25, false, G('#7a6f5c', '#a89a7e', '#62584a'), [
    {id: 'levan-plaza', who: 'levan', intro: '이번엔 증언하러 왔습니다.', lines: ['지휘관이 아니라 시민으로요.', '제 명령의 결과를 말해야 합니다.']},
    {id: 'kael-plaza', who: 'kael', intro: '우리도 증언하겠습니다.', lines: ['복수할 수도 있었습니다.', '하지만 그러지 않기로 했습니다.']},
    ['plaza-wall', '이름의 벽', '25장 · 모든 사람의 기록관', 'banner', '벽 하나에 이름 수만 개가 같은 크기로 새겨져 있습니다.', '왕의 이름도 아이의 이름도 같은 크기입니다.'],
    ['plaza-tag-1', '잊힌 이름표', '25장 · 북쪽 구역', 'paper', '바닥에 떨어진 이름표입니다.', '먼지에 덮여 있습니다.'],
    ['plaza-tag-2', '잊힌 이름표', '25장 · 동쪽 구역', 'paper', '돌 틈에 낀 이름표입니다.', '글자가 반쯤 지워졌습니다.'],
    ['plaza-tag-3', '잊힌 이름표', '25장 · 남쪽 구역', 'paper', '꽃병 아래 깔린 이름표입니다.', '아이 이름입니다.'],
    ['plaza-night', '재난의 밤 기록', '25장 · 원래 재난의 밤', 'device', '첫 번째 세계의 마지막 밤을 담은 장치입니다.', '누군가의 시점으로 볼 수 있습니다.'],
  ]),
  PLACE('boundary-room', '중앙 경계 설계실', 26, true, G('#5a5a6a', '#8a8aa0', '#484858', 1), [
    {id: 'serin-boundary', who: 'serin', intro: '…기록을 재생합니다.', lines: ['이 투영은 기록입니다.', '질문에 답하지 못할 수도 있습니다.']},
    {id: 'irion-boundary', who: 'irion', intro: '돌려드릴 것이 있습니다.', lines: ['손에 낡은 기록 묶음을 들고 있습니다.', '눈을 피하지 않습니다.']},
    {id: 'zero-memory', who: 'zero', role: '기억실 앞의 제로', intro: '이 방이 나를 부르는 것 같아.', lines: ['들어가기가 무섭다.', '그래도 알고 싶다.']},
    ['br-mural', '네 갈래 벽화', '26장 · 네 방향보다 오래된 네 약속', 'banner', '중앙의 원과 네 갈래 선을 그린 벽화입니다.', '선마다 문장이 적혀 있습니다.'],
    ['br-warn', '경고의 방', '26장 · 네 공동체의 계약', 'device', '위협을 먼저 알리는 방입니다.', '판단을 빼앗지 않는다고 적혀 있습니다.'],
    ['br-rescue', '구조의 방', '26장 · 네 공동체의 계약', 'device', '대피로를 여는 방입니다.', '남은 사람도 기록한다고 적혀 있습니다.'],
    ['br-defend', '방어의 방', '26장 · 네 공동체의 계약', 'device', '접근을 막는 방입니다.', '존재를 지우지 않는다고 적혀 있습니다.'],
    ['br-record', '기록의 방', '26장 · 네 공동체의 계약', 'device', '명령과 반론을 남기는 방입니다.', '오류를 숨기지 않는다고 적혀 있습니다.'],
    ['br-center', '중앙의 원', '26장 · 다섯 번째 선은 없다', 'core', '네 갈래가 만나는 원입니다.', '누를 수 있을 것 같습니다.'],
    ['br-memory', '기억 복원 장치', '27장 · 기억 복원의 비용', 'screen', '제로의 기억을 되살리는 장치입니다.', '덮어쓰기 경고가 떠 있습니다.'],
    ['br-table', '사라진 첫 문장', '28장 · 세린의 설계실', 'desk', '반쯤 지워진 문장이 새겨진 탁자입니다.', '‘누구도 혼자 세계를 지키지…’'],
    ['br-frag-1', '기록 파편', '28장 · 첫 번째 파편', 'paper', '세린의 기록 파편입니다.', '날짜가 적혀 있습니다.'],
    ['br-frag-2', '기록 파편', '28장 · 두 번째 파편', 'paper', '세린의 기록 파편입니다.', '날짜가 적혀 있습니다.'],
    ['br-frag-3', '기록 파편', '28장 · 세 번째 파편', 'paper', '세린의 기록 파편입니다.', '날짜가 적혀 있습니다.'],
    ['br-frag-4', '기록 파편', '28장 · 네 번째 파편', 'paper', '세린의 기록 파편입니다.', '날짜가 적혀 있습니다.'],
    ['br-blank', '빈 도면', '28장 · 설계자가 남긴 빈칸', 'desk', '중앙 제어칸이 비어 있는 마지막 도면입니다.', '이름을 쓰지 않았습니다.'],
    ['br-alarm', '네 도시의 경보', '29장 · 네 곳의 경고', 'bell', '네 도시의 경보가 한꺼번에 울립니다.', '관측자의 복구 명령이 퍼집니다.'],
    ['br-council', '네 대표의 승인대', '29장 · 어떤 방식으로 나눌 것인가', 'terminal', '네 대표가 권한을 나눌 승인대입니다.', '자리가 넷입니다.'],
    ['br-link', '관측자 연결 장치', '29장 · 최종 전투의 시작', 'core', '관측자 중추로 이어지는 장치입니다.', '네 역할이 모두 필요합니다.'],
  ]),
];

const STORY_MAPS_RAW = [
  {id: 'convoy', name: '북쪽 수송로', ch: 1, w: 2400, h: 1500, spawn: [1200, 1320], exit: {x: 1200, y: 1440, r: 54},
    ground: {base: '#6f8a55', spot: ['rgba(230,226,170,.08)', 'rgba(40,64,32,.07)'], road: '#a98f68', edge: '#7a6648'},
    roads: [{w: 110, pts: [[1200, 1460], [1180, 1100], [1300, 800], [1220, 500], [1200, 300]]}],
    pads: [{x: 1200, y: 400, rx: 260, ry: 120}],
    buildings: [],
    sights: [
      {id: 'convoy-wagon-1', name: '전복된 마차', role: '첫 번째 마차', x: 900, y: 1060, size: 190, r: 46, look: 'wagon',
        intro: '마차가 옆으로 넘어져 있습니다. 곡식 자루는 그대로입니다.', lines: ['바퀴 자국이 같은 간격으로 이어집니다.', '쇠 상자를 묶었던 끈만 끊겨 있습니다.']},
      {id: 'convoy-wagon-2', name: '전복된 마차', role: '두 번째 마차', x: 1560, y: 820, size: 190, r: 46, look: 'wagon',
        intro: '두 번째 마차입니다. 짐은 흩어지지 않았습니다.', lines: ['발자국이 모두 북쪽을 향합니다.', '무언가 쇠 상자만 골라 가져갔습니다.']},
      {id: 'convoy-wagon-3', name: '전복된 마차', role: '세 번째 마차', x: 860, y: 600, size: 190, r: 46, look: 'wagon',
        intro: '마지막 마차입니다. 바닥에 푸른 부스러기가 떨어져 있습니다.', lines: ['부스러기는 금속처럼 단단합니다.', '미나에게 보여 주면 알 수 있을지도 모릅니다.']},
      {id: 'convoy-guard', name: '멈춘 수송대 호위병', role: '1장 보스 자리', x: 1200, y: 380, size: 200, r: 48, look: 'robot',
        intro: '호위용 기계 병사가 길 끝에 멈춰 서 있습니다.', lines: ['가슴에 낯선 장치가 붙어 있습니다.', '핵이 아직 따뜻합니다.']},
    ],
    props: [[1520, 560], [700, 860], [1700, 1150]].map(([x, y]) => ({look: 'crate', x, y, size: 90, r: 22})),
    npcs: [{id: 'sera-convoy', who: 'sera', role: '부상당한 생존자', x: 760, y: 1130,
      intro: '저 좀… 도와주시겠어요?', lines: ['그놈들은 우리를 쫓지 않았어요.', '쇠 상자만 가져가고 전부 같은 방향으로 돌아섰죠.']}],
  },
  {id: 'lab7', name: '제7연구소', ch: 2, w: 2400, h: 1600, spawn: [1200, 1420], exit: {x: 1200, y: 1540, r: 54},
    ground: {base: '#666c6e', spot: ['rgba(200,220,225,.06)', 'rgba(30,36,40,.08)'], road: '#8b9295', edge: '#555b5e', tile: 1},
    roads: [{w: 130, pts: [[1200, 1560], [1200, 1000], [1200, 420]]}, {w: 100, pts: [[560, 1000], [1840, 1000]]}],
    pads: [{x: 1200, y: 360, rx: 280, ry: 120}],
    buildings: [
      {id: 'lab7-gate', name: '녹슨 정문', x: 1200, y: 1260, size: 300, look: 'arch'},
      {id: 'lab7-wing', name: '실험실 동', x: 620, y: 760, size: 340, look: 'lab'},
      {id: 'lab7-records', name: '기록 보관실', x: 1780, y: 760, size: 320, look: 'lab'},
      {id: 'lab7-lift', name: '최하층 승강기', x: 1200, y: 640, size: 220, look: 'machine'},
    ],
    sights: [
      {id: 'lab7-power-1', name: '전력 장치 1', role: '꺼진 전력 장치', x: 520, y: 1100, size: 120, r: 28, look: 'device',
        intro: '전력 장치의 불이 꺼져 있습니다.', lines: ['연구소에는 이런 장치가 세 개 있습니다.', '세 개를 모두 켜야 안쪽 문이 열립니다.']},
      {id: 'lab7-power-2', name: '전력 장치 2', role: '꺼진 전력 장치', x: 1880, y: 1100, size: 120, r: 28, look: 'device',
        intro: '두 번째 전력 장치입니다.', lines: ['선이 끊긴 자리에 새 부품 자국이 있습니다.', '누군가 최근까지 손본 흔적입니다.']},
      {id: 'lab7-power-3', name: '전력 장치 3', role: '꺼진 전력 장치', x: 900, y: 560, size: 120, r: 28, look: 'device',
        intro: '승강기 옆 세 번째 전력 장치입니다.', lines: ['계기판 숫자가 천천히 깜박입니다.', '시설은 아직 완전히 잠들지 않았습니다.']},
      {id: 'lab7-core', name: '제어 핵', role: '2장 보스 자리', x: 1440, y: 340, size: 150, r: 34, look: 'device',
        intro: '붉은 빛이 도는 제어 핵입니다.', lines: ['방위 장치 두 기와 선이 이어져 있습니다.', '연구소의 마지막 전력이 여기 모입니다.']},
      {id: 'lab7-assistant', name: '작은 기계 조수', role: '차단실에 깔린 조수', x: 520, y: 1380, size: 100, r: 22, look: 'robot',
        intro: '작은 기계 조수가 잔해 밑에서 삐 소리를 냅니다.', lines: ['옆의 기록 장치도 불꽃을 튀깁니다.', '오래 버티지는 못할 것 같습니다.']},
      {id: 'lab7-tubes', name: '실험 유리관', role: '살아 있는 설계도', x: 1880, y: 560, size: 150, r: 34, look: 'machine',
        intro: '유리관 속에 짐승의 골격과 금속 관절이 엇갈려 있습니다.', lines: ['사람 손글씨로 적힌 수리 날짜가 붙어 있습니다.', '만든 것인지 고친 것인지 알 수 없습니다.']},
    ],
    props: [[400, 1300], [2000, 1300], [380, 520], [2020, 520]].map(([x, y]) => ({look: 'crate', x, y, size: 100, r: 24})),
    npcs: [{id: 'zero-lab7', who: 'zero', role: '냉동 캡슐의 인조 생명체', x: 1200, y: 330,
      intro: '…또 누가 문을 열었군.', lines: ['나는 이곳에서 오래 기다렸다.', '무엇을 기다렸는지는 기억나지 않는다.']}],
  },
  RUIN('ruin-north', '북쪽 빙결 유적', '북', {base: '#8b9ea6', spot: ['rgba(240,250,255,.14)', 'rgba(60,80,96,.08)'], road: '#c3d0d4', edge: '#7a8c94'}, '냉각 제어 핵'),
  RUIN('ruin-east', '동쪽 번개 유적', '동', {base: '#7a7891', spot: ['rgba(230,226,255,.10)', 'rgba(40,36,64,.10)'], road: '#aaa7bd', edge: '#66637d'}, '과충전 발전기'),
  RUIN('ruin-south', '남쪽 화염 시설', '남', {base: '#94705f', spot: ['rgba(255,226,196,.09)', 'rgba(70,36,26,.10)'], road: '#c09c84', edge: '#7e5d4d'}, '화염 제어 장치'),
  RUIN('ruin-west', '서쪽 중력 시설', '서', {base: '#6c6884', spot: ['rgba(220,214,250,.08)', 'rgba(26,22,48,.12)'], road: '#9d98b5', edge: '#57536f'}, '중력 제어 장치', 1.45),
  {id: 'core', name: '중앙 제어 시설', ch: 4, w: 2400, h: 1600, spawn: [1200, 1420], exit: {x: 1200, y: 1540, r: 54},
    ground: {base: '#5a6170', spot: ['rgba(180,220,235,.07)', 'rgba(20,24,36,.10)'], road: '#8a93a3', edge: '#4b5260', tile: 1},
    roads: [{w: 130, pts: [[1200, 1560], [1200, 860]]},
      ...[[[300, 300], [1200, 760]], [[2100, 300], [1200, 760]], [[300, 1300], [1200, 760]], [[2100, 1300], [1200, 760]]].map((pts) => ({w: 60, pts}))],
    pads: [{x: 1200, y: 760, rx: 330, ry: 170}],
    buildings: [
      {id: 'core-boundary', name: '경계 문', x: 1200, y: 330, size: 320, look: 'arch'},
    ],
    sights: [
      {id: 'core-reactor', name: '에너지 코어', role: '4장 보스 자리', x: 1200, y: 760, size: 240, r: 58, look: 'core',
        intro: '거대한 코어가 천천히 맥박칩니다.', lines: ['네 방향에서 굵은 선이 코어로 모입니다.', '아르카의 판단이 이곳에서 나옵니다.']},
      {id: 'core-module', name: '통제 모듈', role: '아르카의 통제 모듈', x: 640, y: 560, size: 140, r: 32, look: 'terminal',
        intro: '통제 모듈의 화면에 예측 숫자가 흐릅니다.', lines: ['숫자 옆에 확률 표시가 붙어 있습니다.', '봉인 상태도 이 패널에 뜹니다.']},
      {id: 'core-sender', name: '공격 명령 송신기', role: '송신 장치', x: 1760, y: 560, size: 150, r: 34, look: 'device',
        intro: '송신기 끝에서 붉은 신호가 깜박입니다.', lines: ['신호는 마을 쪽을 향합니다.', '안쪽에 코어를 넣는 자리가 있습니다.']},
      {id: 'core-cells', name: '잠긴 보호구역', role: '갇힌 주민들', x: 1840, y: 1180, size: 170, r: 40, look: 'lab',
        intro: '‘안전’이라고 적힌 문이 굳게 잠겨 있습니다.', lines: ['안쪽에서 아이 목소리가 들립니다.', '몇 달째 문이 열리지 않았다고 합니다.']},
      {id: 'core-executor', name: '봉인의 집행자', role: '3장 보스 자리', x: 760, y: 1120, size: 190, r: 44, look: 'robot',
        intro: '거대한 경비 기계가 무릎을 꿇은 채 멈춰 있습니다.', lines: ['네 방향의 문양이 몸에 새겨져 있습니다.', '팔이 네 개입니다.']},
    ],
    props: [[560, 1000], [1840, 1000], [1640, 1180]].map(([x, y]) => ({look: 'turret', x, y, size: 110, r: 24})),
    npcs: [{id: 'arka-core', who: 'arka', role: '중앙 관리자 투영 · 4장 보스', x: 1400, y: 860,
      intro: '외부 사용자 확인. 접근 목적을 말하라.', lines: ['나는 이 대륙의 방어를 맡고 있다.', '판단 근거는 기록에 있다.']}],
  },
  {id: 'relay', name: '외곽 감시탑', ch: 5, w: 2000, h: 1600, spawn: [1000, 1420], exit: {x: 1000, y: 1540, r: 54},
    ground: {base: '#4d5468', spot: ['rgba(210,220,255,.07)', 'rgba(16,20,36,.12)'], road: '#7f8699', edge: '#3e4456'},
    roads: [{w: 120, pts: [[1000, 1560], [1000, 900], [1000, 660]]}],
    pads: [{x: 1000, y: 700, rx: 320, ry: 150}],
    buildings: [{id: 'relay-tower', name: '불탄 감시탑', x: 1000, y: 620, size: 400, look: 'tower'}],
    sights: [
      {id: 'relay-device', name: '송신 장치', role: '중계병이 지키는 장치', x: 1300, y: 900, size: 150, r: 34, look: 'device',
        intro: '송신 장치에서 짧은 신호가 반복됩니다.', lines: ['잡음 사이로 낯선 목소리가 섞여 있습니다.', '신호는 하늘 쪽으로 나갑니다.']},
      {id: 'relay-lock', name: '손상된 경비병', role: '감시탑 경비 기계', x: 700, y: 900, size: 130, r: 30, look: 'robot',
        intro: '손상된 경비병이 공격하지 않고 서 있습니다.', lines: ['눈의 불빛만 깜박입니다.', '무언가 말하려는 것 같습니다.']},
    ],
    props: [[420, 760], [1580, 760], [520, 1240], [1480, 1240]].map(([x, y]) => ({look: 'pylon', x, y, size: 130, r: 20})),
    npcs: [{id: 'doyun-relay', who: 'doyun', role: '감시탑 지하의 생존자', x: 1460, y: 1180,
      intro: '…물 좀 주시겠습니까.', lines: ['수송대 방한복을 입고 있습니다.', '리아라는 이름을 몇 번이고 중얼거립니다.']}],
  },
  {id: 'mine', name: '폐광산', ch: 6, w: 2400, h: 1500, spawn: [1200, 1320], exit: {x: 1200, y: 1440, r: 54},
    ground: {base: '#5d5248', spot: ['rgba(230,210,180,.06)', 'rgba(20,14,10,.14)'], road: '#7e7062', edge: '#4a4038', rail: 1},
    roads: [{w: 100, pts: [[1200, 1460], [1200, 1000], [900, 760], [1200, 420], [1200, 260]]}],
    pads: [],
    links: [{x: 1200, y: 240, r: 54, to: 'vault', at: [1100, 1220], label: '기록 보관소'}],
    buildings: [
      {id: 'mine-shaft', name: '무너진 갱도', x: 520, y: 620, size: 300, look: 'ruin'},
      {id: 'mine-hut', name: '광부 쉼터', x: 1860, y: 620, size: 280, look: 'house'},
    ],
    sights: [
      {id: 'mine-plan-1', name: '좌표 조각', role: '첫 번째 조각', x: 760, y: 1080, size: 100, r: 22, look: 'paper',
        intro: '흙더미 사이에 낡은 도면 조각이 보입니다.', lines: ['선만 남고 이름 칸이 비어 있습니다.', '보리에게 가져가면 좋겠습니다.']},
      {id: 'mine-plan-2', name: '좌표 조각', role: '두 번째 조각', x: 1680, y: 1060, size: 100, r: 22, look: 'paper',
        intro: '광차 아래에 접힌 종이가 끼어 있습니다.', lines: ['같은 도면의 다른 부분입니다.', '이름 칸은 역시 비어 있습니다.']},
      {id: 'mine-plan-3', name: '좌표 조각', role: '세 번째 조각', x: 1560, y: 520, size: 100, r: 22, look: 'paper',
        intro: '갱목 틈에 마지막 조각이 꽂혀 있습니다.', lines: ['세 조각을 맞추면 지도가 됩니다.', '가운데 원이 지워져 있습니다.']},
      {id: 'mine-silencer', name: '서고의 침묵자', role: '소리 없는 추적병', x: 1200, y: 860, size: 170, r: 38, look: 'robot',
        intro: '소리 없이 움직이는 추적병이 멈춰 있습니다.', lines: ['손끝에서 지우개 같은 빛이 새어 나옵니다.', '기록을 노리는 것 같습니다.']},
    ],
    props: [[980, 1200], [1500, 1260], [1400, 760]].map(([x, y]) => ({look: 'cart', x, y, size: 110, r: 26})),
    npcs: [],
  },
  {id: 'vault', name: '기록 보관소', ch: 6, w: 2200, h: 1400, spawn: [1100, 1220], exit: {x: 1100, y: 1340, r: 54, to: 'mine', at: [1200, 360], label: '폐광산'},
    ground: {base: '#6b6052', spot: ['rgba(250,230,190,.07)', 'rgba(30,22,14,.10)'], road: '#9a8c74', edge: '#584e42', tile: 1},
    roads: [{w: 120, pts: [[1100, 1360], [1100, 640]]}],
    pads: [{x: 1100, y: 600, rx: 260, ry: 120}],
    buildings: [],
    sights: [
      {id: 'vault-desk', name: '설계도 책상', role: '최초의 서명', x: 1100, y: 560, size: 170, r: 40, look: 'desk',
        intro: '책상 위에 영상 기록 장치와 설계도가 놓여 있습니다.', lines: ['화면에는 손만 비칩니다.', '서명 칸이 비어 있습니다.']},
      ...[['vault-line-1', 360, 1180], ['vault-line-2', 1100, 940], ['vault-line-3', 1840, 1180]].map(([id, x, y], k) => ({id, name: '문장 조각', role: `찢긴 문장 ${k + 1}`, x, y, size: 90, r: 20, look: 'paper',
        intro: '서가 아래에 찢긴 문장 조각이 떨어져 있습니다.', lines: ['글자가 반쯤 지워져 있습니다.', '다른 조각과 이어 읽어야 합니다.']})),
    ],
    props: [
      ...[360, 600, 1600, 1840].flatMap((x) => [420, 760, 1100].map((y) => ({look: 'shelf', x, y, size: 150, r: 34}))),
    ],
    npcs: [{id: 'irion-vault', who: 'irion', role: '고대 기록 해석자', x: 880, y: 680,
      intro: '글자를 읽고 싶다면 도와드리죠.', lines: ['하지만 마지막 문장은 읽지 마세요.', '이유는… 나중에 말씀드리죠.']}],
  },
  ...STORY_MAPS_2,
];
// 조사물 크기는 사람 키 기준으로 다시 맞춘다(storySizes.js ← design/story/size-sights.py). 없는 것은 위 값 그대로.
export const STORY_MAPS = STORY_MAPS_RAW.map((m) => {
  const sized = {...m, sights: m.sights.map((s) => { const z = STORY_SIGHT_SIZE[s.id]; return z ? {...s, size: z[0], r: z[1]} : s; })};
  return {...sized, props: [...(m.props || []), ...decorFor(sized)]};   // 비어 보이지 않게 장식 소품을 흩뿌린다(storyDecor.js)
});

/* 에르덴 마을에서 이야기 장소로 가는 문(11월 6일). 마을 새 좌표. back 은 이야기 맵에서 돌아올 때 서는 자리.
   이야기를 그 장소까지 진행해야 열린다(storyQuestData.js storyGateOpen). 봉인 유적은 북 → 동 → 남 → 서 → 중앙 제어 시설로 이어진다 */
export const STORY_GATES = [
  {to: 'convoy', x: 1600, y: 280, back: [1600, 420]},
  {to: 'ruin-north', x: 700, y: 350, back: [790, 480], label: '봉인 유적'},
  {to: 'core', x: 2550, y: 350, back: [2450, 480]},
  {to: 'lab7', x: 160, y: 1400, back: [300, 1400]},
  {to: 'mine', x: 160, y: 1860, back: [300, 1860]},
  {to: 'relay', x: 3050, y: 1470, back: [2910, 1470]},
];
export const RUIN_CHAIN = ['ruin-north', 'ruin-east', 'ruin-south', 'ruin-west'];

/* 에르덴 마을에 더하는 1부 시설과 인물. 기존 마을 배치(villageData.js)의 빈자리에 둔다. */
import {villageAt} from './villageData.js';
const STORY_VILLAGE_RAW = {
  buildings: [
    {id: 'erden-guardpost', name: '경비대 초소', x: 1400, y: 1600, size: 210, look: 'house'},
    {id: 'erden-workbench', name: '미나의 연구 작업대', x: 250, y: 1130, size: 220, look: 'lab'},
    {id: 'erden-collection', name: '보리의 수집품 가판', x: 850, y: 760, size: 170, look: 'stall'},
  ],
  npcs: [
    {id: 'hangyeol', who: 'hangyeol', x: 1250, y: 1570,
      intro: '여행자십니까? 마을 남문은 제가 지킵니다.', lines: ['요즘 길에 늑대가 늘었습니다. 조심하십시오.', '수상한 일이 생기면 저에게 먼저 알려 주십시오.']},
    {id: 'mina', who: 'mina', x: 390, y: 1170,
      intro: '어서 오세요. 약도 기계도 제 담당이에요.', lines: ['망가진 장치를 들고 오면 같이 들여다봐요.', '모르는 건 모른다고 말할게요. 대신 끝까지 찾아봐요.']},
    {id: 'bori', who: 'bori', x: 950, y: 800,
      intro: '이건 비매품이에요. 보기만 하세요.', lines: ['여러 지역의 유물과 문헌을 모으고 있어요.', '오래된 종이에는 생각보다 많은 게 남아 있거든요.']},
  ],
};
// 마을 범위를 넓히며(11월 6일) 옛 좌표를 새 마을 좌표로 옮긴다
// 리아(11월 7일) — 새 마을 좌표로 바로 둔다. 북쪽 수송로 문 아래, 북문을 바라보는 자리
const LIA = {id: 'lia', who: 'lia', x: 1460, y: 470,
  intro: '아빠는 수송대를 타고 와요.', lines: ['북문이 잘 보이는 자리는 여기예요.', '종이 울리면 제일 먼저 알 수 있거든요.']};
export const STORY_VILLAGE = {buildings: STORY_VILLAGE_RAW.buildings.map(villageAt), npcs: [...STORY_VILLAGE_RAW.npcs.map(villageAt), LIA]};

// 대화 창이 찾는 표 — 인물은 STORY_PEOPLE 의 이름 · 역할을 물려받는다.
const person = (n) => {
  const p = STORY_PEOPLE[n.who];
  return {...n, name: p.name, role: n.role || p.role, look: p.look, portrait: storyArtPath('portraits', n.who), art: n.who};
};
export const storyNpcsOf = (mapId) => (mapId === 'dawnwood' ? STORY_VILLAGE.npcs : STORY_MAPS.find((m) => m.id === mapId)?.npcs || []).map(person);
export const storySightsOf = (mapId) => (STORY_MAPS.find((m) => m.id === mapId)?.sights || []).map((s) => ({...s, art: s.id, portrait: storyArtPath('places', s.id)}));
export const storyBuildingsOf = (mapId) => (mapId === 'dawnwood' ? STORY_VILLAGE.buildings : STORY_MAPS.find((m) => m.id === mapId)?.buildings || []).map((b) => ({...b, art: b.id}));
export const storyPropsOf = (mapId) => (STORY_MAPS.find((m) => m.id === mapId)?.props || []).map((p) => ({...p, art: `prop-${p.look}`}));   // 그림: places/prop-<look>.webp
export const STORY_DIALOGUES = Object.fromEntries(['dawnwood', ...STORY_MAPS.map((m) => m.id)].flatMap((id) => [...storyNpcsOf(id), ...storySightsOf(id)]).map((n) => [n.id, n]));

// 막힌 곳 — 건물은 마을처럼 문 양옆과 가운데 셋, 아치 문은 양옆 기둥만 막는다.
export function storyBlocks(mapId) {
  return [
    ...storyBuildingsOf(mapId).flatMap((b) => b.look === 'arch'
      ? [-1, 1].map((s) => ({x: b.x + s * b.size * .38, y: b.y - 30, r: b.size * .11}))
      : b.size >= 200 ? [-.26, 0, .26].map((k) => ({x: b.x + b.size * k, y: b.y - 40, r: b.size * .19})) : [{x: b.x, y: b.y - 30, r: b.size * .3}]),
    ...storyNpcsOf(mapId).map((n) => ({x: n.x, y: n.y - 4, r: 18})),
    ...[...storySightsOf(mapId), ...storyPropsOf(mapId)].filter((n) => n.r > 0).map((n) => ({x: n.x, y: n.y - 4, r: n.r})),
  ];
}
