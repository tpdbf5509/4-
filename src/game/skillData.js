/* ── RPG 직업 스킬 · 전설 무기 스킬 — 수치는 모두 여기 한 곳 ─────────────
   직업 스킬은 스킬 상점 "직업" 탭에서 배운다(제 직업 것만). 가방 "스킬" 탭의 직업 칸(use5 · 기본 R) 하나에 넣어 쓴다(shop.js SKILL_SLOTS).
   무기 스킬은 전설 특별 무기(검 다섯 · 지팡이 넷 · 활 넷)를 들면 쓴다. 키는 wskill(기본 X). 여러 번 누르는 연계는 rpg.js w.cmb
   피해는 SKILL_USE.base(shopData.js) × 스탯 배율 × mul. 규칙은 rpg.js(rpgUseSkill · rpgWeaponSkill · 무기 패시브),
   연출은 skillArt.js. */

const LV5 = (a, b) => [0, 1, 2, 3, 4].map((i) => Math.round((a + ((b - a) * i) / 4) * 100) / 100);
const GOLD = [600, 1200, 2400, 4800, 9600];
const NEED_LV = [20, 30, 45, 60, 80];

// 직업 스킬 — shopData.js SKILLS 에 붙여 상점 · 가방 · 스킬 칸이 함께 쓴다(fam "job").
// kind 가 없으면 산 스킬과 같은 셈(돌진 베기는 lunge + splash). kind: line 앞으로 한 줄 · guard 받는 피해 감소 · volley 여러 발 · leap 뒤로 물러나며 쏘기 · orb 큰 구슬 · chain 연쇄 번개 · shield 보호막
export const JOB_SKILLS = [
  // 전사
  { id: "j_rush", job: "warrior", name: "돌진 베기", note: "가장 가까운 적에게 달려가 둘레를 벤다",
    use: { key: 5, cd: 9, dmg: "str", lunge: { reach: 320, time: 0.18 }, splash: 120, mul: LV5(2.4, 4.4) } },   // 급소 찌르기와 같은 돌진 · 닿은 자리 둘레 splash 를 모두
  { id: "j_cleave", job: "warrior", name: "대지 가르기", note: "앞으로 땅을 갈라 한 줄의 적을 모두 친다",
    use: { key: 6, cd: 7, kind: "line", dmg: "str", len: 320, width: 70, mul: LV5(2.2, 4) } },
  { id: "j_iron", job: "warrior", name: "철벽", note: "잠시 받는 피해를 크게 줄인다",
    use: { key: 7, cd: 25, kind: "guard", dur: 4, cut: LV5(0.4, 0.6) } },
  // 궁수
  { id: "j_pierce", job: "archer", name: "관통 화살", note: "앞으로 꿰뚫는 화살 · 한 줄의 적을 모두 친다",
    use: { key: 5, cd: 7, kind: "line", dmg: "str", len: 460, width: 50, mul: LV5(2, 3.6), arrow: 1 } },
  { id: "j_volley", job: "archer", name: "연사", note: "가장 가까운 적에게 화살 다섯 발을 잇달아 쏜다",
    use: { key: 6, cd: 9, kind: "volley", dmg: "str", n: 5, gap: 0.14, mul: LV5(0.7, 1.15) } },
  { id: "j_leap", job: "archer", name: "후퇴 사격", note: "뒤로 물러나며 가장 가까운 적을 쏘고 느리게 한다",
    use: { key: 7, cd: 8, kind: "leap", dmg: "str", back: 200, time: 0.2, slow: 2, mul: LV5(1.6, 2.8) } },
  // 마법사
  { id: "j_orb", job: "mage", name: "원소 구체", note: "큰 원소 구슬을 던져 맞은 자리 둘레를 친다",
    use: { key: 5, cd: 8, kind: "orb", dmg: "int", splash: 140, mul: LV5(2.4, 4.2) } },
  { id: "j_chain", job: "mage", name: "연쇄 번개", note: "번개가 적 사이를 다섯 번 옮겨 다닌다 · 옮길 때마다 약해진다",
    use: { key: 6, cd: 9, kind: "chain", dmg: "int", jumps: 5, hop: 190, fall: 0.8, mul: LV5(2, 3.4) } },
  { id: "j_shield", job: "mage", name: "마나 보호막", note: "최대 체력의 일부만큼 피해를 막는 보호막",
    use: { key: 7, cd: 28, kind: "shield", dur: 6, amt: LV5(0.3, 0.5) } },
].map((s) => ({ ...s, kind: "active", fam: "job", gold: GOLD, lv: NEED_LV, need: [40, 60, 80, 100, 130] }));
export const JOB_KEYS = { 5: "R", 6: "F", 7: "G" };    // 상점 설명에 보이는 기본 키

