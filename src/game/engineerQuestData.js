/* ── 히든 직업 Engineer 003 획득 루트 「최초의 설계자」 — 맵 · 조사 자리 · 퍼즐 · 대사 · 시험 수치 한 곳(11월 19일, 사용자 기획안 v1.0) ─────────────
   기획 원본: 프로젝트 notes/엔지니어003-획득루트-기획안-v1.md. 규칙은 engineerQuest.js, 그림은 engineerQuestArt.js, 창은 EngineerQuestPanel.jsx.
   히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다(사용자 지시).
   - 레벨 제한 없음. 전투가 필요한 곳은 최종 시험뿐이고, 시험은 레벨과 관계없이 같은 능력을 빌려준다(EQ_TRIAL.base).
   - 탐험 맵은 모두 싸움 없는 곳(safe)이고 일반 사냥터로 가는 출구가 없다. 위험 장치 · 미믹은 피해 대신 안전한 자리로 밀어낸다.
   - 진행은 가방 bag.eu(engineerQuest.js cleanEu). 깃발 차례(EQ_FLAGS) · 맵 차례는 저장 · 스냅샷 값이라 뒤에만 더한다.
   - 맵 바닥 그림은 Codex(story/ground/<맵 id>.webp, 1536×1024 를 2400×1600 으로 늘린다). 조사 자리 좌표는 그림 좌표(px)로 적고 P() 로 옮긴다.
   "정한 값"은 기획안에 없어 정한 값이다(보고 대상). */

export const EQ_MAP_W = 2400, EQ_MAP_H = 1600;
const K = EQ_MAP_W / 1536;
export const P = (x, y) => [Math.round(x * K), Math.round(y * K)];

// 진행 깃발 — 차례가 저장 값(비트 자리)이다. 뒤에만 더한다. 이름은 코드에서만 쓴다
export const EQ_FLAGS = [
  'mina', 'bench', 'pad', 'cElder', 'cLog', 'cBlade', 'cLedger', 'cSign', 'oak', 'oakMimic',        // 0~9 1~2장
  'hint3', 'brkA', 'brkB', 'board', 'pin', 'gear', 'cell', 'lift',                                     // 10~17 3장
  'doll', 'labLog', 'pCell', 'pMem', 'pJoint', 'pCtrl', 'doll3',                                       // 18~24 4장
  'cCircuit', 'cabI', 'cabF', 'cabG', 'scrapOn', 'scrapMimic', 'rec1',                                  // 25~31 지역 A
  'cEco', 'ecoOn', 'rec2', 'cSignal', 'drOff', 'rec3',                                                  // 32~37 지역 B · C
  'cT1', 'cT2', 'cT3', 'cT4', 'clkOn', 'clkMimic', 'rec4',                                              // 38~44 지역 D
  'cBio', 'bioMimic', 'rec5', 'cLine', 'rec6',                                                          // 45~49 지역 E · F
  'metro', 'pass', 'factory', 'truth', 'coreDoc', 'coreDmg', 'coreFix',                                 // 50~56 6~7장
  'gens', 'dist', 'cool', 'mount', 'restart', 'cand', 'trial', 'won', 'claim', 'later',                 // 57~66 8~10장
  'cDist', 'cGen', 'cRec', 'cVid', 'cNote', 'cLog2', 'annexOn',                                          // 67~73 단서 · 관찰실
];
export const EQ_REC = ['rec1', 'rec2', 'rec3', 'rec4', 'rec5', 'rec6'];
export const EQ_REC_NAMES = ['제작', '환경', '통신', '사고 시각', '자율 제어', '최후의 명령'];

/* 맵 — id 는 MAP_IDS 뒤에 이 차례로 붙는다(rpg.js). top: 걸을 수 있는 위쪽 끝(그림의 벽 아래) · spawn: 처음 서는 자리 */
const M = (id, name, top, spawn, extra = {}) => ({ id, name, w: EQ_MAP_W, h: EQ_MAP_H, top, spawn, ...extra });
export const EQ_MAPS = [
  M('eng-oak', '참나무 목공소', 330, [1203, 1430]),
  M('eng-cellar', '목공소 지하', 420, [1211, 540]),   // 위쪽 계단 출구(EQ_EXITS) 바로 아래 — 출구 반지름 밖
  M('eng-tunnel', '폐쇄된 정비 통로', 200, [470, 1180]),
  M('eng-lab', '버려진 기계 연구소', 200, [1203, 1380]),
  M('eng-scrap', '병기 공장 정비지구', 330, [1100, 1470]),
  M('eng-forest', '생태림 연구지구', 380, [1203, 1500]),
  M('eng-signal', '기계도시 통신지구', 300, [1203, 1400]),
  M('eng-clock', '시간의 탑 정비지구', 360, [1700, 1480]),
  M('eng-bio', '생명 연구지구', 300, [1203, 1530]),
  M('eng-origin', '최초 명령 지구', 470, [1203, 1330]),   // 아래 가운데 승강판(출구) 위
  M('eng-metro', '중앙 기계도시 외곽', 330, [1203, 1300]),
  M('eng-factory', '중앙 기계도시 생산 공장', 330, [1203, 1500]),
  M('eng-archive', '중앙 기계도시 기록 보관소', 420, [1203, 1450]),
  M('eng-power', '중앙 기계도시 동력실', 420, [1203, 1450]),
  M('eng-annex', '괴수 동력 관찰실', 420, [1203, 1450]),
  M('eng-trial', '중앙 제어 시험장', 360, [1203, 1350], { fight: 1 }),   // 최종 시험만 싸울 수 있다
];
export const EQ_MAP_IDS = EQ_MAPS.map((m) => m.id);
export const eqMap = (id) => EQ_MAP_IDS.includes(id);
export const EQ_SITE_MAPS = ['eng-scrap', 'eng-forest', 'eng-signal', 'eng-clock', 'eng-bio', 'eng-origin'];

// 마을 쪽 자리(마을 새 좌표). 목공소는 누구나 들어갈 수 있다 — 건물 앞 문(walk-through)
export const EQ_VILLAGE = { door: { x: 520, y: 1822, r: 40 }, back: [520, 1890] };
// 맵 사이 출구(밟으면 옮겨 간다 — 늘 열려 있는 쪽만). 진행이 필요한 문은 조사 자리(act 'gate')
// 자리는 바닥 그림에 그려진 문 · 계단 · 사다리 위(그림 좌표). 그림에 문이 없는 곳은 hatch: 1 — 정비망 승강판을 코드로 그린다(engineerQuestArt.js drawEqExit)
// 도착 자리(back · 맵 spawn)는 출구 반지름 밖에 둔다 — 안에 서면 1.2초 뒤 되돌아간다
export const EQ_EXITS = [
  { map: 'eng-oak', at: P(770, 1000), r: 60, to: 'dawnwood', back: EQ_VILLAGE.back, label: '에르덴 마을' },          // 아래 두 짝 문
  { map: 'eng-cellar', at: P(775, 275), r: 60, to: 'eng-oak', back: [1203, 470], label: '참나무 목공소' },         // 위쪽 나무 계단 발치(걷는 끝 top 420 바로 아래)
  { map: 'eng-tunnel', at: P(140, 815), r: 60, to: 'eng-cellar', back: [1219, 1300], label: '목공소 지하' },        // 왼쪽 아래 사다리 구멍
  { map: 'eng-lab', at: P(770, 1005), r: 60, to: 'eng-tunnel', back: [2141, 420], label: '폐쇄된 정비 통로' },      // 아래 통로 문
];

