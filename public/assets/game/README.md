# 게임 그림 파일

방어전과 RPG 모드의 배경 · 탑 · 돌판 · 성채 · 광장 · 사냥터 소품이 여기 있습니다.
게임은 이 파일을 그대로 불러 그립니다. **파일 이름은 그대로 두고 그림만 바꿔 끼우면** 게임 그림이 바뀝니다.
파일을 못 불러오면(없거나 이름이 다르면) 예전처럼 코드로 그린 그림이 대신 나옵니다.

## 바꿀 때 지킬 것

- 이름과 폴더를 그대로 둡니다. 형식은 WebP(투명 배경 지원)입니다. PNG로 바꾸려면 코드의 `.webp` 이름도 함께 바꿔야 합니다.
- **가로세로 비율**을 아래 표와 같게 합니다. 그림이 몇 픽셀이든 표의 크기(논리 좌표)에 맞춰 늘려 그립니다.
  선명하게 하려면 표 크기의 2배 이상으로 만드세요. (지금 파일은 표 크기의 2배입니다. RPG 맵 바탕만 1배입니다.)
  움직이는 그림은 아래 "움직이는 그림" 을 따로 읽어 주세요.
- **기준점**(●)에 그림의 해당 자리가 오게 그립니다. 예를 들어 탑은 발밑 가운데가 기준점입니다.
  표의 `ox, oy` 는 그림 왼쪽 위에서 기준점까지의 거리입니다.
- 바탕이 투명해야 하는 그림은 투명 배경으로 저장하세요(배경 파일 제외).

## 방어전 `defense/`

| 파일 | 논리 크기 | 기준점 (ox, oy) | 설명 |
|---|---|---|---|
| `bg.webp` | 1160 × 760 | 왼쪽 위 | 판 전체 바탕(풀밭 · 네 갈래 길 · 숲 · 바위). 배경이라 투명이 필요 없습니다 |
| `arena-bg.webp` | 1160 × 760 | 왼쪽 위 | 보스 결전장 바탕. 둘러선 숲은 빠져 있고, `rpg/tree-*` 나무 그림을 코드가 살랑이게 얹습니다 |
| `pads/<자리>-empty.webp` | 64 × 46 | 돌판 가운데 (32, 24) | 비어 있는 돌판. 자리: `key` 핵심 · `focus` 집중 · `long` 장거리 · `risk` 위험 |
| `pads/<자리>-built.webp` | 64 × 46 | (32, 24) | 탑이 선 돌판 |
| `towers/<종류>-<1~4>.webp` | 100 × 132 | 탑이 서는 자리 (50, 106) | 탑 몸통. 받침과 깃대까지 그립니다. **움직이는 그림(시트)** |
| `towers/<종류>-<1~4>-turret.webp` | 100 × 60 | 부품이 도는 축 (30, 30) | **궁수 · 저격 · 대포**만. 표적을 향해 도는 활 · 총 · 포신. 오른쪽(→)을 향한 모습으로 그립니다 |
| `castle/tier-<1~4>.webp` | 150 × 172 | 성채 가운데 (75, 108) | 성채 몸통과 대포 받침. 성채 단계별. **움직이는 그림(시트)** |
| `castle/gun-barrel.webp` | 100 × 60 | 대포가 도는 축 (50, 30) | 성채 대포의 포신. 오른쪽(→)을 향한 모습 |

탑 종류: `archer` 궁수 · `sniper` 저격 · `cannon` 대포 · `bolt` 번개 · `flame` 화염 · `poison` 독 · `frost` 서리 · `gravity` 중력 · `supply` 보급소 · `corrode` 부식 · `paladin` 성기사

> 조준 부품이 있는 탑(궁수 · 저격 · 대포)은 **몸통 그림에 그 부품을 넣지 마세요.** 부품은 `-turret` 파일이 따로 맡아 돌아갑니다.

코드가 그대로 그리는 것(그림 파일이 아님): 돌판 번호와 마우스 올렸을 때 테두리, 탑 단계 별 표시, 보급소가 밀어 주는 표시, 성채 체력 띠 · 금 간 자국 · 연기, 발사 섬광.

## RPG `rpg/`

