/**
 * Página: Resultados - Partidos finalizados
 */

// Labels de eventos (sin minuto) - sincronizado con live_scoring
const _RES_LABELS = {
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
  // legacy
  basket_1pt:  '🏀 +1 Tiro Libre',
  basket_2pts: '🏀 +2 Canasta',
  basket_3pts: '🏀 +3 Triple',
};

// Eventos que cambian el marcador (color verde en historial)
const _RES_SCORE_EVENTS = new Set([
  'goal','penalty','canasta_1pt','canasta_2pts','canasta_3pts',
  'point_volleyball','ace','homerun','basket_1pt','basket_2pts','basket_3pts',
]);

Pages.Results = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [matches, players, sports] = await Promise.all([
      Api.getMatches({ status: 'finished' }),
      Api.getPlayers(),
      Api.getSports(),
    ]);

    if (opts && opts.matchId) {
      const m = matches.find(m => m.id === opts.matchId) || await Api.getMatch(opts.matchId);
      if (m) { _showResultDetail(container, m, players); return; }
    }

    const allCategories = [...new Set(matches.map(m => m.category).filter(Boolean))].sort();
    const allSchools    = [...new Set(matches.flatMap(m => [m.team1?.school?.name, m.team2?.school?.name]).filter(Boolean))].sort();
    let fSport = '', fGender = '', fCategory = '', fSchool = '';

    const getFiltered = () => {
      let f = matches;
      if (fSport)    f = f.filter(m => m.sport === fSport);
      if (fGender)   f = f.filter(m => m.gender === fGender);
      if (fCategory) f = f.filter(m => m.category === fCategory);
      if (fSchool)   f = f.filter(m => m.team1?.school?.name === fSchool || m.team2?.school?.name === fSchool);
      return f;
    };

    const _resCard = (m) => `
      <div class="card mb-4" style="cursor:pointer;border-left:4px solid ${Utils.sportColor(m.sport)};"
           onclick="Pages._openResult('${m.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;color:var(--muted);">${Utils.sportIcon(m.sport)} ${m.sport} &bull; ${m.gender || ''} &bull; ${m.category || ''}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:14px;">${Utils.truncate(m.team1?.name||m.team1?.school?.name||'Equipo 1',18)}</span>
              <span style="font-weight:900;font-size:22px;color:var(--green);">${m.team1_score} - ${m.team2_score}</span>
              <span style="font-weight:700;font-size:14px;">${Utils.truncate(m.team2?.name||m.team2?.school?.name||'Equipo 2',18)}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:6px;">📅 ${Utils.formatDateTime(m.match_date)} &bull; 📍 ${m.location||''}</div>
          </div>
          <span class="badge-finished">Finalizado</span>
        </div>
      </div>`;

    const renderList = () => {
      const filtered = getFiltered();
      const el = document.getElementById('res-list');
      if (!el) return;
      document.getElementById('res-count').textContent = `${filtered.length} partidos finalizados`;
      el.innerHTML = filtered.length === 0
        ? Utils.emptyState('No hay resultados con estos filtros')
        : filtered.map(_resCard).join('');
    };

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:var(--accent);">📊 Resultados</h2>
        <p class="text-gray-400 mt-1" id="res-count">${matches.length} partidos finalizados</p>
      </div>
      ${Utils.wrapFilters(`
      <div class="card mb-6" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <div style="flex:1;min-width:130px;">
          <label class="text-gray-400 text-sm">Deporte</label>
          <select class="input-field mt-1" id="res-sport" onchange="window._resFilter();Utils.updateFilterCount('res-filters')">
            <option value="">Todos</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:120px;">
          <label class="text-gray-400 text-sm">Género</label>
          <select class="input-field mt-1" id="res-gender" onchange="window._resFilter();Utils.updateFilterCount('res-filters')">
            <option value="">Todos</option>
            <option>Masculino</option><option>Femenino</option><option>Mixto</option>
          </select>
        </div>
        <div style="flex:1;min-width:130px;">
          <label class="text-gray-400 text-sm">Categoría</label>
          <select class="input-field mt-1" id="res-category" onchange="window._resFilter();Utils.updateFilterCount('res-filters')">
            <option value="">Todas</option>
            ${allCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:140px;">
          <label class="text-gray-400 text-sm">Colegio</label>
          <select class="input-field mt-1" id="res-school" onchange="window._resFilter();Utils.updateFilterCount('res-filters')">
            <option value="">Todos</option>
            ${allSchools.map(s => `<option value="${s}">${Utils.truncate(s,28)}</option>`).join('')}
          </select>
        </div>
        <button class="btn-ghost" style="padding:8px 14px;" onclick="
          ['res-sport','res-gender','res-category','res-school'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
          window._resFilter();Utils.updateFilterCount('res-filters');
        ">🔄 Limpiar</button>
      </div>
      `, 'res-filters')}
      <div id="res-list"></div>
    `;

    window._resFilter = () => {
      fSport    = document.getElementById('res-sport')?.value || '';
      fGender   = document.getElementById('res-gender')?.value || '';
      fCategory = document.getElementById('res-category')?.value || '';
      fSchool   = document.getElementById('res-school')?.value || '';
      renderList();
    };
    renderList();

    Pages._openResult = async (id) => {
      const m = matches.find(x => x.id === id) || await Api.getMatch(id);
      _showResultDetail(document.getElementById('page-content'), m, players);
    };

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

// Eventos disponibles por deporte (para agregar post-partido)
const _RES_SPORT_EVENTS = {
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
  'Softball': [
    { type: 'homerun', label: '🎾 Homerun', scores: true, points: 1 },
  ],
};

const _RES_SCORE_POINTS = {
  goal: 1, penalty: 1,
  canasta_1pt: 1, canasta_2pts: 2, canasta_3pts: 3,
  point_volleyball: 1, ace: 1, homerun: 1,
  basket_1pt: 1, basket_2pts: 2, basket_3pts: 3,
};

async function _showResultDetail(container, m, players) {
  let events = await Api.getEvents(m.id);
  const s1 = m.team1?.name || m.team1?.school?.name || 'Local';
  const s2 = m.team2?.name || m.team2?.school?.name || 'Visitante';
  const isEditor = App.isEditor();
  const sport = m.sport || '';
  const sportEvts = _RES_SPORT_EVENTS[sport] || [];

  const render = () => {
    const editBtn = isEditor ? `
      <button class="btn-ghost" style="margin-top:12px;font-size:13px;" id="res-edit-btn"
              onclick="window._resToggleEdit()">✏️ Editar Marcador</button>
      <div id="res-edit-form" style="display:none;margin-top:14px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
          <input type="number" id="res-score1" value="${m.team1_score}" min="0"
                 class="input-field" style="width:70px;text-align:center;font-size:22px;font-weight:900;">
          <span style="font-size:22px;font-weight:700;color:var(--muted);">-</span>
          <input type="number" id="res-score2" value="${m.team2_score}" min="0"
                 class="input-field" style="width:70px;text-align:center;font-size:22px;font-weight:900;">
        </div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">
          <button class="btn-primary" onclick="window._resSaveEdit('${m.id}')">Guardar</button>
          <button class="btn-ghost" onclick="window._resToggleEdit()">Cancelar</button>
        </div>
      </div>` : '';

    const addEventSection = isEditor && sportEvts.length > 0 ? `
      <div class="card mb-6" style="border-top:3px solid #f59e0b;">
        <h3 class="text-xl font-bold mb-4">⚡ Agregar Evento</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${sportEvts.map(ev =>
            `<button class="btn-secondary" onclick="window._resStartEvent('${ev.type}','${ev.label}',${ev.scores},${ev.points||0})">${ev.label}</button>`
          ).join('')}
        </div>
      </div>` : '';

    container.innerHTML = `
      <div class="mb-4">
        <button class="btn-ghost" onclick="App.navigate('results')">← Volver</button>
      </div>
      <div class="card mb-6" style="text-align:center;border:2px solid var(--green);">
        <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">${Utils.sportIcon(sport)} ${sport} &bull; ${m.gender||''} &bull; ${m.category||''}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
          <div style="text-align:center;min-width:80px;">
            <div class="team-name-large">${s1}</div>
            ${m.team1_score > m.team2_score ? '<div style="color:#fbbf24;font-size:12px;margin-top:4px;">🏆 Ganador</div>' : ''}
          </div>
          <div style="text-align:center;">
            <div class="score-display">${m.team1_score} - ${m.team2_score}</div>
            <div style="color:var(--green);font-size:13px;margin-top:4px;">Partido Finalizado</div>
          </div>
          <div style="text-align:center;min-width:80px;">
            <div class="team-name-large">${s2}</div>
            ${m.team2_score > m.team1_score ? '<div style="color:#fbbf24;font-size:12px;margin-top:4px;">🏆 Ganador</div>' : ''}
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:12px;">📅 ${Utils.formatDateTime(m.match_date)} &bull; 📍 ${m.location||''}</div>
        ${editBtn}
      </div>
      ${addEventSection}
      <div class="card">
        <h3 class="text-xl font-bold mb-4">📋 Eventos del Partido</h3>
        ${_resEventLog(events, players, m, isEditor)}
      </div>
    `;
  };

  render();

  // ── Score edit handlers ──
  window._resToggleEdit = () => {
    const form = document.getElementById('res-edit-form');
    const btn = document.getElementById('res-edit-btn');
    if (form && btn) {
      const show = form.style.display === 'none';
      form.style.display = show ? 'block' : 'none';
      btn.style.display = show ? 'none' : '';
    }
  };

  window._resSaveEdit = async (matchId) => {
    const s1Val = parseInt(document.getElementById('res-score1').value) || 0;
    const s2Val = parseInt(document.getElementById('res-score2').value) || 0;
    try {
      await Api.updateMatch(matchId, { team1_score: s1Val, team2_score: s2Val });
      m.team1_score = s1Val;
      m.team2_score = s2Val;
      Utils.toast('Marcador actualizado', 'success');
      render();
    } catch(e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  };

  // ── Add event: Step 1 - pick team ──
  window._resStartEvent = (evType, evLabel, updatesScore, points) => {
    Utils.showModal(`
      <h3 class="text-xl font-bold mb-4">${evLabel}</h3>
      <p class="text-gray-400 mb-4">Selecciona el equipo:</p>
      <div style="display:grid;gap:10px;">
        <button class="btn-primary"
          onclick="window._resPickPlayer('${evType}',${updatesScore},${points},'${m.team1_id}')">
          ${s1}
        </button>
        <button class="btn-secondary"
          onclick="window._resPickPlayer('${evType}',${updatesScore},${points},'${m.team2_id}')">
          ${s2}
        </button>
      </div>
    `);
  };

  // ── Add event: Step 2 - pick player ──
  window._resPickPlayer = (evType, updatesScore, points, teamId) => {
    const teamPlayers = players.filter(p => p.team_id === teamId);
    const teamName = teamId === m.team1_id ? s1 : s2;
    Utils.showModal(`
      <h3 class="text-xl font-bold mb-2">${_RES_LABELS[evType] || evType} — ${teamName}</h3>
      ${teamPlayers.length === 0
        ? '<p style="color:#fbbf24;font-size:13px;margin-bottom:12px;">Este equipo no tiene jugadores registrados.</p>'
        : '<p class="text-gray-400 text-sm mb-3">Selecciona el jugador:</p>'}
      <div style="display:grid;gap:8px;max-height:320px;overflow-y:auto;">
        <button class="btn-ghost"
          onclick="window._resSaveEvent('${evType}',${updatesScore},${points},'${teamId}',null)">
          Sin jugador especifico
        </button>
        ${teamPlayers.map(p => `
          <button class="btn-ghost"
            style="text-align:left;display:flex;align-items:center;gap:10px;"
            onclick="window._resSaveEvent('${evType}',${updatesScore},${points},'${teamId}','${p.id}')">
            <span style="font-weight:700;color:var(--accent);min-width:32px;">#${p.jersey_number ?? '?'}</span>
            <span>${p.full_name}</span>
          </button>
        `).join('')}
      </div>
    `);
  };

  // ── Add event: Step 3 - save ──
  window._resSaveEvent = async (evType, updatesScore, points, teamId, playerId) => {
    try {
      await Api.createEvent({
        match_id:   m.id,
        event_type: evType,
        team_id:    teamId,
        player_id:  playerId || null,
        minute:     0,
      });
      if (updatesScore && points > 0) {
        const isT1 = teamId === m.team1_id;
        m.team1_score = (m.team1_score ?? 0) + (isT1 ? points : 0);
        m.team2_score = (m.team2_score ?? 0) + (isT1 ? 0 : points);
        await Api.updateMatch(m.id, { team1_score: m.team1_score, team2_score: m.team2_score });
      }
      Utils.closeModal();
      Utils.toast('Evento registrado');
      events = await Api.getEvents(m.id);
      render();
    } catch(e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  };

  // ── Delete event (reverts score) ──
  window._resDeleteEvent = async (evId, evType, teamId) => {
    if (!confirm('Eliminar este evento?')) return;
    try {
      const pts = _RES_SCORE_POINTS[evType] || 0;
      if (pts > 0) {
        const isT1 = teamId === m.team1_id;
        m.team1_score = Math.max(0, (m.team1_score ?? 0) - (isT1 ? pts : 0));
        m.team2_score = Math.max(0, (m.team2_score ?? 0) - (isT1 ? 0 : pts));
        await Api.updateMatch(m.id, { team1_score: m.team1_score, team2_score: m.team2_score });
      }
      await Api.deleteEvent(evId);
      Utils.toast('Evento eliminado');
      events = await Api.getEvents(m.id);
      render();
    } catch(e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  };
}

function _resEventLog(events, players, m, canDelete) {
  if (!events || events.length === 0) {
    return '<p class="text-gray-400">Sin eventos registrados</p>';
  }

  const s1 = m.team1?.name || m.team1?.school?.name || 'Local';
  const s2 = m.team2?.name || m.team2?.school?.name || 'Visitante';

  const t1Events = events.filter(e => e.team_id === m.team1_id);
  const t2Events = events.filter(e => e.team_id === m.team2_id);
  const unknownEvents = events.filter(e => !e.team_id || (e.team_id !== m.team1_id && e.team_id !== m.team2_id));

  const delBtn = (e) => canDelete
    ? `<button style="flex-shrink:0;background:rgba(239,68,68,0.12);color:var(--accent2);
                       border:1px solid rgba(239,68,68,0.2);border-radius:6px;
                       padding:3px 7px;font-size:10px;cursor:pointer;"
        onclick="window._resDeleteEvent('${e.id}','${e.event_type}','${e.team_id || ''}')">✕</button>`
    : '';

  const renderTeamEvents = (teamEvents) => {
    if (teamEvents.length === 0) return `<p style="color:var(--muted);font-size:13px;font-style:italic;">Sin eventos</p>`;
    return teamEvents.map(e => {
      const p = players.find(x => x.id === e.player_id);
      const pName = p ? `<span style="color:var(--muted);font-size:12px;">#${p.jersey_number ?? '?'} ${p.full_name}</span>` : '';
      const label = _RES_LABELS[e.event_type] || e.event_type;
      const isScore = _RES_SCORE_EVENTS.has(e.event_type);
      return `
        <div style="display:flex;align-items:center;gap:6px;padding:8px 0;
                    border-bottom:1px solid var(--border);">
          <div style="flex:1;min-width:0;">
            <span style="font-weight:600;font-size:14px;color:${isScore ? 'var(--green)' : 'var(--text)'};">${label}</span>
            ${pName ? `<br>${pName}` : ''}
          </div>
          ${delBtn(e)}
        </div>`;
    }).join('');
  };

  const renderUnknown = (evList) => evList.map(e => {
    const p = players.find(x => x.id === e.player_id);
    const pName = p ? `#${p.jersey_number ?? '?'} ${p.full_name}` : '';
    const label = _RES_LABELS[e.event_type] || e.event_type;
    const isScore = _RES_SCORE_EVENTS.has(e.event_type);
    return `
      <div style="display:flex;gap:12px;align-items:center;padding:8px 0;
                  border-bottom:1px solid var(--border);">
        <div style="flex:1;">
          <span style="font-weight:600;color:${isScore ? 'var(--green)' : 'var(--text)'};">${label}</span>
          ${pName ? `<span style="color:var(--muted);font-size:13px;margin-left:8px;">${pName}</span>` : ''}
        </div>
        ${delBtn(e)}
      </div>`;
  }).join('');

  if (t1Events.length === 0 && t2Events.length === 0) {
    return `<div>${renderUnknown(unknownEvents)}</div>`;
  }

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0;">
      <div style="padding-right:16px;padding-bottom:12px;border-right:1px solid var(--border);">
        <div style="font-weight:700;font-size:13px;color:var(--accent);margin-bottom:10px;
                    padding-bottom:6px;border-bottom:1px solid rgba(96,165,250,0.2);">
          ${Utils.truncate(s1, 20)}
        </div>
        ${renderTeamEvents(t1Events)}
      </div>
      <div style="padding-left:16px;padding-bottom:12px;">
        <div style="font-weight:700;font-size:13px;color:#f472b6;margin-bottom:10px;
                    padding-bottom:6px;border-bottom:1px solid rgba(244,114,182,0.2);">
          ${Utils.truncate(s2, 20)}
        </div>
        ${renderTeamEvents(t2Events)}
      </div>
    </div>
    ${unknownEvents.length > 0 ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        ${renderUnknown(unknownEvents)}
      </div>` : ''}
  `;
}

window.Pages = Pages;
