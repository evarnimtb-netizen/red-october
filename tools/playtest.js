#!/usr/bin/env node
// Headless playtester for Red October.
// usage: node tools/playtest.js [runs] [policy] [seed]
//   policy: random | first | cautious | bot:<name> (tools/bots.js)
// STRICT=1 makes it exit with status 1 on an error, a stuck game or a broken bit of text (for CI).
// NOISE=p makes a bot pick a random option with probability p. SEED=n makes the games repeatable (game i uses seed n+i).
// Loads out/game.json (run `npx dendrynexus make-html` first) and plays complete games with a simple policy.
var path = require('path');
var fs = require('fs');
global.RO = require('./model.js');
var engine = require('../node_modules/dendrynexus/lib/engine');
var toText = require('../node_modules/dendrynexus/lib/ui/content/text');
var allText = [];

var bots = require('./bots.js');
var runs = parseInt(process.argv[2] || '20', 10);
var policy = process.argv[3] || 'random';
var verbose = process.env.VERBOSE === '1';
var compiler = require('../node_modules/dendrynexus/lib/parsers/compiler');
var game = null;
compiler.convertJSONToGame(fs.readFileSync(path.join(__dirname, '..', 'out', 'game.json')), function(err, g) {
  if (err) { throw err; }
  game = g;
});

function Ui() {
  this.decks = []; this.hand = []; this.pinned = []; this.choices = null; this.text = [];
}
engine.UserInterface.makeParentOf(Ui);
// When more than one go-to condition is true, the engine picks a target at random: always a bug in this game. Catch it:
// inside a scene change, the engine only draws a random number to break such a tie.
var ambiguousGoTo = {};
var origChangeScene = engine.DendryEngine.prototype.__changeScene;
engine.DendryEngine.prototype.__changeScene = function() {
  var self = this, rnd = this.random;
  if (rnd && !rnd.__watched) {
    var orig = rnd.uint32;
    rnd.uint32 = function() {
      var sc = self.__changing && self.game.scenes[self.state.sceneId];
      if (sc && (sc.goTo || sc.goToRef)) { ambiguousGoTo[self.state.sceneId] = (ambiguousGoTo[self.state.sceneId] || 0) + 1; }
      return orig.apply(rnd, arguments);
    };
    rnd.__watched = true;
  }
  this.__changing = (this.__changing || 0) + 1;
  try { return origChangeScene.apply(this, arguments); } finally { this.__changing--; }
};
function flat(x) {
  if (x === null || x === undefined) { return ''; }
  if (typeof x === 'string' || typeof x === 'number') { return String(x); }
  if (Array.isArray(x)) { return x.map(flat).join(''); }
  if (x.type === 'paragraph') { return flat(x.content) + '\n'; }
  if (x.content !== undefined) { return flat(x.content); }
  return '';
}
Ui.prototype.displayContent = function(p) { allText.push(flat(p)); };
Ui.prototype.displayChoices = function(c) { this.choices = c; c.forEach(function(x) { allText.push('CHOICE: ' + flat(x.title) + ' | ' + flat(x.subtitle)); }); };
Ui.prototype.displayDecks = function(d) { this.decks = d; };
Ui.prototype.displayHand = function(h, max) { this.hand = h; this.maxCards = max; };
Ui.prototype.displayPinnedCards = function(c) { this.pinned = c; };
Ui.prototype.removeChoices = function() { this.choices = null; this.decks = []; this.pinned = []; };
Ui.prototype.displayGameOver = function() { this.over = true; };

