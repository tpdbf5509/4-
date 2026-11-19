/* 데이터 시스템 「몹 그림」 탭 — 게임에 나오는 모든 몹 그림을 한곳에서 본다(11월 19일 사용자).
   그림은 도감과 같은 drawMobIcon(rpgArt.js)으로 그린다 — 몹 그림을 고치면 여기도 따라간다.
   무거운 그림 코드라 AdminView 가 이 탭을 열 때만 불러온다(lazy) */
import { useEffect, useRef, useState } from "react";
import { CODEX_GROUPS, CODEX_BOSS_IDS } from "./game/codexData.js";
import { MOB, MAPS, SPAWNS } from "./game/rpg.js";
import { DUNGEONS } from "./game/dungeonData.js";
import { WORLD_BOSSES } from "./game/worldBossData.js";
import { HIGH_SUMMON_IDS } from "./game/highData.js";
import { drawMobIcon, mobArtCanvas } from "./game/rpgArt.js";

const CARD = [132, 108], BIG = [340, 280];   // 칸 그림 · 크게 보기 그림 크기(px)

// 사냥터 몹 중 우두머리 이름이 따로 있는 것 — 우두머리 모습(boss)으로 한 번 더 보인다
const FIELD = CODEX_GROUPS.filter((g) => !g.boss).flatMap((g) => g.mobs);
const LEADERS = FIELD.filter((id) => MOB[id] && MOB[id].boss && MOB[id].boss.name !== MOB[id].name);

// 무리 — 도감 무리 전부(800~1200 포함) + 우두머리 · 소환물 · 월드보스
const GROUPS = [
  ...CODEX_GROUPS.map((g) => ({ id: g.id, name: g.name, note: g.note, mobs: g.mobs.map((id) => ({ id, boss: CODEX_BOSS_IDS.includes(id) })) })),
  { id: "leader", name: "사냥터 우두머리", note: "사냥터 몹의 우두머리 모습", mobs: LEADERS.map((id) => ({ id, boss: true })) },
  { id: "summon", name: "800~1200 소환물", note: "정예와 보스가 부르는 것", mobs: HIGH_SUMMON_IDS.map((id) => ({ id, boss: false })) },
  { id: "world", name: "월드보스", note: "성역에서 소환하는 보스", mobs: WORLD_BOSSES.map((b) => ({ id: b.type, boss: false })) },
];
const TOTAL = GROUPS.reduce((n, g) => n + g.mobs.length, 0);

const nameOf = (m) => { const d = MOB[m.id]; return !d ? m.id : m.boss && d.boss ? d.boss.name : d.name; };
function whereOf(id) {
  const sp = SPAWNS.find((s) => s.type === id && !s.boss && s.lv);
  if (sp) return `${(MAPS[sp.map] && MAPS[sp.map].name) || ""} · ${sp.lv[0]}~${sp.lv[1]}레벨`;
  const dg = DUNGEONS.find((d) => d.boss && d.boss.type === id);
  return dg ? dg.name : "";
}

// 내려받기 — 잘리지 않은 원래 크기 그림을 PNG 로. 파일 이름은 몹 id(우두머리면 _boss)
function download(m) {
  const c = mobArtCanvas(m.id, m.boss);
  if (!c) return false;
  c.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `${m.id}${m.boss ? "_boss" : ""}.png`;   // 한글 이름은 일부 브라우저가 "download" 로 바꿔 버려 id 로 둔다
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, "image/png");
  return true;
}

function MobArt({ id, boss, w, h }) {
  const ref = useRef(null);
  useEffect(() => {
    const paint = () => { const c = ref.current; if (c) drawMobIcon(c.getContext("2d"), id, w, h, false, boss); };
    paint();
    const ts = [900, 2400, 4500].map((ms) => setTimeout(paint, ms));   // 그림 파일이 늦게 오면 다시 그린다
    return () => ts.forEach(clearTimeout);
  }, [id, boss, w, h]);
  return <canvas ref={ref} width={w} height={h} aria-hidden="true" />;
}

export default function MobsTab() {
  const [grp, setGrp] = useState("all");
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(null);       // 크게 보는 몹 { id, boss }
  const [fail, setFail] = useState(false);
  const word = q.trim();
  const shown = GROUPS.filter((g) => grp === "all" || g.id === grp)
    .map((g) => ({ ...g, list: g.mobs.filter((m) => !word || nameOf(m).includes(word) || m.id.includes(word)) }))
    .filter((g) => g.list.length);
  return (
    <section className="adm-sec adm-mobs">
      <p className="adm-count">모든 몹 그림<span>{TOTAL}개 · 누르면 크게 봅니다</span></p>
      <div className="adm-mob-bar">
        <select value={grp} onChange={(e) => setGrp(e.target.value)} aria-label="무리">
          <option value="all">전체 무리</option>
          {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.mobs.length})</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · id 찾기" aria-label="찾기" />
      </div>
      {pick && (
        <div className="adm-mob-big">
          <MobArt id={pick.id} boss={pick.boss} w={BIG[0]} h={BIG[1]} />
          <div>
            <b>{nameOf(pick)}</b>
            <span>{pick.id}{pick.boss ? " · 우두머리 모습" : ""}</span>
            {whereOf(pick.id) && <span>{whereOf(pick.id)}</span>}
            <span className="adm-mob-acts">
              <button className="dl" onClick={() => setFail(!download(pick))}>PNG 내려받기</button>
              <button onClick={() => setPick(null)}>닫기</button>
            </span>
            {fail && <span>그림을 아직 불러오는 중입니다. 잠시 뒤 다시 눌러 주세요.</span>}
          </div>
        </div>
      )}
      {!shown.length && <p className="adm-empty">맞는 몹이 없습니다.</p>}
      {shown.map((g) => (
        <div key={g.id}>
          <h3 className="adm-mob-h">{g.name}<small>{g.note} · {g.list.length}</small></h3>
          <div className="adm-mob-grid">
            {g.list.map((m) => (
              <button key={`${m.id}:${m.boss}`} className={`adm-mob ${pick && pick.id === m.id && pick.boss === m.boss ? "on" : ""}`}
                onClick={() => { setPick(m); setFail(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <MobArt id={m.id} boss={m.boss} w={CARD[0]} h={CARD[1]} />
                <b>{nameOf(m)}</b>
                <em>{m.id}</em>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
