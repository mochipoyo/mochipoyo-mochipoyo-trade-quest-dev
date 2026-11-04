// Pure helpers: no changes to game state or save data.
export function anchorCells(snapshot){
 const out=[];for(const kind of ['npcs','chests','events','warps'])for(const a of snapshot[kind]||[])if(Number.isFinite(a.x)&&Number.isFinite(a.y))out.push({kind,id:a.id??null,x:a.x,y:a.y});
 for(const b of snapshot.buildings||[])if(b.doorAbs)out.push({kind:'door',id:b.id,x:b.doorAbs.x,y:b.doorAbs.y});
 for(const w of snapshot.incomingWarps||[])if(w.arrival?.every(Number.isFinite))out.push({kind:'arrival',x:w.arrival[0],y:w.arrival[1]});return out;
}
export function validateSolidDecoration(snapshot,placement,bounds,padding=2){
 const {x,z,yaw=0,scale=1}=placement;if(![x,z,yaw,scale].every(Number.isFinite)||scale<=0)return{ok:false,reason:'invalid transform'};
 const cs=Math.cos(yaw),sn=Math.sin(yaw),points=[];
 for(const xx of [bounds.min[0],bounds.max[0]])for(const zz of [bounds.min[2],bounds.max[2]])points.push([x+(xx*cs+zz*sn)*scale,z+(-xx*sn+zz*cs)*scale]);
 const x0=Math.floor(Math.min(...points.map(p=>p[0]))),x1=Math.floor(Math.max(...points.map(p=>p[0]))-1e-6),z0=Math.floor(Math.min(...points.map(p=>p[1]))),z1=Math.floor(Math.max(...points.map(p=>p[1]))-1e-6);
 const anchors=anchorCells(snapshot);
 for(let yy=z0;yy<=z1;yy++)for(let xx=x0;xx<=x1;xx++){
  if(xx<0||yy<0||xx>=snapshot.width||yy>=snapshot.height)return{ok:false,reason:'outside map'};
  if(!snapshot.solid[yy][xx])return{ok:false,reason:'overlaps walkable tile',cell:[xx,yy]};
  if(anchors.some(a=>Math.abs(a.x-xx)<=padding&&Math.abs(a.y-yy)<=padding))return{ok:false,reason:'near protected anchor',cell:[xx,yy]};
  if([...(snapshot.buildings||[]),...(snapshot.definitionBuildings||[])].some(b=>xx>=b.x&&xx<b.x+(b.w||5)&&yy>=b.y&&yy<b.y+(b.h||3)))return{ok:false,reason:'overlaps existing or conditional building'};
 }
 return{ok:true};
}
export function floodFill(solid,start){
 const h=solid.length,w=solid[0]?.length||0,key=(x,y)=>y*w+x,seen=new Set();if(!start||start.x<0||start.y<0||start.x>=w||start.y>=h||solid[start.y][start.x])return seen;
 const queue=[[start.x,start.y]];seen.add(key(start.x,start.y));for(let n=0;n<queue.length;n++){const[x,y]=queue[n];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||ny<0||nx>=w||ny>=h||solid[ny][nx]||seen.has(k))continue;seen.add(k);queue.push([nx,ny]);}}return seen;
}
// Maintains baseline connectivity to warp cells and adjacency of NPCs/chests, without forcing unreachable secrets open.
export function compareReachability(before,after,oldStart,newStart){
 const a=floodFill(before.solid,oldStart),b=floodFill(after.solid,newStart),errors=[];
 const reachable=(snap,seen,p,adj)=>{const candidates=adj?[[p.x,p.y],[p.x-1,p.y],[p.x+1,p.y],[p.x,p.y-1],[p.x,p.y+1]]:[[p.x,p.y]];return candidates.some(([x,y])=>x>=0&&y>=0&&x<snap.width&&y<snap.height&&seen.has(y*snap.width+x));};
 for(const kind of ['npcs','chests'])for(const old of before[kind]||[]){if(!old.id)continue;const next=(after[kind]||[]).find(x=>x.id===old.id);if(!next){errors.push(kind+': missing '+old.id);continue;}if(reachable(before,a,old,true)&&!reachable(after,b,next,true))errors.push(kind+': unreachable '+old.id);}
 return errors;
}
// Route stability must use a migration table: same destination alone cannot identify multiple stairs.
export function validateMigration(plan,before,after){
 const errors=[];if(plan.mapId!==before.id||before.id!==after.id)errors.push('map ID changed');
 if(plan.status!=='ready_for_validation')errors.push('plan not ready');
 for(const item of plan.anchorMoves||[]){const old=(before[item.kind]||[]).find(a=>item.id?a.id===item.id:a.x===item.from?.[0]&&a.y===item.from?.[1]);const n=(after[item.kind]||[]).find(a=>item.id?a.id===item.id:a.x===item.to?.[0]&&a.y===item.to?.[1]);if(!old||!n)errors.push('anchor missing '+JSON.stringify(item));else if(old.x!==item.from?.[0]||old.y!==item.from?.[1]||n.x!==item.to?.[0]||n.y!==item.to?.[1])errors.push('anchor coordinates mismatch');}
 return errors;
}
