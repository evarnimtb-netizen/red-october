#!/usr/bin/env node
// Unit tests for tools/model.js: node tools/test_model.js (exits with status 1 on a failure).
// They pin down the rules that the scenes and the interface rely on; run them after changing the model.
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var RO = require('./model.js');

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.log('FAIL ' + name + '\n  ' + (e && e.message)); }
}
// a plain mid-1917 state, in the government, with a few angry camps
function state(extra) {
  var Q = {dix: 10, year: 1917, month: 7, in_coalition: 1, gov_kadets: 1, homogeneous_gov: 0, at_war: 1,
           pol_land: 0, pol_food: 1, pol_war: 0, pol_order: 0, pol_labour: 0, land_committees: 0,
           rel_kad: 40, rel_bol: 30, rel_ally: 60, army_discipline: 45, right_threat: 30, bolshevik: 20,
           soviet_democracy: 70, repression: 5, resources: 3, members: 100, militia: 0, ally_lvl: 2,
           ant_kad: 0, ant_gen: 0, ant_bol: 0, player_poll: 30, player_slot: 'sr', partner_name: 'Mensheviks'};
  for (var k in extra) { Q[k] = extra[k]; }
  return Q;
}

test('the served model is a copy of tools/model.js (run tools/sync_model.sh)', function() {
  var a = fs.readFileSync(path.join(__dirname, 'model.js'), 'utf8');
  var b = fs.readFileSync(path.join(__dirname, '..', 'out', 'html', 'model.js'), 'utf8');
  assert.strictEqual(a, b);
});

test('seats add up to the size of the body', function() {
  var Q = state({res_bol: 24.3, res_sr: 38.1, res_men: 3.2, res_kad: 4.7, res_pop: 1.1, res_nat: 13.4, res_oth: 15.2, res_lsr: 0, seats_total: 703, lsr_split: 1});
  RO.recordParliament(Q, 'assembly', 'The Constituent Assembly');
  var total = Q.parl_assembly.rows.reduce(function(a, r) { return a + r[2]; }, 0);
  assert.strictEqual(total, 703);
});

test('the Left SRs are not drawn as a party of their own before the split', function() {
  var Q = state({res_lsr: 0.4, res_sr: 50, res_bol: 49.6, res_lsr_in: 8, seats_total: 100, lsr_split: 0});
  RO.recordParliament(Q, 'congress', 'Congress');
  assert.ok(!Q.parl_congress.rows.some(function(r) { return r[0] === 'lsr'; }));
  assert.strictEqual(Q.parl_congress.lsrIn, 8);
});

test('a Cabinet policy counts against the party only while it is in the government', function() {
  var inGov = RO.offence(state({pol_land: 2}));
  assert.ok(inGov.kad.why.some(function(w) { return w.area === 'land'; }));
  var out = RO.offence(state({pol_land: 2, in_coalition: 0}));
  assert.ok(!out.kad.why.some(function(w) { return w.area === 'land'; }));
  assert.strictEqual(RO.rollback(state({pol_land: 2, in_coalition: 0}), 'kad'), '');
});

test('a phased-in policy angers less', function() {
  var hard = RO.offence(state({pol_land: 2})).kad.score;
  var soft = RO.offence(state({pol_land: 2, soft_land: 1})).kad.score;
  assert.ok(soft < hard);
});

test('no camp reacts under the Bolshevik regime, and pending reactions are dropped', function() {
  var Q = state({bol_regime: 1, opp_kad_ev: 1, opp_gen_ev: 2, opp_bol_ev: 1, ant_kad: 90, ant_gen: 90});
  RO.oppositionTurn(Q, 1);
  assert.strictEqual(Q.opp_kad_ev + Q.opp_gen_ev + Q.opp_bol_ev, 0);
  assert.strictEqual(RO.opposition(Q).length, 0);
});

test('hostility moves towards what the camp objects to', function() {
  var Q = state({pol_land: 2, pol_labour: 2, gov_kadets: 0, homogeneous_gov: 1});
  for (var i = 0; i < 12; i++) { Q.opp_kad_timer = 1; RO.oppositionTurn(Q, 1); }
  assert.ok(Q.ant_kad > 60, 'ant_kad ' + Q.ant_kad);
});

test('the Break answer in an event always tries, and a failure does not re-queue the event', function() {
  for (var i = 0; i < 200; i++) {
    var Q = state({ant_kad: 100, opp_kad_timer: 4, resources: 0});
    RO.breakCamp(Q, 'kad');
    assert.ok(!/too strong/.test(Q.sq_text));
    if (!Q.sq_won) {
      assert.strictEqual(Q.opp_kad_ev || 0, 0);
      assert.strictEqual(Q.opp_kad_timer, 4);
    }
    assert.ok(Q.resources >= 0);
  }
});

test("a law's force option leaves alone a camp under 45%", function() {
  var Q = state({ant_kad: 100, militia: 0, ally_lvl: 0, resources: 0, army_discipline: 20, soviet_democracy: 30, in_coalition: 0});
  assert.ok(RO.squashOdds(Q, 'kad') < 0.45);
  RO.squashAll(Q, ['kad']);
  assert.ok(/too strong to touch/.test(Q.sq_text));
  assert.strictEqual(Q.break_log, undefined);
});

test('a law phased in does 60% of its effects and costs a resource', function() {
  var Q = state({land_pressure: 50});
  RO.law(Q, 'slow', function() { RO.add(Q, {land_pressure: -10, rel_kad: -6}); }, 'Test law');
  assert.strictEqual(Q.land_pressure, 44);
  assert.strictEqual(Q.resources, 2);
  assert.ok(Q.ant_kad > 0 && Q.ant_kad < 7.2, 'ant_kad ' + Q.ant_kad);
  assert.deepStrictEqual(Q.laws_log[0].slice(1, 3), ['Test law', 'slow']);
});

test('a law that says how much it angers is believed', function() {
  var Q = state({});
  RO.law(Q, 'decree', function() { RO.add(Q, {rel_kad: -8, ant_kad: 14, ant_gen: 8, ant_bol: -3}); });
  assert.strictEqual(Q.ant_kad, 14);
  assert.strictEqual(Q.ant_gen, 8);
  assert.strictEqual(Q.ant_bol, 0);
});

test('lawHits and the generator rule agree on the threshold', function() {
  var h = RO.lawHits({rel_kad: -2, right_threat: 1, rel_bol: -1});
  assert.ok(h.kad >= 2 && h.gen >= 2 && h.bol < 2);
  var py = fs.readFileSync(path.join(__dirname, 'lawvariants.py'), 'utf8');
  assert.ok(/LAW_HIT_MIN = 2/.test(py) && /\* 1\.2/.test(py) && /\* 2/.test(py));
});

test('the run is recorded once a turn', function() {
  var Q = state({});
  RO.recordTurn(Q); RO.recordTurn(Q);
  Q.dix = 11; RO.recordTurn(Q);
  assert.strictEqual(Q.hist.length, 2);
  assert.strictEqual(Q.hist[1][0], 11);
});

test('display() publishes the strength and the odds the scenes read', function() {
  var Q = state({});
  RO.updateFactions && RO.clampStats(Q);
  RO.display(Q);
  assert.ok(typeof Q.strength === 'number' && isFinite(Q.strength));
  ['kad', 'gen', 'bol'].forEach(function(k) { assert.ok(Q['odds_' + k] >= 10 && Q['odds_' + k] <= 90); });
});

console.log(passed + ' passed, ' + failed + ' failed');
if (failed) { process.exit(1); }
