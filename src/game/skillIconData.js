/* 스킬 · 물약 칸 아이콘(11월 15일 사용자 요청 — BLOOD-001 스킬 판을 이름 목록 대신 아이콘 칸으로).
   그림은 Codex 로 뽑아 초록 바탕을 지운 시트(design/ui/skill-icons). 스킬 시트 4열 × 4행 · 물약 시트 4열 × 2행 · 칸 하나 128px(원본 256px 은 design/ui/skill-icons). 못 불러오면 아이콘 없이 이름만 보인다 */
export const SKILL_ICON_SHEET = { src: "/assets/game/rpg/ui/skill-icons.webp", cols: 4, rows: 4 };   // 11월 15일 — 셋째 줄에 혈류 파동 · 혈쇄 갈고리 · 11월 18일 — 셋째 줄 끝 · 넷째 줄에 신규 다섯(design/ui/skill-icons/make-blood-new.py 로 직접 그림)
export const POTION_ICON_SHEET = { src: "/assets/game/rpg/ui/potion-icons.webp", cols: 4, rows: 2 };
// 스킬 — 칸 번호(왼쪽 위부터)
export const SKILL_ICONS = { dash: 0, chase: 1, shot: 2, smash: 3, sword: 4, veil: 5, field: 6, conv: 7, wave: 8, hook: 9, pierce: 10, sea: 11, legion: 12, origin: 13, awake: 14 };
// 일반 직업 · 전직 스킬(11월 21일, design/ui/skill-icons/make-job-icons.py 가 직접 그린 도트 · 4열 × 6행)
export const JOB_ICON_SHEET = { src: "/assets/game/rpg/ui/skill-icons-job.webp", cols: 4, rows: 6 };
export const JOB_ICONS = { smash: 0, burst: 1, pierce: 2, aid: 3, j_rush: 4, j_cleave: 5, j_iron: 6, j_pierce: 7, j_volley: 8, j_leap: 9, j_orb: 10, j_chain: 11, j_shield: 12,
  gladiator: 13, knight: 14, marksman: 15, gunner: 16, archmage: 17, summoner: 18, healer: 19, assassin: 20, elf: 21, summoner_ult: 22, heal_mode: 23 };
// 물약 — 종류마다 칸 번호. weapon 은 크림슨 레퀴엠이 아닌 무기 스킬 칸
export const POTION_ICONS = { heal: 0, str: 1, int: 2, crit: 3, reset: 4, speed: 5, hide: 6, weapon: 7 };
export const potionIconOf = (id) => (/^heal/.test(id) ? "heal" : id === "buff_str" ? "str" : id === "buff_int" ? "int" : id === "buff_crit" ? "crit"
  : id === "reset" ? "reset" : /^speed/.test(id) ? "speed" : /^hide/.test(id) ? "hide" : null);
// 칸 그림 — CSS 배경 하나로 시트의 한 칸만 보인다
export function iconStyle(sheet, i) {
  if (!Number.isInteger(i)) return null;
  const c = i % sheet.cols, r = Math.floor(i / sheet.cols);
  return { backgroundImage: `url("${sheet.src}")`, backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
    backgroundPosition: `${(c / (sheet.cols - 1)) * 100}% ${(r / Math.max(1, sheet.rows - 1)) * 100}%` };
}
