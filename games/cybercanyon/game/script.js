// ==============================================================================
// CYBER CANYON: QuestWorld 3D - Arcade Host Script
// Vuelo supersónico en primera persona a través de un cañón vectorial CRT
// ==============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const playerNickElement = document.getElementById('player-nick');
const shieldsCountElement = document.getElementById('shields-count');
const speedIndicator = document.getElementById('speed-indicator');
const gameOverOverlay = document.getElementById('game-over-overlay');
const waitingOverlay = document.getElementById('waiting-overlay');
const mainScreen = document.getElementById('main-screen');
const rankingList = document.getElementById('ranking-list');
const qrContainer = document.getElementById('qrcode');
const iceRouteElement = document.getElementById('ice-route');

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 320;
const FOV = 230;

// Estado Global de la Partida
const GameState = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    distance: 0,
    shields: 3,
    maxShields: 3,
    speed: 135, // km/h
    baseSpeed: 135,
    maxSpeed: 380,
    boost: false,
    currentNickname: 'PILOT',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,
    screenShake: 0,
    glitchFlash: 0
};

let gameOverTimeout = null;
let gameOverTime = 0;

// Nave / Cámara del Jugador (Vuelo libre 3D en cabina)
const Player = {
    x: 0,          // Posición X en el mundo
    y: 0,          // Posición Y en el mundo (altitud de vuelo)
    z: 0,          // Distancia avanzada a lo largo del cañón
    vx: 0,
    vy: 0,
    speed: 160,
    roll: 0,       // Inclinación lateral (banking)
    targetRoll: 0,
    pitch: 0,      // Cabeceo de vuelo (morro arriba/abajo)
    yaw: 0,        // Orientación hacia las curvas
    invulnerableTime: 0,
    fireCooldown: 0,
    fireRate: 0.16,
    isFiring: false
};

// Sistema de Audio Web Audio API Sintetizado
class CyberAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.droneOsc = null;
        this.droneGain = null;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
                this.startEngineDrone();
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

    startEngineDrone() {
        if (!this.ctx) return;
        try {
            this.droneOsc = this.ctx.createOscillator();
            this.droneGain = this.ctx.createGain();
            this.droneOsc.type = 'sawtooth';
            this.droneOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
            this.droneGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, this.ctx.currentTime);

            this.droneOsc.connect(filter);
            filter.connect(this.droneGain);
            this.droneGain.connect(this.masterGain);
            this.droneOsc.start();
        } catch (e) {}
    }

    updateDroneSpeed(speedRatio) {
        if (!this.ctx || !this.droneOsc) return;
        const targetFreq = 50 + speedRatio * 85;
        this.droneOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    }

    playPassGate() {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((f, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t + idx * 0.04);
            gain.gain.setValueAtTime(0.18, t + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.04 + 0.25);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.04);
            osc.stop(t + idx * 0.04 + 0.25);
        });
        broadcastSFX('gate');
    }

    playEnemyLaser() {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(850, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.16);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.18);
        broadcastSFX('laser');
    }

    playPlayerLaser() {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1150, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);
        gain.gain.setValueAtTime(0.24, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.14);
        broadcastSFX('player_laser');
    }

    playExplosion() {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.35);
        gain.gain.setValueAtTime(0.38, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.38);
        broadcastSFX('explosion');
    }

    playWallHit() {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.linearRampToValueAtTime(40, t + 0.18);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.22);
        broadcastSFX('hit');
    }

    playCrash() {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.6);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.65);
        broadcastSFX('crash');
    }
}

const audio = new CyberAudio();

// ==============================================================================
// MODELADO PROCEDURAL DEL CAÑÓN (ELEVACIÓN DINÁMICA 3D Y CURVAS)
// ==============================================================================

function getCanyonAt(z) {
    // Curvas horizontales del cañón (giros y meandros de la fosa)
    const cX = 75 * Math.sin(z * 0.0022) + 25 * Math.sin(z * 0.0048);
    // Elevación dinámica del cañón (el fondo sube en colinas y baja en valles pronunciados)
    // En coordenadas de pantalla: negativo = hacia el cielo (colina elevada), positivo = hacia el suelo (valle profundo)
    const cY = -48 * Math.sin(z * 0.0028) - 22 * Math.sin(z * 0.0062);
    const halfWidth = 85; // Ancho de vuelo
    const wallHeight = 140; // Altura de las paredes verticales
    return { cX, cY, halfWidth, wallHeight };
}

// Compuertas / Anillos de datos cibernéticos
const GATES = [];
const GATE_INTERVAL = 140;
let nextGateZ = 160;

function spawnGatesAhead(playerZ) {
    while (nextGateZ < playerZ + 550) {
        const canyon = getCanyonAt(nextGateZ);
        GATES.push({
            z: nextGateZ,
            x: canyon.cX + (Math.sin(nextGateZ * 0.015) * 20),
            y: canyon.cY + (Math.cos(nextGateZ * 0.012) * 14),
            radius: 36,
            passed: false
        });
        nextGateZ += GATE_INTERVAL;
    }
    while (GATES.length > 0 && GATES[0].z < playerZ - 60) {
        GATES.shift();
    }
}

// Obstáculos estáticos del cañón (Monolitos y barreras láser)
const OBSTACLES = [];
const OBSTACLE_INTERVAL = 240;
let nextObstacleZ = 220;

