/* 병과를 대표하는 캐릭터 그림.
   그림 파일은 public/assets/characters 에 두고, 병과 id로 찾아 쓴다.
   새 병과 캐릭터가 나오면 파일을 넣고 아래 표에 한 줄만 더하면 된다. */

export const TOWER_CHARACTERS = {
  archer: {
    src: "/assets/characters/archer-tower.png",
    alt: "궁수탑 캐릭터 — 활을 당기는 초록 두건의 궁수",
  },
};

export const charOf = (id) => TOWER_CHARACTERS[id] || null;

/* 그림은 잘리지 않게 통째로 담는다(object-fit: contain). */
export function TowerChar({ id, className = "" }) {
  const c = charOf(id);
  if (!c) return null;
  return <img className={`tower-char ${className}`.trim()} src={c.src} alt={c.alt} draggable="false" />;
}
