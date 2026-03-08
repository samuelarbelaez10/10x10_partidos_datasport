/**
 * Pagina: Colegios - CRUD de colegios y equipos
 */
Pages.Schools = async function(container, opts) {
  container.innerHTML = Utils.spinner();
  try {
    const [schools, teams, sports, categories] = await Promise.all([
      Api.getSchools(),
      Api.getTeams(),
      Api.getSports(),
      Api.getCategories(),
    ]);

    if (opts && opts.schoolId) {
      _showSchoolDetail(container, opts.schoolId, schools, teams, sports, categories);
      return;
    }

    // ── Add school form (editor only) ──
    var addSchoolHtml = '';
    if (App.isEditor()) {
      addSchoolHtml =
        '<div class="card mb-6" style="border-top:3px solid var(--accent);">' +
          '<h3 style="font-weight:700;margin-bottom:12px;">Agregar Colegio</h3>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">' +
            '<div style="flex:2;min-width:180px;">' +
              '<label class="text-gray-400 text-sm block mb-1">Nombre</label>' +
              '<input type="text" id="add-school-name" class="input-field" placeholder="Ej: Colegio San Jose">' +
            '</div>' +
            '<div style="flex:2;min-width:180px;">' +
              '<label class="text-gray-400 text-sm block mb-1">URL del Logo (opcional)</label>' +
              '<input type="text" id="add-school-logo" class="input-field" placeholder="https://...">' +
            '</div>' +
            '<button class="btn-primary" onclick="window._addSchool()">+ Agregar</button>' +
          '</div>' +
        '</div>';
    }

    container.innerHTML =
      '<div class="mb-6">' +
        '<h2 class="text-3xl font-black" style="color:var(--accent);">🏫 Colegios</h2>' +
        '<p class="text-gray-400 mt-1">' + schools.length + ' colegios participantes</p>' +
      '</div>' +
      addSchoolHtml +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">' +
        schools.map(function(school) {
          var schoolTeams = teams.filter(function(t) { return t.school?.id === school.id || t.school?.name === school.name; });
          var sportNames = [];
          schoolTeams.forEach(function(t) {
            var sn = t.sport?.name;
            if (sn && sportNames.indexOf(sn) === -1) sportNames.push(sn);
          });
          var logoHtml = school.logo_url
            ? '<img src="' + school.logo_url + '" style="width:80px;height:80px;border-radius:50%;margin:0 auto 12px;object-fit:contain;background:white;padding:8px;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
              '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent));display:none;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:white;margin:0 auto 12px;">' + Utils.schoolInitials(school.name) + '</div>'
            : '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent));display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:white;margin:0 auto 12px;">' + Utils.schoolInitials(school.name) + '</div>';
          var sportBadges = sportNames.map(function(s) {
            return '<span style="background:var(--surface);border-radius:8px;padding:2px 8px;font-size:11px;">' + Utils.sportIcon(s) + ' ' + s + '</span>';
          }).join('');
          return '<div class="card" style="cursor:pointer;text-align:center;" onclick="window._openSchool(\'' + school.id + '\')">' +
            logoHtml +
            '<h3 style="font-weight:700;font-size:16px;">' + school.name + '</h3>' +
            '<p style="color:var(--muted);font-size:13px;margin-top:4px;">' + schoolTeams.length + ' equipos</p>' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:8px;">' + sportBadges + '</div>' +
          '</div>';
        }).join('') +
      '</div>';

    Pages._schoolsData = { schools, teams, sports, categories };

    window._openSchool = function(id) {
      var d = Pages._schoolsData;
      _showSchoolDetail(document.getElementById('page-content'), id, d.schools, d.teams, d.sports, d.categories);
    };

    window._addSchool = async function() {
      var name = (document.getElementById('add-school-name')?.value || '').trim();
      if (!name) { Utils.toast('Ingresa el nombre del colegio', 'error'); return; }
      var logo = (document.getElementById('add-school-logo')?.value || '').trim();
      try {
        var data = { name: name };
        if (logo) data.logo_url = logo;
        await Api.createSchool(data);
        Utils.toast('Colegio creado', 'success');
        App.navigate('schools');
      } catch(e) {
        Utils.toast('Error: ' + e.message, 'error');
      }
    };

    window._deleteSchool = async function(id, name) {
      if (!confirm('Eliminar "' + name + '"? Se eliminaran todos sus equipos, jugadores y partidos.')) return;
      try {
        await Api.deleteSchool(id);
        Utils.toast(name + ' eliminado', 'success');
        App.navigate('schools');
      } catch(e) { Utils.toast('Error: ' + e.message, 'error'); }
    };

  } catch(e) {
    container.innerHTML = '<div class="text-red-400 p-8">Error: ' + e.message + '</div>';
  }
};

