/**
 * Pagina: Escenarios - Gestionar canchas y sedes
 */
window.Pages = window.Pages || {};

Pages.Venues = async function(container) {
  container.innerHTML = Utils.spinner();
  try {
    const venues = await Api.getVenues();

    const renderList = (list) => {
      const el = document.getElementById('venues-list');
      if (!el) return;
      if (list.length === 0) {
        el.innerHTML = Utils.emptyState('No hay escenarios registrados');
        return;
      }
      el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">' +
        list.map(function(v) {
          var deleteBtn = App.isEditor()
            ? '<button class="btn-danger" style="font-size:11px;padding:4px 10px;margin-top:8px;" onclick="event.stopPropagation();window._deleteVenue(\'' + v.id + '\',\'' + (v.name || '').replace(/'/g, "\\'") + '\')">Eliminar</button>'
            : '';
          return '<div class="card" style="border-left:4px solid #10b981;">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
              '<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🏟️</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-weight:700;font-size:16px;color:white;">' + (v.name || '') + '</div>' +
                (v.description ? '<div style="font-size:13px;color:#94a3b8;margin-top:2px;">' + v.description + '</div>' : '') +
              '</div>' +
            '</div>' +
            deleteBtn +
          '</div>';
        }).join('') +
      '</div>';
    };

    var addForm = App.isEditor()
      ? '<div class="card mb-6" style="border-top:3px solid #10b981;">' +
          '<h3 style="font-weight:700;margin-bottom:12px;">Agregar Escenario</h3>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">' +
            '<div style="flex:2;min-width:180px;">' +
              '<label class="text-gray-400 text-sm block mb-1">Nombre</label>' +
              '<input type="text" id="venue-name" class="input-field" placeholder="Ej: Cancha Principal">' +
            '</div>' +
            '<div style="flex:2;min-width:180px;">' +
              '<label class="text-gray-400 text-sm block mb-1">Descripcion (opcional)</label>' +
              '<input type="text" id="venue-desc" class="input-field" placeholder="Ej: Cancha sintetica de futbol">' +
            '</div>' +
            '<button class="btn-primary" onclick="window._addVenue()">+ Agregar</button>' +
          '</div>' +
        '</div>'
      : '';

    container.innerHTML =
      '<div class="mb-6">' +
        '<h2 class="text-3xl font-black" style="color:#60a5fa;">🏟️ Escenarios</h2>' +
        '<p class="text-gray-400 mt-1">' + venues.length + ' escenarios registrados</p>' +
      '</div>' +
      addForm +
      '<div id="venues-list"></div>';

    renderList(venues);

    window._addVenue = async function() {
      var name = (document.getElementById('venue-name')?.value || '').trim();
      if (!name) { Utils.toast('Ingresa el nombre del escenario', 'error'); return; }
      var desc = (document.getElementById('venue-desc')?.value || '').trim();
      try {
        var data = { name: name };
        if (desc) data.description = desc;
        await Api.createVenue(data);
        Utils.toast('Escenario creado', 'success');
        App.navigate('venues');
      } catch(e) {
        Utils.toast('Error: ' + e.message, 'error');
      }
    };

    window._deleteVenue = async function(id, name) {
      if (!confirm('Eliminar escenario "' + name + '"?')) return;
      try {
        await Api.deleteVenue(id);
        Utils.toast('Escenario eliminado', 'success');
        App.navigate('venues');
      } catch(e) {
        Utils.toast('Error: ' + e.message, 'error');
      }
    };

  } catch(e) {
    container.innerHTML = '<div class="text-red-400 p-8">Error: ' + e.message + '</div>';
  }
};

window.Pages.Venues = Pages.Venues;
