/* ── 새 버전 알아채기 ─────────────────────────────────────────
   배포마다 빌드 번호(__BUILD__)가 바뀐다. 열려 있는 화면은 version.json 을 1분마다(그리고 다시 볼 때) 읽어
   더 새 빌드가 나왔으면 스스로 새로 고침한다. 방장 브라우저가 옛 코드로 판정하면 새 기능이 막히기 때문이다.
   방어전 판이 도는 중(body[data-screen="game"])에는 끊지 않고 단추만 띄운다. */
export const BUILD = typeof __BUILD__ !== "undefined" ? __BUILD__ : "dev";
const EVERY = 60;               // 확인 간격(초)
const WAIT = 3;                 // 알리고 나서 새로 고침까지(초)

let shown = false;
function banner(auto, inGame) {
  if (shown) return;
  shown = true;
  const el = document.createElement("div");
  el.className = "ver-note";
  el.setAttribute("role", "status");
  el.textContent = auto ? "새 버전이 나왔습니다. 잠시 뒤 새로 고칩니다."
    : inGame ? "새 버전이 나왔습니다. 판이 끝나면 새로 고쳐 주세요." : "새 버전이 나왔습니다. 새로 고쳐 주세요.";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-ghost";
  btn.textContent = "지금 새로 고침";
  btn.onclick = () => location.reload();
  el.appendChild(btn);
  document.body.appendChild(el);
  if (auto) setTimeout(() => location.reload(), WAIT * 1000);
}

// 더 새 빌드가 있다 — 방어전 판 중이 아니면 곧 새로 고친다.
// 새로 고쳤는데도 옛 화면이 왔으면(배포가 아직 퍼지는 중) 같은 빌드로는 다시 저절로 고치지 않고 단추만 띄운다
const TRIED = "flg:reloadFor";
export function newerBuild(target) {
  if (BUILD === "dev") return;
  let again = false;
  try {
    again = !!target && sessionStorage.getItem(TRIED) === String(target);
    if (target) sessionStorage.setItem(TRIED, String(target));
  } catch { /* 저장이 막혀 있으면 그냥 한 번 고친다 */ }
  const inGame = document.body.dataset.screen === "game";
  banner(!inGame && !again, inGame);
}
// 다른 사람(방장)의 빌드 번호와 견준다 — 더 새것이면 나도 새로 고친다. 더 옛것이면 true(방장이 옛 버전)
export function compareBuild(other) {
  if (BUILD === "dev") return false;
  if (!other) return true;                      // 빌드 번호가 없던 시절의 방장
  if (Number(other) > Number(BUILD)) { newerBuild(other); return false; }
  return Number(other) < Number(BUILD);
}

async function check() {
  if (BUILD === "dev" || shown) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const v = await res.json();
    if (v && v.build && Number(v.build) > Number(BUILD)) newerBuild(v.build);
  } catch { /* 연결이 끊겼으면 다음에 다시 본다 */ }
}
export function watchVersion() {
  setTimeout(check, 5000);
  setInterval(check, EVERY * 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
}