/* 전설 무기 스킬 — 특별 무기 id 로 찾는다. passive 는 무기를 든 동안 늘, skill 은 wskill 키로 쓴다 */
export const WEAPON_SKILLS = {
  frost: {
    name: "빙판길", role: "제어와 추격 차단",
    passive: { name: "서리의 흔적", note: "맞히면 이동 속도를 줄인다 · 맞힐 때마다 0.5초씩 쌓여 최대 2초", per: 0.5, max: 2 },
    skill: { note: "앞에 4초 동안 빙판 · 위의 적은 느려지고 지속 피해", cd: 12, dur: 4, ahead: 150, r: 130, slow: 0.5, tick: 0.5, mul: 0.45 },   // 0.5초마다 mul 만큼 피해
    elem: { frost: 1.5, note: "얼음 캐릭터는 빙판의 둔화와 지속 피해가 1.5배" },
  },
  flame: {
    name: "화염베기", role: "화상 폭발",
    passive: { name: "잔불 수확", note: "몹을 잡거나 결투에서 평타를 맞히면 불똥 1개 · 3개면 다음 평타에 불꽃 회오리", need: 3, max: 30, r: 150, mul: 2.2 },
    skill: { note: "0.7초 동안 둘레를 10번 몰아 베고 불똥 9개", cd: 14, dur: 0.67, hits: 10, r: 150, mul: 0.56, embers: 9 },   // 기획 영상과 같은 빠르기(0.067초마다 한 번 · 10번) · 모두 합친 피해는 8번 × 0.7 과 같다
    dot: 0.5,                                         // 든 동안 화상 · 독 피해 +50%
    elem: { flame: 1.3, note: "불 캐릭터는 화상에 걸린 적에게 회오리 · 화염베기 피해 1.3배" },
  },
  star: {
    name: "유성 낙하", role: "마력 충전과 폭발",
    passive: { name: "별의 축적", note: "맞힐 때마다 별빛 1 · 최대 999", max: 999 },
    skill: { note: "별빛을 모두 써서 유성 여러 개를 흩뿌린다 · 많이 모을수록 넓고 많고 세다(10 이상)", cd: 10, min: 10, reach: 360, r0: 90, rPer: 0.14, rMax: 260, mul0: 1.5, mulPer: 0.012, mulMax: 13,
      // 유성 수 = n0 + 별빛 nPer 마다 1(최대 nMax) · 하나는 넓이 rEach 배 · 피해 each 배(겹쳐 맞으면 더 아프다) · gap 초마다 하나씩
      n0: 3, nPer: 100, nMax: 9, rEach: 0.5, each: 0.5, gap: 0.12 },
    note: "모든 원소가 충전한다 · 원소 효과는 없고 마법력과 충전량으로 셈한다",
  },
  shadow: {
    name: "종말의 연격", role: "근접 콤보 · 강력한 마무리",
    // 직업 스킬이 맞히면 짧게 경직(stun 초)시키고 낙인(dur 초)을 남긴다 — 마무리 일격에 bonus 만큼 더(낙인은 쓰면 사라진다)
    passive: { name: "파괴의 낙인", note: "직업 스킬로 적을 경직시키면 낙인 · 낙인이 있는 적에게 마무리 일격 피해 +80%", stun: 0.35, dur: 4, bonus: 0.8 },
    // 세 번 누른다 — 1타 경직 · 2타 반대로 베며 밀어내기 · 마무리 내려치기. 빗나가면 연계가 끝난다
    // gap — 다음 입력까지 남는 시간. 마무리는 2타 뒤 perfect[0]~[1] 초 사이에 누르면 정확한 타이밍(perfectMul 배)
    skill: { note: "1타 경직 · 2타 밀어내기 · 마무리 내려치기 — 빗나가면 연계 끝 · 마무리는 고리가 금빛일 때 누르면 더 세다",
      cd: 10, gap: 1.6, r: 150, arc: 1.25, mul1: 1.2, stun1: 0.5, mul2: 1.4, push: 130, mul3: 2.6, slamR: 120, slamAt: 70,
      perfect: [0.35, 0.75], perfectMul: 1.5, finGap: 1.2 },
    note: "그림자가 칼을 휘감는다 · 직업 스킬로 낙인을 남긴 뒤 연격으로 마무리",
  },
  holy: {
    name: "심판의 반격", role: "방어 · 반격 · 역전",
    passive: { name: "수호의 반격", note: "반격 자세에서 공격을 받으면 막아 내고 바로 벤다 · 그 뒤 추가 입력 기회" },
    // 자세(stance 초) 안에 맞으면 그 공격을 막고 둘레 r 를 벤다(mul · 경직 stun). 그 뒤 gap 초 안에
    // 무기 스킬 키 → 내려치기(slam) · 평타 키 → 밀어내기(push). 자세 동안 맞지 않으면 아무 일도 없다
    skill: { note: "짧은 반격 자세 · 그동안 맞으면 막고 벤다 · 이어서 X 내려치기 또는 평타로 밀어내기",
      cd: 10, stance: 0.8, r: 160, mul: 1.6, stun: 0.4, gap: 1.5, inv: 0.3,
      slam: { r: 130, at: 70, mul: 3, stun: 0.6 }, push: { len: 260, width: 80, mul: 1.8, dist: 200 } },
    note: "상대가 공격하지 않으면 반격도 없다 · 등 뒤로 천사의 날개가 펼쳐진다",
  },
  // 지팡이 넷 — 마법사용(지팡이 묶음). 피해는 마법력(magMul)으로 셈한다. "앞" 은 바라보는(겨눈) 쪽
  flame_staff: {
    name: "화염방사", role: "설치 · 유도 · 폭발 타이밍",
    // 맞힌 자리에 잔화(r · life 초) — tick 초마다 mul 만큼 태운다. 한 사람 잔화는 gap 초에 하나 · 동시에 max 개
    passive: { name: "잔화", note: "공격이 맞은 자리에 잠깐 잔화가 남아 위의 적을 태운다", r: 50, life: 1.6, tick: 0.4, mul: 0.15, gap: 0.4, max: 4 },
    // dur 초 동안 tick 초마다 앞으로 부채꼴(len · 반각 half 라디안) — 가까울수록 세다(near → far 배)
    skill: { note: "2초 동안 앞으로 화염을 뿜는다 · 가까울수록 세고 닿은 적은 느려진다",
      cd: 10, dur: 2, tick: 0.1, len: 270, half: 0.45, mul: 0.11, near: 1.6, far: 0.5, slow: 0.6, slowAmt: 0.4 },
  },
  thunder_staff: {
    name: "전류 방출", role: "타이밍 입력 · 빠른 연계",
    // 스킬이 맞으면 전류 1 · 최대 max · fade 초 동안 더 맞히지 못하면 사라진다
    passive: { name: "전류 축적", note: "전류 구체가 맞으면 전류 1 · 최대 3 · 6초 동안 못 맞히면 사라진다", max: 3, fade: 6 },
    // charge 초 마법진 → 앞으로 구체(빠르기 v · 거리 range · 맞는 둘레 hitR). 맞은 뒤 win 초 안에 그 적을 평타로 맞히면
    // 전류 폭발(boomR, 전류 3이면 boomR3) — 피해 boom × (1 + 전류 × perZap)
    skill: { note: "마법진을 그린 뒤 앞으로 전류 구체 · 맞은 적을 평타로 치면 전류 폭발(전류 3이면 넓게)",
      cd: 7, charge: 0.35, v: 720, range: 540, hitR: 34, mul: 2.2, win: 2.5, boom: 1.6, perZap: 0.25, boomR: 100, boomR3: 180 },
    note: "구체는 피할 수 있다 · 평타를 놓치면 폭발도 없다",
  },
  galaxy_staff: {
    name: "차원 붕괴", role: "스킬 조합 · 지연 폭발",
    // 공격 스킬이 맞은 자리에 균열(life 초 뒤 r 둘레 폭발, mul) — 한 사람 gap 초에 하나
    passive: { name: "차원 균열", note: "공격 스킬이 맞은 자리에 균열 · 잠시 뒤 폭발한다(자리 · 예고가 보인다)", r: 85, life: 1.2, mul: 0.8, gap: 0.8 },
    // 앞으로 구체 — 맞으면 중력 속박(bind 초). 빗나가면 끝자리에 균열(keep 초). 다시 누르면 균열마다 평타(basic 배)가 나간다
    skill: { note: "앞으로 차원 구체 · 맞으면 중력으로 속박 · 빗나가면 균열 · 다시 누르면 균열에서 평타가 나간다",
      cd: 9, v: 560, range: 480, hitR: 36, mul: 2, bind: 1.4, keep: 3, gap: 3, reach: 320, basic: 1.5 },
    note: "균열에는 자리와 폭발 예고가 보여 피할 수 있다",
  },
  holy_staff: {
    name: "성역 방출", role: "방어 자원 관리 · 공격 전환",
    // 평타가 맞으면 최대 체력 per 만큼 보호막(최대 cap · dur 초)
    passive: { name: "성역 축적", note: "평타가 맞으면 보호막이 쌓인다(최대 체력 3%씩 · 최대 30%)", per: 0.03, cap: 0.3, dur: 10 },
    // 보호막을 모두 써서 앞으로 신성 에너지 — 쓴 몫(최대 cap)이 클수록 길고 넓고 세다. 맞으면 띄운다(air 초)
    skill: { note: "보호막을 모두 써서 앞으로 신성 에너지 · 맞으면 띄운다 · 많이 쓸수록 넓다",
      cd: 8, len0: 260, lenPer: 900, w0: 50, wPer: 300, mul0: 1.5, mulPer: 8, air: 0.9 },
    note: "강한 공격을 위해 방어를 내려놓는다 · 빈틈을 보고 쓴다",
  },
  // 활 넷 — 궁수용(활 묶음). 피해는 물리력(skillBase)으로 셈한다
  lava_bow: {
    name: "관통 연사", role: "조준 · 연속 입력 · 마무리",
    passive: { name: "관통 표식", note: "화살을 이어 맞히면 표식 · 최대 3 · 3초 동안 공격하지 않으면 사라진다", max: 3, fade: 3 },
    // 1타 빠른 화살(구체처럼 날아가 피할 수 있다) → 맞으면 gap 초 안에 다시 눌러 관통 화살(한 줄 len · width)
    skill: { note: "빠른 화살 · 맞으면 다시 눌러 강한 관통 화살 · 표식 3이면 마지막 화살 피해 +60%",
      cd: 8, v: 1100, range: 560, hitR: 28, mul1: 1.6, gap: 1.5, len: 620, width: 40, mul2: 2.8, mark3: 1.6 },
  },
  shadow_bow: {
    name: "잔영 추격", role: "추격 · 공중 연계",
    // 경직 · 띄움 · 속박 상태인 적을 맞히면 그림자 화살 한 발 더(mul) — 걸린 동안 한 번만
    passive: { name: "잔영", note: "스킬로 경직된 적을 맞히면 화살이 한 발 더 날아간다(걸린 동안 한 번)", mul: 1.2, delay: 0.15 },
    skill: { note: "그림자 화살 · 맞은 적을 띄우고 추가 화살이 따라간다",
      cd: 8, v: 900, range: 520, hitR: 32, mul: 2.2, air: 0.8 },
    note: "추가 화살은 한 번만 — 공중 연계를 끝없이 잇지 못한다",
  },
  star_bow: {
    name: "성좌 관통", role: "조준 유지 · 정밀 사격",
    // 맞히면 조준 +1 · 빗나가면 -1 · 걷는 동안 walk 초마다 -1. 하나에 피해 +per
    passive: { name: "별의 조준", note: "이어 맞히면 조준 단계가 오른다(하나에 피해 +5% · 최대 5) · 걷거나 빗나가면 내려간다", max: 5, per: 0.05, walk: 1 },
    // 누르면 조준 자세(최대 hold 초) — 움직이면 취소(grace 초 뒤부터). 다시 누르면 앞으로 한 줄 화살. full 초를 채우면 가장 세다
    skill: { note: "조준 자세 · 움직이면 취소 · 다시 누르면 앞으로 성좌 화살 · 오래 조준할수록 세다(2초에 가장 세다)",
      cd: 9, cancelCd: 3, hold: 3, grace: 0.15, full: 2, len: 720, width: 36, mul: 2.4, max: 2.5 },
    note: "조준하는 동안 상대가 피하거나 다가올 수 있다",
  },
  gold_bow: {
    name: "비상 연계", role: "회피 · 반격 · 기동전",
    // 대쉬 뒤 win 초 안에 맞히면 비상 연계 대기 시간 -cut 초(대쉬 한 번에 한 번)
    passive: { name: "비상의 리듬", note: "대쉬 뒤 1초 안에 맞히면 비상 연계 대기 시간 4초 줄임", win: 1, cut: 4 },
    // 1 뒤로 도약(back · time)하며 앞으로 화살 → 내려앉은 뒤 gap 초 안에 2 앞으로 나아가며(fwd) 화살 →
    // 둘 다 맞으면 gap 초 안에 3 부채꼴 화살(fan 발 · 벌어짐 spread 라디안). 방향은 처음 겨눈 쪽으로 고정
    skill: { note: "뒤로 도약하며 화살 → 앞으로 나아가며 화살 → 둘 다 맞으면 부채꼴 화살 · 방향은 처음 겨눈 쪽",
      cd: 10, back: 190, time: 0.25, fwd: 150, gap: 1.2, v: 1000, range: 520, hitR: 28, mul: 1.4, fan: 5, spread: 0.55, fanMul: 1.1 },
    note: "연계 중에는 방향을 바꿀 수 없다 · 상대는 도약 길을 읽어 노릴 수 있다",
  },
};
