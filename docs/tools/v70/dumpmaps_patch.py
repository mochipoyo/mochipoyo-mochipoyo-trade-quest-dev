p='/home/claude/work/dumpmaps.js'; s=open(p,encoding='utf-8').read()
old="  const rows = typeof d.rows === 'function' ? null : d.rows;\n"
assert s.count(old)==1
new="""  // v7.0：出口のマス（木・崖・壁の上にあって歩いて出られなかった）を道にした3マップは、以前の文字に戻して比べる（v70/stuckcheck2.js・solidwarps.js で確かめる）
  const R70 = { aruna_village: [23, [13, 14], 'f'], aruna_ruins: [29, [18, 19, 20, 21], 'c'], scheduled_district: [23, [14, 15], 'C'] };
  let rows = typeof d.rows === 'function' ? null : d.rows;
  if (rows && R70[id]) { const [ry, xs, ch] = R70[id]; rows = rows.slice(); const r = rows[ry].split(''); xs.forEach((x) => { if (r[x] === 'r') r[x] = ch; }); rows[ry] = r.join(''); }
"""
s=s.replace(old,new)
s=s.replace("// v6.7：生活・健康の豆知識おばさん","// v7.0：出口のマスを道にした3マップ（アルナの村・廃墟の街・第7居住区）は、以前の文字に戻して比べる\n// v6.7：生活・健康の豆知識おばさん",1)
open(p,'w',encoding='utf-8').write(s)
print('patched')
