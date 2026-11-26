const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const playerNickElement = document.getElementById('player-nick');
const livesCountElement = document.getElementById('lives-count');
const gameOverOverlay = document.getElementById('game-over-overlay');
const waitingOverlay = document.getElementById('waiting-overlay');
const mainScreen = document.getElementById('main-screen');
const rankingList = document.getElementById('ranking-list');
const videoRankingList = document.getElementById('video-ranking-list');
const qrContainer = document.getElementById('qrcode');
const iceRouteElement = document.getElementById('ice-route');
const adVideoOverlay = document.getElementById('ad-video-overlay');
const adVideoPlayer = document.getElementById('ad-video-player');
const adCountdown = document.getElementById('ad-countdown');
const adPilotName = document.getElementById('ad-pilot-name');
let cachedAdVideoUrl = null;

// WebRTC State (Declarado al inicio para acceso global en broadcastSFX)
const peerConnections = new Map();
const dataChannels = new Map();
let socket;

// Retro Arcade Web Audio API Synthesizer
class ArkanoidAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.adMuted = false;
    }

    init() {
        if (this.adMuted || (typeof GameState !== 'undefined' && GameState.adPlaying)) return;
        if (!this.ctx) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            } catch (e) {
                console.warn('Audio no soportado:', e);
            }
        }
        this.resume();
    }

    setMutedForAd(muted) {
        this.adMuted = Boolean(muted);
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            if (this.masterGain) {
                this.masterGain.gain.cancelScheduledValues(now);
                this.masterGain.gain.setValueAtTime(this.adMuted ? 0 : 0.45, now);
            }
            if (this.adMuted) {
                if (this.ctx.state === 'running') {
                    this.ctx.suspend().catch(() => {});
                }
            } else {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().then(() => this.updateUI()).catch(() => {});
                }
            }
        } catch (e) {}
    }

    resume() {
        if (this.adMuted || (typeof GameState !== 'undefined' && GameState.adPlaying)) return;
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => this.updateUI()).catch(() => {});
        } else if (this.ctx && this.ctx.state === 'running') {
            this.updateUI();
        }
    }

    updateUI() {
        const btn = document.getElementById('audio-toggle-btn');
        if (!btn) return;
        if (this.ctx && this.ctx.state === 'running') {
            btn.textContent = '🔊 AUDIO: ON';
            btn.classList.remove('muted');
        } else {
            btn.textContent = '🔇 CLIC AUDIO';
            btn.classList.add('muted');
        }
    }

    playBeep() {
        if (this.adMuted || GameState.adPlaying) return;
        if (!this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (e) {}
    }

    playPaddle() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('paddle');
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.linearRampToValueAtTime(880, t + 0.08);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (e) {}
    }

    playWall() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('wall');
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(280, t);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.06);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.06);
        } catch (e) {}
    }

    playBrick(row) {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('brick', row);
        if (!this.ctx) return;
        this.resume();
        try {
            const freqs = [880, 784, 659, 587, 523];
            const freq = freqs[row] || 600;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.linearRampToValueAtTime(freq * 1.5, t + 0.07);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.07);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.07);
        } catch (e) {}
    }

    playLaunch() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('launch');
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.linearRampToValueAtTime(960, t + 0.12);
            gain.gain.setValueAtTime(0.24, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.12);
        } catch (e) {}
    }

    playLifeLost() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('lifeLost');
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.linearRampToValueAtTime(90, t + 0.35);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.35);
        } catch (e) {}
    }

    playLevelClear() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('levelClear');
        if (!this.ctx) return;
        this.resume();
        const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + idx * 0.08);
            gain.gain.setValueAtTime(0.26, t + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.08 + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.08);
            osc.stop(t + idx * 0.08 + 0.13);
        });
    }

    playStart() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('start');
        if (!this.ctx) return;
        this.resume();
        const notes = [440, 554.37, 659.25, 880];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + idx * 0.07);
            gain.gain.setValueAtTime(0.24, t + idx * 0.07);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.07 + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.07);
            osc.stop(t + idx * 0.07 + 0.11);
        });
    }

    playGameOver() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('gameover');
        if (!this.ctx) return;
        this.resume();
        const notes = [440, 370, 311, 261];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + idx * 0.14);
            gain.gain.setValueAtTime(0.3, t + idx * 0.14);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.14 + 0.18);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.14);
            osc.stop(t + idx * 0.14 + 0.2);
        });
    }
}
const audio = new ArkanoidAudio();

function broadcastSFX(sound, param = null) {
    if (typeof GameState !== 'undefined' && (GameState.adPlaying || GameState.isDemo)) return;
    if (typeof dataChannels === 'undefined') return;
    const payload = JSON.stringify({ type: 'sfx', sound, param });
    dataChannels.forEach(ch => {
        if (ch && ch.readyState === 'open') {
            try { ch.send(payload); } catch (e) {}
        }
    });
}

// Desbloqueo y gestión global de audio en cualquier interacción
['pointerdown', 'click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
        if (typeof GameState !== 'undefined' && GameState.adPlaying) return;
        if (!audio.ctx) audio.init();
        else audio.resume();
    }, { passive: true });
});

window.addEventListener('DOMContentLoaded', () => {
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!audio.ctx) audio.init();
            else audio.resume();
            audio.playBeep();
        });
    }
});

// Configuration
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;

const PADDLE_HEIGHT = 6;
const PADDLE_WIDTH = 40;
const BALL_RADIUS = 3;

const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 8;
const BRICK_WIDTH = 20;
const BRICK_HEIGHT = 8;
const BRICK_PADDING = 2;
const BRICK_OFFSET_TOP = 20;
const BRICK_OFFSET_LEFT = 13;

const BRICK_COLORS = ['#ff00ea', '#00f3ff', '#0088cc', '#ffffff', '#cccccc'];

// Calibración arcade de velocidad optimizada para fluidez en RPi 4/5
const INITIAL_BALL_SPEED = 180;
const MAX_BALL_SPEED = 250;
const PADDLE_SPEED = 420;

const GameState = {
    score: 0,
    highScore: 0,
    lives: 3,
    running: false,
    gameOver: false,
    adPlaying: false,
    paused: false,
    isDemo: false,
    _demoLaunchTimer: null,
    lastTime: 0,
    paddle: {
        x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
        y: CANVAS_HEIGHT - PADDLE_HEIGHT - 5,
        targetX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
        dx: 0,
        speed: PADDLE_SPEED
    },
    ball: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
        dx: 0,
        dy: 0,
        speed: INITIAL_BALL_SPEED,
        baseSpeed: INITIAL_BALL_SPEED,
        launched: false
    },
    bricks: [],
    currentNickname: 'Player',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase()
};

// Initialize bricks
function initBricks() {
    GameState.bricks = [];
    for(let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        GameState.bricks[c] = [];
        for(let r = 0; r < BRICK_ROW_COUNT; r++) {
            GameState.bricks[c][r] = { x: 0, y: 0, status: 1, color: BRICK_COLORS[r] };
        }
    }
}

