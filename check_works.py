import json
import re
import os
from PIL import Image

with open('data/works.js', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'PORTFOLIO_WORKS = (\[.*?\]);', content, re.DOTALL)
if not m:
    print("Could not parse PORTFOLIO_WORKS")
    exit(1)

works = json.loads(m.group(1))
print(f"Total works: {len(works)}")

missing = 0
for w in works:
    path = w['file']
    exists = os.path.exists(path)
    if not exists:
        missing += 1
        print(f"MISSING: {w['id']} - {w['name']} ({path})")
    else:
        with Image.open(path) as img:
            w['width'], w['height'] = img.size
            w['ratio'] = img.size[0] / img.size[1]
        print(f"OK [{w['id']}] {w['name'][:28]:<28} | {w['category']:<22} | {w['width']}x{w['height']} (ratio: {w['ratio']:.2f}) | {w['model']}")

print(f"\nAll images verified! Missing: {missing}")
