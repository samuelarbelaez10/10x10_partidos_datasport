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

  // ─── Torneos por defecto (fallback si la API falla) ─────────────────────
  // Los torneos reales se cargan desde /api/tournaments/
  TOURNAMENTS: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Big Games Barranquilla',
      year: '2026',
      edition: '1ra Edición',
      description: 'Torneo inter-colegial de múltiples deportes',
      sports: ['⚽ Fútbol', '🏀 Baloncesto', '🏐 Voleibol', '⚾ Softball'],
      categories: 15,
      status: 'active',
      logo: '/static/logo.png',
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
      bulkImport:            { label: 'Importar',     icon: '📤', render: window.Pages.BulkImport },
      groups:                { label: 'Grupos',       icon: '📋', render: window.Pages.Groups },
      generateSchedule:      { label: 'Programar',    icon: '🗓️', render: window.Pages.Schedule },
      playoffs:              { label: 'Fase Final',   icon: '🏅', render: window.Pages.Playoffs },
      venues:                { label: 'Escenarios',   icon: '🏟️', render: window.Pages.Venues },
      individualSports:      { label: 'Dep. Individuales', icon: '🎖️', render: window.Pages.IndividualSports },
      individualResults:     { label: 'Res. Individuales', icon: '🎖️', render: window.Pages.IndividualResults },
      olympicRanking:        { label: 'Ranking',      icon: '🏅', render: window.Pages.OlympicRanking },
    };
  },

  // ─── Autenticación con credenciales ─────────────────────────────────────────

  _credentials: {
    editor:  { user: 'editor.bg26',  pass: 'X10!editor#2026' },
    arbitro: { user: 'arbitro.bg26', pass: 'X10!arbitro#2026' },
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

  async _showTournamentScreen() {
    const role = this.currentUser.role;
    const roleLabel = role === 'editor' ? '✏️ Modo Editor' : role === 'arbitro' ? '🏃 Árbitro' : '📖 Modo Lector';
    document.getElementById('tournament-role-label').textContent = `Accediendo como ${roleLabel}`;
    document.getElementById('tournament-screen').classList.remove('hidden');

    const list = document.getElementById('tournament-list');
    list.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;">Cargando torneos…</div>`;

    let tournaments = [];
    try {
      tournaments = await Api.getTournaments();
    } catch (e) {
      // Fallback al hardcoded si la API falla
      tournaments = this.TOURNAMENTS;
    }
    // Mantener forma normalizada para el render (sports/categories pueden venir como array o número)
    tournaments = tournaments.map(t => ({
      ...t,
      sports: Array.isArray(t.sports) ? t.sports : (t.sports ? [t.sports] : ['⚽ Fútbol','🏀 Baloncesto']),
      categories: typeof t.categories === 'number' ? t.categories
                : Array.isArray(t.categories) ? t.categories.length
                : 15,
    }));
    this._tournamentsCache = tournaments;

    const isEditor = role === 'editor';
    const cardsHtml = tournaments.map(t => {
      const statusColor = t.status === 'active' ? '#10b981' : t.status === 'upcoming' ? '#f59e0b' : '#64748b';
      const statusLabel = t.status === 'active' ? 'Activo' : t.status === 'upcoming' ? 'Próximamente' : 'Finalizado';
      const editBtn = isEditor && t.id !== '11111111-1111-1111-1111-111111111111'
        ? `<button onclick="event.stopPropagation();App.deleteTournament('${t.id}')"
             style="position:absolute;top:12px;right:12px;background:rgba(239,68,68,0.15);
                    border:1px solid rgba(239,68,68,0.4);color:#fca5a5;font-size:11px;
                    padding:4px 10px;border-radius:8px;cursor:pointer;z-index:5;"
             title="Eliminar torneo">🗑</button>`
        : '';
      return `
        <div onclick="App.selectTournament('${t.id}')"
             style="cursor:pointer;border-radius:24px;overflow:hidden;position:relative;
                    border:1px solid rgba(255,255,255,0.08);
                    box-shadow:0 8px 40px rgba(0,0,0,0.5);
                    transition:all 0.25s cubic-bezier(0.34,1.1,0.64,1);"
             onmouseover="this.style.transform='translateY(-5px)';this.style.borderColor='rgba(59,130,246,0.4)';this.style.boxShadow='0 20px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(59,130,246,0.2)'"
             onmouseout="this.style.transform='';this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow='0 8px 40px rgba(0,0,0,0.5)'">
          ${editBtn}

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

    // Tarjeta "Crear nuevo torneo" (solo editor)
    const createCard = isEditor ? `
      <div onclick="App.openCreateTournament()"
           style="cursor:pointer;border-radius:24px;overflow:hidden;
                  border:2px dashed rgba(96,165,250,0.35);min-height:240px;
                  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
                  background:rgba(30,64,175,0.08);transition:all 0.25s;"
           onmouseover="this.style.borderColor='#60a5fa';this.style.background='rgba(30,64,175,0.18)';"
           onmouseout="this.style.borderColor='rgba(96,165,250,0.35)';this.style.background='rgba(30,64,175,0.08)';">
        <div style="font-size:48px;color:#60a5fa;">+</div>
        <div style="color:#bfdbfe;font-weight:700;font-size:16px;">Crear nuevo torneo</div>
        <div style="color:#94a3b8;font-size:12px;text-align:center;padding:0 24px;">
          Empieza un torneo desde cero o sube un Excel con equipos y jugadores
        </div>
      </div>` : '';

    list.innerHTML = cardsHtml + createCard;
  },

  // ─── Crear / Editar Torneos ─────────────────────────────────────────────────

  openCreateTournament() {
    Utils.showModal(`
      <h3 class="text-xl font-bold mb-2">🏆 Crear Nuevo Torneo</h3>
      <p style="color:#94a3b8;font-size:13px;margin-bottom:16px;">
        Cada torneo tiene sus propios colegios, equipos, jugadores y partidos.
      </p>
      <div class="grid gap-3">
        <div>
          <label class="text-gray-400 text-sm">Nombre <span style="color:#ef4444">*</span></label>
          <input type="text" id="tn-name" class="input-field mt-1" placeholder="Ej: Big Games Cali">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label class="text-gray-400 text-sm">Año</label>
            <input type="text" id="tn-year" class="input-field mt-1" placeholder="2026" value="2026">
          </div>
          <div>
            <label class="text-gray-400 text-sm">Edición</label>
            <input type="text" id="tn-edition" class="input-field mt-1" placeholder="2da Edición">
          </div>
        </div>
        <div>
          <label class="text-gray-400 text-sm">Descripción</label>
          <input type="text" id="tn-desc" class="input-field mt-1" placeholder="Torneo inter-colegial multideporte">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div>
            <label class="text-gray-400 text-sm">Inicio</label>
            <input type="date" id="tn-start" class="input-field mt-1">
          </div>
          <div>
            <label class="text-gray-400 text-sm">Fin</label>
            <input type="date" id="tn-end" class="input-field mt-1">
          </div>
          <div>
            <label class="text-gray-400 text-sm">Estado</label>
            <select id="tn-status" class="input-field mt-1">
              <option value="upcoming">Próximamente</option>
              <option value="active" selected>Activo</option>
              <option value="finished">Finalizado</option>
            </select>
          </div>
        </div>
        <button class="btn-primary mt-2" onclick="App.submitCreateTournament()">
          🏆 Crear Torneo
        </button>
      </div>
    `);
  },

  async submitCreateTournament() {
    const name = document.getElementById('tn-name').value.trim();
    if (!name) { Utils.toast('Nombre requerido', 'error'); return; }
    const payload = {
      name,
      year:        document.getElementById('tn-year').value.trim() || null,
      edition:     document.getElementById('tn-edition').value.trim() || null,
      description: document.getElementById('tn-desc').value.trim() || null,
      start_date:  document.getElementById('tn-start').value || null,
      end_date:    document.getElementById('tn-end').value || null,
      status:      document.getElementById('tn-status').value,
    };
    try {
      await Api.createTournament(payload);
      Utils.closeModal();
      Utils.toast('Torneo creado');
      this._showTournamentScreen();
    } catch (e) {
      Utils.toast(e.message || 'Error al crear torneo', 'error');
    }
  },

  // ─── Aviso de Privacidad (Ley 1581 de 2012 — Habeas Data Colombia) ────────

  openPrivacyNotice() {
    Utils.showModal(`
      <h3 class="text-xl font-bold mb-2">🔒 Aviso de Privacidad</h3>
      <p style="color:#94a3b8;font-size:12px;margin-bottom:14px;">Ley 1581 de 2012 · Habeas Data — Colombia</p>
      <div style="max-height:60vh;overflow-y:auto;font-size:13px;color:#cbd5e1;line-height:1.55;padding-right:8px;">
        <p style="margin-bottom:10px;"><strong>Responsable del Tratamiento.</strong> X10 / Data Games. Domicilio: Barranquilla, Colombia. Contacto: sarbelaez@equitel.com.co.</p>

        <p style="margin-bottom:10px;"><strong>Finalidad.</strong> Los datos personales recolectados (nombre, número de documento, fecha de nacimiento, posición, foto, colegio y desempeño deportivo) se tratan con el único fin de organizar, gestionar y comunicar la participación del titular en torneos deportivos estudiantiles, generar estadísticas, publicar resultados y emitir reconocimientos.</p>

        <p style="margin-bottom:10px;"><strong>Datos de menores.</strong> Cuando el titular sea menor de edad, el tratamiento solo procede con autorización expresa de quienes ejerzan la patria potestad, garantizando siempre el interés superior del niño, niña o adolescente.</p>

        <p style="margin-bottom:10px;"><strong>Derechos del titular.</strong> Conforme a los artículos 8 y 9 de la Ley 1581 de 2012, el titular podrá: (i) conocer, actualizar y rectificar sus datos; (ii) solicitar prueba de la autorización otorgada; (iii) ser informado sobre el uso dado a sus datos; (iv) presentar quejas ante la Superintendencia de Industria y Comercio; (v) revocar la autorización o solicitar la supresión de sus datos cuando no exista deber legal o contractual de mantenerlos; (vi) acceder gratuitamente a sus datos.</p>

        <p style="margin-bottom:10px;"><strong>Conservación.</strong> Los datos se conservarán durante el desarrollo del torneo y por el tiempo razonable adicional necesario para fines estadísticos e históricos del evento, salvo que el titular solicite su supresión.</p>

        <p style="margin-bottom:10px;"><strong>Transferencias.</strong> No se realizarán transferencias internacionales de datos sin autorización previa del titular. La información puede ser visualizada públicamente en plataformas asociadas al torneo (resultados, posiciones, marcadores en vivo).</p>

        <p style="margin-bottom:10px;"><strong>Canal de atención.</strong> Para ejercer cualquier derecho o presentar consultas y reclamos, el titular puede comunicarse al correo <strong>sarbelaez@equitel.com.co</strong> o WhatsApp <strong>+57 316 531 2266</strong>. La solicitud será atendida en los plazos legales (10 días hábiles para consultas y 15 días hábiles para reclamos, prorrogables conforme a la ley).</p>

        <p style="margin-top:14px;color:#64748b;font-size:11px;">Última actualización: abril 2026</p>
      </div>
      <button class="btn-primary mt-4" style="width:100%;" onclick="Utils.closeModal()">Entendido</button>
    `);
  },

  async deleteTournament(id) {
    if (!confirm('⚠️ Esto eliminará el torneo y TODOS sus colegios, equipos, jugadores, partidos y eventos. Esta acción no se puede deshacer. ¿Continuar?')) return;
    try {
      await Api.deleteTournament(id);
      Utils.toast('Torneo eliminado');
      this._showTournamentScreen();
    } catch (e) {
      Utils.toast(e.message || 'Error al eliminar torneo', 'error');
    }
  },

  async selectTournament(id) {
    // Compatibilidad: id antiguo 'big-games-2026' → UUID por defecto
    if (id === 'big-games-2026') id = '11111111-1111-1111-1111-111111111111';

    let t = (this._tournamentsCache || this.TOURNAMENTS).find(t => t.id === id);
    if (!t) {
      // Cache vacío — buscar en API
      try {
        const all = await Api.getTournaments();
        this._tournamentsCache = all;
        t = all.find(x => x.id === id);
      } catch {}
    }
    if (!t) {
      // Torneo no existe ya — limpiar sesión y volver al selector
      sessionStorage.removeItem('ds_tournament');
      this.currentTournament = null;
      this._showTournamentScreen();
      return;
    }
    this.currentTournament = t;
    sessionStorage.setItem('ds_tournament', JSON.stringify(t));

    document.getElementById('tournament-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    // Hide global toggle (header has its own)
    const globalToggle = document.getElementById('theme-toggle-global');
    if (globalToggle) globalToggle.style.display = 'none';

    // Header: nombre del torneo
    const headerName = document.getElementById('header-tournament-name');
    if (headerName) headerName.textContent = `${t.name} ${t.year}`;

    // Header: logo del torneo (si tiene)
    const headerLogo = document.getElementById('header-tournament-logo');
    if (headerLogo) {
      if (t.logo) {
        headerLogo.src = t.logo;
        headerLogo.alt = t.name;
        headerLogo.style.display = '';
      } else {
        headerLogo.style.display = 'none';
      }
    }

    const role = this.currentUser.role;
    const roleLabel = role === 'editor' ? '✏️ Editor' : role === 'arbitro' ? '🏃 Arbitro' : '📖 Lector';
    document.getElementById('user-badge').textContent = roleLabel;
    const mobileBadge = document.getElementById('user-badge-mobile');
    if (mobileBadge) mobileBadge.textContent = roleLabel;
    const qrBtn = document.getElementById('qr-btn');
    if (qrBtn) qrBtn.style.display = role === 'editor' ? 'inline-flex' : 'none';
    const qrBtnMobile = document.getElementById('qr-btn-mobile');
    if (qrBtnMobile) qrBtnMobile.style.display = role === 'editor' ? 'inline-flex' : 'none';
    this._applyTournamentTheme(t.id);
    this._buildNav();
    this._requestNotifPermission();
    // Live poll desactivado por ahora — activar cuando empiece el torneo
    // this._startLivePoll();
    const savedPage = sessionStorage.getItem('ds_page');
    const defaultPage = role === 'arbitro' ? 'liveScoring' : 'dashboard';
    this.navigate(savedPage && this.pages[savedPage] ? savedPage : defaultPage);
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

        /* Light mode overrides for tournament theme */
        :root.light body { background: #FFFFFF !important; }
        :root.light .card {
          background: #FFFFFF !important; border-color: #DDD !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
        }
        :root.light header {
          background: #FFFFFF !important; border-bottom: 3px solid #dd2b2f !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
        }
        :root.light .nav-tab {
          background: #F0F0F0 !important; color: #333 !important;
          border-color: #D0D0D0 !important;
        }
        :root.light .nav-tab:hover {
          background: #E0E0E0 !important; color: #111 !important;
        }
        :root.light .nav-tab.active {
          background: #dd2b2f !important; color: white !important;
          border-color: #dd2b2f !important; box-shadow: 0 2px 8px rgba(221,43,47,0.3) !important;
        }
        :root.light .input-field {
          background-color: #F5F5F5 !important; border-color: #D0D0D0 !important;
          color: #111 !important;
        }
        :root.light select.input-field {
          background-color: #F5F5F5 !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23333333' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") !important;
        }
        :root.light .input-field:focus {
          border-color: #dd2b2f !important;
          box-shadow: 0 0 0 3px rgba(221,43,47,0.15) !important;
          background-color: #FFF !important;
        }
        :root.light .mobile-filter-btn {
          background: #F0F0F0 !important; color: #dd2b2f !important;
          border-color: #D0D0D0 !important;
        }
        :root.light .stat-number { color: #dd2b2f !important; }
        :root.light .btn-ghost {
          background: #F0F0F0 !important; color: #333 !important;
          border-color: #D0D0D0 !important;
        }
      `;
      document.head.appendChild(style);
      // Update header logo SVG gradient to red/white
      const gradH = document.getElementById('aGradH');
      if (gradH) {
        gradH.innerHTML = '<stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#dd2b2f"/>';
      }
    }
  },

  // ─── Light / Dark theme toggle ──────────────────────────────────────────
  toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('ds_theme', isLight ? 'light' : 'dark');
    this._updateThemeIcon();
  },

  _loadTheme() {
    const saved = localStorage.getItem('ds_theme');
    if (saved === 'light') {
      document.documentElement.classList.add('light');
    } else if (!saved && window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.classList.add('light');
    }
    this._updateThemeIcon();
  },

  _updateThemeIcon() {
    const isLight = document.documentElement.classList.contains('light');
    const icon = isLight ? '\u2600\uFE0F' : '\uD83C\uDF19';
    const title = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    ['theme-toggle', 'theme-toggle-mobile', 'theme-toggle-header', 'theme-toggle-global'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { btn.textContent = icon; btn.title = title; }
    });
  },

  switchTournament() {
    this._stopLivePoll();
    this._stopPageRefresh();
    const themeEl = document.getElementById('tournament-theme');
    if (themeEl) themeEl.remove();
    const headerLogo = document.getElementById('header-tournament-logo');
    if (headerLogo) headerLogo.style.display = 'none';
    document.getElementById('main-app').classList.add('hidden');
    const gt = document.getElementById('theme-toggle-global');
    if (gt) gt.style.display = '';
    this._showTournamentScreen();
  },

  backToLogin() {
    document.getElementById('tournament-screen').classList.add('hidden');
    const gt = document.getElementById('theme-toggle-global');
    if (gt) gt.style.display = '';
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
    const gt = document.getElementById('theme-toggle-global');
    if (gt) gt.style.display = '';
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
    const arbitroOnly  = ['calendar', 'liveScoring', 'news', 'results', 'olympicRanking', 'individualSports', 'playoffs', 'registerTeamsPlayers'];
    const lectorHidden = ['teams', 'schools', 'players', 'registerTeamsPlayers', 'groups', 'generateSchedule', 'venues', 'individualSports', 'bulkImport'];
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
    sessionStorage.setItem('ds_page', page);

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

    // Auto-refresh desactivado — se activa solo en live_scoring
    // (evita recargas innecesarias y errores intermitentes)
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

  // ─── Splash screen 10x10 ─────────────────────────────────────────────────
  _showSplash(onDone) {
    this._splashOnDone = onDone;
    const el  = document.getElementById('splash-screen');
    const bar = document.getElementById('splash-progress');
    el.style.display = 'flex';

    // Secuencia de revelación elemento por elemento
    const r = (id, delay, styles) => setTimeout(() => {
      const e = document.getElementById(id);
      if (!e) return;
      Object.assign(e.style, styles);
    }, delay);

    r('sp-logo',   300, { opacity: '1', transform: 'scale(1) translateY(0)' });
    r('sp-line',   950, { width: '200px' });
    r('sp-tag',   1700, { opacity: '1', transform: 'translateY(0)' });
    r('sp-value', 2600, { opacity: '1', transform: 'scale(1)' });
    r('sp-msg',   4000, { opacity: '1', transform: 'translateY(0)' });
    r('sp-btns',  5400, { opacity: '1', transform: 'translateY(0)' });

    if (bar) requestAnimationFrame(() => { bar.style.width = '0%'; });
    this._splashTimer = setTimeout(() => this._splashFinish(onDone), 20000);
  },

  _splashFinish(onDone) {
    clearTimeout(this._splashTimer);
    const el = document.getElementById('splash-screen');
    el.style.transition = 'opacity 0.5s ease';
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; (onDone || this._splashOnDone)(); }, 500);
  },

  _splashSkip() {
    this._splashFinish(this._splashOnDone);
  },

  // Inicialización - restaurar sesión si existe
  init() {
    this._loadTheme();
    Utils._initConnectivity();
    // Siempre mostrar splash, luego continuar con la lógica de sesión
    this._showSplash(() => {
      this._initAfterSplash();
    });
  },

  async _initAfterSplash() {
    // 1. Auto-login vía parámetro URL (?access=lector) — generado por QR
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'lector') {
      history.replaceState(null, '', window.location.pathname);
      this.currentUser = { role: 'viewer', email: 'viewer@datasport.co' };
      sessionStorage.setItem('ds_user', JSON.stringify(this.currentUser));
      document.getElementById('login-screen').classList.add('hidden');
      // Lector via QR: si solo hay un torneo activo, entrar directo; si hay varios, mostrar selector
      try {
        const tournaments = await Api.getTournaments();
        const active = tournaments.filter(t => t.status === 'active');
        if (active.length === 1) {
          this._tournamentsCache = tournaments;
          this.selectTournament(active[0].id);
        } else {
          this._showTournamentScreen();
        }
      } catch {
        this._showTournamentScreen();
      }
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
        const storedT = sessionStorage.getItem('ds_tournament');
        if (storedT) {
          this.currentTournament = JSON.parse(storedT);
          document.getElementById('login-screen').classList.add('hidden');
          this.selectTournament(this.currentTournament.id);
        } else {
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
