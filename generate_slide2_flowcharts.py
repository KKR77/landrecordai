import pymupdf as fitz
import os

def create_slide2_with_flowcharts():
    new_doc = fitz.open()
    new_page = new_doc.new_page(width=960, height=540)

    # 1. Base background
    new_page.draw_rect(fitz.Rect(0, 0, 960, 540), fill=(1, 1, 1), color=None)

    # 2. Top Header Logos
    new_page.insert_image(fitz.Rect(36.0, 16.0, 108.0, 72.0), filename='slide2_img_0_6.png')
    new_page.insert_image(fitz.Rect(780.0, 12.0, 932.0, 84.0), filename='slide2_img_1_140.png')

    # 3. Top Title (Center)
    title_text = "RakshaSetu — A Last-Mile Emergency Communication Layer"
    new_page.insert_text(fitz.Point(198.9, 53.0), title_text, fontname="tibo", fontsize=21.0, color=(0.067, 0.067, 0.067))

    # 4. Subtitle / Diamond
    new_page.insert_text(fitz.Point(36.0, 98.0), "◆", fontname="tibo", fontsize=15.0, color=(0.122, 0.306, 0.475))
    new_page.insert_text(fitz.Point(54.0, 98.0), "Proposed Solution: Bridging the Last-Mile Gap", fontname="tibo", fontsize=16.5, color=(0.122, 0.306, 0.475))
    new_page.insert_text(fitz.Point(54.0, 118.0), "Moving from one-way broadcasting to a two-way, offline-resilient disaster response platform.", fontname="heit", fontsize=10.5, color=(0.322, 0.376, 0.443))

    # 5. Bottom Footer Bar
    new_page.draw_rect(fitz.Rect(0, 510, 960, 540), fill=(0.106, 0.482, 0.769), color=None)
    new_page.insert_text(fitz.Point(416.7, 528.0), "@SIH Idea submission- Template", fontname="hebo", fontsize=10.0, color=(1, 1, 1))
    new_page.insert_text(fitz.Point(931.0, 528.0), "2", fontname="hebo", fontsize=12.0, color=(1, 1, 1))

    # ==========================================
    # COLUMN 1: PROBLEM · GROUND REALITY
    # ==========================================
    c1_rect = fitz.Rect(36.0, 132.0, 321.3, 500.0)
    new_page.draw_rect(c1_rect, fill=(0.996, 0.969, 0.965), color=(0.722, 0.329, 0.314), width=1.0)

    # Header badge
    c1_hdr = fitz.Rect(36.0, 132.0, 321.3, 168.0)
    new_page.draw_rect(c1_hdr, fill=(0.973, 0.808, 0.800), color=(0.722, 0.329, 0.314), width=1.0)
    new_page.insert_text(fitz.Point(48.0, 154.0), "▲", fontname="hebo", fontsize=12.0, color=(0.522, 0.176, 0.161))
    new_page.insert_text(fitz.Point(68.0, 146.0), "PROBLEM · GROUND REALITY", fontname="hebo", fontsize=6.6, color=(0.522, 0.176, 0.161))
    new_page.insert_text(fitz.Point(68.0, 159.0), "The Last-Mile Breakdown", fontname="hebo", fontsize=11.5, color=(0.067, 0.067, 0.067))

    # Bottom banner
    c1_bot = fitz.Rect(43.0, 466.0, 314.3, 494.0)
    new_page.draw_rect(c1_bot, fill=(0.973, 0.808, 0.800), color=(0.722, 0.329, 0.314), width=0.8)
    new_page.insert_text(fitz.Point(49.0, 483.0), "The forecast exists — it just never lands on the phone.", fontname="hebo", fontsize=8.2, color=(0.522, 0.176, 0.161))

    # 5 cascading nodes for Column 1
    c1_items = [
        ("1", "Forecasts fail on the ground", "IMD and CWC issue accurate forecasts, but the warning never reaches the citizen before the network goes down."),
        ("2", "Complete blackout", "Total network collapse leaves people stranded with no digital channel to ask for help on."),
        ("3", "Disaster linguicism", "Emergency instructions are rarely available in the local regional language."),
        ("4", "Panic UI and awareness void", "Complex apps fail under stress. People don't know 'kya karein, kya nahi', or where the nearest shelter is."),
        ("5", "Blind rescue search", "Relief teams enter a zone without GPS coordinates of trapped victims or missing family members.")
    ]

    c1_y_start = 173.0
    c1_card_h = 47.0
    c1_gap = 10.0

    for idx, (num, title, desc) in enumerate(c1_items):
        y0 = c1_y_start + idx * (c1_card_h + c1_gap)
        y1 = y0 + c1_card_h
        card_rect = fitz.Rect(43.0, y0, 314.3, y1)

        # Draw card background
        new_page.draw_rect(card_rect, fill=(1, 1, 1), color=(0.88, 0.75, 0.74), width=0.75)
        # Left accent strip
        new_page.draw_rect(fitz.Rect(43.0, y0, 46.5, y1), fill=(0.82, 0.32, 0.30), color=None)

        # Flowchart Step Badge
        badge_rect = fitz.Rect(51.0, y0 + 5.0, 68.0, y0 + 19.0)
        new_page.draw_rect(badge_rect, fill=(0.97, 0.85, 0.85), color=(0.78, 0.35, 0.33), width=0.6)
        new_page.insert_text(fitz.Point(56.5, y0 + 15.0), num, fontname="hebo", fontsize=8.0, color=(0.55, 0.18, 0.16))

        # Title
        new_page.insert_text(fitz.Point(73.0, y0 + 15.0), title, fontname="hebo", fontsize=8.8, color=(0.08, 0.08, 0.08))

        # Description
        desc_rect = fitz.Rect(51.0, y0 + 20.5, 308.0, y1 - 2.0)
        new_page.insert_textbox(desc_rect, desc, fontname="helv", fontsize=7.2, color=(0.32, 0.38, 0.44), lineheight=1.05)

        # Connector arrow
        if idx < len(c1_items) - 1:
            arrow_x = 178.0
            arrow_y0 = y1 + 1.0
            arrow_y1 = y1 + c1_gap - 1.0
            new_page.draw_line(fitz.Point(arrow_x, arrow_y0), fitz.Point(arrow_x, arrow_y1), color=(0.78, 0.35, 0.33), width=1.0)
            p_tip = fitz.Point(arrow_x, arrow_y1)
            p_left = fitz.Point(arrow_x - 2.5, arrow_y1 - 2.5)
            p_right = fitz.Point(arrow_x + 2.5, arrow_y1 - 2.5)
            new_page.draw_polyline([p_left, p_tip, p_right], color=(0.78, 0.35, 0.33), width=1.0)


    # ==========================================
    # COLUMN 2: SOLUTION · WHAT WE BUILT
    # ==========================================
    c2_rect = fitz.Rect(337.3, 132.0, 622.7, 500.0)
    new_page.draw_rect(c2_rect, fill=(0.969, 0.984, 0.965), color=(0.443, 0.639, 0.380), width=1.0)

    # Header badge
    c2_hdr = fitz.Rect(337.3, 132.0, 622.7, 168.0)
    new_page.draw_rect(c2_hdr, fill=(0.851, 0.918, 0.827), color=(0.443, 0.639, 0.380), width=1.0)
    new_page.insert_text(fitz.Point(349.0, 154.0), "✔", fontname="hebo", fontsize=12.0, color=(0.184, 0.400, 0.169))
    new_page.insert_text(fitz.Point(369.0, 146.0), "SOLUTION · WHAT WE BUILT", fontname="hebo", fontsize=6.6, color=(0.184, 0.400, 0.169))
    new_page.insert_text(fitz.Point(369.0, 159.0), "RakshaSetu PWA Architecture", fontname="hebo", fontsize=11.5, color=(0.067, 0.067, 0.067))

    # Bottom banner
    c2_bot = fitz.Rect(344.3, 466.0, 615.7, 494.0)
    new_page.draw_rect(c2_bot, fill=(0.851, 0.918, 0.827), color=(0.443, 0.639, 0.380), width=0.8)
    new_page.insert_text(fitz.Point(354.0, 483.0), "Runs on low-end phones. No app-store install needed.", fontname="hebo", fontsize=8.2, color=(0.184, 0.400, 0.169))

    c2_items = [
        ("STAGE 1", "Pre-cached offline core", "Installs from a link, no Play Store. Safe zones and verified NDMA guidance are stored on the device in IndexedDB, so the survival content never depends on a server."),
        ("STAGE 2", "Zero-decision SOS", "One tap queues an emergency SMS outbox automatically the moment the internet dies — configured once when calm, used once in panic."),
        ("STAGE 3", "Multilingual voice (Bhashini)", "Voice-first navigation across 22+ regional languages, removing both the language barrier and the literacy barrier."),
        ("STAGE 4", "Shelter map and routes", "Leaflet.js maps with cached shelter data and OSRM routing point straight to the nearest safe zone, online or offline.")
    ]

    c2_y_start = 173.0
    c2_card_h = 60.0
    c2_gap = 13.0

    for idx, (stage, title, desc) in enumerate(c2_items):
        y0 = c2_y_start + idx * (c2_card_h + c2_gap)
        y1 = y0 + c2_card_h
        card_rect = fitz.Rect(344.3, y0, 615.7, y1)

        new_page.draw_rect(card_rect, fill=(1, 1, 1), color=(0.75, 0.86, 0.73), width=0.75)
        new_page.draw_rect(fitz.Rect(344.3, y0, 348.0, y1), fill=(0.33, 0.60, 0.28), color=None)

        stage_w = 48.0
        new_page.draw_rect(fitz.Rect(353.0, y0 + 6.0, 353.0 + stage_w, y0 + 18.0), fill=(0.86, 0.93, 0.84), color=(0.42, 0.65, 0.36), width=0.5)
        new_page.insert_text(fitz.Point(356.5, y0 + 15.0), stage, fontname="hebo", fontsize=6.2, color=(0.18, 0.42, 0.16))

        new_page.insert_text(fitz.Point(353.0 + stage_w + 6.0, y0 + 15.5), title, fontname="hebo", fontsize=9.0, color=(0.08, 0.08, 0.08))

        desc_rect = fitz.Rect(353.0, y0 + 21.0, 608.0, y1 - 2.0)
        new_page.insert_textbox(desc_rect, desc, fontname="helv", fontsize=7.4, color=(0.32, 0.38, 0.44), lineheight=1.08)

        if idx < len(c2_items) - 1:
            arrow_x = 480.0
            arrow_y0 = y1 + 1.0
            arrow_y1 = y1 + c2_gap - 1.0
            new_page.draw_line(fitz.Point(arrow_x, arrow_y0), fitz.Point(arrow_x, arrow_y1), color=(0.35, 0.62, 0.30), width=1.2)
            p_tip = fitz.Point(arrow_x, arrow_y1)
            p_left = fitz.Point(arrow_x - 3.0, arrow_y1 - 3.0)
            p_right = fitz.Point(arrow_x + 3.0, arrow_y1 - 3.0)
            new_page.draw_polyline([p_left, p_tip, p_right], color=(0.35, 0.62, 0.30), width=1.2)


    # ==========================================
    # COLUMN 3: DIFFERENTIATOR · IMPACT
    # ==========================================
    c3_rect = fitz.Rect(638.7, 132.0, 924.0, 500.0)
    new_page.draw_rect(c3_rect, fill=(1.0, 0.988, 0.953), color=(0.839, 0.671, 0.290), width=1.0)

    # Header badge
    c3_hdr = fitz.Rect(638.7, 132.0, 924.0, 168.0)
    new_page.draw_rect(c3_hdr, fill=(1.0, 0.933, 0.769), color=(0.839, 0.671, 0.290), width=1.0)
    new_page.insert_text(fitz.Point(650.0, 154.0), "★", fontname="hebo", fontsize=12.0, color=(0.490, 0.325, 0.063))
    new_page.insert_text(fitz.Point(670.0, 146.0), "DIFFERENTIATOR · IMPACT", fontname="hebo", fontsize=6.6, color=(0.490, 0.325, 0.063))
    new_page.insert_text(fitz.Point(670.0, 159.0), "Why RakshaSetu Stands Out", fontname="hebo", fontsize=11.5, color=(0.067, 0.067, 0.067))

    # Bottom banner
    c3_bot = fitz.Rect(645.7, 466.0, 917.0, 494.0)
    new_page.draw_rect(c3_bot, fill=(1.0, 0.933, 0.769), color=(0.839, 0.671, 0.290), width=0.8)
    new_page.insert_text(fitz.Point(658.0, 483.0), "Complements NDMA's SACHET — it does not replace it.", fontname="hebo", fontsize=8.2, color=(0.490, 0.325, 0.063))

    c3_items = [
        ("PILLAR 1", "Two-way, not one-way", "NDMA's SACHET broadcasts alerts outward and needs a live network to do it. RakshaSetu caches the guidance before the collapse and pushes the citizen's location back out after it — the channel works in both directions."),
        ("PILLAR 2", "Pre-blackout state capture", "Location heartbeats are logged on the device while the network is still alive, so relief teams receive last-known coordinates and a prioritised dispatch list instead of searching blind."),
        ("PILLAR 3", "Zero paid APIs", "Built entirely on public government data — CWC, IMD, ISRO Bhuvan, Bhashini and NDMA — so there is no paid service in the critical path and the recurring platform cost stays at zero.")
    ]

    c3_y_start = 173.0
    c3_card_h = 83.0
    c3_gap = 16.0

    for idx, (pillar, title, desc) in enumerate(c3_items):
        y0 = c3_y_start + idx * (c3_card_h + c3_gap)
        y1 = y0 + c3_card_h
        card_rect = fitz.Rect(645.7, y0, 917.0, y1)

        new_page.draw_rect(card_rect, fill=(1, 1, 1), color=(0.92, 0.85, 0.70), width=0.75)
        new_page.draw_rect(fitz.Rect(645.7, y0, 649.5, y1), fill=(0.84, 0.65, 0.22), color=None)

        pill_w = 48.0
        new_page.draw_rect(fitz.Rect(655.0, y0 + 7.0, 655.0 + pill_w, y0 + 19.0), fill=(1.0, 0.94, 0.82), color=(0.80, 0.62, 0.24), width=0.5)
        new_page.insert_text(fitz.Point(658.0, y0 + 15.5), pillar, fontname="hebo", fontsize=6.2, color=(0.48, 0.32, 0.08))

        new_page.insert_text(fitz.Point(655.0 + pill_w + 6.0, y0 + 16.0), title, fontname="hebo", fontsize=9.0, color=(0.08, 0.08, 0.08))

        desc_rect = fitz.Rect(655.0, y0 + 23.0, 909.0, y1 - 3.0)
        new_page.insert_textbox(desc_rect, desc, fontname="helv", fontsize=7.4, color=(0.32, 0.38, 0.44), lineheight=1.1)

        if idx < len(c3_items) - 1:
            arrow_x = 781.0
            arrow_y0 = y1 + 1.0
            arrow_y1 = y1 + c3_gap - 1.0
            new_page.draw_line(fitz.Point(arrow_x, arrow_y0), fitz.Point(arrow_x, arrow_y1), color=(0.80, 0.62, 0.24), width=1.2)
            p_tip = fitz.Point(arrow_x, arrow_y1)
            p_left = fitz.Point(arrow_x - 3.0, arrow_y1 - 3.0)
            p_right = fitz.Point(arrow_x + 3.0, arrow_y1 - 3.0)
            new_page.draw_polyline([p_left, p_tip, p_right], color=(0.80, 0.62, 0.24), width=1.2)

    # Save preview image
    pix = new_page.get_pixmap(dpi=200)
    pix.save('page2_flowchart_preview.png')
    print('Generated page2_flowchart_preview.png')

    new_doc.save('slide2_flowchart.pdf')
    print('Generated slide2_flowchart.pdf')

if __name__ == '__main__':
    create_slide2_with_flowcharts()