| 파일 | 논리 크기 | 기준점 (ox, oy) | 설명 |
|---|---|---|---|
| `plaza.webp` | 1800 × 1200 | 왼쪽 위 | 광장 바탕 |
| `field.webp` | 2600 × 1700 | 왼쪽 위 | 사냥터 바탕 |
| `fountain.webp` | 220 × 185 | 분수 가운데 (110, 95) | 광장 분수. 기준점이 (900, 620) 에 옵니다. **움직이는 그림(시트)** |
| `goddess.webp` | 891 × 600 | 발밑 가운데 | 길드 광장 여신 조각상(날개 단 여신 · 검 · 방패). 맵에서 높이 300 으로 그립니다(`GUILD_STATUE_ART`). 못 불러오면 코드 그림 |
| `lamp.webp` | 64 × 120 | 가로등 발밑 (32, 108) | 광장 가로등 |
| `bench.webp` | 96 × 44 | 벤치 아래 가운데 (48, 30) | 광장 벤치 |
| `market-board.webp` | 128 × 128 | 기둥 발밑 가운데 (64, 124) | 광장 장터 게시판(쪽지를 붙인 나무 게시판, 투명 배경). 기준점이 (980, 900) 에 옵니다. 머리 위 "장터" 글자는 코드가 얹습니다. 못 불러오면 코드 그림 |
| `gate.webp` | 130 × 190 | 문이 서는 자리 (65, 138) | 사냥문 · 광장문. 팻말 글자는 코드가 얹습니다. **움직이는 그림(시트)** |
| `hunter.webp` | 84 × 100 | 발밑 (42, 80) | 사냥꾼. 머리 위 `!` 와 이름표는 코드가 얹습니다 |
| `rabbit.webp` | 64 × 56 | 발밑 (32, 46) | 토끼. **오른쪽**을 본 모습(왼쪽으로 갈 땐 뒤집어 그립니다) |
| `rabbit-frozen.webp` | 64 × 56 | (32, 46) | 얼어붙은 토끼 |
| `tree-0~2.webp` | 100 × 76 | 나뭇등걸 (50, 58) | 소나무 3종. 사냥터와 결전장에서 함께 씁니다 |
| `tree-3~5.webp` | 100 × 76 | (50, 58) | 둥근 나무 3종 |
| `weapons/<id>.webp` | 64 × 64 | 가운데 | 특별 무기 그림(상점 · 가방 창). 칼끝이 오른쪽 위를 향한 모습. id 는 `shopData.js` 의 `SPECIALS[].art` — `clockwork` 태엽검 · `forest` 숲의 검 · `coral` 산호검 · `viper` 독사 단검 · `thunder` 번개검 · `frost` 서리검 · `flame` 화염검 · `star` 별의 검 · `shadow` 암흑검 · `holy` 신성검, 지팡이 `moon_staff` · `ice_staff` · `skull_staff` · `flame_staff` · `thunder_staff` · `galaxy_staff` · `holy_staff` · `fury_staff`(적룡 지팡이 128×128, 세로로 선 모습), 활 `thunder_bow` · `lava_bow` · `shadow_bow` · `star_bow` · `gold_bow`(원본은 `design/weapons/`, 바탕 지우기는 `tools/cut-weapons.py`). 못 불러오면 그림 없이 이름만 보입니다 |
| `armor/<부위>-<등급>.webp` | 128 × 128 | 가운데 | 방어구 그림(가방 · 상점 창). 부위 `head` 투구 · `body` 갑옷 · `legs` 바지 · `feet` 신발, 등급 `0` 초급 · `1` 희귀 · `2` 영웅 · `3` 전설. 원본은 `design/armor/`, 자르기는 `tools/cut-armor.py` |
| `boss/<보스>-<자세>.webp` | 원본 크기(그라모르 약 100px, 나머지는 줄여 180~250px) | 발밑 가운데 | 던전 보스 `gramor` · `argas` · `morgas` · `barkanon` · `serka`. 그라모르는 `idle` · `move` · `attack` · `hurt` · `dead` · `slam` · `charge`, 나머지는 `idle`(또는 `idle0~3`) · `walk0~3`. 아르가스는 bosses-3 가운데 줄의 방패 기사다. 보스마다 같은 배율로 그린다(`rpgArt.js` `BOSS_ART`). 원본은 `design/bosses/` · `design/armor/boss-morgas.jpg` · `bosses-3.jpg`, 자르기는 `tools/cut-bosses.py` |

## 예전 코드 그림으로 다시 뽑기

코드가 그리는 그림을 다시 파일로 뽑으려면(예: 코드 그림을 고친 뒤):

```
npm run dev
node tools/export-art.mjs                # tools/out 에 PNG 와 report.json 을 뽑는다 (Playwright 필요)
python3 tools/png-to-webp.py             # public/assets/game 에 WebP 와 manifest.json 을 옮긴다 (Pillow 필요)
```

> 주의: 이렇게 뽑으면 **지금 들어 있는 그림 파일을 덮어씁니다.** 직접 만든 그림이 있다면 먼저 복사해 두세요.

## 움직이는 그림

깃발 흔들림 · 분수 물결 · 4단계 탑의 반짝임 · 문 안쪽 소용돌이처럼 저절로 움직이는 그림은 **시트** 한 장에 담겨 있습니다.

- 시트는 한 바퀴(4.5초)를 **36장**으로 나눈 프레임을 가로 **6칸**씩 줄지어 이어 붙인 그림입니다. 프레임 하나의 크기는 위 표와 같습니다(파일 크기는 가로 6배, 세로 6배).
- 어떤 파일이 시트인지는 `manifest.json` 의 `sheets` 에 `이름: { n: 프레임 수, cols: 칸 수 }` 로 적혀 있습니다. 적히지 않은 파일은 정지 그림 한 장입니다.
- 프레임은 왼쪽 위부터 가로로 차례로 읽고, 마지막 프레임 다음에 첫 프레임이 이어지게 그립니다.
- 표적을 향해 도는 것(활 · 총 · 포신 · 성채 대포)과 쏠 때 뒤로 밀리는 것은 시트가 아니라 코드가 돌립니다.
- 움직임이 없는 탑(예: 1단계 궁수탑 몸통)은 정지 그림 한 장입니다.

