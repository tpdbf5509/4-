-- Cloudflare D1 표 — Supabase(supabase/*.sql)의 표를 그대로 옮겼다.
-- 시간은 모두 밀리초 정수(Date.now), 날짜(주 · 출석)는 'YYYY-MM-DD' 글자, JSON 은 글자로 둔다.
-- 외래 키는 두지 않았다. 이름이 바뀔 때(rpg_admin_rename)는 ledger.js 가 길드 표를 직접 고친다.
-- 적용: D1 에 이 파일을 한 번 실행한다(IF NOT EXISTS 라 다시 실행해도 된다). 접속 중 표시(live)는 장부가 메모리에 둔다.

CREATE TABLE IF NOT EXISTS chars (
  name_key   TEXT PRIMARY KEY,                    -- 이름을 고르게 한 것(앞뒤 공백 · 겹친 공백 · 대소문자)
  name       TEXT NOT NULL,
  code_hash  TEXT NOT NULL,                       -- bcrypt
  token_hash TEXT,                                -- 마지막으로 들어온 기기의 입장권(sha256)
  data       TEXT NOT NULL DEFAULT '{}',          -- 캐릭터 기록(JSON, 30000바이트 이하)
  admin      INTEGER NOT NULL DEFAULT 0,
  trade_seq  INTEGER NOT NULL DEFAULT 0,
  trade_id   TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fails (
  name_key TEXT PRIMARY KEY,
  n        INTEGER NOT NULL DEFAULT 0,
  until    INTEGER
);
CREATE TABLE IF NOT EXISTS save_blocks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         INTEGER NOT NULL,
  name       TEXT NOT NULL,
  why        TEXT NOT NULL,
  lv_old     INTEGER,
  lv_new     INTEGER,
  sent       TEXT,
  coins_old  INTEGER,
  coins_new  INTEGER
);
CREATE TABLE IF NOT EXISTS admin_tickets (
  server     TEXT PRIMARY KEY,
  nonce_hash TEXT NOT NULL,
  act        TEXT NOT NULL,
  target     TEXT NOT NULL,
  until      INTEGER NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  body       TEXT NOT NULL,
  name       TEXT,
  room       TEXT,
  result     TEXT,
  wave       INTEGER,
  total      INTEGER,
  diff       TEXT,
  cls        TEXT
);

CREATE TABLE IF NOT EXISTS trades (
  id          TEXT PRIMARY KEY,
  a           TEXT NOT NULL,
  b           TEXT NOT NULL,
  server      TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'invite',
  offers      TEXT NOT NULL,
  accepted    TEXT NOT NULL,
  revision    INTEGER NOT NULL DEFAULT 0,
  hash        TEXT NOT NULL DEFAULT '',
  error       TEXT,
  created_at  INTEGER NOT NULL,
  until       INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS trades_a_at ON trades(a, created_at DESC);
CREATE INDEX IF NOT EXISTS trades_b_at ON trades(b, created_at DESC);
CREATE TABLE IF NOT EXISTS trade_moves (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id     TEXT NOT NULL,
  owner        TEXT NOT NULL,
  receiver     TEXT NOT NULL,
  kind         TEXT NOT NULL,
  u            INTEGER NOT NULL,
  item         TEXT NOT NULL,
  reset_id     TEXT,
  rollback_ids TEXT,
  at           INTEGER NOT NULL,
  UNIQUE(trade_id, owner, kind, u)
);
CREATE INDEX IF NOT EXISTS trade_moves_owner ON trade_moves(owner, u);

-- 광장 장터 게시판(ledger-market.js) — 올려 둔 물건과 판매자 보관함(대금 · 돌아온 물건). 장부가 처음 부를 때도 같은 문장으로 만든다
CREATE TABLE IF NOT EXISTS market (
  id          TEXT PRIMARY KEY,
  seller      TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  kind        TEXT NOT NULL,
  u           TEXT,
  n           INTEGER NOT NULL DEFAULT 1,
  item        TEXT,
  price       INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  until       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS market_until ON market(until);
CREATE INDEX IF NOT EXISTS market_seller ON market(seller);
CREATE TABLE IF NOT EXISTS market_box (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  owner  TEXT NOT NULL,
  why    TEXT NOT NULL,                           -- sold 팔림(코인) · expired 기간 끝 · cancel 취소했는데 가방이 가득
  coins  INTEGER NOT NULL DEFAULT 0,
  kind   TEXT,
  u      TEXT,
  n      INTEGER NOT NULL DEFAULT 0,
  item   TEXT,
  price  INTEGER NOT NULL DEFAULT 0,
  give   INTEGER NOT NULL DEFAULT 0,              -- 1 이면 받을 때 물건도 가방에 넣는다
  at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS market_box_owner ON market_box(owner);

CREATE TABLE IF NOT EXISTS guilds (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL UNIQUE,
  leader     TEXT,
  level      INTEGER NOT NULL DEFAULT 0,
  exp        INTEGER NOT NULL DEFAULT 0,
  disbanded  INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS guild_members (
  char_key  TEXT PRIMARY KEY,
  guild_id  TEXT NOT NULL,
  joined_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS guild_members_guild ON guild_members(guild_id);
CREATE TABLE IF NOT EXISTS guild_wallets (
  char_key   TEXT PRIMARY KEY,
  stones     INTEGER NOT NULL DEFAULT 0,
  cores      INTEGER NOT NULL DEFAULT 0,
  used       INTEGER NOT NULL DEFAULT 0,
  attendance TEXT
);
CREATE TABLE IF NOT EXISTS guild_requests (
  char_key TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  kind     TEXT NOT NULL,
  expires  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS guild_requests_guild ON guild_requests(guild_id);
CREATE TABLE IF NOT EXISTS guild_raids (
  id           TEXT PRIMARY KEY,
  guild_id     TEXT NOT NULL,
  boss         TEXT NOT NULL,
  server       TEXT NOT NULL,
  participants TEXT NOT NULL,
  started_at   INTEGER NOT NULL,
  expires      INTEGER NOT NULL,
  state        TEXT NOT NULL DEFAULT 'fight',
  finished_at  INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS guild_raids_active ON guild_raids(guild_id) WHERE state = 'fight';
CREATE INDEX IF NOT EXISTS guild_raids_daily ON guild_raids(guild_id, started_at);
CREATE TABLE IF NOT EXISTS guild_scores (
  week     TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  points   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (week, guild_id)
);
CREATE INDEX IF NOT EXISTS guild_scores_rank ON guild_scores(week, points DESC);
CREATE TABLE IF NOT EXISTS guild_credits (
  week     TEXT NOT NULL,
  char_key TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  PRIMARY KEY (week, char_key, guild_id)
);
CREATE TABLE IF NOT EXISTS guild_claims (
  week     TEXT NOT NULL,
  char_key TEXT NOT NULL,
  rank     INTEGER NOT NULL,
  PRIMARY KEY (week, char_key)
);
