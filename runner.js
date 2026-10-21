import { getPalette, drawCharacter, drawHeart } from './pixel-art.js';

export const COURSE_LENGTH = 2240;
export const OBSTACLES = [{ x: 350, type: 'rock' }, { x: 720, type: 'puddle' }, { x: 1080, type: 'flowers' }, { x: 1480, type: 'rock' }, { x: 1850, type: 'puddle' }];

export function obstacleJump(position) {
  let lift = 0;
  for (const obstacle of OBSTACLES) {
    const distance = obstacle.x - position;
    if (distance < 105 && distance > -70) lift = Math.max(lift, Math.sin((105 - distance) / 175 * Math.PI) * 82);
  }
  return lift;
}

export function startRunner(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const p = getPalette();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pauseButton = document.querySelector('#pause-game');
  const jumpButton = document.querySelector('#jump-game');
  const status = document.querySelector('#game-status');
  const stage = document.querySelector('#game-stage');
  const progressLabel = document.querySelector('#game-progress');
  const autoLabel = document.querySelector('#auto-label');
  let paused = motion.matches;
  let visible = false;
  let width = 960; let height = 300;
  let progress = 0; let elapsed = 0; let finishTime = null;
  let manualJumpAt = -100; let last = 0; let animationId = 0;
  const rect = (x,y,w,h,color) => { ctx.fillStyle = p[color]; ctx.fillRect(Math.round(x),Math.round(y),w,h); };

  function updateControls() {
    pauseButton.textContent = paused ? '▷' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', paused ? '애니메이션 재생' : '애니메이션 일시정지');
    pauseButton.setAttribute('aria-pressed', String(paused));
    autoLabel.textContent = paused ? 'PAUSED' : 'AUTO PLAY';
    if (finishTime === null) status.textContent = paused ? '잠시 쉬어가요. 재생을 누르면 출발해요.' : '손을 꼭 잡고 식장으로 가는 중!';
  }

  function cloud(x,y,size=1) {
    rect(x,y,48*size,10*size,'cloud'); rect(x+9*size,y-9*size,28*size,9*size,'cloud');
  }
  function flower(x,y,color='flower') {
    rect(x+3,y+4,2,10,'grass'); rect(x,y+8,3,2,'grass');
    rect(x+1,y,6,6,color); rect(x-1,y+2,10,2,color); rect(x+3,y+2,2,2,'gold');
  }
  function hill(x,y,w,h,color) {
    ctx.fillStyle=p[color]; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+w/2,y-h,x+w,y); ctx.closePath(); ctx.fill();
  }
  function chapel(x,floor) {
    rect(x+14,floor-100,92,100,'white'); rect(x+25,floor-112,70,12,'peach');
    rect(x+37,floor-124,46,12,'peach'); rect(x+49,floor-137,22,13,'rose');
    rect(x+56,floor-153,6,20,'gold'); rect(x+50,floor-148,18,5,'gold');
    rect(x+48,floor-39,26,39,'ground'); rect(x+53,floor-45,16,6,'ground');
    rect(x+28,floor-76,14,23,'sky'); rect(x+79,floor-76,14,23,'sky');
    rect(x+34,floor-76,2,23,'ground'); rect(x+85,floor-76,2,23,'ground');
    rect(x+28,floor-66,14,2,'ground'); rect(x+79,floor-66,14,2,'ground');
    flower(x+6,floor-14); flower(x+107,floor-14);
    ctx.fillStyle=p.accent; ctx.font='10px monospace'; ctx.textAlign='center'; ctx.fillText('JUST MARRIED',x+60,floor-166);
  }

  function draw() {
    ctx.clearRect(0,0,width,height);
    rect(0,0,width,height,'sky');
    const floor = height-35;
    const scale = width < 600 ? 2 : 2.7;
    const runnerX = Math.max(74,width*.23);
    const spacing = scale*23;
    for (let i=-1;i<width/170+2;i++) {
      const x=i*170-(progress*.12%170);
      cloud(x+25,40+(Math.abs(i)%3)*20,.85);
      hill(x-50,floor,300,140,'hill-back');
    }
    for (let i=-1;i<width/210+2;i++) hill(i*210-(progress*.27%210)-50,floor,280,85,'hill-front');
    rect(0,floor,width,7,'grass'); rect(0,floor+7,width,28,'ground');
    for (let x=-progress%30;x<width;x+=30) { rect(x,floor+7,14,3,'soil'); rect(x+8,floor+20,4,3,'soil'); }
    for (let i=-1;i<width/82+2;i++) flower(i*82-(progress*.7%82),floor-14,i%2?'white':'flower');
    for (const obstacle of OBSTACLES) {
      const x=obstacle.x-progress+runnerX;
      if (x < -70 || x > width+70) continue;
      if (obstacle.type==='puddle') {
        rect(x-12,floor,46,5,'suit'); rect(x-6,floor+1,30,2,'sky');
      } else if (obstacle.type==='rock') {
        rect(x-7,floor-12,28,12,'muted'); rect(x-1,floor-20,15,8,'muted'); rect(x+1,floor-18,7,4,'line');
      } else { rect(x-8,floor-15,28,15,'ground'); flower(x-6,floor-30); flower(x+6,floor-25,'white'); }
    }
    const chapelX = COURSE_LENGTH-progress+runnerX+47;
    chapel(chapelX,floor);
    const walking = !paused && finishTime===null;
    const frame = walking ? (Math.floor(elapsed*9)%2)*2-1 : 0;
    const manualPhase=(elapsed-manualJumpAt)/.95;
    const manualLift=manualPhase>=0&&manualPhase<=1?Math.sin(manualPhase*Math.PI)*88:0;
    const liftGroom=Math.max(obstacleJump(progress),manualLift);
    const liftBride=Math.max(obstacleJump(progress-spacing),manualLift);
    // Shadows stay on the ground so the jumps have a clear sense of height.
    ctx.fillStyle=p.grass; ctx.globalAlpha=.3;
    [runnerX,runnerX-spacing].forEach(x=>{ctx.beginPath();ctx.ellipse(x+scale*8,floor+1,scale*8,3,0,0,Math.PI*2);ctx.fill();});
    ctx.globalAlpha=1;
    drawCharacter(ctx,p,runnerX-spacing,floor,scale,true,-frame,liftBride);
    drawCharacter(ctx,p,runnerX,floor,scale,false,frame,liftGroom);
    if (manualLift > 10) drawHeart(ctx,p,runnerX-spacing/3,floor-24*scale-manualLift-20,1.5);
    if (finishTime!==null) {
      for(let i=0;i<5;i++) {
        const drift=((elapsed-finishTime)*22+i*17)%85;
        ctx.globalAlpha=1-drift/110;
        drawHeart(ctx,p,runnerX-40+i*23,floor-78-drift,i%2?1.5:2);
      }
      ctx.globalAlpha=1;
    }
  }

  function canAnimate() { return !paused && visible && !document.hidden; }
  function schedule() {
    if (canAnimate() && !animationId) { last=0; animationId=requestAnimationFrame(tick); }
  }
  function tick(timestamp) {
    animationId=0;
    if (!canAnimate()) { last=0; return; }
    const delta=last?Math.min((timestamp-last)/1000,.05):0;
    last=timestamp; elapsed+=delta;
    if (finishTime===null) {
      progress=Math.min(COURSE_LENGTH,progress+delta*78);
      progressLabel.textContent=`${Math.floor(progress/COURSE_LENGTH*100)}%`;
      if (progress>=COURSE_LENGTH) {
        finishTime=elapsed;
        stage.textContent='HAPPILY EVER AFTER';
        status.textContent='식장 도착! 이제 우리의 다음 모험으로.';
        jumpButton.innerHTML='<span aria-hidden="true">↻</span> 다시 달리기';
      }
    } else if (elapsed-finishTime>5) reset();
    draw();
    animationId=requestAnimationFrame(tick);
  }
  function reset() {
    progress=0; finishTime=null; manualJumpAt=-100;
    stage.textContent='ON OUR WAY'; progressLabel.textContent='0%';
    jumpButton.innerHTML='<span aria-hidden="true">↑</span> 함께 점프';
    updateControls(); draw();
  }
  function jump() {
    if (finishTime!==null) reset();
    if(paused) { paused=false; updateControls(); }
    if(elapsed-manualJumpAt>=.95) manualJumpAt=elapsed;
    schedule();
  }
  pauseButton.addEventListener('click',()=>{ paused=!paused; updateControls(); if(paused) draw(); schedule(); });
  jumpButton.addEventListener('click',jump);
  canvas.addEventListener('click',jump);
  document.addEventListener('keydown',event=>{
    if (event.code!=='Space'||event.repeat||!visible||event.altKey||event.ctrlKey||event.metaKey) return;
    if (event.target.closest('button,a,input,textarea,select,[contenteditable],dialog')) return;
    event.preventDefault(); jump();
  });
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',event=>{ if(event.matches) {paused=true;updateControls();draw();} });
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15});
  observer.observe(canvas);
  new ResizeObserver(()=>{
    const bounds=canvas.getBoundingClientRect();width=bounds.width;height=bounds.height;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;draw();
  }).observe(canvas);
  updateControls(); draw();
}
