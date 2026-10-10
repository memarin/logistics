import {seedEvidence} from './evidence.mjs';
import {fail,assessOrders,planTasks,proposeCorrection} from './rules.mjs';
export function ensureRecovery(s){s.recoveryCases??=[];s.evidence??=seedEvidence();for(const key of ['investigation','planning','execution'])s.permissions[key]??=true;return s;}
export function recoverySource(s,order){return JSON.stringify({order,stock:(order.lines??[]).map(l=>s.inventory.find(i=>i.sku===l.sku)),evidence:s.evidence.filter(e=>(order.lines??[]).some(l=>l.sku===e.sku))});}
const record=(c,now,stage,tool,records,observed,reason,outcome='observed')=>{c.trace.push({id:crypto.randomUUID(),time:now,stage,tool,records,observed,reason,outcome});};
function select(s,input){const c=s.recoveryCases.find(c=>c.id===input.caseId);if(!c)fail('Recovery case not found.');if(input.expectedRevision!==c.revision)fail('Recovery case revision changed. Refresh before another action.',409);return c;}
const details=c=>({reason:c.summary,records:[c.id,c.orderId,c.sku,...(c.approvalId?[c.approvalId]:[])],after:{status:c.status,revision:c.revision,plan:c.plan,verification:c.verification,trace:c.trace.slice(-5)}});
export function investigate(s,input,now){
 const o=s.orders.find(o=>o.id===input.orderId);if(!o||o.status!=='open'||o.reserved)fail('Select an unreserved open order.');
 let c=s.recoveryCases.find(c=>c.orderId===o.id);const recheck=c?.status==='needs-reinvestigation';
 const decision=assessOrders(s).find(d=>d.orderId===o.id);if(decision?.status!=='blocked'&&!recheck)fail('This order has no current exception to investigate.',409);
 const line=o.lines?.find(l=>{const i=s.inventory.find(i=>i.sku===l.sku);return recheck?l.sku===c.sku:!i||i.onHand-i.reserved<l.quantity;});if(!line)fail('The exception needs a valid stock line.');
 const stock=s.inventory.find(i=>i.sku===line.sku);if(!stock)fail('Stock is unknown. Ask IT to restore the source record.',409);
 const signature=recoverySource(s,o);
 if(c&&c.source===signature&&c.status==='awaiting-verification')return details(c);
 if(c?.approvalId&&s.approvals.find(p=>p.id===c.approvalId)?.status==='pending')fail('Decide the pending proposal before a new investigation.',409);
 if(!c){c={id:`${s.runId}:${o.id}:recovery`,orderId:o.id,sku:line.sku,revision:0,trace:[],executionAttempts:0};s.recoveryCases.push(c);}
 c.revision++;c.executionAttempts=0;c.status='awaiting-verification';c.goal=`Recover ${o.id} without unsupported stock changes.`;c.source=signature;c.approvalId=null;c.rejection=null;c.plan=null;c.blocker=null;
 const evidence=s.evidence.filter(e=>e.sku===line.sku),receipts=evidence.filter(e=>e.type==='receipt'),notes=evidence.filter(e=>e.type==='shift-note'),transactions=evidence.filter(e=>e.type==='transaction');
 record(c,now,'investigation','read-inventory',[o.id,line.sku],{required:line.quantity,onHand:stock.onHand,reserved:stock.reserved},'Establish the shortage from current order and stock records.');
 record(c,now,'investigation','read-receipts',receipts.map(e=>e.id),receipts,'Check whether a receipt explains the difference. Delivery does not establish usable condition.');
 record(c,now,'investigation','read-transactions',transactions.map(e=>e.id),transactions,'Compare receipts with posted movements instead of assuming the receipt changed inventory.');
 record(c,now,'investigation','read-shift-notes',notes.map(e=>e.id),notes,'The synthetic note raises a condition concern. A human inspection must settle the uncertainty.');
 c.hypotheses=[{cause:'Unposted receipt',support:receipts.filter(r=>!r.posted).map(r=>r.id),status:'unconfirmed'},{cause:'Damaged received stock',support:notes.map(n=>n.id),status:'unconfirmed'},{cause:'Count or location error',support:[line.sku],status:'unconfirmed'}];
 c.summary=receipts.length?'A receipt may explain the shortage, but condition and usable quantity are unconfirmed. Staff inspection is required.':'Receipt evidence is missing. Do not infer extra stock. Staff must verify physical quantity and condition.';
 c.verification={id:crypto.randomUUID(),status:'pending',request:'Count the physical kits and inspect the received kits. Confirm usable or damaged stock.',count:null,condition:null,note:''};
 record(c,now,'investigation','request-staff-verification',[c.verification.id],c.verification.request,c.summary,'awaiting-human');return details(c);
}
export function verifyEvidence(s,input,now){
 const c=select(s,input),o=s.orders.find(o=>o.id===c.orderId);
 if(c.status!=='awaiting-verification'||c.verification.status!=='pending')fail('This verification request is no longer pending.',409);
 if(c.source!==recoverySource(s,o))fail('Investigation source is stale. Run a new investigation.',409);
 if(input.confirmed!==true)fail('Confirm the synthetic physical inspection.');
 if(!Number.isSafeInteger(input.count)||input.count<0||input.count>1000||!['usable','damaged'].includes(input.condition)||input.note!==undefined&&(typeof input.note!=='string'||input.note.length>500))fail('Enter a valid count, condition, and short inspection note.');
 Object.assign(c.verification,{status:'completed',count:input.count,condition:input.condition,note:input.note??'',checkedBy:'Fulfillment staff',time:now});c.revision++;c.status='verified';c.summary='Staff evidence is recorded. The agent must compare recovery options before any stock change.';
 record(c,now,'investigation','receive-staff-verification',[c.verification.id],c.verification,'A staff attestation provides quantity and condition. It is still synthetic evidence.','human-confirmed');return details(c);
}
export function planRecovery(s,input,now){
 const c=select(s,input),o=s.orders.find(o=>o.id===c.orderId);
 if(c.verification?.status!=='completed')fail('Complete staff verification before recovery planning.',409);
 if(c.source!==recoverySource(s,o))fail('Recovery evidence changed. Run a new investigation.',409);
 const current=s.approvals.find(p=>p.id===c.approvalId);if(current?.status==='pending')return details(c);if(current?.status==='approved')fail('Execute the approved plan before another plan.',409);
 const inv=s.inventory.find(i=>i.sku===c.sku),required=o.lines.find(l=>l.sku===c.sku).quantity;
 const canCorrect=c.verification.condition==='usable'&&c.verification.count-inv.reserved>=required&&!c.rejection;
 if(c.rejection)record(c,now,'planning','read-manager-decision',[current?.id].filter(Boolean),{rejected:c.rejection},'A rejected correction must not be resubmitted automatically.');
 const reason=c.rejection?`Manager rejected the correction: ${c.rejection}. Recommend a hold until stronger evidence exists.`:c.verification.condition==='damaged'?'Received stock is damaged. A physical count does not prove usable inventory. Recommend an order hold.':canCorrect?'Verified usable stock covers the order. Correct the recorded count with manager approval, then resume fulfillment.':'The verified count cannot cover the order. Recommend a hold instead of inventing stock.';
 c.plan={selected:canCorrect?'correct-stock':'hold-order',reason,options:[{id:'correct-stock',name:'Correct stock and resume',available:canCorrect,reason:canCorrect?'Staff confirmed usable stock that covers demand.':'Blocked by condition, insufficient stock, or manager rejection.'},{id:'hold-order',name:'Hold the affected order',available:true,reason:'Protect stock integrity while the exception remains unresolved.'},{id:'request-new-evidence',name:'Request another inspection',available:true,reason:'Requires a new human check and manager direction; cannot unblock shipment immediately.'}],steps:canCorrect?['Manager approves exact count','Recheck current stock and staff availability','Create permitted tasks','Staff complete physical work','Manager approves release','Verify actual outcome']:['Manager approves hold','Stop affected fulfillment','Record unresolved evidence and required follow-up']};
 let p;if(canCorrect){p=proposeCorrection(s,o.id,c.verification.count,c.sku);p.reason=`${reason} Evidence: ${c.verification.id}.`;}else p={id:crypto.randomUUID(),kind:'hold',orderId:o.id,status:'pending',before:o.status,after:'on-hold',reason,simulated:true};
 p.caseId=c.id;p.evidenceIds=[c.verification.id,...s.evidence.filter(e=>e.sku===c.sku).map(e=>e.id)];p.recoverySignature=c.source;s.approvals.push(p);c.approvalId=p.id;c.status='awaiting-approval';c.revision++;c.summary=reason;
 record(c,now,'planning','compare-recovery-options',[o.id,c.verification.id],c.plan,'Compare feasible options against verified condition, demand, and manager feedback.','proposed');
 record(c,now,'planning','request-manager-approval',[p.id],{kind:p.kind,before:p.before,after:p.after},'No protected change occurs until the manager approves.','awaiting-human');return details(c);
}
export function assertRecoveryApproval(s,p){if(!p.caseId)return;const c=s.recoveryCases.find(c=>c.id===p.caseId),o=s.orders.find(o=>o.id===p.orderId);if(!c||c.approvalId!==p.id||p.recoverySignature!==recoverySource(s,o))fail('Recovery approval source is stale. Investigate again.',409);}
export function recordRecoveryDecision(s,p,now){
 if(!p.caseId)return;const c=s.recoveryCases.find(c=>c.id===p.caseId);c.revision++;
 if(p.status==='rejected'){c.status='needs-replan';c.rejection=p.reasonRejected;c.summary=`Manager rejected this plan: ${p.reasonRejected}. Replan before any execution.`;}
 else{c.status='ready-to-execute';c.approvedSnapshot=recoverySource(s,s.orders.find(o=>o.id===p.orderId));c.summary='Manager approval is recorded. Start execution to observe the current environment.';}
 record(c,now,'planning','record-manager-decision',[p.id],{status:p.status,reason:p.reasonRejected??p.reason},'The human decision changes the permitted next step.',p.status);
}
export function executeRecovery(s,input,now){
 const c=select(s,input),o=s.orders.find(o=>o.id===c.orderId),p=s.approvals.find(p=>p.id===c.approvalId);
 if(!p||p.status!=='approved')fail('Manager approval is required before execution.',409);
 if(c.executionAttempts>=8)fail('Execution limit reached. Ask the manager for a new investigation.',409);c.executionAttempts++;
 record(c,now,'execution','check-manager-approval',[p.id],{status:p.status,kind:p.kind},'Check authority before stock reservations or task changes.');
 if(o.status==='on-hold'&&p.kind==='hold'){c.status='on-hold';c.summary='The approved hold is in effect. No stock correction or physical tasks are permitted for this order.';record(c,now,'execution','verify-outcome',[o.id,c.sku],{orderStatus:o.status,onHand:s.inventory.find(i=>i.sku===c.sku).onHand},c.summary,'on-hold');c.revision++;return details(c);}
 if(o.status==='released'){const tasks=s.tasks.filter(t=>t.orderId===o.id);if(!tasks.length||tasks.some(t=>t.status!=='completed')||o.reserved)fail('Released order failed the completion integrity check.',409);c.status='resolved';c.summary='Shipment release and completed work are verified. The agent made no extra inventory change.';record(c,now,'execution','verify-outcome',[o.id,c.sku],{orderStatus:o.status,tasks:tasks.length,stock:s.inventory.find(i=>i.sku===c.sku)},c.summary,'resolved');c.revision++;return details(c);}
 if(o.status!=='open')fail('This order cannot resume fulfillment.',409);
 const existing=s.tasks.filter(t=>t.orderId===o.id);
 if(!existing.length&&c.approvedSnapshot!==recoverySource(s,o)){c.status='needs-reinvestigation';c.blocker='Stock or evidence changed after approval. Investigate again before tasks.';c.summary=c.blocker;record(c,now,'execution','read-current-environment',[o.id,c.sku],{changed:true},c.blocker,'paused');c.revision++;return {...details(c),outcome:'escalated'};}
 s.decisions=assessOrders(s);record(c,now,'execution','check-order-readiness',[o.id,c.sku],s.decisions.find(d=>d.orderId===o.id),'Use current stock rather than the earlier shortage result.');
 let tasks;try{tasks=planTasks(s,o.id);if(!tasks.length)fail('No enabled task types exist.');}catch(e){c.status='needs-support';c.blocker=e.message;c.summary=`Execution paused: ${e.message} Ask IT or the manager to restore staffing or configuration, then explicitly resume.`;record(c,now,'execution','assign-warehouse-work',s.workers.map(w=>w.id),{available:s.workers.filter(w=>w.available).map(w=>w.id),error:e.message},c.summary,'paused');c.revision++;return {...details(c),outcome:'escalated'};}
 if(!existing.length){for(const line of o.lines){const inv=s.inventory.find(i=>i.sku===line.sku);if(!inv||inv.onHand-inv.reserved<line.quantity)fail('Stock is no longer available.',409);}for(const line of o.lines)s.inventory.find(i=>i.sku===line.sku).reserved+=line.quantity;o.reserved=true;s.tasks.push(...tasks);}
 else for(const task of existing){if(task.status==='completed')continue;if(!s.workers.find(w=>w.id===task.workerId)?.available){const next=tasks.find(t=>t.id===task.id);if(next){task.workerId=next.workerId;task.reason=next.reason;}}}
 c.status='recovered';c.blocker=null;c.revision++;c.summary='Fulfillment work is assigned and stock is reserved once. Staff must complete physical tasks; manager shipment approval remains required.';
 record(c,now,'execution','assign-warehouse-work',[o.id,...tasks.map(t=>t.id)],s.tasks.filter(t=>t.orderId===o.id),'Observe eligible staff and reuse stable task IDs on retries.','applied');
 record(c,now,'execution','verify-outcome',[o.id,c.sku],{reserved:o.reserved,tasks:s.tasks.filter(t=>t.orderId===o.id).length,stock:s.inventory.find(i=>i.sku===c.sku)},c.summary,'recovered');return details(c);
}
