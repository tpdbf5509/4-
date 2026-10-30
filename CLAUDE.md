# CLAUDE.md — 「네 갈래 방어선」 작업 지침

새 세션을 시작하면 이 파일부터 읽고 방향을 맞춘다. 규칙의 상세는 `docs/기능-명세서.md`, 그림 파일 지도는 `ASSETS.md` · `public/assets/game/README.md` 에 있다.
이 파일과 코드가 다르면 **코드가 맞다**. 다른 점을 찾으면 이 파일도 함께 고친다.

---

## 1. 사용자와 대화하는 법

- **항상 한국어 존댓말**로 답한다. 짧고 명확하게. 근거 없이 지어내지 않는다.
- 사용자는 기획자이자 플레이 테스터다. 밸런스 숫자를 자주 바꿔 달라고 한다("60% 줄여보자" → "55%로"). 숫자는 한 곳의 상수만 고치면 되게 유지한다.
- 요청이 애매하면 하나만 짧게 묻는다. 뻔한 것은 정하고 진행한 뒤 무엇을 정했는지 알린다.
- 끝나면 **무엇을 바꿨는지 · 어떻게 확인했는지 · 배포 상태**를 짧게 보고한다. 확인 못 한 것은 못 했다고 말한다.
- 화면 문구 · 업데이트 노트 · 문서는 짧은 문장, 쉼표 적게, 괄호 영어는 꼭 필요할 때만.
- **지연 해결책으로 "손님 화면에서 내 스킬 · 공격을 먼저 그리기(클라이언트 예측)"를 추천하지 않는다.** 사용자 결정 — 먼저 보여도 실제 판정은 늦어 어긋나고 렉처럼 보인다. 지연은 서버 위치 · 왕복 시간을 줄이는 쪽으로만 푼다.
- **RPG 새 창은 기존 상점·가방(`.shop`)이나 파티(`.rpg-stat`)의 틀과 공통 버튼을 재사용한다.** 기존 갈색 바탕 · 금빛 강조 · 글꼴을 따르고 게임 화면 안에 배치한다. 기능마다 다른 색상 체계나 브라우저 전체 고정 창을 만들지 않는다.
- 디자인 취향: 톤다운 · 파스텔 색, 배경 60 : 글자 30 : 포인트 10, 왼쪽 정렬, 1px 얇은 선, 강조는 한 곳. 한글 제목은 자간을 살짝 줄인다.

## 2. 브랜치 · 배포

- 작업 브랜치: **`claude/4-player-coop-defense-1x89l5`** (저장소 `tpdbf5509/4-`). 여기서 커밋하고 `git push -u origin <브랜치>` 한다.
- **모든 작업은 Vercel 프로젝트 `four-lane` 하나로만 한다.** 주소는 https://four-lane.vercel.app 이다.
  - 배포 · 배포 확인 · 사용자에게 안내하는 주소는 모두 `four-lane` 이다. 다른 Vercel 프로젝트를 새로 만들거나, 다른 프로젝트 · 미리보기 주소로 배포하거나 안내하지 않는다.
  - push 하면 `four-lane` 에 자동 배포된다. 보통 1~3분 안에 READY.
  - Vercel MCP `list_deployments` 는 **projectId 만** 넘긴다. teamId 를 넣으면 403 이 난다.
- RPG 모드는 **다른 세션이 다른 브랜치(`claude/funny-fermat-*`)에서 만들고 PR 로 이 브랜치에 합친다.** 그래서 push 가 거절되면 `git fetch origin <브랜치>` 후 merge 하고(리베이스 · 강제 push 금지) 다시 빌드 · 확인 후 push 한다.
- **RPG 전용 서버**(`server/`, Cloudflare Workers + Durable Objects, 이름 `four-lane-rpg`)는 GitHub Actions(`.github/workflows/rpg-server.yml`)가 push 때 배포한다. 저장소 비밀값: `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID`(Supabase 비밀 키는 이제 쓰지 않는다). 서버 주소는 `wss://four-lane-rpg.four-lane.workers.dev`(rpgServer.js `SRV_URL`, Vercel 환경 변수 `VITE_RPG_SERVER` 로 덮어쓸 수 있다). 내 컴퓨터 시험은 `cd server && npx wrangler dev --port 8787` + 화면 주소 `?srv=local`(저장 시험은 `server/.dev.vars` 에 가짜 저장소 주소).
- 사용자가 요청하지 않으면 PR 을 만들지 않는다.
- 커밋 메시지는 한국어 한 줄, "무엇을 어떻게 한다" 꼴. 예: `궁수탑 4단계 공격력을 55% 낮추고 강화 비용을 260으로 올린다`

## 3. 게임 한눈에

- 이름: **네 갈래 방어선**. 북 · 동 · 남 · 서 네 길로 오는 적을 **최대 4명이 협동**해 막는 실시간 웹 디펜스. 설치 없이 브라우저(PC · 휴대폰)로 한다.
- 모드 ① **방어전**: 대기실 → 웨이브 → 중간중간 **보스 결전**(판이 결전장으로 바뀌고 각자 캐릭터를 직접 움직여 보스를 친다) → 능력 카드 선택 → 결과.
- 모드 ② **RPG**: 방 코드 없이 서버 RPG1~RPG4(서버당 10명, `RPG_SERVER_CAP` — 자리 칸 `RPG_CREW_MAX` 16 은 스냅샷 차례라 그대로)에 들어가 ☰ 메뉴에서 서버를 옮기고 광장 · 토끼 · 늑대 · 멧돼지(20~50) · 고릴라(50~100) · 고블린(100~130) · 오크(130~160) · 오우거(160~200) · 스켈레톤(200~230) · 좀비(230~260) · 언데드 마법사(260~300) · 골렘(300~330) · 키메라(330~360) · 포식거미(360~400) 사냥터, 광장 계몽의 문 뒤 400~800 사냥터 8곳(`deepData.js`)에서 사냥하고, 1대1·2대2 결투로 명예를 겨룬다. 최고 800레벨(`LV_MAX`) · 200레벨 1차 전직(`advData.js`), 스탯 5종(하나에 800까지, `STAT_MAX` — 400레벨 이후 레벨당 3포인트 · 800레벨 누적 2,000포인트). 보스 재료 · 무기 강화(+20) · 광장 의뢰가 있다.
- 병과(= 탑 종류) 11종: `archer` 궁수 · `sniper` 저격 · `cannon` 대포 · `bolt` 번개 · `flame` 화염 · `poison` 독 · `frost` 서리 · `gravity` 중력 · `supply` 보급소 · `corrode` 부식 · `paladin` 성기사. 탑은 1~4단계.
- 난이도 4종: 쉬움 · 보통(기본) · 어려움 · 지옥. 라운드(웨이브 수) · 난이도 · 시작 · 일시정지 · 속도는 **방장만** 정한다.
- 방 코드 4글자. `TEST` 는 테스트 서버(비밀번호 입장, 골드 무제한 등 실험 도구).

## 4. 기술 구조

| 구분 | 내용 |
|---|---|
| 화면 | React 19 + Vite 8. 판은 `<canvas>` 에 직접 그린다 |
| 실시간 | **Cloudflare 워커 `four-lane-rpg`**(2026-10-28 Supabase 무료 한도 초과 402 로 옮김). 방어전 방 · 관리 채널은 `Relay` Durable Object(`server/src/relay.js`, 화면 `src/net/relay.js`, 웹소켓 `/room/<코드>`) — 접속자 목록 + 방송. 화면 쪽 `joinRoom`(room.js)은 같은 모양이라 호출부는 그대로 |
| RPG 전용 서버 | **기본**(2026-10-28). RPG1~4 는 방장 없이 서버(`RpgRoom`, `/rpg/<서버>`)가 판정한다. `?srv=off` 로 방장 브라우저 방식(Relay 위)으로 돌아간다. 연결 진단 칸은 `?diag=1`. 서버 주소는 `src/net/api.js`(`VITE_RPG_SERVER` 로 덮어씀) |
| 장부(계정 · 저장) | **D1 `four-lane`**(id b11b5090-…, 도쿄) + 장부 Durable Object `Ledger`(`server/src/ledger-do.js`, 요청을 한 줄로 세워 Postgres 행 잠금 대신). 옛 Supabase 함수를 JS 로 옮긴 것이 `server/src/ledger.js`(`LedgerCore`, 함수 이름 · 인자 `p_*` 가 옛 rpc 와 같다). 화면은 `POST /rpc/<함수>`(`src/net/api.js` `ledger`). 표는 `server/schema.sql`. 접속 중 표시(live)는 메모리뿐. 거래 · 길드는 `server/src/ledger-trade.js` · `ledger-guild.js` 가 `LedgerCore` 에 붙는다(2026-10-28 2단계, 함수 · 오류 이름은 옛 `trade.sql` · `guild.sql` 과 같다). 전용 서버 방에서는 화면이 직접 RPC 를 부르지 않고 방 웹소켓의 `ledger` 말(`room.ledger(fn, args)` → 서버 `ledger()` · `ledgerRun`)로 서버에 부탁한다 — 입장권은 서버가 쥐고 있고, 장부가 기록을 고치기 전에 서버가 영웅을 먼저 저장하고(`saveOne`) 고친 뒤 장부에서 다시 불러와 싣는다(`reload`, 기록 ts 가 영웅보다 높을 때만). 저장이 stale · moved 로 막히면 다시 불러와 이어 하고 3번 넘게 막히면 멈춘다. 시험 `node --test tools/ledger.test.mjs tools/ledger-trade.test.mjs tools/ledger-guild.test.mjs`, 서버 접속 시험 `node tools/rpg-server-trade.mjs`(wrangler dev 를 먼저 띄운다) |
| (예전 기록) RPG 전용 서버 | 방장 없이 `server/` 가 판정하는 구조의 설명이다. 주고받는 말(lobby · rsnap · chat ↔ hello · pick · rjoin · input · chat, 서버만의 말: `auth` 첫 말 비밀값 · `deny` 입장권 틀림 · `kick` 다른 기기 · `bye` 나감), 자리 지킴(`auth` 비밀값 해시, 틀리면 4003 · 5초 안에 없으면 4001, 남에게는 `~` id), 정원 `RPG_SERVER_CAP` 은 `seat()` 가 센다. 저장은 이제 장부(`server/src/save.js` → `Ledger`). 시험 `node tools/rpg-server-seat.mjs`(wrangler dev 를 먼저 띄운다) |
| 판정 | **방장 권위형**(`?srv=off` 일 때. 기본은 서버 판정). 방장 브라우저가 모든 규칙을 돌리고 손님은 입력만 보낸다. 방장이 스냅샷과 연출 이벤트(`out` fx)를 한 메시지로 뿌린다(방어전 초당 12회, RPG 는 인원에 따라 3~10회) |
| 저장 | RPG 캐릭터는 이름 + 숫자 5자리 코드로 서버(D1 장부)와 localStorage 둘 다. 옛 Supabase 데이터는 그대로 남겨 두었다(원본, 읽기만). 홈 이름 · 설정은 localStorage |
| 소리 | 파일 없이 웹오디오 합성(`sfx.js`) |

### 파일 지도

