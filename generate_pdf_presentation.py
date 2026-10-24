#!/usr/bin/env python3
"""
Egor Baklykov - AI Generative Art & Imagery Portfolio
Executive 16:9 PDF Presentation Deck for Work Partners & Clients
-----------------------------------------------------------------
Generates a polished, client-ready 16:9 widescreen PDF presentation.
Includes circular avatar masking, interactive live links, multi-model
badges, and domain breakdowns.
"""

import os
import json
import re
from PIL import Image, ImageDraw

from reportlab.lib.pagesizes import landscape
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

# ----------------------------------------------------------------------
# 1. PAGE SETUP & CONSTANTS
# ----------------------------------------------------------------------
SLIDE_WIDTH = 960.0    # 16:9 Widescreen (points)
SLIDE_HEIGHT = 540.0   # 16:9 Widescreen (points)
PAGE_SIZE = (SLIDE_WIDTH, SLIDE_HEIGHT)

# Design System Colors
BG_DARK = colors.HexColor("#0B0D13")
BG_SURFACE = colors.HexColor("#131823")
BG_CARD = colors.HexColor("#171D2B")
BG_CARD_LIGHT = colors.HexColor("#1E2638")
BORDER_SUBTLE = colors.HexColor("#263147")
BORDER_ACCENT = colors.HexColor("#38BDF8")

TEXT_PRIMARY = colors.HexColor("#F8FAFC")
TEXT_SECONDARY = colors.HexColor("#CBD5E1")
TEXT_MUTED = colors.HexColor("#94A3B8")
ACCENT_CYAN = colors.HexColor("#38BDF8")
ACCENT_PURPLE = colors.HexColor("#A855F7")
ACCENT_EMERALD = colors.HexColor("#10B981")
ACCENT_AMBER = colors.HexColor("#F59E0B")

MODEL_COLORS = {
    "Midjourney": {"text": colors.HexColor("#C084FC"), "bg": colors.HexColor("#3B1B54"), "border": colors.HexColor("#A855F7")},
    "ChatGPT": {"text": colors.HexColor("#34D399"), "bg": colors.HexColor("#064E3B"), "border": colors.HexColor("#10B981")},
    "NanoBanana": {"text": colors.HexColor("#FBBF24"), "bg": colors.HexColor("#5A3606"), "border": colors.HexColor("#F59E0B")},
    "ComfyUI": {"text": colors.HexColor("#FB7185"), "bg": colors.HexColor("#541324"), "border": colors.HexColor("#F43F5E")},
    "Default": {"text": colors.HexColor("#38BDF8"), "bg": colors.HexColor("#0C4A6E"), "border": colors.HexColor("#0284C7")}
}

# Register Fonts
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"

try:
    if os.path.exists("C:/Windows/Fonts/segoeui.ttf") and os.path.exists("C:/Windows/Fonts/segoeuib.ttf"):
        pdfmetrics.registerFont(TTFont("SegoeUI", "C:/Windows/Fonts/segoeui.ttf"))
        pdfmetrics.registerFont(TTFont("SegoeUI-Bold", "C:/Windows/Fonts/segoeuib.ttf"))
        FONT_REGULAR = "SegoeUI"
        FONT_BOLD = "SegoeUI-Bold"
        if os.path.exists("C:/Windows/Fonts/segoeuii.ttf"):
            pdfmetrics.registerFont(TTFont("SegoeUI-Italic", "C:/Windows/Fonts/segoeuii.ttf"))
            FONT_ITALIC = "SegoeUI-Italic"
except Exception as e:
    print(f"Using default fonts: {e}")

# ----------------------------------------------------------------------
# 2. IMAGE CACHING & OPTIMIZATION (For Email-Friendly High-Res PDF)
# ----------------------------------------------------------------------
CACHE_DIR = "_pdf_asset_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

def ensure_circular_avatar(src_path="assets/EB_avatar_office.png", dst_path="assets/EB_avatar_circle.png"):
    """Creates a precision circular-masked avatar PNG with anti-aliasing."""
    if os.path.exists(dst_path):
        return dst_path
    if not os.path.exists(src_path):
        return None
    try:
        with Image.open(src_path) as img:
            img = img.convert("RGBA")
            size = min(img.size)
            left = (img.width - size) // 2
            top = (img.height - size) // 2
            img = img.crop((left, top, left + size, top + size))
            
            # 4x supersampling for ultra smooth circular edge
            scale = 4
            mask = Image.new('L', (size * scale, size * scale), 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, size * scale, size * scale), fill=255)
            mask = mask.resize((size, size), Image.Resampling.LANCZOS)
            
            output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            output.paste(img, (0, 0), mask=mask)
            output.save(dst_path, "PNG")
            return dst_path
    except Exception as e:
        print(f"Could not generate circular avatar: {e}")
        return src_path

