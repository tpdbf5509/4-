# CLAUDE.md — 「네 갈래 방어선」 작업 지침

새 세션을 시작하면 이 파일부터 읽고 방향을 맞춘다. 꼭 필요한 것만 둔다.
- 기능마다의 상세 규칙 · 함수 이름 · 스냅샷 줄 번호 · 지난 사고 경위: `docs/작업-상세-기록.md`
- 기능 명세: `docs/기능-명세서.md` · 그림 지도: `ASSETS.md` · `public/assets/game/README.md`

이 파일과 코드가 다르면 **코드가 맞다**. 다른 점을 찾으면 이 파일도 함께 고친다.

---

## 1. 사용자와 대화하는 법

- **항상 한국어 존댓말**로 답한다. 짧고 명확하게. 근거 없이 지어내지 않는다.
- 사용자는 기획자이자 플레이 테스터다. 밸런스 숫자를 자주 바꿔 달라고 한다("60% 줄여보자" → "55%로"). 숫자는 한 곳의 상수만 고치면 되게 유지한다.
- 요청이 애매하면 하나만 짧게 묻는다. 뻔한 것은 정하고 진행한 뒤 무엇을 정했는지 알린다.
- 끝나면 **무엇을 바꿨는지 · 어떻게 확인했는지 · 배포 상태**를 짧게 보고한다. 확인 못 한 것은 못 했다고 말한다.
- 화면 문구 · 업데이트 노트 · 문서는 짧은 문장, 쉼표 적게, 괄호 영어는 꼭 필요할 때만.
- **지연 해결책으로 "손님 화면에서 내 스킬 · 공격 · 이동을 먼저 그리기(클라이언트 예측)"를 추천하지 않는다.** 사용자 결정 — 먼저 보여도 실제 판정은 늦어 어긋나고 렉처럼 보인다. 지연은 서버 위치 · 왕복 시간을 줄이는 쪽으로만 푼다.
- **RPG 새 창은 기존 상점·가방(`.shop`)이나 파티(`.rpg-stat`)의 틀과 공통 버튼을 재사용한다.** 갈색 바탕 · 금빛 강조 · 기존 글꼴, 게임 화면 안에 둔다. 기능마다 다른 색상 체계나 브라우저 전체 고정 창을 만들지 않는다.
- 디자인 취향: 톤다운 · 파스텔 색, 배경 60 : 글자 30 : 포인트 10, 왼쪽 정렬, 1px 얇은 선, 강조는 한 곳. 한글 제목은 자간을 살짝 줄인다.

## 2. 브랜치 · 배포

- 저장소 `tpdbf5509/4-`, 기본 브랜치 **`claude/4-player-coop-defense-1x89l5`**. 세션이 다른 브랜치를 정해 주면 거기서 커밋 · `git push -u origin <브랜치>` 하고 기본 브랜치로 합친다.
- **Vercel 프로젝트는 `four-lane` 하나만** 쓴다. 주소 https://four-lane.vercel.app. 다른 프로젝트 · 미리보기 주소로 배포하거나 안내하지 않는다.
  - 기본 브랜치에 push 되면 자동 배포된다. 보통 1~3분 안에 READY.
  - Vercel MCP `list_deployments` 는 **projectId 만** 넘긴다. teamId 를 넣으면 403 이 난다.
- 모든 작업은 끝나면 바로 four-lane 에 반영하고 READY 를 확인해 알린다.
- push 가 거절되면 `git fetch origin <브랜치>` 후 merge 한다(리베이스 · 강제 push 금지). 다시 빌드 · 확인 후 push.
- **RPG 전용 서버**(`server/`, Cloudflare Workers + Durable Objects, 이름 `four-lane-rpg`)는 GitHub Actions(`.github/workflows/rpg-server.yml`)가 push 때 배포한다. 저장소 비밀값 `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID`. 주소 `wss://four-lane-rpg.four-lane.workers.dev`(`src/net/api.js`, Vercel 환경 변수 `VITE_RPG_SERVER` 로 덮어씀). 내 컴퓨터 시험은 `cd server && npx wrangler dev --port 8787` + 화면 주소 `?srv=local`.
- 사용자가 요청하지 않으면 PR 을 만들지 않는다(세션 지시로 PR 을 거쳐 합치는 경우는 예외).
- 커밋 메시지는 한국어 한 줄, "무엇을 어떻게 한다" 꼴. 예: `궁수탑 4단계 공격력을 55% 낮추고 강화 비용을 260으로 올린다`

## 3. 게임 한눈에

- **네 갈래 방어선**. 북 · 동 · 남 · 서 네 길로 오는 적을 **최대 4명이 협동**해 막는 실시간 웹 디펜스. 설치 없이 브라우저(PC · 휴대폰).
- 모드 ① **방어전**: 대기실 → 웨이브 → 중간중간 **보스 결전**(각자 캐릭터로 보스를 친다) → 능력 카드 → 결과. 방 코드 4글자, `TEST` 는 테스트 서버.
  - 병과(= 탑) 11종 `archer` `sniper` `cannon` `bolt` `flame` `poison` `frost` `gravity` `supply` `corrode` `paladin`, 1~4단계. 난이도 쉬움 · 보통 · 어려움 · 지옥.
  - **방장 전용**: 시작 · 난이도 · 라운드 · 일시정지(결전 중에도) · 속도. 손님 화면에서는 버튼이 비활성.
- 모드 ② **RPG**: 서버 RPG1~RPG4(서버당 10명 `RPG_SERVER_CAP`). 광장 · 에르덴 마을(옛 새벽숲, id `dawnwood`, 광장 북쪽 문 · 메인 이야기 시작지) · 사냥터 21곳(1~400) · 계몽의 문 뒤 400~800 사냥터 8곳 · 타락한 천궁 오른쪽 800~1200 사냥터 8곳(`highData.js`) · 던전 · 심연의 탑(400레벨 · 끝없는 층 · 주간 순위 · 강화 카드 200종 `abyssCardData.js`) · 월드보스 · 길드 · 결투 · 거래 · 장터 게시판 · 의뢰 · 광장 미니게임 몹 레이스(`raceData.js`). 최고 1200레벨(`LV_MAX`, 11월 8일 800 → 1200), 200레벨 1차 전직, 스탯 5종(하나에 1200 `STAT_MAX`).

## 4. 기술 구조

| 구분 | 내용 |
|---|---|
| 화면 | React 19 + Vite 8. 판은 `<canvas>` 에 직접 그린다 |
| 실시간 | Cloudflare 워커 `four-lane-rpg`(2026-10-28 Supabase 한도 초과로 옮김). 방어전 방 · 관리 채널은 `Relay` DO(`/room/<코드>`), RPG 는 서버 방 `RpgRoom`(`/rpg/<서버>`) |
| 판정 | 방어전은 **방장 브라우저**가 판정하고 손님은 입력만 보낸다. RPG 는 기본이 **전용 서버 판정**, `?srv=off` 면 방장 브라우저 방식. 규칙 코드는 `src/game/` 을 서버도 그대로 묶어 쓴다 |
| 장부(계정 · 저장) | D1 `four-lane` + 장부 DO `Ledger`(`server/src/ledger*.js`, 함수 이름 · 인자 `p_*` 는 옛 Supabase rpc 와 같다). 화면은 `ledger(fn, args)`(`src/net/api.js`), 전용 서버 방에서는 방 웹소켓의 `ledger` 말로 서버에 부탁한다. 표는 `server/schema.sql` |
| 저장 | RPG 캐릭터는 이름 + 숫자 5자리 코드로 장부와 localStorage 둘 다. 홈 이름 · 설정은 localStorage |
| 소리 | 파일 없이 웹오디오 합성(`sfx.js`) |

