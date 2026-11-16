import { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import VideoBackground from './components/VideoBackground';
import MusicWidget from './components/MusicWidget';
import Keyboard from './components/Keyboard';
import SocialIcons from './components/SocialIcons';
import { IconLightning, IconInfo, IconDocument, IconKeyboard, IconPeople, IconShield, IconStar } from './components/Icons';
import { nextPlaybackIndex } from './playback';
import { config, parseConfig, hasInitialConfig, isLoadscreenConfig } from './config';
import { layoutProps } from './layout';
import { editorDraft } from './editorConfig';
import './App.css';
import './layout.css';
import './editor.css';

// Frame identity is explicit. Handover is configuration, not an opening signal.
const PreviewEditor = lazy(() => import('./components/PreviewEditor'));
const isLoadingScreenFrame = typeof document !== 'undefined' && document.documentElement.dataset.forgeLoadscreenFrame === 'connection';
const getNowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function normalizeLanguage(locale) {
  const value = String(locale || 'pt-BR').toLowerCase();
  if (value === 'pt' || value === 'pt-br' || value === 'pt_br') return 'pt-BR';
  if (value === 'en' || value === 'en-us' || value === 'en_us') return 'en-US';
  if (value === 'es' || value === 'es-es' || value === 'es_es') return 'es-ES';
  return 'pt-BR';
}

function normalizeUiConfig(data) {
  const parsed = parseConfig(data);
  return { ...parsed, language: normalizeLanguage(parsed.language) };
}

const initialConfig = normalizeUiConfig(config);

const TRANSLATIONS = {
  'pt-BR': {
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
    rules: 'Regras',
    changelogs: 'Novidades',
    keybinds: 'Teclas',
    staff: 'Equipe',
    serverTeam: 'Equipe do servidor',
    close: 'Fechar',
    noKeybind: 'Nenhuma tecla atribuida',
  },
  'en-US': {
    preparingEntry: 'Preparing entry',
    entryReady: 'Entry ready',
    loadingComplete: 'Loading complete',
    almostThere: 'Almost there...',
    loadingResources: 'Loading server resources...',
    initializing: 'Initializing FiveM...',
    initializingServer: 'Initializing server',
    synchronizing: 'Synchronizing session...',
    detectingResources: 'detecting resources',
    resources: 'resources',
    remaining: 'remaining',
    rules: 'Rules',
    changelogs: 'Changelogs',
    keybinds: 'Keybinds',
    staff: 'Staff',
    serverTeam: 'Server team',
    close: 'Close',
    noKeybind: 'No keybind assigned',
  },
  'es-ES': {
    preparingEntry: 'Preparando entrada',
    entryReady: 'Entrada liberada',
    loadingComplete: 'Carga completada',
    almostThere: 'Casi listo...',
    loadingResources: 'Cargando recursos del servidor...',
    initializing: 'Inicializando servidor...',
    initializingServer: 'Inicializando servidor',
    synchronizing: 'Sincronizando sesion...',
    detectingResources: 'detectando recursos',
    resources: 'recursos',
    remaining: 'restantes',
    rules: 'Reglas',
    changelogs: 'Novedades',
    keybinds: 'Teclas',
    staff: 'Equipo',
    serverTeam: 'Equipo del servidor',
    close: 'Cerrar',
    noKeybind: 'Ninguna tecla asignada',
  },
};

function ModalHeader({ title, closeLabel, onClose }) {
  return (
    <div className="modal-panel__header">
      <h2 className="modal-panel__title">{title}</h2>
      <button type="button" className="modal-panel__close" onClick={onClose} aria-label={closeLabel}>×</button>
    </div>
  );
}

function LayoutElement({ as: Tag = 'div', id, className, layout, elements, children, ...attributes }) {
  return (
    <>
      {layout[id] && elements[id]?.visible !== false && <Tag {...attributes} className={className + ' layout-placeholder'} aria-hidden="true">{children}</Tag>}
      <Tag {...attributes} className={className} {...layoutProps(id, layout, elements)}>{children}</Tag>
    </>
  );
}

function App() {
  const [runtimeConfig, setPR] = useState(initialConfig);
  const [configurationReady, setConfigurationReady] = useState(hasInitialConfig);
  const [loadFraction, setLoadFraction] = useState(0);
  const [statusText, setStatusText] = useState('Initializing FiveM...');
  const [resourceCount, setResourceCount] = useState(0);
  const [showKeybinds, setShowKeybinds] = useState(false);
  const [keybindDialog, setKeybindDialog] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [showChangelogs, setShowChangelogs] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [staffIndex, setStaffIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [previewVideoIndex, setPreviewVideoIndex] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [visible, setVisible] = useState(isLoadingScreenFrame);
  const [isPreview, setIsPreview] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [previewSettings, setPreviewSettings] = useState(null);
  const [unsavedOnOpen, setUnsavedOnOpen] = useState(false);
  const PR = useMemo(() => previewSettings ? normalizeUiConfig({
    ...previewSettings,
    backgroundMedia: { ...previewSettings.backgroundMedia, enabled: previewSettings.VideoEnabled },
  }) : runtimeConfig, [previewSettings, runtimeConfig]);
  const [layoutScene, setLayoutScene] = useState('');
  const editingRef = useRef(false);
  const modalFocusRef = useRef({});
  const previousModalRef = useRef(null);
  const [ytVolume, setYtVolume] = useState(initialConfig.musicVolume ?? 0.6);
  const mediaVolume = previewSettings?.musicVolume ?? ytVolume;
  const [minimumDurationPhase, setMinimumDurationPhase] = useState(false);
  const [minimumRemainingSeconds, setMinimumRemainingSeconds] = useState(0);
  const minimumDurationPhaseRef = useRef(false);
  const minimumTimerRef = useRef(null);
  const PRRef = useRef(initialConfig);
  const runtimeConfigReceivedRef = useRef(hasInitialConfig);
  const editableTextRef = useRef(null);
  const loadingStartedAtRef = useRef(getNowMs() - Number(initialConfig.loadingElapsedMs || 0));

  useEffect(() => {
    console.info(`[forge-loadscreen] Interface montada: ${isLoadingScreenFrame ? 'conexao' : 'previa'}.`);
    if (isLoadingScreenFrame && runtimeConfigReceivedRef.current) {
      console.info('[forge-loadscreen] Configuracao inicial validada antes da exibicao.');
    }
    if (!isLoadingScreenFrame || runtimeConfigReceivedRef.current) return undefined;

    // The same persisted public JSON is available before Lua callbacks start.
    // Do not let a slow file response overwrite a newer server configuration.
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch(new URL('../../config.json', window.location.href), { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((saved) => {
        if (!active || runtimeConfigReceivedRef.current) return;
        if (!isLoadscreenConfig(saved)) throw new Error('configuracao de loadscreen incompleta');
        const localConfig = normalizeUiConfig(saved);
        PRRef.current = localConfig;
        setPR(localConfig);
        setConfigurationReady(true);
        console.info('[forge-loadscreen] JSON local aplicado antes da exibicao do conteudo.');
      })
      .catch((error) => {
        if (active) console.warn(`[forge-loadscreen] JSON local indisponivel; aguardando configuracao do servidor: ${error.message}`);
      })
      .finally(() => clearTimeout(timeout));

    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  useEffect(() => {
    PRRef.current = PR;
    setYtVolume(PR.musicVolume ?? 0.6);
  }, [PR.musicVolume]);

  useEffect(() => {
    PRRef.current = PR;
  }, [PR]);

  const clearMinimumTimer = () => {
    if (minimumTimerRef.current) {
      clearInterval(minimumTimerRef.current);
      minimumTimerRef.current = null;
    }
  };

  const startMinimumDurationPhase = (remainingMs) => {
    clearMinimumTimer();

    const totalMs = Math.max(remainingMs, 1);
    const phaseStartedAt = getNowMs();

    minimumDurationPhaseRef.current = true;
    setMinimumDurationPhase(true);
    setLoadFraction(0);

    const update = () => {
      const elapsedMs = getNowMs() - phaseStartedAt;
      const nextRemainingMs = Math.max(totalMs - elapsedMs, 0);
      const nextProgress = Math.min(1, Math.max(0, elapsedMs / totalMs));
      const nextSeconds = Math.ceil(nextRemainingMs / 1000);

      setMinimumRemainingSeconds(nextSeconds);
      setLoadFraction(nextProgress);
      const labels = editableTextRef.current || editableText;
      setStatusText(nextSeconds > 0 ? `${labels.preparingEntry}... ${nextSeconds}s` : labels.entryReady);

      if (nextRemainingMs <= 0) {
        clearMinimumTimer();
      }
    };

    update();
    minimumTimerRef.current = setInterval(update, 250);
  };

  useEffect(() => clearMinimumTimer, []);

  const backgroundItems = useMemo(() => {
    const items = PR.backgroundMedia?.items?.length
      ? PR.backgroundMedia.items
      : [{ src: PR.videoSource, type: PR.videoType, muted: PR.videoMuted, duration: 42 }];
    const available = items.filter((item) => item?.src && item.src.trim() !== '');
    return PR.backgroundMedia?.mode === 'single' ? available.slice(0, 1) : available;
  }, [PR.backgroundMedia, PR.videoSource, PR.videoType, PR.videoMuted]);
  const currentMedia = (previewSettings && previewVideoIndex !== null && PR.backgroundMedia.items[previewVideoIndex])
    || backgroundItems[mediaIndex] || backgroundItems[0] || null;
  const backgroundAudioMode = String(PR.backgroundMedia?.audio || PR.backgroundAudio || 'separate').toLowerCase();
  const hasValidMusic = backgroundAudioMode === 'separate' && PR.musicEnabled !== false && PR.musicTracks && PR.musicTracks.some(t => t.src && t.src.trim() !== '');
  const useVideoAudio = backgroundAudioMode === 'video' || backgroundAudioMode === 'native';
  const isVideoVolumeOnly = PR.videoEnabled !== false && currentMedia && !hasValidMusic && useVideoAudio;
  const showMusicWidget = hasValidMusic || isVideoVolumeOnly;
  const shouldMuteVideo = !useVideoAudio || PR.videoMuted || currentMedia?.muted === true || hasValidMusic;
  const staffList = useMemo(() => (PR.staff || []).map((entry) => {
    if (typeof entry === 'string') return { name: entry, role: '', photo: '' };
    return {
      name: entry.name || entry.role || '',
      role: entry.role || '',
      photo: entry.photo || '',
    };
  }).filter((entry) => entry.name || entry.photo), [PR.staff]);
  const currentStaffIndex = Math.min(staffIndex, Math.max(0, staffList.length - 1));
  const currentStaff = staffList[currentStaffIndex];
  const { layout, elements } = PR;
  const blockVisible = (id) => elements[id]?.visible !== false;
  const textVisible = (id) => PR.textVisibility[id] !== false;
  const separated = ['status','shortcuts','tip'].some((id) =>
    layout[id] || elements[id]?.backgroundEnabled !== undefined || elements[id]?.borderEnabled !== undefined
    || elements[id]?.glassEnabled === true);
  const closeModal = (id) => {
    if (id === 'keyDetail' || id === 'keys') setKeybindDialog(null);
    if (id === 'rules') setShowRules(false);
    if (id === 'news') setShowChangelogs(false);
    if (id === 'keys') setShowKeybinds(false);
    if (id === 'team') setShowStaff(false);
    setLayoutScene((selected) => selected === id ? '' : selected);
  };
  const activeModal = keybindDialog ? 'keyDetail'
    : showKeybinds ? 'keys' : showRules ? 'rules' : showChangelogs ? 'news' : showStaff ? 'team' : null;
  const serverResourceTotal = Number(PR.serverResourceCount || PR.resourceTotal || 0);
  const displayedResourceCount = serverResourceTotal > 0
    ? Math.min(serverResourceTotal, Math.round(loadFraction * serverResourceTotal))
    : resourceCount;
  const text = TRANSLATIONS[normalizeLanguage(PR.language)] || TRANSLATIONS['pt-BR'];
  const editableText = {
    ...text,
    rules: PR.uiText?.rulesLabel || text.rules,
    changelogs: PR.uiText?.changelogsLabel || text.changelogs,
    keybinds: PR.uiText?.keybindsLabel || text.keybinds,
    staff: PR.uiText?.staffLabel || text.staff,
    serverTeam: PR.uiText?.serverTeamLabel || text.serverTeam,
    preparingEntry: PR.uiText?.preparingEntry || text.preparingEntry,
    entryReady: PR.uiText?.entryReady || text.entryReady,
    loadingComplete: PR.uiText?.loadingComplete || text.loadingComplete,
    almostThere: PR.uiText?.almostThere || text.almostThere,
    loadingResources: PR.uiText?.loadingResources || text.loadingResources,
    initializing: PR.uiText?.initializing || text.initializing,
    initializingServer: PR.uiText?.initializingServer || text.initializingServer,
    synchronizing: PR.uiText?.synchronizing || text.synchronizing,
    detectingResources: PR.uiText?.detectingResources || text.detectingResources,
    resources: PR.uiText?.resources || text.resources,
    remaining: PR.uiText?.remaining || text.remaining,
    noKeybind: PR.uiText?.noKeybind || text.noKeybind,
    hideUiLabel: PR.uiText?.hideUiLabel || 'Esconder UI',
    showUiLabel: PR.uiText?.showUiLabel || 'Mostrar UI',
  };
  const labelAliases = { rulesLabel: 'rules', changelogsLabel: 'changelogs', keybindsLabel: 'keybinds',
    staffLabel: 'staff', serverTeamLabel: 'serverTeam' };
  for (const id of Object.keys(PR.textVisibility)) {
    const label = labelAliases[id] || id;
    if (Object.hasOwn(editableText, label)) editableText[label] = '';
  }
  const featureCards = Array.isArray(PR.featureCards) && PR.featureCards.length
    ? PR.featureCards.slice(0, 3)
    : [];
  const featureIcons = [IconPeople, IconInfo, IconLightning];
  const namedFeatureIcons = { people: IconPeople, shield: IconShield, star: IconStar, info: IconInfo,
    lightning: IconLightning, document: IconDocument, keyboard: IconKeyboard };
  const tipLabel = textVisible('tipLabel') ? PR.uiText?.tipLabel || 'DICA' : '';
  const footerText = PR.footer?.text || 'DESENVOLVIDO COM AMOR POR EQUIPE forge STUDIOS';

  useEffect(() => {
    editableTextRef.current = editableText;
  }, [editableText]);

  const activeColors = previewSettings?.colors ?? PR.colors;

  // Apply theme colours from config to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = activeColors;
    root.style.setProperty('--stage-text', colors.text);
    root.style.setProperty('--stage-accent', colors.accent);
    const map = {
      bgDark: '--bg-dark',
      bgPanel: '--bg-panel',
      bgCard: '--bg-card',
      border: '--border',
      accent: '--accent',
      accentDim: '--accent-dim',
      accentHover: '--accent-hover',
      text: '--text',
      textMuted: '--text-muted',
      success: '--success',
      error: '--error',
      gradientAccent: '--gradient-accent',
    };
    Object.entries(map).forEach(([key, cssVar]) => {
      if (colors[key] != null && colors[key] !== '') {
        root.style.setProperty(cssVar, colors[key]);
      }
    });
  }, [activeColors]);

  useEffect(() => {
    if (mediaIndex >= backgroundItems.length) setMediaIndex(0);
    if (backgroundItems.length <= 1) return undefined;
    const seconds = Number(currentMedia?.duration || PR.backgroundMedia?.rotateSeconds || 42);
    const timer = setTimeout(() => {
      setMediaIndex((index) => nextPlaybackIndex(index, backgroundItems.length, PR.backgroundMedia?.shuffle === true));
    }, Math.max(seconds, 8) * 1000);
    return () => clearTimeout(timer);
  }, [backgroundItems.length, mediaIndex, currentMedia?.src, currentMedia?.duration, PR.backgroundMedia?.rotateSeconds, PR.backgroundMedia?.shuffle]);

  useEffect(() => { setLogoError(false); }, [PR.brand?.logo]);

  useEffect(() => {
    if (showStaff || PR.staffEnabled === false || PR.staffCarouselEnabled === false || staffList.length <= 1) return undefined;
    const seconds = Math.max(Number(PR.staffCarouselSeconds || 6), 3);
    const timer = setInterval(() => {
      setStaffIndex((index) => (index + 1) % staffList.length);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [showStaff, PR.staffEnabled, PR.staffCarouselEnabled, PR.staffCarouselSeconds, staffList.length]);

  useEffect(() => {
    const onMessage = (event) => {
      const data = typeof event.data === 'string'
        ? (() => {
            try {
              return JSON.parse(event.data);
            } catch {
              return {};
            }
          })()
        : (event.data || {});
      const {
        eventName,
        loadFraction: fraction,
        action,
        isPreview: previewMode,
        editLayout,
        unsaved,
        config: newConfig,
        remainingSeconds,
        waitProgress,
      } = data;
      
      if (action === 'show') {
        setVisible(true);
        setUiHidden(false);
        setShowRules(false);
        setShowChangelogs(false);
        setShowKeybinds(false);
        setShowStaff(false);
        setKeybindDialog(null);
        setLayoutScene('');
        setStaffIndex(0);
        editingRef.current = previewMode === true && editLayout === true && !isLoadingScreenFrame;
        setUnsavedOnOpen(unsaved === true);
        setPreviewSettings(null);
        clearMinimumTimer();
        minimumDurationPhaseRef.current = false;
        setMinimumDurationPhase(false);
        setMinimumRemainingSeconds(0);
        if (previewMode !== undefined) setIsPreview(previewMode);
        if (isLoadscreenConfig(newConfig)) {
          runtimeConfigReceivedRef.current = true;
          setConfigurationReady(true);
          const nextConfig = normalizeUiConfig(newConfig);
          PRRef.current = nextConfig;
          setPR(nextConfig);
          if (editingRef.current) setPreviewSettings(editorDraft(newConfig));
          setYtVolume(nextConfig.musicVolume);
          setMediaIndex(0);
          setPreviewVideoIndex(null);
        }
      } else if (action === 'hide') {
        setVisible(false);
        setIsPreview(false);
        editingRef.current = false;
        setPreviewSettings(null);
        clearMinimumTimer();
        minimumDurationPhaseRef.current = false;
        setMinimumDurationPhase(false);
        setMinimumRemainingSeconds(0);
      } else if (action === 'updateConfig') {
        if (!editingRef.current && isLoadscreenConfig(newConfig)) {
          runtimeConfigReceivedRef.current = true;
          setConfigurationReady(true);
          const nextConfig = normalizeUiConfig(newConfig);
          PRRef.current = nextConfig;
          setPR(nextConfig);
        }
      } else if (action === 'minimumDurationWait') {
        if (!isLoadingScreenFrame) return;
        const progress = typeof waitProgress === 'number' ? Math.min(1, Math.max(0, waitProgress)) : 0;
        const seconds = typeof remainingSeconds === 'number' ? Math.max(0, Math.ceil(remainingSeconds)) : 0;
        setVisible(true);
        minimumDurationPhaseRef.current = true;
        setMinimumDurationPhase(true);
        setMinimumRemainingSeconds(seconds);
        setLoadFraction(progress);
        const labels = editableTextRef.current || editableText;
        setStatusText(seconds > 0 ? `${labels.preparingEntry}... ${seconds}s` : labels.entryReady);
      }

      if (eventName === 'loadProgress' && typeof fraction === 'number') {
        if (!isLoadingScreenFrame) return;
        if (minimumDurationPhaseRef.current) return;

        if (fraction >= 1 && isLoadingScreenFrame) {
          const currentConfig = PRRef.current || {};
          const minimumSeconds = Number(
            currentConfig.minimumLoadscreenSeconds ??
            currentConfig.MinimumLoadscreenSeconds ??
            0
          );
          const elapsedMs = getNowMs() - loadingStartedAtRef.current;
          const remainingMs = (minimumSeconds * 1000) - elapsedMs;

          if (remainingMs > 250) {
            startMinimumDurationPhase(remainingMs);
            return;
          }
        }

        clearMinimumTimer();
        minimumDurationPhaseRef.current = false;
        setMinimumDurationPhase(false);
        setMinimumRemainingSeconds(0);
        setLoadFraction(fraction);
        if (fraction >= 1) setStatusText(editableText.loadingComplete);
        else if (fraction > 0.7) setStatusText(editableText.almostThere);
        else if (fraction > 0.3) setStatusText(editableText.loadingResources);
        else setStatusText(editableText.initializing);
      }
      if (eventName === 'startDataFileEntries') {
        setResourceCount(0);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleClosePreview = async (settings) => {
    const resourceName = typeof window.GetParentResourceName === 'function' ? window.GetParentResourceName() : 'forge-loadscreen';
    const callback = settings ? 'applyPreviewLayout' : 'closePreview';
    const response = await fetch(`https://${resourceName}/${callback}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(settings || {}),
    });
    if (!response.ok || (settings && !(await response.json()).ok)) throw new Error(callback);
  };
  const closePreview = () => handleClosePreview().catch((error) => console.error('Erro ao fechar prévia', error));

  const saveVisualConfig = async (settings) => {
    const resource = typeof window.GetParentResourceName === 'function' ? window.GetParentResourceName() : 'forge-loadscreen';
    const response = await fetch('https://' + resource + '/savePreviewConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(settings),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'save_failed');
    const published = editorDraft(result.config);
    setPreviewSettings((current) => current === settings ? published : current);
    return published;
  };

  const selectLayoutScene = (id) => {
    setLayoutScene(id);
    setUiHidden(false);
    setShowRules(id === 'rules');
    setShowChangelogs(id === 'news');
    setShowKeybinds(id === 'keys' || id === 'keyDetail');
    setShowStaff(id === 'team');
    const key = id === 'keyDetail'
      ? Object.entries(PR.keys).find(([, entry]) => entry.enabled) || ['F1', {}] : null;
    setKeybindDialog(key && { id: key[0], info: key[1].info });
  };

  const toggleUiHidden = () => {
    setUiHidden((hidden) => {
      const nextHidden = !hidden;
      if (nextHidden) {
        setShowRules(false);
        setShowChangelogs(false);
        setShowKeybinds(false);
        setShowStaff(false);
        setKeybindDialog(null);
      }
      return nextHidden;
    });
  };

  useEffect(() => {
    if (!visible || previewSettings) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Tab' && activeModal) {
        const panel = document.querySelector('[data-layout="' + activeModal + '"]');
        const controls = [...(panel?.querySelectorAll('button:not(:disabled), [tabindex="0"]') || [])];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) return;
        if (!panel.contains(document.activeElement) || document.activeElement === (event.shiftKey ? first : last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
        return;
      }
      if (event.key !== 'Escape' || event.repeat) return;
      if (activeModal) closeModal(activeModal);
      else if (isPreview) closePreview();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, isPreview, activeModal, Boolean(previewSettings)]);

  useLayoutEffect(() => {
    const previous = previousModalRef.current;
    previousModalRef.current = visible ? activeModal : null;
    if (!visible || previewSettings) return;
    if ((!activeModal && previous) || (previous === 'keyDetail' && activeModal === 'keys')) {
      modalFocusRef.current[previous]?.focus();
      return;
    }
    if (!activeModal) return;
    const panel = document.querySelector(`[data-layout="${activeModal}"]`);
    panel?.querySelector('.modal-panel__close')?.focus();
  }, [visible, activeModal, Boolean(previewSettings)]);

  const openExternalUrl = (url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) return;
    if (typeof window.invokeNative === 'function') {
      window.invokeNative('openUrl', url);
    } else {
      window.open(url, '_blank');
    }
  };

  const openLink = (url) => {
    if (url && url !== '#') openExternalUrl(url);
  };

  const handleKeybindsClick = () => {
    if (PR.links.keybinds && PR.links.keybinds !== '#') {
      openExternalUrl(PR.links.keybinds);
    } else {
      setShowKeybinds(true);
    }
  };

  const handleRulesClick = () => {
    if (PR.links.rules && PR.links.rules !== '#') {
      openExternalUrl(PR.links.rules);
    } else {
      setShowRules(true);
    }
  };

  const handleChangelogsClick = () => {
    if (PR.links.changelogs && PR.links.changelogs !== '#') {
      openExternalUrl(PR.links.changelogs);
    } else {
      setShowChangelogs(true);
    }
  };

  if (!visible) return null;

  // Never flash the development/default preset while the real JSON is pending.
  // Progress and configuration listeners stay mounted so server delivery can recover.
  if (isLoadingScreenFrame && !configurationReady) {
    return (
      <div className="app" role="status" data-config-pending="true"
        style={{ display: 'grid', placeItems: 'center', background: '#080808', color: '#fff' }}>
        <p>Carregando configuração do servidor…</p>
      </div>
    );
  }

  return (
    <div className={`app${uiHidden ? ' app--ui-hidden' : ''}${previewSettings ? ' app--layout-editing' : ''}`}>
      {isPreview && (
        <button
          onClick={closePreview}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: previewSettings ? 100003 : 99999,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.95)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.85)'}
        >
          Fechar Pré-visualização
        </button>
      )}
      {PR.videoEnabled !== false && currentMedia && (
        <VideoBackground
          key={`${mediaIndex}-${currentMedia.src}`}
          source={currentMedia.src}
          type={currentMedia.type}
          muted={shouldMuteVideo}
          volume={mediaVolume}
          className="app__video"
        />
      )}
      <div className="colour-overlay" aria-hidden />

      <header className="header">
        {PR.brandingEnabled !== false && (
          <div className="header__branding" {...layoutProps("branding", layout, elements)}>
            {textVisible('logoUrl') && (PR.brand?.logo && !logoError
              ? <img src={PR.brand.logo} alt="Logo" className="header__brand-logo" onError={() => setLogoError(true)} />
              : <span className="header__brand-logo" style={{ display: 'grid', placeItems: 'center', fontSize: '2rem', fontWeight: 700 }}>{PR.brand?.mark || ''}</span>)}
            <div>
              {textVisible('brand_title') && <span className="header__branding-server">{PR.brand?.title || 'FiveM'}</span>}
              {textVisible('brand_subtitle') && <span className="header__branding-community">{PR.brand?.subtitle || 'Powered by CitizenFX'}</span>}
            </div>
          </div>
        )}
      </header>

      <div className="header-right" {...layoutProps("socials", layout, elements)}>
        {PR.socialEnabled !== false && (
          <SocialIcons social={PR.social || {}} />
        )}
        <button
          type="button"
          className="ui-toggle"
          onClick={toggleUiHidden}
        >
          {uiHidden ? editableText.showUiLabel : editableText.hideUiLabel}
        </button>
      </div>

      <main className="main">
        <section className="hero">
          <LayoutElement id="intro" layout={layout} elements={elements} className="hero__eyebrow">
            <span />
            {PR.communityName || 'forge Box'}
            <span />
          </LayoutElement>
          <LayoutElement as="h1" id="title" layout={layout} elements={elements} className="hero__title">{PR.serverName || 'ロックスター'}</LayoutElement>
          <LayoutElement id="tagline" layout={layout} elements={elements} className="hero__subtitle">
            <span />
            {PR.slogan || 'Bem-vindo ao servidor'}
            <span />
          </LayoutElement>
        </section>

        <div className="main__bottom">
          {featureCards.length > 0 && (
            <LayoutElement as="section" className="feature-strip" aria-label="Destaques" id="features" layout={layout} elements={elements}>
              {featureCards.map((card, index) => {
                const FeatureIcon = namedFeatureIcons[card.icon] || featureIcons[index] || IconLightning;
                return (
                  <div className="feature-strip__item" key={`${card.title || 'card'}-${index}`}>
                    <FeatureIcon className="feature-strip__icon" size={28} />
                    <div>
                      <strong>{card.title}</strong>
                      <span>{card.description}</span>
                    </div>
                  </div>
                );
              })}
            </LayoutElement>
          )}

          <div className={separated ? 'panel panel--separated' : 'panel'}>
            <LayoutElement className="loading-section" id="status" layout={layout} elements={elements}>
              <div className="loading-section__row">
                <span className="loading-section__label">
                  <IconLightning className="loading-section__icon" size={18} />
                  {minimumDurationPhase ? editableText.preparingEntry : editableText.initializingServer} {Math.round(loadFraction * 100)}%
                </span>
              </div>
              <p className="loading-section__status">{statusText}</p>
              <p className="loading-section__resources">
                {minimumDurationPhase ? editableText.synchronizing : editableText.loadingResources}
                <span className="loading-section__count">
                  {minimumDurationPhase
                    ? `${minimumRemainingSeconds}s ${editableText.remaining}`
                    : serverResourceTotal > 0
                      ? `${displayedResourceCount}/${serverResourceTotal} ${editableText.resources}`
                      : editableText.detectingResources}
                </span>
              </p>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${loadFraction * 100}%` }} />
              </div>
            </LayoutElement>

            {PR.tipEnabled !== false && (
              <LayoutElement as="p" className="tip" data-label={tipLabel} id="tip" layout={layout} elements={elements}>{PR.tip}</LayoutElement>
            )}

            <LayoutElement as="nav" className="panel-nav" id="shortcuts" layout={layout} elements={elements}>
              {PR.rulesEnabled !== false && blockVisible('rules') && (
                <button type="button" className="nav__btn" onClick={(event) => { modalFocusRef.current.rules = event.currentTarget; handleRulesClick(); }}>
                  <IconInfo className="nav__btn-icon" size={18} />
                  {editableText.rules}
                </button>
              )}
              {PR.changelogsEnabled !== false && blockVisible('news') && (
                <button type="button" className="nav__btn" onClick={(event) => { modalFocusRef.current.news = event.currentTarget; handleChangelogsClick(); }}>
                  <IconDocument className="nav__btn-icon" size={18} />
                  {editableText.changelogs}
                </button>
              )}
              {PR.keybindsEnabled !== false && blockVisible('keys') && (
                <button type="button" className="nav__btn" onClick={(event) => { modalFocusRef.current.keys = event.currentTarget; handleKeybindsClick(); }}>
                  <IconKeyboard className="nav__btn-icon" size={18} />
                  {editableText.keybinds}
                </button>
              )}
            </LayoutElement>
          </div>
        </div>
      </main>

      <div className="screen-footer" {...layoutProps("footer", layout, elements)}>{footerText}</div>
      {PR.staffEnabled !== false && staffList.length > 0 && (
        <button type="button" className="staff-strip" aria-label={editableText.staff}
          aria-haspopup={blockVisible('team') ? 'dialog' : undefined} aria-disabled={!blockVisible('team')} {...layoutProps("teamCard", layout, elements)} onClick={(event) => {
            if (!blockVisible('team')) return;
            modalFocusRef.current.team = event.currentTarget;
            setStaffIndex(currentStaffIndex);
            setShowStaff(true);
          }}>
          <span className="staff-strip__label">{editableText.staff}</span>
          <span className="staff-strip__viewport">
            <span key={currentStaffIndex} className="staff-strip__slide">
              <span className="staff-strip__photo">
                {currentStaff.photo ? (
                  <img src={currentStaff.photo} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(currentStaff.name || '?').slice(0, 2).toUpperCase()}</span>
                )}
              </span>
              <span className="staff-strip__text">
                <strong>{currentStaff.name || editableText.staff}</strong>
                <span>{currentStaff.role || editableText.serverTeam}</span>
              </span>
            </span>
          </span>
        </button>
      )}

      {showMusicWidget && (
        <aside className="music-widget-wrap" {...layoutProps("audio", layout, elements)}>
          <MusicWidget
            tracks={hasValidMusic ? PR.musicTracks : []}
            volume={mediaVolume}
            isYtVolumeOnly={isVideoVolumeOnly}
            autoplay={PR.musicAutoplay !== false}
            shuffle={PR.musicShuffle === true}
            playbackMode={PR.musicSourceMode}
            showCover={PR.musicShowCover !== false}
            videoVolumeLabel={textVisible('videoVolumeLabel') ? PR.uiText?.videoVolumeLabel : ''}
            onVolumeChange={(vol) => {
              if (previewSettings) setPreviewSettings((current) => current && { ...current, musicVolume: vol });
              else setYtVolume(vol);
            }}
          />
        </aside>
      )}

      {PR.rulesEnabled !== false && blockVisible('rules') && showRules && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal('rules')}
        >
          <div className="modal-panel" role="dialog" aria-modal={activeModal === "rules"}
            aria-label={editableText.rules} {...layoutProps("rules", layout, elements)}>
            <ModalHeader title={editableText.rules} closeLabel={editableText.close} onClose={() => closeModal('rules')} />
            <ul className="modal-list">
              {(PR.rules || []).map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {PR.changelogsEnabled !== false && blockVisible('news') && showChangelogs && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal('news')}
        >
          <div className="modal-panel" role="dialog" aria-modal={activeModal === "news"}
            aria-label={editableText.changelogs} {...layoutProps("news", layout, elements)}>
            <ModalHeader title={editableText.changelogs} closeLabel={editableText.close} onClose={() => closeModal('news')} />
            <div className="changelogs-list">
              {(PR.changelogs || []).map((entry, i) => (
                <div key={i} className="changelogs-entry">
                  <div className="changelogs-entry__head">
                    <span className="changelogs-entry__version">{entry.version}</span>
                    <span className="changelogs-entry__date">{entry.date}</span>
                  </div>
                  <ul className="changelogs-entry__items">
                    {(entry.items || []).map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {PR.keybindsEnabled !== false && blockVisible('keys') && showKeybinds && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal('keys')}
        >
          <div className="keybinds-panel modal-panel" role="dialog" aria-modal={activeModal === "keys"}
            aria-label={editableText.keybinds} {...layoutProps("keys", layout, elements)}>
            <ModalHeader title={editableText.keybinds} closeLabel={editableText.close} onClose={() => closeModal('keys')} />
            <div className="keyboard-scroller" tabIndex={0} aria-label={editableText.keybinds}>
              <Keyboard keys={PR.keys} onKeyClick={(id, info) => {
                if (!blockVisible('keyDetail')) return;
                modalFocusRef.current.keyDetail = document.activeElement;
                setKeybindDialog({ id, info });
              }} />
            </div>
            {PR.keybinds && PR.keybinds.length > 0 && (
              <div className="keybinds-list-wrap">
                <ul className="keybinds-list">
                  {PR.keybinds.map((bind, i) => (
                    <li key={i} className="keybinds-list__item">
                      <div>
                        <kbd className="keybinds-list__key">{bind.key}</kbd>
                      </div>
                      <div>
                        <span className="keybinds-list__action">{bind.action}</span>
                        {bind.description && (
                          <p className="keybinds-list__desc">{bind.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {PR.keybindsEnabled !== false && blockVisible('keys') && blockVisible('keyDetail') && showKeybinds && keybindDialog && (
        <div className="keybind-dialog-overlay" onClick={(event) => {
          if (event.target === event.currentTarget) closeModal('keyDetail');
        }}>
          <div className="keybind-dialog modal-panel" role="dialog" aria-modal="true"
            aria-label={keybindDialog.id} {...layoutProps("keyDetail", layout, elements)}>
            <ModalHeader title={keybindDialog.id} closeLabel={editableText.close} onClose={() => closeModal('keyDetail')} />
            <p className="keybind-dialog__desc">{(previewSettings ? PR.keys[keybindDialog.id]?.info : keybindDialog.info) || editableText.noKeybind}</p>
          </div>
        </div>
      )}

      {PR.staffEnabled !== false && blockVisible('team') && showStaff && (() => {
        const hasMultiple = staffList.length > 1;
        return (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal('team')}>
            <div className="modal-panel staff-modal" role="dialog" aria-modal="true"
              aria-label={editableText.staff} {...layoutProps("team", layout, elements)}>
              <ModalHeader title={editableText.staff} closeLabel={editableText.close} onClose={() => closeModal('team')} />
              <div className="staff-slider">
                <div
                  className="staff-slider__track"
                  style={{ transform: `translateX(-${currentStaffIndex * 100}%)` }}
                >
                  {staffList.map((entry, i) => (
                    <div key={i} className="staff-slider__slide">
                      <div className="staff-card">
                        <div className="staff-card__photo-wrap">
                          {entry.photo && entry.photo.trim() ? (
                            <img
                              src={entry.photo}
                              alt=""
                              className="staff-card__photo"
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.add('staff-card__placeholder--show'); }}
                            />
                          ) : null}
                          <div className={`staff-card__placeholder ${!(entry.photo && entry.photo.trim()) ? 'staff-card__placeholder--show' : ''}`}>
                            <span className="staff-card__placeholder-text">
                              {(entry.name || '?').trim().slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <h3 className="staff-card__name">{entry.name || '-'}</h3>
                        {entry.role ? <p className="staff-card__role">{entry.role}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMultiple && (
                  <>
                    <button
                      type="button"
                      className="staff-slider__btn staff-slider__btn--prev"
                      onClick={() => setStaffIndex((i) => Math.max(0, i - 1))}
                      aria-label="Previous staff"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="staff-slider__btn staff-slider__btn--next"
                      onClick={() => setStaffIndex((i) => Math.min(staffList.length - 1, i + 1))}
                      aria-label="Next staff"
                    >
                      ›
                    </button>
                    <div className="staff-slider__dots">
                      {staffList.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`staff-slider__dot ${i === currentStaffIndex ? 'staff-slider__dot--active' : ''}`}
                          onClick={() => setStaffIndex(i)}
                          aria-label={`Go to staff ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {previewSettings && (
        <Suspense fallback={null}>
          <PreviewEditor settings={previewSettings} unsavedOnOpen={unsavedOnOpen} scene={layoutScene} onScene={selectLayoutScene} onCancel={closePreview}
            onChange={(patch) => setPreviewSettings((current) => ({ ...current, ...patch }))}
            onApply={saveVisualConfig}
            onPreviewVideo={setPreviewVideoIndex}
            onPreviewStaff={(index) => { selectLayoutScene('team'); setStaffIndex(index); }}
            onPreviewKey={(id) => { selectLayoutScene('keyDetail'); setKeybindDialog({ id }); }} />
        </Suspense>
      )}
    </div>
  );
}

export default App;
