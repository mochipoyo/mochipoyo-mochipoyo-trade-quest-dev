// v5.0: 第4章の船修理 → 小型帆船（乗船・航海・海路・上陸・セーブ・全滅）→ 第5章 灰鉱町ヴェルム編を通しで
const load=require('./rpgload.js'); const {w}=load(); w.requestAnimationFrame=(f)=>setTimeout(()=>f(w.performance.now()),16);
const doc=w.document; const E=w.Engine, Input=E.Input, State=w.State, World=w.World, V=w.Vehicle, Ev=w.Events;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const frames=async n=>{ for(let i=0;i<n;i++) await sleep(17); };
const errs=[]; const ok=(c,m)=>{ if(!c) errs.push(m); }; const log=(...a)=>console.log(...a);
async function solveTrial(top){ const scn=w.TradeUI.current.scn; const t=w.TradeEval.truth(scn); for(const q of w.TradeEval.ANALYSIS){ top.querySelector('.aopt[data-q='+q.key+'][data-v='+t[q.key]+']').click(); await frames(1); } if(t.swing.high) w.TradeUI.current.setSwing('high',t.swing.high.index); if(t.swing.low) w.TradeUI.current.setSwing('low',t.swing.low.index); await frames(1); top.querySelector('[data-cmd='+scn.def.correct+']').click(); await frames(3); const list=[...doc.querySelectorAll('.rw-list')].pop(); if(list){ const items=[...list.querySelectorAll('.rw-item')]; const want=w.TradeEval.reasonLabel(t.reason); const it=items.find(x=>x.textContent.indexOf(want)>=0)||items[0]; it.click(); await frames(1); it.click(); await frames(3); } const okb=doc.querySelector('#o-ok'); if(okb){ okb.click(); await frames(2); } }
async function drive(promise, script){ script=script||[]; let settled=false, result; promise.then(v=>{settled=true;result=v;}).catch(e=>{settled=true; result='ERR:'+(e.stack||e);}); let guard=0;
  while(!settled && guard++<6000){ await frames(2); const top=doc.getElementById('ui').lastElementChild; if(!top) continue;
    if(top.classList.contains('rw-msg')){ Input.press('ok'); let g=0; while(top.parentNode && g++<20) await frames(1); continue; }
    if(top.classList.contains('rw-choice')||top.classList.contains('rw-list')){ const inBattle=!!(w.BattleUI.battle && w.BattleUI.battle.state!=='won' && w.BattleUI.battle.state!=='lost' && doc.querySelector('.cmd-list, #battle-msg') && top.classList.contains('rw-list')); const ans=(!inBattle && script.length)?script.shift():0; if(ans===-1){ Input.press('cancel'); continue; } const items=top.querySelectorAll(top.classList.contains('rw-choice')?'.rw-opt':'.rw-item'); if(items[ans]){ items[ans].click(); await frames(1); items[ans].click(); } else Input.press('ok'); continue; }
    if(top.classList.contains('trade-panel')){ if(top.classList.contains('locked')){ await frames(3); continue; } await solveTrial(top); await frames(3); continue; }
    if(top.classList.contains('rw-panel')){ const okb=top.querySelector('#o-ok'); if(okb){ okb.click(); continue; } Input.press('ok'); continue; } }
  return guard>=6000?'TIMEOUT':result; }
