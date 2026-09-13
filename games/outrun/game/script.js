// OutRun Retro Arcade - Motor Pseudo-3D y Lógica de Juego en Pantalla
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const playerNickElement = document.getElementById('player-nick');
const timeCountElement = document.getElementById('time-count');
const timeContainerElement = document.getElementById('time-container');
const speedCountElement = document.getElementById('speed-count');
const gameOverOverlay = document.getElementById('game-over-overlay');
const waitingOverlay = document.getElementById('waiting-overlay');
const rankingList = document.getElementById('ranking-list');
const videoRankingList = document.getElementById('video-ranking-list');
const qrCodeImg = document.getElementById('qr-code-img');
const iceRouteElement = document.getElementById('ice-route');
const roomIdElement = document.getElementById('room-id');
const finalScoreText = document.getElementById('final-score-text');
const checkpointsClearedText = document.getElementById('checkpoints-cleared-text');

// Dimensiones fijas para renderizado pixel-art
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;

// Constantes de carretera y perspectiva pseudo-3D
const ROAD_WIDTH = 1800;
const SEGMENT_LENGTH = 200;
const CAMERA_HEIGHT = 850;
const CAMERA_DEPTH = 0.84;
const DRAW_DISTANCE = 80;
const LANES = 3;

// Audio Arcade Sintetizado (Web Audio API)
class ArcadeAudio {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();
            
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
            this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, this.ctx.currentTime);

            this.engineOsc.connect(filter);
            filter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);
            this.engineOsc.start();
            
            this.initialized = true;
        } catch (e) {
            console.warn('Audio no inicializado:', e);
        }
    }

    updateEngine(speed, maxSpeed) {
        if (!this.initialized || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const ratio = Math.max(0, Math.min(1, speed / maxSpeed));
        const freq = 48 + (ratio * 220);
        const gain = 0.02 + (ratio * 0.05);
        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
        this.engineGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
    }

    stopEngine() {
        if (!this.initialized || !this.engineGain) return;
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }

    playTireScreech() {
        if (!this.initialized || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(650 + Math.random() * 200, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        } catch (e) {}
    }

    playCrash() {
        if (!this.initialized || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(140, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.35);
        } catch (e) {}
    }

    playCheckpoint() {
        if (!this.initialized || !this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.09);
            gain.gain.setValueAtTime(0.07, this.ctx.currentTime + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.09 + 0.14);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.09);
            osc.stop(this.ctx.currentTime + idx * 0.09 + 0.15);
        });
    }

    playPassBonus() {
        if (!this.initialized || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        } catch (e) {}
    }

    playWarningBeep() {
        if (!this.initialized || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.08);
        } catch (e) {}
    }

    playStartTune() {
        if (!this.initialized || !this.ctx) return;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.06, this.ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.08);
            osc.stop(this.ctx.currentTime + idx * 0.08 + 0.13);
        });
    }

    playGameOver() {
        if (!this.initialized || !this.ctx) return;
        const notes = [440, 370, 311, 261];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.15);
            gain.gain.setValueAtTime(0.08, this.ctx.currentTime + idx * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.15 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.15);
            osc.stop(this.ctx.currentTime + idx * 0.15 + 0.22);
        });
    }

    playBGM() {
        if (!this.initialized || !this.ctx) return;
        if (this.bgmTimer) return;
        // Línea de bajo retro estilo synthwave arcade (D2, D2, F2, G2, A2, G2, F2, E2)
        const bassNotes = [73.42, 73.42, 87.31, 98.00, 110.00, 98.00, 87.31, 82.41];
        let step = 0;
        this.bgmTimer = setInterval(() => {
            if (!GameState.running || GameState.gameOver) {
                this.stopBGM();
                return;
            }
            try {
                if (this.ctx.state === 'suspended') this.ctx.resume();
                const note = bassNotes[step % bassNotes.length];
                step++;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(note, this.ctx.currentTime);
                gain.gain.setValueAtTime(0.028, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.18);
            } catch (e) {}
        }, 220);
    }

    stopBGM() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

const audio = new ArcadeAudio();

// Estructura y Paletas de las Etapas
const STAGES = [
    {
        name: 'COCONUT BEACH',
        skyTop: '#ff4d6d',
        skyBottom: '#ffb703',
        sunColor: '#ffe66d',
        seaColor: '#0a3d62',
        mountains: '#2f3640',
        grassLight: '#1b8a47',
        grassDark: '#136e37',
        curbLight: '#ffffff',
        curbDark: '#d63031',
        roadLight: '#444444',
        roadDark: '#3b3b3b',
        spriteTheme: 'palm'
    },
    {
        name: 'DESERT DUNES',
        skyTop: '#d35400',
        skyBottom: '#f39c12',
        sunColor: '#fff275',
        seaColor: '#a04000',
        mountains: '#6e2c00',
        grassLight: '#c28b38',
        grassDark: '#ab772a',
        curbLight: '#ffffff',
        curbDark: '#e67e22',
        roadLight: '#48443e',
        roadDark: '#3d3a35',
        spriteTheme: 'cactus'
    },
    {
        name: 'NEON METROPOLIS',
        skyTop: '#2c003e',
        skyBottom: '#511845',
        sunColor: '#ff007f',
        seaColor: '#120129',
        mountains: '#1c0a35',
        grassLight: '#0f1b29',
        grassDark: '#08101a',
        curbLight: '#00f3ff',
        curbDark: '#ff00ea',
        roadLight: '#262933',
        roadDark: '#1e2029',
        spriteTheme: 'city'
    }
];

