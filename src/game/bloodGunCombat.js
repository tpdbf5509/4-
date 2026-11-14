/* 크림슨 레퀴엠 판정 — 전용 스킬 「혈계 추격」과 패시브 혈흔(11월 13일). 방장(전용 서버)만 판정하고, 모든 진행 상태는 ws.blood 에
   숫자 · 문자 · 배열로만 보관해 스냅샷과 방장 승계에서 이어진다. 화면은 서버가 보낸 연출(fx)만 그린다.
   X 키를 한 번 누르면 충전 → 관통 혈탄 → 유도 혈탄 6발 → 혈흔 폭발이 시간으로 흘러가며 자동으로 나간다(다시 누를 일이 없다).
   - 혈흔: 평타가 맞으면 적마다 따로 쌓인다(최대 5 · 6초, 맞히면 갱신). 스킬로는 쌓이지 않는다. 무기를 바꾸면 모두 사라진다.
   - 피해는 기존 strikeAny 를 거치므로 결투(duelBalance.js 시전별 상한) · 사냥터 PvP 상한이 그대로 적용된다. 한 시전의 모든 타가 같은 시전 객체(c.cap)를 쓴다.
   - 유도 혈탄은 한 시전에서 최대 n 발만 생긴다(판정이 새 유도탄을 만들지 않는다). 폭발은 대상마다 한 번이고, 폭발이 다른 적의 폭발을 켜지 않는다.
   - 유도 혈탄 목표는 서버가 정한다: 혈흔 많은 적 → 최초 혈탄에 맞은 적 → 가까운 적 → 남은 체력이 낮은 적. 적 수에 따라 고르게 나눈다(6발이 모자라거나 넘지 않게). */
import { BLOOD_SKILLS, bloodBend } from './bloodGunData.js';

const ID = 'blood_gun';
const W = BLOOD_SKILLS.blood_gun, S = W.skill, P = W.passive, H = S.hold;
export const isBloodWeapon = (id) => id === ID;
const state = (h) => {
  const b = h.ws.blood || (h.ws.blood = { marks: {}, cast: null });
  if (!b.marks) b.marks = {};
  return b;
};
const keyOf = (o) => (o.type ? `m${o.id}` : `h${o.pi}`);
const find = (g, k) => (k[0] === 'm' ? g.mobs.find((m) => String(m.id) === k.slice(1)) : g.heroes[Number(k.slice(1))]);
const r2 = (v) => Math.round(v * 100) / 100;

/* ── 혈흔 ─────────────────────────────────────────────── */
// 화면에 보이는 혈흔 중첩은 몹 쪽 o.bl 에 둔다(손님은 스냅샷 몹 비트에서 받는다) — 사람(결투)에게는 그림을 그리지 않는다
const show = (o, n) => { if (o && o.type) o.bl = n; };
// 평타를 맞혔다(weaponOnHit) — 혈흔 1중첩. 튄 피해(side)와 스킬은 쌓지 않는다
export function bloodOnHit(E, g, h, o, { basic, side }) {
  if (!basic || side || !o || E.held(h) !== ID) return;
  const bs = state(h), k = keyOf(o), m = bs.marks[k] || (bs.marks[k] = [0, 0]);
  m[0] = Math.min(P.max, m[0] + 1); m[1] = P.dur;
  show(o, m[0]);
}
function dropMark(bs, g, k) {
  delete bs.marks[k];
  const o = find(g, k);
  if (o && o.type) { o.bl = 0; for (const q of g.heroes) { const n = q?.ws?.blood?.marks?.[k]?.[0]; if (n) o.bl = Math.max(o.bl, n); } }
}
export function clearBlood(g, h) {
  const bs = h.ws?.blood; if (!bs) return;
  for (const k of Object.keys(bs.marks || {})) dropMark(bs, g, k);
  h.ws.blood = null;
}
// 몹 하나의 혈흔 중첩(가장 많은 사람 것) — 몹 스냅샷 비트용(rpg.js)
export const bloodShown = (m) => (m && m.bl > 0 ? Math.min(P.max, m.bl) : 0);

