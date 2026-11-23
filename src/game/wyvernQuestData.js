/* ── 히든 직업 Wyvern Knight 006 획득 루트 「잠든 날개의 서약」 — 맵 · 조사 자리 · 퍼즐 · 대사 · 시련 수치 한 곳(11월 23일) ─────────────
   사용자 기획안 「와이번나이트006_잠든날개의서약_획득루트_초안」을 따른다. 규칙은 wyvernQuest.js, 그림은 wyvernQuestArt.js, 창은 WyvernQuestPanel.jsx.
   Illusionist 005(illusionQuestData.js)와 같은 틀이다. 히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.
   사용자 지시 — 마을 · 광장에 눈에 띄는 새 물건을 두지 않는다. 루엔 주민(서하 · 마루 · 새봄 · 단우)과 고개 등불 · 서리봉 전망 바위는
     원래 말 걸기 칸에 단추 하나만 더한다. 서리봉 북쪽 막다른 곳의 바위 셋만 원래 맵에 놓는다(기획안 2장 — 산 바위라 풍경에 섞인다).
   퍼즐 · 중요한 건축물(신전 돌문 · 시련의 문 · 맹세의 문 · 제단 · 석등 · 석상 · 바위)은 바닥 그림과 따로 그린 낱장이고 열림 · 닫힘이 보인다(사용자 지시).
   공개: WQ_ROUTE.live = false — 사용자가 확인하기 전까지 테스트 서버(?test, g.test)에서만 열린다. 실제 게임에는 단서도 보이지 않는다.
   "정한 해석"은 기획안이 비워 둔 곳을 정한 값이다(docs/작업-상세-기록.md 끝). */
import { WILD_MAPS, LUEN_LIBRARY_MAPS } from './wildsData.js';

export const WQ_ROUTE = { live: false };   // false — 테스트 서버에서만(wyvernQuest.js wqOn). 사용자가 열라고 하면 true

/* 깃발 — 저장 값이라 뒤에만 더한다 */
export const WQ_FLAGS = [
  'book_read', 'ask_seoha', 'ask_maru', 'ask_saebom', 'saebom_hint', 'rock_wind', 'passage_open',
  'pillar_seen', 'threshold_found', 'temple_open', 'trial_bridge', 'trial_gallery', 'trial_oath',
  'look_burn', 'look_prints', 'look_altar', 'wyvern_found', 'ask_danwoo', 'tag_read', 'burnt_side', 'trail_found',
  'memo_read', 'vent_lit', 'ember_got', 'awakened', 'duel_won', 'after_talk', 'prints_compared', 'look_shield', 'look_mark',
  'answer_done', 'inherit_later', 'claimed',
];
export const WQ_LOOKS = ['look_burn', 'look_prints', 'look_altar'];       // 셋을 모두 보면 wyvern_found
export const WQ_AFTER = ['prints_compared', 'look_shield', 'look_mark'];  // 결투 뒤 다시 보는 세 곳

/* 맵 — 그림 1536×1024 를 게임 2400×1600 으로(마술사 루트와 같은 틀). 바닥 그림은 Codex(story/ground/wq_*.webp),
   문 · 제단 · 석등 · 석상 · 바위는 따로 그린 낱장(rpg/wyvern-quest/*.webp) */
export const WQ_W = 2400, WQ_H = 1600, WQ_TOP = 390;
const M = (id, name, look, o = {}) => ({ id, name, look, w: WQ_W, h: WQ_H, top: WQ_TOP, spawn: [1200, 1380], ...o });
export const WQ_MAPS = [
  M('wq_ridge', '바람등성이', 'ridge', { spawn: [1200, 1400] }),
  M('wq_bridge', '바람다리', 'bridge', { spawn: [1200, 1460] }),
  M('wq_gallery', '비늘의 회랑', 'gallery'),
  M('wq_oath', '맹세의 문', 'oath'),
  M('wq_sanctum', '잠든 신전', 'sanctum'),
  M('wq_trail', '옛 피난길', 'trail'),
  M('wq_beacon', '무너진 봉화대', 'beacon'),
];
export const WQ_MAP_IDS = WQ_MAPS.map((m) => m.id);
export const wqMap = (id) => WQ_MAP_IDS.includes(id);
// 바깥 조사 자리가 있는 원래 맵 — 루엔 도서관 1층(서하) · 루엔 · 등불고개 · 서리봉
export const WQ_OUT_MAPS = ['luen-library', 'luen', 'lantern-forest', 'frost-peak'];
export const wqSpotMap = (id) => wqMap(id) || WQ_OUT_MAPS.includes(id);