| 파일 | 맡은 일 |
|---|---|
| `src/game/world.js` | **모든 상수와 데이터.** `DIFFS` 난이도, `TOWERS` 탑(비용 · `up4` · 사거리 · 피해 · 간격…), `UP_MUL` · `UP_MAX_COST`(300) · `upCostOf`, `SKILLS`, `ARENA*` 결전장, `makeGame` |
| `src/game/logic.js` | 방어전 규칙(방장이 돌림). 파일 위쪽에 밸런스 상수(`ARCHER_LV4_DMG_MUL`, `ASSIST_GOLD`, `PALADIN_SHIELD`, `BOLT_*`, `POISON_*`, `GRAVITY_*`, `SUPPLY_*`, `CORRODE_*`…). 스냅샷 `packSnapshot`/`applySnapshot`, 결전 · 성채 정산(`castleBill`, `arenaSettle`) |
| `src/game/art.js` | 방어전 · 결전장 캔버스 그리기. **그림 파일 우선, 없으면 코드로 그린 그림으로 대신** |
| `src/game/rpg.js` · `rpgArt.js` · `src/RpgView.jsx` | RPG 규칙 · 그리기 · 화면 |
| `src/game/itemData.js` | RPG 재료(`MATERIALS`) · 보스 드롭(`DROPS`) · 무기 강화 확률 · 값(`ENHANCE`). 규칙은 rpg.js(`dropLoot`) · shop.js(`enh` · `msell`) |
| `src/game/requestData.js` | RPG 광장 의뢰 NPC(`REQ_NPCS`) · 의뢰 목록(`REQUESTS`, 차례는 저장에 쓰니 뒤에만 더한다). 규칙은 rpg.js `rpgRequest` |
| `src/game/socialData.js` | RPG 칭호 목록(`TITLES`, 뒤에만 더한다) · 파티(`PARTY`) · 채팅(`CHAT`) 수치. 규칙(`rpgParty` · `rpgTitle` · 칭호 주기)은 rpg.js |
| `src/game/armorData.js` · `armor.js` | RPG 방어구. **수치는 armorData.js 한 곳**(부위 · 등급 · 기본 효과 · 영웅 · 전설 특수 효과 · 되팔기 값), 규칙(효과 셈 · 장착 · 주고받기 `packArmor`)은 armor.js. 장착 · 되팔기 요청은 shop.js(`awear` · `asell` · 관리자 `agive`) |
| `src/game/dungeonData.js` | RPG 던전. **수치는 여기 한 곳**(`DUNGEON` 시간 · 칸 · 몹 배율, `DUNGEONS` 입장료 · 몹 · 무리 · 보스 세기 · 보상, `BOSS_AI` 보스 기술). 규칙은 rpg.js(`rpgDungeon` · `tickRuns` · `stepDgBoss`), 창은 RpgView.jsx |
| `src/game/mouseMove.js` | RPG 마우스 오른쪽 클릭 이동의 화면 쪽 도구(`canvasToWorld` 화면→땅 좌표 · `pickNpc` · `portalHit` · `npcStopPoint` 다가설 자리 · `MV_UI` 끌기 간격 100ms · 20px). 걷는 규칙은 rpg.js(`MOVE` · `rpgMove` · `walkTo` · `steerAround`) |
| `src/game/skillData.js` · `skillArt.js` | RPG 직업 스킬(`JOB_SKILLS`, 상점 `SKILLS` 뒤에 붙는다 · 키 R) · 전설 무기 스킬(`WEAPON_SKILLS`, 키 X). **수치는 skillData.js 한 곳**, 규칙은 rpg.js(`jobSkill` · `rpgWeaponSkill` · 패시브 `weaponOnHit` · `weaponOnAttack` · `skillTake`), 그림은 skillArt.js(`drawSkillFx` 의 `sk_` 연출 · 영웅 둘레 `drawHeroSkill`) |
| `src/game/advData.js` · `advance.js` · `advArt.js` · `src/AdvPanel.jsx` | RPG 1차 전직(200레벨). **수치는 advData.js 한 곳**(`ADV` · `ADV_CLASSES` 액티브 · 패시브 · 시험 · `ADV_ART`), 규칙은 advance.js(엔진 `advEngine`, rpg.js 의 hitMob · hitFoe · hurtHero · skillTake · killMob · stepHeroes 가 부른다), 그림은 advArt.js, 교관 창은 AdvPanel.jsx |
| `src/game/deepData.js` · `src/DeepPanel.jsx` | RPG 400~800레벨 사냥터 · 계몽의 문. **수치는 deepData.js 한 곳**(`DEEP` 문 자리 · 입장 레벨 · 계몽의 눈 재료, `DEEP_MAPS` 8구역 몹(체력은 표 값 그대로) · 보스 · 재료, `DEEP_BRUTE` · `DEEP_SKILL` · `DEEP_MATS`). 규칙은 rpg.js(MOB · BRUTE · FAR_SKILL · SPAWNS 에 이어 붙임, `rpgDeep` 만들기 · 입장), 몹 그림은 rpgArt.js(`drawFspiritBody` 등), 기술 그림은 skillArt.js(`sk_mshot` style · `sk_mpillar`), 창은 DeepPanel.jsx |
| `src/game/fieldLookData.js` · `fieldArt.js` | RPG 사냥터 21곳 바탕(10월 30일). **빛깔 · 장식 수는 fieldLookData.js 한 곳**(`FIELD_LOOKS` 맵 id 마다 땅 · 땅결 · 뒤 풍경 forest/cliff/ruin · 장식 · 문 앞 흙길 빛깔), 그리기는 fieldArt.js `paintFieldLook`(한 장 2600 폭을 캔버스로 그려 `drawTiled` 가 좌우 뒤집어 잇는다, 던전 바탕과 합쳐 한 장만 캐시) · `fieldTrails`(문 앞 흙길, 맵의 `paths` 대신). 표에 없는 맵(광장 · 결투장 · 던전 · 훈련장 · 월드보스 · 길드)은 예전 `field.webp` + `tint`. 사냥터 `tint` 값은 남아 있지만 쓰지 않는다 |
| `src/game/trainData.js` | RPG 훈련장(광장 왼쪽 문 · 맵 `train` · 허수아비 `dummy` 셋 · 교관 창 켜기/끄기 `TRAIN_TOGGLES`). 규칙은 rpg.js(`rpgTrain` · `trainTick` · `keepDummies`), 기록은 스냅샷 줄 47 |
| `src/game/bossBar.js` | 보스 체력바 주황 잔상 셈(`ghostStep`, 머무는 · 따라오는 시간 `BOSS_BAR`). 그리기 전용 — 루프(`tickBossBars`, RpgView.jsx)가 내 맵 보스마다 `m.hpFx` 를 돌리고, 던전·월드·길드 공통 `BossHealthBar.jsx`의 DOM 너비를 바로 고친다 |
| `src/game/adminCmd.js` | RPG 관리자 채팅 명령어(`/지급` · `/돈` · `/소환` · `/도움`). 방장이 판정 |
| `src/game/keys.js` | RPG 키 설정 — 기본 키 표(`KEY_ACTIONS`) · 저장(`flg:rpgKeys`) · 키 이름 |
| `src/game/shopData.js` · `shop.js` · `src/ShopPanel.jsx` | RPG 광장 상점. **가격 · 확률 · 제한은 shopData.js 한 곳**, 규칙(방장 판정 `rpgShop`, 조건 `why*`)은 shop.js, 상점 · 가방 창은 ShopPanel.jsx |
| `src/game/towerInfo.js` | 탑 "자세히 보기" 창 설명. **숫자를 손으로 적어 둔 곳이라 logic.js 를 고치면 여기도 고친다** |
| `src/game/updates.js` | 대기실 "업데이트" 창 내용 |
| `src/InquiryPanel.jsx` | RPG ☰ 메뉴 "문의하기" 창(`.shop` 틀). 글은 의견 남기기와 같은 `feedback` 표(`sendFeedback`, 앞에 "[RPG 문의]")로 간다 |
| `src/HomeScreen.jsx` · `src/ui/home.css` | 사용자 그림을 따른 홈. 하늘·풀밭·나무 간판, 실제 게임 이미지와 모드별 입장 카드. 방어전 이름·코드·TEST 입력 창과 홈 문의. 업데이트 창은 App.jsx의 기존 창 재사용. 장식은 기존 게임 캐릭터·탑 그림 |
| `src/App.jsx` | 화면 흐름 · 방 연결 · 대기실 · 방장 권한 · 테스트 패널 · 비용 칸 |
| `src/net/room.js` · `relay.js` · `api.js` | 방 연결(`joinRoom` → Relay 웹소켓, 개발용 `?net=local`) · 워커 주소와 장부 호출 `ledger(fn, args)` |
| `src/net/rpgServer.js` · `server/` | RPG 전용 서버 연결(room.js 와 같은 모양) · 서버(`server/src/room.js` 가 RPG1~4 방 하나, `save.js` 가 Supabase `rpg_srv_load` · `rpg_srv_save` — 서버 비밀 키로만). 규칙은 `src/game/` 를 그대로 묶어 쓴다. 입력 나누기는 `src/game/rpgInput.js`(방장 화면과 서버가 같이 쓴다) |
| `src/AdminView.jsx` · `src/net/admin.js` · `src/ui/admin.css` | 관리 화면 「데이터 시스템」(`?admin`, 관리자 이름 + 코드). 계정 탭은 모든 캐릭터(`rpg_admin_accounts`). 서버마다 관리 채널로 방장 화면에 묻고(인원 · 왕복 · fps) 방장 부여 · 퇴장을 보낸다. 방장 쪽 답은 RpgView.jsx, 명령 표 함수는 `supabase/rpg.sql`(`rpg_admin_*`) |
| `src/net/version.js` | 새 버전 알아채기. 빌드 번호(`__BUILD__`, `vite.config.js`)와 `dist/version.json` 을 견주어 옛 화면을 스스로 새로 고친다. RPG 스냅샷에 방장 빌드(`ver`)를 싣는다 |
| `src/net/rpgSave.js` · `src/RpgAccount.jsx` | RPG 캐릭터 서버 저장(만들기 · 이어 하기 · 10초마다 저장 · 입장권)과 캐릭터 만들기 화면의 이름 · 코드 칸. 표와 함수는 `supabase/rpg.sql` |
| `src/ui/style.css` | 모든 스타일 |
| `public/assets/` | 그림. 판 위 그림은 `public/assets/game/`(움직이는 것은 36프레임 6열 시트 + `manifest.json`) |
| `design/` | 원본 디자인 시트와 자르는 스크립트(게임이 직접 쓰지 않음) |
| `tools/` | `png-to-webp.py`, `export-art.mjs`, `recut-character.py`(캐릭터 누끼), `cut-weapons.py`(특별 무기 그림 바탕 지우기 — 원본은 `design/weapons/`), `bare-warrior.py`(전사 그림에서 칼 지우기 → `<보기>-bare.webp`, 손 위치는 rpgArt.js `WARRIOR_HAND`), `bare-holders.py`(마법사 지팡이 · 궁수 활 지우기, 손 위치는 `HOLDER_HAND`), `cut-armor.py`(방어구 그림 자르기 — 원본은 `design/armor/`), `cut-bosses.py`(던전 보스 자세 자르기 — 원본은 `design/bosses/`) |
| `docs/기능-명세서.md` | 기능 명세서. 기능 ID(예: `DEF-LOBBY-03`)로 정리 |

## 5. 지금 정해진 핵심 규칙 (바꿀 때 사용자 확인)

