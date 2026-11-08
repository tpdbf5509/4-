/* ── RPG 800~1200레벨 사냥터 · 최고 레벨 1200 — 수치는 모두 여기 한 곳 ─────────────────────────────
   11월 8일 사용자 요청. 타락한 천궁(fallen) 오른쪽 문에서 이어지는 50레벨씩 8구역.
   지역마다 일반 몹 22 · 정예 2 · 보스 2. 규칙은 highCombat.js(기술 · 정예 · 보스 패턴), 그림은 highArt.js(몸) · highFxArt.js(기술 연출).
   rpg.js 가 MAPS · MOB · SPAWNS 에 이어 붙인다. deepData.js 의 DEEP_MAPS 에는 넣지 않는다 —
   심연의 탑 floorMob 이 DEEP_MAPS.length 로 몹을 돌려 쓰고, 의뢰 · 계몽의 문 창도 DEEP_MAPS 를 본다.
   맵 · 몹 · 기록 차례는 스냅샷에 쓰니 뒤에만 더한다.

   ★ 테스트 서버 먼저(11월 8일 사용자 "일단 테스트 서버에 적용하자") ★
   HIGH.live 가 false 면 새 사냥터 문 · 워프 · 도감 칸 · 레벨 1200 · 스탯 1200 은 테스트 서버(?test, 서버 방 RPGT)에서만 켜진다.
   일반 서버는 지금처럼 최고 레벨 800 · 스탯 800 이다. 사용자가 확인하면 live 를 true 로 바꾸기만 하면 실제 게임에 열린다. */

// 새 사냥터 · 레벨 1200 이 켜졌나 — HIGH.live · 전용 서버 테스트 방(g.test) · 테스트 화면(g.high, ?test 주소)
export const highOn = (g) => !!(HIGH.live || (g && (g.test || g.high)));
export const HIGH = {
  live: true,            // 실제 게임에 열었나(11월 8일 사용자 확인 뒤 연다) — false 면 테스트 서버에서만(rpg.js highOn)
  lv: 1200, stat: 1200,  // 연 뒤의 최고 레벨 · 스탯 하나의 상한
  liveLv: 800, liveStat: 800,   // 열기 전 일반 서버의 최고 레벨 · 스탯 상한(지금 값 그대로)
  from: "fallen",        // 이 맵 오른쪽 문에서 첫 지역으로 이어진다
  enterLv: 800,          // 타락한 천궁 → 첫 지역 문 · 워프로 들어가는 레벨(관리자는 통과). 기존 사냥터는 막지 않는다
};

/* 지역 8곳 — lv [시작, 끝], w 맵 폭.
   mob: hp [시작 레벨 값, 끝 레벨 값] 그대로(FAR_EASE.hp · MOB_HP_EASE · FAR_TAPER 를 곱하지 않는다) ·
   dmg 는 FAR_EASE.dmg(0.75)를 곱하기 전(deepData.js 와 같은 원본) · xp · coin 은 레벨에 곱하는 배수 · size [시작, 끝] · rad 몸 반지름.
   elite: 이름 · 몸 크기(같은 레벨 일반 몹 크기에 곱한다) — 세기는 HIGH_ELITE.
   boss: hp 그대로 · dmg 는 FAR_EASE.dmg 를 곱하기 전. xp · coin 은 400~800 보스가 늘던 폭을 이어 정한 초안(요청에 값이 없었다).
   drop 은 보스가 떨구는 재료 id */
