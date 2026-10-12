import {DISTRICTS,districtForPosition,routeDistance,routePoints} from './simulation.js';

export const DECISION_CATALOG={
  dispatch:{nearest:'Nearest rider',available:'Available rider',route:'Route fit'},
  batching:{off:'Batching off',conservative:'Conservative batching',aggressive:'Aggressive batching'},
  protection:{sla:'Protect SLA',cost:'Protect cost',value:'Protect high-value customers'},
  demand:{normal:'Normal demand',rush:'Dinner Rush'},
  weather:{clear:'Clear skies',rain:'Heavy rain'},
  optimization:{label:'Operating objective'},
  order:{label:'Send a new order'}
};
const copy=value=>JSON.parse(JSON.stringify(value));
const differs=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);
const near=(a,b)=>Math.abs((a??0)-(b??0))>.025;
const metric=(label,before,after,unit='')=>({label,before,after,unit});
const reasons={
  'dispatch:nearest':'The eligible rider with the shortest road distance to pickup is selected.',
  'dispatch:available':'Idle or low-load riders lead the match; fewer existing stops can outweigh a longer approach.',
  'dispatch:route':'Matching weighs added route distance, existing stops, and the effect on customer deadlines.',
  'batching:off':'New assignments use one primary order per rider. Existing pickups and batches stay intact.',
  'batching:conservative':'A second order needs nearby endpoints, spare capacity, and a deadline buffer for every stop.',
  'batching:aggressive':'Wider endpoint thresholds admit up to four orders, while keeping hard capacity and pickup order.',
  'protection:sla':'Small deadline slack leads the queue; feasible later stops favor threatened promises.',
  'protection:cost':'Compatible orders share travel. This saves empty mileage, but adds customer stops.',
  'protection:value':'Premium status and actual order value lead the queue and feasible upcoming stops.',
  'demand:rush':'The authored dinner burst adds real nearby orders and increases the arrival rate.',
  'demand:normal':'The arrival timer returns to the normal rate; the existing queue is still served.',
  'weather:rain':'Rain applies a 0.65 travel-speed multiplier and removes two riders from new assignments.',
  'weather:clear':'The weather multiplier is removed and all twelve riders become available again.',
  'order:send':'This new order enters the same preparation, matching, route, and deadline model.'
};

export function captureState(sim){
  const ranked=sim.waitingQueue(),rank=new Map(ranked.map((o,i)=>[o.id,i+1]));
  return {
    now:sim.now,policy:{dispatch:sim.dispatch,batching:sim.batching,priority:sim.priority,optimization:sim.optimization,weather:sim.weather,demand:sim.demand},
    metrics:{...sim.metrics()},
    riders:Object.fromEntries(sim.riders.map(r=>[r.id,{id:r.id,position:{...r.position},status:r.status,available:r.available,orders:[...r.orders],stops:copy(r.stops),distance:routeDistance(r.position,r.stops),speed:r.speed*sim.speedMultiplier(r.position),finish:sim.planTime(r).finish,points:routePoints(r.position,r.stops)}])),
    orders:Object.fromEntries(sim.activeOrders().map(o=>[o.id,{id:o.id,status:o.status,riderId:o.assignedRider,merchantId:o.merchant.id,pickup:{...o.merchant.position},customer:{...o.customer},merchant:o.merchant.name,priority:o.priority,value:o.value,eta:o.eta,buffer:o.buffer,promisedAt:o.promisedAt,risk:o.risk,rank:rank.get(o.id)??null,districtId:districtForPosition(o.customer).id}]))
  };
}