- **강화 비용**: 1→2, 2→3 은 `건설비 × UP_MUL[1.8, 3]`. 3→4 는 탑마다 `def.up4`, **300 을 넘지 않는다**. 강한 4단계 능력일수록 비싸게 둔다. 지금 값: 서리 · 중력 · 화염 · 대포 · 저격 300 / 독 280 / 번개 · 궁수 260 / 보급소 220 / 부식 200 / 성기사 120.
- **궁수 4단계**: 공격 속도 약 17배, 한 발 피해는 `ARCHER_LV4_DMG_MUL = 0.14 * 0.45`(처음 대비 55% 감소).
- **4단계 탑 한도**: 한 사람당 1개(지옥 2개, `DIFFS[].cap`). 테스트 서버에서도 기본으로 적용되고, 테스트 패널의 켜기/끄기(`g.testCapOff`)로만 풀린다.
- **서리 4단계**는 "얼림"(3초 정지)이다. 효과는 기절과 같지만 그림은 얼음. 기절 연출 코드는 지우지 않는다.
- **중력탑**: 가장 뒤의 적을 원거리로 쏘고, 맞은 자리에 중력장을 만들어 둘레 적을 끌어 모은다.
- **어시스트 골드**: 서리 · 중력이 걸어 둔 적을 다른 탑이 4초 안에 잡으면 처치 골드의 30%.
- **성기사**: 성채 피해 감소(단계당 6%, 여러 기 합쳐 최대 45%). 결전 스킬은 사거리 안 아군에게 체력 60% 보호막.
- **대군주(titan)**: 잡는 시간이 길다는 의견으로 모든 난이도에서 체력 ×0.7, 사람이 주는 피해 ×1.4(`ARENA.titanHp` · `titanDmg`).
- **보스 결전 중 성채 체력**: 결전 중 맞은 피해는 성채에 바로 반영하지 않는다. **기절(쓰러짐)하면 그때 성채에서 깎고**, 결전이 끝나면 줄어든 체력만큼 정산한다. 0 이 되면 패배.
- **RPG 관리자 캐릭터**: 전설 특별 무기 열셋을 한 번 받는다(`giveAdminLegends` · `ADMIN_LEGEND.id`, 받은 차례는 `bag.lg` — 팔아도 다시 주지 않는다, id 를 올리면 빠진 것만 다시). 최고 레벨 · 코인 무제한 · 스탯 다섯 모두 최대(`maxStats`) · 보스 재료 · 강화석 모두 늘 999개(`MAT_MAX`, `stepHeroes` 에서 다시 채운다). 관리자 장비(`giveAdminKit` · `ADMIN_KIT`, 받은 차례 `bag.ak`): 한 번 특별 무기 스물둘 모두 · 특별 무기 강화 +30 · 전설 방어구 넷을 끼워 주고, 모든 스킬 최고 레벨 · 지역 워프권 999 · 하락 방지권 99 는 늘 다시 채운다(10월 19일 섞임 사고로 비어 다시 넣음)이고, 직업 · 원소 · 성별을 모험 준비 화면에서 언제든 바꾼다(`saveLook`). 일반 캐릭터는 한 번 정하면 바꿀 수 없다.
- **RPG 관리자 가방 칸**(10월 27일): 관리자는 무기 · 방어구 가방이 500칸(`WEAPON.adminBagMax` · `ARMOR.adminBagMax`), 일반은 30칸(`bagMax`). 칸은 늘 `weaponCap(h)` · `armorCap(h)` 로 묻는다. 기록을 실을 때 `cleanBag(d, admin)` 이 그 칸까지 남긴다. 가방은 바뀔 때 스냅샷에 통째로 실려 무한으로 두지 않았다(500 + 500 이 약 49KB). 개인 거래로 받는 칸은 DB `trade.sql` 의 30 그대로다.
- **RPG 관리자 명령어**: 관리자가 채팅 칸에 "/" 로 쓰면 채팅 대신 입력 kind `cmd` 로 방장에게 간다(RpgView.jsx `sendChat`, 판정 src/game/adminCmd.js `rpgAdminCmd`, 숫자 `ADMIN_CMD`). `/도움` · `/지급 <이름> <물품> [개수]`(물약 · 재료 · 특별 무기 · "전설 투구" 같은 방어구 · 워프권 · 하락 방지권) · `/돈 <이름> <금액>`(음수면 뺀다) · `/소환 <이름>`(내 자리로, 결투 · 던전 중은 막는다) · `/직업 <이름> <직업>`(기본 직업 셋 · 전직 여섯. 직업은 겉모습이라 방장이 자리 소식을 고치고 — `g.relook` → App.jsx `relook` — 바뀐 사람 화면이 기기 기록을 고친다 — out `relook` → `forceJob`. 전용 서버는 server/src/room.js 가 자리를 고친다). 이름 "나" 는 자신, 띄어쓰기 이름은 앞에서부터 견준다. 결과는 `sys` 알림 줄. 관리자가 아니면 화면에서 "관리자만 쓸 수 있는 명령입니다".
- **RPG 맵 · 몹 추가**: `MAP_IDS` · `MOB_TYPES` · `REC_IDS` · `TITLES` 는 스냅샷 차례라 **뒤에만 더한다**. 몹 종류를 더하면 `REC_IDS` 에도 꼭 더한다(잡은 수를 센다). 고릴라는 `GORILLA`(체력 ×1.5 · 공격 ×1.4). 해골(`skeleton`)은 모르가스가 부르는 졸개로 고블린과 같은 값(`MOB.skeleton` · `BRUTE.skeleton`). 고블린 · 오크 · 오우거는 `GOBLIN` · `ORC` · `OGRE` 값으로 같은 셈(`stepBrute`)을 쓴다 — 더 멀리 알아채고(`aggro`) 더 오래 쫓고(`leash` 1200) 둘레 무리를 부른다(`call`). 스냅샷에는 사람이 있는 맵의 몹만 싣는다.
- **RPG 보스 재료 · 강화**: 재료는 **보스만** 떨군다(일반 몹은 없음). 보스를 친 사람(`m.hitBy`) 가운데 같은 맵에 있는 사람이 저마다 받는다. 재료는 1~5개 확률(`DROP_ROLL`, 평균 3개), 강화석은 1개 + 5% 로 1개 더(`DROPS`). 강화는 +30 까지, 강화석 1 + 코인 250 × 단계, +1 마다 무기 스탯 +8%. 실패하면 +11 부터 한 단계 하락(+11~20 30% · +21~30 40%, `ENHANCE.down`). 파랑 강화석 +10(95%→30%) · 경화된 눈알 +20(95%→11%) · 심장결정 +30(97%→4%). 하락 방지권(`GUARD` 3,000코인, `bag.gd`)은 켜 둔 때 떨어질 때만 한 장 쓴다. 강화소는 **장착한 무기만** 강화한다(`whyEnhance`). 방지권이 하락을 막으면 결과는 `enh: 2`("하락 방지 성공"). 방지권 없이 하락할 수 있는 단계를 누르면 한 번 더 묻고, 전설 무기를 되팔 때도 묻는다 — "다시 묻지 않기"는 기기마다(`flg:askGuard` · `flg:askLegendSell`), 강화 모션 건너뛰기는 `flg:forgeSkip`(ShopPanel.jsx `Confirm`). 강화 연출은 ShopPanel.jsx `Forge`(`FORGE` 망치질 1.2초 → 결과 1.6초, 그동안 결과 줄을 숨긴다).
- **RPG 이속 · 투명화 물약**: 물약 효과는 `h.bf` 의 `spd`(빨라지는 몫) · `hide` 로 스냅샷에 실린다(`BUFF_KEYS`, 뒤에만 더한다). 걷는 속도는 `speedMul`. 투명화는 보스 · 일반 몹 모두 못 알아챈다(`notices` — 고를 때 · 맞았을 때 · 쫓던 중 모두). 공격해도 유지, 결투장 · 던전(`MAPS[].dungeon`)에서는 못 마시고 들어가면 풀린다. 남은 시간은 화면 오른쪽 물약 칸 위(`BUFF_SHOW`, `RpgView.jsx`).
- **RPG 처치 보상**: 몹을 친 사람(`m.hitBy`) 가운데 같은 맵에 있는 사람은 막타가 아니어도 모두 경험치 · 코인을 다 받는다(`killMob` · `rewardKill`).
- **RPG 공격 · 스킬**: 사거리 안에 아무도 없어도 Space 평타 · Shift · 산 스킬이 모두 나간다(겨눈 쪽으로 허공 베기 · 쏘기, `aimDir`). 사거리 원은 표시일 뿐이다. 자동 평타만 사거리 안에 몹이 있을 때 나간다.
- **RPG 주문서 · 물약 칸**: 주문서 상점에서 지역 워프권(`SCROLLS` 3 · 6 · 10회, `bag.wp`)을 사고 가방 "주문서" 탭에서 지역 입구로 워프한다(`WARP`, 결투 중 불가). 물약 칸 3개(`bag.qs`, 숫자키 5 · 6 · 7, 오른쪽 아래)에 물약을 넣어 바로 마신다.
- **RPG 방어구**: 투구 · 갑옷 · 바지 · 신발 × 초급 · 희귀 · 영웅 · 전설, 부위마다 하나. 기본 효과는 등급마다 5%씩(신발은 2% 에서 2.5%씩). 영웅 · 전설 특수 효과는 armorData.js `ARMOR_SPECIAL`. 엘리트 몹은 없다(일반 · 보스만). 전설 갑옷 부활은 5분에 한 번 · 체력 30% · 3초 무적. 방어구 던전(투구 묘지 · 신발 첨탑 · 바지 투기장 · 갑옷 성채)을 마치면 그 부위 하나를 등급 몫으로 받는다(`rollArmor`). 관리자는 시험용으로도 받는다(`agive`). 손님 걷기에 쓰는 신발 · 추격 값은 스냅샷 줄 44(`h.arm`).
- **RPG 던전**: 광장 아래쪽 던전 입구(`DUNGEON.gate`, 돌기둥 아치 + 내려가는 계단, 코드 그림 `drawDgPit` · `drawDgGate`) 앞이나 곁의 던전 관리인 → 입장 창. 들어가는 사람이 입장료를 내고 같은 파티로 광장에 있는 사람이 함께 간다. 던전마다 칸 3개(맵 `<던전id>-<칸>`, `MAP_IDS` 뒤에 붙는다), 무리 3번 → 보스, 5분. 성공하면 안의 사람이 저마다 보상, 실패(시간 · 모두 쓰러짐)는 입장료를 돌려주지 않는다. 레벨 제한 없음. 문 없음 — "나가기"로 광장. 던전 몹은 무리(SPAWNS)에 없다(`gi` -1, `m.dg`), 다시 나오지 않는다. 보스 다섯(그라모르 · 아르가스 · 모르가스 · 바르카논 · 세르카)은 `BOSS_AI` 데이터의 기술(slam · multi · charge · wall · rage · summon · absorb · mirage)을 한 셈(`stepDgBoss`)으로 돌린다. 세기는 `DUNGEONS[].boss`. 진행은 스냅샷 `d`, 보스 자세 · 준비 둘레는 몹 줄 끝 `pose` · `warnR`. 던전 몹은 가장자리에서 나와 가운데(`DUNGEON.rally`)로 몰려오며 사냥터의 1.2배 거리에서 알아채고(한꺼번에 몰리지 않게), 보스는 맵 전체에서 알아챈다. 던전 보스는 자동 회복이 없다(`DUNGEON.bossRegen` 0, 사냥터 몹은 `MOB_REGEN` 그대로). 아르가스 그림은 `design/armor/bosses-3.jpg` 가운데 줄의 방패 기사(예전 `design/bosses/argas.webp` 는 쓰지 않음). 들어가면 맵 가운데에 선다. 던전 바닥은 그림 파일 없이 코드로 그린다(rpgArt.js `paintDungeon` · 빛깔 `DG_LOOKS`, 한 번에 하나만 캐시).
- **RPG 숨은 칭호(이스터에그)**: 직업과 다른 묶음의 무기를 들면 얻는 칭호 6개(`TITLES[].secret` · `off`, socialData.js). **얻기 전에는 칭호 창에 보이지 않고, 업데이트 노트 · 공지 · 화면 문구 어디에도 미리 적지 않는다.** 무기 묶음은 `WEAPON_FAMILY`(검 · 도끼 · 단검 · 대검 = 검, 지팡이 · 마도서 = 마법봉, 활), 직업 묶음은 `JOB_FAMILY`. 다른 묶음을 들면 한 대 피해가 `OFF_HAND.dmg`(검 45 · 활 35 · 마법봉 40)로 고정되고 치명타가 없다(`offHand`, `hitMob` · `hitFoe`). 고정 피해 전부터 다른 무기를 들고 있던 사람은 업데이트 뒤 처음 들어올 때 한 번 장착만 풀어 가방에 둔다(빼앗지 않는다, "무기를 잘못 들었어요" 알림, 끝냈는지는 `bag.oc`). 칭호가 31개를 넘어 스냅샷 줄 끝(45)에 둘째 비트 숫자를 싣는다(`TITLE_BITS`).
- **RPG 스킬 칸**: 쓰는 스킬은 궁극기(Shift) 1 · 직업(R, `use5`) 1 · 일반(1 · 2, `use1` · `use2`) 2 · 무기(X) 1 뿐이다. 가방 "스킬" 탭에서 넣고 뺀다(`bag.ks = { job, g: [a, b] }`, op `kset`, `skillEquipped` · `cleanKs` · `autoSlot`, shop.js). 칸에 없는 스킬은 `rpgUseSkill` 이 막는다.
- **RPG 직업 · 무기 스킬**: 직업 스킬은 직업마다 3개(skillData.js `JOB_SKILLS`, `fam: "job"`, 상점 "직업" 탭). 무기 스킬은 전설 특별 무기 열셋(검 다섯 · 지팡이 넷 · 활 넷: 용암 · 그림자 · 별자리 · 황금 날개)에만, 고정 스탯 `SPECIALS[].amt`. 연계 입력은 `w.cmb`(단계 · 남은 시간, 이어 누름은 대기 시간과 상관없다 · 연계 전체가 `newCast` 한 번). 구체 · 화살은 `missile`(날아가며 처음 닿은 적 · 피할 수 있다 · 그림은 `sk_missile` 을 `cut` 으로 지운다), 은하 균열은 `g.rifts`, 잔화 · 빙판은 `g.zones`. 군중 제어는 `ccMob` · `ccHero`(경직 · 띄움 · 속박 · 둔화 · 밀어내기 — 보스는 띄움 · 밀림을 짧은 경직으로). 패시브는 `weaponOnHit(g, h, m, foe, side, basic)`, 패시브가 낳은 피해는 `noProc` 로 다시 부르지 않는다. "앞으로 쏜다"는 바라보는 쪽(`faceDir` → `aimDir`: 누르는 방향, 없으면 마지막으로 걸은 쪽 `h.look` — 그 뒤 공격하며 몸을 돌렸으면 좌우). 상태(`h.ws` · `h.jb` · `h.cc`)는 스냅샷 줄 46. 화상 · 독 · 빙판 · 잔화 틱은 `dot` 로 쳐서 패시브가 쌓이지 않는다. 직업과 다른 무기를 들면 무기 스킬 피해도 `OFF_HAND` 고정이다.
- **RPG 서버 초기화**: `RESET`(`itemData.js`). 캐릭터의 `rs` 가 `RESET.id` 와 다르면 들어올 때 한 번 모든 진행을 처음으로 돌린다(`resetRecord`, 관리자 제외 · 이름 · 직업 · 원소 · 성별 유지). 또 초기화하려면 id 만 새로 쓴다. 레벨이 내려가도 저장하도록 `writeChar` · `heroRecord` 가 이 경우만 예외다. DB 를 직접 지우지 않는다(접속 중인 사람의 10초 저장이 덮어쓴다).
- **RPG 200~400레벨 사냥터**: 난이도는 `FAR_EASE`(체력 ×0.7 · 공격력 ×0.75, rpg.js)로 낮췄다. `FAR_MAPS`(rpg.js)로 맵 여섯이 오우거 끝 문 뒤로 이어진다. 몹 `skeletal` · `zombie` · `necro` · `golem` · `chimera` · `spider` 는 `MOB` 레벨 식 + `BRUTE`(stepBrute) 값, 그림은 rpgArt.js `drawSkeletalBody` 등(코드로 그린다). `MOB_TYPES` · `REC_IDS` · `TITLES` · `MAP_IDS` 는 뒤에만 더했다. 여섯 몹은 내려찍기 대신 고유 기술을 쓴다(`FAR_SKILL` — 뼈 던지기 · 토사물 둔화 · 저주 문양 · 땅 가르기 · 불꽃 숨결 · 거미줄 속박, `farSkill`). 바닥 표시 뒤에 맞고 비키면 피한다. 피해 배율은 예전 내려찍기보다 낮게, 상태이상은 짧게 둔다. 그림은 skillArt.js `MOB_FX`.
- **RPG 400~800레벨 · 계몽의 문**(10월 26일): 광장 왼쪽 풀밭 `DEEP.door`(115, 980)의 계몽의 문(NPC `deep`, 그림 `rpg/deep-door.webp` — Codex 생성 · 원본 `design/deep/deep-door.webp`, 크기 · 발판 · 문 안 빛 자리 `DEEP_DOOR_ART`, rpgArt.js `drawDeepDoor` 가 문 안쪽 빛 · 떠오르는 알갱이를 더한다. 못 불러오면 길드 문 돌 아치 `drawArchDoor` + 떠 있는 계몽의 눈 그림 `rpg/items/eye-enlight.webp`). 창(DeepPanel, `.shop` 틀)에서 재료(포식거미 비단 10 · 심장결정 20 · 키메라 갈기 25 · 골렘 핵 25 · 리치의 영혼석 15 · 고릴라 가죽 20)로 계몽의 눈(재료 `eye_enlight`, 되팔 수 없음, 관리자는 늘 가짐)을 한 번 만들고, 400레벨부터 입력 `deep` op `enter` 로 첫 맵에 들어간다(눈은 쓰지 않는다). 사냥터 8곳(`fspirit` 불정령 · `lavagolem` · `firedrake` · `ifrit` · `wraith` 망령기사 · `abyss` 심해괴수 · `voidmage` · `fallen` 타락천사, 50레벨씩)은 서로 문으로 잇고 첫 맵 왼쪽 문은 광장으로 나온다. 워프권 목록에는 없다. 몹 수치는 구역 처음 · 끝 값을 곧게 잇는다. 체력은 표 값 그대로(400레벨 11만 → 600레벨 13만 → 800레벨 15만, 보스 179만~238만 — "만렙 올 스탯이 800레벨을 평타 2번 · 600레벨을 치명타 한 방"), 공격력만 FAR_EASE 를 곱한다. 기술은 기존 kind(bone · bile · breath · curse · quake · web)에 `style` · `color` 를 더했다. 맵 · 몹 · 잡은 수 · 칭호(10개, lv600 · lv800 포함)는 뒤에만 더했다. 사람이 없는 사냥터(`zone` 있는 맵)의 몹은 움직임을 계산하지 않는다(몹 510마리로 방장 한 틱 3.3ms → 0.04ms). 월드보스 합동 차단 레벨은 `WORLD_BOSS.coop.lv` 400 으로 따로 둔다(만렙이 800 이 되어도). 시험 `node --test tools/deep.test.mjs`.
- **RPG 스탯 효과 · 몹 체력**(10월 26일 (8)): 포인트당 효과 `STATS[].per` 1.5배(물리력 · 마법력 3 · 체력 22 · 치명타 피해 1.5, 치명타 확률 0.5 그대로). 무기 스탯도 포인트 × per 라 같이 오른다(shop.js `weaponBonus` · `specialBonus`). 1~400 사냥터 몹 · 보스 체력은 `MOB_HP_EASE` 0.8 × `FAR_TAPER`(200~400 만 200레벨 ×1 → 400레벨 ×0.524) — 포식거미 400레벨 11만이 400~800 시작과 이어진다. 해골(던전 졸개) · 던전 · 월드 · 길드 보스는 그대로. 지난 패치노트는 `lateEase` 로 나눠 그때 값을 적는다. 측정: 관리자(올 스탯 · 무기 +30) 평타는 치명타(80%)면 검사 14.5만 · 궁수 19만 · 마법사 19.7만, 아니면 1만 남짓 — 800레벨 몹을 평타 2번 안에 93~95%, 600레벨 평균 1.2~1.4대.
- **RPG 사냥터 PvP**: 설정(☰)에서 켠 사람끼리만(`h.pvpOn`, 기본 꺼짐). `fieldPvpMap` 이 아닌 맵(광장 · 던전 · 훈련장 · 결투장)에서는 듣지 않는다. 노릴 것을 고르는 `foesNear` · `nearFoes` 가 몹과 켠 사람을 함께 보고, `strikeAny` · `ccAny` · `aliveFoe` 는 `isHeroT`(몹은 `type` 이 있다)로 가른다. 피해 `FIELD_PVP.dmgMul` 0.3.
- **월드보스 전용 효과**: 신규 무기 스킬은 기존 스킬 효과를 재사용하지 않는다(사용자 지시). 전용 종류 `sk_wb_*`와 `worldWeaponArt.js`로 그린다. `combatFx.js`는 저수준 광원·띠·입자 도구다. 용아선풍은 준비 0.1초 → 회전 → 0.34초에 360거리 돌진 → 0.58초 교차 폭발. 총 배율 5.3 · 쿨타임16초 유지. 이동 잔여 상태는 `ws.world.cast.motion`, 추가 연출은 기존 out 묶음에 넣는다. 캐릭터 이동을 손님에게 먼저 예측해 그리지 않는다.
- **비룡육연사 용 비행**: `dragonFlightArt.js`가 전용 투명 6프레임 `rpg/effects/dragon-flight.webp`를 그린다. `DRAGON_FLIGHT_ART`가 프레임 기준점과 크기를 정의한다. `sk_wb_dragon_flight`의 목표 식별자와 주인을 따라 비행하며 방장만 타격 후 `sk_wb_dragon_hit`를 보낸다. 몸을 가리지 않도록 꼬리에만 잔광을 둔다. RPG 진입 때 미리 읽고 실패하면 전용 코드 용으로 대신한다.
- **서버별 월드보스**: 사용자 결정으로 각 서버가 별도 보스를 운영한다. `worldBossData.js`에 출현·체력·패턴·확률을 모으고 `worldBoss.js`가 방장 판정한다. `worldBossArt.js`는 전용 그림과 경고·타격을 그린다. `WorldBossPanel.jsx`는 공통 `.shop` 창이다. 전용 맵 `worldboss`와 몹 종류는 스냅샷 차례 뒤에만 더한다. 상태 `g.wb` 전체를 스냅샷에 넣고 승계 때 몹을 복구한다. 기여는 캐릭터 이름으로 합산하고 실제 피해 10% 초과만 보상한다. `bag.wbDone`은 중복 수령 방지, `bag.wbMail`은 가방 초과 보관이다. 던전 입장권은 `bag.m.dungeon_ticket`이며 명시적으로 선택하면 코인 대신 한 장을 쓴다. 서버 정원10명은 유지하며 성역에는 추가 정원이 없다. 모두 나가면 세계가 사라지는 기존 방식이다. 시험은 `tools/world-boss.test.mjs`.
- **월드보스 포탈·협동 난이도**: 광장 분수 오른쪽 포탈(`WORLD_BOSS.portal`)의 클릭·대화 키로 창을 연다. 화면 버튼·메뉴 항목은 없다. 소환·입장은 방장이 포탈 거리를 검사한다. 사용자 추가 예시(뱀1200만)에 맞춘 체력은 드래곤1150만·뱀1200만·기계1250만. 보스마다 연속 패턴3종과 전용 `sk_raid_*` 효과를 쓴다. 강력 패턴 첫 준비 마지막1.6초에 만렙3명의 스킬 적중이0.85초 안에 모이면 공격을 취소하고4초 기절한다. 평타·지속 피해·패시브는 제외한다. 상태는 기존 `g.wb`로 승계하며 revision4에서 진행 중 체력·기여 비율을 보존한다. 공격량 표본은 `node tools/world-boss-balance.mjs`로 재현한다. 입장 인원 강제가 아니라 공격량과 합동 차단 기준이다.
- **길드**: `guildData.js` 수치, `guild.js` 방장 토벌, `guildArt.js` 전용 그림·효과, `GuildPanel.jsx` 공통 상점 창, `useGuild.js` 입장권 RPC 연동. 입장(10월 23일): 광장 분수 왼쪽 **길드 문**(`GUILD_HALL.door`, NPC `guildDoor`) → 길드가 없으면 길드 찾기 창(`GuildPanel` mode `find`), 있으면 입력 `guild` op `hall` 로 그 길드만의 **길드 광장**(`guildhall-<칸>` 16칸, 방장이 `g.ghalls` 로 길드마다 한 칸 빌려주고 비면 돌려받음 · 방장이 바뀌면 들어온 사람의 `h.guild.id` 로 다시 짝짓는다 · 싸울 수 없는 곳). 길드 광장의 **여신 조각상**(NPC `guild`, mode `hall` — 길드 · 성전 · 주간 순위)과 **토벌전 문**(NPC `guildRaidDoor`, mode `raid` — 보스 선택 + 아래 참여 인원 `RaidCrew`), 왼쪽 문으로 광장. 토벌이 끝나거나 나가면 길드 광장으로 돌아온다(`home`). ☰ 길드 성전(mode `menu`)은 모든 탭. Lv50·5만 코인 생성·4인 정원. 초대/가입 신청 승인·탈퇴·추방·위임·해산. 성전0~70, 길드석 봉헌으로 성장하며 공격력·최대 체력 레벨당0.5%. 출석10석/일. 토벌은 길드 전체3회/한국 날짜, 제한10분, 슬라임/세이렌/불사조100/180/300점과 실제 기여자20/35/50석. 같은 서버의 최초 명단만 참여한다. 길드별16개 맵 중 빈 칸을 배정한다. `g.gruns`와 `g.gresults`, 영웅 줄52 `guild`를 스냅샷에 추가했다. 실패·완료 보고는 퇴장 뒤에도 재시도하고 DB가 한 번만 정산한다. 월요일0시 새 주를 집계하고 지난주 실제 토벌 기여자에게 순위별 코어·코인·길드석·입장권을 한 번 지급한다. 코어는1개당 공속0.5%, 누적20%이며 길드를 나가도 유지한다.
- **여신 조각상 그림**: `rpg/goddess.webp`(투명 891×600, 사용자가 준 그림 — 날개 단 여신 · 검 · 방패). 흰 바탕은 테두리 순백 + 고르게 밝은 갇힌 순백(평균 252.4 이상 · 흔들림 2.05 이하)만 지웠다 — 흰 깃털 · 옷 반짝임은 더 어둡고 흔들려 남는다. `GUILD_STATUE_ART`(guildData.js)가 맵 높이 300 · 발 기준점 · 성전 창 배율, `drawGuildStatue`(guildArt.js)가 그림을 그리고 못 불러오면 코드 그림. `warmGuildArt` 가 같이 미리 읽는다.
- **길드 보스 그림**: 생성한 투명3열×2행 `rpg/boss/guild-bosses.webp`를 쓴다. 열은 슬라임·세이렌·불사조, 위 준비·아래 공격. `GUILD_BOSS_ART`가 크기·발 기준점을 정의한다. RPG 진입 때 미리 읽고 전투와 토벌 선택 화면에 같이 쓴다. 불러오기 실패 시 기존 코드 그림을 남긴다.
- **길드 저장**: 설치 순서 `supabase/rpg.sql` → `trade.sql` → `guild.sql`. 직접 표 접근은 RLS·권한으로 막고 공개 invoker RPC가 비노출 `rpg_private.guild_action`의 입장권·접속 확인을 거친다. 길드석·코어는 별도 DB 지갑이라 가방 저장으로 덮을 수 없다. 생성비·주간 코인/입장권은 기존 `trade_seq`를 올리고 `useTrade.flush/recover`로 최신 캐릭터를 다시 싣는다. 길드 변경은 직렬화하고 관련 캐릭터는 이름순으로 잠근다. 관리 RPC는 광장에서 캐릭터를 잠근 뒤 실행하며 거래 중 차단한다. 전투는 기존 브라우저 방장 판정이다. 시험 `node --test tools/guild.test.mjs tools/guild-db.test.mjs`는 외부 DB 없이 PGlite 메모리 Postgres로 실행한다.
- **월드보스 장비 1차 시험**: `worldEquipmentData.js`가 전설 무기 9종 · 세트 3종(4부위씩) · 스킬/세트 수치 · 그림 좌표를 맡는다. 무기는 Lv100 · 주 능력 +320으로 시작한다. 기존 `SPECIALS`에 뒤에 더하되 상점 · 특가 · 랜덤상자 · 관리자 자동 지급에서 제외한다. 관리자는 가방 방어구 탭의 테마별 시험 지급(`wbgive`) 또는 `/지급`으로 받는다. 신규 방어구 `set`은 저장 · 거래에 보존하고 이름/그림/묶기에 반영한다. 진행 상태 `ws.world`는 스냅샷 46 끝, 세트 상태 `arm.sets`는 방어구 스냅샷 끝에 추가한다. 월드보스 전투·장비 드롭과 길드도 구현했다. 기획은 `docs/월드보스-길드-기획.md`, 시험은 `node --test tools/world-equipment.test.mjs`.
- **RPG 거래 화면**: 가방 물품은 클릭 즉시 등록하고 내 물품 클릭은 즉시 제거한다. 중간 등록 버튼을 두지 않는다. 개수 물품은 1개부터 올리고 내 목록에서 수량을 바꾼다. 확인 버튼은 창 하단에 계속 보이고 양쪽 확인 상태는 체크와 문구로 함께 강조한다. 확인 상태가 바뀌어도 창 전체를 다시 만들지 않아 키보드 초점을 유지한다.
- **RPG 개인 거래**: 관리자를 포함해 서버 계정이 있는 캐릭터끼리 같은 서버 광장에서 파티 창 "거래"로 신청한다(파티 가입 불필요). 전용 서버에서는 서버가 장부를 대신 부른다(화면 `useTrade.js` 가 `room.ledger('trade_open' · 'trade_action')`). 장착하지 않은 무기 · 방어구, 물약 · 재료 · 워프권 · 방지권, 코인을 교환한다. 품목 12개 · 3분 제한(`tradeData.js`와 `supabase/trade.sql` 수치를 함께 맞춘다). 거래 중 이동 · 가방/능력 변경을 방장 판정에서 막고, 파티 던전 입장과 관리자 지급/소환에서도 제외한다. DB가 두 캐릭터를 이름순으로 잠가 한 트랜잭션으로 교환하고 받는 가방에서 장비 번호를 새로 매긴다. 내용 해시가 바뀌면 양쪽 확인이 풀린다. `trade_seq`/기록 `ts`보다 오래된 저장은 `stale`로 거절하고 입장권을 유지한 채 `rpg_load`로 복구한다. 입장 때 `rpg_live`의 `ts`도 비교한다. 확정 뒤 자기 기록은 방장이 받았다는 스냅샷이 올 때까지 다시 보낸다. 스냅샷 줄 끝 50은 `ts`, 51은 거래 잠금이다. 상태/등록/확인은 DB RPC로 읽고 기존 방 메시지를 늘리지 않는다. 장비 이동은 `rpg_trade_moves`, 관리자 화면 거래 탭은 `rpg_admin_trades`. DB 설치 순서: `supabase/rpg.sql` → `supabase/trade.sql`, 회귀 시험 `supabase/tests/trade.sql`(시험 DB 전용). 초기화 뒤에도 `ts`와 다음 장비 번호 `bag.n`을 보존한다.
- **RPG 1차 전직**(10월 26일): 200레벨(`ADV.lv`)부터 광장 전직 교관(640, 360)에게 시험을 받고 마치면 확정한다. 되돌릴 수 없다. 검사(화면 이름, 예전 "전사" · id `warrior`) → 검투사 · 기사, 궁수 → 명사수 · 총사, 마법사 → 마도사 · 소환술사 · 치유사. 기본 `job` 은 그대로, 기록에 `advClass` · `advQ`(`{ c, n, v 시험 판, m 목록 시험 종류마다 수 }`, 시험 판 `ADV.trialVer` 가 다르면 진행 0) 를 더했다(loadChar · writeChar · heroRecord · rpgJoin · myData — 빈 전직이 와도 남긴 전직은 지우지 않는다, `advRecord`). 액티브는 키 `adv`(기본 Z) 한 칸, 입력 kind `adv`(op start · drop · confirm · use · 관리자 reset). 싸우는 동안의 상태 `h.as` 는 스냅샷 줄 53(`packAdv`), 명사수 표식은 몹 flags 1024. 시험(판 2): 검투사 결투 승리 80% 로 시험 레벨 1→15 · 기사 사람 · 몬스터에게 100대 · 명사수 비타겟팅 스킬 연속 20 명중 · 총사 300레벨까지 몬스터 10종 · 마도사 시험 중 쓰는 마력 폭발로 잡아 5마리마다 시험 레벨 1→10 · 소환술사 보스 재료 10종 × 5개. 진행 글은 `trialText`, 목록 진행은 스냅샷 줄 53 끝. 총사 · 소환술사는 전직 무기(`SPECIALS` 의 `adv` — 상점 · 특가 · 랜덤 상자 · 관리자 자동 지급 제외, 종류 `gun` · `grim`)를 받는다. 기사 감소 합계는 70% 상한, PvP 패시브 추가 피해 +15% 상한 · 경직 절반. 캐릭터 그림은 사용자가 준 전직 시트(`design/advance/classes/<전직>.webp`, 남 · 여 × 4방향, 무기를 든 그림)를 `tools/cut-adv-classes.py` 로 잘라 `characters/rpg/<전직>-<성별>/` 에 둔다(검투사 키를 검사 키에 맞춘 배율을 모두에게). 전직 그림을 불러오면 그 그림을 그린다(`advBody`, rpgArt.js). 특별 무기를 끼면 무기를 지운 전직 그림(`<보기>-bare.webp`)에 그 무기를 손에 들린다(`advHeld` · 손 자리 `ADV_HAND`, 방향은 기본 직업 손 값을 몸 바깥쪽으로 `outward`). 지운 그림은 전직 시트를 Codex 로 고쳐 무기를 지우고 빈 주먹에 자홍 점을 찍은 원본(`design/advance/bare/<전직>.webp`)을 `python3 tools/bare-adv.py` 가 잘라 손 자리를 뽑는다. 손이 가린 보기(대개 뒤)와 그림에 이미 든 전직 무기(총사 총 · 소환술사 소환서 `ADV_OWN`)는 전직 그림 그대로. 못 불러오면 예전처럼 bare 그림에 총 · 소환서 · 방패를 얹는다. 효과 그림은 생성 아틀라스(`rpg/advance/`). 소환술사 정령은 목록 `h.as.sps`(쓸 때마다 하나 더 · 최대 `active.max` 10 · 부를 때 모두 `life` 로 다시 참 · 여럿이면 `spiritSpot(h, i, n)` 고리), 스냅샷 줄 53 끝(10)에 정령마다 남은 초. 훈련장 쿨타임 끄기는 `h.as.cd` 도 0. 치유사(10월 26일, `ADV_IDS` 끝 `healer`): 수호의 축복은 범위 안 사람의 `h.as.blT`(40초) · `blCut` · `blReg` 를 건다(받는 피해 감소는 `advTakeCut` 이 기사 cap 안에서 합침, 이어 회복은 `tickAdv`, 스냅샷 줄 53 끝(11) 남은 초). 축복은 공격력도 `atk`(+15%) 올린다(`h.as.blAtk`, `advDmgMul` 이 전직과 상관없이 더함). 치유 평타: 키 `healMode`(기본 V) → 입력 `adv` op `mode` 로 `h.healMode` 를 바꾸고(스냅샷 줄 53 끝 13), 켜 두면 `advHealShot`(rpg.js `heroAttack` 첫머리)이 몹 대신 사거리 안 가장 다친 사람에게 `healShot.heal`(3%) — 결투장에서는 공격. 결투 · 사냥터 PvP 는 나에게만. 둘레 고리 그림 `rpg/advance/adv-bless.webp`(Codex 생성 3×2 · 검은 바탕 lighter, `ADV_BLESS`), 캐릭터 시트 `design/advance/classes/healer.webp`(Codex 생성 · 초록 바탕을 지움) → `python3 tools/cut-adv-classes.py healer`. 시험 `node --test tools/advance.test.mjs`.
- **적룡 지팡이**(10월 27일): 사용자가 준 영상(로블록스 「Draconic Fury」)의 스킬을 그대로 옮긴 전설 지팡이 `fury_staff`(100레벨 · 마법력 +260). **얻는 곳은 사용자가 정한다** — 그때까지 `SPECIALS[].hold` 로 상점 · 특가 · 랜덤 상자 · 관리자 자동 지급에서 빼고(`!sp.hold`), 관리자 `/지급 <이름> 적룡 지팡이` 로만 준다. 무기 스킬 용의 격노(skillData.js `fury_staff` — 바닥 마법진 → 초승달 베기 `slash.at` → 앞 `burst.ahead` 화염구 폭발 → 그 자리에서 앞으로 광선 `beam`(rpg.js `lineFrom`) → X 표식). 연출은 한 통 `sk_fury`(맞은 자리 `sk_fury_hit`), 그림은 생성 아틀라스 `rpg/effects/fury-fx.webp`(4×2 · 검은 바탕 lighter, 단계 시각 · 크기 `FURY_ART`, 그리기 furyArt.js). 지팡이 그림 `rpg/weapons/fury_staff.webp`(원본 `design/weapons/fury_staff.webp`). 패시브 용의 불씨 — 평타가 맞으면 대기 0.4초 감소(`w.fyT`). 시험 `node --test tools/fury.test.mjs`.
- **RPG 책**: 패치노트 · 가이드는 `bookData.js` 에서 고치고 가방 "책" 탭에 늘 보인다. **업데이트마다 `PATCH_BOOKS` 맨 위에 책 한 권을 더하고, 밸런스 수치를 바꾸면 전후 값을 적는다.**
- **RPG 업데이트 공지**: `RPG_NOTICE`(`updates.js`) id 를 바꾸면 RPG 서버에 들어올 때 모두에게 "업데이트 안내" 창이 한 번 뜬다(기기마다 `flg:rpgNotice`).
- **RPG 업데이트 선물**: `GIFT`(`itemData.js`). 캐릭터마다 `gift` id 가 다르면 들어올 때 한 번 주고 안내 창을 띄운다. 새 선물은 `GIFT.id` 만 바꾼다. 한 사람에게만 주는 선물은 `PERSONAL_GIFTS`(캐릭터 이름 · 방어구 · 그 사람 채팅 칸에만 뜨는 문구, 받은 id 는 `bag.pg`, `givePersonal`). 접속 중인 사람의 기록은 10초마다 저장되어 DB 를 직접 고치면 덮어써지므로 이 방법을 쓴다.
- **RPG 한 사람 되돌리기**: 기록이 잘못 부풀려진 캐릭터는 `PERSONAL_ROLLBACKS`(itemData.js, 이름 · 레벨 · 코인)에 적는다. 들어올 때 방장이 한 번 레벨 · 코인 · 스탯 · 가방 아이템 · 전설 특별 무기 · 그 몫이 아닌 칭호를 되돌리고(`rollbackHero`) 받은 id 를 `bag.pg` 에 남긴다. 이 이름은 관리자 표시가 실려 와도 관리자가 아니다. 레벨이 내려가도 저장되게 `writeChar` · `heroRecord` 가 `rolledBack` 으로 길을 열어 둔다. DB 를 직접 고치면 접속 중 10초마다 덮어써진다.
- **RPG 광장 의뢰**: NPC 마다 하나씩 맡는다(`h.reqs`). **처음 한 번은 그 NPC 에게 말을 걸어 받고**(만난 NPC 는 가방 `bag.mt`, `metNpc` · `meetNpc`, 이 결정 전부터 맡던 것은 만난 것으로 본다), 그 뒤로는 왼쪽 위 의뢰 칸(`.rpg-quest`) → 의뢰 · 퀘스트 창(`questOpen`)에서 어디서든 받고 · 끝내고 · 포기한다(`rpgRequest` 는 만나기 전 받기만 `reqNear` 를 본다). 사냥꾼 토끼 퀘스트도 같다(`rpgQuest`, 입력 kind `quest`, `QUEST_NPC`). 사냥 의뢰는 받은 뒤 잡은 수, 재료 의뢰는 완료 때 가방에서 뺀다. 보상 경험치는 그때 레벨 필요 경험치 × 몫.
- **RPG 결투 · 명예**: 1대1과 2인 파티끼리의 2대2. 파티 창에서 신청 → 수락하면 결투장 빈 칸(4칸, 크기는 `ARENA_RING`)으로 둘만 옮긴다(`rpgDuel` · `tickDuels`). 결투장 문은 없다. 자동 평타 꺼짐, 피해 ×0.3, 스킬 한 번(여러 번 치는 스킬은 합쳐) 최대 **맞는 사람 최대 체력의 12%**(`DUEL.skillPct`, 고정 1000 이면 체력 500 이하가 한 방에 쓰러졌다 · 센 사람이 6번이면 절반) · 평타 한 대 최대 3%(`DUEL.basicPct`) — 스킬은 부드럽게 누른다(`skillSoft` 는 한도의 배수, `hitFoe` 의 `pvpSoft` · 스킬마다 `newCast`, 평타는 그대로), 3초 세기 · 90초 무승부. 이기면 명예 += 진 사람 명예 × 10% + 10(`DUEL`). 순위는 Supabase 함수 `rpg_honor_top`(광장 명예 순위판).
- **RPG 마법사 강화**(10월 23일): 몹 · 보스에게 주는 피해 배율 `JOB_DMG`(rpg.js, 마법사 1.05 — `hitMob` 에서 곱한다, 결투 · PvP `hitFoe` 는 그대로, 다른 묶음 무기 고정 피해에는 붙지 않는다). 지속 피해 중첩 `DOT_STACK`(직업 mage · 최대 3겹 · 같은 몹에 0.5초에 한 겹, `soak` 의 `m.bst` · `m.pst`, 틱 = dps × 겹). 방장만 들고 스냅샷에는 싣지 않는다. 시험 `node --test tools/mage.test.mjs`.
- **RPG 전직 연출 · 추가 스탯**(10월 26일): 확정하면 연출 `sk_adv_up`(advArt.js, 그림 `rpg/advance/adv-up.webp` 6칸 · 검은 바탕을 lighter 로, 시간 · 크기 · 밝기 `ADV_UP`)과 "전직 — 이름" 글자. 추가 스탯 `ADV_BONUS`(advData.js, 전직마다 포인트 약 40점어치 — 검투사 물리력 60 · 치명타 피해 10 / 기사 체력 450 · 물리력 20 / 명사수 치명타 10 · 치명타 피해 20 / 총사 물리력 40 · 치명타 10 / 마도사 마법력 80 / 소환술사 마법력 40 · 체력 300)는 shop.js `extraStat` 이 더한다(스탯 창 초록 몫). 확정 때 `refreshHp` 로 체력을 바로 채운다. 시험 `tools/advance.test.mjs`.
- **RPG 전직 숙련도 · 전투 특성**(10월 27일): 기록 `advM`(0~4,500, `cleanAdvM`) — 단계 1 전직 · 2 300 · 3 1,500 · 4 4,500(`ADV_MASTERY.pts`, advData.js). 예전 전직 기록도 1단계. 방장이 몹을 잡을 때만 오른다(`masteryKill` · 월드 · 길드 보스 `advRaidKill`): 160레벨 이상 사냥터 몹 1 · 사냥터 보스 20 · 던전 보스 30 · 레이드 60, 1분 120(`h.as.mqB`), 허수아비 · 훈련장 · 결투 · PvP 제외, 입력으로는 관리자 op `mastery` 만. 낮은 값이 와도 내리지 않는다(`advRecord`). 2단계에 전직마다 전투 특성 하나(`ADV_TRAITS`, 값은 [2 · 3 · 4단계] 배열, `traitAt` · `traitOf`) — 새 키 · 스킬 칸 없음: 검투사 연계 참격(`cast.sid` 가 다른 스킬 둘) · 기사 수호의 방패(철벽 중 충격파 · 일반 몹 도발 `m.taunt`, rpg.js `taunted`) · 명사수 정밀 사격(`h.as.pr` → 평타 `advPrecFire` · `advPrecLand`, 첫 적은 `pNow` 로 약점 +30% 겹침 없음) · 총사 기동 사격(후퇴 사격 → `mvT`, `advGunShot` · 사거리 `advRangeMul`) · 마도사 원소 공명(`rs` → 마력 폭발 `resonate`) · 소환술사 정령 협동 공격(`coopHit`) · 치유사 긴급 보호막(rpg.js `hurtHero` → `advLowHp`, 받는 사람마다 `h.as.esT`). 특성 피해는 `noProc` + 그 스킬의 `h.cast` 한도 안. 스냅샷 줄 53 끝 14~19(advM · tcd · pr · mvT · rs · rsT). 연출 `sk_adv_combo · wave · prec · mshot · reso · coop · esh · mastery`(advArt.js). 창은 AdvPanel.jsx `Mastery`(☰ "전직 숙련도"로도 연다). 시험 `tools/advance.test.mjs`.
- **RPG 경험치**: 몹 경험치는 `XP_RATE`(0.2, 5배 줄임)를 곱한다. 퀘스트 경험치는 그대로. 파티원은 같은 맵이면 몹 경험치의 50%를 받는다.
- **RPG 채팅**은 방장을 거치지 않고 모두에게 바로 보낸다(1초에 한 번). 파티 · 칭호 알림은 방장이 `sys` 로 보낸다.
- **RPG 방장 승계**: 방장이 나가도 서버는 닫히지 않는다. 남은 사람이 받은 스냅샷을 판정 세계로 바꿔(`rpgPromote`) 자리 · 체력 · 몹을 그대로 잇는다. 손님은 새 방장에게 기록을 다시 보낸다. 손님에게 보이는 새 상태는 스냅샷에 넣어야 승계 뒤에도 남는다.
- **RPG 메시지 한도 · 저장 지킴**: 손님의 키 입력은 방 채널이 아니라 손님마다 방장과 둘만 있는 통로(`<코드>:in:<손님 id>`, room.js `makePipes` · `toHost` · `hostInbox`)로 보낸다 — 방 채널로 보내면 모두가 받아 13명에서 초당 300통이 넘었다. 보내기만 하는 REST 길은 120~280ms 느려 쓰지 않는다. 방장이 옛 화면이면 방 채널로 보낸다(`oldHost`). 서버 저장 `rpg_save` 는 관리자가 아니면 기록 이름이 다르거나 · 레벨이 내려가거나(서버 초기화 `rs` · 되돌리기 `bag.pg` 제외) · 지난 저장보다 15 + 1분마다 1 넘게 뛰면 막고 `rpg_save_blocks` 에 남긴 뒤 입장권을 지운다(그 기기는 "섞인 것 같아 저장을 멈췄습니다", 코드를 다시 넣으면 서버 기록으로). 막은 기록은 관리 화면 로그 탭. **코인 지킴**: 지난 저장보다 코인이 `rpg_coin_cap`(rpg.sql 위쪽, 100만 + 1분마다 50만) 넘게 늘거나 숫자가 아니면 why `coins` — 지금은 `rpg_coin_block()` false 라 남기기만 하고 저장한다(슬롯 7 잭팟 · 재료 몰아 팔기 · 관리자 `/돈` 은 정상인데 넘을 수 있다). `rpg_srv_save` 도 거래 트리거 오류를 `{ok:false, err}` 로 돌려주고 서버는 그 접속의 저장을 멈춘다. 시험 `node --test tools/rpg-save-db.test.mjs`.
- **RPG 한 캐릭터 한 곳**: 서버 계정이 있는 캐릭터는 들어갈 때 · 10초마다 `rpg_live`(이름 · 입장권 · 창 id `myId` · 서버)로 접속 중 표시를 남긴다(App.jsx `startRpg` · `liveCode` 효과, rpgSave.js `liveEnter` · `LIVE_BEAT`). 다른 창의 표시가 30초(`rpg_live_secs`) 안이면 들어가기 · 이어 하기(`rpg_login`)가 'live' 로 막힌다. 같은 창의 서버 이동은 된다. 나가기 · 창 닫기 때 `rpg_unlive`. 그사이 다른 곳이 차지했으면 이 창이 나간다.
- **RPG 방장 넘기기**: 방장이 나가기 · 창 닫기를 하면 다음 사람에게 방장을 넘기고 나간다(`handoff`, App.jsx). 화면을 내리면(휴대폰 잠금 · 다른 앱 · `visibilitychange`) 방장은 곧바로 넘기고, 내린 사람은 presence `hid` 로 표시해 방장을 받지도 이어받지도 않는다. 방장이 붙어 있는데 조용하면 `HOST_QUIET_MS`(3초) + 앞선 사람마다 `HOST_AHEAD_MS`(1.5초) 뒤 이어받는다 — 대기실 소식과 방장 스냅샷(room.js `onHeard`) 모두 살아 있는 소식으로 센다. 대기실 소식의 방장 차례 `ep` 가 작은 소식은 버린다. 30초마다 돌려 바꾸는 방식은 쓰지 않는다 — 바꿀 때마다 모두가 잠깐 끊긴다. 관리 화면(`?admin`)의 "방장 부여"도 같은 `handoff` 를 쓴다.
- **RPG 마우스 오른쪽 클릭 이동**(10월 30일, 1단계): 이동 방식을 마우스로 바꾼 PC 에서 땅을 우클릭(맥 Ctrl+클릭)하면 그곳으로 걷고 누른 채 끌면 따라간다. 입력 kind `mv`(`{x, y, m 맵}`, rpgInput.js ACTS → `rpgMove`)가 영웅 `h.dest = { map, x, y, mob -1 }`(`mob` 은 2단계 몹 추적 자리)을 정하고 방장 · 서버 · 손님이 같은 `rpgWalk` → `walkTo` 로 걷는다(키보드와 같은 속도 · `speedMul` · `armorSpeed` · 세로 squash). `freshInput` 이 `mv` 를 `hold` 와 번호 칸을 같이 쓰게 해 손님 걷기 보정(`SYNC`)을 그대로 쓴다. 수치는 rpg.js `MOVE` 한 곳(도착 6 · 막힘 0.3/0.35초 · 비켜 걷기 `steer` · 나아가지 못하면 `progT` 3초 뒤 버림). 방향키(`rpgHold`)·쓰러짐·도발·대쉬·문·워프·던전·길드·월드보스·결투·거래·소환은 목적지를 지우고 맵이 다르면 `walkTo` 가 안전망으로 버린다. 경직·속박·창뢰 충전 중에는 멈추되 목적지는 남긴다. 스냅샷 영웅 줄 55 = 목적지 `[x, y]`(없으면 0) — 줄이 없는 옛 방장 · 서버는 `h.mvOk = 0` 이라 토스트만 띄운다. 서버가 이미 받은 뒤(`ackHoldQ` ≥ `h.mvQ`)에도 55 가 0 이면 손님이 목적지를 버린다. 방장 승계는 `myData().mv` → `rpgJoin` 의 `d.mv`. 화면(RpgView.jsx): 캔버스 `contextmenu` 차단, 끌 때 `MV_UI.gap` 100ms · `min` 20px 와 마지막 점 전송, 창 · 채팅 · 키 설정 중에는 무시, NPC · 월드보스 포탈 우클릭은 `npcStopPoint` 로 가서 닿으면 `act("talk")`. **이동 방식 선택**(10월 30일 (2)): 기본은 키보드이고 ☰ "이동 방식" 줄에서 키보드 · 마우스 중 하나를 고른다(`flg:rpgMoveMode`, 값 `mouse` 일 때만 마우스 — 옛 켜짐 · 꺼짐 키 `flg:rpgMouseMove` 는 읽지 않아 모두 키보드로 시작, 판정 함수는 mouseMove.js `loadMoveMode` · `effectiveMoveMode` · `moveKeysOn` · `moveSwitchTasks`). 마우스 방식에서는 이동 4행동(키 설정에서 바꾼 키 · 방향키 기본 키 포함)의 `pressDir` · `hold` 가 꺼지고, 키보드 방식에서는 우클릭 이동을 듣지 않는다(contextmenu 차단은 늘 유지). 바꾸는 순간 키보드→마우스는 눌린 방향을 놓고, 마우스→키보드는 입력 `mv` `{stop: true}`(`rpgMove` → `stopMove`)로 가던 목적지를 취소한다. 터치 기기는 고르는 줄을 숨기고 늘 키보드(패드). 평타 · 스킬 · 대화 등 다른 키는 방식과 상관없다. 클릭 표시는 rpgArt.js `drawMoveMark`(`MOVE_MARK`). 몹 우클릭 추적 · 공격은 2단계. 시험 `node --test tools/mouse-move.test.mjs`.
- **방장 전용**: 시작 · 난이도 · 라운드 · 일시정지(결전 중에도) · 속도. 손님 화면에서는 버튼이 비활성.