export const HIGH_MAPS = [
  { id: "scrapyard", name: "폐기된 병기 공장", lv: [800, 850], w: 7000,
    mob: { name: "잔해 수거자", rad: 26, hp: [150000, 160000], dmg: [7050, 7800], xp: 11.5, coin: 5.0, size: [1.3, 1.42] },
    elite: { name: "과부하 집행기", size: 1.3 },
    boss: { name: "제0호 폐기 병기", lv: 840, hp: 2500000, dmg: 8700, xp: 202000, coin: 142000, size: 1.95 }, drop: "ancient_core" },
  { id: "synthetic_forest", name: "인공 생태림", lv: [850, 900], w: 7000,
    mob: { name: "합성 포식수", rad: 28, hp: [160000, 170000], dmg: [7800, 8600], xp: 12.0, coin: 5.2, size: [1.35, 1.47] },
    elite: { name: "증식하는 사냥꾼", size: 1.3 },
    boss: { name: "생태 통제체 가이아", lv: 890, hp: 2650000, dmg: 9500, xp: 228000, coin: 162000, size: 1.95 }, drop: "synthetic_seed" },
  { id: "silent_city", name: "침묵의 기계도시", lv: [900, 950], w: 7200,
    mob: { name: "무언의 파수병", rad: 24, hp: [170000, 180000], dmg: [8600, 9500], xp: 12.5, coin: 5.4, size: [1.3, 1.42] },
    elite: { name: "처형 집행관", size: 1.3 },
    boss: { name: "최후의 도시 관리자", lv: 940, hp: 2800000, dmg: 10500, xp: 256000, coin: 184000, size: 1.95 }, drop: "city_seal" },
  { id: "clock_tower", name: "멈춰버린 시간의 탑", lv: [950, 1000], w: 7200,
    mob: { name: "시계태엽 망령", rad: 22, hp: [180000, 190000], dmg: [9500, 10500], xp: 13.0, coin: 5.6, size: [1.2, 1.32] },
    elite: { name: "역행 감시자", size: 1.3 },
    boss: { name: "시간의 파수꾼 크로노스", lv: 990, hp: 3000000, dmg: 11600, xp: 286000, coin: 208000, size: 1.95 }, drop: "clock_fragment" },
  { id: "rift_boundary", name: "붕괴한 차원 경계", lv: [1000, 1050], w: 7400,
    mob: { name: "균열 추적자", rad: 24, hp: [190000, 200000], dmg: [10500, 11600], xp: 13.5, coin: 5.8, size: [1.25, 1.37] },
    elite: { name: "차원 포식체", size: 1.3 },
    boss: { name: "경계 파괴자 아비스", lv: 1040, hp: 3200000, dmg: 12800, xp: 318000, coin: 234000, size: 1.95 }, drop: "rift_crystal" },
  { id: "forbidden_lab", name: "금지된 생명 연구구역", lv: [1050, 1100], w: 7400,
    mob: { name: "불완전한 복제체", rad: 24, hp: [200000, 210000], dmg: [11600, 12800], xp: 14.0, coin: 6.0, size: [1.25, 1.37] },
    elite: { name: "적응형 실험체", size: 1.3 },
    boss: { name: "원형 생명체 오메가", lv: 1090, hp: 3450000, dmg: 14100, xp: 352000, coin: 262000, size: 1.95 }, drop: "omega_cell" },
  { id: "observer_hall", name: "관측자의 회랑", lv: [1100, 1150], w: 7600,
    mob: { name: "기록 말소자", rad: 22, hp: [210000, 220000], dmg: [12800, 14100], xp: 14.5, coin: 6.2, size: [1.2, 1.32] },
    elite: { name: "관측 대행자", size: 1.3 },
    boss: { name: "제7관측자 세라프", lv: 1140, hp: 3700000, dmg: 15500, xp: 388000, coin: 292000, size: 1.95 }, drop: "observer_record" },
  { id: "origin_command", name: "최초의 명령실", lv: [1150, 1200], w: 7600,
    mob: { name: "원초의 집행자", rad: 26, hp: [220000, 230000], dmg: [14100, 15500], xp: 15.0, coin: 6.4, size: [1.3, 1.42] },
    elite: { name: "절대 명령체", size: 1.3 },
    boss: { name: "최초의 수호기계 알파", lv: 1190, hp: 4000000, dmg: 17000, xp: 426000, coin: 324000, size: 1.95 }, drop: "origin_core" },
];
export const HIGH_IDS = HIGH_MAPS.map((d) => d.id);
export const HIGH_BY_ID = Object.fromEntries(HIGH_MAPS.map((d) => [d.id, d]));
export const eliteId = (id) => `${id}_elite`;          // 정예 몹 종류 — 일반 몹과 따로 세고(기록 · 도감) 따로 그린다
export const HIGH_ELITE_IDS = HIGH_IDS.map(eliteId);

