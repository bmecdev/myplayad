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

// Retro Arcade Space Invaders Web Audio API Synthesizer
class InvadersAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.stepIdx = 0;
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

    playLaser() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(920, t);
            osc.frequency.linearRampToValueAtTime(140, t + 0.12);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.12);
        } catch (e) {}
        broadcastSFX('laser');
    }

    playInvaderStep() {
        if (!this.ctx) return;
        this.resume();
        try {
            const freqs = [65.4, 61.7, 58.3, 55.0];
            const freq = freqs[this.stepIdx % 4];
            this.stepIdx++;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (e) {}
    }

    playAlienExplosion() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.linearRampToValueAtTime(35, t + 0.2);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.2);
        } catch (e) {}
        broadcastSFX('alienKilled');
    }

    playShieldHit() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, t);
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.06);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.06);
        } catch (e) {}
        broadcastSFX('shieldHit');
    }

    playAlienShot() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(380, t);
            osc.frequency.linearRampToValueAtTime(170, t + 0.09);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.09);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.09);
        } catch (e) {}
    }

    playPlayerExplosion() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(110, t);
            osc.frequency.linearRampToValueAtTime(25, t + 0.45);
            gain.gain.setValueAtTime(0.38, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.45);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.45);
        } catch (e) {}
        broadcastSFX('playerExplode');
    }

    playWaveClear() {
        if (!this.ctx) return;
        this.resume();
        const notes = [392, 523.25, 659.25, 783.99];
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
        broadcastSFX('waveClear');
    }

    playGameOver() {
        if (!this.ctx) return;
        this.resume();
        const notes = [330, 293.66, 261.63, 196];
        const t = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + idx * 0.16);
            gain.gain.setValueAtTime(0.3, t + idx * 0.16);
            gain.gain.linearRampToValueAtTime(0.0001, t + idx * 0.16 + 0.2);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.16);
            osc.stop(t + idx * 0.16 + 0.22);
        });
        broadcastSFX('gameover');
    }

    playUfoSiren() {
        if (!this.ctx) return;
        this.resume();
        try {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(420, t);
            osc.frequency.linearRampToValueAtTime(560, t + 0.12);
            osc.frequency.linearRampToValueAtTime(420, t + 0.24);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.25);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.25);
        } catch (e) {}
        broadcastSFX('ufo');
    }
}
const audio = new InvadersAudio();

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
const NOKIA_DARK = '#171e04';

const ALIEN_WIDTH = 16;
const ALIEN_HEIGHT = 10;
const PLAYER_WIDTH = 18;
const PLAYER_HEIGHT = 8;
const PLAYER_Y = CANVAS_HEIGHT - 18;
const SHIELD_PATTERN = [
    '  ####  ',
    ' ###### ',
    '########',
    '##    ##'
];
const ALIEN_TYPES = [
    {
        name: 'squid',
        points: 30,
        color: '#ff2a85',
        glow: '#ff70c0',
        eye: '#00f5d4',
        shadow: '#99004d'
    },
    {
        name: 'crab',
        points: 20,
        color: '#00f0ff',
        glow: '#a6f6ff',
        eye: '#ffe600',
        shadow: '#0077b6'
    },
    {
        name: 'octopus',
        points: 10,
        color: '#3dff8a',
        glow: '#aaffcc',
        eye: '#ff3366',
        shadow: '#166534'
    }
];

const ALIEN_SPRITES = [
    // Type 0: Squid (30 pts, 12x8)
    {
        frame0: [
            '  ^^####^^  ',
            ' ########## ',
            '############',
            '##**####**##',
            '############',
            '   ##  ##   ',
            '  ##    ##  ',
            ' ##      ## '
        ],
        frame1: [
            '  ^^####^^  ',
            ' ########## ',
            '############',
            '##**####**##',
            '############',
            '  ########  ',
            '   ##  ##   ',
            '  ##    ##  '
        ]
    },
    // Type 1: Crab (20 pts, 12x8)
    {
        frame0: [
            '#          #',
            ' #   ^^   # ',
            '  ########  ',
            '###**##**###',
            '############',
            ' ########## ',
            ' #   ##   # ',
            '#    ##    #'
        ],
        frame1: [
            '#          #',
            '#  # ^^ #  #',
            '# ######## #',
            '###**##**###',
            '############',
            '  ########  ',
            '   #    #   ',
            '  #      #  '
        ]
    },
    // Type 2: Octopus (10 pts, 12x8)
    {
        frame0: [
            '    ####    ',
            '  ^^####^^  ',
            ' ########## ',
            '##**####**##',
            '############',
            '  ###  ###  ',
            ' ##  ##  ## ',
            '#    ##    #'
        ],
        frame1: [
            '    ####    ',
            '  ^^####^^  ',
            ' ########## ',
            '##**####**##',
            '############',
            '  ###  ###  ',
            '   ######   ',
            '  ##    ##  '
        ]
    }
];

