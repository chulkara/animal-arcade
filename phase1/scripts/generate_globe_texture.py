"""Generate the original illustrated globe texture for Noah's Arkade.

Offline asset generator (not run at game time). Produces a seamless
equirectangular albedo map of a *fictional* hand-painted world:
antique-map land colours, engraved coastal water-lines, hatched ridges,
mottled cobalt oceans and parchment grain. Deterministic (fixed seed).

Usage:  python3 scripts/generate_globe_texture.py [out_dir]
Requires: numpy, Pillow.
"""
import sys
import os
import numpy as np
from PIL import Image, ImageFilter

W, H = 2048, 1024
SEED = 1987
rng = np.random.default_rng(SEED)
perm = rng.permutation(256)
P = np.concatenate([perm, perm]).astype(np.int64)
GRAD = np.array([[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                 [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]], dtype=np.float64)


def fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def perlin(x, y, z):
    xi, yi, zi = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), np.floor(z).astype(np.int64)
    xf, yf, zf = x - xi, y - yi, z - zi
    xi, yi, zi = xi & 255, yi & 255, zi & 255
    u, v, w = fade(xf), fade(yf), fade(zf)

    def g(h, dx, dy, dz):
        gr = GRAD[h % 12]
        return gr[..., 0] * dx + gr[..., 1] * dy + gr[..., 2] * dz

    a = P[xi] + yi; aa = P[a] + zi; ab = P[a + 1] + zi
    b = P[xi + 1] + yi; ba = P[b] + zi; bb = P[b + 1] + zi
    x1 = np.interp(0, [0], [0])  # noqa: keeps numpy import used for linters
    l = lambda a_, b_, t: a_ + t * (b_ - a_)
    r = l(l(l(g(P[aa], xf, yf, zf), g(P[ba], xf - 1, yf, zf), u),
            l(g(P[ab], xf, yf - 1, zf), g(P[bb], xf - 1, yf - 1, zf), u), v),
          l(l(g(P[aa + 1], xf, yf, zf - 1), g(P[ba + 1], xf - 1, yf, zf - 1), u),
            l(g(P[ab + 1], xf, yf - 1, zf - 1), g(P[bb + 1], xf - 1, yf - 1, zf - 1), u), v), w)
    return r


def fbm(x, y, z, octaves=6, lac=2.03, gain=0.5, off=0.0):
    total = np.zeros_like(x); amp = 1.0; freq = 1.0; norm = 0.0
    for i in range(octaves):
        total += amp * perlin(x * freq + off + i * 17.13, y * freq + off * 0.7, z * freq - off + i * 3.1)
        norm += amp; amp *= gain; freq *= lac
    return total / norm


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


def mix(a, b, t):
    t = t[..., None] if np.ndim(t) else t
    return a * (1 - t) + b * t


