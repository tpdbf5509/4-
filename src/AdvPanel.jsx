import { useEffect, useRef, useState } from "react";
import { JOB_TUNE } from "./game/jobTuneData.js";
import { Coin } from "./ui/icons.jsx";
import { ADV, ADV_BY_ID, ADV_BONUS, ADV_MASTERY, ADV_TRAITS, MASTERY_MAX, advForJob, masteryLv, traitAt, trialText, ADV_BODY } from "./game/advData.js";
import { whyAdvStart, whyAdvConfirm } from "./game/advance.js";
import { advArtPath, dist, JOB_BY_ID, mobName, STATS } from "./game/rpg.js";
import { MAT_BY_ID } from "./game/itemData.js";
import { weaponCap } from "./game/shopData.js";
import { keyLabel } from "./game/keys.js";
const KN = JOB_TUNE.knight;   // 기사 기본 방어 · 무효화 방어막(jobTuneData.js)
// 전직 추가 스탯 한 줄 — 체력 +450 · 물리력 +20 (치명타 · 치명타 피해는 %)
const bonusText = (id) => Object.entries(ADV_BONUS[id] || {}).map(([k, v]) => {
  const st = STATS.find((t) => t.id === k);
  return `${st ? st.name : k} +${v.toLocaleString("ko-KR")}${k === "crit" || k === "cdmg" ? "%" : ""}`;
}).join(" · ") || "없음";

/* 광장 전직 교관 창 — 상점 · 가방과 같은 .shop 틀 · 공통 버튼. 내 기본 직업의 전직 둘을 보여 주고 시험 받기 · 그만두기 · 확정을 보낸다.
   판정은 방장이 다시 한다(advance.js). 확정은 되돌릴 수 없어 한 번 더 묻는다(다시 묻지 않기 없음) */
const LINE = { main: "정통 강화", special: "특수" };
// 목록 시험(총사 몬스터 · 소환술사 재료) — 종류마다 채운 수
const itemName = (c, id) => (c.id === "gunner" ? mobName({ type: id }) : MAT_BY_ID[id]?.name || id);
function TrialList({ c, q }) {
  const T = c.trial;
  return (
    <ul className="adv-tlist">
      {T.list.map((id, i) => {
        const n = (q.m && q.m[i]) || 0;
        return <li key={id} className={n >= T.each ? "ok" : ""}>{itemName(c, id)}{T.each > 1 ? ` ${n}/${T.each}` : n ? " ✓" : ""}</li>;
      })}
    </ul>
  );
}
/* 전직 숙련도 — 지금 단계 · 다음 단계까지 · 열린 전투 특성과 정확한 발동 조건 · 다음 보상 · 얻는 법. 관리자는 단계를 바로 정해 시험한다 */
const STEP_NAME = ["전직 완료", "전투 특성 개방", "전투 특성 강화", "최종 강화 · 전용 연출"];
function Mastery({ c, pts, admin, act }) {
  const T = ADV_TRAITS[c.id], P = ADV_MASTERY.pts, lv = masteryLv(pts), max = lv >= P.length;
  const from = P[lv - 1], to = max ? MASTERY_MAX : P[lv];
  const pct = max ? 100 : Math.min(100, ((pts - from) / (to - from)) * 100);
  const next = lv === 1 ? `「${T.name}」 개방` : lv === 2 ? T.up3 : lv === 3 ? T.up4 : "";
  const steps = ["전직 액티브 · 패시브 · 추가 스탯", `「${T.name}」 개방`, T.up3, T.up4];
  return (
    <section className="adv-mastery" aria-label="전직 숙련도">
      <div className="adv-mhead">
        <h3 className="shop-h">전직 숙련도 <b>{lv}단계</b>{max ? " · 최대 단계" : ""}</h3>
        <span>{max ? `${pts.toLocaleString("ko-KR")} · 최대` : `${pts.toLocaleString("ko-KR")} / ${to.toLocaleString("ko-KR")}`}</span>
      </div>
      <div className="adv-prog" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      <dl className="adv-skills">
        <dt>전투 특성</dt>
        <dd><b>{T.name}</b> · {lv >= 2 ? "열림" : "2단계에 열림"}<br />{T.text(traitAt(c.id, Math.max(2, lv)))}</dd>
        <dt>다음 보상</dt><dd>{max ? "모든 단계를 마쳤습니다" : `${lv + 1}단계 — ${next}`}</dd>
        <dt>얻는 법</dt>
        <dd>{ADV_MASTERY.minLv}레벨 이상 몬스터 {ADV_MASTERY.mob} · 사냥터 보스 {ADV_MASTERY.boss} · 던전 보스 {ADV_MASTERY.dgBoss} · 월드 · 길드 보스 {ADV_MASTERY.raid}.
          1분에 {ADV_MASTERY.perMin}까지 · 허수아비 · 훈련장 · 결투 · PvP 는 세지 않습니다</dd>
      </dl>
      <ol className="adv-steps">
        {steps.map((t, i) => (
          <li key={i} className={lv > i ? "ok" : ""}><b>{i + 1}단계</b><span>{STEP_NAME[i]} — {t}</span><em>{P[i] ? P[i].toLocaleString("ko-KR") : "전직"}</em></li>
        ))}
      </ol>
      {!!admin && (
        <div className="adv-acts">
          {P.map((_, i) => <button key={i} type="button" className={`shop-btn ${lv === i + 1 ? "main" : ""}`} onClick={() => act("adv", { op: "mastery", lv: i + 1 })}>관리자 — {i + 1}단계</button>)}
        </div>
      )}
    </section>
  );
}
// 전직 모습 — 내 성별의 전직 그림(앞)
function AdvLook({ id, gender }) {
  return <span className="adv-look" aria-hidden="true"><img src={advArtPath({ job: ADV_BY_ID[id].job, gender, advClass: id }, "front")} alt="" /></span>;
}

