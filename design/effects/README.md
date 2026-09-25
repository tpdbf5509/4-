# 이펙트 원본

세 장이 있습니다. 바꾸지 마세요.

| 시트 | 쓰는 곳 |
| --- | --- |
| `ogre-fx-sheet.webp` | 1차 결전 — 오우거 지휘관의 기술 |
| `titan-fx-sheet.webp` | 2차 결전 — 대군주의 기술 |
| `hero-fx-sheet.webp` | 병과 캐릭터 첫째 장 — 궁수탑(초록)·저격탑(파랑)·대포탑(주황) |
| `hero2-fx-sheet.webp` | 병과 캐릭터 둘째 장 — 번개탑(파랑·노랑)·독탑(초록·보라) |
| `hero3-fx-sheet.webp` | 병과 캐릭터 셋째 장 — 서리탑(파랑)·중력탑(보라)·보급소(분홍) |
| `hero4-fx-sheet.webp` | 병과 캐릭터 넷째 장 — 부식탑(초록·보라)·성기사탑(금색)·화염탑(빨강) |

게임에서 쓰는 그림은 이 시트에서 이펙트만 떼어 낸 `public/assets/effects/<보스>/*.webp` 입니다.
무손실 WebP라 픽셀이 원본과 한 점도 다르지 않습니다. 늘리거나 돌리거나 색을 고치지 않았습니다.
`cut.py` 가 하는 일은 넷뿐입니다.

아래 표에는 있지만 `FX_ART`(`src/game/art.js`)에 자리를 얻지 못한 낱개 그림
(`boss/rock` · `boss/slash` · `boss/smoke` · `boss/spark` · `boss/stomp`,
`titan/hail` · `titan/rock` · `titan/spark` · `titan/track`)은
`public/assets/unused/effects/<보스>/` 에 옮겨 두었습니다 — 게임에서 지금 쓰지는 않지만
같은 시트에서 뗀 낱개 소재라 나중에 새 패턴에 쓸 수 있습니다.

1. 칸마다 잘라 냅니다 (`BOX`).
2. 설명 라벨이 걸친 줄을 지웁니다 (`_drop_label`).
3. 칸 안에 함께 그려진 보스를 지웁니다 (`_drop_boss`). 게임은 제 보스를 따로 그리므로,
   남겨 두면 두 마리로 겹쳐 보입니다. 가장 넓으면서 가장 어두운 덩어리가 보스입니다.
   오우거 시트에는 보스가 들어 있지 않아 이 일이 없습니다.
4. 깔려 있는 배경 안개를 걷습니다 (`_drop_wash`). 병과 시트에만 있는 일입니다.

라벨을 걷는 방법은 시트마다 다릅니다. 대군주 시트는 라벨이 칸 위쪽에 걸쳐 있어 그 줄만 지우고,
오우거 시트는 라벨이 네모 딱지로 떠 있는데 이펙트와 알파가 같아 자동으로 가려낼 수 없습니다.
그래서 딱지 여덟 개의 자리를 `SHEETS['boss']['labels']` 에 적어 두고 그대로 지웁니다.

`python3 design/effects/cut.py` 로 다시 만들 수 있습니다.

## 2차 대군주 — `public/assets/effects/titan/`

| 기술 | 그림 | 크기 | 지운 것 |
| --- | --- | --- | --- |
| 겹파문 | wake.webp | 355×176 | — |
| 쏟아지기 | hail.webp → hail1.webp | 80×131 | 라벨 4줄 · 낱개 하나만 남김 |
| 내리치기 | slam.webp | 235×188 | 라벨 11줄 |
| 내려찍기 | leap.webp | 237×193 | 라벨 11줄 · 보스 |
| 돌진 | rush.webp | 176×110 | 보스 |
| 휩쓸기 | sweep.webp | 279×141 | 보스 |
| 후려치기 | swipe.webp | 213×138 | 보스 |
| 뿔찍기 | gore.webp | 199×153 | 보스 |
| 대지균열 | rift.webp | 196×162 | 라벨 4줄 |
| 분노의 파동 | pulse.webp | 248×136 | 보스 |
| 추적 낙석 | track.webp → track1.webp | 36×122 | 라벨 13줄 · 낱개 하나만 남김 |
| 광폭 회전 | spin.webp | 253×154 | 라벨 14줄 · 보스 |
| 낱개 돌·연기 | rock.webp | 382×46 | — |
| 낱개 충격 자국 | spark.webp | 315×61 | — |

