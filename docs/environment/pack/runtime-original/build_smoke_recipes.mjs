import fs from 'node:fs';import {validateSolidDecoration} from '../runtime/LayoutSafety.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../data/'+n,import.meta.url)));const snapshots=read('current_map_snapshot.json'),assets=read('model_manifest.json');
const targets=[['poyo_village','rock_cluster'],['rivel_castle','column_classic'],['iron_mine_1','stalagmites'],['node_city','server_pillar'],['tradia','column_classic']];
fs.mkdirSync(new URL('../data/recipes/',import.meta.url),{recursive:true});
for(const[id,assetId]of targets){const s=snapshots[id],asset=assets.find(x=>x.id===assetId);const placements=[];
 for(let y=2;y<s.height-2&&placements.length<2;y++)for(let x=2;x<s.width-2&&placements.length<2;x++){
  const p={assetId,x:x+.5,z:y+.5,scale:.35,yaw:0,policy:'solid_only'};
  if(placements.some(a=>Math.hypot(a.x-p.x,a.z-p.z)<5))continue;if(validateSolidDecoration(s,p,asset.bounds).ok)placements.push(p);
 }
 if(!placements.length)throw new Error('No safe smoke placement for '+id);
 const recipe={mapId:id,status:'integration_smoke_only',note:'接続試験用。完成の見た目や改装済みレイアウトを示さない。最新状態のsnapshotで再検証する。',placements};
 fs.writeFileSync(new URL('../data/recipes/'+id+'.json',import.meta.url),JSON.stringify(recipe,null,2)+'\n');
}console.log('Generated 5 guard-checked smoke recipes');
