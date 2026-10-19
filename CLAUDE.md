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
- 디자인 취향: 톤다운 · 파스텔 색, 배경 60 : 글자 30 : 포인트 10, 왼쪽 정렬, 1px 얇은 선, 강조는 한 곳. 한글 제목은 자간을 살짝 줄인다.

## 2. 브랜치 · 배포

- 작업 브랜치: **`claude/4-player-coop-defense-1x89l5`** (저장소 `tpdbf5509/4-`). 여기서 커밋하고 `git push -u origin <브랜치>` 한다.
- **모든 작업은 Vercel 프로젝트 `four-lane` 하나로만 한다.** 주소는 https://four-lane.vercel.app 이다.
  - 배포 · 배포 확인 · 사용자에게 안내하는 주소는 모두 `four-lane` 이다. 다른 Vercel 프로젝트를 새로 만들거나, 다른 프로젝트 · 미리보기 주소로 배포하거나 안내하지 않는다.
  - push 하면 `four-lane` 에 자동 배포된다. 보통 1~3분 안에 READY.
  - Vercel MCP `list_deployments` 는 **projectId 만** 넘긴다. teamId 를 넣으면 403 이 난다.
- RPG 모드는 **다른 세션이 다른 브랜치(`claude/funny-fermat-*`)에서 만들고 PR 로 이 브랜치에 합친다.** 그래서 push 가 거절되면 `git fetch origin <브랜치>` 후 merge 하고(리베이스 · 강제 push 금지) 다시 빌드 · 확인 후 push 한다.
- **RPG 전용 서버**(`server/`, Cloudflare Workers + Durable Objects, 이름 `four-lane-rpg`)는 GitHub Actions(`.github/workflows/rpg-server.yml`)가 push 때 배포한다. 저장소 비밀값: `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID` · `SUPABASE_SECRET_KEY`. 서버 주소는 `wss://four-lane-rpg.four-lane.workers.dev`(rpgServer.js `SRV_URL`, Vercel 환경 변수 `VITE_RPG_SERVER` 로 덮어쓸 수 있다). 내 컴퓨터 시험은 `cd server && npx wrangler dev --port 8787` + 화면 주소 `?srv=local`(저장 시험은 `server/.dev.vars` 에 가짜 저장소 주소).
- 사용자가 요청하지 않으면 PR 을 만들지 않는다.
- 커밋 메시지는 한국어 한 줄, "무엇을 어떻게 한다" 꼴. 예: `궁수탑 4단계 공격력을 55% 낮추고 강화 비용을 260으로 올린다`

## 3. 게임 한눈에

- 이름: **네 갈래 방어선**. 북 · 동 · 남 · 서 네 길로 오는 적을 **최대 4명이 협동**해 막는 실시간 웹 디펜스. 설치 없이 브라우저(PC · 휴대폰)로 한다.
- 모드 ① **방어전**: 대기실 → 웨이브 → 중간중간 **보스 결전**(판이 결전장으로 바뀌고 각자 캐릭터를 직접 움직여 보스를 친다) → 능력 카드 선택 → 결과.
- 모드 ② **RPG**: 방 코드 없이 서버 RPG1~RPG4(서버당 10명, `RPG_SERVER_CAP` — 자리 칸 `RPG_CREW_MAX` 16 은 스냅샷 차례라 그대로)에 들어가 ☰ 메뉴에서 서버를 옮기고 광장 · 토끼 · 늑대 · 멧돼지(20~50) · 고릴라(50~100) · 고블린(100~130) · 오크(130~160) · 오우거(160~200) · 스켈레톤(200~230) · 좀비(230~260) · 언데드 마법사(260~300) · 골렘(300~330) · 키메라(330~360) · 포식거미(360~400) 사냥터에서 사냥하고, 1대1 결투로 명예를 겨룬다. 최고 400레벨(`LV_MAX`), 스탯 5종(하나에 400까지, `STAT_MAX` — 400레벨 800포인트로 둘을 최대로). 보스 재료 · 무기 강화(+20) · 광장 의뢰가 있다.
- 병과(= 탑 종류) 11종: `archer` 궁수 · `sniper` 저격 · `cannon` 대포 · `bolt` 번개 · `flame` 화염 · `poison` 독 · `frost` 서리 · `gravity` 중력 · `supply` 보급소 · `corrode` 부식 · `paladin` 성기사. 탑은 1~4단계.
- 난이도 4종: 쉬움 · 보통(기본) · 어려움 · 지옥. 라운드(웨이브 수) · 난이도 · 시작 · 일시정지 · 속도는 **방장만** 정한다.
- 방 코드 4글자. `TEST` 는 테스트 서버(비밀번호 입장, 골드 무제한 등 실험 도구).

