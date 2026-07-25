const videoPlayer = document.getElementById('bgVideo');
const videoRankingOverlay = document.getElementById('video-ranking-overlay');

// Obtener screenId desde la URL (ej: videos.html?screenId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
const _urlParams = new URLSearchParams(window.location.search);
const screenId = _urlParams.get('screenId') || '';

let playlist = [];
let currentVideoIndex = 0;
const playbackBaseUrl = CONFIG.LOCAL_VIDEO_SERVER_URL;
const SYNC_INTERVAL_MS = 30000;

function buildVideoUrl(filename) {
    return `${playbackBaseUrl}/videos/${screenId}/${encodeURIComponent(filename)}`;
}

function playVideo(index) {
    if (!playlist.length) return;
    currentVideoIndex = index % playlist.length;
    if (videoRankingOverlay) videoRankingOverlay.classList.add('hidden');
    videoPlayer.src = buildVideoUrl(playlist[currentVideoIndex]);
    videoPlayer.play().catch(() => {
        console.log('Autoplay bloqueado. Haz clic en la página para iniciar.');
    });
}

function playNextVideo() {
    if (videoRankingOverlay) videoRankingOverlay.classList.remove('hidden');
    setTimeout(() => playVideo(currentVideoIndex + 1), 5000);
}

videoPlayer.onended = playNextVideo;

function applyPlaylist(nextPlaylist) {
    const previousCurrent = playlist[currentVideoIndex] || '';
    playlist = nextPlaylist;

    if (!playlist.length) {
        videoPlayer.pause();
        videoPlayer.removeAttribute('src');
        videoPlayer.load();
        return;
    }

    if (!previousCurrent) {
        currentVideoIndex = 0;
        playVideo(0);
        return;
    }

    const preservedIndex = playlist.indexOf(previousCurrent);
    if (preservedIndex >= 0) {
        currentVideoIndex = preservedIndex;
        return;
    }

    currentVideoIndex = 0;
    playVideo(0);
}

async function syncLocalCache() {
    const cacheRes = await fetch(`${playbackBaseUrl}/api/cache/${screenId}`);
    if (!cacheRes.ok) throw new Error(`HTTP ${cacheRes.status}`);
    const cacheData = await cacheRes.json();
    applyPlaylist(cacheData.videos || []);
    return cacheData;
}

// Cargar la lista de videos del servidor y arrancar
async function initPlaylist() {
    if (!screenId) {
        console.error('video_loop: falta el parámetro screenId en la URL');
        return;
    }
    if (!playbackBaseUrl) {
        console.error('video_loop: falta CONFIG.LOCAL_VIDEO_SERVER_URL para reproducción local');
        return;
    }

    try {
        const syncResult = await syncLocalCache();
        console.log(`video_loop: cache local sincronizado (${syncResult.videos.length} video(s), +${syncResult.downloaded || 0}, -${syncResult.removed || 0})`);

        if (!playlist.length) {
            console.warn(`video_loop: no hay videos en la carpeta "${screenId}"`);
            return;
        }

        setInterval(async () => {
            try {
                const data = await syncLocalCache();
                console.log(`video_loop: resync OK (${data.videos.length} video(s), +${data.downloaded || 0}, -${data.removed || 0})`);
            } catch (err) {
                console.warn('video_loop: error en resync local:', err.message);
            }
        }, SYNC_INTERVAL_MS);

        console.log(`video_loop: ${playlist.length} video(s) cargados para pantalla ${screenId} desde localhost`);
    } catch (err) {
        console.error('video_loop: error cargando cache local:', err.message);
    }
}

initPlaylist();
