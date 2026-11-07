# v8.2 改修の前と後を並べた画像：python3 docs/tools/v82/compare82.py <撮影のディレクトリ> <出力のディレクトリ>
# ・各行：左＝改修前（スナップショット envsnap_a82before）、右＝改修後（最終のスナップショット）。どちらも同じ撮り方（1920×1080・低画質・同じ立ち位置の決め方）のゲームの画面を切り出したもの
# ・改修前の画像がないもの（新しい地図）は左に「改修前：この地図はない」と書く
import sys, os
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
try: F = ImageFont.truetype(FONT, 20); FS = ImageFont.truetype(FONT, 16)
except Exception: F = FS = ImageFont.load_default()
CW, CH = 576, 374
def crop(path):
    if not path or not os.path.exists(path): return None
    im = Image.open(path).convert('RGB'); w, h = im.size
    if w == 1920: im = im.crop((254, 8, 1406, 756))
    elif w == 390: im = im.crop((0, 0, 390, 508))
    im.thumbnail((CW, CH), Image.LANCZOS); return im
def find(kind, i):
    c = [os.path.join(src, 'before_int', 'before_pc_' + i + '.jpg'), os.path.join(src, 'before', 'before_pc_' + i + '.jpg')] if kind == 'before' else [os.path.join(src, 'after_int', 'after_pc_' + i + '.jpg'), os.path.join(src, 'after_view', i + '.jpg')]
    for p in c:
        if os.path.exists(p): return p
    return None
def sheet(name, title, rows):
    H = 44 + len(rows) * (CH + 34); im = Image.new('RGB', (CW * 2 + 30, H), (18, 22, 34)); d = ImageDraw.Draw(im)
    d.text((10, 10), title, font=F, fill=(240, 230, 200)); y = 44
    for (bid, aid, label) in rows:
        b = crop(find('before', bid)) if bid else None; a = crop(find('after', aid))
        d.text((10, y + 4), '改修前 ' + (bid or '') if b else '改修前：この地図・撮り方はない', font=FS, fill=(200, 200, 210)); d.text((CW + 20, y + 4), '改修後 ' + label, font=FS, fill=(255, 220, 150))
        if b: im.paste(b, (10, y + 28))
        if a: im.paste(a, (CW + 20, y + 28))
        else: d.text((CW + 30, y + 120), '（画像なし）', font=F, fill=(255, 120, 120))
        y += CH + 34
    im.save(os.path.join(out, name), quality=78, optimize=True); print(name, len(rows))
G = [
 ('magicka_london_before_after.jpg', 'マクディア（古いロンドン風）：宿・酒場・民家・道具屋', [('magicka_inn', 'magicka_inn', 'magicka_inn'), ('magicka_tavern', 'magicka_tavern', 'magicka_tavern'), ('magicka_city_x72_house', 'magicka_city_x72_house', 'magicka_city_x72_house'), ('magicka_item', 'magicka_item', 'magicka_item')]),
 ('towns_inns_before_after.jpg', '町ごとの宿・酒場（同じ用途で町が違う）', [('dow_inn', 'dow_inn', 'dow_inn'), ('frost_inn', 'frost_inn', 'frost_inn'), ('sahar_inn', 'sahar_inn', 'sahar_inn'), ('kalion_inn', 'kalion_inn', 'kalion_inn'), ('harbor_tavern', 'harbor_tavern', 'harbor_tavern'), ('verum_inn', 'verum_inn', 'verum_inn')]),
 ('ruins_before_after.jpg', '廃墟の街の屋内（郵便局・倉庫・生存者の家・広間・時計塔）', [('ruins_post', 'ruins_post', 'ruins_post'), ('ruins_store', 'ruins_store', 'ruins_store'), ('a3_ruins_keeper', 'a3_ruins_keeper', 'a3_ruins_keeper'), ('aruna_ruins_x72_hall', 'aruna_ruins_x72_hall', 'aruna_ruins_x72_hall'), ('aruna_ruins_1', 'aruna_ruins_1', 'aruna_ruins_1')]),
 ('academy_before_after.jpg', 'ボラティリティア学院：本館の前・玄関ホール・上の回廊・大食堂・西翼', [('volatilia', 'gate_pc_volatilia', '本館の前（ふつうのカメラ）'), (None, 'vol_main_hall', 'vol_main_hall（新）'), (None, 'vol_upper_gallery', 'vol_upper_gallery（新）'), (None, 'vol_great_hall', 'vol_great_hall（新）'), (None, 'vol_west_gallery', 'vol_west_gallery（新）')]),
 ('castles_before_after.jpg', '王城：城下町の楼門・城郭区画（前庭）・はじめて来たときの全景', [('rivel_town', 'gate_pc_rivel_town', 'リヴェル城下町の楼門'), (None, 'gate_pc_rivel_castle_approach', 'リヴェル城・城郭（新）'), (None, 'cine_pc_rivel_castle_approach', 'リヴェル城の全景（初回）'), ('sentra_capital', 'gate_pc_sentra_capital', 'セントラ王都の楼門'), (None, 'cine_pc_sentra_palace_approach', 'セントラ王宮の全景（初回）'), ('magicka_city', 'gate_pc_magicka_city', 'マクディアの楼門'), (None, 'cine_pc_magicka_palace_approach', '魔導王宮の全景（初回）')]),
 ('ticker_before_after.jpg', '円形ティックテープ：トレディアの広場・証券市場', [('tradia', 'ticker_pc_tradia', 'トレディアの広場（ふつうのカメラ・証券市場の扉の前）'), ('tradia_exchange', 'ticker_pc_tradia_exchange', '証券市場（ふつうのカメラ）')]),
 ('fields_after.jpg', '野外の見せ場：浮遊マクディア・魔王城・鉄冠将軍の砦の輪郭・大洋のリング', [(None, 'world_magicka', 'world_magicka（浮遊マクディア）'), (None, 'world_dark', 'world_dark（魔王城の輪郭）'), (None, 'world_grania', 'world_grania（砦の輪郭）'), (None, 'sea_ring_ship', 'アズール大洋のリング（船のふつうのカメラ）')]),
]
EXT = ['rivel_town', 'rivel_artisan', 'dow_village', 'harbor_town', 'asana_village', 'kalion_city', 'sentra_capital', 'erased_village', 'aruna_village', 'volatilia', 'magicka_city', 'tradia', 'mirror_market', 'ciel_port']
G.append(('town_exteriors_a_before_after.jpg', '町の外観（v8.2 で上書きした 14 町のうち 7）', [(t, t, t) for t in EXT[:7]]))
G.append(('town_exteriors_b_before_after.jpg', '町の外観（v8.2 で上書きした 14 町のうち 7）', [(t, t, t) for t in EXT[7:]]))
for g in G: sheet(*g)
