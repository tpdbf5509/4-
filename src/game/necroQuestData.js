/* ── 히든 직업 Necromancer 004 획득 루트 「그림자 군주」 — 맵 · 조사 자리 · 퍼즐 · 대사 · 시험 수치 한 곳(11월 20일, 사용자 기획안 「획득루트 최종수정안」 12장) ─────────────
   규칙은 necroQuest.js, 그림은 necroQuestArt.js, 창은 NecroQuestPanel.jsx. Engineer 003 「최초의 설계자」(engineerQuestData.js)와 같은 틀이다.
   히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다(사용자 지시).
   사용자 지시 "단서를 너무 대놓고 마을이나 광장에 건축물을 설치하지 마, 모든 건 전부 상호작용" —
     마을 · 광장에는 새 건물 · 표식 · 사람을 두지 않는다. 마을 서쪽 약초밭의 원래 울타리 쪽문(VILLAGE_PROPS gate-door)이 산책로로 이어지고,
     도서관의 원래 책장 · 주민의 원래 대사 끝에 한 줄씩 섞었다(villageData.js · libraryBooks.js). 히든 직업이라는 안내도 띄우지 않는다.
   - 레벨 제한 없음. 모든 맵은 싸움 없는 곳(safe)이고 일반 사냥터 · 던전으로 가는 출구가 없다. 경험치 · 아이템 · 재료를 주지 않는다.
   - 시험은 캐릭터 체력 · 장비 · 직업과 관계없이 시험 체력 100 · 시험 기술(NQ_SKILLS)만 쓴다. 실패하면 그 시험만 다시 한다.
   - 진행은 가방 bag.nu(necroQuest.js cleanNu). 깃발 차례(NQ_FLAGS) · 맵 차례는 저장 · 스냅샷 값이라 뒤에만 더한다.
   - 맵 바닥 그림은 Codex(story/ground/<맵 id>.webp, 1536×1024 를 2400×1600 으로 늘린다). 조사 자리 좌표는 그림 좌표(px)로 적고 P() 로 옮긴다.
   "정한 값"은 기획안에 없어 정한 값이다(보고 대상). */

export const NQ_MAP_W = 2400, NQ_MAP_H = 1600;
const K = NQ_MAP_W / 1536;
export const P = (x, y) => [Math.round(x * K), Math.round(y * K)];

// 진행 깃발 — 차례가 저장 값(비트 자리)이다. 뒤에만 더한다. 이름은 코드에서만 쓴다
export const NQ_FLAGS = [
  'book', 'caret', 'steps', 'sword', 'seal0', 'walk',                               // 0~5 1장
  'r0', 'r1', 'r2', 'r3', 'r4', 'banner', 'cofMimic',                                // 6~12 2장
  'rollA', 'rollB', 'rollC', 'flag', 'quiz', 'pathT', 'sSword', 'm1',                // 13~20 3장
  'pl0', 'pl1', 'pl2', 'pillars', 'gates', 'sShield', 'm2',                         // 21~27 4장
  'cls', 'dial', 'bk0', 'bk1', 'bk2', 'bk3', 'books', 'sRecord', 'm3', 'shelfMimic', // 28~37 5장
  'f0', 'f1', 'f2', 'f3', 'f4', 'statue', 'sWing', 'm4', 'watch',                    // 38~46 6장
  'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'clocks', 'sTime', 'm5',                       // 47~55 7장
  'live', 'mirror', 'sBound', 'm6', 'coords',                                         // 56~60 8장
  'plates', 'sSilence', 'm7',                                                         // 61~63 9장
  'seven',                                                                            // 64 10장
  'c0', 'c1', 'c2', 'c3', 'truth', 'drill', 'solMimic', 'heir',                      // 65~72 11장
  'claim', 'later', 'ans12', 'guardT', 'lightOk',                                     // 73~77 12장 · 덧붙인 것
];
export const NQ_SEALS = ['sSword', 'sShield', 'sRecord', 'sWing', 'sTime', 'sBound', 'sSilence'];
export const NQ_SEAL_NAMES = ['검의 인장', '방패의 인장', '기록의 인장', '날개의 인장', '시간의 인장', '경계의 인장', '침묵의 인장'];
export const NQ_MEMS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];

/* 맵 — id 는 기획안 3장 표(이름 없는 묘역은 「에르덴 외곽에 통합」이라 마을 쪽문 너머 작은 맵으로 했다 · 강변은 4장 동선이라 더했다 — 정한 해석).
   MAP_IDS 뒤에 이 차례로 붙는다(rpg.js). top: 걸을 수 있는 위쪽 끝(그림의 벽 아래, 그림 px) · spawn: 처음 서는 자리(그림 px) */
const M = (id, name, top, spawn, extra = {}) => ({ id, name, w: NQ_MAP_W, h: NQ_MAP_H, top: Math.round(top * K), spawn: P(...spawn), ...extra });
export const NQ_MAPS = [
  M('necro_nameless_graves', '이름 없는 묘역', 200, [260, 900]),
  M('necro_catacomb', '봉인된 지하 납골당', 300, [770, 860]),
  M('necro_old_graves', '버려진 공동묘지', 260, [430, 760]),
  M('necro_barracks', '잊힌 병영', 270, [770, 890]),
  M('necro_riverbank', '외곽 강변', 250, [260, 900]),
  M('necro_sunken_temple', '침몰한 지하 신전', 250, [770, 830]),
  M('necro_archive', '봉인된 지하 서고', 280, [770, 880]),
  M('necro_sky_shrine', '무너진 하늘의 사원', 200, [160, 420]),
  M('necro_funeral_hall', '멈춘 장례식장', 260, [770, 800]),
  M('necro_rift_altar', '균열의 제단', 280, [330, 900]),
  M('necro_observatory', '이름 없는 관측소', 230, [230, 900]),
  M('necro_kingdom', '망자의 지하 왕국', 260, [770, 800]),
  M('necro_palace', '망자의 왕궁', 250, [770, 830]),
];
export const NQ_MAP_IDS = NQ_MAPS.map((m) => m.id);
export const nqMap = (id) => NQ_MAP_IDS.includes(id);
// 전용 맵 밖에서 조사 자리가 있는 곳 — 원래 있던 소품에 붙인 상호작용만(새 건물 · 표식을 두지 않는다)
export const NQ_OUT_MAPS = ['dawnwood', 'erden-library-2'];
export const nqSpotMap = (id) => nqMap(id) || NQ_OUT_MAPS.includes(id);

