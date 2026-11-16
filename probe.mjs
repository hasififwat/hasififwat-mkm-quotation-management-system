import fs from 'node:fs';import assert from 'node:assert/strict';import{ConvexHttpClient}from'convex/browser';import{makeFunctionReference as fn}from'convex/server';
const root='/tmp/mkm-43-owned';const mode=process.argv[2];const anon=new ConvexHttpClient('http://127.0.0.1:3520');const staff=new ConvexHttpClient(anon.url);staff.setAuth(fs.readFileSync(root+'/token','utf8'));
const package_id=fs.readFileSync(root+'/package-id','utf8');const args={package_id,month:'DEC',dep_flight:'PROOF43',departure_date:'2026-12-10',return_date:'2026-12-22',departure_sector:'KUL-JED',return_sector:'JED-KUL'};
const call=(c,n,a={})=>n==='listAll'?c.query(fn('packageFlights:'+n),a):c.mutation(fn('packageFlights:'+n),a);
let id=await call(staff,'addFlight',args);const results=[];
for(const [name,a]of [['listAll',{}],['addFlight',args],['setSourceManual',{}],['promoteToSync',{ids:[id]}],['deleteFlight',{id}]]){
try{const value=await call(anon,name,a);results.push({name,result:'allowed',value});if(mode==='after')assert.fail(name+' allowed anonymous');}catch(e){if(mode==='before')throw e;assert.match(e.message,/Not authenticated/);results.push({name,result:'rejected',message:'Not authenticated'});}}
if(mode==='after'){const rows=await call(staff,'listAll');assert(rows.some(r=>r._id===id&&r.source==='manual'));await call(staff,'promoteToSync',{ids:[id]});assert((await call(staff,'listAll')).some(r=>r._id===id&&r.source==='sync'));await call(staff,'setSourceManual');await call(staff,'deleteFlight',{id});assert(!(await call(staff,'listAll')).some(r=>r._id===id));}
fs.writeFileSync(root+'/'+mode+'-transport.json',JSON.stringify({mode,url:anon.url,results,staffCompatibility:'list/add/delete/source maintenance exercised'},null,2));console.log(mode,results.map(r=>r.name+' '+r.result).join(', '));