## 4. 기술 구조

| 구분 | 내용 |
|---|---|
| 화면 | React 19 + Vite 8. 판은 `<canvas>` 에 직접 그린다 |
| 실시간 | Supabase Realtime 채널 1개 = 방 1개(`flg:<코드>`). presence + broadcast. DB 테이블은 `feedback`(의견)과 `rpg_chars` · `rpg_fails`(RPG 캐릭터 서버 저장, `supabase/rpg.sql`) |
| RPG 전용 서버 | **보류(꺼 둠, 2026-10-18).** 사용자 인터넷에서 Cloudflare(workers.dev) 입구가 파리(CDG)로 잡혀 서울 방까지 왕복 0.5초였다 — 통신사 경로라 코드로 못 고친다. 서울 일반 서버(카드 필요)를 마련할 때까지 예전 방식(Supabase 서울)이 기본이다. 서버 코드 · 자동 배포는 남겨 두었다(`?srv=cf` 로만 붙는다). 연결 진단 칸은 `?diag=1` 로 켠다(입구 → 방 위치 · 왕복 · 스냅샷 · 위치 고침 · fps). |
| (예전 기록) RPG 전용 서버 | **이전 중이었다.** `?srv=cf` 를 켠 기기는 방장 없이 `server/`(Cloudflare)에 붙는다. 서버가 예전 방장 노릇(자리 · 판정 · 스냅샷 · 채팅 중계 · 캐릭터 불러오기/저장)을 하고, 화면은 손님 경로를 그대로 쓴다. 주고받는 말도 같다(lobby · rsnap · chat ↔ hello · pick · rjoin · input · chat, 서버만의 말: `deny` 입장권 틀림 · `kick` 다른 기기 · `bye` 나감) |
| 판정 | **방장 권위형.** 방장 브라우저가 모든 규칙을 돌리고 손님은 입력만 보낸다. 방장이 스냅샷과 연출 이벤트(`out` fx)를 한 메시지로 뿌린다(방어전 초당 12회, RPG 는 인원에 따라 3~10회) |
| 저장 | RPG 캐릭터는 이름 + 숫자 5자리 코드로 서버(Supabase 함수 `rpg_*`)와 localStorage 둘 다. 홈 이름 · 설정은 localStorage |
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
| `src/game/skillData.js` · `skillArt.js` | RPG 직업 스킬(`JOB_SKILLS`, 상점 `SKILLS` 뒤에 붙는다 · 키 R) · 전설 무기 스킬(`WEAPON_SKILLS`, 키 X). **수치는 skillData.js 한 곳**, 규칙은 rpg.js(`jobSkill` · `rpgWeaponSkill` · 패시브 `weaponOnHit` · `weaponOnAttack` · `skillTake`), 그림은 skillArt.js(`drawSkillFx` 의 `sk_` 연출 · 영웅 둘레 `drawHeroSkill`) |
| `src/game/trainData.js` | RPG 훈련장(광장 왼쪽 문 · 맵 `train` · 허수아비 `dummy` 셋 · 교관 창 켜기/끄기 `TRAIN_TOGGLES`). 규칙은 rpg.js(`rpgTrain` · `trainTick` · `keepDummies`), 기록은 스냅샷 줄 47 |
| `src/game/bossBar.js` | 보스 체력바 주황 잔상 셈(`ghostStep`, 머무는 · 따라오는 시간 `BOSS_BAR`). 그리기 전용 — 루프(`tickBossBars`, RpgView.jsx)가 내 맵 보스마다 `m.hpFx` 를 돌리고, 던전 위 칸은 DOM 너비를 바로 고친다 |
| `src/game/keys.js` | RPG 키 설정 — 기본 키 표(`KEY_ACTIONS`) · 저장(`flg:rpgKeys`) · 키 이름 |
| `src/game/shopData.js` · `shop.js` · `src/ShopPanel.jsx` | RPG 광장 상점. **가격 · 확률 · 제한은 shopData.js 한 곳**, 규칙(방장 판정 `rpgShop`, 조건 `why*`)은 shop.js, 상점 · 가방 창은 ShopPanel.jsx |
| `src/game/towerInfo.js` | 탑 "자세히 보기" 창 설명. **숫자를 손으로 적어 둔 곳이라 logic.js 를 고치면 여기도 고친다** |
| `src/game/updates.js` | 대기실 "업데이트" 창 내용 |
| `src/App.jsx` | 화면 흐름 · 방 연결 · 대기실 · 방장 권한 · 테스트 패널 · 비용 칸 |
| `src/net/room.js` | Supabase 채널 연결 |
| `src/net/rpgServer.js` · `server/` | RPG 전용 서버 연결(room.js 와 같은 모양) · 서버(`server/src/room.js` 가 RPG1~5 방 하나, `save.js` 가 Supabase `rpg_srv_load` · `rpg_srv_save` — 서버 비밀 키로만). 규칙은 `src/game/` 를 그대로 묶어 쓴다. 입력 나누기는 `src/game/rpgInput.js`(방장 화면과 서버가 같이 쓴다) |
| `src/AdminView.jsx` · `src/net/admin.js` · `src/ui/admin.css` | 관리 화면 「데이터 시스템」(`?admin`, 관리자 이름 + 코드). 서버마다 관리 채널로 방장 화면에 묻고(인원 · 왕복 · fps) 방장 부여 · 퇴장을 보낸다. 방장 쪽 답은 RpgView.jsx, 명령 표 함수는 `supabase/rpg.sql`(`rpg_admin_*`) |
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
- **RPG 관리자 캐릭터**: 전설 특별 무기 열셋을 한 번 받는다(`giveAdminLegends` · `ADMIN_LEGEND.id`, 받은 차례는 `bag.lg` — 팔아도 다시 주지 않는다, id 를 올리면 빠진 것만 다시). 최고 레벨 · 코인 무제한 · 스탯 다섯 모두 최대(`maxStats`) · 보스 재료 · 강화석 모두 늘 999개(`MAT_MAX`, `stepHeroes` 에서 다시 채운다)이고, 직업 · 원소 · 성별을 모험 준비 화면에서 언제든 바꾼다(`saveLook`). 일반 캐릭터는 한 번 정하면 바꿀 수 없다.
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
- **RPG 사냥터 PvP**: 설정(☰)에서 켠 사람끼리만(`h.pvpOn`, 기본 꺼짐). `fieldPvpMap` 이 아닌 맵(광장 · 던전 · 훈련장 · 결투장)에서는 듣지 않는다. 노릴 것을 고르는 `foesNear` · `nearFoes` 가 몹과 켠 사람을 함께 보고, `strikeAny` · `ccAny` · `aliveFoe` 는 `isHeroT`(몹은 `type` 이 있다)로 가른다. 피해 `FIELD_PVP.dmgMul` 0.3.
- **RPG 책**: 패치노트 · 가이드는 `bookData.js` 에서 고치고 가방 "책" 탭에 늘 보인다. **업데이트마다 `PATCH_BOOKS` 맨 위에 책 한 권을 더하고, 밸런스 수치를 바꾸면 전후 값을 적는다.**
- **RPG 업데이트 공지**: `RPG_NOTICE`(`updates.js`) id 를 바꾸면 RPG 서버에 들어올 때 모두에게 "업데이트 안내" 창이 한 번 뜬다(기기마다 `flg:rpgNotice`).
- **RPG 업데이트 선물**: `GIFT`(`itemData.js`). 캐릭터마다 `gift` id 가 다르면 들어올 때 한 번 주고 안내 창을 띄운다. 새 선물은 `GIFT.id` 만 바꾼다. 한 사람에게만 주는 선물은 `PERSONAL_GIFTS`(캐릭터 이름 · 방어구 · 그 사람 채팅 칸에만 뜨는 문구, 받은 id 는 `bag.pg`, `givePersonal`). 접속 중인 사람의 기록은 10초마다 저장되어 DB 를 직접 고치면 덮어써지므로 이 방법을 쓴다.
- **RPG 한 사람 되돌리기**: 기록이 잘못 부풀려진 캐릭터는 `PERSONAL_ROLLBACKS`(itemData.js, 이름 · 레벨 · 코인)에 적는다. 들어올 때 방장이 한 번 레벨 · 코인 · 스탯 · 가방 아이템 · 전설 특별 무기 · 그 몫이 아닌 칭호를 되돌리고(`rollbackHero`) 받은 id 를 `bag.pg` 에 남긴다. 이 이름은 관리자 표시가 실려 와도 관리자가 아니다. 레벨이 내려가도 저장되게 `writeChar` · `heroRecord` 가 `rolledBack` 으로 길을 열어 둔다. DB 를 직접 고치면 접속 중 10초마다 덮어써진다.
- **RPG 광장 의뢰**: NPC 마다 하나씩 맡는다(`h.reqs`). 사냥 의뢰는 받은 뒤 잡은 수, 재료 의뢰는 완료 때 가방에서 뺀다. 보상 경험치는 그때 레벨 필요 경험치 × 몫.
- **RPG 결투 · 명예**: 1대1만. 파티 창에서 신청 → 수락하면 결투장 빈 칸(4칸)으로 둘만 옮긴다(`rpgDuel` · `tickDuels`). 결투장 문은 없다. 자동 평타 꺼짐, 피해 ×0.3, 스킬 한 번(여러 번 치는 스킬은 합쳐) 최대 1500 — 부드럽게 누른다(`DUEL.skillCap` · `skillSoft`, `hitFoe` 의 `pvpSoft` · 스킬마다 `newCast`, 평타는 그대로), 3초 세기 · 90초 무승부. 이기면 명예 += 진 사람 명예 × 10% + 10(`DUEL`). 순위는 Supabase 함수 `rpg_honor_top`(광장 명예 순위판).
- **RPG 경험치**: 몹 경험치는 `XP_RATE`(0.2, 5배 줄임)를 곱한다. 퀘스트 경험치는 그대로. 파티원은 같은 맵이면 몹 경험치의 50%를 받는다.
- **RPG 채팅**은 방장을 거치지 않고 모두에게 바로 보낸다(1초에 한 번). 파티 · 칭호 알림은 방장이 `sys` 로 보낸다.
- **RPG 방장 승계**: 방장이 나가도 서버는 닫히지 않는다. 남은 사람이 받은 스냅샷을 판정 세계로 바꿔(`rpgPromote`) 자리 · 체력 · 몹을 그대로 잇는다. 손님은 새 방장에게 기록을 다시 보낸다. 손님에게 보이는 새 상태는 스냅샷에 넣어야 승계 뒤에도 남는다.
- **RPG 메시지 한도 · 저장 지킴**: 손님의 키 입력은 방 채널이 아니라 손님마다 방장과 둘만 있는 통로(`<코드>:in:<손님 id>`, room.js `makePipes` · `toHost` · `hostInbox`)로 보낸다 — 방 채널로 보내면 모두가 받아 13명에서 초당 300통이 넘었다. 보내기만 하는 REST 길은 120~280ms 느려 쓰지 않는다. 방장이 옛 화면이면 방 채널로 보낸다(`oldHost`). 서버 저장 `rpg_save` 는 관리자가 아니면 기록 이름이 다르거나 · 레벨이 내려가거나(서버 초기화 `rs` · 되돌리기 `bag.pg` 제외) · 지난 저장보다 15 + 1분마다 1 넘게 뛰면 막고 `rpg_save_blocks` 에 남긴 뒤 입장권을 지운다(그 기기는 "섞인 것 같아 저장을 멈췄습니다", 코드를 다시 넣으면 서버 기록으로). 막은 기록은 관리 화면 로그 탭.
- **RPG 한 캐릭터 한 곳**: 서버 계정이 있는 캐릭터는 들어갈 때 · 10초마다 `rpg_live`(이름 · 입장권 · 창 id `myId` · 서버)로 접속 중 표시를 남긴다(App.jsx `startRpg` · `liveCode` 효과, rpgSave.js `liveEnter` · `LIVE_BEAT`). 다른 창의 표시가 30초(`rpg_live_secs`) 안이면 들어가기 · 이어 하기(`rpg_login`)가 'live' 로 막힌다. 같은 창의 서버 이동은 된다. 나가기 · 창 닫기 때 `rpg_unlive`. 그사이 다른 곳이 차지했으면 이 창이 나간다.
- **RPG 방장 넘기기**: 방장이 나가기 · 창 닫기를 하면 다음 사람에게 방장을 넘기고 나간다(`handoff`, App.jsx). 대기실 소식의 방장 차례 `ep` 가 작은 소식은 버린다. 30초마다 돌려 바꾸는 방식은 쓰지 않는다 — 바꿀 때마다 모두가 잠깐 끊긴다. 관리 화면(`?admin`)의 "방장 부여"도 같은 `handoff` 를 쓴다.
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
  그래도 손님 화면은 옛 방장 위치를 **지금** 내 위치와 견줘 당겨졌다(멈출 때 끌림 · 지연이 튀면 순간 이동). 지금은 방장이 스냅샷 줄 끝(42 · 43)에 "받은 누름 번호 · 받은 뒤 지난 ms"를 싣고, 손님은 그 때의 내 위치 기록(`h.hist`)과 견줘 차이만 나눠 고친다(`SYNC`, `rpg.js`). 대쉬 중에도 견주고(예전엔 0.6초 꺼서 끌렸다), 마지막 보낸 누름(`g.sentQ`)은 지우지 않으며, 대쉬 방향은 입력에 실어 보낸다(`rpgDash(g, pi, aim)`).
