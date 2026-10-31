/* ── RPG 1차 전직 — 수치는 모두 여기 한 곳 ─────────────────────────────
   200레벨부터 광장의 전직 교관에게 시험을 받고, 시험을 마치면 그 전직을 확정한다. 확정하면 되돌릴 수 없다.
   기본 직업(job)은 그대로 두고 전직(advClass)만 더한다. 전직마다 액티브 1개(키 adv, 기본 Z) · 패시브 1개.
   피해는 기존 셈 그대로 SKILL_USE.base × 스탯 배율(physMul · magMul · heroDmgMul) × mul.
   규칙은 rpg.js(rpgAdv · advUse · advOnHit · advDmgMul · advTake · tickAdv), 그림은 advArt.js, 창은 AdvPanel.jsx.
   저장: 기록의 advClass(전직 id) · advQ({ c 시험 전직, n 진행 }). 쿨타임 · 중첩 · 정령은 싸우는 동안만(h.as) */

export const ADV = {
  lv: 200,                       // 전직할 수 있는 레벨
  npc: { x: 640, y: 360 },       // 광장의 전직 교관 자리 — 무기상점과 명예 순위판 사이 빈 풀밭
  reach: 110,                    // 이만큼 가까우면 교관 창을 연다
  trialLv: 160,                  // 시험에 세는 몹 레벨(오우거 사냥터부터) — 허수아비는 세지 않는다
  trialVer: 2,                   // 시험 판 — 시험 내용을 바꾸면 올린다. 판이 다른 진행은 처음부터(10월 26일 판 1 → 사용자 요청 시험 판 2)
  pvpBonusMax: 0.15,             // 결투 · 사냥터 PvP 에서 패시브 추가 피해 합계 상한(+15%)
  pvpCc: 0.5,                    // 결투 · 사냥터 PvP 에서 전직 스킬 경직 · 둔화 시간 배율
  pveBonusMax: 0.6,              // 몹에게 주는 패시브 추가 피해 합계 상한(+60%)
};

// 스냅샷 · 저장 차례 — 뒤에만 더한다
export const ADV_IDS = ["gladiator", "knight", "marksman", "gunner", "archmage", "summoner", "healer", "assassin", "elf"];

/* 전직 여섯 — job 기본 직업 · line 정통 강화(main) · 특수(special) · weapon 쓰는 무기(화면 설명) · gear 확정 때 받는 무기(SPECIALS id)
   active.mul 은 SKILL_USE.base × 스탯 배율에 곱한다. 비교 기준(10월 25일): 직업 스킬 5레벨 2.2~4.4배 · 대기 7~9초,
   월드보스 무기 용아선풍 총 5.3배 · 16초. 전직 액티브는 초당 0.5~0.65배 안팎(직업 스킬보다 조금 위)으로 맞췄다 */
