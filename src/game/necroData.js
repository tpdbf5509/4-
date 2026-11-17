/* ── 히든 직업 Necromancer 004(그림자 군주) — 수치는 모두 여기 한 곳(11월 17일, 사용자 기획 「히든직업 002~006 통합기획안」 3장) ─────────────
   규칙은 necroJob.js(방장 · 전용 서버 판정 꼴), 그림은 necroArt.js, 시트 규격은 necroPxData.js, 도트 시트는 design/effects/necromancer/make.py.
   11월 17일 사용자 결정 — "일단 획득 방법은 적용하지 말고 격자 훈련장에 적용해" · "패치노트에는 적지 마".
   그래서 해금 경로 · 저장(cleanBag) · 스냅샷 줄 · 관리자 명령어 · 화면 칸(RpgView)은 아직 없다. NECRO.live 가 false 라 연습장 맵에서만 켜진다(necroOn).
   "정한 값"이라 적은 것은 기획안에 없어 정한 값이다(보고 대상). 그 밖은 기획안 값 그대로. */

export const NECRO_NAME = "Necromancer 004";
export const NECRO_TITLE = "그림자 군주";
export const NECRO_ID = "necromancer";   // bag.hj.jobs 의 칸 이름(기획안 최종 추천안)

// 팔레트(기획안) — 기본 #351B53 · 보조 #9271C4 · 최고 연마 강조 #D4D1EA. 흰색은 쓰지 않는다
export const NECRO_COLORS = { deep: "#1A1024", base: "#351B53", mid: "#6C4CA0", bright: "#9271C4", rim: "#D4D1EA", red: "#A8323C", text: "#D9CCF0" };
// 연마 합계 색 — 75 눈 · 중심이 진한 보라 · 130 그림자 병사 은색 테두리(그림은 시트의 색 줄)
export const NECRO_TINT = [{ from: 130, id: "silver" }, { from: 75, id: "violet" }, { from: 0, id: "shade" }];

export const NECRO = {
  live: false,                // 실제 게임 연결 — false 면 격자 연습장(sandbox 맵)에서만 켜진다(11월 17일 사용자 결정)
  maxLv: 200,                 // 직업 레벨 최대
  soul: 100,                  // 영혼 최대
  // 직업 레벨 경험치(공통 제안) — 다음 레벨까지 10 + 지금 레벨. 일반 몹 1 · 사냥터 보스 10 · 토벌 · 월드보스 20 · 1분 120 까지
  xp: { base: 10, per: 1, mob: 1, boss: 10, raid: 20, perMin: 120 },
  // 연마 셋 — 0 추출 · 1 지휘 · 2 군주. 각 0~50 · 다음 레벨까지 100 + 20 × L · 유효한 시전 한 번에 +10(허수아비는 주지 않는다)
  train: { max: 50, base: 100, per: 20, cast: 10 },
  tint: { violet: 75, silver: 130 },
  eternal: 150,               // 연마 합계 150 — 영원의 명령
  // 직업 레벨 해금(공통 구간) — 그림자 낫 1 · 흔적 추출 5 · 그림자 소집 15 · 그림자 교환 30 · 군주의 영역 55 · 일제 진군 100 · 영혼 소각 150 · 무명의 군세 200
  unlock: { reap: 1, extract: 5, summon: 15, swap: 30, domain: 55, march: 100, burn: 150, legion: 200 },
  lift: 34,                   // 손 높이(그림 · 탄 시작점) — 다른 원거리 스킬과 같다
};
export const NC_TRAIN_NAMES = ["추출 연마", "지휘 연마", "군주 연마"];

/* 영혼 — 기본 공격 유효 적중 +5 · 처치에 기여한 일반 몹 +10 · 보스에게 유효 피해 10번마다 +10(보스마다 3초에 한 번) */
export const NC_SOUL = { hit: 5, kill: 10, boss: 10, bossHits: 10, bossGap: 3 };

/* 그림자 명부 — 기본 12종(추출 연마 25 → 15종) · 같은 종류는 한 칸 · 등급 1~5.
   승급에 드는 같은 종류 재추출 수 2 · 4 · 7 · 10(추출 연마 50 → 5등급 비용 20% 줄어 8).
   gradeDmg — 등급 하나 오를 때마다 그림자 공격 +10%(정한 값 — 기획안에 등급 효과 수치가 없다) */
export const NC_ROSTER = { slots: 12, slots25: 15, sp25: 25, grades: 5, cost: [2, 4, 7, 10], sp50: 50, cut50: 0.2, gradeDmg: 0.1 };
/* 추출 가능 흔적 — 내가 처치에 기여한 일반 몹이 쓰러진 자리에 8초. 월드보스 · 길드보스 · 보스 · 허수아비 · 다른 사람은 남기지 않는다 */
export const NC_TRACE = { life: 8, max: 12 };

/* 그림자 종류 다섯 — 공격 방식만 다르고 한 번 공격의 세기(×3.0 · 1.4초)는 같다(기획안: 소환 공격 이론 상한 5기 × 14번 × 3).
   reach 공격 거리 · spd 걷는 빠르기 · r 범위 공격 반지름(0 이면 한 대상) · at 공격을 시작해 맞기까지(원거리는 날아가는 시간) — 정한 값 */
