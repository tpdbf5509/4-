/* 에르덴 바깥 장소(11월 22일, 사용자 요청) — 숲 셋 · 마을 하나 · 산 둘. 지금은 숲 셋(별이슬숲 · 등불고개 숲 · 너덜재 숲)이 있다.
   연결: 에르덴 마을 동쪽 숲길 → 별이슬숲 → (북) 등불고개 숲 → 루엔 마을 → 서리봉 / (동) 너덜재 숲 → 칼등산. 구성안은 프로젝트 notes/에르덴-바깥-여섯-장소-구성안.md
   이야기 맵과 같은 틀(storyData.js PLACE_MAPS)이라 바닥 그림 · 소품 · 막힌 곳 · 앞뒤 정렬을 그대로 쓴다.
   그림: 바닥 story/ground/<맵 id>.webp(나무 없는 바닥만) · 나무 story/places/prop-<look>.webp(투명 낱장, design/wilds/cut-trees.py).
   나무는 바닥 그림과 따로 만들어 코드가 심는다(사용자 지시) — 자리는 design/wilds/plant.py 가 만든 wildsPlant.js. 맵 차례는 rpg.js 끝에 뒤에만 더한다. */
import {DEW_PLANTS, LANTERN_PLANTS, SCREE_PLANTS} from './wildsPlant.js';

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
/* 등불고개 숲 — 남쪽에서 북쪽으로 굽이 오르는 고갯길. 길가에 등불 기둥이 번갈아 선다. 북쪽 고개 너머는 루엔 마을(아직 없음) */
const LANTERN = place({
  id: 'lantern-forest', name: '등불고개 숲', spawn: [1545, 1860],
  exits: [{x: 1545, y: 2010, r: 70, to: 'dew-forest', at: DEW_AT.north, label: '별이슬숲'}],
  props: plants('lantern', LANTERN_PLANTS),
  sights: [
    {id: 'lantern-pass', name: '고개 등불', role: '길가에 걸린 등불', x: 1700, y: 1240, size: 120, r: 0, bg: 1,
      intro: '나무 기둥에 쇠 등불이 걸려 있습니다.', lines: ['누군가 해 질 녘마다 불을 갈아 끼우는 듯 심지가 새것입니다.', '등불을 따라 오르면 고개 너머 마을에 닿는다고 합니다.']},
  ],
});
/* 너덜재 숲 — 돌 부스러기가 깔린 마른 비탈 숲. 서쪽 길로 별이슬숲, 동쪽 위 길 끝은 칼등산(아직 없음) */
const SCREE = place({
  id: 'scree-forest', name: '너덜재 숲', spawn: [300, 1140],
  exits: [{x: 110, y: 1140, r: 70, to: 'dew-forest', at: DEW_AT.east, label: '별이슬숲'}],
  props: plants('scree', SCREE_PLANTS),
  sights: [
    {id: 'scree-field', name: '너덜 비탈', role: '돌 부스러기가 깔린 곳', x: 2300, y: 1660, size: 120, r: 0, bg: 1,
      intro: '깨진 돌이 비탈을 따라 흘러내려 쌓여 있습니다.', lines: ['밟을 때마다 돌이 사각사각 미끄러집니다.', '동쪽 하늘에 칼등처럼 좁은 바위 능선이 보입니다.']},
  ],
});
export const WILD_MAPS = [DEW, LANTERN, SCREE];
export const WILD_IDS = WILD_MAPS.map((m) => m.id);
export const WILD_BLOCKS = Object.fromEntries(WILD_MAPS.map((m) => [m.id, m.blocks]));

// 에르덴 마을 쪽 문 — 동쪽 가장자리(마을 새 좌표). 울타리에 붙이지 않고 넉넉한 반지름으로 이름표를 눌러도 닿게 한다(11월 22일 입장 제보). back 은 별이슬숲에서 돌아올 때 서는 자리
export const WILD_VILLAGE_GATE = {x: 3080, y: 900, r: 70, to: 'dew-forest', back: [2960, 900], label: '별이슬숲'};   // back 은 DEW 출구 at 과 같게
