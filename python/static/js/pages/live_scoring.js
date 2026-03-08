/**
 * Página: Live Scoring - Gestión de partidos en tiempo real
 */

// Eventos disponibles por deporte
const _LV_EVENTS = {
  'Fútbol': [
    { type: 'goal',        label: '⚽ Gol',           scores: true,  points: 1 },
    { type: 'yellow_card', label: '🟨 T. Amarilla',   scores: false, points: 0 },
    { type: 'red_card',    label: '🟥 T. Roja',       scores: false, points: 0 },
  ],
  'Fútbol 7': [
    { type: 'goal',        label: '⚽ Gol',           scores: true,  points: 1 },
    { type: 'yellow_card', label: '🟨 T. Amarilla',   scores: false, points: 0 },
    { type: 'red_card',    label: '🟥 T. Roja',       scores: false, points: 0 },
  ],
  'Baloncesto': [
    { type: 'canasta_1pt',   label: '🏀 +1 Tiro Libre', scores: true,  points: 1 },
    { type: 'canasta_2pts',  label: '🏀 +2 Canasta',    scores: true,  points: 2 },
    { type: 'canasta_3pts',  label: '🏀 +3 Triple',     scores: true,  points: 3 },
    { type: 'rebote',        label: '🏀 Rebote',         scores: false, points: 0 },
    { type: 'bloqueo',       label: '🚫 Bloqueo',        scores: false, points: 0 },
    { type: 'falta_tecnica', label: '❌ Falta Técnica',  scores: false, points: 0 },
  ],
  'Voleibol': [],
  'Softball': [
    { type: 'homerun', label: '🎾 Homerun', scores: true, points: 1 },
  ],
};

// Puntos que revierte al borrar un evento de score
const _SCORE_POINTS = {
  goal: 1, penalty: 1,
  canasta_1pt: 1, canasta_2pts: 2, canasta_3pts: 3,
  point_volleyball: 1, ace: 1,
  homerun: 1,
};

// Etiquetas para el historial de eventos
const _LV_LABELS = {
  goal:             '⚽ Gol',
  yellow_card:      '🟨 Tarjeta Amarilla',
  red_card:         '🟥 Tarjeta Roja',
  penalty:          '⏸️ Penal',
  assist_football:  '🎯 Asistencia',
  canasta_1pt:      '🏀 +1 Tiro Libre',
  canasta_2pts:     '🏀 +2 Canasta',
  canasta_3pts:     '🏀 +3 Triple',
  rebote:           '🏀 Rebote',
  bloqueo:          '🚫 Bloqueo',
  falta_tecnica:    '❌ Falta Técnica',
  point_volleyball: '🏐 Punto',
  ace:              '🎯 Ace',
  homerun:          '🎾 Homerun',
};