### 파일 찾는 법

- **수치는 데이터 파일 한 곳**, 규칙은 짝 파일, 그림은 `*Art.js`, 창은 `src/*Panel.jsx`.
  - 방어전: `world.js`(상수 · `TOWERS` · `DIFFS` · `makeGame`) · `logic.js`(규칙, 위쪽에 밸런스 상수, 스냅샷 `packSnapshot`/`applySnapshot`) · `art.js`.
  - RPG: `rpg.js`(규칙 본체) · `rpgArt.js` · `src/RpgView.jsx`(화면 · 입력). 기능별 수치는 `*Data.js`(item · shop · junk · armor · dungeon · abyss · skill · skillPx(스킬 상점 스킬 pixelfx 연출) · worldBossPx(월드보스 pixelfx 연출) · adv · deep · fieldLook · train · request · social · book · guild · worldBoss · worldEquipment · stormWeapon · jobTune · combatRules · duelBalance …).
- `src/game/towerInfo.js`: 탑 설명 숫자를 손으로 적은 곳 — logic.js 를 고치면 같이 고친다.
- `src/game/updates.js`: 대기실 업데이트 노트 · `RPG_NOTICE`. `bookData.js`: RPG 패치노트 책.
- `src/App.jsx`: 화면 흐름 · 방 연결 · 방장 권한 · 테스트 패널. `src/net/`: 방 연결 · 전용 서버 · 장부 호출 · 버전 확인(`version.js`).
- `server/src/`: `room.js`(RPG 방) · `relay.js` · `ledger*.js` · `save.js` · `index.js`.
- `tools/`: 시험(`*.test.mjs`)과 그림 자르기 스크립트. `design/`: 원본 그림(게임이 직접 쓰지 않음).
- `.claude/skills/`: `codex-image`(Codex 로 그림 생성 — 새 세션은 Codex 로그인이 비어 있다, `bash tools/codex-ready.sh` 로 먼저 점검) · `pixelfx`(외부 MIT 라이브러리로 픽셀 연출 시트 뽑기, 외부 코드는 scratchpad 에 받아 확인 후 실행).

## 5. 바꿀 때 사용자 확인이 필요한 규칙

### 방어전
- **강화 비용**: 1→2, 2→3 은 `건설비 × UP_MUL[1.8, 3]`. 3→4 는 탑마다 `def.up4`, **300 을 넘지 않는다**. 지금 값: 서리 · 중력 · 화염 · 대포 · 저격 300 / 독 280 / 번개 · 궁수 260 / 보급소 220 / 부식 200 / 성기사 120.
- **궁수 4단계**: 공격 속도 약 17배, 한 발 피해 `ARCHER_LV4_DMG_MUL = 0.14 * 0.45`.
- **4단계 탑 한도**: 한 사람당 1개(지옥 2개, `DIFFS[].cap`). 테스트 서버도 기본 적용, 테스트 패널 스위치(`g.testCapOff`)로만 푼다.
- **서리 4단계**는 3초 "얼림"(효과는 기절, 그림은 얼음). 기절 연출 코드는 지우지 않는다.
- **중력탑**: 가장 뒤의 적을 쏘고 맞은 자리에 중력장. **어시스트 골드**: 서리 · 중력이 건 적을 4초 안에 다른 탑이 잡으면 처치 골드의 30%.
- **성기사**: 성채 피해 감소 단계당 6%(합쳐 최대 45%), 결전 스킬은 아군 체력 60% 보호막.
- **대군주**: 체력 ×0.7, 사람이 주는 피해 ×1.4(`ARENA.titanHp` · `titanDmg`).
- **결전 중 성채 체력**: 맞은 피해를 바로 깎지 않고 **쓰러질 때** 성채에서 깎는다. 결전이 끝나면 줄어든 체력만큼 정산, 0 이면 패배.

### RPG — 깨면 기록 · 저장이 망가지는 것
- **스냅샷 차례 목록은 뒤에만 더한다**: `MAP_IDS` · `MOB_TYPES` · `REC_IDS` · `TITLES` · `BUFF_KEYS` · `REQUESTS` · `ADV_IDS` · `SHOPS` NPC 등. 몹 종류를 더하면 `REC_IDS` 에도 꼭 더한다.
- **손님에게 보여야 하는 새 상태는 스냅샷에 넣는다.** 넣지 않으면 방장 승계 · 서버 재접속 뒤 사라진다. 영웅 줄 끝 번호는 `docs/작업-상세-기록.md` 에서 확인한다.
- **DB(장부)를 직접 고치지 않는다.** 접속 중 10초 저장이 덮어쓴다. 대신 쓰는 것:
  - 모두에게 선물 `GIFT.id` · 한 사람 선물 `PERSONAL_GIFTS` · 한 사람 되돌리기 `PERSONAL_ROLLBACKS` · 서버 초기화 `RESET.id`(모두 `itemData.js`).
- **숨은 칭호(이스터에그)**: 직업과 다른 묶음 무기로 얻는 칭호는 얻기 전 칭호 창에 보이지 않고, **업데이트 노트 · 공지 · 화면 문구 어디에도 미리 적지 않는다.**
- **적룡 지팡이 · 크림슨 레퀴엠 · 영상 무기 등 `hold` 무기의 얻는 곳은 사용자가 정한다.** 그때까지 상점 · 특가 · 상자 · 관리자 자동 지급에서 뺀다.
- **월드보스 신규 무기 스킬은 기존 스킬 연출을 재사용하지 않는다**(전용 `sk_wb_*`).
- **원소는 마법사만**(`ELEM_JOBS`). 전직 초기화 · 원소 전환 물약은 150만 코인(`CLASS_POTION_PRICE`). 전직은 이 물약으로만 비운다.
- 서버별 월드보스 · 서버 정원 10명 · 길드 수치 · 거래 품목 12개 · 3분 · 장터 게시판(5칸 · 48시간 · 수수료 5% · 서버 공용)은 사용자 결정이다. 바꿀 때 묻는다.

### RPG — 업데이트할 때마다
- 패치노트 책: `bookData.js` `PATCH_BOOKS` **맨 위에 한 권**. 밸런스 수치를 바꾸면 전후 값을 적는다.
- 접속 때 안내 창이 필요하면 `RPG_NOTICE`(`updates.js`) id 를 바꾼다.

기능별 상세 규칙(심연의 탑 · 관리자 캐릭터 · 명령어, 보스 재료 · 강화, 방어구, 던전, 스킬 칸, 직업 · 무기 스킬, 전직 · 숙련도, 400~800 사냥터, 사냥터 PvP, 월드보스, 길드, 거래, 의뢰 · 퀘스트 마스터, 장터 게시판, 결투, 경험치, 방장 승계 · 넘기기, 한 캐릭터 한 곳, 마우스 이동, 잡동산이 상점, 직업 능력 조정)은 `docs/작업-상세-기록.md` 5장과 끝의 "10월 30일" 장들에 있다. 그 기능을 고치기 전에 해당 항목을 먼저 읽는다.

