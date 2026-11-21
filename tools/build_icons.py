"""Gera a "capa" do app a partir da arte do jogo:
- ícone do Android (adaptativo 8+, legado quadrado arredondado e redondo, todas as densidades)
- tela de abertura (splash) em paisagem e retrato
- imagem de capa usada pela tela de título do jogo (public/assets/sprites/title_cover.jpg)

Uso: python3 tools/build_icons.py   (requer opencv-python-headless, scipy, numpy, pillow)
"""
import os, json
import cv2
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "source_sheets")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
SPRITES = os.path.join(ROOT, "public", "assets", "sprites")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf"
OUTLINE = (20, 24, 18, 255)  # #141812, o mesmo contorno dos sprites


def cutout(path, box=None, erase=()):
    """Remove o fundo branco ligado à borda e devolve RGBA (PIL) recortado no conteúdo."""
    im = cv2.imread(path)
    for (a, b, c, d) in erase:
        im[b:d, a:c] = 255
    if box:
        x0, y0, x1, y1 = box
        im = im[y0:y1, x0:x1]
    near = im.min(axis=2) > 222
    lab, _ = ndimage.label(near)
    border = list(set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0})
    bg = np.isin(lab, border)
    # brancos "presos" (entre cabos, braços, pernas) também são fundo, se forem grandes
    holes = near & ~bg
    hl, hn = ndimage.label(holes)
    if hn:
        sizes = ndimage.sum(holes, hl, range(1, hn + 1))
        bg |= np.isin(hl, [i + 1 for i, sz in enumerate(sizes) if sz > 60])
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = cv2.erode(alpha, np.ones((3, 3), np.uint8))
    rgba = np.dstack([cv2.cvtColor(im, cv2.COLOR_BGR2RGB), alpha])
    ys, xs = np.where(alpha > 0)
    rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray(rgba, "RGBA")


def outlined(img, px):
    """Contorno escuro externo (estilo arcade)."""
    a = np.array(img.split()[-1])
    pad = px + 1
    canvas = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    big = np.pad(a, pad)
    ring = cv2.dilate((big > 0).astype(np.uint8), np.ones((2 * px + 1, 2 * px + 1), np.uint8))
    out = np.zeros((*big.shape, 4), np.uint8)
    out[ring > 0] = OUTLINE
    canvas = Image.fromarray(out, "RGBA")
    canvas.alpha_composite(img, (pad, pad))
    return canvas


