import { WORLD_EQUIPMENT, worldArtCell } from './game/worldEquipmentData.js';
// 생성 원본 한 장을 격자로 표시한다. 가방·거래·강화에서 같은 그림 좌표를 쓴다.
export default function EquipmentArt({ src, className = '', ...props }) {
  const cell = worldArtCell(src);
  if (cell === null) return <img src={src} className={className} alt="" {...props} />;
  return <span className={`equipment-art ${className}`} aria-hidden="true"><img src={WORLD_EQUIPMENT.atlas} alt="" draggable={false}
    style={{ width: `${WORLD_EQUIPMENT.columns * 100}%`, height: `${WORLD_EQUIPMENT.rows * 100}%`,
      left: `${-(cell % WORLD_EQUIPMENT.columns) * 100}%`, top: `${-Math.floor(cell / WORLD_EQUIPMENT.columns) * 100}%` }} /></span>;
}
