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
N = 6  # quadros por ciclo
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


def save_sheet(key, frames, fw, fh):
    sheet = np.concatenate(frames, axis=1)
    cv2.imwrite(os.path.join(SP, key + ".png"), sheet)
    global manifest
    manifest = [e for e in manifest if e["key"] != key]
    manifest.append({"key": key, "file": key + ".png", "frameWidth": fw, "frameHeight": fh, "res": 2})


# ---------------------------------------------------------------- humanos
fr, fw, fh = frames_of("enemy_miner_hose")
base = fr[1].copy(); base[:, MINER_CUT:] = 0            # garimpeiro HD sem o jato de lama
fr[0] = base                                            # pose parada = mesmo personagem HD
cv2.imwrite(os.path.join(SP, meta["enemy_miner_hose"]["file"]), np.concatenate(fr, axis=1))
save_sheet("enemy_miner_walk", walk_cycle(base, hip=0.6, swing=12), fw, fh)

fr, fw, fh = frames_of("enemy_logger")
save_sheet("enemy_logger_walk", walk_cycle(fr[0], hip=0.58, swing=12), fw, fh)

fr, fw, fh = frames_of("boss_baron")
save_sheet("boss_baron_walk", walk_cycle(fr[0], hip=0.6, swing=11) + walk_cycle(fr[1], hip=0.6, swing=13), fw, fh)

# ---------------------------------------------------------------- animais libertados (1 = arara, 3 = onça, 5 = macaco, 7 = peixe-boi)
fr, fw, fh = frames_of("wildlife_cages")
animals = flap_cycle(fr[1]) + quadruped_cycle(fr[3], body_y=0.52, swing=20) + \
    quadruped_cycle(fr[5], body_y=0.55, swing=18, flex=0.03) + swim_cycle(fr[7])
save_sheet("animals_free", animals, fw, fh)

json.dump(manifest, open(MAN, "w"), indent=1)
print("ciclos de movimento gerados:", N, "quadros por ciclo")