쏟아지기와 추적 낙석은 시트에 다섯·여섯 개가 나란히 그려져 있습니다.
게임에서는 자리마다 따로 떨어지므로 낱개 하나(`hail1` · `track1`)만 떼어 내 자리마다 얹습니다.

## 1차 오우거 지휘관 — `public/assets/effects/boss/`

이 시트는 여덟 칸이 게임의 여덟 기술과 그대로 맞아떨어집니다.

| 기술 | 그림 | 크기 | 지운 것 |
| --- | --- | --- | --- |
| 십자 가르기 | cross.webp | 268×336 | 라벨 딱지 · 옆 칸에 걸친 작은 별 |
| 엇갈려 가르기 | xcut.webp | 383×358 | 라벨 딱지 |
| 내리치기 | slam.webp | 370×337 | 라벨 딱지 |
| 내려찍기 | leap.webp | 296×404 | 라벨 딱지 |
| 돌진 | rush.webp | 445×132 | 라벨 딱지 · 아래 두 줄은 쓰지 않음 |
| 휩쓸기 | sweep.webp | 393×247 | — |
| 발구르기 | stomp.webp → stomp1.webp | 141×208 | 라벨 딱지 · 낱개 하나만 남김 |
| 후려치기 | swipe.webp | 296×254 | 라벨 딱지 |
| 낱개 돌 | rock.webp | 698×118 | — |
| 낱개 연기 | smoke.webp | 243×107 | — |
| 낱개 충격 자국 | spark.webp | 453×238 | — |
| 낱개 베인 자국 | slash.webp | 1008×116 | — |

발구르기는 세 곳을 동시에 짓밟으므로 시트의 셋 중 하나만 떼어 자리마다 얹습니다.
십자·엇갈려 가르기는 띠가 두 줄이지만 그림은 한 장이라 한가운데에 한 번만 얹습니다.

## 병과 캐릭터 — `public/assets/effects/{archer,sniper,cannon}/`

한 장에 세 줄입니다. 위가 초록(궁수탑), 가운데가 파랑(저격탑), 아래가 주황(대포탑)입니다.
라벨도 보스도 없는 대신 줄마다 옅은 색 안개가 깔려 있습니다. `_drop_wash` 가 그 안개만 걷습니다.
작게 줄여 낮은 분위수를 재면 이펙트에 휘둘리지 않고 그 언저리의 바탕값이 나옵니다.
그만큼 알파에서 덜어 내고, 남은 아주 옅은 자락(알파 18 아래)은 부드럽게 0 으로 보냅니다.
색(RGB)은 한 점도 건드리지 않습니다.

| 쓰는 곳 | 그림 | 크기 |
| --- | --- | --- |
| 궁수탑 평타 — 날아가는 화살 | archer/arrow.webp | 267×54 |
| 궁수탑 평타 — 꽂힌 자국 | archer/hit1.webp | 99×143 |
| 궁수탑 집중 사격 — 화살 무리 | archer/volley.webp | 385×320 |
| 궁수탑 집중 사격 — 크게 꽂힌 자국 | archer/hit.webp | 210×311 |
| 궁수탑 — 땅에 남는 고리 | archer/ring.webp | 130×62 |
| 저격탑 평타 — 날아가는 탄 | sniper/slug.webp | 241×84 |
| 저격탑 — 꽂힌 자국 | sniper/hit.webp | 204×198 |
| 저격탑 결정타 — 겨누는 표식 | sniper/mark.webp | 356×162 |
| 저격탑 — 튀는 빛 | sniper/spark.webp | 45×70 |
| 대포탑 평타 — 날아가는 포탄 | cannon/shell.webp | 137×59 |
| 대포탑 — 터진 자국 | cannon/boom.webp | 174×135 |
| 대포탑 융단 폭격 — 떨어지는 포탄 하나 | cannon/rain1.webp | 46×77 |
| 대포탑 — 땅에 터진 자국 | cannon/hit.webp | 92×64 |
| 대포탑 — 포구 연기 | cannon/smoke.webp | 97×73 |
| 대포탑 — 불꼬리 | cannon/trail.webp | 360×80 |

