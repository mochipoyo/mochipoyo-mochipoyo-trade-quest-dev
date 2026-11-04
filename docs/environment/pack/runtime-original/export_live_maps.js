// Devtools/Playwright helper. Run only after the normal game has loaded all data scripts.
// It reads definitions; it does not call State.newGame, save, or change player progress.
(function(){
 window.exportEnvironmentSnapshot=function(){
  if(!window.MAP_DEFS||!window.GameMap||!window.Tiles)throw new Error('Game data is not ready');
  const snapshots={},incoming={};
  for(const[id,def]of Object.entries(MAP_DEFS)){
   const m=new GameMap(def);const clean=v=>JSON.parse(JSON.stringify(v));
   snapshots[id]={id,name:m.name,kind:m.kind,width:m.w,height:m.h,tiles:clean(m.tiles),solid:m.tiles.map(row=>row.map(t=>!!Tiles.isSolid(t))),buildings:clean(m.buildings),definitionBuildings:clean(def.buildings||[]),npcs:clean(m.npcs),chests:clean(m.chests),events:clean(m.events),warps:clean(m.warps)};
   for(const w of m.warps){if(typeof w.to!=='string')continue;(incoming[w.to]??=[]).push({from:id,at:[w.x,w.y],arrival:[w.tx,w.ty]});}
  }
  for(const[id,s]of Object.entries(snapshots))s.incomingWarps=incoming[id]||[];
  return {exportedAt:new Date().toISOString(),flagState:JSON.parse(JSON.stringify(window.State?.data?.flags||{})),snapshots};
 };
})();
