import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createKitMaterials} from './EnvironmentKit.js';

// baseUrl must point at the deployed environment-v1/ folder, with data/ and assets/ inside.
// Own this catalog at application lifetime, not one catalog per map.
// v7.6 トレードクエストへの組み込み（パックの runtime/EnvironmentCatalog.js からの変更点）：
//   ・プロファイルは data/profiles.json（いまのゲームの全マップIDぶん。docs/tools/env/build_profiles.js が作る軽い版）の profiles を読む
//   ・GLB は models/<id>.glb（three-src/public/environment-v1/models/）、画像は data/materials.json の file（textures/<名前>.jpg。1024px に縮小）
//   ・profile(mapId) は未登録なら例外（パックのまま）。ゲームからは Env.profile（警告を出して null）を使う
export class EnvironmentCatalog {
 constructor(baseUrl,{renderer=null,decorateMaterial=null}={}){
  this.base=new URL(baseUrl,globalThis.location?.href||'http://localhost/');
  if(!this.base.pathname.endsWith('/'))throw new Error('baseUrl must end in /');
  this.renderer=renderer;this.decorateMaterial=decorateMaterial;this.loader=new GLTFLoader();this.textureLoader=new THREE.TextureLoader();this.models=new Map();this.materials=new Map();this.references=0;this.fallback=createKitMaterials();this.disposed=false;
 }
 async init(){
  const read=async name=>{const r=await fetch(new URL('data/'+name,this.base));if(!r.ok)throw new Error(name+': HTTP '+r.status);return r.json();};
  const [pf,md,mm]=await Promise.all([read('profiles.json'),read('materials.json'),read('model_manifest.json')]);this.profiles=pf.profiles||pf;this.materialDefs=md;this.modelManifest=mm;
  this.modelIds=new Set(this.modelManifest.map(x=>x.id));return this;
 }
 profile(mapId){const p=this.profiles?.[mapId];if(!p)throw new Error('No explicit environment profile for '+mapId);return p;}
 async material(name){
  if(this.disposed)throw new Error('Catalog disposed');if(this.materials.has(name))return this.materials.get(name);
  const job=(async()=>{const d=this.materialDefs.textures[name];let mat;
   if(d){const tex=await this.textureLoader.loadAsync(new URL(d.file,this.base).href);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=Math.min(8,this.renderer?.capabilities.getMaxAnisotropy()||4);mat=new THREE.MeshStandardMaterial({map:tex,color:0xffffff,roughness:d.roughness,metalness:d.metalness});}
   else{if(!this.fallback[name])throw new Error('Unknown material '+name);mat=this.fallback[name].clone();}
   mat.name=name;if(this.decorateMaterial)this.decorateMaterial(mat);return mat;
  })();this.materials.set(name,job);try{return await job;}catch(e){this.materials.delete(name);throw e;}
 }
 async model(id){
  if(this.disposed)throw new Error('Catalog disposed');if(!this.modelIds.has(id))throw new Error('Unknown model '+id);
  if(this.models.has(id))return this.models.get(id);
  const job=(async()=>{const gltf=await this.loader.loadAsync(new URL('models/'+id+'.glb',this.base).href);const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
   const replacements=await Promise.all(meshes.map(o=>this.material(o.material.name)));
   meshes.forEach((o,i)=>{o.material.dispose();o.material=replacements[i];o.castShadow=o.receiveShadow=true;});return gltf.scene;
  })();this.models.set(id,job);try{return await job;}catch(e){this.models.delete(id);throw e;}
 }
 async instantiate(id){const proto=await this.model(id);if(this.disposed)throw new Error('Catalog disposed during model load');this.references++;const group=proto.clone(true);let released=false;return{group,release:()=>{if(released)return;released=true;group.removeFromParent();this.references--;}};}
 async dispose(){
  if(this.references)throw new Error('Release environment instances before disposing shared catalog');this.disposed=true;
  const gs=new Set(),ms=new Set(),ts=new Set();for(const p of this.models.values()){try{(await p).traverse(o=>{if(o.geometry)gs.add(o.geometry);});}catch{}}
  for(const p of this.materials.values()){try{const m=await p;ms.add(m);if(m.map)ts.add(m.map);}catch{}}
  for(const m of Object.values(this.fallback))ms.add(m);gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());this.models.clear();this.materials.clear();
 }
}