## 6. 작업할 때 지킬 것

- 밸런스 숫자는 **이름 붙은 상수**로 두고, 바로 옆에 한국어 주석으로 이유를 적는다. 매직 넘버를 흩뿌리지 않는다.
- 코드 주석 · 화면 문구는 한국어. 주변 코드의 말투와 밀도를 따른다.
- 규칙은 방장만 돌린다. 손님에게 보여야 하는 새 상태는 **스냅샷(`packSnapshot`/`applySnapshot`)에 넣는 것을 잊지 않는다.**
- 탑 수치를 바꾸면 함께 고칠 곳: `world.js`/`logic.js` → `towerInfo.js` → (필요하면) `updates.js` → `docs/기능-명세서.md`.
- **업데이트 노트**(`updates.js`): 새 소식은 맨 위에 더한다. `id` 는 순서용이라 이미 나간 것은 고치지 않는다(새 것은 맨 위 항목의 id 보다 큰 값). 화면에 보이는 `date` 는 **실제 한국 날짜**로 적는다. 사용자에게 보이는 변경은 노트에 남긴다.
- **그림**: 경로 · 파일 이름은 그대로 두고 그림만 바꾼다. WebP, 투명 배경. 크기 · 기준점은 `public/assets/game/README.md` 표를 따른다. 그림을 못 불러와도 게임이 깨지지 않게 코드 대체 그림을 남겨 둔다.
- 누끼를 딸 때는 하얀 깃털 · 옷까지 지워지지 않게 확인한다(초록빛 흰색만 지우는 식으로 색 조건을 좁힌다).
- 테스트 서버 비밀번호는 코드에 해시(`TEST_HASH`, `App.jsx`)로만 둔다. **평문을 저장소에 적지 않는다.** 시험할 때는 브라우저에서 `localStorage["flg:test"] = TEST_HASH` 로 통과시키면 된다.

