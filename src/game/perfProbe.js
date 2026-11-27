/* 프레임 시간 측정 — 주소에 ?perf 가 있을 때만 켜진다. 일반 화면에는 아무 영향이 없다.
   그리기(drawRpg)와 한 프레임 전체 시간을 모아 2초마다 오른쪽 위 작은 글씨로 보인다(평균 · 가장 느린 5%).
   월드보스 · 여럿이 몰린 장면에서 어디가 느린지 재는 용도다. 콘솔에서 window.__perf 로도 본다. */
export const PERF_ON = typeof location !== "undefined" && new URLSearchParams(location.search).has("perf");
const KEEP = 240;                       // 최근 프레임 수
const buf = { draw: [], frame: [] };
let lastAt = 0, shown = 0;
const push = (a, v) => { a.push(v); if (a.length > KEEP) a.shift(); };
const stat = (a) => {
  if (!a.length) return { avg: 0, p95: 0 };
  const s = a.slice().sort((x, y) => x - y);
  return { avg: a.reduce((t, v) => t + v, 0) / a.length, p95: s[Math.floor(s.length * 0.95)] };
};
// 그리기 한 번을 재며 부른다 — fn 은 drawRpg 같은 그리기 함수
export function perfDraw(fn) {
  if (!PERF_ON) return fn();
  const t0 = performance.now();
  try { return fn(); } finally { push(buf.draw, performance.now() - t0); }
}
// 프레임 맨 앞에서 부른다 — 지난 프레임부터 지금까지의 간격을 적는다
export function perfFrame(now, ctx) {
  if (!PERF_ON) return;
  if (lastAt) push(buf.frame, now - lastAt);
  lastAt = now;
  if (now - shown < 2000) return;
  shown = now;
  const d = stat(buf.draw), f = stat(buf.frame);
  window.__perf = { drawAvg: d.avg, drawP95: d.p95, frameAvg: f.avg, frameP95: f.p95 };
  const el = document.getElementById("perf-probe") || Object.assign(document.createElement("div"), { id: "perf-probe" });
  if (!el.isConnected) {
    el.style.cssText = "position:fixed;top:4px;right:4px;z-index:99999;font:11px monospace;color:#e8dcc0;background:rgba(20,15,10,.7);padding:3px 6px;pointer-events:none;white-space:pre";
    document.body.appendChild(el);
  }
  el.textContent = `프레임 ${f.avg.toFixed(1)} / ${f.p95.toFixed(1)}ms (평균 / 느린 5%)\n그리기 ${d.avg.toFixed(1)} / ${d.p95.toFixed(1)}ms`;
}