정지 그림으로 바꾸고 싶으면 그 파일을 한 프레임 크기의 그림으로 바꾸고 `manifest.json` 에서 이름을 지우세요.

### 거래 물품 아이콘

`rpg/items/trade-icons.webp`는 내장 이미지 생성 도구로 만든 1254×1254 투명 그림입니다. 6열×6행이며 칸당 209×209입니다. 주문서·물약·재료·기본 무기 아이콘이 들어 있습니다. 각 칸 연결표는 `src/TradePanel.jsx`의 `ITEM_ART` · `WEAPON_ART`입니다. 글자와 수량은 그림에 넣지 않고 화면에서 표시합니다.

월드보스 장비: `rpg/items/world-equipment.webp` — 투명 1916×1095, 7열×4행(11월 1일 4행 추가). 행은 드래곤·거대 뱀·고대 번개 기계·뇌조(4행은 3~6열 방어구 네 칸만 — Codex 생성, 원본 `design/world/thunderbird-armor-src.webp`). 열은 전사 무기·지팡이·활·투구·갑옷·바지·신발. 원본/생성 기록은 `docs/월드보스-장비-이미지-생성.md`. 인벤토리와 손에 든 무기가 같은 시트 칸을 사용한다.
입은 방어구 겉모습: `rpg/wear/<세트>.webp` — 투명 1536×1536, 4열(앞 · 옆 · 뒤 · 돌아섬) × 3행(투구 · 갑옷 · 신발), 칸 384×512. 세트는 `legend`(세트 없는 전설) · `dragon` · `serpent` · `machine` · `thunderbird`(`wearData.js WEAR_SETS`). 표준 몸(검사 남 네 방향, `design/wear/base-body.webp`)에 맞춰 Codex 로 뽑은 겹침 그림이고, `wearArt.js` 가 몸 높이에 맞춰 늘려 발밑 가운데로 겹친다. 원본 `design/wear/<세트>-<부위>-src.webp`.
공허의 관측자(11월 5일, Codex 정식 그림 · 원본 `design/void/`): `rpg/boss/void-observer.webp`(1024×512, 2열×1행, 발 .84) · 장비 시트 5행(1916×1369) · `rpg/wear/void.webp`. 정식 규격은 `docs/공허의-관측자-그림-규격.md`.

용아쌍검 손에 든 그림: `rpg/items/dragon-dual-held.webp` — 투명 1774×887, 2열×1행. 왼쪽 장검, 오른쪽 단검. `rpgArt.js`가 각 칸을 128px 기준으로 캐시하고 성별·방향별 양손 좌표에 따로 그린다. 가방·거래의 기존 쌍검 아이콘은 유지한다.

크림슨 레퀴엠 아이콘: `rpg/weapons/blood_gun.webp` 128×128 투명 WebP(총구가 오른쪽 위, 원본 `design/weapons/blood_gun-src.webp` · `blood_gun.webp`). 전용 스킬 혈계 추격은 그림 파일 없이 코드 도트(`bloodGunArt.js`)로 그립니다.

적룡 지팡이 용의 격노 그림: `rpg/effects/fury-fx.webp` — 검은 바탕 1024×512, 4열×2행, 칸당 256×256(Codex 생성, 원본 `design/weapons/fury-fx.webp`). 칸은 바닥 마법진 · 초승달(오른쪽으로 볼록) · 십자 섬광 · 불똥 · 화염구 · 광선(오른쪽으로) · 연기 고리 · X 표식. 빛을 더하듯(lighter) 그린다. 단계 시각과 크기는 `skillData.js` `FURY_ART`, 그리기는 `furyArt.js`. 못 불러오면 코드 빛으로 대신한다.

비룡육연사 비행 그림: `rpg/effects/dragon-flight.webp` — 투명 1536×1024, 3열×2행, 칸당512×512. 왼쪽 위부터 날개 위·내리는 중·수평·아래·돌아오는 중·올리는 중의 6프레임이다. 붉은 비늘과 금빛 뿔의 용이 오른쪽을 향한다. `worldEquipmentData.js`의 `DRAGON_FLIGHT_ART`가 각 프레임의 주둥이 기준점과 표시 크기230을 정의한다. `dragonFlightArt.js`가 발사 방향으로 돌려 그린다. RPG 진입 때 미리 읽고 실패하면 코드로 그린 용으로 대신한다.

