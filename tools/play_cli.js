#!/usr/bin/env node
// Play Red October from the command line, one move at a time, for testers (people or agents).
// The game is saved to a file after every move (default /tmp/red_october_cli.json; set SAVE=path for another).
//
//   node tools/play_cli.js new <men|sr|lsr> [easy|normal|hard]   start a game
//   node tools/play_cli.js show                                  the current page, the numbers, and what you can do
//   node tools/play_cli.js choose <n>                            pick option n on the page
//   node tools/play_cli.js draw <n>                              draw a card from deck n (on the main page)
//   node tools/play_cli.js play <n>                              play card n from your hand
//   node tools/play_cli.js advisor <n>                           use pinned card n (advisors, the Cabinet, the Council, Wait and See)
//   node tools/play_cli.js stats                                 every number the game keeps (for spotting oddities)
//
// Run `npx dendrynexus make-html` first. Each move prints the new page.
var path = require('path');
var fs = require('fs');
global.RO = require('./model.js');
var engine = require('../node_modules/dendrynexus/lib/engine');
var compiler = require('../node_modules/dendrynexus/lib/parsers/compiler');

var SAVE = process.env.SAVE || '/tmp/red_october_cli.json';
var game = null;
compiler.convertJSONToGame(fs.readFileSync(path.join(__dirname, '..', 'out', 'game.json')), function(err, g) {
  if (err) { throw err; }
  game = g;
});

function flat(x) {
  if (x === null || x === undefined) { return ''; }
  if (typeof x === 'string' || typeof x === 'number') {
    // the web page draws charts in these placeholders; here they are only named
    return String(x).replace(/<div class="parliament"[^>]*><\/div>/g, '[a parliament chart is drawn here in the browser]')
                    .replace(/<div class="recap"><\/div>/g, '[the run in review is drawn here in the browser]').replace(/<[^>]+>/g, '');
  }
  if (Array.isArray(x)) { return x.map(flat).join(''); }
  if (x.type === 'paragraph') { return flat(x.content) + '\n\n'; }
  if (x.type === 'heading') { return '== ' + flat(x.content) + ' ==\n\n'; }
  if (x.type === 'emphasis-1' || x.type === 'emphasis-2') { return flat(x.content); }
  if (x.content !== undefined) { return flat(x.content); }
  return '';
}

function Ui() { this.text = []; this.choices = null; this.decks = []; this.hand = []; this.pinned = []; this.over = false; }
engine.UserInterface.makeParentOf(Ui);
Ui.prototype.newPage = function() { this.text = []; };
Ui.prototype.displayContent = function(p) { this.text.push(flat(p)); };
Ui.prototype.displayChoices = function(c) { this.choices = c; };
Ui.prototype.displayDecks = function(d) { this.decks = d; };
Ui.prototype.displayHand = function(h) { this.hand = h; };
Ui.prototype.displayPinnedCards = function(c) { this.pinned = c; };
Ui.prototype.removeChoices = function() { this.choices = null; this.decks = []; this.pinned = []; };
Ui.prototype.displayGameOver = function() { this.over = true; };

var ui = new Ui();
var eng = new engine.DendryEngine(ui, game);

function save() { fs.writeFileSync(SAVE, JSON.stringify(eng.getExportableState())); }
function load() {
  if (!fs.existsSync(SAVE)) { console.log('No game in progress. Start one with: node tools/play_cli.js new sr normal'); process.exit(1); }
  eng.setState(JSON.parse(fs.readFileSync(SAVE, 'utf8')));
}
function Q() { return eng.state.qualities; }
function pick(re) {
  var c = eng.getCurrentChoices() || [];
  for (var i = 0; i < c.length; i++) { if (c[i].canChoose !== false && re.test(flat(c[i].title))) { eng.choose(i); return true; } }
  return false;
}

var MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function numbers() {
  var q = Q(), r = Math.round;
  if (!q.started) { return ''; }
  var date = (q.turn_length < 1 ? (q.half_month ? 'Late ' : 'Early ') : '') + MONTHS[q.month] + ' ' + q.year;
  var lines = ['--- ' + date + ' · ' + (q.pname || q.player_party) + ' ---',
    'Resources ' + r(q.resources) + ' · Members ' + (r(q.members) * 1000).toLocaleString('en-GB') + (q.members >= (q.mem_cap || 400) - 0.5 ? ' (the most the party can hold)' : '') + ' · Legal status ' + ['banned', 'persecuted', 'harassed', 'legal'][Math.max(0, Math.min(3, r(q.legality)))] +
      ' · Dissent ' + r(q.dissent * 100) + '% · Your support ' + r(q.player_poll) + '% (' + ({soviets: 'in the Congress of Soviets', assembly: 'in the Constituent Assembly', provincial: 'in the city soviets'})[RO.currentArena(q)] + ')',
    'Bread ' + r(q.bread) + ' · Ruble ' + r(q.ruble) + ' · War weariness ' + r(q.war_weariness) + ' · Army discipline ' + r(q.army_discipline) +
      ' · Land pressure ' + r(q.land_pressure) + (q.bol_regime ? '' : ' · Bolsheviks ' + r(q.bolshevik) + ' · Right ' + r(q.right_threat)) + ' · Soviet democracy ' + r(q.soviet_democracy) +
      (q.bol_regime ? ' · Repression ' + r(q.repression) + ' · White front ' + r(q.white_front) : ''),
    'In government: ' + (q.in_coalition && !q.bol_regime ? 'yes' : (q.lsr_in_gov ? 'a few commissariats' : 'no')) + ' · Bolshevik regime: ' + (q.bol_regime ? 'yes' : 'no') +
      ' · Relations: ally ' + r(q.rel_ally) + ', Bolsheviks ' + r(q.rel_bol) + ', Kadets ' + r(q.rel_kad)];
  var risk = RO.exileRisk(q);
  if (risk) { lines.push('WARNING: ' + (risk.level === 2 ? 'if the war ended now, the party would be driven abroad: ' : 'the party is close to exile: ') + risk.reasons.join('; ') + '.'); }
  try {
    var opp = RO.opposition(q);
    if (opp.length) {
      lines.push('Opposition hostility: ' + opp.map(function(c) { return c.id + ' ' + r(c.ant) + ' (strength ' + r(c.power) + ')'; }).join(', ') + ' · your strength ' + r(RO.strength(q)));
    }
  } catch (e) { /* not started */ }
  return lines.join('\n') + '\n';
}

