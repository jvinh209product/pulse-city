export const ROAD = [-18, -12, -6, 0, 6, 12, 18];
export const KM_PER_UNIT = 0.12;
export const MERCHANTS = [
  { id:'M1', name:'Burger Hub', kind:'Restaurant', position:{x:-6,z:0}, district:'Food Quarter' },
  { id:'M2', name:'Miso Kitchen', kind:'Restaurant', position:{x:0,z:6}, district:'Food Quarter' },
  { id:'M3', name:'Green Basket', kind:'Grocery', position:{x:-12,z:-6}, district:'West Village' },
  { id:'M4', name:'Daily Market', kind:'Convenience store', position:{x:12,z:0}, district:'Downtown' },
  { id:'M5', name:'Westside Depot', kind:'Warehouse', position:{x:-18,z:12}, district:'Warehouse District' },
  { id:'M6', name:'Little Oven', kind:'Restaurant', position:{x:6,z:-12}, district:'Downtown' }
];
export const DISTRICTS = [
  {id:'food',name:'Food Quarter',x:-5,z:3, radius:8},
  {id:'downtown',name:'Downtown',x:10,z:-10,radius:9},
  {id:'village',name:'West Village',x:-12,z:-10,radius:9},
  {id:'residential',name:'Eastside',x:9,z:12,radius:10},
  {id:'warehouse',name:'Warehouse District',x:-14,z:12,radius:8}
];
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export const clonePosition=p=>({x:p.x,z:p.z});
export const districtForPosition=p=>DISTRICTS.reduce((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)<=Math.hypot(p.x-b.x,p.z-b.z)?a:b);
export const routeDistance=(position,stops)=>stops.reduce((sum,s,i)=>sum+distance(i?stops[i-1].position:position,s.position)*KM_PER_UNIT,0);
export function routePoints(position,stops){let last=position;const points=[clonePosition(position)];for(const stop of stops){points.push(...roadPath(last,stop.position).slice(1));last=stop.position;}return points;}
export function roadPath(a,b) {
  const points=[clonePosition(a)];
  const onHorizontal=ROAD.some(z=>Math.abs(z-a.z)<0.02);
  if(onHorizontal) points.push({x:b.x,z:a.z});
  else points.push({x:a.x,z:b.z});
  points.push(clonePosition(b));
  return points.filter((p,i,all)=>!i||distance(p,all[i-1])>.001);
}
export function createRandom(seed=4823) {return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

export class Simulation {
  constructor(seed=4823) {this.seed=seed;this.reset();}
  reset() {
    this.random=createRandom(this.seed);this.now=0;this.running=true;this.weather='clear';
    this.demand='normal';this.surgeStart=null;this.batching='off';this.dispatch='available';this.priority='balanced';
    this.optimization=50;this.orders=[];this.riders=[];this.decisions=[];this.events=[];
    this.nextOrderId=1080;this.arrivalClock=0;this.dispatchClock=0;this.peakOrders=18;
    this.idleCost=0;this.reservedRider=true;this.heldOrder=null;this.authoredBatchIds=[];
    this.lastDecisionImpact=null;this.decisionLog=[];this.awaitingDecisionEffect=false;
    this.completed=Array.from({length:50},(_,i)=>({duration:19+(i%7),onTime:i<47,cost:2.5+(i%7)*.1,premium:i%5===0}));
    for(let i=0;i<12;i++) this.riders.push({id:`R${String(i+1).padStart(2,'0')}`,position:{x:ROAD[(i*3+2)%7],z:ROAD[(i*2+1)%7]},capacity:4,orders:[],stops:[],path:[],pathIndex:0,status:'idle',speed:26,available:true,waitUntil:0,distanceTravelled:0,busyTime:0,totalTime:0});
    for(let i=0;i<18;i++) this.createOrder({initial:true});
    // A deliberately busy nearby rider and an idle reserve reveal the first trade-off.
    for(let i=0;i<3;i++) this.assign(this.orders[i],this.riders[2],true);
    for(let i=3;i<13;i++) {const r=this.riders[(i+1)%12];if(r.id!=='R08')this.assign(this.orders[i],r,true);}
    this.refreshEstimates();this.initialMetrics=this.metrics();
  }
  createOrder({initial=false,held=false}={}) {
    if(this.activeOrders().length>=110)return null;
    const rnd=this.random;
    const restaurantFocus=this.demand==='rush'&&rnd()<.76;
    const m=restaurantFocus?MERCHANTS[Math.floor(rnd()*2)]:MERCHANTS[Math.floor(rnd()*MERCHANTS.length)];
    let customer={x:ROAD[Math.floor(rnd()*7)],z:ROAD[Math.floor(rnd()*7)]};
    if(distance(customer,m.position)<6)customer={x:customer.x===18?-12:18,z:customer.z};
    const created=initial? -3-rnd()*7:this.now;
    const premium=rnd()<.22;
    const order={id:`A${this.nextOrderId++}`,merchant:m,customer,customerName:`${customer.x>0?'Eastside':'West Village'} · Block ${1+Math.floor(rnd()*16)}`,createdAt:created,pickupReadyAt:created+3+rnd()*5,promisedAt:created+32+rnd()*10,priority:premium?'Priority':'Standard',value:Math.round(12+rnd()*62),assignedRider:null,status:'waiting',eta:this.now+22,buffer:8,risk:'healthy',travelCharge:0,held,distance:distance(m.position,customer)*KM_PER_UNIT};
    this.orders.push(order);this.peakOrders=Math.max(this.peakOrders,this.activeOrders().length);this.refreshEstimates();return order;
  }
  activeOrders() {return this.orders.filter(o=>o.status!=='delivered');}
  getOrder(id) {return this.orders.find(o=>o.id===id);}
  getRider(id) {return this.riders.find(r=>r.id===id);}
  planTime(rider,stops=rider.stops) {
    let p=rider.position,t=Math.max(this.now,rider.waitUntil);const etas={};
    for(const stop of stops) {
      t+=distance(p,stop.position)*KM_PER_UNIT/(rider.speed*this.speedMultiplier(p)/60);
      const o=this.getOrder(stop.orderId);
      if(stop.type==='pickup')t=Math.max(t,o.pickupReadyAt)+.5;
      else {t+=.35;etas[o.id]=t;}
      p=stop.position;
    }
    return {finish:t,etas};
  }
  speedMultiplier(p) {return (this.weather==='rain'?.65:1)*(p.x>=0&&p.z<=0&&this.demand==='rush'?.86:1);}
  bestInsertion(order,rider) {
    const pickup={type:'pickup',orderId:order.id,position:order.merchant.position};
    const dropoff={type:'dropoff',orderId:order.id,position:order.customer};
    const current=this.planTime(rider);let best=null;
    // Keep the currently approached stop in place; new work never teleports a rider.
    const first=rider.stops.length?1:0;
    for(let i=first;i<=rider.stops.length;i++)for(let j=i+1;j<=rider.stops.length+1;j++) {
      const stops=rider.stops.slice();stops.splice(i,0,pickup);stops.splice(j,0,dropoff);
      const plan=this.planTime(rider,stops);
      const experience=1-this.optimization/100;
      const urgentWeight=this.priority==='sla'?4.2:.8+experience*3.4;
      let lateness=0;for(const [id,eta]of Object.entries(plan.etas))lateness+=Math.max(0,eta-this.getOrder(id).promisedAt);
      const addedDistance=routeDistance(rider.position,stops)-routeDistance(rider.position,rider.stops);
      const customerDelay=Object.entries(current.etas).reduce((sum,[id,eta])=>sum+Math.max(0,plan.etas[id]-eta),0);
      const score=(plan.finish-current.finish)*(.35+experience)+addedDistance*(1.3-experience)+lateness*urgentWeight+customerDelay*experience;
      if(!best||score<best.score)best={stops,score,eta:plan.etas[order.id],addedTime:plan.finish-current.finish,addedDistance};
    }
    return best;
  }
  candidates(order,strategy=this.dispatch,force=false) {
    const effective=this.priority==='cost'?'aggressive':this.batching;
    const cap=effective==='off'?1:effective==='conservative'?2:4;
    const idle=this.riders.filter(r=>r.available&&r.orders.length===0);
    const reserveCount=this.optimization<32?2:this.optimization>68?0:1;
    const reserved=new Set(reserveCount&&order.buffer>7?idle.slice(-reserveCount).map(r=>r.id):[]);
    return this.riders.filter(r=>r.available&&r.orders.length<(force?r.capacity:cap)&&(!this.reservedRider||r.id!=='R08'||force)&&(force||!reserved.has(r.id))).map(r=>{
      const plan=this.bestInsertion(order,r);
      if(!force&&r.orders.length&&effective==='conservative') {
        const other=this.getOrder(r.orders[0]);
        const fitsExisting=Object.entries(this.planTime(r,plan.stops).etas).every(([id,eta])=>eta<=this.getOrder(id).promisedAt-2);
        if(distance(order.merchant.position,other.merchant.position)>12||distance(order.customer,other.customer)>12||!fitsExisting)return null;
      }
      if(!force&&r.orders.length&&effective==='aggressive'){
        const other=this.getOrder(r.orders[0]);
        if(distance(order.merchant.position,other.merchant.position)>24||distance(order.customer,other.customer)>36)return null;
      }
      const pickupDistance=distance(r.position,order.merchant.position)*KM_PER_UNIT;
      let score=pickupDistance;
      if(strategy==='available')score+=r.orders.length*12;
      if(strategy==='route'){
        const experience=1-this.optimization/100;
        score=plan.addedDistance*(1.3-experience*.6)+plan.addedTime*(.25+experience*.5)+r.orders.length*experience*2+Math.max(0,plan.eta-order.promisedAt)*(1+experience*4);
      }
      if(this.optimization<35&&!(force&&strategy==='nearest'))score+=r.orders.length*4;
      if(this.priority==='sla')score+=Math.max(0,plan.eta-order.promisedAt)*3;
      return {rider:r,plan,score,pickupDistance};
    }).filter(Boolean).sort((a,b)=>a.score-b.score);
  }
  assign(order,rider,force=false) {
    if(!order||order.status!=='waiting'||rider.orders.length>=rider.capacity||!rider.available)return false;
    const beforeState=this.awaitingDecisionEffect?this.captureDecisionState?.():null;
    const plan=this.bestInsertion(order,rider);
    rider.stops=plan.stops;rider.orders.push(order.id);order.assignedRider=rider.id;
    order.status='assigned';order.held=false;
    if(!rider.path.length)this.setPath(rider);
    this.events.push({type:'assigned',riderId:rider.id,orderId:order.id,beforeState});return true;
  }
  setPath(rider) {
    if(!rider.stops.length){rider.path=[];rider.status=rider.available?'idle':'unavailable';return;}
    rider.path=roadPath(rider.position,rider.stops[0].position);rider.pathIndex=rider.path.length>1?1:0;
    rider.status=rider.stops[0].type==='pickup'?'pickup':'delivering';
  }
  arrive(rider) {
    const stop=rider.stops[0];if(!stop)return;
    const o=this.getOrder(stop.orderId);
    if(stop.type==='pickup') {
      if(this.now<o.pickupReadyAt){rider.waitUntil=o.pickupReadyAt;rider.pathIndex=Math.max(0,rider.path.length-1);rider.status='pickup';return;}
      o.status='delivering';rider.waitUntil=this.now+.5;
    } else {
      o.status='delivered';o.deliveredAt=this.now;o.eta=this.now;o.buffer=o.promisedAt-this.now;
      const record={duration:this.now-o.createdAt,onTime:this.now<=o.promisedAt,cost:.95+o.travelCharge*.42,premium:o.priority==='Priority'};
      this.completed.push(record);rider.orders=rider.orders.filter(id=>id!==o.id);
      rider.waitUntil=this.now+.35;this.events.push({type:'delivered',orderId:o.id});
    }
    rider.stops.shift();rider.path=[];this.setPath(rider);
  }
  dispatchWaiting() {
    const waiting=this.waitingQueue();
    for(const o of waiting){const c=this.candidates(o);if(c.length)this.assign(o,c[0].rider);}
  }
  waitingQueue(){
    const speed=this.weather==='rain'?17:26;
    return this.orders.filter(o=>o.status==='waiting'&&!o.held).sort((a,b)=>this.priority==='value'?(b.value+(b.priority==='Priority'?100:0))-(a.value+(a.priority==='Priority'?100:0)):this.priority==='sla'?(a.promisedAt-a.distance/speed*60)-(b.promisedAt-b.distance/speed*60):a.promisedAt-b.promisedAt);
  }
  reorderSafeStops(policy){
    for(const rider of this.riders){
      if(rider.stops.length<3)continue;
      const first=rider.stops[0],remaining=rider.stops.slice(1),proposed=[first];
      const picked=new Set(rider.orders.filter(id=>this.getOrder(id).status==='delivering'));
      if(first.type==='pickup')picked.add(first.orderId);
      let p=first.position;
      while(remaining.length){
        const eligible=remaining.filter(s=>s.type==='pickup'||picked.has(s.orderId));
        if(!eligible.length)break;
        const score=s=>{const o=this.getOrder(s.orderId);return policy==='value'?-(o.value+(o.priority==='Priority'?100:0))+distance(p,s.position)*.2:o.buffer+distance(p,s.position)*.25;};
        eligible.sort((a,b)=>score(a)-score(b));const next=eligible[0];proposed.push(next);remaining.splice(remaining.indexOf(next),1);if(next.type==='pickup')picked.add(next.orderId);p=next.position;
      }
      if(remaining.length)continue;
      const weighted=stops=>Object.entries(this.planTime(rider,stops).etas).reduce((sum,[id,eta])=>{const o=this.getOrder(id),w=policy==='value'?(1+o.value/50)*(o.priority==='Priority'?3:1):1/(Math.max(.5,o.buffer)+1);return sum+(eta-this.now)*w;},0);
      if(weighted(proposed)<weighted(rider.stops)-.01)rider.stops=proposed;
    }
  }
  update(realSeconds) {
    if(!this.running)return;
    const minutes=realSeconds*.52;this.now+=minutes;
    this.arrivalClock+=minutes;this.dispatchClock+=minutes;
    const surgeAge=this.surgeStart===null?0:this.now-this.surgeStart;
    const gap=this.demand==='rush'?(this.weather==='rain'?2.8:surgeAge<12?.62:surgeAge<30?1.30:2.4):3.1;
    while(this.arrivalClock>=gap){this.arrivalClock-=gap;if(this.activeOrders().length<110)this.createOrder();}
    if(this.dispatchClock>.45){this.dispatchClock=0;this.dispatchWaiting();}
    for(const r of this.riders) {
      r.totalTime+=minutes;
      if(!r.stops.length){this.idleCost+=minutes*.045;continue;}
      r.busyTime+=minutes;
      if(this.now<r.waitUntil)continue;
      if(!r.path.length)this.setPath(r);
      let budget=minutes*(r.speed/60/KM_PER_UNIT)*this.speedMultiplier(r.position);
      let guard=0;
      while(budget>0&&r.path.length&&guard++<8) {
        const p=r.path[r.pathIndex],d=distance(r.position,p),travel=Math.min(budget,d);
        if(d>0){const fraction=travel/d;r.position.x+=(p.x-r.position.x)*fraction;r.position.z+=(p.z-r.position.z)*fraction;}
        budget-=travel;r.distanceTravelled+=travel*KM_PER_UNIT;
        for(const id of r.orders)this.getOrder(id).travelCharge+=travel*KM_PER_UNIT/Math.max(1,r.orders.length);
        if(travel>=d-.00001){r.position=clonePosition(p);r.pathIndex++;if(r.pathIndex>=r.path.length){this.arrive(r);break;}}
        else break;
      }
    }
    this.refreshEstimates();this.peakOrders=Math.max(this.peakOrders,this.activeOrders().length);
    if(this.orders.length>300)this.orders=this.orders.filter(o=>o.status!=='delivered'||this.now-o.deliveredAt<3);
  }
  refreshEstimates() {
    const etas={};for(const r of this.riders)Object.assign(etas,this.planTime(r).etas);
    const queue=this.waitingQueue(),rank=new Map(queue.map((o,i)=>[o.id,i]));
    const available=this.riders.filter(r=>r.available);
    const remaining=available.reduce((sum,r)=>sum+Math.max(0,this.planTime(r).finish-this.now),0)/Math.max(1,available.length);
    const queueInterval=Math.max(.4,remaining/Math.max(1,available.length));
    for(const o of this.activeOrders()) {
      o.eta=etas[o.id]??this.now+Math.max(0,o.pickupReadyAt-this.now)+o.distance/(this.weather==='rain'?17:26)*60+6+(rank.get(o.id)??queue.length)*queueInterval;
      o.buffer=o.promisedAt-o.eta;
      o.risk=o.buffer<0?'late':o.buffer<3?'risk':o.buffer<7?'warning':'healthy';
    }
  }
  metrics() {
    const active=this.activeOrders(),n=this.completed.length;
    const recent=this.completed.slice(-50);
    const onTime=(recent.filter(o=>o.onTime).length+active.filter(o=>o.buffer>=0).length)/(recent.length+active.length)*100;
    const average=(recent.reduce((s,o)=>s+o.duration,0)+active.reduce((s,o)=>s+Math.max(0,o.eta-o.createdAt),0))/(recent.length+active.length);
    const cost=this.completed.reduce((s,o)=>s+o.cost,0)/n+this.idleCost/Math.max(10,n-50);
    return {onTime,average,cost,active:active.length,delivered:n-50,utilization:this.riders.filter(r=>r.available&&r.orders.length).length/Math.max(1,this.riders.filter(r=>r.available).length)*100,available:this.riders.filter(r=>r.available).length,risk:active.filter(o=>o.buffer<3).length,waiting:active.filter(o=>o.status==='waiting').length,peak:this.peakOrders};
  }
  startChallenge() {
    const o=this.createOrder({held:true});this.heldOrder=o?.id??null;return o;
  }
  chooseDispatch(strategy) {
    this.dispatch=strategy;this.reservedRider=false;
    const order=this.getOrder(this.heldOrder);
    if(!order||order.status!=='waiting')return {order:order??null,rider:null};
    const candidates=this.candidates(order,strategy,true);
    let chosen=strategy==='available'?(candidates.find(c=>c.rider.orders.length===0)??candidates[0]):candidates[0];
    order.held=false;if(chosen)this.assign(order,chosen.rider,true);
    this.refreshEstimates();this.record('Dispatch',{nearest:'Nearest rider',available:'Available rider',route:'Route fit'}[strategy]);
    return {order,rider:chosen?.rider,eta:order.eta};
  }
  dinnerRush() {
    this.demand='rush';this.surgeStart=this.now;
    // Real, road-valid neighboring orders guarantee a batching comparison in the authored rush.
    const anchor=this.riders.find(r=>r.orders.length===1&&this.getOrder(r.orders[0]).buffer>8);
    const existing=anchor?this.getOrder(anchor.orders[0]):null;
    for(let i=0;i<12;i++){
      const order=this.createOrder({held:i<3});
      if(!order)break;
      if(i<3){order.merchant=existing?.merchant??MERCHANTS[0];const origin=existing?.customer??{x:6,z:6};order.customer={x:Math.min(18,Math.max(-18,origin.x+(i%2?6:0))),z:Math.min(18,Math.max(-18,origin.z+(i%2?0:6)))};order.customerName=`${districtForPosition(order.customer).name} · Rush ${i+1}`;order.distance=distance(order.merchant.position,order.customer)*KM_PER_UNIT;order.pickupReadyAt=this.now+1;order.promisedAt=this.now+45;this.authoredBatchIds.push(order.id);}
    }
    this.refreshEstimates();
  }
  chooseBatching(policy) {this.batching=policy;this.priority='balanced';this.optimization=policy==='off'?20:policy==='aggressive'?85:50;for(const id of this.authoredBatchIds){const o=this.getOrder(id);if(o)o.held=false;}this.authoredBatchIds=[];this.record('Batching',{off:'No batching',conservative:'Conservative',aggressive:'Aggressive'}[policy]);this.dispatchWaiting();this.refreshEstimates();}
  heavyRain() {this.weather='rain';this.riders[10].available=false;this.riders[11].available=false;this.refreshEstimates();}
  chooseProtection(priority) {
    this.priority=priority;
    if(priority==='sla'){this.optimization=20;this.batching='conservative';this.dispatch='available';}
    if(priority==='cost'){this.optimization=90;this.batching='aggressive';this.dispatch='route';}
    if(priority==='value'){this.optimization=45;this.batching='conservative';}
    if(priority==='sla'||priority==='value')this.reorderSafeStops(priority);
    this.record('Rain response',{sla:'Protect SLA',cost:'Protect cost',value:'Protect high-value customers'}[priority]);this.dispatchWaiting();this.refreshEstimates();
  }
  setOptimization(value) {
    this.optimization=value;
    if(value<32){this.dispatch='available';this.batching='off';}
    else if(value>68){this.dispatch='route';this.batching='aggressive';}
    else {this.dispatch='route';this.batching='conservative';}
    this.priority='balanced';this.dispatchWaiting();this.refreshEstimates();
  }
  record(type,label) {this.decisions.push({type,label,at:this.now});}
  districtOrders(district) {return this.activeOrders().filter(o=>districtForPosition(o.customer).id===district.id);}
}
