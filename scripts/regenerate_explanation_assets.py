from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


W = 1120
H_SHORT = 245
H_TALL = 285
FONT_BOLD = r"C:\Windows\Fonts\meiryob.ttc"
FONT_REG = r"C:\Windows\Fonts\meiryo.ttc"

BLUE = (0, 96, 210)
RED = (255, 24, 36)
BLACK = (28, 32, 36)
GREEN = (24, 190, 96)
BG = (252, 255, 251)
HEADER_BG = (235, 245, 255)
HEADER_LINE = (139, 188, 255)
GRAY_LINE = (183, 193, 202)


def font(size, bold=True):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size=size)


F_TITLE = font(31)
F_TITLE_SMALL = font(25)
F_META = font(19)
F_BODY = font(26)
F_BODY_RED = font(24)
F_SMALL = font(18)
F_ROW = font(24)
F_NUM = font(22, False)


def text(draw, xy, value, fill=BLACK, f=F_BODY, anchor=None):
    draw.text(xy, value, fill=fill, font=f, anchor=anchor)


def bbox(draw, value, f):
    return draw.textbbox((0, 0), value, font=f)


def rect_symbol(draw, x, y, w=44, h=21, color=RED, lw=3):
    draw.rectangle([x, y, x + w, y + h], outline=color, width=lw)
    return x + w


def tri_symbol(draw, x, y, size=25, color=RED, lw=3):
    pts = [(x + size / 2, y), (x, y + size), (x + size, y + size)]
    draw.line([pts[0], pts[1], pts[2], pts[0]], fill=color, width=lw, joint="curve")
    return x + size


def circle_symbol(draw, x, y, r=11, color=RED, lw=3):
    draw.ellipse([x, y, x + r * 2, y + r * 2], outline=color, width=lw)
    return x + r * 2


def cross_symbol(draw, x, y, size=23, color=BLACK, lw=3):
    draw.line([x, y, x + size, y + size], fill=color, width=lw)
    draw.line([x + size, y, x, y + size], fill=color, width=lw)
    return x + size


def draw_symbols(draw, x, y, tokens, scale=1.0):
    for token in tokens:
        if token == "rect":
            x = rect_symbol(
                draw,
                x,
                y + int(4 * scale),
                int(44 * scale),
                int(21 * scale),
                RED,
                max(2, int(3 * scale)),
            ) + int(2 * scale)
        elif token == "wide":
            x = rect_symbol(
                draw,
                x,
                y + int(4 * scale),
                int(58 * scale),
                int(21 * scale),
                RED,
                max(2, int(3 * scale)),
            ) + int(2 * scale)
        elif token == "blackwide":
            x = rect_symbol(
                draw,
                x,
                y + int(4 * scale),
                int(58 * scale),
                int(21 * scale),
                BLACK,
                max(2, int(3 * scale)),
            ) + int(2 * scale)
        elif token == "tri":
            x = tri_symbol(
                draw, x, y + int(2 * scale), int(27 * scale), RED, max(2, int(3 * scale))
            ) + int(3 * scale)
        elif token == "circle":
            x = circle_symbol(
                draw, x, y + int(3 * scale), int(12 * scale), RED, max(2, int(3 * scale))
            ) + int(3 * scale)
        elif token == "cross":
            x = cross_symbol(
                draw, x, y + int(5 * scale), int(23 * scale), BLACK, max(2, int(3 * scale))
            ) + int(8 * scale)
        elif isinstance(token, str):
            text(draw, (x, y - int(1 * scale)), token, BLACK, F_META)
            x += bbox(draw, token, F_META)[2] + int(4 * scale)
    return x


def draw_header(draw, title_left, title_right, pattern_tokens, condition_tokens):
    draw.rounded_rectangle([24, 22, W - 24, 75], radius=9, fill=HEADER_BG, outline=HEADER_LINE, width=1)
    text(draw, (48, 33), title_left, BLUE, F_TITLE)
    x = 138
    title_font = F_TITLE_SMALL if len(title_right) > 6 else F_TITLE
    text(draw, (x, 36), title_right, BLUE, title_font)
    x += bbox(draw, title_right, title_font)[2] + 18
    x = draw_symbols(draw, x, 38, pattern_tokens, 1.04)
    x += 22
    draw_symbols(draw, x, 40, condition_tokens, 0.94)


