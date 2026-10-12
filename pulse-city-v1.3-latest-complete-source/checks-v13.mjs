import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as THREE from './dist/assets/three.module.min.js';
import {Simulation,MERCHANTS,DISTRICTS,ROAD,distance} from './dist/assets/simulation.js';
import {DecisionFeedback,captureState,heatState} from './dist/assets/feedback.js';
import {CityScene,createWorld} from './dist/assets/city.js';
import {buildImpactGeometry,disposeImpact} from './dist/assets/impact-scene.js';

const audit=[];
function valid(sim){
  for(const rider of sim.riders){
    assert(rider.orders.length<=rider.capacity);
    assert(ROAD.some(p=>Math.abs(p-rider.position.x)<.03)||ROAD.some(p=>Math.abs(p-rider.position.z)<.03));
    const picked=new Set(rider.orders.filter(id=>sim.getOrder(id).status==='delivering'));
    for(const stop of rider.stops){if(stop.type==='pickup')picked.add(stop.orderId);else assert(picked.has(stop.orderId),`${rider.id}: delivery follows pickup`);}
  }
  for(const o of sim.activeOrders()){assert(Number.isFinite(o.eta));assert(Math.abs(o.buffer-(o.promisedAt-o.eta))<.001);}
  assert(Object.values(sim.metrics()).every(Number.isFinite));
  assert.equal(heatState(sim).reduce((sum,d)=>sum+d.count,0),sim.activeOrders().length,'Each order belongs to exactly one district');
}
function exercise(sim,engine,type,option){
  const positions=sim.riders.map(r=>({...r.position}));const picked=sim.orders.filter(o=>o.status==='delivering').map(o=>[o.id,o.assignedRider]);
  const first=Object.fromEntries(sim.riders.filter(r=>r.stops.length).map(r=>[r.id,JSON.stringify(r.stops[0])]));
  const response=engine.apply(type,option);
  assert.deepEqual(sim.riders.map(r=>r.position),positions,'Decisions never teleport riders');
  for(const [id,riderId] of picked)assert.equal(sim.getOrder(id).assignedRider,riderId,'Picked-up orders are never reassigned');
  if(type==='protection')for(const [id,stop] of Object.entries(first))assert.equal(JSON.stringify(sim.getRider(id).stops[0]),stop,'The current destination stays fixed');
  assert.equal(sim.lastDecisionImpact,response.impact);assert.equal(engine.last,response.impact);assert(response.impact.rationale&&response.impact.whatChanged&&response.impact.benefit&&response.impact.tradeoff);
  for(const diff of response.impact.metricDiffs)assert(Number.isFinite(diff.before)&&Number.isFinite(diff.after));
  const geo=buildImpactGeometry(sim,response.impact);geo.updateMatrixWorld(true);let objects=0,categories=new Set();
  geo.traverse(mesh=>{if(mesh.geometry){objects++;categories.add(mesh.userData.category);for(const number of mesh.geometry.attributes.position.array)assert(Number.isFinite(number));}});
  for(const id of response.impact.changedRoutes){assert(response.impact.updatedRoutes[id]?.length);const pts=response.impact.updatedRoutes[id];for(let i=1;i<pts.length;i++)assert(pts[i].x===pts[i-1].x||pts[i].z===pts[i-1].z,'Recorded route follows the graph');}
  if(type==='dispatch'&&response.result?.rider){assert(categories.has('pickup')&&categories.has('customer')&&categories.has('affected-rider')&&categories.has('updated-route'),'Every dispatch branch creates entity-specific spatial feedback');}
  if(response.impact.effectStatus==='pending_eligible_orders')assert.equal(sim.awaitingDecisionEffect,true);
  valid(sim);disposeImpact(geo);
  audit.push({event:type,option,status:response.impact.effectStatus,model:response.impact.whatChanged,geometry:[...categories],metricLabels:response.impact.metricDiffs.map(m=>m.label),verified:'Model + generated scene geometry; browser unverified'});
  return response;
}
function tick(sim,engine,seconds){for(let i=0;i<seconds*10;i++){sim.update(.1);const realized=engine.observe(sim.events);if(realized){const g=buildImpactGeometry(sim,realized);assert(g.children.length);disposeImpact(g);}sim.events=[];if(i%50===0)valid(sim);}}