## 7. 확인 절차 (push 전에 꼭)

```bash
npm install            # 처음 한 번
npm run build          # 빌드가 통과해야 한다
npm run lint           # oxlint
npx vite --port 5199   # 백그라운드로 띄운다. 자주 죽으니 연결 거부가 나면 다시 띄운다
```

- 화면 확인은 Playwright(크로미움이 `/opt/pw-browsers` 에 있음, `playwright install` 하지 말 것)로 한다.
- 규칙 변경은 페이지 안에서 `makeGame` 과 logic 함수를 직접 불러 숫자로 검증한다(예: 비용 표, 한도, 성채 정산 100→90).
- 여러 명 동작(방장 · 손님)은 브라우저 컨텍스트 둘을 띄워 같은 방 코드로 들어가 본다.
- 끝나면 push → Vercel 배포가 READY 인지 확인 → 사용자에게 보고.

## 8. 겪었던 함정

- 업데이트 노트 날짜를 id 그대로 적어 사용자가 헷갈렸다 → `date` 는 실제 날짜로.
- 테스트 서버가 4단계 한도를 무시해 "버그"로 보고됐다 → 기본은 적용, 스위치로만 끈다.
- 비용 칸 문구가 넘쳤다 → 좁은 칸은 문구를 짧게("4단계 한도 꺼짐").
- 보스 결전 중 일시정지가 안 됐다 → 일시정지 처리에서 결전 상태도 허용해야 한다.
- 성채 체력이 1에서 더 안 깎였다 → 성채 체력 규칙은 5장의 정산 방식을 따른다.
- RPG 렉 · 캐릭터가 뒤로 감 · 공격 안 나감 → Supabase 무료 한도(프로젝트 전체 초당 메시지 100개, 받는 사람마다 1개로 셈)를 넘어 연결이 끊긴 것. 스냅샷과 연출을 한 통으로 보내고, RPG 는 인원에 따라 빈도를 줄인다(`SNAP_BUDGET`, `RpgView.jsx`). 새로 자주 보내는 메시지를 더할 때 이 한도를 먼저 셈한다.
- 영웅 필드 이름이 겹쳐 파티 초대가 안 됐다(`h.inv` 는 대쉬 무적 시간) → 새 필드를 더할 때 `grep` 으로 이름이 비었는지 먼저 본다.
- 남의 기록이 다른 캐릭터에 덮어써졌다(이채영사랑해 Lv 100 → 극우몰이 김도현의 Lv 36) → 자리를 떠난 사람이 늦게 보낸 `rjoin` 이 자리 번호만 보고 새로 앉은 사람에게 실렸다. 지금은 `rjoin` 에 보낸 사람 id(`who`)를 싣고 자리 주인과 같을 때만 싣는다(`rpgJoin`). `writeChar` 는 레벨이 내려간 기록을 저장하지 않는다.
- RPG 에서 걷다가 뒤로 당겨졌다(3명부터 잦다는 제보) → 메시지 한도 · 사람 수 탓이 아니었다. **Supabase 는 같은 사람이 보낸 메시지도 순서를 바꿔 전한다**(실측 25초에 5~15번). 옛 스냅샷이 늦게 오면 옛 위치로, 옛 누름 · 뗌이 늦게 오면 방장이 멈춘 줄 안다. 지금은 스냅샷과 hold · fire 입력에 차례 번호 `q`(`nextSeq`, `RpgView.jsx`)를 싣고 작은 번호를 버린다(`freshInput`). 새로 자주 보내는 "마지막 상태" 메시지를 더할 때도 번호를 싣는다.
  그래도 손님 화면은 옛 방장 위치를 **지금** 내 위치와 견줘 당겨졌다(멈출 때 끌림 · 지연이 튀면 순간 이동). 지금은 방장이 스냅샷 줄 끝(42 · 43)에 "받은 누름 번호 · 받은 뒤 지난 ms"를 싣고, 손님은 그 때의 내 위치 기록(`h.hist`)과 견줘 차이만 나눠 고친다(`SYNC`, `rpg.js`). 마지막 전송과 방장이 확인 중인 누름의 시각은 남긴다. 대쉬 방향은 입력에 실어 보낸다(`rpgDash(g, pi, aim)`). 대쉬·돌진 입력은 hold보다 늦게 닿을 수 있어 hold 시각만으로 도중 위치를 견주면 뒤로 끌렸다. 손님은 성공한 대쉬·돌진의 기존 0.6초 예측 대기 동안 위치 보정을 미루고 이전 보정도 지운다. 맵 변경·피해·사망 상태는 그대로 받고 대기 뒤에는 방장 위치를 다시 비교한다. 0.6초보다 오래 밀리거나 돌진 대상이 달라지는 경우는 별도 확인이 필요하다.
