const PORTAL_URL = 'https://portal.myplayad.com';
const POLL_INTERVAL = 10000; // 10 segundos

const standby = document.getElementById('standby');
const gameFrame = document.getElementById('game-frame');
const videoPlayer = document.getElementById('video-player');
const videoRankingOverlay = document.getElementById('video-ranking-overlay');
const videoRankingList = document.getElementById('video-ranking-list');
const upcomingContainer = document.getElementById('upcoming-games-container');
const upcomingList = document.getElementById('upcoming-games-list');

let screenId = new URLSearchParams(window.location.search).get('screenId');
let currentGameSlug = 'outrun';
let currentUrl = '';

let videoPlaylist = [];
let videoIndex = 0;
let playlistSyncInterval = null;
let upcomingGamesData = [];

// Ranking por defecto si aún no hay partidas registradas en el host
const defaultRanking = [
    { name: 'ACE', score: 9800 },
    { name: 'NEO', score: 8500 },
    { name: 'MAX', score: 7200 },
    { name: 'FOX', score: 6100 },
    { name: 'SAM', score: 5000 }
];

let cachedRanking = null;

// Escalar el contenedor del bisel del video simétricamente con el juego
function autoScaleVideo() {
    const section = document.querySelector('.video-section');
    const container = document.querySelector('.video-container');
    if (!section || !container) return;

    container.style.transform = 'none';
    const naturalW = 480;
    const naturalH = 470;

    const availableW = section.clientWidth || section.offsetWidth;
    const availableH = section.clientHeight || section.offsetHeight;
    if (!availableW || !availableH) return;

    const padding = 16;
    const scaleX = (availableW - padding) / naturalW;
    const scaleY = (availableH - padding) / naturalH;
    const scale = Math.max(0.1, Math.min(scaleX, scaleY));

    container.style.transform = `scale(${scale})`;

    // Avisar al iframe del juego para que re-escale su propio canvas
    if (gameFrame && gameFrame.contentWindow) {
        try {
            gameFrame.contentWindow.postMessage({ type: 'RESCALE' }, '*');
        } catch (_) {}
    }
}

window.addEventListener('resize', autoScaleVideo);
window.addEventListener('orientationchange', () => setTimeout(autoScaleVideo, 150));

// Sincronizar lista de videos locales
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
        console.warn('Error sincronizando playlist local vía cache:', e);
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
    
    if (videoPlayer.paused && videoPlaylist.length > 0 && videoRankingOverlay.classList.contains('hidden')) {
        playCurrentVideo();
    }
}

// Reproducir video actual
function playCurrentVideo() {
    if (!videoPlaylist.length) return;
    if (videoIndex >= videoPlaylist.length) videoIndex = 0;
    const filename = videoPlaylist[videoIndex];
    const localSrc = `/videos/${screenId}/${encodeURIComponent(filename)}`;
    const remoteSrc = `https://videos.myplayad.com/videos/${screenId}/${encodeURIComponent(filename)}`;
    
    videoPlayer.src = localSrc;
    
    videoPlayer.onerror = () => {
        if (videoPlayer.src.includes(localSrc)) {
            console.warn('Video local no encontrado, usando streaming remoto...');
            videoPlayer.src = remoteSrc;
            videoPlayer.load();
            videoPlayer.play().catch(e => console.warn('Autoplay bloqueado:', e));
        }
    };
    
    videoPlayer.muted = true;
    videoPlayer.defaultMuted = true;
    videoPlayer.setAttribute('muted', 'true');
    videoPlayer.setAttribute('playsinline', 'true');
    videoPlayer.setAttribute('autoplay', 'true');
    
    videoPlayer.load();
    const playPromise = videoPlayer.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.warn('Autoplay bloqueado:', e);
            setTimeout(() => {
                videoPlayer.muted = true;
                videoPlayer.play().catch(err => console.log('Re-intento fallido', err));
            }, 150);
        });
    }
}