// 무리 — 맵마다 일반 n · 정예 eliteN · 보스 bossN, 다시 나오는 초. 일반 · 보스는 400~800 사냥터(DEEP_SPAWN)와 같다
export const HIGH_SPAWN = { n: 22, respawn: 4.5, eliteN: 2, eliteRespawn: 20, bossN: 2, bossRespawn: 30 };

/* 정예 — 같은 레벨 일반 몹에 곱한다. 보스가 아니라 보스 재료를 주지 않는다.
   심연의 탑 정예(abyssCardData.js ELITE · 몹의 m.elite)와는 따로다 — 이 정예는 몹 종류 자체가 다르다 */
export const HIGH_ELITE = { hp: 2, dmg: 1.2, xp: 2, coin: 2 };

// 움직임 — 값의 뜻은 rpg.js GOBLIN · ORC 와 같다(stepBrute). 내려찍기는 없고(slamRange 0) 기술은 HIGH_MOVES
export const HIGH_BRUTE = {
  scrapyard: { aggro: 560, walk: 215, punchCd: 0.9, slamRange: 0, call: 320, leash: 1600 },
  synthetic_forest: { aggro: 600, walk: 250, punchCd: 0.8, slamRange: 0, call: 340, leash: 1600 },
  silent_city: { aggro: 600, walk: 190, punchCd: 1, slamRange: 0, call: 300, leash: 1600 },
  clock_tower: { aggro: 580, walk: 200, punchCd: 0.95, slamRange: 0, call: 300, leash: 1600 },
  rift_boundary: { aggro: 620, walk: 230, punchCd: 0.85, slamRange: 0, call: 340, leash: 1700 },
  forbidden_lab: { aggro: 580, walk: 210, punchCd: 1, slamRange: 0, call: 320, leash: 1700 },
  observer_hall: { aggro: 640, walk: 220, punchCd: 0.9, slamRange: 0, call: 340, leash: 1800 },
  origin_command: { aggro: 660, walk: 235, punchCd: 0.85, slamRange: 0, call: 360, leash: 1800 },
};

/* 기술 — 몹 하나가 쓰는 차례 목록. 대기(cd)가 끝나고 거리(range · min) 안이면 앞에서부터 하나를 쓴다. 뜻은 highCombat.js 맨 위.
   모든 공격은 예고(warn 초) 동안 바닥에 범위가 보이고, 터질 때 그 범위 안에 선 사람만 맞는다(그림과 판정이 같은 모양).
   mul 은 그 몹 공격력(FAR_EASE 를 곱한 값)에 곱한다 — 400~800 기술(0.75~1.7)과 비슷하게, 큰 광역은 2 남짓.
   일반 몹(mob) · 정예(elite) · 보스(boss). 보스는 phases(체력 단계마다 목록) 또는 forms(형태마다 목록)를 쓸 수 있다.
   passive: rage 체력이 줄수록 빨리 친다 · switch 근접 ↔ 원거리를 번갈아 · aura 둘레 몹 강화 · death 쓰러질 때 */
