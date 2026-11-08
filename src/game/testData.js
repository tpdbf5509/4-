/* ── RPG 테스트 모드(?test) — 문구 · 목록은 여기 한 곳 ─────────────────────────────
   주소에 ?test 를 붙여 들어온 사람만 쓴다(src/net/testMode.js TEST_MODE). 일반 주소에서는 버튼도 보이지 않는다.
   테스트 모드는 따로 떨어진 RPG 서버 방(TEST_SERVER)에 들어간다. 그 방은 캐릭터를 장부에서 읽기만 하고 저장하지 않는다(server/src/room.js test).
   거래 · 길드 · 장터 · 탑 주간 보상 · 계정 만들기 · 지우기도 막는다. 화면은 이 기기 기록(localStorage)도 고치지 않는다.
   기능 규칙은 rpg.js(rpgTrain 의 test 처리 · hurtHero 무적 · trainLog) — 훈련장 기능을 모든 맵으로 넓힌 것이다. */

export const TEST_SERVER = "RPGT";   // 테스트 전용 서버 방 이름 — 일반 서버(RPG1~RPG4)와 섞이지 않는다

// 테스트 도구 창의 켜기/끄기 — id 는 h.trn 의 키(훈련장과 같은 값). 테스트 서버에서는 어느 맵에서나 듣는다
export const TEST_TOGGLES = [
  { id: "god", name: "무적", note: "어떤 공격에도 체력이 줄지 않고 쓰러지지 않습니다" },
  { id: "nocd", name: "쿨타임 끄기", note: "평타를 뺀 모든 스킬 · 대쉬 대기 시간이 바로 0" },
  { id: "stack", name: "스택 가득", note: "무기 패시브 쌓인 것을 늘 최대로" },
];

// 장소 이동 — 묶음 이름과 고르는 규칙. 맵이 늘어나도 MAPS 에서 저절로 모인다(rpg.js testSpots).
// 던전 · 결투장 · 레이스 · 길드 칸은 입장 규칙(파티 · 상대 · 길드)이 있어 뺀다
export const TEST_GROUPS = [
  { name: "마을 · 광장", pick: (m) => !m.zone && !m.story },
  { name: "사냥터 1~400", pick: (m) => !!m.zone && !m.deep },
  { name: "사냥터 400~800", pick: (m) => !!m.zone && !!m.deep && !m.high },
  { name: "사냥터 800~1200", pick: (m) => !!m.zone && !!m.high },
  { name: "이야기 장소", pick: (m) => !!m.story },
];
