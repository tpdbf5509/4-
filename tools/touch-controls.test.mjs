import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joystickInput } from '../src/ui/joystick.js';
import { rpgHold } from '../src/game/rpg.js';

test('조이스틱의 중심 흔들림은 멈춤이고 8방향은 기존 이동 입력으로 전달된다', () => {
  assert.deepEqual(joystickInput(3, -3, 50).directions, []);
  const g = { heroes: [{ hold: [], dest: { x: 100, y: 100 } }] };
  for (const [x, y, expected] of [
    [50, 0, ['right']], [-50, 0, ['left']], [0, -50, ['up']], [0, 50, ['down']],
    [50, -50, ['right', 'up']], [50, 50, ['right', 'down']],
    [-50, -50, ['left', 'up']], [-50, 50, ['left', 'down']],
  ]) {
    const input = joystickInput(x, y, 50);
    rpgHold(g, 0, input.directions);
    assert.deepEqual(g.heroes[0].hold, expected);
    assert(Math.hypot(input.knob.x, input.knob.y) <= 27.50001);
  }
  assert.equal(g.heroes[0].dest, null);
  rpgHold(g, 0, joystickInput(0, 0, 50).directions);
  assert.deepEqual(g.heroes[0].hold, []);
});

test('조이스틱 바깥까지 끌어도 손잡이는 범위 안에 머문다', () => {
  const input = joystickInput(1000, -1000, 50);
  assert.deepEqual(input.directions, ['right', 'up']);
  assert(Math.hypot(input.knob.x, input.knob.y) <= 27.50001);
  assert.deepEqual(joystickInput(10, 10, 0).directions, []);
});