- 3명 이상이 스킬을 몰아 쓰면 버벅였다 → 판정(0.5ms)이 아니라 **그리기**가 무거웠다(연출마다 프레임마다 그라데이션 수십 개). 지금은 둥근 빛을 한 번 그린 그림으로 찍고(`glowAt`, skillArt.js), 프레임이 느리면 알갱이를 덜 그리며(`FX_LOD` · `setFxQuality`), 같은 종류 연출은 최근 몇 개만 · 화면 안 것만 그린다(`pickSkillFx`, rpgArt.js). 연출은 스냅샷 한 통에 120개(`OUT_PER_SNAP`), 밀리면 오래된 것부터 버린다(예전엔 60개 · 150개 넘으면 모두 버렸다). 새 연출을 더할 때 알갱이 수에 `nq()` 를 쓴다.
- 전용 서버에서 스킬 · 걷기가 조금씩 느렸다 → Durable Object 는 **처음 만들어진 곳에 머문다.** 미국에서 먼저 접속해 방이 버지니아에 생겨 한국에서 왕복 0.2초가 더 들었다. 지금은 `locationHint: "apac"` 로 아시아에 만들고, 옮겨야 하면 `ROOM.gen`(server/src/index.js)을 바꿔 새 방을 만든다. 게임 방은 처음 접속한 곳 가까이(아시아 안)에 생기므로 미국의 점검 기계가 만들지 않게 배포 점검(smoke.mjs)은 따로 `CHECK` 방을 쓴다. 방 위치는 `/where/<서버>` 로 본다(부르면 방이 생기니 게임 방에는 쓰지 않는다).
- 전용 서버에서 소리 · 스킬이 한 틱 늦고 걷다가 당겨졌다 → ① 손님 화면이 한 프레임 시간을 0.05초로 잘라 프레임이 끊기면 내 시계가 실제보다 뒤처졌다 — 지금은 흐른 시간만큼 잘게 나눠 돈다(`GUEST_CATCH_UP`, RpgView.jsx) ② 서버가 입력을 받아도 다음 스냅샷까지 기다렸다 — 지금은 받자마자 판정해 보낸다(`now()` · `RUSH_MS`, server/src/room.js) ③ 방이 홍콩에 생겼다 — 아시아 안에서도 Cloudflare 가 자리를 고르므로 `/place/<서버>/p<n>` 으로 만들어 보고 서울(ICN)에 생긴 이름끝을 `GENS`(server/src/index.js)에 적어 둔다.
- 다른 캐릭터에 관리자 레벨 · 코인이 옮겨 갔다(니여친레보탱 Lv 400 · 코인 1억) → RPG 기록은 브라우저마다 localStorage 한 칸(`flg:rpg3`)이라, 같은 브라우저의 다른 탭이 다른 캐릭터로 들어오면 이 탭이 그 기록을 방장에게 보내고 제 이름으로 저장했다. 지금은 탭이 들어올 때의 이름(`selfName`, RpgView.jsx)과 다르면 보내지도 저장하지도 않고, 방장도 기록 이름(`d.name`)이 자리의 캐릭터 이름과 다르면 싣지 않는다(`rpgJoin`).
- 렉 뒤에 모두의 레벨이 섞였다(10월 19일, 마법사에게 궁수 스탯 · 남의 되돌리기 표시가 옮겨 감) → 방장이 5초 조용하면 손님이 이어받아 **방장이 잠깐 둘**이 되고, 손님은 두 방장의 lobby(자리 번호)와 rsnap 을 섞어 받았다. 내 자리 번호에 남의 영웅이 실린 채 저장 루프가 그 기록을 내 이름으로 저장했다. 지금은 손님이 지금 방장(`hostId`)의 rsnap 만 받고, 스냅샷 `w`(자리마다 주인 id)를 영웅 `h.sw` 에 실어 `ownHero` 가 맞을 때만 저장한다. 승계 때 `h.who = h.sw`, `rpgLooks` 는 `who` 를 덮지 않는다(덮으면 `rpgSyncSeats` 가 주인이 바뀐 것을 못 본다).
- 13명이 한 서버에 모이자 대부분의 기록이 섞였다(10월 19일 15시) → Supabase 실시간 기록에 "초당 메시지 한도 초과"가 남았다. 손님 입력이 방 안 모두에게 가서 받는 사람 수만큼 셌다. 방장 소식이 끊기자 여러 손님이 방장을 이어받아 자리 번호가 섞였다. 지금은 입력을 방장에게만 보내고(통로), 서버당 10명 · 서버 4개, 서버가 섞인 저장을 막는다. 원인은 코드를 해시로 저장하는 것과 관계없다(로그인은 이름 + 코드가 정확히 맞아야 된다). Supabase 로그는 `query_logs` 의 `realtime_logs` 에서 `MessagePerSecondRateLimitReached` 로 찾는다.
- 월드보스에서 렉(10월 23일) → 판정 · 스냅샷이 아니라 **손님 화면의 연출 그리기**였다. 한 맵에 10명이 모여 모두가 남의 월드보스 무기 연출(하나에 휴대폰 속도로 3~5ms)을 다 그렸다. 지금은 스킬 연출에 주인 `by`(rpg.js `setFxBy` — 입력 · 사람마다 판정 · later · 투사체 · 장판 · 균열 동안)를 싣고, 같은 맵 5명 이상이면 남의 연출은 최근 몇 개만 · 남의 피해 숫자 · 스킬 이름은 숨긴다(rpgArt.js `CROWD`). 주인이 없는 연출(보스 경고)은 줄이지 않는다. ☰ "연출 줄이기"(`flg:rpgLowFx`). 그리기 시간은 캔버스가 나중에 칠하므로 연출 하나씩 재면 작게 나온다 — 같은 장면을 그린 뒤 `getImageData` 로 1px 를 읽어 칠하기까지 재야 한다.
- 월드보스 중 사람이 사라지고 · 멈추고 · 보스 체력이 되돌아갔다(10월 23일) → 메시지 한도 · 배포가 아니었다(Supabase 로그 깨끗). 방장 기기가 잠들거나 오래 멈추면 손님이 이어받는데(ep +1), 돌아온 옛 방장이 아이디만 견줘 다시 이기면 **세계가 멈춘 때로 되돌아갔다.** 지금은 더 큰 ep 의 대기실 소식을 들은 방장은 무조건 물러나고(App.jsx `lobby` 의 `newer`), 이어받을 때 아직 붙어 있는 옛 방장의 자리는 남긴다(`hostHere`). 재현은 방장 창을 `while` 로 15초 멈추고 그 사이 새 방장에서 보스 체력을 바꾼 뒤 견준다(옛 방장 아이디를 가장 작게 — sessionStorage `flg:id`).
- 던전 보스 체력바가 가끔 비거나 안 떴다 · 월드 · 길드 체력바가 던전과 달라졌다(10월 23일) → 루프(`tickBossBars`)가 값이 같으면 건너뛰어 새로 붙은 칸이 빈 채로 남았다(지금은 DOM 이 바뀌면 다시 채운다 `bossNode`), 처음 체력을 모르면 너비가 NaN% 였다(`BossHealthBar` 처음 값 가드), 던전 보스는 진행(`g.runs`)이 늦어도 던전 맵 보스면 잡는다. 월드 · 길드 진행 칸은 던전 칸 `.rpg-dg` 를 그대로 쓴다(`.rpg-raid` · 기술 줄 `.rpg-raid-warn` 만 더함) — 따로 스타일을 덧입히지 않는다.
- 배포 뒤 "알 수 없는 요청입니다" · 새 맵 문이 안 열림 → 방장이 옛 화면을 띄워 둔 것(판정은 방장 코드가 한다). 지금은 `version.js` 가 옛 화면을 스스로 새로 고친다. 새 요청 · 새 맵을 더할 때 이 점을 기억한다.

