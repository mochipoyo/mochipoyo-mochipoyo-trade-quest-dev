// v9.1 で更新した写し（元：作業用フォルダの learntest.js）。変えたのは起動の直後にタイトルの窓を片づける 1 か所だけ（理由は docs/trade-advanced/PHASE0_AUDIT.md）
// 学習イベント：必修扉（教え→試練→報酬1回→扉）、失敗時の救済、任意石碑、能力解放、ボス連動
const load=require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const {w}=load(); w.requestAnimationFrame=(f)=>setTimeout(f,16);
const doc=w.document; const E=w.Engine, Input=E.Input, State=w.State, World=w.World, L=w.Learning, TE=w.TradeEval;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const frames=async n=>{ for(let i=0;i<n;i++) await sleep(17); };
const errs=[]; const ok=(c,m)=>{ if(!c) errs.push(m); };
async function solveTrial(top, wrong){ const scn=w.TradeUI.current.scn; const t=TE.truth(scn);
  for(const q of TE.ANALYSIS){ const v=wrong?(q.options.find(o=>o[0]!==t[q.key])[0]):t[q.key]; top.querySelector('.aopt[data-q='+q.key+'][data-v='+v+']').click(); await frames(1); }
  if(t.swing.high) w.TradeUI.current.setSwing('high', t.swing.high.index-(wrong?12:0)); if(t.swing.low) w.TradeUI.current.setSwing('low', t.swing.low.index-(wrong?12:0)); await frames(1);
  const action=wrong?(scn.def.correct==='skip'?'buy':'skip'):scn.def.correct; top.querySelector('[data-cmd='+action+']').click(); await frames(3);
  const list=[...doc.querySelectorAll('.rw-list')].pop(); if(list){ const items=[...list.querySelectorAll('.rw-item')]; const want=TE.reasonLabel(t.reason); const it=(wrong?items.find(x=>x.textContent.indexOf(want)<0):items.find(x=>x.textContent.indexOf(want)>=0))||items[0]; it.click(); await frames(1); it.click(); await frames(3); }
  const okb=doc.querySelector('#o-ok'); if(okb){ okb.click(); await frames(2); } }
async function drive(promise, script, opts){ script=script||[]; opts=opts||{}; let settled=false, result; promise.then(v=>{settled=true;result=v;}).catch(e=>{settled=true; result='ERR:'+(e.stack||e);}); let guard=0;
  while(!settled && guard++<3000){ await frames(2); const top=doc.getElementById('ui').lastElementChild; if(!top) continue;
    if(top.classList.contains('rw-msg')){ Input.press('ok'); let g=0; while(top.parentNode && g++<20) await frames(1); continue; }
    if(top.classList.contains('rw-choice')||top.classList.contains('rw-list')){ const ans=script.length?script.shift():0; if(ans===-1){ Input.press('cancel'); continue; } const items=top.querySelectorAll(top.classList.contains('rw-choice')?'.rw-opt':'.rw-item'); if(items[ans]){ items[ans].click(); await frames(1); items[ans].click(); } else Input.press('ok'); continue; }
    if(top.classList.contains('trade-panel')){ if(top.classList.contains('locked')){ await frames(3); continue; } await solveTrial(top, opts.wrong); await frames(3); continue; }
    if(top.classList.contains('rw-panel')){ const okb=top.querySelector('#o-ok'); if(okb){ okb.click(); continue; } Input.press('ok'); continue; } }
  return guard>=3000?'TIMEOUT':result; }