function rnd(n) { return Math.floor(Math.random() * n); }
var NOISE = parseFloat(process.env.NOISE || '0');
var SEED = process.env.SEED ? parseInt(process.env.SEED, 10) : null;
// a seeded Math.random, so that a game can be played again move for move (the engine gets the same seed)
function seedRandom(seed) {
  var a = seed >>> 0;
  Math.random = function() {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playOne(idx) {
  var ui = new Ui();
  var eng = new engine.DendryEngine(ui, game);
  if (SEED !== null) { seedRandom(SEED + idx); eng.beginGame([SEED + idx]); } else { eng.beginGame(); }
  var Q = function() { return eng.state.qualities; };
  var steps = 0, log = [], scenes = [], snaps = {}, banned = {}, lastCard = null, maxwf = 0, maxPinned = 0;
  var picks = [], played = {}, lo = {}, hi = {}, zeroRes = 0, turns = 0, error = null;
  var TRACK = ['bread', 'ruble', 'members', 'resources', 'legality', 'dissent', 'player_poll', 'soviet_democracy', 'war_weariness', 'ant_kad', 'ant_gen', 'ant_bol', 'right_threat', 'bolshevik', 'repression', 'white_front'];
  try {
  // start menu -> start -> difficulty
  function pickByTitle(re) {
    if (!ui.choices) { return false; }
    for (var i = 0; i < ui.choices.length; i++) {
      if (ui.choices[i].canChoose && re.test(ui.choices[i].title)) { eng.choose(i); return true; }
    }
    return false;
  }
  while (!Q().game_over && steps < 4000 && !ui.over) {
    steps++;
    var sid = eng.state.sceneId;
    maxwf = Math.max(maxwf, eng.state.qualities.white_front || 0);
    scenes.push(sid);
    var watch = {alt_armistice: 1, alt_recovery: 1, alt_republic: 1, 'kornilov': 1, 'october': 1, 'vikzhel': 1, 'congress_of_soviets': 1, 'july_days': 1, 'expelled': 1, 'denikin': 1, 'spring_elections': 1, 'sr_programme_1919': 1, 'lsr_1921': 1, 'lsr_july': 1, 'nep': 1};
    var skey = watch[sid.split('.')[0]] ? sid.split('.')[0] : (eng.state.qualities.dix >= 96 && eng.state.qualities.dix < 100 && eng.getCurrentScene().isHand ? 'dix99' : null);
    if (skey && !snaps[skey]) {
      var qq = eng.state.qualities;
      snaps[skey] = {G: Math.round(RO.grievance(qq)), bol: Math.round(qq.bolshevik), rt: Math.round(qq.right_threat), army: Math.round(qq.army_discipline), power: Math.round(RO.bolPower(qq)), war: Math.round(qq.war_weariness), bread: Math.round(qq.bread), land: Math.round(qq.land_pressure), ruble: Math.round(qq.ruble), sd: Math.round(qq.soviet_democracy), men: Math.round(qq.player_poll), mil: qq.militia, rr: Math.round(RO.kornilovResistance(qq, 10)), kf: Math.round(RO.kornilovForce(qq)), relsr: Math.round(qq.rel_ally), relbol: Math.round(qq.rel_bol), rep: Math.round(qq.repression), wf: Math.round(qq.white_front), red: Math.round(qq.red_army), bpow: Math.round(qq.bol_power || 0), po: qq.peasant_organised || 0, homog: qq.homogeneous_gov, ca: qq.ca_elected, lc: qq.land_committees, ak: Math.round(qq.ant_kad), ag: Math.round(qq.ant_gen), ab: Math.round(qq.ant_bol), st: Math.round(RO.strength(qq)), leg: qq.legality, ingov: qq.lsr_in_gov || 0, rising: qq.lsr_rising || 0, mem: Math.round(qq.members), res: Math.round(qq.resources), od: Math.round(100 * RO.squashOdds(qq, 'kad')), odg: Math.round(100 * RO.squashOdds(qq, 'gen'))};
    }
    if (sid.indexOf('root.start_menu') === 0 && Q().started !== 1) {
      if (!pickByTitle(/Start game/)) { break; }
      continue;
    }
    if (sid === 'root.start') {
      if (!pickByTitle(new RegExp(process.env.PARTY || 'Mensheviks'))) { break; }
      continue;
    }
    if (sid === 'root.difficulty') {
      if (!pickByTitle(new RegExp(process.env.DIFF || 'Normal'))) { break; }
      continue;
    }
    if (sid === 'root.intro') {
      if (!pickByTitle(/Begin/)) { break; }
      continue;
    }
    var scene = eng.getCurrentScene();
    if (scene.isHand) {
      turns++;
      TRACK.forEach(function(k) {
        var v = Q()[k];
        if (typeof v === 'number' && isFinite(v)) { lo[k] = Math.min(lo[k] === undefined ? v : lo[k], v); hi[k] = Math.max(hi[k] === undefined ? v : hi[k], v); }
      });
      if (Q().resources <= 0.5) { zeroRes++; }
      // fill the hand, then play something
      var canDraw = ui.decks.filter(function(d) { return d.canChoose; });
      maxPinned = Math.max(maxPinned, ui.pinned.length);
      var hand = eng.state.currentHands[sid] || [];
      var tries = 0;
      while (hand.length < (scene.maxCards || 3) && canDraw.length && tries < 10) {
        var d = canDraw[rnd(canDraw.length)];
        var card = eng.drawCard(d.id);
        if (!card.id) { canDraw = canDraw.filter(function(x) { return x.id !== d.id; }); }
        tries++;
        hand = eng.state.currentHands[sid];
      }
      hand = eng.state.currentHands[sid] || [];
      var options = [];
      hand.forEach(function(c) { options.push({kind: 'card', id: c.id}); });
      ui.pinned.forEach(function(c) { if (c.canChoose !== false && Q().advisor_action_timer <= 0) { options.push({kind: 'pinned', id: c.id}); } });
      options = options.filter(function(op) { return banned[op.id] !== Q().turn; });
      if (!options.length) {
        // nothing playable this turn: play any card from hand, ignoring bans
        options = hand.map(function(c) { return {kind: 'card', id: c.id}; });
        // an empty hand and no advisor action: Wait and See is always there, as in the game
        if (!options.length) { ui.pinned.forEach(function(c) { if (c.id === 'wait' && c.canChoose !== false) { options.push({kind: 'pinned', id: c.id}); } }); }
        if (!options.length) { log.push('NO OPTIONS in hand at ' + Q().year + '/' + Q().month); break; }
      }
      var o = options[rnd(options.length)];
      if (policy.indexOf('bot:') === 0) {
        var bot = bots[policy.slice(4)];
        var best = null, bestRank = 1e9;
        options.forEach(function(op) { var r = bot.cards.indexOf(op.id); if (r < 0) { r = 500; } if (r < bestRank) { bestRank = r; best = op; } });
        if (!(NOISE && Math.random() < NOISE)) { o = best || o; }
      }
      played[o.id] = (played[o.id] || 0) + 1;
      if (verbose) { log.push('play ' + o.id); }
      lastCard = o.id;
      if (o.kind === 'card') { eng.playCard(o.id); } else { eng.playPinnedCard(o.id); }
      continue;
    }
    // plain choice scene
    var cs = ui.choices || [];
    var avail = [];
    cs.forEach(function(c, i) { if (c.canChoose) { avail.push(i); } });
    if (!avail.length) { log.push('NO CHOICES at ' + sid); break; }
    var pick;
    var onlyReturn = avail.every(function(i) { return /Return card|Cancel action|Return to main|Never mind|Think again/.test(cs[i].title); });
    if (onlyReturn && lastCard && sid.split('.')[0] === lastCard) { banned[lastCard] = Q().turn; }
    if (policy.indexOf('bot:') === 0 && NOISE && Math.random() < NOISE) {
      var nonret3 = avail.filter(function(i) { return !/Return card|Cancel action|Return to main|Never mind|Think again/.test(cs[i].title); });
      pick = (nonret3.length ? nonret3 : avail)[rnd((nonret3.length ? nonret3 : avail).length)];
    } else if (policy.indexOf('bot:') === 0) {
      var bot2 = bots[policy.slice(4)];
      var top = sid.split('.')[0];
      var prefs = bot2.choices[sid] || bot2.choices[top] || [];
      if (sid.indexOf('.') >= 0 && top === 'inter_party_relationships' && sid.split('.')[1] === 'formalize') { prefs = bot2.choices.inter_party_relationships_formalize; }
      pick = undefined;
      // a preference is a RegExp on the choice's title, or a function(title, subtitle, Q) for choices that depend on the state
      var prefers = function(pref, c) { return typeof pref === 'function' ? pref(c.title, flat(c.subtitle), Q()) : pref.test(c.title); };
      for (var pi = 0; pi < prefs.length && pick === undefined; pi++) {
        for (var ci = 0; ci < avail.length; ci++) {
          if (prefers(prefs[pi], cs[avail[ci]])) { pick = avail[ci]; break; }
        }
      }
      if (pick === undefined) {
        // laws with a choice of implementation: the bot's preferred style, by default the law as written
        var lawRe = bot2.law || /as written/;
        for (var li = 0; li < avail.length && pick === undefined; li++) { if (prefers(lawRe, cs[avail[li]])) { pick = avail[li]; } }
        if (pick === undefined) { for (var lj = 0; lj < avail.length && pick === undefined; lj++) { if (/as written/.test(cs[avail[lj]].title)) { pick = avail[lj]; } } }
      }
      if (pick === undefined) {
        var nonret2 = avail.filter(function(i) { return !/Return card|Cancel action|Return to main|Never mind|Think again/.test(cs[i].title); });
        pick = (nonret2.length ? nonret2 : avail)[0];
      }
    } else if (policy === 'first') { pick = avail[0]; }
    else if (policy === 'cautious') {
      // avoid "return to main"/"cancel" loops: prefer non-return options
      var nonret = avail.filter(function(i) { return !/Return card|Cancel action|Return to main|Never mind|Think again/.test(cs[i].title); });
      var pool = nonret.length ? nonret : avail;
      pick = pool[rnd(pool.length)];
    } else { pick = avail[rnd(avail.length)]; }
    if (verbose) { log.push(sid + ' -> ' + cs[pick].title); }
    picks.push(sid + ' | ' + flat(cs[pick].title));
    // avoid looping in the achievements/eg menus
    eng.choose(pick);
  }
  } catch (e) {
    error = {message: String(e && e.message || e), stack: String(e && e.stack || '').split('\n').slice(0, 4).join(' | '), scene: eng.state && eng.state.sceneId};
  }
  var q = Q();
  var seen = {};
  scenes.forEach(function(x) { seen[x.split('.')[0]] = 1; });
  return {idx: idx, maxPinned: maxPinned, steps: steps, ending: q.ending, year: q.year, month: q.month, dix: q.dix, game_over: q.game_over,
          bol_regime: q.bol_regime, vikzhel: q.vikzhel_deal, assembly: q.assembly_survives,
          legality: q.legality, sd: Math.round(q.soviet_democracy), members: Math.round(q.members),
          wf: Math.round(maxwf), rt: Math.round(q.right_threat), bol: Math.round(q.bolshevik),
          dissent: Math.round(q.dissent * 100), bpow_final: Math.round(q.bol_power || 0), homog: q.homogeneous_gov, lc: q.land_committees, ca: q.ca_elected, stock: q.stockholm, bread: Math.round(q.bread), dbg: {al: [q.ally_lvl, q.ally_lsr, q.ally_bol], blocs: q.blocs, kav: q.komuch_averted, nep: q.nep_early, free: q.free_soviets, leg: q.legality, sd: Math.round(q.soviet_democracy), rep: Math.round(q.repression), po: q.peasant_organised, rb: Math.round(q.rel_bol), prog: q.program_adopted, wa: q.white_aid, prb: Math.round(q.prog_rb || 0), brb: Math.round(q.brest_rb || 0), bsd: Math.round(q.brest_sd || 0), sqrb: Math.round(q.sq_rb || 0), ppo: q.prog_po || 0}, takeover: q.takeover, vs: Math.round(q.vik_score || 0),
          opp: [q.opp_kad_n || 0, q.opp_gen_n || 0, q.opp_bol_n || 0], laws: (q.laws_log || []).length,
          breaks: (q.break_log || []).length, broke: (q.break_log || []).filter(function(b) { return b[2]; }).length,
          peak: (q.hist || []).reduce(function(m, r) { return Math.max(m, r[1]); }, 0), final_poll: Math.round(q.player_poll || 0),
          snaps: snaps, log: log, lastScenes: scenes.slice(-6),
          error: error, picks: picks, seed: SEED === null ? null : SEED + idx, played: played, seen: Object.keys(seen), lo: lo, hi: hi, zeroRes: zeroRes, turns: turns, party: q.player_party, difficulty: q.difficulty,
          fin: TRACK.reduce(function(o, k) { if (typeof q[k] === 'number') { o[k] = Math.round(q[k] * 100) / 100; } return o; }, {mem_cap: q.mem_cap})};
}

var results = [];
var errors = 0;
for (var i = 0; i < runs; i++) {
  var r = playOne(i);
  if (r.error) {
    errors++;
    console.log('ERROR in run ' + i + (r.seed !== null ? ' (seed ' + r.seed + ')' : '') + ' at ' + r.error.scene + ': ' + r.error.stack);
  } else {
    results.push(r);
  }
  if (verbose) { console.log(r.log.join('\n')); }
}
var counts = {};
if (process.env.WF) { console.log('max wf per run: ' + results.map(function(r) { return r.wf; }).join(',')); }
var agg = {};
results.forEach(function(r) { for (var k in r.snaps) { agg[k] = agg[k] || []; agg[k].push(r.snaps[k]); } });
Object.keys(agg).forEach(function(k) {
  var keys = Object.keys(agg[k][0]), out = {};
  keys.forEach(function(f) { out[f] = Math.round(agg[k].reduce(function(a, b) { return a + (b[f] || 0); }, 0) / agg[k].length); });
  console.log('MEAN at ' + k + ' (n=' + agg[k].length + '): ' + JSON.stringify(out));
});
results.forEach(function(r) { var k = r.game_over ? r.ending : 'STUCK'; counts[k] = (counts[k] || 0) + 1; });
if (process.env.DBG) { results.forEach(function(r) { console.log(r.ending + ' ' + JSON.stringify(r.dbg)); }); }
if (process.env.POW) { results.forEach(function(r) { console.log(JSON.stringify({e: r.ending, p: r.bpow_final, h: r.homog, lc: r.lc, ca: r.ca, st: r.stock, tk: r.takeover, vs: r.vs})); }); }
if (process.env.TEXT) { fs.writeFileSync(process.env.TEXT, allText.join('\n')); }
// JSON=file writes one summary per game, for tools/balance_report.js
if (process.env.JSON) {
  fs.writeFileSync(process.env.JSON, JSON.stringify(results.map(function(r) {
    return {ending: r.game_over ? r.ending : 'STUCK', year: r.year, month: r.month, legality: r.legality, sd: r.sd, opp: r.opp, laws: r.laws, breaks: r.breaks, broke: r.broke, peak: r.peak, final_poll: r.final_poll,
            bol_regime: r.bol_regime, members: r.members,
            steps: r.steps, seed: r.seed, played: r.played, seen: r.seen, lo: r.lo, hi: r.hi, fin: r.fin, zeroRes: r.zeroRes, turns: r.turns, picks: process.env.PICKS ? r.picks : undefined, snaps: process.env.PICKS ? r.snaps : undefined, last: r.game_over ? undefined : r.lastScenes};
  })));
}
if (results.length) { console.log('max pinned cards shown: ' + Math.max.apply(null, results.map(function(r) { return r.maxPinned; }))); }
console.log('policy=' + policy + ' runs=' + runs + ' errors=' + errors);
console.log(JSON.stringify(counts));
results.filter(function(r) { return !r.game_over; }).slice(0, 5).forEach(function(r) {
  console.log('STUCK', JSON.stringify({steps: r.steps, y: r.year, m: r.month, last: r.lastScenes, log: r.log.slice(-3)}));
});
// text that should never reach the player: unset values and unparsed markup
var LEAK = /undefined|NaN|\[\+|\+\]|\[\?|\?\]|\{!|!\}/;
var leaks = allText.filter(function(t) { return LEAK.test(t); });
if (leaks.length) {
  console.log('TEXT LEAKS: ' + leaks.length);
  leaks.slice(0, 5).forEach(function(t) { console.log('  ' + t.slice(0, 200)); });
}
var ambiguous = Object.keys(ambiguousGoTo);
if (ambiguous.length) { console.log('AMBIGUOUS GO-TO (more than one condition true): ' + ambiguous.map(function(k) { return k + ' x' + ambiguousGoTo[k]; }).join(', ')); }
if (process.env.STRICT) {
  var stuck = results.filter(function(r) { return !r.game_over; }).length;
  if (errors || stuck || leaks.length || ambiguous.length || !results.length) {
    console.log('FAIL: errors=' + errors + ' stuck=' + stuck + ' leaks=' + leaks.length + ' ambiguous go-to=' + ambiguous.length);
    process.exit(1);
  }
  console.log('OK');
}
