/* RPG 사냥터 바탕 — 사냥터마다 다른 땅 · 뒤 풍경 · 바닥 장식(10월 30일).
   그림 파일 없이 fieldArt.js 가 이 표대로 한 번 그려 두고 맵 폭이 넓으면 좌우를 뒤집어 잇는다(rpgArt.js drawTiled).
   빛깔은 쨍한 원색 대신 톤다운 · 파스텔. 몹 · 사람이 잘 보이게 땅은 가운데 밝기로 둔다.
   ground [바탕, 밝은 얼룩, 어두운 얼룩] · tex 땅결(blade 풀 · speck 모래알 · crack 금 · grain 돌결) ·
   back 맵 위쪽(top 위) 뒤 풍경(forest 숲 · cliff 절벽 · ruin 무너진 벽) · edge 아래 끝 줄 ·
   decor [{k 종류, n 한 장(2600 × 1800)당 개수, c 빛깔}] · path 문 앞 흙길 [테두리, 길].
   맵 id 에 없는 곳(광장 · 결투장 · 던전 · 훈련장 · 월드보스 · 길드)은 예전 그림(field.webp + tint) 그대로 */

export const FIELD_TILE = 2600;     // 한 장의 폭 — 넓은 맵은 이 폭으로 좌우를 뒤집어 잇는다
export const FIELD_TRAIL = 520;     // 문에서 안쪽으로 이어지는 흙길 길이