export const ADV_CLASSES = [
  {
    id: "gladiator", job: "warrior", line: "main", name: "검투사", weapon: "검",
    note: "검을 그대로 든다 · 이어 베는 콤보로 몰아친다",
    active: {
      name: "삼연참", note: "앞을 세 번 잇달아 벤다 · 세 번째가 가장 세다 · 한 번만 누르면 셋 다 나간다",
      cd: 9, dmg: "str", r: 175, half: 1.05,       // 앞 부채꼴 — 반지름 r · 반각 half(라디안)
      hits: [{ at: 0, mul: 1.4, stun: 0.2 }, { at: 0.18, mul: 1.4, stun: 0.2 }, { at: 0.4, mul: 2.8, stun: 0.35, wave: 1 }],   // 합 5.6배
      waveR: 130,                                   // 세 번째 충격파 — 앞쪽 끝자리 둘레
    },
    passive: {
      name: "전투 본능", note: "평타 · 직업 스킬을 맞힐 때마다 투지 · 가득(8)이면 다음 삼연참 피해 +40% · 범위 +25% · 4초 동안 못 맞히면 사라진다",
      basic: 1, job: 2, max: 8, fade: 4, mul: 1.4, grow: 1.25,
    },
    // 시험 레벨 lv0 에서 lv0 + n 까지 — 결투장에서 이길 때마다 up 확률로 한 레벨(무승부 · 패배는 그대로)
    trial: { name: "결투장 승급 시험", note: "결투장 결투에서 이기면 80% 확률로 시험 레벨이 오른다 · 1레벨에서 15레벨까지", n: 14, lv0: 1, up: 0.8 },
  },
  {
    id: "knight", job: "warrior", line: "special", name: "기사", weapon: "검과 방패",
    note: "방패를 든다 · 막아 내고 되받아친다",
    active: {
      name: "철벽 방어", note: "40초 동안 받는 피해 50% 감소 · 둘레 적을 4초 도발 · 결투 상대도 도발한다 · 맞으면 반격(최대 4번)",
      cd: 20, dmg: "str", dur: 40, cut: 0.5, r: 160, mul: 1.8, max: 4, gap: 0.5, taunt: 4, tauntRadius: 260,
      // 파티 보호 — 사냥터 · 던전 · 토벌에서만 곁의 파티원에게 피해 15% 감소(결투 · PvP 는 본인만). 기존 성기사 보호막 · 마나 보호막과
      // 겹쳐도 아래 cap 을 넘지 않는다. 월드보스 합동 공격 기준(공격량)에는 영향이 없어 작게 넣었다
      party: { r: 220, cut: 0.15 },
    },
    passive: {
      name: "불굴의 의지", note: "체력 40% 이하에서 받는 피해 20% 더 감소 · 모든 감소를 합쳐 70% 를 넘지 않는다",
      hp: 0.4, cut: 0.2,
    },
    cap: 0.7,                                       // 철벽(직업) · 철벽 방어 · 불굴 · 파티 보호를 모두 합친 감소 상한 — 무적이 되지 않게
    // 사람(결투 · 사냥터 PvP) · 몬스터에게 맞은 수. 화상 · 장판처럼 잇달아 드는 피해가 한꺼번에 세지 않게 gap 초에 한 대
    trial: { name: "맷집 시험", note: "사람과 몬스터에게 100대 맞는다", n: 100, gap: 0.25 },
  },
  {
    id: "marksman", job: "archer", line: "main", name: "명사수", weapon: "활",
    note: "활을 그대로 든다 · 멀리서 정밀하게 꿰뚫는다",
    active: {
      name: "관통 저격", note: "앞으로 곧게 꿰뚫는 화살 · 맞은 적 모두에게 약점 표식(6초)",
      cd: 9, dmg: "str", len: 680, width: 42, mul: 4.6, aim: 0.22, mark: 6,   // aim — 조준선이 보인 뒤 쏘기까지(초)
    },
    passive: {
      name: "약점 포착", note: "같은 적을 세 번 이어 맞히면 약점 노출 · 표식이나 노출된 적에게 다음 공격 피해 +30% · 나보다 느린 적에게 늘 피해 +15%",
      need: 3, bonus: 0.3,
      slower: 0.15,                                 // 10월 30일 사용자 요청 — 나보다 이동 속도가 낮은 적에게 주는 피해 +15%(몹 · 사람 모두, ADV.pvpBonusMax · pveBonusMax 안)
    },
    // 비타겟팅 스킬 — 겨눈 쪽으로 나가 빗나갈 수 있는 스킬(관통 화살 · 용암 · 그림자 · 별자리 활 스킬). 한 번 쓸 때 160레벨 이상 몹을 맞히면 1,
    // 아무것도 못 맞히면 0 으로 돌아간다(연속)
    trial: { name: "명중 시험", note: "비타겟팅 스킬(관통 화살 · 용암 · 그림자 · 별자리 활 스킬)로 160레벨 이상 몹을 연속 20번 맞힌다 · 빗나가면 처음부터", n: 20, streak: 1 },
  },
  {
    id: "gunner", job: "archer", line: "special", name: "총사", weapon: "쌍권총",
    note: "활 대신 쌍권총을 든다 · 중거리에서 움직이며 쏜다",
    gear: "adv_guns",
    active: {
      name: "속사", note: "쌍권총으로 앞쪽 가장 가까운 적에게 여덟 발을 잇달아 쏜다 · 원소는 마지막 한 발만",
      cd: 9, dmg: "str", n: 8, gap: 0.1, mul: 0.72, range: 330, fly: 0.08,   // 합 5.76배(한 대상)
    },
    passive: {
      name: "탄도 숙련", note: "같은 적에게 이어 맞히면 다음 탄환 피해 +6%씩(최대 5) · 2초 동안 못 맞히면 사라진다",
      per: 0.06, max: 5, fade: 2,
    },
    // 10월 30일 사용자 요청 — 장전. 쌍권총 평타는 탄창(mag 발)을 쓰고, 다 쓰면 time 초 동안 장전한다(그동안 평타가 나가지 않는다).
    // 장전 중에는 걷는 속도가 slow 만큼 준다(둔화 시간 = 장전 시간 · 사용자가 "미정"이라 한 값 — 여기 한 곳만 고친다). 속사(Z)는 탄창과 따로
    reload: { mag: 12, time: 1.6, slow: 0.35 },
    // 300레벨까지의 사냥터 몬스터 — 종류마다 한 번(보스도 같은 종류로 센다). 차례는 저장(advQ.m)에 쓰니 뒤에만 더한다
    trial: { name: "사냥 도감 시험", note: "300레벨까지의 모든 몬스터를 한 번씩 잡는다", list: ["rabbit", "wolf", "boar", "gorilla", "goblin", "orc", "ogre", "skeletal", "zombie", "necro"], each: 1 },
  },
  {
    id: "archmage", job: "mage", line: "main", name: "마도사", weapon: "지팡이",
    note: "지팡이를 그대로 든다 · 원소 마력을 한곳에 터뜨린다",
    active: {
      name: "마력 폭발", note: "가장 가까운 적(없으면 겨눈 곳)에 마법진 · 잠시 뒤 원소 폭발 · 원소마다 부가 효과",
      cd: 10, dmg: "int", reach: 380, aim: 240, delay: 0.45, r: 170, mul: 5,
      // 원소 부가 효과 — 원소 궁극기(Shift)와 따로 셈한다. 화상 · 독은 평타 세기(soak 0)로 한 번만 건다
      elem: { bolt: { stun: 0.6 }, frost: { slow: 2.5 }, gravity: { pull: 0.5 }, corrode: {}, flame: {}, poison: {} },
    },
    passive: {
      name: "마력 순환", note: "마법 공격이 맞으면 마력 1(0.25초에 한 번 · 최대 10) · 마력 폭발이 모두 써서 하나에 피해 +6% · 넓이 +4",
      max: 10, gap: 0.25, per: 0.06, grow: 4,
    },
    // 시험 동안은 마력 폭발(Z)을 쓸 수 있다(마력 순환은 없다). 160레벨 이상 몹을 마력 폭발로 잡은 수 per 마다 시험 레벨 +1
    trial: { name: "마력 폭발 시험", note: "시험 동안 쓸 수 있는 마력 폭발(Z)로 160레벨 이상 적을 잡아 시험 레벨을 1에서 10까지 올린다 · 5마리마다 1레벨", n: 45, lv0: 1, per: 5, skill: 1 },
  },
  {
    id: "summoner", job: "mage", line: "special", name: "소환술사", weapon: "소환서",
    note: "소환서를 든다 · 원소 정령과 함께 싸운다",
    gear: "adv_grim",
    active: {
      name: "정령 소환", note: "쓸 때마다 지금 원소의 정령을 하나 더 부른다(최대 10마리) · 부를 때 모든 정령이 다시 20초 · 둘레 적을 스스로 공격",
      cd: 16, dmg: "int", life: 20, range: 300, every: 1.2, mul: 0.7, fly: 0.22,   // 한 마리 초당 약 0.58배
      max: 10,                                    // 함께 있는 정령 수 한도 — 부를 때 모두의 시간이 life 로 다시 차서 쿨타임(16초)마다 하나씩 늘어난다
    },
    passive: {
      name: "영혼 연결", note: "나와 정령 하나가 2초 안에 같은 적을 치면 영혼 피해(2초에 한 번) · 정령이 없으면 없다",
      win: 2, gap: 2, mul: 0.6,
    },
    // 300레벨까지의 보스가 떨구는 재료 — 시험을 받은 뒤 보스에게서 얻은 것만 종류마다 each 개(가방에서 빼지 않는다). 차례는 저장(advQ.m)에 쓰니 뒤에만 더한다
    trial: { name: "수집 시험", note: "300레벨까지의 보스가 떨구는 재료를 종류마다 5개씩 모은다(시험을 받은 뒤 얻은 것)", list: ["fur", "fang", "tusk", "hide", "blue", "eye", "heart", "bone", "rot", "soul"], each: 5 },
  },
  {
    // 10월 26일 사용자 요청 — 마법사의 셋째 전직. 범위 안 사람에게 방어 · 치유를 건다
    id: "healer", job: "mage", line: "special", name: "치유사", weapon: "성광 지팡이",
    note: "성스러운 지팡이를 든다 · 둘레 사람을 지키고 치유한다",
    active: {
      name: "수호의 축복", note: "둘레 사람 모두(나 포함)에게 40초 축복 · 공격력 15% 증가 · 받는 피해 15% 감소 · 바로 체력 20% 회복 · 2초마다 체력 2% 회복",
      cd: 45, dmg: "int", r: 320, dur: 40, cut: 0.15, heal: 0.2, tick: 2, regen: 0.02,
      atk: 0.15,                                    // 10월 26일 사용자 요청 — 축복 동안 주는 피해 +15%(결투 · PvP 는 ADV.pvpBonusMax 안에서)   // 40초 동안 합 60%(바로 20% + 2% × 20번). 쿨타임이 지속보다 길어 늘 켜 두지는 못한다
      // 결투 · 사냥터 PvP 에서는 나에게만 건다. 받는 피해 감소는 기사 cap(70%) 안에서 다른 감소와 곱해 합친다
    },
    passive: {
      name: "은총", note: "평타가 맞으면 둘레에서 체력이 가장 모자란 사람(나 포함)을 최대 체력의 2% 회복(1초에 한 번)",
      r: 400, heal: 0.02, gap: 1,
    },
    // 치유 평타 — 전환 키(기본 V)로 평타를 치유로 바꾼다. 사거리 안에서 체력이 가장 모자란 사람(나 포함)에게 빛 구슬, 최대 체력의 heal 만큼.
    // 다친 사람이 없으면 나가지 않는다. 결투장에서는 쓰지 않는다(공격 평타). 사냥터 PvP 를 켰으면 나에게만
    healShot: { heal: 0.03, fly: 0.22, color: "#fff0b0" },
    // 시험 동안은 수호의 축복(Z)을 쓸 수 있다(은총은 없다). 축복으로 실제 회복한 체력(나 · 다른 사람 모두)을 unit 마다 1 — 넘치는 회복은 세지 않는다
    trial: { name: "치유 시험", note: "시험 동안 쓸 수 있는 수호의 축복(Z)으로 나와 다른 사람의 체력을 모두 3만 회복한다", n: 30, unit: 1000, skill: 1 },
  },
  {
    // 10월 30일 사용자 요청 — 검사의 셋째 전직. 체력이 낮고 빠르다 · 오래 치기보다 한 방
    id: "assassin", job: "warrior", line: "special", name: "암살자", weapon: "단검",
    note: "단검을 든다 · 사라졌다가 등 뒤에서 한 방에 끝낸다",
    active: {
      // 지정 불가 — ut 초 동안 사라진다(어떤 공격 · 상태이상도 닿지 않고 몹이 놓친다). 총사 속사(0.8초) 같은 연사를 통째로 피할 만큼.
      // 사라진 뒤 at 초에 reach 안에서 마우스 포인터에 가장 가까운 적(포인터가 없으면 나에게 가장 가까운 적) 등 뒤(behind)에 나타나 한 방(mul). 적이 없으면 겨눈 쪽으로 dash 만큼 빠져나간다
      name: "그림자 일섬", note: "1초 동안 지정 불가(모든 공격 · 상태이상을 피하고 몹이 놓친다) · 마우스 포인터에 가장 가까운 적 등 뒤로 순간 이동해 한 방에 벤다 · 적이 없으면 포인터 쪽으로 빠져나간다",
      cd: 11, dmg: "str", ut: 1, at: 0.3, reach: 340, behind: 46, mul: 7.2, stun: 0.3, dash: 260,
    },
    passive: {
      // 첫 일격 — 이 적을 gap 초 동안 치지 않았으면 다음 한 대 +bonus. 대신 평타는 basic 배(오래 치는 피해는 낮게)
      name: "급소 노리기", note: "한동안(3초) 치지 않은 적에게 주는 첫 일격 피해 +50% · 평타 피해는 15% 낮다 · 그림자 일섬 뒤 3초 동안 엘프만큼 빨라진다",
      gap: 3, bonus: 0.5, basic: 0.85, rushT: 3,
    },
    // 시험 동안은 그림자 일섬(Z)을 쓸 수 있다. 그림자 일섬 한 방으로 160레벨 이상 적을 잡은 수
    trial: { name: "암살 시험", note: "시험 동안 쓸 수 있는 그림자 일섬(Z)으로 160레벨 이상 적을 20마리 잡는다", n: 20, skill: 1 },
  },
  {
    // 10월 30일 사용자 요청 — 궁수의 셋째 전직. 가장 빠르고 체력 · 방어는 낮지만 체력이 빨리 찬다
    id: "elf", job: "archer", line: "special", name: "엘프", weapon: "숲의 장궁",
    note: "장궁을 든다 · 바람처럼 달리며 쏘고 금방 회복한다",
    active: {
      // 앞 부채꼴로 n 발(반각 spread) — 저마다 한 줄로 꿰뚫는다(len · width · mul). 쏜 뒤 wind 초 동안 걷는 속도 +windSpd
      name: "숲바람 화살", note: "앞으로 바람 화살 다섯 발을 부채꼴로 쏜다 · 저마다 꿰뚫는다 · 쏜 뒤 4초 동안 더 빨라진다",
      cd: 9, dmg: "str", n: 5, spread: 0.32, len: 560, width: 34, mul: 1.5, wind: 4, windSpd: 0.15,
    },
    passive: {
      name: "숲의 숨결", note: "싸우는 중에도 1초마다 최대 체력 1.2% 회복 · 맞지 않고 쉬면 회복이 두 배",
      regen: 0.012, calm: 2,
    },
    // 160레벨 이상 몹을 n 마리 잡는 동안 한 대도 맞지 않는다 — 맞으면 0 으로(연속)
    trial: { name: "바람 걸음 시험", note: "160레벨 이상 몬스터를 15마리 잡는 동안 한 대도 맞지 않는다 · 맞으면 처음부터", n: 15, streak: 1 },
  },
];

