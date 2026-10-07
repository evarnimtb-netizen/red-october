#!/usr/bin/env python3
"""Generate the Cabinet advisor card (source/scenes/advisors/cabinet.scene.dry) and the policy qdisplays.

Each policy area has settings 0, 1, 2. Changing one takes a turn and has an immediate effect (js); the
setting's ongoing monthly effect lives in tools/model.js (policyDrift) and must be kept in step with the
numbers described here.
"""
import os
import re
import sys
sys.path.insert(0, os.path.dirname(__file__))
from lawvariants import variants, law_camps

ROOT = os.path.join(os.path.dirname(__file__), '..', 'source')
OUT = os.path.join(ROOT, 'scenes', 'advisors')
QD = os.path.join(ROOT, 'qdisplays')

# area -> (title, intro, when available (view-if), [settings])
# setting: (name, option label, choose-if or '', unavailable text, js, result text)
AREAS = [
 ('land', 'Land', 'in_coalition = 1 or lsr_in_gov = 1', [
   ('wait for the Assembly', 'Leave the land to the Assembly.', '', '',
    "RO.add(Q, {land_pressure: 2, rel_kad: 2});",
    "The land question is left to the Constituent Assembly, as the liberals ask. The peasants are told to be patient."),
   ('committees regulate the transfers', "Let the land committees regulate the transfers of land.", '', '',
    "RO.add(Q, {land_pressure: -4, rel_kad: -3, right_threat: 1, ant_kad: 4, ant_gen: 2}); RO.boost(Q, {peasants: 2}); Q.land_committees = (Q.land_committees || 0) + 1;",
    "The land committees now have the government's authority to regulate the transfers until the Assembly meets."),
   ('land socialised now', 'Socialise the land now, by decree.', 'rel_ally >= 50 or player_party = \'sr\' or player_party = \'lsr\'', 'The party that holds the peasants does not agree.',
    "RO.add(Q, {land_pressure: -8, rel_kad: -8, right_threat: 3, ant_kad: 14, ant_gen: 8, ant_bol: -3}); RO.boost(Q, {peasants: 4}); RO.fac(Q, 'rightdef', 0, 6); Q.land_committees = (Q.land_committees || 0) + 1;",
    "A decree abolished private ownership of land, and put it in the hands of the village communities. The landowners, and everyone who sits on their boards, are in uproar."),
 ]),
 ('food', 'Food supply', 'in_coalition = 1 and bol_regime = 0', [
   ('left to the market', 'Leave the grain trade to the market.', '', '',
    "RO.add(Q, {bread: -2, ruble: 1}); RO.boost(Q, {peasants: 1, workers: -1});",
    "The grain trade is left to merchants and cooperatives. Grain appears at higher prices, and the bread queues are longer."),
   ('fixed prices and a monopoly', 'Enforce the grain monopoly and fixed prices.', '', '',
    "RO.add(Q, {bread: 3}); RO.boost(Q, {peasants: -2});",
    "The grain monopoly and the fixed prices are enforced. The cities eat a little better; the villages sell a little less."),
   ('requisitioning', 'Send detachments to requisition grain.', '', '',
    "RO.add(Q, {bread: 5, repression: 1, soviet_democracy: -1}); RO.boost(Q, {peasants: -6});",
    "Armed food detachments leave for the grain provinces. They bring back grain, and the villages will not forget how."),
 ]),
 ('war', 'The war', 'in_coalition = 1 and bol_regime = 0 and at_war = 1', [
   ('a defensive war', 'Fight a defensive war.', '', '',
    "RO.add(Q, {rel_kad: 1});",
    "The government will defend the front but not attack. It is the middle line that satisfies nobody for long."),
   ('peace diplomacy', 'Press for a general peace: Stockholm and the neutrals.', '', '',
    "RO.add(Q, {war_weariness: -3, rel_kad: -3, ant_kad: 5, ant_gen: 7, ant_bol: -3}); Q.stockholm = (Q.stockholm || 0) + 1;",
    "The government's diplomacy now aims at a general peace without annexations. The Allied ambassadors have asked for explanations."),
   ('an offensive', 'Prepare an offensive with the Allies.', '', '',
    "RO.add(Q, {war_weariness: 3, army_discipline: 3, rel_kad: 3, ant_bol: 8, ant_gen: -4}); Q.offensive_prepared = 1;",
    "The army is told to prepare to attack. The Allies are pleased; the soldiers are not."),
 ]),
 ('order', 'Order and liberties', 'in_coalition = 1 or lsr_in_gov = 1', [
   ('ordinary law', 'Govern by the ordinary law.', '', '',
    "RO.add(Q, {rel_kad: 0});",
    "The government will govern by the ordinary law and the courts, with the liberties of February."),
   ('emergency measures', 'Introduce emergency measures against disorder.', '', '',
    "RO.add(Q, {right_threat: -3, repression: 2, soviet_democracy: -2, rel_kad: 2, ant_gen: -6, ant_bol: 8});",
    "Emergency measures give the government the right to arrest agitators and close newspapers. The generals are reassured; the soviets are not."),
   ('broad liberties and an amnesty', 'Proclaim broad liberties and an amnesty.', '', '',
    "RO.add(Q, {soviet_democracy: 3, rel_bol: 4, right_threat: 2, ant_gen: 5, ant_kad: 2, ant_bol: -4});",
    "An amnesty empties the prisons of those held for political offences, and the press is freed of all censorship. Every party, including the ones that would abolish them, is grateful."),
 ]),
 ('finance', 'Finance', 'in_coalition = 1 and bol_regime = 0', [
   ('the printing press', 'Pay for the state with the printing press.', '', '',
    "RO.add(Q, {bread: 1});",
    "The Treasury will print what the state costs. It is the easiest way to pay, and every month it is a little less so."),
   ('taxes on war profits and a Liberty Loan', 'Tax war profits and the rich, and float a Liberty Loan.', '', '',
    "RO.add(Q, {ruble: 4, rel_kad: -4, ant_kad: 6}); RO.boost(Q, {middle: -2, workers: 2});",
    "An excess-profits tax was passed, and the Liberty Loan was advertised on every hoarding. The banks call it confiscation; the ruble has steadied."),
   ('Allied credits', 'Borrow from the Allies, on their terms.', 'at_war = 1', 'There is no war for the Allies to lend to.',
    "RO.add(Q, {ruble: 5, rel_bol: -3, war_weariness: 1, ant_bol: 6}); RO.boost(Q, {soldiers: -1});",
    "London and Washington have opened credits to the Provisional Government. They expect the front to hold, and they have said so."),
 ]),
 ('labour', 'Labour and industry', 'in_coalition = 1 and bol_regime = 0', [
   ('left to the employers', 'Leave industry to the employers.', '', '',
    "RO.add(Q, {ruble: 1}); RO.boost(Q, {workers: -2});",
    "The factories are left to their owners and managers. Production recovers a little, and the workers take notice."),
   ('eight-hour day and committees', 'Guarantee the eight-hour day and the factory committees.', '', '',
    "RO.boost(Q, {workers: 4}); RO.add(Q, {rel_kad: -3, ruble: -2, ant_kad: 6, ant_gen: 2});",
    "The eight-hour day and the factory committees are written into law. The workers cheer; the employers threaten to close their plants."),
   ('state regulation', 'Regulate industry through the state.', '', '',
    "RO.boost(Q, {workers: 2}); RO.add(Q, {ruble: 1, rel_kad: -4, ant_kad: 8, ant_gen: 3});",
    "A committee of the state now regulates prices, wages and supplies in the war industries. It is a first step, which the liberals do not like."),
 ]),
]

