export function seedEvidence(){return [
 {id:'RCPT-B-004',type:'receipt',sku:'SKU-B',quantity:4,posted:false,time:'2026-10-10T07:30:00.000Z',text:'Four packing kits were received. Receipt status: not posted. Condition has not been checked.'},
 {id:'NOTE-NORTH-01',type:'shift-note',sku:'SKU-B',time:'2026-10-10T07:40:00.000Z',text:'Four kits arrived, but the shelf scan failed. The wrapping looks wet. Please check the contents before allocation.'},
 {id:'TX-B-02',type:'transaction',sku:'SKU-B',quantity:2,time:'2026-10-10T07:00:00.000Z',text:'Opening balance: 2 usable kits. No later receipt transaction exists.'}
];}
