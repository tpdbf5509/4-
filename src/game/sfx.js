/* ────────────────────────────────────────────────────────────
   소리. 파일 없이 웹오디오로 그때그때 만들어 낸다.
   브라우저 규칙상 처음 누르는 키·클릭에서 깨어난다.
   ──────────────────────────────────────────────────────────── */
let ac = null;
let master = null;
let level = 1;
function masterLevel() { return muted ? 0 : 0.5 * level; }
export function setLevel(value) {
  level = value;
  if (master) master.gain.setTargetAtTime(masterLevel(), ac.currentTime, 0.02);
}
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
    master.gain.value = masterLevel();
    master.connect(ac.destination);
    duck = ac.createGain();
    duck.gain.value = 1;
    duck.connect(master);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

// 배경음악만 따로 줄이는 통로 — 이야기 장면 동안 음악만 낮추고 효과음은 그대로 둔다(storyLines.js STORY_FX)
let bgm = null, bgmLevel = 1;
// 배경음악 크기를 k(몫)로 — sec 초쯤에 걸쳐 바뀐다
export function musicTo(k, sec = 0.3) {
  bgmLevel = k;
  if (bgm && ac) bgm.gain.setTargetAtTime(k, ac.currentTime, Math.max(0.02, sec / 3));
}
/* 맵마다 다른 배경음악 — 에르덴 마을은 마을 곡, 도서관은 도서관 곡, 나머지는 광장 곡.
   맵을 옮길 때 곡이 달라지면 가림막 시작에 페이드 아웃, 가림막이 걷힐 때 페이드 인한다(RpgView). */
const TRACKS = { plaza: "/assets/audio/bakery-morning.mp3", village: "/assets/audio/village-morn.mp3", library: "/assets/audio/morning-library.mp3" };
const VILLAGE_MAPS = new Set(["dawnwood", "dew-forest", "lantern-forest", "scree-forest", "luen", "frost-peak", "blade-ridge"]);   // 별이슬숲은 마을 곡을 잇는다
const LIBRARY_MAPS = new Set(["erden-library", "erden-library-2", "luen-library", "luen-library-2"]);   // 1 · 2층은 같은 곡이라 오가도 끊기지 않는다
export const MUSIC_FADE = { out: 0.8, in: 1.5 };   // 페이드 아웃 · 인 시간(초)
export function trackOfMap(map) { return LIBRARY_MAPS.has(map) ? "library" : VILLAGE_MAPS.has(map) ? "village" : "plaza"; }
let rpgMusic = null;   // { el, fade, play, track } — 방송 중인 배경음악
function fadeTo(k, sec) {
  const m = rpgMusic;
  if (!m?.fade || !ac) return;
  const g = m.fade.gain, t = ac.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(k, t + Math.max(0.02, sec));
}
// 지금 곡을 서서히 끈다 — 곡이 같은 맵으로 옮길 때는 부르지 않는다
export function musicFadeOut(sec = MUSIC_FADE.out) {
  if (rpgMusic) { rpgMusic.want = 0; fadeTo(0, sec); }
}
// 곡을 맞춰 서서히 켠다 — 곡이 바뀌면 처음부터 다시 튼다. 음소거 · 음량은 master 가 그대로 지킨다
export function musicFadeIn(track, sec = MUSIC_FADE.in) {
  const m = rpgMusic;
  if (!m) return;
  if (m.track !== track) {
    m.track = track;
    m.el.src = TRACKS[track];
    m.el.loop = true;
  }
  m.want = 1;
  m.play();
  fadeTo(1, sec);
}
export function startRpgMusic() {
  const music = new Audio(TRACKS.plaza);
  music.loop = true;
  let source;
  const m = rpgMusic = { el: music, fade: null, track: "plaza", want: 1, play };
  function play() {
    const audio = ctx();
    if (!audio || muted || level === 0) return;
    if (!source) {
      source = audio.createMediaElementSource(music);
      m.fade = audio.createGain();
      m.fade.gain.value = m.want;
      bgm = audio.createGain();
      bgm.gain.value = bgmLevel;
      source.connect(m.fade); m.fade.connect(bgm); bgm.connect(duck);
    }
    if (music.paused) music.play().catch(() => {});
  }
  document.addEventListener("click", play);
  document.addEventListener("keydown", play);
  play();
  return () => {
    document.removeEventListener("click", play);
    document.removeEventListener("keydown", play);
    music.pause();
    source?.disconnect(); m.fade?.disconnect(); bgm?.disconnect(); bgm = null;
    if (rpgMusic === m) rpgMusic = null;
    music.removeAttribute("src");
    music.load();
  };
}