// Estado General del Juego
const GameState = {
    score: 0,
    highScore: 0,
    timeLeft: 60,
    checkpointsCleared: 0,
    currentStageIndex: 0,
    running: false,
    gameOver: false,
    paused: false,
    lastTime: 0,
    lastWarningSecond: -1,
    currentNickname: 'DRIVER',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),

    // Física del Jugador
    playerX: 0,           // -1 (borde izquierdo) a +1 (borde derecho de la pista)
    playerZ: 0,           // Posición absoluta en la pista
    speed: 0,             // Velocidad actual en px/segundo
    maxSpeed: 12000,      // Velocidad máxima estándar (~240 KM/H)
    turboSpeed: 14500,    // Velocidad con Turbo activado (~290 KM/H)
    accel: 6800,          // Aceleración rápida y reactiva
    braking: 10500,       // Frenado con pedal
    decel: 800,           // Desaceleración suave al soltar gas (no frena de golpe)
    offRoadDecel: 4200,   // Resistencia en pasto/arena (no frena a 0)
    centrifugal: 0.22,    // Fuerza centrífuga en curvas
    skyOffset: 0,         // Parallax del cielo
    shakeAmount: 0,       // Efecto temblor por choque o offroad

    // Controles (soporta móvil WebRTC y teclado de escritorio)
    input: {
        steer: 0,         // -1 a +1
        gas: false,
        brake: false,
        turbo: false
    },

    // Notificaciones en pantalla
    banner: {
        text: '',
        subtext: '',
        color: '#ffb703',
        timer: 0
    },

    // Pista y Tráfico
    segments: [],
    trackLength: 0,
    stageLengthSegments: 500,
    cars: []
};

// Inicialización de la Carretera Pseudo-3D
function buildTrack() {
    GameState.segments = [];
    const totalSegments = GameState.stageLengthSegments * STAGES.length;

    for (let i = 0; i < totalSegments; i++) {
        const stageIndex = Math.floor(i / GameState.stageLengthSegments) % STAGES.length;
        const stage = STAGES[stageIndex];
        const isCheckpoint = (i > 0 && i % GameState.stageLengthSegments === 0);

        // Curvas progresivas y divertidas
        let curve = 0;
        const segInStage = i % GameState.stageLengthSegments;
        if (segInStage > 60 && segInStage < 160) curve = 1.8;
        else if (segInStage > 220 && segInStage < 320) curve = -2.0;
        else if (segInStage > 380 && segInStage < 460) curve = 1.6;

        // Desniveles / Colinas suaves
        const hill = Math.sin(i / 28) * 750;

        // Color alternado
        const alt = Math.floor(i / 3) % 2 === 0;

        // Sprites a los lados de la pista (árboles, rocas, carteles)
        let sprite = null;
        if (isCheckpoint) {
            sprite = { type: 'checkpoint_arch', offset: 0 };
        } else if (i % 6 === 0) {
            const side = (Math.floor(i / 6) % 2 === 0) ? -1.7 : 1.7;
            sprite = {
                type: stage.spriteTheme,
                offset: side + (Math.random() * 0.3 - 0.15)
            };
        }

        GameState.segments.push({
            index: i,
            stageIndex: stageIndex,
            isCheckpoint: isCheckpoint,
            cleared: false,
            p1: { world: { x: 0, y: hill, z: i * SEGMENT_LENGTH }, camera: {}, screen: {} },
            p2: { world: { x: 0, y: hill, z: (i + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
            curve: curve,
            color: {
                grass: alt ? stage.grassLight : stage.grassDark,
                curb: alt ? stage.curbLight : stage.curbDark,
                road: alt ? stage.roadLight : stage.roadDark,
                lane: alt ? '#ffffff' : 'transparent'
            },
            sprite: sprite
        });
    }

    GameState.trackLength = GameState.segments.length * SEGMENT_LENGTH;
    spawnTraffic();
}

// Generación de Tráfico Rival (50 coches competidores activos)
function spawnTraffic() {
    GameState.cars = [];
    const carTypes = ['blue_coupe', 'yellow_cab', 'white_truck', 'green_gt', 'purple_muscle'];
    const count = 50;

    for (let i = 0; i < count; i++) {
        // Distribuir a lo largo de toda la pista
        const zPos = 1500 + (i * (GameState.trackLength / count)) + (Math.random() * 800);
        const laneOffset = [-0.6, 0, 0.6][i % 3];
        const type = carTypes[i % carTypes.length];
        
        let baseSpeed = 6500;
        if (type === 'white_truck') baseSpeed = 4800;
        else if (type === 'yellow_cab') baseSpeed = 6200;
        else if (type === 'blue_coupe') baseSpeed = 7400;
        else if (type === 'green_gt') baseSpeed = 8500;
        else if (type === 'purple_muscle') baseSpeed = 8000;

        GameState.cars.push({
            type: type,
            z: zPos % GameState.trackLength,
            offset: laneOffset,
            targetOffset: laneOffset,
            laneChangeTimer: 2 + Math.random() * 4,
            speed: baseSpeed + (Math.random() * 600 - 300),
            passed: false
        });
    }
}

// Proyección de Coordenadas 3D de Mundo a Pantalla 2D
function project3D(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;

    p.screen.scale = cameraDepth / Math.max(1, p.camera.z);
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round(p.screen.scale * roadWidth * width / 2);
}

// Soporte para Controles de Teclado (Pruebas directas en navegador)
window.addEventListener('keydown', (e) => {
    audio.init();
    if (e.code === 'ArrowUp' || e.code === 'KeyW') GameState.input.gas = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') GameState.input.brake = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') GameState.input.steer = -1.0;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') GameState.input.steer = 1.0;
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') GameState.input.turbo = true;
    
    // Auto-iniciar juego al presionar tecla si está esperando
    if (!GameState.running && !GameState.gameOver) {
        startGame();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') GameState.input.gas = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') GameState.input.brake = false;
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && GameState.input.steer < 0) GameState.input.steer = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && GameState.input.steer > 0) GameState.input.steer = 0;
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') GameState.input.turbo = false;
});

