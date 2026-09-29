import fitz

doc = fitz.open(r'C:\Users\chand\Downloads\Telegram Desktop\vik GECM final.pdf')
page = doc[1]

print('=== DRAWINGS ===')
for i, d in enumerate(page.get_drawings()):
    rect = d['rect']
    if rect.width > 10 and rect.height > 10:
        fill = d.get('fill')
        color = d.get('color')
        print(f"{i}: rect=({rect.x0:.1f}, {rect.y0:.1f}, {rect.x1:.1f}, {rect.y1:.1f}), fill={fill}, stroke={color}")

print('\n=== TEXT SPANS ===')
blocks = page.get_text('dict')['blocks']
for b in blocks:
    if 'lines' in b:
        for l in b['lines']:
            for s in l['spans']:
                c = s['color']
                print(f"{s['bbox'][0]:.1f}, {s['bbox'][1]:.1f} | font={s['font']}, size={s['size']:.1f}, color=#{c:06x} | {s['text']}")
