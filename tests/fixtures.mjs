export const NOW = '2026-10-10T08:00:00.000Z';
export function fixture() {
 return {runId:'run-test', orders:[
  {id:'ORD-1042',customer:'Harbor Retail',due:'2026-10-10',status:'open',lines:[{sku:'SKU-A',quantity:6}],reserved:false},
  {id:'ORD-1043',customer:'Field Supply',due:'2026-10-11',status:'open',lines:[{sku:'SKU-B',quantity:5}],reserved:false}],
 inventory:[{sku:'SKU-A',name:'Transit cartons',onHand:12,reserved:0,unit:'units'},{sku:'SKU-B',name:'Packing kits',onHand:2,reserved:0,unit:'units'}],
 workers:[{id:'mia',name:'Mia Chen',available:true,workload:0},{id:'noah',name:'Noah Patel',available:true,workload:2},{id:'ivy',name:'Ivy Brooks',available:false,workload:0}],
 taskTypes:[{id:'pick',name:'Pick',enabled:true,workers:['mia','noah'],dependsOn:[]},{id:'pack',name:'Pack',enabled:true,workers:['mia','noah'],dependsOn:['pick']}],
 tasks:[],decisions:[],exceptions:[],approvals:[],audit:[],permissions:{assessment:true,coordination:true,exceptions:true}};
}
