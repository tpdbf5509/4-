import {
  CX, CY, P, LANES, SLOTS, sk, posAt, nextSlot,
  CLASSES, TOWER_BY_ID, TOWERS, towerIdx, CASTLE_GUN,
  SKILLS, ENEMY, TOTAL_WAVES, PREP, REWARD_T, LEAVE_T, buildQueue, waveKind, waveScale, seatCount, ETYPES,
  diffOf, prepTime, ARENA, ARENA_PATTERNS, arenaInZone, arenaNear,
  PERK_BY_ID, PERK_IDS, perkVal, rollPerks, SURGE_HP, SURGE_SPD, bossScale, WARMUP, castleTier, castleCost, castleGun, CASTLE_TIERS, CASTLE_HP_UP,
} from "./world.js";

// 호스트에서 일어난 연출은 그대로 다른 참가자에게도 보낸다
function fx(g, item) {
  g.fx.push(item);
  if (g.out) g.out.push({ k: "fx", ...item });
}

/* 큰 글씨로 한 번 외친다.
   같은 말이 도배되지 않게 종류마다 잠깐 쉬었다 다시 외친다. */
function callout(g, x, y, text, color, snd, gap = 1.2) {
  if (!g.calls) g.calls = {};
  if (g.t - (g.calls[text] || -99) < gap) return;
  g.calls[text] = g.t;
  fx(g, { kind: "call", x, y, text, color, t: 0.85, life: 0.85, snd });
}

function banner(g, text, sub, tone) {
  const b = { text, sub, tone, t: 2.6, life: 2.6 };
  g.banner = b;
  if (g.out) g.out.push({ k: "banner", ...b });
}

/* ── 타워 성능 (고른 능력·단계가 함께 반영된다) ───────────── */
export const tdef = (t) => TOWER_BY_ID[t.type] || CLASSES[t.owner];
export const perkOf = (g, pi) => (g.players[pi] && g.players[pi].perks) || {};
export const perkN = (g, pi, id) => perkOf(g, pi)[id] || 0;

// 수비대 전체가 나눠 갖는 능력은 모두의 것을 합쳐서 본다
export function teamPerk(g, id) {
  let n = 0;
  g.players.forEach((p, i) => { if (g.seats[i]) n += (p.perks && p.perks[id]) || 0; });
  return n;
}

// 성채가 다칠수록 / 벼랑 끝에서 오르는 몫
export function moodBonus(g, pi) {
  const hpr = Math.max(0, g.core.hp / g.core.max);
  let b = perkVal.berserk(perkN(g, pi, "berserk")) * (1 - hpr);
  if (hpr <= 0.2) b += perkVal.laststand(perkN(g, pi, "laststand"));
  return b;
}

// 자리 성격이 주는 몫
export const spotAt = (i) => (SLOTS[i] && SLOTS[i].spot) || "risk";

export function towerRange(g, t, i) {
  const cmd = perkVal.command(teamPerk(g, "command"));
  const spot = typeof i === "number" ? spotAt(i) : null;
  const aura = tdef(t).aura && spot === "key" ? 1.15 : 1;
  return ((tdef(t).range + 12 * (t.lv - 1)) * (1 + cmd) + perkVal.reach(perkN(g, t.owner, "reach"))
    + (spot === "long" ? 18 : 0)) * aura;
}
export function towerDmg(g, t, i) {
  const cmd = perkVal.command(teamPerk(g, "command"));
  const spot = typeof i === "number" ? spotAt(i) : null;
  const def = tdef(t);
  let spotMul = 1;
  if (spot === "risk") spotMul = 1.2;
  else if (spot === "key" && !def.splash && !def.chain && !def.aura) spotMul = 1.12;
  return def.dmg * (1 + 0.62 * (t.lv - 1))
    * perkVal.power(perkN(g, t.owner, "power"))
    * (1 + cmd + moodBonus(g, t.owner)) * spotMul;
}

/* ── 조작 ───────────────────────────────────────────────── */
export function applyMove(g, pi, act) {
  if (g.phase === "arena") return arenaMove(g, pi, act);
  const p = g.players[pi];
  const from = SLOTS[sk(p.lane, p.slot)];
  const i = nextSlot(from, act);
  if (i < 0) { p.jolt = 0.12; return; }      // 그쪽에는 자리가 없다
  p.lane = SLOTS[i].lane;
  p.slot = SLOTS[i].idx;
  p.jolt = 0.2;
}

// 마우스로 자리를 직접 고른다
export function applyGoto(g, pi, i) {
  if (g.phase === "arena") return;
  const p = g.players[pi];
  const s = SLOTS[i];
  if (!s) return;
  if (p.lane === s.lane && p.slot === s.idx) return;
  p.lane = s.lane;
  p.slot = s.idx;
  p.jolt = 0.2;
}

/* 지은 탑을 판다. 들인 값의 60%가 돌아온다 */
export const SELL_BACK = 0.6;
export function doSell(g, pi) {
  if (g.phase === "arena") return;
  const p = g.players[pi];
  const key = sk(p.lane, p.slot);
  const t = g.towers[key];
  const s = SLOTS[key];
  if (!t) return say(g, s.x, s.y, "빈 자리", "#f0dcb4");
  if (t.owner !== pi) return say(g, s.x, s.y, `${t.owner + 1}P 자리`, "#f0dcb4");
  const back = Math.round((t.spent || tdef(t).cost) * SELL_BACK);
  p.gold += back;
  p.built = Math.max(0, p.built - 1);
  g.towers[key] = null;
  fx(g, { kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5, color: "rgba(212,206,190,1)" });
  fx(g, { kind: "coin", x: s.x, y: s.y - 6, t: 0.8, life: 0.8, snd: "coin" });
  say(g, s.x, s.y, `+${back} 골드`, "#ffd873");
}

/* 대기실로 돌아가기 — 자리에 앉은 사람이 모두 동의해야 간다 */
export function applyLeave(g, pi, want) {
  if (!g.seats[pi]) return;
  if (!g.leave) g.leave = g.seats.map(() => false);
  const next = typeof want === "boolean" ? want : !g.leave[pi];
  g.leave[pi] = next;
  const any = g.leave.some((v, i) => v && g.seats[i]);
  g.leaveT = any ? LEAVE_T : 0;
  if (!any) return;
  if (g.seats.every((on, i) => !on || g.leave[i])) g.leaveDone = 1;
}

export function clearLeave(g) {
  if (g.leave) g.leave = g.seats.map(() => false);
  g.leaveT = 0;
}

/* 성채 강화 — 누구든 자기 골드로 한 단계 올린다 */
export function doCastle(g, pi) {
  if (g.phase === "arena") return;
  const p = g.players[pi];
  if (!p) return;
  const lv = castleTier(g);
  if (lv >= CASTLE_TIERS) return say(g, CX, CY - 70, "최대 단계", "#f0dcb4");
  const cost = castleCost(g);
  if (p.gold < cost) return say(g, CX, CY - 70, `${cost} 골드 필요`, "#f0dcb4");
  p.gold -= cost;
  g.core.lv = lv + 1;
  g.core.max += CASTLE_HP_UP;
  g.core.hp = Math.min(g.core.max, g.core.hp + CASTLE_HP_UP);
  fx(g, { kind: "ring", x: CX, y: CY, r: 210, color: "#ffe08a", t: 0.9, life: 0.9, snd: "bless" });
  fx(g, { kind: "poof", x: CX, y: CY - 10, t: 0.7, life: 0.7, color: "rgba(246,230,190,1)" });
  fx(g, { kind: "heal", x: CX, y: CY - 24, text: `+${CASTLE_HP_UP}`, t: 1.1, life: 1.1 });
  g.shake = Math.max(g.shake, 0.25);
  banner(g, `성채 ${g.core.lv}단계`, "성을 한 겹 더 올렸다 · 대포도 세졌다", "#ffe08a");
}

export function say(g, x, y, text, color) {
  fx(g, { kind: "text", x, y, text, color, t: 1.1, life: 1.1 });
}

export function doBuild(g, pi) {
  if (g.phase === "arena") return arenaAttack(g, pi);
  const p = g.players[pi];
  const key = sk(p.lane, p.slot);
  const s = SLOTS[key];
  const t = g.towers[key];
  if (!t) {
    const def = CLASSES[pi];
    const cost = Math.round(def.cost * perkVal.thrift(perkN(g, pi, "thrift")));
    if (p.gold < cost) return say(g, s.x, s.y, "골드 부족", "#f0dcb4");
    p.gold -= cost;
    p.built++;
    const warm = WARMUP * perkVal.swift(perkN(g, pi, "swift"));
    g.towers[key] = { owner: pi, type: def.id, lv: 1, cd: 0, pulse: 0.4, aim: 0, warm, spent: cost };
    fx(g, { kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5 });
    fx(g, { kind: "ring", x: s.x, y: s.y, r: 46, color: P[pi].light, t: 0.45, life: 0.45, snd: "build" });
    say(g, s.x, s.y, def.name, P[pi].light);
  } else if (t.owner === pi) {
    const def = tdef(t);
    if (t.lv >= 4) return say(g, s.x, s.y, "최대 단계", "#f0dcb4");
    const cost = Math.round(def.cost * (0.7 + t.lv * 0.45) * perkVal.thrift(perkN(g, pi, "thrift")));
    if (p.gold < cost) return say(g, s.x, s.y, `${cost} 골드 필요`, "#f0dcb4");
    p.gold -= cost;
    t.spent = (t.spent || 0) + cost;
    t.lv++;
    t.pulse = 0.4;
    t.warm = WARMUP * 0.6 * perkVal.swift(perkN(g, pi, "swift"));
    fx(g, { kind: "poof", x: s.x, y: s.y, t: 0.5, life: 0.5, color: "rgba(246,220,150,1)" });
    fx(g, { kind: "ring", x: s.x, y: s.y, r: 40, color: "#ffe6a2", t: 0.45, life: 0.45, snd: "build" });
    say(g, s.x, s.y, `${t.lv}단계`, P[pi].light);
  } else {
    say(g, s.x, s.y, `${t.owner + 1}P 자리`, "#f0dcb4");
  }
}

