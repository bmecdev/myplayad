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
let adVideoPromise = null;

// Retro Arcade Snake Web Audio API Synthesizer
class SnakeAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
    }

    init() {
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

    resume() {
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

    playEat() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, t);
            osc.frequency.linearRampToValueAtTime(783.99, t + 0.08);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (e) {}
        broadcastSFX('eat');
    }

    playBonus() {
        if (!this.ctx) return;
        this.resume();
        try {
            const notes = [523.25, 659.25, 783.99, 1046.5];
            const t = this.ctx.currentTime;
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t + idx * 0.05);
                gain.gain.setValueAtTime(0.24, t + idx * 0.05);
                gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.05 + 0.1);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t + idx * 0.05);
                osc.stop(t + idx * 0.05 + 0.11);
            });
        } catch (e) {}
        broadcastSFX('bonus');
    }

    playTurn() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, t);
            gain.gain.setValueAtTime(0.16, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.03);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.03);
        } catch (e) {}
    }

    playDie() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, t);
            osc.frequency.linearRampToValueAtTime(55, t + 0.35);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.35);
        } catch (e) {}
        broadcastSFX('die');
    }

    playStart() {
        if (!this.ctx) return;
        this.resume();
        const notes = [392, 523.25, 659.25];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + idx * 0.08);
            gain.gain.setValueAtTime(0.26, t + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.08 + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.08);
            osc.stop(t + idx * 0.08 + 0.13);
        });
        broadcastSFX('start');
    }

    playGameOver() {
        if (!this.ctx) return;
        this.resume();
        const notes = [392, 329.63, 261.63, 196];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + idx * 0.15);
            gain.gain.setValueAtTime(0.28, t + idx * 0.15);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.15 + 0.18);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.15);
            osc.stop(t + idx * 0.15 + 0.2);
        });
        broadcastSFX('gameover');
    }
}
const audio = new SnakeAudio();

function broadcastSFX(sound, param = null) {
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
const GRID_SIZE = 10;
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;
const COLS = CANVAS_WIDTH / GRID_SIZE;
const ROWS = CANVAS_HEIGHT / GRID_SIZE;
const MATRIX_GREEN = '#3dff8a';

// Game state encapsulation
const GameState = {
    snake: [],
    food: { x: 0, y: 0 },
    bonusFood: null,
    bonusTimer: 0,
    foodsEaten: 0,
    particles: [],
    floatingTexts: [],
    screenShake: 0,
    dx: 1,
    dy: 0,
    nextDx: 1,
    nextDy: 0,
    score: 0,
    highScore: 0,
    lives: 3,
    gameRunning: false,
    adPlaying: false,
    isRespawning: false,
    isInvulnerable: false, 
    lastTime: 0,
    gameSpeed: 100,
    currentNickname: 'Player',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase()
};

// WebRTC & Signaling
const peerConnections = new Map();
const dataChannels = new Map();
let socket;

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

    if (waitingOverlay) waitingOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');

    if (!adVideoOverlay || !adVideoPlayer) {
        broadcastToControllers({ type: 'game_start' });
        startGameCallback();
        return;
    }

    const startAdPlayback = (videoUrl) => {
        if (!videoUrl) {
            console.log('[ad] No hay video publicitario configurado. Arrancando partida de una.');
            broadcastToControllers({ type: 'game_start' });
            startGameCallback();
            return;
        }

        // SOLO avisar al celular si REALMENTE hay un video publicitario válido para reproducir
        broadcastToControllers({ type: 'ad_playing', nickname: nickname });

        GameState.adPlaying = true;
        if (adPilotName) adPilotName.textContent = `PILOTO: ${(nickname || 'VIPER').toUpperCase()}`;
        if (adCountdown) adCountdown.textContent = 'INICIANDO...';
        adVideoOverlay.classList.remove('hidden');

        if (window.parent && window.parent !== window) {
            try { window.parent.postMessage({ type: 'GAME_AD_START' }, '*'); } catch (_) {}
        }

        let adFinished = false;
        let safetyTimer = null;

        const finishAd = () => {
            if (adFinished) return;
            adFinished = true;
            if (safetyTimer) clearTimeout(safetyTimer);

            adVideoPlayer.onended = null;
            adVideoPlayer.onerror = null;
            adVideoPlayer.ontimeupdate = null;

            try {
                adVideoPlayer.pause();
                adVideoPlayer.removeAttribute('src');
                adVideoPlayer.load();
            } catch (_) {}

            adVideoOverlay.classList.add('hidden');
            GameState.adPlaying = false;

            if (window.parent && window.parent !== window) {
                try { window.parent.postMessage({ type: 'GAME_AD_END' }, '*'); } catch (_) {}
            }

            broadcastToControllers({ type: 'game_start' });
            startGameCallback();
        };

        window._finishCurrentAd = finishAd;

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

const signalingState = {
    shouldReconnect: true,
    manualClose: false,
    reconnectAttempts: 0,
    reconnectTimer: null,
    baseDelay: 1000,
    maxAttempts: 8
};

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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
    let remoteCandidate = null;

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
            if (report.type === 'remote-candidate' && report.id === selectedPair.remoteCandidateId) {
                remoteCandidate = report;
            }
        });
    }

    const types = [localCandidate?.candidateType, remoteCandidate?.candidateType].filter(Boolean);
    if (types.includes('relay')) return 'relay';
    if (types.includes('srflx')) return 'srflx';
    if (types.includes('host')) return 'host';
    return types[0] || 'unknown';
}

async function refreshIceRoute(pc) {
    if (!pc) return;
    try {
        const stats = await pc.getStats();
        const routeType = getIceRouteType(stats);
        setIceRouteText(routeType);
    } catch (err) {
        console.warn('Error obteniendo ICE stats:', err);
    }
}

