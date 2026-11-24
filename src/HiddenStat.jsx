/* 히든 직업 스탯 창 칸 — 엔지니어 003 · 네크로맨서 004 · 마술사 005 · 와이번 나이트 006의 직업 레벨 · 연마 셋 · 연마 합계 색(11월 24일 사용자 요청).
   BLOOD-001 · 도박꾼 002(BloodHud.jsx · GamblerHud.jsx)와 같은 틀(.rpg-blood-stat)을 쓴다. 값은 각 직업 view 그대로(v) — 판정은 하지 않는다.
   모두 {lv, xp, tr: [[연마 레벨, 경험치] × 3]} 를 싣고 있어 직업마다 이름 · 수치 · 색만 다르다 */
import { ENGINEER, ENGINEER_NAME, ENGINEER_TITLE, ENGINEER_COLORS, EN_TRAIN_NAMES } from "./game/engineerData.js";
import { enJobNeed, enTrainNeed } from "./game/engineerJob.js";
import { NECRO, NECRO_NAME, NECRO_TITLE, NECRO_COLORS, NC_TRAIN_NAMES } from "./game/necroData.js";
import { ncJobNeed, ncTrainNeed } from "./game/necroJob.js";
import { ILLUSION, ILLUSION_NAME, ILLUSION_TITLE, ILLUSION_COLORS, IL_TRAIN_NAMES } from "./game/illusionData.js";
import { ilJobNeed, ilTrainNeed } from "./game/illusionJob.js";
import { WYVERN, WYVERN_NAME, WYVERN_TITLE, WYVERN_COLORS, WY_TRAIN_NAMES } from "./game/wyvernData.js";
import { wyJobNeed, wyTrainNeed } from "./game/wyvernJob.js";

// 직업마다: 수치 묶음 · 이름 · 연마 이름 · 필요 경험치 · 합계 색 셋(기본 · 75 · 130 — 이름과 점 색) · 150 효과 이름 · 머리 글자색 · 막대 색
const JOBS = {
  engineer: { D: ENGINEER, name: ENGINEER_NAME, title: ENGINEER_TITLE, trains: EN_TRAIN_NAMES, jobNeed: enJobNeed, trainNeed: enTrainNeed,
    key: ["pale", "gold"], tint: [["청록 기계 핵", ENGINEER_COLORS.base], ["청백 기계 핵", ENGINEER_COLORS.bright], ["금빛 전류", ENGINEER_COLORS.gold]],
    top: ["청백 기계 핵", "금빛 전류", "중앙 제어"], head: ENGINEER_COLORS.bright, bar: ENGINEER_COLORS.base, at: ENGINEER.central },
  necromancer: { D: NECRO, name: NECRO_NAME, title: NECRO_TITLE, trains: NC_TRAIN_NAMES, jobNeed: ncJobNeed, trainNeed: ncTrainNeed,
    key: ["violet", "silver"], tint: [["검은 그림자", NECRO_COLORS.mid], ["진한 보라 눈", NECRO_COLORS.bright], ["은색 테두리", NECRO_COLORS.rim]],
    top: ["진한 보라 눈", "은색 테두리", "영원의 명령"], head: NECRO_COLORS.bright, bar: NECRO_COLORS.mid, at: NECRO.eternal },
  illusionist: { D: ILLUSION, name: ILLUSION_NAME, title: ILLUSION_TITLE, trains: IL_TRAIN_NAMES, jobNeed: ilJobNeed, trainNeed: ilTrainNeed,
    key: ["blue", "mirror"], tint: [["흰 카드 테두리", ILLUSION_COLORS.cream], ["푸른 카드 테두리", ILLUSION_COLORS.blue], ["보랏빛 거울 무늬", ILLUSION_COLORS.accent]],
    top: ["푸른 카드 테두리", "보랏빛 거울 무늬", "끝없는 앙코르"], head: ILLUSION_COLORS.base, bar: ILLUSION_COLORS.base, at: ILLUSION.encore },
  wyvern: { D: WYVERN, name: WYVERN_NAME, title: WYVERN_TITLE, trains: WY_TRAIN_NAMES, jobNeed: wyJobNeed, trainNeed: wyTrainNeed,
    key: ["line", "wing"], tint: [["기본 비늘", WYVERN_COLORS.base], ["붉은 선 비늘", WYVERN_COLORS.bright], ["보라 날개 잔상", WYVERN_COLORS.violet]],
    top: ["붉은 선 비늘", "보라 날개 잔상", "진룡 동조"], head: WYVERN_COLORS.bright, bar: WYVERN_COLORS.base, at: WYVERN.sync },
};

const fmt = (n) => Math.round(n).toLocaleString("ko-KR");

export function HiddenStat({ id, v }) {
  const C = JOBS[id];
  if (!v || !C || !Array.isArray(v.tr)) return null;
  const { D } = C, pct = (a, b) => `${Math.min(100, (a / Math.max(1, b)) * 100)}%`;
  const top = v.lv >= D.maxLv, need = C.jobNeed(v.lv), sum = v.tr.reduce((n, q) => n + q[0], 0);
  const step = sum >= D.tint[C.key[1]] ? 2 : sum >= D.tint[C.key[0]] ? 1 : 0;   // 합계 색 단계 — 직업 view 의 tint 와 같은 문턱
  const bar = { background: C.bar };
  return (
    <div className="rpg-blood-stat">
      <div className="rpg-blood-stat-head">
        <b style={{ color: C.head }}>{C.name}</b>
        <span>{C.title} · 직업 레벨 <em>{v.lv}</em><small>/{D.maxLv}</small></span>
      </div>
      <span className="rpg-lv-bar xp"><span style={{ width: top ? "100%" : pct(v.xp, need) }} /></span>
      <small className="rpg-blood-stat-xp">{top ? "최고 레벨" : `경험치 ${fmt(v.xp)} / ${fmt(need)}`}</small>
      <div className="rpg-blood-stat-list">
        {C.trains.map((name, i) => {
          const [l, x] = v.tr[i], max = l >= D.train.max, n = C.trainNeed(l);
          return (
            <div key={name} className="rpg-blood-stat-row">
              <span className="rpg-blood-stat-name">{name}</span>
              <span className="rpg-lv-bar"><span style={{ ...bar, width: max ? "100%" : pct(x, n) }} /></span>
              <span className="rpg-blood-stat-lv">{l}<small>/{D.train.max}</small></span>
              <small className="rpg-blood-stat-xp">{max ? "최고" : `${fmt(x)} / ${fmt(n)}`}</small>
            </div>
          );
        })}
      </div>
      <p className="rpg-blood-stat-tint">
        <i style={{ background: C.tint[step][1] }} />
        연마 합계 <em>{sum}</em> · {C.tint[step][0]}
        <small>{D.tint[C.key[0]]} 이상 {C.top[0]} · {D.tint[C.key[1]]} 이상 {C.top[1]} · {C.at} {C.top[2]}</small>
      </p>
    </div>
  );
}
