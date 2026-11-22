/* 에르덴 바깥 장소(11월 22일, 사용자 요청) — 숲 셋 · 마을 하나 · 산 둘. 지금은 별이슬숲만 있다.
   연결: 에르덴 마을 동쪽 숲길 → 별이슬숲 → (북) 등불고개 숲 → 루엔 마을 → 서리봉 / (동) 너덜재 숲 → 칼등산. 구성안은 프로젝트 notes/에르덴-바깥-여섯-장소-구성안.md
   이야기 맵과 같은 틀(storyData.js PLACE_MAPS)이라 바닥 그림 · 소품 · 막힌 곳 · 앞뒤 정렬을 그대로 쓴다.
   그림: 바닥 story/ground/<맵 id>.webp(나무 없는 바닥만) · 나무 story/places/prop-<look>.webp(투명 낱장, design/wilds/cut-trees.py).
   나무는 바닥 그림과 따로 만들어 코드가 심는다(사용자 지시) — 자리는 design/wilds/plant.py 가 만든 wildsPlant.js. 맵 차례는 rpg.js 끝에 뒤에만 더한다. */
import {DEW_PLANTS} from './wildsPlant.js';

// live 가 false 면 테스트 서버(?test)에서만 마을 문이 보이고 지나간다. 11월 22일 사용자 확인으로 실제 게임에 열었다
export const WILDS = {live: true};
export const wildsOn = (g) => WILDS.live || !!g?.test;

/* 나무 · 덤불 종류 — size 는 512 그림을 그릴 크기(사람 키 약 90), r 은 밑동 막힘 반지름(0 이면 밟고 지나간다).
   차례는 wildsPlant.js 의 종류 번호라 뒤에만 더한다 */
export const WILD_PLANTS = [
  {look: 'dew-oak', size: 340, r: 30},
  {look: 'dew-spruce', size: 330, r: 22},
  {look: 'dew-birch', size: 300, r: 18},
  {look: 'dew-round', size: 300, r: 24},
  {look: 'dew-old', size: 340, r: 30},
  {look: 'dew-young', size: 240, r: 14},
  {look: 'dew-shrub', size: 170, r: 30},
  {look: 'dew-fern', size: 150, r: 0},
];
// 사람이 나무 뒤(밑동보다 위쪽 · 잎 안)에 들어가면 그 나무를 반투명으로 — 숲속에서 내 캐릭터를 잃지 않게
export const WILD_FADE = {alpha: .45, low: .25};   // low: 그림 높이의 아래 몇 할은 줄기라 가리지 않는다고 본다

const plants = (list) => list.map(([k, x, y, s]) => {
  const p = WILD_PLANTS[k];
  return {id: `wp${x}_${y}`, look: p.look, x, y, size: Math.round(p.size * s), r: Math.round(p.r * s), decor: 1, wild: 1};
});

const GROUND = {base: '#5f7448', spot: ['#66804d', '#566b40'], road: '#a7865f', edge: '#7a6448'};
/* 별이슬숲 — 3200 × 2100. 서쪽 길로 에르덴, 북쪽 길 · 동쪽 길은 다음 장소(아직 없음)로 이어질 자리.
   가운데 빈터 오른쪽 위에 작은 연못. 길 자리는 바닥 그림(design/wilds/dew-forest-ground.webp)에 그려져 있다 */
const DEW = {
  id: 'dew-forest', name: '별이슬숲', w: 3200, h: 2100, top: 170, spawn: [260, 1135],
  exit: {x: 90, y: 1135, r: 60, to: 'dawnwood', label: '에르덴 마을'},
  ground: GROUND, roads: [], pads: [], buildings: [], npcs: [],
  props: plants(DEW_PLANTS),
  sights: [
    {id: 'dew-pond', name: '별이슬 연못', role: '빈터 옆 작은 연못', x: 1958, y: 1000, size: 120, r: 0, bg: 1,
      intro: '이끼 낀 돌이 둘러싼 작은 연못입니다.', lines: ['잎 끝에 맺힌 이슬이 물에 떨어질 때마다 작은 빛이 번집니다.', '밤이 되면 별이 물에 내려앉은 것처럼 보인다고 합니다.']},
  ],
  blocks: [[1958, 875, 150]],   // 연못 — 바닥 그림 속 물
};
export const WILD_MAPS = [DEW];
export const WILD_IDS = WILD_MAPS.map((m) => m.id);
export const WILD_BLOCKS = Object.fromEntries(WILD_MAPS.map((m) => [m.id, m.blocks || []]));

// 에르덴 마을 쪽 문 — 동쪽 가장자리(마을 새 좌표). back 은 별이슬숲에서 돌아올 때 서는 자리
export const WILD_VILLAGE_GATE = {x: 3110, y: 900, r: 50, to: 'dew-forest', back: [2960, 900], label: '별이슬숲'};
