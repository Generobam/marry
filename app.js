import { wedding } from './wedding-config.js';
import { countdownTo, koreaDateParts, calendarCells, createCalendarEvent } from './date-utils.js';
import { startRunner } from './runner.js';
import { startJourney } from './journey.js';
import { startAlbum } from './album.js';
import { album } from './album-config.js';

const $ = selector => document.querySelector(selector);
const fill = (selector, value) => document.querySelectorAll(selector).forEach(node => { node.textContent=value; });
const date = new Date(wedding.date);
const { year, month, day } = koreaDateParts(date);
const numericDate = `${year}. ${String(month).padStart(2,'0')}. ${String(day).padStart(2,'0')}`;
const dateLabel = new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', year:'numeric',month:'long',day:'numeric',weekday:'long',hour:'numeric',minute:'numeric',hour12:true }).format(date).replace(':00','');
fill('[data-groom]',wedding.groom||'신랑');
fill('[data-bride]',wedding.bride||'신부');
fill('[data-numeric-date]',numericDate);
fill('[data-date-label]',dateLabel);
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
$('#calendar-save').addEventListener('click',()=>{
  const blob=new Blob([createCalendarEvent(wedding)],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');
  link.href=url;link.download='our-wedding.ics';document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);toast('일정 파일을 열어 달력에 추가해 주세요.');
});
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
startJourney(wedding.date);
startRunner($('#runner'), wedding.date);