// ─── Detalle del colegio con CRUD de equipos ─────────────────────────────────
function _showSchoolDetail(container, schoolId, schools, teams, sports, categories) {
  var school = schools.find(function(s) { return s.id === schoolId; });
  if (!school) { container.innerHTML = '<div class="text-red-400">Colegio no encontrado</div>'; return; }
  var schoolTeams = teams.filter(function(t) { return t.school?.id === schoolId || t.school?.name === school.name; });

  var logoHtml = school.logo_url
    ? '<img src="' + school.logo_url + '" style="width:100px;height:100px;border-radius:50%;margin:0 auto 16px;object-fit:contain;background:white;padding:12px;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
      '<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent));display:none;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:white;margin:0 auto 16px;">' + Utils.schoolInitials(school.name) + '</div>'
    : '<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent));display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:white;margin:0 auto 16px;">' + Utils.schoolInitials(school.name) + '</div>';

  var deleteBtn = App.isEditor()
    ? '<button class="btn-danger" style="margin-top:12px;" onclick="window._deleteSchool(\'' + school.id + '\',\'' + school.name.replace(/'/g, "\\'") + '\')">Eliminar Colegio</button>'
    : '';

  // ── Add team form (editor only) ──
  var addTeamHtml = '';
  if (App.isEditor()) {
    var sportOpts = sports.map(function(s) {
      return '<option value="' + s.id + '">' + Utils.sportIcon(s.name) + ' ' + s.name + '</option>';
    }).join('');
    var catOpts = categories.map(function(c) {
      return '<option value="' + c.id + '" data-sport="' + (c.sport_id || '') + '" data-gender="' + (c.gender || '') + '">' + c.name + ' (' + (c.gender || '') + ')</option>';
    }).join('');

    addTeamHtml =
      '<div class="card mb-6" style="border-top:3px solid var(--green);">' +
        '<h3 style="font-weight:700;margin-bottom:12px;">Agregar Equipo a ' + school.name + '</h3>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">' +
          '<div style="flex:1;min-width:150px;">' +
            '<label class="text-gray-400 text-sm block mb-1">Deporte</label>' +
            '<select id="add-team-sport" class="input-field" onchange="window._filterCatsForSport()">' +
              '<option value="">-- Seleccionar --</option>' + sportOpts +
            '</select>' +
          '</div>' +
          '<div style="flex:1;min-width:150px;">' +
            '<label class="text-gray-400 text-sm block mb-1">Categoria</label>' +
            '<select id="add-team-cat" class="input-field">' +
              '<option value="">-- Seleccionar deporte primero --</option>' +
            '</select>' +
          '</div>' +
          '<button class="btn-primary" onclick="window._addTeamToSchool(\'' + school.id + '\')">+ Agregar Equipo</button>' +
        '</div>' +
      '</div>';
  }

  // ── Team cards ──
  var teamCardsHtml = schoolTeams.length === 0
    ? Utils.emptyState('Sin equipos registrados')
    : '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">' +
        schoolTeams.map(function(t) {
          var color = Utils.sportColor(t.sport?.name || '');
          var delBtn = App.isEditor()
            ? '<button class="btn-danger" style="font-size:11px;padding:3px 8px;margin-top:6px;" onclick="event.stopPropagation();window._deleteTeamFromSchool(\'' + t.id + '\',\'' + (t.name || '').replace(/'/g, "\\'") + '\')">Eliminar</button>'
            : '';
          return '<div class="card" style="cursor:pointer;border-left:4px solid ' + color + ';" onclick="App.navigate(\'teams\',{teamId:\'' + t.id + '\'})">' +
            '<div style="font-size:13px;color:var(--muted);">' + Utils.sportIcon(t.sport?.name || '') + ' ' + (t.sport?.name || '') + '</div>' +
            '<div style="font-weight:700;margin-top:4px;">' + (t.name || '') + '</div>' +
            '<div style="font-size:12px;color:var(--muted);">' + (t.category?.name || '') + ' &bull; ' + (t.gender || '') + '</div>' +
            delBtn +
          '</div>';
        }).join('') +
      '</div>';

  container.innerHTML =
    '<div class="mb-4"><button class="btn-ghost" onclick="App.navigate(\'schools\')">← Volver</button></div>' +
    '<div class="card mb-6" style="text-align:center;">' +
      logoHtml +
      '<h2 style="font-size:28px;font-weight:900;color:white;">' + school.name + '</h2>' +
      '<p style="color:var(--muted);margin-top:4px;">' + schoolTeams.length + ' equipos en el torneo</p>' +
      deleteBtn +
    '</div>' +
    addTeamHtml +
    '<h3 class="text-xl font-bold mb-4">Equipos</h3>' +
    teamCardsHtml;

  // ── Global handlers ──
  window._filterCatsForSport = function() {
    var sportId = document.getElementById('add-team-sport')?.value || '';
    var catSel = document.getElementById('add-team-cat');
    if (!catSel) return;
    if (!sportId) {
      catSel.innerHTML = '<option value="">-- Seleccionar deporte primero --</option>';
      return;
    }
    var filtered = categories.filter(function(c) { return c.sport_id === sportId; });
    if (filtered.length === 0) {
      catSel.innerHTML = '<option value="">No hay categorias para este deporte</option>';
      return;
    }
    catSel.innerHTML = filtered.map(function(c) {
      return '<option value="' + c.id + '">' + c.name + ' (' + (c.gender || '') + ')</option>';
    }).join('');
  };

  window._addTeamToSchool = async function(schoolId) {
    var sportId = document.getElementById('add-team-sport')?.value || '';
    var catId = document.getElementById('add-team-cat')?.value || '';
    if (!sportId) { Utils.toast('Selecciona un deporte', 'error'); return; }
    if (!catId) { Utils.toast('Selecciona una categoria', 'error'); return; }

    // Build team name from school + sport
    var schoolObj = schools.find(function(s) { return s.id === schoolId; });
    var sportObj = sports.find(function(s) { return s.id === sportId; });
    var catObj = categories.find(function(c) { return c.id === catId; });
    var teamName = (schoolObj?.name || 'Equipo') + ' - ' + (sportObj?.name || '') + ' ' + (catObj?.name || '');

    try {
      await Api.createTeam({
        name: teamName,
        school_id: schoolId,
        sport_id: sportId,
        category_id: catId,
      });
      Utils.toast('Equipo creado', 'success');
      App.navigate('schools', { schoolId: schoolId });
    } catch(e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  };

  window._deleteTeamFromSchool = async function(teamId, teamName) {
    if (!confirm('Eliminar equipo "' + teamName + '"? Se eliminaran sus jugadores y partidos.')) return;
    try {
      await Api.deleteTeam(teamId);
      Utils.toast('Equipo eliminado', 'success');
      App.navigate('schools', { schoolId: schoolId });
    } catch(e) {
      Utils.toast('Error: ' + e.message, 'error');
    }
  };
}

window.Pages = Pages;