export function unlock() { ctx(); }
export function isMuted() { return muted; }
export function setMuted(v) {
  muted = v;
  localStorage.setItem("flg:mute", v ? "1" : "0");
  if (master) master.gain.setTargetAtTime(masterLevel(), ac.currentTime, 0.02);
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
  if (name === "page") {                       // 책장 넘기기 · 책 꺼내기(에르덴 도서관) — 짧은 종이 스침
    if (!gate("page", 90)) return;
    noise({ t: 0.16, gain: 0.07, f: 3200, q: 0.8, swell: true });
  } else if (name === "boom") {
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
  } else if (name === "cutBell") {          // 이야기 컷신 — 마을 귀환 종(맑은 첫 울림 + 길게 남는 배음)
    [[392, 0.16], [784, 0.07], [1176, 0.05], [1568, 0.025]].forEach(([f, g]) => tone({ type: "sine", f0: f, f1: f * 0.998, t: 1.8, gain: g }));
    noise({ t: 0.05, gain: 0.06, f: 3000, q: 3 });
  } else if (name === "cutRumble") {        // 이야기 컷신 — 무거운 문이 열리며 땅이 울림
    tone({ type: "sine", f0: 60, f1: 42, t: 1.1, gain: 0.22 });
    noise({ t: 0.9, gain: 0.12, f: 180, q: 0.6 });
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
  } else if (name === "bloodCharge") {       // 크림슨 레퀴엠 1단계 — 낮은 심장 박동 두 번과 에너지가 응축되는 소리
    if (!gate("bloodCharge", 200)) return;
    [0, 0.17].forEach((d) => tone({ type: "sine", f0: 62, f1: 40, t: 0.14, gain: 0.3, delay: d }));
    tone({ type: "triangle", f0: 150, f1: 460, t: 0.4, gain: 0.05 });
    noise({ t: 0.4, gain: 0.07, f: 300, f1: 1100, q: 1.2, swell: true });
  } else if (name === "bloodShot") {         // 2단계 — 일반 총성보다 낮고 묵직한 발사음에 금속성 울림
    if (!gate("bloodShot", 120)) return;
    noise({ t: 0.24, gain: 0.36, f: 520, q: 0.6 });
    tone({ type: "square", f0: 170, f1: 46, t: 0.28, gain: 0.2 });
    tone({ type: "triangle", f0: 1450, f1: 880, t: 0.36, gain: 0.05, delay: 0.02 });
    tone({ type: "sine", f0: 740, f1: 700, t: 0.4, gain: 0.04, delay: 0.03 });
  } else if (name === "bloodSplit") {        // 3단계 — 짧고 날카로운 에너지 분열음
    if (!gate("bloodSplit", 150)) return;
    noise({ t: 0.1, gain: 0.12, f: 3600, q: 3 });
    tone({ type: "sawtooth", f0: 1700, f1: 600, t: 0.1, gain: 0.07 });
    tone({ type: "sawtooth", f0: 2100, f1: 900, t: 0.09, gain: 0.05, delay: 0.05 });
  } else if (name === "bloodHit") {          // 유도 혈탄 적중 — 가벼운 파열음(여섯 발이 함께 맞아도 겹치지 않게 간격을 둔다)
    if (!gate("bloodHit", 90)) return;
    noise({ t: 0.07, gain: 0.12, f: 1800, q: 2 });
    tone({ type: "triangle", f0: 520, f1: 260, t: 0.08, gain: 0.07 });
  } else if (name === "rqStep") {
    if (!gate("rqStep", 500)) return;
    tone({f0:45,f1:30,t:.14,type:"triangle",gain:.16});
  } else if (name === "bloodBoom") {         // 5단계 혈흔 폭발 — 낮고 강한 폭발음
    if (!gate("bloodBoom", 100)) return;
    noise({ t: 0.42, gain: 0.34, f: 300, q: 0.5 });
    tone({ type: "sine", f0: 120, f1: 32, t: 0.42, gain: 0.3 });
    tone({ type: "sawtooth", f0: 90, f1: 40, t: 0.26, gain: 0.12 });
    noise({ t: 0.08, gain: 0.1, f: 2600, q: 2, down: false });
  } else if (name === "gmChip") {            // Gambler 002 — 칩을 튕기는 짧고 맑은 소리
    if (!gate("gmChip", 70)) return;
    tone({ type: "triangle", f0: 1900, f1: 2500, t: 0.06, gain: 0.07 });
    noise({ t: 0.04, gain: 0.05, f: 5200, q: 4 });
  } else if (name === "gmHit") {             // 칩 적중 — 칩이 부딪히는 딸깍
    if (!gate("gmHit", 70)) return;
    tone({ type: "square", f0: 1250, f1: 820, t: 0.05, gain: 0.05 });
    noise({ t: 0.06, gain: 0.08, f: 3000, q: 3 });
  } else if (name === "gmFull") {            // 풀 베팅 — 칩 일곱이 차례로 쌓이는 오름 음
    if (!gate("gmFull", 300)) return;
    [1047, 1319, 1568, 2093].forEach((f, i) => tone({ type: "triangle", f0: f, t: 0.12, gain: 0.07, delay: i * 0.06 }));
  } else if (name === "gmCoin") {            // 금화가 쏟아지는 소리 — 높은 금속음 여러 번
    if (!gate("gmCoin", 120)) return;
    [0, 0.07, 0.13, 0.2, 0.26].forEach((d, i) => tone({ type: "triangle", f0: 2300 + (i % 3) * 320, f1: 2900 + (i % 2) * 300, t: 0.07, gain: 0.05, delay: d }));
    noise({ t: 0.3, gain: 0.05, f: 6000, q: 3 });
  } else if (name === "gmShield") {          // 칩 장막 · 테이블 · 하우스 엣지 — 낮게 깔리는 부드러운 울림
    if (!gate("gmShield", 200)) return;
    tone({ type: "sine", f0: 392, f1: 523, t: 0.3, gain: 0.1 });
    tone({ type: "triangle", f0: 784, f1: 1047, t: 0.24, gain: 0.05, delay: 0.05 });
  } else if (name === "gmBlock") {           // 장막이 피해를 막는 순간
    if (!gate("gmBlock", 120)) return;
    tone({ type: "square", f0: 620, f1: 420, t: 0.07, gain: 0.06 });
    noise({ t: 0.08, gain: 0.08, f: 2200, q: 2 });
  } else if (name === "gmDice") {            // 주사위 굴림 — 나무 주사위가 톡톡 튄다
    if (!gate("gmDice", 150)) return;
    [0, 0.06, 0.11, 0.17].forEach((d, i) => noise({ t: 0.04, gain: 0.1 - i * 0.015, f: 1500 + i * 260, q: 5, delay: d }));
  } else if (name === "gmBoom") {            // 큰 결과 — 낮은 터짐 위에 금화가 흩어진다
    if (!gate("gmBoom", 120)) return;
    noise({ t: 0.36, gain: 0.26, f: 340, q: 0.5 });
    tone({ type: "sine", f0: 140, f1: 44, t: 0.34, gain: 0.22 });
    [0.04, 0.1, 0.17].forEach((d, i) => tone({ type: "triangle", f0: 2100 + i * 380, f1: 2700 + i * 300, t: 0.08, gain: 0.05, delay: d }));
  } else if (name === "eqClank") {          // Engineer 003 획득 루트 — 금속이 세 번 부딪친다
    if (!gate("eqClank", 200)) return;
    [0, 0.13, 0.26].forEach((d, i) => { noise({ t: 0.06, gain: 0.12 - i * 0.02, f: 2600, q: 6, delay: d }); tone({ type: "square", f0: 330 - i * 30, f1: 180, t: 0.07, gain: 0.04, delay: d }); });
  } else if (name === "eqBeep") {           // 장치가 맞물림 — 낮은 두 음 전자음
    if (!gate("eqBeep", 150)) return;
    tone({ type: "square", f0: 660, t: 0.07, gain: 0.05 });
    tone({ type: "square", f0: 990, t: 0.09, gain: 0.05, delay: 0.09 });
  } else if (name === "gmSlot") {            // 슬롯 릴 — 빠르게 도는 딸깍 소리가 점점 느려진다
    if (!gate("gmSlot", 400)) return;
    for (let i = 0; i < 12; i++) tone({ type: "square", f0: 880 + (i % 3) * 110, t: 0.03, gain: 0.035, delay: 0.04 * i + 0.004 * i * i });
    tone({ type: "triangle", f0: 1568, f1: 2093, t: 0.2, gain: 0.07, delay: 1.2 });
  } else if (name === "gmDopaSpin" || name === "gmDopaCan") {   // 도파민 — 짧게 도는 릴 · 깡통 당첨은 잭팟 직전 소리가 오르다 미끄러져 내려간다
    if (!gate("gmDopaSpin", 300)) return;
    for (let i = 0; i < 9; i++) tone({ type: "square", f0: 880 + (i % 3) * 110, t: 0.03, gain: 0.035, delay: 0.035 * i + 0.003 * i * i });
    if (name === "gmDopaCan") {
      tone({ type: "triangle", f0: 1047, f1: 2093, t: 0.32, gain: 0.07, delay: 0.5 });
      tone({ type: "triangle", f0: 1568, f1: 392, t: 0.3, gain: 0.07, delay: 0.84 });
    }
  } else if (name === "gmDopaRed") {         // 도파민 적중 — 짧은 타격음
    if (!gate("gmDopaRed", 100)) return;
    noise({ t: 0.08, gain: 0.16, f: 900, q: 1 });
    tone({ type: "square", f0: 300, f1: 120, t: 0.08, gain: 0.08 });
  } else if (name === "gmDopaMiss") {        // 도파민 꽝 — 카드가 바스러지는 마른 소리
    if (!gate("gmDopaMiss", 100)) return;
    [0, 0.04, 0.09, 0.15].forEach((d, i) => noise({ t: 0.05, gain: 0.07 - i * 0.012, f: 2600 - i * 400, q: 2, delay: d }));
  } else if (name === "gmDopaHush") {        // 도파민 잭팟 — 릴이 멈추는 순간 다른 소리가 잠깐 끊긴다
    if (ctx() && duck) { duck.gain.setTargetAtTime(0.02, ac.currentTime, 0.02); duck.gain.setTargetAtTime(1, ac.currentTime + 0.5, 0.12); }
  } else if (name === "enPulse") {           // Engineer 003 — 짧은 전자 발진음
    if (!gate("enPulse", 70)) return;
    tone({ type: "square", f0: 880, f1: 1760, t: 0.06, gain: 0.05 });
    tone({ type: "sine", f0: 2400, f1: 1800, t: 0.05, gain: 0.03, delay: 0.02 });
  } else if (name === "enHit") {             // 펄스 적중 — 작은 전기 튐
    if (!gate("enHit", 70)) return;
    noise({ t: 0.05, gain: 0.07, f: 4200, q: 3 });
    tone({ type: "square", f0: 1400, f1: 700, t: 0.04, gain: 0.04 });
  } else if (name === "enZap") {             // 터렛 레이저 — 짧은 레이저
    if (!gate("enZap", 90)) return;
    tone({ type: "sawtooth", f0: 1900, f1: 600, t: 0.08, gain: 0.04 });
  } else if (name === "enClick") {           // 드론 발사 — 전자 클릭음
    if (!gate("enClick", 90)) return;
    tone({ type: "square", f0: 2600, f1: 2200, t: 0.025, gain: 0.04 });
    noise({ t: 0.03, gain: 0.04, f: 6000, q: 5 });
  } else if (name === "enBuild") {           // 설치 — 낮은 기계음과 잠김 소리
    if (!gate("enBuild", 200)) return;
    tone({ type: "sawtooth", f0: 120, f1: 220, t: 0.22, gain: 0.08 });
    tone({ type: "square", f0: 900, f1: 900, t: 0.03, gain: 0.05, delay: 0.24 });
    noise({ t: 0.05, gain: 0.06, f: 2000, q: 2, delay: 0.24 });
  } else if (name === "enDrone") {           // 드론 소환 — 낮은 회전음이 올라간다
    if (!gate("enDrone", 300)) return;
    tone({ type: "sawtooth", f0: 90, f1: 260, t: 0.4, gain: 0.06 });
    tone({ type: "triangle", f0: 180, f1: 520, t: 0.4, gain: 0.04 });
  } else if (name === "enField") {           // 자기장 — 웅 하고 퍼지는 전자기음
    if (!gate("enField", 200)) return;
    tone({ type: "sine", f0: 140, f1: 70, t: 0.5, gain: 0.12 });
    tone({ type: "square", f0: 60, f1: 60, t: 0.35, gain: 0.04, delay: 0.25 });
    noise({ t: 0.25, gain: 0.07, f: 3500, q: 1.5, delay: 0.28 });
  } else if (name === "enCharge") {          // 레일포 — 충전 뒤 강한 발사
    if (!gate("enCharge", 200)) return;
    tone({ type: "sine", f0: 400, f1: 2400, t: 0.24, gain: 0.06 });
    tone({ type: "sawtooth", f0: 2200, f1: 180, t: 0.25, gain: 0.1, delay: 0.25 });
    noise({ t: 0.2, gain: 0.12, f: 1500, q: 0.8, delay: 0.25 });
  } else if (name === "enPunch") {           // 수호자 주먹 — 묵직한 금속 타격
    if (!gate("enPunch", 120)) return;
    tone({ type: "square", f0: 160, f1: 60, t: 0.14, gain: 0.12 });
    noise({ t: 0.08, gain: 0.1, f: 900, q: 1 });
  } else if (name === "enBoom") {            // 코어 폭발
    if (!gate("enBoom", 150)) return;
    noise({ t: 0.4, gain: 0.28, f: 420, q: 0.6 });
    tone({ type: "sine", f0: 130, f1: 36, t: 0.4, gain: 0.25 });
    tone({ type: "square", f0: 1800, f1: 300, t: 0.12, gain: 0.04 });
  } else if (name === "enOc") {              // 오버클럭 — 회전음의 음정이 올라간다
    if (!gate("enOc", 300)) return;
    tone({ type: "sawtooth", f0: 200, f1: 900, t: 0.55, gain: 0.07 });
    tone({ type: "square", f0: 400, f1: 1800, t: 0.55, gain: 0.03 });
  } else if (name === "enAlarm") {           // 과열 — 짧은 경고음 두 번
    if (!gate("enAlarm", 400)) return;
    [0, 0.16].forEach((d) => tone({ type: "square", f0: 980, f1: 980, t: 0.1, gain: 0.07, delay: d }));
  } else if (name === "enOrbit") {           // 궤도 섬멸 — 다섯 번 저음 충격 뒤 마지막 높은 전자음
    if (!gate("enOrbit", 600)) return;
    for (let i = 0; i < 5; i++) { tone({ type: "sine", f0: 110, f1: 45, t: 0.16, gain: 0.16, delay: 0.55 + i * 0.18 }); noise({ t: 0.1, gain: 0.08, f: 600, q: 1, delay: 0.55 + i * 0.18 }); }
    tone({ type: "sawtooth", f0: 1200, f1: 2600, t: 0.3, gain: 0.07, delay: 1.6 });
    noise({ t: 0.5, gain: 0.25, f: 380, q: 0.6, delay: 1.75 });
    tone({ type: "sine", f0: 90, f1: 30, t: 0.5, gain: 0.25, delay: 1.75 });
  } else if (name === "wyClaw") {            // Wyvern Knight 006 용조격 — 짧게 할퀴는 바람 · 불씨 튐
    if (!gate("wyClaw", 90)) return;
    noise({ t: 0.13, gain: 0.09, f: 1700, q: 1 });
    tone({ type: "sawtooth", f0: 260, f1: 120, t: 0.1, gain: 0.04 });
  } else if (name === "wyHit") {             // 용조격 적중 — 둔탁한 타격
    if (!gate("wyHit", 80)) return;
    tone({ type: "triangle", f0: 180, f1: 80, t: 0.08, gain: 0.08 });
    noise({ t: 0.07, gain: 0.07, f: 900, q: 1.3 });
  } else if (name === "wyCry") {             // 와이번 계약 — 낮은 용 울음이 높아졌다 꺾인다
    if (!gate("wyCry", 400)) return;
    tone({ type: "sawtooth", f0: 140, f1: 330, t: 0.32, gain: 0.07 });
    tone({ type: "sawtooth", f0: 330, f1: 170, t: 0.35, gain: 0.06, delay: 0.3 });
    noise({ t: 0.4, gain: 0.06, f: 600, q: 0.8, delay: 0.05 });
  } else if (name === "wyFire") {            // 와이번 화염구 명중 — 작은 폭발
    if (!gate("wyFire", 110)) return;
    noise({ t: 0.18, gain: 0.12, f: 500, q: 0.7 });
    tone({ type: "sine", f0: 140, f1: 60, t: 0.16, gain: 0.08 });
  } else if (name === "wyBreath") {          // 화염 브레스 — 쏟아지는 불길
    if (!gate("wyBreath", 300)) return;
    noise({ t: 0.7, gain: 0.14, f: 800, q: 0.5, f1: 300 });
    tone({ type: "sawtooth", f0: 110, f1: 70, t: 0.6, gain: 0.05 });
  } else if (name === "wyRoar") {            // 용의 포효 — 낮고 거친 울음
    if (!gate("wyRoar", 300)) return;
    tone({ type: "sawtooth", f0: 90, f1: 150, t: 0.25, gain: 0.1 });
    tone({ type: "sawtooth", f0: 150, f1: 70, t: 0.45, gain: 0.09, delay: 0.22 });
    noise({ t: 0.6, gain: 0.1, f: 400, q: 0.6 });
  } else if (name === "wyDive") {            // 천공 낙하 — 솟구치는 바람 뒤 착지 충격
    if (!gate("wyDive", 300)) return;
    noise({ t: 0.25, gain: 0.08, f: 1200, q: 0.8, f1: 2400 });
    noise({ t: 0.35, gain: 0.2, f: 280, q: 0.6, delay: 0.5 });
    tone({ type: "sine", f0: 100, f1: 35, t: 0.4, gain: 0.18, delay: 0.5 });
  } else if (name === "wyScale") {           // 용린 수호 — 비늘이 겹치는 금속음
    if (!gate("wyScale", 300)) return;
    [0, 0.06, 0.12].forEach((d, i) => tone({ type: "triangle", f0: 700 + i * 120, f1: 520, t: 0.12, gain: 0.04, delay: d }));
    tone({ type: "sine", f0: 160, f1: 200, t: 0.4, gain: 0.07 });
  } else if (name === "wyBoom") {            // 화염 낙하 — 떨어지는 불덩이 폭발
    if (!gate("wyBoom", 120)) return;
    noise({ t: 0.25, gain: 0.15, f: 350, q: 0.6 });
    tone({ type: "sine", f0: 120, f1: 45, t: 0.25, gain: 0.12 });
  } else if (name === "wyAwake") {           // 역린 해방 — 심장 박동 둘 뒤 포효
    if (!gate("wyAwake", 800)) return;
    [0, 0.25].forEach((d) => tone({ type: "sine", f0: 70, f1: 45, t: 0.15, gain: 0.18, delay: d }));
    tone({ type: "sawtooth", f0: 100, f1: 260, t: 0.5, gain: 0.08, delay: 0.5 });
    noise({ t: 0.7, gain: 0.1, f: 500, q: 0.6, delay: 0.5 });
  } else if (name === "wyUlt") {             // 천룡 강림 — 솟아오름 · 첫 낙하 · 긴 울림
    if (!gate("wyUlt", 1000)) return;
    noise({ t: 0.5, gain: 0.08, f: 900, q: 0.7, f1: 2600 });
    tone({ type: "sawtooth", f0: 80, f1: 300, t: 0.6, gain: 0.07 });
    noise({ t: 0.6, gain: 0.25, f: 260, q: 0.5, delay: 0.9 });
    tone({ type: "sine", f0: 90, f1: 30, t: 0.7, gain: 0.22, delay: 0.9 });
    // 최종 폭발(2.0초) — 화면이 멈추는 순간에 맞춰 짧고 단단한 타격음 · 뒤이어 낮게 꺼지는 울림(11월 28일, wyvernArt.js drawWyvernImpact)
    noise({ t: 0.12, gain: 0.3, f: 1800, q: 0.6, delay: 2.0 });
    tone({ type: "square", f0: 160, f1: 60, t: 0.1, gain: 0.08, delay: 2.0 });
    noise({ t: 0.9, gain: 0.2, f: 220, q: 0.5, delay: 2.1 });
    tone({ type: "sine", f0: 70, f1: 25, t: 1.0, gain: 0.24, delay: 2.1 });
    noise({ t: 0.35, gain: 0.22, f: 600, q: 0.5, f1: 150, delay: 2.36 });   // 검은 화면에서 흰 폭발이 커질 때(WY_IMPACT 흰 0.2 + 검은 0.16)
  } else if (name === "wyDash") {            // 천공 강습 — 짧게 찢는 돌진 바람
    if (!gate("wyDash", 200)) return;
    noise({ t: 0.3, gain: 0.1, f: 1500, q: 0.8, f1: 600 });
    tone({ type: "sawtooth", f0: 200, f1: 90, t: 0.25, gain: 0.04 });
  } else if (name === "wyBlade") {           // 아르카디온 · 용참섬멸 — 크게 베는 금속음
    if (!gate("wyBlade", 150)) return;
    noise({ t: 0.18, gain: 0.11, f: 2200, q: 1.2 });
    tone({ type: "triangle", f0: 900, f1: 300, t: 0.18, gain: 0.05 });
    tone({ type: "sine", f0: 130, f1: 60, t: 0.2, gain: 0.08, delay: 0.05 });
  } else if (name === "ncReap") {            // Necromancer 004 그림자 낫 — 낮게 가르는 바람 소리 · 짧은 전기 튐
    if (!gate("ncReap", 90)) return;
    noise({ t: 0.16, gain: 0.09, f: 1400, q: 0.9 });
    tone({ type: "sawtooth", f0: 320, f1: 110, t: 0.14, gain: 0.04 });
    tone({ type: "square", f0: 1800, f1: 900, t: 0.03, gain: 0.02, delay: 0.1 });
  } else if (name === "ncHit") {             // 낫 적중 — 둔탁하게 흩어짐 · 보라 번개 튐
    if (!gate("ncHit", 80)) return;
    tone({ type: "triangle", f0: 200, f1: 90, t: 0.08, gain: 0.07 });
    noise({ t: 0.07, gain: 0.07, f: 700, q: 1.5 });
  } else if (name === "ncExtract") {         // 흔적 추출 — 아래에서 올라오는 낮은 소리
    if (!gate("ncExtract", 300)) return;
    tone({ type: "sine", f0: 110, f1: 330, t: 0.45, gain: 0.11 });
    tone({ type: "triangle", f0: 220, f1: 440, t: 0.3, gain: 0.04, delay: 0.2 });
  } else if (name === "ncSummon") {          // 그림자 소환 — 낮은 울림 위로 겹소리
    if (!gate("ncSummon", 400)) return;
    tone({ type: "sine", f0: 82, f1: 123, t: 0.6, gain: 0.16 });
    [0, 0.08, 0.16].forEach((d, i) => tone({ type: "triangle", f0: 196 + i * 30, f1: 165, t: 0.25, gain: 0.04, delay: d }));
    [0.02, 0.1, 0.17].forEach((d) => noise({ t: 0.09, gain: 0.08, f: 3200, q: 2, delay: d }));   // 내리치는 보라 번개
  } else if (name === "ncSlash") {           // 그림자 근접 공격
    if (!gate("ncSlash", 90)) return;
    noise({ t: 0.08, gain: 0.07, f: 1200, q: 1.2 });
    tone({ type: "triangle", f0: 300, f1: 140, t: 0.07, gain: 0.04 });
  } else if (name === "ncShot") {            // 그림자 화살 · 구체
    if (!gate("ncShot", 110)) return;
    tone({ type: "sine", f0: 420, f1: 240, t: 0.1, gain: 0.05 });
  } else if (name === "ncSlam") {            // 거수형 내려찍기
    if (!gate("ncSlam", 150)) return;
    noise({ t: 0.22, gain: 0.16, f: 260, q: 0.6 });
    tone({ type: "sine", f0: 90, f1: 40, t: 0.22, gain: 0.14 });
  } else if (name === "ncSwap") {            // 그림자 교환 — 짧게 빨려 드는 소리
    if (!gate("ncSwap", 200)) return;
    tone({ type: "sine", f0: 600, f1: 180, t: 0.16, gain: 0.07 });
    tone({ type: "sine", f0: 180, f1: 600, t: 0.12, gain: 0.05, delay: 0.16 });
  } else if (name === "ncDomain") {          // 군주의 영역 — 길게 깔리는 낮은 음
    if (!gate("ncDomain", 400)) return;
    tone({ type: "sine", f0: 73, f1: 98, t: 0.7, gain: 0.15 });
    tone({ type: "triangle", f0: 147, f1: 196, t: 0.5, gain: 0.04, delay: 0.1 });
  } else if (name === "ncMarch") {           // 일제 진군 — 짧은 북소리 셋
    if (!gate("ncMarch", 300)) return;
    [0, 0.1, 0.2].forEach((d) => { tone({ type: "sine", f0: 120, f1: 60, t: 0.1, gain: 0.12, delay: d }); noise({ t: 0.05, gain: 0.05, f: 500, q: 1, delay: d }); });
  } else if (name === "ncCrack") {           // 영혼 소각 — 갈라지는 소리 뒤 낮은 폭발
    if (!gate("ncCrack", 300)) return;
    noise({ t: 0.12, gain: 0.08, f: 2400, q: 3 });
    noise({ t: 0.4, gain: 0.22, f: 300, q: 0.5, delay: 0.38 });
    tone({ type: "sine", f0: 110, f1: 38, t: 0.4, gain: 0.18, delay: 0.38 });
  } else if (name === "ncLegion") {          // 무명의 군세 — 어두운 저음이 오른다
    if (!gate("ncLegion", 800)) return;
    tone({ type: "sawtooth", f0: 46, f1: 92, t: 2.6, gain: 0.08 });
    tone({ type: "sine", f0: 55, f1: 110, t: 2.6, gain: 0.12 });
    for (let i = 0; i < 10; i++) noise({ t: 0.08, gain: 0.05, f: 400, q: 1, delay: 0.6 + i * 0.2 });
  } else if (name === "ncBoom") {            // 무명의 군세 마지막 타격
    if (!gate("ncBoom", 200)) return;
    noise({ t: 0.6, gain: 0.32, f: 220, q: 0.5 });
    tone({ type: "sine", f0: 100, f1: 28, t: 0.6, gain: 0.3 });
  } else if (name === "ilCard") {           // Illusionist 005 — 카드를 튕겨 던지는 짧은 바람 소리
    if (!gate("ilCard", 70)) return;
    noise({ t: 0.05, gain: 0.06, f: 5200, q: 2 });
    tone({ type: "triangle", f0: 1900, f1: 1300, t: 0.04, gain: 0.03 });
  } else if (name === "ilHit") {            // 카드 절단음
    if (!gate("ilHit", 70)) return;
    noise({ t: 0.06, gain: 0.08, f: 6500, q: 4 });
    tone({ type: "square", f0: 2600, f1: 1500, t: 0.03, gain: 0.03 });
  } else if (name === "ilReady") {          // 트릭 3 — 맑은 두 음
    if (!gate("ilReady", 300)) return;
    tone({ type: "sine", f0: 1318, t: 0.08, gain: 0.05 }); tone({ type: "sine", f0: 1760, t: 0.1, gain: 0.05, delay: 0.07 });
  } else if (name === "ilShuffle") {        // 폭렬 셔플 — 카드 섞는 소리 뒤 작은 폭발
    if (!gate("ilShuffle", 300)) return;
    for (let i = 0; i < 6; i++) noise({ t: 0.03, gain: 0.05, f: 4800, q: 3, delay: 0.02 + i * 0.03 });
    noise({ t: 0.3, gain: 0.16, f: 700, q: 0.6, delay: 0.7 });
    tone({ type: "sine", f0: 220, f1: 70, t: 0.3, gain: 0.12, delay: 0.7 });
  } else if (name === "ilSlash" || name === "ilSlash2") {   // 덱 슬래시 — 날카로운 두 번 베기
    if (!gate(name, 120)) return;
    noise({ t: 0.12, gain: 0.12, f: name === "ilSlash" ? 5200 : 3800, q: 1.2, delay: name === "ilSlash" ? 0.1 : 0 });
    tone({ type: "sawtooth", f0: 1600, f1: 500, t: 0.1, gain: 0.04, delay: name === "ilSlash" ? 0.1 : 0 });
  } else if (name === "ilBox") {            // 카드 프리즌 — 상자가 닫히는 딸깍 · 마지막 접힘
    if (!gate("ilBox", 300)) return;
    [0, 0.08, 0.16, 0.24].forEach((d) => tone({ type: "square", f0: 1200, f1: 900, t: 0.025, gain: 0.04, delay: d }));
    noise({ t: 0.3, gain: 0.14, f: 900, q: 0.8, delay: 1.7 });
    tone({ type: "sine", f0: 260, f1: 80, t: 0.3, gain: 0.12, delay: 1.7 });
  } else if (name === "ilBlink") {          // 카드 블링크 — 휙 사라졌다 나타남
    if (!gate("ilBlink", 300)) return;
    tone({ type: "sine", f0: 600, f1: 2400, t: 0.12, gain: 0.06 });
    noise({ t: 0.2, gain: 0.12, f: 1200, q: 0.7, delay: 0.22 });
  } else if (name === "ilFist") {           // 팬텀 피스트 — 모이는 소리 뒤 묵직한 충돌
    if (!gate("ilFist", 300)) return;
    for (let i = 0; i < 5; i++) noise({ t: 0.03, gain: 0.04, f: 4200, q: 3, delay: i * 0.045 });
    noise({ t: 0.35, gain: 0.25, f: 320, q: 0.5, delay: 0.5 });
    tone({ type: "sine", f0: 140, f1: 40, t: 0.35, gain: 0.25, delay: 0.5 });
  } else if (name === "ilMirror") {         // 미러 하우스 — 유리가 울리는 맑은 소리
    if (!gate("ilMirror", 500)) return;
    [1568, 2093, 2637].forEach((f, i) => tone({ type: "sine", f0: f, t: 0.5, gain: 0.04, delay: i * 0.08 }));
  } else if (name === "ilGhost") {          // 트릭 잔상
    if (!gate("ilGhost", 90)) return;
    tone({ type: "triangle", f0: 2400, f1: 900, t: 0.12, gain: 0.04 });
  } else if (name === "ilGlass") {          // 거울 잔상 · 최후의 셔플 파쇄 — 유리 파쇄음
    if (!gate("ilGlass", 120)) return;
    noise({ t: 0.25, gain: 0.14, f: 7000, q: 1.5 });
    for (let i = 0; i < 6; i++) tone({ type: "sine", f0: 2800 + i * 430, t: 0.06, gain: 0.025, delay: 0.02 + i * 0.03 });
  } else if (name === "ilFinal") {          // 최후의 셔플 — 카드가 원으로 도는 소리 · 연타
    if (!gate("ilFinal", 800)) return;
    tone({ type: "sine", f0: 330, f1: 660, t: 0.5, gain: 0.06 });
    for (let i = 0; i < 12; i++) noise({ t: 0.04, gain: 0.06, f: 5000, q: 3, delay: 0.6 + i * 0.1 });
  } else if (name === "clear") {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: "square", f0: f, t: 0.4, gain: 0.12, delay: i * 0.12 }));
  }
}

export default { unlock, play, shot, isMuted, setMuted, setLevel, startRpgMusic, musicTo, musicFadeOut, musicFadeIn, trackOfMap };
