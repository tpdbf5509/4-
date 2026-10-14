/* ── RPG 칭호 · 파티 · 채팅 — 숫자와 목록은 이 파일 한 곳에서 고친다 ─────────────
   규칙(방장 판정)은 rpg.js, 창은 src/RpgView.jsx 에 있다. */

/* 칭호 — 조건을 채우면 얻고, 하나를 골라 이름 아래에 단다. 겉모습만 바뀌고 능력치는 그대로다.
   need 의 열쇠: lv 레벨 · coins 가진 코인 · rabbit / wolf / boar / gorilla 잡은 수(보스 포함) · boss 보스 · quest 퀘스트 완료 · party 파티로 잡은 수.
   스냅샷은 이 목록의 차례로 칭호를 싣는다 — 새 칭호는 맨 뒤에만 더하고, 차례를 바꾸거나 지우지 않는다(30개까지). */
export const TITLES = [
  { id: "rookie", name: "새싹 모험가", need: { lv: 1 } },
  { id: "lv10", name: "견습 사냥꾼", need: { lv: 10 } },
  { id: "lv30", name: "숙련 사냥꾼", need: { lv: 30 } },
  { id: "lv50", name: "노련한 사냥꾼", need: { lv: 50 } },
  { id: "lv100", name: "전설의 사냥꾼", need: { lv: 100 } },
  { id: "rabbit100", name: "토끼 사냥꾼", need: { rabbit: 100 } },
  { id: "rabbit1000", name: "토끼의 천적", need: { rabbit: 1000 } },
  { id: "wolf100", name: "늑대 사냥꾼", need: { wolf: 100 } },
  { id: "wolf1000", name: "늑대의 천적", need: { wolf: 1000 } },
  { id: "boar100", name: "멧돼지 사냥꾼", need: { boar: 100 } },
  { id: "boar1000", name: "멧돼지의 천적", need: { boar: 1000 } },
  { id: "boss1", name: "우두머리 사냥꾼", need: { boss: 1 } },
  { id: "boss30", name: "왕을 쓰러뜨린 자", need: { boss: 30 } },
  { id: "quest10", name: "사냥꾼의 일꾼", need: { quest: 10 } },
  { id: "quest100", name: "사냥꾼의 오른팔", need: { quest: 100 } },
  { id: "party100", name: "든든한 동료", need: { party: 100 } },
  { id: "rich", name: "큰손", need: { coins: 100000 } },
  { id: "gorilla100", name: "고릴라 사냥꾼", need: { gorilla: 100 } },
  { id: "gorilla1000", name: "고릴라의 천적", need: { gorilla: 1000 } },
];
export const TITLE_BY_ID = Object.fromEntries(TITLES.map((t) => [t.id, t]));
// 잡은 수 · 완료 수 — 캐릭터 기록에 남는다. 스냅샷에는 이 차례로 싣는다(뒤에만 더한다)
export const REC_IDS = ["rabbit", "wolf", "boar", "boss", "quest", "party", "gorilla"];
// 조건 이름 — 칭호 창에 "토끼 37/100" 처럼 보인다
export const NEED_NAME = {
  lv: "레벨", coins: "코인", rabbit: "토끼", wolf: "늑대", boar: "멧돼지", boss: "보스", quest: "퀘스트", party: "파티 사냥", gorilla: "고릴라",
};

/* 파티 — 같은 맵에 있는 파티원이 몹을 잡으면 나도 그 경험치의 share 만큼 받는다(코인은 잡은 사람만).
   max 명까지. 초대는 inviteT 초 동안 기다린다. */
export const PARTY = { max: 4, share: 0.5, inviteT: 30 };

/* 채팅 — 방장을 거치지 않고 서버의 모두에게 바로 보낸다.
   실시간 서버는 초당 메시지 수에 한도가 있어 gap 초에 한 번만 보낼 수 있다. */
export const CHAT = {
  max: 60,        // 한 번에 보낼 수 있는 글자 수
  gap: 1,         // 보내는 간격(초)
  keep: 50,       // 기억하는 줄 수
  show: 6,        // 채팅 칸에 보이는 줄 수
  fade: 12,       // 입력하지 않을 때 이만큼(초) 지난 줄은 흐려진다
  bubble: 4,      // 머리 위 말풍선이 떠 있는 시간(초)
};