export function deriveImpact(before,after,decision){
  const affectedRiderIds=[],changedRoutes=[],priorRoutes={},updatedRoutes={},riderChanges={};
  for(const [id,r] of Object.entries(after.riders)){
    const old=before.riders[id];
    const routeChanged=!old||differs(old.stops,r.stops);
    if(routeChanged){changedRoutes.push(id);if(old?.stops.length)priorRoutes[id]=old.points;updatedRoutes[id]=r.points;}
    if(routeChanged||old?.available!==r.available||near(old?.speed,r.speed)){affectedRiderIds.push(id);riderChanges[id]={before:old,after:r};}
  }
  const affectedOrderIds=[],orderChanges={},promoted=[],displaced=[],beneficiaries=[],delayed=[];
  for(const [id,o] of Object.entries(after.orders)){
    const old=before.orders[id],rankChanged=old?.rank&&o.rank&&old.rank!==o.rank;
    const relevantETA=changedRoutes.includes(o.riderId)||decision.type==='weather'||decision.type==='demand'||!o.riderId;
    if(!old||old.riderId!==o.riderId||old.status!==o.status||relevantETA&&near(old.eta,o.eta)||rankChanged){
      affectedOrderIds.push(id);orderChanges[id]={before:old,after:o};
      if(old&&o.eta<old.eta-.025)beneficiaries.push(id);
      if(old&&o.eta>old.eta+.025)delayed.push(id);
      if(rankChanged&&o.rank<old.rank)promoted.push(id);
      if(rankChanged&&o.rank>old.rank)displaced.push(id);
    }
  }
  const newAssignments=affectedOrderIds.filter(id=>!before.orders[id]?.riderId&&after.orders[id].riderId);
  const policyChanged=differs(before.policy,after.policy),environment=decision.type==='weather'||decision.type==='demand'||decision.type==='order';
  let effectStatus=changedRoutes.length||newAssignments.length||environment&&affectedOrderIds.length||decision.type==='weather'&&affectedRiderIds.length?'applied':policyChanged?'pending_eligible_orders':'no_change_possible';
  if(decision.type==='order'&&affectedOrderIds.length)effectStatus='applied';
  const affectedDistrictIds=[...new Set(affectedOrderIds.map(id=>after.orders[id].districtId))];
  const focusId=newAssignments.length?after.orders[newAssignments[0]].riderId:changedRoutes[0]??affectedRiderIds[0];
  const focus=focusId?after.riders[focusId]:null,prior=focusId?before.riders[focusId]:null;
  let metricDiffs=[];
  if(decision.type==='weather'){
    const speed=snapshot=>Object.values(snapshot.riders).reduce((n,r)=>n+r.speed,0)/Object.keys(snapshot.riders).length;
    metricDiffs=[metric('Rider speed',speed(before),speed(after),'km/h'),metric('Available riders',before.metrics.available,after.metrics.available),metric('SLA at risk',before.metrics.risk,after.metrics.risk)];
  }else if(decision.type==='demand')metricDiffs=[metric('Active orders',before.metrics.active,after.metrics.active),metric('Waiting orders',before.metrics.waiting,after.metrics.waiting),metric('On-time forecast',before.metrics.onTime,after.metrics.onTime,'%')];
  else if(focus){
    metricDiffs=[metric(`${focusId} load`,prior?.orders.length??0,focus.orders.length,'orders'),metric(`${focusId} route`,prior?.distance??0,focus.distance,'km')];
    const id=newAssignments[0]??beneficiaries[0]??delayed[0];
    if(id&&before.orders[id])metricDiffs.push(metric(`#${id} SLA buffer`,before.orders[id].buffer,after.orders[id].buffer,'min'));
    else metricDiffs.push(metric('Waiting orders',before.metrics.waiting,after.metrics.waiting));
  }else metricDiffs=[metric('Waiting orders',before.metrics.waiting,after.metrics.waiting),metric('SLA at risk',before.metrics.risk,after.metrics.risk),metric('On-time forecast',before.metrics.onTime,after.metrics.onTime,'%')];
  const label=decision.type==='optimization'?`${decision.option}% delivery efficiency`:(DECISION_CATALOG[decision.type]?.[decision.option]??decision.label??String(decision.option));
  let whatChanged=newAssignments.length?`${newAssignments.length} ${newAssignments.length===1?'order was':'orders were'} assigned to ${[...new Set(newAssignments.map(id=>after.orders[id].riderId))].join(', ')}.`:changedRoutes.length?`${changedRoutes.join(', ')} kept the current stop and changed later waypoints.`:promoted.length?`${promoted.length} waiting orders moved ahead; ${displaced.length} moved back.`:effectStatus==='pending_eligible_orders'?'The policy is active. Routes will change at the next eligible assignment.':'No eligible route changed at this moment.';
  if(decision.type==='weather')whatChanged=before.policy.weather===after.policy.weather?'The weather was already set to this state.':`Travel speeds and live ETAs changed; ${after.metrics.available} riders can accept new orders. Demand counts are unchanged.`;
  if(decision.type==='demand')whatChanged=decision.option==='rush'?`${after.metrics.active-before.metrics.active} real orders entered the city. The arrival timer is now in dinner rush.`:'New demand slows to the normal rate; existing deliveries continue.';
  if(decision.type==='order')whatChanged=newAssignments.length?`Order #${newAssignments[0]} entered ${focusId}’s actual route.`:'A real order entered the queue and is waiting for an eligible rider.';
  let rationale=reasons[`${decision.type}:${decision.option}`]??decision.rationale??'The chosen rule was applied to the current eligible simulation state.';
  if(decision.type==='optimization')rationale=`The ${decision.option}% objective sets continuous distance, load, detour, and SLA scoring weights. ${after.policy.batching} batching applies to new orders.`;
  if(decision.type==='dispatch'&&focus){
    const assigned=after.orders[newAssignments[0]];
    if(assigned){const pickupKm=Math.abs(focus.position.x-assigned.pickup.x)*.12+Math.abs(focus.position.z-assigned.pickup.z)*.12;rationale+=` ${focusId} is ${pickupKm.toFixed(2)} km from pickup with ${prior.orders.length} existing orders.`;}
  }
  const benefit=beneficiaries.length?`${beneficiaries.length} customer ${beneficiaries.length===1?'ETA improved':'ETAs improved'} (${beneficiaries.slice(0,2).map(id=>'#'+id).join(', ')}).`:newAssignments.length?`${newAssignments.length} queued promises now have an assigned rider.`:promoted.length?`${promoted.length} eligible orders moved forward in the dispatch queue.`:decision.type==='weather'?'The same customer promises now use the actual travel conditions.':decision.type==='demand'?'The model and demand layer show the real queue pressure.':after.policy.batching==='off'?'Future orders get a single-order assignment policy.':'Future matching uses the selected route and capacity policy.';
  const tradeoff=delayed.length?`${delayed.length} customer ${delayed.length===1?'ETA increased':'ETAs increased'} (${delayed.slice(0,2).map(id=>'#'+id).join(', ')}).`:displaced.length?`${displaced.length} standard or less urgent orders moved back in the queue.`:focus&&focus.distance>(prior?.distance??0)+.025?`The affected route adds ${(focus.distance-(prior?.distance??0)).toFixed(2)} km; completed cost follows actual movement.`:decision.type==='weather'?(after.policy.weather==='clear'?'Clearing weather cannot refund the time customers have already waited.':'Less supply and smaller deadline buffers constrain dispatch.'):after.policy.batching==='off'?'Existing batches continue; new orders may wait for an idle rider.':'Sharing routes can add stops and waiting; existing work stays valid.';
  return {decisionId:decision.id,type:decision.type,selectedOptionId:decision.option,label,at:after.now,rationale,whatChanged,benefit,tradeoff,effectStatus,policyChanged,affectedRiderIds,affectedOrderIds,affectedDistrictIds,priorRoutes,updatedRoutes,changedRoutes,newAssignments,orderChanges,riderChanges,promoted,displaced,beneficiaries,delayed,metricDiffs,policy:after.policy,visualKind:decision.type==='weather'?'weather':decision.type==='protection'&&decision.option!=='cost'?'priority':after.policy.batching!=='off'&&newAssignments.some(id=>after.riders[after.orders[id].riderId].orders.length>1)?'batch':newAssignments.length?'assignment':'policy'};
}

