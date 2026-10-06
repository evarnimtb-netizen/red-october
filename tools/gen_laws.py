#!/usr/bin/env python3
"""One-shot: give the unpopular laws in the Coalition Affairs and Soviet Affairs decks three ways to be carried out
(see lawvariants.py). A law is an option whose effects anger the Kadets, the Right or the Bolsheviks. Safe to run again."""
import glob, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from lawvariants import variants

ROOT = os.path.join(os.path.dirname(__file__), '..', 'source', 'scenes')

def angers(js):
    k = [int(x) for x in re.findall(r'rel_kad: (-?\d+)', js)]
    r = [int(x) for x in re.findall(r'right_threat: (-?\d+)', js)]
    b = [int(x) for x in re.findall(r'rel_bol: (-?\d+)', js)]
    return bool((k and min(k) <= -2) or (r and max(r) >= 2) or (b and min(b) <= -3))

def main():
    n = 0
    for f in sorted(glob.glob(ROOT + '/coalition_affairs/*.dry') + glob.glob(ROOT + '/soviet_affairs/*.dry')):
        s = open(f, encoding='utf-8').read()
        parts = re.split(r'\n(?=@)', s)
        out = [parts[0]]
        changed = False
        for p in parts[1:]:
            name = p.split('\n')[0][1:]
            m = re.search(r'\n((?:(?!on-arrival).*\n)*?)on-arrival: \{!\n(.*?)\n!\}\n(.*)$', p, re.S)
            if m and not name.endswith(('_slow', '_decree', '_force')) and angers(m.group(2)) and '\n- @' not in p and 'go-to:' not in p and (name + '_slow') not in s:
                head = [l for l in m.group(1).split('\n') if l.strip()]
                text = m.group(3).strip()
                out.append(variants(name, head, m.group(2), text, '', lambda style: '').rstrip('\n') + '\n')
                changed = True; n += 1
            else:
                out.append(p)
        if changed:
            open(f, 'w', encoding='utf-8').write('\n'.join(out))
    print('laws with variants:', n)

main()
