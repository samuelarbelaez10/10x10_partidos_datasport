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

    container.innerHTML = `
      <!-- Header fila superior -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 class="text-3xl font-black" style="color:#60a5fa;">🏠 Dashboard</h2>
          <p class="text-gray-400 mt-1">Big Games 2026 — actualización automática cada 30s</p>
        </div>
        <button onclick="window._dashTv()" class="btn-ghost"
          style="font-size:14px;border-color:rgba(96,165,250,0.4);color:#93c5fd;">
          📺 Modo TV
        </button>
      </div>

      <!-- Stats rápidas -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;" class="ds-stats">
        <div class="card text-center" style="border-top:3px solid #3b82f6;">
          <div class="stat-number">${matches.length}</div>
          <div class="text-gray-400 mt-1 text-sm">Total Partidos</div>
        </div>
        <div class="card text-center" style="border-top:3px solid #dc2626;">
          <div class="stat-number" style="color:#dc2626;">${liveMatches.length}</div>
          <div class="text-gray-400 mt-1 text-sm">En Vivo</div>
          ${liveMatches.length > 0 ? `<div style="font-size:10px;color:#dc2626;margin-top:4px;animation:pulse 1.5s infinite;">● LIVE</div>` : ''}
        </div>
        <div class="card text-center" style="border-top:3px solid #10b981;">
          <div class="stat-number" style="color:#10b981;">${totalFinished}</div>
          <div class="text-gray-400 mt-1 text-sm">Finalizados</div>
        </div>
        <div class="card text-center" style="border-top:3px solid #f59e0b;">
          <div class="stat-number" style="color:#f59e0b;">${schools.length}</div>
          <div class="text-gray-400 mt-1 text-sm">Colegios</div>
        </div>
      </div>

      <!-- En Vivo (destacado si hay partidos) -->
      ${liveMatches.length > 0 ? `
      <div class="card mb-6" style="border:2px solid #dc2626;background:rgba(220,38,38,0.05);">
        <h3 class="text-xl font-bold mb-4" style="color:#dc2626;display:flex;align-items:center;gap:10px;">
          <span style="animation:pulse 1.2s infinite;">🔴</span> En Vivo Ahora
          <span style="font-size:12px;font-weight:600;background:#dc2626;color:white;padding:2px 8px;border-radius:10px;">${liveMatches.length} partido${liveMatches.length > 1 ? 's' : ''}</span>
        </h3>
        <div style="display:grid;gap:12px;${liveMatches.length > 1 ? 'grid-template-columns:repeat(auto-fit,minmax(260px,1fr));' : ''}">
          ${liveMatches.map(m => _liveCard(m)).join('')}
        </div>
      </div>` : ''}

      <!-- Grid principal -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">

        <!-- Hoy -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4" style="color:#f59e0b;">📅 Hoy (${todayMatches.length})</h3>
          ${todayMatches.length === 0
            ? '<p class="text-gray-400 text-sm">No hay partidos programados hoy</p>'
            : todayMatches.map(m => _dashMatchRow(m)).join('')}
        </div>

        <!-- Resultados recientes -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4" style="color:#10b981;">✅ Últimos Resultados</h3>
          ${recentFinished.length === 0
            ? '<p class="text-gray-400 text-sm">No hay resultados aún</p>'
            : recentFinished.map(m => _dashMatchRow(m)).join('')}
        </div>

        <!-- Próximos -->
        <div class="card" style="grid-column:1/-1;">
          <h3 class="text-xl font-bold mb-4" style="color:#60a5fa;">🗓️ Próximos Partidos</h3>
          ${upcomingMatches.length === 0
            ? '<p class="text-gray-400 text-sm">No hay partidos próximos</p>'
            : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
                ${upcomingMatches.map(m => _dashMatchRow(m)).join('')}
               </div>`}
        </div>
      </div>

      <!-- Deportes -->
      <div class="card mt-6">
        <h3 class="text-xl font-bold mb-4">🏅 Deportes del Torneo</h3>
        <div class="flex flex-wrap gap-3">
          ${sports.map(s => `
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                        border-radius:10px;padding:10px 16px;text-align:center;cursor:pointer;
                        transition:all 0.2s;"
                 onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                 onmouseout="this.style.background='rgba(255,255,255,0.05)'"
                 onclick="App.navigate('calendar')">
              <div style="font-size:24px;">${Utils.sportIcon(s.name)}</div>
              <div style="font-size:13px;margin-top:4px;color:#93c5fd;">${s.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    window._dashTv = () => _openTvMode(liveMatches, todayMatches);

  } catch (e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _liveCard(m) {
  const s1 = m.team1?.name || m.team1?.school?.name || 'Local';
  const s2 = m.team2?.name || m.team2?.school?.name || 'Visitante';
  return `
    <div style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.3);
                border-radius:12px;padding:16px;cursor:pointer;"
         onclick="App.navigate('liveScoring',{matchId:'${m.id}'})">
      <div style="font-size:11px;color:#94a3b8;margin-bottom:10px;">
        ${Utils.sportIcon(m.sport)} ${m.sport} &bull; ${m.gender||''} &bull; ${m.category||''}
      </div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
        <div style="font-weight:700;font-size:14px;color:#e2e8f0;text-align:right;">${Utils.truncate(s1,18)}</div>
        <div style="font-size:32px;font-weight:900;color:#f87171;text-align:center;padding:0 8px;">${m.team1_score??0}-${m.team2_score??0}</div>
        <div style="font-weight:700;font-size:14px;color:#e2e8f0;text-align:left;">${Utils.truncate(s2,18)}</div>
      </div>
      <div style="text-align:center;margin-top:8px;">
        <span style="font-size:10px;background:#dc2626;color:white;padding:2px 8px;border-radius:8px;animation:pulse 1.5s infinite;">🔴 EN VIVO</span>
      </div>
    </div>`;
}

function _dashMatchRow(m) {
  const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
  const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
  const statusDot = m.status === 'live' ? '🔴' : m.status === 'finished' ? '✅' : '🔵';
  const target = m.status === 'live' ? 'liveScoring' : m.status === 'finished' ? 'results' : 'calendar';
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;
                background:rgba(255,255,255,0.03);cursor:pointer;margin-bottom:6px;
                transition:background 0.15s;"
         onmouseover="this.style.background='rgba(255,255,255,0.07)'"
         onmouseout="this.style.background='rgba(255,255,255,0.03)'"
         onclick="App.navigate('${target}',{matchId:'${m.id}'})">
      <span style="font-size:12px;">${statusDot}</span>
      <span style="font-size:11px;color:#94a3b8;min-width:22px;">${Utils.sportIcon(m.sport)}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${Utils.truncate(s1,16)} <span style="color:#60a5fa;font-weight:900;">${m.team1_score??0}-${m.team2_score??0}</span> ${Utils.truncate(s2,16)}
        </div>
        <div style="font-size:11px;color:#64748b;">${Utils.formatDateTime(m.match_date)}</div>
      </div>
    </div>`;
}

