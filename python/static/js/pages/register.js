/**
 * Página: Registrar y gestionar jugadores
 */
Pages.Register = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [teams, players, playerStats] = await Promise.all([
      Api.getTeams(),
      Api.getPlayers(),
      Api.getPlayerStats(),
    ]);

    // Calcular IDs de jugadores suspendidos (2+ amarillas)
    const suspendedIds = new Set(
      (playerStats || []).filter(s => (s.yellow_cards || 0) >= 2).map(s => s.player_id)
    );

    teams.sort((a, b) => {
      const na = `${a.school?.name || ''} ${a.sport?.name || ''}`;
      const nb = `${b.school?.name || ''} ${b.sport?.name || ''}`;
      return na.localeCompare(nb);
    });

    window._rgData = { teams, players, playerStats, suspendedIds, filterTeam: '' };

    const inp = `background:#0f172a;color:#e2e8f0;border:1px solid #1e293b;
                 border-radius:8px;padding:8px 12px;font-size:13px;
                 width:100%;box-sizing:border-box;outline:none;transition:border-color .15s;`;

    const refreshList = () => {
      const el = document.getElementById('rg-player-list');
      if (el) el.innerHTML = _rgRenderPlayers(
        window._rgData.players, window._rgData.teams,
        App.isEditor(), window._rgData.filterTeam,
        window._rgData.suspendedIds
      );
      // Actualizar contador
      const tc = document.getElementById('rg-total');
      if (tc) tc.textContent = window._rgData.players.length;
    };

    container.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:flex-end;justify-content:space-between;
                  margin-bottom:22px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="font-size:28px;font-weight:900;color:#60a5fa;margin:0;">👤 Registrar Jugadores</h2>
          <p style="color:#475569;font-size:13px;margin:4px 0 0;">
            Gestión de plantillas por equipo
          </p>
        </div>
        <div style="display:flex;gap:10px;">
          <div style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.2);
                      border-radius:10px;padding:8px 16px;text-align:center;">
            <div style="font-size:20px;font-weight:900;color:#60a5fa;" id="rg-total">
              ${players.length}
            </div>
            <div style="font-size:11px;color:#475569;">jugadores</div>
          </div>
          <div style="background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.2);
                      border-radius:10px;padding:8px 16px;text-align:center;">
            <div style="font-size:20px;font-weight:900;color:#a78bfa;">${teams.length}</div>
            <div style="font-size:11px;color:#475569;">equipos</div>
          </div>
        </div>
      </div>

      ${!App.isEditor() ? `
      <div style="background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.2);
                  border-radius:12px;padding:14px 18px;margin-bottom:20px;">
        <p style="color:#fca5a5;font-size:13px;margin:0;">
          ⚠️ Solo los editores pueden registrar o modificar jugadores.
        </p>
      </div>` : `

      <!-- Formulario -->
      <div style="background:rgba(96,165,250,0.04);border:1px solid rgba(96,165,250,0.15);
                  border-radius:16px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;">
          <span style="font-size:16px;">➕</span>
          <h3 style="font-size:15px;font-weight:700;color:#60a5fa;margin:0;">Registrar nuevo jugador</h3>
        </div>

        <div style="display:grid;grid-template-columns:2fr 100px 2fr;gap:12px;margin-bottom:14px;">
          <div>
            <label style="font-size:11px;color:#475569;display:block;margin-bottom:4px;
                          text-transform:uppercase;letter-spacing:.5px;">Nombre completo *</label>
            <input type="text" id="rg-pname"
              placeholder="Nombre del jugador"
              style="${inp}"
              onfocus="this.style.borderColor='#3b82f6'"
              onblur="this.style.borderColor='#1e293b'"
              onkeydown="if(event.key==='Enter') Pages._rgSave()">
          </div>
          <div>
            <label style="font-size:11px;color:#475569;display:block;margin-bottom:4px;
                          text-transform:uppercase;letter-spacing:.5px;">Camiseta</label>
            <input type="number" id="rg-jersey"
              placeholder="Nº" min="0" max="99"
              style="${inp}text-align:center;font-size:16px;font-weight:700;"
              onfocus="this.style.borderColor='#3b82f6'"
              onblur="this.style.borderColor='#1e293b'"
              onkeydown="if(event.key==='Enter') Pages._rgSave()">
          </div>
          <div>
            <label style="font-size:11px;color:#475569;display:block;margin-bottom:4px;
                          text-transform:uppercase;letter-spacing:.5px;">Equipo *</label>
            <select id="rg-team"
              style="${inp}"
              onfocus="this.style.borderColor='#3b82f6'"
              onblur="this.style.borderColor='#1e293b'">
              <option value="">— Seleccionar equipo —</option>
              ${teams.map(t => {
                const sport  = t.sport?.name  || '';
                const cat    = t.category?.name || '';
                const gender = t.gender || t.category?.gender || '';
                return `<option value="${t.id}">${t.name} — ${Utils.sportIcon(sport)} ${sport} ${cat} ${gender}</option>`;
              }).join('')}
            </select>
          </div>
        </div>

        <button onclick="Pages._rgSave()"
          style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:white;
                 font-weight:700;font-size:13px;border:none;border-radius:10px;
                 padding:9px 22px;cursor:pointer;transition:opacity .15s;"
          onmouseenter="this.style.opacity='.85'"
          onmouseleave="this.style.opacity='1'">
          ➕ Guardar jugador
        </button>
      </div>`}

      <!-- Filtro de equipos -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="position:relative;flex:1;min-width:200px;max-width:340px;">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
                       color:#475569;font-size:13px;pointer-events:none;">🔍</span>
          <input type="text" id="rg-filter"
            placeholder="Filtrar por equipo o colegio..."
            oninput="window._rgData.filterTeam=this.value; Pages._rgRefresh()"
            style="${inp}padding-left:30px;"
            onfocus="this.style.borderColor='#3b82f6'"
            onblur="this.style.borderColor='#1e293b'">
        </div>
        <span style="font-size:12px;color:#475569;">${teams.length} equipos en total</span>
      </div>

      <!-- Lista de jugadores por equipo -->
      <div id="rg-player-list"></div>
    `;

    Pages._rgSave = async () => {
      const full_name  = document.getElementById('rg-pname')?.value?.trim();
      const jersey_raw = document.getElementById('rg-jersey')?.value;
      const team_id    = document.getElementById('rg-team')?.value;

      if (!full_name) { Utils.toast('El nombre es requerido', 'error'); return; }
      if (!team_id)   { Utils.toast('Selecciona un equipo', 'error'); return; }

      try {
        const created = await Api.createPlayer({
          full_name,
          jersey_number: jersey_raw !== '' && jersey_raw !== null ? parseInt(jersey_raw) : undefined,
          team_id,
        });
        window._rgData.players.push(created);
        document.getElementById('rg-pname').value  = '';
        document.getElementById('rg-jersey').value = '';
        document.getElementById('rg-team').value   = '';
        Utils.toast(`✅ "${full_name}" registrado`);
        refreshList();
      } catch(e) { Utils.toast(e.message, 'error'); }
    };

    Pages._rgDelete = async (playerId, playerName) => {
      if (!confirm(`¿Eliminar a "${playerName}"?`)) return;
      try {
        await Api.deletePlayer(playerId);
        window._rgData.players = window._rgData.players.filter(p => p.id !== playerId);
        Utils.toast(`"${playerName}" eliminado`);
        refreshList();
      } catch(e) { Utils.toast(e.message, 'error'); }
    };

    Pages._rgEditJersey = (playerId, playerName, currentJersey) => {
      Utils.showModal(`
        <h3 style="font-size:16px;font-weight:700;margin:0 0 4px;">✏️ Editar Camiseta</h3>
        <p style="color:#64748b;font-size:13px;margin:0 0 16px;">${playerName}</p>
        <div style="display:flex;align-items:center;gap:12px;">
          <input type="number" id="jersey-edit-input" value="${currentJersey ?? ''}"
            placeholder="Nº" min="0" max="99"
            style="width:90px;font-size:28px;font-weight:900;text-align:center;
                   padding:10px;background:#0f172a;border:2px solid #3b82f6;
                   border-radius:10px;color:white;outline:none;"
            onkeydown="if(event.key==='Enter') Pages._rgSaveJersey('${playerId}')">
          <button onclick="Pages._rgSaveJersey('${playerId}')"
            style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:white;
                   font-weight:700;border:none;border-radius:10px;
                   padding:10px 20px;cursor:pointer;font-size:14px;">
            Guardar
          </button>
        </div>
      `);
      setTimeout(() => document.getElementById('jersey-edit-input')?.focus(), 50);
    };

    Pages._rgSaveJersey = async (playerId) => {
      const val = document.getElementById('jersey-edit-input')?.value;
      const jersey_number = val !== '' && val !== null ? parseInt(val) : null;
      try {
        const updated = await Api.updatePlayer(playerId, { jersey_number });
        const p = window._rgData.players.find(x => x.id === playerId);
        if (p) p.jersey_number = updated.jersey_number;
        Utils.closeModal();
        Utils.toast('Número de camiseta actualizado');
        refreshList();
      } catch(e) { Utils.toast(e.message, 'error'); }
    };

    Pages._rgRefresh = refreshList;

    refreshList();
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};


function _rgRenderPlayers(players, teams, isEditor, filterTeam, suspendedIds = new Set()) {
  if (teams.length === 0) return Utils.emptyState('No hay equipos registrados');

  const q = (filterTeam || '').toLowerCase();

  const filtered = q
    ? teams.filter(t =>
        (t.school?.name || '').toLowerCase().includes(q) ||
        (t.sport?.name  || '').toLowerCase().includes(q) ||
        (t.name         || '').toLowerCase().includes(q)
      )
    : teams;

  if (filtered.length === 0) {
    return `<div style="text-align:center;padding:32px;color:#475569;">
      <div style="font-size:32px;margin-bottom:8px;">🔍</div>
      <p style="font-size:14px;">No se encontraron equipos con ese filtro.</p>
    </div>`;
  }

  return filtered.map(t => {
    const teamPlayers = players
      .filter(p => p.team_id === t.id)
      .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99));

    const school = t.school?.name  || 'Desconocido';
    const sport  = t.sport?.name   || '';
    const cat    = t.category?.name || '';
    const gender = t.gender || t.category?.gender || '';
    const color  = Utils.sportColor(sport);

    // Iniciales del colegio para el avatar
    const initials = school.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const playersHtml = teamPlayers.length === 0
      ? `<div style="padding:12px 0;color:#334155;font-size:13px;font-style:italic;">
           Sin jugadores registrados en este equipo.
         </div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;margin-top:12px;">
          ${teamPlayers.map(p => {
            const nameInitials = p.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const safeName = p.full_name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const isSuspended = suspendedIds.has(p.id);
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;
                          padding:8px 12px;
                          background:${isSuspended ? 'rgba(239,68,68,0.06)' : '#0f172a'};
                          border:1px solid ${isSuspended ? 'rgba(239,68,68,0.3)' : '#1e293b'};
                          border-radius:10px;transition:border-color .15s;"
                   onmouseenter="this.style.borderColor='${isSuspended ? '#ef4444' : color+'33'}'"
                   onmouseleave="this.style.borderColor='${isSuspended ? 'rgba(239,68,68,0.3)' : '#1e293b'}'">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                  <!-- Avatar con iniciales -->
                  <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;
                               background:linear-gradient(135deg,${color}33,${color}66);
                               border:1px solid ${color}55;
                               display:flex;align-items:center;justify-content:center;
                               font-size:11px;font-weight:800;color:${color};">
                    ${nameInitials}
                  </div>
                  <div style="min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <span style="font-size:13px;font-weight:600;color:${isSuspended ? '#fca5a5' : '#e2e8f0'};
                                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${Utils.truncate(p.full_name, 18)}
                      </span>
                      ${isSuspended ? `<span style="font-size:9px;font-weight:800;
                        background:rgba(239,68,68,0.2);color:#ef4444;
                        border:1px solid rgba(239,68,68,0.4);
                        padding:1px 5px;border-radius:5px;white-space:nowrap;">
                        🚫 SUSP.
                      </span>` : ''}
                    </div>
                    ${isEditor ? `
                    <button onclick="Pages._rgEditJersey('${p.id}','${safeName}',${p.jersey_number ?? ''})"
                      style="font-size:11px;color:${color};background:none;border:none;
                             cursor:pointer;padding:0;font-weight:700;
                             text-decoration:underline dotted;line-height:1.4;">
                      #${p.jersey_number ?? '?'}
                    </button>` : `
                    <span style="font-size:11px;color:${color};font-weight:700;">#${p.jersey_number ?? '?'}</span>`}
                  </div>
                </div>
                ${isEditor ? `
                <button onclick="Pages._rgDelete('${p.id}','${safeName}')"
                  style="width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;
                         background:rgba(239,68,68,0.08);color:#fca5a5;font-size:13px;
                         flex-shrink:0;display:flex;align-items:center;justify-content:center;
                         transition:background .15s;"
                  onmouseenter="this.style.background='rgba(239,68,68,0.2)'"
                  onmouseleave="this.style.background='rgba(239,68,68,0.08)'">
                  🗑
                </button>` : ''}
              </div>`;
          }).join('')}
         </div>`;

    return `
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
                  border-top:3px solid ${color};border-radius:14px;
                  padding:16px 18px;margin-bottom:12px;">
        <!-- Cabecera del equipo -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <!-- Logo equipo (iniciales) -->
            <div style="width:42px;height:42px;border-radius:10px;flex-shrink:0;
                         background:linear-gradient(135deg,${color}22,${color}44);
                         border:1px solid ${color}44;
                         display:flex;align-items:center;justify-content:center;
                         font-size:13px;font-weight:900;color:${color};">
              ${initials}
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:#f1f5f9;">${school}</div>
              <div style="font-size:12px;color:#64748b;margin-top:1px;">
                ${Utils.sportIcon(sport)}
                <span style="color:${color};font-weight:600;">${sport}</span>
                ${cat ? `· ${cat}` : ''} ${gender ? `· ${gender}` : ''}
              </div>
            </div>
          </div>
          <!-- Badge de conteo -->
          <span style="background:${color}22;border:1px solid ${color}44;
                       color:${color};font-size:12px;font-weight:700;
                       padding:4px 12px;border-radius:20px;">
            ${teamPlayers.length} jugador${teamPlayers.length !== 1 ? 'es' : ''}
          </span>
        </div>

        ${playersHtml}
      </div>`;
  }).join('');
}

window.Pages = window.Pages || {};
window.Pages.Register = Pages.Register;
