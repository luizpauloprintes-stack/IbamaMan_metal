"""Gera quadros de movimento a partir dos sprites estáticos (rode DEPOIS de tools/build_sheets.py).

A arte original tem 1 pose por ação; aqui cada pose vira um ciclo animado:
- humanos (garimpeiro, madeireiro, Barão): ciclo de passada de 6 quadros — as pernas são separadas
  na altura do quadril e cada uma gira para um lado (passo), o tronco sobe/desce e balança;
- onça e macaco: galope/andar de 6 quadros (patas da frente e de trás em oposição + flexão do corpo);
- arara: bater de asas de 6 quadros (asas comprimem/abrem em torno da linha dos ombros);
- peixe-boi: nado de 6 quadros (a cauda ondula para cima e para baixo).

Saída: public/assets/sprites/<key>.png + entradas no manifest.json.
"""
import os, json
import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.join(ROOT, "public", "assets", "sprites")
MAN = os.path.join(SP, "manifest.json")
manifest = json.load(open(MAN))
meta = {e["key"]: e for e in manifest}
N = 8  # quadros por ciclo
MINER_CUT = 162  # coluna (px da sheet 2x) onde começa o jato no quadro 1 do garimpeiro


def frames_of(key):
    e = meta[key]
    im = cv2.imread(os.path.join(SP, e["file"]), cv2.IMREAD_UNCHANGED)
    fw, fh = e["frameWidth"], e["frameHeight"]
    return [im[:, i * fw:(i + 1) * fw].copy() for i in range(im.shape[1] // fw)], fw, fh


def bbox(f):
    ys, xs = np.where(f[:, :, 3] > 0)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def blit(dst, src, dx, dy):
    """Cola src sobre dst deslocado (dx, dy), respeitando alpha binário."""
    h, w = src.shape[:2]
    H, W = dst.shape[:2]
    x0, y0 = max(0, dx), max(0, dy)
    x1, y1 = min(W, dx + w), min(H, dy + h)
    if x1 <= x0 or y1 <= y0:
        return
    s = src[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
    m = s[:, :, 3:] > 0
    dst[y0:y1, x0:x1] = np.where(m, s, dst[y0:y1, x0:x1])


def rot_part(part, angle_deg, pivot):
    """Gira uma camada RGBA em torno de pivot (x, y), vizinho mais próximo (mantém o pixel art)."""
    M = cv2.getRotationMatrix2D((float(pivot[0]), float(pivot[1])), float(angle_deg), 1.0)
    return cv2.warpAffine(part, M, (part.shape[1], part.shape[0]), flags=cv2.INTER_NEAREST,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


def walk_cycle(f, hip=0.56, swing=13.0, bob=None, sway=1.5):
    """Passada humana: pernas giram em oposição a partir do quadril; tronco sobe/desce e balança."""
    x0, y0, x1, y1 = bbox(f)
    H = y1 - y0
    hy = int(y0 + H * hip)
    bob = bob if bob is not None else max(2, round(H * 0.03))
    band = f[y1 - max(4, H // 8):y1, :, 3] > 0
    cx = int(np.where(band)[1].mean()) if band.any() else (x0 + x1) // 2
    ov = max(4, H // 14)                          # sobreposição: o tronco cobre o topo das pernas
    legs = f.copy(); legs[:hy - ov] = 0
    left = legs.copy(); left[:, cx:] = 0
    right = legs.copy(); right[:, :cx] = 0
    torso = f.copy(); torso[hy + 2:] = 0
    out = []
    for i in range(N):
        ph = 2 * np.pi * i / N
        a = swing * np.sin(ph)                       # ângulo da perna
        lift = round(bob * abs(np.cos(ph)))          # passagem (pernas juntas) = corpo mais alto
        sw = round(sway * np.sin(ph * 2))
        fr = np.zeros_like(f)
        # perna de trás primeiro, depois a da frente (a da frente fica por cima)
        L = rot_part(left, a, (cx - 2, hy)); R = rot_part(right, -a, (cx + 2, hy))
        back, front = (L, R) if a >= 0 else (R, L)
        blit(fr, back, 0, -lift // 2)
        blit(fr, front, 0, -lift // 2)
        blit(fr, torso, sw, -lift)
        # pés no chão: recoloca a base do conteúdo na mesma linha do original
        _, _, _, ny1 = bbox(fr)
        fr2 = np.zeros_like(fr); blit(fr2, fr, 0, y1 - ny1)
        out.append(fr2)
    return out


def quadruped_cycle(f, body_y=0.55, swing=16.0, flex=0.06):
    """Galope/andar de quadrúpede (sprite virado para a direita): patas da frente e de trás em oposição."""
    x0, y0, x1, y1 = bbox(f)
    H, W = y1 - y0, x1 - x0
    hy = int(y0 + H * body_y)
    cx = (x0 + x1) // 2
    ov = max(4, H // 10)
    legs = f.copy(); legs[:hy - ov] = 0
    back_legs = legs.copy(); back_legs[:, cx:] = 0
    front_legs = legs.copy(); front_legs[:, :cx] = 0
    body = f.copy(); body[hy + 2:] = 0
    out = []
    for i in range(N):
        ph = 2 * np.pi * i / N
        a = swing * np.sin(ph)
        fr = np.zeros_like(f)
        blit(fr, rot_part(back_legs, -a, (x0 + W * 0.28, hy)), 0, 0)
        blit(fr, rot_part(front_legs, a, (x0 + W * 0.72, hy)), 0, 0)
        # corpo arqueia (galope): leve rotação e sobe na fase de suspensão
        b = rot_part(body, 4 * np.sin(ph) * (flex / 0.06), (cx, hy))
        blit(fr, b, 0, -round(3 * max(0, np.sin(ph))))
        _, _, _, ny1 = bbox(fr)
        fr2 = np.zeros_like(fr); blit(fr2, fr, 0, y1 - ny1)
        out.append(fr2)
    return out


def flap_cycle(f, shoulder=0.48):
    """Arara: a parte de cima (asas) comprime até a linha dos ombros e reabre; na batida as asas descem."""
    x0, y0, x1, y1 = bbox(f)
    sy = int(y0 + (y1 - y0) * shoulder)
    top = f[y0:sy].copy(); rest = f.copy(); rest[:sy] = 0
    out = []
    for i in range(N):
        ph = 2 * np.pi * i / N
        k = 0.5 + 0.5 * np.cos(ph)                 # 1 = asas em cima, 0 = asas embaixo
        fr = np.zeros_like(f)
        h_up = max(1, round(top.shape[0] * (0.15 + 0.85 * k)))
        up = cv2.resize(top, (top.shape[1], h_up), interpolation=cv2.INTER_NEAREST)
        blit(fr, rest, 0, round(-3 * k))           # corpo sobe quando as asas descem (impulso)
        blit(fr, up, 0, sy - h_up + round(-3 * k))
        if k < 0.45:                               # asas abaixo da linha dos ombros na batida
            h_dn = max(1, round(top.shape[0] * (0.45 - k)))
            dn = cv2.resize(top[::-1], (top.shape[1], h_dn), interpolation=cv2.INTER_NEAREST)
            blit(fr, dn, 0, sy)
            blit(fr, rest, 0, round(-3 * k))       # corpo por cima das asas de baixo
        out.append(fr)
    return out


def swim_cycle(f, tail=0.38, amp=None):
    """Peixe-boi (virado para a direita): a cauda (parte esquerda) ondula; o corpo acompanha de leve."""
    x0, y0, x1, y1 = bbox(f)
    W = x1 - x0
    tx = int(x0 + W * tail)
    amp = amp if amp is not None else max(4, round((y1 - y0) * 0.18))
    out = []
    for i in range(N):
        ph = 2 * np.pi * i / N
        fr = np.zeros_like(f)
        for x in range(x0, x1):
            if x < tx:
                t = (tx - x) / max(1, tx - x0)     # 0 na base da cauda → 1 na ponta
                dy = round(amp * np.sin(ph - t * 1.6) * t ** 1.3)
            else:
                dy = round(1.5 * np.sin(ph + (x - tx) * 0.02))
            col = f[:, x:x + 1]
            blit(fr, col, x, dy)
        out.append(fr)
    return out



# =========================================================================== RIG DE RECORTE
# Cada personagem é dividido em partes (cabeça, tronco com braços/arma, coxa e canela de cada perna)
# que giram em torno das articulações (pescoço, quadril, joelho) — animação "cutout", como em Flash.
# Coordenadas das articulações são frações da caixa do conteúdo (medidas uma vez por personagem).

def A(angle, pivot):
    m = cv2.getRotationMatrix2D((float(pivot[0]), float(pivot[1])), float(angle), 1.0)
    return np.vstack([m, [0, 0, 1]])


def warp(layer, M):
    return cv2.warpAffine(layer, M[:2], (layer.shape[1], layer.shape[0]), flags=cv2.INTER_NEAREST,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


def apply(M, pt):
    v = M @ np.array([pt[0], pt[1], 1.0])
    return (v[0], v[1])


def region(f, y0=None, y1=None, x0=None, x1=None):
    r = np.zeros_like(f)
    ys = slice(None if y0 is None else max(0, int(y0)), None if y1 is None else int(y1))
    xs = slice(None if x0 is None else max(0, int(x0)), None if x1 is None else int(x1))
    r[ys, xs] = f[ys, xs]
    return r


def col_center(f, y, x0, x1, band=3):
    a = f[max(0, int(y) - band):int(y) + band, max(0, int(x0)):int(x1), 3] > 0
    xs = np.where(a)[1]
    return (x0 + xs.mean()) if len(xs) else (x0 + x1) / 2


def human_rig(f, hip, knee, neck, cx, thigh=22, kneebend=38, lean=3.0, nod=3.0, torso_sway=2.0, erase=()):
    """Corrida de bípede: coxas alternam ±thigh°, joelho dobra até kneebend° na fase de avanço,
    tronco inclina e oscila, cabeça balança. Os pés são reposicionados no chão a cada quadro."""
    f = f.copy()
    X0, Y0, X1, Y1 = bbox(f)
    W, H = X1 - X0, Y1 - Y0
    for (a, b, c, d) in erase:                          # props a ignorar (ex.: mangueira no chão)
        f[int(Y0 + b * H):int(Y0 + d * H), int(X0 + a * W):int(X0 + c * W)] = 0
    X0, Y0, X1, Y1 = bbox(f)
    W, H = X1 - X0, Y1 - Y0
    hy, ky, ny = Y0 + hip * H, Y0 + knee * H, Y0 + neck * H
    cxp = X0 + cx * W
    ov = max(3, H // 22)
    head = region(f, None, ny + ov)
    torso = region(f, ny - 1, hy + ov)
    legs = []
    for side, (lx0, lx1) in (("back", (X0 - 2, cxp)), ("front", (cxp, X1 + 2))):
        th = region(f, hy - ov, ky + ov, lx0, lx1)
        sh = region(f, ky - ov, None, lx0, lx1)
        hp = (col_center(f, hy + ov, lx0, lx1), hy)
        kp = (col_center(f, ky, lx0, lx1), ky)
        legs.append((side, th, sh, hp, kp))
    hip_c = (cxp, hy)
    neck_c = (col_center(f, ny, X0, X1), ny)
    out = []
    for i in range(N):
        ph = 2 * np.pi * i / N
        fr = np.zeros_like(f)
        T = A(-(lean + torso_sway * np.sin(2 * ph)), hip_c)          # tronco inclina para frente (sentido horário)
        Hd = T @ A(nod * np.sin(2 * ph + 0.8), neck_c)
        layers = []
        for side, th, sh, hp, kp in legs:
            p = ph if side == "front" else ph + np.pi
            a_th = thigh * np.sin(p)                                  # + = para frente
            a_kn = -kneebend * max(0.0, np.cos(p)) ** 1.3 - 6         # joelho dobra na fase de avanço
            Mt = A(a_th, hp)
            Ms = Mt @ A(a_kn, kp)
            layers.append((side, warp(th, Mt), warp(sh, Ms)))
        for side, t_, s_ in sorted(layers, key=lambda l: 0 if l[0] == "back" else 1):
            blit(fr, s_, 0, 0); blit(fr, t_, 0, 0)
        blit(fr, warp(torso, T), 0, 0)
        blit(fr, warp(head, Hd), 0, 0)
        _, _, _, ny1 = bbox(fr)
        fr2 = np.zeros_like(fr); blit(fr2, fr, 0, Y1 - ny1)
        out.append(fr2)
    return out


def quad_rig(f, legs_y, knee, back_x, front_x, swing=(18, 22), kneebend=30, spine=3.0,
             tail=None, gallop=True):
    """Quadrúpede: par de trás e par da frente com coxa+canela, defasados (galope) ou alternados (andar).
    tail = (x0, y0, x1, y1, pivot_x, pivot_y, ângulo) em frações; coluna oscila ±spine°."""
    X0, Y0, X1, Y1 = bbox(f)
    W, H = X1 - X0, Y1 - Y0
    ly, ky = Y0 + legs_y * H, Y0 + knee * H
    ov = max(3, H // 18)
    bx, fx = X0 + back_x * W, X0 + front_x * W
    body = region(f, None, ly + ov)
    tail_layer = None
    if tail:
        tx0, ty0, tx1, ty1, px, py, ta = tail
        tail_layer = region(f, Y0 + ty0 * H, Y0 + ty1 * H, X0 + tx0 * W, X0 + tx1 * W)
        body[int(Y0 + ty0 * H):int(Y0 + ty1 * H), int(X0 + tx0 * W):int(X0 + tx1 * W)] = 0
        tail_piv = (X0 + px * W, Y0 + py * H)
    groups = [("back", X0 - 2, bx), ("front", fx, X1 + 2)]
    rigs = []
    for name, a, b in groups:
        th = region(f, ly - ov, ky + ov, a, b)
        sh = region(f, ky - ov, None, a, b)
        rigs.append((name, th, sh, (col_center(f, ly + ov, a, b), ly), (col_center(f, ky, a, b), ky)))
    mid = region(f, ly - ov, None, bx, fx)          # barriga entre os pares fica com o corpo
    center = ((X0 + X1) / 2, ly)
    out = []
    for i in range(N):
        ph = 2 * np.pi * i / N
        fr = np.zeros_like(f)
        Mb = A(spine * np.sin(ph), center)
        for name, th, sh, hp, kp in rigs:
            p = ph + (0 if name == "front" else (np.pi * 0.55 if gallop else np.pi))
            sw = swing[1] if name == "front" else swing[0]
            a_th = sw * np.sin(p) * (1 if name == "front" else -1)
            a_kn = (-1 if name == "front" else 1) * kneebend * max(0.0, np.cos(p)) ** 1.3
            Mt = Mb @ A(a_th, hp)
            blit(fr, warp(sh, Mt @ A(a_kn, kp)), 0, 0)
            blit(fr, warp(th, Mt), 0, 0)
        blit(fr, warp(mid, Mb), 0, 0)
        blit(fr, warp(body, Mb), 0, 0)
        if tail_layer is not None:
            blit(fr, warp(tail_layer, Mb @ A(tail[6] * np.sin(ph + 1.2), tail_piv)), 0, 0)
        _, _, _, ny1 = bbox(fr)
        fr2 = np.zeros_like(fr); blit(fr2, fr, 0, Y1 - ny1 - (round(H * 0.04 * max(0, np.sin(ph))) if gallop else 0))
        out.append(fr2)
    return out

def clean(f, min_px=24):
    """Remove pedacinhos soltos (restos de recorte) de um quadro."""
    from scipy import ndimage
    a = f[:, :, 3] > 0
    lab, n = ndimage.label(a)
    if n:
        sizes = ndimage.sum(a, lab, range(1, n + 1))
        f[np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s < min_px])] = 0
    return f


def save_sheet(key, frames, fw, fh):
    sheet = np.concatenate([clean(f) for f in frames], axis=1)
    cv2.imwrite(os.path.join(SP, key + ".png"), sheet)
    global manifest
    manifest = [e for e in manifest if e["key"] != key]
    manifest.append({"key": key, "file": key + ".png", "frameWidth": fw, "frameHeight": fh, "res": 2})


# ---------------------------------------------------------------- humanos (rig de recorte)
fr, fw, fh = frames_of("enemy_miner_hose")
base = fr[1].copy(); base[:, MINER_CUT:] = 0            # garimpeiro HD sem o jato de lama
fr[0] = base                                            # pose parada = mesmo personagem HD
cv2.imwrite(os.path.join(SP, meta["enemy_miner_hose"]["file"]), np.concatenate(fr, axis=1))
# mangueira no chão e o trecho que desce até o chão não andam com as pernas: ficam de fora da passada
save_sheet("enemy_miner_walk", human_rig(base, hip=0.62, knee=0.8, neck=0.33, cx=0.62, thigh=20, kneebend=40,
                                         erase=[(0, 0.86, 0.72, 1.01), (0, 0.55, 0.36, 0.86)]), fw, fh)

fr, fw, fh = frames_of("enemy_logger")
save_sheet("enemy_logger_walk", human_rig(fr[0], hip=0.62, knee=0.8, neck=0.33, cx=0.45, thigh=18, kneebend=36), fw, fh)

fr, fw, fh = frames_of("boss_baron")
save_sheet("boss_baron_walk", human_rig(fr[0], hip=0.6, knee=0.8, neck=0.27, cx=0.42, thigh=16, kneebend=30, lean=2) +
           human_rig(fr[1], hip=0.6, knee=0.8, neck=0.27, cx=0.42, thigh=20, kneebend=36, lean=4, nod=5), fw, fh)

# ---------------------------------------------------------------- animais libertados (1 = arara, 3 = onça, 5 = macaco, 7 = peixe-boi)
fr, fw, fh = frames_of("wildlife_cages")
animals = (flap_cycle(fr[1])
           + quad_rig(fr[3], legs_y=0.6, knee=0.78, back_x=0.33, front_x=0.62, swing=(22, 26), kneebend=34, spine=3)
           + quad_rig(fr[5], legs_y=0.64, knee=0.82, back_x=0.5, front_x=0.6, swing=(16, 20), kneebend=28, spine=2,
                      tail=(0, 0, 0.34, 0.72, 0.3, 0.66, 7), gallop=False)
           + swim_cycle(fr[7]))
save_sheet("animals_free", animals, fw, fh)

json.dump(manifest, open(MAN, "w"), indent=1)
print("ciclos de movimento gerados:", N, "quadros por ciclo (rig de recorte)")