function spawnObstaclesAhead(playerZ) {
    while (nextObstacleZ < playerZ + 550) {
        const canyon = getCanyonAt(nextObstacleZ);
        const isPillar = (Math.floor(nextObstacleZ / OBSTACLE_INTERVAL) % 2 === 0);
        if (isPillar) {
            const laneOffsets = [-36, 0, 36];
            const chosenX = laneOffsets[Math.floor(Math.random() * laneOffsets.length)];
            OBSTACLES.push({
                type: 'pillar',
                z: nextObstacleZ,
                relX: chosenX,
                x: canyon.cX + chosenX,
                y: canyon.cY + (canyon.wallHeight * 0.35) - 35,
                width: 24,
                height: 80,
                passed: false
            });
        } else {
            const isHigh = Math.random() > 0.5;
            const barrierRelY = isHigh ? -(canyon.wallHeight * 0.38) : (canyon.wallHeight * 0.12);
            OBSTACLES.push({
                type: 'barrier',
                z: nextObstacleZ,
                relX: 0,
                x: canyon.cX,
                y: canyon.cY + barrierRelY,
                width: canyon.halfWidth * 1.5,
                height: 16,
                passed: false
            });
        }
        nextObstacleZ += OBSTACLE_INTERVAL;
    }
    while (OBSTACLES.length > 0 && OBSTACLES[0].z < playerZ - 60) {
        OBSTACLES.shift();
    }
}

// Enemigos estáticos (Torretas centinela con disparos de plasma)
const ENEMIES = [];
const ENEMY_INTERVAL = 280;
let nextEnemyZ = 320;

function spawnEnemiesAhead(playerZ) {
    while (nextEnemyZ < playerZ + 550) {
        const canyon = getCanyonAt(nextEnemyZ);
        const wallOffsets = [-40, 40, 0];
        const chosenOffset = wallOffsets[Math.floor(Math.random() * wallOffsets.length)];
        ENEMIES.push({
            id: Math.random(),
            type: 'turret',
            z: nextEnemyZ,
            relX: chosenOffset,
            x: canyon.cX + chosenOffset,
            y: canyon.cY + (Math.sin(nextEnemyZ * 0.02) * 16),
            radius: 16,
            hasShot: false,
            passed: false
        });
        nextEnemyZ += ENEMY_INTERVAL;
    }
    while (ENEMIES.length > 0 && ENEMIES[0].z < playerZ - 60) {
        ENEMIES.shift();
    }
}

// Proyectiles de plasma enemigos
const PROJECTILES = [];

// Disparos láser de la nave del jugador
const PLAYER_LASERS = [];

// Sistema de partículas de explosión vectorial CRT
const PARTICLES = [];

function firePlayerLaser() {
    audio.playPlayerLaser();
    const forwardSpeed = (GameState.speed * (GameState.boost ? 1.55 : 1.0)) / 3.6;
    const laserSpeed = forwardSpeed + 260; // m/s
    const launchZ = Player.z + 10;

    // Disparo gemelo (ala izquierda y ala derecha de la nave)
    PLAYER_LASERS.push({
        x: Player.x - 14,
        y: Player.y + 4,
        z: launchZ,
        vx: Player.yaw * 110,
        vy: Player.pitch * 110,
        vz: laserSpeed,
        radius: 6,
        life: 1.5
    });

    PLAYER_LASERS.push({
        x: Player.x + 14,
        y: Player.y + 4,
        z: launchZ,
        vx: Player.yaw * 110,
        vy: Player.pitch * 110,
        vz: laserSpeed,
        radius: 6,
        life: 1.5
    });
}

function spawnExplosion(x, y, z, color = '#3dff8a', count = 16) {
    audio.playExplosion();
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 25 + Math.random() * 55;
        PARTICLES.push({
            x: x,
            y: y,
            z: z,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            vz: (Math.random() - 0.5) * 45,
            color: color,
            life: 0.55,
            maxLife: 0.55,
            size: 3 + Math.random() * 3.5
        });
    }
}

// ==============================================================================
// RED WEBRTC Y SEÑALIZACIÓN
// ==============================================================================

const peerConnections = new Map();
const dataChannels = new Map();
const pendingCandidates = new Map();
let socket = null;

const signalingState = {
    shouldReconnect: true,
    manualClose: false
};

function setIceRouteText(text) {
    if (iceRouteElement) iceRouteElement.textContent = `ICE: ${text}`;
}

function getIceRouteType(stats) {
    let localCandidate = null;
    stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            localCandidate = stats.get(report.localCandidateId);
        }
    });
    return localCandidate ? (localCandidate.candidateType === 'relay' ? 'TURN' : 'STUN') : null;
}

function refreshIceRoute(pc) {
    pc.getStats().then(stats => {
        const routeType = getIceRouteType(stats);
        setIceRouteText(routeType || 'DIRECT');
    }).catch(() => setIceRouteText('OK'));
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
        document.getElementById('room-id').textContent = `ID: ${GameState.roomId}`;
        socket.send(JSON.stringify({ 
            type: 'register', 
            role: 'host', 
            roomId: GameState.roomId,
            maxPlayers: CONFIG.MAX_PLAYERS 
        }));
    };

    currentSocket.onerror = (e) => console.error('WebSocket error:', e);

    currentSocket.onclose = () => {
        if (!signalingState.manualClose) {
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
                if (pc && pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } else {
                    if (!pendingCandidates.has(data.playerId)) {
                        pendingCandidates.set(data.playerId, []);
                    }
                    pendingCandidates.get(data.playerId).push(data.candidate);
                }
            } else if (data.type === 'controller_connected') {
                waitingOverlay.classList.add('hidden');
            } else if (data.type === 'controller_disconnected') {
                handleControllerDisconnect(data.playerId);
            }
        } catch (e) {
            console.error('Error procesando señalización:', e);
        }
    };
}

function handleControllerDisconnect(playerId) {
    const pc = peerConnections.get(playerId);
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);
    pendingCandidates.delete(playerId);

    if (peerConnections.size === 0 && !GameState.running && GameState.gameOver) {
        waitingOverlay.classList.remove('hidden');
    }
}

