# Game Assets — 「네 갈래 방어선」

이 문서는 게임이 실제로 화면에 그리는 이미지가 어디에 있고, 어느 코드가 그것을 불러오는지 정리한 목록입니다.
디자인을 바꾸는 문서가 아니라, "이 그림을 바꾸고 싶으면 어디를 손대야 하는가"를 바로 찾기 위한 지도입니다.

## 읽기 전에 — 이 프로젝트의 특징 두 가지

1. **런타임 그림은 `src/assets/`가 아니라 `public/assets/`에 있습니다.**
   Vite에서 `src/`의 파일은 import로만 쓸 수 있고, `<img src="...">`나 `new Image().src`처럼
   **문자열 경로로 불러오는 그림은 `public/`에 있어야** 그 경로 그대로 서비스됩니다.
   이 프로젝트는 코드 전체가 `/assets/...` 절대경로로 그림을 부르므로, 이번 정리도 `public/assets/`
   안에서 폴더만 체계적으로 다시 짰습니다(요청하신 예시 구조의 정신은 그대로 따르되, 실제로 깨지지
   않는 자리에 두었습니다).
2. **타워·돌판·길·배경·UI 버튼/패널·능력 아이콘 대부분은 이미지 파일이 아니라 코드로 직접 그립니다.**
   `src/game/art.js`가 캔버스에 도형을 그리고(절차적 렌더링), `src/ui/icons.jsx`가 아이콘을
   인라인 SVG 컴포넌트로 갖고 있습니다. 다만 **관문·소리 단추·성채 체력 아이콘**은 예외로,
   아래 Map·UI 항목에 적은 그림 파일을 씁니다(그림이 아직 안 왔거나 못 불러오면 예전 절차적
   그리기로 자동으로 되돌아갑니다). 길은 그림 타일을 붙여 본 적이 있지만 구간 이음매가 고르지
   못해 다시 절차적 그리기로 되돌렸습니다(아래 "이미지가 없는 항목" 참고).

---

## 폴더 구조

```
public/
├── favicon.svg
└── assets/
    ├── characters/
    │   ├── players/
    │   │   └── <병과id>/
    │   │       ├── portrait.webp   ← 대기실 카드·사이드바에 쓰는 큰 그림
    │   │       └── arena.webp      ← 보스 결전장에 서는 작은 그림
    │   ├── enemies/                ← 길을 걸어오는 일반 적 3종
    │   └── bosses/                 ← 보스 결전장의 보스 2종
    ├── effects/
    │   └── <병과id 또는 보스id>/   ← 공격·스킬 이펙트 (13개 폴더)
    ├── map/
    │   └── gates/                  ← 관문을 4방향에서 본 그림
    ├── ui/                         ← 소리 단추·성채 체력 아이콘
    └── unused/
        └── effects/                ← 코드에서 지금 쓰지 않는 이펙트 낱장

design/                              ← 원본 디자인 시트 + 잘라내는 파이썬 스크립트 (게임이 직접 불러오지 않음)
├── characters/
├── enemies/
├── effects/
└── map/
```

`towers/` 폴더는 만들지 않았습니다 — 타워 자체는 여전히 그림 없이 절차적으로 그립니다.
아래 "이미지가 없는 항목" 참고.

---

## Characters

### Players — `public/assets/characters/players/<id>/`

11개 병과 모두 `portrait.webp`(대기실 카드·사이드바용 큰 그림)와 `arena.webp`(보스 결전장용 작은 그림)
두 장씩을 갖습니다.

| 병과id | 이름 | portrait 사용처 | arena 사용처 |
| --- | --- | --- | --- |
| archer | 궁수탑 | `src/ui/chars.jsx`의 `<TowerChar>` (대기실 좌석 카드, 사이드바 병과 카드) | `src/game/art.js`의 `classArt()` (보스 결전장에 선 모습) |
| sniper | 저격탑 | 〃 | 〃 |
| cannon | 대포탑 | 〃 | 〃 |
| bolt | 번개탑 | 〃 | 〃 |
| flame | 화염탑 | 〃 | 〃 |
| poison | 독탑 | 〃 | 〃 |
| frost | 서리탑 | 〃 | 〃 |
| gravity | 중력탑 | 〃 | 〃 |
| supply | 보급소 | 〃 | 〃 |
| corrode | 부식탑 | 〃 | 〃 |
| paladin | 성기사탑 | 〃 | 〃 |

- 코드에서 참조하는 곳: `src/ui/chars.jsx`의 `TOWER_CHARACTERS`(경로 11줄), `src/game/art.js`의
  `classArt()`(경로를 `/assets/characters/players/${id}/arena.webp`로 조립).
- 새 병과를 추가할 때는 `design/characters/README.md`의 안내를 따르면 됩니다.

### Enemies — `public/assets/characters/enemies/`

관문에서 나와 길을 걸어오는 일반 적 3종입니다.

