/**
 * Página: Fase Final / Playoffs
 */
Pages.Playoffs = async function(container, opts) {
  container.innerHTML = Utils.spinner();

  let sports = [], categories = [], teams = [], matches = [];

  try {
    [sports, categories, teams, matches] = await Promise.all([
      Api.getSports(),
      Api.getCategories(),
      Api.getTeams(),
      Api.getMatches(),
    ]);
  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error cargando datos: ${e.message}</div>`;
    return;
  }

  const playoffMatches = matches.filter(m => m.phase === 'playoff');

  window._po = {
    sports, categories, teams,
    selSport: '', selCat: '', selGender: '',
    flSport: '', flGender: '', flCat: '',
    allMatches: playoffMatches,
  };

  const PHASE_OPTIONS = [
    'Final',
    'Semifinal 1', 'Semifinal 2',
    '3er Puesto', 'Bronce',
    'Cuartos 1', 'Cuartos 2', 'Cuartos 3', 'Cuartos 4',
  ];

  // Orden para mostrar fases (menor número = primero)
  const PHASE_ORDER = {
    'Final': 0, '3er Puesto': 1, 'Bronce': 1,
    'Semifinal 1': 2, 'Semifinal 2': 3,
    'Cuartos 1': 4, 'Cuartos 2': 5, 'Cuartos 3': 6, 'Cuartos 4': 7,
  };

  function _phaseStyle(phase) {
    const p = (phase || '').toLowerCase();
    if (p.includes('final') && !p.includes('semi') && !p.includes('cuarto'))
      return { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '#fbbf24', icon: '🏆' };
    if (p.includes('semi'))
      return { bg: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '#c084fc', icon: '🥈' };
    if (p.includes('cuarto'))
      return { bg: 'rgba(96,165,250,0.15)', color: 'var(--accent)', border: 'var(--accent)', icon: '⚔️' };
    if (p.includes('bronce') || p.includes('3er') || p.includes('tercero'))
      return { bg: 'rgba(205,127,50,0.15)', color: '#cd7f32', border: '#cd7f32', icon: '🥉' };
    return { bg: 'rgba(100,116,139,0.15)', color: 'var(--muted)', border: 'var(--muted)', icon: '🎯' };
  }

  const inp = 'background:#1e293b;color:var(--text);border:1px solid var(--border);' +
              'border-radius:8px;padding:8px 12px;font-size:13px;width:100%;box-sizing:border-box;';
  const fsS = 'background:#1e293b;color:var(--text);border:1px solid var(--border);' +
              'border-radius:8px;padding:5px 10px;font-size:12px;';

  // ── Vista: 'list' | 'bracket' ─────────────────────────────────────────────
  window._po.view = 'list';

  window._poToggleView = function(view) {
    window._po.view = view;
    ['list','bracket'].forEach(v => {
      const btn = document.getElementById(`po-view-${v}`);
      if (btn) {
        btn.style.background  = v === view ? 'white' : 'rgba(255,255,255,0.1)';
        btn.style.color       = v === view ? 'var(--accent)' : 'white';
        btn.style.fontWeight  = v === view ? '700' : '500';
      }
    });
    if (view === 'bracket') window._poRenderBracket();
    else window._poRenderList();
  };

  // ── Bracket visual ────────────────────────────────────────────────────────
  window._poRenderBracket = function() {
    const el = document.getElementById('po-list');
    if (!el) return;

    const { flSport, flGender, flCat, allMatches } = window._po;
    let list = allMatches;
    if (flSport)  list = list.filter(m => (m.sport    || '') === flSport);
    if (flGender) list = list.filter(m => (m.gender   || '') === flGender);
    if (flCat)    list = list.filter(m => (m.category || '') === flCat);

    const countEl = document.getElementById('po-count');
    if (countEl) countEl.textContent = `${list.length} partido${list.length !== 1 ? 's' : ''}`;

    if (!list.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);">
        <div style="font-size:40px;margin-bottom:12px;">🏅</div>
        <p style="font-size:14px;">No hay partidos de fase final para estos filtros.</p>
      </div>`;
      return;
    }

    // Agrupar por categoría
    const byCat = {};
    list.forEach(m => {
      const key = `${m.sport}||${m.category}||${m.gender}`;
      if (!byCat[key]) byCat[key] = { sport: m.sport, category: m.category, gender: m.gender, matches: [] };
      byCat[key].matches.push(m);
    });

    // Tarjeta de partido para el bracket
    function bCard(m, borderColor) {
      if (!m) {
        return `<div style="width:180px;background:#0f172a;border-radius:8px;border:1px dashed #1e293b;padding:10px 12px;opacity:.5;">
          <div style="font-size:11px;color:var(--muted);text-align:center;">POR DEFINIR</div>
        </div>`;
      }
      const teamA = m.team1?.name || m.team1?.school?.name || 'POR DEFINIR';
      const teamB = m.team2?.name || m.team2?.school?.name || 'POR DEFINIR';
      const s1    = m.team1_score != null ? m.team1_score : null;
      const s2    = m.team2_score != null ? m.team2_score : null;
      const done  = m.status === 'finished';
      const live  = m.status === 'live';
      const winA  = done && s1 !== null && s2 !== null && s1 > s2;
      const winB  = done && s1 !== null && s2 !== null && s2 > s1;
      const liveD = live ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent2);animation:pulse 1.2s infinite;margin-right:3px;vertical-align:middle;"></span>` : '';

      return `
        <div style="width:180px;background:#1e293b;border-radius:8px;overflow:hidden;
                    border:1px solid ${borderColor || 'var(--border)'};box-shadow:0 2px 8px rgba(0,0,0,.3);">
          <div style="padding:7px 10px;border-bottom:1px solid var(--border);
                      background:${winA ? 'rgba(16,185,129,.12)' : 'transparent'};">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span style="font-size:11px;font-weight:${winA?'700':'500'};color:${winA?'#6ee7b7':'#cbd5e1'};
                           white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">
                ${Utils.truncate(teamA, 16)}
              </span>
              <span style="font-size:14px;font-weight:900;color:${winA?'#6ee7b7':'var(--muted)'};flex-shrink:0;">
                ${s1 !== null ? s1 : (done||live ? '-' : '')}
              </span>
            </div>
          </div>
          <div style="padding:7px 10px;background:${winB ? 'rgba(16,185,129,.12)' : 'transparent'};">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span style="font-size:11px;font-weight:${winB?'700':'500'};color:${winB?'#6ee7b7':'#cbd5e1'};
                           white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;">
                ${liveD}${Utils.truncate(teamB, 16)}
              </span>
              <span style="font-size:14px;font-weight:900;color:${winB?'#6ee7b7':'var(--muted)'};flex-shrink:0;">
                ${s2 !== null ? s2 : (done||live ? '-' : '')}
              </span>
            </div>
          </div>
        </div>`;
    }

    // Conector horizontal entre columnas
    const connector = `
      <div style="display:flex;flex-direction:column;justify-content:space-around;width:24px;align-self:stretch;">
        <div style="flex:1;border-right:2px solid var(--border);border-top:2px solid var(--border);
                    border-bottom:2px solid var(--border);border-radius:0 6px 6px 0;margin:4px 0;"></div>
      </div>`;

    el.innerHTML = Object.values(byCat).map(cat => {
      const color = Utils.sportColor(cat.sport);
      const ms    = cat.matches;
      const get   = (...phases) => {
        for (const p of phases) {
          const m = ms.find(m => m.group_name === p);
          if (m) return m;
        }
        return null;
      };

      const q1    = get('Cuartos 1');
      const q2    = get('Cuartos 2');
      const q3    = get('Cuartos 3');
      const q4    = get('Cuartos 4');
      const semi1 = get('Semifinal 1');
      const semi2 = get('Semifinal 2');
      const final = get('Final');
      const third = get('3er Puesto', 'Bronce');

      const hasQ = q1 || q2 || q3 || q4;
      const hasS = semi1 || semi2;

      // Altura base del contenedor: cada slot = 90px
      const SLOT = 90;
      const slots = hasQ ? 4 : (hasS ? 2 : 1);
      const H     = slots * SLOT + (slots - 1) * 10; // total height

      const colStyle = `display:flex;flex-direction:column;justify-content:space-around;height:${H}px;`;

      let rounds = [];

      if (hasQ) {
        rounds.push({
          label: 'Cuartos', color: 'var(--accent)',
          col: `<div style="${colStyle}">
            ${bCard(q1, 'var(--accent)')}
            ${bCard(q2, 'var(--accent)')}
            ${bCard(q3, 'var(--accent)')}
            ${bCard(q4, 'var(--accent)')}
          </div>`,
        });
      }

      if (hasS) {
        rounds.push({
          label: 'Semifinales', color: '#c084fc',
          col: `<div style="${colStyle}">
            ${bCard(semi1, '#c084fc')}
            ${bCard(semi2, '#c084fc')}
          </div>`,
        });
      }

      if (final || third) {
        rounds.push({
          label: 'Final', color: '#fbbf24',
          col: `<div style="${colStyle}">
            ${final ? `
              <div>
                <div style="font-size:10px;color:#fbbf24;font-weight:700;text-align:center;margin-bottom:4px;letter-spacing:.5px;">🏆 FINAL</div>
                ${bCard(final, '#fbbf24')}
              </div>` : ''}
            ${third ? `
              <div style="margin-top:${final ? '16px' : '0'};">
                <div style="font-size:10px;color:#cd7f32;font-weight:700;text-align:center;margin-bottom:4px;letter-spacing:.5px;">🥉 3er PUESTO</div>
                ${bCard(third, '#cd7f32')}
              </div>` : ''}
          </div>`,
        });
      }

      // Encabezados de rondas
      const headers = rounds.map(r =>
        `<div style="width:180px;text-align:center;font-size:11px;font-weight:700;
                     color:${r.color};letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;">
           ${r.label}
         </div>`
      ).join('<div style="width:24px;"></div>');

      // Columnas del bracket
      const cols = rounds.map((r, i) =>
        r.col + (i < rounds.length - 1 ? connector : '')
      ).join('');

      return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,.06);
                    border-top:3px solid ${color};border-radius:12px;padding:20px 24px;margin-bottom:20px;
                    overflow-x:auto;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;">
            <span style="font-size:18px;">${Utils.sportIcon(cat.sport)}</span>
            <span style="font-weight:700;color:${color};font-size:15px;">${cat.sport}</span>
            <span style="color:var(--muted);">·</span>
            <span style="color:var(--muted);font-size:13px;">${cat.category}</span>
            <span style="color:var(--muted);">·</span>
            <span style="color:var(--muted);font-size:13px;">${cat.gender}</span>
          </div>
          <!-- Round headers -->
          <div style="display:flex;align-items:flex-end;gap:0;margin-bottom:6px;margin-left:0;">
            ${headers}
          </div>
          <!-- Bracket -->
          <div style="display:flex;align-items:center;gap:0;min-width:fit-content;">
            ${cols}
          </div>
        </div>`;
    }).join('');
  };

  // ── Render lista agrupada por fase ────────────────────────────────────────
  window._poRenderList = function() {
    const el = document.getElementById('po-list');
    if (!el) return;

    const { flSport, flGender, flCat, allMatches } = window._po;
    let list = allMatches;
    if (flSport)  list = list.filter(m => (m.sport   || '') === flSport);
    if (flGender) list = list.filter(m => (m.gender  || '') === flGender);
    if (flCat)    list = list.filter(m => (m.category|| '') === flCat);

    // Actualizar contador
    const countEl = document.getElementById('po-count');
    if (countEl) countEl.textContent = `${list.length} partido${list.length !== 1 ? 's' : ''}`;

    if (list.length === 0) {
      el.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--muted);">
          <div style="font-size:40px;margin-bottom:12px;">🏅</div>
          <p style="font-size:14px;">No hay partidos de fase final para estos filtros.</p>
        </div>`;
      return;
    }

    // Agrupar por sport+category+gender
    const byCat = {};
    list.forEach(m => {
      const key = `${m.sport}||${m.category}||${m.gender}`;
      if (!byCat[key]) byCat[key] = { sport: m.sport, category: m.category, gender: m.gender, matches: [] };
      byCat[key].matches.push(m);
    });

    el.innerHTML = Object.values(byCat).map(cat => {
      const color = Utils.sportColor(cat.sport);

      // Agrupar por fase dentro de la categoría
      const byPhase = {};
      cat.matches.forEach(m => {
        const pKey = m.group_name || 'Sin fase';
        if (!byPhase[pKey]) byPhase[pKey] = [];
        byPhase[pKey].push(m);
      });

      // Ordenar fases
      const sortedPhases = Object.keys(byPhase).sort((a, b) =>
        (PHASE_ORDER[a] ?? 99) - (PHASE_ORDER[b] ?? 99)
      );

      const phasesHtml = sortedPhases.map(pKey => {
        const ps = _phaseStyle(pKey);
        const phaseMatches = byPhase[pKey].sort((a, b) =>
          (a.match_date || '').localeCompare(b.match_date || '')
        );

        const cardsHtml = phaseMatches.map(m => {
          const teamA  = m.team1?.name || m.team1?.school?.name || 'POR DEFINIR';
          const teamB  = m.team2?.name || m.team2?.school?.name || 'POR DEFINIR';
          const date   = m.match_date ? Utils.formatDateTime(m.match_date) : 'Sin fecha';
          const loc    = m.location || '';
          const s1     = m.team1_score != null ? m.team1_score : '';
          const s2     = m.team2_score != null ? m.team2_score : '';
          const isLive = m.status === 'live';
          const isDone = m.status === 'finished';

          let statusChip = '';
          if (isLive)      statusChip = `<span style="background:rgba(239,68,68,0.2);color:var(--accent2);font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid rgba(239,68,68,0.4);">🔴 EN VIVO</span>`;
          else if (isDone) statusChip = `<span style="background:rgba(16,185,129,0.2);color:#6ee7b7;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;border:1px solid rgba(16,185,129,0.3);">✅ FINALIZADO</span>`;
          else             statusChip = `<span style="background:rgba(100,116,139,0.2);color:var(--muted);font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;border:1px solid var(--border);">📅 PROGRAMADO</span>`;

          const scoreHtml = (isLive || isDone)
            ? `<div style="display:flex;align-items:center;gap:10px;margin-top:8px;justify-content:center;">
                 <span style="font-size:22px;font-weight:900;color:#f8fafc;">${s1 !== '' ? s1 : '-'}</span>
                 <span style="font-size:14px;color:var(--muted);">:</span>
                 <span style="font-size:22px;font-weight:900;color:#f8fafc;">${s2 !== '' ? s2 : '-'}</span>
               </div>`
            : '';

          return `
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;
                        padding:14px 16px;position:relative;overflow:hidden;
                        transition:border-color .2s;"
                 onmouseenter="this.style.borderColor='${ps.border}'"
                 onmouseleave="this.style.borderColor='#1e293b'">
              <!-- Header -->
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  ${statusChip}
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:11px;color:var(--muted);">${date}</span>
                  ${loc ? `<span style="font-size:11px;color:var(--muted);">📍 ${loc}</span>` : ''}
                  ${App.isEditor() ? `
                  <button onclick="window._poEditTeams('${m.id}')"
                    style="padding:2px 8px;border-radius:6px;border:none;cursor:pointer;
                           font-size:11px;background:rgba(96,165,250,0.1);color:var(--accent);
                           transition:background .2s;"
                    onmouseenter="this.style.background='rgba(96,165,250,0.25)'"
                    onmouseleave="this.style.background='rgba(96,165,250,0.1)'">✏️</button>
                  <button onclick="window._poDelete('${m.id}')"
                    style="padding:2px 8px;border-radius:6px;border:none;cursor:pointer;
                           font-size:11px;background:rgba(239,68,68,0.1);color:#fca5a5;
                           transition:background .2s;"
                    onmouseenter="this.style.background='rgba(239,68,68,0.25)'"
                    onmouseleave="this.style.background='rgba(239,68,68,0.1)'">🗑</button>` : ''}
                </div>
              </div>

              <!-- Equipos -->
              <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;">
                <div style="text-align:right;">
                  <div style="font-size:14px;font-weight:700;color:var(--text);line-height:1.3;">
                    ${Utils.truncate(teamA, 20)}
                  </div>
                </div>
                <div style="text-align:center;min-width:32px;">
                  ${(isLive || isDone)
                    ? `<div style="display:flex;align-items:center;gap:6px;">
                         <span style="font-size:20px;font-weight:900;color:#f8fafc;">${s1 !== '' ? s1 : '?'}</span>
                         <span style="font-size:13px;color:var(--muted);font-weight:700;">:</span>
                         <span style="font-size:20px;font-weight:900;color:#f8fafc;">${s2 !== '' ? s2 : '?'}</span>
                       </div>`
                    : `<span style="font-size:14px;color:var(--muted);font-weight:700;">vs</span>`}
                </div>
                <div style="text-align:left;">
                  <div style="font-size:14px;font-weight:700;color:var(--text);line-height:1.3;">
                    ${Utils.truncate(teamB, 20)}
                  </div>
                </div>
              </div>
            </div>`;
        }).join('');

        return `
          <div style="margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="height:1px;flex:1;background:var(--border);"></div>
              <span style="background:${ps.bg};color:${ps.color};
                           border:1px solid ${ps.border};border-radius:20px;
                           padding:4px 14px;font-size:12px;font-weight:700;
                           white-space:nowrap;">
                ${ps.icon} ${pKey}
              </span>
              <div style="height:1px;flex:1;background:var(--border);"></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
              ${cardsHtml}
            </div>
          </div>`;
      }).join('');

      return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);
                    border-top:3px solid ${color};border-radius:12px;padding:16px 20px;
                    margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
            <span style="font-size:18px;">${Utils.sportIcon(cat.sport)}</span>
            <span style="font-weight:700;color:${color};font-size:15px;">${cat.sport}</span>
            <span style="color:var(--muted);font-size:13px;">·</span>
            <span style="color:var(--muted);font-size:13px;">${cat.category}</span>
            <span style="color:var(--muted);font-size:13px;">·</span>
            <span style="color:var(--muted);font-size:13px;">${cat.gender}</span>
          </div>
          ${phasesHtml}
        </div>`;
    }).join('');
  };

  // ── Editar equipos de un partido ─────────────────────────────────────────
  window._poEditTeams = function(matchId) {
    const match = window._po.allMatches.find(m => m.id === matchId);
    if (!match) return;

    const { teams } = window._po;
    const pool = teams.filter(t => {
      const tSport  = t.sport?.name    || '';
      const tCat    = t.category?.name || '';
      const tGender = t.gender || t.category?.gender || '';
      return tSport === match.sport && tCat === match.category && tGender === match.gender;
    });

    const mi = inp;
    const makeOpts = (selectedId) =>
      `<option value="">— POR DEFINIR —</option>` +
      pool.map(t => {
        const school = t.school?.name || t.name || 'Equipo';
        return `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${Utils.truncate(school, 40)}</option>`;
      }).join('');

    Utils.showModal(`
      <h3 style="font-size:16px;font-weight:700;color:var(--accent);margin:0 0 4px;">✏️ Editar Equipos</h3>
      <p style="color:var(--muted);font-size:13px;margin:0 0 18px;">
        ${match.sport} · ${match.category} · ${match.gender} · <strong style="color:#fbbf24;">${match.group_name || ''}</strong>
      </p>
      <div style="margin-bottom:12px;">
        <label style="font-size:11px;color:var(--accent);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">Equipo A (Local)</label>
        <select id="edit-po-team-a" style="${mi}">${makeOpts(match.team1_id)}</select>
      </div>
      <div style="margin-bottom:18px;">
        <label style="font-size:11px;color:#c4b5fd;display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">Equipo B (Visitante)</label>
        <select id="edit-po-team-b" style="${mi}">${makeOpts(match.team2_id)}</select>
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="window._poSaveTeams('${matchId}')"
          style="background:linear-gradient(135deg,#1d4ed8,var(--accent));color:white;
                 font-weight:700;border:none;border-radius:10px;padding:9px 20px;cursor:pointer;">
          💾 Guardar
        </button>
        <button onclick="Utils.closeModal()"
          style="background:var(--surface);color:var(--muted);border:1px solid var(--border);
                 border-radius:10px;padding:9px 16px;cursor:pointer;">
          Cancelar
        </button>
      </div>
    `);
  };

  window._poSaveTeams = async function(matchId) {
    const teamA = document.getElementById('edit-po-team-a')?.value || null;
    const teamB = document.getElementById('edit-po-team-b')?.value || null;
    try {
      await Api.updateMatch(matchId, { team_a: teamA || null, team_b: teamB || null });
      const match = window._po.allMatches.find(m => m.id === matchId);
      if (match) {
        const ta = teamA ? window._po.teams.find(t => t.id === teamA) : null;
        const tb = teamB ? window._po.teams.find(t => t.id === teamB) : null;
        match.team_a   = teamA || null;
        match.team_b   = teamB || null;
        match.team1_id = teamA || null;
        match.team2_id = teamB || null;
        match.team1    = { school: { name: ta?.school?.name || 'POR DEFINIR' } };
        match.team2    = { school: { name: tb?.school?.name || 'POR DEFINIR' } };
      }
      Utils.closeModal();
      Utils.toast('Equipos actualizados');
      window._poRenderList();
    } catch(e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  };

  window._poUpdateFilterCats = function() {
    const sel = document.getElementById('po-filter-cat');
    if (!sel) return;
    const { flSport, allMatches } = window._po;
    let list = allMatches;
    if (flSport) list = list.filter(m => (m.sport || '') === flSport);
    const cats = [...new Set(list.map(m => m.category || '').filter(Boolean))].sort();
    sel.innerHTML = `<option value="">Todas categorías</option>` +
      cats.map(n => `<option value="${n}">${n}</option>`).join('');
  };

  function _poRefresh() {
    if (window._po.view === 'bracket') window._poRenderBracket();
    else window._poRenderList();
  }

  window._poFilterSport = function(val) {
    window._po.flSport = val;
    window._po.flCat   = '';
    const catSel = document.getElementById('po-filter-cat');
    if (catSel) catSel.value = '';
    window._poUpdateFilterCats();
    _poRefresh();
  };

  window._poFilterGender = function(val) {
    window._po.flGender = val;
    _poRefresh();
  };

  window._poFilterCat = function(val) {
    window._po.flCat = val;
    _poRefresh();
  };

  window._poUpdateFormCats = function() {
    const sel = document.getElementById('po-cat');
    if (!sel) return;
    const { selSport, categories, sports } = window._po;
    const sportObj = sports.find(s => s.name === selSport);
    const cats = sportObj
      ? [...new Set(categories.filter(c => c.sport_id === sportObj.id).map(c => c.name))].sort()
      : [...new Set(categories.map(c => c.name))].sort();
    sel.innerHTML = `<option value="">— Categoría —</option>` +
      cats.map(n => `<option value="${n}">${n}</option>`).join('');
  };

  window._poUpdateFormGenders = function() {
    const sel = document.getElementById('po-gender');
    if (!sel) return;
    const { selCat, selSport, categories, sports } = window._po;
    let genders = ['Masculino', 'Femenino', 'Mixto'];
    if (selCat) {
      const sportObj = sports.find(s => s.name === selSport);
      const matching = categories.filter(c =>
        c.name === selCat && (!sportObj || c.sport_id === sportObj.id)
      );
      const found = [...new Set(matching.map(c => c.gender))].filter(Boolean);
      if (found.length > 0) genders = found;
    }
    sel.innerHTML = `<option value="">— Género —</option>` +
      genders.map(g => `<option value="${g}">${g}</option>`).join('');
  };

  window._poUpdateTeams = function() {
    const selA = document.getElementById('po-team-a');
    const selB = document.getElementById('po-team-b');
    if (!selA || !selB) return;
    const { selSport, selCat, selGender, teams } = window._po;
    const pool = teams.filter(t => {
      const tSport  = t.sport?.name    || '';
      const tCat    = t.category?.name || '';
      const tGender = t.gender || t.category?.gender || '';
      return (!selSport || tSport  === selSport)
          && (!selCat   || tCat    === selCat)
          && (!selGender|| tGender === selGender);
    });
    const optsHtml = pool.map(t => {
      const school = t.school?.name || '';
      return `<option value="${t.id}">${Utils.truncate(school || t.name, 40)}</option>`;
    }).join('');
    const empty = `<option value="">— POR DEFINIR —</option>`;
    selA.innerHTML = empty + optsHtml;
    selB.innerHTML = empty + optsHtml;
  };

  window._poOnSport = function(val) {
    window._po.selSport  = val;
    window._po.selCat    = '';
    window._po.selGender = '';
    window._poUpdateFormCats();
    window._poUpdateFormGenders();
    window._poUpdateTeams();
  };
  window._poOnCat = function(val) {
    window._po.selCat    = val;
    window._po.selGender = '';
    window._poUpdateFormGenders();
    window._poUpdateTeams();
  };
  window._poOnGender = function(val) {
    window._po.selGender = val;
    window._poUpdateTeams();
  };

  // ── Crear partido ─────────────────────────────────────────────────────────
  window._poCreate = async function() {
    const { selSport, selCat, selGender, sports, categories } = window._po;
    const teamAId  = document.getElementById('po-team-a')?.value  || null;
    const teamBId  = document.getElementById('po-team-b')?.value  || null;
    const dateVal  = document.getElementById('po-date')?.value    || '';
    const timeVal  = document.getElementById('po-time')?.value    || '12:00';
    const locVal   = document.getElementById('po-loc')?.value     || '';
    const phaseVal = document.getElementById('po-phase')?.value   || 'Final';

    if (!selSport || !selCat || !selGender) {
      Utils.toast('Selecciona deporte, categoría y género', 'error'); return;
    }
    if (!dateVal) {
      Utils.toast('Selecciona una fecha', 'error'); return;
    }

    const sportObj = sports.find(s => s.name === selSport);
    const catObj   = categories.find(c =>
      c.name === selCat && c.gender === selGender &&
      (!sportObj || c.sport_id === sportObj.id)
    );
    if (!sportObj || !catObj) {
      Utils.toast('No se encontró la categoría en la BD', 'error'); return;
    }

    const payload = {
      team_a:      teamAId || null,
      team_b:      teamBId || null,
      sport_id:    sportObj.id,
      category_id: catObj.id,
      match_date:  `${dateVal}T${timeVal}:00-05:00`,
      location:    locVal,
      status:      'pending',
      group_name:  phaseVal,
      phase:       'playoff',
    };

    try {
      const created = await Api.createMatch(payload);
      const ps = _phaseStyle(phaseVal);
      Utils.toast(`${ps.icon} Partido ${phaseVal} creado`, 'success');

      const teamAName = teamAId
        ? (document.getElementById('po-team-a').selectedOptions[0]?.text || 'POR DEFINIR')
        : 'POR DEFINIR';
      const teamBName = teamBId
        ? (document.getElementById('po-team-b').selectedOptions[0]?.text || 'POR DEFINIR')
        : 'POR DEFINIR';

      window._po.allMatches.push({
        ...created,
        sport: selSport, category: selCat, gender: selGender,
        team1: { school: { name: teamAName } },
        team2: { school: { name: teamBName } },
      });
      window._poUpdateFilterCats();
      window._poRenderList();

      document.getElementById('po-team-a').value = '';
      document.getElementById('po-team-b').value = '';
    } catch(e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  };

  window._poDelete = async function(matchId) {
    if (!confirm('¿Eliminar este partido?')) return;
    try {
      await Api.deleteMatch(matchId);
      window._po.allMatches = window._po.allMatches.filter(m => m.id !== matchId);
      window._poUpdateFilterCats();
      window._poRenderList();
      Utils.toast('Partido eliminado', 'success');
    } catch(e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  };

  // ── HTML ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:flex-end;justify-content:space-between;
                margin-bottom:24px;flex-wrap:wrap;gap:10px;">
      <div>
        <h2 style="font-size:28px;font-weight:900;
                   background:linear-gradient(135deg,#fbbf24,#f59e0b,#d97706);
                   -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                   background-clip:text;margin:0;">
          🏅 Fase Final
        </h2>
        <p style="color:var(--muted);font-size:13px;margin:4px 0 0;">
          Cuartos de final · Semifinales · Final · Bronce
        </p>
      </div>
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);
                  border-radius:10px;padding:8px 16px;text-align:right;">
        <div style="font-size:20px;font-weight:900;color:#fbbf24;" id="po-count">0 partidos</div>
        <div style="font-size:11px;color:#78716c;">creados</div>
      </div>
    </div>

    ${App.isEditor() ? `
    <!-- Formulario de creación -->
    <div style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2);
                border-radius:16px;padding:20px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;">
        <span style="font-size:16px;">➕</span>
        <h3 style="font-size:15px;font-weight:700;color:#fbbf24;margin:0;">Crear partido de fase final</h3>
      </div>

      <!-- Fase destacada -->
      <div style="margin-bottom:16px;">
        <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;font-weight:600;
                      text-transform:uppercase;letter-spacing:.5px;">Ronda / Fase del partido</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;" id="po-phase-btns">
          ${PHASE_OPTIONS.map((p, i) => {
            const ps = _phaseStyle(p);
            return `
              <button onclick="window._poSelectPhase('${p}')" id="po-phase-btn-${i}"
                style="padding:6px 14px;border-radius:20px;border:1px solid ${ps.border};
                       background:${i===0 ? ps.bg : 'transparent'};color:${ps.color};
                       font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;
                       ${i===0 ? 'box-shadow:0 0 0 1px '+ps.border+';' : ''}">
                ${ps.icon} ${p}
              </button>`;
          }).join('')}
        </div>
        <input type="hidden" id="po-phase" value="${PHASE_OPTIONS[0]}" />
      </div>

      <!-- Deporte / Categoría / Género -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
        <div>
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;
                        text-transform:uppercase;letter-spacing:.5px;">Deporte</label>
          <select id="po-sport" style="${inp}" onchange="window._poOnSport(this.value)">
            <option value="">— Seleccionar —</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;
                        text-transform:uppercase;letter-spacing:.5px;">Categoría</label>
          <select id="po-cat" style="${inp}" onchange="window._poOnCat(this.value)">
            <option value="">— primero el deporte —</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;
                        text-transform:uppercase;letter-spacing:.5px;">Género</label>
          <select id="po-gender" style="${inp}" onchange="window._poOnGender(this.value)">
            <option value="">— primero la categoría —</option>
          </select>
        </div>
      </div>

      <!-- Equipos -->
      <div style="display:grid;grid-template-columns:1fr 36px 1fr;gap:8px;
                  align-items:end;margin-bottom:6px;">
        <div>
          <label style="font-size:11px;color:var(--accent);display:block;margin-bottom:4px;
                        text-transform:uppercase;letter-spacing:.5px;">Equipo A</label>
          <select id="po-team-a" style="${inp}">
            <option value="">— POR DEFINIR —</option>
          </select>
        </div>
        <div style="text-align:center;padding-bottom:10px;font-size:15px;
                    color:var(--muted);font-weight:900;">vs</div>
        <div>
          <label style="font-size:11px;color:#c4b5fd;display:block;margin-bottom:4px;
                        text-transform:uppercase;letter-spacing:.5px;">Equipo B</label>
          <select id="po-team-b" style="${inp}">
            <option value="">— POR DEFINIR —</option>
          </select>
        </div>
      </div>
      <p style="font-size:11px;color:var(--muted);margin:4px 0 14px;">
        Deja vacío si los equipos aún no se conocen.
      </p>

      <!-- Fecha / Hora / Sede -->
      <div style="display:grid;grid-template-columns:140px 120px 1fr;gap:12px;margin-bottom:16px;">
        <div>
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;
                        text-transform:uppercase;letter-spacing:.5px;">Fecha</label>
          <input id="po-date" type="date" style="${inp}" min="2026-03-06" max="2026-03-14" />
        </div>
        <div>
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;
                        text-transform:uppercase;letter-spacing:.5px;">Hora</label>
          <input id="po-time" type="time" style="${inp}" value="12:00" />
        </div>
        <div>
          <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;
                        text-transform:uppercase;letter-spacing:.5px;">Sede / Cancha</label>
          <input id="po-loc" type="text" style="${inp}" placeholder="Ej: Marathon gym principal" />
        </div>
      </div>

      <button onclick="window._poCreate()"
        style="background:linear-gradient(135deg,#d97706,#f59e0b);color:#0f172a;
               font-weight:800;font-size:14px;border:none;border-radius:10px;
               padding:10px 24px;cursor:pointer;transition:opacity .15s;"
        onmouseenter="this.style.opacity='.85'"
        onmouseleave="this.style.opacity='1'">
        ➕ Crear partido
      </button>
    </div>` : ``}

    <!-- Lista -->
    <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);
                border-radius:16px;padding:18px 20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;
                  margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <h3 style="font-size:15px;font-weight:700;color:var(--text);margin:0;">
            📋 Partidos de Fase Final
          </h3>
          <!-- Toggle Lista / Bracket -->
          <div style="display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;">
            <button id="po-view-list"
              onclick="window._poToggleView('list')"
              style="padding:4px 12px;border:none;cursor:pointer;font-size:12px;font-weight:700;
                     background:white;color:var(--accent);transition:all .15s;">
              📋 Lista
            </button>
            <button id="po-view-bracket"
              onclick="window._poToggleView('bracket')"
              style="padding:4px 12px;border:none;cursor:pointer;font-size:12px;font-weight:500;
                     background:rgba(255,255,255,.1);color:white;transition:all .15s;">
              🏆 Bracket
            </button>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select id="po-filter-sport" style="${fsS}" onchange="window._poFilterSport(this.value)">
            <option value="">Todos los deportes</option>
            ${sports.map(s => `<option value="${s.name}">${Utils.sportIcon(s.name)} ${s.name}</option>`).join('')}
          </select>
          <select id="po-filter-cat" style="${fsS}" onchange="window._poFilterCat(this.value)">
            <option value="">Todas categorías</option>
          </select>
          <select id="po-filter-gender" style="${fsS}" onchange="window._poFilterGender(this.value)">
            <option value="">Todos géneros</option>
            <option>Masculino</option><option>Femenino</option><option>Mixto</option>
          </select>
        </div>
      </div>
      <div id="po-list"></div>
    </div>
  `;

  // Handler para seleccionar fase con botones
  window._poSelectPhase = function(phase) {
    document.getElementById('po-phase').value = phase;
    PHASE_OPTIONS.forEach((p, i) => {
      const btn = document.getElementById(`po-phase-btn-${i}`);
      if (!btn) return;
      const ps = _phaseStyle(p);
      if (p === phase) {
        btn.style.background = ps.bg;
        btn.style.boxShadow  = `0 0 0 1px ${ps.border}`;
      } else {
        btn.style.background = 'transparent';
        btn.style.boxShadow  = 'none';
      }
    });
  };

  window._poUpdateFilterCats();
  window._poRenderList();
};

window.Pages = window.Pages || {};
window.Pages.Playoffs = Pages.Playoffs;
