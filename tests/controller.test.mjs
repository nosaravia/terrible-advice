import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {handleGame} from '../lib/api.mjs';
import {openLocalDb} from '../scripts/local-db.mjs';
const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
// Executes the actual browser controller with storage and HTTP adapters.
// This verifies state/render integration; it does not replace visual browser QA.
function client(db){
 let html='';const nodes=new Map();const listeners={};const app={get innerHTML(){return html},set innerHTML(v){html=v;nodes.clear()}};
 const node=s=>{if(s==='#app')return app;if(!s.startsWith('#')||!html.includes('id="'+s.slice(1)+'"'))return null;if(!nodes.has(s))nodes.set(s,{textContent:'',classList:{toggle(){}},setAttribute(){},focus(){}});return nodes.get(s)};
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
 const context=vm.createContext({document:{activeElement:null,querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id),addEventListener:(k,v)=>listeners[k]=v},localStorage:storage(),sessionStorage:storage(),URLSearchParams,location:{search:'',origin:'http://game.test'},AbortSignal,Date,console,setInterval:()=>0,setTimeout:()=>0,navigator:{clipboard:{writeText:async()=>{}}},confirm:()=>true,fetch:(url,options)=>handleGame(new Request('http://game.test'+url,options),db)});
 vm.runInContext(source,context);
 return {context,html:()=>html,run:s=>vm.runInContext(s,context),send:async(type,data={})=>vm.runInContext(`send(${JSON.stringify(type)},${JSON.stringify(data)})`,context)};
}
test('three browser controllers complete five rounds, refresh sessions, escape user text and rematch',async()=>{
 const db=openLocalDb(':memory:'),clients=[client(db),client(db),client(db)];
 assert.match(clients[0].html(),/Let’s make it worse/);
 const created=await clients[0].send('create',{name:'<img src=x>',mode:'wild',aloud:true});
 for(let i=1;i<3;i++)await clients[i].send('join',{name:'Player '+i,code:created.state.code});
 await clients[0].send('heartbeat');assert.match(clients[0].html(),/&lt;img src=x&gt;/);assert.doesNotMatch(clients[0].html(),/<img src=x>/);
 await clients[0].send('start');
 for(let round=1;round<=5;round++){
  await Promise.all(clients.map(c=>c.send('heartbeat')));
  assert.ok(clients.every(c=>c.run('state.round')===round&&c.run('state.phase')==='write'));
  await clients[0].send('swap');
  await Promise.all(clients.map((c,i)=>c.send('submit',{text:'Advice '+i+' <script>bad()</script>'})));
  await Promise.all(clients.map(c=>c.send('heartbeat')));
  assert.ok(clients.every(c=>c.run('state.phase')==='read'));
  assert.match(clients[0].html(),/&lt;script&gt;bad\(\)&lt;\/script&gt;/);assert.doesNotMatch(clients[0].html(),/<script>bad/);
  await clients[0].send('next');await Promise.all(clients.map(c=>c.send('heartbeat')));
  for(const c of clients){const target=c.run('state.answers.find(a=>!a.mine).id');await c.send('vote',{answer:target})}
  await Promise.all(clients.map(c=>c.send('heartbeat')));assert.ok(clients.every(c=>c.run('state.phase')==='reveal'));
  assert.equal(clients[0].run('state.players.reduce((n,p)=>n+p.score,0)'),round*3);
  await clients[0].send('next');
 }
 await Promise.all(clients.map(c=>c.send('heartbeat')));assert.ok(clients.every(c=>c.run('state.phase')==='finished'));
 assert.match(clients[0].html(),/CERTIFIED TERRIBLE ADVISER/);
 const token=clients[1].run('session.token');clients[1].run('state=null');await clients[1].send('heartbeat');assert.equal(clients[1].run('session.token'),token);assert.equal(clients[1].run('state.phase'),'finished');
 await clients[0].send('rematch');await clients[0].send('start');await Promise.all(clients.map(c=>c.send('heartbeat')));assert.ok(clients.every(c=>c.run('state.round')===1&&c.run('state.players.every(p=>p.score===0)')));
 db.sqlite.close();
});
