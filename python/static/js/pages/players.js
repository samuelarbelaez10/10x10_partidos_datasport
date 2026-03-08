/**
 * Página: Jugadores
 */
Pages.Players = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [players, teams, playerStats, sports] = await Promise.all([
      Api.getPlayers(),
      Api.getTeams(),
      Api.getPlayerStats(),
      Api.getSports(),
    ]);

    if (opts && opts.playerId) {
      _showPlayerDetail(container, opts.playerId, players, teams, playerStats);
      return;
    }

    let filterSport = '', filterSchool = '', filterGender = '', filterCategory = '', search = '';

    const schools      = [...new Set(teams.map(t => t.school?.name).filter(Boolean))].sort();
    const allCategories = [...new Set(teams.map(t => t.category?.name).filter(Boolean))].sort();

    const getFiltered = () => {
      let f = players;
      if (filterSport) {
        const tIds = teams.filter(t => t.sport?.name === filterSport).map(t => t.id);
        f = f.filter(p => tIds.includes(p.team_id));
      }
      if (filterSchool) {
        const tIds = teams.filter(t => t.school?.name === filterSchool).map(t => t.id);
        f = f.filter(p => tIds.includes(p.team_id));
      }
      if (filterGender) {
        const tIds = teams.filter(t => t.gender === filterGender || t.category?.gender === filterGender).map(t => t.id);
        f = f.filter(p => tIds.includes(p.team_id));
      }
      if (filterCategory) {
        const tIds = teams.filter(t => t.category?.name === filterCategory).map(t => t.id);
        f = f.filter(p => tIds.includes(p.team_id));
      }
      if (search) {
        const q = search.toLowerCase();
        f = f.filter(p => p.full_name.toLowerCase().includes(q));
      }
      return f;
    };

    const renderList = () => {
      const f = getFiltered();
      const countEl = document.getElementById('pl-count');
      if (countEl) countEl.textContent = `${f.length} jugador${f.length !== 1 ? 'es' : ''}`;

      document.getElementById('players-list').innerHTML = f.length === 0
        ? Utils.emptyState('No se encontraron jugadores')
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;">
            ${f.map(p => {
              const team   = teams.find(t => t.id === p.team_id);
              const sport  = team?.sport?.name || '';
              const school = team?.school?.name || '';
              const color  = Utils.sportColor(sport);
              const pStats = playerStats.find(s => s.player_id === p.id);
              const totalScore = (pStats?.sport_stats || []).reduce((a, s) => a + (s.score || 0), 0);
              const photo = p.photo_url || `https://ui-avatars.com/api/?background=1e40af&color=fff&size=80&name=${encodeURIComponent(p.full_name||'?')}`;
              const isSuspended = (pStats?.yellow_cards || 0) >= 2;

              return `
                <div onclick="Pages._openPlayer('${p.id}')"
                  style="background:#0f172a;border:1px solid ${isSuspended ? 'rgba(239,68,68,0.4)' : '#1e293b'};border-radius:14px;
                         overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s;
                         position:relative;"
                  onmouseenter="this.style.transform='translateY(-3px)';this.style.borderColor='${isSuspended ? 'var(--accent2)' : color}';this.style.boxShadow='0 8px 24px rgba(0,0,0,.4)'"
                  onmouseleave="this.style.transform='';this.style.borderColor='${isSuspended ? 'rgba(239,68,68,0.4)' : '#1e293b'}';this.style.boxShadow=''">

                  <!-- Banda de color superior -->
                  <div style="height:4px;background:${isSuspended ? 'var(--accent2)' : color};"></div>

                  <!-- Cuerpo -->
                  <div style="padding:16px;text-align:center;">
                    ${isSuspended ? `
                    <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);
                                border-radius:6px;padding:3px 8px;margin-bottom:8px;display:inline-block;">
                      <span style="font-size:10px;font-weight:800;color:var(--accent2);">🚫 SUSPENDIDO</span>
                    </div>` : ''}
                    <!-- Foto + número -->
                    <div style="position:relative;display:inline-block;margin-bottom:10px;">
                      <img src="${photo}" alt="${p.full_name}"
                           style="width:70px;height:70px;border-radius:50%;object-fit:cover;
                                  border:2px solid ${isSuspended ? 'var(--accent2)' : color};display:block;
                                  ${isSuspended ? 'filter:grayscale(40%)' : ''}">
                      <span style="position:absolute;bottom:-2px;right:-6px;
                                   background:${isSuspended ? 'var(--accent2)' : color};color:#0f172a;
                                   font-size:10px;font-weight:900;
                                   padding:2px 6px;border-radius:10px;
                                   border:2px solid #0f172a;line-height:1.2;">
                        #${p.jersey_number || '?'}
                      </span>
                    </div>

                    <!-- Nombre -->
                    <div style="font-weight:700;font-size:14px;color:${isSuspended ? '#fca5a5' : 'var(--text)'};
                                line-height:1.3;margin-bottom:4px;">
                      ${Utils.truncate(p.full_name, 22)}
                    </div>

                    <!-- Deporte + Colegio -->
                    <div style="font-size:11px;color:var(--muted);margin-bottom:10px;line-height:1.6;">
                      <span style="color:${color};">${Utils.sportIcon(sport)} ${sport || '—'}</span><br>
                      ${Utils.truncate(school, 20)}
                    </div>

                    <!-- Stats chips -->
                    ${pStats ? `
                    <div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
                      <span style="background:rgba(96,165,250,0.12);color:var(--accent);
                                   font-size:10px;font-weight:700;
                                   padding:3px 8px;border-radius:8px;">
                        ⚡ ${totalScore}
                      </span>
                      ${pStats.yellow_cards > 0 ? `
                      <span style="background:rgba(251,191,36,0.12);color:#fbbf24;
                                   font-size:10px;font-weight:700;
                                   padding:3px 8px;border-radius:8px;">
                        🟨 ${pStats.yellow_cards}
                      </span>` : ''}
                      ${pStats.red_cards > 0 ? `
                      <span style="background:rgba(239,68,68,0.12);color:var(--accent2);
                                   font-size:10px;font-weight:700;
                                   padding:3px 8px;border-radius:8px;">
                        🟥 ${pStats.red_cards}
                      </span>` : ''}
                    </div>` : `
                    <div style="font-size:10px;color:var(--muted);">Sin estadísticas</div>`}
                  </div>
                </div>`;
            }).join('')}
          </div>`;
    };

    const sportsCount = [...new Set(
      players.map(p => teams.find(t => t.id === p.team_id)?.sport?.name).filter(Boolean)
    )].length;

    container.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:flex-end;justify-content:space-between;
                  margin-bottom:22px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:28px;font-weight:900;color:var(--accent);margin:0;">👥 Jugadores</h2>
          <p style="color:var(--muted);font-size:13px;margin:4px 0 0;">
            Registro de jugadores por deporte y colegio
          </p>
        </div>
        <!-- Badges de resumen -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.2);
                      border-radius:10px;padding:8px 16px;text-align:center;">
            <div style="font-size:20px;font-weight:900;color:var(--accent);" id="pl-count">
              ${players.length}
            </div>
            <div style="font-size:11px;color:var(--muted);">jugadores</div>
          </div>
          <div style="background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.2);
                      border-radius:10px;padding:8px 16px;text-align:center;">
            <div style="font-size:20px;font-weight:900;color:var(--purple);">${sportsCount}</div>
            <div style="font-size:11px;color:var(--muted);">deportes</div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      ${Utils.wrapFilters(`
      <div class="card mb-5" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <div style="flex:2;min-width:180px;position:relative;">
          <label class="text-gray-400 text-sm">Buscar</label>
          <input type="text" id="pl-search" class="input-field mt-1"
            placeholder="🔍 Buscar jugador..."
            oninput="Pages._plFilter();Utils.updateFilterCount('pl-filters')">
        </div>
        <div style="flex:1;min-width:130px;">
          <label class="text-gray-400 text-sm">Deporte</label>
          <select id="pl-sport" class="input-field mt-1" onchange="Pages._plFilter();Utils.updateFilterCount('pl-filters')">
            <option value="">Todos</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:120px;">
          <label class="text-gray-400 text-sm">Género</label>
          <select id="pl-gender" class="input-field mt-1" onchange="Pages._plFilter();Utils.updateFilterCount('pl-filters')">
            <option value="">Todos</option>
            <option>Masculino</option><option>Femenino</option><option>Mixto</option>
          </select>
        </div>
        <div style="flex:1;min-width:130px;">
          <label class="text-gray-400 text-sm">Categoría</label>
          <select id="pl-category" class="input-field mt-1" onchange="Pages._plFilter();Utils.updateFilterCount('pl-filters')">
            <option value="">Todas</option>
            ${allCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:140px;">
          <label class="text-gray-400 text-sm">Colegio</label>
          <select id="pl-school" class="input-field mt-1" onchange="Pages._plFilter();Utils.updateFilterCount('pl-filters')">
            <option value="">Todos</option>
            ${schools.map(s => `<option value="${s}">${Utils.truncate(s, 28)}</option>`).join('')}
          </select>
        </div>
      </div>
      `, 'pl-filters')}

      <div id="players-list"></div>
    `;

    Pages._plData = { players, teams, playerStats };
    Pages._plFilter = () => {
      filterSport    = document.getElementById('pl-sport')?.value    || '';
      filterSchool   = document.getElementById('pl-school')?.value   || '';
      filterGender   = document.getElementById('pl-gender')?.value   || '';
      filterCategory = document.getElementById('pl-category')?.value || '';
      search         = document.getElementById('pl-search')?.value   || '';
      renderList();
    };
    Pages._openPlayer = (id) =>
      _showPlayerDetail(document.getElementById('page-content'), id, players, teams, playerStats);

    renderList();
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};


