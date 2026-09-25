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
        if (cacheRes.ok) {
            const cacheData = await cacheRes.json();
            if (cacheData.videos && cacheData.videos.length > 0) {
                videoPlaylist = cacheData.videos;
            }
        }
    } catch (e) {
        console.warn('Error syncing playlist via cache:', e);
    }

    if (!videoPlaylist.length) {
        try {
            const localRes = await fetch(`/api/videos/${screenId}`);
            if (localRes.ok) {
                const localData = await localRes.json();
                if (localData.videos && localData.videos.length > 0) {
                    videoPlaylist = localData.videos;
                }
            }
        } catch (_) {}
    }
    
    if (currentType === 'video' && layers.video.paused && videoPlaylist.length > 0) {
        playCurrentVideo();
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

let gameRotationTimer = null;

function getTargetGameUrl(slug) {
    const s = slug || new URLSearchParams(window.location.search).get('game') || 'snake';
    return `/games/${s}/?screenId=${screenId || ''}`;
}

function switchToGame(slug) {
    if (gameRotationTimer) {
        clearTimeout(gameRotationTimer);
        gameRotationTimer = null;
    }
    const targetUrl = getTargetGameUrl(slug);
    if (currentUrl !== targetUrl) {
        currentUrl = targetUrl;
        layers.game.src = targetUrl;
    }
    setActiveLayer('game');

    // Si el usuario no forzó permanentemente el juego en la URL (?game=...), rotar a video tras 45s
    const isForced = new URLSearchParams(window.location.search).has('game');
    if (!isForced) {
        gameRotationTimer = setTimeout(() => {
            if (currentType === 'game') {
                switchToVideo();
            }
        }, 45000);
    }
}

function switchToVideo() {
    if (gameRotationTimer) {
        clearTimeout(gameRotationTimer);
        gameRotationTimer = null;
    }
    setActiveLayer('video');
    currentUrl = 'playlist';
    playCurrentVideo();
}

layers.video.onended = () => {
    if (currentType === 'video') {
        videoIndex = videoIndex + 1;
        
        // Al terminar el ciclo de todos los videos, rotar al juego arcade
        if (videoIndex >= videoPlaylist.length) {
            videoIndex = 0;
            switchToGame();
            return;
        }
        
        if (hasUpcoming) {
            setActiveLayer('interstitial');
            setTimeout(() => {
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

    // Configurar botones de cambio rápido de modo
    const btnVideo = document.getElementById('btn-switch-video');
    const btnGame = document.getElementById('btn-switch-game');
    if (btnVideo) btnVideo.onclick = () => switchToVideo();
    if (btnGame) btnGame.onclick = () => switchToGame();

    // Atajos de teclado para desarrolladores y pruebas:
    // 'G': Cambiar a Juego
    // 'V': Cambiar a Video
    // 'Espacio': Alternar
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'g' || e.key === 'G') {
            switchToGame();
        } else if (e.key === 'v' || e.key === 'V') {
            switchToVideo();
        } else if (e.code === 'Space') {
            if (currentType === 'game') switchToVideo();
            else switchToGame();
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const forcedGame = urlParams.get('game');
    const forcedType = urlParams.get('type');

    if (forcedGame || forcedType === 'game') {
        switchToGame(forcedGame);
    } else {
        // Iniciar videos locales inmediatamente
        checkAndPlayLocalFallback();
    }

    checkSchedule();
    setInterval(checkSchedule, POLL_INTERVAL);

    // Conectar a SSE para notificaciones en tiempo real desde el servidor local
    const eventSource = new EventSource('/api/sync-stream');
    eventSource.onmessage = (event) => {
        if (event.data === 'sync') {
            console.log('[SSE] Recibida alerta de sincronización en tiempo real');
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

    // Actualizar botones de la barra de control
    const btnVideo = document.getElementById('btn-switch-video');
    const btnGame = document.getElementById('btn-switch-game');
    if (btnVideo && btnGame) {
        btnVideo.classList.toggle('active', type === 'video');
        btnGame.classList.toggle('active', type === 'game');
    }
    
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
    
    // Send rescale trigger to game frame when switching to game layer
    if (type === 'game' && layers.game && layers.game.contentWindow) {
        try {
            layers.game.contentWindow.postMessage({ type: 'RESCALE' }, '*');
        } catch (e) {
            console.warn('Could not post RESCALE message:', e);
        }
    }

    currentType = type;
}

async function checkAndPlayLocalFallback() {
    if (!screenId) return false;
    // Si ya estamos mostrando el juego intencionalmente, no interrumpirlo
    if (currentType === 'game') return false;

    try {
        const res = await fetch(`/api/videos/${screenId}`);
        if (res.ok) {
            const data = await res.json();
            if (data.videos && data.videos.length > 0) {
                videoPlaylist = data.videos;
                if (currentType !== 'video' && currentType !== 'interstitial' && currentType !== 'game') {
                    setActiveLayer('video');
                    currentUrl = 'local-playlist';
                    playCurrentVideo();
                }
                if (!playlistSyncInterval) {
                    playlistSyncInterval = setInterval(syncLocalPlaylist, 30000);
                }
                return true;
            }
        }
    } catch (e) {
        console.warn('Fallback local error:', e);
    }
    return false;
}

async function checkSchedule() {
    if (!screenId) return;

    const urlParams = new URLSearchParams(window.location.search);
    const forcedGame = urlParams.get('game');
    const forcedType = urlParams.get('type');

    if (forcedGame || forcedType === 'game') {
        switchToGame(forcedGame);
        return;
    }

    if (forcedType === 'video') {
        switchToVideo();
        return;
    }

    try {
        const res = await fetch(`${PORTAL_URL}/api/public/screens/${screenId}/current`);
        if (!res.ok) {
            throw new Error(`Portal respondió status ${res.status}`);
        }
        const data = await res.json();

        // Render upcoming schedules in interstitial layer
        const upcomingList = document.getElementById('interstitial-list');
        
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
            if (currentType !== 'game' && currentType !== 'video') {
                const hasLocalVideos = await checkAndPlayLocalFallback();
                if (!hasLocalVideos) {
                    setActiveLayer('standby');
                    currentUrl = '';
                }
            }
            return;
        }

        if (data.type === 'video') {
            if (currentType !== 'video' && currentType !== 'interstitial') {
                switchToVideo();
                await syncLocalPlaylist();
                if (!playlistSyncInterval) {
                    playlistSyncInterval = setInterval(syncLocalPlaylist, 30000);
                }
            }
        }

        if (data.type === 'game') {
            const gameUrl = data.url || getTargetGameUrl('snake');
            if (currentUrl !== gameUrl) {
                currentUrl = gameUrl;
                layers.game.src = gameUrl;
            }
            setActiveLayer('game');
        }

    } catch (err) {
        // En modo offline / portal con error:
        if (currentType !== 'video' && currentType !== 'game') {
            const hasLocalVideos = await checkAndPlayLocalFallback();
            if (!hasLocalVideos) {
                setActiveLayer('standby');
                currentUrl = '';
            }
        }
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

// Escuchar peticiones de cache de los juegos en iframe (para evitar bloqueos CORS y Mixed Content de Safari/Chrome)
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'FETCH_LOCAL_CACHE') {
        const sId = event.data.screenId || screenId;
        if (!sId) return;
        try {
            const cacheRes = await fetch(`/api/cache/${sId}`);
            if (cacheRes.ok) {
                const cacheData = await cacheRes.json();
                if (layers.game && layers.game.contentWindow) {
                    layers.game.contentWindow.postMessage({
                        type: 'LOCAL_CACHE_RESPONSE',
                        data: cacheData
                    }, '*');
                }
            }
        } catch (e) {
            console.warn('[screen] Error obteniendo cache para iframe:', e);
        }
    } else if (event.data && event.data.type === 'FETCH_VIDEO_BLOB') {
        const { screenId: sId, filename } = event.data;
        if (!sId || !filename) return;
        try {
            const res = await fetch(`/videos/${sId}/${encodeURIComponent(filename)}`);
            if (res.ok) {
                const buffer = await res.arrayBuffer();
                if (layers.game && layers.game.contentWindow) {
                    layers.game.contentWindow.postMessage({
                        type: 'VIDEO_BLOB_RESPONSE',
                        filename: filename,
                        buffer: buffer,
                        mime: res.headers.get('Content-Type') || 'video/mp4'
                    }, '*', [buffer]); // Transfer the buffer for performance
                }
            }
        } catch (e) {
            console.warn('[screen] Error obteniendo video blob para iframe:', e);
        }
    }
});
