/* ── 히든 직업 Wyvern Knight 006(와이번 나이트 · 용기사) — 수치는 모두 여기 한 곳(11월 17일, 사용자 기획 「히든직업 002~006 통합기획안」 1부 요약 · 2부 5장) ─────────────
   규칙은 wyvernJob.js(방장 · 전용 서버 판정 꼴), 그림은 wyvernArt.js, 시트 규격은 wyvernPxData.js, 도트 시트는 design/effects/wyvern/make.py.
   Engineer 003 · Necromancer 004 와 같이 획득 방법 없이 격자 연습장에만(WYVERN.live = false). 해금 경로 · 저장 · 스냅샷 줄 · 관리자 명령어 · 유일 규칙 등록은 아직 없다.
   업데이트 노트 · 공지 · 패치노트 책에 적지 않는다(히든 직업).
   "정한 값"이라 적은 것은 기획안에 없어 정한 값이다(보고 대상). 그 밖은 기획안 2부 값 그대로.
   1부 요약에만 있는 두 기술(천공강습 · 아르카디온 용참섬멸)은 2부 표에 없어 수치를 모두 정했다.
   아르카디온은 11월 18일 사용자 지시("아르카디온은 레퀴엠처럼 장착하는 무기")로 손에 드는 전용 무기(WY_WEAPON_ITEM)가 됐다. 들어야 X 기술을 쓴다. */

import { HIDDEN_RANGE } from "./hiddenFamilyData.js";   // 히든 계열 전용 사거리(11월 20일)
export const WYVERN_NAME = "Wyvern Knight 006";
export const WYVERN_TITLE = "와이번 나이트";
export const WYVERN_ID = "wyvern";   // bag.hj.jobs 의 칸 이름

// 팔레트(기획안) — 기본 #BB3D3D · 보조 #EF9757 · 최고 연마 강조 #2C174F. 용비늘 · 화염 · 날개 · 용 그림자
export const WYVERN_COLORS = { deep: "#3A1418", base: "#BB3D3D", mid: "#D9654A", bright: "#EF9757", pale: "#F8D2A8", violet: "#2C174F", text: "#F4D9C6" };
// 연마 합계 — 75 와이번 비늘에 붉은 선(와이번 시트 줄 1) · 130 등에 보라 날개 잔상 · 150 진룡 동조
export const WYVERN_TINT = [{ from: 130, id: "wing" }, { from: 75, id: "line" }, { from: 0, id: "plain" }];

export const WYVERN = {
  live: false,                // 실제 게임 연결 — false 면 격자 연습장(sandbox 맵)에서만 켜진다
  maxLv: 200,
  blood: 100,                 // 용혈 최대
  bloodStart: 0,              // 전투 시작 용혈(기획안)
  // 직업 레벨 경험치(공통 제안) — 다음 레벨까지 10 + 지금 레벨. 일반 몹 1 · 사냥터 보스 10 · 토벌 · 월드보스 20 · 1분 120 까지
  xp: { base: 10, per: 1, mob: 1, boss: 10, raid: 20, perMin: 120 },
  // 연마 셋 — 0 조련 · 1 용혈 · 2 천공. 각 0~50 · 다음 레벨까지 100 + 20 × L · 유효한 시전 한 번에 +10(허수아비는 주지 않는다)
  train: { max: 50, base: 100, per: 20, cast: 10 },
  tint: { line: 75, wing: 130 },
  sync: 150,                  // 연마 합계 150 — 진룡 동조
  // 직업 레벨 해금 — 2부 표 그대로(용조격 1 · 계약 5 · 포효 15 · 급강하 30 · 수호 55 · 천공 지배 100 · 역린 150 · 용성 200).
  // 천공강습 75 · 아르카디온 125 는 정한 값(공통 구간의 빈 자리)
  unlock: { claw: 1, contract: 5, roar: 15, dive: 30, scale: 55, assault: 75, sky: 100, arcadion: 125, awake: 150, ult: 200 },
  lift: 34,                   // 입 · 손 높이(그림 시작점)
};
export const WY_TRAIN_NAMES = ["조련 연마", "용혈 연마", "천공 연마"];