스킬 상점 스킬 연출: `rpg/effects/skill-px/*.webp` — pixelfx(MIT, github.com/patch-gg/pixelfx 커밋 a841596)로 뽑은 투명 픽셀 시트 30장(암흑검 종말의 연격 `sh_cut1` · `sh_cut2` · `sh_slam` 포함 — melee/sword-slash · melee/heavy-cleave 를 라벤더 · 먼지 장미빛으로 뽑고 내려치기 먼지는 `shadow-sword/lighten.py` 로 밝혔다, 뽑는 법은 `design/effects/pixelfx/shadow-sword/make.mjs`). 강타 · 대지 가르기는 밝은 풀밭에서 먼지가 검댕처럼 보여 `lighten.py` 로 흙빛으로 밝혔다. 1배 픽셀 그대로 두고 그릴 때 키운다(흐림 없음). 칸 크기 · 열 수 · 칸 수 · 기준점(대부분 발밑)은 `skillPxData.js` `SKILL_PX_SHEETS`, 그리기는 `skillPxArt.js`. 처음 쓸 때 한 장씩 불러오고 못 불러오면 얇은 고리 · 선으로 대신한다. 뽑는 법과 색은 `design/effects/pixelfx/skill-shop/make.mjs`.

| 파일 | 스킬 | pixelfx 이펙트 |
|---|---|---|
| smash | 강타 | melee/hammer-smash |
| burst | 마력 폭발 | arcane/mana-burst |
| pierce | 급소 찌르기 | impacts/crit-hit |
| aid | 응급 처치 | nature/healing-bloom |
| rush · spin | 돌진 베기 | melee/thrust · melee/spin-slash |
| dash | 대쉬(모든 직업) | melee/thrust(푸른 잿빛) |
| cleave | 대지 가르기 | nature/quake |
| iron | 철벽 | holy/divine-shield(반복) |
| arrow · spark | 관통 화살 · 연사 | projectiles/arrow(반복) · impacts/hit-spark |
| arrow_ice · spark_ice | 후퇴 사격 | projectiles/arrow · impacts/hit-spark(서리빛) |
| orb_<원소> · boom_<원소> | 원소 구체 | projectiles/plasma-shot(반복) · explosions/plasma-explosion(원소 여섯 색) |
| chain | 연쇄 번개 | lightning/zap-hit(노란빛) |
| circle | 강화 마법진 | arcane/magic-circle-cast |

월드보스 연출: `rpg/effects/world-boss/*.webp` — pixelfx(MIT, 커밋 a841596)로 뽑은 투명 픽셀 시트 15장(즉사 기술 `doom_*` 5장 — shadow/hex-sigil · explosions/nuke · nature/poison-cloud · scifi/emp-blast · explosions/plasma-explosion). 1배 픽셀 그대로 두고 그릴 때 키운다(흐림 없음). 칸 크기 · 열 수 · 칸 수 · 기준점(발밑) · 경고/맞는 순간 칸 구간은 `worldBossPxData.js` `WB_PX_SHEETS`, 그리기는 `worldBossPxArt.js`. 못 불러오면 `worldBossArt.js` 의 예전 코드 그림으로 그린다. 뽑는 법과 색은 `design/effects/pixelfx/world-boss/make.mjs`, 낙뢰 · 독 시트의 그늘 · 검은 자국 손질은 같은 폴더 `post.py`.

| 파일 | 쓰는 곳 | pixelfx 이펙트 |
|---|---|---|
| breath | 드래곤 숨결 · 화염폭풍 부채꼴 | fire/fire-breath(반복) |
| meteor | 드래곤 운석 — 0~7칸 경고 중 떨어짐, 8~21칸 맞는 순간 | fire/meteor |
| acid · puddle | 뱀 독 튀김 · 남는 독 웅덩이 | nature/acid-splash · nature/toxic-puddle(반복) |
| strike_m · strike_t | 기계 · 뇌조 낙뢰 — 0~7칸 경고 중 바닥 문양, 8~19칸 맞는 순간 | lightning/lightning-strike(푸른 잿빛 · 연보라) |
| feather | 뇌조 전격 깃털 | holy/feather-burst |
| break · stun | 합동 공격 성공 · 기절 별 | holy/smite · status/stunned(캐릭터 없이) |
| fall | 토벌 빛기둥 | holy/holy-pillar |

월드보스: `rpg/boss/world-bosses.webp` — 투명1536×1024, 3열×2행, 칸당512×512. 열은 드래곤·거대 뱀·고대 번개 기계, 행은 기본·공격 준비다. 그림 사이 여백을 넓혀 날개와 꼬리가 옆 보스에 섞이지 않게 했다. `worldBossData.js`의 `artSize`와 프레임별 `artFeet`가 표시 크기와 발밑 기준점을 정의한다. `worldBossArt.js`가 그림과 위험지역을 그린다. 로딩 실패 시 전용 코드 그림을 사용한다.

## 길드 성전·토벌 그림 (2026년10월23일)

`src/game/guildArt.js`가 광장 여신 조각상은 코드로 그리고 강화된 슬라임·바다세이렌·불사조는 WebP 그림을 우선 불러옵니다. 패널의 작은 그림도 같은 함수를 씁니다. 기준점은 발밑 가운데입니다. 토벌 전용 효과는 `sk_guild_hit`이며 기존 캐릭터 스킬 효과를 호출하지 않습니다. `combatFx.js`의 저수준 광원·입자만 공유합니다. 보스는 아래 새 WebP를 우선 사용하며 코드 그림은 로드 실패 시 대체 그림입니다.