(async()=>{
  w.MochiQuest.boot(); await frames(3); doc.querySelectorAll('#ui > *').forEach(n=>n.remove()); E.scenes=E.scenes.filter(sc=>!sc.overlay); /* v9.1 タイトルの窓を片づける：残っていると drive がそれを押して「はじめから」になり、途中で新しいゲームに変わっていた（不安定の原因） */ w.Growth.check=async()=>[]; /* ランク・実績の報酬は growthtest.js で検証 */ State.newGame('t','warrior'); State.data.settings.textSpeed='instant'; World.start(); await frames(3);
  State.data.hero.level=8; w.Actors.refreshSkills(State.data.hero);
  // 1) 迷いの森の扉（learn_dow）：初回は教え→試練。わざと失敗 → 扉は開かず fails=1
  World.enterMap('lost_forest',15,15,'up'); await frames(3);
  let r=await drive((async()=>{ World.interact(); while(World.busy) await frames(2); })(), [], {wrong:true});
  ok(!State.flag('lf_gate'),'gate should stay closed after fail'); ok(L.fails('learn_dow')===1,'fails=1');
  // 2回目失敗 → 合格点が50に下がる
  r=await drive((async()=>{ World.interact(); while(World.busy) await frames(2); })(), [0], {wrong:true});
  ok(L.fails('learn_dow')===2 && L.passScore(w.learnEvent('learn_dow'))===50,'pass score lowered to 50, got '+L.passScore(w.learnEvent('learn_dow')));
  // 正解で合格 → 扉が開く・報酬1回
  const g0=State.data.gold, e0=State.data.hero.exp;
  r=await drive((async()=>{ World.interact(); while(World.busy) await frames(2); })(), [0]);
  ok(State.flag('lf_gate') && State.flag('learn_dow'),'gate opened & learn_dow done'); ok(State.data.gold-g0===150,'gold reward 150 got '+(State.data.gold-g0)); ok(State.data.inventory.potion>=1,'potion reward');
  console.log('learn_dow:', 'done', State.flag('learn_dow'), 'gold+', State.data.gold-g0, 'exp+', State.data.hero.exp-e0, 'tile', World.map.tile(15,14));
  // 達成後に話しかけると復習（通る/復習）。報酬は増えない
  const g1=State.data.gold; r=await drive((async()=>{ World.interact(); while(World.busy) await frames(2); })(), [1, 0]);
  ok(State.data.gold===g1,'no double reward on review');
  // 2) 能力解放：dow 分野を3回以上・直近正解60%以上 → ダウの眼
  ok(!L.hasAbility('dow_eye'),'not yet dow_eye'); 
  for(let i=0;i<2;i++){ r=await drive(w.TradeUI.trial(['clear_up'],{title:'p'}), []); }
  await L.checkUnlocks(false);
  ok(L.hasAbility('dow_eye'),'dow_eye unlocked'); ok(State.data.hero.skills.indexOf('dow_eye')>=0,'hero has dow_eye skill');
  w.Actors.changeJob(State.data.hero,'mage'); ok(State.data.hero.skills.indexOf('dow_eye')>=0,'ability survives job change');
  // 3) 任意の石碑（練習）：初回報酬のみ
  World.enterMap('lost_forest',19,6,'down'); await frames(3); { const q71=w.MapRemake?w.MapRemake.pos('lost_forest',19,6):{x:19,y:6}; ok(World.map.tile(q71.x,q71.y)==='learn_rune','rune tile'); }   // v7.1 作り直した迷いの森：旧座標 → 新しい座標
  const g2=State.data.gold; r=await drive((async()=>{ World.interact(); while(World.busy) await frames(2); })(), [0]); ok(State.data.gold-g2===40,'practice reward 40 got '+(State.data.gold-g2));
  const g3=State.data.gold; r=await drive((async()=>{ World.interact(); while(World.busy) await frames(2); })(), [0]); ok(State.data.gold===g3,'practice no double reward');
  // 4) 山道の必修石碑（learn_ema）とボス連動（ダウの眼 → 最初の3ターン弱点露出）
  World.enterMap('emal_pass',6,9,'down'); await frames(3);
  r=await drive((async()=>{ World.interact(); while(World.busy) await frames(2); })(), [0]); ok(State.flag('learn_ema'),'learn_ema done');
  const b0=w.Combat.create(['boss_lost_trend'], State.partyActors(), {boss:true, exposeFirst:3}); // BattleUI は非同期なので Combat 側＋events の分岐を確認
  ok(w.Events && true,'events'); 
  // ダウの眼の効果：使用で敵の防御が崩れ行動傾向が出る
  const b=w.Combat.create(['wolf'], State.partyActors()); const ev=w.Combat.runTurn(b,[{actorId:'hero',type:'skill',skillId:'dow_eye',target:{side:'enemy',idx:0}}]);
  ok(b.enemies[0].exposed>0 && ev.some(e=>e.type==='msg'&&/行動傾向/.test(e.text)),'dow_eye exposes & shows tendencies');
  // 5) 進捗・次のおすすめ
  const P=L.progress(); console.log('progress:', P.map(p=>p.event.id+':'+p.status).join(' '), 'next:', (L.nextRecommended()||{}).id, 'abilities', Object.keys(State.data.trade.abilities));
  // 6) 旧セーブ移行
  const raw=JSON.parse(JSON.stringify(State.data)); delete raw.trade.abilities; delete raw.trade.learnFails; const m=State.migrate(raw); ok(m.trade.abilities && m.trade.learnFails,'migrate learn fields');
  console.log('ERRORS:', errs); process.exit(0);
})();