| 파일 | 적 이름 | 화면 높이 |
| --- | --- | --- |
| grunt.webp | 오크 보병 | 31 |
| rusher.webp | 고블린 척후 | 28 |
| armor.webp | 중장갑 트롤 | 33 |

- 사용처: `src/game/art.js`의 `ENEMY_ART`, `enemySprite()`.

### Bosses — `public/assets/characters/bosses/`

보스 결전장(보스전)에 등장하는 보스 2종입니다. 같은 그림이 `ENEMY_ART`에도 등록되어 있어
이론상 일반 웨이브에도 쓰일 수 있지만, 실제로는 보스 웨이브가 결전장으로 곧장 이어지므로
**거의 항상 결전장의 큰 보스 그림으로만** 쓰입니다.

| 파일 | 보스 이름 | 등장 |
| --- | --- | --- |
| boss.webp | 오우거 지휘관 | 1차 결전 |
| titan.webp | 대군주 | 2차 결전(최종 웨이브) |

- 사용처: `src/game/art.js`의 `ENEMY_ART`(같은 그림을 보스 결전장 그리기 코드가 확대해서 그립니다).

---

## Map — `public/assets/map/`

관문(적 출현구)에 얹는 그림입니다. 그림이 아직 로딩 중이거나 못 불러왔으면 예전처럼 캔버스에
절차적으로 그린 돌 아치가 그대로 남습니다 — 그래서 이 그림들은 "없으면 깨지는" 게 아니라
"있으면 입혀지는" 덧그림입니다. (길 타일 그림도 한 번 적용해 봤지만 구간 이음매가 고르지
못해 절차적 그리기로 되돌렸습니다 — 아래 "이미지가 없는 항목"과 `design/map/README.md` 참고.)

### gates — `public/assets/map/gates/`

| 파일 | 실제로 쓰는가 | 어느 방향 |
| --- | --- | --- |
| `front.webp` | ✅ | 북쪽 관문(정면에서 보이는 방향) |
| `back.webp` | ✅ | 남쪽 관문(뒤에서 보이는 방향) |
| `left.webp` | ✅ | 서쪽 관문(왼쪽 옆면이 보이는 방향) |
| `right.webp` | ✅ | 동쪽 관문(오른쪽 옆면이 보이는 방향) |
| `front-path.webp` | — | 정면+진입로가 함께 보이는 여분(좁은 화면 자리엔 정면 클로즈업 쪽이 더 잘 맞아 안 씀) |

- 사용처: `src/game/art.js`의 `drawPortal()`, `GATE_DIR`(길 이름 → 그림 이름). 각도가 이미 그림에
  박혀 있는 그림이라 돌리지 않고 그대로 그립니다.

---

## UI — `public/assets/ui/`

| 파일 | 사용처 |
| --- | --- |
| `sound-on.webp`, `sound-off.webp` | `src/App.jsx`의 소리 단추(`toggleMute`) — 기존 이모지(🔊/🔇) 대신 씁니다 |
| `shield-icon.webp` | `src/App.jsx`의 `.crest`(성채 체력 판) 아이콘 — `src/ui/icons.jsx`의 `Shield` SVG 대신 씁니다 |

나머지 UI 아이콘(`Coin`, `HomeIcon`, `ClassIcon`, `PerkIcon`)은 여전히 `src/ui/icons.jsx`의
인라인 SVG이고, 판/단추의 나무 질감·테두리도 여전히 `src/ui/style.css`의 CSS 디자인입니다.

---

## Effects — `public/assets/effects/<병과id 또는 보스id>/`

공격·스킬·보스 기술의 시각 효과 조각 그림입니다. 13개 폴더에 총 80장이 있고, 어느 폴더에
무엇이 있는지는 `src/game/art.js`의 `FX_ART` 표(파일 경로와 정확히 같은 이름의 키)에서
한눈에 볼 수 있습니다.

| 폴더 | 무엇의 이펙트인가 |
| --- | --- |
| archer/ | 궁수탑 평타·집중 사격 (5장) |
| sniper/ | 저격탑 평타·결정타 (4장) |
| cannon/ | 대포탑 평타·융단 폭격 (6장) |
| bolt/ | 번개탑 평타·뇌우 (6장) |
| flame/ | 화염탑 평타·화염 폭풍 (6장) |
| poison/ | 독탑 평타·역병 (7장) |
| frost/ | 서리탑 평타·한파 (5장) |
| gravity/ | 중력탑 평타·블랙홀 (5장) |
| supply/ | 보급소 지원·긴급 보급 (7장) |
| corrode/ | 부식탑 평타·산성비 (5장) |
| paladin/ | 성기사탑 평타·성역 (6장) |
| boss/ | 1차 보스(오우거 지휘관)의 여덟 기술 (8장) |
| titan/ | 2차 보스(대군주)의 열두 기술 (12장) |

