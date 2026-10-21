// Scene distance is independent from the real-world wedding countdown.
export const RUN_SPEED = 78;
export const SLOW_DURATION = 1.6;
const TYPES = ['block', 'rock', 'puddle', 'stump'];

export function obstaclesBetween(from, to) {
  const items = [];
  const first = Math.max(0, Math.floor((from - 300) / 310));
  const last = Math.max(first, Math.ceil((to - 220) / 310));
  for (let id = first; id <= last; id += 1) {
    const x = 220 + id * 310 + (id % 3) * 24;
    if (x < from || x > to) continue;
    const type = TYPES[id % TYPES.length];
    items.push({ id, x, type, width: type === 'puddle' ? 44 : 32,
      height: type === 'puddle' ? 6 : type === 'rock' ? 20 : 30,
      avoid: id % 3 !== 1 });
  }
  return items;
}

export function createRunnerState() {
  return { distance: 0, elapsed: 0, slowRemaining: 0, lastHit: -1, hits: 0, manualJumpAt: -100 };
}

export function jumpHeight(seconds) {
  return seconds >= 0 && seconds < 1.3 ? Math.sin(seconds / 1.3 * Math.PI) * 92 : 0;
}

export function characterLift(state, position, obstacles) {
  const followDelay = Math.max(0, state.distance - position) / RUN_SPEED;
  let lift = jumpHeight(state.elapsed - state.manualJumpAt - followDelay);
  for (const obstacle of obstacles) {
    const distance = obstacle.x - position;
    if (obstacle.avoid && distance < 92 && distance > -62) {
      lift = Math.max(lift, Math.sin((92 - distance) / 154 * Math.PI) * 84);
    }
  }
  return lift;
}

export function runnerSpeed(state) {
  if (state.slowRemaining <= 0) return RUN_SPEED;
  const recovery = 1 - state.slowRemaining / SLOW_DURATION;
  return RUN_SPEED * (.35 + .65 * recovery * recovery);
}

export function requestJump(state) {
  if (state.elapsed - state.manualJumpAt >= 2.2) state.manualJumpAt = state.elapsed;
}

// Called in short simulation steps; a shared hit registers only once per obstacle.
export function stepRunner(state, delta, spacing = 55) {
  state.elapsed += delta;
  state.slowRemaining = Math.max(0, state.slowRemaining - delta);
  state.distance += runnerSpeed(state) * delta;
  const obstacles = obstaclesBetween(state.distance - spacing - 50, state.distance + 110);
  let collided = null;
  for (const obstacle of obstacles) {
    if (obstacle.id <= state.lastHit) continue;
    const hit = [state.distance, state.distance - spacing].some(position =>
      Math.abs(position - obstacle.x) < obstacle.width / 2 + 10 &&
      characterLift(state, position, obstacles) < obstacle.height + 3);
    if (hit) {
      state.lastHit = obstacle.id; state.hits += 1;
      state.slowRemaining = SLOW_DURATION; collided = obstacle;
    }
  }
  return collided;
}