const C = (o) => ({ k: "circle", at: "now", n: 1, r: 90, warn: 0.9, mul: 1.5, cd: 4.5, range: 460, ...o });
export const HIGH_MOVES = {
  // 1. 폐기된 병기 공장 — 잔해 수거자는 돌진, 과부하 집행기는 쓰러질 때 폭발. 제0호는 강철 방패 · 광역 레이저
  scrapyard: {
    mob: [{ k: "dash", range: 440, min: 140, warn: 0.7, cd: 5, mul: 1.4, len: 380, w: 70, speed: 950 }],
    elite: [{ k: "dash", range: 480, min: 120, warn: 0.6, cd: 4, mul: 1.5, len: 440, w: 84, speed: 1050 }],
    eliteDeath: { k: "blast", r: 170, warn: 1.1, mul: 2.2 },
    boss: [
      { k: "shield", cd: 14, t: 4, cut: 0.7, range: 700 },
      { k: "laser", range: 680, warn: 1.2, cd: 7, mul: 1.9, len: 680, w: 86, n: 3, spread: 0.5 },
      { k: "dash", range: 520, min: 160, warn: 0.8, cd: 9, mul: 1.6, len: 520, w: 110, speed: 1000 },
    ],
  },
  // 2. 인공 생태림 — 합성 포식수는 빠른 도약, 증식하는 사냥꾼은 분신. 가이아는 인조 식물 · 회복 구역
  synthetic_forest: {
    mob: [{ k: "leap", range: 460, min: 150, warn: 0.75, cd: 4.5, mul: 1.5, r: 100 }],
    elite: [{ k: "clone", type: "hi_sclone", n: 2, cap: 2, hp: 0.25, life: 14, cd: 12, range: 520 },
      { k: "leap", range: 480, min: 130, warn: 0.65, cd: 4, mul: 1.6, r: 110 }],
    boss: [
      { k: "summon", type: "hi_plant", n: 2, cap: 4, hp: 0.04, life: 24, cd: 13, range: 700 },
      { k: "zone", r: 210, life: 7, heal: 0.012, cd: 16, range: 700 },
      { k: "leap", range: 560, min: 150, warn: 0.95, cd: 6, mul: 1.8, r: 150 },
    ],
  },
  // 3. 침묵의 기계도시 — 무언의 파수병은 직선 포격, 처형 집행관은 광역 참격. 도시 관리자는 기계 병사 · 방어막
  silent_city: {
    mob: [{ k: "laser", range: 500, min: 100, warn: 0.85, cd: 4.5, mul: 1.5, len: 480, w: 60, n: 1, spread: 0 }],
    elite: [{ k: "slash", range: 260, warn: 0.85, cd: 4.5, mul: 1.8, r: 230, arc: 1.2 }],
    boss: [
      { k: "summon", type: "silent_city", n: 2, cap: 4, hp: 0.06, life: 30, cd: 14, range: 700 },
      { k: "barrier", amt: 0.06, t: 8, cd: 18, range: 700 },
      { k: "laser", range: 660, warn: 1.1, cd: 6, mul: 1.8, len: 640, w: 80, n: 2, spread: 0.6 },
    ],
  },
  // 4. 멈춰버린 시간의 탑 — 시계태엽 망령은 지연 폭발, 역행 감시자는 위치 되돌리기. 크로노스는 회전하는 시간 장판 · 지연 공격
  clock_tower: {
    mob: [C({ warn: 1.4, r: 95, mul: 1.6, cd: 4.5 })],
    elite: [{ k: "rewind", range: 520, warn: 1.2, cd: 7, back: 1.2, r: 120, mul: 1.9, boom: 0.9 }],
    boss: [
      { k: "sweep", range: 720, warn: 0.9, cd: 9, mul: 1.8, n: 4, arc: 0.55, len: 520, step: 0.45 },
      C({ n: 4, warn: 1.6, r: 120, mul: 1.9, cd: 6, range: 720 }),
    ],
  },
  // 5. 붕괴한 차원 경계 — 균열 추적자는 짧은 순간이동, 차원 포식체는 쓰러지면 둘레 몹을 강화. 아비스는 공간 균열 · 광역 폭발
  rift_boundary: {
    mob: [{ k: "blink", range: 520, min: 180, near: 90, warn: 0.7, cd: 5, mul: 1.5, r: 100 }],
    elite: [C({ warn: 1, r: 110, mul: 1.7, cd: 4.5 })],
    eliteDeath: { k: "empower", r: 420, t: 8, mul: 1.25 },
    boss: [
      { k: "rift", range: 720, warn: 1, cd: 7, mul: 1.7, n: 4, len: 420, w: 70, life: 2.4 },
      { k: "ring", range: 520, warn: 1.8, cd: 11, mul: 2.2, r: 400, inner: 0 },
      { k: "blink", range: 640, min: 240, near: 120, warn: 0.8, cd: 9, mul: 1.6, r: 140 },
    ],
  },
  // 6. 금지된 생명 연구구역 — 불완전한 복제체는 체력이 줄수록 빨리 치고, 적응형 실험체는 근접 ↔ 원거리. 오메가는 형태 변화 · 재생 장치
  forbidden_lab: {
    mob: [C({ warn: 1, r: 90, mul: 1.4, cd: 5.5, range: 380 })],
    passive: { rage: 0.45 },                          // 체력 0 에 가까울수록 치는 간격이 45% 까지 짧아진다
    elite: [{ k: "slash", range: 240, warn: 0.75, cd: 4, mul: 1.7, r: 200, arc: 1, only: 0 },
      C({ n: 2, warn: 0.95, r: 100, mul: 1.6, cd: 3.5, only: 1, range: 560 })],
    elitePassive: { switch: 6, keep: 320 },           // 6초마다 근접(0) ↔ 원거리(1) — only 가 그 모드의 기술
    boss: {
      forms: [
        [{ k: "summon", type: "hi_device", n: 1, cap: 2, hp: 0.03, life: 30, cd: 16, range: 700 },
          { k: "slash", range: 300, warn: 0.9, cd: 5, mul: 1.9, r: 260, arc: 1.4 },
          { k: "leap", range: 560, min: 160, warn: 0.9, cd: 8, mul: 1.8, r: 150 }],
        [{ k: "summon", type: "hi_device", n: 1, cap: 2, hp: 0.03, life: 30, cd: 16, range: 700 },
          C({ n: 4, warn: 1.1, r: 120, mul: 1.8, cd: 5, range: 720 }),
          { k: "laser", range: 680, warn: 1.1, cd: 7, mul: 1.8, len: 660, w: 80, n: 3, spread: 0.45 }],
      ],
      formAt: 0.5,                                    // 체력 50% 아래에서 한 번 형태를 바꾼다
    },
  },
  // 7. 관측자의 회랑 — 기록 말소자는 지나온 자리를 치고, 관측 대행자는 걸어온 길을 따라 친다. 세라프는 위치 예측 폭격 · 광역 심판
  observer_hall: {
    mob: [C({ at: "past", back: 1, warn: 1, r: 95, mul: 1.6, cd: 4.5 })],
    elite: [{ k: "trail", range: 560, warn: 0.9, cd: 6, mul: 1.6, r: 90, n: 5, gap: 0.18, span: 1.6 }],
    boss: [
      C({ at: "predict", ahead: 1.1, n: 4, warn: 1.1, r: 120, mul: 1.9, cd: 5, range: 740 }),
      { k: "ring", range: 560, warn: 2, cd: 12, mul: 2.3, r: 440, inner: 0 },
      { k: "trail", range: 700, warn: 0.9, cd: 8, mul: 1.7, r: 100, n: 6, gap: 0.16, span: 1.8 },
    ],
  },
  // 8. 최초의 명령실 — 원초의 집행자는 근접 ↔ 원거리, 절대 명령체는 둘레 몹을 강화. 알파는 4단계
  origin_command: {
    mob: [{ k: "dash", range: 420, min: 140, warn: 0.7, cd: 5, mul: 1.4, len: 360, w: 70, speed: 950, only: 0 },
      C({ warn: 0.95, r: 95, mul: 1.5, cd: 3.8, only: 1, range: 560 })],
    passive: { switch: 7, keep: 320 },
    elite: [{ k: "slash", range: 260, warn: 0.8, cd: 4.5, mul: 1.8, r: 230, arc: 1.3 },
      C({ n: 2, warn: 1, r: 105, mul: 1.6, cd: 5, range: 560 })],
    elitePassive: { aura: { r: 380, mul: 1.2 } },     // 살아 있는 동안 둘레 몹 공격력 +20%(겹치지 않는다)
    boss: {
      // 알파 — 체력 100~75% · 75~50% · 50~25% · 25~0%
      phases: [
        [{ k: "ring", range: 300, warn: 1, cd: 5, mul: 1.9, r: 260, inner: 0 },
          { k: "dash", range: 560, min: 160, warn: 0.85, cd: 6, mul: 1.7, len: 560, w: 110, speed: 1050 }],
        [C({ n: 4, warn: 1.1, r: 120, mul: 1.9, cd: 4.5, range: 760, waves: 2, gap: 0.8 }),
          { k: "laser", range: 700, warn: 1.1, cd: 7, mul: 1.9, len: 700, w: 86, n: 3, spread: 0.5 }],
        [{ k: "summon", type: "hi_drone", n: 2, cap: 4, hp: 0.03, life: 26, cd: 12, range: 760 },
          { k: "clone", type: "hi_echo", n: 2, cap: 2, hp: 0.02, life: 16, cd: 18, range: 760 },
          { k: "ring", range: 560, warn: 1.8, cd: 9, mul: 2.2, r: 420, inner: 0 }],
        [{ k: "combo", range: 760, cd: 7, list: [
          { k: "dash", warn: 0.75, mul: 1.7, len: 520, w: 110, speed: 1100 },
          { k: "ring", warn: 0.9, mul: 1.9, r: 260, inner: 0 },
          C({ n: 4, warn: 1, r: 120, mul: 1.8 })] },
          { k: "summon", type: "hi_drone", n: 2, cap: 4, hp: 0.03, life: 26, cd: 14, range: 760 },
          { k: "ring", range: 560, warn: 1.7, cd: 10, mul: 2.2, r: 420, inner: 0 }],
      ],
      phaseAt: [0.75, 0.5, 0.25],
    },
  },
};