export const NC_KINDS = {
  knight: { name: "기사형", role: "전방 보호", reach: 70, spd: 300, r: 0, at: 0.18 },
  assassin: { name: "암살형", role: "추격", reach: 60, spd: 420, r: 0, at: 0.1 },
  archer: { name: "사수형", role: "후방 공격", reach: 380, spd: 280, r: 0, at: 0.28, fly: 1 },
  caster: { name: "주술형", role: "광역 공격", reach: 320, spd: 270, r: 70, at: 0.34, fly: 1 },
  giant: { name: "거수형", role: "범위 제압", reach: 95, spd: 220, r: 95, at: 0.42 },
};
export const NC_KIND_IDS = Object.keys(NC_KINDS);
/* 몹 종류 → 그림자 종류(기획안 "정적 매핑표"). 짝을 정한 근거는 그 몹의 생김새 · 공격 방식(정한 값). 없는 종류는 기사형 */
export const NC_KIND_OF = {
  rabbit: "assassin", wolf: "assassin", spider: "assassin", chimera: "assassin", synthetic_forest: "assassin", rift_boundary: "assassin",
  goblin: "knight", orc: "knight", skeleton: "knight", zombie: "knight", wraith: "knight", scrapyard: "knight", silent_city: "knight",
  skeletal: "archer", firedrake: "archer", fallen: "archer", clock_tower: "archer",
  necro: "caster", fspirit: "caster", ifrit: "caster", voidmage: "caster", forbidden_lab: "caster", observer_hall: "caster", origin_command: "caster",
  boar: "giant", gorilla: "giant", ogre: "giant", golem: "giant", lavagolem: "giant", abyss: "giant",
  // 11월 17일 사용자 "현재 존재하는 모든 몹 전부" — 나머지 몹도 생김새대로 짝을 정했다(정한 값). 보스 · 월드보스 · 길드보스는 게임에서 흔적이 남지 않아 연습장에서만 쓴다
  gramor: "giant", argas: "knight", morgas: "caster", barkanon: "giant", serka: "assassin",
  tg_fire: "caster", tg_frost: "caster", tg_bolt: "caster", tg_poison: "caster", tg_corrode: "knight", tg_gravity: "giant",
  guild_slime: "giant", guild_siren: "caster", guild_phoenix: "archer",
  scrapyard_elite: "giant", synthetic_forest_elite: "assassin", silent_city_elite: "knight", clock_tower_elite: "archer", rift_boundary_elite: "assassin",
  forbidden_lab_elite: "caster", observer_hall_elite: "caster", origin_command_elite: "giant",
  hi_plant: "caster", hi_device: "archer", hi_drone: "archer", hi_echo: "assassin", hi_sclone: "assassin",
  world_dragon: "giant", world_serpent: "giant", world_machine: "giant", world_thunderbird: "archer", world_void: "caster",
};

/* 기본 공격 — 그림자 낫(11월 17일 사용자: "네크로맨서 평타 없애고 근거리 무기 낫으로 바꾸자" — 흑영탄을 뺐다).
   앞쪽 부채꼴(반지름 reach · 반각 arc 라디안) 안 가까운 max 명을 한 번에 벤다. 휘두른 뒤 wind 초에 맞는다(낫 그림과 맞춤).
   ×mul · 하나라도 맞히면 영혼 +5(한 번 휘두를 때 한 번). 공격 간격 gap. reach · arc · max · mul · gap 은 정한 값 — 근접이라 흑영탄(×2.0 한 발)보다 조금 세게 */
export const NC_SCYTHE = { name: "그림자 낫", gap: 0.55, reach: 140, arc: 1.1, max: 6, mul: 2.6, wind: 0.12, swing: 0.34 };

/* 흔적 추출(직업 레벨 5) — 영혼 20 · 대기 8초 · 내 둘레 240 안의 흔적 하나(가장 가까운 것). 못 쓰면 영혼 · 대기를 쓰지 않는다.
   0.25초에 그림자가 솟고 0.5초에 발밑으로 빨려 든다 — 등록은 0.5초에 */
export const NC_EXTRACT = { name: "흔적 추출", cost: 20, cd: 8, r: 240, rise: 0.25, done: 0.5 };

/* 그림자 소집(직업 레벨 15) — 영혼 30 · 대기 20초 · 내 둘레 170 안에 최대 5기 · 20초. 그림자마다 1.4초에 한 번 ×3.0.
   0.30초에 발부터 올라와 0.55초에 싸울 준비. 고르는 차례(정한 해석 — 기획안 "선택한 병사"): 등급 높은 것 → 먼저 등록한 것. 소각 뒤 8초가 안 지난 종류는 뺀다.
   이미 나와 있으면 거두고 새로 부른다(정한 해석) */
