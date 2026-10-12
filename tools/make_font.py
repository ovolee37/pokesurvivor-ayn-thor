# -*- coding: utf-8 -*-
"""Fuente del juego con números más fáciles de distinguir.

Pixelify Sans (OFL) dibuja el 2, el 5, el 8 (y la S) casi iguales, todos
redondeados. Este script saca dos versiones fijas de la fuente variable
(normal 400 y negrita 700) y redibuja los números con un mapa de píxeles de
5x7 más anguloso: el 2 con escalones, el 5 con la esquina recta, el 8
estrechado por la cintura... Las esquinas siguen recortadas como en el resto
de letras para que no desentonen.

    python tools/make_font.py   ->  assets/fonts/PixelifyPS-400.ttf y -700.ttf

Necesita fontTools (pip install fonttools). La fuente cambia de nombre
("Pixelify PS"), como pide la licencia OFL para versiones modificadas.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'fonts', 'PixelifySans.ttf')
OUT = os.path.join(ROOT, 'assets', 'fonts', 'PixelifyPS-{}.ttf')
FAMILY = 'Pixelify PS'

# 5 columnas x 7 filas, de arriba abajo. '#' = píxel.
DIGITS = {
    'zero':  ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'two':   ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    'three': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    'four':  ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    'five':  ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    'six':   ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    'seven': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    'eight': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    'nine':  ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
}


def build(weight):
    font = instancer.instantiateVariableFont(TTFont(SRC), {'wght': weight})
    glyf, hmtx = font['glyf'], font['hmtx']
    # Caja de los números de la fuente original (la del 0) y grosor de su trazo.
    z = glyf['zero']
    coords = z.getCoordinates(glyf)[0]
    xs = sorted(set(x for x, _ in coords))
    ys = sorted(set(y for _, y in coords))
    x0, x1, y0, y1 = xs[0], xs[-1], ys[0], ys[-1]
    stroke = xs[2] - xs[0]                    # p. ej. 60 -> 161 en la normal
    cw, ch = (x1 - x0) / 5, (y1 - y0) / 7
    bleed = max(0, (stroke - cw) / 2)        # la negrita tiene el trazo más gordo que un píxel
    for name, rows in DIGITS.items():
        pen = TTGlyphPen(glyf)
        for r, row in enumerate(rows):
            c = 0
            while c < 5:
                if row[c] != '#':
                    c += 1
                    continue
                c2 = c
                while c2 + 1 < 5 and row[c2 + 1] == '#':
                    c2 += 1
                # Tramo horizontal de píxeles (con algo de grosor extra en la negrita),
                # sin salirse de la caja original.
                ax = round(max(x0, x0 + c * cw - bleed))
                bx = round(min(x1, x0 + (c2 + 1) * cw + bleed))
                top = round(min(y1, y1 - r * ch + bleed))
                bot = round(max(y0, y1 - (r + 1) * ch - bleed))
                pen.moveTo((ax, bot)); pen.lineTo((ax, top)); pen.lineTo((bx, top)); pen.lineTo((bx, bot))
                pen.closePath()
                c = c2 + 1
        g = pen.glyph()
        g.recalcBounds(glyf)
        glyf[name] = g
        hmtx[name] = (hmtx[name][0], g.xMin)
    # Nombre nuevo (OFL: una versión modificada no debe llamarse igual).
    style = 'Regular' if weight == 400 else 'Bold'
    for rec in font['name'].names:
        if rec.nameID in (1, 16):
            rec.string = FAMILY
        elif rec.nameID == 4:
            rec.string = FAMILY + ' ' + style
        elif rec.nameID == 6:
            rec.string = FAMILY.replace(' ', '') + '-' + style
        elif rec.nameID == 17:
            rec.string = style
    font.save(OUT.format(weight))
    print('ok:', os.path.basename(OUT.format(weight)), 'pixel', round(cw), 'x', round(ch), 'extra', round(bleed))


if __name__ == '__main__':
    for w in (400, 700):
        build(w)