/* 소환물 — 보스 · 정예가 부르는 것. 보상(경험치 · 코인 · 기록)이 없고 다시 나오지 않는다. 부른 몹이 쓰러지면 함께 사라진다.
   hp 는 부른 몹 최대 체력에 곱하는 몫(HIGH_MOVES 의 hp), dmg 는 부른 몹 공격력에 곱한다 */
export const HIGH_SUMMON = {
  hi_plant: { name: "인조 식물", rad: 22, size: 1.2, dmg: 0.5, still: 1, shoot: C({ warn: 1, r: 80, mul: 1.2, cd: 4, range: 520 }) },
  hi_device: { name: "재생 장치", rad: 20, size: 1.2, dmg: 0, still: 1, heal: 0.012 },   // 살아 있는 동안 주인을 초당 최대 체력의 1.2% 회복
  hi_drone: { name: "소형 기계 병기", rad: 18, size: 1.1, dmg: 0.45 },
  hi_echo: { name: "알파의 분신", rad: 30, size: 1.5, dmg: 0.4 },
  hi_sclone: { name: "사냥꾼의 분신", rad: 26, size: 1.3, dmg: 0.4 },
};
export const HIGH_SUMMON_IDS = Object.keys(HIGH_SUMMON);
export const HIGH_CAP = { summonPerMap: 10 };   // 한 맵의 소환물 전체 상한 — 보스 둘이 동시에 불러도 넘지 않는다