// WebRTC Reconnect State

const signalingState = {
    shouldReconnect: true,
    manualClose: false,
    reconnectAttempts: 0,
    reconnectTimer: null,
    baseDelay: 1000,
    maxAttempts: 8
};

function getIceConfig() {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnPublicIp = localStorage.getItem('TURN_PUBLIC_IP');
    let turnUser = localStorage.getItem('TURN_USER') || 'game';
    if (turnUser === 'user') turnUser = 'game';
    const turnPass = localStorage.getItem('TURN_PASS') || 'changeme';

    if (turnPublicIp && turnUser && turnPass) {
        iceServers.push({
            urls: [
                `turn:${turnPublicIp}:3478?transport=udp`,
                `turn:${turnPublicIp}:3478?transport=tcp`,
                `turn:${turnPublicIp}:5349?transport=udp`,
                `turn:${turnPublicIp}:5349?transport=tcp`
            ],
            username: turnUser,
            credential: turnPass
        });
    }
    return { iceServers };
}

function loadTurnParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const turnIp = urlParams.get('turn_ip');
    const turnUser = urlParams.get('turn_user');
    const turnPass = urlParams.get('turn_pass');

    if (turnIp) localStorage.setItem('TURN_PUBLIC_IP', turnIp);
    if (turnUser) localStorage.setItem('TURN_USER', turnUser);
    if (turnPass) localStorage.setItem('TURN_PASS', turnPass);
}

window.addEventListener('load', loadTurnParams);

function setIceRouteText(text) {
    if (iceRouteElement) {
        iceRouteElement.textContent = `ICE: ${text}`;
    }
}

function getIceRouteType(stats) {
    let selectedPair = null;
    let localCandidate = null;

    stats.forEach(report => {
        if (report.type === 'candidate-pair' && (report.selected || report.state === 'succeeded' || report.selectedCandidatePairId)) {
            selectedPair = report;
        }
    });

    if (!selectedPair) {
        stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                selectedPair = report;
            }
        });
    }

    if (selectedPair) {
        stats.forEach(report => {
            if (report.type === 'local-candidate' && report.id === selectedPair.localCandidateId) {
                localCandidate = report;
            }
        });
        if (localCandidate) {
            return localCandidate.candidateType === 'relay' ? 'TURN' : 'STUN';
        }
    }
    return null;
}

function refreshIceRoute(pc) {
    pc.getStats().then(stats => {
        const routeType = getIceRouteType(stats);
        if (routeType) {
            setIceRouteText(routeType);
        } else {
            setIceRouteText('Buscando...');
        }
    }).catch(err => {
        console.error('Error getting stats:', err);
        setIceRouteText('ERR');
    });
}

function scheduleSignalingReconnect() {
    if (!signalingState.shouldReconnect || signalingState.manualClose) return;
    
    if (signalingState.reconnectAttempts >= signalingState.maxAttempts) {
        console.error('Max reconnect attempts reached');
        setIceRouteText('DESC');
        return;
    }

    const delay = Math.min(
        signalingState.baseDelay * Math.pow(2, signalingState.reconnectAttempts),
        30000
    );

    console.log(`Reconectando señalización en ${delay}ms... (Intento ${signalingState.reconnectAttempts + 1})`);
    
    if (signalingState.reconnectTimer) {
        clearTimeout(signalingState.reconnectTimer);
    }

    signalingState.reconnectTimer = setTimeout(() => {
        signalingState.reconnectAttempts++;
        connectSignalingServer();
    }, delay);
}

function resetSignalingReconnect() {
    signalingState.reconnectAttempts = 0;
    if (signalingState.reconnectTimer) {
        clearTimeout(signalingState.reconnectTimer);
        signalingState.reconnectTimer = null;
    }
}

function connectSignalingServer() {
    if (socket && socket.readyState === WebSocket.OPEN) return;

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const serverUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const signalingUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `wss://${serverUrl}`;

    resetSignalingReconnect();
    updateQrCode();
    const currentSocket = socket = new WebSocket(signalingUrl);

    currentSocket.onopen = () => {
        if (socket !== currentSocket) return;
        console.log('Conectado al servidor de señalización (Sala: ' + GameState.roomId + ')');
        document.getElementById('room-id').textContent = `ROOM: ${GameState.roomId}`;
        socket.send(JSON.stringify({ 
            type: 'register', 
            role: 'host', 
            roomId: GameState.roomId,
            maxPlayers: CONFIG.MAX_PLAYERS 
        }));
    };

    currentSocket.onerror = (error) => {
        if (socket !== currentSocket) return;
        console.error('WebSocket error:', error);
    };

    currentSocket.onclose = (event) => {
        if (socket !== currentSocket) return;
        console.warn('WebSocket cerrado:', event);
        if (!signalingState.manualClose) {
            scheduleSignalingReconnect();
        }
    };

    currentSocket.onmessage = async (message) => {
        try {
            const data = JSON.parse(message.data);

            if (data.type === 'offer') {
                await handleOffer(data);
            } else if (data.type === 'candidate') {
                const pc = peerConnections.get(data.playerId);
                if (pc && data.candidate) {
                    if (pc.remoteDescription) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (_) {}
                    } else if (pc._pendingCandidates) {
                        pc._pendingCandidates.push(data.candidate);
                    }
                }
            } else if (data.type === 'controller_connected') {
                waitingOverlay.classList.add('hidden');
            } else if (data.type === 'controller_disconnected') {
                if (data.reason === 'leave') {
                    handleControllerDisconnect(data.playerId, true);
                    return;
                }
                const dc = dataChannels.get(data.playerId);
                const recentlyActive = dc && dc.readyState === 'open' && dc._lastSeen && (Date.now() - dc._lastSeen < 5000);
                if (recentlyActive && !GameState.adPlaying) {
                    console.log(`[signaling] Ignorando controller_disconnected transitorio para player ${data.playerId}: DataChannel activo`);
                    return;
                }
                handleControllerDisconnect(data.playerId, true);
            }
        } catch (e) {
            console.error('Error procesando mensaje de señalización:', e);
        }
    };
}

// ==========================================
// 📺 Sistema de Publicidad Pre-Juego
// ==========================================
function broadcastToControllers(msg) {
    const payload = JSON.stringify(msg);
    dataChannels.forEach(dc => {
        if (dc && dc.readyState === 'open') {
            try { dc.send(payload); } catch (_) {}
        }
    });
}

let adVideoPromise = null;

