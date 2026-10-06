#!/usr/bin/env python3
"""Generate the title banner and the three party emblems (SVG) in out/html/img/."""
import os, math

OUT = os.path.join(os.path.dirname(__file__), '..', 'out', 'html', 'img')
os.makedirs(os.path.join(OUT, 'parties'), exist_ok=True)

RED, CREAM, BLACK, GOLD = '#8c1d18', '#f2e6c9', '#1c1c1c', '#c9a227'

def star(cx, cy, r, fill):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.4
        pts.append('%.1f,%.1f' % (cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return '<polygon points="%s" fill="%s"/>' % (' '.join(pts), fill)

def title():
    # The diagonal runs between the text (left, on black) and the star (right, on red).
    # textLength fixes the width of each line so that it fits in any fallback font.
    s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 260" width="900" height="260">',
         '<rect width="900" height="260" fill="%s"/>' % RED,
         '<polygon points="0,0 700,0 610,260 0,260" fill="%s"/>' % BLACK,
         '<polygon points="700,0 900,0 900,260 610,260" fill="%s" opacity="0.14"/>' % CREAM,
         '<circle cx="772" cy="130" r="84" fill="%s"/>' % CREAM,
         star(772, 130, 64, RED),
         '<rect x="20" y="20" width="860" height="220" fill="none" stroke="%s" stroke-width="4"/>' % CREAM,
         '<text x="52" y="124" textLength="590" lengthAdjust="spacingAndGlyphs" font-family="Impact, \'Arial Black\', \'Helvetica Neue\', sans-serif" font-size="100" fill="%s">RED OCTOBER</text>' % CREAM,
         '<rect x="54" y="142" width="440" height="6" fill="%s"/>' % GOLD,
         '<text x="54" y="190" textLength="500" lengthAdjust="spacing" font-family="Georgia, \'Times New Roman\', serif" font-size="38" fill="%s">FALL OF EMPIRE</text>' % CREAM,
         '<text x="56" y="219" textLength="260" lengthAdjust="spacing" font-family="Georgia, serif" font-size="16" fill="%s">RUSSIA 1917 \u2013 1921</text>' % GOLD,
         '</svg>']
    open(os.path.join(OUT, 'title.svg'), 'w', encoding='utf-8').write('\n'.join(s))

def frame(bg, body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">'
            '<rect width="160" height="160" fill="%s"/>%s<rect x="6" y="6" width="148" height="148" fill="none" stroke="%s" stroke-width="3"/></svg>' % (bg, body, CREAM))

def plain(name, color):
    """A plain coloured square: the emblems are blank for now."""
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">'
           '<rect width="160" height="160" fill="%s"/><rect x="8" y="8" width="144" height="144" fill="none" stroke="%s" stroke-width="2" opacity="0.7"/></svg>' % (color, CREAM))
    open(os.path.join(OUT, 'parties', name + '.svg'), 'w', encoding='utf-8').write(svg)

def men(): plain('men', '#8c1d18')
def sr(): plain('sr', '#3d5a2a')
def lsr(): plain('lsr', '#1f3a5f')

title(); men(); sr(); lsr()
print('art written')
