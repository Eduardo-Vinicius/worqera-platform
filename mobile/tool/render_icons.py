"""Renders the Worqera app icons from the site logo (web/app/icon.svg). Run: python3 tool/render_icons.py"""
from PIL import Image, ImageDraw

STOPS = [(0.0, (0xAE, 0x50, 0xFD)), (0.5, (0x7D, 0x26, 0xDE)), (1.0, (0x4F, 0x0F, 0xA6))]


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            for (p0, c0), (p1, c1) in zip(STOPS, STOPS[1:]):
                if t <= p1:
                    px[x, y] = lerp(c0, c1, (t - p0) / (p1 - p0))
                    break
    return img


def mark(draw, size, scale=1.0, offset=0.0):
    """The W stroke + dot from the 100×100 logo, scaled into `size` (scale <1 shrinks around the center)."""
    def pt(x, y):
        cx = (x - 50) * scale + 50
        cy = (y - 50) * scale + 50
        return (cx / 100 * size + offset, cy / 100 * size + offset)

    w = max(2, round(6 / 100 * size * scale))
    pts = [pt(25, 35), pt(35, 65), pt(50, 45), pt(65, 65), pt(75, 35)]
    draw.line(pts, fill='white', width=w, joint='curve')
    r = w / 2
    for x, y in (pts[0], pts[-1]):
        draw.ellipse((x - r, y - r, x + r, y + r), fill='white')
    cx, cy = pt(50, 55)
    rr = 8 / 100 * size * scale
    draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill='white')


def supersample(render, size, factor=4):
    big = render(size * factor)
    return big.resize((size, size), Image.LANCZOS)


def app_icon(size):
    img = gradient(size)
    mark(ImageDraw.Draw(img), size, scale=1.15)
    return img


def foreground(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mark(ImageDraw.Draw(img), size, scale=0.78)
    return img


def splash(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mark(ImageDraw.Draw(img), size, scale=1.0)
    return img


if __name__ == '__main__':
    supersample(app_icon, 1024, 2).save('assets/icon/app_icon.png')
    supersample(foreground, 1024, 2).save('assets/icon/adaptive_foreground.png')
    supersample(splash, 768, 2).save('assets/icon/splash_mark.png')
    print('ok')
