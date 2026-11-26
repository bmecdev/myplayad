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

    playEat() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('eat');
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
    }

    playBonus() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('bonus');
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
    }

    playTurn() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
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
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('die');
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
    }

    playStart() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('start');
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
    }

    playGameOver() {
        if (this.adMuted || GameState.adPlaying || GameState.isDemo) return;
        broadcastSFX('gameover');
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
    }
}
const audio = new SnakeAudio();

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

// Configuration (Resolución HD 400x320 con celdas de 20px)
const GRID_SIZE = 20;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 320;
const COLS = CANVAS_WIDTH / GRID_SIZE; // 20 columnas lógicas
const ROWS = CANVAS_HEIGHT / GRID_SIZE; // 16 filas lógicas
const MATRIX_GREEN = '#3dff8a';
const INITIAL_GAME_SPEED = 150; // Velocidad más suave y controlable (150ms por casilla)
const MIN_GAME_SPEED = 75;      // Límite máximo de velocidad tras comer manzanas

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
    running: false,
    isDemo: false,
    paused: false,
    gameOver: false,
    adPlaying: false,
    isRespawning: false,
    isInvulnerable: false, 
    lastTime: 0,
    gameSpeed: INITIAL_GAME_SPEED,
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

    // Congelar inmediatamente el juego y silenciar todo audio del juego para no mezclarse con la publicidad
    GameState.adPlaying = true;
    GameState.isDemo = false;
    GameState.gameRunning = false;
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
        if (adPilotName) adPilotName.textContent = `PILOTO: ${(nickname || 'VIPER').toUpperCase()}`;
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

function resetSignaling() {
    console.log('Reiniciando sala para nueva partida...');
    closeSignalingIntentional();
    
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    dataChannels.clear();

    GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    connectSignaling();
    gameOverOverlay.classList.add('hidden');
    startAttractMode();
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
                if (pc && data.candidate) {
                    if (pc.remoteDescription) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (_) {}
                    } else if (pc._pendingCandidates) {
                        pc._pendingCandidates.push(data.candidate);
                    }
                }
            } else if (data.type === 'controller_connected') {
                console.log(`Controlador ${data.playerId} conectado. Esperando oferta...`);
                waitingOverlay.classList.add('hidden');
            } else if (data.type === 'controller_disconnected') {
                const dc = dataChannels.get(data.playerId);
                const pc = peerConnections.get(data.playerId);
                if ((dc && dc.readyState === 'open') || (pc && pc.connectionState === 'connected')) {
                    console.log(`[signaling] Ignorando controller_disconnected para player ${data.playerId}: WebRTC sigue activo`);
                    return;
                }
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
    if (GameState.adPlaying) {
        console.log(`[ad] Desconexión ignorada durante anuncio publicitario para player ${playerId}`);
        return;
    }
    const dc = dataChannels.get(playerId);
    const pc = peerConnections.get(playerId);
    if ((dc && dc.readyState === 'open') || (pc && pc.connectionState === 'connected')) {
        console.log(`[webrtc] Desconexión ignorada para player ${playerId}: canal WebRTC sigue activo`);
        return;
    }
    console.log(`Controlador ${playerId} desconectado.`);
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0) {
        startAttractMode();
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    console.log(`Recibida oferta de jugador ${playerId}`);

    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) ? window.GAME_CONFIG.getIceConfig() : getIceConfig();
    const pc = new RTCPeerConnection(rtcConfig);
    pc._pendingCandidates = [];
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
                if (input.type === 'ad_heartbeat_ack') return;
                if (input.type === 'nickname' || input.type === 'join') {
                    GameState.currentNickname = (input.nickname || input.value || 'VIPER').substring(0, 10);
                    if (playerNickElement) {
                        playerNickElement.textContent = `PLAYER: ${GameState.currentNickname.toUpperCase()}`;
                        playerNickElement.style.color = '';
                    }
                    playPreGameAdThenStart(GameState.currentNickname, () => startGame());
                } else {
                    if (GameState.adPlaying || GameState.paused || GameState.isDemo) return;
                    handleJoystickInput(input);
                }
            } catch (err) {
                console.error('Error en DataChannel message:', err);
            }
        };

        receiveChannel.onopen = () => {
            console.log(`DataChannel abierto con jugador ${playerId}`);
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
    if (GameState.adPlaying || GameState.paused || GameState.isDemo || GameState.isRespawning) return;

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
    const count = customColor ? 22 : 16;
    const palette = customColor 
        ? [customColor, '#ffffff', '#fffa65', '#ffd166'] 
        : ['#ff2a6d', '#ff4d6d', '#ff7597', '#3dff8a', '#ffffff'];
    
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 3.6 + 1.2;
        GameState.particles.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3.2 + 1.8,
            color: palette[Math.floor(Math.random() * palette.length)],
            alpha: 1.0,
            life: Math.floor(Math.random() * 16 + 18),
            maxLife: 34,
            drag: 0.93
        });
    }
}

