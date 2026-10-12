import * as THREE from './three.module.min.js';

// The same canonical impact drives route comparison, live rider rings and ranked stops.
export function buildImpactGeometry(sim,impact){
  const group=new THREE.Group(),labels=[];group.name=`Decision impact ${impact.decisionId}`;
  function ring(position,color,label,entity,category){
    const mesh=new THREE.Mesh(new THREE.RingGeometry(.52,.64,24),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.86,depthTest:false,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(position.x,.22,position.z);mesh.renderOrder=15;mesh.userData={entity,category};group.add(mesh);
    if(label)labels.push({text:label,position:new THREE.Vector3(position.x,2.15,position.z),entity,category});return mesh;
  }
  function line(points,previous){
    if(points.length<2)return;
    const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,previous?.21:.24,p.z)));
    const mat=previous?new THREE.LineDashedMaterial({color:'#7f918b',dashSize:.55,gapSize:.35,transparent:true,opacity:.65,depthTest:false,depthWrite:false}):new THREE.LineBasicMaterial({color:'#9cbc61',transparent:true,opacity:.9,depthTest:false,depthWrite:false});
    const mesh=new THREE.Line(geo,mat);if(previous)mesh.computeLineDistances();mesh.renderOrder=12;mesh.userData.category=previous?'previous-route':'updated-route';group.add(mesh);
  }
  for(const riderId of impact.changedRoutes.slice(0,4)){
    if(impact.priorRoutes[riderId])line(impact.priorRoutes[riderId],true);
    if(impact.updatedRoutes[riderId])line(impact.updatedRoutes[riderId],false);
    const rider=impact.riderChanges[riderId]?.after??sim.getRider(riderId);if(!rider)continue;
    rider.stops.slice(0,6).forEach((stop,i)=>{
      ring(stop.position,stop.type==='pickup'?'#c79a67':'#709e98',null,{type:'order',id:stop.orderId},'numbered-stop');
      if(labels.length<12)labels.push({text:`${i+1}${stop.type==='pickup'?' ↑':' ↓'} #${stop.orderId}`,position:new THREE.Vector3(stop.position.x,.8,stop.position.z),entity:{type:'order',id:stop.orderId},category:'numbered-stop'});
    });
  }
  for(const riderId of impact.affectedRiderIds){
    const rider=sim.getRider(riderId);if(!rider)continue;
    const halo=ring(rider.position,impact.visualKind==='weather'?'#769397':'#93ad66',null,{type:'rider',id:riderId},'affected-rider');halo.userData.liveRiderId=riderId;
    if(labels.length<12)labels.push({text:rider.orders.length>1&&impact.visualKind==='batch'?`B:${riderId} · ${rider.orders.length} orders`:riderId,liveRiderId:riderId,position:new THREE.Vector3(rider.position.x,1.65,rider.position.z),entity:{type:'rider',id:riderId},category:'affected-rider'});
  }
  for(const id of impact.newAssignments.slice(0,2)){
    const o=impact.orderChanges[id]?.after;if(!o)continue;
    ring(o.pickup,'#c79a67',`Pickup · #${id}`,{type:'merchant',id:o.merchantId},'pickup');
    ring(o.customer,'#6f9e9a',`Customer · #${id}`,{type:'order',id},'customer');
  }
  if(impact.focusOrderId&&!impact.newAssignments.includes(impact.focusOrderId)){
    const o=impact.orderChanges[impact.focusOrderId]?.after;if(o)ring(o.customer,'#709e98',`New · #${o.id} · waiting`,{type:'order',id:o.id},'new-order');
  }
  for(const [kind,ids] of [['promoted',impact.promoted],['displaced',impact.displaced]])for(const id of ids.slice(0,3)){
    const o=sim.getOrder(id);if(!o)continue;const change=impact.orderChanges[id];
    ring(o.customer,kind==='promoted'?'#709a77':'#c79564',`${kind==='promoted'?'↑':'↓'} #${id} · ${change.before.rank}→${change.after.rank}`,{type:'order',id},kind);
  }
  if(impact.visualKind==='weather')for(const id of impact.affectedOrderIds.filter(id=>sim.getOrder(id)?.buffer<3).slice(0,4)){
    const o=sim.getOrder(id);ring(o.customer,'#c78a63',`! #${id} · ${o.buffer.toFixed(1)} min`,{type:'order',id},'sla-warning');
  }
  group.userData.labels=labels;group.userData.impactId=impact.decisionId;return group;
}
export function disposeImpact(group){if(!group)return;group.traverse(mesh=>{mesh.geometry?.dispose();if(Array.isArray(mesh.material))mesh.material.forEach(m=>m.dispose());else mesh.material?.dispose();});}
