import {seedState} from './seed.mjs';
export function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
const quantity=q=>Number.isSafeInteger(q)&&q>0;
const source=(s,o)=>JSON.stringify({order:{id:o.id,lines:o.lines,status:o.status,due:o.due,reserved:o.reserved},stock:(Array.isArray(o.lines)?o.lines:[]).map(l=>s.inventory.find(i=>i.sku===l?.sku)??null)});
export function assessOrders(s){
 return s.orders.filter(o=>o.status==='open').sort((a,b)=>String(a.due??'9999').localeCompare(String(b.due??'9999'))||a.id.localeCompare(b.id)).map((o,index)=>{
  const reasons=[];const required={};
  if(typeof o.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(o.due)||Number.isNaN(Date.parse(o.due)))reasons.push('Invalid due date.');
  if(!Array.isArray(o.lines)||!o.lines.length)reasons.push('Order lines are missing.');
  for(const line of Array.isArray(o.lines)?o.lines:[]){if(!line||typeof line.sku!=='string'||!quantity(line.quantity)){reasons.push('Invalid line quantity or SKU.');continue;}required[line.sku]=(required[line.sku]??0)+line.quantity;}
  for(const [sku,q] of Object.entries(required)){
   const inv=s.inventory.find(i=>i.sku===sku);
   if(!inv||!Number.isSafeInteger(inv.onHand)||!Number.isSafeInteger(inv.reserved)||inv.onHand<0||inv.reserved<0||inv.reserved>inv.onHand){reasons.push(`Stock is unknown or invalid for ${sku}.`);continue;}
   const available=inv.onHand-inv.reserved+(o.reserved?q:0);if(available<q)reasons.push(`Shortage: ${q-available} units of ${sku}. Need ${q}; available ${available}.`);
  }
  const status=reasons.length?'blocked':'ready';
  return {orderId:o.id,status,priority:index+1,reason:reasons.join(' ')||`Stock covers every line. Due ${o.due}; priority follows due date and order ID.`,signature:source(s,o),sourceRecords:[o.id,...Object.keys(required)],simulated:true};
 });
}
export function planTasks(s,orderId){
 const o=s.orders.find(o=>o.id===orderId);if(!o||assessOrders(s).find(d=>d.orderId===orderId)?.status!=='ready')fail('The order is not ready.',409);
 validateTypes(s.taskTypes,s.workers);const enabled=s.taskTypes.filter(t=>t.enabled);const ordered=[],visited=new Set();
 const visit=t=>{if(visited.has(t.id))return;for(const id of t.dependsOn){const dep=enabled.find(x=>x.id===id);if(!dep)fail('An enabled task has a disabled dependency.');visit(dep);}visited.add(t.id);ordered.push(t);};
 enabled.forEach(visit);const tasks=[];
 for(const type of ordered){
  const candidates=s.workers.filter(w=>w.available&&type.workers.includes(w.id)).map(w=>({...w,total:w.workload+s.tasks.filter(t=>t.workerId===w.id&&t.status!=='completed'&&s.orders.find(o=>o.id===t.orderId)?.status==='open').length+tasks.filter(t=>t.workerId===w.id).length})).sort((a,b)=>a.total-b.total||a.id.localeCompare(b.id));
  if(!candidates.length)fail(`No eligible worker for ${type.name}.`,409);
  const w=candidates[0];tasks.push({id:`${s.runId}:${orderId}:${type.id}`,orderId,typeId:type.id,typeName:type.name,workerId:w.id,status:'assigned',dependsOn:type.dependsOn.map(id=>`${s.runId}:${orderId}:${id}`),reason:`${w.name} is eligible and available, with workload ${w.total}.`,typeSnapshot:structuredClone(type)});
 }
 return tasks;
}
export function proposeCorrection(s,orderId,recount){
 const o=s.orders.find(o=>o.id===orderId);if(!o||o.status!=='open')fail('Select an open order.');
 const line=o.lines.find(l=>{const i=s.inventory.find(i=>i.sku===l.sku);return i&&quantity(l.quantity)&&i.onHand-i.reserved<l.quantity;});
 if(!line)fail('No known stock shortage needs a correction.');
 const inv=s.inventory.find(i=>i.sku===line.sku);if(!quantity(recount)||recount<inv.reserved||recount>1000)fail('Enter a positive recount that covers reservations.');
 return {id:crypto.randomUUID(),kind:'correction',orderId,status:'pending',sku:line.sku,before:inv.onHand,after:recount,signature:source(s,o),reason:`Simulated recount: ${recount} units of ${line.sku}, compared with ${inv.onHand} recorded. Manager approval is required before stock changes.`,simulated:true};
}
export function validateTypes(types,workers){
 if(!Array.isArray(types)||types.length>12)fail('Use at most 12 task types.');
 const ids=new Set();
 for(const t of types){
  if(!t||typeof t.id!=='string'||! /^[a-z][a-z0-9-]{0,30}$/.test(t.id)||ids.has(t.id))fail('Task IDs must be unique lowercase names.');
  ids.add(t.id);
  if(typeof t.name!=='string'||!t.name.trim()||t.name.length>60||typeof t.enabled!=='boolean')fail('A task name and enabled status are required.');
  if(!Array.isArray(t.workers)||!t.workers.length||t.workers.some(id=>!workers.some(w=>w.id===id)))fail('Select existing eligible workers.');
  if(!Array.isArray(t.dependsOn)||t.dependsOn.some(id=>!types.some(x=>x.id===id)))fail('Unknown task dependency.');
 }
 const visited=new Set(),active=new Set();
 const visit=id=>{if(active.has(id))fail('Task dependency cycle.');if(visited.has(id))return;active.add(id);for(const dep of types.find(t=>t.id===id).dependsOn)visit(dep);active.delete(id);visited.add(id);};
 for(const t of types){if(t.enabled&&t.dependsOn.some(id=>!types.find(x=>x.id===id).enabled))fail('An enabled task has a disabled dependency.');visit(t.id);}
 return true;
}
export function authorize(role,action,state){
 if(!['manager','staff','it'].includes(role))fail('Unknown simulated role.',403);
 if(state.access?.[role]===false)fail('Access is revoked for this simulated role.',403);
 const actions=['access','assess','coordinate','propose-correction','complete','request-release','request-cancel','approve','reject','configure','permissions','worker','edit-order','reset'];
 if(!actions.includes(action))fail('Unknown action.');
 if(['approve','reject'].includes(action)&&role!=='manager')fail('Warehouse manager approval is required.',403);
 if(['configure','worker','edit-order'].includes(action)&&role==='staff')fail('Permission denied for fulfillment staff.',403);
 if(['permissions','access'].includes(action)&&role!=='it')fail('Only IT can change permissions.',403);
 if(action==='complete'&&role!=='staff')fail('Switch to fulfillment staff to record physical work.',403);
 const grant={assess:'assessment',coordinate:'coordination','propose-correction':'exceptions'}[action];
 if(grant&&!state.permissions[grant])fail('Agent permission is revoked.',403);
 return true;
}
export function audit(state,input,now,outcome,details={}){
 const entry={id:crypto.randomUUID(),runId:state.runId,time:now,actor:['assess','coordinate','propose-correction'].includes(input.action)?'Simulated agent':input.role,role:input.role,action:input.action,outcome,reason:details.reason??input.action,records:details.records??[],...details};
 state.audit.push(entry);return entry;
}
export function applyAction(s,input,now){
 if(input.runId!==s.runId)fail('This demo run changed. Refresh before another action.',409);
 authorize(input.role,input.action,s);
 const o=s.orders.find(x=>x.id===input.orderId);
 let details={};
 switch(input.action){
 case 'reset':{
  if(input.confirmed!==true)fail('Confirm reset for all reviewers.');
  const history=s.audit, previous=s.runId;Object.assign(s,seedState());s.audit=history;details={reason:'Shared sample data restored. Earlier run actions are invalid.',records:[previous,s.runId]};break;
 }
 case 'configure':{
  if(typeof input.expectedConfig!=='string')fail('The current configuration snapshot is required.');
  if(input.expectedConfig!==JSON.stringify(s.taskTypes))fail('Task configuration changed. Refresh before editing.',409);
  validateTypes(input.taskTypes,s.workers);const before=s.taskTypes;s.taskTypes=structuredClone(input.taskTypes);details={reason:'Authorized task configuration updated.',before,after:s.taskTypes,records:s.taskTypes.map(t=>t.id)};break;
 }
 case 'access':{
  if(!input.access||!Object.keys(input.access).length||Object.keys(input.access).some(k=>!['manager','staff'].includes(k)||typeof input.access[k]!=='boolean'))fail('Set access for manager or staff. IT access remains available.');
  s.access??={manager:true,staff:true,it:true};const before={...s.access};Object.assign(s.access,input.access);details={reason:'IT updated simulated role access.',before,after:{...s.access}};break;
 }
 case 'permissions':{
  if(!input.permissions||Object.keys(input.permissions).some(k=>!['assessment','coordination','exceptions'].includes(k)||typeof input.permissions[k]!=='boolean'))fail('Invalid permission values.');
  const before={...s.permissions};Object.assign(s.permissions,input.permissions);details={reason:'IT updated agent permissions.',before,after:{...s.permissions}};break;
 }
 case 'worker':{
  const w=s.workers.find(x=>x.id===input.workerId);if(!w||typeof input.available!=='boolean')fail('Select a worker and availability.');const before=w.available;w.available=input.available;details={reason:'Worker availability updated.',records:[w.id],before,after:w.available};break;
 }
 case 'edit-order':{
  if(!o||o.status!=='open'||o.reserved)fail('Only unreserved open orders can change.');
  if(!quantity(input.quantity)||input.quantity>1000||typeof input.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.due)||Number.isNaN(Date.parse(input.due)))fail('Enter a valid quantity and due date.');
  const before=structuredClone(o);o.lines[0].quantity=input.quantity;o.due=input.due;details={reason:'Order data changed. Rerun assessment.',records:[o.id],before,after:structuredClone(o)};break;
 }
 case 'assess':{
  s.decisions=assessOrders(s);s.exceptions=s.decisions.filter(d=>d.status==='blocked').map(d=>({id:'exception-'+d.orderId,orderId:d.orderId,reason:d.reason,status:'open'}));
  details={reason:`Assessed ${s.decisions.length} open orders from current stock and due dates.`,records:s.decisions.map(d=>d.orderId),after:s.decisions};break;
 }
 case 'coordinate':{
  if(!o||o.status!=='open')fail('Select an open order.');
  const existing=s.tasks.filter(t=>t.orderId===o.id);if(existing.length){details={reason:'Existing tasks retained. No duplicate tasks or reservations.',records:[o.id,...existing.map(t=>t.id)]};break;}
  const decision=s.decisions.find(d=>d.orderId===o.id);if(!decision||decision.signature!==source(s,o))fail('Assessment is missing or stale. Rerun assessment.',409);
  if(decision.status!=='ready')fail('The order is blocked. Resolve its exception first.',409);
  const tasks=planTasks(s,o.id);if(!tasks.length)fail('No enabled task types are configured.');
  for(const line of o.lines){const inv=s.inventory.find(i=>i.sku===line.sku);if(!inv||inv.onHand-inv.reserved<line.quantity)fail('Stock is no longer available.',409);}
  for(const line of o.lines)s.inventory.find(i=>i.sku===line.sku).reserved+=line.quantity;
  o.reserved=true;s.tasks.push(...tasks);details={reason:'Created and assigned permitted tasks. Stock reserved once.',records:[o.id,...tasks.map(t=>t.id)],after:tasks};break;
 }
 case 'complete':{
  const t=s.tasks.find(x=>x.id===input.taskId);if(!t)fail('Task not found.');
  if(t.status==='completed'){details={reason:'Task completion already recorded. No extra inventory effect.',records:[t.id]};break;}
  if(t.dependsOn.some(id=>s.tasks.find(x=>x.id===id)?.status!=='completed'))fail('Complete task dependencies first.',409);
  if(s.orders.find(x=>x.id===t.orderId)?.status!=='open')fail('The order is no longer open.',409);
  t.status='completed';details={reason:'Fulfillment staff recorded physical work.',records:[t.id,t.orderId],before:'assigned',after:'completed'};break;
 }
 case 'propose-correction':{
  const proposal=proposeCorrection(s,input.orderId,input.recount);
  const duplicate=s.approvals.find(p=>p.status==='pending'&&p.kind==='correction'&&p.orderId===input.orderId&&p.signature===proposal.signature&&p.after===proposal.after);
  if(!duplicate)s.approvals.push(proposal);
  details={reason:duplicate?'An identical correction request already awaits approval.':proposal.reason,records:[proposal.orderId,proposal.sku,duplicate?.id??proposal.id],after:duplicate??proposal};break;
 }
 case 'request-release':case 'request-cancel':{
  if(!o||o.status!=='open')fail('Select an open order.');
  const tasks=s.tasks.filter(t=>t.orderId===o.id);const kind=input.action==='request-release'?'release':'cancel';
  if(kind==='release'&&(!o.reserved||!tasks.length||tasks.some(t=>t.status!=='completed')))fail('Complete all required work before shipment release.',409);
  const signature=JSON.stringify({source:source(s,o),tasks});
  let p=s.approvals.find(p=>p.status==='pending'&&p.kind===kind&&p.orderId===o.id&&p.signature===signature);
  if(!p){p={id:crypto.randomUUID(),kind,orderId:o.id,status:'pending',signature,reason:kind==='release'?'All warehouse tasks are complete. Manager shipment approval is required.':'Cancel this order and release its stock reservations.',before:o.status,after:kind==='release'?'released':'cancelled',createdAt:now};s.approvals.push(p);}
  details={reason:p.reason,records:[o.id,p.id],after:p};break;
 }
 case 'approve':case 'reject':{
  const p=s.approvals.find(x=>x.id===input.approvalId);if(!p)fail('Approval request not found.');
  if(p.status==='approved'&&input.action==='approve'){details={reason:'Approval already applied. No extra stock or order change.',records:[p.id]};audit(s,input,now,'unchanged',details);return s;}
  if(p.status!=='pending')fail('This approval already has a decision.',409);
  if(input.action==='reject'){
   if(typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>500)fail('Enter a rejection reason.');
   p.status='rejected';p.reasonRejected=input.reason.trim();p.decidedAt=now;details={reason:p.reasonRejected,records:[p.id,p.orderId],before:'pending',after:'rejected'};break;
  }
  const order=s.orders.find(x=>x.id===p.orderId);if(!order||order.status!=='open')fail('Approval source is stale.',409);
  if(p.kind==='correction'){
   if(p.signature!==source(s,order))fail('Correction source is stale. Request a new proposal.',409);
   const inv=s.inventory.find(i=>i.sku===p.sku);if(!inv||!quantity(p.after)||p.after<inv.reserved)fail('Stock correction cannot be below reservations.');
   const before=inv.onHand;inv.onHand=p.after;details={reason:'Manager approved the simulated recount correction.',records:[p.id,order.id,p.sku],before,after:p.after};
  }else{
   const tasks=s.tasks.filter(t=>t.orderId===order.id);if(p.signature!==JSON.stringify({source:source(s,order),tasks}))fail('Approval source is stale. Request a new proposal.',409);
   if(p.kind==='release'&&(!order.reserved||tasks.some(t=>t.status!=='completed')))fail('Complete required tasks first.',409);
   const before=structuredClone(s.inventory);
   if(order.reserved)for(const line of order.lines){const inv=s.inventory.find(i=>i.sku===line.sku);if(!inv||inv.reserved<line.quantity||inv.onHand<line.quantity)fail('Inventory integrity check failed.',409);}
   if(order.reserved)for(const line of order.lines){const inv=s.inventory.find(i=>i.sku===line.sku);inv.reserved-=line.quantity;if(p.kind==='release')inv.onHand-=line.quantity;}
   order.reserved=false;order.status=p.kind==='release'?'released':'cancelled';details={reason:`Manager approved ${p.kind}.`,records:[p.id,order.id],before,after:structuredClone(s.inventory)};
  }
  p.status='approved';p.decidedAt=now;break;
 }
 }
 audit(s,input,now,'accepted',details);return s;
}
