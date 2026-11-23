/* ── 히든 직업 Illusionist 005(마술사) — 수치는 모두 여기 한 곳(11월 17일, 사용자 기획 「히든직업 002~006 통합기획안」 1부 · 2부 4장) ─────────────
   규칙은 illusionJob.js(방장 · 전용 서버 판정 꼴), 그림은 illusionArt.js, 시트 규격은 illusionPxData.js.
   이전 히든 직업과 같은 흐름 — 획득 방법(해금 퀘스트)은 넣지 않고 격자 연습장(sandbox 맵)에서만 켜진다(ILLUSION.live = false).
   저장 · 스냅샷 · 관리자 명령어 · 유일 규칙(HIDDEN_JOBS)에는 아직 잇지 않았다. 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.
   "정한 값"이라 적은 것은 기획안에 없어 정한 값이다(보고 대상). 그 밖은 기획안 값 그대로. */

import { HIDDEN_RANGE } from "./hiddenFamilyData.js";   // 히든 계열 전용 사거리(11월 20일)
export const ILLUSION_NAME = "Illusionist 005";
export const ILLUSION_TITLE = "마술사";
export const ILLUSION_ID = "illusionist";

// 팔레트(기획안 제안) — 기본 #B7A9D8 · 보조 #FFF4E6 · 강조 #6B3F95. 카드 · 거울 · 백색 절단선
export const ILLUSION_COLORS = { deep: "#2A1C3A", base: "#B7A9D8", cream: "#FFF4E6", accent: "#6B3F95", blue: "#9CC3E8", text: "#EDE6F7", warn: "#E3B7C8" };
// 연마 합계 색 — 75 카드 흰 테두리가 푸른빛 · 130 카드 뒷면에 보랏빛 거울 무늬(시트의 색 줄)
export const ILLUSION_TINT = [{ from: 130, id: "mirror" }, { from: 75, id: "blue" }, { from: 0, id: "white" }];

export const ILLUSION = {
  live: true,                 // 11월 23일 사용자 "실제 게임에도 적용해줘" — false 로 되돌리면 연습장에서만 켜진다
  maxLv: 200,
  // 직업 레벨 경험치(공통 제안) — 다음 레벨까지 10 + 지금 레벨. 일반 몹 1 · 사냥터 보스 10 · 토벌 · 월드보스 20 · 1분 120 까지
  xp: { base: 10, per: 1, mob: 1, boss: 10, raid: 20, perMin: 120 },
  // 연마 셋 — 0 카드 · 1 공간 · 2 트릭. 각 0~50 · 다음 레벨까지 100 + 20 × L · 유효한 시전 한 번에 +10(허수아비는 주지 않는다)
  train: { max: 50, base: 100, per: 20, cast: 10 },
  tint: { blue: 75, mirror: 130 },
  encore: 150,                // 연마 합계 150 — 끝없는 앙코르
  // 직업 레벨 해금(기획안 표) — 절단 카드 1 · 폭렬 셔플 5 · 덱 슬래시 15 · 카드 프리즌 30 · 카드 블링크 55 · 팬텀 피스트 100 · 미러 하우스 150 · 최후의 셔플 200
  unlock: { card: 1, shuffle: 5, slash: 15, prison: 30, blink: 55, fist: 100, mirror: 150, final: 200 },
  lift: 34,                   // 손 높이(카드가 떠나는 높이) — 다른 원거리 스킬과 같다
};
export const IL_TRAIN_NAMES = ["카드 연마", "공간 연마", "트릭 연마"];

/* 트릭 — 최대 5중첩. 기본 공격 유효 적중 +1 · 다른 이름의 공격 스킬을 연계 시간 안에 이어 맞히면 +1(같은 스킬 반복은 없음).
   3중첩 이상에서 공격 스킬을 쓰면 3개를 쓰고 그 스킬 첫 유효 적중 대상에게 잔상 한 번(그 스킬 첫 타격의 60%, 트릭 연마 50 → 100%).
   연계 시간 4초(트릭 연마 25 → 6초) — 그동안 유효 공격이 없으면 연계 기록이 지워진다. 잔상은 트릭 · 연계를 만들지 않는다.
   ghostDelay — 첫 적중 뒤 잔상이 들어가는 시각(정한 값, 연출이 보이도록) */
