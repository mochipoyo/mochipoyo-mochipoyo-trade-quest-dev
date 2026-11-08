// v8.8 画面の写しで開く場面（shots88.js から使う）。戻り値は測る窓の CSS セレクタ
module.exports = {
  menu: async (p) => { await p.evaluate(() => { Menu.open(); }); await p.waitForSelector('.main-menu'); return '.main-menu'; },
  items: async (p) => { await p.evaluate(() => { State.addItem('herb', 5); State.addItem('magic_water', 2); State.addItem('antidote', 1); Menu.items(); }); await p.waitForSelector('.items-menu'); await p.click('.items-menu .rw-item'); return '.items-menu'; },
  equip: async (p) => { await p.evaluate(() => { State.addItem('iron_sword', 1); window.__eq = Menu.equip(); }); await p.waitForSelector('.rw-list'); await p.click('.rw-list .rw-item'); await p.waitForTimeout(200); await p.click('#ui .rw-list:last-child .rw-item'); await p.waitForSelector('.eq-list'); await p.click('.eq-list .rw-item'); return '.eq-list'; },
  settings: async (p) => { await p.evaluate(() => { Menu.settings(); }); await p.waitForSelector('.settings-menu'); return '.settings-menu'; },
  prompt: async (p) => { await p.evaluate(() => { Win.prompt('主人公の名前（8文字まで。空のまま決定で「勇者」）', '勇者', 8); }); await p.waitForSelector('.rw-prompt-panel'); return '.rw-prompt-panel'; }
};
