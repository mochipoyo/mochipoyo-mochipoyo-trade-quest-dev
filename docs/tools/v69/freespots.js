// node freespots.js mapId[:ax,ay] ... — 置き場所の候補（歩ける・何もない・入口から届く・まわり8マスのうち6マス以上が歩ける）。ax,ay に近い順
const load=require('../rpgload.js'); const {w}=load(); w.State.newGame('t','warrior');
const MAPS=w.MAP_DEFS; MAPS.world=w.WORLD_DEF;
for (const arg of process.argv.slice(2)) {
  const [id,anc]=arg.split(':'); const def=MAPS[id]; if(!def){console.log('NO MAP',id);continue;}
  const m=new w.GameMap(def); w.World.applyState(m);
  const occ=new Set(); m.npcs.forEach(n=>occ.add(n.x+','+n.y)); m.events.forEach(e=>occ.add(e.x+','+e.y)); m.chests.forEach(c=>occ.add(c.x+','+c.y)); m.warps.forEach(p=>occ.add(p.x+','+p.y));
  const S=w.Search&&w.Search.forMap?w.Search.forMap(id):[]; S.forEach(p=>occ.add(p.x+','+p.y));
  const ok=(x,y)=>x>=0&&y>=0&&x<m.w&&y<m.h&&!w.Tiles.isSolid(m.tile(x,y))&&m.tile(x,y)!=='bld_door';
  const c=[]; const [ax,ay]=anc?anc.split(',').map(Number):[m.w/2,m.h/2];
  for(let y=1;y<m.h-1;y++)for(let x=1;x<m.w-1;x++){ if(!ok(x,y)||occ.has(x+','+y)) continue; let n=0, near=0; for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; if(ok(x+dx,y+dy)) n++; if(occ.has((x+dx)+','+(y+dy))) near++; } if(n>=6&&!near) c.push([Math.hypot(x-ax,y-ay),x,y,m.tile(x,y)]); }
  c.sort((a,b)=>a[0]-b[0]);
  console.log(id, 'near', ax+','+ay, c.slice(0,8).map(v=>v[1]+','+v[2]+'('+v[3]+')').join(' '));
}
