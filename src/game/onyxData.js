/* ── 오닉스 · 황금 진열장 상점 — 수치는 모두 여기 한 곳(11월 27일 사용자 기획) ─────────────
   오닉스는 코인과 따로 쌓는 재화다. 가방 bag.ox 에 남고, 얻는 곳은 도박장 랜덤 상자(shopData.js BOX.onyx)다.
   황금 진열장 상점(shopData.js SHOPS 의 "onyx")에서 장신구 · 칭호 · 특수 제품을 판다. 스킨은 사용자가 따로 줄 때까지 넣지 않는다.
   판매 · 상자 지급은 전용 서버(g.server)만 판정한다. 화면 저장(rpg_save) · 계정 만들기로는 오닉스와 산 물건을 늘릴 수 없다(protectOx).
   목록은 저장 값의 차례라 뒤에만 더한다(장신구는 비트, 칭호 id 는 기록에 남는다). */

export const ONYX = {
  name: "오닉스",
  max: 9999999,            // 가질 수 있는 최대(정한 값)
  icon: "/assets/game/rpg/onyx/icons.webp",   // 4 × 2 칸 아이콘 시트(Codex, 0번 오닉스만 사용자 그림) — 칸 차례는 OX_ICON
  cell: 256,
};
// 아이콘 시트 칸 — 0 오닉스 · 1 흑옥 브로치 · 2 단골 배지 · 3 벨벳 망토 · 4 은화 발자국 · 5 성전환 물약 · 6 칭호 메달 · 7 도파민
export const OX_ICON = { onyx: 0, brooch: 1, regular: 2, cape: 3, silver: 4, gender_swap: 5, title: 6, dopa: 7 };
// 아이콘 한 칸 — CSS background(비율 배치라 어느 크기에서도 칸이 맞는다)
export const oxIconStyle = (i) => ({ backgroundImage: `url(${ONYX.icon})`, backgroundSize: "400% 200%",
  backgroundPosition: `${((i % 4) / 3) * 100}% ${Math.floor(i / 4) * 100}%`, backgroundRepeat: "no-repeat" });

/* 장신구 — 산 것은 bag.oa(비트), 단 것은 bag.ow(비트). 여러 개를 함께 달 수 있다(정한 해석). 차례가 비트라 뒤에만 더한다 */
export const OX_ACC = [
  { id: "brooch", name: "흑옥 브로치", price: 3, note: "캐릭터 가슴에 은테를 두른 검은 보석을 답니다." },
  { id: "regular", name: "황금 진열장의 단골", price: 6, note: "이름 아래에 금빛 칭호를 표시합니다." },
  { id: "cape", name: "밤빛 벨벳 망토", price: 8, note: "걷거나 달릴 때 안쪽의 금실 자수가 드러나는 검은 망토를 입습니다." },
  { id: "silver", name: "은화 발자국", price: 10, note: "질주할 때 발밑에 은화 문양이 잠깐 나타났다 사라집니다." },
];
export const OX_ACC_BIT = Object.fromEntries(OX_ACC.map((a, i) => [a.id, 1 << i]));
export const OX_ACC_ALL = (1 << OX_ACC.length) - 1;
// 은화 발자국 — 질주(대쉬 · 이동 속도가 오른 동안) 중 이만큼 걸을 때마다 문양 하나 · 문양이 남는 초
export const OX_STEP = { gap: 34, life: 0.9, max: 14 };

/* 칭호 — 오닉스로 산다. 능력치는 칭호 보너스표 규칙(1점 쉬움 · 2점 중간 · 3점 어려움 · 4점 가장 어려움)에 값으로 맞췄다(정한 값).
   120~280 → 1점 · 400~560 → 2점 · 600~760 → 3점 · 840~1,000 → 4점. 기록은 socialData.js TITLES 끝에 붙는다 */
export const OX_TITLES = [
  { id: "ox_bimu", name: "비무는 예약제", ox: 120, up: { crit: 1 } },
  { id: "ox_murim", name: "무림고수", ox: 200, up: { atk: 1 } },
  { id: "ox_passby", name: "지나가던 절대고수", ox: 280, up: { cdmg: 1 } },
  { id: "ox_lotus", name: "흑련", ox: 400, up: { hp: 2 } },
  { id: "ox_thunder", name: "천뢰", ox: 440, up: { crit: 2 } },
  { id: "ox_moon", name: "참월", ox: 480, up: { cdmg: 2 } },
  { id: "ox_sign", name: "백금서의 서명", ox: 520, up: { hp: 2 } },
  { id: "ox_sky", name: "단천", ox: 560, up: { atk: 2 } },
  { id: "ox_dawn", name: "왕관에 박힌 새벽", ox: 600, up: { hp: 3 } },
  { id: "ox_sword", name: "일검무쌍", ox: 640, up: { atk: 3 } },
  { id: "ox_auction", name: "자정 경매의 낙찰자", ox: 680, up: { crit: 3 } },
  { id: "ox_peak", name: "무림절정", ox: 720, up: { cdmg: 3 } },
  { id: "ox_crown7", name: "일곱 번째 왕관", ox: 760, up: { hp: 3 } },
  { id: "ox_blackgold", name: "흑금관의 주인", ox: 840, up: { atk: 4 } },
  { id: "ox_first", name: "천하제일", ox: 1000, up: { atk: 4 } },
  { id: "ox_seal", name: "왕실의 마지막 인장", ox: 1000, up: { hp: 4 } },
].map((t) => ({ ...t, need: {} }));
export const OX_TITLE_BY_ID = Object.fromEntries(OX_TITLES.map((t) => [t.id, t]));

