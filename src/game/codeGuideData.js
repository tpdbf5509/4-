/* 관리 화면(?admin) "코드 가이드" 탭의 내용 — 바꾸고 싶은 숫자가 어느 파일의 어느 이름에 있는지 적은 책.
   now() 는 코드의 지금 값을 그대로 읽어 와서 이 글이 낡지 않는다. 새 항목은 맞는 묶음 끝에 더한다 */
import { RPG, STATS, STAT_MAX, STAT_PER_LV, LV_MAX, JOBS, JOB_DMG, XP_RATE, MOB_HP_EASE, FAR_EASE, MOB_REGEN, DUEL, RPG_SERVER_CAP } from "./rpg.js";
import { JOB_TUNE } from "./jobTuneData.js";
import { SKILL_USE, OFF_HAND } from "./shopData.js";
import { ENHANCE, DROP_ROLL } from "./itemData.js";
import { ADV, ADV_BODY, ADV_BONUS, ADV_BY_ID } from "./advData.js";
import { TOWERS } from "./world.js";

const stat = (id) => STATS.find((s) => s.id === id);
const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const jobs = (k) => JOBS.map((j) => `${j.name} ${j[k]}`).join(" · ");

export const GUIDE_HOW = [
  "1. 아래에서 바꾸고 싶은 항목을 찾습니다. 검색 칸에 \"치명타\" \"속도\" 처럼 쳐도 됩니다.",
  "2. 적힌 파일을 열고 적힌 이름(Ctrl+F 로 찾기)을 찾아 숫자만 바꿉니다. 이름 앞 · 뒤 글자는 건드리지 않습니다.",
  "3. 저장소에 올리면(push) four-lane 에 자동 배포됩니다. 보통 1~3분 안에 반영됩니다.",
  "4. 게임 안에서 판정하는 숫자는 서버가 쓰므로 배포가 끝난 뒤 다시 접속해야 보입니다.",
  "5. 한 번에 하나씩만 바꾸고 확인합니다. 모르겠으면 Claude 에게 \"이 항목을 이렇게 바꿔 줘\" 라고 하면 됩니다.",
];

export const GUIDE_GROUPS = ["캐릭터 기본", "스탯 · 치명타", "직업", "성장 · 몬스터", "무기 · 강화", "전직", "결투 · 서버", "방어전 탑"];

