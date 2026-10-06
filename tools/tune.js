var RO = require('./model.js');
function show(label, Q, arena, extra) {
  var r = RO.arenaResult(Q, arena, extra);
  console.log(label.padEnd(26), arena.padEnd(10), RO.PARTIES.map(p => p + ' ' + r[p].toFixed(1)).join('  '), ' G=' + RO.grievance(Q).toFixed(0));
}
var Mar = {war_weariness: 70, bread: 30, land_pressure: 40, ruble: 60, bolshevik: 20, right_threat: 30, soviet_democracy: 80, repression: 0, in_coalition: 0, player_slot: 'men', lsr_split: 0};
var Jun = Object.assign({}, Mar, {war_weariness: 76, bread: 26, land_pressure: 50, ruble: 48, bolshevik: 35, in_coalition: 1});
var Sep = Object.assign({}, Mar, {war_weariness: 82, bread: 18, land_pressure: 66, ruble: 32, bolshevik: 60, right_threat: 50, in_coalition: 1});
var Nov = Object.assign({}, Mar, {war_weariness: 85, bread: 14, land_pressure: 75, ruble: 25, bolshevik: 75, right_threat: 40, in_coalition: 0, lsr_split: 1});
var Spr = Object.assign({}, Mar, {war_weariness: 60, bread: 12, land_pressure: 40, ruble: 20, bolshevik: 70, right_threat: 40, soviet_democracy: 60, repression: 20, lsr_split: 1});
show('Mar 1917', Mar, 'soviets'); show('Jun 1917 (congress)', Jun, 'soviets');
show('Sep 1917 Moscow duma', Sep, 'dumas'); show('Nov 1917 assembly', Nov, 'assembly');
show('Spring 1918 provincial', Spr, 'provincial', {men: 1.3, sr: 1.3, bol: 0.9});
console.log('--- with arena extras');
show('Jun 1917 (congress)', Jun, 'soviets', {men: 1.7, bol: 1.3, sr: 1.0});
show('Sep 1917 Moscow duma', Sep, 'dumas', {bol: 1.9, men: 0.6});
show('Nov 1917 assembly', Nov, 'assembly', {});
