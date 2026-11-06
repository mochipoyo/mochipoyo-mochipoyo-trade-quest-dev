// jsdom でゲームを読み込む共通ヘルパー
const {JSDOM}=require('/home/claude/work/node_modules/jsdom'); const fs=require('fs');
const dir=process.env.RPG_DIR||'/home/claude/mochipoyo-trade-quest/';
function load(){
  const html=fs.readFileSync(dir+'index.html','utf8');
  const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://mochipoyo.github.io/mochipoyo-trade-quest/'});
  const w=dom.window;
  const ctxStub=new Proxy({},{get:(t,k)=> k==='measureText'?()=>({width:10}): (k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')?()=>({addColorStop(){}}) : ()=>{} , set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxStub;};
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 640;}});
  Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 300;}});
  w.scrollTo=()=>{}; w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
  w.AudioContext=undefined;
  if(!process.env.NO_EARTH){w.MTQ_JOIN76=true;} const errors=[]; w.addEventListener('error',e=>errors.push(e.message)); w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason&&e.reason.stack||e.reason)));
  const srcs=[...html.matchAll(/src="(js\/[^"]+)"/g)].map(m=>m[1]);
  for (const f of srcs) { const ff=f.replace(/\?.*$/,''); if (ff==='js/rpg/world76.js' && !process.env.NO_EARTH) w.eval(fs.readFileSync(dir+'js/data/earth78-terrain.js','utf8')); w.eval(fs.readFileSync(dir+ff,'utf8')); }
  return {w,dom,errors};
}
module.exports=load;