export const NC_SUMMON = { name: "그림자 소집", cost: 30, cd: 20, r: 170, max: 5, dur: 20, gap: 1.4, mul: 3.0, rise: 0.3, ready: 0.55 };
/* 그림자 행동(기획안 AI) — 주인 뒤 따라가기 · 450 안에 적이 있으면 싸움(지휘 연마 25 → +15%) · 대상이 없으면 복귀 · 700 넘게 떨어지면 주인 곁으로.
   back 따라갈 때 주인 뒤 거리 · spread 따라갈 때 옆 간격 — 정한 값 */
export const NC_AI = { aggro: 450, aggro25: 0.15, sp25: 25, leash: 700, back: 70, spread: 34 };

/* 그림자 교환(직업 레벨 30) — 영혼 15 · 대기 15초 · 같은 맵 600 안의 내 그림자와 자리를 바꾼다(포인터에 가장 가까운 그림자). 피해 없음.
   0.12초에 세로선 · 0.18초에 바꾼다. 도착 자리가 막힌 곳이면 쓰지 않는다 */
export const NC_SWAP = { name: "그림자 교환", cost: 15, cd: 15, reach: 600, lines: 0.12, at: 0.18 };

/* 군주의 영역(직업 레벨 55) — 영혼 30 · 대기 30초 · 내 둘레 320(나를 따라다닌다) · 10초. 안의 그림자 피해 +40% · 걷는 빠르기 +20%.
   군주 연마 25 — 12초 · 50 — +70%. 0~0.35초에 펼쳐진다 */
export const NC_DOMAIN = { name: "군주의 영역", cost: 30, cd: 30, r: 320, dur: 10, dur25: 12, sp25: 25, dmg: 0.4, dmg50: 0.7, sp50: 50, spd: 0.2, open: 0.35, hint: 0.5 };

/* 일제 진군(직업 레벨 100) — 영혼 25 · 대기 14초 · 550 안의 지점에서 가장 가까운 적. 살아 있는 그림자마다 ×7.0(지휘 연마 50 → ×11).
   0.15초에 돌아서고 0.30~0.65초에 차례로 친다. 모든 타격이 시전 하나를 함께 쓴다. 그 뒤 그림자는 그 적을 먼저 노린다 */
export const NC_MARCH = { name: "일제 진군", cost: 25, cd: 14, reach: 550, mul: 7.0, mul50: 11.0, sp50: 50, turn: 0.15, first: 0.3, last: 0.65, near: 260 };

/* 영혼 소각(직업 레벨 150) — 영혼 30 · 대기 25초 · 나와 있는 그림자 최대 5기를 모두 쓴다(정한 해석). 겨눈 자리 반경 280 · 1기당 ×15.0(최대 ×75).
   0.25초에 돌진 · 0.40초부터 그림자마다 0.05초 간격으로 터진다. 명부는 그대로 · 쓴 종류는 8초 동안 다시 부르지 못한다.
   reach 겨눌 수 있는 거리(정한 값) */
export const NC_BURN = { name: "영혼 소각", cost: 30, cd: 25, r: 280, mul: 15.0, reach: 550, dash: 0.25, boom: 0.4, gap: 0.05, lock: 8, near: 260 };

/* 무명의 군세(직업 레벨 200) — 영혼 70 · 대기 100초 · 지점 반경 400. 궁극기(sid "ult").
   0~0.6초 뒤쪽에 문양 → 0.6~2.4초 군세 파동 10번 ×12 → 2.6초 검은 가시 → 2.8초 마지막 폭발 ×100(영원의 명령 ×140). 합 ×220.
   reach 겨눌 수 있는 거리(정한 값) · 실제 병사를 만들지 않고 파동 10번만 셈한다 */
export const NC_LEGION = { name: "무명의 군세", cost: 70, cd: 100, r: 400, reach: 600, sigil: 0.6, waves: 10, first: 0.6, gap: 0.2, mul: 12, spike: 2.6, end: 2.8, endMul: 100, endMul150: 140, tail: 0.8, near: 320 };

/* 영원의 명령(연마 합계 150) — 소집 첫 그림자를 명부에서 가장 높은 등급으로 · 첫 그림자 공격 피해 +50% · 무명의 군세 마지막 폭발 ×140 */
export const NC_ETERNAL = { first: 0.5 };

/* 조작 — 새 키 칸을 만들지 않고 기존 행동 키를 빌린다(Gambler 002 와 같은 자리). 평타 키는 그림자 낫 */
export const NC_SLOTS = [
  { s: "extract", act: "use1" },   // 기본 1
  { s: "summon", act: "use2" },    // 기본 2
  { s: "swap", act: "bSmash" },    // 기본 3
  { s: "domain", act: "bSword" },  // 기본 4
  { s: "march", act: "use5" },     // 기본 R
  { s: "burn", act: "adv" },       // 기본 Z
  { s: "legion", act: "skill" },   // 기본 Shift
];
export const NC_SKILLS = { extract: NC_EXTRACT, summon: NC_SUMMON, swap: NC_SWAP, domain: NC_DOMAIN, march: NC_MARCH, burn: NC_BURN, legion: NC_LEGION };