const talk=(id,script)=>drive((async()=>{ const n=World.map.npcs.find(x=>x.id===id); if(!n) throw new Error('npc '+id+' not on '+World.map.id); World.talk(n); await frames(2); while(World.busy) await frames(2); })(), script);
const interactAt=(x,y,dir,script)=>drive((async()=>{ World.player.x=x; World.player.y=y; World.player.px=x*32; World.player.py=y*32; World.player.dir=dir; World.interact(); await frames(2); while(World.busy) await frames(2); })(), script);
async function walk(dir, n){ for(let i=0;i<n;i++){ Input.keys[dir]=true; let g=0; while(!World.player.moving && g++<10) await frames(1); Input.keys[dir]=false; g=0; while((World.player.moving||World.busy) && g++<200) await frames(1); } }
function openChest(id){ const c=World.map.chests.find(c=>c.id===id); World.openChest(c); return drive((async()=>{ while(World.busy) await frames(2); })(), []); }
// v5.6 Phase 7-2：忘却の雪原（記憶を売る町・精霊の森・凍結時計塔の時限扉）、隠しダンジョン1・2・4、海の小島、残りのサブクエスト、仲間の個別クエスト、師匠の特別クエストA/S
function poke(x,y,script){ const m=World.map; for(const [dx,dy,dir] of [[0,1,'up'],[0,-1,'down'],[1,0,'left'],[-1,0,'right']]){ const px=x+dx, py=y+dy; if(px<0||py<0||px>=m.w||py>=m.h) continue; if(m.passable(px,py,State.data)&&!m.warpAt(px,py)) return interactAt(px,py,dir,script); } throw new Error('no free side for '+x+','+y+' on '+m.id); }
function footReach(m, sx, sy){ const seen=new Set([sx+','+sy]); const q=[[sx,sy]]; while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy,k=nx+','+ny; if(seen.has(k)||nx<0||ny<0||nx>=m.w||ny>=m.h) continue; if(!m.passable(nx,ny,State.data)) continue; seen.add(k); q.push([nx,ny]); } } return seen; }
const near=(seen,x,y)=>[[x,y],[x+1,y],[x-1,y],[x,y+1],[x,y-1]].some(p=>seen.has(p[0]+','+p[1]));
// BFS で1歩ずつ歩く（実際の歩数として数える）。目的地がワープなら踏んだところで終わる
async function walkTo(tx,ty,maxSteps){ let steps=0; const start=World.map.id; while(steps<(maxSteps||200)){ const m=World.map; if(m.id!==start) return steps; const sx=World.player.x, sy=World.player.y; if(sx===tx&&sy===ty) return steps;
  const prev={}; const q=[[sx,sy]]; prev[sx+','+sy]=null; let found=false; while(q.length){ const [x,y]=q.shift(); if(x===tx&&y===ty){found=true;break;} for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy,k=nx+','+ny; if(k in prev||nx<0||ny<0||nx>=m.w||ny>=m.h) continue; if(!m.passable(nx,ny,State.data)) continue; if((m.npcs||[]).some(n=>!n.hidden&&n.x===nx&&n.y===ny)) continue; prev[k]=[x,y]; q.push([nx,ny]); } }
  if(!found) throw new Error('no path to '+tx+','+ty+' on '+m.id+' from '+sx+','+sy);
  let cur=[tx,ty]; while(prev[cur.join(',')] && !(prev[cur.join(',')][0]===sx&&prev[cur.join(',')][1]===sy)) cur=prev[cur.join(',')];
  const dir=cur[0]>sx?'right':cur[0]<sx?'left':cur[1]>sy?'down':'up'; await walk(dir,1); steps++; await drive((async()=>{ let g=0; while(World.busy && g++<200) await frames(2); })(),[]); }
  return steps; }
