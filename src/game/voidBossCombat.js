/* 공허의 관측자 전용 범위 · 포탈 · 끌어당김(11월 4일). 수치는 worldBossData.js WORLD_BOSS_PATTERNS 한 곳.
   진행 상태(포탈 · 범위)는 기존 attack 객체에 숫자 · 배열로만 보관해 방장 승계와 스냅샷에서 그대로 이어진다. */
import { WORLD_BOSS as C, WORLD_BOSS_PATTERNS as PATTERNS } from './worldBossData.js';
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const VOID_KINDS = ['gravity_collapse', 'space_cut', 'void_cross', 'event_horizon'];
export const isVoidKind = kind => VOID_KINDS.includes(kind);
const MAP_TOP = 170;   // 월드보스 성역 맵의 위쪽 걷기 한계(rpg.js MAPS.worldboss.top)
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) / C.squash);
/* 사건의 지평선 안전 구역 — 보스 둘레 safeD 에 세 개. 어느 구역이든 걸어 들어갈 수 있게 원 전체가 걸을 수 있는 땅 안에 있고,
   구역끼리는 반지름의 safeGap 배 이상 떨어진다. 보스가 가장자리에 있어 겹치면 방향을 돌려 보고, 그래도 안 되면 전투장 한가운데에 삼각형으로 둔다 */
export function voidSafeZones(m, angle, P = PATTERNS.event_horizon) {
  const xmin = P.safeR + P.margin, xmax = C.w - P.safeR - P.margin;
  const ymin = MAP_TOP + P.safeR * C.squash + P.margin, ymax = C.h - P.safeR * C.squash - P.margin;
  const make = (cx, cy, base, D) => Array.from({ length: P.safes }, (_, j) => {
    const a = base + j * TAU / P.safes;
    return { x: clamp(cx + Math.cos(a) * D, xmin, xmax), y: clamp(cy + Math.sin(a) * D * C.squash, ymin, ymax), r: P.safeR };
  });
  const apart = z => z.every((a, i) => z.every((b, j) => j <= i || dist(a, b) >= P.safeR * P.safeGap));
  for (let k = 0; k < 12; k++) {
    const z = make(m.x, m.y, angle + k * Math.PI / 6, P.safeD);
    if (apart(z)) return z;
  }
  return make(C.center[0], C.center[1], angle, 330);
}
// 포탈 둘 — 전투장 한가운데를 지나는 한 줄 위에서 서로 반대쪽. 줄의 방향은 겨눈 사람 쪽에 직각이라 어느 쪽이든 걸어갈 수 있다
export function voidPortals(angle, P = PATTERNS.void_cross) {
  const a = angle + Math.PI / 2, [cx, cy] = C.center;
  return [0, 1].map(i => {
    const sign = i ? -1 : 1;
    return { x: clamp(cx + Math.cos(a) * P.portalD * sign, 200, C.w - 200), y: clamp(cy + Math.sin(a) * P.portalD * C.squash * sign, MAP_TOP + 160, C.h - 160) };
  });
}
// 공격이 시작될 때 한 번 — attack 에 더할 진행 값
export function voidBegin(kind, angle) {
  return kind === 'void_cross' ? { portals: voidPortals(angle) } : {};
}
// 단계마다의 범위. 이 보스의 공격이 아니면 null
export function voidAreas(kind, step, m, heroes, angle, attack) {
  const P = PATTERNS[kind];
  if (kind === 'gravity_collapse') return heroes.slice(0, 5).map(h => ({ shape: 'circle', x: h.x, y: h.y, r: P.r, pull: 1 }));
  if (kind === 'space_cut') {
    // 첫 줄은 처음 겨눈 사람, 다음 줄은 다음 사람을 지금 선 자리로 겨눈다(한 사람이면 계속 그 사람을 쫓는다)
    const t = heroes.length ? heroes[step % heroes.length] : null;
    const a = step === 0 || !t ? angle : Math.atan2((t.y - m.y) / C.squash, t.x - m.x);
    return [{ shape: 'line', x: m.x, y: m.y, a, len: P.len, width: P.width }];
  }
  if (kind === 'void_cross') {
    const [A, B] = attack?.portals || voidPortals(angle);
    if (step === 1) return [{ shape: 'circle', x: B.x, y: B.y, r: P.r }];
    if (step === 2) return [{ shape: 'ring', x: A.x, y: A.y, inner: P.ringInner, r: P.ringR }];
    return [{ shape: 'circle', x: A.x, y: A.y, r: P.r }];
  }
  if (kind === 'event_horizon') return [{ shape: 'shelter', x: m.x, y: m.y, safes: voidSafeZones(m, angle) }];
  return null;
}
// 한 타가 끝났다 — 공허의 교차는 보스가 충격파가 떨어진 포탈로 건너뛴다
export function voidWarp(m, attack) {
  if (attack?.kind !== 'void_cross') return;
  const s = attack.areas?.[0]; if (!s) return;
  m.x = s.x; m.y = s.y;
}
// 중력 붕괴 — 터지기 직전 pullFor 초 동안 장판 안의 사람이 중심으로 끌려간다. 장판 밖은 그대로(밖으로 벗어나면 피한다). 대쉬 중에는 끌지 않는다
export function voidPull(E, g, a, heroes, dt) {
  const attack = a.attack;
  if (attack?.kind !== 'gravity_collapse' || !E.pull) return;
  const P = PATTERNS.gravity_collapse;
  if (!(attack.t > 0 && attack.t <= P.pullFor)) return;
  for (const s of attack.areas) for (const h of heroes) {
    if (h.dash > 0 || h.inv > 0) continue;
    if (dist(s, h) <= s.r) E.pull(g, h, s.x, s.y, P.pull * dt);
  }
}