// 보스 재료 — itemData.js MATERIALS 뒤에 붙는다(되팔기 값). 제작은 이번에 넣지 않았다
export const HIGH_MATS = [
  { id: "ancient_core", name: "고대 병기 동력핵", color: "#d8b070", sell: 14000, note: "제0호 폐기 병기가 떨군다" },
  { id: "synthetic_seed", name: "합성 생명의 씨앗", color: "#9fd8a0", sell: 15500, note: "생태 통제체 가이아가 떨군다" },
  { id: "city_seal", name: "도시 관리자의 인장", color: "#a8c0d8", sell: 17000, note: "최후의 도시 관리자가 떨군다" },
  { id: "clock_fragment", name: "균열된 시계 부품", color: "#e0c890", sell: 18500, note: "시간의 파수꾼 크로노스가 떨군다" },
  { id: "rift_crystal", name: "차원 경계 결정", color: "#b8a0e8", sell: 20000, note: "경계 파괴자 아비스가 떨군다" },
  { id: "omega_cell", name: "원형 세포핵", color: "#e8a0b0", sell: 22000, note: "원형 생명체 오메가가 떨군다" },
  { id: "observer_record", name: "관측 기록 파편", color: "#e8e0c0", sell: 24000, note: "제7관측자 세라프가 떨군다" },
  { id: "origin_core", name: "최초의 명령 코어", color: "#f0b8a0", sell: 26000, note: "최초의 수호기계 알파가 떨군다" },
];

