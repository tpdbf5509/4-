/* 「아이템 획득」 창(11월 27일 사용자 참고 사진) — 월드보스 · 던전 보스 보상을 아이콘 칸으로 한 줄에 보여 준다.
   판정이 보낸 loot 소식(rpg.js lootShow)을 그대로 그리기만 한다. 색은 hud2 와 같은 어두운 월넛 · 크림 · 바랜 금색 */
import { Coin } from "./ui/icons.jsx";
import { OnyxIcon } from "./ShopPanel.jsx";
import EquipmentArt from "./EquipmentArt.jsx";
import { ONYX } from "./game/onyxData.js";
import { MAT_BY_ID } from "./game/itemData.js";
import { armorName, armorArt } from "./game/armorData.js";
import { WORLD_BOSS_WEAPONS } from "./game/worldBossData.js";
import { specialArt, POTION_BY_ID } from "./game/shop.js";
import { POTION_ICON_SHEET, POTION_ICONS, potionIconOf, iconStyle } from "./game/skillIconData.js";

const won = (n) => Number(n || 0).toLocaleString("ko-KR");
// 칸 하나 — 이름과 그림
function cell(x) {
  if (x.k === "coin") return { name: "코인", ico: <Coin /> };
  if (x.k === "onyx") return { name: ONYX.name, ico: <OnyxIcon />, hot: true };
  if (x.k === "material") {
    const m = MAT_BY_ID[x.id];
    return { name: m ? m.name : x.id, ico: m && m.img ? <img src={m.img} alt="" /> : <i className="loot-dot" style={{ background: m ? m.color : "#888" }} /> };
  }
  if (x.k === "potion") {
    const p = POTION_BY_ID[x.id];
    return { name: p ? p.name : x.id, ico: <b className="rpg-ico" style={iconStyle(POTION_ICON_SHEET, POTION_ICONS[potionIconOf(x.id)])} /> };
  }
  if (x.k === "weapon") {
    const w = WORLD_BOSS_WEAPONS.find((q) => q.id === x.id);
    const art = w ? specialArt(w) : null;
    return { name: w ? w.name : x.id, ico: art ? <EquipmentArt src={art} /> : <b className="rpg-ico" style={iconStyle(POTION_ICON_SHEET, POTION_ICONS.weapon)} /> };
  }
  if (x.k === "armor") {
    const gr = x.g ?? 3;
    return { name: armorName(x.id, gr, x.set), ico: <EquipmentArt src={armorArt(x.id, gr, x.set)} /> };
  }
  return { name: x.id || "", ico: <i className="loot-dot" /> };
}

export default function LootPanel({ loot, onClose }) {
  if (!loot) return null;
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <div className="loot-win" role="dialog" aria-label={loot.title}>
        <div className="loot-head">
          <b>{loot.title}</b>
          {loot.sub && <span>{loot.sub}</span>}
        </div>
        <ul className="loot-list">
          {loot.items.map((x, i) => {
            const c = cell(x);
            return (
              <li key={i} className={c.hot ? "hot" : ""}>
                <span className="loot-ico">{c.ico}{x.n > 1 || x.k === "coin" ? <em>{won(x.n)}</em> : null}</span>
                <small>{c.name}</small>
              </li>
            );
          })}
        </ul>
        <button type="button" className="loot-ok" autoFocus onClick={onClose}>확인</button>
      </div>
    </>
  );
}
