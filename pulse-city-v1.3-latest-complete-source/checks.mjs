import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as THREE from './dist/assets/three.module.min.js';
import {Simulation,ROAD,roadPath,distance} from './dist/assets/simulation.js';
import {createWorld} from './dist/assets/city.js';

function validate(s) {
  const active=s.activeOrders();
  assert(active.length<=110,'Demand stays within the visual performance cap');
  assert(s.riders.every(r=>r.orders.length<=r.capacity),'No rider exceeds capacity');
  for(const r of s.riders) {
    assert(Number.isFinite(r.position.x)&&Number.isFinite(r.position.z),'Rider positions remain finite');
    assert(ROAD.some(v=>Math.abs(v-r.position.x)<.03)||ROAD.some(v=>Math.abs(v-r.position.z)<.03),'Riders stay on the road graph');
    assert.equal(new Set(r.orders).size,r.orders.length,'Orders are assigned once');
    for(const id of r.orders){const o=s.getOrder(id);assert(o&&o.assignedRider===r.id&&o.status!=='delivered');}
    for(let i=1;i<r.path.length;i++)assert(r.path[i].x===r.path[i-1].x||r.path[i].z===r.path[i-1].z,'Road segments never cross buildings diagonally');
  }
  for(const o of active) {
    assert(Number.isFinite(o.eta)&&Number.isFinite(o.buffer));
    assert(Math.abs(o.buffer-(o.promisedAt-o.eta))<.001);
  }
  assert(Object.values(s.metrics()).every(Number.isFinite),'Metrics remain finite');
}
let scenarios=0;
const results=[];
for(const strategy of ['nearest','available','route'])for(const batching of ['off','conservative','aggressive'])for(const protect of ['sla','cost','value']) {
  const s=new Simulation(4823);let deliveredBeforeRain;
  for(let frame=0;frame<1700;frame++) {
    if(frame===120){const held=s.startChallenge();assert(held.held);s.chooseDispatch(strategy);assert(held.assignedRider);assert(!held.held);}
    if(frame===420)s.dinnerRush();
    if(frame===600)s.chooseBatching(batching);
    if(frame===1000){deliveredBeforeRain=s.metrics().delivered;s.heavyRain();assert.equal(s.metrics().available,10);}
    if(frame===1100)s.chooseProtection(protect);
    s.update(.1);
    if(frame%40===0)validate(s);
  }
  assert.equal(s.decisions.length,3);
  assert(s.metrics().delivered>deliveredBeforeRain,'Deliveries continue through the disruption');
  assert(s.metrics().peak>18,'The demand surge is visible');
  results.push({strategy,batching,protect,...s.metrics()});scenarios++;
}
assert(new Set(results.map(r=>r.cost.toFixed(3))).size>10,'Choices produce different calculated outcomes');

// The pickup wait previously advanced past the final waypoint; exercise it directly.
const wait=new Simulation();const waitingOrder=wait.createOrder({held:true});waitingOrder.pickupReadyAt=wait.now+20;waitingOrder.merchant={...waitingOrder.merchant,position:{...wait.riders[7].position}};
assert(wait.assign(waitingOrder,wait.riders[7],true));
for(let i=0;i<500;i++){wait.update(.1);if(i%30===0)validate(wait);}
assert(['delivering','delivered'].includes(waitingOrder.status),'A rider resumes after food preparation');

const paused=new Simulation();paused.running=false;const before=paused.now;paused.update(10);assert.equal(paused.now,before);
paused.running=true;paused.heavyRain();paused.dinnerRush();paused.chooseBatching('aggressive');
for(let i=0;i<4000;i++){if(i===2000)paused.setOptimization(10);if(i===3000)paused.setOptimization(90);paused.update(.1);if(i%100===0)validate(paused);}
paused.reset();assert.equal(paused.activeOrders().length,18);assert.equal(paused.weather,'clear');assert.equal(paused.metrics().available,12);assert.equal(paused.decisions.length,0);assert.equal(paused.now,0);

for(const seed of [1,921,14584,78404,94202]) {
  const s=new Simulation(seed);for(let i=0;i<900;i++){if(i===50){s.startChallenge();s.chooseDispatch('available');}if(i===200)s.dinnerRush();if(i===350)s.chooseBatching('conservative');if(i===600)s.heavyRain();s.update(.1);if(i%50===0)validate(s);}
}
for(const a of [{x:-15,z:0},{x:12,z:3},{x:-6,z:12}])for(const b of [{x:18,z:18},{x:-12,z:-18}]) {
  const path=roadPath(a,b);assert.equal(distance(path.at(-1),b),0);
  for(let i=1;i<path.length;i++)assert(path[i].x===path[i-1].x||path[i].z===path[i-1].z);
}
const city=createWorld();let instances=0,meshes=0;city.world.updateMatrixWorld(true);
city.world.traverse(object=>{if(object.isMesh){meshes++;for(const value of object.geometry.attributes.position.array)assert(Number.isFinite(value));assert(object.matrixWorld.elements.every(Number.isFinite));if(object.isInstancedMesh){instances+=object.count;for(const value of object.instanceMatrix.array)assert(Number.isFinite(value));}}});
assert(meshes<100,'Shared meshes keep draw calls bounded');assert(instances>500,'Buildings and street details are instanced');

const html=readFileSync('dist/index.html','utf8'),app=readFileSync('dist/assets/app.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'HTML IDs are unique');
const dynamic=new Set(['freeDemand','freeWeather','sendOrder','guidedAgain','inspectEntity','entitySwitcher']);
for(const match of app.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(match[1])||dynamic.has(match[1]),`DOM target ${match[1]} exists`);
for(const match of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g))assert(existsSync('dist/'+match[1]),`Local asset ${match[1]} exists`);
for(const name of ['dm-sans.ttf','space-grotesk.ttf','space-grotesk-bold.ttf','plex-mono.ttf','social-preview.png'])assert(existsSync('dist/assets/'+name));
assert(html.includes('https://vinh-nguyen-portfolio-three.vercel.app/'));
console.log(`Passed: ${scenarios} story combinations, pickup waiting, road movement, rain, pause, replay, 5 random seeds, extended exploration, ${instances} shared instances, local assets, and UI targets.`);
console.log('Outcome ranges:',JSON.stringify({onTime:[Math.min(...results.map(r=>r.onTime)).toFixed(1),Math.max(...results.map(r=>r.onTime)).toFixed(1)],cost:[Math.min(...results.map(r=>r.cost)).toFixed(2),Math.max(...results.map(r=>r.cost)).toFixed(2)],delivered:[Math.min(...results.map(r=>r.delivered)),Math.max(...results.map(r=>r.delivered))]}));
