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
const qrCodeImg = document.getElementById('qr-code-img');
const iceRouteElement = document.getElementById('ice-route');

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
    { points: 30, color: '#8fd900' },
    { points: 20, color: '#c1ff5a' },
    { points: 10, color: '#79c01b' }
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
    if (ranking.length > 0) {
        GameState.highScore = ranking[0].score;
        highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
    }
    displayRanking(ranking);
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
    if (qrCodeImg) {
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(controlUrl)}`;
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

function createStars(total) {
    return Array.from({ length: total }, (_, index) => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        blink: 40 + (index % 5) * 8 + Math.floor(Math.random() * 18),
        offset: Math.floor(Math.random() * 60)
    }));
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

function addExplosion(x, y, life = 16) {
    GameState.explosions.push({ x, y, life });
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
                const alienType = ALIEN_TYPES[alien.typeIndex];
                GameState.score += alienType.points;
                addExplosion(alien.x + ALIEN_WIDTH / 2, alien.y + ALIEN_HEIGHT / 2);
                updateHud();
                break;
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
        .map((explosion) => ({ ...explosion, life: explosion.life - dt * 60 }))
        .filter((explosion) => explosion.life > 0);
}

function updateStatus(dt) {
    if (GameState.statusTimer > 0) {
        GameState.statusTimer -= dt * 60;
    }
}

function drawBackground() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = NOKIA_DARK;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);

    GameState.stars.forEach((star) => {
        const frame = Math.floor((performance.now() / 80 + star.offset) % star.blink);
        ctx.fillStyle = frame < 2 ? '#4a6500' : frame < 4 ? '#8fd900' : '#2b3800';
        ctx.fillRect(star.x, star.y, 1, 1);
    });

    for (let y = 0; y < CANVAS_HEIGHT; y += 8) {
        ctx.fillStyle = 'rgba(145, 170, 18, 0.06)';
        ctx.fillRect(0, y, CANVAS_WIDTH, 1);
    }
}

function drawShields() {
    ctx.fillStyle = '#5d8421';
    GameState.shields.forEach((shield) => {
        shield.cells.forEach((cell) => {
            const [x, y] = cell.split(',').map(Number);
            ctx.fillRect(x, y, 4, 4);
        });
    });
}

function drawAliens() {
    GameState.aliens.forEach((alien) => {
        if (!alien.alive) return;

        const type = ALIEN_TYPES[alien.typeIndex];
        ctx.fillStyle = type.color;
        if (GameState.frameFlip) {
            ctx.fillRect(alien.x + 2, alien.y + 2, 12, 2);
            ctx.fillRect(alien.x, alien.y + 4, 4, 6);
            ctx.fillRect(alien.x + 12, alien.y + 4, 4, 6);
            ctx.fillRect(alien.x + 4, alien.y + 10, 8, 2);
        } else {
            ctx.fillRect(alien.x + 2, alien.y + 2, 12, 2);
            ctx.fillRect(alien.x + 2, alien.y + 6, 4, 4);
            ctx.fillRect(alien.x + 10, alien.y + 6, 4, 4);
            ctx.fillRect(alien.x + 4, alien.y + 10, 8, 2);
        }
    });
}

function drawPlayer() {
    ctx.fillStyle = '#d4ff7d';
    ctx.fillRect(GameState.player.x + 2, GameState.player.y, GameState.player.width - 4, 4);
    ctx.fillRect(GameState.player.x, GameState.player.y + 4, GameState.player.width, 4);
    ctx.fillRect(GameState.player.x + 4, GameState.player.y - 4, GameState.player.width - 8, 4);
}

function drawBullets() {
    ctx.fillStyle = '#ffffff';
    GameState.bullets.forEach((bullet) => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    ctx.fillStyle = '#ff5c5c';
    GameState.alienBullets.forEach((bullet) => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawExplosions() {
    GameState.explosions.forEach((explosion) => {
        const alpha = Math.max(0, Math.min(1, explosion.life / 16));
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, Math.max(2, explosion.life / 3), 0, Math.PI * 2);
        ctx.fill();
    });
}

function draw() {
    drawBackground();
    drawShields();
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
    if (key === 'enter' && GameState.gameOver) {
        resetGame();
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
}

loadRanking();
init();
draw();
requestAnimationFrame(loop);
connectSignaling();
