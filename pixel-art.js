// Original SD sprites, shared by the invitation illustration and the runner.
export function getPalette() {
  const style = getComputedStyle(document.documentElement);
  const names = ['paper', 'paper-2', 'ink', 'muted', 'accent', 'accent-dark', 'line', 'rose', 'peach', 'sky', 'cloud', 'hill-back', 'hill-front', 'grass', 'ground', 'soil', 'flower', 'white', 'skin', 'hair', 'suit', 'suit-dark', 'blush', 'veil', 'gold'];
  return Object.fromEntries(names.map(name => [name, style.getPropertyValue(`--color-${name}`).trim()]));
}

export function characterPixels(bride = false, frame = 0) {
  const pixels = [];
  const r = (x, y, w, h, color) => pixels.push({ x, y, w, h, color });
  if (bride) {
    r(2, 2, 13, 15, 'veil'); r(1, 5, 15, 13, 'white');
    r(3, 3, 11, 10, 'hair'); r(4, 1, 9, 3, 'hair');
  } else { r(3, 2, 11, 9, 'hair'); r(5, 1, 7, 2, 'hair'); }
  r(4, 5, 9, 7, 'skin'); r(3, 7, 1, 3, 'skin'); r(13, 7, 1, 3, 'skin');
  r(4, 4, 4, 2, 'hair'); r(8, 3, 5, 2, 'hair');
  r(6, 7, 1, 2, 'hair'); r(11, 7, 1, 2, 'hair');
  r(5, 10, 2, 1, 'blush'); r(11, 10, 2, 1, 'blush'); r(9, 10, 1, 1, 'hair');
  r(7, 12, 4, 2, 'skin');
  if (bride) {
    r(3, 3, 12, 1, 'white'); r(5, 2, 2, 3, 'flower'); r(9, 2, 2, 3, 'flower'); r(7, 3, 2, 1, 'grass');
    r(5, 14, 8, 4, 'white'); r(4, 17, 10, 3, 'white'); r(2, 20, 14, 2, 'white');
    r(3, 19, 2, 2, 'veil'); r(6, 17, 1, 4, 'veil'); r(12, 19, 2, 2, 'veil');
    r(3, 14, 2, 4, 'skin'); r(13, 14, 2, 3, 'skin');
    r(5 + frame, 22, 3, 1, 'skin'); r(11 - frame, 22, 3, 1, 'skin');
    r(4 + frame, 23, 4, 1, 'white'); r(11 - frame, 23, 4, 1, 'white');
    r(13, 16, 1, 5, 'grass'); r(11, 15, 5, 3, 'flower'); r(12, 14, 3, 1, 'peach'); r(13, 16, 1, 1, 'white');
  } else {
    r(4, 14, 10, 7, 'suit'); r(7, 14, 4, 6, 'white');
    r(8, 14, 1, 1, 'rose'); r(10, 14, 1, 1, 'rose'); r(9, 15, 1, 2, 'suit-dark');
    r(3, 15, 2, 4, 'suit'); r(14, 15, 2, 4, 'suit');
    r(3 + frame, 19, 2, 2, 'skin'); r(14 - frame, 19, 2, 2, 'skin');
    r(5, 21, 3, 2, 'suit-dark'); r(11, 21, 3, 2, 'suit-dark');
    r(4 + frame, 23, 4, 1, 'hair'); r(11 - frame, 23, 4, 1, 'hair');
    r(12, 15, 1, 2, 'flower');
  }
  return pixels;
}

export function drawCharacter(ctx, palette, x, floor, scale, bride, frame = 0, lift = 0) {
  for (const pixel of characterPixels(bride, frame)) {
    ctx.fillStyle = palette[pixel.color];
    ctx.fillRect(Math.round(x + pixel.x * scale), Math.round(floor - 24 * scale + pixel.y * scale - lift), pixel.w * scale, pixel.h * scale);
  }
}

export function drawHeart(ctx, palette, x, y, scale = 2) {
  ctx.fillStyle = palette.rose;
  [[1,0,2,1],[4,0,2,1],[0,1,7,2],[1,3,5,1],[2,4,3,1],[3,5,1,1]].forEach(([a,b,w,h]) => ctx.fillRect(x+a*scale,y+b*scale,w*scale,h*scale));
}

export function renderPortrait(svg, p) {
  const rect = (x,y,w,h,color) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p[color]}"/>`;
  const flower = (x,y,color='flower') => rect(x+3,y+6,2,12,'grass') + rect(x,y+10,4,2,'grass') + rect(x+1,y,6,8,color) + rect(x-1,y+2,10,4,color) + rect(x+3,y+3,2,2,'gold');
  let scene = `<path d="M0 219Q62 170 139 214T320 199V300H0Z" fill="${p['hill-back']}"/><path d="M0 249Q90 204 190 246T320 231V300H0Z" fill="${p['hill-front']}"/>`;
  scene += rect(36,69,42,8,'cloud') + rect(44,61,22,8,'cloud') + rect(242,91,44,8,'cloud') + rect(249,84,25,7,'cloud');
  scene += `<path d="M91 231V126Q91 65 160 65Q229 65 229 126V231" fill="none" stroke="${p.ground}" stroke-width="6"/><path d="M100 231V128Q100 75 160 75Q220 75 220 128V231" fill="none" stroke="${p.grass}" stroke-width="2"/>`;
  [[92,110],[101,88],[117,73],[142,65],[167,65],[194,75],[216,96],[226,122]].forEach(([x,y],i)=>{scene+=flower(x,y,i%2?'white':'flower');});
  scene += rect(82,222,24,16,'ground') + rect(213,222,24,16,'ground');
  scene += `<ellipse cx="162" cy="246" rx="66" ry="7" fill="${p.grass}" opacity=".25"/>`;
  for (const [x,bride] of [[111,false],[162,true]]) {
    scene += characterPixels(bride).map(r=>rect(x+r.x*2.7,177+r.y*2.7,r.w*2.7,r.h*2.7,r.color)).join('');
  }
  scene += `<path d="M154 146h5v-4h6v4h5v7h-4v4h-4v4h-4v-4h-4z" fill="${p.rose}"/>`;
  [[26,240],[48,266],[276,247],[249,278],[72,228],[294,274]].forEach(([x,y],i)=>{scene+=flower(x,y,i%2?'white':'flower');});
  scene += rect(27,147,2,10,'gold')+rect(23,151,10,2,'gold')+rect(280,171,2,10,'gold')+rect(276,175,10,2,'gold');
  svg.innerHTML = scene;
}