function loadRanking() {
    const ranking = JSON.parse(localStorage.getItem('snake-ranking')) || [];
    const top5 = ranking.slice(0, 5);
    if (top5.length > 0) {
        GameState.highScore = top5[0].score;
        highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
    }
    displayRanking(ranking);

    if (window.parent && window.parent !== window) {
        try {
            window.parent.postMessage({
                type: 'RANKING_UPDATE',
                slug: 'snake',
                ranking: top5
            }, '*');
        } catch (_) {}
    }
}

function saveRanking(newScore, nickname) {
    let ranking = JSON.parse(localStorage.getItem('snake-ranking')) || [];
    ranking.push({ name: nickname, score: newScore, date: new Date().toLocaleDateString() });
    ranking.sort((a, b) => b.score - a.score);
    ranking = ranking.slice(0, 5); 
    localStorage.setItem('snake-ranking', JSON.stringify(ranking));
    loadRanking();
}

function displayRanking(ranking) {
    const listHtml = ranking.slice(0, 5).map((entry, index) => 
        `<li style="list-style: none; margin: 2px 0;">${index + 1}. ${entry.name.substring(0,8).toUpperCase().padEnd(8,'.')} ${entry.score.toString().padStart(3, '0')}</li>`
    ).join('');
    
    if (rankingList) rankingList.innerHTML = listHtml;

    if (videoRankingList) {
        videoRankingList.innerHTML = ranking.slice(0, 5).map((entry, index) => 
            `<li><span>${index + 1}. ${entry.name.toUpperCase()}</span> <span>${entry.score.toString().padStart(3, '0')}</span></li>`
        ).join('');
    }
}

function getControlUrl() {
    const baseUrl = CONFIG.CONTROL_URL;
    return baseUrl.includes('://')
        ? `${baseUrl}?room=${GameState.roomId}`
        : `${window.location.protocol}//${baseUrl}?room=${GameState.roomId}`;
}

function updateQrCode() {
    const controlUrl = getControlUrl();
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: controlUrl,
                    width: 160,
                    height: 160,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                throw new Error('QRCode not loaded');
            }
        } catch (e) {
            console.warn('QRCode error, using fallback API:', e);
            qrContainer.innerHTML = `<img id="qr-code-img" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(controlUrl)}&margin=10" alt="QR" style="width: 160px; height: 160px; display: block;">`;
        }
    } else {
        const qrCodeImg = document.getElementById('qr-code-img');
        if (qrCodeImg) {
            qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(controlUrl)}&margin=10`;
        }
    }
}

function resetSignaling() {
    console.log('Reiniciando sala para nueva partida...');
    closeSignalingIntentional();
    
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    dataChannels.clear();

    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    connectSignaling();
    waitingOverlay.classList.remove('hidden');
    gameOverOverlay.classList.add('hidden');
    GameState.gameRunning = false;
    GameState.currentNickname = 'Player';
    if (playerNickElement) playerNickElement.textContent = 'PLAYER: ----';
    loadRanking();
}

function clearSignalingReconnect() {
    if (signalingState.reconnectTimer) {
        clearTimeout(signalingState.reconnectTimer);
        signalingState.reconnectTimer = null;
    }
}

function resetSignalingReconnect() {
    clearSignalingReconnect();
    signalingState.reconnectAttempts = 0;
}

function closeSignalingIntentional() {
    signalingState.manualClose = true;
    signalingState.shouldReconnect = false;
    clearSignalingReconnect();
    if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
    }
}

function scheduleSignalingReconnect() {
    if (!signalingState.shouldReconnect || signalingState.manualClose) return;
    if (signalingState.reconnectAttempts >= signalingState.maxAttempts) {
        console.error('No se pudo reconectar al servidor de señalización después de varios intentos.');
        return;
    }

    signalingState.reconnectAttempts += 1;
    const delay = Math.min(30000, signalingState.baseDelay * 2 ** (signalingState.reconnectAttempts - 1));
    console.warn(`Reintentando conexión de señalización en ${delay} ms (intento ${signalingState.reconnectAttempts})`);

    clearSignalingReconnect();
    signalingState.reconnectTimer = setTimeout(() => {
        connectSignaling();
    }, delay);
}

function connectSignaling() {
    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const serverUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const signalingUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `wss://${serverUrl}`;

    signalingState.shouldReconnect = true;
    signalingState.manualClose = false;
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
                if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else if (data.type === 'controller_connected') {
                console.log(`Controlador ${data.playerId} conectado. Esperando oferta...`);
                waitingOverlay.classList.add('hidden');
            } else if (data.type === 'controller_disconnected') {
                handleControllerDisconnect(data.playerId);
            } else if (data.type === 'room_status') {
                console.log(`Estado de sala: ${data.players.length}/${data.maxPlayers} jugadores.`);
            }
        } catch (e) {
            console.error('Error procesando mensaje de señalización:', e);
        }
    };
}

