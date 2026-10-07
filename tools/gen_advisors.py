#!/usr/bin/env python3
"""Generate source/scenes/advisors/*.scene.dry from the table below (Menshevik advisors)."""
import os
import shutil

OUT = os.path.join(os.path.dirname(__file__), '..', 'source', 'scenes', 'advisors')

# id, title, faction tag, flag var, bio, action title, action subtitle, extra choose-if, unavailable text, js effect, result text
ADVISORS = [
 ('martov', 'Julius Martov', 'intl', 'martov_advisor',
  "Martov (1873-1923) is the leader of the Internationalists and the old friend and opponent of Lenin. He proposed an all-socialist government on the night of the October Revolution.",
  'All-Socialist Government', 'Martov opens talks with the SRs, Left SRs and moderate Bolsheviks.', '', '',
  "RO.add(Q, {rel_ally: 4, rel_lsr: 6, rel_bol: 6}); RO.fac(Q, 'intl', 2, -2); RO.fac(Q, 'rightdef', 0, 4);",
  "Martov's circle has sent word to the Left SRs, to the moderate Bolsheviks and to the Chernov group of the SRs. The Right Defencists are not pleased."),
 ('dan', 'Fyodor Dan', 'defencist', 'dan_advisor',
  "Dan (1871-1947) is a physician and a leading figure in the Soviet executive. He will be the party's speaker at the 1919 and 1920 Congresses of Soviets.",
  'Soviet Floor Manager', 'Dan whips the votes in the Soviet and prepares the speeches.', '', '',
  "RO.boost(Q, {workers: 3, soldiers: 3, railway: 2}); RO.add(Q, {soviet_democracy: 1}); RO.fac(Q, 'defencist', 1, -1);",
  "Dan has organised the speakers, the resolutions and the votes. The Soviet runs a little more smoothly, and our delegates are better prepared."),
 ('tsereteli', 'Irakli Tsereteli', 'defencist', 'tsereteli_advisor',
  "Tsereteli (1881-1959), a Georgian Menshevik returned from Siberian exile, is the architect of revolutionary defencism and the coalition. He is Minister of Posts and Telegraphs.",
  'Coalition Broker', 'Tsereteli keeps the cabinet together and smooths over disputes with the Kadets.', 'in_coalition = 1 and bol_regime = 0', 'We are not in a coalition government.',
  "RO.add(Q, {rel_kad: 5, rel_ally: 4, right_threat: -2}); RO.fac(Q, 'intl', 0, 3); RO.fac(Q, 'defencist', 1, -1);",
  "Tsereteli's patience has kept the coalition together for another few weeks. The Internationalists complain that he is protecting the Kadets."),
 ('chkheidze', 'Nikolai Chkheidze', 'defencist', 'chkheidze_advisor',
  "Chkheidze (1864-1926), a Georgian Menshevik, is the Chairman of the Petrograd Soviet. He has the gavel and, for now, the room.",
  "Chairman's Gavel", 'Chkheidze calms a split or steers a Soviet session.', '', '',
  "for (var f of Q.factions) { RO.fac(Q, f, 0, -4); } RO.add(Q, {soviet_democracy: 1});",
  "Chkheidze ruled a heated session out of order and then spent an hour in the corridors. Tempers are lower."),
 ('skobelev', 'Matvei Skobelev', 'defencist', 'skobelev_advisor',
  "Skobelev (1885-1938) is the Minister of Labour in the first coalition cabinet, a young Social Democrat from Baku.",
  'Labour Arbitration', 'Skobelev settles a strike through conciliation boards.', 'in_coalition = 1 and bol_regime = 0', 'We are not in a coalition government.',
  "RO.add(Q, {ruble: 2, rel_kad: 2}); RO.boost(Q, {workers: -1}); RO.fac(Q, 'unions', 1, -1);",
  "Skobelev's boards settled a transport strike on compromise terms. The employers are grateful, and the strikers feel cheated."),
 ('gvozdev', 'Kuzma Gvozdev', 'unions', 'gvozdev_advisor',
  "Gvozdev (1880-?), a lathe worker and chairman of the Central War Industries Committee's workers' group, becomes Minister of Labour in the last coalition.",
  'Defence-Industry Pact', "Gvozdev wins the war-industry workers' loyalty, at some cost among the radical ones.", 'at_war = 1', 'The war is over.',
  "RO.boost(Q, {workers: 4, railway: 1}); RO.add(Q, {bolshevik: 1, ruble: 1}); RO.fac(Q, 'unions', 2, -2);",
  "The war-industry workers have a wage agreement and a minister of their own. The metalworkers of the Vyborg side called it a sell-out."),
 ('potresov', 'Alexander Potresov', 'rightdef', 'potresov_advisor',
  "Potresov (1869-1934), co-founder of the Russian social democratic movement and Lenin's old comrade, edits the newspaper Den. He is the Right Defencists' spokesman.",
  'Den Editorial', 'Potresov writes a sharp editorial against the Bolsheviks.', '', '',
  "RO.add(Q, {bolshevik: -4, rel_bol: -3}); RO.boost(Q, {middle: 3, workers: 1}); RO.fac(Q, 'rightdef', 2, 5); RO.fac(Q, 'intl', 0, 3);",
  "Potresov's editorial was reprinted in every anti-Bolshevik paper. It also drew a sharp reply from Martov."),
 ('axelrod', 'Pavel Axelrod', 'unions', 'axelrod_advisor',
  "Axelrod (1850-1928) is an elder of Russian Marxism and the founder of the idea of a broad workers' congress. He went to Western Europe in August 1917, where he lobbies the socialist parties.",
  'Western Socialist Network', 'Axelrod lobbies the Western socialists for pressure and aid.', '', '',
  "RO.add(Q, {soviet_democracy: 1, repression: -1}); Q.resources += 2; Q.foreign_pressure = (Q.foreign_pressure || 0) + 1;",
  "Axelrod met the leaders of the British Labour Party and the German Independent Social Democrats. They have promised pressure, and some money."),
 ('abramovich', 'Raphael Abramovich', 'bund', 'abramovich_advisor',
  "Abramovich (1880-1963) of the Bund is a member of the Soviet executive. In 1918 foreign socialists' appeals will help save him from the firing squad.",
  'Bridge-Builder', 'Abramovich eases tension between the party currents.', '', '',
  "for (var f of Q.factions) { RO.fac(Q, f, 0, -6); }",
  "Abramovich sat up with Internationalists and Defencists in turn. Nobody has changed their mind, but people are on speaking terms again."),
 ('liber', 'Mikhail Liber', 'bund', 'liber_advisor',
  "Liber (1880-1937) is a Bundist and a member of the Soviet executive. He will head the Menshevik list in Petrograd in November 1917.",
  'Jewish Workers\' Link', "Liber rallies the Jewish workers' organisations.", '', '',
  "RO.boost(Q, {nations: 4, workers: 2}); RO.fac(Q, 'bund', 1, -5);",
  "The Bund's network of unions, clubs and mutual aid societies has rallied to our side in the towns of the Pale."),
 ('broido', 'Eva Broido', 'intl', 'broido_advisor',
  "Eva Broido (1876-1941), an Internationalist, becomes the party's secretary in August 1917 and organises women workers.",
  'Party Secretary', "Broido strengthens the party's organisation and its work among women workers.", '', '',
  "Q.members += 8 * Q.mem_scale; RO.boost(Q, {workers: 2, middle: 1}); RO.fac(Q, 'intl', 1, -2);",
  "Broido has opened new party branches and a women workers' circle. Membership is growing."),
 ('lidia', 'Lidia Dan', 'intl', 'lidia_advisor',
  "Lidia Dan (1878-1963) is Martov's sister and Fyodor Dan's wife, so she stands at the point where the party's two circles meet.",
  'Family Bridge', 'Lidia Dan mediates between the Martov and Dan circles.', '', '',
  "RO.fac(Q, 'intl', 0, -8); RO.fac(Q, 'defencist', 0, -4);",
  "Over many cups of tea, Lidia Dan reminded two men that they are brothers-in-law. The party's two leaders are speaking again."),
 ('sukhanov', 'Nikolai Sukhanov', 'intl', 'sukhanov_advisor',
  "Sukhanov (1882-1940), an Internationalist writer and a founding member of the Soviet executive, writes the best chronicle of the revolution as it happens. His wife is a Bolshevik.",
  'Insider Chronicler', "Sukhanov's table talk reveals what the other parties intend.", '', '',
  "Q.insight = (Q.insight || 0) + 1; RO.add(Q, {rel_lsr: 2, rel_bol: 2});",
  "Sukhanov told us what he heard at the Bolshevik meeting, and what the Left SRs are saying in the corridors. We will be better informed the next time a crisis breaks."),
 ('batursky', 'Boris Batursky', 'unions', 'batursky_advisor',
  "Batursky (1879-1920) is a trade union leader who argues that unions must remain independent of the state.",
  'Independent Unions', 'Batursky builds union influence and argues the case for independence.', '', '',
  "RO.boost(Q, {workers: 3, railway: 3}); RO.fac(Q, 'unions', 3, -3); RO.add(Q, {repression: 1});",
  "Batursky's pamphlet on union independence was read at the metalworkers' union and the printers'. The authorities have taken note."),
 ('khinchuk', 'Lev Khinchuk', 'unions', 'khinchuk_advisor',
  "Khinchuk (1868-1939), a Menshevik and cooperator, is the chairman of the Moscow Soviet's executive in 1917 and an expert on cooperatives.",
  'Moscow Machine', "Khinchuk mobilises food and cooperative networks in Moscow.", '', '',
  "RO.add(Q, {bread: 3}); RO.boost(Q, {workers: 2, middle: 2}); RO.fac(Q, 'unions', 1, -1);",
  "The Moscow cooperatives have stretched their grain stores, and the Moscow workers know whose men run them."),
 ('zhordania', 'Noe Zhordania', 'defencist', 'zhordania_advisor',
  "Zhordania (1868-1953), the leader of the Georgian Mensheviks, heads the government of independent Georgia from 1918 to 1921.",
  'Georgian Model', "Zhordania offers Georgia as a model of democratic socialism, and as a refuge.", '', '',
  "RO.add(Q, {land_pressure: -3, soviet_democracy: 1}); Q.resources += 1; RO.boost(Q, {nations: 3}); RO.fac(Q, 'defencist', 2, -2);",
  "A delegation to Tiflis has seen a democratic republic with land reform, free elections and a working railway system. It is our best argument."),
]

