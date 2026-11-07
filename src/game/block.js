/* 차단 — 내가 차단한 캐릭터 이름 목록(가방 bag.bk, 저장된다).
   차단한 사람의 결투 신청 · 파티 초대는 판정(서버)에서 막고, 채팅은 내 화면에서 띄우지 않는다(11월 7일 사용자 요청 — 결투 신청을 계속 반복해 렉이 걸렸다) */
export const BLOCK = {
  max: 50,        // 한 캐릭터가 차단할 수 있는 사람 수
  nameMax: 8,     // 캐릭터 이름 최대 글자(room.js hello 와 같다)
};
const cleanOne = (n) => (typeof n === "string" ? n.trim().slice(0, BLOCK.nameMax) : "");
// 저장된 기록에서 읽을 때(shop.js cleanBag)
export const cleanBlocks = (d) => (Array.isArray(d) ? [...new Set(d.map(cleanOne).filter(Boolean))].slice(0, BLOCK.max) : []);
// h 가 name 을 차단했는가
export const blocks = (h, name) => !!(h && h.bag && Array.isArray(h.bag.bk) && name && h.bag.bk.includes(name));
/* 차단 목록 고치기 — req = { op: "add" | "del", name }. E = { name(g, pi), sys(g, pi, msg) } */
export function blockInput(E, g, pi, req) {
  const h = g.heroes[pi];
  if (!h || !h.loaded || !h.bag || !req) return false;
  const name = cleanOne(req.name);
  if (!name) return false;
  const list = cleanBlocks(h.bag.bk);
  if (req.op === "add") {
    if (name === E.name(g, pi)) return false;
    if (list.includes(name)) return false;
    if (list.length >= BLOCK.max) { E.sys(g, pi, `차단은 ${BLOCK.max}명까지입니다. 먼저 해제하세요`); return false; }
    h.bag.bk = [...list, name];
    // 이미 받아 둔 그 사람의 결투 신청 · 파티 초대는 지운다
    if (h.duelInv && E.name(g, h.duelInv.from) === name) h.duelInv = null;
    if (h.invite && E.name(g, h.invite.from) === name) h.invite = null;
    E.sys(g, pi, `${name}님을 차단했습니다. 결투 신청 · 파티 초대 · 채팅이 오지 않습니다`);
  } else if (req.op === "del") {
    if (!list.includes(name)) return false;
    h.bag.bk = list.filter((n) => n !== name);
    E.sys(g, pi, `${name}님의 차단을 풀었습니다`);
  } else return false;
  h.bag.v += 1;                                   // 가방이 바뀌었다 — 내 화면에도 보낸다(packBags)
  return true;
}
