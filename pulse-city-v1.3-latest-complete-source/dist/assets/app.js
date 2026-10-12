import {Simulation,MERCHANTS,DISTRICTS,distance,KM_PER_UNIT} from './simulation.js';
import {CityScene} from './city.js';
import {DecisionFeedback,heatState} from './feedback.js';

const $=id=>document.getElementById(id),icon=name=>`<svg class="icon"><use href="#i-${name}"/></svg>`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sim=new Simulation();let scene,mode='opening',phase='calm',phaseTime=0,pending=null,speed=1,paused=false,selected=null,toastTimer,finalMetrics=null,optimizationChanged=false,sound=false,audioContext,audioGain;
const feedback=new DecisionFeedback(sim);
const metricValues={onTime:94,average:22,cost:2.8,active:18};
let loadProgress=0;
const loading=setInterval(()=>{loadProgress=Math.min(90,loadProgress+3+Math.random()*4);$('loadLine').style.width=`${loadProgress}%`;$('loadPercent').textContent=`${Math.round(loadProgress)}%`;},60);
function animateIn(target){if(window.gsap&&!reduced)gsap.fromTo(target,{opacity:0,y:12},{opacity:1,y:0,duration:.55,stagger:.055,ease:'power2.out',clearProps:'transform'});}
function announce(text){$('screenReaderStatus').textContent=text;}
function clock(minute=sim.now){const n=Math.floor(17*60+42+minute);return `${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function toast(title,description,symbol='info') {
  clearTimeout(toastTimer);$('toast').innerHTML=`<span class="toast-icon">${icon(symbol)}</span><span><b>${title}</b><small>${description}</small></span>`;$('toast').hidden=false;animateIn($('toast'));announce(`${title}. ${description}`);beep(560);
  toastTimer=setTimeout(()=>{$('toast').hidden=true;},6500);
}
function showMission(eyebrow,title,description,chapter=0){
  $('chapterEyebrow').textContent=eyebrow;$('missionTitle').textContent=title;$('missionDescription').textContent=description;
  $('decisionOptions').innerHTML='';$('decisionOptions').classList.remove('decided');$('missionInsight').hidden=true;$('chapterFooter').hidden=false;
  document.querySelectorAll('[data-chapter]').forEach(el=>el.classList.toggle('active',Number(el.dataset.chapter)<=chapter));
  animateIn([$('missionTitle'),$('missionDescription')]);
}
function options(items,handler){
  $('decisionOptions').innerHTML=items.map((item,i)=>`<button class="decision-option" data-choice="${item.id}"><span class="option-number">0${i+1}</span><span><b>${item.title}</b><small>${item.description}</small></span>${icon('arrow')}</button>`).join('');
  let committed=false;
  $('decisionOptions').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{if(committed)return;committed=true;$('decisionOptions').classList.add('decided');$('decisionOptions').querySelectorAll('button').forEach(b=>{b.disabled=true;b.setAttribute('aria-pressed',String(b===button));});button.classList.add('selected');button.insertAdjacentHTML('beforeend','<span class="applied-tag">Applied</span>');handler(button.dataset.choice);}));
  animateIn($('decisionOptions').children);$('nextEvent').disabled=true;$('chapterStatus').textContent='Choose your trade-off';
}
function insight(title,description){$('missionInsight').hidden=false;$('missionInsight').innerHTML=`<small>THE TRADE-OFF</small><b>${title}</b><p>${description}</p>`;animateIn($('missionInsight'));}
function advanceState(next){phase=next;phaseTime=0;pending=null;$('nextEvent').disabled=false;$('chapterStatus').textContent='Decision in motion';}
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function applyDecision(type,option,configuration){const response=feedback.apply(type,option,configuration);presentImpact(response.impact);return response.result;}
function presentImpact(impact,{replay=false}={}){
  $('impactPanel').hidden=false;$('lastDecision').hidden=false;$('lastDecision').setAttribute('aria-expanded','true');$('stage').classList.add('has-impact');
  $('impactState').textContent=impact.effectStatus==='pending_eligible_orders'?'POLICY ACTIVE · NEXT ELIGIBLE ORDER':impact.effectStatus==='no_change_possible'?'APPLIED · NO ELIGIBLE CHANGE':'DECISION APPLIED';
  $('impactTitle').textContent=impact.label;$('impactChanged').textContent=impact.whatChanged;$('impactReason').textContent=impact.rationale;
  $('impactBenefit').textContent=impact.benefit;$('impactTradeoff').textContent=impact.tradeoff;
  const value=m=>m.unit==='km'?n=>n.toFixed(2):m.unit==='min'||m.unit==='km/h'?n=>n.toFixed(1):n=>Math.round(n).toString();
  $('impactMetrics').innerHTML=impact.metricDiffs.slice(0,3).map(m=>`<div><span>${safe(m.label)}</span><strong>${value(m)(m.before)} <i>→</i> ${value(m)(m.after)} <small>${safe(m.unit)}</small></strong></div>`).join('');
  $('impactWhen').textContent=(replay?'Recorded comparison':'Measured at decision')+' · '+clock(impact.at);
  $('policyBadge').hidden=false;$('policyBadge').textContent=impact.effectStatus==='pending_eligible_orders'?'Policy active · waiting for the next eligible order':impact.effectStatus==='no_change_possible'?'Already active · no eligible operational change':impact.type==='demand'?'Demand changed · markers and district counts track real orders':impact.visualKind==='policy'?'Policy applied · new work uses the selected rule':impact.visualKind==='weather'?'Incident impact · actual speed and SLA changes':replay?'Recorded routes · current riders keep moving':impact.visualKind==='batch'?'Batch applied · shared rider, numbered stops':impact.visualKind==='priority'?'Priority changed · ↑ promoted / ↓ displaced':'Applied · highlighted riders and changed routes';
  scene.presentImpact(impact);animateIn($('impactPanel'));announce(`${impact.label}. ${impact.whatChanged}`);
  if(innerWidth<=768&&!replay)$('impactPanel').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
}
function commitObjective(){clearTimeout(sliderTimer);const value=Number($('optimization').value);$('objectivePreview').hidden=true;if(value===sim.optimization){$('policyBadge').hidden=false;$('policyBadge').textContent='Objective unchanged · existing routes stay active';return;}optimizationChanged=true;applyDecision('optimization',value);}
function start(){
  clearTimeout(sliderTimer);sim.seed=4823+Math.floor(Math.random()*90000);sim.reset();feedback.reset();scene.clearImpact();$('impactPanel').hidden=true;$('lastDecision').hidden=true;$('policyBadge').hidden=true;$('objectivePreview').hidden=true;sim.running=true;mode='story';phase='calm';phaseTime=0;pending=null;finalMetrics=null;selected=null;paused=false;speed=1;optimizationChanged=false;
  $('opening').hidden=true;$('summary').hidden=true;$('missionPanel').hidden=false;$('optimizationPanel').hidden=true;$('detailPanel').hidden=true;$('methodNote').hidden=true;
  $('stage').className='stage active';$('missionPanel').querySelector('.chapter-track').hidden=false;
  $('pauseButton').innerHTML=icon('pause');$('pauseButton').setAttribute('aria-label','Pause simulation');$('pauseButton').setAttribute('aria-pressed','false');$('speedButton').textContent='1×';
  $('chapterFooter').innerHTML='<span class="live-dot"></span><span id="chapterStatus">Observe the city</span><button id="nextEvent">Next event'+icon('arrow')+'</button>';$('nextEvent').addEventListener('click',nextEvent);
  scene.layout='story';scene.setSelected(null);scene.resetCamera();scene.routeClock=2;scene.setView('city');syncViews('city');
  $('sceneCaption').textContent='A CITY OF PROMISES';showMission('01 / THE FIRST PROMISE','A city of competing promises.','Twelve riders. Eighteen open orders. Every customer is counting on the city to keep moving.');
  $('chapterStatus').textContent='Observe the city';toast('You’re on dispatch.','Watch the riders. Your first order is about to arrive.','bike');$('optimization').value=50;syncObjective();$('stage').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
}
function dispatchDecision(){
  if(pending)return;pending='dispatch';phase='dispatch';const order=sim.startChallenge();
  const near=sim.candidates(order,'nearest',true)[0],idle=sim.candidates(order,'available',true).find(c=>c.rider.orders.length===0);
  showMission('01 / THE FIRST PROMISE','Who gets the next order?',`${order.merchant.name} has a new delivery. The closest rider may already have other promises to keep.`);
  options([
    {id:'nearest',title:'Nearest rider',description:near?`${near.pickupDistance.toFixed(1)} km to pickup · ${near.rider.orders.length} active orders. A short pickup can mean a longer queue.`:'Shortest pickup. Existing stops come first.'},
    {id:'available',title:'Available rider',description:idle?`${idle.pickupDistance.toFixed(1)} km to pickup · An idle rider. More distance, fewer competing stops.`:'Fewer stops. More pickup distance.'},
    {id:'route',title:'Route fit',description:'Find an overlapping route. Less extra distance, but existing customers may wait.'}
  ],strategy=>{
    const result=applyDecision('dispatch',strategy,{key:'story-dispatch'});advanceState('afterDispatch');
    $('missionTitle').textContent='A route is a decision.';$('missionDescription').textContent=result.rider?`Rider ${result.rider.id} is heading to ${order.merchant.name}. The ETA is now ${clock(order.eta)}; the promise is ${clock(order.promisedAt)}.`:'The order is waiting for a rider with capacity.';
    const texts={nearest:['The closest rider isn’t always the best rider.','A short pickup reduces distance. A busy route can push the final delivery past its promise.'],available:['You bought breathing room.','An idle rider gets a simpler route, with a longer trip to the merchant. Reliability has a cost.'],route:['Sharing a route shares the wait.','Route fit saves extra distance. The additional stop also changes another customer’s arrival time.']};insight(...texts[strategy]);
    if(result.rider)scene.setSelected({type:'rider',id:result.rider.id});scene.routeClock=2;if(result.rider)toast('New route assigned.',`${result.rider.id} → ${order.merchant.name} → ${order.customerName}`,'route');else toast('Assignment pending.','The order is waiting for eligible rider capacity.','info');
  });
  scene.setSelected({type:'order',id:order.id});toast('One more promise.','A new order needs a rider. Choose how to assign it.','box');
}
function rush(){
  if(pending)return;applyDecision('demand','rush');advanceState('surge');scene.setSelected(null);$('sceneCaption').textContent='DINNER RUSH';
  showMission('02 / DEMAND MEETS CAPACITY','Dinner rush. No extra riders.','The same twelve riders are now facing orders arriving five times faster. Watch the queue spread through the Food Quarter.',1);
  $('chapterStatus').textContent='Demand is rising';insight('Supply and demand move at different speeds.','A busier city needs more than faster dispatch. Your next choice changes how riders share their capacity.');toast('Dinner Rush has started.','Orders arriving 5× faster. Rider supply stays at 12.','layers');
}
function batchingDecision(){
  if(pending)return;pending='batching';phase='batching';
  showMission('02 / THE BATCHING QUESTION','One rider. How many promises?','Dynamic batching combines compatible pickups and destinations. It saves distance, but each shared stop adds waiting.',1);
  options([
    {id:'off',title:'Keep batching off',description:'One primary order per rider. Simpler routes, but the waiting queue grows.'},
    {id:'conservative',title:'Batch conservatively',description:'Up to 2 close, compatible orders. Share distance while keeping a deadline buffer.'},
    {id:'aggressive',title:'Batch aggressively',description:'Up to 4 orders per rider. Higher throughput, more stops, and greater SLA risk.'}
  ],policy=>{
    applyDecision('batching',policy,{key:'story-batching'});$('optimization').value=sim.optimization;
    advanceState('afterBatch');$('missionTitle').textContent='Efficiency has a passenger.';$('missionDescription').textContent='Watch the route network. New orders follow your batching policy; riders already on the road continue their routes.';
    const texts={off:['A direct trip doesn’t mean a shorter wait.','Each delivery has fewer stops, but customers in the queue must wait for a rider to become available.'],conservative:['A little overlap goes a long way.','Nearby orders share a rider only when the added route still leaves room before the promised time.'],aggressive:['More orders per rider. More time per customer.','Shared routes reduce distance per order. Their extra stops can put existing promises at risk.']};insight(...texts[policy]);
    $('optimizationPanel').hidden=false;syncObjective();scene.routeClock=2;toast('Batching policy updated.','Move the objective slider to explore the balance between customer wait and delivery cost.','route');
  });
}
function rain(){
  if(pending)return;applyDecision('weather','rain');advanceState('rain');$('sceneCaption').textContent='THE CITY FIGHTS BACK';
  showMission('03 / THE CITY FIGHTS BACK','Then the rain arrives.','Rider speed falls from 26 to 17 km/h. Two riders finish their routes and leave the available fleet. The same promises now have less room.',2);
  $('chapterStatus').textContent='Watch the deadline buffers';insight('A promise made in sunshine still counts in the rain.','Routes take longer. Amber and red orders show where the delivery ETA is getting close to, or beyond, the promised time.');toast('Heavy rain across the city.','Speed −35%. Available fleet: 12 → 10. ETA buffers are shrinking.','rain');
}
function protectionDecision(){
  if(pending)return;pending='protection';phase='protection';
  showMission('03 / CHOOSE YOUR PRIORITY','You can’t save every metric.','The city is under pressure. Choose which objective the dispatch system should protect first.',2);
  options([
    {id:'sla',title:'Protect SLA',description:'Prioritize approaching deadlines. A stronger SLA objective can increase distance and cost.'},
    {id:'cost',title:'Protect delivery cost',description:'Keep batching and route efficiency high. Some customers will wait longer.'},
    {id:'value',title:'Protect high-value customers',description:'Serve premium and higher-value orders first. Standard customers may bear the delay.'}
  ],priority=>{
    applyDecision('protection',priority,{key:'story-protection'});advanceState('afterProtection');$('optimization').value=sim.optimization;syncObjective();
    $('missionTitle').textContent='Algorithms don’t decide what matters.';$('missionDescription').textContent='Product decisions do. Watch your policy shape which promises the system serves first.';
    const texts={sla:['You made reliability the priority.','Urgent promises lead the queue. Some efficient route matches are sacrificed to keep more deliveries within their deadlines.'],cost:['You made efficiency the priority.','More orders share routes. Distance costs fall, but the customer experience depends on how much waiting is acceptable.'],value:['You made a policy decision.','Premium and higher-value customers move ahead. Standard customers pay part of the trade-off in additional waiting.']};insight(...texts[priority]);toast('The city is following your priorities.','Let the routes play out, then see the promises your system kept.','check');
  });
}
function finish(){
  pending=null;mode='summary';phase='finished';finalMetrics=sim.metrics();sim.running=false;paused=true;
  $('missionPanel').hidden=true;$('optimizationPanel').hidden=true;$('summary').hidden=false;$('detailPanel').hidden=true;$('toast').hidden=true;
  $('stage').className='stage finished';$('impactPanel').hidden=true;scene.clearImpact();scene.layout='summary';scene.setSelected(null);$('sceneCaption').textContent='YOUR CITY. YOUR PRIORITIES.';
  $('pauseButton').innerHTML=icon('play');$('pauseButton').setAttribute('aria-label','Resume in free exploration');$('pauseButton').setAttribute('aria-pressed','true');
  const m=finalMetrics,delivered=sim.completed.slice(50),actualOnTime=delivered.length?delivered.filter(o=>o.onTime).length/delivered.length*100:null;
  $('summaryMetrics').innerHTML=[['Delivered',m.delivered],['On-time forecast',`${Math.round(m.onTime)}%`],['Avg delivery',`${Math.round(m.average)} min`],['Cost / delivery',`$${m.cost.toFixed(2)}`]].map(([label,value])=>`<div><small>${label}</small><b>${value}</b></div>`).join('');
  $('summaryDecisions').innerHTML=sim.decisions.slice(0,3).map(d=>`<div><small>${d.type}</small><b>${d.label}</b></div>`).join('');
  const costChange=(m.cost/sim.initialMetrics.cost-1)*100,waitChange=m.average-sim.initialMetrics.average;
  $('summaryTradeoff').innerHTML=`<span>Cost vs. opening <b>${costChange>=0?'+':''}${costChange.toFixed(0)}%</b></span><span>Delivery time <b>${waitChange>=0?'+':''}${waitChange.toFixed(1)} min</b></span><span>Peak orders <b>${m.peak}</b></span>`;
  if(optimizationChanged)$('summaryDecisions').innerHTML+=`<div><small>Final objective</small><b>${sim.optimization<32?'Customer experience':sim.optimization>68?'Delivery efficiency':'Balanced'}</b></div>`;
  animateIn([$('summary').querySelector('h2'),$('summaryMetrics'),$('summaryDecisions'),$('summaryTradeoff'),$('summary').querySelector('.signature')]);announce(`Your city delivered ${m.delivered} new orders, with a live on-time forecast of ${Math.round(m.onTime)} percent. Your priorities shaped the result.`);
}
function nextEvent(){if(mode!=='story'||pending)return;const actions={calm:dispatchDecision,afterDispatch:rush,surge:batchingDecision,afterBatch:rain,rain:protectionDecision,afterProtection:finish};actions[phase]?.();}
function updateStory(dt){
  if(mode!=='story'||pending||paused)return;phaseTime+=dt;
  if(phase==='calm'&&phaseTime>12)dispatchDecision();
  else if(phase==='afterDispatch'&&phaseTime>30)rush();
  else if(phase==='surge'&&phaseTime>18)batchingDecision();
  else if(phase==='afterBatch'&&phaseTime>40)rain();
  else if(phase==='rain'&&phaseTime>10)protectionDecision();
  else if(phase==='afterProtection'&&phaseTime>50)finish();
}
function explore(){
  mode='explore';pending=null;sim.reservedRider=false;sim.orders.forEach(o=>{if(o.status==='waiting')o.held=false;});sim.authoredBatchIds=[];sim.refreshEstimates();sim.running=true;paused=false;selected=null;scene.layout='story';scene.setSelected(null);scene.routeClock=2;
  $('opening').hidden=true;$('summary').hidden=true;$('missionPanel').hidden=false;$('detailPanel').hidden=true;$('optimizationPanel').hidden=false;$('stage').className='stage active';$('pauseButton').innerHTML=icon('pause');$('pauseButton').setAttribute('aria-label','Pause simulation');$('pauseButton').setAttribute('aria-pressed','false');
  $('missionPanel').querySelector('.chapter-track').hidden=true;showMission('FREE EXPLORATION / NO SCORE TO CHASE','Meet the city beneath the numbers.','Inspect a rider, order, merchant, or district. Change demand and weather, then see where the pressure goes.');
  $('chapterFooter').innerHTML='<span class="live-dot"></span><span>Explore at your own pace</span><button id="guidedAgain">Guided experience '+icon('arrow')+'</button>';$('guidedAgain').addEventListener('click',start);
  $('decisionOptions').innerHTML=`<label class="explore-field">Demand<select id="freeDemand" class="detail-select"><option value="normal">Normal demand</option><option value="rush">Dinner rush</option></select></label><label class="explore-field">Weather<select id="freeWeather" class="detail-select"><option value="clear">Clear skies · 12 riders</option><option value="rain">Heavy rain · 10 riders</option></select></label><button id="sendOrder" class="decision-option"><span class="option-number">+</span><span><b>Send a new order</b><small>Add one more promise to the city.</small></span>${icon('box')}</button><select id="inspectEntity" class="detail-select" aria-label="Inspect a city entity">${entityOptions()}</select>`;
  $('freeDemand').value=sim.demand;$('freeWeather').value=sim.weather;
  $('freeDemand').addEventListener('change',e=>{applyDecision('demand',e.target.value);toast('Demand updated.',sim.demand==='rush'?'The dinner queue is growing.':'Orders are arriving at a calmer pace.','layers');});
  $('freeWeather').addEventListener('change',e=>{applyDecision('weather',e.target.value);toast('Weather updated.',sim.weather==='rain'?'Rain slows the riders and reduces available supply.':'Clear skies. All twelve riders are available again.',sim.weather==='rain'?'rain':'sun');});
  $('sendOrder').addEventListener('click',()=>{const order=applyDecision('order','send');if(!order){toast('City at capacity.','A delivery must finish before another order can enter.','info');return;}select({type:'order',id:order.id});toast(`Order #${order.id}`,`${order.merchant.name} → ${order.customerName}`,'box');});
  $('inspectEntity').addEventListener('change',e=>inspectValue(e.target.value));$('sceneCaption').textContent='EXPLORING THE CITY';$('optimization').value=sim.optimization;syncObjective();animateIn($('missionPanel'));$('stage').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
}
function entityOptions(){return `<option value="">Inspect a rider, order, or place…</option><optgroup label="Riders">${sim.riders.map(r=>`<option value="rider:${r.id}">Rider ${r.id} · ${r.status}</option>`).join('')}</optgroup><optgroup label="Orders">${sim.activeOrders().slice(-35).map(o=>`<option value="order:${o.id}">#${o.id} · ${o.merchant.name}</option>`).join('')}</optgroup><optgroup label="Merchants">${MERCHANTS.map(m=>`<option value="merchant:${m.id}">${m.name}</option>`).join('')}</optgroup><optgroup label="Districts">${DISTRICTS.map(d=>`<option value="district:${d.id}">${d.name}</option>`).join('')}</optgroup>`;}
function inspectValue(value){if(!value)return;const [type,id]=value.split(':');select({type,id});}
const row=(label,value)=>`<div class="detail-row"><span>${label}</span><b>${value}</b></div>`;
function select(entity){selected=entity;scene?.setSelected(entity);$('detailPanel').hidden=!entity;if(entity){renderDetail(true);animateIn($('detailPanel'));announce(scene.entityLabel(entity));}else $('liveNote').hidden=scene?.mode==='system';}
function renderDetail(force=false){
  if(!selected)return;if(!force&&$('detailPanel').contains(document.activeElement))return;
  const {type,id}=selected;let title='',body='';$('detailType').textContent=type.toUpperCase();
  if(type==='rider'){
    const r=sim.getRider(id);if(!r)return;title=`Rider ${id}`;const km=r.stops.reduce((sum,stop,i)=>sum+distance(i?r.stops[i-1].position:r.position,stop.position)*KM_PER_UNIT,0),eta=sim.planTime(r).finish;
    const status=!r.available?(r.orders.length?'Finishing route':'Unavailable'):r.status==='pickup'?'Heading to pickup':r.status==='delivering'?'Delivering':'Available';
    body=`<div class="status-label">${icon('bike')}${status}</div>`+row('Active orders',`${r.orders.length} / ${r.capacity}`)+row('Distance remaining',`${km.toFixed(1)} km`)+row('Completion',r.orders.length?`${Math.max(0,eta-sim.now).toFixed(0)} min`:'Ready now')+row('Utilization',`${Math.round(r.busyTime/Math.max(.1,r.totalTime)*100)}%`)+row('Travel speed',`${Math.round(r.speed*sim.speedMultiplier(r.position))} km/h`);
    body+=`<div class="detail-route">${r.stops.length?r.stops.slice(0,4).map(s=>`${s.type==='pickup'?'↑':'↓'} ${s.type==='pickup'?sim.getOrder(s.orderId).merchant.name:sim.getOrder(s.orderId).customerName}`).join('<br>'):'Waiting for the next promise.'}${r.stops.length>4?`<br>+ ${r.stops.length-4} more stops`:''}</div>`;
    body+=`<div class="detail-selection-list">${r.orders.map(order=>`<button data-order="${order}" aria-label="Inspect order ${order}">#${order}</button>`).join('')}</div>`;
  }else if(type==='order'){
    const o=sim.getOrder(id);if(!o){select(null);return;}title=`Order #${o.id}`;
    const delivered=o.status==='delivered',risk=delivered?(o.deliveredAt>o.promisedAt?'late':'healthy'):o.risk;
    const label=delivered?'Delivered':risk==='late'?'ETA exceeds promise':risk==='risk'||risk==='warning'?'Deadline approaching':'Promise looks healthy';
    body=`<div class="status-label ${risk}">${icon(risk==='late'||risk==='risk'?'info':'check')}${label}</div>`+row('Pickup',o.merchant.name)+row('Destination',o.customerName)+row('Promised time',clock(o.promisedAt))+row(delivered?'Delivered at':'Current ETA',clock(delivered?o.deliveredAt:o.eta))+row('SLA buffer',`${o.buffer>=0?'+':'−'}${Math.abs(o.buffer).toFixed(1)} min`)+row('Priority',o.priority)+row('Order value',`$${o.value}`)+row('Rider',o.assignedRider??'Awaiting dispatch');
  }else if(type==='merchant'){
    const m=MERCHANTS.find(m=>m.id===id),orders=sim.activeOrders().filter(o=>o.merchant.id===id);title=m.name;
    body=`<div class="status-label">${icon('box')}${m.kind}</div>`+row('District',m.district)+row('Open orders',orders.length)+row('Awaiting rider',orders.filter(o=>o.status==='waiting').length)+row('Preparing',orders.filter(o=>o.pickupReadyAt>sim.now).length)+row('ETA at risk',orders.filter(o=>o.buffer<3).length)+`<div class="detail-route">Every pickup shares preparation time, street capacity, and a customer’s deadline.</div>`;
    body+=`<div class="detail-selection-list">${orders.slice(0,4).map(o=>`<button data-order="${o.id}">#${o.id}</button>`).join('')}</div>`;
  }else{
    const d=DISTRICTS.find(d=>d.id===id),orders=sim.districtOrders(d);title=d.name;
    body=`<div class="status-label">${icon('city')}Neighborhood pressure</div>`+row('Open deliveries',orders.length)+row('Waiting for a rider',orders.filter(o=>o.status==='waiting').length)+row('Deadline at risk',orders.filter(o=>o.buffer<3).length)+row('Priority customers',orders.filter(o=>o.priority==='Priority').length)+`<div class="detail-route">${d.id==='food'?'Short pickup distances. High demand density. The first place to feel dinner rush.':d.id==='downtown'?'Busy streets and office blocks. Traffic adds time to an already crowded route.':d.id==='warehouse'?'Fewer pickups, longer distances. Efficiency depends on finding compatible destinations.':'A neighborhood of individual promises. A shared rider means a shared queue.'}</div>`;
  }
  $('detailTitle').textContent=title;$('detailBody').innerHTML=body+`<select class="detail-select" id="entitySwitcher" aria-label="Inspect another city entity">${entityOptions()}</select>`;
  $('entitySwitcher').value=`${type}:${id}`;$('entitySwitcher').addEventListener('change',e=>inspectValue(e.target.value));$('detailBody').querySelectorAll('[data-order]').forEach(button=>button.addEventListener('click',()=>select({type:'order',id:button.dataset.order})));
}
function syncViews(view){$('heatLegend').hidden=view!=='heat';$('viewContext').textContent=view==='heat'?'Demand Heatmap · Active order density':view==='system'?'System View · The current delivery pipeline':'City View · Riders and customer promises';document.querySelectorAll('[data-view]').forEach(button=>{button.classList.toggle('active',button.dataset.view===view);button.setAttribute('aria-pressed',String(button.dataset.view===view));});$('systemPanel').hidden=view!=='system';$('liveNote').hidden=view==='system'||!!selected;}
function syncObjective(){const v=Number($('optimization').value);$('optimizationValue').textContent=v<32?'Experience first':v>68?'Efficiency first':'Balanced';$('optimization').style.accentColor=v>68?'#7d9560':'#58856b';}
function drawMetrics(){
  $('metricOnTime').textContent=Math.round(metricValues.onTime);$('metricAverage').textContent=Math.round(metricValues.average);$('metricCost').textContent=metricValues.cost.toFixed(2);$('metricActive').textContent=Math.round(metricValues.active);
}
function updateUI(){
  const m=mode==='summary'?finalMetrics:sim.metrics();
  if(window.gsap&&!reduced)gsap.to(metricValues,{onTime:m.onTime,average:m.average,cost:m.cost,active:m.active,duration:.75,ease:'power1.out',overwrite:true,onUpdate:drawMetrics});else{Object.assign(metricValues,m);drawMetrics();}
  $('cityClock').textContent=clock();$('riderCount').textContent=m.available;$('weatherLabel').innerHTML=icon(sim.weather==='rain'?'rain':'sun')+(sim.weather==='rain'?'Heavy rain':'Clear skies');
  $('onTimeTrend').textContent=m.onTime<75?'Promises under pressure':m.onTime<88?'Buffers are tightening':'Promises looking healthy';$('activeTrend').textContent=m.waiting?`${m.waiting} awaiting a rider`:'Moving through the city';
  $('systemOrders').textContent=m.active;$('systemWaiting').textContent=m.waiting;$('systemRiders').textContent=m.available;$('systemDelivered').textContent=`${m.delivered} delivered`;
  const r=sim.getRider('R07');$('liveNote').querySelector('.subtle').textContent=`· ${r.orders.length?r.status==='pickup'?'Picking up':'On the way':'Available'}`;
  $('liveNoteText').textContent=r.orders.length?`${sim.getOrder(r.orders[0])?.merchant.name??'Merchant'} → ${sim.getOrder(r.orders[0])?.customerName??'Customer'}`:'Ready for the next promise';
  $('liveNote').hidden=selected!==null||scene.mode==='system';renderDetail();
  $('stage').style.setProperty('--weather',sim.weather==='rain'?'#e6ece7':'#f3f5ee');
}
function beep(frequency=540){if(!sound||!audioContext)return;const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.035,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.18);oscillator.connect(gain);gain.connect(audioGain);oscillator.start();oscillator.stop(audioContext.currentTime+.20);}
async function toggleSound(){
  sound=!sound;if(sound){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){sound=false;toast('Sound is unavailable.','The simulation continues without audio.');return;}if(!audioContext){audioContext=new Audio();audioGain=audioContext.createGain();audioGain.gain.value=.7;audioGain.connect(audioContext.destination);}await audioContext.resume();beep(660);}else if(audioContext)await audioContext.suspend();
  $('soundButton').innerHTML=icon(sound?'sound':'mute');$('soundButton').setAttribute('aria-label',sound?'Mute sound':'Enable sound');$('soundButton').setAttribute('aria-pressed',String(sound));
}