def jungle_gradient(w, h):
    """Fundo do ícone: verde-floresta com brilho alaranjado (pôr do sol de fumaça do garimpo)."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w * 0.5, h * 0.42
    d = np.sqrt(((x - cx) / w) ** 2 + ((y - cy) / h) ** 2)
    base = np.array([22, 48, 26], np.float32)
    glow = np.array([214, 132, 40], np.float32)
    mid = np.array([46, 93, 46], np.float32)
    t = np.clip(d / 0.75, 0, 1)[..., None]
    col = (1 - t) * mid + t * base
    g = np.clip(1 - d / 0.38, 0, 1)[..., None] ** 2 * 0.55
    col = col * (1 - g) + glow * g
    # faixas diagonais sutis (raios de luz)
    rays = (np.sin((x + y) * 0.035) > 0.6)[..., None] * 0.06
    col = np.clip(col * (1 + rays), 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([col, np.full((h, w), 255, np.uint8)]), "RGBA")


def text(draw, xy, s, size, fill, stroke, anchor="mm", sw=None):
    f = ImageFont.truetype(FONT, size)
    draw.text(xy, s, font=f, fill=fill, stroke_width=sw or max(2, size // 9), stroke_fill=stroke, anchor=anchor)


# ---------------------------------------------------------------------------- arte base
hero_full = cutout(os.path.join(SRC, "hero_v2", "hero_em_pe.png"))
bust = cutout(os.path.join(SRC, "hero_v2", "hero_em_pe.png"), box=(286, 150, 760, 600))
draga = cutout(os.path.join(SRC, "hero_v2", "mega_draga.jpg"), box=(26, 330, 2400, 1592))
draga_img = cv2.imread(os.path.join(SRC, "hero_v2", "mega_draga.jpg"))
draga_img[0:428, 1600:2400] = 255  # sem a fumaça pintada da chaminé
cv2.imwrite("/tmp/_draga.png", draga_img)
draga = cutout("/tmp/_draga.png", box=(26, 330, 2400, 1592))
arara = cutout(os.path.join(SRC, "hero_v2", "itens_hd.jpg"), box=(434, 71, 829, 510))


# ---------------------------------------------------------------------------- ícone
def icon_master(size=1024):
    bg = jungle_gradient(size, size)
    b = bust.copy()
    s = size * 0.92 / b.height
    b = b.resize((round(b.width * s), round(b.height * s)), Image.LANCZOS)
    b = outlined(b, max(4, size // 128))
    bg.alpha_composite(b, ((size - b.width) // 2, size - b.height + size // 40))
    return bg


def round_mask(size, radius_frac):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_frac), fill=255)
    return m


def adaptive_foreground(size):
    """Camada da frente do ícone adaptativo: o rosto dentro da zona segura (66% central)."""
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    b = bust.copy()
    s = size * 0.70 / b.height
    b = b.resize((round(b.width * s), round(b.height * s)), Image.LANCZOS)
    b = outlined(b, max(2, size // 110))
    fg.alpha_composite(b, ((size - b.width) // 2, int(size * 0.80) - b.height + int(size * 0.05)))
    return fg


DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
master = icon_master()
for d, k in DENS.items():
    folder = os.path.join(RES, f"mipmap-{d}")
    legacy = round(48 * k)
    ic = master.resize((legacy, legacy), Image.LANCZOS)
    sq = Image.new("RGBA", (legacy, legacy), (0, 0, 0, 0)); sq.paste(ic, (0, 0), round_mask(legacy, 0.18))
    sq.save(os.path.join(folder, "ic_launcher.png"))
    rd = Image.new("RGBA", (legacy, legacy), (0, 0, 0, 0))
    cm = Image.new("L", (legacy, legacy), 0); ImageDraw.Draw(cm).ellipse([0, 0, legacy - 1, legacy - 1], fill=255)
    rd.paste(ic, (0, 0), cm); rd.save(os.path.join(folder, "ic_launcher_round.png"))
    ad = round(108 * k)
    adaptive_foreground(ad).save(os.path.join(folder, "ic_launcher_foreground.png"))
    jungle_gradient(ad, ad).convert("RGB").save(os.path.join(folder, "ic_launcher_background.png"))

master.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "tools", "icon_512.png"))  # para a Play Store


# ---------------------------------------------------------------------------- capa (16:9)
def cover(w=1600, h=900, with_hint=False):
    bgsrc = cv2.imread(os.path.join(SPRITES, "bg_sky.jpg"))
    bh = bgsrc.shape[0]
    half = bgsrc[:, : bgsrc.shape[1] // 2]
    s = h / bh
    bgr = cv2.resize(half, (round(half.shape[1] * s), h), interpolation=cv2.INTER_AREA)
    bgr = bgr[:, :w] if bgr.shape[1] >= w else cv2.resize(bgr, (w, h))
    img = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)).convert("RGBA")
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    # escurece em direção às bordas (vinheta) para destacar título e personagens
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    v = np.clip(1 - 0.55 * (((x - w / 2) / (w / 2)) ** 2 + ((y - h * 0.45) / (h * 0.75)) ** 2), 0.35, 1)
    arr = np.array(img).astype(np.float32); arr[..., :3] *= v[..., None]
    img = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")

    # Mega Draga ao fundo, à direita
    d = draga.copy(); sd = h * 0.62 / d.height
    d = outlined(d.resize((round(d.width * sd), round(d.height * sd)), Image.LANCZOS), 3)
    img.alpha_composite(d, (w - d.width + int(w * 0.04), int(h * 0.98) - d.height))
    # IbamaMan grande à esquerda
    hf = hero_full.copy(); sh = h * 0.80 / hf.height
    hf = outlined(hf.resize((round(hf.width * sh), round(hf.height * sh)), Image.LANCZOS), 5)
    img.alpha_composite(hf, (int(w * 0.06), h - hf.height + int(h * 0.02)))
    # arara voando (animal libertado)
    a = arara.copy(); sa = h * 0.17 / a.height
    a = outlined(a.resize((round(a.width * sa), round(a.height * sa)), Image.LANCZOS), 3)
    img.alpha_composite(a, (int(w * 0.36), int(h * 0.42)))

    dr = ImageDraw.Draw(img)
    text(dr, (w * 0.62, h * 0.13), "IBAMAMAN", int(h * 0.17), (255, 210, 63), (20, 24, 18), sw=int(h * 0.016))
    text(dr, (w * 0.62, h * 0.265), "GUARDIÃO DA AMAZÔNIA", int(h * 0.062), (255, 138, 31), (20, 24, 18), sw=int(h * 0.011))
    text(dr, (w * 0.62, h * 0.345), "G.E.F. • FISCALIZAÇÃO AMBIENTAL", int(h * 0.034), (235, 235, 225), (20, 24, 18), sw=3)
    if with_hint:
        text(dr, (w * 0.62, h * 0.93), "carregando…", int(h * 0.035), (235, 235, 225), (20, 24, 18), sw=3)
    return img


title = cover()
title.convert("RGB").save(os.path.join(SPRITES, "title_cover.jpg"), quality=86)
# prévia: a própria splash em android/.../drawable-land-xxxhdpi/splash.png

# registra a capa no manifest (res 2: a imagem tem 1600x900 = 2x o tamanho lógico 800x450)
mpath = os.path.join(SPRITES, "manifest.json")
man = [e for e in json.load(open(mpath)) if e["key"] != "title_cover"]
man.append({"key": "title_cover", "file": "title_cover.jpg", "res": 2})
json.dump(man, open(mpath, "w"), indent=1)

# ---------------------------------------------------------------------------- splash (abertura)
splash_cover = cover(with_hint=True)
for folder in sorted(os.listdir(RES)):
    if not folder.startswith("drawable"):
        continue
    p = os.path.join(RES, folder, "splash.png")
    if not os.path.exists(p):
        continue
    W, Hh = Image.open(p).size
    if W >= Hh:  # paisagem: capa cortada no centro
        s = max(W / splash_cover.width, Hh / splash_cover.height)
        c = splash_cover.resize((round(splash_cover.width * s), round(splash_cover.height * s)), Image.LANCZOS)
        x0 = (c.width - W) // 2; y0 = (c.height - Hh) // 2
        c.crop((x0, y0, x0 + W, y0 + Hh)).convert("RGB").save(p)
    else:        # retrato (o app é travado em paisagem; só por garantia): fundo verde + ícone + título
        bg = jungle_gradient(W, Hh)
        ic = master.resize((int(W * 0.55),) * 2, Image.LANCZOS)
        bg.paste(ic, ((W - ic.width) // 2, int(Hh * 0.28)), round_mask(ic.width, 0.18))
        dr = ImageDraw.Draw(bg)
        text(dr, (W / 2, Hh * 0.72), "IBAMAMAN", int(W * 0.13), (255, 210, 63), (20, 24, 18))
        text(dr, (W / 2, Hh * 0.80), "GUARDIÃO DA AMAZÔNIA", int(W * 0.05), (255, 138, 31), (20, 24, 18))
        bg.convert("RGB").save(p)
print("ícones, splash e capa gerados")