// Cargar y renderizar el Ranking / Hall of Fame
function getRankingData() {
    if (cachedRanking && cachedRanking.length > 0) return cachedRanking;
    
    // Intentar leer de localStorage del juego actual o general
    try {
        const stored = localStorage.getItem(`${currentGameSlug}-ranking`) || localStorage.getItem('myplayad-ranking');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.slice(0, 5);
            }
        }
    } catch (_) {}

    return defaultRanking;
}

function renderRankingOverlay() {
    const ranking = getRankingData();
    if (videoRankingList) {
        videoRankingList.innerHTML = ranking.slice(0, 5).map((entry, index) => {
            const rankClass = index === 0 ? 'top-1' : (index === 1 ? 'top-2' : (index === 2 ? 'top-3' : ''));
            const rankPos = String(index + 1).padStart(2, '0');
            const nick = (entry.name || entry.nickname || 'PILOT').toUpperCase().slice(0, 8);
            const score = String(entry.score || 0).padStart(5, '0');
            return `
                <li class="${rankClass}">
                    <span class="pos">${rankPos}</span>
                    <span class="pilot">${nick}</span>
                    <span class="score">${score}</span>
                </li>
            `;
        }).join('');
    }

    if (upcomingGamesData && upcomingGamesData.length > 0) {
        upcomingList.innerHTML = upcomingGamesData.map(item => `
            <li>
                <span style="color:#60a5fa; font-weight:bold;">${item.name}</span>
                <span style="color:#cbd5e1;">${item.time}</span>
            </li>
        `).join('');
        upcomingContainer.classList.remove('hidden');
    } else {
        upcomingContainer.classList.add('hidden');
    }
}

// EVENTO FIN DE VIDEO: Rotación de videos y ranking de 5 segundos al terminar la secuencia completa
videoPlayer.onended = () => {
    videoIndex = videoIndex + 1;
    
    // Si terminó la secuencia completa de todos los videos de la playlist:
    if (videoIndex >= videoPlaylist.length) {
        videoIndex = 0;
        
        // Mostrar Ranking / Hall of Fame durante exactamente 5 segundos
        renderRankingOverlay();
        videoRankingOverlay.classList.remove('hidden');
        
        setTimeout(() => {
            videoRankingOverlay.classList.add('hidden');
            playCurrentVideo();
        }, 5000);
        return;
    }
    
    // Si aún quedan videos en la secuencia, reproducir el siguiente inmediatamente
    playCurrentVideo();
};

function getTargetGameUrl(slug) {
    const s = slug || new URLSearchParams(window.location.search).get('game') || 'outrun';
    currentGameSlug = s;
    return `/games/${s}/?screenId=${screenId || ''}`;
}

function loadGame(slug) {
    const targetUrl = getTargetGameUrl(slug);
    if (currentUrl !== targetUrl) {
        currentUrl = targetUrl;
        gameFrame.src = targetUrl;
    }
}

async function initialize() {
    if (!screenId) {
        try {
            const res = await fetch('/api/config');
            const config = await res.json();
            if (config.screenId) {
                screenId = config.screenId;
            }
        } catch (e) {
            console.warn('No se pudo obtener config de pantalla:', e);
        }
    }

    if (!screenId) {
        standby.innerHTML = '<div style="color:#ef4444; font-size:1.6rem; text-align:center;">Falta SCREEN_ID<br><small style="color:#94a3b8; font-size:1rem;">Configura la variable o usa ?screenId=</small></div>';
        return;
    }

    // Ocultar standby y activar layout simultáneo
    standby.classList.add('hidden');

    const urlParams = new URLSearchParams(window.location.search);
    const forcedGame = urlParams.get('game');
    
    // 1. Cargar juego arcade en el marco de la izquierda/arriba
    loadGame(forcedGame || 'outrun');

    // 2. Iniciar lista de videos y reproducción local en el marco de la derecha/abajo
    await syncLocalPlaylist();
    if (videoPlaylist.length > 0) {
        playCurrentVideo();
    }
    playlistSyncInterval = setInterval(syncLocalPlaylist, 30000);

    // Ajustar escalas
    setTimeout(autoScaleVideo, 200);

    // 3. Consultar programación periódica
    checkSchedule();
    setInterval(checkSchedule, POLL_INTERVAL);

    // 4. SSE para sincronización en tiempo real
    const eventSource = new EventSource('/api/sync-stream');
    eventSource.onmessage = (event) => {
        if (event.data === 'sync') {
            console.log('[SSE] Alerta de sincronización recibida');
            checkSchedule();
            syncLocalPlaylist();
        } else if (event.data === 'identify') {
            console.log('[SSE] Alerta de identificación');
            showIdentifyIndicator();
        }
    };
    eventSource.onerror = (err) => {
        console.warn('[SSE] EventSource error', err);
    };
}

