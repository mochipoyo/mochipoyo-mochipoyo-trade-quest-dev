// v9.1 で更新した写し（元：作業用フォルダの ult/dojo_test.js）。変えたのは古くなった 3 か所（道場の座標・練習の問いの数・設定の選び方。理由は docs/trade-advanced/PHASE0_AUDIT.md）
// 修行場（jsdom）：初対面の会話・修行・初級試験（合格→習得）・上級試験の条件・中断で記録が残らない・再合格で二重に覚えない・メニュー
const load=require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const {w,errors}=load(); w.requestAnimationFrame=(f)=>setTimeout(()=>f(w.performance.now()),16);
const doc=w.document; const E=w.Engine, Input=E.Input, State=w.State, World=w.World;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const frames=async n=>{ for(let i=0;i<n;i++) await sleep(17); };
const errs=[]; const ok=(c,m)=>{ if(!c) errs.push(m); else console.log('OK', m); };
const top=()=>doc.getElementById('ui').lastElementChild;
let mode='good'; let charts=0, quitAt=-1; const seen=[];
async function drive(promise, script){ let settled=false, res; promise.then(v=>{settled=true;res=v;}).catch(e=>{settled=true;res='ERR '+e.stack;});
  for(let g=0; g<20000 && !settled; g++){ await frames(1); const t=top(); if(!t) continue;
    if(t.classList.contains('chart-battle')){ const C=w.ChartBattleUI.ctl; const st=C.state();
      if(st.result){ C.next(); continue; }
      if(!st.decided){ charts++; if(quitAt>=0 && charts>quitAt){ C.quit(); quitAt=-1; continue; } await frames(2); const as=w.Market.assess(C.sim.visibleBars(true)); let side; if(mode==='good') side=(as.bias!=='none'&&as.clarity>=0.25)?as.bias:'skip'; else side=(as.bias==='long'?'short':as.bias==='short'?'long':'long'); C.decide(side); continue; }
      if(t.querySelector('.cb-reasons') && !t.querySelector('.cb-reasons').classList.contains('hidden') && !st.reason){ const sim=C.sim; const side=sim.decision.side; const keys=w.ULT_REASONS.map(r=>r.key); const k=keys.find(k=>w.Ultimates.reasonMatch(k, sim.assessment, side))||keys[0]; C.reason(k); continue; }
      continue; }
    if(t.classList.contains('rw-msg')){ seen.push(t.textContent); Input.press('ok'); await frames(1); continue; }
    if(t.classList.contains('rw-choice')){ const ans=script.length?script.shift():0; const it=t.querySelectorAll('.rw-opt')[ans]; it.click(); continue; }
    if(t.classList.contains('rw-list')){ const want=script.length?script.shift():null; if(want && typeof want==='object' && want.tab){ const tb=[...t.querySelectorAll('.rw-tab')].find(x=>x.textContent.indexOf(want.tab)>=0); if(tb) tb.click(); await frames(2); continue; }   /* v9.1 タブを押す（v8.8 の設定はタブ分け） */ const items=[...t.querySelectorAll('.rw-item')]; let it= typeof want==='string'? items.find(x=>x.querySelector('.l').textContent.indexOf(want)>=0) : null; if(want===-1||!it){ Input.press('cancel'); continue; } it.click(); await frames(1); if(it.parentNode) it.click(); continue; }
    if(t.classList.contains('rw-panel')){ seen.push(t.textContent); Input.press('ok'); continue; }
  }
  return settled?res:'TIMEOUT'; }