/* 10월 30일 사용자 요청 — 전직마다 몸(체력 · 걷는 속도 · 받는 피해 · 회복). 1 이 보통.
   엘프가 가장 빠르고, 암살자는 평소 그보다 조금 느리다가 그림자 일섬 뒤(급소 노리기 rushT 초) 엘프만큼 빨라진다 — 그보다 빠르지는 않다 */
export const ADV_BODY = {
  assassin: { hp: 0.78, spd: 1.2 },                 // 검사 계열(검투사 · 기사)보다 체력 22% 낮게
  elf: { hp: 0.8, spd: 1.3, take: 1.12 },           // 체력 20% 낮고 받는 피해 12% 많다(방어력이 낮다)
};
export const ADV_SPD_MAX = ADV_BODY.elf.spd;        // 암살자가 빨라져도 이 배율까지(엘프 속도)
// 목록 시험(list)은 종류마다 each 개를 채운 합이 n
ADV_CLASSES.forEach((c) => { if (c.trial.list) c.trial.n = c.trial.list.length * c.trial.each; });
export const ADV_BY_ID = Object.fromEntries(ADV_CLASSES.map((c) => [c.id, c]));
export const advForJob = (job) => ADV_CLASSES.filter((c) => c.job === job);
// 저장된 값 거르기 — 없는 전직이면 ""
export const cleanAdvClass = (v) => (typeof v === "string" && ADV_BY_ID[v] ? v : "");
// { c 시험 전직, n 진행, v 시험 판, m 목록 시험의 종류마다 모은 수 } — 판이 다르면 진행을 처음으로
export function cleanAdvQ(q) {
  if (!q || typeof q !== "object" || !ADV_BY_ID[q.c]) return null;
  const T = ADV_BY_ID[q.c].trial, old = q.v !== ADV.trialVer;
  if (T.list) {
    const m = T.list.map((_, i) => (old ? 0 : Math.max(0, Math.min(T.each, Math.floor(Number(Array.isArray(q.m) ? q.m[i] : 0) || 0)))));
    return { c: q.c, n: m.reduce((s, x) => s + x, 0), v: ADV.trialVer, m };
  }
  const out = { c: q.c, n: old ? 0 : Math.max(0, Math.min(T.n, Math.floor(Number(q.n) || 0))), v: ADV.trialVer };
  if (T.unit) out.r = old ? 0 : Math.max(0, Math.min(T.unit - 1, Math.floor(Number(q.r) || 0)));   // 치유사 — 한 칸(unit)이 안 된 남은 치유량
  return out;
}
// 치유사 시험의 지금 치유량 — 칸 수 × unit + 남은 몫
export const healDone = (T, q) => Math.min(T.n * T.unit, (q ? q.n : 0) * T.unit + ((q && q.r) || 0));
// 시험 진행 글 — 창 · 알림이 같이 쓴다
export function trialText(c, q) {
  const T = c.trial, n = Math.min(T.n, q ? q.n : 0);
  if (c.id === "gladiator") return `시험 레벨 ${T.lv0 + n}/${T.lv0 + T.n}`;
  if (c.id === "archmage") {
    const lv = T.lv0 + Math.floor(n / T.per), top = T.lv0 + T.n / T.per;
    return lv >= top ? `시험 레벨 ${top}/${top}` : `시험 레벨 ${lv}/${top} · 다음까지 ${T.per - (n % T.per)}마리`;
  }
  if (c.id === "knight") return `${n}/${T.n}대`;
  if (c.id === "marksman") return `연속 ${n}/${T.n}번`;
  if (c.id === "gunner") return `${n}/${T.list.length}종`;
  if (c.id === "summoner") return `${n}/${T.n}개`;
  if (c.id === "healer") return `회복 ${healDone(T, q).toLocaleString()}/${(T.n * T.unit).toLocaleString()}`;
  if (c.id === "assassin") return `${n}/${T.n}마리`;
  if (c.id === "elf") return `연속 ${n}/${T.n}마리`;
  return `${n}/${T.n}`;
}