export function doSkill(g, pi) {
  if (g.phase === "arena") return arenaSkill(g, pi);
  const p = g.players[pi];
  if (p.cd > 0) return say(g, CX, CY - 96, `${SKILLS[pi].name} ${Math.ceil(p.cd)}초`, "#f0dcb4");
  p.cd = SKILLS[pi].cd * perkVal.cool(perkN(g, pi, "cool"));
  // 재사용의 축복 — 가끔 대기가 절반으로 줄어든다
  if (Math.random() < perkVal.echo(perkN(g, pi, "echo"))) {
    p.cd *= 0.5;
    fx(g, { kind: "ring", x: CX, y: CY, r: 150, color: "#9fe8ff", t: 0.6, life: 0.6 });
    say(g, CX, CY - 120, "재사용!", "#9fe8ff");
  }
  let amp = perkVal.amp(perkN(g, pi, "amp"));       // 마력 증폭
  const col = P[pi].light;
  const id = CLASSES[pi].id;

  // 타이밍 보너스 — 때를 맞추면 같은 스킬이 더 세게 들어간다
  const alive = g.enemies.filter((e) => !e.dead);
  const crowd = alive.length;
  const boss = alive.find((e) => e.type === "boss" || e.type === "titan");
  const weak = boss && (boss.shred > 0 || boss.hp / boss.max <= 0.5);
  const hpr = g.core.hp / g.core.max;
  let timing = null;
  if (id === "archer" && weak) timing = { mul: 1.25, text: "완벽한 타이밍!" };
  else if (id === "sniper" && boss) timing = { mul: 1.5, text: "CRITICAL!" };
  else if (id === "frost" && crowd >= 15) timing = { mul: 1.5, text: "대규모 동결!" };
  else if (id === "gravity" && crowd >= 12) timing = { mul: 1.5, text: "중력 붕괴!" };
  else if (id === "cannon" && crowd >= 10) timing = { mul: 1.4, text: "완벽한 타이밍!" };
  else if ((id === "flame" || id === "poison" || id === "bolt") && crowd >= 12) timing = { mul: 1.35, text: "완벽한 타이밍!" };
  else if (id === "corrode" && boss) timing = { mul: 1.3, text: "완벽한 타이밍!" };
  else if ((id === "paladin" || id === "supply") && hpr <= 0.35) timing = { mul: 1.5, text: "최후의 보루!" };
  if (timing) {
    amp *= timing.mul;
    callout(g, CX, CY - 130, timing.text, col, "bless");
    fx(g, { kind: "ring", x: CX, y: CY, r: 240, color: col, t: 0.7, life: 0.7 });
    g.shake = Math.max(g.shake, 0.3);
  }
  if (amp > 1) fx(g, { kind: "ring", x: CX, y: CY, r: 200, color: col, t: 0.5, life: 0.5 });

  if (id === "archer") {
    g.focus = 8 * amp;
    banner(g, "집중 사격", "궁수탑 피해가 두 배로", col);
  } else if (id === "sniper") {
    let big = null;
    g.enemies.forEach((e) => { if (!e.dead && (!big || e.hp > big.hp)) big = e; });
    if (big) {
      fx(g, { kind: "mark", x: big.x, y: big.y - 6, t: 0.6, life: 0.6, color: col });
      fx(g, { kind: "slash", x: big.x, y: big.y - 4, t: 0.4, life: 0.4 });
      hurt(g, big, 250 * amp, pi, true);
      g.shake = Math.max(g.shake, 0.4);
    }
    banner(g, "결정타", "가장 단단한 적을 노린다", col);
  } else if (id === "cannon") {
    g.enemies.forEach((e) => {
      hurt(g, e, 45 * amp, pi, true);
      fx(g, { kind: "boom", x: e.x, y: e.y, r: 30, t: 0.4, life: 0.4 });
    });
    g.shake = 0.45;
    banner(g, "융단 폭격", "전장 전체에 포격", col);
  } else if (id === "bolt") {
    g.enemies.forEach((e) => {
      fx(g, { kind: "zap", x: e.x, y: e.y - 70, x2: e.x, y2: e.y, t: 0.26, life: 0.26 });
      e.freeze = Math.max(e.freeze, 1.5 * amp);
      hurt(g, e, 30 * amp, pi, true);
    });
    g.shake = Math.max(g.shake, 0.3);
    banner(g, "뇌우", "하늘에서 번개가 떨어진다", col);
  } else if (id === "flame") {
    g.enemies.forEach((e) => {
      e.burn = Math.max(e.burn || 0, 6);
      e.bdps = Math.max(e.bdps || 0, 16 * amp);
      e.bby = pi;
      fx(g, { kind: "flame", x: e.x, y: e.y - 4, t: 0.5, life: 0.5 });
    });
    g.shake = Math.max(g.shake, 0.25);
    banner(g, "화염 폭풍", "전장이 불바다가 된다", col);
  } else if (id === "poison") {
    g.enemies.forEach((e) => {
      applyPoison(e, 12 * amp, 6, pi);
      fx(g, { kind: "fume", x: e.x, y: e.y - 4, t: 0.5, life: 0.5 });
    });
    banner(g, "역병", "모든 적이 6초간 병든다", col);
  } else if (id === "frost") {
    g.enemies.forEach((e) => {
      e.freeze = Math.max(e.freeze, 4 * amp);
      fx(g, { kind: "ice", x: e.x, y: e.y, t: 0.5, life: 0.5 });
    });
    banner(g, "한파", "모든 적이 얼어붙는다", col);
  } else if (id === "gravity") {
    g.enemies.forEach((e) => {
      e.p = Math.max(0, e.p - 0.12 * amp);
      e.freeze = Math.max(e.freeze, 2 * amp);
      e.pulled = 3;
      const pos = posAt(e.lane, e.p);
      e.x = pos.x; e.y = pos.y;
      fx(g, { kind: "vortex", x: e.x, y: e.y, r: 40, t: 0.6, life: 0.6 });
    });
    g.shake = Math.max(g.shake, 0.35);
    banner(g, "블랙홀", "모두 뒤로 끌려간다", col);
  } else if (id === "supply") {
    g.players.forEach((q, i) => { if (g.seats[i]) q.gold += 45 * amp; });
    g.core.hp = Math.min(g.core.max, g.core.hp + 12 * amp);
    for (let i = 0; i < 6; i++) {
      fx(g, { kind: "coin", x: CX + (Math.random() - 0.5) * 70, y: CY + 20, t: 0.9, life: 0.9 });
    }
    banner(g, "긴급 보급", "전원 45 골드 · 성채 회복", col);
  } else if (id === "corrode") {
    g.enemies.forEach((e) => {
      e.shred = Math.max(e.shred || 0, 8 * amp);
      e.shredAmt = Math.max(e.shredAmt || 0, 0.4);
      fx(g, { kind: "acid", x: e.x, y: e.y - 4, t: 0.5, life: 0.5 });
    });
    banner(g, "산성비", "적의 갑옷이 녹아내린다", col);
  } else {
    g.sanctuary = 8 * amp;
    g.core.hp = Math.min(g.core.max, g.core.hp + 20 * amp);
    fx(g, { kind: "ring", x: CX, y: CY, r: 220, color: col, t: 0.8, life: 0.8 });
    fx(g, { kind: "heal", x: CX, y: CY - 20, text: `+${Math.round(20 * amp)}`, t: 1.1, life: 1.1 });
    banner(g, "성역", "성채를 빛이 감싼다", col);
  }
}

/* ── 보스 보상 ──────────────────────────────────────────── */
export function openReward(g) {
  g.phase = "reward";
  g.timer = REWARD_T;
  g.offer = g.seats.map((on) => (on ? rollPerks(g) : null));
  g.picked = g.seats.map(() => false);
  g.pendingReward = 0;
  g.banner = null;              // 고르는 창이 대신 알려 준다
  fx(g, { kind: "ring", x: CX, y: CY, r: 240, color: "#ffe08a", t: 0.9, life: 0.9, snd: "bless" });
}

export function applyReward(g, pi, k) {
  if (g.phase !== "reward" || !g.offer || !g.seats[pi]) return;
  if (g.picked[pi]) return;
  const ids = g.offer[pi];
  if (!ids) return;
  const id = ids[Math.max(0, Math.min(ids.length - 1, k | 0))];
  const p = g.players[pi];
  p.perks[id] = (p.perks[id] || 0) + 1;
  g.picked[pi] = true;

  if (id === "wall") { g.core.max += 30; g.core.hp = g.core.max; }
  const s = SLOTS[sk(p.lane, p.slot)];
  say(g, s.x, s.y, PERK_BY_ID[id].name, P[pi].light);
  fx(g, { kind: "ring", x: s.x, y: s.y, r: 70, color: P[pi].light, t: 0.5, life: 0.5, snd: "bless" });

  if (g.seats.every((on, i) => !on || g.picked[i])) closeReward(g);
}