// Same authored starting city and incoming order, three genuinely different matches.
const dispatchIds=[];
for(const option of ['nearest','available','route']){
  const sim=new Simulation(4823),engine=new DecisionFeedback(sim);tick(sim,engine,12);const order=sim.startChallenge();
  const response=exercise(sim,engine,'dispatch',option);dispatchIds.push(response.result.rider.id);const assigned=order.assignedRider;
  tick(sim,engine,9);assert.equal(order.assignedRider,assigned);assert(distance(sim.getRider(assigned).position,response.impact.riderChanges[assigned].before.position)>0,'Rider really follows the updated route');
  const beforeReplay=captureState(sim),history=sim.decisionLog.length;engine.replay();assert.deepEqual(captureState(sim),beforeReplay);assert.equal(sim.decisionLog.length,history);
}
assert.equal(new Set(dispatchIds).size,3,'The comparison distinguishes nearest, idle, and route fit');

for(const option of ['off','conservative','aggressive']){
  const sim=new Simulation(4823),engine=new DecisionFeedback(sim);tick(sim,engine,42);exercise(sim,engine,'demand','rush');tick(sim,engine,18);
  const existing=sim.riders.map(r=>[r.id,[...r.orders]]);const response=exercise(sim,engine,'batching',option);
  for(const [id,orders] of existing)for(const orderId of orders)assert(sim.getRider(id).orders.includes(orderId),'Batching does not unload existing orders');
  if(option==='off')assert.equal(response.impact.effectStatus,'pending_eligible_orders');
  if(option==='conservative')assert(response.impact.affectedRiderIds.some(id=>sim.getRider(id).orders.length===2),'A real pair is combined');
  if(option==='aggressive')assert(response.impact.affectedRiderIds.some(id=>sim.getRider(id).orders.length>2),'Aggressive matching creates larger feasible groups');
  tick(sim,engine,25);if(option==='off')assert(engine.last.realized,'The pending off policy is realized by a subsequent assignment');
}

function operatingFixture(){const sim=new Simulation(4823),engine=new DecisionFeedback(sim);tick(sim,engine,42);engine.apply('demand','rush');tick(sim,engine,18);engine.apply('batching','conservative');tick(sim,engine,40);return {sim,engine};}
for(const option of ['sla','cost','value']){
  const {sim,engine}=operatingFixture();exercise(sim,engine,'weather','rain');tick(sim,engine,10);const response=exercise(sim,engine,'protection',option);
  if(option==='value')assert.equal(sim.priority,'value');if(option==='sla')assert.equal(sim.priority,'sla');if(option==='cost'){assert.equal(sim.batching,'aggressive');assert.equal(sim.dispatch,'route');}
  tick(sim,engine,10);assert.equal(sim.priority,option);assert.equal(sim.decisions.at(-1).type,'Rain response');
}
for(const option of [10,50,90]){const {sim,engine}=operatingFixture();exercise(sim,engine,'optimization',option);assert.equal(sim.optimization,option);assert.equal(sim.batching,option===10?'off':option===90?'aggressive':'conservative');tick(sim,engine,12);}

// A frozen current stop and deliberately inefficient later stops demonstrate actual reprioritization.
for(const option of ['sla','value']){
  const sim=new Simulation(4823);sim.orders=[];sim.reservedRider=false;
  sim.riders.forEach(r=>{r.orders=[];r.stops=[];r.path=[];r.available=false;r.position={x:-6,z:0};});const r=sim.riders[0];r.available=true;
  const customers=[{x:0,z:0},{x:18,z:0},{x:6,z:6},{x:-6,z:6}];
  for(let i=0;i<4;i++){const o=sim.createOrder();Object.assign(o,{merchant:MERCHANTS[0],customer:customers[i],status:'delivering',assignedRider:r.id,priority:i===2?'Priority':'Standard',value:i===2?100:10,promisedAt:i===3?8:70,pickupReadyAt:0});r.orders.push(o.id);r.stops.push({type:'dropoff',orderId:o.id,position:o.customer});}
  sim.setPath(r);sim.refreshEstimates();const engine=new DecisionFeedback(sim);const old=r.stops.map(s=>s.orderId);const response=exercise(sim,engine,'protection',option);
  assert.notDeepEqual(r.stops.map(s=>s.orderId),old,'The crisis rule changes feasible later stops');assert(response.impact.changedRoutes.includes(r.id));
  assert(response.impact.beneficiaries.length>0);assert(response.impact.delayed.length>0,'Both beneficiaries and delayed customers are measured');
}