const GameState = {
    score: 0,
    highScore: 0,
    lives: 5,
    running: false,
    gameOver: false,
    isRespawning: false,
    paused: false,
    invulnerableTimer: 0,
    lastTime: 0,
    fireCooldown: 0,
    frameFlip: false,
    wave: 1,
    player: null,
    aliens: [],
    bullets: [],
    alienBullets: [],
    shields: [],
    explosions: [],
    stars: [],
    ufo: null,
    ufoTimer: 18,
    statusMessage: 'Listo para el ataque. Usa el control para mover y disparar.',
    statusTimer: 0,
    alienDirection: 1,
    alienStepTimer: 0,
    alienShotTimer: 0,
    waveCooldown: 0,
    fireRequested: false,
    currentNickname: 'Player',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase()
};

const peerConnections = new Map();
const dataChannels = new Map();
let socket;

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
    const ranking = JSON.parse(localStorage.getItem('space-invaders-ranking')) || [];
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
                slug: 'invaders',
                ranking: top5
            }, '*');
        } catch (_) {}
    }
}

function saveRanking(newScore, nickname) {
    let ranking = JSON.parse(localStorage.getItem('space-invaders-ranking')) || [];
    // Remover duplicados existentes
    ranking = ranking.filter((entry, index, arr) => 
        arr.findIndex(e => e.name === entry.name && e.score === entry.score) === index
    );
    if (!ranking.some(entry => entry.name === nickname && entry.score === newScore)) {
        ranking.push({ name: nickname, score: newScore, date: new Date().toLocaleDateString() });
    }
    ranking.sort((a, b) => b.score - a.score);
    ranking = ranking.slice(0, 5);
    localStorage.setItem('space-invaders-ranking', JSON.stringify(ranking));
    displayRanking(ranking);
    
    if (ranking.length > 0) {
        GameState.highScore = ranking[0].score;
        highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
    }
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
    GameState.running = false;
    GameState.currentNickname = 'Player';
    resetGame();
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
        GameState.running = false;
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    console.log(`Recibida oferta de jugador ${playerId}`);

    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) ? window.GAME_CONFIG.getIceConfig() : getIceConfig();
    const pc = new RTCPeerConnection(rtcConfig);
    // Attach diagnostics if available
    if (window.GAME_CONFIG && window.GAME_CONFIG.attachPCDiagnostics) {
        try { window.GAME_CONFIG.attachPCDiagnostics(pc, `pc-${playerId}`); } catch (e) { console.warn('No se pudo attach PC diagnostics', e); }
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

        // Attach data channel diagnostics if available
        if (window.GAME_CONFIG && window.GAME_CONFIG.attachDataChannelDiagnostics) {
            try { window.GAME_CONFIG.attachDataChannelDiagnostics(receiveChannel, `dc-${playerId}`); } catch (e) { console.warn('No se pudo attach DataChannel diagnostics', e); }
        }

        receiveChannel.onmessage = (e) => {
            try {
                const input = JSON.parse(e.data);
                if (input.type === 'nickname') {
                    GameState.currentNickname = input.value;
                    if (playerNickElement) playerNickElement.textContent = `PLAYER: ${GameState.currentNickname.toUpperCase()}`;
                } else {
                    handleJoystickInput(input);
                }
            } catch (err) {
                console.error('Error en DataChannel message:', err);
            }
        };

        receiveChannel.onopen = () => {
            console.log(`DataChannel abierto con jugador ${playerId}`);
            waitingOverlay.classList.add('hidden');
            GameState.statusMessage = 'Control conectado. Presiona para iniciar.';
            GameState.statusTimer = 120;
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

    if (!GameState.running && waitingOverlay.classList.contains('hidden')) {
        if (Math.abs(input.x) > 0.4 || Math.abs(input.y) > 0.4 || input.fire) {
            startGame();
        }
    }

    if (typeof input.x === 'number') {
        GameState.player.inputX = input.x;
    }

    if (input.fire) {
        GameState.fireRequested = true;
    }
}

function createStars(total = 80) {
    return Array.from({ length: total }, (_, index) => {
        const layer = index < 45 ? 0 : index < 70 ? 1 : 2;
        return {
            x: Math.random() * (CANVAS_WIDTH - 8) + 4,
            y: Math.random() * (CANVAS_HEIGHT - 16) + 4,
            layer,
            blink: 36 + (index % 5) * 8 + Math.floor(Math.random() * 20),
            offset: Math.floor(Math.random() * 80)
        };
    });
}

function createPlayer() {
    return {
        x: Math.floor(CANVAS_WIDTH / 2) - PLAYER_WIDTH / 2,
        y: PLAYER_Y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        inputX: 0,
        speed: 120
    };
}

function createShields() {
    const bases = [20, 60, 100, 140];
    return bases.map((baseX) => {
        const cells = new Set();
        SHIELD_PATTERN.forEach((row, rowIndex) => {
            row.split('').forEach((char, columnIndex) => {
                if (char === '#') {
                    cells.add(`${baseX + columnIndex * 2},${110 + rowIndex * 2}`);
                }
            });
        });
        return { cells };
    });
}

function createWave(level) {
    const aliens = [];
    const startX = 12;
    const startY = 18;
    const horizontalGap = 24;
    const verticalGap = 18;

    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 7; col += 1) {
            aliens.push({
                x: startX + col * horizontalGap,
                y: startY + row * verticalGap,
                typeIndex: row,
                alive: true
            });
        }
    }

    GameState.aliens = aliens;
    GameState.alienDirection = 1;
    GameState.alienStepTimer = 0;
    GameState.alienShotTimer = 26;
    GameState.waveCooldown = Math.max(24, 80 - level * 6);
    GameState.statusMessage = `Oleada ${level.toString().padStart(2, '0')} lista.`;
    GameState.statusTimer = 120;
}

