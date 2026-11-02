// v6.6 触れたら入る（2D版の処理・jsdom）：範囲の大きさの集計と、歩いたときに入るか。RPGLOAD=jsdom でゲームを読み込むヘルパーのパス
const load=require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const {w,errors}=load();
const W=w.World, S=w.State; S.newGame('確認','warrior'); W.start && W.start();
const calls=[]; W.doWarp=(x)=>calls.push('warp:'+x.to); W.lockedWarp=(x)=>calls.push('locked:'+x.to);
function go(map,x,y,keepGrace){ W.enterMap(map,x,y,'down'); W.busy=false; if(!keepGrace) W._lmGrace=0; }   // 着いた直後の2歩の猶予は、下の最後の確認で別に見る
function step(dir){ const d=W.delta(dir); const p=W.player; p.x+=d[0]; p.y+=d[1]; p.dir=dir; p.px=p.x*32; p.py=p.y*32; const n=calls.length; S.data.stepsSinceBattle=0; W.onStep(); W.busy=false; return calls.slice(n).join(',')||'-'; }
const res=[];
// 1) poyo_village at 28,58. exit lands at (28,59?) – arrive at y+1 and walk sideways: no entry; walk away then back diagonally: entry
go('world',28,59); res.push(['arrive y+1 → right', step('right')]);   // (29,59) footprint, came from (28,59) footprint → no
res.push(['→ right (30,59)', step('right')]);  // outside
res.push(['← left (29,59)', step('left')]);   // touch from outside → warp
go('world',28,60); res.push(['arrive y+2 → up (28,59)', step('up')]);   // entry from outside → warp
go('world',25,58); res.push(['side approach (26,58)', step('right')]);
go('world',28,55); res.push(['from north (28,56)', step('down')]); go('world',28,61); res.push(['y+3 → y+2 (outside)', step('up')]); res.push(['y+2 → y+1 (touch)', step('up')]);
// 2) locked: kalion_lab needs lab_known at world_kalion 92,52
go('world_kalion',92,55); res.push(['locked approach (92,54)', step('up')]); res.push(['locked (92,53)', step('up')]);
// 3) hidden locked erased_village at 42,44 world_kalion
go('world_kalion',42,47); res.push(['hidden approach (42,46)', step('up')]); res.push(['hidden (42,45)', step('up')]);
// 4) not field: inside town nothing
go('poyo_village',10,10); res.push(['town step', step('down')]);
// 着いた直後の2歩は反応しない（出口が入口の2つ下：1歩目は範囲の中でも入らない → 2歩目で入口のマスに乗って入る）
go('world',28,60,true); res.push(['arrive y+2 (grace) → y+1', step('up')]); res.push(['→ y (entry tile)', step('up')]);
// 次元の門：出た先から同じ向きに歩き続けても、すぐには戻らない
go('world_machine',82,100,true); res.push(['portal arrive → up 1', step('up')]);
console.log(res.map(r=>r.join(' : ')).join('\n')); console.log('errors',errors.length, errors.slice(0,3));
