/**
 * Página: Estadísticas
 * Flujo: primero filtrar por deporte → luego aparecen tabs específicas del deporte
 */
Pages.Statistics = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [playerStats, teamStats] = await Promise.all([
      Api.getPlayerStats(),
      Api.getTeamStats(),
    ]);

    // ── Enriquecer jugadores con category/gender de su equipo ────────────────
    const byTeamId = {}, byTeamName = {};
    teamStats.forEach(t => {
      const info = { category: t.category || '', gender: t.gender || '' };
      if (t.team_id)   byTeamId[t.team_id]     = info;
      if (t.team_name) byTeamName[t.team_name]  = info;
    });
    playerStats.forEach(p => {
      const info = byTeamId[p.team_id] || byTeamName[p.team_name] || {};
      p._category = p.category || info.category || '';
      p._gender   = p.gender   || info.gender   || '';
    });

    const allSports  = [...new Set(teamStats.map(t => t.sport).filter(Boolean))]
      .filter(s => !s.toLowerCase().includes('voleibol'))
      .sort();
    const allSchools = [...new Set(teamStats.map(t => t.school).filter(Boolean))].sort();
    const filters    = { sport: '', category: '', gender: '', school: '' };
    let activeTab   = '';

    // ── Tabs por deporte ──────────────────────────────────────────────────────
    function tabsFor(sport) {
      const s = (sport || '').toLowerCase();
      if (s.includes('fútbol') || s.includes('futbol') || s.includes('softbol')) {
        return [
          { id: 'scorers',  label: '⚽ Goles'      },
          { id: 'cards',    label: '🟨 Tarjetas'   },
          { id: 'teams',    label: '👥 Por Equipo' },
        ];
      }
      if (s.includes('baloncesto')) {
        return [
          { id: 'scorers',  label: '🏀 Canastas'   },
          { id: 'fouls',    label: '❌ Faltas'     },
          { id: 'blocks',   label: '🚫 Bloqueos'   },
          { id: 'teams',    label: '👥 Por Equipo' },
        ];
      }
      // Voleibol y otros: solo tabla de equipos
      return [
        { id: 'teams',      label: '👥 Por Equipo' },
      ];
    }

    // ── Helpers dropdowns ─────────────────────────────────────────────────────
    function categoriesFor(sport) {
      const base = sport ? teamStats.filter(t => t.sport === sport) : teamStats;
      return [...new Set(base.map(t => t.category).filter(Boolean))].sort();
    }
    function gendersFor(sport, category) {
      return [...new Set(
        teamStats
          .filter(t => (!sport || t.sport === sport) && (!category || t.category === category))
          .map(t => t.gender).filter(Boolean)
      )].sort();
    }
    function fillSelect(id, options, selected, placeholder) {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = `<option value="">${placeholder}</option>` +
        options.map(o => `<option value="${o}"${selected === o ? ' selected' : ''}>${o}</option>`).join('');
    }
    function refreshDropdowns() {
      fillSelect('flt-sport',    allSports,                                  filters.sport,    'Selecciona un deporte…');
      fillSelect('flt-category', categoriesFor(filters.sport),               filters.category, 'Todas las categorías');
      fillSelect('flt-gender',   gendersFor(filters.sport, filters.category),filters.gender,   'Todos los géneros');
    }

    // ── Helper: sport_stats de jugadores filtrados ────────────────────────────
    function filteredSS() {
      const result = [];
      playerStats.forEach(p => {
        if (filters.category && p._category !== filters.category) return;
        if (filters.gender   && p._gender   !== filters.gender)   return;
        if (filters.school   && p.school    !== filters.school)   return;
        const ss = (p.sport_stats || []).find(s => s.sport === filters.sport);
        if (ss) result.push({ ...ss, name: p.name, school: p.school });
      });
      return result;
    }

    // ── Tabla genérica de ranking ─────────────────────────────────────────────
    function rankTable(rows, columns) {
      // columns: [{ label, key, color?, size? }]
      return `
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="color:var(--muted);font-size:12px;text-align:left;">
            <th style="padding:6px 10px;">#</th>
            <th>Jugador</th><th>Colegio</th>
            ${columns.map(c => `<th style="text-align:center;">${c.label}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${rows.map((p, i) => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:8px 10px;color:#f59e0b;font-weight:700;">${i + 1}</td>
                <td style="padding:8px 10px;font-weight:600;">${p.name}</td>
                <td style="padding:8px 10px;color:var(--muted);">${Utils.truncate(p.school, 22)}</td>
                ${columns.map(c => `
                  <td style="padding:8px 10px;text-align:center;font-weight:${c.bold ? '900' : '700'};
                      font-size:${c.bold ? '18px' : '14px'};color:${c.color || 'var(--text)'};">
                    ${p[c.key] ?? 0}
                  </td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>`;
    }

    // ── Renderers por tipo ────────────────────────────────────────────────────

    function renderScorers(el) {
      const sport = filters.sport;
      const color = Utils.sportColor(sport);
      const s     = sport.toLowerCase();
      const isBasket = s.includes('baloncesto');

      const list = filteredSS()
        .filter(p => (p.score || 0) > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 25);

      if (!list.length) { el.innerHTML = Utils.emptyState('Sin anotaciones registradas'); return; }

      const term = list[0]?.score_term || 'Puntos';
      const cols = isBasket
        ? [{ label: '3pts', key: 'three_pointers', color: 'var(--muted)' },
           { label: term,   key: 'score',          color,           bold: true }]
        : [{ label: term,   key: 'score',          color,           bold: true }];

      el.innerHTML = rankTable(list, cols);
    }

    function renderAssists(el) {
      const color = Utils.sportColor(filters.sport);
      const list  = filteredSS()
        .filter(p => (p.assists || 0) > 0)
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 25);

      if (!list.length) { el.innerHTML = Utils.emptyState('Sin asistencias registradas'); return; }
      el.innerHTML = rankTable(list, [{ label: 'Asistencias', key: 'assists', color, bold: true }]);
    }

    function renderCards(el) {
      const list = playerStats.filter(p => {
        if ((p.total_cards || 0) === 0) return false;
        if (filters.category && p._category !== filters.category) return false;
        if (filters.gender   && p._gender   !== filters.gender)   return false;
        if (filters.school   && p.school    !== filters.school)   return false;
        return (p.sport_stats || []).some(ss => ss.sport === filters.sport);
      }).sort((a, b) => b.total_cards - a.total_cards).slice(0, 30);

      if (!list.length) { el.innerHTML = Utils.emptyState('Sin tarjetas registradas'); return; }

      el.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="color:var(--muted);font-size:12px;text-align:left;">
            <th style="padding:8px;">#</th>
            <th>Jugador</th><th>Colegio</th>
            <th style="text-align:center;">🟨</th>
            <th style="text-align:center;">🟥</th>
            <th style="text-align:center;">Total</th>
          </tr></thead>
          <tbody>
            ${list.map((p, i) => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:8px 10px;color:#f59e0b;font-weight:700;">${i + 1}</td>
                <td style="padding:8px 10px;font-weight:600;">${p.name}</td>
                <td style="padding:8px 10px;color:var(--muted);">${Utils.truncate(p.school, 22)}</td>
                <td style="padding:8px 10px;text-align:center;color:#fbbf24;font-weight:700;">${p.yellow_cards}</td>
                <td style="padding:8px 10px;text-align:center;color:var(--accent2);font-weight:700;">${p.red_cards}</td>
                <td style="padding:8px 10px;text-align:center;font-weight:900;font-size:16px;">${p.total_cards}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    }

    function renderFouls(el) {
      const list = filteredSS()
        .map(p => ({ ...p, total: (p.personal_fouls || 0) + (p.technical_fouls || 0) }))
        .filter(p => p.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 25);

      if (!list.length) { el.innerHTML = Utils.emptyState('Sin faltas registradas'); return; }

      el.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="color:var(--muted);font-size:12px;text-align:left;">
            <th style="padding:8px;">#</th>
            <th>Jugador</th><th>Colegio</th>
            <th style="text-align:center;">Personales</th>
            <th style="text-align:center;">Técnicas</th>
            <th style="text-align:center;">Total</th>
          </tr></thead>
          <tbody>
            ${list.map((p, i) => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:8px 10px;color:#f59e0b;font-weight:700;">${i + 1}</td>
                <td style="padding:8px 10px;font-weight:600;">${p.name}</td>
                <td style="padding:8px 10px;color:var(--muted);">${Utils.truncate(p.school, 22)}</td>
                <td style="padding:8px 10px;text-align:center;color:#fb923c;font-weight:700;">${p.personal_fouls || 0}</td>
                <td style="padding:8px 10px;text-align:center;color:var(--accent2);font-weight:700;">${p.technical_fouls || 0}</td>
                <td style="padding:8px 10px;text-align:center;font-weight:900;font-size:16px;">${p.total}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    }

    function renderBlocks(el) {
      const color = Utils.sportColor(filters.sport);
      const list  = filteredSS()
        .filter(p => (p.blocks || 0) > 0)
        .sort((a, b) => b.blocks - a.blocks)
        .slice(0, 25);

      if (!list.length) { el.innerHTML = Utils.emptyState('Sin bloqueos registrados'); return; }
      el.innerHTML = rankTable(list, [{ label: 'Bloqueos', key: 'blocks', color, bold: true }]);
    }

    function renderAces(el) {
      const color = Utils.sportColor(filters.sport);
      const list  = filteredSS()
        .filter(p => (p.aces_count || 0) > 0)
        .sort((a, b) => b.aces_count - a.aces_count)
        .slice(0, 25);

      if (!list.length) { el.innerHTML = Utils.emptyState('Sin aces registrados'); return; }
      el.innerHTML = rankTable(list, [{ label: 'Aces', key: 'aces_count', color, bold: true }]);
    }

    function renderTeams(el) {
      const groups = {};
      teamStats.forEach(t => {
        if ((t.matches_played || 0) === 0) return;
        if (filters.sport    && t.sport    !== filters.sport)    return;
        if (filters.category && t.category !== filters.category) return;
        if (filters.gender   && t.gender   !== filters.gender)   return;
        if (filters.school   && t.school   !== filters.school)   return;
        const key = `${t.sport}||${t.category}||${t.gender}`;
        if (!groups[key]) groups[key] = { sport: t.sport, category: t.category, gender: t.gender, teams: [] };
        groups[key].teams.push(t);
      });

      const keys = Object.keys(groups).sort();
      if (!keys.length) { el.innerHTML = Utils.emptyState('Sin partidos disputados'); return; }
      el.innerHTML = keys.map(k => teamGroupHTML(groups[k])).join('');
    }

    function teamGroupHTML({ sport, category, gender, teams }) {
      const color  = Utils.sportColor(sport);
      const s      = sport.toLowerCase();
      const sorted = [...teams].sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference);

      const diffTd = t => {
        const v = t.goal_difference || 0;
        return `<td style="padding:6px;text-align:center;color:${v >= 0 ? 'var(--green)' : 'var(--accent2)'};">
          ${v > 0 ? '+' : ''}${v}</td>`;
      };
      const ptsTd = t =>
        `<td style="padding:6px;text-align:center;font-weight:900;font-size:16px;color:var(--accent);">${t.points}</td>`;

      let h, rowFn;
      if (s.includes('fútbol') || s.includes('futbol') || s.includes('softbol')) {
        h = `<th style="padding:6px 10px;text-align:left;">Colegio</th>
          <th>PJ</th><th style="color:var(--green)">PG</th><th>PE</th><th style="color:var(--accent2)">PP</th>
          <th>GF</th><th>GC</th><th>DIF</th><th style="color:var(--accent);font-size:15px">PTS</th>`;
        rowFn = t => `
          <td style="padding:8px 10px;font-weight:600;">${Utils.truncate(t.school, 22)}</td>
          <td style="padding:6px;text-align:center;">${t.matches_played}</td>
          <td style="padding:6px;text-align:center;color:var(--green);font-weight:700;">${t.wins}</td>
          <td style="padding:6px;text-align:center;color:var(--muted);">${t.draws}</td>
          <td style="padding:6px;text-align:center;color:var(--accent2);">${t.losses}</td>
          <td style="padding:6px;text-align:center;">${t.goals_for}</td>
          <td style="padding:6px;text-align:center;">${t.goals_against}</td>
          ${diffTd(t)}${ptsTd(t)}`;
      } else if (s.includes('baloncesto')) {
        h = `<th style="padding:6px 10px;text-align:left;">Colegio</th>
          <th>PJ</th><th style="color:var(--green)">PG</th><th style="color:var(--accent2)">PP</th>
          <th>PF</th><th>PC</th><th>DIF</th><th style="color:var(--accent);font-size:15px">PTS</th>`;
        rowFn = t => `
          <td style="padding:8px 10px;font-weight:600;">${Utils.truncate(t.school, 22)}</td>
          <td style="padding:6px;text-align:center;">${t.matches_played}</td>
          <td style="padding:6px;text-align:center;color:var(--green);font-weight:700;">${t.wins}</td>
          <td style="padding:6px;text-align:center;color:var(--accent2);">${t.losses}</td>
          <td style="padding:6px;text-align:center;">${t.goals_for}</td>
          <td style="padding:6px;text-align:center;">${t.goals_against}</td>
          ${diffTd(t)}${ptsTd(t)}`;
      } else if (s.includes('voleibol')) {
        h = `<th style="padding:6px 10px;text-align:left;">Colegio</th>
          <th>PJ</th><th style="color:var(--green)">PG</th><th style="color:var(--accent2)">PP</th>
          <th>SF</th><th>SC</th><th>DS</th><th style="color:var(--accent);font-size:15px">PTS</th>`;
        rowFn = t => `
          <td style="padding:8px 10px;font-weight:600;">${Utils.truncate(t.school, 22)}</td>
          <td style="padding:6px;text-align:center;">${t.matches_played}</td>
          <td style="padding:6px;text-align:center;color:var(--green);font-weight:700;">${t.wins}</td>
          <td style="padding:6px;text-align:center;color:var(--accent2);">${t.losses}</td>
          <td style="padding:6px;text-align:center;">${t.goals_for}</td>
          <td style="padding:6px;text-align:center;">${t.goals_against}</td>
          ${diffTd(t)}${ptsTd(t)}`;
      } else {
        h = `<th style="padding:6px 10px;text-align:left;">Colegio</th>
          <th>PJ</th><th style="color:var(--green)">PG</th><th style="color:var(--accent2)">PP</th>
          <th>PF</th><th>PC</th><th>DIF</th><th style="color:var(--accent);font-size:15px">PTS</th>`;
        rowFn = t => `
          <td style="padding:8px 10px;font-weight:600;">${Utils.truncate(t.school, 22)}</td>
          <td style="padding:6px;text-align:center;">${t.matches_played}</td>
          <td style="padding:6px;text-align:center;color:var(--green);font-weight:700;">${t.wins}</td>
          <td style="padding:6px;text-align:center;color:var(--accent2);">${t.losses}</td>
          <td style="padding:6px;text-align:center;">${t.goals_for}</td>
          <td style="padding:6px;text-align:center;">${t.goals_against}</td>
          ${diffTd(t)}${ptsTd(t)}`;
      }

      return `
        <div style="margin-bottom:32px;">
          <h3 style="font-size:18px;font-weight:800;color:${color};margin-bottom:12px;">
            ${Utils.sportIcon(sport)} ${sport} — ${category} ${gender}
          </h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="color:var(--muted);font-size:11px;text-align:center;">${h}</tr></thead>
            <tbody>
              ${sorted.map(t => `<tr style="border-bottom:1px solid var(--border);">${rowFn(t)}</tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    // ── Dispatch por tab ──────────────────────────────────────────────────────
    function renderTab(tab, el) {
      if      (tab === 'scorers') renderScorers(el);
      else if (tab === 'assists') renderAssists(el);
      else if (tab === 'cards')   renderCards(el);
      else if (tab === 'fouls')   renderFouls(el);
      else if (tab === 'blocks')  renderBlocks(el);
      else if (tab === 'aces')    renderAces(el);
      else if (tab === 'teams')   renderTeams(el);
    }

    // ── Construir sección de tabs cuando se elige deporte ────────────────────
    function buildTabs() {
      const sport   = filters.sport;
      const tabList = tabsFor(sport);

      // Mantener tab activa si es válida para este deporte, si no → primera
      if (!activeTab || !tabList.find(t => t.id === activeTab)) {
        activeTab = tabList[0].id;
      }

      const tabsEl   = document.getElementById('stat-tabs');
      const contentEl = document.getElementById('stat-content');
      if (!tabsEl || !contentEl) return;

      tabsEl.innerHTML = tabList.map(t => `
        <button class="nav-tab stat-tab${activeTab === t.id ? ' active' : ''}" data-tab="${t.id}">
          ${t.label}
        </button>`).join('');

      tabsEl.querySelectorAll('.stat-tab').forEach(btn => {
        btn.addEventListener('click', function () {
          activeTab = this.dataset.tab;
          tabsEl.querySelectorAll('.stat-tab').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          renderTab(activeTab, contentEl);
        });
      });

      renderTab(activeTab, contentEl);
    }

    function showPrompt() {
      const tabsEl    = document.getElementById('stat-tabs');
      const contentEl = document.getElementById('stat-content');
      if (tabsEl)    tabsEl.innerHTML = '';
      if (contentEl) contentEl.innerHTML = `
        <div style="text-align:center;padding:52px 20px;color:var(--muted);">
          <div style="font-size:44px;margin-bottom:14px;">🏅</div>
          <div style="font-size:16px;font-weight:600;color:var(--muted);margin-bottom:6px;">
            Selecciona un deporte para ver las estadísticas
          </div>
          <div style="font-size:13px;">Usa el filtro de arriba para comenzar</div>
        </div>`;
    }

    // ── HTML base ─────────────────────────────────────────────────────────────
    const ss = 'background-color:rgba(255,255,255,0.04);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:9px 30px 9px 12px;font-size:13px;cursor:pointer;outline:none;min-width:150px;transition:border-color 0.2s;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2.5\' stroke-linecap=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;';

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:var(--accent);">📈 Estadísticas</h2>
      </div>
      ${Utils.wrapFilters(`
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;
                  padding:14px 16px;background:var(--surface);border-radius:12px;border:1px solid var(--border);">
        <span style="color:var(--muted);font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Filtrar</span>
        <select id="flt-sport"    style="${ss}"></select>
        <select id="flt-category" style="${ss}"></select>
        <select id="flt-gender"   style="${ss}"></select>
        <select id="flt-school"   style="${ss}">
          <option value="">Todos los colegios</option>
          ${allSchools.map(s => `<option value="${s}">${Utils.truncate(s,28)}</option>`).join('')}
        </select>
        <button id="flt-clear"
          style="background:var(--surface);color:var(--muted);border:1px solid var(--border);border-radius:8px;
                 padding:7px 14px;font-size:13px;cursor:pointer;transition:all 0.2s;">
          ✕ Limpiar
        </button>
      </div>
      `, 'stat-filters')}
      <div id="stat-tabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>
      <div id="stat-content" class="card"></div>
    `;

    // ── Event listeners ───────────────────────────────────────────────────────
    document.getElementById('flt-sport').addEventListener('change', function () {
      filters.sport    = this.value;
      filters.category = '';
      filters.gender   = '';
      activeTab        = '';
      refreshDropdowns();
      filters.sport ? buildTabs() : showPrompt();
    });

    document.getElementById('flt-category').addEventListener('change', function () {
      filters.category = this.value;
      filters.gender   = '';
      refreshDropdowns();
      if (filters.sport) buildTabs();
    });

    document.getElementById('flt-gender').addEventListener('change', function () {
      filters.gender = this.value;
      if (filters.sport) buildTabs();
    });

    document.getElementById('flt-school').addEventListener('change', function () {
      filters.school = this.value;
      if (filters.sport) buildTabs();
    });

    document.getElementById('flt-clear').addEventListener('click', function () {
      filters.sport = filters.category = filters.gender = filters.school = '';
      document.getElementById('flt-school').value = '';
      activeTab = '';
      refreshDropdowns();
      showPrompt();
    });

    refreshDropdowns();
    showPrompt();

  } catch (e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

window.Pages = window.Pages || {};
window.Pages.Statistics = Pages.Statistics;