export const IL_TRICK = { max: 5, basic: 1, chain: 1, cost: 3, window: 4, window25: 6, sp25: 25, ghost: 0.6, ghost50: 1.0, sp50: 50, ghostDelay: 0.15 };

/* 절단 카드(기본) — 공격 간격 0.5초 · 사거리 550 · 폭 32 · ×2.0 · 맞히면 트릭 +1.
   0.00 손 위에서 카드가 돌고 0.09초에 떠난다(기획안 타임라인). 탄속은 정한 값 */
export const IL_CARD = { name: "절단 카드", gap: 0.5, range: HIDDEN_RANGE.illusionist, w: 32, mul: 2.0, wind: 0.09, v: 1400 };

/* 폭렬 셔플(직업 레벨 5) — 대기 9초 · 사거리 580 · 반지름 140. 카드 5장 ×3.0 + 마무리 ×6.0(합 ×21).
   0.15~0.55 카드가 차례로 날아가 겨눈 자리를 치고 0.70 같은 자리에서 폭발(반지름 = 판정 범위). 카드 연마 25 — 카드 +2장.
   fly — 카드 한 장이 날아가는 시간(정한 값) */
export const IL_SHUFFLE = { name: "폭렬 셔플", cd: 9, reach: 580, r: 140, n: 5, mul: 3.0, endMul: 6.0, first: 0.15, last: 0.55, fly: 0.12, end: 0.7,
  sp25: 25, add25: 2, tail: 0.35, near: 300 };

/* 덱 슬래시(직업 레벨 15) — 대기 11초 · 돌진 320 · 폭 110. 전진 두 번 ×7.0(합 ×14).
   11월 19일 사용자 — 대기 없이 연속 3번: 한 번 쓰고 다시 누르면 또 쓰고(총 uses 번), 다 쓰거나 chain 초 안에 안 누르면 그때부터 대기 cd 가 돈다.
   chain — 다음 입력을 기다리는 시간(정한 값, 안 정하면 영영 열려 있어 대기가 시작되지 않는다)
   0.10~0.30 첫 전진 · 참격, 0.30~0.50 두 번째 전진 · 역방향 참격. 벽 앞에서 멈춘다(지나간 길만 친다) */
export const IL_SLASH = { name: "덱 슬래시", cd: 11, uses: 3, chain: 6, len: 320, w: 110, mul: 7.0, start: 0.1, seg: 0.2, tail: 0.3 };

/* 카드 프리즌(직업 레벨 30) — 대기 18초 · 사거리 520 · 반지름 180. 안에서 네 번 ×4.0 + 최종 ×10.0(합 ×26).
   0.00~0.30 카드 상자가 생긴다 → 0.30~1.50 네 번 친다 → 1.70 접히며 최종 폭발.
   0.30 에 안에 있던 일반 몹은 최종 폭발까지 묶는다 · 보스는 둔화만 · 사람(결투 · 사냥터 PvP)은 최대 0.5초 속박 */
export const IL_PRISON = { name: "카드 프리즌", cd: 18, reach: 520, r: 180, form: 0.3, hits: [0.6, 0.9, 1.2, 1.5], mul: 4.0, end: 1.7, endMul: 10.0,
  bossSlow: 1.4, pvpBind: 0.5, tail: 0.35, near: 300 };

/* 카드 블링크(직업 레벨 55) — 대기 16초 · 이동 340 · 끝 반지름 130 · 분신 폭발 ×9.0.
   0.00 원래 자리에 카드 4장 → 0.12 합법 자리로 순간이동 → 0.22 원래 자리의 카드 분신이 폭발.
   도착 자리가 막혀 있으면 가장 가까운 합법 자리로. 합법 자리가 없으면 발동 · 대기 · 트릭 소모 없음.
   공간 연마 25 — 이동 400 · 50 — 폭발 반지름 200. minMove — "유효 이동"으로 보는 최소 거리(정한 값) */