/* 하늘의 사원 — 다리 아래 · 오른쪽은 낭떠러지라 걷지 못한다(막힘 원). 다리 위 길(NQ_BRIDGE)은 비워 둔다 */
export const NQ_BRIDGE = [P(240, 960), P(560, 850), P(780, 780), P(1000, 680), P(1180, 590), P(1320, 450)];
function shrineBlocks() {
  const out = [], segD = (x, y, [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
  const lineY = (x) => { const L = NQ_BRIDGE; for (let i = 0; i < L.length - 1; i++) if (x >= L[i][0] && x <= L[i + 1][0]) return L[i][1] + (L[i + 1][1] - L[i][1]) * (x - L[i][0]) / (L[i + 1][0] - L[i][0]); return x < L[0][0] ? 9e9 : L[L.length - 1][1]; };
  for (let x = 40; x < NQ_MAP_W; x += 90) for (let y = 300; y < NQ_MAP_H; y += 70) {
    const chasm = (y > lineY(x) + 90) || (x > P(1450, 0)[0] && y > P(0, 560)[1]) || (x > P(1180, 0)[0] && y > P(0, 640)[1]);
    if (!chasm) continue;
    let near = 1e9; for (let i = 0; i < NQ_BRIDGE.length - 1; i++) near = Math.min(near, segD(x, y, NQ_BRIDGE[i], NQ_BRIDGE[i + 1]));
    if (near > 120) out.push({ x, y, r: 62 });
  }
  return out;
}
export const NQ_BLOCKS = { necro_sky_shrine: shrineBlocks() };

// 마을 쪽 — 서쪽 약초밭 울타리의 원래 쪽문(villageData.js VILLAGE_PROPS gate-door, 마을 좌표). 새 건물 · 표식 없이 조사 자리만 둔다
export const NQ_VILLAGE = { door: [845, 1745], back: [845, 1800] };
// 맵 사이 출구(밟으면 옮겨 간다 — 늘 열려 있는 쪽만). 진행이 필요한 문은 조사 자리(act 'gate'). hatch: 1 — 그림에 문이 없어 코드로 그린다
export const NQ_EXITS = [
  { map: 'necro_nameless_graves', at: P(60, 1000), r: 70, to: 'dawnwood', back: NQ_VILLAGE.back, label: '에르덴 마을' },
  { map: 'necro_catacomb', at: P(770, 965), r: 70, to: 'necro_nameless_graves', back: P(900, 700), label: '이름 없는 묘역' },
  { map: 'necro_old_graves', at: P(365, 840), r: 60, to: 'necro_catacomb', back: P(330, 420), label: '봉인된 지하 납골당' },
  { map: 'necro_barracks', at: P(770, 975), r: 60, to: 'necro_old_graves', back: P(1300, 340), label: '버려진 공동묘지', hatch: 1 },
  { map: 'necro_riverbank', at: P(80, 990), r: 70, to: 'necro_barracks', back: P(1270, 340), label: '잊힌 병영' },
  { map: 'necro_sunken_temple', at: P(770, 960), r: 60, to: 'necro_riverbank', back: P(780, 640), label: '외곽 강변' },
  { map: 'necro_archive', at: P(770, 985), r: 60, to: 'necro_sunken_temple', back: P(110, 320), label: '침몰한 지하 신전' },
  { map: 'necro_sky_shrine', at: P(60, 300), r: 60, to: 'necro_archive', back: P(1300, 790), label: '봉인된 지하 서고' },
  { map: 'necro_funeral_hall', at: P(770, 900), r: 60, to: 'necro_sky_shrine', back: P(1260, 330), label: '무너진 하늘의 사원' },
  { map: 'necro_rift_altar', at: P(200, 990), r: 60, to: 'necro_funeral_hall', back: P(770, 330), label: '멈춘 장례식장' },
  { map: 'necro_observatory', at: P(60, 830), r: 60, to: 'necro_rift_altar', back: P(770, 790), label: '균열의 제단' },
  { map: 'necro_kingdom', at: P(770, 965), r: 70, to: 'necro_catacomb', back: P(770, 560), label: '봉인된 지하 납골당' },
  { map: 'necro_palace', at: P(770, 940), r: 70, to: 'necro_kingdom', back: P(1150, 340), label: '망자의 지하 왕국' },
];

// 조사 자리 그림 — props.webp 4×4 · generals.webp 4×2(칸 384). look 이 없으면 바닥 그림만
export const NQ_ART = { base: '/assets/game/rpg/necro-quest/', cell: 256, gcell: 384,
  props: { necklace: 0, helmet: 1, banner: 2, shield: 3, scabbard: 4, sword: 5, feather: 6, watch: 7, seal: 8, coffin: 9, coffinOpen: 10, torch: 11, crystal: 12, glyph: 13, kneel: 14, orb: 15 },
  generals: { kardon: 0, valtern: 1, serion: 2, raedin: 3, orben: 4, morken: 5, erebos: 6, king: 7 } };
const pr = (name, size = 80, o = {}) => ({ look: { sheet: 'props', i: NQ_ART.props[name], size, ...o } });
const gen = (name, size = 190) => ({ look: { sheet: 'generals', i: NQ_ART.generals[name], size } });

/* 조사 자리. 공통: id · map · at(그림 px) · r(가까이 · 기본 90) · name · look · show(보이는 조건) · act
   조건은 깃발 이름 배열(모두) · '!이름' 은 없어야 · 함수(u, has) 도 된다.
   act.k: talk(대사 + set) · ask(골라 듣기) · take(줍기) · record(조건이 되면 set) · gate(다른 맵으로) · pick · dials · order(n 개만 고를 수도) ·
          dial(값 → u.d[key]) · check(키 값이 모두 맞으면) · seq(무리 g 의 차례 i) · torch(불 켜고 끄기) · mimic · seal · trial(시험) · throne(계승)
   lock: need 가 모자랄 때 보여 줄 대사 */
const S = (map, id, px, py, name, act, o = {}) => ({ id, map, at: P(px, py), r: 90, name, act, ...o });
const T = (lines, set, o = {}) => ({ k: 'talk', lines, set, ...o });
const TAKE = (set, lines, o = {}) => ({ k: 'take', set, lines, done: ['이미 챙겼다.'], ...o });
const DIRS = ['북', '동', '남', '서'];
export const NQ_DIRS = DIRS;
const SEAL_ITEMS = ['검의 인장', '방패의 인장', '기록의 인장', '날개의 인장', '시간의 인장', '경계의 인장', '침묵의 인장'];

export const NQ_SPOTS = [
  /* ── 1장 · 지워진 이름 ── 마을 쪽문(원래 소품) · 이름 없는 묘역 · 지하 납골당 */
  { id: 'v-gate', map: 'dawnwood', at: NQ_VILLAGE.door, r: 70, name: '낡은 울타리 쪽문', act: { k: 'gate', to: 'necro_nameless_graves', back: P(260, 900),
    first: ['빗장이 녹슬어 반쯤 풀려 있다.', '쪽문 너머로 풀에 덮인 오래된 산책로가 이어진다.'], firstSet: 'walk' } },
  // 도서관 2층 낮은 책장 두 줄 사이 — 책장 화면의 《잊힌 왕국의 이야기》와 같은 책. 여기서 펼쳐 읽어야 1장 기록에 남는다
  { id: 'l-book', map: 'erden-library-2', at: [550, 1150], r: 90, name: '책장 앞에 떨어진 책', act: T(['표지가 닳은 얇은 책이다. 제목은 《잊힌 왕국의 이야기》.', '「왕을 잃은 군대는 이름 대신 고향을 바라보며 잠들었다.」', '「마지막 불빛이 꺼진 뒤에도 맹세는 남았다. 그들은 산 자가 조용해지기를 기다렸다.」', '마지막 쪽 귀퉁이에 누군가 연필로 적어 두었다. 「약초밭 울타리 너머 옛 산책로.」'], 'book') },
  S('necro_nameless_graves', 'g-care', 1290, 790, '묘지기의 오두막', { k: 'ask', intro: ['묘지기|이 길까지 오는 사람은 드물지. 무엇이 궁금한가?'], opts: [
    { t: '이 무덤들은 누구의 것인가요?', lines: ['묘지기|이름을 아는 사람이 없어. 옛 병사들의 무덤은 고향을 향해 세웠다는 말만 전해 오지.'], set: 'caret' },
    { t: '저 오래된 묘비는요?', lines: ['묘지기|글자가 긁혀 나갔어. 누가 일부러 지운 것 같다고들 하더군.', '묘지기|그 앞에 둥근 돌판이 있지. 돌리면 묘비가 따라 돈다네. 왜 그렇게 만들었는지는 모르겠어.'] },
    { t: '옛 장례 풍습을 아시나요?', lines: ['묘지기|마지막 불까지 꺼야 망자가 길을 찾는다더군. 그리고 산 사람은 조용히 기다려야 하고.'] },
  ] }),
  S('necro_nameless_graves', 'g-grave', 1025, 520, '이름이 지워진 묘비', T(['다른 묘비보다 훨씬 오래되었다. 앞면의 이름은 일부러 긁어낸 자국뿐이다.', '뒷면에는 고리 안에 검이 꽂힌 낯선 문양이 새겨져 있다.', '곁의 낮은 무덤들은 모두 북쪽 산맥을 향해 서 있다. 이 묘비만 홀로 남쪽을 본다.']), { r: 110 }),
  S('necro_nameless_graves', 'g-dial', 1025, 600, '둥근 방향 석판', { k: 'dial', key: 'dir', opts: [0, 1, 2, 3], names: DIRS, unit: '쪽', note: '석판을 돌리면 묘비가 함께 돈다.' }, { r: 80 }),
  S('necro_nameless_graves', 'g-t0', 830, 450, '철 횃불', { k: 'torch', i: 0 }, { r: 80 }),
  S('necro_nameless_graves', 'g-t1', 1220, 450, '철 횃불', { k: 'torch', i: 1 }, { r: 80 }),
  S('necro_nameless_graves', 'g-t2', 1025, 780, '철 횃불', { k: 'torch', i: 2 }, { r: 80 }),
  S('necro_nameless_graves', 'g-stair', 880, 600, '열린 계단', { k: 'gate', to: 'necro_catacomb', back: P(770, 860), need: ['steps'] }, { hatch: 'open', show: ['steps'] }),

  S('necro_catacomb', 'c-sword', 440, 780, '부러진 검', TAKE('sword', ['바닥에 버려진 부러진 검을 주웠다. 손잡이에 고리와 검 문양이 있다.']), { show: ['!sword'] }),
  S('necro_catacomb', 'c-statue', 770, 380, '검을 든 기사상', { k: 'record', set: 'seal0', need: ['sword'],
    lock: ['기사상이 빈 두 손을 앞으로 내밀고 있다. 무언가를 쥐고 있었던 것 같다.'],
    ok: ['부러진 검을 기사상의 손에 돌려놓았다.', '석관 사이로 그림자 병사 하나가 몸을 일으킨다.', '병사는 말없이 무릎을 꿇고 사라진다. 그 자리에 차가운 돌 인장이 남았다.', '이름 없는 군단의 인장을 얻었다. 인장 뒷면의 문양이 뒤편 벽에서 희미하게 빛난다.'] }, { r: 120 }),
  S('necro_catacomb', 'c-c0', 190, 330, '해 문양 석관', T(['뚜껑에 해가 새겨져 있다. 「출정하던 아침」이라는 뜻이라고 한다.'])),
  S('necro_catacomb', 'c-c1', 160, 500, '나무 문양 석관', T(['뚜껑에 나무가 새겨져 있다. 고향을 뜻하는 문양이다.'])),
  S('necro_catacomb', 'c-c2', 140, 690, '성 문양 석관', T(['뚜껑에 성이 새겨져 있다. 지켜야 할 곳.'])),
  S('necro_catacomb', 'c-c3', 1360, 330, '새 문양 석관', T(['뚜껑에 날개를 편 새가 새겨져 있다.'])),
  S('necro_catacomb', 'c-c4', 1390, 500, '저울 문양 석관', T(['뚜껑에 저울이 새겨져 있다. 한쪽 접시가 비어 있다.'])),
  S('necro_catacomb', 'c-c5', 1400, 690, '달 문양 석관', T(['뚜껑에 구름에 가린 달이 새겨져 있다. 침묵을 뜻한다고 한다.'])),
  S('necro_catacomb', 'c-wall', 300, 330, '희미하게 빛나는 벽 문양', { k: 'gate', to: 'necro_old_graves', back: P(430, 760), need: ['seal0'],
    lock: ['벽에 무언가 새겨져 있지만 너무 희미해 알아볼 수 없다.'], first: ['인장을 벽 문양에 대자 돌이 안쪽으로 밀린다.', '좁은 지하 보행로가 어둠 속으로 이어진다.'] }, { hatch: 'open', show: ['seal0'] }),
  S('necro_catacomb', 'c-seven', 770, 470, '일곱 개의 빈 홈', { k: 'order', set: 'seven', need: NQ_SEALS, items: SEAL_ITEMS, ans: [0, 1, 2, 3, 4, 5, 6],
    lock: ['기사상 앞 바닥에 둥글게 빈 홈 일곱 개가 파여 있다. 무엇을 넣는 자리일까.'],
    intro: ['벽의 문장이 인장 빛에 떠오른다.', '「검이 길을 열었고, 방패가 생명을 지켰다. 기록은 맹세를 남겼으며 날개는 희망을 옮겼다.', '시간은 그날을 기억했고 경계는 왕국을 숨겼다. 마지막 침묵이 왕의 이름을 지웠다.」'],
    ok: ['일곱 인장이 제자리에 들어가자 기사상의 눈에 빛이 든다.', '석관이 갈라지며 아래로 내려가는 거대한 계단이 열렸다.', '이름 없는 군단의 인장이 새로운 모양으로 빛난다.'], bad: '인장이 빛을 잃고 홈에서 밀려 나온다. 인장은 그대로 남았다.' }, { show: (u, has) => has('seal0') }),
  S('necro_catacomb', 'c-down', 770, 640, '지하 왕국으로 가는 계단', { k: 'gate', to: 'necro_kingdom', back: P(770, 800), need: ['seven'] }, { hatch: 'open', show: ['seven'] }),

  /* ── 2장 · 돌아오지 않은 병사 ── 버려진 공동묘지 */
  S('necro_old_graves', 'o-gate', 770, 250, '다섯 홈이 있는 석문', { k: 'order', set: 'banner', need: ['r0', 'r1', 'r2', 'r3', 'r4'], items: ['목걸이', '투구', '군기', '방패', '검집'], ans: [0, 1, 2, 3, 4],
    lock: ['석문에 인장과 같은 문양과 다섯 개의 홈이 있다.', '「모든 행군에는 돌아오지 못한 날보다 먼저 시작한 날이 있다.」'],
    intro: ['다섯 홈에 유품을 놓을 차례를 정한다.', '「모든 행군에는 돌아오지 못한 날보다 먼저 시작한 날이 있다.」'],
    ok: ['석문이 열리며 병사들의 목소리가 겹쳐 들린다.', '「설령 죽음이 막더라도 돌아오겠다.」', '석문 안쪽 받침대에서 제1군단의 군기를 얻었다.'],
    bad: '유품이 홈에서 굴러 나와 가방으로 돌아왔다. 차례가 맞지 않는 것 같다.' }, { r: 130 }),
  S('necro_old_graves', 'o-r0', 1310, 830, '낮은 묘석 뒤', TAKE('r0', ['작은 목걸이를 주웠다.', '기억 — 「문 앞에서 어머니가 목걸이를 걸어 주었다. 다녀오겠다고 말했다.」']), { ...pr('necklace', 60), show: ['!r0'] }),
  S('necro_old_graves', 'o-r1', 140, 760, '무너진 초소', TAKE('r1', ['부러진 투구를 주웠다.', '기억 — 「처음 투구를 받은 날, 너무 커서 동료들이 웃었다.」']), { ...pr('helmet', 70), show: ['!r1'] }),
  S('necro_old_graves', 'o-r2', 70, 520, '숨은 깃대', TAKE('r2', ['찢긴 리본이 묶인 깃대에서 낡은 군기 조각을 내렸다.', '기억 — 「군기를 앞세우고 성문을 나섰다. 다들 노래를 불렀다.」']), { show: ['!r2'] }),
  S('necro_old_graves', 'o-r3', 1240, 440, '불탄 전투 흔적', TAKE('r3', ['깨진 방패를 주웠다.', '기억 — 「마지막 싸움이었다. 방패가 갈라질 때까지 물러서지 않았다.」']), { ...pr('shield', 70), show: ['!r3'] }),
  S('necro_old_graves', 'o-r4', 240, 300, '닫힌 묘실', TAKE('r4', ['바닥의 검 자국을 따라 묘실 문틈에서 녹슨 검집을 꺼냈다.', '기억 — 「쓰러지기 전, 왕 앞에 무릎을 꿇고 마지막 맹세를 했다.」']), { show: ['!r4'] }),
  S('necro_old_graves', 'o-cof0', 210, 560, '작은 관', T(['안이 비어 있다. 먼지만 쌓였다.']), pr('coffin', 110)),
  S('necro_old_graves', 'o-cof1', 1440, 720, '작은 관', { k: 'mimic', mid: 'cof', seal: 'cofMimic',
    intro: ['다른 관과 똑같아 보인다.', '그런데 안에서 같은 말이 계속 되풀이된다. 「돌아… 돌아… 돌아…」', '진짜 유품은 온전한 기억을 들려주었다.'],
    opts: ['열어 본다', '물러난다', '인장을 비춰 본다'], poke: ['인장 빛이 닿자 관이 움찔하며 이빨을 다문다. 인장에 반응하지 않는 가짜다.', '관 뚜껑에 돌을 올려 두었다. 이제 조용하다.'], pokeSeal: 1,
    sealed: ['돌을 올려 둔 관이다. 이제 조용하다.'] }, pr('coffin', 110)),
  S('necro_old_graves', 'o-door', 1305, 250, '군기 문양의 병영 문', { k: 'gate', to: 'necro_barracks', back: P(770, 890), need: ['banner'], lock: ['색 바랜 군기 문양이 새겨진 철문이다. 꿈쩍하지 않는다.'],
    first: ['군기를 들자 문양이 빛나며 철문이 천천히 열린다.'] }),

  /* ── 3장 · 부러진 검의 주인 ── 잊힌 병영 · 카르돈 */
  S('necro_barracks', 'b-roll', 360, 230, '출정 명부', T(['출정 명부다. 「출정 이유 — 국경 마을의 피난민을 지키기 위해」', '명부 끝에 「병사 셋은 다리를 지키다 돌아오지 않음」이라고 적혀 있다.'], 'rollA')),
  S('necro_barracks', 'b-sw0', 340, 480, '부러진 검', T(['부러진 검의 날에 글이 새겨져 있다. 「맹세는 마지막 행군 전날 밤, 모닥불 앞에서」'], 'rollB'), { r: 70 }),
  S('necro_barracks', 'b-sw1', 780, 645, '부러진 검', T(['손잡이에 천이 감겨 있다. 다친 동료를 업고 가느라 칼을 놓쳤다는 쪽지가 끼어 있다.'], 'rollC'), { r: 70 }),
  S('necro_barracks', 'b-sw2', 1200, 650, '부러진 검', T(['이 검은 날이 아니라 칼등이 닳았다. 베기보다 막는 데 썼다.']), { r: 70 }),
  S('necro_barracks', 'b-socket', 905, 270, '빈 군기 받침', { k: 'record', set: 'flag', need: ['banner'], lock: ['군기를 꽂는 받침이 비어 있다.'],
    ok: ['제1군단의 군기를 받침에 세웠다.', '의자 위로 그림자가 모여 큰 기사의 모습이 된다.', '카르돈|그대는 병사들의 마지막 행군을 기억하는가? 힘만으로 군기를 들 수는 없다.'] }),
  S('necro_barracks', 'b-kardon', 770, 330, '검의 장군 카르돈', { k: 'trialGen', gen: 'kardon', quiz: {
    q: '카르돈|대답해 보라.', items: [
      { n: '병사들은 왜 출정했는가', opts: ['왕의 영토를 넓히려고', '피난민을 지키려고', '보물을 찾으려고'], ans: 1 },
      { n: '맹세를 남긴 때는 언제인가', opts: ['성문을 나서던 아침', '마지막 행군 전날 밤', '싸움이 끝난 뒤'], ans: 1 },
      { n: '그들은 무엇을 지키려 했는가', opts: ['자기 목숨', '다친 동료', '군기'], ans: 1 }],
    ok: ['카르돈|기억하고 있군. 이제 검의 길을 걸어 보라.'], bad: '카르돈|틀렸다. 병영에 남은 기록을 다시 보고 오라.' },
    steps: [{ flag: 'quiz' }, { flag: 'pathT', trial: 'path' }, { flag: 'guardT', trial: 'guard' }],
    done: ['카르돈|…병사들을 먼저 지켰군.', '카르돈이 검을 바닥에 꽂고 무릎을 꿇는다.', '검의 인장 · 장군의 기억 1 을 얻었다.', '기억 — 세 개의 기둥이 물에 잠긴 전장을 가리키고 있다. 병영 뒷문 너머로 강변 배수로가 열렸다.'],
    reward: ['sSword', 'm1'] }, { ...gen('kardon'), r: 120, show: ['flag'] }),
  S('necro_barracks', 'b-back', 1275, 250, '병영 뒷문', { k: 'gate', to: 'necro_riverbank', back: P(260, 900), need: ['sSword'], lock: ['뒷문이 안쪽에서 단단히 잠겨 있다.'] }),

  /* ── 4장 · 물속에 잠긴 맹세 ── 외곽 강변 · 침몰한 지하 신전 · 발테른 */
  S('necro_riverbank', 'rv-p0', 430, 420, '부러진 돌기둥', T(['기둥 아래에 검 문양이 있다. 문양의 끝이 오른쪽 아래를 가리킨다.'], 'pl0'), { r: 100 }),
  S('necro_riverbank', 'rv-p1', 1130, 420, '부러진 돌기둥', T(['기둥 아래에 검 문양이 있다. 문양의 끝이 왼쪽 아래를 가리킨다.'], 'pl1'), { r: 100 }),
  S('necro_riverbank', 'rv-p2', 780, 880, '부러진 돌기둥', T(['기둥 아래에 검 문양이 있다. 문양의 끝이 위를 가리킨다.'], 'pl2'), { r: 100 }),
  S('necro_riverbank', 'rv-sign0', 100, 610, '낡은 안내석', T(['「물길 — 이쪽」 화살표가 서쪽을 가리킨다.', '반대편 안내석은 동쪽을 가리키고 있었다.'])),
  S('necro_riverbank', 'rv-sign1', 1430, 600, '낡은 안내석', T(['「물길 — 이쪽」 화살표가 동쪽을 가리킨다.', '두 안내석 중 하나는 거짓말을 하고 있다. 아니면 둘 다.'])),
  S('necro_riverbank', 'rv-grate', 780, 525, '녹슨 배수 격자', { k: 'gate', to: 'necro_sunken_temple', back: P(770, 830), need: ['pl0', 'pl1', 'pl2'],
    lock: ['격자 아래로 물소리가 난다. 손잡이가 물이끼에 붙어 꿈쩍하지 않는다.'], first: ['세 기둥의 문양이 모두 이 자리를 가리킨다.', '격자를 들어 올리자 정비용 수문 손잡이가 보인다. 물이 빠진 통로가 아래로 이어진다.'], firstSet: 'pillars' }, { r: 110 }),

  S('necro_sunken_temple', 't-mural', 600, 110, '벽화', T(['물결과 방패를 그린 벽화다. 아래에 글이 남아 있다.', '「물이 밀려올 때는 길을 닫고, 물이 빠지면 가운데 길을 열어라.」', '왼쪽 수문 옆에는 「먼저」, 오른쪽 수문 옆에는 「다음」이라고 긁혀 있다.'])),
  S('necro_sunken_temple', 't-gauge', 640, 200, '압력계', { k: 'gauge' }),
  S('necro_sunken_temple', 't-gL', 385, 190, '왼쪽 배수문', { k: 'seq', g: 'water', i: 0, n: 3, set: 'gates', ok: ['가운데 유입문이 열리며 신전 바닥의 물이 모두 빠졌다.'], bad: '물이 다시 차오르며 수문이 모두 닫혔다. 처음부터 다시 열자.' }),
  S('necro_sunken_temple', 't-gC', 770, 190, '중앙 유입문', { k: 'seq', g: 'water', i: 2, n: 3, set: 'gates', gauge: 1, ok: ['가운데 유입문이 열리며 신전 바닥의 물이 모두 빠졌다.'], bad: '물이 다시 차오르며 수문이 모두 닫혔다. 처음부터 다시 열자.' }),
  S('necro_sunken_temple', 't-gR', 1215, 190, '오른쪽 배수문', { k: 'seq', g: 'water', i: 1, n: 3, set: 'gates', ok: ['가운데 유입문이 열리며 신전 바닥의 물이 모두 빠졌다.'], bad: '물이 다시 차오르며 수문이 모두 닫혔다. 처음부터 다시 열자.' }),
  S('necro_sunken_temple', 't-f0', 580, 190, '장식 수문', T(['손잡이가 없는 장식용 문이다.'])),
  S('necro_sunken_temple', 't-f1', 1015, 190, '장식 수문', T(['파도 문양만 새긴 장식이다. 열리는 장치가 없다.'])),
  S('necro_sunken_temple', 't-f2', 1395, 190, '장식 수문', T(['안쪽이 막힌 가짜 문이다.'])),
  S('necro_sunken_temple', 't-valtern', 770, 500, '방패의 장군 발테른', { k: 'trialGen', gen: 'valtern', need: ['gates'],
    intro: ['발테른|이 방의 병사 다섯을 지켜라. 3분이다.', '발테른|마지막까지 방패를 내리지 않은 자는 드물었다.'],
    steps: [{ flag: 'gates' }, { flag: 'sShield', trial: 'shield' }],
    done: ['발테른|…넷 이상이 살아남았군.', '방패의 인장 · 장군의 기억 2 를 얻었다.', '기억 — 방패 안쪽에 세 문양이 있다. 「달 · 저울 · 나무」. 서고의 분류 암호라고 한다.', '왼쪽 위 건식 통로가 열렸다.'],
    reward: ['sShield', 'm2'] }, { ...gen('valtern'), r: 130, show: ['gates'] }),
  S('necro_sunken_temple', 't-dry', 110, 230, '건식 통로', { k: 'gate', to: 'necro_archive', back: P(770, 880), need: ['sShield'], lock: ['좁은 통로 끝이 물에 잠겨 있다.'] }),

  /* ── 5장 · 죽은 자의 언어 ── 봉인된 지하 서고 · 세리온 */
  S('necro_archive', 'a-table', 160, 380, '분류표', T(['책을 나누는 분류표다.', '「달 — 사라진 것 · 저울 — 판결 · 나무 — 뿌리 · 해 — 시작 · 성 — 지킬 곳」', '빈 책장의 회전 장치에도 같은 문양이 있다.'], 'cls')),
  S('necro_archive', 'a-dial', 985, 250, '책장 회전 장치', { k: 'dials', set: 'dial', q: '세 칸의 문양을 맞춘다.',
    items: [{ n: '첫째 칸', opts: ['해', '달', '성'], ans: 1 }, { n: '둘째 칸', opts: ['저울', '나무', '해'], ans: 0 }, { n: '셋째 칸', opts: ['성', '달', '나무'], ans: 2 }],
    ok: ['회전 장치가 맞물리며 빈 책장의 이름표에 빛이 든다.', '이름표 넷 — 「전장」 「도망」 「행방」 「없음」.'], bad: '장치가 헛돈다.' }),
  S('necro_archive', 'a-b0', 300, 600, '독서대의 책', TAKE('bk0', ['《왕의 마지막 전투》 — 왕은 전장에서 쓰러졌다. 여백에 누군가 「거짓」이라고 적었다.']), { r: 80 }),
  S('necro_archive', 'a-b1', 545, 560, '독서대의 책', TAKE('bk1', ['《배신자의 왕관》 — 왕은 병사를 버리고 도망쳤다. 몇 장이 칼로 오려져 있다.']), { r: 80 }),
  S('necro_archive', 'a-b2', 985, 560, '독서대의 책', TAKE('bk2', ['《사라진 군단》 — 왕은 군단과 함께 사라졌다. 마지막 쪽이 비어 있다.']), { r: 80 }),
  S('necro_archive', 'a-b3', 1250, 600, '독서대의 책', TAKE('bk3', ['《없었던 나라》 — 그런 왕국은 존재하지 않았다. 표지 안쪽에 같은 문양이 찍혀 있다.']), { r: 80 }),
  S('necro_archive', 'a-shelf', 770, 260, '이름표만 남은 빈 책장', { k: 'dials', set: 'books', need: ['dial', 'bk0', 'bk1', 'bk2', 'bk3'], q: '네 권을 이름표 자리에 꽂는다.',
    lock: ['이름표만 있고 책이 없는 빈 책장이다. 옆에 회전 장치가 붙어 있다.'],
    items: ['전장', '도망', '행방', '없음'].map((n, i) => ({ n: `「${n}」 자리`, opts: ['왕의 마지막 전투', '배신자의 왕관', '사라진 군단', '없었던 나라'], ans: i })),
    ok: ['네 권을 모두 꽂고 가운데 빈 책등을 눌렀다.', '네 책 모두에서 같은 문장이 지워져 있었다는 것이 드러난다.', '「왕은 스스로…」 — 그 뒤는 비어 있다.', '서가가 밀리며 오른쪽 숨은 기록실 문이 열렸다.'], bad: '책 한 권이 다시 튀어나온다. 이름표와 맞지 않는다.' }, { r: 120 }),
  S('necro_archive', 'a-mim', 250, 230, '흔들리는 책장', { k: 'mimic', mid: 'shelf', seal: 'shelfMimic',
    intro: ['오래된 책장이다. 그런데 책등 하나가 숨을 쉬듯 미세하게 움직인다.'], opts: ['책을 뽑아 본다', '물러난다', '책장 잠금 장치를 건다'],
    poke: ['잠금 장치를 걸자 책장이 덜컥 멈춘다. 책등 사이로 이빨이 잠깐 보였다.', '이제 조용하다.'], pokeSeal: 1, sealed: ['잠금 장치를 건 책장이다.'] }),
  S('necro_archive', 'a-room', 1390, 300, '숨은 기록실', { k: 'trialGen', gen: 'serion', need: ['books'], lock: ['벽에 가는 틈이 보인다. 서가 어딘가와 이어진 것 같다.'],
    intro: ['세리온|왕국의 마지막 날 여섯 장면이다. 차례대로 놓아 보라.', '벽에 날짜 표식이 희미하게 남아 있다.'],
    order: { items: ['군단이 국경으로 출정하다', '지휘권을 노리는 자들이 나타나다', '피난민을 지키며 다리에서 싸우다', '왕이 이름을 지우라 명하다', '장군들이 인장을 나누어 떠나다', '왕국이 지도에서 사라지다'],
      shuffle: [3, 0, 5, 2, 1, 4], ans: [0, 1, 2, 3, 4, 5], bad: '장면들이 흐려지며 흩어진다. 배열만 처음으로 돌아갔다.' },
    steps: [{ flag: 'books' }, { flag: 'sRecord', order: 1 }],
    done: ['세리온|그대는 글을 읽은 것이 아니라, 지워진 자리를 읽었군.', '기록의 인장 · 장군의 기억 3 을 얻었다.', '기억 — 검은 깃털이 내리는 절벽과 하늘의 사원. 서고 뒷문에 순례길 표시가 생겼다.'],
    reward: ['sRecord', 'm3'] }, { ...gen('serion'), r: 120 }),
  S('necro_archive', 'a-back', 1365, 820, '서고 뒷문', { k: 'gate', to: 'necro_sky_shrine', back: P(160, 420), need: ['sRecord'], lock: ['뒷문 밖은 짙은 안개다. 어디로 가야 할지 모르겠다.'] }),

  /* ── 6장 · 하늘에서 추방된 자 ── 무너진 하늘의 사원 · 라에딘 */
  S('necro_sky_shrine', 's-vane', 245, 480, '바람개비', T(['바람개비가 동쪽에서 불어오는 바람에 돈다.', '찢긴 깃발도, 떨어지는 깃털도 바람을 따라 같은 곳에 걸린다. 창틀 · 다리 아래 · 전망대 · 처형장 입구 · 종탑.'])),
  S('necro_sky_shrine', 's-f0', 290, 230, '낡은 창틀', TAKE('f0', ['창틀 틈에 걸린 검은 깃털을 뺐다.']), { ...pr('feather', 60), show: ['!f0'] }),
  S('necro_sky_shrine', 's-f1', 470, 880, '부러진 다리 밑', TAKE('f1', ['난간 아래 틈에 걸린 검은 깃털을 주웠다.']), { ...pr('feather', 60), show: ['!f1'] }),
  S('necro_sky_shrine', 's-f2', 1340, 400, '전망대의 돌 틈', TAKE('f2', ['돌 틈에 박힌 검은 깃털을 뺐다.']), { ...pr('feather', 60), show: ['!f2'] }),
  S('necro_sky_shrine', 's-f3', 770, 560, '옛 처형장 입구', TAKE('f3', ['처형장 계단 아래에서 검은 깃털을 주웠다.']), { ...pr('feather', 60), show: ['!f3'] }),
  S('necro_sky_shrine', 's-f4', 1210, 250, '종탑 아래', TAKE('f4', ['종탑 계단에 떨어진 검은 깃털을 주웠다.']), { ...pr('feather', 60), show: ['!f4'] }),
  S('necro_sky_shrine', 's-slab', 900, 470, '처형장의 석판', T(['「날개의 라에딘, 왕을 배신하여 이곳에서 처형되다」', '그런데 석판 앞 발자국은 모두 처형장 바깥으로, 아이 걸음과 함께 나 있다.'])),
  S('necro_sky_shrine', 's-statues', 770, 420, '네 석상', { k: 'pick', set: 'statue', need: ['f0', 'f1', 'f2', 'f3', 'f4'], q: '어느 석상 앞에 깃털 다섯을 놓을까?',
    lock: ['처형장에 석상 넷이 서 있다. 검은 깃털이 바람에 날려 와 받침에 닿았다가 날아간다.'],
    opts: ['칼을 짚고 고개 숙인 석상', '아이를 감싸 안은 석상', '하늘을 우러르는 석상', '화관을 든 석상'], ans: 1,
    ok: ['아이를 감싼 석상 앞에 깃털을 놓자 석판의 글이 녹아내린다.', '새로 드러난 글 — 「라에딘, 처형장에서 아이들을 업고 다리를 건넜다」', '석상 그림자가 일어나 다리 건너 전망대로 걸어간다.'], bad: '깃털이 받침 위에서 바람에 흩어졌다가 다시 내 손으로 돌아온다.' }, { r: 130 }),
  S('necro_sky_shrine', 's-raedin', 1340, 470, '날개의 장군 라에딘', { k: 'trialGen', gen: 'raedin', need: ['statue'],
    intro: ['라에딘|그날 나는 왕보다 눈앞의 생명을 골랐다.', '라에딘|다리 건너편의 병사 셋을 이곳까지 데려와라. 너만 먼저 와서는 안 된다.', '다리 아래쪽 끝에서 시험이 시작된다.'],
    steps: [{ flag: 'statue' }, { flag: 'sWing', trial: 'escort' }],
    done: ['라에딘|나는 왕을 배신하지 않았다. 그날 내 앞에 있던 생명을 선택했을 뿐.', '날개의 인장 · 장군의 기억 4 · 낡은 회중시계를 얻었다.', '회중시계 바늘이 종탑 쪽에서 빠르게 돈다.'],
    reward: ['sWing', 'm4', 'watch'] }, { ...gen('raedin'), r: 130, show: ['statue'] }),
  S('necro_sky_shrine', 's-bell', 1300, 250, '멈춘 장례 종', { k: 'gate', to: 'necro_funeral_hall', back: P(770, 800), need: ['watch'], lock: ['커다란 종이 멈춰 있다. 줄을 당겨도 소리가 나지 않는다.'],
    first: ['회중시계를 종 앞에 꺼내자 바늘이 거꾸로 돈다.', '종 뒤의 공기가 갈라지며 시간의 틈이 열렸다.'] }, { r: 110 }),

  /* ── 7장 · 멈춘 장례 행렬 ── 멈춘 장례식장 · 오르벤 */
  ...[
    ['출정', '깃대가 멀쩡하다. 그림자가 길게 서쪽으로 눕는다. 아침이다. 병사들이 성문을 나선다.'],
    ['소식', '한낮. 전령이 편지를 들고 뛰어온다. 깃대 하나가 부러져 있다.'],
    ['귀환', '저녁. 들것에 실린 병사들이 돌아온다. 부러진 깃대가 그대로 있다.'],
    ['가짜', '밤. 깃대가 모두 멀쩡하다. 사람들이 웃으며 잔치를 연다.'],
    ['행렬', '다음 날 새벽. 부러진 깃대 아래로 장례 행렬이 지나간다.'],
    ['맹세', '그 밤 늦게. 남은 장군들이 관 앞에서 인장을 나눈다.'],
  ].map(([, line], i) => S('necro_funeral_hall', `f-k${i}`, [250, 400, 560, 980, 1130, 1290][i], 240, '멈춘 시계', { k: 'clock', set: `k${i}`, lines: [line] }, { r: 90 })),
  S('necro_funeral_hall', 'f-coffin', 770, 450, '검은 관', { k: 'order', set: 'clocks', need: ['k0', 'k1', 'k2', 'k3', 'k4', 'k5'], pickN: 5,
    lock: ['관 앞에 시계 장면을 놓는 받침이 있다. 시계마다 다른 순간이 멈춰 있다.'],
    intro: ['참된 다섯 장면을 시간 차례로 놓는다. 깃대와 그림자가 맞지 않는 장면은 빼야 한다.'],
    items: ['아침 — 출정', '한낮 — 소식', '저녁 — 귀환', '밤 — 잔치', '새벽 — 장례 행렬', '그 밤 — 마지막 맹세'], ans: [0, 1, 2, 4, 5],
    ok: ['관 위의 꽃잎이 한 장 떨어진다. 멈춰 있던 조문객들이 고개를 든다.', '오르벤|순서를 아는구나. 이제 지난 걸음을 따라 걸어 보라.'], bad: '시곗바늘이 모두 제자리로 돌아간다.' }, { r: 120 }),
  S('necro_funeral_hall', 'f-orben', 770, 600, '시간의 장군 오르벤', { k: 'trialGen', gen: 'orben', need: ['clocks'],
    intro: ['오르벤|3초 전의 너와 지금의 네가 다른 발판을 밟아야 문이 열린다.', '발판 둘을 동시에 눌러라. 세 장면이다.'],
    steps: [{ flag: 'clocks' }, { flag: 'sTime', trial: 'echo' }],
    done: ['오르벤|시간을 돌려도 죽은 자가 돌아오지는 않는다. 그러나 잊힌 일을 기억할 수는 있지.', '시간의 인장 · 장군의 기억 5 를 얻었다.', '마지막 기억의 순간 공간이 갈라진다. 뒷문에 같은 모양의 균열이 생겼다.'],
    reward: ['sTime', 'm5'] }, { ...gen('orben'), r: 120, show: ['clocks'] }),
  S('necro_funeral_hall', 'f-door', 770, 250, '균열이 비치는 뒷문', { k: 'gate', to: 'necro_rift_altar', back: P(330, 900), need: ['sTime'], lock: ['문틈으로 낯선 빛이 새어 나온다. 열리지 않는다.'] }, { r: 110 }),

  /* ── 8장 · 죽음의 경계 ── 균열의 제단 · 모르켄. 왼쪽 산 자의 세계를 보고 오른쪽 죽은 자의 세계 장치를 맞춘다(고정 정답) */
  S('necro_rift_altar', 'r-l0', 430, 260, '산 자의 석상', T(['석상이 고개를 왼쪽으로 돌리고 있다.'], 'live')),
  S('necro_rift_altar', 'r-l1', 345, 340, '산 자의 화로', T(['화로에 푸른 불이 타오른다.'], 'live')),
  S('necro_rift_altar', 'r-l2', 75, 560, '산 자의 기둥', T(['기둥이 무릎 높이에서 부러져 있다.'], 'live')),
  S('necro_rift_altar', 'r-l3', 195, 720, '산 자의 첨탑', T(['첨탑 꼭대기 문양에만 빛이 들어와 있다.'], 'live')),
  S('necro_rift_altar', 'r-d0', 1110, 260, '죽은 자의 석상', { k: 'dial', key: 'rs', opts: [0, 1, 2], names: ['정면', '왼쪽', '오른쪽'], unit: '', note: '석상의 고개를 돌린다.' }),
  S('necro_rift_altar', 'r-d1', 1195, 340, '죽은 자의 화로', { k: 'dial', key: 'rb', opts: [0, 1, 2], names: ['꺼짐', '붉은 불', '푸른 불'], unit: '', note: '화로의 불을 바꾼다.' }),
  S('necro_rift_altar', 'r-d2', 1460, 560, '죽은 자의 기둥', { k: 'dial', key: 'rp', opts: [0, 1, 2], names: ['온전함', '허리 높이', '무릎 높이'], unit: '', note: '기둥 높이를 맞춘다.' }),
  S('necro_rift_altar', 'r-d3', 1340, 720, '죽은 자의 첨탑', { k: 'dial', key: 'ro', opts: [0, 1, 2], names: ['모두 켜짐', '꼭대기만', '모두 꺼짐'], unit: '', note: '첨탑의 빛을 맞춘다.' }),
  S('necro_rift_altar', 'r-mural', 1200, 860, '경계의 벽화', T(['「강제로 쓰러뜨릴수록 경계는 닫힌다.」', '쇠사슬에 묶인 기사 둘레로 봉인석 넷이 그려져 있다. 왼쪽 위 → 오른쪽 위 → 왼쪽 아래 → 오른쪽 아래.'])),
  S('necro_rift_altar', 'r-morken', 770, 300, '쇠사슬에 묶인 장군 모르켄', { k: 'trialGen', gen: 'morken',
    check: { keys: { rs: 1, rb: 2, rp: 2, ro: 1 }, set: 'mirror', bad: ['모르켄을 묶은 쇠사슬이 오히려 조여든다.', '두 세계의 장치 넷이 서로 다르다. 왼쪽 세계를 먼저 살펴야 한다.'],
      ok: ['두 세계의 장치가 같아지자 쇠사슬이 느슨해진다.', '모르켄|…경계를 맞췄군. 봉인석 넷을 차례대로 풀어라. 나를 베려 하지 마라.'] },
    steps: [{ flag: 'mirror', check: 1 }, { flag: 'sBound', trial: 'seal' }],
    done: ['모르켄|나를 쓰러뜨리지 않고 구해낸 자는 네가 처음이다.', '경계의 인장 · 장군의 기억 6 을 얻었다.', '제단 아래 관측 장치에 인장 여섯을 대면 사라진 별자리를 되살릴 수 있을 것 같다.'],
    reward: ['sBound', 'm6'] }, { ...gen('morken'), r: 130 }),
  S('necro_rift_altar', 'r-device', 770, 900, '관측 장치', { k: 'gate', to: 'necro_observatory', back: P(230, 900), need: ['sSword', 'sShield', 'sRecord', 'sWing', 'sTime', 'sBound'],
    lock: ['둥근 고리 여섯 개가 비어 있는 관측 장치다.'], first: ['여섯 인장을 고리에 대자 사라진 별자리가 떠오른다.', '좌표가 복원되며 관측 통로가 열렸다.'], firstSet: 'coords' }, { r: 110 }),

  /* ── 9장 · 지워진 왕의 기록 ── 이름 없는 관측소 · 에레보스(빛 띠는 NQ_HAZARDS) */
  S('necro_observatory', 'ob-boardL', 110, 330, '기록판', T(['「관측 장치는 여섯 박자마다 바닥을 쓴다. 빛이 닿기 전 바닥 줄이 먼저 희게 빛난다.」'])),
  S('necro_observatory', 'ob-boardR', 1410, 330, '기록판', T(['「일곱째 이름은 지운 것이 아니다. 스스로 비운 것이다.」 — 누군가 덧쓴 글씨다.'])),
  S('necro_observatory', 'ob-plates', 590, 250, '일곱 명패', { k: 'record', set: 'plates', need: ['sSword', 'sShield', 'sRecord', 'sWing', 'sTime', 'sBound'],
    lock: ['여섯 장군의 이름이 새겨진 명패 옆에 빈 명패가 하나 있다.'],
    ok: ['여섯 인장을 명패 둘레의 홈에 대었다.', '빈 명패에 글자가 떠오른다 — 「왕은 스스로 이름을 내려놓았다」.'] }),
  S('necro_observatory', 'ob-erebos', 945, 270, '침묵의 장군 에레보스', { k: 'trialGen', gen: 'erebos', need: ['plates'],
    quiz: { q: '에레보스|…', items: [
      { n: '왕은 어디에 있는가', opts: ['전장에서 죽었다', '도망쳤다', '죽음과 삶의 경계에 스스로를 봉인했다', '모르겠다'], ans: 2 },
      { n: '왕의 이름은 무엇인가', opts: ['남아 있지 않다 — 스스로 비웠다', '배신자', '모르겠다'], ans: 0 },
      { n: '그 이름을 누가 지웠는가', opts: ['지휘권을 노린 자들', '장군들', '왕 자신', '모르겠다'], ans: 2 }],
      ok: ['에레보스가 손가락을 입술에서 뗀다.', '에레보스|맞다. 왕은 군단이 악용되지 않도록 제 이름과 왕국을 지웠다.'],
      bad: '에레보스|…아직이다. 기록판과 명패를 다시 보고 와도 좋다.' },
    steps: [{ flag: 'plates' }, { flag: 'sSilence', quiz: 1 }],
    done: ['침묵의 인장 · 장군의 기억 7 을 얻었다.', '에레보스|일곱 맹세는 첫 무덤에서 끝난다.', '관측소 오른쪽 아래에 에르덴 외곽으로 돌아가는 귀환문이 열렸다.'],
    reward: ['sSilence', 'm7'] }, { ...gen('erebos'), r: 120, show: ['plates'] }),
  S('necro_observatory', 'ob-home', 1430, 830, '귀환문', { k: 'gate', to: 'necro_nameless_graves', back: P(880, 700), need: ['sSilence'], lock: ['돌 아치 안쪽에 보랏빛이 일렁이지만 손이 닿지 않는다.'] }),

  /* ── 11장 · 주인 없는 왕좌 ── 망자의 지하 왕국 · 침묵의 병영 · 검은 대성당 */
  S('necro_kingdom', 'k-plate', 230, 560, '식탁 위 접시', T(['접시 셋이 차려진 채 굳어 있다. 저녁을 먹으려던 순간 왕국이 멈췄다.', '그림자 시민 하나가 식탁 옆에서 가만히 이쪽을 바라본다.'], 'c0')),
  S('necro_kingdom', 'k-toy', 535, 670, '나무 장난감', T(['작은 나무 말이다. 바퀴 줄이 길 한가운데에 놓여 있다.', '「아빠가 돌아오면 같이 끌자」 — 아이 글씨.'], 'c1')),
  S('necro_kingdom', 'k-bag', 1150, 450, '떨어진 우편 가방', T(['군인의 편지가 쏟아져 있다.', '「왕께서 우리 이름을 지우신대. 그래야 누구도 우리를 부려 먹지 못한다고.」'], 'c2')),
  S('necro_kingdom', 'k-portrait', 1325, 430, '찢긴 가족 초상', T(['가족 초상화의 아버지 얼굴만 찢겨 나갔다.', '봉인은 병사만이 아니라 그들을 기억하던 사람들의 기억까지 지웠다.'], 'c3')),
  S('necro_kingdom', 'k-cathedral', 365, 250, '검은 대성당', { k: 'record', set: 'truth', need: ['c0', 'c1', 'c2', 'c3'],
    lock: ['대성당 문이 닫혀 있다. 문 옆에 「시민의 기록」을 놓는 자리가 비어 있다.', '거리의 유품을 다 모아야 열릴 것 같다.'],
    ok: ['시민의 기록을 놓자 대성당 안에서 왕의 마지막 기록이 울린다.', '왕|나는 병사들에게 죽음 이후까지 복종을 요구했다.', '왕|어느 날 그들의 지휘권을 빼앗으려는 자들이 나타났다. 군단을 원하는 자는 많았지만 군단을 지키려는 자는 없었다.', '왕|그래서 내 이름을 지웠다.', '왕은 패배해 사라진 것이 아니다. 스스로 지휘권을 봉인해 군단을 숨겼다.'] }, { r: 120 }),
  S('necro_kingdom', 'k-drill', 1100, 640, '침묵의 병영 연습장', { k: 'trialGen', gen: '', intro: ['연습장 말뚝 옆에 낡은 명령 깃발이 꽂혀 있다.', '시험 동안 그림자 명령을 쓸 수 있다. 소집 · 집결 · 방어 · 공격 · 귀환.', '실제 직업이 아니라 이 연습장 안에서만 통한다.'],
    steps: [{ flag: 'drill', trial: 'drill' }], done: ['연습장 말뚝이 모두 쓰러졌다. 그림자 병사들이 깃발 앞에 줄을 선다.'], reward: [] }, { r: 120 }),
  S('necro_kingdom', 'k-mim', 1240, 600, '줄 선 그림자 병사', { k: 'mimic', mid: 'sol', seal: 'solMimic',
    intro: ['그림자 병사들이 줄지어 서 있다. 그중 하나만 인장 빛에 고개를 돌리지 않는다.'], opts: ['어깨를 두드린다', '물러난다', '인장을 들어 보인다'],
    poke: ['인장을 들자 진짜 병사들은 무릎을 꿇는데, 하나만 그대로 선 채 이빨을 드러낸다.', '병사들이 그 가짜를 둘러싸 연습장 밖으로 몰아냈다.'], pokeSeal: 1, sealed: ['가짜가 빠진 자리를 진짜 병사가 채웠다.'] }, pr('kneel', 120)),
  S('necro_kingdom', 'k-gate', 1150, 260, '왕궁 문', { k: 'gate', to: 'necro_palace', back: P(770, 830), need: ['truth', 'drill'],
    lock: (u, has) => [!has('truth') ? '왕궁 문에 「진실을 모르는 자는 들어올 수 없다」라고 새겨져 있다.' : '', !has('drill') ? '문지기 그림자가 고개를 젓는다. 「명령을 모르는 자는 군단 앞에 설 수 없다.」' : ''].filter(Boolean) }, { r: 120 }),

  /* ── 11장 D · 12장 ── 망자의 왕궁 · 그림자의 왕좌 */
  S('necro_palace', 'p-altar', 770, 560, '왕궁 제단', { k: 'trialGen', gen: '', intro: ['제단의 검은 수정이 낮게 울린다.', '최초의 군주가 남긴 마지막 시험 — 제단 수호 · 군단 지휘 · 잔영.', '시험 동안 그림자 명령과 시험 기술을 쓴다. 레벨과 장비는 영향을 주지 않는다.'],
    steps: [{ flag: 'heir', trial: 'palace' }], done: ['제단의 수정이 빛을 거둔다. 왕좌로 가는 길이 열렸다.'], reward: [] }, { r: 140 }),
  S('necro_palace', 'p-throne', 770, 260, '그림자의 왕좌', { k: 'throne', need: ['heir'], lock: ['비어 있는 왕좌 위로 그림자가 일렁인다. 아직 다가갈 수 없다.'] }, { ...gen('king', 230), r: 140 }),
];
// 벽에 붙은 것은 걸을 수 있는 벽 밑으로 내려 다가갈 수 있게 한다
for (const s of NQ_SPOTS) { const m = NQ_MAPS.find((q) => q.id === s.map); if (m && s.at[1] < m.top + 24) s.at = [s.at[0], m.top + 24]; }

/* ── 위험 장치(피해 없음 — 걸리면 구간 시작으로) ── 관측소 빛 띠: 가로 띠마다 period 초 중 on 구간에 빛이 쓸고 warn 초 전부터 희게 빛난다 */
const LANE = (y0, y1, off) => ({ y0: Math.round(y0 * K), y1: Math.round(y1 * K), off });
export const NQ_HAZARDS = [
  { id: 'light', map: 'necro_observatory', kind: 'lanes', period: 6, on: 1.6, warn: 1.2, lanes: [LANE(470, 540, 0), LANE(540, 610, 1.5), LANE(610, 680, 3), LANE(680, 750, 4.5)],
    off: ['lightOk'], back: P(230, 900), msg: '관측 장치의 빛에 닿아 통로 입구로 밀려났다. 빛이 닿지 않는 검은 바닥만 밟자.' },
];
// 압력계 박자 — 수문 퍼즐(벽시계로 센다) — 안전 구간에만 중앙 유입문을 받는다
export const NQ_GAUGE = { period: 8, safe: [5, 8] };
// 미믹이 깨어나면 — 피해 없이 내 자리에 예고 원 → 물리면 밀려난다
export const NQ_MIMIC = { dur: 7, gap: 1.6, warn: 1.0, r: 80, push: 260 };

/* ── 시험 — 캐릭터 레벨 · 장비 · 직업과 관계없이 같은 값(기획안 4장 예시값) ──
   시험 체력 100 · 예고 뒤 고정 피해 · 보호막 한 번 막기 대기 8초 · 짧은 돌진 대기 5초 · 시험 명령(소집 · 집결 · 방어 · 공격 · 귀환) */
export const NQ_TEST = { hp: 100, hit: 25, bite: 8, biteGap: 1.2 };
export const NQ_SKILLS = {
  strike: { name: '그림자 일격', cd: 0.6, r: 150, dmg: 1 },     // 시험 기본 공격 — 둘레 적에게 1(적 체력은 칸 수)
  shield: { name: '영혼 보호막', cd: 8, r: 300 },                // 가까운 아군(병사 · 제단 · 나)이 다음 한 번을 막는다
  dash: { name: '시험 돌진', cd: 5, len: 340 },
  decoy: { name: '미끼 그림자', cd: 12, dur: 5, r: 520 },       // 그 자리로 적을 끈다
  call: { name: '소집', cd: 6 }, gather: { name: '집결' }, guard: { name: '방어' }, attack: { name: '공격' }, recall: { name: '귀환' },
};
export const NQ_CMDS = ['call', 'gather', 'guard', 'attack', 'recall'];
// 시험 적 · 아군 — 체력은 칸 수, 빠르기는 초당 거리
export const NQ_FOES = {
  hound: { hp: 2, spd: 150, rad: 24, dmg: 1, gap: 1.2 },     // 그림자 사냥개 — 병사를 문다(병사 체력 1칸)
  knight: { hp: 4, spd: 95, rad: 28, dmg: 1, gap: 1.6 },
  pylon: { hp: 10, spd: 0, rad: 34, dmg: 0, gap: 9 },          // 군주의 보호막 기둥
  lord: { hp: 120, spd: 0, rad: 70, dmg: 0, gap: 2.4 },        // 최초의 군주 잔영
  post: { hp: 3, spd: 0, rad: 26, dmg: 0, gap: 9 },            // 연습장 말뚝
  chaser: { hp: 999, spd: 70, rad: 40, dmg: 0, gap: 1.4 },     // 경계의 느린 그림자(쓰러뜨릴 수 없다)
};
export const NQ_ALLY = { hp: 3, spd: 170, reach: 60, gap: 0.9, dmg: 1, aggro: 520 };

const A = (x, y) => P(x, y);
export const NQ_TRIALS = {
  // 3장 B — 검의 길: 문양 다섯을 차례로 밟는다. 장군이 바닥에 예고 범위를 그린다
  path: { map: 'necro_barracks', name: '검의 길', start: A(770, 880), skills: ['dash'], pads: [A(400, 340), A(1040, 400), A(720, 510), A(465, 705), A(1010, 790)],
    warn: { gap: 1.7, d: 1.0, r: 120 } },
  // 3장 C — 병사를 지켜라: 병사 셋 · 60초 · 둘 이상 살아남으면 통과(정한 값)
  guard: { map: 'necro_barracks', name: '병사를 지켜라', start: A(770, 640), skills: ['strike', 'shield', 'dash'], dur: 60, need: 2,
    // 병사 셋: 한 변 260 인 정삼각형. 화면에서 사용자가 노란 점으로 찍은 자리(11월 21일) — 위 한 명은 캐릭터 바로 위, 아래 둘은 양옆 아래. 시작 자리는 삼각형 가운데
    allies: [A(770, 497), A(640, 722), A(900, 722)], waves: { gap: 3.2, n: [1, 2], kinds: ['hound'] } },
  // 4장 — 방어: 병사 다섯 · 3분 · 넷 이상
  shield: { map: 'necro_sunken_temple', name: '발테른의 시험', start: A(770, 640), skills: ['strike', 'shield', 'dash', 'decoy'], dur: 180, need: 4,
    allies: [A(560, 480), A(980, 480), A(470, 620), A(1070, 620), A(770, 720)], waves: { gap: 4, n: [1, 3], kinds: ['hound', 'hound', 'knight'] } },
  // 6장 — 호위: 병사 셋을 다리 건너 전망대까지. 무너지는 자리는 예고 뒤 떨어진다(떨어지면 시작점으로)
  escort: { map: 'necro_sky_shrine', name: '라에딘의 시험', start: A(260, 930), skills: ['dash'], goal: { at: A(1330, 430), r: 150 },
    allies: [A(200, 880), A(300, 900), A(240, 960)], leash: 260, fall: { gap: 2.2, d: 1.2, r: 110 } },
  // 7장 — 잔상: 3초 전의 나와 지금의 내가 두 발판을 동시에. 세 장면
  echo: { map: 'necro_funeral_hall', name: '오르벤의 시험', start: A(770, 640), skills: ['dash'], delay: 3, plateR: 70,
    plates: [A(265, 330), A(255, 500), A(235, 690), A(1270, 330), A(1280, 500), A(1290, 690)], scenes: [[0, 1], [3, 4], [5, 4]] },
  // 8장 — 봉인 해제: 봉인석 넷을 차례로(왼쪽 위 → 오른쪽 위 → 왼쪽 아래 → 오른쪽 아래). 느린 그림자 · 예고 공격. 모르켄을 치면 아무 일도 없다
  seal: { map: 'necro_rift_altar', name: '모르켄의 봉인', start: A(770, 640), skills: ['strike', 'dash'], stones: [A(180, 300), A(1350, 300), A(115, 840), A(1420, 840)], stoneR: 90,
    morken: A(770, 300), warn: { gap: 2.2, d: 1.1, r: 140 }, chaser: A(770, 400) },
  // 11장 B — 그림자 명령 연습: 말뚝을 1 → 3 → 6 개. 소집 한도 1 → 5 → 15
  drill: { map: 'necro_kingdom', name: '침묵의 병영', start: A(1000, 650), skills: ['strike', 'dash'], cmd: 1, area: A(1270, 620),
    stages: [{ cap: 1, posts: [A(1270, 600)] }, { cap: 5, posts: [A(1180, 560), A(1350, 560), A(1270, 660)] }, { cap: 15, posts: [A(1150, 560), A(1230, 540), A(1310, 540), A(1390, 560), A(1200, 660), A(1340, 660)] }] },
  // 11장 D — 왕궁 세 단계(제단 3분 · 적 30 · 잔영)
  palace: { map: 'necro_palace', name: '왕궁의 시험', start: A(770, 720), skills: ['strike', 'shield', 'dash'], cmd: 1,
    altar: { at: A(770, 560), hp: 100, r: 110 },
    p1: { dur: 180, cap: 5, waves: { gap: 5, n: [2, 3], kinds: ['hound', 'knight'] } },
    p2: { cap: 15, total: 30, waves: [10, 10, 10], kinds: ['hound', 'knight', 'knight'] },
    p3: { cap: 15, foes: 20, pylons: [A(330, 500), A(1210, 500), A(480, 300), A(1060, 300)], lord: A(770, 330), steal: [0.5, 3], stop: 0.1, glyphTime: 90,
      warn: { gap: 2.6, d: 1.2, r: 150 } },
    glyphs: { items: ['검 문양', '방패 문양', '책 문양', '날개 문양', '모래시계 문양', '문 문양', '감은 눈 문양'], opts: ['카르돈', '발테른', '세리온', '라에딘', '오르벤', '모르켄', '에레보스'], ans: [0, 1, 2, 3, 4, 5, 6] },
  },
};
export const NQ_TRIAL_IDS = Object.keys(NQ_TRIALS);

// 12장 — 계승 창(기획안 그대로)
export const NQ_THRONE = {
  intro: ['왕의 잔영|오랜 세월 이 왕좌를 지켰다. 나의 힘을 원하는 자는 많았지만, 그 누구도 잊힌 병사들의 목소리를 들으려 하지 않았다.', '왕의 잔영|너는 그들의 흔적을 따라 이곳까지 왔다.'],
  opts: [
    { t: '군단을 지키겠습니다.', lines: ['왕의 잔영|…지키겠다고. 나도 처음엔 그렇게 말했다.'] },
    { t: '그들의 힘으로 더 강해지겠습니다.', lines: ['왕의 잔영|솔직하군. 힘을 바라는 것은 죄가 아니다. 그 무게를 잊는 것이 죄지.'] },
    { t: '아직 답을 모르겠습니다.', lines: ['왕의 잔영|모른다고 말할 수 있는 자가 가장 오래 버틴다.'] },
  ],
  after: ['왕의 잔영|나 역시 처음에는 힘을 원했다. 그러나 힘을 얻은 뒤에야 그 무게를 알았다.', '왕의 잔영|나의 시대는 끝났다. 이제 이 군단의 운명은 네게 달렸다.',
    '제1장에서 만난 이름 없는 병사가 가장 먼저 나와 무릎을 꿇는다. 일곱 장군과 군단이 그 뒤를 따른다.', '이제 군단의 운명은 당신에게 달렸습니다.'],
  title: '히든직업 「Necromancer 004 — 그림자 군주」', q: '잊힌 군단이 새로운 주인의 명령을 기다립니다. 그림자 군주의 힘을 계승하시겠습니까?',
  yes: '군단을 계승한다', no: '아직 결정하지 않는다',
};
// 처음 인장을 얻을 때(기획안 6장) — 히든 직업 퀘스트라는 말은 띄우지 않는다
export const NQ_FIRST_SEAL = '죽은 자의 침묵이 깨졌습니다.';

/* 탐험 기록(기획안 2장 보조 기록) — 본 것만 원문 그대로. 다음 목표 · 정답은 적지 않는다 */
export const NQ_LOG = [
  { f: 'book', t: '《잊힌 왕국의 이야기》 — 왕을 잃은 군대. 그들은 이름 대신 고향을 바라보며 잠들었다. 불빛이 사라진 순간에도 맹세는 남았다.' },
  { f: 'caret', t: '묘지기 — 옛 병사들의 무덤은 고향을 향해 세웠다. 마지막 불까지 꺼야 망자가 길을 찾는다.' },
  { f: 'seal0', t: '이름 없는 군단의 인장 — 뒷면의 문양이 납골당 벽에서도 빛난다.' },
  { f: 'r0', t: '목걸이 — 가족과 작별한 기억.' }, { f: 'r1', t: '투구 — 처음 입대한 날의 기억.' }, { f: 'r2', t: '군기 조각 — 출정하던 날의 기억.' },
  { f: 'r3', t: '방패 — 마지막 전투의 기억.' }, { f: 'r4', t: '검집 — 왕에게 마지막 맹세를 한 기억.' },
  { f: 'banner', t: '제1군단의 군기 — 「설령 죽음이 막더라도 돌아오겠다.」' },
  { f: 'rollA', t: '출정 명부 — 국경 마을 피난민을 지키기 위해 출정. 병사 셋은 다리를 지키다 돌아오지 않음.' },
  { f: 'rollB', t: '부러진 검 — 맹세는 마지막 행군 전날 밤, 모닥불 앞에서.' }, { f: 'rollC', t: '부러진 검 — 다친 동료를 업고 가느라 칼을 놓쳤다.' },
  { f: 'm1', t: '장군의 기억 1 · 카르돈 — 세 개의 기둥이 물에 잠긴 전장을 가리킨다.' },
  { f: 'm2', t: '장군의 기억 2 · 발테른 — 방패 안쪽의 세 문양 「달 · 저울 · 나무」.' },
  { f: 'cls', t: '분류표 — 달은 사라진 것 · 저울은 판결 · 나무는 뿌리 · 해는 시작 · 성은 지킬 곳.' },
  { f: 'm3', t: '장군의 기억 3 · 세리온 — 네 책 모두에서 「왕은 스스로…」가 지워져 있었다.' },
  { f: 'm4', t: '장군의 기억 4 · 라에딘 — 왕을 배신하지 않았다. 눈앞의 생명을 골랐을 뿐.' },
  { f: 'm5', t: '장군의 기억 5 · 오르벤 — 출정 · 소식 · 귀환 · 장례 행렬 · 마지막 맹세.' },
  { f: 'm6', t: '장군의 기억 6 · 모르켄 — 강제로 쓰러뜨릴수록 경계는 닫힌다.' },
  { f: 'm7', t: '장군의 기억 7 · 에레보스 — 일곱 맹세는 첫 무덤에서 끝난다.' },
  { f: 'truth', t: '왕의 마지막 기록 — 군단을 지키려고 스스로 이름을 지웠다.' },
];

// 관리자 /네크로맨서 <이름> 루트 <단계> — 그 단계 앞까지 깃발을 세운다(시험용)
export const NQ_STAGES = [
  { name: '처음', set: [] },
  { name: '공동묘지', set: ['walk', 'caret', 'steps', 'sword', 'seal0'] },
  { name: '잊힌 병영', set: ['r0', 'r1', 'r2', 'r3', 'r4', 'banner'] },
  { name: '침몰한 신전', set: ['rollA', 'rollB', 'rollC', 'flag', 'quiz', 'pathT', 'guardT', 'sSword', 'm1', 'pl0', 'pl1', 'pl2', 'pillars'] },
  { name: '지하 서고', set: ['gates', 'sShield', 'm2'] },
  { name: '하늘의 사원', set: ['cls', 'dial', 'bk0', 'bk1', 'bk2', 'bk3', 'books', 'sRecord', 'm3'] },
  { name: '장례식장', set: ['f0', 'f1', 'f2', 'f3', 'f4', 'statue', 'sWing', 'm4', 'watch'] },
  { name: '균열의 제단', set: ['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'clocks', 'sTime', 'm5'] },
  { name: '관측소', set: ['live', 'mirror', 'sBound', 'm6', 'coords'] },
  { name: '일곱 맹세', set: ['plates', 'sSilence', 'm7'] },
  { name: '지하 왕국', set: ['seven'] },
  { name: '왕궁', set: ['c0', 'c1', 'c2', 'c3', 'truth', 'drill'] },
  { name: '계승 선택', set: ['heir'] },
];