/* ── 시전 ─────────────────────────────────────────────── */
// 충전은 몸이 묶이면 끊기고, 쏜 뒤의 연쇄는 몸이 묶여도 이어진다. 무기를 바꾸거나 쓰러지거나 맵을 떠나면 모두 거둔다
function valid(E, g, h, c) {
  return h.loaded && h.down <= 0 && h.map === c.map && E.held(h) === ID && !E.safe(h.map) && !E.trading(h) && !(c.ph === 0 && E.locked(h));
}
export function castBloodWeapon(E, g, h, id) {
  if (id !== ID) return false;
  const bs = state(h);
  if (bs.cast) return true;                        // 훈련장에서 대기 시간을 풀어도 같은 기술을 겹쳐 쓰지 않는다
  const [ax, ay] = E.face(h);
  const c = { map: h.map, t: 0, ph: 0, base: E.base(h), cap: h.cast || { raw: 0, weapon: true, sid: 'wpn' },
    token: `${h.who || h.pi}:${g.t}:${ID}`, pierce: [], seek: [], boom: [], done: {}, first: [], seeded: 0, sndT: 0, ax, ay, held: true, big: 0, hT: 0 };
  bs.cast = c;
  h.ws.wcd = S.cd * E.cooldown(h);
  h.swing = 0.25;
  E.fx(g, h.map, { kind: 'sk_blood_charge', x: h.x, y: h.y, pi: h.pi, token: c.token, ax, ay, t: S.charge, life: S.charge, snd: 'bloodCharge' });
  E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 104, text: W.name, color: '#E53945', who: h.pi, t: 0.8, life: 0.8 });
  return true;
}
function strike(E, g, h, c, o, mul) {
  if (!o || !E.alive(g, h, o, c.map)) return false;
  const previous = h.cast; h.cast = c.cap;
  try { E.strike(g, h, o, c.base * mul); } finally { h.cast = previous; }
  return true;
}
// 적중음은 한꺼번에 맞아도 간격을 두고 하나만(유도 혈탄 6발)
function hitSound(g, c) { if (g.t - c.sndT < S.sndGap) return undefined; c.sndT = g.t; return 'bloodHit'; }

/* 2단계 — 관통 혈탄: 앞으로 reach 길이 · width 폭을 꿰뚫는다. 닿는 모든 적이 한 번씩 맞고, 맞는 때는 거리 / 빠르기 */
function fire(E, g, h, c) {
  c.ph = 1;
  // 풀차징으로 쏘면 현재 체력의 hpCost 를 쓴다 — 죽지는 않게 1 은 남긴다
  c.big = c.t >= H.full ? 1 : 0;
  if (c.big) {
    const cost = Math.min(Math.max(0, h.hp - 1), Math.ceil(h.hp * H.hpCost));
    if (cost > 0) { h.hp -= cost; E.fx(g, h.map, { kind: 'call', x: h.x, y: h.y - 120, text: `생명 -${cost}`, color: '#B8192D', who: h.pi, t: 0.9, life: 0.9 }); }
  }
  const [ax, ay] = E.aim(g, h, S.reach);
  c.ax = ax; c.ay = ay;
  const hits = E.lineFrom(g, h, h.x, h.y, ax, ay, S.reach, S.width / 2).filter((o) => E.alive(g, h, o, c.map));
  const along = (o) => Math.max(0, (o.x - h.x) * ax + ((o.y - h.y) / E.squash) * ay);
  hits.sort((a, b) => along(a) - along(b));
  c.pierce = hits.map((o) => ({ t: r2(c.t + along(o) / S.v), k: keyOf(o) }));
  c.first = hits.map(keyOf);
  g.shake = Math.max(g.shake || 0, 0.18);
  E.fx(g, h.map, { kind: 'sk_blood_shot', x: h.x, y: h.y, pi: h.pi, token: c.token, ax, ay, len: S.reach, v: S.v, w: S.width,
    t: S.reach / S.v + 0.14, life: S.reach / S.v + 0.14, snd: 'bloodShot', ...(c.big ? { strong: 1 } : {}) });
}