/* 서리봉 북쪽 막다른 곳 — 산길 끝(전망 바위) 오른쪽 벼랑 밑. 나무가 없는 자리를 골랐다(정한 자리) */
export const WQ_ROCKS = { l: [1715, 752], m: [1830, 736], r: [1945, 760] };
export const WQ_ROCK_BACK = [1830, 830];   // 통로에서 돌아오면 서는 자리

/* 밟는 출구 — 모든 전용 맵 남쪽. 잠든 신전은 신전 입구(바람등성이 돌문 앞)로 곧장 돌아간다(기획안 5장 「마을로 돌아간다」) */
const EX = (map, to, back, label, at = [1200, 1530]) => ({ map, at, r: 60, to, back, label });
export const WQ_DOOR_FRONT = [1820, 820];   // 바람등성이 돌문 앞
export const WQ_EXITS = [
  EX('wq_ridge', 'frost-peak', WQ_ROCK_BACK, '서리봉'),
  EX('wq_bridge', 'wq_ridge', WQ_DOOR_FRONT, '바람등성이', [1200, 1545]),
  EX('wq_gallery', 'wq_bridge', [1200, 640], '바람다리'),
  EX('wq_oath', 'wq_gallery', [2050, 780], '비늘의 회랑'),
  EX('wq_sanctum', 'wq_ridge', WQ_DOOR_FRONT, '신전 입구'),
  EX('wq_trail', 'frost-peak', [1590, 820], '서리봉'),
  EX('wq_beacon', 'wq_trail', [1700, 940], '옛 피난길'),
];
// 막힘 — 바람다리 양옆 낭떠러지(다리 폭 x 1040~1360), 잠든 와이번 몸
const wall = (x, y0, y1) => Array.from({ length: Math.ceil((y1 - y0) / 56) + 1 }, (_, i) => ({ x, y: y0 + i * 56, r: 40 }));
export const WQ_WYVERN = [1520, 820];   // 잠든 와이번 자리(땅 기준)
export const WQ_BLOCKS = {
  wq_bridge: [...wall(1000, WQ_TOP, WQ_H), ...wall(1400, WQ_TOP, WQ_H)],
  wq_sanctum: [{ x: WQ_WYVERN[0] - 60, y: WQ_WYVERN[1], r: 90 }, { x: WQ_WYVERN[0] + 70, y: WQ_WYVERN[1] - 10, r: 80 }],
};

/* 원래 주민 · 풍경 자리(말 걸기 칸에 단추를 더한다) */
const npcAt = (id) => {
  for (const m of [...WILD_MAPS, ...LUEN_LIBRARY_MAPS]) { const n = [...(m.npcs || []), ...(m.sights || [])].find((q) => q.id === id); if (n) return [n.x, n.y, m.id]; }
  return [0, 0, ''];
};

/* 조사 자리 — 마술사 루트와 같은 꼴
   { id, map, at, r, name, npc?, btn?, show(조건), act, look?(그림) }
   act.k — talk(lines, set) · ask(intro, opts[{t, lines, set, go, need}]) · steps(intro, steps[{flag, k: read|pick}], done, need, lock)
           gate(to, back, need, lock, first, set) · rock · door · altar · trial(id) · duel · desk */
const S = (id, map, at, name, act, o = {}) => ({ id, map, at, r: 110, name, act, show: [], ...o });
let onN = 0;
const ON = (id, name, btn, act, show) => { const [x, y, map] = npcAt(id); return { id: `w-${id}-${onN++}`, npc: id, map, at: [x, y], r: 100, name, btn, act, show }; };

// 책 마지막 구절 — 「옛 날개의 기록」 첫 줄(첫 독서에는 아무 안내도 띄우지 않는다, 기획안 1장)
export const WQ_VERSE = [
  '마지막 기사가 돌아오던 날, 마을의 종은 울렸으나 망루에는 아무도 없었다.',
  '말의 발자국은 북쪽 길 끝에서 멎었고, 그 위로 날개 자국이 이어졌다.',
  '사람들은 그가 산에서 와이번을 구했다고 노래했다.',
  '하지만 기사는 산에 남은 벗에게 끝내 돌아가지 못했다.',
];
export const WQ_BOOK = 'north-steps';     // libraryBooks.js 책 id — 루엔 도서관 「전설 · 민담」 서가에만 꽂힌다
export const WQ_NAME = '아스라';           // 와이번의 이름 — 기획안이 비워 둠(정한 이름)

