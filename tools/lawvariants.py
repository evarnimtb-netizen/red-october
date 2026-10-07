"""Shared by gen_cabinet.py and gen_laws.py: turn a law (an option with effects) into a router scene with three ways to carry it out.

slow   - phased in, with compensation and negotiation: 60% of the effects, little anger, costs 1 resource (RO.law, tools/model.js)
decree - as written
force  - as written, and the camps it angers are broken by force if the party is strong enough
"""
import re

NAMES = {'kad': 'Kadets', 'gen': 'generals', 'bol': 'Bolsheviks'}
LAW_HIT_MIN = 2  # as in tools/model.js


def law_camps(js):
    """The camps a law angers, by the same rule as lawHits() and law() in tools/model.js: explicit ant_* changes if the
    law has any, otherwise 1.2 x the fall in relations with the Kadets, 2 x the rise of the Right's threat and the fall in
    relations with the Bolsheviks. Keep the two in step."""
    def total(key):
        return sum(int(x) for x in re.findall(r'\b%s: (-?\d+)' % key, js))
    ants = {k: total('ant_' + k) for k in NAMES}
    if any(re.search(r'\bant_%s: ' % k, js) for k in NAMES):
        hits = ants
    else:
        hits = {'kad': max(0, -total('rel_kad')) * 1.2, 'gen': max(0, total('right_threat')) * 2, 'bol': max(0, -total('rel_bol'))}
    return [k for k in ('kad', 'gen', 'bol') if hits[k] >= LAW_HIT_MIN]


INTRO = ("How should it be carried out? Phased in, with compensation and negotiation, it will cost a resource, do less and anger less. "
         "By decree it will do all that it says, and its opponents will answer. And a party strong enough can pass it and enforce it against them.")


def variants(name, head, js, text, tail, prefix, back=False, intro=INTRO):
    """head: header lines of the router (view-if, choose-if...); prefix(style): JS run before the effects; tail: lines after the text."""
    camps = law_camps(js)
    odds = ', '.join('%s [+ odds_%s +]%%' % (NAMES[k], k) for k in camps)
    out = []
    r = ['@%s' % name] + head + ['', intro, '',
         '- @%s_slow: Phase it in, with compensation and negotiation.' % name,
         '- @%s_decree: Pass it by decree, as written.' % name,
         '- @%s_force: Pass it by decree, and break any opposition by force.' % name]
    if back:
        r.append('- @root: Think again.')
    out.append('\n'.join(r) + '\n')
    def block(style, head2, text2):
        return '''@%s_%s
%s
on-arrival: {!
%s
RO.law(Q, '%s', () => {
%s
});
!}

%s

%s
''' % (name, style, '\n'.join(head2), prefix(style), style, js, text2, tail)
    out.append(block('slow', ['choose-if: resources >= 1', 'subtitle: Milder effects and little anger. Costs 1 resource.',
                              'unavailable-subtitle: We have nothing to pay the compensation with.'],
                     text + ' It was phased in slowly, with compensation where it was owed, and the opposition grumbled rather than raged.'))
    out.append(block('decree', ['subtitle: The law as written. Its opponents will answer.'], text))
    out.append(block('force', ['choose-if: strength >= 18',
                               'subtitle: Chance of breaking its opponents: %s. A camp under 45%% is too strong to touch, and is left alone.' % odds,
                               'unavailable-subtitle: We lack the force and the allies to break the opposition.'], text + ' [+ law_text +]'))
    return '\n'.join(out)
