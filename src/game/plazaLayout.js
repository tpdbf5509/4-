/* 광장 배치 두 벌 — 지금 배치는 각 데이터 파일에 그대로 적혀 있고, 새 배치(11월 28일 광장 리뉴얼)는 이 파일 NEW 한 곳에 둔다.
   계획서 notes/광장-리뉴얼-계획서.md 2장 · 구역도 notes/광장-리뉴얼/새-구역도.png.
   어느 배치를 쓸지는 불러올 때 한 번 정한다 — 화면은 ?test(TEST_MODE), 서버는 테스트 전용 워커(server/wrangler.test.toml 의 __PLAZA_NEW__).
   같은 워커 안의 방은 코드 상태를 함께 쓰므로 RPGT 방만 다른 배치를 쓰게 할 수 없어 워커를 따로 둔다.
   실제 게임에 열 때는 PLAZA.live 를 true 로 바꾼다(되돌리기도 한 줄). 시험은 globalThis.__PLAZA_NEW__ = true 를 세운 뒤 불러온다 */
import { TEST_MODE } from "../net/testMode.js";

export const PLAZA = { live: false };

const BUILD_FLAG = typeof __PLAZA_NEW__ !== "undefined" ? __PLAZA_NEW__ : globalThis.__PLAZA_NEW__;
export const PLAZA_NEW = !!(PLAZA.live || BUILD_FLAG || TEST_MODE);

// 새 배치 — [x, y]. 여섯 구역: 맞이 마당(북) · 장비 골목(서북) · 살림 장(동북) · 분수 쉼터(가운데) · 황금 모퉁이(동남) · 관문 터(서남)
const NEW = {
  spawn: [900, 900],          // 처음 도착 자리 — 분수 → 북쪽 마을 문이 한 줄로 보인다
  fieldGate: [1700, 780],     // 사냥문 — 오른쪽 조금 아래로 내려 동쪽 길이 비스듬히 흐른다
  fieldBack: [1570, 770],     // 토끼 사냥터에서 돌아오는 자리(사냥문 앞)
  trainGate: [100, 480], trainBack: [235, 480],
  villageBack: [900, 280],    // 마을 문(900, 180)은 남북 축 끝이라 제자리 — 돌아오면 축 위에 선다
  // 장비 골목
  weapon: [300, 330], forge: [470, 280], skill: [560, 430], alchemist: [170, 370],
  // 살림 장 — 사냥문 길 위쪽
  potion: [1250, 470], scroll: [1400, 330], junk: [1540, 500], guard: [1620, 640],
  // 맞이 마당
  honor: [1110, 260], adv: [720, 270],
  // 분수 쉼터
  questmaster: [1080, 770], market: [720, 790], collector: [1060, 1010],
  // 황금 모퉁이
  casino: [1380, 900], onyx: [1580, 950], gmBox: [1490, 830], gmBack: [1490, 760],
  abyss: [1240, 1080], abyssBack: [1300, 980], worldBoss: [1690, 1110],
  // 관문 터
  dgGate: [560, 1090], dgNpc: [715, 1066], guild: [340, 800], deep: [130, 920], deepBack: [230, 920],
  race: [210, 650], raceBack: [300, 700],
};

// 지금 배치 값을 받아, 새 배치를 쓰면 NEW 값으로 바꿔 준다
export const pz = (key, x, y) => { const p = PLAZA_NEW && NEW[key]; return p ? { x: p[0], y: p[1] } : { x, y }; };
export const pzA = (key, xy) => { const p = PLAZA_NEW && NEW[key]; return p ? [p[0], p[1]] : xy; };
