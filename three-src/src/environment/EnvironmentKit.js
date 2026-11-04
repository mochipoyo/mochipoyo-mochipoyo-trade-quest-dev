// Original modular geometry. Units: one map tile; Y up, +Z front. Static meshes only.
// Assets are construction parts, not complete authored environments.
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ASSET_IDS=['wall_ashlar','arch_round','column_classic','stairs_stone','parapet','floor_medallion','rock_cluster','stalagmites','mine_support','minecart','rail_section','ore_lift','market_stall','dock_section','mooring_post','waterwheel','clock_monument','server_pillar','pipe_bridge','magic_ring','basalt_ribs','ice_spires','library_shelf','roof_gable','half_timber_bay','courtyard_fountain'];
const configs={stone_courtyard:[0xd8cbb6,.9,0],stone_fortress:[0xadb9c3,.92,0],wood_oak:[0xb29471,.82,0],rock_basalt:[0x777581,.94,0],stone_sandstone:[0xdcc29b,.92,0],metal_industrial:[0x7b8d96,.57,.65],bronze:[0xb59152,.47,.7],cloth:[0x3b7377,1,0],glass:[0x84becb,.3,.1],glow:[0x8ce0ed,.4,.1],foliage:[0x49794d,1,0]};
export function createKitMaterials(){
 return Object.fromEntries(Object.entries(configs).map(([k,[color,roughness,metalness]])=>{
  const m=new T.MeshStandardMaterial({color,roughness,metalness});m.name=k;
  if(k==='glow'){m.emissive.set(0x50a6b3);m.emissiveIntensity=.35;}return[k,m];
 }));
}
// World-space-ish UV scale on predominantly planar meshes. Do not stretch a 1m brick across a whole palace.
function uvWorld(g,scale=3){const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;if(!u)return g;
 for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
  if(ay>ax&&ay>az)u.setXY(i,p.getX(i)/scale,p.getZ(i)/scale);
  else if(ax>az)u.setXY(i,p.getZ(i)/scale,p.getY(i)/scale);else u.setXY(i,p.getX(i)/scale,p.getY(i)/scale);
 }return g;
}
export function buildKitAsset(id,materials=createKitMaterials()){
 if(!ASSET_IDS.includes(id))throw new Error('Unknown environment asset '+id);
 const root=new T.Group();root.name=id;root.userData={environmentKit:true,collision:'author separately',units:'tile',up:'Y'};
 const mesh=(g,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const o=new T.Mesh(g,materials[mat]);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
 const box=(w,h,d,mat,x=0,y=h/2,z=0,ry=0)=>mesh(uvWorld(new RoundedBoxGeometry(w,h,d,1,Math.min(.035,w/10,h/10,d/10))),mat,x,y,z,0,ry);
 const cyl=(r1,r2,h,mat,x=0,y=h/2,z=0,n=16)=>mesh(new T.CylinderGeometry(r1,r2,h,n),mat,x,y,z);
 const torus=(r,t,mat,x=0,y=0,z=0,rx=0,ry=0)=>mesh(new T.TorusGeometry(r,t,6,40),mat,x,y,z,rx,ry);
 const beam=(a,b,width,depth,mat)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const o=box(width,v.length(),depth,mat);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;};
 const rock=(x,y,z,sx,sy,sz,seed,mat='rock_basalt')=>{const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const xx=p.getX(i),yy=p.getY(i),zz=p.getZ(i);const f=1+.12*Math.sin(xx*7+yy*4+zz*9+seed);p.setXYZ(i,xx*f*sx,yy*f*sy,zz*f*sz);}g.computeVertexNormals();return mesh(uvWorld(g),mat,x,y,z);};
 const pedestal=(mat='stone_courtyard')=>{box(1.2,.16,1.2,mat);box(1,.16,1,mat,0,.24);};
 const wheel=(x,y,z,r=.5)=>{torus(r,.065,'wood_oak',x,y,z);for(let i=0;i<8;i++){const a=i*Math.PI/4;beam([x,y,z],[x+Math.sin(a)*r,y+Math.cos(a)*r,z],.06,.07,'wood_oak');}cyl(.12,.12,.17,'metal_industrial',x,y,z).rotation.x=Math.PI/2;};
 if(id==='wall_ashlar'){
  for(let r=0;r<5;r++)for(let c=0;c<4;c++){const w=c===3&&r%2?.44:.73;box(w,.39,.46,'stone_fortress',-1.12+c*.75+(r%2)*.19,.2+r*.41,0);}
  box(3.1,.15,.65,'stone_courtyard',0,2.12);box(3.1,.16,.66,'stone_fortress',0,.08);
 }
 if(id==='arch_round'){
  for(const x of [-1.27,1.27]){box(.54,.16,.8,'stone_courtyard',x,.08);for(let y=0;y<4;y++)box(.46,.39,.63,'stone_fortress',x,.36+y*.4);box(.64,.14,.82,'stone_courtyard',x,1.88);}
  for(let i=0;i<15;i++){const a=i*Math.PI/15+.014,b=(i+1)*Math.PI/15-.014,sh=new T.Shape();sh.moveTo(Math.cos(a),1.9+Math.sin(a));sh.lineTo(1.52*Math.cos(a),1.9+1.52*Math.sin(a));sh.absarc(0,1.9,1.52,a,b,false);sh.lineTo(Math.cos(b),1.9+Math.sin(b));sh.absarc(0,1.9,1,b,a,true);sh.closePath();const g=new T.ExtrudeGeometry(sh,{depth:.62,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:1,steps:1,curveSegments:2});g.translate(0,0,-.31);mesh(uvWorld(g),'stone_courtyard');}
 }
 if(id==='column_classic'){
  pedestal();const pts=[[.43,.3],[.43,.42],[.32,.48],[.3,.6],[.27,2.25],[.33,2.35],[.44,2.42],[.44,2.58]].map(p=>new T.Vector2(...p));mesh(new T.LatheGeometry(pts,24),'stone_courtyard');box(.96,.14,.96,'stone_courtyard',0,2.65);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;cyl(.018,.018,1.6,'stone_sandstone',Math.cos(a)*.288,1.42,Math.sin(a)*.288,6);}
 }
 if(id==='stairs_stone'){for(let i=0;i<7;i++)box(2.4,(i+1)*.16,.38,'stone_courtyard',0,(i+1)*.08,1.14-i*.38);for(const x of [-1.35,1.35])beam([x,.4,1.25],[x,1.45,-1.25],.17,.19,'stone_fortress');}
 if(id==='parapet'){box(3,.95,.45,'stone_fortress');box(3.1,.13,.59,'stone_courtyard',0,1.01);for(const x of [-1.15,0,1.15]){box(.56,.48,.54,'stone_fortress',x,1.3);box(.64,.12,.64,'stone_courtyard',x,1.6);}}
 if(id==='floor_medallion'){cyl(1.7,1.7,.08,'stone_courtyard',0,.04,0,48);for(const r of [.5,1.25,1.55])torus(r,.018,'bronze',0,.09,0,Math.PI/2);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(.04,.025,.23,'bronze',Math.sin(a)*1.4,.1,Math.cos(a)*1.4,a);}}
 if(id==='rock_cluster'){rock(-.6,.55,0,.8,.65,.75,1);rock(.6,.42,.2,.65,.5,.56,7);rock(.1,.3,-.6,.55,.36,.48,11);}
 if(id==='stalagmites'){for(let i=0;i<5;i++){const a=i*2.4;const x=Math.cos(a)*.55,z=Math.sin(a)*.55,h=.65+i*.25;mesh(new T.ConeGeometry(.17+i*.02,h,7),'rock_basalt',x,h/2,z);cyl(.25,.33,.16,'rock_basalt',x,.08,z,8);}}
 if(id==='mine_support'){for(const x of [-1.4,1.4]){box(.25,2.5,.3,'wood_oak',x);box(.29,.18,.34,'metal_industrial',x,.5);box(.29,.18,.34,'metal_industrial',x,2.1);}box(3.35,.3,.4,'wood_oak',0,2.58);beam([-1.4,1.8,0],[-.7,2.5,0],.18,.23,'wood_oak');beam([1.4,1.8,0],[.7,2.5,0],.18,.23,'wood_oak');}
 if(id==='minecart'){box(1.35,.12,.9,'wood_oak',0,.48);for(const z of [-.47,.47])for(let y=0;y<3;y++)box(1.5,.18,.09,'wood_oak',0,.66+y*.19,z);for(const x of [-.7,.7])box(.09,.6,.95,'wood_oak',x,.85);for(const x of [-.47,.47])for(const z of [-.57,.57]){const o=cyl(.23,.23,.11,'metal_industrial',x,.25,z,14);o.rotation.x=Math.PI/2;}for(let i=0;i<6;i++)rock((i%3-.9)*.32,1.04+(i%2)*.06,(Math.floor(i/3)-.5)*.3,.2,.18,.23,i);}
 if(id==='rail_section'){for(const z of [-1,-.5,0,.5,1])box(1.6,.12,.18,'wood_oak',0,.06,z);for(const x of [-.52,.52]){box(.09,.13,2.5,'metal_industrial',x,.18);box(.18,.04,2.5,'metal_industrial',x,.26);}}
 if(id==='ore_lift'){for(const x of [-1,1])for(const z of [-.6,.6])box(.2,3,.2,'wood_oak',x,1.5,z);for(const z of [-.6,.6]){box(2.4,.25,.22,'wood_oak',0,3,z);beam([-1,.3,z],[1,2.8,z],.1,.12,'metal_industrial');}box(2.2,.16,1.5,'wood_oak',0,.28);wheel(0,2.8,0,.58);for(const x of [-.35,.35])cyl(.025,.025,2.2,'metal_industrial',x,1.65);box(1.2,.1,1,'wood_oak',0,.65);}
 if(id==='market_stall'){for(const x of [-1.2,1.2])for(const z of [-.6,.6])box(.11,2.3,.11,'wood_oak',x,1.15,z);box(2.5,.18,1.3,'wood_oak',0,.95);box(2.4,.65,.11,'wood_oak',0,.55,.6);const g=new T.PlaneGeometry(2.8,1.9,12,8);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,.13*Math.cos(p.getX(i)*6)-.1*Math.cos(p.getY(i)*2));g.computeVertexNormals();const o=mesh(g,'cloth',0,2.4,0,-Math.PI/2+.1);o.material=materials.cloth.clone();o.material.side=T.DoubleSide;for(const x of [-.7,0,.7]){box(.55,.2,.55,'wood_oak',x,1.12);for(let i=0;i<5;i++)cyl(.08,.08,.12,'stone_sandstone',x+(i%3-1)*.13,1.27,(Math.floor(i/3)-.5)*.13,8);}}
 if(id==='dock_section'){for(let i=0;i<11;i++)box(2.6,.12,.23,'wood_oak',0,.55,-1.25+i*.25);for(const x of [-1.15,1.15])for(const z of [-1.05,1.05])cyl(.12,.15,1.5,'wood_oak',x,.75,z,10);for(const x of [-1,1])box(.16,.22,2.8,'wood_oak',x,.4);}
 if(id==='mooring_post'){cyl(.22,.3,.9,'wood_oak',0,.45,0,12);for(const y of [.5,.57,.64])torus(.24,.027,'stone_sandstone',0,y,0,Math.PI/2);box(.65,.16,.17,'metal_industrial',0,.78);}
 if(id==='waterwheel'){for(const z of [-.25,.25]){torus(1.4,.11,'wood_oak',0,1.5,z);for(let i=0;i<12;i++){const a=i*Math.PI/6;beam([0,1.5,z],[Math.sin(a)*1.4,1.5+Math.cos(a)*1.4,z],.1,.12,'wood_oak');}}for(let i=0;i<16;i++){const a=i*Math.PI/8;const o=box(.38,.1,.7,'wood_oak',Math.sin(a)*1.43,1.5+Math.cos(a)*1.43);o.rotation.z=-a;}cyl(.15,.15,1,'metal_industrial',0,1.5,0).rotation.x=Math.PI/2;}
 if(id==='clock_monument'){pedestal('stone_sandstone');box(.7,2,.65,'stone_sandstone',0,1.25);box(1.55,.13,.9,'stone_courtyard',0,2.3);torus(.68,.09,'bronze',0,2.9,.1);const face=cyl(.61,.61,.08,'stone_courtyard',0,2.9,.1,48);face.rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i*Math.PI/6;const o=box(.035,.1,.03,'bronze',Math.sin(a)*.51,2.9+Math.cos(a)*.51,.16);o.rotation.z=-a;}beam([0,2.9,.18],[.25,3.15,.18],.04,.03,'bronze');beam([0,2.9,.2],[0,3.37,.2],.025,.03,'bronze');}
 if(id==='server_pillar'){cyl(.85,.9,.2,'metal_industrial',0,.1,0,6);cyl(.65,.72,2.6,'metal_industrial',0,1.5,0,6);cyl(.87,.8,.2,'metal_industrial',0,2.9,0,6);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(.07,2.3,.07,'glow',Math.sin(a)*.7,1.5,Math.cos(a)*.7);for(let j=0;j<6;j++)box(.23,.035,.08,'bronze',Math.sin(a)*.73,.55+j*.33,Math.cos(a)*.73,-a);}}
 if(id==='pipe_bridge'){for(const x of [-1.1,1.1]){box(.15,2.6,.3,'metal_industrial',x);box(.5,.15,.65,'metal_industrial',x,.08);}box(2.6,.23,.45,'metal_industrial',0,2.7);for(const z of [-.18,.18]){const o=cyl(.1,.1,3.2,'bronze',0,2.95,z);o.rotation.z=Math.PI/2;}for(const x of [-1,0,1])box(.13,.5,.75,'metal_industrial',x,2.89);}
 if(id==='magic_ring'){pedestal();cyl(.18,.28,1.2,'bronze',0,.8);torus(.92,.045,'bronze',0,1.9,0,Math.PI/4);torus(.82,.04,'bronze',0,1.9,0,-Math.PI/4,Math.PI/2);mesh(new T.OctahedronGeometry(.3),'glow',0,1.9,0);}
 if(id==='basalt_ribs'){for(let i=0;i<5;i++){const a=(i/4-.5)*Math.PI*.7;const x=Math.sin(a)*1.5,h=2.7-Math.abs(i-2)*.35;const o=mesh(new T.ConeGeometry(.25,h,5),'rock_basalt',x,h/2,Math.cos(a)*.5);o.rotation.z=-a*.2;}box(3.5,.18,1.3,'rock_basalt');}
 if(id==='ice_spires'){for(let i=0;i<5;i++){const a=i*2.4,h=.8+i*.3;const o=mesh(new T.ConeGeometry(.22+i*.025,h,5),'glass',Math.cos(a)*.5,h/2,Math.sin(a)*.5);o.rotation.z=Math.sin(a)*.15;}}
 if(id==='library_shelf'){for(const x of [-1,1])box(.12,2.4,.52,'wood_oak',x);for(let r=0;r<5;r++){box(2.2,.1,.58,'wood_oak',0,.12+r*.55);if(r<4)for(let i=0;i<11;i++){const h=.28+((i*7+r*3)%5)*.028;box(.11,h,.35,i%3===0?'cloth':i%3===1?'wood_oak':'stone_sandstone',-.83+i*.16,.2+r*.55+h/2,.04);}}box(2.25,.17,.65,'wood_oak',0,2.4);}
 if(id==='roof_gable'){const s=new T.Shape();s.moveTo(-1.7,0);s.lineTo(0,1.2);s.lineTo(1.7,0);s.lineTo(1.6,-.12);s.lineTo(0,1.05);s.lineTo(-1.6,-.12);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:2.8,bevelEnabled:false});g.translate(0,.15,-1.4);mesh(uvWorld(g),'wood_oak');for(const z of [-1.45,1.45]){beam([-1.75,.14,z],[0,1.38,z],.12,.12,'wood_oak');beam([0,1.38,z],[1.75,.14,z],.12,.12,'wood_oak');}}
 if(id==='half_timber_bay'){box(2.8,2.2,.17,'stone_sandstone',0,1.1);for(const x of [-1.35,0,1.35])box(.14,2.35,.25,'wood_oak',x,1.17,.03);for(const y of [.13,2.2])box(2.9,.16,.26,'wood_oak',0,y,.03);beam([-1.25,.23,.14],[-.08,2.1,.14],.12,.12,'wood_oak');beam([.08,2.1,.14],[1.25,.23,.14],.12,.12,'wood_oak');}
 if(id==='courtyard_fountain'){cyl(1.35,1.5,.2,'stone_courtyard',0,.1,0,32);const pts=[[1.26,.2],[1.3,.27],[1.3,.5],[1.17,.54],[1.1,.45],[1.1,.25]].map(p=>new T.Vector2(...p));mesh(new T.LatheGeometry(pts,32),'stone_courtyard');cyl(1.08,1.08,.02,'glass',0,.3,0,32);cyl(.18,.3,1.5,'stone_courtyard',0,.9,0,20);cyl(.75,.2,.3,'stone_courtyard',0,1.6,0,24);cyl(.1,.15,.65,'bronze',0,1.98);}
 root.updateMatrixWorld(true);return root;
}
// Collapse static parts by material to reduce draw calls. Use chunks for whole-map scenes.
export function mergeKitAsset(root){
 const buckets=new Map();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);});
 const result=new T.Group();result.name=root.name;result.userData={...root.userData};
 for(const [mat,list] of buckets){const merged=mergeGeometries(list,false);for(const g of list)g.dispose();if(!merged)throw new Error('Geometry merge failed');const m=new T.Mesh(merged,mat);m.castShadow=m.receiveShadow=true;result.add(m);}return result;
}