// WebRTC Host & Señalización
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

function getIceConfig() {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnPublicIp = localStorage.getItem('TURN_PUBLIC_IP') || (CONFIG.TURN_PUBLIC_IP || '31.97.43.72');
    let turnUser = localStorage.getItem('TURN_USER') || (CONFIG.TURN_USERNAME || 'game');
    if (turnUser === 'user') turnUser = 'game';
    const turnPass = localStorage.getItem('TURN_PASS') || (CONFIG.TURN_PASS || 'changeme');

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
    if (iceRouteElement) iceRouteElement.textContent = `ICE: ${text}`;
}

function refreshIceRoute(pc) {
    if (!pc) return;
    pc.getStats().then(stats => {
        let routeType = null;
        let selectedPair = null;
        let localCandidate = null;

        stats.forEach(report => {
            if (report.type === 'candidate-pair' && (report.selected || report.state === 'succeeded' || report.selectedCandidatePairId)) {
                selectedPair = report;
            }
        });

        if (selectedPair) {
            stats.forEach(report => {
                if (report.type === 'local-candidate' && report.id === selectedPair.localCandidateId) {
                    localCandidate = report;
                }
            });
            if (localCandidate) {
                routeType = localCandidate.candidateType === 'relay' ? 'TURN' : 'STUN';
            }
        }
        setIceRouteText(routeType || 'P2P');
    }).catch(() => setIceRouteText('ERR'));
}

function connectSignalingServer() {
    if (socket && socket.readyState === WebSocket.OPEN) return;

    const serverIp = CONFIG.SIGNALING_SERVER_IP || window.location.hostname;
    const serverPort = CONFIG.SIGNALING_SERVER_PORT || '8080';
    const serverUrl = CONFIG.SIGNALING_SERVER_URL || `${serverIp}:${serverPort}`;
    const signalingUrl = serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')
        ? serverUrl
        : `wss://${serverUrl}`;

    updateQrCode();
    const currentSocket = socket = new WebSocket(signalingUrl);

    currentSocket.onopen = () => {
        if (socket !== currentSocket) return;
        if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;
        socket.send(JSON.stringify({
            type: 'register',
            role: 'host',
            roomId: GameState.roomId,
            maxPlayers: CONFIG.MAX_PLAYERS || 1
        }));
    };

    currentSocket.onerror = (e) => console.error('Signaling error:', e);

    currentSocket.onclose = () => {
        if (socket !== currentSocket) return;
        if (signalingState.shouldReconnect && !signalingState.manualClose) {
            setTimeout(connectSignalingServer, 2000);
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
                waitingOverlay.classList.add('hidden');
            } else if (data.type === 'controller_disconnected') {
                handleControllerDisconnect(data.playerId);
            }
        } catch (e) {
            console.error('Signaling parse error:', e);
        }
    };
}

function handleControllerDisconnect(playerId) {
    const pc = peerConnections.get(playerId);
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0 && !GameState.gameOver) {
        waitingOverlay.classList.remove('hidden');
        GameState.running = false;
        audio.stopEngine();
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    const pc = new RTCPeerConnection(getIceConfig());
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

        receiveChannel.onmessage = (e) => {
            try {
                const input = JSON.parse(e.data);
                if (input.type === 'nickname') {
                    GameState.currentNickname = (input.value || 'DRIVER').toUpperCase().substring(0, 10);
                    if (playerNickElement) playerNickElement.textContent = `DRIVER: ${GameState.currentNickname}`;
                    startGame();
                } else {
                    handleMobileInput(input);
                }
            } catch (err) {}
        };

        receiveChannel.onopen = () => {
            waitingOverlay.classList.add('hidden');
            refreshIceRoute(pc);
        };

        receiveChannel.onclose = () => handleControllerDisconnect(playerId);
    };

    pc.oniceconnectionstatechange = () => refreshIceRoute(pc);
    pc.onconnectionstatechange = () => refreshIceRoute(pc);

    await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.send(JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        playerId: playerId
    }));
}

function handleMobileInput(input) {
    if (input.steer !== undefined) {
        GameState.input.steer = Math.max(-1, Math.min(1, input.steer));
    }
    if (input.gas !== undefined) GameState.input.gas = !!input.gas;
    if (input.brake !== undefined) GameState.input.brake = !!input.brake;
    if (input.turbo !== undefined) GameState.input.turbo = !!input.turbo;
}

