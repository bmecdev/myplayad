// Archivo de Configuración - Circus Charlie (Pantalla Arcade)
const isDevHost = typeof window !== 'undefined' && (
    window.location.hostname.includes('dev') || 
    window.location.hostname.includes('staging') || 
    window.location.hostname.includes('test') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:' ||
    !window.location.hostname
);

const CONFIG = {
    SIGNALING_SERVER_IP: '192.168.40.20', 
    SIGNALING_SERVER_PORT: '8080',
    SIGNALING_SERVER_URL: 'signaling.myplayad.com',
    CONTROL_URL: isDevHost 
        ? 'https://dev-controllers.myplayad.com/circus' 
        : 'https://controllers.myplayad.com/circus',
    MAX_PLAYERS: 1,
    VIDEO_SERVER_URL: isDevHost 
        ? 'https://dev-videos.myplayad.com' 
        : 'https://videos.myplayad.com',
    LOCAL_VIDEO_SERVER_URL: 'http://localhost:8090'
};

CONFIG.TURN_PUBLIC_IP = localStorage.getItem('TURN_PUBLIC_IP') || '31.97.43.72';
CONFIG.TURN_USERNAME = localStorage.getItem('TURN_USER') || 'game';
CONFIG.TURN_PASS = localStorage.getItem('TURN_PASS') || 'changeme';

CONFIG.DEFAULT_ICE_SERVERS = [
    { urls: [ 'stun:stun.l.google.com:19302' ] },
    { urls: [ `turn:${CONFIG.TURN_PUBLIC_IP}:3478?transport=udp`, `turn:${CONFIG.TURN_PUBLIC_IP}:3478?transport=tcp` ], username: CONFIG.TURN_USERNAME, credential: CONFIG.TURN_PASS },
    { urls: [ `turns:${CONFIG.TURN_PUBLIC_IP}:5349` ], username: CONFIG.TURN_USERNAME, credential: CONFIG.TURN_PASS }
];

function getIceConfig() {
    return {
        iceServers: CONFIG.DEFAULT_ICE_SERVERS,
        iceCandidatePoolSize: 2
    };
}

window.GAME_CONFIG = {
    getIceConfig: getIceConfig
};
