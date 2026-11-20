/* ── 히든 직업 Necromancer 004 도트 시트 규격(11월 17일) ─────────────
   Gambler 002 와 같은 방식 — 외부 이펙트 라이브러리 없이 design/effects/necromancer/make.py 가 한 칸씩 직접 그린 시트다.
   값은 그 스크립트가 낸 design/effects/necromancer/manifest.json 과 같아야 한다(tools/necro.test.mjs 가 본다). 그리기는 necroArt.js. */
export const NECRO_PX_SRC = "/assets/game/rpg/effects/hidden-jobs/necromancer/px/";

// w · h 한 칸, cols 열 수, n 한 줄 칸 수, cx · cy 그릴 때 (x, y) 에 오는 점(1배 픽셀), loop 반복 시트, rows 색 줄 수, r 그림 속 판정 반지름
export const NECRO_PX = {
  nc_knight: { w: 38, h: 50, cols: 16, n: 16, cx: 18, cy: 45, rows: 3 },   // 그림자 기사형 — 한 줄 16칸: 0~3 걷기 · 4~7 공격 · 8~11 솟아오름 · 12~15 흩어짐(줄 셋 = 연마 색). 검은 몸 · 보라 윤곽 빛 · 번개 줄기 · 빛나는 눈
  nc_assassin: { w: 34, h: 44, cols: 16, n: 16, cx: 16, cy: 39, rows: 3 },   // 그림자 암살형
  nc_archer: { w: 36, h: 50, cols: 16, n: 16, cx: 17, cy: 45, rows: 3 },   // 그림자 사수형
  nc_caster: { w: 36, h: 52, cols: 16, n: 16, cx: 17, cy: 47, rows: 3 },   // 그림자 주술형
  nc_giant: { w: 50, h: 60, cols: 16, n: 16, cx: 24, cy: 55, rows: 3 },   // 그림자 거수형
  nc_orb: { w: 14, h: 14, cols: 6, n: 6, cx: 7, cy: 7, loop: 1 },   // 주술형 그림자의 구체 — 도는 보라 구체
  nc_hit: { w: 40, h: 40, cols: 6, n: 6, cx: 20, cy: 20 },   // 타격 — 섬광 · 사방으로 뻗는 보라 번개 · 검은 조각
  nc_trace: { w: 26, h: 14, cols: 4, n: 4, cx: 13, cy: 7, loop: 1 },   // 추출 가능 흔적 — 땅의 작은 검은 원
  nc_extract: { w: 40, h: 72, cols: 10, n: 10, cx: 20, cy: 66 },   // 흔적 추출 — 0~2 원 · 3~6 그림자 줄기 · 7~9 꺼짐(발밑 기준)
  nc_wisp: { w: 10, h: 10, cols: 4, n: 4, cx: 5, cy: 5, loop: 1 },   // 빨려 드는 영혼 조각
  nc_absorb: { w: 48, h: 24, cols: 5, n: 5, cx: 24, cy: 12 },   // 발밑으로 빨려 드는 고리
  nc_stretch: { w: 120, h: 60, cols: 6, n: 6, cx: 60, cy: 30 },   // 그림자 소환 — 발밑 그림자 다섯이 늘어난다
  nc_slash: { w: 36, h: 30, cols: 5, n: 5, cx: 14, cy: 18 },   // 그림자 근접 베기 — 보라 빛 반달 · 끝 번개
  nc_bolt: { w: 16, h: 6, cols: 2, n: 2, cx: 13, cy: 3, loop: 1 },   // 그림자 화살(오른쪽을 본다)
  nc_pop: { w: 86, h: 70, cols: 6, n: 6, cx: 43, cy: 35, r: 35 },   // 주술형 작은 광역 터짐(그림 속 반지름 r)
  nc_slam: { w: 112, h: 90, cols: 6, n: 6, cx: 56, cy: 45, r: 48 },   // 거수형 내려찍기(그림 속 반지름 r)
  nc_boom: { w: 156, h: 155, cols: 4, n: 8, cx: 78, cy: 93, r: 70 },   // 영혼 소각 폭발(핏빛 중심)
  nc_blast: { w: 216, h: 212, cols: 5, n: 10, cx: 108, cy: 126, r: 100 },   // 무명의 군세 마지막 폭발
  nc_swap: { w: 20, h: 60, cols: 6, n: 6, cx: 10, cy: 56 },   // 그림자 교환 — 검은 세로선 셋(발밑 기준)
  nc_domain: { w: 336, h: 265, cols: 4, n: 8, cx: 168, cy: 132, r: 160 },
  nc_domain_edge: { w: 392, h: 307, cols: 6, n: 12, cx: 196, cy: 153, loop: 1, r: 160 },   // 영역 가장자리 — 원 끝에서 바깥으로 낮게 번지며 일렁이는 그림자(11월 20일 사용자)   // 군주의 영역 — 0~3 펼침 · 4~7 유지(땅 반지름 r, 땅을 가르는 번개 금)
  nc_mark: { w: 28, h: 28, cols: 6, n: 6, cx: 14, cy: 14, loop: 1 },   // 일제 진군 표적
  nc_crack: { w: 30, h: 40, cols: 4, n: 4, cx: 15, cy: 38 },   // 영혼 소각 — 그림자 몸의 붉은 균열
  nc_sigil: { w: 96, h: 72, cols: 8, n: 8, cx: 48, cy: 36 },   // 무명의 군세 — 시전자 뒤 문양(0~5 그려짐 · 6~7 반복)
  nc_wave: { w: 72, h: 84, cols: 6, n: 6, cx: 36, cy: 80 },   // 무명의 군세 파동 앞머리(발밑 기준)
  nc_spike: { w: 12, h: 46, cols: 6, n: 6, cx: 6, cy: 44 },   // 무명의 군세 검은 가시(발밑 기준)
  nc_aura: { w: 48, h: 64, cols: 8, n: 8, cx: 24, cy: 60, loop: 1 },   // 그림자 기운 — 병사 뒤에서 오르는 보라 연기 · 번개 튐(발밑 기준, 반복)
  nc_thunder: { w: 30, h: 140, cols: 7, n: 7, cx: 15, cy: 136 },   // 하늘 번개 — 0~1 줄기 · 2~3 내리침 · 4 땅 섬광 · 5~6 불똥(땅 기준)
  nc_puff: { w: 16, h: 12, cols: 6, n: 6, cx: 8, cy: 6 },   // 걸을 때 끌리는 연기 한 줌
  nc_scythe: { w: 64, h: 62, cols: 2, n: 2, cx: 42, cy: 22, loop: 1 },   // 손에 든 그림자 낫 — 쥔 손 (cx, cy) · 자루가 왼쪽 아래로 내려가 큰 날이 위로 솟는다(11월 19일) · 0 기본 · 1 날에 번개
  nc_reap: { w: 132, h: 122, cols: 7, n: 7, cx: 22, cy: 60, r: 70 },   // 그림자 낫 베기 — 손 (cx, cy) 기준 앞쪽 둘레를 위에서 아래로(그림 속 반지름 r)
  nc_ember: { w: 9, h: 9, cols: 6, n: 6, cx: 4, cy: 4 },   // 알갱이 — 보라 불씨(반짝였다 사그라든다)
  nc_shard: { w: 8, h: 8, cols: 6, n: 6, cx: 4, cy: 4, loop: 1 },   // 알갱이 — 도는 검은 파편
  nc_zap: { w: 12, h: 18, cols: 4, n: 4, cx: 6, cy: 9 },   // 알갱이 — 짧게 번쩍이는 번개 조각
  nc_smoke: { w: 18, h: 16, cols: 8, n: 8, cx: 9, cy: 8 },   // 알갱이 — 말리며 커지는 그림자 연기
  nc_icons: { w: 24, h: 24, cols: 8, n: 8, cx: 0, cy: 0 },   // 스킬 아이콘 8칸 — 그림자 낫 · 흔적 추출 · 그림자 소환 · 그림자 교환 · 군주의 영역 · 일제 진군 · 영혼 소각 · 무명의 군세
};
// 아이콘 칸 차례(nc_icons)
export const NECRO_ICON = { reap: 0, extract: 1, summon: 2, swap: 3, domain: 4, march: 5, burn: 6, legion: 7 };
// 그림자 병사 시트 칸 — 걷기 · 공격 · 솟아오름 · 흩어짐이 4칸씩
export const NC_FRAME = { walk: 0, atk: 4, rise: 8, fade: 12, n: 4 };

