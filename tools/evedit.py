"""Helpers for editing event scene files: gate whole scenes or single options by party."""
import re, os

EV = os.path.join(os.path.dirname(__file__), '..', 'source', 'scenes')

def path(rel):
    return os.path.join(EV, rel)

def read(rel):
    return open(path(rel), encoding='utf-8').read()

def write(rel, s):
    open(path(rel), 'w', encoding='utf-8').write(s)

def gate_scene(rel, cond):
    """Add `cond` to the top-level view-if of a scene file (merging with an existing one)."""
    s = read(rel)
    m = re.search(r'^view-if: (.*)$', s, re.M)
    if m:
        s = s.replace(m.group(0), 'view-if: %s and (%s)' % (cond, m.group(1)), 1)
    else:
        s = re.sub(r'^(title:.*)$', r'\1\nview-if: ' + cond, s, count=1, flags=re.M)
    write(rel, s)

def gate_option(rel, opt, cond):
    """Add `cond` to the view-if of the sub-scene `@opt` (header lines directly after its @ line)."""
    lines = read(rel).split('\n')
    idx = None
    for i, l in enumerate(lines):
        if l == '@' + opt:
            idx = i
            break
    if idx is None:
        raise Exception('option %s not found in %s' % (opt, rel))
    j = idx + 1
    in_js = False
    view_idx = None
    while j < len(lines):
        l = lines[j]
        if in_js:
            if l.strip() == '!}':
                in_js = False
            j += 1
            continue
        if l.strip() == '' or l.startswith('@'):
            break
        if l.startswith('view-if: '):
            view_idx = j
        if l.startswith('on-arrival: {!') and not l.strip().endswith('!}'):
            in_js = True
        j += 1
    if view_idx is not None:
        old = lines[view_idx][len('view-if: '):]
        lines[view_idx] = 'view-if: %s and (%s)' % (cond, old)
    else:
        lines.insert(idx + 1, 'view-if: ' + cond)
    write(rel, '\n'.join(lines))

def append(rel, text):
    s = read(rel)
    write(rel, s.rstrip('\n') + '\n\n' + text.strip('\n') + '\n')

def add_choice(rel, after_line_start, choice_line):
    """Insert a top-level choice line `- @x: ...` after the last choice line of the main choice list."""
    s = read(rel)
    lines = s.split('\n')
    idx = None
    for i, l in enumerate(lines):
        if l.startswith(after_line_start):
            idx = i
    if idx is None:
        raise Exception('anchor not found %s in %s' % (after_line_start, rel))
    lines.insert(idx + 1, choice_line)
    write(rel, '\n'.join(lines))

def replace(rel, old, new, count=1):
    s = read(rel)
    if old not in s:
        raise Exception('text not found in %s: %r' % (rel, old[:60]))
    write(rel, s.replace(old, new, count))
