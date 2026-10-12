import * as THREE from './three.module.min.js';
import {ROAD,MERCHANTS,DISTRICTS,roadPath,distance,createRandom} from './simulation.js';
import {heatState} from './feedback.js';
import {buildImpactGeometry,disposeImpact} from './impact-scene.js';

const COLORS={grass:'#b8c5a5',road:'#aeb9ab',walk:'#e4e9da',tree:'#7f9b69',trunk:'#a19071',window:'#9ab3ad',roof:'#eef0e6'};
const pickDistrict=p=>DISTRICTS.reduce((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-b.x,p.z-b.z)?a:b);
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true,...extra});
const roundedSquare=(size,r)=>{const s=new THREE.Shape(),a=-size/2,b=size/2;s.moveTo(a+r,a);s.lineTo(b-r,a);s.quadraticCurveTo(b,a,b,a+r);s.lineTo(b,b-r);s.quadraticCurveTo(b,b,b-r,b);s.lineTo(a+r,b);s.quadraticCurveTo(a,b,a,b-r);s.lineTo(a,a+r);s.quadraticCurveTo(a,a,a+r,a);return s;};

export function createWorld() {
  const world=new THREE.Group(),buildings=new THREE.Group(),nature=new THREE.Group(),ground=new THREE.Group();
  world.add(ground,buildings,nature);const random=createRandom(7104),buckets=new Map();
  const cube=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  function box(x,y,z,w,h,d,color,group=buildings,entity=null) {
    const key=group.uuid+'-'+color;if(!buckets.has(key))buckets.set(key,{group,color,items:[]});
    buckets.get(key).items.push({x,y,z,w,h,d,entity});
  }
  const baseGeometry=new THREE.ExtrudeGeometry(roundedSquare(44,.8),{depth:1,bevelEnabled:true,bevelSize:.2,bevelThickness:.2,bevelSegments:1,curveSegments:3});
  baseGeometry.rotateX(-Math.PI/2);baseGeometry.translate(0,-1.28,0);
  const base=new THREE.Mesh(baseGeometry,material('#ccd6bf'));base.receiveShadow=true;ground.add(base);
  box(0,-.04,0,43.7,.14,43.7,'#dae1ce',ground);
  for(const p of ROAD) {
    box(p,.055,0,1.35,.05,42,'#aebaab',ground);box(0,.055,p,42,.05,1.35,'#aebaab',ground);
    for(let i=-20;i<=20;i+=2.0)if(!ROAD.some(v=>Math.abs(v-i)<.9)) {
      box(p,.087,i,.045,.015,.56,'#e3e8d9',ground);box(i,.087,p,.56,.015,.045,'#e3e8d9',ground);
    }
  }
  // A water edge and footbridge make the miniature a place, rather than a grid.
  box(0,.025,-21.3,41.8,.05,1.6,'#99b9b1',ground);
  for(let x=-18;x<=18;x+=6)box(x,.14,-21.3,1.2,.18,2.4,'#d8dfce',ground);
  for(let x=-17;x<=17;x+=2.4)box(x,.065,-21.3,.6,.01,.035,'#c0d5c8',ground);
  const centers=[-15,-9,-3,3,9,15];
  const trees=[];
  for(const x of centers)for(const z of centers) {
    const district=pickDistrict({x,z}),entity={type:'district',id:district.id};
    const park=(x===-3&&z===-3)||(x===3&&z===3)||(x===15&&z===15);
    box(x,.08,z,4.85,.09,4.85,COLORS.walk,ground);
    if(park) {
      box(x,.15,z,4.4,.08,4.4,'#b7c69c',ground);
      box(x,.20,z,4.45,.02,.47,'#e3e7cc',ground);box(x,.20,z,.47,.02,4.45,'#e3e7cc',ground);
      for(const dx of [-1.35,1.35])for(const dz of [-1.35,1.35])trees.push({x:x+dx,z:z+dz,size:1.2+random()*.6});
      if(x===3){const fountain=new THREE.Mesh(new THREE.CylinderGeometry(.68,.76,.28,16),material('#f0f1e4'));fountain.position.set(x,.36,z);fountain.receiveShadow=true;ground.add(fountain);const water=new THREE.Mesh(new THREE.CircleGeometry(.58,20),material('#91b7b0'));water.rotation.x=-Math.PI/2;water.position.set(x,.51,z);ground.add(water);}
      for(const dz of [-1.15,1.15]){box(x,.36,z+dz,1.1,.16,.32,'#a49275',nature);box(x,.23,z+dz,.09,.30,.24,'#6c8062',nature);}
      continue;
    }
    const warehouse=x<-10&&z>5;
    const tower=x>2&&z<0;
    const food=x<=0&&z>=0&&z<10;
    const count=warehouse?1:2;
    for(let n=0;n<count;n++) {
      const bx=x+(n===0?-.95:1.1),bz=z+(n===0?-.65:.78);
      const height=warehouse?1.9:tower?4+random()*4.7:food?1.25+random()*1.2:2.3+random()*2.7;
      const w=warehouse?3.8:1.8+random()*.42,d=warehouse?3.6:1.75+random()*.45;
      const palette=warehouse?['#a7b5a8']:tower?['#b0c3b8','#d0d8cb','#b4c8c2','#e4e6d6']:food?['#d3a985','#debd94','#c3ba9c','#d2c6a7']:['#c4cebb','#d9dbc5','#b5c5ad','#d1d9c6','#bbccbd'];
      const color=palette[Math.floor(random()*palette.length)];
      box(bx,height/2+.24,bz,w,height,d,color,buildings,entity);
      box(bx,height+.25,bz,w+.11,.16,d+.11,COLORS.roof,buildings,entity);
      box(bx,height+.42,bz-.28,.44,.19,.62,'#b5c0ae',buildings);
      if(height>4) {
        box(bx+.3,height+.68,bz+.22,w*.57,.72,d*.55,'#d5ded1',buildings,entity);
        box(bx+.3,height+1.07,bz+.22,w*.61,.10,d*.59,COLORS.roof,buildings);
      }
      if(food) {
        box(bx,.85,bz+d/2+.11,w+.12,.14,.45,'#b27e53',buildings,entity);
        box(bx,.49,bz+d/2+.03,w*.64,.63,.05,'#668a80',buildings,entity);
        for(let stripe=-2;stripe<=2;stripe++)box(bx+stripe*w/5,.93,bz+d/2+.18,w/12,.04,.40,'#f0dfbd',buildings);
      } else if(!warehouse) {
        for(let y=.95;y<height-.3;y+=.86)for(let a of [-.43,.43]) {
          box(bx+a,y,bz+d/2+.025,.33,.36,.03,'#8eaaa0',buildings,entity);
          box(bx+w/2+.025,y,bz+a,.03,.36,.33,'#91aaa0',buildings,entity);
          if(height>4)box(bx-w/2-.025,y,bz+a,.03,.38,.33,'#9ab3ad',buildings,entity);
        }
        box(bx,.6,bz+d/2+.03,.4,.85,.05,'#7e9485',buildings,entity);
      } else {
        for(let a=-1;a<=1;a++)box(bx+a,.65,bz+d/2+.03,.55,.8,.04,'#7d9184',buildings,entity);
        for(let a=-1.5;a<=1.5;a+=.5)box(bx+a,height+.35,bz,.05,.02,d-.2,'#a8b6a3',buildings);
      }
    }
    for(const dx of [-2.05,2.05])if(random()>.18)trees.push({x:x+dx,z:z+2.0,size:.9+random()*.5});
  }
  // Street details are instanced along with buildings and windows.
  for(const x of [-12,0,12])for(const z of [-12,0,12]) {
    for(let p=-2;p<=2;p++)box(x+p*.21,.09,z+.88,.12,.015,.5,'#e2e8d8',ground);
    box(x+.8,.9,z+.8,.045,1.7,.045,'#72876c',nature);
    box(x+.9,1.74,z+.8,.30,.10,.14,'#dce4c4',nature);
  }
  for(const bucket of buckets.values()) {
    const mesh=new THREE.InstancedMesh(cube,material(bucket.color),bucket.items.length);
    mesh.userData.entities=bucket.items.map(i=>i.entity);
    bucket.items.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=bucket.group!==ground;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;bucket.group.add(mesh);
  }
  const foliageGeometry=new THREE.IcosahedronGeometry(1,0),foliage=new THREE.InstancedMesh(foliageGeometry,material('#849d6c'),trees.length),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.075,.09,1,5),material(COLORS.trunk),trees.length);
  trees.forEach((tree,i)=>{dummy.position.set(tree.x,tree.size*.92,tree.z);dummy.scale.set(tree.size*.50,tree.size*.67,tree.size*.50);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);dummy.position.y=tree.size*.35;dummy.scale.set(1,tree.size*.62,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);});
  foliage.castShadow=true;foliage.receiveShadow=true;trunks.castShadow=true;nature.add(foliage,trunks);
  const merchantGroup=new THREE.Group();world.add(merchantGroup);
  for(const m of MERCHANTS) {
    const group=new THREE.Group();group.position.set(m.position.x,.1,m.position.z);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.72,6),material('#997c59'));stem.position.y=.43;
    const pin=new THREE.Mesh(new THREE.BoxGeometry(.4,.38,.4),material('#dca86c'));pin.position.y=.97;
    const cap=new THREE.Mesh(new THREE.BoxGeometry(.46,.09,.46),material('#f4e6c7'));cap.position.y=1.20;
    group.add(stem,pin,cap);group.children.forEach(mesh=>{mesh.userData.entity={type:'merchant',id:m.id};mesh.castShadow=true;});merchantGroup.add(group);
  }
  return {world,ground,buildings,nature,merchantGroup};
}