function show() {
  var out = [];
  out.push(ui.text.join('').replace(/\n{3,}/g, '\n\n').trim());
  out.push('');
  if (ui.over || Q().game_over) {
    out.push(numbers());
    out.push('*** THE GAME IS OVER. Ending: ' + Q().ending + ' ***');
  }
  var scene = eng.getCurrentScene();
  if (scene && scene.isHand) {
    out.push(numbers());
    out.push('DECKS (draw <n>): ' + (ui.decks.length ? ui.decks.map(function(d, i) { return i + ') ' + flat(d.title) + (d.canChoose === false ? ' [empty]' : ''); }).join('   ') : 'none'));
    var hand = eng.state.currentHands[eng.state.sceneId] || [];
    out.push('HAND (play <n>): ' + (hand.length ? '' : 'empty - draw a card first'));
    hand.forEach(function(c, i) { out.push('  ' + i + ') ' + flat(c.title) + ' - ' + flat(c.subtitle)); });
    out.push('PINNED (advisor <n>):');
    ui.pinned.forEach(function(c, i) { out.push('  ' + i + ') ' + flat(c.title) + ' - ' + flat(c.subtitle) + (c.canChoose === false ? ' [unavailable]' : '')); });
    out.push('Playing a card or an advisor action usually ends the turn.');
  } else if (ui.choices && ui.choices.length) {
    out.push('CHOICES (choose <n>):');
    ui.choices.forEach(function(c, i) {
      out.push('  ' + i + ') ' + flat(c.title) + (flat(c.subtitle) ? '  -- ' + flat(c.subtitle) : '') + (c.canChoose === false ? '  [unavailable]' : ''));
    });
  }
  console.log(out.join('\n'));
}

var cmd = process.argv[2], arg = process.argv[3];
if (cmd === 'new') {
  var party = {men: /Mensheviks/, sr: /Socialist Revolutionaries/, lsr: /Left SRs/}[arg || 'sr'];
  var diff = new RegExp('^' + ((process.argv[4] || 'normal').replace(/^./, function(c) { return c.toUpperCase(); })));
  eng.beginGame();
  pick(/Start game/); pick(party); pick(diff);
  // the party's introduction: keep its text, then begin
  var guard = 0;
  while (!pick(/^Begin/) && guard++ < 5) { if (!pick(/./)) { break; } }
  save(); show();
} else if (cmd === 'show') {
  load(); show();
} else if (cmd === 'stats') {
  load();
  var q = Q(), keys = Object.keys(q).filter(function(k) { return typeof q[k] === 'number'; }).sort();
  console.log(keys.map(function(k) { return k + '=' + Math.round(q[k] * 100) / 100; }).join('  '));
} else if (cmd === 'choose' || cmd === 'draw' || cmd === 'play' || cmd === 'advisor') {
  load();
  var n = parseInt(arg, 10);
  try {
    if (cmd === 'choose') {
      if (eng.getCurrentScene().isHand) { console.log('This is the main page: use draw, play or advisor.'); show(); process.exit(1); }
      var c = eng.getCurrentChoices();
      if (!c || !c[n]) { console.log('No choice ' + arg + '.'); show(); process.exit(1); }
      if (c[n].canChoose === false) { console.log('That choice is unavailable.'); show(); process.exit(1); }
      eng.choose(n);
    } else if (cmd === 'draw') {
      var d = ui.decks[n];
      if (!d) { console.log('No deck ' + arg + '.'); process.exit(1); }
      var card = eng.drawCard(d.id);
      if (!card || !card.id) { console.log('That deck has nothing to draw now.'); }
    } else if (cmd === 'play') {
      var hand = eng.state.currentHands[eng.state.sceneId] || [];
      if (!hand[n]) { console.log('No card ' + arg + ' in hand.'); process.exit(1); }
      eng.playCard(hand[n].id);
    } else {
      var p = ui.pinned[n];
      if (!p) { console.log('No pinned card ' + arg + '.'); process.exit(1); }
      eng.playPinnedCard(p.id);
    }
  } catch (e) {
    console.log('ENGINE ERROR: ' + (e && e.stack || e));
    process.exit(2);
  }
  save(); show();
} else {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 14).join('\n').replace(/^\/\/ ?/gm, ''));
}