export const WQ_SPOTS = [
  /* ── 1 도서관 · 주민 증언 — 책을 읽은 뒤에만 단추가 생긴다 ── */
  ON('luen-librarian', '사서 서하', '망루 이야기를 묻는다', { k: 'talk', set: 'ask_seoha', lines: ['나|「북쪽으로 사라진 발자국」 말인데요. 망루에는 왜 아무도 없었죠?', '서하|그날 두 곳에서 종소리가 났대요.', '서하|이야기 속 종이 어느 쪽이었는지는 마루 님에게 물어보세요. 촌장님 할아버지가 그날 망루지기였거든요.'] }, ['book_read', '!passage_open']),
  ON('luen-elder-npc', '촌장 마루', '북쪽 길 끝의 종', { k: 'talk', set: 'ask_maru', lines: ['나|북쪽 길 끝에 종이 있었나요?', '마루|망루 종은 마을을 향했지. 산에서 들렸다는 건 돌 틈 사이 바람이었을 거야.', '마루|서리봉 길이 치솟는 끝에 바위 셋이 있어. 어릴 땐 거기서 종소리가 난다고 다들 겁을 먹었지.'] }, ['book_read', '!passage_open']),
  ON('luen-inn-npc', '여관 주인 새봄', '말 발자국이 끊긴 곳', { k: 'talk', set: 'ask_saebom', lines: ['나|말 발자국이 어디서 끊겼대요?', '새봄|북쪽 막다른 길이요. 왼쪽 돌에도 오른쪽 돌에도 이끼가 쌓였는데, 가운데 돌 아래는 늘 바람이 불어 깨끗했다죠.'] }, ['book_read', '!ask_saebom', '!passage_open']),
  // 헤매다 돌아온 사람에게 — 한 번 더 좁혀 준다(기획안 2장)
  ON('luen-inn-npc', '여관 주인 새봄', '바위를 못 찾겠다', { k: 'talk', set: 'saebom_hint', lines: ['새봄|아직 못 찾았어요? 제일 북쪽, 바람이 빠져나오는 돌 아래요.', '새봄|서리봉 길 끝에서 오른쪽 벼랑 밑을 보세요. 이끼 없는 돌이 하나 있을 거예요.'] }, ['ask_saebom', '!passage_open']),

  /* ── 2 서리봉 북쪽 막다른 곳 — 바위 셋(멀리서는 비슷하다) ── */
  S('fp-rock-l', 'frost-peak', WQ_ROCKS.l, '이끼 낀 바위', { k: 'talk', lines: ['|바위 아래쪽에 이끼가 두껍게 앉았다. 이끼 끝마다 물방울이 맺혀 있다.', '|틈은 흙과 이끼로 메워져 있다.'] }, { r: 80, look: 'rockL' }),
  S('fp-rock-m', 'frost-peak', WQ_ROCKS.m, '가운데 바위', { k: 'rock' }, { r: 80, look: 'rockM' }),
  S('fp-rock-r', 'frost-peak', WQ_ROCKS.r, '이끼 낀 바위', { k: 'talk', lines: ['|이끼가 바위 한쪽을 덮었다. 손을 대니 차고 축축하다.', '|바람은 느껴지지 않는다.'] }, { r: 80, look: 'rockR' }),

  /* ── 3 바람등성이 — 무너진 기둥 · 처마돌 셋 · 닳은 문턱 · 발자국 · 빈 벽(돌문) ── */
  S('rg-pillar', 'wq_ridge', [700, 900], '무너진 기둥', { k: 'talk', set: 'pillar_seen', lines: ['|부러진 돌기둥 하나가 눈 위에 누워 있다.', '|밑동에 글이 새겨져 있다. 「지붕은 무너져도 문턱은 닳는다.」'] }),
  S('rg-eave0', 'wq_ridge', [1040, 700], '처마돌', { k: 'talk', lines: ['|조각된 처마돌이다. 끝에 비늘 무늬가 남았다.', '|지붕이 있었다면 꽤 높았을 것이다.'] }),
  S('rg-eave1', 'wq_ridge', [1250, 640], '처마돌', { k: 'talk', lines: ['|두 번째 처마돌. 이끼가 북동쪽 면에만 덜 앉았다.', '|건물이 있던 자리는 돌 셋이 둘러싼 안쪽일 것이다.'] }),
  S('rg-eave2', 'wq_ridge', [1460, 700], '처마돌', { k: 'talk', lines: ['|세 번째 처마돌이 반쯤 눈에 묻혀 있다.', '|처마만 남고 기둥은 없다. 입구는 여기 보이지 않는다.'] }),
  S('rg-sill', 'wq_ridge', [560, 1080], '한쪽만 닳은 돌', { k: 'talk', set: 'threshold_found', lines: ['|계단처럼 한쪽만 매끈하게 닳은 납작한 돌이다.', '|오래 사람 발이 오간 자국이다. 문턱이었던 돌인지도 모른다.', '|돌 양옆에 희미한 발자국이 북동쪽으로 이어진다.'] }),
  S('rg-steps', 'wq_ridge', [1460, 960], '희미한 발자국', { k: 'talk', lines: ['|문턱 돌에서 시작된 발자국이 눈 덮인 비탈을 따라 북동쪽 빈 벽으로 올라간다.'] }, { show: ['threshold_found'] }),
  S('rg-door', 'wq_ridge', [1860, 700], '빈 벽', { k: 'door' }, { r: 130, look: 'tdoor' }),

  /* ── 4 신전의 세 시련 ── */
  S('br-stone', 'wq_bridge', [1200, 1420], '바람다리 비문', { k: 'trial', id: 'bridge', lines: ['|「바람은 깃발을 먼저 당긴다.」', '|다리 왼쪽 깃발이 수평으로 들리면 곧 강풍이 분다. 오른쪽 벽에 파인 대피 홈 셋에서 버티고, 깃발이 처지면 다음 홈으로 간다.'] }, { r: 120 }),
  S('br-gate', 'wq_bridge', [1200, 470], '시련의 문', { k: 'gate', to: 'wq_gallery', back: [1200, 1380], need: ['trial_bridge'], lock: ['|돌문이 닫혀 있다. 바람다리를 건너야 열린다.'] }, { look: 'tgate', r: 120 }),
  S('ga-stone', 'wq_gallery', [1200, 1420], '회랑 비문', { k: 'trial', id: 'gallery', lines: ['|「셋이 함께 울어도 발톱은 하나만 움직인다.」', '|포효하기 전, 한 석상만 바닥에 긴 발톱 자국을 남긴다. 그 앞을 피해 다른 발판을 밟고 서 있자.'] }, { r: 120 }),
  S('ga-gate', 'wq_gallery', [2080, 660], '시련의 문', { k: 'gate', to: 'wq_oath', back: [1200, 1380], need: ['trial_gallery'], lock: ['|돌문이 닫혀 있다. 회랑의 시련을 넘어야 열린다.'] }, { look: 'tgate', r: 120 }),
  S('oa-stone', 'wq_oath', [1200, 1420], '맹세의 비문', { k: 'trial', id: 'oath', lines: ['|「날개를 닫은 문은 두드려도 열리지 않는다. 숨을 고를 때 다리를 보라.」', '|석상 날개가 닫혔을 때 치면 튕겨 나온다. 내려찍기를 피한 뒤 날개를 펴면 다리 쪽 표적을 세 번 맞히자.'] }, { r: 120 }),
  S('oa-gate', 'wq_oath', [1200, 640], '맹세의 문', { k: 'gate', to: 'wq_sanctum', back: [1200, 1380], need: ['trial_oath'], first: ['|문에 문장이 새겨져 있다. 「잠든 자를 먼저 보라. 서약은 깨어난 뒤에 나눈다.」'], lock: ['|석상의 날개가 문을 덮고 있다.'] }, { look: 'ogate', r: 140 }),

  /* ── 5 잠든 신전 — 조사 셋(화상 · 발자국 · 제단) ── */
  S('sn-neck', 'wq_sanctum', [1760, 860], '목 아래', { k: 'talk', set: 'look_burn', lines: ['|와이번의 목 아래 비늘이 오래전 불에 녹아 붙었다. 큰 화상 자국이다.', '|숨을 쉴 때마다 옆구리 아래 얼음이 녹았다가 다시 언다.'] }, { show: ['!after_talk'] }),
  S('sn-prints', 'wq_sanctum', [1100, 1060], '바닥의 발자국', { k: 'talk', set: 'look_prints', lines: ['|돌바닥에 와이번의 발자국이 얼어붙어 있다.', '|그 옆에 크기도 모양도 다른 발자국이 있다. 발가락이 넷, 와이번보다 훨씬 크다.'] }, { show: ['!after_talk'] }),
  S('sn-altar', 'wq_sanctum', [760, 720], '제단', { k: 'altar' }, { look: 'altar', r: 130 }),
  S('sn-sleep', 'wq_sanctum', [1520, 990], '잠든 와이번', { k: 'talk', lines: ['|와이번이 날개를 이불처럼 접고 누워 있다. 성에가 비늘 틈마다 앉았다.', '|흔들어도 깨지 않는다. 칼을 들어도 숨소리가 바뀌지 않는다.'] }, { show: ['!awakened'], r: 120 }),
  S('sn-duel', 'wq_sanctum', [1520, 990], '와이번', { k: 'duel' }, { show: ['awakened', '!duel_won'], r: 130 }),

  /* ── 8 결투 뒤 — 누가 누구를 구했나 ── */
  S('sn-story', 'wq_sanctum', [1520, 990], '와이번', { k: 'talk', set: 'after_talk', lines: [
    `${WQ_NAME}|방금 내가 디딘 자리를 봐라. 제단 앞 옛 발자국과 나란히.`,
    `${WQ_NAME}|그 책은 기사가 산에서 나를 구했다고 했겠지.`,
    `${WQ_NAME}|나는 그를 업고 먼저 마을로 내려갔다. 마을 사람이 날 알아보기 전에 산으로 돌아왔고.`,
    '나|왜 돌아왔어?',
    `${WQ_NAME}|그 불이 산길을 타고 내려가면, 그가 돌아갈 마을도 없었으니까.`,
    `${WQ_NAME}|제단 뒤와 문턱 아래, 그리고 내 목 아래를 다시 봐라. 나도 오래 보지 못했다.`] }, { show: ['duel_won', '!after_talk'], r: 130 }),
  S('sn-prints2', 'wq_sanctum', [1100, 1060], '두 갈래 발자국', { k: 'talk', set: 'prints_compared', lines: ['|와이번의 새 발자국과 옛 발자국을 나란히 본다.', '|큰 발자국은 모두 바깥을 향한다. 드래곤이 신전을 나간 자국이다.', '|작은 발자국 하나만 안으로 돌아왔다. 와이번이 다시 돌아온 자국이다.'] }, { show: ['after_talk'] }),
  S('sn-shield', 'wq_sanctum', [560, 600], '제단 뒤 방패', { k: 'talk', set: 'look_shield', lines: ['|제단 뒤에 녹아 휜 방패가 박혀 있다. 방패 면이 바깥, 산길 쪽을 향한다.', '|불길을 막으려고 세운 것이다. 지키려던 쪽은 신전 안이 아니라 아래 마을이다.'] }, { show: ['after_talk'] }),
  S('sn-mark', 'wq_sanctum', [1200, 1330], '문턱 아래', { k: 'talk', set: 'look_mark', lines: ['|문턱 돌 아래에 칼로 그은 표식이 있다. 구조대에게 남기는 귀환 표식이다.', '|「돌아온다」. 부상당한 기사가 후일 구조대에게 전한 표식과 같은 모양이다.', `${WQ_NAME}|…그가 돌아오려 했다는 건 몰랐다.`] }, { show: ['after_talk'] }),
  S('sn-ask', 'wq_sanctum', [1520, 990], WQ_NAME, { k: 'steps', need: WQ_AFTER, lock: [`${WQ_NAME}|흔적을 먼저 봐라. 발자국, 제단 뒤, 문턱 아래.`], steps: [
    { flag: 'answer_done', k: 'pick', q: `${WQ_NAME}: “그 기사는 끝내 무엇을 두고 갔다고 생각하나?”`, opts: [
      { t: '당신에게 돌아올 길을 남겼어' },
      { t: '불길을 막으라는 명령', info: [`${WQ_NAME}|방패가 향하는 방향을 봐. 그는 마을로 번지는 불을 막고 싶었어. 맹세는 내가 했다.`, '|제단 뒤 방패를 다시 볼 수 있다.'] },
      { t: '아직 모르겠어', info: ['|와이번이 눈을 감는다. 흔적을 다시 볼 시간을 준다.'] }], ans: 0,
      ok: [`${WQ_NAME}|그러고 보니 그때도 저 표식을 빼앗으려 하진 않았지.`, '|와이번이 무릎을 굽힌다.', `${WQ_NAME}|내 이름은 ${WQ_NAME}다.`, `${WQ_NAME}|내가 가는 길을 네가 고를 수는 없다. 대신 갈 곳을 함께 정할 수는 있지.`], bad: '' },
  ], done: [`${WQ_NAME}|갈 곳은 정했나.`] }, { show: ['after_talk', '!answer_done'], r: 130 }),
  S('sn-desk', 'wq_sanctum', [1520, 990], WQ_NAME, { k: 'desk' }, { show: ['answer_done'], r: 130 }),

  /* ── 6 봉화대 불씨 — 와이번을 본 뒤에만 열린다 ── */
  ON('luen-smith-npc', '대장장이 단우', '제단 홈에 맞는 것', { k: 'talk', set: 'ask_danwoo', lines: ['나|산 위 신전 제단에 구슬 같은 게 빠진 홈이 있었어요.', '단우|그런 제단 홈에는 손잡이 달린 석등을 걸었어요. 우리 대장간 할아버지가 손잡이를 벼렸다고 들었죠.', '단우|옛날엔 고개 등불 아래에 봉화대 관리표를 달아 뒀대요. 아직 붙어 있으려나.'] }, ['wyvern_found', '!ember_got']),
  ON('lantern-pass', '고개 등불', '받침 안쪽을 살핀다', { k: 'talk', set: 'tag_read', lines: ['|등불 받침 안쪽에 녹슨 쇠패가 끼워져 있다.', '|「용의 불이 지나간 쪽으로 가지 말 것. 봉화대는 불길을 피해 올라간 옛 피난길 끝에 있다.」', '|「서리봉 전망 바위 아래에서 길이 갈린다.」'] }, ['wyvern_found']),
  ON('frost-summit', '서리 봉우리', '바위 아래 갈림길', { k: 'gate', to: 'wq_trail', back: [1200, 1420] }, ['wyvern_found']),
  S('tr-burnt', 'wq_trail', [640, 820], '검게 녹은 돌', { k: 'talk', set: 'burnt_side', lines: ['|길가의 돌이 검게 녹아 유리처럼 굳었다. 그을음이 길을 따라 이어진다.', '|그을음은 여기서 산 아래로 이어진다. 사람이 짚고 올라갈 만한 돌 표식은 없다.'] }),
  S('tr-cairn', 'wq_trail', [1760, 820], '작은 돌 표식', { k: 'gate', to: 'wq_beacon', back: [1200, 1380], set: 'trail_found', first: ['|그을음 없는 길가에 손바닥만 한 돌이 하나씩 세워져 있다.', '|사람이 짚으며 올라간 표식이다. 위쪽에 무너진 돌탑이 보인다.'] }),
  S('bc-memo', 'wq_beacon', [860, 1100], '신전지기의 메모', { k: 'talk', set: 'memo_read', lines: ['|석등 받침 옆에 얇은 돌판이 기대 있다.', '|「큰 바람은 불을 번지게 하고, 막힌 굴에서는 불씨가 죽는다. 얇은 천이 살짝 들리는 틈에 석등을 붙여라.」'] }),
  S('bc-v0', 'wq_beacon', [780, 650], '첫째 통풍구', { k: 'talk', lines: ['|통풍구 앞 천 조각이 축 늘어져 있다. 바람이 거의 들지 않는다.'] }, { look: 'vent0' }),
  S('bc-v1', 'wq_beacon', [1200, 610], '둘째 통풍구', { k: 'talk', lines: ['|천 조각이 가볍게 들렸다 내려앉는다. 숨 쉬듯 약한 바람이 든다.'] }, { look: 'vent1' }),
  S('bc-v2', 'wq_beacon', [1620, 650], '셋째 통풍구', { k: 'talk', lines: ['|천 조각이 팽팽하게 당겨진다. 바람이 세차게 빨려 든다.'] }, { look: 'vent2' }),
  S('bc-lamp', 'wq_beacon', [1200, 1030], '손잡이 달린 석등', { k: 'steps', steps: [
    { flag: 'vent_lit', k: 'pick', q: '석등을 어느 통풍구 앞에 붙일까?', opts: ['첫째 — 천이 축 늘어진 곳', '둘째 — 천이 가볍게 들리는 곳', '셋째 — 천이 팽팽하게 당겨진 곳'], ans: 1,
      ok: ['|석등을 둘째 통풍구 앞에 붙이고 뚜껑을 연다.', '|약한 바람이 석등 안으로 스민다. 재 속에서 붉은 불씨가 살아난다.'],
      badBy: ['석등을 붙이고 뚜껑을 열었지만 바람이 들지 않는다. 불씨가 숨을 쉬지 못한다. 석등을 다시 옮긴다.', '', '세찬 바람이 재를 흩뜨린다. 불씨가 번질 듯 흔들려 얼른 뚜껑을 닫는다. 석등을 다시 옮긴다.'], bad: '불씨가 살아나지 않는다.' },
    { flag: 'ember_got', k: 'pick', q: '둘째 통풍구 앞 석등에서 불씨가 숨 쉬고 있다.', opts: ['석등을 집는다'], ans: 0,
      ok: ['|「꺼지지 않은 용심 불씨」를 얻었다.', '|뚜껑 안쪽에 짧은 기록이 있다. 「북쪽 문턱에 귀환 표식을 남김.」'] },
  ], done: ['|석등을 걸던 받침이 비어 있다.'] }, { look: 'lamp' }),
];

