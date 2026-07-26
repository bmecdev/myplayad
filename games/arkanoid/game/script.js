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

const GameState = {
    score: 0,
    highScore: 0,
    lives: 3,
    running: false,
    gameOver: false,
    paused: false,
    lastTime: 0,
    paddle: {
        x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
        y: CANVAS_HEIGHT - PADDLE_HEIGHT - 5,
        dx: 0,
        speed: 200
    },
    ball: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
        dx: 0,
        dy: 0,
        speed: 120,
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

// WebRTC State
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

    let signalingUrl = CONFIG.SIGNALING_URL;
    if (CONFIG.SIGNALING_URL === 'wss://MY_DOMAIN/ws') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        signalingUrl = `${protocol}//${window.location.host}/ws`;
    }

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
                waitingOverlay.classList.add('hidden');
            } else if (data.type === 'controller_disconnected') {
                handleControllerDisconnect(data.playerId);
            }
        } catch (e) {
            console.error('Error procesando mensaje de señalización:', e);
        }
    };
}

function handleControllerDisconnect(playerId) {
    const pc = peerConnections.get(playerId);
    if (pc) pc.close();
    peerConnections.delete(playerId);
    dataChannels.delete(playerId);

    if (peerConnections.size === 0) {
        waitingOverlay.classList.remove('hidden');
        GameState.running = false;
        GameState.gameOver = true; // Auto game over on disconnect
    }
}

async function handleOffer(data) {
    const { playerId, type, sdp } = data;
    const rtcConfig = (window.GAME_CONFIG && window.GAME_CONFIG.getIceConfig) ? window.GAME_CONFIG.getIceConfig() : getIceConfig();
    const pc = new RTCPeerConnection(rtcConfig);
    
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
            try {
                const input = JSON.parse(e.data);
                if (input.type === 'nickname') {
                    GameState.currentNickname = input.value;
                    if (playerNickElement) playerNickElement.textContent = `PLAYER: ${GameState.currentNickname.toUpperCase()}`;
                    resetGame(); // Start game
                } else {
                    handleJoystickInput(input);
                }
            } catch (err) {}
        };

        receiveChannel.onopen = () => {
            waitingOverlay.classList.add('hidden');
            refreshIceRoute(pc);
        };

        receiveChannel.onclose = () => {
            handleControllerDisconnect(playerId);
        };
    };

    pc.oniceconnectionstatechange = () => {
        refreshIceRoute(pc);
        const state = pc.iceConnectionState;
        if (state === 'disconnected' || state === 'failed') {
            handleControllerDisconnect(playerId);
        }
    };

    pc.onconnectionstatechange = () => {
        refreshIceRoute(pc);
        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed') {
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
    if (input.action === 'fire' || input.type === 'fire') {
        if (!GameState.ball.launched && GameState.running && !GameState.gameOver) {
            GameState.ball.launched = true;
            GameState.ball.dx = (Math.random() > 0.5 ? 1 : -1) * GameState.ball.speed;
            GameState.ball.dy = -GameState.ball.speed;
        } else if (GameState.gameOver) {
            // Cannot restart from fire, must re-scan
        }
        return;
    }

    if (input.x !== undefined) {
        // Trackpad gives x between -1 and 1
        GameState.paddle.dx = input.x * GameState.paddle.speed;
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
    GameState.ball.launched = false;
}

function resetGame() {
    GameState.score = 0;
    GameState.lives = 3;
    GameState.gameOver = false;
    GameState.running = true;
    GameState.paddle.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    initBricks();
    resetBall();
    updateUI();
    gameOverOverlay.classList.add('hidden');
    waitingOverlay.classList.add('hidden');
}

function update(dt) {
    if (!GameState.running || GameState.paused || GameState.gameOver) return;

    // Move paddle
    GameState.paddle.x += GameState.paddle.dx * dt;
    if (GameState.paddle.x < 0) GameState.paddle.x = 0;
    if (GameState.paddle.x + PADDLE_WIDTH > CANVAS_WIDTH) GameState.paddle.x = CANVAS_WIDTH - PADDLE_WIDTH;

    // Move ball
    if (!GameState.ball.launched) {
        GameState.ball.x = GameState.paddle.x + PADDLE_WIDTH / 2;
    } else {
        GameState.ball.x += GameState.ball.dx * dt;
        GameState.ball.y += GameState.ball.dy * dt;

        // Wall collisions
        if (GameState.ball.x + BALL_RADIUS > CANVAS_WIDTH) {
            GameState.ball.x = CANVAS_WIDTH - BALL_RADIUS;
            GameState.ball.dx = -GameState.ball.dx;
        } else if (GameState.ball.x - BALL_RADIUS < 0) {
            GameState.ball.x = BALL_RADIUS;
            GameState.ball.dx = -GameState.ball.dx;
        }

        if (GameState.ball.y - BALL_RADIUS < 0) {
            GameState.ball.y = BALL_RADIUS;
            GameState.ball.dy = -GameState.ball.dy;
        } else if (GameState.ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
            // Lost life
            GameState.lives--;
            if (GameState.lives <= 0) {
                endGame();
            } else {
                resetBall();
            }
            updateUI();
        }

        // Paddle collision
        if (GameState.ball.y + BALL_RADIUS > GameState.paddle.y && 
            GameState.ball.y - BALL_RADIUS < GameState.paddle.y + PADDLE_HEIGHT &&
            GameState.ball.x + BALL_RADIUS > GameState.paddle.x && 
            GameState.ball.x - BALL_RADIUS < GameState.paddle.x + PADDLE_WIDTH) {
            
            GameState.ball.dy = -Math.abs(GameState.ball.dy); // Force up
            // Change angle based on hit position
            let hitPoint = GameState.ball.x - (GameState.paddle.x + PADDLE_WIDTH / 2);
            GameState.ball.dx = (hitPoint / (PADDLE_WIDTH / 2)) * GameState.ball.speed;
        }

        // Brick collision
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                let b = GameState.bricks[c][r];
                if (b.status === 1) {
                    let brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                    let brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                    
                    if (GameState.ball.x > brickX && GameState.ball.x < brickX + BRICK_WIDTH &&
                        GameState.ball.y > brickY && GameState.ball.y < brickY + BRICK_HEIGHT) {
                        GameState.ball.dy = -GameState.ball.dy;
                        b.status = 0;
                        GameState.score += (BRICK_ROW_COUNT - r) * 10;
                        if (GameState.score > GameState.highScore) GameState.highScore = GameState.score;
                        updateUI();
                        checkWin();
                    }
                }
            }
        }
    }
}

