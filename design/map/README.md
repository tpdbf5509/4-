# 길·관문·상단 UI 원본

사용자가 올려 준 목업 5장입니다. 바꾸지 마세요.

| 시트 | 무엇인가 |
| --- | --- |
| `source-path-tiles.jpg` | 길 타일 7종(곧은 길 긴 것·짧은 것, 굽이, T자, S자, 십자, U자)이 흰 바탕에 모여 있는 시트 |
| `source-gate-front.jpg` | 관문을 정면에서 본 그림 2장(문양만 있는 것 / 문양+진입로가 함께 보이는 것) |
| `source-gate-angles.jpg` | 같은 관문을 왼쪽·뒤·오른쪽에서 본 그림 3장 |
| `source-sound-buttons.jpg` | 소리 켜기/끄기 단추 2장 |
| `source-hud-panel.jpg` | 상단 체력·웨이브 판 목업 1장 |

`cut.py`가 하는 일:

1. **길 타일 7종·관문 5장·소리 단추 2장** — 흰 배경과의 밝기 차이로 마스크를 만들고
   `scipy.ndimage.label`로 서로 떨어진 조각을 찾아 조각마다 바운딩 박스로 자른다.
   무손실이라 픽셀이 원본과 다르지 않다(늘리거나 돌리거나 색을 고치지 않았다). 관문 그림은
   아래쪽에 걸려 있던 글자 알약(설명 라벨)이 원래도 그림과 떨어져 있어 자동으로 함께 빠졌다.
2. **곧은 길 가운데 자르기** (`crop_straight_mid`) — 긴 직선 타일은 양 끝이 통나무 기둥까지 있는
   둥근 마감이라, 구간 길이에 맞춰 그대로 늘리면 길 중간중간이 막다른 길처럼 보인다. 그래서
   양 끝의 마감을 잘라내고 가운데의 곧은 부분만 남긴 `straight-mid.png`를 따로 만들었다 — 실제
   게임 렌더링(`src/game/art.js`의 `paintPathTiles`)은 이 가운데 조각만 구간 길이에 맞춰 늘려 쓴다.

`python3 design/map/cut.py`로 다시 만들 수 있습니다(단, 잘라낼 좌표 일부는 그림마다 눈으로
확인하며 정한 값이라 완전히 새 시트를 넣으면 다시 맞춰야 합니다).

## 실제로 쓴 것과 안 쓴 것

7종 길 타일 중 게임이 실제로 놓는 것은 **곧은 길**(`straight-mid.webp`)과 **굽이**(`corner.webp`)
둘뿐입니다. 이 게임의 길은 네 갈래 모두 직각으로만 꺾이고 갈라지지 않으므로(T자·십자로 갈라지는
자리가 없다) `t-junction`·`s-curve`·`cross`·`u-turn`·`straight-short`는 지금은 화면에 쓰이지
않습니다. 삭제하지 않고 `public/assets/map/tiles/`에 그대로 남겨 두었습니다 — 나중에 길이
갈라지는 구간을 넣거나 장식용으로 쓸 수 있습니다.

관문 5장 중 게임은 방향마다 실제로 그 각도에서 보이는 그림을 씁니다(북 = 정면, 남 = 뒷면,
서 = 왼쪽면, 동 = 오른쪽면 — `src/game/art.js`의 `GATE_DIR`). 정면+진입로가 함께 보이는
`front-path.webp`는 지금은 쓰이지 않는 여분입니다(정면 클로즈업 쪽이 좁은 화면 자리에 더
잘 맞아 그쪽을 골랐습니다).

`source-hud-panel.jpg`에서는 **방패 아이콘 하나만** 오려 썼습니다(`public/assets/ui/shield-icon.webp`).
나머지(체력 "100", "Lv.1", "웨이브 1/15" 등)는 목업에 글자가 그림으로 직접 박혀 있어, 그대로
가져오면 실제 체력·웨이브 숫자가 바뀌는 게임에서 쓸 수 없습니다. 판 자체의 나무 질감·테두리는
기존 `src/ui/style.css`의 `.crest`/`.wave-box` 디자인을 그대로 두었습니다.

## 어디서 쓰는가

| 파일 | 사용처 |
| --- | --- |
| `public/assets/map/tiles/straight-mid.webp`, `corner.webp` | `src/game/art.js`의 `paintPathTiles()` — 각 길의 곧은 구간·굽이 자리에 그린다 |
| `public/assets/map/gates/front.webp` 외 4장 | `src/game/art.js`의 `drawPortal()` — 길 방향에 맞는 한 장을 그대로(돌리지 않고) 그린다 |
| `public/assets/ui/sound-on.webp`, `sound-off.webp` | `src/App.jsx`의 소리 단추(`toggleMute`) |
| `public/assets/ui/shield-icon.webp` | `src/App.jsx`의 `.crest`(성채 체력 판) 아이콘 |
