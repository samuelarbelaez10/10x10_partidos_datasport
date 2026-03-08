/**
 * Página: Asignación de Grupos — Big Games 2026
 * - Muestra editor A/B para categorías con 2 grupos
 * - Muestra sección de verificación para categorías de un solo grupo
 *   (alerta si algún equipo tiene A/B asignado por error y permite corregirlo)
 */
Pages.Groups = async function(container, _opts) {
  container.innerHTML = Utils.spinner();

  try {
    if (!App.isEditor()) {
      container.innerHTML = `
        <div class="mb-6">
          <h2 class="text-3xl font-black" style="color:#a78bfa;">📋 Asignación de Grupos</h2>
        </div>
        <div class="card" style="border:1px solid rgba(220,38,38,0.3);background:rgba(220,38,38,0.1);">
          <p style="color:#fca5a5;">⚠️ Solo los editores pueden asignar grupos.</p>
        </div>`;
      return;
    }

    const [teams, preview] = await Promise.all([
      Api.getTeams(),
      Api.getSchedulePreview().catch(() => ({ groups: [] })),
    ]);

    // Categorías con 2 grupos (del preview)
    const multiGroupCats = (preview.groups || []).filter(g => g.num_groups > 1);

    // Índice de equipos por (sport||cat||gender)
    const teamsByCat = {};
    teams.forEach(t => {
      const sport = t.sport?.name   || '';
      const cat   = t.category?.name || '';
      const gen   = t.gender || t.category?.gender || '';
      const key   = `${sport}||${cat}||${gen}`;
      if (!teamsByCat[key]) teamsByCat[key] = [];
      teamsByCat[key].push(t);
    });

    // Keys de categorías multi-grupo
    const multiKeys = new Set(multiGroupCats.map(gc => `${gc.sport}||${gc.category}||${gc.gender}`));

    // Categorías de un solo grupo (tienen equipos pero no están en multi)
    const singleGroupCats = [];
    for (const [key, catTeams] of Object.entries(teamsByCat)) {
      if (!multiKeys.has(key) && catTeams.length > 0) {
        const [sport, cat, gen] = key.split('||');
        singleGroupCats.push({ sport, category: cat, gender: gen, key });
      }
    }
    singleGroupCats.sort((a, b) =>
      `${a.sport}${a.category}${a.gender}`.localeCompare(`${b.sport}${b.category}${b.gender}`)
    );

    // ── Fila de un equipo con botones A / B / ✕ ───────────────────────────────
    const teamRow = (t, compact = false) => {
      const gn      = t.group_name || '';
      const maxW    = compact ? '140px' : '160px';
      const pad     = compact ? '6px 10px' : '8px 12px';
      const nameStr = Utils.truncate(t.school?.name || t.name, compact ? 20 : 24);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:${pad};border-radius:8px;margin-bottom:6px;
                    background:rgba(255,255,255,0.04);">
          <span style="font-size:13px;font-weight:600;color:#e2e8f0;overflow:hidden;
                       text-overflow:ellipsis;white-space:nowrap;max-width:${maxW};"
                title="${t.school?.name || t.name}">
            ${nameStr}
          </span>
          <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
            ${gn ? `<span style="font-size:11px;padding:2px 7px;border-radius:4px;font-weight:700;
                               background:${gn==='A'?'rgba(59,130,246,0.3)':'rgba(139,92,246,0.3)'};
                               color:${gn==='A'?'#93c5fd':'#c4b5fd'};">${gn}</span>` : ''}
            <button onclick="window._grpSet('${t.id}','A')"
              style="padding:3px 10px;border-radius:5px;border:none;cursor:pointer;
                     font-weight:700;font-size:11px;transition:all 0.15s;
                     background:${gn==='A'?'#3b82f6':'rgba(59,130,246,0.15)'};
                     color:${gn==='A'?'white':'#93c5fd'};">A</button>
            <button onclick="window._grpSet('${t.id}','B')"
              style="padding:3px 10px;border-radius:5px;border:none;cursor:pointer;
                     font-weight:700;font-size:11px;transition:all 0.15s;
                     background:${gn==='B'?'#8b5cf6':'rgba(139,92,246,0.15)'};
                     color:${gn==='B'?'white':'#c4b5fd'};">B</button>
            <button onclick="window._grpSet('${t.id}','')"
              title="Quitar grupo"
              style="padding:3px 8px;border-radius:5px;border:none;cursor:pointer;
                     font-size:11px;background:rgba(255,255,255,0.08);color:#64748b;
                     ${gn ? '' : 'opacity:0.35;'}">✕</button>
          </div>
        </div>`;
    };

    // ── Sección 1: categorías con 2 grupos ────────────────────────────────────
    const renderMultiSection = () => {
      if (multiGroupCats.length === 0) return '';

      const totalCats    = multiGroupCats.length;
      const completeCats = multiGroupCats.filter(gc => {
        const cats = teamsByCat[`${gc.sport}||${gc.category}||${gc.gender}`] || [];
        return cats.length > 0 && cats.every(t => t.group_name);
      }).length;

      const cards = multiGroupCats.map(gc => {
        const key        = `${gc.sport}||${gc.category}||${gc.gender}`;
        const cats       = teamsByCat[key] || [];
        const color      = Utils.sportColor(gc.sport);
        const groupA     = cats.filter(t => (t.group_name || '') === 'A');
        const groupB     = cats.filter(t => (t.group_name || '') === 'B');
        const unassigned = cats.filter(t => !t.group_name);
        const allDone    = unassigned.length === 0 && cats.length > 0;

        return `
          <div class="card mb-4" style="border-top:3px solid ${color};">
            <div style="display:flex;justify-content:space-between;align-items:center;
                        margin-bottom:14px;flex-wrap:wrap;gap:8px;">
              <h4 style="font-size:16px;font-weight:700;color:${color};margin:0;">
                ${Utils.sportIcon(gc.sport)} ${gc.sport} · ${gc.category} · ${gc.gender}
              </h4>
              <span style="font-size:12px;padding:3px 12px;border-radius:12px;font-weight:600;
                           background:${allDone?'rgba(16,185,129,0.15)':'rgba(245,158,11,0.12)'};
                           color:${allDone?'#6ee7b7':'#fbbf24'};">
                ${allDone ? '✅ Completo' : `⚠️ ${unassigned.length} sin asignar`}
              </span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              <!-- Grupo A -->
              <div>
                <div style="font-size:12px;font-weight:700;color:#93c5fd;margin-bottom:8px;
                            padding:5px 12px;background:rgba(59,130,246,0.1);border-radius:6px;
                            display:flex;justify-content:space-between;">
                  <span>Grupo A</span>
                  <span style="color:#64748b;">${groupA.length} equipos</span>
                </div>
                ${groupA.map(t => teamRow(t)).join('') ||
                  '<p style="font-size:12px;color:#475569;padding:8px 0;">Sin equipos asignados</p>'}
              </div>
              <!-- Grupo B -->
              <div>
                <div style="font-size:12px;font-weight:700;color:#c4b5fd;margin-bottom:8px;
                            padding:5px 12px;background:rgba(139,92,246,0.1);border-radius:6px;
                            display:flex;justify-content:space-between;">
                  <span>Grupo B</span>
                  <span style="color:#64748b;">${groupB.length} equipos</span>
                </div>
                ${groupB.map(t => teamRow(t)).join('') ||
                  '<p style="font-size:12px;color:#475569;padding:8px 0;">Sin equipos asignados</p>'}
              </div>
            </div>

            ${unassigned.length > 0 ? `
            <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.07);">
              <div style="font-size:12px;color:#f59e0b;font-weight:600;margin-bottom:8px;">
                ⚠️ Sin asignar (${unassigned.length}) — haz clic en A o B:
              </div>
              ${unassigned.map(t => teamRow(t)).join('')}
            </div>` : ''}
          </div>`;
      });

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <h3 style="font-size:18px;font-weight:800;color:#a78bfa;margin:0;">
            🔀 Categorías con 2 grupos
          </h3>
          <span style="font-size:13px;color:#64748b;">${completeCats}/${totalCats} completas</span>
        </div>
        ${cards.join('')}`;
    };

    // ── Sección 2: categorías de un solo grupo (verificación + edición) ───────
    const renderSingleSection = () => {
      if (singleGroupCats.length === 0) return '';

      const totalErrors = singleGroupCats.reduce((acc, gc) => {
        return acc + (teamsByCat[gc.key] || []).filter(t => t.group_name).length;
      }, 0);

      const rows = singleGroupCats.map(gc => {
        const cats       = teamsByCat[gc.key] || [];
        const color      = Utils.sportColor(gc.sport);
        const withGroup  = cats.filter(t => t.group_name);
        const hasErrors  = withGroup.length > 0;
        const sectionId  = `sg-${gc.key.replace(/[^a-z0-9]/gi, '_')}`;

        return `
          <div class="card mb-2" style="padding:0;overflow:hidden;
                                        border-left:3px solid ${hasErrors ? '#f59e0b' : color};">
            <!-- Header colapsable -->
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:10px 16px;cursor:pointer;user-select:none;"
                 onclick="window._grpToggle('${sectionId}')">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <span id="${sectionId}-arrow"
                      style="font-size:10px;color:#64748b;flex-shrink:0;">
                  ${hasErrors ? '▼' : '▶'}
                </span>
                <span style="font-size:13px;font-weight:700;color:${color};
                             overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  ${Utils.sportIcon(gc.sport)} ${gc.sport} · ${gc.category} · ${gc.gender}
                </span>
                <span style="font-size:11px;color:#475569;flex-shrink:0;">${cats.length} eq.</span>
              </div>
              <span style="font-size:11px;padding:2px 10px;border-radius:10px;font-weight:600;
                           flex-shrink:0;margin-left:8px;
                           background:${hasErrors ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.1)'};
                           color:${hasErrors ? '#fbbf24' : '#6ee7b7'};">
                ${hasErrors ? `⚠️ ${withGroup.length} con grupo` : '✅ Correcto'}
              </span>
            </div>
            <!-- Body -->
            <div id="${sectionId}"
                 style="display:${hasErrors ? 'block' : 'none'};
                        padding:4px 16px 12px;
                        border-top:1px solid rgba(255,255,255,0.05);">
              ${hasErrors ? `
              <p style="font-size:11px;color:#f59e0b;margin:8px 0 10px;">
                ⚠️ Categoría de un solo grupo — los equipos marcados con A/B tienen asignación incorrecta. Usa ✕ para limpiar.
              </p>` : `
              <p style="font-size:11px;color:#64748b;margin:8px 0 10px;">
                Categoría de un solo grupo. Puedes editar manualmente si necesitas.
              </p>`}
              ${cats.map(t => teamRow(t, true)).join('')}
            </div>
          </div>`;
      });

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    margin:28px 0 10px;flex-wrap:wrap;gap:8px;">
          <h3 style="font-size:18px;font-weight:800;color:#94a3b8;margin:0;">
            📋 Categorías de un solo grupo
          </h3>
          ${totalErrors > 0
            ? `<span style="font-size:12px;padding:3px 12px;border-radius:12px;font-weight:600;
                             background:rgba(245,158,11,0.12);color:#fbbf24;">
                 ⚠️ ${totalErrors} equipo(s) con asignación incorrecta
               </span>`
            : `<span style="font-size:12px;padding:3px 12px;border-radius:12px;font-weight:600;
                             background:rgba(16,185,129,0.1);color:#6ee7b7;">
                 ✅ Sin errores
               </span>`}
        </div>
        <p style="font-size:12px;color:#64748b;margin-bottom:12px;">
          Estas categorías no tienen grupos A/B. Si ves ⚠️, haz clic en la fila para expandirla y usa ✕ para limpiar.
          También puedes expandir cualquier fila para editar manualmente.
        </p>
        ${rows.join('')}`;
    };

    // ── Actualizar barra de estado ────────────────────────────────────────────
    const updateStatus = () => {
      const totalMulti = multiGroupCats.length;
      const doneMulti  = multiGroupCats.filter(gc => {
        const cats = teamsByCat[`${gc.sport}||${gc.category}||${gc.gender}`] || [];
        return cats.length > 0 && cats.every(t => t.group_name);
      }).length;
      const totalErrors = singleGroupCats.reduce((acc, gc) => {
        return acc + (teamsByCat[gc.key] || []).filter(t => t.group_name).length;
      }, 0);

      const allOk = doneMulti === totalMulti && totalErrors === 0;
      const statusEl = document.getElementById('grp-status');
      if (!statusEl) return;

      if (allOk) {
        statusEl.innerHTML = `<span style="color:#6ee7b7;font-weight:700;">✅ Todo listo — grupos A/B asignados y sin errores</span>`;
      } else {
        const parts = [];
        if (totalMulti > 0)
          parts.push(`<span style="color:${doneMulti===totalMulti?'#6ee7b7':'#fbbf24'};">${doneMulti}/${totalMulti} categorías A/B completas</span>`);
        if (totalErrors > 0)
          parts.push(`<span style="color:#f87171;">⚠️ ${totalErrors} asignación(es) incorrecta(s)</span>`);
        statusEl.innerHTML = parts.join('<span style="color:#475569;margin:0 12px;">·</span>');
      }
    };

    // ── HTML base ─────────────────────────────────────────────────────────────
    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:#a78bfa;">📋 Asignación de Grupos</h2>
        <p class="text-gray-400 mt-1">
          Asigna grupos A/B y verifica que las categorías de un solo grupo no tengan errores.
        </p>
      </div>

      <div class="card mb-5" style="border-top:4px solid #a78bfa;padding:14px 20px;
                                     display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div id="grp-status" style="flex:1;font-size:14px;"></div>
        <button class="btn-primary" onclick="App.navigate('generateSchedule')">
          🗓️ Ir a Generar Torneo →
        </button>
      </div>

      <div id="grp-container"></div>
    `;

    // ── Render completo ───────────────────────────────────────────────────────
    const renderAll = () => {
      const cont = document.getElementById('grp-container');
      if (cont) cont.innerHTML = renderMultiSection() + renderSingleSection();
      updateStatus();
    };

    // ── Handlers globales ─────────────────────────────────────────────────────
    window._grpSet = async (teamId, groupName) => {
      try {
        await Api.setTeamGroup(teamId, groupName);
        const team = teams.find(t => t.id === teamId);
        if (team) team.group_name = groupName || null;
        renderAll();
      } catch(e) {
        Utils.toast('Error al guardar: ' + e.message, 'error');
      }
    };

    window._grpToggle = (sectionId) => {
      const el    = document.getElementById(sectionId);
      const arrow = document.getElementById(sectionId + '-arrow');
      if (!el) return;
      const open = el.style.display !== 'none';
      el.style.display  = open ? 'none' : 'block';
      if (arrow) arrow.textContent = open ? '▶' : '▼';
    };

    renderAll();

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

window.Pages = window.Pages || {};
window.Pages.Groups = Pages.Groups;
