/* 에르덴 바깥 장소(11월 22일, 사용자 요청) — 숲 셋 · 마을 하나 · 산 둘. 지금은 숲 셋(별이슬숲 · 등불고개 숲 · 너덜재 숲)이 있다.
   연결: 에르덴 마을 동쪽 숲길 → 별이슬숲 → (북) 등불고개 숲 → 루엔 마을 → 서리봉 / (동) 너덜재 숲 → 칼등산. 구성안은 프로젝트 notes/에르덴-바깥-여섯-장소-구성안.md
   이야기 맵과 같은 틀(storyData.js PLACE_MAPS)이라 바닥 그림 · 소품 · 막힌 곳 · 앞뒤 정렬을 그대로 쓴다.
   그림: 바닥 story/ground/<맵 id>.webp(나무 없는 바닥만) · 나무 story/places/prop-<look>.webp(투명 낱장, design/wilds/cut-trees.py).
   나무는 바닥 그림과 따로 만들어 코드가 심는다(사용자 지시) — 자리는 design/wilds/plant.py 가 만든 wildsPlant.js. 맵 차례는 rpg.js 끝에 뒤에만 더한다. */
import {DEW_PLANTS, LANTERN_PLANTS, SCREE_PLANTS, FROST_PLANTS, RIDGE_PLANTS, RIDGE_BLOCKS} from './wildsPlant.js';
import {LIBRARY_MAPS, LIBRARY_BLOCKS} from './libraryData.js';

// live 가 false 면 테스트 서버(?test)에서만 마을 문이 보이고 지나간다. 11월 22일 사용자 확인으로 실제 게임에 열었다
export const WILDS = {live: true};
export const wildsOn = (g) => WILDS.live || !!g?.test;

/* 나무 · 덤불 종류 — 숲마다 묶음 하나(그림 시트 한 장). size 는 512 그림을 그릴 크기(사람 키 약 90), r 은 밑동 막힘 반지름(0 이면 밟고 지나간다).
   묶음 안 차례는 wildsPlant.js 의 종류 번호라 뒤에만 더한다 */
const P = (look, size, r) => ({look, size, r});
export const WILD_SETS = {
  dew: [P('dew-oak', 340, 30), P('dew-spruce', 330, 22), P('dew-birch', 300, 18), P('dew-round', 300, 24),
    P('dew-old', 340, 30), P('dew-young', 240, 14), P('dew-shrub', 170, 30), P('dew-fern', 150, 0)],
  // 등불고개 숲 — 높은 전나무 · 가문비 · 소나무 · 낙엽송. 등불 기둥은 길 가장자리에 번갈아(plant.py lamps)
  lantern: [P('lantern-fir', 360, 18), P('lantern-spruce', 340, 22), P('lantern-pine', 330, 22), P('lantern-larch', 320, 18),
    P('lantern-young', 220, 12), P('lantern-juniper', 170, 28), P('lantern-lamp', 190, 10), P('lantern-boulder', 170, 34)],
  // 너덜재 숲 — 마른 소나무 · 죽은 나무 · 자작 · 마가목, 너덜 돌무더기 · 큰 바위
  scree: [P('scree-pine', 340, 22), P('scree-dead', 330, 22), P('scree-birch', 310, 16), P('scree-rowan', 310, 20),
    P('scree-young', 230, 14), P('scree-shrub', 170, 26), P('scree-rubble', 160, 30), P('scree-rock', 200, 40)],
  // 서리봉 — 서리 앉은 전나무 · 가문비 · 눈잣나무, 서리 바위 · 얼음 결정 · 돌탑
  frost: [P('frost-fir', 340, 18), P('frost-spruce', 300, 20), P('frost-pine', 280, 22), P('frost-young', 220, 12),
    P('frost-shrub', 160, 26), P('frost-boulder', 190, 36), P('frost-ice', 160, 30), P('frost-cairn', 150, 22)],
  // 칼등산 — 능선 양옆 바위 봉우리 · 바위에 뿌리내린 소나무 · 마른 나무
  ridge: [P('ridge-spire', 360, 40), P('ridge-crag', 280, 40), P('ridge-pine', 300, 22), P('ridge-snag', 260, 16),
    P('ridge-rocks', 170, 30), P('ridge-boulder', 150, 28), P('ridge-grass', 120, 0), P('ridge-cairn', 150, 22)],
};
export const WILD_PLANTS = WILD_SETS.dew;   // 옛 이름(별이슬숲)
// 사람이 나무 뒤(밑동보다 위쪽 · 잎 안)에 들어가면 그 나무를 반투명으로 — 숲속에서 내 캐릭터를 잃지 않게
export const WILD_FADE = {alpha: .45};

