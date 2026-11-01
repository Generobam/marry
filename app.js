import { wedding } from './wedding-config.js';
import { countdownTo, koreaDateParts, calendarCells } from './date-utils.js';
import { startRunner } from './runner.js';
import { startJourney } from './journey.js';
import { startAlbum } from './album.js';
import { album } from './album-config.js';
import { startParticipation } from './participation.js';

const $ = selector => document.querySelector(selector);
const fill = (selector, value) => document.querySelectorAll(selector).forEach(node => { node.textContent=value; });
const date = new Date(wedding.date);
const { year, month, day } = koreaDateParts(date);
const numericDate = `${year}. ${String(month).padStart(2,'0')}. ${String(day).padStart(2,'0')}`;
const timeLabel = new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit',hour12:true }).format(date);
const dateLabel = `${new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'long' }).format(date)} ${timeLabel}`;
fill('[data-groom]',wedding.groom||'신랑');
fill('[data-bride]',wedding.bride||'신부');
fill('[data-numeric-date]',numericDate);
fill('[data-date-label]',dateLabel);
fill('[data-time-label]',timeLabel);
document.querySelector('time').dateTime=wedding.date;
document.title=`${wedding.groom||'신랑'} ♥ ${wedding.bride||'신부'} · ${numericDate}`;
document.querySelector('meta[property="og:title"]').content=`${wedding.groom||'신랑'} ♥ ${wedding.bride||'신부'} · 결혼합니다`;
document.querySelector('meta[property="og:description"]').content=`${dateLabel} · ${wedding.venue||'우리의 첫 번째 모험에 초대합니다.'}`;
$('.header-date').firstChild.textContent=`${String(year).slice(-2)}. ${String(month).padStart(2,'0')}. ${String(day).padStart(2,'0')} `;

if(wedding.venue) {
  fill('[data-venue-short]',[wedding.venue,wedding.hall].filter(Boolean).join(' · '));
  $('#venue-name').textContent=wedding.venue;
  $('#venue-address').textContent=wedding.address||'자세한 주소는 곧 안내드릴게요.';
}
if(wedding.hall) {$('#venue-hall').hidden=false;$('#venue-hall').textContent=wedding.hall;}
if(wedding.transport) {$('#venue-transport').hidden=false;$('#venue-transport').textContent=wedding.transport;}
if(wedding.address) {
  $('#venue-address').textContent=wedding.address;
  $('#location-actions').hidden=false;
}
if(wedding.mapUrl||wedding.address) {
  const mapUrl=wedding.mapUrl||`https://map.naver.com/p/search/${encodeURIComponent(`${wedding.venue} ${wedding.address}`.trim())}`;
  try {
    const url=new URL(mapUrl);
    if(['https:','http:'].includes(url.protocol)) {$('#map-link').href=url.href;$('#location-actions').hidden=false;}
    else $('#map-link').hidden=true;
  } catch {$('#map-link').hidden=true;}
}
$('#copy-address').hidden=!wedding.address;
const placeQuery = encodeURIComponent(`${wedding.venue} ${wedding.address}`.trim());
$('#venue-map').src = `https://www.google.com/maps?q=${placeQuery}&output=embed&hl=ko&z=16`;
$('#kakao-map-link').href = `https://map.kakao.com/link/search/${placeQuery}`;
for (const item of wedding.travelGuide || []) {
  const article = document.createElement('article');
  const title = document.createElement('h3'); title.textContent = item.title;
  article.append(title);
  for (const line of item.lines) { const p = document.createElement('p'); p.textContent = line; article.append(p); }
  $('#travel-guide').append(article);
}

$('#calendar-month').textContent=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',month:'long'}).format(date);
$('#calendar-year').textContent=String(year);
$('.calendar').setAttribute('aria-label',`${year}년 ${month}월 예식일 달력`);
const cells=calendarCells(year,month);
for(let i=0;i<cells.length;i+=7) {
  const row=document.createElement('tr');
  cells.slice(i,i+7).forEach(value=>{
    const cell=document.createElement('td');
    if(value!==null) {
      const label=document.createElement('span');label.textContent=value;cell.append(label);
      if(value===day) {cell.className='wedding-date';cell.setAttribute('aria-label',`${month}월 ${day}일 결혼식`);}
    }
    row.append(cell);
  });
  $('#calendar-body').append(row);
}

