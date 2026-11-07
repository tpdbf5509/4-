/* 이야기 맵 장식 소품 — 11월 7일. 맵이 비어 보이지 않게 맵마다 정해 둔 분위기의 소품을 무리 지어 흩뿌린다.
   손으로 좌표를 적지 않고 맵 id 로 정한 씨앗으로 만든다(서버 · 화면이 같은 결과). 길 · 조사물 · 인물 · 건물 · 출구 · 시작 자리에서 떨어져 놓고
   대부분은 막지 않는다(r 0). 그림은 places/prop-d-<이름>.webp, 크기는 design/story/size-sights.py 가 storySizes.js 로 만든다. */
import {STORY_DECOR_SIZE} from './storySizes.js';

// 맵 분위기 — [소품 이름, 비중]. 이름은 그림 파일 prop-d-<이름>.webp 와 같다.
const ROCK = [['rubble', 3], ['boulder', 2], ['slab', 1], ['bricks', 2], ['stump-pillar', 2], ['menhir', 1], ['pottery', 1], ['bench-stone', 1]];
const CAMP = [['barricade', 2], ['tent', 1], ['supply-stack', 2], ['barrels', 2], ['fence', 2], ['flag-pole', 1], ['campfire', 1], ['handcart', 1]];
const MACH = [['cable-spool', 2], ['generator', 2], ['scrap', 3], ['pipes', 2], ['junction', 2], ['vent', 2], ['robot-wreck', 1], ['battery-rack', 2]];
const NATURE = [['bush', 3], ['wildflowers', 3], ['stump', 1], ['small-tree', 2], ['rocks', 2], ['fence-post', 1], ['hay-bale', 1], ['tall-grass', 3]];
const SEA = [['mooring', 2], ['traps', 1], ['net-rack', 1], ['buoy', 2], ['crate-sunk', 1], ['rock-weed', 3], ['pier-lantern', 1], ['rowboat', 1]];
const ORN = [['planter', 3], ['bench', 2], ['statue', 1], ['armillary', 1], ['star-stand', 1], ['fountain', 1], ['urn', 2], ['banner-stand', 1]];
const BOOK = [['bookstack', 3], ['bookstand', 2], ['ladder', 1], ['writing-desk', 2], ['scroll-crate', 2], ['globe', 1], ['candle-stand', 2], ['cabinet', 1]];
const MINE = [['pick-stand', 1], ['ore-pile', 3], ['lantern-post', 2], ['mine-beam', 2], ['rail', 2], ['crystals', 2], ['planks-barrels', 2], ['scaffold', 1]];
const mix = (...parts) => parts.flatMap(([set, k]) => set.map(([n, w]) => [n, w * k]));

export const STORY_DECOR_THEME = {
  convoy: mix([NATURE, 2], [CAMP, 1], [ROCK, 1]),
  lab7: mix([MACH, 3], [ROCK, 1]),
  'ruin-north': mix([ROCK, 3], [NATURE, 1]), 'ruin-east': mix([ROCK, 3], [NATURE, 1]),
  'ruin-south': mix([ROCK, 3], [NATURE, 1]), 'ruin-west': mix([ROCK, 3], [MACH, 1]),
  core: mix([MACH, 3], [ROCK, 1]),
  relay: mix([MACH, 2], [CAMP, 1], [ROCK, 1]),
  mine: mix([MINE, 3], [ROCK, 1]),
  vault: mix([BOOK, 2], [ROCK, 2]),
  lumen: mix([ROCK, 2], [CAMP, 1], [BOOK, 1], [MINE, 1]),
  'lumen-library': mix([BOOK, 4], [ORN, 1]),
  'lumen-observatory': mix([ORN, 3], [ROCK, 1]),
  leon: mix([CAMP, 3], [ROCK, 1]),
  'leon-hall': mix([ORN, 2], [BOOK, 1], [CAMP, 1]),
  karha: mix([MACH, 3], [ROCK, 1]),
  bridge: mix([SEA, 2], [CAMP, 1], [ROCK, 1]),
  'erden-sky': mix([NATURE, 4], [ROCK, 1]),
  'nameless-sea': mix([SEA, 4], [ROCK, 1]),
  registry: mix([MACH, 2], [ORN, 1]),
  'observer-deck': mix([MACH, 2], [ORN, 1]),
  'first-plaza': mix([ORN, 3], [NATURE, 1]),
  'boundary-room': mix([ORN, 2], [BOOK, 1], [MACH, 1]),
};

const DENSITY = 65000;        // 소품 하나가 차지하는 맵 넓이(px²) — 작을수록 빽빽하다
const ROAD_GAP = 70;          // 길 가장자리에서 떨어질 거리
const CLUSTER = [3, 5];       // 한 무리의 소품 수
const segDist = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

// m — 조사물 크기를 맞춘 뒤의 맵. 반환: 소품 {look, x, y, size, r, decor:true} 배열
export function decorFor(m) {
  const theme = STORY_DECOR_THEME[m.id]; if (!theme) return [];
  let seed = 7919; for (const ch of m.id) seed = (seed * 131 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const total = theme.reduce((s, [, w]) => s + w, 0);
  const pick = () => { let r = rnd() * total; for (const [n, w] of theme) { r -= w; if (r <= 0) return n; } return theme[0][0]; };
  const keep = [   // 비워 둘 곳 — [x, y, 반지름]
    ...(m.sights || []).map((s) => [s.x, s.y - s.size * .25, s.size * .5 + 60]),
    ...(m.npcs || []).map((n) => [n.x, n.y, 120]),
    ...(m.buildings || []).map((b) => [b.x, b.y - (b.size || 200) * .3, (b.size || 200) * .55 + 40]),
    ...(m.props || []).map((p) => [p.x, p.y, (p.size || 90) * .5 + 40]),
    [m.spawn[0], m.spawn[1], 150], [m.exit.x, m.exit.y, 170],
  ];
  const ok = (x, y, size) => {
    if (x < 110 || x > m.w - 110 || y < 190 || y > m.h - 90) return false;
    for (const rd of m.roads || []) for (let i = 0; i < rd.pts.length - 1; i++) if (segDist(x, y, rd.pts[i], rd.pts[i + 1]) < rd.w / 2 + ROAD_GAP + size * .25) return false;
    for (const p of m.pads || []) if (((x - p.x) / (p.rx + 40)) ** 2 + ((y - p.y) / (p.ry + 40)) ** 2 < 1) return false;
    for (const [kx, ky, kr] of keep) if (Math.hypot(x - kx, y - ky) < kr + size * .3) return false;
    return true;
  };
  const out = [], want = Math.round(m.w * m.h / DENSITY);
  const put = (look, x, y) => {
    const z = STORY_DECOR_SIZE['d-' + look]; if (!z) return false;
    if (!ok(x, y, z[0])) return false;
    for (const o of out) if (Math.hypot(x - o.x, y - o.y) < (z[0] + o.size) * .28) return false;
    out.push({look: 'd-' + look, x: Math.round(x), y: Math.round(y), size: z[0], r: z[1], decor: true});
    return true;
  };
  for (let tries = 0; out.length < want && tries < want * 40; tries++) {
    const cx = rnd() * m.w, cy = rnd() * m.h, n = rnd() < .25 ? 1 : CLUSTER[0] + Math.floor(rnd() * (CLUSTER[1] - CLUSTER[0] + 1));
    const a = pick(), b = pick();                                   // 한 무리는 두 가지 소품으로 이룬다
    for (let k = 0; k < n; k++) put(rnd() < .6 ? a : b, cx + (rnd() - .5) * 340, cy + (rnd() - .5) * 220);
  }
  return out;
}
