/* 맵 불러오기 화면의 꾸밈 — 맵 종류마다 일러스트 한 장 · 이름 위의 작은 글 · 팁 한 줄(11월 7일).
   그림은 public/assets/ui/loading/<scene>.webp(1280×720). 진행 · 걷힘은 mapLoad.js 가 맡고 여기는 보이는 글과 그림만 고른다. */
import {STORY_MAPS} from './storyData.js';
import { HIGH_BY_ID } from './highData.js';

const SCENES = ['town', 'field', 'dungeon', 'abyss', 'worldboss', 'story'];
export const loadArt = (scene) => `/assets/ui/loading/${scene}.webp`;
export const LOAD_ART_ALL = SCENES.map(loadArt);

const STORY_CH = Object.fromEntries(STORY_MAPS.map((m) => [m.id, m.ch]));

// 맵 → { scene, tag }. M 은 rpg.js MAPS 의 맵(dungeon · safe · deep · abyss · wb 같은 꼬리표를 쓴다)
export function loadInfo(id, M) {
  if (STORY_CH[id]) return {scene: 'story', tag: `메인 이야기 · ${STORY_CH[id]}장`};
  if (id === 'dawnwood') return {scene: 'town', tag: '메인 이야기의 시작'};
  if (!M) return {scene: 'field', tag: '사냥터'};
  if (M.abyss) return {scene: 'abyss', tag: '심연의 탑'};
  if (M.high) { const d = HIGH_BY_ID[id]; return {scene: 'abyss', tag: d ? `${d.lv[0]}~${d.lv[1]}레벨 사냥터` : '깊은 사냥터'}; }   // 800~1200(테스트 서버 먼저)
  if (M.deep) return {scene: 'abyss', tag: '깊은 사냥터'};
  if (M.worldBoss) return {scene: 'worldboss', tag: '월드보스'};
  if (M.dungeon) return {scene: 'dungeon', tag: M.guildRaid ? '길드 토벌' : '던전'};
  if (M.guildHall) return {scene: 'town', tag: '길드 광장'};
  if (M.race) return {scene: 'town', tag: '몹 레이스'};
  if (M.safe) return {scene: 'town', tag: '쉬어 가는 곳'};
  if (M.pvp) return {scene: 'field', tag: '결투장'};
  if (M.train) return {scene: 'field', tag: '훈련장'};
  return {scene: 'field', tag: '사냥터'};
}

// 팁 — 코드와 기획에서 정해진 사실만 적는다. 숨은 요소(이스터에그)는 적지 않는다.
export const LOAD_TIPS = [
  '광장 북쪽 문으로 가면 에르덴 마을이 나오고, 메인 이야기가 시작됩니다.',
  '심연의 탑은 400레벨부터 오릅니다. 층은 끝없이 이어지고 주간 순위가 있습니다.',
  '최고 레벨은 800입니다. 200레벨이 되면 1차 전직을 할 수 있습니다.',
  '스탯은 다섯 가지이고, 하나에 800까지 올릴 수 있습니다.',
  '서버 하나에 최대 10명이 함께 지냅니다.',
  '월드보스는 서버마다 따로 나타납니다.',
  '거래는 품목 12개까지, 제한 시간은 3분입니다.',
  '장터 게시판은 5칸에 48시간 동안 올릴 수 있고, 수수료는 5%입니다.',
  '길드를 만들어 함께 토벌에 나설 수 있습니다.',
  '광장에서는 몹 레이스를 즐길 수 있습니다.',
  '결투장에서 다른 모험가와 겨룰 수 있습니다.',
  '캐릭터는 이름과 숫자 5자리 코드로 저장됩니다. 코드는 꼭 적어 두세요.',
  '바닥을 눌러서도 움직일 수 있습니다.',
  '이야기 속 장소는 안전 지역입니다. 서두르지 않아도 됩니다.',
];
export const randomTip = (prev) => {
  let t; do t = LOAD_TIPS[Math.floor(Math.random() * LOAD_TIPS.length)]; while (t === prev && LOAD_TIPS.length > 1);
  return t;
};