/* 용혈 — 기본 공격 유효 적중 +6(휘두를 때 한 번) · 용염 포효 유효 적중 +10(시전당 한 번) · 와이번 자동 공격 유효 적중 +2(공격 한 번에 한 번).
   쓰러지면 0. 용혈 연마 25 — 얻는 양 +20%. 허수아비도 용혈을 준다(연습 대상에서 스킬을 써 볼 수 있게 — Necromancer 004 와 같다, 연마 경험치는 주지 않는다) */
export const WY_BLOOD = { claw: 6, roar: 10, wyvern: 2, sp25: 25, gain25: 0.2 };

/* 용조격(기본) — 공격 간격 0.55초 · 앞 160 · 부채꼴 95° · ×2.5. 0.12초에 참격(기획안 타임라인).
   arc 는 반각(라디안). max — 한 번에 맞는 수(정한 값, 그림자 낫과 같은 6) */
export const WY_CLAW = { name: "용조격", gap: 0.55, reach: HIDDEN_RANGE.wyvern, arc: (95 / 2) * Math.PI / 180, mul: 2.5, wind: 0.12, swing: 0.25, max: 6 };

/* 비룡의 계약(직업 레벨 5) — 용혈 30(30 아래면 못 쓴다) · 끝난 때부터 15초 · 30초 동안 1.5초마다 ×3.0 화염탄 · 찾는 거리 500.
   주인 뒤 60~120 을 따라다니고 650 넘게 떨어지면 주인 뒤로 다시 놓는다. 고도는 그림자와 그림의 화면 높이 차이로만(따로 Z 축 없음).
   조련 연마 25 — 자동 공격 ×4 · 50 — 유지 40초. 0.45초에 다 나타나고 그 뒤 첫 공격.
   hz 나는 높이(화면 px) · spd 따라가는 빠르기 · v 화염탄 빠르기 · back 주인 뒤 거리 · side 옆 거리 — 정한 값 */
export const WY_CONTRACT = { name: "비룡의 계약", cost: 30, cd: 15, dur: 30, dur50: 40, gap: 1.5, mul: 3.0, mul25: 4.0, seek: 500, sp25: 25, sp50: 50,
  back: [60, 120], far: 650, appear: 0.45, hz: 110, spd: 340, v: 620,
  mouth: [112, 7],
  // 앉기(11월 18일 사용자 "움직이지 않을 때는 앉아있는 모습") — 빠르기 speed(px/초) 아래로 wait 초 머물면 time 초에 걸쳐 내려앉고, 움직이면 같은 빠르기로 날아오른다.
  // sitMouth — 앉은 그림의 입 자리(땅 기준 화면 px, wy_sit 시트와 같다). 정한 값
  sit: { speed: 20, wait: 0.6, time: 0.45, mouth: [158, -65] } };   // 화염탄이 나가는 입 자리(와이번 자리에서 화면 px) — wy_wyvern · wy_sit 시트의 mouth 와 같다(11월 18일 자세 그림)

/* 용염 포효(직업 레벨 15) — 용혈 15 · 대기 9초 · 앞 350 · 부채꼴 90° · 0.15~0.90초 화염 박동 5번 ×3.0(합 ×15) · 맞히면 용혈 +10(시전당 한 번).
   1부 요약 — 포탈에서 용의 머리가 나와 앞으로 불을 뿜는다. 역린 해방 중 폭 +50%.
   와이번 소환 중이면 0.35초부터 와이번이 시전자 앞으로 두 번째 짧은 화염 갈래를 뿜는다 — 대상마다 ×8.0 한 번. 갈래 길이 · 각 · 맞는 때는 정한 값 */
export const WY_ROAR = { name: "용염 포효", cost: 15, cd: 9, reach: 350, arc: (90 / 2) * Math.PI / 180, n: 5, first: 0.15, gap: 0.1875, mul: 3.0,
  awakeArc: 0.5, sub: { at: 0.35, hit: 0.5, reach: 220, arc: (60 / 2) * Math.PI / 180, mul: 8.0 }, tail: 0.45, portal: 46 };   // portal — 시전자 앞 포탈 자리(정한 값)

/* 비룡 급강하(직업 레벨 30) — 용혈 30 · 대기 14초 · 착지 거리 520 · 반경 220 · ×26.0(와이번 동행 ×39.0, 용혈을 더 쓰지 않는다).
   0~0.25 오른다 · 0.25~0.55 날아가 0.55 착지 판정 · 0.55~0.85 균열 · 충격파. 벽을 넘지 않는다(가로막히면 그 앞에 내린다).
   역린 해방 중 0.70초 추가 폭발 ×10(같은 시전) · 천공 연마 25 반경 +20% · 50 끝(0.85초)에 날개 폭풍 ×12.
   inv — 처음 0.15초 회피(기획안 PvP 제안) · rise 오르는 높이(화면 px) — 정한 값 */