function handleControllerDisconnect(playerId) {
    console.log(`Controlador ${playerId} desconectado.`);
    const pc = peerConnections.get(playerId);
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0) {
        waitingOverlay.classList.remove('hidden');
        GameState.gameRunning = false;
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    console.log(`Recibida oferta de jugador ${playerId}`);

    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) ? window.GAME_CONFIG.getIceConfig() : getIceConfig();
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.set(playerId, pc);

    if (window.GAME_CONFIG && window.GAME_CONFIG.attachPCDiagnostics) {
        try { window.GAME_CONFIG.attachPCDiagnostics(pc, `pc-${playerId}`); } catch (e) { console.warn('attachPCDiagnostics failed', e); }
    }

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
            try { window.GAME_CONFIG.attachDataChannelDiagnostics(receiveChannel, `dc-${playerId}`); } catch (e) { console.warn('attachDataChannelDiagnostics failed', e); }
        }
        
        receiveChannel.onmessage = (e) => {
            try {
                const input = JSON.parse(e.data);
                if (input.type === 'nickname' || input.type === 'join') {
                    GameState.currentNickname = (input.nickname || input.value || 'VIPER').substring(0, 10);
                    if (playerNickElement) playerNickElement.textContent = `PLAYER: ${GameState.currentNickname.toUpperCase()}`;
                    playPreGameAdThenStart(GameState.currentNickname, () => startGame());
                } else {
                    handleJoystickInput(input);
                }
            } catch (err) {
                console.error('Error en DataChannel message:', err);
            }
        };

        receiveChannel.onopen = () => {
            console.log(`DataChannel abierto con jugador ${playerId}`);
            init();
            draw();
            refreshIceRoute(pc);
        };

        receiveChannel.onclose = () => {
            console.warn(`DataChannel cerrado para jugador ${playerId}`);
            handleControllerDisconnect(playerId);
        };
    };

    pc.oniceconnectionstatechange = () => {
        refreshIceRoute(pc);
        const state = pc.iceConnectionState;
        if (state === 'disconnected' || state === 'failed') {
            console.warn(`ICE connection ${state} para jugador ${playerId}`);
            handleControllerDisconnect(playerId);
        }
    };

    pc.onconnectionstatechange = () => {
        refreshIceRoute(pc);
        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed') {
            console.warn(`Peer connection ${state} para jugador ${playerId}`);
            handleControllerDisconnect(playerId);
        }
    };

    await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    socket.send(JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        playerId: playerId
    }));
}

function handleJoystickInput(input) {
    if (GameState.isRespawning) return;

    if (!GameState.gameRunning) {
        if (Math.abs(input.x || 0) > 0.3 || Math.abs(input.y || 0) > 0.3 || input.fire) {
            startGame();
        }
    }

    const threshold = 0.3;
    if (Math.abs(input.x) > Math.abs(input.y)) {
        if (input.x > threshold && GameState.dx !== -1) { GameState.nextDx = 1; GameState.nextDy = 0; }
        else if (input.x < -threshold && GameState.dx !== 1) { GameState.nextDx = -1; GameState.nextDy = 0; }
    } else {
        if (input.y > threshold && GameState.dy !== -1) { GameState.nextDx = 0; GameState.nextDy = 1; }
        else if (input.y < -threshold && GameState.dy !== 1) { GameState.nextDx = 0; GameState.nextDy = -1; }
    }
}

// Helper for universal rounded rectangles on canvas
function drawRoundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        return;
    }
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Particle & Micro-Animation Systems
function createEatBurst(gridX, gridY, customColor = null) {
    const px = gridX * GRID_SIZE + GRID_SIZE / 2;
    const py = gridY * GRID_SIZE + GRID_SIZE / 2;
    const count = customColor ? 18 : 12;
    const palette = customColor ? [customColor, '#ffffff', '#fffa65'] : ['#ff2a6d', '#ff4d6d', '#3dff8a', '#ffffff'];
    
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 2.2 + 0.8;
        GameState.particles.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 2 + 1.2,
            color: palette[Math.floor(Math.random() * palette.length)],
            alpha: 1.0,
            life: Math.floor(Math.random() * 15 + 15),
            maxLife: 30,
            drag: 0.94
        });
    }
}

function createBonusBurst(gridX, gridY) {
    const px = gridX * GRID_SIZE + GRID_SIZE / 2;
    const py = gridY * GRID_SIZE + GRID_SIZE / 2;
    const palette = ['#ffe600', '#ffb703', '#ffffff', '#00f5d4', '#ff7b00'];
    
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.3;
        const speed = Math.random() * 2.8 + 1.0;
        GameState.particles.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 2.2 + 1.2,
            color: palette[Math.floor(Math.random() * palette.length)],
            alpha: 1.0,
            life: Math.floor(Math.random() * 20 + 20),
            maxLife: 40,
            drag: 0.94
        });
    }
}

function createDeathExplosion(snakeSegments) {
    GameState.screenShake = 10;
    const colors = ['#3dff8a', '#ff4d6d', '#ffb703', '#ffffff', '#00f5d4'];
    
    snakeSegments.forEach((segment, idx) => {
        const px = segment.x * GRID_SIZE + GRID_SIZE / 2;
        const py = segment.y * GRID_SIZE + GRID_SIZE / 2;
        const count = idx === 0 ? 8 : 4;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            GameState.particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 2.5 + 1.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                life: Math.floor(Math.random() * 25 + 20),
                maxLife: 45,
                drag: 0.95
            });
        }
    });
}

function createFloatingText(px, py, text, color = '#3dff8a') {
    GameState.floatingTexts.push({
        x: px,
        y: py,
        text: text,
        color: color,
        alpha: 1.0,
        life: 35,
        maxLife: 35
    });
}

function createTailDust(px, py) {
    if (GameState.particles.length > 50) return;
    GameState.particles.push({
        x: px + (Math.random() - 0.5) * 3,
        y: py + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.8,
        color: '#10b981',
        alpha: 0.6,
        life: 16,
        maxLife: 16,
        drag: 0.92
    });
}

