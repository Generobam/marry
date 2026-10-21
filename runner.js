import { getPalette, drawCharacter, drawHeart } from './pixel-art.js';
import { createRunnerState, obstaclesBetween, characterLift, runnerSpeed, stepRunner, requestJump, RUN_SPEED, SLOW_DURATION } from './runner-model.js';

export function startRunner(canvas, weddingDate) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const p = getPalette();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pauseButton = document.querySelector('#pause-game');
  const status = document.querySelector('#game-status');
  const stage = document.querySelector('#game-stage');
  const frameElement = document.querySelector('.game-frame');
  const state = createRunnerState();
  let paused = motion.matches; let visible = false;
  let width = 960; let height = 300; let last = 0; let animationId = 0;
  let arrived = Date.now() >= new Date(weddingDate).getTime();
  let visualState = '';
  const rect = (x, y, w, h, color) => { ctx.fillStyle = p[color]; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const scale = () => width < 600 ? 2 : 2.7;

  function updateControls() {
    pauseButton.textContent = paused ? '▷' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', paused ? '애니메이션 재생' : '애니메이션 일시정지');
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.disabled = arrived;
    const current = arrived ? 'arrived' : paused ? 'paused' : state.slowRemaining > 0 ? 'slowed' : 'running';
    if (current === visualState) return;
    visualState = current; frameElement.dataset.motion = current;
    const messages = {
      paused: ['잠시 쉬어가요. 재생을 누르면 이어 달려요.', 'TAKE A BREATH'],
      arrived: ['드디어, 우리의 시작. 함께해 주셔서 감사합니다.', 'JUST MARRIED'],
      slowed: ['잠깐 삐끗해도 괜찮아. 우리 함께 가자!', 'SLOW & TOGETHER'],
      running: ['하루하루, 우리의 날을 향해 함께 달려요.', 'ON OUR WAY'],
    };
    [status.textContent, stage.textContent] = messages[current];
  }
  function cloud(x, y, size = 1) {
    rect(x, y, 48 * size, 10 * size, 'cloud'); rect(x + 9 * size, y - 9 * size, 28 * size, 9 * size, 'cloud');
  }
  function flower(x, y, color = 'flower') {
    rect(x + 3, y + 4, 2, 10, 'grass'); rect(x, y + 8, 3, 2, 'grass');
    rect(x + 1, y, 6, 6, color); rect(x - 1, y + 2, 10, 2, color); rect(x + 3, y + 2, 2, 2, 'gold');
  }
  function hill(x, y, w, h, color) {
    ctx.fillStyle = p[color]; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y - h, x + w, y); ctx.closePath(); ctx.fill();
  }
  function hall(x, floor) {
    // A small hotel wedding hall rather than a finish line that resets the scene.
    rect(x, floor - 110, 95, 110, 'white'); rect(x - 5, floor - 116, 105, 8, 'peach');
    rect(x + 35, floor - 38, 26, 38, 'ground'); rect(x + 39, floor - 43, 18, 5, 'ground');
    for (const wx of [12, 39, 66]) for (const wy of [96, 65]) {
      rect(x + wx, floor - wy, 15, 19, 'sky'); rect(x + wx + 6, floor - wy, 2, 19, 'ground');
    }
    flower(x - 8, floor - 14); flower(x + 98, floor - 14);
    drawHeart(ctx, p, x + 40, floor - 137, 2);
  }
  function obstacleArt(obstacle, x, floor) {
    if (obstacle.type === 'puddle') {
      rect(x - 22, floor - 2, 44, 7, 'suit'); rect(x - 16, floor, 27, 2, 'sky');
    } else if (obstacle.type === 'rock') {
      rect(x - 16, floor - 12, 32, 12, 'muted'); rect(x - 10, floor - 20, 19, 8, 'muted'); rect(x - 7, floor - 17, 9, 4, 'line');
    } else if (obstacle.type === 'block') {
      rect(x - 16, floor - 30, 32, 30, 'soil'); rect(x - 13, floor - 27, 26, 24, 'peach');
      rect(x - 13, floor - 16, 26, 2, 'soil'); rect(x, floor - 27, 2, 11, 'soil'); rect(x - 7, floor - 14, 2, 11, 'soil');
    } else {
      rect(x - 13, floor - 23, 26, 23, 'accent'); rect(x - 17, floor - 30, 34, 9, 'grass');
      rect(x - 9, floor - 21, 4, 19, 'hill-front'); flower(x - 4, floor - 43);
    }
  }
  function draw() {
    ctx.clearRect(0, 0, width, height); rect(0, 0, width, height, 'sky');
    const floor = height - 35; const unit = scale(); const center = Math.max(94, width * .25);
    const spacing = unit * 23; const scroll = state.distance;
    for (let i = -1; i < width / 170 + 2; i++) {
      const x = i * 170 - (scroll * .12 % 170);
      cloud(x + 25, 35 + (Math.abs(i) % 3) * 20, .85); hill(x - 50, floor, 300, 140, 'hill-back');
    }
    for (let i = -1; i < width / 210 + 2; i++) hill(i * 210 - (scroll * .27 % 210) - 50, floor, 280, 85, 'hill-front');
    rect(0, floor, width, 7, 'grass'); rect(0, floor + 7, width, 28, 'ground');
    for (let x = -scroll % 30; x < width; x += 30) { rect(x, floor + 7, 14, 3, 'soil'); rect(x + 8, floor + 20, 4, 3, 'soil'); }
    for (let i = -1; i < width / 82 + 2; i++) flower(i * 82 - (scroll * .7 % 82), floor - 14, i % 2 ? 'white' : 'flower');
    const obstacles = obstaclesBetween(scroll - center - 50, scroll + width + 100);
    if (!arrived) for (const obstacle of obstacles) obstacleArt(obstacle, obstacle.x - scroll + center, floor);
    else hall(Math.max(center + 44, width * .6), floor);
    const speed = runnerSpeed(state) / RUN_SPEED;
    const frame = !paused && !arrived ? (Math.floor(state.distance / 8) % 2) * 2 - 1 : 0;
    const stumble = Math.max(0, state.slowRemaining - (SLOW_DURATION - .45));
    const bounce = Math.sin(stumble / .45 * Math.PI) * 12;
    const groomLift = arrived ? 0 : Math.max(characterLift(state, scroll, obstacles), bounce);
    const brideLift = arrived ? 0 : Math.max(characterLift(state, scroll - spacing, obstacles), bounce);
    ctx.fillStyle = p.grass; ctx.globalAlpha = .3;
    [center, center - spacing].forEach(x => { ctx.beginPath(); ctx.ellipse(x, floor + 1, unit * 8, 3, 0, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
    drawCharacter(ctx, p, center - spacing - unit * 8, floor, unit, true, -frame, brideLift);
    drawCharacter(ctx, p, center - unit * 8, floor, unit, false, frame, groomLift);
    if (stumble > 0) {
      const y = floor - 24 * unit - 16;
      rect(center - 8, y, 3, 9, 'gold'); rect(center - 11, y + 3, 9, 3, 'gold');
      rect(center - spacing + 8, y - 6, 3, 9, 'gold'); rect(center - spacing + 5, y - 3, 9, 3, 'gold');
    }
    if (speed < .8 && !arrived) {
      rect(center - spacing - 27, floor - 6, 7, 4, 'cloud'); rect(center - spacing - 38, floor - 3, 5, 3, 'cloud');
    }
    if (arrived) drawHeart(ctx, p, center - spacing / 2 - 7, floor - 24 * unit - 23, 2);
  }
  function canAnimate() { return !paused && !arrived && visible && !document.hidden && !document.querySelector('dialog[open]'); }
  function schedule() {
    if (canAnimate() && !animationId) { last = 0; animationId = requestAnimationFrame(tick); }
  }
  function checkWedding() {
    const next = Date.now() >= new Date(weddingDate).getTime();
    if (arrived !== next) { arrived = next; updateControls(); draw(); schedule(); }
  }
  function tick(timestamp) {
    animationId = 0;
    if (!canAnimate()) { last = 0; return; }
    const delta = last ? Math.min((timestamp - last) / 1000, .05) : 0;
    last = timestamp; stepRunner(state, delta, scale() * 23); updateControls(); draw();
    animationId = requestAnimationFrame(tick);
  }
  function jump() {
    if (arrived) return;
    requestJump(state);
    if (paused) { paused = false; updateControls(); }
    schedule();
  }
  pauseButton.addEventListener('click', () => { paused = !paused; updateControls(); draw(); schedule(); });
  canvas.addEventListener('click', jump);
  document.addEventListener('keydown', event => {
    if (!visible || event.repeat || event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]')) return;
    if (event.target.closest('button,a,input,textarea,select,[contenteditable]')) return;
    if (event.target === canvas && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); jump(); }
  });
  document.addEventListener('visibilitychange', () => { checkWedding(); schedule(); });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', schedule));
  motion.addEventListener('change', event => { if (event.matches) { paused = true; updateControls(); draw(); } });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: .15 }).observe(canvas);
  new ResizeObserver(() => {
    const bounds = canvas.getBoundingClientRect(); width = bounds.width; height = bounds.height;
    const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; draw();
  }).observe(canvas);
  setInterval(checkWedding, 1000);
  updateControls(); draw();
}