function _showPlayerDetail(container, playerId, players, teams, playerStats) {
  const player = players.find(p => p.id === playerId);
  if (!player) {
    container.innerHTML = '<div class="text-red-400 p-8">Jugador no encontrado</div>';
    return;
  }

  const team   = teams.find(t => t.id === player.team_id);
  const sport  = team?.sport?.name || '';
  const school = team?.school?.name || '';
  const color  = Utils.sportColor(sport);
  const pStats = playerStats.find(s => s.player_id === playerId);

  const totalScore   = (pStats?.sport_stats || []).reduce((a, s) => a + (s.score   || 0), 0);
  const totalAssists = (pStats?.sport_stats || []).reduce((a, s) => a + (s.assists || 0), 0);
  const isSuspended  = (pStats?.yellow_cards || 0) >= 2;

  const photo = player.photo_url ||
    `https://ui-avatars.com/api/?background=1e40af&color=fff&size=120&name=${encodeURIComponent(player.full_name || '?')}`;

  const statCard = (icon, value, label, valueColor = 'var(--text)') => `
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;
                padding:16px;text-align:center;">
      <div style="font-size:20px;margin-bottom:4px;">${icon}</div>
      <div style="font-size:26px;font-weight:900;color:${valueColor};line-height:1;">${value}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;">${label}</div>
    </div>`;

  container.innerHTML = `
    <div style="margin-bottom:16px;">
      <button onclick="App.navigate('players')"
        style="background:var(--surface);border:1px solid #1e293b;
               color:var(--muted);border-radius:8px;padding:6px 14px;
               font-size:13px;cursor:pointer;transition:background .15s;"
        onmouseenter="this.style.background='rgba(255,255,255,0.1)'"
        onmouseleave="this.style.background='var(--border)'">
        ← Volver a jugadores
      </button>
    </div>

    <!-- Hero del jugador -->
    <div style="background:#0f172a;border:1px solid #1e293b;border-top:4px solid ${color};
                border-radius:16px;padding:24px;margin-bottom:20px;
                display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
      <div style="position:relative;flex-shrink:0;">
        <img src="${photo}" alt="${player.full_name}"
             style="width:100px;height:100px;border-radius:50%;object-fit:cover;
                    border:3px solid ${color};display:block;">
        <span style="position:absolute;bottom:0;right:-4px;
                     background:${color};color:#0f172a;
                     font-size:12px;font-weight:900;
                     padding:3px 8px;border-radius:12px;
                     border:2px solid #0f172a;">
          #${player.jersey_number || '?'}
        </span>
      </div>
      <div style="flex:1;min-width:0;">
        <h2 style="font-size:26px;font-weight:900;color:${isSuspended ? '#fca5a5' : 'var(--text)'};margin:0 0 4px;">${player.full_name}</h2>
        ${isSuspended ? `
        <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);
                    border-radius:8px;padding:6px 14px;margin-bottom:8px;display:inline-block;">
          <span style="font-size:13px;font-weight:800;color:var(--accent2);">🚫 SUSPENDIDO — 2+ tarjetas amarillas acumuladas</span>
        </div>` : ''}
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
          <span style="background:var(--border);border:1px solid rgba(255,255,255,0.1);
                       color:${color};font-size:12px;font-weight:700;
                       padding:3px 10px;border-radius:20px;">
            ${Utils.sportIcon(sport)} ${sport}
          </span>
          <span style="font-size:13px;color:var(--muted);">${Utils.truncate(school, 30)}</span>
        </div>
        ${team ? `
        <div style="font-size:12px;color:var(--muted);">
          ${team.category?.name || ''} · ${team.gender || ''} · ${Utils.truncate(team.name || '', 25)}
        </div>` : ''}
      </div>
    </div>

    <!-- Stats generales -->
    ${pStats ? `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
      ${statCard('⚡', totalScore,          'Anotaciones',   'var(--accent)')}
      ${statCard('🎯', totalAssists,        'Asistencias',   'var(--green)')}
      ${statCard('🟨', pStats.yellow_cards, 'Amarillas',     '#fbbf24')}
      ${statCard('🟥', pStats.red_cards,    'Rojas',         'var(--accent2)')}
    </div>

    <!-- Stats por deporte -->
    ${(pStats.sport_stats || []).length > 0 ? `
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;
                padding:20px;margin-bottom:16px;">
      <h3 style="font-size:15px;font-weight:700;color:var(--text);margin:0 0 16px;
                 display:flex;align-items:center;gap:8px;">
        📊 <span>Estadísticas por deporte</span>
      </h3>
      ${pStats.sport_stats.map(ss => {
        const sc = Utils.sportColor(ss.sport);
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:12px 14px;border-radius:10px;margin-bottom:8px;
                    background:rgba(255,255,255,0.02);border:1px solid var(--border);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">${Utils.sportIcon(ss.sport)}</span>
            <div>
              <div style="font-weight:700;color:var(--text);font-size:14px;">${ss.sport}</div>
              <div style="font-size:11px;color:var(--muted);">${ss.score_term || 'Puntos'}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            <span style="background:rgba(96,165,250,0.12);color:var(--accent);
                         font-size:12px;font-weight:700;
                         padding:4px 10px;border-radius:8px;">
              ⚡ ${ss.score}
            </span>
            ${ss.assists > 0 ? `
            <span style="background:rgba(16,185,129,0.12);color:#6ee7b7;
                         font-size:12px;font-weight:700;
                         padding:4px 10px;border-radius:8px;">
              🎯 ${ss.assists}
            </span>` : ''}
            ${ss.three_pointers > 0 ? `
            <span style="background:rgba(251,191,36,0.12);color:#fde68a;
                         font-size:12px;font-weight:700;
                         padding:4px 10px;border-radius:8px;">
              🏀 3pt: ${ss.three_pointers}
            </span>` : ''}
            ${ss.blocks > 0 ? `
            <span style="background:rgba(239,68,68,0.12);color:#fca5a5;
                         font-size:12px;font-weight:700;
                         padding:4px 10px;border-radius:8px;">
              🚫 ${ss.blocks}
            </span>` : ''}
            ${ss.aces_count > 0 ? `
            <span style="background:rgba(167,139,250,0.12);color:#c4b5fd;
                         font-size:12px;font-weight:700;
                         padding:4px 10px;border-radius:8px;">
              🎯 Aces: ${ss.aces_count}
            </span>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Partidos jugados -->
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;
                padding:14px 18px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:28px;">🏟️</span>
      <div>
        <div style="font-size:22px;font-weight:900;color:var(--purple);">${pStats.matches_played || 0}</div>
        <div style="font-size:12px;color:var(--muted);">Partidos jugados</div>
      </div>
    </div>

    ` : `
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;
                padding:32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">📋</div>
      <p style="color:var(--muted);font-size:14px;margin:0;">Sin estadísticas disponibles aún.</p>
    </div>`}
  `;
}

window.Pages = Pages;
