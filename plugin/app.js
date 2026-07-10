(function () {
  const embedded = new URLSearchParams(window.location.search).get('embedded') === '1';
  const resourceName = typeof window.GetParentResourceName === 'function'
    ? window.GetParentResourceName()
    : 'forge-loadscreen';

  const tabs = [
    ['overview', 'Resumo'],
    ['general', 'Geral'],
    ['media', 'Videos'],
    ['music', 'Musicas'],
    ['staff', 'Staff'],
    ['content', 'Conteudo'],
    ['advanced', 'Avancado'],
  ];

  const defaults = {
    BrandingEnabled: true,
    VideoEnabled: true,
    MusicEnabled: true,
    TipEnabled: true,
    RulesEnabled: true,
    ChangelogsEnabled: true,
    KeybindsEnabled: true,
    StaffEnabled: true,
    SocialEnabled: true,
    language: 'pt-BR',
    communityName: '',
    serverName: '',
    slogan: '',
    tagline: 'LOADING',
    tip: '',
    brand: {
      mark: 'A',
      title: 'FiveM',
      subtitle: 'Powered by CitizenFX',
    },
    uiText: {
      tipLabel: 'DICA',
      rulesLabel: 'Regras',
      changelogsLabel: 'Novidades',
      keybindsLabel: 'Teclas',
      staffLabel: 'Equipe',
      serverTeamLabel: 'Equipe do servidor',
      backLabel: 'Voltar',
      preparingEntry: 'Preparando entrada',
      entryReady: 'Entrada liberada',
      loadingComplete: 'Carregamento concluido',
      almostThere: 'Quase la...',
      loadingResources: 'Carregando recursos do servidor...',
      initializing: 'Inicializando servidor...',
      initializingServer: 'Inicializando servidor',
      synchronizing: 'Sincronizando sessao...',
      detectingResources: 'detectando recursos',
      resources: 'recursos',
      remaining: 'restantes',
      noKeybind: 'Nenhuma tecla atribuida',
      hideUiLabel: 'Esconder UI',
      showUiLabel: 'Mostrar UI',
    },
    featureCards: [
      { title: 'Roleplay leve', description: 'Historias reais, conexoes verdadeiras.' },
      { title: 'Ambiente seguro', description: 'Equipe ativa e dedicada para todos.' },
      { title: 'Comunidade ativa', description: 'Participe, interaja e faca parte.' },
    ],
    footer: {
      text: 'DESENVOLVIDO COM AMOR POR EQUIPE forge STUDIOS',
    },
    minimumLoadscreenSeconds: 0,
    colors: {},
    social: {},
    links: {},
    backgroundAudio: 'separate',
    backgroundMode: 'playlist',
    backgroundMedia: { enabled: true, mode: 'playlist', audio: 'separate', shuffle: false, rotateSeconds: 42, items: [] },
    musicTracks: [],
    musicVolume: 0.6,
    musicAutoplay: true,
    musicShowCover: true,
    musicShuffle: false,
    musicSourceMode: 'playlist',
    staff: [],
    staffCarouselEnabled: true,
    staffCarouselSeconds: 6,
    rules: [],
    changelogs: [],
    keybinds: [],
  };

  const state = {
    config: null,
    original: null,
    activeTab: 'overview',
    dirty: false,
    saving: false,
    context: null,
  };

  const el = {
    tabs: document.getElementById('tabs'),
    content: document.getElementById('content'),
    status: document.getElementById('status'),
    saveBtn: document.getElementById('saveBtn'),
    previewBtn: document.getElementById('previewBtn'),
    dirtyBadge: document.getElementById('dirtyBadge'),
    toast: document.getElementById('toast'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modalTitle'),
    modalText: document.getElementById('modalText'),
    modalCancel: document.getElementById('modalCancel'),
    modalConfirm: document.getElementById('modalConfirm'),
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDefaults(config) {
    const next = Object.assign({}, defaults, config || {});
    next.colors = Object.assign({}, defaults.colors, config && config.colors || {});
    next.social = Object.assign({}, defaults.social, config && config.social || {});
    next.links = Object.assign({}, defaults.links, config && config.links || {});
    next.brand = Object.assign({}, defaults.brand, config && config.brand || {});
    next.uiText = Object.assign({}, defaults.uiText, config && config.uiText || {});
    next.footer = Object.assign({}, defaults.footer, config && config.footer || {});
    next.featureCards = Array.isArray(next.featureCards) ? next.featureCards : clone(defaults.featureCards);
    while (next.featureCards.length < 3) next.featureCards.push({ title: '', description: '' });
    next.backgroundMedia = Object.assign({}, defaults.backgroundMedia, config && config.backgroundMedia || {});
    next.backgroundMedia.items = Array.isArray(next.backgroundMedia.items) ? next.backgroundMedia.items : [];
    next.musicTracks = Array.isArray(next.musicTracks) ? next.musicTracks : [];
    next.staff = Array.isArray(next.staff) ? next.staff : [];
    next.rules = Array.isArray(next.rules) ? next.rules : [];
    next.changelogs = Array.isArray(next.changelogs) ? next.changelogs : [];
    next.keybinds = Array.isArray(next.keybinds) ? next.keybinds : [];
    return next;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function get(path) {
    return path.split('.').reduce((acc, key) => acc == null ? undefined : acc[key], state.config);
  }

  function set(path, value) {
    const parts = path.split('.');
    let target = state.config;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (target[key] == null) target[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      target = target[key];
    }
    target[parts[parts.length - 1]] = value;
    markDirty();
  }

  function markDirty() {
    state.dirty = JSON.stringify(stripTransient(state.config || {})) !== JSON.stringify(stripTransient(state.original || {}));
    el.dirtyBadge.textContent = state.dirty ? 'Alteracoes nao salvas' : 'Sincronizado';
    el.dirtyBadge.className = state.dirty ? 'badge badge--dirty' : 'badge badge--muted';
  }

  function setStatus(message, kind) {
    el.status.textContent = message;
    el.status.className = kind ? `status status--${kind}` : 'status';
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(el.toast._timer);
    el.toast._timer = setTimeout(() => {
      el.toast.hidden = true;
    }, 3200);
  }

  function ask(title, text, onConfirm) {
    el.modalTitle.textContent = title;
    el.modalText.textContent = text;
    el.modal.hidden = false;
    el.modalConfirm.onclick = () => {
      el.modal.hidden = true;
      onConfirm();
    };
    el.modalCancel.onclick = () => {
      el.modal.hidden = true;
    };
  }

  async function nui(name, payload) {
    const response = await fetch(`https://${resourceName}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload || {}),
    });
    return response.json();
  }

  function applyTheme(theme, colorMode) {
    if (!theme) return;
    const root = document.documentElement;
    root.dataset.theme = colorMode || 'dark';
    root.style.setProperty('--forge-primary', theme.accentColor || '#ff334f');
    root.style.setProperty('--forge-primary-bright', theme.accentBright || '#ff6b80');
    root.style.setProperty('--forge-primary-deep', theme.accentDeep || '#8f1024');
    root.style.setProperty('--forge-background', theme.backgroundColor || '#050507');
    root.style.setProperty('--forge-panel', theme.panelColor || '#101014');
    root.style.setProperty('--forge-foreground', theme.foregroundColor || '#ffffff');
    root.style.setProperty('--forge-muted', theme.mutedColor || '#a8a8b3');
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'forge-plugin/init') {
      state.context = message;
      applyTheme(message.theme, message.colorMode);
    }

    if (message.type === 'forge-plugin/theme-changed') {
      applyTheme(message.theme, message.colorMode);
    }

    if (message.type === 'forge-plugin/perms-changed' && state.context) {
      state.context.perms = message.perms || [];
    }

    if (message.type === 'forge-plugin/capabilities-changed' && state.context) {
      state.context.capabilities = message.capabilities || [];
      updateButtons();
    }

    if (message.type === 'forge-plugin/ping' && embedded) {
      window.parent.postMessage({ type: 'forge-plugin/pong', sentAt: message.sentAt }, '*');
    }

    if (message.type === 'forge-plugin/close' && state.dirty) {
      toast('Existem alteracoes nao salvas nesta aba.');
    }
  });

  if (embedded) {
    window.parent.postMessage({ type: 'forge-plugin/ready' }, '*');
  }

  function canWrite() {
    if (!state.context || !Array.isArray(state.context.capabilities)) return true;
    return state.context.capabilities.includes('write');
  }

  function updateButtons() {
    el.saveBtn.disabled = state.saving || !state.config || !canWrite();
    el.previewBtn.disabled = !state.config;
  }

  function input(path, label, options) {
    options = options || {};
    const value = get(path);
    const type = options.type || 'text';
    const step = options.step ? ` step="${options.step}"` : '';
    const min = options.min != null ? ` min="${options.min}"` : '';
    const max = options.max != null ? ` max="${options.max}"` : '';
    return `
      <div class="field">
        <label>${escapeHtml(label)}</label>
        <input class="input" data-path="${path}" type="${type}" value="${escapeHtml(value == null ? '' : value)}"${step}${min}${max}>
        ${options.help ? `<small>${escapeHtml(options.help)}</small>` : ''}
      </div>
    `;
  }

  function select(path, label, choices) {
    const value = get(path);
    return `
      <div class="field">
        <label>${escapeHtml(label)}</label>
        <select class="select" data-path="${path}">
          ${choices.map((choice) => `<option value="${escapeHtml(choice[0])}" ${choice[0] === value ? 'selected' : ''}>${escapeHtml(choice[1])}</option>`).join('')}
        </select>
      </div>
    `;
  }

  function textarea(path, label, help) {
    const value = get(path);
    return `
      <div class="field">
        <label>${escapeHtml(label)}</label>
        <textarea class="textarea" data-path="${path}">${escapeHtml(value == null ? '' : value)}</textarea>
        ${help ? `<small>${escapeHtml(help)}</small>` : ''}
      </div>
    `;
  }

  function toggle(path, label) {
    return `
      <label class="toggle">
        <span>${escapeHtml(label)}</span>
        <input data-path="${path}" type="checkbox" ${get(path) !== false ? 'checked' : ''}>
      </label>
    `;
  }

  function renderTabs() {
    el.tabs.innerHTML = tabs.map(([id, label]) => `
      <button type="button" class="tab ${state.activeTab === id ? 'tab--active' : ''}" data-tab="${id}">
        ${escapeHtml(label)}
      </button>
    `).join('');
  }

  function renderOverview() {
    const mediaCount = state.config.backgroundMedia.items.length;
    const musicCount = state.config.musicTracks.length;
    const staffCount = state.config.staff.length;
    const contentCount = state.config.rules.length + state.config.changelogs.length + state.config.keybinds.length;
    return `
      <section class="summary">
        <div class="summary__item"><span>Videos</span><strong>${mediaCount}</strong></div>
        <div class="summary__item"><span>Musicas</span><strong>${musicCount}</strong></div>
        <div class="summary__item"><span>Staff</span><strong>${staffCount}</strong></div>
        <div class="summary__item"><span>Conteudo</span><strong>${contentCount}</strong></div>
      </section>
      <section class="card">
        <h2>Resumo</h2>
        <div class="grid">
          ${input('communityName', 'Texto superior (ex: forge Box)')}
          ${input('serverName', 'Logo principal / titulo japones')}
          ${input('slogan', 'Slogan')}
          ${select('language', 'Idioma da loadscreen', [['pt-BR', 'Portugues'], ['en-US', 'Ingles'], ['es-ES', 'Espanhol']])}
          ${input('minimumLoadscreenSeconds', 'Tempo minimo em segundos', { type: 'number', min: 0, max: 900, step: 1 })}
        </div>
      </section>
      <section class="card">
        <h3>Secoes ativas</h3>
        <div class="toggle-list">
          ${toggle('BrandingEnabled', 'Branding')}
          ${toggle('VideoEnabled', 'Video de fundo')}
          ${toggle('MusicEnabled', 'Musica')}
          ${toggle('TipEnabled', 'Dica')}
          ${toggle('RulesEnabled', 'Regras')}
          ${toggle('ChangelogsEnabled', 'Changelogs')}
          ${toggle('KeybindsEnabled', 'Keybinds')}
          ${toggle('StaffEnabled', 'Staff')}
          ${toggle('SocialEnabled', 'Sociais')}
        </div>
      </section>
    `;
  }

  function renderGeneral() {
    return `
      <section class="card">
        <h2>Textos e linguagem</h2>
        <div class="grid">
          ${select('language', 'Idioma', [['pt-BR', 'Portugues'], ['en-US', 'English'], ['es-ES', 'Espanol']])}
          ${input('serverName', 'Logo principal / titulo grande')}
          ${input('communityName', 'Texto superior (ex: forge Box)')}
          ${input('tagline', 'Tagline')}
          ${input('slogan', 'Slogan')}
          ${input('tip', 'Dica')}
          ${input('minimumLoadscreenSeconds', 'Tempo minimo de loadscreen', { type: 'number', min: 0, max: 900, step: 1 })}
        </div>
      </section>
      <section class="card">
        <h3>Marca do topo</h3>
        <div class="grid">
          ${input('brand.mark', 'Simbolo/logo curta')}
          ${input('brand.title', 'Nome da marca')}
          ${input('brand.subtitle', 'Subtitulo da marca')}
        </div>
      </section>
      <section class="card">
        <h3>Labels e botoes</h3>
        <div class="grid">
          ${input('uiText.tipLabel', 'Titulo da dica')}
          ${input('uiText.rulesLabel', 'Botao/modal regras')}
          ${input('uiText.changelogsLabel', 'Botao/modal novidades')}
          ${input('uiText.keybindsLabel', 'Botao/modal teclas')}
          ${input('uiText.staffLabel', 'Botao/modal equipe')}
          ${input('uiText.serverTeamLabel', 'Cargo padrao da equipe')}
          ${input('uiText.backLabel', 'Botao voltar')}
          ${input('footer.text', 'Rodape')}
        </div>
      </section>
      <section class="card">
        <h3>Textos de progresso</h3>
        <div class="grid">
          ${input('uiText.initializing', 'Status inicial')}
          ${input('uiText.initializingServer', 'Titulo inicializando')}
          ${input('uiText.loadingResources', 'Carregando recursos')}
          ${input('uiText.almostThere', 'Quase pronto')}
          ${input('uiText.loadingComplete', 'Carga completa')}
          ${input('uiText.preparingEntry', 'Preparando entrada')}
          ${input('uiText.entryReady', 'Entrada liberada')}
          ${input('uiText.synchronizing', 'Sincronizando')}
          ${input('uiText.detectingResources', 'Detectando recursos')}
          ${input('uiText.resources', 'Palavra recursos')}
          ${input('uiText.remaining', 'Palavra restantes')}
          ${input('uiText.noKeybind', 'Tecla vazia')}
          ${input('uiText.hideUiLabel', 'Botao esconder UI')}
          ${input('uiText.showUiLabel', 'Botao mostrar UI')}
        </div>
      </section>
      <section class="card">
        <h3>Cards centrais</h3>
        <div class="list">
          ${state.config.featureCards.slice(0, 3).map((_, index) => `
            <div class="list-row">
              <div class="list-row__grid">
                ${input(`featureCards.${index}.title`, `Card ${index + 1} titulo`)}
                ${input(`featureCards.${index}.description`, `Card ${index + 1} descricao`)}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
      <section class="card">
        <h3>Links sociais</h3>
        <div class="grid">
          ${input('social.discord', 'Discord')}
          ${input('social.site', 'Site')}
          ${input('social.instagram', 'Instagram')}
          ${input('social.youtube', 'YouTube')}
          ${input('social.tiktok', 'TikTok')}
          ${input('social.tebex', 'Tebex')}
        </div>
      </section>
      <section class="card">
        <h3>Links dos botoes</h3>
        <div class="grid">
          ${input('links.rules', 'Link de regras')}
          ${input('links.changelogs', 'Link de changelogs')}
          ${input('links.keybinds', 'Link de keybinds')}
        </div>
      </section>
    `;
  }



  function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  function mediaRow(item, index) {
    const localPath = item.src && !getYouTubeId(item.src) ? item.src : '(sem arquivo - use o app externo)';
    return `
      <div class="list-row">
        <div class="list-row__grid">
          ${input(`backgroundMedia.items.${index}.title`, 'Titulo')}
          ${input(`backgroundMedia.items.${index}.duration`, 'Duracao antes de trocar (s)', { type: 'number', min: 8, max: 600, step: 1 })}
          <div class="field">
            <label>Arquivo no servidor</label>
            <div class="input-readonly">${escapeHtml(localPath)}</div>
          </div>
          ${toggle(`backgroundMedia.items.${index}.muted`, 'Mudo')}
        </div>
        <div class="row-actions">          <button type="button" class="button button--danger" data-remove="backgroundMedia.items.${index}">Remover</button>
        </div>
      </div>
    `;
  }

  function renderMedia() {
    const items = state.config.backgroundMedia.items;
    return `
      <section class="card">
        <h2>Videos de fundo</h2>
        <div class="grid">
          ${select('backgroundMedia.audio', 'Audio usado', [['separate', 'Musica separada'], ['video', 'Audio do video']])}
          ${select('backgroundMedia.mode', 'Modo', [['playlist', 'Playlist'], ['single', 'Unico']])}
          ${input('backgroundMedia.rotateSeconds', 'Tempo padrao de troca', { type: 'number', min: 8, max: 600, step: 1 })}
          ${toggle('backgroundMedia.shuffle', 'Embaralhar videos')}
        </div>
      </section>
      <section class="card">
        <h3>Playlist de videos</h3>
        <div class="list">
          ${items.length ? items.map(mediaRow).join('') : '<div class="empty">Nenhum video cadastrado. Use o app externo para baixar e atualizar o JSON.</div>'}
        </div>
        <div class="section-actions">
          <button type="button" class="button" data-add="media">Adicionar video local</button>
        </div>
      </section>
    `;
  }

  function musicRow(item, index) {
    const localPath = item.src && !getYouTubeId(item.src) ? item.src : '(sem arquivo - use o app externo)';
    return `
      <div class="list-row">
        <div class="list-row__grid">
          ${input(`musicTracks.${index}.name`, 'Nome')}
          ${input(`musicTracks.${index}.artist`, 'Artista')}
          ${input(`musicTracks.${index}.cover`, 'Capa (URL ou caminho)')}
          ${input(`musicTracks.${index}.album`, 'Album')}
          <div class="field">
            <label>Arquivo de audio no servidor</label>
            <div class="input-readonly">${escapeHtml(localPath)}</div>
          </div>
        </div>
        <div class="row-actions">          <button type="button" class="button button--danger" data-remove="musicTracks.${index}">Remover</button>
        </div>
      </div>
    `;
  }

  function renderMusic() {
    return `
      <section class="card">
        <h2>Musicas</h2>
        <div class="grid">
          ${input('musicVolume', 'Volume', { type: 'number', min: 0, max: 1, step: 0.05 })}
          ${select('musicSourceMode', 'Origem', [['playlist', 'Playlist'], ['folder', 'Pasta/lista local']])}
          ${toggle('musicAutoplay', 'Tocar automaticamente')}
          ${toggle('musicShowCover', 'Mostrar capa')}
          ${toggle('musicShuffle', 'Embaralhar')}
        </div>
      </section>
      <section class="card">
        <h3>Playlist de musicas</h3>
        <div class="list">
          ${state.config.musicTracks.length ? state.config.musicTracks.map(musicRow).join('') : '<div class="empty">Nenhuma musica cadastrada. Use o app externo para baixar e atualizar o JSON.</div>'}
        </div>
        <div class="section-actions">
          <button type="button" class="button" data-add="music">Adicionar musica local</button>
        </div>
      </section>
    `;
  }

  function staffRow(item, index) {
    return `
      <div class="list-row">
        <div class="list-row__grid">
          ${input(`staff.${index}.name`, 'Nome')}
          ${input(`staff.${index}.role`, 'Cargo')}
          ${input(`staff.${index}.photo`, 'Foto')}
        </div>
        <div class="row-actions">
          <button type="button" class="button button--danger" data-remove="staff.${index}">Remover</button>
        </div>
      </div>
    `;
  }

  function renderStaff() {
    return `
      <section class="card">
        <h2>Staff</h2>
        <div class="grid">
          ${toggle('staffCarouselEnabled', 'Carousel ativo')}
          ${input('staffCarouselSeconds', 'Tempo entre cards', { type: 'number', min: 3, max: 60, step: 1 })}
        </div>
      </section>
      <section class="card">
        <h3>Membros</h3>
        <div class="list">
          ${state.config.staff.length ? state.config.staff.map(staffRow).join('') : '<div class="empty">Nenhum membro cadastrado.</div>'}
        </div>
        <div class="section-actions">
          <button type="button" class="button" data-add="staff">Adicionar membro</button>
        </div>
      </section>
    `;
  }

  function simpleTextRows(path, label) {
    const list = get(path) || [];
    return `
      <section class="card">
        <h3>${escapeHtml(label)}</h3>
        <div class="list">
          ${list.length ? list.map((_, index) => `
            <div class="list-row">
              ${input(`${path}.${index}`, `${label} ${index + 1}`)}
              <div class="row-actions">
                <button type="button" class="button button--danger" data-remove="${path}.${index}">Remover</button>
              </div>
            </div>
          `).join('') : '<div class="empty">Lista vazia.</div>'}
        </div>
        <div class="section-actions">
          <button type="button" class="button" data-add="${path}">Adicionar</button>
        </div>
      </section>
    `;
  }

  function changelogRow(entry, index) {
    return `
      <div class="list-row">
        <div>
          <div class="list-row__grid">
            ${input(`changelogs.${index}.version`, 'Versao')}
            ${input(`changelogs.${index}.date`, 'Data')}
          </div>
          ${textarea(`changelogs.${index}.itemsText`, 'Itens (um por linha)', 'Ao salvar, o plugin converte para lista.')}
        </div>
        <div class="row-actions">
          <button type="button" class="button button--danger" data-remove="changelogs.${index}">Remover</button>
        </div>
      </div>
    `;
  }

  function keybindRow(item, index) {
    return `
      <div class="list-row">
        <div class="list-row__grid">
          ${input(`keybinds.${index}.key`, 'Tecla')}
          ${input(`keybinds.${index}.action`, 'Acao')}
          ${input(`keybinds.${index}.description`, 'Descricao')}
        </div>
        <div class="row-actions">
          <button type="button" class="button button--danger" data-remove="keybinds.${index}">Remover</button>
        </div>
      </div>
    `;
  }

  function renderContent() {
    return `
      ${simpleTextRows('rules', 'Regras')}
      <section class="card">
        <h3>Changelogs</h3>
        <div class="list">
          ${state.config.changelogs.length ? state.config.changelogs.map(changelogRow).join('') : '<div class="empty">Nenhum changelog cadastrado.</div>'}
        </div>
        <div class="section-actions">
          <button type="button" class="button" data-add="changelog">Adicionar changelog</button>
        </div>
      </section>
      <section class="card">
        <h3>Keybinds</h3>
        <div class="list">
          ${state.config.keybinds.length ? state.config.keybinds.map(keybindRow).join('') : '<div class="empty">Nenhum keybind cadastrado.</div>'}
        </div>
        <div class="section-actions">
          <button type="button" class="button" data-add="keybind">Adicionar keybind</button>
        </div>
      </section>
    `;
  }

  function renderAdvanced() {
    return `
      <section class="card">
        <h2>JSON avancado</h2>
        <p class="status">Use apenas para ajustes finos. O servidor ainda valida e ignora campos inseguros.</p>
        ${textarea('__json', 'Config completa')}
        <div class="section-actions">
          <button type="button" class="button" data-action="apply-json">Aplicar JSON na tela</button>
          <button type="button" class="button button--ghost" data-action="reset-json">Recarregar JSON atual</button>
        </div>
      </section>
    `;
  }

  function prepareForRender() {
    state.config.changelogs.forEach((entry) => {
      if (!entry.itemsText) entry.itemsText = Array.isArray(entry.items) ? entry.items.join('\n') : '';
    });
    state.config.__json = JSON.stringify(stripTransient(state.config), null, 2);
  }

  function stripTransient(config) {
    const next = clone(config);
    delete next.__json;
    next.changelogs = (next.changelogs || []).map((entry) => {
      const cloneEntry = Object.assign({}, entry);
      cloneEntry.items = typeof entry.itemsText === 'string'
        ? entry.itemsText.split('\n').map((item) => item.trim()).filter(Boolean)
        : (Array.isArray(entry.items) ? entry.items : []);
      delete cloneEntry.itemsText;
      return cloneEntry;
    });
    return next;
  }

  function render() {
    if (!state.config) return;
    prepareForRender();
    renderTabs();
    const renderers = {
      overview: renderOverview,
      general: renderGeneral,
      media: renderMedia,
      music: renderMusic,
      staff: renderStaff,
      content: renderContent,
      advanced: renderAdvanced,
    };
    el.content.innerHTML = renderers[state.activeTab]();
    updateButtons();
    markDirty();
  }

  function addItem(kind) {
    if (kind === 'media') {
      state.config.backgroundMedia.items.push({ title: 'Novo video', type: 'auto', src: '', duration: 42, muted: false });
    } else if (kind === 'music') {
      state.config.musicTracks.push({ name: 'Nova musica', artist: '', cover: '', type: 'auto', src: '' });
    } else if (kind === 'staff') {
      state.config.staff.push({ name: 'Novo staff', role: '', photo: '' });
    } else if (kind === 'rules') {
      state.config.rules.push('Nova regra');
    } else if (kind === 'changelog') {
      state.config.changelogs.push({ version: '1.0.0', date: '', items: [], itemsText: '' });
    } else if (kind === 'keybind') {
      state.config.keybinds.push({ key: 'F1', action: '', description: '' });
    }
    markDirty();
    render();
  }

  function removeAt(path) {
    const parts = path.split('.');
    const index = Number(parts.pop());
    const list = parts.reduce((acc, key) => acc && acc[key], state.config);
    if (!Array.isArray(list) || Number.isNaN(index)) return;
    ask('Remover item', 'Esta acao remove o item da configuracao. Salve depois para aplicar.', () => {
      list.splice(index, 1);
      markDirty();
      render();
    });
  }

  el.tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    state.activeTab = button.dataset.tab;
    render();
  });

  el.content.addEventListener('input', (event) => {
    const target = event.target;
    if (!target.dataset.path) return;
    const path = target.dataset.path;
    if (path === '__json') {
      state.config.__json = target.value;
      return;
    }
    const value = target.type === 'checkbox'
      ? target.checked
      : target.type === 'number'
        ? Number(target.value)
        : target.value;
    set(path, value);
  });

  el.content.addEventListener('change', (event) => {
    const target = event.target;
    if (!target.dataset.path) return;
    const path = target.dataset.path;
    if (path === '__json') return;
    const value = target.type === 'checkbox'
      ? target.checked
      : target.type === 'number'
        ? Number(target.value)
        : target.value;
    set(path, value);
  });

  el.content.addEventListener('click', (event) => {
    const add    = event.target.closest('[data-add]');
    const remove = event.target.closest('[data-remove]');
    const action = event.target.closest('[data-action]');

    if (add) addItem(add.dataset.add);
    if (remove) removeAt(remove.dataset.remove);
    if (action && action.dataset.action === 'apply-json') {
      try {
        state.config = mergeDefaults(JSON.parse(state.config.__json || '{}'));
        markDirty();
        render();
        toast('JSON aplicado na tela.');
      } catch (err) {
        toast('JSON invalido.');
      }
    }
    if (action && action.dataset.action === 'reset-json') {
      state.config.__json = JSON.stringify(stripTransient(state.config), null, 2);
      render();
    }
  });

  el.saveBtn.addEventListener('click', async () => {
    if (!state.config || !canWrite()) return;
    state.saving = true;
    updateButtons();
    setStatus('Salvando configuracao...', null);
    try {
      const payload = stripTransient(state.config);
      const result = await nui('forgeLoadscreenSaveConfig', payload);
      if (!result.ok) throw new Error(result.error || 'save_failed');
      state.config = mergeDefaults(result.data);
      state.original = clone(state.config);
      setStatus('Configuracao salva e aplicada.', 'ok');
      toast('Loadscreen atualizada.');
      render();
    } catch (err) {
      setStatus(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
      state.saving = false;
      updateButtons();
    }
  });

  el.previewBtn.addEventListener('click', async () => {
    try {
      const result = await nui('forgeLoadscreenPreview', {});
      if (!result.ok) throw new Error(result.error || 'preview_failed');
      toast('Preview aberto no jogo.');
    } catch (err) {
      toast(`Nao foi possivel abrir preview: ${err.message}`);
    }
  });

  async function load() {
    setStatus('Carregando configuracao...', null);
    updateButtons();
    try {
      const result = await nui('forgeLoadscreenGetConfig', {});
      if (!result.ok) throw new Error(result.error || 'load_failed');
      state.config = mergeDefaults(result.data);
      state.original = clone(state.config);
      setStatus('Configuracao carregada. Edite e salve para aplicar.', 'ok');
      render();
    } catch (err) {
      setStatus(`Erro ao carregar: ${err.message}`, 'error');
    }
  }

  load();
})();


