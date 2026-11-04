/* 공허 무기 판정(11월 4일). 방장(전용 서버)만 판정하고, 모든 진행 상태는 ws.void 에 숫자 · 배열로 보관해 스냅샷과 방장 승계에서 이어진다.
   X 키를 한 번 누르면 전체 공격이 자동으로 나간다(시간으로 흘러가며 다시 누를 일이 없다).
   피해는 기존 strikeAny 를 거치므로 결투(duelBalance.js 시전별 상한) · 사냥터 PvP 상한이 그대로 적용된다.
   - 한 시전의 판정은 같은 시전 객체(c.cap)를 함께 쓴다 → 결투에서 모든 타의 합이 시전 한 번의 상한을 공유한다.
   - 패시브 추가 공격은 새 시전(basic 한도)에서 noProc 로 나간다 → 다른 패시브 · 세트 효과를 다시 켜지 못하고, 그 처치도 충전에 세지 않는다. */
import { VOID_SKILLS, voidArrowSpot } from './voidWeaponData.js';
import { makeCast, withCast } from './duelBalance.js';
const state = h => h.ws.void || (h.ws.void = { cast: null, kills: 0, charge: 0, hits: 0, stamp: -1, gapT: 0 });
export const isVoidWeapon = id => !!VOID_SKILLS[id];
let busy = 0;   // 패시브가 추가 공격을 풀어 놓는 동안 — 그 안에서 난 처치 · 적중은 충전에 세지 않는다
const key = o => o.type ? `m${o.id}` : `h${o.who || o.pi}`;
const effect = (E, g, h, kind, c, life, extra = {}) => E.fx(g, h.map, { kind, x: c.x, y: c.y, pi: h.pi, token: c.token, t: life, life, ...extra });
function valid(E, g, h, c) { return h.loaded && h.down <= 0 && h.map === c.map && E.held(h) === c.id && !E.locked(h) && !E.safe(h.map) && !E.trading(h); }
function strike(E, g, h, c, o, mul) {
  if (!E.alive(g, h, o, c.map)) return;
  const previous = h.cast; h.cast = c.cap;
  try { E.strike(g, h, o, c.base * mul); } finally { h.cast = previous; }
}
// 가장 적이 몰린 자리 — reach 안의 적 가운데 둘레 r*0.55 안에 가장 많은 적을 둔 적의 자리. 직접 겨눴으면 그 방향 ±0.7라디안 안의 적만 본다
function bestSpot(E, g, h, reach, r) {
  const [ax, ay] = E.face(h);
  let list = E.near(g, h, h.x, h.y, reach, 40);
  if (h.inputAim) {
    const ang = Math.atan2(ay * E.squash, ax);
    list = list.filter(o => { const d = Math.atan2((o.y - h.y), (o.x - h.x)) - ang; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) <= 0.7; });
  }
  let best = null, bestN = -1;
  for (const o of list) {
    let n = 0;
    for (const q of list) if (Math.hypot(q.x - o.x, (q.y - o.y) / E.squash) <= r * 0.55) n++;
    if (n > bestN) { best = o; bestN = n; }
  }
  if (best) return [best.x, best.y];
  return E.end(h, ax, ay, reach * 0.7);
}
export function castVoidWeapon(E, g, h, id) {
  const W = VOID_SKILLS[id]; if (!W) return false;
  const vs = state(h);
  if (vs.cast) return true;                        // 훈련장에서 대기 시간을 풀어도 같은 기술을 겹쳐 쓰지 않는다
  const S = W.skill, [ax, ay] = E.face(h);
  const [x, y] = id === 'void_great' ? [h.x, h.y] : bestSpot(E, g, h, S.reach, S.r);
  const c = { id, map: h.map, t: 0, i: 0, x, y, ax, ay, base: E.base(h), cap: h.cast || { raw: 0, weapon: true, sid: 'wpn' },
    token: `${h.who || h.pi}:${g.t}:${id}`, burst: 0 };
  vs.cast = c;
  h.ws.wcd = S.cd * E.cooldown(h);
  h.swing = 0.35;
  effect(E, g, h, id === 'void_great' ? 'sk_void_slash' : id === 'void_bow' ? 'sk_void_rain' : 'sk_void_hole', c, S.life, { r: S.r, snd: id === 'void_staff' ? 'orb' : 'slash' });
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 104, text: W.name, color: '#d3b8ff', who: h.pi, t: 0.8, life: 0.8 });
  return true;
}
export function stopVoid(h) { if (h.ws?.void) h.ws.void.cast = null; }
export function tickVoidWeapon(E, g, h, dt) {
  const vs = h.ws?.void; if (!vs) return;
  vs.gapT = Math.max(0, vs.gapT - dt);
  const c = vs.cast; if (!c) return;
  if (!valid(E, g, h, c)) { vs.cast = null; return; }
  const S = VOID_SKILLS[c.id].skill;
  c.t += dt;
  if (c.id === 'void_great') {
    // 둘레는 베는 동안 따라다닌다 — 걸으면서 써도 몸 둘레를 벤다
    const step = (S.dur - S.dur / S.slashes) / (S.slashes - 1);
    while (c.i < S.slashes && c.t >= c.i * step) {
      E.near(g, h, h.x, h.y, S.r).forEach(o => strike(E, g, h, c, o, S.slashMul));
      g.shake = Math.max(g.shake || 0, 0.12);
      c.i++;
    }
    if (!c.burst && c.t >= S.dur) {
      c.burst = 1;
      E.near(g, h, h.x, h.y, S.burstR).forEach(o => strike(E, g, h, c, o, S.burstMul));
      g.shake = Math.max(g.shake || 0, 0.4);
    }
    if (c.t >= S.life) vs.cast = null;
  } else if (c.id === 'void_bow') {
    while (c.i < S.arrows && c.t >= S.start + c.i * S.span / (S.arrows - 1)) {
      const [x, y] = voidArrowSpot(S, c.i, c.x, c.y, E.squash);
      E.near(g, h, x, y, S.arrowR).forEach(o => strike(E, g, h, c, o, S.arrowMul));
      g.shake = Math.max(g.shake || 0, 0.1);
      c.i++;
    }
    if (c.t >= S.life) vs.cast = null;
  } else {
    // 블랙홀 — 처음 pullFor 초 동안 몬스터를 중심으로 당기고, 정해진 때마다 피해를 주고, burstAt 에 큰 폭발
    if (c.t <= S.pullFor) E.near(g, h, c.x, c.y, S.r).forEach(o => E.pull(g, o, c.x, c.y, S.pull * dt));
    while (c.i < S.ticks && c.t >= S.first + c.i * S.gap) {
      E.near(g, h, c.x, c.y, S.r).forEach(o => strike(E, g, h, c, o, S.tickMul));
      c.i++;
    }
    if (!c.burst && c.t >= S.burstAt) {
      c.burst = 1;
      E.near(g, h, c.x, c.y, S.burstR).forEach(o => strike(E, g, h, c, o, S.burstMul));
      g.shake = Math.max(g.shake || 0, 0.5);
    }
    if (c.t >= S.life) vs.cast = null;
  }
}
// 패시브 추가 공격의 시전 — 결투에서는 평타 한도(basic)를 쓴다. weapon 표시가 없어 세트 효과를 켜지 못한다
const passiveCast = () => ({ ...makeCast(), basic: true, passive: 1 });
function passive(E, g, h, x, y, r, mul, kind) {
  if (busy) return;
  busy++;
  try {
    const cast = passiveCast(), base = E.base(h);
    withCast(h, cast, () => E.noProc(() => E.near(g, h, x, y, r).forEach(o => { if (E.alive(g, h, o, h.map)) E.strike(g, h, o, base * mul); })));
  } finally { busy--; }
  E.fx(g, h.map, { kind, x, y, r, pi: h.pi, t: 0.55, life: 0.55, snd: kind === 'sk_void_slash_pas' ? 'slash' : 'boom' });
}
// 몬스터를 잡았다(killMob) — 대검 차원의 잔흔. 패시브 안에서 난 처치는 세지 않는다
export function voidOnKill(E, h) {
  if (busy || !h?.ws || E.held(h) !== 'void_great') return;
  const P = VOID_SKILLS.void_great.passive, vs = state(h);
  if (vs.charge >= P.max) { vs.kills = 0; return; }
  vs.kills++;
  if (vs.kills >= P.need) { vs.kills = 0; vs.charge++; }
}
// 평타를 쳤다(weaponOnAttack) — 쌓인 잔흔이 있으면 이번 평타에 공간 참격을 더한다(한 번에 하나)
export function voidOnAttack(E, g, h) {
  if (E.held(h) !== 'void_great') return;
  const vs = h.ws?.void; if (!vs || vs.charge <= 0) return;
  vs.charge--;
  passive(E, g, h, h.x, h.y, VOID_SKILLS.void_great.passive.r, VOID_SKILLS.void_great.passive.mul, 'sk_void_slash_pas');
}
// 맞혔다(weaponOnHit) — 장궁은 평타 4번마다 · 지팡이는 스킬 5번마다. 같은 틱의 여러 대상은 한 번으로 센다
export function voidOnHit(E, g, h, o, { basic, side }) {
  if (busy || side || !o) return;
  const id = E.held(h);
  if (id !== 'void_bow' && id !== 'void_staff') return;
  const vs = state(h);
  if (vs.stamp === g.t) return;
  if (id === 'void_bow') {
    if (!basic) return;
    const P = VOID_SKILLS.void_bow.passive;
    vs.stamp = g.t; vs.hits++;
    if (vs.hits >= P.need) { vs.hits = 0; passive(E, g, h, o.x, o.y, P.r, P.mul, 'sk_void_arrow_pas'); }
  } else {
    if (basic) return;
    const P = VOID_SKILLS.void_staff.passive;
    vs.stamp = g.t; vs.hits++;
    if (vs.hits >= P.need && vs.gapT <= 0) { vs.hits = 0; vs.gapT = P.gap; passive(E, g, h, o.x, o.y, P.r, P.mul, 'sk_void_grav_pas'); }
    else if (vs.hits >= P.need) vs.hits = P.need;   // 간격 중이면 충전된 채 기다린다
  }
}
export const voidKey = key;