function notifyGameOver() {
    dataChannels.forEach(channel => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({
                type: 'game_over',
                score: Math.floor(GameState.score),
                checkpoints: GameState.checkpointsCleared
            }));
        }
    });
}

function showBanner(text, subtext = '', color = '#ffb703', duration = 2.0) {
    GameState.banner.text = text;
    GameState.banner.subtext = subtext;
    GameState.banner.color = color;
    GameState.banner.timer = duration;
}

function startGame() {
    audio.init();
    audio.playStartTune();
    audio.playBGM();
    GameState.score = 0;
    GameState.timeLeft = 60;
    GameState.checkpointsCleared = 0;
    GameState.currentStageIndex = 0;
    GameState.playerX = 0;
    GameState.playerZ = 0;
    GameState.speed = 0;
    GameState.gameOver = false;
    GameState.running = true;
    GameState.lastWarningSecond = -1;

    buildTrack();
    updateHUD();
    showBanner('STAGE 1', STAGES[0].name, '#3dff8a', 2.2);

    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
}

function endGame() {
    GameState.gameOver = true;
    GameState.running = false;
    audio.stopBGM();
    audio.stopEngine();
    audio.playGameOver();

    const finalScore = Math.floor(GameState.score);
    if (finalScoreText) finalScoreText.textContent = `FINAL SCORE: ${finalScore.toString().padStart(5, '0')}`;
    if (checkpointsClearedText) checkpointsClearedText.textContent = `CHECKPOINTS: ${GameState.checkpointsCleared}`;

    gameOverOverlay.classList.remove('hidden');
    notifyGameOver();
    submitScore(GameState.currentNickname, finalScore);

    dataChannels.forEach(ch => ch.close());
    peerConnections.forEach(pc => pc.close());
    dataChannels.clear();
    peerConnections.clear();

    setTimeout(() => {
        gameOverOverlay.classList.add('hidden');
        waitingOverlay.classList.remove('hidden');
        GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        if (roomIdElement) roomIdElement.textContent = `ID: ${GameState.roomId}`;
        updateQrCode();

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'register',
                role: 'host',
                roomId: GameState.roomId,
                maxPlayers: CONFIG.MAX_PLAYERS || 1
            }));
        }
    }, 15000);
}

// Bucle de Física y Actualización
function update(dt) {
    if (!GameState.running || GameState.gameOver) return;

    // Temporizador Time Attack
    GameState.timeLeft -= dt;
    if (GameState.timeLeft <= 0) {
        GameState.timeLeft = 0;
        updateHUD();
        endGame();
        return;
    }

    // Alerta sonora en los últimos 10 segundos
    const currentSec = Math.floor(GameState.timeLeft);
    if (currentSec <= 10 && currentSec !== GameState.lastWarningSecond) {
        GameState.lastWarningSecond = currentSec;
        audio.playWarningBeep();
    }

    // Temporizador de banners
    if (GameState.banner.timer > 0) {
        GameState.banner.timer -= dt;
    }

    // Aceleración y Frenado
    const topSpeed = GameState.input.turbo ? GameState.turboSpeed : GameState.maxSpeed;
    const isOffRoad = Math.abs(GameState.playerX) > 1.05;

    if (GameState.input.gas) {
        GameState.speed += GameState.accel * dt;
    } else if (GameState.input.brake) {
        GameState.speed -= GameState.braking * dt;
        if (GameState.speed > 3000) audio.playTireScreech();
    } else {
        // Desaceleración suave por inercia
        GameState.speed -= GameState.decel * dt;
    }

    // En pasto/arena desacelera pero NO frena a 0, permite conducir a ~90 KM/H
    if (isOffRoad) {
        if (GameState.speed > 4500) {
            GameState.speed -= GameState.offRoadDecel * dt;
        }
        GameState.shakeAmount = 2.2;
        if (GameState.speed > 2500 && Math.random() < 0.15) audio.playTireScreech();
    } else {
        GameState.shakeAmount = Math.max(0, GameState.shakeAmount - dt * 6);
    }

    // Límites de velocidad
    GameState.speed = Math.max(0, Math.min(GameState.speed, topSpeed));

    // Audio del motor
    audio.updateEngine(GameState.speed, GameState.turboSpeed);

    // Movimiento Z
    GameState.playerZ += GameState.speed * dt;
    if (GameState.playerZ >= GameState.trackLength) {
        GameState.playerZ -= GameState.trackLength;
    }

    // Posición del segmento actual
    const currentSegmentIndex = Math.floor(GameState.playerZ / SEGMENT_LENGTH) % GameState.segments.length;
    const currentSegment = GameState.segments[currentSegmentIndex];
    GameState.currentStageIndex = currentSegment.stageIndex;

    // Checkpoint Crossing
    if (currentSegment.isCheckpoint && !currentSegment.cleared) {
        currentSegment.cleared = true;
        GameState.checkpointsCleared++;
        GameState.timeLeft += 30; // +30 segundos de tiempo extendido
        GameState.score += 5000;
        audio.playCheckpoint();
        showBanner('EXTENDED TIME!', '+30 SECONDS!', '#3dff8a', 2.8);
    }

    // Dirección (volante) y Fuerza centrífuga en curvas
    const speedRatio = GameState.speed / GameState.maxSpeed;
    GameState.playerX += GameState.input.steer * 2.4 * speedRatio * dt;
    GameState.playerX -= currentSegment.curve * speedRatio * GameState.centrifugal * dt;
    GameState.playerX = Math.max(-2.2, Math.min(2.2, GameState.playerX));

    // Parallax del cielo
    GameState.skyOffset += currentSegment.curve * speedRatio * 0.4 * dt;

    // Puntuación continua basada en velocidad
    GameState.score += (GameState.speed / 1000) * dt * 25;
    if (GameState.score > GameState.highScore) {
        GameState.highScore = GameState.score;
    }

    // Actualización de Tráfico Rival y Competidores
    GameState.cars.forEach(car => {
        car.z += car.speed * dt;
        if (car.z >= GameState.trackLength) car.z -= GameState.trackLength;

        // IA: cambio de carril ocasional
        car.laneChangeTimer -= dt;
        if (car.laneChangeTimer <= 0) {
            car.laneChangeTimer = 3 + Math.random() * 5;
            if (Math.random() < 0.35) {
                const lanes = [-0.6, 0, 0.6];
                car.targetOffset = lanes[Math.floor(Math.random() * lanes.length)];
            }
        }
        if (car.targetOffset !== undefined) {
            car.offset += (car.targetOffset - car.offset) * 1.6 * dt;
        }

        // Distancia relativa con respecto al jugador
        let relZ = car.z - GameState.playerZ;
        if (relZ < -GameState.trackLength / 2) relZ += GameState.trackLength;
        if (relZ > GameState.trackLength / 2) relZ -= GameState.trackLength;

        // Detección de rebase (Pass bonus de +500 PTS)
        if (relZ < -30 && relZ > -300 && !car.passed) {
            car.passed = true;
            GameState.score += 500;
            audio.playPassBonus();
            showBanner('OVERTAKE!', '+500 PTS', '#ffb703', 1.0);
        } else if (relZ > 200 || relZ < -450) {
            car.passed = false;
        }

        // Colisión frontal/lateral: SOLO si está en el MISMO carril (distX < 0.32)
        if (Math.abs(relZ) < 65) {
            const distX = Math.abs(car.offset - GameState.playerX);
            if (distX < 0.32) {
                // Choque real
                GameState.speed = Math.min(GameState.speed, 2500); // 50 KM/H
                GameState.shakeAmount = 6;
                audio.playCrash();
                showBanner('CRASH!', 'WATCH OUT!', '#ff4d6d', 1.4);
                
                // Efecto de empuje mutuo
                car.speed = Math.max(2000, car.speed - 1500);
                if (GameState.playerX > car.offset) {
                    GameState.playerX += 0.15;
                    car.offset -= 0.15;
                } else {
                    GameState.playerX -= 0.15;
                    car.offset += 0.15;
                }
            }
        }
    });

    updateHUD();
}

