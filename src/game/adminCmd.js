import { WORLD_SETS, worldArmorName } from "./worldEquipmentData.js";
import { trading } from "./tradeData.js";
/* ── RPG 관리자 명령어 — 채팅 칸에 "/" 로 시작해 쓴다(방장만 판정) ─────────────
   /도움                       명령어 목록
   /지급 <이름> <물품> [개수]   물약 · 재료 · 특별 무기 · 방어구(예: 전설 투구) · 워프권 · 하락 방지권
   /돈 <이름> <금액>            코인을 준다(빼려면 -금액)
   /소환 <이름>                 그 사람을 내 자리로 옮긴다
   <이름> 자리에 "나" 를 쓰면 나 자신. 이름에 띄어쓰기가 있어도 된다(지금 서버에 있는 사람 이름과 앞에서부터 견준다).
   관리자(h.admin) 만 쓸 수 있다. 화면 쪽은 RpgView.jsx sendChat 이 "/" 를 채팅 대신 입력 kind "cmd" 로 보낸다 */
import { MAPS, runOf, sys } from "./rpg.js";
import { POTIONS, POTION, SPECIALS, WEAPON, WARP, GUARD } from "./shopData.js";
import { specialTier, specialPrice, addMat } from "./shop.js";
import { MATERIALS } from "./itemData.js";
import { ARMOR_SLOTS, ARMOR_GRADES, ARMOR } from "./armorData.js";

export const ADMIN_CMD = {
  max: 80,               // 명령 한 줄 길이
  giveMax: 999,          // 한 번에 줄 수 있는 개수
  coinMax: 100000000,    // 한 번에 주거나 뺄 수 있는 코인
};
const HELP = [
  "/지급 <이름> <물품> [개수] — 물약 · 재료 · 특별 무기 · 방어구(예: 전설 투구) · 워프권 · 방지권",
  "/돈 <이름> <금액> — 코인 주기(빼려면 -금액)",
  "/소환 <이름> — 그 사람을 내 자리로",
  "이름 자리에 \"나\" 를 쓰면 나 자신입니다.",
];
const flat = (s) => String(s || "").toLowerCase().replace(/[\s()·]/g, "");

// 줄 수 있는 물품 — 이름(띄어쓰기 · 괄호 무시)으로 찾는다
const ITEMS = [
  ...POTIONS.map((p) => ({ name: p.name, give: (b, n) => { const have = b.p[p.id] || 0; const put = Math.min(n, POTION.stackMax - have); if (put > 0) b.p[p.id] = have + put; return put; } })),
  ...MATERIALS.map((m) => ({ name: m.name, give: (b, n) => addMat(b, m.id, n) })),
  ...SPECIALS.map((sp) => ({ name: sp.name, give: (b, n) => {
    let put = 0;
    while (put < n && b.w.length < WEAPON.bagMax) { b.w.push({ u: b.n++, t: sp.t, r: specialTier(sp), g: sp.g, p: specialPrice(sp), sp: sp.id }); put += 1; }
    return put;
  } })),
  ...WORLD_SETS.flatMap(set => ARMOR_SLOTS.map(sl => ({ name: worldArmorName(sl.id, set.id), give: (b, n) => {
    let put = 0;
    while (put < n && b.a.length < ARMOR.bagMax) { b.a.push({ u: b.n++, s: sl.id, g: 3, set: set.id }); put++; }
    return put;
  } }))),
  ...ARMOR_GRADES.flatMap((gr) => ARMOR_SLOTS.map((sl) => ({ name: `${gr.name} ${sl.name}`, give: (b, n) => {
    if (!b.a) b.a = [];
    let put = 0;
    while (put < n && b.a.length < ARMOR.bagMax) { b.a.push({ u: b.n++, s: sl.id, g: gr.id }); put += 1; }
    return put;
  } }))),
  { name: "워프권", give: (b, n) => { const put = Math.min(n, WARP.max - b.wp); b.wp += Math.max(0, put); return Math.max(0, put); } },
  { name: "하락 방지권", give: (b, n) => { const put = Math.min(n, GUARD.max - b.gd); b.gd += Math.max(0, put); return Math.max(0, put); } },
];
function findItem(text) {
  const k = flat(text);
  if (!k) return null;
  const exact = ITEMS.find((it) => flat(it.name) === k);
  if (exact) return exact;
  const some = ITEMS.filter((it) => flat(it.name).includes(k));
  return some.length === 1 ? some[0] : some.length ? { many: some.slice(0, 5).map((it) => it.name) } : null;
}

// 앞에서부터 사람 이름을 찾는다 — 띄어쓰기가 있는 이름도 맞힌다. [자리, 남은 낱말]
function takeName(g, pi, words) {
  if (words[0] === "나") return [pi, words.slice(1)];
  for (let n = words.length; n >= 1; n--) {
    const k = flat(words.slice(0, n).join(" "));
    const at = g.heroes.findIndex((o, i) => o && flat(g.names && g.names[i]) === k);
    if (at >= 0) return [at, words.slice(n)];
  }
  return [-1, words];
}
const who = (g, i) => (g.names && g.names[i]) || "모험가";
const bump = (h) => { h.bag.v += 1; };