/* 군주의 영역 보강 시트(11월 20일 사용자 "pixelfx로 보완해줘") — 위 직접 그린 시트와 따로 둔다.
   pixelfx(MIT)를 검보라 + 빛나는 보라 색으로 뽑았다. 값은 design/effects/pixelfx/necromancer/manifest.json 과 같아야 한다.
   같은 날 "불 같은 건 듬성듬성하고 어울리지 않아 · 새로운 걸" → 검은 불길을 빼고 손 · 룬 원 · 소환 균열을 더했다. 이어 "촉수 빼자" → 촉수도 뺐다. 끝 마감은 pixelfx 가 아니라 make.py 의 nc_domain_edge(누운 그림자)가 맡는다.
   fps 초당 칸, loop 1 이면 반복(0 은 한 번 — 끝나면 자리를 바꿔 다시) */
export const NECRO_PFX = {
  nc_pf_hands: { w: 200, h: 116, cols: 7, n: 47, cx: 100, cy: 100, fps: 15, loop: 0 },    // grasping-hands — 웅덩이에서 움켜쥐는 그림자 팔
  nc_pf_rune: { w: 136, h: 100, cols: 10, n: 60, cx: 68, cy: 80, fps: 15, loop: 1 },      // rune-circle — 시전자 발밑에서 도는 룬 원
  nc_pf_portal: { w: 208, h: 150, cols: 8, n: 58, cx: 104, cy: 122, fps: 15, loop: 0 },   // spawn-portal — 바닥이 찢어져 넋이 솟는 균열
};
// 영역 하나에 까는 것 — pop: [시트, 수](연출 품질 Q 를 곱한다, 엇갈려 나오고 끝나면 자리를 바꾼다) · k 배수 · rune 발밑 룬 원 배수 · a 투명도
export const NC_DOMAIN_PFX = { pop: [["nc_pf_hands", 5], ["nc_pf_portal", 2]], k: 2, rune: 3, a: 0.9 };