function updateEffects() {
    if (GameState.screenShake > 0) {
        GameState.screenShake *= 0.85;
        if (GameState.screenShake < 0.2) GameState.screenShake = 0;
    }

    for (let i = GameState.particles.length - 1; i >= 0; i--) {
        const p = GameState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= (p.drag || 0.96);
        p.vy *= (p.drag || 0.96);
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) {
            GameState.particles.splice(i, 1);
        }
    }

    for (let i = GameState.floatingTexts.length - 1; i >= 0; i--) {
        const ft = GameState.floatingTexts[i];
        ft.y -= 0.45;
        ft.life--;
        ft.alpha = Math.max(0, ft.life / ft.maxLife);
        if (ft.life <= 0) {
            GameState.floatingTexts.splice(i, 1);
        }
    }
}

function init() {
    resetSnakePosition(false); 
    GameState.score = 0;
    GameState.gameSpeed = 100; 
    GameState.foodsEaten = 0;
    GameState.bonusFood = null;
    GameState.bonusTimer = 0;
    GameState.particles = [];
    GameState.floatingTexts = [];
    GameState.screenShake = 0;
    updateScore();
    placeFood();
    gameOverOverlay.classList.add('hidden');
}

function resetSnakePosition(keepLength = false) {
    const currentLength = keepLength ? GameState.snake.length : 3;
    GameState.snake = [];
    
    // Algoritmo de Zigzag para meter cualquier longitud en el área segura
    let curX = Math.floor(COLS / 2);
    let curY = Math.floor(ROWS / 2);
    let horizontalDir = -1; // Empezar trail hacia la izquierda

    for (let i = 0; i < currentLength; i++) {
        GameState.snake.push({ x: curX, y: curY });
        
        // El siguiente segmento se coloca en la dirección opuesta al movimiento inicial
        curX += horizontalDir;

        // Si el trail choca con la pared izquierda (1) o derecha (COLS-2)
        if (curX < 1 || curX >= COLS - 1) {
            horizontalDir *= -1; // Invertir zigzag
            curX += horizontalDir; // Corregir posición
            curY++; // Bajar una fila para continuar el trail
            
            // Seguridad: Si el trail llegara al fondo, subir (efecto acordeón)
            if (curY >= ROWS - 1) {
                curY = Math.floor(ROWS / 2) - 1; 
            }
        }
    }
    
    GameState.dx = 1; // Siempre arranca hacia la derecha
    GameState.dy = 0;
    GameState.nextDx = 1;
    GameState.nextDy = 0;
}

function placeFood() {
    let newFood;
    while (true) {
        newFood = {
            x: Math.floor(Math.random() * (COLS - 2)) + 1,
            y: Math.floor(Math.random() * (ROWS - 2)) + 1
        };
        const onSnake = GameState.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
        const onBonus = GameState.bonusFood && GameState.bonusFood.x === newFood.x && GameState.bonusFood.y === newFood.y;
        if (!onSnake && !onBonus) {
            break;
        }
    }
    GameState.food = newFood;
}

function placeBonusFood() {
    let newBonus;
    let attempts = 0;
    while (attempts < 50) {
        attempts++;
        newBonus = {
            x: Math.floor(Math.random() * (COLS - 2)) + 1,
            y: Math.floor(Math.random() * (ROWS - 2)) + 1
        };
        const onSnake = GameState.snake.some(segment => segment.x === newBonus.x && segment.y === newBonus.y);
        const onFood = GameState.food && GameState.food.x === newBonus.x && GameState.food.y === newBonus.y;
        if (!onSnake && !onFood) {
            GameState.bonusFood = newBonus;
            GameState.bonusTimer = 90; // ~9 segundos
            createEatBurst(newBonus.x, newBonus.y, '#ffe600');
            break;
        }
    }
}

function moveSnake() {
    if (GameState.dx !== GameState.nextDx || GameState.dy !== GameState.nextDy) {
        audio.playTurn();
    }
    GameState.dx = GameState.nextDx;
    GameState.dy = GameState.nextDy;

    if (GameState.isInvulnerable) return;

    const head = { x: GameState.snake[0].x + GameState.dx, y: GameState.snake[0].y + GameState.dy };

    if (head.x <= 0 || head.x >= COLS - 1 || head.y <= 0 || head.y >= ROWS - 1) {
        loseLife();
        return;
    }

    if (GameState.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        loseLife();
        return;
    }

    GameState.snake.unshift(head);

    let ateFood = false;

    // Comer Manzana Normal
    if (head.x === GameState.food.x && head.y === GameState.food.y) {
        ateFood = true;
        audio.playEat();
        GameState.score += 10;
        GameState.foodsEaten++;
        updateScore();
        createEatBurst(head.x, head.y);
        createFloatingText(head.x * GRID_SIZE + 5, head.y * GRID_SIZE - 2, '+10', '#3dff8a');
        placeFood();
        if (GameState.gameSpeed > 50) GameState.gameSpeed -= 1;

        // Generar estrella dorada cada 4 manzanas
        if (GameState.foodsEaten % 4 === 0 && !GameState.bonusFood) {
            placeBonusFood();
        }
    }

    // Comer Estrella / Fruta Dorada Bonus
    if (GameState.bonusFood && head.x === GameState.bonusFood.x && head.y === GameState.bonusFood.y) {
        ateFood = true;
        if (audio.playBonus) audio.playBonus(); else audio.playEat();
        GameState.score += 50;
        updateScore();
        createBonusBurst(head.x, head.y);
        createFloatingText(head.x * GRID_SIZE + 5, head.y * GRID_SIZE - 4, '+50 BONUS!', '#ffe600');
        GameState.bonusFood = null;
        GameState.bonusTimer = 0;
    }

    // Cuenta regresiva del bonus
    if (GameState.bonusFood) {
        GameState.bonusTimer--;
        if (GameState.bonusTimer <= 0) {
            createEatBurst(GameState.bonusFood.x, GameState.bonusFood.y, '#ffb703');
            GameState.bonusFood = null;
        }
    }

    if (!ateFood) {
        GameState.snake.pop();
    }
}