/* 전직 추가 스탯 — 전직을 확정하면 스탯 값에 더한다(찍은 포인트와 별개 · 스탯 창에 초록 몫으로 보인다, shop.js extraStat).
   전직마다 포인트로 따져 약 40점어치(물리력 · 마법력 2 · 체력 15 · 치명타 0.5% · 치명타 피해 1% 가 1점). 10월 26일 처음 넣음 */
export const ADV_BONUS = {
  gladiator: { str: 60, cdmg: 10 },   // 검투사 — 공격 · 콤보
  knight: { hp: 450, str: 20 },       // 기사 — 체력(방패로 버틴다)
  marksman: { crit: 10, cdmg: 20 },   // 명사수 — 치명타
  gunner: { str: 40, crit: 10 },      // 총사 — 공격 · 치명타
  archmage: { int: 80 },              // 마도사 — 마법력
  summoner: { int: 40, hp: 300 },     // 소환술사 — 마법력 · 체력(정령과 버틴다)
  healer: { int: 30, hp: 375 },       // 치유사 — 체력을 조금 더(앞에서 버티며 치유한다)
  assassin: { str: 40, cdmg: 20 },    // 암살자 — 한 방(치명타 피해)
  elf: { str: 40, crit: 10 },         // 엘프 — 공격 · 치명타(체력은 몸 배율로 낮다)
};
// 전직할 때 연출(adv-up.webp 6칸) — life 초 동안 차례로, w 는 맵에서 그리는 한 칸 폭, foot 은 칸 위에서 땅(마법진 가운데)까지의 몫
export const ADV_UP = { life: 2.4, w: 330, foot: 0.72, alpha: 0.7 };   // alpha — 밝은 광장 바닥 위에서 캐릭터가 하얗게 묻히지 않게 빛을 덜 더한다
// 축복 받은 사람 둘레 고리(adv-bless.webp 6칸) — fps 초당 칸 · w 맵에서 한 칸 폭 · foot 칸 위에서 발밑까지의 몫 · alpha 밝기 · fade 끝나기 전 흐려지는 초
export const ADV_BLESS = { fps: 8, w: 130, foot: 0.69, alpha: 0.55, fade: 2 };   // alpha — 둥근 막이 캐릭터 위에 겹쳐 그려져 얼굴 · 옷이 하얗게 묻히지 않게 낮췄다

