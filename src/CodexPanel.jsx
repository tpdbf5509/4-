/* RPG 도감 · 업적 창 — 칭호 · 파티 창과 같은 틀(.rpg-stat .rpg-win)에 상점 탭(.shop-tabs)을 쓴다.
   수치 · 목록은 game/codexData.js, 보상 규칙은 game/rpg.js awardAchieves */
import { useEffect, useRef, useState } from "react";
import { CODEX_GROUPS, CODEX_IDS, CODEX_STARS, ACHIEVES, CODEX_BOSS_IDS, dexCount, starsOf } from "./game/codexData.js";
import { TITLE_BY_ID, NEED_NAME } from "./game/socialData.js";
import { MOB, MAPS, SPAWNS, needNow, achMet, achGot } from "./game/rpg.js";
import { DUNGEONS } from "./game/dungeonData.js";
import { drawMobIcon } from "./game/rpgArt.js";

const num = (n) => Math.floor(n || 0).toLocaleString("ko-KR");
const ICON_W = 72, ICON_H = 58;

// 어디서 만나는가 — 사냥터 이름과 레벨, 던전 이름, 길드 토벌
function whereOf(id) {
  const sp = SPAWNS.find((s) => s.type === id && !s.boss && s.lv);
  if (sp) return `${(MAPS[sp.map] && MAPS[sp.map].name) || ""} · ${sp.lv[0]}~${sp.lv[1]}레벨`;
  const dg = DUNGEONS.filter((d) => d.boss && d.boss.type === id);
  if (dg.length) return dg.length > 1 ? `${dg[0].name.split(" · ")[0]} ${dg.length}곳` : dg[0].name;
  if (id === "skeleton") return "모르가스가 부르는 졸개";
  if (id.startsWith("guild_")) return "길드 토벌";
  return "";
}

function MobIcon({ id, hide }) {
  const ref = useRef(null);
  useEffect(() => {
    const paint = () => { const c = ref.current; if (c) drawMobIcon(c.getContext("2d"), id, ICON_W, ICON_H, hide, CODEX_BOSS_IDS.includes(id)); };
    paint();
    const ts = [900, 2400].map((ms) => setTimeout(paint, ms));   // 그림 파일이 늦게 오면 다시 그린다
    return () => ts.forEach(clearTimeout);
  }, [id, hide]);
  return <canvas ref={ref} className="codex-art" width={ICON_W} height={ICON_H} aria-hidden="true" />;
}

function CodexTab({ rec }) {
  return CODEX_GROUPS.map((gr) => {
    const found = dexCount(rec, 1, gr.mobs);
    return (
      <section key={gr.id}>
        <h4 className="shop-h">{gr.name}<small>{gr.note} · {found}/{gr.mobs.length}</small></h4>
        <div className="codex-grid">
          {gr.mobs.map((id) => {
            const n = (rec && rec[id]) || 0, seen = n > 0, def = MOB[id];
            const st = starsOf(n);
            const boss = def && def.boss && def.boss.name !== def.name ? def.boss.name : "";
            return (
              <div key={id} className={`codex-card ${seen ? "" : "unseen"}`}
                title={seen ? `${def.name}${boss ? ` · 우두머리 ${boss}` : ""}\n${whereOf(id)}` : whereOf(id)}>
                <MobIcon id={id} hide={!seen} />
                <b>{seen ? def.name : "???"}</b>
                <span className="codex-stars" aria-label={`별 ${st}개`}>
                  {CODEX_STARS.map((s, i) => <i key={s} className={i < st ? "on" : ""}>★</i>)}
                </span>
                <em>{seen ? `${num(n)}마리` : whereOf(id)}</em>
              </div>
            );
          })}
        </div>
      </section>
    );
  });
}

function AchieveTab({ me }) {
  const groups = [...new Set(ACHIEVES.map((a) => a.group))];
  return groups.map((name) => (
    <section key={name}>
      <h4 className="shop-h">{name}</h4>
      <div className="rpg-stat-list">
        {ACHIEVES.filter((a) => a.group === name).map((a) => {
          const got = achGot(me, a), met = achMet(me, a);
          const [k, need] = Object.entries(a.need)[0];
          const now = Math.min(needNow(me, k), need);
          const t = a.title && TITLE_BY_ID[a.title];
          return (
            <div key={a.id} className={`rpg-win-row codex-ach ${got ? "on" : met ? "" : "locked"}`}>
              <span className="rpg-stat-name">
                <b>{a.name}</b>
                <em>{NEED_NAME[k] || k} {num(now)}/{num(need)}</em>
                <span className="codex-bar"><span style={{ width: `${(now / need) * 100}%` }} /></span>
              </span>
              <span className="codex-prize">
                <span>코인 {num(a.coin)}</span>
                {t && <small>칭호 「{t.name}」</small>}
                {got && <span className="rpg-win-tag">받음</span>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  ));
}

export default function CodexPanel({ me, onClose }) {
  const [tab, setTab] = useState("codex");
  const found = dexCount(me.rec);
  const done = ACHIEVES.filter((a) => achGot(me, a)).length;
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <div className="rpg-stat rpg-win codex" role="dialog" aria-label="도감 · 업적">
        <div className="rpg-stat-head">
          <b>도감 · 업적</b>
          {tab === "codex"
            ? <span>모은 도감 <em>{found}</em> / {CODEX_IDS.length}</span>
            : <span>이룬 업적 <em>{done}</em> / {ACHIEVES.length}</span>}
        </div>
        <div className="shop-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "codex"} className={tab === "codex" ? "on" : ""} onClick={() => setTab("codex")}>도감</button>
          <button type="button" role="tab" aria-selected={tab === "ach"} className={tab === "ach" ? "on" : ""} onClick={() => setTab("ach")}>업적</button>
        </div>
        <p className="rpg-stat-rule">
          {tab === "codex"
            ? "한 마리를 잡으면 도감에 모습이 드러납니다. 1 · 100 · 1,000마리마다 별을 하나씩 받습니다."
            : "조건을 채우면 코인이 바로 들어옵니다. 칭호가 붙은 업적은 칭호 창에서 달 수 있습니다."}
        </p>
        {tab === "codex" ? <CodexTab rec={me.rec} /> : <AchieveTab me={me} />}
      </div>
    </>
  );
}