// Renderizado Gráfico en Canvas 200x160
function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const stage = STAGES[GameState.currentStageIndex] || STAGES[0];

    // 1. Cielo Gradiente y Horizonte Parallax
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT / 2);
    skyGrad.addColorStop(0, stage.skyTop);
    skyGrad.addColorStop(1, stage.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2);

    // Sol / Luna retro
    ctx.fillStyle = stage.sunColor;
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH * 0.72, 28, 16, 0, Math.PI * 2);
    ctx.fill();

    // Montañas lejanas en silueta
    ctx.fillStyle = stage.mountains;
    ctx.beginPath();
    const mountainBaseY = CANVAS_HEIGHT / 2;
    ctx.moveTo(0, mountainBaseY);
    for (let x = 0; x <= CANVAS_WIDTH; x += 20) {
        const offset = (x + GameState.skyOffset * 100) % CANVAS_WIDTH;
        const h = Math.sin(offset * 0.08) * 12 + Math.cos(offset * 0.04) * 8;
        ctx.lineTo(x, mountainBaseY - 14 - h);
    }
    ctx.lineTo(CANVAS_WIDTH, mountainBaseY);
    ctx.closePath();
    ctx.fill();

    if (GameState.gameOver) return;

    // Efecto temblor de pantalla (Camera shake)
    ctx.save();
    if (GameState.shakeAmount > 0) {
        const shakeX = (Math.random() - 0.5) * GameState.shakeAmount;
        const shakeY = (Math.random() - 0.5) * GameState.shakeAmount;
        ctx.translate(shakeX, shakeY);
    }

    // 2. Renderizado de Carretera Pseudo-3D
    const baseSegmentIndex = Math.floor(GameState.playerZ / SEGMENT_LENGTH);
    const cameraX = GameState.playerX * ROAD_WIDTH;
    const cameraZ = GameState.playerZ;
    let cameraY = CAMERA_HEIGHT;

    const currentSeg = GameState.segments[baseSegmentIndex % GameState.segments.length];
    if (currentSeg) cameraY += currentSeg.p1.world.y;

    let maxY = CANVAS_HEIGHT;

    for (let n = 0; n < DRAW_DISTANCE; n++) {
        const seg = GameState.segments[(baseSegmentIndex + n) % GameState.segments.length];
        const loopWrap = ((baseSegmentIndex + n) >= GameState.segments.length) ? GameState.trackLength : 0;

        project3D(seg.p1, cameraX, cameraY, cameraZ - loopWrap, CAMERA_DEPTH, CANVAS_WIDTH, CANVAS_HEIGHT, ROAD_WIDTH);
        project3D(seg.p2, cameraX, cameraY, cameraZ - loopWrap, CAMERA_DEPTH, CANVAS_WIDTH, CANVAS_HEIGHT, ROAD_WIDTH);

        if (seg.p1.camera.z <= CAMERA_DEPTH || seg.p2.screen.y >= maxY) continue;

        // Pasto lateral
        ctx.fillStyle = seg.color.grass;
        ctx.fillRect(0, seg.p2.screen.y, CANVAS_WIDTH, seg.p1.screen.y - seg.p2.screen.y);

        // Bermas / Bordillos (Curb)
        const curbW1 = seg.p1.screen.w * 0.16;
        const curbW2 = seg.p2.screen.w * 0.16;
        drawTrapezoid(
            seg.p1.screen.x - seg.p1.screen.w - curbW1, seg.p1.screen.y,
            seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.y,
            seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.y,
            seg.p2.screen.x - seg.p2.screen.w - curbW2, seg.p2.screen.y,
            seg.color.curb
        );
        drawTrapezoid(
            seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y,
            seg.p1.screen.x + seg.p1.screen.w + curbW1, seg.p1.screen.y,
            seg.p2.screen.x + seg.p2.screen.w + curbW2, seg.p2.screen.y,
            seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y,
            seg.color.curb
        );

        // Asfalto
        drawTrapezoid(
            seg.p1.screen.x - seg.p1.screen.w, seg.p1.screen.y,
            seg.p1.screen.x + seg.p1.screen.w, seg.p1.screen.y,
            seg.p2.screen.x + seg.p2.screen.w, seg.p2.screen.y,
            seg.p2.screen.x - seg.p2.screen.w, seg.p2.screen.y,
            seg.color.road
        );

        // Líneas divisoras
        if (seg.color.lane !== 'transparent') {
            const laneW1 = seg.p1.screen.w * 0.03;
            const laneW2 = seg.p2.screen.w * 0.03;
            for (let l = 1; l < LANES; l++) {
                const laneX1 = seg.p1.screen.x - seg.p1.screen.w + (seg.p1.screen.w * 2 / LANES) * l;
                const laneX2 = seg.p2.screen.x - seg.p2.screen.w + (seg.p2.screen.w * 2 / LANES) * l;
                drawTrapezoid(
                    laneX1 - laneW1, seg.p1.screen.y,
                    laneX1 + laneW1, seg.p1.screen.y,
                    laneX2 + laneW2, seg.p2.screen.y,
                    laneX2 - laneW2, seg.p2.screen.y,
                    seg.color.lane
                );
            }
        }

        maxY = seg.p2.screen.y;
    }

    // 3. Renderizado de Objetos (Árboles y Tráfico Rival) ordenados por profundidad Z
    const drawables = [];

    // Agregar sprites de carretera
    for (let n = 0; n < DRAW_DISTANCE; n++) {
        const seg = GameState.segments[(baseSegmentIndex + n) % GameState.segments.length];
        if (seg.sprite && seg.p1.screen.scale > 0) {
            drawables.push({
                kind: 'sprite',
                relZ: (n + 1) * SEGMENT_LENGTH,
                sprite: seg.sprite,
                screenX: seg.p1.screen.x + (seg.p1.screen.scale * seg.sprite.offset * ROAD_WIDTH * CANVAS_WIDTH / 2),
                screenY: seg.p1.screen.y,
                scale: seg.p1.screen.scale
            });
        }
    }

    // Agregar coches competidores en el rango visible delante del jugador
    GameState.cars.forEach(car => {
        let relZ = car.z - GameState.playerZ;
        if (relZ < -GameState.trackLength / 2) relZ += GameState.trackLength;
        if (relZ > GameState.trackLength / 2) relZ -= GameState.trackLength;

        if (relZ > 25 && relZ < DRAW_DISTANCE * SEGMENT_LENGTH) {
            const carScale = CAMERA_DEPTH / relZ;
            const carSegIndex = Math.floor(car.z / SEGMENT_LENGTH) % GameState.segments.length;
            const carSeg = GameState.segments[carSegIndex];
            const hillY = carSeg ? carSeg.p1.world.y : 0;

            const carScreenX = Math.round((CANVAS_WIDTH / 2) + (carScale * (car.offset * ROAD_WIDTH - cameraX) * CANVAS_WIDTH / 2));
            const carScreenY = Math.round((CANVAS_HEIGHT / 2) - (carScale * (hillY - cameraY) * CANVAS_HEIGHT / 2));
            const carW = Math.max(4, Math.round(carScale * 75000));
            const carH = Math.round(carW * 0.55);

            drawables.push({
                kind: 'car',
                relZ: relZ,
                car: car,
                screenX: carScreenX,
                screenY: carScreenY,
                w: carW,
                h: carH
            });
        }
    });

    // Ordenar de más lejano a más cercano (Z descendente)
    drawables.sort((a, b) => b.relZ - a.relZ);

    drawables.forEach(item => {
        if (item.kind === 'sprite') {
            drawWorldSprite(item.sprite.type, item.screenX, item.screenY, item.scale);
        } else if (item.kind === 'car') {
            drawRivalCar(item.car.type, item.screenX, item.screenY, item.w, item.h);
        }
    });

    // 4. Coche del Jugador (Iconic Red Convertible en primer plano)
    drawPlayerCar();

    // 5. Banner de Checkpoint / Alertas en Pantalla
    if (GameState.banner.timer > 0) {
        ctx.textAlign = 'center';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = GameState.banner.color;
        ctx.fillText(GameState.banner.text, CANVAS_WIDTH / 2, 45);
        if (GameState.banner.subtext) {
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(GameState.banner.subtext, CANVAS_WIDTH / 2, 57);
        }
    }

    ctx.restore();
}

