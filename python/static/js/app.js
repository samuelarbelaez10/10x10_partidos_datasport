/**
 * App.js - Controlador principal SPA
 * Gestiona autenticación, navegación y estado global
 */

const App = {
  currentUser: null,
  currentTournament: null,
  currentPage: 'dashboard',
  _liveInterval: null,      // intervalo de polling de partidos en vivo (nav badge)
  _pageInterval: null,      // intervalo de auto-refresh de la página actual
  _prevScores: {},          // { matchId: { s1, s2, wasLive, t1, t2 } } para detectar cambios de marcador
  _flashTimer: null,        // timer para flash del título del navegador

  // ─── Torneos disponibles ──────────────────────────────────────────────────
  TOURNAMENTS: [
    {
      id: 'big-games-2026',
      name: 'Big Games',
      year: '2026',
      edition: '1ra Edición',
      description: 'Torneo inter-colegial de múltiples deportes',
      sports: ['⚽ Fútbol', '🏀 Baloncesto', '🏐 Voleibol', '🥎 Softball'],
      categories: 15,
      status: 'active',   // active | upcoming | finished
    },
  ],

  // ─── Páginas disponibles ──────────────────────────────────────────────────
  get pages() {
    return {
      dashboard:             { label: 'Inicio',       icon: '🏠', render: window.Pages.Dashboard },
      calendar:              { label: 'Calendario',   icon: '📅', render: window.Pages.Calendar },
      liveScoring:           { label: 'En Vivo',      icon: '🔴', render: window.Pages.LiveScoring },
      news:                  { label: 'Noticias',     icon: '📰', render: window.Pages.News },
      results:               { label: 'Resultados',   icon: '📊', render: window.Pages.Results },
      statistics:            { label: 'Estadísticas', icon: '📈', render: window.Pages.Statistics },
      standings:             { label: 'Tablas',       icon: '🏆', render: window.Pages.Standings },
      teams:                 { label: 'Equipos',      icon: '👥', render: window.Pages.Teams },
      schools:               { label: 'Colegios',     icon: '🏫', render: window.Pages.Schools },
      players:               { label: 'Jugadores',    icon: '⚽', render: window.Pages.Players },
      registerTeamsPlayers:  { label: 'Registrar',    icon: '📝', render: window.Pages.Register },
      groups:                { label: 'Grupos',       icon: '📋', render: window.Pages.Groups },
      generateSchedule:      { label: 'Programar',    icon: '🗓️', render: window.Pages.Schedule },
      playoffs:              { label: 'Fase Final',   icon: '🏅', render: window.Pages.Playoffs },
      venues:                { label: 'Escenarios',   icon: '🏟️', render: window.Pages.Venues },
      individualSports:      { label: 'Dep. Individuales', icon: '🎖️', render: window.Pages.IndividualSports },
      olympicRanking:        { label: 'Ranking',      icon: '🏅', render: window.Pages.OlympicRanking },
    };
  },

  // ─── Autenticación con credenciales ─────────────────────────────────────────

  _credentials: {
    editor:  { user: 'editordeportivo', pass: 'datasport123' },
    arbitro: { user: 'arbitrotorneo',   pass: 'arbitro123'   },
  },

  submitLoginDirect() {
    const user = (document.getElementById('login-username')?.value || '').trim();
    const pass = document.getElementById('login-password')?.value || '';
    // Check which role matches
    let matchedRole = null;
    for (const [role, creds] of Object.entries(this._credentials)) {
      if (user === creds.user && pass === creds.pass) {
        matchedRole = role;
        break;
      }
    }
    if (matchedRole) {
      document.getElementById('login-error').style.display = 'none';
      this.login(matchedRole);
    } else {
      const err = document.getElementById('login-error');
      err.style.display = 'block';
      document.getElementById('login-password').value = '';
      document.getElementById('login-password').focus();
    }
  },

  login(role) {
    this.currentUser = { role, email: `${role}@datasport.co` };
    sessionStorage.setItem('ds_user', JSON.stringify(this.currentUser));
    document.getElementById('login-screen').classList.add('hidden');
    this._showTournamentScreen();
  },

  _showTournamentScreen() {
    const role = this.currentUser.role;
    const roleLabel = role === 'editor' ? '✏️ Modo Editor' : role === 'arbitro' ? '🏃 Árbitro' : '📖 Modo Lector';
    document.getElementById('tournament-role-label').textContent = `Accediendo como ${roleLabel}`;

    const list = document.getElementById('tournament-list');
    list.innerHTML = this.TOURNAMENTS.map(t => {
      const statusColor = t.status === 'active' ? '#10b981' : t.status === 'upcoming' ? '#f59e0b' : '#64748b';
      const statusLabel = t.status === 'active' ? 'Activo' : t.status === 'upcoming' ? 'Próximamente' : 'Finalizado';
      return `
        <div onclick="App.selectTournament('${t.id}')"
             style="cursor:pointer;border-radius:24px;overflow:hidden;
                    border:1px solid rgba(255,255,255,0.08);
                    box-shadow:0 8px 40px rgba(0,0,0,0.5);
                    transition:all 0.25s cubic-bezier(0.34,1.1,0.64,1);"
             onmouseover="this.style.transform='translateY(-5px)';this.style.borderColor='rgba(59,130,246,0.4)';this.style.boxShadow='0 20px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(59,130,246,0.2)'"
             onmouseout="this.style.transform='';this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow='0 8px 40px rgba(0,0,0,0.5)'">

          <!-- Hero: gradiente profundo con textura y círculos decorativos -->
          <div style="background:linear-gradient(135deg,#07153a 0%,#0e2266 38%,#1a3ea8 70%,#2256d8 100%);
                      padding:24px 20px 20px;position:relative;overflow:hidden;">

            <!-- Textura de líneas diagonales -->
            <div style="position:absolute;inset:0;pointer-events:none;
                        background:repeating-linear-gradient(-45deg,rgba(255,255,255,0.018) 0,rgba(255,255,255,0.018) 1px,transparent 0,transparent 14px);"></div>

            <!-- Círculos decorativos -->
            <div style="position:absolute;width:220px;height:220px;border-radius:50%;
                        border:1px solid rgba(255,255,255,0.05);top:-90px;right:-50px;pointer-events:none;"></div>
            <div style="position:absolute;width:130px;height:130px;border-radius:50%;
                        border:1px solid rgba(255,255,255,0.04);bottom:-55px;left:24px;pointer-events:none;"></div>
            <div style="position:absolute;width:60px;height:60px;border-radius:50%;
                        background:rgba(255,255,255,0.03);top:20px;right:140px;pointer-events:none;"></div>

            <div style="position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">

                <!-- Ícono glassmorphism -->
                <div style="width:56px;height:56px;border-radius:18px;flex-shrink:0;
                            background:rgba(255,255,255,0.11);backdrop-filter:blur(12px);
                            display:flex;align-items:center;justify-content:center;font-size:28px;
                            border:1px solid rgba(255,255,255,0.22);
                            box-shadow:0 8px 28px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.15);">🏆</div>

                <div>
                  <p style="color:rgba(147,197,253,0.65);font-size:10px;font-weight:700;
                            letter-spacing:3.5px;text-transform:uppercase;margin:0 0 5px;">${t.edition}</p>
                  <h3 style="color:white;font-size:clamp(20px,5vw,30px);font-weight:900;margin:0 0 5px;letter-spacing:-0.8px;
                             text-shadow:0 2px 14px rgba(0,0,0,0.4);line-height:1.1;">
                    ${t.name} <span style="color:rgba(255,255,255,0.35);font-weight:400;font-size:clamp(16px,4vw,22px);">${t.year}</span>
                  </h3>
                  <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0;">${t.description}</p>
                </div>
              </div>

              <!-- Badge status con glow -->
              <span style="flex-shrink:0;font-size:11px;font-weight:700;padding:5px 13px;border-radius:20px;
                           background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}55;
                           box-shadow:0 0 14px ${statusColor}22;white-space:nowrap;">
                ● ${statusLabel}
              </span>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:linear-gradient(180deg,#0f1e36 0%,#0c1728 100%);
                      padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
                      border-top:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;">
              ${t.sports.map(s => `<span style="font-size:12px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.65);padding:4px 11px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">${s}</span>`).join('')}
              <span style="font-size:12px;color:#475569;padding:4px 11px;border-radius:8px;
                           background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">📋 ${t.categories} categorías</span>
            </div>
            <div style="flex-shrink:0;display:flex;align-items:center;gap:6px;
                        background:linear-gradient(135deg,#1e40af,#2563eb);color:white;
                        font-size:13px;font-weight:600;padding:9px 22px;border-radius:12px;
                        box-shadow:0 4px 16px rgba(37,99,235,0.5);">
              Entrar <span style="font-size:17px;line-height:1;">›</span>
            </div>
          </div>
        </div>`;
    }).join('');

    document.getElementById('tournament-screen').classList.remove('hidden');
  },

  selectTournament(id) {
    const t = this.TOURNAMENTS.find(t => t.id === id);
    if (!t) return;
    this.currentTournament = t;
    sessionStorage.setItem('ds_tournament', JSON.stringify(t));

    document.getElementById('tournament-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');

    // Header: nombre del torneo
    const headerName = document.getElementById('header-tournament-name');
    if (headerName) headerName.textContent = `${t.name} ${t.year}`;

    const role = this.currentUser.role;
    const roleIcon = role === 'editor' ? '✏️' : role === 'arbitro' ? '🏃' : '📖';
    const badgeText = `${roleIcon} ${this.currentUser.email}`;
    document.getElementById('user-badge').textContent = badgeText;
    const mobileBadge = document.getElementById('user-badge-mobile');
    if (mobileBadge) mobileBadge.textContent = badgeText;
    const qrBtn = document.getElementById('qr-btn');
    if (qrBtn) qrBtn.style.display = role === 'editor' ? 'inline-flex' : 'none';
    const qrBtnMobile = document.getElementById('qr-btn-mobile');
    if (qrBtnMobile) qrBtnMobile.style.display = role === 'editor' ? 'inline-flex' : 'none';
    this._applyTournamentTheme(t.id);
    this._buildNav();
    this._requestNotifPermission();
    this._startLivePoll();
    this.navigate(role === 'arbitro' ? 'liveScoring' : 'dashboard');
  },

  _applyTournamentTheme(tournamentId) {
    let el = document.getElementById('tournament-theme');
    if (el) el.remove();
    if (tournamentId === 'big-games-2026') {
      const style = document.createElement('style');
      style.id = 'tournament-theme';
      style.textContent = `
        body {
          background: #2c3142 !important;
          background-image: none !important;
        }
        .card {
          background: #363c51 !important;
          border-color: rgba(255,255,255,0.08) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04) !important;
        }
        header {
          background: #363c51 !important;
          border-bottom: 3px solid #dd2b2f !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.35) !important;
        }
        .btn-primary {
          background: #dd2b2f !important;
          box-shadow: 0 2px 12px rgba(221,43,47,0.35) !important;
        }
        .btn-primary:hover {
          background: #e84548 !important;
          box-shadow: 0 6px 20px rgba(221,43,47,0.5) !important;
        }
        .btn-secondary {
          background: #dd2b2f !important;
          box-shadow: 0 2px 12px rgba(221,43,47,0.3) !important;
        }
        .btn-secondary:hover {
          background: #e84548 !important;
        }
        .nav-tab {
          background: rgba(255,255,255,0.07) !important;
          border-color: rgba(255,255,255,0.07) !important;
        }
        .nav-tab:hover {
          background: rgba(255,255,255,0.14) !important;
        }
        .nav-tab.active {
          background: #ffffff !important;
          color: #dd2b2f !important;
          font-weight: 700 !important;
          border-color: #ffffff !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2) !important;
        }
        .input-field {
          background-color: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        select.input-field {
          background-color: rgba(255,255,255,0.06) !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 10px center !important;
        }
        .input-field:focus {
          border-color: #dd2b2f !important;
          box-shadow: 0 0 0 3px rgba(221,43,47,0.15) !important;
        }
        .mobile-filter-btn {
          background: linear-gradient(135deg, rgba(221,43,47,0.12) 0%, rgba(221,43,47,0.06) 100%) !important;
          color: #f87171 !important;
          border-color: rgba(221,43,47,0.25) !important;
          box-shadow: 0 2px 12px rgba(221,43,47,0.08) !important;
        }
        .mobile-filter-btn:active {
          background: linear-gradient(135deg, rgba(221,43,47,0.2) 0%, rgba(221,43,47,0.1) 100%) !important;
        }
        .mobile-filter-btn .filter-count {
          background: #dd2b2f !important;
        }
        .badge-live { background: #dd2b2f !important; }
        .stat-number { color: #dd2b2f !important; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15) !important; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25) !important; }
      `;
      document.head.appendChild(style);
      // Update header logo SVG gradient to red/white
      const gradH = document.getElementById('aGradH');
      if (gradH) {
        gradH.innerHTML = '<stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#dd2b2f"/>';
      }
    }
  },

  switchTournament() {
    this._stopLivePoll();
    this._stopPageRefresh();
    const themeEl = document.getElementById('tournament-theme');
    if (themeEl) themeEl.remove();
    document.getElementById('main-app').classList.add('hidden');
    this._showTournamentScreen();
  },

  backToLogin() {
    document.getElementById('tournament-screen').classList.add('hidden');
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-screen').classList.remove('hidden');
    this.currentUser = null;
    sessionStorage.removeItem('ds_user');
  },

  logout() {
    this._stopLivePoll();
    this._stopPageRefresh();
    const themeEl = document.getElementById('tournament-theme');
    if (themeEl) themeEl.remove();
    sessionStorage.removeItem('ds_user');
    sessionStorage.removeItem('ds_tournament');
    this.currentUser = null;
    this.currentTournament = null;
    // Restaurar pantalla de login
    const qrBtn = document.getElementById('qr-btn');
    if (qrBtn) qrBtn.style.display = 'none';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('tournament-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
  },

  isEditor() {
    return this.currentUser?.role === 'editor';
  },

  isArbitro() {
    return this.currentUser?.role === 'arbitro';
  },

  // Editor o árbitro: puede gestionar partidos (marcar goles, editar, iniciar/finalizar)
  canEditMatches() {
    const r = this.currentUser?.role;
    return r === 'editor' || r === 'arbitro';
  },

  _buildNav() {
    const nav = document.getElementById('main-nav');
    const mobileNav = document.getElementById('mobile-nav');
    nav.innerHTML = '';
    if (mobileNav) mobileNav.innerHTML = '';
    const arbitroOnly  = ['calendar', 'liveScoring', 'news', 'results', 'olympicRanking', 'individualSports', 'playoffs'];
    const lectorHidden = ['teams', 'schools', 'players', 'registerTeamsPlayers', 'groups', 'generateSchedule', 'venues', 'individualSports'];
    for (const [key, page] of Object.entries(this.pages)) {
      if (this.isArbitro() && !arbitroOnly.includes(key)) continue;
      if (!this.isEditor() && !this.isArbitro() && lectorHidden.includes(key)) continue;
      // Desktop nav
      const btn = document.createElement('button');
      btn.className = 'nav-tab';
      btn.id = `nav-${key}`;
      btn.innerHTML = `${page.icon} ${page.label}`;
      btn.onclick = () => this.navigate(key);
      nav.appendChild(btn);
      // Mobile nav
      if (mobileNav) {
        const mbtn = document.createElement('button');
        mbtn.className = 'nav-tab';
        mbtn.id = `mnav-${key}`;
        mbtn.innerHTML = `${page.icon} ${page.label}`;
        mbtn.onclick = () => { this.closeMobileMenu(); this.navigate(key); };
        mobileNav.appendChild(mbtn);
      }
    }
  },

  toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const hIcon = document.getElementById('hamburger-icon');
    const cIcon = document.getElementById('close-icon');
    if (!menu) return;
    const isOpen = menu.style.display === 'flex';
    menu.style.display = isOpen ? 'none' : 'flex';
    if (hIcon) hIcon.style.display = isOpen ? '' : 'none';
    if (cIcon) cIcon.style.display = isOpen ? 'none' : '';
  },

  closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const hIcon = document.getElementById('hamburger-icon');
    const cIcon = document.getElementById('close-icon');
    if (menu) menu.style.display = 'none';
    if (hIcon) hIcon.style.display = '';
    if (cIcon) cIcon.style.display = 'none';
  },

  navigate(page, options = {}) {
    this._stopPageRefresh();
    // Limpiar timer de noticias al cambiar de página
    if (window._newsRefreshTimer) { clearInterval(window._newsRefreshTimer); window._newsRefreshTimer = null; }
    this.currentPage = page;

    // Actualizar clases de nav (desktop + mobile)
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${page}`);
    if (activeBtn) activeBtn.classList.add('active');
    const activeMBtn = document.getElementById(`mnav-${page}`);
    if (activeMBtn) activeMBtn.classList.add('active');

    const container = document.getElementById('page-content');
    container.innerHTML = Utils.spinner();

    const pageObj = this.pages[page];
    if (pageObj && typeof pageObj.render === 'function') {
      pageObj.render(container, options);
    } else {
      container.innerHTML = `<div class="text-center text-red-400 mt-20 text-xl">Página "${page}" no encontrada</div>`;
    }

    // Auto-refresh cada 30s en vistas públicas de solo lectura
    const autoRefreshPages = ['calendar', 'results', 'standings', 'dashboard'];
    if (autoRefreshPages.includes(page) && !options.matchId) {
      this._pageInterval = setInterval(() => {
        if (this.currentPage === page) {
          const c = document.getElementById('page-content');
          if (c && pageObj && typeof pageObj.render === 'function') {
            pageObj.render(c, options);
          }
        }
      }, 30000);
    }
  },

  // ─── Live polling (badge en nav) ─────────────────────────────────────────

  _startLivePoll() {
    this._pollLive();  // inmediato
    this._liveInterval = setInterval(() => this._pollLive(), 30000);
  },

  _stopLivePoll() {
    if (this._liveInterval) { clearInterval(this._liveInterval); this._liveInterval = null; }
  },

  _stopPageRefresh() {
    if (this._pageInterval) { clearInterval(this._pageInterval); this._pageInterval = null; }
  },

  async _pollLive() {
    try {
      const live = await Api.getLiveMatches();
      const btn = document.getElementById('nav-liveScoring');
      if (!btn) return;
      const count = (live || []).length;
      if (count > 0) {
        btn.innerHTML = `🔴 En Vivo <span style="
          display:inline-block;
          background:#ef4444;
          color:white;
          font-size:10px;
          font-weight:700;
          padding:1px 6px;
          border-radius:10px;
          margin-left:4px;
          animation:pulse 1.2s infinite;
          vertical-align:middle;
        ">${count}</span>`;
      } else {
        btn.innerHTML = `🔴 En Vivo`;
      }

      // Detectar partido finalizado (desaparece de la lista live)
      const liveIds = new Set((live || []).map(m => m.id));
      for (const [id, prev] of Object.entries(this._prevScores)) {
        if (!liveIds.has(id) && prev.wasLive) {
          this._notify('🏁 Partido finalizado', `${prev.t1} ${prev.s1} – ${prev.s2} ${prev.t2}`);
          delete this._prevScores[id];
        }
      }

      // Detectar cambios de marcador y flashear el título
      (live || []).forEach(m => {
        const prev = this._prevScores[m.id];
        const s1 = m.team1_score ?? 0;
        const s2 = m.team2_score ?? 0;
        const t1 = m.team1?.school?.name || 'Local';
        const t2 = m.team2?.school?.name || 'Visitante';
        if (prev && (prev.s1 !== s1 || prev.s2 !== s2)) {
          const sport = m.sport || '';
          const icon = sport.includes('Balon') ? '🏀' : sport.includes('Volei') ? '🏐' : '⚽';
          this._flashTitle(`${icon} ${s1}-${s2}`);
          this._notify(`${icon} ¡Punto anotado! ${s1}–${s2}`, `${t1} vs ${t2} · ${sport}`);
        }
        this._prevScores[m.id] = { s1, s2, wasLive: true, t1, t2 };
      });
    } catch(e) { /* silencioso */ }
  },

  _requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  _notify(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/static/img/logo.png' });
    }
  },

  _flashTitle(msg) {
    const orig = 'DATA GAMES - Big Games 2026';
    let n = 0;
    if (this._flashTimer) clearInterval(this._flashTimer);
    this._flashTimer = setInterval(() => {
      document.title = n % 2 === 0 ? `${msg} · DATA GAMES` : orig;
      n++;
      if (n >= 6) {
        clearInterval(this._flashTimer);
        this._flashTimer = null;
        document.title = orig;
      }
    }, 800);
  },

  // ─── Búsqueda global ─────────────────────────────────────────────────────

  async openSearch() {
    Utils.showModal(`
      <div style="width:100%;max-width:460px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <span style="font-size:18px;">🔍</span>
          <input type="text" id="gs-input"
            placeholder="Buscar jugadores, colegios, partidos..."
            style="flex:1;background:#0f172a;border:2px solid #3b82f6;border-radius:10px;
                   color:#f1f5f9;padding:10px 14px;font-size:15px;outline:none;">
        </div>
        <div id="gs-results" style="max-height:400px;overflow-y:auto;">
          <p style="color:#475569;text-align:center;padding:20px 0;font-size:13px;">
            Escribe para buscar…
          </p>
        </div>
      </div>
    `);

    setTimeout(() => document.getElementById('gs-input')?.focus(), 60);

    let cache = null;
    const search = async (q) => {
      const el = document.getElementById('gs-results');
      if (!el) return;

      if (!q || q.length < 2) {
        el.innerHTML = `<p style="color:#475569;text-align:center;padding:20px 0;font-size:13px;">Escribe al menos 2 caracteres…</p>`;
        return;
      }

      if (!cache) {
        el.innerHTML = `<p style="color:#475569;text-align:center;padding:12px 0;font-size:13px;">Cargando…</p>`;
        try {
          const [players, teams, matches, schools] = await Promise.all([
            Api.getPlayers(), Api.getTeams(), Api.getMatches(), Api.getSchools(),
          ]);
          cache = { players, teams, matches, schools };
        } catch(e) {
          el.innerHTML = `<p style="color:#f87171;padding:12px;">Error cargando datos</p>`;
          return;
        }
      }

      const lq = q.toLowerCase();
      const results = [];

      // Players
      cache.players.filter(p => p.full_name.toLowerCase().includes(lq)).slice(0, 5).forEach(p => {
        const team = cache.teams.find(t => t.id === p.team_id);
        results.push({
          type: 'player', icon: '👤', primary: p.full_name,
          secondary: `#${p.jersey_number ?? '?'} · ${team?.sport?.name || ''} · ${team?.school?.name || ''}`,
          action: () => { Utils.closeModal(); App.navigate('players', { playerId: p.id }); },
        });
      });

      // Schools
      cache.schools.filter(s => s.name.toLowerCase().includes(lq)).slice(0, 3).forEach(s => {
        results.push({
          type: 'school', icon: '🏫', primary: s.name, secondary: 'Colegio',
          action: () => { Utils.closeModal(); App.navigate('schools'); },
        });
      });

      // Matches (by team name)
      cache.matches.filter(m => {
        const t1 = (m.team1?.school?.name || '').toLowerCase();
        const t2 = (m.team2?.school?.name || '').toLowerCase();
        return t1.includes(lq) || t2.includes(lq);
      }).slice(0, 5).forEach(m => {
        const s1 = m.team1?.school?.name || 'Equipo 1';
        const s2 = m.team2?.school?.name || 'Equipo 2';
        const target = m.status === 'live' ? 'liveScoring' : m.status === 'finished' ? 'results' : 'calendar';
        results.push({
          type: 'match', icon: Utils.sportIcon(m.sport),
          primary: `${s1} vs ${s2}`,
          secondary: `${m.sport} · ${m.status === 'live' ? '🔴 EN VIVO' : m.status === 'finished' ? '✅ Finalizado' : '📅 Programado'}`,
          action: () => { Utils.closeModal(); App.navigate(target, { matchId: m.id }); },
        });
      });

      if (results.length === 0) {
        el.innerHTML = `<p style="color:#475569;text-align:center;padding:20px;font-size:13px;">Sin resultados para "${q}"</p>`;
        return;
      }

      el.innerHTML = results.map(r => `
        <div onclick="(${r.action.toString()})()"
          style="display:flex;align-items:center;gap:12px;padding:10px 12px;
                 border-radius:8px;cursor:pointer;transition:background .15s;margin-bottom:4px;"
          onmouseover="this.style.background='rgba(96,165,250,0.1)'"
          onmouseout="this.style.background=''">
          <span style="font-size:20px;flex-shrink:0;">${r.icon}</span>
          <div style="min-width:0;">
            <div style="font-weight:600;color:#e2e8f0;font-size:14px;">${r.primary}</div>
            <div style="font-size:12px;color:#64748b;">${r.secondary}</div>
          </div>
        </div>`).join('');
    };

    const inp = document.getElementById('gs-input');
    if (inp) {
      inp.addEventListener('input', () => search(inp.value.trim()));
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') Utils.closeModal();
      });
    }
  },

  // ─── QR de acceso lector ─────────────────────────────────────────────────

  openQr() {
    const url = window.location.origin + window.location.pathname + '?access=lector';
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const warning = isLocal
      ? `<div style="margin-top:14px;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.35);
                     border-radius:8px;padding:10px 14px;color:#fbbf24;font-size:12px;text-align:left;">
           ⚠️ Estás en <strong>localhost</strong>. Para que otros dispositivos puedan escanear el QR,
           accede a la app desde la IP local del servidor (ej. <code>http://192.168.x.x:8000</code>)
           y luego abre este modal de nuevo.
         </div>`
      : '';

    Utils.showModal(`
      <div style="text-align:center;min-width:320px;">
        <h3 style="font-size:20px;font-weight:700;color:#93c5fd;margin-bottom:4px;">📱 Acceso por QR</h3>
        <p style="color:#64748b;font-size:13px;margin-bottom:18px;">
          Escanea con la cámara del celular para entrar en <strong style="color:#f1f5f9;">Modo Lector</strong>
        </p>
        <div style="background:white;display:inline-block;padding:12px;border-radius:12px;margin-bottom:16px;
                    box-shadow:0 4px 20px rgba(0,0,0,0.4);">
          <img src="${qrSrc}" alt="Código QR" width="280" height="280" style="display:block;border-radius:4px;">
        </div>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                    border-radius:8px;padding:10px 14px;margin-bottom:14px;word-break:break-all;text-align:left;">
          <p style="font-size:11px;color:#475569;margin:0 0 4px;">URL de acceso directo</p>
          <code style="color:#7dd3fc;font-size:12px;">${url}</code>
        </div>
        <button onclick="
          navigator.clipboard.writeText('${url}')
            .then(()  => Utils.toast('URL copiada', 'success'))
            .catch(() => Utils.toast('No se pudo copiar', 'error'));
        " class="btn-secondary" style="font-size:13px;padding:8px 20px;">
          📋 Copiar URL
        </button>
        ${warning}
      </div>
    `);
  },

  // Inicialización - restaurar sesión si existe
  init() {
    // 1. Auto-login vía parámetro URL (?access=lector) — generado por QR
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'lector') {
      history.replaceState(null, '', window.location.pathname); // limpia la URL
      // QR siempre abre el primer torneo activo directamente
      this.currentUser = { role: 'viewer', email: 'viewer@datasport.co' };
      sessionStorage.setItem('ds_user', JSON.stringify(this.currentUser));
      document.getElementById('login-screen').classList.add('hidden');
      this.selectTournament(this.TOURNAMENTS[0].id);
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          if (this.currentUser) this.openSearch();
        }
      });
      return;
    }
    // 2. Restaurar sesión guardada
    const stored = sessionStorage.getItem('ds_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.currentUser = user;
        // Si también había torneo seleccionado, ir directo a la app
        const storedT = sessionStorage.getItem('ds_tournament');
        if (storedT) {
          this.currentTournament = JSON.parse(storedT);
          document.getElementById('login-screen').classList.add('hidden');
          this.selectTournament(this.currentTournament.id);
        } else {
          // Ir a selección de torneo
          document.getElementById('login-screen').classList.add('hidden');
          this._showTournamentScreen();
        }
      } catch { }
    }
    // 3. Ctrl+K para búsqueda global
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (this.currentUser) this.openSearch();
      }
    });
  },
};

// Hacer App global para que los onclick del HTML funcionen
window.App = App;

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => App.init());