function requestAdVideo() {
    if (!cachedAdVideoUrl) {
        try {
            const urlAd = new URLSearchParams(window.location.search).get('adVideo');
            if (urlAd) cachedAdVideoUrl = decodeURIComponent(urlAd);
        } catch (_) {}
    }
    if (cachedAdVideoUrl) return Promise.resolve(cachedAdVideoUrl);
    if (adVideoPromise) return adVideoPromise;

    adVideoPromise = new Promise((resolve) => {
        if (cachedAdVideoUrl) return resolve(cachedAdVideoUrl);

        const sId = new URLSearchParams(window.location.search).get('screenId');
        const isDev = typeof window !== 'undefined' && (
            window.location.hostname.includes('dev') ||
            window.location.hostname.includes('staging') ||
            window.location.hostname.includes('test')
        );
        const videoServer = (typeof CONFIG !== 'undefined' && CONFIG.VIDEO_SERVER_URL)
            ? CONFIG.VIDEO_SERVER_URL
            : (isDev ? 'https://dev-videos.myplayad.com' : 'https://videos.myplayad.com');

        let settled = false;
        const finalize = (url) => {
            if (settled) return;
            settled = true;
            if (url) {
                cachedAdVideoUrl = url;
            } else {
                adVideoPromise = null;
            }
            resolve(cachedAdVideoUrl || null);
        };

        const msgHandler = (event) => {
            if (event.data && event.data.type === 'AD_VIDEO_RESPONSE') {
                window.removeEventListener('message', msgHandler);
                finalize(event.data.videoUrl || null);
            }
        };
        window.addEventListener('message', msgHandler);

        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage({ type: 'GET_AD_VIDEO' }, '*'); } catch (_) {}
        }

        if (sId) {
            fetch(`${videoServer}/api/videos/${sId}`)
                .then(r => r.ok ? r.json() : null)
                .then(d => {
                    if (d && d.videos && d.videos.length > 0) {
                        const rawName = d.videos[0] || '';
                        const cleanName = rawName.split('/').pop();
                        const fullUrl = `${videoServer}/videos/${sId}/${encodeURIComponent(cleanName)}`;
                        finalize(fullUrl);
                    }
                })
                .catch(() => {});
        }

        setTimeout(() => {
            window.removeEventListener('message', msgHandler);
            finalize(cachedAdVideoUrl || null);
        }, 1200);
    });

    return adVideoPromise;
}

window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'AD_VIDEO_RESPONSE') {
        if (event.data.videoUrl) {
            cachedAdVideoUrl = event.data.videoUrl;
        }
    }
});

function playPreGameAdThenStart(nickname, startGameCallback) {
    if (GameState.adPlaying) return;

    // Congelar inmediatamente el juego y silenciar todo audio del juego para no mezclarse con la publicidad
    GameState.adPlaying = true;
    GameState.isDemo = false;
    GameState.running = false;
    GameState.paused = true;
    audio.setMutedForAd(true);

    if (waitingOverlay) waitingOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');

    const startDirectlyWithoutAd = () => {
        GameState.adPlaying = false;
        GameState.paused = false;
        audio.setMutedForAd(false);
        broadcastToControllers({ type: 'game_start' });
        startGameCallback();
    };

    if (!adVideoOverlay || !adVideoPlayer) {
        startDirectlyWithoutAd();
        return;
    }

    const startAdPlayback = (videoUrl) => {
        if (!videoUrl) {
            console.log('[ad] No hay video publicitario configurado. Arrancando partida de una.');
            startDirectlyWithoutAd();
            return;
        }

        // SOLO avisar al celular si REALMENTE hay un video publicitario válido para reproducir
        broadcastToControllers({ type: 'ad_playing', nickname: nickname });

        GameState.adPlaying = true;
        if (adPilotName) adPilotName.textContent = `PILOTO: ${(nickname || 'PILOT').toUpperCase()}`;
        if (adCountdown) adCountdown.textContent = 'INICIANDO...';
        adVideoOverlay.classList.remove('hidden');

        // Latido continuo para mantener vivo WebRTC / NAT en móviles durante el video
        let adHeartbeatInterval = setInterval(() => {
            if (!GameState.adPlaying) {
                clearInterval(adHeartbeatInterval);
                return;
            }
            broadcastToControllers({ type: 'ad_heartbeat', t: Date.now() });
        }, 2000);

        // Avisar a la pantalla principal para pausar el reproductor lateral
        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage({ type: 'GAME_AD_START' }, '*'); } catch (_) {}
        }

        let adFinished = false;
        let safetyTimer = null;

        const finishAd = () => {
            if (adFinished) return;
            adFinished = true;
            if (safetyTimer) clearTimeout(safetyTimer);
            if (adHeartbeatInterval) clearInterval(adHeartbeatInterval);

            adVideoPlayer.onended = null;
            adVideoPlayer.onerror = null;
            adVideoPlayer.ontimeupdate = null;

            try {
                adVideoPlayer.pause();
                adVideoPlayer.muted = true;
                adVideoPlayer.removeAttribute('src');
                adVideoPlayer.load();
            } catch (_) {}

            adVideoOverlay.classList.add('hidden');
            GameState.adPlaying = false;
            GameState.paused = false;
            audio.setMutedForAd(false);

            // Reanudar reproductor lateral
            if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'GAME_AD_END' }, '*'); } catch (_) {}
            }

            // Avisar a los celulares que el juego empezó (activar controles)
            broadcastToControllers({ type: 'game_start' });

            // Iniciar la partida
            startGameCallback();
        };

        const abortAd = () => {
            if (adFinished) return;
            adFinished = true;
            if (safetyTimer) clearTimeout(safetyTimer);
            if (adHeartbeatInterval) clearInterval(adHeartbeatInterval);

            adVideoPlayer.onended = null;
            adVideoPlayer.onerror = null;
            adVideoPlayer.ontimeupdate = null;

            try {
                adVideoPlayer.pause();
                adVideoPlayer.muted = true;
                adVideoPlayer.removeAttribute('src');
                adVideoPlayer.load();
            } catch (_) {}

            adVideoOverlay.classList.add('hidden');
            GameState.adPlaying = false;
            GameState.paused = false;
            audio.setMutedForAd(false);

            if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'GAME_AD_END' }, '*'); } catch (_) {}
            }
        };

        window._finishCurrentAd = finishAd;
        window._abortCurrentAd = abortAd;

        adVideoPlayer.onended = finishAd;
        adVideoPlayer.onerror = (err) => {
            console.warn('[ad] Error en video publicitario, omitiendo:', err);
            finishAd();
        };

        adVideoPlayer.ontimeupdate = () => {
            if (adVideoPlayer.duration && !isNaN(adVideoPlayer.duration)) {
                const remaining = Math.max(0, Math.ceil(adVideoPlayer.duration - adVideoPlayer.currentTime));
                if (adCountdown) adCountdown.textContent = `JUEGO EN: ${remaining}s`;
            }
        };

        adVideoPlayer.src = videoUrl;
        adVideoPlayer.currentTime = 0;
        adVideoPlayer.muted = false;

        const p = adVideoPlayer.play();
        if (p !== undefined) {
            p.catch(() => {
                console.warn('[ad] Autoplay con audio bloqueado, reintentando silenciado...');
                adVideoPlayer.muted = true;
                adVideoPlayer.play().catch(finishAd);
            });
        }

        safetyTimer = setTimeout(finishAd, 35000);
    };

    requestAdVideo().then((videoUrl) => {
        startAdPlayback(videoUrl);
    });
}

