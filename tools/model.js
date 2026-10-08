// Red October model: stats drift, factions, support and the Civil War front.
// Pure functions of the quality object Q, so they can be tested in node.
// A copy is served as out/html/model.js (see tools/sync_model.sh) and loaded by index.html.
var RO = (function() {
  // Voter groups ("classes"). The old 'middle strata' are split into four, so that the support of each
  // can be shown separately. Campaign boosts still use the six boost groups (boost_middle covers the four).
  var GROUPS = ['workers', 'soldiers', 'peasants', 'smallbiz', 'bigbiz', 'bureaucrats', 'intelligentsia', 'railway', 'nations'];
  var BOOST_GROUPS = ['workers', 'soldiers', 'peasants', 'middle', 'railway', 'nations'];
  var CLASS_NAMES = {workers: 'Urban workers', soldiers: 'Soldiers and sailors', peasants: 'Peasants',
    smallbiz: 'Small business owners and artisans', bigbiz: 'Large business owners and landowners',
    bureaucrats: 'Bureaucrats and officials', intelligentsia: 'Professionals and the intelligentsia',
    railway: 'Railway and postal workers', nations: 'National minorities'};
  var MIDDLE_SPLIT = {smallbiz: 0.35, bigbiz: 0.10, bureaucrats: 0.25, intelligentsia: 0.30};
  var MIDDLE_BOOST = {smallbiz: 1, bigbiz: 0.3, bureaucrats: 1, intelligentsia: 1};
  var PARTIES = ['bol', 'lsr', 'sr', 'men', 'kad', 'pop', 'nat', 'oth'];
  var PARTY_NAMES = {bol: 'Bolsheviks', lsr: 'Left SRs', sr: 'SRs', men: 'Mensheviks', kad: 'Kadets',
                     pop: 'Popular Socialists and Trudoviks', nat: 'National parties', oth: 'Anarchists and others'};
  var FACTIONS = ['defencist', 'intl', 'rightdef', 'unions', 'bund'];
  var FACTIONS_ALL = FACTIONS;

  // Base appeal in March 1917, before any pressure. Columns follow PARTIES.
  var BASE = {
    workers:  {bol: 12, lsr: 1, sr: 22, men: 40, kad: 6,  pop: 3,  nat: 2,  oth: 14},
    soldiers: {bol: 8,  lsr: 2, sr: 45, men: 22, kad: 5,  pop: 2,  nat: 5,  oth: 11},
    peasants: {bol: 2,  lsr: 3, sr: 70, men: 3,  kad: 4,  pop: 6,  nat: 8,  oth: 4},
    smallbiz: {bol: 1,  lsr: 0, sr: 16, men: 8,  kad: 42, pop: 17, nat: 8,  oth: 8},
    bigbiz:   {bol: 0,  lsr: 0, sr: 3,  men: 1,  kad: 82, pop: 4,  nat: 5,  oth: 5},
    bureaucrats: {bol: 2, lsr: 0, sr: 14, men: 14, kad: 40, pop: 12, nat: 7, oth: 11},
    intelligentsia: {bol: 3, lsr: 0, sr: 24, men: 25, kad: 26, pop: 15, nat: 5, oth: 2},
    railway:  {bol: 10, lsr: 1, sr: 25, men: 40, kad: 8,  pop: 3,  nat: 5,  oth: 8},
    nations:  {bol: 4,  lsr: 1, sr: 20, men: 12, kad: 4,  pop: 3,  nat: 45, oth: 11}
  };
  // How much each voter group counts in each arena.
  var ARENAS = {
    soviets:    {workers: 30, soldiers: 40, peasants: 10, middle: 5,  railway: 5,  nations: 10},
    dumas:      {workers: 40, soldiers: 10, peasants: 0,  middle: 40, railway: 5,  nations: 5},
    assembly:   {workers: 12, soldiers: 18, peasants: 50, middle: 8,  railway: 2,  nations: 10},
    provincial: {workers: 50, soldiers: 5,  peasants: 10, middle: 15, railway: 15, nations: 5}
  };
  (function() {
    for (var a in ARENAS) {
      var w = ARENAS[a];
      for (var g in MIDDLE_SPLIT) { w[g] = w.middle * MIDDLE_SPLIT[g]; }
      delete w.middle;
    }
  })();
  // Arena-specific biases: soviet delegates over-represent town parties, the capitals went Bolshevik, etc.
  var ARENA_BIAS = {
    soviets:    {men: 1.6, bol: 1.3, sr: 1.15},
    dumas:      {bol: 2.2, men: 0.6, kad: 1.1},
    assembly:   {bol: 1.25, men: 0.5, nat: 1.2, sr: 0.97},
    provincial: {}
  };
  // Historical pressure of the Whites (0-100) by half-month index, used from mid-1918.
  var WHITE_PRESSURE = [[30, 5], [34, 25], [44, 45], [48, 45], [56, 60], [66, 85], [70, 60], [76, 35],
                        [84, 45], [92, 20], [96, 8], [200, 5]];


  // ---- the playable parties ----
  // Factions keep the same five keys in every campaign (their roles are the same: defencist = the
  // main line, intl = the left wing, rightdef = the right wing, unions = the organisation men, bund =
  // a late or special current); only the names, sizes and leaders differ.
  var PARTY = {
    menshevik: {
      slot: 'men', name: 'Mensheviks', pname: 'the Mensheviks', partner: 'SRs', partner_slot: 'sr',
      members: 60, memDiv: 60, memScale: 1, memCap: 400, resources: 3, legality: 3,
      rel: {ally: 65, lsr: 30, bol: 25, kad: 30, men: 0}, relBase: {ally: 55, lsr: 30, bol: 25, kad: 30},
      factions: {
        defencist: [50, 0, 'The Revolutionary Defencists'], intl: [20, 20, 'The Internationalists'],
        rightdef: [12, 10, 'The Right Defencists'], unions: [10, 5, 'The trade unionists and cooperators'],
        bund: [8, 5, 'The Bund']
      },
      labels: {intl: 'the Internationalists', defencist: 'the Defencists', rightdef: 'the Right Defencists'},
      advisors: ['dan', 'chkheidze', 'liber', 'lidia', 'abramovich', 'potresov', 'sukhanov', 'khinchuk']
    },
    lsr: {
      slot: 'lsr', name: 'Left SRs', pname: 'the Left SRs', partner: 'SRs', partner_slot: 'sr',
      members: 40, memDiv: 40, memScale: 0.8, memCap: 200, resources: 2, legality: 3, pollNeutral: 3,
      // rel_ally is the relation with the SR party; rel_lsr stands for the Mensheviks in this campaign
      rel: {ally: 55, lsr: 40, bol: 40, kad: 15, men: 40}, relBase: {ally: 45, lsr: 35, bol: 40, kad: 15},
      factions: {
        defencist: [45, 0, 'The Kamkov-Spiridonova leadership'], intl: [20, 15, 'The pro-Bolshevik Left SRs'],
        rightdef: [20, 10, 'The pro-coalition Left SRs (Natanson, Kolegaev)'], unions: [15, 5, 'The village organisers'],
        bund: [0, 0, 'The Narodnik Communists']
      },
      labels: {intl: 'the pro-Bolshevik Left SRs', defencist: 'the leadership', rightdef: 'the pro-coalition Left SRs'},
      advisors: ['spiridonova', 'kamkov', 'natanson']
    },
    sr: {
      slot: 'sr', name: 'SRs', pname: 'the SRs', partner: 'Mensheviks', partner_slot: 'men',
      members: 300, memDiv: 150, memScale: 2.5, memCap: 1200, resources: 3, legality: 3,
      rel: {ally: 65, lsr: 70, bol: 20, kad: 35, men: 65}, relBase: {ally: 55, lsr: 60, bol: 25, kad: 35},
      factions: {
        defencist: [30, 0, 'The Centre (Chernov)'], intl: [20, 25, 'The Left SRs'],
        rightdef: [25, 5, 'The Right SRs'], unions: [25, 5, 'The Right Centre (Gots, Zenzinov)'],
        bund: [0, 0, 'The Ufa delegation']
      },
      labels: {intl: 'the Left SRs', defencist: 'the Centre', rightdef: 'the Right SRs'},
      advisors: ['chernov', 'avksentiev', 'breshkovskaya', 'gots', 'zenzinov']
    }
  };
  var ALL_ADVISORS = ['dan', 'chkheidze', 'tsereteli', 'liber', 'lidia', 'abramovich', 'potresov', 'sukhanov',
    'khinchuk', 'martov', 'skobelev', 'gvozdev', 'axelrod', 'broido', 'batursky', 'zhordania',
    'chernov', 'avksentiev', 'breshkovskaya', 'gots', 'zenzinov', 'volsky',
    'spiridonova', 'kamkov', 'natanson', 'steinberg', 'kolegaev', 'proshian', 'aleksandrovich'];

  // Set everything that depends on which party the player leads.
  function initParty(Q, party) {
    var c = PARTY[party];
    Q.player_party = party;
    Q.player_slot = c.slot;
    Q.pname = c.name;
    Q.pname_the = c.pname;
    Q.partner_name = c.partner;
    Q.partner_slot = c.partner_slot;
    Q.third_name = party === 'lsr' ? 'Mensheviks' : 'Left SRs';
    // history: the Mensheviks and the SRs begin as a bloc; the Left SRs begin inside the SR party
    Q.ally_lvl = party === 'lsr' ? 3 : 2; Q.ally_lsr = 0; Q.ally_bol = 0;
    Q.members = c.members;
    Q.mem_div = c.memDiv;
    Q.mem_scale = c.memScale;
    Q.mem_cap = c.memCap;
    Q.poll_neutral = c.pollNeutral || 9;
    Q.resources = c.resources;
    Q.legality = c.legality;
    Q.rel_ally = c.rel.ally; Q.rel_lsr = c.rel.lsr; Q.rel_bol = c.rel.bol; Q.rel_kad = c.rel.kad; Q.rel_men = c.rel.men;
    Q.rel_base_ally = c.relBase.ally; Q.rel_base_lsr = c.relBase.lsr; Q.rel_base_bol = c.relBase.bol; Q.rel_base_kad = c.relBase.kad;
    Q.factions = Object.keys(c.factions);
    for (var i = 0; i < FACTIONS.length; i++) {
      var f = FACTIONS[i], v = c.factions[f];
      Q[f + '_strength'] = v[0]; Q[f + '_dissent'] = v[1]; Q['flabel_' + f] = v[2];
    }
    for (i = 0; i < ALL_ADVISORS.length; i++) { Q[ALL_ADVISORS[i] + '_advisor'] = 0; }
    for (i = 0; i < c.advisors.length; i++) { Q[c.advisors[i] + '_advisor'] = 1; }
    Q.adv_active = [];
    syncAdvisors(Q);
    Q.dues_income = Math.max(1, Math.round(Q.members / Q.mem_div));
    // short phrases for prose in shared events
    var L = c.labels;
    Q.ilbl = L.intl; Q.dlbl = L.defencist; Q.rlbl = L.rightdef;
    Q.Ilbl = L.intl.charAt(0).toUpperCase() + L.intl.slice(1);
    Q.Dlbl = L.defencist.charAt(0).toUpperCase() + L.defencist.slice(1);
    Q.Rlbl = L.rightdef.charAt(0).toUpperCase() + L.rightdef.slice(1);
  }

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  function dix(year, month, half) { return (year - 1917) * 24 + (month - 1) * 2 + (half || 0); }

  function grievance(Q) {
    return (Q.war_weariness + (100 - Q.bread) + Q.land_pressure + (100 - Q.ruble)) / 4;
  }

  function multipliers(Q) {
    var G = grievance(Q);
    var dg = (G - 55) / 45;
    var blame = Q.in_coalition ? 1 : 0.3;
    var sd = Q.soviet_democracy / 100;
    var rep = Q.repression / 100;
    var m = {};
    m.bol = Math.exp(2.1 * dg) * (0.4 + Q.bolshevik / 80);
    m.men = Math.exp(-2.8 * blame * dg) * (0.75 + 0.25 * sd) * (1 - 0.4 * rep);
    m.sr = Math.exp(-1.0 * blame * dg) * (0.75 + 0.25 * sd) * (1 - 0.4 * rep);
    m.lsr = Math.exp(0.9 * dg) * (1 + (Q.land_pressure - 40) / 100) * (1 - 0.3 * rep);
    m.kad = Math.exp(0.9 * (Q.right_threat - 30) / 50) * Math.exp(-0.9 * dg);
    m.pop = 1; m.nat = 1; m.oth = 1;
    return m;
  }

  // The player's campaign boost among one group (boost_middle spreads over the four middle groups).
  function boostFor(Q, g) {
    return (Q['boost_' + g] || 0) + (MIDDLE_BOOST[g] ? (Q.boost_middle || 0) * MIDDLE_BOOST[g] : 0);
  }

  // support[group][party]: fractions that sum to 1 within each group.
  // Before the split the Left SRs are inside the SR party's lists: their appeal is added to the SR
  // row, and also reported as row.lsr_in so that a Left SR player has a poll number of their own.
  function groupSupport(Q) {
    var m = multipliers(Q), out = {}, gi, pi;
    var lsrMult = Q.player_slot === 'lsr' ? 3 : 1;
    for (gi = 0; gi < GROUPS.length; gi++) {
      var g = GROUPS[gi], tot = 0, row = {};
      var lsrA = BASE[g].lsr * m.lsr * lsrMult;
      if (Q.player_slot === 'lsr') { lsrA += boostFor(Q, g); }
      if (lsrA < 0.05) { lsrA = 0.05; }
      for (pi = 0; pi < PARTIES.length; pi++) {
        var p = PARTIES[pi];
        var a = BASE[g][p] * m[p];
        if (p === 'lsr') { a = lsrA; }
        else if (p === Q.player_slot) { a += boostFor(Q, g); }
        if (p === 'lsr' && !Q.lsr_split) { a = 0; }
        if (p === 'sr' && !Q.lsr_split) { a += lsrA; }
        if (a < 0.05) { a = 0.05; }
        row[p] = a; tot += a;
      }
      row.lsr_in = Q.lsr_split ? 0 : lsrA;
      for (pi = 0; pi < PARTIES.length; pi++) { row[PARTIES[pi]] /= tot; }
      row.lsr_in /= tot;
      out[g] = row;
    }
    return out;
  }

  // vote share (percent) of each party in an arena. extra: optional per-party multipliers.
  function arenaResult(Q, arena, extra) {
    var gs = groupSupport(Q), w = ARENAS[arena], bias = ARENA_BIAS[arena] || {}, res = {}, tot = 0, gi, pi;
    for (pi = 0; pi < PARTIES.length; pi++) { res[PARTIES[pi]] = 0; }
    res.lsr_in = 0;
    for (gi = 0; gi < GROUPS.length; gi++) {
      var g = GROUPS[gi];
      for (pi = 0; pi < PARTIES.length; pi++) {
        var p = PARTIES[pi], v = gs[g][p] * w[g] * (bias[p] || 1);
        if (extra && extra[p]) { v *= extra[p]; }
        res[p] += v; tot += v;
      }
      res.lsr_in += gs[g].lsr_in * w[g] * (bias.sr || 1);
    }
    for (pi = 0; pi < PARTIES.length; pi++) { res[PARTIES[pi]] = 100 * res[PARTIES[pi]] / tot; }
    res.lsr_in = 100 * res.lsr_in / tot;
    // allies vote together in the soviets: a share of each ally's vote goes to the player
    if (arena === 'soviets' || arena === 'provincial') {
      var you = Q.player_slot;
      if (!(you === 'lsr' && !Q.lsr_split)) {
        for (var wi = 0; wi < WHO.length; wi++) {
          var lv = Q[LVL[WHO[wi]]] || 0;
          var slot = allySlot(Q, WHO[wi]);
          if (lv >= 1 && slot !== you && res[slot] > 0 && !(slot === 'lsr' && !Q.lsr_split)) {
            var t = res[slot] * 0.04 * lv;
            res[you] += t; res[slot] -= t;
          }
        }
      }
    }
    return res;
  }

  // Which arena the sidebar polls, by phase.
  function currentArena(Q) {
    if (Q.phase <= 1) { return 'soviets'; }
    if (Q.phase === 2) { return 'assembly'; }
    return 'provincial';
  }

  // Store percentages of the current arena as Q.poll_<party> (rounded) for the sidebar.
  function updatePolls(Q) {
    var r = arenaResult(Q, currentArena(Q));
    for (var pi = 0; pi < PARTIES.length; pi++) {
      Q['poll_' + PARTIES[pi]] = Math.round(r[PARTIES[pi]]);
    }
    Q.poll_lsr_in = Math.round(r.lsr_in);
    // the player's own party, as a plain number for event conditions
    Q.player_poll = (Q.player_slot === 'lsr' && !Q.lsr_split) ? r.lsr_in : r[Q.player_slot];
  }

  function whitePressure(d) {
    for (var i = 1; i < WHITE_PRESSURE.length; i++) {
      if (d <= WHITE_PRESSURE[i][0]) {
        var a = WHITE_PRESSURE[i - 1], b = WHITE_PRESSURE[i];
        return a[1] + (b[1] - a[1]) * (d - a[0]) / (b[0] - a[0]);
      }
    }
    return 5;
  }

  // Faction strengths are shares of 100; dissent is the weighted average of faction dissent.
  function factionList(Q) { return Q.factions && Q.factions.length ? Q.factions : FACTIONS; }

  function updateFactions(Q) {
    var total = 0, i, f, FACTIONS = factionList(Q);
    for (i = 0; i < FACTIONS.length; i++) {
      f = FACTIONS[i];
      if (Q[f + '_strength'] < 0) { Q[f + '_strength'] = 0; }
      if (Q[f + '_dissent'] < 0) { Q[f + '_dissent'] = 0; }
      if (Q[f + '_dissent'] > 100) { Q[f + '_dissent'] = 100; }
      total += Q[f + '_strength'];
    }
    if (total <= 0) { total = 1; }
    var d = 0;
    for (i = 0; i < FACTIONS.length; i++) {
      f = FACTIONS[i];
      Q[f + '_strength'] = 100 * Q[f + '_strength'] / total;
      d += Q[f + '_strength'] * Q[f + '_dissent'];
    }
    // difficulty (-1 easy, 0 normal, 1 hard): the currents are harder to hold together on Hard
    Q.dissent = clamp(d / 10000 * (1 + 0.15 * (Q.difficulty || 0)) + (Q.dissent_extra || 0), 0, 0.95);
    Q.dissent_percent = Q.dissent * 100;
  }

  var STATS = ['bread', 'ruble', 'war_weariness', 'army_discipline', 'land_pressure', 'bolshevik',
               'right_threat', 'soviet_democracy', 'repression', 'red_army', 'white_front', 'members',
               'rel_ally', 'rel_lsr', 'rel_bol', 'rel_kad'];
  function clampStats(Q) {
    for (var i = 0; i < STATS.length; i++) {
      var s = STATS[i];
      if (Q[s] === undefined) { continue; }
      Q[s] = clamp(Q[s], 0, STATS[i] === 'members' ? (Q.mem_cap || 400) : 100);
    }
    Q.legality = clamp(Math.round(Q.legality), 0, 3);
    if (Q.resources < 0) { Q.resources = 0; }
    for (var g = 0; g < BOOST_GROUPS.length; g++) {
      var k = 'boost_' + BOOST_GROUPS[g];
      Q[k] = clamp(Q[k] || 0, -20, 40);
    }
  }

  // Per-turn drift of the stats. tl is the turn length in months (0.5 or 1).
  function drift(Q, tl) {
    var G = grievance(Q);
    if (Q.at_war) {
      Q.war_weariness += 1.6 * tl;
      Q.bread -= 1.8 * tl;
      Q.ruble -= 2.6 * tl;
      Q.army_discipline -= 1.3 * tl;
      if (!Q.land_decree) { Q.land_pressure += 2.2 * tl; }
    } else {
      // the Civil War wears on until Wrangel leaves the Crimea (November 1920); then the country begins to rest
      Q.war_weariness += (Q.bol_regime ? (Q.dix >= 94 ? -1.5 : 0.5) : 0.2) * tl;
      Q.bread -= (Q.bol_regime ? 0.4 : 0.2) * tl;
      // without the war the ruble can recover: towards 50 under a republic, and under the Bolsheviks only once the
      // market is allowed back (the NEP, or the party's programme adopted early); War Communism prints it away
      if (!Q.bol_regime) { Q.ruble += (0.05 * (50 - Q.ruble) - 0.3) * tl; }
      else if (Q.nep_early || Q.dix >= 100) { Q.ruble += (0.05 * (40 - Q.ruble) - 0.2) * tl; }
      else { Q.ruble -= 1.5 * tl; }
      if (!Q.land_decree) { Q.land_pressure += 1.0 * tl; }
    }
    if (Q.land_decree) { Q.land_pressure -= 1.0 * tl; }
    // the Bolsheviks grow on grievance; once in power the number is their regime's grip
    if (!Q.bol_regime) {
      if (Q.assembly_survives) {
        // a legitimate elected government wears the Bolsheviks' appeal down, unless the country is in ruins
        Q.bolshevik += tl * (0.05 * (30 - Q.bolshevik) + 0.16 * Math.max(0, G - 60));
      } else {
        Q.bolshevik += tl * Math.max(0.3, 1.2 + 9 * (G - 50) / 50);
      }
      Q.right_threat += (25 - Q.right_threat) * 0.04 * tl;
      Q.soviet_democracy += (60 - Q.soviet_democracy) * 0.1 * tl;
    } else {
      Q.soviet_democracy -= (0.5 + Q.repression / 60) * tl;
      Q.repression += (Q.legality <= 1 ? 0.6 : 0.3) * tl;
      Q.red_army += 1.2 * tl * (Q.red_army < 70 ? 1 : 0);
    }
    // relations with other parties drift back toward where they started unless tended
    var relBase = {rel_ally: Q.rel_base_ally || 55, rel_lsr: Q.rel_base_lsr || 30, rel_bol: Q.rel_base_bol || 25, rel_kad: Q.rel_base_kad || 30};
    for (var rk in relBase) {
      Q[rk] += (relBase[rk] - Q[rk]) * 0.08 * tl;
    }
    // the player's campaign boosts fade slowly
    for (var g = 0; g < BOOST_GROUPS.length; g++) {
      var k = 'boost_' + BOOST_GROUPS[g];
      Q[k] = (Q[k] || 0) * (1 - 0.05 * tl);
    }
  }

  // Monthly: the Civil War front moves toward its target.
  function updateFront(Q, d) {
    if (!Q.bol_regime || d < dix(1918, 6)) { return; }
    var target = whitePressure(d) + 8 * Q.white_aid - 0.5 * Q.red_army;
    Q.white_front += 0.3 * (target - Q.white_front);
  }

  // Rounded copies of the stats (Q.d_<name>) for the sidebar and event text.
  function display(Q) {
    var names = STATS.concat(['war_weariness', 'resources']);
    for (var i = 0; i < names.length; i++) {
      if (Q[names[i]] !== undefined) { Q['d_' + names[i]] = Math.round(Q[names[i]]); }
    }
    var FACTIONS = FACTIONS_ALL;
    for (i = 0; i < FACTIONS.length; i++) {
      Q['d_' + FACTIONS[i] + '_strength'] = Math.round(Q[FACTIONS[i] + '_strength']);
      Q['d_' + FACTIONS[i] + '_dissent'] = Math.round(Q[FACTIONS[i] + '_dissent']);
    }
    Q.d_dissent = Math.round(Q.dissent * 100);
    Q.d_grievance = Math.round(grievance(Q));
    Q.strength = Math.round(strength(Q));
    CAMPS.forEach(function(k) { Q['odds_' + k] = Math.round(100 * squashOdds(Q, k)); });
  }

  // ---- helpers for cards and events ----
  // Campaign among voter groups. Pass a group name or {group: points}. Dissent and a hostile legal
  // status blunt the effect; a negative boost is not blunted.
  function boost(Q, a, pts) {
    var obj = {};
    if (typeof a === 'string') { obj[a] = pts; } else { obj = a; }
    var f = (1 - Q.dissent) * (Q.legality <= 1 ? 0.6 : 1);
    for (var g in obj) {
      Q['boost_' + g] = (Q['boost_' + g] || 0) + (obj[g] > 0 ? obj[g] * f : obj[g]);
    }
  }
  // Move a faction's strength and dissent.
  function fac(Q, name, strength, dissentChange) {
    Q[name + '_strength'] += strength;
    Q[name + '_dissent'] += (dissentChange || 0);
  }
  // Change several stats at once: RO.add(Q, {bread: 3, ruble: -2}).
  function add(Q, obj) {
    for (var k in obj) { Q[k] = (Q[k] || 0) + obj[k]; }
  }
  // Pay for an action: returns false if the party cannot afford it.
  function pay(Q, n) {
    if (Q.resources < n) { return false; }
    Q.resources -= n;
    return true;
  }

  // Store an arena's result as Q.res_<party> (percent, one decimal) and Q.seat_<party> (of Q.seats_total).
  function setResults(Q, arena, extra, totalSeats) {
    var r = arenaResult(Q, arena, extra);
    Q.seats_total = totalSeats || 100;
    for (var pi = 0; pi < PARTIES.length; pi++) {
      var p = PARTIES[pi];
      Q['res_' + p] = Math.round(r[p] * 10) / 10;
      Q['seat_' + p] = Math.round(r[p] * Q.seats_total / 100);
    }
    Q.res_lsr_in = Math.round(r.lsr_in * 10) / 10;
    return r;
  }

  // How strong the Bolsheviks are when the moment for an insurrection comes.
  function bolPower(Q) {
    return 14 + Q.bolshevik + 0.5 * (grievance(Q) - 55)
      - (Q.homogeneous_gov ? 6 : 0)           // a government of the Soviet parties alone
      - (Q.ca_elected ? 6 : 0)                // the Assembly election has already been held
      - 3 * Math.min(Q.land_committees || 0, 3) // the land question is being settled
      - ((Q.stockholm || 0) >= 3 ? 6 : 0)     // a general peace is in sight
      - (Q.bread >= 35 ? 4 : 0)
      - (Q.land_decree ? 5 : 0)
      + (Q.lsr_backs_bol ? 8 : 0);            // the Left SRs and the sailors stand with the Bolsheviks
  }

  // Kornilov's march: force of the Right against the resistance of the democracy.
  function kornilovForce(Q) {
    return Q.right_threat + 0.25 * (100 - Q.army_discipline) - 10;
  }
  function kornilovResistance(Q, bonus) {
    return 40 + (bonus || 0) + 5 * Math.min(Q.militia || 0, 4) + 0.2 * (Q.boost_railway || 0) + 0.25 * (Q.boost_soldiers || 0) +
           (Q.homogeneous_gov ? 5 : 0) + (Q.soviet_democracy - 50) / 8 + (Q.player_party === 'sr' ? 6 : 0) - 4 * (Q.difficulty || 0);
  }


  // ---- the alliance web ----
  // Every campaign has relations with the other two playable parties and the Bolsheviks:
  //   'ally'  = the main partner (SRs for the Mensheviks and the Left SRs, Mensheviks for the SRs),
  //   'third' = the other playable party (Left SRs for the Mensheviks and the SRs, Mensheviks for the Left SRs),
  //   'bol'   = the Bolsheviks.
  // Levels: 1 cooperation (relations 40), 2 bloc (60, compatible lines), 3 coalition (75, shared power).
  var WHO = ['ally', 'third', 'bol'];
  var REL = {ally: 'rel_ally', third: 'rel_lsr', bol: 'rel_bol'};
  var LVL = {ally: 'ally_lvl', third: 'ally_lsr', bol: 'ally_bol'};
  var LEVEL_NAMES = ['no alliance', 'cooperation', 'bloc', 'coalition'];
  var SLOTS = {menshevik: {ally: 'sr', third: 'lsr'}, sr: {ally: 'men', third: 'lsr'}, lsr: {ally: 'sr', third: 'men'}};
  // an advisor of the ally joins the player's deck at the coalition level
  var LEND = {menshevik: {ally: 'chernov', third: 'spiridonova'}, sr: {ally: 'dan', third: 'spiridonova'},
              lsr: {ally: 'chernov', third: 'martov'}};

  function allySlot(Q, who) { return who === 'bol' ? 'bol' : SLOTS[Q.player_party][who]; }

  // can the player be on the same line as this party? (the war and the soviets)
  function compatible(Q, who) {
    if (who === 'bol') { return !Q.armed_struggle && Q.war_line <= 1; }
    var slot = allySlot(Q, who);
    if (slot === 'lsr') { return !Q.armed_struggle && Q.war_line <= 2; }
    return Math.abs(Q.war_line) <= 3;
  }
  // is there a government or a soviet majority to share?
  function sharedPower(Q, who) {
    if (who === 'bol') { return !!(Q.vikzhel_deal || Q.assembly_survives || Q.lsr_in_gov); }
    return !!(Q.in_coalition || Q.assembly_survives || Q.vikzhel_deal || Q.lsr_in_gov);
  }
  // the level that the current relations would allow
  function allianceTarget(Q, who) {
    var rel = Q[REL[who]], lvl = 0;
    if (rel >= 40) { lvl = 1; }
    if (rel >= 60 && compatible(Q, who)) { lvl = 2; }
    if (rel >= 75 && compatible(Q, who) && sharedPower(Q, who)) { lvl = 3; }
    return lvl;
  }
  // Try to raise an alliance. Returns the new level, or 0 if nothing changed.
  // What stands between an alliance and the next level: 'relations', 'lines' (the parties' lines on the war and the
  // soviets are not compatible) or 'power' (there is no government or soviet majority to share).
  function allianceBlocker(Q, who) {
    var rel = Q[REL[who]], cur = Q[LVL[who]] || 0;
    if (cur < 1 && rel < 40) { return 'relations'; }
    if (cur < 2) { return rel < 60 ? 'relations' : (compatible(Q, who) ? '' : 'lines'); }
    if (rel < 75) { return 'relations'; }
    if (!compatible(Q, who)) { return 'lines'; }
    return sharedPower(Q, who) ? '' : 'power';
  }
  function formalize(Q, who) {
    var t = allianceTarget(Q, who);
    Q.alliance_level = t;
    if (t > (Q[LVL[who]] || 0)) { Q[LVL[who]] = t; Q.alliance_msg = 1; return t; }
    Q.alliance_msg = 0;
    Q.alliance_why = allianceBlocker(Q, who);
    return 0;
  }
  function levelName(l) { return LEVEL_NAMES[clamp(Math.round(l), 0, 3)]; }

  // Alliances erode when relations fall well below what holds them.
  var HOLD = [0, 30, 50, 65];
  function alliancesTurn(Q, tl) {
    var i, who, blocs = 0, feed = 0;
    // Left SRs start inside the SR party; the split ends that
    if (Q.player_party === 'lsr' && Q.lsr_split && !Q.split_alliance_done) {
      Q.split_alliance_done = 1; Q.ally_lvl = 0; Q.chernov_advisor = 0; Q.lent_chernov = 0;
    }
    for (i = 0; i < WHO.length; i++) {
      who = WHO[i];
      var lvl = Q[LVL[who]] || 0;
      while (lvl > 0 && Q[REL[who]] < HOLD[lvl]) { lvl--; }
      Q[LVL[who]] = lvl;
      if (lvl >= 2) { blocs++; }
      if (lvl >= 3) {
        feed += Q['turmoil_' + allySlot(Q, who)] || 0;
        var adv = LEND[Q.player_party] && LEND[Q.player_party][who];
        if (adv && !Q['lent_' + adv] && !Q[adv + '_advisor']) { Q[adv + '_advisor'] = 1; Q['lent_' + adv] = 1; }
      }
    }
    Q.blocs = blocs;
    Q.bloc_lean = blocs;
    // a shared soviet presidium: blocs keep the soviets freer
    Q.soviet_democracy += 0.12 * tl * blocs;
    // the allies' own quarrels feed the player's dissent at the coalition level
    Q.dissent_extra = clamp(0.002 * feed, 0, 0.12);
    // the other parties' turmoil fades
    var slots = ['men', 'sr', 'lsr', 'bol'];
    for (i = 0; i < slots.length; i++) {
      var k = 'turmoil_' + slots[i];
      Q[k] = (Q[k] || 0) * (1 - 0.05 * tl);
    }
  }

  // Historical upheavals in the parties that the player does not lead: [dix, slot, amount]
  var TURMOIL = [[20, 'sr', 50], [22, 'men', 45], [22, 'lsr', 20], [28, 'lsr', 40], [28, 'bol', 30], [34, 'men', 30],
                 [34, 'sr', 40], [36, 'lsr', 90], [44, 'sr', 40], [66, 'sr', 30], [100, 'sr', 20], [100, 'men', 20], [100, 'lsr', 20]];
  function worldTurmoil(Q) {
    for (var i = 0; i < TURMOIL.length; i++) {
      var t = TURMOIL[i], key = 'tm_' + i;
      if (Q.dix >= t[0] && !Q[key]) { Q[key] = 1; Q['turmoil_' + t[1]] = Math.min(100, (Q['turmoil_' + t[1]] || 0) + t[2]); }
    }
  }

  // An alliance breaks at a historical fault line unless relations are high. Returns text for the event.
  function breakIf(Q, who, threshold, text) {
    if ((Q[LVL[who]] || 0) > 0 && Q[REL[who]] < threshold) {
      Q[LVL[who]] = 0; Q[REL[who]] = Math.max(0, Q[REL[who]] - 10);
      return text;
    }
    return '';
  }
  function fault(Q, line) {
    var m = [], p = Q.player_party;
    if (line === 'brest') {
      m.push(breakIf(Q, 'bol', 70, 'The alliance with the Bolsheviks has not survived the treaty.'));
    } else if (line === 'komuch') {
      var srJoins = p === 'sr' ? (!!Q.armed_struggle && !Q.komuch_guaranteed) : (!Q.komuch_averted && !(p === 'menshevik' && Q.armed_struggle));
      if (srJoins) {
        if (p === 'menshevik') { m.push(breakIf(Q, 'ally', 70, 'The Menshevik Central Committee has forbidden its members to join Komuch, and the bloc with the SRs has broken.')); }
        if (p === 'sr') { m.push(breakIf(Q, 'ally', 75, 'The Mensheviks have denounced Komuch, and the bloc with them has broken.')); }
        if (p === 'lsr') { m.push(breakIf(Q, 'ally', 75, 'Komuch has ended whatever understanding there was with the SR party.')); }
      }
    } else if (line === 'july') {
      var rising = p === 'lsr' ? !!Q.lsr_rising : !Q.lsr_uprising_averted;
      if (rising) {
        if (p === 'lsr') {
          m.push(breakIf(Q, 'bol', 101, 'The Bolsheviks have ended the coalition with the Left SRs.'));
          m.push(breakIf(Q, 'third', 75, 'The Mensheviks have kept their distance from the rising.'));
        } else {
          m.push(breakIf(Q, 'third', 75, 'The alliance with the Left SRs did not survive the rising.'));
        }
      }
    } else if (line === 'kolchak') {
      if (p === 'menshevik') { m.push(breakIf(Q, 'ally', 70, 'The SRs sat in the Directory that Kolchak overthrew, and the bloc with them has been called into question.')); }
      if (p === 'lsr') { m.push(breakIf(Q, 'ally', 75, 'The SRs who sat in the Directory have been arrested by officers; nobody in the party will speak of an understanding with them now.')); }
    }
    var out = '';
    for (var i = 0; i < m.length; i++) { if (m[i]) { out += (out ? ' ' : '') + m[i]; } }
    Q.fault_flag = out ? 1 : 0;
    return out;
  }


  // ---- the advisors' council: four active at a time ----
  // BEGIN ADVISORS (written by tools/gen_advisors.py)
  var ADVISORS = {
    martov: {name: "Julius Martov", party: 'menshevik'},
    dan: {name: "Fyodor Dan", party: 'menshevik'},
    tsereteli: {name: "Irakli Tsereteli", party: 'menshevik'},
    chkheidze: {name: "Nikolai Chkheidze", party: 'menshevik'},
    skobelev: {name: "Matvei Skobelev", party: 'menshevik'},
    gvozdev: {name: "Kuzma Gvozdev", party: 'menshevik'},
    potresov: {name: "Alexander Potresov", party: 'menshevik'},
    axelrod: {name: "Pavel Axelrod", party: 'menshevik'},
    abramovich: {name: "Raphael Abramovich", party: 'menshevik'},
    liber: {name: "Mikhail Liber", party: 'menshevik'},
    broido: {name: "Eva Broido", party: 'menshevik'},
    lidia: {name: "Lidia Dan", party: 'menshevik'},
    sukhanov: {name: "Nikolai Sukhanov", party: 'menshevik'},
    batursky: {name: "Boris Batursky", party: 'menshevik'},
    khinchuk: {name: "Lev Khinchuk", party: 'menshevik'},
    zhordania: {name: "Noe Zhordania", party: 'menshevik'},
    chernov: {name: "Viktor Chernov", party: 'sr'},
    avksentiev: {name: "Nikolai Avksentiev", party: 'sr'},
    breshkovskaya: {name: "Ekaterina Breshko-Breshkovskaya", party: 'sr'},
    gots: {name: "Abram Gots", party: 'sr'},
    zenzinov: {name: "Vladimir Zenzinov", party: 'sr'},
    volsky: {name: "Vladimir Volsky", party: 'sr'},
    spiridonova: {name: "Maria Spiridonova", party: 'lsr'},
    kamkov: {name: "Boris Kamkov", party: 'lsr'},
    natanson: {name: "Mark Natanson", party: 'lsr'},
    steinberg: {name: "Isaac Steinberg", party: 'lsr'},
    kolegaev: {name: "Andrei Kolegaev", party: 'lsr'},
    proshian: {name: "Prosh Proshian", party: 'lsr'},
    aleksandrovich: {name: "Pyotr Aleksandrovich", party: 'lsr'}
  };
  // END ADVISORS
  var COUNCIL_SIZE = 4;

  // Advisors who leave the scene in history: abroad, in prison or dead. From this dix on they no longer advise anyone.
  // (Others leave through events: Chkheidze, Khinchuk, the Menshevik leaders arrested in 1921, the SRs of the Directory.)
  var ADVISOR_UNTIL = {
    axelrod: 18,       // abroad from the autumn of 1917, at Stockholm and then in Switzerland; he never came back
    tsereteli: 26,     // to Georgia after the Assembly is dispersed, early 1918
    breshkovskaya: 46, // leaves Russia for America at the end of 1918
    natanson: 54,      // abroad for his health in 1919, dies in Switzerland in July
    gots: 82,          // arrested in 1920, and tried in 1922
    martov: 92,        // leaves for Berlin in September 1920
    abramovich: 92,    // abroad with Martov in 1920
    chernov: 92        // leaves Russia in 1920
  };
  function advisorsAvailable(Q) {
    var out = [];
    for (var id in ADVISORS) {
      if (ADVISOR_UNTIL[id] !== undefined && (Q.dix || 0) >= ADVISOR_UNTIL[id]) { continue; }
      if (Q[id + '_advisor'] && (ADVISORS[id].party === Q.player_party || Q['lent_' + id])) { out.push(id); }
    }
    return out;
  }
  function shuffled(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }
  function nameList(ids) {
    var n = [];
    for (var i = 0; i < ids.length; i++) { n.push(ADVISORS[ids[i]].name); }
    return n.join(', ');
  }
  // Keep the council at four: drop those who have left, fill the gaps from the reserve at random,
  // and set Q.on_<id> (in the council) and Q.avail_<id> (available) for the scenes.
  function syncAdvisors(Q) {
    var avail = advisorsAvailable(Q), active = [], i, id;
    var prev = Q.adv_active || [];
    for (i = 0; i < prev.length; i++) { if (avail.indexOf(prev[i]) >= 0) { active.push(prev[i]); } }
    var pool = shuffled(avail.filter(function(x) { return active.indexOf(x) < 0; }));
    while (active.length < COUNCIL_SIZE && pool.length) { active.push(pool.shift()); }
    Q.adv_active = active;
    for (id in ADVISORS) {
      Q['on_' + id] = active.indexOf(id) >= 0 ? 1 : 0;
      Q['avail_' + id] = avail.indexOf(id) >= 0 ? 1 : 0;
    }
    Q.adv_reserve = pool.length;
    Q.council_list = nameList(active);
    Q.reserve_list = nameList(pool);
  }
  // Replace the whole council by a random draw.
  function reshuffleCouncil(Q) { Q.adv_active = []; syncAdvisors(Q); }
  // Bring one advisor in (the longest-serving steps down), or replace one by a random reserve member.
  function callAdvisor(Q, id) {
    var a = (Q.adv_active || []).slice();
    if (a.indexOf(id) >= 0) { return; }
    if (a.length >= COUNCIL_SIZE) { a.shift(); }
    a.push(id); Q.adv_active = a; syncAdvisors(Q);
  }
  // The player chose both: incoming takes outgoing's seat on the council.
  function swapAdvisor(Q, incoming, outgoing) {
    var a = (Q.adv_active || []).filter(function(x) { return x !== outgoing && x !== incoming; });
    a.push(incoming); Q.adv_active = a; syncAdvisors(Q);
  }
  function replaceAdvisor(Q, id) {
    var a = (Q.adv_active || []).filter(function(x) { return x !== id; });
    var avail = advisorsAvailable(Q);
    var pool = shuffled(avail.filter(function(x) { return a.indexOf(x) < 0 && x !== id; }));
    if (pool.length) { a.push(pool[0]); } else { a.push(id); }
    Q.adv_active = a; syncAdvisors(Q);
  }


  // ---- the Cabinet's standing policies (set from the Cabinet advisor card) ----
  // Settings are 0, 1, 2 in each area; the immediate effects of a change are in tools/gen_cabinet.py.
  // The defaults (land 0, food 1, war 0, order 0, labour 0) have no ongoing effect.
  function policyDrift(Q, tl) {
    var full = Q.in_coalition && !Q.bol_regime, lsr = Q.lsr_in_gov && Q.bol_regime;
    if (!full && !lsr) { return; }
    var land = Q.pol_land || 0, order = Q.pol_order || 0;
    if (land === 1) { Q.land_pressure -= 0.4 * tl; Q.right_threat += 0.1 * tl; }
    if (land === 2) { Q.land_pressure -= 0.8 * tl; Q.right_threat += 0.25 * tl; }
    if (order === 1) { Q.right_threat -= 0.4 * tl; Q.repression += 0.3 * tl; Q.soviet_democracy -= 0.25 * tl; Q.bolshevik -= 0.1 * tl; }
    if (order === 2) { Q.soviet_democracy += 0.25 * tl; Q.right_threat += 0.15 * tl; }
    if (!full) { return; }
    var food = Q.pol_food === undefined ? 1 : Q.pol_food, war = Q.pol_war || 0, labour = Q.pol_labour || 0;
    if (food === 0) { Q.bread -= 0.4 * tl; Q.ruble += 0.3 * tl; }
    if (food === 2) { Q.bread += 0.7 * tl; Q.repression += 0.2 * tl; Q.soviet_democracy -= 0.2 * tl; Q.land_pressure += 0.2 * tl; }
    if (Q.at_war) {
      if (war === 1) { Q.war_weariness -= 0.2 * tl; Q.army_discipline -= 0.2 * tl; }
      if (war === 2) { Q.war_weariness += 0.6 * tl; Q.army_discipline -= 0.3 * tl; }
    }
    var finance = Q.pol_finance || 0;
    if (finance === 1) { Q.ruble += 1.2 * tl; }
    if (finance === 2) { Q.ruble += (Q.at_war ? 1.5 : 0.5) * tl; if (Q.at_war) { Q.war_weariness += 0.2 * tl; } }
    if (labour === 0) { Q.ruble += 0.2 * tl; Q.bolshevik += 0.1 * tl; }
    if (labour === 1) { Q.ruble -= 0.2 * tl; Q.bolshevik -= 0.15 * tl; }
    if (labour === 2) { Q.ruble += 0.15 * tl; Q.bread += 0.1 * tl; Q.soviet_democracy -= 0.05 * tl; }
  }


  // Support of every party in each class, for the right-hand panel.
  // Returns [{id, name, share (percent of this arena's electorate), rows: {party: percent}, you: percent}].
  function classSupport(Q, arena) {
    arena = arena || currentArena(Q);
    var gs = groupSupport(Q), w = ARENAS[arena], bias = ARENA_BIAS[arena] || {}, out = [], total = 0, gi, pi;
    for (gi = 0; gi < GROUPS.length; gi++) { total += w[GROUPS[gi]]; }
    for (gi = 0; gi < GROUPS.length; gi++) {
      var g = GROUPS[gi], rows = {}, t = 0;
      for (pi = 0; pi < PARTIES.length; pi++) { rows[PARTIES[pi]] = gs[g][PARTIES[pi]] * (bias[PARTIES[pi]] || 1); t += rows[PARTIES[pi]]; }
      for (pi = 0; pi < PARTIES.length; pi++) { rows[PARTIES[pi]] = 100 * rows[PARTIES[pi]] / t; }
      var you = rows[Q.player_slot];
      if (Q.player_slot === 'lsr' && !Q.lsr_split) { you = 100 * gs[g].lsr_in * (bias.sr || 1) / t; }
      out.push({id: g, name: CLASS_NAMES[g], share: 100 * w[g] / total, rows: rows, you: you});
    }
    return out;
  }
  // The player's projected share in all four arenas, with the rank among the parties.
  function popularity(Q) {
    var out = [], names = {soviets: 'Congress of Soviets', dumas: 'City dumas', assembly: 'Constituent Assembly', provincial: 'City soviets'};
    for (var a in names) {
      var r = arenaResult(Q, a), you = (Q.player_slot === 'lsr' && !Q.lsr_split) ? r.lsr_in : r[Q.player_slot], rank = 1;
      for (var pi = 0; pi < PARTIES.length; pi++) {
        var p = PARTIES[pi];
        if (p === Q.player_slot || (p === 'lsr' && !Q.lsr_split)) { continue; }
        if (r[p] > you) { rank++; }
      }
      out.push({arena: a, name: names[a], you: you, rank: rank});
    }
    return out;
  }


  // Seats by the largest remainder: shares is {party: percent}; returns {party: seats} adding up to total.
  var PARL_ORDER = ['bol', 'lsr', 'oth', 'sr', 'men', 'pop', 'nat', 'kad'];
  function seatRows(shares, total) {
    var seats = {}, rem = [], sum = 0, i;
    PARL_ORDER.forEach(function(p) {
      var v = (shares[p] || 0) * total / 100;
      seats[p] = Math.floor(v); sum += seats[p]; rem.push([v - seats[p], p]);
    });
    rem.sort(function(a, b) { return b[0] - a[0]; });
    for (i = 0; sum < total; i++) { seats[rem[i % rem.length][1]]++; sum++; }
    return seats;
  }
  function parlRecord(title, total, shares, lsrInPercent) {
    var seats = seatRows(shares, total);
    return {
      title: title, total: total,
      rows: PARL_ORDER.filter(function(p) { return seats[p] > 0; }).map(function(p) { return [p, shares[p] || 0, seats[p]]; }),
      lsrIn: Math.round((lsrInPercent || 0) * total / 100)
    };
  }

  // Remember an election result for the parliament chart: Q.parl_<name> = {title, total, rows: [[party, percent, seats]], lsrIn}.
  function recordParliament(Q, name, title) {
    var shares = {};
    PARL_ORDER.forEach(function(p) { shares[p] = (p === 'lsr' && !Q.lsr_split) ? 0 : (Q['res_' + p] || 0); });
    Q['parl_' + name] = parlRecord(title, Q.seats_total || 100, shares, Q.lsr_split ? 0 : (Q.res_lsr_in || 0));
  }

  // The parliament as it would be if the arena voted today, for the Parliament tab. Sizes follow the real bodies.
  var PARL_SIZE = {soviets: 650, assembly: 703, dumas: 200, provincial: 400};
  var PARL_TITLE = {soviets: 'Congress of Soviets', assembly: 'Constituent Assembly', dumas: 'City dumas', provincial: 'City soviets'};
  function projectParliament(Q, arena) {
    var r = arenaResult(Q, arena), shares = {};
    PARL_ORDER.forEach(function(p) { shares[p] = (p === 'lsr' && !Q.lsr_split) ? 0 : (r[p] || 0); });
    var rec = parlRecord(PARL_TITLE[arena], PARL_SIZE[arena], shares, Q.lsr_split ? 0 : r.lsr_in);
    rec.projected = true;
    return rec;
  }

  // ---- the record of the run, for the ending recap ----
  // One row a turn: [dix, the party's support in the current arena, Bolshevik strength, threat from the Right, soviet democracy, members].
  function recordTurn(Q) {
    if (!Q.hist) { Q.hist = []; }
    var r1 = function(x) { return Math.round((x || 0) * 10) / 10; };
    var row = [Q.dix || 0, r1(Q.player_poll), r1(Q.bolshevik), r1(Q.right_threat), r1(Q.soviet_democracy), Math.round(Q.members || 0)];
    if (Q.hist.length && Q.hist[Q.hist.length - 1][0] === row[0]) { Q.hist[Q.hist.length - 1] = row; } else { Q.hist.push(row); }
  }

  // Will the party be driven abroad when the game ends (the Menshevik exile ending, decided in game_over.scene.dry)?
  // Returns null, or {level: 1 (close) or 2 (as things stand, exile), reasons: [...]}, for the sidebar warning and the
  // exile_warning event. The arrests of August 1921 cost a step of legality unless repression is low and the 1919
  // programme was adopted, so a party one step above the line is warned about them from 1920.
  function exileRisk(Q) {
    if (!Q.bol_regime || Q.player_party !== 'menshevik' || Q.game_over || Q.game_end) { return null; }
    var legMin = Q.difficulty < 0 ? 0 : 1, memMin = (Q.difficulty < 0 ? 12 : 20) * (Q.mem_scale || 1);
    var leg = Math.round(Q.legality || 0), reasons = [], level = 0;
    if (leg <= legMin) { level = 2; reasons.push(leg <= 0 ? 'the party is banned' : 'the party is expelled from the soviets'); }
    else if (leg === legMin + 1 && Q.dix >= 80 && Q.dix < 110 && ((Q.repression || 0) >= 40 || !(Q.program_adopted || Q.nep_early))) {
      level = 1; reasons.push('the arrests expected in 1921 would leave the party ' + (legMin === 0 ? 'banned' : 'expelled from the soviets'));
    }
    if (Q.members <= memMin) { level = 2; reasons.push('too few members are left'); }
    else if (Q.members <= memMin * 1.5) { level = Math.max(level, 1); reasons.push('the membership is close to collapse'); }
    return level ? {level: level, reasons: reasons} : null;
  }

  // A weighted coin for the decisions that no stat can settle.
  function chance(p) { return Math.random() < clamp(p, 0, 1); }

  // ---- the opposition: the camps that answer the party's policies with sanctions and revolts ----
  // Each camp has a hostility (Q.ant_<camp>, 0 to 100) that moves, month by month, towards ten times what its members
  // object to in the party's policies. At 40 the camp tries to sanction the party; at 70 it revolts. The events that carry
  // this out are opp_*.scene.dry; their flags are set here (Q.opp_<camp>_ev = 1 or 2) and the events clear them.
  var CAMPS = ['kad', 'gen', 'bol'];
  var CAMP_NAMES = {kad: 'The Kadets and the propertied classes', gen: 'The generals and the Right', bol: 'The Bolsheviks'};
  var SANCTION_AT = 40, REVOLT_AT = 70;

  function campActive(Q, k) {
    if (Q.bol_regime) { return false; }
    if (k === 'bol') { return Q.dix >= 7; }
    return true;
  }

  // What each camp objects to. Returns {camp: {score, why: [{s, t, area}]}}; a negative s is something the camp likes.
  function offence(Q) {
    // the Cabinet's standing settings only count while the party sits in the government that keeps them
    var gov = !!Q.in_coalition, atWar = !!Q.at_war, out = {};
    var finance = gov ? (Q.pol_finance || 0) : 0;
    var land = gov ? (Q.pol_land || 0) : 0, labour = gov ? (Q.pol_labour || 0) : 0, war = gov ? (Q.pol_war || 0) : 0, order = gov ? (Q.pol_order || 0) : 0;
    var food = (!gov || Q.pol_food === undefined) ? 1 : Q.pol_food, lc = Math.min(Q.land_committees || 0, 4);
    function put(k, s, t, area) { if (s > 0 && Q['soft_' + area]) { s *= 0.6; } if (s !== 0) { out[k].why.push({s: s, t: t, area: area}); } }
    CAMPS.forEach(function(k) { out[k] = {score: 0, why: []}; });
    // the Kadets and the propertied
    if (land === 2) { put('kad', 4.5, 'the socialisation of the land', 'land'); }
    else if (land === 1) { put('kad', 1.5, 'land committees redistributing the estates', 'land'); }
    if (Q.land_decree || Q.land_socialised) { put('kad', 3, 'the land decree', 'decree'); }
    if (lc > 0 && land < 2) { put('kad', Math.min(0.7 * lc, 2.5), 'the peasants\' land committees', 'committees'); }
    if (labour === 1) { put('kad', 1.5, 'the eight-hour day and the factory committees', 'labour'); }
    if (labour === 2) { put('kad', 2.5, 'state regulation of industry', 'labour'); }
    if (war === 1 && atWar) { put('kad', 2, 'the push for a peace without annexations', 'war'); }
    if (order === 2) { put('kad', 0.5, 'the amnesty', 'order'); }
    if (order === 1) { put('kad', -0.5, 'the emergency measures', 'order'); }
    if (gov && !Q.gov_kadets && Q.homogeneous_gov) { put('kad', 1.5, 'a cabinet without Kadets', 'kadets'); }
    if (gov && Q.gov_kadets) { put('kad', -1.5, 'their ministers in the cabinet', 'kadets'); }
    if (Q.rel_kad < 20) { put('kad', 1, 'a broken relationship', 'none'); }
    if (finance === 1) { put('kad', 2, 'the tax on war profits', 'finance'); }
    if (finance === 2) { put('kad', -0.5, 'the Allied credits', 'finance'); }
    // the generals and the Right
    if (land === 2) { put('gen', 2.5, 'the socialisation of the land', 'land'); }
    else if (land === 1) { put('gen', 0.8, 'land committees redistributing the estates', 'land'); }
    if (Q.land_decree || Q.land_socialised) { put('gen', 2, 'the land decree', 'decree'); }
    if (lc > 0 && land < 2) { put('gen', Math.min(0.4 * lc, 1.5), 'the peasants\' land committees', 'committees'); }
    if (order === 2) { put('gen', 1.5, 'broad liberties and the amnesty', 'order'); }
    if (order === 1) { put('gen', -1.5, 'the emergency measures', 'order'); }
    if (war === 1 && atWar) { put('gen', 2.5, 'the push for a peace without annexations', 'war'); }
    if (war === 2 && atWar) { put('gen', -1, 'the preparations for an offensive', 'war'); }
    if ((Q.stockholm || 0) >= 2 && atWar && war !== 1) { put('gen', 1.5, 'the talks at Stockholm', 'none'); }
    if (labour >= 1) { put('gen', 0.5, 'concessions to the workers', 'labour'); }
    if (gov && !Q.gov_kadets && Q.homogeneous_gov) { put('gen', 1, 'a cabinet of the Soviet parties alone', 'kadets'); }
    if (Q.army_discipline < 35) { put('gen', 1.5, 'the soldiers\' committees', 'none'); }
    // the Bolsheviks
    if (gov) { put('bol', 1.5, 'sharing power with the bourgeoisie', 'none'); }
    if (gov && Q.gov_kadets) { put('bol', 2, 'the Kadets in the cabinet', 'kadets'); }
    if (order === 1) { put('bol', 3, 'the emergency measures', 'order'); }
    if (order === 2) { put('bol', -1.5, 'the amnesty', 'order'); }
    if (war === 2 && atWar) { put('bol', 3, 'the preparations for an offensive', 'war'); }
    if (war === 1 && atWar) { put('bol', -1.5, 'the push for peace', 'war'); }
    if (war === 0 && atWar && gov) { put('bol', 1, 'the continuation of the war', 'war'); }
    if (food === 0) { put('bol', 2, 'the free grain trade', 'none'); }
    if (labour === 0 && gov) { put('bol', 1.5, 'the employers\' hold on industry', 'labour'); }
    if (labour === 2) { put('bol', -1, 'state regulation of industry', 'labour'); }
    if (land === 2) { put('bol', -1.5, 'the socialisation of the land', 'land'); }
    if (Q.july_repressed) { put('bol', 2, 'the arrests of July', 'none'); }
    if (finance === 2) { put('bol', 2, 'borrowing from the imperialists', 'finance'); }
    if (finance === 1) { put('bol', -0.5, 'the tax on war profits', 'finance'); }
    CAMPS.forEach(function(k) {
      var t = 0;
      out[k].why.forEach(function(w) { t += w.s; });
      out[k].score = Math.max(0, t);
      out[k].why.sort(function(a, b) { return b.s - a.s; });
    });
    return out;
  }

  // The main grievance of a camp, as words: used by the events.
  function mainGrievance(Q, k) {
    var w = offence(Q)[k].why;
    return (w.length && w[0].s > 0) ? w[0].t : 'the direction the government has taken';
  }

  // Give way to a camp on its main grievance, where the party has a policy to give up. Returns what was given up, or ''.
  function rollback(Q, k) {
    var w = offence(Q)[k].why, i, a;
    for (i = 0; i < w.length; i++) {
      if (w[i].s <= 0) { break; }
      a = w[i].area;
      if (a === 'land' && (Q.pol_land || 0) > 0) { Q.pol_land = Math.max(0, Q.pol_land - 1); return 'the land policy'; }
      if (a === 'committees') { Q.land_committees = Math.max(0, (Q.land_committees || 0) - 2); return 'the land committees\' powers'; }
      if (a === 'labour' && (Q.pol_labour || 0) > 0) { Q.pol_labour = 0; return 'the labour policy'; }
      if (a === 'war' && (Q.pol_war || 0) > 0) { Q.pol_war = (k === 'bol') ? 1 : 0; return 'the war policy'; }
      if (a === 'order' && (Q.pol_order || 0) > 0) { Q.pol_order = 0; return 'the policy on order'; }
      if (a === 'finance' && (Q.pol_finance || 0) > 0) { Q.pol_finance = 0; return 'the finance policy'; }
      if (a === 'kadets') {
        if (k === 'bol') { Q.gov_kadets = 0; Q.homogeneous_gov = 1; } else { Q.gov_kadets = 1; Q.homogeneous_gov = 0; }
        return 'the make-up of the cabinet';
      }
    }
    return '';
  }


  // ---- breaking the opposition ----
  // The party can try to crush a camp's opposition by force when it passes an unpopular law or is sanctioned. Its strength is
  // the militia, the army's discipline, its resources, the soldiers and workers behind it, and above all its allies;
  // the camp's is its hostility and its backing (the Right's threat, the Bolsheviks' strength).
  function allyPower(Q, k) {
    return 5 * (Q.ally_lvl || 0) + 3 * (Q.ally_lsr || 0) + (k === 'bol' ? 0 : 4 * (Q.ally_bol || 0));
  }
  function strength(Q, k) {
    return 5 * Math.min(Q.militia || 0, 4) + 0.25 * (Q.army_discipline - 40) + 0.15 * (Q.boost_soldiers || 0) + 0.1 * (Q.boost_workers || 0) +
           2 * Math.min(Q.resources || 0, 5) + allyPower(Q, k) + (Q.bol_armed && k !== 'bol' ? 5 : 0) + (Q.in_coalition ? 4 : 0) + (Q.soviet_democracy - 50) / 10;
  }
  function campStrength(Q, k) {
    var a = Q['ant_' + k] || 0;
    return 0.3 * a + (k === 'kad' ? 8 : (k === 'gen' ? 10 + 0.4 * Q.right_threat : 8 + 0.4 * Q.bolshevik));
  }
  function squashOdds(Q, k) { return clamp(0.5 + (strength(Q, k) - campStrength(Q, k)) / 40, 0.1, 0.9); }
  var SQUASH = {
    kad: {win: 'Rech was closed, two bankers and a Duma deputy were arrested, and the Kadet committee has gone quiet.',
          lose: 'The arrests were bungled, the courts released the Kadet leaders within the day, and the liberals have made a martyr of each.'},
    gen: {win: 'The Officers\' Union was dissolved and its leaders were posted to the farthest garrisons. The Stavka has understood.',
          lose: 'The officers\' orders were ignored in three garrisons, and the Officers\' Union has gone underground with a grievance.'},
    bol: {win: 'Pravda was closed, the agitators were arrested in the barracks and the factory committees reported to the Soviet.',
          lose: 'The Bolshevik agitators were warned in time. Pravda reappeared under another name, and the arrests have made them heroes.'}
  };
  // One attempt to break a camp. Applies the effects, adds a sentence to Q.sq_text and returns true if it worked.
  // A failure angers the camp and brings its reaction at once, except when the attempt is the answer to that camp's own
  // event (inEvent): then the event's cooldown stands, and the anger waits for it.
  function squash(Q, k, inEvent) {
    if (!campActive(Q, k)) { return false; }
    var win = chance(squashOdds(Q, k)), sent = SQUASH[k][win ? 'win' : 'lose'];
    if (win) {
      Q['ant_' + k] = Math.max(0, (Q['ant_' + k] || 0) - 45);
      Q['opp_' + k + '_timer'] = Math.max(Q['opp_' + k + '_timer'] || 0, 8);
      Q['opp_' + k + '_ev'] = 0;
      Q['cow_' + k + '_timer'] = 10;
      if (k === 'kad') { add(Q, {rel_kad: -6, repression: 1, right_threat: -4}); boost(Q, {middle: -3}); Q.ant_gen = Math.max(0, (Q.ant_gen || 0) - 8); }
      if (k === 'gen') { add(Q, {right_threat: -8, army_discipline: -2, soviet_democracy: -1}); }
      if (k === 'bol') { add(Q, {bolshevik: -5, rel_bol: -10, repression: 2}); boost(Q, {workers: -2}); }
      if ((Q.ally_lvl || 0) >= 2 && Q.partner_name && (Q.sq_text || '').indexOf(' stood with us.') < 0) { sent += ' ' + Q.partner_name + ' stood with us.'; }
    } else {
      Q['ant_' + k] = clamp((Q['ant_' + k] || 0) + 15, 0, 100);
      add(Q, {right_threat: (k === 'gen' ? 6 : 3), army_discipline: (k === 'gen' ? -3 : -1), soviet_democracy: -2});
      Q.resources = Math.max(0, (Q.resources || 0) - 1);
      if (!inEvent) {
        Q['opp_' + k + '_timer'] = 0;
        Q['opp_' + k + '_ev'] = Q['ant_' + k] >= REVOLT_AT ? 2 : 1;
      }
    }
    Q.sq_text = ((Q.sq_text || '') + ' ' + sent).replace(/^ /, '');
    if (!Q.break_log) { Q.break_log = []; }
    Q.break_log.push([Q.dix || 0, k, win ? 1 : 0]);
    return win;
  }
  // The law's own force option: tries each camp that the law angers, except the ones that are too strong to touch (odds under 45%).
  function squashAll(Q, camps) {
    Q.sq_text = ''; Q.sq_won = 1;
    camps.forEach(function(k) {
      if (!campActive(Q, k)) { return; }
      if (squashOdds(Q, k) < 0.45) {
        Q.sq_text += ' ' + ({kad: 'The Kadets', gen: 'The generals', bol: 'The Bolsheviks'})[k] + ' were too strong to touch, and were left alone.';
        Q.sq_won = 0;
      } else if (!squash(Q, k)) { Q.sq_won = 0; }
    });
    Q.sq_text = Q.sq_text.replace(/^ /, '');
    if (!Q.sq_text) { Q.sq_text = 'There was nobody to break.'; }
  }

  // The Break option in a camp's own sanction event: the player chose to strike, so the attempt is always made.
  function breakCamp(Q, k) {
    Q.sq_text = '';
    Q.sq_won = squash(Q, k, true) ? 1 : 0;
  }

  // ---- laws with a choice of implementation ----
  // Run a law's effects (fn) in one of three styles: 'slow' (phased in, with compensation: 60% of the effects, a
  // fifth of the anger, costs a resource), 'decree' (as written) or 'force' (as written, and the camps it angers are
  // broken by force if the party is strong enough). Q.law_text holds the result of the force.
  var LAW_KEYS = ['bread', 'ruble', 'army_discipline', 'land_pressure', 'bolshevik', 'right_threat', 'soviet_democracy', 'repression',
                  'war_weariness', 'rel_ally', 'rel_lsr', 'rel_bol', 'rel_kad'].concat(['workers', 'soldiers', 'peasants', 'middle', 'railway', 'nations'].map(function(g) { return 'boost_' + g; }));
  // How much a law's effects anger each camp, when the law does not say so itself (explicit ant_* changes).
  // tools/lawvariants.py (law_camps) applies the same rule to decide which laws get the three implementations: keep them in step.
  var LAW_HIT_MIN = 2;
  function lawHits(d) {
    return {kad: Math.max(0, -(d.rel_kad || 0)) * 1.2, gen: Math.max(0, d.right_threat || 0) * 2, bol: Math.max(0, -(d.rel_bol || 0))};
  }
  // label: what the law is called, for the ending recap.
  function law(Q, style, fn, label) {
    var before = {}, antBefore = {}, d = {}, f = (style === 'slow') ? 0.6 : 1, m = (style === 'slow') ? 0.4 : 1, explicit = false, hit = {}, camps = [];
    LAW_KEYS.forEach(function(k) { before[k] = Q[k] || 0; });
    CAMPS.forEach(function(k) { antBefore[k] = Q['ant_' + k] || 0; });
    fn();
    LAW_KEYS.forEach(function(k) { d[k] = (Q[k] || 0) - before[k]; if (f !== 1 && d[k] !== 0) { Q[k] = before[k] + d[k] * f; } });
    CAMPS.forEach(function(k) {
      var dd = (Q['ant_' + k] || 0) - antBefore[k];
      if (dd !== 0) { explicit = true; hit[k] = dd; }
      Q['ant_' + k] = antBefore[k];
    });
    if (!explicit) { hit = lawHits(d); }
    CAMPS.forEach(function(k) {
      var h = hit[k] || 0;
      if (h >= LAW_HIT_MIN && campActive(Q, k)) { camps.push(k); }
      if (campActive(Q, k)) { Q['ant_' + k] = clamp(antBefore[k] + (h > 0 ? h * m : h), 0, 100); }
    });
    if (style === 'slow') { Q.resources = Math.max(0, (Q.resources || 0) - 1); }
    Q.law_text = '';
    if (style === 'force') { squashAll(Q, camps); Q.law_text = Q.sq_text; }
    if (!Q.laws_log) { Q.laws_log = []; }
    Q.laws_log.push([Q.dix || 0, label || 'A law', style, camps.join(' ')]);
    return camps;
  }

  // Grievances fade: the longer the same complaints stand without a new one, the less they anger (to half after ten
  // months), and hostility falls more slowly than it rises. A new offence (the camp's complaints grow) starts the
  // clock again. Q.opp_<camp>_age counts the months, Q.opp_<camp>_base remembers what the complaints were.
  var FADE_PER_MONTH = 0.035, FADE_FLOOR = 0.6, RISE_RATE = 0.3, FALL_RATE = 0.1, COOL_DRAIN = 0.15;
  function campTarget(Q, k, off) {
    if (!campActive(Q, k)) { return 0; }
    off = off || offence(Q);
    var fade = Math.max(FADE_FLOOR, 1 - FADE_PER_MONTH * (Q['opp_' + k + '_age'] || 0));
    // the camps anger faster on Hard and slower on Easy
    var t = clamp(10 * off[k].score * fade * (1 + 0.12 * (Q.difficulty || 0)), 0, 100);
    if ((Q['cow_' + k + '_timer'] || 0) > 0) { t = Math.min(t, 30); }
    return t;
  }

  // How strong a camp is, 0 to 100, apart from how angry it is. A weak camp grumbles but cannot act: under 20 it does
  // nothing, it acts more readily up to 50, and it needs 40 to take up arms. The Kadets' strength is their money and the
  // officers who listen to them (the Right), the generals' is the Right itself, the Bolsheviks' is their following.
  var ACT_FROM = 20, ACT_FULL = 50, ARMS_AT = 40;
  function campPower(Q, k) {
    if (k === 'kad') { return clamp(15 + 0.6 * (Q.right_threat || 0) + (Q.gov_kadets ? 10 : 0), 0, 100); }
    if (k === 'gen') { return clamp(Q.right_threat || 0, 0, 100); }
    return clamp(Q.bolshevik || 0, 0, 100);
  }
  function campReadiness(Q, k) { return clamp((campPower(Q, k) - ACT_FROM) / (ACT_FULL - ACT_FROM), 0, 1); }

  function oppositionTurn(Q, tl) {
    var off = offence(Q);
    CAMPS.forEach(function(k) {
      var key = 'ant_' + k, cur = Q[key] || 0, score = off[k].score;
      if (score > (Q['opp_' + k + '_base'] || 0) + 0.5) { Q['opp_' + k + '_age'] = 0; }
      else { Q['opp_' + k + '_age'] = (Q['opp_' + k + '_age'] || 0) + tl; }
      Q['opp_' + k + '_base'] = score;
      var target = campTarget(Q, k, off);
      var rate = target > cur ? RISE_RATE : FALL_RATE;
      Q[key] = clamp(cur + (target - cur) * Math.min(1, rate * tl), 0, 100);
      // as the propertied camps and the generals cool down, the Right loses its money and its officers
      if ((k === 'kad' || k === 'gen') && Q[key] < cur) { Q.right_threat = Math.max(0, (Q.right_threat || 0) - COOL_DRAIN * (cur - Q[key])); }
      var a = Q[key];
      if (!campActive(Q, k)) { Q['opp_' + k + '_ev'] = 0; return; }
      if (Q.game_end || Q['opp_' + k + '_ev'] || (Q['opp_' + k + '_timer'] || 0) > 0) { return; }
      var stage = 0, thr = SANCTION_AT, ready = campReadiness(Q, k);
      if (a >= REVOLT_AT && campPower(Q, k) >= ARMS_AT && ((Q['opp_' + k + '_n'] || 0) >= 1 || a >= 85)) { stage = 2; thr = REVOLT_AT; }
      else if (a >= SANCTION_AT) { stage = 1; }
      if (stage && chance((0.2 + (a - thr) / 80) * ready * Math.min(1, tl))) { Q['opp_' + k + '_ev'] = stage; }
    });
  }

  // For the Opposition tab.
  function opposition(Q) {
    var off = offence(Q), out = [];
    CAMPS.forEach(function(k) {
      if (!campActive(Q, k)) { return; }
      out.push({id: k, name: CAMP_NAMES[k], ant: Q['ant_' + k] || 0, why: off[k].why, pending: Q['opp_' + k + '_ev'] || 0,
                cooling: (Q['opp_' + k + '_timer'] || 0) > 0, odds: squashOdds(Q, k), power: campPower(Q, k),
                canAct: campPower(Q, k) > ACT_FROM, canArm: campPower(Q, k) >= ARMS_AT});
    });
    return out;
  }


  return {exileRisk: exileRisk, allianceBlocker: allianceBlocker, campPower: campPower, campReadiness: campReadiness, ACT_FROM: ACT_FROM, ARMS_AT: ARMS_AT, campTarget: campTarget, recordTurn: recordTurn, law: law, lawHits: lawHits, breakCamp: breakCamp, squash: squash, squashAll: squashAll, squashOdds: squashOdds, strength: strength, allyPower: allyPower, recordParliament: recordParliament, projectParliament: projectParliament, PARL_SIZE: PARL_SIZE, oppositionTurn: oppositionTurn, opposition: opposition, offence: offence, rollback: rollback, mainGrievance: mainGrievance, CAMPS: CAMPS, CAMP_NAMES: CAMP_NAMES, SANCTION_AT: SANCTION_AT, REVOLT_AT: REVOLT_AT, classSupport: classSupport, popularity: popularity, BOOST_GROUPS: BOOST_GROUPS, CLASS_NAMES: CLASS_NAMES, policyDrift: policyDrift, syncAdvisors: syncAdvisors, reshuffleCouncil: reshuffleCouncil, callAdvisor: callAdvisor, swapAdvisor: swapAdvisor, replaceAdvisor: replaceAdvisor, advisorsAvailable: advisorsAvailable, allianceTarget: allianceTarget, formalize: formalize, levelName: levelName, alliancesTurn: alliancesTurn, worldTurmoil: worldTurmoil, fault: fault, allySlot: allySlot, compatible: compatible, chance: chance, PARTY: PARTY, initParty: initParty, boost: boost, fac: fac, add: add, pay: pay, display: display, GROUPS: GROUPS, PARTIES: PARTIES, PARTY_NAMES: PARTY_NAMES, FACTIONS: FACTIONS, BASE: BASE,
          ARENAS: ARENAS, ARENA_BIAS: ARENA_BIAS, clamp: clamp, dix: dix, grievance: grievance,
          setResults: setResults, bolPower: bolPower, kornilovForce: kornilovForce,
          kornilovResistance: kornilovResistance, groupSupport: groupSupport, arenaResult: arenaResult, currentArena: currentArena,
          updatePolls: updatePolls, whitePressure: whitePressure, updateFactions: updateFactions,
          clampStats: clampStats, drift: drift, updateFront: updateFront};
})();
if (typeof module !== 'undefined') { module.exports = RO; }
if (typeof window !== 'undefined') { window.RO = RO; }