async function sailEdge(x, edgeDir){ const m=World.map; let y=edgeDir==='down'?m.h-2:1; while(!V.terrainOk('galleon',m,x,y)||!V.terrainOk('galleon',m,x,edgeDir==='down'?m.h-1:0)) x++; World.player.x=x; World.player.y=y; World.player.px=x*32; World.player.py=y*32; V.syncToPlayer(m,x,y); const from=m.id; await walk(edgeDir,2); await drive((async()=>{ let g=0; while((World.busy||World.map.id===from) && g++<40) await frames(3); })(),[]); }
async function landFromSouth(x){ const m=World.map; let y=m.h-1; while(y>0 && Tiles.isWater(m.tile(x,y))) y--; const wy=y+1; World.player.x=x; World.player.y=wy; World.player.px=x*32; World.player.py=wy*32; V.syncToPlayer(m,x,wy); let st=0; while(d.aboard && st++<6) await walk('up',1); return { x: World.player.x, y: World.player.y }; }
// 船を目的地の隣の海に置いて、目的地のマスへ進む（海の小島・礁への上陸）
async function sailInto(vid, tx, ty){ const m=World.map; d.aboard=vid; for(const [dx,dy,dir] of [[0,1,'up'],[0,-1,'down'],[1,0,'left'],[-1,0,'right']]){ const px=tx+dx,py=ty+dy; if(V.terrainOk(vid,m,px,py)){ World.player.x=px; World.player.y=py; World.player.px=px*32; World.player.py=py*32; V.syncToPlayer(m,px,py); const from=m.id; await walk(dir,1); await drive((async()=>{ let g=0; while((World.busy||World.map.id===from) && g++<40) await frames(3); })(),[]); return World.map.id; } } throw new Error('no water beside '+tx+','+ty); }
const Tiles=w.Tiles; let d;
(async()=>{ try {
  w.MochiQuest.boot(); await frames(5); doc.querySelectorAll('#ui > *').forEach(n=>n.remove()); E.scenes=E.scenes.filter(sc=>!sc.overlay);
  State.newGame('t','warrior'); d=State.data; d.settings.textSpeed='instant'; d.settings.autoBattle=true;   // v6.4 ボス強化：ボス戦は回復・補助も使うオート戦闘で（流れの確認用）
   d.settings.minimap='off'; d.settings.battleSpeed='fast';
  Object.keys(w.MAP_DEFS).forEach(k=>{ const m=w.MAP_DEFS[k]; if(m&&m.encounters) try{ m.encounters.rate=0; }catch(e){} }); Object.keys(w.VEHICLES).forEach(k=>{ if(w.VEHICLES[k].encounters) w.VEHICLES[k].encounters.rate=0; });
  World.start(); await frames(3);
  const LV=60; d.hero.level=LV;   // 流れの確認用（自動戦闘は「攻撃」だけなので高めに。難易度はバランス試算で別に確認）
  d.hero.level=LV; w.Actors.refreshSkills(d.hero); ['gald','lucia','seris','io','mina','elna','iris','lina','sophia','nagi','ord','ganes'].forEach(id=>{ State.joinCompanion(id); d.companions[id].level=LV; w.Actors.refreshSkills(d.companions[id]); });
  d.party=['hero','gald','lina','seris']; d.flags.ord_joined=true; d.flags.ganes_joined=true; d.flags.iris_joined=true; d.flags.nagi_joined=true;
  const TEST_GEAR={weapon:'rune_blade',armor:'rune_mail',shield:'aegis_shield',head:'star_helm',acc:'ring_guard'}; [d.hero].concat(Object.values(d.companions)).forEach(a=>{ Object.assign(a.equip,TEST_GEAR); w.Actors.fullHeal(a); });
  const healAll=()=>State.partyActors().forEach(a=>w.Actors.fullHeal(a));
  const shopLog=[]; w.Services.shop=async(kind,stock)=>{ shopLog.push(stock.slice()); };
  const origB=w.BattleUI.start; let lastBattle=null; w.BattleUI.start=async function(ids,opts){ const r=await origB.call(this,ids,opts); lastBattle=r; log('battle', ids.join(','), r, State.partyActors().map(a=>a.hp).join(',')); healAll(); return r; };
  d.gold=60000; ['ship_ready','galleon_ready','verum_liberated','lighthouse_lit','yorn_letter_done'].forEach(f=>d.flags[f]=true);
  V.unlockIfReady(); V.drift=()=>null;
  const done=id=>d.quests[id]&&d.quests[id].state==='done'; const act=id=>d.quests[id]&&d.quests[id].state==='active';
  let r;
  // ===== A. 忘却の雪原：時の神殿領の北端から =====
  d.vehicles.galleon.map='world_tempus'; World.enterMap('world_tempus',80,10,'up'); await frames(2); d.aboard='galleon';
  await sailEdge(80,'up'); ok(World.map.id==='world_snow'&&d.aboard==='galleon','snow route got '+World.map.id);
  { const p=await landFromSouth(58); ok(!d.aboard,'landed in snow '+p.x+','+p.y); const seen=footReach(World.map,p.x,p.y);
    [[58,94,'ciel'],[82,54,'frost'],[34,30,'forest'],[146,38,'tower'],[66,86,'practice'],[20,60,'sn1'],[150,60,'sn2'],[102,20,'sn3'],[44,98,'sn4'],[96,66,'hermit'],[120,48,'trader']].forEach(t=>ok(near(seen,t[0],t[1]),'snow reach '+t[2]));
    ok(w.MAP_DEFS.world_snow.warps.find(wp=>wp.to==='frozen_tower_1').needFlag==='aster_joined','tower gated by aster'); }
  World.enterMap('ciel_port',14,1,'down'); await frames(1); await talk('ci_sailor'); ok(d.flags.snow_arrived,'snow arrived');
  // 記憶を売る町
  World.enterMap('memory_vault',10,14,'up'); await frames(1); await poke(11,3,[]); ok(!d.flags.memory_keeper_defeated,'vault keeper waits for riku');
  World.enterMap('frost_town',22,17,'up'); await frames(1); await talk('fr_riku'); ok(act('memory_town')&&d.flags.memory_town_started,'memory_town started');
  World.enterMap('memory_market',5,4,'up'); await frames(1); await talk('mm_vel',[0]); ok(d.flags.vel_talked&&d.flags.vel_cap_offered,'vel cap offered');
  World.enterMap('memory_vault',10,14,'up'); await frames(1); await poke(10,1,[]); ok(!d.flags.memory_core_done,'core waits for keeper');
  healAll(); await poke(11,3,[]); ok(d.flags.memory_keeper_defeated,'memory keeper defeated');
  await poke(10,1,[2]); ok(d.flags.memory_core_done&&d.flags.memory_choice===2,'memory cap chosen');
  World.enterMap('frost_town',22,17,'up'); await frames(1); await talk('fr_riku'); ok(done('memory_town')&&State.hasItem('necklace_skip'),'memory_town done + necklace');
  // 精霊の森
  World.enterMap('spirit_forest_1',1,15,'right'); await frames(1); await poke(27,4,[]); ok(!d.flags.spirit_gate,'forest gate closed');
  await poke(10,6,[]); await poke(18,9,[]); await poke(27,10,[]); ok(d.flags.spirit_lights,'3 lights'); await poke(27,4,[]); ok(d.flags.spirit_gate&&act('aster_spirits'),'forest gate open + quest');
  World.enterMap('spirit_forest_2',2,14,'up'); await frames(1); healAll(); await poke(12,7,[]); ok(d.flags.frost_spirit_freed,'frost spirit freed'); World.applyState(World.map);
  await talk('aster'); ok(d.flags.aster_joined&&d.companions.aster&&d.companions.aster.job==='spirit_warden'&&done('aster_spirits'),'aster joined');
  ok(w.Actors.allSkills(d.companions.aster).includes('spirit_shield'),'aster skills');
  // 凍結時計塔：レバー → 制限歩数で階段へ（2階は時間切れも確認）
  World.enterMap('frozen_tower_1',2,13,'up'); await frames(1); await poke(3,11,[0]); ok(d.flags.ft1_gate&&d.ftTimer&&d.ftTimer.left===33,'tower1 timer started');
  let st=await walkTo(19,1,80); log('tower1 steps',st); ok(World.map.id==='frozen_tower_2','tower1 cleared in time got '+World.map.id+' steps '+st);
  await walk('right',1); await drive((async()=>{ let g=0; while(World.busy && g++<50) await frames(2); })(),[]); ok(d.flags.ft1_done&&!d.ftTimer,'tower1 done flag');
  World.enterMap('frozen_tower_2',2,13,'up'); await frames(1); await poke(2,11,[0]); ok(d.flags.ft2_gate,'tower2 gate open');
  for(let i=0;i<40 && d.ftTimer;i++){ await walk(i%2?'down':'up',1); await drive((async()=>{ let g=0; while(World.busy && g++<100) await frames(2); })(),[]); }
  ok(!d.ftTimer&&!d.flags.ft2_gate&&World.player.x===2&&World.player.y===13,'tower2 timeout closes gate and returns '+World.player.x+','+World.player.y);
  await poke(2,11,[0]); st=await walkTo(19,1,80); ok(World.map.id==='frozen_tower_3','tower2 cleared got '+World.map.id+' steps '+st);
  await poke(2,12,[0]); st=await walkTo(19,1,120); log('tower3 steps',st); ok(World.map.id==='frozen_tower_4','tower3 cleared got '+World.map.id);
  lastBattle=null; await poke(10,7,[1]); ok(lastBattle===null&&act('hidden_frozen_tower'),'clock warden optional (declined)');
  healAll(); await poke(10,7,[0]); ok(d.flags.clock_warden_defeated&&done('hidden_frozen_tower')&&State.hasItem('clock_hand_spear'),'clock warden defeated + quest + spear');
  { const tw=World.map.id; World.enterMap('frozen_tower_1',2,13,'up'); await frames(1); ok(!d.ftTimer,'no stale timer on re-entry'); }
  // ===== B. 隠しダンジョン1・2・4、海の小島 =====
  World.enterMap('ash_cave_1',1,12,'right'); await frames(1); d.trade.rankBest=0; await poke(16,12,[]); ok(!d.flags.ash_cave_open,'ash cave door closed at F'); d.trade.rankBest=3; await poke(16,12,[]); ok(d.flags.ash_cave_open,'ash cave door opens at C');
  World.player.x=16; World.player.y=11; World.player.px=16*32; World.player.py=11*32; await walk('down',1); await drive((async()=>{ let g=0; while((World.busy||World.map.id==='ash_cave_1')&&g++<60) await frames(3); })(),[]); ok(World.map.id==='ash_cave_2','ash cave 2 got '+World.map.id);
  healAll(); await poke(9,4,[0]); ok(d.flags.ash_lord_defeated&&done('hidden_grania_cave')&&State.hasItem('ash_hammer'),'ash lord + quest');
  { World.enterMap('world_grania',56,60,'down'); await frames(1); const seen=footReach(World.map,56,60); ok(near(seen,44,38),'ash cave reachable on foot'); ok(!near(seen,134,96)&&!near(seen,20,100)&&!near(seen,128,20),'sea spots need ship'); }
  World.enterMap('ash_shore_hut',5,5,'up'); await frames(1); d.flags.verum_arrived=false; d.flags.verum_liberated=false; await talk('shore_keeper'); ok(d.flags.verum_arrived&&!act('grania_sea_pirates'),'shore keeper main lines first'); d.flags.verum_liberated=true; await talk('shore_keeper'); ok(act('grania_sea_pirates')&&act('grania_lighthouse_rock'),'shore keeper quests');
  d.vehicles.sailboat.map='world_grania'; World.enterMap('world_grania',30,100,'down'); await frames(1); r=await sailInto('sailboat',20,100); ok(r==='pirate_nest','sail to pirate nest got '+r);
  healAll(); await poke(8,3,[0]); ok(d.flags.gull_admiral_defeated&&done('grania_sea_pirates'),'pirates done');
  World.enterMap('world_grania',128,26,'down'); await frames(1); r=await sailInto('sailboat',128,20); ok(r==='ash_cape','sail to cape got '+r);
  await poke(5,3,[]); ok(State.hasItem('cape_box'),'cape box'); World.enterMap('ash_shore_hut',5,5,'up'); await frames(1); await talk('shore_keeper'); ok(done('grania_lighthouse_rock'),'cape quest done');
  d.party=['hero','nagi','lina','seris']; World.enterMap('world_islands',44,71,'up'); await frames(1); await talk('is_fisher'); ok(act('nagi_chart'),'nagi_chart started');
  World.enterMap('world_grania',134,90,'down'); await frames(1); r=await sailInto('sailboat',134,96); ok(r==='sunken_reef_1','sail to reef got '+r);
  World.enterMap('sunken_reef_2',7,9,'up'); await frames(1); await poke(7,2,[]); ok(!d.flags.nagi_log_found,'log after captain');
  healAll(); await poke(7,4,[0]); ok(d.flags.ghost_captain_defeated&&done('hidden_sea_reef'),'ghost captain'); await poke(7,2,[]); ok(d.flags.nagi_log_found&&done('nagi_chart')&&State.hasItem('navigator_compass'),'nagi chart done');
  World.enterMap('old_city_2',15,1,'right'); await frames(1); d.trade.rankBest=4; await poke(16,1,[]); ok(!d.flags.old_city_deep_open,'old city deep closed at B'); d.trade.rankBest=5; await poke(16,1,[]); ok(d.flags.old_city_deep_open,'old city deep opens at A');
  World.player.x=15; World.player.y=1; World.player.px=15*32; World.player.py=32; await walk('right',1); await drive((async()=>{ let g=0; while((World.busy||World.map.id==='old_city_2')&&g++<60) await frames(3); })(),[]); ok(World.map.id==='old_city_deep_1','old city deep got '+World.map.id);
  World.enterMap('old_city_deep_2',8,11,'up'); await frames(1); lastBattle=null; await poke(8,6,[1]); ok(lastBattle===null,'old core optional');
  healAll(); await poke(8,6,[0]); ok(d.flags.old_core_defeated&&done('hidden_old_city')&&State.hasItem('zero_bow'),'old core defeated + quest + bow');
  // ===== C. グラニア・カリオン・王都のサブクエスト =====
  d.party=['hero','gald','ganes','lina'];
  World.enterMap('verum_school',5,4,'up'); await frames(1); await talk('school_teacher'); ok(act('verum_school'),'school start');
  World.enterMap('poyo_dojo',5,4,'up'); await frames(1); await talk('master_hakei'); ok(State.hasItem('wave_book_copy'),'book copy');
  World.enterMap('verum_school',5,4,'up'); await frames(1); await talk('school_teacher'); ok(done('verum_school'),'school done');
  World.enterMap('verum_town',22,23,'up'); await frames(1); let g0=d.gold; await talk('vt_merchant',[0]); ok(act('verum_market')&&d.gold===g0-1000,'lent 1000'); await talk('vt_merchant'); ok(act('verum_market'),'not repaid before main_6');
  d.quests.main_6={state:'done',at:1}; g0=d.gold; await talk('vt_merchant'); ok(done('verum_market')&&d.gold===g0+1500,'repaid 1500');
  await talk('vt_old'); ok(act('verum_lost_workers'),'lost workers start'); World.enterMap('iron_mine_3',17,4,'right'); await frames(1); healAll(); await poke(18,4,[]); ok(d.flags.verum_workers_rescued,'workers rescued');
  World.enterMap('verum_town',36,26,'up'); await frames(1); await talk('vt_old'); ok(done('verum_lost_workers'),'lost workers done');
  World.enterMap('kalion_city',13,31,'up'); await frames(1); await talk('kc_doctor'); ok(act('lina_clinic'),'clinic start'); State.addItem('herb',5); State.addItem('antidote',3); healAll(); await talk('kc_doctor'); ok(done('lina_clinic')&&State.hasItem('healer_robe'),'clinic done');
  await talk('kc_poor1'); ok(act('kalion_ledger_lost'),'ledger start'); World.enterMap('kalion_finance',9,6,'up'); await frames(1); await poke(9,5,[]); ok(State.hasItem('family_record'),'family record');
  World.enterMap('kalion_city',13,31,'up'); await frames(1); await talk('kc_poor1'); ok(done('kalion_ledger_lost'),'ledger done');
  await talk('kc_baker',[1]); ok(!d.flags.bread_proved,'wrong tax answer'); await talk('kc_baker',[0]); ok(d.flags.bread_proved&&act('kalion_bread'),'bread proved, waits reform');
  d.flags.kalion_reformed=true; World.applyState(World.map); await talk('kc_baker'); ok(done('kalion_bread'),'bread done');
  World.enterMap('kalion_tavern',8,7,'up'); await frames(1); await talk('kv_informant',[1]); ok(done('kalion_informant')&&d.flags.informant_choice===1,'informant done');
  d.party=['hero','elna','ord','lina']; World.enterMap('kalion_tax',3,4,'up'); await frames(1); await talk('kt_clerk',[0]); ok(!done('elna_audit'),'audit wrong line'); await talk('kt_clerk',[2]); ok(done('elna_audit'),'elna audit done');
  World.enterMap('sentra_capital',20,31,'up'); await frames(1); await talk('sc_dissent',[1]); ok(done('sentra_dissent'),'dissent done');
  d.flags.riev_met=true; d.flags.testimony_1=false; d.flags.testimony_2=false; await talk('sc_camp_old'); ok(d.flags.testimony_1&&!act('ord_penance'),'camp old testimony first'); await talk('sc_camp_merchant'); ok(d.flags.testimony_2&&!d.flags.ord_visit_2,'camp merchant testimony first');
  await talk('sc_camp_old'); ok(act('ord_penance')&&d.flags.ord_visit_1,'ord visit 1'); await talk('sc_camp_merchant'); await talk('sc_family'); ok(done('ord_penance')&&State.hasItem('oath_mail'),'ord penance done');
  // 故郷の変化・王への報告
  d.quests.main_5={state:'done',at:1}; World.enterMap('poyo_village',14,11,'up'); await frames(1); await talk('poyo_woman'); ok(act('poyo_return')&&d.flags.poyo_stage_1,'poyo stage 1');
  ['main_8','main_11','main_14'].forEach(q=>d.quests[q]={state:'done',at:1}); d.flags.game_cleared=true; await talk('poyo_woman'); ok(done('poyo_return'),'poyo stage 5 done');
  World.enterMap('rivel_castle',14,4,'up'); await frames(1); await talk('king',[1]); ok(done('rivel_king_report')&&d.flags.king_report_choice===1,'king report');
  // ===== D. 断裂群島・海底・時の神殿領・ゼロメア・暗黒大陸 =====
  d.party=['hero','iris','lucia','io'];
  World.enterMap('aruna_village',22,22,'up'); await frames(1); d.flags.aruna_arrived=false; await talk('av_woman'); ok(!act('aruna_letters'),'letters wait for arrival'); d.flags.aruna_arrived=true; await talk('av_woman'); ok(act('aruna_letters'),'letters start');
  World.enterMap('aruna_ruins',20,20,'up'); await frames(1); for(const p of [[5,6],[34,22],[24,22],[4,21],[36,12]]) await poke(p[0],p[1],[]); ok((d.inventory.old_letter||0)===5,'5 letters');
  World.enterMap('aruna_village',22,22,'up'); await frames(1); await talk('av_woman'); ok(done('aruna_letters'),'letters done');
  await talk('av_clockmaker'); ok(act('aruna_clock'),'clock start'); World.enterMap('aruna_ruins_1',9,7,'up'); await frames(1); await poke(9,6,[]); World.enterMap('aruna_village',22,22,'up'); await frames(1); await talk('av_clockmaker'); ok(done('aruna_clock'),'clock done');
  await talk('av_merchant'); ok(act('aruna_supplies'),'supplies start'); World.enterMap('ruins_store',5,5,'up'); await frames(1); await poke(5,3,[]); ok((d.inventory.old_supplies||0)===3,'3 supplies');
  World.enterMap('aruna_village',22,22,'up'); await frames(1); await talk('av_child'); await talk('av_sailor'); await talk('av_yorn'); await talk('av_merchant'); ok(done('aruna_supplies'),'supplies done');
  World.enterMap('memory_library',10,10,'up'); await frames(1); ['library_1','library_2','library_3'].forEach(f=>d.flags[f]=true); await talk('ml_librarian'); ok(State.hasItem('seal_key')&&!act('library_lost_books'),'librarian gives seal key first'); await talk('ml_librarian'); ok(act('library_lost_books'),'library start');
  await poke(5,13,[]); await poke(16,13,[]); World.enterMap('memory_library_seal',3,9,'left'); await frames(1); await poke(2,9,[]); World.enterMap('elmina_undersea',5,15,'down'); await frames(1); await poke(5,16,[]); await poke(17,16,[]);
  World.enterMap('memory_library',10,10,'up'); await frames(1); await talk('ml_librarian'); ok(done('library_lost_books'),'library done');
  World.enterMap('world_islands',94,51,'up'); await frames(1); await poke(94,50,[]); await poke(60,85,[]); await poke(131,94,[]); ok(done('iris_map')&&State.hasItem('surveyor_ring'),'iris map done');
  World.enterMap('tempus_bell',8,6,'up'); await frames(1); await talk('tb_keeper'); ok(act('tempus_bells'),'bells start');
  World.enterMap('temple_of_time_1',5,7,'up'); await frames(1); await poke(5,6,[]); World.enterMap('temple_of_time_2',3,7,'down'); await frames(1); await poke(3,8,[]); World.enterMap('temple_of_time_3',3,11,'up'); await frames(1); await poke(3,10,[]);
  World.enterMap('tempus_bell',8,6,'up'); await frames(1); await talk('tb_keeper'); ok(done('tempus_bells'),'bells done');
  World.enterMap('tempus_city',24,17,'up'); await frames(1); await talk('tc_waveold'); ok(done('lucia_wave')&&State.hasItem('wave_sword'),'lucia wave done');
  d.flags.zeromea_reformed=true; World.enterMap('node_city',26,25,'up'); await frames(1); await talk('nc_free1',[0]); ok(act('zeromea_job_choice')&&d.flags.job_talk_1,'job 1'); await talk('nc_job2',[1]); await talk('nc_job3',[0]); ok(done('zeromea_job_choice'),'job choice done');
  World.enterMap('auto_factory_2',6,6,'left'); await frames(1); await poke(5,6,[]); ok(done('io_memory')&&State.hasItem('io_core'),'io memory done');
  d.party=['hero','ganes','mina','seris']; World.enterMap('dark_camp',6,16,'left'); await frames(1); await poke(5,16,[]); ok(done('dark_memorial'),'memorial done');
  // ===== E. 師匠の特別クエストA/S・高位スキル =====
  { const G=w.Growth; d.trade.rankBest=4; ok(!G.questAvailable(w.QUESTS.mq_a),'mq_a locked at B'); d.trade.rankBest=6; ok(G.questAvailable(w.QUESTS.mq_a)&&G.questAvailable(w.QUESTS.mq_s),'mq_a/s available');
    w.Events.questStart('mq_a'); w.Events.questStart('mq_s'); d.counters.trial_perfect=12; d.counters.trial_analysis_full=10; d.counters['trial_ok:div_against_htf']=2; d.counters.trial_nohint_ok=40; d.trade.stats.uniqueCorrect={}; w.Scenarios.ids().slice(0,30).forEach(id=>d.trade.stats.uniqueCorrect[id]=1); d.counters.trial_unique=30;
    await drive(w.Events.checkCounterQuests(),[]); ok(done('mq_a')&&done('mq_s')&&State.hasItem('wave_charm')&&State.hasItem('mentor_crown'),'master quests A/S done'); }
  { const a=d.companions.elna; a.level=25; w.Actors.refreshSkills(a); ok(a.skills.includes('full_audit')&&a.skills.includes('final_ledger'),'auditor high skills');
    ['ord','nagi','iris','sophia','io','ganes','aster'].forEach(id=>{ const c=d.companions[id]; if(!c) return; c.level=(id==='aster'&&w.JOBS.spirit_warden.skills.some(k=>k.id==='spirit_rebirth'&&k.lv===40))?40:25; w.Actors.refreshSkills(c); }); ok(d.companions.aster.skills.includes('spirit_rebirth')&&d.companions.ganes.skills.includes('field_forge')&&d.companions.io.skills.includes('overclock'),'high skills learned'); }
  { const M=w.Minimap; d.visited.world_snow=true; d.visited.world_tempus=true; const e=M.globeEdges().find(e=>(e.a==='world_tempus'&&e.b==='world_snow')||(e.a==='world_snow'&&e.b==='world_tempus')); ok(e&&e.open,'globe snow edge'); }
  ok(Object.keys(w.QUESTS).length===85+6+(w.TRADERS?2:0)+(w.EVENTS65?5:0)+(w.Astra?1:0)+(w.Story3121?6:0),'85+6（v6.1 学院の研究クエスト）+2（v6.4 Phase D トレディア）+5（v6.5 Phase B イベントA〜E）+1（v6.5 Phase E アストラ号）+6（v6.9 西暦3121年：プロローグと任意5本） quests got '+Object.keys(w.QUESTS).length);
  State.save(2); const loaded=State.load(2); ok(loaded.companions.aster&&loaded.flags.ft1_done&&loaded.quests.mq_s,'save ok');
  console.log('ERRORS:', errs); process.exit(0);
} catch(e){ console.log('CRASH', e.stack.split('\n').slice(0,4).join(' '), 'ERRORS so far:', errs); process.exit(1);} })();