export const FIELD_LOOKS = {
  // 1~10 토끼 — 부드러운 들꽃 초원
  field: {
    seed: 101, ground: ["#7e9a68", "#93ae7c", "#6b8656"],
    tex: { k: "blade", c: "#a9c28f", n: 2400 },
    back: { k: "forest", c: ["#b7c9b0", "#93ad8c", "#728f6c"], pine: 0.35 },
    edge: { k: "bush", c: ["#5f7b52", "#79956a"] },
    decor: [
      { k: "patch", n: 9, c: "#9db886" },
      { k: "flower", n: 560, c: ["#f0d9df", "#f2e6c2", "#dcd2ec", "#f7f2e8"] },
      { k: "pebble", n: 60, c: ["#a7a59e", "#c6c3ba"] },
      { k: "stone", n: 12, c: ["#8d8a84", "#b4b1a9"] },
    ],
    path: ["#9c8a6c", "#c2b08e"],
  },
  // 10~20 늑대 — 푸른빛 바늘잎 숲, 떨어진 솔잎과 버섯
  wolf: {
    seed: 102, ground: ["#61806e", "#73917d", "#516d5d"],
    tex: { k: "blade", c: "#86a493", n: 1800 },
    back: { k: "forest", c: ["#93aaa3", "#6e8b80", "#4f6a5f"], pine: 0.9 },
    edge: { k: "bush", c: ["#405a4c", "#58745f"] },
    decor: [
      { k: "moss", n: 40, c: "#7e9c7c" },
      { k: "needle", n: 900, c: ["#8a7a5e", "#9c8c6c"] },
      { k: "mushroom", n: 70, c: ["#e7d6c6", "#c98f86"] },
      { k: "stone", n: 22, c: ["#6f7672", "#959c97"] },
    ],
    path: ["#7d7262", "#a39782"],
  },
  // 20~50 멧돼지 — 가을 숲, 낙엽과 진흙 웅덩이
  boar: {
    seed: 103, ground: ["#8d8b62", "#a09c72", "#77744f"],
    tex: { k: "blade", c: "#b2ac80", n: 1600 },
    back: { k: "forest", c: ["#d2c2a6", "#bc9c78", "#977a5a"], pine: 0.2 },
    edge: { k: "bush", c: ["#7a6a48", "#957f58"] },
    decor: [
      { k: "pool", n: 7, c: ["#6e5f48", "#8a7a60", "#a6987e"], size: 70 },
      { k: "leaf", n: 900, c: ["#d3a57c", "#c48e6a", "#d9be86", "#b98a66"] },
      { k: "mushroom", n: 30, c: ["#efe2cf", "#c9a07c"] },
      { k: "stone", n: 16, c: ["#8b8378", "#ada597"] },
    ],
    path: ["#8a7458", "#b29b7a"],
  },
  // 50~100 고릴라 — 짙은 밀림, 큰 고사리와 뿌리
  gorilla: {
    seed: 104, ground: ["#5f805d", "#6f916b", "#4d6c4c"],
    tex: { k: "blade", c: "#7fa27a", n: 2200 },
    back: { k: "forest", c: ["#89a98a", "#638a66", "#466a4b"], pine: 0.05, dense: 1 },
    edge: { k: "fern", c: ["#3f6142", "#577c56"] },
    decor: [
      { k: "moss", n: 60, c: "#7aa077" },
      { k: "pool", n: 4, c: ["#3f5f5a", "#5f8580", "#88aaa2"], size: 90 },
      { k: "root", n: 26, c: "#6e5d48" },
      { k: "fern", n: 110, c: ["#4b7149", "#679363"] },
      { k: "flower", n: 120, c: ["#f2c9c4", "#efe2b4"] },
    ],
    path: ["#6f6450", "#958870"],
  },
  // 100~130 고블린 — 축축한 늪지, 탁한 물과 갈대
  goblin: {
    seed: 105, ground: ["#727c5c", "#848d6b", "#5f684b"],
    tex: { k: "blade", c: "#95a07a", n: 1400 },
    back: { k: "forest", c: ["#a7ad98", "#848c72", "#5f6851"], pine: 0.3, dead: 0.4 },
    edge: { k: "reed", c: ["#5b6544", "#7b8358"] },
    decor: [
      { k: "pool", n: 16, c: ["#4f5f55", "#6b7c6e", "#93a394"], size: 110, lily: "#86a070" },
      { k: "mud", n: 26, c: "#625a44" },
      { k: "reed", n: 90, c: ["#7f8a5a", "#a2a675"] },
      { k: "mushroom", n: 40, c: ["#d8d6b8", "#a9b07c"] },
    ],
    path: ["#6c6249", "#8f8466"],
  },
  // 130~160 오크 — 붉은 바위 언덕, 마른 풀과 금 간 땅
  orc: {
    seed: 106, ground: ["#a07c66", "#b38f77", "#8a6756"],
    tex: { k: "crack", c: "#7d5e50", n: 70 },
    back: { k: "cliff", c: ["#cfaa94", "#b48a74", "#93705e"] },
    edge: { k: "rock", c: ["#82604f", "#a37e69"] },
    decor: [
      { k: "patch", n: 10, c: "#b9977f" },
      { k: "tuft", n: 220, c: ["#c4ad7c", "#a99567"] },
      { k: "pebble", n: 220, c: ["#8f6c5c", "#bf9d88"] },
      { k: "stone", n: 30, c: ["#8a6656", "#b28e7a"] },
    ],
    path: ["#87695a", "#b49681"],
  },
  // 160~200 오우거 — 해 질 녘 어두운 골짜기, 푸른 이끼와 돌무더기
  ogre: {
    seed: 107, ground: ["#6b6878", "#7c798a", "#5a5767"],
    tex: { k: "grain", c: "#8a879a", n: 900 },
    back: { k: "cliff", c: ["#9d98ae", "#7c7790", "#5d5970"] },
    edge: { k: "rock", c: ["#4f4c5c", "#6c6880"] },
    decor: [
      { k: "moss", n: 50, c: "#7f9592" },
      { k: "pebble", n: 260, c: ["#5c596a", "#9592a6"] },
      { k: "stone", n: 40, c: ["#5d5a6b", "#8b879c"] },
      { k: "bone", n: 14, c: ["#d9d4c8"] },
    ],
    path: ["#5f5a62", "#87818a"],
  },
  // 200~230 스켈레톤 — 차가운 돌무덤, 묘비와 뼈
  skeletal: {
    seed: 108, ground: ["#7b818d", "#8b919d", "#6a707c"],
    tex: { k: "grain", c: "#979dab", n: 900 },
    back: { k: "ruin", c: ["#a7adba", "#878d9a", "#6b717e"] },
    edge: { k: "rock", c: ["#5f6470", "#7d838f"] },
    decor: [
      { k: "tiles", n: 6, c: ["#8d93a0", "#9aa0ad", "#838996"] },
      { k: "grave", n: 34, c: ["#a3a8b2", "#c2c6cd"] },
      { k: "bone", n: 70, c: ["#e1ddd2"] },
      { k: "crack", n: 30, c: "#626774" },
      { k: "fog", n: 10, c: "#dfe3ec" },
    ],
    path: ["#6a6c70", "#8f9196"],
  },
  // 230~260 좀비 — 썩은 늪, 연둣빛 독 웅덩이와 앙상한 나무
  zombie: {
    seed: 109, ground: ["#737e69", "#838e78", "#626c59"],
    tex: { k: "blade", c: "#8f9a7c", n: 1000 },
    back: { k: "forest", c: ["#a3a898", "#80877a", "#5f6659"], pine: 0.1, dead: 1 },
    edge: { k: "reed", c: ["#56604c", "#727b62"] },
    decor: [
      { k: "pool", n: 14, c: ["#5d6f4f", "#8fae78", "#c4dcaa"], size: 95, glow: 1 },
      { k: "leaf", n: 360, c: ["#8d8466", "#7a7458", "#a39a78"] },
      { k: "bone", n: 40, c: ["#d5d2c0"] },
      { k: "grave", n: 10, c: ["#8e9286", "#acb0a3"] },
    ],
    path: ["#655f4d", "#8b846c"],
  },
  // 260~300 언데드 마법사 — 보랏빛 마력이 서린 폐허
  necro: {
    seed: 110, ground: ["#7a6d82", "#8a7d92", "#685c70"],
    tex: { k: "grain", c: "#978aa0", n: 800 },
    back: { k: "ruin", c: ["#ab9fb6", "#8a7e97", "#6c6079"] },
    edge: { k: "rock", c: ["#5e5268", "#7a6e86"] },
    decor: [
      { k: "tiles", n: 9, c: ["#8d8096", "#9a8da3", "#81748a"] },
      { k: "rune", n: 12, c: "#d7c3f0" },
      { k: "crystal", n: 30, c: ["#b9a3d6", "#e2d6f2"] },
      { k: "bone", n: 30, c: ["#ddd6cf"] },
      { k: "fog", n: 8, c: "#e2d8ee" },
    ],
    path: ["#675d6b", "#8d8292"],
  },
  // 300~330 골렘 — 돌가루 날리는 채석장, 잘린 돌덩이
  golem: {
    seed: 111, ground: ["#a69a86", "#b6ab97", "#928673"],
    tex: { k: "speck", c: "#c7bda9", n: 2600 },
    back: { k: "cliff", c: ["#d3c9b6", "#b5a993", "#968a74"], strata: 1 },
    edge: { k: "rock", c: ["#857a68", "#a39884"] },
    decor: [
      { k: "patch", n: 10, c: "#bcb19d" },
      { k: "block", n: 26, c: ["#b8ad98", "#958a76", "#d1c7b3"] },
      { k: "pebble", n: 320, c: ["#8f8471", "#c9bfab"] },
      { k: "crack", n: 24, c: "#867b68" },
    ],
    path: ["#8a7e6a", "#b2a690"],
  },
  // 330~360 키메라 — 붉은 바위 협곡, 모래 물결
  chimera: {
    seed: 112, ground: ["#a07a6b", "#b28c7c", "#8b685a"],
    tex: { k: "speck", c: "#c09d8c", n: 2000 },
    back: { k: "cliff", c: ["#d6b2a2", "#b98f7d", "#966d5d"], strata: 1 },
    edge: { k: "rock", c: ["#7f5c4e", "#a07a6a"] },
    decor: [
      { k: "ripple", n: 40, c: "#b8968a" },
      { k: "stone", n: 34, c: ["#87645a", "#b38f80"] },
      { k: "tuft", n: 120, c: ["#c2a37c", "#a88a68"] },
      { k: "bone", n: 20, c: ["#e3dccf"] },
    ],
    path: ["#86685c", "#b0927f"],
  },
  // 360~400 포식거미 — 거미줄 걸린 어두운 숲
  spider: {
    seed: 113, ground: ["#5f5d6c", "#6e6c7c", "#4f4d5c"],
    tex: { k: "blade", c: "#7c7a8d", n: 1200 },
    back: { k: "forest", c: ["#8a879b", "#6a687c", "#4c4a5d"], pine: 0.8 },
    edge: { k: "bush", c: ["#403e4e", "#575568"] },
    decor: [
      { k: "root", n: 30, c: "#4d4652" },
      { k: "web", n: 22, c: "#e6e3ef" },
      { k: "mushroom", n: 60, c: ["#cfe0e4", "#9ab6c4"], glow: 1 },
      { k: "egg", n: 14, c: ["#ddd8c8", "#bdb8a6"] },
      { k: "fog", n: 8, c: "#c9c6da" },
    ],
    path: ["#5a5260", "#7e7685"],
  },
  // 400~450 불정령의 화원 — 산호빛 불꽃 꽃밭과 재
  fspirit: {
    seed: 114, ground: ["#9a776c", "#ab887c", "#86655b"],
    tex: { k: "blade", c: "#b8968a", n: 1200 },
    back: { k: "forest", c: ["#d2b3a6", "#b48e80", "#8f6c60"], pine: 0.3, dead: 0.6 },
    edge: { k: "rock", c: ["#6f5249", "#8d6a5f"] },
    decor: [
      { k: "scorch", n: 14, c: "#6d4f47" },
      { k: "flower", n: 420, c: ["#f2b9a2", "#f5d3a6", "#eea9a0", "#f7e2c8"] },
      { k: "ember", n: 160, c: "#ffc9a0" },
      { k: "stone", n: 18, c: ["#7c5d54", "#a4847a"] },
    ],
    path: ["#7d6157", "#a68a7e"],
  },
  // 450~500 용암 분지 — 검은 현무암 사이로 흐르는 용암
  lavagolem: {
    seed: 115, ground: ["#6f6464", "#7f7474", "#5d5353"],
    tex: { k: "crack", c: "#4f4545", n: 50 },
    back: { k: "cliff", c: ["#9d8e8a", "#7b6d6a", "#5c504e"] },
    edge: { k: "rock", c: ["#4a4040", "#665a5a"] },
    decor: [
      { k: "lava", n: 34, c: ["#e9a073", "#f6c99a"] },
      { k: "pool", n: 7, c: ["#5a3f38", "#e39a6c", "#f7d0a2"], size: 85, glow: 1 },
      { k: "stone", n: 40, c: ["#4f4646", "#7a6f6f"] },
      { k: "ember", n: 120, c: "#ffc39a" },
    ],
    path: ["#55494a", "#7a6d6c"],
  },
  // 500~550 화염룡의 둥지 — 그을린 땅, 큰 뼈와 알껍데기
  firedrake: {
    seed: 116, ground: ["#8b6b5d", "#9c7c6d", "#77594d"],
    tex: { k: "speck", c: "#a88a7c", n: 1600 },
    back: { k: "cliff", c: ["#c3a294", "#a07e70", "#7d5e52"], strata: 1 },
    edge: { k: "rock", c: ["#644a40", "#82665a"] },
    decor: [
      { k: "scorch", n: 22, c: "#5f463d" },
      { k: "bone", n: 60, c: ["#e6ddcf"] },
      { k: "egg", n: 16, c: ["#e9d9c4", "#c9b39a"] },
      { k: "ember", n: 90, c: "#ffcaa2" },
      { k: "stone", n: 22, c: ["#6c5146", "#957769"] },
    ],
    path: ["#715649", "#9a7d6f"],
  },
  // 550~600 이프리트의 제단 — 모래빛 제단 바닥과 금빛 문양
  ifrit: {
    seed: 117, ground: ["#a88668", "#b9977a", "#937357"],
    tex: { k: "speck", c: "#c6a68a", n: 2000 },
    back: { k: "ruin", c: ["#d9c0a4", "#bb9f84", "#977c64"] },
    edge: { k: "rock", c: ["#7f644d", "#a08367"] },
    decor: [
      { k: "tiles", n: 9, c: ["#c0a387", "#b39678", "#cbb095"] },
      { k: "rune", n: 10, c: "#f4dca6" },
      { k: "ripple", n: 26, c: "#c2a083" },
      { k: "ember", n: 70, c: "#ffd3a6" },
    ],
    path: ["#8c7158", "#b39779"],
  },
  // 600~650 망령의 성채 — 푸른 돌바닥과 안개
  wraith: {
    seed: 118, ground: ["#5f6779", "#6f778a", "#4f5768"],
    tex: { k: "grain", c: "#7d869a", n: 700 },
    back: { k: "ruin", c: ["#8d97ab", "#6e778b", "#525a6d"], castle: 1 },
    edge: { k: "rock", c: ["#434a5a", "#5d6577"] },
    decor: [
      { k: "tiles", n: 12, c: ["#6e7689", "#7a8296", "#646c7e"] },
      { k: "grave", n: 16, c: ["#848ca0", "#a5adbf"] },
      { k: "crack", n: 30, c: "#4a5163" },
      { k: "fog", n: 14, c: "#d4dcef" },
    ],
    path: ["#565c68", "#7a808c"],
  },
  // 650~700 심해 해구 — 푸른 바닷바닥, 산호와 조개
  abyss: {
    seed: 119, ground: ["#4f6f79", "#5e7f89", "#415f69"],
    tex: { k: "speck", c: "#7b9aa3", n: 1600 },
    back: { k: "cliff", c: ["#7e9ea6", "#5f7f88", "#44626b"], reef: 1 },
    edge: { k: "coral", c: ["#c99a9e", "#8eb0b0"] },
    decor: [
      { k: "ripple", n: 46, c: "#6b8b94" },
      { k: "coral", n: 60, c: ["#e2aeb0", "#efc9b4", "#b8d4cf", "#c5b5dc"] },
      { k: "shell", n: 80, c: ["#efe3d6", "#e4c9c0"] },
      { k: "bubble", n: 160, c: "#c8e2e6" },
    ],
    path: ["#4c6168", "#6f868c"],
  },
  // 700~750 공허의 서고 — 남보랏빛 바닥, 흩어진 책장과 마법 문양
  voidmage: {
    seed: 120, ground: ["#5f5a7a", "#6f6a8a", "#4f4a69"],
    tex: { k: "grain", c: "#7e799a", n: 700 },
    back: { k: "ruin", c: ["#8d88ad", "#6e698d", "#524d70"], shelf: 1 },
    edge: { k: "rock", c: ["#433f5a", "#5c5776"] },
    decor: [
      { k: "tiles", n: 12, c: ["#6c6789", "#77729a", "#635e80"] },
      { k: "rune", n: 14, c: "#c9c0f2" },
      { k: "page", n: 120, c: ["#efe9dc", "#ddd5c4"] },
      { k: "crystal", n: 30, c: ["#a99fe0", "#ddd8f6"] },
    ],
    path: ["#555068", "#77728c"],
  },
  // 750~800 타락한 천궁 — 금 간 대리석과 흩날린 깃털
  fallen: {
    seed: 121, ground: ["#7e7380", "#8f8491", "#6c626e"],
    tex: { k: "grain", c: "#9c919e", n: 800 },
    back: { k: "ruin", c: ["#b5aab6", "#968b98", "#776d7a"], pillar: 1 },
    edge: { k: "rock", c: ["#5f5562", "#7b717e"] },
    decor: [
      { k: "tiles", n: 12, c: ["#8f8591", "#9a909c", "#857b87"] },
      { k: "crack", n: 34, c: "#5e5561" },
      { k: "feather", n: 140, c: ["#f2ede9", "#5a5260", "#d9cfd8"] },
      { k: "rune", n: 8, c: "#f0dcb0" },
      { k: "fog", n: 8, c: "#eee6ef" },
    ],
    path: ["#6c6370", "#918895"],
  },
};
