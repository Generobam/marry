import { participation } from './participation-config.js';
import { configured, request } from './participation-api.js';
const $ = selector => document.querySelector(selector);
let token='';let expiry;let responses=[];const records={guestbook:[],photos:[]};let busy=false;
async function adminRequest(path,options={}) {
  const sessionToken=token;
  if(!sessionToken) throw new Error('관리자 로그인이 필요해요.');
  const result=await request(path,{...options,token:sessionToken});
  if(token!==sessionToken) throw new Error('로그인이 종료되어 요청을 취소했어요.');
  return result;
}
function feedback(message,error=false){$('#admin-feedback').textContent=message;$('#admin-feedback').dataset.state=error?'error':'success';}
function clearSession(){token='';clearTimeout(expiry);responses=[];records.guestbook=[];records.photos=[];for(const key of ['rsvps','guestbook','photos'])$(`#admin-${key}`).replaceChildren();$('#admin-content').hidden=true;$('#admin-login').hidden=false;$('#admin-summary').textContent='';}
if(!configured || !participation.supabaseUrl || !participation.publishableKey){$('#admin-login button').disabled=true;feedback('저장 서비스 연결 후 관리자 계정으로 로그인할 수 있어요.');}
$('#admin-login').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;feedback('로그인하고 있어요…');
  try {
    const response=await fetch(`${participation.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:participation.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value,password:form.elements.password.value})});
    const data=await response.json();if(!response.ok)throw new Error('이메일과 비밀번호를 확인해 주세요.');token=data.access_token;form.elements.password.value='';
    await adminRequest('/admin/rsvps',{token});
    expiry=setTimeout(()=>{clearSession();feedback('로그인이 만료됐어요. 다시 로그인해 주세요.',true);},Math.max(0,(data.expires_in-30)*1000));
    $('#admin-login').hidden=true;$('#admin-content').hidden=false;await refresh();
  } catch(error){clearSession();feedback(error.message,true);}finally{button.disabled=false;}
});
$('#admin-logout').addEventListener('click',()=>{const old=token;clearSession();feedback('로그아웃했어요.');fetch(`${participation.supabaseUrl}/auth/v1/logout`,{method:'POST',headers:{apikey:participation.publishableKey,Authorization:`Bearer ${old}`}}).catch(()=>{});});
async function allResponses(){let items=[];let more=true;while(more){const page=await adminRequest(`/admin/rsvps?offset=${items.length}`,{token});items.push(...page.items);more=page.more;}return items;}
function button(label,action){const node=document.createElement('button');node.type='button';node.className='text-button';node.textContent=label;node.addEventListener('click',async()=>{node.disabled=true;try{await action();}catch(error){feedback(error.message,true);}finally{node.disabled=false;}});return node;}
function paragraph(value){const node=document.createElement('p');node.textContent=value;return node;}
function render(kind) {
  const list=$(`#admin-${kind}`);list.replaceChildren();const items=kind==='rsvps'?responses:records[kind];
  if(!items.length){list.append(paragraph('아직 전달받은 내용이 없어요.'));return;}
  for(const item of items){
    const entry=document.createElement('article');entry.className='admin-entry';
    if(kind==='rsvps')entry.append(paragraph(`${item.name} · ${item.side==='groom'?'신랑 측':'신부 측'} · ${{yes:'참석',no:'불참',maybe:'미정'}[item.attendance]} · 참석 ${item.guests}명 / 식사 ${item.meals}명`),paragraph(item.note));
    if(kind==='guestbook'){
      entry.append(paragraph(`${item.name} → ${{couple:'두 사람',groom:'지성',bride:'지연'}[item.recipient]} · ${item.status==='visible'?'공개':'숨김'}`),paragraph(item.message));
      entry.append(button(item.status==='visible'?'숨기기':'공개하기',async()=>{await adminRequest('/admin/guestbook',{method:'PATCH',token,data:{id:item.id,status:item.status==='visible'?'hidden':'visible'}});await loadKind('guestbook');}));
    }
    if(kind==='photos'){
      entry.append(paragraph(`${item.name} · ${item.caption}`));const img=document.createElement('img');img.className='admin-photo';img.src=item.url;img.alt=item.caption||`${item.name}님의 사진`;img.loading='lazy';entry.append(img);
      const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.className='text-button';link.textContent='원본 사진 열기 / 저장';entry.append(link);
    }
    entry.append(button('삭제',async()=>{if(!confirm('이 기록을 영구 삭제할까요?'))return;await adminRequest(`/admin/${kind}`,{method:'DELETE',token,data:{id:item.id}});if(kind==='rsvps'){responses=await allResponses();render('rsvps');summary();}else await loadKind(kind);}));list.append(entry);
  }
}
function summary(){const confirmed=responses.filter(x=>x.attendance==='yes');const counts=side=>confirmed.filter(x=>x.side===side).reduce((a,x)=>[a[0]+x.guests,a[1]+x.meals],[0,0]);const groom=counts('groom'),bride=counts('bride');$('#admin-summary').textContent=`응답 ${responses.length}건 · 확정 참석 ${groom[0]+bride[0]}명 · 식사 ${groom[1]+bride[1]}명\n신랑 측 ${groom[0]}명 / 식사 ${groom[1]}명 · 신부 측 ${bride[0]}명 / 식사 ${bride[1]}명\n미정 ${responses.filter(x=>x.attendance==='maybe').length}건 · 불참 ${responses.filter(x=>x.attendance==='no').length}건`;}
async function loadKind(kind,append=false){const page=await adminRequest(`/admin/${kind}?offset=${append?records[kind].length:0}`,{token});records[kind]=append?[...records[kind],...page.items]:page.items;render(kind);$(`#admin-${kind}-more`).hidden=!page.more;}
async function refresh(){if(busy)return;busy=true;$('#admin-refresh').disabled=true;feedback('기록을 불러오고 있어요…');try{responses=await allResponses();render('rsvps');summary();await loadKind('guestbook');await loadKind('photos');feedback('기록을 불러왔어요.');}catch(error){if([401,403].includes(error.status))clearSession();feedback(error.message,true);}finally{busy=false;$('#admin-refresh').disabled=false;}}
$('#admin-refresh').addEventListener('click',refresh);
for(const kind of ['guestbook','photos'])$(`#admin-${kind}-more`).addEventListener('click',async event=>{event.target.disabled=true;try{await loadKind(kind,true);}catch(error){feedback(error.message,true);}finally{event.target.disabled=false;}});
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s=`'${s}`;return `"${s.replaceAll('"','""')}"`;}
$('#admin-export').addEventListener('click',async event=>{event.target.disabled=true;try{responses=await allResponses();const rows=[['이름','구분','참석 여부','참석 인원','식사 인원','메모','수정 시간'],...responses.map(x=>[x.name,x.side==='groom'?'신랑 측':'신부 측',{yes:'참석',no:'불참',maybe:'미정'}[x.attendance],x.guests,x.meals,x.note,x.updated_at])];const blob=new Blob(['\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='wedding-attendance.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){feedback(error.message,true);}finally{event.target.disabled=false;}});
