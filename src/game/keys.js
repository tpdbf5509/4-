/* ── RPG 키 설정 — 행동마다 키 두 칸. 이 기기에 남는다 ─────────────────
   기본 키는 이 표 한 곳에서 고친다. Esc 는 창을 닫는 데 쓰여 바꿀 수 없다. */
export const KEY_ACTIONS = [
  { id: "up", name: "위로", group: "이동", keys: ["KeyW", "ArrowUp"] },
  { id: "down", name: "아래로", group: "이동", keys: ["KeyS", "ArrowDown"] },
  { id: "left", name: "왼쪽", group: "이동", keys: ["KeyA", "ArrowLeft"] },
  { id: "right", name: "오른쪽", group: "이동", keys: ["KeyD", "ArrowRight"] },
  { id: "fire", name: "평타", group: "전투", keys: ["Space", ""] },
  { id: "skill", name: "큰 기술", group: "전투", keys: ["ShiftLeft", "ShiftRight"] },
  { id: "dash", name: "대쉬", group: "전투", keys: ["KeyQ", ""] },
  // 스킬 칸 — 일반 칸 둘(use1 · use2) · 직업 칸 하나(use5). 칸에 무엇을 넣을지는 가방 "스킬" 탭에서 고른다(shop.js SKILL_SLOTS)
  { id: "use1", name: "일반 스킬 칸 1", group: "전투", keys: ["Digit1", "Numpad1"] },
  { id: "use2", name: "일반 스킬 칸 2", group: "전투", keys: ["Digit2", "Numpad2"] },
  { id: "use5", name: "직업 스킬 칸", group: "전투", keys: ["KeyR", ""] },
  { id: "wskill", name: "무기 스킬", group: "전투", keys: ["KeyX", ""] },
  { id: "pot1", name: "물약 칸 1", group: "전투", keys: ["Digit5", "Numpad5"] },
  { id: "pot2", name: "물약 칸 2", group: "전투", keys: ["Digit6", "Numpad6"] },
  { id: "pot3", name: "물약 칸 3", group: "전투", keys: ["Digit7", "Numpad7"] },
  { id: "talk", name: "대화 · 상점", group: "창", keys: ["KeyE", ""] },
  { id: "chat", name: "채팅", group: "창", keys: ["Enter", ""] },
  { id: "stat", name: "스탯", group: "창", keys: ["KeyC", ""] },
  { id: "bag", name: "가방", group: "창", keys: ["KeyI", ""] },
  { id: "title", name: "칭호", group: "창", keys: ["KeyT", ""] },
  { id: "party", name: "파티", group: "창", keys: ["KeyP", ""] },
];
export const KEY_SLOTS = 2;
const STORE = "flg:rpgKeys";
const LOCKED = ["Escape"];
const KEYS_V = 2;
// 예전 기본 키 — 저장된 칸이 이것 그대로면(손대지 않았으면) 새 기본 키로 바꿔 준다. 큰 기술은 Shift 만, 대쉬는 Q 로 옮겼다
const OLD_DEFAULTS = { skill: ["ShiftLeft", "KeyQ"], dash: ["KeyF", ""] };

export const defaultKeys = () => Object.fromEntries(KEY_ACTIONS.map((a) => [a.id, a.keys.slice(0, KEY_SLOTS)]));

// 저장된 키 — 없거나 망가졌으면 기본값. 새로 생긴 행동은 기본 키를 쓴다
export function loadKeys() {
  const base = defaultKeys();
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "null");
    if (!v || typeof v !== "object") return base;
    const old = v.v !== KEYS_V;
    const moved = [];                               // 새 기본 키로 옮긴 행동
    KEY_ACTIONS.forEach((a) => {
      const k = v[a.id];
      if (!Array.isArray(k)) return;
      if (old && OLD_DEFAULTS[a.id] && OLD_DEFAULTS[a.id].every((c, i) => (k[i] || "") === c)) { moved.push(a.id); return; }
      base[a.id] = [0, 1].map((i) => (typeof k[i] === "string" && !LOCKED.includes(k[i]) ? k[i] : ""));
    });
    // 옮긴 새 기본 키가 다른 칸과 겹치면 그 칸에서 뺀다
    moved.forEach((id) => base[id].forEach((c) => {
      if (!c) return;
      KEY_ACTIONS.forEach((a) => { if (a.id !== id) base[a.id] = base[a.id].map((x) => (x === c ? "" : x)); });
    }));
  } catch { /* 저장이 막혀 있으면 기본값 */ }
  return base;
}
export function saveKeys(binds) {
  try { localStorage.setItem(STORE, JSON.stringify({ ...binds, v: KEYS_V })); } catch { /* 저장이 막혀 있으면 이번만 */ }
}

// 한 칸에 키를 넣는다 — 같은 키가 다른 칸에 있으면 그 칸은 비운다. Esc 는 받지 않는다
export function bindKey(binds, id, slot, code) {
  if (LOCKED.includes(code)) return binds;
  const next = {};
  Object.entries(binds).forEach(([a, ks]) => { next[a] = ks.map((k) => (k === code ? "" : k)); });
  next[id] = next[id].slice();
  next[id][slot] = code;
  return next;
}
export function clearKey(binds, id, slot) {
  const next = { ...binds, [id]: binds[id].slice() };
  next[id][slot] = "";
  return next;
}

// 키 → 행동
export function keyMap(binds) {
  const m = {};
  Object.entries(binds).forEach(([a, ks]) => ks.forEach((k) => { if (k && !m[k]) m[k] = a; }));
  return m;
}

// 화면에 보이는 키 이름
const NAMED = {
  Space: "Space", Enter: "Enter", Tab: "Tab", Backspace: "Backspace",
  ShiftLeft: "Shift", ShiftRight: "오른 Shift", ControlLeft: "Ctrl", ControlRight: "오른 Ctrl", AltLeft: "Alt", AltRight: "오른 Alt",
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", NumpadEnter: "숫자판 Enter",
  Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", Backquote: "`", Backslash: "\\",
};
export function keyLabel(code) {
  if (!code) return "";
  if (NAMED[code]) return NAMED[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `숫자판 ${code.slice(6)}`;
  return code;
}
// 행동의 첫 키 이름 — 안내 문구에 쓴다
export const keyOf = (binds, id) => keyLabel((binds[id] || []).find(Boolean) || "");