/* 시련 · 결투 수치(게임 좌표 · 초) — 정한 값. 피해는 쓰지 않고 시험 체력과 자리만 본다(레벨 · 장비 · 직업 무관) */
export const WQ_TRIAL = {
  // 바람다리 — 깃발 처짐(calm) → 들림 예고(lift) → 강풍(gust). 강풍 때 홈 밖이면 지난 홈으로 밀린다
  bridge: { start: [1200, 1460], goal: [1200, 560], goalR: 110, grooves: [[1320, 1190], [1320, 930], [1320, 680]], r: 70, calm: 3.0, lift: 1.4, gust: 1.6,
    say: ['깃발이 처졌다 — 다음 홈으로', '깃발이 수평으로 들린다 — 홈으로!', '강풍!'] },
  // 비늘의 회랑 — 세 석상 · 세 발판. 회차마다 한 석상만 발톱 자국(예고) → 셋이 함께 포효 → 그 석상 앞 부채꼴만 친다
  gallery: { start: [1200, 1400], statues: [[700, 600], [1200, 560], [1700, 600]], plates: [[700, 1130], [1200, 1130], [1700, 1130]], plateR: 85,
    reach: 820, arc: 0.55, rounds: 3, warn: 2.4, gap: 1.4 },
  // 맹세의 문 — 날개 닫힘(closed) → 내려찍기 예고(warn) → 숨 고르기(open). 숨 고를 때 다리 표적 3번
  oath: { start: [1200, 1400], statue: [1200, 640], legs: [[1110, 720], [1290, 720]], legR: 60, reach: 230, closed: 2.6, warn: 1.5, open: 3.4, slamR: 150, hits: 3, back: 170 },
  // 결투 — 와이번 체력 100 → 15 에서 항복. 패턴을 한 번씩 보여야 그 아래로 줄어든다(floor)
  duel: { start: [1200, 1300], at: WQ_WYVERN, hp: 100, end: 15, me: 100, floor: [70, 45, 20, 15], reach: 280, hit: 4, restHit: 11, cd: 0.4, idle: 1.3, hover: 40,
    wind: { warn: 2.2, r: 110, dmg: 20, push: 260, holes: [[880, 1180], [1520, 1240], [2060, 1180]] },
    roar: { warn: 1.9, reach: 760, arc: 0.6, dmg: 25 },
    dive: { rise: 0.9, warn: 1.5, r: 170, dmg: 30, rest: 3.2 } },
  strikeCd: 0.4,
  names: { bridge: '바람다리', gallery: '비늘의 회랑', oath: '맹세의 문', duel: `${WQ_NAME}와의 결투` },
};

