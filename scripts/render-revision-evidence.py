import json
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
folder = root / 'docs/quotation-families'
result = json.loads((folder / 'revision-backend-evidence.json').read_text())
font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 20)
small = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 16)
image = Image.new('RGB', (1360, 780), '#111827')
draw = ImageDraw.Draw(image)
draw.text((32, 25), 'Quotation revision saves | Real Convex transaction results', font=font, fill='#f9fafb')
draw.text((32, 65), 'BACKEND EVIDENCE ONLY. Synthetic records. No UI or PDF storage claim.', font=small, fill='#fbbf24')
y = 120
for index, check in enumerate(result['checks'], 1):
    lines = textwrap.wrap(check, width=112)
    draw.text((32, y), f'PASS {index}', font=small, fill='#6ee7b7')
    for offset, line in enumerate(lines):
        draw.text((120, y + offset * 25), line, font=small, fill='#e5e7eb')
    y += len(lines) * 25 + 28
for line in [
    f"Tested source {result['source']}",
    f"Node {result['runtime']['node']} | Convex {result['runtime']['convex']} | {result['runtime']['url']}",
    'Command: node scripts/check-revision-backend.mjs',
    'Binary supplied with FAMILY_BACKEND_BINARY. No project credentials read.',
    'Concurrent requests bypass the HTTP client queue.',
    result['cleanup'],
    'Source report: docs/quotation-families/revision-backend-evidence.json',
]:
    draw.text((32, y), line, font=small, fill='#cbd5e1')
    y += 29
image.save(folder / 'revision-backend-evidence.png')
