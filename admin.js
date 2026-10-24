import { participation } from './participation-config.js';
import { configured, request } from './participation-api.js';
const $ = selector => document.querySelector(selector);
let token='';let expiry;let responses=[];const records={guestbook:[],album:[]};let busy=false;let previewUrl;
async function adminRequest(path,options={}) {
  const sessionToken=token;
  if(!sessionToken) throw new Error('관리자 로그인이 필요해요.');
  const result=await request(path,{...options,token:sessionToken});
  if(token!==sessionToken) throw new Error('로그인이 종료되어 요청을 취소했어요.');
  return result;
}
function feedback(message,error=false){$('#admin-feedback').textContent=message;$('#admin-feedback').dataset.state=error?'error':'success';}
function clearSession(){token='';clearTimeout(expiry);responses=[];records.guestbook=[];records.album=[];clearPreview();$('#admin-album-upload').reset();$('#admin-upload-status').textContent='';for(const key of ['rsvps','guestbook','album'])$(`#admin-${key}`).replaceChildren();$('#admin-content').hidden=true;$('#admin-login').hidden=false;$('#admin-summary').textContent='';}
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
    if(kind==='album'){
      const media=document.createElement(item.type==='video'?'video':'img');media.className='admin-photo';media.src=item.src;
      if(item.type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata';}else{media.alt=item.alt;media.loading='lazy';}
      entry.append(media);
      const label=document.createElement('label');label.className='album-caption-editor';label.textContent='사진·영상 설명';
      const input=document.createElement('input');input.value=item.caption;input.maxLength=200;label.append(input);entry.append(label);
      entry.append(button('설명 저장',async()=>{await adminRequest('/admin/album',{method:'PATCH',data:{id:item.id,caption:input.value}});await loadKind('album');feedback('사진첩 설명을 저장했어요.');}));
      const link=document.createElement('a');link.href=item.src;link.target='_blank';link.rel='noopener noreferrer';link.className='text-button';link.textContent='원본 열기';entry.append(link);
    }
    entry.append(button('삭제',async()=>{if(!confirm('이 기록을 영구 삭제할까요?'))return;await adminRequest(`/admin/${kind}`,{method:'DELETE',token,data:{id:item.id}});if(kind==='rsvps'){responses=await allResponses();render('rsvps');summary();}else await loadKind(kind);}));list.append(entry);
  }
}
function summary(){const confirmed=responses.filter(x=>x.attendance==='yes');const counts=side=>confirmed.filter(x=>x.side===side).reduce((a,x)=>[a[0]+x.guests,a[1]+x.meals],[0,0]);const groom=counts('groom'),bride=counts('bride');$('#admin-summary').textContent=`응답 ${responses.length}건 · 확정 참석 ${groom[0]+bride[0]}명 · 식사 ${groom[1]+bride[1]}명\n신랑 측 ${groom[0]}명 / 식사 ${groom[1]}명 · 신부 측 ${bride[0]}명 / 식사 ${bride[1]}명\n미정 ${responses.filter(x=>x.attendance==='maybe').length}건 · 불참 ${responses.filter(x=>x.attendance==='no').length}건`;}
async function loadKind(kind,append=false){const page=await adminRequest(`/admin/${kind}?offset=${append?records[kind].length:0}`,{token});records[kind]=append?[...records[kind],...page.items]:page.items;render(kind);$(`#admin-${kind}-more`).hidden=!page.more;}
async function refresh(){if(busy)return;busy=true;$('#admin-refresh').disabled=true;feedback('기록을 불러오고 있어요…');try{responses=await allResponses();render('rsvps');summary();await loadKind('guestbook');await loadKind('album');feedback('기록을 불러왔어요.');}catch(error){if([401,403].includes(error.status))clearSession();feedback(error.message,true);}finally{busy=false;$('#admin-refresh').disabled=false;}}
$('#admin-refresh').addEventListener('click',refresh);
for(const kind of ['guestbook','album'])$(`#admin-${kind}-more`).addEventListener('click',async event=>{event.target.disabled=true;try{await loadKind(kind,true);}catch(error){feedback(error.message,true);}finally{event.target.disabled=false;}});
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s=`'${s}`;return `"${s.replaceAll('"','""')}"`;}
$('#admin-export').addEventListener('click',async event=>{event.target.disabled=true;try{responses=await allResponses();const rows=[['이름','구분','참석 여부','참석 인원','식사 인원','메모','수정 시간'],...responses.map(x=>[x.name,x.side==='groom'?'신랑 측':'신부 측',{yes:'참석',no:'불참',maybe:'미정'}[x.attendance],x.guests,x.meals,x.note,x.updated_at])];const blob=new Blob(['\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='wedding-attendance.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){feedback(error.message,true);}finally{event.target.disabled=false;}});

function clearPreview(){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=undefined;const area=$('#admin-upload-preview');area.querySelectorAll('video').forEach(video=>video.pause());area.replaceChildren();}
const uploadForm=$('#admin-album-upload');
uploadForm.elements.media.addEventListener('change',()=>{
  clearPreview();const field=uploadForm.elements.media;field.setCustomValidity('');const file=field.files[0];if(!file)return;
  const video=['video/mp4','video/webm'].includes(file.type);
  if(!video && !['image/jpeg','image/png','image/webp'].includes(file.type)){field.setCustomValidity('JPG, PNG, WEBP 사진 또는 MP4, WEBM 영상을 선택해 주세요.');field.reportValidity();return;}
  if(file.size>(video?50:8)*1024*1024){field.setCustomValidity(video?'영상은 50MB 이하로 선택해 주세요.':'사진은 8MB 이하로 선택해 주세요.');field.reportValidity();return;}
  previewUrl=URL.createObjectURL(file);const media=document.createElement(video?'video':'img');media.src=previewUrl;
  if(video){media.controls=true;media.playsInline=true;media.preload='metadata';}else media.alt='게시할 사진 미리보기';$('#admin-upload-preview').append(media);
});
uploadForm.addEventListener('submit',async event=>{
  event.preventDefault();if(uploadForm.dataset.busy==='true')return;
  const button=uploadForm.querySelector('[type=submit]');const status=$('#admin-upload-status');
  uploadForm.dataset.busy='true';button.disabled=true;button.textContent='게시하고 있어요…';status.textContent='';status.dataset.state='success';
  try {
    await adminRequest('/admin/album',{method:'POST',data:new FormData(uploadForm),timeoutMs:120000});
    uploadForm.reset();clearPreview();status.textContent='청첩장 사진첩에 게시했어요. 청첩장을 새로 열면 바로 보여요.';
    await loadKind('album');
  } catch(error){if(token){status.textContent=error.message;status.dataset.state='error';}}
  finally{uploadForm.dataset.busy='false';button.disabled=false;button.textContent='청첩장에 게시하기';}
});
