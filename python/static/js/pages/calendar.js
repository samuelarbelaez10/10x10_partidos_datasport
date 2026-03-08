/**
 * Página: Calendario - Vista de partidos con filtros
 */
Pages.Calendar = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [matches, sports] = await Promise.all([
      Api.getMatches(),
      Api.getSports(),
    ]);

    window._calView = 'list'; // siempre inicia en lista al entrar a la página

    const render = (filtered) => {
      const countEl = document.getElementById('cal-count');
      if (countEl) countEl.textContent = `${filtered.length} partido${filtered.length !== 1 ? 's' : ''}`;
      if (window._calView === 'week') {
        _calRenderWeek(filtered);
      } else {
        document.getElementById('cal-matches-list').innerHTML = filtered.length === 0
          ? Utils.emptyState('No hay partidos con estos filtros')
          : filtered.map(m => _calMatchCard(m)).join('');
      }
    };

    window._calToggleView = (v) => {
      window._calView = v;
      document.querySelectorAll('.cal-view-btn').forEach(b => {
        b.style.background  = b.dataset.v === v ? 'white' : 'rgba(255,255,255,0.1)';
        b.style.color       = b.dataset.v === v ? 'var(--accent)' : 'white';
        b.style.fontWeight  = b.dataset.v === v ? '700' : '500';
      });
      Pages._calFilter();
    };

    const allCategories = [...new Set(matches.map(m => m.category).filter(Boolean))].sort();
    const allSchools    = [...new Set(matches.flatMap(m => [m.team1?.school?.name, m.team2?.school?.name]).filter(Boolean))].sort();
    Pages._calData = { matches, sports };

    Pages._calFilter = () => {
      const { matches: ms } = Pages._calData;
      const sport    = document.getElementById('f-sport')?.value    || '';
      const gender   = document.getElementById('f-gender')?.value   || '';
      const date     = document.getElementById('f-date')?.value     || '';
      const status   = document.getElementById('f-status')?.value   || '';
      const phase    = document.getElementById('f-phase')?.value    || '';
      const category = document.getElementById('f-category')?.value || '';
      const school   = document.getElementById('f-school')?.value   || '';
      let f = ms;
      if (sport)    f = f.filter(m => m.sport === sport);
      if (gender)   f = f.filter(m => m.gender === gender);
      if (category) f = f.filter(m => m.category === category);
      if (school)   f = f.filter(m => m.team1?.school?.name === school || m.team2?.school?.name === school);
      if (date)     f = f.filter(m => m.match_date && m.match_date.startsWith(date));
      if (status)   f = f.filter(m => m.status === status);
      if (phase === 'group')      f = f.filter(m => !m.phase || m.phase === 'group');
      if (phase === 'intergroup') f = f.filter(m => m.phase === 'intergroup');
      if (phase === 'playoff')    f = f.filter(m => m.phase === 'playoff');
      render(f);
    };

    Pages._calPrint = () => {
      const { matches: ms } = Pages._calData;
      const sport    = document.getElementById('f-sport')?.value    || '';
      const gender   = document.getElementById('f-gender')?.value   || '';
      const date     = document.getElementById('f-date')?.value     || '';
      const status   = document.getElementById('f-status')?.value   || '';
      const phase    = document.getElementById('f-phase')?.value    || '';
      const category = document.getElementById('f-category')?.value || '';
      const school   = document.getElementById('f-school')?.value   || '';
      let f = ms;
      if (sport)    f = f.filter(m => m.sport === sport);
      if (gender)   f = f.filter(m => m.gender === gender);
      if (category) f = f.filter(m => m.category === category);
      if (school)   f = f.filter(m => m.team1?.school?.name === school || m.team2?.school?.name === school);
      if (date)     f = f.filter(m => m.match_date && m.match_date.startsWith(date));
      if (status)   f = f.filter(m => m.status === status);
      if (phase === 'group')      f = f.filter(m => !m.phase || m.phase === 'group');
      if (phase === 'intergroup') f = f.filter(m => m.phase === 'intergroup');
      if (phase === 'playoff')    f = f.filter(m => m.phase === 'playoff');
      _printCalendar(f);
    };

    container.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:flex-end;justify-content:space-between;
                  margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 class="text-3xl font-black" style="color:var(--accent);">📅 Calendario</h2>
          <p class="text-gray-400 mt-1 text-sm">
            <span id="cal-count">${matches.length} partidos</span> registrados
          </p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <!-- Vista toggle -->
          <div style="display:flex;border:1px solid rgba(255,255,255,0.15);border-radius:8px;overflow:hidden;">
            <button class="cal-view-btn" data-v="list" onclick="window._calToggleView('list')"
              style="background:white;color:var(--accent);font-weight:700;
                     padding:7px 14px;font-size:13px;border:none;cursor:pointer;">
              ☰ Lista
            </button>
            <button class="cal-view-btn" data-v="week" onclick="window._calToggleView('week')"
              style="background:rgba(255,255,255,0.1);color:white;font-weight:500;
                     padding:7px 14px;font-size:13px;border:none;border-left:1px solid rgba(255,255,255,0.15);cursor:pointer;">
              📅 Semana
            </button>
          </div>
          <button onclick="Pages._calPrint()"
            style="background:var(--surface);border:1px solid var(--border);
                   color:var(--muted);border-radius:8px;padding:7px 14px;
                   font-size:13px;cursor:pointer;transition:background .15s;"
            onmouseenter="this.style.background='rgba(255,255,255,0.1)'"
            onmouseleave="this.style.background='var(--border)'">
            🖨️ Imprimir
          </button>
          ${App.canEditMatches() ? `<button class="btn-primary" onclick="_showAddMatch()">+ Agregar Partido</button>` : ''}
        </div>
      </div>

      <!-- Filtros -->
      ${Utils.wrapFilters(`
      <div class="card mb-6" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <div style="flex:1;min-width:130px;">
          <label class="text-gray-400 text-sm">Deporte</label>
          <select class="input-field mt-1" id="f-sport" onchange="Pages._calFilter();Utils.updateFilterCount('cal-filters')">
            <option value="">Todos</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:120px;">
          <label class="text-gray-400 text-sm">Género</label>
          <select class="input-field mt-1" id="f-gender" onchange="Pages._calFilter();Utils.updateFilterCount('cal-filters')">
            <option value="">Todos</option>
            <option>Masculino</option><option>Femenino</option><option>Mixto</option>
          </select>
        </div>
        <div style="flex:1;min-width:130px;">
          <label class="text-gray-400 text-sm">Fecha</label>
          <input type="date" class="input-field mt-1" id="f-date" onchange="Pages._calFilter();Utils.updateFilterCount('cal-filters')">
        </div>
        <div style="flex:1;min-width:120px;">
          <label class="text-gray-400 text-sm">Estado</label>
          <select class="input-field mt-1" id="f-status" onchange="Pages._calFilter();Utils.updateFilterCount('cal-filters')">
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="live">En Vivo</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>
        <div style="flex:1;min-width:130px;">
          <label class="text-gray-400 text-sm">Fase</label>
          <select class="input-field mt-1" id="f-phase" onchange="Pages._calFilter();Utils.updateFilterCount('cal-filters')">
            <option value="">Todas</option>
            <option value="group">🏟️ Fase de Grupos</option>
            <option value="intergroup">🔀 Intergrupo</option>
            <option value="playoff">🏅 Fase Final</option>
          </select>
        </div>
        <div style="flex:1;min-width:130px;">
          <label class="text-gray-400 text-sm">Categoría</label>
          <select class="input-field mt-1" id="f-category" onchange="Pages._calFilter();Utils.updateFilterCount('cal-filters')">
            <option value="">Todas</option>
            ${allCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:140px;">
          <label class="text-gray-400 text-sm">Colegio</label>
          <select class="input-field mt-1" id="f-school" onchange="Pages._calFilter();Utils.updateFilterCount('cal-filters')">
            <option value="">Todos</option>
            ${allSchools.map(s => `<option value="${s}">${Utils.truncate(s,28)}</option>`).join('')}
          </select>
        </div>
        <button class="btn-ghost" style="padding:8px 14px;white-space:nowrap;" onclick="
          ['f-sport','f-gender','f-date','f-status','f-phase','f-category','f-school'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
          });
          Pages._calFilter();Utils.updateFilterCount('cal-filters');
        ">🔄 Limpiar</button>
      </div>
      `, 'cal-filters')}

      <div id="cal-matches-list"></div>
    `;

    render(matches);

    // Modal agregar partido (carga equipos al abrir)
    window._showAddMatch = async function() {
      Utils.showModal(`
        <h3 class="text-xl font-bold mb-4">➕ Agregar Partido</h3>
        <div class="grid gap-3">
          <div>
            <label class="text-gray-400 text-sm">Equipo Local</label>
            <select class="input-field mt-1" id="nm-t1"><option value="">Cargando…</option></select>
          </div>
          <div>
            <label class="text-gray-400 text-sm">Equipo Visitante</label>
            <select class="input-field mt-1" id="nm-t2"><option value="">Cargando…</option></select>
          </div>
          <div>
            <label class="text-gray-400 text-sm">Fecha y Hora</label>
            <input type="datetime-local" class="input-field mt-1" id="nm-date"
              value="${new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}">
          </div>
          <div>
            <label class="text-gray-400 text-sm">Escenario</label>
            <select class="input-field mt-1" id="nm-loc">
              <option value="">Cargando escenarios...</option>
            </select>
          </div>
          <button class="btn-primary mt-2" onclick="Pages._saveNewMatch()">Guardar Partido</button>
        </div>
      `);
      try {
        const [ts, venuesList] = await Promise.all([Api.getTeams(), Api.getVenues()]);
        // Cargar escenarios en el select
        const locSel = document.getElementById('nm-loc');
        if (locSel) {
          let locOpts = '<option value="">-- Seleccionar escenario --</option>';
          venuesList.forEach(v => { locOpts += '<option value="' + v.name + '">' + v.name + '</option>'; });
          locSel.innerHTML = locOpts;
        }
        // Guardar mapa id→team para derivar sport_id/category_id al guardar
        window._calTeamsMap = {};
        ts.forEach(t => { window._calTeamsMap[t.id] = t; });
        const mkOpt = t => {
          const sid = t.sport_id || t.sport?.id || '';
          const cid = t.category_id || t.category?.id || '';
          const label = `${t.school?.name || t.name || ''} — ${t.sport?.name || ''} ${t.category?.name || ''} ${t.gender || ''}`;
          return `<option value="${t.id}" data-sport="${sid}" data-cat="${cid}">${label}</option>`;
        };
        const opts = ts.map(mkOpt).join('');
        document.getElementById('nm-t1').innerHTML = opts;
        document.getElementById('nm-t2').innerHTML = opts;
        // Seleccionar opciones distintas por defecto
        if (ts.length >= 2) document.getElementById('nm-t2').selectedIndex = 1;
      } catch(e) {
        document.getElementById('nm-t1').innerHTML = '<option>Error cargando equipos</option>';
        document.getElementById('nm-t2').innerHTML = '<option>Error cargando equipos</option>';
      }
    };

    Pages._saveNewMatch = async function() {
      const t1  = document.getElementById('nm-t1')?.value;
      const t2  = document.getElementById('nm-t2')?.value;
      const dtv = document.getElementById('nm-date')?.value;
      const loc = document.getElementById('nm-loc')?.value?.trim();

      if (!t1 || !t2 || t1 === t2) {
        Utils.toast('Selecciona dos equipos distintos', 'error'); return;
      }
      if (!dtv) {
        Utils.toast('Selecciona fecha y hora', 'error'); return;
      }

      // Derivar sport_id y category_id del option seleccionado (data-sport / data-cat)
      const selEl      = document.getElementById('nm-t1');
      const selOpt     = selEl?.options[selEl?.selectedIndex];
      const sport_id   = selOpt?.dataset?.sport || window._calTeamsMap?.[t1]?.sport_id || window._calTeamsMap?.[t1]?.sport?.id || '';
      const category_id = selOpt?.dataset?.cat  || window._calTeamsMap?.[t1]?.category_id || window._calTeamsMap?.[t1]?.category?.id || '';

      if (!sport_id || !category_id) {
        Utils.toast('No se pudo determinar el deporte/categoría. Reintenta.', 'error'); return;
      }

      try {
        await Api.createMatch({
          team_a:      t1,
          team_b:      t2,
          sport_id,
          category_id,
          match_date:  dtv + ':00-05:00',
          location:    loc || 'Por definir',
          status:      'pending',
        });
        Utils.closeModal();
        Utils.toast('Partido creado');
        App.navigate('calendar');
      } catch(e) {
        Utils.toast(e.message || 'Error al crear partido', 'error');
      }
    };

    Pages._calEditMatch = async function(matchId) {
      const m = Pages._calData.matches.find(x => x.id === matchId);
      if (!m) return;
      const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
      const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
      const currentDt = m.match_date ? m.match_date.slice(0, 16) : '';
      const currentLoc = m.location || '';

      Utils.showModal(`
        <h3 class="text-xl font-bold mb-2">✏️ Editar Partido</h3>
        <p style="color:var(--muted);font-size:14px;margin-bottom:16px;">
          ${Utils.truncate(s1, 25)} vs ${Utils.truncate(s2, 25)}
        </p>
        <div class="grid gap-3">
          <div>
            <label class="text-gray-400 text-sm">Fecha y Hora</label>
            <input type="datetime-local" class="input-field mt-1" id="em-date" value="${currentDt}">
          </div>
          <div>
            <label class="text-gray-400 text-sm">Escenario</label>
            <select class="input-field mt-1" id="em-loc">
              <option value="">Cargando escenarios...</option>
            </select>
          </div>
          <button class="btn-primary mt-2" onclick="Pages._calSaveEdit('${matchId}')">
            💾 Guardar cambios
          </button>
        </div>
      `);

      try {
        const venues = await Api.getVenues();
        const sel = document.getElementById('em-loc');
        if (!sel) return;
        let opts = '<option value="">-- Seleccionar escenario --</option>';
        venues.forEach(v => {
          const selected = (currentLoc === v.name) ? ' selected' : '';
          opts += '<option value="' + v.name + '"' + selected + '>' + v.name + '</option>';
        });
        if (currentLoc && !venues.find(v => v.name === currentLoc)) {
          opts += '<option value="' + currentLoc + '" selected>' + currentLoc + ' (actual)</option>';
        }
        sel.innerHTML = opts;
      } catch(e) {
        const sel = document.getElementById('em-loc');
        if (sel) sel.innerHTML = '<option value="' + currentLoc + '">' + (currentLoc || 'Por definir') + '</option>';
      }
    };

    Pages._calSaveEdit = async function(matchId) {
      const dtVal  = document.getElementById('em-date')?.value  || '';
      const locVal = document.getElementById('em-loc')?.value   ?? '';

      if (!dtVal) {
        Utils.toast('Selecciona fecha y hora', 'error'); return;
      }

      const payload = {
        match_date: dtVal + ':00-05:00',
        location:   locVal,
      };

      try {
        await Api.updateMatch(matchId, payload);
        // Actualizar datos locales
        const m = Pages._calData.matches.find(x => x.id === matchId);
        if (m) {
          m.match_date = payload.match_date;
          m.location   = locVal;
        }
        Utils.closeModal();
        Utils.toast('Partido actualizado');
        Pages._calFilter();
      } catch(e) {
        Utils.toast(e.message, 'error');
      }
    };

    Pages._calDeleteMatch = async function(matchId) {
      const m = Pages._calData.matches.find(x => x.id === matchId);
      if (!m) return;
      const s1 = m.team1?.school?.name || 'Equipo 1';
      const s2 = m.team2?.school?.name || 'Equipo 2';
      if (!confirm(`¿Eliminar el partido ${s1} vs ${s2}?\n\nEsta acción no se puede deshacer.`)) return;
      try {
        await Api.deleteMatch(matchId);
        // Quitar de datos locales y refrescar
        Pages._calData.matches = Pages._calData.matches.filter(x => x.id !== matchId);
        Pages._calFilter();
        Utils.toast('Partido eliminado');
      } catch(e) {
        Utils.toast(e.message || 'Error al eliminar', 'error');
      }
    };

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

function _calPhaseBadge(m) {
  const phase     = m.phase || '';
  const groupName = m.group_name || '';

  if (phase === 'playoff' || phase === 'final') {
    const p = groupName.toLowerCase();
    let icon = '🏅', color = '#f59e0b', bg = 'rgba(245,158,11,0.12)', border = 'rgba(245,158,11,0.3)';
    if (p.includes('final') && !p.includes('semi'))   { icon = '🏆'; color = '#fbbf24'; bg = 'rgba(251,191,36,0.12)'; border = 'rgba(251,191,36,0.3)'; }
    else if (p.includes('semi'))                       { icon = '🥈'; color = '#c084fc'; bg = 'rgba(192,132,252,0.12)'; border = 'rgba(192,132,252,0.3)'; }
    else if (p.includes('cuarto'))                     { icon = '⚔️'; color = 'var(--accent)'; bg = 'rgba(96,165,250,0.12)'; border = 'rgba(96,165,250,0.3)'; }
    else if (p.includes('bronce') || p.includes('3er')){ icon = '🥉'; color = '#cd7f32'; bg = 'rgba(205,127,50,0.12)'; border = 'rgba(205,127,50,0.3)'; }
    const label = groupName || 'Fase Final';
    return `<span style="background:${bg};color:${color};border:1px solid ${border};
                         border-radius:20px;font-size:10px;font-weight:700;
                         padding:2px 8px;white-space:nowrap;">${icon} ${label}</span>`;
  }
  if (phase === 'intergroup') {
    return `<span style="background:rgba(167,139,250,0.1);color:var(--purple);border:1px solid rgba(167,139,250,0.25);
                         border-radius:20px;font-size:10px;font-weight:700;padding:2px 8px;">🔀 Intergrupo</span>`;
  }
  if (groupName && groupName !== '') {
    return `<span style="background:rgba(100,116,139,0.12);color:var(--muted);border:1px solid rgba(100,116,139,0.2);
                         border-radius:20px;font-size:10px;font-weight:600;padding:2px 8px;">Grupo ${groupName}</span>`;
  }
  return '';
}

