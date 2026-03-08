/**
 * Ranking Olimpico - Medallero por colegio
 * Oro al campeon, plata al subcampeon, bronce al tercero de cada categoria.
 * Orden: mas oros > mas platas > mas bronces > total medallas.
 */
Pages.OlympicRanking = async function(container) {
  container.innerHTML = Utils.spinner();
  try {
    const [standings, schools, matches, indMedalsSummary] = await Promise.all([
      Api.getStandings().catch(() => Api.getTeamStandings().catch(() => [])),
      Api.getSchools(),
      Api.getMatches(),
      Api.getIndividualMedalsSummary().catch(() => []),
    ]);

    const finishedMatches = matches.filter(m => m.status === 'finished');
    const totalMatches    = matches.length;
    const progress = totalMatches > 0 ? Math.round((finishedMatches.length / totalMatches) * 100) : 0;

    // Logo lookup
    const schoolLogos = {};
    schools.forEach(s => { schoolLogos[s.name] = s.logo_url || null; });

    // Agrupar standings por categoria (sport + category + gender)
    const byCat = {};
    (standings || []).forEach(t => {
      const key = `${t.sport}||${t.category}||${t.gender}`;
      if (!byCat[key]) byCat[key] = { sport: t.sport, category: t.category, gender: t.gender, teams: [] };
      byCat[key].teams.push(t);
    });

    // Medallas solo de partidos de fase final (final, third_place)
    // Ganador de "final" = oro, perdedor de "final" = plata
    // Ganador de "third_place" = bronce
    const schoolMap = {};

    const ensureSchool = (name) => {
      if (!schoolMap[name]) {
        schoolMap[name] = { name, golds: 0, silvers: 0, bronzes: 0, total: 0, logo_url: schoolLogos[name] || null, details: [] };
      }
    };

    const finalMatches = finishedMatches.filter(m =>
      m.phase === 'final' || m.phase === 'third_place'
    );

    finalMatches.forEach(m => {
      const s1 = m.team1?.school?.name || m.team1?.name || '';
      const s2 = m.team2?.school?.name || m.team2?.name || '';
      const sc1 = m.team1_score || 0;
      const sc2 = m.team2_score || 0;
      const catLabel = `${m.sport || ''} ${m.gender || ''} ${m.category || ''}`;

      if (m.phase === 'final' && sc1 !== sc2) {
        const winner = sc1 > sc2 ? s1 : s2;
        const loser  = sc1 > sc2 ? s2 : s1;
        if (winner) { ensureSchool(winner); schoolMap[winner].golds++; schoolMap[winner].total++; schoolMap[winner].details.push({ cat: catLabel, medal: 'gold' }); }
        if (loser)  { ensureSchool(loser);  schoolMap[loser].silvers++; schoolMap[loser].total++; schoolMap[loser].details.push({ cat: catLabel, medal: 'silver' }); }
      }
      if (m.phase === 'third_place' && sc1 !== sc2) {
        const winner = sc1 > sc2 ? s1 : s2;
        if (winner) { ensureSchool(winner); schoolMap[winner].bronzes++; schoolMap[winner].total++; schoolMap[winner].details.push({ cat: catLabel, medal: 'bronze' }); }
      }
    });

    // Merge individual sport medals
    (indMedalsSummary || []).forEach(entry => {
      const name = entry.school;
      if (!name) return;
      ensureSchool(name);
      if (entry.logo_url && !schoolMap[name].logo_url) schoolMap[name].logo_url = entry.logo_url;
      schoolMap[name].golds   += (entry.golds || 0);
      schoolMap[name].silvers += (entry.silvers || 0);
      schoolMap[name].bronzes += (entry.bronzes || 0);
      schoolMap[name].total   += (entry.golds || 0) + (entry.silvers || 0) + (entry.bronzes || 0);
      (entry.details || []).forEach(d => {
        const mIcon = d.medal === 'gold' ? 'gold' : d.medal === 'silver' ? 'silver' : 'bronze';
        schoolMap[name].details.push({ cat: `${d.sport} ${d.description || ''}`.trim(), medal: mIcon });
      });
    });

    // Incluir TODOS los colegios (de la tabla schools), no solo los que tienen equipos
    schools.forEach(s => {
      if (s.name) ensureSchool(s.name);
    });

    // Ordenar: oros > platas > bronces > total
    const ranked = Object.values(schoolMap).sort((a, b) =>
      (b.golds - a.golds) ||
      (b.silvers - a.silvers) ||
      (b.bronzes - a.bronzes) ||
      (b.total - a.total)
    );

    const totalCategories = Object.keys(byCat).length;

    // Helpers
    const medalIcon = (pos) => {
      if (pos === 0) return '<span style="font-size:28px;">&#x1F947;</span>';
      if (pos === 1) return '<span style="font-size:28px;">&#x1F948;</span>';
      if (pos === 2) return '<span style="font-size:28px;">&#x1F949;</span>';
      return `<span style="font-size:18px;font-weight:900;color:var(--muted);">${pos + 1}</span>`;
    };

    const posColor = (pos) => {
      if (pos === 0) return '#fbbf24';
      if (pos === 1) return 'var(--muted)';
      if (pos === 2) return '#cd7f32';
      return 'var(--text)';
    };

    const logoHtml = (name, logoUrl, size) => {
      const initials = Utils.schoolInitials ? Utils.schoolInitials(name) : name.slice(0, 2).toUpperCase();
      if (logoUrl) {
        return `<img src="${logoUrl}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:contain;background:white;padding:${size > 40 ? 6 : 3}px;"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                <div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent));display:none;align-items:center;justify-content:center;font-size:${Math.round(size/3)}px;font-weight:900;color:white;">${initials}</div>`;
      }
      return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent));display:flex;align-items:center;justify-content:center;font-size:${Math.round(size/3)}px;font-weight:900;color:white;">${initials}</div>`;
    };

    const podium = ranked.slice(0, 3);

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <h2 class="text-3xl font-black" style="color:#fbbf24;display:flex;align-items:center;gap:10px;">
          &#x1F3C5; Medallero Olimpico
        </h2>
        <p class="text-gray-400 mt-1" style="font-size:13px;">
          Oro al campeon, plata al subcampeon, bronce al tercero de cada categoria
        </p>
      </div>

      <!-- Progreso del torneo -->
      <div class="card mb-6" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Progreso del torneo</div>
          <div style="background:#1e293b;border-radius:8px;height:10px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,var(--accent),var(--accent));height:100%;width:${progress}%;transition:width .5s;border-radius:8px;"></div>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${finishedMatches.length} de ${totalMatches} partidos jugados (${progress}%)</div>
        </div>
        <div style="display:flex;gap:16px;text-align:center;">
          <div>
            <div style="font-size:22px;font-weight:900;color:var(--accent);">${ranked.length}</div>
            <div style="font-size:11px;color:var(--muted);">Colegios</div>
          </div>
          <div>
            <div style="font-size:22px;font-weight:900;color:var(--purple);">${totalCategories}</div>
            <div style="font-size:11px;color:var(--muted);">Categorias</div>
          </div>
        </div>
      </div>

      ${podium.length >= 3 ? `
      <!-- Podio -->
      <div style="display:flex;justify-content:center;align-items:flex-end;gap:12px;margin-bottom:32px;flex-wrap:wrap;">
        ${[1, 0, 2].map(idx => {
          const s = podium[idx];
          if (!s) return '';
          const heights = [210, 165, 130];
          const h = heights[idx];
          const medals = [
            { icon: '&#x1F947;', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)' },
            { icon: '&#x1F948;', color: 'var(--muted)', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.4)' },
            { icon: '&#x1F949;', color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.4)' },
          ];
          const m = medals[idx];
          return `
            <div style="text-align:center;width:190px;">
              <div style="font-size:40px;margin-bottom:8px;">${m.icon}</div>
              <div style="display:flex;justify-content:center;margin-bottom:8px;">
                ${logoHtml(s.name, s.logo_url, 64)}
              </div>
              <div style="font-weight:700;font-size:14px;color:white;margin-bottom:4px;">${Utils.truncate(s.name, 22)}</div>
              <div style="background:${m.bg};border:2px solid ${m.border};border-radius:12px;
                          height:${h}px;display:flex;flex-direction:column;justify-content:center;align-items:center;
                          padding:16px 8px;">
                <div style="display:flex;gap:10px;font-size:18px;font-weight:800;margin-bottom:8px;">
                  <span style="color:#fbbf24;">&#x1F947; ${s.golds}</span>
                  <span style="color:var(--muted);">&#x1F948; ${s.silvers}</span>
                  <span style="color:#cd7f32;">&#x1F949; ${s.bronzes}</span>
                </div>
                <div style="font-size:32px;font-weight:900;color:${m.color};">${s.total}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px;">medallas totales</div>
              </div>
            </div>`;
        }).join('')}
      </div>` : ''}

      <!-- Tabla medallero -->
      <div class="card">
        <h3 class="text-xl font-bold mb-4">Medallero General</h3>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:500px;">
            <thead>
              <tr style="color:var(--muted);font-size:12px;text-align:center;">
                <th style="padding:10px;text-align:center;width:50px;">#</th>
                <th style="padding:10px;text-align:left;">Colegio</th>
                <th style="padding:10px;">&#x1F947;</th>
                <th style="padding:10px;">&#x1F948;</th>
                <th style="padding:10px;">&#x1F949;</th>
                <th style="padding:10px;color:#fbbf24;font-size:14px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${ranked.map((s, i) => `
                <tr class="table-row" style="border-bottom:1px solid var(--border);${i < 3 ? 'background:rgba(251,191,36,0.03);' : ''}cursor:pointer;"
                    onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? '' : 'none'">
                  <td style="padding:12px;text-align:center;">${medalIcon(i)}</td>
                  <td style="padding:12px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      ${logoHtml(s.name, s.logo_url, 32)}
                      <span style="font-weight:700;color:${posColor(i)};">${Utils.truncate(s.name, 28)}</span>
                    </div>
                  </td>
                  <td style="padding:10px;text-align:center;font-weight:800;font-size:16px;color:#fbbf24;">${s.golds}</td>
                  <td style="padding:10px;text-align:center;font-weight:800;font-size:16px;color:var(--muted);">${s.silvers}</td>
                  <td style="padding:10px;text-align:center;font-weight:800;font-size:16px;color:#cd7f32;">${s.bronzes}</td>
                  <td style="padding:10px;text-align:center;font-weight:900;font-size:20px;color:var(--accent);">${s.total}</td>
                </tr>
                <tr style="display:none;">
                  <td colspan="6" style="padding:4px 12px 12px 60px;">
                    ${s.details.length > 0
                      ? s.details.map(d => {
                          const mIcon = d.medal === 'gold' ? '&#x1F947;' : d.medal === 'silver' ? '&#x1F948;' : '&#x1F949;';
                          return `<div style="font-size:12px;color:var(--muted);padding:2px 0;">${mIcon} ${d.cat}</div>`;
                        }).join('')
                      : '<div style="font-size:12px;color:var(--muted);font-style:italic;">Sin medallas aun</div>'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-top:16px;text-align:center;">
        <p style="font-size:11px;color:var(--muted);">
          Medallas por categoria (deporte + categoria + genero). Click en una fila para ver detalle.
          Orden: mas oros &gt; mas platas &gt; mas bronces.
        </p>
      </div>
    `;

  } catch(e) {
    container.innerHTML = `<div class="text-red-400 p-8">Error: ${e.message}</div>`;
  }
};

window.Pages = window.Pages || {};
window.Pages.OlympicRanking = Pages.OlympicRanking;
