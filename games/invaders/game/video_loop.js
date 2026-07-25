const videoPlayer = document.getElementById('bgVideo');
const videoRankingOverlay = document.getElementById('video-ranking-overlay');

// Obtener screenId desde la URL (ej: videos.html?screenId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
const _urlParams = new URLSearchParams(window.location.search);
const screenId = _urlParams.get('screenId') || '';

let playlist = [];
let currentVideoIndex = 0;
const playbackBaseUrl = CONFIG.LOCAL_VIDEO_SERVER_URL;
const SYNC_INTERVAL_MS = 30000;

async function fetchAndShowUpcomingGames() {
    if (!screenId) return;
    try {
        const portalUrl = 'https://portal.myplayad.com';
        const res = await fetch(`${portalUrl}/api/public/screens/${screenId}/current`);
        if (!res.ok) return;
        const data = await res.json();
        const upcomingGamesContainer = document.getElementById('upcoming-games-container');
        const upcomingGamesList = document.getElementById('upcoming-games-list');
        
        if (data.upcoming && data.upcoming.length > 0) {
            // Group games by name to merge dates
            const gamesMap = {};
            data.upcoming.forEach(item => {
                if (item.type === 'game') {
                    if (!gamesMap[item.name]) gamesMap[item.name] = [];
                    const d = new Date(item.startDate);
                    // Format: 10:30 PM
                    const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    // Only add if not already in the list
                    if (!gamesMap[item.name].includes(timeString)) {
                        gamesMap[item.name].push(timeString);
                    }
                }
            });

            const gamesHtml = Object.keys(gamesMap).map(name => {
                const times = gamesMap[name].join(' / ');
                return `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
                    <span style="color: var(--nokia-bg); font-weight: bold;">${name}</span>
                    <span style="color: #ccc;">${times}</span>
                </li>`;
            }).join('');

            if (gamesHtml) {
                upcomingGamesList.innerHTML = gamesHtml;
                upcomingGamesContainer.style.display = 'block';
            } else {
                upcomingGamesContainer.style.display = 'none';
            }
        } else {
            upcomingGamesContainer.style.display = 'none';
        }
    } catch (e) {
        console.warn('Error fetching upcoming games:', e);
    }
}

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
    if (videoRankingOverlay) {
        videoRankingOverlay.classList.remove('hidden');
        fetchAndShowUpcomingGames();
    }
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