export function closeReward(g) {
  // 안 고른 사람은 첫 번째 것을 받는다
  g.seats.forEach((on, i) => {
    if (!on || g.picked[i]) return;
    const id = g.offer[i][0];
    g.players[i].perks[id] = (g.players[i].perks[id] || 0) + 1;
    if (id === "wall") { g.core.max += 30; g.core.hp = g.core.max; }
    g.picked[i] = true;
  });
  g.offer = null;
  g.picked = null;
  // 보스를 잡을 때마다 관문에서 나오는 적이 조금씩 세진다
  g.surge++;
  banner(g, "적이 더 몰려온다", `관문 너머의 적이 강해졌다 (${g.surge}단계)`, "#ff9f6a");
  advanceWave(g);
}

function advanceWave(g) {
  g.players.forEach((p, i) => {
    if (!g.seats[i]) return;
    p.gold += 22 + g.wave * 3 + perkVal.bank(perkN(g, i, "bank"));
  });
  // 체력이 간당간당한 채로 한 웨이브를 넘겼다
  if (g.core.hp / g.core.max <= 0.2) {
    callout(g, CX, CY - 150, "LAST STAND", "#ff7a6a", "bless");
  }
  g.wave++;
  startPrep(g);
}

/* 배치 시간 — 이번에 올 적을 미리 짜 두고 알려 준다 */
export function startPrep(g) {
  g.phase = "prep";
  g.timer = prepTime(g);
  g.queue = buildQueue(g.wave, seatCount(g), g.total || TOTAL_WAVES, g.diff);
  const count = {};
  g.queue.forEach((q) => { count[q.type] = (count[q.type] || 0) + 1; });
  g.preview = Object.entries(count).map(([type, n]) => [ETYPES.indexOf(type), n]);
}

/* ── 피해 ───────────────────────────────────────────────── */
export function hurt(g, e, dmg, byPlayer, ignoreRes) {
  if (e.dead) return;
  const res = Math.max(0, ENEMY[e.type].res - (e.shred > 0 ? e.shredAmt : 0));
  const d = ignoreRes ? dmg : dmg * (1 - res);
  e.hp -= d;
  e.flash = 0.12;
  const big = e.type === "boss" || e.type === "titan";
  // 숫자가 겹쳐 뭉치지 않게, 큰 피해만 좌우로 흩어 띄운다
  if (d >= 18 || big) {
    fx(g, { kind: "dmg", x: e.x + (Math.random() - 0.5) * 22, y: e.y - 8, text: String(Math.round(d)),
      color: typeof byPlayer === "number" ? P[byPlayer].light : "#ffe9bd", t: 0.62, life: 0.62 });
  }
  if (e.hp > 0) return;

  e.dead = true;
  // 연속 처치가 쌓이면 골드가 조금 더 나온다. 너무 커지지 않게 30%에서 멈춘다
  const comboBonus = 1 + Math.min(0.3, Math.floor(g.combo / 10) * 0.1);
  const base = (ENEMY[e.type].gold + g.wave * 0.6) * diffOf(g).gold * comboBonus;
  let reward = Math.round(base * (typeof byPlayer === "number" ? perkVal.gold(perkN(g, byPlayer, "gold")) : 1));
  if (typeof byPlayer === "number") {
    // 행운의 동전 — 가끔 두 배로 줍는다
    if (Math.random() < perkVal.luck(perkN(g, byPlayer, "luck"))) {
      reward *= 2;
      fx(g, { kind: "dmg", x: e.x, y: e.y - 18, text: `+${reward} 행운!`, color: "#ffd873", t: 0.9, life: 0.9 });
    }
    // 탐욕의 손 — 보스에서 한 몫 더
    if (big && perkN(g, byPlayer, "greed")) reward += perkVal.greed(perkN(g, byPlayer, "greed"));
    // 피의 갈증 — 잡고 나면 잠깐 손이 빨라진다
    if (perkN(g, byPlayer, "thirst")) g.players[byPlayer].rage = 3;
    g.players[byPlayer].gold += reward;
    g.players[byPlayer].kills++;
  } else {
    const crew = seatCount(g) || 1;
    g.players.forEach((p, i) => { if (g.seats[i]) p.gold += reward / crew; });
  }
  g.combo++;
  g.comboT = 2.4;
  if (g.combo === 5) callout(g, e.x, e.y - 24, "5 연속", "#ffd873");
  else if (g.combo === 10) callout(g, CX, CY - 150, "10 연속 · 골드 +10%", "#ffd873", "bless");
  else if (g.combo === 20) { callout(g, CX, CY - 150, "RAMPAGE!", "#ff9f5a", "bless"); g.shake = Math.max(g.shake, 0.4); }
  else if (g.combo === 30) { callout(g, CX, CY - 150, "UNSTOPPABLE!", "#ff7a6a", "bless"); g.shake = Math.max(g.shake, 0.55); }
  else if (g.combo > 0 && g.combo % 10 === 0) {
    callout(g, CX, CY - 150, `${g.combo} 연속`, "#ffd873", "bless");
  }
  fx(g, { kind: "poof", x: e.x, y: e.y, t: 0.45, life: 0.45 });
  fx(g, { kind: "coin", x: e.x, y: e.y - 6, t: 0.8, life: 0.8, snd: "coin" });

  if (big) {
    g.shake = Math.max(g.shake, e.type === "titan" ? 0.8 : 0.5);
    fx(g, { kind: "boom", x: e.x, y: e.y, r: e.type === "titan" ? 120 : 70, t: 0.7, life: 0.7 });
    fx(g, { kind: "ring", x: e.x, y: e.y, r: e.type === "titan" ? 260 : 150, color: "#ffd07a", t: 0.7, life: 0.7 });
    g.pendingReward = 1;
  }
}

function zap(g, from, first, dmg, owner, chain, src) {
  const hit = new Set([first.id]);
  let prev = first;
  let d = dmg;
  fx(g, { kind: "zap", x: from.x, y: from.y, x2: first.x, y2: first.y, t: 0.2, life: 0.2, snd: "zap" });
  applyHit(g, first, d, owner, false, src);
  for (let n = 1; n < chain; n++) {
    let best = null, bd = 1e9;
    for (const e of g.enemies) {
      if (e.dead || hit.has(e.id)) continue;
      const dd = Math.hypot(e.x - prev.x, e.y - prev.y);
      if (dd < 96 && dd < bd) { bd = dd; best = e; }
    }
    if (!best) break;
    hit.add(best.id);
    d *= 0.72;
    fx(g, { kind: "zap", x: prev.x, y: prev.y, x2: best.x, y2: best.y, t: 0.2, life: 0.2 });
    applyHit(g, best, d, owner, true, src);
    prev = best;
  }
}

/* 다른 병과가 만들어 둔 상태를 받아 치면 더 아프다.
   맞은 탑 종류와 적의 상태가 맞물릴 때만 터진다. */
export function synergy(g, src, e) {
  if (!src) return null;
  if (src === "cannon" && (e.freeze > 0 || e.slow > 0)) {
    return { mul: 1.5, text: "빙결 파쇄!", color: "#9fd8ff" };
  }
  if (src === "cannon" && e.pulled > 0) {
    return { mul: 1.35, text: "집중 폭격!", color: "#e08cc6" };
  }
  if (src === "sniper" && e.shred > 0) {
    return { mul: 1.35, pierce: true, text: "약점 관통!", color: "#8e99e8" };
  }
  if (src === "bolt" && e.poison > 0) {
    return { mul: 1.4, text: "독성 감전!", color: "#bcdd71" };
  }
  if (src === "frost" && e.burn > 0) {
    return { mul: 1.5, clearBurn: true, text: "열충격!", color: "#7cb6ea" };
  }
  return null;
}

/* 한 발이 적에게 닿았을 때. 보스 표식·마무리 일격·불타는 탄환이 여기서 붙는다 */
export function applyHit(g, e, dmg, owner, quiet, src) {
  if (e.dead) return;
  if (typeof owner !== "number") return hurt(g, e, dmg, owner);
  const big = e.type === "boss" || e.type === "titan";
  let d = dmg;
  let ignoreRes = false;

  // 병과끼리의 연계
  const syn = synergy(g, src, e);
  if (syn) {
    d *= syn.mul;
    if (syn.pierce) ignoreRes = true;
    if (syn.clearBurn) e.burn = 0;
    if (!quiet) {
      callout(g, e.x, e.y - 26, syn.text, syn.color, "boom");
      fx(g, { kind: "ring", x: e.x, y: e.y, r: 52, color: syn.color, t: 0.4, life: 0.4 });
      g.shake = Math.max(g.shake, 0.14);
    }
  }

  const hunter = perkN(g, owner, "hunter");
  if (hunter && big) {
    d *= 1 + perkVal.hunter(hunter);
    if (!quiet) fx(g, { kind: "mark", x: e.x, y: e.y - 6, t: 0.4, life: 0.4, color: P[owner].light });
  }
  const exec = perkN(g, owner, "execute");
  if (exec && e.hp / e.max <= 0.35) {
    d *= 1 + perkVal.execute(exec);
    if (!quiet) fx(g, { kind: "slash", x: e.x, y: e.y - 4, t: 0.3, life: 0.3 });
  }

  const burn = perkN(g, owner, "burn");
  if (burn) {
    e.burn = Math.max(e.burn || 0, 3);
    e.bdps = Math.max(e.bdps || 0, d * perkVal.burn(burn));
    e.bby = owner;
    if (!quiet) fx(g, { kind: "flame", x: e.x, y: e.y - 4, t: 0.4, life: 0.4 });
  }
  hurt(g, e, d, owner, ignoreRes);
}