융단 폭격은 시트에 여러 발이 나란히 그려져 있습니다. 게임에서는 자리마다 따로 떨어지므로
낱개 하나(`rain1`)만 떼어 내 여섯 자리에 얹습니다.

## 병과 캐릭터 둘째 장 — `public/assets/effects/{bolt,flame,poison}/`

첫째 장과 같은 방식입니다. 위가 번개(파랑·노랑), 가운데가 불(주황·빨강), 아래가 독(초록·보라)입니다.

| 쓰는 곳 | 그림 | 크기 |
| --- | --- | --- |
| 번개탑 — 첫 줄기가 날아간다 | bolt/fly.webp | 249×87 |
| 번개탑 — 꽂힌 자국 | bolt/hit.webp | 114×104 |
| 번개탑 — 이어지는 줄기 | bolt/arc.webp | 270×189 |
| 번개탑 뇌우 — 하늘에서 내리꽂힌다 | bolt/strike.webp | 127×272 |
| 번개탑 뇌우 — 크게 휘몰아친다 | bolt/storm.webp | 384×346 |
| 번개탑 — 발밑 고리 | bolt/ring.webp | 193×176 |
| 화염탑 — 뿜는 불덩이 | flame/fly.webp | 110×58 |
| 화염탑 — 스친 자국 | flame/hit.webp | 143×111 |
| 화염탑 — 발밑 불고리 | flame/ring.webp | 223×164 |
| 화염탑 화염 폭풍 — 솟아오르는 불길 | flame/up.webp | 112×171 |
| 화염탑 화염 폭풍 — 통째로 탄다 | flame/storm.webp | 448×268 |
| 화염탑 — 그을음 | flame/smoke.webp | 107×87 |
| 화염탑 — 터진 자국 | flame/boom.webp | 201×176 |
| 독탑 — 날아가는 독구슬 | poison/fly.webp | 206×59 |
| 독탑 — 터진 자국 | poison/hit.webp | 161×139 |
| 독탑 — 퍼지는 독무 | poison/cloud.webp | 189×139 |
| 독탑 — 땅에 고인 독 | poison/pool.webp | 229×132 |
| 독탑 역병 — 떨어지는 독방울 | poison/drop.webp | 50×95 |
| 독탑 역병 — 크게 퍼진다 | poison/storm.webp | 353×223 |
| 독탑 — 발밑 고리 | poison/ring.webp | 240×72 |

번개탑은 줄기가 보스에서 옆의 적으로 이어지므로, 첫 줄기만 날아가는 그림(`fly`)으로 쏘고
이어지는 줄기는 `arc` 를 두 점 한가운데에 얹습니다.

화염탑은 둘째 장에 있었지만 나중에 이펙트를 새로 받아 **넷째 장으로 옮겼습니다.**
둘째 장의 불 줄은 이제 쓰지 않습니다.

## 병과 캐릭터 셋째 장 — `public/assets/effects/{frost,gravity,supply}/`

| 쓰는 곳 | 그림 | 크기 |
| --- | --- | --- |
| 서리탑 — 날아가는 얼음살 | frost/fly.webp | 189×64 |
| 서리탑 — 솟는 얼음 | frost/hit.webp | 262×269 |
| 서리탑 한파 — 크게 얼어붙는다 | frost/big.webp | 416×360 |
| 서리탑 한파 — 얼음 결정 | frost/sigil.webp | 202×231 |
| 서리탑 — 땅에 남는 고리 | frost/ring.webp | 198×131 |
| 중력탑 — 빨아들이는 소용돌이 | gravity/pull.webp | 131×129 |
| 중력탑 — 짓누르며 솟는 파편 | gravity/crush.webp | 278×338 |
| 중력탑 — 돌아가는 중력장 | gravity/field.webp | 355×313 |
| 중력탑 블랙홀 | gravity/hole.webp | 254×279 |
| 중력탑 블랙홀 — 감아올리는 기둥 | gravity/swirl.webp | 121×284 |
| 보급소 — 밀어 준 사람 발밑 빛기둥 | supply/beam.webp | 238×213 |
| 보급소 긴급 보급 — 축복 | supply/bless.webp | 168×214 |
| 보급소 긴급 보급 — 감싸는 보호막 | supply/dome.webp | 211×198 |
| 보급소 — 발밑 고리 | supply/ring.webp | 160×162 |
| 보급소 — 흐르는 띠 | supply/wave.webp | 220×182 |
| 보급소 — 반짝이는 십자 | supply/spark.webp | 190×185 |
| 보급소 — 솟는 빛 | supply/up.webp | 170×180 |

