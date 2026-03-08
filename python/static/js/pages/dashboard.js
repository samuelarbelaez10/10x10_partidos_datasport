/**
 * Página: Dashboard - Resumen del torneo en vivo
 */
const Pages = window.Pages || {};

Pages.Dashboard = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [matches, schools, sports] = await Promise.all([
      Api.getMatches(),
      Api.getSchools(),
      Api.getSports(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const liveMatches     = matches.filter(m => m.status === 'live');
    const todayMatches    = matches
      .filter(m => m.match_date && m.match_date.startsWith(today))
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    const recentFinished  = matches.filter(m => m.status === 'finished').slice(-6).reverse();
    const upcomingMatches = matches
      .filter(m => m.status === 'pending' || m.status === 'scheduled')
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
      .slice(0, 5);

    const totalFinished = matches.filter(m => m.status === 'finished').length;

    // Stat card colors
    var statCards = [
      { val: matches.length, label: 'TOTAL PARTIDOS', color: 'var(--accent)', icon: '⚽', sub: sports.length + ' deportes' },
      { val: liveMatches.length, label: 'EN VIVO', color: 'var(--green)', icon: '📡', sub: liveMatches.length > 0 ? 'Ahora mismo' : 'Sin partidos' },
      { val: totalFinished, label: 'FINALIZADOS', color: 'var(--purple)', icon: '✓', sub: Math.round(totalFinished/Math.max(matches.length,1)*100) + '% completado' },
      { val: schools.length, label: 'COLEGIOS', color: 'var(--accent2)', icon: '🏫', sub: 'Participantes' },
    ];

    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">' +
        '<div>' +
          '<h2 class="font-display" style="font-size:32px;letter-spacing:3px;color:var(--text);">DASHBOARD</h2>' +
          '<p style="color:var(--muted);font-size:13px;margin-top:2px;">Big Games 2026 — actualización automática</p>' +
        '</div>' +
        '<button onclick="window._dashTv()" class="btn-ghost" style="font-size:13px;color:var(--accent);">📺 Modo TV</button>' +
      '</div>' +

      // Stat cards
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px;" class="ds-stats">' +
        statCards.map(function(s, i) {
          return '<div class="card" style="position:relative;overflow:hidden;text-align:center;padding:24px 16px;animation:fadeUp 0.4s ease ' + (i*80) + 'ms both;">' +
            '<div style="position:absolute;top:-2px;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,' + s.color + ',transparent);"></div>' +
            '<div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:72px;opacity:0.04;pointer-events:none;">' + s.icon + '</div>' +
            '<div class="font-display" style="font-size:56px;color:' + s.color + ';line-height:1;letter-spacing:2px;">' + s.val + '</div>' +
            '<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-top:8px;font-weight:600;">' + s.label + '</div>' +
            '<div style="font-size:11px;color:var(--muted);margin-top:4px;opacity:0.7;">' + s.sub + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      // Live matches
      (liveMatches.length > 0 ?
      '<div class="card mb-6" style="border-color:rgba(0,255,136,0.2);background:rgba(0,255,136,0.03);">' +
        '<div class="section-title" style="margin-bottom:14px;">' +
          '<span style="color:var(--green);display:flex;align-items:center;gap:10px;">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse-green 1.5s infinite;"></span> EN VIVO' +
          '</span>' +
          '<span class="count-badge">' + liveMatches.length + '</span>' +
        '</div>' +
        '<div style="display:grid;gap:12px;' + (liveMatches.length > 1 ? 'grid-template-columns:repeat(auto-fit,minmax(260px,1fr));' : '') + '">' +
          liveMatches.map(function(m) { return _liveCard(m); }).join('') +
        '</div>' +
      '</div>' : '') +

      // Main grid
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">' +

        // Today
        '<div class="card">' +
          '<div class="section-title"><span>HOY</span><span class="count-badge">' + todayMatches.length + '</span></div>' +
          (todayMatches.length === 0
            ? '<p style="color:var(--muted);font-size:13px;">No hay partidos hoy</p>'
            : todayMatches.map(function(m) { return _dashMatchRow(m); }).join('')) +
        '</div>' +

        // Recent results
        '<div class="card">' +
          '<div class="section-title"><span>RESULTADOS</span></div>' +
          (recentFinished.length === 0
            ? '<p style="color:var(--muted);font-size:13px;">Sin resultados aún</p>'
            : recentFinished.map(function(m) { return _dashMatchRow(m); }).join('')) +
        '</div>' +

        // Upcoming
        '<div class="card" style="grid-column:1/-1;">' +
          '<div class="section-title"><span>PRÓXIMOS</span><span class="count-badge">' + upcomingMatches.length + '</span></div>' +
          (upcomingMatches.length === 0
            ? '<p style="color:var(--muted);font-size:13px;">No hay partidos próximos</p>'
            : '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">' +
                upcomingMatches.map(function(m) { return _dashMatchRow(m); }).join('') +
              '</div>') +
        '</div>' +
      '</div>' +

      // Sports
      '<div class="card" style="margin-top:16px;">' +
        '<div class="section-title"><span>DEPORTES</span><span class="count-badge">' + sports.length + '</span></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;">' +
          sports.map(function(s) {
            return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 18px;text-align:center;cursor:pointer;transition:all 0.2s;" onclick="App.navigate(\'calendar\')" onmouseover="this.style.borderColor=\'rgba(0,212,255,0.2)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
              '<div style="font-size:24px;">' + Utils.sportIcon(s.name) + '</div>' +
              '<div style="font-size:12px;margin-top:4px;color:var(--accent);font-weight:500;">' + s.name + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

    // Update ticker
    _updateTicker(matches);

    window._dashTv = function() { _openTvMode(liveMatches, todayMatches); };

  } catch (e) {
    container.innerHTML = '<div style="color:var(--accent2);padding:32px;">Error: ' + e.message + '</div>';
  }
};

function _liveCard(m) {
  var s1 = m.team1?.name || m.team1?.school?.name || 'Local';
  var s2 = m.team2?.name || m.team2?.school?.name || 'Visitante';
  return '<div style="background:rgba(0,255,136,0.04);border:1px solid rgba(0,255,136,0.15);border-left:3px solid var(--green);border-radius:12px;padding:16px;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform=\'translateX(2px)\'" onmouseout="this.style.transform=\'none\'" onclick="App.navigate(\'liveScoring\',{matchId:\'' + m.id + '\'})">' +
    '<div style="font-size:11px;color:var(--muted);margin-bottom:10px;">' +
      Utils.sportIcon(m.sport) + ' ' + (m.sport||'') + ' · ' + (m.gender||'') + ' · ' + (m.category||'') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">' +
      '<div style="font-weight:600;font-size:13px;color:var(--text);text-align:right;">' + Utils.truncate(s1,18) + '</div>' +
      '<div class="font-display" style="font-size:32px;color:var(--green);text-align:center;letter-spacing:4px;">' + (m.team1_score??0) + ' — ' + (m.team2_score??0) + '</div>' +
      '<div style="font-weight:600;font-size:13px;color:var(--text);text-align:left;">' + Utils.truncate(s2,18) + '</div>' +
    '</div>' +
    '<div style="text-align:center;margin-top:8px;"><span class="badge-live">EN VIVO</span></div>' +
  '</div>';
}

function _dashMatchRow(m) {
  var s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
  var s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
  var statusColor = m.status === 'live' ? 'var(--green)' : m.status === 'finished' ? 'var(--purple)' : 'var(--muted)';
  var target = m.status === 'live' ? 'liveScoring' : m.status === 'finished' ? 'results' : 'calendar';
  var badge = m.status === 'live' ? 'badge-live' : m.status === 'finished' ? 'badge-finished' : 'badge-scheduled';
  var badgeText = m.status === 'live' ? 'LIVE' : m.status === 'finished' ? 'FIN' : 'PROG';
  return '<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border-left:3px solid ' + statusColor + ';background:var(--surface);cursor:pointer;margin-bottom:6px;transition:transform 0.15s;" onmouseover="this.style.transform=\'translateX(2px)\'" onmouseout="this.style.transform=\'none\'" onclick="App.navigate(\'' + target + '\',{matchId:\'' + m.id + '\'})">' +
    '<div style="text-align:right;min-width:0;">' +
      '<div style="font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + Utils.truncate(s1,16) + '</div>' +
    '</div>' +
    '<div style="text-align:center;min-width:80px;">' +
      '<div class="font-display" style="font-size:20px;color:var(--text);letter-spacing:4px;">' + (m.team1_score??0) + ' — ' + (m.team2_score??0) + '</div>' +
      '<div class="font-mono" style="font-size:9px;color:var(--muted);margin-top:2px;">' + Utils.formatDateTime(m.match_date) + '</div>' +
      '<div style="margin-top:4px;"><span class="' + badge + '">' + badgeText + '</span></div>' +
    '</div>' +
    '<div style="text-align:left;min-width:0;">' +
      '<div style="font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + Utils.truncate(s2,16) + '</div>' +
    '</div>' +
  '</div>';
}

function _updateTicker(matches) {
  var live = matches.filter(function(m) { return m.status === 'live'; });
  var ticker = document.getElementById('live-ticker');
  var content = document.getElementById('ticker-content');
  if (!ticker || !content) return;
  var today = new Date().toISOString().slice(0,10);
  var show = live.length > 0 ? live : matches.filter(function(m) { return m.match_date && m.match_date.startsWith(today); });
  if (show.length === 0) { ticker.style.display = 'none'; return; }
  ticker.style.display = 'flex';
  var items = show.map(function(m) {
    var s1 = m.team1?.name || m.team1?.school?.name || '?';
    var s2 = m.team2?.name || m.team2?.school?.name || '?';
    return '<span class="ticker-item">' +
      Utils.sportIcon(m.sport) + ' ' + Utils.truncate(s1,14) +
      ' <span class="ticker-score">' + (m.team1_score??0) + '-' + (m.team2_score??0) + '</span> ' +
      Utils.truncate(s2,14) +
    '</span>';
  }).join('');
  content.innerHTML = items + items; // duplicated for seamless loop
}

function _openTvMode(liveMatches, todayMatches) {
  var win = window.open('', '_blank', 'width=1280,height=720');
  if (!win) { Utils.toast('Permite ventanas emergentes para el modo TV', 'error'); return; }

  var showMatches = liveMatches.length > 0 ? liveMatches : todayMatches;
  var title = liveMatches.length > 0 ? 'EN VIVO' : 'PARTIDOS DE HOY';

  var cards = showMatches.map(function(m) {
    var s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
    var s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
    var live = m.status === 'live';
    return '<div style="background:' + (live ? 'rgba(0,255,136,0.08)' : 'rgba(16,22,40,0.9)') + ';border:1px solid ' + (live ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.06)') + ';border-radius:16px;padding:28px 24px;text-align:center;">' +
      '<div style="font-size:13px;color:#5A6480;margin-bottom:12px;">' + (m.sport||'') + ' · ' + (m.category||'') + ' · ' + (m.gender||'') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;">' +
        '<div style="font-size:22px;font-weight:600;color:#E8EDF5;">' + s1 + '</div>' +
        '<div style="font-family:Bebas Neue,sans-serif;font-size:64px;color:' + (live ? '#00FF88' : '#00D4FF') + ';line-height:1;letter-spacing:4px;">' + (m.team1_score??0) + ' — ' + (m.team2_score??0) + '</div>' +
        '<div style="font-size:22px;font-weight:600;color:#E8EDF5;">' + s2 + '</div>' +
      '</div>' +
      (live ? '<div style="margin-top:12px;font-size:12px;color:#00FF88;font-weight:700;">● EN VIVO</div>' : '<div style="margin-top:12px;font-size:12px;color:#5A6480;">' + (m.location||'') + '</div>') +
    '</div>';
  }).join('');

  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DATA GAMES — TV</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">' +
    '<style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}*{margin:0;padding:0;box-sizing:border-box}body{background:#050810;color:#E8EDF5;font-family:DM Sans,sans-serif;min-height:100vh;display:flex;flex-direction:column;padding:32px}h1{text-align:center;font-family:Bebas Neue,sans-serif;font-size:40px;letter-spacing:4px;color:#00D4FF;margin-bottom:8px}.subtitle{text-align:center;color:#5A6480;font-size:14px;margin-bottom:32px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:24px}</style></head>' +
    '<body><h1>DATA GAMES — BIG GAMES 2026</h1><p class="subtitle">' + title + '</p>' +
    '<div class="grid">' + (cards || '<p style="text-align:center;color:#5A6480;grid-column:1/-1;padding:60px;">No hay partidos activos</p>') + '</div>' +
    '<script>setInterval(()=>location.reload(),30000)<\/script></body></html>');
  win.document.close();
}

window.Pages = Pages;
