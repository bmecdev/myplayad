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

if (!screenId) {
    // If not provided, fallback to asking the user or showing an error
    layers.standby.innerHTML = '<div style="color:red; font-size:2rem;">Falta ?screenId en la URL</div>';
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
                // Actually, the server.js caches videos locally. 
                // So instead of fetching from videos.myplayad.com, we can fetch from localhost if we know the filename.
                // data.url gives us the full url, let's extract the path
                try {
                    const urlObj = new URL(data.url);
                    // urlObj.pathname is like /bd02d2.../video.mp4
                    layers.video.src = '/videos' + urlObj.pathname; 
                } catch(e) {
                    layers.video.src = data.url; // fallback to remote
                }
                layers.video.load();
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

// Initial check
if (screenId) {
    checkSchedule();
    setInterval(checkSchedule, POLL_INTERVAL);
}
