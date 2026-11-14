# v9.10 準備：ChatGPT（画像生成）に渡す参考画像を書き出す
#   python3 tools/appear/pixel/chatgpt_pack.py → docs/appear/pixel/chatgpt_pack/
#     style_ref.png             絵柄の見本（今のキャラクター 4 人。4 倍・無地の背景）
#     tmpl/<人物ID>_front.png   衣装の下絵（持ち物を外した素体。4 倍＝1280×1280・無地の背景）
#     tmpl/<人物ID>_back.png
#   プロンプトは docs/appear/pixel/CHATGPT_PROMPTS.md
import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
KIT = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'art_kit'); OUT = os.path.join(ROOT, 'docs', 'appear', 'pixel', 'chatgpt_pack'); BG = (128, 136, 144, 255)


def up(path, k=4):
    im = Image.open(path).convert('RGBA'); g = Image.new('RGBA', (im.width * k, im.height * k), BG); g.alpha_composite(im.resize((im.width * k, im.height * k), Image.NEAREST)); return g.convert('RGB')


def main():
    os.makedirs(os.path.join(OUT, 'tmpl'), exist_ok=True); n = 0
    for a in sorted(os.listdir(KIT)):
        for v in ('front', 'back'):
            up(os.path.join(KIT, a, v + '_base.png')).save(os.path.join(OUT, 'tmpl', '%s_%s.png' % (a, v))); n += 1
    ids = ['hero', 'seris', 'ord', 'mina']; cells = []
    for a in ids:
        im = Image.open(os.path.join(KIT, a, 'front_base.png')).convert('RGBA'); im = im.crop(im.getbbox()); cells.append(im.resize((im.width * 4, im.height * 4), Image.NEAREST))
    W = sum(c.width + 40 for c in cells) + 40; H = max(c.height for c in cells) + 80; S = Image.new('RGBA', (W, H), BG); x = 40
    for c in cells: S.alpha_composite(c, (x, H - 40 - c.height)); x += c.width + 40
    S.convert('RGB').save(os.path.join(OUT, 'style_ref.png')); print('chatgpt_pack', n, 'templates', S.size)


if __name__ == '__main__': main()
