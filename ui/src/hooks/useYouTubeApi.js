// Carrega a YouTube IFrame API uma única vez para a página inteira.
// A API cria iframes com a origem correta (youtube.com), contornando
// o Error 153 que ocorre ao embedar iframes diretamente no loading screen do FiveM.

let apiLoaded = false;
let apiReady = false;
const callbacks = [];

export function loadYouTubeApi(cb) {
  if (apiReady) { cb(); return; }
  callbacks.push(cb);
  if (!apiLoaded) {
    apiLoaded = true;
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      callbacks.forEach((fn) => fn());
      callbacks.length = 0;
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
}

export function getVideoId(url) {
  const match = url?.match(
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[5] : null;
}
