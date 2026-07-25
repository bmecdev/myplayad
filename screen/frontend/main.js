const PORTAL_URL = 'https://portal.myplayad.com';
const POLL_INTERVAL = 10000; // 10 seconds

const layers = {
    standby: document.getElementById('standby'),
    video: document.getElementById('video-player'),
    game: document.getElementById('game-frame'),
    interstitial: document.getElementById('interstitial')
};

let currentType = 'standby';
let currentUrl = '';
let screenId = new URLSearchParams(window.location.search).get('screenId');

let videoPlaylist = [];
let videoIndex = 0;
let playlistSyncInterval = null;

async function syncLocalPlaylist() {
    if (!screenId) return;
    try {
        const cacheRes = await fetch(`/api/cache/${screenId}`);
        if (!cacheRes.ok) return;
        const cacheData = await cacheRes.json();
        videoPlaylist = cacheData.videos || [];
        
        if (currentType === 'video' && layers.video.paused && videoPlaylist.length > 0) {
            playCurrentVideo();
        }
    } catch (e) {
        console.warn('Error syncing playlist:', e);
    }
}

function playCurrentVideo() {
    if (!videoPlaylist.length) return;
    if (videoIndex >= videoPlaylist.length) videoIndex = 0;
    const filename = videoPlaylist[videoIndex];
    const localSrc = `/videos/${screenId}/${encodeURIComponent(filename)}`;
    const remoteSrc = `https://videos.myplayad.com/videos/${screenId}/${encodeURIComponent(filename)}`;
    
    layers.video.src = localSrc;
    
    layers.video.onerror = () => {
        if (layers.video.src.includes(localSrc)) {
            console.warn('Video local no encontrado, usando streaming remoto...');
            layers.video.src = remoteSrc;
            layers.video.load();
            if (currentType === 'video') {
                layers.video.play().catch(e => console.warn('Autoplay bloqueado:', e));
            }
        }
    };
    
    layers.video.load();
    if (currentType === 'video') {
        layers.video.play().catch(e => console.warn('Autoplay bloqueado:', e));
    }
}

let hasUpcoming = false;

layers.video.onended = () => {
    if (currentType === 'video') {
        videoIndex = (videoIndex + 1) % videoPlaylist.length;
        
        if (hasUpcoming) {
            setActiveLayer('interstitial');
            setTimeout(() => {
                // Return to video after 10 seconds
                if (currentType === 'interstitial') {
                    setActiveLayer('video');
                    playCurrentVideo();
                }
            }, 10000);
        } else {
            playCurrentVideo();
        }
    }
};

async function initialize() {
    if (!screenId) {
        try {
            const res = await fetch('/api/config');
            const config = await res.json();
            if (config.screenId) {
                screenId = config.screenId;
            }
        } catch (e) {
            console.warn('Could not fetch config:', e);
        }
    }

    if (!screenId) {
        layers.standby.innerHTML = '<div style="color:red; font-size:2rem; text-align:center;">Falta SCREEN_ID<br><small>Configura la variable de entorno o usa ?screenId=</small></div>';
        return;
    }

    checkSchedule();
    setInterval(checkSchedule, POLL_INTERVAL);
}

function setActiveLayer(type) {
    if (currentType === type) return;
    
    // Deactivate all
    Object.values(layers).forEach(el => el.classList.remove('active'));
    
    // Activate target
    layers[type].classList.add('active');
    
    // Pause video if we are navigating away
    if (type !== 'video' && currentType === 'video') {
        layers.video.pause();
    }
    
    // Play video if we navigate to it
    if (type === 'video') {
        layers.video.play().catch(e => console.warn('Autoplay blocked:', e));
    }
    
    currentType = type;
}

async function checkSchedule() {
    if (!screenId) return;

    try {
        const res = await fetch(`${PORTAL_URL}/api/public/screens/${screenId}/current`);
        const data = await res.json();

        // Render upcoming schedules in interstitial layer
        const upcomingList = document.getElementById('interstitial-list');
        
        if (data.upcoming && data.upcoming.length > 0) {
            hasUpcoming = true;
            upcomingList.innerHTML = data.upcoming.map(item => {
                const date = new Date(item.startDate);
                const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                    <li class="upcoming-item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-time">${timeString}</span>
                    </li>
                `;
            }).join('');
        } else {
            hasUpcoming = false;
            upcomingList.innerHTML = '';
        }

        if (data.type === 'standby' || !data.type) {
            setActiveLayer('standby');
            currentUrl = '';
            return;
        }

        if (data.type === 'video') {
            if (currentType !== 'video' && currentType !== 'interstitial') {
                setActiveLayer('video');
                currentUrl = 'playlist';
                
                await syncLocalPlaylist();
                if (videoPlaylist.length > 0) {
                    playCurrentVideo();
                }
                
                if (!playlistSyncInterval) {
                    playlistSyncInterval = setInterval(syncLocalPlaylist, 30000);
                }
            }
        }

        if (data.type === 'game') {
            if (currentUrl !== data.url) {
                currentUrl = data.url;
                layers.game.src = data.url;
            }
            setActiveLayer('game');
        }

    } catch (err) {
        console.error('Error fetching schedule:', err);
    }
}

// Boot
initialize();