### 길드 보스 도트 아틀라스

- 경로: `rpg/boss/guild-bosses.webp` · 투명1536×1024 · 3열×2행.
- 열: 강화된 슬라임 / 바다세이렌 / 불사조. 행: 준비 / 공격.
- 표시 크기360, 발 기준점은 `src/game/guildData.js`의 `GUILD_BOSS_ART.feet`에 정의합니다.
- 전투와 길드 선택 화면이 같은 `drawGuildBoss`를 사용합니다. 공격 중에는 아래 행을 선택합니다. 파일이 없으면 코드 그림을 씁니다.
- 내장 이미지 도구에 “2D 도트형 RPG 게임”을 명시해 원본과 투명 배경 보정본을 생성했습니다. 생성 PNG는 작업 공간 `generated_images/exec-0129ea1a-418a-4d45-9b6e-895469de02d6.png`, 게임에는 WebP로 변환해 넣었습니다.

## 1차 전직 그림 (2026년 10월 26일)

생성한 투명 아틀라스 셋. 칸 크기 · 차례는 `src/game/advData.js` 의 `ADV_ART`. 그리기는 `src/game/advArt.js`, 못 불러오면 코드 그림으로 대신한다. 원본 PNG 는 `design/advance/`, 생성 기록은 `docs/전직-이미지-생성.md`.

| 파일 | 크기 | 칸 | 설명 |
|---|---|---|---|
| `rpg/advance/adv-fx.webp` | 704 × 528 | 4열 × 3행 · 176px | 0 붉은 · 은빛 검격 · 1 붉은 충격파 · 2 금빛 방패 문양 · 3 육각 충격파 · 4 청록 화살 · 5 청록 섬광 · 6 총구 화염 · 7 탄환 · 탄피 · 8 흰 마법진(원소 빛깔로 물들인다) · 9 푸른 소환진 · 10 마력 폭발 |
| `rpg/advance/adv-up.webp` | 1152 × 768 | 3열 × 2행 · 384px | 전직 연출 6칸 — 마법진 → 빛기둥 → 왕관 → 사그라듦. **검은 바탕**이라 빛을 더하듯(lighter) 그린다(`ADV_UP`) |
| `rpg/advance/adv-bless.webp` | 1152 × 768 | 3열 × 2행 · 384px | 치유사 수호의 축복을 받은 사람 둘레 고리 6칸(되풀이) — 금빛 마법진 · 빛의 막 · 깃털. Codex 생성. **검은 바탕** · lighter(`ADV_BLESS`) |
| `rpg/items/eye-enlight.webp` | 256 × 256 | 한 장 | 계몽의 눈 — 가방 재료 칸 · 계몽의 문 창 · 문 가운데에 떠 있는 그림. Codex 생성(원본 `design/deep/eye-enlight.webp`, 초록 바탕을 지움) |
| `rpg/deep-door.webp` | 420 × 613 | 한 장 | 광장 계몽의 문 — 발판 가운데가 그림 높이의 0.9(`DEEP_DOOR_ART`). Codex 생성(원본 `design/deep/deep-door.webp`, 초록 바탕을 지움) |
| `rpg/advance/adv-fx2.webp` | 1024 × 256 | 4열 × 1행 · 256px | 10월 31일 Codex 생성 — 0 암살자 그림자 연기 · 1 보랏빛 단검 초승달(오른쪽으로 볼록) · 2 엘프 바람 화살(오른쪽으로) · 3 총사 장전 고리. **검은 바탕** · lighter(`ADV_ART.fx2` · `FX2`, 원본 `design/advance/adv-fx2.webp`) |
| `rpg/advance/adv-giant.webp` | 1152 × 768 | 3열 × 2행 · 384px | 10월 31일 Codex 생성 소환술사 거대 정령 — `ELEMS` 차례(화염 · 서리 · 번개 · 독 · 부식 · 중력). 초록 바탕을 지운 투명 그림, 발은 칸 아래에서 약 9% 위(`ADV_ART.giant`, 원본 `design/advance/adv-giant.webp`) |
| `rpg/advance/adv-fx3.webp` | 1024 × 256 | 4열 × 1행 · 256px | 10월 31일 Codex 생성 — 0 금빛 소환진 · 1 내려치기 균열 충격파 · 2 주먹 폭발 · 3 수호 막(아직 안 씀). **검은 바탕** · lighter(`ADV_ART.fx3` · `FX3`, 원본 `design/advance/adv-fx3.webp`) |
| `rpg/abyss/guardians.webp` · `guardians-attack.webp` | 1536 × 1024 | 3열 × 2행 · 512px | 11월 1일 Codex 생성 심연의 탑 수호자 6종(`GUARDIANS` 차례 — 재의 용기사 · 얼어붙은 사제 · 뇌운 파수꾼 / 썩은 연꽃의 마녀 · 녹슨 심판관 · 틈새의 거신). 위는 기본 자세, 아래 파일은 같은 배치의 공격 준비 자세. 초록 바탕을 지운 투명 그림, 칸마다 가운데 · 발밑 0.94(`ABYSS_ART.guards`, 원본 `design/abyss/*-src.webp`) |
| `rpg/abyss/abyss-gate.webp` | 503 × 640 | 한 장 | 11월 1일 Codex 생성 광장 탑 입구. 초록 바탕을 지운 투명 그림, 발밑(계단 맨 아래)이 높이의 0.94, 입구 빛 `ABYSS_ART.gate.portal` |
| `rpg/abyss/abyss-shard.webp` · `abyss-seal.webp` | 128 × 128 | 한 장씩 | 심연의 파편 · 탑의 인장 재료 그림(Codex 생성, 투명) |
| `rpg/abyss/abyss-fx.webp` | 1536 × 1536 | 6열 × 6행 · 256px | 수호자 기술 연출. 열은 수호자 차례(화염 · 서리 · 번개 · 독 · 부식 · 중력), 행은 내려치기 · 돌진 자국(오른쪽이 머리) · 연타 한 방 · 광폭화 기운 · 철벽 돔 · 분신 안개. **검은 바탕** · lighter(`ABYSS_ART.fx`, 원본 `design/abyss/fx{A,B,C}-src.webp`) |
| `rpg/abyss/ice-rain.webp` | 146 × 940 | 한 줄기 | 얼음 비 한 줄기(검은 바탕 · lighter). 폭 · 길이만 늘려 여러 개 겹쳐 쓴다(`sk_ab_icerain` — `s` 폭 · `len` 길이 · `n` 개수 · `r` 떨어지는 범위) |
| `characters/rpg/assassin-<m\|f>/` · `elf-<m\|f>/` | 시트 배율 | 방향 넷 + `-bare` | 10월 31일 Codex 생성 전직 시트(`design/advance/classes/assassin.webp` · `elf.webp`, 기존 얼굴 · 체형 유지 · 푼 머리). 초록 바탕은 순수 초록과 그 둘레 2px 만 지워 엘프 옷의 세이지 빛깔을 남겼다. `python3 tools/cut-adv-classes.py assassin elf` · 무기를 지운 원본 `design/advance/bare/` → `python3 tools/bare-adv.py assassin elf`(손 자리 rpgArt.js `ADV_HAND`) |
| `rpg/advance/adv-spirits.webp` | 480 × 320 | 3열 × 2행 · 160px | 원소 정령 — 화염 · 서리 · 번개 / 독 · 부식 · 중력(`ELEMS` 차례) |
| `rpg/advance/adv-items.webp` | 960 × 192 | 5열 × 1행 · 192px | 0 쌍권총 · 1 기사 방패 · 2 소환서 · 3 · 4 권총 한 자루씩(손에 든다) |
| `rpg/weapons/adv_guns.webp` · `adv_grim.webp` | 128 × 128 | — | 가방 · 상점 창의 전직 무기 그림(위 아틀라스에서 잘랐다) |

