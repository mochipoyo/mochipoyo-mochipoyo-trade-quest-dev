from PIL import Image, ImageStat
import glob, json, os, re, statistics
D='/home/claude/work/p3d/shots/v83/lum/'
def lum(f):
    im=Image.open(f).convert('L'); w,h=im.size; c=im.crop((int(w*.15),int(h*.12),int(w*.85),int(h*.88))); return ImageStat.Stat(c).mean[0]
expo={}
for l in open(D+'after_run.log', encoding='utf-8', errors='ignore'):
    m=re.match(r'^(\S+) \{"expo":\{"mul":([\d.]+),"log":\[([\d,]*)\]', l)
    if m: expo[m.group(1)]=(float(m.group(2)), m.group(3))
rows=[]
for f in sorted(glob.glob(D+'after_*.jpg')):
    id=os.path.basename(f)[6:-4]; b=D+'low_'+id+'.jpg'
    if not os.path.exists(b): continue
    rows.append((lum(b), lum(f), id, expo.get(id,(None,''))))
rows.sort()
out=['| 部屋 | 前（画面の明るさ） | 後 | 露出の倍率 | 測った値（倍率を変えるたび） |','|---|---|---|---|---|']
for b,a,id,e in rows: out.append('| %s | %.0f | %.0f | %s | %s |'%(id,b,a,'' if e[0] is None else '×%.2f'%e[0], e[1]))
dark_b=[r for r in rows if r[0]<45]
summ='対象 %d 部屋。前に 45 未満だった %d 部屋：前の中央値 %.0f → 後 %.0f（最小 %.0f → %.0f）。45 以上だった %d 部屋：前の中央値 %.0f → 後 %.0f'%(len(rows), len(dark_b), statistics.median([r[0] for r in dark_b]), statistics.median([r[1] for r in dark_b]), min(r[0] for r in dark_b), min(r[1] for r in dark_b), len(rows)-len(dark_b), statistics.median([r[0] for r in rows if r[0]>=45]), statistics.median([r[1] for r in rows if r[0]>=45]))
open('/home/claude/envwork/docs/arch83/logs/expo_low_interiors.md','w').write('# 低画質の屋内：自動の露出の前と後（640×360・画面の中央 7 割の明るさ 0〜255。JPEG の画像から計算）\n\n'+summ+'\n\n'+'\n'.join(out)+'\n')
print(summ)