// 조사 자리 그림(props.webp 4×2 · mimic.webp 3×2 · automaton.webp 3×1) — look 이 없으면 바닥 그림만. look.bg 는 바닥 그림에 이미 있어 깨어난 미믹일 때만 그린다
export const EQ_ART = { base: '/assets/game/rpg/engineer-quest/', cell: 256, mimicCell: 256, botCell: 256, bossCell: 384,
  props: { lever: 0, breaker: 1, terminal: 2, valve: 3, cell: 4, gear: 5, pin: 6, plate: 7 }, mimic: { chest: 0, clock: 1, box: 2 } };

/* 조사 자리. 공통: id · map · at(그림 px) · r(가까이 · 기본 90) · name · look(그림 칸, 없으면 바닥 그림) · show(보이는 조건) · need(할 수 있는 조건)
   조건은 깃발 이름 배열(모두) · '!이름' 은 없어야 · 함수(u, has) 도 된다.
   act.k: talk(대사 + set) · ask(골라 묻기, 고른 것마다 대사 · set) · code(숫자 입력) · seq(무리 g 의 차례 i — 차례대로 눌러야) ·
          dial(값 고르기 → u.d[key]) · check(키 값이 모두 맞으면 set) · pick(하나 고르기) · multi(n 개 고르기) · order(차례 맞추기) ·
          take(줍기) · gate(다른 맵으로) · mimic(미믹 — 조사 · 물러나기 · 다른 방법) · seal(미믹 봉인) · travel(정비망 지도) · trial(시험) · contract(계약)
   lock: need 가 모자랄 때 보여 줄 대사(lockSet 이 있으면 그 깃발을 세운다 — 문에 새긴 글 같은 단서) */
// hatch: 1 — 바닥 그림에 문이 없는 출구(gate). 정비망 승강판을 코드로 그린다(engineerQuestArt.js drawEqHatch). hatch: 'open' 은 열린 뒤에만
const S = (map, id, px, py, name, act, o = {}) => ({ id, map, at: P(px, py), r: 90, name, act, ...o });
const T = (lines, set, o = {}) => ({ k: 'talk', lines, set, ...o });
const MINA_POS = [890, 1570], ELDER_POS = [1670, 1120];   // 마을 새 좌표(storyData.js mina · villageData.js 촌장 하룬)

