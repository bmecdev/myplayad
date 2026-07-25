const PORTAL_URL = 'https://portal.myplayad.com';
const POLL_INTERVAL = 10000; // 10 seconds

const layers = {
    standby: document.getElementById('standby'),
    video: document.getElementById('video-player'),
    game: document.getElementById('game-frame')
};

let currentType = 'standby';
let currentUrl = '';
let screenId = new URLSearchParams(window.location.search).get('screenId');

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

        if (data.type === 'standby' || !data.type) {
            setActiveLayer('standby');
            currentUrl = '';
            return;
        }

        if (data.type === 'video') {
            if (currentUrl !== data.url) {
                currentUrl = data.url;
                
                let localSrc = '';
                try {
                    const urlObj = new URL(data.url);
                    localSrc = '/videos' + urlObj.pathname;
                    layers.video.src = localSrc;
                } catch(e) {
                    layers.video.src = data.url;
                }
                
                // Fallback a streaming remoto si el archivo local no existe o aún se está descargando
                layers.video.onerror = () => {
                    if (layers.video.src.includes(localSrc)) {
                        console.warn('Video local no encontrado, usando streaming remoto como fallback...');
                        layers.video.src = data.url;
                        layers.video.load();
                        if (currentType === 'video') {
                            layers.video.play().catch(e => console.warn('Autoplay bloqueado:', e));
                        }
                    }
                };

                layers.video.load();
                
                // Disparar sincronización inmediata al servidor local para que lo descargue en background
                if (localSrc) {
                    fetch(`/api/cache/${screenId}`).catch(e => console.warn('Auto-sync omitido (probablemente sin server local)', e));
                }
            }
            setActiveLayer('video');
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
