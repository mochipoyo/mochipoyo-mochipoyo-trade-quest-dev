import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 2D版の index.html から「画面の部品（#app）」「スクリプトの一覧」「スタイル」を取り出して 3D 版へ差し込む
// （ゲームの中身は js/ の1か所だけ。2D版にスクリプトを足せば 3D 版にも自動で入る）
function legacy2D() {
  return {
    name: 'mtq-legacy-2d',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!html.includes('<!--APP_DOM-->')) return html;
        const src = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
        const dom = (src.match(/<div id="app">[\s\S]*?\n<\/div>\n/) || [''])[0];
        const scripts = [...src.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => '<script src="../' + m[1] + '"></script>').join('\n');
        const css = [...src.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => '<link rel="stylesheet" href="../' + m[1] + '">').join('\n');
        if (!dom || !scripts) throw new Error('2D版 index.html の解析に失敗');
        return html.replace('<!--APP_DOM-->', dom).replace('<!--LEGACY_SCRIPTS-->', scripts).replace('<!--LEGACY_CSS-->', css);
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [legacy2D()],
  build: {
    outDir: resolve(__dirname, '../3d'),
    emptyOutDir: true,
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1500,
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), viewer: resolve(__dirname, 'viewer.html') } }
  }
});
