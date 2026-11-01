// モデル確認ページの並べ表示を撮る（ソフトウェア描画）
const { chromium } = require('playwright');
const SHOT = '/home/claude/work/p3d/shots/';
const LIST = process.argv.slice(2).length ? process.argv.slice(2) : ['creatures:Idle', 'creatures:Attack', 'characters:Idle'];
(async () => {
  const br = await chromium.launch(); const errs = [];
  for (const item of LIST) {
    const [kind, anim, t] = item.split(':');
    const p = await (await br.newContext({ viewport: { width: 1500, height: 520 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8770/3d/viewer.html?lineup=' + kind + '&anim=' + anim + (process.env.CAM || ''));
    await p.waitForFunction(() => window.viewerReady && /型|体/.test(document.getElementById('info').textContent), null, { timeout: 240000 }); await p.waitForTimeout(+(t || 3000));
    await p.screenshot({ path: SHOT + 'viewer_' + kind + '_' + anim + '.png', timeout: 120000 }); await p.close();
  }
  console.log('errors', errs); await br.close();
})();
