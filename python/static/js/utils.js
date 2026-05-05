/**
 * Utilidades compartidas
 */

const Utils = {
  // Deportes individuales — solo aparecen en la página de medallas
  _INDIVIDUAL_SPORTS: ['gimnasia','tenis','golf','ajedrez','padel','pádel','natacion','natación','hipica','hípica'],
  isIndividualSport(name) {
    return this._INDIVIDUAL_SPORTS.includes((name || '').toLowerCase());
  },

  // Formatear fecha a formato legible
  TZ: 'America/Bogota',

  formatDate(isoStr) {
    if (!isoStr) return 'Sin fecha';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: this.TZ });
  },

  formatTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: this.TZ });
  },

  formatDateTime(isoStr) {
    if (!isoStr) return '';
    return `${this.formatDate(isoStr)} ${this.formatTime(isoStr)}`;
  },

  formatTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  // Toast notifications
  toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },

  // Modal genérico
  showModal(html, onClose = null) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-box">${html}<button class="btn-ghost mt-4" onclick="Utils.closeModal()">✕ Cerrar</button></div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) Utils.closeModal(); });
    document.getElementById('modal-container').appendChild(overlay);
    this._modalCloseCallback = onClose;
  },

  closeModal() {
    const c = document.getElementById('modal-container');
    c.innerHTML = '';
    if (this._modalCloseCallback) this._modalCloseCallback();
    this._modalCloseCallback = null;
  },

  // Badge de estado
  statusBadge(status) {
    const map = {
      pending:   ['badge-scheduled', 'Programado'],
      scheduled: ['badge-scheduled', 'Programado'],
      live:      ['badge-live', '🔴 EN VIVO'],
      finished:  ['badge-finished', 'Finalizado'],
    };
    const [cls, label] = map[status] || ['badge-scheduled', status];
    return `<span class="${cls}">${label}</span>`;
  },

  // Spinner de carga
  spinner() {
    return '<div class="spinner"></div>';
  },

  // ─── Skeleton loaders (perceived performance > spinner) ───────────────────
  // Uso: Utils.skeleton('cards', 6) o Utils.skeleton('rows', 8) o 'list', 'matches'
  skeleton(kind = 'cards', count = 4) {
    const sk = (cls) => `<div class="skel ${cls}"></div>`;
    const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
    const tpl = {
      cards: () => `<div class="skel-grid">${repeat(count, () => `
        <div class="skel-card">
          ${sk('skel-line w-60')}
          ${sk('skel-line w-90 mt-2')}
          ${sk('skel-line w-40 mt-3')}
        </div>`)}</div>`,
      rows: () => `<div class="skel-rows">${repeat(count, () => `
        <div class="skel-row">${sk('skel-line w-30')}${sk('skel-line w-50')}${sk('skel-line w-15')}</div>`)}</div>`,
      list: () => `<div class="skel-list">${repeat(count, () => `
        <div class="skel-list-item">${sk('skel-circle')}<div class="flex-1">${sk('skel-line w-50')}${sk('skel-line w-30 mt-1')}</div></div>`)}</div>`,
      matches: () => `<div class="skel-matches">${repeat(count, () => `
        <div class="skel-match">
          ${sk('skel-line w-25')}
          <div class="skel-match-row">${sk('skel-line w-40')}${sk('skel-block-sm')}</div>
          <div class="skel-match-row">${sk('skel-line w-40')}${sk('skel-block-sm')}</div>
        </div>`)}</div>`,
      table: () => `<div class="skel-table">
        <div class="skel-table-head">${repeat(5, () => sk('skel-line w-15'))}</div>
        ${repeat(count, () => `<div class="skel-table-row">${repeat(5, () => sk('skel-line w-15'))}</div>`)}
      </div>`,
    };
    return (tpl[kind] || tpl.cards)();
  },

  // Vacío state
  emptyState(msg = 'No hay datos disponibles') {
    return `<div class="text-center text-gray-400 py-12" style="font-size:18px;">📭 ${msg}</div>`;
  },

  // ─── Confirm dialog (Promise<bool>, reemplaza confirm() nativo) ───────────
  // Uso: if (await Utils.confirm('¿Eliminar partido?')) { ... }
  confirm(message, { okLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const okBtn = danger ? 'btn-danger' : 'btn-primary';
      overlay.innerHTML = `
        <div class="modal-box" role="alertdialog" aria-modal="true" aria-label="Confirmación" style="max-width:420px;">
          <p style="font-size:15px;line-height:1.5;color:#e2e8f0;margin-bottom:24px;">${message}</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn-ghost" data-ds-confirm="cancel">${cancelLabel}</button>
            <button class="${okBtn}" data-ds-confirm="ok" autofocus>${okLabel}</button>
          </div>
        </div>`;
      const close = (val) => {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        resolve(val);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter' && document.activeElement?.dataset?.dsConfirm !== 'cancel') close(true);
      };
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) return close(false);
        const v = e.target.closest('[data-ds-confirm]')?.dataset?.dsConfirm;
        if (v === 'ok') close(true);
        else if (v === 'cancel') close(false);
      });
      document.addEventListener('keydown', onKey);
      document.getElementById('modal-container').appendChild(overlay);
      // Focus the OK button (autofocus may be ignored for dynamically inserted)
      setTimeout(() => overlay.querySelector('[data-ds-confirm="ok"]')?.focus(), 30);
    });
  },

  // ─── WhatsApp share (compartir resultado de partido / página) ─────────────
  // Uso: Utils.share('Partido en vivo: Almaviva 2-1 Solaris', 'https://datagames.co/match/123')
  share(text, url = window.location.href) {
    const msg = `${text}\n${url}`;
    // Native Web Share API si está disponible (mobile)
    if (navigator.share) {
      navigator.share({ text, url }).catch(() => {/* user cancelled */});
      return;
    }
    // Fallback: WhatsApp wa.me
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  },

  // Construye URL canónica de un partido para compartir
  matchShareUrl(matchId) {
    return `${window.location.origin}/?match=${encodeURIComponent(matchId)}`;
  },

  // ─── Online/Offline detection (se inicializa en App.init) ─────────────────
  online: navigator.onLine,
  _onlineHooks: [],
  onConnectivityChange(fn) { this._onlineHooks.push(fn); },
  _initConnectivity() {
    const update = () => {
      const wasOnline = this.online;
      this.online = navigator.onLine;
      const bar = document.getElementById('offline-bar');
      if (bar) bar.classList.toggle('show', !this.online);
      if (wasOnline && !this.online) this.toast('Sin conexión — intentando reconectar', 'error');
      if (!wasOnline && this.online) this.toast('Conexión restablecida', 'success');
      this._onlineHooks.forEach(fn => { try { fn(this.online); } catch (_) {} });
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  },

  // Icono deporte
  sportIcon(sport) {
    const icons = {
      'Fútbol': '⚽', 'Fútbol 7': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
      'Natación': '🏊', 'Tenis': '🎾', 'Pádel': '🎾',
      'Softbol': '⚾', 'Softball': '⚾', 'Ajedrez': '♟️', 'Gimnasia': '🤸',
      'Golf': '⛳', 'Equitación': '🏇', 'Hípica': '🏇',
    };
    return icons[sport] || '🏅';
  },

  // Truncar texto
  truncate(str, n = 25) {
    return str && str.length > n ? str.slice(0, n) + '…' : (str || '');
  },

  // Formatear nombre de escuela para mostrar
  schoolInitials(name) {
    return (name || 'XX').split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
  },

  // Colores por deporte
  sportColor(sport) {
    const colors = {
      'Fútbol': '#16a34a', 'Fútbol 7': '#22c55e', 'Baloncesto': '#ea580c', 'Voleibol': '#7c3aed',
      'Natación': '#0284c7', 'Tenis': '#ca8a04', 'Pádel': '#0891b2',
      'Softbol': '#dc2626', 'Softball': '#dc2626', 'Ajedrez': '#374151', 'Gimnasia': '#db2777',
      'Golf': '#65a30d', 'Equitación': '#92400e', 'Hípica': '#92400e',
    };
    return colors[sport] || '#3b82f6';
  },

  // Mobile filter toggle wrapper
  wrapFilters(filterHtml, id) {
    return `
      <button class="mobile-filter-btn" onclick="Utils.toggleFilters('${id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>
        Filtros
        <span class="filter-count" id="${id}-count" style="display:none;">0</span>
      </button>
      <div class="mobile-filter-content" id="${id}-content">
        ${filterHtml}
      </div>`;
  },

  toggleFilters(id) {
    const content = document.getElementById(id + '-content');
    if (!content) return;
    content.classList.toggle('open');
  },

  updateFilterCount(id) {
    const content = document.getElementById(id + '-content');
    const badge = document.getElementById(id + '-count');
    if (!content || !badge) return;
    let count = 0;
    content.querySelectorAll('select, input[type="date"]').forEach(el => {
      if (el.value && el.value !== '') count++;
    });
    content.querySelectorAll('input[type="text"]').forEach(el => {
      if (el.value.trim() !== '') count++;
    });
    badge.style.display = count > 0 ? '' : 'none';
    badge.textContent = count;
  },
};