def get_optimized_image(img_path, max_dim=1400, quality=92):
    """Optimizes PNG/JPG images for crisp presentation at optimal file size."""
    if not os.path.exists(img_path):
        return None
    
    base_name = os.path.splitext(os.path.basename(img_path))[0]
    out_path = os.path.join(CACHE_DIR, f"{base_name}_opt.jpg")
    
    if os.path.exists(out_path):
        return out_path
    
    try:
        with Image.open(img_path) as img:
            if img.mode in ("RGBA", "LA", "P"):
                rgb_img = Image.new("RGB", img.size, (11, 13, 19))
                if img.mode == "RGBA":
                    rgb_img.paste(img, mask=img.split()[3])
                else:
                    rgb_img.paste(img.convert("RGBA"), mask=img.convert("RGBA").split()[3])
            else:
                rgb_img = img.convert("RGB")
            
            if rgb_img.width > max_dim or rgb_img.height > max_dim:
                rgb_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                
            rgb_img.save(out_path, "JPEG", quality=quality, optimize=True)
            return out_path
    except Exception as e:
        print(f"Error optimizing {img_path}: {e}")
        return img_path

# ----------------------------------------------------------------------
# 3. DRAWING PRIMITIVES & HELPERS
# ----------------------------------------------------------------------
def draw_rounded_rect(c, x, y, width, height, radius=6, fill_color=None, stroke_color=None, stroke_width=1):
    c.saveState()
    if fill_color:
        c.setFillColor(fill_color)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.setLineWidth(stroke_width)
    else:
        c.setLineWidth(0)
        c.setStrokeColor(colors.transparent)
    
    c.roundRect(x, y, width, height, radius, fill=1 if fill_color else 0, stroke=1 if stroke_color else 0)
    c.restoreState()

def draw_pill_badge(c, text, x, y, model_key="Default", font_size=7.5, pad_x=6, pad_y=2.5):
    style = MODEL_COLORS.get(model_key, MODEL_COLORS["Default"])
    c.saveState()
    c.setFont(FONT_BOLD, font_size)
    text_width = c.stringWidth(text, FONT_BOLD, font_size)
    badge_width = text_width + pad_x * 2
    badge_height = font_size + pad_y * 2
    
    draw_rounded_rect(c, x, y, badge_width, badge_height, radius=badge_height/2, fill_color=style["bg"], stroke_color=style["border"], stroke_width=0.75)
    
    c.setFillColor(style["text"])
    c.drawString(x + pad_x, y + pad_y + 1, text)
    c.restoreState()
    return badge_width