async function handleOffer(data) {
    const { playerId } = data;
    const sdp = typeof data.sdp === 'string' ? data.sdp : (data.sdp?.sdp || '');
    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) ? window.GAME_CONFIG.getIceConfig() : { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pc = new RTCPeerConnection(rtcConfig);

    peerConnections.set(playerId, pc);
    pendingCandidates.set(playerId, []);

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
                if (input.type === 'nickname' || input.type === 'join') {
                    GameState.currentNickname = (input.value || input.nickname || 'PILOT').toUpperCase();
                    playerNickElement.textContent = `PILOT: ${GameState.currentNickname}`;
                    waitingOverlay.classList.add('hidden');
                    resetGame();
                } else {
                    handleControllerInput(input);
                }
            } catch (err) {}
        };

        receiveChannel.onopen = () => {
            waitingOverlay.classList.add('hidden');
            refreshIceRoute(pc);
        };

        receiveChannel.onclose = () => handleControllerDisconnect(playerId);
    };

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));

    const queued = pendingCandidates.get(playerId) || [];
    for (const c of queued) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (err) {}
    }
    pendingCandidates.delete(playerId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.send(JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        playerId: playerId
    }));
}

function handleControllerInput(input) {
    if (input.x !== undefined && input.y !== undefined) {
        Player.vx = input.x * Player.speed;
        // Inversión de nave para joystick móvil: empujar arriba (input.y < 0) = picar hacia el suelo (vy > 0)
        Player.vy = -input.y * Player.speed;
    }
    if (input.boost !== undefined) {
        GameState.boost = Boolean(input.boost);
    }
    if (input.fire !== undefined) {
        Player.isFiring = Boolean(input.fire);
    }
}

function broadcastSFX(sfxType) {
    dataChannels.forEach(dc => {
        if (dc.readyState === 'open') {
            dc.send(JSON.stringify({ type: 'sfx', sound: sfxType }));
        }
    });
}

function notifyGameOver() {
    dataChannels.forEach(channel => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({ type: 'game_over', score: GameState.score }));
        }
    });
}

// ==============================================================================
// LÓGICA DE PARTIDA Y ACTUALIZACIÓN
// ==============================================================================

function resetGame() {
    if (gameOverTimeout) {
        clearTimeout(gameOverTimeout);
        gameOverTimeout = null;
    }
    audio.init();
    GameState.running = true;
    GameState.gameOver = false;
    GameState.score = 0;
    GameState.distance = 0;
    GameState.shields = GameState.maxShields;
    GameState.speed = GameState.baseSpeed;
    GameState.boost = false;
    GameState.screenShake = 0;
    GameState.glitchFlash = 0;

    const startCanyon = getCanyonAt(0);
    Player.x = startCanyon.cX;
    Player.y = startCanyon.cY;
    Player.z = 0;
    Player.vx = 0;
    Player.vy = 0;
    Player.roll = 0;
    Player.targetRoll = 0;
    Player.pitch = 0;
    Player.yaw = 0;
    Player.invulnerableTime = 0;

    GATES.length = 0;
    nextGateZ = 160;

    OBSTACLES.length = 0;
    nextObstacleZ = 220;

    ENEMIES.length = 0;
    nextEnemyZ = 320;

    PROJECTILES.length = 0;
    PLAYER_LASERS.length = 0;
    PARTICLES.length = 0;
    Player.fireCooldown = 0;
    Player.isFiring = false;

    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
    updateUI();
}

