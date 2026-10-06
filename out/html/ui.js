// Interface layer for Red October: Fall of Empire.
// Loaded after game.js: replaces the sidebar with bar charts, shows what each choice changed,
// and decorates the party-select screen. Everything is read from dendryUI.dendryEngine.state.qualities.
(function() {
  'use strict';

  function engine() { return window.dendryUI && window.dendryUI.dendryEngine; }
  function qualities() { var e = engine(); return e && e.state ? e.state.qualities : null; }
  function sceneId() { var e = engine(); return e && e.state ? (e.state.sceneId || '') : ''; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function num(x) { return typeof x === 'number' && isFinite(x) ? x : 0; }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  // ---------- words (the same thresholds as the qdisplay files) ----------
  function pick(v, steps) {
    for (var i = 0; i < steps.length - 1; i++) { if (v < steps[i][0]) { return steps[i][1]; } }
    return steps[steps.length - 1][1];
  }
  var WORDS = {
    level: [[15, 'very low'], [35, 'low'], [60, 'middling'], [80, 'high'], [1e9, 'very high']],
    bread: [[15, 'famine'], [30, 'severe shortages'], [50, 'shortages'], [70, 'tight'], [1e9, 'adequate']],
    ruble: [[15, 'worthless'], [30, 'collapsing'], [50, 'weak'], [70, 'strained'], [1e9, 'stable']],
    rel: [[20, 'hostile'], [40, 'cold'], [60, 'cooperative'], [75, 'friendly'], [1e9, 'close']],
    dissent: [[5, 'very low'], [15, 'low'], [31, 'medium'], [50, 'high'], [1e9, 'very high']],
    front: [[15, 'Whites contained'], [35, 'Whites on the offensive'], [55, 'front wavering'], [75, 'Whites advancing'], [1e9, 'Whites near Moscow']]
  };
  var ALLIANCE = ['no alliance', 'cooperation', 'bloc', 'coalition'];
  var LEGALITY = ['banned', 'expelled', 'tolerated', 'legal'];
  var PHASE = ['', 'Dual power', 'Assembly crisis', 'Soviet opposition', 'Civil War', 'Kronstadt and NEP'];
  var MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function dateText(Q) {
    var half = (Q.turn_length < 1) ? (Q.half_month ? 'Late ' : 'Early ') : '';
    return half + MONTHS[Q.month] + ' ' + Q.year;
  }

  // ---------- bars ----------
  function scoreColor(v, goodHigh) {
    var t = clamp(goodHigh ? v : 100 - v, 0, 100);
    return 'hsl(' + Math.round(t * 1.15) + ', 52%, 44%)';
  }
  var turnSnap = null, prevTurnSnap = null;

  function arrow(key, goodHigh, Q) {
    if (!prevTurnSnap || prevTurnSnap[key] === undefined) { return ''; }
    var d = Math.round(num(Q[key])) - Math.round(prevTurnSnap[key]);
    if (Math.abs(d) < 2) { return ''; }
    var good = (d > 0) === goodHigh;
    return ' <span class="sb-arrow ' + (good ? 'good' : 'bad') + '" title="since last turn">' + (d > 0 ? '▲' : '▼') + '</span>';
  }
  function barRow(label, value, word, color, extra, ticks) {
    var w = clamp(value, 0, 100);
    var t = '';
    if (ticks) { for (var i = 0; i < ticks.length; i++) { t += '<span class="sb-tick" style="left:' + ticks[i] + '%"></span>'; } }
    return '<div class="sb-row"><div class="sb-label"><span>' + label + '</span><span class="sb-word">' + esc(word) + (extra || '') + '</span></div>' +
      '<div class="sb-bar"><div class="sb-fill" style="width:' + w + '%;background:' + color + '"></div>' + t + '</div></div>';
  }
  function statRow(Q, key, label, words, goodHigh) {
    var v = num(Q[key]);
    return barRow(label, v, pick(v, WORDS[words]), scoreColor(v, goodHigh), arrow(key, goodHigh, Q));
  }

  // ---------- the tabs ----------
  function renderMain(Q) {
    var h = '<div class="sb-date">' + esc(dateText(Q)) + '</div><div class="sb-phase">' + esc(PHASE[clamp(Q.phase || 1, 1, 5)]) + '</div>';
    h += '<table class="sb-kv"><tr><td>Resources</td><td>' + Math.round(num(Q.resources)) + '</td></tr>' +
         '<tr><td>Members</td><td>' + Math.round(num(Q.members)) + ',000</td></tr>' +
         '<tr><td>Legal status</td><td>' + LEGALITY[clamp(Math.round(num(Q.legality)), 0, 3)] + '</td></tr></table>';
    var d = num(Q.dissent) * 100;
    h += barRow('Party dissent', d, pick(d, WORDS.dissent), scoreColor(d * 1.6, false), '');
    h += '<div class="sb-section">The country</div>';
    h += statRow(Q, 'bread', 'Bread supply', 'bread', true);
    h += statRow(Q, 'ruble', 'The ruble', 'ruble', true);
    h += statRow(Q, 'war_weariness', Q.at_war ? 'War weariness' : 'Civil War weariness', 'level', false);
    if (!Q.bol_regime && Q.at_war) { h += statRow(Q, 'army_discipline', 'Army discipline', 'level', true); }
    h += statRow(Q, 'land_pressure', 'Land pressure', 'level', false);
    if (!Q.bol_regime) {
      h += statRow(Q, 'bolshevik', 'Bolshevik strength', 'level', false);
      h += statRow(Q, 'right_threat', 'Threat from the Right', 'level', false);
    }
    h += statRow(Q, 'soviet_democracy', 'Soviet democracy', 'level', true);
    if (num(Q.repression) > 4) { h += statRow(Q, 'repression', 'Repression', 'level', false); }
    if (Q.bol_regime && num(Q.dix) >= 34) { h += statRow(Q, 'white_front', 'The front', 'front', false); }
    return h;
  }

  function thirdLabel(Q) {
    if (Q.player_party === 'lsr') { return 'Mensheviks'; }
    if (Q.player_party === 'sr' && !Q.lsr_split) { return 'Left SR faction'; }
    return 'Left SRs';
  }
  function relRow(Q, key, label, lvlKey) {
    var v = num(Q[key]);
    var lvl = lvlKey ? num(Q[lvlKey]) : 0;
    var badge = lvlKey ? ' <span class="sb-badge lvl' + lvl + '">' + ALLIANCE[clamp(lvl, 0, 3)] + '</span>' : '';
    return barRow(label, v, pick(v, WORDS.rel), '#7a5a2b', badge + arrow(key, true, Q), [40, 60, 75]);
  }
  function renderParties(Q) {
    var h = '<div class="sb-section">Relations and alliances</div>';
    h += relRow(Q, 'rel_ally', esc(Q.partner_name), 'ally_lvl');
    h += relRow(Q, 'rel_lsr', esc(thirdLabel(Q)), 'ally_lsr');
    h += relRow(Q, 'rel_bol', 'Bolsheviks', 'ally_bol');
    h += relRow(Q, 'rel_kad', 'Kadets', null);
    h += '<div class="sb-note">Ticks mark the levels: cooperation 40, bloc 60, coalition 75.</div>';
    return h;
  }

  function renderCurrents(Q) {
    var h = '<div class="sb-section">Party currents</div>';
    var fs = Q.factions || [];
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], s = num(Q[f + '_strength']), d = num(Q[f + '_dissent']);
      if (s < 0.5 && f !== 'defencist' && f !== 'intl') { continue; }
      var dw = pick(d, WORDS.dissent);
      h += barRow(esc(Q['flabel_' + f] || f), clamp(s * 1.6, 0, 100), Math.round(s) + '%', '#4d6a8a',
                  ' <span class="sb-diss ' + (d >= 31 ? 'bad' : (d >= 15 ? 'mid' : 'good')) + '">dissent: ' + esc(dw) + '</span>');
    }
    return h;
  }

  var PARTY_COLORS = {bol: '#b3261e', lsr: '#d9822b', sr: '#4a7c3a', men: '#2f5d9b', kad: '#8a6d3b', pop: '#8e6fa8', nat: '#3e9a9a', oth: '#999999'};
  function renderSupport(Q) {
    var arena = Q.phase <= 1 ? 'Congress of Soviets, projected' : (Q.phase === 2 ? 'Constituent Assembly, projected' : 'City soviets, projected');
    var h = '<div class="sb-section">Support</div><div class="sb-note">' + arena + '</div>';
    var rows = [
      ['bol', 'Bolsheviks', num(Q.poll_bol)], ['sr', 'SRs', num(Q.poll_sr)], ['men', 'Mensheviks', num(Q.poll_men)],
      ['kad', 'Kadets', num(Q.poll_kad)], ['pop', 'Popular Socialists, Trudoviks', num(Q.poll_pop)],
      ['nat', 'National parties', num(Q.poll_nat)], ['oth', 'Anarchists and others', num(Q.poll_oth)]
    ];
    if (Q.lsr_split) { rows.push(['lsr', 'Left SRs', num(Q.poll_lsr)]); }
    else if (Q.player_party === 'lsr') { rows.push(['lsr', 'Left SRs (on SR lists)', num(Q.poll_lsr_in)]); }
    rows.sort(function(a, b) { return b[2] - a[2]; });
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var mine = (r[0] === Q.player_slot);
      h += '<div class="sb-row' + (mine ? ' mine' : '') + '"><div class="sb-label"><span>' + esc(r[1]) + (mine ? ' ◄' : '') + '</span><span class="sb-word">' + Math.round(r[2]) + '%</span></div>' +
           '<div class="sb-bar"><div class="sb-fill" style="width:' + clamp(r[2] * 2, 0, 100) + '%;background:' + PARTY_COLORS[r[0]] + '"></div></div></div>';
    }
    return h;
  }

  var previousUpdate = window.updateSidebar;
  window.updateSidebar = function() {
    var Q = qualities();
    var box = $('#qualities');
    var side = $('#stats_sidebar');
    if (!Q || Q.started !== 1 || !window.RO || sceneId().indexOf('root.') === 0) {
      side.hide();
      return;
    }
    side.show();
    // refresh the derived numbers (polls, rounded stats) before drawing
    try { window.RO.updateFactions(Q); window.RO.updatePolls(Q); window.RO.display(Q); } catch (e) { /* the engine will recompute at the next turn */ }
    var html;
    switch (window.statusTab) {
      case 'status.politics': html = renderParties(Q); break;
      case 'status.paramilitaries': html = renderCurrents(Q); break;
      case 'status.polls': html = renderSupport(Q); break;
      default: html = renderMain(Q);
    }
    box.empty().append('<div class="sb">' + html + '</div>');
  };

  // ---------- what did that choice change? ----------
  var TRACK = [
    ['bread', 'Bread supply', true, 1], ['ruble', 'The ruble', true, 1], ['war_weariness', 'War weariness', false, 1],
    ['army_discipline', 'Army discipline', true, 1], ['land_pressure', 'Land pressure', false, 1],
    ['bolshevik', 'Bolshevik strength', false, 1], ['right_threat', 'Threat from the Right', false, 1],
    ['soviet_democracy', 'Soviet democracy', true, 1], ['repression', 'Repression', false, 1],
    ['resources', 'Resources', true, 1], ['white_front', 'The front', false, 1]
  ];
  var BOOSTS = [['workers', "Workers' support"], ['soldiers', "Soldiers' support"], ['peasants', "Peasants' support"],
                ['middle', "Middle strata's support"], ['railway', "Railwaymen's support"], ['nations', "Minorities' support"]];

  function snapshot(Q) {
    var s = {};
    var i;
    for (i = 0; i < TRACK.length; i++) { s[TRACK[i][0]] = num(Q[TRACK[i][0]]); }
    for (i = 0; i < BOOSTS.length; i++) { s['boost_' + BOOSTS[i][0]] = num(Q['boost_' + BOOSTS[i][0]]); }
    ['rel_ally', 'rel_lsr', 'rel_bol', 'rel_kad', 'members', 'dissent', 'legality', 'ally_lvl', 'ally_lsr', 'ally_bol'].forEach(function(k) { s[k] = num(Q[k]); });
    (Q.factions || []).forEach(function(f) { s[f + '_strength'] = num(Q[f + '_strength']); });
    return s;
  }
  function signed(d) { return (d > 0 ? '+' : '−') + Math.abs(d); }
  function chip(text, good) { return '<span class="eff ' + (good === null ? 'neutral' : (good ? 'good' : 'bad')) + '">' + text + '</span>'; }

  function deltas(before, Q) {
    var out = [], i, d, k;
    for (i = 0; i < TRACK.length; i++) {
      k = TRACK[i][0];
      d = Math.round(num(Q[k])) - Math.round(before[k]);
      if (d !== 0 && Math.abs(num(Q[k]) - before[k]) >= 0.5) { out.push(chip(esc(TRACK[i][1]) + ' ' + signed(d), (d > 0) === TRACK[i][2])); }
    }
    for (i = 0; i < BOOSTS.length; i++) {
      k = 'boost_' + BOOSTS[i][0];
      d = num(Q[k]) - before[k];
      if (Math.abs(d) >= 1) { out.push(chip(esc(BOOSTS[i][1]) + ' ' + signed(Math.round(d)), d > 0)); }
    }
    var rels = [['rel_ally', Q.partner_name], ['rel_lsr', thirdLabel(Q)], ['rel_bol', 'Bolsheviks'], ['rel_kad', 'Kadets']];
    for (i = 0; i < rels.length; i++) {
      d = Math.round(num(Q[rels[i][0]])) - Math.round(before[rels[i][0]]);
      if (d !== 0) { out.push(chip('Relations with ' + esc(rels[i][1]) + ' ' + signed(d), d > 0)); }
    }
    d = Math.round(num(Q.dissent) * 100) - Math.round(before.dissent * 100);
    if (d !== 0) { out.push(chip('Party dissent ' + signed(d), d < 0)); }
    d = Math.round(num(Q.members)) - Math.round(before.members);
    if (d !== 0) { out.push(chip('Members ' + signed(d) + ',000', d > 0)); }
    (Q.factions || []).forEach(function(f) {
      var ds = Math.round(num(Q[f + '_strength']) - before[f + '_strength']);
      if (Math.abs(ds) >= 3) { out.push(chip(esc(Q['flabel_' + f] || f) + (ds > 0 ? ' stronger' : ' weaker'), null)); }
    });
    var lv = Math.round(num(Q.legality)), lvb = Math.round(before.legality);
    if (lv !== lvb) { out.push(chip('Legal status: ' + LEGALITY[clamp(lv, 0, 3)], lv > lvb)); }
    var alls = [['ally_lvl', Q.partner_name], ['ally_lsr', thirdLabel(Q)], ['ally_bol', 'Bolsheviks']];
    for (i = 0; i < alls.length; i++) {
      var a = Math.round(num(Q[alls[i][0]])), ab = Math.round(before[alls[i][0]]);
      if (a !== ab) { out.push(chip('Alliance with ' + esc(alls[i][1]) + ': ' + ALLIANCE[clamp(a, 0, 3)], a > ab)); }
    }
    return out;
  }

  var lastSnap = null;
  function quietScene(id) {
    return id === 'root' || id.indexOf('root.') === 0 || id === 'main' || id.indexOf('main.') === 0 || id.indexOf('post_event') === 0 ||
           id === 'status' || id.indexOf('status.') === 0 || id.indexOf('library') === 0 || id.indexOf('credits') === 0 ||
           id === 'cancel_advisor_action' || id === 'easy_discard' || id === 'return' || id.indexOf('game_over') === 0;
  }
  function showEffects() {
    var Q = qualities();
    if (!Q || Q.started !== 1) { lastSnap = null; return; }
    var id = sceneId();
    var now = snapshot(Q);
    if (lastSnap && !quietScene(id)) {
      var chips = deltas(lastSnap, Q);
      if (chips.length) {
        var box = $('<div class="effects"><span class="effects-title">What changed</span> ' + chips.join(' ') + '</div>');
        $('#content').append(box);
      }
    }
    lastSnap = now;
    // arrows in the sidebar compare with the start of the previous turn
    if (id === 'main' || id.indexOf('main.') === 0) {
      prevTurnSnap = turnSnap; turnSnap = now;
    }
  }

  // ---------- party-select screen ----------
  function decorateParties() {
    var id = sceneId();
    if (id !== 'root.start') { return; }
    setTimeout(function() {
      $('#content ul.choices li').each(function() {
        var li = $(this), txt = li.text();
        var img = null;
        if (txt.indexOf('Mensheviks') === 0 || txt.indexOf('The Mensheviks') === 0) { img = 'men'; }
        else if (txt.indexOf('Socialist Revolutionaries') >= 0) { img = 'sr'; }
        else if (txt.indexOf('Left SRs') >= 0) { img = 'lsr'; }
        if (img && !li.hasClass('party-choice')) {
          li.addClass('party-choice').prepend('<img class="party-emblem" src="img/parties/' + img + '.svg?v=2" alt="">');
        }
      });
    }, 30);
  }

  window.onDisplayContent = function() {
    window.updateSidebar();
    showEffects();
    decorateParties();
  };

  // the first page is displayed before this script runs: draw (or hide) the sidebar once the page is ready
  $(function() { setTimeout(function() { window.updateSidebar(); }, 150); });

  // redraw the sidebar when the hand changes (cards played in the same scene)
  window.refreshSidebar = function() { window.updateSidebar(); };
}());