export const EQ_SPOTS = [
  /* ── 1장 · 에르덴 마을 ── */
  { id: 'mina-ask', map: 'dawnwood', at: MINA_POS, r: 90, name: '미나', npc: 'mina', act: { k: 'ask', intro: ['미나|오늘은 무슨 일이세요? 궁금한 게 있으신가요?'], opts: [
    { t: '요즘 약재 구하기가 어렵나요?', lines: ['미나|올해는 북쪽 숲의 약초가 잘 자라지 않네요. 비가 조금만 더 왔으면 좋겠어요.'] },
    { t: '에르덴에 전해지는 옛이야기가 있나요?', lines: ['미나|참나무 숲에 밤마다 나무를 두드리는 정령이 있다는 설화가 있어요.', '미나|목수들이 일을 마친 뒤 남긴 소리를 정령 탓으로 돌렸다는 말도 있죠.'] },
    { t: '고장 난 기계도 다시 움직이게 할 수 있나요?', lines: ['미나|핵심 회로가 남아 있다면 가능해요.', '미나|사실 참나무 목공소에서 본 적 없는 금속 부품을 발견한 적이 있어요.', '미나|나무를 다루는 곳인데 왜 그런 부품이 있었을까요?'], set: 'mina' },
  ] } },
  { id: 'elder-ask', map: 'dawnwood', at: ELDER_POS, r: 90, name: '촌장 하룬', npc: 'dawn-elder', show: (u, has) => has('bench') || has('pad') || has('mina'),
    act: { k: 'ask', intro: ['촌장 하룬|에르덴에 온 것을 환영하네. 무엇이 궁금한가?'], opts: [
      { t: '참나무 목공소는 누가 세웠나요?', lines: ['촌장 하룬|처음 목공소를 세운 사람은 세 장인이었단다.', '촌장 하룬|셋이 모이면 못 만드는 게 없다고들 했지.'], set: 'cElder' },
      { t: '마을 이야기를 들려주세요.', lines: ['촌장 하룬|숲은 밤을 지나도 길을 잊지 않는다네. 우리 마을도 그런 곳이지.'] },
    ] } },

  /* ── 2장 · 참나무 목공소 ── */
  S('eng-oak', 'oak-bench', 230, 480, '작업대', T(['톱날은 멈춰 있는데, 바닥 아래에서 금속이 세 번 부딪히는 소리가 들린다.'], 'bench', { snd: 'eqClank' })),
  S('eng-oak', 'oak-sign', 430, 330, '작업 순서표', T(['작업대 옆 목제 표지판에 순서가 적혀 있다.', '「장인이 모이고 → 동력이 돌고 → 톱날이 움직이고 → 작업이 끝난다」'], 'cSign')),
  S('eng-oak', 'oak-blade', 470, 440, '오래된 톱날', T(['오래된 톱날을 뒤집어 본다.', '안쪽에 일부러 새긴 점 일곱 개가 있다.'], 'cBlade')),
  S('eng-oak', 'oak-log', 240, 880, '정비 기록', T(['목공소 주인의 정비 기록이다.', '「지하에 설치한 첫 번째 동력 장치 — 이상 없음」', '「첫 번째」에 밑줄이 그어져 있다.'], 'cLog')),
  S('eng-oak', 'oak-ledger', 1330, 610, '창고 장부', T(['창고 장부를 넘긴다.', '작업 완료란에 같은 모양의 도장 네 개가 찍혀 있다.'], 'cLedger')),
  S('eng-oak', 'oak-pad', 1010, 640, '느슨한 바닥 판자', { k: 'code', len: 4, ans: '3174', set: 'oak', mark: 'pad',
    intro: ['판자를 들어 올리자 네 자리 숫자판이 드러난다.', '숫자가 무엇을 뜻하는지는 아직 알 수 없다.'],
    ok: ['벽 안쪽에서 금속 핀이 빠지는 소리가 난다.', '뒤편 나무 벽이 밀려나며 아래로 내려가는 계단이 드러났다.'],
    bad: '짧은 경고음이 울린다.', hint: 3, done: ['숫자판은 이미 풀렸다. 뒤편 나무 벽 너머로 계단이 보인다.'] }),
  S('eng-oak', 'oak-wall', 770, 230, '뒤편 나무 벽', { k: 'gate', to: 'eng-cellar', back: [1211, 540], need: ['oak'], lock: ['두드리면 속이 빈 소리가 난다. 어딘가에 여는 장치가 있을 것 같다.'] }, { hatch: 'open' }),   // 숫자판을 풀면 벽 아래 계단 구멍이 보인다
  S('eng-oak', 'oak-chest-0', 1035, 330, '보관함', T(['목재 조각과 녹슨 못이 들어 있다.']), { look: { sheet: 'mimic', i: 0, size: 150, bg: 1 } }),
  S('eng-oak', 'oak-chest-1', 1150, 330, '보관함', T(['대패날과 사포가 가지런히 들어 있다.']), { look: { sheet: 'mimic', i: 0, size: 150, bg: 1 } }),
  S('eng-oak', 'oak-chest-2', 1275, 330, '보관함', { k: 'mimic', mid: 'oak', seal: 'oakMimic', sheet: 0,
    intro: ['다른 보관함과 똑같아 보인다.', '그런데 뚜껑 경첩이 숨 쉬듯 흔들린다. 나무 바닥에 희미한 긁힘 자국도 있다.'],
    opts: ['조사한다', '뒤로 물러난다', '막대기로 건드린다'], poke: ['막대기 끝이 닿자 보관함이 이빨을 드러냈다가 다시 닫힌다.', '옆 벽의 목재 레버가 눈에 들어온다.'],
    sealed: ['레버로 잠근 보관함이다. 이제 조용하다.'] }, { look: { sheet: 'mimic', i: 0, size: 150, bg: 1 } }),
  S('eng-oak', 'oak-lever', 1410, 250, '목재 레버', { k: 'seal', mid: 'oak', set: 'oakMimic', lines: ['레버를 당기자 보관함 걸쇠가 철컥 잠긴다.'], idle: ['벽에 박힌 목재 레버다. 무언가를 잠그는 장치 같다.'] }),

  /* ── 3장 · 목공소 지하 · 폐쇄된 정비 통로 ── */
  S('eng-cellar', 'cellar-boiler', 290, 330, '낡은 보일러실', T(['녹슨 보일러가 식어 있다. 오래전에 누군가 이곳에서 동력을 만들었다.'])),
  S('eng-cellar', 'cellar-lift', 1320, 520, '끊어진 승강기', T(['승강기 줄이 끊어져 있다. 아래 통로로 걸어가야 한다.'])),
  S('eng-cellar', 'cellar-hatch', 780, 880, '정비 통로 문', { k: 'gate', to: 'eng-tunnel', back: [470, 1180] }),
  S('eng-tunnel', 'tun-board', 410, 175, '정비실 도면', T(['벽에 승강기 복구 도면이 붙어 있다.', '「안전핀 → 톱니 → 배터리」 차례로 연결할 것.'], 'board'), { look: { sheet: 'props', i: 7, size: 96 } }),
  S('eng-tunnel', 'tun-gear', 1330, 940, '큰 톱니', { k: 'take', set: 'gear', lines: ['부서진 기어 더미 옆에서 큰 톱니를 빼냈다.'] }, { look: { sheet: 'props', i: 5, size: 70 }, show: ['!gear'] }),
  S('eng-tunnel', 'tun-brkA', 100, 460, '배전함 A', { k: 'take', set: 'brkA', lines: ['배전함 A 의 손잡이를 내렸다. 어딘가에서 불꽃 소리가 약해진다.'], done: ['배전함 A 는 내려가 있다.'] }, { look: { sheet: 'props', i: 1, size: 80 } }),
  S('eng-tunnel', 'tun-brkB', 1390, 540, '배전함 B', { k: 'take', set: 'brkB', lines: ['배전함 B 의 손잡이를 내렸다.'], done: ['배전함 B 는 내려가 있다.'] }, { look: { sheet: 'props', i: 1, size: 80 } }),
  S('eng-tunnel', 'tun-pin', 1450, 330, '안전핀 보관함', { k: 'take', set: 'pin', lines: ['상자 안에서 강철 안전핀을 꺼냈다.'] }, { look: { sheet: 'props', i: 6, size: 70 }, show: ['!pin'] }),
  S('eng-tunnel', 'tun-cell', 1220, 880, '부품 상자', { k: 'take', set: 'cell', lines: ['부품 상자 밑에서 푸른 배터리를 찾았다.'] }, { look: { sheet: 'props', i: 4, size: 70 }, show: ['!cell'] }),
  S('eng-tunnel', 'tun-lift', 1370, 210, '부서진 승강기', { k: 'order', set: 'lift', need: ['pin', 'gear', 'cell'], items: ['톱니', '배터리', '안전핀'], ans: [2, 0, 1],
    intro: ['둥근 철문 안쪽이 아래로 내려가는 승강기다. 부품 세 개를 끼울 자리가 비어 있다.'],
    ok: ['승강기가 덜컹이며 깨어난다. 아래 깊은 곳으로 내려갈 수 있다.'], bad: '불꽃이 튀며 부품이 빠져나온다. 차례가 틀린 것 같다.',
    lock: ['승강기 부품 자리 세 곳이 비어 있다. 통로 어딘가에 부품이 흩어져 있을 것이다.'], go: { to: 'eng-lab', back: [1203, 1380] } }),

  /* ── 4장 · 버려진 기계 연구소 · 자동인형 003 ── */
  S('eng-lab', 'lab-doll', 770, 450, '자동인형', { k: 'doll' }, { r: 110 }),
  S('eng-lab', 'lab-log', 250, 790, '오래된 기록', T(['조립대 기록이다. 정비 자동인형 003 의 수리 목록이 적혀 있다.',
    '「동력 전지 — 배터리실 스위치는 배선도대로」', '「기억 장치 — 기록 서랍 003 에 보관」', '「관절 — 파란 표식 둘, 회색 하나」', '「제어 회로 — 전류가 가운데로 모이게」'], 'labLog')),
  S('eng-lab', 'lab-wire', 1240, 640, '배선도', T(['배터리실 배선도다. 스위치 옆에 「A → C → B」 라고 적혀 있다.'])),
  S('eng-lab', 'lab-swA', 1290, 790, '스위치 A', { k: 'seq', g: 'bat', i: 0, n: 3, set: 'pCell', ok: ['스위치 세 개가 차례로 켜지자 동력 전지가 충전된다.'], bad: '스위치가 모두 꺼진다.' }, { look: { sheet: 'props', i: 0, size: 70 } }),
  S('eng-lab', 'lab-swB', 1390, 830, '스위치 B', { k: 'seq', g: 'bat', i: 2, n: 3, set: 'pCell', ok: ['스위치 세 개가 차례로 켜지자 동력 전지가 충전된다.'], bad: '스위치가 모두 꺼진다.' }, { look: { sheet: 'props', i: 0, size: 70 } }),
  S('eng-lab', 'lab-swC', 1470, 780, '스위치 C', { k: 'seq', g: 'bat', i: 1, n: 3, set: 'pCell', ok: ['스위치 세 개가 차례로 켜지자 동력 전지가 충전된다.'], bad: '스위치가 모두 꺼진다.' }, { look: { sheet: 'props', i: 0, size: 70 } }),
  S('eng-lab', 'lab-drawer', 120, 650, '기록 서랍장', { k: 'pick', set: 'pMem', q: '어느 서랍을 열까?', opts: ['서랍 001', '서랍 002', '서랍 003', '서랍 004'], ans: 2,
    ok: ['서랍 003 에서 작은 기억 장치를 꺼냈다.'], bad: '먼지 쌓인 서류뿐이다.' }),
  S('eng-lab', 'lab-parts', 90, 880, '부품 보관 상자', { k: 'multi', set: 'pJoint', q: '조립할 관절 부품 셋을 고른다.', n: 3,
    opts: ['파란 표식 관절', '붉은 표식 관절', '파란 표식 관절', '녹슨 관절', '회색 관절'], ans: [0, 2, 4],
    ok: ['맞는 관절 셋을 골라 조립대에 올렸다.'], bad: '관절이 맞물리지 않는다. 다시 골라야 한다.' }),
  S('eng-lab', 'lab-ctrl', 1250, 170, '최하층 단말기', { k: 'dials', set: 'pCtrl', q: '세 화살표의 방향을 돌린다.',
    items: [{ n: '왼쪽 화살표', opts: ['위', '오른쪽', '아래', '왼쪽'], ans: 1 }, { n: '위쪽 화살표', opts: ['위', '오른쪽', '아래', '왼쪽'], ans: 2 }, { n: '오른쪽 화살표', opts: ['위', '오른쪽', '아래', '왼쪽'], ans: 3 }],
    ok: ['전류가 가운데로 모인다. 제어 회로가 살아났다.'], bad: '전류가 흩어진다.' }, { look: { sheet: 'props', i: 2, size: 90 } }),
  S('eng-lab', 'lab-map', 330, 450, '고대 정비 지도', { k: 'travel', need: ['doll3'], lock: ['벽에 커다란 고대 정비 지도가 붙어 있다. 읽을 수 없는 표시가 가득하다.'] }),
  S('eng-lab', 'lab-lift', 1300, 450, '거대한 톱니 문', { k: 'gate', to: 'eng-metro', back: [1203, 1300], need: ['rec6'],
    lock: ['거대한 톱니 문이 굳게 닫혀 있다.'], first: ['003|좌표 확인. 그러나 현재 지도에는 도시가 표시되지 않습니다.', '003|삭제된 것이 아니라 숨겨진 것입니다.', '톱니 문이 천천히 돌며 아래로 내려가는 승강기가 드러난다.'] }, { r: 130 }),

  /* ── 5장 · 지역 A 병기 공장 — 제작 기록 ── */
  S('eng-scrap', 'scr-board', 1100, 560, '회로판 도면', T(['회로판 그림에 선이 세 개 있다.', '각 선의 부호가 「쇠붙이 → 불꽃 → 톱니」 순서로 읽힌다.'], 'cCircuit')),
  S('eng-scrap', 'scr-cabI', 630, 330, '조립 팔', { k: 'take', set: 'cabI', lines: ['쇠붙이 부호가 찍힌 전력 케이블을 뺐다.'], done: ['케이블은 이미 챙겼다.'] }),
  S('eng-scrap', 'scr-cabF', 850, 440, '조립 팔', { k: 'take', set: 'cabF', lines: ['불꽃 부호가 찍힌 전력 케이블을 뺐다.'], done: ['케이블은 이미 챙겼다.'] }),
  S('eng-scrap', 'scr-cabG', 640, 650, '조립 팔', { k: 'take', set: 'cabG', lines: ['톱니 부호가 찍힌 전력 케이블을 뺐다.'], done: ['케이블은 이미 챙겼다.'] }),
  S('eng-scrap', 'scr-ctrl', 1290, 770, '변전 제어기', { k: 'order', set: 'scrapOn', need: ['cabI', 'cabF', 'cabG'], items: ['톱니 케이블', '쇠붙이 케이블', '불꽃 케이블'], ans: [1, 2, 0],
    intro: ['케이블 꽂는 구멍 세 개가 나란히 있다.'], ok: ['전기가 흐르고 북동쪽 조립실 셔터가 올라간다.'], bad: '차단기가 내려간다. 다시 연결할 수 있다.',
    lock: ['케이블 꽂는 구멍 세 개가 비어 있다. 공장 안에 케이블이 남아 있을 것이다.'] }),
  S('eng-scrap', 'scr-room', 1270, 260, '폐쇄 조립실', { k: 'record', set: 'rec1', need: ['scrapOn'], lock: ['셔터가 굳게 내려와 있다. 전기가 들어오지 않는다.'],
    ok: ['조립실 안에서 제1 설계 기록 — 제작을 찾았다.', '003|이 기록은 저와 같은 기계를 만드는 방법이군요.'] }),
  S('eng-scrap', 'scr-box-0', 320, 260, '부품 상자', T(['재고 일련번호가 찍힌 부품 상자다. 쓸 만한 것은 없다.']), { look: { sheet: 'mimic', i: 2, size: 110 } }),
  S('eng-scrap', 'scr-box-1', 230, 600, '부품 상자', { k: 'mimic', mid: 'scrap', seal: 'scrapMimic', sheet: 2,
    intro: ['다른 상자와 똑같아 보인다. 그런데 재고 일련번호가 찍혀 있지 않다.'], opts: ['열어 본다', '물러난다', '집게 기계로 들어 올린다'],
    poke: ['집게 기계가 상자를 들어 올리자 이빨을 딱딱 부딪친다.', '상자를 고철 더미 깊숙이 내려놓았다. 이제 조용하다.'], pokeSeal: 1,
    sealed: ['집게로 격리한 상자다.'] }, { look: { sheet: 'mimic', i: 2, size: 110 } }),
  S('eng-scrap', 'scr-box-2', 270, 800, '부품 상자', T(['재고 일련번호가 찍힌 부품 상자다. 녹슨 볼트뿐이다.']), { look: { sheet: 'mimic', i: 2, size: 110 } }),

  /* ── 지역 B 인공 생태림 — 환경 기록(미믹 없음) ── */
  S('eng-forest', 'eco-obs', 170, 500, '기후 관측소', T(['관측소 칠판에 또렷하게 적혀 있다.', '「표준 성장조건: 온도 18 / 습도 60 / 광량 40」', '이 연구시설만의 기준값이라고 덧붙어 있다.'], 'cEco')),
  S('eng-forest', 'eco-g1', 765, 230, '계기', T(['계기의 눈금이 거꾸로 새겨져 있다. 믿을 수 없는 값이다.'])),
  S('eng-forest', 'eco-g2', 505, 530, '계기', T(['바늘이 한쪽 끝에 붙어 움직이지 않는다. 눈금도 거꾸로다.'])),
  S('eng-forest', 'eco-g3', 1035, 530, '계기', T(['눈금이 거꾸로 새겨진 가짜 계기다.'])),
  S('eng-forest', 'eco-v1', 520, 850, '온도 밸브', { k: 'dial', key: 'temp', opts: [12, 15, 18, 21, 24], unit: '도' }),
  S('eng-forest', 'eco-v2', 770, 850, '습도 밸브', { k: 'dial', key: 'humid', opts: [40, 50, 60, 70, 80], unit: '%' }),
  S('eng-forest', 'eco-v3', 1015, 850, '광량 밸브', { k: 'dial', key: 'light', opts: [20, 30, 40, 50, 60], unit: '' }),
  S('eng-forest', 'eco-tower', 1385, 540, '생태 제어탑', { k: 'check', set: 'ecoOn', keys: { temp: 18, humid: 60, light: 40 },
    ok: ['센서 세 개의 표시등이 모두 파란색으로 바뀐다.', '가운데 온실 쪽에서 무언가 열리는 소리가 난다.'], bad: '표시등이 붉게 깜박인다. 남쪽 화단의 밸브 값이 맞지 않는다.' }),
  S('eng-forest', 'eco-house', 770, 550, '온실', { k: 'record', set: 'rec2', need: ['ecoOn'], lock: ['온실 문이 잠겨 있다. 안쪽 바닥 아래에 무언가 있는 것 같다.'],
    ok: ['숨겨진 온실 지하에서 제2 설계 기록 — 환경을 찾았다.', '003|이 숲은 사람이 없어도 살 수 있게 만들어졌습니다.'] }),

  /* ── 지역 C 침묵의 기계도시 — 통신 기록(미믹 없음 · 감시 드론) ── */
  S('eng-signal', 'sig-board', 1040, 870, '도시 안내판', T(['네 송신탑 문양 옆에 기호가 남아 있다.', '「남은 불빛의 순서: 서쪽 2 / 북쪽 4 / 동쪽 1 / 중앙 3」', '정확한 값은 탑 앞에서 맞춰 봐야 한다.'], 'cSignal')),
  S('eng-signal', 'sig-w', 260, 520, '서쪽 송신탑', { k: 'dial', key: 'tw', opts: [1, 2, 3, 4], unit: '번 주파수' }),
  S('eng-signal', 'sig-n', 560, 345, '북쪽 송신탑', { k: 'dial', key: 'tn', opts: [1, 2, 3, 4], unit: '번 주파수' }),
  S('eng-signal', 'sig-e', 1280, 520, '동쪽 송신탑', { k: 'dial', key: 'te', opts: [1, 2, 3, 4], unit: '번 주파수' }),
  S('eng-signal', 'sig-c', 770, 690, '중앙 송신탑', { k: 'dial', key: 'tc', opts: [1, 2, 3, 4], unit: '번 주파수' }),
  S('eng-signal', 'sig-cut', 270, 790, '쓰러진 가로등 배전함', { k: 'take', set: 'drOff', lines: ['배전함 전선을 끊었다. 감시 드론의 불빛이 꺼진다.'], done: ['감시 드론은 꺼져 있다.'] }, { look: { sheet: 'props', i: 1, size: 70 } }),
  S('eng-signal', 'sig-hall', 770, 345, '중앙 방송실', { k: 'check', set: 'rec3', keys: { tw: 2, tn: 4, te: 1, tc: 3 },
    ok: ['중앙 방송실에 파란 신호가 켜진다. 제3 설계 기록 — 통신을 찾았다.', '003|이 도시는 서로의 신호를 기다리다가 침묵하게 된 것 같습니다.'], bad: '방송실 신호등이 꺼져 있다. 탑 네 곳의 주파수가 맞지 않는다.' }),

  /* ── 지역 D 멈춰버린 시간의 탑 — 사고 시각 기록 ── */
  S('eng-clock', 'clk-desk', 760, 850, '창구 장부', T(['창구 장부에 적혀 있다.', '「중앙 점검 개시 — 06:10」'], 'cT1')),
  S('eng-clock', 'clk-stair', 180, 330, '계단 벽면', T(['계단 벽면에 긁힌 글씨가 있다.', '「기계 경보 발생 — 06:40」'], 'cT2')),
  S('eng-clock', 'clk-plate', 765, 760, '시계 전당 명판', T(['바닥 시계 아래 명판이다.', '「통신 중단 — 07:00」'], 'cT3')),
  S('eng-clock', 'clk-h1', 390, 340, '시계바늘 장치', { k: 'seq', g: 'clk', i: 1, n: 4, set: 'clkOn', tag: '06:40', ok: ['네 바늘이 사건 순서대로 맞춰졌다. 보관실 문의 톱니가 돈다.'], bad: '시계바늘이 모두 원위치로 돌아간다.' }),
  S('eng-clock', 'clk-h2', 1150, 340, '시계바늘 장치', { k: 'seq', g: 'clk', i: 3, n: 4, set: 'clkOn', tag: '07:20', ok: ['네 바늘이 사건 순서대로 맞춰졌다. 보관실 문의 톱니가 돈다.'], bad: '시계바늘이 모두 원위치로 돌아간다.' }),
  S('eng-clock', 'clk-h3', 390, 700, '시계바늘 장치', { k: 'seq', g: 'clk', i: 0, n: 4, set: 'clkOn', tag: '06:10', ok: ['네 바늘이 사건 순서대로 맞춰졌다. 보관실 문의 톱니가 돈다.'], bad: '시계바늘이 모두 원위치로 돌아간다.' }),
  S('eng-clock', 'clk-h4', 1150, 700, '시계바늘 장치', { k: 'seq', g: 'clk', i: 2, n: 4, set: 'clkOn', tag: '07:00', ok: ['네 바늘이 사건 순서대로 맞춰졌다. 보관실 문의 톱니가 돈다.'], bad: '시계바늘이 모두 원위치로 돌아간다.' }),
  S('eng-clock', 'clk-vault', 765, 230, '시간 정지 보관실', { k: 'record', set: 'rec4', need: ['clkOn'], lockSet: 'cT4',
    lock: ['보관실 문에 글이 새겨져 있다.', '「최종 정지 명령 — 07:20」', '문은 시계바늘 장치와 이어져 있다.'],
    ok: ['보관실 문이 열리며 제4 설계 기록 — 사고 시각을 찾았다.', '기록에는 중앙 시스템의 정지가 폭발 사고가 아니라 「최종 정지 명령」이었다고 적혀 있다.'] }),
  S('eng-clock', 'clk-c1', 400, 190, '괘종시계', T(['초침이 일정하게 같은 방향으로 돈다.'])),
  S('eng-clock', 'clk-c2', 1140, 190, '괘종시계', T(['진자가 조용히 흔들린다. 평범한 시계다.'])),
  S('eng-clock', 'clk-c3', 70, 620, '괘종시계', T(['멈춘 시각이 07:20 을 가리킨다.'])),
  S('eng-clock', 'clk-c4', 1460, 620, '괘종시계', { k: 'mimic', mid: 'clock', seal: 'clkMimic', sheet: 1,
    intro: ['시계를 바라본다.', '초침이 가끔 반대로 돈다. 그림자가 한 박자 늦게 따라온다.'], opts: ['손을 대 본다', '물러난다', '오래 지켜본다'],
    poke: ['문틈 사이로 이빨 같은 것이 보였다가 사라진다.', '옆 계단 아래 봉인 스위치가 시계와 줄로 이어져 있다.'], sealed: ['봉인된 시계다. 초침이 멈춰 있다.'] }, { look: { sheet: 'mimic', i: 1, size: 150, bg: 1 } }),
  S('eng-clock', 'clk-sw', 1400, 760, '봉인 스위치', { k: 'seal', mid: 'clock', set: 'clkMimic', lines: ['스위치를 누르자 괘종시계 문에 빗장이 걸린다.'], idle: ['벽의 스위치다. 줄이 괘종시계 쪽으로 이어진다.'] }, { look: { sheet: 'props', i: 0, size: 64 } }),

  /* ── 지역 E 금지된 생명 연구구역 — 자율 제어 기록 ── */
  S('eng-bio', 'bio-desk', 765, 900, '접수대 장비대장', T(['원본 장비대장이다.', '「A-12 — 결과 불명」 「B-07 — 미실시」 「C-03 — 완료」'], 'cBio')),
  S('eng-bio', 'bio-a', 250, 490, '실험실 A', T(['A-12 실험 보고서. 결과란이 「완료」로 고쳐 쓰여 있다. 잉크가 새것이다.'])),
  S('eng-bio', 'bio-b', 770, 500, '실험실 B', T(['B-07 실험 보고서. 「완료」 도장이 찍혀 있지만 실험 날짜가 비어 있다.'])),
  S('eng-bio', 'bio-c', 1290, 490, '실험실 C', T(['C-03 실험 보고서. 서명과 날짜가 모두 남아 있다.'])),
  S('eng-bio', 'bio-term', 765, 170, '연구 책임자 단말기', { k: 'pick', set: 'rec5', q: '「완료」 자료를 넣는다.', opts: ['A-12', 'B-07', 'C-03'], ans: 2,
    ok: ['단말기가 기록을 받아들인다. 제5 설계 기록 — 자율 제어를 찾았다.', '「기계가 명령의 모순을 이해하기 시작했을 때, 중앙은 스스로 멈춤을 선택했다.」'], bad: '단말기가 거부한다. 「위조된 보고서입니다.」' }),
  S('eng-bio', 'bio-box-0', 1270, 830, '운반 컨테이너', T(['표시등이 꺼져 있다. 빈 컨테이너다.']), { look: { sheet: 'mimic', i: 2, size: 100 } }),
  S('eng-bio', 'bio-box-1', 1400, 830, '운반 컨테이너', { k: 'mimic', mid: 'bio', seal: 'bioMimic', sheet: 2,
    intro: ['원래 꺼져 있어야 할 표시등이 짧게 붉게 깜박인다.'], opts: ['열어 본다', '물러난다', '외부 스캐너로 검사한다'],
    poke: ['스캐너 화면: 「생체 반응 — 위장 개체」.', '컨테이너 잠금을 원격으로 걸었다. 이제 조용하다.'], pokeSeal: 1, sealed: ['원격 잠금이 걸린 컨테이너다.'] }, { look: { sheet: 'mimic', i: 2, size: 100 } }),
  S('eng-bio', 'bio-box-2', 1330, 930, '운반 컨테이너', T(['표시등이 꺼져 있다. 실험 자료 사본이 들어 있다.']), { look: { sheet: 'mimic', i: 2, size: 100 } }),

  /* ── 지역 F 최초의 명령실 — 최후의 명령 기록(기록 1~5 뒤) ── */
  S('eng-origin', 'ori-mural', 1150, 200, '미완성 연대표', T(['벽에 그림만 남은 연대표가 있다.', '기계가 태어나고 → 숲을 돌보고 → 도시를 잇고 → 사고가 나고 → 스스로 판단한다.', '마지막 칸은 비어 있다.'], 'cLine')),
  S('eng-origin', 'ori-term', 765, 280, '중앙 인증 단말기', { k: 'order', set: 'rec6', items: ['통신', '자율 제어', '제작', '사고 시각', '환경'], ans: [2, 4, 0, 3, 1],
    intro: ['기록 받침대 다섯 곳에 지금까지 찾은 기록을 놓을 차례를 정한다.'],
    ok: ['003|중앙은 인간을 공격하기 위해 멈춘 것이 아닙니다.', '003|서로 양립할 수 없는 명령을 동시에 수행하라는 요청을 받았습니다.', '003|어느 쪽도 희생시키지 않으려고… 스스로 모든 기능을 중단했습니다.',
      '제6 설계 기록 — 최후의 명령을 얻었다. 여섯 기록이 겹쳐지며 삭제된 기계도시의 좌표가 떠오른다.'], bad: '받침대 불빛이 꺼진다. 차례가 맞지 않는다.' }),

  /* ── 6장 · 중앙 기계도시 ── */
  S('eng-metro', 'met-gate', 905, 235, '보안문', { k: 'record', set: 'pass', ok: ['보안문 옆 단말기에서 도시 출입증을 발급받았다.', '003|외곽 경비가 아직 살아 있습니다. 감시 드론의 빛을 피하십시오.'] }, { r: 110 }),   // 위쪽 큰 문 오른쪽 등불 기둥 옆 단말기
  S('eng-metro', 'met-cut', 440, 320, '외곽 포대 배전함', { k: 'take', set: 'drOff', lines: ['외곽 포대 배전함을 내렸다. 감시 드론이 멈춘다.'], done: ['감시 드론은 꺼져 있다.'] }, { look: { sheet: 'props', i: 1, size: 70 } }),
  S('eng-metro', 'met-factory', 320, 775, '생산 공장 승강장', { k: 'gate', to: 'eng-factory', back: [1203, 1500], need: ['pass'], lock: ['출입증이 필요합니다.'] }),
  S('eng-metro', 'met-archive', 1360, 690, '기록 보관소 다리', { k: 'gate', to: 'eng-archive', back: [1203, 1450], need: ['pass'], lock: ['출입증이 필요합니다.'] }),
  S('eng-metro', 'met-power', 764, 225, '중앙 동력실 문', { k: 'gate', to: 'eng-power', back: [1203, 1450], need: ['pass', 'factory', 'truth'], lock: ['동력실 문이 잠겨 있다. 공장 전력과 기록 확인이 먼저다.'] }),
  S('eng-metro', 'met-annex', 1230, 440, '외곽 정비 터널', { k: 'gate', to: 'eng-annex', back: [1203, 1450], need: ['coreDoc'], lock: ['정비 터널 입구다. 어디로 이어지는지 알 수 없다.'] }),
  S('eng-metro', 'met-back', 770, 960, '도착 승강장', { k: 'gate', to: 'eng-lab', back: [1203, 900] }),
  S('eng-factory', 'fac-plan', 1310, 470, '조립 지시판', T(['조립 지시판이다.', '「톱니 부품 → 노란 줄 · 회로 부품 → 붉은 줄 · 외장 부품 → 푸른 줄」'])),
  S('eng-factory', 'fac-line', 1100, 300, '조립 라인 제어반', { k: 'dials', set: 'factory', q: '부품 셋을 맞는 라인으로 보낸다.',
    items: [{ n: '톱니 부품', opts: ['노란 줄', '붉은 줄', '푸른 줄'], ans: 0 }, { n: '회로 부품', opts: ['노란 줄', '붉은 줄', '푸른 줄'], ans: 1 }, { n: '외장 부품', opts: ['노란 줄', '붉은 줄', '푸른 줄'], ans: 2 }],
    ok: ['세 라인이 다시 돌기 시작한다. 공장 전력 배선이 열렸다.'], bad: '라인이 멈추고 경고등이 켜진다.' }),
  S('eng-factory', 'fac-dist-note', 1100, 160, '전력 소모 기록', T(['기계별 전력 소모 기록이다.', '「조립 팔 3 · 컨베이어 2 · 냉각기 5 — 합계 10 을 넘지 말 것」'], 'cDist')),
  S('eng-factory', 'fac-dist', 1350, 300, '전력 분배기', { k: 'dials', set: 'dist', need: ['gens'], q: '세 배선에 전력을 나눈다.',
    items: [{ n: '조립 팔', opts: [1, 2, 3, 4, 5], ans: 2 }, { n: '컨베이어', opts: [1, 2, 3, 4, 5], ans: 1 }, { n: '냉각기', opts: [1, 2, 3, 4, 5], ans: 4 }],
    ok: ['과부하 없이 전력이 나뉘었다. 동력실로 전력이 흘러간다.'], bad: '과부하 경고음이 울린다.', lock: ['전력 분배기다. 지금은 보낼 곳이 없다.'] }),
  S('eng-factory', 'fac-cool', 1270, 560, '냉각 수리대', { k: 'pick', set: 'coreFix', need: ['coreDmg'], q: '손상된 동력핵을 어떻게 식힐까?',
    opts: ['냉각수에 바로 담근다', '냉각수를 천천히 순환시킨다', '그대로 수리 집게에 건다'], ans: 1,
    ok: ['냉각수가 천천히 돌며 핵의 균열이 아문다. 복구된 중앙 동력핵을 얻었다.'], bad: '핵이 위험하게 떨린다. 다른 방법이 필요하다.', lock: ['냉각 수리대다. 수리할 것이 없다.'] }),
  S('eng-factory', 'fac-back', 100, 980, '외곽 승강장', { k: 'gate', to: 'eng-metro', back: [700, 1240] }),
  S('eng-archive', 'arc-cit', 300, 300, '시민 기록함', T(['시민의 일상 기록이다.', '「정지 전날, 중앙이 모든 집에 같은 안내를 보냈다 — 내일은 쉬십시오.」'], 'cRec')),
  S('eng-archive', 'arc-vid', 770, 120, '보안 영상 벽', T(['보안 영상이 돌아간다. 06:40 부터 07:20 까지 화면이 비어 있다.', '누군가 잘라 낸 것이 아니라 처음부터 찍지 않았다.'], 'cVid')),
  S('eng-archive', 'arc-note', 560, 450, '기술자 수첩', T(['기술자 수첩이다.', '「두 명령이 부딪쳤다. 하나는 도시를 지켜라, 하나는 사람을 내보내라.」', '「고대 번개 기계형 괴수가 구형 동력핵을 단 채 밖으로 나갔다. 예비 코어는 관찰실에 있다.」'], 'cNote')),
  S('eng-archive', 'arc-term', 765, 470, '최종 단말기 로그', { k: 'pick', set: 'truth', need: ['cRec', 'cVid', 'cNote'], q: '중앙 시스템은 왜 멈췄을까?',
    opts: ['인간을 적으로 판단해 반란을 일으켰다', '폭발 사고로 부서졌다', '모순된 명령 앞에서 스스로 멈춤을 택했다'], ans: 2,
    ok: ['로그가 확인된다. 「정지는 시스템이 스스로 선택했습니다.」', '괴수 동력 관찰실로 가는 정비 터널 좌표가 함께 열렸다.'], bad: '로그가 맞지 않는다고 표시된다.',
    lock: ['단말기 로그만으로는 알 수 없다. 시민 기록 · 보안 영상 · 기술자 수첩을 먼저 견줘 봐야 한다.'], also: 'coreDoc' }),
  S('eng-archive', 'arc-back', 770, 975, '외곽 다리', { k: 'gate', to: 'eng-metro', back: [1990, 1140] }, { hatch: 1 }),
  S('eng-annex', 'anx-t1', 90, 480, '왼쪽 안전 단말기', { k: 'seq', g: 'anx', i: 0, n: 3, set: 'annexOn', cool: 1, ok: ['세 단말기가 모두 켜졌다. 기계 팔이 움직인다.'], bad: '단말기 셋이 모두 꺼진다. 냉각 구간에만 조작해야 한다.' }),
  S('eng-annex', 'anx-t2', 1460, 480, '오른쪽 안전 단말기', { k: 'seq', g: 'anx', i: 1, n: 3, set: 'annexOn', cool: 1, ok: ['세 단말기가 모두 켜졌다. 기계 팔이 움직인다.'], bad: '단말기 셋이 모두 꺼진다. 냉각 구간에만 조작해야 한다.' }),
  S('eng-annex', 'anx-t3', 610, 180, '가운데 안전 단말기', { k: 'seq', g: 'anx', i: 2, n: 3, set: 'annexOn', cool: 1, ok: ['세 단말기가 모두 켜졌다. 기계 팔이 움직인다.'], bad: '단말기 셋이 모두 꺼진다. 냉각 구간에만 조작해야 한다.' }),
  S('eng-annex', 'anx-log', 400, 300, '옛 전투 기록', T(['괴수의 전기 폭발 사이클이 적혀 있다.', '「충전 3초 → 방출 2초 → 냉각 4초」', '「안전 단말기는 냉각 중에 좌 → 우 → 중앙」'])),
  S('eng-annex', 'anx-arm', 770, 200, '코어 적출 소켓', { k: 'record', set: 'coreDmg', need: ['annexOn'], lock: ['기계 팔이 멈춰 있다.'],
    ok: ['기계 팔이 손상된 중앙 동력핵을 꺼내 준다.', '003|괴수에 달린 구형 핵과 이어진 예비 코어입니다. 공장에서 식혀야 합니다.'] }),
  S('eng-annex', 'anx-back', 770, 975, '정비 터널', { k: 'gate', to: 'eng-metro', back: [1830, 800] }, { hatch: 1 }),

  /* ── 8장 · 중앙 시스템 재가동 ── */
  S('eng-power', 'pow-wall', 300, 400, '발전소 연결도', T(['벽의 연결선이 발전기 넷을 「서 → 북 → 동 → 남」 차례로 잇는다.'], 'cGen')),
  S('eng-power', 'pow-g0', 460, 500, '서쪽 발전기', { k: 'seq', g: 'gen', i: 0, n: 4, set: 'gens', ok: ['발전기 넷이 이어졌다. 도시 외곽에 불이 들어온다.'], bad: '발전기가 모두 멈춘다.' }),
  S('eng-power', 'pow-g1', 770, 160, '북쪽 발전기', { k: 'seq', g: 'gen', i: 1, n: 4, set: 'gens', ok: ['발전기 넷이 이어졌다. 도시 외곽에 불이 들어온다.'], bad: '발전기가 모두 멈춘다.' }),
  S('eng-power', 'pow-g2', 1060, 500, '동쪽 발전기', { k: 'seq', g: 'gen', i: 2, n: 4, set: 'gens', ok: ['발전기 넷이 이어졌다. 도시 외곽에 불이 들어온다.'], bad: '발전기가 모두 멈춘다.' }),
  S('eng-power', 'pow-g3', 770, 760, '남쪽 발전기', { k: 'seq', g: 'gen', i: 3, n: 4, set: 'gens', ok: ['발전기 넷이 이어졌다. 도시 외곽에 불이 들어온다.'], bad: '발전기가 모두 멈춘다.' }),
  S('eng-power', 'pow-cool', 1250, 800, '냉각수 밸브', { k: 'dial', key: 'coolT', opts: [10, 20, 30, 40, 50], unit: '도', note: '목표 온도 구간 20~30 도' }, { look: { sheet: 'props', i: 3, size: 80 } }),
  S('eng-power', 'pow-core', 770, 470, '빈 동력핵 자리', { k: 'mount', need: ['gens', 'dist', 'coreFix'], set: 'restart', keys: { coolT: [20, 30] },
    lock: ['거대한 동력핵 자리가 비어 있다.', '발전기 · 전력 분배 · 냉각 · 동력핵이 모두 갖춰져야 한다.'], bad: '냉각수 온도가 목표 구간이 아니다. 밸브를 다시 맞춰야 한다.',
    ok: ['복구된 중앙 동력핵을 장착했다.', '도시 전체 조명이 구역별로 차례로 켜진다. 멈춰 있던 공장 로봇들이 하나씩 천천히 움직인다.', '003 의 눈빛이 한 번 꺼졌다가 다시 켜진다.'] }, { r: 140 }),
  S('eng-power', 'pow-ctrl', 1400, 150, '최종 제어실 통로', { k: 'gate', to: 'eng-trial', back: [1203, 1350], need: ['restart'], lock: ['통로가 어둡다. 중앙 시스템이 깨어나야 열린다.'] }, { hatch: 1 }),
  S('eng-power', 'pow-back', 770, 1000, '중앙 대로', { k: 'gate', to: 'eng-metro', back: [1203, 480] }),

  /* ── 9~10장 · 최종 제어실 · 시험 · 계약 ── */
  S('eng-trial', 'trl-console', 770, 230, '중앙 단말기', { k: 'trial' }, { r: 130 }),
  S('eng-trial', 'trl-back', 770, 980, '동력실 통로', { k: 'gate', to: 'eng-power', back: [1203, 1300] }),
];
// 벽에 붙은 것(벽 그림 안쪽 좌표)은 걸을 수 있는 벽 밑으로 내려 다가갈 수 있게 한다
for (const s of EQ_SPOTS) { const m = EQ_MAPS.find((q) => q.id === s.map); if (m && s.at[1] < m.top + 24) s.at = [s.at[0], m.top + 24]; }
// 정비망 지도 — 연구소에서 갈 수 있는 곳(지역 F 는 기록 다섯 뒤)
export const EQ_TRAVEL = [
  { to: 'eng-scrap', name: '폐기된 병기 공장', rec: 'rec1' }, { to: 'eng-forest', name: '인공 생태림', rec: 'rec2' },
  { to: 'eng-signal', name: '침묵의 기계도시', rec: 'rec3' }, { to: 'eng-clock', name: '멈춰버린 시간의 탑', rec: 'rec4' },
  { to: 'eng-bio', name: '금지된 생명 연구구역', rec: 'rec5' }, { to: 'eng-origin', name: '최초의 명령실', rec: 'rec6', after: 5 },
];
// 지역마다 연구소로 돌아가는 정비망 출구(밟으면 옮겨 간다)
// at: 맵마다 그림 좌표 — 그림에 그려진 출구(철문 · 계단)나 바닥 철판 위. 철판 · 맨바닥은 hatch 로 승강판을 그린다
export const EQ_SITE_EXIT = { r: 70, to: 'eng-lab', back: [450, 1000], label: '버려진 기계 연구소', at: {
  'eng-scrap': { at: P(557, 887), hatch: 1 },    // 컨베이어 왼쪽 아래 녹슨 철판
  'eng-forest': { at: P(428, 955), hatch: 1 },   // 왼쪽 아래 녹슨 철판
  'eng-signal': { at: P(767, 980) },             // 아래 부서진 철문 사이(처음 서는 자리 아래)
  'eng-clock': { at: P(1395, 860) },             // 오른쪽 아래 돌계단 발치
  'eng-bio': { at: P(253, 827), hatch: 1 },      // 왼쪽 아래 녹슨 철판
  'eng-origin': { at: P(767, 935), hatch: 1 },   // 아래 벽 띠 바로 위 가운데
} };