/* 특수 제품 — 성전환 물약(shopData.js POTIONS 의 gender_swap · 값은 ox). 마시면 캐릭터 성별이 바뀐다 */
export const OX_GOODS = [{ id: "gender_swap", ox: 420 }];
export const OX_GOOD_BY_ID = Object.fromEntries(OX_GOODS.map((x) => [x.id, x]));

/* ── 저장 ─────────────────────────────────────────── */
const n0 = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
export const oxOf = (bag) => n0(bag && bag.ox, ONYX.max);
export const accOwned = (bag) => n0(bag && bag.oa, OX_ACC_ALL);
export const accWorn = (bag) => n0(bag && bag.ow, OX_ACC_ALL) & accOwned(bag);
// cleanBag 이 부른다 — 0 이면 칸을 두지 않는다
export function cleanOx(d, b) {
  const ox = oxOf(d), oa = accOwned(d), ow = accWorn(d);
  if (ox) b.ox = ox;
  if (oa) b.oa = oa;
  if (ow) b.ow = ow;
  const od = cleanOxd(d && d.oxd);
  if (od) b.oxd = od;
}
// 오늘 칸 정리 — 날짜가 없으면 칸을 두지 않는다
const cleanOxd = (o) => (o && typeof o === "object" && typeof o.d === "string" && /^\d{4}-\d\d-\d\d$/.test(o.d)
  ? { d: o.d, k: n0(o.k, 1e6), b: n0(o.b, 1e6), r: n0(o.r, 1e6), q: n0(o.q, 255), w: n0(o.w, 1e6) } : null);
/* 화면이 보내는 저장(rpg_save) · 계정 만들기 · 계정 없는 입장 — 오닉스 · 산 장신구 · 오닉스 칭호 · 성전환 물약은 장부에 이미 있는 만큼만 남긴다.
   다는 것(ow)은 가진 것 안에서 화면이 바꿔도 된다. old 가 없으면(새 계정) 모두 0 */
export function protectOx(data, old) {
  if (!data || typeof data !== "object") return data;
  const b = data.bag && typeof data.bag === "object" ? data.bag : {};
  const ob = (old && old.bag) || {};
  const bag = { ...b };
  const ox = Math.min(oxOf(b), oxOf(ob)), oa = accOwned(ob), ow = n0(b.ow, OX_ACC_ALL) & oa;
  if (ox) bag.ox = ox; else delete bag.ox;
  if (oa) bag.oa = oa; else delete bag.oa;
  if (ow) bag.ow = ow; else delete bag.ow;
  const od = cleanOxd(ob.oxd);                     // 오늘 진행 · 받은 것은 장부에 있던 그대로
  if (od) bag.oxd = od; else delete bag.oxd;
  const p = bag.p && typeof bag.p === "object" ? { ...bag.p } : null;
  if (p) {
    for (const g of OX_GOODS) {
      const keep = Math.min(Math.floor(Number(p[g.id]) || 0), Math.floor(Number(ob.p && ob.p[g.id]) || 0));
      if (keep > 0) p[g.id] = keep; else delete p[g.id];
    }
    bag.p = p;
  }
  const had = new Set(Array.isArray(old && old.titles) ? old.titles : []);
  const out = { ...data, bag };
  if (Array.isArray(data.titles)) out.titles = data.titles.filter((id) => !OX_TITLE_BY_ID[id] || had.has(id));
  if (OX_TITLE_BY_ID[out.title] && !had.has(out.title)) out.title = "";
  return out;
}

/* ── 오닉스 얻는 곳(11월 27일 사용자 기획) — 일일 의뢰 · 몹 레이스 우승 · 월드보스. 규칙은 onyxSource.js ──────
   모든 지급은 전용 서버(g.server)만 한다. 하루는 한국 시간 자정에 갈린다.
   오늘 진행 · 받은 것은 가방 bag.oxd = { d 날짜, k 몹, b 보스, r 의뢰, q 받은 칸 비트, w 월드보스 오닉스 } — 화면 저장으로는 바꿀 수 없다(protectOx) */
// 일일 의뢰 — 칸마다 오닉스 1개, 셋을 다 받으면 2개 더(하루 최대 5개, 정한 값). 상자 하루 10번 기대값(약 12개)보다 적게 둔다
export const OX_DAILY = {
  tasks: [
    { id: "k", name: "몹 사냥", need: 150, ox: 1, note: "사냥터 · 던전에서 몹을 잡습니다" },
    { id: "b", name: "보스 사냥", need: 3, ox: 1, note: "사냥터 · 던전 보스를 잡습니다" },
    { id: "r", name: "의뢰 끝내기", need: 2, ox: 1, note: "광장 의뢰인의 의뢰를 끝냅니다" },
  ],
  bonus: 2,                // 세 칸을 모두 받으면 더 주는 오닉스
};
export const OX_BONUS_BIT = 1 << OX_DAILY.tasks.length;
// 몹 레이스 우승 — 끝까지 들어온 사람 수(같은 인터넷 주소는 한 명으로 센다)에 따라. 2명 0 · 3명 3 · 4명 10(사용자 결정), 5명은 4명과 같게(정한 값)
export const OX_RACE = { win: [0, 0, 0, 3, 10, 10] };
// 월드보스 — 보상 대상(기여 10% 초과)마다 0.5% 확률로 1~3개(사용자 결정, 11월 28일 50%에서 정정). 하루 최대 10개(정한 값 — 사용자 확인 전)
export const OX_WB = { chance: 0.005, n: [1, 3], dayMax: 10 };
