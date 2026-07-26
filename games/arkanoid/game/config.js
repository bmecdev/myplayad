// Archivo de Configuración (Equivalente a .env para el navegador)
const CONFIG = {
    // Pon aquí la IP de tu servidor de señalización
    SIGNALING_SERVER_IP: '192.168.40.20', 
    SIGNALING_SERVER_PORT: '8080',
    SIGNALING_SERVER_URL: 'signaling.myplayad.com',
    CONTROL_URL: 'https://controllers.myplayad.com/invaders',
    MAX_PLAYERS: 1,
    // Origen remoto de videos (internet)
    VIDEO_SERVER_URL: 'https://videos.myplayad.com',
    // Cache local en la pantalla (localhost)
    LOCAL_VIDEO_SERVER_URL: 'http://localhost:8090'
};

// Ajustes de TURN/ICE y utilidades de diagnóstico WebRTC
// Rellene `TURN_PUBLIC_IP` y `TURN_PASS` en runtime o usando localStorage.
CONFIG.TURN_PUBLIC_IP = localStorage.getItem('TURN_PUBLIC_IP') || '31.97.43.72';
CONFIG.TURN_USERNAME = localStorage.getItem('TURN_USER') || 'game';
CONFIG.TURN_PASS = localStorage.getItem('TURN_PASS') || 'changeme';

CONFIG.DEFAULT_ICE_SERVERS = [
    { urls: [ `stun:stun.l.google.com:19302` ] },
    // TURN (UDP/TCP)
    { urls: [ `turn:${CONFIG.TURN_PUBLIC_IP}:3478?transport=udp`, `turn:${CONFIG.TURN_PUBLIC_IP}:3478?transport=tcp` ], username: CONFIG.TURN_USERNAME, credential: CONFIG.TURN_PASS },
    // TLS (fallback)
    { urls: [ `turns:${CONFIG.TURN_PUBLIC_IP}:5349` ], username: CONFIG.TURN_USERNAME, credential: CONFIG.TURN_PASS }
];

// Dev helper: devuelve iceServers actuales (útil para crear RTCPeerConnection)
function getIceConfig() {
    return { iceServers: CONFIG.DEFAULT_ICE_SERVERS };
}

// Adjunta logs y handlers útiles a un RTCPeerConnection para diagnóstico
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

// Adjunta logs a un RTCDataChannel
function attachDataChannelDiagnostics(dc, label = 'dc') {
    if (!dc) return;
    dc.addEventListener('open', () => console.log(`[webrtc][${label}] open, readyState=${dc.readyState}`));
    dc.addEventListener('close', () => console.log(`[webrtc][${label}] close, readyState=${dc.readyState}`));
    dc.addEventListener('error', (e) => console.error(`[webrtc][${label}] error`, e));
    dc.addEventListener('message', (e) => console.log(`[webrtc][${label}] message`, e.data));
}

// Exportar helpers para que el resto del código del juego los use
window.GAME_CONFIG = window.GAME_CONFIG || {};
window.GAME_CONFIG.CONFIG = CONFIG;
window.GAME_CONFIG.getIceConfig = getIceConfig;
window.GAME_CONFIG.attachPCDiagnostics = attachPCDiagnostics;
window.GAME_CONFIG.attachDataChannelDiagnostics = attachDataChannelDiagnostics;

// Para pruebas rápidas en consola del navegador:
// localStorage.setItem('TURN_PUBLIC_IP','1.2.3.4'); localStorage.setItem('TURN_PASS','miPass'); location.reload();