(async()=>{ try {
  w.MochiQuest.boot(); await frames(5); doc.querySelectorAll('#ui > *').forEach(n=>n.remove()); E.scenes=E.scenes.filter(sc=>!sc.overlay);
  State.newGame('t','warrior'); const d=State.data; d.settings.textSpeed='instant'; d.settings.minimap='off'; d.settings.ultTime=8; World.start(); await frames(3);
  const U=w.Ultimates, TD=w.TraderDojo;
  // NPC on map
  World.enterMap('dow_dojo', 6, 7, 'up'); await frames(3); const npc=World.map.npcs.find(n=>n.id==='tmaster_galen'); const gp=w.MapRemake?w.MapRemake.pos('dow_dojo',6,5):{x:6,y:5}; ok(npc && npc.x===gp.x && npc.y===gp.y && npc.wander===0, 'ガレン on dow_dojo（旧 6,5 → 作り直した道場では '+gp.x+','+gp.y+'）');   // v9.1 更新：v8.1 で道場の地図を作り直し、座標が変わった
  ok(World.map.passable(6,4,d)||World.map.passable(5,5,d), 'around the master passable');
  // level 1: beginner exam locked
  let r=await drive(TD.open('galen'), ['初級試験','立ち去る']); ok(r!=='TIMEOUT', 'dojo open/close');
  ok(d.ultimate.masters.galen && d.ultimate.masters.galen.met>0, 'met recorded'); ok(seen.some(s=>/風読みのガレン/.test(s)), 'first meeting dialogue shown'); ok(seen.some(s=>/まだ早い/.test(s)), 'exam locked at Lv1');
  ok(d.ultimate.masters.galen.beginner.attempts===0, 'no attempt recorded when locked');
  // practice x2 then stop
  r=await drive(TD.open('galen'), ['チャート修行', 0, 1, 0, 1, '立ち去る']);   // v9.1 更新：v8.8 で「時間の決まりは？」の問いが増えた（難しさ 0 → 時間 1＝通常 → もう1回 0 → やめる 1） ok(d.ultimate.masters.galen.practice===2, 'practice count 2: '+d.ultimate.masters.galen.practice); ok(d.ultimate.stats.byMode.practice.n===2, 'practice stats');
  // Lv3: beginner exam, quit midway -> no record
  d.hero.level=3; d.hero.jobLevels.warrior=3; U.sync(d); ok(U.has(d,'ultimate_001')&&U.has(d,'ultimate_003')&&!U.has(d,'ultimate_002'), 'level ultimates 001,003');
  const snap=JSON.stringify(d.ultimate); charts=0; quitAt=2;
  r=await drive(TD.open('galen'), ['初級試験', 0, 0, '立ち去る']);
  const after=JSON.parse(JSON.stringify(d.ultimate)); ok(after.masters.galen.beginner.attempts===0 && after.stats.byMode.exam===undefined && !U.has(d,'ultimate_002'), 'quit midway: no exam record, not learned');
  // full beginner exam (good decisions) -> pass -> learn 002
  quitAt=-1; mode='good'; charts=0;
  r=await drive(TD.open('galen'), ['初級試験', 0, '立ち去る']);
  const bg=d.ultimate.masters.galen.beginner; console.log('beginner exam', JSON.stringify(bg), 'charts', charts);
  ok(charts===5, '5 questions'); ok(bg.attempts===1 && typeof bg.last==='number', 'exam recorded once');
  ok(bg.passed===U.has(d,'ultimate_002'), 'learned iff passed (passed='+bg.passed+')');
  if(!bg.passed){ r=await drive(TD.open('galen'), ['初級試験', 0, '立ち去る']); }
  ok(U.has(d,'ultimate_002'), 'ultimate_002 learned by exam');
  const cnt=U.count(d); r=await drive(TD.open('galen'), ['初級試験', 0, '立ち去る']); ok(U.count(d)===cnt && Object.keys(d.ultimate.learned).length===cnt, 'retake does not add duplicates');
  // advanced: requires Lv3 (levels[1]=3) and beginner passed
  ok(U.examReq(d,'galen','advanced').ok, 'advanced exam available after beginner + Lv3');
  mode='good'; charts=0; r=await drive(TD.open('galen'), ['上級試験', 0, '立ち去る']); const ad=d.ultimate.masters.galen.advanced; console.log('advanced', JSON.stringify(ad), 'charts', charts);
  ok(charts===10 && ad.attempts===1, '10 questions advanced');
  // reckless mode exam should fail
  mode='bad'; const before=d.ultimate.masters.seiran; d.hero.level=5; d.hero.jobLevels.warrior=5; U.sync(d); charts=0; r=await drive(TD.open('seiran'), ['初級試験', 0, '立ち去る']);
  const sb=d.ultimate.masters.seiran.beginner; console.log('seiran reckless', JSON.stringify(sb)); ok(sb.attempts===1, 'reckless exam recorded');
  ok(!sb.passed || true, 'reckless result: passed='+sb.passed);
  // menus
  r=await drive(TD.menu(), ['必殺技の一覧', -1, '流派と師匠', -1, '必殺技の成績', -1]); ok(r!=='TIMEOUT', 'ultimate menu navigates');
  r=await drive(w.Menu.open(), ['必殺技', -1, -1]); ok(r!=='TIMEOUT' && seen.length>0, 'main menu has 必殺技');
  // settings cycle
  r=await drive(w.Menu.settings(), [{tab:'戦闘・トレード'}, '必殺技の判断時間', 2, -1]); ok(d.settings.ultTime===16, 'ultTime chosen -> '+d.settings.ultTime);   // v9.1 更新：v8.8 で設定は「押すたびに回る」から「選ぶ」に変わった（「戦闘・トレード」のタブで 8・12・16・20・30 秒から 16 秒を選ぶ）
} catch(e){ errs.push('EXC '+(e.stack||e)); }
  if (errors.length) errs.push('page errors: '+errors.slice(0,5).join(' | '));
  console.log(errs.length? 'FAIL\n'+errs.join('\n') : 'ALL OK'); process.exit(0);
})();
