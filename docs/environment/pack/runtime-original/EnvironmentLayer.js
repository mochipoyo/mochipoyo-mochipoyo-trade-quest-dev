import * as THREE from 'three';
import {validateSolidDecoration} from './LayoutSafety.js';
// Safe supplemental layer only. Replacing wall/terrain geometry belongs in the existing builders.
// One bad placement fails the transaction; it must not silently leave a half-built map.
export async function buildEnvironmentLayer(catalog,map,snapshot,recipe,{heightAt=()=>0}={}){
 if(recipe.mapId!==map.id||snapshot.id!==map.id)throw new Error('Map mismatch');
 if(snapshot.width!==map.w||snapshot.height!==map.h)throw new Error('Stale snapshot dimensions');
 if(!Array.isArray(map.tiles)||snapshot.tiles.some((r,y)=>r.some((t,x)=>t!==map.tiles[y]?.[x])))throw new Error('Stale snapshot tiles; re-export the live map state');
 catalog.profile(map.id);
 const root=new THREE.Group();root.name='env_v1_'+map.id;const instances=[];
 try{
  for(const p of recipe.placements||[]){const asset=catalog.modelManifest.find(x=>x.id===p.assetId);if(!asset)throw new Error('Unknown asset '+p.assetId);
   if(p.policy!=='solid_only')throw new Error('Unvalidated layout/collision policy');
   const safe=validateSolidDecoration(snapshot,p,asset.bounds,2);if(!safe.ok)throw new Error(p.assetId+': '+safe.reason);
   const instance=await catalog.instantiate(p.assetId);instances.push(instance);const g=instance.group;g.position.set(p.x,heightAt(p.x,p.z)+(p.yOffset||0),p.z);g.rotation.y=p.yaw||0;g.scale.setScalar(p.scale||1);root.add(g);
  }
 }catch(e){instances.forEach(x=>x.release());throw e;}
 let disposed=false;return{root,dispose(){if(disposed)return;disposed=true;root.removeFromParent();instances.forEach(x=>x.release());}};
}
