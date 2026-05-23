"""
Generate Android launcher PNGs from the BoxOfVibe vinyl icon design.
Outputs ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png
for all mipmap densities.
"""
import math
import os
from PIL import Image, ImageDraw

RES = "android/app/src/main/res"

# (folder, launcher_px, foreground_px)
DENSITIES = [
    ("mipmap-mdpi",    48,  108),
    ("mipmap-hdpi",    72,  162),
    ("mipmap-xhdpi",   96,  216),
    ("mipmap-xxhdpi",  144, 324),
    ("mipmap-xxxhdpi", 192, 432),
]

# ── colour palette ──────────────────────────────────────────────────────────
PURPLE = (168, 85, 247)
PINK   = (236, 72, 153)
ORANGE = (251, 146, 60)

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def gradient_color(t):
    """Purple→Pink→Orange along t=0..1"""
    if t < 0.5:
        return lerp_color(PURPLE, PINK, t * 2)
    else:
        return lerp_color(PINK, ORANGE, (t - 0.5) * 2)

# ── background (Option E: 3-corner glows on black) ──────────────────────────
def draw_background(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    def add_glow(cx, cy, color, alpha=110):
        radius = int(size * 0.6)
        for r in range(radius, 0, -1):
            a = int(alpha * (1 - r / radius) ** 2)
            if a < 1:
                continue
            box = [cx - r, cy - r, cx + r, cy + r]
            draw.ellipse(box, fill=(*color, a))

    add_glow(0,    0,    (37,  0,  74))   # purple top-left
    add_glow(size, 0,    (58,  0,  32))   # pink   top-right
    add_glow(size, size, (58, 21,   0))   # orange bottom-right

    img = Image.alpha_composite(img, overlay)
    return img

# ── foreground vinyl (108dp canvas → scaled) ────────────────────────────────
def draw_foreground(size):
    """Draw vinyl on a transparent 'size x size' canvas (safe zone = center 72dp equiv)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = size / 2

    def r(dp):
        return dp * size / 108

    def circle(radius, fill=None, outline=None, outline_width=1, fill_alpha=255):
        box = [cx - radius, cy - radius, cx + radius, cy + radius]
        if fill:
            draw.ellipse(box, fill=(*fill, fill_alpha))
        if outline:
            draw.ellipse(box, outline=(*outline, fill_alpha), width=max(1, int(outline_width)))

    def radial_gradient_circle(radius, center_color, edge_color, alpha=255):
        for rad in range(int(radius), 0, -1):
            t = 1 - rad / radius
            c = lerp_color(center_color, edge_color, t)
            box = [cx - rad, cy - rad, cx + rad, cy + rad]
            draw.ellipse(box, fill=(*c, alpha))

    # glow (r=36 equiv)
    radial_gradient_circle(r(36), PURPLE, (0,0,0), alpha=0)  # skip — transparent glow hard in PIL
    # just do a soft purple ring
    for rad in range(int(r(36)), int(r(32)), -1):
        a = int(60 * (rad - r(32)) / (r(36) - r(32)))
        t = (rad - r(32)) / (r(36) - r(32))
        c = gradient_color(1 - t)
        box = [cx - rad, cy - rad, cx + rad, cy + rad]
        draw.ellipse(box, fill=(*c, a))

    # border ring (r=35→33)
    for rad in range(int(r(35)), int(r(33)), -1):
        t = 1 - (rad - r(33)) / (r(35) - r(33))
        c = gradient_color(t)
        box = [cx - rad, cy - rad, cx + rad, cy + rad]
        draw.ellipse(box, fill=(*c, 153))

    # vinyl body (r=33)
    for rad in range(int(r(33)), 0, -1):
        t = rad / r(33)
        if t > 0.7:
            c = lerp_color((74, 74, 74), (42, 42, 42), (t - 0.7) / 0.3)
        else:
            c = lerp_color((42, 42, 42), (26, 26, 26), t / 0.7)
        box = [cx - rad, cy - rad, cx + rad, cy + rad]
        draw.ellipse(box, fill=(*c, 255))

    # groove rings
    for gr in [29, 25, 21, 17]:
        rad = r(gr)
        box = [cx - rad, cy - rad, cx + rad, cy + rad]
        draw.ellipse(box, outline=(58, 58, 58, 32), width=max(1, int(r(0.5))))

    # center label (r=13)
    for rad in range(int(r(13)), 0, -1):
        t = 1 - rad / r(13)
        c = gradient_color(t)
        box = [cx - rad, cy - rad, cx + rad, cy + rad]
        draw.ellipse(box, fill=(*c, 255))

    # shine bar (x=49-59 equiv, y=19-89)
    bar_x1 = cx - r(5)
    bar_x2 = cx + r(5)
    bar_y1 = cy - r(35)
    bar_y2 = cy + r(35)
    bar_w = int(bar_x2 - bar_x1)
    bar_h = int(bar_y2 - bar_y1)
    if bar_w > 0 and bar_h > 0:
        shine = Image.new("RGBA", (bar_w, bar_h), (0, 0, 0, 0))
        for x in range(bar_w):
            t = x / bar_w
            a = int(38 * (1 - abs(t - 0.5) * 2))  # 0.15 * 255 ≈ 38
            for y in range(bar_h):
                shine.putpixel((x, y), (255, 255, 255, a))
        img.alpha_composite(shine, (int(bar_x1), int(bar_y1)))
        draw = ImageDraw.Draw(img)  # refresh after composite

    # center hole (r=3)
    hole_r = r(3)
    box = [cx - hole_r, cy - hole_r, cx + hole_r, cy + hole_r]
    draw.ellipse(box, fill=(26, 26, 26, 255))

    return img

# ── composite: bg + foreground ───────────────────────────────────────────────
def draw_launcher(size):
    bg = draw_background(size)
    fg = draw_foreground(size)
    bg.alpha_composite(fg)
    return bg

# ── generate all sizes ───────────────────────────────────────────────────────
for folder, launcher_px, fg_px in DENSITIES:
    path = os.path.join(RES, folder)
    os.makedirs(path, exist_ok=True)

    launcher = draw_launcher(launcher_px)
    launcher.save(os.path.join(path, "ic_launcher.png"))
    launcher.save(os.path.join(path, "ic_launcher_round.png"))

    fg = draw_foreground(fg_px)
    fg.save(os.path.join(path, "ic_launcher_foreground.png"))

    print(f"  {folder}: launcher={launcher_px}px  foreground={fg_px}px")

print("\nDone. All mipmap PNGs updated.")
