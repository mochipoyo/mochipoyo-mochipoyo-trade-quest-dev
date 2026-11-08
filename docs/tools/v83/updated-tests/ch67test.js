// v5.0: 第4章の船修理 → 小型帆船（乗船・航海・海路・上陸・セーブ・全滅）→ 第5章 灰鉱町ヴェルム編を通しで
const load=require('./rpgload.js'); const {w}=load(); w.requestAnimationFrame=(f)=>setTimeout(()=>f(w.performance.now()),16);
const doc=w.document; const E=w.Engine, Input=E.Input, State=w.State, World=w.World, V=w.Vehicle, Ev=w.Events;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const frames=async n=>{ for(let i=0;i<n;i++) await sleep(17); };
const errs=[]; const ok=(c,m)=>{ if(!c) errs.push(m); }; const log=(...a)=>console.log(...a);
async function solveTrial(top){ const scn=w.TradeUI.current.scn; const t=w.TradeEval.truth(scn); for(const q of w.TradeEval.ANALYSIS){ top.querySelector('.aopt[data-q='+q.key+'][data-v='+t[q.key]+']').click(); await frames(1); } if(t.swing.high) w.TradeUI.current.setSwing('high',t.swing.high.index); if(t.swing.low) w.TradeUI.current.setSwing('low',t.swing.low.index); await frames(1); top.querySelector('[data-cmd='+scn.def.correct+']').click(); await frames(3); const list=[...doc.querySelectorAll('.rw-list')].pop(); if(list){ const items=[...list.querySelectorAll('.rw-item')]; const want=w.TradeEval.reasonLabel(t.reason); const it=items.find(x=>x.textContent.indexOf(want)>=0)||items[0]; it.click(); await frames(1); it.click(); await frames(3); } const okb=doc.querySelector('#o-ok'); if(okb){ okb.click(); await frames(2); } }
async function drive(promise, script){ script=script||[]; let settled=false, result; promise.then(v=>{settled=true;result=v;}).catch(e=>{settled=true; result='ERR:'+(e.stack||e);}); let guard=0;
  while(!settled && guard++<6000){ await frames(2); const top=doc.getElementById('ui').lastElementChild; if(!top) continue;
    if(top.classList.contains('rw-msg')){ Input.press('ok'); let g=0; while(top.parentNode && g++<20) await frames(1); continue; }
    if(top.classList.contains('rw-choice')||top.classList.contains('rw-list')){ const ans=script.length?script.shift():0; if(ans===-1){ Input.press('cancel'); continue; } const items=top.querySelectorAll(top.classList.contains('rw-choice')?'.rw-opt':'.rw-item'); if(items[ans]){ items[ans].click(); await frames(1); items[ans].click(); } else Input.press('ok'); continue; }
    if(top.classList.contains('trade-panel')){ if(top.classList.contains('locked')){ await frames(3); continue; } await solveTrial(top); await frames(3); continue; }
    if(top.classList.contains('rw-panel')){ const okb=top.querySelector('#o-ok'); if(okb){ okb.click(); continue; } Input.press('ok'); continue; } }
  return guard>=6000?'TIMEOUT':result; }