function update(time) {
    if (!GameState.gameRunning && !GameState.isRespawning && GameState.particles.length === 0 && GameState.floatingTexts.length === 0) {
        draw(time);
        return;
    }

    if (GameState.gameRunning && time - GameState.lastTime > GameState.gameSpeed) {
        moveSnake();
        GameState.lastTime = time;
    }
    
    updateEffects();
    draw(time);
    requestAnimationFrame(update);
}

function loseLife() {
    audio.playDie();
    createDeathExplosion(GameState.snake);
    GameState.lives--;
    updateLivesDisplay();
    GameState.gameRunning = false; 
    GameState.isRespawning = true; 
    
    // Continuar dibujando los efectos de explosión
    requestAnimationFrame(update);

    if (GameState.lives > 0) {
        setTimeout(() => {
            resetSnakePosition(true); 
            GameState.isRespawning = false; 
            GameState.gameRunning = true;
            GameState.isInvulnerable = true; 
            GameState.lastTime = performance.now();
            
            setTimeout(() => {
                GameState.isInvulnerable = false;
            }, 2000);

            requestAnimationFrame(update);
        }, 1000);
    } else {
        GameState.isRespawning = false;
        gameOver();
    }
}

function updateLivesDisplay() {
    if (livesCountElement) {
        livesCountElement.textContent = GameState.lives;
    }
}

