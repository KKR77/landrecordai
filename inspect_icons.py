import pymupdf as fitz

doc = fitz.open(r'C:\Users\chand\Downloads\Telegram Desktop\vik GECM final.pdf')
page = doc[1]
drawings = page.get_drawings()
print(f'Total drawings: {len(drawings)}')

for i, d in enumerate(drawings):
    r = d['rect']
    # If it's a small drawing (likely icon)
    if 5 < r.width < 40 and 5 < r.height < 40:
        print(f"Icon {i}: rect=({r.x0:.1f}, {r.y0:.1f}, {r.x1:.1f}, {r.y1:.1f}), fill={d.get('fill')}, color={d.get('color')}, items_count={len(d.get('items', []))}")
