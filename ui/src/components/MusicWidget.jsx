import { useState, useRef, useEffect, useMemo } from 'react';

const DEFAULT_TRACKS = [];
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function getTrackSourceType(track) {
  const src = track?.src || '';
  if (track?.type === 'youtube' || YOUTUBE_REGEX.test(src)) return 'youtube';
  return 'audio';
}

function getVideoId(url) {
  const match = url?.match(YOUTUBE_REGEX);
  return match ? match[5] : null;
}

let apiPromise = null;
const ensureApi = () => {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag || null);
    
    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      resolve();
    };
  });
  return apiPromise;
};

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

export default function MusicWidget({
  tracks = DEFAULT_TRACKS,
  volume: initialVolume = 0.7,
  isYtVolumeOnly = false,
  autoplay = true,
  showCover = true,
  onVolumeChange = null,
}) {
  const validTracks = useMemo(() => tracks.filter((track) => track?.src), [tracks]);
  const [isPlaying, setIsPlaying] = useState(() => autoplay && validTracks.length > 0);
  const [volume, setVolume] = useState(initialVolume);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);
  const audioRef = useRef(null);
  
  const ytPlayerRef = useRef(null);
  const ytContainerId = useRef('yt-widget-player-' + Math.random().toString(36).slice(2));
  const [isYtReady, setIsYtReady] = useState(false);

  const currentTrack = validTracks[currentIndex] || null;
  const currentType = getTrackSourceType(currentTrack);
  const currentVideoId = currentType === 'youtube' ? getVideoId(currentTrack?.src) : null;

  useEffect(() => { setVolume(initialVolume); }, [initialVolume]);

  useEffect(() => {
    if (currentIndex >= validTracks.length) setCurrentIndex(0);
    setIsPlaying(autoplay && validTracks.length > 0);
  }, [autoplay, validTracks.length]);

  useEffect(() => {
    setCoverFailed(false);
    setProgress(0);
  }, [currentIndex, currentTrack?.src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  // Audio track execution
  useEffect(() => {
    if (isYtVolumeOnly || currentType !== 'audio' || !currentTrack?.src) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = currentTrack.src;
    audio.volume = volume;
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [currentIndex, currentTrack?.src, currentType, isPlaying, isYtVolumeOnly, volume]);

  // YouTube API Player initialization and cleanup
  useEffect(() => {
    if (currentType !== 'youtube' || !currentVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
        setIsYtReady(false);
      }
      return;
    }

    let active = true;
    ensureApi().then(() => {
      if (!active) return;
      
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
        setIsYtReady(false);
      }

      const playerElement = document.getElementById(ytContainerId.current);
      if (!playerElement) return;

      ytPlayerRef.current = new window.YT.Player(ytContainerId.current, {
        videoId: currentVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          loop: 1,
          playlist: currentVideoId,
          origin: window.location.origin || 'https://www.youtube.com',
        },
        events: {
          onReady: (event) => {
            if (!active) return;
            try {
              const iframe = event?.target?.getIframe?.() || null;
              if (iframe) {
                iframe.setAttribute('allow', 'autoplay; encrypted-media');
              }
            } catch (err) {}
            
            setIsYtReady(true);
            
            if (isPlaying) {
              try {
                event.target.mute();
                event.target.playVideo();
                
                setTimeout(() => {
                  if (!active) return;
                  try {
                    event.target.unMute();
                    event.target.setVolume(Math.round(volume * 100));
                  } catch (err) {}
                }, 700);
              } catch (err) {}
            } else {
              try {
                event.target.setVolume(Math.round(volume * 100));
                event.target.pauseVideo();
              } catch (err) {}
            }
          },
          onStateChange: (event) => {
            if (!active) return;
            if (window.YT && event.data === window.YT.PlayerState.ENDED) {
              if (currentTrack && !currentTrack.loop) {
                next();
              }
            }
          }
        }
      });
    });

    return () => {
      active = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
        setIsYtReady(false);
      }
    };
  }, [currentVideoId, currentType]);

  // Sync YouTube player play/pause state
  useEffect(() => {
    if (currentType !== 'youtube' || !ytPlayerRef.current || !isYtReady) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    } catch (e) {}
  }, [isPlaying, currentType, isYtReady]);

  // Sync YouTube player volume/mute state
  useEffect(() => {
    if (currentType !== 'youtube' || !ytPlayerRef.current || !isYtReady) return;
    try {
      ytPlayerRef.current.setVolume(Math.round(volume * 100));
      if (volume <= 0) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
      }
    } catch (e) {}
  }, [volume, currentType, isYtReady]);

  const setWidgetVolume = (value) => {
    setVolume(value);
    if (onVolumeChange) onVolumeChange(value);
  };

  const togglePlay = () => {
    if (!validTracks.length) return;
    if (isPlaying) {
      if (currentType === 'audio') {
        audioRef.current?.pause();
      }
      setIsPlaying(false);
      return;
    }
    if (currentType === 'audio' && audioRef.current && currentTrack?.src) {
      const audio = audioRef.current;
      if (audio.src !== currentTrack.src) audio.src = currentTrack.src;
      audio.volume = volume;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }
    setIsPlaying(true);
  };

  const next = () => {
    if (!validTracks.length) return;
    setCurrentIndex((i) => (i + 1) % validTracks.length);
  };

  const prev = () => {
    if (!validTracks.length) return;
    setCurrentIndex((i) => (i - 1 + validTracks.length) % validTracks.length);
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  if (isYtVolumeOnly) {
    return (
      <div className="music-widget music-widget--compact">
        <div className="music-widget__header">
          <span className="music-widget__label">Volume do video</span>
        </div>
        <div className="music-widget__volume">
          <VolumeIcon />
          <input
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => setWidgetVolume(parseFloat(e.target.value))}
            className="music-widget__volume-slider" aria-label="Volume"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="music-widget">
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        onEnded={next}
        onLoadedMetadata={() => setProgress(0)}
      />
      
      {currentType === 'youtube' && (
        <div
          className="music-widget__youtube"
          style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
        >
          <div id={ytContainerId.current} />
        </div>
      )}

      <div className="music-widget__now">
        {showCover && (
          <div className="music-widget__cover">
            {currentTrack?.cover && !coverFailed ? (
              <img
                src={currentTrack.cover}
                alt=""
                onError={() => setCoverFailed(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{(currentTrack?.name || 'P').slice(0, 1).toUpperCase()}</span>
            )}
          </div>
        )}
        <div className="music-widget__meta">
          <span className="music-widget__label">Tocando agora</span>
          <span className="music-widget__title">{currentTrack?.name || 'Nenhuma faixa'}</span>
          <span className="music-widget__artist">{currentTrack?.artist || currentTrack?.album || 'Playlist da loadscreen'}</span>
        </div>
      </div>

      <div className="music-widget__controls">
        <button type="button" className="music-widget__btn" onClick={prev} aria-label="Anterior" title="Anterior">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
        </button>
        <button
          type="button"
          className="music-widget__btn music-widget__btn--play"
          onClick={togglePlay}
          disabled={!validTracks.length}
          aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          title={isPlaying ? 'Pausar' : 'Tocar'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden><path d="M8 5v14l11-7L8 5z" /></svg>
          )}
        </button>
        <button type="button" className="music-widget__btn" onClick={next} aria-label="Proxima" title="Proxima">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden><path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" /></svg>
        </button>
      </div>

      <div className="music-widget__progress-wrap">
        <div className="music-widget__progress" style={{ width: currentType === 'youtube' ? '100%' : `${progress}%` }} />
      </div>

      <div className="music-widget__volume">
        <VolumeIcon />
        <input
          type="range" min="0" max="1" step="0.05" value={volume}
          onChange={(e) => setWidgetVolume(parseFloat(e.target.value))}
          className="music-widget__volume-slider" aria-label="Volume"
        />
      </div>
    </div>
  );
}