Pages.LiveScoring = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [liveMatches, allMatches, players] = await Promise.all([
      Api.getLiveMatches(),
      Api.getMatches(),
      Api.getPlayers(),
    ]);

    if (opts && opts.matchId) {
      await _lvDetail(container, opts.matchId, allMatches, players);
      return;
    }

    // ── Vista listado (solo partidos en vivo) ─────────────────────────────
    const sports     = [...new Set(liveMatches.map(m => m.sport).filter(Boolean))];
    const genders    = [...new Set(liveMatches.map(m => m.gender).filter(Boolean))];
    const categories = [...new Set(liveMatches.map(m => m.category).filter(Boolean))].sort();
    let fSport = '', fGender = '', fCategory = '';

    const getFiltered = () => {
      let f = liveMatches;
      if (fSport)    f = f.filter(m => m.sport === fSport);
      if (fGender)   f = f.filter(m => m.gender === fGender);
      if (fCategory) f = f.filter(m => m.category === fCategory);
      return f;
    };

    const renderList = () => {
      const el = document.getElementById('lv-list');
      if (!el) return;
      const filtered = getFiltered();
      el.innerHTML = filtered.length === 0
        ? `<div style="text-align:center;padding:60px 20px;">
             <div style="font-size:48px;margin-bottom:16px;">🔴</div>
             <p style="color:#64748b;font-size:16px;">No hay partidos en vivo ahora mismo</p>
             <p style="color:#334155;font-size:13px;margin-top:8px;">Los partidos aparecerán aquí cuando se inicien desde la gestión</p>
           </div>`
        : filtered.map(_lvCard).join('');
    };

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 class="text-3xl font-black" style="color:#dc2626;display:flex;align-items:center;gap:10px;">
              <span style="animation:pulse 1.2s infinite;">🔴</span> En Vivo
              ${liveMatches.length > 0 ? `<span style="font-size:14px;font-weight:600;background:#dc2626;color:white;padding:2px 10px;border-radius:12px;animation:pulse 1.2s infinite;">${liveMatches.length} activo${liveMatches.length > 1 ? 's' : ''}</span>` : ''}
            </h2>
            <p class="text-gray-400 mt-1" style="font-size:13px;">Partidos en curso · gestión en tiempo real</p>
          </div>
        </div>
        ${(sports.length > 1 || genders.length > 1 || categories.length > 1) ? Utils.wrapFilters(`
        <div class="card mt-3" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
          ${sports.length > 1 ? `<div style="flex:1;min-width:100px;">
            <label class="text-gray-400 text-sm">Deporte</label>
            <select id="lv-sport" class="input-field mt-1" onchange="window._lvFilter();Utils.updateFilterCount('lv-filters')">
              <option value="">Todos</option>
              ${sports.map(s => `<option value="${s}">${Utils.sportIcon(s)} ${s}</option>`).join('')}
            </select>
          </div>` : ''}
          ${genders.length > 1 ? `<div style="flex:1;min-width:80px;">
            <label class="text-gray-400 text-sm">Género</label>
            <select id="lv-gender" class="input-field mt-1" onchange="window._lvFilter();Utils.updateFilterCount('lv-filters')">
              <option value="">Todos</option>
              ${genders.map(g => `<option value="${g}">${g}</option>`).join('')}
            </select>
          </div>` : ''}
          ${categories.length > 1 ? `<div style="flex:1;min-width:90px;">
            <label class="text-gray-400 text-sm">Categoría</label>
            <select id="lv-category" class="input-field mt-1" onchange="window._lvFilter();Utils.updateFilterCount('lv-filters')">
              <option value="">Todas</option>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>` : ''}
        </div>
        `, 'lv-filters') : ''}
      </div>
      <div id="lv-list"></div>

      ${App.canEditMatches() ? `
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="color:#334155;font-size:13px;margin-bottom:12px;">
          Para iniciar un partido ve al <strong style="color:#60a5fa;">Calendario</strong> y haz clic en el partido programado.
        </p>
      </div>` : ''}
    `;

    window._lvFilter = () => {
      fSport    = document.getElementById('lv-sport')?.value    || '';
      fGender   = document.getElementById('lv-gender')?.value   || '';
      fCategory = document.getElementById('lv-category')?.value || '';
      renderList();
    };

    renderList();
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _lvCard(m) {
  const s1     = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
  const s2     = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
  const border = m.status === 'live' ? '#dc2626' : m.status === 'finished' ? '#6b7280' : '#3b82f6';
  return `
    <div class="card mb-4" style="border-left:4px solid ${border};">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;color:#94a3b8;">${Utils.sportIcon(m.sport)} ${m.sport} &bull; ${m.gender || ''} &bull; ${m.category || ''}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <span style="font-weight:700;font-size:14px;">${Utils.truncate(s1, 18)}</span>
            <span style="font-weight:900;font-size:22px;color:#60a5fa;">${m.team1_score ?? 0} - ${m.team2_score ?? 0}</span>
            <span style="font-weight:700;font-size:14px;">${Utils.truncate(s2, 18)}</span>
          </div>
          <div style="margin-top:6px;font-size:11px;color:#64748b;">📅 ${Utils.formatDateTime(m.match_date)} &bull; 📍 ${m.location || ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${Utils.statusBadge(m.status)}
          ${App.canEditMatches()
            ? `<button class="btn-primary" style="font-size:13px;" onclick="App.navigate('liveScoring',{matchId:'${m.id}'})">Gestionar →</button>`
            : `<button class="btn-ghost" style="font-size:13px;" onclick="App.navigate('liveScoring',{matchId:'${m.id}'})">Ver →</button>`
          }
        </div>
      </div>
    </div>`;
}

async function _lvDetail(container, matchId, allMatches, allPlayers) {
  container.innerHTML = Utils.spinner();
  try {
    let match = allMatches.find(m => m.id === matchId);
    if (!match) match = await Api.getMatch(matchId);
    if (!match) {
      container.innerHTML = '<div class="text-red-400 p-8">Partido no encontrado</div>';
      return;
    }

    let events = [];
    try { events = await Api.getEvents(matchId); } catch(e) {}

    const sport     = match.sport || '';
    const sportEvts = _LV_EVENTS[sport] || [];
    const isEditor  = App.isEditor();
    const canManage = App.canEditMatches();  // editor o árbitro: puede iniciar/finalizar/marcar
    const canScore  = canManage;  // puede registrar eventos
    const s1 = match.team1?.name || match.team1?.school?.name || 'Equipo Local';
    const s2 = match.team2?.name || match.team2?.school?.name || 'Equipo Visitante';

    const render = () => {
      const sc1    = match.team1_score ?? 0;
      const sc2    = match.team2_score ?? 0;
      const border = match.status === 'live' ? '#dc2626' : match.status === 'finished' ? '#6b7280' : '#1e40af';

      container.innerHTML = `
        <div class="mb-4">
          <button class="btn-ghost" onclick="App.navigate('liveScoring')">← Volver</button>
        </div>

        <!-- Marcador principal -->
        <div class="card mb-6" style="border:2px solid ${border};text-align:center;">
          ${Utils.statusBadge(match.status)}
          <div style="font-size:13px;color:#94a3b8;margin-top:6px;">
            ${Utils.sportIcon(sport)} ${sport} &bull; ${match.gender || ''} &bull; ${match.category || ''}
          </div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">
            📍 ${match.location || ''} &bull; 📅 ${Utils.formatDateTime(match.match_date)}
          </div>

          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:24px;flex-wrap:wrap;">
            <div style="text-align:center;min-width:80px;">
              <div style="font-weight:800;font-size:16px;">${s1}</div>
              ${canManage && match.status === 'live' ? (sport === 'Voleibol' ? `
                <input type="hidden" id="sc1" value="${sc1}">
              ` : `
                <input type="number" id="sc1" value="${sc1}" min="0"
                  style="width:64px;margin-top:10px;text-align:center;font-size:18px;
                         padding:6px;background:#1e293b;border:1px solid #334155;
                         border-radius:8px;color:white;">
              `) : ''}
            </div>
            <div style="font-size:48px;font-weight:900;color:#60a5fa;line-height:1;flex-shrink:0;" class="score-display">${sc1} - ${sc2}</div>
            <div style="text-align:center;min-width:80px;">
              <div style="font-weight:800;font-size:16px;">${s2}</div>
              ${canManage && match.status === 'live' ? (sport === 'Voleibol' ? `
                <input type="hidden" id="sc2" value="${sc2}">
              ` : `
                <input type="number" id="sc2" value="${sc2}" min="0"
                  style="width:64px;margin-top:10px;text-align:center;font-size:18px;
                         padding:6px;background:#1e293b;border:1px solid #334155;
                         border-radius:8px;color:white;">
              `) : ''}
            </div>
          </div>

          ${canScore && match.status === 'live' && sport === 'Voleibol' ? `
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.07);">
            <p style="font-size:12px;color:#94a3b8;text-align:center;margin-bottom:12px;">
              🏐 Selecciona el resultado (sets ganados):
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:380px;margin:0 auto;">
              ${[[2,0,s1],[2,1,s1],[1,2,s2],[0,2,s2]].map(([a,b,winner]) => {
                const setStr = a > b ? a+'-'+b : b+'-'+a;
                const isSel  = sc1 === a && sc2 === b;
                return `<button id="vb-${a}-${b}" onclick="window._volySelect(${a},${b})"
                  style="padding:10px 8px;border-radius:8px;font-size:13px;font-weight:600;
                         cursor:pointer;color:#e2e8f0;text-align:center;
                         border:2px solid ${isSel ? '#60a5fa' : '#334155'};
                         background:${isSel ? 'rgba(96,165,250,0.15)' : 'rgba(30,41,59,0.8)'};">
                  ${setStr} &bull; ${Utils.truncate(winner, 14)}
                </button>`;
              }).join('')}
            </div>
          </div>
          ` : ''}

          ${canManage ? `
            <div style="display:flex;justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap;">
              ${match.status === 'pending' ? `
                <button class="btn-primary" onclick="window._lvStart()">▶️ Iniciar Partido</button>
              ` : ''}
              ${match.status === 'live' ? `
                ${sport !== 'Voleibol' ? `<button class="btn-secondary" onclick="window._lvSaveScore()">💾 Guardar Marcador</button>` : ''}
                <button class="btn-danger" onclick="window._lvFinish()">🏁 Finalizar Partido</button>
              ` : ''}
            </div>
          ` : ''}
        </div>

        ${canScore && match.status === 'live' && sportEvts.length > 0 ? `
        <!-- Botones de evento -->
        <div class="card mb-6">
          <h3 class="text-xl font-bold mb-4">⚡ Registrar Evento</h3>
          <div style="display:flex;gap:${App.isArbitro() ? '14px' : '10px'};flex-wrap:wrap;">
            ${sportEvts.map(ev => `
              <button class="btn-secondary"
                style="${App.isArbitro() ? 'font-size:20px;padding:18px 28px;min-width:150px;border-radius:14px;font-weight:700;' : ''}"
                onclick="window._lvStartEvent('${ev.type}','${ev.label}',${ev.scores},${ev.points||0})">
                ${ev.label}
              </button>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Historial de eventos -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4">📋 Historial de Eventos</h3>
          <div id="lv-ev-list">
            ${_lvTimeline(events, allPlayers, isEditor, match)}
          </div>
        </div>
      `;
    };

    render();

    // ── Handlers ──────────────────────────────────────────────────────────────

    window._lvStart = async () => {
      if (!confirm('¿Iniciar el partido?')) return;
      try {
        await Api.updateMatch(matchId, { status: 'live' });
        match.status = 'live';
        Utils.toast('Partido iniciado');
        render();
      } catch(e) { Utils.toast(e.message, 'error'); }
    };

    window._volySelect = (t1, t2) => {
      const el1 = document.getElementById('sc1');
      const el2 = document.getElementById('sc2');
      if (el1) el1.value = t1;
      if (el2) el2.value = t2;
      [[2,0],[2,1],[1,2],[0,2]].forEach(([a,b]) => {
        const btn = document.getElementById(`vb-${a}-${b}`);
        if (!btn) return;
        const sel = (a === t1 && b === t2);
        btn.style.borderColor = sel ? '#60a5fa' : '#334155';
        btn.style.background  = sel ? 'rgba(96,165,250,0.15)' : 'rgba(30,41,59,0.8)';
      });
    };

    window._lvFinish = async () => {
      if (!confirm('¿Finalizar el partido? Se actualizará la tabla de posiciones.')) return;
      try {
        const sc1 = parseInt(document.getElementById('sc1')?.value ?? match.team1_score ?? 0);
        const sc2 = parseInt(document.getElementById('sc2')?.value ?? match.team2_score ?? 0);

        if (sport === 'Voleibol') {
          const valid = (sc1 === 2 && sc2 === 0) || (sc1 === 2 && sc2 === 1)
                     || (sc1 === 1 && sc2 === 2) || (sc1 === 0 && sc2 === 2);
          if (!valid) {
            Utils.toast('Selecciona un resultado válido: 2-0 ó 2-1', 'error');
            return;
          }
        }
        if ((sport === 'Baloncesto' || sport === 'Softball') && sc1 === sc2) {
          Utils.toast(`En ${sport} no puede haber empates.`, 'error');
          return;
        }

        // Una sola llamada con status + scores para que el trigger vea los scores correctos
        await Api.updateMatch(matchId, { status: 'finished', team1_score: sc1, team2_score: sc2 });
        match.status = 'finished';
        match.team1_score = sc1;
        match.team2_score = sc2;

        Utils.toast('Partido finalizado');
        render();
      } catch(e) { Utils.toast(e.message || 'Error al finalizar', 'error'); }
    };

    window._lvSaveScore = async () => {
      try {
        const sc1 = parseInt(document.getElementById('sc1')?.value ?? 0);
        const sc2 = parseInt(document.getElementById('sc2')?.value ?? 0);
        await Api.updateMatch(matchId, { team1_score: sc1, team2_score: sc2 });
        match.team1_score = sc1;
        match.team2_score = sc2;
        Utils.toast('Marcador guardado');
        render();
      } catch(e) {
        Utils.toast(e.message || 'Error al guardar marcador', 'error');
      }
    };

    // Paso 1: seleccionar equipo
    window._lvStartEvent = (evType, evLabel, updatesScore, points) => {
      Utils.showModal(`
        <h3 class="text-xl font-bold mb-4">${evLabel}</h3>
        <p class="text-gray-400 mb-4">Selecciona el equipo:</p>
        <div style="display:grid;gap:10px;">
          <button class="btn-primary"
            onclick="window._lvPickPlayer('${evType}',${updatesScore},${points},'${match.team1_id}')">
            ${s1}
          </button>
          <button class="btn-secondary"
            onclick="window._lvPickPlayer('${evType}',${updatesScore},${points},'${match.team2_id}')">
            ${s2}
          </button>
        </div>
      `);
    };

    // Paso 2: seleccionar jugador
    window._lvPickPlayer = (evType, updatesScore, points, teamId) => {
      const teamPlayers = allPlayers.filter(p => p.team_id === teamId);
      const teamName    = teamId === match.team1_id ? s1 : s2;
      const noPlayers   = teamPlayers.length === 0;
      Utils.showModal(`
        <h3 class="text-xl font-bold mb-2">${_LV_LABELS[evType] || evType} — ${teamName}</h3>
        ${noPlayers ? `
          <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);
                      border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <p style="color:#fbbf24;font-size:13px;">⚠️ Este equipo no tiene jugadores registrados.</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:4px;">Ve a <strong>Registrar → Jugador</strong> para agregar jugadores al equipo.</p>
          </div>
        ` : `<p class="text-gray-400 text-sm mb-3">Selecciona el jugador:</p>`}
        <div style="display:grid;gap:8px;max-height:320px;overflow-y:auto;">
          <button class="btn-ghost"
            onclick="window._lvSaveEvent('${evType}',${updatesScore},${points},'${teamId}',null)">
            Sin jugador específico
          </button>
          ${teamPlayers.map(p => `
            <button class="btn-ghost"
              style="text-align:left;display:flex;align-items:center;gap:10px;"
              onclick="window._lvSaveEvent('${evType}',${updatesScore},${points},'${teamId}','${p.id}')">
              <span style="font-weight:700;color:#60a5fa;min-width:32px;">#${p.jersey_number ?? '?'}</span>
              <span>${p.full_name}</span>
            </button>
          `).join('')}
        </div>
      `);
    };

    // Paso 3: guardar evento
    window._lvSaveEvent = async (evType, updatesScore, points, teamId, playerId) => {
      try {
        await Api.createEvent({
          match_id:   matchId,
          event_type: evType,
          team_id:    teamId,
          player_id:  playerId || null,
          minute:     0,
        });

        if (updatesScore && points > 0) {
          const isT1 = teamId === match.team1_id;
          const sc1  = (match.team1_score ?? 0) + (isT1 ? points : 0);
          const sc2  = (match.team2_score ?? 0) + (isT1 ? 0 : points);
          try {
            await Api.updateMatch(matchId, { team1_score: sc1, team2_score: sc2 });
            match.team1_score = sc1;
            match.team2_score = sc2;
          } catch(scoreErr) { /* score columns might not exist yet */ }
        }

        Utils.closeModal();
        Utils.toast('Evento registrado');
        try { events = await Api.getEvents(matchId); } catch(e) {}
        render();
      } catch(e) {
        Utils.toast(e.message || 'Error al registrar evento', 'error');
      }
    };

    // Eliminar evento (revierte puntos si aplica)
    window._lvDeleteEvent = async (evId, evType, teamId) => {
      if (!confirm('¿Eliminar este evento?')) return;
      try {
        const pts = _SCORE_POINTS[evType] || 0;
        if (pts > 0) {
          const isT1 = teamId === match.team1_id;
          const sc1  = Math.max(0, (match.team1_score ?? 0) - (isT1 ? pts : 0));
          const sc2  = Math.max(0, (match.team2_score ?? 0) - (isT1 ? 0 : pts));
          try {
            await Api.updateMatch(matchId, { team1_score: sc1, team2_score: sc2 });
            match.team1_score = sc1;
            match.team2_score = sc2;
          } catch(scoreErr) { /* score columns might not exist yet */ }
        }
        await Api.deleteEvent(evId);
        Utils.toast('Evento eliminado');
        try { events = await Api.getEvents(matchId); } catch(e) {}
        render();
      } catch(e) {
        Utils.toast(e.message || 'Error al eliminar evento', 'error');
      }
    };

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
}

function _lvTimeline(events, players, isEditor, match) {
  if (!events || events.length === 0) {
    return `<div style="text-align:center;padding:32px 0;">
      <div style="font-size:32px;margin-bottom:8px;">📋</div>
      <p style="color:#475569;font-size:14px;">Sin eventos registrados</p>
    </div>`;
  }

  const s1 = match?.team1?.name || match?.team1?.school?.name || 'Local';
  const s2 = match?.team2?.name || match?.team2?.school?.name || 'Visitante';

  return events
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .map(ev => {
      const p      = players.find(pl => pl.id === ev.player_id);
      const pName  = p ? `#${p.jersey_number ?? '?'} ${p.full_name}` : '';
      const label  = _LV_LABELS[ev.event_type] || ev.event_type;
      const team   = ev.team_id === match?.team1_id ? s1 : ev.team_id === match?.team2_id ? s2 : '';
      const time   = ev.created_at
        ? new Date(ev.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : '';
      const et = ev.event_type || '';

      // Bullet + color por tipo de evento
      let bullet = '⚪', color = '#64748b';
      if (et === 'goal' || et === 'penalty')                    { bullet = '🟢'; color = '#22c55e'; }
      else if (et === 'canasta_1pt' || et === 'canasta_2pts')   { bullet = '🔵'; color = '#60a5fa'; }
      else if (et === 'canasta_3pts')                           { bullet = '🟡'; color = '#f59e0b'; }
      else if (et === 'yellow_card')                            { bullet = '🟡'; color = '#fbbf24'; }
      else if (et === 'red_card')                               { bullet = '🔴'; color = '#ef4444'; }
      else if (et === 'point_volleyball' || et === 'ace')       { bullet = '🟣'; color = '#a78bfa'; }
      else if (et === 'bloqueo' || et === 'block')              { bullet = '🔴'; color = '#f87171'; }
      else if (et === 'falta_tecnica')                          { bullet = '🔴'; color = '#f87171'; }

      const meta = [team, pName].filter(Boolean).join(' · ');

      return `
        <div style="display:flex;gap:12px;padding:12px 4px;border-bottom:1px solid rgba(255,255,255,0.05);align-items:flex-start;">
          <div style="font-size:18px;flex-shrink:0;margin-top:2px;">${bullet}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;color:${color};font-size:14px;">${label}</div>
            ${meta ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px;">${meta}</div>` : ''}
            ${time ? `<div style="font-size:11px;color:#334155;margin-top:2px;">${time}</div>` : ''}
          </div>
          ${isEditor ? `
            <button style="flex-shrink:0;background:rgba(239,68,68,0.12);color:#f87171;
                           border:1px solid rgba(239,68,68,0.2);border-radius:6px;
                           padding:4px 8px;font-size:11px;cursor:pointer;"
              onclick="window._lvDeleteEvent('${ev.id}','${ev.event_type}','${ev.team_id || ''}')">✕</button>
          ` : ''}
        </div>`;
    }).join('');
}

window.Pages = window.Pages || {};
window.Pages.LiveScoring = Pages.LiveScoring;
