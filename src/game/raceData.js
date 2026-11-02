/* 광장 미니게임 — 몹 레이스. 수치는 이 파일 한 곳에서 고친다. 규칙은 race.js, 그림은 raceArt.js, 창은 RacePanel.jsx.
   광장의 레이스 관리인에게 참가하면 모집 시간이 끝날 때 전용 트랙(race 맵)으로 옮겨 가 몹을 타고 달린다.
   질주를 누르고 있으면 빨라지지만 체력을 쓴다. 체력이 바닥나면 지쳐서 한동안 느려진다 — 체력을 나눠 쓰는 것이 핵심이다.
   카트 레이스처럼 위아래로 몰고(조향) · 부스터 발판 · 진흙 · 아이템 상자(부스터 · 미끄럼 점액 · 방패)가 있다(11월 2일 사용자 요청) */
export const RACE = {
  npc: { x: 250, y: 700 },         // 광장 레이스 관리인 자리(훈련장 문과 계몽의 문 사이 빈 풀밭)
  backAt: [330, 760],              // 끝나면 광장의 이 자리 둘레로 돌아온다
  map: { w: 9000, h: 1200 },       // 트랙 맵 크기 — 가로로 길게
  startX: 360, finishX: 8600,      // 출발선 · 결승선(거리 8,240 — 잘 달리면 21초쯤)
  laneY0: 470, laneGap: 110,       // 첫 줄 높이 · 줄 간격(출발 자리 · 발판 · 상자 자리)
  max: 5,                          // 한 번에 달리는 사람 수(줄 수) — 사용자 결정 2~5명
  openT: 20,                       // 첫 참가부터 출발까지 모집 시간(초)
  fullT: 3,                        // 자리가 다 차면 이만큼 뒤에 바로 출발
  readyT: 3,                       // 출발선에서 세는 시간
  limit: 60,                       // 출발 뒤 이 시간이 지나면 끝(못 들어온 사람은 완주 실패)
  after: 15,                       // 첫 사람이 들어온 뒤 남은 사람에게 주는 시간
  endT: 6,                         // 결과를 보여 주고 광장으로 돌려보내기까지
  tired: 0.55,                     // 지쳤을 때 빠르기(기본 빠르기에 곱한다)
  tiredBack: 0.35,                 // 지친 뒤 체력이 이 몫까지 차야 다시 질주할 수 있다
  // 보상 — 2명이 모여야 출발한다(혼자면 모집을 계속한다). 참가비는 없다. 하루 보상 횟수는 bag.day.race 로 센다
  minRacers: 2,
  prize: [5000, 2500, 1200],       // 1 · 2 · 3등 코인
  finishCoin: 400,                 // 4등 아래 완주 코인
  daily: 10,                       // 하루에 보상을 받는 레이스 수(한국 날짜)
  results: 5,                      // 창에 남기는 지난 레이스 결과 줄 수
  // 조향 — 위아래 키 · 조이스틱으로 줄을 옮긴다. 트랙 위아래 끝에서 멈춘다
  steer: 300,                      // 위아래로 움직이는 빠르기(px/초)
  edge: 34,                        // 첫 줄 · 끝 줄 바깥으로 더 갈 수 있는 거리
  // 부스터 — 발판을 밟거나 아이템을 쓰면 boost 초 동안 질주 빠르기 × boostMul. 체력은 쓰지 않는다
  boostMul: 1.3, padT: 1.0, itemBoostT: 2.0,
  padW: 120, padH: 60,             // 발판 크기
  // 느려짐 — 진흙 안에 있는 동안 · 점액을 밟으면 slimeT 초 동안 빠르기 × slowMul. 방패가 있으면 막는다
  slowMul: 0.55, slimeT: 1.3, slimeLife: 25, slimeR: 34, mudRx: 110, mudRy: 40,
  shieldT: 6,                      // 방패가 지켜 주는 초
  boxR: 56,                        // 아이템 상자를 줍는 거리(줄 간격의 절반 — 상자 줄을 지나면 어느 높이든 하나를 줍는다)
  // 아이템 확률 — [1등일 때, 꼴등일 때] 무게. 등수에 따라 사이 값을 쓴다(뒤처질수록 부스터가 잘 나온다)
  itemOdds: { boost: [20, 65], slime: [55, 15], shield: [25, 20] },
};
export const RACE_ITEMS = { boost: "부스터", slime: "미끄럼 점액", shield: "방패" };
// 트랙 배치 — lane 은 줄 번호(0~4). 상자 줄은 다섯 줄에 하나씩 놓는다
export const RACE_BOXES = [1500, 3300, 5100, 6900].flatMap((x, row) => [0, 1, 2, 3, 4].map((lane) => ({ id: row * 5 + lane, x, lane })));
export const RACE_PADS = [[1000, 1], [2300, 3], [2900, 0], [4200, 2], [4700, 4], [6000, 1], [7600, 3], [6400, 4]].map(([x, lane]) => ({ x, lane }));
export const RACE_MUDS = [[1900, 2], [3800, 0], [3800, 4], [5600, 3], [7200, 1], [2600, 4]].map(([x, lane]) => ({ x, lane }));

/* 탈것 — 사냥터의 일반 몹. mob 은 그림(rpgArt.js MOB_DRAW) 종류.
   cruise 기본 빠르기 · sprint 질주 빠르기 · st 체력(질주할 수 있는 초) · regen 질주하지 않을 때 초당 차는 체력 · acc 빠르기가 붙는 정도.
   잘 나눠 쓰면 모두 21초 안팎으로 들어오게 맞췄다(tools/race.test.mjs 가 차이 3% 안을 확인한다).
   size 그림 크기 · ride 영웅을 올리는 높이(px) — 그림만 바꾼다. 스냅샷은 id 를 그대로 싣는다 */
export const RACE_MOUNTS = [
  { id: "rabbit", mob: "rabbit", name: "토끼", tip: "빨리 붙고 빨리 회복한다", cruise: 315, sprint: 463, st: 3, regen: 1.0, acc: 4, size: 2.2, ride: 30 },
  { id: "wolf", mob: "wolf", name: "늑대", tip: "고르게 무난하다", cruise: 318, sprint: 492, st: 4, regen: 0.6, acc: 2.6, size: 1.15, ride: 34 },
  { id: "boar", mob: "boar", name: "멧돼지", tip: "질주가 가장 빠르지만 금방 지친다", cruise: 290, sprint: 580, st: 3, regen: 0.42, acc: 2.2, size: 1.45, ride: 46 },
  { id: "gorilla", mob: "gorilla", name: "고릴라", tip: "오래 질주한다", cruise: 300, sprint: 476, st: 8, regen: 0.5, acc: 2, size: 1.3, ride: 62 },
  { id: "chimera", mob: "chimera", name: "키메라", tip: "기본이 빠르고 회복이 느리다", cruise: 363, sprint: 470, st: 3, regen: 0.32, acc: 2.4, size: 1.3, ride: 56 },
  { id: "spider", mob: "spider", name: "포식거미", tip: "질주가 빠르고 무난히 버틴다", cruise: 312, sprint: 505, st: 5, regen: 0.42, acc: 3, size: 1.25, ride: 40 },
];
export const MOUNT_BY_ID = Object.fromEntries(RACE_MOUNTS.map((m) => [m.id, m]));
export const laneY = (lane) => RACE.laneY0 + lane * RACE.laneGap;