/* ── 위험 장치(피해 없음 — 걸리면 안전한 자리로 밀려난다) ──
   press: period 초마다 on 구간 동안 반지름 r 안을 내려찍는다(warn 초 전부터 경고등) · spark: off 깃발이 모두 서기 전까지 늘 · drone: 길 pts 를 오가며 r 안을 비춘다 · beast: 충전 → 방출 → 냉각 */
export const EQ_HAZARDS = [
  { id: 'press', map: 'eng-tunnel', kind: 'press', at: P(240, 200), r: 120, period: 5, on: [3.6, 5], warn: 1, back: P(420, 360), msg: '압축 기계에 밀려났다. 경고등이 꺼진 틈에 들어가자.' },
  { id: 'spark', map: 'eng-tunnel', kind: 'spark', at: P(1450, 330), r: 170, off: ['brkA', 'brkB'], back: P(1250, 520), msg: '누전된 바닥에 튕겨 나왔다. 배전함 A 와 B 를 모두 내려야 한다.' },
  { id: 'drone1', map: 'eng-signal', kind: 'drone', pts: [P(300, 620), P(1240, 620)], period: 10, r: 120, off: ['drOff'], back: [1203, 1400], msg: '감시 드론에 들켜 입구로 돌아왔다.' },
  { id: 'drone2', map: 'eng-signal', kind: 'drone', pts: [P(770, 420), P(770, 860)], period: 7, r: 110, off: ['drOff'], back: [1203, 1400], msg: '감시 드론에 들켜 입구로 돌아왔다.' },
  { id: 'drone3', map: 'eng-metro', kind: 'drone', pts: [P(560, 400), P(980, 400)], period: 8, r: 120, off: ['drOff'], need: ['!pass'], back: [1203, 1300], msg: '감시 드론에 들켜 승강장으로 돌아왔다.' },
  { id: 'drone4', map: 'eng-metro', kind: 'drone', pts: [P(980, 650), P(560, 650)], period: 9, r: 120, off: ['drOff'], need: ['!pass'], back: [1203, 1300], msg: '감시 드론에 들켜 승강장으로 돌아왔다.' },
  { id: 'beast', map: 'eng-annex', kind: 'beast', at: P(765, 585), r: 430, cycle: [3, 2, 4], back: P(765, 960), msg: '방출된 전기에 튕겨 나왔다. 냉각 구간을 기다리자.' },
];
export const EQ_BEAST = { charge: 3, burst: 2, cool: 4 };   // 기획안 그대로 — 단말기는 냉각(마지막 4초)에만 받는다

