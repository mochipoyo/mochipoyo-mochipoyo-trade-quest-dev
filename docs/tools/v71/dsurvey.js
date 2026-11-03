// ダンジョンの一覧：大きさ・幅1の通路の割合・仕掛け・外からの参照
const load=require('../rpgload.js'); const {w}=load(); const M=w.MAP_DEFS; const T=w.Tiles;
const ids=Object.keys(M).filter(k=>M[k].kind==='dungeon');
function grid(d){ const m=w.World&&w.World.getMap?null:null; return d.rows; }
const ext={}; (w.SEARCH_POINTS||[]).forEach(p=>{ext[p.map]=(ext[p.map]||0)+1;}); (w.QUIZ_MONSTERS||[]).forEach(q=>{ext[q.map]=(ext[q.map]||0)+1;});
const inc={}; Object.keys(M).forEach(k=>(M[k].warps||[]).forEach(wp=>{ if(wp&&wp.to){inc[wp.to]=(inc[wp.to]||0)+1;} })); 
const out=[];
for(const id of ids){ const d=M[id]; let gm; try{ gm=new w.GameMap(d);}catch(e){ gm=null; }
  if(!gm){ out.push(id+' ?'); continue; }
  const W=gm.w,H=gm.h,t=gm.tiles; let floor=0,narrow=0; const walk=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&!T.isSolid(t[y][x]);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ if(!walk(x,y))continue; floor++; const h=!walk(x-1,y)&&!walk(x+1,y), v=!walk(x,y-1)&&!walk(x,y+1); if(h||v) narrow++; }
  const evt={}; (d.events||[]).forEach(e=>{ const k=e.type+(e.solid?'*':''); evt[k]=(evt[k]||0)+1; });
  const flags=[d.onStep?'onStep':'', d.s3121?'s3121':'', d.noWiden?'noWiden':'', t.some(r=>r.some(c=>/ice/.test(c)))?'ice':'', d.noEscape?'noEscape':''].filter(Boolean).join(',');
  out.push([id,W+'x'+H,floor,narrow,Math.round(100*narrow/Math.max(1,floor))+'%',flags,'ext='+(ext[id]||0),'in='+(inc[id]||0),JSON.stringify(evt)].join(' '));
}
console.log(out.join('\n')); console.log('total',ids.length);
