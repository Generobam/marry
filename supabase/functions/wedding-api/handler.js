import { InputError, text, password, id, guestMessage, rsvp, albumMediaType, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES } from './validation.js';
const PUBLIC_FIELDS = 'id,name,recipient,message,created_at';
const ADMIN_FIELDS = { guestbook: `${PUBLIC_FIELDS},status`, rsvps: 'id,name,side,attendance,guests,meals,note,updated_at', album: 'id,type,caption,alt,path,created_at' };
const TABLES = { guestbook: 'wedding_messages', rsvps: 'wedding_rsvps', album: 'wedding_album' };
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2,'0')).join('');
export async function hashPassword(value, salt = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
  return `${salt}:${hex(bits)}`;
}
async function matches(value, stored) {
  const actual = await hashPassword(value, (stored || 'missing:').split(':')[0]);
  const expected = stored || '';
  let difference = actual.length ^ expected.length;
  for(let i=0;i<actual.length;i++) difference |= actual.charCodeAt(i) ^ (expected.charCodeAt(i) || 0);
  return difference === 0;
}
async function boundedBody(request, maximum) {
  if (Number(request.headers.get('content-length')) > maximum) throw new InputError('파일 또는 입력 내용이 너무 커요.',413);
  const reader = request.body?.getReader(); if(!reader) return new Uint8Array();
  const chunks=[]; let size=0;
  while(true) { const {value,done}=await reader.read(); if(done) break; size+=value.length; if(size>maximum) {await reader.cancel();throw new InputError('파일 또는 입력 내용이 너무 커요.',413);} chunks.push(value); }
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
export function createHandler(config, fetcher = fetch) {
  async function service(path, options = {}) {
    const response = await fetcher(`${config.url}${path}`, { ...options, headers: {apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json',...options.headers} });
    if(!response.ok) throw new InputError('저장 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',503);
    if(response.status===204) return null;
    const raw=await response.text();return raw ? JSON.parse(raw) : null;
  }
  const db = (path,options) => service(`/rest/v1/${path}`,options);
  async function requireAdmin(request) {
    const token=request.headers.get('authorization');
    if(!token?.startsWith('Bearer ')) throw new InputError('관리자 로그인이 필요해요.',401);
    const response=await fetcher(`${config.url}/auth/v1/user`,{headers:{apikey:config.serviceKey,Authorization:token}});
    if(!response.ok) throw new InputError('로그인이 만료됐어요. 다시 로그인해 주세요.',401);
    const user=await response.json();
    if(!config.adminIds?.includes(user.id)) throw new InputError('관리 권한이 없어요.',403);
  }
  async function limit(request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const digest = hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${config.rateSalt}:${ip}`)));
    for(const [bucket,maximum] of [[digest,30],['global',500]]) {
      const allowed=await db('rpc/wedding_take_limit',{method:'POST',body:JSON.stringify({bucket,maximum})});
      if(!allowed) throw new InputError('잠시 쉬었다가 다시 시도해 주세요. 한 시간 동안 요청이 너무 많았어요.',429);
    }
  }
  async function albumDelete(record) {
    await service('/storage/v1/object/wedding-album',{method:'DELETE',body:JSON.stringify({prefixes:[record.path]})});
    await db(`wedding_album?id=eq.${record.id}`,{method:'DELETE'});
  }
  return async request => {
    const origin=request.headers.get('origin');
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    if(origin && config.origins?.includes(origin)) headers['Access-Control-Allow-Origin']=origin;
    const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    try {
      if(origin && !config.origins?.includes(origin)) throw new InputError('허용되지 않은 요청이에요.',403);
      if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}});
      if(!config.url || !config.serviceKey || !config.rateSalt) throw new InputError('아직 접수를 준비하고 있어요. 잠시 후 다시 방문해 주세요.',503);
      const url=new URL(request.url); const route=url.pathname.split('/wedding-api')[1] || '/';
      const offset=Number(url.searchParams.get('offset') || 0);
      if(!Number.isSafeInteger(offset)||offset<0||offset>100000) throw new InputError('페이지 번호를 확인해 주세요.');
      const admin=route.startsWith('/admin/');
      if(admin) await requireAdmin(request);
      else if(request.method!=='GET') await limit(request);
      if(route==='/album' && request.method==='GET') {
        const rows=await db('wedding_album?select=id,type,caption,alt,path&order=created_at.asc,id.asc&limit=21&offset='+offset);
        const items=rows.slice(0,20).map(({path,...item})=>({...item,src:`${config.url}/storage/v1/object/public/wedding-album/${path}`}));
        return reply({items,more:rows.length>20});
      }
      if(route==='/guestbook' && request.method==='GET') {
        const rows=await db(`wedding_messages?status=eq.visible&select=${PUBLIC_FIELDS}&order=created_at.desc,id.desc&limit=21&offset=${offset}`);
        return reply({items:rows.slice(0,20),more:rows.length>20});
      }
      let body={};
      if(!['GET','HEAD'].includes(request.method) && !(route==='/admin/album' && request.method==='POST')) {
        try {body=JSON.parse(new TextDecoder().decode(await boundedBody(request,16384)));} catch(error) {if(error instanceof InputError)throw error;throw new InputError('입력 내용을 확인해 주세요.');}
        if(!body || typeof body!=='object' || Array.isArray(body)) throw new InputError('입력 내용을 확인해 주세요.');
        if(body.website) throw new InputError('요청을 처리할 수 없어요.');
      }
      if(route==='/guestbook' && request.method==='POST') {
        if(body.consent!==true) throw new InputError('공개 방명록 안내를 확인해 주세요.');
        const record={...guestMessage(body),password_hash:await hashPassword(password(body.password))};
        const rows=await db('wedding_messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(record)});
        return reply({id:rows[0].id},201);
      }
      if(route==='/guestbook' && request.method==='DELETE') {
        const recordId=id(body.id);const pass=password(body.password);
        const rows=await db(`wedding_messages?id=eq.${recordId}&select=id,password_hash`);
        if(!await matches(pass,rows[0]?.password_hash)) throw new InputError('글 또는 비밀번호를 확인해 주세요.',403);
        await db(`wedding_messages?id=eq.${recordId}`,{method:'DELETE'});return reply({ok:true});
      }
      if(route==='/rsvp' && request.method==='POST') {
        const record=rsvp(body);const pass=password(body.password);let recordId;
        if(body.id) {
          recordId=id(body.id);const rows=await db(`wedding_rsvps?id=eq.${recordId}&select=id,password_hash`);
          if(!await matches(pass,rows[0]?.password_hash)) throw new InputError('응답번호 또는 비밀번호를 확인해 주세요.',403);
          await db(`wedding_rsvps?id=eq.${recordId}`,{method:'PATCH',body:JSON.stringify({...record,updated_at:new Date().toISOString()})});
        } else {
          const rows=await db('wedding_rsvps',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...record,password_hash:await hashPassword(pass)})});recordId=rows[0].id;
        }
        return reply({id:recordId});
      }
      if(route==='/admin/album' && request.method==='POST') {
        const bytes=await boundedBody(request,MAX_VIDEO_BYTES+32768);
        let form;try {form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type') || ''},body:bytes}).formData();}catch{throw new InputError('사진 또는 영상 파일을 확인해 주세요.');}
        const caption=text(form.get('caption') || '', '설명', 200, 0);
        const file=form.get('media');
        if(!(file instanceof Blob)||file.size===0||file.size>MAX_VIDEO_BYTES)throw new InputError('사진은 8MB, 영상은 50MB 이하로 올려 주세요.');
        const [mime,extension,type]=albumMediaType(new Uint8Array(await file.slice(0,16).arrayBuffer()),file.type);
        if(type==='image' && file.size>MAX_PHOTO_BYTES)throw new InputError('사진은 8MB 이하로 올려 주세요.',413);
        const recordId=crypto.randomUUID(),path=`${recordId}.${extension}`;
        await service(`/storage/v1/object/wedding-album/${path}`,{method:'POST',headers:{'Content-Type':mime,'x-upsert':'false'},body:file});
        try {await db('wedding_album',{method:'POST',body:JSON.stringify({id:recordId,type,caption,alt:caption || '두 사람의 소중한 순간',path})});}
        catch(error) {await service('/storage/v1/object/wedding-album',{method:'DELETE',body:JSON.stringify({prefixes:[path]})}).catch(()=>{});throw error;}
        return reply({id:recordId},201);
      }
      if(admin) {
        const kind=route.slice('/admin/'.length);const table=TABLES[kind];if(!table)throw new InputError('찾을 수 없는 요청이에요.',404);
        if(request.method==='GET') {
          const order=kind==='rsvps'?'updated_at':'created_at';
          const rows=await db(`${table}?select=${ADMIN_FIELDS[kind]}&order=${order}.desc,id.desc&limit=101&offset=${offset}`);
          const items=rows.slice(0,100);
          if(kind==='album') for(const item of items) {item.src=`${config.url}/storage/v1/object/public/wedding-album/${item.path}`;delete item.path;}
          return reply({items,more:rows.length>100});
        }
        const recordId=id(body.id);
        if(request.method==='PATCH' && kind==='guestbook') {
          if(!['visible','hidden'].includes(body.status)) throw new InputError('공개 상태를 확인해 주세요.');
          await db(`${table}?id=eq.${recordId}`,{method:'PATCH',body:JSON.stringify({status:body.status})});return reply({ok:true});
        }
        if(request.method==='PATCH' && kind==='album') {
          const caption=text(body.caption || '', '설명', 200, 0);
          await db(`${table}?id=eq.${recordId}`,{method:'PATCH',body:JSON.stringify({caption,alt:caption || '두 사람의 소중한 순간'})});return reply({ok:true});
        }
        if(request.method==='DELETE') {
          if(kind==='album') {const rows=await db(`${table}?id=eq.${recordId}&select=id,path`);if(rows[0])await albumDelete(rows[0]);}
          else await db(`${table}?id=eq.${recordId}`,{method:'DELETE'});
          return reply({ok:true});
        }
      }
      throw new InputError('찾을 수 없는 요청이에요.',404);
    } catch(error) {return reply({error:error instanceof InputError ? error.message : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'},error instanceof InputError ? error.status : 500);}
  };
}