/* 계승 확인창 */
export const WQ_DESK = {
  title: 'Wyvern Knight 006 — 와이번 나이트',
  intro: [`${WQ_NAME}|갈 곳은 정했나.`, '|와이번이 날개를 반쯤 펴 너를 그 아래에 둔다.', '|히든 직업을 얻으시겠습니까?'],
  notes: ['캐릭터 레벨은 바뀌지 않는다.', '처음 얻으면 직업 레벨 1 · 용조격부터 시작한다. 와이번 소환(비룡의 계약)은 직업 레벨 5 에 열린다.', '1차 전직과 다른 히든 직업은 꺼진다. 들고 있던 무기는 내려놓을 뿐 지워지지 않는다.', '히든 직업은 게임 전체에서 한 명만 가질 수 있다. 계승 순간 다시 확인한다.'],
  yes: '받는다', no: '나중에 결정한다',
  later: `${WQ_NAME}: 서두를 것 없다. 나는 여기 있다.`,
  taken: '다른 모험가가 먼저 서약을 이었습니다. 네가 남긴 기록은 그대로 남는다.',
  error: '서약 기록을 확인하지 못했습니다. 진행은 저장되어 있습니다. 잠시 후 다시 말을 걸어 주세요.',
  test: '테스트 서버 — 서약 기록만 남겼다. 와이번 나이트 직업은 실제 게임에 열 때 이어진다.',
};

