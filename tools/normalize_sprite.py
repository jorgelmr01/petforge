#!/usr/bin/env python3
"""PETFORGE sprite normalizer: rename generated files, resize to target,
flood-fill key near-white background to transparent, verify."""
import sys, os, glob
from PIL import Image
from collections import deque

def key_out(im, thr=242):
    w, h = im.size
    px = im.load()
    def isbg(x, y):
        r, g, b, a = px[x, y]
        return r >= thr and g >= thr and b >= thr
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if isbg(x, y) and not seen[y * w + x]:
                seen[y * w + x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if isbg(x, y) and not seen[y * w + x]:
                seen[y * w + x] = 1; q.append((x, y))
    n = 0
    while q:
        x, y = q.popleft(); n += 1
        px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and isbg(nx, ny):
                seen[ny * w + nx] = 1; q.append((nx, ny))
    return n

def corners_ok(im, lim=16):
    w, h = im.size
    return all(im.getpixel(p)[3] < lim for p in
               [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1)])

def process(d, final, pattern, target, key=True):
    os.chdir(d)
    srcs = sorted(glob.glob(pattern), key=os.path.getmtime)
    srcs = [s for s in srcs if not s.startswith(final)]
    if not srcs:
        print(f"{final}: NO SOURCE MATCHING {pattern}")
        return
    src = srcs[-1]
    im = Image.open(src).convert("RGBA")
    ow, oh = im.size
    resized = (ow, oh) != target
    if resized:
        im = im.resize(target, Image.NEAREST)
    keyed = key_out(im) if key else 0
    dst = final + ".png"
    im.save(dst)
    for s in srcs:
        os.remove(s)
    ok = corners_ok(im)
    print(f"{d}/{dst}: src={ow}x{oh} resized={resized} keyed={keyed} transp_ok={ok}")

if __name__ == "__main__":
    # args: dir final_name src_pattern target_w target_h [nokey]
    d, final, pat = sys.argv[1], sys.argv[2], sys.argv[3]
    tw, th = int(sys.argv[4]), int(sys.argv[5])
    key = len(sys.argv) < 7 or sys.argv[6] != "nokey"
    process(d, final, pat, (tw, th), key)
