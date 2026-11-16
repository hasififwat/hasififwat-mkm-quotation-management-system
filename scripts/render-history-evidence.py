import json
import sys
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

report = Path(sys.argv[1])
result = json.loads(report.read_text())
font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 18)
small = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 15)
lines = []
for index, check in enumerate(result['checks'], 1):
    lines.extend(textwrap.wrap(f'PASS {index}. {check}', width=118))
    lines.append('')
lines.extend(textwrap.wrap(f"Tested source {result['source']}", width=118))
lines.extend(textwrap.wrap(f"Runtime {json.dumps(result.get('runtime', {}))}", width=118))
lines.extend(textwrap.wrap(str(result.get('cleanup', 'Cleanup not recorded')), width=118))
image = Image.new('RGB', (1360, 150 + len(lines) * 25), '#111827')
draw = ImageDraw.Draw(image)
draw.text((32, 24), 'Quotation history | Actual disposable backend outcomes', font=font, fill='#f9fafb')
draw.text((32, 64), 'BACKEND REPORT IMAGE. Synthetic records. No browser or issued PDF claim.', font=small, fill='#fbbf24')
for index, line in enumerate(lines):
    draw.text((32, 120 + index * 25), line, font=small, fill='#6ee7b7' if line.startswith('PASS') else '#e5e7eb')
image.save(report.with_suffix('.png'))