/* 그림 — 생성한 투명 아틀라스(design/advance 원본 · 2026-10-25). 칸 크기는 원본 픽셀
   fx: 4열 × 3행(176px) — 0 붉은 검격 · 1 붉은 충격파 · 2 금빛 방패 · 3 육각 충격파 · 4 청록 화살 · 5 청록 섬광 · 6 총구 화염 · 7 탄환과 탄피 · 8 흰 마법진 · 9 푸른 소환진 · 10 마력 폭발
   spirits: 3열 × 2행(160px) — ELEMS 차례(화염 · 서리 · 번개 · 독 · 부식 · 중력)
   items: 5열 × 1행(192px) — 0 쌍권총 · 1 기사 방패 · 2 소환서 · 3 · 4 권총 한 자루씩 */
export const ADV_ART = {
  fx: { src: "/assets/game/rpg/advance/adv-fx.webp", cols: 4, cell: 176 },
  spirits: { src: "/assets/game/rpg/advance/adv-spirits.webp", cols: 3, cell: 160 },
  items: { src: "/assets/game/rpg/advance/adv-items.webp", cols: 5, cell: 192 },
  up: { src: "/assets/game/rpg/advance/adv-up.webp", cols: 3, cell: 384 },   // 전직 연출 3열 × 2행 — 검은 바탕이라 빛을 더하듯(lighter) 그린다
  bless: { src: "/assets/game/rpg/advance/adv-bless.webp", cols: 3, cell: 384 },   // 치유사 축복 둘레 3열 × 2행 고리 — 검은 바탕 · lighter
  // 암살자 · 엘프 · 총사 장전(10월 31일, Codex 생성 4열 × 1행 · 검은 바탕 lighter) — 0 그림자 연기 · 1 보랏빛 단검 초승달(오른쪽으로 볼록) · 2 바람 화살(오른쪽으로) · 3 장전 고리
  fx2: { src: "/assets/game/rpg/advance/adv-fx2.webp", cols: 4, cell: 256 },
  FX: { slash: 0, shock: 1, shield: 2, hex: 3, arrow: 4, flash: 5, muzzle: 6, bullet: 7, circle: 8, summon: 9, burst: 10 },
  ITEM: { guns: 0, shield: 1, book: 2, pistol: 3, pistol2: 4 },
  FX2: { smoke: 0, slash: 1, wind: 2, reload: 3 },
};

