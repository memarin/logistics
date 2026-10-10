export const agenticFeatures=[
 {id:'investigation',title:'Evidence-led stock investigation',lookFor:'Read linked receipts, movements, and shift notes. Compare possible causes and request a physical inspection.',humanBoundary:'Staff confirm quantity and condition. The agent cannot invent missing evidence.'},
 {id:'planning',title:'Fulfillment recovery planning',lookFor:'Compare correction, hold, and another inspection against verified evidence. Replan after a rejection.',humanBoundary:'The manager approves the exact correction or hold before a protected change.'},
 {id:'execution',title:'Adaptive execution and outcome checks',lookFor:'Check current stock and staffing, pause on blockers, resume explicitly, and verify actual shipment release.',humanBoundary:'IT or the manager restores availability. Staff complete physical work.'}
];
export const guideSteps=[
 {title:'Meet the recovery workspace',text:'Recover ORD-1043 through evidence, human decisions, and explicit agent steps.',button:'Start guided demo',role:'manager',actor:'reviewer'},
 {title:'Investigate the stock discrepancy',text:'Compare receipts, posted stock, and a shift note. The received kits need a physical inspection.',button:'Investigate stock discrepancy',role:'manager',actor:'agent',action:'investigate',feature:'investigation'},
 {title:'Confirm physical evidence',text:'Enter the synthetic count and inspect kit condition. Try damaged stock to follow the hold path.',button:'Review staff inspection',role:'staff',actor:'human',action:'verify-evidence',feature:'investigation',review:'evidence'},
 {title:'Compare recovery options',text:'Use verified quantity and condition to compare a correction, a hold, and another inspection.',button:'Plan recovery',role:'manager',actor:'agent',action:'plan-recovery',feature:'planning'},
 {title:'Decide the recovery proposal',text:'Approve the exact change, or reject with a reason. A rejection requires a new plan.',button:'Review recovery proposal',role:'manager',actor:'human',action:'approve',feature:'planning'},
 {title:'Execute or pause recovery',text:'Inspect the current environment. No available staff causes a pause. Restore availability and explicitly resume.',button:'Execute approved recovery',role:'manager',actor:'agent',action:'execute-recovery',feature:'execution'},
 {title:'Record the physical pick',text:'Staff perform physical work. Confirm the simulated pick before the pack.',button:'Review pick completion',role:'staff',actor:'human',action:'complete',typeId:'pick',feature:'execution'},
 {title:'Record the physical pack',text:'The pack depends on the completed pick. The agent cannot perform warehouse work.',button:'Review pack completion',role:'staff',actor:'human',action:'complete',typeId:'pack',feature:'execution'},
 {title:'Prepare shipment approval',text:'Inspect completed tasks and request manager shipment approval.',button:'Review shipment request',role:'staff',actor:'human',action:'request-release',feature:'execution'},
 {title:'Approve shipment release',text:'Approve the exact release. Stock consumption occurs once.',button:'Review shipment release',role:'manager',actor:'human',action:'approve',kind:'release',feature:'execution'},
 {title:'Verify the actual outcome',text:'Read completed work and shipment status. The agent records the observed result without another stock change.',button:'Verify recovery outcome',role:'manager',actor:'agent',action:'execute-recovery',feature:'execution'},
 {title:'Review the recovery record',text:'Inspect evidence, rejected options, tool results, human decisions, and the final outcome.',button:'Review the audit log',role:'manager',actor:'reviewer'}
].map(s=>({...s,orderId:'ORD-1043',contribution:s.actor==='agent'?agenticFeatures.find(f=>f.id===s.feature)?.lookFor:undefined,humanBoundary:s.actor==='agent'?agenticFeatures.find(f=>f.id===s.feature)?.humanBoundary:'Select the required role and explicitly confirm this demo step.'}));
export function buildGuideInput(index,state,review={}){
 const step=guideSteps[index];if(!step)throw new Error('Unknown guide step.');
 if(step.actor==='human'&&review.confirmed!==true)throw new Error('Confirm the human intervention before this action.');
 const fields={orderId:step.orderId};
 if(['verify-evidence','plan-recovery','execute-recovery'].includes(step.action)){
  const c=state.recoveryCases?.find(c=>c.orderId===step.orderId);if(!c)throw new Error('The recovery case is missing. Start an investigation.');
  fields.caseId=c.id;fields.expectedRevision=c.revision;
 }
 if(step.action==='verify-evidence'){
  if(!Number.isSafeInteger(review.count)||review.count<0||review.count>1000)throw new Error('Enter a whole-number count from 0 to 1000.');
  if(!['usable','damaged'].includes(review.condition))throw new Error('Select usable or damaged condition.');
  Object.assign(fields,{confirmed:true,count:review.count,condition:review.condition,note:review.note??''});
 }
 if(step.action==='complete'){
  const t=state.tasks.find(t=>t.orderId===step.orderId&&t.typeId===step.typeId);if(!t)throw new Error('The task is missing. Execute recovery first.');fields.taskId=t.id;
 }
 if(step.action==='approve'){
  const c=state.recoveryCases?.find(c=>c.orderId===step.orderId);
  const p=[...state.approvals].reverse().find(p=>p.orderId===step.orderId&&p.status==='pending'&&(step.kind?p.kind===step.kind:['correction','hold'].includes(p.kind))&&(!c||step.kind||p.id===c.approvalId)&&(!review.approvalId||p.id===review.approvalId));
  if(!p)throw new Error('The approval request is missing. Inspect a current proposal.');fields.approvalId=p.id;
 }
 return fields;
}
