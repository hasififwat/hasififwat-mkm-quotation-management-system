import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
folder = root / 'docs/quotation-families'
result = json.loads((folder / 'backend-evidence.json').read_text())
font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 19)
small = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 16)
image = Image.new('RGB', (1280, 560), '#111827')
draw = ImageDraw.Draw(image)
draw.text((32, 28), 'Quotation family migration | Real backend fixture evidence', font=font, fill='#f9fafb')
draw.text((32, 66), 'Backend verification only. This image is not UI or production proof.', font=small, fill='#fbbf24')
y = 118
for index, check in enumerate(result['checks'], 1):
    import textwrap
    lines = textwrap.wrap(check, width=104)
    draw.text((32, y), f'PASS {index}', font=small, fill='#6ee7b7')
    for offset, line in enumerate(lines):
        draw.text((120, y + offset * 25), line, font=small, fill='#e5e7eb')
    y += max(58, len(lines) * 25 + 20)
draw.text((32, 475), 'Source: backend-evidence.json | Reproduce: scripts/check-family-backend.mjs', font=small, fill='#cbd5e1')
draw.text((32, 505), 'Disposable loopback database stopped and removed after verification.', font=small, fill='#cbd5e1')
image.save(folder / 'backend-evidence.png')
