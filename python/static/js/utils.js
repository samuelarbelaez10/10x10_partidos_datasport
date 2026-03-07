/**
 * Utilidades compartidas
 */

const Utils = {
  // Formatear fecha a formato legible
  formatDate(isoStr) {
    if (!isoStr) return 'Sin fecha';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
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

  // Vacío state
  emptyState(msg = 'No hay datos disponibles') {
    return `<div class="text-center text-gray-400 py-12" style="font-size:18px;">📭 ${msg}</div>`;
  },

  // Icono deporte
  sportIcon(sport) {
    const icons = {
      'Fútbol': '⚽', 'Fútbol 7': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
      'Natación': '🏊', 'Tenis': '🎾', 'Pádel': '🏓',
      'Softbol': '🥎', 'Softball': '🎾', 'Ajedrez': '♟️', 'Gimnasia': '🤸',
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
