/* 월드보스 등장 연출 수치 — 화면에만 그린다. 판정 · 체력 · 위치 · 공격 시간은 worldBoss.js 그대로다.
   ① 출현 예고: 월드보스가 새로 나오면 어느 맵에 있든 화면 가장자리가 보스 빛깔로 두 번 숨 쉬고 뿔피리 소리가 난다(글자는 기존 출현 알림).
   ② 입장 연출: 성역에 처음 들어가 불러오기 화면이 걷히면 보스마다 다른 모습으로 나타난다(WB_INTRO_SCENE).
   같은 출현(a.key)에는 한 번만 보여 준다. 다시 들어오거나 이미 싸우는 중이면 이름표만. 조작 · 카메라는 막지 않는다.
   재생 상태는 worldBossIntro.js, 보스 몸과 땅 효과는 worldBossArt.js, 소리는 sfx.js */
export const WB_INTRO = {
  life: 1.4,              // 본 연출 길이(초) — 0~0.4 예고, 0.4~1.0 드러남, 1.0~1.4 가장 강한 순간
  beat: [0.4, 1.0],       // 세 구간의 경계(초)
  tagHold: 1.2,           // 본 연출이 끝난 뒤 이름표가 더 남는 시간(초)
  again: 2.2,             // 다시 들어오거나 싸우는 중에 들어올 때 — 이름표만 이 시간 동안
  cardIn: 0.3, cardOut: 0.45,
  bar: 0.06,              // 위아래 띠 높이(화면 높이 몫) — 바닥 경고를 가리지 않게 얇게. 본 연출 동안만
  barIn: 0.3, barOut: 0.35, barAlpha: 0.85,
  trail: 0.5,             // 본 연출이 끝난 뒤 불씨 · 깃털 같은 남은 알갱이가 흩어지는 시간(초)
  forget: 12,             // 본 출현을 기억하는 수
  // 가장 강한 순간 — 화면 전체를 장악하는 번쩍임 · 보스 빛깔 물듦 · 집중선 · 화면 끝까지 퍼지는 충격파 · 붉은 문구
  slam: { flash: 0.7, flashT: 0.22, tint: 0.38, tintT: 0.9, lines: 46, linesT: 0.7, ringT: 0.8,
    text: 1.6, textIn: 0.16, textOut: 0.45, red: "#e02a32" },
  // 출현 예고 — 맵 어디서나
  pulse: { life: 2.6, beats: 2, alpha: 0.5, edge: 0.26 },   // 두 번 숨 쉬는 테두리 · 가장자리 두께(화면 짧은 변 몫)
};

/* 보스마다의 장면. peak — 가장 강한 순간(이름표가 뜬다), cues — [초, 소리 이름](sfx.js),
   shake — 가장 강한 순간 화면 흔들림(g.shake, 1 이 6px · 초당 1.6 줄어든다), dim — 드러나는 동안 바닥을 누르는 어둠(보스 · 캐릭터는 그대로 밝다),
   cry — 가장 강한 순간 화면 가운데 붉은 큰 문구, focus — 원화에서 얼굴 · 눈 · 중심의 자리(발밑 기준 px, 크기 700 기준),
   bits — 알갱이 수(화질 lod.q 를 곱한다) */
export const WB_INTRO_SCENE = {
  // 드래곤 — 앞쪽 부채꼴 열기 · 낮은 불씨 → 윤곽 · 얼굴과 목이 달아오름 → 포효와 함께 불씨가 앞으로 퍼짐(삼연 화염 숨결)
  dragon: { peak: 1.0, shake: 2.2, dim: 0.55, cry: "화염의 군주가 깨어났다", focus: [-70, -235], bits: 26, fan: { arc: 0.34, len: 380 },
    cues: [[0, "wbDragonBreath"], [1.0, "wbSlam"], [1.0, "wbDragonRoar"]] },
  // 뱀 — 옆으로 가로지르는 낮은 물결 → 몸통이 옆에서 스쳐 들어오고 머리부터 선명 → 쉿 소리 · 안개가 옆으로 쓸림(이중 꼬리 휩쓸기)
  serpent: { peak: 1.0, shake: 1.8, dim: 0.55, cry: "독왕이 고개를 들었다", focus: [-38, -270], bits: 14, slide: 260,
    cues: [[0, "wbSerpentScrape"], [1.0, "wbSlam"], [1.0, "wbSerpentHiss"]] },
  // 기계 — 어두운 실루엣 · 잠금장치 두 번 → 중심 청백 불빛 · 전류가 밖으로 → 기동음 · 짧은 진동(회전 십자 전류)
  machine: { peak: 1.0, shake: 2.4, dim: 0.55, cry: "고대 병기가 다시 움직인다", focus: [-30, -160], bits: 10, reach: 250,
    cues: [[0.05, "wbMachineLock"], [0.25, "wbMachineLock"], [0.45, "wbMachineCharge"], [1.0, "wbSlam"], [1.0, "wbMachineBoot"]] },
  // 뇌조 — 날개 그림자가 바닥을 가로지름 · 바람 → 위에서 빠르게 내려옴 → 날갯짓 · 깃털이 바깥으로(뇌광 급강하)
  thunderbird: { peak: 1.0, shake: 2.0, dim: 0.5, cry: "폭풍이 내려앉았다", focus: [0, -300], bits: 18, drop: 560,
    cues: [[0, "wbWind"], [1.0, "wbSlam"], [1.0, "wbFlap"]] },
  // 공허 — 가는 보라 틈 · 먼지가 끌려감 → 틈이 가로로 벌어지며 검은 실루엣 · 주변이 어두워짐 → 눈이 켜짐 · 낮은 충격음(중력 붕괴)
  void: { peak: 1.0, shake: 2.2, dim: 0.75, cry: "공허가 눈을 떴다", focus: [0, -315], bits: 24, slit: 300,
    cues: [[0, "wbVoidTear"], [1.0, "wbSlam"], [1.0, "wbVoidOpen"]] },
};

// 이름표 둘째 줄 — 보스마다 한 줄 소개(새 보스는 여기와 WB_INTRO_SCENE 에 더한다. 없으면 공격 목록 sub 를 쓴다)
export const WB_INTRO_LINE = {
  dragon: "하늘을 태우는 불길의 주인",
  serpent: "늪을 삼키는 독왕",
  machine: "멈추지 않는 고대 번개 병기",
  thunderbird: "폭풍을 몰고 오는 하늘의 사냥꾼",
  void: "모든 것을 지켜보는 공허의 눈",
};