function handleControllerDisconnect(playerId, force = false) {
    const dc = dataChannels.get(playerId);
    const pc = peerConnections.get(playerId);

    if (!force && dc && dc.readyState === 'open') {
        console.log(`[webrtc] Desconexión ignorada para player ${playerId}: DataChannel sigue abierto`);
        return;
    }

    try { if (dc) dc.close(); } catch (_) {}
    try { if (pc) pc.close(); } catch (_) {}
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0 && !GameState.isDemo) {
        // Cancelar cualquier publicidad pre-juego en curso y restaurar estado inicial con nuevo QR
        if (typeof window._abortCurrentAd === 'function') {
            window._abortCurrentAd();
        } else if (GameState.adPlaying) {
            if (adVideoOverlay) adVideoOverlay.classList.add('hidden');
            GameState.adPlaying = false;
            GameState.paused = false;
            audio.setMutedForAd(false);
        }
        if (GameState._gameOverTimeout) {
            clearTimeout(GameState._gameOverTimeout);
            GameState._gameOverTimeout = null;
        }
        if (gameOverOverlay) gameOverOverlay.classList.add('hidden');

        // Generar nueva sala y código QR listo para el siguiente jugador
        GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const roomEl = document.getElementById('room-id');
        if (roomEl) roomEl.textContent = `ROOM: ${GameState.roomId}`;
        updateQrCode();
        if (socket && socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(JSON.stringify({
                    type: 'register',
                    role: 'host',
                    roomId: GameState.roomId,
                    maxPlayers: CONFIG.MAX_PLAYERS
                }));
            } catch (_) {}
        }
        startAttractMode();
    }
}

// Watchdog de desconexión silenciosa (si el celular cierra/pierde señal sin avisar)
setInterval(() => {
    if (peerConnections.size === 0 || GameState.isDemo) return;
    const now = Date.now();
    for (const [playerId, dc] of Array.from(dataChannels.entries())) {
        if (!dc || dc.readyState === 'closed' || dc.readyState === 'closing') {
            handleControllerDisconnect(playerId, true);
        } else if (dc._lastSeen && now - dc._lastSeen > 9000) {
            console.log(`[watchdog] Controlador ${playerId} inactivo >9s, regresando a QR`);
            handleControllerDisconnect(playerId, true);
        }
    }
}, 2000);

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) ? window.GAME_CONFIG.getIceConfig() : getIceConfig();
    const pc = new RTCPeerConnection(rtcConfig);
    pc._pendingCandidates = [];
    
    if (window.GAME_CONFIG && window.GAME_CONFIG.attachPCDiagnostics) {
        try { window.GAME_CONFIG.attachPCDiagnostics(pc, `pc-${playerId}`); } catch (e) {}
    }
    peerConnections.set(playerId, pc);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: 'candidate',
                candidate: event.candidate,
                playerId: playerId
            }));
        }
    };

    pc.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        dataChannels.set(playerId, receiveChannel);

        if (window.GAME_CONFIG && window.GAME_CONFIG.attachDataChannelDiagnostics) {
            try { window.GAME_CONFIG.attachDataChannelDiagnostics(receiveChannel, `dc-${playerId}`); } catch (e) {}
        }

        receiveChannel.onmessage = (e) => {
            receiveChannel._lastSeen = Date.now();
            try {
                const input = JSON.parse(e.data);
                if (input.type === 'ping' || input.type === 'ad_heartbeat_ack') return;
                if (input.type === 'leave') {
                    handleControllerDisconnect(playerId, true);
                    return;
                }
                if (input.type === 'nickname' || input.type === 'join') {
                    GameState.currentNickname = input.value || input.nickname || 'Player';
                    if (playerNickElement) playerNickElement.textContent = `PLAYER: ${GameState.currentNickname.toUpperCase()}`;
                    playPreGameAdThenStart(GameState.currentNickname, () => {
                        resetGame(); // Start game
                    });
                } else {
                    handleJoystickInput(input);
                }
            } catch (err) {}
        };

        receiveChannel.onopen = () => {
            receiveChannel._lastSeen = Date.now();
            waitingOverlay.classList.add('hidden');
            refreshIceRoute(pc);
        };

        receiveChannel.onclose = () => {
            handleControllerDisconnect(playerId, true);
        };
    };

    pc.oniceconnectionstatechange = () => {
        refreshIceRoute(pc);
        const state = pc.iceConnectionState;
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            handleControllerDisconnect(playerId, true);
        }
    };

    pc.onconnectionstatechange = () => {
        refreshIceRoute(pc);
        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            handleControllerDisconnect(playerId, true);
        }
    };

    await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
    while (pc._pendingCandidates && pc._pendingCandidates.length > 0) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(pc._pendingCandidates.shift()));
        } catch (_) {}
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    socket.send(JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        playerId: playerId
    }));
}

function handleJoystickInput(input) {
    if (GameState.adPlaying) return;
    if (input.fire) {
        if (!GameState.ball.launched && GameState.running && !GameState.gameOver) {
            GameState.ball.launched = true;
            // Angulo de lanzamiento entre 30 y 55 grados respecto a la vertical
            const angleDir = Math.random() > 0.5 ? 1 : -1;
            const angleRad = angleDir * (Math.PI / 6 + Math.random() * (Math.PI / 8));
            GameState.ball.dx = Math.sin(angleRad) * GameState.ball.speed;
            GameState.ball.dy = -Math.cos(angleRad) * GameState.ball.speed;
            audio.playLaunch();
        } else if (GameState.gameOver) {
            // Cannot restart from fire, must re-scan
        }
        return;
    }

    if (input.pos !== undefined) {
        // Deslizador táctil horizontal directo (0.0 a 1.0)
        const targetX = input.pos * (CANVAS_WIDTH - PADDLE_WIDTH);
        GameState.paddle.targetX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, targetX));
        GameState.paddle.dx = 0;
    } else if (input.x !== undefined) {
        // Fallback por velocidad
        GameState.paddle.targetX = undefined;
        const expX = Math.sign(input.x) * Math.pow(Math.abs(input.x), 1.1);
        GameState.paddle.dx = expX * GameState.paddle.speed;
    }
}

function notifyGameOver() {
    dataChannels.forEach(channel => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({ type: 'game_over', score: GameState.score }));
        }
    });
}

function resetBall() {
    GameState.ball.x = GameState.paddle.x + PADDLE_WIDTH / 2;
    GameState.ball.y = GameState.paddle.y - BALL_RADIUS - 2;
    GameState.ball.dx = 0;
    GameState.ball.dy = 0;
    GameState.ball.speed = GameState.ball.baseSpeed || INITIAL_BALL_SPEED;
    GameState.ball.launched = false;
}