- **영상 무기 3종**(10월 30일): 뇌명 지팡이 · 자전궁 · 창뢰 쌍검. 월드보스 뇌조 전용 보상(각 2%, `rewardBoss`). hold는 상점·특가·상자 제외용으로 유지한다. 데이터 stormWeaponData.js · 판정 stormWeaponCombat.js · 연출 stormWeaponArt.js. 창뢰 비상참은 X 누름/뗌 입력 wcharge를 쓰고 ws.storm을 스냅샷 줄 46 끝에 보관한다. 분석과 검증은 docs/영상-무기-3종.md, 시험 tools/storm-weapons.test.mjs.
- **월드보스 뇌조**(10월 30일): 체력 1,300만. `worldBossData.js`에 패턴·전용 원화 설정, `worldBoss.js`에 소환·드롭·수령함. `WORLD_BOSS_WEAPONS`가 기존 9종과 영상 무기 3종을 함께 검증한다. 방어구 세트는 없다. `rpg.js`의 `MOB_TYPES`에 새 보스는 맨 뒤에 붙여 기존 스냅샷 몹 번호를 보존한다.
- Supabase 가 402 로 막혔다(2026-10-28) → 무료 한도의 **Realtime 메시지**를 넘은 것(DB 크기가 아니다). 혼자 있는 RPG 방장도 스냅샷을 쏴서 한도를 먹었다(지금은 2명 미만이면 보내지 않는다, `SNAP_MIN_SEATED`). 결국 Cloudflare 로 옮겼다 — 이 작업 환경은 supabase.co · workers.dev 에 직접 못 닿아 MCP 로만 읽고 썼고, 계정 43명은 글자 검산(길이 + 가중합)이 맞는 것만 옮겼다. 거래 · 길드는 같은 날 2단계로 옮겼다(옛 `supabase/trade.sql` · `guild.sql` 이 기준, 거래 기록 34 · 이동 9 도 검산해 옮김). 무료 한도(워커 요청 · DO 요청 · D1 쓰기 하루 10만)가 걱정이라 거래 행은 바뀔 때만 쓰고, 받은 신청이 없는 거래 조회는 서버가 장부까지 묻지 않고 답하며, 길드 새로 읽기는 전용 서버에서 90초 간격이다.
- 가방을 열면 흰 화면으로 튕겼다(10월 28일) → 서버 이전 탓이 아니었다. 관리자 가방 500칸 작업(10월 27일)이 `ShopPanel.jsx` 에서 `weaponCap` 을 import 하지 않아 가방 · 무기상점이 그릴 때 멈췄다. 빌드는 통과해서 몰랐다. 지금은 `.oxlintrc.json` 의 `no-undef` 가 `npm run lint` 에서 잡는다.

