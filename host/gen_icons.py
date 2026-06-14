#!/usr/bin/env python3
"""Generuje ikony rozszerzenia (czerwony kwadrat z biala strzalka w dol)
przy uzyciu wylacznie biblioteki standardowej (struct + zlib)."""
import struct
import zlib
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "extension", "icons")

RED = (197, 40, 40)     # #c52828
WHITE = (255, 255, 255)


def in_arrow(nx, ny):
    """nx, ny w zakresie 0..1. Zwraca True dla bialego piksela strzalki."""
    # trzon strzalki
    if 0.42 <= nx <= 0.58 and 0.20 <= ny <= 0.55:
        return True
    # grot (trojkat skierowany w dol)
    if 0.50 <= ny <= 0.80:
        hw = 0.30 * (0.80 - ny) / (0.80 - 0.50)
        if (0.5 - hw) <= nx <= (0.5 + hw):
            return True
    # podkreslenie (linia "podlogi")
    if 0.86 <= ny <= 0.93 and 0.28 <= nx <= 0.72:
        return True
    return False


def make_png(size):
    rows = bytearray()
    r = size * 0.18  # promien zaokraglenia rogow
    for y in range(size):
        rows.append(0)  # filtr 0 dla kazdego wiersza
        for x in range(size):
            # zaokraglone rogi -> przezroczystosc
            cx = min(x, size - 1 - x)
            cy = min(y, size - 1 - y)
            alpha = 255
            if cx < r and cy < r:
                dx, dy = r - cx, r - cy
                if (dx * dx + dy * dy) ** 0.5 > r:
                    alpha = 0
            nx, ny = (x + 0.5) / size, (y + 0.5) / size
            col = WHITE if in_arrow(nx, ny) else RED
            rows += bytes((col[0], col[1], col[2], alpha))
    return rows


def png_bytes(size):
    raw = make_png(size)

    def chunk(typ, data):
        c = typ + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (16, 48, 128):
        path = os.path.join(OUT_DIR, f"icon{size}.png")
        with open(path, "wb") as f:
            f.write(png_bytes(size))
        print("zapisano", os.path.abspath(path))


if __name__ == "__main__":
    main()
