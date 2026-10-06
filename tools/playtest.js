#!/usr/bin/env node
// Headless playtester for Red October.
// usage: node tools/playtest.js [runs] [policy] [seed]
//   policy: random | first | cautious
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

function playOne(idx) {
  var ui = new Ui();
  var eng = new engine.DendryEngine(ui, game);
  eng.beginGame();
  var Q = function() { return eng.state.qualities; };
  var steps = 0, log = [], scenes = [], snaps = {}, banned = {}, lastCard = null, maxwf = 0;
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
    var watch = {'kornilov': 1, 'october': 1, 'vikzhel': 1, 'congress_of_soviets': 1, 'july_days': 1, 'expelled': 1, 'denikin': 1, 'spring_elections': 1, 'sr_programme_1919': 1};
    if (watch[sid] && !snaps[sid]) {
      var qq = eng.state.qualities;
      snaps[sid] = {G: Math.round(RO.grievance(qq)), bol: Math.round(qq.bolshevik), rt: Math.round(qq.right_threat), army: Math.round(qq.army_discipline), power: Math.round(RO.bolPower(qq)), war: Math.round(qq.war_weariness), bread: Math.round(qq.bread), land: Math.round(qq.land_pressure), ruble: Math.round(qq.ruble), sd: Math.round(qq.soviet_democracy), men: Math.round(qq.player_poll), mil: qq.militia, rr: Math.round(RO.kornilovResistance(qq, 10)), kf: Math.round(RO.kornilovForce(qq)), relsr: Math.round(qq.rel_ally), relbol: Math.round(qq.rel_bol), rep: Math.round(qq.repression), wf: Math.round(qq.white_front), red: Math.round(qq.red_army), bpow: Math.round(qq.bol_power || 0), po: qq.peasant_organised || 0, homog: qq.homogeneous_gov, ca: qq.ca_elected, lc: qq.land_committees};
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
      // fill the hand, then play something
      var canDraw = ui.decks.filter(function(d) { return d.canChoose; });
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
        if (!options.length) { log.push('NO OPTIONS in hand at ' + Q().year + '/' + Q().month); break; }
      }
      var o = options[rnd(options.length)];
      if (policy.indexOf('bot:') === 0) {
        var bot = bots[policy.slice(4)];
        var best = null, bestRank = 1e9;
        options.forEach(function(op) { var r = bot.cards.indexOf(op.id); if (r < 0) { r = 500; } if (r < bestRank) { bestRank = r; best = op; } });
        o = best || o;
      }
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
    var onlyReturn = avail.every(function(i) { return /Return card|Cancel action|Return to main/.test(cs[i].title); });
    if (onlyReturn && lastCard && sid.split('.')[0] === lastCard) { banned[lastCard] = Q().turn; }
    if (policy.indexOf('bot:') === 0) {
      var bot2 = bots[policy.slice(4)];
      var top = sid.split('.')[0];
      var prefs = bot2.choices[sid] || bot2.choices[top] || [];
      if (sid.indexOf('.') >= 0 && top === 'inter_party_relationships' && sid.split('.')[1] === 'formalize') { prefs = bot2.choices.inter_party_relationships_formalize; }
      pick = undefined;
      for (var pi = 0; pi < prefs.length && pick === undefined; pi++) {
        for (var ci = 0; ci < avail.length; ci++) {
          if (prefs[pi].test(cs[avail[ci]].title)) { pick = avail[ci]; break; }
        }
      }
      if (pick === undefined) {
        var nonret2 = avail.filter(function(i) { return !/Return card|Cancel action|Return to main/.test(cs[i].title); });
        pick = (nonret2.length ? nonret2 : avail)[0];
      }
    } else if (policy === 'first') { pick = avail[0]; }
    else if (policy === 'cautious') {
      // avoid "return to main"/"cancel" loops: prefer non-return options
      var nonret = avail.filter(function(i) { return !/Return card|Cancel action|Return to main/.test(cs[i].title); });
      var pool = nonret.length ? nonret : avail;
      pick = pool[rnd(pool.length)];
    } else { pick = avail[rnd(avail.length)]; }
    if (verbose) { log.push(sid + ' -> ' + cs[pick].title); }
    // avoid looping in the achievements/eg menus
    eng.choose(pick);
  }
  var q = Q();
  return {idx: idx, steps: steps, ending: q.ending, year: q.year, month: q.month, dix: q.dix, game_over: q.game_over,
          bol_regime: q.bol_regime, vikzhel: q.vikzhel_deal, assembly: q.assembly_survives,
          legality: q.legality, sd: Math.round(q.soviet_democracy), members: Math.round(q.members),
          wf: Math.round(maxwf), rt: Math.round(q.right_threat), bol: Math.round(q.bolshevik),
          dissent: Math.round(q.dissent * 100), bpow_final: Math.round(q.bol_power || 0), homog: q.homogeneous_gov, lc: q.land_committees, ca: q.ca_elected, stock: q.stockholm, bread: Math.round(q.bread), dbg: {al: [q.ally_lvl, q.ally_lsr, q.ally_bol], blocs: q.blocs, kav: q.komuch_averted, nep: q.nep_early, free: q.free_soviets, leg: q.legality, sd: Math.round(q.soviet_democracy), rep: Math.round(q.repression), po: q.peasant_organised, rb: Math.round(q.rel_bol), prog: q.program_adopted, wa: q.white_aid, prb: Math.round(q.prog_rb || 0), brb: Math.round(q.brest_rb || 0), bsd: Math.round(q.brest_sd || 0), sqrb: Math.round(q.sq_rb || 0), ppo: q.prog_po || 0}, takeover: q.takeover, vs: Math.round(q.vik_score || 0), snaps: snaps, log: log, lastScenes: scenes.slice(-6)};
}

var results = [];
var errors = 0;
for (var i = 0; i < runs; i++) {
  try {
    var r = playOne(i);
    results.push(r);
    if (verbose) { console.log(r.log.join('\n')); }
  } catch (e) {
    errors++;
    console.log('ERROR in run ' + i + ': ' + (e && e.stack || e));
  }
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
console.log('policy=' + policy + ' runs=' + runs + ' errors=' + errors);
console.log(JSON.stringify(counts));
results.filter(function(r) { return !r.game_over; }).slice(0, 5).forEach(function(r) {
  console.log('STUCK', JSON.stringify({steps: r.steps, y: r.year, m: r.month, last: r.lastScenes, log: r.log.slice(-3)}));
});
