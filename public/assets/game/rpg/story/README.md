# 메인 스토리 그림

11월 6일부터 Codex(`codex-image` 스킬)로 뽑은 정식 그림이 들어 있습니다. 인물 13 · 초상화 13 · 건물/장소/보스 159 · 맵 바닥 23(1~26장 전부). 원본 시트와 묶는 스크립트는 `design/story/`(`*-src.webp` · `build-art.py`)이고 프롬프트는 프로젝트 notes/메인스토리-남은-그림-프롬프트.md 입니다. 같은 이름으로 덮어쓰면 코드를 고치지 않아도 바뀌고, 파일이 없으면 코드가 임시 도형을 그립니다.

소품(기둥 · 상자 · 광차 등)은 `places/prop-<종류>.webp`(crate · pillar · turret · pylon · cart · shelf)입니다.

- 형식: 투명 WebP. 사람 · 건물 · 장소는 512×512, 발 기준 (256,496). 마을 그림과 같은 규격입니다.
- 초상화: 512×512, 아래 끝에 맞춥니다. 없으면 대화 창에 초상화 없이 대사만 나옵니다.
- 바닥: `ground/<맵 id>.webp` 한 장. 맵 크기와 같은 비율이면 됩니다(크기가 달라도 맵에 맞게 늘립니다).
- 화면에 그리는 크기는 `src/game/storyData.js` 의 `size` 로 바꿉니다. 위치 · 이름도 같은 파일에 있습니다.

| 인물 | 사람 그림 | 대화 초상화 | 서 있는 곳 |
| --- | --- | --- | --- |
| 한결 · 에르덴 경비대장 | people/hangyeol.webp | portraits/hangyeol.webp | dawnwood |
| 미나 · 약사 겸 기계 해석가 | people/mina.webp | portraits/mina.webp | dawnwood |
| 보리 · 수집가 | people/bori.webp | portraits/bori.webp | dawnwood |
| 세라 · 수송대 생존자 | people/sera.webp | portraits/sera.webp | convoy |
| 제로 · 최초의 실험체 | people/zero.webp | portraits/zero.webp | lab7, boundary-room |
| 아르카 · 중앙 방어 관리자 · 투영 | people/arka.webp | portraits/arka.webp | core |
| 이리온 · 고대 기록 해석자 | people/irion.webp | portraits/irion.webp | vault, leon-hall, nameless-sea, boundary-room |
| 리아 · 에르덴의 아이 | people/lia.webp | portraits/lia.webp | dawnwood |
| 도윤 · 수송대원 · 리아의 아버지 | people/doyun.webp | portraits/doyun.webp | relay |
| 레반 · 인간 연합 지휘관 | people/levan.webp | portraits/levan.webp | leon, first-plaza |
| 카엘 · 자율 기계 지도자 | people/kael.webp | portraits/kael.webp | karha, first-plaza |
| 세린 · 최초 설계자 · 기록 투영 | people/serin.webp | portraits/serin.webp | boundary-room |
| 공허의 관측자 · 관측 장치 | people/observer.webp | portraits/observer.webp | observer-deck |

