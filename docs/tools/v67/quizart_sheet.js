// 追加の50体（と既存5体）の絵を並べた一覧の画像を作る
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://localhost:8770/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const html = await p.evaluate(() => { const L = window.QUIZ_MONSTERS; return L.map(m => { const c = window.QuizMonArt.image(m.id, 2, 0); return '<div style="display:inline-block;width:132px;margin:2px;text-align:center;font:11px sans-serif;color:#eee;background:#223;padding:2px"><img src="' + (c ? c.toDataURL() : '') + '" width="128" height="128" style="image-rendering:pixelated;background:#445"><br>' + m.no + ' ' + m.short + '</div>'; }).join(''); });
  await p.setContent('<body style="background:#111;margin:4px">' + html + '</body>'); await p.waitForTimeout(500);
  await p.screenshot({ path: process.argv[2] || '/tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/quizart.png', fullPage: true });
  console.log('errors', errs.length, errs.slice(0, 3)); await b.close();
})();
