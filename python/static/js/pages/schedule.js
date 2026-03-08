/**
 * Página: Generar Torneo Big Games 2026
 */
Pages.Schedule = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    if (!App.isEditor()) {
      container.innerHTML = `
        <div class="mb-6">
          <h2 class="text-3xl font-black" style="color:var(--accent);">🏆 Generar Torneo</h2>
        </div>
        <div class="card" style="border:1px solid rgba(220,38,38,0.3);background:rgba(220,38,38,0.1);">
          <p style="color:#fca5a5;">⚠️ Solo los editores pueden generar el torneo.</p>
        </div>`;
      return;
    }

    let preview = { groups: [], total_expected_matches: 0, total_intra_matches: 0, total_inter_matches: 0 };
    try { preview = await Api.getSchedulePreview(); } catch(e) { console.warn('Preview no disponible:', e.message); }

    let existingCount = 0;
    try { const ex = await Api.getMatches(); existingCount = ex.length; } catch(e) {}

    container.innerHTML = `
      <div class="mb-6">
        <h2 class="text-3xl font-black" style="color:var(--accent);">🏆 Generar Torneo Big Games 2026</h2>
        <p class="text-gray-400 mt-1">Genera todos los partidos respetando deportes, categorías, grupos, canchas y horarios</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">

        <!-- Config -->
        <div class="card" style="border-top:4px solid var(--accent);">
          <h3 class="text-xl font-bold mb-4">⚙️ Opciones</h3>

          ${existingCount > 0 ? `
          <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);
                      border-radius:8px;padding:12px;margin-bottom:16px;">
            <p style="font-size:13px;color:#fbbf24;font-weight:600;">
              ⚠️ Hay ${existingCount} partidos en la base de datos
            </p>
            <p style="font-size:12px;color:var(--muted);margin-top:4px;">
              Se borrarán todos al regenerar el torneo.
            </p>
          </div>` : `
          <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);
                      border-radius:8px;padding:12px;margin-bottom:16px;">
            <p style="font-size:13px;color:#6ee7b7;font-weight:600;">✅ Tabla limpia — lista para generar</p>
          </div>`}

          <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);
                      border-radius:8px;padding:12px;margin-bottom:16px;">
            <p style="font-size:13px;color:var(--accent);font-weight:600;margin-bottom:6px;">
              ✅ Configuración automática Big Games 2026
            </p>
            <ul style="font-size:12px;color:var(--muted);line-height:1.9;margin:0;padding-left:16px;">
              <li>⚽ Fútbol: 57 min · intervalo 70 min · grupos A/B por categoría</li>
              <li>🏀 Baloncesto: 47 min · intervalo 70 min · British Basket 1 y 2</li>
              <li>🏐 Voleibol: 75 min · intervalo 75 min · máx. 2 partidos seguidos</li>
              <li>🗓️ Voleibol desde 6 mar · Fútbol/Basket desde 11 mar</li>
              <li>⏰ Último partido inicia máx. 1h antes del cierre</li>
              <li>⚠️ Voleibol 2007-09 finaliza el viernes 13 a las 16:00</li>
            </ul>
          </div>

          <button id="sc-btn" class="btn-primary"
                  style="width:100%;font-size:18px;padding:16px;font-weight:800;">
            🗓️ ${existingCount > 0 ? 'Borrar y Regenerar Torneo' : 'Generar Torneo Completo'}
          </button>
        </div>

        <!-- Preview -->
        <div class="card" style="border-top:4px solid var(--purple);">
          <h3 class="text-xl font-bold mb-2">📊 Vista previa</h3>
          ${preview.groups.length > 0 ? `
          <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;">
            <div style="background:rgba(16,185,129,0.1);border-radius:8px;padding:8px 14px;text-align:center;">
              <div style="font-size:22px;font-weight:900;color:#6ee7b7;">${preview.total_expected_matches}</div>
              <div style="font-size:11px;color:var(--muted);">partidos totales</div>
            </div>
            ${preview.total_intra_matches > 0 ? `
            <div style="background:rgba(59,130,246,0.1);border-radius:8px;padding:8px 14px;text-align:center;">
              <div style="font-size:20px;font-weight:800;color:var(--accent);">${preview.total_intra_matches}</div>
              <div style="font-size:11px;color:var(--muted);">intragrupo</div>
            </div>` : ''}
            ${preview.total_inter_matches > 0 ? `
            <div style="background:rgba(245,158,11,0.1);border-radius:8px;padding:8px 14px;text-align:center;">
              <div style="font-size:20px;font-weight:800;color:#fbbf24;">${preview.total_inter_matches}</div>
              <div style="font-size:11px;color:var(--muted);">intergrupo</div>
            </div>` : ''}
          </div>
          <div style="max-height:460px;overflow-y:auto;">
            ${_scRenderGroups(preview.groups)}
          </div>` : `
          <p class="text-gray-400 text-sm mt-2">
            ${preview.groups.length === 0 && existingCount === 0
              ? 'No hay equipos registrados aún.'
              : 'Preview no disponible.'}
          </p>`}
        </div>
      </div>

      <div id="sc-result" class="mt-6"></div>
    `;

    document.getElementById('sc-btn').addEventListener('click', async () => {
      const btn    = document.getElementById('sc-btn');
      const result = document.getElementById('sc-result');
      btn.disabled = true;
      btn.textContent = '⏳ Procesando...';
      result.innerHTML = `
        <div class="card" style="border-top:4px solid var(--accent);">
          <div id="sc-log" style="font-family:monospace;font-size:13px;color:var(--accent);line-height:2;"></div>
        </div>`;

      const log = (msg) => {
        const el = document.getElementById('sc-log');
        if (el) el.innerHTML += msg + '<br>';
      };

      try {
        log('🗑️ Borrando partidos existentes...');
        try {
          await Api.clearAllMatches();
          log('✅ Tabla matches limpiada.');
        } catch(e) {
          log('⚠️ No se pudo limpiar: ' + e.message);
        }

        log('⚙️ Generando fixture completo con grupos A/B e intergrupos...');
        const res = await Api.generateAllSchedule({ clear_existing: false });

        const intraLine = res.intra_matches > 0
          ? `<span style="color:var(--accent);">${res.intra_matches} intragrupo</span>` : '';
        const interLine = res.inter_matches > 0
          ? `<span style="color:#fbbf24;">${res.inter_matches} intergrupo</span>` : '';
        const phaseLine = [intraLine, interLine].filter(Boolean).join(' + ');

        result.innerHTML = `
          <div class="card" style="border-top:4px solid var(--green);">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
              <div style="font-size:48px;">✅</div>
              <div>
                <div style="font-size:28px;font-weight:900;color:#6ee7b7;">${res.total_matches} partidos generados</div>
                <div style="color:var(--muted);margin-top:4px;">${phaseLine || res.groups.length + ' grupos'}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:20px;">
              ${res.groups.map(g => {
                const color = Utils.sportColor(g.sport);
                const grpBadge = g.num_groups > 1
                  ? `<span style="font-size:10px;background:rgba(139,92,246,0.2);color:var(--purple);
                                  border-radius:4px;padding:1px 5px;margin-left:4px;">
                       ${g.num_groups} grupos
                     </span>` : '';
                return `
                  <div style="background:var(--surface);border-radius:8px;padding:12px;
                               border-left:3px solid ${color};">
                    <div style="font-size:13px;font-weight:700;color:white;">
                      ${Utils.sportIcon(g.sport)} ${g.sport}${grpBadge}
                    </div>
                    <div style="font-size:12px;color:var(--muted);margin-top:2px;">${g.category} · ${g.gender}</div>
                    <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:11px;color:var(--muted);">👥 ${g.teams} equipos</span>
                      <span style="font-size:13px;font-weight:700;color:${color};">${g.matches} partidos</span>
                    </div>
                    ${g.inter_matches > 0 ? `
                    <div style="margin-top:4px;font-size:11px;color:var(--muted);">
                      ${g.intra_matches} intra + ${g.inter_matches} inter
                    </div>` : ''}
                  </div>`;
              }).join('')}
            </div>
            ${res.warning ? `
            <div style="margin-bottom:16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
                        border-radius:8px;padding:12px;">
              <p style="font-size:12px;color:#fbbf24;font-weight:600;margin-bottom:4px;">⚠️ Columnas group_name/phase no disponibles</p>
              <p style="font-size:11px;color:var(--muted);">
                Los partidos se generaron sin información de grupo/fase. Para habilitarlo, ejecuta en Supabase SQL Editor:<br>
                <code style="color:#c4b5fd;">ALTER TABLE matches ADD COLUMN IF NOT EXISTS group_name text;</code><br>
                <code style="color:#c4b5fd;">ALTER TABLE matches ADD COLUMN IF NOT EXISTS phase text DEFAULT 'group';</code><br>
                Luego ve a Supabase → Project Settings → API → <b>Reload Schema</b>, y regenera el torneo.
              </p>
            </div>` : ''}
            <button class="btn-primary" onclick="App.navigate('calendar')">
              📅 Ver Calendario →
            </button>
          </div>`;

        Utils.toast(res.total_matches + ' partidos generados exitosamente', 'success');
      } catch(e) {
        result.innerHTML = `<div class="card" style="border:1px solid rgba(220,38,38,0.3);color:#fca5a5;">
          ❌ ${e.message}
        </div>`;
        Utils.toast(e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🗓️ Generar Torneo Completo';
      }
    });

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error cargando la página: ${e.message}</div>`;
  }
};


function _scRenderGroups(groups) {
  if (!groups || groups.length === 0) return '<p class="text-gray-400">Sin datos</p>';

  const bySport = {};
  for (const g of groups) {
    (bySport[g.sport] = bySport[g.sport] || []).push(g);
  }

  return Object.entries(bySport).map(([sport, items]) => {
    const color       = Utils.sportColor(sport);
    const icon        = Utils.sportIcon(sport);
    const totalIntra  = items.reduce((s, i) => s + (i.intra_matches || i.expected_matches || 0), 0);
    const totalInter  = items.reduce((s, i) => s + (i.inter_matches || 0), 0);
    const totalAll    = totalIntra + totalInter;

    return `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:6px;
                    display:flex;justify-content:space-between;align-items:center;">
          <span>${icon} ${sport}</span>
          <span style="color:var(--muted);font-size:12px;">${totalAll} partidos</span>
        </div>
        ${items.map(g => {
          const hasGroups = g.num_groups > 1;
          const perGrp    = g.teams_per_group || Math.floor(g.teams / (g.num_groups || 1));
          return `
            <div style="padding:8px 10px;border-radius:6px;margin-bottom:4px;
                        background:var(--surface);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <span style="font-size:12px;color:var(--text);">${g.category}</span>
                  <span style="font-size:11px;color:var(--muted);margin-left:6px;">
                    ${g.gender === 'Masculino' ? '🔵' : g.gender === 'Femenino' ? '🔴' : '🟣'} ${g.gender}
                  </span>
                  ${hasGroups ? `<span style="font-size:10px;background:rgba(139,92,246,0.15);color:var(--purple);
                                              border-radius:3px;padding:1px 4px;margin-left:4px;">
                                  ${g.num_groups} grupos × ${perGrp} eq
                                </span>` : ''}
                </div>
                <div style="text-align:right;">
                  <span style="font-size:11px;color:var(--muted);">👥 ${g.teams}</span>
                  <span style="font-size:12px;font-weight:700;color:${color};margin-left:8px;">
                    ${g.expected_matches} partidos
                  </span>
                </div>
              </div>
              ${hasGroups && g.inter_matches > 0 ? `
              <div style="font-size:11px;color:var(--muted);margin-top:3px;padding-left:2px;">
                ${g.intra_matches} intragrupo + ${g.inter_matches} intergrupo
              </div>` : ''}
            </div>`;
        }).join('')}
      </div>`;
  }).join('');
}

window.Pages = window.Pages || {};
window.Pages.Schedule = Pages.Schedule;