function resetGame() {
    stopAttractMode();
    GameState.isDemo = false;
    GameState.adPlaying = false;
    GameState.paused = false;
    audio.setMutedForAd(false);
    if (window.parent && window.parent !== window) {
        try { window.parent.postMessage({ type: 'GAME_PLAY_START' }, '*'); } catch (_) {}
    }
    audio.playStart();
    GameState.score = 0;
    GameState.lives = 3;
    GameState.gameOver = false;
    GameState.running = true;
    GameState.ball.baseSpeed = INITIAL_BALL_SPEED;
    GameState.ball.speed = INITIAL_BALL_SPEED;
    GameState.paddle.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    GameState.paddle.targetX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    GameState.paddle.dx = 0;
    initBricks();
    resetBall();
    updateUI();
    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
}

function updateBotPaddle(dt) {
    if (!GameState.isDemo) return;

    // Si la pelota aún no ha sido lanzada, lanzarla tras un breve retraso
    if (!GameState.ball.launched) {
        if (!GameState._demoLaunchTimer) GameState._demoLaunchTimer = Date.now();
        if (Date.now() - GameState._demoLaunchTimer > 400) {
            GameState.ball.launched = true;
            const angleDir = Math.random() > 0.5 ? 1 : -1;
            const angleRad = angleDir * (Math.PI / 6 + Math.random() * (Math.PI / 8));
            GameState.ball.dx = Math.sin(angleRad) * GameState.ball.speed;
            GameState.ball.dy = -Math.cos(angleRad) * GameState.ball.speed;
            GameState._demoLaunchTimer = null;
        }
        return;
    }

    // Predicción de intercepción de la pelota
    let targetX = GameState.ball.x - PADDLE_WIDTH / 2;
    if (GameState.ball.dy > 0) {
        const timeToPaddle = (GameState.paddle.y - GameState.ball.y) / GameState.ball.dy;
        if (timeToPaddle > 0 && timeToPaddle < 3.0) {
            let predictedX = GameState.ball.x + GameState.ball.dx * timeToPaddle;
            let bounces = 0;
            while ((predictedX < BALL_RADIUS || predictedX > CANVAS_WIDTH - BALL_RADIUS) && bounces < 6) {
                if (predictedX < BALL_RADIUS) {
                    predictedX = 2 * BALL_RADIUS - predictedX;
                } else if (predictedX > CANVAS_WIDTH - BALL_RADIUS) {
                    predictedX = 2 * (CANVAS_WIDTH - BALL_RADIUS) - predictedX;
                }
                bounces++;
            }
            const humanDrift = Math.sin(Date.now() / 450) * 6;
            targetX = predictedX - PADDLE_WIDTH / 2 + humanDrift;
        }
    } else {
        // En ascenso, la paleta acompaña suavemente la trayectoria horizontal de la bola
        targetX = GameState.ball.x - PADDLE_WIDTH / 2;
    }

    targetX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, targetX));
    GameState.paddle.targetX = targetX;
}

function updateStep(dt) {
    // Asegurar ladrillos inicializados
    if (!GameState.bricks || !Array.isArray(GameState.bricks) || GameState.bricks.length < BRICK_COLUMN_COUNT) {
        initBricks();
    }

    // Sanidad numérica de coordenadas
    if (isNaN(GameState.paddle.x)) GameState.paddle.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    if (isNaN(GameState.paddle.y)) GameState.paddle.y = CANVAS_HEIGHT - PADDLE_HEIGHT - 5;
    if (isNaN(GameState.ball.x)) GameState.ball.x = CANVAS_WIDTH / 2;
    if (isNaN(GameState.ball.y)) GameState.ball.y = CANVAS_HEIGHT - PADDLE_HEIGHT - 10;
    if (isNaN(GameState.ball.dx)) GameState.ball.dx = 0;
    if (isNaN(GameState.ball.dy)) GameState.ball.dy = 0;
    if (isNaN(GameState.ball.speed) || GameState.ball.speed <= 0) GameState.ball.speed = INITIAL_BALL_SPEED;

    // 0. Inteligencia Artificial en Modo Demostración
    if (GameState.isDemo) {
        updateBotPaddle(dt);
    }

    // 1. Mover la paleta
    if (GameState.paddle.targetX !== undefined) {
        const diff = GameState.paddle.targetX - GameState.paddle.x;
        if (Math.abs(diff) < 0.5) {
            GameState.paddle.x = GameState.paddle.targetX;
        } else {
            // Lerp ultra reactivo para seguimiento directo e instantáneo a 60fps
            GameState.paddle.x += diff * Math.min(1, 60 * dt);
        }
    } else {
        GameState.paddle.x += GameState.paddle.dx * dt;
    }
    if (GameState.paddle.x < 0) GameState.paddle.x = 0;
    if (GameState.paddle.x + PADDLE_WIDTH > CANVAS_WIDTH) GameState.paddle.x = CANVAS_WIDTH - PADDLE_WIDTH;

    // 2. Mover la pelota
    if (!GameState.ball.launched) {
        GameState.ball.x = GameState.paddle.x + PADDLE_WIDTH / 2;
        GameState.ball.y = GameState.paddle.y - BALL_RADIUS - 2;
        return;
    }

    const prevX = GameState.ball.x;
    const prevY = GameState.ball.y;
    GameState.ball.x += GameState.ball.dx * dt;
    GameState.ball.y += GameState.ball.dy * dt;

    // Colisión con paredes laterales
    if (GameState.ball.x + BALL_RADIUS > CANVAS_WIDTH) {
        GameState.ball.x = CANVAS_WIDTH - BALL_RADIUS;
        GameState.ball.dx = -Math.abs(GameState.ball.dx);
        audio.playWall();
    } else if (GameState.ball.x - BALL_RADIUS < 0) {
        GameState.ball.x = BALL_RADIUS;
        GameState.ball.dx = Math.abs(GameState.ball.dx);
        audio.playWall();
    }

    // Colisión con techo
    if (GameState.ball.y - BALL_RADIUS < 0) {
        GameState.ball.y = BALL_RADIUS;
        GameState.ball.dy = Math.abs(GameState.ball.dy);
        audio.playWall();
    } else if (GameState.ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
        if (GameState.isDemo) {
            resetBall();
            GameState._demoLaunchTimer = Date.now();
            return;
        }
        // Pérdida de vida
        GameState.lives--;
        audio.playLifeLost();
        if (GameState.lives <= 0) {
            endGame();
        } else {
            resetBall();
        }
        updateUI();
        return;
    }

    // Colisión con la paleta (solo cuando la pelota desciende hacia la barra)
    if (GameState.ball.dy > 0 &&
        GameState.ball.y + BALL_RADIUS >= GameState.paddle.y && 
        GameState.ball.y - BALL_RADIUS <= GameState.paddle.y + PADDLE_HEIGHT &&
        GameState.ball.x + BALL_RADIUS >= GameState.paddle.x && 
        GameState.ball.x - BALL_RADIUS <= GameState.paddle.x + PADDLE_WIDTH) {
        
        GameState.ball.y = GameState.paddle.y - BALL_RADIUS - 0.5;

        // Desvío angular respecto al centro de la paleta (-1.0 a +1.0)
        let hitOffset = (GameState.ball.x - (GameState.paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
        hitOffset = Math.max(-0.85, Math.min(0.85, hitOffset));

        // Rebote máximo de 60 grados (Math.PI / 3) conservando la velocidad
        const bounceAngle = hitOffset * (Math.PI / 3);
        GameState.ball.dx = Math.sin(bounceAngle) * GameState.ball.speed;
        GameState.ball.dy = -Math.cos(bounceAngle) * GameState.ball.speed;

        audio.playPaddle();
    }

    // Colisión con ladrillos (detección de impacto lateral vs frontal + aceleración progresiva)
    let brickHit = false;
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        if (!GameState.bricks[c]) continue;
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            const b = GameState.bricks[c][r];
            if (b && b.status === 1) {
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                
                if (GameState.ball.x + BALL_RADIUS > brickX && 
                    GameState.ball.x - BALL_RADIUS < brickX + BRICK_WIDTH &&
                    GameState.ball.y + BALL_RADIUS > brickY && 
                    GameState.ball.y - BALL_RADIUS < brickY + BRICK_HEIGHT) {
                    
                    b.status = 0;
                    GameState.score += (BRICK_ROW_COUNT - r) * 10;
                    if (GameState.score > GameState.highScore) GameState.highScore = GameState.score;

                    // Aceleración suave (+1 px/s por bloque, filas superiores +2 px/s)
                    const speedBonus = (r <= 1) ? 2 : 1;
                    GameState.ball.speed = Math.min(MAX_BALL_SPEED, GameState.ball.speed + speedBonus);

                    // Rebote lateral si venía desde fuera del eje X del ladrillo
                    const wasOutsideX = (prevX + BALL_RADIUS <= brickX) || (prevX - BALL_RADIUS >= brickX + BRICK_WIDTH);
                    if (wasOutsideX) {
                        GameState.ball.dx = -GameState.ball.dx;
                    } else {
                        GameState.ball.dy = -GameState.ball.dy;
                    }

                    // Preservar la magnitud exacta de velocidad
                    const currentVel = Math.hypot(GameState.ball.dx, GameState.ball.dy);
                    if (currentVel > 0) {
                        GameState.ball.dx = (GameState.ball.dx / currentVel) * GameState.ball.speed;
                        GameState.ball.dy = (GameState.ball.dy / currentVel) * GameState.ball.speed;
                    }

                    audio.playBrick(r);
                    updateUI();
                    checkWin();
                    brickHit = true;
                    break;
                }
            }
        }
        if (brickHit) break;
    }
}

