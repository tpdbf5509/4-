/* 메인 스토리 1부(1~6장) 맵과 인물. 그림은 11월 6일 Codex 정식 그림(public/assets/game/rpg/story/, 원본 design/story/).
   그림 파일이 없을 때만 코드로 그린 임시 도형을 쓴다(경로는 storyArtPath).
   여기 대사는 평소 소개 대화다. 이야기 진행 대사 · 선택지는 storyQuestData.js 에 있다.
   맵 · 인물 · 장소 id 는 이후 이야기 진행에서도 그대로 쓴다. 기준 문서: docs/메인스토리-1부-맵.md */

// 그림 규격 — 마을과 같다. 512×512 투명 WebP, 발 기준 (256,496). 맵 바닥은 ground/<맵 id>.webp 한 장(맵 크기 그대로).
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
};

/* 맵 — 모두 싸울 수 없는 안전 지역이다. 몹 · 보스는 이야기 진행을 만들 때 더한다.
   ground: 바탕 · 얼룩 · 길 색. roads: 길 중심선. pads: 바닥 원(광장 · 전투 자리 표시).
   exit: 에르덴 마을로 돌아가는 문(문 앞이 spawn). links: 다른 이야기 맵으로 가는 문. */
// k — 그림 크기 배수(11월 6일: 서쪽 중력 시설이 작다는 요청으로 1.45). 위치는 그대로, 크기와 막힌 반지름만 곱한다
const RUIN = (id, name, dir, tone, device, mark, k = 1) => ({
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
    {id: `${id}-mark`, name: mark, role: '봉인 표식', x: 820, y: 1000, size: 110 * k, r: 24 * k, look: 'stone',
      intro: '바닥 돌에 같은 기호가 반복해서 새겨져 있습니다.', lines: ['네 방향의 표식은 모양이 모두 다르다고 합니다.', '표식을 따라 장치까지 길이 이어집니다.']},
  ],
  props: [[380, 1050], [1820, 1050], [700, 420], [1500, 420]].map(([x, y]) => ({look: 'pillar', x, y, size: 120 * k, r: 22 * k})),
  npcs: [],
});