function update(dt) {
    if (!GameState.running || GameState.gameOver) return;

    const effectiveSpeed = (GameState.speed * (GameState.boost ? 1.55 : 1.0));
    const speedRatio = (effectiveSpeed - GameState.baseSpeed) / (GameState.maxSpeed - GameState.baseSpeed);
    audio.updateDroneSpeed(speedRatio);

    const distDelta = (effectiveSpeed / 3.6) * dt; // m/s
    GameState.distance += distDelta;
    Player.z += distDelta;

    if (GameState.speed < GameState.maxSpeed) {
        GameState.speed += dt * 3.0;
    }

    GameState.score += Math.floor(distDelta * (GameState.boost ? 2.5 : 1.0));

    // Desplazamiento libre de vuelo en coordenadas de mundo
    Player.x += Player.vx * dt;
    Player.y += Player.vy * dt;

    // Alabeo reactivo (Roll): La cabina se inclina en los giros laterales
    Player.targetRoll = (Player.vx / Player.speed) * 0.40;
    Player.roll += (Player.targetRoll - Player.roll) * 8.0 * dt;

    // Cabeceo de vuelo (Pitch): Inclinación reactiva del morro al subir/bajar
    const targetPitch = (-Player.vy / Player.speed) * 0.16;
    Player.pitch += (targetPitch - Player.pitch) * 8.0 * dt;

    // Orientación predictiva suave hacia las curvas (mantiene el cañón centrado en la vista)
    const currentCanyon = getCanyonAt(Player.z);
    const aheadCanyon = getCanyonAt(Player.z + 55);
    const targetYaw = (aheadCanyon.cX - currentCanyon.cX) / 55;
    Player.yaw += (targetYaw - Player.yaw) * 4.5 * dt;

    // Posición del jugador relativa a la fosa en el punto actual
    const relX = Player.x - currentCanyon.cX;
    const relY = Player.y - currentCanyon.cY;

    const safeMarginX = currentCanyon.halfWidth - 14;
    const safeMarginYFloor = currentCanyon.wallHeight * 0.35 - 8; // Suelo del cañón
    const safeMarginYRim = currentCanyon.wallHeight * 0.65 - 8;   // Techo / Cresta

    if (Player.invulnerableTime > 0) {
        Player.invulnerableTime -= dt;
    }

    let hitWall = false;

    // Colisión lateral (Paredes del cañón si no gira a tiempo en las curvas)
    if (Math.abs(relX) > safeMarginX) {
        hitWall = true;
        Player.x = currentCanyon.cX + Math.sign(relX) * safeMarginX;
        Player.vx = -Player.vx * 0.35;
    }

    // Colisión vertical: Suelo del cañón (si el fondo sube en colina y la nave no asciende a tiempo)
    if (relY > safeMarginYFloor) {
        hitWall = true;
        Player.y = currentCanyon.cY + safeMarginYFloor;
        Player.vy = -Math.abs(Player.vy) * 0.35 - 25; // Rebote hacia arriba
    }
    // Colisión vertical: Techo / Cresta (si la nave vuela demasiado alto o no desciende en el valle)
    else if (relY < -safeMarginYRim) {
        hitWall = true;
        Player.y = currentCanyon.cY - safeMarginYRim;
        Player.vy = Math.abs(Player.vy) * 0.35 + 25; // Rebote hacia abajo
    }

    if (hitWall && Player.invulnerableTime <= 0) {
        GameState.shields--;
        Player.invulnerableTime = 1.0;
        GameState.screenShake = 14;
        GameState.glitchFlash = 1.0;
        audio.playWallHit();

        if (GameState.shields <= 0) {
            endGame();
            return;
        }
    }

    // Spawn y verificación de anillos cibernéticos
    spawnGatesAhead(Player.z);
    for (const gate of GATES) {
        if (!gate.passed && gate.z <= Player.z + 8 && gate.z >= Player.z - 8) {
            gate.passed = true;
            const distToGate = Math.hypot(Player.x - gate.x, Player.y - gate.y);
            if (distToGate < gate.radius) {
                GameState.score += 300;
                audio.playPassGate();
            }
        }
    }

    // Spawn y verificación de obstáculos estáticos (monolitos y barreras láser)
    spawnObstaclesAhead(Player.z);
    for (const obs of OBSTACLES) {
        const relZ = obs.z - Player.z;
        if (!obs.passed && relZ <= 8 && relZ >= -8) {
            let hit = false;
            if (obs.type === 'pillar') {
                const dx = Math.abs(Player.x - obs.x);
                const dy = Math.abs(Player.y - obs.y);
                if (dx < (obs.width / 2 + 8) && dy < (obs.height / 2 + 8)) {
                    hit = true;
                }
            } else if (obs.type === 'barrier') {
                const dy = Math.abs(Player.y - obs.y);
                const dx = Math.abs(Player.x - obs.x);
                if (dy < (obs.height / 2 + 8) && dx < (obs.width / 2)) {
                    hit = true;
                }
            }

            if (hit && Player.invulnerableTime <= 0) {
                GameState.shields--;
                Player.invulnerableTime = 1.0;
                GameState.screenShake = 16;
                GameState.glitchFlash = 1.0;
                audio.playWallHit();

                if (GameState.shields <= 0) {
                    endGame();
                    return;
                }
            }

            if (relZ <= -6) {
                obs.passed = true;
                if (!hit) {
                    GameState.score += 150; // Bonificación por esquivar obstáculo estático
                }
            }
        }
    }

    // Spawn y verificación de enemigos estáticos (torretas que disparan proyectiles)
    spawnEnemiesAhead(Player.z);
    for (const enemy of ENEMIES) {
        const relZ = enemy.z - Player.z;

        // Disparo de plasma cuando el jugador entra en rango visual
        if (!enemy.hasShot && relZ <= 260 && relZ >= 70) {
            enemy.hasShot = true;
            audio.playEnemyLaser();

            const vClose = (effectiveSpeed / 3.6) + 75; // velocidad relativa de cierre
            const tArrival = Math.max(0.6, relZ / vClose);
            const vx = (Player.x - enemy.x) / tArrival;
            const vy = (Player.y - enemy.y) / tArrival;

            PROJECTILES.push({
                x: enemy.x,
                y: enemy.y,
                z: enemy.z,
                vx: Math.max(-45, Math.min(45, vx)),
                vy: Math.max(-45, Math.min(45, vy)),
                vz: -75,
                radius: 8
            });
        }

        // Colisión física contra la torreta estática
        if (!enemy.passed && relZ <= 8 && relZ >= -8) {
            const dist = Math.hypot(Player.x - enemy.x, Player.y - enemy.y);
            if (dist < (enemy.radius + 12) && Player.invulnerableTime <= 0) {
                GameState.shields--;
                Player.invulnerableTime = 1.0;
                GameState.screenShake = 16;
                GameState.glitchFlash = 1.0;
                audio.playWallHit();

                if (GameState.shields <= 0) {
                    endGame();
                    return;
                }
            }

            if (relZ <= -6) {
                enemy.passed = true;
                GameState.score += 200; // Puntos por evadir al centinela
            }
        }
    }

    // Actualización y colisiones de proyectiles enemigos
    for (let p = PROJECTILES.length - 1; p >= 0; p--) {
        const proj = PROJECTILES[p];
        proj.z += proj.vz * dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        const relZ = proj.z - Player.z;
        if (relZ <= 7 && relZ >= -7) {
            const dist = Math.hypot(Player.x - proj.x, Player.y - proj.y);
            if (dist < 20 && Player.invulnerableTime <= 0) {
                GameState.shields--;
                Player.invulnerableTime = 1.0;
                GameState.screenShake = 16;
                GameState.glitchFlash = 1.0;
                audio.playWallHit();
                PROJECTILES.splice(p, 1);

                if (GameState.shields <= 0) {
                    endGame();
                    return;
                }
                continue;
            }
        }

        if (proj.z < Player.z - 25) {
            PROJECTILES.splice(p, 1);
        }
    }

    // Gestión de disparo de la nave del jugador (cañones gemelos)
    if (keyState.fire || Player.isFiring) {
        Player.fireCooldown -= dt;
        if (Player.fireCooldown <= 0) {
            firePlayerLaser();
            Player.fireCooldown = Player.fireRate;
        }
    } else {
        Player.fireCooldown = Math.max(0, Player.fireCooldown - dt);
    }

    // Actualización de láseres del jugador y detección de impactos 3D
    for (let l = PLAYER_LASERS.length - 1; l >= 0; l--) {
        const laser = PLAYER_LASERS[l];
        laser.z += laser.vz * dt;
        laser.x += laser.vx * dt;
        laser.y += laser.vy * dt;
        laser.life -= dt;

        let laserConsumed = false;

        // 1. Impacto contra torretas enemigas (ÚNICO elemento destructible)
        for (let e = ENEMIES.length - 1; e >= 0; e--) {
            const enemy = ENEMIES[e];
            const dz = Math.abs(laser.z - enemy.z);
            if (dz < 16) {
                const dist = Math.hypot(laser.x - enemy.x, laser.y - enemy.y);
                if (dist < enemy.radius + 12) {
                    spawnExplosion(enemy.x, enemy.y, enemy.z, '#ff4d6d', 20);
                    ENEMIES.splice(e, 1);
                    laserConsumed = true;
                    GameState.score += 500;
                    break;
                }
            }
        }

        // 2. Chocar contra monolitos y barreras (El obstáculo es indestructible, el láser se disipa con chispas)
        if (!laserConsumed) {
            for (const obs of OBSTACLES) {
                const dz = Math.abs(laser.z - obs.z);
                if (dz < 16) {
                    let hitObs = false;
                    if (obs.type === 'pillar') {
                        const dx = Math.abs(laser.x - obs.x);
                        const dy = Math.abs(laser.y - obs.y);
                        if (dx < (obs.width / 2 + 8) && dy < (obs.height / 2 + 8)) {
                            hitObs = true;
                        }
                    } else if (obs.type === 'barrier') {
                        const dy = Math.abs(laser.y - obs.y);
                        const dx = Math.abs(laser.x - obs.x);
                        if (dy < (obs.height / 2 + 8) && dx < (obs.width / 2)) {
                            hitObs = true;
                        }
                    }
                    if (hitObs) {
                        spawnExplosion(laser.x, laser.y, laser.z, '#ffb703', 5);
                        laserConsumed = true;
                        break;
                    }
                }
            }
        }

        if (laserConsumed || laser.life <= 0 || laser.z > Player.z + 450) {
            PLAYER_LASERS.splice(l, 1);
        }
    }

    // Actualización de partículas de explosión
    for (let pt = PARTICLES.length - 1; pt >= 0; pt--) {
        const p = PARTICLES[pt];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.life -= dt;
        if (p.life <= 0) {
            PARTICLES.splice(pt, 1);
        }
    }

    if (GameState.screenShake > 0) {
        GameState.screenShake = Math.max(0, GameState.screenShake - dt * 25);
    }
    if (GameState.glitchFlash > 0) {
        GameState.glitchFlash = Math.max(0, GameState.glitchFlash - dt * 4);
    }

    updateUI();
}