- 3명 이상이 스킬을 몰아 쓰면 버벅였다 → 판정(0.5ms)이 아니라 **그리기**가 무거웠다(연출마다 프레임마다 그라데이션 수십 개). 지금은 둥근 빛을 한 번 그린 그림으로 찍고(`glowAt`, skillArt.js), 프레임이 느리면 알갱이를 덜 그리며(`FX_LOD` · `setFxQuality`), 같은 종류 연출은 최근 몇 개만 · 화면 안 것만 그린다(`pickSkillFx`, rpgArt.js). 연출은 스냅샷 한 통에 120개(`OUT_PER_SNAP`), 밀리면 오래된 것부터 버린다(예전엔 60개 · 150개 넘으면 모두 버렸다). 새 연출을 더할 때 알갱이 수에 `nq()` 를 쓴다.
- 전용 서버에서 스킬 · 걷기가 조금씩 느렸다 → Durable Object 는 **처음 만들어진 곳에 머문다.** 미국에서 먼저 접속해 방이 버지니아에 생겨 한국에서 왕복 0.2초가 더 들었다. 지금은 `locationHint: "apac"` 로 아시아에 만들고, 옮겨야 하면 `ROOM.gen`(server/src/index.js)을 바꿔 새 방을 만든다. 게임 방은 처음 접속한 곳 가까이(아시아 안)에 생기므로 미국의 점검 기계가 만들지 않게 배포 점검(smoke.mjs)은 따로 `CHECK` 방을 쓴다. 방 위치는 `/where/<서버>` 로 본다(부르면 방이 생기니 게임 방에는 쓰지 않는다).
- 전용 서버에서 소리 · 스킬이 한 틱 늦고 걷다가 당겨졌다 → ① 손님 화면이 한 프레임 시간을 0.05초로 잘라 프레임이 끊기면 내 시계가 실제보다 뒤처졌다 — 지금은 흐른 시간만큼 잘게 나눠 돈다(`GUEST_CATCH_UP`, RpgView.jsx) ② 서버가 입력을 받아도 다음 스냅샷까지 기다렸다 — 지금은 받자마자 판정해 보낸다(`now()` · `RUSH_MS`, server/src/room.js) ③ 방이 홍콩에 생겼다 — 아시아 안에서도 Cloudflare 가 자리를 고르므로 `/place/<서버>/p<n>` 으로 만들어 보고 서울(ICN)에 생긴 이름끝을 `GENS`(server/src/index.js)에 적어 둔다.
- 다른 캐릭터에 관리자 레벨 · 코인이 옮겨 갔다(니여친레보탱 Lv 400 · 코인 1억) → RPG 기록은 브라우저마다 localStorage 한 칸(`flg:rpg3`)이라, 같은 브라우저의 다른 탭이 다른 캐릭터로 들어오면 이 탭이 그 기록을 방장에게 보내고 제 이름으로 저장했다. 지금은 탭이 들어올 때의 이름(`selfName`, RpgView.jsx)과 다르면 보내지도 저장하지도 않고, 방장도 기록 이름(`d.name`)이 자리의 캐릭터 이름과 다르면 싣지 않는다(`rpgJoin`).
- 렉 뒤에 모두의 레벨이 섞였다(10월 19일, 마법사에게 궁수 스탯 · 남의 되돌리기 표시가 옮겨 감) → 방장이 5초 조용하면 손님이 이어받아 **방장이 잠깐 둘**이 되고, 손님은 두 방장의 lobby(자리 번호)와 rsnap 을 섞어 받았다. 내 자리 번호에 남의 영웅이 실린 채 저장 루프가 그 기록을 내 이름으로 저장했다. 지금은 손님이 지금 방장(`hostId`)의 rsnap 만 받고, 스냅샷 `w`(자리마다 주인 id)를 영웅 `h.sw` 에 실어 `ownHero` 가 맞을 때만 저장한다. 승계 때 `h.who = h.sw`, `rpgLooks` 는 `who` 를 덮지 않는다(덮으면 `rpgSyncSeats` 가 주인이 바뀐 것을 못 본다).
- 13명이 한 서버에 모이자 대부분의 기록이 섞였다(10월 19일 15시) → Supabase 실시간 기록에 "초당 메시지 한도 초과"가 남았다. 손님 입력이 방 안 모두에게 가서 받는 사람 수만큼 셌다. 방장 소식이 끊기자 여러 손님이 방장을 이어받아 자리 번호가 섞였다. 지금은 입력을 방장에게만 보내고(통로), 서버당 10명 · 서버 4개, 서버가 섞인 저장을 막는다. 원인은 코드를 해시로 저장하는 것과 관계없다(로그인은 이름 + 코드가 정확히 맞아야 된다). Supabase 로그는 `query_logs` 의 `realtime_logs` 에서 `MessagePerSecondRateLimitReached` 로 찾는다.
- 배포 뒤 "알 수 없는 요청입니다" · 새 맵 문이 안 열림 → 방장이 옛 화면을 띄워 둔 것(판정은 방장 코드가 한다). 지금은 `version.js` 가 옛 화면을 스스로 새로 고친다. 새 요청 · 새 맵을 더할 때 이 점을 기억한다.