/* 「옛 날개의 기록」 — 본 것만, 정답은 적지 않는다 */
export const WQ_LOG = [
  { f: 'book_read', t: `책 · ${WQ_VERSE.join(' ')}` },
  { f: 'ask_seoha', t: '서하 — 그날 두 곳에서 종소리가 났다. 마루 님에게 물어볼 것.' },
  { f: 'ask_maru', t: '마루 — 산의 종소리는 돌 틈 바람이었을 것. 길이 치솟는 끝에 바위 셋.' },
  { f: 'ask_saebom', t: '새봄 — 양옆 돌엔 이끼, 가운데 돌 아래는 바람에 늘 깨끗했다.' },
  { f: 'rock_wind', t: '가운데 바위 — 들어오는 바람이 아니라 바깥으로 나가는 바람이다.' },
  { f: 'pillar_seen', t: '무너진 기둥 — 지붕은 무너져도 문턱은 닳는다.' },
  { f: 'threshold_found', t: '한쪽만 닳은 돌 — 발자국이 북동쪽으로 이어진다.' },
  { f: 'temple_open', t: '빈 벽의 경첩 — 눈 쌓인 돌문이 열렸다.' },
  { f: 'look_burn', t: '잠든 와이번 — 목 아래 오래된 화상.' },
  { f: 'look_prints', t: '바닥 — 와이번과 다른, 훨씬 큰 발자국.' },
  { f: 'look_altar', t: '제단 — 큰 용이 남긴 불은 오래 식지 않는다. 그 불을 숨 곁에 두어라.' },
  { f: 'ask_danwoo', t: '단우 — 제단 홈엔 손잡이 달린 석등. 고개 등불 아래 봉화대 관리표.' },
  { f: 'tag_read', t: '관리표 — 용의 불이 지나간 쪽으로 가지 말 것. 봉화대는 옛 피난길 끝.' },
  { f: 'burnt_side', t: '피난길 — 그을린 쪽에는 돌 표식이 없다.' },
  { f: 'memo_read', t: '신전지기 — 얇은 천이 살짝 들리는 틈에 석등을 붙여라.' },
  { f: 'ember_got', t: '꺼지지 않은 용심 불씨 — 뚜껑 안 「북쪽 문턱에 귀환 표식을 남김」.' },
  { f: 'duel_won', t: '결투 — 와이번이 항복했다. 새 발자국을 보라고 한다.' },
  { f: 'prints_compared', t: '발자국 — 큰 자국은 모두 바깥으로, 작은 자국 하나만 안으로.' },
  { f: 'look_shield', t: '방패 — 방패 면은 마을 쪽 산길을 향한다.' },
  { f: 'look_mark', t: '문턱 아래 — 기사가 남긴 귀환 표식. 그는 돌아오려 했다.' },
  { f: 'answer_done', t: `${WQ_NAME} — 갈 곳을 함께 정할 수는 있다.` },
];