// 보스가 기술을 쓸 때 머리 위에 띄우는 이름 — 지역 id → 기술 kind → 글
export const HIGH_CALLS = {
  scrapyard: { shield: "강철 방패", laser: "광역 레이저", dash: "폐기 돌진" },
  synthetic_forest: { summon: "인조 식물", zone: "회복 구역", leap: "포식 도약" },
  silent_city: { summon: "기계 병사 소환", barrier: "방어막", laser: "도시 포격" },
  clock_tower: { sweep: "회전하는 시간", circle: "지연 공격" },
  rift_boundary: { rift: "공간 균열", ring: "광역 폭발", blink: "차원 도약" },
  forbidden_lab: { summon: "재생 장치", slash: "촉수 휩쓸기", leap: "형태 도약", circle: "세포 폭격", laser: "변이 광선", form: "형태 변화" },
  observer_hall: { circle: "위치 예측 폭격", ring: "광역 심판", trail: "경로 추적" },
  origin_command: { ring: "근접 강타", dash: "돌진", circle: "에너지 포격", laser: "에너지 포격", summon: "소형 기계 병기", clone: "분신", combo: "최후 명령",
    p1: "에너지 포격 모드", p2: "제조 모드", p3: "최후 명령 — 모든 기능 해방" },
};

/* 그림 — rpg/high/<지역>-mobs.webp(1536×512, 3열 × 1행, 칸 512: 일반 · 정예 · 보스) · rpg/high/summons.webp(1280×256, 5열, 칸 256)
   · rpg/high/<지역>-back.webp(뒤 풍경 띠, 맵 위쪽 top 높이에 맞춰 좌우로 잇는다). 오른쪽을 본다. 못 불러오면 highArt.js 코드 그림.
   h 는 크기 1 일 때 칸 한 장의 화면 높이(px), feet 는 칸 높이에 대한 발밑 비율 */
export const HIGH_ART = {
  dir: "high", mobCell: 512, mobH: 92, mobFeet: 0.95, sumCell: 256, sumH: 58, sumFeet: 0.94,
  // 코드 그림 — 지역마다 몸 꼴 · 색(본색 · 그늘 · 빛)
  look: {
    scrapyard: { shape: "crab", c: ["#9a7f66", "#6e5a49", "#e8b878"] },
    synthetic_forest: { shape: "beast", c: ["#9fb8a4", "#6a8572", "#bfe8c8"] },
    silent_city: { shape: "soldier", c: ["#8d96a8", "#5f6778", "#bfe0f0"] },
    clock_tower: { shape: "wraith", c: ["#c4ac80", "#8c7a5c", "#f0dca8"] },
    rift_boundary: { shape: "beast", c: ["#7c7298", "#544c6e", "#d8c8ff"] },
    forbidden_lab: { shape: "clone", c: ["#c8c0c4", "#8f868c", "#f0a8b8"] },
    observer_hall: { shape: "wraith", c: ["#e6dcc6", "#b0a68e", "#f0dca0"] },
    origin_command: { shape: "soldier", c: ["#6e6c78", "#4a4852", "#f0a890"] },
  },
  sumLook: { hi_plant: "#9fd8b0", hi_device: "#bfe8c8", hi_drone: "#f0a890", hi_echo: "#f0a890", hi_sclone: "#9fd8c8" },
};
