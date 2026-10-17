import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,action,tick,view} from '../lib/game.mjs';
import {handleGame} from '../lib/api.mjs';
import {openLocalDb} from '../scripts/local-db.mjs';
const act=(r,t,type,extra={},now=5000)=>action(r,t,{type,round:r.round,...extra},now);
for(const mode of ['family','wild'])test('solo: five rounds, automatic replies/votes and clean rematch in '+mode,()=>{
 const r=createRoom('ABC234','Me',mode,true,1000,true),token=r.players[0].token;
 assert.equal(r.phase,'write');assert.equal(r.round,1);assert.equal(r.aloud,false);assert.equal(r.players.filter(p=>p.bot).length,2);
 assert.throws(()=>act(r,undefined,'join',{name:'Guest'}),/solo practice/);
 for(let round=1;round<=5;round++){
  const now=1000+round*10000;tick(r,now);assert.equal(r.phase,'write');assert.equal(r.answers.length,2);
  for(const a of r.answers)assert.ok(a.text.includes(a.ingredient));
  assert.equal(view(r,token,now).answers.length,0);
  act(r,token,'submit',{text:'My advice with '+r.cards[r.players[0].id]},now);assert.equal(r.phase,'read');
  assert.ok(view(r,token,now).answers.every(a=>!a.author));
  act(r,token,'next',{},now);const target=r.answers.find(a=>a.player!==r.players[0].id).id;
  act(r,token,'vote',{answer:target},now);assert.equal(r.phase,'vote');
  tick(r,now+2500);assert.equal(r.phase,'reveal');assert.equal(Object.keys(r.votes).length,3);
  for(const [pid,answer]of Object.entries(r.votes))assert.notEqual(r.answers.find(a=>a.id===answer).player,pid);
  assert.equal(r.players.reduce((n,p)=>n+p.score,0),round*3);
  assert.ok(view(r,token,now+2500).answers.filter(a=>a.author.includes('(computer)')).length===2);
  act(r,token,'next',{},now+2500);
 }
 assert.equal(r.phase,'finished');act(r,token,'rematch',{},60000);assert.equal(r.phase,'write');assert.equal(r.round,1);assert.equal(r.players.length,3);assert.ok(r.players.every(p=>p.score===0));
});
test('duo: two humans can start; neutral house gives a choice and cannot vote or score',()=>{
 const r=createRoom('ABC234','A','family',false,1000),a=r.players[0].token;
 assert.throws(()=>act(r,a,'start',{},1000),/one more person/);
 const b=act(r,null,'join',{name:'B'},1000);act(r,a,'start',{},1000);
 assert.equal(r.players.length,3);const house=r.players.find(p=>p.neutral);assert.ok(house.bot);
 act(r,a,'submit',{text:'Advice A'},1000);act(r,b,'submit',{text:'Advice B'},1000);tick(r,3500);assert.equal(r.phase,'read');assert.equal(r.answers.length,3);
 act(r,a,'next',{},3500);assert.equal(r.botVoteAt,null);
 act(r,a,'vote',{answer:r.answers.find(x=>x.text==='Advice B').id},3500);
 act(r,b,'vote',{answer:r.answers.find(x=>x.player===house.id).id},3500);
 assert.equal(r.phase,'reveal');assert.equal(Object.keys(r.votes).length,2);assert.equal(r.players.find(p=>p.token===b).score,1);assert.equal(house.score,0);
 assert.throws(()=>act(r,house.token,'heartbeat',{},3500),/Session/);
 assert.equal(view(r,a,3500).house,true);
 tick(r,10000000);act(r,a,'rematch',{},10000001);assert.equal(r.players.length,2);
 act(r,null,'join',{name:'C'},10000001);act(r,a,'start',{},10000001);assert.equal(r.players.length,3);assert.ok(r.players.every(p=>!p.bot));
});
test('solo survives timeouts and reconnects without waiting for missing humans',()=>{
 const r=createRoom('ABC234','Me','family',false,1000,true),token=r.players[0].token;
 tick(r,10000000);assert.equal(r.phase,'finished');assert.equal(r.round,5);assert.equal(view(r,token,10000000).solo,true);
 assert.equal(r.players.reduce((n,p)=>n+p.score,0),10); // Two computer votes per timed-out round.
});
test('solo API starts immediately, keeps bot credentials private, and persists bot progress',async()=>{
 const db=openLocalDb(':memory:');
 const call=async b=>{const res=await handleGame(new Request('http://game.test/api/game',{method:'POST',body:JSON.stringify(b)}),db);return {status:res.status,...await res.json()}};
 const c=await call({type:'create',solo:true,name:'Me',mode:'wild',aloud:true});assert.equal(c.status,200);assert.equal(c.state.phase,'write');assert.equal(c.state.solo,true);assert.equal(c.state.aloud,false);
 assert.ok(c.state.players.every(p=>!('token'in p)));const row=db.sqlite.prepare('SELECT data FROM rooms WHERE code=?').get(c.state.code),r=JSON.parse(row.data);
 for(const pid of Object.keys(r.botWrites))r.botWrites[pid]=Date.now()-1;
 db.sqlite.prepare('UPDATE rooms SET data=? WHERE code=?').run(JSON.stringify(r),c.state.code);
 const updated=await call({type:'heartbeat',code:c.state.code,token:c.token});assert.equal(updated.state.submittedCount,2);
 assert.equal((await call({type:'join',code:c.state.code,name:'Intruder'})).status,400);db.sqlite.close();
});