function update(dt) {
    if (!GameState.running || GameState.paused || GameState.gameOver || GameState.adPlaying) return;

    // Sub-stepping de 2 pasos para física 100% precisa y libre de túneles a alta velocidad en RPi
    const steps = 2;
    const stepDt = dt / steps;
    for (let s = 0; s < steps; s++) {
        updateStep(stepDt);
        if (GameState.gameOver || !GameState.running) break;
    }
}

function checkWin() {
    if (!GameState.bricks || !Array.isArray(GameState.bricks)) {
        initBricks();
        return;
    }
    let allDestroyed = true;
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        if (!GameState.bricks[c]) continue;
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (GameState.bricks[c][r] && GameState.bricks[c][r].status === 1) {
                allDestroyed = false;
                break;
            }
        }
        if (!allDestroyed) break;
    }
    if (allDestroyed) {
        if (!GameState.isDemo) audio.playLevelClear();
        initBricks();
        GameState.ball.baseSpeed = Math.min(MAX_BALL_SPEED, (GameState.ball.baseSpeed || INITIAL_BALL_SPEED) + 20);
        GameState.ball.speed = GameState.ball.baseSpeed;
        resetBall();
    }
}

function draw() {
    if (!ctx) return;

    // Fondo de pantalla CRT oscuro
    ctx.fillStyle = '#0d0e15';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Asegurar ladrillos inicializados
    if (!GameState.bricks || !Array.isArray(GameState.bricks) || GameState.bricks.length < BRICK_COLUMN_COUNT) {
        initBricks();
    }

    // 1. Renderizado de ladrillos en 3 pasadas por lotes (reduce cambios de estado en GPU de 120 a 7)
    // Pasada 1: Cuerpos de ladrillo agrupados por color/fila
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        ctx.fillStyle = BRICK_COLORS[r];
        const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            if (GameState.bricks[c] && GameState.bricks[c][r] && GameState.bricks[c][r].status === 1) {
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
            }
        }
    }

    // Pasada 2: Brillos retro superiores/izquierdos
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            if (GameState.bricks[c] && GameState.bricks[c][r] && GameState.bricks[c][r].status === 1) {
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                ctx.fillRect(brickX, brickY, BRICK_WIDTH, 2);
                ctx.fillRect(brickX, brickY, 2, BRICK_HEIGHT);
            }
        }
    }

    // Pasada 3: Sombras retro inferiores/derechas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            if (GameState.bricks[c] && GameState.bricks[c][r] && GameState.bricks[c][r].status === 1) {
                const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                ctx.fillRect(brickX, brickY + BRICK_HEIGHT - 2, BRICK_WIDTH, 2);
                ctx.fillRect(brickX + BRICK_WIDTH - 2, brickY, 2, BRICK_HEIGHT);
            }
        }
    }

    // 2. Paleta neón (garantizar coordenadas válidas)
    const px = (isNaN(GameState.paddle.x) ? (CANVAS_WIDTH - PADDLE_WIDTH) / 2 : GameState.paddle.x);
    const py = (isNaN(GameState.paddle.y) ? CANVAS_HEIGHT - PADDLE_HEIGHT - 5 : GameState.paddle.y);
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(px, py, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, py, PADDLE_WIDTH, 2);

    // 3. Pelota brillante (garantizar coordenadas válidas)
    const bx = (isNaN(GameState.ball.x) ? CANVAS_WIDTH / 2 : GameState.ball.x);
    const by = (isNaN(GameState.ball.y) ? CANVAS_HEIGHT - PADDLE_HEIGHT - 10 : GameState.ball.y);
    ctx.fillStyle = '#ff00ea';
    ctx.beginPath();
    ctx.arc(bx, by, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
}

function gameLoop(timestamp) {
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.04);
    GameState.lastTime = timestamp;

    try {
        update(dt);
    } catch (err) {
        console.error('[Arkanoid] update error:', err);
    }

    try {
        draw();
    } catch (err) {
        console.error('[Arkanoid] draw error:', err);
    }

    requestAnimationFrame(gameLoop);
}

