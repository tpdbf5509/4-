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
    trial: { name: "검술 콤보 시험", note: "평타를 맞힌 뒤 3초 안에 직업 스킬(R)을 맞힌다 · 160레벨 이상 몹", n: 20, win: 3 },
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
    trial: { name: "공격 방어와 생존 시험", note: "160레벨 이상 사냥터 · 던전에서 공격을 40번 받아 낸다 · 쓰러지면 처음부터", n: 40 },
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
    trial: { name: "움직이는 표적 시험", note: "움직이는 160레벨 이상 몹을 180 거리 밖에서 평타로 40번 맞힌다", n: 40, far: 180 },
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
    trial: { name: "이동 사격 시험", note: "걸으면서 160레벨 이상 몹을 평타로 40번 맞힌다", n: 40 },
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
    trial: { name: "마력 제어 시험", note: "스킬 한 번으로 160레벨 이상 몹 셋 이상을 맞힌다 · 15번", n: 15, many: 3 },
  },
  {
    id: "summoner", job: "mage", line: "special", name: "소환술사", weapon: "소환서",
    note: "소환서를 든다 · 원소 정령과 함께 싸운다",
    gear: "adv_grim",
    active: {
      name: "정령 소환", note: "지금 원소의 정령 하나를 20초 동안 부른다 · 둘레 적을 스스로 공격 · 다시 쓰면 새로 부른다",
      cd: 16, dmg: "int", life: 20, range: 300, every: 1.2, mul: 0.7, fly: 0.22,   // 초당 약 0.58배
    },
    passive: {
      name: "영혼 연결", note: "나와 정령이 2초 안에 같은 적을 치면 영혼 피해(2초에 한 번) · 정령이 없으면 없다",
      win: 2, gap: 2, mul: 0.6,
    },
    // 시험용 임시 정령 — 시험 중 160레벨 이상 사냥터 · 던전에서 저절로 따라온다. 피해는 정령의 trialMul 몫
    trial: { name: "정령 협동 시험", note: "시험 중 따라오는 임시 정령과 함께 160레벨 이상 몹을 15마리 잡는다(정령이 친 몹)", n: 15, trialMul: 0.5 },
  },
];
export const ADV_BY_ID = Object.fromEntries(ADV_CLASSES.map((c) => [c.id, c]));
export const advForJob = (job) => ADV_CLASSES.filter((c) => c.job === job);
// 저장된 값 거르기 — 없는 전직이면 ""
export const cleanAdvClass = (v) => (typeof v === "string" && ADV_BY_ID[v] ? v : "");
export function cleanAdvQ(q) {
  if (!q || typeof q !== "object" || !ADV_BY_ID[q.c]) return null;
  return { c: q.c, n: Math.max(0, Math.min(ADV_BY_ID[q.c].trial.n, Math.floor(Number(q.n) || 0))) };
}

/* 그림 — 생성한 투명 아틀라스(design/advance 원본 · 2026-10-25). 칸 크기는 원본 픽셀
   fx: 4열 × 3행(176px) — 0 붉은 검격 · 1 붉은 충격파 · 2 금빛 방패 · 3 육각 충격파 · 4 청록 화살 · 5 청록 섬광 · 6 총구 화염 · 7 탄환과 탄피 · 8 흰 마법진 · 9 푸른 소환진 · 10 마력 폭발
   spirits: 3열 × 2행(160px) — ELEMS 차례(화염 · 서리 · 번개 · 독 · 부식 · 중력)
   items: 5열 × 1행(192px) — 0 쌍권총 · 1 기사 방패 · 2 소환서 · 3 · 4 권총 한 자루씩 */
export const ADV_ART = {
  fx: { src: "/assets/game/rpg/advance/adv-fx.webp", cols: 4, cell: 176 },
  spirits: { src: "/assets/game/rpg/advance/adv-spirits.webp", cols: 3, cell: 160 },
  items: { src: "/assets/game/rpg/advance/adv-items.webp", cols: 5, cell: 192 },
  FX: { slash: 0, shock: 1, shield: 2, hex: 3, arrow: 4, flash: 5, muzzle: 6, bullet: 7, circle: 8, summon: 9, burst: 10 },
  ITEM: { guns: 0, shield: 1, book: 2, pistol: 3, pistol2: 4 },
};