const plants = (set, list) => list.map(([k, x, y, s]) => {
  const p = WILD_SETS[set][k];
  return {id: `wp${x}_${y}`, look: p.look, x, y, size: Math.round(p.size * s), r: Math.round(p.r * s), decor: 1, wild: 1};
});

const GROUND = {base: '#5f7448', spot: ['#66804d', '#566b40'], road: '#a7865f', edge: '#7a6448'};
// 맵 틀 — exits 는 밟으면 넘어가는 출구(at 은 건너편에서 서는 자리). 길 자리는 바닥 그림(design/wilds/*-ground.webp)에 그려져 있다
const place = (o) => ({w: 3200, h: 2100, top: 170, ground: GROUND, roads: [], pads: [], buildings: [], npcs: [], sights: [], blocks: [], ...o});
const WILD_LIB_BLOCKS = {};
const RIDGE_SPAWN = [300, 1465], RIDGE_TOP = [2900, 580];   // 칼등산 들어오는 자리 · 정상 — 바닥 그림 능선에 맞춘다
const DEW_AT = {west: [300, 1135], north: [1600, 420], east: [2900, 1240]};   // 별이슬숲에 돌아와 서는 자리

/* 별이슬숲 — 서쪽 길로 에르덴, 북쪽 길로 등불고개 숲, 동쪽 길로 너덜재 숲. 가운데 빈터 오른쪽 위에 작은 연못 */
const DEW = place({
  id: 'dew-forest', name: '별이슬숲', spawn: DEW_AT.west,
  exits: [
    {x: 110, y: 1135, r: 70, to: 'dawnwood', at: [2960, 900], label: '에르덴 마을'},
    {x: 1600, y: 230, r: 70, to: 'lantern-forest', at: [1545, 1860], label: '등불고개 숲'},
    {x: 3090, y: 1240, r: 70, to: 'scree-forest', at: [300, 1140], label: '너덜재 숲'},
  ],
  props: plants('dew', DEW_PLANTS),
  sights: [
    {id: 'dew-pond', name: '별이슬 연못', role: '빈터 옆 작은 연못', x: 1958, y: 1000, size: 120, r: 0, bg: 1,
      intro: '이끼 낀 돌이 둘러싼 작은 연못입니다.', lines: ['잎 끝에 맺힌 이슬이 물에 떨어질 때마다 작은 빛이 번집니다.', '밤이 되면 별이 물에 내려앉은 것처럼 보인다고 합니다.']},
  ],
  blocks: [[1958, 875, 150]],   // 연못 — 바닥 그림 속 물
});
/* 등불고개 숲 — 남쪽에서 북쪽으로 굽이 오르는 고갯길. 길가에 등불 기둥이 번갈아 선다. 북쪽 고개 너머는 루엔 마을 */
const LANTERN = place({
  id: 'lantern-forest', name: '등불고개 숲', spawn: [1545, 1860],
  exits: [{x: 1545, y: 2010, r: 70, to: 'dew-forest', at: DEW_AT.north, label: '별이슬숲'},
    {x: 1590, y: 230, r: 70, to: 'luen', at: [1600, 1860], label: '루엔 마을'}],
  props: plants('lantern', LANTERN_PLANTS),
  sights: [
    {id: 'lantern-pass', name: '고개 등불', role: '길가에 걸린 등불', x: 1700, y: 1240, size: 120, r: 0, bg: 1,
      intro: '나무 기둥에 쇠 등불이 걸려 있습니다.', lines: ['누군가 해 질 녘마다 불을 갈아 끼우는 듯 심지가 새것입니다.', '등불을 따라 오르면 고개 너머 마을에 닿는다고 합니다.']},
  ],
});
/* 너덜재 숲 — 돌 부스러기가 깔린 마른 비탈 숲. 서쪽 길로 별이슬숲, 동쪽 위 길 끝은 칼등산 */
const SCREE = place({
  id: 'scree-forest', name: '너덜재 숲', spawn: [300, 1140],
  exits: [{x: 110, y: 1140, r: 70, to: 'dew-forest', at: DEW_AT.east, label: '별이슬숲'},
    {x: 3090, y: 800, r: 70, to: 'blade-ridge', at: RIDGE_SPAWN, label: '칼등산'}],
  props: plants('scree', SCREE_PLANTS),
  sights: [
    {id: 'scree-field', name: '너덜 비탈', role: '돌 부스러기가 깔린 곳', x: 2300, y: 1660, size: 120, r: 0, bg: 1,
      intro: '깨진 돌이 비탈을 따라 흘러내려 쌓여 있습니다.', lines: ['밟을 때마다 돌이 사각사각 미끄러집니다.', '동쪽 하늘에 칼등처럼 좁은 바위 능선이 보입니다.']},
  ],
});
/* 루엔 마을 — 에르덴과 같은 틀(건물 · 주민 · 도서관), 길과 건물은 새로(11월 22일 사용자). 남쪽 길로 등불고개 숲, 북쪽 길로 서리봉.
   건물 좌표는 문(발) 자리 — 바닥 그림의 빈 풀밭 자리에 맞췄다(design/wilds/luen-ground.webp). 그림 places/<건물 id>.webp */
