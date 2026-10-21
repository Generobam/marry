import { weddingJourney, countdownTo } from './date-utils.js';
import { characterPixels, getPalette } from './pixel-art.js';

export function startJourney(target) {
  const map = document.querySelector('#journey-map');
  const marker = document.querySelector('#journey-couple');
  const route = document.querySelector('#journey-covered');
  const p = getPalette();
  marker.innerHTML = [true, false].map((bride, i) =>
    `<g transform="translate(${i * 18 - 16}, -27)">${characterPixels(bride).map(r =>
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${p[r.color]}"/>`).join('')}</g>`).join('');

  function update() {
    const journey = weddingJourney(target);
    const left = countdownTo(target);
    const label = journey.arrived ? '오늘부터, 부부' : journey.days === 0 ? '오늘, 우리의 시작' : `우리의 시작까지 D-${journey.days}`;
    document.querySelector('#journey-title').textContent = label;
    document.querySelector('#journey-time').textContent = journey.arrived ? '함께해 주셔서 감사합니다' :
      `${left.days}일 ${String(left.hours).padStart(2, '0')}시간 ${String(left.minutes).padStart(2, '0')}분 ${String(left.seconds).padStart(2, '0')}초`;
    const x = 34 + journey.ratio * 532;
    marker.setAttribute('transform', `translate(${x}, 61)`);
    route.setAttribute('x2', String(x));
    map.setAttribute('aria-label', `예식 1년 전부터 결혼식까지의 시간 지도. ${label}.`);
    document.querySelector('#journey-today').textContent = journey.arrived ? '도착' : '지금 우리';
    document.querySelector('#journey-today').setAttribute('x', String(Math.max(65, Math.min(535, x))));
  }
  update();
  setInterval(() => { if (!document.hidden) update(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
}