/* 본체에 맞은 뒤 퍼지는 것들 — 연쇄·관통·폭발 */
function spread(g, b, tg) {
  const owner = b.owner;
  if (typeof owner !== "number") return;

  const arc = perkN(g, owner, "arc");
  if (arc && Math.random() < perkVal.arc(arc)) {
    let best = null, bd = 1e9;
    for (const e of g.enemies) {
      if (e.dead || e === tg) continue;
      const dd = Math.hypot(e.x - tg.x, e.y - tg.y);
      if (dd < 110 && dd < bd) { bd = dd; best = e; }
    }
    if (best) {
      fx(g, { kind: "zap", x: tg.x, y: tg.y, x2: best.x, y2: best.y, t: 0.22, life: 0.22,
        color: P[owner].light });
      applyHit(g, best, b.dmg * 0.6, owner, true);
    }
  }

  const pierce = perkN(g, owner, "pierce");
  if (pierce) {
    const al = Math.hypot(b.vx, b.vy) || 1;
    const ux = b.vx / al, uy = b.vy / al;
    const behind = g.enemies
      .filter((e) => !e.dead && e !== tg)
      .map((e) => ({ e, t: (e.x - tg.x) * ux + (e.y - tg.y) * uy,
        off: Math.abs((e.x - tg.x) * -uy + (e.y - tg.y) * ux) }))
      .filter((o) => o.t > 0 && o.t < 150 && o.off < 26)
      .sort((a, z) => a.t - z.t)
      .slice(0, perkVal.pierce(pierce));
    if (behind.length) {
      const last = behind[behind.length - 1].e;
      fx(g, { kind: "pierce", x: tg.x, y: tg.y, x2: last.x, y2: last.y, t: 0.26, life: 0.26,
        color: P[owner].light });
      behind.forEach((o) => applyHit(g, o.e, b.dmg, owner, true));
    }
  }

  const blast = perkN(g, owner, "blast");
  if (blast) {
    const r = 40;
    fx(g, { kind: "ring", x: tg.x, y: tg.y, r, color: "#ffb45c", t: 0.3, life: 0.3 });
    g.enemies.forEach((e) => {
      if (e.dead || e === tg) return;
      if (Math.hypot(e.x - tg.x, e.y - tg.y) <= r) {
        applyHit(g, e, b.dmg * perkVal.blast(blast), owner, true);
      }
    });
  }
}

function applyPoison(e, dps, time, owner) {
  e.poison = Math.max(e.poison || 0, time);
  e.pdps = Math.max(e.pdps || 0, dps);
  e.pby = owner;
}

/* ── 한 프레임 ──────────────────────────────────────────── */

/* ── 보스 결전 ───────────────────────────────────────────
   보스 웨이브에는 길을 따라오는 대신 결전장이 열린다.
   수비대가 직접 나가서 때리고, 보스가 내리칠 자리는 미리 붉게 뜬다. */

function arenaCrew(g) { return Math.max(1, seatCount(g)); }

// 그 사람이 지은 탑이 곧 주먹의 무게가 된다
export function arenaPower(g, pi) {
  let t = 0;
  g.towers.forEach((tw, i) => { if (tw && tw.owner === pi) t += towerDmg(g, tw, i); });
  return ARENA.base + t * ARENA.tower;
}

export function startArena(g, kind) {
  const base = ENEMY[kind];
  const D = diffOf(g);
  const scale = waveScale(g.wave, g.total || TOTAL_WAVES) * (1 + D.surge * g.surge) * D.hp;
  const max = Math.round(base.hp * scale * ARENA.hpMul * arenaCrew(g));
  g.phase = "arena";
  g.enemies = [];
  g.queue = [];
  g.queueLeft = 0;
  g.arena = {
    type: kind, hp: max, max,
    t: 0, intro: 2.2, outro: 0,
    st: "idle", stT: 2, pat: null, zone: null,
    sup: 3, combo: 0, comboT: 0, jolt: 0, roar: 0,
    limit: kind === "titan" ? 100 : 75, rage: 0,
  };
  const crew = arenaCrew(g);
  let k = 0;
  g.players.forEach((p, i) => {
    if (g.seats[i]) {
      p.ax = ARENA.bx + (k - (crew - 1) / 2) * 165;
      p.ay = ARENA.bfy + 150 + (k % 2) * 26;
      k++;
    } else { p.ax = ARENA.bx; p.ay = ARENA.bfy + 150; }
    p.adir = 1; p.aswing = 0; p.adown = 0; p.acd = 0; p.ahit = 0;
  });
  g.shake = Math.max(g.shake, 0.6);
  fx(g, { kind: "ring", x: CX, y: CY, r: 280, color: kind === "titan" ? "#ff7a6a" : "#ffb06a",
    t: 1, life: 1, snd: "boss" });
  banner(g, base.label, kind === "titan" ? "모두 앞으로 — 마지막 싸움" : "모두 앞으로 — 보스를 막아라",
    kind === "titan" ? "#ff6f6f" : "#ff9f6a");
}

/* 결전장에서의 조작 */
export function arenaMove(g, pi, act) {
  const p = g.players[pi];
  if (!p || p.adown > 0) return;
  if (act === "left" || act === "right") {
    const d = act === "left" ? -1 : 1;
    p.adir = d;
    p.ax = Math.max(ARENA.left, Math.min(ARENA.right, p.ax + d * 26));
  } else if (act === "up" || act === "down") {
    const d = act === "up" ? -1 : 1;
    p.ay = Math.max(ARENA.top, Math.min(ARENA.bottom, (p.ay || ARENA.bfy + 150) + d * ARENA.stepY));
  }
}

function arenaLand(g, pi, mul, label) {
  const a = g.arena;
  const p = g.players[pi];
  if (!a || a.hp <= 0) return;
  const far = arenaNear(p.ax, p.ay || ARENA.bfy, ARENA.bx, ARENA.bfy);
  if (far > ARENA.reach) {
    say(g, p.ax, (p.ay || ARENA.bfy) - 96, "닿지 않는다", "#d9c9a6");
    return;
  }
  let dmg = arenaPower(g, pi) * mul;
  dmg *= 1 + perkVal.hunter(perkN(g, pi, "hunter"));        // 사냥꾼의 표식
  dmg *= 1 + Math.min(0.5, a.combo * 0.012);                 // 연타가 쌓일수록
  const crit = Math.random() < perkVal.crit(perkN(g, pi, "crit"));
  if (crit) dmg *= 2;
  dmg = Math.round(dmg);
  a.hp = Math.max(0, a.hp - dmg);
  a.jolt = 0.16;
  a.combo += 1;
  a.comboT = ARENA.comboT;
  const px = ARENA.bx + (p.ax < ARENA.bx ? -40 : 40) + (Math.random() - 0.5) * 40;
  fx(g, { kind: "dmg", x: px, y: ARENA.by + 40 + (Math.random() - 0.5) * 40,
    text: String(dmg), color: crit ? "#ffd873" : P[pi].light, t: 0.8, life: 0.8, big: crit ? 1 : 0 });
  fx(g, { kind: "slash", x: ARENA.bx + (p.ax < ARENA.bx ? -52 : 52), y: ARENA.by + 60,
    a: p.ax < ARENA.bx ? 0 : Math.PI, color: P[pi].key, t: 0.24, life: 0.24, snd: crit ? "crit" : "hit" });
  if (label) callout(g, CX, 250, label, "#ffd873", "crit", 0.8);
  if (crit) callout(g, CX, 250, "치명타!", "#ffd873", null, 1.1);
  if (a.combo > 0 && a.combo % 15 === 0) callout(g, CX, 250, `${a.combo} 연타!`, "#ffb765", null, 0.9);
  if (a.hp <= 0) arenaDown(g, pi);
}

export function arenaAttack(g, pi) {
  const p = g.players[pi];
  if (!p || p.adown > 0 || p.acd > 0 || !g.arena || g.arena.intro > 0) return;
  p.acd = ARENA.cd / (1 + perkVal.haste(perkN(g, pi, "haste")));   // 전장의 북
  p.aswing = ARENA.swing;
  p.ahit = ARENA.land;
  p.adir = p.ax < ARENA.bx ? 1 : -1;
}

export function arenaSkill(g, pi) {
  const p = g.players[pi];
  const a = g.arena;
  if (!p || !a || a.intro > 0) return;
  if (p.cd > 0) return say(g, p.ax, ARENA.floor - 96, `${SKILLS[pi].name} ${Math.ceil(p.cd)}초`, "#f0dcb4");
  if (p.adown > 0) return;
  p.cd = SKILLS[pi].cd * perkVal.cool(perkN(g, pi, "cool"));
  p.aswing = ARENA.swing * 1.6;
  p.ahit = ARENA.land * 1.4;
  p.adir = p.ax < ARENA.bx ? 1 : -1;
  p.askill = 1;
  fx(g, { kind: "ring", x: p.ax, y: (p.ay || ARENA.bfy) - 20, r: 90, color: P[pi].key, t: 0.5, life: 0.5, snd: "skill" });
}

/* 보스가 쓰러졌다 */
function arenaDown(g, pi) {
  const a = g.arena;
  a.outro = 2.4;
  const base = ENEMY[a.type];
  const D = diffOf(g);
  const gold = Math.round(base.gold * D.gold * perkVal.gold(perkN(g, pi, "gold")));
  g.players.forEach((p, i) => { if (g.seats[i]) p.gold += gold; });
  if (g.players[pi]) g.players[pi].kills += 1;
  g.shake = Math.max(g.shake, 0.8);
  fx(g, { kind: "ring", x: ARENA.bx, y: ARENA.by + 60, r: 260, color: "#ffd873", t: 1.1, life: 1.1, snd: "boom" });
  fx(g, { kind: "boom", x: ARENA.bx, y: ARENA.by + 60, r: 120, t: 0.8, life: 0.8 });
  callout(g, CX, 250, "격파!", "#ffd873", "bless", 0);
  banner(g, `${base.label} 격파`, `모두 ${gold} 골드`, "#ffd873");
}

