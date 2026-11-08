/* ────────────────────────────────────────────────────────────
   소리. 파일 없이 웹오디오로 그때그때 만들어 낸다.
   브라우저 규칙상 처음 누르는 키·클릭에서 깨어난다.
   ──────────────────────────────────────────────────────────── */
let ac = null;
let master = null;
let muted = localStorage.getItem("flg:mute") === "1";
const last = new Map();
// 월드보스 등장 연출 소리 — 연출이 끊기면(wbStop) 아직 울리는 소리도 멈춘다
let track = null;
let duck = null;   // 다른 소리 통로 — 등장 연출 동안 작게 줄인다(연출 소리는 master 로 바로 간다)
const DUCK = 0.3;  // 연출 동안 다른 소리 크기(몫)
const introNodes = new Set();
function keep(node) {
  if (!track) return;
  introNodes.add(node);
  node.onended = () => introNodes.delete(node);
}

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ac.destination);
    duck = ac.createGain();
    duck.gain.value = 1;
    duck.connect(master);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

export function unlock() { ctx(); }
export function isMuted() { return muted; }
export function setMuted(v) {
  muted = v;
  localStorage.setItem("flg:mute", v ? "1" : "0");
  if (master) master.gain.setTargetAtTime(v ? 0 : 0.5, ac.currentTime, 0.02);
}

// 같은 소리가 한꺼번에 겹쳐 터지지 않게 살짝 사이를 둔다
function gate(name, ms) {
  const now = performance.now();
  if (now - (last.get(name) || 0) < ms) return false;
  last.set(name, now);
  return true;
}

function tone({ type = "sine", f0, f1, t = 0.12, gain = 0.2, delay = 0 }) {
  const a = ctx();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + t);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(g); g.connect(track ? master : duck);
  o.start(t0); o.stop(t0 + t + 0.02);
  keep(o);
}

/* f1 — 끝 주파수(없으면 down 에 따라 내려가거나 그대로). swell — 점점 커졌다가 끝에서 사라진다(다가오는 바람) */
function noise({ t = 0.2, gain = 0.25, f = 900, q = 1, delay = 0, down = true, f1 = 0, swell = false }) {
  const a = ctx();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const n = Math.floor(a.sampleRate * t);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (swell ? 1 : 1 - i / n);
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(f, t0);
  if (f1) bp.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t0 + t);
  else if (down) bp.frequency.exponentialRampToValueAtTime(Math.max(60, f * 0.25), t0 + t);
  bp.Q.value = q;
  const g = a.createGain();
  if (swell) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + t * 0.85);
  } else g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  src.connect(bp); bp.connect(g); g.connect(track ? master : duck);
  src.start(t0); src.stop(t0 + t);
  keep(src);
}

export function shot(kind) {
  if (!gate(`s:${kind}`, 55)) return;
  if (kind === "arrow") noise({ t: 0.1, gain: 0.1, f: 2600, q: 2 });
  else if (kind === "ball") { noise({ t: 0.22, gain: 0.2, f: 420, q: 0.8 }); tone({ type: "square", f0: 130, f1: 48, t: 0.16, gain: 0.12 }); }
  else if (kind === "shell") { noise({ t: 0.3, gain: 0.26, f: 340, q: 0.7 }); tone({ type: "sawtooth", f0: 110, f1: 40, t: 0.22, gain: 0.16 }); }
  else if (kind === "bolt") { tone({ type: "sawtooth", f0: 1500, f1: 420, t: 0.14, gain: 0.1 }); noise({ t: 0.1, gain: 0.08, f: 3400, q: 3 }); }
  else if (kind === "orb") tone({ type: "triangle", f0: 360, f1: 150, t: 0.16, gain: 0.1 });
  else tone({ type: "triangle", f0: 1250, f1: 720, t: 0.13, gain: 0.09 });
}

/* 월드보스 등장 연출 소리(worldBossIntroData.js WB_INTRO_SCENE.cues 가 때맞춰 부른다).
   한 소리 안의 지연은 0.4초 안으로 짧게 둔다 — 강조음은 연출이 그 순간에 따로 부른다 */
