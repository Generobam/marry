import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/wedding-api/handler.js';
import { rsvp, photoType, csvCell } from '../supabase/functions/wedding-api/validation.js';
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
 const f=fixture();for(const route of ['/admin/rsvps','/admin/guestbook','/admin/photos']){
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
test('photos are validated and stored privately, admin gets expiring URLs and can delete',async()=>{
 const f=fixture();const form=new FormData();form.set('name','사진 하객');form.set('consent','true');form.set('photo',new Blob([new Uint8Array([255,216,255,224,0,0])],{type:'image/jpeg'}),'photo.jpg');
 const saved=await f.call('/photos','POST',form);assert.equal(saved.status,201);assert.equal(f.files.size,1);assert.equal((await f.call('/photos')).status,404);
 const list=await f.call('/admin/photos','GET',null,'admin-token');assert.match(list.body.items[0].url,/\/storage\/v1\/object\/sign\//);assert.equal(list.body.items[0].path,undefined);
 await f.call('/admin/photos','DELETE',{id:saved.body.id},'admin-token');assert.equal(f.files.size,0);
 form.set('photo',new Blob(['<svg onload="alert(1)">'],{type:'image/jpeg'}),'fake.jpg');assert.equal((await f.call('/photos','POST',form)).status,400);
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
