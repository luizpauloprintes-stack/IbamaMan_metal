"""Ciclos de animação desenhados (folhas do Gemini em tools/source_sheets/cycles/).
Rode DEPOIS de build_sheets.py e build_motion.py: substitui os ciclos gerados pelo rig.

Cada folha: fundo branco, um quadro por figura (linhas de cima para baixo, esquerda → direita).
Cada quadro é recortado, escalado com a mesma escala para a folha toda (pela figura de referência),
alinhado pelo chão da sua linha (preserva pulos) e pelo centro do tronco (sem "escorregar").
"""
import os, json, sys
import numpy as np
import cv2
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "source_sheets", "cycles")
SP = os.path.join(ROOT, "public", "assets", "sprites")
MAN = os.path.join(SP, "manifest.json")
RES = 2

# key: (arquivo, quadro W×H lógico, altura lógica da figura de referência, índice da referência,
#       âncora 'torso' (pessoas) ou 'box' (animais), quadros a usar (None = todos))
SHEETS = {
    "enemy_miner_walk":  ("garimpeiro_corrida.jpg", (128, 64), 60, 0, "torso", None),
    "enemy_logger_walk": ("madeireiro_corrida.jpg", (128, 84), 62, 0, "torso", None),
    "baron_walk_n":      ("barao_andar.jpg", (96, 84), 80, 0, "torso", None, 5),  # 5 colunas: as motosserras encostam no vizinho
    "baron_walk_r":      ("barao_furioso_corrida.jpg", (96, 84), 74, 0, "torso", None),
    "player_throw":      ("heroi_bomba.jpg", (96, 64), 62, 0, "torso", [1, 2, 3, 4, 5]),  # 0 e 6 = parado
    "animal_macaw":      ("arara_voo.jpg", (64, 64), 50, 0, "box", None),
    "animal_jaguar":     ("onca_corrida.jpg", (64, 64), 26, 0, "box", None),
    "animal_monkey":     ("macaco_corrida.jpg", (64, 64), 38, 0, "box", None),
    "animal_manatee":    ("peixeboi_nado.jpg", (64, 64), 22, 0, "box", None),
}


def figures(path, cols=None):
    im = cv2.imread(path)
    near = im.min(axis=2) > 225
    lab, _ = ndimage.label(near)
    border = list(set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0})
    bg = np.isin(lab, border)
    holes = near & ~bg                                   # branco preso entre pernas/asas
    hl, hn = ndimage.label(holes)
    if hn:
        sz = ndimage.sum(holes, hl, range(1, hn + 1))
        bg |= np.isin(hl, [i + 1 for i, s in enumerate(sz) if s > 600])
    fg = ndimage.binary_opening(~bg, iterations=1)
    alpha = (fg * 255).astype(np.uint8)
    rgba = np.dstack([im, alpha])
    if cols:  # figuras encostadas: divide em colunas iguais
        cw = im.shape[1] / cols
        out = []
        for c in range(cols):
            x0, x1 = int(c * cw), int((c + 1) * cw)
            m = fg[:, x0:x1].copy()
            # mantém só a figura principal da coluna (descarta a ponta da motosserra do vizinho)
            gl, gn = ndimage.label(ndimage.binary_dilation(m, iterations=4))
            if gn > 1:
                gs = ndimage.sum(m, gl, range(1, gn + 1))
                m &= gl == int(np.argmax(gs)) + 1
            ys = np.where(m.any(axis=1))[0]
            crop = rgba[ys.min():ys.max() + 1, x0:x1].copy()
            crop[..., 3] = np.where(m[ys.min():ys.max() + 1], 255, 0)
            out.append(dict(img=crop, x0=x0, y0=ys.min(), y1=ys.max() + 1))
        base = max(f["y1"] for f in out)
        for f in out: f["lift"] = base - f["y1"]
        return out
    grp, n = ndimage.label(ndimage.binary_dilation(fg, iterations=7))
    objs = ndimage.find_objects(grp)
    sizes = ndimage.sum(fg, grp, range(1, n + 1))
    big = max(sizes)
    figs = []
    for i, sl in enumerate(objs):
        if sizes[i] < big * 0.15:
            continue
        m = (grp[sl] == i + 1) & fg[sl]
        crop = rgba[sl].copy(); crop[..., 3] = np.where(m, 255, 0)
        figs.append(dict(img=crop, x0=sl[1].start, y0=sl[0].start, y1=sl[0].stop))
    # figuras grudadas (ex.: dois quadros encostados): divide no vão mais estreito
    med = np.median([f["img"].shape[1] for f in figs])
    split = []
    for f in figs:
        im_, w = f["img"], f["img"].shape[1]
        k = int(round(w / med))
        if k >= 2:
            dens = (im_[..., 3] > 0).sum(axis=0)
            cuts = []
            for j in range(1, k):
                c = int(w * j / k); lo, hi = int(c - w * 0.12), int(c + w * 0.12)
                cuts.append(lo + int(np.argmin(dens[lo:hi])))
            edges = [0] + cuts + [w]
            for a, b in zip(edges[:-1], edges[1:]):
                part = im_[:, a:b].copy()
                ys = np.where(part[..., 3].any(axis=1))[0]
                split.append(dict(img=part[ys.min():ys.max() + 1], x0=f["x0"] + a,
                                  y0=f["y0"] + ys.min(), y1=f["y0"] + ys.max() + 1))
        else:
            split.append(f)
    figs = split
    # linhas: agrupa pelo centro vertical
    figs.sort(key=lambda f: (f["y0"] + f["y1"]) / 2)
    rows, cur = [], [figs[0]]
    for f in figs[1:]:
        if (f["y0"] + f["y1"]) / 2 - (cur[-1]["y0"] + cur[-1]["y1"]) / 2 > (cur[-1]["y1"] - cur[-1]["y0"]) * 0.5:
            rows.append(cur); cur = [f]
        else:
            cur.append(f)
    rows.append(cur)
    out = []
    for r in rows:
        base = max(f["y1"] for f in r)                  # chão da linha
        for f in sorted(r, key=lambda f: f["x0"]):
            f["lift"] = base - f["y1"]
            out.append(f)
    return out


