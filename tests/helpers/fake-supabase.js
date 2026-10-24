// In-memory transport for exercising the real Edge handler without a cloud account.
export function fakeSupabase() {
  const tables={wedding_messages:[],wedding_rsvps:[],wedding_photos:[]};const files=new Map();const calls=[];let allow=true;
  const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
  async function fetcher(url,options={}) {
    calls.push({url,method:options.method||'GET'});const u=new URL(url);const method=options.method||'GET';const path=u.pathname;
    if(path==='/auth/v1/user')return options.headers.Authorization==='Bearer admin-token'?response({id:'admin-id'}):options.headers.Authorization==='Bearer other-token'?response({id:'other-id'}):response({},401);
    if(path.endsWith('/rpc/wedding_take_limit'))return response(allow);
    if(path.startsWith('/storage/v1/object/sign/'))return response({signedURL:`/object/sign/${path.split('/sign/')[1]}?token=test`});
    if(path.startsWith('/storage/v1/object/')) {
      if(method==='POST'){files.set(path,options.body);return response({});}
      if(method==='DELETE'){for(const p of JSON.parse(options.body).prefixes)files.delete(`/storage/v1/object/wedding-guest-photos/${p}`);return response({});}
    }
    const name=path.split('/').pop();const rows=tables[name];if(!rows)return response({error:'unexpected'},404);
    const filter=rows.filter(row=>[...u.searchParams].every(([key,value])=>!value.startsWith('eq.') || String(row[key])===value.slice(3)));
    if(method==='POST'){const row={id:crypto.randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),status:'visible',...JSON.parse(options.body)};rows.push(row);return response([row]);}
    if(method==='PATCH'){for(const row of filter)Object.assign(row,JSON.parse(options.body));return response({});}
    if(method==='DELETE'){tables[name]=rows.filter(row=>!filter.includes(row));return response({});}
    const start=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||1000);const selected=u.searchParams.get('select');
    return response(filter.slice().reverse().slice(start,start+limit).map(row=>selected?Object.fromEntries(selected.split(',').map(key=>[key,row[key]])):row));
  }
  return {fetcher,tables,files,calls,setLimit:value=>{allow=value;}};
}
