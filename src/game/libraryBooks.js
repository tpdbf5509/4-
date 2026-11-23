/* 에르덴 도서관 장서(11월 16일, 사용자 원고 「에르덴 도서관 장서 11권」) — 책장 화면 · 독서 화면(LibraryPanel.jsx)이 쓴다.
   본문은 원고 그대로. 문장 · 줄바꿈을 고칠 때는 여기만 고친다. 쪽마다 줄(블록) 목록:
   문자열 = 문단 · {say} 대사 · {hand} 손글씨 메모 · {check: [항목, 결과]} 검사 칸 · {ill} 삽화(LIB_ART.ill) · {end} 맺는 문장.
   look 은 책 종류(책등 색 · 본문 꾸밈 — style.css .lib-*), spine 은 책등에 세로로 적는 짧은 이름. 저장 값이 아니므로 차례 · id 를 바꿔도 된다.
   only: 'luen' 인 책은 루엔 도서관에서 그 루트가 보이는 사람에게만 꽂힌다(libBooksFor). */
import { wqOn } from './wyvernQuest.js';
import { WQ_VERSE } from './wyvernQuestData.js';

// 펼친 책 바탕(공용) · 삽화. 그림이 없으면 CSS 종이색으로 그린다
export const LIB_ART = {
  open: '/assets/game/rpg/library/book-open.webp',
  ill: {'red-river': '/assets/game/rpg/library/ill-red-river.webp', lia: '/assets/game/rpg/library/ill-lia.webp'},
};

export const LIB_TABS = [
  {id: 'village', name: '마을 기록'},
  {id: 'convoy', name: '수송대'},
  {id: 'legend', name: '전설 · 민담'},
];

/* 열람 시점(원고의 책장 배치 제안) — 이 장까지 마쳐야 꽂힌다. 0 은 처음 방문부터. 관리자 · 이야기를 마친 사람은 모두 열림 */
export const LIB_OPEN_AFTER = {guard: 1, check: 1, festival: 4, lia: 4};