function endGame() {
    audio.playGameOver();
    GameState.gameOver = true;
    GameState.running = false;
    gameOverOverlay.classList.remove('hidden');
    notifyGameOver();
    submitScore(GameState.currentNickname, GameState.score);

    // Disconnect everyone so they have to scan again
    dataChannels.forEach(channel => channel.close());
    peerConnections.forEach(pc => pc.close());
    dataChannels.clear();
    peerConnections.clear();
    
    // Show QR code again after 3 seconds
    if (GameState._gameOverTimeout) clearTimeout(GameState._gameOverTimeout);
    GameState._gameOverTimeout = setTimeout(() => {
        GameState._gameOverTimeout = null;
        if (GameState.running || GameState.adPlaying) return;
        gameOverOverlay.classList.add('hidden');
        waitingOverlay.classList.remove('hidden');
        const qrPanel = document.getElementById('waiting-qr-panel');
        const rankingPanel = document.getElementById('waiting-ranking-panel');
        if (qrPanel) qrPanel.classList.remove('hidden');
        if (rankingPanel) rankingPanel.classList.add('hidden');
        attractModeState = 'qr';
        startAttractMode();

        GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        document.getElementById('room-id').textContent = `ROOM: ${GameState.roomId}`;
        updateQrCode();
        
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ 
                type: 'register', 
                role: 'host', 
                roomId: GameState.roomId,
                maxPlayers: CONFIG.MAX_PLAYERS 
            }));
        }
    }, 3000); // 3 seconds to view game over / hall of fame
}

function updateUI() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(3, '0')}`;
    highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
    livesCountElement.textContent = GameState.lives;
    if (playerNickElement) {
        if (GameState.isDemo) {
            playerNickElement.textContent = 'PLAYER: DEMO';
            playerNickElement.style.color = 'var(--amber)';
        } else {
            playerNickElement.textContent = `PLAYER: ${GameState.currentNickname.toUpperCase().substring(0, 8)}`;
            playerNickElement.style.color = '';
        }
    }
}

function getControlUrl() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/arkanoid';
    const sId = new URLSearchParams(window.location.search).get('screenId');
    const screenParam = sId ? `&screenId=${encodeURIComponent(sId)}` : '';
    const separator = baseUrl.includes('?') ? '&' : '?';
    return baseUrl.includes('://')
        ? `${baseUrl}${separator}room=${GameState.roomId}${screenParam}`
        : `${window.location.protocol}//${baseUrl}${separator}room=${GameState.roomId}${screenParam}`;
}

function updateQrCode() {
    const controlUrl = getControlUrl();
    const qrContainer = document.getElementById('qrcode');
    const cornerBadge = document.getElementById('corner-room-badge');
    if (cornerBadge) cornerBadge.textContent = `SALA: ${GameState.roomId}`;

    if (qrContainer) {
        qrContainer.innerHTML = '';
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: controlUrl,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.L
                });
            } else {
                throw new Error('QRCode not loaded');
            }
        } catch (e) {
            console.warn('QRCode error, using fallback API:', e);
            qrContainer.innerHTML = `<img id="qr-code-img" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(controlUrl)}&margin=4" alt="QR" style="width: 100px; height: 100px; display: block;">`;
        }
    } else {
        const qrCodeImg = document.getElementById('qr-code-img');
        if (qrCodeImg) {
            qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(controlUrl)}&margin=4`;
        }
    }
}

// API Functions & Ranking
const DEFAULT_ARKANOID_RANKING = [
    { name: 'VAUS', score: 3500 },
    { name: 'PILOT', score: 2500 },
    { name: 'DOH', score: 1800 },
    { name: 'RETRO', score: 1200 },
    { name: 'ACE', score: 800 }
];

function fetchRanking() {
    try {
        let ranking = JSON.parse(localStorage.getItem('arkanoid-ranking')) || [];
        if (!Array.isArray(ranking) || ranking.length === 0) {
            ranking = DEFAULT_ARKANOID_RANKING;
        }
        const top5 = ranking.slice(0, 5);
        if (top5.length > 0) {
            GameState.highScore = top5[0].score;
            updateUI();
        }

        const renderList = (listElement) => {
            if (!listElement) return;
            listElement.innerHTML = '';
            top5.forEach((entry, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank">${index + 1}.</span>
                    <span class="nick">${entry.name.toUpperCase().substring(0, 10)}</span>
                    <span class="score">${entry.score.toString().padStart(4, '0')}</span>
                `;
                listElement.appendChild(li);
            });
        };

        renderList(rankingList);
        renderList(videoRankingList);
        const standbyList = document.getElementById('standby-ranking-list');
        renderList(standbyList);

        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: 'RANKING_UPDATE',
                    slug: 'arkanoid',
                    ranking: top5
                }, '*');
            } catch (_) {}
        }
    } catch (error) {
        console.error('Error fetching ranking:', error);
    }
}

function startAttractMode() {
    stopAttractMode();
    const qrPanel = document.getElementById('waiting-qr-panel');

    fetchRanking();

    // Activar Demo Gameplay en Canvas
    GameState.isDemo = true;
    GameState.adPlaying = false;
    GameState.running = true;
    if (window.parent && window.parent !== window) {
        try { window.parent.postMessage({ type: 'GAME_PLAY_END' }, '*'); } catch (_) {}
    }
    GameState.gameOver = false;
    GameState.paused = false;
    GameState.score = 0;
    GameState.lives = 3;
    GameState.currentNickname = 'DEMO';
    GameState.ball.baseSpeed = INITIAL_BALL_SPEED;
    GameState.ball.speed = INITIAL_BALL_SPEED;
    GameState.paddle.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    GameState.paddle.targetX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    GameState.paddle.dx = 0;
    initBricks();
    resetBall();

    // Lanzar inmediatamente la pelota en demo para que el gameplay se vea activo desde el primer frame
    GameState.ball.launched = true;
    const angleDir = Math.random() > 0.5 ? 1 : -1;
    const angleRad = angleDir * (Math.PI / 6 + Math.random() * (Math.PI / 8));
    GameState.ball.dx = Math.sin(angleRad) * GameState.ball.speed;
    GameState.ball.dy = -Math.cos(angleRad) * GameState.ball.speed;

    updateUI();

    if (waitingOverlay) waitingOverlay.classList.remove('hidden');
    if (qrPanel) qrPanel.classList.remove('hidden');
}

function stopAttractMode() {
    GameState.isDemo = false;
    if (waitingOverlay) waitingOverlay.classList.add('hidden');
}

