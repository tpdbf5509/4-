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
export const ADV_IDS = ["gladiator", "knight", "marksman", "gunner", "archmage", "summoner"];

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
      name: "철벽 방어", note: "5초 동안 받는 피해 35% 감소 · 그동안 맞으면 둘레 적에게 반격(최대 4번 · 0.5초 간격)",
      cd: 20, dmg: "str", dur: 5, cut: 0.35, r: 160, mul: 1.8, max: 4, gap: 0.5,
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
      name: "약점 포착", note: "같은 적을 세 번 이어 맞히면 약점 노출 · 표식이나 노출된 적에게 다음 공격 피해 +30%",
      need: 3, bonus: 0.3,
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
];
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
  return { c: q.c, n: old ? 0 : Math.max(0, Math.min(T.n, Math.floor(Number(q.n) || 0))), v: ADV.trialVer };
}
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
};
// 전직할 때 연출(adv-up.webp 6칸) — life 초 동안 차례로, w 는 맵에서 그리는 한 칸 폭, foot 은 칸 위에서 땅(마법진 가운데)까지의 몫
export const ADV_UP = { life: 2.4, w: 330, foot: 0.72, alpha: 0.7 };   // alpha — 밝은 광장 바닥 위에서 캐릭터가 하얗게 묻히지 않게 빛을 덜 더한다

/* 그림 — 생성한 투명 아틀라스(design/advance 원본 · 2026-10-25). 칸 크기는 원본 픽셀
   fx: 4열 × 3행(176px) — 0 붉은 검격 · 1 붉은 충격파 · 2 금빛 방패 · 3 육각 충격파 · 4 청록 화살 · 5 청록 섬광 · 6 총구 화염 · 7 탄환과 탄피 · 8 흰 마법진 · 9 푸른 소환진 · 10 마력 폭발
   spirits: 3열 × 2행(160px) — ELEMS 차례(화염 · 서리 · 번개 · 독 · 부식 · 중력)
   items: 5열 × 1행(192px) — 0 쌍권총 · 1 기사 방패 · 2 소환서 · 3 · 4 권총 한 자루씩 */
export const ADV_ART = {
  fx: { src: "/assets/game/rpg/advance/adv-fx.webp", cols: 4, cell: 176 },
  spirits: { src: "/assets/game/rpg/advance/adv-spirits.webp", cols: 3, cell: 160 },
  items: { src: "/assets/game/rpg/advance/adv-items.webp", cols: 5, cell: 192 },
  up: { src: "/assets/game/rpg/advance/adv-up.webp", cols: 3, cell: 384 },   // 전직 연출 3열 × 2행 — 검은 바탕이라 빛을 더하듯(lighter) 그린다
  FX: { slash: 0, shock: 1, shield: 2, hex: 3, arrow: 4, flash: 5, muzzle: 6, bullet: 7, circle: 8, summon: 9, burst: 10 },
  ITEM: { guns: 0, shield: 1, book: 2, pistol: 3, pistol2: 4 },
};