/* 보스의 다음 공격을 고른다 */
function arenaNextPattern(g) {
  const a = g.arena;
  const pool = a.type === "titan" ? [0, 1, 2, 1] : [0, 2, 0, 1];
  const pat = ARENA_PATTERNS[pool[Math.floor(Math.random() * pool.length)]];
  a.pat = pat.id;
  a.st = "tell";
  a.stT = pat.tell * (a.type === "titan" ? 0.88 : 1);
  const spot = () => {
    // 아무나 한 사람 근처를 노린다
    const on = g.players.filter((q, i) => g.seats[i]);
    const q = on.length ? on[Math.floor(Math.random() * on.length)] : null;
    return q ? { x: q.ax + (Math.random() - 0.5) * 90, y: (q.ay || ARENA.bfy) + (Math.random() - 0.5) * 60 }
             : { x: ARENA.bx, y: ARENA.bfy + 120 };
  };
  if (pat.id === "slam") {
    const c = spot();
    a.zone = [{ k: "circle", x: c.x, y: c.y, r: a.type === "titan" ? 230 : 195 }];
  } else if (pat.id === "sweep") {
    a.zone = [{ k: "ring", x: ARENA.bx, y: ARENA.bfy, r0: a.type === "titan" ? 150 : 135,
      r1: a.type === "titan" ? 460 : 400 }];
  } else {
    a.zone = [];
    for (let i = 0; i < 3; i++) {
      const c = spot();
      a.zone.push({ k: "circle", x: c.x, y: c.y, r: 140 });
    }
  }
  callout(g, CX, 300, pat.name, "#ff8f6a", "warn", 1.4);
}

/* 공격이 떨어졌다 — 자리에 있던 사람은 넘어지고 성채가 다친다 */
function arenaStrike(g) {
  const a = g.arena;
  const pat = ARENA_PATTERNS.find((x) => x.id === a.pat) || ARENA_PATTERNS[0];
  const base = ENEMY[a.type];
  const D = diffOf(g);
  let hit = 0, safe = 0;
  g.players.forEach((p, i) => {
    if (!g.seats[i]) return;
    const py = p.ay || ARENA.bfy;
    const inside = (a.zone || []).some((z) => arenaInZone(z, p.ax, py));
    if (inside) {
      hit += 1;
      p.adown = ARENA.down;
      p.aswing = 0;
      const kx = p.ax - ARENA.bx, ky = py - ARENA.bfy;
      const len = Math.max(1, Math.hypot(kx, ky));
      p.ax = Math.max(ARENA.left, Math.min(ARENA.right, p.ax + (kx / len) * ARENA.knock));
      p.ay = Math.max(ARENA.top, Math.min(ARENA.bottom, py + (ky / len) * ARENA.knock * 0.6));
      fx(g, { kind: "poof", x: p.ax, y: p.ay - 20, t: 0.5, life: 0.5, color: "rgba(230,190,140,1)" });
    } else {
      safe += 1;
      p.adodge = 1.1;
      fx(g, { kind: "text", x: p.ax, y: py - 108, text: "회피!", color: P[i].light, t: 0.8, life: 0.8 });
    }
  });
  (a.zone || []).forEach((z) => {
    fx(g, { kind: "boom", x: z.x, y: z.y, r: Math.min(150, (z.k === "ring" ? z.r1 * 0.5 : z.r) * 0.8),
      t: 0.5, life: 0.5, snd: "boom" });
  });
  g.shake = Math.max(g.shake, 0.45);
  if (hit) {
    const dmg = Math.max(1, Math.round(base.dmg * ARENA.coreHit * pat.dmg * D.hp * (a.rage ? 1.6 : 1)
      * perkVal.guard(teamPerk(g, "guard")) * hit));
    g.core.hp -= dmg;
    g.hitFlash = 0.35;
    fx(g, { kind: "dmg", x: CX, y: 180, text: `성채 -${dmg}`, color: "#ff8d76", t: 1, life: 1 });
    a.combo = 0; a.comboT = 0;
  } else if (safe) {
    callout(g, CX, 250, "완벽 회피!", "#9fe8ff", "perfect", 0.9);
  }
  a.st = "rest";
  a.stT = a.type === "titan" ? 0.8 : 1;
  a.zone = null;
}

export function stepArena(g, dt) {
  const a = g.arena;
  if (!a) { g.phase = "wave"; return; }
  a.t += dt;
  if (a.jolt > 0) a.jolt -= dt;
  // 제한 시간이 다하면 보스가 분노한다 — 더 빨리, 더 세게 내리친다
  if (a.outro <= 0 && a.intro <= 0) {
    a.limit -= dt;
    if (a.limit <= 0 && !a.rage) {
      a.rage = 1;
      a.limit = 0;
      g.shake = Math.max(g.shake, 0.7);
      callout(g, CX, 250, "분노!", "#ff6f6f", "boss", 0);
      banner(g, "보스가 분노했다", "내리치기가 빨라지고 더 아프다", "#ff6f6f");
    }
  }
  if (a.comboT > 0) { a.comboT -= dt; if (a.comboT <= 0) a.combo = 0; }

  g.players.forEach((p, i) => {
    if (p.cd > 0) p.cd -= dt;
    if (p.acd > 0) p.acd -= dt;
    if (p.adodge > 0) p.adodge -= dt;
    if (p.adown > 0) p.adown -= dt;
    if (p.aswing > 0) {
      p.aswing -= dt;
      if (p.ahit > 0) {
        p.ahit -= dt;
        if (p.ahit <= 0 && g.seats[i]) {
          const sk2 = p.askill;
          p.askill = 0;
          arenaLand(g, i, sk2 ? ARENA.skill : 1, sk2 ? SKILLS[i].name : null);
        }
      }
    }
  });

  if (a.intro > 0) { a.intro -= dt; return; }

  if (a.outro > 0) {
    a.outro -= dt;
    if (a.outro <= 0) {
      g.arena = null;
      if (a.type === "titan") { g.phase = "clear"; return; }
      g.pendingReward = 1;
      openReward(g);
    }
    return;
  }

  // 지은 탑이 성벽 위에서 같이 쏜다
  a.sup -= dt;
  if (a.sup <= 0) {
    a.sup = 2.2;
    let d = 0;
    g.towers.forEach((tw, i) => { if (tw) d += towerDmg(g, tw, i); });
    if (d > 0) {
      const dmg = Math.round(d * 0.8);
      a.hp = Math.max(0, a.hp - dmg);
      fx(g, { kind: "dmg", x: ARENA.bx + (Math.random() - 0.5) * 90, y: ARENA.by + 10,
        text: String(dmg), color: "#cfe3a6", t: 0.8, life: 0.8 });
      fx(g, { kind: "zap", x0: ARENA.bx - 240, y0: 120, x1: ARENA.bx - 30, y1: ARENA.by + 30,
        color: "#e8dcc0", t: 0.22, life: 0.22 });
      fx(g, { kind: "zap", x0: ARENA.bx + 240, y0: 120, x1: ARENA.bx + 30, y1: ARENA.by + 30,
        color: "#e8dcc0", t: 0.22, life: 0.22 });
      if (a.hp <= 0) { arenaDown(g, 0); return; }
    }
  }

  a.stT -= dt;
  if (a.stT <= 0) {
    if (a.st === "idle") arenaNextPattern(g);
    else if (a.st === "tell") arenaStrike(g);
    else {
      a.st = "idle";
      a.stT = ((a.type === "titan" ? 1.1 : 1.6) + Math.random() * 0.8) * (a.rage ? 0.5 : 1);
    }
  }
}