export const LIB_BOOKS = [
  {id: 'north-bell', spine: '북문의 종', tab: 'village', look: 'guide', title: '북문에서 종이 울리면', by: '에르덴 경비대 필사본', pages: [
    ['북문에서 귀환 종이 울리면 마차가 들어올 길을 비워 두십시오. 짐꾼을 찾는 분은 우물가에서, 가족을 기다리는 분은 문 안쪽에서 기다리면 됩니다.'],
    ['종이 울렸는데 문이 닫히면 경비가 손을 내릴 때까지 그 자리에 계십시오. 문 바로 앞에 서 있으면 안에서 빗장을 거는 사람이 바깥을 볼 수 없습니다.'],
  ]},
  {id: 'first-visit', spine: '처음 오셨다면', tab: 'village', look: 'guide', title: '에르덴에 처음 오셨다면', by: '여관 주인', pages: [
    ['길을 잃으면 우물부터 찾으십시오. 대장간은 망치 소리가 나는 쪽이고, 여관은 젖은 장화를 문밖에 세워 둔 집입니다. 우물 손잡이가 뻑뻑하면 옆에 걸린 작은 바가지를 쓰십시오.'],
    ['저녁 손님은 도착하기 전에 빵을 예약해 두면 좋습니다. 북문에 수송대가 들어오는 날은 남은 빵까지 짐꾼들이 쓸어 갑니다. 이 안내문은 빵이 다 팔린 날에 썼습니다.'],
  ]},
  {id: 'moon-well', spine: '우물의 달', tab: 'legend', look: 'tale', title: '우물에 빠진 달', by: '에르덴에서 전해 오는 이야기', pages: [
    ['아이는 우물에 달이 빠진 줄 알고 밤새 두레박을 내렸습니다. 물을 길어 올릴 때마다 양동이 안에 작은 달이 하나씩 생겼습니다.'],
    ['새벽에 어른들이 우물가로 나오자 아이가 말했습니다.', {say: '“큰 달은 못 건졌어요. 대신 내일 아침 쓸 물을 길어 놨어요.”'}, '그날 동네 사람들은 달 이야기를 들으며 아침을 지었습니다.'],
  ]},
  {id: 'smith-ledger', spine: '외상 장부', tab: 'village', look: 'ledger', title: '대장간 외상 장부', by: '대장간 주인', pages: [
    ['여관. 솥 손잡이 하나. 식사 두 끼로 받음.', '경비대. 북문 빗장 보강. 다음 교대 때 받기로 함.', '리아네. 작은 시계 뒷판에 넣을 나사 하나. 맞는 크기가 들어오면 따로 빼둘 것.'],
    ['맨 아래에 연필로 적힌 글씨가 있다.', {hand: '‘시계가 돌아가면 몇 시로 맞춰야 하나요? 아빠가 집에 오는 시간으로 해 주세요.’'}],
  ]},
  {id: 'wolf-road', spine: '늑대 숲', tab: 'convoy', look: 'field', title: '늑대 숲에서 돌아오는 법', by: '수송대 길잡이의 수첩', pages: [
    ['돌아가는 길에 어두워질 것 같으면 갈림길을 지날 때마다 지나온 쪽을 한 번 돌아보십시오. 갈 때 등에 둔 바위가 돌아올 때는 얼굴처럼 보이기도 합니다. 숲에서 서로 부를 때는 소리치기 전에 발밑부터 보십시오.'],
    ['진흙에 바퀴 자국이 겹쳐 있으면 바깥쪽까지 살피십시오. 평소라면 마차 옆에 장화 자국이 섞여 있습니다. 발자국이 하나도 없으면 가장 먼저 근처에 마차를 세울 만한 곳부터 확인하십시오.'],
  ]},
  {id: 'potion-names', spine: '약병 이름', tab: 'village', look: 'memo', title: '약병에 이름을 쓰는 이유', by: '미나', pages: [
    ['어제 두 사람이 약병을 바꿔 들고 갔다. 같은 갈색 병이라 그랬다고 한다. 오늘부터는 병마다 환자 이름을 쓰고, 읽기 힘든 사람에겐 병목에 매듭을 묶어 알려 줬다.'],
    ['고장 난 장치를 맡기고 갈 때도 쪽지를 붙여 주면 좋겠다. 어디서 주웠고 처음에 어떤 소리를 냈는지만 적어도 된다. 수리하고 나면 처음 상태를 다시 볼 방법이 없다.'],
  ]},
  {id: 'guard', spine: '교대 일지', tab: 'convoy', look: 'log', title: '북문 교대 일지', by: '이름이 지워진 경비병', pages: [
    ['해 질 무렵. 수송대의 호위병이 돌아오는지 먼저 묻는 아이가 있었다. 아버지가 타는 마차에 달린 등에 금이 가 있어서 멀리서도 알아볼 수 있다고 했다.'],
    ['그날 저녁 귀환 종이 울렸다. 안으로 들인 마차에는 젖은 담요 두 장이 남아 있었다. 인수표의 탑승자 칸에는 ‘없음’이라고 적었다. 아이가 가리킨 등은 기름이 남아 있는데도 꺼져 있었다.'],
  ]},
  {id: 'check', spine: '인수 검사표', tab: 'convoy', look: 'check', title: '호위병 인수 검사표', by: '수송대 보관용 사본', pages: [
    [{check: ['정지 명령', '통과']}, {check: ['지정 화물 회수', '통과']}, {check: ['대열 이탈 감지', '통과']}],
    [{hand: '수송대 메모. ‘화물과 부상자가 함께 남았을 경우 어느 쪽부터 회수합니까?’'}, '답변란에는 서명이 하나 있다. 그 아래 두 줄은 종이를 긁어낸 듯 얇아져 있다.', {scrape: 2}],
  ]},
  {id: 'festival', spine: '빈 그릇', tab: 'village', look: 'inn', title: '축제에 올릴 빈 그릇', by: '에르덴 여관', pages: [
    ['광장에 접이식 탁자 셋을 내놨다. 바람이 세서 천 끝을 빵 바구니로 눌러 뒀다. 아이들은 따뜻할 때 먼저 퍼 줬고, 늦게 오는 사람 몫은 불 옆에 두었다.'],
    ['리아가 그릇 하나를 북문이 보이는 탁자로 옮겼다. 자리가 바뀌면 아빠가 헤맬 테니 치우지 말아 달라고 했다. 밤에 그릇을 걷을 때, 그 자리에 수저만 남겨 두었다.'],
  ]},
  {id: 'lia', spine: '리아의 수첩', tab: 'village', look: 'lia', title: '아빠가 돌아오면 물어볼 것', by: '리아', pages: [
    [{ill: 'lia'}, '시계 바늘은 왜 계속 같은 데서 걸리는지.', '숲에서 자면 진짜로 새 소리 때문에 일찍 깨는지.', '수송대 사람들은 집에 오면 뭐부터 먹고 싶은지.'],
    ['다 적었는데 아빠한테 제일 먼저 할 말은 빠졌다. 다음 장에 쓰려고 했는데 자꾸 문이 열리는 소리가 나서 책을 덮었다.'],
  ]},
  // BLOOD-001 설화 — 책장에서는 평범한 옛이야기. 단서(001)는 오른쪽 쪽 마지막 문장에만 둔다(사용자 기획)
  {id: 'red-river', spine: '붉은 강', tab: 'legend', look: 'red', title: '붉은 강이 거꾸로 흐른 밤', by: '작자 미상 · 에르덴 구전 설화를 옮겨 적은 책', pages: [
    [{ill: 'red-river'}, '옛날 에르덴 북쪽 산에는 창문이 하나도 없는 집이 있었다. 그 집에서 나온 사내가 처음 마을에 내려온 날, 아이 하나가 그의 손등을 가리켰다.',
      {say: '“아저씨, 피가 떨어져요.”'},
      '사내는 손을 펴 보였다. 피는 바닥에 닿기 전에 좁쌀만 한 알로 뭉쳤다. 그가 손을 털자 붉은 알이 우물가의 돌을 꿰뚫었다. 돌 뒤에 닿은 순간 알이 한꺼번에 부풀어 우물 뚜껑까지 날아갔다.',
      '사내는 뚜껑을 주워 우물에 올려놓고 아이에게 말했다.', {say: '“다음엔 더 작은 돌로 해 볼게.”'}],
    ['이튿날 밤, 산 위의 집에서 종이 울렸다. 문을 닫으러 들어간 사람이 마지막으로 본 것은 계단을 거꾸로 오르는 붉은 물이었다. 물은 복도를 돌아 사내의 발치에 모였다. 그가 두 팔을 벌리자 피가 방패처럼 굳어 문틈을 막았다. 사람들은 그 틈에 밖으로 달아났다.',
      '새벽에 돌아온 경비병은 바깥에서 문을 돌로 막았다. 마을 사람들은 그 집 앞을 지날 때 문을 두드리지 않았다. 안에서 먼저 두드리는 소리를 들었다는 사람이 있었기 때문이다.',
      '이야기를 처음 옮겨 적은 사람은 책 끝에 이렇게 덧붙였다.',
      {end: '“사내의 이름을 기억하는 이는 없었다. 그가 입고 나온 옷의 목깃에는 붉은 실로 001이 수놓여 있었다고 한다.”'}],
  ]},
  // Wyvern Knight 006 획득 루트 첫 단서 — 루엔 도서관에만. 마지막 쪽을 펼친 채 덮으면 루트가 시작된다(안내는 띄우지 않는다)
  {id: 'north-steps', spine: '북쪽 발자국', tab: 'legend', look: 'wing', only: 'luen', title: '북쪽으로 사라진 발자국', by: '루엔에서 전해 오는 노래를 옮겨 적은 책', pages: [
    ['루엔이 아직 목책 마을이던 때, 마을에는 기사가 한 사람 있었다. 그는 말을 타고 서리봉 아래 길을 오르내리며 길 잃은 짐꾼을 데려왔다.',
      '겨울마다 그는 산으로 올라가 며칠씩 내려오지 않았다. 마을 사람들은 그가 산꼭대기의 옛 신전에 기도하러 간다고 생각했다.',
      {say: '“산에 친구가 있어.”'}, '아이들이 물으면 그는 그렇게만 대답했다.'],
    ['그해 겨울은 길었다. 눈사태가 길을 덮고 북쪽 하늘이 사흘 동안 붉었다. 기사는 말을 끌고 산으로 올라갔다.',
      ...WQ_VERSE.slice(0, 3),
      {end: WQ_VERSE[3]}],
  ]},
];
export const LIB_BOOK_BY_ID = Object.fromEntries(LIB_BOOKS.map((b) => [b.id, b]));

