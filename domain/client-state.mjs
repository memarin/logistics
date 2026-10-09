export function isCurrentVersion(current,incoming){return Number.isSafeInteger(incoming)&&incoming>=current;}
export function guideStepComplete(s,step){
 const first=s.orders.find(o=>o.id==='ORD-1042'),second=s.orders.find(o=>o.id==='ORD-1043');
 const closed=o=>o&&o.status!=='open';
 const tasks=s.tasks.filter(t=>t.orderId==='ORD-1042');
 const stock=s.inventory.find(i=>i.sku==='SKU-B');
 const corrected=closed(second)||Boolean(stock&&stock.onHand-stock.reserved>=5)||s.approvals.some(p=>p.kind==='correction'&&p.orderId==='ORD-1043'&&p.status==='approved');
 switch(step){
 case 2:return closed(first)||tasks.length>0;
 case 3:return closed(first)||tasks.some(t=>t.typeId==='pick'&&t.status==='completed');
 case 4:return closed(first)||tasks.some(t=>t.typeId==='pack'&&t.status==='completed');
 case 5:return closed(first)||s.approvals.some(p=>p.orderId==='ORD-1042'&&p.kind==='release'&&['pending','approved'].includes(p.status));
 case 6:return closed(first);
 case 7:return corrected||s.approvals.some(p=>p.kind==='correction'&&p.orderId==='ORD-1043'&&p.status==='pending');
 case 8:return corrected;
 case 10:return closed(second)||s.tasks.some(t=>t.orderId==='ORD-1043');
 default:return false;
 }
}
