import { configured, request, copyValue } from './participation-api.js';
const $ = selector => document.querySelector(selector);
const recipientLabels = {couple:'두 사람에게',groom:'지성에게',bride:'지연에게'};
const honeypot = '<label class="form-trap" aria-hidden="true">홈페이지<input name="website" tabindex="-1" autocomplete="off"></label>';
const nameField = '<label>보내는 분<input name="name" autocomplete="name" maxlength="30" required placeholder="성함을 적어 주세요"></label>';
const passwordField = '<label>확인 비밀번호<input type="password" name="password" minlength="8" maxlength="80" autocomplete="new-password" required placeholder="8자 이상 입력해 주세요"></label>';
const notice = '<p class="connection-note" data-connection-note hidden>지금은 접수를 준비하고 있어요. 아직 전송되지 않습니다.</p>';
function dialogMarkup(id,title,content,submit) {
  return `<dialog id="${id}" class="participation-dialog" aria-labelledby="${id}-title"><header class="participation-dialog-header"><h2 id="${id}-title">${title}</h2><button type="button" class="dialog-close icon-button" data-close aria-label="닫기">×</button></header>${notice}<form>${content}${honeypot}<p class="form-feedback" role="status"></p><button class="button form-submit" type="submit">${submit}</button></form></dialog>`;
}
export function startParticipation(wedding) {
  document.body.insertAdjacentHTML('beforeend',
    dialogMarkup('guestbook-dialog','축하의 말 남기기', `${nameField}<fieldset class="choice-group"><legend>누구에게 전할까요?</legend><label><input type="radio" name="recipient" value="couple" checked> 두 사람에게</label><label><input type="radio" name="recipient" value="groom"> 지성에게</label><label><input type="radio" name="recipient" value="bride"> 지연에게</label></fieldset><label>축하 메시지<textarea name="message" rows="4" maxlength="500" required placeholder="따뜻한 한마디를 남겨 주세요"></textarea></label>${passwordField}<p class="field-help">글을 삭제할 때 필요해요. 비밀번호는 기억해 주세요.</p><label class="check-label"><input type="checkbox" name="consent" required> 이름과 메시지가 청첩장 방문자에게 공개되는 것을 확인했어요.</label>`, '마음 남기기') +
    dialogMarkup('rsvp-dialog','참석 여부 전달하기', `${nameField}<fieldset class="choice-group"><legend>어느 쪽 하객이신가요?</legend><label><input type="radio" name="side" value="groom" checked> 신랑 측</label><label><input type="radio" name="side" value="bride"> 신부 측</label></fieldset><label>참석 여부<select name="attendance"><option value="yes">참석해요</option><option value="no">마음으로 축하할게요</option><option value="maybe">아직 정하지 못했어요</option></select></label><div id="rsvp-counts" class="form-row"><label>본인 포함 참석 인원<input name="guests" type="number" min="1" max="10" value="1" required></label><label>식사 인원<input name="meals" type="number" min="0" max="10" value="1" required></label></div><label>전할 말 <span class="field-help">선택</span><textarea name="note" rows="2" maxlength="300" placeholder="준비에 참고할 내용이 있다면 알려 주세요"></textarea></label>${passwordField}<details class="edit-response"><summary>이미 전달한 응답을 수정할래요</summary><label>응답번호<input name="id" maxlength="36" placeholder="접수 후 받은 응답번호"></label><p class="field-help">이전 응답번호와 비밀번호를 입력하고 변경할 내용을 보내 주세요.</p></details><label class="check-label"><input type="checkbox" name="consent" required> 예식 준비를 위해 이름·참석 인원·메모를 두 사람에게 전달하는 데 동의해요.</label>`, '참석 여부 보내기') +
    dialogMarkup('delete-message-dialog','남긴 글 삭제하기', `<input type="hidden" name="id">${passwordField}<p class="field-help">글을 남길 때 입력한 비밀번호로 삭제할 수 있어요.</p>`, '글 삭제하기')
  );
  let opener; let savedScroll=0;
  const dialogs=[...document.querySelectorAll('.participation-dialog')];
  function open(dialog,button) {opener=button;savedScroll=scrollY;document.body.style.setProperty('--participation-scroll-top',`${-savedScroll}px`);document.body.classList.add('participation-open');dialog.showModal();dialog.querySelector('[data-close]').focus({preventScroll:true});}
  document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>open($(`#${button.dataset.open}`),button)));
  for(const dialog of dialogs) {
    dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    dialog.addEventListener('close',()=>{document.body.classList.remove('participation-open');document.body.style.removeProperty('--participation-scroll-top');window.scrollTo({top:savedScroll,behavior:'instant'});opener?.focus({preventScroll:true});});
    dialog.querySelector('[data-connection-note]').hidden=configured;
    dialog.querySelector('[type=submit]').disabled=!configured;
  }
  function feedback(form,message,error=false) {const node=form.querySelector('.form-feedback');node.textContent=message;node.dataset.state=error?'error':'success';}
  function bindForm(selector,action) {
    const form=$(selector).querySelector('form');
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!configured || form.dataset.busy==='true')return;
      const button=form.querySelector('[type=submit]');const original=button.textContent;
      form.dataset.busy='true';button.disabled=true;button.textContent='전송하고 있어요…';form.setAttribute('aria-busy','true');feedback(form,'');
      try {await action(form,new FormData(form));}
      catch(error){feedback(form,error.message,true);}
      finally{form.dataset.busy='false';button.disabled=false;button.textContent=original;form.removeAttribute('aria-busy');}
    });
  }
  const fields=data=>({...Object.fromEntries(data),consent:data.get('consent')==='on'});
  let entries=[];let shown=3;let more=false;let loading=false;
  function renderMessages() {
    const list=$('#guestbook-list');list.replaceChildren();
    for(const item of entries.slice(0,shown)) {
      const card=document.createElement('article');card.className='guest-letter';
      const recipient=document.createElement('p');recipient.className='letter-recipient';recipient.textContent=recipientLabels[item.recipient] || '두 사람에게';
      const message=document.createElement('p');message.className='guest-letter-message';message.textContent=item.message;
      const footer=document.createElement('footer');const name=document.createElement('span');name.textContent=`From. ${item.name}`;
      const date=document.createElement('time');date.dateTime=item.created_at;date.textContent=new Date(item.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'});
      const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='삭제';remove.setAttribute('aria-label',`${item.name}님의 글 삭제`);
      remove.addEventListener('click',()=>{const dialog=$('#delete-message-dialog');dialog.querySelector('form').reset();dialog.querySelector('[name=id]').value=item.id;feedback(dialog.querySelector('form'),'');open(dialog,remove);});
      footer.append(name,date,remove);card.append(recipient,message,footer);list.append(card);
    }
    $('#guestbook-more').hidden=!(shown<entries.length || more);
  }
  async function loadMessages(append=false) {
    if(loading)return;loading=true;$('#guestbook-more').disabled=true;$('#guestbook-retry').hidden=true;
    $('#guestbook-status').textContent='축하 메시지를 불러오고 있어요.';
    try {
      const result=await request(`/guestbook?offset=${append?entries.length:0}`);entries=append?[...entries,...result.items]:result.items;more=result.more;
      $('#guestbook-status').textContent=entries.length?'':'첫 번째 축하의 말을 기다리고 있어요.';renderMessages();
    } catch(error){$('#guestbook-status').textContent=error.message;$('#guestbook-retry').hidden=false;}
    finally {loading=false;$('#guestbook-more').disabled=false;}
  }
  $('#guestbook-more').addEventListener('click',async()=>{shown+=6;if(shown>entries.length && more)await loadMessages(true);renderMessages();});
  $('#guestbook-retry').addEventListener('click',()=>loadMessages());
  if(configured)loadMessages();else $('#guestbook-status').textContent='축하 메시지를 받을 준비를 하고 있어요. 곧 이곳에서 마음을 나눠 주세요.';
  bindForm('#guestbook-dialog',async(form,data)=>{
    await request('/guestbook',{method:'POST',data:fields(data)});form.reset();feedback(form,'따뜻한 마음을 남겨주셔서 감사합니다. ♡');shown=3;await loadMessages();
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const heart=document.createElement('span');heart.className='sent-heart';heart.textContent='♥';heart.setAttribute('aria-hidden','true');form.append(heart);setTimeout(()=>heart.remove(),1500);}
  });
  bindForm('#delete-message-dialog',async(form,data)=>{await request('/guestbook',{method:'DELETE',data:fields(data)});$('#delete-message-dialog').close();await loadMessages();});
  const rsvpForm=$('#rsvp-dialog form');
  function syncCounts(){const enabled=rsvpForm.elements.attendance.value==='yes';$('#rsvp-counts').hidden=!enabled;for(const name of ['guests','meals'])rsvpForm.elements[name].disabled=!enabled;}
  rsvpForm.elements.attendance.addEventListener('change',syncCounts);
  bindForm('#rsvp-dialog',async(form,data)=>{
    const payload=fields(data);payload.guests=Number(payload.guests || 0);payload.meals=Number(payload.meals || 0);
    if(payload.attendance==='yes' && payload.meals>payload.guests)throw new Error('식사 인원은 참석 인원 이하로 입력해 주세요.');
    const result=await request('/rsvp',{method:'POST',data:payload});form.elements.id.value=result.id;
    feedback(form,`참석 여부를 전달했어요. 수정하려면 응답번호와 비밀번호를 보관해 주세요. 응답번호: ${result.id}`);
    let copy=form.querySelector('.receipt-copy');if(!copy){copy=document.createElement('button');copy.type='button';copy.className='text-button receipt-copy';copy.textContent='응답번호 복사';form.querySelector('.form-feedback').after(copy);copy.addEventListener('click',async()=>{try{await copyValue(form.elements.id.value,'');copy.textContent='복사했어요';}catch(error){feedback(form,error.message,true);}});}
    copy.textContent='응답번호 복사';
  });
  renderContactDetails(wedding);
}
function renderContactDetails(wedding) {
  let example=false;
  for(const item of wedding.contacts || []) {
    if(!item.phone)continue;
    const row=document.createElement('div');row.className='contact-row';const name=document.createElement('p');name.textContent=`${item.label} ${item.name}`;
    const number=document.createElement('span');number.textContent=`${item.phone}${item.example?' · 예시':''}`;name.append(number);row.append(name);
    for(const [label,scheme] of [['전화','tel'],['문자','sms']]) {const link=document.createElement(item.example?'button':'a');link.className='button button-outline';link.textContent=label;if(item.example){link.type='button';link.disabled=true;}else link.href=`${scheme}:${item.phone.replace(/[^\d+]/g,'')}`;row.append(link);}
    $('#couple-contacts').append(row);example ||= item.example;
  }
  for(const item of wedding.accounts || []) {
    if(!item.number)continue;
    const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`${item.side} 마음 전하실 곳${item.example?' · 예시':''}`;
    const content=document.createElement('div');content.className='account-content';const info=document.createElement('p');info.textContent=`${item.bank} · ${item.owner}`;
    const number=document.createElement('p');number.className='account-number';number.textContent=item.number;
    const button=document.createElement('button');button.type='button';button.className='button button-outline';button.textContent='계좌번호 복사';
    const status=document.createElement('p');status.className='small-note';status.setAttribute('role','status');
    button.addEventListener('click',async()=>{try{status.textContent=await copyValue(item.number.replace(/\D/g,''),item.example?'예시 계좌번호를 복사했어요. 실제 송금에 사용하지 마세요.':'계좌번호를 복사했어요.');}catch(error){status.textContent=error.message;}});
    content.append(info,number,button,status);details.append(summary,content);$('#couple-accounts').append(details);example ||= item.example;
  }
  $('#example-details-note').hidden=!example;
}