const INTRO_SND = {
  // 뱀 — 가장 강한 순간 낮게 울리는 진동음
  wbRumble: () => {
    tone({ type: "sine", f0: 46, f1: 38, t: 1.2, gain: 0.3 });
    tone({ type: "triangle", f0: 92, f1: 80, t: 0.9, gain: 0.06 });
    noise({ t: 1.0, gain: 0.14, f: 140, q: 0.6, down: false });
  },
  // 뇌조 — 강한 천둥(갈라지는 소리 → 길게 구르는 소리)
  wbThunder: () => {
    noise({ t: 0.12, gain: 0.4, f: 3800, q: 0.7 });
    noise({ t: 1.6, gain: 0.38, f: 520, f1: 70, q: 0.4 });
    tone({ type: "sine", f0: 58, f1: 30, t: 1.4, gain: 0.32 });
    noise({ t: 0.9, gain: 0.18, f: 260, q: 0.5, delay: 0.25 });
  },
  // 드래곤 — 낮은 숨소리, 그리고 짧은 포효
  wbDragonBreath: () => {
    noise({ t: 0.95, gain: 0.2, f: 240, f1: 420, q: 0.6, swell: true });
    tone({ type: "sine", f0: 52, f1: 46, t: 0.9, gain: 0.12 });
  },
  wbDragonRoar: () => {
    noise({ t: 0.7, gain: 0.3, f: 760, f1: 210, q: 0.7 });
    tone({ type: "sawtooth", f0: 190, f1: 72, t: 0.62, gain: 0.17 });
    tone({ type: "square", f0: 124, f1: 56, t: 0.5, gain: 0.09, delay: 0.03 });
  },
  // 뱀 — 바닥을 긁으며 옆으로 지나가는 소리, 그리고 짧은 쉿
  wbSerpentScrape: () => {
    [0, 0.09, 0.18, 0.27].forEach((d, i) => noise({ t: 0.14, gain: 0.08 + i * 0.012, f: 1100 + i * 220, q: 2.2, delay: d }));
    noise({ t: 0.45, gain: 0.07, f: 600, f1: 1500, q: 0.8, swell: true });
  },
  wbSerpentHiss: () => {
    noise({ t: 0.55, gain: 0.2, f: 5600, f1: 4200, q: 2.5 });
    noise({ t: 0.35, gain: 0.08, f: 2600, q: 1.5 });
  },
  // 기계 — 금속 잠금장치가 풀리는 소리(두 번 부른다), 충전되는 웅웅임, 묵직한 기동음
  wbMachineLock: () => {
    noise({ t: 0.06, gain: 0.16, f: 3200, q: 5, down: false });
    tone({ type: "square", f0: 880, f1: 560, t: 0.05, gain: 0.08 });
    tone({ type: "sine", f0: 190, f1: 140, t: 0.09, gain: 0.12 });
  },
  wbMachineCharge: () => {
    tone({ type: "sawtooth", f0: 110, f1: 520, t: 0.55, gain: 0.06 });
    tone({ type: "sine", f0: 58, f1: 64, t: 0.55, gain: 0.1 });
  },
  wbMachineBoot: () => {
    tone({ type: "sine", f0: 72, f1: 36, t: 0.7, gain: 0.3 });
    tone({ type: "square", f0: 92, f1: 60, t: 0.45, gain: 0.11 });
    noise({ t: 0.4, gain: 0.2, f: 420, q: 0.6 });
    noise({ t: 0.12, gain: 0.1, f: 4200, q: 4 });
  },
  // 뇌조 — 점점 가까워지는 바람, 그리고 날갯짓 두 번
  wbWind: () => {
    noise({ t: 1.0, gain: 0.2, f: 420, f1: 1500, q: 0.7, swell: true });
  },
  wbFlap: () => {
    [0, 0.14].forEach((d) => noise({ t: 0.18, gain: 0.28, f: 680, q: 0.8, delay: d }));
    tone({ type: "sine", f0: 120, f1: 58, t: 0.22, gain: 0.14 });
  },
  // 공허 — 공간이 가늘게 찢어지는 소리, 그리고 눈이 켜지는 낮은 충격음
  wbVoidTear: () => {
    tone({ type: "sine", f0: 1350, f1: 1900, t: 0.6, gain: 0.035 });
    noise({ t: 0.7, gain: 0.06, f: 2400, f1: 900, q: 8, swell: true });
    tone({ type: "sine", f0: 62, f1: 44, t: 0.9, gain: 0.1 });
  },
  wbVoidOpen: () => {
    tone({ type: "sine", f0: 56, f1: 27, t: 0.9, gain: 0.32 });
    noise({ t: 0.5, gain: 0.22, f: 180, q: 0.5 });
    tone({ type: "triangle", f0: 220, f1: 110, t: 0.45, gain: 0.05 });
  },
};

