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
    
    layers.video.muted = true;
    layers.video.defaultMuted = true;
    layers.video.setAttribute('muted', 'true');
    layers.video.setAttribute('playsinline', 'true');
    layers.video.setAttribute('autoplay', 'true');
    
    layers.video.load();
    if (currentType === 'video') {
        const playPromise = layers.video.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn('Autoplay bloqueado:', e);
                setTimeout(() => {
                    layers.video.muted = true;
                    layers.video.play().catch(err => console.log('Re-intento fallido', err));
                }, 150);
            });
        }
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

    // Conectar a SSE para notificaciones en tiempo real desde el servidor local
    const eventSource = new EventSource('/api/sync-stream');
    eventSource.onmessage = (event) => {
        if (event.data === 'sync') {
            console.log('[SSE] Recibida alerta de sincronización en tiempo real');
            // Forzar actualización inmediata
            checkSchedule();
            if (currentType === 'video') {
                syncLocalPlaylist();
            }
        } else if (event.data === 'identify') {
            console.log('[SSE] Recibida alerta de identificación');
            showIdentifyIndicator();
        }
    };
    eventSource.onerror = (err) => {
        console.warn('[SSE] EventSource error', err);
    };
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
        layers.video.muted = true;
        layers.video.defaultMuted = true;
        layers.video.setAttribute('muted', 'true');
        layers.video.setAttribute('playsinline', 'true');
        layers.video.setAttribute('autoplay', 'true');
        
        const playPromise = layers.video.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn('Autoplay blocked:', e);
                setTimeout(() => {
                    layers.video.muted = true;
                    layers.video.play().catch(err => console.log('Re-intento fallido', err));
                }, 150);
            });
        }
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
                return `
                    <li class="upcoming-item" style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; font-size: 1.2rem;">
                        <span class="item-name" style="color: #60a5fa; font-weight: bold;">${name}</span>
                        <span class="item-time" style="color: #ccc;">${times}</span>
                    </li>
                `;
            }).join('');

            if (gamesHtml) {
                hasUpcoming = true;
                upcomingList.innerHTML = gamesHtml;
            } else {
                hasUpcoming = false;
                upcomingList.innerHTML = '';
            }
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

let identifyTimeout = null;
function showIdentifyIndicator() {
    const indicator = document.getElementById('identify-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        if (identifyTimeout) {
            clearTimeout(identifyTimeout);
        }
        identifyTimeout = setTimeout(() => {
            indicator.classList.add('hidden');
        }, 5000);
    }
}