export function createScooter() {
  const group=new THREE.Group();
  const part=(geo,color,x,y,z)=>{const mesh=new THREE.Mesh(geo,material(color));mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
  part(new THREE.BoxGeometry(.68,.22,.26),'#839852',0,.40,0);
  part(new THREE.BoxGeometry(.38,.38,.36),'#d5ee86',-.22,.78,0);
  part(new THREE.BoxGeometry(.20,.32,.22),'#294c40',.08,.73,0);
  part(new THREE.SphereGeometry(.14,8,5),'#f5f4db',.10,1.0,0);
  part(new THREE.BoxGeometry(.12,.4,.21),'#9aad70',.28,.6,0);
  for(const x of [-.26,.28]){const wheel=part(new THREE.CylinderGeometry(.14,.14,.10,8),'#455948',x,.20,0);wheel.rotation.x=Math.PI/2;}
  const light=part(new THREE.BoxGeometry(.035,.12,.20),'#f3f0cf',.37,.5,0);
  return group;
}

export class CityScene {
  constructor(canvas,simulation,onSelect) {
    this.canvas=canvas;this.sim=simulation;this.onSelect=onSelect;this.mode='city';this.selected=null;this.zoom=1;this.targetZoom=1;this.angle=Math.PI/4;this.targetAngle=Math.PI/4;this.elevation=.79;this.targetElevation=.79;this.layout='opening';this.low=innerWidth<700||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:!this.low,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.low?1.3:1.7));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.06;this.renderer.shadowMap.enabled=!this.low;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-50,50,25,-25,.1,300);
    const hemi=new THREE.HemisphereLight('#fffbea','#899e7e',1.7);this.scene.add(hemi);
    const sun=new THREE.DirectionalLight('#fff5dd',2.4);sun.position.set(-22,38,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.camera.near=1;sun.shadow.camera.far=100;sun.shadow.normalBias=.03;sun.shadow.bias=-.0001;sun.shadow.radius=4;this.sun=sun;this.scene.add(sun);
    const shadowGround=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.ShadowMaterial({opacity:.12}));shadowGround.rotation.x=-Math.PI/2;shadowGround.position.y=-1.6;shadowGround.receiveShadow=true;this.scene.add(shadowGround);
    this.city=createWorld();this.scene.add(this.city.world);this.riderGroup=new THREE.Group();this.scene.add(this.riderGroup);this.riderMeshes=new Map();
    for(const r of simulation.riders){const group=createScooter();group.traverse(mesh=>mesh.userData.entity={type:'rider',id:r.id});this.riderMeshes.set(r.id,group);this.riderGroup.add(group);}
    this.routeGroup=new THREE.Group();this.scene.add(this.routeGroup);this.orderGroup=new THREE.Group();this.scene.add(this.orderGroup);this.orderMeshes=new Map();
    this.orderSphere=new THREE.SphereGeometry(.21,8,5);this.orderRing=new THREE.RingGeometry(.35,.43,24);this.orderCone=new THREE.ConeGeometry(.10,.30,6);
    this.orderMaterials={healthy:new THREE.MeshBasicMaterial({color:'#6aa5b0'}),warning:new THREE.MeshBasicMaterial({color:'#c79751'}),risk:new THREE.MeshBasicMaterial({color:'#cc8e53'}),late:new THREE.MeshBasicMaterial({color:'#c96e59'})};
    this.heatGroup=new THREE.Group();this.scene.add(this.heatGroup);this.heatMeshes=[];
    for(const district of DISTRICTS){const group=new THREE.Group();group.position.set(district.x,.115,district.z);for(let i=0;i<4;i++){const mesh=new THREE.Mesh(new THREE.CircleGeometry(district.radius*(1-i*.2),32),new THREE.MeshBasicMaterial({color:'#dfa25e',transparent:true,opacity:.0,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.y=i*.003;group.add(mesh);}this.heatMeshes.push({group,district});this.heatGroup.add(group);}
    this.traffic=[];const carColors=['#e8ebd8','#789a8b','#a8b799','#d0b59a'];
    for(let i=0;i<(this.low?7:14);i++){const car=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.7,.24,.36),material(carColors[i%4])),roof=new THREE.Mesh(new THREE.BoxGeometry(.36,.2,.30),material('#c3d1c3'));body.position.y=.3;roof.position.y=.49;car.add(body,roof);this.scene.add(car);const inset=6+(i%3)*6;this.traffic.push({mesh:car,corners:[{x:-inset,z:-inset},{x:inset,z:-inset},{x:inset,z:inset},{x:-inset,z:inset}],progress:i*4.71,inset});}
    this.heatMix=0;this.materialStyles=[];this.city.world.traverse(mesh=>{if(mesh.material?.color)this.materialStyles.push({material:mesh.material,base:mesh.material.color.clone(),dim:mesh.material.color.clone().lerp(new THREE.Color('#c4cdc1'),.52)});});
    this.heatMeshes.forEach(({group,district})=>group.children.forEach(mesh=>{mesh.material.depthTest=false;mesh.renderOrder=8;mesh.userData.entity={type:'district',id:district.id};}));
    this.impact=null;this.impactGroup=null;this.impactAge=0;this.impactLabels=[];this.focus=new THREE.Vector3();this.focusTarget=new THREE.Vector3();
    this.createRain();this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.labels=[];
    const labels=document.getElementById('mapLabels');for(const d of DISTRICTS){const label=document.createElement('button');label.className='map-label';label.textContent=d.name;label.addEventListener('click',()=>this.onSelect({type:'district',id:d.id}));labels.append(label);this.labels.push({el:label,district:d,position:new THREE.Vector3(d.x,0,d.z-3.5)});}
    this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.bindInteractions();this.routeClock=2;this.trafficTime=0;
  }
  createRain() {
    this.rainCount=this.low?95:250;this.rainPositions=new Float32Array(this.rainCount*6);this.rainSeeds=[];const rnd=createRandom(455);
    for(let i=0;i<this.rainCount;i++)this.rainSeeds.push({x:(rnd()-.5)*45,z:(rnd()-.5)*45,y:rnd()*22});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(this.rainPositions,3));this.rain=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#7d9b9e',transparent:true,opacity:.31,depthWrite:false}));this.rain.frustumCulled=false;this.rain.visible=false;this.scene.add(this.rain);
  }
  resize() {
    const rect=this.canvas.parentElement.getBoundingClientRect();this.width=Math.max(1,rect.width);this.height=Math.max(1,rect.height);this.renderer.setSize(this.width,this.height,false);this.updateCamera(true);
  }
  updateCamera(immediate=false) {
    const blend=immediate?1:.08;
    this.zoom+=(this.targetZoom-this.zoom)*blend;this.angle+=(this.targetAngle-this.angle)*blend;this.elevation+=(this.targetElevation-this.elevation)*blend;
    const aspect=this.width/this.height;
    const half=Math.max(24,34/aspect)/this.zoom;
    const shiftX=0,shiftY=-1;
    this.camera.left=-half*aspect-shiftX;this.camera.right=half*aspect-shiftX;this.camera.top=half+shiftY;this.camera.bottom=-half+shiftY;
    this.focus.lerp(this.focusTarget,blend);const radius=70;this.camera.position.set(Math.sin(this.angle)*Math.cos(this.elevation)*radius,Math.sin(this.elevation)*radius,Math.cos(this.angle)*Math.cos(this.elevation)*radius).add(this.focus);this.camera.lookAt(this.focus);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  }
  bindInteractions() {
    let start=null,drag=false;
    this.canvas.addEventListener('pointerdown',event=>{this.interacted=true;start={x:event.clientX,y:event.clientY,angle:this.targetAngle,elevation:this.targetElevation};drag=false;if(event.pointerType==='mouse')this.canvas.setPointerCapture(event.pointerId);});
    this.canvas.addEventListener('pointermove',event=>{
      if(start){const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>6||Math.abs(dy)>6){drag=true;this.targetAngle=start.angle-dx*.004;this.targetElevation=THREE.MathUtils.clamp(start.elevation+dy*.002,.57,1.05);this.canvas.style.cursor='grabbing';document.getElementById('hoverLabel').hidden=true;}return;}
      if(event.pointerType==='touch')return;const hit=this.pick(event.clientX,event.clientY);this.canvas.style.cursor=hit?'pointer':'grab';const hover=document.getElementById('hoverLabel');hover.hidden=!hit;
      if(hit){const rect=this.canvas.getBoundingClientRect();hover.style.left=`${event.clientX-rect.left}px`;hover.style.top=`${event.clientY-rect.top}px`;hover.textContent=this.entityLabel(hit);}
    });
    this.canvas.addEventListener('pointerup',event=>{if(start&&!drag){const hit=this.pick(event.clientX,event.clientY);if(hit)this.onSelect(hit);}start=null;drag=false;this.canvas.style.cursor='grab';});
    this.canvas.addEventListener('pointercancel',()=>{start=null;drag=false;});
    this.canvas.addEventListener('pointerleave',()=>{document.getElementById('hoverLabel').hidden=true;});
    this.canvas.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)return;event.preventDefault();this.changeZoom(-Math.sign(event.deltaY)*.08);},{passive:false});
    this.canvas.addEventListener('keydown',event=>{
      this.interacted=true;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home','Enter','Escape'].includes(event.key))event.preventDefault();
      if(event.key==='ArrowLeft')this.targetAngle+=.15;if(event.key==='ArrowRight')this.targetAngle-=.15;
      if(event.key==='ArrowUp')this.targetElevation=THREE.MathUtils.clamp(this.targetElevation+.06,.57,1.05);
      if(event.key==='ArrowDown')this.targetElevation=THREE.MathUtils.clamp(this.targetElevation-.06,.57,1.05);
      if(['+','='].includes(event.key))this.changeZoom(.12);if(event.key==='-')this.changeZoom(-.12);if(event.key==='Home')this.resetCamera();if(event.key==='Enter')this.onSelect({type:'rider',id:'R07'});if(event.key==='Escape')this.onSelect(null);
    });
  }
  pick(x,y) {
    const rect=this.canvas.getBoundingClientRect();this.pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    if(this.mode==='heat'){
      const liveHits=this.raycaster.intersectObjects([this.riderGroup,this.orderGroup,this.city.merchantGroup,this.impactGroup].filter(Boolean),true);const entity=liveHits.find(hit=>hit.object.userData.entity?.type!=='district'&&hit.object.userData.entity)?.object.userData.entity;if(entity)return entity;
      const heatHits=this.raycaster.intersectObject(this.heatGroup,true);if(heatHits.length){const hit=heatHits.sort((a,b)=>{const da=DISTRICTS.find(d=>d.id===a.object.userData.entity.id),db=DISTRICTS.find(d=>d.id===b.object.userData.entity.id);return Math.hypot(a.point.x-da.x,a.point.z-da.z)-Math.hypot(b.point.x-db.x,b.point.z-db.z);})[0];return hit.object.userData.entity;}
    }
    const groups=[this.riderGroup,this.orderGroup,this.city.merchantGroup];if(this.impactGroup)groups.push(this.impactGroup);if(this.mode!=='system')groups.push(this.city.buildings);
    const hits=this.raycaster.intersectObjects(groups,true);
    for(const hit of hits){const entity=hit.object.userData.entity??hit.object.userData.entities?.[hit.instanceId];if(entity&&(!(entity.type==='order')||this.sim.getOrder(entity.id)?.status!=='delivered'))return entity;}
    return null;
  }
  entityLabel(entity) {
    if(entity.type==='rider')return `Rider ${entity.id} · ${this.sim.getRider(entity.id)?.status}`;
    if(entity.type==='order')return `Order #${entity.id} · ${this.sim.getOrder(entity.id)?.risk==='late'?'ETA exceeds promise':'View promise'}`;
    if(entity.type==='merchant')return MERCHANTS.find(m=>m.id===entity.id)?.name;
    const district=DISTRICTS.find(d=>d.id===entity.id);const orders=this.sim.districtOrders(district);return `${district.name} · ${orders.length} open · ${orders.filter(o=>o.status==='waiting').length} waiting · ${orders.filter(o=>o.buffer<3).length} at risk`;
  }
  changeZoom(amount){this.interacted=true;this.targetZoom=THREE.MathUtils.clamp(this.targetZoom+amount,.70,1.45);}
  resetCamera(){this.targetAngle=Math.PI/4;this.targetElevation=.79;this.targetZoom=1;this.focusTarget.set(0,0,0);}
  setView(mode){this.mode=mode;this.city.buildings.visible=mode!=='system';this.city.nature.visible=mode!=='system';this.routeClock=2;}
  setSelected(entity){this.selected=entity;this.routeClock=2;}
  updateHeatLayer(realDt,reduced=false){
    const target=this.mode==='heat'?1:0;this.heatMix=reduced?target:this.heatMix+(target-this.heatMix)*Math.min(1,realDt/.12);
    for(const style of this.materialStyles)style.material.color.copy(style.base).lerp(style.dim,this.heatMix);
    const heat=heatState(this.sim);
    this.heatMeshes.forEach(({group},index)=>{const data=heat[index];group.visible=this.heatMix>.005&&data.count>0;group.children.forEach((mesh,i)=>{mesh.material.opacity=this.heatMix*data.intensity*(.18+i*.025);mesh.material.color.set(data.level==='high'?'#cf8b72':data.level==='medium'?'#d2ab69':'#82aaa0');});});
  }
  focusAffected(){
    if(!this.impact)return null;if(this.impact.focusOrderId){const order=this.sim.getOrder(this.impact.focusOrderId);if(order){this.focusTarget.set(order.customer.x*.35,0,order.customer.z*.35);this.targetZoom=1.15;return {type:'order',id:order.id};}}const id=this.impact.changedRoutes[0]??this.impact.affectedRiderIds[0];
    const entity=id?{type:'rider',id}:this.impact.affectedOrderIds[0]?{type:'order',id:this.impact.affectedOrderIds[0]}:this.impact.affectedDistrictIds[0]?{type:'district',id:this.impact.affectedDistrictIds[0]}:null;
    const p=entity?.type==='rider'?this.sim.getRider(entity.id).position:entity?.type==='order'?this.sim.getOrder(entity.id)?.customer:entity?DISTRICTS.find(d=>d.id===entity.id):null;
    if(p){this.focusTarget.set(p.x*.35,0,p.z*.35);this.targetZoom=1.15;}return entity;
  }
  presentImpact(impact){
    this.clearImpact();this.impact=impact;this.impactAge=0;this.impactGroup=buildImpactGeometry(this.sim,impact);this.scene.add(this.impactGroup);
    for(const label of this.impactGroup.userData.labels){const el=document.createElement('button');el.className=`impact-map-label ${label.category}`;el.textContent=label.text;el.addEventListener('click',()=>this.onSelect(label.entity));document.getElementById('impactMapLabels').append(el);this.impactLabels.push({...label,el});}
    this.routeClock=2;
  }
  clearImpact(){
    if(this.impactGroup){this.scene.remove(this.impactGroup);disposeImpact(this.impactGroup);}this.impactGroup=null;this.impact=null;this.impactLabels.forEach(l=>l.el.remove());this.impactLabels=[];this.routeClock=2;
  }
  rebuildRoutes() {
    for(const mesh of [...this.routeGroup.children]){mesh.geometry.dispose();mesh.material.dispose();this.routeGroup.remove(mesh);}
    for(const r of this.sim.riders) {
      if(!r.stops.length)continue;
      let points=[r.position],last=r.position;
      for(const stop of r.stops){points.push(...roadPath(last,stop.position).slice(1));last=stop.position;}
      points=points.filter((p,i)=>i===0||distance(p,points[i-1])>.025);
      if(points.length<2)continue;
      const highlighted=this.impact&&this.impactAge<8?this.impact.affectedRiderIds.includes(r.id):this.selected?.type==='rider'?this.selected.id===r.id:this.selected?.type==='order'?this.sim.getOrder(this.selected.id)?.assignedRider===r.id:r.id==='R07';
      const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1].x,.145,points[i-1].z),new THREE.Vector3(points[i].x,.145,points[i].z)));
      const geometry=new THREE.TubeGeometry(curve,Math.max(8,points.length*5),highlighted?.095:.062,4,false);
      const color=highlighted?'#d0ea77':(this.mode==='system'?'#638b80':'#619d9a');
      const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:highlighted?.93:this.mode==='heat'?.15:this.impact&&this.impactAge<8?.17:this.selected?.type==='rider'?.12:.55,depthWrite:false}));this.routeGroup.add(mesh);
    }
  }
  syncOrders(time,reduced) {
    const active=this.sim.activeOrders(),ids=new Set(active.map(o=>o.id));
    for(const [id,group] of this.orderMeshes)if(!ids.has(id)){for(const m of group.children)if(m.material.transparent)m.material.dispose();this.orderGroup.remove(group);this.orderMeshes.delete(id);}
    for(const order of active) {
      let group=this.orderMeshes.get(order.id);
      if(!group){group=new THREE.Group();const ring=new THREE.Mesh(this.orderRing,new THREE.MeshBasicMaterial({color:'#6aa5b0',transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.12;const dot=new THREE.Mesh(this.orderSphere,this.orderMaterials[order.risk]),cone=new THREE.Mesh(this.orderCone,this.orderMaterials[order.risk]);cone.rotation.z=Math.PI;cone.position.y=1.14;dot.position.y=1.47;group.add(ring,cone,dot);group.children.forEach(mesh=>mesh.userData.entity={type:'order',id:order.id});const jitter=(Number(order.id.slice(1))%5-2)*.13;group.position.set(order.customer.x+jitter,0,order.customer.z+jitter);this.orderMeshes.set(order.id,group);this.orderGroup.add(group);}
      const [ring,cone,dot]=group.children;colorUpdate(ring.material,this.orderMaterials[order.risk].color);cone.material=dot.material=this.orderMaterials[order.risk];
      const pulse=reduced?1:1+((time*.75+Number(order.id.slice(1))*.1)%1)*1.1;ring.scale.set(pulse,pulse,1);ring.material.opacity=reduced?.40:.55-(pulse-1)*.32;
      dot.position.y=1.47+(reduced?0:Math.sin(time*1.6+Number(order.id.slice(1)))*.035);
      const selected=this.selected?.type==='order'&&this.selected.id===order.id;group.scale.setScalar(selected?1.7:1);
    }
  }
  render(dt,time,reduced=false,realDt=dt) {
    this.updateCamera();
    for(const rider of this.sim.riders) {
      const mesh=this.riderMeshes.get(rider.id);const old=mesh.position.clone();mesh.position.set(rider.position.x,.1,rider.position.z);
      if(Math.abs(mesh.position.x-old.x)+Math.abs(mesh.position.z-old.z)>.001){const direction=Math.atan2(-(mesh.position.z-old.z),mesh.position.x-old.x);mesh.rotation.y=direction;}
      const selected=this.selected?.type==='rider'&&this.selected.id===rider.id;mesh.scale.setScalar(selected?1.5:1.2);mesh.visible=rider.available||rider.orders.length>0;
    }
    this.routeClock+=dt;if(this.routeClock>1.2){this.routeClock=0;this.rebuildRoutes();}
    this.syncOrders(time,reduced);
    this.updateHeatLayer(realDt,reduced);
    this.trafficTime+=dt*(this.sim.weather==='rain'?.65:1)*(this.sim.running?1:0);
    for(const car of this.traffic){const perimeter=car.inset*8,p=(this.trafficTime*.85+car.progress)%perimeter,edge=car.inset*2,index=Math.floor(p/edge),f=(p%edge)/edge;const a=car.corners[index],b=car.corners[(index+1)%4];car.mesh.position.set(a.x+(b.x-a.x)*f,.1,a.z+(b.z-a.z)*f);car.mesh.rotation.y=Math.atan2(-(b.z-a.z),b.x-a.x);}
    this.rain.visible=this.sim.weather==='rain';if(this.rain.visible){for(let i=0;i<this.rainSeeds.length;i++){const seed=this.rainSeeds[i];seed.y-=reduced?0:dt*12;if(seed.y<.2)seed.y=22;const j=i*6;this.rainPositions[j]=seed.x;this.rainPositions[j+1]=seed.y;this.rainPositions[j+2]=seed.z;this.rainPositions[j+3]=seed.x-.18;this.rainPositions[j+4]=seed.y-.65;this.rainPositions[j+5]=seed.z+.1;}this.rain.geometry.attributes.position.needsUpdate=true;}
    this.sun.intensity+=( (this.sim.weather==='rain'?1.25:2.4)-this.sun.intensity)*.02;
    for(const label of this.labels){const p=label.position.clone().project(this.camera);label.el.style.left=`${(p.x*.5+.5)*this.width}px`;label.el.style.top=`${(-p.y*.5+.5)*this.height}px`;label.el.hidden=p.x<-1||p.x>1||p.y<-1||p.y>1;label.el.textContent=label.district.name+(this.mode==='heat'?` · ${this.sim.districtOrders(label.district).length} orders`:'');}
    if(this.impactGroup){
      this.impactAge+=this.sim.running?realDt:0;const visible=this.impactAge<8;this.impactGroup.visible=visible;
      for(const mesh of this.impactGroup.children)if(mesh.userData.liveRiderId){const r=this.sim.getRider(mesh.userData.liveRiderId);mesh.position.x=r.position.x;mesh.position.z=r.position.z;}
      for(const label of this.impactLabels){if(label.liveRiderId){const r=this.sim.getRider(label.liveRiderId);label.position.x=r.position.x;label.position.z=r.position.z;}const p=label.position.clone().project(this.camera);label.el.style.left=`${(p.x*.5+.5)*this.width}px`;label.el.style.top=`${(-p.y*.5+.5)*this.height}px`;label.el.hidden=!visible||p.x<-1||p.x>1||p.y<-1||p.y>1;}
    }
    this.renderer.render(this.scene,this.camera);
  }
  reduceDetail(){this.low=true;this.renderer.setPixelRatio(1);this.renderer.shadowMap.enabled=false;}
}
function colorUpdate(mat,color){mat.color.copy(color);}
