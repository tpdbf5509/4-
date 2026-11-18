/* ── 히든 직업 Engineer 003(엔지니어) — 수치는 모두 여기 한 곳(11월 17일, 사용자 기획 「히든직업 002~006 통합기획안」 2부 2장) ─────────────
   규칙은 engineerJob.js(방장 · 전용 서버 판정 꼴), 그림은 engineerArt.js, 시트 규격은 engineerPxData.js.
   11월 17일 사용자 결정 — 격자 연습장에서 먼저 확인. 11월 19일 사용자 지시("엔지니어와 획득 루트 적용해줘")로 실제 게임에 이었다.
   저장 bag.hj(hiddenSave.js) · 스냅샷 영웅 줄 58 · 해금 경로(engineerQuest.js, 진행은 bag.eu) · 관리자 명령어 /엔지니어(adminCmd.js).
   히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다(사용자 지시).
   "정한 값"이라 적은 것은 기획안에 없어 정한 값이다(보고 대상). 그 밖은 기획안 값 그대로. */

export const ENGINEER_NAME = "Engineer 003";
export const ENGINEER_TITLE = "엔지니어";
export const ENGINEER_ID = "engineer";

// 팔레트(기획안) — 기본 #4FA7B2 · 보조 #C6F3FF · 최고 연마 강조 #FFD37A. 전류 · 금속 · 육각 격자
export const ENGINEER_COLORS = { deep: "#1E3B40", base: "#4FA7B2", bright: "#C6F3FF", gold: "#FFD37A", heat: "#E39A5B", warn: "#D9605A", text: "#CFEFF3" };
// 연마 합계 색 — 75 기계 핵이 청록에서 청백으로 · 130 포탑 · 드론 윤곽에 금빛 전류(그림은 engineerArt.js, 시트 줄)
export const ENGINEER_TINT = [{ from: 130, id: "gold" }, { from: 75, id: "pale" }, { from: 0, id: "teal" }];

export const ENGINEER = {
  live: true,                 // 실제 게임 연결(11월 19일 사용자 결정) — false 로 되돌리면 저장 값은 남긴 채 해금 경로 · 명령어 · 직업 판정이 모두 꺼진다(연습장은 그대로)
  maxLv: 200,                 // 직업 레벨 최대
  power: 100,                 // 전력 최대
  powerStart: 100,            // 켤 때 · 연습장에 들어올 때 전력(정한 값 — 기획안 "전용 자원 : 전력 100")
  regen: 2,                   // 전투 중 자연 회복(초당) — PvP 에서도 같다. 정한 해석: 싸울 수 있는 맵이면 늘(광장 · 마을은 아니다)
  heatMax: 100,
  // 직업 레벨 경험치(공통 제안) — 다음 레벨까지 10 + 지금 레벨. 일반 몹 1 · 사냥터 보스 10 · 토벌 · 월드보스 20 · 1분 120 까지
  xp: { base: 10, per: 1, mob: 1, boss: 10, raid: 20, perMin: 120 },
  // 연마 셋 — 0 포탑 · 1 드론 · 2 동기화. 각 0~50 · 다음 레벨까지 100 + 20 × L · 유효한 시전 한 번에 +10(허수아비는 주지 않는다)
  train: { max: 50, base: 100, per: 20, cast: 10 },
  tint: { pale: 75, gold: 130 },
  central: 150,               // 연마 합계 150 — 중앙 제어
  // 직업 레벨 해금(공통 구간) — 펄스 1 · 터렛 5 · 드론 15 · 자기장 30 · 레일포 55 · 강철 수호자 100 · 오버클럭 150 · 궤도 섬멸 200
  unlock: { pulse: 1, turret: 5, drone: 15, magnet: 30, rail: 55, mech: 100, oc: 150, orbit: 200 },
  lift: 34,                   // 손목 높이(그림 · 탄 시작점) — 다른 원거리 스킬과 같다
  units: 5, units50: 6,       // 시전자당 설치물 합계(포탑 연마 50 이면 6)
  seek: 0.2,                  // 기계가 목표를 다시 찾는 간격(초)
};
export const EN_TRAIN_NAMES = ["포탑 연마", "드론 연마", "동기화 연마"];

/* 기본 공격 — 펄스 발진. 공격 간격 0.45초 · 사거리 520 · ×2.0 · 유효 적중이면 전력 +6(공격 한 번에 한 번).
   0.08초 뒤 손목에서 떠난다(기획안 타임라인). 탄 지름 · 탄속은 정한 값 */
export const EN_PULSE = { name: "펄스 발진", gap: 0.45, range: 520, dia: 22, mul: 2.0, gain: 6, wind: 0.08, v: 1200 };

/* 센트리 터렛(직업 레벨 5) — 전력 25 · 대기 12초 · 설치 거리 420. 12초 동안 1.2초마다 ×3.0 · 사거리 520 · 터렛당 최대 10번.
   동시 2기(포탑 연마 50 → 3기). 포탑 연마 25 — 사거리 +15%. 기단이 0.18초에 솟고 0.30초에 포신이 돈다(첫 사격은 0.30초 뒤) */
export const EN_TURRET = { name: "센트리 터렛", cost: 25, cd: 12, reach: 420, dur: 12, gap: 1.2, mul: 3.0, range: 520, shots: 10, max: 2, max50: 3,
  sp25: 25, range25: 0.15, sp50: 50, rise: 0.18, ready: 0.3, near: 220 };   // near — 겨눌 것이 없을 때 보는 쪽 거리(정한 값)

