/* ── 히든 직업 Illusionist 005 획득 루트 「존재하지 않았던 공연」 — 맵 · 조사 자리 · 퍼즐 · 대사 · 시험 수치 한 곳(11월 23일) ─────────────
   사용자 기획서 「일루셔니스트005_존재하지않았던공연_상세기획서」(8장)를 따른다. 저장소의 옛 초안 「끝나지 않은 공연」(docs/일루셔니스트005-획득루트-기획안-v1.md)은 쓰지 않는다.
   규칙은 illusionQuest.js, 그림은 illusionQuestArt.js, 창은 IllusionQuestPanel.jsx. Necromancer 004(necroQuestData.js)와 같은 틀이다.
   히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.
   사용자 지시 "광장이나 마을에 대놓고 상호작용 물건을 설치하지 마" — 마을 · 바깥 장소에는 새 건물 · 표식 · 사람을 두지 않는다.
     에르덴의 원래 벤치(조사 자리 · 가까이 가야 이름표만), 원래 주민 · 풍경(별이슬 연못 · 고개 등불 · 너덜 비탈 · 서리 봉우리 · 칼등 정상 · 새봄 · 서리 무늬 창)의
     말 걸기 칸에 단추 하나만 더한다. 그 밖의 장소는 모두 숨은 전용 맵(iq_*)이다.
   공개: IQ_ROUTE.live = false — 사용자가 확인하기 전까지 테스트 서버(?test, g.test)에서만 열린다. 실제 게임에는 단서도 보이지 않는다.
   "정한 해석"이라 적은 것은 기획서에 없거나 비워 둔 곳을 정한 값이다(docs/작업-상세-기록.md 끝 표). */
import { VILLAGE_NPCS } from './villageData.js';
import { WILD_MAPS, LUEN_LIBRARY_MAPS } from './wildsData.js';

export const IQ_ROUTE = { live: true };   // 11월 23일 사용자 "실제 게임에도 적용해줘" — false 로 되돌리면 테스트 서버에서만(illusionQuest.js iqOn)

/* 깃발 — 기획서 14.2 표의 차례 그대로(0~35). 저장 값이라 뒤에만 더한다. 36~ 은 정한 중간 깃발 */
export const IQ_FLAGS = [
  'ticket_found', 'memory_gap', 'ticket_reflected', 'fork_open', 'guide_seam', 'route_solved', 'mirror_plate', 'stage_gate_open',
  'mirror_latch', 'dispatch_found', 'visited_luen', 'visited_lantern', 'visited_scree', 'visited_frost', 'visited_ridge',
  'card_curtain', 'card_lamp', 'card_hand', 'card_mirror', 'card_seat', 'merchant_seam', 'deck_assembled', 'testimony_broken',
  'archive_seen', 'reconstruction_done', 'identity_proved', 'truth_known', 'trial_card_done', 'trial_space_done', 'trial_mirror_done',
  'trial_self_done', 'trial_passed', 'story_complete', 'inherit_later', 'claimed', 'apology_requested',
  // 36~ 정한 중간 깃발
  'index_seen', 'coat_answer', 'lamp_order', 't1', 't2', 'u_ledger', 'u_mirror', 'u_roster', 'identity_pick', 'attitude',
];
export const IQ_CARDS = ['card_curtain', 'card_lamp', 'card_hand', 'card_mirror', 'card_seat'];
export const IQ_CARD_NAMES = ['막(1)', '등불(2)', '손(3)', '거울(4)', '빈 의자(5)'];

/* 맵 — 그림 1536×1024 를 게임 2400×1600 으로(기획서 4.2). 위 벽 띠 y < 390. 바닥 그림은 Codex(story/ground/iq_*.webp — 거울 대기실은 현실 대기실을, 무대 아래 기록실은 소품실을 좌우로 뒤집어 만든다) */
export const IQ_W = 2400, IQ_H = 1600, IQ_TOP = 390;
const M = (id, name, look, o = {}) => ({ id, name, look, w: IQ_W, h: IQ_H, top: IQ_TOP, spawn: [1200, 1380], ...o });
export const IQ_MAPS = [
  M('iq_fork', '접힌 숲길', 'forest'),
  M('iq_seats', '사라진 야외 객석', 'seats'),
  M('iq_real', '현실 대기실', 'room'),
  M('iq_mirror', '거울 대기실', 'mirror', { spawn: [1931, 1300] }),
  M('iq_store', '실물 소품실', 'store'),
  M('iq_scree', '너덜재 비밀 쉼터', 'scree', { top: 450 }),
  M('iq_frost', '서리봉 소품실', 'frost', { top: 470 }),
  M('iq_ridge', '칼등산 운반 무대', 'ridge', { top: 560 }),
  M('iq_theatre', '숨겨진 공연장', 'theatre'),
  M('iq_under', '무대 아래 기록실', 'store'),
  M('iq_stage', '복원 무대', 'stage', { fight: 1 }),   // 최종 시험 — 빌린 마술사 기술을 쓰려고 싸울 수 있는 곳(시험 표적만 있다)
];
export const IQ_MAP_IDS = IQ_MAPS.map((m) => m.id);
export const iqMap = (id) => IQ_MAP_IDS.includes(id);
// 바깥 조사 자리가 있는 원래 맵
export const IQ_OUT_MAPS = ['dawnwood', 'dew-forest', 'lantern-forest', 'scree-forest', 'luen', 'luen-library-2', 'frost-peak', 'blade-ridge'];
export const iqSpotMap = (id) => iqMap(id) || IQ_OUT_MAPS.includes(id);

/* 밟는 출구 — 모든 전용 맵 남쪽. 바깥 쉼터 셋은 늘 원래 장소로 돌아간다(기획서 4.4) */
const EX = (map, to, back, label, at = [1200, 1530]) => ({ map, at, r: 60, to, back, label });
export const IQ_EXITS = [
  EX('iq_fork', 'dew-forest', [1958, 1110], '별이슬숲'),
  EX('iq_seats', 'iq_fork', [1200, 640], '접힌 숲길'),
  EX('iq_real', 'iq_seats', [900, 680], '사라진 야외 객석'),
  EX('iq_mirror', 'iq_real', [1200, 1380], '현실 대기실', [1700, 1530]),
  EX('iq_store', 'iq_real', [1875, 820], '현실 대기실'),
  EX('iq_scree', 'scree-forest', [2300, 1760], '너덜재 숲'),
  EX('iq_frost', 'frost-peak', [1590, 880], '서리봉'),
  EX('iq_ridge', 'blade-ridge', [2900, 640], '칼등산'),
  EX('iq_theatre', 'iq_seats', [1500, 700], '사라진 야외 객석'),
  EX('iq_under', 'iq_theatre', [380, 940], '숨겨진 공연장'),
  EX('iq_stage', 'iq_theatre', [1200, 820], '숨겨진 공연장'),
];
// 막힘 — 거울 대기실 가운데 유리 칸막이(동쪽 A′ · 고리 / 서쪽 B′ · 수납함이 걸어서 이어지지 않는다)
export const IQ_BLOCKS = {
  iq_mirror: Array.from({ length: 17 }, (_, i) => ({ x: 1200, y: IQ_TOP + 20 + i * 72, r: 38 })),
};

/* 원래 주민 · 풍경 자리(말 걸기 칸에 단추를 더한다) */
const npcAt = (id) => {
  const v = VILLAGE_NPCS.find((n) => n.id === id); if (v) return [v.x, v.y, 'dawnwood'];
  for (const m of [...WILD_MAPS, ...LUEN_LIBRARY_MAPS]) { const n = [...(m.npcs || []), ...(m.sights || [])].find((q) => q.id === id); if (n) return [n.x, n.y, m.id]; }
  return [0, 0, ''];
};

