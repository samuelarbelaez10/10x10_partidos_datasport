/**
 * Página: Noticias - Feed social con publicaciones del editor + eventos en vivo
 * Soporta fotos/videos desde cámara o galería del dispositivo.
 * Requiere: tabla `posts` en Supabase + bucket `posts-media` (público).
 */

const _NEWS_LABELS = {
  goal:             '⚽ Gol',
  yellow_card:      '🟨 Tarjeta Amarilla',
  red_card:         '🟥 Tarjeta Roja',
  penalty:          '⏸️ Penal',
  assist_football:  '🎯 Asistencia',
  canasta_1pt:      '🏀 +1 Tiro Libre',
  canasta_2pts:     '🏀 +2 Canasta',
  canasta_3pts:     '🏀 +3 Triple',
  rebote:           '🏀 Rebote',
  bloqueo:          '🚫 Bloqueo',
  falta_tecnica:    '❌ Falta Técnica',
  point_volleyball: '🏐 Punto',
  ace:              '🎯 Ace',
  error_volleyball: '❌ Error',
  block:            '🚫 Bloqueo',
};

// Archivo seleccionado para subir
window._newsSelectedFile = null;

// Session ID único por navegador (sin login) para reacciones y comentarios
function _newsGetSessionId() {
  let sid = localStorage.getItem('_ds_sid');
  if (!sid) {
    sid = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem('_ds_sid', sid);
  }
  return sid;
}

// Secciones de comentarios abiertas (persiste entre recargas del feed)
window._newsOpenComments = window._newsOpenComments || new Set();