/* 지원 드론(직업 레벨 15) — 전력 25 · 대기 20초 · 드론 2기 · 10초. 시전자를 따라다니며 1초마다 ×2.0 · 사거리 390 · 드론당 최대 10번.
   드론 연마 25 — 이동 속도 +20% · 50 — 한 번 ×2 → ×3. 순찰 자리(양옆 비대칭) · 속도는 정한 값 */
export const EN_DRONE = { name: "지원 드론", cost: 25, cd: 20, n: 2, dur: 10, gap: 1, mul: 2.0, mul50: 3.0, range: 390, shots: 10, max: 2,
  sp25: 25, spd25: 0.2, sp50: 50, appear: 0.2, spd: 260, orbit: [[-70, 84, 54, 1.6], [62, 100, 40, 2.3]] };   // orbit — [가운데 x, 높이, 반지름, 한 바퀴 초](시전자 기준)

/* 자기장 포획(직업 레벨 30) — 전력 20 · 대기 13초 · 500 안의 한 점 · 반경 200. 0.30초에 ×10.0 한 번 · 일반 몹 속박 1초.
   정한 해석 — 보스 · 사람(결투 · 사냥터 PvP)은 묶지 않는다(기획안 "감전 · 속박은 PvP 에서 따로 제한") */
export const EN_MAGNET = { name: "자기장 포획", cost: 20, cd: 13, reach: 500, r: 200, hit: 0.3, mul: 10.0, bind: 1, near: 300 };

/* 직선 레일포(직업 레벨 55) — 전력 30 · 대기 14초 · 길이 780 · 폭 45. 0.25초 예고 뒤 ×25.0 관통.
   동기화 연마 25 — 폭 +20%. 오버클럭 중 피해 +40%. 벽에 닿으면 그 앞에서 멈춘다(다른 탄과 같다) */
export const EN_RAIL = { name: "직선 레일포", cost: 30, cd: 14, len: 780, w: 45, warn: 0.25, mul: 25.0, sp25: 25, w25: 0.2, ocDmg: 0.4, tail: 0.25 };

/* 강철 수호자(직업 레벨 100) — 전력 50 · 대기 35초 · 15초. 가장 가까운 적에게 다가가 1.5초마다 ×6.0(최대 10번) · 끝날 때 폭발 ×20.
   0.35초에 내려와 착지 · 0.60초부터 쫓는다. 걷는 속도 · 주먹 거리 · 끝 폭발 반경은 정한 값 */
export const EN_MECH = { name: "강철 수호자", cost: 50, cd: 35, dur: 15, gap: 1.5, mul: 6.0, endMul: 20.0, hits: 10, max: 1, land: 0.35, go: 0.6,
  spd: 190, reach: 80, endR: 160, seek: 600 };   // seek — 쫓을 적을 찾는 거리(정한 값)

/* 오버클럭(직업 레벨 150) — 전력 40 · 대기 50초(누르는 순간부터) · 최대 8초. 기계 공격 속도 2배 · 레일포 피해 +40%.
   과열 — 켜진 동안 초당 +12(동기화 연마 50 → 8) · 꺼지면 초당 −10. 100 이면 바로 꺼지고 3초 동안 다시 켤 수 없다(강화 보너스 없음).
   과열 80 부터 테두리가 주황. 중앙 제어(연마 합계 150) — 켜진 동안 모든 설치물 피해 +50% */
export const EN_OC = { name: "오버클럭", cost: 40, cd: 50, dur: 8, spd: 2, heat: 12, heat50: 8, sp50: 50, cool: 10, lock: 3, hot: 80, central: 0.5, hint: 0.3 };

/* 궤도 섬멸 명령(직업 레벨 200) — 전력 0 · 대기 100초 · 지점 반경 350. 궁극기(sid "ult").
   0~0.55초 1px 십자 예고 → 0.55초부터 0.18초 간격 5번 ×15.0 → 1.65초 광선 하강 → 1.75초 최종 ×110.
   시전 순간 살아 있는 설치물 1기당 최종 +10%(최대 +50%) — 시전 뒤 더 놓아도 바뀌지 않는다. 사거리는 정한 값(다른 궁극기와 같은 650) */
export const EN_ORBIT = { name: "궤도 섬멸 명령", cost: 0, cd: 100, reach: 650, r: 350, n: 5, mul: 15.0, first: 0.55, gap: 0.18, beam: 1.65, end: 1.75,
  endMul: 110.0, per: 0.1, perMax: 0.5, tail: 0.7, near: 300 };

/* 조작 — 새 키 칸을 만들지 않고 기존 행동 키를 그대로 쓴다(Gambler 002 와 같은 칸, 기획안 "002~006 은 공통 슬롯"). 평타 키는 펄스 발진 */
export const EN_SLOTS = [
  { s: "turret", act: "use1" },    // 일반 스킬 칸 1(기본 1)
  { s: "drone", act: "use2" },     // 일반 스킬 칸 2(기본 2)
  { s: "magnet", act: "bSmash" },  // 기본 3
  { s: "rail", act: "bSword" },    // 기본 4
  { s: "mech", act: "use5" },      // 직업 스킬 칸(기본 R)
  { s: "oc", act: "adv" },         // 전직 스킬(기본 Z)
  { s: "orbit", act: "skill" },    // 큰 기술(기본 Shift)
];
export const EN_SKILLS = { turret: EN_TURRET, drone: EN_DRONE, magnet: EN_MAGNET, rail: EN_RAIL, mech: EN_MECH, oc: EN_OC, orbit: EN_ORBIT };
// 설치물 종류 번호(스냅샷 · 그림) — 뒤에만 더한다
export const EN_UNIT = { turret: 0, drone: 1, mech: 2 };