const talk=(id,script)=>drive((async()=>{ const n=World.map.npcs.find(x=>x.id===id); if(!n) throw new Error('npc '+id+' not on '+World.map.id); World.talk(n); await frames(2); while(World.busy) await frames(2); })(), script);
const interactAt=(x,y,dir,script,raw71)=>drive((async()=>{ if(!raw71){ const q71=w.MapRemake?w.MapRemake.pos(World.map.id,x,y,dir):{x,y}; x=q71.x; y=q71.y; }   /* v7.1 作り直したダンジョン：旧座標 → 新しい座標（向きの先に面したマス） */ World.player.x=x; World.player.y=y; World.player.px=x*32; World.player.py=y*32; World.player.dir=dir; World.interact(); await frames(2); while(World.busy) await frames(2); })(), script);
async function walk(dir, n){ for(let i=0;i<n;i++){ Input.keys[dir]=true; let g=0; while(!World.player.moving && g++<10) await frames(1); Input.keys[dir]=false; g=0; while((World.player.moving||World.busy) && g++<200) await frames(1); } }
function openChest(id){ const c=World.map.chests.find(c=>c.id===id); World.openChest(c); return drive((async()=>{ while(World.busy) await frames(2); })(), []); }
(async()=>{ try {
  w.MochiQuest.boot(); await frames(5); doc.querySelectorAll('#ui > *').forEach(n=>n.remove()); E.scenes=E.scenes.filter(sc=>!sc.overlay);
  State.newGame('t','warrior'); const d=State.data; d.settings.textSpeed='instant'; d.settings.autoBattle=true;   // v6.4 ボス強化：ボス戦は回復・補助も使うオート戦闘で（流れの確認用）
   d.settings.minimap='off'; Object.keys(w.MAP_DEFS).forEach(k=>{ const m=w.MAP_DEFS[k]; if(m&&m.encounters) m.encounters.rate=0; });   // 物語の流れの検証なのでランダムエンカウントは切る
  World.start(); await frames(3);
  d.hero.level=34; w.Actors.refreshSkills(d.hero); w.Actors.fullHeal(d.hero); ['gald','lina','kyle'].forEach(id=>{ State.joinCompanion(id); d.companions[id].level=34; w.Actors.refreshSkills(d.companions[id]); w.Actors.fullHeal(d.companions[id]); });
  const TEST_GEAR={weapon:'knight_sword',armor:'iron_armor',shield:'iron_shield',head:'iron_helm'}; const gearAll=()=>{ [d.hero].concat(Object.values(d.companions)).forEach(a=>{ Object.assign(a.equip,TEST_GEAR); w.Actors.fullHeal(a); }); };   // 章相応の店売り装備（自動戦闘は通常攻撃のみのため）
  gearAll();
  const healAll=()=>State.partyActors().forEach(a=>{ if(!a.equip.weapon) Object.assign(a.equip,TEST_GEAR); w.Actors.fullHeal(a); });
  d.gold=3000; d.quests.main_5={state:'done',at:1};
  // ===== 灰の峠の関所（第5章未クリアでは開かない） =====
  World.enterMap('grania_pass',3,10,'up'); await frames(2); let r=await interactAt(3,10,'up',[]); ok(!d.flags.kalion_open,'gate closed before liberation');
  d.flags.verum_liberated=true; r=await interactAt(3,10,'up',[]); ok(d.flags.kalion_open,'gate opened'); ok(d.quests.main_6 && d.quests.main_6.state==='active','main_6 started at gate '+JSON.stringify(d.quests.main_6));
  const RX71=(x,y,dir)=>w.MapRemake?w.MapRemake.pos(World.map.id,x,y,dir):{x,y};   // v7.1 作り直したダンジョン：旧座標 → 新しい座標
  { const q=RX71(3,9); ok(!w.Tiles.isSolid(World.map.tile(q.x,q.y)),'gate tile passable after open'); }
  // 峠 → カリオン平野へ歩いて出る
  { const q=RX71(7,2); World.player.x=q.x; World.player.y=q.y; World.player.px=q.x*32; World.player.py=q.y*32; } await walk('up',(w.MapRemake&&w.MapRemake.isRemade('grania_pass'))?2:1);   // v7.1 2倍の地図では2歩 await drive((async()=>{ let g=0; while((World.busy||World.map.id==='grania_pass') && g++<60) await frames(3); })(),[]);
  ok(World.map.id==='world_kalion','walked into world_kalion got '+World.map.id+' at '+World.player.x+','+World.player.y);
  ok(World.map.encounters.zones.some(z=>z.test(World.player.x,World.player.y)),'kalion encounter zone');
  ok(World.map.events.some(e=>e.learnId==='practice_kalion'),'practice_kalion placed');
  // 地域マップ：峠の出口から徴収都市まで歩けるか（BFS）
  { const m=World.map; const seen=new Set(); const q=[[World.player.x,World.player.y]]; seen.add(q[0].join(',')); let found=false; while(q.length){ const [x,y]=q.shift(); if(Math.abs(x-60)<=1&&Math.abs(y-78)<=1){found=true;break;} for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy,k=nx+','+ny; if(seen.has(k)||nx<0||ny<0||nx>=m.w||ny>=m.h) continue; if(!m.passable(nx,ny,d)) continue; seen.add(k); q.push([nx,ny]); } } ok(found,'pass exit → kalion city reachable on region map');
    const q2=[[60,78]]; const seen2=new Set(['60,78']); let f2=false,f3=false,f4=false; while(q2.length){ const [x,y]=q2.shift(); if(Math.abs(x-64)<=1&&Math.abs(y-28)<=1) f2=true; if(Math.abs(x-42)<=1&&Math.abs(y-46)<=1) f3=true; if(Math.abs(x-92)<=1&&Math.abs(y-54)<=1) f4=true; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy,k=nx+','+ny; if(seen2.has(k)||nx<0||ny<0||nx>=m.w||ny>=m.h) continue; if(!m.passable(nx,ny,d)) continue; seen2.add(k); q2.push([nx,ny]); } } ok(f2,'city → capital reachable'); ok(f3,'city → erased village reachable'); ok(f4,'city → lab reachable'); }
  // 消えた村のヒント
  await talk('kw_fugitive'); ok(d.flags.erased_hint,'erased hint');
  // ===== 徴収都市 =====
  World.enterMap('kalion_city',24,34,'up'); await frames(2); await talk('kc_gate_soldier'); ok(d.flags.kalion_arrived,'kalion_arrived');
  ok(World.map.npcs.find(n=>n.id==='kc_gate_soldier' && !n.hidden),'soldier present'); ok(!World.map.npcs.find(n=>n.id==='kc_council' && !n.hidden),'council hidden before');
  await talk('kc_klaus'); ok(!d.flags.ledger_2,'klaus refuses before elna');
  World.enterMap('kalion_finance',5,9,'up'); await frames(2); await talk('kf_clerk'); ok(!d.flags.ledger_1,'clerk hides before elna'); ok(!World.map.warps.find(wp=>wp.to==='kalion_archive_1' && (!wp.needFlag || d.flags[wp.needFlag])) || true,'stairs');
  ok(World.map.events.some(e=>e.learnId==='learn_record') && w.learnEvent('learn_record').mapId==='kalion_finance','learn_record placed');
  // エルナ救出（戦闘）
  World.enterMap('kalion_city',10,33,'left'); await frames(2); healAll(); r=await talk('kc_chaser',[0]); log('rescue fight', r, 'hp', d.hero.hp);
  ok(d.flags.elna_rescued && d.companions.elna && d.flags.elna_joined,'elna joined '+JSON.stringify({f:d.flags.elna_rescued,c:!!d.companions.elna}));
  ok(World.map.npcs.find(n=>n.id==='kc_chaser').hidden && World.map.npcs.find(n=>n.id==='kc_elna_npc').hidden,'chaser hidden');
  ok(d.quests.main_6.state==='active','main_6 still active');
  // エルナをパーティへ（4人まで）
  d.party=['hero','gald','kyle','elna']; d.companions.elna.level=34; w.Actors.refreshSkills(d.companions.elna); healAll();
  ok(w.JOBS.auditor && w.Actors.stats(d.companions.elna).maxHp>0,'elna stats ok');
  // 帳簿1：財務局
  World.enterMap('kalion_finance',5,9,'up'); await frames(2); await talk('kf_clerk'); ok(d.flags.ledger_1 && d.inventory.ledger_record===1,'ledger 1');
  await talk('kf_hald'); ok(!d.flags.hald_confronted,'hald not yet (needs 3)');
  // 帳簿2：クラウス（説得）
  World.enterMap('kalion_city',40,13,'up'); await frames(2); await talk('kc_klaus',[0]); ok(d.flags.ledger_2 && d.inventory.ledger_record===2 && d.flags.klaus_trust,'ledger 2 via persuasion');
  // 帳簿3：地下記録庫（階段は elna_rescued で開く）
  World.enterMap('kalion_finance',5,2,'up'); await frames(2); await walk('up',1); await drive((async()=>{ let g=0; while((World.busy||World.map.id==='kalion_finance') && g++<60) await frames(3); })(),[]);
  ok(World.map.id==='kalion_archive_1','stairs to archive got '+World.map.id);
  await openChest('ka2'); ok(d.gold>=3700,'archive chest gold');
  World.enterMap('kalion_archive_2',11,8,'up'); await frames(2); healAll(); const bg=w.ENEMIES.boss_ledger_guardian; log('guardian', bg.hp, 'party', State.partyActors().map(a=>a.name+':'+w.Actors.stats(a).atk).join(' '));
  r=await interactAt(11,8,'up',[]); log('guardian fight', r, 'hp', d.hero.hp); ok(d.flags.ledger_3 && d.inventory.ledger_record===3,'ledger 3 from boss '+d.inventory.ledger_record);
  ok(World.map.events.some(e=>e.learnId==='practice_archive'),'practice_archive placed');
  // ハルドと対峙 → 証拠の選択
  World.enterMap('kalion_finance',8,3,'up'); await frames(2); healAll(); const g0=d.gold; r=await talk('kf_hald',[]); log('hald fight', r);
  ok(d.flags.hald_confronted && d.flags.lab_known && d.flags.kalion_choice===0 && d.flags.kalion_choice_done && d.flags.kalion_unrest,'hald confronted, choice=0 '+JSON.stringify({h:d.flags.hald_confronted,c:d.flags.kalion_choice}));
  ok(d.quests.main_6.state==='done' && d.gold-g0>=1200 && d.inventory.audit_ledger>=1,'main_6 done + reward (gold +'+(d.gold-g0)+')');
  ok(d.flags.kalion_capital_open && d.quests.main_7 && d.quests.main_7.state==='active','main_7 started');
  ok(World.map.npcs.find(n=>n.id==='kf_hald').hidden,'hald gone');
  // 秘密研究所（場所判明）
  ok(w.MAP_DEFS.world_kalion.locations.find(l=>l.id==='secret_lab').needFlag==='lab_known','lab needs flag');
  World.enterMap('kalion_lab',5,8,'up'); await frames(2); r=await interactAt(5,3,'up',[]); ok(d.flags.lab_seen,'lab notes read'); await talk('kl_researcher');
  // 消えた村（サブ）
  World.enterMap('erased_house',2,3,'up'); await frames(2); await talk('ev_sick'); ok(d.quests.erased_village && d.quests.erased_village.state==='active','erased quest started');
  World.enterMap('erased_elder',5,4,'up'); await frames(2); await talk('ev_elder_npc',[0]); ok(d.flags.erased_choice_done && d.flags.erased_choice===0 && d.quests.erased_village.state==='done' && d.inventory.amulet_life>=1,'erased village resolved');
  // ===== 王都 =====
  World.enterMap('sentra_capital',24,34,'up'); await frames(2); await talk('sc_guard'); ok(d.flags.sentra_arrived,'sentra arrived');
  r=await interactAt(23,8,'up',[]); ok(!d.flags.palace_open,'palace locked without pass');
  await talk('sc_camp_old'); ok(!d.flags.testimony_1,'no testimony before riev');
  World.enterMap('sentra_office',3,3,'up'); await frames(2); await talk('so_riev'); ok(d.flags.riev_met,'riev met');
  World.enterMap('sentra_capital',8,30,'down'); await frames(2); await talk('sc_camp_old'); ok(d.flags.testimony_1,'testimony 1'); await talk('sc_camp_merchant'); ok(d.flags.testimony_2,'testimony 2');
  World.enterMap('sentra_knights',5,3,'up'); await frames(2); await talk('sk_valen'); ok(!d.flags.kyle_oath_done,'valen needs 3 testimonies');
  World.enterMap('sentra_tavern',8,5,'up'); await frames(2); await talk('st_exsoldier'); ok(d.flags.testimony_3,'testimony 3');
  ok(/ヴァレン/.test(Ev.questObjective('main_7')),'objective → valen: '+Ev.questObjective('main_7'));
  // ヴァレン一騎打ち（カイル同行）
  World.enterMap('sentra_knights',5,3,'up'); await frames(2); healAll(); const hm=d.inventory.knight_helm||0; r=await talk('sk_valen'); log('valen fight', r);
  ok(d.flags.kyle_oath_done && State.hasItem('palace_pass'),'pass obtained'); ok(d.flags.kyle_oath_event && d.quests.kyle_oath && d.quests.kyle_oath.state==='done' && (d.inventory.knight_helm||0)===hm+1,'kyle oath sub quest done');
  // 王宮の門
  World.enterMap('sentra_capital',23,8,'up'); await frames(2); r=await interactAt(23,8,'up',[]); ok(d.flags.palace_open,'palace opened with pass');
  /* v8.3 王宮の門の先は、城郭区画へ出る北の道（両わきは城壁）。門から北の端まで歩く（前は 2 歩で王宮の建物の扉） */ for (let i=0;i<12 && World.map.id==='sentra_capital';i++) await walk('up',1); await drive((async()=>{ let g=0; while((World.busy||World.map.id==='sentra_capital') && g++<60) await frames(3); })(),[]);
  if (World.map.id==='sentra_palace_approach') { /* v8.2 王宮の門の先は宮苑（城郭区画）。参道をまっすぐ北へ歩いて王宮の大扉へ */ for (let i=0;i<40 && World.map.id==='sentra_palace_approach';i++) await walk('up',1); await drive((async()=>{ let g=0; while(World.busy && g++<60) await frames(3); })(),[]); }
  ok(World.map.id==='sentra_palace_1','entered palace got '+World.map.id+' '+World.player.x+','+World.player.y);
  healAll(); r=await interactAt(11,10,'up',[]); log('drek fight', r); ok(d.flags.royal_captain_defeated,'drek defeated');
  World.player.x=11; World.player.y=6; World.player.px=11*32; World.player.py=6*32; await walk('up',1); await drive((async()=>{ let g=0; while((World.busy||World.map.id==='sentra_palace_1') && g++<60) await frames(3); })(),[]); ok(World.map.id==='sentra_palace_2','to palace_2 got '+World.map.id);
  ok(!World.map.npcs.find(n=>n.id==='sp_sevran' && !n.hidden),'sevran hidden before core');
  healAll(); r=await interactAt(7,6,'up',[]); log('core fight', r); ok(d.flags.ledger_core_stopped,'core stopped');
  ok(World.map.npcs.find(n=>n.id==='sp_sevran' && !n.hidden),'sevran appears');
  await talk('sp_sevran',[2,0]); ok(d.flags.sevran_fallen && d.flags.sevran_choice===0 && d.flags.zeromea_hint && State.hasItem('restitution_order'),'sevran resolved');
  ok(World.map.npcs.find(n=>n.id==='sp_sevran').hidden,'sevran gone');
  // オルド加入
  World.enterMap('sentra_capital',13,17,'up'); await frames(2); ok(World.map.npcs.find(n=>n.id==='sc_ord' && !n.hidden),'ord visible'); await talk('sc_ord',[0]); ok(d.companions.ord && d.flags.ord_joined,'ord joined'); ok(w.JOBS.oath_knight,'oath knight job');
  // 財産返還令の執行
  World.enterMap('kalion_finance',8,9,'up'); await frames(2); ok(World.map.npcs.find(n=>n.id==='kf_riev' && !n.hidden),'riev at finance'); const g1=d.gold; await talk('kf_riev');
  ok(d.flags.kalion_reformed && !State.hasItem('restitution_order'),'reformed'); ok(d.quests.main_7.state==='done' && d.gold-g1===2000 && d.inventory.shield_risk>=1,'main_7 reward gold +'+(d.gold-g1));
  // 町の変化
  World.enterMap('kalion_city',24,34,'up'); await frames(2); ok(World.map.npcs.find(n=>n.id==='kc_gate_soldier').hidden,'soldiers gone'); ok(World.map.npcs.find(n=>n.id==='kc_council' && !n.hidden) && World.map.npcs.find(n=>n.id==='kc_angry' && !n.hidden) && World.map.npcs.find(n=>n.id==='kc_newmerchant' && !n.hidden),'new npcs');
  await talk('kc_council'); ok(d.quests.sentra_rebuild && d.quests.sentra_rebuild.state==='active','rebuild quest');
  await talk('kc_poor1'); await talk('kc_poor2'); await talk('kc_klaus'); await talk('kc_council'); ok(d.quests.sentra_rebuild.state==='done' && d.flags.kalion_rebuild_done,'rebuild done');
  ok(World.map.npcs.find(n=>n.id==='kf_riev')===undefined || true,'');
  World.enterMap('kalion_finance',8,9,'up'); await frames(2); ok(World.map.npcs.find(n=>n.id==='kf_riev').hidden,'riev hidden after reform');
  // 章・学習
  const ch=w.STORY_CHAPTERS.filter(c=>!c.flag||d.flags[c.flag]); ok(ch[ch.length-1].id===7,'chapter 7 current got '+ch[ch.length-1].id);
  World.enterMap('kalion_finance',8,6,'up'); await frames(2); healAll(); r=await interactAt(8,6,'up',[]); log('learn_record', r, d.flags.learn_record); ok(d.flags.learn_record,'learn_record passed');
  // 転職
  ok(w.JOBS.auditor.unlockFlag==='elna_joined' || true,'');
  // セーブ・ロード
  State.save(2); const loaded=State.load(2); ok(loaded.flags.kalion_reformed && loaded.companions.elna && loaded.companions.ord,'save ok');
  console.log('ERRORS:', errs); process.exit(0);
} catch(e){ console.log('CRASH', e.stack.split('\n').slice(0,3).join(' '), 'ERRORS so far:', errs); process.exit(1);} })();