/* 조사 자리
   { id, map, at, r, name, npc?(원래 주민 · 풍경 id — 그 말 걸기 칸에 단추로만 나온다), btn?(그 단추 글), show(조건), act }
   조건: 깃발 이름 배열('!이름' 은 없어야)
   act.k — talk(lines, set) · ask(intro, opts[{t, lines, set, go}]) · steps(intro, steps[{flag, k: read|pick|order|dials, …}], done)
           gate(to, back, need, lock) · fork(dir) · trace(dir) · tree · ribbon · latch · travel · trial · desk
   steps 의 pick: q, opts(문자열 또는 { t, info: 대답 }), ans, ok, bad, hint · order: items, ans, ok, bad, hint · dials: items[{n, opts, ans}], ok, bad, hint */
const S = (id, map, at, name, act, o = {}) => ({ id, map, at, r: 110, name, act, show: [], ...o });
let onN = 0;   // 같은 주민에 단추가 둘(조건이 다름)이어도 id 가 겹치지 않게
const ON = (id, name, btn, act, show) => { const [x, y, map] = npcAt(id); return { id: `o-${id}-${onN++}`, npc: id, map, at: [x, y], r: 100, name, btn, act, show }; };

const LEDGER = [
  '|「막을 기억하는 사람에게 첫 장을. 길을 밝히는 곳에 둘째를. 돌이 쌓인 쉼터에 셋째를. 서리가 남는 곳에 넷째를. 좁은 능선의 운반대에 다섯째를.」',
  '|「완성품은 모두 오른쪽 아래 물결 홈과 뒷면의 두 겹 테두리를 가진다. 진품에도 거짓 문장은 적힐 수 있다. 물건의 진위와 글의 진실을 혼동하지 말 것.」',
];

