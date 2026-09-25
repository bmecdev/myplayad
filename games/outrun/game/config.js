// Archivo de Configuración para OutRun Retro Arcade
const isDevHost = typeof window !== 'undefined' && (
    window.location.hostname.includes('dev') || 
    window.location.hostname.includes('staging') || 
    window.location.hostname.includes('test')
);

const CONFIG = {
    SIGNALING_SERVER_IP: '192.168.40.20', 
    SIGNALING_SERVER_PORT: '8080',
    SIGNALING_SERVER_URL: 'signaling.myplayad.com',
    CONTROL_URL: isDevHost 
        ? 'https://dev-controllers.myplayad.com/outrun' 
        : 'https://controllers.myplayad.com/outrun',
    MAX_PLAYERS: 1,
    VIDEO_SERVER_URL: 'https://videos.myplayad.com',
    LOCAL_VIDEO_SERVER_URL: 'http://localhost:8090',
    API_URL: 'https://portal.myplayad.com'
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
    return { iceServers: CONFIG.DEFAULT_ICE_SERVERS };
}

function attachPCDiagnostics(pc, label = 'pc') {
    if (!pc) return;
    pc.addEventListener('icecandidate', (e) => {
        console.log(`[webrtc][${label}] onicecandidate:`, e.candidate);
    });
    pc.addEventListener('iceconnectionstatechange', () => {
        console.log(`[webrtc][${label}] iceConnectionState:`, pc.iceConnectionState);
    });
    pc.addEventListener('connectionstatechange', () => {
        console.log(`[webrtc][${label}] connectionState:`, pc.connectionState);
    });
    pc.addEventListener('signalingstatechange', () => {
        console.log(`[webrtc][${label}] signalingState:`, pc.signalingState);
    });
}

function attachDataChannelDiagnostics(dc, label = 'dc') {
    if (!dc) return;
    dc.addEventListener('open', () => console.log(`[webrtc][${label}] open, readyState=${dc.readyState}`));
    dc.addEventListener('close', () => console.log(`[webrtc][${label}] close, readyState=${dc.readyState}`));
    dc.addEventListener('error', (e) => console.error(`[webrtc][${label}] error`, e));
    dc.addEventListener('message', (e) => console.log(`[webrtc][${label}] message`, e.data));
}

window.GAME_CONFIG = window.GAME_CONFIG || {};
window.GAME_CONFIG.CONFIG = CONFIG;
window.GAME_CONFIG.getIceConfig = getIceConfig;
window.GAME_CONFIG.attachPCDiagnostics = attachPCDiagnostics;
window.GAME_CONFIG.attachDataChannelDiagnostics = attachDataChannelDiagnostics;

