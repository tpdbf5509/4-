/* ── 첫 10분 길 안내 — 새 캐릭터가 첫 레벨업까지 갈 길을 한 줄씩 알려 준다 ─────────
   광장 → 사냥문 → 사냥꾼에게 퀘스트 받기 → 토끼 잡기 → 첫 레벨업 → 스탯 찍기 → 끝.
   화면 위 가운데 칸과 판 위 화살표로 보인다(RpgView.jsx). 끝내거나 닫으면 이 기기에 캐릭터 이름별로 남는다.
   규칙 · 저장 · 스냅샷은 건드리지 않는다. 화면에 보이는 값(hud)만 읽는다. */
import { MAPS, QUEST, LV_MAX } from "./rpg.js";

export const GUIDE = {
  untilLv: 3,                      // 이 레벨을 넘으면 안내를 띄우지 않는다(예전 캐릭터에게는 나오지 않는다)
  store: "flg:rpgGuide:",          // + 캐릭터 이름 — "done" 이면 끝낸 것
  arrowLift: 78,                   // 화살표를 목표보다 이만큼 위에 띄운다(px)
};

const gateTo = (map, to) => (MAPS[map].gates || []).find((g) => g.to === to);
const npcOf = (map, id) => (MAPS[map].npcs || []).find((n) => n.id === id);

/* 지금 단계 — me 는 화면 칸 값(RpgView hud), metHunter 는 사냥꾼을 만났는지, key(id) 는 키 이름(휴대폰이면 "").
   돌려주는 값 { id, n 차례, title, line, target { map, x, y } | null, end 끝 단계인지 } 또는 null */
export function guideStep(me, metHunter, key) {
  if (!me || !me.loaded || me.admin || me.lv > GUIDE.untilLv || me.lv >= LV_MAX) return null;
  const k = (id) => (key(id) ? `${key(id)} 키로 ` : "");   // "Shift 키로 " — 휴대폰은 버튼이라 비운다
  if (me.lv >= 2) {
    if (me.left > 0) return { id: "stat", n: 5, title: "첫 레벨업", line: `스탯 포인트가 ${me.left} 생겼습니다. ${k("stat")}스탯 창을 열어 찍어 보세요.`, target: null };
    return { id: "done", n: 6, end: true, title: "첫 걸음 끝",
      line: "광장의 의뢰 NPC에게 의뢰를 받고 늑대 사냥터(10레벨)를 노려 보세요.", target: null };
  }
  if (me.map === "plaza") {
    const g = gateTo("plaza", "field");
    return { id: "gate", n: 1, title: "사냥터로", line: "광장 오른쪽 사냥문으로 걸어가세요. 화살표를 따라가면 됩니다.", target: { map: "plaza", x: g.x, y: g.y } };
  }
  if (me.map === "field") {
    if (!metHunter) {
      const n = npcOf("field", "hunter");
      return { id: "hunter", n: 2, title: "퀘스트 받기", line: `사냥꾼 앞에서 ${k("talk")}말을 걸어 ${QUEST.name} 퀘스트를 받으세요.`, target: { map: "field", x: n.x, y: n.y } };
    }
    if (me.quest && me.quest.on) {
      return { id: "hunt", n: 3, title: `토끼 ${me.quest.n}/${QUEST.need}`, line: `오른쪽으로 가며 토끼를 잡으세요. 가까우면 저절로 칩니다. ${k("skill")}큰 기술을 쓰면 여럿을 한 번에 칩니다.`, target: null };
    }
    return { id: "xp", n: 4, title: `경험치 ${me.xp}/${me.need}`, line: "토끼를 더 잡아 첫 레벨업을 채우세요. 의뢰 창에서 퀘스트를 다시 받을 수 있습니다.", target: null };
  }
  if (me.map === "train") {
    const g = gateTo("train", "plaza");
    return { id: "train", n: 1, title: "광장으로", line: "왼쪽 문으로 나가 광장 오른쪽 사냥문으로 가세요.", target: { map: "train", x: g.x, y: g.y } };
  }
  return { id: "back", n: 1, title: "토끼 사냥터로", line: "처음에는 토끼 사냥터가 알맞습니다. 왼쪽 문으로 돌아가세요.", target: null };
}
export const GUIDE_STEPS = 6;      // 차례 표시(1/6 …)
