// ==============================================================================
// CYBER CANYON: QuestWorld 3D - Arcade Host Script
// Inspirado en el cañón vectorial de QuestWorld / Tron en Canvas 2D
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
const FOV = 260;

// Estado Global del Juego
const GameState = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    distance: 0,
    shields: 3,
    maxShields: 3,
    speed: 130, // km/h
    baseSpeed: 130,
    maxSpeed: 380,
    boost: false,
    currentNickname: 'PILOT',
    roomId: Math.random().toString(36).substring(2, 6).toUpperCase(),
    lastTime: 0,
    screenShake: 0,
    glitchFlash: 0
};

// Nave / Cámara del Jugador
const Player = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    speed: 160,
    roll: 0,
    targetRoll: 0,
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
            this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
            this.droneGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

            // Filtro pasa-bajas para un rugido futurista suave
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
        const targetFreq = 55 + speedRatio * 85;
        this.droneOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    }

    playPassGate() {
        if (!this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.5]; // Acorde C mayor cibernético
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
// GENERADOR PROCEDURAL DEL CAÑÓN VECTORIAL
// ==============================================================================

// Traza la curvatura central y dimensiones del cañón en cualquier distancia Z
function getCanyonAt(z) {
    const cX = 140 * Math.sin(z * 0.0028) + 70 * Math.sin(z * 0.0064 + 1.2);
    const cY = 55 * Math.cos(z * 0.0024) + 35 * Math.sin(z * 0.0048);
    const width = 105 + 25 * Math.sin(z * 0.0035);
    const height = 95 + 20 * Math.cos(z * 0.0029);
    return { cX, cY, width, height };
}

// Compuertas / Anillos de datos cibernéticos
const GATES = [];
const GATE_INTERVAL = 140; // metros entre compuertas
let nextGateZ = 200;

function spawnGatesAhead(playerZ) {
    while (nextGateZ < playerZ + 500) {
        const canyon = getCanyonAt(nextGateZ);
        GATES.push({
            z: nextGateZ,
            x: canyon.cX + (Math.sin(nextGateZ * 0.01) * 20),
            y: canyon.cY + (Math.cos(nextGateZ * 0.012) * 15),
            radius: 40,
            passed: false
        });
        nextGateZ += GATE_INTERVAL;
    }
    // Limpiar compuertas dejadas atrás
    while (GATES.length > 0 && GATES[0].z < playerZ - 80) {
        GATES.shift();
    }
}

// ==============================================================================
// RED WEBRTC Y SEÑALIZACIÓN
// ==============================================================================

const peerConnections = new Map(); // playerId -> RTCPeerConnection
const dataChannels = new Map();    // playerId -> RTCDataChannel
const pendingCandidates = new Map(); // playerId -> Array de candidatos ICE en espera
let socket = null;

const signalingState = {
    reconnectAttempts: 0,
    maxAttempts: 10,
    baseDelay: 1000,
    shouldReconnect: true,
    manualClose: false,
    reconnectTimer: null
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
        console.log(`Conectado al servidor de señalización (Sala: ${GameState.roomId})`);
        document.getElementById('room-id').textContent = `ROOM: ${GameState.roomId}`;
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

    // Vaciar cola de candidatos ICE
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
    // Joystick analógico móvil x, y (-1 a 1)
    if (input.x !== undefined && input.y !== undefined) {
        Player.vx = input.x * Player.speed;
        Player.vy = input.y * Player.speed;
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

    Player.x = 0;
    Player.y = 0;
    Player.z = 0;
    Player.vx = 0;
    Player.vy = 0;
    Player.roll = 0;
    Player.targetRoll = 0;
    Player.invulnerableTime = 0;

    GATES.length = 0;
    nextGateZ = 200;

    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
    updateUI();
}

function update(dt) {
    if (!GameState.running || GameState.gameOver) return;

    // Calcular velocidad efectiva (Boost da un 50% extra)
    const effectiveSpeed = (GameState.speed * (GameState.boost ? 1.5 : 1.0));
    const speedRatio = (effectiveSpeed - GameState.baseSpeed) / (GameState.maxSpeed - GameState.baseSpeed);
    audio.updateDroneSpeed(speedRatio);

    // Avanzar distancia en el cañón
    const distDelta = (effectiveSpeed / 3.6) * dt; // km/h -> m/s
    GameState.distance += distDelta;
    Player.z += distDelta;

    // Aumentar velocidad base poco a poco
    if (GameState.speed < GameState.maxSpeed) {
        GameState.speed += dt * 3.5;
    }

    // Puntos por distancia recorrida
    GameState.score += Math.floor(distDelta * (GameState.boost ? 2.5 : 1.0));

    // Desplazamiento del jugador
    Player.x += Player.vx * dt;
    Player.y += Player.vy * dt;

    // Inclinación visual (Roll / Banking)
    Player.targetRoll = (Player.vx / Player.speed) * 0.35; // radianes
    Player.roll += (Player.targetRoll - Player.roll) * 8 * dt;

    // Verificar colisión con el cañón en la posición frontal inmediata
    const currentCanyon = getCanyonAt(Player.z + 10);
    const relPlayerX = Player.x - currentCanyon.cX;
    const relPlayerY = Player.y - currentCanyon.cY;

    const safeMarginX = currentCanyon.width - 24;
    const safeMarginY = currentCanyon.height - 20;

    // Reducir tiempo de invulnerabilidad tras un choque
    if (Player.invulnerableTime > 0) {
        Player.invulnerableTime -= dt;
    }

    // Colisión con paredes
    let hitWall = false;
    if (Math.abs(relPlayerX) > safeMarginX) {
        hitWall = true;
        Player.x = currentCanyon.cX + Math.sign(relPlayerX) * safeMarginX;
        Player.vx = -Player.vx * 0.3;
    }
    if (Math.abs(relPlayerY) > safeMarginY) {
        hitWall = true;
        Player.y = currentCanyon.cY + Math.sign(relPlayerY) * safeMarginY;
        Player.vy = -Player.vy * 0.3;
    }

    if (hitWall && Player.invulnerableTime <= 0) {
        GameState.shields--;
        Player.invulnerableTime = 1.0;
        GameState.screenShake = 12;
        GameState.glitchFlash = 1.0;
        audio.playWallHit();

        if (GameState.shields <= 0) {
            endGame();
            return;
        }
    }

    // Spawn y verificación de compuertas cibernéticas
    spawnGatesAhead(Player.z);
    for (const gate of GATES) {
        if (!gate.passed && gate.z <= Player.z + 6 && gate.z >= Player.z - 10) {
            gate.passed = true;
            const distToGateCenter = Math.hypot(Player.x - gate.x, Player.y - gate.y);
            if (distToGateCenter < gate.radius) {
                // Atravesó el anillo exitosamente!
                GameState.score += 250;
                audio.playPassGate();
            }
        }
    }

    // Decaimiento del screen shake y glitch
    if (GameState.screenShake > 0) {
        GameState.screenShake = Math.max(0, GameState.screenShake - dt * 25);
    }
    if (GameState.glitchFlash > 0) {
        GameState.glitchFlash = Math.max(0, GameState.glitchFlash - dt * 4);
    }

    updateUI();
}

// ==============================================================================
// RENDERIZADOR 3D VECTORIAL EN CANVAS 2D
// ==============================================================================

function draw() {
    // Fondo negro profundo
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Efecto de sacudida (Screen Shake)
    ctx.save();
    if (GameState.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * GameState.screenShake;
        const shakeY = (Math.random() - 0.5) * GameState.screenShake;
        ctx.translate(shakeX, shakeY);
    }

    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    // Aplicar inclinación (Roll) en torno al centro
    ctx.translate(centerX, centerY);
    ctx.rotate(-Player.roll);
    ctx.translate(-centerX, -centerY);

    // Número de rebanadas en profundidad Z
    const numSlices = 32;
    const sliceSpacing = 11;
    const maxZ = numSlices * sliceSpacing;
    const offsetZ = Player.z % sliceSpacing;

    const projectedSlices = [];

    // 1. Proyectar todas las rebanadas del cañón de adelante hacia atrás
    for (let i = numSlices; i >= 1; i--) {
        const relZ = (i * sliceSpacing) - offsetZ;
        if (relZ <= 4) continue;

        const worldZ = Player.z + relZ;
        const canyon = getCanyonAt(worldZ);

        const scale = FOV / relZ;
        const px = centerX + (canyon.cX - Player.x) * scale;
        const py = centerY + (canyon.cY - Player.y) * scale;
        const pw = canyon.width * scale;
        const ph = canyon.height * scale;

        const alpha = Math.max(0.12, Math.min(1.0, 1.0 - Math.pow(relZ / maxZ, 1.3)));

        projectedSlices.push({
            relZ,
            worldZ,
            scale,
            px,
            py,
            pw,
            ph,
            alpha
        });
    }

    // 2. Dibujar líneas de contorno horizontal estilo Sonar / Tron (como en la referencia)
    // Para cada rebanada, trazamos las paredes izquierda y derecha con curvaturas
    ctx.lineWidth = 1.6;

    for (let s = 0; s < projectedSlices.length; s++) {
        const slice = projectedSlices[s];
        const alpha = slice.alpha;

        // Fósforo verde neón (#3dff8a)
        ctx.strokeStyle = `rgba(61, 255, 138, ${alpha})`;

        const leftEdge = slice.px - slice.pw;
        const rightEdge = slice.px + slice.pw;
        const topEdge = slice.py - slice.ph;
        const bottomEdge = slice.py + slice.ph;

        // Anillo de contorno de la sección
        ctx.beginPath();
        // Pared izquierda ondulada
        ctx.moveTo(-100, slice.py - slice.ph * 0.8);
        ctx.bezierCurveTo(
            leftEdge - 40 * slice.scale, slice.py - slice.ph * 0.5,
            leftEdge - 20 * slice.scale, slice.py + slice.ph * 0.5,
            leftEdge, bottomEdge
        );

        // Suelo del cañón
        ctx.lineTo(rightEdge, bottomEdge);

        // Pared derecha ondulada
        ctx.bezierCurveTo(
            rightEdge + 20 * slice.scale, slice.py + slice.ph * 0.5,
            rightEdge + 40 * slice.scale, slice.py - slice.ph * 0.5,
            CANVAS_WIDTH + 100, slice.py - slice.ph * 0.8
        );
        ctx.stroke();

        // Líneas horizontales de estrato rocoso en los laterales (exactas a la imagen de referencia)
        const strataSteps = 4;
        for (let st = 1; st < strataSteps; st++) {
            const hRatio = (st / strataSteps);
            const strataY = slice.py - slice.ph + (slice.ph * 2 * hRatio);
            
            ctx.beginPath();
            // Izquierda
            ctx.moveTo(-80, strataY);
            ctx.lineTo(leftEdge + (st % 2 === 0 ? 10 : 0) * slice.scale, strataY);
            // Derecha
            ctx.moveTo(rightEdge - (st % 2 === 0 ? 10 : 0) * slice.scale, strataY);
            ctx.lineTo(CANVAS_WIDTH + 80, strataY);
            ctx.stroke();
        }
    }

    // 3. Líneas longitudinales que se extienden hacia el horizonte en el fondo del cañón
    if (projectedSlices.length > 2) {
        const floorLines = [-0.6, -0.2, 0.2, 0.6];
        floorLines.forEach(ratio => {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(61, 255, 138, 0.25)';
            for (let i = 0; i < projectedSlices.length; i++) {
                const sl = projectedSlices[i];
                const x = sl.px + (sl.pw * ratio);
                const y = sl.py + sl.ph;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
    }

    // 4. Dibujar compuertas / anillos cibernéticos
    for (const gate of GATES) {
        const relZ = gate.z - Player.z;
        if (relZ > 5 && relZ < maxZ) {
            const scale = FOV / relZ;
            const gx = centerX + (gate.x - Player.x) * scale;
            const gy = centerY + (gate.y - Player.y) * scale;
            const gr = gate.radius * scale;
            const alpha = Math.max(0.2, Math.min(1.0, 1.0 - (relZ / maxZ)));

            ctx.save();
            ctx.lineWidth = Math.max(2, 3.5 * scale);
            ctx.strokeStyle = gate.passed 
                ? `rgba(61, 255, 138, ${alpha * 0.4})` 
                : `rgba(255, 183, 3, ${alpha})`; // Ámbar neón para compuertas activas

            // Hexágono vectorial
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

            // Puntos guía en los vértices
            ctx.fillStyle = ctx.strokeStyle;
            for (let a = 0; a < 6; a++) {
                const angle = (a * Math.PI / 3);
                ctx.beginPath();
                ctx.arc(gx + Math.cos(angle) * gr, gy + Math.sin(angle) * gr, 2.5 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    // 5. Retícula de Vuelo en Primera Persona (HUD Crosshair minimalista)
    ctx.restore(); // Restaurar rotación y sacudida para el HUD de cabina fijo

    ctx.save();
    ctx.strokeStyle = Player.invulnerableTime > 0 
        ? 'rgba(255, 77, 109, 0.85)' 
        : (GameState.boost ? 'rgba(255, 183, 3, 0.85)' : 'rgba(61, 255, 138, 0.7)');
    ctx.lineWidth = 1.5;

    // Cruz central
    ctx.beginPath();
    ctx.moveTo(centerX - 12, centerY);
    ctx.lineTo(centerX - 4, centerY);
    ctx.moveTo(centerX + 4, centerY);
    ctx.lineTo(centerX + 12, centerY);
    ctx.moveTo(centerX, centerY - 12);
    ctx.lineTo(centerX, centerY - 4);
    ctx.moveTo(centerX, centerY + 4);
    ctx.lineTo(centerX, centerY + 12);
    ctx.stroke();

    // Círculo de puntería
    ctx.beginPath();
    ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Destello de daño (Glitch Flash)
    if (GameState.glitchFlash > 0) {
        ctx.fillStyle = `rgba(255, 77, 109, ${GameState.glitchFlash * 0.35})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.restore();
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

    // Cierre de canales y preparación para nueva partida
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
    
    // Indicador visual de escudos
    let shieldBars = '';
    for (let i = 0; i < GameState.maxShields; i++) {
        shieldBars += (i < GameState.shields) ? '▰' : '▱';
    }
    shieldsCountElement.textContent = shieldBars;

    // Indicador de velocidad
    const currentSpeed = Math.round(GameState.speed * (GameState.boost ? 1.5 : 1.0));
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

// Auto-Escalado reactivo
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
// CONTROLES DE TECLADO (SOPORTE 100% PRE-PUSH)
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
    if (keyState.up) vy -= Player.speed;
    if (keyState.down) vy += Player.speed;

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

    if (e.code === 'Space' || e.code === 'Enter') {
        if (!GameState.running || GameState.gameOver) {
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

// Inicialización de la pantalla Arcade
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