function checkWin() {
    let allDestroyed = true;
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (GameState.bricks[c][r].status === 1) {
                allDestroyed = false;
                break;
            }
        }
    }
    if (allDestroyed) {
        initBricks();
        resetBall();
        GameState.ball.speed += 20; // Increase speed for next level
    }
}

function draw() {
    ctx.fillStyle = '#0d0e15';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (GameState.gameOver) return;

    // Draw paddle
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(GameState.paddle.x, GameState.paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    // Draw paddle highlights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(GameState.paddle.x, GameState.paddle.y, PADDLE_WIDTH, 2);

    // Draw ball
    ctx.beginPath();
    ctx.arc(GameState.ball.x, GameState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#ff00ea';
    ctx.fill();
    ctx.closePath();

    // Draw bricks
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (GameState.bricks[c][r].status === 1) {
                let brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                let brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                
                ctx.fillStyle = GameState.bricks[c][r].color;
                ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                
                // Highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(brickX, brickY, BRICK_WIDTH, 2);
                ctx.fillRect(brickX, brickY, 2, BRICK_HEIGHT);
                // Shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(brickX, brickY + BRICK_HEIGHT - 2, BRICK_WIDTH, 2);
                ctx.fillRect(brickX + BRICK_WIDTH - 2, brickY, 2, BRICK_HEIGHT);
            }
        }
    }
}

function gameLoop(timestamp) {
    if (!GameState.lastTime) GameState.lastTime = timestamp;
    const dt = (timestamp - GameState.lastTime) / 1000;
    GameState.lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

function endGame() {
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
    
    // Show QR code again after a delay
    setTimeout(() => {
        gameOverOverlay.classList.add('hidden');
        waitingOverlay.classList.remove('hidden');
        GameState.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        document.getElementById('room-id').textContent = `ROOM: ${GameState.roomId}`;
        updateQrCode();
        
        socket.send(JSON.stringify({ 
            type: 'register', 
            role: 'host', 
            roomId: GameState.roomId,
            maxPlayers: CONFIG.MAX_PLAYERS 
        }));
    }, 15000); // 15 seconds to view hall of fame
}

function updateUI() {
    scoreElement.textContent = `SCORE: ${GameState.score.toString().padStart(3, '0')}`;
    highScoreElement.textContent = `HI: ${GameState.highScore.toString().padStart(3, '0')}`;
    livesCountElement.textContent = GameState.lives;
}

function getControlUrl() {
    const baseUrl = CONFIG.CONTROL_URL || 'https://controllers.myplayad.com/arkanoid';
    return baseUrl.includes('://')
        ? `${baseUrl}?room=${GameState.roomId}`
        : `${window.location.protocol}//${baseUrl}?room=${GameState.roomId}`;
}

function updateQrCode() {
    const controlUrl = getControlUrl();
    if (qrCodeImg) {
        qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(controlUrl)}&margin=10`;
    }
}

// API Functions
function fetchRanking() {
    try {
        const ranking = JSON.parse(localStorage.getItem('arkanoid-ranking')) || [];
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
                    <span class="score">${entry.score.toString().padStart(3, '0')}</span>
                `;
                listElement.appendChild(li);
            });
        };

        renderList(rankingList);
        renderList(videoRankingList);
    } catch (error) {
        console.error('Error fetching ranking:', error);
    }
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

// Inicialización
initBricks();
updateUI();
fetchRanking();
fetchUpcomingSchedules();
setInterval(fetchRanking, 30000);
setInterval(fetchUpcomingSchedules, 60000);
requestAnimationFrame(gameLoop);
connectSignalingServer();
