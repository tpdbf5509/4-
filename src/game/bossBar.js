/* ── 보스 체력바 잔상 — 그리기 전용(판정 · 체력 셈과 상관없다) ─────────────
   실제 체력 칸은 받은 체력 그대로 바로 줄인다. 그 뒤의 주황 잔상은 맞기 전 자리에 hold 초 머물렀다가
   dur 초 안에 실제 칸까지 부드럽게 따라온다. 잔상이 거의 따라온 뒤의 피해만 다시 머물게 해,
   계속 맞아도 잔상이 멈춰 있지 않는다. 잔상은 실제 칸보다 낮아지지 않고, 회복하면 바로 실제 칸에 맞춘다.
   상태는 보스(몹 객체)마다 m.hpFx 에 둔다 — 새 보스는 새 객체라 이전 잔상이 남지 않는다. */
export const BOSS_BAR = {
  hold: 0.28,           // 맞은 뒤 잔상이 머무는 시간(초) — 200~350ms
  dur: 0.55,            // 잔상이 실제 칸까지 따라오는 시간(초) — 400~700ms. 전투가 빠르면 줄인다
  snap: 0.0005,         // 이만큼 가까우면 딱 맞춘다(체력 몫)
  rearm: 0.01,          // 잔상이 실제 칸에 이만큼 가까이 따라와 있으면 새 피해에 다시 머문다 — 계속 맞아도 한 번씩은 맞기 전 자리가 보인다
};

// ratio 실제 체력 몫(0~1), now 초. fx 가 없으면 새로 만든다(처음 보는 보스는 잔상 없이 시작)
export function ghostStep(fx, ratio, now) {
  const r = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  if (!fx) return { real: r, ghost: r, holdTo: 0, t: now };
  const dt = Math.min(0.1, Math.max(0, now - fx.t));
  fx.t = now;
  if (r > fx.real) {                                  // 회복 — 잔상을 실제 칸에 맞춘다
    fx.ghost = r; fx.holdTo = 0;
  } else if (r < fx.real && fx.ghost - fx.real <= BOSS_BAR.rearm) {
    fx.holdTo = now + BOSS_BAR.hold;                  // 거의 따라온 뒤 새로 맞았다 — 맞기 전 자리에 잠깐 머문다
    // 멀리 뒤처져 있을 때는 다시 머물지 않고 계속 따라온다 — 연속 공격에 잔상이 멈춰 있지 않게
  }
  fx.real = r;
  if (now >= fx.holdTo && fx.ghost > r) {
    fx.ghost += (r - fx.ghost) * (1 - Math.exp(-dt / (BOSS_BAR.dur / 4)));   // dur 안에 98% 따라온다
    if (fx.ghost - r < BOSS_BAR.snap) fx.ghost = r;
  }
  fx.ghost = Math.max(fx.ghost, r);                   // 실제보다 더 줄어 보이지 않게
  return fx;
}