const B = (id, name, x, y, size) => ({id, name, x, y, size});
const LUEN_LIB_DOOR = {x: 2250, y: 798, r: 46};
const LUEN = place({
  id: 'luen', name: '루엔 마을', spawn: [1600, 1860],
  exits: [
    {x: 1600, y: 2030, r: 70, to: 'lantern-forest', at: [1590, 420], label: '등불고개 숲'},
    {x: 1600, y: 230, r: 70, to: 'frost-peak', at: [1390, 1880], label: '서리봉'},
    {...LUEN_LIB_DOOR, to: 'luen-library', at: [1200, 1420], label: '루엔 도서관', libGate: 'door'},
  ],
  buildings: [
    B('luen-elder', '촌장댁', 1150, 760, 330), B('luen-library', '루엔 도서관', 2250, 760, 360),
    B('luen-inn', '산마루 여관', 1000, 1100, 330), B('luen-smith', '돌모루 대장간', 2200, 1100, 330),
    B('luen-herb', '서리풀 약초집', 1000, 1560, 310), B('luen-bakery', '화덕 빵집', 2200, 1560, 320),
    B('luen-cottage-a', '돌담 집', 600, 1100, 300), B('luen-cottage-b', '장작 집', 2650, 1560, 300),
  ],
  npcs: [
    {id: 'luen-elder-npc', who: 'luen-elder', x: 1360, y: 850, intro: '고개를 넘어왔구먼. 루엔에 온 걸 환영하네.',
      lines: ['마을 북쪽 길을 따라 오르면 서리봉이야. 한여름에도 봉우리에 서리가 앉아 반짝이지.', '해가 높을 때 올려다보게. 서리가 햇빛을 받아 별처럼 빛난다네.']},
    {id: 'luen-inn-npc', who: 'luen-innkeeper', x: 1150, y: 1230, intro: '어서 와요! 고갯길 오느라 다리 아프죠?',
      lines: ['등불고개 등불은 우리 마을 사람들이 번갈아 갈아 끼워요.', '에르덴에서 오셨으면 별이슬숲 연못도 보셨겠네요. 거기 물이 참 맑죠.']},
    {id: 'luen-smith-npc', who: 'luen-smith', x: 2340, y: 1230, intro: '쇠 두드리는 소리 시끄럽죠? 금방 끝나요.',
      lines: ['너덜재 숲 동쪽으로 가면 칼등산이에요. 능선이 칼등처럼 좁으니 발밑을 조심해요.', '그 능선 바위로 숫돌을 만들면 날이 잘 서요.']},
    {id: 'luen-herb-npc', who: 'luen-herbalist', x: 1150, y: 1690, intro: '서리풀 향 맡아 봤어요? 서리봉 아래에서만 자라요.',
      lines: ['서리가 앉은 풀이 이상하게 한여름에도 시들지 않아요.', '약초 말리는 냄새가 나면 우리 집이에요.']},
  ],
});
/* 서리봉 — 루엔 마을 너머 높은 산. 윗부분은 서리 덮인 봉우리(걷지 못함, top), 굽은 산길이 봉우리 아래 전망 바위까지 오른다 */
const FROST = place({
  id: 'frost-peak', name: '서리봉', top: 700, spawn: [1390, 1880],
  exits: [{x: 1530, y: 2030, r: 70, to: 'luen', at: [1600, 420], label: '루엔 마을'}],
  props: plants('frost', FROST_PLANTS),
  sights: [
    {id: 'frost-summit', name: '서리 봉우리', role: '한여름에도 서리가 앉은 봉우리', x: 1590, y: 740, size: 120, r: 0, bg: 1,
      intro: '바로 위로 흰 서리가 덮인 봉우리가 솟아 있습니다.', lines: ['한여름인데도 바위마다 서리가 하얗게 앉았습니다.', '햇빛이 닿을 때마다 서리가 반짝반짝 빛납니다.']},
  ],
});
/* 칼등산 — 너덜재 숲에서 이어지는 돌산. 칼등처럼 좁고 긴 바위 능선이 왼쪽 아래에서 오른쪽 위 정상까지 이어진다.
   능선 밖 벼랑은 걸을 수 없다(RIDGE_BLOCKS — plant.py 가 바닥 그림의 능선 밖에 깐 보이지 않는 막힘) */