def draw_standard_slide_frame(c, page_num, total_pages, category_tag="PORTFOLIO OVERVIEW"):
    # Base background
    c.setFillColor(BG_DARK)
    c.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, fill=1, stroke=0)
    
    c.saveState()
    c.setStrokeColor(colors.HexColor("#1A2333"))
    c.setLineWidth(0.5)
    c.line(0, SLIDE_HEIGHT - 45, SLIDE_WIDTH, SLIDE_HEIGHT - 45)
    c.line(0, 32, SLIDE_WIDTH, 32)
    
    # Header
    c.setFont(FONT_BOLD, 9)
    c.setFillColor(ACCENT_CYAN)
    c.drawString(36, SLIDE_HEIGHT - 32, "EGOR BAKLYKOV")
    
    c.setFont(FONT_REGULAR, 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(135, SLIDE_HEIGHT - 32, "•   AI GENERATIVE ART & CONCEPT IMAGERY PORTFOLIO")
    
    # Category tag in header (right aligned)
    c.setFont(FONT_BOLD, 8.5)
    c.setFillColor(TEXT_SECONDARY)
    c.drawRightString(SLIDE_WIDTH - 90, SLIDE_HEIGHT - 32, category_tag.upper())
    
    # Slide Number pill
    draw_rounded_rect(c, SLIDE_WIDTH - 75, SLIDE_HEIGHT - 37, 40, 15, radius=7.5, fill_color=BG_CARD, stroke_color=BORDER_SUBTLE, stroke_width=0.8)
    c.setFont(FONT_BOLD, 7.5)
    c.setFillColor(ACCENT_CYAN)
    c.drawCentredString(SLIDE_WIDTH - 55, SLIDE_HEIGHT - 33, f"{page_num} / {total_pages}")
    
    # Footer
    c.setFont(FONT_REGULAR, 8)
    c.setFillColor(TEXT_MUTED)
    c.drawString(36, 17, "LinkedIn: linkedin.com/in/egorbaklykov   |   Email: jegor.baklykov@gmail.com")
    c.drawRightString(SLIDE_WIDTH - 36, 17, "Commercial Partner Presentation  •  Confidential")
    c.restoreState()

def fit_image_dimensions(orig_w, orig_h, max_w, max_h):
    ratio = min(max_w / orig_w, max_h / orig_h)
    return orig_w * ratio, orig_h * ratio

# ----------------------------------------------------------------------
# 4. SLIDE BUILDERS
# ----------------------------------------------------------------------

def build_cover_slide(c, page_num, total_pages, works_count=25):
    c.setFillColor(BG_DARK)
    c.rect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, fill=1, stroke=0)
    
    lighthouse_img = get_optimized_image("images/environment_coastal-lighthouse_01.jpg", max_dim=1600)
    if lighthouse_img and os.path.exists(lighthouse_img):
        c.saveState()
        c.drawImage(lighthouse_img, 360, 0, width=600, height=SLIDE_HEIGHT, preserveAspectRatio=True, anchor='c')
        
        # Soft dark gradient overlays
        for i in range(120):
            alpha = (120 - i) / 120.0
            c.setFillColor(colors.Color(11/255, 13/255, 19/255, alpha=min(1.0, alpha * 1.3)))
            c.rect(360 + i * 2.5, 0, 3, SLIDE_HEIGHT, fill=1, stroke=0)
        
        c.setFillColor(colors.Color(11/255, 13/255, 19/255, alpha=0.45))
        c.rect(360, 0, 600, SLIDE_HEIGHT, fill=1, stroke=0)
        c.restoreState()
    
    left_x = 48
    
    # Circular Masked Avatar
    circle_avatar_path = ensure_circular_avatar("assets/EB_avatar_office.png", "assets/EB_avatar_circle.png")
    if circle_avatar_path and os.path.exists(circle_avatar_path):
        c.saveState()
        # Dark circular backing
        c.setFillColor(BG_CARD)
        c.circle(left_x + 30, SLIDE_HEIGHT - 90, 30, fill=1, stroke=0)
        # Circular masked avatar image
        c.drawImage(circle_avatar_path, left_x, SLIDE_HEIGHT - 120, width=60, height=60, mask='auto')
        # Crisp cyan glowing ring outline
        c.setStrokeColor(ACCENT_CYAN)
        c.setLineWidth(1.8)
        c.circle(left_x + 30, SLIDE_HEIGHT - 90, 30, fill=0, stroke=1)
        c.restoreState()
    
    # Header text
    c.setFont(FONT_BOLD, 11)
    c.setFillColor(ACCENT_CYAN)
    c.drawString(left_x + 72, SLIDE_HEIGHT - 85, "EGOR BAKLYKOV")
    
    c.setFont(FONT_REGULAR, 9)
    c.setFillColor(TEXT_MUTED)
    c.drawString(left_x + 72, SLIDE_HEIGHT - 100, "AI Artist & Generative Imagery Specialist")
    
    # Main Title
    c.setFont(FONT_BOLD, 30)
    c.setFillColor(TEXT_PRIMARY)
    c.drawString(left_x, SLIDE_HEIGHT - 170, "Generative Imagery")
    c.drawString(left_x, SLIDE_HEIGHT - 208, "& AI Art Showcase")
    
    # Subtitle pill
    draw_rounded_rect(c, left_x, SLIDE_HEIGHT - 245, 340, 24, radius=12, fill_color=colors.HexColor("#1A2338"), stroke_color=colors.HexColor("#2B3D5E"), stroke_width=1)
    c.setFont(FONT_BOLD, 9)
    c.setFillColor(ACCENT_CYAN)
    c.drawString(left_x + 14, SLIDE_HEIGHT - 236, "EXECUTIVE PORTFOLIO  •  COMMERCIAL & CONCEPTUAL")
    
    intro_p = Paragraph(
        "A curated presentation of generative AI concepts, production-ready 3D miniatures, photorealistic hardware visualizations, cinematic environments, and stylized characters.<br/><br/>"
        "Designed to demonstrate pipeline orchestration, prompt engineering fidelity, and creative capabilities for commercial work partners.",
        ParagraphStyle("CoverIntro", fontName=FONT_REGULAR, fontSize=9.5, leading=14, textColor=TEXT_SECONDARY)
    )
    intro_p.wrapOn(c, 420, 100)
    intro_p.drawOn(c, left_x, SLIDE_HEIGHT - 335)
    
    # Supported AI Models Row
    c.setFont(FONT_BOLD, 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(left_x, SLIDE_HEIGHT - 365, "GENERATIVE ENGINES:")
    
    bx = left_x + 120
    for model in ["Midjourney", "ChatGPT", "NanoBanana", "ComfyUI"]:
        w = draw_pill_badge(c, model, bx, SLIDE_HEIGHT - 373, model_key=model, font_size=8, pad_x=8, pad_y=3)
        bx += w + 8
    
    metrics = [
        ("25", "Curated Artworks"),
        ("5", "Thematic Domains"),
        ("100%", "Pure AI Pipelines")
    ]
    mx = left_x
    for val, lbl in metrics:
        draw_rounded_rect(c, mx, 65, 125, 48, radius=8, fill_color=BG_SURFACE, stroke_color=BORDER_SUBTLE, stroke_width=0.8)
        c.setFont(FONT_BOLD, 15)
        c.setFillColor(ACCENT_CYAN)
        c.drawString(mx + 12, 92, val)
        c.setFont(FONT_REGULAR, 7.5)
        c.setFillColor(TEXT_MUTED)
        c.drawString(mx + 12, 75, lbl)
        mx += 135
    
    c.setFont(FONT_REGULAR, 8)
    c.setFillColor(TEXT_MUTED)
    c.drawString(left_x, 26, "Contact: jegor.baklykov@gmail.com   |   LinkedIn: linkedin.com/in/egorbaklykov")
    c.drawRightString(SLIDE_WIDTH - 48, 26, f"Slide 1 / {total_pages}")


def build_overview_slide(c, page_num, total_pages):
    draw_standard_slide_frame(c, page_num, total_pages, category_tag="CAPABILITIES & PIPELINE")
    
    c.setFont(FONT_BOLD, 20)
    c.setFillColor(TEXT_PRIMARY)
    c.drawString(48, SLIDE_HEIGHT - 80, "Capabilities, Specializations & AI Workflow")
    
    c.setFont(FONT_REGULAR, 10)
    c.setFillColor(TEXT_MUTED)
    c.drawString(48, SLIDE_HEIGHT - 98, "High-fidelity generative pipelines tailored for production-grade concept art and commercial creative needs.")
    
    cards_data = [
        {
            "title": "01. Creative Domains",
            "accent": ACCENT_CYAN,
            "items": [
                ("3D Printable Miniatures", "High-detail resin figurine sculpts with clean edge definitions and hard surfaces."),
                ("Product & Hardware", "Photorealistic consumer electronics, tactile clickers, and microchip PCBs."),
                ("Characters & Fashion", "Studio daylight photography, fabric micro-textures, and high-fashion portraiture."),
                ("Sci-Fi & Environments", "Cinematic space modules, atmospheric landscapes, and worldbuilding concepts.")
            ]
        },
        {
            "title": "02. AI Pipelines & Tooling",
            "accent": ACCENT_PURPLE,
            "items": [
                ("Midjourney v6 & Niji", "Aesthetic composition, hyper-detailed textures, and evocative cinematic lighting."),
                ("ChatGPT Concepting", "Rapid prompt ideation, iterative composition logic, and stylized asset synthesis."),
                ("NanoBanana Rendering", "Tailored model tuning, experimental character design, and expressive palettes."),
                ("ComfyUI Node Graphs", "Modular multi-pass generation, LoRA integration, ControlNet, and 4K upscaling.")
            ]
        },
        {
            "title": "03. Value for Work Partners",
            "accent": ACCENT_EMERALD,
            "items": [
                ("Rapid Prototyping", "Compress weeks of initial visual concepting into agile, 24-hour iteration cycles."),
                ("Production-Ready", "Outputs designed for downstream 3D modeling, game asset rigging, and print."),
                ("Custom Embeddings", "Cohesive character and style consistency across extensive multi-asset batches."),
                ("Commercial Rights", "Full pipeline clarity with transparent model attribution and prompt archives.")
            ]
        }
    ]
    
    card_w = 276
    card_h = 340
    start_x = 48
    start_y = 52
    
    for i, card in enumerate(cards_data):
        cx = start_x + i * (card_w + 18)
        draw_rounded_rect(c, cx, start_y, card_w, card_h, radius=10, fill_color=BG_SURFACE, stroke_color=BORDER_SUBTLE, stroke_width=1)
        
        draw_rounded_rect(c, cx, start_y + card_h - 38, card_w, 38, radius=10, fill_color=BG_CARD_LIGHT, stroke_color=None)
        c.setFont(FONT_BOLD, 11)
        c.setFillColor(card["accent"])
        c.drawString(cx + 16, start_y + card_h - 24, card["title"])
        
        iy = start_y + card_h - 58
        for heading, body in card["items"]:
            c.setFont(FONT_BOLD, 9)
            c.setFillColor(TEXT_PRIMARY)
            c.drawString(cx + 16, iy, f"• {heading}")
            
            p = Paragraph(body, ParagraphStyle("CardBody", fontName=FONT_REGULAR, fontSize=8, leading=10.5, textColor=TEXT_SECONDARY))
            p.wrapOn(c, card_w - 32, 45)
            p.drawOn(c, cx + 16, iy - 26)
            
            iy -= 68


def build_category_divider_slide(c, page_num, total_pages, cat_num, cat_title, cat_subtitle, cat_desc, key_models, sample_image_path=None):
    draw_standard_slide_frame(c, page_num, total_pages, category_tag=f"CATEGORY {cat_num} / 05")
    
    left_x = 54
    
    draw_rounded_rect(c, left_x, SLIDE_HEIGHT - 105, 100, 22, radius=11, fill_color=BG_SURFACE, stroke_color=BORDER_SUBTLE, stroke_width=1)
    c.setFont(FONT_BOLD, 8.5)
    c.setFillColor(ACCENT_CYAN)
    c.drawString(left_x + 12, SLIDE_HEIGHT - 95, f"DOMAIN {cat_num} / 05")
    
    # Title with Paragraph to ensure clean multi-line wrapping
    title_p = Paragraph(cat_title, ParagraphStyle("CatTitle", fontName=FONT_BOLD, fontSize=22, leading=26, textColor=TEXT_PRIMARY))
    title_p.wrapOn(c, 390, 60)
    title_p.drawOn(c, left_x, SLIDE_HEIGHT - 170)
    
    # Subtitle
    c.setFont(FONT_BOLD, 10.5)
    c.setFillColor(ACCENT_PURPLE)
    c.drawString(left_x, SLIDE_HEIGHT - 198, cat_subtitle)
    
    # Narrative
    desc_p = Paragraph(cat_desc, ParagraphStyle("CatDesc", fontName=FONT_REGULAR, fontSize=9.5, leading=14.5, textColor=TEXT_SECONDARY))
    desc_p.wrapOn(c, 390, 120)
    desc_p.drawOn(c, left_x, SLIDE_HEIGHT - 315)
    
    # Models used pill box
    c.setFont(FONT_BOLD, 8.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(left_x, SLIDE_HEIGHT - 345, "PRIMARY PIPELINES:")
    
    bx = left_x + 115
    for m in key_models:
        w = draw_pill_badge(c, m, bx, SLIDE_HEIGHT - 353, model_key=m, font_size=8, pad_x=8, pad_y=3)
        bx += w + 8
        
    # Right Image Showcase Card
    if sample_image_path:
        opt_path = get_optimized_image(sample_image_path)
        if opt_path and os.path.exists(opt_path):
            rx = 480
            ry = 65
            rw = 430
            rh = 380
            draw_rounded_rect(c, rx, ry, rw, rh, radius=12, fill_color=BG_CARD, stroke_color=BORDER_SUBTLE, stroke_width=1)
            
            with Image.open(opt_path) as img:
                iw, ih = img.size
            
            fit_w, fit_h = fit_image_dimensions(iw, ih, rw - 24, rh - 24)
            img_x = rx + (rw - fit_w) / 2
            img_y = ry + (rh - fit_h) / 2
            
            c.saveState()
            c.drawImage(opt_path, img_x, img_y, width=fit_w, height=fit_h)
            c.restoreState()


def build_two_works_slide(c, page_num, total_pages, work1, work2, category_name):
    draw_standard_slide_frame(c, page_num, total_pages, category_tag=category_name)
    
    works = [w for w in [work1, work2] if w]
    card_w = 425
    card_h = 425
    start_y = 52
    
    for i, w in enumerate(works):
        cx = 44 + i * (card_w + 22)
        
        draw_rounded_rect(c, cx, start_y, card_w, card_h, radius=10, fill_color=BG_SURFACE, stroke_color=BORDER_SUBTLE, stroke_width=1)
        
        img_box_h = 270
        img_box_y = start_y + card_h - img_box_h - 8
        
        opt_path = get_optimized_image(w['file'])
        if opt_path and os.path.exists(opt_path):
            with Image.open(opt_path) as img:
                iw, ih = img.size
            fit_w, fit_h = fit_image_dimensions(iw, ih, card_w - 20, img_box_h - 12)
            ix = cx + (card_w - fit_w) / 2
            iy = img_box_y + (img_box_h - fit_h) / 2
            
            draw_rounded_rect(c, cx + 8, img_box_y + 4, card_w - 16, img_box_h - 8, radius=6, fill_color=colors.HexColor("#0E121A"), stroke_color=None)
            c.saveState()
            c.drawImage(opt_path, ix, iy, width=fit_w, height=fit_h)
            c.restoreState()
        
        # ID Badge
        c.setFont(FONT_BOLD, 8.5)
        c.setFillColor(ACCENT_CYAN)
        c.drawString(cx + 14, start_y + 128, f"#{w['id']}")
        
        # Title
        title_p = Paragraph(w['name'], ParagraphStyle("WorkTitle", fontName=FONT_BOLD, fontSize=11, leading=14, textColor=TEXT_PRIMARY))
        title_p.wrapOn(c, card_w - 28, 30)
        title_p.drawOn(c, cx + 14, start_y + 98)
        
        # Badges row
        bx = cx + 14
        for m in w.get('model', []):
            bw = draw_pill_badge(c, m, bx, start_y + 74, model_key=m, font_size=7.5, pad_x=6, pad_y=2)
            bx += bw + 6
            
        draw_rounded_rect(c, bx, start_y + 74, 90, 15, radius=7.5, fill_color=BG_CARD_LIGHT, stroke_color=BORDER_SUBTLE, stroke_width=0.6)
        c.setFont(FONT_REGULAR, 7)
        c.setFillColor(TEXT_MUTED)
        c.drawCentredString(bx + 45, start_y + 78, w['category'])
        
        # Description
        desc_p = Paragraph(w['description'], ParagraphStyle("WorkDesc", fontName=FONT_REGULAR, fontSize=8.5, leading=11.5, textColor=TEXT_SECONDARY))
        desc_p.wrapOn(c, card_w - 28, 55)
        desc_p.drawOn(c, cx + 14, start_y + 16)


def build_three_works_slide(c, page_num, total_pages, w1, w2, w3, category_name):
    draw_standard_slide_frame(c, page_num, total_pages, category_tag=category_name)
    
    works = [w for w in [w1, w2, w3] if w]
    card_w = 276
    card_h = 425
    start_y = 52
    
    for i, w in enumerate(works):
        cx = 44 + i * (card_w + 18)
        
        draw_rounded_rect(c, cx, start_y, card_w, card_h, radius=10, fill_color=BG_SURFACE, stroke_color=BORDER_SUBTLE, stroke_width=1)
        
        img_box_h = 240
        img_box_y = start_y + card_h - img_box_h - 8
        
        opt_path = get_optimized_image(w['file'])
        if opt_path and os.path.exists(opt_path):
            with Image.open(opt_path) as img:
                iw, ih = img.size
            fit_w, fit_h = fit_image_dimensions(iw, ih, card_w - 18, img_box_h - 12)
            ix = cx + (card_w - fit_w) / 2
            iy = img_box_y + (img_box_h - fit_h) / 2
            
            draw_rounded_rect(c, cx + 6, img_box_y + 4, card_w - 12, img_box_h - 8, radius=6, fill_color=colors.HexColor("#0E121A"), stroke_color=None)
            c.saveState()
            c.drawImage(opt_path, ix, iy, width=fit_w, height=fit_h)
            c.restoreState()
            
        c.setFont(FONT_BOLD, 8)
        c.setFillColor(ACCENT_CYAN)
        c.drawString(cx + 12, start_y + 152, f"#{w['id']}")
        
        t_style = ParagraphStyle("WorkTitleSmall", fontName=FONT_BOLD, fontSize=9.5, leading=12.5, textColor=TEXT_PRIMARY)
        title_p = Paragraph(w['name'], t_style)
        title_p.wrapOn(c, card_w - 24, 30)
        title_p.drawOn(c, cx + 12, start_y + 122)
        
        bx = cx + 12
        for m in w.get('model', []):
            bw = draw_pill_badge(c, m, bx, start_y + 98, model_key=m, font_size=7, pad_x=5, pad_y=2)
            bx += bw + 5
            
        d_style = ParagraphStyle("WorkDescSmall", fontName=FONT_REGULAR, fontSize=7.5, leading=10.5, textColor=TEXT_SECONDARY)
        desc_p = Paragraph(w['description'], d_style)
        desc_p.wrapOn(c, card_w - 24, 75)
        desc_p.drawOn(c, cx + 12, start_y + 14)


def build_closing_slide(c, page_num, total_pages):
    draw_standard_slide_frame(c, page_num, total_pages, category_tag="NEXT STEPS & PARTNERSHIP")
    
    c.setFont(FONT_BOLD, 22)
    c.setFillColor(TEXT_PRIMARY)
    c.drawString(48, SLIDE_HEIGHT - 82, "Commercial Collaboration & Partnership")
    
    c.setFont(FONT_REGULAR, 10)
    c.setFillColor(TEXT_MUTED)
    c.drawString(48, SLIDE_HEIGHT - 100, "Flexible creative workflows designed to accelerate product concepting, gaming, and marketing production.")
    
    card_w = 415
    card_h = 330
    start_y = 60
    
    # Left Card: Engagement Modes
    draw_rounded_rect(c, 48, start_y, card_w, card_h, radius=10, fill_color=BG_SURFACE, stroke_color=BORDER_SUBTLE, stroke_width=1)
    
    draw_rounded_rect(c, 48, start_y + card_h - 36, card_w, 36, radius=10, fill_color=BG_CARD_LIGHT, stroke_color=None)
    c.setFont(FONT_BOLD, 11)
    c.setFillColor(ACCENT_CYAN)
    c.drawString(64, start_y + card_h - 22, "SERVICES & COLLABORATION MODES")
    
    services = [
        ("Concept Art & Visual Development", "Rapid visual exploration for sci-fi, characters, and tabletop gaming IPs with 24-hour turnaround."),
        ("3D Miniature & Figurine Concepting", "Multi-view sculpt concepts optimized for high-resolution resin printing, joints, and casting."),
        ("Hardware & Product Visualization", "Photorealistic studio renders of prototypes, consumer tech, and precision microelectronics."),
        ("Custom AI Pipelines & Workflows", "Bespoke ComfyUI nodal architectures, LoRA fine-tuning, and model blending for enterprise teams.")
    ]
    
    sy = start_y + card_h - 60
    for title, desc in services:
        c.setFont(FONT_BOLD, 9.5)
        c.setFillColor(TEXT_PRIMARY)
        c.drawString(64, sy, f"[+]  {title}")
        
        p = Paragraph(desc, ParagraphStyle("ServiceDesc", fontName=FONT_REGULAR, fontSize=8, leading=11, textColor=TEXT_SECONDARY))
        p.wrapOn(c, card_w - 36, 40)
        p.drawOn(c, 64, sy - 28)
        sy -= 66
        
    # Right Card: Direct Contact & Online Portfolio
    rx = 495
    draw_rounded_rect(c, rx, start_y, card_w, card_h, radius=10, fill_color=BG_SURFACE, stroke_color=BORDER_SUBTLE, stroke_width=1)
    
    draw_rounded_rect(c, rx, start_y + card_h - 36, card_w, 36, radius=10, fill_color=BG_CARD_LIGHT, stroke_color=None)
    c.setFont(FONT_BOLD, 11)
    c.setFillColor(ACCENT_EMERALD)
    c.drawString(rx + 16, start_y + card_h - 22, "DIRECT CONTACT & REPOSITORIES")
    
    # Artist Contact Details Box
    draw_rounded_rect(c, rx + 16, start_y + card_h - 130, card_w - 32, 80, radius=8, fill_color=BG_CARD, stroke_color=BORDER_SUBTLE, stroke_width=0.8)
    
    c.setFont(FONT_BOLD, 14)
    c.setFillColor(TEXT_PRIMARY)
    c.drawString(rx + 32, start_y + card_h - 68, "Egor Baklykov")
    
    c.setFont(FONT_REGULAR, 9)
    c.setFillColor(ACCENT_CYAN)
    c.drawString(rx + 32, start_y + card_h - 86, "AI Art & Generative Imagery Specialist")
    
    c.setFont(FONT_BOLD, 9)
    c.setFillColor(TEXT_PRIMARY)
    c.drawString(rx + 32, start_y + card_h - 108, "Email: jegor.baklykov@gmail.com")
    c.drawString(rx + 32, start_y + card_h - 122, "LinkedIn: linkedin.com/in/egorbaklykov")
    
    # Interactive Portfolio callout with Clickable Link
    portfolio_url = "https://codesome3d.github.io/portfolio_ai/"
    draw_rounded_rect(c, rx + 16, start_y + 18, card_w - 32, 110, radius=8, fill_color=colors.HexColor("#0D253A"), stroke_color=colors.HexColor("#0284C7"), stroke_width=1)
    
    c.setFont(FONT_BOLD, 11)
    c.setFillColor(ACCENT_CYAN)
    c.drawString(rx + 32, start_y + 104, "[*]  Interactive Web Portfolio")
    
    # Set active PDF link annotation on the card area
    c.linkURL(portfolio_url, (rx + 16, start_y + 18, rx + card_w - 16, start_y + 128))
    
    web_p = Paragraph(
        f"Explore high-resolution zoom inspections, real-time metadata editing, and generative prompt breakdowns live at:<br/><br/>"
        f"<b><a href='{portfolio_url}'><font color='#38bdf8'><u>{portfolio_url}</u></font></a></b><br/><br/>"
        f"<font color='#94a3b8' size='7.5'><i>(Click link above to open in browser &bull; Hosted on GitHub Pages)</i></font>",
        ParagraphStyle("WebNote", fontName=FONT_REGULAR, fontSize=8.5, leading=12, textColor=TEXT_SECONDARY)
    )
    web_p.wrapOn(c, card_w - 64, 80)
    web_p.drawOn(c, rx + 32, start_y + 26)


# ----------------------------------------------------------------------
# 5. MAIN DECK GENERATION PIPELINE
# ----------------------------------------------------------------------
def generate_presentation_deck(output_pdf_path="Egor_Baklykov_AI_Portfolio_Presentation.pdf"):
    print("Reading portfolio data from data/works.js...")
    with open("data/works.js", "r", encoding="utf-8") as f:
        content = f.read()
    
    m = re.search(r'PORTFOLIO_WORKS = (\[.*?\]);', content, re.DOTALL)
    if not m:
        raise ValueError("Could not parse PORTFOLIO_WORKS from data/works.js")
    
    works = json.loads(m.group(1))
    print(f"Loaded {len(works)} artworks.")
    
    works_by_id = {w["id"]: w for w in works}
    
    slides_plan = []
    
    # 1. Cover Slide (Slide 1)
    slides_plan.append(("cover", None))
    
    # 2. Executive Overview (Slide 2)
    slides_plan.append(("overview", None))
    
    # Category 1: 3D Miniatures (7 works: 001-007)
    # Slide 3: Divider
    slides_plan.append(("cat_divider", {
        "num": "01",
        "title": "3D Miniatures & Figurines",
        "subtitle": "High-Detail Figurine Concepts Optimized for Resin 3D Printing",
        "desc": "Intricate character concepts, mechs, and tactical warriors sculpts engineered specifically for resin printing, hobbyist painting, and tabletop gaming immersion.",
        "models": ["Midjourney"],
        "sample": "images/miniature_cyber-paladin_01.png"
    }))
    # Slide 4
    slides_plan.append(("two_works", (works_by_id.get("001"), works_by_id.get("002"), "3D Miniatures")))
    # Slide 5
    slides_plan.append(("two_works", (works_by_id.get("003"), works_by_id.get("004"), "3D Miniatures")))
    # Slide 6
    slides_plan.append(("three_works", (works_by_id.get("005"), works_by_id.get("006"), works_by_id.get("007"), "3D Miniatures")))
    
    # Category 2: Product & Tech (6 works: 008-010, 015-017)
    # Slide 7: Divider
    slides_plan.append(("cat_divider", {
        "num": "02",
        "title": "Product & Hardware Concepts",
        "subtitle": "Tactile Consumer Electronics, Ergonomics & Microchip PCBs",
        "desc": "Industrial design visualizations highlighting precision surfacing, tactile mechanical buttons, anodized finishes, and high-density semiconductor circuit trace rendering.",
        "models": ["ChatGPT", "Midjourney"],
        "sample": "images/product_clicker-device_01.png"
    }))
    # Slide 8
    slides_plan.append(("three_works", (works_by_id.get("008"), works_by_id.get("009"), works_by_id.get("010"), "Product & Tech")))
    # Slide 9
    slides_plan.append(("three_works", (works_by_id.get("015"), works_by_id.get("016"), works_by_id.get("017"), "Product & Tech")))
    
    # Category 3: Characters & Fashion (3 works: 021-023)
    # Slide 10: Divider
    slides_plan.append(("cat_divider", {
        "num": "03",
        "title": "Characters & Studio Fashion",
        "subtitle": "Natural Daylight Studies, Fabric Micro-Textures & Portraiture",
        "desc": "Studio portrait photography render series exploring fabric textures, natural skin tones, soft shadow gradients, and garment drape across minimalist fashion concepts.",
        "models": ["Midjourney"],
        "sample": "images/fashion_tee-mockup-black_01.png"
    }))
    # Slide 11
    slides_plan.append(("three_works", (works_by_id.get("021"), works_by_id.get("022"), works_by_id.get("023"), "Characters & Fashion")))
    
    # Category 4: Environments & Sci-Fi (3 works: 011, 013, 018)
    # Slide 12: Divider (Removed ComfyUI per request -> Midjourney, ChatGPT)
    slides_plan.append(("cat_divider", {
        "num": "04",
        "title": "Environments & Sci-Fi Worlds",
        "subtitle": "Cinematic Atmospheric Landscapes & Futuristic Habitat Modules",
        "desc": "Expansive environment concepts ranging from converted orbital space station lounges with ambient neon illumination to moody twilight sea cliffs and vehicles.",
        "models": ["Midjourney", "ChatGPT"],
        "sample": "images/environment_coastal-lighthouse_01.jpg"
    }))
    # Slide 13
    slides_plan.append(("three_works", (works_by_id.get("011"), works_by_id.get("013"), works_by_id.get("018"), "Environments & Sci-Fi")))
    
    # Category 5: Creatures & Art (6 works: 012, 014, 019, 020, 024, 025)
    # Slide 14: Divider (Added ComfyUI per request -> Midjourney, ChatGPT, NanoBanana, ComfyUI)
    slides_plan.append(("cat_divider", {
        "num": "05",
        "title": "Creatures & Stylized Art",
        "subtitle": "Anthropomorphic Mascot Studies, Classical Still-Lifes & Mascots",
        "desc": "Stylized art series blending whimsy with craftsmanship — from vintage biker foxes in leather jackets to sophisticated mascot concepts and classical oil paintings.",
        "models": ["Midjourney", "ChatGPT", "NanoBanana", "ComfyUI"],
        "sample": "images/art_cat-food-commercial_01.png"
    }))
    # Slide 15
    slides_plan.append(("three_works", (works_by_id.get("012"), works_by_id.get("014"), works_by_id.get("019"), "Creatures & Art")))
    # Slide 16 (Includes #025 with ChatGPT and ComfyUI)
    slides_plan.append(("three_works", (works_by_id.get("020"), works_by_id.get("024"), works_by_id.get("025"), "Creatures & Art")))
    
    # Closing Slide (Slide 17)
    slides_plan.append(("closing", None))
    
    total_pages = len(slides_plan)
    print(f"Total Slides in Deck: {total_pages}")
    
    c = canvas.Canvas(output_pdf_path, pagesize=PAGE_SIZE)
    c.setTitle("Egor Baklykov - AI Generative Art & Imagery Portfolio")
    c.setAuthor("Egor Baklykov")
    c.setSubject("AI Generative Art Portfolio Presentation for Partners & Clients")
    
    for page_idx, (slide_type, data) in enumerate(slides_plan, start=1):
        print(f"Rendering slide {page_idx}/{total_pages}: {slide_type}...")
        
        if slide_type == "cover":
            build_cover_slide(c, page_idx, total_pages, works_count=len(works))
        elif slide_type == "overview":
            build_overview_slide(c, page_idx, total_pages)
        elif slide_type == "cat_divider":
            build_category_divider_slide(
                c, page_idx, total_pages,
                cat_num=data["num"],
                cat_title=data["title"],
                cat_subtitle=data["subtitle"],
                cat_desc=data["desc"],
                key_models=data["models"],
                sample_image_path=data["sample"]
            )
        elif slide_type == "two_works":
            w1, w2, cat_name = data
            build_two_works_slide(c, page_idx, total_pages, w1, w2, cat_name)
        elif slide_type == "three_works":
            w1, w2, w3, cat_name = data
            build_three_works_slide(c, page_idx, total_pages, w1, w2, w3, cat_name)
        elif slide_type == "closing":
            build_closing_slide(c, page_idx, total_pages)
            
        c.showPage()
    
    c.save()
    print(f"\nPDF Presentation successfully generated at:\n-> {os.path.abspath(output_pdf_path)}")
    file_size_mb = os.path.getsize(output_pdf_path) / (1024 * 1024)
    print(f"File size: {file_size_mb:.2f} MB")

if __name__ == "__main__":
    generate_presentation_deck()