// Configuración de deportes (eventos por deporte)
const SPORT_EVENTS = {
  'Fútbol 7': [
    { supabase_event_type: 'goal', label: 'Gol', icon: '⚽', affects_score: true, score_points: 1 },
    { supabase_event_type: 'assist_football', label: 'Asistencia', icon: '🎯', affects_score: false },
    { supabase_event_type: 'yellow_card', label: 'Tarjeta Amarilla', icon: '🟨', affects_score: false },
    { supabase_event_type: 'red_card', label: 'Tarjeta Roja', icon: '🟥', affects_score: false },
    { supabase_event_type: 'substitution_football', label: 'Sustitución', icon: '🔄', affects_score: false },
    { supabase_event_type: 'penalty', label: 'Penal', icon: '⏸️', affects_score: true, score_points: 1 },
  ],
  'Fútbol': [
    { supabase_event_type: 'goal', label: 'Gol', icon: '⚽', affects_score: true, score_points: 1 },
    { supabase_event_type: 'assist_football', label: 'Asistencia', icon: '🎯', affects_score: false },
    { supabase_event_type: 'yellow_card', label: 'Tarjeta Amarilla', icon: '🟨', affects_score: false },
    { supabase_event_type: 'red_card', label: 'Tarjeta Roja', icon: '🟥', affects_score: false },
    { supabase_event_type: 'substitution_football', label: 'Sustitución', icon: '🔄', affects_score: false },
    { supabase_event_type: 'penalty', label: 'Penal', icon: '⏸️', affects_score: true, score_points: 1 },
  ],
  'Baloncesto': [
    { supabase_event_type: 'basket_1pt', label: 'Canasta 1pt', icon: '🏀', affects_score: true, score_points: 1 },
    { supabase_event_type: 'basket_2pts', label: 'Canasta 2pts', icon: '🏀', affects_score: true, score_points: 2 },
    { supabase_event_type: 'basket_3pts', label: 'Canasta 3pts', icon: '🏀', affects_score: true, score_points: 3 },
    { supabase_event_type: 'assist_basketball', label: 'Asistencia', icon: '🎯', affects_score: false },
    { supabase_event_type: 'substitution_basketball', label: 'Sustitución', icon: '🔄', affects_score: false },
    { supabase_event_type: 'personal_foul', label: 'Falta Personal', icon: '❌', affects_score: false },
    { supabase_event_type: 'technical_foul', label: 'Falta Técnica', icon: '🚫', affects_score: false },
  ],
  'Voleibol': [
    { supabase_event_type: 'point_volleyball', label: 'Punto', icon: '🏐', affects_score: true, score_points: 1 },
    { supabase_event_type: 'ace', label: 'Ace', icon: '🎯', affects_score: true, score_points: 1 },
    { supabase_event_type: 'block', label: 'Bloqueo', icon: '🚫', affects_score: false },
    { supabase_event_type: 'substitution_volleyball', label: 'Sustitución', icon: '🔄', affects_score: false },
    { supabase_event_type: 'error_volleyball', label: 'Error', icon: '❌', affects_score: false },
  ],
  'Natación': [
    { supabase_event_type: 'register_time', label: 'Registrar Tiempo', icon: '⏱️', affects_score: false },
    { supabase_event_type: 'final_position_swimming', label: 'Posición Final', icon: '🥇', affects_score: false },
  ],
  'Tenis': [
    { supabase_event_type: 'point_tennis_padel', label: 'Punto', icon: '🎾', affects_score: true, score_points: 1 },
    { supabase_event_type: 'ace_tennis_padel', label: 'Ace', icon: '🎯', affects_score: false },
    { supabase_event_type: 'game_won', label: 'Game Ganado', icon: '🎮', affects_score: false },
    { supabase_event_type: 'set_won', label: 'Set Ganado', icon: '🏆', affects_score: false },
  ],
  'Pádel': [
    { supabase_event_type: 'point_tennis_padel', label: 'Punto', icon: '🎾', affects_score: true, score_points: 1 },
    { supabase_event_type: 'ace_tennis_padel', label: 'Ace', icon: '🎯', affects_score: false },
    { supabase_event_type: 'game_won', label: 'Game Ganado', icon: '🎮', affects_score: false },
    { supabase_event_type: 'set_won', label: 'Set Ganado', icon: '🏆', affects_score: false },
  ],
  'Softbol': [
    { supabase_event_type: 'goal', label: 'Carrera', icon: '⚾', affects_score: true, score_points: 1 },
    { supabase_event_type: 'assist_football', label: 'Asistencia', icon: '🎯', affects_score: false },
  ],
};