MENSHEVIK = {'martov','dan','tsereteli','chkheidze','skobelev','gvozdev','potresov','axelrod','abramovich','liber','broido','lidia','sukhanov','batursky','khinchuk','zhordania'}

# extra advisors for other parties: id, title, faction tag, flag, bio, party, [actions]
# each action: (title, subtitle, extra choose-if, unavailable text, js, result)
OTHERS = [
 ('chernov', 'Viktor Chernov', 'defencist', 'chernov_advisor',
  "Chernov (1873-1952) is the party's leader and its theorist of land socialisation. He is Minister of Agriculture from May to August 1917 and will be elected chairman of the Constituent Assembly.", 'sr',
  [("Land Socialisation", "Chernov pushes the land law forward.", '', '',
    "Q.land_law_draft = 1; RO.add(Q, {land_pressure: -6, rel_kad: -3}); RO.boost(Q, {peasants: 5, soldiers: 1}); RO.fac(Q, 'rightdef', 0, 5); RO.fac(Q, 'defencist', 1, -1);",
    "Chernov's draft law is circulated to the land committees and the peasant soviets. It is the best argument that the party has, and the Kadets know it.")]),
 ('avksentiev', 'Nikolai Avksentiev', 'rightdef', 'avksentiev_advisor',
  "Avksentiev (1878-1943) is a Right SR, Minister of the Interior in the summer of 1917 and chairman of the Pre-Parliament. In 1918 he will head the Ufa Directory.", 'sr',
  [("Order and Republic", "Avksentiev steadies the government, and angers the left.", '', '',
    "RO.add(Q, {right_threat: -4, rel_kad: 3, soviet_democracy: -1}); RO.fac(Q, 'rightdef', 1, -3); RO.fac(Q, 'intl', 0, 6);",
    "Avksentiev's circular to the provincial commissars told them to uphold the law, and to arrest those who seized land by force. The Left SRs called it an outrage.")]),
 ('breshkovskaya', 'Ekaterina Breshko-Breshkovskaya', 'rightdef', 'breshkovskaya_advisor',
  "Breshko-Breshkovskaya (1844-1934), the 'grandmother of the revolution', has spent thirty years in prison and exile. She is a Right SR, and the party's greatest symbol.", 'sr',
  [("Founding Prestige", "The grandmother of the revolution speaks to the peasants and the soldiers.", '', '',
    "RO.boost(Q, {peasants: 4, soldiers: 3, middle: 2}); RO.fac(Q, 'rightdef', 1, -2);",
    "The old woman toured the front, and the garrison towns. Soldiers who had never read a party leaflet knelt to kiss her hand.")]),
 ('gots', 'Abram Gots', 'unions', 'gots_advisor',
  "Gots (1882-1940), a Right Centre leader, is chairman of the Soviet executive. He holds the Menshevik-SR bloc together, and is an old combat organiser.", 'sr',
  [("Soviet Majority", "Gots votes the SR delegations together with the Mensheviks.", '', '',
    "RO.add(Q, {rel_ally: 6, soviet_democracy: 1}); RO.boost(Q, {workers: 2, soldiers: 3, railway: 2}); RO.fac(Q, 'unions', 1, -1);",
    "Gots met Dan and Tsereteli before every session, and the two delegations voted as one. The Bolsheviks call it the Menshevik-SR gang.")]),
 ('zenzinov', 'Vladimir Zenzinov', 'unions', 'zenzinov_advisor',
  "Zenzinov (1880-1953) is a member of the Central Committee and the party's organiser. In 1918 he will sit in the Directory, and be arrested in Kolchak's coup.", 'sr',
  [("Party Machine", "Zenzinov builds the party's organisation and its membership.", '', '',
    "Q.members += 20 * Q.mem_scale; RO.boost(Q, {peasants: 2, workers: 1}); RO.fac(Q, 'unions', 1, -4);",
    "Zenzinov opened a dozen new provincial committees and put the old ones in order. The party's membership is growing.")]),
 ('volsky', 'Vladimir Volsky', 'bund', 'volsky_advisor',
  "Volsky (1877-1946) is chairman of Komuch in Samara in 1918, and later the leader of the Ufa delegation that rejects armed struggle against the Bolsheviks.", 'sr',
  [("Komuch", "Volsky builds a government on the Volga with an armed force.", 'bol_regime = 1', 'There is no Bolshevik government to fight.',
    "Q.armed_struggle = 1; Q.white_aid += 1; Q.komuch_alive = 1; RO.add(Q, {rel_bol: -6, repression: 4}); RO.boost(Q, {peasants: 3, middle: 2}); RO.fac(Q, 'rightdef', 2, -4); RO.fac(Q, 'intl', 0, 5);",
    "Volsky's Komuch has a government, a flag and an army of volunteers. It also has to rely on foreign bayonets."),
   ("Compromise", "Volsky opens talks with the soviets.", 'bol_regime = 1', 'There is no Bolshevik government to talk to.',
    "RO.add(Q, {rel_bol: 6, repression: -2}); RO.fac(Q, 'bund', 3, -3); RO.fac(Q, 'rightdef', 0, 6); RO.fac(Q, 'intl', 0, -3);",
    "Volsky sent word to the Soviet government that the party was ready to talk. The Right SRs call it a betrayal, and the peasants call it common sense.")]),
 ('spiridonova', 'Maria Spiridonova', 'defencist', 'spiridonova_advisor',
  "Spiridonova (1884-1941), who shot a governor in 1906 and was tortured for it, is the leader of the Left SRs and the heroine of the villages. She drew the peasant congresses to the left.", 'lsr',
  [("Peasant Congress", "Spiridonova turns the peasants' deputies to the left.", '', '',
    "RO.boost(Q, {peasants: 8, soldiers: 2}); Q.peasant_organised = (Q.peasant_organised || 0) + 1; RO.add(Q, {rel_ally: -3}); RO.fac(Q, 'defencist', 1, -1);",
    "Spiridonova spoke at the provincial peasant congresses, and the delegates followed her. The SR leaders say that she hypnotises them.")]),
 ('kamkov', 'Boris Kamkov', 'defencist', 'kamkov_advisor',
  "Kamkov (1885-1938) is the Left SR leader and its expert on the village. He will be the loudest voice against the Treaty of Brest-Litovsk.", 'lsr',
  [("Against the Treaty", "Kamkov rallies anti-Brest feeling among the soldiers and the peasants.", 'dix >= 20 and dix <= 40', 'The treaty is not yet in question, or is long settled.',
    "RO.boost(Q, {soldiers: 4, peasants: 3}); Q.anti_brest = (Q.anti_brest || 0) + 1; RO.add(Q, {rel_bol: -3}); RO.fac(Q, 'rightdef', 0, 4);",
    "Kamkov denounced the peace as a betrayal of the German workers and of the revolutionary war. The soldiers cheered. Lenin did not.")]),
 ('natanson', 'Mark Natanson', 'rightdef', 'natanson_advisor',
  "Natanson (1850-1919), a veteran populist and a founder of the party, has the authority of forty years of prison and exile. He is the Left SRs' elder.", 'lsr',
  [("Elder's Authority", "Natanson's authority calms the party's quarrels.", '', '',
    "for (var f of Q.factions) { RO.fac(Q, f, 0, -6); } RO.fac(Q, 'rightdef', 1, 0);",
    "The old man sat at the head of the table, and the quarrels stopped. There is no authority like that of a man who has spent his life in prison.")]),
 ('steinberg', 'Isaac Steinberg', 'rightdef', 'steinberg_advisor',
  "Steinberg (1888-1957), a Left SR lawyer, is People's Commissar of Justice. He clashes with the Cheka over the right of the accused.", 'lsr',
  [("Revolutionary Legality", "Steinberg fights the Cheka's powers from inside the government.", 'lsr_in_gov = 1', 'We are not in the government.',
    "RO.add(Q, {repression: -5, soviet_democracy: 2, rel_bol: -1}); RO.fac(Q, 'rightdef', 1, -2);",
    "Steinberg's commission released a number of prisoners and drafted a law on the courts. Dzerzhinsky says that Steinberg wants to turn the revolution into a law school.")]),
 ('kolegaev', 'Andrei Kolegaev', 'rightdef', 'kolegaev_advisor',
  "Kolegaev (1886-1937), a Left SR, is People's Commissar of Agriculture. He carries out the land decree, which the Left SRs themselves wrote.", 'lsr',
  [("Land Decree", "Kolegaev carries out the redistribution of land.", 'lsr_in_gov = 1', 'We are not in the government.',
    "RO.add(Q, {land_pressure: -8}); RO.boost(Q, {peasants: 5}); RO.fac(Q, 'unions', 1, -1);",
    "Kolegaev's commissars went out to the provinces with copies of the decree, and a thousand estates were divided in a week.")]),
 ('proshian', 'Prosh Proshian', 'unions', 'proshian_advisor',
  "Proshian (1883-1918), a Left SR, is People's Commissar of Posts and Telegraphs. He has the telegraph in his hands, and a network of operators who are loyal to the party.", 'lsr',
  [("Telegraph Lines", "Proshian's telegraph network carries news and the party's organisation.", 'lsr_in_gov = 1', 'We are not in the government.',
    "Q.insight = (Q.insight || 0) + 1; Q.members += 10 * Q.mem_scale; RO.boost(Q, {workers: 1, railway: 2}); RO.fac(Q, 'unions', 1, -2);",
    "The telegraphists of a dozen provincial towns now take their instructions from the party, and the party hears everything that goes over the wire.")]),
 ('aleksandrovich', 'Pyotr Aleksandrovich', 'rightdef', 'aleksandrovich_advisor',
  "Aleksandrovich (1887-1918) is the Left SR member of the Cheka's board and, until July 1918, Dzerzhinsky's deputy. He knows who is on the lists.", 'lsr',
  [("Inside the Cheka", "Aleksandrovich blocks a wave of arrests before it begins.", 'lsr_in_gov = 1 and dix >= 24', 'We have no seat on the Cheka board yet.',
    "Q.cheka_shield = 1; RO.add(Q, {repression: -2, rel_bol: -1}); RO.fac(Q, 'rightdef', 1, -2);",
    "Aleksandrovich saw the lists before they were signed. A number of names were crossed out, and a few of those named were warned.")]),
]

