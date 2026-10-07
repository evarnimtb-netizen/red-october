#!/usr/bin/env python3
"""Put the period art placed by tools/fetch_art.py into the scenes: a picture at the top of each event that has one
(face-image), and the advisors' portraits (by regenerating the advisor scenes). Safe to run again."""
import json, os, re, subprocess, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
placed = json.load(open(os.path.join(ROOT, 'docs', 'art_placed.json')))
n = 0
for key, rel in placed.items():
    use, eid = key.split(':', 1)
    if use != 'event':
        continue
    p = os.path.join(ROOT, 'source', 'scenes', 'events', eid + '.scene.dry')
    if not os.path.exists(p):
        print('no such event:', eid)
        continue
    s = open(p, encoding='utf-8').read()
    # the property goes straight after the title (an on-arrival block in the header may contain blank lines)
    s = re.sub(r'^face-image: .*\n', '', s, count=1, flags=re.M)
    s = re.sub(r'^(title: .*\n)', lambda m: m.group(1) + 'face-image: %s\n' % rel, s, count=1, flags=re.M)
    open(p, 'w', encoding='utf-8').write(s)
    n += 1
print('events with a picture:', n)
subprocess.check_call([sys.executable, os.path.join(ROOT, 'tools', 'gen_advisors.py')])