### RPG — 결투 밸런스 (11월 4일)
- 결투 전용 수치는 `duelBalance.js`의 `DUEL` 한 곳. 피해 ×0.03 뒤 평타 4% · 스킬 18% · 궁극기 25% 상한을 적용하고 상대 방어·보호막으로 넘긴다.
- 지연 타격·다단히트·투사체·장판·지속 피해·추가타는 원래 시전 객체를 보관하고 대상별로 상한을 나눠 쓴다.
- 회복 50%는 한 번만. 보호막은 생성량만 60%. 자동 회복은 피해 없이 7초 뒤 초당 1%이며 회복 50%를 다시 곱하지 않는다.
- **차단 · 신청 간격(11월 7일)**: 차단 목록은 가방 `bag.bk`(캐릭터 이름, 50명 `BLOCK.max`, `block.js`), 입력 `block {op:add|del,name}`. 결투 신청 · 파티 초대는 판정에서 막고(나를 차단한 사람에게는 이유를 숨긴다) 채팅 · 말풍선은 화면(`RpgView.jsx` chat)에서 거른다. 거래 요청은 아직 막지 않는다. 결투 신청은 `DUEL.askGap` 5초 · 같은 사람 `reaskGap` 20초, 받아들여지면 간격을 지운다(`h.duelAsk`). 시험 `tools/block.test.mjs`.
- 사냥터 PvP는 `rpg.js`의 `FIELD_PVP`(×0.3 · 평타 3% · 스킬 12% 완만한 상한)로 유지한다. 시험: `node --test tools/duel-balance.test.mjs`.

## 6. 작업할 때 지킬 것

- 밸런스 숫자는 **이름 붙은 상수**로 두고, 바로 옆에 한국어 주석으로 이유를 적는다. 매직 넘버를 흩뿌리지 않는다.
- 코드 주석 · 화면 문구는 한국어. 주변 코드의 말투와 밀도를 따른다.
- 탑 수치를 바꾸면 함께 고칠 곳: `world.js`/`logic.js` → `towerInfo.js` → (필요하면) `updates.js` → `docs/기능-명세서.md`.
- **업데이트 노트**(`updates.js`): 새 소식은 맨 위에 더한다. `id` 는 순서용이라 이미 나간 것은 고치지 않는다. 화면에 보이는 `date` 는 **실제 한국 날짜**. 사용자에게 보이는 변경은 노트에 남긴다.
- **그림**: 경로 · 파일 이름은 그대로 두고 그림만 바꾼다. WebP, 투명 배경, 크기 · 기준점은 `public/assets/game/README.md`. 못 불러와도 깨지지 않게 코드 대체 그림을 남긴다. 누끼는 흰 깃털 · 옷이 지워지지 않게 색 조건을 좁힌다.
- 테스트 서버 비밀번호는 해시(`TEST_HASH`, `App.jsx`)로만 둔다. **평문을 저장소에 적지 않는다.** 시험은 `localStorage["flg:test"] = TEST_HASH`.
- 새 영웅 필드를 더할 때는 `grep` 으로 이름이 비었는지 먼저 본다(`h.inv` 겹침 사고).
- 자주 보내는 "마지막 상태" 메시지를 더할 때는 차례 번호 `q` 를 싣는다(같은 사람 메시지도 순서가 바뀌어 온다). 워커 · DO 요청 수와 D1 쓰기 한도(하루 10만)를 먼저 셈한다.
- 새 연출은 알갱이 수에 `nq()` 를 쓰고, 남의 연출은 `CROWD` 규칙으로 줄어드는지 본다. 그리기 시간은 `getImageData` 로 칠하기까지 재야 정확하다.
- 새 요청 종류 · 새 맵은 옛 화면(옛 방장)이 모른다. `version.js` 가 새로 고치지만 이 점을 기억한다.

## 7. 확인 절차 (push 전에 꼭)

```bash
npm install            # 처음 한 번
npm run build          # 빌드가 통과해야 한다
npm run lint           # oxlint — no-undef 로 import 누락을 잡는다(빌드는 통과해도 화면이 흰색이 된다)
npx vite --port 5199   # 백그라운드로 띄운다. 자주 죽으니 연결 거부가 나면 다시 띄운다
```

- 고친 기능의 시험을 돌린다: `node --test tools/<기능>.test.mjs`. 서버 접속 시험은 wrangler dev 를 먼저 띄운다.
- 화면 확인은 Playwright(크로미움이 `/opt/pw-browsers` 에 있음, `playwright install` 하지 말 것).
- 규칙 변경은 페이지 안에서 `makeGame` 과 logic 함수를 직접 불러 숫자로 검증한다.
- 여러 명 동작(방장 · 손님)은 브라우저 컨텍스트 둘을 띄워 같은 방 코드로 들어가 본다.
- 끝나면 push → Vercel 배포 READY 확인 → 사용자에게 보고.

## 8. 겪었던 함정 (한 줄 교훈, 경위는 상세 기록)

- 업데이트 노트 날짜를 id 그대로 적었다 → `date` 는 실제 날짜.
- 테스트 서버가 4단계 한도를 무시해 "버그" 보고 → 기본 적용, 스위치로만 끈다. 좁은 칸 문구는 짧게.
- 결전 중 일시정지가 안 됐다 → 일시정지 처리에서 결전 상태도 허용한다.
- 남의 기록이 다른 캐릭터에 덮어써졌다 → 기록을 실을 때 자리 주인 id(`who` · `sw`)와 캐릭터 이름이 맞는지 본다. 레벨이 내려간 기록은 저장하지 않는다.
- 방장이 잠깐 둘이 되어 기록이 섞였다 · 세계가 되돌아갔다 → 손님은 지금 방장 스냅샷만 받고, 더 큰 ep 를 들은 방장은 물러난다.
- 전용 서버가 미국 · 홍콩에 생겨 느렸다 → DO 는 처음 생긴 곳에 머문다. 아시아(서울) 위치 힌트 · `GENS` 를 쓰고 점검은 `CHECK` 방으로 한다.
- 스킬을 몰아 쓰면 버벅였다 → 판정이 아니라 그리기가 무거웠다. 연출 수 · 알갱이를 줄인다.
- 가방을 열면 흰 화면 → import 누락. `npm run lint` 로 잡는다.
- "알 수 없는 요청입니다" → 옛 화면이 판정하고 있었다.
- 세션 브랜치와 기본 브랜치에 같은 커밋을 동시에 push 하면 Vercel 이 미리보기만 만들고 운영 배포를 건너뛸 수 있다 → 운영 배포가 안 생기면 기본 브랜치에 커밋을 하나 더 올린다(미리보기를 운영으로 올리지 않는다 — 환경 변수가 다르다).

### 새벽숲 마을 (11월 5일)
- `villageData.js`가 위치·인물·대화·충돌·길·그림 규격을 관리하고 `villageArt.js`가 바닥·건물·주민을 그린다. `dawnwood`는 `MAP_IDS` 맨 뒤에 추가했다.
- 광장 북쪽 문 ↔ 마을 남쪽 문. 안전 지역이며 기존 상점·의뢰를 복제하지 않는다. 메인 스토리·보상·진행 저장은 아직 없다. 장소·NPC id는 이후 이야기에서도 유지한다.
- `VillagePanel.jsx`는 기존 `.shop` 틀에 하단 대사 상자·큰 초상화를 배치한다. 클릭·Enter·스페이스로 넘기고 Esc로 닫는다. 상세 기획·참고 출처는 `docs/새벽숲-마을.md`. 시험은 `tools/village.test.mjs`.

### 메인 스토리 1부 맵 · 인물 (11월 6일, 정식 그림)
- `storyData.js`가 1~6장 맵 10곳(`convoy` `lab7` `ruin-*` 4 `core` `relay` `mine` `vault`, `MAP_IDS` 마을 뒤) · 인물 7명 · 마을에 더한 시설 3과 인물 4를 관리한다. `storyArt.js`가 그림(없으면 임시 도형)을 그리고 `public/assets/game/rpg/story/` 에 같은 이름의 그림이 있으면 그림을 쓴다(그림 자리 표는 그 폴더 README).
- 에르덴 마을 가장자리 문 6곳(`storyData.js STORY_GATES`)으로 이야기 맵에 간다. 이야기를 그 장소까지 진행해야 열린다(`storyGateOpen`, 관리자는 늘 열림). 봉인 유적은 `RUIN_CHAIN` 순서로 이어지고 서쪽 유적 → 중앙 제어 시설. 관리자 `/이동` · 대화 끝 `go` · 퀘스트 창 "가기"도 그대로다. 안전 지역. 마을 화면 이름은 에르덴, 기록관 주민은 소은(설계자 세린과 구분). 상세는 `docs/메인스토리-1부-맵.md`, 시험은 `tools/story.test.mjs`.