def write_model_table(table):
    import json, re
    path = os.path.join(os.path.dirname(__file__), 'model.js')
    src = open(path, encoding='utf-8').read()
    body = ',\n    '.join("%s: {name: %s, party: '%s'}" % (k, json.dumps(v[0]), v[1]) for k, v in table.items())
    block = "  // BEGIN ADVISORS (written by tools/gen_advisors.py)\n  var ADVISORS = {\n    %s\n  };\n  // END ADVISORS" % body
    src = re.sub(r"  // BEGIN ADVISORS.*?// END ADVISORS", lambda m: block, src, flags=re.S)
    open(path, 'w', encoding='utf-8').write(src)

def write_council(table):
    """The Council card. table: id -> (name, party, what the advisor can do). Calling an advisor in asks who gives up the
    seat, and replacing one asks who takes it; every choice shows what the advisor offers."""
    lines = ['''title: The Council
subtitle: Change the advisors you are listening to.
is-pinned-card: true
card-image: img/cards/council.svg?v=2
tags: advisor
new-page: true
view-if: adv_reserve >= 1
choose-if: council_timer <= 0
unavailable-subtitle: The council was changed recently. It can be changed again three months after the last change.
on-arrival: {!
RO.syncAdvisors(Q);
!}

= The Council

You listen to four advisors at a time; the others wait in the corridor. Each advisor offers one action. Changing the council takes a turn, and it cannot be done again for three months.

*Advising now: [+ council_list +].* *In reserve: [+ reserve_list +].*

- @shuffle: Draw a new council at random.''']
    for k, v in table.items():
        lines.append('- @bring_%s: Call on %s.' % (k, v[0]))
    for k, v in table.items():
        lines.append('- @drop_%s: Replace %s.' % (k, v[0]))
    lines.append('- @root: Return to main')
    lines.append('')
    lines.append('''@shuffle
new-page: true
on-arrival: {!
Q.month_actions += 1; Q.council_timer = 3;
RO.reshuffleCouncil(Q);
!}

The advisors were thanked and sent home, and a new circle was called together.

- @root: Continue.
''')
    # call someone in: then choose who makes room
    for k, v in table.items():
        out = '\n'.join('- @out_%s: %s gives up the seat.' % (o, table[o][0]) for o in table)
        lines.append('''@bring_%s
view-if: avail_%s = 1 and on_%s = 0
subtitle: Offers: %s
on-arrival: {!
Q.adv_in = '%s';
Q.adv_in_name = "%s";
!}

%s would offer: %s

Who should give up a seat on the council?

%s
- @root: Think again.
''' % (k, k, k, v[2], k, v[0], v[0], v[2], out))
    for k, v in table.items():
        lines.append('''@out_%s
view-if: on_%s = 1
new-page: true
subtitle: Gives up: %s
on-arrival: {!
Q.month_actions += 1; Q.council_timer = 3;
RO.swapAdvisor(Q, Q.adv_in, '%s');
!}

%s has gone back to the party's work, and [+ adv_in_name +] has taken the seat on the council.

- @root: Continue.
''' % (k, k, v[2], k, v[0]))
    # replace someone: then choose who takes the seat
    for k, v in table.items():
        inn = '\n'.join('- @in_%s: Call on %s instead.' % (o, table[o][0]) for o in table)
        lines.append('''@drop_%s
view-if: on_%s = 1 and adv_reserve >= 1
subtitle: Now offers: %s
on-arrival: {!
Q.adv_out = '%s';
Q.adv_out_name = "%s";
!}

%s offers: %s

Who should take the seat?

%s
- @in_random: Whoever the party sends from the reserve.
- @root: Think again.
''' % (k, k, v[2], k, v[0], v[0], v[2], inn))
    for k, v in table.items():
        lines.append('''@in_%s
view-if: avail_%s = 1 and on_%s = 0
new-page: true
subtitle: Offers: %s
on-arrival: {!
Q.month_actions += 1; Q.council_timer = 3;
RO.swapAdvisor(Q, '%s', Q.adv_out);
!}

[+ adv_out_name +] has stepped down from the council, and %s has taken the seat.

- @root: Continue.
''' % (k, k, k, v[2], k, v[0]))
    lines.append('''@in_random
new-page: true
on-arrival: {!
Q.month_actions += 1; Q.council_timer = 3;
RO.replaceAdvisor(Q, Q.adv_out);
!}

[+ adv_out_name +] has stepped down from the council, and somebody from the reserve has taken the seat.

- @root: Continue.
''')
    open(os.path.join(OUT, 'council.scene.dry'), 'w', encoding='utf-8').write('\n'.join(lines))


