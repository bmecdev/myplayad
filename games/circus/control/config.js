// Configuración del Cliente Móvil - Circus Charlie Control
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
    SIGNALING_SERVER_URL: 'signaling.myplayad.com'
};