/* 테스트 서버 「도구」 — 단계마다 앞 단계를 끝낸 것으로 하고 그 자리에 선다 */
export const WQ_STAGES = [
  { name: '1 도서관', map: 'luen-library-2', at: [420, 520], set: [] },
  { name: '2 북쪽 바위', map: 'frost-peak', at: [1830, 830], set: ['book_read', 'ask_seoha', 'ask_maru', 'ask_saebom'] },
  { name: '3 바람등성이', map: 'wq_ridge', at: [1200, 1400], set: ['rock_wind', 'passage_open'] },
  { name: '4 바람다리', map: 'wq_bridge', at: [1200, 1460], set: ['pillar_seen', 'threshold_found', 'temple_open'] },
  { name: '5 비늘의 회랑', map: 'wq_gallery', at: [1200, 1400], set: ['trial_bridge'] },
  { name: '6 맹세의 문', map: 'wq_oath', at: [1200, 1400], set: ['trial_gallery'] },
  { name: '7 잠든 와이번', map: 'wq_sanctum', at: [1200, 1380], set: ['trial_oath'] },
  { name: '8 봉화대', map: 'wq_beacon', at: [1200, 1380], set: [...WQ_LOOKS, 'wyvern_found', 'ask_danwoo', 'tag_read', 'trail_found'] },
  { name: '9 각성 · 결투', map: 'wq_sanctum', at: [1200, 1300], set: ['memo_read', 'vent_lit', 'ember_got', 'awakened'] },
  { name: '10 사건 조사', map: 'wq_sanctum', at: [1200, 1300], set: ['duel_won'] },
  { name: '계승', map: 'wq_sanctum', at: [1400, 1150], set: ['after_talk', ...WQ_AFTER, 'answer_done'] },
];