def base_canvas(h):
    img = Image.new("RGB", (W, h), BG)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([12, 10, W - 12, h - 12], radius=14, outline=GREEN, width=3)
    return img, draw


def save(img, filename):
    for folder in [Path("public/explanation-assets"), Path("explanation-assets")]:
        folder.mkdir(parents=True, exist_ok=True)
        img.save(folder / filename, optimize=True)


def draw_short(filename, title_left, title_right, pattern, condition, body1_parts, red_line):
    img, draw = base_canvas(H_SHORT)
    draw_header(draw, title_left, title_right, pattern, condition)
    x, y = 82, 101
    for kind, value in body1_parts:
        if kind == "text":
            text(draw, (x, y), value, BLACK, F_BODY)
            x += bbox(draw, value, F_BODY)[2]
        elif kind == "symbols":
            x = draw_symbols(draw, x, y + 1, value, 1.02)
    draw.line([44, 146, W - 44, 146], fill=GRAY_LINE, width=2)
    text(draw, (82, 174), red_line, RED, F_BODY_RED)
    save(img, filename)


def draw_headless1():
    img, draw = base_canvas(H_TALL)
    draw_header(
        draw,
        "3面子",
        "ヘッドレス1型",
        ["rect", "rect", "rect", "tri", "cross", "cross"],
        ["（聴牌条件", "tri", "→", "rect", " or ", "cross", "→", "circle", "）"],
    )
    text(draw, (70, 96), "下記3種の受け入れに注意。", BLACK, F_BODY)
    draw.line([44, 129, W - 44, 129], fill=GRAY_LINE, width=2)
    rows = [
        (1, "□×", "（亜両面、ノベタン、アンチョビ。7枚形□□×もココで登場。）"),
        (2, "スキップ形", ""),
        (3, "リャンカン形", ""),
    ]
    y = 150
    circled_numbers = {1: "①", 2: "②", 3: "③"}
    for idx, _label, desc in rows:
        text(draw, (64, y), circled_numbers[idx], BLACK, F_NUM)
        if idx == 1:
            x = 112
            x = draw_symbols(draw, x, y + 1, ["blackwide", "cross"], 1.0)
            text(draw, (x + 8, y + 1), desc, BLACK, F_SMALL)
        elif idx == 2:
            text(draw, (112, y), "スキップ形", BLACK, F_ROW)
        else:
            text(draw, (112, y), "リャンカン形", BLACK, F_ROW)
        y += 40
    text(draw, (292, 220), "}", RED, font(86), anchor="mm")
    text(draw, (374, 218), "2スジで答えられる", RED, F_BODY_RED)
    save(img, "03_headless1.png")


draw_short(
    "01_extra_tile.png",
    "2面子",
    "余剰牌型",
    ["rect", "rect", "circle", "tri", "tri", "cross"],
    ["（聴牌条件", "tri", "→", "rect", "）"],
    [("text", "余剰牌×は受け入れを増やしていない。")],
    "実践では、6ブロック目の種（①打点の種②好形の種③安全度の種）として価値を吟味。",
)

draw_short(
    "02_complete.png",
    "2面子",
    "完全形",
    ["rect", "rect", "circle", "tri", "tri", "cross"],
    ["（聴牌条件", "tri", "→", "rect", "）"],
    [("text", "6枚形（"), ("symbols", ["rect", "+", "tri", "+", "cross"]), ("text", "）に注意！")],
    "6枚形を瞬時に理解できるように。エンスクドリルで親密度UP。",
)

draw_headless1()

draw_short(
    "04_headless2.png",
    "3面子",
    "ヘッドレス2型",
    ["rect", "rect", "rect", "tri", "tri"],
    ["聴牌条件（", "tri", "→", "rect", "or", "circle", "）"],
    [
        ("text", "連続形（順子"),
        ("symbols", ["rect", "+"]),
        ("text", "ターツ"),
        ("symbols", ["tri"]),
        ("text", "）の有無に注目！"),
    ],
    "隙間の無い連続形は左隣〜右隣全部OK",
)