function _calMatchCard(m) {
  const s1 = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
  const s2 = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
  const sport = m.sport || '';
  const statusBadge = Utils.statusBadge(m.status);
  const date = Utils.formatDateTime(m.match_date);
  const icon = Utils.sportIcon(sport);
  const phaseBadge = _calPhaseBadge(m);

  let actions = '';
  if (App.canEditMatches()) {
    actions += `<button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="Pages._calEditMatch('${m.id}')">✏️ Editar</button>`;
  }
  if (m.status === 'live') {
    actions += `<button class="btn-primary" style="font-size:12px;padding:6px 12px;" onclick="App.navigate('liveScoring',{matchId:'${m.id}'})">🔴 En Vivo</button>`;
  } else if ((m.status === 'scheduled' || m.status === 'pending') && App.canEditMatches()) {
    actions += `<button class="btn-ghost" style="font-size:12px;padding:6px 12px;" onclick="App.navigate('liveScoring',{matchId:'${m.id}'})">▶️ Gestionar</button>`;
  }
  if (m.status === 'finished') {
    actions += `<button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="App.navigate('results',{matchId:'${m.id}'})">📊 Resultado</button>`;
  }
  if (App.isEditor()) {
    actions += `<button class="btn-danger" style="font-size:12px;padding:6px 10px;" onclick="Pages._calDeleteMatch('${m.id}')">🗑️ Eliminar</button>`;
  }

  return `
    <div class="card mb-3" style="border-left: 4px solid ${Utils.sportColor(sport)};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            ${icon} ${sport} &bull; ${m.gender || ''} &bull; ${m.category || ''}
            ${phaseBadge}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:700;font-size:14px;">${Utils.truncate(s1, 20)}</span>
            <span style="font-weight:900;font-size:20px;color:var(--accent);padding:2px 10px;background:rgba(96,165,250,0.1);border-radius:8px;">${m.team1_score ?? 0} - ${m.team2_score ?? 0}</span>
            <span style="font-weight:700;font-size:14px;">${Utils.truncate(s2, 20)}</span>
          </div>
          <div style="margin-top:6px;font-size:11px;color:var(--muted);">📅 ${date} &bull; 📍 ${m.location || 'Por definir'}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
          ${statusBadge}
          ${actions}
        </div>
      </div>
    </div>`;
}

