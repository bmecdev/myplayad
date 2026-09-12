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
        const gameOverUpcomingContainer = document.getElementById('game-over-upcoming-container');
        const gameOverUpcomingList = document.getElementById('game-over-upcoming-list');
        
        if (data.upcoming && data.upcoming.length > 0) {
            // Group games by name to merge dates
            const gamesMap = {};
            data.upcoming.forEach(item => {
                if (item.type === 'game') {
                    if (!gamesMap[item.name]) gamesMap[item.name] = [];
                    const d = new Date(item.startDate);
                    const now = new Date();
                    let timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (d.toDateString() !== now.toDateString()) {
                        const dateString = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        timeString = `${dateString}, ${timeString}`;
                    }
                    if (!gamesMap[item.name].includes(timeString)) {
                        gamesMap[item.name].push(timeString);
                    }
                }
            });

            const gamesHtml = Object.keys(gamesMap).map(name => {
                const times = gamesMap[name].join(' / ');
                return `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
                    <span style="color: var(--phosphor); font-weight: bold;">${name}</span>
                    <span style="color: #ccc;">${times}</span>
                </li>`;
            }).join('');

            if (gamesHtml) {
                if (upcomingGamesList) {
                    upcomingGamesList.innerHTML = gamesHtml;
                    upcomingGamesContainer.style.display = 'block';
                }
                if (gameOverUpcomingList) {
                    gameOverUpcomingList.innerHTML = gamesHtml;
                    if (gameOverUpcomingContainer) gameOverUpcomingContainer.style.display = 'block';
                }
            } else {
                if (upcomingGamesContainer) upcomingGamesContainer.style.display = 'none';
                if (gameOverUpcomingContainer) gameOverUpcomingContainer.style.display = 'none';
            }
        } else {
            if (upcomingGamesContainer) upcomingGamesContainer.style.display = 'none';
            if (gameOverUpcomingContainer) gameOverUpcomingContainer.style.display = 'none';
        }
    } catch (e) {
        console.warn('Error fetching upcoming games:', e);
    }
}

let activeBlobUrl = null;

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'VIDEO_BLOB_RESPONSE') {
        const { buffer, mime } = event.data;
        if (activeBlobUrl) {
            URL.revokeObjectURL(activeBlobUrl);
        }
        const blob = new Blob([buffer], { type: mime });
        activeBlobUrl = URL.createObjectURL(blob);
        videoPlayer.src = activeBlobUrl;
        videoPlayer.load();

        const playPromise = videoPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.log('Autoplay bloqueado en bgVideo:', err);
                setTimeout(() => {
                    videoPlayer.muted = true;
                    videoPlayer.play().catch(e => console.log('Re-intento fallido', e));
                }, 150);
            });
        }
    }
});

function buildVideoUrl(filename) {
    return `${playbackBaseUrl}/videos/${screenId}/${encodeURIComponent(filename)}`;
}

function playVideo(index) {
    if (!playlist.length) return;
    currentVideoIndex = index % playlist.length;
    if (videoRankingOverlay) videoRankingOverlay.classList.add('hidden');
    
    videoPlayer.muted = true;
    videoPlayer.defaultMuted = true;
    videoPlayer.setAttribute('muted', 'true');
    videoPlayer.setAttribute('playsinline', 'true');
    videoPlayer.setAttribute('autoplay', 'true');
    
    window.parent.postMessage({
        type: 'FETCH_VIDEO_BLOB',
        filename: playlist[currentVideoIndex],
        screenId: screenId
    }, '*');
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

function syncLocalCache() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout esperando respuesta de cache del parent')), 5000);
        
        const handler = (event) => {
            if (event.data && event.data.type === 'LOCAL_CACHE_RESPONSE') {
                window.removeEventListener('message', handler);
                clearTimeout(timeout);
                const cacheData = event.data.data;
                applyPlaylist(cacheData.videos || []);
                resolve(cacheData);
            }
        };
        
        window.addEventListener('message', handler);
        window.parent.postMessage({ type: 'FETCH_LOCAL_CACHE', screenId }, '*');
    });
}

async function initPlaylist() {
    if (!screenId) {
        console.warn('video_loop: falta el parámetro screenId en la URL');
        return;
    }
    if (!playbackBaseUrl) {
        console.warn('video_loop: falta CONFIG.LOCAL_VIDEO_SERVER_URL');
        return;
    }

    try {
        const syncResult = await syncLocalCache();
        console.log(`video_loop: cache local sincronizado (${syncResult.videos.length} videos)`);

        if (!playlist.length) return;

        setInterval(async () => {
            try {
                await syncLocalCache();
            } catch (err) {
                console.warn('video_loop: error en resync local:', err.message);
            }
        }, SYNC_INTERVAL_MS);
    } catch (err) {
        console.warn('video_loop: error cargando cache local:', err.message);
    }
}

initPlaylist();

