import { action, createRoom, tick, view } from './game.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function handleGame(req,db){try {
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Use this game’s own page.'},403);
 if(Number(req.headers.get('content-length')||0)>4096)return json({error:'Request too large.'},413);
 const raw=await req.text();if(raw.length>4096)return json({error:'Request too large.'},413);
 const b=JSON.parse(raw),now=Date.now();
 if(b.type==='create'){await db.prepare('DELETE FROM rooms WHERE updated < ?').bind(now-86400000).run();for(let i=0;i<5;i++){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(6)),code=Array.from(bytes,x=>chars[x%chars.length]).join('');const r=createRoom(code,b.name,b.mode,b.aloud,now,b.solo===true);const result=await db.prepare('INSERT OR IGNORE INTO rooms (code,data,revision,updated) VALUES (?,?,0,?)').bind(code,JSON.stringify(r),now).run();if(result.meta.changes)return json({token:r.players[0].token,state:view(r,r.players[0].token,now)})}return json({error:'Please try creating a room again.'},503)}
 const code=String(b.code||'').toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))return json({error:'Enter a six-character room code.'},400);
 for(let attempt=0;attempt<15;attempt++){const row=await db.prepare('SELECT data,revision,updated FROM rooms WHERE code=?').bind(code).first();if(!row||now-row.updated>86400000)return json({error:'Room not found or expired. Check the code.'},404);const r=JSON.parse(row.data);tick(r,now);const joined=action(r,b.token,b,now),token=joined||b.token,state=view(r,token,now);const result=await db.prepare('UPDATE rooms SET data=?,revision=revision+1,updated=? WHERE code=? AND revision=?').bind(JSON.stringify(r),now,code,row.revision).run();if(result.meta.changes)return json({state,...(joined?{token:joined}:{})})}return json({error:'The room is busy. Please try again.'},409);
 }catch(e){return json({error:e instanceof Error?e.message:'Something went wrong.'},400)}}