const RIDGE = place({
  id: 'blade-ridge', name: '칼등산', spawn: RIDGE_SPAWN,
  exits: [{x: 110, y: 1510, r: 70, to: 'scree-forest', at: [2900, 800], label: '너덜재 숲'}],
  props: plants('ridge', RIDGE_PLANTS),
  sights: [
    {id: 'ridge-summit', name: '칼등 정상', role: '능선 끝 바위', x: RIDGE_TOP[0], y: RIDGE_TOP[1], size: 120, r: 0, bg: 1,
      intro: '좁은 능선 끝에 작은 바위 마루가 있습니다.', lines: ['양옆으로 깎아지른 벼랑 아래 골짜기가 안개에 잠겨 있습니다.', '멀리 서쪽에 하얗게 빛나는 서리봉이 보입니다.']},
  ],
  blocks: RIDGE_BLOCKS,
});

/* 루엔 도서관 1 · 2층 — 에르덴 도서관과 같은 방 · 책장 · 책(사용자 지시). 사서 이름과 그림, 2층 큰 창만 다르다.
   에르덴 맵을 본떠 id 만 바꾼다(조사물 id 는 luen- 를 붙인다). 바닥 그림 story/ground/luen-library(-2).webp */
const LIB_ID = {'erden-library': 'luen-library', 'erden-library-2': 'luen-library-2', dawnwood: 'luen'};
const LUEN_WINDOW = {name: '서리 무늬 창', role: '서리봉이 보이는 큰 창', intro: '작은 서리 유리를 이어 붙인 높은 아치 창입니다.',
  lines: ['창 너머로 서리봉의 흰 봉우리가 햇빛에 반짝입니다.', '유리마다 눈송이 무늬가 새겨져 있습니다.']};