- **논타겟 조준**(10월 30일): `skillAim.js`의 `pointerSkillAim`이 캔버스·카메라·몸 높이로 마우스 방향을 만들고 RpgView의 스킬 입력에만 `aim`을 싣는다. `rpgInput.js`가 검증한 `h.inputAim`은 입력 호출 동안만 존재한다. `aimTo`·`faceDir`가 방향 스킬에 사용하며 이동용 `aimDir`는 그대로다. 창뢰 쌍검은 놓는 순간 확정한다. 터치·비활성화 시 포인터를 지운다. 시험 `node --test tools/skill-aim.test.mjs`.

- **뇌조 전용 패턴 개편**(10월 30일): 전격 깃털(두 번의 좁은 탄막) · 뇌광 급강하(경로 고정 → 실제 이동 → 안쪽이 안전한 고리 충격파) · 폭풍의 눈(청록색 안전 원 이동). 수치는 `WORLD_BOSS_PATTERNS`, 범위·이동 판정은 `thunderbirdCombat.js`. 급강하 시간·맞은 캐릭터는 기존 `wb.active.attack`에 넣는다. 새 범위 `outside`는 안전 원 바깥을 뜻하며 그림과 판정이 같은 원을 쓴다. 체력·보상은 그대로다.

## 2026년 10월 30일 전투·성장 개편

- 수치: `combatRules.js`. 기사 Z(`advData.js`) 피해 감소 50%·40초 유지·20초 재사용, 도발 4초·범위260. 결투 플레이어도 기사 쪽으로 이동·조준한다. 몹·보스 주 대상도 도발한다. 보스의 광역 공격을 단일 공격으로 바꾸지는 않는다.
- 모든 RPG 보스 피해 ×1.05. 갑옷 피해 감소나 방어 버프가 있는 사람은 추가 ×0.55를 먼저 적용한다. 일반 몹·플레이어 피해는 그대로다.
- 던전 입장 시 파티 최고 레벨을 기준으로 `max(1, 레벨/300)` 체력 배율을 고정한다. 잡몹·보스·보스 소환 몹·스냅샷·승계가 같은 배율을 쓴다.
- 결투는 `duel.js`. 2인 파티끼리 신청·수락, 한 팀 전원 전투 불가 시 종료. 승리 팀 각자는 상대 팀 평균 명예를 기준으로 기존 보상 공식을 적용한다. 팀·귀환·소유자·결투용 물약·도발은 스냅샷으로 보존한다. 결투용 소형 회복 물약 5개는 별도 카운터이며 종료 때 회수한다. 구매 물약·응급 처치는 서버에서 거절한다. 2대2는 팀원 치유를 허용한다.
- `j_shield` ID는 유지하며 강화 마법진으로 변경. 반경180·20초·재사용25초, 위의 아군 공격력·치유력 +20%. 중첩은 한 번, 범위 밖은 즉시 해제. `powerCircles`로 스냅샷 보존. 급소 찌르기 `pierce`는 돌진을 없애고 사거리100의 제자리 공격으로 변경(직업 돌진 베기는 유지).
- 사냥터 최고 레벨보다 캐릭터가 높으면 직접·파티 경험치 ×0.01. 던전·훈련·토벌은 제외. 자기보다 낮은 의뢰는 받을 때 `coinOnly`를 기록해 돈만 지급한다. 재료 보상도 제외한다.
- 400→401부터 레벨당 스탯 3개. 기존 캐릭터도 `statEarned`로 재계산해 소급 적용하며 800레벨 총2,000개다. 테스트 `tools/combat-update.test.mjs`.

## 2026년 10월 30일 퀘스트 마스터

- 광장 (1200, 780)에 퀘스트 마스터를 추가했다. 기존 NPC 차례 뒤에 붙여 저장과 스냅샷을 보존한다.
- `requestData.js`의 `QUEST_AREAS`는 21개 사냥터 탭이다. `QUEST_MASTER`에서 일반 20마리·필요 경험치 40%, 보스 2마리·60%, 낮은 사냥터 경험치 20%, 미수락 잡몹 코인 95%를 조절한다.
- 시작 레벨부터 수락 가능하다. 상한을 넘기면 상한 레벨의 필요 경험치를 기준으로 20%만 준다. `requestXp`를 화면과 완료에서 함께 쓴다. 기존 NPC 의뢰의 `coinOnly` 규칙은 유지한다.
- 일반·보스는 해당 사냥터에서만 각각 센다. 진행이 끝난 의뢰는 잡몹 코인 감소 면제에서 제외한다. 보스 코인은 그대로다. 코인 소수점은 버린다.
- 시험: `node --test tools/quest-master.test.mjs tools/combat-update.test.mjs tools/deep.test.mjs`.
