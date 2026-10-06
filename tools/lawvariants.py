"""Shared by gen_cabinet.py and gen_laws.py: turn a law (an option with effects) into a router scene with three ways to carry it out.

slow   - phased in, with compensation and negotiation: 60% of the effects, little anger, costs 1 resource (RO.law, tools/model.js)
decree - as written
force  - as written, and the camps it angers are broken by force if the party is strong enough
"""

INTRO = ("How should it be carried out? Phased in, with compensation and negotiation, it will cost a resource, do less and anger less. "
         "By decree it will do all that it says, and its opponents will answer. And a party strong enough can pass it and enforce it against them.")

def variants(name, head, js, text, tail, prefix, back=False, intro=INTRO):
    """head: header lines of the router (view-if, choose-if...); prefix(style): JS run before the effects; tail: lines after the text."""
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
                              'unavailable-subtitle: We have nothing to pay the compensation with.'], text + ' It was phased in slowly, with compensation where it was owed, and the opposition grumbled rather than raged.'))
    out.append(block('decree', ['subtitle: The law as written. Its opponents will answer.'], text))
    out.append(block('force', ['choose-if: strength >= 18',
                               'subtitle: Chance of breaking the opposition: Kadets [+ odds_kad +]%, generals [+ odds_gen +]%, Bolsheviks [+ odds_bol +]%.',
                               'unavailable-subtitle: We lack the force and the allies to break the opposition.'], text + ' [+ law_text +]'))
    return '\n'.join(out)
