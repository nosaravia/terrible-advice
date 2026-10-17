import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,action,view,tick,problems} from '../lib/game.mjs';
import {handleGame} from '../lib/api.mjs';
import {openLocalDb} from '../scripts/local-db.mjs';
function setup(mode='family',aloud=false){const r=createRoom('ABC234','Host',mode,aloud,1000);const tokens=[r.players[0].token];tokens.push(action(r,null,{type:'join',name:'B'},1000),action(r,null,{type:'join',name:'C'},1000));return {r,tokens}}
function act(r,t,type,extra={},now=2000){return action(r,t,{type,round:r.round,...extra},now)}
test('five full rounds, anonymous answers, scoring once, tied winners and fresh rematch',()=>{
 const {r,tokens}=setup();act(r,tokens[0],'start');const seen=[];
 for(let round=1;round<=5;round++){
  const now=2000+round*100;seen.push(r.problem);assert.equal(r.round,round);assert.equal(new Set(Object.values(r.cards)).size,3);
  tokens.forEach((t,i)=>act(r,t,'submit',{text:'Answer '+i},now));assert.equal(r.phase,'read');
  const v=view(r,tokens[0],now);assert.equal(v.answers.length,3);assert.ok(v.answers.every(a=>!('author'in a)&&!('player'in a)));assert.ok(!JSON.stringify(v).includes(tokens[1]));
  act(r,tokens[0],'next',{},now);
  tokens.forEach((t,i)=>act(r,t,'vote',{answer:r.answers.find(a=>a.player===r.players[(i+1)%3].id).id},now));assert.equal(r.phase,'reveal');
  assert.ok(r.players.every(p=>p.score===round));tick(r,now+1);assert.ok(r.players.every(p=>p.score===round));assert.throws(()=>act(r,tokens[0],'vote',{answer:r.answers[0].id},now),/closed/);
  act(r,tokens[0],'next',{},now);
 }
 assert.equal(r.phase,'finished');assert.equal(new Set(seen).size,5);act(r,tokens[0],'rematch',{},3000);assert.equal(r.phase,'lobby');assert.ok(r.players.every(p=>p.score===0));act(r,tokens[0],'start',{},3000);assert.ok(!seen.includes(r.problem));
});
test('authorization, input validation, room capacity, host-only controls',()=>{
 assert.throws(()=>createRoom('ABC234',' ','family',false),/nickname/);
 const {r,tokens}=setup();assert.throws(()=>act(r,tokens[1],'start'),/host/);assert.throws(()=>act(r,'wrong','heartbeat'),/Session/);assert.throws(()=>action(r,null,{type:'join',name:'host'}),/taken/);
 act(r,tokens[0],'start');assert.throws(()=>act(r,tokens[0],'submit',{text:' '.repeat(5)}),/1–240/);assert.throws(()=>act(r,tokens[0],'submit',{text:'x'.repeat(241)}),/1–240/);
 for(let i=0;i<7;i++)action(r,null,{type:'join',name:'Guest '+i},2000);assert.throws(()=>action(r,null,{type:'join',name:'Full'},2000),/full/);
});
test('single swap, single submission, self-vote and duplicate vote prevention',()=>{
 const {r,tokens}=setup();act(r,tokens[0],'start');const initial=r.cards[r.players[0].id];act(r,tokens[0],'swap');assert.notEqual(r.cards[r.players[0].id],initial);assert.throws(()=>act(r,tokens[0],'swap'),/already/);
 act(r,tokens[0],'submit',{text:'Hello'});assert.throws(()=>act(r,tokens[0],'submit',{text:'Again'}),/already/);tokens.slice(1).forEach(t=>act(r,t,'submit',{text:'Other'}));act(r,tokens[0],'next');
 assert.throws(()=>act(r,tokens[0],'vote',{answer:r.answers.find(a=>a.player===r.players[0].id).id}),/yourself/);
 const target=r.answers.find(a=>a.player===r.players[1].id).id;act(r,tokens[0],'vote',{answer:target});assert.throws(()=>act(r,tokens[0],'vote',{answer:target}),/already/);
});
test('server timeouts advance empty rounds and recover long absence',()=>{
 const {r,tokens}=setup();act(r,tokens[0],'start');tick(r,62000);assert.equal(r.phase,'read');tick(r,87000);assert.equal(r.phase,'reveal');tick(r,10000000);assert.equal(r.phase,'finished');assert.ok(r.players.every(p=>p.score===0));
});
test('read-aloud waits for host; host recovery after 45 seconds',()=>{
 const {r,tokens}=setup('wild',true);act(r,tokens[0],'start');tokens.forEach(t=>act(r,t,'submit',{text:'Advice'}));assert.equal(r.deadline,null);tick(r,900000);assert.equal(r.phase,'read');assert.throws(()=>act(r,tokens[1],'next'),/host/);assert.throws(()=>act(r,tokens[1],'claim',{},3000),/connected/);act(r,tokens[1],'claim',{},50000);assert.equal(r.host,r.players[1].id);act(r,tokens[1],'next',{},50000);assert.equal(r.phase,'vote');
});
test('late joiners spectate until rematch; stale submissions rejected',()=>{
 const {r,tokens}=setup();act(r,tokens[0],'start');const late=action(r,null,{type:'join',name:'Late'},2000);assert.equal(view(r,late,2000).active,false);assert.throws(()=>act(r,late,'submit',{text:'No'}),/next game/);assert.throws(()=>action(r,tokens[0],{type:'submit',round:0,text:'Old'},2000),/round changed/);
 tick(r,10000000);act(r,tokens[0],'rematch',{},10000001);act(r,tokens[0],'start',{},10000002);assert.equal(view(r,late,10000002).active,true);
});
test('one answer allows other players to vote; non-submitter can vote',()=>{
 const {r,tokens}=setup();act(r,tokens[0],'start');act(r,tokens[0],'submit',{text:'Only advice'});tick(r,62000);act(r,tokens[0],'next',{},62000);act(r,tokens[1],'vote',{answer:r.answers[0].id},62000);act(r,tokens[2],'vote',{answer:r.answers[0].id},62000);assert.equal(r.phase,'reveal');assert.equal(r.players[0].score,2);
});
test('all family prompts used before repeats',()=>{const {r,tokens}=setup();const seen=new Set();for(let i=0;i<problems.length;i++){if(r.phase==='finished')act(r,tokens[0],'rematch',{},2000);if(r.phase==='lobby')act(r,tokens[0],'start',{},2000);assert.ok(!seen.has(r.problem));seen.add(r.problem);r.phase='reveal';r.deadline=null;act(r,tokens[0],'next',{},2000)}assert.equal(seen.size,problems.length)});
test('API durable state, concurrent joins/submissions/votes, privacy and origin checks',async()=>{
 const db=openLocalDb(':memory:');
 const call=async b=>{const res=await handleGame(new Request('http://game.test/api/game',{method:'POST',body:JSON.stringify(b)}),db);return {status:res.status,...await res.json()}};
 const created=await call({type:'create',name:'A'}),code=created.state.code;assert.match(code,/^[A-Z2-9]{6}$/);const tokens=[created.token];
 const joined=await Promise.all(['B','C','D'].map(name=>call({type:'join',code,name})));joined.forEach(d=>{assert.equal(d.status,200);tokens.push(d.token)});
 let s=(await call({type:'heartbeat',code,token:tokens[0]})).state;assert.equal(s.players.length,4);
 assert.equal((await call({type:'heartbeat',code,token:'bad'})).status,400);
 await call({type:'start',code,token:tokens[0]});
 const submitted=await Promise.all(tokens.map((token,i)=>call({type:'submit',code,token,round:1,text:'Advice '+i})));submitted.forEach(d=>assert.equal(d.status,200));
 s=(await call({type:'heartbeat',code,token:tokens[0]})).state;assert.equal(s.phase,'read');assert.equal(s.answers.length,4);assert.ok(s.answers.every(a=>!a.author));
 await call({type:'next',code,token:tokens[0]});
 const votes=await Promise.all(tokens.map(async(token,i)=>{const v=(await call({type:'heartbeat',code,token})).state;return call({type:'vote',code,token,round:1,answer:v.answers.find(a=>a.text==='Advice '+(i+1)%4).id})}));votes.forEach(v=>assert.equal(v.status,200));
 s=(await call({type:'heartbeat',code,token:tokens[0]})).state;assert.equal(s.phase,'reveal');assert.ok(s.players.every(p=>p.score===1));
 assert.equal((await handleGame(new Request('http://game.test/api/game',{method:'POST',headers:{origin:'http://other.test'},body:'{}'}),db)).status,403);
 db.sqlite.close();
});