export const IL_BLINK = { name: "카드 블링크", cd: 16, len: 340, len25: 400, sp25: 25, r: 130, r50: 200, sp50: 50, mul: 9.0, jump: 0.12, boom: 0.22, tail: 0.4, minMove: 80 };

/* 팬텀 피스트(직업 레벨 100) — 대기 24초 · 앞 460 · 폭 200 · 큰 카드 주먹 ×40.0(카드 연마 50 → ×55).
   0.00~0.25 카드 다발이 주먹으로 압축 → 0.25~0.50 직선 전진 → 0.50 충돌 · 판정 → 0.50~0.80 카드 조각이 흩어진다 */
export const IL_FIST = { name: "팬텀 피스트", cd: 24, len: 460, w: 200, mul: 40.0, mul50: 55.0, sp50: 50, form: 0.25, hit: 0.5, tail: 0.3 };

/* 미러 하우스(직업 레벨 150) — 트릭 0 · 대기 50초 · 반지름 320 · 8초.
   정한 해석 — 쓴 자리에 거울 집이 고정되고, 그 안에서 쓴 공격 스킬은 첫 유효 적중 대상에게 원래 첫 타격의 40% 잔상을 한 번 더 준다.
   0.00~0.45 거울 프레임 4개가 솟고 0.45~8.00 유지. 거울은 피해 판정 대상이 아니다 */
export const IL_MIRROR = { name: "미러 하우스", cd: 50, r: 320, dur: 8, rise: 0.45, ghost: 0.4, encore: 0.3 };

/* 최후의 셔플(직업 레벨 200) — 지금 트릭 전부 · 대기 95초 · 반지름 350. 궁극기(sid "ult").
   0.00~0.50 카드 12장이 원으로 선다 → 0.60~1.70 0.1초마다 12번 ×8.0 → 1.80 가운데 큰 거울 → 2.00 거울이 부서지며 최종 ×90.
   트릭 0개여도 쓸 수 있고 트릭 5개면 최종 +50%(이론 합 ×231). 끝없는 앙코르면 2.12 거울 파쇄 ×30 한 번 더.
   사거리는 정한 값(다른 궁극기와 같은 650) */
export const IL_FINAL = { name: "최후의 셔플", cd: 95, reach: 650, r: 350, n: 12, first: 0.6, gap: 0.1, mul: 8.0, mirror: 1.8, end: 2.0, endMul: 90.0, full: 0.5,
  encore: 2.12, encoreMul: 30.0, tail: 0.6, near: 300 };

/* 조작 — 새 키 칸 없이 기존 행동 키를 빌린다(Gambler 002 · Engineer 003 과 같은 칸, 기획안 "002~006 은 공통 슬롯"). 평타 키는 절단 카드 */
export const IL_SLOTS = [
  { s: "shuffle", act: "use1" },   // 일반 스킬 칸 1(기본 1)
  { s: "slash", act: "use2" },     // 일반 스킬 칸 2(기본 2)
  { s: "prison", act: "bSmash" },  // 기본 3
  { s: "blink", act: "bSword" },   // 기본 4
  { s: "fist", act: "use5" },      // 직업 스킬 칸(기본 R)
  { s: "mirror", act: "adv" },     // 전직 스킬(기본 Z)
  { s: "final", act: "skill" },    // 큰 기술(기본 Shift)
];
export const IL_SKILLS = { shuffle: IL_SHUFFLE, slash: IL_SLASH, prison: IL_PRISON, blink: IL_BLINK, fist: IL_FIST, mirror: IL_MIRROR, final: IL_FINAL };
// 트릭 자동 강화(3개)를 쓰는 공격 스킬 — 미러 하우스는 공격이 아니고, 최후의 셔플은 트릭을 모두 쓰는 제 규칙을 따른다
export const IL_TRICKED = ["shuffle", "slash", "prison", "blink", "fist"];
// 미러 하우스 잔상이 붙는 공격 스킬(본체 공격 스킬 전부)
export const IL_ATTACKS = ["shuffle", "slash", "prison", "blink", "fist", "final"];
