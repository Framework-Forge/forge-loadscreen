/**
 * Loading screen PR.
 * Defaults used when not in FiveM or when no handover data. In FiveM, PR.lua
 * is sent by the server via handover and overrides these defaults.
 */

/** All key ids used in PR.keys (must match PR.lua). 100% layout. */
export const KEYBOARD_KEY_IDS = [
  'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  '`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace', 'Tab',
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\',
  'CapsLock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter',
  'ShiftLeft', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Up', 'ShiftRight',
  'CtrlLeft', 'Win', 'AltLeft', 'Space', 'AltRight', 'CtrlRight',
  'Insert', 'Home', 'PageUp', 'Delete', 'End', 'PageDown', 'Up', 'Left', 'Down', 'Right',
  'NumLock', 'NumpadDivide', 'NumpadMultiply', 'NumpadSubtract',
  'Numpad7', 'Numpad8', 'Numpad9', 'NumpadAdd',
  'Numpad4', 'Numpad5', 'Numpad6',
  'Numpad1', 'Numpad2', 'Numpad3', 'NumpadEnter',
  'Numpad0', 'NumpadDecimal',
];

/** Default keys: all { enabled: false, info: '' }. */
export function getDefaultKeys() {
  return Object.fromEntries(KEYBOARD_KEY_IDS.map((id) => [id, { enabled: false, info: '' }]));
}

/** Normalize key entry from config (bool or { enabled, info }). */
export function normalizeKeyEntry(val) {
  if (val === true || val === false) return { enabled: !!val, info: '' };
  if (val && typeof val === 'object') return { enabled: !!val.enabled, info: val.info ?? '' };
  return { enabled: false, info: '' };
}

/**
 * 100% keyboard layout: main block + numpad.
 * Each row is an array of { id, label, width }. width = unit widths.
 */
export const KEYBOARD_LAYOUT_MAIN = [
  [
    { id: 'Escape', label: 'Esc', width: 1.5 },
    { id: 'F1', label: 'F1', width: 1 }, { id: 'F2', label: 'F2', width: 1 }, { id: 'F3', label: 'F3', width: 1 }, { id: 'F4', label: 'F4', width: 1 },
    { id: 'F5', label: 'F5', width: 1 }, { id: 'F6', label: 'F6', width: 1 }, { id: 'F7', label: 'F7', width: 1 }, { id: 'F8', label: 'F8', width: 1 },
    { id: 'F9', label: 'F9', width: 1 }, { id: 'F10', label: 'F10', width: 1 }, { id: 'F11', label: 'F11', width: 1 }, { id: 'F12', label: 'F12', width: 1 },
  ],
  [
    { id: '`', label: '~ `', width: 1 }, { id: '1', label: '1', width: 1 }, { id: '2', label: '2', width: 1 }, { id: '3', label: '3', width: 1 },
    { id: '4', label: '4', width: 1 }, { id: '5', label: '5', width: 1 }, { id: '6', label: '6', width: 1 }, { id: '7', label: '7', width: 1 },
    { id: '8', label: '8', width: 1 }, { id: '9', label: '9', width: 1 }, { id: '0', label: '0', width: 1 }, { id: '-', label: '-', width: 1 },
    { id: '=', label: '=', width: 1 }, { id: 'Backspace', label: '←', width: 2 },
  ],
  [
    { id: 'Tab', label: 'Tab', width: 1.5 }, { id: 'Q', label: 'Q', width: 1 }, { id: 'W', label: 'W', width: 1 }, { id: 'E', label: 'E', width: 1 },
    { id: 'R', label: 'R', width: 1 }, { id: 'T', label: 'T', width: 1 }, { id: 'Y', label: 'Y', width: 1 }, { id: 'U', label: 'U', width: 1 },
    { id: 'I', label: 'I', width: 1 }, { id: 'O', label: 'O', width: 1 }, { id: 'P', label: 'P', width: 1 }, { id: '[', label: '[', width: 1 },
    { id: ']', label: ']', width: 1 }, { id: '\\', label: '\\', width: 1 },
  ],
  [
    { id: 'CapsLock', label: 'Caps', width: 1.75 }, { id: 'A', label: 'A', width: 1 }, { id: 'S', label: 'S', width: 1 }, { id: 'D', label: 'D', width: 1 },
    { id: 'F', label: 'F', width: 1 }, { id: 'G', label: 'G', width: 1 }, { id: 'H', label: 'H', width: 1 }, { id: 'J', label: 'J', width: 1 },
    { id: 'K', label: 'K', width: 1 }, { id: 'L', label: 'L', width: 1 }, { id: ';', label: ';', width: 1 }, { id: "'", label: "'", width: 1 },
    { id: 'Enter', label: 'Enter', width: 2.25 },
  ],
  [
    { id: 'ShiftLeft', label: 'Shift', width: 2.25 }, { id: 'Z', label: 'Z', width: 1 }, { id: 'X', label: 'X', width: 1 }, { id: 'C', label: 'C', width: 1 },
    { id: 'V', label: 'V', width: 1 }, { id: 'B', label: 'B', width: 1 }, { id: 'N', label: 'N', width: 1 }, { id: 'M', label: 'M', width: 1 },
    { id: ',', label: ',', width: 1 }, { id: '.', label: '.', width: 1 }, { id: '/', label: '/', width: 1 },
    { id: 'ShiftRight', label: 'Shift', width: 2.75 },
  ],
  [
    { id: 'CtrlLeft', label: 'Ctrl', width: 1.25 }, { id: 'Win', label: 'Win', width: 1.25 }, { id: 'AltLeft', label: 'Alt', width: 1.25 },
    { id: 'Space', label: 'Space', width: 6 }, { id: 'AltRight', label: 'Alt', width: 1.25 }, { id: 'CtrlRight', label: 'Ctrl', width: 1.25 },
  ],
];

/**
 * Navigation cluster – starts on row 1 (below F-row). Empty row 0 so F-row spans alone.
 * Inverted-T arrows: Up above Left/Down/Right.
 */
export const KEYBOARD_LAYOUT_NAV = [
  [], /* row 0: empty – F-row has no nav keys */
  [
    { id: 'Insert', label: 'Ins', width: 1 }, { id: 'Home', label: 'Home', width: 1 }, { id: 'PageUp', label: 'PgUp', width: 1 },
  ],
  [
    { id: 'Delete', label: 'Del', width: 1 }, { id: 'End', label: 'End', width: 1 }, { id: 'PageDown', label: 'PgDn', width: 1 },
  ],
  [
    { id: 'Up', label: '↑', width: 1 },
  ],
  [
    { id: 'Left', label: '←', width: 1 }, { id: 'Down', label: '↓', width: 1 }, { id: 'Right', label: '→', width: 1 },
  ],
  [], /* row 5: empty – bottom row is main only */
];

/** Numpad – starts on row 1. Empty row 0 so it aligns with number row. */
export const KEYBOARD_LAYOUT_NUMPAD = [
  [],
  [
    { id: 'NumLock', label: 'Num', width: 1 }, { id: 'NumpadDivide', label: '/', width: 1 }, { id: 'NumpadMultiply', label: '*', width: 1 }, { id: 'NumpadSubtract', label: '-', width: 1 },
  ],
  [
    { id: 'Numpad7', label: '7', width: 1 }, { id: 'Numpad8', label: '8', width: 1 }, { id: 'Numpad9', label: '9', width: 1 }, { id: 'NumpadAdd', label: '+', width: 1 },
  ],
  [
    { id: 'Numpad4', label: '4', width: 1 }, { id: 'Numpad5', label: '5', width: 1 }, { id: 'Numpad6', label: '6', width: 1 },
  ],
  [
    { id: 'Numpad1', label: '1', width: 1 }, { id: 'Numpad2', label: '2', width: 1 }, { id: 'Numpad3', label: '3', width: 1 }, { id: 'NumpadEnter', label: '↵', width: 1.5 },
  ],
  [
    { id: 'Numpad0', label: '0', width: 2 }, { id: 'NumpadDecimal', label: '.', width: 1 },
  ],
];

/** Legacy: combined layout (main rows only, for backwards compat). */
export const KEYBOARD_LAYOUT = KEYBOARD_LAYOUT_MAIN;

const defaultConfig = {
  brandingEnabled: true,
  videoEnabled: true,
  musicEnabled: true,
  tipEnabled: true,
  rulesEnabled: true,
  changelogsEnabled: true,
  keybindsEnabled: true,
  staffEnabled: true,
  socialEnabled: true,

  social: {
    instagram: '',
    tiktok: '',
    x: '',
    tebex: '',
    discord: '',
    youtube: '',
  },

  colors: {
    bgDark: '#0f0a14',
    bgPanel: 'rgba(26, 14, 42, 0.94)',
    bgCard: 'rgba(45, 25, 70, 0.95)',
    border: 'rgba(167, 139, 250, 0.4)',
    accent: '#a78bfa',
    accentDim: 'rgba(167, 139, 250, 0.65)',
    accentHover: 'rgba(167, 139, 250, 0.15)',
    text: '#ede9fe',
    textMuted: '#a5a0b8',
    success: '#4ade80',
    error: '#f87171',
    gradientAccent: 'linear-gradient(135deg, #ede9fe 0%, #59dbff 30%, #9359ff 60%, #59dbff 100%)',
  },

  serverName: 'ロックスター',
  language: 'pt-BR',
  tagline: 'LOADING',
  communityName: 'forge Box',
  slogan: 'Forge Your Legacy in Los Santos',
  brand: {
    logo: '',
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
    {
      icon: 'people',
      title: 'Roleplay leve',
      description: 'Historias reais, conexoes verdadeiras.',
    },
    {
      icon: 'shield',
      title: 'Ambiente seguro',
      description: 'Equipe ativa e dedicada para todos.',
    },
    {
      icon: 'star',
      title: 'Comunidade ativa',
      description: 'Participe, interaja e faca parte.',
    },
  ],
  footer: {
    text: 'DESENVOLVIDO COM AMOR POR EQUIPE forge STUDIOS',
  },

  videoSource: '',
  videoType: 'auto',
  videoMuted: false,
  backgroundMode: 'playlist',
  backgroundAudio: 'separate',
  backgroundMedia: {
    enabled: true,
    mode: 'playlist',
    audio: 'separate',
    shuffle: false,
    rotateSeconds: 42,
    items: [],
  },
  minimumLoadscreenSeconds: 0,
  serverResourceCount: 0,

  musicTracks: [
    { name: 'Ambient', artist: 'forge', cover: './images/music/default.png', src: '' },
    { name: 'Track 2', artist: '', cover: './images/music/default.png', src: '' },
  ],
  musicVolume: 0.6,
  musicShuffle: false,
  musicAutoplay: true,
  musicShowCover: true,
  musicSourceMode: 'playlist',

  tip: 'Type `help` to discover available commands and start your adventure!',

  links: {
    rules: '#',
    changelogs: '#',
    keybinds: '#',
  },

  staff: [
    { name: 'Admin', role: 'Owner', photo: './images/staff/admin.png' },
    { name: 'Moderator', role: 'Staff', photo: './images/staff/moderator.png' },
  ],
  staffCarouselEnabled: true,
  staffCarouselSeconds: 6,

  rules: [
    'Be respectful to all players and staff.',
    'No cheating, exploiting, or use of unauthorized mods.',
    'Follow roleplay guidelines and stay in character when appropriate.',
    'Do not advertise other servers or spam in chat.',
    'Listen to staff and follow their instructions.',
  ],

  changelogs: [
    { version: '1.0.0', date: '2025', items: ['Initial release.', 'Loading screen with video and music.'] },
  ],

  keybinds: [
    { action: 'Open Inventory', key: 'F1', description: 'Opens the inventory to manage your items and equipment.' },
    { action: 'Access Phone', key: 'F2', description: 'Open your in-game phone.' },
    { action: 'Toggle Radial Menu', key: 'F3', description: 'Open the quick action radial menu.' },
    { action: 'Interact', key: 'E', description: 'Interact with the environment and NPCs.' },
    { action: 'Open Main Menu', key: 'M', description: 'Open the main pause menu.' },
  ],
};

const pick = (obj, ...keys) => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
};

const bool = (v) => v === true || v === false ? v : undefined;

const text = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value);
};

function normalizeMediaItem(item, index = 0) {
  if (typeof item === 'string') {
    return { title: `Video ${index + 1}`, src: item, type: 'auto', duration: 42 };
  }
  const src = text(pick(item, 'src', 'source', 'url', 'path'));
  return {
    title: text(pick(item, 'title', 'name', 'label'), `Video ${index + 1}`),
    src,
    type: text(pick(item, 'type', 'videoType'), 'auto').toLowerCase(),
    duration: Number(pick(item, 'duration', 'durationSeconds', 'seconds')) || 42,
    muted: pick(item, 'muted', 'videoMuted'),
  };
}

function normalizeBackgroundMedia(handoverData) {
  const raw = pick(handoverData, 'backgroundMedia', 'BackgroundMedia') || {};
  const legacyItem = {
    title: text(pick(handoverData, 'videoTitle', 'VideoTitle'), 'Background'),
    src: text(pick(handoverData, 'videoSource', 'VideoSource')),
    type: text(pick(handoverData, 'videoType', 'VideoType'), 'auto'),
    muted: pick(handoverData, 'videoMuted', 'VideoMuted'),
  };
  const rawItems = pick(raw, 'items', 'playlist', 'videos', 'Items', 'Playlist', 'Videos');
  const items = Array.isArray(rawItems) && rawItems.length > 0
    ? rawItems.map(normalizeMediaItem).filter((item) => item.src)
    : (legacyItem.src ? [normalizeMediaItem(legacyItem)] : []);

  return {
    enabled: bool(pick(raw, 'enabled', 'Enabled')) ?? bool(pick(handoverData, 'videoEnabled', 'VideoEnabled')) ?? defaultConfig.backgroundMedia.enabled,
    mode: text(pick(raw, 'mode', 'Mode') ?? pick(handoverData, 'backgroundMode', 'BackgroundMode'), defaultConfig.backgroundMedia.mode),
    audio: text(pick(raw, 'audio', 'Audio', 'audioMode', 'AudioMode') ?? pick(handoverData, 'backgroundAudio', 'BackgroundAudio'), defaultConfig.backgroundMedia.audio),
    shuffle: bool(pick(raw, 'shuffle', 'Shuffle')) ?? false,
    rotateSeconds: Number(pick(raw, 'rotateSeconds', 'RotateSeconds', 'interval', 'Interval')) || defaultConfig.backgroundMedia.rotateSeconds,
    items,
  };
}

function normalizeMusicTrack(track, index = 0) {
  if (typeof track === 'string') {
    return { name: `Track ${index + 1}`, artist: '', cover: '', src: track, type: 'auto' };
  }
  return {
    name: text(pick(track, 'name', 'title', 'label'), `Track ${index + 1}`),
    artist: text(pick(track, 'artist', 'author', 'channel')),
    album: text(pick(track, 'album')),
    cover: text(pick(track, 'cover', 'image', 'artwork', 'thumbnail')),
    src: text(pick(track, 'src', 'source', 'url', 'path')),
    type: text(pick(track, 'type', 'sourceType'), 'auto').toLowerCase(),
  };
}

function normalizeMusicTracks(handoverData) {
  const tracks = pick(handoverData, 'musicTracks', 'MusicTracks', 'songs', 'Songs') || defaultConfig.musicTracks;
  return Array.isArray(tracks)
    ? tracks.map(normalizeMusicTrack).filter((track) => track.src)
    : defaultConfig.musicTracks;
}

export function parseConfig(data) {
  const handoverData = data || {};
  const baseKeys = getDefaultKeys();
  const handoverKeys = handoverData.keys ?? handoverData.Keys ?? {};
  const backgroundMedia = normalizeBackgroundMedia(handoverData);
  const musicTracks = normalizeMusicTracks(handoverData);
  
  // Use PR.lua as single source: PR.keys only. Normalize to { enabled, info }.
  const keys = Object.keys(handoverKeys).length > 0
    ? Object.fromEntries(
        KEYBOARD_KEY_IDS.map((id) => [id, normalizeKeyEntry(handoverKeys[id] ?? baseKeys[id])])
      )
    : baseKeys;
    
  // When handover is empty (e.g. dev / npm run dev), use defaults so staff & social always show
  const hasHandover = handoverData && typeof handoverData === 'object' && (
    handoverData.StaffEnabled !== undefined || 
    handoverData.staffEnabled !== undefined || 
    handoverData.Staff !== undefined || 
    handoverData.staff !== undefined
  );
  
  return {
    ...defaultConfig,
    ...handoverData,
    brandingEnabled: bool(handoverData.brandingEnabled) ?? bool(handoverData.BrandingEnabled) ?? defaultConfig.brandingEnabled,
    videoEnabled: bool(handoverData.videoEnabled) ?? bool(handoverData.VideoEnabled) ?? defaultConfig.videoEnabled,
    musicEnabled: bool(handoverData.musicEnabled) ?? bool(handoverData.MusicEnabled) ?? defaultConfig.musicEnabled,
    tipEnabled: bool(handoverData.tipEnabled) ?? bool(handoverData.TipEnabled) ?? defaultConfig.tipEnabled,
    rulesEnabled: bool(handoverData.rulesEnabled) ?? bool(handoverData.RulesEnabled) ?? defaultConfig.rulesEnabled,
    changelogsEnabled: bool(handoverData.changelogsEnabled) ?? bool(handoverData.ChangelogsEnabled) ?? defaultConfig.changelogsEnabled,
    keybindsEnabled: bool(handoverData.keybindsEnabled) ?? bool(handoverData.KeybindsEnabled) ?? defaultConfig.keybindsEnabled,
    staffEnabled: hasHandover ? (bool(handoverData.staffEnabled) ?? bool(handoverData.StaffEnabled) ?? defaultConfig.staffEnabled) : true,
    staff: handoverData.staff ?? handoverData.Staff ?? defaultConfig.staff,
    staffCarouselEnabled: bool(handoverData.staffCarouselEnabled) ?? bool(handoverData.StaffCarouselEnabled) ?? defaultConfig.staffCarouselEnabled,
    staffCarouselSeconds: Number(handoverData.staffCarouselSeconds ?? handoverData.StaffCarouselSeconds) || defaultConfig.staffCarouselSeconds,
    socialEnabled: hasHandover ? (bool(handoverData.socialEnabled) ?? bool(handoverData.SocialEnabled) ?? defaultConfig.socialEnabled) : true,
    social: handoverData.social ?? handoverData.Social ?? defaultConfig.social,
    backgroundMedia,
    backgroundMode: backgroundMedia.mode,
    backgroundAudio: backgroundMedia.audio,
    videoEnabled: backgroundMedia.enabled,
    videoSource: backgroundMedia.items[0]?.src ?? defaultConfig.videoSource,
    videoType: backgroundMedia.items[0]?.type ?? defaultConfig.videoType,
    videoMuted: bool(backgroundMedia.items[0]?.muted) ?? bool(handoverData.videoMuted) ?? bool(handoverData.VideoMuted) ?? defaultConfig.videoMuted,
    musicTracks,
    musicVolume: Number(handoverData.musicVolume ?? handoverData.MusicVolume) || defaultConfig.musicVolume,
    musicShuffle: bool(handoverData.musicShuffle) ?? bool(handoverData.MusicShuffle) ?? defaultConfig.musicShuffle,
    musicAutoplay: bool(handoverData.musicAutoplay) ?? bool(handoverData.MusicAutoplay) ?? defaultConfig.musicAutoplay,
    musicShowCover: bool(handoverData.musicShowCover) ?? bool(handoverData.MusicShowCover) ?? defaultConfig.musicShowCover,
    musicSourceMode: handoverData.musicSourceMode ?? handoverData.MusicSourceMode ?? defaultConfig.musicSourceMode,
    brand: {
      ...defaultConfig.brand,
      ...(handoverData.brand ?? handoverData.Brand ?? {}),
    },
    uiText: {
      ...defaultConfig.uiText,
      ...(handoverData.uiText ?? handoverData.UiText ?? handoverData.UIText ?? {}),
    },
    featureCards: Array.isArray(handoverData.featureCards ?? handoverData.FeatureCards)
      ? (handoverData.featureCards ?? handoverData.FeatureCards)
      : defaultConfig.featureCards,
    footer: {
      ...defaultConfig.footer,
      ...(handoverData.footer ?? handoverData.Footer ?? {}),
    },
    colors: (() => {
      const raw = handoverData.colors ?? handoverData.Colors ?? {};
      const normalized = {};
      const camelKeys = ['bgDark', 'bgPanel', 'bgCard', 'border', 'accent', 'accentDim', 'accentHover', 'text', 'textMuted', 'success', 'error', 'gradientAccent'];
      camelKeys.forEach((camel) => {
        const val = raw[camel] ?? raw[camel.charAt(0).toUpperCase() + camel.slice(1)];
        if (val != null && val !== '') normalized[camel] = val;
      });
      return { ...defaultConfig.colors, ...normalized };
    })(),
    keys,
  };
}

const handover = typeof window !== 'undefined' && window.nuiHandoverData ? window.nuiHandoverData : {};
export const config = parseConfig(handover);
