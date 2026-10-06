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


  // ---------- the right-hand panel: support by class ----------
  var rightTab = 'classes';
  var openClass = {};
  var PARTY_LABEL = {bol: 'Bolsheviks', lsr: 'Left SRs', sr: 'SRs', men: 'Mensheviks', kad: 'Kadets', pop: 'Popular Socialists, Trudoviks',
                     nat: 'National parties', oth: 'Anarchists and others'};
  function arenaName(Q) { return Q.phase <= 1 ? 'Congress of Soviets' : (Q.phase === 2 ? 'Constituent Assembly' : 'City soviets'); }
  function youLabel(Q) { return Q.player_party === 'lsr' && !Q.lsr_split ? 'Left SRs (on SR lists)' : (Q.pname || ''); }

  function renderClasses(Q) {
    var cs = window.RO.classSupport(Q);
    var color = PARTY_COLORS[Q.player_slot] || '#7a5a2b';
    var h = '<div class="sb-section">Support by class</div><div class="sb-note">' + esc(youLabel(Q)) + ' – ' + arenaName(Q) + ', projected. Click a class for all parties.</div>';
    var order = ['workers', 'railway', 'soldiers', 'peasants', 'smallbiz', 'bureaucrats', 'intelligentsia', 'bigbiz', 'nations'];
    var byId = {};
    cs.forEach(function(c) { byId[c.id] = c; });
    order.forEach(function(id) {
      var c = byId[id];
      var lead = null, best = -1;
      Object.keys(c.rows).forEach(function(p) { if (c.rows[p] > best && !(p === 'lsr' && !Q.lsr_split)) { best = c.rows[p]; lead = p; } });
      var leadTxt = (lead === Q.player_slot || (Q.player_slot === 'lsr' && !Q.lsr_split && lead === 'sr' && false)) ? 'you lead' : 'leads: ' + PARTY_LABEL[lead] + ' ' + Math.round(best) + '%';
      h += '<div class="rs-class" data-id="' + id + '"><div class="sb-label"><span>' + esc(c.name) + '</span><span class="sb-word">' + Math.round(c.you) + '%</span></div>' +
           '<div class="sb-bar"><div class="sb-fill" style="width:' + clamp(c.you, 0, 100) + '%;background:' + color + '"></div></div>' +
           '<div class="rs-meta">' + (c.share < 1 ? '<1' : Math.round(c.share)) + '% of the electorate · ' + esc(leadTxt) + '</div>';
      if (openClass[id]) {
        h += '<div class="rs-detail">';
        var keys = Object.keys(c.rows).filter(function(p) { return !(p === 'lsr' && !Q.lsr_split); }).sort(function(a, b) { return c.rows[b] - c.rows[a]; });
        keys.forEach(function(p) {
          var mine = (p === Q.player_slot);
          h += '<div class="sb-row' + (mine ? ' mine' : '') + '"><div class="sb-label"><span>' + esc(PARTY_LABEL[p]) + '</span><span class="sb-word">' + Math.round(c.rows[p]) + '%</span></div>' +
               '<div class="sb-bar"><div class="sb-fill" style="width:' + clamp(c.rows[p] * 1.4, 0, 100) + '%;background:' + PARTY_COLORS[p] + '"></div></div></div>';
        });
        h += '</div>';
      }
      h += '</div>';
    });
    return h;
  }

  function renderPopularity(Q) {
    var pops = window.RO.popularity(Q);
    var color = PARTY_COLORS[Q.player_slot] || '#7a5a2b';
    var cur = Q.phase <= 1 ? 'soviets' : (Q.phase === 2 ? 'assembly' : 'provincial');
    var now = null;
    pops.forEach(function(p) { if (p.arena === cur) { now = p; } });
    var h = '<div class="sb-section">Popularity</div>';
    if (now) {
      var trend = '';
      if (prevTurnSnap && prevTurnSnap.player_poll !== undefined) {
        var d = Math.round(now.you) - Math.round(prevTurnSnap.player_poll);
        if (d !== 0) { trend = ' <span class="sb-arrow ' + (d > 0 ? 'good' : 'bad') + '">' + (d > 0 ? '▲' : '▼') + Math.abs(d) + '</span>'; }
      }
      h += '<div class="rs-big">' + Math.round(now.you) + '%' + trend + '<small>' + esc(youLabel(Q)) + ' · ' + esc(now.name) + '</small></div>';
      h += '<div class="sb-note" style="text-align:center">Ranked ' + now.rank + (now.rank === 1 ? 'st' : (now.rank === 2 ? 'nd' : (now.rank === 3 ? 'rd' : 'th'))) + ' of the parties</div>';
    }
    h += '<div class="sb-section">In every arena</div>';
    pops.forEach(function(p) {
      h += '<div class="sb-row"><div class="sb-label"><span>' + esc(p.name) + '</span><span class="sb-word">' + Math.round(p.you) + '% · rank ' + p.rank + '</span></div>' +
           '<div class="sb-bar"><div class="sb-fill" style="width:' + clamp(p.you * 2, 0, 100) + '%;background:' + color + '"></div></div></div>';
    });
    h += '<div class="sb-note">The soviets favour the towns and the soldiers, the dumas the propertied classes, the Assembly the villages.</div>';
    h += '<div class="sb-section">Members and resources</div><table class="sb-kv"><tr><td>Members</td><td>' + Math.round(num(Q.members)) + ',000</td></tr><tr><td>Resources</td><td>' + Math.round(num(Q.resources)) + '</td></tr></table>';
    return h;
  }

  // ---------- the Parliament tab: the parliament as elected, or as it would be if it voted today ----------
  var parlArena = null, parlMode = 'elected', panelRec = null;
  var PARL_ARENAS = [['soviets', 'Soviets'], ['assembly', 'Assembly'], ['dumas', 'City dumas']];
  var ELECTED = {soviets: 'parl_congress', assembly: 'parl_assembly'};

  function renderParliamentTab(Q) {
    if (!parlArena) { var cur = window.RO.currentArena(Q); parlArena = (cur === 'provincial') ? 'soviets' : cur; }
    var h = '<div class="sb-section">Parliament</div><div class="pp-pills">';
    PARL_ARENAS.forEach(function(a) {
      h += '<button class="pp-pill' + (a[0] === parlArena ? ' active' : '') + '" data-arena="' + a[0] + '">' + a[1] + '</button>';
    });
    h += '</div>';
    var elected = Q[ELECTED[parlArena]] || null;
    var proj = window.RO.projectParliament(Q, parlArena);
    var showElected = elected && parlMode === 'elected';
    panelRec = showElected ? elected : proj;
    if (elected) {
      h += '<div class="pp-pills"><button class="pp-pill pp-mode' + (showElected ? ' active' : '') + '" data-mode="elected">As elected</button>' +
           '<button class="pp-pill pp-mode' + (!showElected ? ' active' : '') + '" data-mode="projected">If it voted today</button></div>';
    }
    h += '<div class="parliament pp-chart"></div>';
    var rec = panelRec, mine = null, i;
    for (i = 0; i < rec.rows.length; i++) { if (rec.rows[i][0] === Q.player_slot) { mine = rec.rows[i]; } }
    var maj = Math.floor(rec.total / 2) + 1;
    var youSeats = mine ? mine[2] : 0;
    if (Q.player_slot === 'lsr' && !Q.lsr_split) { youSeats = rec.lsrIn; }
    h += '<div class="pp-sum">' + esc(youLabel(Q)) + ': <b>' + youSeats + '</b> of ' + rec.total + ' seats (majority ' + maj + ')</div>';
    var sorted = rec.rows.slice().sort(function(a, b) { return b[2] - a[2]; });
    if (sorted.length && sorted[0][2] < maj) {
      h += '<div class="sb-note">No party has a majority. The largest, ' + esc(PARTY_SHORT[sorted[0][0]]) + ', holds ' + sorted[0][2] + '.</div>';
    } else if (sorted.length) {
      h += '<div class="sb-note">' + esc(PARTY_SHORT[sorted[0][0]]) + ' hold a majority.</div>';
    }
    if (showElected && parlArena === 'assembly' && Q.assembly_survives === 0 && Q.ca_elected) {
      h += '<div class="sb-note">This Assembly has been dispersed; the seats are shown as they were elected.</div>';
    }
    if (!showElected) {
      h += '<div class="sb-note">A projection: what the ' + esc(rec.title) + ' would look like if the electorate voted today. It moves every turn.</div>';
    }
    return h;
  }

  function drawPanelParliament() {
    var el = $('#support_panel .pp-chart');
    if (!el.length || !panelRec) { return; }
    var Q = qualities();
    drawParliament(el[0], panelRec, Q, {width: Math.max(200, ($('#support_panel').width() || 240) - 16), still: true});
  }

  // ---------- the Opposition tab: the camps that answer your policies ----------
  function antWord(a) { return a < 20 ? 'Calm' : (a < 40 ? 'Uneasy' : (a < 70 ? 'Hostile' : 'On the brink')); }
  function renderOpposition(Q) {
    var camps = window.RO.opposition(Q);
    var h = '<div class="sb-section">Opposition</div><div class="sb-note">The camps that answer your policies. At ' + window.RO.SANCTION_AT + ' they try to sanction you; at ' + window.RO.REVOLT_AT + ' they take up arms.</div>';
    if (!camps.length) { return h + '<div class="sb-note">No camp is organised against you now.</div>'; }
    var st = Math.round(window.RO.strength(Q));
    h += '<div class="opp-camp"><div class="sb-label"><span>Your strength</span><span class="sb-word">' + st + (st >= 18 ? ' · enough to strike' : ' · too weak to strike') + '</span></div>' +
         '<div class="sb-bar opp-bar"><div class="sb-fill" style="width:' + clamp(st * 2, 0, 100) + '%;background:#4a6a8a"></div><i class="opp-tick" style="left:36%"></i></div>' +
         '<div class="rs-meta">From your allies, the militia, the army, your resources and the soviets behind you. At 18 you can pass an unpopular law and break its opponents by force.</div></div>';
    camps.forEach(function(c) {
      var a = Math.round(c.ant), objects = c.why.filter(function(w) { return w.s > 0; }).slice(0, 3);
      var likes = c.why.filter(function(w) { return w.s < 0; }).slice(0, 1);
      h += '<div class="opp-camp"><div class="sb-label"><span>' + esc(c.name) + '</span><span class="sb-word">' + antWord(a) + ' · ' + a + '</span></div>' +
           '<div class="sb-bar opp-bar"><div class="sb-fill" style="width:' + clamp(a, 0, 100) + '%;background:#9a3b2e"></div>' +
           '<i class="opp-tick" style="left:' + window.RO.SANCTION_AT + '%"></i><i class="opp-tick" style="left:' + window.RO.REVOLT_AT + '%"></i></div>';
      if (st >= 18) { h += '<div class="rs-meta">Chance to break it by force: ' + Math.round(c.odds * 100) + '%.</div>'; }
      if (c.pending) { h += '<div class="rs-meta opp-alert">' + (c.pending === 2 ? 'An uprising is under way.' : 'Sanctions are coming.') + '</div>'; }
      else if (c.cooling) { h += '<div class="rs-meta">It has just acted, and is regrouping.</div>'; }
      if (objects.length) { h += '<div class="rs-meta">Objects to: ' + objects.map(function(w) { return esc(w.t); }).join('; ') + '.</div>'; }
      else { h += '<div class="rs-meta">Has no quarrel with your policies for now.</div>'; }
      if (likes.length) { h += '<div class="rs-meta">Likes: ' + esc(likes[0].t) + '.</div>'; }
      h += '</div>';
    });
    h += '<div class="sb-note">Hostility moves towards what each camp objects to in your policies (the Cabinet card, the land committees, the decrees) and eases when you give way.</div>';
    return h;
  }

  function renderRight() {
    var Q = qualities();
    var side = $('#support_sidebar');
    if (!Q || Q.started !== 1 || !window.RO || sceneId().indexOf('root.') === 0) { side.hide(); return; }
    side.show();
    var html;
    panelRec = null;
    if (rightTab === 'popularity') { html = renderPopularity(Q); }
    else if (rightTab === 'parliament') { html = renderParliamentTab(Q); }
    else if (rightTab === 'opposition') { html = renderOpposition(Q); }
    else { html = renderClasses(Q); }
    $('#support_panel').empty().append('<div class="sb">' + html + '</div>');
    if (rightTab === 'parliament') { drawPanelParliament(); }
    var hot = 0;
    try { window.RO.opposition(Q).forEach(function(c) { hot = Math.max(hot, c.ant); }); } catch (e) { /* no model yet */ }
    $('#rt_opp').toggleClass('alert', hot >= window.RO.SANCTION_AT);
  }
  $(document).on('click', '.pp-pill:not(.pp-mode)', function() { parlArena = $(this).data('arena'); parlMode = 'elected'; renderRight(); });
  $(document).on('click', '.pp-mode', function() { parlMode = $(this).data('mode'); renderRight(); });
  window.changeRightTab = function(tab, btn) {
    rightTab = tab;
    $('#support_sidebar .tab_button').removeClass('active');
    $('#' + btn).addClass('active');
    renderRight();
  };
  window.toggleSupport = function() {
    if (window.innerWidth <= 1200) { $('body').toggleClass('show-support'); }
    else { $('body').toggleClass('hide-support'); }
    renderRight();
    return false;
  };
  $(document).on('click', '.rs-class', function() {
    var id = $(this).data('id');
    openClass[id] = !openClass[id];
    renderRight();
  });

  var previousUpdate = window.updateSidebar;
  window.updateSidebar = function() {
    var Q = qualities();
    var box = $('#qualities');
    var side = $('#stats_sidebar');
    if (!Q || Q.started !== 1 || !window.RO || sceneId().indexOf('root.') === 0) {
      side.hide();
      $('#support_sidebar').hide();
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
    renderRight();
  };

  // ---------- what did that choice change? ----------
  var TRACK = [
    ['bread', 'Bread supply', true, 1], ['ruble', 'The ruble', true, 1], ['war_weariness', 'War weariness', false, 1],
    ['army_discipline', 'Army discipline', true, 1], ['land_pressure', 'Land pressure', false, 1],
    ['bolshevik', 'Bolshevik strength', false, 1], ['right_threat', 'Threat from the Right', false, 1],
    ['soviet_democracy', 'Soviet democracy', true, 1], ['repression', 'Repression', false, 1],
    ['resources', 'Resources', true, 1], ['white_front', 'The front', false, 1],
    ['ant_kad', 'Kadet hostility', false, 1], ['ant_gen', 'Hostility of the generals', false, 1], ['ant_bol', 'Bolshevik hostility', false, 1]
  ];
  var BOOSTS = [['workers', "Workers' support"], ['soldiers', "Soldiers' support"], ['peasants', "Peasants' support"],
                ['middle', "Middle strata's support"], ['railway', "Railwaymen's support"], ['nations', "Minorities' support"]];

  function snapshot(Q) {
    var s = {};
    var i;
    for (i = 0; i < TRACK.length; i++) { s[TRACK[i][0]] = num(Q[TRACK[i][0]]); }
    for (i = 0; i < BOOSTS.length; i++) { s['boost_' + BOOSTS[i][0]] = num(Q['boost_' + BOOSTS[i][0]]); }
    ['rel_ally', 'rel_lsr', 'rel_bol', 'rel_kad', 'members', 'dissent', 'legality', 'ally_lvl', 'ally_lsr', 'ally_bol', 'player_poll'].forEach(function(k) { s[k] = num(Q[k]); });
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


  // ---------- the parliament chart ----------
  // A placeholder <div class="parliament" data-name="assembly"> in an event's text is replaced by a hemicycle of
  // seats in party colours, from the record that RO.recordParliament stored in Q.parl_<name>.
  var PARTY_SHORT = {bol: 'Bolsheviks', lsr: 'Left SRs', sr: 'SRs', men: 'Mensheviks', kad: 'Kadets', pop: 'Popular Socialists and Trudoviks',
                     nat: 'National parties', oth: 'Anarchists and others'};

  function hemicycle(total) {
    // rows of seats between an inner and an outer radius, in proportion to the length of each arc
    var rows = Math.max(3, Math.round(Math.sqrt(total / 2.6)));
    var r0 = 0.38, radii = [], sum = 0, i, j;
    for (i = 0; i < rows; i++) { radii.push(r0 + (1 - r0) * (i + 0.5) / rows); sum += radii[i]; }
    var counts = [], placed = 0;
    for (i = 0; i < rows; i++) { counts.push(Math.round(total * radii[i] / sum)); placed += counts[i]; }
    i = rows - 1;
    while (placed !== total) { counts[i] += (placed < total ? 1 : -1); placed += (placed < total ? 1 : -1); i = (i - 1 + rows) % rows; }
    var seats = [];
    for (i = 0; i < rows; i++) {
      for (j = 0; j < counts[i]; j++) {
        var th = Math.PI * (1 - (j + 0.5) / counts[i]);
        seats.push({a: th, r: radii[i], x: radii[i] * Math.cos(th), y: radii[i] * Math.sin(th)});
      }
    }
    seats.sort(function(p, q) { return (q.a - p.a) || (p.r - q.r); });
    var gap = (1 - r0) / rows, spacing = gap;
    for (i = 0; i < rows; i++) { spacing = Math.min(spacing, Math.PI * radii[i] / counts[i]); }
    return {seats: seats, dot: spacing * 0.43};
  }

  // The seats are drawn by d3-parliament (the library the original game used); if d3 is missing, a plain SVG fallback is drawn.
  function drawParliament(el, rec, Q, opts) {
    opts = opts || {};
    var i;
    var legendHtml = '<div class="parl-legend">';
    var rows = rec.rows.slice().sort(function(a, b) { return b[2] - a[2]; });
    for (i = 0; i < rows.length; i++) {
      var q = rows[i][0], mine = (q === Q.player_slot);
      var name = PARTY_SHORT[q] + (q === 'sr' && rec.lsrIn ? ' (with the Left SRs)' : '');
      legendHtml += '<span class="parl-key' + (mine ? ' mine' : '') + '"><i style="background:' + PARTY_COLORS[q] + '"></i>' + esc(name) + ' <b>' + rows[i][2] + '</b> <small>' + (Math.round(rows[i][1] * 10) / 10) + '%</small></span>';
    }
    legendHtml += '</div>';
    var caption = '<div class="parl-caption">' + rec.total + (rec.total === 100 ? ' points of the vote' : ' seats') + ' · majority ' + (Math.floor(rec.total / 2) + 1) + '</div>';
    var width = opts.width || Math.max(220, Math.min(500, $('#content').width() - 30));
    if (window.d3 && window.d3.parliament) {
      $(el).html((opts.still ? '' : '<div class="parl-title">' + esc(rec.title) + '</div>') + '<svg class="parl-svg" style="width:' + width + 'px;height:' + Math.round(width / 2 + 6) + 'px"></svg>' + caption + legendHtml).attr('data-done', '1');
      var data = rec.rows.map(function(r) {
        return {id: r[0], name: PARTY_SHORT[r[0]], legend: PARTY_SHORT[r[0]], seats: r[2], color: PARTY_COLORS[r[0]]};
      });
      var parliament = window.d3.parliament();
      parliament.width(width).height(width).innerRadiusCoef(0.4);
      parliament.enter.fromCenter(!opts.still).smallToBig(!opts.still);
      parliament.exit.toCenter(false).bigToSmall(true);
      window.d3.select($(el).find('svg.parl-svg')[0]).datum(data).call(parliament);
      return;
    }
    // fallback: our own hemicycle
    var layout = hemicycle(rec.total), W = 480, H = 262, cx = W / 2, cy = H - 22, R = 215;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(rec.title) + '">';
    var idx = 0, k;
    for (i = 0; i < rec.rows.length; i++) {
      var p = rec.rows[i][0], n = rec.rows[i][2];
      for (k = 0; k < n && idx < layout.seats.length; k++, idx++) {
        var st = layout.seats[idx];
        svg += '<circle cx="' + (cx + st.x * R).toFixed(1) + '" cy="' + (cy - st.y * R).toFixed(1) + '" r="' + (layout.dot * R).toFixed(1) + '" fill="' + PARTY_COLORS[p] + '"/>';
      }
    }
    svg += '</svg>';
    $(el).html('<div class="parl-title">' + esc(rec.title) + '</div>' + svg + caption + legendHtml).attr('data-done', '1');
  }

  function renderParliaments() {
    var Q = qualities();
    if (!Q) { return; }
    $('#content .parliament:not([data-done])').each(function() {
      var rec = Q['parl_' + $(this).data('name')];
      if (rec) { drawParliament(this, rec, Q); }
    });
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
    renderParliaments();
  };

  // the first page is displayed before this script runs: draw (or hide) the sidebar once the page is ready
  $(function() { setTimeout(function() { window.updateSidebar(); }, 150); });

  // no native tooltips on the cards (the card shows its own subtitle inside itself)
  $(function() {
    var strip = function() { $('#content a.card[title]').removeAttr('title'); };
    var target = document.getElementById('content');
    if (target && window.MutationObserver) { new MutationObserver(strip).observe(target, {childList: true, subtree: true}); }
    strip();
  });

  // redraw the sidebar when the hand changes (cards played in the same scene)
  window.refreshSidebar = function() { window.updateSidebar(); };
}());