// g 묶음 · title 이름 · file 파일 · name 코드 속 이름 · now 지금 값 · effect 바꾸면 · ex 예시
export const GUIDE = [
  { g: 0, title: "걷는 속도", file: "src/game/rpg.js", name: "RPG.spd", now: () => RPG.spd,
    effect: "모든 영웅이 걷는 빠르기가 바뀝니다. 클수록 빠릅니다.", ex: "250 → 275 로 바꾸면 10% 빨라집니다." },
  { g: 0, title: "쓰러진 뒤 일어나는 시간", file: "src/game/rpg.js", name: "RPG.down", now: () => `${RPG.down}초`,
    effect: "쓰러지고 광장에서 일어나기까지 걸리는 시간입니다.", ex: "5 → 3 이면 3초 만에 일어납니다." },
  { g: 0, title: "맞지 않을 때 체력 회복", file: "src/game/rpg.js", name: "RPG.calm · RPG.calmRegen", now: () => `${RPG.calm}초 쉬면 초당 ${pct(RPG.calmRegen)}`,
    effect: "calm 은 맞지 않고 쉬어야 하는 시간, calmRegen 은 그때 초당 차오르는 몫(최대 체력 대비)입니다.", ex: "calmRegen 0.03 → 0.05 이면 쉴 때 더 빨리 찹니다." },

  { g: 1, title: "스탯 1포인트당 효과", file: "src/game/rpg.js", name: "STATS 표의 per", now: () => STATS.map((s) => `${s.name} ${s.per}`).join(" · "),
    effect: "물리력 · 마법력(공격력), 체력, 치명타 확률, 치명타 피해를 포인트 하나 올릴 때 얼마나 오르는지 정합니다.", ex: "물리력 per 3 → 4 이면 물리력 한 칸이 공격력 +4 가 됩니다." },
  { g: 1, title: "최대 체력 바탕", file: "src/game/rpg.js", name: "STATS 표 hp 의 base · per", now: () => `기본 ${stat("hp").base} · 포인트당 +${stat("hp").per}`,
    effect: "최대 체력은 (base + 포인트 × per)에 직업 체력 배율 · 방어구 · 전직 배율을 곱해 정해집니다.", ex: "per 22 → 30 이면 체력 스탯 한 칸이 더 큰 체력을 줍니다." },
  { g: 1, title: "공격력 바탕", file: "src/game/rpg.js", name: "STATS 표 str · int 의 base", now: () => `물리력 ${stat("str").base} · 마법력 ${stat("int").base}`,
    effect: "스탯을 하나도 안 찍었을 때의 공격력 바탕입니다.", ex: "10 → 20 이면 초반 공격력이 두 배 가까이 됩니다." },
  { g: 1, title: "치명타 확률", file: "src/game/rpg.js", name: "STATS 표 crit 의 base · per", now: () => `기본 ${stat("crit").base}% · 포인트당 +${stat("crit").per}%`,
    effect: "base 는 스탯 0 일 때 확률(%), per 는 포인트당 오르는 확률입니다.", ex: "base 5 → 10 이면 모두의 치명타가 기본 10% 부터 시작합니다." },
  { g: 1, title: "치명타 피해", file: "src/game/rpg.js", name: "STATS 표 cdmg 의 base · per", now: () => `기본 ${stat("cdmg").base}% · 포인트당 +${stat("cdmg").per}%`,
    effect: "치명타가 터졌을 때 몇 %의 피해를 주는지입니다. 150 이면 1.5배입니다.", ex: "base 150 → 200 이면 치명타가 두 배 피해입니다." },
  { g: 1, title: "스탯 한도 · 레벨당 포인트", file: "src/game/rpg.js", name: "STAT_MAX · STAT_PER_LV", now: () => `한 스탯 최대 ${STAT_MAX} · 레벨당 ${STAT_PER_LV}포인트`,
    effect: "STAT_MAX 는 스탯 하나에 줄 수 있는 포인트 상한, STAT_PER_LV 는 레벨업마다 받는 포인트입니다. 400레벨 이후는 combatRules.js 의 highStatPoints 를 따릅니다.", ex: "STAT_PER_LV 2 → 3 이면 레벨당 포인트가 늘어납니다." },
  { g: 1, title: "최고 레벨", file: "src/game/rpg.js", name: "LV_MAX", now: () => LV_MAX,
    effect: "올릴 수 있는 최고 레벨입니다. 올리면 그 위 사냥터와 경험치 표가 따로 필요합니다. 혼자 바꾸지 말고 Claude 에게 맡기는 편이 안전합니다.", ex: "" },

  { g: 2, title: "직업 평타 피해", file: "src/game/rpg.js", name: "JOBS 표의 dmg", now: () => jobs("dmg"),
    effect: "직업별 평타 한 대의 바탕 피해입니다.", ex: "검사 dmg 34 → 40 이면 검사 평타가 강해집니다." },
  { g: 2, title: "직업 공격 속도", file: "src/game/rpg.js", name: "JOBS 표의 cd", now: () => `${JOBS.map((j) => `${j.name} ${j.cd}초`).join(" · ")} (작을수록 빠름)`,
    effect: "평타 사이의 간격(초)입니다. 작을수록 빠르게 칩니다.", ex: "마법사 cd 1.1 → 0.9 이면 더 자주 쏩니다." },
  { g: 2, title: "직업 사거리", file: "src/game/rpg.js", name: "JOBS 표의 rng", now: () => jobs("rng"),
    effect: "평타가 닿는 거리입니다. 궁수는 아래 직업 조정의 range 배율이 더 곱해집니다.", ex: "검사 rng 72 → 90 이면 더 멀리 벱니다." },
  { g: 2, title: "직업 체력 배율", file: "src/game/rpg.js", name: "JOBS 표의 hp", now: () => jobs("hp"),
    effect: "최대 체력에 곱하는 직업 배율입니다. 1.35 면 체력이 1.35배입니다.", ex: "궁수 hp 0.85 → 1 이면 궁수가 더 튼튼해집니다." },
  { g: 2, title: "직업별 몬스터 피해 배율", file: "src/game/rpg.js", name: "JOB_DMG", now: () => `마법사 ${JOB_DMG.mage} · 궁수 ${JOB_DMG.archer}`,
    effect: "몬스터 · 보스에게 주는 모든 피해에 곱합니다(결투 제외). 1 보다 크면 세지고 작으면 약해집니다.", ex: "mage 1.05 → 1.1 이면 마법사가 5% 더 셉니다." },
  { g: 2, title: "직업 능력 조정(검사 · 기사 · 마법사 · 궁수)", file: "src/game/jobTuneData.js", name: "JOB_TUNE",
    now: () => `검사 방어 ${pct(JOB_TUNE.warrior.cut)} · 기사 피해 감소 ${pct(JOB_TUNE.knight.cut)} · 궁수 피해 ${JOB_TUNE.archer.dmg} · 궁수 사거리 ${JOB_TUNE.archer.range}`,
    effect: "한 파일에서 직업별 방어 · 피해 감소 · 사거리를 고칩니다. 궁수 dmg 는 피해 배율, range 는 사거리 배율입니다.", ex: "archer.range 1.15 → 1.25 이면 궁수 사거리가 더 길어집니다." },
  { g: 2, title: "스킬 기본 피해", file: "src/game/shopData.js", name: "SKILL_USE.base", now: () => SKILL_USE.base,
    effect: "공격 스킬의 바탕 피해입니다. 모든 공격 스킬에 곱해지는 기준이라 영향이 큽니다.", ex: "40 → 48 이면 거의 모든 공격 스킬이 20% 세집니다." },

  { g: 3, title: "몬스터 경험치", file: "src/game/rpg.js", name: "XP_RATE", now: () => XP_RATE,
    effect: "몹을 잡을 때 얻는 경험치에 곱합니다(퀘스트는 그대로). 클수록 레벨이 빨리 오릅니다.", ex: "0.2 → 0.4 이면 경험치가 두 배입니다." },
  { g: 3, title: "몬스터 체력(1~400레벨)", file: "src/game/rpg.js", name: "MOB_HP_EASE", now: () => MOB_HP_EASE,
    effect: "1~400레벨 일반 몹 · 보스 체력에 곱합니다. 작을수록 쉽게 잡습니다.", ex: "0.8 → 0.6 이면 체력이 25% 줄어듭니다." },
  { g: 3, title: "200~400레벨 사냥터 난이도", file: "src/game/rpg.js", name: "FAR_EASE", now: () => `체력 ×${FAR_EASE.hp} · 공격 ×${FAR_EASE.dmg}`,
    effect: "오우거 끝 문 뒤 6개 사냥터 몹의 체력(hp) · 공격력(dmg) 배율입니다.", ex: "dmg 0.75 → 0.5 이면 이 사냥터 몹이 훨씬 약하게 때립니다." },
  { g: 3, title: "몬스터 자동 회복", file: "src/game/rpg.js", name: "MOB_REGEN", now: () => `${MOB_REGEN.calm}초 맞지 않으면 초당 ${pct(MOB_REGEN.rate)}`,
    effect: "맞지 않은 몹이 저절로 체력을 채우는 시간(calm)과 속도(rate)입니다.", ex: "rate 0.08 → 0 이면 도망쳐도 체력이 안 찹니다." },
  { g: 3, title: "몬스터 한 마리 값(체력 · 공격 · 경험치 · 코인)", file: "src/game/rpg.js", name: "MOB 표의 hp · dmg · xp · coin 식", now: () => "몹마다 레벨 식(hp: (lv) => …)",
    effect: "몹 종류마다 레벨에 따른 식이 적혀 있습니다. 식 안의 숫자를 바꾸면 그 몹만 달라집니다.", ex: "늑대 dmg: 12 + 2 * (lv - 10) 의 12 를 15 로 바꾸면 늑대가 더 아프게 뭅니다." },
  { g: 3, title: "보스 재료 개수", file: "src/game/itemData.js", name: "DROP_ROLL", now: () => DROP_ROLL.map(([n, w]) => `${n}개 ${w}%`).join(" · "),
    effect: "보스가 재료를 몇 개 떨구는지(앞 숫자)와 그 확률(뒤 숫자, 합이 100)입니다.", ex: "[5, 15] 를 [5, 30] 으로 올리고 다른 값을 줄여 합을 100 으로 맞춥니다." },

  { g: 4, title: "무기 강화 한 단계당 증가", file: "src/game/itemData.js", name: "ENHANCE.per", now: () => `+1 마다 ${pct(ENHANCE.per)}`,
    effect: "무기를 한 단계 강화할 때마다 무기 스탯이 늘어나는 몫입니다.", ex: "0.08 → 0.1 이면 +30 이 4배가 됩니다." },
  { g: 4, title: "강화 비용 · 최대 단계", file: "src/game/itemData.js", name: "ENHANCE.fee · ENHANCE.max", now: () => `비용 ${ENHANCE.fee} × 단계 · 최대 +${ENHANCE.max}`,
    effect: "fee 는 코인 비용 바탕(단계를 곱함), max 는 올릴 수 있는 최대 단계입니다. 성공 확률은 같은 객체의 stones 표입니다.", ex: "fee 250 → 150 이면 강화가 싸집니다." },
  { g: 4, title: "다른 무기를 들었을 때 고정 피해", file: "src/game/shopData.js", name: "OFF_HAND.dmg", now: () => `검 ${OFF_HAND.dmg.sword} · 활 ${OFF_HAND.dmg.bow} · 마법봉 ${OFF_HAND.dmg.staff}`,
    effect: "직업과 다른 묶음의 무기를 들면 한 대 피해가 이 값으로 고정됩니다.", ex: "" },

  { g: 5, title: "전직 가능 레벨", file: "src/game/advData.js", name: "ADV.lv", now: () => ADV.lv,
    effect: "전직 교관에게 시험을 받을 수 있는 레벨입니다.", ex: "200 → 150 이면 150레벨부터 전직합니다." },
  { g: 5, title: "전직 패시브 추가 피해 상한", file: "src/game/advData.js", name: "ADV.pveBonusMax · ADV.pvpBonusMax", now: () => `몹 +${pct(ADV.pveBonusMax)} · 결투 +${pct(ADV.pvpBonusMax)}`,
    effect: "전직 패시브로 늘어나는 피해 합계의 상한입니다.", ex: "" },
  { g: 5, title: "전직 몸(체력 · 속도 · 받는 피해)", file: "src/game/advData.js", name: "ADV_BODY", now: () => Object.entries(ADV_BODY).map(([k, v]) => `${ADV_BY_ID[k].name} 체력 ×${v.hp} 속도 ×${v.spd}`).join(" · "),
    effect: "암살자 · 엘프의 체력 배율(hp), 걷는 속도 배율(spd), 받는 피해 배율(take)입니다.", ex: "elf.spd 1.3 → 1.2 이면 엘프가 덜 빨라집니다. 암살자 질주 상한도 이 값을 따라갑니다." },
  { g: 5, title: "전직 추가 스탯", file: "src/game/advData.js", name: "ADV_BONUS", now: () => Object.entries(ADV_BONUS).map(([k, v]) => `${ADV_BY_ID[k].name} ${Object.entries(v).map(([a, n]) => `${a} ${n}`).join("·")}`).join(" / "),
    effect: "전직하면 공짜로 얻는 스탯 포인트입니다.", ex: "검투사 str 60 → 80 이면 전직 직후 공격력이 더 높습니다." },
  { g: 5, title: "전직 스킬 대기 시간 · 배율", file: "src/game/advData.js", name: "ADV_CLASSES 각 전직의 active (cd · mul)", now: () => ADV_BY_ID.elf ? `엘프 대기 ${ADV_BY_ID.elf.active.cd}초 · 화살 ${ADV_BY_ID.elf.active.mul}배 …` : "",
    effect: "전직마다 active 안의 cd(대기 시간 초)와 mul(피해 배율)이 있습니다. 전직 이름으로 찾아 그 칸만 바꿉니다.", ex: "elf active.mul 1.5 → 2 이면 숲바람 화살이 더 아픕니다." },
  { g: 5, title: "소환술사 거대 정령(궁극기)", file: "src/game/advData.js", name: "summoner 의 ultimate", now: () => { const u = ADV_BY_ID.summoner.ultimate; return `대기 ${u.cd}초 · ${u.life}초 · 체력 ×${u.hpMul} · 대신 맞기 ${pct(u.share)} · 내려치기 ${u.mul}배 · 돌아다니는 범위 ${u.roam}`; },
    effect: "cd 대기, life 지속, hpMul 정령 체력, share 대신 맞는 몫, every 내려치기 간격, mul 피해 배율, r 내려치기 범위, roam 돌아다니는 범위, speed 걷는 속도입니다.", ex: "share 0.6 → 0.8 이면 내가 받는 피해의 80% 를 정령이 맞습니다." },

  { g: 6, title: "결투 피해 · 시간", file: "src/game/rpg.js", name: "DUEL.dmgMul · DUEL.time", now: () => `피해 ×${DUEL.dmgMul} · ${DUEL.time}초`,
    effect: "결투에서 주고받는 피해 배율과 제한 시간입니다. 낮을수록 오래 싸웁니다.", ex: "dmgMul 0.3 → 0.2 이면 결투가 더 길어집니다." },
  { g: 6, title: "서버 정원", file: "src/game/rpg.js", name: "RPG_SERVER_CAP", now: () => `${RPG_SERVER_CAP}명`,
    effect: "RPG 서버 한 곳에 들어오는 최대 인원입니다. 사용자 결정 사항이라 바꾸기 전에 확인합니다. 올리면 서버 부하가 늘어납니다.", ex: "" },

  { g: 7, title: "탑 공격력 · 사거리 · 공격 간격 · 비용", file: "src/game/world.js", name: "TOWERS 표의 dmg · range · interval · cost", now: () => TOWERS.slice(0, 3).map((t) => `${t.name} 피해 ${t.dmg} · 사거리 ${t.range} · 간격 ${t.interval}초 · ${t.cost}골드`).join(" / ") + " …",
    effect: "탑마다 한 줄씩 있습니다. dmg 는 한 발 피해, interval 은 공격 간격(작을수록 빠름), cost 는 짓는 값입니다. 바꾸면 towerInfo.js 의 설명 숫자도 같이 고칩니다.", ex: "궁수탑 dmg 15 → 18 이면 궁수탑이 20% 셉니다." },
  { g: 7, title: "탑 4단계 강화 비용", file: "src/game/world.js", name: "TOWERS 표의 up4", now: () => TOWERS.slice(0, 4).map((t) => `${t.name} ${t.up4}`).join(" · ") + " …",
    effect: "3단계에서 4단계로 올리는 값입니다. 300 을 넘지 않는 것이 규칙입니다.", ex: "" },
];