// No eligible rider now: show a pending policy, then realize the latest policy honestly.
const waiting=new Simulation();waiting.reservedRider=false;waiting.riders.forEach(r=>r.available=false);const wf=new DecisionFeedback(waiting);exercise(waiting,wf,'batching','aggressive');
assert.equal(wf.last.effectStatus,'pending_eligible_orders');const pendingId=wf.last.decisionId;
waiting.riders[7].available=true;tick(waiting,wf,4);assert.equal(wf.last.decisionId,pendingId);assert(wf.last.realized);assert.equal(wf.last.effectStatus,'applied');
const repeated=wf.apply('optimization',30,{key:'same-commit'}),history=waiting.decisionLog.length;assert.equal(wf.apply('optimization',30,{key:'same-commit'}),repeated);assert.equal(waiting.decisionLog.length,history);
const weights=new Simulation(),weightEngine=new DecisionFeedback(weights);const weightOrder=weights.startChallenge();weights.orders.forEach(o=>{if(o.status==='waiting')o.held=true;});
weightEngine.apply('optimization',40);const score40=weights.candidates(weightOrder,'route',true)[0]?.score;
weightEngine.apply('optimization',45);const score45=weights.candidates(weightOrder,'route',true)[0]?.score;
assert(Number.isFinite(score40)&&Number.isFinite(score45));assert.notEqual(score40,score45,'Slider weights change continuously inside one batching band');
waiting.reset();wf.reset();assert.equal(waiting.activeOrders().length,18);assert.equal(waiting.weather,'clear');assert.equal(waiting.decisionLog.length,0);assert.equal(waiting.lastDecisionImpact,null);

const free=new Simulation(),ff=new DecisionFeedback(free);
for(const [type,option] of [['demand','rush'],['demand','normal'],['weather','rain'],['weather','clear'],['order','send']])exercise(free,ff,type,option);
const hbefore=heatState(free).map(h=>h.count);ff.apply('weather','rain');assert.deepEqual(heatState(free).map(h=>h.count),hbefore,'Rain cannot fabricate demand');
while(free.activeOrders().length<110)free.createOrder();const capped=exercise(free,ff,'order','send');assert.equal(capped.result,null);assert.equal(free.activeOrders().length,110);ff.apply('demand','rush');assert.equal(free.activeOrders().length,110);