export const IQ_SPOTS = [
  /* ── 1장 주인 없는 카드 — 에르덴 원래 벤치(새 벤치 없음). 가까이 가야 이름표만 ── */
  S('v-bench', 'dawnwood', [1460, 1345], '나무 벤치', { k: 'ask', intro: ['좌판 하나가 조금 들려 있다.'], opts: [
    { t: '앉는다', lines: ['잠시 앉아 숨을 고른다. 종탑 쪽에서 바람이 분다.'] },
    { t: '좌판 아래를 살펴본다', set: 'ticket_found', lines: ['|나무 틈에 종이 한 장이 끼어 있다. 앞에는 03, 뒤에는 12. 어느 쪽이 앞인지 알 수 없는 카드다.', '|카드 오른쪽 아래에 작은 물결 홈이 파여 있다. 젖은 면에서만 읽히는 잉크 자국도 보인다.'] },
    { t: '지나간다', lines: [] },
  ] }, { show: ['!ticket_found'], r: 80 }),
  S('v-bench2', 'dawnwood', [1460, 1345], '나무 벤치', { k: 'talk', lines: ['|좌판 아래는 비어 있다. 카드를 찾은 자리다.'] }, { show: ['ticket_found', '!story_complete'], r: 80 }),
  S('v-bench3', 'dawnwood', [1460, 1345], '나무 벤치', { k: 'talk', lines: ['|좌판 아래는 비어 있다. 이제는 표를 숨길 필요가 없다.'] }, { show: ['story_complete'], r: 80 }),
  // 여관 주인 모아 — 카드의 행 · 석 설명(여관 쪽 원래 주민, 정한 인물)
  ON('dawn-innkeeper', '여관 주인 모아', '카드를 보여 준다', { k: 'ask', intro: ['나|이 카드를 본 적 있나요?', '모아|옛날 표 같네요. 자리는 앞줄부터 세고, 그 줄 안에서는 왼쪽부터 셌어요. 앞에 줄, 뒤에 자리. 그런데 어디 공연이었더라.'], opts: [
    { t: '03과 12를 더하나요?', lines: ['모아|돈을 받는 표는 아니에요. 관객이 앉을 자리를 적었죠.'] },
    { t: '공연 이름은요?', set: 'memory_gap', lines: ['모아|참 이상하네. 웃었던 건 기억나는데, 이름만 떠오르질 않아요.'] },
    { t: '더 찾아볼게요', lines: ['모아|종이 말고 금속에 찍힌 건 남아 있을지도 몰라요. 기록관에 물어봐요.', '모아|아, 동쪽 숲 물은 유리처럼 맑죠. 거기 비춰 보면 글씨가 잘 보이던데.'] },
  ] }, ['ticket_found', '!story_complete']),
  // 기록관 소은 — 오래된 행사 색인(건물 안이 없어 바깥 대화로 보여 준다)
  ON('dawn-archivist', '기록관 소은', '오래된 행사 색인', { k: 'talk', set: 'index_seen', lines: ['소은|오래된 행사 색인이요? 금속 판에 찍힌 줄만 남아 있어요.', '|「임시 객석 대여 — 3열, 열마다 12석. 반환 완료. 장소: 동쪽 숲의 물가 너머.」', '|공연명 칸만 비어 있다.', '소은|이상하죠. 종이 기록에는 그날 일이 하나도 없어요. 금속이나 유리에 새긴 것만 남았어요.'] }, ['ticket_found', '!story_complete']),
  // 새봄 후일담
  ON('luen-inn-npc', '여관 주인 새봄', '극단 이름', { k: 'talk', lines: ['새봄|이름이 생각났어요. 은빛 장막 극단. 할머니가 웃으며 말하던 그 이름이에요.'] }, ['story_complete']),

  // 별이슬 연못 — 카드를 비춰 본다(카드가 있을 때만 단추가 생긴다)
  ON('dew-pond', '별이슬 연못', '카드를 비춰 본다', { k: 'steps', steps: [
    { flag: 'fork_open', k: 'read', lines: ['|카드를 수면에 비춰 본다.', '|물에 비친 내가 먼저 카드를 뒤집었다. 두 박자 뒤에야 내 손이 같은 동작을 한다.', '|젖은 면에 거울 글씨가 떠오른다. 「길은 표지판에, 자국은 땅에.」', '|수면에만 가느다란 숲길이 보인다.'], set: ['ticket_reflected'] },
  ], done: ['|수면 속 숲길이 그대로 비친다.'], go: { to: 'iq_fork', at: [1200, 1380], t: '접힌 숲길로 간다' } }, ['ticket_found']),

  /* ── 2장 거짓말을 하는 지도 — 같은 갈림길을 세 번. 나무 흠집 수가 구간을 알려 준다 ── */
  S('f-tree', 'iq_fork', [840, 760], '기준 나무', { k: 'tree' }),
  S('f-guide', 'iq_fork', [1750, 1250], '회색 외투의 길손', { k: 'ask', intro: ['길손|공연장을 찾으십니까? 지도라면 제가 잘 압니다.'], opts: [
    { t: '지도는 누가 그렸나요?', set: 'guide_seam', lines: ['길손|직접 본 사람이겠지요.', '|길손이 왼손 엄지로 오른손 장갑 솔기를 두 번 누른다.'] },
    { t: '바퀴 자국은 다른 쪽인데요', lines: ['길손|사람이 지나간 곳과 가야 할 곳은 다를 수 있습니다.'] },
    { t: '알겠습니다', lines: ['|길손이 내 말이 끝나기 전에 먼저 고개를 숙인다.'] },
  ] }, { show: ['fork_open', '!route_solved'], look: 'guide' }),
  S('f-guide-gone', 'iq_fork', [1750, 1250], '길손이 서 있던 자리', { k: 'talk', lines: ['|접힌 외투 모양의 카드 몇 장이 흩어져 있다.', '|사람이 서 있던 자리에 발자국이 없다.'] }, { show: ['route_solved'] }),
  S('f-n', 'iq_fork', [1200, 470], '북쪽 길', { k: 'fork', dir: 0 }, { r: 120 }),
  S('f-e', 'iq_fork', [2230, 1060], '동쪽 길', { k: 'fork', dir: 1 }, { r: 120 }),
  S('f-w', 'iq_fork', [170, 1060], '서쪽 길', { k: 'fork', dir: 2 }, { r: 120 }),
  S('f-tn', 'iq_fork', [1200, 700], '북쪽 길 바닥', { k: 'trace', dir: 0 }, { r: 90 }),
  S('f-te', 'iq_fork', [1960, 1060], '동쪽 길 바닥', { k: 'trace', dir: 1 }, { r: 90 }),
  S('f-tw', 'iq_fork', [440, 1060], '서쪽 길 바닥', { k: 'trace', dir: 2 }, { r: 90 }),

  /* ── 3장 사라진 무대 — 3열 × 12석 객석 ── */
  S('s-chart', 'iq_seats', [520, 1060], '좌석표', { k: 'talk', lines: ['|「줄은 무대 가까운 쪽부터. 자리는 관객이 무대를 바라볼 때 왼쪽부터.」', '|무대는 북쪽이다. 객석에 앉아 북쪽을 보면 왼쪽이 서쪽이다.'] }),
  S('s-fan', 'iq_seats', [870, 935], '관객의 부채', { k: 'talk', lines: ['|1열 4번 자리에 낡은 부채가 놓여 있다.', '|「등불을 낮추자 빈 무대가 유리 안에 나타났다.」'] }),
  S('s-cloth', 'iq_seats', [1960, 860], '유리 닦는 천', { k: 'talk', lines: ['|「각인 면은 관객 쪽. 빛은 낮게. 박수는 마지막.」'] }),
  S('s-rental', 'iq_seats', [1200, 1200], '금속 대여표', { k: 'talk', lines: ['|3열 뒤에 금속 대여표가 박혀 있다.', '|「관객 36석. 소품 거울 1. 출연자 귀환 확인.」', '|어디에도 ‘실종’이라는 말은 없다.'] }),
  S('s-seat', 'iq_seats', [1780, 1150], '객석', { k: 'steps', steps: [
    { flag: 'mirror_plate', k: 'dials', q: '몇 열 몇 번 의자를 살펴볼까?', items: [{ n: '열', opts: ['1열', '2열', '3열'], ans: 2 }, { n: '번', opts: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], ans: 11 }],
      ok: ['|3열 12번 의자 아래에서 손바닥 크기의 은경판을 꺼냈다. 카드의 03 / 12 와 꼭 맞는다.'], bad: '좌판 아래에는 먼지뿐이다.', hint: '카드 앞 03 은 줄, 뒤 12 는 그 줄의 자리다.' },
  ], done: ['|3열 12번 의자. 은경판을 꺼낸 자리다.'] }, { show: ['route_solved', '!dispatch_found'], r: 170 }),
  S('s-device', 'iq_seats', [1820, 700], '조명 장치', { k: 'steps', need: ['mirror_plate'], lock: ['|조명 장치 가운데에 손바닥만 한 빈 홈이 있다. 끼울 것이 없다.'], steps: [
    { flag: 'stage_gate_open', k: 'dials', q: '은경판을 홈에 끼웠다. 방향과 높이를 맞춘다.', items: [{ n: '각인 면', opts: ['관객 쪽', '숲 쪽'], ans: 0 }, { n: '등불', opts: ['높게', '낮게'], ans: 1 }],
      ok: ['|등불이 낮아지고 은경판에 빛이 모인다.', '|빈 풀밭 위에 무대의 윤곽이 떠오르고, 가운데 거울문 하나가 굳게 자리 잡는다.', '|「분명 여기 앉아 있었어요.」 「누가 나왔는지는… 왜 기억이 안 나지?」', '|사람들이 잊은 것은 자리가 아니라 무대 위의 사람이었다.'],
      bad: '빛이 숲으로 흩어지거나 유리 윗부분만 밝아진다.', hint: '천에 적힌 말 — 각인 면은 관객 쪽, 빛은 낮게.' },
  ], done: ['|은경판이 관객 쪽을 향한 채 낮은 빛을 받고 있다.'] }, { show: ['route_solved'] }),
  S('s-gate', 'iq_seats', [900, 580], '거울문', { k: 'gate', to: 'iq_real', back: [1200, 1380], need: ['stage_gate_open'] }, { show: ['stage_gate_open'], look: 'mirror' }),
  // 5장 끝 — 다섯 카드를 3열 12번 의자에 놓는다
  S('s-slot', 'iq_seats', [1780, 1150], '3열 12번 의자', { k: 'steps', need: IQ_CARDS, lock: 'cards', steps: [
    { flag: 'deck_assembled', k: 'order', q: '은경판 자리에 다섯 홈이 펼쳐진다. 카드를 놓을 차례를 정한다.', items: IQ_CARD_NAMES, ans: [0, 1, 2, 3, 4],
      ok: ['|다섯 물결 홈이 하나의 원이 된다. 뒷면 테두리가 좌석 하나를 둘러싼다.', '|글은 거짓이었지만 카드의 차례는 실제 공연의 차례였다.', '|객석 뒤 빈 의자 줄 너머로 숨은 공연장 입구가 드러났다.'],
      bad: '카드가 홈에서 밀려나 손으로 돌아온다.', hint: '카드 앞면의 숫자는 공연 순서다.' },
  ], done: ['|다섯 카드가 원을 이룬 채 빛난다.'] }, { show: ['dispatch_found'], r: 170 }),
  S('s-theatre', 'iq_seats', [1500, 580], '공연장 입구', { k: 'gate', to: 'iq_theatre', back: [1200, 1380], need: ['deck_assembled'] }, { show: ['deck_assembled'], look: 'curtain' }),

  /* ── 4장 뒤집힌 세계 — 현실 ↔ 거울 대기실 ── */
  S('r-wall', 'iq_real', [1200, 470], '벽 글귀', { k: 'talk', lines: ['|「거울은 자리를 뒤집는다. 손은 같은 고리를 만진다. 문은 반대편에서 풀린다.」'] }),
  S('r-model', 'iq_real', [1462, 1030], '쌍고리 모형', { k: 'talk', lines: ['|작은 모형의 붉은 고리를 돌리자 옆 거울 모형의 같은 홈도 함께 움직인다.', '|고리 가장자리에 작은 쌍고리 문양이 있다. 이 문양이 있는 것은 거울 양쪽이 이어진 장치다.'] }),
  S('r-a', 'iq_real', [470, 1190], 'A 거울', { k: 'gate', to: 'iq_mirror', back: [1931, 1300], first: ['|거울 너머가 이쪽과 좌우만 바뀐 같은 방이다.'] }, { look: 'mirror' }),
  S('r-door', 'iq_real', [360, 700], '서문', { k: 'door' }, { look: 'door' }),
  S('r-ring', 'iq_real', [940, 780], '붉은 고리', { k: 'talk', lines: ['|서문 안쪽 벽에 붉은 고리가 걸려 있다. 쌍고리 문양이 있다.', '|문틈으로는 손이 닿지 않는다.'] }, { show: ['!mirror_latch'] }),
  S('r-b', 'iq_real', [1875, 690], 'B 거울', { k: 'gate', to: 'iq_mirror', back: [525, 800], need: ['mirror_latch'], lock: ['|현실 쪽 빗장이 걸려 있다. 반대편 같은 고리가 보인다.'] }, { look: 'mirror' }),
  S('r-arrow', 'iq_real', [900, 1260], '분필 화살표', { k: 'talk', lines: ['|바닥에 분필 화살표가 남쪽 출구를 가리킨다.', '|거울 속에서는 이 화살표가 반대로 보일 것이다.'] }),
  S('m-a', 'iq_mirror', [1931, 1190], 'A′ 거울', { k: 'gate', to: 'iq_real', back: [470, 1300] }, { look: 'mirror' }),
  S('m-ring', 'iq_mirror', [1462, 780], '붉은 고리', { k: 'steps', steps: [
    { flag: 'mirror_latch', k: 'pick', q: '쌍고리 문양이 있는 고리다. 닫힌 손 모양이 새겨져 있다.', opts: ['닫힌 손 모양을 열린 손 모양으로 돌린다', '그대로 둔다'], ans: 0,
      ok: ['|고리가 철컥 돌아간다. 거울 너머 현실의 서문 쪽에서 빗장이 풀리는 소리가 들린다.'], bad: '고리는 그대로다.' },
  ], done: ['|고리는 열린 손 모양으로 돌아가 있다.'] }, { look: 'ring' }),
  S('m-east', 'iq_mirror', [2040, 700], '동문', { k: 'talk', lines: ['|거울 속 동문은 처음부터 열려 있다.', '|문 너머는 끝이 보이지 않는 빈 복도뿐이다. 소품실로 가는 길이 아니다.'] }, { look: 'door' }),
  S('m-b', 'iq_mirror', [525, 690], 'B′ 거울', { k: 'gate', to: 'iq_real', back: [1875, 820] }, { look: 'mirror' }),
  S('m-chest', 'iq_mirror', [820, 900], '거울 수납함', { k: 'ask', intro: ['|빈 수납함이다. 옆에 문구가 있다. 「보관한 것은 빛이 아니라 물건.」'], opts: [
    { t: '수납함을 두드린다', lines: ['|손이 유리 너머의 빈 공간을 통과한다. 이건 반사된 함이다.'] },
    { t: '실물 쪽 손잡이를 잡는다', go: { to: 'iq_store', at: [1200, 1380] }, lines: [] },
  ] }, { show: ['mirror_latch'], look: 'chest' }),
  S('st-ledger', 'iq_store', [1697, 900], '소품 배분 장부', { k: 'talk', set: 'dispatch_found', lines: [...LEDGER, '|다섯 보관처가 「낡은 공연 기록」에 적혔다. 어느 곳부터 가도 된다.'] }, { look: 'book' }),
  S('st-boxes', 'iq_store', [1200, 470], '다섯 보관함 그림', { k: 'talk', lines: ['|벽에 보관함 다섯 개가 그려져 있다. 막 · 등불 · 손 · 거울 · 빈 의자.', '|그림마다 아래에 작은 지명이 적혀 있다. 루엔 · 등불고개 · 너덜재 · 서리봉 · 칼등산.'] }, { look: 'boxes' }),
  S('st-travel', 'iq_store', [740, 900], '방문한 보관처', { k: 'travel' }, { show: ['dispatch_found'], look: 'map' }),

  /* ── 5장 다섯 장의 거짓말 — 원래 장소의 말 걸기 칸에 단추 하나 ── */
  ON('luen-inn-npc', '여관 주인 새봄', '오래된 공연 물품', { k: 'steps', visit: 'visited_luen', intro: ['새봄|할머니가 맡아 둔 표 꾸러미가 있어요. 공연 이름은 모르겠지만, 비가 내려 외투를 말렸다는 이야기는 여러 번 들었죠.', '새봄|표를 안 쓰고 돌아온 손님이 없었다고 했어요. 여기 맡긴 물건 장부도 보세요.', '|「17:00 외투 36벌 보관」 「17:10 종 세 번, 막 개방」 「18:00 외투 36벌 반환」'], steps: [
    { flag: 'coat_answer', k: 'pick', q: '막이 올랐을 때 관객은 어디에 있었나?', opts: [
      { t: '모두 떠난 뒤였다' }, { t: '객석에 있었다' }, { t: '장부만으로는 공연자 얼굴을 알 수 없다', info: ['새봄|맞아요. 하지만 지금 묻는 건 관객의 자리예요.'] }], ans: 1,
      ok: ['새봄|그렇게 읽는 게 맞겠네요. 당신은 말보다 장부를 보네요.'], bad: '새봄: 그렇다면 왜 외투를 한 시간 뒤에 찾았을까요?', hint: '외투는 18:00 에 돌려줬다. 막은 17:10 에 올랐다.' },
    { flag: 'card_curtain', k: 'pick', q: '꾸러미 속 막 문양 카드 두 장을 비교한다.', opts: ['A — 숫자 1 · 오른쪽 아래 물결 홈 · 두 겹 테두리', 'B — 숫자 1 · 왼쪽 아래 물결 홈 · 두 겹 테두리'], ans: 0,
      ok: ['|진품이다. 뒷면에는 「관객이 모두 떠난 뒤 막이 올랐다.」라고 적혀 있다.', '|진짜 카드에 거짓 문장이 적혀 있다.', '새봄|물건이 진짜인 거랑 거기 적힌 말이 맞는 건 다른 얘기죠. 도서관 서하도 늘 그래요.'], bad: '홈 자리가 장부의 설명과 다르다.', hint: '장부 — 오른쪽 아래 물결 홈.' },
  ], done: ['새봄|할머니 꾸러미는 이제 가벼워졌네요.'] }, ['dispatch_found', '!story_complete']),
  ON('luen-lib2-window', '서리 무늬 창', '유리 각인을 본다', { k: 'talk', lines: ['|서리 유리 안쪽에 아주 작은 글씨가 새겨져 있다. 바깥에서 닦아도 지워지지 않는다.', '|「유리 너머에 남은 것은 그날의 자리. 글보다 자리를 믿을 것.」', '서하|물건이 진짜라는 말과 그 위에 적힌 말이 사실이라는 말은 다릅니다.'] }, ['dispatch_found']),
  ON('lantern-pass', '고개 등불', '등불 아래 소품 주머니', { k: 'steps', visit: 'visited_lantern', intro: ['|등불 아래 소품 주머니에 점 · 선 · 원 문양을 새긴 작은 등불 셋이 들어 있다.', '|「짧은 빛이 시작을 알리고, 긴 빛이 무대를 비추며, 둥근 빛이 관객을 찾았다.」'], steps: [
    { flag: 'lamp_order', k: 'order', q: '공연 때 순서를 재현한다.', items: ['점(짧은 빛)', '선(긴 빛)', '원(둥근 빛)'], ans: [0, 1, 2], play: ['점 — 짧게 깜빡', '선 — 길게', '원 — 둥글게 번짐'],
      ok: ['|세 등불이 차례로 켜진다. 바닥에 두 주머니의 그림자가 생긴다.'], bad: '불빛이 꺼진다. 순서만 지워졌다.', hint: '시작 → 무대 → 관객. 점 → 선 → 원.' },
    { flag: 'card_lamp', k: 'pick', q: '주머니 둘 중 하나를 조사한다.', opts: ['낮은 받침 위의 주머니', '위에 걸린 주머니'], ans: 0,
      ok: ['|진품 2번 카드다. 오른쪽 아래 물결 홈과 두 겹 테두리. 뒷면에는 「그날 무대에는 불빛이 없었다.」', '|「빛이 꺼졌다고 빛이 없었던 것은 아니다.」 소품 메모가 함께 들어 있다.'], bad: '손이 그림을 통과한다. 위 주머니는 불빛에 비친 그림이다.' },
  ], done: ['|등불 셋이 조용히 꺼져 있다.'] }, ['dispatch_found']),
  ON('scree-field', '너덜 비탈', '비탈 위 쉼터로', { k: 'gate', to: 'iq_scree', back: [1200, 1380], visit: 'visited_scree' }, ['dispatch_found']),
  ON('frost-summit', '서리 봉우리', '전망 바위 소품함', { k: 'gate', to: 'iq_frost', back: [1200, 1380], visit: 'visited_frost' }, ['dispatch_found']),
  ON('ridge-summit', '칼등 정상', '능선 위 운반함', { k: 'gate', to: 'iq_ridge', back: [1200, 1380], visit: 'visited_ridge' }, ['dispatch_found']),

  // 5C 너덜재 — 여행 상인(이안의 분신 2). 화면 왼쪽 L 이 실물
  S('sc-merchant', 'iq_scree', [1225, 720], '여행 상인', { k: 'steps', intro: ['상인|둘 다 제 손에 있으니 둘 다 진짜겠지요. 먼저 마음에 든 것을 고르세요.', '|상인이 양손에 같은 문양의 카드를 들고 있다. 화면 왼쪽 L, 오른쪽 R.'], steps: [
    { flag: 'card_hand', k: 'pick', q: '어떻게 할까?', opts: [
      { t: '홈과 테두리를 본다', info: ['|두 장 모두 똑같아 보인다. 모양만으로는 아직 알 수 없다.'] },
      { t: '카드 사이에 천을 내려 달라', info: ['|천이 내려오자 오른쪽 카드만 사라진다. 왼쪽에는 종이 두께와 천 그림자가 남는다.'] },
      { t: '값을 묻는다', info: ['상인|값은 이미 치렀습니다. 시간을 내셨잖아요.'] },
      { t: '먼저 보여 준 쪽을 고른다', info: ['상인|어느 쪽이 먼저였는지는 보신 분이 정하시지요.', '|카드 판정과는 상관없는 말이다.'] },
      { t: '왼쪽 L 카드를 받는다' }, { t: '오른쪽 R 카드를 받는다' }], ans: 4,
      ok: ['|진품 3번 카드다. 뒷면에는 「보여 준 두 장은 모두 진짜다.」', '|카드를 건네며 상인이 왼손 엄지로 오른손 장갑 솔기를 두 번 누른다.'], set: ['merchant_seam'],
      bad: '카드가 손 사이로 통과한다. 무늬는 있었지만 종이는 없었다.', hint: '천으로 반사를 가려 보자.' },
  ], done: ['|상인이 앉아 있던 자리에 카드로 접힌 의자 모형만 남아 있다.'] }, { show: ['!card_hand'], look: 'merchant' }),
  S('sc-chair', 'iq_scree', [1225, 720], '접힌 의자 모형', { k: 'talk', lines: ['|카드로 접은 작은 의자 모형이다. 상인은 보이지 않는다.', '|「둘 다 제 손에 있으니 둘 다 진짜겠지요.」 그 목소리가 아직 귀에 남아 있다.'] }, { show: ['card_hand'] }),
  // 5D 서리봉 — 렌즈 셋 · 입력판
  S('fr-plate', 'iq_frost', [1200, 560], '투사판 장부', { k: 'talk', lines: ['|「겉에 적힌 수는 크다. 유리에 남은 작은 수만큼 덜어 내라. 순서는 바꾸지 않는다.」'] }, { look: 'book' }),
  ...[2, 4, 6].map((n, i) => S(`fr-l${i}`, 'iq_frost', [800 + i * 400, 790], `렌즈 ${i + 1}`, { k: 'talk', lines: [`|투사판에 큰 숫자 ${n}이 비친다.`, '|손거울로 유리 안쪽을 비추자 작은 숫자 1이 보인다.'] }, { look: 'lens' })),
  S('fr-board', 'iq_frost', [1200, 1060], '입력판', { k: 'steps', steps: [
    { flag: 'card_mirror', k: 'dials', q: '세 칸에 숫자를 놓는다.', items: [0, 1, 2].map((i) => ({ n: `${i + 1}칸`, opts: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], ans: [1, 3, 5][i] })),
      ok: ['|잠금이 풀린 함에서 거울 문양 4번 카드를 꺼냈다. 뒷면에는 「거울은 길을 하나도 남기지 않았다.」', '|함 바닥 금속 각인 — 「귀환구: 무대 뒤 → 객석 아래」.'], bad: '잠금이 그대로다. 놓은 숫자는 남아 있다.', hint: '좌우를 뒤집으라는 말은 없었다. 작은 수만큼 덜어 낸다.', bad642: '좌우를 뒤집으라는 말은 없었다. 작은 수만큼 덜어 내라.' },
  ], done: ['|빈 함 바닥에 「귀환구: 무대 뒤 → 객석 아래」 각인이 남아 있다.'] }, { look: 'board' }),
  // 5E 칼등산 — 추를 먼저 고정하고 리본을 푼다
  S('rd-box', 'iq_ridge', [1470, 640], '유리함', { k: 'talk', lines: ['|유리함 안에 빈 의자 문양 카드가 있다. 「두 손으로 두 곳을 누르면 열린다.」', '|운반 메모 — 「사람 한 명이면 충분하다. 먼저 추를 고정하고, 남은 손으로 리본을 풀 것. 유리는 깨지 말 것.」'] }, { show: ['!card_seat'], look: 'glassbox' }),
  S('rd-box2', 'iq_ridge', [1470, 640], '빈 유리함', { k: 'talk', lines: ['|함 밑 금속 출입표 — 「무대 퇴장 1 / 객석 입장 1 / 외부 퇴장 0」.', '|마지막 사람이 밖으로 나가지 않았다는 것이 곧 무대에 갇혔다는 뜻은 아니다.'] }, { show: ['card_seat'], look: 'glassbox' }),
  S('rd-wheel', 'iq_ridge', [828, 900], '물레', { k: 'latch' }, { look: 'wheel' }),
  S('rd-ribbon', 'iq_ridge', [1600, 1010], '리본대', { k: 'ribbon' }, { show: ['!card_seat'], look: 'ribbon' }),

  /* ── 6장 마지막 관객 · 7장 진실 ── */
  S('th-aud', 'iq_theatre', [1200, 1060], '마지막 관객', { k: 'steps', intro: ['관객|드디어 돌아왔군요. 아니, 처음 온 손님이었지요. 그날 저는 끝까지 남았습니다.', '나|왜 혼자 있나요?', '관객|무대가 비었는데 막이 내려오지 않아서요.'], steps: [
    { flag: 't1', k: 'pick', q: '관객: “막이 오르기 전에 모두 떠났죠.”', opts: 'evidence', ans: 0, ok: ['나|외투 반환은 막이 오른 뒤입니다.', '관객|…장부를 읽으셨군요.'], bad: '관객: 그 기록은 지금 말과 어떤 관계가 있나요?' },
    { flag: 't2', k: 'pick', q: '관객: “거울은 안으로 들어가는 길뿐이었어요.”', opts: 'evidence', ans: 3, ok: ['나|출연자가 돌아오는 문도 있었습니다.', '관객|서리봉까지 다녀오셨군요.'], bad: '관객: 거울이 있었다는 것만으로 출구가 있었다고 할 수 있을까요?' },
    { flag: 'testimony_broken', k: 'pick', q: '관객: “마지막 사람은 아직 무대 안에 갇혀 있어요.”', opts: 'evidence', ans: 4,
      ok: ['나|무대에서 객석으로 옮겨 간 사람이 있습니다.', '나|당신은 거짓말을 하고 있어요.', '관객|그렇다면 제 말이 아닌 것을 가져오세요. 무대 아래에는 제 목소리가 닿지 않는 기록이 있습니다.', '|무대 왼쪽 아래 문이 열렸다.'], bad: '관객: 밖으로 안 나갔다는 것과 무대에 남았다는 것은 같을까요?' },
  ], done: ['관객|무대 아래에는 제 목소리가 닿지 않는 기록이 있습니다.'] }, { show: ['deck_assembled', '!testimony_broken'], look: 'audience' }),
  S('th-aud2', 'iq_theatre', [1200, 1060], '마지막 관객', { k: 'ask', intro: ['관객|무대 아래 기록은 보셨습니까?'], opts: [
    { t: '증거를 더 찾겠다', set: 'attitude', lines: ['관객|좋습니다. 그 눈을 잃지 마세요.'] },
    { t: '처음부터 시험이었나', set: 'attitude', lines: ['관객|그 질문은 아직 제 대답으로 끝내지 마세요.'] },
    { t: '그냥 알려 달라', set: 'attitude', lines: ['관객|그러면 당신은 또 제 말을 믿게 되겠지요.', '|힌트 — 무대 아래 세 기록을 읽고, 사건을 시간 순서로 맞춰 보자.'] },
  ] }, { show: ['testimony_broken', '!identity_proved'], look: 'audience' }),
  S('th-ian', 'iq_theatre', [1200, 1060], '마지막 관객', { k: 'steps', intro: ['나|당신이 이안이다.', '이안|맞습니다. 사라진 사람을 찾게 해 놓고, 저는 여기 앉아 있었습니다.', '나|사라진 건 당신뿐이 아니었어요. 단원들의 이름도 잊혔죠.', '이안|…그 이름들까지 가릴 권리는 없었습니다.', '나|내가 한 일도 전부 당신이 시킨 건가요?', '이안|길은 제가 접었습니다. 하지만 장부를 믿은 일, 유리를 깨지 않은 일, 제 말을 의심한 일은 당신의 선택입니다.'], steps: [
    { flag: 'truth_known', k: 'pick', q: '무엇이라고 답할까?', opts: [
      { t: '시험을 끝내고 이름을 돌려주자' }, { t: '사람들을 속인 건 사과해야 한다', set: 'apology_requested' }, { t: '힘만 받으면 된다' }, { t: '지금은 떠나겠다', info: ['이안|자리는 여기에 있습니다.'] }], ans: [0, 1, 2],
      ok: ['|장막이 걷히며 공연장 골조가 드러난다. 무대 앞 길이 열렸다.'], okBy: [['이안|이제 막을 내릴 차례군요.'], ['이안|무대를 돌려놓은 뒤, 제가 직접 하겠습니다.'], ['이안|그 힘도 무엇을 가리고 있는지 볼 수 있어야 합니다.']] },
  ], done: ['이안|무대가 기다립니다.'] }, { show: ['identity_proved'], look: 'audience' }),
  S('th-under', 'iq_theatre', [380, 820], '무대 아래 문', { k: 'gate', to: 'iq_under', back: [1200, 1380], need: ['testimony_broken'], lock: ['|무대 아래 문이 잠겨 있다. 아직 설명되지 않은 증언이 있다.'] }, { look: 'door' }),
  S('th-stage', 'iq_theatre', [1200, 690], '무대 앞', { k: 'gate', to: 'iq_stage', back: [1200, 1380], need: ['truth_known'], lock: ['|무대 위는 아직 장막에 가려져 있다.'] }, { look: 'curtain' }),
  S('u-ledger', 'iq_under', [703, 900], '메레의 금속 작업 장부', { k: 'talk', set: 'u_ledger', lines: ['|「공연 종료 후 각자의 물품을 들고 귀가. 장막 유지 담당 이안 한 명만 잔류. 시험 시작 전 단원 전원 동의 확인.」', '|「관객의 선택은 대본에 적히지 않았다.」 — 무대감독 메레'] }, { look: 'book' }),
  S('u-mirror', 'iq_under', [1200, 700], '실물 출입 거울', { k: 'talk', set: 'u_mirror', lines: ['|거울에 과거 이동 경로가 점선으로 남아 있다. 무대 뒤에서 객석의 노인 자리로 이어진다.', '|밖으로 나가는 선은 없다. 봉인 번호가 장부의 번호와 같다. 조작하지 않은 원본이다.'] }, { look: 'mirror' }),
  S('u-roster', 'iq_under', [1660, 900], '장갑 수선표와 단원 명단', { k: 'talk', set: 'u_roster', lines: ['|「이안 — 오른손 장갑 솔기가 자주 벌어짐. 왼손으로 누르는 버릇.」', '|길손과 상인이 했던 버릇과 같다.', '|명단에는 이안 말고도 단원들의 이름이 빼곡하다. 메레 · 하련 · 도겸 · 수아 · 기온 · 별이.'] }, { look: 'board' }),
  S('u-table', 'iq_under', [1200, 1060], '사건 재구성 탁자', { k: 'steps', steps: [
    { flag: 'reconstruction_done', k: 'order', q: '네 문장을 일어난 차례대로 놓는다.', items: ['단원들이 계승 시험에 동의하고 소품을 각지에 맡겼다', '마지막 공개 공연 뒤 단원들은 귀가하고 이안이 장막을 유지했다', '이안은 무대에서 객석으로 옮겨 관객으로 위장했다', '이안은 길손과 상인의 분신으로 후보자의 선택을 지켜봤다', '관객 전원이 사고로 죽었다', '세상 전체가 거울 속 꿈이었다'], ans: [0, 1, 2, 3], pickN: 4,
      ok: ['|사건이 한 줄로 이어진다.'], bad: '장부가 반례를 짚는다 — 단원들은 귀가했고, 주민들의 생활 기록은 그대로다.', hint: '동의 → 귀가와 잔류 → 객석으로 → 분신.' },
    { flag: 'identity_pick', k: 'pick', q: '지금 찾아야 할 최초의 마술사는 어디에 있는가?', opts: [{ t: '무대의 가장 화려한 분신', info: ['|출입선은 무대를 떠났다.'] }, { t: '객석의 마지막 관객' }, { t: '다섯 지역의 모든 주민', info: ['|장부에는 실제 단원과 주민의 생활이 남아 있다. 모두 환영이라는 증거는 없다.'] }], ans: 1, ok: ['|그렇다면 근거는?'], bad: '' },
    { flag: 'identity_proved', k: 'pick', q: '무엇을 근거로 지목할까?', opts: [{ t: '무대에서 객석으로 이어지는 실물 출입 기록' }, { t: '장갑을 누르는 버릇', info: ['|닮은 행동만으로는 부족하다. 이동 기록도 보자.'] }, { t: '목소리가 닮았다', info: ['|목소리는 근거가 되지 못한다.'] }], ans: 0,
      ok: ['|출입 기록이 객석의 노인 자리로 이어진다. 관객에게 돌아가자.'], bad: '' },
  ], done: ['|사건 재구성은 끝났다. 관객에게 돌아가자.'] }, { look: 'table' }),

  /* ── 8장 최후의 커튼콜 — 복원 무대 ── */
  S('sg-start', 'iq_stage', [1200, 1250], '무대 중앙', { k: 'trial' }, { r: 130 }),
  S('sg-desk', 'iq_stage', [1900, 1250], '계승대', { k: 'desk' }, { show: ['trial_passed'], look: 'desk' }),
];

