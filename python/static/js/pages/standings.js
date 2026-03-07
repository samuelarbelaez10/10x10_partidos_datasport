/**
 * Página: Tablas de Posiciones
 * — Tabs interactivos Grupo A / Grupo B
 * — Columna "Forma" con últimos 5 resultados
 */
Pages.Standings = async function(container, opts) {
  container.innerHTML = Utils.spinner();

  let sports = [], standings = [], allMatches = [];

  try { sports = await Api.getSports(); } catch(e) { sports = []; }

  try {
    [standings, allMatches] = await Promise.all([
      Api.getStandings().catch(() => Api.getTeamStandings().catch(() => [])),
      Api.getMatches().catch(() => []),
    ]);
  } catch(e) { standings = []; allMatches = []; }

  window._st = { standings, allMatches, filterSport: '', filterGender: '', filterCategory: '', filterSchool: '' };

  // ── Forma reciente: últimos 5 resultados ─────────────────────────────────
  function _stForm(teamId, sport) {
    const finished = (window._st.allMatches || [])
      .filter(m =>
        m.status === 'finished' &&
        (m.team_a === teamId || m.team_b === teamId ||
         m.team1_id === teamId || m.team2_id === teamId)
      )
      .sort((a, b) => (b.match_date || '').localeCompare(a.match_date || ''))
      .slice(0, 5)
      .reverse();

    if (!finished.length)
      return `<span style="color:#334155;font-size:12px;letter-spacing:2px;">— — —</span>`;

    const isFootball = /fútbol|futbol|softbol/i.test(sport || '');
    return finished.map(m => {
      const isHome   = m.team_a === teamId || m.team1_id === teamId;
      const myScore  = isHome ? (m.team1_score ?? 0) : (m.team2_score ?? 0);
      const oppScore = isHome ? (m.team2_score ?? 0) : (m.team1_score ?? 0);
      if (myScore > oppScore)
        return `<span title="Victoria" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;margin:1px;vertical-align:middle;"></span>`;
      if (myScore < oppScore)
        return `<span title="Derrota"  style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin:1px;vertical-align:middle;"></span>`;
      return isFootball
        ? `<span title="Empate" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;margin:1px;vertical-align:middle;"></span>`
        : `<span title="Derrota" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin:1px;vertical-align:middle;"></span>`;
    }).join('');
  }

  // ── Columnas según deporte ────────────────────────────────────────────────
  function _stCols(sport) {
    const td  = 'style="padding:10px;text-align:center;"';
    const tdG = d => `style="padding:10px;text-align:center;color:${d >= 0 ? '#10b981' : '#ef4444'};"`;
    const formHead = `<th style="color:#94a3b8;font-size:11px;min-width:80px;padding:8px;">Forma</th>`;

    if (sport === 'Baloncesto') {
      return {
        minWidth: '620px',
        head: `<th>PJ</th><th>PG</th><th>PP</th><th>PF</th><th>PC</th><th>DP</th>${formHead}`,
        cell: t => {
          const d = t.goal_difference || 0;
          return `
            <td ${td}>${t.matches_played || 0}</td>
            <td style="padding:10px;text-align:center;color:#10b981;font-weight:700;">${t.wins || 0}</td>
            <td style="padding:10px;text-align:center;color:#ef4444;">${t.losses || 0}</td>
            <td ${td}>${t.goals_for || 0}</td>
            <td ${td}>${t.goals_against || 0}</td>
            <td ${tdG(d)}>${d > 0 ? '+' : ''}${d}</td>
            <td style="padding:8px;text-align:center;">${_stForm(t.team_id, sport)}</td>`;
        },
      };
    }

    if (sport === 'Voleibol') {
      return {
        minWidth: '620px',
        head: `<th>PJ</th><th>PG</th><th>PP</th><th>SF</th><th>SC</th><th>DS</th>${formHead}`,
        cell: t => {
          const d = t.goal_difference || 0;
          return `
            <td ${td}>${t.matches_played || 0}</td>
            <td style="padding:10px;text-align:center;color:#10b981;font-weight:700;">${t.wins || 0}</td>
            <td style="padding:10px;text-align:center;color:#ef4444;">${t.losses || 0}</td>
            <td ${td}>${t.goals_for || 0}</td>
            <td ${td}>${t.goals_against || 0}</td>
            <td ${tdG(d)}>${d > 0 ? '+' : ''}${d}</td>
            <td style="padding:8px;text-align:center;">${_stForm(t.team_id, sport)}</td>`;
        },
      };
    }

    // Fútbol, Softbol, default
    return {
      minWidth: '680px',
      head: `<th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th>${formHead}`,
      cell: t => {
        const d = t.goal_difference || 0;
        return `
          <td ${td}>${t.matches_played || 0}</td>
          <td style="padding:10px;text-align:center;color:#10b981;font-weight:700;">${t.wins || 0}</td>
          <td style="padding:10px;text-align:center;color:#94a3b8;">${t.draws || 0}</td>
          <td style="padding:10px;text-align:center;color:#ef4444;">${t.losses || 0}</td>
          <td ${td}>${t.goals_for || 0}</td>
          <td ${td}>${t.goals_against || 0}</td>
          <td ${tdG(d)}>${d > 0 ? '+' : ''}${d}</td>
          <td style="padding:8px;text-align:center;">${_stForm(t.team_id, sport)}</td>`;
      },
    };
  }

  // ── Toggle tabs Grupo A/B ─────────────────────────────────────────────────
  window._stShowGroup = function(safeKey, gKey) {
    document.querySelectorAll(`[data-stcat="${safeKey}"]`).forEach(el => {
      el.style.display = 'none';
    });
    const panel = document.getElementById(`stGrp-${safeKey}-${gKey}`);
    if (panel) panel.style.display = '';

    document.querySelectorAll(`[data-sttab="${safeKey}"]`).forEach(btn => {
      const active = btn.dataset.grp === gKey;
      btn.style.background  = active ? 'white' : 'rgba(255,255,255,0.1)';
      btn.style.color       = active ? '#1e40af' : 'white';
      btn.style.fontWeight  = active ? '700' : '500';
    });
  };

  // ── Render tablas ─────────────────────────────────────────────────────────
  window._stRender = function(data) {
    const el = document.getElementById('standings-content');
    if (!el) return;

    const byCat = {};
    (data || []).forEach(t => {
      const key = `${t.sport}||${t.category}||${t.gender}`;
      if (!byCat[key]) byCat[key] = { sport: t.sport, category: t.category, gender: t.gender, groups: {} };
      const gKey = t.group_name || '';
      if (!byCat[key].groups[gKey]) byCat[key].groups[gKey] = [];
      byCat[key].groups[gKey].push(t);
    });

    const content = Object.entries(byCat).sort().map(([rawKey, cat]) => {
      const color       = Utils.sportColor(cat.sport);
      const cols        = _stCols(cat.sport);
      const groupKeys   = Object.keys(cat.groups).sort();
      const namedGroups = groupKeys.filter(k => k);
      const hasMultiple = namedGroups.length > 1;
      const safeKey     = rawKey.replace(/[^a-zA-Z0-9]/g, '_');

      // Tabs (solo cuando hay múltiples grupos nombrados)
      const tabsHtml = hasMultiple ? `
        <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
          ${namedGroups.map((gKey, i) => `
            <button
              data-sttab="${safeKey}"
              data-grp="${gKey}"
              onclick="window._stShowGroup('${safeKey}','${gKey}')"
              style="padding:5px 18px;border-radius:8px;border:none;cursor:pointer;
                     font-size:13px;transition:all .15s;
                     background:${i === 0 ? 'white' : 'rgba(255,255,255,0.1)'};
                     color:${i === 0 ? '#1e40af' : 'white'};
                     font-weight:${i === 0 ? '700' : '500'};">
              Grupo ${gKey}
            </button>`).join('')}
        </div>` : '';

      // Una tabla por grupo
      const tablesHtml = groupKeys.map((gKey, gi) => {
        const grpTeams = (cat.groups[gKey] || []).slice().sort((a, b) =>
          (b.points - a.points) ||
          ((b.goal_difference || 0) - (a.goal_difference || 0)) ||
          ((b.goals_for || 0) - (a.goals_for || 0))
        );
        const visible = !hasMultiple || gi === 0;

        return `
          <div id="stGrp-${safeKey}-${gKey}"
               data-stcat="${safeKey}"
               style="display:${visible ? '' : 'none'};">
            ${!hasMultiple && gKey ? `
              <div style="font-size:13px;font-weight:700;color:#a78bfa;margin-bottom:8px;">
                <span style="background:rgba(139,92,246,0.2);border-radius:6px;
                             padding:3px 12px;border:1px solid rgba(139,92,246,0.3);">
                  Grupo ${gKey}
                </span>
              </div>` : ''}
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:${cols.minWidth};">
                <thead>
                  <tr style="color:#64748b;font-size:12px;text-align:center;">
                    <th style="padding:8px;text-align:left;">#</th>
                    <th style="padding:8px;text-align:left;">Equipo / Colegio</th>
                    ${cols.head}
                    <th style="color:#fbbf24;font-size:14px;">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  ${grpTeams.map((t, i) => `
                    <tr class="table-row" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                      <td style="padding:10px;font-weight:700;
                                 color:${i===0?'#fbbf24':i===1?'#94a3b8':i===2?'#b87333':'#e2e8f0'};">
                        ${i + 1}
                      </td>
                      <td style="padding:10px;">
                        <span style="font-weight:600;">${Utils.truncate(t.team_name || t.school || '', 26)}</span>
                      </td>
                      ${cols.cell(t)}
                      <td style="padding:10px;text-align:center;font-weight:900;
                                 font-size:18px;color:#60a5fa;">${t.points || 0}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="card mb-6" style="border-top:3px solid ${color};">
          <h3 class="text-lg font-bold mb-3" style="color:${color};">
            ${Utils.sportIcon(cat.sport)} ${cat.sport} &bull; ${cat.category} &bull; ${cat.gender}
            ${hasMultiple
              ? `<span style="font-size:12px;color:#a78bfa;margin-left:8px;font-weight:400;">
                   ${namedGroups.length} grupos
                 </span>`
              : ''}
          </h3>
          ${tabsHtml}
          ${tablesHtml}
        </div>`;
    }).join('');

    el.innerHTML = content || Utils.emptyState('Sin datos aún.');
  };

  // ── Filtros ───────────────────────────────────────────────────────────────
  window._stApplyFilters = function() {
    const sp = document.getElementById('st-sport');
    const gn = document.getElementById('st-gender');
    const ct = document.getElementById('st-category');
    const sc = document.getElementById('st-school');
    if (sp) window._st.filterSport    = sp.value;
    if (gn) window._st.filterGender   = gn.value;
    if (ct) window._st.filterCategory = ct.value;
    if (sc) window._st.filterSchool   = sc.value;

    let f = window._st.standings;
    if (window._st.filterSport)    f = f.filter(t => t.sport    === window._st.filterSport);
    if (window._st.filterGender)   f = f.filter(t => t.gender   === window._st.filterGender);
    if (window._st.filterCategory) f = f.filter(t => t.category === window._st.filterCategory);
    if (window._st.filterSchool)   f = f.filter(t => t.school   === window._st.filterSchool);
    window._stRender(f);
  };

  window._stPrint = function() {
    let f = window._st.standings;
    if (window._st.filterSport)    f = f.filter(t => t.sport    === window._st.filterSport);
    if (window._st.filterGender)   f = f.filter(t => t.gender   === window._st.filterGender);
    if (window._st.filterCategory) f = f.filter(t => t.category === window._st.filterCategory);
    if (window._st.filterSchool)   f = f.filter(t => t.school   === window._st.filterSchool);
    _printStandings(f);
  };

  // ── HTML ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;
                margin-bottom:20px;flex-wrap:wrap;gap:10px;">
      <div>
        <h2 class="text-3xl font-black" style="color:#60a5fa;">🏆 Tablas de Posiciones</h2>
        <p class="text-gray-400 mt-1 text-sm">Fase de grupos — partidos intragrupo únicamente.</p>
      </div>
      <button onclick="window._stPrint()"
        style="background:rgba(255,255,255,0.05);border:1px solid #334155;
               color:#94a3b8;border-radius:8px;padding:7px 14px;
               font-size:13px;cursor:pointer;transition:background .15s;"
        onmouseenter="this.style.background='rgba(255,255,255,0.1)'"
        onmouseleave="this.style.background='rgba(255,255,255,0.05)'">
        🖨️ Imprimir
      </button>
    </div>

    ${Utils.wrapFilters(`
    <div class="card mb-5" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
      <div>
        <label class="text-gray-400 text-sm">Deporte</label>
        <select id="st-sport" class="input-field mt-1" onchange="window._stApplyFilters();Utils.updateFilterCount('st-filters')">
          <option value="">Todos</option>
          ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-gray-400 text-sm">Género</label>
        <select id="st-gender" class="input-field mt-1" onchange="window._stApplyFilters();Utils.updateFilterCount('st-filters')">
          <option value="">Todos</option>
          <option>Masculino</option>
          <option>Femenino</option>
          <option>Mixto</option>
        </select>
      </div>
      <div>
        <label class="text-gray-400 text-sm">Categoría</label>
        <select id="st-category" class="input-field mt-1" onchange="window._stApplyFilters();Utils.updateFilterCount('st-filters')">
          <option value="">Todas</option>
          ${[...new Set(standings.map(t => t.category).filter(Boolean))].sort().map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-gray-400 text-sm">Colegio</label>
        <select id="st-school" class="input-field mt-1" onchange="window._stApplyFilters();Utils.updateFilterCount('st-filters')">
          <option value="">Todos</option>
          ${[...new Set(standings.map(t => t.school).filter(Boolean))].sort().map(s => `<option value="${s}">${Utils.truncate(s,28)}</option>`).join('')}
        </select>
      </div>
      <button class="btn-ghost" onclick="
        ['st-sport','st-gender','st-category','st-school'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
        window._st.filterSport=''; window._st.filterGender=''; window._st.filterCategory=''; window._st.filterSchool='';
        window._stRender(window._st.standings);Utils.updateFilterCount('st-filters');
      ">🔄 Limpiar</button>
    </div>
    `, 'st-filters')}

    <div id="standings-content"></div>
  `;

  window._stRender(standings);
};

// ── Imprimir (sin forma, sin tabs) ────────────────────────────────────────
function _printStandings(data) {
  const byCat = {};
  (data || []).forEach(t => {
    const key = `${t.sport}||${t.category}||${t.gender}`;
    if (!byCat[key]) byCat[key] = { sport: t.sport, category: t.category, gender: t.gender, groups: {} };
    const gKey = t.group_name || '';
    if (!byCat[key].groups[gKey]) byCat[key].groups[gKey] = [];
    byCat[key].groups[gKey].push(t);
  });

  const colHeaders = sport => {
    if (sport === 'Baloncesto') return '<th>PJ</th><th>PG</th><th>PP</th><th>PF</th><th>PC</th><th>DP</th><th>PTS</th>';
    if (sport === 'Voleibol')   return '<th>PJ</th><th>PG</th><th>PP</th><th>SF</th><th>SC</th><th>DS</th><th>PTS</th>';
    return '<th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th>';
  };
  const colCells = (t, sport) => {
    const d = t.goal_difference || 0;
    const diff = `${d > 0 ? '+' : ''}${d}`;
    if (sport === 'Baloncesto')
      return `<td>${t.matches_played||0}</td><td>${t.wins||0}</td><td>${t.losses||0}</td><td>${t.goals_for||0}</td><td>${t.goals_against||0}</td><td>${diff}</td>`;
    if (sport === 'Voleibol')
      return `<td>${t.matches_played||0}</td><td>${t.wins||0}</td><td>${t.losses||0}</td><td>${t.goals_for||0}</td><td>${t.goals_against||0}</td><td>${diff}</td>`;
    return `<td>${t.matches_played||0}</td><td>${t.wins||0}</td><td>${t.draws||0}</td><td>${t.losses||0}</td><td>${t.goals_for||0}</td><td>${t.goals_against||0}</td><td>${diff}</td>`;
  };

  const sections = Object.values(byCat).map(cat => {
    const groupKeys = Object.keys(cat.groups).sort();
    const tables = groupKeys.map(gKey => {
      const teams = (cat.groups[gKey] || []).slice().sort((a, b) =>
        (b.points - a.points) || ((b.goal_difference||0) - (a.goal_difference||0)) || ((b.goals_for||0) - (a.goals_for||0))
      );
      const groupLabel = gKey ? `<p style="font-size:12px;font-weight:700;color:#1d4ed8;margin:8px 0 4px;">Grupo ${gKey}</p>` : '';
      return `${groupLabel}
        <table>
          <thead><tr><th>#</th><th>Colegio / Equipo</th>${colHeaders(cat.sport)}</tr></thead>
          <tbody>
            ${teams.map((t, i) => `<tr ${i % 2 === 0 ? 'style="background:#f9fafb;"' : ''}>
              <td>${i + 1}</td>
              <td><strong>${t.team_name || t.school || ''}</strong></td>
              ${colCells(t, cat.sport)}
              <td><strong>${t.points || 0}</strong></td>
            </tr>`).join('')}
          </tbody>
        </table>`;
    }).join('<br>');
    return `<h3>${cat.sport} · ${cat.category} · ${cat.gender}</h3>${tables}`;
  }).join('<hr>');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tablas de Posiciones — Big Games 2026</title>
  <style>
    * { box-sizing:border-box;margin:0;padding:0; }
    body { font-family:Arial,sans-serif;font-size:12px;color:#111;background:white;padding:16px; }
    h1 { font-size:20px;margin-bottom:4px;color:#1d4ed8; }
    h3 { font-size:14px;font-weight:700;color:#1d4ed8;margin:16px 0 8px; }
    p.sub { color:#666;font-size:12px;margin-bottom:16px; }
    table { width:100%;border-collapse:collapse;margin-bottom:8px; }
    th { background:#1d4ed8;color:white;padding:6px 5px;text-align:center;font-size:11px; }
    th:nth-child(2) { text-align:left; }
    td { padding:6px 5px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:middle; }
    td:nth-child(2) { text-align:left; }
    hr { border:none;border-top:2px solid #e5e7eb;margin:20px 0; }
    @media print { button { display:none !important; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
    <div>
      <h1>🏆 Tablas de Posiciones</h1>
      <p class="sub">Big Games 2026 · Generado ${new Date().toLocaleString('es-CO')}</p>
    </div>
    <button onclick="window.print()"
      style="background:#1d4ed8;color:white;border:none;border-radius:6px;
             padding:8px 16px;cursor:pointer;font-size:13px;">
      🖨️ Imprimir
    </button>
  </div>
  ${sections || '<p>Sin datos.</p>'}
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

window.Pages = window.Pages || {};
window.Pages.Standings = Pages.Standings;
