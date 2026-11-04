const load=require('../rpgload.js'); const {w,errors}=load(); const X=w.EXPAND72;
console.log('errors',errors.slice(0,3)); console.log('towns',Object.keys(X.towns).length,'maps',X.maps.length,'stairs',X.stairs.length,'skipped',JSON.stringify(X.skipped));
Object.keys(X.towns).forEach(k=>{const t=X.towns[k]; console.log(k.padEnd(20), t.oldW+'→'+t.w, 'open',t.open, 'T',t.tower?1:0,'H',t.house?1:0,'L',t.hall?1:0, t.theme);});
console.log(X.stairs.map(s=>s.from+'→'+s.to).join(' '));
console.log('extra', Object.keys(X.towns).map(k=>k+':'+X.towns[k].extra).join(' '));