| 맵 | 바닥 | 건물 · 장소 그림(places/) |
| --- | --- | --- |
| 에르덴 마을 (dawnwood) | 기존 마을 바닥 | erden-guardpost 경비대 초소<br>erden-workbench 미나의 연구 작업대<br>erden-collection 보리의 수집품 가판 |
| 1장 북쪽 수송로 (convoy) | ground/convoy.webp | convoy-wagon-1 전복된 마차<br>convoy-wagon-2 전복된 마차<br>convoy-wagon-3 전복된 마차<br>convoy-guard 멈춘 수송대 호위병 |
| 2장 제7연구소 (lab7) | ground/lab7.webp | lab7-gate 녹슨 정문<br>lab7-wing 실험실 동<br>lab7-records 기록 보관실<br>lab7-lift 최하층 승강기<br>lab7-power-1 전력 장치 1<br>lab7-power-2 전력 장치 2<br>lab7-power-3 전력 장치 3<br>lab7-core 제어 핵<br>lab7-assistant 작은 기계 조수<br>lab7-tubes 실험 유리관 |
| 3장 북쪽 빙결 유적 (ruin-north) | ground/ruin-north.webp | ruin-north-hall 북쪽 유적 전당<br>ruin-north-gate 무너진 관문<br>ruin-north-device 냉각 제어 핵 |
| 3장 동쪽 번개 유적 (ruin-east) | ground/ruin-east.webp | ruin-east-hall 동쪽 유적 전당<br>ruin-east-gate 무너진 관문<br>ruin-east-device 과충전 발전기 |
| 3장 남쪽 화염 시설 (ruin-south) | ground/ruin-south.webp | ruin-south-hall 남쪽 유적 전당<br>ruin-south-gate 무너진 관문<br>ruin-south-device 화염 제어 장치 |
| 3장 서쪽 중력 시설 (ruin-west) | ground/ruin-west.webp | ruin-west-hall 서쪽 유적 전당<br>ruin-west-gate 무너진 관문<br>ruin-west-device 중력 제어 장치 |
| 4장 중앙 제어 시설 (core) | ground/core.webp | core-boundary 경계 문<br>core-reactor 에너지 코어<br>core-module 통제 모듈<br>core-sender 공격 명령 송신기<br>core-cells 잠긴 보호구역<br>core-executor 봉인의 집행자 |
| 5장 외곽 감시탑 (relay) | ground/relay.webp | relay-tower 불탄 감시탑<br>relay-device 송신 장치<br>relay-lock 손상된 경비병 |
| 6장 폐광산 (mine) | ground/mine.webp | mine-shaft 무너진 갱도<br>mine-hut 광부 쉼터<br>mine-plan-1 좌표 조각<br>mine-plan-2 좌표 조각<br>mine-plan-3 좌표 조각<br>mine-silencer 서고의 침묵자 |
| 6장 기록 보관소 (vault) | ground/vault.webp | vault-desk 설계도 책상<br>vault-line-1 문장 조각<br>vault-line-2 문장 조각<br>vault-line-3 문장 조각 |
| 7장 지하 도시 루멘 (lumen) | ground/lumen.webp | lumen-lamp 꺼지지 않은 거리등<br>lumen-house 식탁 위 세 잔<br>lumen-ledger 도시 행정 기록판<br>lumen-ghost 시민 잔상<br>lumen-hall 보존 홀 투영<br>lumen-giant 서 있는 거인<br>lumen-part-1 동력 부품<br>lumen-part-2 동력 부품<br>lumen-eraser 소거자 |
| 8장 루멘 대도서관 (lumen-library) | ground/lumen-library.webp | lib-chronicle 두 개의 연대기<br>lib-sealed 봉인된 문서<br>lib-censor 검열 서기관<br>lib-memory-1 과거 관리자 기록<br>lib-memory-2 과거 관리자 기록<br>lib-memory-3 과거 관리자 기록<br>lib-replay 기억 재생 장치<br>lib-verdict 비어 있는 판결문<br>lib-ev-1 발포 명령서<br>lib-ev-2 대피 기록<br>lib-ev-3 관측 이상 로그<br>lib-deleter 삭제 명령자<br>lib-festival 오래된 축제 화면 |
| 10장 루멘 천문대 (lumen-observatory) | ground/lumen-observatory.webp | obs-sphere 천문대 구체<br>obs-arka 아르카의 잔류 기록<br>obs-bridge-1 무너지는 다리 · 왼쪽<br>obs-bridge-2 무너지는 다리 · 오른쪽<br>obs-eye 두 번째 태양의 눈 |
| 13장 접경도시 레온 (leon) | ground/leon.webp | leon-child 넘어진 아이<br>leon-bomb 폭발물<br>leon-citizen-1 겁먹은 상인<br>leon-citizen-2 부상병<br>leon-citizen-3 기계에게 구조된 노인<br>leon-bell 레온 종루<br>leon-front 세 전선 지휘대<br>leon-refugees 다리 위 피난민<br>leon-bearer 총공세의 기수<br>leon-victory 무너진 성문 |
| 14장 레온 회담장 (leon-hall) | ground/leon-hall.webp | hall-gate 출입 통제 시스템<br>hall-secret 비밀 문<br>hall-raid 자율 도용 장치<br>hall-crowd 부서진 기계 손을 든 아이<br>hall-council 회의장 연단<br>hall-dev-1 전쟁 장치 · 발화부<br>hall-dev-2 전쟁 장치 · 통신부<br>hall-dev-3 전쟁 장치 · 명령부<br>hall-screen 중앙 스크린<br>hall-mourner 목걸이를 든 주민 |
| 15장 기계 도시 카르하 (karha) | ground/karha.webp | karha-power 전력 복구 장치<br>karha-guild 기계 상인 길드 장부<br>karha-forger 위조 집행자<br>karha-hands 협정 자리 |
| 16장 레온-카르하 경계 다리 (bridge) | ground/bridge.webp | bridge-marker 공동 경계표<br>bridge-crew 수리 병력<br>bridge-breaker 경계 파괴자<br>bridge-letter 이리온의 경고<br>bridge-shadow 다리 아래 그림자 |
| 19장 에르덴 북쪽 언덕 (erden-sky) | ground/erden-sky.webp | sky-field-1 비정상 중력장<br>sky-field-2 비정상 중력장<br>sky-field-3 비정상 중력장<br>sky-eye 하늘의 눈<br>sky-logs 관측 로그 단말<br>sky-room 임시 통제실<br>sky-collector 기록 수집체 |
| 21장 무명해역 (nameless-sea) | ground/nameless-sea.webp | sea-road 바다 위 도로<br>sea-family 부두의 가족<br>sea-fixer 위치 보정 장치<br>sea-eraser 해안의 소거병<br>sea-door 수면 아래 문<br>sea-alley 같은 골목<br>sea-voice-1 주민 음성 기록<br>sea-voice-2 주민 음성 기록<br>sea-diary 끊긴 일기<br>sea-cycle 주기 복원 장치 |
| 23장 임시 관리자 등록소 (registry) | ground/registry.webp | reg-terminal 둥근 제어 터미널<br>reg-key-1 소유자 기록 조각<br>reg-key-2 소유자 기록 조각<br>reg-key-3 소유자 기록 조각<br>reg-offer 단일 조작권<br>reg-door 작은 문 |
| 24장 관측 관제층 (observer-deck) | ground/observer-deck.webp | deck-scores 위험 점수 화면<br>deck-route 역관측 경로<br>deck-records 세 개의 기록<br>deck-towers 네 통신탑<br>deck-core 관측자 중추 |
| 25장 첫 번째 세계의 원형 광장 (first-plaza) | ground/first-plaza.webp | plaza-wall 이름의 벽<br>plaza-tag-1 잊힌 이름표<br>plaza-tag-2 잊힌 이름표<br>plaza-tag-3 잊힌 이름표<br>plaza-night 재난의 밤 기록 |
| 26장 중앙 경계 설계실 (boundary-room) | ground/boundary-room.webp | br-mural 네 갈래 벽화<br>br-warn 경고의 방<br>br-rescue 구조의 방<br>br-defend 방어의 방<br>br-record 기록의 방<br>br-center 중앙의 원<br>br-memory 기억 복원 장치<br>br-table 사라진 첫 문장<br>br-frag-1 기록 파편<br>br-frag-2 기록 파편<br>br-frag-3 기록 파편<br>br-frag-4 기록 파편<br>br-blank 빈 도면<br>br-alarm 네 도시의 경보<br>br-council 네 대표의 승인대<br>br-link 관측자 연결 장치 |
## 조사물 크기

사람 키(64px)를 1로 두고 사물마다 긴 쪽 길이를 정한 표가 `design/story/size-sights.py` 의 `E` 에 있습니다. 그림을 바꾸거나 `E` 를 고친 뒤 `python3 design/story/size-sights.py` 를 돌리면 `src/game/storySizes.js`(그리는 크기 · 부딪힘 반지름)가 다시 만들어집니다. 부딪힘 반지름은 말 걸 수 있는 거리(100) 때문에 56 을 넘기지 않습니다.

## 장식 소품

맵이 비어 보이지 않게 `places/prop-d-<이름>.webp` 64종(시트 dc1~dc8, 프롬프트는 `design/story/` 원본 시트)을 맵 분위기별로 흩뿌립니다. 분위기 표 · 밀도(`DENSITY`)는 `src/game/storyDecor.js` 한 곳이고, 좌표는 맵 id 로 정한 씨앗에서 만들어 서버와 화면이 같습니다. 길 · 조사물 · 인물 · 출구 · 시작 자리에서 떨어져 놓이며 몸이 막히는 것은 11종뿐이고 작은 반지름입니다. 크기는 `design/story/size-sights.py` 의 `D` 표입니다.
