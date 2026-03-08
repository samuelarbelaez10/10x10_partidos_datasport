/**
 * Deportes Individuales - Asignar medallas por colegio
 */
window.Pages = window.Pages || {};
Pages.IndividualSports = async function(container) {
  container.innerHTML = Utils.spinner();
  try {
    const [sports, schools, medals] = await Promise.all([
      Api.getSports(),
      Api.getSchools(),
      Api.getIndividualMedals(),
    ]);

    const individualNames = [
      'Gimnasia','Tenis','Golf','Ajedrez','Padel','Natacion','Hipica',
      'gimnasia','tenis','golf','ajedrez','padel','natacion','hipica',
      'Pádel','pádel','Natación','natación','Hípica','hípica',
    ];
    const indSports = sports.filter(s => individualNames.includes(s.name));

    if (indSports.length === 0) {
      container.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><p style="color:#64748b;">No se encontraron deportes individuales en Supabase.</p></div>';
      return;
    }

    const IC = { 'Gimnasia':'🤸','Tenis':'🎾','Golf':'⛳','Ajedrez':'♟️','Padel':'🏸','Pádel':'🏸','Natacion':'🏊','Natación':'🏊','Hipica':'🏇','Hípica':'🏇' };
    const CL = { 'Gimnasia':'#ec4899','Tenis':'#84cc16','Golf':'#22c55e','Ajedrez':'#a78bfa','Padel':'#f97316','Pádel':'#f97316','Natacion':'#06b6d4','Natación':'#06b6d4','Hipica':'#d97706','Hípica':'#d97706' };

    const isEditor = App.isEditor() || App.isArbitro();
    let selSport = null;
    let selSchool = null;

    const sortedSchools = [...schools].sort((a, b) => a.name.localeCompare(b.name));

    function logo(name, url, sz) {
      const ini = (name || '??').slice(0,2).toUpperCase();
      if (url) {
        return '<img src="' + url + '" style="width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;object-fit:contain;background:white;padding:2px;flex-shrink:0;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
               '<div style="width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);display:none;align-items:center;justify-content:center;font-size:' + Math.round(sz/3) + 'px;font-weight:900;color:white;flex-shrink:0;">' + ini + '</div>';
      }
      return '<div style="width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:' + Math.round(sz/3) + 'px;font-weight:900;color:white;flex-shrink:0;">' + ini + '</div>';
    }

    function render() {
      var sportMedals = selSport ? medals.filter(function(m){ return m.sport_id === selSport.id; }) : [];
      var medalsBySchool = {};
      sportMedals.forEach(function(m) {
        if (!medalsBySchool[m.school_id]) medalsBySchool[m.school_id] = { gold:0, silver:0, bronze:0 };
        medalsBySchool[m.school_id][m.medal]++;
      });

      // --- HEADER ---
      var html = '<div style="margin-bottom:24px;">' +
        '<h2 style="font-size:28px;font-weight:900;color:#a78bfa;display:flex;align-items:center;gap:10px;">🎖️ Deportes Individuales</h2>' +
        '<p style="font-size:13px;color:#64748b;margin-top:4px;">Asigna medallas de oro, plata y bronce por colegio</p>' +
      '</div>';

      // --- SPORT CARDS ---
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:28px;">';
      indSports.forEach(function(s) {
        var icon = IC[s.name] || '🏅';
        var color = CL[s.name] || '#60a5fa';
        var active = selSport && selSport.id === s.id;
        var cnt = medals.filter(function(m){ return m.sport_id === s.id; }).length;
        html += '<div onclick="window._indSelectSport(\'' + s.id + '\')" style="' +
          'display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 10px;border-radius:16px;cursor:pointer;' +
          'border:2px solid ' + (active ? color : 'rgba(255,255,255,0.08)') + ';' +
          'background:' + (active ? color + '18' : 'rgba(255,255,255,0.03)') + ';' +
          'transition:all .2s;">' +
          '<span style="font-size:32px;">' + icon + '</span>' +
          '<span style="font-weight:700;font-size:13px;color:' + (active ? color : 'white') + ';">' + s.name + '</span>' +
          (cnt > 0 ? '<span style="font-size:11px;color:#64748b;">' + cnt + ' medalla' + (cnt !== 1 ? 's' : '') + '</span>' : '') +
        '</div>';
      });
      html += '</div>';

      // --- SPORT SELECTED ---
      if (selSport) {
        var sc = CL[selSport.name] || '#60a5fa';

        // Medallas asignadas en este deporte
        if (sportMedals.length > 0) {
          html += '<div class="card" style="margin-bottom:16px;border-color:' + sc + '30;">';
          html += '<h3 style="font-size:16px;font-weight:700;color:' + sc + ';margin-bottom:12px;display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:22px;">' + (IC[selSport.name]||'🏅') + '</span> Medallas en ' + selSport.name + '</h3>';
          sportMedals.forEach(function(m) {
            var mi = m.medal === 'gold' ? '🥇' : m.medal === 'silver' ? '🥈' : '🥉';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
              '<div style="display:flex;align-items:center;gap:10px;">' +
                '<span style="font-size:20px;">' + mi + '</span>' +
                logo(m.school_name || '', m.school_logo, 28) +
                '<span style="font-weight:600;font-size:13px;">' + (m.school_name || '?') + '</span>' +
                (m.description ? '<span style="font-size:11px;color:#475569;margin-left:6px;">(' + m.description + ')</span>' : '') +
              '</div>' +
              (isEditor ? '<button onclick="window._indDeleteMedal(\'' + m.id + '\')" style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);color:#f87171;padding:4px 12px;border-radius:8px;cursor:pointer;font-size:11px;font-family:inherit;">Eliminar</button>' : '') +
            '</div>';
          });
          html += '</div>';
        }

        // Lista de colegios
        html += '<div class="card" style="border-color:' + sc + '20;">';
        html += '<h3 style="font-size:15px;font-weight:700;color:#94a3b8;margin-bottom:14px;">Selecciona un colegio para asignar medalla</h3>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px;">';
        sortedSchools.forEach(function(s) {
          var mc = medalsBySchool[s.id] || { gold:0, silver:0, bronze:0 };
          var total = mc.gold + mc.silver + mc.bronze;
          var isSel = selSchool && selSchool.id === s.id;
          html += '<div onclick="window._indSelectSchool(\'' + s.id + '\')" style="' +
            'display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;cursor:pointer;' +
            'border:1px solid ' + (isSel ? '#3b82f6' : 'rgba(255,255,255,0.06)') + ';' +
            'background:' + (isSel ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.025)') + ';' +
            'transition:all .15s;">' +
            logo(s.name, s.logo_url, 34) +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.name + '</div>' +
              (total > 0 ? '<div style="font-size:11px;margin-top:2px;">' +
                (mc.gold > 0 ? '🥇' + mc.gold + ' ' : '') +
                (mc.silver > 0 ? '🥈' + mc.silver + ' ' : '') +
                (mc.bronze > 0 ? '🥉' + mc.bronze : '') +
              '</div>' : '') +
            '</div>' +
            (isSel ? '<span style="color:#3b82f6;font-size:18px;">&#10003;</span>' : '') +
          '</div>';
        });
        html += '</div>';

        // Panel de asignacion
        if (selSchool && isEditor) {
          html += '<div style="margin-top:20px;padding:20px;background:linear-gradient(135deg,rgba(59,130,246,0.06),rgba(139,92,246,0.06));border-radius:16px;border:1px solid rgba(59,130,246,0.18);">';
          html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
            logo(selSchool.name, selSchool.logo_url, 44) +
            '<div>' +
              '<div style="font-weight:700;font-size:16px;">' + selSchool.name + '</div>' +
              '<div style="font-size:12px;color:#64748b;">Asignar medalla en ' + selSport.name + '</div>' +
            '</div>' +
          '</div>';
          html += '<div style="margin-bottom:14px;">' +
            '<label style="font-size:12px;color:#94a3b8;font-weight:600;">Descripcion (opcional)</label>' +
            '<input type="text" id="ind-medal-desc" class="input-field" style="margin-top:6px;font-size:13px;" placeholder="Ej: 100m libres, kata, singles...">' +
          '</div>';
          html += '<div style="margin-bottom:14px;">' +
            '<label style="font-size:12px;color:#94a3b8;font-weight:600;">Cantidad de medallas</label>' +
            '<input type="number" id="ind-medal-qty" class="input-field" style="margin-top:6px;font-size:15px;width:100px;text-align:center;font-weight:700;" value="1" min="1" max="50">' +
          '</div>';
          html += '<div style="display:flex;gap:10px;">' +
            '<button onclick="window._indAddMedal(\'gold\')" style="flex:1;padding:14px;border-radius:14px;cursor:pointer;background:linear-gradient(135deg,#92400e,#b45309);border:2px solid #fbbf24;color:white;font-weight:800;font-size:15px;font-family:inherit;box-shadow:0 4px 16px rgba(251,191,36,0.25);transition:all .2s;">🥇 Oro</button>' +
            '<button onclick="window._indAddMedal(\'silver\')" style="flex:1;padding:14px;border-radius:14px;cursor:pointer;background:linear-gradient(135deg,#374151,#4b5563);border:2px solid #94a3b8;color:white;font-weight:800;font-size:15px;font-family:inherit;box-shadow:0 4px 16px rgba(148,163,184,0.25);transition:all .2s;">🥈 Plata</button>' +
            '<button onclick="window._indAddMedal(\'bronze\')" style="flex:1;padding:14px;border-radius:14px;cursor:pointer;background:linear-gradient(135deg,#78350f,#92400e);border:2px solid #cd7f32;color:white;font-weight:800;font-size:15px;font-family:inherit;box-shadow:0 4px 16px rgba(205,127,50,0.25);transition:all .2s;">🥉 Bronce</button>' +
          '</div>';
          html += '</div>';
        } else if (selSchool && !isEditor) {
          html += '<div style="margin-top:16px;padding:14px;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:12px;color:#fbbf24;font-size:13px;text-align:center;">Solo el editor puede asignar medallas</div>';
        }

        html += '</div>'; // close card
      } else {
        html += '<div class="card" style="text-align:center;padding:48px;">' +
          '<p style="font-size:48px;margin-bottom:12px;">🏅</p>' +
          '<p style="font-size:16px;color:#94a3b8;">Selecciona un deporte para ver y asignar medallas</p>' +
        '</div>';
      }

      container.innerHTML = html;
    }

    window._indSelectSport = function(id) {
      selSport = indSports.find(function(s){ return s.id === id; }) || null;
      selSchool = null;
      render();
    };
    window._indSelectSchool = function(id) {
      selSchool = schools.find(function(s){ return s.id === id; }) || null;
      render();
    };
    window._indAddMedal = async function(type) {
      if (!selSport || !selSchool) return;
      var desc = (document.getElementById('ind-medal-desc') || {}).value || '';
      desc = desc.trim();
      var qty = parseInt((document.getElementById('ind-medal-qty') || {}).value) || 1;
      if (qty < 1) qty = 1;
      if (qty > 50) qty = 50;
      var label = type === 'gold' ? 'Oro 🥇' : type === 'silver' ? 'Plata 🥈' : 'Bronce 🥉';
      try {
        for (var i = 0; i < qty; i++) {
          var m = await Api.addIndividualMedal({ sport_id: selSport.id, school_id: selSchool.id, medal: type, description: desc });
          m.sport_name = selSport.name;
          m.school_name = selSchool.name;
          m.school_logo = selSchool.logo_url;
          medals.push(m);
        }
        Utils.toast(qty + 'x ' + label + ' asignado a ' + selSchool.name, 'success');
        render();
      } catch(e) { Utils.toast('Error: ' + e.message, 'error'); }
    };
    window._indDeleteMedal = async function(id) {
      if (!confirm('Eliminar esta medalla?')) return;
      try {
        await Api.deleteIndividualMedal(id);
        var idx = medals.findIndex(function(m){ return m.id === id; });
        if (idx >= 0) medals.splice(idx, 1);
        Utils.toast('Medalla eliminada', 'success');
        render();
      } catch(e) { Utils.toast('Error: ' + e.message, 'error'); }
    };

    render();
  } catch(e) {
    container.innerHTML = '<div class="text-red-400 p-8">Error: ' + e.message + '</div>';
  }
};
window.Pages.IndividualSports = Pages.IndividualSports;