// ==============================================================================
// RENDERIZADOR 3D: LÍNEAS VERTICALES EN PAREDES Y HORIZONTE ESTABLE
// ==============================================================================

function draw() {
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    ctx.save();

    // Sacudida por impacto
    if (GameState.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * GameState.screenShake;
        const shakeY = (Math.random() - 0.5) * GameState.screenShake;
        ctx.translate(shakeX, shakeY);
    }

    // Rotación de alabeo (Roll) en el centro de visión
    ctx.translate(centerX, centerY);
    ctx.rotate(-Player.roll);
    ctx.translate(-centerX, -centerY);

    // Rebanadas del cañón proyectadas en profundidad Z
    const numSlices = 30;
    const sliceSpacing = 12;
    const maxZ = numSlices * sliceSpacing;
    const offsetZ = Player.z % sliceSpacing;

    const currentCanyon = getCanyonAt(Player.z);
    const projectedSlices = [];

    for (let i = numSlices; i >= 1; i--) {
        const relZ = (i * sliceSpacing) - offsetZ;
        if (relZ <= 5) continue;

        const worldZ = Player.z + relZ;
        const canyon = getCanyonAt(worldZ);
        // Posición relativa a la cámara del piloto (con compensación de yaw y pitch)
        const relCamX = (canyon.cX - Player.x) - Player.yaw * relZ;
        const relCamY = (canyon.cY - Player.y) - Player.pitch * relZ;

        const scale = FOV / relZ;
        const px = centerX + relCamX * scale;
        const py = centerY + relCamY * scale;

        const hw = canyon.halfWidth * scale;
        const wh = canyon.wallHeight * scale;

        const alpha = Math.max(0.12, Math.min(1.0, 1.0 - Math.pow(relZ / maxZ, 1.3)));

        const floorY = py + wh * 0.35;
        const rimY = py - wh * 0.65;
        const leftX = px - hw;
        const rightX = px + hw;

        projectedSlices.push({
            worldZ,
            scale,
            px,
            py,
            hw,
            wh,
            floorY,
            rimY,
            leftX,
            rightX,
            alpha
        });
    }

    ctx.lineWidth = 1.6;

    // 1. DIBUJAR CORTES DEL CAÑÓN: SOLO LÍNEAS VERTICALES SUPERFICIALES EN LAS PAREDES
    for (let s = 0; s < projectedSlices.length; s++) {
        const slice = projectedSlices[s];
        const alpha = slice.alpha;
        ctx.strokeStyle = `rgba(61, 255, 138, ${alpha})`;

        // Línea del lecho/suelo transversal
        ctx.beginPath();
        ctx.moveTo(slice.leftX, slice.floorY);
        ctx.lineTo(slice.rightX, slice.floorY);
        ctx.stroke();

        // PARED IZQUIERDA: ÚNICAMENTE LÍNEA VERTICAL SUPERFICIAL
        ctx.beginPath();
        ctx.moveTo(slice.leftX, slice.floorY);
        ctx.lineTo(slice.leftX, slice.rimY);
        ctx.stroke();

        // PARED DERECHA: ÚNICAMENTE LÍNEA VERTICAL SUPERFICIAL
        ctx.beginPath();
        ctx.moveTo(slice.rightX, slice.floorY);
        ctx.lineTo(slice.rightX, slice.rimY);
        ctx.stroke();
    }

    // 2. LÍNEAS LONGITUDINALES QUE VAN HACIA EL FONDO (Horizonte, lecho y crestas)
    if (projectedSlices.length > 2) {
        // Líneas longitudinales del lecho del cañón (suelo enrejado que sube y baja)
        const floorTracks = [-1, -0.5, 0, 0.5, 1];
        floorTracks.forEach(r => {
            ctx.beginPath();
            ctx.strokeStyle = (Math.abs(r) === 1) 
                ? 'rgba(61, 255, 138, 0.60)' 
                : 'rgba(61, 255, 138, 0.22)';
            for (let i = 0; i < projectedSlices.length; i++) {
                const sl = projectedSlices[i];
                const x = sl.px + (sl.hw * r);
                const y = sl.floorY;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // Líneas longitudinales en la cresta superior de las paredes
        [-1, 1].forEach(dir => {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(61, 255, 138, 0.50)';
            for (let i = 0; i < projectedSlices.length; i++) {
                const sl = projectedSlices[i];
                const x = sl.px + (sl.hw * dir);
                const y = sl.rimY;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
    }

    // 3. ANILLOS / COMPUERTAS CIBERNÉTICAS
    for (const gate of GATES) {
        const relZ = gate.z - Player.z;
        if (relZ > 5 && relZ < maxZ) {
            const scale = FOV / relZ;
            const gx = centerX + (gate.x - Player.x - Player.yaw * relZ) * scale;
            const gy = centerY + (gate.y - Player.y - Player.pitch * relZ) * scale;
            const gr = gate.radius * scale;
            const alpha = Math.max(0.2, Math.min(1.0, 1.0 - (relZ / maxZ)));

            ctx.save();
            ctx.lineWidth = Math.max(2, 3.5 * scale);
            ctx.strokeStyle = gate.passed 
                ? `rgba(61, 255, 138, ${alpha * 0.35})` 
                : `rgba(255, 183, 3, ${alpha})`;

            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const angle = (a * Math.PI / 3);
                const hx = gx + Math.cos(angle) * gr;
                const hy = gy + Math.sin(angle) * gr;
                if (a === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }
    }

    // 4. OBSTÁCULOS ESTÁTICOS (Monolitos y barreras láser)
    for (const obs of OBSTACLES) {
        const relZ = obs.z - Player.z;
        if (relZ > 5 && relZ < maxZ) {
            const scale = FOV / relZ;
            const ox = centerX + (obs.x - Player.x - Player.yaw * relZ) * scale;
            const oy = centerY + (obs.y - Player.y - Player.pitch * relZ) * scale;
            const alpha = Math.max(0.25, Math.min(1.0, 1.0 - Math.pow(relZ / maxZ, 1.2)));

            ctx.save();
            if (obs.type === 'pillar') {
                const pw = obs.width * scale;
                const ph = obs.height * scale;
                ctx.strokeStyle = `rgba(255, 183, 3, ${alpha})`; // Ámbar neón
                ctx.lineWidth = Math.max(1.5, 3.5 * scale);
                ctx.strokeRect(ox - pw / 2, oy - ph / 2, pw, ph);

                // Rejilla interna del monolito
                ctx.beginPath();
                ctx.moveTo(ox - pw / 2, oy);
                ctx.lineTo(ox + pw / 2, oy);
                ctx.moveTo(ox, oy - ph / 2);
                ctx.lineTo(ox, oy + ph / 2);
                ctx.stroke();
            } else if (obs.type === 'barrier') {
                const bw = obs.width * scale;
                const bh = obs.height * scale;
                ctx.strokeStyle = `rgba(255, 77, 109, ${alpha})`; // Carmesí peligro
                ctx.lineWidth = Math.max(2, 3.8 * scale);

                // Viga horizontal láser y emisores verticales
                ctx.beginPath();
                ctx.moveTo(ox - bw / 2, oy);
                ctx.lineTo(ox + bw / 2, oy);
                ctx.moveTo(ox - bw / 2, oy - bh);
                ctx.lineTo(ox - bw / 2, oy + bh);
                ctx.moveTo(ox + bw / 2, oy - bh);
                ctx.lineTo(ox + bw / 2, oy + bh);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    // 5. ENEMIGOS ESTÁTICOS (Torretas Centinela Tron)
    for (const enemy of ENEMIES) {
        const relZ = enemy.z - Player.z;
        if (relZ > 5 && relZ < maxZ) {
            const scale = FOV / relZ;
            const ex = centerX + (enemy.x - Player.x - Player.yaw * relZ) * scale;
            const ey = centerY + (enemy.y - Player.y - Player.pitch * relZ) * scale;
            const er = enemy.radius * scale;
            const alpha = Math.max(0.25, Math.min(1.0, 1.0 - (relZ / maxZ)));

            ctx.save();
            ctx.strokeStyle = `rgba(255, 77, 109, ${alpha})`; // Carmesí neón
            ctx.lineWidth = Math.max(2, 3.5 * scale);

            // Diamante / Octaedro flotante
            ctx.beginPath();
            ctx.moveTo(ex, ey - er * 1.3);
            ctx.lineTo(ex + er, ey);
            ctx.lineTo(ex, ey + er * 1.3);
            ctx.lineTo(ex - er, ey);
            ctx.closePath();
            ctx.stroke();

            // Núcleo / Ojo cañón del centinela (parpadea antes de disparar)
            const eyeColor = (!enemy.hasShot && relZ <= 290) 
                ? (Math.floor(Date.now() / 120) % 2 === 0 ? '#ffb703' : '#ff4d6d')
                : `rgba(255, 77, 109, ${alpha * 0.7})`;
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            ctx.arc(ex, ey, Math.max(2.5, 4.5 * scale), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 6. PROYECTILES DE PLASMA ENEMIGOS
    for (const proj of PROJECTILES) {
        const relZ = proj.z - Player.z;
        if (relZ > 2 && relZ < maxZ) {
            const scale = FOV / relZ;
            const px = centerX + (proj.x - Player.x - Player.yaw * relZ) * scale;
            const py = centerY + (proj.y - Player.y - Player.pitch * relZ) * scale;
            const pr = Math.max(3, proj.radius * scale);
            const alpha = Math.max(0.35, Math.min(1.0, 1.0 - (relZ / maxZ)));

            ctx.save();
            ctx.strokeStyle = `rgba(255, 77, 109, ${alpha})`;
            ctx.fillStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.8, 3.2 * scale);

            // Rombo energético de plasma
            ctx.beginPath();
            ctx.moveTo(px, py - pr * 1.4);
            ctx.lineTo(px + pr, py);
            ctx.lineTo(px, py + pr * 1.4);
            ctx.lineTo(px - pr, py);
            ctx.closePath();
            ctx.stroke();

            // Núcleo blanco incandescente
            ctx.beginPath();
            ctx.arc(px, py, pr * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 7. LÁSERES DE LA NAVE DEL JUGADOR
    for (const laser of PLAYER_LASERS) {
        const relZ = laser.z - Player.z;
        if (relZ > 2 && relZ < maxZ) {
            const scale = FOV / relZ;
            const lx = centerX + (laser.x - Player.x - Player.yaw * relZ) * scale;
            const ly = centerY + (laser.y - Player.y - Player.pitch * relZ) * scale;
            const lr = Math.max(2.5, laser.radius * scale);
            const alpha = Math.max(0.4, Math.min(1.0, 1.0 - (relZ / maxZ)));

            ctx.save();
            ctx.strokeStyle = `rgba(61, 255, 138, ${alpha})`; // Fósforo verde neón
            ctx.fillStyle = '#ffffff';
            ctx.lineWidth = Math.max(2, 3.5 * scale);

            // Perno láser alargado
            const boltLength = Math.max(7, 20 * scale);
            ctx.beginPath();
            ctx.moveTo(lx, ly - boltLength);
            ctx.lineTo(lx, ly + boltLength);
            ctx.stroke();

            // Núcleo blanco brillante
            ctx.beginPath();
            ctx.arc(lx, ly, lr * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 8. PARTÍCULAS DE EXPLOSIÓN VECTORIALES CRT
    for (const p of PARTICLES) {
        const relZ = p.z - Player.z;
        if (relZ > 2 && relZ < maxZ) {
            const scale = FOV / relZ;
            const px = centerX + (p.x - Player.x - Player.yaw * relZ) * scale;
            const py = centerY + (p.y - Player.y - Player.pitch * relZ) * scale;
            const pSize = Math.max(1.8, p.size * scale);
            const alpha = Math.max(0.1, p.life / p.maxLife);

            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(px - pSize / 2, py - pSize / 2, pSize, pSize);
            ctx.restore();
        }
    }

    // 9. CABINA INMERSIVA DE VUELO (Rota con la nave y responde al cabeceo del piloto)
    ctx.save();
    const hudColor = Player.invulnerableTime > 0 
        ? 'rgba(255, 77, 109, 0.9)' 
        : (GameState.boost ? 'rgba(255, 183, 3, 0.9)' : 'rgba(61, 255, 138, 0.75)');

    ctx.strokeStyle = hudColor;
    ctx.fillStyle = hudColor;
    ctx.lineWidth = 1.5;

    // Horizonte artificial estilizado
    const horizonY = centerY - (Player.pitch * 90);
    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.moveTo(centerX - 80, horizonY);
    ctx.lineTo(centerX - 25, horizonY);
    ctx.moveTo(centerX + 25, horizonY);
    ctx.lineTo(centerX + 80, horizonY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Retícula central de la cabina
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.moveTo(centerX - 35, centerY);
    ctx.lineTo(centerX - 12, centerY);
    ctx.lineTo(centerX - 12, centerY + 6);
    ctx.moveTo(centerX + 35, centerY);
    ctx.lineTo(centerX + 12, centerY);
    ctx.lineTo(centerX + 12, centerY + 6);
    ctx.stroke();

    // Bordes de cabina QuestWorld
    ctx.strokeStyle = 'rgba(61, 255, 138, 0.35)';
    ctx.beginPath();
    ctx.moveTo(25, 60); ctx.lineTo(25, 25); ctx.lineTo(60, 25);
    ctx.moveTo(CANVAS_WIDTH - 25, 60); ctx.lineTo(CANVAS_WIDTH - 25, 25); ctx.lineTo(CANVAS_WIDTH - 60, 25);
    ctx.moveTo(25, CANVAS_HEIGHT - 60); ctx.lineTo(25, CANVAS_HEIGHT - 25); ctx.lineTo(60, CANVAS_HEIGHT - 25);
    ctx.moveTo(CANVAS_WIDTH - 25, CANVAS_HEIGHT - 60); ctx.lineTo(CANVAS_WIDTH - 25, CANVAS_HEIGHT - 25); ctx.lineTo(CANVAS_WIDTH - 60, CANVAS_HEIGHT - 25);
    ctx.stroke();

    ctx.restore();

    ctx.restore(); // Fin de la transformación de cámara / roll

    if (GameState.glitchFlash > 0) {
        ctx.fillStyle = `rgba(255, 77, 109, ${GameState.glitchFlash * 0.35})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

function gameLoop(timestamp) {
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = Math.min((timestamp - GameState.lastTime) / 1000, 0.1);
    GameState.lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

function endGame() {
    if (gameOverTimeout) {
        clearTimeout(gameOverTimeout);
        gameOverTimeout = null;
    }

    audio.playCrash();
    GameState.gameOver = true;
    GameState.running = false;
    gameOverTime = performance.now();
    gameOverOverlay.classList.remove('hidden');
    waitingOverlay.classList.add('hidden');
    notifyGameOver();
    submitScore(GameState.currentNickname, GameState.score);

    // Solo transiciona al QR si la partida sigue en Game Over y no se ha reiniciado
    gameOverTimeout = setTimeout(() => {
        if (!GameState.running && GameState.gameOver) {
            gameOverOverlay.classList.add('hidden');
            waitingOverlay.classList.remove('hidden');
            GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
            document.getElementById('room-id').textContent = `ID: ${GameState.roomId}`;
            updateQrCode();

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ 
                    type: 'register', 
                    role: 'host', 
                    roomId: GameState.roomId,
                    maxPlayers: CONFIG.MAX_PLAYERS 
                }));
            }
        }
    }, 10000);
}

function updateUI() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(4, '0')}`;
    highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(4, '0')}`;
    
    let shieldBars = '';
    for (let i = 0; i < GameState.maxShields; i++) {
        shieldBars += (i < GameState.shields) ? '▰' : '▱';
    }
    shieldsCountElement.textContent = shieldBars;

    const currentSpeed = Math.round(GameState.speed * (GameState.boost ? 1.55 : 1.0));
    speedIndicator.textContent = `${currentSpeed} KM/H${GameState.boost ? ' [BOOST]' : ''}`;
}

function getControlUrl() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/cybercanyon';
    return baseUrl.includes('://')
        ? `${baseUrl}?room=${GameState.roomId}`
        : `${window.location.protocol}//${baseUrl}?room=${GameState.roomId}`;
}

function updateQrCode() {
    const controlUrl = getControlUrl();
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
            }
        } catch (e) {
            console.warn('Fallback QR code:', e);
            qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(controlUrl)}&margin=10" alt="QR" style="width:160px;height:160px;display:block;">`;
        }
    }
}

function fetchRanking() {
    try {
        const ranking = JSON.parse(localStorage.getItem('cybercanyon-ranking')) || [];
        if (ranking.length > 0) {
            GameState.highScore = ranking[0].score;
            updateUI();
        }
        if (rankingList) {
            rankingList.innerHTML = '';
            ranking.slice(0, 5).forEach((entry, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank">${index + 1}.</span>
                    <span class="nick">${entry.name.substring(0, 8)}</span>
                    <span class="score">${entry.score.toString().padStart(4, '0')}</span>
                `;
                rankingList.appendChild(li);
            });
        }
    } catch (e) {}
}

function submitScore(nickname, score) {
    if (score === 0) return;
    try {
        let ranking = JSON.parse(localStorage.getItem('cybercanyon-ranking')) || [];
        ranking = ranking.filter(entry => !(entry.name === nickname && entry.score < score));
        if (!ranking.some(entry => entry.name === nickname && entry.score === score)) {
            ranking.push({ name: nickname, score, date: new Date().toLocaleDateString() });
        }
        ranking.sort((a, b) => b.score - a.score);
        ranking = ranking.slice(0, 5);
        localStorage.setItem('cybercanyon-ranking', JSON.stringify(ranking));
        fetchRanking();
    } catch (e) {}
}

function autoScale() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.style.transform = 'none';
    const naturalW = container.offsetWidth || 500;
    const naturalH = container.offsetHeight || 490;

    const availableW = window.innerWidth || document.documentElement.clientWidth;
    const availableH = window.innerHeight || document.documentElement.clientHeight;
    if (!availableW || !availableH) return;

    const padding = 20;
    const scaleX = (availableW - padding) / naturalW;
    const scaleY = (availableH - padding) / naturalH;
    const scale = Math.max(0.1, Math.min(scaleX, scaleY));

    container.style.transform = `scale(${scale})`;
}

// ==============================================================================
// CONTROLES DE TECLADO (INVERSIÓN ESTILO NAVE / SIMULADOR)
// ==============================================================================

const keyState = {
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    fire: false
};

function updateKeyboardVelocity() {
    let vx = 0;
    let vy = 0;
    if (keyState.left) vx -= Player.speed;
    if (keyState.right) vx += Player.speed;
    
    // Inversión tipo nave:
    // Flecha Arriba / W = Empujar palanca / Bajar morro (Dive hacia el suelo -> vy positivo)
    // Flecha Abajo / S = Tirar palanca / Subir morro (Climb hacia el cielo -> vy negativo)
    if (keyState.up) vy += Player.speed;
    if (keyState.down) vy -= Player.speed;

    Player.vx = vx;
    Player.vy = vy;
    GameState.boost = keyState.boost;
}

window.addEventListener('keydown', (e) => {
    audio.init();

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyState.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyState.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keyState.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keyState.down = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') keyState.boost = true;
    if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'Enter') keyState.fire = true;

    updateKeyboardVelocity();

    if (!GameState.running || GameState.gameOver) {
        if (performance.now() - gameOverTime > 800) {
            if (['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) {
                resetGame();
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyState.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyState.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keyState.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keyState.down = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') keyState.boost = false;
    if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'Enter') keyState.fire = false;

    updateKeyboardVelocity();
});

mainScreen.addEventListener('click', () => {
    audio.init();
    if (!GameState.running || GameState.gameOver) {
        if (performance.now() - gameOverTime > 800) {
            resetGame();
        }
    }
});

window.addEventListener('DOMContentLoaded', () => {
    fetchRanking();
    updateUI();
    updateQrCode();
    autoScale();
    connectSignalingServer();

    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!audio.ctx) audio.init();
            else audio.resume();
        });
    }
});

window.addEventListener('resize', autoScale);
[0, 50, 150, 300, 600, 1200].forEach(delay => setTimeout(autoScale, delay));

requestAnimationFrame(gameLoop);