// 전직마다 몸(체력 · 걷는 속도 · 받는 피해 · 장전) — advData.js ADV_BODY · reload
function bodyText(c) {
  const b = ADV_BODY[c.id] || {}, pct = (v) => `${Math.round(Math.abs(v - 1) * 100)}%`, out = [];
  if (b.hp) out.push(`최대 체력 ${pct(b.hp)} ${b.hp < 1 ? "낮음" : "높음"}`);
  if (b.spd) out.push(`걷는 속도 ${pct(b.spd)} 빠름`);
  if (b.take) out.push(`받는 피해 ${pct(b.take)} 많음`);
  if (c.reload) out.push(`평타 ${c.reload.mag}발마다 장전 ${c.reload.time}초 · 장전 중 걷는 속도 ${Math.round(c.reload.slow * 100)}% 감소`);
  return out.join(" · ");
}
export default function AdvPanel({ self, act, advKey, onClose }) {
  const dialog = useRef(null);
  const [ask, setAsk] = useState(null);             // 확정 전에 묻는 전직 id
  useEffect(() => { const prev = document.activeElement; dialog.current?.focus(); return () => prev?.focus?.(); }, []);
  if (!self) return null;
  const list = advForJob(self.job);
  const cur = ADV_BY_ID[self.advClass];
  const q = self.advQ && ADV_BY_ID[self.advQ.c] ? self.advQ : null;
  const bagRoom = self.bag && self.bag.w.length < weaponCap(self);
  const qDone = !!q && q.n >= ADV_BY_ID[q.c].trial.n;   // 마친 시험이 있으면 다른 시험으로 바꾸는 버튼을 숨긴다(한 번 눌러 진행을 잃지 않게)
  const keyName = keyLabel(advKey) || "없음";
  return (
    <>
      <div className="rpg-menu-back" onClick={onClose} />
      <section ref={dialog} tabIndex={-1} className="shop adv-panel" role="dialog" aria-modal="true" aria-labelledby="adv-title"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); if (ask) setAsk(null); else onClose(); } }}>
        <header className="shop-top">
          <div className="shop-title"><b id="adv-title">전직 교관</b><span>{ADV.lv}레벨 1차 전직</span></div>
          <span className="shop-coins"><Coin />{self.admin ? "무제한" : (self.coins || 0).toLocaleString("ko-KR")}</span>
          <button type="button" className="shop-x" aria-label="전직 창 닫기" onClick={onClose}>×</button>
        </header>
        <div className="shop-body adv-body">
          <p className="adv-now">
            {cur ? <>지금 전직 <b>{cur.name}</b> · 숙련도 {masteryLv(self.advM)}단계 · 전직 스킬 「{cur.active.name}」 키 <kbd>{keyName}</kbd></>
              : q ? <>{ADV_BY_ID[q.c].trial.name} <b>{trialText(ADV_BY_ID[q.c], q)}</b>{q.n >= ADV_BY_ID[q.c].trial.n ? " · 완료" : ""}</>
              : self.lv >= ADV.lv ? <>{JOB_BY_ID[self.job]?.name} 전직 {list.length}개 가운데 하나의 시험을 받으세요.</>
              : <>{ADV.lv}레벨부터 전직할 수 있습니다. 지금 {self.lv}레벨.</>}
          </p>
          {cur && <Mastery c={cur} pts={self.advM || 0} admin={self.admin} act={act} />}
          <div className="adv-list">
            {list.map((c) => {
              const mine = self.advClass === c.id, trying = q && q.c === c.id, done = trying && q.n >= c.trial.n;
              const whyStart = whyAdvStart(self, c.id, dist), whyOk = whyAdvConfirm(self, c.id, dist, bagRoom);
              return (
                <article key={c.id} className={`adv-card ${mine ? "on" : ""}`}>
                  <div className="adv-head">
                    <AdvLook id={c.id} gender={self.gender} />
                    <div><h3 className="shop-h">{c.name}</h3><span className="adv-line">{LINE[c.line]} · {c.weapon}</span></div>
                  </div>
                  <p className="adv-note">{c.note}</p>
                  <dl className="adv-skills">
                    <dt>액티브</dt><dd><b>{c.active.name}</b> · 대기 {c.active.cd}초<br />{c.active.note}</dd>
                    <dt>패시브</dt><dd><b>{c.passive.name}</b><br />{c.passive.note}
                      {c.id === "knight" && <><br /><b>{KN.nullShield.name}</b><br />{KN.nullShield.note}<br /><b>기본 방어</b><br />받는 피해 {KN.cut * 100}% 감소 · 마법 · 물리 저항력 {KN.magicRes * 100}%</>}</dd>
                    {(ADV_BODY[c.id] || c.reload) && <><dt>몸</dt><dd>{bodyText(c)}</dd></>}
                    <dt>추가 스탯</dt><dd>{bonusText(c.id)}</dd>
                    <dt>전투 특성</dt><dd><b>{ADV_TRAITS[c.id].name}</b> · 숙련도 2단계<br />{ADV_TRAITS[c.id].text(traitAt(c.id, 2))}</dd>
                    <dt>시험</dt><dd><b>{c.trial.name}</b><br />{c.trial.note}{trying ? ` · ${trialText(c, q)}` : ""}</dd>
                  </dl>
                  {trying && <div className="adv-prog" aria-hidden="true"><i style={{ width: `${Math.min(100, (q.n / c.trial.n) * 100)}%` }} /></div>}
                  {trying && c.trial.list && <TrialList c={c} q={q} />}
                  {!cur && (
                    <div className="adv-acts">
                      {!trying && !qDone && <button type="button" className="shop-btn" disabled={whyStart.length > 0} title={whyStart[0] || ""}
                        onClick={() => act("adv", { op: "start", c: c.id })}>{q ? "이 시험으로 바꾸기" : "시험 받기"}</button>}
                      {trying && !done && <button type="button" className="shop-btn" onClick={() => act("adv", { op: "drop" })}>시험 그만두기</button>}
                      {(done || self.admin) && <button type="button" className="shop-btn main" disabled={whyOk.length > 0} title={whyOk[0] || ""}
                        onClick={() => setAsk(c.id)}>{c.name} 전직 확정</button>}
                    </div>
                  )}
                  {!cur && !trying && !qDone && whyStart.length > 0 && <p className="adv-why">{whyStart[0]}</p>}
                  {(done || self.admin) && !cur && whyOk.length > 0 && <p className="adv-why">{whyOk[0]}</p>}
                </article>
              );
            })}
          </div>
          <p className="adv-rule">전직하면 기본 직업 스킬 · 궁극기 · 무기 스킬은 그대로 둡니다. 전직 스킬은 따로 한 칸(키 {keyName})이고 패시브는 저절로 듣습니다.
            전직은 되돌릴 수 없습니다. 시험을 바꾸면 진행은 처음부터입니다.</p>
          {self.admin && cur && <button type="button" className="shop-btn" onClick={() => act("adv", { op: "reset" })}>관리자 — 전직 비우기</button>}
        </div>
        {ask && (
          <div className="shop-confirm" role="alertdialog" aria-modal="true" aria-label="전직 확정">
            <div className="shop-confirm-box">
              <b className="shop-confirm-title">{ADV_BY_ID[ask].name}(으)로 전직할까요?</b>
              <p>전직은 되돌릴 수 없습니다. 다른 전직은 고를 수 없게 됩니다.{ADV_BY_ID[ask].gear ? " 전직 무기를 가방에 넣어 드립니다." : ""}</p>
              <div className="shop-confirm-acts">
                <button type="button" className="shop-btn" onClick={() => setAsk(null)}>취소</button>
                <button type="button" className="shop-btn main" onClick={() => { act("adv", { op: "confirm", c: ask }); setAsk(null); }}>전직하기</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