function resetRoundPositions() {
    GameState.player = createPlayer();
    GameState.bullets = [];
    GameState.alienBullets = [];
    GameState.explosions = [];
    GameState.invulnerableTimer = 1.6;
    GameState.fireRequested = false;
    GameState.ufo = null;
    GameState.ufoTimer = 16 + Math.random() * 10;
}

function resetGame() {
    GameState.running = false;
    GameState.gameOver = false;
    GameState.paused = false;
    GameState.wave = 1;
    GameState.score = 0;
    GameState.lives = 5;
    GameState.frameFlip = false;
    GameState.fireCooldown = 0;
    GameState.ufo = null;
    GameState.ufoTimer = 18;
    resetRoundPositions();
    GameState.shields = createShields();
    createWave(GameState.wave);
    updateHud();
}

function updateHud() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(3, '0')}`;
    livesCountElement.textContent = GameState.lives;
    highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
}

function addExplosion(x, y, typeOrLife = 'alien', points = null, color = null) {
    if (typeOrLife === 8 || typeOrLife === 'spark' || typeOrLife === 'shield') {
        const sparkColor = color || (typeOrLife === 'shield' ? '#3dff8a' : '#ffe600');
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 15 + Math.random() * 25;
            GameState.explosions.push({
                type: 'particle',
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: sparkColor,
                size: 1,
                life: 0.22,
                maxLife: 0.22
            });
        }
        return;
    }

    if (typeOrLife === 18 || typeOrLife === 'player') {
        const colors = ['#ffffff', '#ffb703', '#ff0055', '#00f5d4', '#ffe600'];
        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 25 + Math.random() * 65;
            GameState.explosions.push({
                type: 'particle',
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: colors[i % colors.length],
                size: Math.random() > 0.5 ? 2 : 1,
                life: 0.55 + Math.random() * 0.2,
                maxLife: 0.75
            });
        }
        return;
    }

    if (typeOrLife === 'ufo') {
        const ufoColors = ['#ff0055', '#ffe600', '#ffffff', '#ff85a2'];
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 20 + Math.random() * 50;
            GameState.explosions.push({
                type: 'particle',
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: ufoColors[i % ufoColors.length],
                size: 2,
                life: 0.45 + Math.random() * 0.25,
                maxLife: 0.7
            });
        }
        if (points) {
            GameState.explosions.push({
                type: 'score',
                x,
                y: y - 2,
                text: `+${points}`,
                color: '#ffe600',
                life: 0.9,
                maxLife: 0.9
            });
        }
        return;
    }

    // Default Alien Explosion
    const pColor = color || '#3dff8a';
    const debrisColors = ['#ffffff', pColor, '#ffe600', pColor];
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const spd = 18 + Math.random() * 38;
        GameState.explosions.push({
            type: 'particle',
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            color: debrisColors[i % debrisColors.length],
            size: i % 3 === 0 ? 2 : 1,
            life: 0.32 + Math.random() * 0.18,
            maxLife: 0.5
        });
    }

    if (points) {
        GameState.explosions.push({
            type: 'score',
            x,
            y: y - 2,
            text: `+${points}`,
            color: '#ffe600',
            life: 0.7,
            maxLife: 0.7
        });
    }
}

function setStatus(message, duration = 160) {
    GameState.statusMessage = message;
    GameState.statusTimer = duration;
}

function saveHighscore() {
    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
        const ranking = JSON.parse(localStorage.getItem('space-invaders-ranking')) || [];
        ranking.push({ name: GameState.currentNickname, score: GameState.highScore, date: new Date().toLocaleDateString() });
        ranking.sort((a, b) => b.score - a.score);
        localStorage.setItem('space-invaders-ranking', JSON.stringify(ranking.slice(0, 5)));
    }
}

function handlePlayerInput(dt) {
    if (Math.abs(GameState.player.inputX) > 0.1) {
        GameState.player.x += Math.sign(GameState.player.inputX) * GameState.player.speed * dt;
    }

    GameState.player.x = Math.max(6, Math.min(CANVAS_WIDTH - GameState.player.width - 6, GameState.player.x));

    if (GameState.fireCooldown > 0) {
        GameState.fireCooldown -= dt;
    }

    if (GameState.fireRequested && GameState.fireCooldown <= 0) {
        audio.playLaser();
        GameState.bullets.push({
            x: Math.round(GameState.player.x + GameState.player.width / 2) - 1,
            y: GameState.player.y - 6,
            width: 2,
            height: 6,
            speed: 220
        });
        GameState.fireCooldown = 0.28;
        GameState.fireRequested = false;
    }
}

function updateBullets(dt) {
    GameState.bullets = GameState.bullets
        .map((bullet) => ({ ...bullet, y: bullet.y - bullet.speed * dt }))
        .filter((bullet) => bullet.y + bullet.height > 0);

    GameState.alienBullets = GameState.alienBullets
        .map((bullet) => ({ ...bullet, y: bullet.y + bullet.speed * dt }))
        .filter((bullet) => bullet.y < CANVAS_HEIGHT);
}

function getAliveAliens() {
    return GameState.aliens.filter((alien) => alien.alive);
}

function updateAliens(dt) {
    const aliveAliens = getAliveAliens();

    if (aliveAliens.length === 0) {
        GameState.waveCooldown -= dt * 60;
        if (GameState.waveCooldown <= 0) {
            GameState.wave += 1;
            resetRoundPositions();
            createWave(GameState.wave);
            audio.playWaveClear();
            updateHud();
        }
        return;
    }

    const pressure = Math.max(0.25, aliveAliens.length / GameState.aliens.length);
    const stepInterval = Math.max(0.24, 0.88 - GameState.wave * 0.028) * pressure;

    GameState.alienStepTimer += dt;

    if (GameState.alienStepTimer >= stepInterval) {
        GameState.alienStepTimer = 0;
        GameState.frameFlip = !GameState.frameFlip;
        audio.playInvaderStep();

        const leftMost = Math.min(...aliveAliens.map((alien) => alien.x));
        const rightMost = Math.max(...aliveAliens.map((alien) => alien.x + ALIEN_WIDTH));
        const nextLeft = leftMost + GameState.alienDirection * 4;
        const nextRight = rightMost + GameState.alienDirection * 4;

        if (nextLeft <= 8 || nextRight >= CANVAS_WIDTH - 8) {
            GameState.alienDirection *= -1;
            aliveAliens.forEach((alien) => {
                alien.y += 10;
            });
        } else {
            aliveAliens.forEach((alien) => {
                alien.x += GameState.alienDirection * 4;
            });
        }
    }

    if (aliveAliens.some((alien) => alien.y + ALIEN_HEIGHT >= GameState.player.y)) {
        loseLife('Los invasores llegaron a la base.');
        return;
    }

    GameState.alienShotTimer -= dt * 60;
    const shotDelay = Math.max(14, 48 - GameState.wave * 4);

    if (GameState.alienShotTimer <= 0 && GameState.alienBullets.length < 3 + Math.floor(GameState.wave / 2)) {
        fireAlienBullet(aliveAliens);
        GameState.alienShotTimer = shotDelay;
    }
}

function fireAlienBullet(aliveAliens) {
    const columns = new Map();

    aliveAliens.forEach((alien) => {
        const column = Math.round(alien.x / 24);
        const current = columns.get(column);
        if (!current || alien.y > current.y) {
            columns.set(column, alien);
        }
    });

    const shooters = Array.from(columns.values());
    if (shooters.length === 0) return;

    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    audio.playAlienShot();
    GameState.alienBullets.push({
        x: Math.round(shooter.x + ALIEN_WIDTH / 2) - 1,
        y: shooter.y + ALIEN_HEIGHT + 2,
        width: 2,
        height: 6,
        speed: 120 + GameState.wave * 4
    });
}

function damageShieldAt(x, y, width = 1, height = 1) {
    for (const shield of GameState.shields) {
        for (const cellKey of Array.from(shield.cells)) {
            const [cellX, cellY] = cellKey.split(',').map(Number);
            const cellWidth = 4;
            const cellHeight = 4;

            const intersects =
                x + width > cellX &&
                x < cellX + cellWidth &&
                y + height > cellY &&
                y < cellY + cellHeight;

            if (intersects) {
                shield.cells.delete(cellKey);
                audio.playShieldHit();
                addExplosion(cellX + 2, cellY + 2, 'shield');
                return true;
            }
        }
    }
    return false;
}

function bulletHitsAlien(bullet, alien) {
    return (
        bullet.x + bullet.width >= alien.x &&
        bullet.x <= alien.x + ALIEN_WIDTH &&
        bullet.y <= alien.y + ALIEN_HEIGHT &&
        bullet.y + bullet.height >= alien.y
    );
}

function loseLife(message) {
    if (GameState.gameOver) return;

    audio.playPlayerExplosion();
    GameState.lives -= 1;
    updateHud();

    if (GameState.lives <= 0) {
        endGame(message || 'Base destruida. Enter para reiniciar.');
        return;
    }

    addExplosion(GameState.player.x + GameState.player.width / 2, GameState.player.y + 4, 18);
    resetRoundPositions();
    setStatus(`Impacto recibido. Quedan ${GameState.lives} vidas.`, 150);
}

function endGame(message) {
    audio.playGameOver();
    GameState.running = false;
    GameState.gameOver = true;
    GameState.paused = false;
    saveHighscore();
    saveRanking(GameState.score, GameState.currentNickname);
    updateHud();
    setStatus(message, 9999);

    gameOverOverlay.classList.remove('hidden');

    dataChannels.forEach((channel) => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({
                type: 'game_over',
                score: GameState.score
            }));
        }
    });

    const videoOverlay = document.getElementById('video-ranking-overlay');
    if (videoOverlay) {
        videoOverlay.classList.remove('hidden');
        if (typeof fetchAndShowUpcomingGames === 'function') {
            fetchAndShowUpcomingGames();
        }
        setTimeout(() => {
            if (!GameState.running) videoOverlay.classList.add('hidden');
        }, 5000);
    }

    resetSignaling();
}

function resolveCollisions() {
    const remainingBullets = [];

    for (const bullet of GameState.bullets) {
        let consumed = false;

        for (const alien of GameState.aliens) {
            if (!alien.alive) continue;
            if (bulletHitsAlien(bullet, alien)) {
                alien.alive = false;
                consumed = true;
                audio.playAlienExplosion();
                const alienType = ALIEN_TYPES[alien.typeIndex];
                GameState.score += alienType.points;
                addExplosion(alien.x + ALIEN_WIDTH / 2, alien.y + ALIEN_HEIGHT / 2, 'alien', alienType.points, alienType.color);
                updateHud();
                break;
            }
        }

        if (!consumed && GameState.ufo) {
            const u = GameState.ufo;
            const hitUfo = bullet.x + bullet.width >= u.x &&
                           bullet.x <= u.x + u.width &&
                           bullet.y <= u.y + u.height &&
                           bullet.y + bullet.height >= u.y;
            if (hitUfo) {
                consumed = true;
                GameState.score += u.points;
                audio.playAlienExplosion();
                addExplosion(u.x + u.width / 2, u.y + u.height / 2, 'ufo', u.points);
                GameState.ufo = null;
                GameState.ufoTimer = 24 + Math.random() * 12;
                updateHud();
            }
        }

        if (!consumed && damageShieldAt(bullet.x, bullet.y, bullet.width, bullet.height)) {
            consumed = true;
        }

        if (!consumed) {
            for (const alienBullet of GameState.alienBullets) {
                const sameColumn = Math.abs(alienBullet.x - bullet.x) < 4;
                const sameRow = Math.abs(alienBullet.y - bullet.y) < 6;
                if (sameColumn && sameRow) {
                    alienBullet.hit = true;
                    consumed = true;
                    addExplosion(Math.round(bullet.x), Math.round(bullet.y), 8);
                    break;
                }
            }
        }

        if (!consumed) remainingBullets.push(bullet);
    }

    GameState.bullets = remainingBullets;
    const remainingAlienBullets = [];

    for (const bullet of GameState.alienBullets) {
        if (bullet.hit) continue;
        let consumed = false;

        if (damageShieldAt(bullet.x, bullet.y, bullet.width, bullet.height)) {
            consumed = true;
        }

        const insidePlayerX = bullet.x + bullet.width >= GameState.player.x && bullet.x <= GameState.player.x + GameState.player.width;
        const insidePlayerY = bullet.y + bullet.height >= GameState.player.y && bullet.y <= GameState.player.y + GameState.player.height;

        if (!consumed && insidePlayerX && insidePlayerY && GameState.invulnerableTimer <= 0) {
            consumed = true;
            loseLife('Disparo directo a la base.');
        }

        if (!consumed) remainingAlienBullets.push(bullet);
    }

    GameState.alienBullets = remainingAlienBullets;
}

function updateExplosions(dt) {
    GameState.explosions = GameState.explosions
        .map((exp) => {
            if (exp.type === 'particle') {
                return {
                    ...exp,
                    x: exp.x + exp.vx * dt,
                    y: exp.y + exp.vy * dt,
                    life: exp.life - dt
                };
            } else if (exp.type === 'score') {
                return {
                    ...exp,
                    y: exp.y - 14 * dt,
                    life: exp.life - dt
                };
            } else {
                return { ...exp, life: exp.life - dt * 60 };
            }
        })
        .filter((exp) => exp.life > 0);
}

function updateUfo(dt) {
    if (!GameState.running || GameState.paused || GameState.gameOver) return;

    if (!GameState.ufo) {
        GameState.ufoTimer -= dt;
        if (GameState.ufoTimer <= 0) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            const pts = [50, 100, 150, 300][Math.floor(Math.random() * 4)];
            GameState.ufo = {
                x: dir === 1 ? -22 : CANVAS_WIDTH + 4,
                y: 8,
                width: 18,
                height: 7,
                speed: 46 * dir,
                points: pts,
                sirenTimer: 0
            };
            audio.playUfoSiren();
        }
    } else {
        const ufo = GameState.ufo;
        ufo.x += ufo.speed * dt;

        ufo.sirenTimer += dt;
        if (ufo.sirenTimer >= 0.35) {
            ufo.sirenTimer = 0;
            audio.playUfoSiren();
        }

        if ((ufo.speed > 0 && ufo.x > CANVAS_WIDTH + 14) || (ufo.speed < 0 && ufo.x < -26)) {
            GameState.ufo = null;
            GameState.ufoTimer = 22 + Math.random() * 14;
        }
    }
}

function drawUfo() {
    if (!GameState.ufo) return;
    const ufo = GameState.ufo;
    const ux = Math.round(ufo.x);
    const uy = Math.round(ufo.y);

    const ufoSprite = [
        '      ^^^^      ',
        '    ########    ',
        '   #oooooooo#   ',
        '  ############  ',
        ' ################ ',
        '  *    **    *  ',
        '   #        #   '
    ];

    const strobeLight = (Math.floor(performance.now() / 120) % 2 === 0);
    const lightColor = strobeLight ? '#00f5d4' : '#ffffff';

    // Resplandor difuso bajo el OVNI
    ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
    ctx.fillRect(ux + 2, uy + 2, 14, 5);

    for (let r = 0; r < ufoSprite.length; r++) {
        const row = ufoSprite[r];
        for (let c = 0; c < row.length; c++) {
            const ch = row[c];
            if (ch === ' ') continue;
            if (ch === '#') ctx.fillStyle = '#ff0055';
            else if (ch === '^') ctx.fillStyle = '#ff7597';
            else if (ch === 'o') ctx.fillStyle = '#ffe600';
            else if (ch === '*') ctx.fillStyle = lightColor;
            ctx.fillRect(ux + c, uy + r, 1, 1);
        }
    }
}

function updateStatus(dt) {
    if (GameState.statusTimer > 0) {
        GameState.statusTimer -= dt * 60;
    }
}

function drawBackground() {
    // 1. Fondo cósmico espacial con degradado de profundidad
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#03050c');
    grad.addColorStop(0.55, '#050c18');
    grad.addColorStop(1, '#071614');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Borde arcade CRT sutil
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2.5, 2.5, CANVAS_WIDTH - 5, CANVAS_HEIGHT - 5);

    // 3. Campo de estrellas multi-capa con destellos y colores arcade
    const now = performance.now();
    GameState.stars.forEach((star) => {
        const frame = Math.floor((now / 80 + star.offset) % star.blink);
        
        if (star.layer === 0) {
            ctx.fillStyle = frame < 2 ? '#24324f' : frame < 4 ? '#3b4e78' : '#182238';
            ctx.fillRect(star.x, star.y, 1, 1);
        } else if (star.layer === 1) {
            if (frame < 2) ctx.fillStyle = '#48cae4';
            else if (frame < 4) ctx.fillStyle = '#caf0f8';
            else ctx.fillStyle = '#0077b6';
            ctx.fillRect(star.x, star.y, 1, 1);
        } else {
            if (frame < 2) {
                ctx.fillStyle = '#ffe600';
                ctx.fillRect(star.x, star.y, 1, 1);
            } else if (frame < 4) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(star.x - 1, star.y, 3, 1);
                ctx.fillRect(star.x, star.y - 1, 1, 3);
            } else {
                ctx.fillStyle = '#ffb703';
                ctx.fillRect(star.x, star.y, 1, 1);
            }
        }
    });

    // 4. Línea de defensa terrestre retro arcade clásica
    ctx.fillStyle = 'rgba(61, 255, 138, 0.85)';
    ctx.fillRect(4, 154, CANVAS_WIDTH - 8, 1);
    
    // Marcas de radar
    ctx.fillStyle = 'rgba(61, 255, 138, 0.35)';
    for (let x = 8; x < CANVAS_WIDTH - 8; x += 12) {
        ctx.fillRect(x, 155, 1, 2);
    }
}

function drawShields() {
    GameState.shields.forEach((shield) => {
        shield.cells.forEach((cell) => {
            const [x, y] = cell.split(',').map(Number);
            
            // Bloque de escudo energético esmeralda con relieve 3D
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(x, y, 4, 4);

            // Bisel superior/izquierdo menta brillante
            ctx.fillStyle = '#86efac';
            ctx.fillRect(x, y, 4, 1);
            ctx.fillRect(x, y, 1, 4);

            // Sombra inferior/derecha verde bosque profundo
            ctx.fillStyle = '#14532d';
            ctx.fillRect(x, y + 3, 4, 1);
            ctx.fillRect(x + 3, y, 1, 4);

            // Micro núcleo de celda energética
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(x + 1, y + 1, 2, 2);
        });
    });
}

function drawAliens() {
    GameState.aliens.forEach((alien) => {
        if (!alien.alive) return;

        const type = ALIEN_TYPES[alien.typeIndex];
        const spriteData = ALIEN_SPRITES[alien.typeIndex];
        const rows = GameState.frameFlip ? spriteData.frame1 : spriteData.frame0;

        const ax = Math.round(alien.x + 2);
        const ay = Math.round(alien.y + 1);

        // Resplandor posterior de fósforo
        ctx.fillStyle = type.color;
        ctx.globalAlpha = 0.12;
        ctx.fillRect(alien.x, alien.y, ALIEN_WIDTH, ALIEN_HEIGHT);
        ctx.globalAlpha = 1.0;

        // Renderizado pixel art con ojos y luces volumétricas
        for (let r = 0; r < rows.length; r++) {
            const rowStr = rows[r];
            for (let c = 0; c < rowStr.length; c++) {
                const char = rowStr[c];
                if (char === ' ') continue;

                if (char === '#') {
                    ctx.fillStyle = type.color;
                } else if (char === '^') {
                    ctx.fillStyle = type.glow;
                } else if (char === '*') {
                    ctx.fillStyle = type.eye;
                } else if (char === '_') {
                    ctx.fillStyle = type.shadow;
                }
                ctx.fillRect(ax + c, ay + r, 1, 1);
            }
        }
    });
}

function drawPlayer() {
    const p = GameState.player;
    if (!p) return;
    const px = Math.round(p.x);
    const py = Math.round(p.y);

    // 1. Llamas de propulsión de plasma (parpadeo animado bajo el tanque)
    const flameFlicker = (Math.floor(performance.now() / 50) % 3);
    const flameColor = flameFlicker === 0 ? '#00f5d4' : flameFlicker === 1 ? '#ffb703' : '#ff4d6d';
    ctx.fillStyle = flameColor;
    ctx.fillRect(px + 4, py + 8, 2, 2 + flameFlicker);
    ctx.fillRect(px + 12, py + 8, 2, 2 + flameFlicker);

    // 2. Cañón railgun y condensador láser
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(px + 8, py - 5, 2, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 8, py - 4, 2, 4);
    ctx.fillStyle = '#7fae94';
    ctx.fillRect(px + 7, py - 2, 1, 2);
    ctx.fillRect(px + 10, py - 2, 1, 2);

    // 3. Torreta central y cúpula
    ctx.fillStyle = '#3dff8a';
    ctx.fillRect(px + 6, py, 6, 2);
    ctx.fillStyle = '#eafff2';
    ctx.fillRect(px + 7, py, 4, 1);

    // 4. Cubierta superior y visor sensor ámbar
    ctx.fillStyle = '#1f7d49';
    ctx.fillRect(px + 3, py + 2, 12, 2);
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(px + 6, py + 2, 6, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 8, py + 2, 2, 1);

    // 5. Chasis blindado arcade
    ctx.fillStyle = '#3dff8a';
    ctx.fillRect(px + 2, py + 4, 14, 2);
    ctx.fillStyle = '#85ffb9';
    ctx.fillRect(px + 2, py + 4, 14, 1);

    // 6. Orugas del tanque con dientes metálicos
    ctx.fillStyle = '#0d281a';
    ctx.fillRect(px, py + 6, 18, 2);
    ctx.fillStyle = '#3dff8a';
    for (let tx = 0; tx < 18; tx += 3) {
        ctx.fillRect(px + tx, py + 6, 2, 1);
    }
    ctx.fillStyle = '#1f7d49';
    ctx.fillRect(px, py + 4, 2, 3);
    ctx.fillRect(px + 16, py + 4, 2, 3);

    // 7. Campo de fuerza cibernético durante invulnerabilidad
    if (GameState.invulnerableTimer > 0) {
        const shieldPulse = Math.sin(performance.now() / 70);
        ctx.save();
        ctx.strokeStyle = shieldPulse > 0 ? '#00f5d4' : 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.ellipse(px + 9, py + 3, 13 + shieldPulse, 9 + shieldPulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 245, 212, 0.15)';
        ctx.fill();
        ctx.restore();
    }
}

function drawBullets() {
    // Láseres del jugador (Haz de plasma cian con estela y núcleo blanco)
    GameState.bullets.forEach((bullet) => {
        const bx = Math.round(bullet.x);
        const by = Math.round(bullet.y);
        
        ctx.fillStyle = 'rgba(0, 245, 212, 0.45)';
        ctx.fillRect(bx - 1, by - 1, bullet.width + 2, bullet.height + 2);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx, by, bullet.width, bullet.height);

        ctx.fillStyle = '#bbf7ff';
        ctx.fillRect(bx - 1, by, bullet.width + 2, 2);

        ctx.fillStyle = 'rgba(0, 245, 212, 0.6)';
        ctx.fillRect(bx, by + bullet.height, bullet.width, 2);
        ctx.fillStyle = 'rgba(0, 245, 212, 0.25)';
        ctx.fillRect(bx, by + bullet.height + 2, bullet.width, 1);
    });

    // Proyectiles alienígenas (Rayo en zigzag con núcleo incandescente)
    const animStep = Math.floor(performance.now() / 70) % 2;
    GameState.alienBullets.forEach((bullet) => {
        const bx = Math.round(bullet.x);
        const by = Math.round(bullet.y);

        ctx.fillStyle = 'rgba(255, 0, 85, 0.35)';
        ctx.fillRect(bx - 1, by, 4, 7);

        ctx.fillStyle = '#ff0055';
        if (animStep === 0) {
            ctx.fillRect(bx, by, 2, 2);
            ctx.fillRect(bx - 1, by + 2, 2, 2);
            ctx.fillRect(bx + 1, by + 4, 2, 2);
            ctx.fillRect(bx, by + 6, 2, 2);
        } else {
            ctx.fillRect(bx, by, 2, 2);
            ctx.fillRect(bx + 1, by + 2, 2, 2);
            ctx.fillRect(bx - 1, by + 4, 2, 2);
            ctx.fillRect(bx, by + 6, 2, 2);
        }

        ctx.fillStyle = '#ffe600';
        ctx.fillRect(bx, by + 2, 1, 3);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx, by + 6, 1, 1);
    });
}

function drawExplosions() {
    GameState.explosions.forEach((exp) => {
        if (exp.type === 'particle') {
            const alpha = Math.max(0, Math.min(1, exp.life / exp.maxLife));
            ctx.fillStyle = exp.color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(Math.round(exp.x), Math.round(exp.y), exp.size, exp.size);
            ctx.globalAlpha = 1.0;
        } else if (exp.type === 'score') {
            const alpha = Math.max(0, Math.min(1, exp.life / exp.maxLife));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#000000';
            ctx.fillText(exp.text, Math.round(exp.x) + 1, Math.round(exp.y) + 1);
            ctx.fillStyle = exp.color;
            ctx.fillText(exp.text, Math.round(exp.x), Math.round(exp.y));
            ctx.restore();
        } else {
            const alpha = Math.max(0, Math.min(1, exp.life / 16));
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, Math.max(2, exp.life / 3), 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function draw() {
    drawBackground();
    drawShields();
    drawUfo();
    drawAliens();
    drawBullets();
    drawPlayer();
    drawExplosions();
}

function update(dt) {
    if (!GameState.running || GameState.paused || GameState.gameOver) {
        updateExplosions(dt);
        updateStatus(dt);
        return;
    }

    if (GameState.invulnerableTimer > 0) {
        GameState.invulnerableTimer -= dt;
    }

    handlePlayerInput(dt);
    updateBullets(dt);
    updateAliens(dt);
    updateUfo(dt);
    resolveCollisions();
    updateExplosions(dt);
    updateStatus(dt);
}

function loop(timestamp) {
    if (!GameState.lastTime) {
        GameState.lastTime = timestamp;
    }

    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.05);
    GameState.lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(loop);
}

function startGame() {
    if (GameState.isRespawning || GameState.running) return;

    if (GameState.gameOver) {
        resetGame();
    }

    GameState.running = true;
    GameState.gameOver = false;
    GameState.lastTime = performance.now();
    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
}

window.addEventListener('keydown', (e) => {
    if (GameState.isRespawning) return;
    const key = e.key.toLowerCase();
    if (['arrowleft', 'a'].includes(key)) {
        GameState.player.inputX = -1;
    }
    if (['arrowright', 'd'].includes(key)) {
        GameState.player.inputX = 1;
    }
    if (key === ' ') {
        GameState.fireRequested = true;
    }
    if ((key === ' ' || key === 'enter') && (!GameState.running || GameState.gameOver)) {
        if (GameState.gameOver) {
            resetGame();
        }
        startGame();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (['arrowleft', 'a', 'arrowright', 'd'].includes(key)) {
        GameState.player.inputX = 0;
    }
});

mainScreen.addEventListener('click', () => {
    if (GameState.gameOver) {
        resetGame();
        startGame();
    } else if (!GameState.running) {
        startGame();
    }
});

function init() {
    GameState.stars = createStars(80);
    resetGame();
    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.remove('hidden');
    updateQrCode();
    autoScale();
}

loadRanking();
init();
updateQrCode();
autoScale();
draw();
requestAnimationFrame(loop);
connectSignaling();

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

mainScreen.addEventListener('click', () => {
    audio.init();
    if (!GameState.running || GameState.gameOver) {
        resetGame();
        startGame();
    }
});