전직 캐릭터 그림은 `characters/rpg/<전직>-<m|f>/<front|side|back|turn>.webp`(전직 = gladiator · knight · marksman · gunner · archmage · summoner). 사용자가 코덱스로 만든 전직 시트(`design/advance/classes/<전직>.webp`, 1536 × 1024 투명 · 위 줄 남 · 아래 줄 여 · 앞 · 옆 · 뒤 · 비스듬히)를 `python3 tools/cut-adv-classes.py` 로 잘랐다. 무기 · 방패를 이미 들고 있어 그 위에 아무것도 얹지 않는다. 그림을 못 불러오면 기존 `<직업>-<성별>/<보기>-bare.webp` 위에 총 · 소환서(`HOLDER_HAND`) · 기사 방패(`DUAL_OFF_HAND`)를 얹는다.


### 첫 화면의 게임 미리 보기

`/assets/home/rpg.webp`와 `/assets/home/defense.webp`는 실제 게임 렌더러를 사용해 캡처한 1160×760 정지 화면이다. `/assets/home/meadow.webp`는 새로 생성한 1586×992 하늘·풀밭 배경이다. `HomeScreen.jsx`에서 모드별 카드와 장식을 배치한다. 첫 화면의 캐릭터와 궁수탑은 이 문서의 기존 그림을 재사용한다.

### 영상 무기 3종 새 원화 (2026년 10월 30일)

`rpg/weapons/storm_staff.webp` 뇌명 지팡이 · `violet_bow.webp` 자전궁 · `azure_dual.webp` 창뢰 쌍검은 128×128 투명 WebP입니다. 손에 드는 쌍검은 `azure-dual-held.webp` 256×128의 두 칸입니다. 원본은 `design/weapons/storm-generated.png`이며 내장 이미지 생성 도구로 제작했습니다. `python3 tools/cut-storm-weapons.py`로 다시 자릅니다. 기존 SVG는 임시 그림 기록으로만 남깁니다. 손잡이 좌표는 `rpgArt.js`의 `WEAPON_GRIP` · `AZURE_HELD`입니다.

### 월드보스 뇌조 (2026년 10월 30일)