async function checkSchedule() {
    if (!screenId) return;

    const urlParams = new URLSearchParams(window.location.search);
    const forcedGame = urlParams.get('game');
    if (forcedGame) {
        loadGame(forcedGame);
        return;
    }

    try {
        const res = await fetch(`${PORTAL_URL}/api/public/screens/${screenId}/current`);
        if (!res.ok) throw new Error(`Portal respondió status ${res.status}`);
        const data = await res.json();

        // Procesar próximos juegos para el overlay de ranking
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

            upcomingGamesData = Object.keys(gamesMap).map(name => ({
                name: name,
                time: gamesMap[name].join(' / ')
            }));
        } else {
            upcomingGamesData = [];
        }

        // Si hay un juego específico programado en este bloque
        if (data.type === 'game') {
            const gameUrl = data.url || getTargetGameUrl('outrun');
            if (currentUrl !== gameUrl) {
                currentUrl = gameUrl;
                gameFrame.src = gameUrl;
            }
        }

    } catch (err) {
        console.warn('Error consultando programación del portal:', err.message);
    }
}

// Identificación
let identifyTimeout = null;
function showIdentifyIndicator() {
    const indicator = document.getElementById('identify-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        if (identifyTimeout) clearTimeout(identifyTimeout);
        identifyTimeout = setTimeout(() => {
            indicator.classList.add('hidden');
        }, 5000);
    }
}

// Escuchar mensajes del juego en iframe (ranking, cache, blob)
window.addEventListener('message', async (event) => {
    if (!event.data) return;

    if (event.data.type === 'RANKING_UPDATE') {
        if (Array.isArray(event.data.ranking)) {
            cachedRanking = event.data.ranking;
            if (event.data.slug) {
                localStorage.setItem(`${event.data.slug}-ranking`, JSON.stringify(cachedRanking));
            }
        }
    } else if (event.data.type === 'FETCH_LOCAL_CACHE') {
        const sId = event.data.screenId || screenId;
        if (!sId) return;
        try {
            const cacheRes = await fetch(`/api/cache/${sId}`);
            if (cacheRes.ok) {
                const cacheData = await cacheRes.json();
                if (gameFrame && gameFrame.contentWindow) {
                    gameFrame.contentWindow.postMessage({
                        type: 'LOCAL_CACHE_RESPONSE',
                        data: cacheData
                    }, '*');
                }
            }
        } catch (e) {
            console.warn('[screen] Error obteniendo cache para iframe:', e);
        }
    } else if (event.data.type === 'FETCH_VIDEO_BLOB') {
        const { screenId: sId, filename } = event.data;
        if (!sId || !filename) return;
        try {
            const res = await fetch(`/videos/${sId}/${encodeURIComponent(filename)}`);
            if (res.ok) {
                const buffer = await res.arrayBuffer();
                if (gameFrame && gameFrame.contentWindow) {
                    gameFrame.contentWindow.postMessage({
                        type: 'VIDEO_BLOB_RESPONSE',
                        filename: filename,
                        buffer: buffer,
                        mime: res.headers.get('Content-Type') || 'video/mp4'
                    }, '*', [buffer]);
                }
            }
        } catch (e) {
            console.warn('[screen] Error obteniendo video blob para iframe:', e);
        }
    }
});

// Inicializar pantalla
initialize();