scene=new CityScene($('cityCanvas'),sim,select);
$('impactClose').addEventListener('click',()=>{$('impactPanel').hidden=true;$('lastDecision').setAttribute('aria-expanded','false');$('stage').classList.remove('has-impact');scene.clearImpact();$('policyBadge').hidden=true;});
$('impactReplay').addEventListener('click',()=>{const impact=feedback.replay();if(impact)presentImpact(impact,{replay:true});});
$('lastDecision').addEventListener('click',()=>{const impact=feedback.replay();if(impact)presentImpact(impact,{replay:true});});
$('impactFocus').addEventListener('click',()=>{const entity=scene.focusAffected();if(entity)select(entity);});
$('optimization').addEventListener('change',commitObjective);
$('startButton').addEventListener('click',start);$('restartTop').addEventListener('click',start);$('runAgain').addEventListener('click',start);$('navExplore').addEventListener('click',explore);$('exploreButton').addEventListener('click',explore);$('nextEvent').addEventListener('click',nextEvent);$('closeDetail').addEventListener('click',()=>select(null));$('soundButton').addEventListener('click',toggleSound);
$('methodButton').addEventListener('click',()=>{$('methodNote').hidden=!$('methodNote').hidden;$('methodButton').setAttribute('aria-expanded',String(!$('methodNote').hidden));});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{scene.setView(button.dataset.view);syncViews(button.dataset.view);announce(`${button.textContent} view selected`);}));
$('zoomIn').addEventListener('click',()=>scene.changeZoom(.15));$('zoomOut').addEventListener('click',()=>scene.changeZoom(-.15));$('resetCamera').addEventListener('click',()=>{scene.resetCamera();select(null);});
$('pauseButton').addEventListener('click',()=>{if(mode==='summary'){explore();return;}paused=!paused;sim.running=!paused;$('pauseButton').innerHTML=icon(paused?'play':'pause');$('pauseButton').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');$('pauseButton').setAttribute('aria-pressed',String(paused));announce(paused?'Simulation paused':'Simulation resumed');});
$('speedButton').addEventListener('click',()=>{speed=speed===1?2:speed===2?4:1;$('speedButton').textContent=`${speed}×`;$('speedButton').setAttribute('aria-label',`Change simulation speed, currently ${speed} times`);announce(`Simulation speed ${speed} times`);});
let sliderTimer;
$('optimization').addEventListener('input',()=>{syncObjective();$('objectivePreview').hidden=false;$('policyBadge').hidden=false;$('policyBadge').textContent='Objective preview · release to apply new scoring weights';$('objectivePreview').textContent=Number($('optimization').value)<32?'Preview: more weight on deadline protection and low-load riders.':Number($('optimization').value)>68?'Preview: more weight on added distance and compatible shared routes.':'Preview: balance added distance, customer detours, and deadline buffers.';clearTimeout(sliderTimer);sliderTimer=setTimeout(commitObjective,450);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')select(null);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&audioContext?.state==='running')audioContext.suspend();else if(sound&&audioContext?.state==='suspended')audioContext.resume();});

let last=performance.now(),uiClock=1,elapsed=0,visualClock=0,frames=0,slowFrames=0,lastDeliverySound=0;
function frame(now){
  requestAnimationFrame(frame);const raw=(now-last)/1000;last=now;if(document.hidden)return;const dt=Math.min(.10,raw),scaled=dt*speed;elapsed+=dt;
  if(!paused)visualClock+=scaled;
  const simDelta=paused?0:mode==='opening'?scaled*.55:pending?scaled*.12:mode==='summary'?0:scaled;
  sim.update(simDelta);const realized=feedback.observe(sim.events);if(realized)presentImpact(realized);updateStory(scaled);
  if(mode==='opening'&&!scene.interacted&&!reduced)scene.targetAngle=Math.PI/4+Math.sin(elapsed*.08)*.025;
  scene.render(paused?0:scaled,visualClock,reduced,dt);uiClock+=dt;if(uiClock>.9){uiClock=0;updateUI();}
  for(const event of sim.events)if(event.type==='delivered'&&elapsed-lastDeliverySound>4){beep(380);lastDeliverySound=elapsed;}sim.events=[];
  frames++;if(raw>.034)slowFrames++;if(frames===180&&slowFrames>90)scene.reduceDetail();
}
scene.render(0,0,reduced);updateUI();requestAnimationFrame(frame);
clearInterval(loading);$('loadLine').style.width='100%';$('loadPercent').textContent='100%';
setTimeout(()=>{if(window.gsap&&!reduced)gsap.to($('loader'),{opacity:0,duration:.45,onComplete:()=>{$('loader').hidden=true;animateIn([document.querySelector('.small-tag'),$('opening').querySelector('h1'),$('opening').querySelector('p'),$('startButton')].filter(Boolean));}});else $('loader').hidden=true;},450);
// Explicitly scoped inspection hook supports deterministic QA without a backend.
window.PulseCity={sim,feedback,scene,applyDecision,start,explore,getState:()=>({mode,phase,pending,speed,paused,metrics:sim.metrics()}),nextEvent,select};