/* 방장이 판정한다 — 입력 kind "cmd", dir 은 명령 한 줄 */
export function rpgAdminCmd(g, pi, text) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || typeof text !== "string") return false;
  if (!h.admin) return void sys(g, pi, "관리자만 쓸 수 있는 명령입니다.");
  const words = text.slice(0, ADMIN_CMD.max).trim().replace(/^\//, "").split(/\s+/).filter(Boolean);
  const cmd = words.shift() || "";
  const say = (msg) => sys(g, pi, msg);
  if (cmd === "도움" || cmd === "help") { HELP.forEach(say); return true; }

  if (cmd === "지급") {
    const [ti, rest] = takeName(g, pi, words);
    if (ti < 0) return void say("그 이름의 사람이 이 서버에 없습니다. 예) /지급 나 전설 투구");
    const last = rest[rest.length - 1];
    const n = /^\d+$/.test(last || "") ? Math.min(ADMIN_CMD.giveMax, Number(rest.pop())) : 1;
    const it = findItem(rest.join(" "));
    if (!it) return void say("그런 물품이 없습니다. 예) 회복 물약 (대) · 토끼 털 · 서리검 · 전설 투구 · 워프권 · 하락 방지권");
    if (it.many) return void say(`물품 이름을 더 정확히 써 주세요: ${it.many.join(" · ")}`);
    const t = g.heroes[ti];
    if (trading(t)) return void say("그 사람은 거래 중입니다. 거래가 끝난 뒤 다시 해 주세요.");
    if (!t.loaded || !t.bag) return void say("그 사람의 기록을 아직 불러오는 중입니다.");
    const put = it.give(t.bag, n);
    if (!put) return void say(`${who(g, ti)}님의 가방에 ${it.name}을(를) 더 넣을 수 없습니다(가득 참).`);
    bump(t);
    say(`${who(g, ti)}님에게 ${it.name} ${put}개를 주었습니다.`);
    if (ti !== pi) sys(g, ti, `관리자가 ${it.name} ${put}개를 주었습니다.`);
    return true;
  }

  if (cmd === "돈") {
    const last = words.pop() || "";
    const [ti, rest] = takeName(g, pi, words);
    if (ti < 0 || rest.length) return void say("그 이름의 사람이 이 서버에 없습니다. 예) /돈 나 10000");
    if (!/^-?\d+$/.test(last)) return void say("금액은 숫자로 써 주세요. 예) /돈 나 10000");
    const amt = Math.max(-ADMIN_CMD.coinMax, Math.min(ADMIN_CMD.coinMax, Number(last)));
    const t = g.heroes[ti];
    if (trading(t)) return void say("그 사람은 거래 중입니다. 거래가 끝난 뒤 다시 해 주세요.");
    if (!t.loaded) return void say("그 사람의 기록을 아직 불러오는 중입니다.");
    const before = t.coins;
    t.coins = Math.max(0, t.coins + amt);
    const d = t.coins - before;
    say(`${who(g, ti)}님의 코인 ${d >= 0 ? "+" : ""}${d.toLocaleString("ko-KR")} (지금 ${t.coins.toLocaleString("ko-KR")})`);
    if (ti !== pi && d) sys(g, ti, `관리자가 코인 ${d >= 0 ? "+" : ""}${d.toLocaleString("ko-KR")}을(를) 주었습니다.`);
    return true;
  }

  if (cmd === "소환") {
    const [ti, rest] = takeName(g, pi, words);
    if (ti < 0 || rest.length) return void say("그 이름의 사람이 이 서버에 없습니다. 예) /소환 홍길동");
    if (ti === pi) return void say("나 자신은 소환할 수 없습니다.");
    const t = g.heroes[ti];
    if (trading(t)) return void say("그 사람은 거래 중입니다. 거래가 끝난 뒤 다시 해 주세요.");
    const busy = (o) => (o.dvs ?? -1) >= 0 || !!runOf(g, o) || !!(MAPS[o.map] && (MAPS[o.map].dungeon || MAPS[o.map].pvp));
    if (busy(h)) return void say("결투장 · 던전에서는 소환할 수 없습니다.");
    if (busy(t)) return void say(`${who(g, ti)}님이 결투 · 던전 중이라 소환할 수 없습니다.`);
    t.map = h.map;
    t.x = h.x + (h.dir || 1) * 60; t.y = h.y;
    t.hold = []; t.dash = 0; t.gateCd = 1.5;
    say(`${who(g, ti)}님을 내 자리로 불렀습니다.`);
    sys(g, ti, "관리자가 불러 자리를 옮겼습니다.");
    return true;
  }

  say("모르는 명령입니다. /도움 으로 목록을 볼 수 있습니다.");
  return false;
}