Pages.News = async function(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 class="text-3xl font-black" style="color:var(--accent);">📰 Noticias</h2>
        <p class="text-gray-400 mt-1" style="font-size:13px;">Feed del torneo · actualiza cada 20 s</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div id="news-dot" style="width:8px;height:8px;background:var(--muted);border-radius:50%;"></div>
        <span id="news-status" style="color:var(--muted);font-size:12px;font-weight:600;">Cargando…</span>
      </div>
    </div>

    <div style="max-width:680px;margin:0 auto;">

      ${App.isEditor() ? `
      <!-- ── Formulario de publicación (solo editor) ─────────────────── -->
      <div class="card" style="margin-bottom:20px;padding:16px 20px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="width:40px;height:40px;border-radius:50%;flex-shrink:0;
                      background:linear-gradient(135deg,var(--accent),var(--accent));
                      display:flex;align-items:center;justify-content:center;font-size:20px;">✏️</div>
          <div style="flex:1;min-width:0;">
            <textarea id="post-content" rows="2"
              style="width:100%;box-sizing:border-box;background:var(--surface);
                     border:1px solid rgba(255,255,255,0.12);border-radius:10px;
                     color:var(--text);padding:11px 14px;font-size:15px;resize:none;
                     font-family:inherit;line-height:1.5;outline:none;
                     transition:border-color .2s;"
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='rgba(255,255,255,0.12)'"
              placeholder="¿Qué está pasando en el torneo?"></textarea>

            <!-- Vista previa del archivo seleccionado -->
            <div id="post-preview"
              style="display:none;position:relative;margin-top:10px;
                     border-radius:12px;overflow:hidden;background:#0f172a;">
              <div id="post-preview-content"></div>
              <button onclick="window._newsClearFile()"
                style="position:absolute;top:8px;right:8px;
                       background:rgba(0,0,0,0.65);color:white;border:none;
                       border-radius:50%;width:30px;height:30px;font-size:15px;
                       cursor:pointer;display:flex;align-items:center;justify-content:center;
                       line-height:1;">✕</button>
            </div>

            <!-- Barra de acciones -->
            <div style="display:flex;justify-content:space-between;align-items:center;
                        margin-top:12px;padding-top:10px;
                        border-top:1px solid var(--border);">
              <div style="display:flex;gap:6px;align-items:center;">
                <!-- Botón principal: galería o cámara -->
                <label for="post-file"
                  style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;
                         background:var(--surface);border:1px solid rgba(255,255,255,0.15);
                         border-radius:8px;padding:8px 14px;font-size:13px;color:var(--muted);
                         transition:all .15s;user-select:none;"
                  onmouseenter="this.style.background='rgba(255,255,255,0.1)';this.style.color='var(--text)'"
                  onmouseleave="this.style.background='var(--border)';this.style.color='var(--muted)'">
                  📷 Foto / Video
                </label>
                <!-- accept sin capture = el dispositivo muestra "Tomar foto" O "Galería" -->
                <input type="file" id="post-file"
                  accept="image/*,video/*"
                  style="display:none;"
                  onchange="window._newsPickFile(this)">

                <span id="post-file-name"
                  style="font-size:12px;color:var(--muted);max-width:140px;
                         overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
              </div>

              <button id="post-submit-btn" onclick="window._newsPost()"
                class="btn-primary"
                style="padding:10px 22px;font-size:14px;">
                📤 Publicar
              </button>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Feed combinado -->
      <div id="news-feed">${Utils.spinner()}</div>
    </div>
  `;

  // ── Indicador en vivo ───────────────────────────────────────────────────
  const setStatus = (isLive) => {
    const dot = document.getElementById('news-dot');
    const txt = document.getElementById('news-status');
    if (!dot || !txt) return;
    if (isLive) {
      dot.style.background = '#22c55e';
      dot.style.animation  = 'pulse 1.5s infinite';
      txt.textContent      = 'EN VIVO';
      txt.style.color      = '#22c55e';
    } else {
      dot.style.background = 'var(--muted)';
      dot.style.animation  = '';
      txt.textContent      = 'Sin partidos en vivo';
      txt.style.color      = 'var(--muted)';
    }
  };

  // ── Seleccionar archivo ─────────────────────────────────────────────────
  window._newsPickFile = (input) => {
    const file = input.files[0];
    if (!file) return;

    // Validar tamaño (80 MB máx)
    if (file.size > 80 * 1024 * 1024) {
      Utils.toast('Archivo muy grande (máx. 80 MB)', 'error');
      input.value = '';
      return;
    }

    window._newsSelectedFile = file;

    // Nombre truncado
    const nameEl = document.getElementById('post-file-name');
    if (nameEl) nameEl.textContent = file.name.length > 24 ? file.name.slice(0, 22) + '…' : file.name;

    // Vista previa
    const preview   = document.getElementById('post-preview');
    const previewEl = document.getElementById('post-preview-content');
    if (!preview || !previewEl) return;

    const objUrl = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      previewEl.innerHTML = `<video src="${objUrl}" controls
        style="width:100%;max-height:340px;display:block;background:#000;"></video>`;
    } else {
      previewEl.innerHTML = `<img src="${objUrl}" alt="preview"
        style="width:100%;max-height:480px;object-fit:cover;display:block;">`;
    }
    preview.style.display = '';
  };

  // ── Limpiar archivo ─────────────────────────────────────────────────────
  window._newsClearFile = () => {
    window._newsSelectedFile = null;
    const input   = document.getElementById('post-file');
    const nameEl  = document.getElementById('post-file-name');
    const preview = document.getElementById('post-preview');
    if (input)   input.value   = '';
    if (nameEl)  nameEl.textContent = '';
    if (preview) preview.style.display = 'none';
  };

  // ── Publicar ────────────────────────────────────────────────────────────
  window._newsPost = async () => {
    const content = document.getElementById('post-content')?.value?.trim();
    if (!content) { Utils.toast('Escribe algo para publicar', 'error'); return; }

    const btn = document.getElementById('post-submit-btn');
    const setLoading = (on, msg = '') => {
      if (!btn) return;
      btn.disabled    = on;
      btn.textContent = on ? msg : '📤 Publicar';
    };

    let mediaUrl  = null;
    let mediaType = null;

    if (window._newsSelectedFile) {
      setLoading(true, '⬆️ Subiendo…');
      try {
        const result = await Api.uploadPostMedia(window._newsSelectedFile);
        mediaUrl  = result.url;
        mediaType = result.media_type;
      } catch(e) {
        Utils.toast('Error al subir: ' + e.message, 'error');
        setLoading(false);
        return;
      }
    }

    setLoading(true, '✅ Publicando…');
    try {
      await Api.createPost({ content, media_url: mediaUrl, media_type: mediaType });
      document.getElementById('post-content').value = '';
      window._newsClearFile();
      Utils.toast('¡Publicado!');
      await window._newsLoad();
    } catch(e) {
      Utils.toast(e.message || 'Error al publicar', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Cargar feed ─────────────────────────────────────────────────────────
  const load = async () => {
    const el = document.getElementById('news-feed');
    if (!el) return;
    try {
      const [posts, live, players] = await Promise.all([
        Api.getPosts().catch(() => []),
        Api.getLiveMatches().catch(() => []),
        Api.getPlayers().catch(() => []),
      ]);

      // Mapa player_id → nombre completo para enriquecer eventos
      window._newsPlayersMap = {};
      (players || []).forEach(p => { window._newsPlayersMap[p.id] = p.full_name; });

      let liveItems = [];
      if (live && live.length > 0) {
        setStatus(true);
        const eventsArr = await Promise.all(
          live.map(m => Api.getEvents(m.id).catch(() => []))
        );
        live.forEach((m, i) => {
          const evs = eventsArr[i] || [];
          const s1  = m.team1?.name || m.team1?.school?.name || 'Local';
          const s2  = m.team2?.name || m.team2?.school?.name || 'Visitante';
          evs.forEach(ev => liveItems.push({ ...ev, _type: 'event', _match: m, _s1: s1, _s2: s2 }));
        });
        liveItems.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      } else {
        setStatus(false);
      }

      const combined = [
        ...(posts || []).map(p => ({ ...p, _type: 'post' })),
        ...liveItems,
      ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      if (combined.length === 0) {
        el.innerHTML = `
          <div style="text-align:center;padding:60px 20px;">
            <div style="font-size:52px;margin-bottom:16px;">📰</div>
            <p style="color:var(--muted);font-size:16px;">Sin noticias todavía</p>
            <p style="color:var(--muted);font-size:13px;margin-top:8px;">
              ${App.isEditor()
                ? 'Sé el primero en publicar algo arriba.'
                : 'Las noticias aparecerán aquí cuando el editor publique o haya partidos en vivo.'}
            </p>
          </div>`;
        return;
      }

      el.innerHTML = combined
        .map(item => item._type === 'post' ? _newsPostCard(item) : _newsEventCard(item))
        .join('');

    } catch(e) {
      const el2 = document.getElementById('news-feed');
      if (el2) el2.innerHTML = `<p style="color:var(--accent2);padding:20px;">Error: ${e.message}</p>`;
    }
  };

  window._newsLoad = load;
  await load();

  if (window._newsRefreshTimer) clearInterval(window._newsRefreshTimer);
  window._newsRefreshTimer = setInterval(load, 20000);
};

// ─── Card de publicación social ──────────────────────────────────────────────

function _newsPostCard(post) {
  const timeStr = post.created_at
    ? new Date(post.created_at).toLocaleString('es-CO', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  // ── Reacciones ──────────────────────────────────────────────────────────
  const sid      = _newsGetSessionId();
  const reacts   = post.post_reactions || [];
  const counts   = { like: 0, love: 0, fire: 0 };
  const myReacts = new Set();
  reacts.forEach(r => {
    if (r.reaction_type in counts) counts[r.reaction_type]++;
    if (r.session_id === sid)      myReacts.add(r.reaction_type);
  });
  const EMOJIS = { like: '👍', love: '❤️', fire: '🔥' };
  const reactionBar = Object.entries(EMOJIS).map(([type, emoji]) => {
    const active = myReacts.has(type);
    const count  = counts[type];
    return `<button onclick="window._newsReact('${post.id}','${type}')"
      style="display:inline-flex;align-items:center;gap:4px;
             padding:5px 12px;border-radius:20px;font-size:14px;cursor:pointer;
             border:1px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,0.1)'};
             background:${active ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)'};
             color:${active ? 'var(--accent)' : 'var(--muted)'};
             transition:all .15s;"
      onmouseenter="this.style.opacity='.8'"
      onmouseleave="this.style.opacity='1'">
      ${emoji}${count > 0 ? `<span style="font-size:12px;font-weight:600;">${count}</span>` : ''}
    </button>`;
  }).join('');

  let mediaHTML = '';
  if (post.media_url) {
    const url      = post.media_url;
    const urlLower = url.toLowerCase().split('?')[0];
    const mtype    = post.media_type || '';

    if (mtype === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      const embed = _newsYtEmbed(url);
      mediaHTML = `
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;
                    border-radius:10px;margin-top:12px;">
          <iframe src="${embed}" frameborder="0" allowfullscreen
            style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:10px;">
          </iframe>
        </div>`;
    } else if (mtype === 'video' || /\.(mp4|webm|mov|avi|m4v)$/.test(urlLower)) {
      mediaHTML = `
        <video src="${url}" controls playsinline
          style="width:100%;max-height:480px;border-radius:10px;margin-top:12px;
                 background:#000;display:block;"></video>`;
    } else {
      // Imagen (Supabase Storage, URL directa, etc.)
      mediaHTML = `
        <img src="${url}" alt="foto"
          style="width:100%;max-height:560px;object-fit:cover;border-radius:10px;
                 margin-top:12px;display:block;cursor:pointer;"
          onclick="window.open('${url.replace(/'/g,"\\'")}','_blank')"
          onerror="this.closest('.news-media-wrap')?.remove()">`;
      mediaHTML = `<div class="news-media-wrap">${mediaHTML}</div>`;
    }
  }

  // ── Comentarios ─────────────────────────────────────────────────────────
  const comments = (post.post_comments || [])
    .slice()
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  const commentCount = comments.length;
  const isOpen       = window._newsOpenComments?.has(post.id);

  const commentRows = comments.map(c => {
    const cTime = c.created_at
      ? new Date(c.created_at).toLocaleString('es-CO', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })
      : '';
    const canDelete = c.session_id === sid || App.isEditor();
    return `
      <div style="padding:8px 10px;border-radius:8px;background:var(--surface);
                  margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
          <div style="flex:1;min-width:0;">
            ${cTime ? `<span style="font-size:11px;color:var(--muted);">${cTime}</span>` : ''}
            <p style="font-size:13px;color:#cbd5e1;margin:4px 0 0;line-height:1.5;
                      word-break:break-word;white-space:pre-wrap;">
              ${_newsEscape(c.content)}
            </p>
          </div>
          ${canDelete ? `
          <button onclick="window._newsDeleteComment('${post.id}','${c.id}')"
            title="Eliminar"
            style="background:none;border:none;color:var(--muted);cursor:pointer;
                   font-size:12px;padding:2px 4px;flex-shrink:0;line-height:1;
                   border-radius:4px;"
            onmouseenter="this.style.color='var(--accent2)'"
            onmouseleave="this.style.color='var(--border)'">✕</button>
          ` : ''}
        </div>
      </div>`;
  }).join('');

  const commentsSection = `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
      <button onclick="window._newsToggleComments('${post.id}')"
        style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;
               padding:4px 0;display:inline-flex;align-items:center;gap:5px;
               font-family:inherit;transition:color .15s;"
        onmouseenter="this.style.color='var(--muted)'"
        onmouseleave="this.style.color='var(--muted)'">
        💬
        <span style="font-weight:600;">
          ${commentCount > 0
            ? `${commentCount} comentario${commentCount !== 1 ? 's' : ''}`
            : 'Comentar'}
        </span>
        <span style="font-size:10px;">${isOpen ? '▲' : '▼'}</span>
      </button>

      <div id="cmts-${post.id}" style="display:${isOpen ? 'block' : 'none'};margin-top:10px;">
        <div id="cmts-list-${post.id}">
          ${commentRows || '<p style="font-size:12px;color:var(--muted);margin:0 0 10px;">Sé el primero en comentar.</p>'}
        </div>
        <!-- Formulario -->
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;
                    padding-top:10px;border-top:1px solid var(--border);">
          <div style="display:flex;gap:8px;align-items:flex-end;">
            <textarea id="cmt-text-${post.id}" rows="2" maxlength="500"
              placeholder="Escribe un comentario…"
              style="flex:1;background:var(--surface);
                     border:1px solid var(--border);border-radius:8px;
                     padding:7px 12px;color:var(--text);font-size:13px;
                     resize:none;outline:none;font-family:inherit;line-height:1.5;"
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='var(--border)'"
              onkeydown="if(event.ctrlKey&&event.key==='Enter')window._newsAddComment('${post.id}')"></textarea>
            <button onclick="window._newsAddComment('${post.id}')"
              style="background:var(--accent);color:white;border:none;border-radius:8px;
                     padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;
                     white-space:nowrap;flex-shrink:0;"
              onmouseenter="this.style.background='#2563eb'"
              onmouseleave="this.style.background='var(--accent)'">Enviar</button>
          </div>
          <p style="font-size:11px;color:var(--muted);margin:0;">Ctrl+Enter para enviar</p>
        </div>
      </div>
    </div>`;

  return `
    <div class="card" style="margin-bottom:14px;padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:40px;height:40px;border-radius:50%;flex-shrink:0;
                      background:linear-gradient(135deg,var(--accent),var(--accent));
                      display:flex;align-items:center;justify-content:center;font-size:20px;">✏️</div>
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--accent);">Editor DATA SPORT</div>
            ${timeStr ? `<div style="font-size:11px;color:var(--muted);">${timeStr}</div>` : ''}
          </div>
        </div>
        ${App.isEditor() ? `
          <button onclick="window._newsDeletePost('${post.id}')"
            style="background:rgba(239,68,68,0.1);color:var(--accent2);
                   border:1px solid rgba(239,68,68,0.2);border-radius:6px;
                   padding:4px 8px;font-size:11px;cursor:pointer;flex-shrink:0;">✕</button>
        ` : ''}
      </div>
      ${post.content
        ? `<p style="margin-top:12px;font-size:15px;line-height:1.65;color:var(--text);
                     white-space:pre-wrap;word-break:break-word;">${_newsEscape(post.content)}</p>`
        : ''}
      ${mediaHTML}
      <div style="display:flex;gap:6px;margin-top:12px;padding-top:10px;
                  border-top:1px solid var(--border);">
        ${reactionBar}
      </div>
      ${commentsSection}
    </div>`;
}

function _newsYtEmbed(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

function _newsEscape(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

window._newsReact = async (postId, type) => {
  try {
    await Api.toggleReaction(postId, { session_id: _newsGetSessionId(), reaction_type: type });
    if (window._newsLoad) await window._newsLoad();
  } catch(e) {
    Utils.toast(e.message || 'Error al reaccionar', 'error');
  }
};

window._newsDeletePost = async (id) => {
  if (!confirm('¿Eliminar esta publicación?')) return;
  try {
    await Api.deletePost(id);
    Utils.toast('Publicación eliminada');
    if (window._newsLoad) await window._newsLoad();
  } catch(e) {
    Utils.toast(e.message || 'Error al eliminar', 'error');
  }
};

// ── Comentarios ───────────────────────────────────────────────────────────────

window._newsToggleComments = (postId) => {
  const section = document.getElementById('cmts-' + postId);
  if (!section) return;
  const open = section.style.display !== 'none';
  if (open) {
    section.style.display = 'none';
    window._newsOpenComments.delete(postId);
  } else {
    section.style.display = 'block';
    window._newsOpenComments.add(postId);
    setTimeout(() => document.getElementById('cmt-text-' + postId)?.focus(), 60);
  }
};

window._newsAddComment = async (postId) => {
  const textEl = document.getElementById('cmt-text-' + postId);
  const content = textEl?.value?.trim();

  if (!content) { Utils.toast('Escribe algo para comentar', 'error'); return; }

  const btn = textEl?.nextElementSibling;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  try {
    await Api.addComment(postId, {
      author_name: '',
      content,
      session_id: _newsGetSessionId(),
    });
    window._newsOpenComments.add(postId); // mantener abierto tras recarga
    if (window._newsLoad) await window._newsLoad();
  } catch(e) {
    Utils.toast(e.message || 'Error al comentar', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar'; }
  }
};

window._newsDeleteComment = async (postId, commentId) => {
  try {
    await Api.deleteComment(postId, commentId);
    window._newsOpenComments.add(postId); // mantener abierto
    if (window._newsLoad) await window._newsLoad();
  } catch(e) {
    Utils.toast(e.message || 'Error al eliminar comentario', 'error');
  }
};

// ─── Card de evento en vivo ──────────────────────────────────────────────────

function _newsEventCard(item) {
  const m     = item._match;
  const sport = m.sport || '';
  const s1    = item._s1;
  const s2    = item._s2;
  const ev    = item.event_type || '';

  let icon = '📋', color = 'var(--muted)', bg = 'rgba(148,163,184,0.07)';
  if (ev === 'goal' || ev === 'penalty')                  { icon = '⚽'; color = '#22c55e'; bg = 'rgba(34,197,94,0.1)'; }
  else if (ev === 'canasta_1pt' || ev === 'canasta_2pts') { icon = '🏀'; color = 'var(--accent)'; bg = 'rgba(96,165,250,0.1)'; }
  else if (ev === 'canasta_3pts')                         { icon = '🏀'; color = '#f59e0b'; bg = 'rgba(245,158,11,0.1)'; }
  else if (ev === 'yellow_card')                          { icon = '🟨'; color = '#fbbf24'; bg = 'rgba(251,191,36,0.1)'; }
  else if (ev === 'red_card')                             { icon = '🟥'; color = 'var(--accent2)'; bg = 'rgba(239,68,68,0.1)'; }
  else if (ev === 'point_volleyball' || ev === 'ace')     { icon = '🏐'; color = 'var(--purple)'; bg = 'rgba(167,139,250,0.1)'; }
  else if (ev === 'bloqueo' || ev === 'block')            { icon = '🚫'; color = 'var(--accent2)'; bg = 'rgba(248,113,113,0.08)'; }
  else if (ev === 'falta_tecnica')                        { icon = '❌'; color = 'var(--accent2)'; bg = 'rgba(248,113,113,0.08)'; }

  const label      = _NEWS_LABELS[ev] || ev;
  const teamName   = item.team_id === m.team1_id ? s1 : item.team_id === m.team2_id ? s2 : '';
  const playerName = item.player_id ? (window._newsPlayersMap?.[item.player_id] || '') : '';
  const timeStr    = item.created_at
    ? new Date(item.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : '';

  return `
    <div style="display:flex;gap:14px;padding:14px 16px;margin-bottom:10px;
                background:${bg};border-radius:12px;border-left:3px solid ${color};">
      <div style="font-size:26px;flex-shrink:0;padding-top:2px;">${icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:15px;color:${color};">${label}</div>
        ${playerName ? `<div style="font-size:14px;font-weight:600;color:var(--text);margin-top:3px;">👤 ${playerName}</div>` : ''}
        <div style="font-size:13px;color:var(--muted);margin-top:2px;">
          ${teamName ? Utils.truncate(teamName, 28) + ' · ' : ''}${Utils.sportIcon(sport)} ${sport}
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">
          ${Utils.truncate(s1, 18)}
          <strong style="color:var(--accent);margin:0 4px;">${m.team1_score ?? 0}–${m.team2_score ?? 0}</strong>
          ${Utils.truncate(s2, 18)}
          ${timeStr ? `<span style="color:var(--muted);margin-left:6px;">· ${timeStr}</span>` : ''}
        </div>
      </div>
    </div>`;
}

window.Pages = window.Pages || {};
window.Pages.News = Pages.News;