function drawTrapezoid(x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
}

// Sprites de Árboles, Palmeras, Cactus y Arcos
function drawWorldSprite(type, x, y, scale) {
    const size = Math.round(scale * 95000);
    if (size < 2) return;

    ctx.save();
    ctx.translate(x, y);

    if (type === 'palm') {
        // Tronco con textura
        ctx.fillStyle = '#8e5b32';
        ctx.fillRect(-size * 0.05, -size, size * 0.1, size);
        // Corona de palmera
        ctx.fillStyle = '#10ac84';
        ctx.beginPath();
        ctx.arc(0, -size, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1dd1a1';
        ctx.beginPath();
        ctx.arc(0, -size * 1.05, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
    } else if (type === 'cactus') {
        ctx.fillStyle = '#218c74';
        ctx.fillRect(-size * 0.06, -size * 0.7, size * 0.12, size * 0.7);
        ctx.fillRect(-size * 0.22, -size * 0.5, size * 0.44, size * 0.1);
        ctx.fillRect(-size * 0.22, -size * 0.65, size * 0.08, size * 0.18);
        ctx.fillRect(size * 0.14, -size * 0.65, size * 0.08, size * 0.18);
    } else if (type === 'city') {
        // Poste de luz neón
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-size * 0.03, -size * 0.9, size * 0.06, size * 0.9);
        ctx.fillStyle = '#ff00ea';
        ctx.fillRect(-size * 0.15, -size * 0.9, size * 0.3, size * 0.1);
    } else if (type === 'checkpoint_arch') {
        // Gran arco de meta
        const archW = Math.max(20, size * 1.6);
        const archH = Math.max(16, size * 1.1);
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(-archW / 2, -archH, 4, archH);
        ctx.fillRect(archW / 2 - 4, -archH, 4, archH);
        ctx.fillRect(-archW / 2, -archH, archW, 8);
        ctx.fillStyle = '#ff4d6d';
        ctx.font = `${Math.max(4, Math.floor(size * 0.14))}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        ctx.fillText('CHECKPOINT', 0, -archH + 7);
    }

    ctx.restore();
}

// Coche Rival Renderizado Pixel-Art con Sombras y Detalles Claros
function drawRivalCar(type, x, y, w, h) {
    if (w < 3) return;

    ctx.save();
    ctx.translate(x - w / 2, y - h);

    // Sombra del coche en el asfalto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(-w * 0.05, h * 0.85, w * 1.1, h * 0.2);

    let bodyColor = '#0984e3'; // blue coupe
    if (type === 'yellow_cab') bodyColor = '#f1c40f';
    else if (type === 'white_truck') bodyColor = '#f5f6fa';
    else if (type === 'green_gt') bodyColor = '#2ecc71';
    else if (type === 'purple_muscle') bodyColor = '#9b59b6';

    // Neumáticos
    ctx.fillStyle = '#111';
    ctx.fillRect(0, h * 0.6, w * 0.2, h * 0.4);
    ctx.fillRect(w * 0.8, h * 0.6, w * 0.2, h * 0.4);

    // Carrocería principal
    ctx.fillStyle = bodyColor;
    ctx.fillRect(w * 0.06, h * 0.24, w * 0.88, h * 0.56);

    // Cabina / Ventanas
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(w * 0.18, 0, w * 0.64, h * 0.35);

    // Brillo en el parabrisas
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(w * 0.22, h * 0.06, w * 0.56, h * 0.14);

    // Luces traseras rojas
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(w * 0.1, h * 0.44, w * 0.18, h * 0.2);
    ctx.fillRect(w * 0.72, h * 0.44, w * 0.18, h * 0.2);

    // Parachoques / Matrícula
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(w * 0.35, h * 0.55, w * 0.3, h * 0.15);

    ctx.restore();
}

// Coche del Jugador (Iconic Red Convertible)
function drawPlayerCar() {
    const carW = 42;
    const carH = 22;
    const carX = Math.round(CANVAS_WIDTH / 2 - carW / 2);
    const carY = CANVAS_HEIGHT - carH - 6;

    const steer = GameState.input.steer;
    const tilt = Math.round(steer * 3); // Inclinación de carrocería en curvas

    ctx.save();
    ctx.translate(carX, carY);

    // Sombra del coche del jugador
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-2 + tilt, carH - 3, carW + 4, 5);

    // Neumáticos anchos
    ctx.fillStyle = '#111';
    ctx.fillRect(-2 + tilt, carH - 8, 8, 8);
    ctx.fillRect(carW - 6 + tilt, carH - 8, 8, 8);

    // Carrocería principal (Rojo Ferrari OutRun)
    ctx.fillStyle = '#d63031';
    ctx.beginPath();
    ctx.roundRect(0 + tilt, 6, carW, carH - 8, 3);
    ctx.fill();

    // Alerón trasero y detalles
    ctx.fillStyle = '#b71540';
    ctx.fillRect(2 + tilt, 4, carW - 4, 3);

    // Parabrisas
    ctx.fillStyle = '#74b9ff';
    ctx.fillRect(6 + tilt, 1, carW - 12, 5);

    // Piloto (gorra azul)
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(11 + tilt, 0, 5, 4);
    // Copiloto rubia (pelo amarillo ondeando)
    ctx.fillStyle = '#ffeaa7';
    ctx.fillRect(25 + tilt + (Math.sin(Date.now() / 60) * 1.5), -1, 7, 5);

    // Luces traseras (brillan intensamente al frenar)
    const isBraking = GameState.input.brake;
    ctx.fillStyle = isBraking ? '#ff3838' : '#e17055';
    ctx.fillRect(3 + tilt, 9, 7, 4);
    ctx.fillRect(carW - 10 + tilt, 9, 7, 4);

    // Matrícula
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(carW / 2 - 7 + tilt, 11, 14, 4);
    ctx.fillStyle = '#000000';
    ctx.font = '3px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OUTRUN', carW / 2 + tilt, 14);

    ctx.restore();
}

// Actualización del HUD de la Consola
function updateHUD() {
    if (scoreElement) scoreElement.textContent = `SCORE: ${Math.floor(GameState.score).toString().padStart(5, '0')}`;
    if (highScoreElement) highScoreElement.textContent = `HI: ${Math.floor(GameState.highScore).toString().padStart(5, '0')}`;
    if (timeCountElement) {
        timeCountElement.textContent = Math.ceil(GameState.timeLeft).toString().padStart(2, '0');
        if (GameState.timeLeft <= 10) {
            timeContainerElement.classList.add('urgent');
        } else {
            timeContainerElement.classList.remove('urgent');
        }
    }
    if (speedCountElement) {
        const kmh = Math.round((GameState.speed / GameState.maxSpeed) * 240);
        speedCountElement.textContent = kmh.toString().padStart(3, '0');
    }
}

// Actualización del Código QR
function updateQrCode() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/outrun';
    const controlUrl = baseUrl.includes('://')
        ? `${baseUrl}?room=${GameState.roomId}`
        : `${window.location.protocol}//${baseUrl}?room=${GameState.roomId}`;

    if (qrCodeImg) {
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(controlUrl)}&margin=10`;
    }
}

// Gestión de Rankings (Hall of Fame)
function fetchRanking() {
    try {
        const ranking = JSON.parse(localStorage.getItem('outrun-ranking')) || [
            { name: 'SEGA', score: 25000 },
            { name: 'PILOT', score: 18000 },
            { name: 'SPEED', score: 12500 },
            { name: 'RACER', score: 8500 },
            { name: 'TURBO', score: 5000 }
        ];

        const top5 = ranking.slice(0, 5);
        if (top5.length > 0 && GameState.highScore < top5[0].score) {
            GameState.highScore = top5[0].score;
            updateHUD();
        }

        const renderList = (element) => {
            if (!element) return;
            element.innerHTML = '';
            top5.forEach((item, idx) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="rank">${idx + 1}.</span> <span class="nick">${item.name.toUpperCase().substring(0, 10)}</span> <span class="score">${item.score.toString().padStart(5, '0')}</span>`;
                element.appendChild(li);
            });
        };

        renderList(rankingList);
        renderList(videoRankingList);
    } catch (e) {
        console.warn('Error ranking:', e);
    }
}