/* 6장 증언 대조 — 고를 수 있는 증거(카드 · 장치를 해결하면 저절로 기록된다, 기획서 13.1). 차례는 위 steps 의 ans 와 맞춘다 */
export const IQ_EVIDENCE = [
  { t: '루엔 외투 장부 — 외투는 막이 오른 뒤에 돌려줬다', need: 'card_curtain' },
  { t: '등불고개 — 무대에는 낮은 등불이 있었다', need: 'card_lamp', info: ['관객|등불 이야기는 지금 제 말과 상관이 없지요.', '|맞는 사실이지만 이 주장과는 바로 이어지지 않는다.'] },
  { t: '너덜재 — 실물과 반사는 바꿔 보일 수 있다', need: 'card_hand', info: ['관객|반사 이야기는 다음에 하시지요.', '|맞는 사실이지만 이 주장과는 바로 이어지지 않는다.'] },
  { t: '서리봉 — 귀환구 각인 「무대 뒤 → 객석 아래」', need: 'card_mirror' },
  { t: '칼등산 — 출입표 「무대 퇴장 1 / 객석 입장 1」', need: 'card_seat' },
];

/* 2장 숲길 — 구간마다 정답(0 북 · 1 동 · 2 서)과 바닥 흔적(기획서 6장 표) */
export const IQ_FOREST = {
  ans: [1, 2, 0],   // 동 → 서 → 북
  sign: [['북쪽 표지판 — 「야외 공연장」', '동쪽 표지판 — 「야외 공연장」', '서쪽 표지판'], ['북쪽 표지판', '동쪽 표지판 — 「객석」', '서쪽 표지판'], ['북쪽 표지판', '동쪽 표지판', '서쪽 표지판 — 「무대」']],
  guide: ['길손|첫 길은 북쪽입니다.', '길손|두 번째는 동쪽이지요. 표지판에도 객석이라 적혀 있잖습니까.', '길손|마지막은 서쪽, 무대 쪽입니다.'],
  // trace[구간][방향]
  trace: [
    ['마른 낙엽뿐이다. 바퀴 자국이 없다.', '소품 수레의 두 줄 바퀴 자국이 동쪽으로 이어진다.', '풀이 꺾인 자국이 두 걸음 뒤에 끊긴다.'],
    ['가지에 걸린 천 조각은 인쇄 무늬뿐이다.', '가지에 걸린 천 조각은 인쇄 무늬뿐이다.', '가지에 카드와 같은 물결 홈이 있는 천 조각이 걸려 있다.'],
    ['부러진 의자 다리를 끌고 간 자국이 길게 이어진다.', '끌린 자국이 두 걸음 뒤에 끊긴다.', '끌린 자국이 두 걸음 뒤에 끊긴다.'],
  ],
  wrong: '표지판을 따라 돌아왔지만 나무의 흠집은 그대로다.',
  hint3: '안내는 바뀌어도 바닥에 남은 흔적은 바뀌지 않는다.',
  ok: ['나무의 흠집이 하나 늘었다.', '나무의 흠집이 하나 더 늘었다.', '숲이 펼쳐지며 낡은 객석이 보인다.'],
};

