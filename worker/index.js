import { normalizeProfile, validateMeal } from '../web/core.js';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
function identity(request) {
  const id=request.headers.get('oai-authenticated-user-id');
  if(!id)return null;
  const email=request.headers.get('oai-authenticated-user-email')||'';
  let name=request.headers.get('oai-authenticated-user-full-name')||'';
  if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8') {
    try{name=decodeURIComponent(name);}catch{name='';}
  }
  return {id,email,name:name||email.split('@')[0]||'Plant friend'};
}
async function body(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Send JSON data.');
  const reader=request.body?.getReader();if(!reader)throw new Error('Missing request body.');
  let size=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>64000){await reader.cancel();throw new Error('Request is too large.');}chunks.push(value);}
  const buffer=new Uint8Array(size);let offset=0;for(const c of chunks){buffer.set(c,offset);offset+=c.length;}
  try{return JSON.parse(new TextDecoder().decode(buffer));}catch{throw new Error('Invalid JSON.');}
}
export function makeWorker(foods, assets={}) {
  return {async fetch(request,env) {
    const url=new URL(request.url);const path=url.pathname;
    try {
      if(path==='/api/session'&&request.method==='GET')return json({user:identity(request),signIn:'/signin-with-chatgpt?return_to=%2F',signOut:'/signout-with-chatgpt?return_to=%2F'});
      if(path.startsWith('/api/')) {
        const user=identity(request);if(!user)return json({error:'Sign in to access your journal.'},401);
        if(!env.DB)return json({error:'Cloud storage is not ready. Please try again shortly.'},503);
        if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin) return json({error:'This request must come from Sprout.'},403);
        if(path==='/api/state'&&request.method==='GET') {
          const [profile,meals]=await Promise.all([
            env.DB.prepare('SELECT settings FROM profiles WHERE user_id = ?').bind(user.id).first(),
            env.DB.prepare('SELECT payload FROM meals WHERE user_id = ? ORDER BY meal_date DESC, updated_at DESC LIMIT 5000').bind(user.id).all()
          ]);
          return json({profile:normalizeProfile(profile?JSON.parse(profile.settings):{}),meals:meals.results.map(r=>JSON.parse(r.payload)),limit:5000});
        }
        if(path==='/api/profile'&&request.method==='PUT') {
          const profile=normalizeProfile(await body(request));
          await env.DB.prepare('INSERT INTO profiles (user_id, settings, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings, updated_at=excluded.updated_at').bind(user.id,JSON.stringify(profile),new Date().toISOString()).run();
          return json({profile});
        }
        if(path==='/api/meals'&&request.method==='POST') {
          let meal;try{meal=validateMeal(await body(request),foods);}catch(e){return json({error:e.message},400);}
          await env.DB.prepare('INSERT INTO meals (user_id, id, meal_date, payload, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id,id) DO UPDATE SET meal_date=excluded.meal_date, payload=excluded.payload, updated_at=excluded.updated_at').bind(user.id,meal.id,meal.date,JSON.stringify(meal),meal.updatedAt).run();
          return json({meal});
        }
        if(/^\/api\/meals\/[a-zA-Z0-9-]{8,80}$/.test(path)&&request.method==='DELETE') {
          await env.DB.prepare('DELETE FROM meals WHERE user_id = ? AND id = ?').bind(user.id,path.split('/').pop()).run();return json({ok:true});
        }
        if(path==='/api/account'&&request.method==='DELETE') {
          await env.DB.batch([
            env.DB.prepare('DELETE FROM meals WHERE user_id = ?').bind(user.id),
            env.DB.prepare('DELETE FROM profiles WHERE user_id = ?').bind(user.id)
          ]);return json({ok:true});
        }
        return json({error:'Endpoint not found.'},404);
      }
      if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
      const asset=assets[path==='/'?'/index.html':path];
      if(!asset)return new Response('Not found',{status:404});
      const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
      return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset.type,'Cache-Control':path==='/sw.js'?'no-cache':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(self), microphone=(), geolocation=()'}});
    } catch(e) {
      // Do not expose SQL, identity, or records in error responses or logs.
      if(e.message==='Invalid JSON.'||e.message==='Send JSON data.'||e.message==='Request is too large.'||e.message==='Missing request body.')return json({error:e.message},400);
      return json({error:'Could not reach your journal. Your changes have not been confirmed; please try again.'},503);
    }
  }};
}