export function step(g, dt) {
  g.t += dt;
  if (g.leaveT > 0) {
    g.leaveT -= dt;
    if (g.leaveT <= 0) clearLeave(g);
  }
  if (g.shake > 0) g.shake -= dt;
  if (g.hitFlash > 0) g.hitFlash -= dt;
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }
  g.fx.forEach((f) => (f.t -= dt));
  g.fx = g.fx.filter((f) => f.t > 0);

  const kPos = 1 - Math.exp(-dt * 15);
  const kRad = 1 - Math.exp(-dt * 9);
  g.players.forEach((p, pi) => {
    const key = sk(p.lane, p.slot);
    const s = SLOTS[key];
    const t = g.towers[key];
    const range = t ? towerRange(g, t, key) : CLASSES[pi].range + perkVal.reach(perkN(g, pi, "reach"));
    p.cx += (s.x - p.cx) * kPos;
    p.cy += (s.y - p.cy) * kPos;
    p.cr += (range - p.cr) * kRad;
    if (p.jolt > 0) p.jolt -= dt;
  });

  if (g.phase === "reward") {
    g.timer -= dt;
    if (g.timer <= 0) closeReward(g);
    return;
  }
  if (g.phase === "arena") {
    stepArena(g, dt);
    if (g.core.hp <= 0) { g.core.hp = 0; g.arena = null; g.phase = "over"; }
    return;
  }
  if (g.phase !== "prep" && g.phase !== "wave") return;

  // 키를 누르고 있을 때의 연속 이동은 각 참가자 브라우저에서 처리한다
  g.players.forEach((p) => { if (p.cd > 0) p.cd -= dt; });
  if (g.focus > 0) g.focus -= dt;
  if (g.sanctuary > 0) g.sanctuary -= dt;

  if (g.phase === "prep") {
    g.timer -= dt;
    if (g.timer <= 0) {
      const total = g.total || TOTAL_WAVES;
      const kind0 = waveKind(g.wave, total);
      if (kind0 === "boss" || kind0 === "titan") { startArena(g, kind0); return; }
      g.phase = "wave";
      if (!g.queue.length) g.queue = buildQueue(g.wave, seatCount(g), total, g.diff);
      g.spawnT = 0;
      const kind = waveKind(g.wave, total);
      if (kind === "rush") banner(g, `웨이브 ${g.wave} — 돌격`, "발 빠른 고블린 떼가 몰려온다", "#ffb765");
      else if (kind === "boss") banner(g, `웨이브 ${g.wave} — 보스`, "오우거 지휘관이 온다", "#ff8f6a");
      else if (kind === "titan") banner(g, "최종 웨이브 — 대군주", "성문 앞까지 한 걸음도 내주지 마라", "#ff6f6f");
      else banner(g, `웨이브 ${g.wave}`, "적이 네 갈래 길로 들어온다", "#e8dcc0");
    }
  } else if (g.phase === "wave") {
    g.spawnT -= dt;
    if (g.queue.length && g.spawnT <= 0) {
      const q = g.queue.shift();
      const base = ENEMY[q.type];
      const big = q.type === "boss" || q.type === "titan";
      const D = diffOf(g);
      // 보스는 수비대가 적으면 그만큼 체력을 덜어 준다
      const scale = waveScale(g.wave, g.total || TOTAL_WAVES) * (1 + D.surge * g.surge) * D.hp
        * (big ? bossScale(seatCount(g)) : 1);
      const p0 = posAt(q.lane, 0);
      g.enemies.push({
        id: g.nextId++,
        type: q.type, lane: q.lane, p: 0,
        spd: base.spd * D.spd * (1 + Math.min(0.6, SURGE_SPD * g.surge)),
        hp: base.hp * scale, max: base.hp * scale,
        x: p0.x, y: p0.y, ax: p0.ax, ay: p0.ay,
        slow: 0, slowAmt: 0.5, freeze: 0, flash: 0, poison: 0, pdps: 0, dead: false, age: 0,
      });
      if (big) {
        g.shake = Math.max(g.shake, q.type === "titan" ? 0.7 : 0.4);
        fx(g, { kind: "ring", x: p0.x, y: p0.y, r: q.type === "titan" ? 180 : 110,
          color: q.type === "titan" ? "#ff7a6a" : "#ffb06a", t: 0.7, life: 0.7, snd: "boss" });
        banner(g, base.label, q.type === "titan" ? "땅이 흔들린다" : "보스가 나타났다",
          q.type === "titan" ? "#ff6f6f" : "#ff9f6a");
      }
      g.spawnT = q.type === "titan" ? 2 : q.type === "boss" ? 1.4 : q.type === "rusher" ? 0.36 : 0.62;
    }
    if (!g.queue.length && !g.enemies.length) {
      if (g.wave >= (g.total || TOTAL_WAVES)) { g.phase = "clear"; return; }
      if (g.pendingReward) { openReward(g); return; }
      advanceWave(g);
    }
  }

  // 성채 돌봄 — 재생의 문장 · 응급 수리 · 비상식량
  {
    const hpr = g.core.hp / g.core.max;
    const regen = teamPerk(g, "regen");
    if (regen) {
      g.regenT = (g.regenT || 0) + dt;
      if (g.regenT >= 5) {
        g.regenT = 0;
        const heal = g.core.max * perkVal.regen(regen);
        if (g.core.hp < g.core.max) {
          g.core.hp = Math.min(g.core.max, g.core.hp + heal);
          fx(g, { kind: "heal", x: CX, y: CY - 20, text: `+${Math.round(heal)}`, t: 1, life: 1 });
        }
      }
    }
    const repair = teamPerk(g, "repair");
    if (repair && hpr <= 0.3 && !g.repairUsed) {
      g.repairUsed = 1;
      const heal = g.core.max * perkVal.repair(repair);
      g.core.hp = Math.min(g.core.max, g.core.hp + heal);
      fx(g, { kind: "heal", x: CX, y: CY - 20, text: `응급 수리 +${Math.round(heal)}`, t: 1.4, life: 1.4 });
      fx(g, { kind: "ring", x: CX, y: CY, r: 180, color: "#8fe08a", t: 0.7, life: 0.7, snd: "bless" });
      banner(g, "응급 수리", "성벽을 급히 메웠다", "#8fe08a");
    }
    if (g.repairUsed && hpr > 0.5) g.repairUsed = 0;

    if (hpr <= 0.5 && !g.rationUsed) {
      let gave = 0;
      g.players.forEach((p, i) => {
        if (!g.seats[i]) return;
        const n = perkN(g, i, "ration");
        if (!n) return;
        p.gold += perkVal.ration(n);
        gave += perkVal.ration(n);
      });
      if (gave) {
        g.rationUsed = 1;
        for (let k = 0; k < 8; k++) {
          fx(g, { kind: "coin", x: CX + (Math.random() - 0.5) * 100, y: CY + 10, t: 1, life: 1 });
        }
        banner(g, "비상식량", "창고를 열었다", "#ffd873");
      }
    }
    if (g.rationUsed && hpr > 0.7) g.rationUsed = 0;
  }

  // 피의 갈증이 도는 동안
  g.players.forEach((p) => { if (p.rage > 0) p.rage -= dt; });

  // 보급소
  const supports = [];
  g.towers.forEach((t, i) => { if (t && t.type === "supply") supports.push({ t, s: SLOTS[i] }); });
  const supDef = TOWER_BY_ID.supply;
  supports.forEach(({ t }) => {
    g.players.forEach((p, i) => { if (g.seats[i]) p.gold += supDef.gold * t.lv * dt; });
  });

  // 성채의 대포 — 성문 앞까지 온 적을 직접 때린다
  {
    const cg = g.castle;
    const gun = castleGun(castleTier(g));
    cg.cd -= dt;
    let target = null;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - CX, e.y - CY) > gun.range) continue;
      if (!target || e.p > target.p) target = e;
    }
    if (target) {
      cg.aim = Math.atan2(target.y - (CY - 22), target.x - CX);
      if (cg.cd <= 0) {
        cg.cd = gun.interval;
        cg.pulse = 0.35;
        const dmg = gun.dmg;
        g.bullets.push({
          x: CX + Math.cos(cg.aim) * 18, y: CY - 22 + Math.sin(cg.aim) * 18,
          tx: target.x, ty: target.y, target, dmg, owner: null,
          splash: gun.splash, slow: 0, slowT: 0, speed: 340, kind: "shell",
          travel: 0, total: Math.max(1, Math.hypot(target.x - CX, target.y - CY)),
          vx: target.x - CX, vy: target.y - CY,
        });
        if (g.out) {
          g.out.push({ k: "shot", si: -1, x: CX, y: CY - 22, tx: target.x, ty: target.y,
            owner: null, splash: gun.splash, speed: 340, kind: "shell", aim: cg.aim });
        }
        fx(g, { kind: "poof", x: CX + Math.cos(cg.aim) * 26, y: CY - 22 + Math.sin(cg.aim) * 26,
          t: 0.3, life: 0.3, color: "rgba(236,228,212,1)" });
      }
    }
    if (cg.pulse > 0) cg.pulse -= dt;
  }

  // 성기사탑 — 서 있는 것만으로 성채를 지킨다
  {
    let ward = 0;
    g.towers.forEach((t) => { if (t && t.type === "paladin" && !(t.warm > 0)) ward += TOWER_BY_ID.paladin.ward * t.lv; });
    g.ward = Math.min(0.45, ward);
  }

  // 타워 사격
  g.towers.forEach((t, i) => {
    if (!t) return;
    if (t.pulse > 0) t.pulse -= dt;
    const def = tdef(t);
    if (!def.interval) return;                 // 보급소·성기사탑은 쏘지 않는다
    const s = SLOTS[i];
    if (t.warm > 0) { t.warm -= dt; return; }        // 짓고 나서 자리를 잡는 중
    const cmd = perkVal.command(teamPerk(g, "command"));
    const rage = g.players[t.owner] && g.players[t.owner].rage > 0
      ? perkVal.thirst(perkN(g, t.owner, "thirst")) : 0;
    const spot = spotAt(i);
    const haste = perkVal.haste(perkN(g, t.owner, "haste")) + cmd + rage + (spot === "focus" ? 0.15 : 0);
    let mul = 1 + haste;
    supports.forEach((sp) => {
      if (Math.hypot(sp.s.x - s.x, sp.s.y - s.y) <= supDef.range) {
        mul = Math.max(mul, 1 + haste + supDef.buff * sp.t.lv);
      }
    });
    t.cd -= dt * mul;
    const range = towerRange(g, t, i);

    // 범위에 들어온 적 모두를 상대하는 탑 (화염·중력)
    if (def.aura) {
      if (t.cd > 0) return;
      const inRange = g.enemies.filter((e) => !e.dead && Math.hypot(e.x - s.x, e.y - s.y) <= range);
      if (!inRange.length) { t.cd = 0; return; }
      t.cd = def.interval;
      t.pulse = 0.4;
      if (def.aura === "burn") {
        const dps = def.burn * (1 + 0.5 * (t.lv - 1)) * perkVal.power(perkN(g, t.owner, "power"));
        inRange.forEach((e) => {
          e.burn = Math.max(e.burn || 0, def.burnT);
          e.bdps = Math.max(e.bdps || 0, dps);
          e.bby = t.owner;
        });
        fx(g, { kind: "firering", x: s.x, y: s.y - 6, r: range, t: 0.5, life: 0.5 });
      } else {
        // 중력탑 — 지나간 만큼 뒤로 당기고 잠깐 붙잡는다
        const back = def.pull * (1 + 0.45 * (t.lv - 1));
        inRange.forEach((e) => {
          e.p = Math.max(0, e.p - back);
          e.freeze = Math.max(e.freeze, 0.5);
          e.pulled = 2.5;                      // 잠깐 뭉쳐 있는 동안은 폭격이 잘 든다
          const pos = posAt(e.lane, e.p);
          e.x = pos.x; e.y = pos.y;
        });
        fx(g, { kind: "vortex", x: s.x, y: s.y - 6, r: range, t: 0.6, life: 0.6 });
      }
      if (g.out) g.out.push({ k: "shot", si: i, x: s.x, y: s.y, tx: s.x, ty: s.y, owner: t.owner, aura: def.aura });
      return;
    }

    // 하나를 고른다. 저격탑은 가장 단단한 적을, 나머지는 가장 앞선 적을
    let target = null;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) > range) continue;
      if (!target) { target = e; continue; }
      if (def.pickBig ? e.hp > target.hp : e.p > target.p) target = e;
    }
    if (target) t.aim = Math.atan2(target.y - (s.y - 20), target.x - s.x);
    if (t.cd > 0) return;
    if (!target) { t.cd = 0; return; }
    t.cd = def.interval;
    let dmg = towerDmg(g, t, i);
    if (t.type === "archer" && g.focus > 0) dmg *= 2;
    const crit = Math.random() < perkVal.crit(perkN(g, t.owner, "crit"));
    if (crit) dmg *= 2;
    const chill = perkN(g, t.owner, "chill") > 0;
    const kind = { archer: "arrow", sniper: "slug", cannon: "ball", frost: "shard",
      bolt: "bolt", poison: "orb", corrode: "acid" }[t.type] || "arrow";
    const speed = t.type === "cannon" ? 300 : t.type === "bolt" ? 900 : t.type === "sniper" ? 1200 : 470;
    g.bullets.push({
      x: s.x, y: s.y - 20, tx: target.x, ty: target.y, target, dmg,
      owner: t.owner, crit,
      src: t.type, spot,
      splash: (def.splash || 0) * (spot === "key" ? 1.3 : 1),
      slow: def.slow || (chill ? 0.82 : 0), slowT: def.slowT || (chill ? 1.2 : 0),
      chain: def.chain ? def.chain + (spot === "key" ? 1 : 0) : 0, poison: def.poison ? def.poison * (1 + 0.5 * (t.lv - 1)) : 0,
      poisonT: def.poisonT || 0,
      shred: def.shred || 0, shredT: def.shredT || 0,
      speed, kind,
      travel: 0, total: Math.max(1, Math.hypot(target.x - s.x, target.y - s.y + 20)),
      vx: target.x - s.x, vy: target.y - (s.y - 20),
    });
    if (g.out) {
      g.out.push({ k: "shot", si: i, x: s.x, y: s.y - 20, tx: target.x, ty: target.y,
        owner: t.owner, splash: def.splash || 0, speed, kind });
    }
    t.pulse = 0.4;
    if (t.type === "cannon") {
      fx(g, { kind: "poof", x: s.x + Math.cos(t.aim) * 22, y: s.y - 20 + Math.sin(t.aim) * 22,
        t: 0.3, life: 0.3, color: "rgba(230,224,210,1)" });
    }
  });

  // 탄
  g.bullets = g.bullets.filter((b) => {
    const tg = b.target;
    if (tg && !tg.dead) { b.tx = tg.x; b.ty = tg.y; }
    const dx = b.tx - b.x, dy = b.ty - b.y;
    const d = Math.hypot(dx, dy);
    const mv = b.speed * dt;
    b.vx = dx; b.vy = dy;
    b.travel = Math.min(1, 1 - d / b.total);
    if (d <= mv) {
      if (b.splash) {
        let killed = 0;
        g.enemies.forEach((e) => {
          if (e.dead) return;
          const dd = Math.hypot(e.x - b.tx, e.y - b.ty);
          if (dd > b.splash) return;
          applyHit(g, e, b.dmg * (dd < b.splash * 0.5 ? 1 : 0.6), b.owner, dd > 1, b.src);
          if (e.dead) killed++;
        });
        if (killed >= 3) callout(g, b.tx, b.ty - 26, `${killed}킬!`, "#ffd873", "boom");
        fx(g, { kind: "boom", x: b.tx, y: b.ty, r: b.splash, t: 0.42, life: 0.42, snd: "boom" });
        g.shake = Math.max(g.shake, b.kind === "shell" ? 0.2 : 0.12);
      } else if (tg && !tg.dead) {
        if (b.chain) {
          zap(g, { x: b.x, y: b.y }, tg, b.dmg, b.owner, b.chain, b.src);
        } else {
          applyHit(g, tg, b.dmg, b.owner, false, b.src);
        }
        spread(g, b, tg);
        if (b.slow) {
          tg.slow = Math.max(tg.slow, b.slowT);
          tg.slowAmt = b.slow;
          fx(g, { kind: "ice", x: b.tx, y: b.ty, t: 0.4, life: 0.4, snd: "ice" });
        }
        if (b.poison) {
          applyPoison(tg, b.poison, b.poisonT, b.owner);
          fx(g, { kind: "fume", x: b.tx, y: b.ty, t: 0.5, life: 0.5 });
        }
        if (b.shred) {
          tg.shred = Math.max(tg.shred || 0, b.shredT);
          tg.shredAmt = Math.max(tg.shredAmt || 0, b.shred);
          fx(g, { kind: "acid", x: b.tx, y: b.ty, t: 0.45, life: 0.45 });
        }
      }
      return false;
    }
    b.x += (dx / d) * mv;
    b.y += (dy / d) * mv;
    return true;
  });

  // 적 이동
  g.enemies.forEach((e) => {
    e.age += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.dead) return;
    if (e.shred > 0) e.shred -= dt;
    if (e.pulled > 0) e.pulled -= dt;
    if (e.burn > 0) {
      e.burn -= dt;
      e.btick = (e.btick || 0) + dt;
      if (e.btick >= 0.5) {
        e.btick = 0;
        hurt(g, e, e.bdps * 0.5, e.bby, true);
        fx(g, { kind: "flame", x: e.x, y: e.y - 4, t: 0.35, life: 0.35 });
      }
      if (e.dead) return;
    }
    if (e.poison > 0) {
      e.poison -= dt;
      e.ptick = (e.ptick || 0) + dt;
      if (e.ptick >= 0.5) {
        e.ptick = 0;
        hurt(g, e, e.pdps * 0.5, e.pby, true);   // 독은 장갑을 무시한다
        fx(g, { kind: "fume", x: e.x, y: e.y - 4, t: 0.4, life: 0.4 });
      }
      if (e.dead) return;
    }
    if (e.freeze > 0) { e.freeze -= dt; return; }
    if (e.slow > 0) e.slow -= dt;
    const spd = (e.spd || ENEMY[e.type].spd) * (e.slow > 0 ? e.slowAmt : 1);
    e.p += (spd * dt) / LANES[e.lane].len;
    const pos = posAt(e.lane, e.p);
    e.x = pos.x; e.y = pos.y; e.ax = pos.ax; e.ay = pos.ay;
    if (e.p >= 1) {
      e.dead = true;
      const heavy = e.type === "boss" || e.type === "titan";
      let take = ENEMY[e.type].dmg * perkVal.guard(teamPerk(g, "guard"));
      if (heavy) take *= perkVal.bulwark(teamPerk(g, "bulwark"));
      take *= 1 - (g.ward || 0);                 // 성기사탑
      if (g.sanctuary > 0) take *= 0.4;          // 성역
      if (take < ENEMY[e.type].dmg - 0.5) {
        fx(g, { kind: "ring", x: CX, y: CY, r: 90, color: "#9fd8ff", t: 0.5, life: 0.5 });
      }
      g.core.hp -= take;
      g.shake = 0.32;
      g.hitFlash = 0.35;
      g.combo = 0;
      fx(g, { kind: "boom", x: e.x, y: e.y, r: 26, t: 0.35, life: 0.35, snd: "core" });
    }
  });
  g.enemies = g.enemies.filter((e) => !e.dead);
  g.bullets = g.bullets.filter((b) => !b.target || !b.target.dead || b.splash);

  if (g.core.hp <= 0) { g.core.hp = 0; g.phase = "over"; }
}


