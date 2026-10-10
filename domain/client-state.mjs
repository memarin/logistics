export function isCurrentVersion(current,incoming){return Number.isSafeInteger(incoming)&&incoming>=current;}
export function guideStepComplete(s,step){
 const c=s.recoveryCases?.find(c=>c.orderId==='ORD-1043'),o=s.orders.find(o=>o.id==='ORD-1043'),tasks=s.tasks.filter(t=>t.orderId===o?.id);
 const finished=['resolved','on-hold'].includes(c?.status),released=o?.status==='released';
 switch(step){
 case 1:return Boolean(c)&&c.status!=='needs-reinvestigation';
 case 2:return c?.verification?.status==='completed';
 case 3:return Boolean(c?.approvalId&&s.approvals.some(p=>p.id===c.approvalId&&p.status!=='rejected'));
 case 4:return ['ready-to-execute','recovered','needs-support','needs-reinvestigation','resolved','on-hold'].includes(c?.status);
 case 5:return ['recovered','resolved','on-hold'].includes(c?.status);
 case 6:return finished||released||tasks.some(t=>t.typeId==='pick'&&t.status==='completed');
 case 7:return finished||released||tasks.some(t=>t.typeId==='pack'&&t.status==='completed');
 case 8:return finished||released||s.approvals.some(p=>p.orderId===o?.id&&p.kind==='release'&&['pending','approved'].includes(p.status));
 case 9:return finished||released;
 case 10:return finished;
 default:return false;
 }
}
export function nextGuideStep(s,index){
 const c=s.recoveryCases?.find(c=>c.orderId==='ORD-1043');
 if(index===4&&c?.status==='needs-replan')return 3;
 if(index===5){if(c?.status==='needs-support')return 5;if(c?.status==='needs-reinvestigation')return 1;if(c?.status==='on-hold')return 10;}
 return Math.min(index+1,11);
}