// Exercise the actual Three.js view material/overlay methods without requiring a browser renderer.
const cpu=Object.create(CityScene.prototype);cpu.sim=new Simulation();cpu.city=createWorld();cpu.mode='city';cpu.heatMix=0;cpu.materialStyles=[];
cpu.city.world.traverse(mesh=>{if(mesh.material?.color)cpu.materialStyles.push({material:mesh.material,base:mesh.material.color.clone(),dim:mesh.material.color.clone().lerp(new THREE.Color('#c4cdc1'),.52)});});
cpu.heatMeshes=DISTRICTS.map(d=>{const group=new THREE.Group();for(let i=0;i<4;i++)group.add(new THREE.Mesh(new THREE.CircleGeometry(d.radius,24),new THREE.MeshBasicMaterial({transparent:true,opacity:0})));return {district:d,group};});
cpu.selected=null;cpu.camera=new THREE.OrthographicCamera();cpu.zoom=cpu.targetZoom=1;cpu.angle=cpu.targetAngle=Math.PI/4;cpu.elevation=cpu.targetElevation=.79;cpu.focus=new THREE.Vector3();cpu.focusTarget=new THREE.Vector3();
const baseline=captureState(cpu.sim);cpu.width=720;cpu.height=620;cpu.updateCamera(true);const matrix=[...cpu.camera.projectionMatrix.elements];
cpu.setView('heat');for(let i=0;i<30;i++)cpu.updateHeatLayer(.016);assert(cpu.heatMeshes.some(h=>h.group.visible&&h.group.children[0].material.opacity>.05));assert(cpu.materialStyles.some(s=>!s.material.color.equals(s.base)));assert.deepEqual(captureState(cpu.sim),baseline);assert.deepEqual(cpu.camera.projectionMatrix.elements,matrix);
cpu.setView('system');assert.equal(cpu.city.buildings.visible,false);cpu.setView('city');cpu.updateHeatLayer(.1,true);assert(cpu.materialStyles.every(s=>s.material.color.equals(s.base)));assert(cpu.heatMeshes.every(h=>!h.group.visible));assert.equal(cpu.city.buildings.visible,true);
for(const viewport of [1920,1680,1440,1280,1024,768,390,320]){
  const content=Math.min(1520,viewport)-(viewport<=380?36:viewport<=768?44:viewport<=1200?64:96);cpu.width=viewport<=768?content:(content-(viewport<=1200?25:32))*.58;cpu.height=viewport<380?410:viewport<=768?470:viewport>1600?660:620;cpu.updateCamera(true);
  for(const x of [-22,22])for(const z of [-22,22]){const p=new THREE.Vector3(x,0,z).project(cpu.camera);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1,`City footprint fits at ${viewport}px`);}
}

// Run every three-decision story branch through the shared pipeline, including delayed effects.
let combinations=0;
for(const dispatch of ['nearest','available','route'])for(const batch of ['off','conservative','aggressive'])for(const protection of ['sla','cost','value']){
  const sim=new Simulation(),engine=new DecisionFeedback(sim);
  for(let frame=0;frame<1700;frame++){
    if(frame===120){sim.startChallenge();engine.apply('dispatch',dispatch,{key:'dispatch'});}
    if(frame===420)engine.apply('demand','rush');if(frame===600)engine.apply('batching',batch,{key:'batch'});
    if(frame===1000)engine.apply('weather','rain');if(frame===1100)engine.apply('protection',protection,{key:'protection'});
    sim.update(.1);engine.observe(sim.events);sim.events=[];if(frame%50===0)valid(sim);
  }
  assert.equal(sim.decisions.length,3);assert.equal(sim.decisionLog.length,5);assert(sim.metrics().delivered>0);combinations++;
}
const html=readFileSync('dist/index.html','utf8'),app=readFileSync('dist/assets/app.js','utf8'),css=readFileSync('dist/assets/v13.css','utf8');
assert(!app.match(/sim\.(chooseDispatch|chooseBatching|chooseProtection|setOptimization|heavyRain|dinnerRush)\(/),'All strategic UI mutations use the shared pipeline');
for(const id of ['impactPanel','impactFocus','impactReplay','impactClose','lastDecision','heatLegend','objectivePreview','impactMapLabels'])assert(html.includes(`id="${id}"`));
assert(html.includes('<h1>Can you keep the city <span>moving?</span></h1>'));assert(css.includes('grid-template-columns:minmax(0,.42fr) minmax(0,.58fr)'));assert(css.includes('margin:20px 0 22px'));assert(html.includes('Built by Vinh Nguyen'));assert(html.includes('https://vinh-nguyen-portfolio-three.vercel.app/'));
writeFileSync('V13-audit.json',JSON.stringify({verified:'Programmatic model transitions and generated Three.js geometry',browser:'Unavailable; visual layout, GPU rendering and physical tap testing are unverified',storyCombinations:combinations,viewportCameraChecks:[1920,1680,1440,1280,1024,768,390,320],rows:audit},null,2)+'\n');
console.log(`V1.3 passed: ${audit.length} recorded action exercises, ${combinations} complete story combinations, distinct dispatch matches (${dispatchIds.join(', ')}), compatible batching, real crisis rerouting, delayed policy realization, replay, duplicate guard, reset, heat materials/counts, and 8 camera-fit widths.`);
console.log('Browser visual, DOM click and touch QA: unavailable.');