/* ────────────────────────────────────────────────────────────
   호스트가 아닌 참가자용.
   판정은 호스트만 하고, 이쪽은 받은 상태 사이를 부드럽게 이어 그린다.
   ──────────────────────────────────────────────────────────── */
export function stepVisual(g, dt) {
  g.t += dt;
  if (g.leaveT > 0) g.leaveT -= dt;
  if (g.shake > 0) g.shake -= dt;
  if (g.hitFlash > 0) g.hitFlash -= dt;
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }

  g.fx.forEach((f) => (f.t -= dt));
  g.fx = g.fx.filter((f) => f.t > 0);

  const kPos = 1 - Math.exp(-dt * 15);
  const kRad = 1 - Math.exp(-dt * 9);
  g.players.forEach((p, pi) => {
    const key = sk(p.lane, p.slot);
    const s = SLOTS[key];
    const t = g.towers[key];
    const range = t ? towerRange(g, t, key) : CLASSES[pi].range + perkVal.reach(perkN(g, pi, "reach"));
    p.cx += (s.x - p.cx) * kPos;
    p.cy += (s.y - p.cy) * kPos;
    p.cr += (range - p.cr) * kRad;
    if (p.jolt > 0) p.jolt -= dt;
    if (p.cd > 0) p.cd -= dt;
  });

  g.towers.forEach((t) => {
    if (!t) return;
    if (t.pulse > 0) t.pulse -= dt;
    if (t.warm > 0) t.warm -= dt;
  });
  g.players.forEach((p) => { if (p.rage > 0) p.rage -= dt; });
  if (g.castle.pulse > 0) g.castle.pulse -= dt;

  // 탄은 눈에 보이는 용도라 목표 지점까지 날아간 뒤 사라진다
  g.bullets = g.bullets.filter((b) => {
    const dx = b.tx - b.x, dy = b.ty - b.y;
    const d = Math.hypot(dx, dy);
    const mv = b.speed * dt;
    b.vx = dx; b.vy = dy;
    b.travel = Math.min(1, 1 - d / (b.total || 1));
    if (d <= mv) return false;
    b.x += (dx / d) * mv;
    b.y += (dy / d) * mv;
    return true;
  });

  if (g.phase !== "prep" && g.phase !== "wave") return;

  // 다음 상태가 올 때까지 적은 같은 공식으로 계속 나아간다
  g.enemies.forEach((e) => {
    e.age += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.poison > 0) e.poison -= dt;
    if (e.burn > 0) e.burn -= dt;
    if (e.freeze > 0) { e.freeze -= dt; return; }
    if (e.slow > 0) e.slow -= dt;
    const spd = (e.spd || ENEMY[e.type].spd) * (e.slow > 0 ? e.slowAmt : 1);
    e.p = Math.min(1, e.p + (spd * dt) / LANES[e.lane].len);
    const pos = posAt(e.lane, e.p);
    e.x = pos.x; e.y = pos.y; e.ax = pos.ax; e.ay = pos.ay;
  });
}