/* 5E 칼등산 */
export const IQ_RIDGE = {
  wheelQ: '물레에 균형추가 매달려 있다.',
  wheel: ['균형추를 걸쇠에 고정한다', '물레를 그냥 돌린다'],
  fixed: '걸쇠에 추가 걸렸다. 고정 표시가 켜진다.',
  spun: '물레가 헛돈다. 추는 아직 흔들린다.',
  ribbon: ['매듭을 푼다', '유리를 깬다'],
  ok: ['|함이 천천히 내려온다. 빈 의자 문양 5번 카드다. 뒷면에는 「마지막 사람은 무대 밖으로 나가지 않았다.」', '|함 밑 금속 출입표 — 「무대 퇴장 1 / 객석 입장 1 / 외부 퇴장 0」.'],
  early: '함이 흔들린 뒤 제자리로 돌아간다. 추를 먼저 붙잡아야 한다.',
  glass: '표면의 가짜 유리만 카드로 흩어진다. 안쪽 보호함은 그대로다.',
};

/* 계승 확인창(기획서 12.7) */
export const IQ_DESK = {
  title: 'Illusionist 005 — 마술사',
  intro: ['|객석의 노인이 자기 자리에서 박수를 친다. 빈 좌석 위에 단원들의 이름이 하나씩 떠오른다.', '|무대의 가장 밝은 조명이 내게로 향한다.', '이안|정답을 보여 준 사람을 의심하고도 여기까지 왔군요.', '이안|이 공연은 없었던 일이 아닙니다. 이제는 제 이름 뒤에 가려 둘 일도 아니겠지요.', '이안|카드를 받겠습니까? 다음 무대는 당신의 것입니다.'],
  notes: ['캐릭터 레벨은 바뀌지 않는다.', '처음 얻으면 직업 레벨 1 · 연마 0 에서 시작한다. 시험에서 빌린 기술은 잠긴다.', '1차 전직과 다른 히든 직업은 꺼진다. 들고 있던 무기는 내려놓을 뿐 지워지지 않는다.', '히든 직업은 게임 전체에서 한 명만 가질 수 있다. 계승 순간 다시 확인한다.'],
  yes: '결과를 확인했고 계승한다', no: '아직은 아니다',
  later: '이안|자리는 여기에 있습니다. 시험을 다시 할 필요는 없습니다.',
  taken: '다른 모험가가 먼저 자리를 이었습니다. 당신이 완성한 공연 기록은 남습니다.',
  error: '계승 기록을 확인하지 못했습니다. 시험 결과는 저장되어 있습니다. 잠시 후 다시 확인해 주세요.',
  apology: '이안의 편지 — 「사람들이 기억하지 못하면 상처도 남지 않을 거라고 생각했습니다. 그것도 제 멋대로 쓴 대본이었습니다.」',
};

