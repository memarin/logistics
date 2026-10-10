import {ensureRecovery} from './recovery.mjs';
import { seedState } from './seed.mjs';
import { applyAction, audit, fail } from './rules.mjs';
const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function read(db){
 let row=await db.prepare('SELECT data,version FROM demo_state WHERE id=?').bind('shared').first();
 if(!row){await db.prepare('INSERT OR IGNORE INTO demo_state(id,data,version) VALUES (?,?,?)').bind('shared',JSON.stringify(seedState()),0).run();row=await db.prepare('SELECT data,version FROM demo_state WHERE id=?').bind('shared').first();}
 return {state:ensureRecovery(JSON.parse(row.data)),version:row.version};
}
export async function handleApi(request,db,now=new Date().toISOString()){
 try{
  if(!db)return response({error:'Shared storage is unavailable.'},503);
  if(request.method==='GET')return response(await read(db));
  if(request.method!=='POST')return response({error:'Method not allowed.'},405);
  const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Foreign-origin mutations are not allowed.'},403);
  if(!request.headers.get('Content-Type')?.includes('application/json'))return response({error:'Use a JSON request.'},400);
  const text=await request.text();if(text.length>16000)return response({error:'Request is too large.'},413);
  let input;try{input=JSON.parse(text);}catch{return response({error:'Invalid JSON request.'},400);}
  if(!input||Array.isArray(input)||typeof input.action!=='string'||typeof input.role!=='string'||typeof input.runId!=='string')return response({error:'Action, simulated role, and demo run are required.'},400);
  for(let attempt=0;attempt<8;attempt++){
   const {state,version}=await read(db);const draft=structuredClone(state);let failure;
   try{applyAction(draft,input,now);}catch(e){failure=e;if(input.runId!==state.runId)return response({error:e.message},e.status??400);Object.assign(draft,state);audit(draft,input,now,'denied',{reason:e.message,records:[input.orderId,input.taskId,input.approvalId].filter(Boolean)});}
   const result=await db.prepare('UPDATE demo_state SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(draft),'shared',version).run();
   if(result.meta.changes===1)return failure?response({error:failure.message,state:draft,version:version+1},failure.status??400):response({state:draft,version:version+1});
  }
  return response({error:'Another reviewer changed the demo. Refresh and retry.'},409);
 }catch{return response({error:'Shared storage is unavailable. No change was accepted.'},503);}
}