`public/assets/game/rpg/boss/thunderbird.webp` — 1024×512 투명 WebP. 2열×1행이며 왼쪽은 기본 자세, 오른쪽은 공격 준비입니다. 원본 `design/bosses/thunderbird.png`는 내장 이미지 생성 도구로 생성하고 가장자리를 정리했습니다. `python3 tools/cut-thunderbird.py`로 다시 자릅니다. 칸은 512×512이고 발밑 기준점은 `worldBossData.js`의 보스별 `art.feet`입니다. 선택 창과 전투에 같은 시트를 사용합니다. 로딩 실패 시 날개와 부리가 있는 코드 그림을 사용합니다. 기존 3종 보스 시트는 유지합니다.

공허의 관측자 공격 연출(11월 5일, pixelfx(MIT)로 뽑음 · 뽑는 법 `design/effects/pixelfx/world-boss/make-void.mjs`): `rpg/effects/world-boss/v_*.webp` 투명 시트 6장 — `v_hole`(165×126, 4열 12칸, shadow/black-hole, 반복) · `v_collapse`(249×223, 4열 16칸, shadow/dark-explosion) · `v_portal`(142×111, 4열 12칸, arcane/portal, 반복) · `v_slam`(234×145, 3열 8칸, impacts/ground-slam) · `v_rift`(251×81, 3열 14칸, nature/quake) · `v_sigil`(118×116, 5열 18칸, shadow/hex-sigil). 칸 수 · 기준점은 `worldBossPxData.js`.

공허 무기 · 차원의 지배자 4세트 연출(11월 7일, pixelfx(MIT, 커밋 a841596)로 뽑음 · 뽑는 법 `design/effects/pixelfx/void-weapon/make.mjs`): `rpg/effects/void-weapon/vw_*.webp` 투명 시트 9장 — `vw_cut`(116×90, 4열 12칸, melee/double-slash) · `vw_burst`(198×188, 4열 10칸, explosions/plasma-explosion) · `vw_sky`(143×125, 4열 12칸, shadow/eclipse, 반복) · `vw_arrow`(80×14, 2열 6칸, projectiles/arrow, 반복) · `vw_hit`(159×99, 3열 10칸, impacts/crit-hit) · `vw_hole`(127×133, 4열 12칸, shadow/void-orb, 반복) · `vw_crush`(164×164, 4열 12칸, explosions/implosion) · `vw_spin`(156×85, 3열 10칸, melee/spin-slash) · `vw_set`(147×139, 4열 10칸, arcane/mana-burst). 칸 수 · 그리는 점은 `voidWeaponPxData.js`, 그리기는 `voidWeaponPxArt.js`. 못 불러오면 `voidWeaponArt.js` 의 예전 도트 그림.
크림슨 레퀴엠 · 혈계 추격 연출(11월 13일, pixelfx(MIT, 커밋 a841596 이후 문서만 바뀐 5294518)로 뽑음 · 뽑는 법 `design/effects/pixelfx/blood-gun/make.mjs`): `rpg/effects/blood-gun/bg_*.webp` 투명 시트 12장 — `bg_charge`(91×81, 3열 10칸, arcane/spell-charge) · `bg_circle`(114×86, 3열 8칸, arcane/rune-circle) · `bg_muzzle`(50×54, 3열 6칸, projectiles/muzzle-pistol) · `bg_bolt`(116×26, 2열 6칸, projectiles/laser-bolt, 반복, 머리가 기준점) · `bg_pierce`(171×121, 3열 10칸, impacts/crit-hit) · `bg_form`(167×154, 4열 10칸, explosions/implosion) · `bg_seeker`(100×51, 3열 8칸, projectiles/plasma-shot, 반복, 머리가 기준점) · `bg_spark`(118×75, 3열 8칸, impacts/hit-spark) · `bg_res`(130×121, 4열 10칸, shadow/hex-sigil) · `bg_boom`(201×188, 4열 10칸, explosions/plasma-explosion) · `bg_boom5`(248×216, 4열 12칸, shadow/dark-explosion) · `bg_pool`(57×33, 4열 16칸, 한 번짜리, 풀차징에 맞은 적 발밑의 피 웅덩이 — 이 게임용으로 새로 쓴 `nature/blood-pool`(원본은 `design/effects/pixelfx/blood-gun/blood-pool.js`, pixelfx 의 이펙트 꼴 · 도구로 만듦), 기준점 가운데). 색은 혈색 한 벌(검붉은 → 붉은 → 연분홍). 칸 수 · 그리는 점은 `bloodGunPxData.js`, 그리기는 `bloodGunPxArt.js`. 못 불러오면 `bloodGunArt.js` 의 예전 도트 그림. 혈흔 표식은 예전 그대로 코드 도트.

### 광장 NPC (11월 5일)

`rpg/npc/<NPC id>.webp` 14장. 256×256 투명 WebP이며 발 기준점은 (128, 248)이다. `plazaNpcData.js`에서 사람 84px · 상점 주인 74px 크기를 관리한다. 상점은 판매대 뒤에 그린다. 원화는 `design/plaza-npc/shops.webp` · `town.webp`이며 4열×2행의 마지막 칸은 비어 있다. 칸을 자른 뒤 투명 여백을 다듬고 240×232 안에 맞춰 발을 248에 정렬했다. NPC 그림이 없거나 로딩에 실패하면 기존 코드 그림을 사용한다.