/* 8장 최종 시험 — 시험 체력 100 · 막마다 마술사 기술을 본뜬 시험 기술을 쓴다(정한 해석 — Necromancer 004 왕궁 시험처럼
   캐릭터 레벨 · 장비 · 직업과 상관없이 시험 기술만 쓴다. 표적은 몹 목록에 넣지 않고 시험 안에만 둔다).
   좌표는 복원 무대(iq_stage) 게임 좌표. 피해는 쓰지 않고 어떤 기술로 무엇을 맞혔는지만 본다(illusionQuest.js) */
export const IQ_TRIAL = {
  hp: 100,
  start: [1200, 1250],
  // 막마다 쓸 수 있는 시험 기술(1막 절단 카드 · 폭렬 셔플 · 덱 슬래시 / 2막 + 프리즌 · 블링크 · 피스트 / 3막 + 미러 하우스 · 최후의 셔플)
  skills: [['card', 'shuffle', 'slash'], ['card', 'shuffle', 'slash', 'prison', 'blink', 'fist'],
    ['card', 'shuffle', 'slash', 'prison', 'blink', 'fist', 'mirror', 'final'], ['card', 'shuffle', 'slash', 'prison', 'blink', 'fist', 'mirror', 'final']],
  // 시험 기술 대기(초) · 닿는 거리 — 시험용으로 짧게(정한 값)
  cd: { card: 0.4, shuffle: 3, slash: 0.3, prison: 5, blink: 3, fist: 4, mirror: 10, final: 6 },
  reach: { card: 520, shuffle: 580, slash: 320, prison: 520, blink: 340, fist: 460, mirror: 0, final: 650 },
  slashGap: 4,                                     // 덱 슬래시 카드 길이 이만큼 지나면 흩어진다
  fakeHit: 10, selfHit: 25, prisonT: 4, houseT: 8, claps: 2,
  names: ['제1막 — 손에 남는 카드', '제2막 — 남겨 둔 자리', '제3막 — 두 번 들리는 박수', '최종막 — 진짜 나를 고르시오'],
  real: [[700, 820], [1200, 700], [1700, 820]],   // 1막 1회차 실물(판지) 표적
  fake: [[950, 780], [1450, 780], [1200, 960]],   // 반사 표적 — 쳐도 줄지 않는다
  bundle: { at: [1200, 860], r: 70, n: 5 },        // 1막 2회차 — 원 안에 모인 카드 묶음(폭렬 셔플만 펼친다)
  pads: [[860, 1100], [1540, 1100]],                 // 1막 3회차 — 카드 길로 건널 틈 둘(덱 슬래시 중에 닿아야 한다)
  padR: 90, padStart: [560, 1100],
  doll: { at: [1200, 820], orbit: 220, spd: 0.35 }, // 2막 — 천천히 도는 종이 인형(카드 프리즌으로 묶는다)
  blinkFrom: [700, 1200], blinkTo: [1040, 1200], blinkR: 100,   // 출발 원 · 도착 원(블링크 이동 340)
  panel: [1200, 560],                                // 걸쇠 판(팬텀 피스트)
  rain: { gap: 5, warn: 2, r: 120, dmg: 20 },        // 2막 위험 — 카드 비(예고 2초 · 시험 체력 −20)
  target: [880, 820], mirror: [1200, 700],           // 3막 — 실물 표적 · 중앙 거울
  clones: [[760, 960], [1000, 860], [1400, 860], [1640, 960]],   // 최종막 — 내 모습의 분신 넷
  rad: 30,
};