export class DecisionFeedback {
  constructor(sim){this.sim=sim;this.sequence=0;this.last=null;this.dedupe=new Map();sim.captureDecisionState=()=>captureState(sim);}
  reset(){this.sequence=0;this.last=null;this.dedupe.clear();this.sim.lastDecisionImpact=null;this.sim.decisionLog=[];this.sim.awaitingDecisionEffect=false;}
  apply(type,option,{key,mutation,label,rationale}={}){
    if(key&&this.dedupe.has(key))return this.dedupe.get(key);
    const before=captureState(this.sim);this.sim.awaitingDecisionEffect=false;
    let result,comparison=[];
    if(type==='dispatch'){
      const order=this.sim.getOrder(this.sim.heldOrder);
      if(order)for(const strategy of ['nearest','available','route']){const candidates=this.sim.candidates(order,strategy,true),chosen=strategy==='available'?(candidates.find(c=>!c.rider.orders.length)??candidates[0]):candidates[0];if(chosen)comparison.push({strategy,riderId:chosen.rider.id});}
    }
    if(type==='dispatch')result=this.sim.chooseDispatch(option);
    else if(type==='batching')this.sim.chooseBatching(option);
    else if(type==='protection')this.sim.chooseProtection(option);
    else if(type==='optimization')this.sim.setOptimization(Number(option));
    else if(type==='weather'){if(option==='rain')this.sim.heavyRain();else{this.sim.weather='clear';this.sim.riders.forEach(r=>r.available=true);this.sim.refreshEstimates();}}
    else if(type==='demand'){if(option==='rush')this.sim.dinnerRush();else{this.sim.demand='normal';for(const id of this.sim.authoredBatchIds){const o=this.sim.getOrder(id);if(o)o.held=false;}this.sim.authoredBatchIds=[];this.sim.refreshEstimates();}}
    else if(type==='order'){result=this.sim.createOrder();if(result)this.sim.dispatchWaiting();this.sim.refreshEstimates();}
    else if(mutation){result=mutation(this.sim);this.sim.refreshEstimates();}
    else throw new Error(`Decision ${type} needs an explicit model mutation.`);
    const decision={id:`D${++this.sequence}`,type,option,label,rationale};
    const impact=deriveImpact(before,captureState(this.sim),decision);
    if(type==='order'&&result){impact.focusOrderId=result.id;impact.whatChanged=result.assignedRider?`New order #${result.id} entered ${result.assignedRider}’s actual route.`:`New order #${result.id} entered the waiting queue. Existing eligible orders keep their dispatch priority.`;const after=this.sim.metrics();impact.metricDiffs=[metric('Active orders',before.metrics.active,after.active),metric('Waiting orders',before.metrics.waiting,after.waiting),metric('On-time forecast',before.metrics.onTime,after.onTime,'%')];}
    if(type==='dispatch'&&result?.order&&!result.rider){impact.effectStatus='pending_eligible_orders';impact.pendingOrderId=result.order.id;impact.whatChanged=`Order #${result.order.id} is waiting for eligible rider capacity. The selected dispatch rule is active.`;impact.benefit='The order can be matched when a rider becomes eligible.';impact.tradeoff='No rider is available to begin this delivery yet.';}
    if(type==='dispatch'&&result?.rider){const shared=comparison.filter(c=>c.riderId===result.rider.id&&c.strategy!==option);if(shared.length)impact.rationale+=` ${shared.map(c=>DECISION_CATALOG.dispatch[c.strategy]).join(' and ')} also selects ${result.rider.id} in this state; the eligible match overlaps.`;}
    if(type==='order'&&!result){impact.whatChanged='No order was added: the city already has 110 active promises.';impact.benefit='Existing orders remain tracked without exceeding the visual workload cap.';impact.tradeoff='Wait for a delivery to finish before adding another order.';}
    this.sim.decisionLog.push({id:decision.id,type,option,label:impact.label,at:this.sim.now});
    this.commit(impact);const response={impact,result};if(key)this.dedupe.set(key,response);return response;
  }
  commit(impact){this.last=impact;this.sim.lastDecisionImpact=impact;this.sim.awaitingDecisionEffect=impact.effectStatus==='pending_eligible_orders';}
  observe(events){
    if(!this.last||!this.sim.awaitingDecisionEffect)return null;
    const qualifying=events.find(e=>e.type==='assigned'&&e.beforeState&&(!this.last.pendingOrderId||e.orderId===this.last.pendingOrderId));
    if(!qualifying)return null;
    const decision={id:this.last.decisionId,type:this.last.type,option:this.last.selectedOptionId,label:this.last.label,rationale:this.last.rationale};
    const impact=deriveImpact(qualifying.beforeState,captureState(this.sim),decision);
    if(!impact.newAssignments.length&&!impact.changedRoutes.length)return null;
    impact.whatChanged=`Next eligible assignment: ${impact.whatChanged}`;impact.realized=true;impact.effectStatus='applied';this.commit(impact);return impact;
  }
  replay(){return this.last;}
}

export function heatState(sim){return DISTRICTS.map(d=>{const orders=sim.districtOrders(d),count=orders.length;return {district:d,count,waiting:orders.filter(o=>o.status==='waiting').length,risk:orders.filter(o=>o.buffer<3).length,level:count===0?'none':count>=12?'high':count>=6?'medium':'low',intensity:count?Math.min(1,.35+count/20):0};});}