### 메인 스토리 1~30장 (11월 7일 v3.0 전면 개편 · 11월 8일 v4.0)
- 기준 문서: 프로젝트 `notes/메인스토리-1-30장-수정본-v4.md`(v3 에 장면마다 추가 대화 · 연출 지시를 더한 판, 사건 · 선택지는 v3 와 같다). 상세는 `docs/메인스토리-1-30장.md`.
- v4 추가 대화 90개는 말하는 인물이 있는 단계에 넣었다(옮긴 표는 상세 문서). 대화 창 「기록」 단추가 이번 대화의 지난 대사를 보여 준다(`.story-log`).
- 단계 · 대사는 부마다 `storySteps1~5.js`, 묶음 · 공통 함수는 `storyQuestData.js`, 줄 도우미(`L` `me` `sys` `nar` `beat`)는 `storyLines.js`, 규칙은 `storyQuest.js`. **단계 차례는 저장 값이라 뒤에만 더한다.**
- 진행은 가방 `bag.sq = {r: 판(STORY_REV=2), i, n, c: 꼬리표, t: 관계 -2~+2}`. 판이 다른 옛 진행은 `OLD_STEP_CH` 로 같은 장 처음에 옮기고 옛 꼬리표는 버린다.
- 장기 분기는 쌍점 꼬리표(`S1_RESCUE:supply`, 문서 플래그 16개)로 한 번만 확정된다. 줄 조건 `if` / `not` / `tr`(관계).
- **서버 권위**: 화면은 고른 대답 번호 `picks` 만 보내고 서버가 `storyPicks` 로 장면을 다시 따라가 꼬리표 · 관계를 정한다. 맞지 않으면 진행하지 않는다.
- 이야기 맵 23곳(1부 10 + `STORY_MAPS_2` 13, `PLACE()` 로 배치, 그림은 임시 도형). 대화 창 `VillagePanel.jsx`, 진행 칸 `StoryCard.jsx`(부 · 장 표시), 기믹(`order` · `hidden` · `wrong` · `timer`)은 그대로다.
- 완결 보상(30-05 `STORY_CLEAR_ID`): 기록 `rec.story`(REC_IDS 끝) → 칭호 `story30` 「네 갈래의 증인」(체력 +2점) · 단 칭호의 발밑 네 갈래 빛(`rpgArt.js STORY_TITLE`) · 가방 책 탭의 기념 기록서(내 선택으로 만든다). 완결 뒤 마을 인물은 후일담 대사(`storyAfter.js STORY_AFTER`). 칭호 비트는 11월 9일 세 칸(93개)으로 늘었다.
- **전달 개선(11월 8일)**: 단계 `look`(단서를 다 봐야 `at` 이 열림, 서버도 거절) · 줄 `key` · `fx` · `boss`(체력 줄은 보여 주기만). 의뢰 칸 상황 · 이유 `storyGuide.js`, 알게 된 것 · 장 요약 · 마을 말 `storyRecap.js`, 이야기 기록 `storyJournal`(저장 값 없음, 찾은 것만). 시험 `tools/story-guide.test.mjs`.
- 보스 실제 전투는 아직 없다(보스는 시간 제한 선택 대화). 광장의 의뢰 NPC 한결 · 보리 · 미나는 이름만 같은 다른 인물이다. 시험은 `tools/story-quest.test.mjs` · `tools/story.test.mjs`.

### 에르덴 도서관 (11월 16일)
- `libraryData.js` 한 곳(건물 자리 · 문 · 두 층 · 조사물 · 사서 · 가구 막힘 `LIBRARY_BLOCKS`). 이야기 맵과 같은 틀이라 `storyData.js PLACE_MAPS`(= `STORY_MAPS` + 도서관)로 찾는다. `STORY_MAPS` 에는 넣지 않는다(맵 차례 · 이야기 문 판정).
- 맵 `erden-library` · `erden-library-2` 는 `MAP_IDS` 맨 뒤(BLOOD_LAB 다음). 늘 열림(이야기 진행 무관), 안전 지역, `top: 300`(벽 띠). 마을 문(건물 앞 계단 아래) ↔ 1층 ↔ 오른쪽 계단 ↔ 2층. 문 그림은 `libGate`(바닥 빛 · 이름표만, `villageArt.js`).
- 바닥 그림에 가구가 그려져 있어 조사물은 `bg: 1`(그림 없음 · 이름표만). `books: 'patch'` 는 대화 창 「책 펼치기」로 가방 책 탭을 연다(`BagPanel book0`). 보상 · 이야기 진행은 없다. 그림 원본 `design/library/`, 시험 `tools/library.test.mjs`.
- **장서(사용자 기획 · 원고 11권)**: `shelf: 탭` 조사물(1층 「에르덴 장서」 · 2층 「옛이야기 서가」)은 대화 대신 `LibraryPanel.jsx`(책장 → 펼친 책)를 연다. 원고 · 탭 · 책 종류 · 열람 시점은 `libraryBooks.js` 한 곳(`LIB_OPEN_AFTER` 7 · 8 은 1장, 9 · 10 은 4장 뒤). 꽂이 책은 고를 수 없다. 펼친 책 바탕은 공용 그림 `rpg/library/book-open.webp`, 본문은 글자로 놓는다(넓으면 두 쪽, 720px 아래 한 쪽). **붉은 강 설화(BLOOD-001)의 001 단서는 오른쪽 쪽 마지막 문장에만** 둔다(시험이 지킨다). 저장 값 없음.

### 빈 맵 멈춤 · 맵 불러오기 화면 (11월 7일)
- `rpgStep`은 사람이 있는 맵(`mapsAwake`)의 몹만 돌리고, 빈 맵은 다시 나오기 대기 시간도 멈춘다. 월드보스 · 길드 토벌 보스는 예외로 늘 돈다. 훈련장 허수아비는 빈 훈련장에서 치운다. 전용 서버 방은 원래 아무도 없으면 통째로 멈춘다. 시험 `tools/map-idle.test.mjs`.
- 화면은 내 맵이 바뀌면 `mapLoad.js` 가림막을 띄운다. 새로 부른 그림(`new Image()`의 src)을 세어 다 오면 걷는다(최소 1.2초 · 최대 8초, `MAP_LOAD`, 진행 줄은 최소 시간에 맞춰 찬다). 가림막 동안 걷기 · 공격 · 스킬 · 말 걸기는 보내지 않는다(`loadBlocks`). 판정은 서버라 그 사이 몸은 이미 새 맵에 있다.

