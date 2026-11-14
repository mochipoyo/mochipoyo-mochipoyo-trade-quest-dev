import sys; sys.path.insert(0,'tools/appear/pixel'); sys.path.insert(0,'docs/tools/appear')
import manifest as MF, preview as PV, compose as CP, numpy as np
from PIL import Image, ImageDraw
M=MF.manifest(); data=PV.appearance_data()
SETS=[{}, {'weapon':'steel_sword','shield':'iron_shield','head':'iron_helm','armor':'iron_armor'},{'weapon':'battle_axe','head':'leather_cap','armor':'leather_armor'},{'weapon':'iron_spear','head':'bu_control_seal_circlet'},{'weapon':'short_bow','head':'feather_hat'},{'weapon':'oak_staff','head':'wizard_hat','armor':'robe'},{'weapon':'dagger','shield':'wooden_shield'}]
out=sys.argv[1]; actors=sys.argv[2].split(','); K=0.8
rows=[]
for a in actors:
    A=M['actors'][a]
    for vk in ('front','back'):
        r=[]
        for eq in SETS:
            c,sk=CP.compose(M,a,vk,eq,data); im=Image.fromarray(np.clip(c,0,255).astype(np.uint8),'RGBA'); bb=im.getbbox(); im=im.crop(bb) if bb else im
            r.append(im.resize((max(1,int(im.width*K)),max(1,int(im.height*K))),Image.LANCZOS))
        rows.append((a+' '+vk,r))
cw=max(i.width for _,r in rows for i in r)+6; rh=[max(i.height for i in r)+4 for _,r in rows]
S=Image.new('RGB',(cw*len(SETS),sum(rh)),(96,104,92)); d=ImageDraw.Draw(S); y=0
for (lab,r),h in zip(rows,rh):
    for n,i in enumerate(r): S.paste(i,(n*cw+(cw-i.width)//2,y+h-i.height),i)
    d.text((2,y+2),lab,fill=(255,255,0)); y+=h
S.save(out); print(S.size)
