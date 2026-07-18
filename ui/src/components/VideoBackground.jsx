import { useRef, useEffect } from 'react';

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function getVideoId(url) {
  const match = url?.match(YOUTUBE_REGEX);
  return match ? match[5] : null;
}

// Monta a URL exatamente como o loadscreen standalone oficial usa:
// /embed?playlist=VIDEO_ID&autoplay=1&loop=1
function buildEmbedUrl(videoId, muted) {
  const params = new URLSearchParams({
    playlist: videoId,
    autoplay: '1',
    loop: '1',
    mute: muted ? '1' : '0',
  });
  return `https://www.youtube.com/embed?${params.toString()}`;
}

export default function VideoBackground({ source, type = 'auto', muted = false, volume = 0.6, className = '' }) {
  const videoRef = useRef(null);
  const isYouTube = type === 'youtube' || YOUTUBE_REGEX.test(source || '');
  const videoId = isYouTube ? getVideoId(source) : null;
  const embedUrl = videoId ? buildEmbedUrl(videoId, muted) : null;

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  if (!source) return null;

  if (isYouTube && embedUrl) {
    return (
      <div className={`video-background video-background--youtube ${className}`}>
        <iframe
          src={embedUrl}
          title="Background"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
          style={{ pointerEvents: 'none' }}
        />
        <div className="video-background__overlay" aria-hidden />
      </div>
    );
  }

  return (
    <div className={`video-background video-background--local ${className}`}>
      <video
        ref={videoRef}
        src={source}
        autoPlay
        muted={muted}
        loop
        playsInline
        className="video-background__video"
      />
      <div className="video-background__overlay" aria-hidden />
    </div>
  );
}