/* 책 종류마다 책등 색 · 무늬(글리프). 본문 꾸밈은 CSS 가 look 이름으로 고른다 */
export const LIB_LOOKS = {
  guide: {spine: '#b89a6a', band: '#7a5d38', mark: '❦'},   // 마을 안내서 — 밝은 황갈색 천
  tale: {spine: '#3f5a72', band: '#c9a95c', mark: '☾'},    // 옛이야기 — 바랜 남색 천
  ledger: {spine: '#6d6a62', band: '#3f3c36', mark: '⚒'},  // 장부 — 회색
  field: {spine: '#4c6148', band: '#2f3d2c', mark: '⟰'},   // 길잡이 수첩 — 짙은 녹색
  memo: {spine: '#8a9b98', band: '#55625f', mark: '✚'},     // 미나의 메모 — 회청색
  log: {spine: '#3d5243', band: '#c3a866', mark: '⚑'},     // 경비 일지 — 짙은 녹색
  check: {spine: '#5f6366', band: '#c3a866', mark: '☑'},   // 검사표 — 회색
  inn: {spine: '#a8704a', band: '#6e4428', mark: '❀'},     // 여관 기록 — 주황 갈색
  lia: {spine: '#ddd2bb', band: '#a99a7c', mark: '✎'},     // 리아의 수첩 — 얇은 종이 표지
  red: {spine: '#7a3a32', band: '#c29a5c', mark: '❧'},     // 붉은 강 — 바랜 적갈색 천
  wing: {spine: '#5a6672', band: '#b8a27a', mark: '⟡'},    // 북쪽 발자국 — 서리 낀 청회색 천
};

