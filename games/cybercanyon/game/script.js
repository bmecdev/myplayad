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
    invulnerableTime: 0
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
            // Las compuertas siguen la altitud y trayectoria del cañón invitando al piloto a volar por ellas
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

    if (peerConnections.size === 0 && !GameState.running) {
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

    // 4. CABINA INMERSIVA DE VUELO (Rota con la nave y responde al cabeceo del piloto)
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
    audio.playCrash();
    GameState.gameOver = true;
    GameState.running = false;
    gameOverOverlay.classList.remove('hidden');
    notifyGameOver();
    submitScore(GameState.currentNickname, GameState.score);

    setTimeout(() => {
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
    }, 12000);
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
    boost: false
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

    updateKeyboardVelocity();

    if (!GameState.running || GameState.gameOver) {
        if (['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) {
            resetGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyState.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keyState.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keyState.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keyState.down = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') keyState.boost = false;

    updateKeyboardVelocity();
});

mainScreen.addEventListener('click', () => {
    audio.init();
    if (!GameState.running || GameState.gameOver) {
        resetGame();
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
