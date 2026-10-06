#!/usr/bin/env python3
"""Generate card art (SVG) for every card, advisor and deck, and point the scenes at it.

Run from the repository root. Safe to rerun: it rewrites the SVGs and only adds
a card-image line to scenes that lack one.
"""
import os, re, glob, html, textwrap

ROOT = os.path.join(os.path.dirname(__file__), '..')
SCENES = os.path.join(ROOT, 'source', 'scenes')
OUT = os.path.join(ROOT, 'out', 'html', 'img', 'cards')
os.makedirs(OUT, exist_ok=True)

PALETTES = {
    'party_affairs':    ('#8c1d18', '#f2e6c9', '#1c1c1c'),
    'coalition_affairs': ('#1f3a5f', '#f2e6c9', '#c9a227'),
    'soviet_affairs':   ('#3d4a2a', '#f2e6c9', '#b3261e'),
    'advisor':          ('#5a3d2b', '#f2e6c9', '#c9a227'),
    'deck_party':       ('#8c1d18', '#f2e6c9', '#1c1c1c'),
    'deck_coalition':   ('#1f3a5f', '#f2e6c9', '#c9a227'),
    'deck_soviet':      ('#3d4a2a', '#f2e6c9', '#b3261e'),
}

def star(cx, cy, r, fill):
    import math
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = r if i % 2 == 0 else r * 0.4
        pts.append('%.1f,%.1f' % (cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    return '<polygon points="%s" fill="%s"/>' % (' '.join(pts), fill)

ART_VERSION = 2   # bump to make browsers fetch new card art

def darker(hexcolor, f=0.8):
    r, g, b = [int(hexcolor[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02x%02x%02x' % (int(r * f), int(g * f), int(b * f))

def card_svg(title, kind, seed, initials=None):
    """Very simple art: a flat colour, a thin frame and the name. Advisors get a blank silhouette."""
    bg, fg, accent = PALETTES[kind]
    lines = textwrap.wrap(title, 14)[:4]
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="240" height="340" viewBox="0 0 240 340">',
             '<rect width="240" height="340" fill="%s"/>' % bg,
             '<rect x="14" y="14" width="212" height="312" fill="none" stroke="%s" stroke-width="2" opacity="0.7"/>' % fg]
    if initials is not None:
        sil = darker(bg, 0.78)
        parts.append('<circle cx="120" cy="112" r="40" fill="%s"/>' % sil)
        parts.append('<path d="M44 220 Q44 160 120 160 Q196 160 196 220 Z" fill="%s"/>' % sil)
        y0 = 262
    else:
        y0 = 176
    y = y0 - 10 * (len(lines) - 1)
    for ln in lines:
        parts.append('<text x="120" y="%d" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-size="24" fill="%s">%s</text>' % (y, fg, html.escape(ln)))
        y += 28
    parts.append('</svg>')
    return '\n'.join(parts)

def read_header(path):
    s = open(path, encoding='utf-8').read()
    return s

def add_image_line(path, rel):
    s = open(path, encoding='utf-8').read()
    if re.search(r'^card-image:', s, re.M):
        s = re.sub(r'^card-image:.*$', 'card-image: ' + rel, s, count=1, flags=re.M)
    else:
        s = re.sub(r'^(title:.*)$', r'\1\ncard-image: ' + rel, s, count=1, flags=re.M)
    open(path, 'w', encoding='utf-8').write(s)

def initials_of(name):
    parts = [p for p in re.split(r'\s+', name.strip()) if p]
    return (parts[0][0] + parts[-1][0]).upper() if len(parts) > 1 else parts[0][:2].upper()

count = 0
for f in sorted(glob.glob(os.path.join(SCENES, '**', '*.scene.dry'), recursive=True)):
    s = open(f, encoding='utf-8').read()
    m_tags = re.search(r'^tags:\s*(.*)$', s, re.M)
    m_title = re.search(r'^title:\s*(.*)$', s, re.M)
    if not (m_tags and m_title):
        continue
    tags = [t.strip() for t in m_tags.group(1).split(',')]
    title = m_title.group(1).strip().strip('"')
    sid = os.path.basename(f).replace('.scene.dry', '')
    kind = None
    ini = None
    for k in ('party_affairs', 'coalition_affairs', 'soviet_affairs'):
        if k in tags:
            kind = k
    if 'advisor' in tags:
        kind = 'advisor'
        ini = None if sid in ('wait', 'council', 'cabinet') else ''
    if not kind:
        continue
    svg = card_svg(title, kind, sid, ini)
    open(os.path.join(OUT, sid + '.svg'), 'w', encoding='utf-8').write(svg)
    add_image_line(f, 'img/cards/%s.svg?v=%d' % (sid, ART_VERSION))
    count += 1

# decks live in main.scene.dry
decks = {'party': ('Party Affairs', 'deck_party'), 'coalition': ('Coalition Affairs', 'deck_coalition'),
         'soviet': ('Soviet Affairs', 'deck_soviet')}
main = os.path.join(SCENES, 'main.scene.dry')
s = open(main, encoding='utf-8').read()
for did, (title, kind) in decks.items():
    open(os.path.join(OUT, 'deck_%s.svg' % did), 'w', encoding='utf-8').write(card_svg(title, kind, did))
    pat = re.compile(r'(^@%s\ntitle:.*\n)(card-image:.*\n)?' % did, re.M)
    s = pat.sub(lambda m: m.group(1) + 'card-image: img/cards/deck_%s.svg?v=%d\n' % (did, ART_VERSION), s, count=1)
open(main, 'w', encoding='utf-8').write(s)
print('card images:', count + 3)
