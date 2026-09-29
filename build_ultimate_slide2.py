import pymupdf as fitz
import math

def build_ultimate_slide2():
    doc = fitz.open()
    page = doc.new_page(width=960, height=540)

    # Register TrueType fonts from Windows
    font_times_bold = "C:/Windows/Fonts/timesbd.ttf"
    font_times = "C:/Windows/Fonts/times.ttf"
    font_arial_bold = "C:/Windows/Fonts/arialbd.ttf"
    font_arial = "C:/Windows/Fonts/arial.ttf"
    font_arial_italic = "C:/Windows/Fonts/ariali.ttf"

    page.insert_font(fontname="F_TimesBold", fontfile=font_times_bold)
    page.insert_font(fontname="F_Times", fontfile=font_times)
    page.insert_font(fontname="F_ArialBold", fontfile=font_arial_bold)
    page.insert_font(fontname="F_Arial", fontfile=font_arial)
    page.insert_font(fontname="F_ArialItalic", fontfile=font_arial_italic)

    # 1. Base White Background
    page.draw_rect(fitz.Rect(0, 0, 960, 540), fill=(1, 1, 1), color=None)

    # 2. Header Logos
    # Left: ResQNova Logo
    page.insert_image(fitz.Rect(36.0, 16.0, 105.2, 71.0), filename='real_resqnova_logo.png')
    # Right: SIH Logo
    page.insert_image(fitz.Rect(780.0, 11.25, 931.5, 83.25), filename='real_sih_logo.png')

    # 3. Main Title (Center)
    title_text = "RakshaSetu \u2014 A Last-Mile Emergency Communication Layer"
    page.insert_text(fitz.Point(198.9, 53.0), title_text, fontname="F_TimesBold", fontsize=21.0, color=(0.067, 0.067, 0.067))

    # 4. Subheading & Diamond
    # Vector diamond ◆
    d_center_x, d_center_y = 42.0, 93.5
    d_w, d_h = 5.5, 6.5
    page.draw_polyline([
        fitz.Point(d_center_x, d_center_y - d_h),
        fitz.Point(d_center_x + d_w, d_center_y),
        fitz.Point(d_center_x, d_center_y + d_h),
        fitz.Point(d_center_x - d_w, d_center_y)
    ], fill=(0.122, 0.306, 0.475), color=None, closePath=True)

    page.insert_text(fitz.Point(54.0, 98.0), "Proposed Solution: Bridging the Last-Mile Gap", fontname="F_TimesBold", fontsize=16.5, color=(0.122, 0.306, 0.475))
    page.insert_text(fitz.Point(54.0, 118.0), "Moving from one-way broadcasting to a two-way, offline-resilient disaster response platform.", fontname="F_ArialItalic", fontsize=10.5, color=(0.322, 0.376, 0.443))

    # 5. Bottom Footer Bar
    page.draw_rect(fitz.Rect(0, 510, 960, 540), fill=(0.106, 0.482, 0.769), color=None)
    page.insert_text(fitz.Point(416.7, 528.0), "@SIH Idea submission- Template", fontname="F_ArialBold", fontsize=10.0, color=(1, 1, 1))
    page.insert_text(fitz.Point(931.0, 528.0), "2", fontname="F_ArialBold", fontsize=12.0, color=(1, 1, 1))

    # Helper function for vector icons
    def draw_warning_triangle(cx, cy, size, color):
        h = size * 0.866
        page.draw_polyline([
            fitz.Point(cx, cy - h/2 - 1),
            fitz.Point(cx + size/2, cy + h/2),
            fitz.Point(cx - size/2, cy + h/2)
        ], fill=None, color=color, width=1.3, closePath=True)
        # Exclamation inside
        page.draw_line(fitz.Point(cx, cy - 2), fitz.Point(cx, cy + 2), color=color, width=1.2)
        page.draw_rect(fitz.Rect(cx-0.6, cy + 3.5, cx+0.6, cy + 4.7), fill=color, color=None)

    def draw_shield_check(cx, cy, size, color):
        page.draw_polyline([
            fitz.Point(cx - 5.5, cy - 6),
            fitz.Point(cx + 5.5, cy - 6),
            fitz.Point(cx + 5.5, cy),
            fitz.Point(cx, cy + 6.5),
            fitz.Point(cx - 5.5, cy),
            fitz.Point(cx - 5.5, cy - 6)
        ], color=color, width=1.2, closePath=True)
        page.draw_polyline([
            fitz.Point(cx - 3.0, cy),
            fitz.Point(cx - 0.5, cy + 2.5),
            fitz.Point(cx + 3.5, cy - 2.0)
        ], color=color, width=1.3)

    def draw_star(cx, cy, r, color):
        points = []
        for i in range(10):
            radius = r if i % 2 == 0 else r * 0.45
            angle = i * math.pi / 5 - math.pi / 2
            points.append(fitz.Point(cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
        page.draw_polyline(points, fill=color, color=None, closePath=True)

    def draw_flow_arrow(x, y0, y1, color, label=None):
        page.draw_line(fitz.Point(x, y0), fitz.Point(x, y1), color=color, width=1.1)
        p_tip = fitz.Point(x, y1)
        p_left = fitz.Point(x - 2.8, y1 - 3.2)
        p_right = fitz.Point(x + 2.8, y1 - 3.2)
        page.draw_polyline([p_left, p_tip, p_right], color=color, width=1.2)

        if label:
            tw = len(label) * 4.0 + 8
            page.draw_rect(fitz.Rect(x - tw/2, y0 + (y1-y0)/2 - 4.5, x + tw/2, y0 + (y1-y0)/2 + 4.5), fill=(1,1,1), color=color, width=0.5)
            page.insert_text(fitz.Point(x - tw/2 + 4, y0 + (y1-y0)/2 + 3.0), label, fontname="F_ArialBold", fontsize=5.5, color=color)


    # =========================================================================
    # COLUMN 1: PROBLEM · GROUND REALITY (Flowchart of Ground Breakdown)
    # =========================================================================
    c1_bg = (0.996, 0.969, 0.965)
    c1_border = (0.722, 0.329, 0.314)
    c1_hdr_bg = (0.973, 0.808, 0.800)
    c1_accent = (0.522, 0.176, 0.161)
    c1_card_border = (0.88, 0.74, 0.73)

    page.draw_rect(fitz.Rect(36.0, 132.0, 321.3, 500.0), fill=c1_bg, color=c1_border, width=1.0)
    page.draw_rect(fitz.Rect(36.0, 132.0, 321.3, 168.0), fill=c1_hdr_bg, color=c1_border, width=1.0)
    draw_warning_triangle(54.0, 150.0, 13.0, c1_accent)
    page.insert_text(fitz.Point(68.0, 146.0), "PROBLEM \u00b7 GROUND REALITY", fontname="F_ArialBold", fontsize=6.6, color=c1_accent)
    page.insert_text(fitz.Point(68.0, 159.0), "The Last-Mile Breakdown", fontname="F_ArialBold", fontsize=11.5, color=(0.067, 0.067, 0.067))

    # Bottom banner
    page.draw_rect(fitz.Rect(43.0, 466.0, 314.3, 494.0), fill=c1_hdr_bg, color=c1_border, width=0.8)
    page.insert_text(fitz.Point(49.0, 483.0), "The forecast exists \u2014 it just never lands on the phone.", fontname="F_ArialBold", fontsize=8.4, color=c1_accent)

    c1_nodes = [
        ("01", "Forecasts fail on the ground", "IMD and CWC issue accurate forecasts, but the warning never reaches the citizen before the network goes down."),
        ("02", "Complete blackout", "Total network collapse leaves people stranded with no digital channel to ask for help on."),
        ("03", "Disaster linguicism", "Emergency instructions are rarely available in the local regional language."),
        ("04", "Panic UI and awareness void", "Complex apps fail under stress. People don't know 'kya karein, kya nahi', or where the nearest shelter is."),
        ("05", "Blind rescue search", "Relief teams enter a zone without GPS coordinates of trapped victims or missing family members.")
    ]

    c1_y_start = 173.0
    c1_card_h = 47.5
    c1_gap = 10.0

    for idx, (num_str, title, desc) in enumerate(c1_nodes):
        y0 = c1_y_start + idx * (c1_card_h + c1_gap)
        y1 = y0 + c1_card_h
        card_rect = fitz.Rect(43.0, y0, 314.3, y1)

        page.draw_rect(card_rect, fill=(1, 1, 1), color=c1_card_border, width=0.75)
        page.draw_rect(fitz.Rect(43.0, y0, 46.5, y1), fill=(0.82, 0.30, 0.28), color=None)

        badge_w = 20.0
        page.draw_rect(fitz.Rect(51.0, y0 + 5.0, 51.0 + badge_w, y0 + 17.5), fill=(0.97, 0.85, 0.85), color=(0.78, 0.35, 0.33), width=0.5)
        page.insert_text(fitz.Point(54.0, y0 + 14.5), num_str, fontname="F_ArialBold", fontsize=7.2, color=(0.55, 0.18, 0.16))

        page.insert_text(fitz.Point(51.0 + badge_w + 6.0, y0 + 15.0), title, fontname="F_ArialBold", fontsize=8.8, color=(0.08, 0.08, 0.08))

        desc_rect = fitz.Rect(51.0, y0 + 20.5, 308.0, y1 - 2.0)
        page.insert_textbox(desc_rect, desc, fontname="F_Arial", fontsize=7.2, color=(0.32, 0.38, 0.44), lineheight=1.05)

        if idx < len(c1_nodes) - 1:
            draw_flow_arrow(178.0, y1 + 1.0, y1 + c1_gap - 1.0, (0.78, 0.35, 0.33))


    # =========================================================================
    # COLUMN 2: SOLUTION · WHAT WE BUILT (RakshaSetu PWA Architecture Pipeline)
    # =========================================================================
    c2_bg = (0.969, 0.984, 0.965)
    c2_border = (0.443, 0.639, 0.380)
    c2_hdr_bg = (0.851, 0.918, 0.827)
    c2_accent = (0.184, 0.400, 0.169)
    c2_card_border = (0.75, 0.86, 0.73)

    page.draw_rect(fitz.Rect(337.3, 132.0, 622.7, 500.0), fill=c2_bg, color=c2_border, width=1.0)
    page.draw_rect(fitz.Rect(337.3, 132.0, 622.7, 168.0), fill=c2_hdr_bg, color=c2_border, width=1.0)
    draw_shield_check(355.0, 150.0, 14.0, c2_accent)
    page.insert_text(fitz.Point(369.0, 146.0), "SOLUTION \u00b7 WHAT WE BUILT", fontname="F_ArialBold", fontsize=6.6, color=c2_accent)
    page.insert_text(fitz.Point(369.0, 159.0), "RakshaSetu PWA Architecture", fontname="F_ArialBold", fontsize=11.5, color=(0.067, 0.067, 0.067))

    page.draw_rect(fitz.Rect(344.3, 466.0, 615.7, 494.0), fill=c2_hdr_bg, color=c2_border, width=0.8)
    page.insert_text(fitz.Point(354.0, 483.0), "Runs on low-end phones. No app-store install needed.", fontname="F_ArialBold", fontsize=8.4, color=c2_accent)

    c2_nodes = [
        ("STAGE 1", "Pre-cached offline core", "Installs from a link, no Play Store. Safe zones and verified NDMA guidance are stored on the device in IndexedDB, so the survival content never depends on a server."),
        ("STAGE 2", "Zero-decision SOS", "One tap queues an emergency SMS outbox automatically the moment the internet dies \u2014 configured once when calm, used once in panic."),
        ("STAGE 3", "Multilingual voice (Bhashini)", "Voice-first navigation across 22+ regional languages, removing both the language barrier and the literacy barrier."),
        ("STAGE 4", "Shelter map and routes", "Leaflet.js maps with cached shelter data and OSRM routing point straight to the nearest safe zone, online or offline.")
    ]

    c2_y_start = 173.0
    c2_card_h = 60.0
    c2_gap = 13.0

    for idx, (stage_lbl, title, desc) in enumerate(c2_nodes):
        y0 = c2_y_start + idx * (c2_card_h + c2_gap)
        y1 = y0 + c2_card_h
        card_rect = fitz.Rect(344.3, y0, 615.7, y1)

        page.draw_rect(card_rect, fill=(1, 1, 1), color=c2_card_border, width=0.75)
        page.draw_rect(fitz.Rect(344.3, y0, 348.0, y1), fill=(0.33, 0.60, 0.28), color=None)

        badge_w = 46.0
        page.draw_rect(fitz.Rect(353.0, y0 + 6.0, 353.0 + badge_w, y0 + 18.0), fill=(0.86, 0.93, 0.84), color=(0.42, 0.65, 0.36), width=0.5)
        page.insert_text(fitz.Point(356.0, y0 + 15.0), stage_lbl, fontname="F_ArialBold", fontsize=6.2, color=(0.18, 0.42, 0.16))

        page.insert_text(fitz.Point(353.0 + badge_w + 6.0, y0 + 15.5), title, fontname="F_ArialBold", fontsize=9.0, color=(0.08, 0.08, 0.08))

        desc_rect = fitz.Rect(353.0, y0 + 21.0, 608.0, y1 - 2.0)
        page.insert_textbox(desc_rect, desc, fontname="F_Arial", fontsize=7.4, color=(0.32, 0.38, 0.44), lineheight=1.08)

        if idx < len(c2_nodes) - 1:
            draw_flow_arrow(480.0, y1 + 1.0, y1 + c2_gap - 1.0, (0.35, 0.62, 0.30))


    # =========================================================================
    # COLUMN 3: DIFFERENTIATOR · IMPACT (Why RakshaSetu Stands Out)
    # =========================================================================
    c3_bg = (1.0, 0.988, 0.953)
    c3_border = (0.839, 0.671, 0.290)
    c3_hdr_bg = (1.0, 0.933, 0.769)
    c3_accent = (0.490, 0.325, 0.063)
    c3_card_border = (0.92, 0.85, 0.70)

    page.draw_rect(fitz.Rect(638.7, 132.0, 924.0, 500.0), fill=c3_bg, color=c3_border, width=1.0)
    page.draw_rect(fitz.Rect(638.7, 132.0, 924.0, 168.0), fill=c3_hdr_bg, color=c3_border, width=1.0)
    draw_star(656.0, 150.0, 7.0, c3_accent)
    page.insert_text(fitz.Point(670.0, 146.0), "DIFFERENTIATOR \u00b7 IMPACT", fontname="F_ArialBold", fontsize=6.6, color=c3_accent)
    page.insert_text(fitz.Point(670.0, 159.0), "Why RakshaSetu Stands Out", fontname="F_ArialBold", fontsize=11.5, color=(0.067, 0.067, 0.067))

    page.draw_rect(fitz.Rect(645.7, 466.0, 917.0, 494.0), fill=c3_hdr_bg, color=c3_border, width=0.8)
    page.insert_text(fitz.Point(658.0, 483.0), "Complements NDMA's SACHET \u2014 it does not replace it.", fontname="F_ArialBold", fontsize=8.4, color=c3_accent)

    c3_nodes = [
        ("PILLAR 1", "Two-way, not one-way", "NDMA's SACHET broadcasts alerts outward and needs a live network to do it. RakshaSetu caches the guidance before the collapse and pushes the citizen's location back out after it \u2014 the channel works in both directions."),
        ("PILLAR 2", "Pre-blackout state capture", "Location heartbeats are logged on the device while the network is still alive, so relief teams receive last-known coordinates and a prioritised dispatch list instead of searching blind."),
        ("PILLAR 3", "Zero paid APIs", "Built entirely on public government data \u2014 CWC, IMD, ISRO Bhuvan, Bhashini and NDMA \u2014 so there is no paid service in the critical path and the recurring platform cost stays at zero.")
    ]

    c3_y_start = 173.0
    c3_card_h = 83.0
    c3_gap = 16.0

    for idx, (pillar_lbl, title, desc) in enumerate(c3_nodes):
        y0 = c3_y_start + idx * (c3_card_h + c3_gap)
        y1 = y0 + c3_card_h
        card_rect = fitz.Rect(645.7, y0, 917.0, y1)

        page.draw_rect(card_rect, fill=(1, 1, 1), color=c3_card_border, width=0.75)
        page.draw_rect(fitz.Rect(645.7, y0, 649.5, y1), fill=(0.84, 0.65, 0.22), color=None)

        badge_w = 46.0
        page.draw_rect(fitz.Rect(655.0, y0 + 7.0, 655.0 + badge_w, y0 + 19.0), fill=(1.0, 0.94, 0.82), color=(0.80, 0.62, 0.24), width=0.5)
        page.insert_text(fitz.Point(658.0, y0 + 15.5), pillar_lbl, fontname="F_ArialBold", fontsize=6.2, color=(0.48, 0.32, 0.08))

        page.insert_text(fitz.Point(655.0 + badge_w + 6.0, y0 + 16.0), title, fontname="F_ArialBold", fontsize=9.0, color=(0.08, 0.08, 0.08))

        desc_rect = fitz.Rect(655.0, y0 + 23.0, 909.0, y1 - 3.0)
        page.insert_textbox(desc_rect, desc, fontname="F_Arial", fontsize=7.4, color=(0.32, 0.38, 0.44), lineheight=1.1)

        if idx < len(c3_nodes) - 1:
            draw_flow_arrow(781.0, y1 + 1.0, y1 + c3_gap - 1.0, (0.80, 0.62, 0.24))

    # Save preview image
    pix = page.get_pixmap(dpi=200)
    pix.save('page2_flowchart_v3.png')
    print('Generated page2_flowchart_v3.png')

    doc.save('slide2_flowchart_v3.pdf')
    print('Generated slide2_flowchart_v3.pdf')

if __name__ == '__main__':
    build_ultimate_slide2()
