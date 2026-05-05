/**
 * Pagina: Dashboard - Resumen del torneo en vivo
 */
const Pages = window.Pages || {};

Pages.Dashboard = async function(container, opts) {
  // Skeleton de partidos (mejor percepción que spinner)
  container.innerHTML = `
    <div style="padding:18px 0;">
      <div class="skel skel-line w-25" style="height:18px;margin-bottom:18px;"></div>
      ${Utils.skeleton('matches', 4)}
    </div>`;
  try {
    const [allMatches, schools, allSports] = await Promise.all([
      Api.getMatches(),
      Api.getSchools(),
      Api.getSports(),
    ]);

    // Excluir deportes individuales
    const matches = allMatches.filter(m => !Utils.isIndividualSport(m.sport));
    const sports = allSports.filter(s => !Utils.isIndividualSport(s.name));

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
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
      <!-- Header sección -->
      <div class="dg-section" style="margin-bottom:24px;">
        <div>
          <h2 class="dg-section-title">Dashboard</h2>
          <p class="dg-section-sub" style="margin-top:8px;">${App.currentTournament?.name || 'Big Games'} ${App.currentTournament?.year || '2026'}</p>
        </div>
        <button onclick="window._dashTv()"
          style="background:#000;color:#fff;border:1px solid rgba(255,255,255,.2);
                 font-weight:800;font-size:12px;padding:10px 18px;border-radius:4px;
                 text-transform:uppercase;letter-spacing:1px;cursor:pointer;
                 font-family:'Inter',sans-serif;transition:all .15s;"
          onmouseover="this.style.background='#fbbf24';this.style.color='#000';this.style.borderColor='#fbbf24'"
          onmouseout="this.style.background='#000';this.style.color='#fff';this.style.borderColor='rgba(255,255,255,.2)'">
          📺 Modo TV
        </button>
      </div>

      <!-- Stats banner -->
      <div class="dg-stats-banner" style="margin-bottom:32px;">
        <div class="dg-stat-item">
          <div class="dg-stat-num">${matches.length}</div>
          <div class="dg-stat-lbl">Total Partidos</div>
        </div>
        <div class="dg-stat-item">
          <div class="dg-stat-num red">${liveMatches.length}</div>
          <div class="dg-stat-lbl">${liveMatches.length > 0 ? '🔴 En Vivo' : 'En Vivo'}</div>
        </div>
        <div class="dg-stat-item">
          <div class="dg-stat-num green">${totalFinished}</div>
          <div class="dg-stat-lbl">Finalizados</div>
        </div>
        <div class="dg-stat-item">
          <div class="dg-stat-num purple">${schools.length}</div>
          <div class="dg-stat-lbl">Colegios</div>
        </div>
      </div>

      <!-- En Vivo Ahora -->
      ${liveMatches.length > 0 ? `
      <div style="margin-bottom:32px;">
        <div class="dg-section">
          <h3 class="dg-section-title red" style="font-size:24px;">
            <span class="dg-live-label" style="margin-right:10px;">En vivo</span>
            ${liveMatches.length} partido${liveMatches.length>1?'s':''}
          </h3>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;">
          ${liveMatches.map(m => _dgLiveCard(m)).join('')}
        </div>
      </div>` : ''}

      <!-- Grid principal: Hoy + Últimos resultados -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px;margin-bottom:32px;">

        <!-- Hoy -->
        <div>
          <div class="dg-section">
            <h3 class="dg-section-title amber" style="font-size:22px;">Hoy</h3>
            <span class="dg-section-sub">${todayMatches.length} partido${todayMatches.length===1?'':'s'}</span>
          </div>
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,.06);border-radius:8px;overflow:hidden;">
            ${todayMatches.length === 0
              ? `<div class="dg-empty"><div class="em-ic">📅</div><div class="em-tx">No hay partidos programados hoy</div></div>`
              : todayMatches.map(m => _dgMatchRow(m)).join('')}
          </div>
        </div>

        <!-- Últimos resultados -->
        <div>
          <div class="dg-section">
            <h3 class="dg-section-title green" style="font-size:22px;">Últimos resultados</h3>
            <span class="dg-section-sub">${recentFinished.length} partido${recentFinished.length===1?'':'s'}</span>
          </div>
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,.06);border-radius:8px;overflow:hidden;">
            ${recentFinished.length === 0
              ? `<div class="dg-empty"><div class="em-ic">📊</div><div class="em-tx">Aún no hay resultados</div></div>`
              : recentFinished.map(m => _dgMatchRow(m)).join('')}
          </div>
        </div>
      </div>

      <!-- Próximos partidos -->
      <div style="margin-bottom:32px;">
        <div class="dg-section">
          <h3 class="dg-section-title purple" style="font-size:22px;">Próximos partidos</h3>
          <span class="dg-section-sub">${upcomingMatches.length} programado${upcomingMatches.length===1?'':'s'}</span>
        </div>
        ${upcomingMatches.length === 0
          ? `<div class="dg-empty"><div class="em-ic">⏭️</div><div class="em-tx">No hay partidos próximos</div></div>`
          : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;">
              ${upcomingMatches.map(m => _dgMatchCard(m)).join('')}
             </div>`}
      </div>

      <!-- Deportes del torneo -->
      <div style="margin-bottom:32px;">
        <div class="dg-section">
          <h3 class="dg-section-title" style="font-size:22px;">Deportes del torneo</h3>
          <span class="dg-section-sub">${sports.length} cobertura${sports.length===1?'':'s'} activas</span>
        </div>
        <div class="dg-sport-grid">
          ${sports.map(s => `
            <div class="dg-sport-pill" onclick="App.navigate('calendar')">
              <div class="ic">${Utils.sportIcon(s.name)}</div>
              <div class="nm">${s.name}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- CTA stripe: ir a En Vivo / Calendar -->
      <div class="dg-cta-stripe">
        <div>
          <h3>¿Listo para gestionar el torneo?</h3>
          <p style="color:rgba(255,255,255,.85);font-size:13px;margin-top:4px;">
            Programa partidos, registra eventos en vivo y consulta estadísticas profesionales.
          </p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="dg-cta-stripe-btn" onclick="App.navigate('calendar')">📅 Calendario</button>
          <button class="dg-cta-stripe-btn" onclick="App.navigate('liveScoring')">🔴 En Vivo</button>
        </div>
      </div>
    `;

    // Update ticker
    _updateTicker(liveMatches, todayMatches);

    window._dashTv = () => _openTvMode(liveMatches, todayMatches);

  } catch (e) {
    container.innerHTML = `<div style="color:#ef4444;padding:32px;">Error: ${e.message}</div>`;
  }
};

// ── Fox Sports-style helpers ──────────────────────────────────────────────────

function _dgInitials(name) {
  return (name || '??').replace(/[^A-Za-z0-9 ]/g,'').split(' ')
    .filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('') || '??';
}

// Abreviación tipo "LAFC", "TOL" — máx 4 letras
function _dgShort(name) {
  if (!name) return '???';
  const clean = String(name).replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const w = words[0];
    if (w.length <= 4) return w.toUpperCase();
    // Si empieza con vocal+cons, quita vocales del medio para condensar
    return w.slice(0, 4).toUpperCase();
  }
  // Múltiples palabras: tomar iniciales de las primeras 4 palabras significativas
  const skip = new Set(['de','del','la','el','los','las','y','san','santa','colegio','col']);
  const meaningful = words.filter(w => !skip.has(w.toLowerCase()));
  const source = meaningful.length ? meaningful : words;
  return source.slice(0, 4).map(w => w[0]).join('').toUpperCase();
}

// Logo HTML: usa imagen si existe, si no las iniciales
function _dgLogoHtml(team, variant = '') {
  const url = team?.school?.logo_url || team?.logo_url;
  const name = team?.name || team?.school?.name || '';
  const initials = _dgInitials(name);
  if (url) {
    return `<div class="dg-mc-logo ${variant}" style="background:#fff;padding:2px;">
      <img src="${url}" alt="${name}" onerror="this.parentElement.innerHTML='${initials}';this.parentElement.style.background='';this.parentElement.style.padding='';">
    </div>`;
  }
  return `<div class="dg-mc-logo ${variant}">${initials}</div>`;
}

// Status line: "12'", "Final", "15:30", etc.
function _dgStatusLine(m) {
  if (m.status === 'live') {
    // Si tenemos minuto del partido, mostrarlo. Por ahora "EN VIVO".
    return { text: 'EN VIVO', cls: 'live' };
  }
  if (m.status === 'finished') return { text: 'FINAL', cls: 'finished' };
  // Programado: hora HH:MM
  const dt = m.match_date ? new Date(m.match_date) : null;
  if (dt) {
    const t = dt.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', hour12:false });
    const today = new Date().toDateString() === dt.toDateString();
    return { text: today ? t : dt.toLocaleDateString('es-CO',{day:'2-digit',month:'short'}).toUpperCase()+' '+t, cls:'scheduled' };
  }
  return { text: 'TBA', cls: 'scheduled' };
}

// Game notes / phase (lo que aparece abajo)
function _dgGameNotes(m) {
  const phase = (m.phase || '').toLowerCase();
  const gname = m.group_name || '';
  if (phase === 'playoff') return gname || 'Fase Final';
  if (phase === 'intergroup') return 'Intergrupo';
  if (gname) return `Grupo ${gname}`;
  return 'Fase de Grupos';
}

// Card principal estilo Fox Sports
function _dgFoxCard(m, opts = {}) {
  const t1Name = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
  const t2Name = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
  const sc1 = m.team1_score, sc2 = m.team2_score;
  const isLive = m.status === 'live';
  const isDone = m.status === 'finished';
  const isPending = !isLive && !isDone;
  const showScore = isLive || isDone;

  // Ganador (considerando penaltis)
  let win1 = false, win2 = false;
  if (isDone) {
    if (sc1 > sc2) win1 = true;
    else if (sc2 > sc1) win2 = true;
    else if (m.team1_penalties != null && m.team2_penalties != null) {
      win1 = m.team1_penalties > m.team2_penalties;
      win2 = m.team2_penalties > m.team1_penalties;
    }
  }
  const lose1 = isDone && win2, lose2 = isDone && win1;

  const status = _dgStatusLine(m);
  const target = isLive ? 'liveScoring' : isDone ? 'results' : 'calendar';
  const sport = m.sport || '';
  const cat = [m.gender, m.category].filter(Boolean).join(' · ');

  const penTxt1 = (m.team1_penalties != null) ? `<span class="pen">(${m.team1_penalties})</span>` : '';
  const penTxt2 = (m.team2_penalties != null) ? `<span class="pen">(${m.team2_penalties})</span>` : '';

  return `
    <div class="dg-match-card cursor ${isLive?'live':''}"
         onclick="App.navigate('${target}',{matchId:'${m.id}'})">
      <div class="dg-mc-head">
        <span class="dg-mc-league">
          <span class="ic">${Utils.sportIcon(sport)}</span>
          ${sport.toUpperCase()}${cat ? ' · '+cat : ''}
        </span>
        <span class="dg-mc-status ${status.cls}">${status.text}</span>
      </div>

      <div class="dg-mc-team ${win1?'winner':''} ${lose1?'loser':''}">
        ${_dgLogoHtml(m.team1)}
        <div class="dg-mc-team-info">
          <span class="dg-mc-short">${_dgShort(t1Name)}</span>
          <span class="dg-mc-long">${t1Name}</span>
        </div>
        <div class="dg-mc-score ${isPending?'dim':''}">
          ${showScore ? sc1 : '–'}${penTxt1}
        </div>
      </div>

      <div class="dg-mc-team ${win2?'winner alt':''} ${lose2?'loser':''}">
        ${_dgLogoHtml(m.team2, 'alt')}
        <div class="dg-mc-team-info">
          <span class="dg-mc-short">${_dgShort(t2Name)}</span>
          <span class="dg-mc-long">${t2Name}</span>
        </div>
        <div class="dg-mc-score ${isPending?'dim':''}">
          ${showScore ? sc2 : '–'}${penTxt2}
        </div>
      </div>

      <div class="dg-mc-foot">
        <span class="gn">${_dgGameNotes(m)}</span>
        <span class="vn">📍 ${m.location || 'Sin escenario'}</span>
      </div>
    </div>`;
}

// Backwards-compatible aliases
function _dgLiveCard(m)  { return _dgFoxCard(m); }
function _dgMatchCard(m) { return _dgFoxCard(m); }

function _dgMatchRow(m) {
  const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
  const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
  const sc1 = m.team1_score ?? 0;
  const sc2 = m.team2_score ?? 0;
  const isLive = m.status === 'live';
  const isDone = m.status === 'finished';
  const win1 = isDone && sc1 > sc2, win2 = isDone && sc2 > sc1;
  const target = isLive ? 'liveScoring' : isDone ? 'results' : 'calendar';

  // Hora compacta o LIVE
  const dt = m.match_date ? new Date(m.match_date) : null;
  const timeLabel = isLive ? 'LIVE' : dt ? dt.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false}) : '--:--';

  return `
    <div class="dg-match-row" onclick="App.navigate('${target}',{matchId:'${m.id}'})">
      <div class="dg-mr-time ${isLive?'live':''}">${timeLabel}</div>
      <div class="dg-mr-teams">
        <div class="dg-mr-team">
          <span class="dg-mr-team-name ${win1?'win':win2?'loss':''}">${Utils.truncate(s1,22)}</span>
          <span class="dg-mr-team-score ${win1?'win':win2?'loss':''}">${isDone||isLive?sc1:''}</span>
        </div>
        <div class="dg-mr-team">
          <span class="dg-mr-team-name ${win2?'win':win1?'loss':''}">${Utils.truncate(s2,22)}</span>
          <span class="dg-mr-team-score ${win2?'win':win1?'loss':''}">${isDone||isLive?sc2:''}</span>
        </div>
      </div>
      <div class="dg-mr-meta">${Utils.sportIcon(m.sport)} ${(m.sport||'').slice(0,8)}</div>
    </div>`;
}

// ── Existing helpers (retained) ───────────────────────────────────────────────

function _liveCard(m) {
  const s1 = m.team1?.name || m.team1?.school?.name || 'Local';
  const s2 = m.team2?.name || m.team2?.school?.name || 'Visitante';
  return `
    <div style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.3);
                border-radius:12px;padding:16px;cursor:pointer;"
         onclick="App.navigate('liveScoring',{matchId:'${m.id}'})">
      <div style="font-size:11px;color:var(--color-muted);margin-bottom:10px;">
        ${Utils.sportIcon(m.sport)} ${m.sport} &bull; ${m.gender||''} &bull; ${m.category||''}
      </div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
        <div style="font-weight:700;font-size:14px;color:var(--color-text);text-align:right;">${Utils.truncate(s1,18)}</div>
        <div class="font-display" style="font-size:36px;color:#f87171;text-align:center;padding:0 8px;letter-spacing:2px;">${m.team1_score??0} - ${m.team2_score??0}</div>
        <div style="font-weight:700;font-size:14px;color:var(--color-text);text-align:left;">${Utils.truncate(s2,18)}</div>
      </div>
      <div style="text-align:center;margin-top:8px;">
        <span class="ds-badge ds-badge-live">EN VIVO</span>
      </div>
    </div>`;
}

function _dashMatchRow(m) {
  const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
  const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
  const statusClass = m.status === 'live' ? 'status-live' : m.status === 'finished' ? 'status-finished' : 'status-pending';
  const target = m.status === 'live' ? 'liveScoring' : m.status === 'finished' ? 'results' : 'calendar';
  const badgeClass = m.status === 'live' ? 'ds-badge-live' : m.status === 'finished' ? 'ds-badge-finished' : 'ds-badge-pending';
  const badgeLabel = m.status === 'live' ? 'LIVE' : m.status === 'finished' ? 'FIN' : 'PROG';
  return `
    <div class="ds-match-row ${statusClass}" onclick="App.navigate('${target}',{matchId:'${m.id}'})">
      <div class="ds-team left">${Utils.truncate(s1,18)}</div>
      <div class="ds-score">${m.team1_score??0} - ${m.team2_score??0}</div>
      <div class="ds-team right">${Utils.truncate(s2,18)}</div>
      <div class="ds-match-meta">
        <span>${Utils.sportIcon(m.sport)}</span>
        <span>${m.sport || ''}</span>
        <span>&bull;</span>
        <span>${Utils.formatDateTime(m.match_date)}</span>
        <span class="ds-badge ${badgeClass}">${badgeLabel}</span>
      </div>
    </div>`;
}

function _updateTicker(liveMatches, todayMatches) {
  const ticker = document.getElementById('live-ticker');
  const content = document.getElementById('ticker-content');
  if (!ticker || !content) return;

  const showMatches = liveMatches.length > 0 ? liveMatches : todayMatches.slice(0, 8);
  if (showMatches.length === 0) {
    ticker.style.display = 'none';
    return;
  }

  ticker.style.display = 'flex';
  const label = ticker.querySelector('.ds-ticker-label');
  if (label) label.textContent = liveMatches.length > 0 ? 'EN VIVO' : 'HOY';

  content.innerHTML = showMatches.map(m => {
    const s1 = m.team1?.name || m.team1?.school?.name || '?';
    const s2 = m.team2?.name || m.team2?.school?.name || '?';
    const icon = Utils.sportIcon(m.sport);
    return `<span>${icon} ${Utils.truncate(s1,12)} ${m.team1_score??0} - ${m.team2_score??0} ${Utils.truncate(s2,12)}</span>`;
  }).join('');
}

function _openTvMode(liveMatches, todayMatches) {
  const win = window.open('', '_blank', 'width=1280,height=720');
  if (!win) { Utils.toast('Permite ventanas emergentes para el modo TV', 'error'); return; }

  const showMatches = liveMatches.length > 0 ? liveMatches : todayMatches;
  const isLive = liveMatches.length > 0;

  const _tvCard = (m) => {
    const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
    const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
    const logo1 = m.team1?.school?.logo_url || m.team1?.logo_url || '';
    const logo2 = m.team2?.school?.logo_url || m.team2?.logo_url || '';
    const live = m.status === 'live';
    const finished = m.status === 'finished';
    const sc1 = m.team1_score ?? 0;
    const sc2 = m.team2_score ?? 0;
    const sportIcon = {'futbol':'&#9917;','fútbol':'&#9917;','baloncesto':'&#127936;','voleibol':'&#127791;','basketball':'&#127936;'}[m.sport?.toLowerCase()] || '&#127941;';

    const logoEl = (url, name) => {
      const initials = (name || '??').slice(0,2).toUpperCase();
      if (url) return `<img src="${url}" style="width:56px;height:56px;border-radius:50%;object-fit:contain;background:rgba(255,255,255,0.1);padding:4px;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);display:none;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:white;">${initials}</div>`;
      return `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:white;">${initials}</div>`;
    };

    const borderColor = live ? '#dc2626' : finished ? '#059669' : 'rgba(99,102,241,0.3)';
    const glowColor = live ? 'rgba(220,38,38,0.2)' : finished ? 'rgba(5,150,105,0.1)' : 'rgba(99,102,241,0.05)';
    const scoreColor = live ? '#ff4444' : finished ? '#00FF88' : '#00D4FF';

    return `<div class="tv-card" style="background:linear-gradient(145deg,rgba(15,23,42,0.95),rgba(30,41,59,0.85));border:2px solid ${borderColor};border-radius:20px;padding:28px 32px;position:relative;overflow:hidden;box-shadow:0 8px 32px ${glowColor};">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${borderColor},transparent);"></div>
      ${live ? '<div class="live-dot" style="position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:#dc2626;animation:pulse 1.2s infinite;display:inline-block;"></span><span style="font-size:11px;font-weight:800;color:#dc2626;letter-spacing:2px;">LIVE</span></div>' : ''}
      ${finished ? '<div style="position:absolute;top:16px;right:16px;background:rgba(5,150,105,0.2);border:1px solid rgba(5,150,105,0.4);border-radius:6px;padding:2px 10px;font-size:10px;font-weight:700;color:#34d399;letter-spacing:1px;">FINAL</div>' : ''}
      <div style="text-align:center;margin-bottom:16px;">
        <span style="font-size:16px;margin-right:6px;">${sportIcon}</span>
        <span style="font-size:12px;color:#94a3b8;font-weight:500;letter-spacing:1px;text-transform:uppercase;">${m.sport || ''} &middot; ${m.category || ''} &middot; ${m.gender || ''}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;">
        <div style="text-align:center;">
          <div style="display:flex;justify-content:center;margin-bottom:10px;">${logoEl(logo1, s1)}</div>
          <div style="font-size:17px;font-weight:800;color:#e2e8f0;line-height:1.2;">${s1}</div>
        </div>
        <div style="text-align:center;position:relative;">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:72px;color:${scoreColor};line-height:1;letter-spacing:6px;text-shadow:0 0 30px ${glowColor};">${sc1} - ${sc2}</div>
          ${m.location ? `<div style="font-size:11px;color:#64748b;margin-top:6px;">${m.location}</div>` : ''}
        </div>
        <div style="text-align:center;">
          <div style="display:flex;justify-content:center;margin-bottom:10px;">${logoEl(logo2, s2)}</div>
          <div style="font-size:17px;font-weight:800;color:#e2e8f0;line-height:1.2;">${s2}</div>
        </div>
      </div>
    </div>`;
  };

  const cards = showMatches.map(m => _tvCard(m)).join('');

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>DATA GAMES - Modo TV</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;800&family=Space+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
  @keyframes slideIn { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  @keyframes tickerScroll { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
  * { margin:0;padding:0;box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  body {
    background:#050810;color:#f1f5f9;font-family:'DM Sans',system-ui,sans-serif;
    min-height:100vh;padding-bottom:50px;
  }
  body::before {
    content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
    background:
      radial-gradient(ellipse 60% 50% at 20% 20%, rgba(30,64,175,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 80% 80%, rgba(99,102,241,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 50% 50% at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 50%);
  }
  .tv-header {
    position:relative;z-index:1;text-align:center;padding:28px 40px 20px;
    background:linear-gradient(180deg,rgba(5,8,16,0.9) 0%,transparent 100%);
  }
  .tv-header h1 {
    font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:8px;
    background:linear-gradient(135deg,#00D4FF 0%,#6366f1 50%,#00D4FF 100%);
    background-size:200% auto;animation:shimmer 4s linear infinite;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    background-clip:text;
  }
  .tv-header .tv-status {
    display:inline-flex;align-items:center;gap:8px;margin-top:6px;
    padding:4px 16px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:2px;
  }
  .tv-status-live { background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);color:#f87171; }
  .tv-status-today { background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);color:#a5b4fc; }
  .tv-clock {
    position:absolute;right:40px;top:50%;transform:translateY(-50%);
    font-family:'Space Mono',monospace;font-size:28px;color:rgba(0,212,255,0.6);font-weight:700;
  }
  .tv-body {
    position:relative;z-index:1;padding:10px 40px 20px;
  }
  .tv-grid {
    display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:20px;
    width:100%;max-width:1400px;margin:0 auto;
  }
  .tv-card { animation:slideIn 0.5s ease-out backwards; }
  .tv-card:nth-child(1){animation-delay:0s}.tv-card:nth-child(2){animation-delay:0.1s}
  .tv-card:nth-child(3){animation-delay:0.2s}.tv-card:nth-child(4){animation-delay:0.3s}
  .tv-card:nth-child(5){animation-delay:0.4s}.tv-card:nth-child(6){animation-delay:0.5s}
  .tv-ticker {
    position:fixed;bottom:0;left:0;right:0;z-index:10;
    background:linear-gradient(90deg,#0a0f1e,#111827,#0a0f1e);
    border-top:1px solid rgba(99,102,241,0.2);padding:10px 0;overflow:hidden;
    display:flex;align-items:center;
  }
  .tv-ticker-label {
    flex-shrink:0;background:linear-gradient(135deg,#1e40af,#3b82f6);padding:4px 14px;
    font-size:11px;font-weight:800;letter-spacing:2px;color:white;margin-right:16px;
    border-radius:0 6px 6px 0;
  }
  .tv-ticker-track { flex:1;overflow:hidden;white-space:nowrap; }
  .tv-ticker-content {
    display:inline-block;animation:tickerScroll 30s linear infinite;
    font-size:13px;color:#94a3b8;font-weight:500;
  }
  .tv-ticker-content span { margin-right:40px; }
  .tv-empty {
    grid-column:1/-1;text-align:center;padding:80px 20px;
    font-family:'Bebas Neue',sans-serif;font-size:32px;color:#334155;letter-spacing:4px;
  }
</style>
</head>
<body>
  <div class="tv-header">
    <h1>DATA GAMES 2026</h1>
    <div>
      <span class="tv-status ${isLive ? 'tv-status-live' : 'tv-status-today'}">
        ${isLive ? '<span style="width:8px;height:8px;border-radius:50%;background:#dc2626;animation:pulse 1.2s infinite;display:inline-block;"></span> EN VIVO' : 'PARTIDOS DE HOY'}
      </span>
    </div>
    <div class="tv-clock" id="tv-clock"></div>
  </div>
  <div class="tv-body">
    <div class="tv-grid" id="matches-grid">
      ${cards || '<div class="tv-empty">NO HAY PARTIDOS ACTIVOS</div>'}
    </div>
  </div>
  <div class="tv-ticker">
    <div class="tv-ticker-label">BIG GAMES</div>
    <div class="tv-ticker-track">
      <div class="tv-ticker-content" id="tv-ticker-text"></div>
    </div>
  </div>
  <script>
    // Clock
    const clockEl = document.getElementById('tv-clock');
    const updateClock = () => { clockEl.textContent = new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Bogota'}); };
    updateClock(); setInterval(updateClock, 1000);

    // Ticker
    const updateTicker = (matches) => {
      const el = document.getElementById('tv-ticker-text');
      if (!el) return;
      const items = matches.map(m => {
        const s1 = m.team1?.name || m.team1?.school?.name || '?';
        const s2 = m.team2?.name || m.team2?.school?.name || '?';
        const icons = {'futbol':'\\u26BD','f\\u00FAtbol':'\\u26BD','baloncesto':'\\uD83C\\uDFC0','voleibol':'\\uD83C\\uDFD0'};
        const icon = icons[m.sport?.toLowerCase()] || '\\uD83C\\uDFC5';
        return icon + ' ' + s1 + ' ' + (m.team1_score??0) + ' - ' + (m.team2_score??0) + ' ' + s2 + (m.status==='live' ? ' \\uD83D\\uDD34' : '');
      });
      const text = items.join('\\u2003\\u2003\\u2003|\\u2003\\u2003\\u2003');
      el.innerHTML = '<span>' + text + '</span><span>' + text + '</span>';
    };
    updateTicker(${JSON.stringify(showMatches)});

    // Sport icon helper
    const sportIcon = (s) => {
      const icons = {'futbol':'&#9917;','fútbol':'&#9917;','baloncesto':'&#127936;','voleibol':'&#127791;'};
      return icons[(s||'').toLowerCase()] || '&#127941;';
    };

    // Logo helper
    const logoEl = (url, name) => {
      const ini = (name||'??').slice(0,2).toUpperCase();
      if (url) return '<img src="'+url+'" style="width:56px;height:56px;border-radius:50%;object-fit:contain;background:rgba(255,255,255,0.1);padding:4px;" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\';"><div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);display:none;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:white;">'+ini+'</div>';
      return '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:white;">'+ini+'</div>';
    };

    const fetchAndUpdate = async () => {
      try {
        const r = await fetch('/api/matches/?');
        const all = await r.json();
        const live = all.filter(m => m.status === 'live');
        const today = new Date().toISOString().slice(0,10);
        const todayM = all.filter(m => m.match_date && m.match_date.startsWith(today)).sort((a,b) => new Date(a.match_date)-new Date(b.match_date));
        const show = live.length > 0 ? live : todayM;
        const isLiveNow = live.length > 0;

        const statusEl = document.querySelector('.tv-status');
        if (statusEl) {
          statusEl.className = 'tv-status ' + (isLiveNow ? 'tv-status-live' : 'tv-status-today');
          statusEl.innerHTML = isLiveNow
            ? '<span style="width:8px;height:8px;border-radius:50%;background:#dc2626;animation:pulse 1.2s infinite;display:inline-block;"></span> EN VIVO'
            : 'PARTIDOS DE HOY';
        }

        document.getElementById('matches-grid').innerHTML = show.length === 0
          ? '<div class="tv-empty">NO HAY PARTIDOS ACTIVOS</div>'
          : show.map((m, i) => {
              const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
              const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
              const l1 = m.team1?.school?.logo_url || m.team1?.logo_url || '';
              const l2 = m.team2?.school?.logo_url || m.team2?.logo_url || '';
              const lv = m.status === 'live';
              const fin = m.status === 'finished';
              const bc = lv ? '#dc2626' : fin ? '#059669' : 'rgba(99,102,241,0.3)';
              const gc = lv ? 'rgba(220,38,38,0.2)' : fin ? 'rgba(5,150,105,0.1)' : 'rgba(99,102,241,0.05)';
              const sc = lv ? '#ff4444' : fin ? '#00FF88' : '#00D4FF';
              return '<div class="tv-card" style="background:linear-gradient(145deg,rgba(15,23,42,0.95),rgba(30,41,59,0.85));border:2px solid '+bc+';border-radius:20px;padding:28px 32px;position:relative;overflow:hidden;box-shadow:0 8px 32px '+gc+';animation-delay:'+i*0.1+'s;"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,'+bc+',transparent);"></div>'
                + (lv ? '<div style="position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:#dc2626;animation:pulse 1.2s infinite;display:inline-block;"></span><span style="font-size:11px;font-weight:800;color:#dc2626;letter-spacing:2px;">LIVE</span></div>' : '')
                + (fin ? '<div style="position:absolute;top:16px;right:16px;background:rgba(5,150,105,0.2);border:1px solid rgba(5,150,105,0.4);border-radius:6px;padding:2px 10px;font-size:10px;font-weight:700;color:#34d399;letter-spacing:1px;">FINAL</div>' : '')
                + '<div style="text-align:center;margin-bottom:16px;"><span style="font-size:16px;margin-right:6px;">'+sportIcon(m.sport)+'</span><span style="font-size:12px;color:#94a3b8;font-weight:500;letter-spacing:1px;text-transform:uppercase;">'+(m.sport||'')+' &middot; '+(m.category||'')+' &middot; '+(m.gender||'')+'</span></div>'
                + '<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;">'
                + '<div style="text-align:center;"><div style="display:flex;justify-content:center;margin-bottom:10px;">'+logoEl(l1,s1)+'</div><div style="font-size:17px;font-weight:800;color:#e2e8f0;line-height:1.2;">'+s1+'</div></div>'
                + '<div style="text-align:center;"><div style="font-family:Bebas Neue,sans-serif;font-size:72px;color:'+sc+';line-height:1;letter-spacing:6px;text-shadow:0 0 30px '+gc+';">'+(m.team1_score??0)+' - '+(m.team2_score??0)+'</div>'+(m.location ? '<div style="font-size:11px;color:#64748b;margin-top:6px;">'+m.location+'</div>' : '')+'</div>'
                + '<div style="text-align:center;"><div style="display:flex;justify-content:center;margin-bottom:10px;">'+logoEl(l2,s2)+'</div><div style="font-size:17px;font-weight:800;color:#e2e8f0;line-height:1.2;">'+s2+'</div></div>'
                + '</div></div>';
            }).join('');
        updateTicker(show);
      } catch(e) { console.warn('Error actualizando', e); }
    };
    setInterval(fetchAndUpdate, 30000);
  <\/script>
</body>
</html>`);
  win.document.close();
}

window.Pages = Pages;
