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
    s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 260" width="900" height="260">',
         '<rect width="900" height="260" fill="%s"/>' % RED,
         '<polygon points="0,0 560,0 330,260 0,260" fill="%s"/>' % BLACK,
         '<polygon points="560,0 900,0 900,260 330,260" fill="%s" opacity="0.18"/>' % CREAM,
         '<circle cx="745" cy="120" r="92" fill="%s"/>' % CREAM,
         star(745, 120, 70, RED),
         '<rect x="22" y="22" width="856" height="216" fill="none" stroke="%s" stroke-width="4"/>' % CREAM,
         '<text x="52" y="132" font-family="Impact, \'Arial Black\', \'Helvetica Neue\', sans-serif" font-size="104" fill="%s" letter-spacing="3">RED OCTOBER</text>' % CREAM,
         '<rect x="54" y="152" width="470" height="6" fill="%s"/>' % GOLD,
         '<text x="54" y="204" font-family="Georgia, \'Times New Roman\', serif" font-size="40" fill="%s" letter-spacing="14">FALL OF EMPIRE</text>' % CREAM,
         '<text x="56" y="236" font-family="Georgia, serif" font-size="17" fill="%s" letter-spacing="6">RUSSIA  1917 – 1921</text>' % GOLD,
         '</svg>']
    open(os.path.join(OUT, 'title.svg'), 'w', encoding='utf-8').write('\n'.join(s))

def frame(bg, body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">'
            '<rect width="160" height="160" fill="%s"/>%s<rect x="6" y="6" width="148" height="148" fill="none" stroke="%s" stroke-width="3"/></svg>' % (bg, body, CREAM))

def men():
    teeth = ''.join('<rect x="73" y="26" width="14" height="22" fill="%s" transform="rotate(%d 80 80)"/>' % (CREAM, a) for a in range(0, 360, 45))
    body = (teeth + '<circle cx="80" cy="80" r="42" fill="%s"/>' % CREAM + '<circle cx="80" cy="80" r="26" fill="#8c1d18"/>'
            '<rect x="62" y="72" width="36" height="22" fill="%s"/><rect x="79" y="72" width="2" height="22" fill="#8c1d18"/>' % CREAM)
    open(os.path.join(OUT, 'parties', 'men.svg'), 'w', encoding='utf-8').write(frame('#8c1d18', body))

def sr():
    ears = ''
    for i in range(5):
        y = 38 + i * 15
        ears += '<ellipse cx="68" cy="%d" rx="7" ry="13" fill="%s" transform="rotate(-35 68 %d)"/>' % (y, GOLD, y)
        ears += '<ellipse cx="92" cy="%d" rx="7" ry="13" fill="%s" transform="rotate(35 92 %d)"/>' % (y, GOLD, y)
    body = ('<circle cx="80" cy="124" r="40" fill="%s" opacity="0.9"/>' % CREAM + '<rect x="77" y="38" width="6" height="90" fill="%s"/>' % GOLD + ears +
            '<ellipse cx="80" cy="32" rx="7" ry="13" fill="%s"/>' % GOLD)
    open(os.path.join(OUT, 'parties', 'sr.svg'), 'w', encoding='utf-8').write(frame('#3d5a2a', body))

def lsr():
    body = (star(80, 34, 20, GOLD) +
            '<circle cx="80" cy="64" r="9" fill="none" stroke="%s" stroke-width="6"/>' % CREAM +
            '<rect x="77" y="72" width="6" height="58" fill="%s"/>' % CREAM +
            '<rect x="60" y="82" width="40" height="6" fill="%s"/>' % CREAM +
            '<path d="M40 110 Q44 140 80 140 Q116 140 120 110" fill="none" stroke="%s" stroke-width="6" stroke-linecap="round"/>' % CREAM +
            '<polygon points="34,108 48,114 42,126" fill="%s"/><polygon points="126,108 112,114 118,126" fill="%s"/>' % (CREAM, CREAM))
    open(os.path.join(OUT, 'parties', 'lsr.svg'), 'w', encoding='utf-8').write(frame('#1f3a5f', body))

title(); men(); sr(); lsr()
print('art written')