export function play(name) {
  if (name === "boom") {
    if (!gate("boom", 70)) return;
    noise({ t: 0.34, gain: 0.3, f: 620, q: 0.6 });
    tone({ type: "sine", f0: 160, f1: 40, t: 0.3, gain: 0.22 });
  } else if (name === "build") {
    tone({ type: "square", f0: 300, f1: 620, t: 0.1, gain: 0.14 });
    tone({ type: "square", f0: 620, f1: 880, t: 0.12, gain: 0.12, delay: 0.08 });
  } else if (name === "coin") {
    if (!gate("coin", 60)) return;
    tone({ type: "triangle", f0: 1050, f1: 1050, t: 0.06, gain: 0.08 });
    tone({ type: "triangle", f0: 1560, f1: 1560, t: 0.09, gain: 0.07, delay: 0.05 });
  } else if (name === "zap") {
    if (!gate("zap", 60)) return;
    noise({ t: 0.16, gain: 0.14, f: 2600, q: 4 });
    tone({ type: "sawtooth", f0: 900, f1: 180, t: 0.14, gain: 0.08 });
  } else if (name === "ice") {
    if (!gate("ice", 70)) return;
    tone({ type: "sine", f0: 1800, f1: 2600, t: 0.16, gain: 0.07 });
  } else if (name === "core") {
    noise({ t: 0.5, gain: 0.34, f: 260, q: 0.5 });
    tone({ type: "sine", f0: 120, f1: 32, t: 0.45, gain: 0.26 });
  } else if (name === "wave") {
    [0, 0.12, 0.24].forEach((d, i) => tone({ type: "square", f0: [392, 523, 659][i], t: 0.18, gain: 0.1, delay: d }));
  } else if (name === "boss") {
    tone({ type: "sawtooth", f0: 90, f1: 55, t: 0.9, gain: 0.22 });
    noise({ t: 0.8, gain: 0.2, f: 300, q: 0.6 });
    tone({ type: "square", f0: 147, f1: 110, t: 0.6, gain: 0.12, delay: 0.25 });
  } else if (name === "bless") {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: "triangle", f0: f, t: 0.35, gain: 0.11, delay: i * 0.09 }));
  } else if (name === "over") {
    [392, 330, 262, 196].forEach((f, i) => tone({ type: "sawtooth", f0: f, t: 0.5, gain: 0.14, delay: i * 0.18 }));
  } else if (name === "lvup") {               // RPG 레벨업 — 올라가는 화음과 반짝임
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone({ type: "triangle", f0: f, t: 0.42, gain: 0.11, delay: i * 0.07 }));
    tone({ type: "sine", f0: 2093, f1: 3136, t: 0.5, gain: 0.05, delay: 0.42 });
    noise({ t: 0.6, gain: 0.05, f: 5200, q: 2, delay: 0.3, down: false });
  } else if (name === "wbHorn") {            // 월드보스 출현 예고 — 멀리서 울리는 낮은 뿔피리 두 번(worldBossIntro.js)
    if (!gate("wbHorn", 1500)) return;
    tone({ type: "sawtooth", f0: 98, f1: 92, t: 0.9, gain: 0.12 });
    tone({ type: "triangle", f0: 196, f1: 185, t: 0.9, gain: 0.08 });
    tone({ type: "sawtooth", f0: 131, f1: 123, t: 1.1, gain: 0.12, delay: 0.75 });
    tone({ type: "triangle", f0: 262, f1: 247, t: 1.1, gain: 0.07, delay: 0.75 });
  } else if (name === "wbStop") {            // 등장 연출이 끊김 — 울리던 연출 소리를 멈추고 다른 소리를 되돌린다
    for (const n of introNodes) { try { n.stop(); } catch { /* 이미 멈춤 */ } }
    introNodes.clear();
    if (duck) duck.gain.setTargetAtTime(1, ac.currentTime, 0.08);
  } else if (name === "wbDuck") {            // 등장 연출 시작 — 0.5초에 걸쳐 다른 소리를 작게
    if (ctx() && duck) duck.gain.setTargetAtTime(DUCK, ac.currentTime, 0.15);
  } else if (name === "wbUnduck") {          // 등장 연출 끝 — 다른 소리를 천천히 되돌린다
    if (duck) duck.gain.setTargetAtTime(1, ac.currentTime, 0.25);
  } else if (name.startsWith("wb") && INTRO_SND[name]) {   // 월드보스 등장 연출 — 보스마다 다른 첫 소리
    if (!gate(name, 120)) return;
    track = true;
    try { INTRO_SND[name](); } finally { track = null; }
  } else if (name === "clear") {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: "square", f0: f, t: 0.4, gain: 0.12, delay: i * 0.12 }));
  }
}

export default { unlock, play, shot, isMuted, setMuted };