// 책장 채우기 — 고를 수 없는 꽂이 책(색 · 굵기 · 높이 · 무늬). 탭마다 정해진 씨앗으로 같은 모양
const FILL_COLORS = ['#4a5e44', '#6e3b34', '#7a5a3a', '#cbb78f', '#3e4c5e', '#8a6b45', '#5b4636', '#6b7350', '#9a7b52', '#4f3a48'];
const FILL_MARKS = ['', '✦', '❖', '✧', '◆', '❦', ''];
// 이 사람 · 이 도서관에 꽂히는 책 — only 책은 루엔 도서관에서 루트가 보일 때만
export const libBooksFor = (hero) => LIB_BOOKS.filter((b) => !b.only || (b.only === 'luen' && String(hero?.map || '').startsWith('luen-library') && wqOn(hero)));
export function shelfRows(tab, hero) {
  let seed = tab.length * 977 + tab.charCodeAt(0) * 31;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const real = libBooksFor(hero).filter((b) => b.tab === tab);
  const rows = [[], []], PER = 13;
  // 진짜 책은 두 줄에 번갈아 흩어 꽂는다
  const at = real.map((b, k) => ({b, row: k % 2, slot: 1 + Math.floor(k / 2) * 4 + (k % 2) * 2 + Math.floor(rnd() * 2)}));
  for (let r = 0; r < 2; r++) for (let s = 0; s < PER; s++) {
    const hit = at.find((q) => q.row === r && q.slot === s);
    if (hit) { rows[r].push({book: hit.b}); continue; }
    rows[r].push({fill: 1, c: FILL_COLORS[Math.floor(rnd() * FILL_COLORS.length)], w: 26 + Math.floor(rnd() * 16), h: 78 + Math.floor(rnd() * 20),
      m: FILL_MARKS[Math.floor(rnd() * FILL_MARKS.length)], band: rnd() < 0.5});
  }
  return rows;
}

/* 열려 있는지 — story 는 화면의 me.story(storyQuest.js storyView). 이야기가 꺼져 있으면 처음 방문 책만 */
export function libBookOpen(book, story, admin) {
  const need = LIB_OPEN_AFTER[book.id] || 0;
  if (!need || admin) return true;
  if (!story) return false;
  return !!story.done || (story.ch || 0) > need;
}
export const libLockWhy = (book) => `메인 이야기 ${LIB_OPEN_AFTER[book.id]}장을 마치면 꽂힙니다.`;
