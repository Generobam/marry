import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/wedding-api/handler.js';
import { rsvp, photoType, albumMediaType, csvCell } from '../supabase/functions/wedding-api/validation.js';
import { fakeSupabase } from './helpers/fake-supabase.js';
function fixture(){const fake=fakeSupabase();const handler=createHandler({url:'https://test.supabase.co',serviceKey:'test-key',adminIds:['admin-id'],origins:['https://generobam.github.io'],rateSalt:'test-only'},fake.fetcher);return {...fake,handler,call:async(path,method='GET',data,token)=>{const response=await handler(new Request(`https://test.supabase.co/functions/v1/wedding-api${path}`,{method,headers:{Origin:'https://generobam.github.io',...(token?{Authorization:`Bearer ${token}`} :{}),...(data && !(data instanceof FormData)?{'Content-Type':'application/json'}:{})},body:data instanceof FormData?data:data?JSON.stringify(data):undefined}));return {status:response.status,body:await response.json()};}};}
const message={name:'테스트 하객',recipient:'bride',message:'축하해요 <script>alert(1)</script>',password:'secret-pass-123',consent:true};
const attendance={name:'하객',side:'groom',attendance:'yes',guests:3,meals:2,note:'메모',password:'secret-pass-123',consent:true};
test('public guestbook never returns deletion hashes; hidden messages stay private',async()=>{
 const f=fixture();assert.equal((await f.call('/guestbook','POST',message)).status,201);
 const list=await f.call('/guestbook');assert.equal(list.body.items.length,1);assert.equal(list.body.items[0].password_hash,undefined);
 const row=f.tables.wedding_messages[0];assert.notEqual(row.password_hash,message.password);
 await f.call('/admin/guestbook','PATCH',{id:row.id,status:'hidden'},'admin-token');assert.equal((await f.call('/guestbook')).body.items.length,0);
});
test('only the correct guest password deletes a message',async()=>{
 const f=fixture();const saved=await f.call('/guestbook','POST',message);
 assert.equal((await f.call('/guestbook','DELETE',{id:saved.body.id,password:'wrong-password'})).status,403);
 assert.equal((await f.call('/guestbook','DELETE',{id:saved.body.id,password:message.password})).status,200);
 assert.equal((await f.call('/guestbook')).body.items.length,0);
});
test('RSVP creates and updates one private response with valid receipt/password',async()=>{
 const f=fixture();const saved=await f.call('/rsvp','POST',attendance);assert.equal(saved.status,200);
 assert.equal((await f.call('/rsvp','POST',{...attendance,id:saved.body.id,password:'wrong-password'})).status,403);
 assert.equal((await f.call('/rsvp','POST',{...attendance,id:saved.body.id,attendance:'no',guests:5,meals:5})).status,200);
 assert.equal(f.tables.wedding_rsvps.length,1);assert.equal(f.tables.wedding_rsvps[0].guests,0);
 assert.equal((await f.call('/rsvp')).status,404);
 const list=await f.call('/admin/rsvps','GET',null,'admin-token');assert.equal(list.body.items[0].password_hash,undefined);
});
test('private admin endpoints reject missing, invalid, and non-admin tokens',async()=>{
 const f=fixture();for(const route of ['/admin/rsvps','/admin/guestbook','/admin/album']){
  assert.equal((await f.call(route)).status,401);assert.equal((await f.call(route,'GET',null,'bad')).status,401);assert.equal((await f.call(route,'GET',null,'other-token')).status,403);
 }assert.equal((await f.call('/admin/rsvps','GET',null,'admin-token')).status,200);
});
test('input, consent, request-size and rate limits are enforced on the server',async()=>{
 const f=fixture();assert.equal((await f.call('/guestbook','POST',{...message,consent:false})).status,400);
 assert.equal((await f.call('/guestbook','POST',{...message,message:'x'.repeat(20000)})).status,413);
 assert.equal((await f.call('/guestbook','POST',{...message,password:'123'})).status,400);
 assert.equal((await f.call('/rsvp','POST',{...attendance,meals:4})).status,400);
 f.setLimit(false);assert.equal((await f.call('/guestbook','POST',message)).status,429);assert.equal(f.tables.wedding_messages.length,0);
});
test('only administrators can publish album media; the public album exposes safe metadata',async()=>{
 const f=fixture();const form=new FormData();form.set('caption','우리의 봄');form.set('media',new Blob([new Uint8Array([255,216,255,224,0,0])],{type:'image/jpeg'}),'photo.jpg');
 assert.equal((await f.call('/admin/album','POST',form)).status,401);
 assert.equal((await f.call('/admin/album','POST',form,'other-token')).status,403);
 assert.equal(f.files.size,0);
 assert.equal((await f.call('/photos','POST',{})).status,404);
 const saved=await f.call('/admin/album','POST',form,'admin-token');assert.equal(saved.status,201);assert.equal(f.files.size,1);
 const list=await f.call('/album');assert.equal(list.body.items.length,1);assert.equal(list.body.items[0].type,'image');assert.equal(list.body.items[0].caption,'우리의 봄');
 assert.match(list.body.items[0].src,/\/storage\/v1\/object\/public\/wedding-album\//);assert.equal(list.body.items[0].path,undefined);
 assert.equal((await f.call('/admin/album','PATCH',{id:saved.body.id,caption:'우리의 여름'},'admin-token')).status,200);
 assert.equal((await f.call('/album')).body.items[0].caption,'우리의 여름');
 await f.call('/admin/album','DELETE',{id:saved.body.id},'admin-token');assert.equal(f.files.size,0);assert.equal((await f.call('/album')).body.items.length,0);
 form.set('media',new Blob(['<svg onload="alert(1)">'],{type:'image/jpeg'}),'fake.jpg');assert.equal((await f.call('/admin/album','POST',form,'admin-token')).status,400);
});
test('album supports video and rejects oversized images before storage writes',async()=>{
 const f=fixture();const form=new FormData();form.set('caption','우리의 영상');form.set('media',new Blob([new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109])],{type:'video/mp4'}),'film.mp4');
 assert.equal((await f.call('/admin/album','POST',form,'admin-token')).status,201);assert.equal((await f.call('/album')).body.items[0].type,'video');
 form.set('media',new Blob([new Uint8Array([255,216,255]),new Uint8Array(8*1024*1024)],{type:'image/jpeg'}),'large.jpg');
 assert.equal((await f.call('/admin/album','POST',form,'admin-token')).status,413);assert.equal(f.files.size,1);
 assert.throws(()=>albumMediaType(new TextEncoder().encode('<html>'),'video/mp4'));
});
test('album upload removes the stored file if metadata cannot be saved',async()=>{
 const f=fakeSupabase();const handler=createHandler({url:'https://test.supabase.co',serviceKey:'key',adminIds:['admin-id'],origins:[],rateSalt:'salt'},async(url,options)=>url.endsWith('/rest/v1/wedding_album') && options.method==='POST'?new Response('{}',{status:503}):f.fetcher(url,options));
 const form=new FormData();form.set('media',new Blob([new Uint8Array([255,216,255])],{type:'image/jpeg'}),'photo.jpg');
 const response=await handler(new Request('https://test/wedding-api/admin/album',{method:'POST',headers:{Authorization:'Bearer admin-token'},body:form}));
 assert.equal(response.status,503);assert.equal(f.files.size,0);
});
test('public album pages preserve upload order without duplicate or missing entries',async()=>{
 const f=fixture();for(let i=0;i<25;i++)f.tables.wedding_album.push({id:crypto.randomUUID(),type:'image',caption:String(i),alt:'사진',path:`${i}.jpg`,created_at:new Date(1700000000000+i*1000).toISOString()});
 const first=(await f.call('/album')).body,second=(await f.call('/album?offset=20')).body;
 assert.equal(first.items.length,20);assert.equal(first.more,true);assert.equal(second.items.length,5);assert.equal(second.more,false);
 assert.deepEqual([...first.items,...second.items].map(x=>x.caption),Array.from({length:25},(_,i)=>String(i)));
});
test('unconfigured server fails closed and hostile origins cannot read responses',async()=>{
 const disabled=createHandler({origins:[]});assert.equal((await disabled(new Request('https://test/wedding-api/guestbook'))).status,503);
 const f=fixture();const response=await f.handler(new Request('https://test/wedding-api/guestbook',{headers:{Origin:'https://hostile.example'}}));assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
});
test('guestbook pagination never drops its look-ahead row',async()=>{
 const f=fixture();for(let i=0;i<25;i++)f.tables.wedding_messages.push({id:crypto.randomUUID(),name:String(i),status:'visible',created_at:new Date().toISOString()});
 const first=(await f.call('/guestbook')).body,second=(await f.call('/guestbook?offset=20')).body;
 assert.equal(first.items.length,20);assert.equal(first.more,true);assert.equal(second.items.length,5);assert.equal(second.more,false);assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,25);
});
test('validation handles invalid counts, file signatures, and spreadsheet formulas',()=>{
 assert.throws(()=>rsvp({...attendance,guests:1.5}));assert.throws(()=>photoType(new TextEncoder().encode('<svg>')));
 assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');assert.equal(csvCell('ordinary'),'"ordinary"');
});