function submitScore(nickname, score) {
    if (score === 0) return;
    try {
        let ranking = JSON.parse(localStorage.getItem('arkanoid-ranking')) || [];
        
        // Only keep highest score per nickname
        ranking = ranking.filter((entry, index, arr) => 
            !(entry.name === nickname && entry.score < score)
        );
        
        if (!ranking.some(entry => entry.name === nickname && entry.score === score)) {
            ranking.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
        }
        
        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('arkanoid-ranking', JSON.stringify(ranking));
        fetchRanking();
    } catch (error) {
        console.error('Error al guardar score:', error);
    }
}

async function fetchUpcomingSchedules() {
    try {
        const screenId = window.GAME_CONFIG ? window.GAME_CONFIG.SCREEN_ID : null;
        if (!screenId) return;

        let apiUrl = CONFIG.API_URL;
        if (CONFIG.API_URL === 'https://MY_DOMAIN') {
            apiUrl = `${window.location.protocol}//${window.location.host}`;
        }

        const response = await fetch(`${apiUrl}/api/public/screens/${screenId}/current`);
        if (!response.ok) return;

        const data = await response.json();
        
        const renderUpcoming = (listElement, containerElement) => {
            if (!listElement || !containerElement) return;
            
            if (data.upcomingSchedules && data.upcomingSchedules.length > 0) {
                listElement.innerHTML = '';
                const displayCount = Math.min(3, data.upcomingSchedules.length);
                
                for (let i = 0; i < displayCount; i++) {
                    const schedule = data.upcomingSchedules[i];
                    if (schedule.game) {
                        const li = document.createElement('li');
                        li.style.display = 'flex';
                        li.style.justifyContent = 'space-between';
                        li.style.padding = '4px 0';
                        li.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                        
                        const time = new Date(schedule.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        const now = new Date();
                        const scheduleDate = new Date(schedule.startDate);
                        const isToday = now.getDate() === scheduleDate.getDate() && 
                                      now.getMonth() === scheduleDate.getMonth() && 
                                      now.getFullYear() === scheduleDate.getFullYear();
                        
                        let dateStr = isToday ? '' : scheduleDate.toLocaleDateString([], {day: '2-digit', month: '2-digit'}) + ' ';
                        
                        li.innerHTML = `
                            <span style="color: var(--primary);">${schedule.game.name}</span>
                            <span>${dateStr}${time}</span>
                        `;
                        listElement.appendChild(li);
                    }
                }
                containerElement.style.display = 'block';
            } else {
                containerElement.style.display = 'none';
            }
        };

        renderUpcoming(
            document.getElementById('game-over-upcoming-list'), 
            document.getElementById('game-over-upcoming-container')
        );
        renderUpcoming(
            document.getElementById('upcoming-games-list'), 
            document.getElementById('upcoming-games-container')
        );

    } catch (error) {
        console.error('Error fetching upcoming schedules:', error);
    }
}

// Dimensiones de referencia de la consola arcade (fallback si aún no hay layout)
const ARCADE_NATURAL_W = 534;
const ARCADE_NATURAL_H = 488;

// Auto-scale to fit browser window with high responsiveness
function autoScale() {
    const container = document.querySelector('.container');
    if (!container) return;

    // offsetWidth / offsetHeight devuelven siempre las dimensiones sin transform
    const naturalW = container.offsetWidth || ARCADE_NATURAL_W;
    const naturalH = container.offsetHeight || ARCADE_NATURAL_H;
    const availableW = window.innerWidth || document.documentElement.clientWidth;
    const availableH = window.innerHeight || document.documentElement.clientHeight;
    if (!availableW || !availableH || !naturalW || !naturalH) return;

    const padding = 8;
    const scaleX = (availableW - padding) / naturalW;
    const scaleY = (availableH - padding) / naturalH;
    const scale = Math.max(0.1, Math.min(scaleX, scaleY));

    container.style.transform = `scale(${scale})`;
}

// Inicialización inmediata y arranque de modo demostración
initBricks();
startAttractMode();
updateUI();
fetchRanking();
updateQrCode();
autoScale();
draw();
setInterval(fetchRanking, 30000);
requestAnimationFrame(gameLoop);
connectSignalingServer();

function initDomAndAttract() {
    updateQrCode();
    autoScale();
    fetchRanking();
    if (!GameState.isDemo && !GameState.running) {
        startAttractMode();
    }

    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!audio.ctx) audio.init();
            else audio.resume();
        });
    }

    const qrPanel = document.getElementById('waiting-qr-panel');
    if (qrPanel) {
        qrPanel.addEventListener('click', (e) => {
            e.stopPropagation();
            audio.init();
            playPreGameAdThenStart('PILOT', () => resetGame());
        });
    }
}

// Soporte robusto tanto para carga síncrona como asíncrona dentro de iframes
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDomAndAttract);
} else {
    initDomAndAttract();
}

// Multi-stage event bindings to ensure accurate dimensions
window.addEventListener('resize', autoScale);
document.addEventListener('fullscreenchange', autoScale);
document.addEventListener('webkitfullscreenchange', autoScale);
window.addEventListener('load', () => {
    updateQrCode();
    autoScale();
    if (!GameState.running && !GameState.isDemo) {
        startAttractMode();
    }
});
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
        autoScale();
    });
}

// Observe document body changes
if (window.ResizeObserver) {
    let resizeTimer = null;
    const ro = new ResizeObserver(() => {
        if (!resizeTimer) {
            resizeTimer = requestAnimationFrame(() => {
                autoScale();
                resizeTimer = null;
            });
        }
    });
    ro.observe(document.body);
}

// Listen for messages from screen parent frame (rescale, get ranking)
window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'RESCALE') {
        autoScale();
    } else if (event.data.type === 'GET_RANKING') {
        fetchRanking();
    }
});

// Periodic retries after mount to handle dynamic layout shifts (images, QR)
[0, 50, 150, 300, 600, 1200].forEach(delay => setTimeout(autoScale, delay));

// Controles de teclado para pruebas en navegador
window.addEventListener('keydown', (e) => {
    if (GameState.adPlaying) {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
            if (typeof window._finishCurrentAd === 'function') {
                window._finishCurrentAd();
            }
        }
        return;
    }

    audio.init();

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        GameState.paddle.targetX = undefined;
        GameState.paddle.dx = -GameState.paddle.speed;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        GameState.paddle.targetX = undefined;
        GameState.paddle.dx = GameState.paddle.speed;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
        if (GameState.isDemo || !GameState.running || GameState.gameOver) {
            playPreGameAdThenStart('PILOT', () => resetGame());
        } else {
            handleJoystickInput({ fire: true });
        }
    }
});

window.addEventListener('keyup', (e) => {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && GameState.paddle.dx < 0) GameState.paddle.dx = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && GameState.paddle.dx > 0) GameState.paddle.dx = 0;
});

mainScreen.addEventListener('click', () => {
    if (GameState.adPlaying) return;
    audio.init();
    if (GameState.isDemo || !GameState.running || GameState.gameOver) {
        playPreGameAdThenStart('PILOT', () => resetGame());
    }
});

requestAdVideo();


