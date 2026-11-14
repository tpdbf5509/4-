/* ── 히든 직업 BLOOD-001(블러드 001) — 수치는 모두 여기 한 곳(11월 14일, 사용자 기획 문서 3개) ─────────────
   기준: 「히든직업_연출및세부사항」(수정본 + 연출 · 판정). 전직 조건은 「히든직업_해금루트」.
   사용자 결정(11월 14일): BLOOD-001 은 1차 전직을 대신한다. 해금하면 1차 전직이 사라지고, 전직 초기화 물약으로만 되돌린다.
   규칙은 bloodJob.js(방장 · 전용 서버만 판정), 그림은 bloodJobArt.js. 크림슨 레퀴엠(bloodGunData.js)의 혈흔 · 혈탄과는 따로 센다.
   저장: 가방 bag.bd(cleanBd). 싸우는 동안의 상태는 영웅 h.bd → 스냅샷 영웅 줄 56(packBloodJob). 필드는 뒤에만 더한다.
   "문서 값"이 아닌 것은 주석에 "정한 값"이라 적었다 — 기획에 없어 플레이테스트 기준으로 정한 값이다. */

export const BLOOD_NAME = "BLOOD-001";
export const BLOOD_TITLE = "블러드 001";

// 혈색 — 크림슨 레퀴엠과 같은 팔레트(bloodGunData.js BLOOD_PALETTE)를 기본으로 쓴다. 연마 합계에 따라 색이 바뀐다(BLOOD_TINT)
export const BLOOD_COLORS = {
  red: { deep: "#650B17", base: "#B8192D", bright: "#E53945", glow: "#FF6973", shadow: "#1A0B14", rim: "#FFD3D6" },
  violet: { deep: "#4A0F3A", base: "#8A1F6B", bright: "#C23A8E", glow: "#E079C0", shadow: "#1A0B1C", rim: "#F6D6F0" },   // 연마 합계 75~129 — 붉은 중심이 남은 보라
  dusk: { deep: "#1A0716", base: "#3D0F3A", bright: "#6A2468", glow: "#9C4C9A", shadow: "#050205", rim: "#E6CCF0" },     // 연마 합계 130~150 — 어두운 보라 · 검은 중심(외곽은 밝게)
};
export const BLOOD_TINT = [{ from: 130, id: "dusk" }, { from: 75, id: "violet" }, { from: 0, id: "red" }];

export const BLOOD = {
  maxLv: 200,                 // 직업 레벨 최대
  start: 50,                  // 처음 해금할 때 혈량
  capBase: 50, capMax: 150,   // 안정 상한 = min(150, 50 + 직업 레벨 - 1)
  abs: 180,                   // 절대 상한 — 혈역 증폭으로만 넘는다(3단계)
  basicGain: 2,               // 평타 유효 적중 — 공격 한 번에 한 번
  // 혈량 전환 — 최대 체력 2% → 혈량 +10 · 대기 2초. 안정 상한 미만에서만 · 쓰고 체력이 1 미만이 되면 못 쓴다
  convert: { hp: 0.02, gain: 10, cd: 2 },
  // 혈흔 — 평타 유효 적중마다 대상별 1중첩 · 최대 5 · 10초(새로 부여하면 전체 갱신). 혈흔 1중첩당 피해 +2%(최대 +10%) · 소비하면 중첩당 혈량 +3
  mark: { max: 5, dur: 10, per: 0.02, back: 3, warn: 2 },
  // 직업 레벨 경험치 — 정한 값(문서는 "별도 확정 대상"): 다음 레벨까지 10 + 지금 레벨.
  // 일반 몹 1 · 사냥터 보스 10 · 던전 · 월드 · 길드 보스 20. 1분 perMin 까지(전직 숙련도와 같은 방식). 허수아비 · PvP 는 세지 않는다
  xp: { base: 10, per: 1, mob: 1, boss: 10, raid: 20, perMin: 120 },
  // 연마 셋 — 0 압축형 · 1 증폭형 · 2 형상화. 해금하면 0레벨 · 경험치 0. 최대 50. 다음 레벨까지 100 + 20 × L, 넘는 몫은 이월
  train: { max: 50, base: 100, per: 20, cast: 10 },
  unlock: { shot: 1, amp: 5, shape: 20, field: 100 },   // 직업 레벨 — 압축형 · 적혈탄 1 / 증폭형 5 / 형상화 · 혈수 강타 · 혈형 변환 20 / 혈역 증폭 100
  tint: { violet: 75, dusk: 130 },   // 영구 연마 합계 — 색이 바뀌는 곳
};
export const TRAIN_IDS = ["press", "amp", "shape"];
export const TRAIN_NAMES = ["압축형", "증폭형", "형상화"];
export const TRAIN_UNLOCK = [BLOOD.unlock.shot, BLOOD.unlock.amp, BLOOD.unlock.shape];

/* 스킬 1 — 적혈탄(혈액 압축 · 차징 · 관통). 대기 7초(발사할 때 시작). 문서 값.
   차징: 키를 누르면 시작(혈량 5 필요) → 놓거나 1.6초에 닿으면, 누른 시간과 지금 혈량을 모두 만족하는 가장 높은 단계로 쏘고 그 단계 비용만 낸다.
   차징 중 이동 속도 -30% · 맞아도 유지 · 기절 · 사망 · 취소 입력이면 끊긴다(비용 · 대기 없음) */
export const BLOOD_SHOT = {
  name: "적혈탄", cd: 7, need: 5, slow: 0.3, full: 1.6,
  tiers: [
    { at: 0, cost: 5, mul: 1.4, range: 500, str: 0 },     // 기본 — 즉발(압축 없음)
    { at: 0.8, cost: 12, mul: 2.5, range: 600, str: 5 },  // 1단계
    { at: 1.6, cost: 27, mul: 4.0, range: 700, str: 10 }, // 2단계
  ],
  strPer: 2,            // 압축 강도 — 단계 기본 + 2 × 압축형 연마 레벨
  strDmg: 0.0025,       // 연마로 더한 강도 1당 본탄 피해 +0.25%(연마 1레벨당 +0.5% · 최대 +25%)
  v: 1000, vFast: 1250, // 탄속(초당 px) — 1단계 특수 능력이면 1 · 2단계 본탄 +25%
  dia: 16,              // 충돌 지름 — 압축 연출로 작아져도 그대로
  sp1: 20, pierce: 2,   // 영구 압축형 연마 20 — 1 · 2단계 본탄이 2명까지(대상당 한 번)
  sp2: 45, burstR: 110, burstMul: 1.0,   // 영구 압축형 연마 45 — 2단계 본탄 첫 적중 자리에 반경 110 팽창 1회(×1.0, 대상당 한 번)
  lift: 34,             // 손 높이(그림 · 판정 시작점) — 다른 원거리 스킬과 같다
  hint: 0.25,           // 차징 연출을 다시 보내는 간격(초) — 늦게 들어온 사람에게도 지금 단계가 보이게
};

// 기본 키 — 정한 값. 문서 제안(Q · E · R · Shift+R · F · C)은 이 게임의 대쉬 · 대화 · 직업 스킬 · 큰 기술 · 스탯과 겹쳐 빈 키로 옮겼다(키 설정에서 바꾼다)
export const BLOOD_KEYS = { shot: "KeyF", smash: "Digit3", sword: "Digit4", veil: "KeyB", field: "KeyH", convert: "KeyN" };