/* ── 전직 숙련도 — 전직한 뒤에도 자라는 목표(10월 26일 추가) ─────────────────
   전직을 확정하면 1단계. 전직한 뒤 160레벨 이상 몹 · 보스를 잡으면 숙련도가 쌓인다(방장만 셈 · 기록 advM 에 영구 저장).
   몹을 친 사람 가운데 같은 맵에 있어 보상을 받는 사람이 저마다 받는다(killMob 의 got). 허수아비 · 훈련장 · PvP 는 세지 않는다.
   측정(tools/advance.test.mjs 와 같은 셈 · 10월 26일): 200~300레벨은 한 레벨에 몹 30~44마리, 400레벨부터 14~22마리.
   평타만으로 한 마리 6~8초 · 스킬과 범위를 섞으면 1분에 15마리 안팎. 사냥터 보스는 일반 몹 체력 · 경험치의 약 15배.
   → 2단계 300(약 20~30분 사냥 · 200레벨대 10레벨 남짓) · 3단계 1,500(약 2시간) · 4단계 4,500(약 5~6시간 · 오래 두고 노리는 목표) */
export const ADV_MASTERY = {
  pts: [0, 300, 1500, 4500],   // 1~4단계에 필요한 누적 숙련도
  mob: 1,                       // 일반 몹 한 마리
  boss: 20,                     // 사냥터 보스 — 일반 몹보다 크게(체력 · 경험치는 약 15배, 나오는 수는 맵마다 둘)
  dgBoss: 30,                   // 던전 보스
  raid: 60,                     // 월드보스 · 길드 토벌 보스
  minLv: 160,                   // 이보다 낮은 몹은 세지 않는다(던전 · 월드 · 길드 맵은 레벨과 상관없이) — 낮은 사냥터 반복 사냥 막기
  perMin: 120,                  // 1분에 얻는 최대(넘는 몫은 버린다) — 빈 사냥터를 도는 반복 사냥 · 이상한 반복을 막는다
};
export const MASTERY_MAX = ADV_MASTERY.pts[ADV_MASTERY.pts.length - 1];
// 저장된 숙련도 거르기 — 정수 0 ~ 최대
export const cleanAdvM = (v) => Math.max(0, Math.min(MASTERY_MAX, Math.floor(Number(v) || 0)));
// 숙련도 단계 1~4
export const masteryLv = (p) => { const v = cleanAdvM(p); let lv = 1; ADV_MASTERY.pts.forEach((need, i) => { if (v >= need) lv = i + 1; }); return lv; };

