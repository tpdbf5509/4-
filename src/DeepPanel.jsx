import { useEffect, useRef } from "react";
import { DEEP, DEEP_MAPS } from "./game/deepData.js";
import { whyDeepCraft, whyDeepEnter, hasEye } from "./game/rpg.js";
import { MAT_BY_ID } from "./game/itemData.js";

/* 광장 계몽의 문 창 — 상점 · 가방과 같은 .shop 틀 · 공통 버튼. 재료로 계몽의 눈을 만들고, 400레벨부터 400~800레벨 사냥터에 들어간다.
   판정은 방장이 다시 한다(rpg.js rpgDeep) */
export default function DeepPanel({ self, act, onClose }) {
  const dialog = useRef(null);
  useEffect(() => { const prev = document.activeElement; dialog.current?.focus(); return () => prev?.focus?.(); }, []);
  if (!self) return null;
  const eye = hasEye(self);
  const whyCraft = eye ? [] : whyDeepCraft(self), whyIn = whyDeepEnter(self);
  const have = (id) => (self.admin ? 999 : (self.bag && self.bag.m && self.bag.m[id]) || 0);
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <section ref={dialog} tabIndex={-1} className="shop deep-panel" role="dialog" aria-modal="true" aria-labelledby="deep-title"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
        <header className="shop-top">
          <div className="shop-title"><b id="deep-title">계몽의 문</b><span>{DEEP.lv}~800레벨 사냥터</span></div>
          <button type="button" className="shop-x" aria-label="계몽의 문 창 닫기" onClick={onClose}>×</button>
        </header>
        <div className="shop-body deep-body">
          <div className="deep-eye">
            <img src={DEEP.img} alt="" className={eye ? "" : "off"} />
            <div>
              <h3 className="shop-h">계몽의 눈</h3>
              <p>{eye ? "가지고 있습니다. 들어갈 때 쓰지 않는 열쇠입니다." : "보스 재료를 모아 만듭니다. 한 번 만들면 계속 남습니다."}</p>
            </div>
          </div>
          {!eye && (
            <>
              <ul className="deep-recipe">
                {DEEP.recipe.map(([id, n]) => {
                  const c = have(id);
                  return <li key={id} className={c >= n ? "ok" : ""}><span>{MAT_BY_ID[id].name}</span><b>{Math.min(c, n)}/{n}</b></li>;
                })}
              </ul>
              <div className="adv-acts">
                <button type="button" className="shop-btn main" disabled={whyCraft.length > 0} title={whyCraft[0] || ""} onClick={() => act("deep", { op: "craft" })}>계몽의 눈 만들기</button>
              </div>
              {whyCraft.length > 0 && <p className="adv-why">{whyCraft[0]}</p>}
            </>
          )}
          <h3 className="shop-h deep-h">사냥터</h3>
          <ul className="deep-zones">
            {DEEP_MAPS.map((d) => <li key={d.id}><span>{d.name}</span><small>{d.mob.name} · {d.lv[0]}~{d.lv[1]}레벨</small></li>)}
          </ul>
          <div className="adv-acts">
            <button type="button" className="shop-btn main" disabled={whyIn.length > 0} title={whyIn[0] || ""} onClick={() => { act("deep", { op: "enter" }); onClose(); }}>들어가기</button>
          </div>
          {whyIn.length > 0 && <p className="adv-why">{whyIn[0]}</p>}
        </div>
      </section>
    </>
  );
}