function _calRenderWeek(filtered) {
  const el = document.getElementById('cal-matches-list');
  if (!el) return;

  if (filtered.length === 0) {
    el.innerHTML = Utils.emptyState('No hay partidos con estos filtros');
    return;
  }

  // Agrupar por fecha (YYYY-MM-DD)
  const byDate = {};
  filtered.forEach(m => {
    const d = m.match_date ? m.match_date.slice(0, 10) : 'sin-fecha';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  });

  const dates = Object.keys(byDate).sort();
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const cols = dates.map(d => {
    let dayHeader;
    if (d === 'sin-fecha') {
      dayHeader = `<div style="font-weight:700;font-size:13px;color:var(--muted);">Sin fecha</div>`;
    } else {
      const dt = new Date(d + 'T12:00:00');
      dayHeader = `
        <div style="font-weight:800;font-size:14px;color:var(--accent);">${DAY_NAMES[dt.getDay()]}</div>
        <div style="font-size:12px;color:var(--muted);">${dt.getDate()}/${dt.getMonth() + 1}</div>`;
    }

    const cards = byDate[d]
      .sort((a, b) => (a.match_date || '').localeCompare(b.match_date || ''))
      .map(m => {
        const s1     = m.team1?.name || m.team1?.school?.name || 'Equipo 1';
        const s2     = m.team2?.name || m.team2?.school?.name || 'Equipo 2';
        const time   = m.match_date ? m.match_date.slice(11, 16) : '';
        const sc     = (m.status === 'finished' || m.status === 'live')
          ? `${m.team1_score ?? 0}–${m.team2_score ?? 0}` : 'vs';
        const color  = Utils.sportColor(m.sport);
        const icon   = Utils.sportIcon(m.sport);
        const target = m.status === 'live' ? 'liveScoring'
          : m.status === 'finished' ? 'results' : 'calendar';

        let statusDot = '';
        if (m.status === 'live')     statusDot = `<span style="display:inline-block;width:7px;height:7px;background:var(--accent2);border-radius:50%;animation:pulse 1.2s infinite;margin-right:4px;vertical-align:middle;"></span>`;
        if (m.status === 'finished') statusDot = `<span style="color:#16a34a;font-size:10px;font-weight:700;">✓ </span>`;

        return `
          <div onclick="App.navigate('${target}',{matchId:'${m.id}'})"
            style="background:rgba(30,41,59,0.8);border-left:3px solid ${color};
                   border-radius:8px;padding:10px;margin-bottom:8px;cursor:pointer;
                   transition:background .15s;"
            onmouseenter="this.style.background='rgba(30,41,59,1)'"
            onmouseleave="this.style.background='rgba(30,41,59,0.8)'">
            ${time ? `<div style="font-size:11px;color:var(--muted);margin-bottom:4px;">${statusDot}${time}</div>` : ''}
            <div style="font-size:10px;color:var(--muted);margin-bottom:5px;">${icon} ${Utils.truncate(m.sport || '', 14)}</div>
            <div style="font-weight:700;font-size:12px;line-height:1.3;">${Utils.truncate(s1, 20)}</div>
            <div style="font-weight:900;font-size:17px;color:var(--accent);text-align:center;padding:4px 0;">${sc}</div>
            <div style="font-weight:700;font-size:12px;line-height:1.3;">${Utils.truncate(s2, 20)}</div>
            ${m.location ? `<div style="font-size:10px;color:var(--muted);margin-top:5px;">📍 ${Utils.truncate(m.location, 22)}</div>` : ''}
          </div>`;
      }).join('');

    return `
      <div style="min-width:170px;flex:1;">
        <div style="text-align:center;padding:8px 4px;background:rgba(96,165,250,0.08);
                    border-radius:8px;margin-bottom:10px;border-bottom:2px solid var(--accent);">
          ${dayHeader}
        </div>
        ${cards || '<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px 8px;">–</div>'}
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;align-items:flex-start;">
      ${cols}
    </div>`;
}

function _printCalendar(matches) {
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const faseLabel = m => {
    const ph = m.phase || 'group';
    const gn = m.group_name || '';
    if (ph === 'group' && gn)   return `Grupo ${gn}`;
    if (ph === 'intergroup')    return 'Intergrupo';
    if (ph === 'playoff' && gn) return gn;
    if (ph === 'playoff')       return 'Fase Final';
    if (gn)                     return `Grupo ${gn}`;
    return 'Fase de Grupos';
  };

  const escenario = loc => {
    if (!loc) return '—';
    return loc.includes(' — ') ? loc.split(' — ')[0] : loc;
  };

  const sorted = [...matches].sort((a, b) => (a.match_date || '').localeCompare(b.match_date || ''));

  const rows = sorted.map((m, idx) => {
    const s1 = m.team1?.name || m.team1?.school?.name || 'POR DEFINIR';
    const s2 = m.team2?.name || m.team2?.school?.name || 'POR DEFINIR';
    const dt    = m.match_date ? new Date(m.match_date) : null;
    const fecha = dt ? `${DAY_NAMES[dt.getDay()]} ${dt.getDate()}` : '—';
    const hora  = m.match_date ? m.match_date.slice(11, 16) : '—';
    const marca = (m.status === 'finished' || m.status === 'live')
      ? `${m.team1_score ?? 0} - ${m.team2_score ?? 0}` : '';

    return `<tr>
      <td style="text-align:center;color:#666;">${idx + 1}</td>
      <td style="white-space:nowrap;">${fecha}</td>
      <td style="white-space:nowrap;font-weight:700;">${hora}</td>
      <td><strong>${s1}</strong></td>
      <td><strong>${s2}</strong></td>
      <td style="color:#555;font-size:11px;">${escenario(m.location)}</td>
      <td style="font-weight:600;">${faseLabel(m)}</td>
      <td style="text-align:center;font-weight:700;">${marca}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Calendario — Big Games 2026</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: white; padding: 16px; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #1d4ed8; }
    p.sub { color: #666; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1d4ed8; color: white; padding: 8px 6px; text-align: left;
         font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 7px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8faff; }
    tr:hover td { background: #eff6ff; }
    @media print { body { padding: 0; } button { display: none !important; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
    <div>
      <h1>📅 Calendario de Partidos — Big Games 2026</h1>
      <p class="sub">${matches.length} partido${matches.length !== 1 ? 's' : ''} · Generado ${new Date().toLocaleString('es-CO')}</p>
    </div>
    <button onclick="window.print()"
      style="background:#1d4ed8;color:white;border:none;border-radius:6px;
             padding:8px 16px;cursor:pointer;font-size:13px;">
      🖨️ Imprimir
    </button>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th style="width:60px;">Fecha</th>
        <th style="width:55px;">Hora</th>
        <th>Local</th>
        <th>Visitante</th>
        <th>Escenario</th>
        <th style="width:90px;">Fase</th>
        <th style="width:80px;text-align:center;">Marcador</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

window.Pages = Pages;