/* 목표 우선순위 — 혈흔 많은 적 → 최초 혈탄에 맞은 적 → 가까운 적 → 남은 체력이 낮은 적 */
function ranked(E, g, h, c, x, y) {
  const bs = state(h);
  return E.near(g, h, x, y, S.seekR, 40).filter((o) => E.alive(g, h, o, c.map))
    .map((o) => { const k = keyOf(o); return { o, k, n: bs.marks[k]?.[0] || 0, first: c.first.includes(k) ? 1 : 0, d: Math.hypot(o.x - x, (o.y - y) / E.squash), hp: o.hp ?? 0 }; })
    .sort((a, b) => b.n - a.n || b.first - a.first || a.d - b.d || a.hp - b.hp);
}
// 6발을 적 수에 맞춰 나눈다 — 1명 6 · 2명 3/3 · 3명 2/2/2 · 4명 2/2/1/1 · 5명 2/1/1/1/1 · 6명 이상 서로 다른 적 1발씩(앞 순위부터)
export function seekSplit(count, n = S.n) {
  if (count <= 0) return [];
  const k = Math.min(count, n), base = Math.floor(n / k), rem = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0));
}
/* 3단계 — 첫 적중 자리에서 유도 혈탄이 생긴다(한 시전에 한 번). 목표가 없으면 생기지 않는다 */
function spawnSeek(E, g, h, c, x, y) {
  c.seeded = 1;
  const list = ranked(E, g, h, c, x, y); if (!list.length) return;
  const N = c.big ? H.n : S.n, split = seekSplit(list.length, N), out = [];
  let i = 0;
  split.forEach((cnt, ti) => { for (let q = 0; q < cnt; q++) out.push({ i: i++, k: list[ti].k, o: list[ti].o }); });
  const bullets = out.map((b) => plan(E, c, b.i, b.k, b.o, x, y));
  c.seek.push(...bullets.map((b) => ({ ...b, t: r2(c.t + S.form + b.i * S.gap + b.T), sx: Math.round(x), sy: Math.round(y) })));
  E.fx(g, h.map, { kind: 'sk_blood_seek', x, y, pi: h.pi, token: c.token, form: S.form, t: S.form + S.gap * N + S.seekMax + 0.1, life: S.form + S.gap * N + S.seekMax + 0.1, n: N, ...(c.big ? { strong: 1 } : {}),
    b: c.seek.map((b) => [b.i, b.id, b.mob, Math.round(b.tx), Math.round(b.ty), r2(S.form + b.i * S.gap), b.T, bloodBend(b.i)]), snd: 'bloodSplit' });
}
// 한 발의 날아갈 시간 — 거리 / 빠르기를 seekMin ~ seekMax 로 자른다(적 둘레를 맴돌거나 너무 느리지 않게)
function plan(E, c, i, k, o, x, y) {
  const d = Math.hypot(o.x - x, (o.y - y) / E.squash), sp = c.big ? H.seekVMul : 1;   // 풀차징 — 탄이 빠른 만큼 최소 · 최대 시간도 같이 줄인다
  return { i, k, id: o.type ? o.id : o.pi, mob: o.type ? 1 : 0, tx: o.x, ty: o.y, T: r2(Math.min(S.seekMax / sp, Math.max(S.seekMin / sp, d / (S.seekV * sp)))) };
}
// 다 날아가기 전에 목표가 쓰러졌으면 다른 유효한 적을 따라가고, 없으면 흩어져 사라진다
function retarget(E, g, h, c, b) {
  const list = ranked(E, g, h, c, b.tx, b.ty);
  if (!list.length) { b.dead = 1; E.fx(g, h.map, { kind: 'sk_blood_hit', x: b.tx, y: b.ty, pi: h.pi, fade: 1, t: 0.3, life: 0.3 }); return; }
  const to = list[0], nb = plan(E, c, b.i, to.k, to.o, b.tx, b.ty);
  Object.assign(b, { k: nb.k, id: nb.id, mob: nb.mob, tx: nb.tx, ty: nb.ty, T: nb.T, t: r2(c.t + nb.T) });
  E.fx(g, h.map, { kind: 'sk_blood_seek', x: nb.tx, y: nb.ty, pi: h.pi, token: c.token, form: 0, t: nb.T + 0.1, life: nb.T + 0.1,
    n: c.big ? H.n : S.n, ...(c.big ? { strong: 1 } : {}), b: [[b.i, nb.id, nb.mob, Math.round(nb.tx), Math.round(nb.ty), 0, nb.T, bloodBend(b.i)]] });
}

