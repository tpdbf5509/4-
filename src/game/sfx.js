/* ────────────────────────────────────────────────────────────
   소리. 파일 없이 웹오디오로 그때그때 만들어 낸다.
   브라우저 규칙상 처음 누르는 키·클릭에서 깨어난다.
   ──────────────────────────────────────────────────────────── */
let ac = null;
let master = null;
let muted = localStorage.getItem("flg:mute") === "1";
const last = new Map();

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ac.destination);
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
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + t + 0.02);
}

function noise({ t = 0.2, gain = 0.25, f = 900, q = 1, delay = 0, down = true }) {
  const a = ctx();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const n = Math.floor(a.sampleRate * t);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(f, t0);
  if (down) bp.frequency.exponentialRampToValueAtTime(Math.max(60, f * 0.25), t0 + t);
  bp.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + t);
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
  } else if (name === "clear") {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: "square", f0: f, t: 0.4, gain: 0.12, delay: i * 0.12 }));
  }
}

export default { unlock, play, shot, isMuted, setMuted };