## 병과 캐릭터 넷째 장 — `public/assets/effects/{corrode,paladin,flame}/`

| 쓰는 곳 | 그림 | 크기 |
| --- | --- | --- |
| 부식탑 — 날아가는 부식구 | corrode/fly.webp | 156×92 |
| 부식탑 — 녹아드는 자국 | corrode/hit.webp | 186×192 |
| 부식탑 — 땅에 고인 부식 | corrode/pool.webp | 247×186 |
| 부식탑 산성비 — 솟는 기둥 | corrode/up.webp | 272×233 |
| 부식탑 산성비 — 휘몰아친다 | corrode/storm.webp | 285×311 |
| 성기사탑 성역 — 날아가는 검기 | paladin/fly.webp | 209×46 |
| 성기사탑 — 베어 넘기는 호 | paladin/slash.webp | 260×143 |
| 성기사탑 성역 — 내리꽂는 검 | paladin/blade.webp | 182×230 |
| 성기사탑 성역 — 감싸는 구체 | paladin/orb.webp | 244×211 |
| 성기사탑 성역 — 휘도는 고리 | paladin/ring.webp | 314×220 |
| 성기사탑 성역 — 방패 문장 | paladin/sigil.webp | 266×299 |
| 화염탑 — 뿜는 불꽃 | flame/fly.webp | 162×73 |
| 화염탑 — 솟구치는 불길 | flame/hit.webp | 242×219 |
| 화염탑 화염 폭풍 — 터진 자국 | flame/boom.webp | 243×195 |
| 화염탑 화염 폭풍 — 두 줄기 불기둥 | flame/up.webp | 268×185 |
| 화염탑 화염 폭풍 — 회오리 | flame/storm.webp | 239×229 |
| 화염탑 — 발밑 불고리 | flame/ring.webp | 144×43 |

보급소는 때리지 않으므로 밀어 준 사람 발밑에 빛기둥을 세우고, 제 발밑에는 고리를 둡니다.
성기사탑은 붙어서 베므로 `slash` 를 보스 옆에 얹고, 성역에서만 문장·구체·고리가 함께 돕니다.
성역은 보스를 너무 가리지 않게 크기를 106·84·84로 줄여 두었습니다.

## 게임에 얹는 자리

`cut.py` 는 그림마다 **얹을 자리**(`ax`, `ay`)를 같이 재서 찍어 줍니다.
보스가 그려져 있던 칸은 보스가 섰던 한가운데, 고리 모양은 빈 구멍의 한가운데,
날아가는 것은 머리 끝(`tip`), 떨어지는 것은 닿는 발끝(`foot`),
나머지는 가장 밝은 곳(터져 나오는 중심)입니다. 이 값을 `src/game/art.js` 의 `FX_ART` 에 그대로 옮겨 적습니다.
`FX_ART` 의 열쇠가 곧 파일 자리입니다 (`boss/slam` → `/assets/fx/boss/slam.webp`).

그림 크기는 판정 반지름에 맞춰 **가로세로 같은 배율로** 키웁니다(`FX_ART.k`).
낙석처럼 세로로 긴 그림은 `k` 를 0.75~0.8로 두어 자리 안에 들어오게 합니다.
땅에 깔리는 것은 사람보다 아래에, 솟거나 떨어지는 것(`over`)은 사람보다 위에 그립니다.
판정 수치와 붉은 예비 자리는 그림과 상관없이 예전 그대로입니다.