def offers(actions):
    """What an advisor can do, in a line: the action's name and what it does."""
    return '; '.join('%s (%s)' % (t, sub.rstrip('.')) for t, sub in actions)


def card_image(aid):
    """The advisor's period photograph if tools/fetch_art.py has placed one, otherwise the plain placeholder."""
    for ext in ('.jpg', '.png'):
        if os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'out', 'html', 'img', 'portraits', aid + ext)):
            return 'img/portraits/%s%s' % (aid, ext)
    return 'img/cards/%s.svg?v=2' % aid


def main():
    os.makedirs(OUT, exist_ok=True)
    for (aid, title, tag, flag, bio, atitle, asub, cond, unavail, js, result) in ADVISORS:
        choose = 'advisor_action_timer <= 0' + (' and ' + cond if cond else '')
        un = '[? if advisor_action_timer > 0 : [+ advisor_action_timer +] months before the next advisor action. ?]'
        if cond:
            un += '[? if not (' + cond + ') : ' + unavail + ' ?]'
        text = f"""title: {title}
subtitle: {offers([(atitle, asub)])}
is-pinned-card: true
card-image: {card_image(aid)}
tags: advisor, {tag}
new-page: true
view-if: {flag} = 1 and (player_party = 'menshevik' or lent_{aid} = 1) and on_{aid} = 1

= {title}

{bio}

- @action
- @root: Return to main

@action
title: {atitle}
subtitle: {asub}
choose-if: {choose}
unavailable-subtitle: {un}
on-arrival: {{!
Q.advisor_action_timer = 6;
Q.last_advisor_action = 1;
Q.month_actions += 1;
{js}
!}}

{result}

- @cancel_advisor_action: Cancel action.
- @root: Continue.
"""
        with open(os.path.join(OUT, aid + '.scene.dry'), 'w', encoding='utf-8') as f:
            f.write(text)
    for (aid, title, tag, flag, bio, party, actions) in OTHERS:
        acts = ''
        scenes = ''
        for i, (atitle, asub, cond, unavail, js, result) in enumerate(actions):
            choose = 'advisor_action_timer <= 0' + (' and ' + cond if cond else '')
            un = '[? if advisor_action_timer > 0 : [+ advisor_action_timer +] months before the next advisor action. ?]'
            if cond:
                un += '[? if not (' + cond + ') : ' + unavail + ' ?]'
            sid = 'action' if i == 0 else 'action%d' % (i + 1)
            acts += '- @%s\n' % sid
            scenes += f"""@{sid}
title: {atitle}
subtitle: {asub}
choose-if: {choose}
unavailable-subtitle: {un}
on-arrival: {{!
Q.advisor_action_timer = 6;
Q.last_advisor_action = 1;
Q.month_actions += 1;
{js}
!}}

{result}

- @cancel_advisor_action: Cancel action.
- @root: Continue.

"""
        text = f"""title: {title}
subtitle: {offers([(a[0], a[1]) for a in actions])}
is-pinned-card: true
card-image: {card_image(aid)}
tags: advisor, {tag}
new-page: true
view-if: {flag} = 1 and (player_party = '{party}' or lent_{aid} = 1) and on_{aid} = 1

= {title}

{bio}

{acts}- @root: Return to main

{scenes}"""
        with open(os.path.join(OUT, aid + '.scene.dry'), 'w', encoding='utf-8') as f:
            f.write(text.rstrip() + '\n')
    table = {}
    for (aid, title, tag, flag, bio, atitle, asub, cond, unavail, js, result) in ADVISORS:
        table[aid] = (title, 'menshevik', offers([(atitle, asub)]))
    for (aid, title, tag, flag, bio, party, actions) in OTHERS:
        table[aid] = (title, party, offers([(a[0], a[1]) for a in actions]))
    write_model_table(table)
    # the served copy of the model must match (tools/test_model.js checks it)
    here = os.path.dirname(__file__)
    shutil.copyfile(os.path.join(here, 'model.js'), os.path.join(here, '..', 'out', 'html', 'model.js'))
    write_council(table)
    print('wrote', len(ADVISORS), '+', len(OTHERS), 'advisors and the council')

main()