function updateCountdown() {
  const left=countdownTo(wedding.date);
  ['days','hours','minutes','seconds'].forEach(key=>{$(`#${key}`).textContent=String(left[key]).padStart(2,'0');});
  if(left.arrived) {
    $('#countdown-caption').textContent='우리, 드디어 부부가 되었어요';
    $('.countdown-note').textContent='함께해 주시는 모든 마음에 감사드립니다 ♥';
  }
}
updateCountdown();
setInterval(()=>{if(!document.hidden) updateCountdown();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCountdown();});

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;
  toastTimer=setTimeout(()=>{$('#toast').hidden=true;},3200);
}
async function copyText(text,success) {
  try {await navigator.clipboard.writeText(text);toast(success);}
  catch {$('#share-url').value=text;$('#share-dialog').showModal();$('#share-url').focus();$('#share-url').select();}
}
const calendarStamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const googleCalendar = new URL('https://calendar.google.com/calendar/render');
googleCalendar.search = new URLSearchParams({
  action: 'TEMPLATE', text: `${wedding.groom} ♥ ${wedding.bride} 결혼식`,
  dates: `${calendarStamp(date)}/${calendarStamp(date.getTime() + 3600000)}`,
  ctz: 'Asia/Seoul', location: [wedding.venue, wedding.hall, wedding.address].filter(Boolean).join(' '),
  details: '함께하는 첫 번째 모험에 초대합니다. https://generobam.github.io/marry/',
}).toString();
$('#calendar-google').href = googleCalendar.href;
$('#copy-address').addEventListener('click',()=>copyText(wedding.address,'예식장 주소를 복사했어요.'));
$('#share-invitation').addEventListener('click',async()=>{
  const url=new URL(location.href);url.hash='';
  if(navigator.share) {
    try {await navigator.share({title:document.title,text:`${dateLabel}, 저희 결혼식에 초대합니다.`,url:url.href});return;}
    catch(error) {if(error.name==='AbortError')return;}
  }
  await copyText(url.href,'청첩장 링크를 복사했어요.');
});
$('#share-dialog').addEventListener('click',event=>{if(event.target===$('#share-dialog'))$('#share-dialog').close();});
startAlbum(album);
startParticipation(wedding);
startJourney(wedding.date);
startRunner($('#runner'), wedding.date);

// Scroll-linked motion uses native scrolling, including mobile Safari.
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
for (const block of document.querySelectorAll('.hero-copy h1, .hero-description, .letter h2, .letter > p:not(.eyebrow)')) {
  const lines = []; let line = document.createElement('span');
  line.className = 'story-line';
  for (const node of [...block.childNodes]) {
    if (node.nodeName === 'BR') { lines.push(line); line = document.createElement('span'); line.className = 'story-line'; }
    else line.append(node);
  }
  lines.push(line); block.replaceChildren(...lines);
}
const motionNodes = [...document.querySelectorAll('.story-line, .hero-copy > .eyebrow, .couple-names, .hero-date, .letter > .eyebrow, .letter-sign, .album-heading, .day-intro, .calendar-wrap, .countdown-wrap, .location-layout > *, .attendance-section > *, .game-heading, .journey-panel, #guestbook, .footer')];
const photoStory = document.querySelector('.photo-story');
const portrait = document.querySelector('.hero-photo');
const bowPhoto = document.querySelector('.bow-photo');
let bowReady = false;
bowPhoto.decode().then(() => { bowReady = true; queueScrollStory(); }).catch(() => {});
const clamp = value => Math.max(0, Math.min(1, value));
let motionFrame = 0;
function paintScrollStory() {
  motionFrame = 0;
  if (document.hidden || document.querySelector('dialog[open]')) return;
  const reduced = motionPreference.matches;
  document.documentElement.classList.toggle('scroll-story-active', !reduced);
  const height = window.innerHeight;
  // Read layout before writes. Individual translate does not affect normal flow.
  const positions = motionNodes.map(node => node.getBoundingClientRect().top - (Number(node.dataset.motionShift) || 0));
  const photoRect = photoStory.getBoundingClientRect();
  motionNodes.forEach((node, index) => {
    const progress = reduced || node.contains(document.activeElement) ? 1 : clamp((height * .94 - positions[index]) / (height * .28));
    const eased = 1 - Math.pow(1 - progress, 3);
    const shift = (1 - eased) * 48;
    node.dataset.motionShift = String(shift);
    node.style.opacity = String(.12 + .88 * eased);
    node.style.translate = `0 ${shift}px`;
  });
  const travel = Math.max(1, photoStory.offsetHeight - portrait.offsetHeight - 32);
  const progress = clamp((32 - photoRect.top) / travel);
  portrait.style.transform = reduced ? 'none' : `scale(${.82 + .18 * progress})`;
  portrait.style.borderRadius = reduced ? '' : `${24 * (1 - progress)}px`;
  const bow = clamp((progress - .28) / .38);
  portrait.style.setProperty('--bow-progress', reduced || !bowReady ? '0' : String(bow * bow * (3 - 2 * bow)));
  portrait.style.setProperty('--thanks-progress', String(reduced ? 1 : clamp((progress - .6) / .25)));
}
function queueScrollStory() {
  if (!motionFrame) motionFrame = requestAnimationFrame(paintScrollStory);
}
window.addEventListener('scroll', queueScrollStory, { passive: true });
window.addEventListener('resize', queueScrollStory, { passive: true });
motionPreference.addEventListener('change', queueScrollStory);
document.addEventListener('focusin', queueScrollStory);
document.addEventListener('visibilitychange', queueScrollStory);
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', queueScrollStory));
document.fonts.ready.then(queueScrollStory);
queueScrollStory();
