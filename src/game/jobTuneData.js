/* 10월 30일 직업 능력 조정 — 사용자 요청(기사 · 검사 · 마법사 · 궁수). 숫자는 여기 한 곳만 고친다.
   규칙은 rpg.js(hurtHero · skillTake · hitMob · hitFoe · heroRange)와 advance.js(무효화 방어막) */
export const JOB_TUNE = {
  // 검사 기본 방어력 — 검사 직업(검투사 · 기사 포함)이 받는 모든 피해를 늘 3% 줄인다
  warrior: { cut: 0.03 },
  knight: {
    cut: 0.1,             // 기사 기본 피해 감소 10%(철벽 방어 · 불굴의 의지와 곱해 합치고 기사 상한 70% 안)
    magicRes: 0.1,        // 마법 저항력 — 마법사 · 마법을 쓰는 몹에게 받는 피해 10% 더 감소
    physRes: 0.1,         // 물리 저항력 — 검사 · 궁수 · 그 밖의 몹에게 받는 피해 10% 더 감소
    // 무효화 방어막 — 한 대를 통째로 막는다. 깨진 뒤 regen 초 동안 피해를 받지 않으면 다시 생긴다
    nullShield: { name: "무효화 방어막", regen: 20,
      note: "피해 한 번을 통째로 막는 방어막 · 깨진 뒤 20초 동안 피해를 받지 않으면 다시 생긴다" },
  },
  // 마법사 최대 체력 비례 피해 — 한 대마다 맞은 대상 최대 체력의 pct 만큼 더한다.
  // 보스처럼 체력이 아주 큰 대상에서 끝없이 커지지 않게 그 한 대 피해의 cap 배까지만
  mage: { pct: 0.01, cap: 0.25 },
  archer: {
    dmg: 0.9,             // 궁수 피해 10% 감소(몹 · 사람 모두)
    range: 1.15,          // 사거리 15% 증가(평타 · 스킬이 닿는 거리)
    vsArmor: 0.85,        // 방어력 있는 사람(방어구 감소 · 검사 기본 방어력)에게 피해 15% 더 감소
    gunnerFull: true,     // 10월 31일 사용자 요청 "총사 딜 원래대로" — 총사(전직)는 위 두 감소를 받지 않는다. 대신 장전이 생겼다(advData.js reload)
  },
};

// 마법으로 치는 몹 — 이 몹에게 맞으면 마법 저항력, 그 밖은 물리 저항력
export const MAGIC_MOBS = ["necro", "chimera", "fspirit", "ifrit", "voidmage", "fallen"];

// 받는 피해의 종류 — source 는 몹(type) · 때린 사람({ hero }) · 월드보스({ boss })
export const damageKind = (source) => {
  if (source?.hero) return source.hero.job === "mage" ? "magic" : "phys";
  if (source?.magic || MAGIC_MOBS.includes(source?.type)) return "magic";
  return "phys";
};

// 직업 · 전직이 늘 갖는 받는 피해 감소(0~1). advClass 는 기본 직업이 맞을 때만 넘긴다
export function classCut(h, advId, kind) {
  let keep = 1;
  if (h?.job === "warrior") keep *= 1 - JOB_TUNE.warrior.cut;
  if (advId === "knight") {
    const K = JOB_TUNE.knight;
    keep *= (1 - K.cut) * (1 - (kind === "magic" ? K.magicRes : K.physRes));
  }
  return 1 - keep;
}

// 마법사 최대 체력 비례 추가 피해 — dmg 는 이번 한 대 피해, max 는 맞은 대상 최대 체력
export const mageHpBonus = (dmg, max) => Math.min((max || 0) * JOB_TUNE.mage.pct, dmg * JOB_TUNE.mage.cap);