export const WY_DIVE = { name: "비룡 급강하", cost: 30, cd: 14, reach: 520, r: 220, mul: 26.0, mulJoint: 39.0, up: 0.25, land: 0.55, end: 0.85,
  extra: 0.7, extraMul: 10.0, sp25: 25, r25: 0.2, sp50: 50, stormMul: 12.0, inv: 0.15, rise: 120, near: 300 };

/* 용린 수호(직업 레벨 55) — 용혈 20 · 대기 25초 · 6초 동안 받는 PvE 피해 35% 감소 · 반격 최대 2번 ×5(때린 몹에게 화염 가시).
   반격 사이 간격 · 반격이 닿는 거리 — 정한 값. 사람(결투 · 사냥터 PvP)에게 맞은 피해는 줄이지 않고 반격도 하지 않는다(기획안 "PvE") */
export const WY_SCALE = { name: "용린 수호", cost: 20, cd: 25, dur: 6, cut: 0.35, counters: 2, mul: 5.0, gap: 0.5, reach: 420 };

/* 천공 지배(직업 레벨 100) — 용혈 40 · 대기 35초 · 추적 지점 반경 300 · 0.20~2.00초 화염 폭격 6번 ×7.0(합 ×42). 역린 해방 중 10번.
   추적 — 폭격마다 그때 영역 안에서 가장 가까운 적 자리로 떨어지고(없으면 정해진 무늬로 영역 안), 떨어진 자리 반경 blast 를 친다.
   착지 0.25초 전 작은 원형 예고. 사거리 · 폭발 반경 · 예고 시간은 정한 값 */
export const WY_SKY = { name: "천공 지배", cost: 40, cd: 35, reach: 600, r: 300, n: 6, nAwake: 10, first: 0.2, last: 2.0, mul: 7.0, blast: 120, warn: 0.25, tail: 0.6, near: 320 };

/* 역린 해방(직업 레벨 150) — 용혈 100 을 모두 · 대기 75초 · 15초(용혈 연마 50 → 20초) 반룡. 기술 피해 +70% · 걷는 빠르기 +25%.
   0~0.3 눈 · 0.3~0.7 비늘 · 0.7~1.0 날개 · 뿔. 기술 — 기본 공격(용조격)과 와이번 자동 공격을 뺀 모든 스킬(정한 해석).
   변신 중에도 용혈을 얻는다. 진룡 동조(연마 합계 150) — 변신 동안 와이번 자동 공격 +100% */
// 11월 18일 사용자 "와이번 소환 후 사용할 수 있게 · 용이 몸에 흡수되는 연출과 날개 · 꼬리가 생기는 연출" — 와이번이 곁에 있어야 쓰고(급강하 동행 중은 안 됨),
// 쓰면 와이번이 absorb 초에 걸쳐 몸으로 빨려 들어와 사라진다. 효과 · 지속은 누른 때부터, 날개 · 꼬리는 흡수가 끝난 뒤 wing 초에 걸쳐 돋는다(그림만)
export const WY_AWAKE = { name: "역린 해방", cost: 100, cd: 75, dur: 15, dur50: 20, sp50: 50, dmg: 0.7, spd: 0.25, form: 1.0, syncWyvern: 1.0, absorb: 0.8, wing: 0.45 };

/* 종언의 용성(직업 레벨 200) — 궁극기(sid "ult") · 용혈 0 · 대기 100초 · 착지 지점 반경 360.
   0~0.5 예고 원 → 0.5 오른다 → 0.9 첫 충돌 ×65 → 1.0~1.8 화염 폭발 5번 ×15 → 2.0 최종 ×65(합 ×205). 역린 해방 중 ×1.7(×348.5).
   진룡 동조 — 마지막 뒤 2.2초에 화염 균열 ×30 한 번. 와이번이 없으면 임시 비룡 연출만(소환물 아님). 사거리는 다른 궁극기와 같은 650(정한 값) */