def main(out_dir):
    lon = (np.arange(W) + 0.5) / W * 2 * np.pi - np.pi
    lat = np.pi / 2 - (np.arange(H) + 0.5) / H * np.pi
    LON, LAT = np.meshgrid(lon, lat)
    X = np.cos(LAT) * np.cos(LON); Y = np.sin(LAT); Z = np.cos(LAT) * np.sin(LON)

    # Domain-warped continents (sampled in 3D so the map is seamless).
    s = 1.35
    wx = fbm(X * 1.1, Y * 1.1, Z * 1.1, 4, off=11.0)
    wy = fbm(X * 1.1, Y * 1.1, Z * 1.1, 4, off=29.0)
    cont = fbm(X * s + wx * 0.9, Y * s + wy * 0.9, Z * s - wx * 0.6, 7)
    cont += 0.10 * fbm(X * 6, Y * 6, Z * 6, 3, off=5.0)
    cont -= 0.10 * smooth(0.55, 0.95, np.abs(Y))  # fewer polar landmasses
    sea = 0.055
    land = cont > sea
    coastal = cont - sea  # signed distance-ish

    # --- Oceans: ultramarine/cobalt, painted mottling, shelf and engraved water-lines
    deep = hexc('#14275e'); mid = hexc('#1d3f86'); shelf = hexc('#3a6a9e')
    depth = smooth(-0.32, 0.0, coastal)
    ocean = mix(deep, mid, depth)
    ocean = mix(ocean, shelf, smooth(-0.045, 0.0, coastal) * 0.7)
    brush = fbm(X * 3 + Y * 0.3, Y * 22, Z * 3, 4, off=41.0)  # latitudinal brush strokes
    blot = fbm(X * 5, Y * 5, Z * 5, 5, off=77.0)
    ocean = ocean * (1 + 0.10 * brush + 0.12 * blot)[..., None]
    # Engraved water-lines parallel to coasts (antique cartography)
    band = (-coastal) * 42.0
    line = np.abs(band - np.round(band))
    within = smooth(-0.13, -0.018, coastal) * (1 - smooth(-0.004, 0.0, coastal))
    fadeout = within * (0.55 + 0.45 * smooth(-0.11, -0.02, coastal))
    lines = (1 - smooth(0.06, 0.14, line)) * fadeout
    ocean = mix(ocean, hexc('#b9c7df'), lines * 0.5)

    # --- Land: ochre / sage / umber parchment palette with hatching
    elev = smooth(0.0, 0.42, coastal)
    moist = fbm(X * 2.2, Y * 2.2, Z * 2.2, 5, off=63.0) * 0.5 + 0.5
    parchment = hexc('#dccb9c'); ochre = hexc('#c9a159'); sage = hexc('#8f9d6c')
    umber = hexc('#8a6440'); fern = hexc('#6f8257')
    mq = np.round(moist * 4) / 4
    mq = mq + (moist - mq) * 0.35
    base = mix(ochre, sage, smooth(0.45, 0.55, mq))
    base = mix(base, fern, smooth(0.66, 0.74, mq) * 0.6)
    base = mix(parchment, base, smooth(0.0, 0.05, coastal) * 0.85 + 0.15)
    ridge = 1 - np.abs(fbm(X * 4.5, Y * 4.5, Z * 4.5, 5, off=91.0))
    ridge = ridge ** 6
    mountain = smooth(0.30, 0.6, ridge * (0.35 + elev))
    base = mix(base, umber, mountain * 0.45)
    # Diagonal hatching on ridges (in texture space, broken by noise to feel hand-drawn)
    yy, xx = np.mgrid[0:H, 0:W]
    hatch = np.abs(((xx + yy * 1.6) / 4.0) % 1.0 - 0.5)
    hatchmask = (1 - smooth(0.06, 0.2, hatch)) * mountain * smooth(-0.1, 0.25, fbm(X * 30, Y * 30, Z * 30, 2, off=3.0))
    base = mix(base, hexc('#4b3524'), hatchmask * 0.32)
    paint = fbm(X * 9, Y * 9, Z * 9, 4, off=19.0)
    base = base * (1 + 0.05 * paint)[..., None]
    # Polar snow in warm ivory
    snow = smooth(0.90, 0.96, np.abs(Y) + 0.03 * blot)
    base = mix(base, hexc('#ebe2cc'), snow * 0.9)
    ocean = mix(ocean, hexc('#9fb0c8'), smooth(0.93, 0.995, np.abs(Y)) * 0.55)

    img = np.where(land[..., None], base, ocean)

    # Ink coastline: dark stroke with slight width wobble
    wob = 0.004 + 0.003 * (fbm(X * 12, Y * 12, Z * 12, 2, off=55.0) * 0.5 + 0.5)
    ink = 1 - smooth(wob * 0.45, wob, np.abs(coastal))
    img = mix(img, hexc('#1c1a2c'), ink * 0.85)
    # Inner coastal tint (classic map hand-colouring along borders)
    tint = smooth(0.0, 0.006, coastal) * (1 - smooth(0.006, 0.03, coastal))
    img = mix(img, hexc('#b8743f'), tint * 0.35)

    # Parchment grain over everything
    grain = rng.normal(0, 1, (H, W))
    grain = np.asarray(Image.fromarray(((grain * 18) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float64)
    img = img * (1 + (grain - 128) / 128 * 0.06)[..., None]

    out = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    os.makedirs(out_dir, exist_ok=True)
    im = Image.fromarray(out, 'RGB')
    im.save(os.path.join(out_dir, 'globe-albedo.webp'), 'WEBP', quality=90, method=6)
    im.resize((1024, 512), Image.LANCZOS).save(os.path.join(out_dir, 'globe-albedo-small.webp'), 'WEBP', quality=88, method=6)
    # Land mask (used by the shader for sheen differences)
    Image.fromarray((land * 255).astype(np.uint8)).resize((1024, 512), Image.BILINEAR).save(os.path.join(out_dir, 'globe-landmask.webp'), 'WEBP', quality=85)
    print('land fraction', land.mean().round(3))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'public/textures')
