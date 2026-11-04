# enemies-add35.template.js の /*@@ART@@*/ に add35_art.json（build_add35.py の出力）を入れて js/data/enemies-add35.js を作る
import json, sys
rows = json.load(open('/home/claude/work/v75/add35_art.json', encoding='utf-8'))
keys = ['no', 'id', 'packId', 'reuse', 'name', 'file', 'sha256', 'ref', 'bbox', 'visible', 'anchor', 'size', 'draw', 'lift', 'foot', 'floating']
lines = ['    { ' + ', '.join(k + ': ' + json.dumps(r[k], ensure_ascii=False) for k in keys) + ", status: 'adopted' }" for r in rows]
art = '[\n' + ',\n'.join(lines) + '\n  ]'
t = open('/home/claude/work/v75/enemies-add35.template.js', encoding='utf-8').read()
assert t.count('/*@@ART@@*/') == 1
open('/home/claude/mochipoyo-trade-quest/js/data/enemies-add35.js', 'w', encoding='utf-8').write(t.replace('/*@@ART@@*/', art))
print('generated')