def anchor_x(img, mode):
    a = img[..., 3] > 0
    if mode == "box":
        xs = np.where(a.any(axis=0))[0]; return (xs.min() + xs.max()) / 2
    h = a.shape[0]
    top = a[: int(h * 0.45)]                            # cabeça + tronco
    xs = np.where(top)[1]
    return xs.mean() if len(xs) else a.shape[1] / 2


def build(key, cfg):
    fname, (FW, FH), ref_h, ref_i, mode, use = cfg[:6]
    figs = figures(os.path.join(SRC, fname), cfg[6] if len(cfg) > 6 else None)
    if use:
        figs = [figs[i] for i in use]
    ref = figs[ref_i]["img"]
    ys = np.where(ref[..., 3] > 0)[0]
    s = ref_h * RES / (ys.max() - ys.min() + 1)
    W, H = FW * RES, FH * RES
    frames = []
    for f in figs:
        img = f["img"]
        w, h = max(1, round(img.shape[1] * s)), max(1, round(img.shape[0] * s))
        rgb = img[..., :3].astype(np.float32); al = img[..., 3:].astype(np.float32) / 255
        pm = cv2.resize(rgb * al, (w, h), interpolation=cv2.INTER_AREA)
        ar = cv2.resize(al, (w, h), interpolation=cv2.INTER_AREA)[..., None]
        col = np.where(ar > 0.01, pm / np.maximum(ar, 1e-3), 0)
        small = np.dstack([np.clip(col, 0, 255), np.where(ar > 0.45, 255, 0)]).astype(np.uint8)
        fr = np.zeros((H, W, 4), np.uint8)
        ax = anchor_x(small, mode)
        x = int(round(W / 2 - ax))
        y = H - h - int(round(f["lift"] * s))
        sx0, sy0 = max(0, -x), max(0, -y)
        dx0, dy0 = max(0, x), max(0, y)
        ww, hh = min(w - sx0, W - dx0), min(h - sy0, H - dy0)
        src = small[sy0:sy0 + hh, sx0:sx0 + ww]
        fr[dy0:dy0 + hh, dx0:dx0 + ww] = np.where(src[..., 3:] > 0, src, fr[dy0:dy0 + hh, dx0:dx0 + ww])
        frames.append(fr)
    return frames, W, H          # tamanho do quadro em PIXELS da imagem (o manifest usa pixels)


manifest = json.load(open(MAN))
def save(key, frames, fw, fh):
    global manifest
    cv2.imwrite(os.path.join(SP, key + ".png"), np.concatenate(frames, axis=1))
    manifest = [e for e in manifest if e["key"] != key]
    manifest.append({"key": key, "file": key + ".png", "frameWidth": fw, "frameHeight": fh, "res": RES})

counts = {}
built = {k: build(k, c) for k, c in SHEETS.items()}
for k, (fr, fw, fh) in built.items():
    counts[k] = len(fr)
# Barão: uma sheet só (normal seguido do enfurecido)
n, fw, fh = built.pop("baron_walk_n"); r, _, _ = built.pop("baron_walk_r")
save("boss_baron_walk", n + r, fw, fh)
for k, (fr, fw, fh) in built.items():
    save(k, fr, fw, fh)
manifest = [e for e in manifest if e["key"] != "animals_free"]   # substituído pelas sheets animal_*
if os.path.exists(os.path.join(SP, "animals_free.png")): os.remove(os.path.join(SP, "animals_free.png"))
json.dump(manifest, open(MAN, "w"), indent=1)
json.dump(counts, open(os.path.join(SP, "cycles.json"), "w"), indent=1)
print(counts)