function createBonusBurst(gridX, gridY) {
    const px = gridX * GRID_SIZE + GRID_SIZE / 2;
    const py = gridY * GRID_SIZE + GRID_SIZE / 2;
    const palette = ['#ffe600', '#ffb703', '#ffffff', '#00f5d4', '#ff7b00', '#ffea00'];
    
    for (let i = 0; i < 28; i++) {
        const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.3;
        const speed = Math.random() * 4.6 + 1.5;
        GameState.particles.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3.8 + 2.0,
            color: palette[Math.floor(Math.random() * palette.length)],
            alpha: 1.0,
            life: Math.floor(Math.random() * 24 + 22),
            maxLife: 46,
            drag: 0.94
        });
    }
}

function createDeathExplosion(snakeSegments) {
    GameState.screenShake = 12;
    const colors = ['#3dff8a', '#ff4d6d', '#ffb703', '#ffffff', '#00f5d4', '#ff0055'];
    
    snakeSegments.forEach((segment, idx) => {
        const px = segment.x * GRID_SIZE + GRID_SIZE / 2;
        const py = segment.y * GRID_SIZE + GRID_SIZE / 2;
        const count = idx === 0 ? 12 : 6;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4.8 + 1.4;
            GameState.particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4.2 + 2.2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1.0,
                life: Math.floor(Math.random() * 28 + 24),
                maxLife: 52,
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
        life: 40,
        maxLife: 40
    });
}

function createTailDust(px, py) {
    if (GameState.particles.length > 60) return;
    GameState.particles.push({
        x: px + (Math.random() - 0.5) * 6,
        y: py + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 2.2 + 1.2,
        color: Math.random() < 0.5 ? '#10b981' : '#00f5d4',
        alpha: 0.7,
        life: 18,
        maxLife: 18,
        drag: 0.91
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
    GameState.gameSpeed = INITIAL_GAME_SPEED; 
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
            GameState.bonusTimer = 60; // ~9 segundos a velocidad normal
            createEatBurst(newBonus.x, newBonus.y, '#ffe600');
            break;
        }
    }
}

function isCellOccupiedBySnake(x, y, ignoreTail = true) {
    const limit = ignoreTail ? Math.max(0, GameState.snake.length - 1) : GameState.snake.length;
    for (let i = 0; i < limit; i++) {
        if (GameState.snake[i].x === x && GameState.snake[i].y === y) return true;
    }
    return false;
}

function countReachableCells(startX, startY, maxVisit = 80) {
    const visited = new Set();
    const queue = [{ x: startX, y: startY }];
    visited.add(`${startX},${startY}`);
    let count = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length > 0 && count < maxVisit) {
        const cur = queue.shift();
        count++;
        for (let i = 0; i < 4; i++) {
            const nx = cur.x + dirs[i][0];
            const ny = cur.y + dirs[i][1];
            if (nx <= 0 || nx >= COLS - 1 || ny <= 0 || ny >= ROWS - 1) continue;
            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            if (isCellOccupiedBySnake(nx, ny, true)) continue;
            visited.add(key);
            queue.push({ x: nx, y: ny });
        }
    }
    return count;
}

function computeDemoSnakeDirection() {
    if (!GameState.snake || GameState.snake.length === 0) return;
    const head = GameState.snake[0];
    const target = GameState.bonusFood || GameState.food || { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
    const candidates = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
    ].filter(d => !(d.dx === -GameState.dx && d.dy === -GameState.dy));

    let bestMove = null;
    let bestScore = -Infinity;

    for (const dir of candidates) {
        const nx = head.x + dir.dx;
        const ny = head.y + dir.dy;
        if (nx <= 0 || nx >= COLS - 1 || ny <= 0 || ny >= ROWS - 1) continue;
        if (isCellOccupiedBySnake(nx, ny, true)) continue;

        const reachable = countReachableCells(nx, ny, Math.min(90, GameState.snake.length + 28));
        const dist = Math.abs(nx - target.x) + Math.abs(ny - target.y);
        const safeBonus = reachable >= GameState.snake.length + 4 ? 1000 : reachable * 20;
        const wallMargin = (nx > 1 && nx < COLS - 2 && ny > 1 && ny < ROWS - 2) ? 1.5 : 0;
        const straightBonus = (dir.dx === GameState.dx && dir.dy === GameState.dy) ? 0.5 : 0;
        const score = safeBonus - dist * 8 + wallMargin + straightBonus;

        if (score > bestScore) {
            bestScore = score;
            bestMove = dir;
        }
    }

    if (bestMove) {
        GameState.nextDx = bestMove.dx;
        GameState.nextDy = bestMove.dy;
    }
}

function resetDemoSnakeSilently() {
    GameState.snake = [];
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    for (let i = 0; i < 5; i++) {
        GameState.snake.push({ x: startX - i, y: startY });
    }
    GameState.dx = 1;
    GameState.dy = 0;
    GameState.nextDx = 1;
    GameState.nextDy = 0;
    GameState.score = 0;
    GameState.foodsEaten = 0;
    GameState.gameSpeed = 115;
    GameState.bonusFood = null;
    GameState.bonusTimer = 0;
    GameState.particles = [];
    GameState.floatingTexts = [];
    GameState.screenShake = 0;
    placeFood();
    updateScore();
}