function _openTvMode(liveMatches, todayMatches) {
  const win = window.open('', '_blank', 'width=1280,height=720');
  if (!win) { Utils.toast('Permite ventanas emergentes para el modo TV', 'error'); return; }

  const showMatches = liveMatches.length > 0 ? liveMatches : todayMatches;
  const title = liveMatches.length > 0 ? '🔴 EN VIVO' : '📅 PARTIDOS DE HOY';

  const cards = showMatches.map(m => {
    const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
    const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
    const live = m.status === 'live';
    return `
      <div style="background:${live ? 'rgba(220,38,38,0.15)' : 'rgba(30,41,59,0.8)'};
                  border:2px solid ${live ? '#dc2626' : '#334155'};
                  border-radius:16px;padding:28px 24px;text-align:center;">
        <div style="font-size:13px;color:#94a3b8;margin-bottom:12px;">${m.sport} · ${m.category||''} · ${m.gender||''}</div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;">
          <div style="font-size:22px;font-weight:800;color:#e2e8f0;">${s1}</div>
          <div style="font-size:64px;font-weight:900;color:${live ? '#f87171' : '#60a5fa'};line-height:1;">${m.team1_score??0} - ${m.team2_score??0}</div>
          <div style="font-size:22px;font-weight:800;color:#e2e8f0;">${s2}</div>
        </div>
        ${live ? `<div style="margin-top:12px;font-size:12px;color:#dc2626;font-weight:700;animation:pulse 1.2s infinite;">● EN VIVO</div>` : `<div style="margin-top:12px;font-size:12px;color:#94a3b8;">${m.location||''}</div>`}
      </div>`;
  }).join('');

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>DATA SPORT — Modo TV</title>
<style>
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
  * { margin:0;padding:0;box-sizing:border-box; }
  body { background:#0f172a;color:#f1f5f9;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;
         display:flex;flex-direction:column;padding:32px; }
  h1 { text-align:center;font-size:36px;font-weight:900;margin-bottom:8px;color:#60a5fa; }
  .subtitle { text-align:center;color:#64748b;font-size:14px;margin-bottom:32px; }
  .grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:24px; }
  .refresh-note { text-align:center;color:#475569;font-size:12px;margin-top:24px; }
</style>
</head>
<body>
  <h1>📺 DATA SPORT — Big Games 2026</h1>
  <p class="subtitle">${title} · actualiza automáticamente cada 30s</p>
  <div class="grid" id="matches-grid">${cards || '<p style="text-align:center;color:#64748b;grid-column:1/-1;padding:60px;">No hay partidos activos ahora</p>'}</div>
  <p class="refresh-note">Última actualización: ${new Date().toLocaleTimeString('es-CO')}</p>
  <script>
    const fetchAndUpdate = async () => {
      try {
        const r = await fetch('/api/matches/?');
        const all = await r.json();
        const live = all.filter(m => m.status === 'live');
        const today = new Date().toISOString().slice(0,10);
        const todayM = all.filter(m => m.match_date && m.match_date.startsWith(today));
        const show = live.length > 0 ? live : todayM;
        document.querySelector('.subtitle').textContent = (live.length > 0 ? '🔴 EN VIVO' : '📅 PARTIDOS DE HOY') + ' · actualiza automáticamente cada 30s';
        document.querySelector('.refresh-note').textContent = 'Última actualización: ' + new Date().toLocaleTimeString('es-CO');
        // simple reload de tarjetas
        document.getElementById('matches-grid').innerHTML = show.length === 0
          ? '<p style="text-align:center;color:#64748b;grid-column:1/-1;padding:60px;">No hay partidos activos ahora</p>'
          : show.map(m => {
              const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
              const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
              const lv = m.status === 'live';
              return '<div style="background:' + (lv?'rgba(220,38,38,0.15)':'rgba(30,41,59,0.8)') + ';border:2px solid '+(lv?'#dc2626':'#334155')+';border-radius:16px;padding:28px 24px;text-align:center;"><div style="font-size:13px;color:#94a3b8;margin-bottom:12px;">' + m.sport + ' · ' + (m.category||'') + ' · ' + (m.gender||'') + '</div><div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;"><div style="font-size:22px;font-weight:800;color:#e2e8f0;">' + s1 + '</div><div style="font-size:64px;font-weight:900;color:'+(lv?'#f87171':'#60a5fa')+';line-height:1;">' + (m.team1_score??0) + ' - ' + (m.team2_score??0) + '</div><div style="font-size:22px;font-weight:800;color:#e2e8f0;">' + s2 + '</div></div>' + (lv ? '<div style="margin-top:12px;font-size:12px;color:#dc2626;font-weight:700;animation:pulse 1.2s infinite;">● EN VIVO</div>' : '<div style="margin-top:12px;font-size:12px;color:#94a3b8;">' + (m.location||'') + '</div>') + '</div>';
            }).join('');
      } catch(e) { console.warn('Error actualizando', e); }
    };
    setInterval(fetchAndUpdate, 30000);
  <\/script>
</body>
</html>`);
  win.document.close();
}

window.Pages = Pages;
