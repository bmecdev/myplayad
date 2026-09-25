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
    dx: 1,
    dy: 0,
    nextDx: 1,
    nextDy: 0,
    score: 0,
    highScore: 0,
    lives: 3,
    gameRunning: false,
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
    if (ranking.length > 0) {
        GameState.highScore = ranking[0].score;
        highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
    }
    displayRanking(ranking);
}

function saveRanking(newScore, nickname) {
    let ranking = JSON.parse(localStorage.getItem('snake-ranking')) || [];
    ranking.push({ name: nickname, score: newScore, date: new Date().toLocaleDateString() });
    ranking.sort((a, b) => b.score - a.score);
    ranking = ranking.slice(0, 5); 
    localStorage.setItem('snake-ranking', JSON.stringify(ranking));
    displayRanking(ranking);
    
    if (ranking.length > 0) {
        GameState.highScore = ranking[0].score;
        highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
    }
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

    if (!GameState.gameRunning && waitingOverlay.classList.contains('hidden')) {
        if (Math.abs(input.x) > 0.5 || Math.abs(input.y) > 0.5) {
            startGame();
        }
    }

    const threshold = 0.4;
    if (Math.abs(input.x) > Math.abs(input.y)) {
        if (input.x > threshold && GameState.dx !== -1) { GameState.nextDx = 1; GameState.nextDy = 0; }
        else if (input.x < -threshold && GameState.dx !== 1) { GameState.nextDx = -1; GameState.nextDy = 0; }
    } else {
        if (input.y > threshold && GameState.dy !== -1) { GameState.nextDx = 0; GameState.nextDy = 1; }
        else if (input.y < -threshold && GameState.dy !== 1) { GameState.nextDx = 0; GameState.nextDy = -1; }
    }
}

function init() {
    resetSnakePosition(false); 
    GameState.score = 0;
    GameState.gameSpeed = 100; 
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
        if (!GameState.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
            break;
        }
    }
    GameState.food = newFood;
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

    if (head.x === GameState.food.x && head.y === GameState.food.y) {
        audio.playEat();
        GameState.score += 10;
        updateScore();
        placeFood();
        if (GameState.gameSpeed > 50) GameState.gameSpeed -= 1;
    } else {
        GameState.snake.pop();
    }
}

function update(time) {
    if (!GameState.gameRunning) return;

    if (time - GameState.lastTime > GameState.gameSpeed) {
        moveSnake();
        GameState.lastTime = time;
    }
    
    draw();
    requestAnimationFrame(update);
}

function loseLife() {
    audio.playDie();
    GameState.lives--;
    updateLivesDisplay();
    GameState.gameRunning = false; 
    GameState.isRespawning = true; 
    
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

function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = MATRIX_GREEN;
    ctx.lineWidth = 2;
    ctx.strokeRect(GRID_SIZE/2, GRID_SIZE/2, CANVAS_WIDTH - GRID_SIZE, CANVAS_HEIGHT - GRID_SIZE);

    if (GameState.isInvulnerable && Math.floor(Date.now() / 150) % 2 === 0) {
        return; 
    }

    GameState.snake.forEach((segment, index) => {
        ctx.fillStyle = MATRIX_GREEN;
        ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        
        if (index === 0) {
            ctx.fillStyle = '#91aa12';
            const eyeSize = 2;
            if (GameState.dx === 1) ctx.fillRect(segment.x * GRID_SIZE + 6, segment.y * GRID_SIZE + 2, eyeSize, eyeSize);
            if (GameState.dx === -1) ctx.fillRect(segment.x * GRID_SIZE + 2, segment.y * GRID_SIZE + 2, eyeSize, eyeSize);
            if (GameState.dy === 1) ctx.fillRect(segment.x * GRID_SIZE + 2, segment.y * GRID_SIZE + 6, eyeSize, eyeSize);
            if (GameState.dy === -1) ctx.fillRect(segment.x * GRID_SIZE + 2, segment.y * GRID_SIZE + 2, eyeSize, eyeSize);
        }
    });

    ctx.fillStyle = MATRIX_GREEN;
    ctx.fillRect(GameState.food.x * GRID_SIZE + 2, GameState.food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
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

    const videoOverlay = document.getElementById('video-ranking-overlay');
    if (videoOverlay) {
        videoOverlay.classList.remove('hidden');
        if (typeof fetchAndShowUpcomingGames === 'function') {
            fetchAndShowUpcomingGames();
        }
        setTimeout(() => {
            if (!GameState.gameRunning) videoOverlay.classList.add('hidden');
        }, 5000);
    }

    resetSignaling();
}

function startGame() {
    if (GameState.isRespawning || GameState.gameRunning) return;

    if (!GameState.gameRunning) {
        audio.playStart();
        if (window.resetTimeout) clearTimeout(window.resetTimeout);
        
        GameState.lives = 3;
        GameState.isInvulnerable = false;
        updateLivesDisplay();
        GameState.gameRunning = true;
        GameState.lastTime = performance.now();
        requestAnimationFrame(update);
    }
}

window.addEventListener('keydown', (e) => {
    if (GameState.isRespawning) return;
    if (e.key === 'ArrowUp' && GameState.dy !== 1) { GameState.nextDx = 0; GameState.nextDy = -1; }
    if (e.key === 'ArrowDown' && GameState.dy !== -1) { GameState.nextDx = 0; GameState.nextDy = 1; }
    if (e.key === 'ArrowLeft' && GameState.dx !== 1) { GameState.nextDx = -1; GameState.nextDy = 0; }
    if (e.key === 'ArrowRight' && GameState.dx !== -1) { GameState.nextDx = 1; GameState.nextDy = 0; }
});

mainScreen.addEventListener('click', () => {
    if (!GameState.gameRunning && !GameState.isRespawning) {
        startGame();
    }
});

loadRanking();
init();
updateQrCode();
autoScale();
draw();
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

// Listen for explicit RESCALE message from screen parent frame
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RESCALE') {
        autoScale();
    }
});

// Periodic retries after mount to handle dynamic layout shifts (images, QR)
[0, 50, 150, 300, 600, 1200].forEach(delay => setTimeout(autoScale, delay));

