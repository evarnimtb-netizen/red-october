"""Shared by gen_cabinet.py and gen_laws.py: turn a law (an option with effects) into a router scene with three ways to carry it out.

slow   - phased in, with compensation and negotiation: 60% of the effects, little anger, costs 1 resource (RO.law, tools/model.js)
decree - as written
force  - as written, and the camps it angers are broken by force if the party is strong enough
"""
import json
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


def law_name(label):
    """The law's name for the recap: the option's label without its cost in brackets or its final full stop."""
    return re.sub(r'\s*\([^)]*\)\s*$', '', label).strip().rstrip('.')


# The Cabinet passes laws; the deck cards are measures the party may only campaign for (and, under the Bolsheviks,
# there is nobody the party can break by force, so the force option is offered only before October).
WORDS = {
    'law': {
        'intro': ("How should it be carried out? Phased in, with compensation and negotiation, it will cost a resource, do less and anger less. "
                  "By decree it will do all that it says, and its opponents will answer. And a party strong enough can pass it and enforce it against them."),
        'slow': 'Phase it in, with compensation and negotiation.', 'decree': 'Pass it by decree, as written.',
        'force': 'Pass it by decree, and break any opposition by force.',
        'slow_sub': 'Milder effects and little anger. Costs 1 resource.', 'decree_sub': 'The law as written. Its opponents will answer.',
        'slow_note': '(It was phased in, with compensation where it was owed.)'},
    'measure': {
        'intro': ("How should the party go about it? Cautiously, with compromises, it will cost a resource, do less and anger less. "
                  "In full, it will do all that it says, and its opponents will answer. And a party strong enough can carry it out and break its opponents."),
        'slow': 'Go about it cautiously, with compromises.', 'decree': 'Carry it out in full.',
        'force': 'Carry it out in full, and break any opposition by force.',
        'slow_sub': 'Milder effects and little anger. Costs 1 resource.', 'decree_sub': 'All that it says. Its opponents will answer.',
        'slow_note': '(It was done cautiously, with compromises.)'},
}
INTRO = WORDS['law']['intro']


def variants(name, head, js, text, tail, prefix, back=False, intro=None, label='', kind='law'):
    """head: header lines of the router (view-if, choose-if...); prefix(style): JS run before the effects; tail: lines after the text.
    kind: 'law' (the Cabinet) or 'measure' (a deck card)."""
    w = WORDS[kind]
    camps = law_camps(js)
    odds = ', '.join('%s [+ odds_%s +]%%' % (NAMES[k], k) for k in camps)
    out = []
    r = ['@%s' % name] + head + ['', intro or w['intro'], '',
         '- @%s_slow: %s' % (name, w['slow']),
         '- @%s_decree: %s' % (name, w['decree']),
         '- @%s_force: %s' % (name, w['force'])]
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
}, %s);
!}

%s

%s
''' % (name, style, '\n'.join(head2), prefix(style), style, js, json.dumps(law_name(label)), text2, tail)
    out.append(block('slow', ['choose-if: resources >= 1', 'subtitle: ' + w['slow_sub'],
                              'unavailable-subtitle: We have nothing to pay the compensation with.'], text + ' ' + w['slow_note']))
    out.append(block('decree', ['subtitle: ' + w['decree_sub']], text))
    out.append(block('force', ['view-if: bol_regime = 0', 'choose-if: strength >= 18',
                               'subtitle: Your chance of breaking each camp it angers: %s. Any camp under 45%% is too strong for you, and is left alone.' % odds,
                               'unavailable-subtitle: We lack the force and the allies to break the opposition.'], text + ' [+ law_text +]'))
    return '\n'.join(out)
