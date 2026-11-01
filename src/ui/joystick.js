/* 작은 흔들림은 무시하고 기존 서버 입력인 8방향으로 보낸다. 이동 속도는 그대로다. */
const DEAD_ZONE = 0.18;
const DIAGONAL = Math.sin(Math.PI / 8);
const KNOB_TRAVEL = 0.55;
export function joystickInput(x, y, radius) {
  const distance = Math.hypot(x, y);
  if (radius <= 0 || distance <= radius * DEAD_ZONE) return { directions: [], knob: { x: 0, y: 0 } };
  const dx = x / distance, dy = y / distance;
  const directions = [];
  if (Math.abs(dx) >= DIAGONAL) directions.push(dx < 0 ? "left" : "right");
  if (Math.abs(dy) >= DIAGONAL) directions.push(dy < 0 ? "up" : "down");
  const travel = Math.min(distance, radius * KNOB_TRAVEL);
  return { directions, knob: { x: dx * travel, y: dy * travel } };
}