POLITICS = [
 ('kadets_in', "Invite the Kadets back into the government.", "in_coalition = 1 and bol_regime = 0 and gov_kadets = 0 and rel_kad >= 25", 'The Kadets will not return.',
  "Q.gov_kadets = 1; Q.homogeneous_gov = 0; RO.add(Q, {rel_kad: 10, right_threat: -4}); RO.boost(Q, {middle: 3}); RO.fac(Q, 'intl', 0, 8);",
  "The Kadets are back in the cabinet, with the ministries that they had before. The generals and the factory owners are reassured, and the left is not."),
 ('kadets_out', "Dismiss the Kadet ministers and govern with the Soviet parties alone.", "in_coalition = 1 and bol_regime = 0 and gov_kadets = 1 and rel_ally >= 55", 'The other socialists will not agree.',
  "Q.gov_kadets = 0; Q.homogeneous_gov = 1; RO.add(Q, {rel_kad: -12, right_threat: 5, soviet_democracy: 2, ant_kad: 6, ant_gen: 3}); RO.boost(Q, {workers: 2, middle: -3}); RO.fac(Q, 'rightdef', 0, 8);",
  "The Kadet ministers have been dismissed. The cabinet is now a cabinet of the Soviet parties alone, with nobody to blame."),
]


def write_qdisplays():
    for key, title, when, settings in AREAS:
        lines = ['']
        for i, st in enumerate(settings):
            lines.append('(%d..%d) %s' % (i, i, st[0]))
        open(os.path.join(QD, 'pol_%s.qdisplay.dry' % key), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

def main():
    write_qdisplays()
    L = []
    L.append('''title: The Cabinet
subtitle: Change the policies and the politics of the government.
is-pinned-card: true
card-image: img/cards/cabinet.svg?v=2
tags: advisor
new-page: true
view-if: (in_coalition = 1 and bol_regime = 0) or lsr_in_gov = 1

= The Cabinet

[? if in_coalition = 1 and bol_regime = 0 : The party shares the government, and with it the power to set the country's course. ?][? if lsr_in_gov = 1 and bol_regime = 1 : The party holds a few commissariats in a government that is not its own: the land and the courts are in its hands, and not much else. ?] A change of course takes a turn, and the cabinet cannot change course again for two months. Policies have a lasting effect, month by month.

[? if ant_kad >= 40 : The liberals are in an angry mood. ?][? if ant_gen >= 40 : The generals are muttering about the government. ?][? if ant_bol >= 40 and bol_regime = 0 : Pravda has begun to campaign against the cabinet. ?]Each camp that opposes a policy will first try sanctions, and then, if it is angry enough, take up arms: see the Opposition tab on the right. An unpopular law can be phased in gently, passed by decree, or, if the party is strong enough (its strength is shown there), passed and enforced against its opponents: the odds are shown for each camp, and a failure makes the camp angrier.

Land: [+ pol_land : pol_land +]. [? if in_coalition = 1 and bol_regime = 0 : Food: [+ pol_food : pol_food +]. Finance: [+ pol_finance : pol_finance +]. Labour: [+ pol_labour : pol_labour +]. ?][? if at_war = 1 and in_coalition = 1 and bol_regime = 0 : The war: [+ pol_war : pol_war +]. ?]Order: [+ pol_order : pol_order +].
''')
    for key, title, when, settings in AREAS:
        for i, st in enumerate(settings):
            L.append('- @%s_%d: %s' % (key, i, st[1]))
    for pid, label, cond, un, js, res in POLITICS:
        L.append('- @%s: %s' % (pid, label))
    L.append('- @root: Return to main')
    L.append('')
    for key, title, when, settings in AREAS:
        for i, (name, label, cond, un, js, res) in enumerate(settings):
            v = 'view-if: (%s) and pol_%s != %d' % (when, key, i)
            ch = 'cabinet_timer <= 0' + (' and (%s)' % cond if cond else '')
            sub = '[? if cabinet_timer > 0 : The cabinet has changed course too recently. ?]' + ('[? if not (%s) : %s ?]' % (cond, un) if cond else '')
            if law_camps(js):
                # an unpopular law: three ways to carry it out
                pre = lambda style, key=key, i=i: 'Q.month_actions += 1;\nQ.cabinet_timer = 2;\nQ.pol_%s = %d;\nQ.soft_%s = %d;' % (key, i, key, 1 if style == 'slow' else 0)
                L.append(variants('%s_%d' % (key, i), [v, 'choose-if: ' + ch, 'unavailable-subtitle: ' + sub], js, res, '- @root: Continue.', pre, back=True, label=label))
                continue
            L.append('''@%s_%d
%s
choose-if: %s
unavailable-subtitle: %s
on-arrival: {!
Q.month_actions += 1;
Q.cabinet_timer = 2;
Q.pol_%s = %d;
Q.soft_%s = 0;
%s
!}

%s

- @root: Continue.
''' % (key, i, v, ch, sub, key, i, key, js, res))
    for pid, label, cond, un, js, res in POLITICS:
        if law_camps(js):
            pre = lambda style: 'Q.month_actions += 1;\nQ.cabinet_timer = 2;'
            L.append(variants(pid, ['view-if: ' + cond, 'choose-if: cabinet_timer <= 0', 'unavailable-subtitle: The cabinet has changed course too recently.'],
                              js, res, '- @root: Continue.', pre, back=True, label=label))
            continue
        L.append('''@%s
view-if: %s
choose-if: cabinet_timer <= 0
unavailable-subtitle: The cabinet has changed course too recently.
on-arrival: {!
Q.month_actions += 1;
Q.cabinet_timer = 2;
%s
!}

%s

- @root: Continue.
''' % (pid, cond, js, res))
    open(os.path.join(OUT, 'cabinet.scene.dry'), 'w', encoding='utf-8').write('\n'.join(L))
    print('cabinet written')

main()
