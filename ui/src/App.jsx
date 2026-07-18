import { useState, useEffect, useRef, useMemo } from 'react';
import VideoBackground from './components/VideoBackground';
import MusicWidget from './components/MusicWidget';
import Keyboard from './components/Keyboard';
import SocialIcons from './components/SocialIcons';
import { IconLightning, IconInfo, IconDocument, IconKeyboard, IconPeople } from './components/Icons';
import { config, parseConfig } from './config';
import './App.css';

const isLoadingScreenFrame = typeof window !== 'undefined' && !!window.nuiHandoverData;
const getNowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function normalizeLanguage(locale) {
  const value = String(locale || 'pt-BR').toLowerCase();
  if (value === 'pt' || value === 'pt-br' || value === 'pt_br') return 'pt-BR';
  if (value === 'en' || value === 'en-us' || value === 'en_us') return 'en-US';
  if (value === 'es' || value === 'es-es' || value === 'es_es') return 'es-ES';
  return 'pt-BR';
}

const initialConfig = parseConfig({ ...config, language: normalizeLanguage(config.language) });

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
    back: 'Voltar',
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
    back: 'Back',
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
    back: 'Volver',
    noKeybind: 'Ninguna tecla asignada',
  },
};

function App() {
  const [PR, setPR] = useState(initialConfig);
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
  const [logoError, setLogoError] = useState(false);
  const [visible, setVisible] = useState(isLoadingScreenFrame);
  const [isPreview, setIsPreview] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [ytVolume, setYtVolume] = useState(initialConfig.musicVolume || 0.6);
  const [minimumDurationPhase, setMinimumDurationPhase] = useState(false);
  const [minimumRemainingSeconds, setMinimumRemainingSeconds] = useState(0);
  const minimumDurationPhaseRef = useRef(false);
  const minimumTimerRef = useRef(null);
  const PRRef = useRef(initialConfig);
  const editableTextRef = useRef(null);
  const loadingStartedAtRef = useRef(getNowMs() - Number(initialConfig.loadingElapsedMs || 0));

  useEffect(() => {
    PRRef.current = PR;
    setYtVolume(PR.musicVolume || 0.6);
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
    return items.filter((item) => item?.src && item.src.trim() !== '');
  }, [PR.backgroundMedia, PR.videoSource, PR.videoType, PR.videoMuted]);
  const currentMedia = backgroundItems[mediaIndex] || backgroundItems[0] || null;
  const hasValidMusic = PR.musicEnabled !== false && PR.musicTracks && PR.musicTracks.some(t => t.src && t.src.trim() !== '');
  const backgroundAudioMode = String(PR.backgroundMedia?.audio || PR.backgroundAudio || 'separate').toLowerCase();
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
    back: PR.uiText?.backLabel || text.back,
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
  const featureCards = Array.isArray(PR.featureCards) && PR.featureCards.length
    ? PR.featureCards.slice(0, 3)
    : [];
  const featureIcons = [IconPeople, IconInfo, IconLightning];
  const tipLabel = PR.uiText?.tipLabel || 'DICA';
  const footerText = PR.footer?.text || 'DESENVOLVIDO COM AMOR POR EQUIPE forge STUDIOS';

  useEffect(() => {
    editableTextRef.current = editableText;
  }, [editableText]);

  // Apply theme colours from config to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = PR.colors || {};
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
  }, [PR.colors]);

  useEffect(() => {
    if (mediaIndex >= backgroundItems.length) setMediaIndex(0);
    if (backgroundItems.length <= 1) return undefined;
    const item = backgroundItems[mediaIndex] || backgroundItems[0];
    const seconds = Number(item?.duration || PR.backgroundMedia?.rotateSeconds || 42);
    const timer = setTimeout(() => {
      setMediaIndex((index) => (index + 1) % backgroundItems.length);
    }, Math.max(seconds, 8) * 1000);
    return () => clearTimeout(timer);
  }, [backgroundItems, mediaIndex, PR.backgroundMedia?.rotateSeconds]);

  useEffect(() => {
    if (PR.staffEnabled === false || PR.staffCarouselEnabled === false || staffList.length <= 1) return undefined;
    const seconds = Math.max(Number(PR.staffCarouselSeconds || 6), 3);
    const timer = setInterval(() => {
      setStaffIndex((index) => (index + 1) % staffList.length);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [PR.staffEnabled, PR.staffCarouselEnabled, PR.staffCarouselSeconds, staffList.length]);

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
        config: newConfig,
        remainingSeconds,
        waitProgress,
      } = data;
      
      if (action === 'show') {
        setVisible(true);
        clearMinimumTimer();
        minimumDurationPhaseRef.current = false;
        setMinimumDurationPhase(false);
        setMinimumRemainingSeconds(0);
        if (previewMode !== undefined) setIsPreview(previewMode);
        if (newConfig) {
          setPR(parseConfig({ ...newConfig, language: normalizeLanguage(newConfig.language) }));
        }
      } else if (action === 'hide') {
        setVisible(false);
        setIsPreview(false);
        clearMinimumTimer();
        minimumDurationPhaseRef.current = false;
        setMinimumDurationPhase(false);
        setMinimumRemainingSeconds(0);
      } else if (action === 'updateConfig') {
        if (newConfig) {
          setPR(parseConfig({ ...newConfig, language: normalizeLanguage(newConfig.language) }));
          PRRef.current = parseConfig({ ...newConfig, language: normalizeLanguage(newConfig.language) });
        }
      } else if (action === 'minimumDurationWait') {
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

  const handleClosePreview = () => {
    const resourceName = typeof window.GetParentResourceName === 'function' ? window.GetParentResourceName() : 'forge-loadscreen';
    fetch(`https://${resourceName}/closePreview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({}),
    }).catch(err => console.error("Error closing preview:", err));
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
    if (!isPreview) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreview]);

  const openExternalUrl = (url) => {
    if (!url || url === '#') return;
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

  return (
    <div className={`app ${uiHidden ? 'app--ui-hidden' : ''}`} data-footer-text={footerText}>
      {isPreview && (
        <button
          onClick={handleClosePreview}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
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
          volume={ytVolume}
          className="app__video"
        />
      )}
      <div className="colour-overlay" aria-hidden />

      <header className="header">
        {PR.brandingEnabled !== false && (
          <div className="header__branding">
            {PR.brand?.logo && (
              <img src={PR.brand.logo} alt="Logo" className="header__brand-logo" />
            )}
            <div>
              <span className="header__branding-server">{PR.brand?.title || 'FiveM'}</span>
              <span className="header__branding-community">{PR.brand?.subtitle || 'Powered by CitizenFX'}</span>
            </div>
          </div>
        )}
      </header>

      <div className="header-right">
        {PR.socialEnabled !== false && (
          <SocialIcons social={PR.social || {}} />
        )}
        {PR.staffEnabled !== false && (
          <button
            type="button"
            className="nav__btn header-right__staff"
            onClick={() => { setShowStaff(true); setStaffIndex(0); }}
          >
            <IconPeople className="nav__btn-icon" size={18} />
            {editableText.staff}
          </button>
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
          <div className="hero__eyebrow">
            <span />
            {PR.communityName || 'forge Box'}
            <span />
          </div>
          <h1 className="hero__title">{PR.serverName || 'ロックスター'}</h1>
          <div className="hero__subtitle">
            <span />
            {PR.slogan || 'Bem-vindo ao servidor'}
            <span />
          </div>
        </section>

        <div className="main__bottom">
          {featureCards.length > 0 && (
            <section className="feature-strip" aria-label="Destaques">
              {featureCards.map((card, index) => {
                const FeatureIcon = featureIcons[index] || IconLightning;
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
            </section>
          )}

          <div className="panel">
            <div className="loading-section">
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
            </div>

            {PR.tipEnabled !== false && <p className="tip" data-label={tipLabel}>{PR.tip}</p>}

            <nav className="panel-nav">
              {PR.rulesEnabled !== false && (
                <button type="button" className="nav__btn" onClick={handleRulesClick}>
                  <IconInfo className="nav__btn-icon" size={18} />
                  {editableText.rules}
                </button>
              )}
              {PR.changelogsEnabled !== false && (
                <button type="button" className="nav__btn" onClick={handleChangelogsClick}>
                  <IconDocument className="nav__btn-icon" size={18} />
                  {editableText.changelogs}
                </button>
              )}
              {PR.keybindsEnabled !== false && (
                <button type="button" className="nav__btn" onClick={handleKeybindsClick}>
                  <IconKeyboard className="nav__btn-icon" size={18} />
                  {editableText.keybinds}
                </button>
              )}
            </nav>
          </div>
        </div>
      </main>

      {PR.staffEnabled !== false && PR.staffCarouselEnabled !== false && staffList.length > 0 && (
        <aside className="staff-strip" aria-label={editableText.staff}>
          <div className="staff-strip__label">{editableText.staff}</div>
          <div className="staff-strip__viewport">
            <div
              className="staff-strip__track"
              style={{ transform: `translateX(-${staffIndex * 100}%)` }}
            >
              {staffList.map((entry, i) => (
                <div key={`${entry.name}-${i}`} className="staff-strip__slide">
                  <div className="staff-strip__photo">
                    {entry.photo ? (
                      <img src={entry.photo} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{(entry.name || '?').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="staff-strip__text">
                    <strong>{entry.name || editableText.staff}</strong>
                    <span>{entry.role || editableText.serverTeam}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {showMusicWidget && (
        <aside className="music-widget-wrap">
          <MusicWidget
            tracks={hasValidMusic ? PR.musicTracks : []}
            volume={ytVolume}
            isYtVolumeOnly={isVideoVolumeOnly}
            autoplay={PR.musicAutoplay !== false}
            showCover={PR.musicShowCover !== false}
            onVolumeChange={(vol) => setYtVolume(vol)}
          />
        </aside>
      )}

      {PR.rulesEnabled !== false && showRules && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-label={editableText.rules}
          onClick={(e) => e.target === e.currentTarget && setShowRules(false)}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-panel__header">
              <h2 className="modal-panel__title">{editableText.rules}</h2>
              <button type="button" className="modal-panel__back" onClick={() => setShowRules(false)}>
                {editableText.back}
              </button>
            </div>
            <ul className="modal-list">
              {(PR.rules || []).map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {PR.changelogsEnabled !== false && showChangelogs && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-label={editableText.changelogs}
          onClick={(e) => e.target === e.currentTarget && setShowChangelogs(false)}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-panel__header">
              <h2 className="modal-panel__title">{editableText.changelogs}</h2>
              <button type="button" className="modal-panel__back" onClick={() => setShowChangelogs(false)}>
                {editableText.back}
              </button>
            </div>
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

      {PR.keybindsEnabled !== false && showKeybinds && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-label={editableText.keybinds}
          onClick={(e) => e.target === e.currentTarget && setShowKeybinds(false)}
        >
          <div className="keybinds-panel modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="keybinds-panel__header modal-panel__header">
              <h2 className="keybinds-panel__title modal-panel__title">{editableText.keybinds}</h2>
              <button
                type="button"
                className="keybinds-panel__back modal-panel__back"
                onClick={() => setShowKeybinds(false)}
              >
                {editableText.back}
              </button>
            </div>
            <Keyboard
              keys={PR.keys}
              onKeyClick={(id, info) => setKeybindDialog({ id, info })}
            />
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
            {keybindDialog && (
              <div
                className="keybind-dialog-overlay"
                role="dialog"
                aria-label="Keybind"
                onClick={() => setKeybindDialog(null)}
              >
                <div
                  className="keybind-dialog modal-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="keybind-dialog__header">
                    <kbd className="keybind-dialog__key">{keybindDialog.id}</kbd>
                    <button
                      type="button"
                      className="keybind-dialog__close"
                      onClick={() => setKeybindDialog(null)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <p className="keybind-dialog__desc">
                    {keybindDialog.info || editableText.noKeybind}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {PR.staffEnabled !== false && showStaff && (() => {
        const staffList = (PR.staff || []).map((entry) => {
          if (typeof entry === 'string') return { name: entry, role: '', photo: '' };
          return {
            name: entry.name || entry.role || '',
            role: entry.role || '',
            photo: entry.photo || '',
          };
        });
        const hasMultiple = staffList.length > 1;
        return (
          <div
            className="modal-overlay"
            role="dialog"
            aria-label={editableText.staff}
            onClick={(e) => e.target === e.currentTarget && setShowStaff(false)}
          >
            <div className="modal-panel staff-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-panel__header">
                <h2 className="modal-panel__title">{editableText.staff}</h2>
                <button type="button" className="modal-panel__back" onClick={() => setShowStaff(false)}>
                  {editableText.back}
                </button>
              </div>
              <div className="staff-slider">
                <div
                  className="staff-slider__track"
                  style={{ transform: `translateX(-${staffIndex * 100}%)` }}
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
                          className={`staff-slider__dot ${i === staffIndex ? 'staff-slider__dot--active' : ''}`}
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
    </div>
  );
}

export default App;