### 월드보스 등장 연출 (11월 8일, 보스 5종 전용 · 4초 · 등장 문구)
- 수치 `worldBossIntroData.js`(`WB_INTRO` 공통 시간표 · `WB_INTRO_SCENE` 보스마다 장면 · 문구 `cry` · 화면 효과 `screen` · 소리 차례), 재생 상태 · 화면 효과 · 문구 `worldBossIntro.js`(화면에만, 이 기기 시계, 스냅샷에 싣지 않음), 보스 몸 · 땅 효과 `worldBossArt.js`(`introBody` `introGround` `introOver`), 소리 `sfx.js INTRO_SND`. RpgView 루프가 `tickWbIntro`(drawRpg 앞) · `drawWbIntroHud`(뒤)를 부른다. 판정 · 위치 · 공격 시간은 그대로.
- 사용자 기획 시간표(약 4초): 0~0.5 가장자리 어둠 · 다른 소리 작게(`wbDuck`) → 0.5~1.5 보스 고유 효과(장면 시각 = 입장 − `lead`) → 1.5 붉은 문구(#E53935, 약하게 커지며) → 2.5 문구 아래 이름(회백색) → 3.3~4.0 문구가 사라지고 체력바가 나온다(`wbBarHidden`, `WorldBossPanel.jsx .rpg-wb-bar`). 문구는 화면 폭에 맞춰 줄인다. 흔들림 · 섬광은 과하지 않게, 공허는 흔들림 · 섬광 없이 조용하게.
- 새 출현은 다른 맵에서 가장자리 빛 + `wbHorn`. 출현(`a.key`)마다 첫 입장 한 번, 다시 들어오면 왼쪽 아래 이름표만. 싸우는 중(`wbInCombat`: 공격 · 기절 · 웅덩이, 또는 다른 사람이 있고 체력이 깎임)이어도 이름표만. 연출 중 `a.attack` · `a.stun` 이 생기면 모든 연출을 걷고 `wbStop`(소리 멈춤 · 다른 소리 되돌림), 다시 틀지 않는다. 퇴장 · 처치 · 다른 출현이면 곧바로 지운다. 소리는 정한 때에 tick 이 부른다(미리 예약하지 않음). 화면 알갱이는 `setWbIntroQuality`(rpgArt lod.q)로 줄인다.
- **연출 중 공격 금지(판정)**: 성역 입장(`worldBossInput` enter) 때 싸우는 중이 아니면 `a.cd` 를 `WORLD_BOSS.introGrace`(4.2초) 이상으로 늘린다. 연출 길이를 바꾸면 이 값도 맞춘다. 소환비 `WORLD_BOSS.fee` 35만(11월 8일 사용자 결정, 화면 문구는 이 값에서 만든다).
- 새 보스를 더하면 `WB_INTRO_SCENE`(+ `SCREEN` 효과) · `WB_INTRO_LINE` · `worldBossArt.js` 장면을 더한다. 시험 `tools/world-boss-intro.test.mjs`.

### RPG 테스트 모드 `?test` (11월 7일)
- 주소 `four-lane.vercel.app/?test` 에서만 켜진다(`src/net/testMode.js TEST_MODE`). 일반 주소에는 버튼도 없다. 방어전 테스트 서버(방 코드 TEST · 비밀번호)와 다른 것이다.
- RPG 는 테스트 전용 서버 방 `RPGT`(`testData.js TEST_SERVER`)에만 들어간다. 이 방은 캐릭터를 장부에서 **읽기만** 하고 저장하지 않는다(`room.js this.test`). 거래 · 길드 · 장터 · 탑 주간 보상은 `err:"test"`. 화면도 기기 기록을 고치지 않고, 계정 만들기 · 지우기 · 저장 · 접속 표시 장부 요청을 보내기 전에 막는다(`TEST_BLOCK_RPC`). 접속 중 표시를 남기지 않아 일반 서버와 함께 켤 수 있다.
- 기능은 훈련장 기능(`h.trn`)을 테스트 방(`g.test`)에서 모든 맵으로 넓힌 것: 무적(`hurtHero` 첫머리 — 즉사기도 막음) · 쿨타임 끄기 · 스택 가득 · 모든 몹 초당 피해 · 장소 이동(`rpgTrain` op `go`, `testSpots` — 던전 · 결투장 · 레이스 · 길드 칸 제외). 창은 오른쪽 위 「테스트 서버」 칸의 「도구」와 ☰ 메뉴. 시험 `tools/test-mode.test.mjs`.
- 사용자가 "이건 테스트 서버에 먼저 적용하자"라고 말한 작업만 테스트 서버에 먼저 넣고, 사용자가 확인한 뒤 실제 게임에 넣는다. 그 말이 없으면 바로 배포한다.

### 최고 레벨 1200 · 800~1200 사냥터 8곳 (11월 8일, 실제 게임에 열림)
- `highData.js` 한 곳(지역 · 몹 · 정예 · 보스 기술 · 재료 · 그림 규격). 규칙 `highCombat.js`, 그림 `highArt.js` · `highFxArt.js`, 시험 `tools/high.test.mjs`.
- 테스트 서버에서 먼저 확인한 뒤 `HIGH.live = true` 로 모든 서버에 열었다. live 를 false 로 되돌리면 테스트 서버(`g.test` · `g.high`)에서만 열린다(`highOn(g)`, 문은 `gatesOf(g, M)`). 장부 순위 레벨 검사는 네 자리(`ledger.js` `{1,4}`).
- 맵 · 몹 · 기록은 기존 목록 끝에만 붙였다. 모든 공격은 바닥 예고(`sk_hi_warn`)와 판정이 같은 모양. 그림 규격 `docs/고레벨-사냥터-그림-규격.md`, 상세는 `docs/작업-상세-기록.md` 끝.

### 심연의 탑 보상 개편 (11월 9일)
- 수치 `abyssData.js`(교환 · 상자 · 돌파 · 순위 · 외형), 규칙 `abyssReward.js`, 외형 그림 `abyssLookArt.js`(코드 그림). 상세 `docs/심연의-탑-보상-개편.md`, 시험 `tools/abyss-reward.test.mjs`, 난이도 측정 `tools/abyss-floor-balance.mjs`.
- 파편 · 인장 상한 99,999 — 재료 상한은 늘 `matMax(id)` 로 본다(`MAT_MAX` 를 직접 쓰지 않는다).
- 새 물품 · 상자 · 돌파 보상은 전용 서버만 판정하고 요청 id(`rid`)로 두 번 처리를 막는다. 가방 `bag.ab` 에 저장. 외형 · 돌파 차례는 뒤에만 더한다.
- 주간 순위 수령은 장부 `abyss_claims`(캐릭터 · 주 PK) · 굳힌 순위표 `abyss_boards`. `ABYSS_RANK.v2From` 앞선 주는 예전 표.
- 칭호는 63개, 비트 묶음 셋(`TITLE_CHUNKS`, 스냅샷 row[54].t3).

### 물약 제작 · 연금술 (11월 9일)
- 수치 `alchemyData.js` · 규칙 `alchemy.js` · 그림 `alchemyArt.js` · 창 `AlchemyPanel.jsx`. 상세 `docs/작업-상세-기록.md` 끝, 시험 `tools/alchemy.test.mjs`.
- 제작 레벨 1~50은 가방 `bag.al`. 일반 물약은 제작 레벨 50부터 산다(`whyPotionBuy` · 서버도 같은 함수). 특별 물약 셋(`SPECIAL_POTIONS`)은 그대로.
- 채집물은 `HERBS`(차례가 번호 — 새 사냥터는 `TIERS` 뒤에만). 판정은 서버, 스냅샷 `hb` · row[54].ga. 재료 8종은 `MATERIALS` 끝(되팔기 0).

### 히든 직업 BLOOD-001 (11월 14일, 단계 작업 중)
- 1차 전직을 대신한다(사용자 결정). 1단계 적혈탄 · 혈량 전환, 2단계 혈수 강타 · 혈검 · 혈막(직업 레벨 20), 3단계 혈량 상태(증폭 · 과충전 · 폭주 · 탈진) · 혈역 증폭(직업 레벨 100), 4단계 해금 경로(단서 셋 → 입구 → 맵 `bloodlab` 1인 시험, `bloodUnlock.js`, 가방 `bag.bu`). 수치 `bloodJobData.js` · 규칙 `bloodJob.js` · 그림 `bloodJobArt.js` · 화면 `BloodHud.jsx`. 저장 `bag.bd`, 스냅샷 영웅 줄 56. 시험 `tools/blood-job.test.mjs`. 상세 `docs/작업-상세-기록.md` 끝 · 프로젝트 `notes/블러드001-설계-정리.md`.
- 그림(UI 등)은 Codex, 이펙트는 pixelfx 로 만든다.
- **연출은 pixelfx 시트(`blood-job/px/`, `bloodJobPxData.js`)만 쓴다.** Codex 이펙트 레이어는 지웠다. 코드로 그리는 것은 1px 범위 예고선 · 남은 시간 띠 · 글자 · 표식뿐(11월 14일 사용자 지시). Codex 는 UI 그림(오른쪽 판)에만 썼다.
- **혈검(11월 15일 사용자 지시)**: 누르면 0.25초 생성(피해 없음) → 50초 손에 들고 **평타를 새로 누를 때만**(`rpgFire` 의 `fresh`, `bloodSwordPress`) 한 번씩, 횟수 제한 · 혈량 회수 없이 위아래 번갈아 벤다(11월 15일 사용자 — 5초 · 3번 · 3타 회수 10 에서 바꿈). 누르고 있던 평타 · 키 반복 · 자동 평타는 베지 않고, 든 동안은 원래 무기 평타도 막는다(`bloodSwordOn`). 대기 `BLOOD_FORM.sword.cd` 6초는 혈막 대기(`cd.form` 15초)와 따로. 상태 `h.bd.sw` → 스냅샷 줄 56 의 11번 칸, 대기는 4번 칸 6번째. 손에 든 검은 `rpgArt.js drawHero` 가 `bloodJobArt.js drawBloodBlade` 로 그린다. 형상화 연출 시트(`bj_sw_*` · `bj_arc*` · `bj_vl_*` · `bj_hd_*`)는 `design/effects/pixelfx/blood-job/blood-form.js`(새 pixelfx 이펙트) · `make-form.mjs` 로 뽑고, 밝은 외곽은 `_rim` 시트로 따로 그린다.
- **혈량 · 스킬 개편(11월 15일 사용자 기획)**: 한계는 직업 레벨을 따른다 — 안정 `100 + 5 × floor(lv/5)` · 증폭 +25 · 과부하 +50(`BLOOD.cap`, `stableCap`/`bloodCaps`, 화면 구분선 · 경고 `overWarn` · 저장 검사가 같은 함수). 혈량은 늘 5 단위(`BLOOD.unit`, `gainBlood` 가 내림), 처음 100, 과부하면 60 으로 폭주. 안정 한계를 넘는 것은 혈역 증폭(+10/초)뿐, 넘친 몫은 1초에 한 번 10씩 준다. 30 아래 PvE 자연 회복(`BLOOD.regen`, 엔진 `E.pvp` 에서 멈춤). 해금 레벨 `BLOOD.unlock`(적혈탄 1 · 혈수 강타 5 · 혈검 · 혈막 10 · 혈류 파동 15 · 혈쇄 갈고리 20 · 혈역 100), 연마 `TRAIN_UNLOCK` 1 · 5 · 10. 적혈탄 대기는 쏜 단계별(`tiers[].cd` 0.1 · 0.5 · 0.7초, 11월 16일). 적혈탄은 누르는 동안 모으기만 하고(1.2초에 2단계로 멈춤) 뗄 때만 쏜다 — 자동 발사 없음(11월 16일 사용자). 차징 구슬은 `bj_core`(blood-form.js core, 2배 · 화면 지름 약 22px). 새 스킬 `BLOOD_WAVE`(포인터 자리 `inputPt`, 가장자리가 지나간 대상마다 한 번) · `BLOOD_HOOK`(대상 · 길이 없으면 시전 안 함, `E.move` 로 시전자만 이동, 손님 화면은 줄 56 의 12번 칸이 있으면 큰 보정도 나눠 옮긴다 — `rpg.js` 스냅샷 적용). 키 H · J(`bWave` · `bHook`). 스킬 판 5 × 2, 아이콘 시트 4 × 3. 연출 `bj_wave`(반지름마다 한 칸 — 판정 반경에 가장 가까운 칸) · `bj_hk_*`. 시험 `tools/blood-job.test.mjs`.
- **BLOOD-001 이면 일반 스킬 칸(1 · 2 · R) · 큰 기술 · 전직 스킬을 쓰지 않는다**(판정 `rpgInput.js` · 화면은 단추를 숨김). 큰 기술 키(Shift · 터치 스킬 단추)가 혈역 증폭이다(11월 14일 사용자 결정). 전직 초기화하면 다시 열린다. 혈 키는 다른 행동과 겹쳐도 이 직업일 때 먼저 잡힌다(`keys.js BLOOD_ACTS` · `keyMap(binds, first)`, 키 판 3).
- 캐릭터 외형은 사용자가 준 시트(`design/blood-job/char/`)를 `tools/cut-blood-char.py` 로 자른 `characters/rpg/blood-<m|f>/`. `advArtPath` 가 이 직업(`bloodOn` · 손님은 `h.bdv`)이면 이 그림을 준다.
- 넓은 화면 · 마우스 기기는 스킬 · 물약 칸이 판 오른쪽 판(`.rpg-side`, Codex 그림 `rpg/ui/side-panel.webp`)에 있다. 좁은 화면 · 터치는 판 안 아래(`RpgView.jsx useSidePanel`).
- **최종 강화(11월 16일 사용자 기획)**: 기존 피해 상향(적혈탄 ×2.5 · 5.5 · 11 · 혈수 강타 ×9 / 최대 차징 ×11 · 증폭형 50 ×15 + 지면 폭발 ×4 · 혈검 ×1.5 · 형상화 25 ×2 · 50 ×3 · 혈류 파동 ×5 · 갈고리 도착 ×5 + 충격파 ×3)과 연마 50 효과. 신규 `BLOOD_PIERCE` 흑혈 관통 K · `BLOOD_SEA` 혈해 개문 L · `BLOOD_LEGION` 혈형 군단 U · `BLOOD_ORIGIN` 원초의 혈맥 Y(궁극기 `sid "ult"` · 보스 최대 체력 8% 는 `E.flat` = rpg.js `flatMobHit`) · `BLOOD_AWAKE` 원초적 지배 O. 해금은 직업 레벨 + **영구** 연마(`newLock` · `awakeLock`). 피해 강화 순서 `bloodBoost`: × (1 + 혈해 0.4) × (1 + 혈역 증폭형 50 0.3) × (1 + 각성 1.0). 각성 잔상은 시전 객체 `cast.echo` 로 한 번. 줄 탄 `s.ln`(참격파 · 관통) · 분신은 연출 `sk_bj_clone`(0.2초마다, 스냅샷에 자리 없음). 스냅샷 줄 56 의 대기 칸 10~14 · 13~16번 칸을 뒤에 더했다. 시험 `tools/blood-final.test.mjs`.
- **혈량 전환 · 조준 보정(11월 16일 사용자)**: 전환은 최대 체력 5% → 혈량 10 · 대기 0.1초(체력 1 아래면 못 씀). 화면은 손 높이(34)에서 포인터 쪽 방향을 보내고 판정은 발밑 선이라 작은 몹이 빗나갔다 → `snapAim`(`BLOOD_AIM`)이 손 높이 화면 선이 그림 속 몸을 지나가는 가장 앞 적의 발밑 쪽으로 방향을 바로잡는다(적혈탄 · 혈수 강타 · 갈고리 · 흑혈 관통). 적혈탄 충돌 지름 16 → 28.
- **무기 · 레퀴엠 회복(11월 16일 사용자)**: BLOOD-001 은 크림슨 레퀴엠(`BLOOD_WEAPON`)만 든다 — `whyEquip` 거절 · `unlockBlood` · `cleanBag` 가 다른 무기 장착을 푼다(`bloodWeaponOk`). 레퀴엠 평타 · 혈계 추격(무기 시전)이 맞을 때마다 최대 체력 1%(`passive.heal`, `bloodLifeOnHit`, 튄 피해 · 지속 피해 제외, 결투 50%).
- **결투(11월 16일)**: 혈검은 **참격마다 새 시전**(예전엔 생성 시전 하나를 50초 내내 써서 18% 상한을 다 쓰면 피해 0). BLOOD-001 결투 피해는 `DUEL.bloodMul` ×2(상한 · 방어 그대로). 혈역 증폭은 적이 없어도 1초마다 +30(경험치만 적이 있을 때). 신규 아이콘 그림은 아직 없어 칸에 한 글자(`.rpg-ico-txt`) — Codex 로그인이 되면 `skill-icons.webp` 에 더한다.

### 히든 직업 Gambler 002 도박꾼 (11월 16일, 실제 게임에 열림)
- 사용자 기획 「히든직업 002~006 통합기획안」의 002 만. 연습장에서 먼저 확인한 뒤 11월 16일 사용자 지시("이제 실제 게임에 적용해줘, 그리고 명령어도 같이")로 실제 게임에 이었다(`GAMBLER.live = true`, false 로 되돌리면 연습장에서만 켜진다 — `gamblerOn`). 1차 전직을 대신하고 BLOOD-001 과 함께 켜지지 않는다(`unlockGambler` · `unlockBlood` 가 서로 끈다, `cleanHj`). 전직 초기화 물약으로 끄고 직업 레벨 · 연마는 남는다. **히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.**
- 수치 `gamblerData.js` · 규칙 `gamblerJob.js`(엔진 `rpg.js gamblerEngine`, 입력 `hidden {op:"use", s}`) · 해금 `gamblerUnlock.js` · 그림 `gamblerArt.js` · 시트 규격 `gamblerPxData.js` · 화면 `GamblerHud.jsx`(칩 줄 · 스킬 칸 · 스탯 창, BLOOD-001 틀 재사용) · 연습장 칸 `Sandbox.jsx GamblerBar`. 시험 `tools/gambler.test.mjs` · `tools/gambler-live.test.mjs`.
- **저장 · 스냅샷**: `bag.hj = { active, jobs: { gambler: { lv, xp, tr } }, version }`(`shop.js cleanBag` → `cleanHj`, 시험 대여 `trial` 은 저장하지 않고 `prev` 로 되돌린다) · 해금 진행 `bag.gu = { c: 단서 비트, f: 본 것 · 주사위, o: 문 }`(`cleanGu`). 영웅 줄 **57** = `packGambler`(도박꾼이 아니면 0, 칸은 뒤에만 더한다). 손님 화면 값은 `h.gmv`(`gamblerView` · `gamblerLook`).
- **해금 경로(내가 정한 자리 · 방식)**: 단서 셋 중 둘(`GM_CLUE_NEED`) — A 광장 카지노 좌판 옆 「낡은 칩 상자」 · B 에르덴 여관 앞 「빛바랜 계약서」 · C 훈련장 「망가진 주사위 기계」(살펴본 뒤 허수아비 셋을 한 번씩 친다). 자리 `GM_SPOTS`, 상자를 본 뒤에야 나머지가 보인다(`gmSpotShown`). 둘을 모으면 상자가 문이 되어 맵 `casino`(「황금 카지노 뒷방」, `MAP_IDS` 맨 뒤, 1인 시험)로 간다. 시험은 직업 레벨 15 를 빌려 준다(`GM_CASINO.lv`): ① 칩 장막으로 예고 타격 막기 ② 칩 7개 풀 베팅 맞히기 ③ 운명의 눈으로 먼 표적 맞히기 → 해금. 나가면 빌린 직업을 돌려놓는다. 자리 그림은 `gm_props`(직접 그린 도트 5칸).
- **관리자 명령어**: `/도박꾼 <이름> [직업레벨 | 끄기 | 연마 <0~50>]`(별칭 `/갬블러`, `adminCmd.js`). 인자가 없으면 해금만, 숫자는 직업 레벨 1~200, `연마 N` 은 연마 셋을 모두 N, `끄기` 는 `dropGambler`. 거래 · 결투 · 시험 중인 사람에게는 거절한다.
- 화면 키는 새 칸 없이 기존 행동 키를 빌린다(`GM_SLOTS` · RpgView `GM_FIRST`). 키 설정 창에는 따로 칸이 없다.
- **이펙트는 pixelfx 를 쓰지 않는다**(사용자 지시 "직접 만들어줘"). `design/effects/gambler/make.py` 가 한 칸씩 직접 그린 도트 시트 17장(`rpg/effects/hidden-jobs/gambler/px/gm_*.webp`, 해금 자리 그림 `gm_props` 포함)만 쓰고, 코드로 그리는 것은 1px 범위 선뿐. 시트를 고치면 `python3 design/effects/gambler/make.py` → `manifest.json` 값을 `gamblerPxData.js` 에 옮긴다(시험이 같은지 본다).
- 무기를 들지 않는다(`whyEquip` 거절 · 맨손 그림). 일반 스킬 칸 · 큰 기술 · 전직 스킬 · 무기 스킬 입력은 `rpgInput.js` 가 버린다. 키는 기존 행동 키를 빌린다(`GM_SLOTS`: 1 · 2 · 3 · 4 · R · Z · Shift, 평타 = 황금 칩).
- 칩 7개 = 풀 베팅(다음 공격 스킬의 첫 유효 적중에 금화 7발). 시전 객체 — 평타 `basic` · 777 `sid "ult"` · 나머지 18% 상한, 풀 베팅 · 여러 타격은 원래 시전을 함께 쓴다. 내가 정한 해석 목록은 `docs/작업-상세-기록.md` 끝.

### 히든 직업 Engineer 003 엔지니어 (11월 17일, 격자 연습장에만)
- 사용자 지시 "획득 방법은 적용하지 말고 격자 훈련장에 적용해" · "패치노트에는 적지마". `ENGINEER.live = false` 라 sandbox 맵에서만 켜진다(`engineerOn`). 해금 경로 · 관리자 명령어 · 저장 · `HIDDEN_JOBS` 등록은 아직 없다 — 실제 게임에 이을 때 Gambler 002 처럼 더한다.
- 수치 `engineerData.js` · 규칙 `engineerJob.js`(엔진 `rpg.js engineerEngine`, 입력 `hidden {op:"use", s}` 를 `rpgHidden` 이 켜진 직업으로 보낸다) · 그림 `engineerArt.js`(연출 + 설치물 몸 `drawEngineerUnit`, rpgArt 가 발 높이로 줄 세움) · 시트 규격 `engineerPxData.js` · 연습장 칸 `Sandbox.jsx EngineerBar`. 시험 `tools/engineer.test.mjs`.
- 설치물(터렛 · 드론 · 수호자)은 몹 목록과 따로 `h.en.units`. 스냅샷 영웅 줄 **58** = `packEngineer`(아니면 0, 칸은 뒤에만). 손님 화면 값 `h.env`.
- 이펙트는 Gambler 002 처럼 직접 그린 도트 시트(`design/effects/engineer/make.py` → `hidden-jobs/engineer/px/en_*.webp` 21장 · `manifest.json` 값을 `engineerPxData.js` 에 옮긴다, 시험이 같은지 본다). 코드로는 1px 예고 · 범위 선만.
- 외형은 사용자 그림(남 · 여 한 벌씩)을 `tools/cut-engineer-char.py` 로 자른 `characters/rpg/engineer-<m|f>/`(원본 `design/engineer-job/char/engineer-<m|f>-*-sheet.png`). `advArtPath` 가 `engineerLook` 이면 이 그림, 걷는 그림 4장은 Gambler 002 와 같은 규칙.
- 내가 정한 해석 목록은 `docs/작업-상세-기록.md` 끝.
- 11월 17일 연출 보강: 조립·충전·추진기·조준 회로 시트 4장 추가. 총구·명중·포격·광선·충격파 시트를 보강했다. `drawEngineerFx`·`drawEngineerUnit`이 품질 값을 받아 장식 잔상을 줄인다. 판정·전력·대기·스냅샷은 그대로며 패치노트에는 적지 않는다.
- 11월 17일 밀도 보강(사용자 "범위는 큰데 이펙트가 비어 보인다"): 작은 입자 시트 `en_bits`(스파크 청록·금빛 · 불씨 · 금속 파편 · 연기 · 전류 줄기)를 `engineerArt.js bits()` 가 범위 안에 뿌린다. 자리는 연출마다 정해진 씨앗이라 프레임마다 이어진다. 상한 `EN_BITS`(한 연출 56 · 한 프레임 360), `DETAIL` 로 줄어든다. 궤도 포격 · 광선 · 펄스 · 명중 그림도 한 단계 키웠다.

### 히든 직업 유일 규칙 (11월 17일)
- 히든 직업(BLOOD-001 · Gambler 002 …)은 **관리자를 빼고 게임 전체에서 한 명만** 가진다. 먼저 해금한 사람이 갖고, 보유자가 있으면 시험 문(입구 · 카지노 상자)을 열 때 안내가 나오고 해금은 막힌다. 서버 RPG1~4 는 캐릭터 장부가 하나라 서버가 달라도 한 명이다.
- 규칙 · 판별 `src/game/hiddenUnique.js`(`HIDDEN_JOBS` — id 는 장부 표에 적히니 바꾸지 않고 뒤에만 더한다), 장부 표 `hidden_jobs`(`server/src/ledger-hidden.js`, 함수 `rpg_hidden` claim · sync · list, 전용 서버만 부른다), 방 `room.js hiddenTick`(시험 통과 요청 `g.hjq` → 장부 → 답 `h.hjr`, 가방이 바뀌면 sync). 시험 `tools/hidden-unique.test.mjs`.
- 자리는 보유자가 접속하지 않아도 장부에 남는다. 자리를 돌려주는 때: 직업을 끔(전직 초기화 물약 · 명령어 `끄기` · 다른 히든 직업으로 바꿈) · 캐릭터 삭제 · 서버 초기화로 기록에서 직업이 사라짐(저장된 기록에 직업이 없고 적은 지 5분이 지난 줄은 claim · list 때 치운다).
- 관리자 캐릭터는 자리를 쓰지 않고 막히지도 않는다. 관리자 명령어(`/블러드` · `/도박꾼`)는 제한을 무시하고 받은 사람도 보유자로 적힌다(둘 이상이 될 수 있다).
- 이 규칙이 생기기 전부터 가진 사람은 장부가 표를 처음 만들 때 한 번 훑어 모두 적는다(내쫓지 않는다). 여러 명이면 한 명만 남을 때까지 새 해금은 막힌다.
- 서버 계정이 없는 캐릭터(기기에만 있는)는 해금 순간 거절한다. 테스트 방 · 장부가 없는 방(`g.hjOff`) · 방장 브라우저 방식(`?srv=off`) · 연습장은 지키지 않는다. 새 히든 직업을 더하면 해금 끝에서 `hiddenAsk`/`hiddenReply` 를 거치게 한다(`gamblerUnlock.js settle` 참고).
- 히든 직업이라 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다.

### 히든 직업 Necromancer 004 그림자 군주 (11월 17일, 격자 연습장에만)
- 사용자 기획 「히든직업 002~006 통합기획안」 3장. 사용자 지시로 **획득 방법(단서 · 시험)은 넣지 않고 `?sandbox` 에서만** 켜진다(`NECRO.live = false`, `necroOn` 은 맵 `sandbox` 에서만). 업데이트 노트 · 공지 · 패치노트 책에 적지 않는다. 아직 저장 · 스냅샷 · 관리자 명령어 · 유일 규칙(`HIDDEN_JOBS`)에 잇지 않았다 — 실제 게임에 열 때 Gambler 002 처럼 붙인다.
- 수치 `necroData.js` · 규칙 `necroJob.js`(엔진 `rpg.js necroEngine`, 입력 `hidden {op:"use", s}`) · 그림 `necroArt.js` · 시트 규격 `necroPxData.js` · 연습장 칸 `Sandbox.jsx NecroBar` · 시험 `tools/necro.test.mjs`. 가방 `bag.hj.jobs.necromancer = {lv, xp, tr, roster}`.
- 그림자는 몹이 아니라 `h.nc.sh` 에 있고 피해를 받지 않는다. 몹을 잡으면 흔적(`h.nc.tr`, 8초)이 남고 추출로 명부에 넣는다. 연습장 허수아비는 죽지 않아 「추출 연습 몹 세우기」(`rpg.js sandboxMobs`)를 쓴다.
- **평타는 근접 그림자 낫**(11월 17일 사용자 — 흑영탄을 뺐다, `NC_SCYTHE` 앞쪽 부채꼴 · 여럿을 한 번에, 손에 든 낫 `drawNecroScythe`). 그림자 병사는 사용자 참고 그림 색(검은 몸 · 보라 윤곽 빛 · 번개 줄기 · 빛나는 눈과 가슴 문양, make.py `glow`)이고 소환 번개 · 뒤 기운 · 걸을 때 연기 · 번개 타격 · 영역 안 번개를 더했다.
- 이펙트는 pixelfx 없이 `design/effects/necromancer/make.py` 가 직접 그린 도트 시트(`rpg/effects/hidden-jobs/necromancer/px/nc_*.webp`). 고치면 make.py → `manifest.json` 값을 `necroPxData.js` 로(시험이 본다). 키는 기존 행동 키를 빌린다(`NC_SLOTS`). 내가 정한 해석은 `docs/작업-상세-기록.md` 끝.

### 격자 연습장 `?sandbox` (11월 16일)
- 주소 `four-lane.vercel.app/?sandbox`(`main.jsx` 가 `Sandbox.jsx` 를 따로 불러온다). 게임에 넣기 전 캐릭터(직업 · 성별 · 원소 · 전직 · 숙련 단계 · BLOOD-001 직업 레벨 · 연마 · 레벨 · 스탯 · 무기(미공개 hold 포함) · 스킬 칸)를 골라 격자 바닥에서 움직이고 스킬을 써 본다.
- 직업 체험(`JobTrial.jsx`)처럼 이 기기에서만 도는 세계다. 서버 · 장부 · 기기 캐릭터 기록과 이어지지 않고 아무것도 저장하지 않는다. `g.test` 로 훈련장 기능(무적 · 쿨타임 끄기 · 스택 가득 · 초당 피해)을 쓰고, 월드보스는 나오지 않게 막았다.
- 맵 `sandbox` 는 `MAPS` 에만 있고 **`MAP_IDS` 에는 넣지 않는다**(스냅샷 · 서버로 갈 일이 없다). `grid` 면 `rpgArt.js drawGridFloor` 가 바닥을 칸으로 그린다. 한 칸 = 게임 거리 50, 세로는 `RPG.squash` 만큼 눌러 그린다. 허수아비 배치 · 색은 `sandboxData.js`, 다시 세우기는 `rpg.js sandboxDummies`. 시험 `tools/sandbox.test.mjs`.