function draw(time = performance.now()) {
    ctx.save();
    
    // Sacudida de pantalla (Screen Shake)
    if (GameState.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * GameState.screenShake;
        const shakeY = (Math.random() - 0.5) * GameState.screenShake;
        ctx.translate(shakeX, shakeY);
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Fondo cibernético oscuro
    ctx.fillStyle = '#060b08';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Rejilla cibernética sutil dentro de la arena jugable
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS - 1; c++) {
        ctx.moveTo(c * GRID_SIZE, GRID_SIZE);
        ctx.lineTo(c * GRID_SIZE, CANVAS_HEIGHT - GRID_SIZE);
    }
    for (let r = 1; r < ROWS - 1; r++) {
        ctx.moveTo(GRID_SIZE, r * GRID_SIZE);
        ctx.lineTo(CANVAS_WIDTH - GRID_SIZE, r * GRID_SIZE);
    }
    ctx.stroke();

    // Micro-puntos de intersección
    ctx.fillStyle = 'rgba(61, 255, 138, 0.12)';
    for (let c = 1; c < COLS - 1; c += 2) {
        for (let r = 1; r < ROWS - 1; r += 2) {
            ctx.fillRect(c * GRID_SIZE - 0.5, r * GRID_SIZE - 0.5, 1, 1);
        }
    }

    // Retículo táctico central en el fondo
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.moveTo(cx - 32, cy); ctx.lineTo(cx - 20, cy);
    ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 32, cy);
    ctx.moveTo(cx, cy - 32); ctx.lineTo(cx, cy - 20);
    ctx.moveTo(cx, cy + 20); ctx.lineTo(cx, cy + 32);
    ctx.stroke();

    // Detección de peligro por proximidad a los muros
    const head = GameState.snake[0];
    const nearWall = head && (head.x <= 1 || head.x >= COLS - 2 || head.y <= 1 || head.y >= ROWS - 2);
    const wallAlarm = nearWall && Math.floor(time / 120) % 2 === 0;

    // Pared perimetral de peligro
    ctx.fillStyle = '#0a1610';
    ctx.fillRect(0, 0, CANVAS_WIDTH, GRID_SIZE);
    ctx.fillRect(0, CANVAS_HEIGHT - GRID_SIZE, CANVAS_WIDTH, GRID_SIZE);
    ctx.fillRect(0, 0, GRID_SIZE, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - GRID_SIZE, 0, GRID_SIZE, CANVAS_HEIGHT);

    // Rayas diagonales de peligro en el borde
    ctx.fillStyle = wallAlarm ? 'rgba(255, 77, 109, 0.25)' : 'rgba(61, 255, 138, 0.08)';
    for (let i = 0; i < CANVAS_WIDTH; i += 12) {
        ctx.fillRect(i + 2, 2, 4, GRID_SIZE - 4);
        ctx.fillRect(i + 2, CANVAS_HEIGHT - GRID_SIZE + 2, 4, GRID_SIZE - 4);
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 12) {
        ctx.fillRect(2, i + 2, GRID_SIZE - 4, 4);
        ctx.fillRect(CANVAS_WIDTH - GRID_SIZE + 2, i + 2, GRID_SIZE - 4, 4);
    }

    // Línea láser perimetral neón
    ctx.strokeStyle = wallAlarm ? '#ff4d6d' : (nearWall ? '#ffb703' : '#3dff8a');
    ctx.lineWidth = 1.5;
    ctx.strokeRect(GRID_SIZE - 0.5, GRID_SIZE - 0.5, CANVAS_WIDTH - 2 * GRID_SIZE + 1, CANVAS_HEIGHT - 2 * GRID_SIZE + 1);

    // Nodos tecnológicos en las 4 esquinas con LEDs brillantes
    const corners = [
        [GRID_SIZE - 2, GRID_SIZE - 2],
        [CANVAS_WIDTH - GRID_SIZE - 3, GRID_SIZE - 2],
        [GRID_SIZE - 2, CANVAS_HEIGHT - GRID_SIZE - 3],
        [CANVAS_WIDTH - GRID_SIZE - 3, CANVAS_HEIGHT - GRID_SIZE - 3]
    ];
    corners.forEach(([kx, ky]) => {
        ctx.fillStyle = wallAlarm ? '#ff4d6d' : '#ffb703';
        ctx.fillRect(kx, ky, 5, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(kx + 1.5, ky + 1.5, 2, 2);
    });

    // ----------------------------------------------------
    // Comida Principal: Manzana Neón 3D con Brillos y Hoja
    // ----------------------------------------------------
    if (GameState.food) {
        const fx = GameState.food.x * GRID_SIZE;
        const fy = GameState.food.y * GRID_SIZE;
        const bob = Math.sin(time / 160) * 0.8;
        const appleY = fy + bob;

        // Halo de brillo radial
        const glow = ctx.createRadialGradient(fx + 5, appleY + 5.5, 1, fx + 5, appleY + 5.5, 9);
        glow.addColorStop(0, 'rgba(255, 42, 109, 0.4)');
        glow.addColorStop(1, 'rgba(255, 42, 109, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(fx + 5, appleY + 5.5, 9, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo de la manzana (3D degradado)
        const appleGrad = ctx.createLinearGradient(fx + 2, appleY + 2, fx + 8, appleY + 8);
        appleGrad.addColorStop(0, '#ff4d6d');
        appleGrad.addColorStop(0.6, '#ff0055');
        appleGrad.addColorStop(1, '#9b002c');
        ctx.fillStyle = appleGrad;
        drawRoundRect(ctx, fx + 2, appleY + 3, 6, 5.5, 2.5);
        ctx.fill();

        // Brillo especular
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(fx + 3.8, appleY + 4.2, 1, 0, Math.PI * 2);
        ctx.fill();

        // Tallo
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx + 5, appleY + 3);
        ctx.lineTo(fx + 5.2, appleY + 1.2);
        ctx.stroke();

        // Hoja verde esmeralda neón
        ctx.fillStyle = '#3dff8a';
        ctx.beginPath();
        ctx.ellipse(fx + 6.8, appleY + 1.6, 1.8, 1, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // ----------------------------------------------------
    // Comida Bonus: Estrella Dorada Centelleante
    // ----------------------------------------------------
    if (GameState.bonusFood) {
        const bx = GameState.bonusFood.x * GRID_SIZE;
        const by = GameState.bonusFood.y * GRID_SIZE;
        const bBob = Math.sin(time / 110) * 1.2;
        const starX = bx + 5;
        const starY = by + 5 + bBob;

        // Halo dorado
        const bGlow = ctx.createRadialGradient(starX, starY, 1, starX, starY, 11);
        bGlow.addColorStop(0, 'rgba(255, 183, 3, 0.55)');
        bGlow.addColorStop(1, 'rgba(255, 183, 3, 0)');
        ctx.fillStyle = bGlow;
        ctx.beginPath();
        ctx.arc(starX, starY, 11, 0, Math.PI * 2);
        ctx.fill();

        // Estrella de 4 puntas
        const starGrad = ctx.createLinearGradient(starX - 4, starY - 4, starX + 4, starY + 4);
        starGrad.addColorStop(0, '#fff3b0');
        starGrad.addColorStop(0.4, '#ffb703');
        starGrad.addColorStop(1, '#fb8500');
        ctx.fillStyle = starGrad;
        ctx.beginPath();
        ctx.moveTo(starX, starY - 4.5);
        ctx.lineTo(starX + 1.8, starY - 1.8);
        ctx.lineTo(starX + 4.5, starY);
        ctx.lineTo(starX + 1.8, starY + 1.8);
        ctx.lineTo(starX, starY + 4.5);
        ctx.lineTo(starX - 1.8, starY + 1.8);
        ctx.lineTo(starX - 4.5, starY);
        ctx.lineTo(starX - 1.8, starY - 1.8);
        ctx.closePath();
        ctx.fill();

        // Destello central blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(starX - 1, starY - 1, 2, 2);

        // Partículas orbitales
        const orbitAngle = time / 100;
        const ox1 = starX + Math.cos(orbitAngle) * 6;
        const oy1 = starY + Math.sin(orbitAngle) * 6;
        const ox2 = starX + Math.cos(orbitAngle + Math.PI) * 6;
        const oy2 = starY + Math.sin(orbitAngle + Math.PI) * 6;
        ctx.fillStyle = '#fffa65';
        ctx.fillRect(ox1 - 0.8, oy1 - 0.8, 1.6, 1.6);
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(ox2 - 0.8, oy2 - 0.8, 1.6, 1.6);

        // Anillo temporizador del bonus
        const timerFraction = GameState.bonusTimer / 90;
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(starX, starY, 7.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerFraction);
        ctx.stroke();
    }

    // ----------------------------------------------------
    // La Cyber-Víbora (Cuerpo Orgánico, Segmentos Unidos y Cabeza)
    // ----------------------------------------------------
    if (GameState.snake && GameState.snake.length > 0) {
        ctx.save();
        
        // Transparencia e Inmunidad
        if (GameState.isInvulnerable) {
            ctx.globalAlpha = 0.65 + 0.35 * Math.sin(time / 60);
        }

        const totalSegments = GameState.snake.length;
        const pulseSegment = Math.floor((time / 65) % (totalSegments + 4));

        // Dibujar segmentos de cola a cabeza
        for (let i = totalSegments - 1; i >= 0; i--) {
            const seg = GameState.snake[i];
            const sx = seg.x * GRID_SIZE;
            const sy = seg.y * GRID_SIZE;
            const t = i / Math.max(1, totalSegments - 1);

            // Gradiente: Cabeza (#3dff8a) -> Cuerpo Esmeralda (#10b981) -> Cola Teal (#059669)
            const r = Math.round(61 * (1 - t) + 5 * t);
            const g = Math.round(255 * (1 - t) + 150 * t);
            const b = Math.round(138 * (1 - t) + 105 * t);
            let segColor = `rgb(${r}, ${g}, ${b})`;

            // Pulso energético dorsal viajando por la columna
            if (i === pulseSegment) {
                segColor = '#00f5d4';
            }

            // Puentes entre segmentos adyacentes para formar un cuerpo serpiente continuo
            if (i > 0) {
                const prev = GameState.snake[i - 1];
                const pdx = prev.x - seg.x;
                const pdy = prev.y - seg.y;
                if (Math.abs(pdx) <= 1 && Math.abs(pdy) <= 1) {
                    ctx.fillStyle = segColor;
                    if (pdx === 1) ctx.fillRect(sx + 5, sy + 1.5, 6, 7);
                    else if (pdx === -1) ctx.fillRect(sx - 1, sy + 1.5, 6, 7);
                    else if (pdy === 1) ctx.fillRect(sx + 1.5, sy + 5, 7, 6);
                    else if (pdy === -1) ctx.fillRect(sx + 1.5, sy - 1, 7, 6);
                }
            }

            // Segmento individual
            if (i === 0) {
                // Cabeza: dibujada al final para estar encima
            } else if (i === totalSegments - 1) {
                // Punta de la cola afinada
                ctx.fillStyle = segColor;
                drawRoundRect(ctx, sx + 2, sy + 2, 6, 6, 2.5);
                ctx.fill();

                if (Math.random() < 0.25 && GameState.gameRunning) {
                    createTailDust(sx + 5, sy + 5);
                }
            } else {
                // Segmento de cuerpo
                ctx.fillStyle = segColor;
                drawRoundRect(ctx, sx + 1.5, sy + 1.5, 7, 7, 2.5);
                ctx.fill();

                // Brillo de escama dorsal
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.fillRect(sx + 2.5, sy + 2, 5, 1.2);

                // Núcleo espinal cibernético
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(sx + 4, sy + 4, 2, 2);
            }
        }

        // ----------------------------------------------------
        // Cabeza Esculpida y Ojos Expresivos (Índice 0)
        // ----------------------------------------------------
        const hSeg = GameState.snake[0];
        const hx = hSeg.x * GRID_SIZE;
        const hy = hSeg.y * GRID_SIZE;
        const dx = GameState.dx;
        const dy = GameState.dy;

        // Degradado de cabeza
        const headGrad = ctx.createLinearGradient(hx + 1, hy + 1, hx + 9, hy + 9);
        headGrad.addColorStop(0, '#52ff9a');
        headGrad.addColorStop(1, '#059669');
        ctx.fillStyle = headGrad;
        drawRoundRect(ctx, hx + 1, hy + 1, 8, 8, 3);
        ctx.fill();

        // Resalte superior de la cabeza
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(hx + 2.5, hy + 2, 5, 1.5);

        // Ojos de depredador (orientados hacia la dirección de movimiento)
        let eye1 = { x: hx + 2.5, y: hy + 2.5 };
        let eye2 = { x: hx + 6.5, y: hy + 6.5 };
        if (dx === 1) { // Derecha
            eye1 = { x: hx + 6, y: hy + 2.2 };
            eye2 = { x: hx + 6, y: hy + 6.8 };
        } else if (dx === -1) { // Izquierda
            eye1 = { x: hx + 3, y: hy + 2.2 };
            eye2 = { x: hx + 3, y: hy + 6.8 };
        } else if (dy === 1) { // Abajo
            eye1 = { x: hx + 2.2, y: hy + 6 };
            eye2 = { x: hx + 6.8, y: hy + 6 };
        } else if (dy === -1) { // Arriba
            eye1 = { x: hx + 2.2, y: hy + 3 };
            eye2 = { x: hx + 6.8, y: hy + 3 };
        }

        [eye1, eye2].forEach(e => {
            // Córnea ámbar brillante
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(e.x, e.y, 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Pupila negra orientada al frente
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(e.x + dx * 0.5, e.y + dy * 0.5, 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Destello de mirada
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(e.x - 0.4, e.y - 0.7, 0.8, 0.8);
        });

        // Lengua bífida neón parpadeante
        const tongueCycle = Math.sin(time / 75);
        if (tongueCycle > 0.35 && GameState.gameRunning) {
            const tx = hx + 5 + dx * 4.5;
            const ty = hy + 5 + dy * 4.5;
            const tipX = tx + dx * 3.5;
            const tipY = ty + dy * 3.5;

            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tipX, tipY);

            // Puntas de la lengua bífida
            const perpX = -dy;
            const perpY = dx;
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + dx * 1.5 + perpX * 1.5, tipY + dy * 1.5 + perpY * 1.5);
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + dx * 1.5 - perpX * 1.5, tipY + dy * 1.5 - perpY * 1.5);
            ctx.stroke();
        }

        // Campo de fuerza protector (cuando es invulnerable)
        if (GameState.isInvulnerable) {
            const shieldRadius = 9 + Math.sin(time / 80) * 1;
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(hx + 5, hy + 5, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();

            const shieldAngle = time / 90;
            ctx.strokeStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(hx + 5, hy + 5, shieldRadius, shieldAngle, shieldAngle + Math.PI * 0.6);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ----------------------------------------------------
    // Efectos de Partículas Activas
    // ----------------------------------------------------
    GameState.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // ----------------------------------------------------
    // Textos Flotantes (+10, +50 BONUS!)
    // ----------------------------------------------------
    GameState.floatingTexts.forEach(ft => {
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = ft.alpha;
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(ft.text, ft.x, ft.y);
        
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'left';

    // ----------------------------------------------------
    // HUD Cibernético en Pantalla
    // ----------------------------------------------------
    if (GameState.gameRunning) {
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(61, 255, 138, 0.65)';
        ctx.fillText(`LEN:${GameState.snake.length}`, 13, CANVAS_HEIGHT - 3);

        if (GameState.bonusFood && GameState.bonusTimer > 0) {
            ctx.fillStyle = '#ffb703';
            ctx.textAlign = 'right';
            ctx.fillText(`STAR:${Math.ceil(GameState.bonusTimer / 10)}s`, CANVAS_WIDTH - 13, CANVAS_HEIGHT - 3);
            ctx.textAlign = 'left';
        }
    }

    ctx.restore();
}

function updateScore() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(3, '0')}`;
}

function gameOver() {
    audio.playGameOver();
    GameState.gameRunning = false;
    saveRanking(GameState.score, GameState.currentNickname);
    
    // Notificar a todos los controladores conectados
    dataChannels.forEach(channel => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({ 
                type: 'game_over',
                score: GameState.score 
            }));
        }
    });

    if (gameOverOverlay) gameOverOverlay.classList.remove('hidden');

    window.resetTimeout = setTimeout(() => {
        if (!GameState.gameRunning) {
            resetSignaling();
        }
    }, 6000);
}

function startGame() {
    if (GameState.isRespawning) return;

    if (!GameState.gameRunning) {
        audio.init();
        audio.playStart();
        if (window.resetTimeout) clearTimeout(window.resetTimeout);
        
        init();
        GameState.lives = 3;
        GameState.isInvulnerable = false;
        updateLivesDisplay();
        GameState.gameRunning = true;
        GameState.lastTime = performance.now();
        
        // Ocultar overlays inmediatamente
        if (waitingOverlay) waitingOverlay.classList.add('hidden');
        if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
        
        if (playerNickElement && (!GameState.currentNickname || GameState.currentNickname === 'Player')) {
            playerNickElement.textContent = 'PLAYER: PILOT';
        }

        requestAnimationFrame(update);
    }
}

window.addEventListener('keydown', (e) => {
    if (audio.init) audio.init();
    if (GameState.isRespawning) return;

    const key = e.key.toLowerCase();
    
    // Si no está corriendo, cualquier tecla de acción o dirección inicia la partida
    if (!GameState.gameRunning) {
        if ([' ', 'enter', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
            e.preventDefault();
            playPreGameAdThenStart('VIPER', () => startGame());
            if (['arrowup', 'w'].includes(key) && GameState.dy !== 1) { GameState.nextDx = 0; GameState.nextDy = -1; }
            if (['arrowdown', 's'].includes(key) && GameState.dy !== -1) { GameState.nextDx = 0; GameState.nextDy = 1; }
            if (['arrowleft', 'a'].includes(key) && GameState.dx !== 1) { GameState.nextDx = -1; GameState.nextDy = 0; }
            if (['arrowright', 'd'].includes(key) && GameState.dx !== -1) { GameState.nextDx = 1; GameState.nextDy = 0; }
            return;
        }
    }

    if (['arrowup', 'w'].includes(key) && GameState.dy !== 1) { GameState.nextDx = 0; GameState.nextDy = -1; }
    if (['arrowdown', 's'].includes(key) && GameState.dy !== -1) { GameState.nextDx = 0; GameState.nextDy = 1; }
    if (['arrowleft', 'a'].includes(key) && GameState.dx !== 1) { GameState.nextDx = -1; GameState.nextDy = 0; }
    if (['arrowright', 'd'].includes(key) && GameState.dx !== -1) { GameState.nextDx = 1; GameState.nextDy = 0; }
});

[mainScreen, waitingOverlay, gameOverOverlay].forEach(el => {
    if (el) {
        el.addEventListener('click', () => {
            if (audio.init) audio.init();
            if (!GameState.gameRunning && !GameState.isRespawning) {
                playPreGameAdThenStart('VIPER', () => startGame());
            }
        });
    }
});

requestAdVideo();
loadRanking();
init();
updateQrCode();
autoScale();
draw();
connectSignaling();

// Bucle de animación idle cuando la pantalla espera interacción
function idleLoop(time) {
    if (!GameState.gameRunning && !GameState.isRespawning) {
        draw(time);
    }
    requestAnimationFrame(idleLoop);
}
requestAnimationFrame(idleLoop);

// Auto-scale to fit browser window with high responsiveness
function autoScale() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.style.transform = 'none';
    const naturalW = container.offsetWidth || 480;
    const naturalH = container.offsetHeight || 470;

    const availableW = window.innerWidth || document.documentElement.clientWidth;
    const availableH = window.innerHeight || document.documentElement.clientHeight;
    if (!availableW || !availableH) return;

    const padding = 20;
    const scaleX = (availableW - padding) / naturalW;
    const scaleY = (availableH - padding) / naturalH;
    const scale = Math.max(0.1, Math.min(scaleX, scaleY));

    container.style.transform = `scale(${scale})`;
}

window.addEventListener('DOMContentLoaded', () => {
    updateQrCode();
    autoScale();
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!audio.ctx) audio.init();
            else audio.resume();
        });
    }
});

// Multi-stage event bindings to ensure accurate dimensions
window.addEventListener('resize', autoScale);
window.addEventListener('load', () => {
    updateQrCode();
    autoScale();
});
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(autoScale);
}

// Observe document body changes
if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => autoScale());
    ro.observe(document.body);
}

// Listen for messages from screen parent frame (rescale, get ranking)
window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'RESCALE') {
        autoScale();
    } else if (event.data.type === 'GET_RANKING') {
        loadRanking();
    }
});

// Periodic retries after mount to handle dynamic layout shifts (images, QR)
[0, 50, 150, 300, 600, 1200].forEach(delay => setTimeout(autoScale, delay));

