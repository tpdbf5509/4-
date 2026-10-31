/* ── RPG 칭호 · 파티 · 채팅 — 숫자와 목록은 이 파일 한 곳에서 고친다 ─────────────
   규칙(방장 판정)은 rpg.js, 창은 src/RpgView.jsx 에 있다. */

/* 칭호 — 조건을 채우면 얻고, 하나를 골라 이름 아래에 단다. 겉모습만 바뀌고 능력치는 그대로다.
   need 의 열쇠: lv 레벨 · coins 가진 코인 · rabbit / wolf / boar / gorilla / goblin / orc / ogre 잡은 수(보스 포함) · boss 보스 · quest 퀘스트 완료 · party 파티로 잡은 수 · pvp 결투에서 이긴 수 · req 광장 의뢰 완료.
   스냅샷은 이 목록의 차례로 칭호를 싣는다 — 새 칭호는 맨 뒤에만 더하고, 차례를 바꾸거나 지우지 않는다(30개까지). */
import { CODEX_IDS, CODEX_FIELD_IDS, CODEX_NEED_NAME } from "./codexData.js";

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
  { id: "pvp10", name: "결투가", need: { pvp: 10 } },
  { id: "pvp100", name: "결투장의 주인", need: { pvp: 100 } },
  { id: "lv150", name: "역전의 사냥꾼", need: { lv: 150 } },
  { id: "lv200", name: "살아 있는 전설", need: { lv: 200 } },
  { id: "goblin100", name: "고블린 사냥꾼", need: { goblin: 100 } },
  { id: "orc100", name: "오크 사냥꾼", need: { orc: 100 } },
  { id: "ogre100", name: "오우거 사냥꾼", need: { ogre: 100 } },
  { id: "req30", name: "광장의 해결사", need: { req: 30 } },
  // 숨은 칭호 — 직업과 다른 무기를 들면 얻는다(off: "직업:무기 묶음", shopData.js WEAPON_FAMILY).
  // secret 은 얻기 전에는 칭호 창에 보이지 않는다. 업데이트 노트에도 적지 않는다
  { id: "off_wb", name: "칼은 장식품", need: {}, off: "warrior:bow", secret: 1 },
  { id: "off_ws", name: "호그와트 검술과", need: {}, off: "warrior:staff", secret: 1 },
  { id: "off_aw", name: "화살값 아끼는 중", need: {}, off: "archer:sword", secret: 1 },
  { id: "off_as", name: "마법소녀 오디션", need: {}, off: "archer:staff", secret: 1 },
  { id: "off_mb", name: "마법보다 장력", need: {}, off: "mage:bow", secret: 1 },
  { id: "off_mw", name: "주문 외우기 귀찮음", need: {}, off: "mage:sword", secret: 1 },
  // 200~400레벨 사냥터(언데드 · 인조 몬스터)
  { id: "skeletal100", name: "스켈레톤 사냥꾼", need: { skeletal: 100 } },
  { id: "zombie100", name: "좀비 사냥꾼", need: { zombie: 100 } },
  { id: "necro100", name: "마법사 사냥꾼", need: { necro: 100 } },
  { id: "golem100", name: "골렘 사냥꾼", need: { golem: 100 } },
  { id: "chimera100", name: "키메라 사냥꾼", need: { chimera: 100 } },
  { id: "spider100", name: "거미 사냥꾼", need: { spider: 100 } },
  { id: "lv300", name: "죽음을 넘어선 자", need: { lv: 300 } },
  { id: "lv400", name: "끝에 선 자", need: { lv: 400 } },
  // 400~800레벨 사냥터(화염 · 심연, deepData.js)
  { id: "fspirit100", name: "불씨를 끈 자", need: { fspirit: 100 } },
  { id: "lavagolem100", name: "용암을 건넌 자", need: { lavagolem: 100 } },
  { id: "firedrake100", name: "용 사냥꾼", need: { firedrake: 100 } },
  { id: "ifrit100", name: "불꽃 정복자", need: { ifrit: 100 } },
  { id: "wraith100", name: "망령 퇴치자", need: { wraith: 100 } },
  { id: "abyss100", name: "심해 탐험가", need: { abyss: 100 } },
  { id: "voidmage100", name: "공허를 본 자", need: { voidmage: 100 } },
  { id: "fallen100", name: "천사 사냥꾼", need: { fallen: 100 } },
  { id: "lv600", name: "계몽한 자", need: { lv: 600 } },
  { id: "lv800", name: "모든 것을 넘어선 자", need: { lv: 800 } },
  // 도감 · 업적 보상(codexData.js ACHIEVES 의 title 과 같은 조건)
  { id: "dexall", name: "살아 있는 도감", need: { dex: CODEX_IDS.length } },
  { id: "dex100", name: "도감의 주인", need: { dex100: CODEX_FIELD_IDS.length } },
  { id: "dg100", name: "던전 정복자", need: { dg: 100 } },
  { id: "boss1000", name: "우두머리 수집가", need: { boss: 1000 } },
];
// 칭호는 스냅샷에 비트로 싣는다 — 한 숫자에 TITLE_BITS 개까지, 넘는 것은 줄 끝(45)의 둘째 숫자에
export const TITLE_BITS = 31;
export const TITLE_BY_ID = Object.fromEntries(TITLES.map((t) => [t.id, t]));
// 잡은 수 · 완료 수 — 캐릭터 기록에 남는다. 스냅샷에는 이 차례로 싣는다(뒤에만 더한다)
export const REC_IDS = ["rabbit", "wolf", "boar", "boss", "quest", "party", "gorilla", "pvp", "goblin", "orc", "ogre", "req", "gramor", "dg", "argas", "morgas", "barkanon", "serka", "skeleton", "dummy",
  "skeletal", "zombie", "necro", "golem", "chimera", "spider", "guild_slime", "guild_siren", "guild_phoenix",
  "fspirit", "lavagolem", "firedrake", "ifrit", "wraith", "abyss", "voidmage", "fallen"];
// 조건 이름 — 칭호 창에 "토끼 37/100" 처럼 보인다
export const NEED_NAME = {
  lv: "레벨", coins: "코인", rabbit: "토끼", wolf: "늑대", boar: "멧돼지", boss: "보스", quest: "퀘스트", party: "파티 사냥", gorilla: "고릴라", pvp: "결투 승리",
  goblin: "고블린", orc: "오크", ogre: "오우거", req: "광장 의뢰", gramor: "그라모르", dg: "던전 완료", argas: "아르가스", morgas: "모르가스", barkanon: "바르카논", serka: "세르카", skeleton: "해골", dummy: "허수아비",
  skeletal: "스켈레톤", zombie: "좀비", necro: "언데드 마법사", golem: "골렘", chimera: "키메라", spider: "포식거미",
  fspirit: "불정령", lavagolem: "용암골렘", firedrake: "화염룡", ifrit: "이프리트", wraith: "망령기사", abyss: "심해괴수", voidmage: "공허술사", fallen: "타락천사",
  guild_slime: "강화된 슬라임", guild_siren: "바다세이렌", guild_phoenix: "불사조",
  ...CODEX_NEED_NAME,
};

/* 파티 — 같은 맵에 있는 파티원이 몹을 잡으면 나도 그 경험치의 share 만큼 받는다(그 몹을 친 사람은 모두 경험치 · 코인을 다 받는다).
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
