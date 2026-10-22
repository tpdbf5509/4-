/* 월드보스 장비 1차 — 획득처는 월드보스 구현 때 연결한다. 수치는 이곳에서 조절한다.
   기존 레벨 100 전설보다 조금 높은 기본 능력으로 시작하고 스킬·세트 역할로 구분한다. */
export const WORLD_EQUIPMENT = {
  level: 100, stat: 320, grade: 4, armorGrade: 3,
  atlas: '/assets/game/rpg/items/world-equipment.webp', columns: 7, rows: 3,
};
export const WORLD_SETS = [
  { id: 'dragon', name: '용왕', boss: '드래곤 괴수', color: '#efb07c',
    two: '치명타 피해 +15%', four: '무기 스킬 적중 시 5초 동안 공격력 +15% · 12초마다',
    crit: 0.15, rage: 0.15, duration: 5, cooldown: 12 },
  { id: 'serpent', name: '사왕', boss: '거대 뱀 괴수', color: '#b7d387',
    two: '지속 피해 +20%', four: '지속 피해 8회 적중 시 최대 체력 12% 보호막 · 15초마다 · 5초 유지',
    dot: 0.2, hits: 8, shield: 0.12, duration: 5, cooldown: 15 },
  { id: 'machine', name: '고대 뇌전', boss: '고대 번개 기계형 괴수', color: '#a3dae6',
    two: '무기 스킬 재사용 대기시간 10% 감소', four: '평타 적중으로 전하 5개 축적 · 0.3초마다 · 무기 스킬 적중 시 추가 낙뢰',
    cd: 0.1, charges: 5, gap: 0.3, mul: 1.6, radius: 100 },
];
export const WORLD_SET_BY_ID = Object.fromEntries(WORLD_SETS.map(s => [s.id, s]));
export const WORLD_WEAPONS = [
  { id: 'dragon_dual', name: '용아쌍검', t: 'sword', stat: 'str', set: 'dragon' },
  { id: 'dragon_staff', name: '용왕의 홀', t: 'staff', stat: 'int', set: 'dragon' },
  { id: 'dragon_bow', name: '용익궁', t: 'bow', stat: 'str', set: 'dragon' },
  { id: 'serpent_sword', name: '사왕의 곡검', t: 'sword', stat: 'str', set: 'serpent' },
  { id: 'serpent_staff', name: '사안의 지팡이', t: 'staff', stat: 'int', set: 'serpent' },
  { id: 'serpent_bow', name: '탈피의 장궁', t: 'bow', stat: 'str', set: 'serpent' },
  { id: 'machine_sword', name: '뇌동대검', t: 'great', stat: 'str', set: 'machine' },
  { id: 'machine_staff', name: '천뢰의 제어봉', t: 'staff', stat: 'int', set: 'machine' },
  { id: 'machine_bow', name: '전자기 레일궁', t: 'bow', stat: 'str', set: 'machine' },
].map(w => ({ ...w, lv: WORLD_EQUIPMENT.level, g: WORLD_EQUIPMENT.grade, amt: WORLD_EQUIPMENT.stat,
  art: w.id, world: true }));
// 수치는 총 적중 피해가 기존 전설과 지나치게 벌어지지 않게 잡은 첫 시험 값이다.
const passive = { name: '괴수의 유산', note: '직업에 맞는 공격 능력치를 높이는 월드보스 전설 무기' };
export const WORLD_WEAPON_SKILLS = {
  dragon_dual: { name: '용아선풍', role: '회전 돌진과 마무리', passive,
    skill: { note: '회전하며 앞으로 돌진해 6번 베고 마지막에 교차 베기', cd: 16, hits: 6, gap: 0.12, step: 34, r: 140, mul: 0.55, finish: 2 } },
  dragon_staff: { name: '용성우', role: '지정 지역 집중 폭격', passive,
    skill: { note: '목표 지역에 운석 5회 낙하 · 마지막은 거대 운석', cd: 20, reach: 550, hits: 5, gap: 0.32, delay: 0.6, r: 110, mul: 0.8, finish: 2.4, finalRadius: 175 } },
  dragon_bow: { name: '비룡육연사', role: '전진 연사와 비룡 추격', passive,
    skill: { note: '화살 5발씩 6회 전진 사격 · 마지막에는 비룡이 목표를 추격', cd: 20, hits: 6, arrows: 5, gap: 0.22, step: 14, len: 560, width: 20, spread: 0.24, mul: 0.16, finish: 2, fly: 0.5 } },
  serpent_sword: { name: '독아난무', role: '맹독 축적과 폭발', passive,
    skill: { note: '전방을 5번 베어 맹독을 쌓고 마지막에 맹독 폭발 · 최대 5중첩', cd: 16, hits: 5, gap: 0.14, r: 165, arc: 1.3, mul: 0.55, finish: 0.45, poison: { max: 5, duration: 5, tick: 0.5, mul: 0.13 } } },
  serpent_staff: { name: '독사의 늪', role: '설치형 독과 지속 피해', passive,
    skill: { note: '목표 지역에 6초 동안 독 웅덩이 · 0.5초마다 뱀이 솟아올라 공격', cd: 18, reach: 480, hits: 12, gap: 0.5, r: 155, mul: 0.42 } },
  serpent_bow: { name: '쌍사추격', role: '관통 사격과 표식 추격', passive,
    skill: { note: '뱀 형상의 관통 화살 두 발 · 6초 동안 표식에 자신의 평타가 맞으면 추가 독 피해', cd: 16, hits: 2, gap: 0.18, len: 580, width: 55, mul: 1.4, duration: 6, markMul: 0.55, markGap: 0.4 } },
  machine_sword: { name: '과부하 참격', role: '내려치기와 지연 폭발', passive,
    skill: { note: '전방을 내려쳐 균열 생성 · 0.5초 후 균열을 따라 4번 폭발', cd: 16, len: 390, width: 90, hits: 4, gap: 0.15, delay: 0.5, r: 95, mul: 1.5, burst: 0.85 } },
  machine_staff: { name: '뇌전격자', role: '지역 봉쇄와 중앙 낙뢰', passive,
    skill: { note: '목표 지역에 뇌전격자 · 전류 4회 후 중앙에 강력한 낙뢰', cd: 18, reach: 500, hits: 5, gap: 0.45, r: 160, mul: 0.65, finish: 2.2 } },
  machine_bow: { name: '초전자 관통포', role: '충전 관통과 연쇄 번개', passive,
    skill: { note: '0.6초 충전 후 직선 관통포 · 맞은 적 주변으로 번개 분기', cd: 18, delay: 0.6, len: 730, width: 55, hop: 160, branches: 3, mul: 3, chain: 0.65 } },
};
export const worldArmorName = (s, set) => `${WORLD_SET_BY_ID[set]?.name || ''} ${{head:'투구',body:'갑옷',legs:'바지',feet:'신발'}[s]}`;
export function worldArtCell(src) {
  const id = typeof src === 'string' ? src.split('#world=')[1] : null;
  if (!id) return null;
  const weapon = WORLD_WEAPONS.find(w => w.id === id);
  if (weapon) return WORLD_SETS.findIndex(s => s.id === weapon.set) * 7 + ['sword','staff','bow'].indexOf(weapon.t === 'great' ? 'sword' : weapon.t);
  const [set, slot] = id.split(':');
  const row = WORLD_SETS.findIndex(s => s.id === set), col = ['head','body','legs','feet'].indexOf(slot);
  return row >= 0 && col >= 0 ? row * 7 + col + 3 : null;
}
export const worldArt = id => `${WORLD_EQUIPMENT.atlas}#world=${id}`;