/* 「낡은 공연 기록」 — 본 것만, 정답은 적지 않는다(기획서 3.2 — 관찰한 사실 / 누군가의 주장 / 아직 풀리지 않은 질문) */
export const IQ_LOG = [
  { f: 'ticket_found', t: '관찰 · 벤치 좌판 아래에서 카드 한 장. 앞 03, 뒤 12. 오른쪽 아래 물결 홈.' },
  { f: 'memory_gap', t: '주장 · 모아 — 웃었던 건 기억나는데 공연 이름만 떠오르지 않는다.' },
  { f: 'index_seen', t: '관찰 · 금속 색인 — 임시 객석 3열, 열마다 12석. 동쪽 숲의 물가 너머.' },
  { f: 'ticket_reflected', t: '관찰 · 연못에 비친 내가 먼저 카드를 뒤집었다. 반사가 먼저 움직였다.' },
  { f: 'guide_seam', t: '관찰 · 길손은 대답하기 전 장갑 솔기를 두 번 누른다.' },
  { f: 'fork_open', t: '주장 · 길손 — 길은 북쪽이다. / 질문 · 표지판과 바닥 흔적이 다르다.' },
  { f: 'route_solved', t: '관찰 · 길손이 서 있던 자리에 발자국이 없다.' },
  { f: 'mirror_plate', t: '관찰 · 3열 12번 의자 아래 은경판.' },
  { f: 'stage_gate_open', t: '관찰 · 사람들이 잊은 것은 자리가 아니라 무대 위의 사람이었다.' },
  { f: 'mirror_latch', t: '관찰 · 거울 속 고리가 현실의 서문을 열었다.' },
  { f: 'dispatch_found', t: '관찰 · 소품 배분 장부 — 루엔 · 등불고개 · 너덜재 · 서리봉 · 칼등산. 진품에도 거짓 문장이 있다.' },
  { f: 'card_curtain', t: '관찰 · 막(1) — 외투는 막이 오른 뒤 돌려줬다. 카드 뒷면의 말은 거짓이다.' },
  { f: 'card_lamp', t: '관찰 · 등불(2) — 무대에는 낮은 등불이 세 번 켜졌다.' },
  { f: 'card_hand', t: '관찰 · 손(3) — 반사는 종이가 아니다. 천으로 가리면 사라진다.' },
  { f: 'merchant_seam', t: '관찰 · 상인도 장갑 솔기를 두 번 눌렀다.' },
  { f: 'card_mirror', t: '관찰 · 거울(4) — 귀환구 「무대 뒤 → 객석 아래」.' },
  { f: 'card_seat', t: '관찰 · 빈 의자(5) — 출입표 「무대 퇴장 1 / 객석 입장 1 / 외부 퇴장 0」.' },
  { f: 'deck_assembled', t: '관찰 · 카드의 차례는 실제 공연의 차례였다.' },
  { f: 'testimony_broken', t: '주장 · 관객 — 마지막 사람은 무대 안에 갇혔다. / 반박 · 세 기록으로 무너졌다.' },
  { f: 'u_ledger', t: '관찰 · 메레 — 단원은 동의하고 귀가했다. 이안만 남았다. 관객의 선택은 대본에 적히지 않았다.' },
  { f: 'u_roster', t: '관찰 · 이안의 장갑 버릇. 단원들의 이름.' },
  { f: 'truth_known', t: '관찰 · 마지막 관객은 최초의 마술사 이안이었다.' },
  { f: 'story_complete', t: '공연을 본 사람 — 은빛 장막 극단의 마지막 공연을 끝까지 지켜봤다.' },
  { f: 'apology_requested', t: '이안의 편지 — 사람들이 기억하지 못하면 상처도 남지 않을 거라고 생각했다. 그것도 제 멋대로 쓴 대본이었다.' },
];

