/* 이야기 컷신(11월 22일 사용자 「컷신을 만들어 줘. 클로즈업 등 짧은 영화처럼」) — 장면(shot)을 차례로 이어 붙인 짧은 영상.
   대화 줄에 cut(id) 를 두면 대화 창이 그 자리에서 이 컷신을 틀고 끝나면 다음 줄로 넘어간다(storyLines.js cut · VillagePanel).
   판정 · 저장과 상관없는 화면 연출이다. 그리기는 cutsceneArt.js, 재생 창은 Cutscene.jsx.

   좌표는 가상 무대 1600 × 900. 그림 층은 아래 가운데가 기준점(x, y)이고 높이 h 로 맞춘다.
   shot 칸
     ms     장면 길이(밀리초)
     bg     바탕 — dusk(해 질 녘 마을) · dusk-dark(해가 진 뒤) · black
     layers 그림 층 [{img, x, y, h, to:[x, y](장면 동안 옮김), sway(흔들림 각도), bob(뛰는 들썩임)}]
     cam    카메라 [[x, y, 배율] 시작, [x, y, 배율] 끝] — 배율 1 이면 무대 전체, 클수록 클로즈업
     grade  색 — warm(노을) · cold(식은 푸른빛) · mono(흑백). 비우면 그대로
     accent 색 보정 뒤에 얹는 강조(흑백 화면에 붉은빛 하나) [{x, y, r, c}]
     fx     motes(떠다니는 빛 알갱이) · dust(먼지) · rings(종소리 파문) · speed(달리는 선) · shake(흔들림)
     in     장면 들어오기 — cut(바로) · black(어둠에서) · white(번쩍)
     text   아래 띠 자막
     snd    [[초, 소리 이름]] — sfx.js */
import {storyArtPath} from './storyData.js';
import {villageArtPath} from './villageData.js';

// 공통 수치 — 위아래 띠 · 자막 · 들고 나는 시간(초)
export const CUT = {
  bar: 0.12,        // 위아래 검은 띠 높이(화면 높이의 몫)
  barIn: 0.5,       // 띠가 들어오고 나가는 시간
  textFade: 0.3,    // 자막이 나타나고 사라지는 시간
  fadeIn: 0.35,     // in: black · white 가 걷히는 시간
  shakePx: 9,       // 흔들림 크기(무대 좌표)
  shakeT: 0.45,     // 흔들림이 잦아드는 시간
  loadMax: 1500,
  skipLock: 700,    // 시작 뒤 이만큼(밀리초)은 건너뛰기를 받지 않는다 — 넘기던 키가 이어져 바로 건너뛰지 않게    // 그림을 기다리는 최대 시간(밀리초) — 넘으면 있는 것만 그린다
};

const LIA = storyArtPath('portraits', 'lia');          // 512 정사각 초상 — 오른쪽 아래에 손에 쥔 시계
const LIA_BODY = storyArtPath('people', 'lia');
const BELL = villageArtPath('bell');
const GATE = villageArtPath('gate');
const GATE_DOOR = villageArtPath('gate-door');
const WAGON = storyArtPath('places', 'convoy-wagon-1');

// 초상화를 무대 가운데에 크게 세운 층 — 클로즈업은 카메라 배율로 한 부분만 잡는다
const face = (img) => ({img, x: 800, y: 900, h: 900});

export const CUTSCENES = {
  // 1장 1-01 첫머리 — 노을 진 마을, 시계를 쥔 손, 북문을 보는 아이
  'c1-open': [
    {ms: 3400, bg: 'dusk', in: 'black', grade: 'warm', fx: ['motes'],
      layers: [{img: GATE, x: 800, y: 770, h: 430}, {img: LIA_BODY, x: 1010, y: 800, h: 190}],
      cam: [[800, 520, 1.0], [880, 570, 1.18]],
      text: '석양이 내려앉은 에르덴. 장사꾼의 웃음과 대장간 망치 소리가 들립니다.'},
    {ms: 2600, bg: 'dusk', grade: 'warm', fx: ['motes'],
      layers: [face(LIA)], cam: [[985, 790, 3.1], [1000, 750, 3.4]],
      text: '낡은 목걸이를 쥔 아이가'},
    {ms: 2800, bg: 'dusk', grade: 'warm', fx: ['motes'],
      layers: [face(LIA)], cam: [[740, 350, 2.3], [790, 330, 2.6]],
      text: '북문 쪽을 바라보고 있습니다.'},
  ],
  // 1장 1-01 끝 — 귀환 종, 달려가는 아이, 열리는 문, 사람이 없는 마차(흑백 + 붉은 이빨 자국)
  'c1-wagon': [
    {ms: 2300, bg: 'dusk', grade: 'warm', fx: ['rings', 'shake'], in: 'cut',
      layers: [{img: BELL, x: 800, y: 900, h: 780, sway: 0.08}], cam: [[800, 430, 1.75], [800, 440, 1.95]],
      text: '북문의 귀환 종이 울립니다.', snd: [[0.05, 'cutBell'], [1.1, 'cutBell']]},
    {ms: 1700, bg: 'dusk', grade: 'warm', fx: ['speed', 'motes'],
      layers: [{img: LIA_BODY, x: 560, y: 800, h: 300, to: [1040, 800], bob: 10}], cam: [[640, 650, 1.7], [1000, 650, 1.7]],
      text: '리아가 달려가다'},
    {ms: 1500, bg: 'dusk-dark', grade: 'cold',
      layers: [face(LIA)], cam: [[775, 345, 2.9], [775, 340, 3.05]],
      text: '멈춥니다.'},
    {ms: 1700, bg: 'dusk-dark', grade: 'cold', fx: ['dust'],
      layers: [{img: GATE_DOOR, x: 800, y: 860, h: 640}], cam: [[800, 560, 1.15], [800, 560, 1.5]],
      snd: [[0.2, 'cutRumble']]},
    {ms: 3600, bg: 'dusk-dark', grade: 'mono', fx: ['dust', 'shake'], in: 'white',
      layers: [{img: WAGON, x: 800, y: 830, h: 640}], cam: [[800, 520, 1.1], [990, 420, 2.0]],
      accent: [{x: 955, y: 455, r: 28, c: '#c0463a'}],   // 바퀴살에 걸린 금속 늑대의 이빨
      text: '돌아온 것은 사람이 없는 찢긴 마차 한 대.', snd: [[0, 'boom']]},
  ],
};

// 컷신 하나의 전체 길이(밀리초)
export const cutLength = (id) => (CUTSCENES[id] || []).reduce((s, x) => s + x.ms, 0);
// 걸린 시각(밀리초)이 몇 번째 장면의 몇 밀리초인지 — 끝을 넘으면 null
export function shotAt(id, ms) {
  const list = CUTSCENES[id] || [];
  let t = ms;
  for (let i = 0; i < list.length; i++) { if (t < list[i].ms) return {i, shot: list[i], t}; t -= list[i].ms; }
  return null;
}
// 컷신이 쓰는 그림 목록(미리 불러오기)
export const cutImages = (id) => [...new Set((CUTSCENES[id] || []).flatMap((s) => (s.layers || []).map((l) => l.img)))];
