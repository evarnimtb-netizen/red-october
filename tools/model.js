// Red October model: stats drift, factions, support and the Civil War front.
// Pure functions of the quality object Q, so they can be tested in node.
// A copy is served as out/html/model.js (see tools/sync_model.sh) and loaded by index.html.
var RO = (function() {
  var GROUPS = ['workers', 'soldiers', 'peasants', 'middle', 'railway', 'nations'];
  var PARTIES = ['bol', 'lsr', 'sr', 'men', 'kad', 'pop', 'nat', 'oth'];
  var PARTY_NAMES = {bol: 'Bolsheviks', lsr: 'Left SRs', sr: 'SRs', men: 'Mensheviks', kad: 'Kadets',
                     pop: 'Popular Socialists and Trudoviks', nat: 'National parties', oth: 'Anarchists and others'};
  var FACTIONS = ['defencist', 'intl', 'rightdef', 'unions', 'bund'];

  // Base appeal in March 1917, before any pressure. Columns follow PARTIES.
  var BASE = {
    workers:  {bol: 12, lsr: 1, sr: 22, men: 40, kad: 6,  pop: 3,  nat: 2,  oth: 14},
    soldiers: {bol: 8,  lsr: 2, sr: 45, men: 22, kad: 5,  pop: 2,  nat: 5,  oth: 11},
    peasants: {bol: 2,  lsr: 3, sr: 70, men: 3,  kad: 4,  pop: 6,  nat: 8,  oth: 4},
    middle:   {bol: 2,  lsr: 0, sr: 17, men: 15, kad: 38, pop: 14, nat: 7,  oth: 7},
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
  // Arena-specific biases: soviet delegates over-represent town parties, the capitals went Bolshevik, etc.
  var ARENA_BIAS = {
    soviets:    {men: 2.0, bol: 1.3},
    dumas:      {bol: 2.2, men: 0.6, kad: 1.1},
    assembly:   {bol: 1.25, men: 0.5, nat: 1.2, sr: 0.97},
    provincial: {}
  };
  // Historical pressure of the Whites (0-100) by half-month index, used from mid-1918.
  var WHITE_PRESSURE = [[30, 5], [34, 25], [44, 45], [48, 45], [56, 60], [66, 85], [70, 60], [76, 35],
                        [84, 45], [92, 20], [96, 8], [200, 5]];

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

  // support[group][party]: fractions that sum to 1 within each group.
  function groupSupport(Q) {
    var m = multipliers(Q), out = {}, gi, pi;
    for (gi = 0; gi < GROUPS.length; gi++) {
      var g = GROUPS[gi], tot = 0, row = {};
      for (pi = 0; pi < PARTIES.length; pi++) {
        var p = PARTIES[pi];
        var a = BASE[g][p] * m[p];
        if (p === Q.player_slot) { a += (Q['boost_' + g] || 0); }
        if (p === 'lsr' && !Q.lsr_split) { a = 0; }
        if (p === 'sr' && !Q.lsr_split) { a += BASE[g].lsr * m.lsr; }
        // a socialist ally on a joint list pools its support
        if (a < 0.05) { a = 0.05; }
        row[p] = a; tot += a;
      }
      for (pi = 0; pi < PARTIES.length; pi++) { row[PARTIES[pi]] /= tot; }
      out[g] = row;
    }
    return out;
  }

  // vote share (percent) of each party in an arena. extra: optional per-party multipliers.
  function arenaResult(Q, arena, extra) {
    var gs = groupSupport(Q), w = ARENAS[arena], bias = ARENA_BIAS[arena] || {}, res = {}, tot = 0, gi, pi;
    for (pi = 0; pi < PARTIES.length; pi++) { res[PARTIES[pi]] = 0; }
    for (gi = 0; gi < GROUPS.length; gi++) {
      var g = GROUPS[gi];
      for (pi = 0; pi < PARTIES.length; pi++) {
        var p = PARTIES[pi], v = gs[g][p] * w[g] * (bias[p] || 1);
        if (extra && extra[p]) { v *= extra[p]; }
        res[p] += v; tot += v;
      }
    }
    for (pi = 0; pi < PARTIES.length; pi++) { res[PARTIES[pi]] = 100 * res[PARTIES[pi]] / tot; }
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
    // the player's own party, as a plain number for event conditions
    Q.player_poll = r[Q.player_slot];
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
  function updateFactions(Q) {
    var total = 0, i, f;
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
    Q.dissent = clamp(d / 10000, 0, 0.95);
    Q.dissent_percent = Q.dissent * 100;
  }

  var STATS = ['bread', 'ruble', 'war_weariness', 'army_discipline', 'land_pressure', 'bolshevik',
               'right_threat', 'soviet_democracy', 'repression', 'red_army', 'white_front', 'members',
               'rel_sr', 'rel_lsr', 'rel_bol', 'rel_kad'];
  function clampStats(Q) {
    for (var i = 0; i < STATS.length; i++) {
      var s = STATS[i];
      if (Q[s] === undefined) { continue; }
      Q[s] = clamp(Q[s], 0, STATS[i] === 'members' ? 400 : 100);
    }
    Q.legality = clamp(Math.round(Q.legality), 0, 3);
    if (Q.resources < 0) { Q.resources = 0; }
    for (var g = 0; g < GROUPS.length; g++) {
      var k = 'boost_' + GROUPS[g];
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
      Q.war_weariness += (Q.bol_regime ? 0.5 : 0.2) * tl;
      Q.bread -= (Q.bol_regime ? 0.4 : 0.2) * tl;
      Q.ruble -= (Q.bol_regime ? 1.5 : 0.8) * tl;
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
    } else {
      Q.soviet_democracy -= (0.5 + Q.repression / 60) * tl;
      Q.repression += (Q.legality <= 1 ? 0.6 : 0.3) * tl;
      Q.red_army += 1.2 * tl * (Q.red_army < 70 ? 1 : 0);
    }
    // relations with other parties drift back toward where they started unless tended
    var relBase = {rel_sr: 55, rel_lsr: 30, rel_bol: 25, rel_kad: 30};
    for (var rk in relBase) {
      Q[rk] += (relBase[rk] - Q[rk]) * 0.08 * tl;
    }
    // the player's campaign boosts fade slowly
    for (var g = 0; g < GROUPS.length; g++) {
      var k = 'boost_' + GROUPS[g];
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
    for (i = 0; i < FACTIONS.length; i++) {
      Q['d_' + FACTIONS[i] + '_strength'] = Math.round(Q[FACTIONS[i] + '_strength']);
      Q['d_' + FACTIONS[i] + '_dissent'] = Math.round(Q[FACTIONS[i] + '_dissent']);
    }
    Q.d_dissent = Math.round(Q.dissent * 100);
    Q.d_grievance = Math.round(grievance(Q));
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
      - (Q.land_decree ? 5 : 0);
  }

  // Kornilov's march: force of the Right against the resistance of the democracy.
  function kornilovForce(Q) {
    return Q.right_threat + 0.25 * (100 - Q.army_discipline) - 10;
  }
  function kornilovResistance(Q, bonus) {
    return 40 + (bonus || 0) + 5 * Math.min(Q.militia || 0, 4) + 0.2 * (Q.boost_railway || 0) +
           (Q.homogeneous_gov ? 5 : 0) + (Q.soviet_democracy - 60) / 8;
  }

  return {boost: boost, fac: fac, add: add, pay: pay, display: display, GROUPS: GROUPS, PARTIES: PARTIES, PARTY_NAMES: PARTY_NAMES, FACTIONS: FACTIONS, BASE: BASE,
          ARENAS: ARENAS, ARENA_BIAS: ARENA_BIAS, clamp: clamp, dix: dix, grievance: grievance,
          setResults: setResults, bolPower: bolPower, kornilovForce: kornilovForce,
          kornilovResistance: kornilovResistance, groupSupport: groupSupport, arenaResult: arenaResult, currentArena: currentArena,
          updatePolls: updatePolls, whitePressure: whitePressure, updateFactions: updateFactions,
          clampStats: clampStats, drift: drift, updateFront: updateFront};
})();
if (typeof module !== 'undefined') { module.exports = RO; }
if (typeof window !== 'undefined') { window.RO = RO; }