- 사용처: `src/game/art.js`의 `FX_ART`(그림마다 얹을 위치 `ax`·`ay`·배율 `k` 지정), `fxSprite()`.
- 어느 기술에 어느 그림을 쓰는지는 `src/game/world.js`의 `ARENA_BOSS.boss.art` / `ARENA_BOSS.titan.art`에
  적혀 있습니다.

---

## 이미지가 없는 항목 (확인 결과)

요청하신 항목 중 아래는 이미지 파일이 **존재하지 않습니다.** 임의로 만들지 않았습니다.

| 항목 | 실제 구현 방식 |
| --- | --- |
| 돌판 / 건설 지점 | `src/game/art.js`의 `drawPad()`가 캔버스에 타원·점선으로 직접 그립니다. 자리 성격(공격/제어/지원)별 색만 `world.js`의 `SPOTS`에서 가져옵니다. |
| 타워 그림 | 타워 자체는 그림 없이 `drawPad()`의 연장선에서 절차적으로 표현됩니다(공격 시 이펙트만 위의 effects/ 그림을 씁니다). |
| 게임 배경(잔디·나무·길) | `src/game/art.js`의 `paintTerrain()`이 캔버스에 잔디 그라데이션·풀 얼룩·나무·흙길을 절차적으로(시드 난수) 그립니다. 관문만 위 Map 항목의 그림을 그 위에 덧그립니다. |
| 성채 | `src/game/art.js`의 `drawCastle()`이 절차적으로 그립니다(위 Map의 관문과는 다른, 지도 한가운데의 성채입니다). |
| UI 아이콘(방패·소리 제외) | 이미지가 아니라 `src/ui/icons.jsx`의 인라인 SVG 컴포넌트입니다(`Coin`, `HomeIcon`, `ClassIcon`, `PerkIcon`). |
| UI 버튼 / 패널 | `src/ui/style.css`의 그라데이션·테두리·그림자로 그린 CSS 디자인입니다. 소리 단추만 배경을 없애고 위 UI 그림을 그대로 보입니다. |

---

## Misc

| 파일 | 용도 |
| --- | --- |
| `public/favicon.svg` | 브라우저 탭 아이콘. `index.html`의 `<link rel="icon">`이 참조합니다. 관례상 `public/` 루트에 그대로 두었습니다. |

---

## Unused — `public/assets/unused/effects/`

`design/effects/`의 시트에서 함께 잘라낸 낱개 그림이지만, 현재 `FX_ART`(`src/game/art.js`)에
등록되어 있지 않아 게임에서 실제로 쓰이지 않는 9장입니다. 삭제하지 않고 따로 모아 두었습니다.

| 파일 | 비고 |
| --- | --- |
| `unused/effects/boss/rock.webp` | 낱개 돌 조각 (오우거 지휘관 시트) |
| `unused/effects/boss/slash.webp` | 낱개 베인 자국 |
| `unused/effects/boss/smoke.webp` | 낱개 연기 |
| `unused/effects/boss/spark.webp` | 낱개 충격 자국 |
| `unused/effects/boss/stomp.webp` | 발구르기 원본(세 곳 중 하나만 자른 `stomp1.webp`이 실제로 쓰입니다) |
| `unused/effects/titan/hail.webp` | 쏟아지기 원본(낱개만 자른 `hail1.webp`이 실제로 쓰입니다) |
| `unused/effects/titan/rock.webp` | 낱개 돌·연기 |
| `unused/effects/titan/spark.webp` | 낱개 충격 자국 |
| `unused/effects/titan/track.webp` | 추적 낙석 원본(낱개만 자른 `track1.webp`이 실제로 쓰입니다) |

---

## 참고 — Design pipeline (게임이 직접 불러오지 않는 원본 자료)

`design/` 폴더에는 위 그림들을 잘라낸 원본 디자인 시트와 파이썬 스크립트가 있습니다.
게임 코드는 이 폴더를 전혀 참조하지 않지만, 그림을 다시 뽑거나 새로 추가할 때는 여기서 시작합니다.

| 폴더 | 내용 |
| --- | --- |
| `design/characters/` | 병과 캐릭터 원본 시트, `chibi.py`(인게임 자세 오려내기) · `recolor.py`(색 바꾸기 참고 코드) · `trio_cut.py`(보급소·성기사탑·번개탑 3인 시트 자르기) |
| `design/enemies/` | 적 5종 원본 시트(`enemy-sheet.webp`) |
| `design/effects/` | 이펙트 원본 시트 6장, `cut.py`(시트에서 이펙트 낱장을 잘라 `public/assets/effects/`로 저장) |
| `design/map/` | 관문·소리 단추·성채 체력 아이콘의 원본 목업 4장, `cut.py`(연결 성분으로 낱장을 잘라 `public/assets/map/`·`public/assets/ui/`로 저장). 길 타일 원본은 시도 후 되돌려 더 이상 없습니다 — `design/map/README.md` 참고 |

각 폴더의 `README.md`에 어떤 방식으로 배경을 지우고 캐릭터만 남겼는지 자세히 적혀 있습니다.