/* 4단계 — 혈흔 공명: 유도 혈탄이 혈흔 있는 적에 닿으면 혈흔을 모두 거두어 폭발 예약(res 초 뒤). 그 적은 이번 시전에서 더는 터지지 않는다 */
function arm(E, g, h, c, o, k) {
  const bs = state(h), m = bs.marks[k];
  if (!m || c.done[k]) return;
  c.done[k] = 1;
  const n = m[0];
  dropMark(bs, g, k);
  c.boom.push({ t: r2(c.t + S.res), k, n, x: Math.round(o.x), y: Math.round(o.y), R: c.big ? H.boomR : S.boomR });
  E.fx(g, h.map, { kind: 'sk_blood_res', x: o.x, y: o.y, pi: h.pi, n, r: c.big ? H.boomR : S.boomR, t: S.res + 0.05, life: S.res + 0.05 });
}
/* 5단계 — 혈계 처형: 중첩 × boomMul 피해. 반경 안의 다른 적은 같은 값의 splash 배(자기 혈흔 추가 피해 · 연쇄 없음) */
function explode(E, g, h, c, b) {
  const dmg = b.n * S.boomMul, center = find(g, b.k);
  strike(E, g, h, c, center, dmg);
  E.near(g, h, b.x, b.y, b.R || S.boomR, 40).forEach((o) => { if (keyOf(o) !== b.k) strike(E, g, h, c, o, dmg * S.splash); });
  g.shake = Math.max(g.shake || 0, b.n >= P.max ? 0.4 : 0.28);
  E.fx(g, h.map, { kind: 'sk_blood_boom', x: b.x, y: b.y, pi: h.pi, n: b.n, r: b.R || S.boomR, t: 0.5, life: 0.5, snd: 'bloodBoom', ...(b.R > S.boomR ? { strong: 1 } : {}) });
}

// 차징 중 연출 — 짧은 연출을 tick 초마다 다시 보낸다(손님이 중간에 들어와도 지금 상태가 보이게). 풀차징이 되는 순간 한 번 더 크게
function holdFx(E, g, h, c, dt) {
  if (c.t < S.charge) return;
  const wasFull = c.full;
  c.full = c.t >= H.full ? 1 : 0;
  c.hT -= dt;
  if (c.hT > 0 && c.full === (wasFull || 0)) return;
  c.hT = H.tick;
  const [ax, ay] = E.face(h);
  E.fx(g, h.map, { kind: 'sk_blood_hold', x: h.x, y: h.y, pi: h.pi, ax, ay, u: r2(Math.min(1, c.t / H.full)), full: c.full, t: H.tick + 0.08, life: H.tick + 0.08,
    ...(c.full && !wasFull ? { snd: 'bloodCharge', ping: 1 } : {}) });
}
// 키를 뗐다 — 차징 중이면 쏜다(0.4초 안에 뗐으면 충전이 끝나는 때). cancel 이면 취소하고 대기 시간을 돌려준다
export function releaseBloodWeapon(g, h, cancel = false) {
  const bs = h?.ws?.blood, c = bs?.cast; if (!c || c.ph !== 0 || !c.held) return;
  c.held = false;
  if (cancel) { bs.cast = null; h.ws.wcd = 0; }
}
// 대쉬하면 차징 취소 — 아직 쏘지 않았으니 대기 시간을 돌려준다
export function cancelBloodCharge(h) {
  const bs = h?.ws?.blood, c = bs?.cast; if (!c || c.ph !== 0) return;
  bs.cast = null; h.ws.wcd = 0;
}
// 차징 중 이동 속도 배율
export const bloodSlow = (h) => (h?.ws?.blood?.cast?.ph === 0 && h.ws.blood.cast.held ? 1 - H.slow : 1);

