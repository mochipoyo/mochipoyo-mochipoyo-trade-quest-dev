// 使い方: node mapview.js mapId [mapId...]  — 地図の文字・NPC(N)・イベント(E)・宝箱($)・出入口(W)を重ねて表示
const load=require('../rpgload.js'); const {w}=load(); w.State.newGame('t','warrior');
const MAPS=w.MAP_DEFS; MAPS.world=w.WORLD_DEF;
for (const id of process.argv.slice(2)) {
  const def=MAPS[id]; if(!def){console.log('NO MAP',id);continue;}
  const m=new w.GameMap(def); w.World.applyState(m);
  const g=[]; for(let y=0;y<m.h;y++){ let r=''; for(let x=0;x<m.w;x++){ const t=m.tile(x,y); const ch=(w.Tiles.defs[t]&&w.Tiles.defs[t].ch)||(t==='bld_block'?'#':t==='bld_door'?'d':'?'); r+=ch; } g.push(r.split('')); }
  m.npcs.forEach(n=>{ if(g[n.y]) g[n.y][n.x]= n.hidden?'n':'N'; });
  m.events.forEach(e=>{ if(g[e.y]) g[e.y][e.x]='E'; });
  m.chests.forEach(c=>{ if(g[c.y]) g[c.y][c.x]='$'; });
  m.warps.forEach(p=>{ if(g[p.y]) g[p.y][p.x]='W'; });
  console.log('== '+id+' '+def.name+' '+m.w+'x'+m.h+' kind='+m.kind);
  console.log('    '+[...Array(m.w).keys()].map(i=>i%10).join(''));
  g.forEach((r,y)=>console.log(String(y).padStart(3)+' '+r.join('')));
  console.log('npcs:', m.npcs.map(n=>n.id+'@'+n.x+','+n.y+(n.showIf?'[s:'+n.showIf+']':'')+(n.hideIf?'[h:'+n.hideIf+']':'')).join(' '));
  console.log('events:', m.events.map(e=>e.type+'@'+e.x+','+e.y+(e.doneFlag?'['+e.doneFlag+']':'')).join(' '));
  console.log('buildings:', m.buildings.map(b=>b.name+'@'+b.x+','+b.y+' '+b.w+'x'+b.h+(b.interior?'->'+b.interior:'')).join(' | '));
}