export const WY_ULT = { name: "종언의 용성", cost: 0, cd: 100, reach: 650, r: 360, warn: 0.5, rise: 0.5, first: 0.9, firstMul: 65, n: 5, b0: 1.0, bGap: 0.2, bMul: 15,
  last: 2.0, lastMul: 65, awakeK: 1.7, crack: 2.2, crackMul: 30, tail: 0.8, near: 320 };

/* 천공강습(1부 요약 9번 — 직업 레벨 75, 모두 정한 값) — 용혈 25 · 대기 12초. 겨눈 쪽으로 380 을 0.4초에 돌진하며
   0.1초마다 둘레 150 을 4번 벤다(한 번 ×4.0, 합 ×16). 같은 대상은 한 번 벨 때 한 번. 벽 앞에서 멈춘다 */
export const WY_ASSAULT = { name: "천공강습", cost: 25, cd: 12, len: 380, time: 0.4, n: 4, r: 150, mul: 4.0 };

/* 아르카디온 · 용참섬멸(1부 요약 10번 — 직업 레벨 125, 모두 정한 값) — 용혈 20 · 대기 10초.
   용혈로 빚은 용의 대검을 불러 1타: 앞으로 180 을 0.15초에 짧게 돌진하며 가로로 벤다(반경 170 · 160° · ×8).
   앞에 적이 있으면 그 60 앞까지만 돌진한다. 2타: 0.35초에 다시 220 을 돌진해 반대 방향으로 더 세게 벤다(반경 190 · 160° · ×14).
   11월 18일부터 아르카디온(WY_WEAPON_ITEM)을 손에 들어야 쓴다 — 든 대검을 그대로 휘두른다 */
export const WY_ARCADION = { name: "아르카디온 · 용참섬멸", short: "아르카디온", cost: 20, cd: 10, arc: (160 / 2) * Math.PI / 180,
  stop: 60, hits: [{ at: 0, go: 180, time: 0.15, r: 170, mul: 8.0 }, { at: 0.35, go: 220, time: 0.17, r: 190, mul: 14.0 }], tail: 0.4 };

/* 아르카디온 — Wyvern Knight 006 전용 무기(11월 18일 사용자 "레퀴엠처럼 장착하는 무기"). 이 직업은 이 무기만 들 수 있고 다른 직업은 들 수 없다.
   크림슨 레퀴엠처럼 hold — 상점 · 특가 · 상자 · 관리자 자동 지급에 없고, hj 표시라 관리자 /지급 목록에도 없다(히든 직업 비밀).
   레벨 · 등급 · 올리는 양은 크림슨 레퀴엠과 같은 단계(정한 값). 손에 든 그림은 wyvernArt.js(시트 wy_blade), 가방 그림은 rpg/weapons/wy_arcadion.webp */
export const WY_WEAPON_ITEM = { id: "wy_arcadion", name: "아르카디온", t: "sword", lv: 100, g: 4, stat: "str", amt: 260, art: "wy_arcadion", hold: 1, hj: "wyvern" };

/* 조작 — 새 키 칸을 만들지 않고 기존 행동 키를 빌린다(기획안 "002~006 은 공통 슬롯"). 평타 키는 용조격.
   2부 표 일곱은 Gambler 002 와 같은 자리, 1부의 두 기술은 남는 칸 F(천공강습) · X(아르카디온 — 원래 무기 스킬 키)를 쓴다(정한 값) */
export const WY_SLOTS = [
  { s: "contract", act: "use1" },   // 기본 1
  { s: "roar", act: "use2" },       // 기본 2
  { s: "dive", act: "bSmash" },     // 기본 3
  { s: "scale", act: "bSword" },    // 기본 4
  { s: "sky", act: "use5" },        // 기본 R
  { s: "awake", act: "adv" },       // 기본 Z
  { s: "ult", act: "skill" },       // 기본 Shift
  { s: "assault", act: "bShot" },   // 기본 F
  { s: "arcadion", act: "wskill" }, // 기본 X
];
export const WY_SKILLS = { contract: WY_CONTRACT, roar: WY_ROAR, dive: WY_DIVE, scale: WY_SCALE, sky: WY_SKY, awake: WY_AWAKE, ult: WY_ULT, assault: WY_ASSAULT, arcadion: WY_ARCADION };
// 연출 · 입자 상한(그리기만) — 한 연출 · 한 프레임에 그리는 작은 입자 수. 넘으면 그 프레임은 더 그리지 않는다
export const WY_BITS = { perFx: 64, perFrame: 420 };