export function tickBloodWeapon(E, g, h, dt) {
  const bs = h.ws?.blood; if (!bs) return;
  if (E.held(h) !== ID) { clearBlood(g, h); return; }   // 무기를 바꾸면 혈흔 · 진행 중인 혈탄이 모두 사라진다
  for (const k of Object.keys(bs.marks)) {              // 혈흔 — 시간 · 대상 정리
    const m = bs.marks[k], o = find(g, k);
    m[1] -= dt;
    if (!o || o.dead || (o.type ? o.map !== h.map : o.down > 0 || o.map !== h.map) || m[1] <= 0) dropMark(bs, g, k);
    else show(o, m[0]);
  }
  const c = bs.cast; if (!c) return;
  if (!valid(E, g, h, c)) { bs.cast = null; return; }
  c.t += dt;
  if (c.ph === 0) {
    if (c.held && c.t >= H.max) c.held = false;      // 놓침 방지 — 너무 오래 눌러 두면 자동으로 쏜다
    if (c.held) { holdFx(E, g, h, c, dt); return; }  // 키를 누르고 있는 동안 계속 차징한다
    if (c.t >= S.charge) fire(E, g, h, c); else return;
  }
  // 관통 혈탄이 적에 닿는 때
  while (c.pierce.length && c.t >= c.pierce[0].t) {
    const p = c.pierce.shift(), o = find(g, p.k);
    if (strike(E, g, h, c, o, S.mul)) E.fx(g, h.map, { kind: 'sk_blood_hit', x: o.x, y: o.y, pi: h.pi, big: 1, t: 0.35, life: 0.35 });
    if (!c.seeded && o) spawnSeek(E, g, h, c, o.x, o.y);   // 맞힌 첫 적에서 유도 혈탄 6발 — 한 시전에 한 번
  }
  // 유도 혈탄이 닿는 때
  for (const b of c.seek) {
    if (b.dead || b.hit) continue;
    const o = find(g, b.k);
    if (!o || !E.alive(g, h, o, c.map)) { retarget(E, g, h, c, b); continue; }   // 목표가 쓰러졌다 — 다른 적을 따라가거나 흩어진다
    b.tx = o.x; b.ty = o.y;
    if (c.t < b.t) continue;
    b.hit = 1;
    strike(E, g, h, c, o, S.seekMul);
    E.fx(g, h.map, { kind: 'sk_blood_hit', x: o.x, y: o.y, pi: h.pi, t: 0.28, life: 0.28, snd: hitSound(g, c) });
    if (bs.marks[b.k]) arm(E, g, h, c, o, b.k);          // 혈흔이 있으면 폭발 준비(없으면 기본 피해만)
  }
  c.seek = c.seek.filter((b) => !b.dead && !b.hit);
  while (c.boom.length && c.t >= c.boom[0].t) explode(E, g, h, c, c.boom.shift());
  if (c.t >= S.life || (!c.pierce.length && !c.seek.length && !c.boom.length && c.ph === 1 && c.t > S.charge + 0.05)) bs.cast = null;
}
