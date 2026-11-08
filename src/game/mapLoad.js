/* 맵 불러오기 화면 — 맵을 옮기면 그 맵 그림이 다 올 때까지 가림막을 띄운다(11월 7일).
   그림 파일은 여러 *Art.js 가 그릴 때 저마다 new Image() 로 부른다. 그래서 그림 하나하나를 적지 않고
   이 기기에서 새로 부르기 시작한 그림을 모두 지켜본다. 가림막 뒤에서도 판은 계속 그려서 그 맵 그림을 부르게 한다. */

export const MAP_LOAD = {
  minMs: 1200,      // 가장 짧게 띄우는 시간 — 이미 받은 맵도 진행 줄이 천천히 차는 것을 보여 준다(11월 7일 0.45초 → 1.2초, 너무 빨리 지나간다는 의견)
  maxMs: 8000,      // 그림이 아무리 늦어도 이만큼 지나면 들어간다(못 받은 그림은 코드 그림으로 대신한다)(6초 → 8초)
  calmMs: 160,      // 기다리는 그림이 없는 채로 이만큼 지나야 다 왔다고 본다(그리면서 새 그림을 부를 수 있다)
  fadeMs: 260,      // 가림막이 걷히는 시간
};

const pending = new Set();
let seen = 0, done = 0, hooked = false;

function track(im) {
  if (!im || im.complete || pending.has(im)) return;
  pending.add(im);
  seen += 1;
  const end = () => { if (pending.delete(im)) done += 1; };
  im.addEventListener("load", end, { once: true });
  im.addEventListener("error", end, { once: true });
}

/* 그림의 src 를 넣는 순간을 엿본다 — 한 번만 건다. 화면 창의 <img>(초상화 등)는 세지 않는다 */
export function watchImages() {
  if (hooked || typeof HTMLImageElement === "undefined") return;
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (!d || !d.set) return;
  hooked = true;
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    ...d,
    set(v) { d.set.call(this, v); if (!this.isConnected) track(this); },
  });
}

/* 지금 받는 중인 그림 수와 지금까지 센 수 — 진행 막대에 쓴다 */
export function imageLoad() {
  for (const im of pending) if (im.complete || im.isConnected) { pending.delete(im); done += 1; }
  return { wait: pending.size, seen, done };
}

/* 가림막 한 번의 상태 — start 로 시작하고 매 프레임 step 으로 다 됐는지 본다 */
export function loadStart(map, now) {
  const s = imageLoad();
  return { map, at: now, calm: 0, base: s.done, baseSeen: s.seen, p: 0, end: 0 };
}
export function loadStep(L, now) {
  if (!L || L.end) return L;
  const s = imageLoad();
  const all = s.seen - L.baseSeen, got = Math.min(all, s.done - L.base);
  const age = now - L.at;
  if (s.wait) L.calm = 0;
  else if (!L.calm) L.calm = now;
  const quiet = L.calm && now - L.calm >= MAP_LOAD.calmMs;
  // 진행 — 지난 시간 몫(minMs 동안 천천히 찬다)을 넘지 않고, 그림이 남았으면 받은 몫에서 멈춘다. 뒤로 가지 않는다
  const byImg = s.wait && all ? got / all : 1, byTime = Math.min(1, age / MAP_LOAD.minMs);
  L.p = Math.max(L.p, Math.min(0.97, byTime, Math.max(byImg, byTime * 0.5)));
  if ((quiet && age >= MAP_LOAD.minMs) || age >= MAP_LOAD.maxMs) { L.p = 1; L.end = now; }
  return L;
}
