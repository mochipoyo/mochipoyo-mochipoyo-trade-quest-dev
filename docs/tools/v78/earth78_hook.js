// v7.8 2D 版の回帰テスト（/home/claude/work の rpgload.js を使うもの）を、読み込みだけ地球の世界にして動かす：node -r docs/tools/v78/earth78_hook.js <テスト>
const Module = require('module'); const path = require('path'); const orig = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) { if (/rpgload\.js$/.test(req)) return path.join(__dirname, 'earth78_rpgload.js'); return orig.call(this, req, parent, ...rest); };