const relink = (q) => q && {...q, to: LIB_ID[q.to] || q.to, ...(q.to === 'dawnwood' ? {at: [LUEN_LIB_DOOR.x, LUEN_LIB_DOOR.y + 70], label: '루엔 마을', named: 1} : {})};
export const LUEN_LIBRARY_MAPS = LIBRARY_MAPS.map((m) => ({
  ...m, id: LIB_ID[m.id], name: m.name.replace('에르덴', '루엔'), exit: relink(m.exit), stairs: relink(m.stairs),
  sights: m.sights.map((q) => ({...q, id: `luen-${q.id}`, ...(q.id === 'lib2-window' ? LUEN_WINDOW : {})})),
  npcs: m.npcs.map((n) => ({...n, id: `luen-${n.id}`, who: 'luen-librarian',
    lines: n.lines.map((l) => l.replace('기록관의 소은이 가끔 여기서 자료를 빌려 가요. 둘이 하는 일이 조금 다르거든요.', '고개 너머 에르덴 도서관과 같은 책을 나눠 꽂아 두었어요. 어느 쪽에서 읽어도 이어져요.'))})),
}));
LIBRARY_MAPS.forEach((m) => { WILD_LIB_BLOCKS[LIB_ID[m.id]] = LIBRARY_BLOCKS[m.id]; });

// 루엔 사람들 — 이야기 인물 표(STORY_PEOPLE)에 더한다. 그림 story/people · portraits/<id>.webp, 없으면 이 색으로 임시 인형
export const WILD_PEOPLE = {
  'luen-elder': {name: '촌장 마루', role: '루엔 마을 촌장', look: {body: '#7d8a99', trim: '#5c6672', hair: '#e8e4dc', skin: '#e9cdb0', mark: 'beard'}},
  'luen-innkeeper': {name: '여관 주인 새봄', role: '산마루 여관', look: {body: '#b59a7a', trim: '#8a6f55', hair: '#6a4a32', skin: '#f0d2b4', mark: 'apron'}},
  'luen-smith': {name: '대장장이 단우', role: '돌모루 대장간', look: {body: '#6e6258', trim: '#4a4038', hair: '#2e2620', skin: '#dcb593', mark: 'apron'}},
  'luen-herbalist': {name: '약초사 은솔', role: '서리풀 약초집', look: {body: '#8fae8c', trim: '#6a8a68', hair: '#5a4632', skin: '#efd3b6', mark: 'scarf'}},
  'luen-librarian': {name: '사서 서하', role: '루엔 도서관', look: {body: '#4f5f7f', trim: '#3a4660', hair: '#b9bcc2', skin: '#ecd0b2', mark: 'scarf'}},
};

export const WILD_MAPS = [DEW, LANTERN, SCREE, LUEN, FROST, RIDGE];
export const WILD_IDS = WILD_MAPS.map((m) => m.id);
export const WILD_BLOCKS = {...Object.fromEntries(WILD_MAPS.map((m) => [m.id, m.blocks])), ...WILD_LIB_BLOCKS};

// 에르덴 마을 쪽 문 — 동쪽 가장자리(마을 새 좌표). 울타리에 붙이지 않고 넉넉한 반지름으로 이름표를 눌러도 닿게 한다(11월 22일 입장 제보). back 은 별이슬숲에서 돌아올 때 서는 자리
export const WILD_VILLAGE_GATE = {x: 3080, y: 900, r: 70, to: 'dew-forest', back: [2960, 900], label: '별이슬숲'};   // back 은 DEW 출구 at 과 같게