/* ── 전직 전투 특성 — 숙련도 2단계에 열리고 3 · 4단계에 조금씩 세진다(배열은 [2단계, 3단계, 4단계]) ─────────────
   새 액티브 칸 · 키 없이 기존 패시브 · 직업 스킬과 이어진다. 판정은 방장만(advance.js), 그림은 advArt.js.
   추가 피해는 모두 패시브가 낳은 피해(noProc)라 원소 · 무기 패시브 · 전직 패시브를 다시 부르지 않는다(무한 반복 없음).
   결투 · 사냥터 PvP 는 기존 한도를 그대로 거친다 — 스킬 한 번 12% · 평타 3% · 전직 패시브 추가 피해 +15% */
export const ADV_TRAITS = {
  gladiator: {
    name: "연계 참격", color: "#ff7a6a",
    // 서로 다른 스킬 need 개(직업 R · 일반 1 · 2 · 궁극기 Shift · 무기 X · 삼연참 Z)를 win 초 안에 맞히면 마지막으로 맞힌 적 둘레를 벤다
    need: 2, win: [3, 4, 4], mul: [1.2, 1.2, 1.5], r: [110, 110, 140], icd: [5, 4.5, 4], delay: 0.1,
    text: (v) => `서로 다른 스킬 ${v.need}개를 ${v.win}초 안에 맞히면 마지막으로 맞힌 적 둘레(${v.r})를 저절로 벤다 · 스킬 기본 피해 ${v.mul}배 · 대기 ${v.icd}초 · 연계 참격은 투지 · 다른 연계를 부르지 않는다`,
    up3: "연계 시간 3초 → 4초 · 대기 5초 → 4.5초", up4: "피해 1.2배 → 1.5배 · 넓이 110 → 140 · 대기 4초 · 붉은 이중 검격",
  },
  knight: {
    name: "수호의 방패", color: "#ffd873",
    // 철벽 방어 중 맞으면 방패 충격파 — 일반 몹을 taunt 초 도발. 반격(1.8배)에 맞은 적은 충격파 피해를 받지 않는다(겹치지 않게)
    r: [230, 270, 270], taunt: [3, 3, 4], icd: [4, 3.5, 3], mul: 0.5,
    text: (v) => `철벽 방어 중 맞으면 반격과 함께 방패 충격파(${v.r}) · 맞은 일반 몹이 ${v.taunt}초 동안 기사만 노린다 · 반격에 맞지 않은 적에게 스킬 기본 피해 ${v.mul}배 · 대기 ${v.icd}초 · 보스 · 사람은 도발하지 않는다`,
    up3: "충격파 넓이 230 → 270 · 대기 4초 → 3.5초", up4: "도발 3초 → 4초 · 대기 3초 · 금빛 이중 충격파",
  },
  marksman: {
    name: "정밀 사격", color: "#7ff3e4",
    // 같은 적을 3번 이어 맞히면(약점 포착과 같은 셈) 준비 — 다음 평타가 첫 적에게 first 배, 뒤로 len 만큼 꿰뚫어 pierce 배
    first: [1.4, 1.4, 1.6], pierce: [0.7, 0.7, 0.8], len: [260, 340, 340], width: 40, icd: [4, 3.5, 3],
    text: (v) => `같은 적을 3번 이어 맞히면 정밀 사격 준비 · 다음 평타가 첫 적에게 평타 ${v.first}배 · 뒤로 ${v.len}까지 꿰뚫어 평타 ${v.pierce}배 · 대기 ${v.icd}초 · 첫 적에게는 약점 노출 · 표식 추가 피해가 겹치지 않는다`,
    up3: "관통 길이 260 → 340 · 대기 4초 → 3.5초", up4: "첫 적 1.4배 → 1.6배 · 관통 0.7배 → 0.8배 · 대기 3초 · 청록 관통 궤적",
  },
  gunner: {
    name: "기동 사격", color: "#ffb45a",
    // 쌍권총을 든 채 후퇴 사격을 쓰면 dur 초 — 평타 every 번마다 추가 탄환(평타의 mul 배 · 탄도 숙련 몫은 받고 쌓지는 않는다)
    dur: [3, 4, 5], every: [3, 3, 2], mul: 0.5, rng: 1.25,
    text: (v) => `쌍권총을 든 채 후퇴 사격(직업 스킬)을 쓰면 ${v.dur}초 동안 기동 사격 · 평타 ${v.every}번마다 추가 탄환 1발(평타 ${v.mul}배 · 원소 · 다른 추가 타격 없음) · 그동안 자동 평타 사거리 ${v.rng}배라 물러나며 쏘아도 끊기지 않는다`,
    up3: "지속 3초 → 4초", up4: "지속 5초 · 평타 2번마다 추가 탄환 · 탄피가 튀는 탄환",
  },
  archmage: {
    name: "원소 공명", color: "#c9b6ff",
    // 원소 구체 · 연쇄 번개가 맞으면 공명 1(스킬 한 번에 하나 · 최대 max) — 마력 폭발이 모두 써서 원소마다 효과(스택 수만큼 세진다)
    max: 3, dur: [8, 12, 12], pw: [1, 1, 1.3],
    flame: 0.45,      // 작은 추가 폭발 — 공명 하나에 스킬 기본 피해 0.45배(폭발 넓이의 60%)
    frost: 1.5,       // 둘레(폭발 넓이 1.5배) 일반 몹 둔화 — 공명 하나에 1.5초(보스는 절반)
    bolt: 0.4,        // 가까운 다른 적 둘에게 번개 — 공명 하나에 0.4배씩
    poison: 0.25,     // 폭발 자리 적에게 독 두 번 — 공명 하나에 0.25배씩(지속 피해라 패시브 없음)
    corrode: 0.05,    // 방어 약화 — 받는 피해 +15% + 공명 하나에 5%(보스는 절반) · 3 + 2초 × 공명
    gravity: 0.25,    // 일반 몹을 폭발 가운데로 — 공명 하나에 25%(최대 80%) · 보스는 끌지 않는다
    text: (v) => `원소 구체 · 연쇄 번개가 맞으면 공명 1(스킬 한 번에 하나 · 최대 3 · ${v.dur}초) · 마력 폭발이 공명을 모두 써서 원소마다 추가 효과 — 화염 작은 추가 폭발 · 서리 둔화 확산 · 번개 가까운 적 둘 연쇄 · 독 짧은 추가 독 · 부식 방어 약화 · 중력 일반 몹 끌어당김${v.pw > 1 ? ` · 효과 ${v.pw}배` : ""}`,
    up3: "공명 유지 8초 → 12초", up4: "원소 효과 1.3배 · 공명 구슬이 머리 위를 돈다",
  },
  summoner: {
    name: "정령 협동 공격", color: "#9fc8ff",
    // 원소 구체 · 연쇄 번개가 맞으면 함께 있는 정령이 한꺼번에 — 정령 하나에 마법 스킬 기본 피해 per 배를 한 번에 합쳐 친다
    per: [0.15, 0.15, 0.18], icd: [5, 4, 4],
    text: (v) => `원소 구체 · 연쇄 번개가 맞으면 정령이 모두 그 적을 함께 친다 · 정령 하나에 마법 스킬 기본 피해 ${v.per}배(10마리 ${Math.round(v.per * 10 * 100) / 100}배)를 한 번에 합쳐 · 대기 ${v.icd}초 · 정령이 없으면 나가지 않는다 · 영혼 연결을 부르지 않는다`,
    up3: "대기 5초 → 4초", up4: "정령 하나 0.15배 → 0.18배 · 정령마다 이어지는 빛줄기",
  },
  healer: {
    name: "긴급 보호막", color: "#fff0b0",
    // 같은 파티(나 포함)가 맞아 체력 hp 이하가 되면 곁(r)의 치유사가 저절로 보호막 — 받는 사람마다 cd 초에 한 번(치유사 여럿이어도 하나)
    hp: 0.3, r: [350, 420, 420], amt: [0.15, 0.15, 0.2], dur: [5, 5, 6], cd: [30, 30, 25],
    text: (v) => `같은 파티원(나 포함)이 맞아 체력 30% 이하가 되면 ${v.r} 안의 치유사가 저절로 최대 체력 ${Math.round(v.amt * 100)}% 보호막(${v.dur}초) · 받는 사람마다 ${v.cd}초에 한 번 · 치유사가 여럿이어도 겹치지 않는다 · 이미 더 큰 보호막이 있으면 나가지 않는다 · 결투 · PvP 는 나에게만`,
    up3: "거리 350 → 420", up4: "보호막 15% → 20% · 6초 · 대기 25초 · 금빛 방벽",
  },
  assassin: {
    name: "그림자 회수", color: "#c9a4e8",
    // 그림자 일섬 한 방으로 적을 쓰러뜨리면 그림자 일섬 대기 시간을 refund 몫 돌려받는다(보스 · 사람은 쓰러뜨려도 절반)
    refund: [0.4, 0.5, 0.6],
    text: (v) => `그림자 일섬으로 적을 쓰러뜨리면 대기 시간 ${Math.round(v.refund * 100)}%를 돌려받는다 · 보스 · 사람은 절반`,
    up3: "돌려받는 몫 40% → 50%", up4: "돌려받는 몫 60% · 보랏빛 잔상",
  },
  elf: {
    name: "바람 화살", color: "#b8e6a0",
    // 평타 every 번마다 바람 화살 한 발이 더 나가 첫 적을 꿰뚫는다(평타 mul 배 · 길이 len · 원소 · 다른 추가 타격 없음)
    every: [5, 4, 4], mul: [0.6, 0.6, 0.8], len: 420, width: 30,
    text: (v) => `평타 ${v.every}번마다 바람 화살 한 발이 더 나가 한 줄(${v.len})을 꿰뚫는다 · 평타 ${v.mul}배 · 원소 · 다른 추가 타격 없음`,
    up3: "평타 5번마다 → 4번마다", up4: "바람 화살 0.6배 → 0.8배 · 초록 바람 궤적",
  },
};
// 지금 단계(2~4)의 특성 값 — 배열이면 그 단계 몫
export function traitAt(cid, lv) {
  const T = ADV_TRAITS[cid];
  if (!T || lv < 2) return null;
  const i = Math.min(2, lv - 2), out = {};
  Object.entries(T).forEach(([k, v]) => { out[k] = Array.isArray(v) ? v[i] : v; });
  return out;
}
