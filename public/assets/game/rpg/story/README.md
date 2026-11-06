# 메인 스토리 1부 그림 자리

지금은 파일이 없고 코드가 임시 도형을 그립니다. 아래 이름으로 그림을 넣으면 다음 접속부터 그림으로 바뀝니다. 코드는 고치지 않아도 됩니다.

- 형식: 투명 WebP. 사람 · 건물 · 장소는 512×512, 발 기준 (256,496). 마을 그림과 같은 규격입니다.
- 초상화: 512×512, 아래 끝에 맞춥니다. 없으면 대화 창에 초상화 없이 대사만 나옵니다.
- 바닥: `ground/<맵 id>.webp` 한 장. 맵 크기와 같은 비율이면 됩니다(크기가 달라도 맵에 맞게 늘립니다).
- 화면에 그리는 크기는 `src/game/storyData.js` 의 `size` 로 바꿉니다. 위치 · 이름도 같은 파일에 있습니다.
- 기둥 · 상자 · 광차 같은 작은 소품은 그림 자리가 없습니다. 필요하면 말씀해 주세요.

| 인물 | 사람 그림 | 대화 초상화 | 서 있는 곳 |
| --- | --- | --- | --- |
| 한결 · 에르덴 경비대장 | people/hangyeol.webp | portraits/hangyeol.webp | dawnwood |
| 미나 · 약사 겸 기계 해석가 | people/mina.webp | portraits/mina.webp | dawnwood |
| 보리 · 수집가 | people/bori.webp | portraits/bori.webp | dawnwood |
| 세라 · 수송대 생존자 | people/sera.webp | portraits/sera.webp | dawnwood, convoy |
| 제로 · 최초의 실험체 | people/zero.webp | portraits/zero.webp | lab7 |
| 아르카 · 중앙 방어 관리자 · 투영 | people/arka.webp | portraits/arka.webp | core |
| 이리온 · 고대 기록 해석자 | people/irion.webp | portraits/irion.webp | vault |

| 맵 | 바닥 | 건물 · 장소 그림(places/) |
| --- | --- | --- |
| 에르덴 마을 (dawnwood) | 기존 마을 바닥 | erden-guardpost 경비대 초소<br>erden-workbench 미나의 연구 작업대<br>erden-collection 보리의 수집품 가판 |
| 1장 북쪽 수송로 (convoy) | ground/convoy.webp | convoy-wagon-1 전복된 마차<br>convoy-wagon-2 전복된 마차<br>convoy-wagon-3 전복된 마차<br>convoy-guard 멈춘 수송대 호위병 |
| 2장 제7연구소 (lab7) | ground/lab7.webp | lab7-gate 녹슨 정문<br>lab7-wing 실험실 동<br>lab7-records 기록 보관실<br>lab7-lift 최하층 승강기<br>lab7-power-1 전력 장치 1<br>lab7-power-2 전력 장치 2<br>lab7-power-3 전력 장치 3<br>lab7-log 실험 기록 단말<br>lab7-core 제어 핵 |
| 3장 북쪽 빙결 유적 (ruin-north) | ground/ruin-north.webp | ruin-north-hall 북쪽 유적 전당<br>ruin-north-gate 무너진 관문<br>ruin-north-device 냉각 제어 핵<br>ruin-north-mark 북쪽 봉인 표식 |
| 3장 동쪽 번개 유적 (ruin-east) | ground/ruin-east.webp | ruin-east-hall 동쪽 유적 전당<br>ruin-east-gate 무너진 관문<br>ruin-east-device 과충전 발전기<br>ruin-east-mark 동쪽 봉인 표식 |
| 3장 남쪽 화염 시설 (ruin-south) | ground/ruin-south.webp | ruin-south-hall 남쪽 유적 전당<br>ruin-south-gate 무너진 관문<br>ruin-south-device 화염 제어 장치<br>ruin-south-mark 남쪽 봉인 표식 |
| 3장 서쪽 중력 시설 (ruin-west) | ground/ruin-west.webp | ruin-west-hall 서쪽 유적 전당<br>ruin-west-gate 무너진 관문<br>ruin-west-device 중력 제어 장치<br>ruin-west-mark 서쪽 봉인 표식 |
| 4장 중앙 제어 시설 (core) | ground/core.webp | core-boundary 경계 문<br>core-reactor 에너지 코어<br>core-module 통제 모듈<br>core-sender 공격 명령 송신기<br>core-executor 봉인의 집행자 |
| 5장 고대 송신탑 (relay) | ground/relay.webp | relay-tower 고대 송신탑<br>relay-device 고장 난 송신 장치<br>relay-lock 보안 장치 |
| 6장 폐광산 (mine) | ground/mine.webp | mine-shaft 무너진 갱도<br>mine-hut 광부 쉼터<br>mine-plan-1 도면 조각<br>mine-plan-2 도면 조각<br>mine-plan-3 도면 조각 |
| 6장 기록 보관소 (vault) | ground/vault.webp | vault-desk 설계도 책상 |