/* 보스 그림자 그림(11월 20일 사용자가 직접 그린 그림) — 이 몹들은 코드로 그림자화하지 않고 이 그림을 그대로 쓴다.
   tools/cut-necro-boss.py 가 원본을 boss/<몹 종류>.webp 로 옮긴다(이름 목록이 같아야 한다 — tools/necro.test.mjs).
   값 = 그림자 키(px). 0 이면 다른 큰 몹과 같은 최대 크기(necroArt SIL_MAXH · SIL_MAXW 안). */
export const NC_BOSS_SRC = "/assets/game/rpg/effects/hidden-jobs/necromancer/boss/";
export const NC_BOSS_ART = {
  gramor: 0, argas: 0, morgas: 0, barkanon: 0, serka: 0,
  guild_slime: 0, guild_siren: 0, guild_phoenix: 0,
  tg_fire: 0, tg_frost: 0, tg_bolt: 0, tg_poison: 0, tg_corrode: 0, tg_gravity: 0,
  world_dragon: 0, world_serpent: 0, world_machine: 0, world_thunderbird: 0, world_void: 0,
};

/* 보스 그림자 휘두르기(11월 20일 사용자 "무기를 든 그림자는 무기를 분리해서 휘두르는 모습 · 팔도 관절로") —
   tools/cut-necro-arm.py 가 boss/<종류>-body.webp(팔 · 무기를 뺀 몸) 와 -arm<i>.webp(팔 + 무기) 로 나눈다.
   [px, py] 어깨 관절(boss webp 픽셀 좌표) · d 휘두르는 방향(1 = 무기 끝이 시계 방향으로 들렸다가 내려벤다, -1 = 반대). 공격할 때만 돈다 */
export const NC_BOSS_ARM = {
  barkanon: [[240, 118, 1]],
  serka: [[175, 95, 1], [270, 125, -1]],
  morgas: [[222, 125, 1]],
  tg_fire: [[312, 100, -1]],
  tg_corrode: [[132, 115, -1]],
  tg_frost: [[270, 128, -1]],
  guild_siren: [[145, 100, 1]],   // 뒤집어 그리는 보스(NC_BOSS_MIRROR)는 d 도 뒤집힌다 — 세운 삼지창은 뒤로 들었다 앞으로 찌르게 1
};
// 무기가 그림 왼쪽에 있는 보스 — 게임 몹은 오른쪽(적 쪽)을 보므로 좌우를 뒤집어 그린다(11월 20일 사용자 "적 반대 방향으로 휘두른다")
export const NC_BOSS_MIRROR = { barkanon: 1, morgas: 1, guild_siren: 1 };
// 휘두르기 각도(라디안) — 공격 0~lift 들어 올림 → ~cut 내려벰(든 자세를 지나 down 만큼 더) → 끝까지 제자리로
export const NC_BOSS_SWING = { up: 0.9, down: 0.35, lift: 0.3, cut: 0.55 };