function moveSnake() {
    if (GameState.isDemo) {
        computeDemoSnakeDirection();
    }

    if (GameState.dx !== GameState.nextDx || GameState.dy !== GameState.nextDy) {
        audio.playTurn();
    }
    GameState.dx = GameState.nextDx;
    GameState.dy = GameState.nextDy;

    if (GameState.isInvulnerable) return;

    const head = { x: GameState.snake[0].x + GameState.dx, y: GameState.snake[0].y + GameState.dy };

    if (head.x <= 0 || head.x >= COLS - 1 || head.y <= 0 || head.y >= ROWS - 1) {
        if (GameState.isDemo) {
            resetDemoSnakeSilently();
            return;
        }
        loseLife();
        return;
    }

    if (GameState.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        if (GameState.isDemo) {
            resetDemoSnakeSilently();
            return;
        }
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
        createFloatingText(head.x * GRID_SIZE + GRID_SIZE / 2, head.y * GRID_SIZE - 4, '+10', '#3dff8a');
        placeFood();
        if (GameState.gameSpeed > MIN_GAME_SPEED) GameState.gameSpeed -= 1;

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
        createFloatingText(head.x * GRID_SIZE + GRID_SIZE / 2, head.y * GRID_SIZE - 6, '+50 BONUS!', '#ffe600');
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

    // Mantener demo fluido si la serpiente se vuelve demasiado larga
    if (GameState.isDemo && GameState.snake.length > 36) {
        resetDemoSnakeSilently();
    }
}

function gameLoop(time) {
    if (!GameState.adPlaying && !GameState.paused) {
        if (GameState.gameRunning && time - GameState.lastTime > GameState.gameSpeed) {
            moveSnake();
            GameState.lastTime = time;
        }
        updateEffects();
        draw(time);
    }
    requestAnimationFrame(gameLoop);
}

function loseLife() {
    if (GameState.isDemo) {
        resetDemoSnakeSilently();
        return;
    }
    audio.playDie();
    createDeathExplosion(GameState.snake);
    GameState.lives--;
    updateLivesDisplay();
    GameState.gameRunning = false;
    GameState.running = false;
    GameState.isRespawning = true;

    if (GameState.lives > 0) {
        setTimeout(() => {
            if (GameState.adPlaying || GameState.isDemo) return;
            resetSnakePosition(true);
            GameState.isRespawning = false;
            GameState.gameRunning = true;
            GameState.running = true;
            GameState.isInvulnerable = true;
            GameState.lastTime = performance.now();

            setTimeout(() => {
                GameState.isInvulnerable = false;
            }, 2000);
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

    // Fondo cibernético con gradiente radial de profundidad
    const bgGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.68
    );
    bgGrad.addColorStop(0, '#0d2217');
    bgGrad.addColorStop(0.65, '#06120b');
    bgGrad.addColorStop(1, '#020604');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Rejilla cibernética sutil dentro de la arena jugable (GRID_SIZE = 20)
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS - 1; c++) {
        const gx = c * GRID_SIZE;
        ctx.moveTo(gx, GRID_SIZE);
        ctx.lineTo(gx, CANVAS_HEIGHT - GRID_SIZE);
    }
    for (let r = 1; r < ROWS - 1; r++) {
        const gy = r * GRID_SIZE;
        ctx.moveTo(GRID_SIZE, gy);
        ctx.lineTo(CANVAS_WIDTH - GRID_SIZE, gy);
    }
    ctx.stroke();

    // Micro-nodos cibernéticos en intersecciones
    ctx.fillStyle = 'rgba(61, 255, 138, 0.16)';
    for (let c = 1; c < COLS - 1; c++) {
        for (let r = 1; r < ROWS - 1; r++) {
            ctx.fillRect(c * GRID_SIZE - 1, r * GRID_SIZE - 1, 2, 2);
        }
    }

    // Retículo táctico central en el fondo
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.04)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.moveTo(cx - 65, cy); ctx.lineTo(cx - 40, cy);
    ctx.moveTo(cx + 40, cy); ctx.lineTo(cx + 65, cy);
    ctx.moveTo(cx, cy - 65); ctx.lineTo(cx, cy - 40);
    ctx.moveTo(cx, cy + 40); ctx.lineTo(cx, cy + 65);
    ctx.stroke();

    // Detección de peligro por proximidad a los muros perimetrales
    const head = GameState.snake[0];
    const nearWall = head && (head.x <= 1 || head.x >= COLS - 2 || head.y <= 1 || head.y >= ROWS - 2);
    const wallAlarm = nearWall && Math.floor(time / 110) % 2 === 0;

    // Pared perimetral de peligro (Grosor = 20px)
    ctx.fillStyle = '#08140e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, GRID_SIZE);
    ctx.fillRect(0, CANVAS_HEIGHT - GRID_SIZE, CANVAS_WIDTH, GRID_SIZE);
    ctx.fillRect(0, 0, GRID_SIZE, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - GRID_SIZE, 0, GRID_SIZE, CANVAS_HEIGHT);

    // Franjas diagonales hazard de peligro
    ctx.fillStyle = wallAlarm ? 'rgba(255, 77, 109, 0.35)' : (nearWall ? 'rgba(255, 183, 3, 0.20)' : 'rgba(61, 255, 138, 0.09)');
    for (let i = 0; i < CANVAS_WIDTH; i += 24) {
        ctx.fillRect(i + 3, 3, 8, GRID_SIZE - 6);
        ctx.fillRect(i + 3, CANVAS_HEIGHT - GRID_SIZE + 3, 8, GRID_SIZE - 6);
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 24) {
        ctx.fillRect(3, i + 3, GRID_SIZE - 6, 8);
        ctx.fillRect(CANVAS_WIDTH - GRID_SIZE + 3, i + 3, GRID_SIZE - 6, 8);
    }

    // Línea láser perimetral neón con resplandor
    const laserCol = wallAlarm ? '#ff4d6d' : (nearWall ? '#ffb703' : '#3dff8a');
    ctx.strokeStyle = laserCol;
    ctx.lineWidth = 2.0;
    ctx.strokeRect(GRID_SIZE - 0.5, GRID_SIZE - 0.5, CANVAS_WIDTH - 2 * GRID_SIZE + 1, CANVAS_HEIGHT - 2 * GRID_SIZE + 1);

    // 4 Nodos / Torretas de energía en las esquinas con capacitores
    const cornerW = GRID_SIZE;
    const corners = [
        [0, 0],
        [CANVAS_WIDTH - cornerW, 0],
        [0, CANVAS_HEIGHT - cornerW],
        [CANVAS_WIDTH - cornerW, CANVAS_HEIGHT - cornerW]
    ];
    corners.forEach(([kx, ky]) => {
        ctx.fillStyle = '#102419';
        ctx.fillRect(kx, ky, cornerW, cornerW);
        ctx.strokeStyle = laserCol;
        ctx.lineWidth = 1;
        ctx.strokeRect(kx + 1.5, ky + 1.5, cornerW - 3, cornerW - 3);

        const corePulse = 3.6 + Math.sin(time / 140) * 0.9;
        ctx.fillStyle = wallAlarm ? '#ff4d6d' : '#ffea00';
        ctx.beginPath();
        ctx.arc(kx + cornerW / 2, ky + cornerW / 2, corePulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(kx + cornerW / 2 - 1, ky + cornerW / 2 - 1, 2, 2);
    });

    // ----------------------------------------------------
    // Comida Principal: Manzana Neón 3D con Brillos y Sombra
    // ----------------------------------------------------
    if (GameState.food) {
        const fx = GameState.food.x * GRID_SIZE;
        const fy = GameState.food.y * GRID_SIZE;
        const bob = Math.sin(time / 160) * 1.5;
        const appleX = fx + 10;
        const appleY = fy + 10 + bob;

        // Sombra suave en el suelo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(appleX, fy + 17, Math.max(2, 6.5 - bob * 0.4), Math.max(1, 2.2 - bob * 0.15), 0, 0, Math.PI * 2);
        ctx.fill();

        // Halo de resplandor radial cálido
        const glow = ctx.createRadialGradient(appleX, appleY, 2, appleX, appleY, 18);
        glow.addColorStop(0, 'rgba(255, 42, 109, 0.45)');
        glow.addColorStop(0.65, 'rgba(255, 42, 109, 0.15)');
        glow.addColorStop(1, 'rgba(255, 42, 109, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(appleX, appleY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo esférico 3D de la manzana
        const bodyGrad = ctx.createRadialGradient(appleX - 2.5, appleY - 2.5, 1.5, appleX, appleY, 7.5);
        bodyGrad.addColorStop(0, '#ff7597');
        bodyGrad.addColorStop(0.3, '#ff1744');
        bodyGrad.addColorStop(0.75, '#c2185b');
        bodyGrad.addColorStop(1, '#500018');
        ctx.fillStyle = bodyGrad;

        // Geometría orgánica de manzana con hendidura superior
        ctx.beginPath();
        ctx.arc(appleX - 2.8, appleY + 0.5, 5.0, 0, Math.PI * 2);
        ctx.arc(appleX + 2.8, appleY + 0.5, 5.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(appleX, appleY + 2.2, 5.2, 0, Math.PI * 2);
        ctx.fill();

        // Reflejo especular blanco curvado
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.beginPath();
        ctx.ellipse(appleX - 2.8, appleY - 2.2, 2.0, 1.2, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // Reflejo verde ambiente en borde inferior derecho (rebote de luz de la arena)
        ctx.fillStyle = 'rgba(61, 255, 138, 0.35)';
        ctx.beginPath();
        ctx.arc(appleX + 3.2, appleY + 4.0, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Tallo curvado de madera
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(appleX, appleY - 3.5);
        ctx.quadraticCurveTo(appleX + 1.5, appleY - 6.5, appleX + 3.5, appleY - 7.5);
        ctx.stroke();

        // Hoja verde esmeralda neón con nervio
        ctx.fillStyle = '#00e676';
        ctx.beginPath();
        ctx.ellipse(appleX + 4.5, appleY - 5.5, 3.2, 1.8, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b9f6ca';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(appleX + 2.5, appleY - 5.5);
        ctx.lineTo(appleX + 6.5, appleY - 5.5);
        ctx.stroke();
    }

    // ----------------------------------------------------
    // Comida Bonus: Estrella Dorada Cósmica Centelleante
    // ----------------------------------------------------
    if (GameState.bonusFood) {
        const bx = GameState.bonusFood.x * GRID_SIZE;
        const by = GameState.bonusFood.y * GRID_SIZE;
        const bBob = Math.sin(time / 110) * 2.0;
        const starX = bx + 10;
        const starY = by + 10 + bBob;

        // Sombra proyectada
        ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
        ctx.beginPath();
        ctx.ellipse(starX, by + 17, 7, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Halo dorado exterior
        const bGlow = ctx.createRadialGradient(starX, starY, 2, starX, starY, 22);
        bGlow.addColorStop(0, 'rgba(255, 215, 0, 0.65)');
        bGlow.addColorStop(0.5, 'rgba(255, 183, 3, 0.28)');
        bGlow.addColorStop(1, 'rgba(255, 183, 3, 0)');
        ctx.fillStyle = bGlow;
        ctx.beginPath();
        ctx.arc(starX, starY, 22, 0, Math.PI * 2);
        ctx.fill();

        // Anillo medidor de tiempo restante
        const timerFraction = Math.max(0, GameState.bonusTimer / 60);
        const ringCol = timerFraction > 0.4 ? '#ffea00' : '#ff4d6d';
        ctx.strokeStyle = ringCol;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(starX, starY, 13.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timerFraction);
        ctx.stroke();

        // Estrella de 8 puntas facetada en oro brillante
        const outerR = 8.5;
        const innerR = 3.8;
        ctx.fillStyle = '#ffb300';
        ctx.beginPath();
        for (let p = 0; p < 16; p++) {
            const r = (p % 2 === 0) ? outerR : innerR;
            const a = (p * Math.PI) / 8 - Math.PI / 2;
            const px = starX + Math.cos(a) * r;
            const py = starY + Math.sin(a) * r;
            if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Faceta interna brillante
        const coreR = 5.5;
        const starGrad = ctx.createLinearGradient(starX - coreR, starY - coreR, starX + coreR, starY + coreR);
        starGrad.addColorStop(0, '#ffffff');
        starGrad.addColorStop(0.4, '#fff59d');
        starGrad.addColorStop(1, '#ffa000');
        ctx.fillStyle = starGrad;
        ctx.beginPath();
        ctx.arc(starX, starY, 3.8, 0, Math.PI * 2);
        ctx.fill();

        // Destello de 4 rayos
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(starX - 5.5, starY - 0.75, 11, 1.5);
        ctx.fillRect(starX - 0.75, starY - 5.5, 1.5, 11);

        // Orbes orbitales de plasma
        const orbitA = time / 110;
        const ox1 = starX + Math.cos(orbitA) * 11;
        const oy1 = starY + Math.sin(orbitA) * 11;
        const ox2 = starX + Math.cos(orbitA + Math.PI) * 11;
        const oy2 = starY + Math.sin(orbitA + Math.PI) * 11;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ox1, oy1, 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffea00';
        ctx.beginPath(); ctx.arc(ox1, oy1, 3.2, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ox2, oy2, 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00f5d4';
        ctx.beginPath(); ctx.arc(ox2, oy2, 3.2, 0, Math.PI * 2); ctx.fill();
    }

    // ----------------------------------------------------
    // La Cyber-Víbora (Cuerpo Orgánico, Segmentos Unidos y Cabeza)
    // ----------------------------------------------------
    if (GameState.snake && GameState.snake.length > 0) {
        ctx.save();
        if (GameState.isInvulnerable) {
            ctx.globalAlpha = 0.65 + 0.35 * Math.sin(time / 60);
        }

        const totalSegments = GameState.snake.length;
        const pulseSegment = Math.floor((time / 70) % (totalSegments + 6));
        const segBoxSize = 15;

        // 1. Sombras del cuerpo entero sobre el asfalto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
        for (let i = totalSegments - 1; i >= 0; i--) {
            const seg = GameState.snake[i];
            const sx = seg.x * GRID_SIZE + 10;
            const sy = seg.y * GRID_SIZE + 10;
            ctx.beginPath();
            ctx.ellipse(sx, sy + 2, 7.5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Puentes continuos entre segmentos adyacentes para formar cuerpo sin costuras
        for (let i = totalSegments - 1; i > 0; i--) {
            const seg = GameState.snake[i];
            const prev = GameState.snake[i - 1];
            const pdx = prev.x - seg.x;
            const pdy = prev.y - seg.y;
            const sx = seg.x * GRID_SIZE + 10;
            const sy = seg.y * GRID_SIZE + 10;

            if (Math.abs(pdx) <= 1 && Math.abs(pdy) <= 1) {
                const t = i / Math.max(1, totalSegments - 1);
                const r = Math.round(61 * (1 - t) + 6 * t);
                const g = Math.round(255 * (1 - t) + 120 * t);
                const b = Math.round(138 * (1 - t) + 85 * t);
                const bridgeCol = (i === pulseSegment) ? '#00f5d4' : `rgb(${r}, ${g}, ${b})`;

                ctx.fillStyle = bridgeCol;
                if (pdx === 1) ctx.fillRect(sx, sy - 6.5, GRID_SIZE, 13);
                else if (pdx === -1) ctx.fillRect(sx - GRID_SIZE, sy - 6.5, GRID_SIZE, 13);
                else if (pdy === 1) ctx.fillRect(sx - 6.5, sy, 13, GRID_SIZE);
                else if (pdy === -1) ctx.fillRect(sx - 6.5, sy - GRID_SIZE, 13, GRID_SIZE);
            }
        }

        // 3. Segmentos de cola a cuello (excluyendo la cabeza para dibujarla al final)
        for (let i = totalSegments - 1; i > 0; i--) {
            const seg = GameState.snake[i];
            const sx = seg.x * GRID_SIZE + 2.5;
            const sy = seg.y * GRID_SIZE + 2.5;
            const t = i / Math.max(1, totalSegments - 1);

            const r = Math.round(61 * (1 - t) + 6 * t);
            const g = Math.round(255 * (1 - t) + 120 * t);
            const b = Math.round(138 * (1 - t) + 85 * t);
            const isPulse = (i === pulseSegment);
            const segColor = isPulse ? '#00f5d4' : `rgb(${r}, ${g}, ${b})`;

            if (i === totalSegments - 1) {
                // Punta de la cola afinada
                ctx.fillStyle = segColor;
                drawRoundRect(ctx, sx + 2, sy + 2, 11, 11, 5.5);
                ctx.fill();

                // Sonajero tecnológico en la cola
                ctx.fillStyle = '#ffea00';
                drawRoundRect(ctx, sx + 4, sy + 4, 7, 7, 3.5);
                ctx.fill();

                if (Math.random() < 0.28 && GameState.gameRunning) {
                    createTailDust(sx + 7.5, sy + 7.5);
                }
            } else {
                // Segmento de cuerpo con relieve 3D y brillo
                const segGrad = ctx.createLinearGradient(sx, sy, sx + segBoxSize, sy + segBoxSize);
                segGrad.addColorStop(0, isPulse ? '#ffffff' : `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 30)}, ${b})`);
                segGrad.addColorStop(0.5, segColor);
                segGrad.addColorStop(1, `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 30)})`);
                ctx.fillStyle = segGrad;
                drawRoundRect(ctx, sx, sy, segBoxSize, segBoxSize, 5);
                ctx.fill();

                // Escama dorsal reflectante
                ctx.fillStyle = isPulse ? '#ffffff' : 'rgba(255, 255, 255, 0.45)';
                ctx.beginPath();
                ctx.ellipse(sx + segBoxSize / 2, sy + 3.8, 4.2, 1.8, 0, 0, Math.PI * 2);
                ctx.fill();

                // Núcleo espinal cibernético
                ctx.fillStyle = isPulse ? '#00f5d4' : 'rgba(0, 0, 0, 0.28)';
                ctx.fillRect(sx + segBoxSize / 2 - 1.5, sy + segBoxSize / 2 - 1.5, 3, 3);
            }
        }

        // 4. Cabeza Viperina Esculpida (Segmento 0)
        const hSeg = GameState.snake[0];
        const hx = hSeg.x * GRID_SIZE + 2;
        const hy = hSeg.y * GRID_SIZE + 2;
        const headSize = 16;
        const dx = GameState.dx;
        const dy = GameState.dy;

        // Degradado tridimensional de la cabeza
        const headGrad = ctx.createLinearGradient(hx, hy, hx + headSize, hy + headSize);
        headGrad.addColorStop(0, '#69f0ae');
        headGrad.addColorStop(0.5, '#00e676');
        headGrad.addColorStop(1, '#00796b');
        ctx.fillStyle = headGrad;
        drawRoundRect(ctx, hx, hy, headSize, headSize, 6);
        ctx.fill();

        // Placa dorsal de la cabeza
        ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
        ctx.beginPath();
        ctx.ellipse(hx + headSize / 2, hy + headSize / 2 - 1, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ojos de depredador calculados según dirección
        const centerHx = hx + headSize / 2;
        const centerHy = hy + headSize / 2;
        let eye1, eye2;

        if (dx === 1) { // Derecha
            eye1 = { x: centerHx + 3.5, y: centerHy - 4.2 };
            eye2 = { x: centerHx + 3.5, y: centerHy + 4.2 };
        } else if (dx === -1) { // Izquierda
            eye1 = { x: centerHx - 3.5, y: centerHy - 4.2 };
            eye2 = { x: centerHx - 3.5, y: centerHy + 4.2 };
        } else if (dy === 1) { // Abajo
            eye1 = { x: centerHx - 4.2, y: centerHy + 3.5 };
            eye2 = { x: centerHx + 4.2, y: centerHy + 3.5 };
        } else { // Arriba
            eye1 = { x: centerHx - 4.2, y: centerHy - 3.5 };
            eye2 = { x: centerHx + 4.2, y: centerHy - 3.5 };
        }

        [eye1, eye2].forEach(e => {
            // Cuenca ocular
            ctx.fillStyle = '#02180c';
            ctx.beginPath();
            ctx.arc(e.x, e.y, 3.2, 0, Math.PI * 2);
            ctx.fill();

            // Esclerótica ámbar neón
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(e.x, e.y, 2.4, 0, Math.PI * 2);
            ctx.fill();

            // Pupila vertical rasgada orientada al frente
            ctx.fillStyle = '#000000';
            const pupilW = Math.abs(dx) > 0 ? 0.9 : 1.8;
            const pupilH = Math.abs(dx) > 0 ? 3.0 : 0.9;
            ctx.fillRect(e.x - pupilW / 2 + dx * 0.6, e.y - pupilH / 2 + dy * 0.6, pupilW, pupilH);

            // Destello de mirada especular
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(e.x - 0.7, e.y - 1.2, 1.2, 1.2);
        });

        // Lengua bífida animada
        const tongueCycle = Math.sin(time / 70);
        if (tongueCycle > 0.25 && GameState.gameRunning) {
            const tx = centerHx + dx * 8.5;
            const ty = centerHy + dy * 8.5;
            const tipX = tx + dx * 6.5;
            const tipY = ty + dy * 6.5;

            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tipX, tipY);

            // Dos puntas bífidas
            const perpX = -dy;
            const perpY = dx;
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + dx * 2.8 + perpX * 2.8, tipY + dy * 2.8 + perpY * 2.8);
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + dx * 2.8 - perpX * 2.8, tipY + dy * 2.8 - perpY * 2.8);
            ctx.stroke();
        }

        // Escudo de invulnerabilidad
        if (GameState.isInvulnerable) {
            const shieldRadius = 16 + Math.sin(time / 80) * 1.5;
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(centerHx, centerHy, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();

            const shieldAngle = time / 90;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(centerHx, centerHy, shieldRadius, shieldAngle, shieldAngle + Math.PI * 0.65);
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
        ctx.arc(p.x, p.y, Math.max(0.8, p.size), 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // ----------------------------------------------------
    // Textos Flotantes (+10, +50 BONUS!)
    // ----------------------------------------------------
    GameState.floatingTexts.forEach(ft => {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = ft.alpha;
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
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
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(61, 255, 138, 0.75)';
        ctx.fillText(`LEN:${GameState.snake.length}`, 28, CANVAS_HEIGHT - 6);

        if (GameState.bonusFood && GameState.bonusTimer > 0) {
            ctx.fillStyle = '#ffb703';
            ctx.textAlign = 'right';
            const remainSec = Math.ceil(GameState.bonusTimer / (60 / 9));
            ctx.fillText(`STAR:${remainSec}s`, CANVAS_WIDTH - 28, CANVAS_HEIGHT - 6);
            ctx.textAlign = 'left';
        }
    }

    ctx.restore();
}

function updateScore() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(3, '0')}`;
}

function startAttractMode() {
    stopAttractMode();
    if (window.resetTimeout) {
        clearTimeout(window.resetTimeout);
        window.resetTimeout = null;
    }

    const qrPanel = document.getElementById('waiting-qr-panel');
    loadRanking();

    GameState.isDemo = true;
    GameState.adPlaying = false;
    GameState.gameRunning = true;
    GameState.running = true;
    GameState.gameOver = false;
    GameState.paused = false;
    GameState.isRespawning = false;
    GameState.isInvulnerable = false;
    GameState.lives = 3;
    GameState.currentNickname = 'DEMO';

    if (window.parent && window.parent !== window) {
        try { window.parent.postMessage({ type: 'GAME_PLAY_END' }, '*'); } catch (_) {}
    }

    resetDemoSnakeSilently();
    GameState.lastTime = performance.now();
    updateLivesDisplay();
    if (playerNickElement) {
        playerNickElement.textContent = 'PLAYER: DEMO';
        playerNickElement.style.color = 'var(--amber)';
    }

    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    if (waitingOverlay) waitingOverlay.classList.remove('hidden');
    if (qrPanel) qrPanel.classList.remove('hidden');
}

function stopAttractMode() {
    GameState.isDemo = false;
    if (waitingOverlay) waitingOverlay.classList.add('hidden');
}

function gameOver() {
    if (GameState.isDemo) {
        resetDemoSnakeSilently();
        return;
    }
    audio.playGameOver();
    GameState.gameRunning = false;
    GameState.running = false;
    GameState.gameOver = true;
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
        if (!GameState.gameRunning && !GameState.adPlaying) {
            resetSignaling();
        }
    }, 6000);
}

function startGame() {
    if (GameState.isRespawning) return;

    stopAttractMode();
    if (window.resetTimeout) {
        clearTimeout(window.resetTimeout);
        window.resetTimeout = null;
    }

    init();
    GameState.isDemo = false;
    GameState.adPlaying = false;
    GameState.paused = false;
    GameState.gameOver = false;
    GameState.lives = 3;
    GameState.isInvulnerable = false;
    updateLivesDisplay();
    GameState.gameRunning = true;
    GameState.running = true;
    GameState.lastTime = performance.now();

    if (window.parent && window.parent !== window) {
        try { window.parent.postMessage({ type: 'GAME_PLAY_START' }, '*'); } catch (_) {}
    }

    // Ocultar overlays inmediatamente
    if (waitingOverlay) waitingOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');

    if (playerNickElement) {
        const nick = (!GameState.currentNickname || GameState.currentNickname === 'Player' || GameState.currentNickname === 'DEMO')
            ? 'VIPER'
            : GameState.currentNickname;
        GameState.currentNickname = nick;
        playerNickElement.textContent = `PLAYER: ${nick.toUpperCase().substring(0, 8)}`;
        playerNickElement.style.color = '';
    }

    audio.init();
    audio.playStart();
}

window.addEventListener('keydown', (e) => {
    if (GameState.adPlaying) {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
            if (typeof window._finishCurrentAd === 'function') {
                window._finishCurrentAd();
            }
        }
        return;
    }

    if (audio.init) audio.init();
    if (GameState.isRespawning) return;

    const key = e.key.toLowerCase();

    // Si está en modo demo, pausa o game over, Espacio/Enter inicia la partida real
    if (GameState.isDemo || !GameState.gameRunning || GameState.gameOver) {
        if ([' ', 'enter', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
            e.preventDefault();
            GameState.currentNickname = 'VIPER';
            playPreGameAdThenStart('VIPER', () => {
                startGame();
                if (['arrowup', 'w'].includes(key) && GameState.dy !== 1) { GameState.nextDx = 0; GameState.nextDy = -1; }
                if (['arrowdown', 's'].includes(key) && GameState.dy !== -1) { GameState.nextDx = 0; GameState.nextDy = 1; }
                if (['arrowleft', 'a'].includes(key) && GameState.dx !== 1) { GameState.nextDx = -1; GameState.nextDy = 0; }
                if (['arrowright', 'd'].includes(key) && GameState.dx !== -1) { GameState.nextDx = 1; GameState.nextDy = 0; }
            });
            return;
        }
    }

    if (['arrowup', 'w'].includes(key) && GameState.dy !== 1) { GameState.nextDx = 0; GameState.nextDy = -1; }
    if (['arrowdown', 's'].includes(key) && GameState.dy !== -1) { GameState.nextDx = 0; GameState.nextDy = 1; }
    if (['arrowleft', 'a'].includes(key) && GameState.dx !== 1) { GameState.nextDx = -1; GameState.nextDy = 0; }
    if (['arrowright', 'd'].includes(key) && GameState.dx !== -1) { GameState.nextDx = 1; GameState.nextDy = 0; }
});

[mainScreen, gameOverOverlay].forEach(el => {
    if (el) {
        el.addEventListener('click', () => {
            if (GameState.adPlaying) return;
            if (audio.init) audio.init();
            if ((GameState.isDemo || !GameState.gameRunning || GameState.gameOver) && !GameState.isRespawning) {
                GameState.currentNickname = 'VIPER';
                playPreGameAdThenStart('VIPER', () => startGame());
            }
        });
    }
});

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
loadRanking();
startAttractMode();
updateQrCode();
autoScale();
draw();
requestAnimationFrame(gameLoop);
connectSignaling();

function initDomAndAttract() {
    updateQrCode();
    autoScale();
    loadRanking();
    if (!GameState.isDemo && !GameState.gameRunning && !GameState.adPlaying) {
        startAttractMode();
    }

    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (GameState.adPlaying) return;
            if (!audio.ctx) audio.init();
            else audio.resume();
            audio.playBeep();
        });
    }

    const qrPanel = document.getElementById('waiting-qr-panel');
    if (qrPanel) {
        qrPanel.addEventListener('click', (e) => {
            e.stopPropagation();
            if (GameState.adPlaying) return;
            audio.init();
            GameState.currentNickname = 'VIPER';
            playPreGameAdThenStart('VIPER', () => startGame());
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
    if (!GameState.gameRunning && !GameState.isDemo && !GameState.adPlaying) {
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
        loadRanking();
    }
});

// Periodic retries after mount to handle dynamic layout shifts (images, QR)
[0, 50, 150, 300, 600, 1200].forEach(delay => setTimeout(autoScale, delay));

requestAdVideo();