/* 호스트가 보내는 상태 묶음 */
export function packSnapshot(g) {
  return {
    ph: g.phase, wv: g.wave, tt: g.total, df: g.diff, tm: Math.max(0, g.timer),
    hp: g.core.hp, hm: g.core.max, cv: g.core.lv, sp: g.speed, pa: g.paused ? 1 : 0, fo: g.focus > 0 ? 1 : 0,
    ql: g.queue.length, cb: g.combo, pv: g.preview || 0,
    sg: g.surge,
    pk: g.players.map((p) => PERK_IDS.map((id) => p.perks[id] || 0)),
    rw: g.phase === "reward" ? { of: g.offer, pi: g.picked } : 0,
    ca: Math.round(g.castle.aim * 100) / 100,
    ar: g.arena ? {
      ty: g.arena.type, hp: Math.round(g.arena.hp), mx: g.arena.max,
      st: g.arena.st, zo: g.arena.zone, li: Math.max(0, Math.round(g.arena.limit * 10) / 10),
      rg: g.arena.rage, cb: g.arena.combo, io: Math.round(g.arena.intro * 10) / 10,
      oo: Math.round(g.arena.outro * 10) / 10, jo: Math.round(g.arena.jolt * 100) / 100,
      sT: Math.round(g.arena.stT * 100) / 100,
      pp: g.players.map((p) => [Math.round(p.ax || 0), p.adir || 1, Math.round(p.ay || 0),
        Math.round((p.aswing || 0) * 100) / 100, Math.round((p.adown || 0) * 100) / 100,
        p.askill ? 1 : 0]),
    } : 0,
    lv2: g.leaveT > 0 ? (g.leave || []).map((v) => (v ? 1 : 0)) : 0,
    lt: Math.max(0, Math.round(g.leaveT * 10) / 10),
    pl: g.players.map((p) => [Math.floor(p.gold), Math.max(0, p.cd), p.lane, p.slot, p.built, p.kills]),
    tw: g.towers.map((t) => (t ? [t.owner, t.lv, towerIdx(t.type), t.warm > 0 ? 1 : 0] : 0)),
    en: g.enemies.map((e) => [
      e.id, ETYPES.indexOf(e.type), e.lane, Math.round(e.p * 10000) / 10000,
      Math.round((e.hp / e.max) * 100) / 100,
      (e.freeze > 0 ? 1 : 0) | (e.slow > 0 ? 2 : 0) | (e.poison > 0 ? 4 : 0) | (e.burn > 0 ? 8 : 0),
    ]),
  };
}

/* 참가자가 받은 상태를 자기 화면에 반영 */
export function applySnapshot(g, s) {
  g.phase = s.ph;
  g.wave = s.wv;
  if (s.tt) g.total = s.tt;
  if (typeof s.df === "number") g.diff = s.df;
  g.timer = s.tm;
  g.core.hp = s.hp;
  if (s.hm) g.core.max = s.hm;
  if (s.cv) g.core.lv = s.cv;
  g.speed = s.sp;
  g.paused = !!s.pa;
  g.focus = s.fo ? 1 : 0;
  g.queueLeft = s.ql;
  g.preview = s.pv || null;
  g.combo = s.cb || 0;
  if (g.combo) g.comboT = Math.max(g.comboT, 0.3);
  g.surge = s.sg || 0;
  if (s.pk) {
    s.pk.forEach((row, i) => {
      const perks = {};
      PERK_IDS.forEach((id, k) => { if (row[k]) perks[id] = row[k]; });
      g.players[i].perks = perks;
    });
  }
  if (s.rw) { g.offer = s.rw.of; g.picked = s.rw.pi; }
  else { g.offer = null; g.picked = null; }
  if (typeof s.ca === "number") g.castle.aim = s.ca;
  if (s.ar) {
    const a = g.arena || (g.arena = {});
    a.type = s.ar.ty; a.hp = s.ar.hp; a.max = s.ar.mx;
    a.st = s.ar.st; a.zone = s.ar.zo; a.limit = s.ar.li; a.rage = s.ar.rg;
    a.combo = s.ar.cb; a.intro = s.ar.io; a.outro = s.ar.oo; a.jolt = s.ar.jo;
    a.stT = s.ar.sT; a.t = (a.t || 0);
    s.ar.pp.forEach((row, i) => {
      const p = g.players[i];
      p.ax = row[0]; p.adir = row[1]; p.ay = row[2];
      p.aswing = row[3]; p.adown = row[4]; p.askill = row[5];
    });
  } else g.arena = null;
  g.leave = s.lv2 ? s.lv2.map((v) => !!v) : g.seats.map(() => false);
  g.leaveT = s.lt || 0;

  s.pl.forEach((row, i) => {
    const p = g.players[i];
    p.gold = row[0]; p.cd = row[1];
    p.lane = row[2]; p.slot = row[3];
    p.built = row[4]; p.kills = row[5];
  });

  s.tw.forEach((row, i) => {
    if (!row) { g.towers[i] = null; return; }
    const type = (TOWERS[row[2]] || TOWERS[0]).id;
    const cur = g.towers[i];
    if (cur && cur.owner === row[0] && cur.type === type) {
      cur.lv = row[1];
      cur.warm = row[3] ? Math.max(cur.warm || 0, 0.2) : 0;
      return;
    }
    g.towers[i] = { owner: row[0], type, lv: row[1], cd: 0, pulse: 0.4, aim: 0, warm: row[3] ? 0.5 : 0 };
  });

  const seen = new Set();
  s.en.forEach((row) => {
    const [id, ti, lane, p, hpr, flags] = row;
    seen.add(id);
    let e = g.enemies.find((x) => x.id === id);
    const type = ETYPES[ti];
    const base = ENEMY[type];
    if (!e) {
      const pos = posAt(lane, p);
      e = {
        id, type, lane, p, max: base.hp, hp: base.hp * hpr,
        spd: base.spd * diffOf(g).spd * (1 + Math.min(0.6, SURGE_SPD * (g.surge || 0))),
        x: pos.x, y: pos.y, ax: pos.ax, ay: pos.ay,
        slow: 0, slowAmt: 0.5, freeze: 0, flash: 0, poison: 0, dead: false, age: 0,
      };
      g.enemies.push(e);
    }
    // 받은 위치가 앞서 있으면 당겨오고, 뒤처져 있으면 살짝만 되돌린다
    e.p = e.p > p ? e.p + (p - e.p) * 0.35 : p;
    if (hpr < e.hp / e.max) e.flash = 0.12;
    e.hp = e.max * hpr;
    e.freeze = flags & 1 ? Math.max(e.freeze, 0.4) : 0;
    e.slow = flags & 2 ? Math.max(e.slow, 0.4) : 0;
    e.poison = flags & 4 ? Math.max(e.poison, 0.4) : 0;
    e.burn = flags & 8 ? Math.max(e.burn || 0, 0.4) : 0;
  });
  g.enemies = g.enemies.filter((e) => seen.has(e.id));
}

/* 호스트가 보낸 연출을 재생 */
export function applyOut(g, list) {
  list.forEach((o) => {
    if (o.k === "fx") {
      const item = { ...o };
      delete item.k;
      g.fx.push(item);
      if (item.kind === "boom" && item.r >= 26) g.shake = Math.max(g.shake, 0.18);
      if (item.kind === "boom" && item.r >= 70) g.shake = Math.max(g.shake, 0.5);
    } else if (o.k === "banner") {
      g.banner = { text: o.text, sub: o.sub, tone: o.tone, t: o.t, life: o.life };
    } else if (o.k === "shot") {
      g.bullets.push({
        x: o.x, y: o.y, tx: o.tx, ty: o.ty, target: null, dmg: 0,
        owner: o.owner, splash: o.splash, kind: o.kind, speed: o.speed,
        travel: 0, total: Math.max(1, Math.hypot(o.tx - o.x, o.ty - o.y)),
        vx: o.tx - o.x, vy: o.ty - o.y,
      });
      if (o.si === -1) {
        g.castle.pulse = 0.35;
        if (typeof o.aim === "number") g.castle.aim = o.aim;
      } else {
        const t = g.towers[o.si];
        if (t) { t.pulse = 0.4; t.aim = Math.atan2(o.ty - o.y, o.tx - o.x); }
      }
    }
  });
}