export const STORY_MAPS = [
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
        intro: '호위용 기계 병사가 길 끝에 멈춰 서 있습니다.', lines: ['가슴에 낯선 장치가 붙어 있습니다.', '보스 전투는 이야기 진행을 만들 때 더합니다.']},
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
      {id: 'lab7-log', name: '실험 기록 단말', role: '날짜가 맞지 않는 기록', x: 1500, y: 1100, size: 120, r: 26, look: 'terminal',
        intro: '화면에 오래된 실험 기록이 떠 있습니다.', lines: ['일부 기록은 잠겨 있습니다.', '열람 범위: 제한.']},
      {id: 'lab7-core', name: '제어 핵', role: '2장 보스 자리', x: 1440, y: 340, size: 150, r: 34, look: 'device',
        intro: '붉은 빛이 도는 제어 핵입니다.', lines: ['굵은 선이 제로 쪽으로 이어집니다.', '전투는 이야기 진행을 만들 때 더합니다.']},
    ],
    props: [[400, 1300], [2000, 1300], [380, 520], [2020, 520]].map(([x, y]) => ({look: 'crate', x, y, size: 100, r: 24})),
    npcs: [{id: 'zero-lab7', who: 'zero', role: '실험체 · 2장 보스', x: 1200, y: 330,
      intro: '…또 누가 문을 열었군.', lines: ['나는 이곳에서 오래 기다렸다.', '무엇을 기다렸는지는 기억나지 않는다.']}],
  },
  RUIN('ruin-north', '북쪽 빙결 유적', '북', {base: '#8b9ea6', spot: ['rgba(240,250,255,.14)', 'rgba(60,80,96,.08)'], road: '#c3d0d4', edge: '#7a8c94'}, '냉각 제어 핵', '북쪽 봉인 표식'),
  RUIN('ruin-east', '동쪽 번개 유적', '동', {base: '#7a7891', spot: ['rgba(230,226,255,.10)', 'rgba(40,36,64,.10)'], road: '#aaa7bd', edge: '#66637d'}, '과충전 발전기', '동쪽 봉인 표식'),
  RUIN('ruin-south', '남쪽 화염 시설', '남', {base: '#94705f', spot: ['rgba(255,226,196,.09)', 'rgba(70,36,26,.10)'], road: '#c09c84', edge: '#7e5d4d'}, '화염 제어 장치', '남쪽 봉인 표식'),
  RUIN('ruin-west', '서쪽 중력 시설', '서', {base: '#6c6884', spot: ['rgba(220,214,250,.08)', 'rgba(26,22,48,.12)'], road: '#9d98b5', edge: '#57536f'}, '중력 제어 장치', '서쪽 봉인 표식', 1.45),
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
        intro: '거대한 코어가 천천히 맥박칩니다.', lines: ['네 방향에서 굵은 선이 코어로 모입니다.', '보스 전투는 이야기 진행을 만들 때 더합니다.']},
      {id: 'core-module', name: '통제 모듈', role: '아르카의 통제 모듈', x: 640, y: 560, size: 140, r: 32, look: 'terminal',
        intro: '통제 모듈의 화면에 예측 숫자가 흐릅니다.', lines: ['숫자 옆에 확률 표시가 붙어 있습니다.', '이 기록은 4장에서 열람합니다.']},
      {id: 'core-sender', name: '공격 명령 송신기', role: '송신 장치', x: 1760, y: 560, size: 150, r: 34, look: 'device',
        intro: '송신기 끝에서 붉은 신호가 깜박입니다.', lines: ['신호는 마을 쪽을 향합니다.', '4장 마지막에 파괴합니다.']},
      {id: 'core-executor', name: '봉인의 집행자', role: '3장 보스 자리', x: 760, y: 1120, size: 190, r: 44, look: 'robot',
        intro: '거대한 경비 기계가 무릎을 꿇은 채 멈춰 있습니다.', lines: ['네 방향의 문양이 몸에 새겨져 있습니다.', '보스 전투는 이야기 진행을 만들 때 더합니다.']},
    ],
    props: [[560, 1000], [1840, 1000], [1640, 1180]].map(([x, y]) => ({look: 'turret', x, y, size: 110, r: 24})),
    npcs: [{id: 'arka-core', who: 'arka', role: '중앙 관리자 투영 · 4장 보스', x: 1400, y: 860,
      intro: '외부 사용자 확인. 접근 목적을 말하라.', lines: ['나는 이 대륙의 방어를 맡고 있다.', '판단 근거는 기록에 있다.']}],
  },
  {id: 'relay', name: '고대 송신탑', ch: 5, w: 2000, h: 1600, spawn: [1000, 1420], exit: {x: 1000, y: 1540, r: 54},
    ground: {base: '#4d5468', spot: ['rgba(210,220,255,.07)', 'rgba(16,20,36,.12)'], road: '#7f8699', edge: '#3e4456'},
    roads: [{w: 120, pts: [[1000, 1560], [1000, 900], [1000, 660]]}],
    pads: [{x: 1000, y: 700, rx: 320, ry: 150}],
    buildings: [{id: 'relay-tower', name: '고대 송신탑', x: 1000, y: 620, size: 400, look: 'tower'}],
    sights: [
      {id: 'relay-device', name: '고장 난 송신 장치', role: '구조 요청', x: 1300, y: 900, size: 150, r: 34, look: 'device',
        intro: '고장 난 장치에서 짧은 녹음이 반복됩니다.', lines: ['잡음 사이로 사람 목소리가 섞여 있습니다.', '5장에서 수리합니다.']},
      {id: 'relay-lock', name: '보안 장치', role: '신호 경로', x: 700, y: 900, size: 130, r: 30, look: 'terminal',
        intro: '보안 장치가 잠들어 있습니다.', lines: ['푸른 장치를 가까이 대면 반응할 것 같습니다.', '5장에서 켭니다.']},
    ],
    props: [[420, 760], [1580, 760], [520, 1240], [1480, 1240]].map(([x, y]) => ({look: 'pylon', x, y, size: 130, r: 20})),
    npcs: [],
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
      {id: 'mine-plan-1', name: '도면 조각', role: '첫 번째 조각', x: 760, y: 1080, size: 100, r: 22, look: 'paper',
        intro: '흙더미 사이에 낡은 도면 조각이 보입니다.', lines: ['선만 남고 이름 칸이 비어 있습니다.', '보리에게 가져가면 좋겠습니다.']},
      {id: 'mine-plan-2', name: '도면 조각', role: '두 번째 조각', x: 1680, y: 1060, size: 100, r: 22, look: 'paper',
        intro: '광차 아래에 접힌 종이가 끼어 있습니다.', lines: ['같은 도면의 다른 부분입니다.', '이름 칸은 역시 비어 있습니다.']},
      {id: 'mine-plan-3', name: '도면 조각', role: '세 번째 조각', x: 1560, y: 520, size: 100, r: 22, look: 'paper',
        intro: '갱목 틈에 마지막 조각이 꽂혀 있습니다.', lines: ['세 조각을 맞추면 도면이 됩니다.', '6장에서 모읍니다.']},
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
        intro: '책상 위에 큰 설계도가 펼쳐져 있습니다.', lines: ['한구석에 다섯 번째 기호가 보입니다.', '서명 칸은 6장에서 해독합니다.']},
    ],
    props: [
      ...[360, 600, 1600, 1840].flatMap((x) => [420, 760, 1100].map((y) => ({look: 'shelf', x, y, size: 150, r: 34}))),
    ],
    npcs: [{id: 'irion-vault', who: 'irion', role: '고대 기록 해석자', x: 880, y: 680,
      intro: '글자를 읽고 싶다면 도와드리죠.', lines: ['하지만 마지막 문장은 읽지 마세요.', '이유는… 나중에 말씀드리죠.']}],
  },
];

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
    {id: 'sera', who: 'sera', x: 600, y: 1090,
      intro: '아직 몸이 다 낫지 않았어요.', lines: ['저는 북쪽 수송대에 있었어요.', '무슨 일이 있었는지 끝까지 알아내고 싶어요.']},
  ],
};
// 마을 범위를 넓히며(11월 6일) 옛 좌표를 새 마을 좌표로 옮긴다
export const STORY_VILLAGE = {buildings: STORY_VILLAGE_RAW.buildings.map(villageAt), npcs: STORY_VILLAGE_RAW.npcs.map(villageAt)};

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
