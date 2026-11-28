/* 광장 배치 두 벌 — 지금 배치는 각 데이터 파일에 그대로 적혀 있고, 새 배치(11월 28일 광장 리뉴얼)는 이 파일 NEW 한 곳에 둔다.
   계획서 notes/광장-리뉴얼-계획서.md 2장 · 구역도 notes/광장-리뉴얼/새-구역도.png.
   어느 배치를 쓸지는 불러올 때 한 번 정한다 — 화면은 ?test(TEST_MODE), 서버는 테스트 전용 워커(server/wrangler.test.toml 의 __PLAZA_NEW__).
   같은 워커 안의 방은 코드 상태를 함께 쓰므로 RPGT 방만 다른 배치를 쓰게 할 수 없어 워커를 따로 둔다.
   실제 게임에 열 때는 PLAZA.live 를 true 로 바꾼다(되돌리기도 한 줄). 시험은 globalThis.__PLAZA_NEW__ = true 를 세운 뒤 불러온다 */
import { TEST_MODE } from "../net/testMode.js";

export const PLAZA = { live: true };   // 11월 28일 사용자 「실제 게임에 적용하자」 — false 로 되돌리면 테스트 서버만 새 배치

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

// 새 광장 구역 — 들어가면 화면에 구역 이름이 잠깐 뜬다(RpgView, 계획서 8장 6번). 화면만의 일이라 판정 · 스냅샷과 상관없다.
// 위에서부터 처음 맞는 칸 [x0, y0, x1, y1]. 분수 둘레 원은 먼저 본다. 아무 데도 아니면 분수 쉼터.
export const PLAZA_ZONE = { show: 2000, rest: 20000, fountain: 330 };   // 뜨는 시간 · 같은 구역 다시 뜨기까지(ms) · 분수 쉼터 가로 반지름
const ZONES = [
  ["맞이 마당", 620, 0, 1180, 360],
  ["장비 골목", 0, 0, 760, 600],
  ["살림 장", 1040, 0, 1800, 720],
  ["황금 모퉁이", 1140, 720, 1800, 1200],
  ["관문 터", 0, 600, 760, 1200],
];
export function plazaZone(x, y) {
  if (Math.hypot(x - 899.5, (y - 639.5) / 0.78) < PLAZA_ZONE.fountain) return "분수 쉼터";
  const z = ZONES.find(([, x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);
  return z ? z[0] : "분수 쉼터";
}