function submitScore(nickname, score) {
    if (score <= 0) return;
    try {
        let ranking = JSON.parse(localStorage.getItem('outrun-ranking')) || [];
        ranking = ranking.filter(entry => !(entry.name === nickname && entry.score < score));

        if (!ranking.some(e => e.name === nickname && e.score === score)) {
            ranking.push({ name: nickname, score: score, date: new Date().toLocaleDateString() });
        }

        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('outrun-ranking', JSON.stringify(ranking));
        fetchRanking();
    } catch (e) {
        console.warn('Error saving score:', e);
    }
}

// Bucle Principal
function gameLoop(timestamp) {
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.1);
    GameState.lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Auto-Scale Reactivo para Kiosco / TV
function autoScale() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.style.transform = 'none';
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const availableW = window.innerWidth || document.documentElement.clientWidth;
    const availableH = window.innerHeight || document.documentElement.clientHeight;
    if (!availableW || !availableH) return;

    const padding = 20;
    const scaleX = (availableW - padding) / rect.width;
    const scaleY = (availableH - padding) / rect.height;
    const scale = Math.max(0.1, Math.min(scaleX, scaleY));

    container.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', autoScale);
window.addEventListener('load', autoScale);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoScale);
if (window.ResizeObserver) new ResizeObserver(() => autoScale()).observe(document.body);
window.addEventListener('message', (e) => { if (e.data?.type === 'RESCALE') autoScale(); });
[0, 50, 150, 300, 600, 1200].forEach(d => setTimeout(autoScale, d));

// Inicio
buildTrack();
updateHUD();
fetchRanking();
setInterval(fetchRanking, 30000);
requestAnimationFrame(gameLoop);
connectSignalingServer();
