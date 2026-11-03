// v5.9 の確認：①追加モンスター10種 ②本棚の本 ③地域の地図で全地域の地形
const load=require('./rpgload.js'); const {w,errors}=load(); const fs=require('fs');
const doc=w.document; const E=w.Engine, Input=E.Input, State=w.State, World=w.World, Win=w.Win, C=w.Combat;
w.MochiQuest.boot();
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const frames=async n=>{ for(let i=0;i<n;i++) await sleep(17); };
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++; console.log('  OK ', m);} else {fail++; console.log('  NG ', m);} };
const top=()=>doc.getElementById('ui').lastElementChild;
async function waitFor(fn, n=300){ for(let i=0;i<n;i++){ const v=fn(); if(v) return v; await frames(1); } return null; }
(async()=>{
  await frames(5); doc.querySelectorAll('#ui > *').forEach(n=>n.remove()); E.scenes=E.scenes.filter(sc=>!sc.overlay);
  State.newGame('テスト','warrior'); State.data.settings.textSpeed='instant'; World.start(); await frames(3);
  doc.querySelectorAll('#ui > *').forEach(n=>n.remove()); E.scenes=E.scenes.filter(sc=>!sc.overlay);

  console.log('① 追加モンスター');
  const NEW=['yosen_slime','insen_slime','contrarian_bat','stoploss_zombie','nanpin_goblin','simple_cultist','fullleva_ogre','kotsukotsu_knight','pojipoji_phantom','indicator_mage'];
  const NAMES=['陽線スライム','陰線スライム','逆張りバット','損切りゾンビ','ナンピンゴブリン','シンプル教信徒','フルレバオーガ','コツコツドカンナイト','ポジポジファントム','インジケーター依存メイジ'];
  const zones=[]; Object.values(w.MAP_DEFS).forEach(m=>{ if(m.encounters) zones.push(...m.encounters.zones.map(z=>({map:m.id, z}))); });
  NEW.forEach((id,i)=>{ const e=w.ENEMIES[id]; const man=w.ASSET_MANIFEST.monsters[id];
    const where=zones.filter(o=>o.z.groups.some(g=>g.includes(id))).map(o=>o.map+':'+o.z.name);
    const file='/home/claude/mochipoyo-trade-quest/'+(man&&man.path);
    ok(e && (e.legacyName||e.name)===NAMES[i] /* r164：表示名を新名称に変えたため、もとの名前（legacyName）で照合 */ && e.lv>0 && e.hp>0 && e.desc && !e.boss && man && man.use && fs.existsSync(file) && where.length>0, `${NAMES[i]}（Lv${e&&e.lv} HP${e&&e.hp} 攻${e&&e.atk}）画像あり・出現：${where.join('、')}`);
    e.actions.forEach(a=>{ if(a.type==='special') ok(!!w.ENEMY_SPECIALS[a.id], '  特技 '+a.id+'（'+(w.ENEMY_SPECIALS[a.id]||{}).name+'）'); });
  });
  // 戦闘：各モンスターと戦って、特技が実際に使われ、エラーが出ないこと
  const usedSpecials=new Set();
  for(const id of NEW){ const e=w.ENEMIES[id]; for(let k=0;k<25;k++){ State.newGame('t','warrior'); const h=State.data.hero; h.level=e.lv+12; w.Actors.refreshSkills(h); w.Actors.fullHeal(h); const b=C.create([id],State.partyActors(),{}); for(let t=0;t<6 && b.state==='command';t++){ const ev=C.runTurn(b,[{actorId:'hero',type:'defend'}]); ev.forEach(x=>{ if(x.type==='msg') Object.entries(w.ENEMY_SPECIALS).forEach(([sid,sp])=>{ if(x.text.indexOf(sp.msg)>=0) usedSpecials.add(sid); }); }); } } }
  const need=['yosen_rally','insen_drop','contrarian_dive','hold_loss','nanpin','simple_sermon','full_leverage','kotsukotsu','dokan','pojipoji','indicator_overload'];
  ok(need.every(s=>usedSpecials.has(s)), '追加の特技11種がすべて戦闘で発動（'+need.filter(s=>usedSpecials.has(s)).length+'/11）');
  // ナンピン：ひとりのとき（maxEnemies 2）は2体まで、制限なしなら増える
  let max2=0, maxN=0; for(let k=0;k<40;k++){ State.newGame('t','warrior'); const h=State.data.hero; h.level=30; w.Actors.fullHeal(h); const b=C.create(['nanpin_goblin'],State.partyActors(),{maxEnemies:2}); for(let t=0;t<10&&b.state==='command';t++){ C.runTurn(b,[{actorId:'hero',type:'defend'}]); max2=Math.max(max2,b.enemies.filter(x=>!x.dead).length);} const b2=C.create(['nanpin_goblin'],State.partyActors(),{}); w.Actors.fullHeal(h); for(let t=0;t<10&&b2.state==='command';t++){ C.runTurn(b2,[{actorId:'hero',type:'defend'}]); maxN=Math.max(maxN,b2.enemies.filter(x=>!x.dead).length);} }
  ok(max2<=2 && maxN>2, 'ナンピン：ひとり旅では2体まで（最大'+max2+'）、仲間がいれば増える（最大'+maxN+'）');
  // 図鑑の区分と総数
  ok(Object.keys(w.ENEMIES).length===201+7+40, '敵の総数 191 → 201（v5.9）→ 208（v6.1 学院の魔物7種を含む）→ '+Object.keys(w.ENEMIES).length+'（v6.5 Phase B 地域の新しいモンスター40種を含む）');

  console.log('② 本棚の本');
  const B=w.Books; ok(B && B.all.length>=30 && B.all.every(b=>b.id&&b.title&&b.pages.length&&b.cat), '本 '+B.all.length+'冊（ヒント'+B.all.filter(b=>b.cat==='トレードのヒント').length+'・相場格言'+B.all.filter(b=>b.cat==='相場格言').length+'・伝承'+B.all.filter(b=>b.cat==='伝承').length+'）');
  ok(new Set(B.all.map(b=>b.id)).size===B.all.length && new Set(B.all.map(b=>b.title)).size===B.all.length, '本のIDと題名に重複なし');
  const s1=B.forShelf('poyo_elder_house',1,1), s2=B.forShelf('poyo_elder_house',1,1);
  ok(s1.length===2 && s1.map(b=>b.id).join()===s2.map(b=>b.id).join(), '同じ本棚はいつも同じ本（'+s1.map(b=>b.title).join('・')+'）');
  ok(B.forShelf('poyo_dojo',1,1).length===3, '修行場の本棚は3冊');
  // 序盤の町では tier1 の本だけ
  let early=new Set(); ['poyo_elder_house','poyo_item_shop','poyo_dojo','rivel_guild','dow_dojo','harbor_item_shop'].forEach(mid=>{ for(let x=0;x<12;x++) for(let y=0;y<8;y++) B.forShelf(mid,x,y).forEach(b=>early.add(b)); });
  ok([...early].every(b=>b.tier===1), '序盤の町の本棚には上級の本が並ばない（'+early.size+'種類）');
  let all=new Set(); Object.keys(w.MAP_DEFS).forEach(mid=>{ for(let x=0;x<30;x++) for(let y=0;y<12;y++) B.forShelf(mid,x,y).forEach(b=>all.add(b.id)); });
  ok(all.size===B.all.length, 'どの本も、どこかの本棚に並ぶ（'+all.size+'/'+B.all.length+'）');
  // 実際に本棚を調べて読む（村長の家の本棚 (1,1)：下の (1,2) から上を向いて決定）
  State.data.booksRead={}; World.enterMap('poyo_elder_house',1,2,'up'); await frames(3);
  World.interact(); const lst=await waitFor(()=>{ const t=top(); return t&&t.classList.contains('rw-list')&&t.textContent.indexOf('本棚')>=0?t:null; });
  ok(!!lst && lst.querySelectorAll('.rw-item').length===2, '本棚を調べると本の一覧が出る：'+(lst?[...lst.querySelectorAll('.rw-item .l')].map(x=>x.textContent).join(' / '):''));
  lst.querySelectorAll('.rw-item')[0].click(); await frames(2);
  const pg=await waitFor(()=>{ const t=top(); return t&&t.classList.contains('rw-panel')&&t.querySelector('.book-page')?t:null; });
  ok(!!pg, '本のページが開く：'+(pg?pg.querySelector('.book-page').textContent.slice(0,30):''));
  for(let i=0;i<10;i++){ const t=top(); if(t&&t.classList.contains('rw-panel')){ Input.press('ok'); await frames(2); } else break; }
  ok(Object.keys(State.data.booksRead).length===1, '読んだ本が記録される');
  const lst2=await waitFor(()=>{ const t=top(); return t&&t.classList.contains('rw-list')?t:null; });
  ok(lst2 && lst2.textContent.indexOf('読んだ')>=0, '一覧に「読んだ」が付く');
  Input.press('cancel'); await waitFor(()=>!World.busy); ok(!World.busy, '本棚を閉じると歩ける');
  // メニュー「トレード修行」の最後に「読んだ本」
  const mp=w.Menu.training(); const tl=await waitFor(()=>{ const t=top(); return t&&t.classList.contains('rw-list')?t:null; }); const items=[...tl.querySelectorAll('.rw-item .l')].map(x=>x.textContent);
  ok(items[10]==='読んだ本' && items[6]==='師匠の特別クエスト', 'トレード修行メニューの最後に「読んだ本」（既存の並びはそのまま）');
  tl.querySelectorAll('.rw-item')[10].click(); await frames(2); tl.querySelectorAll('.rw-item')[10] && tl.querySelectorAll('.rw-item')[10].click(); await frames(3);
  const rl=await waitFor(()=>{ const t=top(); return t&&t.classList.contains('rw-list')&&t.textContent.indexOf('読んだ本 1/')>=0?t:null; });
  ok(!!rl, '「読んだ本」から読み返せる');
  Input.press('cancel'); await frames(3); Input.press('cancel'); await frames(3);

  console.log('③ 地域の地図・世界');
  const MM=w.Minimap; World.enterMap('poyo_village',24,32,'down'); await frames(3);
  MM.openBig(); await frames(2); MM.setMode('world'); await frames(2);
  ok(MM.viewRegionId()==='world', '「地域の地図」は今いる地域から');
  const sel=doc.getElementById('bm-region-sel'); MM.drawBig(); const sel2=doc.getElementById('bm-region-sel');
  ok(sel2 && sel2.options.length===12, '地域を選ぶ欄に全12地域：'+(sel2?[...sel2.options].map(o=>o.textContent).join('・'):''));
  sel2.value='world_dark'; sel2.dispatchEvent(new w.Event('change')); MM.drawBig();
  ok(MM.viewRegionId()==='world_dark' && doc.getElementById('bm-title').textContent.indexOf('暗黒大陸')>=0 && doc.getElementById('bm-title').textContent.indexOf('未踏・地形のみ')>=0, '未踏の地域（暗黒大陸）の地形を最初から表示：'+doc.getElementById('bm-title').textContent);
  MM.setMode('globe'); MM.drawBig(); const names=[...doc.querySelectorAll('.wm-region .wm-name')].map(x=>x.firstChild.textContent);
  ok(names.length===12 && names.every(n=>n && n.indexOf('？')<0), '「世界」タブで全地域の名前を表示（？？？なし）：'+names.join('・'));
  w.WorldMap.select('world_magicka'); w.WorldMap.openTerrain(w.WorldMap.sel); MM.drawBig();
  ok(MM.mode==='world' && MM.viewRegionId()==='world_magicka', '「世界」タブで地域を選んで「地形を見る」→ その地域の地形へ');
  // 隠された場所は条件を満たすまで地図に出さない
  const km=World.getMap('world_kalion'); ok(MM.hiddenLocs(km).map(L=>L.id).filter(i=>i!=='asana_ruins').join()==='erased_village', '隠し地点（地図から消えた村）は条件前は地図に出さない');
  State.data.flags.erased_hint=true; ok(MM.hiddenLocs(km).filter(L=>L.id!=='asana_ruins').length===0, '条件を満たすと地図に出る');   // v6.9 アサナ村跡（第6章の記録で出る）は chapters2d.js で確かめる
  MM.close(); await frames(2);
  ok(!World.busy, '地図を閉じると歩ける');
  console.log('errors:', errors.length? errors : 'なし');
  console.log('RESULT', pass, 'pass', fail, 'fail'); process.exit(fail||errors.length?1:0);
})().catch(e=>{ console.log('EXC', e.stack); process.exit(1); });