### 새벽숲 마을 (11월 5일)

`rpg/village/*.webp` 26장, 512×512 투명. 건물 6 · 주민 6 · 소품 8은 발 기준 (256,496). 대화용 `portrait-*.webp` 6장은 하단 정렬한 상반신이다. 원본 4시트와 자르기 영역은 `design/village/`. 크기·위치는 `villageData.js`, 바닥·정렬·대체 그림은 `villageArt.js`, 하단 대화 UI는 `VillagePanel.jsx`. 상세 목록·참고 출처는 `docs/새벽숲-마을.md`.

메인 스토리 1부(11월 6일, Codex 정식 그림 · 원본 `design/story/`): `rpg/story/people/<인물>.webp`(512×512 발 기준 (256,496)) · `portraits/<인물>.webp`(512×512 상반신 하단 정렬) · `places/<id>.webp`(건물 · 장소 46 + 소품 `prop-<종류>` 6, 512×512 발 기준 (256,496)) · `ground/<맵 id>.webp`(맵 바닥 10장, 맵 크기와 같은 비율). 이름 표 · 그리는 크기는 `rpg/story/README.md` · `storyData.js`.

에르덴 마을 확장(11월 6일, Codex): `rpg/village/` 에 새 건물 6장(bakery · carpenter · school · stable · cottage-a · cottage-b, 512×512 발 기준 (256,496)). 마을 크기 3200×2100. 이야기 맵 바닥 10장은 길 · 건물 자리를 맞춰 다시 뽑았다.

### 맵 불러오기 화면 일러스트 (11월 7일)
- `public/assets/ui/loading/{town,field,dungeon,abyss,worldboss,story}.webp` — 1280×720 불투명 WebP(원본 1536×864 는 `design/loading/*-src.webp`). 맵 종류 → 그림 · 이름 위 작은 글은 `src/game/loadScreen.js loadInfo`, 팁은 `LOAD_TIPS`(사실만 적는다). 왼쪽 아래에 글이 놓이므로 그림의 왼쪽 아래는 비교적 조용하게 뽑는다. 진행 · 걷힘은 `mapLoad.js`.

### 800~1200 사냥터 (11월 8일, Codex · 테스트 서버 먼저)
- `rpg/high/<지역>-mobs.webp` 8장 — 투명 1536×512, 3열(일반 · 정예 · 보스) × 1행, 칸 512, 발밑 0.95, 오른쪽을 본다. `rpg/high/summons.webp` — 투명 1280×256, 5열, 칸 256, 발밑 0.94. `rpg/high/<지역>-back.webp` 8장 — 불투명 1514×340 뒤 풍경 띠(맵 top 높이로 줄여 좌우 뒤집어 잇는다). 크기 · 칸은 `highData.js HIGH_ART`, 그리기는 `highArt.js` · `fieldArt.js paintFieldLook`. 못 불러오면 코드 그림. 프롬프트 · 자르기는 `docs/고레벨-사냥터-그림-규격.md`.

### BLOOD-001 pixelfx 시트 · 스킬 오른쪽 판 (11월 14일)
- `rpg/effects/blood-job/px/bj_*.webp` 투명 시트 17장(pixelfx MIT, 커밋 5294518, 뽑는 법 `design/effects/pixelfx/blood-job/make.mjs`) — `bj_orb`(arcane/arcane-orb, 반복) · `bj_drop`(projectiles/plasma-shot, 반복, 머리가 기준점) · `bj_hit`(impacts/blunt-hit) · `bj_pop`(water/splash) · `bj_burst`(arcane/mana-burst) · `bj_heart`(pickups/heart-pickup, 반복) · `bj_slam`(impacts/ground-slam) · `bj_slash`(melee/sword-slash) · `bj_cross`(melee/double-slash) · `bj_shield`(holy/divine-shield, 반복) · `bj_block`(impacts/shield-block) · `bj_suck`(explosions/implosion) · `bj_rage`(shadow/shadow-flames, 반복) · `bj_gather`(arcane/spell-charge, 반복) · `bj_rune`(arcane/rune-circle, 반복, 눕힌 원) · `bj_dark`(shadow/dark-explosion) · `bj_fall`(holy/feather-burst). 칸 크기 · 기준점은 `bloodJobPxData.js`, 그리기는 `bloodJobArt.js`. BLOOD-001 연출은 이 시트만 쓴다(Codex 레이어 `bj-layers*.webp` 는 11월 14일 사용자 지시로 지웠다).
- `rpg/ui/side-panel.webp` — Codex 로 뽑은 640×1600 투명 판(갈색 · 금빛 선 · 위 머리판 · 혈방울 장식). CSS `border-image` 9칸(190 40 70 40)으로 늘려 `.rpg-side` 바탕에 쓴다. 원본 줄인 것 `design/ui/side-panel.webp`.