// 미믹이 깨어나면 — 피해 없이 내 자리에 예고 원 → 물리면 back 쪽으로 밀려난다(정한 값)
export const EQ_MIMIC = { dur: 8, gap: 1.6, warn: 1.0, r: 80, push: 260 };

/* ── 최종 병기 시험(기획안 9장) ──
   레벨 · 장비와 관계없이 같은 능력 — 기준 피해 base(엔지니어 스킬 배율이 곱해진다) · 빌려주는 엔지니어 직업 레벨 lv(펄스 · 터렛 · 드론 · 자기장 · 레일포).
   시험 내구도 100(내 체력과 따로) · 페이즈를 마칠 때마다 저장(bag.eu.t) — 실패하면 그 페이즈부터 */
export const EQ_TRIAL = {
  base: 40, lv: 55, dur: 100,
  device: { at: P(770, 500), hp: 100, size: 1500, r: 330 },   // 1페이즈 지킬 제어 장치 — 바닥 원보다 조금 작게 그린다(size 그림 너비 · r 몹이 닿는 반지름, 11월 19일 사용자)
  waves: 6, gap: 40, first: 4,                                  // 6웨이브 · 40초 간격(합 4분 안팎)
  wave: [[2, 0, 0], [3, 1, 0], [2, 2, 1], [3, 2, 1], [3, 3, 2], [4, 3, 2]],   // 웨이브마다 [돌격, 우회, 원거리] 수(정한 값)
  bots: {
    rush: { hp: 12, spd: 85, dmg: 8, r: 40, rad: 26 },          // 정면 돌격 — 장치에 닿으면 dmg 주고 사라진다(hp 는 base 배수)
    flank: { hp: 8, spd: 130, dmg: 6, r: 40, rad: 22 },         // 우회 — 옆으로 돌아 온다
    shoot: { hp: 10, spd: 70, dmg: 3, r: 560, gap: 2.4, rad: 22 },   // 원거리 — 멈춰서 장치를 쏜다
  },
  boss: { hp: 600, at: P(770, 470), rad: 70, laser: { warn: 1.3, w: 130, len: 1300, dmg: 18 }, wave: { warn: 1.3, r: 360, dmg: 14 }, gap: 2.6,
    terms: [P(230, 450), P(1310, 450), P(330, 860), P(1210, 860)], recharge: 18, phase3: 0.3 },   // 방어막을 주는 외곽 단말기 넷 · 다시 세우는 시간
  last: { time: 90, heat: 1.4, coolBy: 30, cool: [P(180, 450), P(1350, 450), P(1100, 800)], cmd: ['재가동', '정지', '안전 확인'], ans: [1, 2, 0] },
  regen: 3, cost: { turret: 25, drone: 20 },                   // 기획안 수치(시험 전력 자동 회복 초당 3)
};
// 계약 창 문구(기획안 11장)
export const EQ_CONTRACT = { title: '고대 기계 문명의 관리자 권한', q: '히든 직업 「Engineer 003」을 획득하시겠습니까?', yes: '권한을 계승한다', no: '아직 결정하지 않는다' };

// 관리자 /엔지니어 <이름> 루트 <단계> — 그 단계 앞까지 깃발을 세운다(시험용)
const UPTO = (names) => names;
export const EQ_STAGES = [
  { name: '처음', set: [] },
  { name: '지하 정비 통로', set: UPTO(['mina', 'bench', 'pad', 'cElder', 'cLog', 'cBlade', 'cLedger', 'cSign', 'oak']) },
  { name: '자동인형 복구', set: ['brkA', 'brkB', 'board', 'pin', 'gear', 'cell', 'lift'] },
  { name: '여섯 설계 기록', set: ['doll', 'labLog', 'pCell', 'pMem', 'pJoint', 'pCtrl', 'doll3'] },
  { name: '중앙 기계도시', set: ['rec1', 'rec2', 'rec3', 'rec4', 'rec5', 'rec6', 'metro'] },
  { name: '중앙 시스템 재가동', set: ['pass', 'factory', 'truth', 'coreDoc', 'coreDmg', 'coreFix', 'annexOn', 'gens', 'dist', 'cool'] },
  { name: '최종 병기 시험', set: ['restart', 'cand'] },
  { name: '계약 선택', set: ['won'] },
];