/* 방문한 보관처 — 소품실에서 다녀온 곳만 오간다(기획서 4.5) */
export const IQ_TRAVEL = [
  { f: 'visited_luen', name: '루엔 마을 — 산마루 여관', to: 'luen', at: [1150, 1320] },
  { f: 'visited_lantern', name: '등불고개 — 고개 등불', to: 'lantern-forest', at: [1700, 1320] },
  { f: 'visited_scree', name: '너덜재 — 너덜 비탈', to: 'scree-forest', at: [2300, 1760] },
  { f: 'visited_frost', name: '서리봉 — 전망 바위', to: 'frost-peak', at: [1590, 880] },
  { f: 'visited_ridge', name: '칼등산 — 칼등 정상', to: 'blade-ridge', at: [2900, 640] },
];

/* 테스트 서버 「도구」 — 장마다 앞 단계를 끝낸 것으로 하고 그 장 시작 자리에 선다 */
export const IQ_STAGES = [
  { name: '1장 카드', map: 'dawnwood', at: [1460, 1400], set: [] },
  { name: '2장 숲길', map: 'iq_fork', at: [1200, 1380], set: ['ticket_found', 'ticket_reflected', 'fork_open'] },
  { name: '3장 객석', map: 'iq_seats', at: [1200, 1380], set: ['route_solved'] },
  { name: '4장 대기실', map: 'iq_real', at: [1200, 1380], set: ['mirror_plate', 'stage_gate_open'] },
  { name: '5장 카드 수집', map: 'iq_store', at: [1200, 1380], set: ['mirror_latch', 'dispatch_found'] },
  { name: '6장 관객', map: 'iq_theatre', at: [1200, 1380], set: ['visited_luen', 'visited_lantern', 'visited_scree', 'visited_frost', 'visited_ridge', 'coat_answer', 'lamp_order', ...IQ_CARDS, 'merchant_seam', 'deck_assembled'] },
  { name: '7장 무대 아래', map: 'iq_under', at: [1200, 1380], set: ['t1', 't2', 'testimony_broken'] },
  { name: '8장 시험', map: 'iq_stage', at: [1200, 1380], set: ['u_ledger', 'u_mirror', 'u_roster', 'archive_seen', 'reconstruction_done', 'identity_pick', 'identity_proved', 'truth_known'] },
  { name: '계승', map: 'iq_stage', at: [1700, 1300], set: ['trial_card_done', 'trial_space_done', 'trial_mirror_done', 'trial_self_done', 'trial_passed', 'story_complete'] },
];
