const load=require('./rpgload.js'); const {w,errors}=load();
const MAPS=w.MAP_DEFS; MAPS.world=w.WORLD_DEF;
const Tiles=w.Tiles, GameMap=w.GameMap;
// State 最小化（passable に必要）
w.State.newGame('t','warrior');
let fail=0;
function bfs(m, sx, sy){ const ship=!!(m.def&&m.def.region); const seen=new Set([sx+','+sy]); const q=[[sx,sy]]; const solidEvents={}; m.events.forEach(e=>{ if(e.solid) solidEvents[e.x+','+e.y]=true; });
  while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy; const k=nx+','+ny; if(seen.has(k)) continue; if(nx<0||ny<0||nx>=m.w||ny>=m.h) continue; const t=m.tile(nx,ny); if(Tiles.isSolid(t) && t!=='chest' && t!=='chest_open' && !(ship && (Tiles.isWater(t) || t==='cloud'))) continue; // 宝箱は隣接でOK
    seen.add(k); if(t==='chest'||t==='chest_open') continue; if(solidEvents[k]) continue; q.push([nx,ny]); } }
  return seen; }
for (const id of Object.keys(MAPS)){
  { const rr=typeof MAPS[id].rows==='function'?MAPS[id].rows():MAPS[id].rows; if(rr){ const L=rr[0].length; const badr=rr.map((r,i)=>r.length!==L?i:-1).filter(i=>i>=0); if(badr.length){ console.log('ROW WIDTH', id, badr.join(',')); fail++; } } }
  const m=new GameMap(MAPS[id]); w.World.applyState(m);
  // 入口：このマップへ入ってくる warp の tx,ty
  const entries=[]; for (const oid of Object.keys(MAPS)) { const om=new GameMap(MAPS[oid]); om.warps.forEach(wp=>{ if(wp.to===id) entries.push([wp.tx,wp.ty,oid]); }); }
  (MAPS[id].events||[]).forEach(e=>{ if(e.type==='hole') {} });
  // v5.5: イベントの c.warp でだけ入るマップ（蜃気楼神殿の最奥：3階の正しい扉から）
  const SCRIPT_ENTRIES={ mirage_temple_4:[7,10,'(script: mirage_temple_3 正しい扉)'] }; if(SCRIPT_ENTRIES[id]) entries.push(SCRIPT_ENTRIES[id]); if(MAPS[id].scriptEntry) entries.push(MAPS[id].scriptEntry);   /* v6.9 イベントの c.warp / 新規ゲームの台本でだけ入るマップ（マップ定義の scriptEntry）*/
  if(!entries.length){ const cond=Object.keys(MAPS).some(oid=>(MAPS[oid].buildings||[]).some(b=>b.interior===id&&b.showIf)); if(cond){ console.log('conditional entry (showIf):', id); const b=Object.keys(MAPS).map(oid=>(MAPS[oid].buildings||[]).find(b=>b.interior===id)).find(Boolean); entries.push([b.entry.x,b.entry.y,'(showIf)']); } else if(!(MAPS[id].region)){ console.log('NO ENTRY', id); fail++; continue; } }
  // 入口からの到達性（扉系イベントは開いた扱いで2回目チェック）
  const start=entries[0]||[28,59];
  if(start && Tiles.isSolid(m.tile(start[0],start[1]))){ console.log('ENTRY SOLID',id,start); fail++; }
  // イベント扉を開いた状態で到達性チェック
  m.events.forEach(e=>{ if(e.timed) m.setTile(e.x,e.y,e.timed); /* v6.4 第6段階：歩くたびに通れる／通れないが変わるマス（竜脈の噴き出し口）は通れるときの絵で */ if(e.solid) e.solid=false; if(e.type==='trial'||e.type==='locked'||e.type==='gate'||e.type==='rank_door') m.setTile(e.x,e.y,'cave_floor'); if(e.type==='script'&&e.doneTile&&!Tiles.isSolid(e.doneTile)) m.setTile(e.x,e.y,e.doneTile); });   // v6.4: 開くと通れる絵になる仕掛け（隠し壁・遺跡の扉など）も開いた扱い
  // v5.5: 入口が複数あるマップ（砂嵐の回廊の北口／南口で分かれるリシア砂漠など）は、すべての入口からの到達範囲の和で判定
  const seen=bfs(m,start[0],start[1]); entries.slice(1).forEach(en=>{ if(!Tiles.isSolid(m.tile(en[0],en[1]))) bfs(m,en[0],en[1]).forEach(k=>seen.add(k)); });
  const targets=[];
  (m.warps||[]).forEach(wp=>targets.push(['warp->'+wp.to,wp.x,wp.y]));
  (m.chests||[]).forEach(c=>targets.push(['chest '+c.id,c.x,c.y]));
  (m.events||[]).forEach(e=>targets.push(['event '+e.type,e.x,e.y]));
  (m.npcs||[]).forEach(n=>{ if(!n.hidden) targets.push(['npc '+n.id,n.talkVia?n.talkVia.x:n.x,n.talkVia?n.talkVia.y:n.y]); });   // v6.4 talkVia：扉越しに話す人（牢の中など）は、その扉の前へ行けるか
  let bad=[];
  targets.forEach(t=>{ const [x,y]=[t[1],t[2]]; const near=[[x,y],[x+1,y],[x-1,y],[x,y+1],[x,y-1]].some(p=>seen.has(p[0]+','+p[1])) || [[x,y+2],[x,y-2],[x+2,y],[x-2,y]].some(p=>seen.has(p[0]+','+p[1]) && m.tile((x+p[0])/2,(y+p[1])/2)==='counter'); if(!near) bad.push(t[0]+'@'+x+','+y); });
  // warp 先の座標が歩ける場所か
  (m.warps||[]).forEach(wp=>{ const dest=MAPS[wp.to]; if(!dest){ bad.push('warp dest missing '+wp.to); return;} const dm=new GameMap(dest); if(Tiles.isSolid(dm.tile(wp.tx,wp.ty)) && !['chest'].includes(dm.tile(wp.tx,wp.ty))) bad.push('warp dest solid '+wp.to+'@'+wp.tx+','+wp.ty+' ('+dm.tile(wp.tx,wp.ty)+')'); });
  // NPC が壁の中にいないか
  (m.npcs||[]).forEach(n=>{ if(Tiles.isSolid(m.tile(n.x,n.y))) bad.push('npc on solid '+n.id); });
  console.log(id.padEnd(22), m.w+'x'+m.h, 'reach', seen.size, bad.length? 'UNREACHABLE: '+bad.join(' | '):'ok');
  if(bad.length) fail++;
}
console.log('errors', errors, 'fails', fail);
