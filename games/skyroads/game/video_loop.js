const videoPlayer = document.getElementById('bgVideo');
const videoRankingOverlay = document.getElementById('video-ranking-overlay');

// Obtener screenId desde la URL
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
                    <span style="color: var(--phosphor, #3dff8a); font-weight: bold;">${name}</span>
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
            }
        }
    } catch (e) {
        console.warn('Error fetching upcoming games:', e);
    }
}

async function syncPlaylist() {
    if (!screenId) return;
    try {
        const portalUrl = 'https://portal.myplayad.com';
        const res = await fetch(`${portalUrl}/api/public/screens/${screenId}/current`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.playlist && data.playlist.length > 0) {
            playlist = data.playlist;
            if (videoPlayer && (!videoPlayer.src || videoPlayer.paused)) {
                playNextVideo();
            }
        }
    } catch (e) {
        console.warn('Sync playlist error:', e);
    }
}

function playNextVideo() {
    if (!playlist || playlist.length === 0 || !videoPlayer) return;
    currentVideoIndex = (currentVideoIndex + 1) % playlist.length;
    const media = playlist[currentVideoIndex];
    if (media && media.filename) {
        videoPlayer.src = `${playbackBaseUrl}/media/${media.filename}`;
        videoPlayer.play().catch(err => console.warn('Video play error:', err));
    }
}

if (videoPlayer) {
    videoPlayer.addEventListener('ended', playNextVideo);
    videoPlayer.addEventListener('error', () => {
        setTimeout(playNextVideo, 2000);
    });
}

syncPlaylist();
setInterval(syncPlaylist, SYNC_INTERVAL_MS);
